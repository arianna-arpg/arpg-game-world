// ---------------------------------------------------------------------------
// METRICS — the collector that rides the SimTap plus per-tick sampling, and
// the summary statistics reports are built from.
//
// Attribution model (documented in docs/balance/README.md):
//   - HITS carry their attacker: split hero / minion / enemy exactly.
//   - DOTS carry only their victim (the wound is already inside — the engine
//     itself no longer knows who lit the fire), so DoT damage is attributed
//     by SIDE: a DoT draining an enemy counts as player-side output.
//   - Deaths record sim time + who + killer; wave bookkeeping (TTK) lives in
//     the runner, which knows which actor belongs to which wave.
// ---------------------------------------------------------------------------

import type { Actor } from '../engine/actor';
import type { DamagePacket, HitResult } from '../engine/damage';
import type { SkillInstance } from '../engine/skills';
import { DAMAGE_TYPES, type DamageType } from '../engine/stats';
import type { SimTap } from '../engine/tap';
import type { World } from '../engine/world';
import type { MetricRecord, MetricSummary } from './types';

/** Where a body stands from the hero: inside a swing, in the middle, or at range. */
export const ENEMY_BANDS = { near: 90, mid: 260 };

export class Collector implements SimTap {
  // -- hit lanes --
  dmgHeroOut = 0;       // hero's own hits into enemies
  dmgMinionOut = 0;     // hero-side minions/constructs/mercs
  dmgDummy = 0;         // subset of the above landing on the training dummy
  dmgIn = 0;            // enemy hits landing on the hero (seat actor only)
  dotOut = 0;           // DoT drain on enemy-team victims
  dotIn = 0;            // DoT drain on the hero
  hitsOut = 0; critsOut = 0;
  hitAttemptsOut = 0;   // includes evaded/blocked/immune exits
  hitAttemptsIn = 0;
  hitsIn = 0; evadesIn = 0; blocksIn = 0;
  // -- the TYPE ledger (2026-07-22, the uniform-dummy measurement pass):
  //    player-side outgoing damage split by rolled type. Hits count the
  //    PACKET's post-conversion mix (what the build actually threw — a
  //    conversion gem moves this even when uniform mitigation hides it
  //    from the totals); DoT drains count by their tick's type. --
  typeDmgOut: Record<DamageType, number> =
    Object.fromEntries(DAMAGE_TYPES.map(t => [t, 0])) as Record<DamageType, number>;
  // -- resource orbs + sustain (the economy/sustain channels: orbOnHit
  //    harvests shed at the strike, leech pours through healBy — both
  //    invisible to damage totals, both the gem's whole function) --
  orbsShed = 0;
  orbsScooped = 0;
  lifeGainHero = 0;     // landed healBy healing on the hero seat
  lifeGainMinions = 0;  // landed healBy healing on hero-side non-hero actors —
                        // the court's EFFECTIVE sustain (regen flows through
                        // healBy, so clipped-at-full pours land here as 0)
  // -- lifecycle --
  kills = 0;
  deaths: { t: number; who: string; team: string; killer?: string }[] = [];
  firstKillAt = -1;
  // -- casts (hero seat only — the measured build's own activity) --
  casts = new Map<string, { presses: number; repeats: number }>();
  // -- sampled vitals --
  lifeFloor = 1;        // min life/maxLife observed
  manaFloor = 1;
  lifeEnd = 1;
  samples = 0;
  // -- sampled world state (per-sample integrals — ×dt-free, deterministic;
  //    the support matrix's behavioral channels: a gem whose whole payload is
  //    a status, a minion, a trail zone, or a flight count moves one of these
  //    even when no damage number does) --
  enemyStatusSamples = 0;   // Σ per sample: active statuses across enemy actors
  heroStatusSamples = 0;    // Σ per sample: active statuses on the hero
  minionSamples = 0;        // Σ per sample: living player-team non-hero actors
  projectileSamples = 0;    // Σ per sample: projectiles in flight
  zoneSamples = 0;          // Σ per sample: live zones
  corpseSamples = 0;        // Σ per sample: corpses on the floor
  minionPeak = 0;           // max living player-team non-hero actors seen
  statusIdsSeen = new Set<string>(); // every status id observed on anyone
  // -- the enemy side: how the bodies fought, and damage nothing named. All of it stays
  //    out of the fingerprint, which is the matrix's oracle for what the BUILD did. --
  untappedIn = 0;       // life the hero lost that no tap named (ownerless blasts, a doom going off)
  firstHitInAt = -1;    // the first blow aimed at the hero, landed or not
  firstMeleeAt = -1;    // the first melee swing an enemy committed to
  enemyCasts = new Map<string, number>();
  enemyMeleeCasts = 0;
  refusedPresses = 0;
  bandNear = 0; bandMid = 0; bandFar = 0;
  inReachSamples = 0; reachSamples = 0;
  bandSwitches = 0;
  private bandOf = new Map<number, { band: number; t0: number; t1: number }>();
  // -- bookkeeping --
  warnings: string[] = [];
  private now = 0;
  private lastHeroLife = NaN;
  private namedLossIn = 0; // life loss this tick that a tap has already explained

  constructor(private world: World) {}

  /** The runner advances the collector's clock each tick (tap events carry no time). */
  tick(t: number): void { this.now = t; }

  private hero(): Actor { return this.world.player; }

  onHit(attacker: Actor, target: Actor, result: HitResult, packet: DamagePacket): void {
    const heroSide = attacker.team === 'player';
    if (heroSide && target.team === 'enemy') {
      this.hitAttemptsOut++;
      if (result.total > 0 || (!result.evaded && !result.immune && !result.blocked)) {
        this.hitsOut++;
        if (result.crit) this.critsOut++;
        // The type ledger reads the thrown packet's mix, not the landed
        // total — conversion is visible even where mitigation is uniform.
        for (const t of DAMAGE_TYPES) {
          const amt = packet.amounts[t];
          if (amt) this.typeDmgOut[t] += amt;
        }
      }
      if (attacker === this.hero()) this.dmgHeroOut += result.total;
      else this.dmgMinionOut += result.total;
      if (target.defId?.startsWith('target_dummy')) this.dmgDummy += result.total;
    } else if (attacker.team === 'enemy' && target === this.hero()) {
      this.hitAttemptsIn++;
      if (result.evaded) this.evadesIn++;
      else if (result.blocked) this.blocksIn++;
      else this.hitsIn++;
      this.dmgIn += result.total;
      this.namedLossIn += result.total;
      if (this.firstHitInAt < 0) this.firstHitInAt = this.now;
    }
  }

  onDot(target: Actor, landed: number, type?: DamageType): void {
    if (target.team === 'enemy') {
      this.dotOut += landed;
      if (type) this.typeDmgOut[type] += landed;
      if (target.defId?.startsWith('target_dummy')) this.dmgDummy += landed;
    } else if (target === this.hero()) {
      this.dotIn += landed;
      this.namedLossIn += landed;
    }
  }

  onLifeSpent(actor: Actor, spent: number): void {
    if (actor === this.hero()) this.namedLossIn += spent;
  }

  onRefused(caster: Actor): void {
    if (caster.team === 'enemy') this.refusedPresses++;
  }

  /** The runner calls this after every tick. Life that left the hero's bar with no tap
   *  naming it is still damage, so reading the bar itself means no new path can hide:
   *  a blast with no owner, a doom going off, a hazard. */
  frame(): void {
    const life = this.hero().life;
    const lost = this.lastHeroLife - life;
    if (lost > this.namedLossIn) {
      this.untappedIn += lost - this.namedLossIn;
      if (this.firstHitInAt < 0) this.firstHitInAt = this.now;
    }
    this.namedLossIn = 0;
    this.lastHeroLife = life;
  }

  onHeal(target: Actor, landed: number): void {
    if (target === this.hero()) this.lifeGainHero += landed;
    else if (target.team === this.hero().team) this.lifeGainMinions += landed;
  }

  onOrbShed(): void { this.orbsShed++; }
  onOrbPickup(_kind: string, into: Actor): void {
    if (into.team === 'player') this.orbsScooped++;
  }

  onDeath(actor: Actor, killer?: Actor): void {
    const who = actor === this.hero() ? 'player' : (actor.defId ?? actor.kind ?? actor.name);
    this.deaths.push({
      t: round2(this.now), who, team: actor.team,
      killer: killer ? (killer.defId ?? killer.kind ?? killer.name) : undefined,
    });
    if (actor.team === 'enemy' && !actor.passive) {
      this.kills++;
      if (this.firstKillAt < 0) this.firstKillAt = this.now;
    }
  }

  onCast(caster: Actor, inst: SkillInstance, scheduledRepeat: boolean): void {
    if (caster.team === 'enemy' && !scheduledRepeat) {
      this.enemyCasts.set(inst.def.id, (this.enemyCasts.get(inst.def.id) ?? 0) + 1);
      if (inst.def.delivery.type === 'melee') {
        this.enemyMeleeCasts++;
        if (this.firstMeleeAt < 0) this.firstMeleeAt = this.now;
      }
    }
    if (caster !== this.hero()) return;
    const c = this.casts.get(inst.def.id) ?? { presses: 0, repeats: 0 };
    if (scheduledRepeat) c.repeats++; else c.presses++;
    this.casts.set(inst.def.id, c);
  }

  /** Per-tick vitals sample; also the non-finite tripwire. Returns false when
   *  the sim has gone numerically bad and the episode must abort. */
  sample(): boolean {
    const p = this.hero();
    const maxLife = p.maxLife();
    const maxMana = p.maxMana();
    const lifeFrac = maxLife > 0 ? Math.max(0, p.life / maxLife) : 0;
    const manaFrac = maxMana > 0 ? Math.max(0, p.mana / maxMana) : 1;
    if (!Number.isFinite(p.life) || !Number.isFinite(p.mana) || !Number.isFinite(maxLife)) {
      this.warnings.push(`non-finite hero vitals at t=${round2(this.now)} (life=${p.life}, mana=${p.mana}, maxLife=${maxLife})`);
      return false;
    }
    this.lifeFloor = Math.min(this.lifeFloor, lifeFrac);
    this.manaFloor = Math.min(this.manaFloor, manaFrac);
    this.lifeEnd = lifeFrac;
    // World-state channels — observe-only reads off the live world; every
    // count rides the same deterministic sampling clock as the vitals.
    let minions = 0;
    for (const a of this.world.actors) {
      if (a.dead) continue;
      for (const st of a.statuses) this.statusIdsSeen.add(st.id);
      if (a.team === 'enemy') {
        this.enemyStatusSamples += a.statuses.length;
        if (!a.passive) this.sampleBody(a, p);
      } else if (a === p) this.heroStatusSamples += a.statuses.length;
      else if (a.team === p.team) minions++;
    }
    this.minionSamples += minions;
    this.minionPeak = Math.max(this.minionPeak, minions);
    this.projectileSamples += this.world.projectiles.length;
    this.zoneSamples += this.world.zones.length;
    this.corpseSamples += this.world.corpses.length;
    this.samples++;
    return true;
  }

  /** Seconds of enemy presence the band-switch count covers. */
  bodySeconds(): number {
    let s = 0;
    for (const b of this.bandOf.values()) s += b.t1 - b.t0;
    return s;
  }

  /** Where this body stands from the hero, and whether its own melee reaches from there. */
  private sampleBody(a: Actor, hero: Actor): void {
    const d = Math.hypot(a.pos.x - hero.pos.x, a.pos.y - hero.pos.y);
    const band = d < ENEMY_BANDS.near ? 0 : d <= ENEMY_BANDS.mid ? 1 : 2;
    if (band === 0) this.bandNear++;
    else if (band === 1) this.bandMid++;
    else this.bandFar++;
    const seen = this.bandOf.get(a.id);
    if (!seen) this.bandOf.set(a.id, { band, t0: this.now, t1: this.now });
    else {
      if (seen.band !== band) { this.bandSwitches++; seen.band = band; }
      seen.t1 = this.now;
    }
    let reach = 0;
    for (const s of a.skills) {
      if (s?.def.ai && s.def.delivery.type === 'melee') reach = Math.max(reach, s.def.ai.range);
    }
    if (reach > 0) {
      this.reachSamples++;
      if (d <= reach) this.inReachSamples++;
    }
  }

  /** THE FINGERPRINT: every behavioral channel at FULL precision, fixed key
   *  order. Two episodes of the same seed hash identically iff nothing the
   *  collector can see differed — the support matrix's inertness oracle.
   *  Keys are grouped by lane so classifiers can reason about output vs cost
   *  vs defense without a second registry (see compat.ts CHANNEL_LANES). */
  fingerprint(): Record<string, number | string> {
    return {
      dmg_hero_out: this.dmgHeroOut,
      dmg_minion_out: this.dmgMinionOut,
      dot_out: this.dotOut,
      dmg_dummy: this.dmgDummy,
      hits_out: this.hitsOut,
      hit_attempts_out: this.hitAttemptsOut,
      crits_out: this.critsOut,
      kills: this.kills,
      enemy_status_samples: this.enemyStatusSamples,
      hero_status_samples: this.heroStatusSamples,
      minion_samples: this.minionSamples,
      minion_peak: this.minionPeak,
      projectile_samples: this.projectileSamples,
      zone_samples: this.zoneSamples,
      corpse_samples: this.corpseSamples,
      // The type ledger — fixed DAMAGE_TYPES order keeps the key sequence
      // canonical for hash equality.
      ...Object.fromEntries(DAMAGE_TYPES.map(t => [`dmg_out_${t}`, this.typeDmgOut[t]])),
      orbs_shed: this.orbsShed,
      orbs_scooped: this.orbsScooped,
      dmg_in: this.dmgIn,
      dot_in: this.dotIn,
      hit_attempts_in: this.hitAttemptsIn,
      evades_in: this.evadesIn,
      blocks_in: this.blocksIn,
      life_gain: this.lifeGainHero,
      life_floor: this.lifeFloor,
      mana_floor: this.manaFloor,
      life_end: this.lifeEnd,
      presses: [...this.casts.values()].reduce((n, x) => n + x.presses, 0),
      repeats: [...this.casts.values()].reduce((n, x) => n + x.repeats, 0),
      status_ids: [...this.statusIdsSeen].sort().join('|'),
      cast_ids: [...this.casts.keys()].sort().join('|'),
    };
  }
}

export function round2(x: number): number { return Math.round(x * 100) / 100; }
const r2 = round2;

/** Fold a finished collector into the flat metric record. */
export function collectMetrics(c: Collector, simSeconds: number): MetricRecord {
  const t = Math.max(simSeconds, 1e-6);
  const dmgOut = c.dmgHeroOut + c.dmgMinionOut + c.dotOut;
  const presses = [...c.casts.values()].reduce((n, x) => n + x.presses, 0);
  const playerDeaths = c.deaths.filter(d => d.who === 'player').length;
  const enemyPresses = [...c.enemyCasts.values()].reduce((n, x) => n + x, 0);
  const bodySeconds = c.bodySeconds();
  const bandSamples = c.bandNear + c.bandMid + c.bandFar;
  return {
    sim_seconds: r2(simSeconds),
    dps_out: r2(dmgOut / t),
    dps_hero: r2(c.dmgHeroOut / t),
    dps_minions: r2(c.dmgMinionOut / t),
    dps_dot_out: r2(c.dotOut / t),
    dps_dummy: r2(c.dmgDummy / t),
    dps_in: r2((c.dmgIn + c.dotIn + c.untappedIn) / t),
    untapped_in: r2(c.untappedIn / t),
    hits_out: c.hitsOut,
    crit_rate: c.hitsOut > 0 ? r2(c.critsOut / c.hitsOut) : 0,
    hit_attempts_in: c.hitAttemptsIn,
    evade_rate_in: c.hitAttemptsIn > 0 ? r2(c.evadesIn / c.hitAttemptsIn) : 0,
    block_rate_in: c.hitAttemptsIn > 0 ? r2(c.blocksIn / c.hitAttemptsIn) : 0,
    kills: c.kills,
    kill_rate: r2(c.kills / t),
    time_to_first_kill: c.firstKillAt >= 0 ? r2(c.firstKillAt) : -1,
    player_deaths: playerDeaths,
    // The vitals are sampled, so a blow that kills between samples never reached the floor.
    life_floor_pct: playerDeaths ? 0 : r2(c.lifeFloor * 100),
    mana_floor_pct: r2(c.manaFloor * 100),
    life_end_pct: playerDeaths ? 0 : r2(c.lifeEnd * 100),
    casts_per_sec: r2(presses / t),
    // The COURT lanes (minion-sustain measurements): average standing crew
    // across the vitals samples, hero-side non-hero deaths, and the court's
    // landed (post-clip) healing per second. Derived from channels the
    // collector already observes — zero for crewless scenarios.
    minions_mean: r2(c.minionSamples / Math.max(1, c.samples)),
    minion_deaths: c.deaths.filter(d => d.team === 'player' && d.who !== 'player').length,
    heal_minions_ps: r2(c.lifeGainMinions / t),
    // How the enemies fought. A column with nothing to read is left out, not zero, so a
    // body that never swung cannot pull a median toward an instant first hit.
    refused_presses: c.refusedPresses,
    enemy_casts: enemyPresses,
    distinct_skills: c.enemyCasts.size,
    skill_entropy: r2(entropyOf([...c.enemyCasts.values()])),
    ...(c.firstHitInAt >= 0 ? { first_hit_sec: r2(c.firstHitInAt) } : {}),
    ...(c.firstMeleeAt >= 0 ? { first_melee_sec: r2(c.firstMeleeAt) } : {}),
    ...(enemyPresses ? { melee_share: r2(c.enemyMeleeCasts / enemyPresses) } : {}),
    ...(c.reachSamples ? { in_reach_share: r2(c.inReachSamples / c.reachSamples) } : {}),
    ...(bodySeconds > 1 ? { band_switches_10s: r2(c.bandSwitches / bodySeconds * 10) } : {}),
    ...(bandSamples ? {
      band_near: r2(c.bandNear / bandSamples),
      band_mid: r2(c.bandMid / bandSamples),
      band_far: r2(c.bandFar / bandSamples),
    } : {}),
  };
}

// ------------------------------------------------------------- statistics --

/** Shannon entropy in bits: 0 for one skill, 1 for two used equally. */
export function entropyOf(counts: readonly number[]): number {
  const total = counts.reduce((s, x) => s + x, 0);
  if (total <= 0) return 0;
  let h = 0;
  for (const n of counts) if (n > 0) h -= (n / total) * Math.log2(n / total);
  return h;
}

export function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function summarize(values: number[]): MetricSummary {
  const v = [...values].sort((a, b) => a - b);
  const n = v.length;
  const mean = n ? v.reduce((s, x) => s + x, 0) / n : NaN;
  const sd = n > 1 ? Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1)) : 0;
  return {
    n,
    mean: r2(mean),
    median: r2(quantile(v, 0.5)),
    min: r2(v[0] ?? NaN),
    max: r2(v[n - 1] ?? NaN),
    p10: r2(quantile(v, 0.1)),
    p90: r2(quantile(v, 0.9)),
    sd: r2(sd),
  };
}

/** Aggregate a batch of flat metric records: every numeric key summarized. */
export function aggregate(records: MetricRecord[]): Record<string, MetricSummary> {
  const keys = new Set<string>();
  for (const rec of records) for (const k of Object.keys(rec)) keys.add(k);
  const out: Record<string, MetricSummary> = {};
  for (const k of keys) {
    out[k] = summarize(records.map(rec => rec[k]).filter(x => typeof x === 'number' && Number.isFinite(x)));
  }
  return out;
}
