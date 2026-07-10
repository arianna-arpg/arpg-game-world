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
