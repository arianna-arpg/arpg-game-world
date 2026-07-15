// ---------------------------------------------------------------------------
// VERMINFALL FIELD — the warrens in the town's shadow (pure overlay).
//
// The Verminfall is the world's smallest lives organizing against its largest
// idea: HOME. On a slow tick an INFESTATION ignites in some charted zone close
// to town — never far ground, always the near ring, because the warren wants
// what the town keeps — and stands there festering until answered. The claimed
// zone grows WARREN NESTS (destructible, rift_maw-shaped bodies the engine
// materializes on entry) and vermin packs to defend them; breaking the LAST
// nest calls up the RAT KING, and only his fall clears the ground.
//
// THE TOWN FEELS IT (townPressure): while any infestation festers, the town's
// own ambient vermin MULTIPLY — gutter rats thick under the benches, roaches
// in the cellar — the meta-threat read as texture. Never a theft, always a
// tell: growth carries risk, and the town says so out loud.
//
// PURE of the engine, exactly like ContagionField: it owns the claim + the
// nest ledger + the king's arming, with no runtime coupling to World. The
// engine reads infestOn() to materialize nests/packs/king; the kill-handler
// rows call onNestBroken()/onKingSlain() back. Unlike the Contagion's hidden
// creep, an infestation is VISIBLE from ignition — the warrens are next door,
// and the town hears the gnawing.
// ---------------------------------------------------------------------------

import { clamp } from '../../core/math';
import { Rng } from '../../core/rng';
import { START_ZONE, type ZoneDef } from '../../data/zones';
import type { World } from '../../engine/world';
import { coordDist } from '../../world/coords';
import { registerZoneInfoSource, type ZoneInfoEntry } from '../../world/zoneInfo';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { eventTargetable } from '../../world/zonePolicy';
import { scaledCap } from '../frequency';
import type { OverlayBuildCtx, PackageGate } from '../types';

const STEP = 0.5;          // fixed ignition cadence (seconds)

/** The whole Verminfall mechanic as data — every number is a knob (mirrors the
 *  other surges). Carried by the def, passed into the overlay constructor. */
export interface VerminfallSurge {
  /** Per-STEP base chance (×ignitionMul) a fresh infestation IGNITES. */
  igniteChance: number;
  /** Most infestations festering at once (×concurrency crank). */
  maxConcurrent: number;
  /** Max node-distance from town a warren may claim — the INVERSE of the
   *  Contagion's seedMinDist: vermin nest in the town's shadow, never the
   *  far wilds. */
  seedMaxDist: number;
  /** Zone level ceiling on claims (warrens want the soft near ring; a knob
   *  so a harder tuning can send them deeper). */
  levelMax: number;
  /** Warren nests rolled per infestation (the clear condition). */
  nests: [number, number];
  /** Vermin packs the engine materializes per visit (lerped by how much of
   *  the warren still stands) and the size of each pack. */
  packCount: [number, number];
  packSize: [number, number];
  /** The vermin faction the engine fields in a claimed zone. */
  faction: string;
  /** The Rat King's monster id — manifested when the LAST nest breaks. */
  kingDefId: string;
  /** Levels above the zone the manifested King spawns at. */
  kingLevelBonus: number;
  /** Felling the King pays this (xp + gems), scaled by the zone level. */
  reward: { xpBase: number; xpPerLevel: number; gems: number };
  /** Seconds a warren must fester before the town's own vermin swell. */
  graceSeconds: number;
  /** Town ambient-vermin chance multiplier per festering infestation past
   *  its grace (the Living-Ledger threat lane, read by spawnWildlife). */
  townPressureBoost: number;
  /** Cap on the composed town-pressure multiplier. */
  townPressureCap: number;
  /** The banner colour (map ring, info row, entry text). */
  color: string;
}

/** What the engine reads to field the warren in a claimed zone. */
export interface InfestationInfo {
  /** Nests still standing (the engine materializes exactly these). */
  nestsRemaining: number;
  nestsTotal: number;
  /** Every nest is broken and the King walks (or must be re-fielded). */
  kingArmed: boolean;
  color: string;
  /** 'festering' | 'stirred' | 'broken' — the severity word for the info row. */
  label: string;
}

/** One standing infestation — its claim + nest ledger + king state. */
interface ActiveInfestation {
  id: string;
  zoneId: string;
  nestsTotal: number;
  nestsBroken: number;
  /** Seconds this warren has festered (drives the town-pressure grace). */
  age: number;
  /** The player has entered the claimed zone (one-shot discovery ledger). */
  seen: boolean;
  /** The King has fallen — the infestation is finished (recycled). */
  dead: boolean;
}

export class VerminfallField implements WorldOverlay {
  readonly id = 'verminfall';
  /** Durable: a half-broken warren is a job half-done — the nest ledger and
   *  the armed King both resume (no quit-to-cleanse cheese). */
  readonly persistence = 'durable' as const;
  readonly mapLabel = 'Verminfall';

  private rng: Rng;
  private readonly gate: () => PackageGate;
  private readonly cfg: VerminfallSurge;
  private infestations: ActiveInfestation[] = [];
  private acc = 0;
  private seq = 0;
  /** Live reference to the world's node map (= view.byId), refreshed each tick. */
  private nodesById: Record<string, ZoneDef> = {};

  constructor(ctx: OverlayBuildCtx, surge: VerminfallSurge) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
    this.cfg = surge;
  }

  update(dt: number, view: OverlayView): void {
    this.nodesById = view.byId;
    const g = this.gate();
    // A warren AGES whether or not anyone visits — the town-pressure clock.
    for (const inf of this.infestations) if (!inf.dead) inf.age += dt;
    this.infestations = this.infestations.filter(i => !i.dead);
    // IGNITION — roll a fresh claim on the fixed step (gated by pressure + cap).
    this.acc += dt;
    while (this.acc >= STEP) { this.acc -= STEP; if (g.active) this.maybeIgnite(view); }
  }

  onNodeCharted(): void { /* claims only charted ground; fresh nodes join the candidate pool next roll */ }

  affectSpawns(): SpawnBias { return NO_BIAS; } // the warren is engine-MATERIALIZED, not a table bias

  renderMap(_nodes: ZoneDef[]): MapLayer {
    // Painted off nodesById (crusade/contagion-style). An infestation is
    // VISIBLE from ignition — the warrens sit in the town's shadow, and the
    // town hears the gnawing; there is no hidden-spread act to protect.
    let under = '', over = '';
    for (const inf of this.infestations) {
      if (inf.dead) continue;
      const n = this.nodesById[inf.zoneId];
      if (!n) continue;
      const s = clamp(1 - inf.nestsBroken / Math.max(1, inf.nestsTotal), 0, 1);
      const cx = n.map.x.toFixed(1), cy = n.map.y.toFixed(1);
      under += `<circle cx="${cx}" cy="${cy}" r="${(15 + 5 * s).toFixed(1)}" `
        + `fill="${this.cfg.color}" fill-opacity="${(0.06 + 0.08 * s).toFixed(3)}"/>`;
      const op = (0.35 + 0.45 * s).toFixed(2);
      const dur = (2.8 - 1.2 * s).toFixed(2);
      over += `<circle cx="${cx}" cy="${cy}" r="12.5" fill="none" stroke="${this.cfg.color}" `
        + `stroke-width="${(1.2 + 1.6 * s).toFixed(1)}" stroke-opacity="${op}">`
        + `<animate attributeName="stroke-opacity" values="${op};${(+op * 0.35).toFixed(2)};${op}" dur="${dur}s" repeatCount="indefinite"/>`
        + `</circle>`
        + `<text x="${cx}" y="${(n.map.y - 15).toFixed(1)}" text-anchor="middle" font-size="12" fill="${this.cfg.color}">🐀</text>`;
    }
    return { under, over };
  }

  // --- accessors the engine reads -------------------------------------------

  /** Live config (the engine reads the faction / nest / pack / reward knobs). */
  surge(): VerminfallSurge { return this.cfg; }

  /** Event-activity fed to the bloom (WorldOverlay.activityAt): a claimed zone. */
  activityAt(zoneId: string): number { return this.infestOn(zoneId) ? 1 : 0; }

  /** The infestation holding a zone, or null. The engine materializes the
   *  standing nests + intensity-scaled vermin packs off this, and the KING
   *  when every nest is broken but the ground unclaimed. */
  infestOn(zoneId: string): InfestationInfo | null {
    const inf = this.infestations.find(i => i.zoneId === zoneId && !i.dead);
    if (!inf) return null;
    const remaining = Math.max(0, inf.nestsTotal - inf.nestsBroken);
    return {
      nestsRemaining: remaining,
      nestsTotal: inf.nestsTotal,
      kingArmed: remaining <= 0,
      color: this.cfg.color,
      label: remaining <= 0 ? 'broken' : inf.nestsBroken > 0 ? 'stirred' : 'festering',
    };
  }

  /** TOWN PRESSURE — the ambient-vermin chance multiplier the town's own
   *  fauna rows read (spawnWildlife): 1 while the near ring is quiet; swells
   *  per festering warren past its grace. The threat that reads as texture. */
  townPressure(): number {
    const live = this.infestations.filter(i => !i.dead && i.age >= this.cfg.graceSeconds).length;
    return clamp(1 + live * this.cfg.townPressureBoost, 1, this.cfg.townPressureCap);
  }

  /** The player entered a claimed zone — one-shot true per infestation (the
   *  engine bumps the discovery ledger + floats the entry line). */
  markDiscovered(zoneId: string): boolean {
    const inf = this.infestations.find(i => i.zoneId === zoneId && !i.dead);
    if (!inf || inf.seen) return false;
    inf.seen = true;
    return true;
  }

  /** A warren nest broke in `zoneId`. Returns the standing count + whether
   *  that was the LAST one (the kill row manifests the King on true). */
  onNestBroken(zoneId: string): { remaining: number; kingReady: boolean } | null {
    const inf = this.infestations.find(i => i.zoneId === zoneId && !i.dead);
    if (!inf) return null;
    inf.nestsBroken = Math.min(inf.nestsTotal, inf.nestsBroken + 1);
    const remaining = inf.nestsTotal - inf.nestsBroken;
    return { remaining, kingReady: remaining <= 0 };
  }

  /** The manifested King fell — the infestation clears. True once (the
   *  cleansed ledger gates the Vault tiers). */
  onKingSlain(zoneId: string): boolean {
    const inf = this.infestations.find(i => i.zoneId === zoneId && !i.dead);
    if (!inf || inf.nestsBroken < inf.nestsTotal) return false;
    inf.dead = true;
    return true;
  }

  activeCount(): number { return this.infestations.filter(i => !i.dead).length; }

  // --- worldstate (the persistence pledge) -----------------------------------

  /** Pure JSON: the standing infestations + the id counter. */
  snapshot(): unknown {
    return {
      infestations: this.infestations.map(i => ({
        id: i.id, zoneId: i.zoneId, nestsTotal: i.nestsTotal,
        nestsBroken: i.nestsBroken, age: i.age, seen: i.seen, dead: i.dead,
      })),
      seq: this.seq,
    };
  }

  restore(snap: unknown): void {
    const s = snap as { infestations?: unknown[]; seq?: unknown } | null;
    if (!s || typeof s !== 'object') return;
    if (typeof s.seq === 'number' && Number.isFinite(s.seq)) this.seq = Math.max(this.seq, Math.floor(s.seq));
    if (!Array.isArray(s.infestations)) return;
    this.infestations = [];
    for (const raw of s.infestations) {
      const i = raw as { id?: unknown; zoneId?: unknown; nestsTotal?: unknown; nestsBroken?: unknown; age?: unknown; seen?: unknown; dead?: unknown } | null;
      if (!i || typeof i.id !== 'string' || typeof i.zoneId !== 'string') continue;
      if (i.dead) continue; // a cleared warren stays cleared
      const total = typeof i.nestsTotal === 'number' && Number.isFinite(i.nestsTotal) ? Math.max(1, Math.floor(i.nestsTotal)) : 1;
      this.infestations.push({
        id: i.id, zoneId: i.zoneId, nestsTotal: total,
        nestsBroken: typeof i.nestsBroken === 'number' && Number.isFinite(i.nestsBroken) ? clamp(Math.floor(i.nestsBroken), 0, total) : 0,
        age: typeof i.age === 'number' && Number.isFinite(i.age) ? Math.max(0, i.age) : 0,
        seen: !!i.seen,
        dead: false,
      });
    }
  }

  /** Culled ground sheds its warren — never an immortal claim. */
  pruneZones(has: (zoneId: string) => boolean): void {
    this.infestations = this.infestations.filter(i => has(i.zoneId));
  }

  // --- dev seam (the QA Event tab) -------------------------------------------

  /** DEV: claim the given (current) zone at once. (QA only.) */
  devIgnite(view: OverlayView, zoneId: string): boolean {
    const here = view.byId[zoneId];
    if (!here || !this.claimable(here) || this.infestOn(zoneId)) return false;
    this.infestations.push(this.makeInfestation(here));
    return true;
  }

  // --- internals -------------------------------------------------------------

  /** May the warren claim a zone? Streamable per the shared policy, never the
   *  town itself, and only the soft near ring (level cap). */
  private claimable(z: ZoneDef): boolean {
    return z.id !== START_ZONE && z.level >= 1 && z.level <= this.cfg.levelMax
      && eventTargetable(this.id, z);
  }

  private makeInfestation(z: ZoneDef): ActiveInfestation {
    return {
      id: `verminfall_${this.seq++}`,
      zoneId: z.id,
      nestsTotal: this.rng.int(this.cfg.nests[0], this.cfg.nests[1]),
      nestsBroken: 0, age: 0, seen: false, dead: false,
    };
  }

  /** Pick a claimable charted zone NEAR town (closeness-weighted — the warren
   *  wants what the town keeps), then claim it. */
  private maybeIgnite(view: OverlayView): void {
    const g = this.gate();
    if (this.infestations.filter(i => !i.dead).length >= scaledCap(this.cfg.maxConcurrent, g.concurrencyMul)) return;
    if (!this.rng.chance(clamp(this.cfg.igniteChance * g.ignitionMul, 0, 1))) return;
    const town = view.byId[START_ZONE];
    const tc = town ? town.map : { x: 0, y: 0 };
    const claimed = new Set(this.infestations.filter(i => !i.dead).map(i => i.zoneId));
    const cands = view.nodes.filter(z =>
      this.claimable(z) && !claimed.has(z.id) && view.visited.has(z.id)
      && coordDist(z.map, tc) <= this.cfg.seedMaxDist);
    if (!cands.length) return;
    // Weight by CLOSENESS (nearer = likelier): the warren digs at the town's hem.
    let total = 0;
    const weights = cands.map(z => {
      const w = Math.max(10, this.cfg.seedMaxDist - coordDist(z.map, tc));
      total += w; return w;
    });
    let r = this.rng.next() * total;
    let src = cands[cands.length - 1];
    for (let i = 0; i < cands.length; i++) { r -= weights[i]; if (r <= 0) { src = cands[i]; break; } }
    this.infestations.push(this.makeInfestation(src));
  }
}

// --- zone-info row (registered on import — zero panel edits) ------------------
//
// A claimed zone surfaces a severity row in the World Map's zone box from the
// moment it ignites — the warren is next door and the town says so.
registerZoneInfoSource((world: World, zoneId: string): ZoneInfoEntry[] => {
  const info = world.sim.verminfallField?.infestOn(zoneId);
  if (!info) return [];
  return [{
    kind: 'event', icon: '🐀', color: info.color, label: 'Infestation',
    detail: info.kingArmed
      ? 'the warren is broken — the RAT KING walks'
      : `${info.label} — ${info.nestsRemaining} warren nest${info.nestsRemaining === 1 ? '' : 's'} stand`,
    z: 14,
  }];
});
