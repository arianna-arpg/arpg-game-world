// ---------------------------------------------------------------------------
// DIMENSIONS — parallel worldmasses the run can breach into. The SURFACE is
// dimension zero; delving cave-within-cave-within-cave breaches the
// UNDERWORLD: its own zone web, its own biome palette (rivers of flame,
// black fortresses, pandemonium sprawls — the hell recipes are the same
// registered layouts/landmarks pouring demon materials), flipped through on
// the world map as a TAB once discovered (the PoE Acts pattern). A dimension
// is a registry row: palette + level pressure + label — everything else rides
// the one generation infrastructure.
// ---------------------------------------------------------------------------

import type { MapCoord } from './coords';
import { BIOME_FIELD_CFG, fieldBiomePick } from './biomes';
import { registerDimensionClimate, type DimensionAxisOverride } from './climate';
import type { CourseSpec } from './courses';

/** THE SOULWAY — hell's OTHER river, sharing the flame's spring (two rivers
 *  from one door; fire and souls part ways at the Hellgate). A broad, SHORT
 *  ribbon: this course paints the map's wash — the inland sea on the hell
 *  tab — but never chains zones: chartFrontier funnels every frontier
 *  landing in its corridor to the ONE mint-once megazone (world/soulriver.ts
 *  — feather 0 keeps paint and funnel exactly equal, so no ordinary soulway
 *  zone can ever mint; the biome is a PLACE, one zone wears it). Declared
 *  HERE (a leaf both dimensions and the soulriver module may import — the
 *  soulriver leaf pulls it for its corridor/seat/port math). */
export const SOULWAY_COURSE: CourseSpec = {
  id: 'soulway', biome: 'soulway', anchor: 'gate',
  length: 980, halfWidth: 84, feather: 0, strength: 1,
  waves: 1.1, sweep: 150, wobble: 34,
  seedSalt: 0x50f7a,
  label: 'The River of Souls',
};

/** How a dimension is ENTERED — data, not a bespoke function. 'cave_breach' =
 *  delving minDepth caves deep tears a breach whose realm gate mints the
 *  dimension's GATE ZONE (the Underworld's ladder). New entry KINDS are engine
 *  seams (a shrine rite, a stormfront, a death); WHICH dimension uses which —
 *  and its gate's name/biome/seed — is declared here, so a heaven or limbo
 *  layer is a registry row away. */
export interface DimensionEntry {
  kind: 'cave_breach' | (string & {});
  /** cave_breach: nesting depth at which the breach may tear (parent caves
   *  in a dimensioned world never re-breach — hell's caves are just caves). */
  minDepth?: number;
  /** The minted GATE ZONE — the one legal cross-dimension road. */
  gate: {
    /** Stable zone id (mint-once; the waypoint home). */
    id: string;
    name: string;
    /** The gate zone's tileset resolves from this biome's frontier pool. */
    biome: string;
    /** Gate seed = manifest.seed ^ seedSalt (deterministic across clients). */
    seedSalt: number;
  };
  /** Does the gate keep a WALKABLE ROAD to its surface anchor (the Hellgate
   *  pattern — default true)? `false` = the gate mints with NO cross-edge in
   *  either direction: the dimension touches the world only through its own
   *  entry mechanism (the Aetherial: geysers up, falls down — a realm you
   *  could stroll into from a crossroads portal is not a realm above the
   *  sky). Persisted cross-edges from older saves heal at load. */
  road?: boolean;
  /** A DOODAD KIND that stands as this dimension's realm gate wherever a
   *  layout places one (the Ascent's shining arch at a cloud shelf's far
   *  end). The engine's realm-gate dwell loop scans zone doodads against
   *  every registered gateDoodad — data, never a kind literal in world.ts.
   *  cave_breach entries don't need one (the breach doodad is its own path). */
  gateDoodad?: string;
  /** A registered TRAVERSAL id (data/traversals.ts) the gate crossing RIDES:
   *  dwelling the gate plays the cinematic and the dimension swap fires
   *  behind its veil (the geyser-mouth pattern) — the Ascent's arch launches
   *  you upward AGAIN, steadier, and arriving at the gate zone's center
   *  reads as landing there rather than popping into existence. Omitted =
   *  the crossing is instant (the Hellgate's breach). */
  traversal?: string;
}

export interface DimensionDef {
  id: string;
  label: string;
  /** SKY EXPOSURE the dimension's zones DERIVE when their def doesn't say
   *  (data/zones.ts skyOf): 'sheltered' (the default — hell has a roof of
   *  world) or 'open' (the Aetherial IS the sky: weather fronts, radiance,
   *  wind and strikes all reach its ground; its cave-pockets still derive
   *  sheltered off caveDepth). Inline literal union — the nocturne-phases
   *  idiom — so this leaf never imports the zone vocabulary it feeds. */
  sky?: 'open' | 'sheltered';
  /** Map-tab accent + node fallback tint. */
  color: string;
  /** The dimension's biome palette (weighted) — what its frontiers mint.
   *  Undefined = the surface heat map rules (only the surface does this). */
  biomes?: { biome: string; weight: number }[];
  /** Flat level pressure on top of the radial field (hell runs hot). */
  levelBonus?: number;
  /** CLIMATE AXIS OVERRIDES for this dimension (world/climate.ts): replace an
   *  axis' resting value and/or layer stack, so the SAME biome-affinity
   *  machinery paints a structurally different world below (the Underworld
   *  runs hot and arid — volcanic country pools in its hottest reaches while
   *  gravelands keep the cooler marches). Registered into the climate leaf at
   *  registerDimension time; everything else rides the shared field pick. */
  climate?: Record<string, DimensionAxisOverride>;
  /** WAYPOINTS in this world-state (default true). `false` = NO zone here
   *  ever carries one — not the gate, not a frontier roll, and fast-travel
   *  refuses the whole dimension: the realm must be CROSSED every time
   *  (persisted defs from older saves heal at load). The Aetherial swears
   *  this: a waypoint into dissolving ground is a stuck-loop machine, and
   *  heaven with a shortcut is just a lobby. */
  waypoints?: boolean;
  /** This dimension HANGS OVER another (the Nether tie): both webs share the
   *  one map-coordinate space, so every zone here resolves the nearest
   *  charted zone of `over` at its own coordinate as the ground beneath it —
   *  FALLS drop into that zone (landing at the proportional spot you fell
   *  from), and the understory's windows look down on its actual terrain.
   *  Separate webs, attached worlds: fly the realm north and the land
   *  passing below is the north of the world you left. */
  over?: string;
  /** PER-DIMENSION EVENT TEMPO — this world-state's own frequency levers.
   *  densityMul scales every package overlay's ignition here (default 1);
   *  packages[id] overrides per package (demonic incursions ×2.5 below the
   *  world, ×0.75 above it). Composed into the GATE each per-dimension
   *  overlay instance is constructed with (sim.ts), so no overlay code ever
   *  reads this directly — the biomeEventDensity lesson, one tier up. */
  events?: { densityMul?: number; packages?: Record<string, number> };
  /** How this dimension is entered (see DimensionEntry). Omitted = no entry
   *  of its own (the surface — you start there). */
  entry?: DimensionEntry;
  /** Winding biome THROUGHLINES across this dimension's heat map (world/
   *  courses.ts): each paints its biome along a seeded polyline springing at
   *  its anchor, guarantees onward frontiers so the artery can be FOLLOWED,
   *  and can hold terminus rolls at its far end. A course-only biome (listed
   *  in no palette) exists exclusively along its line — a PLACE, not patches. */
  courses?: CourseSpec[];
}

/** The event-tempo multiplier a package's overlay runs at inside a dimension. */
export function dimensionPackageTempo(dimId: string, pkgId: string): number {
  const ev = dimensionDef(dimId).events;
  return ev?.packages?.[pkgId] ?? ev?.densityMul ?? 1;
}

/** Every registered dimension whose entry is the given kind — the engine seam
 *  (mintCave's breach roll) scans this instead of naming any dimension. */
export function dimensionsEnteredBy(kind: string): DimensionDef[] {
  return Object.values(DIMENSIONS).filter(d => d.entry?.kind === kind);
}

const DIMENSIONS: Record<string, DimensionDef> = {};

export function registerDimension(def: DimensionDef): void {
  if (DIMENSIONS[def.id]) console.warn(`[dimensions] re-registering '${def.id}' — overriding`);
  DIMENSIONS[def.id] = def;
  if (def.climate) registerDimensionClimate(def.id, def.climate);
}

export function dimensionDef(id: string | undefined): DimensionDef {
  return DIMENSIONS[id ?? 'surface'] ?? DIMENSIONS.surface;
}

export function dimensionIds(): string[] { return Object.keys(DIMENSIONS); }

/** How many frontier roads a dimension's GATE ZONE fans out when it mints
 *  (World.enterDimension) — and therefore the EXACT degree a roadless gate
 *  hub is allowed to hold forever (the load-time heal trims accretion back
 *  to this fan). One constant, two readers, no drift. */
export const GATE_FANOUT = 3;

/** Is this zone a dimension's ROADLESS gate hub (DimensionEntry.road ===
 *  false, gate.id match — the Firmament)? Such a hub's edge set is exactly
 *  its minted frontiers, FOREVER: no linker, weaver, or anchor fallback may
 *  forge a road into it. Pure registry read (no persisted flags, nothing to
 *  heal) — structural typing so pure worldgen callers need no ZoneDef import. */
export function isRoadlessGateHub(z: { id: string; dimension?: string }): boolean {
  if (!z.dimension) return false;
  const ent = dimensionDef(z.dimension)?.entry;
  return !!ent && ent.road === false && ent.gate.id === z.id;
}

registerDimension({ id: 'surface', label: 'The Surface', color: '#8fb86a' });
registerDimension({
  id: 'underworld', label: 'The Underworld', color: '#d84a2a',
  // Hell's palette: rift country (river-of-flame riverlands + siege castles),
  // the OUTER STEPPES (open marches cut by ruined hellwork walls + abyssal
  // maws — the gate-terrace descent), volcanic cauldrons (spiral over lava),
  // flesh warrens — all biome rows; the dimension only re-weights WHERE the
  // world grows from them.
  biomes: [
    { biome: 'rift', weight: 4 },
    { biome: 'steppes', weight: 4 },
    { biome: 'volcanic', weight: 3 },
    { biome: 'flesh', weight: 2 },
    // THE CAUL — the invader: hell-ONLY membrane country (never in the
    // surface field) pooling where hell runs least arid — the organism
    // grows where the stone sweats. Its climate affinity carves it a
    // province of its own the way the steppes' heat-crest does.
    { biome: 'caul', weight: 2 },
    // THE DURANCE — the hate-citadel: rare ENCLAVE regions (BiomeInfo.enclave)
    // that wall themselves behind boundary gates; interiors, not country.
    { biome: 'durance', weight: 1.5 },
    { biome: 'grave', weight: 1 },
  ],
  levelBonus: 3,
  // Hell's own climate: hot and arid, with its own slow heat swells — so the
  // shared affinity machinery pools volcanic country in the hottest reaches
  // (temperature crests past 'scorching') while gravelands keep the cooler
  // marches. No seas below: the maritime axis reads 0 everywhere.
  climate: {
    temperature: { base: 0.72, layers: [{ kind: 'noise', cell: 900, amp: 0.22, salt: 0x0661 }] },
    moisture: { base: 0.16, layers: [{ kind: 'noise', cell: 1100, amp: 0.14, salt: 0x0662 }] },
    maritime: { base: 0, layers: [] },
  },
  // Hell's TEMPO: demonic incursions erupt two-and-a-half times as often below
  // the world as above it — the same package, a different world-state's pulse.
  events: { packages: { demon_invasion: 2.5 } },
  // THE RIVER OF FLAME — hell's artery (the D2 Act 4 throughline made real):
  // a winding course springing at the Hellgate's doorstep, painting the
  // course-only 'flame' biome down a ~2200-unit meander. Zones minted on it
  // chain into one followable river (worldgen guarantees onward frontiers +
  // hands the recipe its up/downstream edges), and the HELLFORGE stands
  // guaranteed where the river ends. All shape numbers are course data —
  // tune the meander here, never in engine code.
  courses: [{
    id: 'river_of_flame', biome: 'flame', anchor: 'gate',
    length: 2200, halfWidth: 150, feather: 80, seedSalt: 0xf1a8e,
    label: 'The River of Flame',
    terminus: { radius: 260, compositions: [{ composition: 'hellforge_landing', chance: 1 }] },
  },
  SOULWAY_COURSE],
  // Entered by delving: a surface cave ladder FIVE deep — down through the
  // Galleries and the whole sunless Depths band (world/strata.ts) to the
  // Brink — tears a breach whose realm gate mints The Hellgate (the one
  // marked cross-dimension road). The stack reads top to bottom: surface,
  // caverns, the Depths, the Underworld.
  // AND — vanishingly rarely — by walking through: the SUNDERING (a rift-
  // biome composition) plants a standing 'hell_breach' doodad on the
  // surface, and the gateDoodad scan below turns it into the same crossing
  // (same Hellgate, same road home — a second door, never a second hell).
  entry: {
    kind: 'cave_breach', minDepth: 5,
    gate: { id: 'uw_gate', name: 'The Hellgate', biome: 'rift', seedSalt: 0x4e11 },
    gateDoodad: 'hell_breach',
  },
});
registerDimension({
  id: 'aetherial', label: 'The Aetherial', color: '#9fc0e8',
  // The realm ABOVE the weather is not sheltered FROM it: fronts, wind,
  // strikes and the radiance scalar all reach the shelves and meadows —
  // the storm wetting the land below is the same storm your prism-span
  // condenses out of. (Cave-pockets like launch shelves still derive
  // sheltered off caveDepth — mint them sky:'open' where they shouldn't.)
  sky: 'open',
  // The realm above the clouds, two moods wide: the dissolving cloud
  // SHELVES (the 'aether' torn lattices) and the built HIGH SPIRES (courts
  // and ephemeral spans — only the fray falls). The FIRMAMENT (the sanctum
  // biome) is deliberately NOT in the palette: it exists only where the
  // gate mints it — country grows from shelves and spires; the sanctum is
  // a place.
  biomes: [
    { biome: 'aether', weight: 1 },
    { biome: 'aether_spires', weight: 0.9 },
    // THE DRIFTWAYS — the wind country: ground that comes and goes (the
    // flux fabric). Its climate gate pools it in the realm's wettest
    // reaches — the storm shelves foretold below.
    { biome: 'aether_drift', weight: 0.9 },
    // THE VESPERLANDS — the cosmos country: ground that answers the sky
    // (the span fabric + radiance-gated comet lanes). Its climate gate
    // pools it in the realm's coldest reaches — the auroral belt.
    { biome: 'aether_vesper', weight: 0.9 },
    // THE HIGH BASTION — the citadel country: the Host's seat (enormous
    // silver-and-gold massif architecture, permanent gleamways, clouds
    // over the clouds). Permanence at altitude — the shelves' opposite.
    { biome: 'aether_bastion', weight: 0.9 },
  ],
  levelBonus: 4,
  // The high air: cold, thin, and bone-dry — no seas above the sky. The
  // shared affinity machinery has one biome to paint today; the axes stand
  // ready for the realm's future country (auroral tundra-shoals? storm
  // shelves in the wettest reaches?) to gate against.
  climate: {
    temperature: { base: 0.3, layers: [{ kind: 'noise', cell: 1000, amp: 0.18, salt: 0x0ae1 }] },
    moisture: { base: 0.24, layers: [{ kind: 'noise', cell: 900, amp: 0.2, salt: 0x0ae2 }] },
    maritime: { base: 0, layers: [] },
  },
  // The Host keeps its own weather: world events run at HALF tempo above
  // the clouds (and the aether biome's own denies gate the worst offenders).
  events: { densityMul: 0.5 },
  // NO WAYPOINTS above the clouds: the realm is crossed (geyser up, gate
  // through, fall out) — never teleported into. A waypoint on a shelf whose
  // ground dissolves is a rubberband loop waiting to happen; the Firmament
  // holds the door, not a shortcut.
  waypoints: false,
  // THE NETHER TIE: the Aetherial hangs OVER the surface — one coordinate
  // space, two webs. Falls resolve the nearest charted surface zone at the
  // faller's own coordinate; the understory shows that zone's true ground.
  over: 'surface',
  // Entered by RIDING A SKY GEYSER (the Ascent): the launch drops you on a
  // collapsing shelf hung over the very zone you left; crossing its eroding
  // causeway to the ASCENDANT GATE (entry.gateDoodad — the realm-gate dwell
  // loop scans it) mints The Firmament, the waypoint home the realm's own
  // frontiers grow from. The structural inverse of the Underworld's breach:
  // hell is delved into; heaven must be survived INTO.
  entry: {
    kind: 'sky_launch',
    gate: { id: 'ae_gate', name: 'The Firmament', biome: 'aether_sanctum', seedSalt: 0xa54c }, // 'ASCent'
    gateDoodad: 'ascendant_gate',
    // The arch is a SECOND launch, steadier: the shelf drops away and the
    // veil clears on sanctum ground — why every arrival stands at the
    // Firmament's heart (loadZone centers a from-less entry) instead of at
    // some door. The lore and the mechanics agree on purpose.
    traversal: 'firmament_ascent',
    // NO ROAD DOWN: heaven is not a neighborhood. The realm touches the
    // world through geysers and falls alone — the Firmament keeps no
    // walkable edge to the surface (and older saves' edges heal at load).
    road: false,
  },
});

function hashCell(a: number, b: number, seed: number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (a | 0), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (b | 0), 0xc2b2ae35) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f) >>> 0; h ^= h >>> 15;
  return h >>> 0;
}

/** A dimension's biome at a coordinate — the same jittered-Voronoi idiom as
 *  the surface heat map, drawn over the DIMENSION'S palette and picked through
 *  the SHARED weight × climate-affinity machinery (fieldBiomePick), under the
 *  dimension's own axis overrides. Pure/deterministic. */
export function dimensionBiomeAt(dimId: string, coord: MapCoord, seed: number): string {
  const def = dimensionDef(dimId);
  const table = def.biomes;
  if (!table?.length) return 'grove';
  const span = BIOME_FIELD_CFG.cellSpan, jit = BIOME_FIELD_CFG.jitter;
  const cx = Math.floor(coord.x / span), cy = Math.floor(coord.y / span);
  let bestGx = cx, bestGy = cy, bestPx = coord.x, bestPy = coord.y, bd = Infinity;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const gx = cx + dx, gy = cy + dy;
      const h = hashCell(gx, gy, seed);
      const px = (gx + 0.5 + (((h & 0xffff) / 0xffff) - 0.5) * jit) * span;
      const py = (gy + 0.5 + ((((h >>> 16) & 0xffff) / 0xffff) - 0.5) * jit) * span;
      const d = (px - coord.x) ** 2 + (py - coord.y) ** 2;
      if (d < bd) { bd = d; bestGx = gx; bestGy = gy; bestPx = px; bestPy = py; }
    }
  }
  return fieldBiomePick(table, bestGx, bestGy, { x: bestPx, y: bestPy }, seed, dimId);
}

/** How DEEP into its region a coordinate sits on a DIMENSION's own field —
 *  1 at the jittered Voronoi seat, →0 at the boundary: the surface
 *  biomeDepth mirrored over dimensionBiomeAt's exact cell math, so a realm
 *  COUNTRY can stage its faces (the High Bastion rim → Seraphal heart)
 *  through the same depthAffinity envelopes the desert and the marine
 *  shelves read below. Pure + deterministic. */
export function dimensionBiomeDepth(dimId: string, coord: MapCoord, seed: number): number {
  const def = dimensionDef(dimId);
  if (!def.biomes?.length) return 0;
  const span = BIOME_FIELD_CFG.cellSpan, jit = BIOME_FIELD_CFG.jitter;
  const cx = Math.floor(coord.x / span), cy = Math.floor(coord.y / span);
  let bd = Infinity;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const gx = cx + dx, gy = cy + dy;
      const h = hashCell(gx, gy, seed);
      const px = (gx + 0.5 + (((h & 0xffff) / 0xffff) - 0.5) * jit) * span;
      const py = (gy + 0.5 + ((((h >>> 16) & 0xffff) / 0xffff) - 0.5) * jit) * span;
      const d = (px - coord.x) ** 2 + (py - coord.y) ** 2;
      if (d < bd) bd = d;
    }
  }
  return Math.max(0, Math.min(1, 1 - Math.sqrt(bd) / (span * 0.5)));
}
