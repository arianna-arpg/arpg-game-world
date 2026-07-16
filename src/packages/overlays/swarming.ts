// ---------------------------------------------------------------------------
// SWARMING FIELD — the Chitin's HIVE-CYCLE world event (pure overlay).
//
// The Seethe is QUEENLESS BY DOCTRINE (no WARLORD_OF crown — the invasion
// gate never opens, no warbands, no boss finale). Its ONLY map-scale march
// is this cycle, and the cycle is a CLOCK THE PLAYER CAN READ AND BREAK:
//
//   BROODING — the roost claims a handful of hive-ground zones and grows
//   HIVE THROATS there (extra hive_node bodies the engine materializes on
//   entry). The standing-throat TALLY is the visible clock — the Conclave's
//   hidden incubation counter, made legible: map markers + zone-info rows
//   say exactly how close the wing is. STAMP THE THROATS and the tally
//   falls; raze enough before the clock and the swarming SHRINKS — or never
//   rises at all. Left alone, the broods build until the sand hums.
//
//   WINGED — at the threshold (or when the brood clock runs out with enough
//   throats standing) the swarm TAKES WING: a directional band from the
//   densest brood ground out to a far pole and BACK — Migration's band
//   machinery made hostile, significantly smaller and much quicker. Zones
//   the band covers get a pouring stream of the flying castes while the
//   player stands there. Mid-flight the swarm PREYS: any migration herd
//   whose band crosses the swarm's may be consumed outright (the engine
//   bridges the two pure fields; the roll and the once-latch live here).
//   The flight's one soft throat: the WINGED ALATES riding the stream —
//   down enough of them and the wing BREAKS for home, spent.
//
//   THE WAKE — ground the band passed keeps ROYAL-JELLY CACHES (fallen
//   repletes the engine materializes on entry; their loot pays the royal
//   register). An unbroken flight ends ECOLOGICALLY, never with a throne:
//   it PLANTS a new brood ground at its far pole (a keyed biome warp — the
//   desert takes root; future cycles brood there too) and the roost's next
//   cycle comes a little sooner. No crown. No finale. The world just turns.
//
// PURE of the engine (the migration/verminfall mold): it owns the cycle
// state, the brood ledger, the flight band, the wake, and the planted
// roosts. The engine reads broodOn()/swarmOn()/cachesIn() to materialize,
// calls onBroodNodeBroken()/onAlateDown()/onCacheBroken() back from kill
// rows, feeds predate() the herd bands, and drains takeRoostWarps() into
// the biome field. Durable: a half-stamped brood ground or a mid-air wing
// resumes across relaunch (no quit-to-defuse).
// ---------------------------------------------------------------------------

import { clamp } from '../../core/math';
import { Rng } from '../../core/rng';
import { MONSTERS } from '../../data/monsters';
import type { PackTableEntry, ZoneDef } from '../../data/zones';
import type { World } from '../../engine/world';
import { coordDist, type MapCoord } from '../../world/coords';
import { registerMarkerSource, type MapMarker } from '../../world/mapMarkers';
import { registerBulletinSource, type WorldBulletin } from '../../world/bulletins';
import { registerZoneInfoSource, type ZoneInfoEntry } from '../../world/zoneInfo';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { eventTargetable } from '../../world/zonePolicy';
import { FACTION_COLORS } from '../../world/palette';
import { scaledCap } from '../frequency';
import type { OverlayBuildCtx, PackageGate } from '../types';

const STEP = 0.5;             // fixed cadence (ignition + brood-growth rolls)
const SEETHE_AMBER = '#d89a3a'; // the Seethe's banner fallback

/** A FLAVOUR a fresh wing rolls — how thick the sky gets and how wide a band
 *  it drags (all deliberately SMALLER than a migration's: a spear, not a tide). */
export interface SwarmingVariant {
  id: string;
  name: string;
  weight: number;
  /** Concurrent fliers the stream sustains pouring into a caught zone. */
  streamCap: number;
  /** Coverage half-width of the band (node-units). */
  radius: number;
  color?: string;
}

/** The whole hive-cycle as data (mirrors the sibling surges — every number a knob). */
export interface SwarmingSurge {
  // --- BROODING (the visible clock) ---------------------------------------
  /** Per-STEP chance (×ignitionMul) a resting roost SEEDS a fresh brood cycle
   *  (gated on hive ground being charted at all). */
  igniteChance: number;
  /** Most cycles running at once (one roost, one cycle — lifts with the crank). */
  maxConcurrent: number;
  /** Brood zones claimed per cycle. */
  broodZones: number;
  /** Node-distance a claimed zone may sit from the roost's densest ground. */
  clusterRadius: number;
  /** Hive throats each brood ground STARTS with (rolled). */
  quotaStart: [number, number];
  /** Throat ceiling per brood ground (growth stops here). */
  quotaCap: number;
  /** Seconds per NEW throat maturing in each brood ground. */
  growSeconds: number;
  /** Base seconds of the brood clock (rolled; completed cycles shrink it). */
  broodSeconds: [number, number];
  /** Standing tally that takes wing EARLY, at full strength. */
  wingThreshold: number;
  /** Standing tally below which the clock's end DISPERSES the cycle instead
   *  (the player stamped the swarming out — the counterplay's payoff). */
  skipMin: number;
  /** Seconds the roost rests between cycles (rolled). */
  restSeconds: [number, number];
  /** A COMPLETED (unbroken) flight multiplies the next brood clock — the
   *  roost emboldens; floored so acceleration never degenerates. */
  cycleAccel: number;
  broodSecondsMin: number;
  /** The throat body (the hivesands' own spawner-object, reused). */
  hiveNodeId: string;
  // --- THE WING (the band) -------------------------------------------------
  /** Flight reach sampled from the brood centroid (node-units). */
  reach: [number, number];
  /** Band head speed OUT (node-units/sec) — much quicker than a herd. */
  wingSpeed: number;
  /** Band head speed HOME (a touch quicker still; broken wings flee faster). */
  homeSpeed: number;
  brokenHomeMul: number;
  /** Seconds the swarm GORGES at the far pole before turning home. */
  gorgeSeconds: number;
  /** Default band half-width (variants override). */
  radius: number;
  /** The faction the wing flies for. */
  faction: string;
  /** The flying castes (weightedPick folds presence — the alate's def floor
   *  is a HARD gate) + the streamed level bonus. */
  flightRoster: PackTableEntry[];
  /** The breeding caste's id (stream-tagged 'swarm_alate' — the break throat). */
  alateId: string;
  levelBonus: number;
  /** Seconds between in-zone pours, and fliers per pour. */
  streamInterval: number;
  streamBatch: [number, number];
  /** Alates downed in ONE flight to BREAK the wing (it turns home, spent —
   *  no plant, no acceleration). The queenless cycle's only soft throat. */
  alateGuard: number;
  // --- PREDATION (the event-eater lite) -------------------------------------
  /** Chance a migration herd whose band CROSSES the wing's is consumed
   *  outright (rolled once per herd per flight — the once-latch). */
  consumeChance: number;
  /** Stream-cap bonus per herd gorged (the wing flies home heavier). */
  gorgeCapBonus: number;
  // --- THE WAKE --------------------------------------------------------------
  /** Royal-jelly caches left per passed zone (rolled). */
  cachesPerZone: [number, number];
  /** Most wake zones remembered per flight (bounds the snapshot). */
  wakeZoneCap: number;
  /** The cache body (a breakable; MonsterDef.loot pays the register). */
  cacheId: string;
  // --- THE PLANT (ecological completion — queenless by doctrine) -------------
  plant: {
    /** Most planted roosts standing at once (past the cap the cycle only
     *  accelerates — the desert can't eat the whole map). */
    maxPlanted: number;
    /** Biome warp pushed at the far pole (keyed swarm_roost_<id>). */
    biome: string;
    radius: number;
    strength: number;
  };
  variants: SwarmingVariant[];
  color?: string;
}

/** What the engine reads to pour the wing through a caught zone. */
export interface SwarmInfo {
  id: string;
  faction: string;
  color: string;
  /** Unit vector of the wing's CURRENT travel (outbound: roost→pole; homing:
   *  pole→roost) — the engine derives stream entry/exit sides from it. */
  dir: MapCoord;
  streamCap: number;
  levelBonus: number;
  variant: string;
}

/** What the engine reads to field a brood ground's standing throats. */
export interface BroodInfo {
  /** Hive throats still standing HERE (materialize exactly these). */
  standing: number;
  quota: number;
  broken: number;
  /** The cycle-wide standing tally + the wing threshold (the clock's face). */
  tally: number;
  threshold: number;
  color: string;
}

/** One claimed brood ground — quota grows on the clock, broken only climbs. */
interface Brood {
  zoneId: string;
  quota: number;
  broken: number;
  growAcc: number;
  /** One-shot discovery latch (the engine's swarming_seen bump). */
  seen: boolean;
}

/** The wing, in the air. */
interface Flight {
  id: string;
  origin: MapCoord;
  dest: MapCoord;
  /** 0..1 along origin→dest; the covered band is ALWAYS [origin, head] —
   *  out: grows 0→1, gorge: holds 1, home: shrinks 1→0 (the roost stays
   *  under the wing the whole while). */
  headT: number;
  phase: 'out' | 'gorge' | 'home';
  gorgeLeft: number;
  segLen: number;
  radius: number;
  streamCap: number;
  variant: string;
  color: string;
  /** Herds eaten this flight (each fattens the stream). */
  gorged: number;
  /** Alates downed this flight (alateGuard breaks the wing). */
  alatesDown: number;
  broken: boolean;
  /** Zone ids the band has covered (the wake ledger, latched live). */
  passed: string[];
  /** Herd ids already rolled against (the predation once-latch). */
  tried: string[];
}

interface PlantedRoost { id: string; x: number; y: number }

const lerp = (a: MapCoord, b: MapCoord, t: number): MapCoord =>
  ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** Distance from point p to segment a→b. */
function segDist(p: MapCoord, a: MapCoord, b: MapCoord): number {
  const vx = b.x - a.x, vy = b.y - a.y;
  const len2 = vx * vx + vy * vy;
  if (len2 < 1e-6) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(p.x - (a.x + vx * t), p.y - (a.y + vy * t));
}

const orient = (a: MapCoord, b: MapCoord, c: MapCoord): number =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

/** Do segments a1→a2 and b1→b2 properly cross? (Endpoint-grazing counts as
 *  near-zero distance via the endpoint terms below, so strict signs suffice.) */
function segsCross(a1: MapCoord, a2: MapCoord, b1: MapCoord, b2: MapCoord): boolean {
  const d1 = orient(b1, b2, a1), d2 = orient(b1, b2, a2);
  const d3 = orient(a1, a2, b1), d4 = orient(a1, a2, b2);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0))
    && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Segment-to-segment distance: 0 when they cross, else the min endpoint
 *  distance (exact for non-crossing segments). */
function segSegDist(a1: MapCoord, a2: MapCoord, b1: MapCoord, b2: MapCoord): number {
  if (segsCross(a1, a2, b1, b2)) return 0;
  return Math.min(
    segDist(a1, b1, b2), segDist(a2, b1, b2),
    segDist(b1, a1, a2), segDist(b2, a1, a2),
  );
}

export class SwarmingField implements WorldOverlay {
  readonly id = 'swarming';
  /** Durable: the brood ledger is a fuse the player is actively cutting —
   *  quitting must never re-arm a stamped throat (or defuse a built one) —
   *  and a mid-air wing, the wake's unclaimed caches, and every planted
   *  roost are all owed to the world on resume. */
  readonly persistence = 'durable' as const;
  readonly mapLabel = 'Swarming';

  private rng: Rng;
  private readonly gate: () => PackageGate;
  private readonly cfg: SwarmingSurge;
  private nodesById: Record<string, ZoneDef> = {};

  private phase: 'rest' | 'brooding' | 'winged' = 'rest';
  private restLeft = 0;
  private clockLeft = 0;
  /** Completed cycles shrink the next brood clock (cycleAccel, floored). */
  private nextBroodMul = 1;
  private broods: Brood[] = [];
  private flight: Flight | null = null;
  /** zoneId → caches still standing in the swarm's wake. */
  private wake = new Map<string, number>();
  private planted: PlantedRoost[] = [];
  /** Freshly planted roosts the engine drains into biome warps (restore
   *  re-queues every planted roost, so a resumed save re-warps). */
  private pendingWarps: PlantedRoost[] = [];
  private bulletins: WorldBulletin[] = [];
  private acc = 0;
  private seq = 0;

  constructor(ctx: OverlayBuildCtx, surge: SwarmingSurge) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
    this.cfg = surge;
    this.restLeft = this.rng.range(surge.restSeconds[0], surge.restSeconds[1]) * 0.5; // the first cycle comes sooner
  }

  update(dt: number, view: OverlayView): void {
    this.nodesById = view.byId;
    const g = this.gate();

    if (this.phase === 'rest') {
      if (!g.active) return; // the roost sleeps while the package sleeps
      this.restLeft = Math.max(0, this.restLeft - dt); // never negative — snapshots stay fixpoint-exact
      this.acc += dt;
      while (this.acc >= STEP) {
        this.acc -= STEP;
        if (this.restLeft <= 0 && this.rng.chance(clamp(this.cfg.igniteChance * g.ignitionMul, 0, 1))) {
          this.trySeedCycle(view);
        }
      }
      return;
    }

    if (this.phase === 'brooding') {
      // The broods BUILD whether or not anyone watches (the clock is honest).
      for (const b of this.broods) {
        if (b.quota >= this.cfg.quotaCap) continue;
        b.growAcc += dt;
        while (b.growAcc >= this.cfg.growSeconds && b.quota < this.cfg.quotaCap) {
          b.growAcc -= this.cfg.growSeconds;
          b.quota++;
        }
      }
      this.clockLeft = Math.max(0, this.clockLeft - dt);
      const tally = this.tally();
      if (tally >= this.cfg.wingThreshold) {
        this.takeWing(view, 1); // the sand hums — full strength, ahead of the clock
      } else if (this.clockLeft <= 0) {
        if (tally >= this.cfg.skipMin) {
          // The clock ran out with throats standing: the wing rises at the
          // strength the player LEFT it — stamping paid exactly this much.
          this.takeWing(view, clamp(tally / this.cfg.wingThreshold, 0.35, 1));
        } else {
          this.bulletins.push({
            text: 'The brood grounds fall silent — a Swarming stamped out before it rose.',
            color: this.color(),
          });
          this.disperse(false);
        }
      }
      return;
    }

    // --- winged -------------------------------------------------------------
    const f = this.flight;
    if (!f) { this.phase = 'rest'; return; }
    if (f.phase === 'out') {
      const adv = f.segLen > 1 ? (this.cfg.wingSpeed * dt) / f.segLen : 1;
      f.headT = Math.min(1, f.headT + adv);
      if (f.headT >= 1) { f.phase = 'gorge'; f.gorgeLeft = this.cfg.gorgeSeconds; }
    } else if (f.phase === 'gorge') {
      f.gorgeLeft = Math.max(0, f.gorgeLeft - dt);
      if (f.gorgeLeft <= 0) f.phase = 'home';
    } else {
      const spd = this.cfg.homeSpeed * (f.broken ? this.cfg.brokenHomeMul : 1);
      const adv = f.segLen > 1 ? (spd * dt) / f.segLen : 1;
      f.headT = Math.max(0, f.headT - adv);
      if (f.headT <= 0) { this.complete(view); return; }
    }
    // Latch NEW covered ground into the wake ledger (live, so a broken wing
    // still owes caches for everything it actually overflew).
    const a = f.origin, b = lerp(f.origin, f.dest, f.headT);
    for (const z of view.nodes) {
      if (f.passed.length >= this.cfg.wakeZoneCap) break;
      if (f.passed.includes(z.id)) continue;
      if (!this.coverable(z)) continue;
      if (segDist(z.map, a, b) <= f.radius) f.passed.push(z.id);
    }
  }

  onNodeCharted(): void { /* claims resolve by id at seed time; fresh nodes join the next cycle's pool */ }

  affectSpawns(): SpawnBias { return NO_BIAS; } // the wing is the engine STREAM, never a table bias

  renderMap(): MapLayer {
    let under = '', over = '';
    const col = this.color();
    // Brood grounds: a pulsing throat-ring sized by how loaded each one is.
    for (const b of this.broods) {
      const n = this.nodesById[b.zoneId];
      if (!n) continue;
      const s = clamp(this.standing(b) / Math.max(1, this.cfg.quotaCap), 0, 1);
      const cx = n.map.x.toFixed(1), cy = n.map.y.toFixed(1);
      under += `<circle cx="${cx}" cy="${cy}" r="${(14 + 6 * s).toFixed(1)}" fill="${col}" fill-opacity="${(0.05 + 0.09 * s).toFixed(3)}"/>`;
      const op = (0.3 + 0.5 * s).toFixed(2);
      over += `<circle cx="${cx}" cy="${cy}" r="12" fill="none" stroke="${col}" stroke-width="${(1 + 1.8 * s).toFixed(1)}" stroke-opacity="${op}">`
        + `<animate attributeName="stroke-opacity" values="${op};${(+op * 0.3).toFixed(2)};${op}" dur="${(2.6 - 1.4 * s).toFixed(2)}s" repeatCount="indefinite"/></circle>`;
    }
    // The wing: a TIGHT band (a spear, not a herd's tide) + a racing head.
    const f = this.flight;
    if (f) {
      const a = f.origin, b = lerp(f.origin, f.dest, Math.max(f.headT, 0.02));
      const ax = a.x.toFixed(1), ay = a.y.toFixed(1), bx = b.x.toFixed(1), by = b.y.toFixed(1);
      under += `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="${f.color}" stroke-opacity="0.1" stroke-width="${(f.radius * 2).toFixed(1)}" stroke-linecap="round"/>`;
      over += `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="${f.color}" stroke-opacity="0.85" stroke-width="1.6" stroke-dasharray="3 4"/>`;
      over += `<circle cx="${bx}" cy="${by}" r="5" fill="none" stroke="${f.color}" stroke-width="2" stroke-opacity="0.9">`
        + `<animate attributeName="r" values="3;7;3" dur="1.1s" repeatCount="indefinite"/></circle>`;
    }
    return { under, over };
  }

  // --- accessors the engine reads --------------------------------------------

  /** Live config (the engine reads the stream / cache / throat knobs). */
  surge(): SwarmingSurge { return this.cfg; }

  /** Event-activity fed to the bloom: a covered zone is LOUD, a brood ground stirs. */
  activityAt(zoneId: string): number {
    if (this.swarmOn(zoneId)) return 1;
    return this.broodOn(zoneId) ? 0.6 : 0;
  }

  /** The wing currently covering a zone, or null. The engine pours the
   *  hostile stream off this (mirrors migrationOn, hostile + fast). */
  swarmOn(zoneId: string): SwarmInfo | null {
    const f = this.flight;
    if (!f || this.phase !== 'winged') return null;
    const z = this.nodesById[zoneId];
    if (!z || !this.coverable(z)) return null;
    const b = lerp(f.origin, f.dest, f.headT);
    if (segDist(z.map, f.origin, b) > f.radius) return null;
    const dx = f.dest.x - f.origin.x, dy = f.dest.y - f.origin.y;
    const len = Math.hypot(dx, dy) || 1;
    const s = f.phase === 'home' ? -1 : 1; // homing: the flow runs pole→roost
    return {
      id: f.id, faction: this.cfg.faction, color: f.color,
      dir: { x: (dx / len) * s, y: (dy / len) * s },
      streamCap: f.streamCap + f.gorged * this.cfg.gorgeCapBonus,
      levelBonus: this.cfg.levelBonus, variant: f.variant,
    };
  }

  /** The brood ground claiming a zone, or null (engine materializes exactly
   *  `standing` hive throats; the zone-info row reads the clock's face). */
  broodOn(zoneId: string): BroodInfo | null {
    if (this.phase !== 'brooding') return null;
    const b = this.broods.find(x => x.zoneId === zoneId);
    if (!b) return null;
    return {
      standing: this.standing(b), quota: b.quota, broken: b.broken,
      tally: this.tally(), threshold: this.cfg.wingThreshold, color: this.color(),
    };
  }

  /** One-shot discovery latch per brood ground (the swarming_seen bump). */
  markBroodSeen(zoneId: string): boolean {
    const b = this.broods.find(x => x.zoneId === zoneId);
    if (!b || b.seen) return false;
    b.seen = true;
    return true;
  }

  /** Royal-jelly caches still standing in a zone's wake claim. */
  cachesIn(zoneId: string): number { return this.wake.get(zoneId) ?? 0; }

  /** A cache broke — the claim thins; the LOOT rides the body's own table. */
  onCacheBroken(zoneId: string): void {
    const n = (this.wake.get(zoneId) ?? 0) - 1;
    if (n > 0) this.wake.set(zoneId, n);
    else this.wake.delete(zoneId);
  }

  /** A hive throat fell in a brood ground. Returns the ground's standing
   *  count + the cycle tally (the kill row's toast reads both). */
  onBroodNodeBroken(zoneId: string): { standing: number; tally: number } | null {
    const b = this.broods.find(x => x.zoneId === zoneId);
    if (!b) return null;
    b.broken = Math.min(b.quota, b.broken + 1);
    return { standing: this.standing(b), tally: this.tally() };
  }

  /** A winged alate fell mid-flight. Enough of them BREAK the wing — it
   *  turns for home spent (no plant, no acceleration). */
  onAlateDown(): { alatesDown: number; brokeNow: boolean } | null {
    const f = this.flight;
    if (!f || this.phase !== 'winged') return null;
    f.alatesDown++;
    const brokeNow = !f.broken && f.alatesDown >= this.cfg.alateGuard;
    if (brokeNow) {
      f.broken = true;
      f.phase = 'home';
      this.bulletins.push({
        text: 'The wing BREAKS — its alates cut down, the Swarming turns for home, spent.',
        color: f.color,
      });
    }
    return { alatesDown: f.alatesDown, brokeNow };
  }

  /** PREDATION — the engine bridges the pure fields: it feeds every live
   *  migration band in; the roll, the once-latch, and the gorging live HERE
   *  (this field's own rng — deterministic). Returns herd ids to consume. */
  predate(herds: ReadonlyArray<{ id: string; a: MapCoord; b: MapCoord; radius: number }>): string[] {
    const f = this.flight;
    if (!f || this.phase !== 'winged' || f.phase === 'home') return [];
    const eaten: string[] = [];
    const head = lerp(f.origin, f.dest, f.headT);
    for (const h of herds) {
      if (f.tried.includes(h.id)) continue;
      if (segSegDist(f.origin, head, h.a, h.b) > f.radius + h.radius) continue;
      f.tried.push(h.id); // one roll per herd per flight — contact is the trigger
      if (!this.rng.chance(this.cfg.consumeChance)) continue;
      f.gorged++;
      eaten.push(h.id);
      this.bulletins.push({
        text: 'The Swarming falls upon a migrating herd — the plains go quiet under the wing.',
        color: f.color,
      });
    }
    return eaten;
  }

  /** Freshly planted roosts for the engine's biome-warp drain (keyed
   *  swarm_roost_<id>; restore re-queues them all, so saves re-warp). */
  takeRoostWarps(): { id: string; x: number; y: number; biome: string; radius: number; strength: number }[] {
    if (!this.pendingWarps.length) return [];
    const out = this.pendingWarps.map(p => ({
      id: p.id, x: p.x, y: p.y,
      biome: this.cfg.plant.biome, radius: this.cfg.plant.radius, strength: this.cfg.plant.strength,
    }));
    this.pendingWarps = [];
    return out;
  }

  /** Does a planted roost with this id stand? (The warp sweep's liveness.) */
  hasRoost(id: string): boolean { return this.planted.some(p => p.id === id); }

  /** Read-only snapshots for markers / tests. */
  peekBroods(): ReadonlyArray<{ zoneId: string; standing: number; quota: number; seen: boolean }> {
    return this.broods.map(b => ({ zoneId: b.zoneId, standing: this.standing(b), quota: b.quota, seen: b.seen }));
  }
  peekFlight(): Readonly<{ id: string; head: MapCoord; origin: MapCoord; phase: string; color: string; variant: string; broken: boolean }> | null {
    const f = this.flight;
    if (!f || this.phase !== 'winged') return null;
    return {
      id: f.id, head: lerp(f.origin, f.dest, f.headT), origin: { x: f.origin.x, y: f.origin.y },
      phase: f.phase, color: f.color, variant: f.variant, broken: f.broken,
    };
  }
  peekWake(): ReadonlyArray<{ zoneId: string; caches: number }> {
    return [...this.wake.entries()].map(([zoneId, caches]) => ({ zoneId, caches }));
  }
  peekPlanted(): ReadonlyArray<PlantedRoost> { return this.planted; }
  cyclePhase(): 'rest' | 'brooding' | 'winged' { return this.phase; }

  /** Drained bulletins (registered source below). */
  drainBulletins(): WorldBulletin[] {
    const out = this.bulletins;
    this.bulletins = [];
    return out;
  }

  // --- worldstate (the persistence pledge) -----------------------------------

  /** Pure JSON: the cycle, the brood ledger, the wing, the wake, the roosts. */
  snapshot(): unknown {
    return {
      phase: this.phase,
      restLeft: this.restLeft,
      clockLeft: this.clockLeft,
      nextBroodMul: this.nextBroodMul,
      broods: this.broods.map(b => ({ ...b })),
      flight: this.flight ? {
        id: this.flight.id,
        ox: this.flight.origin.x, oy: this.flight.origin.y,
        dx: this.flight.dest.x, dy: this.flight.dest.y,
        headT: this.flight.headT, phase: this.flight.phase,
        gorgeLeft: this.flight.gorgeLeft, segLen: this.flight.segLen,
        radius: this.flight.radius, streamCap: this.flight.streamCap,
        variant: this.flight.variant, color: this.flight.color,
        gorged: this.flight.gorged, alatesDown: this.flight.alatesDown,
        broken: this.flight.broken,
        passed: [...this.flight.passed], tried: [...this.flight.tried],
      } : null,
      wake: [...this.wake.entries()].map(([zoneId, caches]) => ({ zoneId, caches })),
      planted: this.planted.map(p => ({ ...p })),
      seq: this.seq,
    };
  }

  restore(snap: unknown): void {
    const s = snap as {
      phase?: unknown; restLeft?: unknown; clockLeft?: unknown; nextBroodMul?: unknown;
      broods?: unknown[]; flight?: Record<string, unknown> | null;
      wake?: unknown[]; planted?: unknown[]; seq?: unknown;
    } | null;
    if (!s || typeof s !== 'object') return;
    const num = (v: unknown): number | undefined =>
      typeof v === 'number' && Number.isFinite(v) ? v : undefined;
    if (typeof s.seq === 'number' && Number.isFinite(s.seq)) this.seq = Math.max(this.seq, Math.floor(s.seq));
    this.restLeft = Math.max(0, num(s.restLeft) ?? this.restLeft);
    this.clockLeft = Math.max(0, num(s.clockLeft) ?? 0);
    this.nextBroodMul = clamp(num(s.nextBroodMul) ?? 1, 0.1, 1);
    if (Array.isArray(s.broods)) {
      this.broods = [];
      for (const raw of s.broods) {
        const b = raw as Partial<Brood> | null;
        if (!b || typeof b.zoneId !== 'string') continue;
        const quota = Math.max(1, Math.floor(num(b.quota) ?? 1));
        this.broods.push({
          zoneId: b.zoneId, quota,
          broken: clamp(Math.floor(num(b.broken) ?? 0), 0, quota),
          growAcc: Math.max(0, num(b.growAcc) ?? 0),
          seen: !!b.seen,
        });
      }
    }
    if (Array.isArray(s.wake)) {
      this.wake.clear();
      for (const raw of s.wake) {
        const w = raw as { zoneId?: unknown; caches?: unknown } | null;
        const n = num(w?.caches);
        if (w && typeof w.zoneId === 'string' && n !== undefined && n > 0) this.wake.set(w.zoneId, Math.floor(n));
      }
    }
    if (Array.isArray(s.planted)) {
      this.planted = [];
      for (const raw of s.planted) {
        const p = raw as { id?: unknown; x?: unknown; y?: unknown } | null;
        const x = num(p?.x), y = num(p?.y);
        if (p && typeof p.id === 'string' && x !== undefined && y !== undefined) {
          this.planted.push({ id: p.id, x, y });
        }
      }
      // Every standing roost re-queues its warp — a resumed save re-roots.
      this.pendingWarps = [...this.planted];
    }
    const fl = s.flight;
    if (fl && typeof fl === 'object') {
      const ox = num(fl.ox), oy = num(fl.oy), dx = num(fl.dx), dy = num(fl.dy);
      const phase = fl.phase === 'out' || fl.phase === 'gorge' || fl.phase === 'home' ? fl.phase : null;
      if (ox !== undefined && oy !== undefined && dx !== undefined && dy !== undefined && phase && typeof fl.id === 'string') {
        this.flight = {
          id: fl.id,
          origin: { x: ox, y: oy }, dest: { x: dx, y: dy },
          headT: clamp(num(fl.headT) ?? 0, 0, 1), phase,
          gorgeLeft: Math.max(0, num(fl.gorgeLeft) ?? 0),
          segLen: Math.max(1, num(fl.segLen) ?? coordDist({ x: ox, y: oy }, { x: dx, y: dy })),
          radius: Math.max(8, num(fl.radius) ?? this.cfg.radius),
          streamCap: Math.max(2, Math.floor(num(fl.streamCap) ?? 6)),
          variant: typeof fl.variant === 'string' ? fl.variant : 'Swarming',
          color: typeof fl.color === 'string' ? fl.color : this.color(),
          gorged: Math.max(0, Math.floor(num(fl.gorged) ?? 0)),
          alatesDown: Math.max(0, Math.floor(num(fl.alatesDown) ?? 0)),
          broken: !!fl.broken,
          passed: Array.isArray(fl.passed) ? fl.passed.filter((z): z is string => typeof z === 'string') : [],
          tried: Array.isArray(fl.tried) ? fl.tried.filter((z): z is string => typeof z === 'string') : [],
        };
      }
    } else {
      this.flight = null;
    }
    this.phase = s.phase === 'brooding' || s.phase === 'winged' || s.phase === 'rest' ? s.phase : 'rest';
    // Heal impossible shapes tolerantly: a winged phase with no flight rests;
    // a brooding phase with no broods rests (fresh cycle rolls on its own).
    if (this.phase === 'winged' && !this.flight) this.phase = 'rest';
    if (this.phase === 'brooding' && !this.broods.length) this.phase = 'rest';
  }

  /** Culled ground sheds its claims (brood rows + wake caches); the wing and
   *  the planted roosts are COORDINATES and stand regardless. */
  pruneZones(has: (zoneId: string) => boolean): void {
    this.broods = this.broods.filter(b => has(b.zoneId));
    for (const zid of [...this.wake.keys()]) if (!has(zid)) this.wake.delete(zid);
    if (this.flight) this.flight.passed = this.flight.passed.filter(z => has(z));
    if (this.phase === 'brooding' && !this.broods.length) this.phase = 'rest';
  }

  // --- dev seams (the QA Event tab) -------------------------------------------

  /** DEV: seed a brood cycle AT the given (current) zone — it and its nearest
   *  eligible neighbours claim, quotas near-ripe, a short clock. (QA only.) */
  devIgnite(view: OverlayView, zoneId: string): boolean {
    if (this.phase !== 'rest') return false;
    const here = view.byId[zoneId];
    if (!here || !this.coverable(here)) return false;
    const near = view.nodes
      .filter(z => z.id !== zoneId && this.coverable(z) && coordDist(z.map, here.map) <= this.cfg.clusterRadius * 2)
      .sort((a, b2) => coordDist(a.map, here.map) - coordDist(b2.map, here.map))
      .slice(0, Math.max(0, this.cfg.broodZones - 1));
    this.broods = [here, ...near].map(z => ({
      zoneId: z.id, quota: Math.max(2, this.cfg.quotaCap - 1), broken: 0, growAcc: 0, seen: false,
    }));
    this.clockLeft = 45;
    this.phase = 'brooding';
    return true;
  }

  /** DEV: force the standing broods to wing NOW (or, resting, seed-then-wing
   *  from the player's zone). (QA only.) */
  devWing(view: OverlayView): boolean {
    if (this.phase === 'rest' && !this.devIgnite(view, view.currentZoneId)) return false;
    if (this.phase !== 'brooding') return false;
    this.takeWing(view, clamp(this.tally() / this.cfg.wingThreshold, 0.6, 1));
    return true;
  }

  // --- internals -------------------------------------------------------------

  private color(): string {
    return this.cfg.color ?? FACTION_COLORS[this.cfg.faction] ?? SEETHE_AMBER;
  }

  private standing(b: Brood): number { return Math.max(0, b.quota - b.broken); }

  private tally(): number {
    let t = 0;
    for (const b of this.broods) t += this.standing(b);
    return t;
  }

  /** May the wing cover / the brood claim this zone? The shared event floor
   *  plus the SKY: the swarm is weather with wings — nothing pours into
   *  sheltered ground (cellars, interiors; caves are already floored out). */
  private coverable(z: ZoneDef): boolean {
    return eventTargetable(this.id, z) && z.sky !== 'sheltered';
  }

  /** HIVE GROUND: a zone whose spawn table already fields the Seethe (data-
   *  driven — new chitin zones join by existing), or ground within reach of
   *  a PLANTED roost (the ecology compounds: what the wing sows, it reaps). */
  private hiveGround(z: ZoneDef): boolean {
    if (!this.coverable(z)) return false;
    if (z.packs?.table?.some(e => MONSTERS[e.id]?.faction === this.cfg.faction)) return true;
    return this.planted.some(p => coordDist(z.map, { x: p.x, y: p.y }) <= this.cfg.plant.radius * 1.4);
  }

  /** Seed a fresh cycle: find the DENSEST hive ground (most hive neighbours
   *  in cluster reach), claim it + its nearest kin. Needs the Seethe MET —
   *  at least one hive-ground zone charted — so the clock never ticks in
   *  country the player has no way to know exists. */
  private trySeedCycle(view: OverlayView): void {
    const g = this.gate();
    if (1 > scaledCap(this.cfg.maxConcurrent, g.concurrencyMul)) return; // one roost, one cycle (crank-liftable)
    const hive = view.nodes.filter(z => this.hiveGround(z));
    if (!hive.length || !hive.some(z => view.visited.has(z.id))) return;
    let origin = hive[0], best = -1;
    for (const z of hive) {
      const kin = hive.reduce((n, o) => n + (o !== z && coordDist(o.map, z.map) <= this.cfg.clusterRadius ? 1 : 0), 0);
      if (kin > best) { best = kin; origin = z; }
    }
    const claims = [origin, ...hive
      .filter(z => z !== origin && coordDist(z.map, origin.map) <= this.cfg.clusterRadius * 2)
      .sort((a, b) => coordDist(a.map, origin.map) - coordDist(b.map, origin.map))
      .slice(0, Math.max(0, this.cfg.broodZones - 1))];
    this.broods = claims.map(z => ({
      zoneId: z.id,
      quota: this.rng.int(this.cfg.quotaStart[0], this.cfg.quotaStart[1]),
      broken: 0, growAcc: 0, seen: false,
    }));
    this.clockLeft = Math.max(
      this.cfg.broodSecondsMin,
      this.rng.range(this.cfg.broodSeconds[0], this.cfg.broodSeconds[1]) * this.nextBroodMul);
    this.phase = 'brooding';
    this.bulletins.push({
      text: 'The deep sand hums — the Seethe broods, and its throats are climbing.',
      color: this.color(),
    });
  }

  /** The swarm takes wing from the standing-weighted heart of its broods,
   *  out to a far LANDWARD pole, at `strength` (stamping shrank it). */
  private takeWing(view: OverlayView, strength: number): void {
    const v = this.rng.weighted(this.cfg.variants);
    let ox = 0, oy = 0, w = 0;
    for (const b of this.broods) {
      const n = this.nodesById[b.zoneId];
      if (!n) continue;
      const s = Math.max(1, this.standing(b));
      ox += n.map.x * s; oy += n.map.y * s; w += s;
    }
    if (w <= 0) { this.disperse(false); return; }
    const origin = { x: ox / w, y: oy / w };
    let dest = { x: origin.x + this.rng.range(this.cfg.reach[0], this.cfg.reach[1]), y: origin.y };
    for (let tries = 0; tries < 8; tries++) {
      const ang = this.rng.range(0, Math.PI * 2);
      const reach = this.rng.range(this.cfg.reach[0], this.cfg.reach[1]);
      const cand = { x: origin.x + Math.cos(ang) * reach, y: origin.y + Math.sin(ang) * reach };
      if (view.terrain(cand) !== 'ocean') { dest = cand; break; }
    }
    this.flight = {
      id: `wing_${this.seq++}`,
      origin, dest,
      headT: 0, phase: 'out', gorgeLeft: 0,
      segLen: Math.max(1, coordDist(origin, dest)),
      radius: v.radius || this.cfg.radius,
      streamCap: Math.max(3, Math.round(v.streamCap * strength)),
      variant: v.name,
      color: v.color ?? this.color(),
      gorged: 0, alatesDown: 0, broken: false,
      passed: [], tried: [],
    };
    this.broods = []; // the throats emptied — they ARE the wing now
    this.phase = 'winged';
    this.bulletins.push({
      text: strength >= 1
        ? `The Swarming takes wing — a ${v.name} pours out of the brood grounds!`
        : `A thinned Swarming takes wing — the stamped broods could only raise a ${v.name}.`,
      color: this.flight.color,
    });
  }

  /** The wing came home (or never rose). An UNBROKEN flight completes the
   *  ecology: the wake keeps its caches, the far pole takes root (until the
   *  plant cap), and the roost's next cycle comes sooner. */
  private complete(view: OverlayView): void {
    const f = this.flight;
    if (f) {
      // THE WAKE: passed ground keeps royal-jelly caches (capped ledger).
      for (const zid of f.passed) {
        if (this.wake.size >= this.cfg.wakeZoneCap) break;
        if (!this.wake.has(zid)) {
          this.wake.set(zid, this.rng.int(this.cfg.cachesPerZone[0], this.cfg.cachesPerZone[1]));
        }
      }
      if (!f.broken) {
        if (this.planted.length < this.cfg.plant.maxPlanted) {
          const roost = { id: `${this.seq++}`, x: f.dest.x, y: f.dest.y };
          this.planted.push(roost);
          this.pendingWarps.push(roost);
          this.bulletins.push({
            text: 'The Swarming settles — a NEW brood ground takes root where the wing gorged.',
            color: f.color,
          });
        } else {
          this.bulletins.push({
            text: 'The Swarming returns gorged — the roost quickens, and the next cycle will come sooner.',
            color: f.color,
          });
        }
        this.nextBroodMul = Math.max(0.35, this.nextBroodMul * this.cfg.cycleAccel);
      }
      void view;
    }
    this.disperse(true);
  }

  private disperse(flew: boolean): void {
    this.flight = null;
    this.broods = [];
    this.clockLeft = 0;
    this.phase = 'rest';
    this.restLeft = this.rng.range(this.cfg.restSeconds[0], this.cfg.restSeconds[1]) * (flew ? 1 : 0.75);
  }
}

// --- map markers (registered on import — zero panels.ts edits) ----------------
//
// Brood grounds pin a THROAT-COUNT badge (fog:'always' — the clock is the
// point: the player is being TOLD where to go stamp). The airborne wing pins
// a racing swarm glyph at its head; wake zones keep a jelly drop while caches
// stand (fog:'charted' — no fog reveals, you find the wake by walking it).
registerMarkerSource((world: World): MapMarker[] => {
  const sf = world.sim.swarmingField;
  if (!sf) return [];
  const out: MapMarker[] = [];
  for (const b of sf.peekBroods()) {
    const node = world.zoneMap[b.zoneId];
    if (!node) continue;
    out.push({
      id: `swarm-brood-${b.zoneId}`, zoneId: b.zoneId, coord: { x: node.map.x, y: node.map.y },
      glyph: '🐝', fill: '#241708', stroke: '#d89a3a', text: '#ffd890', r: 9,
      title: `The Seethe broods — ${b.standing} hive throat${b.standing === 1 ? '' : 's'} stand (stamp them before the wing)`,
      fog: 'always', z: 16,
    });
  }
  const f = sf.peekFlight();
  if (f) {
    out.push({
      id: `swarm-wing-${f.id}`, coord: { x: f.head.x, y: f.head.y },
      glyph: '🐝', fill: '#241708', stroke: f.color, text: '#ffd890', r: 10,
      title: f.broken
        ? 'The broken Swarming flees for its roost'
        : `The Swarming — a ${f.variant} is in the air`,
      fog: 'always', z: 18,
    });
  }
  for (const w of sf.peekWake()) {
    const node = world.zoneMap[w.zoneId];
    if (!node) continue;
    out.push({
      id: `swarm-wake-${w.zoneId}`, zoneId: w.zoneId, coord: { x: node.map.x, y: node.map.y },
      glyph: '🍯', fill: '#241708', stroke: '#f0c060', text: '#ffe8b0', r: 8,
      title: `Royal jelly settles in the swarm's wake — ${w.caches} cache${w.caches === 1 ? '' : 's'}`,
      fog: 'charted', z: 12,
    });
  }
  return out;
});

// --- zone-info rows (registered on import) ------------------------------------
registerZoneInfoSource((world: World, zoneId: string): ZoneInfoEntry[] => {
  const sf = world.sim.swarmingField;
  if (!sf) return [];
  const out: ZoneInfoEntry[] = [];
  const brood = sf.broodOn(zoneId);
  if (brood) {
    out.push({
      kind: 'event', icon: '🐝', color: brood.color, label: 'The Swarming · brooding',
      detail: `${brood.standing} hive throat${brood.standing === 1 ? '' : 's'} stand here — ${brood.tally}/${brood.threshold} and the swarm takes wing`,
      z: 15,
    });
  }
  const wing = sf.swarmOn(zoneId);
  if (wing) {
    out.push({
      kind: 'event', icon: '🐝', color: wing.color, label: `The Swarming · ${wing.variant}`,
      detail: zoneId === world.zone.id
        ? 'the sky crawls — the wing pours through this ground'
        : 'the wing passes over this ground',
      z: 16,
    });
  }
  const caches = sf.cachesIn(zoneId);
  if (caches > 0) {
    out.push({
      kind: 'event', icon: '🍯', color: '#f0c060', label: 'Royal jelly',
      detail: `${caches} cache${caches === 1 ? '' : 's'} lie in the swarm's wake`,
      z: 11,
    });
  }
  return out;
});

// --- bulletins (registered on import) ------------------------------------------
registerBulletinSource((world: World): WorldBulletin[] =>
  world.sim.swarmingField?.drainBulletins() ?? []);
