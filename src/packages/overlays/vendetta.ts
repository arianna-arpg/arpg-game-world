// ---------------------------------------------------------------------------
// VENDETTA FIELD — the world answering the PLAYER's own violence (pure overlay).
//
// Every event before this one was the world acting on its own: storms drift,
// crusades march, plagues spread whether you exist or not. Vendetta closes the
// loop the other way: cull a people hard enough and that people answers. Each
// faction carries a GRUDGE meter (a registered WorldDrive — fed automatically
// by the engine's faction_drive_feed kill row, cooled by quiet days). While
// this package's gate is open, a faction whose grudge crests may POST A WRIT
// OF REPRISAL on the player: from then on, walking into eligible ground can
// spring an AMBUSH — a hunter squad of that faction, its WARRANT-HOLDER
// carrying the writ. Fell the warrant-holder and the writ is SETTLED: the
// faction's grudge breaks, its enemies pay you tribute (the reputation weave),
// and the ledger climbs. Keep dodging instead and the writ ESCALATES tier by
// tier — bigger squads, allied factions lending hunters (the politics weave:
// stance rows decide who rides along) — until they finally give up.
//
// PURE of the engine: this field owns the writ lifecycle (post / escalate /
// expire) and answers wantsAmbush(); the engine's zone-runtime row spawns the
// squad and the def's kill row settles the writ. Fully durable: being hunted
// survives a relaunch (quitting is not an escape — the fiction demands it).
// ---------------------------------------------------------------------------

import { clamp } from '../../core/math';
import { Rng } from '../../core/rng';
import type { PackTableEntry, ZoneDef } from '../../data/zones';
import { FACTIONS, factionStance } from '../../data/monsters';
import type { World } from '../../engine/world';
import { registerBulletinSource } from '../../world/bulletins';
import { registerZoneInfoSource, type ZoneInfoEntry } from '../../world/zoneInfo';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { eventTargetable } from '../../world/zonePolicy';
import { FACTION_COLORS, FALLBACK_FACTION_COLOR } from '../../world/palette';
import { scaledCap } from '../frequency';
import type { OverlayBuildCtx, PackageGate } from '../types';

const STEP = 0.5;

/** One escalation rung — squad shape per writ tier (tier 1 = the first posse). */
export interface VendettaTier {
  label: string;
  /** Hunters in the squad (the warrant-holder rides on top). */
  size: [number, number];
  /** Added monster levels on the squad at this tier. */
  levelBonus: number;
  /** Per-eligible-zone-entry chance the squad springs here. */
  ambushChance: number;
  /** ALLIED factions (stance 'ally' with the poster) lend hunters at this
   *  tier and above — the politics weave made teeth. */
  alliesJoin?: boolean;
  /** Reward multiplier for settling AT this tier (daring pays). */
  rewardMul: number;
}

/** The whole reprisal mechanic as data — every number a knob. */
export interface VendettaSurge {
  /** The faction-scoped GRUDGE drive id this package reads (registered by the
   *  def; fed by the engine's faction_drive_feed row on every member death). */
  driveId: string;
  /** Grudge level (0..1) at which a faction may post a writ. */
  grudgeThreshold: number;
  /** Per-STEP chance (×ignitionMul) a crested faction actually posts. */
  igniteChance: number;
  /** Most writs standing at once (×concurrency crank). */
  maxConcurrent: number;
  /** Seconds a writ stands before they give up (×1/severity — a cranked world
   *  hunts LONGER). Escalation happens inside this window. */
  lifeSeconds: number;
  /** Seconds between tier escalations while the writ stands un-settled
   *  (÷ clamp(severityMul) — a cranked world escalates faster). */
  escalateSeconds: number;
  /** Seconds after a sprung ambush before another can spring (breathing room). */
  ambushCooldown: number;
  /** The escalation ladder, tier 1 first. */
  tiers: VendettaTier[];
  /** Factions that may post writs (must field a roster). Empty = any faction
   *  with a registered roster whose grudge crests. */
  posters?: string[];
  /** Roster OVERRIDE per faction (defaults to the faction's own table). */
  hunterRosters?: Record<string, PackTableEntry[]>;
  /** The warrant-holder: promoted from the squad's own roster. */
  warrant: { promote: 'champion' | 'crowned'; levelBonus: number; xpFloor: number };
  /** Settle payout (×tier rewardMul ×zone level scaling). */
  reward: { xpBase: number; xpPerLevel: number; gems: number; rivalRep: number };
  /** Grudge level the poster's meter RESETS to when a writ is settled (the
   *  people's anger breaks) — expiry instead cools to threshold × this too. */
  settleGrudge: number;
  color?: string;
}

/** One standing writ of reprisal. */
export interface WritInfo {
  id: string;
  faction: string;
  tier: number;
  tierLabel: string;
  color: string;
  ageSeconds: number;
  lifeSeconds: number;
}

/** What the engine reads to spring one ambush (the squad build sheet). */
export interface AmbushSpec {
  writId: string;
  faction: string;
  color: string;
  tier: number;
  tierLabel: string;
  size: number;
  levelBonus: number;
  /** The squad roster: the poster's table, plus each joined ally's, merged. */
  roster: PackTableEntry[];
  warrant: { promote: 'champion' | 'crowned'; levelBonus: number; xpFloor: number };
}

interface ActiveWrit {
  id: string;
  faction: string;
  tierIdx: number;          // 0-based into cfg.tiers
  age: number;
  escalateAcc: number;
  cooldownLeft: number;     // seconds until the next ambush may spring
}

export class VendettaField implements WorldOverlay {
  readonly id = 'vendetta';
  /** Durable: being hunted survives a relaunch — a writ is the world's memory
   *  of what the player DID, and quitting must never launder it. */
  readonly persistence = 'durable' as const;

  /** Fresh, undrained bulletin lines (posted / escalated / settled / expired). */
  private notices: { text: string; color?: string }[] = [];

  private rng: Rng;
  private readonly gate: () => PackageGate;
  private readonly cfg: VendettaSurge;
  private writs: ActiveWrit[] = [];
  private acc = 0;
  private seq = 0;
  /** Grudge levels observed last tick (the sim feeds via setGrudges — the
   *  overlay never reaches into WorldDrives itself; pure-of-engine). */
  private grudges = new Map<string, number>();
  /** The one-shot discovery flag (bumps writs_seen through the engine). */
  private seenPending = false;

  constructor(ctx: OverlayBuildCtx, surge: VendettaSurge) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
    this.cfg = surge;
  }

  update(dt: number, _view: OverlayView): void {
    const g = this.gate();
    const sev = clamp(g.severityMul || 1, 0.25, 1.5);
    // LIFECYCLE — age, escalate on the severity clock, expire when they tire.
    for (let i = this.writs.length - 1; i >= 0; i--) {
      const w = this.writs[i];
      w.age += dt;
      if (w.cooldownLeft > 0) w.cooldownLeft = Math.max(0, w.cooldownLeft - dt);
      w.escalateAcc += dt * sev;
      if (w.escalateAcc >= this.cfg.escalateSeconds && w.tierIdx < this.cfg.tiers.length - 1) {
        w.escalateAcc = 0;
        w.tierIdx++;
        this.notices.push({
          text: `${factionName(w.faction)} raise the bounty — ${this.cfg.tiers[w.tierIdx].label}!`,
          color: this.colorOf(w.faction),
        });
      }
      // A cranked world hunts LONGER (life ÷ severity would punish daring the
      // other way; × keeps "more severe = more hunt" one-directional).
      if (w.age >= this.cfg.lifeSeconds * sev) {
        this.writs.splice(i, 1);
        this.notices.push({
          text: `${factionName(w.faction)} abandon their writ — the hunters go home.`,
          color: this.colorOf(w.faction),
        });
        this.expirePending.push(w.faction);
      }
    }
    // IGNITION — a crested faction may post (gate + cap + the step roll).
    this.acc += dt;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      if (!g.active) continue;
      if (this.writs.length >= scaledCap(this.cfg.maxConcurrent, g.concurrencyMul)) continue;
      if (!this.rng.chance(clamp(this.cfg.igniteChance * g.ignitionMul, 0, 1))) continue;
      const poster = this.pickPoster();
      if (poster) this.post(poster);
    }
  }

  onNodeCharted(): void { /* writs follow the PLAYER, not the ground */ }
  affectSpawns(): SpawnBias { return NO_BIAS; } // squads are engine-materialized ambushes
  renderMap(): MapLayer { return { under: '', over: '' }; } // player-anchored — no map field

  // --- the sim feed (grudges) + engine accessors ------------------------------

  /** The sim mirrors each faction's grudge meter in before update() each tick
   *  (WorldDrives lives engine-side; this keeps the overlay pure). */
  setGrudges(entries: ReadonlyArray<[string, number]>): void {
    this.grudges.clear();
    for (const [f, v] of entries) this.grudges.set(f, v);
  }

  surge(): VendettaSurge { return this.cfg; }

  /** Every standing writ (HUD / zone-info / tests). */
  writsView(): WritInfo[] {
    return this.writs.map(w => ({
      id: w.id, faction: w.faction, tier: w.tierIdx + 1,
      tierLabel: this.cfg.tiers[w.tierIdx].label,
      color: this.colorOf(w.faction),
      ageSeconds: w.age, lifeSeconds: this.cfg.lifeSeconds,
    }));
  }

  /** Should a hunter squad spring in this zone NOW? Rolled once per zone entry
   *  by the engine's zone-runtime row; a hit arms the cooldown and returns the
   *  squad build sheet (the strongest eligible writ springs first). */
  wantsAmbush(zone: ZoneDef): AmbushSpec | null {
    if (!this.gate().active || !eventTargetable(this.id, zone)) return null;
    // Highest tier first — the angriest people find you first.
    const ready = this.writs
      .filter(w => w.cooldownLeft <= 0)
      .sort((a, b) => b.tierIdx - a.tierIdx);
    for (const w of ready) {
      const tier = this.cfg.tiers[w.tierIdx];
      if (!this.rng.chance(tier.ambushChance)) continue;
      const roster = this.rosterFor(w.faction, tier);
      if (!roster.length) continue;
      w.cooldownLeft = this.cfg.ambushCooldown;
      return {
        writId: w.id, faction: w.faction, color: this.colorOf(w.faction),
        tier: w.tierIdx + 1, tierLabel: tier.label,
        size: this.rng.int(tier.size[0], tier.size[1]),
        levelBonus: tier.levelBonus,
        roster,
        warrant: this.cfg.warrant,
      };
    }
    return null;
  }

  /** The warrant-holder fell — SETTLE the writ. Returns the payout sheet
   *  (null for a stale id: the writ expired mid-fight — no double-dip). */
  settleWrit(writId: string): { faction: string; tier: number; rewardMul: number; rivalPaid: string | null } | null {
    const i = this.writs.findIndex(w => w.id === writId);
    if (i < 0) return null;
    const w = this.writs[i];
    const tier = this.cfg.tiers[w.tierIdx];
    this.writs.splice(i, 1);
    this.settledPending.push(w.faction);
    this.notices.push({
      text: `The writ is settled — ${factionName(w.faction)} let the matter die.`,
      color: this.colorOf(w.faction),
    });
    // The strongest HOSTILE rival of the poster pays tribute for the insult.
    const rival = Object.keys(FACTIONS).find(o => o !== w.faction && factionStance(w.faction, o) === 'hostile') ?? null;
    return { faction: w.faction, tier: w.tierIdx + 1, rewardMul: tier.rewardMul, rivalPaid: rival };
  }

  /** Factions whose writ was SETTLED since the engine last drained (the engine
   *  resets their grudge meter to settleGrudge — meters live engine-side). */
  readonly settledPending: string[] = [];
  /** Factions whose writ EXPIRED since the last drain (grudge cools likewise). */
  readonly expirePending: string[] = [];

  /** One-shot: the first writ this run was posted (bumps the discovery ledger). */
  consumeSeen(): boolean {
    if (!this.seenPending) return false;
    this.seenPending = false;
    return true;
  }

  /** Fresh bulletin lines since the last drain (the registered source pulls). */
  drainNotices(): { text: string; color?: string }[] {
    if (!this.notices.length) return [];
    const out = this.notices;
    this.notices = [];
    return out;
  }

  activeCount(): number { return this.writs.length; }

  // --- worldstate (the persistence pledge) -----------------------------------

  /** Pure JSON: the standing writs + pending drains + the counter. No zone
   *  refs at all (writs follow the player), so no claims and no pruning. */
  snapshot(): unknown {
    return {
      writs: this.writs.map(w => ({ ...w })),
      settledPending: [...this.settledPending],
      expirePending: [...this.expirePending],
      seenPending: this.seenPending,
      seq: this.seq,
    };
  }

  restore(snap: unknown): void {
    const s = snap as { writs?: unknown[]; settledPending?: unknown[]; expirePending?: unknown[]; seenPending?: unknown; seq?: unknown } | null;
    if (!s || typeof s !== 'object') return;
    const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
    if (num(s.seq)) this.seq = Math.max(this.seq, Math.floor(s.seq));
    this.seenPending = !!s.seenPending;
    if (Array.isArray(s.writs)) {
      this.writs = [];
      for (const raw of s.writs) {
        const w = raw as Partial<ActiveWrit> | null;
        if (!w || typeof w.id !== 'string' || typeof w.faction !== 'string') continue;
        if (!FACTIONS[w.faction]) continue; // the aggrieved people left the registries
        if (![w.tierIdx, w.age, w.escalateAcc, w.cooldownLeft].every(num)) continue;
        this.writs.push({
          id: w.id, faction: w.faction,
          tierIdx: clamp(Math.floor(w.tierIdx as number), 0, this.cfg.tiers.length - 1),
          age: Math.max(0, w.age as number),
          escalateAcc: Math.max(0, w.escalateAcc as number),
          cooldownLeft: Math.max(0, w.cooldownLeft as number),
        });
      }
    }
    const strs = (v: unknown): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
    this.settledPending.length = 0;
    this.settledPending.push(...strs(s.settledPending));
    this.expirePending.length = 0;
    this.expirePending.push(...strs(s.expirePending));
  }

  // --- dev seam ---------------------------------------------------------------

  /** DEV (Events tab): post a writ NOW from the angriest eligible faction
   *  (grudge crest waived), so the next eligible zone entry can spring it. */
  devIgnite(_view: OverlayView, _zoneId: string): boolean {
    const posters = this.eligiblePosters();
    if (!posters.length) return false;
    // Angriest first (falling back to any poster when no grudge is warm yet).
    posters.sort((a, b) => (this.grudges.get(b) ?? 0) - (this.grudges.get(a) ?? 0));
    this.post(posters[0]);
    // A dev writ is impatient: the first ambush may spring immediately.
    const w = this.writs[this.writs.length - 1];
    if (w) w.cooldownLeft = 0;
    return true;
  }

  // --- internals ---------------------------------------------------------------

  private colorOf(faction: string): string {
    return this.cfg.color ?? FACTION_COLORS[faction] ?? FALLBACK_FACTION_COLOR;
  }

  private eligiblePosters(): string[] {
    const base = this.cfg.posters?.length ? this.cfg.posters : Object.keys(FACTIONS);
    return base.filter(f =>
      FACTIONS[f]?.table?.length
      && !this.writs.some(w => w.faction === f)); // one writ per people at a time
  }

  /** A faction whose grudge has crested (weighted toward the angriest). */
  private pickPoster(): string | null {
    const crested = this.eligiblePosters()
      .filter(f => (this.grudges.get(f) ?? 0) >= this.cfg.grudgeThreshold);
    if (!crested.length) return null;
    let total = 0;
    const weights = crested.map(f => { const w = this.grudges.get(f) ?? 0; total += w; return w; });
    let r = this.rng.next() * total;
    for (let i = 0; i < crested.length; i++) { r -= weights[i]; if (r <= 0) return crested[i]; }
    return crested[crested.length - 1];
  }

  private post(faction: string): void {
    this.writs.push({
      id: `writ_${this.seq++}`, faction,
      tierIdx: 0, age: 0, escalateAcc: 0,
      // The first ambush needs no cooldown — the writ is fresh anger.
      cooldownLeft: 0,
    });
    this.seenPending = true;
    this.notices.push({
      text: `${factionName(faction)} post a WRIT OF REPRISAL — hunters take the road.`,
      color: this.colorOf(faction),
    });
  }

  /** The squad's roster: the poster's own table — and at alliesJoin tiers,
   *  every ALLIED faction's table folded in (stance rows made teeth). */
  private rosterFor(faction: string, tier: VendettaTier): PackTableEntry[] {
    const own = this.cfg.hunterRosters?.[faction] ?? FACTIONS[faction]?.table ?? [];
    if (!tier.alliesJoin) return [...own];
    const out = [...own];
    for (const other of Object.keys(FACTIONS)) {
      if (other === faction || factionStance(faction, other) !== 'ally') continue;
      const t = this.cfg.hunterRosters?.[other] ?? FACTIONS[other]?.table ?? [];
      // Allies ride lighter — half weight, so the writ keeps its poster's face.
      for (const e of t) out.push({ ...e, weight: Math.max(1, Math.round(e.weight / 2)) });
    }
    return out;
  }
}

function factionName(f: string): string {
  return (FACTIONS[f]?.name ?? f).replace(/^the /, '');
}

// --- bulletins + zone-info (registered on import — zero engine edits) ---------

registerBulletinSource((world: World) => {
  return world.sim.vendettaField?.drainNotices() ?? [];
});

// While hunted, every eligible zone's info box carries the warning row — the
// player should FEEL the writ wherever they roam (it is not tied to ground).
registerZoneInfoSource((world: World, zoneId: string): ZoneInfoEntry[] => {
  const vf = world.sim.vendettaField;
  if (!vf) return [];
  const writs = vf.writsView();
  if (!writs.length) return [];
  const zone = world.zoneMap[zoneId];
  if (!zone || !eventTargetable('vendetta', zone)) return [];
  return writs.map(w => ({
    kind: 'event' as const, icon: '✠', color: w.color,
    label: `Writ of Reprisal — ${factionName(w.faction)}`,
    detail: `${w.tierLabel} · hunters on the road`, z: 14,
  }));
});
