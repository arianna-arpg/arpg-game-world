// ---------------------------------------------------------------------------
// WORLD OVERLAY — the shared abstraction the world-simulation is built on.
//
// A WorldOverlay is one evolving FIELD painted over the zone-node graph (the
// same x/y space the World Map draws zones in). Weather and faction territory
// are two instances; a third (plague, famine, a roaming caravan) would drop in
// the same way. Each overlay can (a) advance its own simulation every tick,
// (b) bend how the zone you walk into spawns its monsters, and (c) draw itself
// onto the minimap. Overlays are PURE of the engine — they never import World,
// so there is no cycle and they stay trivially testable.
// ---------------------------------------------------------------------------

import { MONSTERS } from '../data/monsters';
import type { PackTableEntry, ZoneDef } from '../data/zones';
import type { PackageGate } from '../packages/types';

/** Read-only snapshot of the world handed to overlays each tick. */
export interface OverlayView {
  /** The zone nodes of THIS VIEW'S DIMENSION (surface by default; an overlay
   *  declaring `dimension` receives a view re-scoped to its own graph). An
   *  event is TIED to its dimension — it can neither see nor touch another's. */
  nodes: ZoneDef[];
  /** The same map, for neighbour lookups across exits. A cross-dimension edge
   *  (the hellgate's back road) resolves to undefined here — the border is
   *  real: no contagion, warband, or front follows the player through it. */
  byId: Record<string, ZoneDef>;
  /** EVERY zone node across all dimensions — the sim's re-scoping source.
   *  Overlays should not read this directly; declare `dimension` instead. */
  allNodes: ZoneDef[];
  /** WORLD-MAP TERRAIN at a node-space coordinate — the map's collision layer.
   *  A land-bound travelling field (a tide, a marching host, a spreading
   *  bloom) treats 'ocean' as a wall; a mover whose data says it sails may
   *  ignore it. Non-surface dimensions have no sea (always 'land'). */
  terrain: (c: { x: number; y: number }) => 'land' | 'ocean' | 'bridge';
  /** Where the player currently stands. */
  currentZoneId: string;
  /** World clock in seconds (drives the day/night phase). */
  time: number;
  /** Live ENEMY headcount in the current zone, keyed by faction id. */
  census: Readonly<Record<string, number>>;
  /** Current character level — drives each package's start-level gate. */
  charLevel: number;
  /** Resolved content-package gates this tick (id → active/share/pressure). */
  gates: ReadonlyMap<string, PackageGate>;
  /** Zone ids the player has actually CHARTED — the visible map. Distinct from
   *  `nodes` (every authored + minted zone in the graph, visited or not), so an
   *  overlay can choose to act only within what the player can see. */
  visited: ReadonlySet<string>;
}

/**
 * How a field bends one zone's spawning. Reweighting is keyed by FACTION
 * (resolved against MONSTERS[id].faction) so an overlay can only amplify or
 * damp monsters that already belong in the zone — never conjure the undead
 * into a sunlit grove. Whole new rosters arrive only through injectFactions,
 * which the faction overlay uses to stage a contest.
 */
export interface SpawnBias {
  /** Multiplier on how many packs seed (1 = unchanged). */
  countMul: number;
  /** Per-faction weight multiplier applied to matching table entries. */
  factionMul: Record<string, number>;
  /** Faction ids whose full rosters should be forced in (contested nodes). */
  injectFactions: string[];
}

export const NO_BIAS: SpawnBias = { countMul: 1, factionMul: {}, injectFactions: [] };

/** SVG fragments for the minimap, split so each layer sits at the right depth. */
export interface MapLayer {
  /** Drawn beneath the roads and zone nodes (territory washes, weather cells). */
  under: string;
  /** Drawn above the nodes (badges, contest markers). */
  over: string;
}

/** One simulation field over the node graph. The id is an open string so a
 *  net-new content package can append its own overlay (e.g. 'breach'). */
export interface WorldOverlay {
  readonly id: string;
  /** THE PERSISTENCE PLEDGE (required — every field answers the relaunch
   *  question out loud, never by omission):
   *    'durable'   — this field's cross-zone state is part of the wakeful
   *                  world; it MUST implement snapshot() AND restore(), and a
   *                  relaunch resumes it mid-arc.
   *    'transient' — this field deliberately restarts on resume (a drifting
   *                  front, a marching band — weather-like motion whose loss
   *                  is the design); it implements NEITHER hook.
   *  The event QA harness asserts the pledge matches the implementation, so
   *  a durable field can never silently lose its hooks (or vice versa). */
  readonly persistence: 'durable' | 'transient';
  /** Human label for the map's layer-toggle chips (default: the id). */
  readonly mapLabel?: string;
  /** The DIMENSION this field lives in (default 'surface'). The sim hands the
   *  overlay a view scoped to that dimension's graph and skips its spawn bias
   *  and map layers everywhere else — one declaration ties an event to hell,
   *  the surface, or any future plane. */
  readonly dimension?: string;
  /** Advance the field. Lifecycle work runs on a fixed internal step. */
  update(dt: number, view: OverlayView): void;
  /** Seed a freshly-charted (generated) zone node. */
  onNodeCharted(zone: ZoneDef, view: OverlayView): void;
  /** This field's contribution to the zone's spawn table. */
  affectSpawns(zone: ZoneDef, view: OverlayView): SpawnBias;
  /** This field's EVENT-ACTIVITY term at a zone — the severity-weighted "is
   *  something happening here" the Mycelia bloom feeds on (WorldSim.activityAt
   *  sums every overlay). Omit it (or return 0) for fields that shouldn't
   *  stir the bloom; each overlay owns its own weight. */
  activityAt?(zid: string): number;
  /** Paint the field onto the minimap. */
  renderMap(nodes: ZoneDef[]): MapLayer;
  /** MAP-FIT EXTENT (optional): coordinates the fitted world-map view should
   *  additionally enclose — for a field whose painted state lives BEYOND the
   *  charted nodes (Deepwinter's territory marching in from past the rim).
   *  The map folds these into its bounds exactly like node coords, and the
   *  layer's toggle chip silences the stretch along with the paint. Omit it
   *  for node-anchored fields (their paint is inside the fit by construction). */
  mapExtent?(): ReadonlyArray<{ x: number; y: number }>;
  /** WORLDSTATE PERSISTENCE (required for `persistence: 'durable'` fields) —
   *  the seam a saved run resumes its living world through (meta/worldstate.ts
   *  rides these in the character save). `snapshot` returns this field's
   *  durable state as PURE JSON (no class instances, no functions, no Maps —
   *  it must survive JSON.stringify/parse byte-identically); `restore`
   *  rebuilds from a prior snapshot, TOLERANTLY — the value arrives `unknown`
   *  because it may be from an older build; validate shape, drop what no
   *  longer resolves, and never throw (a bad snapshot just means this field
   *  starts fresh). A 'transient' overlay implements NEITHER and simply
   *  restarts on resume; the sim re-seeds un-restored overlays over the
   *  restored graph via onNodeCharted, so every field always knows the nodes.
   *  THE ZONE-CLAIM CONVENTION for zone-minting overlays: an overlay whose
   *  events MINT zones (eventOwned defs — demon epicenters, crusade holds,
   *  incursion landings) must include `ownedZones: string[]` at the TOP LEVEL
   *  of its snapshot, naming every event zone its current state owns. The
   *  save path reads that field generically on BOTH sides (write: an owned
   *  zone rides into the save; resume: it survives the transience scrub) —
   *  one convention, no per-overlay engine code. Un-claimed eventOwned zones
   *  are SCRUBBED on resume and the event re-rolls fresh (the same transience
   *  rule completedObjectives always encoded). */
  snapshot?(): unknown;
  restore?(snap: unknown): void;
  /** POST-RESUME SCRUB (optional; durable fields holding zone-keyed state
   *  should implement it) — called once after a resumed graph is adopted,
   *  with a membership test for the healed graph. Drop state rows whose zone
   *  was culled by the sanitizer so a ghost entry can never hold a
   *  concurrency slot, feed activityAt, or pin a marker to a void. */
  pruneZones?(has: (zoneId: string) => boolean): void;
}

/** Scan a saved per-overlay snapshot bag for THE ZONE-CLAIM CONVENTION
 *  (`ownedZones: string[]` at a snapshot's top level) and fold every claim
 *  into one set. PURE and tolerant — runs BEFORE any overlay restores (the
 *  sanitizer needs claims first, and a failed adopt must leave overlays
 *  untouched), so it reads the raw bag, never live overlay state. */
export function claimedZonesFromBag(bag: Record<string, unknown> | undefined | null): Set<string> {
  const out = new Set<string>();
  if (!bag || typeof bag !== 'object') return out;
  for (const snap of Object.values(bag)) {
    const owned = (snap as { ownedZones?: unknown } | null | undefined)?.ownedZones;
    if (!Array.isArray(owned)) continue;
    for (const id of owned) if (typeof id === 'string' && id) out.add(id);
  }
  return out;
}

/** Fold several biases into one: counts multiply, faction muls multiply,
 *  injected factions union. Never mutates its inputs. */
export function composeBias(parts: SpawnBias[]): SpawnBias {
  const out: SpawnBias = { countMul: 1, factionMul: {}, injectFactions: [] };
  for (const p of parts) {
    out.countMul *= p.countMul;
    for (const [f, m] of Object.entries(p.factionMul)) {
      out.factionMul[f] = (out.factionMul[f] ?? 1) * m;
    }
    for (const f of p.injectFactions) {
      if (!out.injectFactions.includes(f)) out.injectFactions.push(f);
    }
  }
  return out;
}

/**
 * Fold a bias into a base pack table, producing a NEW table. Entries are
 * reweighted by their monster's faction; a guaranteed non-empty result keeps
 * the engine's weightedPick from ever dividing by zero.
 */
export function biasTable(base: PackTableEntry[], bias: SpawnBias): PackTableEntry[] {
  const out: PackTableEntry[] = [];
  for (const e of base) {
    const fac = MONSTERS[e.id]?.faction;
    const mul = fac ? (bias.factionMul[fac] ?? 1) : 1;
    const w = Math.max(0, e.weight * mul);
    // Spread, don't rebuild: the entry's presence envelope (and any future
    // per-row fields) must survive the reweigh — weightedPick folds it later.
    if (w > 0) out.push({ ...e, weight: w });
  }
  // Degenerate guard: if every row zeroed out, fall back to the base weights.
  if (out.length === 0) for (const e of base) out.push({ ...e });
  return out;
}
