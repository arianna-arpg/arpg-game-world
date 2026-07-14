// ---------------------------------------------------------------------------
// World generation — growing the zone graph at its frontiers.
//
// When the player steps onto an uncharted portal (an exit with to: '?'),
// this module mints a whole new ZoneDef from the portal's tileset: a rolled
// name, a deeper level, a rolled size and objective, a layout seed (so the
// place keeps its shape on revisits), a portal back the way you came, and
// one or two fresh frontiers of its own. The world never runs out of edge.
// ---------------------------------------------------------------------------

import { clamp } from '../core/math';
import { Rng, rollSeed } from '../core/rng';
import { WAR_PAIRS } from '../data/monsters';
import { TILESETS, pickTilesetForBiome, type TilesetDef } from '../data/tilesets';
import { hasLayout } from './levelgen';
import { START_ZONE, HUB_ZONE } from '../data/zones';
import type { ObjectiveSpec, ZoneDef, ZoneExitDef } from '../data/zones';
import { DIRS, OPP_DIR, projectCoord, coordDist } from '../world/coords';
import type { Dir, MapCoord } from '../world/coords';
import { BIOMES, BIOME_FIELD_CFG, MARINE_MINT, OCEAN_BIOME, biomeSpacing } from '../world/biomes';
import { dimensionDef, dimensionsEnteredBy } from '../world/dimensions';
import type { CourseMintHints } from '../world/courses';

// The node-space coordinate vocabulary (Dir, MapCoord, MAP_DIR, projectCoord) now
// lives in world/coords — a pure leaf shared with the world overlays. Re-exported
// here so existing importers (quests, bounties, world events) keep getting it
// from worldgen unchanged.
export { projectCoord };
export type { Dir, MapCoord };

/** THE STARTER WEB — the only hand-placed geography left is the town and its
 *  hub, and even their arrangement is rolled per run: the Crossroads lands one
 *  cardinal step from Lastlight in a seeded-random direction (east this run,
 *  north the next), the town's single road re-aims at it, and the hub re-deals
 *  its back-edge plus three '?' frontiers across the remaining sides. From
 *  there the NORMAL mint pipeline (heat-map biomes, the radial level field,
 *  the eager web) grows the whole world — each run a genuinely new map.
 *
 *  Mutates only the RUN's zoneMap clones, and only with FRESH exit arrays and
 *  a fresh hub map coord — cloneZones() shallow-copies defs, so pushing into
 *  (or mutating members of) a shared array would leak into the static ZONES
 *  across runs (the known cloneZones by-reference trap). Deterministic per
 *  run seed: resume re-rolls the identical arrangement. */
export function randomizeStarterWeb(zoneMap: Record<string, ZoneDef>, seed: number): void {
  const town = zoneMap[START_ZONE];
  const hub = zoneMap[HUB_ZONE];
  if (!town || !hub) return;
  const rng = new Rng((seed ^ 0x57a2) >>> 0);
  const dir = rng.pick(DIRS);
  // Keep the authored frontier tileset FLAVORS (fallbacks — the live mint's
  // heat-map biome outranks them), re-dealt onto the rolled sides.
  const flavors = hub.exits.filter(e => e.to === '?' && e.tileset).map(e => e.tileset!);
  // PRESERVE exits this function doesn't own: only the town↔hub road and the
  // hub's '?' frontiers are re-dealt. A future authored neighbour or a
  // town-feature exit (the townBuild pattern grows the town) rides through
  // untouched instead of being silently dropped into a dangling back-edge.
  const townKeep = town.exits.filter(e => e.to !== HUB_ZONE && e.to !== '?');
  const hubKeep = hub.exits.filter(e => e.to !== START_ZONE && e.to !== '?');
  hub.map = projectCoord(town.map, dir);
  town.exits = [{ to: HUB_ZONE, side: dir }, ...townKeep];
  const rest = DIRS.filter(d => d !== OPP_DIR[dir]);
  hub.exits = [
    { to: START_ZONE, side: OPP_DIR[dir] },
    ...rest.map((d, i): ZoneExitDef => ({
      to: '?', side: d,
      ...(flavors.length ? { tileset: flavors[i % flavors.length] } : {}),
    })),
    ...hubKeep,
  ];
}

/** The charted node nearest a coordinate (skips off-graph caves). Used to anchor
 *  a directed placement onto real explored ground — incl. the already-explored
 *  case, where the nearest node in that direction becomes the back-edge anchor. */
export function nearestNode(
  zoneMap: Record<string, ZoneDef>, c: MapCoord, exclude?: Set<string>,
  dimension?: string, accept?: (z: ZoneDef) => boolean,
): ZoneDef | null {
  let best: ZoneDef | null = null, bestD = Infinity;
  const dim = dimension ?? 'surface';
  for (const z of Object.values(zoneMap)) {
    if (z.caveDepth != null || exclude?.has(z.id)) continue;
    // A POCKET is never an anchor: wiring anything to a purchased cul-de-sac
    // would forge the second road its contract forbids.
    if (z.pocket) continue;
    // Anchors never cross dimensions: a surface quest/caravan/float must not
    // wire itself to a hell node that happens to share the coordinate plane.
    if ((z.dimension ?? 'surface') !== dim) continue;
    if (accept && !accept(z)) continue;
    const d = Math.hypot(z.map.x - c.x, z.map.y - c.y);
    if (d < bestD) { bestD = d; best = z; }
  }
  return best;
}

/** Overrides for a DIRECTED placement (quest/bounty/world-event zones). All
 *  optional, so the random-frontier path passes only { tileset }. */
export interface ZoneSpec {
  id?: string;
  tileset?: string;
  level?: number;
  objective?: ObjectiveSpec;
  packsOverride?: ZoneDef['packs'];
  forceWaypoint?: boolean;
  forceFrontiers?: number;
  noFactionWar?: boolean;
  /** Force a specific LAYOUT GENERATOR (e.g. 'unmade_vault') regardless of biome —
   *  for hand-authored set-piece arenas no biome's allowedLayouts would ever roll.
   *  Absent = pickLayout decides from the biome (the default). */
  layoutType?: string;
  /** Suppress waypoints on any OTHER zone minted within this node-unit radius (the
   *  anti-teleport gate around a boss arena → forces a multi-zone trek to reach it,
   *  Mephisto-run style). Carried onto the minted def so the rule persists. */
  wpExclusionRadius?: number;
  /** Mint a hand-authored SPECIAL zone (boss arena): a fixed theme + eventOwned (no
   *  overlay squats) regardless of biome. The layout + engine read def.special to
   *  suppress biome doodads / ambient packs / faction events. */
  special?: boolean;
  /** Force the zone's NAME (skip the random name pool) — e.g. the Caravan derives the
   *  destination's name pre-mint so the menu label matches the minted zone. */
  name?: string;
  /** Bias the anti-crowd nudge along this vector (a quest "to the south" keeps
   *  sliding south). Defaults to the target-from-anchor axis (frontier travel). */
  nudgeDir?: MapCoord;
  /** Push a reciprocal road onto the anchor (quest/bounty). The frontier path
   *  leaves this false — travelThrough mutates the existing '?' exit instead. */
  linkBack?: boolean;
  /** Mint with NO back-edge to the anchor while staying CHARTED + visible (a
   *  roadless dimension gate — DimensionEntry.road: false). Unlike `floating`
   *  it never wires in later: the zone is reached by its own mechanism (a
   *  geyser, a fall), not by road. */
  noBackEdge?: boolean;
  /** Mint UNCHARTED + DISCONNECTED: no back-edge, no reciprocal, no weave — a
   *  fog-of-war target wired into the graph later by connectFloatingZone on
   *  approach. The deliberate inverse of a force-connected directed mint. */
  floating?: boolean;
  /** Mint a PURCHASED-POCKET dead-end (a Holdfast's earned ground): keeps the
   *  back-edge to the anchor but rolls NO frontiers, appends no course
   *  continuations, and never weaves — its one road is the way in. The def is
   *  stamped `pocket: true`, which every road-forming path (weave, the eager
   *  web's link-to-near, anchor searches) honors as "never link into". */
  pocket?: boolean;
  /** Mint HIDDEN from the world map (world.visible / auto-fit) — an Incursion
   *  landing obscured until approached. Cleared on approach/entry. */
  concealed?: boolean;
  seed?: number;
  /** Heat-map sampler (sim.biomeField.sampleBiome). When given, the field resolves
   *  marine adjacency + the layout generator. */
  biomeFor?: (c: MapCoord) => string;
  /** DIFFICULTY heat-map sampler (sim.levelField.sampleLevel). Set ONLY by the
   *  random-frontier path (generateZone): the field decides the new zone's level
   *  from its coordinate (radial danger geography) instead of source.level + 1.
   *  spec.level still wins, so authored/quest/event mints are unaffected. */
  levelFor?: (c: MapCoord) => number;
  /** Biome-DEPTH sampler (sim.biomeField.sampleDepth): how deep into its region the
   *  coord sits (1=center). With fieldBiome, a MARINE region mints shallow isles at
   *  its edge and the true DEEP-SEA zone at its heart. Paired with biomeFor. */
  biomeDepthFor?: (c: MapCoord) => number;
  /** CLIMATE sampler (world/climate.ts through the sim's field seed, dimension-
   *  aware): bakes the minted coordinate's axis values into ZoneDef.geo.climate
   *  so generators/UI read the zone's weather without re-deriving the field.
   *  Mirrors biomeFor's closure pattern. */
  climateFor?: (c: MapCoord, dimension?: string) => Record<string, number>;
  /** RANDOM-FRONTIER mint: the heat-map field is AUTHORITATIVE — it re-selects the
   *  whole tileset (theme/packs/layout/biome) for the region explored into. Set only
   *  by generateZone; authored/quest/event mints leave it false (spec.tileset wins). */
  fieldBiome?: boolean;
  /** COURSE sampler (world/courses.ts through the World's dimension closures,
   *  same idiom as biomeFor): when this mint lands ON a declared throughline,
   *  the hints carry the artery's recipe knobs (river orientation), terminus
   *  rolls, and the continuation sides worldgen must keep open. Honored only
   *  with fieldBiome (the winding-bend discipline: directed mints stay
   *  byte-identical, drawing zero extra RNG). */
  courseFor?: (c: MapCoord) => CourseMintHints | null;
  /** Layout-generator knob overrides for THIS mint (merged over tileset + biome
   *  params) — a directed event zone can force the spiral variant. */
  layoutParams?: Record<string, unknown>;
  /** Mint a PORT: a harbor on the shore where a frontier met open OCEAN —
   *  coastal tileset forced, a guaranteed coast landmark, def.port set. */
  port?: boolean;
  /** The DIMENSION this zone belongs to (inherited from its source at mint).
   *  Baked BEFORE the weave so the road graph never crosses dimensions. */
  dimension?: string;
  /** THIS MINT IS A DIMENSION GATE: its back-edge to the (other-dimension)
   *  anchor is the ONE sanctioned crossing, marked crossDim on the exit. Set
   *  only by World.enterDimension — any other cross-dimension back-edge is
   *  refused with a warning (the anchor footgun, closed). */
  gateCross?: boolean;
}

// CONNECTION QA — when a freshly-charted node lands near already-charted nodes,
// GUARANTEE roads to them so the world is a dense WEB, not a tree (a Delve-like
// interconnected map). Every near-enough neighbour gets a reciprocal road — no
// chance roll — up to a per-node cap. The crucial trick: with only 4 cardinal
// sides, a node's facing side is usually already taken, so the weave STACKS a
// second road on that side at a distinct 'at' position (the authored multi-
// exit-per-side pattern: crossroads s@0.65 + s@0.35), and falls back to the
// perpendicular side. Append-only: never reorders an exits array (defIndex,
// captured as the array index at placeExit, must stay valid for live frontiers).
// LABYRINTHIAN WINDING — how far (node-units) a random-frontier node is bent
// PERPENDICULAR to the strict cardinal axis, so the world grows as an interwoven,
// meandering web rather than dead-straight N/S/E/W spokes. Kept well under half a
// cardinal step (~78 N/S) so it never flips sideToward's dominant-axis pick (which
// would mis-face a back-edge); the bend ACCUMULATES across hops + composes with the
// weave to read as a coherent labyrinth. Random-frontier only (gated on fieldBiome),
// so directed mints draw the identical RNG sequence and stay byte-identical.
const LABYRINTH_WIND = 30;

// --- THE ROAD-WATER RULE -----------------------------------------------------
// An installable guard the engine wires up (setRouteGuard) so OPPORTUNISTIC
// road-weaving never draws a land road across open ocean: an island is reached
// by sail, and its sea routes draw the crossing. Null (boot, tests) = fully
// permissive — every existing behavior is unchanged until a world installs it.
// The BACK-EDGE stays unconditional: it is the reachability contract for
// directed mints (quests/events), whose coords are already pulled ashore.
type RouteGuard = (a: MapCoord, b: MapCoord) => boolean;
let routeGuard: RouteGuard | null = null;
export function setRouteGuard(g: RouteGuard | null): void { routeGuard = g; }
function routeOk(a: MapCoord, b: MapCoord): boolean { return !routeGuard || routeGuard(a, b); }
const WEAVE_RADIUS = 96;   // node-units: past the 52 anti-crowd floor + a MAP_DIR step (~78-86)
const MAX_DEGREE = 5;      // total real roads a zone may hold (4 sides + multi-exit slack)
const MAX_NEW_LINKS = 3;   // extra roads a single fresh node weaves at most
const AT_CANDIDATES = [0.2, 0.35, 0.5, 0.65, 0.8] as const; // portal slots along a side
// PORTAL GEOMETRY — SHARED with world.ts placeExit so the gen-time spacing test uses
// the EXACT live portal positions (drift here would let two portals overlap, which
// makes the dwell-to-transition pick only the top-most → the other exit unusable).
export const PORTAL_RADIUS = 30;      // ZoneExit.radius (placeExit)
export const PORTAL_EDGE_INSET = 90;  // edge inset of a portal from the zone border (placeExit)
/** Min pixel gap between two portals (≥ 2× radius ⇒ their circles never overlap;
 *  the slack absorbs the ellipse-rim / field-blob nudges placeExit applies later).
 *  Exported for the live belt-and-suspenders pass + the genqa spacing sweep. */
export const MIN_PORTAL_SEP = PORTAL_RADIUS * 2.2;

/** The WORLD-space position a portal (side, at) resolves to — a pure mirror of
 *  world.ts placeExit's rect edge math, so spacing is tested against TRUE pixels
 *  (this is what makes CORNER collisions — n@~0 vs w@~0 → same (inset,inset) pixel —
 *  detectable, which a per-side fractional gap structurally cannot see). Ellipse
 *  zones nudge onto the rim later; the generous MIN_PORTAL_SEP absorbs that slack. */
function exitPixel(side: 'n' | 's' | 'e' | 'w', at: number, size: { w: number; h: number }): { x: number; y: number } {
  const inset = PORTAL_EDGE_INSET, { w, h } = size;
  const cx = clamp(w * at, inset, w - inset), cy = clamp(h * at, inset, h - inset);
  return side === 'n' ? { x: cx, y: inset }
    : side === 's' ? { x: cx, y: h - inset }
    : side === 'w' ? { x: inset, y: cy }
    : { x: w - inset, y: cy };
}

/** Min pixel distance from a candidate slot to EVERY existing exit (all sides), so
 *  the spacing test is corner-aware. Infinity when there are no existing exits. */
function slotClearance(side: 'n' | 's' | 'e' | 'w', at: number, existing: ZoneExitDef[], size: { w: number; h: number }): number {
  const p = exitPixel(side, at, size);
  let min = Infinity;
  for (const e of existing) {
    const q = exitPixel(e.side, e.at ?? 0.5, size);
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    if (d < min) min = d;
  }
  return min;
}

/** THE public spacing guard for any system that APPENDS an exit OUTSIDE the
 *  weave path (holdfast bonus exits, the Field frontier spread, reciprocal
 *  linkers, future scripted roads): keep `preferredAt` when its portal pixel
 *  clears EVERY existing exit (any side — corner collisions count) by
 *  MIN_PORTAL_SEP, else fall to the most-separated slot on that side.
 *  Deterministic (no rng), so both a re-load and a co-op client re-derive the
 *  same def. Appending WITHOUT this guard is how two portals end up stacked —
 *  the dwell can then only ever pick one of them. */
export function spacedExitAt(
  def: { exits: ZoneExitDef[]; size: { w: number; h: number } },
  side: 'n' | 's' | 'e' | 'w', preferredAt = 0.5,
): number {
  if (slotClearance(side, preferredAt, def.exits, def.size) >= MIN_PORTAL_SEP) return preferredAt;
  return bestSpacedAt(side, def.exits, def.size);
}

/** Cardinal side of `to` as seen from `from` (dominant axis of the delta). */
function sideToward(from: { x: number; y: number }, to: { x: number; y: number }): 'n' | 's' | 'e' | 'w' {
  const dx = to.x - from.x, dy = to.y - from.y;
  return Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'e' : 'w') : (dy >= 0 ? 's' : 'n');
}

/** Real (charted) roads out of a zone — '?' frontiers don't count toward degree. */
function countRoads(z: ZoneDef): number {
  return z.exits.filter(e => e.to !== '?').length;
}

/** Pick an 'at' on `side` whose PIXEL position clears EVERY existing portal (any
 *  side, so corner collisions count) by ≥ MIN_PORTAL_SEP, or null if none can —
 *  i.e. the side/corner is full. `size` is the zone's footprint (for the pixel map). */
function findNonCollidingAt(
  side: 'n' | 's' | 'e' | 'w', existing: ZoneExitDef[], rng: Rng, size: { w: number; h: number },
): number | null {
  const free = AT_CANDIDATES.filter(c => slotClearance(side, c, existing, size) >= MIN_PORTAL_SEP);
  return free.length ? rng.pick(free) : null;
}

/** Best-effort slot when no coarse candidate clears (the 5-slot ladder is occupied):
 *  scan a FINE grid for the gap with the MOST separation. A real zone side (~1700px+)
 *  only ever holds a handful of portals (≤ MAX_DEGREE), so a fine scan always finds a
 *  ≥ MIN_PORTAL_SEP gap — guaranteeing a directed mint's reciprocal (which MUST be
 *  placed for reachability) never lands ON another portal. */
function bestSpacedAt(side: 'n' | 's' | 'e' | 'w', existing: ZoneExitDef[], size: { w: number; h: number }): number {
  let best = 0.5, bestClear = -Infinity;
  for (let at = 0.1; at <= 0.9001; at += 0.04) {
    const cl = slotClearance(side, at, existing, size);
    if (cl > bestClear) { bestClear = cl; best = at; }
  }
  return best;
}

/** Resolve a non-colliding 'at' for BOTH ends of a road on a given axis (each end
 *  picks its own slot, pixel-spaced against that zone's exits), or null if either
 *  side is full. Pure read. */
function fitSide(
  fresh: ZoneDef, z: ZoneDef, sa: 'n' | 's' | 'e' | 'w', sb: 'n' | 's' | 'e' | 'w', rng: Rng,
): { atA: number; atB: number } | null {
  const atA = findNonCollidingAt(sa, fresh.exits, rng, fresh.size);
  if (atA === null) return null;
  const atB = findNonCollidingAt(sb, z.exits, rng, z.size);
  if (atB === null) return null;
  return { atA, atB };
}

/** Weave roads from a freshly-minted zone to every charted neighbour in range.
 *  Tries the facing (primary) axis first, then the perpendicular (secondary);
 *  on each, claims a DISTINCT non-colliding 'at' so a road can share a side with
 *  an existing exit. Strictly append-only; both ends pushed together;
 *  deterministic (seeded rng). Skips town/source/caves/safe/dups/over-degree. */
function weaveConnections(fresh: ZoneDef, zoneMap: Record<string, ZoneDef>, rng: Rng): void {
  const source = fresh.exits[0]?.to; // the back-edge is always pushed first
  const cands = Object.values(zoneMap)
    .filter(z =>
      z.id !== fresh.id && z.id !== source &&
      (z.dimension ?? 'surface') === (fresh.dimension ?? 'surface') && // roads never cross dimensions
      z.objective.kind !== 'safe' &&            // never link a sanctuary
      z.caveDepth == null &&                    // caves live off-graph anyway
      !z.pocket &&                              // a purchased cul-de-sac keeps its one road
      !z.floating && !z.concealed &&           // never weave into an UNWIRED / HIDDEN zone (a concealed
                                               // Incursion epicenter reveals + wires via connectFloatingZone,
                                               // which clears both flags BEFORE it weaves — so this only blocks
                                               // others from forging a "road into the fog")
      routeOk(fresh.map, z.map) &&              // …and never a land road over open OCEAN (an island
                                               // is reached by SAIL; its searoutes draw the crossing)
      !fresh.exits.some(e => e.to === z.id) &&  // no duplicate (fresh -> z)
      !z.exits.some(e => e.to === fresh.id))    // no duplicate (z -> fresh)
    .map(z => ({ z, d: Math.hypot(z.map.x - fresh.map.x, z.map.y - fresh.map.y) }))
    .filter(c => c.d <= WEAVE_RADIUS)
    .sort((a, b) => a.d - b.d);                 // nearest first

  let added = 0;
  for (const { z } of cands) {
    if (added >= MAX_NEW_LINKS) break;
    if (countRoads(fresh) >= MAX_DEGREE || countRoads(z) >= MAX_DEGREE) continue;

    // Primary axis: the dominant side toward the neighbour. Secondary: the
    // perpendicular side, signed by the minor delta — a fallback when the
    // primary side is full on either end.
    const primary = sideToward(fresh.map, z.map);
    const secondary: 'n' | 's' | 'e' | 'w' = primary === 'n' || primary === 's'
      ? (fresh.map.x <= z.map.x ? 'e' : 'w')
      : (fresh.map.y <= z.map.y ? 's' : 'n');

    let chosen: { sa: 'n' | 's' | 'e' | 'w'; sb: 'n' | 's' | 'e' | 'w'; atA: number; atB: number } | null = null;
    for (const sa of [primary, secondary]) {
      const fit = fitSide(fresh, z, sa, OPP_DIR[sa], rng);
      if (fit) { chosen = { sa, sb: OPP_DIR[sa], atA: fit.atA, atB: fit.atB }; break; }
    }
    if (!chosen) continue;

    fresh.exits.push({ to: z.id, side: chosen.sa, at: chosen.atA }); // APPEND-ONLY
    z.exits.push({ to: fresh.id, side: chosen.sb, at: chosen.atB });  // APPEND-ONLY
    added++;
  }
}

/** Roll the LAYOUT GENERATOR for a freshly-minted zone from its biome's
 *  allowedLayouts (default 'plains' = the classic scatter). A 'coast' marine biome
 *  that BORDERS land leans harder into 'islands' (marine adjacency). Deterministic
 *  (driven by the zone's seeded rng), so revisits replay the same topology. */
function pickLayout(
  biome: string | undefined, target: MapCoord, rng: Rng,
  biomeFor?: (c: MapCoord) => string,
): string {
  const info = biome ? BIOMES[biome] : undefined;
  const weights = info?.allowedLayouts;
  if (!weights) return 'plains';
  const w: Record<string, number> = { ...weights };
  if (info?.marine === 'coast' && biomeFor && w.islands) {
    const bordersLand = (['n', 's', 'e', 'w'] as Dir[])
      .some(d => !BIOMES[biomeFor(projectCoord(target, d))]?.marine);
    if (bordersLand) w.islands *= 2;
  }
  let total = 0;
  for (const k in w) total += w[k];
  if (total <= 0) return 'plains';
  let r = rng.next() * total;
  for (const k in w) { r -= w[k]; if (r <= 0) return k; }
  return 'plains';
}

/** Fixed theme for SPECIAL arenas (boss set-pieces) — the dark vault look, used
 *  regardless of the tileset/biome the zone is minted in (the per-phase arenaWash
 *  recolors it during the fight). */
const SPECIAL_ARENA_THEME: ZoneDef['theme'] = {
  floor: '#0c0710', grid: '#1a1020', border: '#5a2c6a',
  obstacle: '#2a1838', obstacleEdge: '#4a2c5e', accent: '#d060e0', chasm: '#040208',
};

/**
 * THE reusable placement primitive. Mints a fully-specified zone at an
 * approximate target coordinate, guarantees a back-edge to `anchor` (the nearest
 * explored node if null) so the zone is ALWAYS reachable, then weaves
 * opportunistic roads into every charted neighbour. The random-frontier path,
 * the directed quest path, and future bounty/world-event paths all share it.
 */
export function placeZoneAt(
  target: MapCoord, anchor: ZoneDef | null,
  zoneMap: Record<string, ZoneDef>, genIndex: number, spec: ZoneSpec,
): ZoneDef {
  const src = anchor ?? nearestNode(zoneMap, target, undefined, spec.dimension); // town always exists ⇒ non-null in practice
  const srcMap = src?.map ?? target;
  const rng = new Rng(spec.seed ?? rollSeed());
  // HEAT-MAP AUTHORITATIVE (random frontier only): re-select the WHOLE tileset from
  // the biome field at this coord, so theme/packs/layout/decoration/biome all match
  // the region you explored INTO — not the inherited corridor tileset. Authored
  // quest/demon/crusade/incursion mints leave fieldBiome unset → spec.tileset wins,
  // byte-identical. Seeded by the zone rng, so revisits/co-op stay deterministic.
  let tilesetId = spec.tileset ?? 'deepwood';
  // A directed mint with NO tileset and NO field resolution is an authoring
  // slip — the deepwood fallback still applies, but loudly.
  if (!spec.tileset && !(spec.fieldBiome && spec.biomeFor)) {
    console.warn(`[worldgen] mint '${spec.id ?? `gen_${genIndex}`}' from '${src?.id ?? '?'}' declares no tileset — falling back to 'deepwood'`);
  }
  if (spec.port) {
    // A PORT is a shore: the coastal tileset regardless of the inland field.
    tilesetId = pickTilesetForBiome('beach', rng) ?? tilesetId;
  } else if (spec.fieldBiome && spec.biomeFor) {
    const fb = spec.biomeFor(target);
    let picked: string | undefined;
    // MARINE DEPTH: the edge of a marine region is shallow (isle/coast); its HEART is
    // the true DEEP SEA — so how DEEP into the region the coord sits decides the tileset
    // ("migrate deep into the marine biome → the deep-sea zone spawns").
    if (BIOMES[fb]?.marine) {
      const depth = spec.biomeDepthFor?.(target) ?? 0;
      picked = depth >= BIOME_FIELD_CFG.deepThreshold
        ? pickTilesetForBiome(MARINE_MINT.deepBiome, rng)
        : pickTilesetForBiome(BIOMES[fb]?.marine === 'coast' ? fb : MARINE_MINT.openShallowBiome, rng);
    }
    picked = picked ?? pickTilesetForBiome(fb, rng);
    if (picked) tilesetId = picked;
  }
  // Same guard mintCave carries: a directed mint naming an unregistered
  // tileset must degrade loudly to a real one, never crash the mint chain.
  let tileset = TILESETS[tilesetId];
  if (!tileset) {
    console.warn(`[worldgen] mint '${spec.id ?? `gen_${genIndex}`}' names unregistered tileset '${tilesetId}' — falling back to 'deepwood'`);
    tilesetId = 'deepwood';
    tileset = TILESETS[tilesetId];
  }
  const id = spec.id ?? `gen_${genIndex}`;
  // LEVEL priority: explicit spec.level (authored/quest/event mints) → the DIFFICULTY
  // FIELD at this coordinate (random frontiers: radial danger geography) → the legacy
  // source.level + 1 fallback. The field reads `target` — the SAME projected coord the
  // portal label samples (placeExit) — so the "Uncharted · Lv N" preview is exact.
  const level = spec.level ?? spec.levelFor?.(target) ?? (src ? src.level + 1 : 1);

  // Sub-biome variant: rolled once, folded into BOTH the name and the layout.
  // The tileset's COMMON rows then ride every roll — a variant re-authors the
  // dressing that CHANGES; common carries what the biome always is.
  let layout = tileset.layout;
  let variantName: string | undefined;
  let variantTheme: Partial<ZoneDef['theme']> | undefined;
  if (tileset.variants && tileset.variants.length) {
    const v = rng.pick(tileset.variants);
    variantName = v.name;
    layout = v.layout;
    variantTheme = v.theme; // a face may RECOLOR itself (merged over base below)
  }
  if (tileset.common && tileset.common.length) layout = [...tileset.common, ...layout];

  // A name nobody on the map is wearing yet (or an explicit override — the Caravan
  // pre-derives its destination name so the menu label matches the minted zone).
  const taken = new Set(Object.values(zoneMap).map(z => z.name));
  let name = spec.name ?? '';
  if (!name) {
    for (let tries = 0; tries < 12; tries++) {
      const base = `${rng.pick(tileset.nameFirst)} ${rng.pick(tileset.nameSecond)}`;
      name = variantName ? `${base} (${variantName})` : base;
      if (!taken.has(name)) break;
    }
    if (taken.has(name)) name += ' II';
  }

  const objective = spec.objective ?? rollObjective(rng, tileset.objectives, tileset.spawnerId);

  // The zone's biome (authored tileset tag, else the heat-map field) — drives BOTH
  // the layout generator (below) AND the map SPACING (the per-biome density lever:
  // grove tight, desert spacious). Computed once here so placement can read it.
  const zoneBiome = tileset.biome ?? spec.biomeFor?.(target);
  const nodeSep = biomeSpacing(zoneBiome);

  // COURSE hints — does this mint ride a declared throughline? Gated on
  // fieldBiome (the winding-bend discipline) and CROSS-CHECKED against the
  // sampled biome: a feather-band coord whose dither fell OFF the course gets
  // no artery dressing, so hints and heat map never disagree.
  const courseHints = spec.fieldBiome ? spec.courseFor?.(target) ?? null : null;
  const onCourse = courseHints && courseHints.spec.biome === zoneBiome ? courseHints : null;

  // Map node: start at the target, then PUSH AWAY from any crowding neighbour until it
  // clears the biome's spacing — a deterministic-ish push (toward the gap, not a random
  // walk) GUARANTEES non-overlap (no more tangled, stacked nodes). Considers ALL nodes
  // incl. floating event mints, so a crusade/demon/incursion never stacks on a sibling.
  const map = { x: target.x + rng.range(-16, 16), y: target.y + rng.range(-12, 12) };
  const nudge = spec.nudgeDir ?? { x: target.x - srcMap.x, y: target.y - srcMap.y };
  const tl = Math.hypot(nudge.x, nudge.y) || 1;
  const nx = nudge.x / tl, ny = nudge.y / tl;
  // WINDING: bend the node off the cardinal axis (perpendicular = (-ny, nx)). Gated on
  // fieldBiome (random frontier) so DIRECTED mints draw zero extra RNG → byte-identical.
  if (spec.fieldBiome) {
    const wind = rng.range(-LABYRINTH_WIND, LABYRINTH_WIND);
    map.x += -ny * wind; map.y += nx * wind;
  }
  // COURSE HUG: a throughline keeps its zones ON the line — pull the node
  // toward the course centerline (capped at the spec's hug), so a cardinal
  // frontier step off this node can't fall out of the corridor at a bend and
  // break the followable chain. Deterministic (no rng); course mints only.
  if (onCourse && onCourse.hug > 0) {
    const pl = Math.hypot(onCourse.centerPull.x, onCourse.centerPull.y);
    if (pl > 1) {
      const f = Math.min(1, onCourse.hug / pl);
      map.x += onCourse.centerPull.x * f;
      map.y += onCourse.centerPull.y * f;
    }
  }
  // Find the nearest neighbour inside the spacing radius; push directly away from it
  // by the deficit (+ a hair), with a small seeded angle jitter so two coincident
  // mints don't push along the same axis forever. Iterate to settle multi-crowding.
  for (let tries = 0; tries < 20; tries++) {
    let near: ZoneDef | null = null, nd = Infinity;
    for (const z of Object.values(zoneMap)) {
      if (z.id === id) continue;
      // Other-dimension nodes share the coordinate plane but render on their
      // own map tab — hell must not shove surface zones around (or vice versa).
      if ((z.dimension ?? 'surface') !== (spec.dimension ?? 'surface')) continue;
      const d = Math.hypot(z.map.x - map.x, z.map.y - map.y);
      if (d < nodeSep && d < nd) { nd = d; near = z; }
    }
    if (!near) break;
    const away = Math.atan2(map.y - near.map.y, map.x - near.map.x) + rng.range(-0.35, 0.35);
    const push = (nodeSep - nd) + 8;
    map.x += Math.cos(away) * push;
    map.y += Math.sin(away) * push;
  }
  // LAND CLAMP: the placement jitter, the winding bend, and the anti-crowd
  // push must not shove a node into the sea — the ocean is a BIOME now, so
  // the sampler itself knows where the water is. Walk back toward the TARGET
  // (every caller's target is verified land: pulled ashore, a harbor's last
  // land coord, a sail landing) — never toward the anchor, which for a
  // landfall port sits across the whole ocean.
  if (spec.biomeFor) {
    for (let t = 0; t < 8 && spec.biomeFor(map) === OCEAN_BIOME; t++) {
      map.x += (target.x - map.x) * 0.4;
      map.y += (target.y - map.y) * 0.4;
    }
  }

  // Back-edge to the anchor (reachability is the back-edge's job — UNCONDITIONAL,
  // bypassing the degree cap), then 1-2 fresh frontiers so it can grow its own edges.
  // A FLOATING zone skips the back-edge (it mints disconnected, wired in later by
  // connectFloatingZone on approach — the fog-of-war find-it).
  //
  // DIMENSIONS ARE SEALED: an anchor in another dimension mints NO back-edge
  // unless this is a declared gate (spec.gateCross → the exit carries crossDim,
  // the one legal crossing). Callers used to be trusted here — the exact
  // footgun that let a mismatched (anchor, dimension) pair silently forge a
  // hell↔surface road indistinguishable from the Hellgate's.
  const backSide: Dir = src ? sideToward(map, srcMap) : 's';
  const srcDim = src?.dimension ?? 'surface';
  const myDim = spec.dimension ?? 'surface';
  let backEdge: ZoneExitDef[] = [];
  if (src && !spec.floating && !spec.noBackEdge) {
    if (srcDim === myDim) backEdge = [{ to: src.id, side: backSide }];
    else if (spec.gateCross) backEdge = [{ to: src.id, side: backSide, crossDim: true }];
    else {
      console.warn(`[worldgen] refused cross-dimension back-edge ${spec.id ?? `gen_${genIndex}`} (${myDim}) → ${src.id} (${srcDim}) — only a declared gate may cross`);
    }
  }
  const exits: ZoneExitDef[] = backEdge;
  const openSides = (['n', 's', 'e', 'w'] as const).filter(s => s !== backSide);
  // A POCKET is a cul-de-sac by contract: the back-edge is its ONLY road, so
  // it rolls no frontiers at all (and skips the roll's rng draw — pockets are
  // new callers, every existing mint's stream is untouched).
  const frontiers = spec.pocket ? 0 : spec.forceFrontiers ?? rng.int(1, 2);
  for (let i = 0; i < frontiers && openSides.length; i++) {
    const side = openSides.splice(rng.int(0, openSides.length - 1), 1)[0];
    exits.push({ to: '?', side, at: rng.pick([0.35, 0.5, 0.65]), tileset: tileset.id });
  }

  // Roll a varied footprint: an independent width and an ASPECT class.
  const shape = rng.chance(tileset.ellipseChance ?? 0) ? 'ellipse' as const : 'rect' as const;
  const aspect = rng.pick([1, 1, 0.64, 1.55, 0.78, 1.32]);
  const baseW = rng.range(tileset.sizeW[0], tileset.sizeW[1]);
  const size = {
    w: Math.round(baseW),
    h: Math.round(clamp(baseW * aspect, tileset.sizeH[0], tileset.sizeH[1] * 1.4)),
  };
  // COURSE CONTINUATION: a zone on a throughline GUARANTEES a way onward along
  // it (up- and downstream) — a 1-frontier roll on the wrong side must never
  // dead-end the artery. Appended after the size roll so the 'at' pick spaces
  // against the real footprint; append-only (the weave/defIndex invariant).
  // Draws RNG only for course mints, so every other mint's stream is untouched.
  // A POCKET never continues an artery — a dead-end is the whole point.
  if (onCourse && !spec.pocket) {
    for (const side of onCourse.continueSides) {
      if (side === backSide || exits.some(e => e.side === side)) continue;
      const at = findNonCollidingAt(side, exits, rng, size) ?? bestSpacedAt(side, exits, size);
      exits.push({ to: '?', side, at, tileset: tileset.id });
    }
  }
  // Biome (computed above as zoneBiome): the authored tileset tag wins; else the
  // heat-map FIELD fills it. The biome then dictates which LAYOUT GENERATOR shapes the
  // zone (default 'plains'), stored on the def so revisits replay the topology.
  const biome = zoneBiome;
  // An authored set-piece arena forces its layout; otherwise the biome picks it.
  const layoutType = spec.layoutType ?? pickLayout(biome, target, rng, spec.biomeFor);
  // generateLayout degrades an unregistered layout id to 'plains' silently —
  // say so at mint, where the authoring slip (a quest def's layoutType typo)
  // is one hop away. Biome allowedLayouts are boot-validated; this covers the
  // directed spec path those validators can't see.
  if (layoutType !== 'plains' && !hasLayout(layoutType)) {
    console.warn(`[worldgen] mint '${id}' names unregistered layout '${layoutType}' — generateLayout will fall back to 'plains'`);
  }
  // STRUCTURE ROLLS: merge the tileset's chances with the biome's (both pure
  // data). Baked onto the def so revisits/co-op replay the same rolls, and so
  // the bastion layout resolves its candidate pool from the zone itself. Special
  // arenas skip them (a boss arena owns its own furniture).
  const structureRolls = spec.special ? [] : [
    ...(tileset.structures ?? []),
    ...(biome ? BIOMES[biome]?.structures ?? [] : []),
  ];
  const landmarkRolls = spec.special ? [] : [
    ...(tileset.landmarks ?? []),
    ...(biome ? BIOMES[biome]?.landmarks ?? [] : []),
    // A port ALWAYS gets its shoreline (the harbor's reason to exist).
    ...(spec.port ? [{ landmark: 'coast', chance: 1 }] : []),
    ...(onCourse?.landmarks ?? []),
  ];
  // COMPOSITION ROLLS: the whole-zone coordinated bundles, same merge + bake
  // discipline as structures/landmarks (special arenas skip them too).
  const compositionRolls = spec.special ? [] : [
    ...(tileset.compositions ?? []),
    ...(biome ? BIOMES[biome]?.compositions ?? [] : []),
    // A course TERMINUS bakes its reward rolls onto the def like any other
    // roll source (revisits/co-op replay them — the same discipline).
    ...(onCourse?.compositions ?? []),
  ];
  // GEO context — how deep inside its biome blob the zone sits (0 = edge, 1 =
  // interior), from the EXISTING biome-depth sampler (sim.biomeField.sampleDepth,
  // already threaded for the marine shallow-isles/deep-sea split), plus the
  // CLIMATE axes at the coordinate (rounded for tidy serialization). Pure field
  // reads, NO rng — directed mints without samplers simply carry no geo.
  const climate = spec.climateFor?.(target, spec.dimension);
  const geo = (spec.biomeDepthFor || climate)
    ? {
      ...(spec.biomeDepthFor ? { biomeDepth: Math.max(0, Math.min(1, spec.biomeDepthFor(target))) } : {}),
      ...(climate ? {
        climate: Object.fromEntries(Object.entries(climate).map(([k, v]) => [k, Math.round(v * 100) / 100])),
      } : {}),
    }
    : undefined;
  // Layout knobs, spec ▷ course ▷ tileset ▷ biome (most-specific wins) — baked
  // so revisits/co-op replay the same recipe tweaks. A course slots UNDER the
  // spec (a directed mint may still override the artery's orientation).
  const layoutParams = {
    ...(biome ? BIOMES[biome]?.layoutParams : undefined),
    ...tileset.layoutParams,
    ...onCourse?.layoutParams,
    ...spec.layoutParams,
  };
  // WAYPOINT VETO: no waypoint may spawn within an existing exclusion zone's radius
  // (the anti-teleport gate around a boss arena). Excludes the zone being minted from
  // its own radius. Measured in Euclidean node-space (the same convention everywhere).
  // A WAYPOINTLESS DIMENSION (DimensionDef.waypoints: false — the Aetherial)
  // vetoes outright, AFTER the ??-chain so the seeded draw order is untouched.
  const wpCand = (spec.forceWaypoint ?? rng.chance(0.3))
    && dimensionDef(spec.dimension).waypoints !== false;
  const wpBlocked = Object.values(zoneMap).some(z =>
    z.wpExclusionRadius !== undefined && z.id !== id && coordDist(target, z.map) < z.wpExclusionRadius);
  const def: ZoneDef = {
    id, name, level,
    size,
    shape, biome,
    theme: spec.special ? SPECIAL_ARENA_THEME
      : variantTheme ? { ...tileset.theme, ...variantTheme } : tileset.theme,
    layout,
    ...(layoutType !== 'plains' ? { layoutType } : {}),
    objective,
    packs: spec.packsOverride ?? tileset.packs,
    exits,
    map,
    waypoint: wpBlocked ? false : wpCand,
    ...(spec.wpExclusionRadius ? { wpExclusionRadius: spec.wpExclusionRadius } : {}),
    // A SPECIAL arena ignores the biome and locks out overlay events (eventOwned).
    ...(spec.special ? { special: true, eventOwned: true } : {}),
    factionWar: spec.noFactionWar ? undefined : (rng.chance(0.18) ? rng.pick(WAR_PAIRS) : undefined),
    seed: spec.seed ?? rollSeed(), // fixed: this zone keeps its layout across revisits
    ...(variantName ? { variantName } : {}),
    ...(spec.floating ? { floating: true } : {}),
    ...(spec.concealed ? { concealed: true } : {}),
    ...(structureRolls.length ? { structures: structureRolls } : {}),
    ...(landmarkRolls.length ? { landmarks: landmarkRolls } : {}),
    ...(compositionRolls.length ? { compositions: compositionRolls } : {}),
    ...(geo ? { geo } : {}),
    ...(Object.keys(layoutParams).length ? { layoutParams } : {}),
    ...(spec.port ? { port: true } : {}),
    ...(spec.dimension ? { dimension: spec.dimension } : {}),
    ...(spec.pocket ? { pocket: true } : {}),
  };
  // Directed placements (quests) link the reciprocal road on the anchor here;
  // the frontier path leaves linkBack false (travelThrough mutates its '?' exit).
  // A FLOATING zone forges NONE of this at mint — connectFloatingZone does it on
  // approach (so it sits disconnected on the map until you explore to it).
  // A POCKET forges only its back-edge: no reciprocal (its frontier caller
  // mutates the locked exit), and NEVER the opportunistic weave — one road.
  if (!spec.floating && !spec.pocket) {
    // The reciprocal obeys the SAME dimension seal as the back-edge: a
    // mismatched anchor gains no road into this zone (a directed mint whose
    // anchor fell back to a cross-dimension zone would otherwise stamp the
    // exact "hell exit to the surface" defect on the ANCHOR'S side).
    if (spec.linkBack && src && srcDim === myDim) {
      const recSide = OPP_DIR[backSide];
      const at = findNonCollidingAt(recSide, src.exits, rng, src.size) ?? bestSpacedAt(recSide, src.exits, src.size);
      src.exits.push({ to: def.id, side: recSide, at });
    } else if (spec.linkBack && src && srcDim !== myDim) {
      console.warn(`[worldgen] refused cross-dimension linkBack ${src.id} (${srcDim}) → ${def.id} (${myDim})`);
    }
    // Weave opportunistic roads into already-charted neighbours (density).
    weaveConnections(def, zoneMap, rng);
  }
  return def;
}

/** Wire a FLOATING zone into the charted graph once the player nears it: forge a
 *  back-edge to the nearest node (unshift so exits[0] stays the back-edge — the
 *  weave invariant), a reciprocal road on that anchor, then opportunistic weave.
 *  Clears the floating flag. Mirrors placeZoneAt's linkBack + weave logic. */
export function connectFloatingZone(fresh: ZoneDef, zoneMap: Record<string, ZoneDef>, rng: Rng): void {
  // Prefer the nearest anchor whose road stays DRY (the route guard) — a
  // floating zone across a strait must not bridge the water; fall back to the
  // plain nearest if no dry route exists (reachability still trumps).
  const exclude = new Set([fresh.id]);
  const anchor = nearestNode(zoneMap, fresh.map, exclude, fresh.dimension,
    (z) => routeOk(fresh.map, z.map)) ?? nearestNode(zoneMap, fresh.map, exclude, fresh.dimension);
  if (!anchor) return;
  const backSide = sideToward(fresh.map, anchor.map);
  fresh.exits.unshift({ to: anchor.id, side: backSide });
  const recSide = OPP_DIR[backSide];
  const at = findNonCollidingAt(recSide, anchor.exits, rng, anchor.size) ?? bestSpacedAt(recSide, anchor.exits, anchor.size);
  anchor.exits.push({ to: fresh.id, side: recSide, at });
  fresh.floating = false;
  fresh.concealed = false; // a road has formed — the player has found it; reveal it
  weaveConnections(fresh, zoneMap, rng);
}

/** Generate the zone behind a frontier portal of `source` — a thin wrapper over
 *  placeZoneAt, preserving the frontier semantics byte-for-byte. */
export function generateZone(
  source: ZoneDef, exitDef: ZoneExitDef,
  zoneMap: Record<string, ZoneDef>, genIndex: number,
  biomeFor?: (c: MapCoord) => string,
  levelFor?: (c: MapCoord) => number,
  biomeDepthFor?: (c: MapCoord) => number,
  climateFor?: (c: MapCoord, dimension?: string) => Record<string, number>,
  courseFor?: (c: MapCoord) => CourseMintHints | null,
): ZoneDef {
  const target = projectCoord(source.map, exitDef.side);
  // fieldBiome: this is a RANDOM frontier — let the heat maps decide. biomeFor picks
  // the tileset/biome (depth-aware for marine → deep-sea at a region's heart); levelFor
  // sets the level from the difficulty field at `target` (the same coord placeExit previews).
  // The child inherits its source's DIMENSION (hell grows hell) — baked pre-weave.
  return placeZoneAt(target, source, zoneMap, genIndex,
    { tileset: exitDef.tileset, biomeFor, levelFor, biomeDepthFor, climateFor, courseFor, fieldBiome: true, dimension: source.dimension });
}

/**
 * Mint a CAVE sub-zone behind a cave mouth. A cave is OFF the world graph: it
 * never enters `zoneMap`, never charts, never tints the map, never seats a
 * warlord — it lives in `World.caveMap` and exists purely as a pocket of
 * exploration inside its parent. Its only exit leads back to the parent. The
 * entrance seed (stable per cave mouth, from the parent's seeded layout rng)
 * fixes the cavern's layout, so the same cave regenerates identically on every
 * revisit. The id encodes parent + seed, so re-entering the same mouth reuses
 * the same cave def.
 */
/** The CAVE LADDER's levers — all data, not destiny. A deeper mouth is a
 *  seeded ROLL per cave (the ladder is a rare discovery, not a guarantee).
 *  The BREACH DEPTH is no longer a lever here: it comes from whichever
 *  registered dimension declares a 'cave_breach' entry (DimensionDef.entry
 *  .minDepth) — the ladder bottoms out wherever a dimension says it does. */
export const CAVE_LADDER = {
  /** Chance a cave at depth 1, 2, … conceals a deeper mouth (last entry
   *  repeats for greater depths). */
  deeperChance: [0.3, 0.3],
};

/** The shallowest cave depth at which ANY registered dimension breaches —
 *  Infinity when none does (the ladder just ends in caves). */
function caveBreachDepth(): number {
  const entries = dimensionsEnteredBy('cave_breach');
  return entries.length
    ? Math.min(...entries.map(d => d.entry?.minDepth ?? Infinity))
    : Infinity;
}

/** One seeded draw resolves a cave's layout generator from the tileset's
 *  caveLayouts weight table ('plains' = the classic convex crawl); tilesets
 *  without the table keep the legacy roll (rooms 35%). Exactly ONE rng value
 *  is consumed either way — the mintCave draw-order contract. */
function rollCaveLayout(ts: TilesetDef, rng: Rng): string | undefined {
  const table = ts.caveLayouts;
  if (!table) return rng.chance(0.35) ? 'rooms' : undefined;
  const entries = Object.entries(table).filter(([, w]) => w > 0);
  const total = entries.reduce((a, [, w]) => a + w, 0);
  let roll = rng.range(0, total); // the one contractual draw (even a degenerate table burns it)
  for (const [layoutId, w] of entries) {
    roll -= w;
    if (roll <= 0) return layoutId === 'plains' ? undefined : layoutId;
  }
  return undefined;
}

/** Build-sheet overrides for a minted pocket (realm ARENAS author these —
 *  data/arenas.ts). Each slot swaps one rolled decision for an authored one;
 *  omitted slots keep the classic cave behavior. Callers without opts are
 *  BYTE-IDENTICAL to before (the seeded draw-order contract below). */
export interface CaveMintOpts {
  /** Force a layout recipe — branches exactly where forceLayout does, BEFORE
   *  the layout roll (so the rng stream shifts only for the opts caller). */
  layoutType?: string;
  /** Recipe knobs, as a biome would pass them (ZoneDef.layoutParams). */
  layoutParams?: Record<string, unknown>;
  /** A fixed name instead of the tileset's rolled one. */
  name?: string;
  /** Force a NAMED tileset variant's layout (the same sub-biome machinery
   *  generated zones roll, reachable for minted pockets). Unknown name warns
   *  and keeps the base. */
  variant?: string;
  /** ROLL one of the tileset's variants (seeded — one extra draw, opts
   *  callers only): each minted seat/arena shows a different face. */
  rollVariant?: boolean;
}

export function mintCave(parent: ZoneDef, entranceSeed: number, id: string, tilesetId = 'cavern', opts?: CaveMintOpts): ZoneDef {
  const ts = TILESETS[tilesetId] ?? TILESETS['cavern'];
  const rng = new Rng(entranceSeed);
  const w = Math.round(rng.range(ts.sizeW[0], ts.sizeW[1]));
  const h = Math.round(rng.range(ts.sizeH[0], ts.sizeH[1]));
  // A cave is the natural home for the non-convex layouts — deterministic per
  // entrance seed, so revisits + co-op clients regenerate identically. (Caves
  // never persist to the save; this is pure-gen flavour.) The DESCENT abyss is
  // the exception: it forces its own convex generator + BOUNDLESS arena.
  // WHICH layout a cave rolls is DATA: TilesetDef.caveLayouts weights (a crypt
  // ladder descends into catacomb dungeons, a cavern into warrens) — absent,
  // the legacy default (rooms 35% / plains 65%). Either path draws EXACTLY ONE
  // rng value, and forceLayout branches BEFORE the roll, exactly as the old id
  // check did — the seeded draw order is a compatibility contract.
  const layoutType = opts?.layoutType ?? ts.forceLayout ?? rollCaveLayout(ts, rng);
  // THE CAVE LADDER: depth counts caves-within-caves. A cave shy of the bottom
  // MAY conceal a deeper mouth — a seeded ROLL (CAVE_LADDER.deeperChance), so
  // nesting stays a discovery, not a guarantee; a rolled mouth's placement IS
  // guaranteed (generateLayout forces it if the grid was too cramped). The
  // bottom of a deep enough surface ladder holds a BREACH into the Underworld.
  const depth = (parent.caveDepth ?? 0) + 1;
  // Only SURFACE ladders bottom out in a breach — hell's caves are just caves
  // (a breach FROM the Underworld INTO the Underworld would be a teleport to
  // the hellgate dressed as revelation).
  const breach = depth >= caveBreachDepth() && !parent.dimension;
  const chances = CAVE_LADDER.deeperChance;
  const deeper = !breach && rng.chance(chances[Math.min(depth - 1, chances.length - 1)] ?? 0);
  // VARIANT (opts callers only — the no-opts stream stays byte-identical): a
  // named or seeded-rolled TilesetVariant replaces the base stamps, exactly
  // as a generated zone's roll would. The tag joins the name so the face is
  // legible at the door ("The Necropolis (bonefields)").
  let rows = ts.layout;
  let variantName: string | undefined;
  let variantTheme: Partial<ZoneDef['theme']> | undefined;
  if (opts?.variant && ts.variants?.length) {
    const v = ts.variants.find(x => x.name === opts.variant);
    if (v) { rows = v.layout; variantName = v.name; variantTheme = v.theme; }
    else console.warn(`[worldgen] mintCave '${id}': tileset '${ts.id}' has no variant '${opts.variant}' — base layout`);
  } else if (opts?.rollVariant && ts.variants?.length) {
    const v = rng.pick(ts.variants);
    rows = v.layout; variantName = v.name; variantTheme = v.theme;
  }
  // COMMON rows ride along whichever face rolled — the brittle-kit doctrine
  // (what the biome always IS must not vanish when a face is chosen) now
  // holds for minted pockets exactly as it does for generated zones.
  const layout = [
    ...(ts.common ?? []), ...rows,
    ...(deeper ? [{ kind: 'cave' as const, count: [1, 1] as [number, number] }] : []),
  ];
  const baseName = opts?.name ?? (depth >= 2 && !breach ? `Deep ${rng.pick(ts.nameFirst)} ${rng.pick(ts.nameSecond)}`
    : breach ? `${rng.pick(ts.nameFirst)} Breach`
      : `${rng.pick(ts.nameFirst)} ${rng.pick(ts.nameSecond)}`);
  return {
    id,
    name: variantName ? `${baseName} (${variantName})` : baseName,
    level: parent.level + (depth >= 2 ? 1 : 0),
    size: { w, h },
    shape: 'rect',                          // caves stay rect — no ellipse rim math
    ...(ts.boundless ? { boundless: true } : {}),
    theme: variantTheme ? { ...ts.theme, ...variantTheme } : ts.theme,
    layout,
    ...(layoutType ? { layoutType } : {}),
    ...(opts?.layoutParams ? { layoutParams: opts.layoutParams } : {}),
    objective: { kind: 'clear' },           // never gates the way back out
    packs: ts.packs,
    exits: [{ to: parent.id, side: 's' }],  // the sole exit — back to the surface
    map: { x: parent.map.x, y: parent.map.y }, // unused off-graph, but type-required
    seed: entranceSeed,                     // fixed layout, persists across revisits
    caveDepth: depth,
    ...(breach ? { breach: true } : {}),
    ...(parent.dimension ? { dimension: parent.dimension } : {}),
  };
}

function rollObjective(
  rng: Rng, weights: { kind: string; weight: number }[], spawnerId: string,
): ObjectiveSpec {
  const kind = rng.weighted(weights).kind;
  switch (kind) {
    case 'escape': return { kind: 'escape', interval: [2.2, 3.6] };
    case 'spawners': return { kind: 'spawners', spawnerId, count: [2, 3] };
    case 'waves': return { kind: 'waves', waves: rng.int(3, 4) };
    case 'beacon': return { kind: 'beacon' }; // numbers default from BEACON_CFG
    // The ATTUNEMENT CIRCUIT: several smaller waystones, a shorter hold each —
    // the same beacon fabric wearing a count (the flexibility IS the point).
    case 'circuit': return { kind: 'beacon', count: rng.int(3, 4), chargeSec: 8 };
    case 'procession': return { kind: 'procession' }; // numbers default from PROCESSION_CFG
    case 'bounty': return { kind: 'bounty' };         // numbers default from BOUNTY_CFG
    default: return { kind: 'clear' };
  }
}
