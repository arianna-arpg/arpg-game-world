// ---------------------------------------------------------------------------
// FRACTURE FIELD — a player-driven CHASE/TIMER pressure module (pure overlay).
//
// One Fracture at a time. A volatile FRACTURE sits in a charted zone; RUN OVER it
// (not a dwell — it's twitchy, you can trip it by accident) and a FISSURE crawls
// erratically across the zone, advancing ONLY while you stay near its head (PoE
// Abyss). A nested TIMER governs the run:
//   • while you chase the head the timer PAUSES (and the crack spews a trickle
//     of faction foes to fight);
//   • when the head reaches its endpoint a CHASM tears open — an untargetable
//     pseudo-spawner that LOOKS like a chasm, vomiting a burst of foes — and now
//     the timer TICKS;
//   • clear the chasm before it runs out → the timer REFRESHES and a NEW fissure
//     splits onward (a few chasms per zone, a small reward each);
//   • clear the LAST chasm in time → the fracture DIVERTS to a random adjacent
//     ZONE (a refreshed, longer timer there). Let the timer hit zero and the
//     fracture collapses. 2-4 zones total — all of it data on the surge below.
//
// This overlay is the fracture's cross-zone REMEMBRANCE: it carries which zone
// the fracture sits in, how many diverts remain, and the faction/variant/color.
// The in-zone runtime (the fissure head, the chasm spawner, the nested timer) is
// engine work the World drives off these accessors — the overlay never touches
// World. Pure, like every other field. The Abyssal faction is fracture-only
// (contexts:['fractures']); the Elemental 'Leyline' variant reuses its roster.
// ---------------------------------------------------------------------------

import { clamp } from '../../core/math';
import { Rng } from '../../core/rng';
import type { ArenaSpec } from '../../data/arenas';
import { FACTIONS } from '../../data/monsters';
import type { World } from '../../engine/world';
import { registerMarkerSource, type MapMarker } from '../../world/mapMarkers';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { eventAllowed } from '../../world/zonePolicy';
import { FACTION_COLORS } from '../../world/palette';
import type { OverlayBuildCtx, PackageGate } from '../types';

const STEP = 0.5;
const FRACTURE_VIOLET = '#8a4ae0';
const TRAVEL_SECS = 4;     // seconds the (purely-visual) fracture marker glides to its next zone

/** A variant's CAPSTONE reward realm — the off-graph boss chamber the rift opens
 *  into. Pure data: a new faction's capstone is one of these + a boss def + a
 *  tileset, ZERO engine change. */
export interface FractureCapstone {
  /** Boss monster id spawned in the chamber (Crowned, tagged for the kill hook). */
  boss: string;
  /** Tileset the off-graph chamber is minted from (its theme + layout). */
  tileset: string;
  /** Boss + guard level = the rift zone's level + this. */
  levelBonus: number;
  /** Reward multiplier on the boss kill (realm-scale spoils). */
  rewardMul: number;
  /** Optional arena build sheet (data/arenas.ts) — forced recipe, fixed name,
   *  pack density, ward seals — the same distinctness lever every realm has. */
  arena?: ArenaSpec;
}

/** One flavour a Fracture can roll (faction whose roster the chasm spews). */
export interface FractureVariant {
  /** Cosmetic id ('abyssal', 'leyline') — also the in-zone announce flavour. */
  variant: string;
  /** Faction whose roster spawns from the fissure + chasm. */
  faction: string;
  weight: number;
  /** The reward rift this variant opens (omit = no capstone for this variant). */
  capstone?: FractureCapstone;
}

/** The Fracture config — the entire chase/timer loop as tunable data. */
export interface FractureSurge {
  /** Per-step base chance (×pressure) a Fracture appears when none is active. */
  triggerChance: number;
  /** The flavours it can roll (Abyssal, elemental Leyline). */
  variants: FractureVariant[];
  /** Total zones a fracture can run across (origin + diverts), [min,max]. */
  zoneSpan: [number, number];
  /** Chasms to clear per zone before it diverts onward, [min,max]. */
  chasmsPerZone: [number, number];
  /** Base nested timer (s) — the fissure procs → you have this long. */
  baseTimer: number;
  /** A DIVERTED zone refreshes to this (longer, more forgiving) timer. */
  divertTimer: number;
  /** Fissure crawl speed (px/s) while the player chases its head. */
  fissureSpeed: number;
  /** Player must be within this radius of the head to advance it (the chase). */
  chaseRadius: number;
  /** Light trickle of crawl-out foes near the moving head, [lo,hi] seconds. */
  fissureSpawnInterval: [number, number];
  /** The chasm pseudo-spawner: geometry, cadence, and how many to clear. */
  chasm: {
    radius: number;
    spawnInterval: [number, number];
    spawnBatch: [number, number];
    /** Foes to slay to seal a chasm (base; +clearPerLevel × zone level). */
    clearKills: number;
    clearPerLevel: number;
  };
  /** Base XP for sealing a chasm (the final / divert seal multiplies this). */
  chasmRewardXp: number;
  /** XP per zone level on a chasm seal (chasmRewardXp + level × this). */
  chasmXpPerLevel: number;
  /** The divert-seal premium multiplying the chasm reward (the doc's
   *  "final/divert seal multiplies it" — now truly data). */
  divertRewardMul: number;
  /** The full run-through payout (no hops left): the big bounty. */
  sealReward: { xpBase: number; xpPerLevel: number; gems: number };
  /** Seconds an UNengaged fracture lingers before it recycles (so an abandoned
   *  one never blocks all future fractures). Reset while a run is live. */
  idleLife: number;
  /** The CAPSTONE rift gate — STACKED RNG (PoE-Abyss style): only a fracture that
   *  runs its full span to completion AND reached at least `minSpan` zones gets a
   *  `portalChance` (×pressure) to tear open its variant's reward rift. Default
   *  minSpan = the zoneSpan MAXIMUM, so only the longest chains can spawn a rift. */
  capstone: { minSpan: number; portalChance: number };
}

/** What the engine reads to materialize the dormant fracture in a zone. */
export interface FractureInfo {
  id: string;
  faction: string;
  color: string;
  variant: string;
  /** This zone is a DIVERTED instance → the engine grants the longer timer. */
  longerTimer: boolean;
  /** Total zones this fracture spans (rolled at ignite) — the capstone gate reads
   *  it to know if the chain reached the length that can open a reward rift. */
  span: number;
}

/** A PENDING capstone rift — persists on the overlay (independent of the active
 *  fracture, which has ended by the time a rift opens) so it survives the player
 *  leaving + re-entering the zone, and is re-materialized until the boss is slain
 *  (mirrors the crusade sanctum's persistence). */
export interface RiftInfo {
  /** The zone the rift opened in. */
  zoneId: string;
  /** Unique id (the completed fracture's id) → keys the off-graph chamber. */
  id: string;
  /** Where in the zone the portal sits (stable across re-materialization). */
  pos: { x: number; y: number };
  faction: string;
  color: string;
  variant: string;
  /** The overworld zone level when it opened (the chamber out-levels it). */
  level: number;
  cap: FractureCapstone;
}

interface ActiveFracture {
  id: string;
  faction: string;
  color: string;
  variant: string;
  /** Where the fracture currently sits (origin, or a zone it diverted to). */
  zoneId: string;
  /** Diverts remaining (0 = the final zone — it collapses when cleared). */
  hopsRemaining: number;
  /** A diverted (longer-timer) instance? (Origin = false.) */
  diverted: boolean;
  /** Seconds since anything last engaged it (reset by touch()). */
  idle: number;
  /** Total zones this fracture spans (origin + diverts), rolled at ignite. */
  span: number;
  /** PURELY-VISUAL transit: while set, the fracture is NOT active in any zone — its
   *  map marker glides from the sealed zone toward the zone it next surfaces in (the
   *  earth tearing onward). On arrival it becomes the active (diverted) fracture in
   *  `toZoneId`. The engine never materializes a travelling fracture (fractureIn = null). */
  travel: { from: { x: number; y: number }; to: { x: number; y: number }; toZoneId: string; t: number } | null;
}

export class FractureField implements WorldOverlay {
  readonly id = 'fractures';

  private rng: Rng;
  private readonly gate: () => PackageGate;
  private readonly cfg: FractureSurge;
  private fracture: ActiveFracture | null = null;
  private rift: RiftInfo | null = null;
  private acc = 0;
  private seq = 0;

  constructor(ctx: OverlayBuildCtx, surge: FractureSurge) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
    this.cfg = surge;
  }

  update(dt: number, view: OverlayView): void {
    // PURELY-VISUAL transit: a diverted fracture's marker glides toward its next zone
    // before surfacing there (it doesn't trigger anything en route). On arrival it
    // becomes the active diverted fracture in that zone.
    if (this.fracture?.travel) {
      this.fracture.idle = 0; // in transit counts as engaged — never recycle mid-flight
      this.fracture.travel.t += dt / TRAVEL_SECS;
      if (this.fracture.travel.t >= 1) {
        this.fracture.zoneId = this.fracture.travel.toZoneId;
        this.fracture.diverted = true;
        this.fracture.travel = null;
      }
    } else if (this.fracture) {
      // An UNengaged fracture ages out so it can't block the one-at-a-time slot
      // forever (the engine touch()es it every frame a run is live, zeroing idle).
      this.fracture.idle += dt;
      if (this.fracture.idle >= this.cfg.idleLife) this.fracture = null;
    }
    this.acc += dt;
    const g = this.gate();
    while (this.acc >= STEP) { this.acc -= STEP; if (g.active && !this.fracture) this.maybeIgnite(view); }
  }

  onNodeCharted(): void { /* fractures target a charted node + the player's exits */ }
  affectSpawns(): SpawnBias { return NO_BIAS; } // foes are materialized, not biased
  renderMap(): MapLayer { return { under: '', over: '' }; } // the marker source draws it

  // --- accessors the engine reads --------------------------------------------

  surge(): FractureSurge { return this.cfg; }

  /** Event-activity fed to the bloom (WorldOverlay.activityAt): an open fracture. */
  activityAt(zoneId: string): number { return this.fractureIn(zoneId) ? 1 : 0; }

  /** The fracture info IF one currently sits in this zone — the engine spawns the
   *  dormant fracture object from this. */
  fractureIn(zoneId: string): FractureInfo | null {
    const f = this.fracture;
    if (!f || f.travel || f.zoneId !== zoneId) return null; // in transit ⇒ not active anywhere
    return { id: f.id, faction: f.faction, color: f.color, variant: f.variant, longerTimer: f.diverted, span: f.span };
  }

  /** Keep an actively-chased fracture from idling out (engine calls each frame). */
  touch(): void { if (this.fracture) this.fracture.idle = 0; }

  /** Can the fracture still tear onward to another zone? (Else the run ends.) */
  canDivert(): boolean { return !!this.fracture && this.fracture.hopsRemaining > 0; }

  /** The last chasm of this zone was sealed in time → tear the fracture toward an
   *  adjacent zone, spending a hop. The marker first TRAVELS there (purely visual,
   *  from `from` → `to` node coords); on arrival it surfaces as the diverted fracture. */
  divert(toZoneId: string, from: { x: number; y: number }, to: { x: number; y: number }): void {
    const f = this.fracture;
    if (!f) return;
    f.hopsRemaining = Math.max(0, f.hopsRemaining - 1);
    f.idle = 0;
    f.travel = { from: { x: from.x, y: from.y }, to: { x: to.x, y: to.y }, toZoneId, t: 0 };
  }

  /** End the fracture — collapsed (timer ran out) or run through to the end. */
  endFracture(): void { this.fracture = null; }

  // --- capstone rift (persists until its boss is slain) ----------------------

  /** Record a PENDING reward rift (the latest max-span completion wins — an
   *  uncollected older rift is replaced, so a snoozed rift never starves future
   *  ones). The engine re-materializes its portal each time you enter `zoneId`. */
  openRift(info: RiftInfo): void { this.rift = info; }

  /** The pending rift IF one is waiting in this zone (engine re-materializes it). */
  riftIn(zoneId: string): RiftInfo | null {
    return this.rift && this.rift.zoneId === zoneId ? this.rift : null;
  }

  /** Read the pending rift (for the marker / the one-at-a-time guard). */
  peekRift(): RiftInfo | null { return this.rift; }

  /** The rift's boss was slain (or it's otherwise spent) — clear it. */
  consumeRift(): void { this.rift = null; }

  /** Read-only snapshot for the marker / tests. `travelPos` is the live gliding
   *  coordinate while in transit (else null — draw it at its zone node). */
  peek(): {
    id: string; faction: string; color: string; variant: string;
    zoneId: string; hopsRemaining: number; diverted: boolean; span: number;
    travelPos: { x: number; y: number } | null;
  } | null {
    const f = this.fracture;
    if (!f) return null;
    let travelPos: { x: number; y: number } | null = null;
    if (f.travel) {
      const t = clamp(f.travel.t, 0, 1);
      travelPos = { x: f.travel.from.x + (f.travel.to.x - f.travel.from.x) * t, y: f.travel.from.y + (f.travel.to.y - f.travel.from.y) * t };
    }
    return {
      id: f.id, faction: f.faction, color: f.color, variant: f.variant,
      zoneId: f.zoneId, hopsRemaining: f.hopsRemaining, diverted: f.diverted, span: f.span, travelPos,
    };
  }

  // --- internals -------------------------------------------------------------

  /** DEV: force a fracture into the given (current) zone, in-place; refuses while
   *  one is already active (one-at-a-time, matches production). The engine
   *  materializes it next frame. (QA only.) */
  devIgnite(view: OverlayView, zoneId: string): boolean {
    if (this.fracture) return false; // one-at-a-time (matches production; no orphan)
    const spot = view.byId[zoneId];
    if (!spot || spot.caveDepth != null || spot.floating || spot.eventOwned || spot.objective.kind === 'safe') return false;
    const v = this.pickVariant();
    if (!v) return false;
    const total = this.cfg.zoneSpan[1];
    this.fracture = {
      id: `fracture_${this.seq++}`, faction: v.faction, color: FACTION_COLORS[v.faction] ?? FRACTURE_VIOLET,
      variant: v.variant, zoneId, hopsRemaining: Math.max(0, total - 1), diverted: false, idle: 0, span: total, travel: null,
    };
    return true;
  }

  private maybeIgnite(view: OverlayView): void {
    if (!this.rng.chance(clamp(this.cfg.triggerChance * this.gate().ignitionMul, 0, 1))) return;
    // A fracture opens in a CHARTED (visited), non-safe, non-cave, non-floating
    // node — ground you can return to (the map marker pulls you back to it).
    const spots = view.nodes.filter(n =>
      view.visited.has(n.id) && n.caveDepth == null && !n.floating && !n.eventOwned && n.objective.kind !== 'safe'
      && eventAllowed('fractures', n));
    if (!spots.length) return;
    const v = this.pickVariant();
    if (!v) return;
    const spot = spots[this.rng.int(0, spots.length - 1)];
    const color = FACTION_COLORS[v.faction] ?? FRACTURE_VIOLET;
    const total = this.rng.int(this.cfg.zoneSpan[0], this.cfg.zoneSpan[1]);
    this.fracture = {
      id: `fracture_${this.seq++}`,
      faction: v.faction, color, variant: v.variant,
      zoneId: spot.id, hopsRemaining: Math.max(0, total - 1), diverted: false, idle: 0,
      span: total, travel: null,
    };
  }

  private pickVariant(): FractureVariant | null {
    const pool = this.cfg.variants.filter(v => FACTIONS[v.faction]);
    if (!pool.length) return null;
    let total = 0;
    for (const v of pool) total += v.weight;
    let r = this.rng.next() * total;
    for (const v of pool) { r -= v.weight; if (r <= 0) return v; }
    return pool[pool.length - 1];
  }
}

// --- map marker (registered on import — zero panels.ts edits) -----------------
//
// The active fracture pins to the world map (fog:'always', so it pulls the player
// to it and FOLLOWS it as it diverts zone to zone — the world impact the player
// feels). A hole-in-the-earth glyph, ringed in the variant's faction colour.
registerMarkerSource((world: World): MapMarker[] => {
  const ff = world.sim.fractureField;
  if (!ff) return [];
  const out: MapMarker[] = [];
  const f = ff.peek();
  if (f && f.travelPos) {
    // IN TRANSIT: the marker glides between zones (no zone anchor — a free coord), so
    // the player watches the earth tear onward toward where it will next surface.
    out.push({
      id: `fracture-${f.id}`, coord: { x: f.travelPos.x, y: f.travelPos.y },
      glyph: '🕳', fill: '#140a22', stroke: f.color, text: f.color, r: 9,
      title: 'The fracture tears across the land — toward where it will surface next…',
      fog: 'always', z: 18,
    });
  } else if (f) {
    const node = world.zoneMap[f.zoneId];
    if (node) out.push({
      id: `fracture-${f.id}`, zoneId: f.zoneId, coord: { x: node.map.x, y: node.map.y },
      glyph: '🕳', fill: '#140a22', stroke: f.color, text: f.color, r: 10,
      title: f.diverted
        ? 'The fracture tears onward here — run it down!'
        : 'A volatile fracture splits the earth here', fog: 'always', z: 18,
    });
  }
  // A PENDING capstone rift pins to its zone (fog:'always') so the player can
  // return to claim it — it persists until its champion is slain.
  const r = ff.peekRift();
  if (r) {
    const node = world.zoneMap[r.zoneId];
    if (node) out.push({
      id: `fracture-rift-${r.id}`, zoneId: r.zoneId, coord: { x: node.map.x, y: node.map.y },
      glyph: '✷', fill: '#0a0410', stroke: r.color, text: r.color, r: 11,
      title: `A ${r.variant} RIFT awaits — a champion stirs within`, fog: 'always', z: 19,
    });
  }
  return out;
});
