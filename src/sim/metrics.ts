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
import type { SimTap } from '../engine/tap';
import type { World } from '../engine/world';
import type { MetricRecord, MetricSummary } from './types';

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
  // -- bookkeeping --
  warnings: string[] = [];
  private now = 0;

  constructor(private world: World) {}

  /** The runner advances the collector's clock each tick (tap events carry no time). */
  tick(t: number): void { this.now = t; }

  private hero(): Actor { return this.world.player; }

  onHit(attacker: Actor, target: Actor, result: HitResult, _packet: DamagePacket): void {
    const heroSide = attacker.team === 'player';
    if (heroSide && target.team === 'enemy') {
      this.hitAttemptsOut++;
      if (result.total > 0 || (!result.evaded && !result.immune && !result.blocked)) {
        this.hitsOut++;
        if (result.crit) this.critsOut++;
      }
      if (attacker === this.hero()) this.dmgHeroOut += result.total;
      else this.dmgMinionOut += result.total;
      if (target.defId === 'target_dummy') this.dmgDummy += result.total;
    } else if (attacker.team === 'enemy' && target === this.hero()) {
      this.hitAttemptsIn++;
      if (result.evaded) this.evadesIn++;
      else if (result.blocked) this.blocksIn++;
      else this.hitsIn++;
      this.dmgIn += result.total;
    }
  }

  onDot(target: Actor, landed: number): void {
    if (target.team === 'enemy') {
      this.dotOut += landed;
      if (target.defId === 'target_dummy') this.dmgDummy += landed;
    } else if (target === this.hero()) {
      this.dotIn += landed;
    }
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
    this.samples++;
    return true;
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
  return {
    sim_seconds: r2(simSeconds),
    dps_out: r2(dmgOut / t),
    dps_hero: r2(c.dmgHeroOut / t),
    dps_minions: r2(c.dmgMinionOut / t),
    dps_dot_out: r2(c.dotOut / t),
    dps_dummy: r2(c.dmgDummy / t),
    dps_in: r2((c.dmgIn + c.dotIn) / t),
    hits_out: c.hitsOut,
    crit_rate: c.hitsOut > 0 ? r2(c.critsOut / c.hitsOut) : 0,
    hit_attempts_in: c.hitAttemptsIn,
    evade_rate_in: c.hitAttemptsIn > 0 ? r2(c.evadesIn / c.hitAttemptsIn) : 0,
    block_rate_in: c.hitAttemptsIn > 0 ? r2(c.blocksIn / c.hitAttemptsIn) : 0,
    kills: c.kills,
    kill_rate: r2(c.kills / t),
    time_to_first_kill: c.firstKillAt >= 0 ? r2(c.firstKillAt) : -1,
    player_deaths: playerDeaths,
    life_floor_pct: r2(c.lifeFloor * 100),
    mana_floor_pct: r2(c.manaFloor * 100),
    life_end_pct: r2(c.lifeEnd * 100),
    casts_per_sec: r2(presses / t),
  };
}

// ------------------------------------------------------------- statistics --

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
