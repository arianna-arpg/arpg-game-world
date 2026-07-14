// ---------------------------------------------------------------------------
// THE WORLD.
//
// Zones are data: a connected graph of themed areas, each with its own size,
// terrain palette, a LAYOUT of set-piece stamps (rock clusters, cliff runs,
// mud patches, ravines with bridges, ruin rings), monster packs, and an
// OBJECTIVE that decides how the zone plays — clear the packs, survive
// waves, escape a zone that never stops spawning, destroy spawner objects,
// or slay a boss. Monster levels come from the zone, so the graph IS the
// difficulty curve.
//
// Exits with `to: '?'` are FRONTIER portals: stepping through one generates
// a brand-new zone from the named tileset (see data/tilesets.ts) and grafts
// it onto the world graph, one level deeper. The map grows as you explore.
// ---------------------------------------------------------------------------

import type { MonsterRarity } from '../engine/rarity';
import type { PresenceSpec } from '../engine/presence';
import type { ZoneFogSpec } from '../engine/fog';
import type { CollapseSpec } from '../engine/collapse';
import type { FluxSpec } from '../engine/flux';

/** One roster row. `presence` is the LEVELED-LIST lever (engine/presence.ts):
 *  a weight-vs-level envelope — or a named band — deciding how present this
 *  entry is at the spawn's level. Absent = present at every level. The same
 *  monster can carry different envelopes in different tables; MonsterDef
 *  .presence multiplies on top as its global floor/ceiling. */
export interface PackTableEntry { id: string; weight: number; presence?: PresenceSpec }

/** A pack SIZE archetype rolled per pack (a weighted spread): lets a zone mix dense
 *  swarms, standard packs, and tiny grazing groups instead of one uniform size band.
 *  The user's "Field = a mixture of tight clusters, grazing pairs, and a smattering." */
export interface PackArchetype { weight: number; size: [number, number]; }

export interface PackSpec {
  /** How many packs the zone seeds, rolled per visit. */
  count: [number, number];
  /** Monsters per pack (the default band when no `archetypes` spread is set). */
  size: [number, number];
  /** Optional weighted SIZE spread — each pack rolls an archetype, so the zone varies
   *  swarm / standard / grazing groups. Absent = every pack uses the flat `size` band. */
  archetypes?: PackArchetype[];
  /** One type is rolled per pack, so packs read as coherent groups. */
  table: PackTableEntry[];
}

/** Tuning every objective row may carry regardless of kind. */
export interface ObjectiveTuning {
  /** Exit policy override: do the zone's OTHER exits (all but the one you
   *  entered through) stay sealed until the objective is met? Absent = the
   *  kind's OBJECTIVE_SEALS default. Policy is data at both levels — one zone
   *  can seal where its kind doesn't (a special gauntlet), or open where its
   *  kind seals (a boss you may flee). */
  seal?: boolean;
}

/** What the zone asks of you. Whether an UNMET objective seals the exits is
 *  POLICY, not physics: OBJECTIVE_SEALS below (per kind) + the per-zone `seal`
 *  override. Progress on unsealed objectives rides Zone Memory instead of a
 *  locked door — leaving mid-fight costs nothing but the walk back. */
export type ObjectiveSpec = (
  /** A sanctuary: nothing spawns, nothing seals, nothing is asked. */
  | { kind: 'safe' }
  | { kind: 'clear' }
  /** Survive N waves (0 = endless — the original arena mode). A boss cadence
   *  is DATA: every `bossEveryWaves` waves, `bossId` emerges (The Pit's lord
   *  every 5th — any future survival arena declares its own, no engine edit).
   *  `frenzy: false` opts this arena out of the wave-frenzy overlay
   *  (data/waves.ts) — default is the full already-hunting crash. */
  | { kind: 'waves'; waves: number; bossEveryWaves?: number; bossId?: string; frenzy?: boolean }
  /** Enemies trickle in forever; the objective is reaching an exit. */
  | { kind: 'escape'; interval: [number, number] }
  /** Destructible spawner objects seed the zone; destroy them all. */
  | { kind: 'spawners'; spawnerId: string; count: [number, number] }
  | { kind: 'boss'; id: string; levelBonus?: number; uber?: UberPolicy; promote?: BossPromote }
  /** A dormant SURVEY SPIRE stands at a POI: hold your ground beside it and it
   *  charges (seconds: chargeSec → the 'beacon' transit row → BEACON_CFG);
   *  banked charge LURES idle wanderers toward the glow (the world's own
   *  population is the pressure — no waves, no bonus spawns); at full charge
   *  it flares and SURVEYS the overworld within `revealRadius` map units
   *  (charts '?' frontiers, lifts concealment, marks map intel). All numbers
   *  default from data/beacons.ts BEACON_CFG. */
  | { kind: 'beacon'; chargeSec?: number; lureRadius?: number; revealRadius?: number }
) & ObjectiveTuning;

/** Per-kind DEFAULT exit policy: does an UNMET objective seal the zone's other
 *  exits? Bosses keep the classic arena commitment; everything else leaves the
 *  roads open — "crossing a zone boundary never punishes you" extends to
 *  objectives now that wave/spawner progress rides Zone Memory. A zone's
 *  ObjectiveTuning.seal overrides its kind's row. */
export const OBJECTIVE_SEALS: Record<ObjectiveSpec['kind'], boolean> = {
  safe: false, clear: false, waves: false, escape: false, spawners: false,
  boss: true, beacon: false,
};

/** Does this zone's UNMET objective seal its exits? (An endless arena never
 *  seals — there is nothing to finish.) */
export function objectiveSeals(o: ObjectiveSpec): boolean {
  if (o.kind === 'waves' && o.waves === 0) return false;
  return o.seal ?? OBJECTIVE_SEALS[o.kind];
}

/** Which kinds bank a sealed objective CHEST (the treasure that unlocks on
 *  completion). DECOUPLED from exit-sealing on purpose: a waves zone no longer
 *  locks its roads, yet still stakes its reward. Endless arenas never do —
 *  nothing completes. */
export const OBJECTIVE_CHEST_KINDS: ReadonlySet<ObjectiveSpec['kind']> =
  new Set<ObjectiveSpec['kind']>(['boss', 'spawners', 'waves', 'beacon']);

export function objectiveEarnsChest(o: ObjectiveSpec): boolean {
  if (o.kind === 'waves' && o.waves === 0) return false;
  return OBJECTIVE_CHEST_KINDS.has(o.kind);
}

/** OPT-IN difficulty spike: promote the boss to an elite RARITY at spawn, optionally
 *  STACKING it (each stack re-applies the rarity's stat mods, compounding life/damage)
 *  — the lever for cranking a boss harder later WITHOUT touching its base def. Absent
 *  = a plain (un-promoted) boss. */
export interface BossPromote {
  rarity: MonsterRarity;
  /** How many times to apply the rarity's stat mods (default 1). 2+ = a true spike. */
  stacks?: number;
}

/** ONE-SHOT BOSS lifecycle (reusable seam): when set on a boss objective, the kill
 *  is RECORDED and the boss never returns — `scope:'account'` makes it forever-dead
 *  across every character on the account (an account-ledger key); `scope:'world'`
 *  makes it once-per-run/save (rides the persistent completedObjectives set). Absent
 *  = a normal REPEATABLE boss (re-fightable every entry — the Unmade's mode). */
export interface UberPolicy {
  scope: 'account' | 'world';
  /** Ledger key for account scope (defaults to `uber:<bossId>`). */
  key?: string;
}

/** Set-piece stamps the built-in level generator registers out of the box. */
export type KnownStampKind =
  | 'rocks' | 'cliff' | 'mud' | 'chasm' | 'ravine' | 'ruin'
  | 'swamp' | 'bog' | 'water' | 'ice' | 'river' | 'camp'
  | 'trees' | 'grove' | 'grass' | 'brush' | 'structure'
  // Biome-expansion stamps (batch 6)
  | 'sand' | 'vines' | 'thicket' | 'tombstone' | 'palm' | 'lava'
  | 'shallows' | 'cave'
  // Hazard set-pieces (crystal laser shards, volcanic lava vents)
  | 'crystal' | 'lava_vent'
  // Flesh-biome themed clutter (organic pods, bone struts, viscera pools)
  | 'flesh_pod' | 'bone' | 'gore'
  // Volcanic-biome themed clutter (obsidian shards, ash patches, ember vents)
  | 'obsidian' | 'cinder' | 'ember_vent'
  // Marine/deep-sea clutter (kelp beds, coral heads, rocky outcroppings)
  | 'kelp' | 'coral' | 'sea_rock'
  // Mycelia fungal clutter (towering caps, puffing spore-pods, glow-caps, hyphal mats, spires)
  | 'giant_mushroom' | 'spore_pod' | 'glow_cap' | 'mycelial_mat' | 'fruiting_tower'
  // Data-driven composite clusters (engine/levelgen registerCluster).
  | 'cluster'
  // Geographic landmark recipes (engine/levelgen registerLandmark).
  | 'landmark'
  // Patterned arrangements along anchor chains (engine/levelgen registerFormation).
  | 'formation'
  // NEGATIVE SPACE: a reserved glade every later placement flows around.
  | 'clearing';

/** Open stamp vocabulary: the known kinds keep autocomplete/typo resistance, and a
 *  registered package stamp (registerStamp) rides the same field. Every layout entry
 *  is boot-validated against the live registry (validateStamps), so the safety net
 *  the closed union provided moves to the validator rather than silently vanishing. */
export type StampKind = KnownStampKind | (string & {});

/** Placement checks a stamp may relax (the "rule-breaker" stamp-object). Each entry
 *  names ONE gate findSpot/clearOf/inReserved normally enforces:
 *    'border'      — may hug/overhang the arena border (sample rect widens)
 *    'portalClear' — may sit near the entry/exit portals (portal-clear splice spares it)
 *    'reserved'    — may overlap reserved structure footprints
 *    'solids'      — skips the solid-overlap spacing test entirely
 *    'spacing'     — keeps the test but with zero gap
 *    'walk'        — may land on non-walkable grid cells
 *    'forbid'      — ignores the kind's forbidOn ground list */
export type StampIgnoreRule =
  | 'border' | 'portalClear' | 'reserved' | 'solids' | 'spacing' | 'walk' | 'forbid';

export interface StampRuleOverride {
  ignore?: StampIgnoreRule[];
  /** Override the kind's registry spacing for this stamp only. */
  spacing?: number;
  /** Replace (not merge) the kind's forbidOn ground list for this stamp only. */
  forbidOn?: string[];
}

/** STRATA gate on a layout entry: the stamp only SITES inside a band of a
 *  registered generation field (levelgen registerGenField) — terrain layering
 *  as data. `radial` bands ring the arena (rim beaches, ash cores), `axisX`/
 *  `axisY` grade across it, `noise` patches it, `shore` hugs liquid bodies
 *  laid by EARLIER entries (order matters — the ground-before convention).
 *  The gate applies to the entry's own siting draws; a poured body may still
 *  organically spill past the band edge. Open registry: a package field
 *  (elevation, climate…) joins with one registerGenField call. */
export interface WhereSpec {
  field: string;
  /** Inclusive normalized band (defaults 0..1). */
  min?: number;
  max?: number;
  /** Factory knobs forwarded to the field (noise scale/seed, shore kinds/reach…). */
  params?: Record<string, unknown>;
}

export interface StampSpec {
  kind: StampKind;
  count: [number, number];
  /** rocks / water / trees: radius range override. */
  radius?: [number, number];
  /** structure stamps: which blueprint to raise (data/structures.ts). */
  structure?: string;
  /** cluster stamps: which registered ClusterDef to scatter (engine/levelgen). */
  cluster?: string;
  /** landmark stamps: which registered LandmarkDef to raise (engine/levelgen). */
  landmark?: string;
  /** Per-stamp placement-rule relaxations (see StampRuleOverride). */
  rules?: StampRuleOverride;
  /** formation stamps: which registered FormationDef to lay (engine/levelgen). */
  formation?: string;
  /** STRATA: site this entry only inside a gen-field band (see WhereSpec). */
  where?: WhereSpec;
  /** COMPOSITION entries only: anchor this entry on the named shared SITE
   *  declared by the owning CompositionDef (site-aware stamps: clearing/
   *  formation/cluster). Meaningless on tileset/zone layout rows — boot
   *  validation flags it there. */
  at?: string;
}

/** A structure CHANCE a zone rolls at generation (merged from tileset + biome
 *  data at mint, or authored directly on a ZoneDef). chance 0 = never scatter-
 *  rolled but still in the zone's bastion pool (a bastion-only def). */
export interface StructureRoll {
  structure: string;
  chance: number;
  count?: [number, number];
}

/** A geographic-landmark CHANCE (same merge + roll discipline as structures). */
export interface LandmarkRoll {
  landmark: string;
  chance: number;
  count?: [number, number];
}

/** A whole-zone COMPOSITION pick (same merge + roll discipline as structures/
 *  landmarks): the zone rolls each entry's chance at generation; hits stamp
 *  their coordinated bundle (engine/levelgen registerComposition) around
 *  shared sites. A bundle's own `when` geo-gate may still stand it down. */
export interface CompositionRoll {
  composition: string;
  chance: number;
}

/** A TRAVELED-WAY annotation (ZoneDef.exitRoads): carve a worn road from a
 *  source portal to the annotated exit at generation time — the forest
 *  game-trail fabric lifted into a per-exit, any-system seam (layoutRecipes.
 *  carveApproachRoad). Every knob is data; a spec with no fields is the
 *  stock gravel trail. */
export interface ExitRoadSpec {
  /** Which portal the road sets out from: the layout's entry anchor, or the
   *  nearest/farthest OTHER portal to the destination (default 'entry').
   *  Whichever is picked, a source sitting ON the destination re-picks the
   *  farthest distinct anchor, so the way always spans real ground. */
  from?: 'entry' | 'nearest' | 'farthest';
  /** Doodad kind chained along the way (default 'road' — the gravel path:
   *  path-mode blend, moveScale, the one worn-ground implementation). */
  kind?: string;
  /** Per-disc radius band (default [16, 22] — the game-trail gauge). */
  radius?: [number, number];
  /** wanderPath knobs (defaults mirror the forest trails). */
  step?: number; wobble?: number; bowFrac?: number;
}

export interface ZoneExitDef {
  /** Destination zone id — or '?' for an ungenerated frontier. */
  to: string;
  side: 'n' | 's' | 'e' | 'w';
  /** 0..1 position along that side (default 0.5 = centered). */
  at?: number;
  /** Frontier portals: which tileset the new zone generates from. */
  tileset?: string;
  /** A LOCK id (a Holdfast). While the lock holds, this exit is sealed (isExitLocked)
   *  AND the eager web never charts it (a fortified, opt-in bonus exit you must earn).
   *  Resolved against the lock owner's overlay (HoldfastField). Absent = a normal exit. */
  lock?: string;
  /** Off-axis portal placement OVERRIDE (normalized 0..1 arena fractions), decoupled
   *  from `side` so a non-cardinal locale still draws a sane map road from `side`.
   *  Absent (the norm) = the cardinal side+at placement. (Data seam; phase-2 use.) */
  posFrac?: { fx: number; fy: number };
  /** A DECLARED cross-dimension road (a dimension gate's way home). Dimensions are
   *  sealed world-states: every mint/link guard refuses an exit whose destination
   *  lives in another dimension UNLESS it carries this marker — set only by the
   *  gate mint (ZoneSpec.gateCross). An unmarked cross-edge is a bug: placeExit
   *  refuses to open it and warns, so a bad save self-heals visibly. */
  crossDim?: true;
}

export interface ZoneTheme {
  floor: string;
  grid: string;
  border: string;
  /** Rock / cliff fill and outline. */
  obstacle: string;
  obstacleEdge: string;
  /** Portals, zone-name accents. */
  accent: string;
  /** Slowing terrain (mud, snow drifts, ash). Default engine brown. */
  mud?: string;
  /** Gravel road path (a maintained track). Default packed-grey. */
  road?: string;
  /** Uncrossable void (chasms, lava cracks). Default near-black. */
  chasm?: string;
  /** Rivers, lakes, ponds. Default deep blue. */
  water?: string;
  /** Camp palisades. Default weathered timber. */
  wall?: string;
  /** Tree canopies and brush. Default forest green. */
  tree?: string;
  /** Grass tufts and splotches. */
  grass?: string;
  /** Wind-blown sand (deserts, beaches). Default pale tan. */
  sand?: string;
  /** Molten rock core (wastelands). Default dark ember. */
  lava?: string;
  /** Baseline darkness for the LIGHT LAYER even at noon (0..1) — interiors
   *  (caves, crypts) set this so they read lightless under an open-sky sun;
   *  omitted = open sky, only night darkens. */
  ambientDark?: number;
  /** AMBIENT FX — the zone's standing sensory weather (render/vis/ambientFx):
   *  underwater caustics + bubble splays, desert heat haze, drifting motes,
   *  the winter AURORA, drifting fungal SPORES. Screen-space, stateless,
   *  data-extensible. */
  ambientFx?: { kind: 'bubbles' | 'caustics' | 'heatHaze' | 'motes' | 'aurora' | 'spores'; intensity?: number; color?: string }[];
  /** LIVING FOG (the fog fabric, engine/fog.ts): which fog KINDS this zone
   *  breathes and how many banks roll per visit. Banks drift, coil, breathe
   *  and dissipate; standing in live fog grants the kind's statuses — the
   *  drawn shape IS the hit surface. Rolled on a SALTED stream (never moves
   *  layout rng). No spec = only sky-born mist under a 'fog' weather front. */
  fog?: ZoneFogSpec;
  /** LIVING COLLAPSE (the collapse fabric, engine/collapse.ts): this zone's
   *  ground DISSOLVES — cells crumble where feet touch, the rim flakes away
   *  on a seeded schedule marching inward, and the last standing ground is
   *  one eroding causeway to the goal (the Aetherial's cloud shelves; any
   *  future rotting-bridge or cracking-ice theme is another spec). Needs a
   *  grid layout (convex zones can't melt). Variants override wholesale. */
  collapse?: CollapseSpec;
  /** LIVING FLUX (the flux fabric, engine/flux.ts): this zone's ground
   *  SHIFTS — phasing pads gather, stand, fray and disperse on seeded
   *  rhythms; carrier rafts shuttle their lanes bearing whoever stands on
   *  them; gusts shove the unwary toward the edge. Everything derives from
   *  the painted grid kinds (cloud_flux / cloud_lane / flux_void); the spec
   *  sets only the TEMPO. Needs a grid layout. Variants override wholesale.
   *  Composes with `collapse` when their governed kinds are disjoint. */
  flux?: FluxSpec;
  /** THE UNDERSTORY (render/vis/understory.ts): what shows through this
   *  zone's `window` region cells. 'cloudsea' = the endless procedural cloud
   *  deck. A zone with `ZoneDef.below` shows the CAPTURED zone beneath it
   *  instead (this field is its fallback when no capture exists). */
  understory?: 'cloudsea';
  /** BIOME HEAT (0 = frozen … 1 = scorching; default 0.5 temperate) — the
   *  melt-rate lever for SNOW ACCUMULATION (World.updateSnow): a frozen
   *  theme keeps a permanent snow floor and lets snowfall deepen it; a hot
   *  one sheds cover in moments. Future thermal systems read the same dial. */
  heat?: number;
  /** DAYTIME BRIGHTNESS multiplier on the noon sun-lift (default 1): a
   *  desert swelters at 1.6, a canopied wood barely brightens at 0.7. */
  dayLight?: number;
  /** NIGHT DARKNESS override (default VIS_CFG.lights.nightDark): deep
   *  forests sink toward black; open plains keep starlit reads. */
  nightDark?: number;
  /** GROUND STYLE — how this theme's floor textures (all optional; defaults
   *  in VIS_CFG.ground). A desert reads as ROLLING DUNES with scale 2.5 +
   *  stretchX 2; a grove keeps the fine default mottle. */
  ground?: {
    /** Noise feature size multiplier (1 = default grain, 2.5 = dunes). */
    scale?: number;
    /** Directional stretch of features along x (dune ridges > 1). */
    stretchX?: number;
    /** Mottle strength multiplier (contrast of the tone swing). */
    strength?: number;
    /** Speckle count multiplier (0 = bare). */
    speckles?: number;
    /** MOTTLE PALETTE: a multi-stop gradient the noise field samples —
     *  full art direction of the floor in one array. A grove runs deep
     *  greens; a road-land runs dirt-browns into dull grass. Omitted =
     *  the classic light/dark derivation from the floor color. */
    palette?: string[];
    /** Skew the noise toward the palette's light end (>0.5) or dark end
     *  (<0.5) — "less black, more flourish" is bias 0.6. Default 0.5. */
    bias?: number;
    /** Mottle alpha override (how much the pattern covers the base floor). */
    alpha?: number;
    /** Palette coverage EVENNESS (0..1). At 0 (default) mid-gradient cells
     *  go translucent so the floor patches through — the mottled look. At 1
     *  the whole gradient lays down at uniform strength — a PURE two-color
     *  (or N-color) blend with no floor bleed-through in the middle. */
    evenness?: number;
    /** POSITIONAL SAMPLING — COASTLINE FADE: within `reach` world units of a
     *  water-family doodad's edge the palette sample slides by `shift`
     *  (negative = toward the palette's FIRST stop, positive = the last) —
     *  wet, dark margins around every pool and river bank. `kinds` overrides
     *  which doodad kinds count as water. */
    coast?: { reach?: number; shift: number; kinds?: string[] };
    /** POSITIONAL SAMPLING — CLEARING GLOW: where NO canopy crown covers
     *  within `reach`, the sample lifts by `lift` toward the palette's light
     *  end — sun wells in the gaps of a forest. Tag on canopied biomes only
     *  (an open plain would glow wall-to-wall). */
    clearing?: { reach?: number; lift: number };
  };
}

export interface ZoneDef {
  id: string;
  name: string;
  /** Monster level for everything spawned here (waves may ramp beyond it). */
  level: number;
  size: { w: number; h: number };
  theme: ZoneTheme;
  /** Set pieces stamped into the terrain at generation time. */
  layout: StampSpec[];
  /** Which LAYOUT GENERATOR shapes this zone (levelgen LAYOUT_GENERATORS). Open
   *  string id (default 'plains' = the classic additive stamp-scatter over the
   *  convex floor). A biome picks this at mint; stored on the def so Zone Memory
   *  replays the same topology on return. New layout families register their own. */
  layoutType?: string;
  objective: ObjectiveSpec;
  packs?: PackSpec;
  exits: ZoneExitDef[];
  /** Layout position on the world map panel (M). */
  map: { x: number; y: number };
  /** This zone holds a waypoint — attune it once, fast-travel forever. */
  waypoint?: boolean;
  /** Minted UNCHARTED + DISCONNECTED (no road) — a fog-of-war quest target you
   *  must EXPLORE toward; a road forms on approach (cleared then). The inverse of
   *  the demon-invasion force-connect. Absent = normally connected. */
  floating?: boolean;
  /** Minted CONCEALED — hidden from the world map (the fog seam world.visible()
   *  reads) and excluded from its auto-fit, so a far Incursion landing stays
   *  obscured + never zooms the map out. Cleared when the player approaches
   *  (connectFloatingZone) or enters it. Absent = a normal, visible zone. */
  concealed?: boolean;
  /** This zone is the EPICENTER/territory of another world event (a demon rift, a
   *  crusade stronghold/frontier, an incursion epicenter). Set at mint so other
   *  overlays (e.g. Conclave) don't squat their own content on it. Persists (unlike
   *  floating/concealed, which clear on approach). Absent = a plain zone. */
  eventOwned?: boolean;
  /**
   * Fixed layout seed. Static zones leave this unset (terrain reshuffles
   * per visit); generated zones carry one so the place you discovered
   * keeps its shape when you return.
   */
  seed?: number;
  /** Hand-placed structures at exact coordinates (the town's buildings). */
  fixtures?: { structure: string; x: number; y: number }[];
  /** Structure CHANCES rolled at generation (merged from tileset + biome at
   *  mint); also the zone's bastion-layout candidate pool. */
  structures?: StructureRoll[];
  /** Geographic-landmark CHANCES rolled at generation (merged from tileset +
   *  biome at mint) — the fjord/caldera/oasis vocabulary. */
  landmarks?: LandmarkRoll[];
  /** Whole-zone COMPOSITION picks rolled at generation (merged from tileset +
   *  biome at mint) — coordinated clearing/formation/strata bundles around
   *  shared sites (engine/levelgen registerComposition). */
  compositions?: CompositionRoll[];
  /** GEOGRAPHIC context baked at mint — how the zone sits in the WORLD's
   *  fields. biomeDepth: 0 = at its biome blob's edge, 1 = deep interior
   *  (a deep-sea zone far inside the deepsea region rolls more void trenches
   *  than a coastal one — generation that reads the world map). climate: the
   *  climate axes sampled at the minted coordinate (world/climate.ts —
   *  temperature/moisture/wildness/…), so generators, UI, and future systems
   *  can read the zone's weather without re-deriving the field. */
  geo?: { biomeDepth?: number; climate?: Record<string, number> };
  /** A PORT: the land ends here — a harbor zone on a continent's shore. Its
   *  dock opens the Sail menu (naval travel to other discovered ports /
   *  chart-a-course landfalls). Frontiers never mint past a port into open
   *  ocean; the sea itself is the road. */
  port?: boolean;
  /** Which DIMENSION this zone belongs to (default 'surface'). The map shows
   *  one dimension per tab; frontiers inherit their source's dimension. */
  dimension?: string;
  /** THE ZONE DIRECTLY BELOW this one (a cloud shelf hangs over the land its
   *  geyser erupted from): `zoneId` is the ground a collapse-fall drops you
   *  to, `ax`/`ay` the point in THAT zone this zone's center hangs above —
   *  the anchor both the fall mapping and the understory capture share.
   *  Pure data (serializes verbatim); set by whatever mints the shelf. */
  below?: { zoneId: string; ax: number; ay: number };
  /** CAVE LADDER depth (caves only): 1 = a surface cave, 2 = a cave within a
   *  cave (the Depths flavor), 3 = the bottom — it holds a BREACH.
   *  Presence IS the cave/off-graph discriminator (mintCave is the sole writer):
   *  categorize on `caveDepth != null`, never by sniffing the 'cave_' id prefix —
   *  the prefix survives only as a churn-id namespace for string-only classifiers
   *  over zones that may no longer exist (corpse records, save strips). */
  caveDepth?: number;
  /** This cave holds a BREACH into the Underworld (dwell it to cross). */
  breach?: boolean;
  /** Sea routes sailed FROM this port (port zone ids) — map styling + the
   *  Sail menu's memory of established crossings. */
  searoutes?: string[];
  /** BOUNDARY-GATE annotations, index-aligned with `exits` — the treatment id
   *  each exit wears where it crosses an ENCLAVE biome's boundary (data/
   *  boundaryGates.ts). TRANSIENT: the World re-derives it at every zone load
   *  from the live graph + heat map (placeExit's prediction seam) just before
   *  generateLayout, so the layout pipeline can erect the gate terrain. Never
   *  authored, never saved — deterministic given the run. */
  exitBoundaries?: (string | undefined)[];
  /** EXIT-ROAD annotations, index-aligned with `exits` — a TRAVELED WAY the
   *  layout pipeline carves from a source portal to that exit (layoutRecipes.
   *  carveApproachRoad; a Holdfast's kept gravel road is the first rider).
   *  TRANSIENT like exitBoundaries: stamped per-load by the World, never
   *  authored, never saved. */
  exitRoads?: (ExitRoadSpec | undefined)[];
  /** Layout GENERATOR knobs, merged tileset ← biome ← spec at mint — the
   *  "same tileset, tweak its generation" seam: volcanic as a spiral cauldron,
   *  a winding road, or an open expanse is one param, not three tilesets.
   *  Read via levelgen layoutParam(def, key, dflt). */
  layoutParams?: Record<string, unknown>;
  /** Two monster factions at WAR here: they spawn brawling, hate each
   *  other as much as you, and pay you nothing for each other's deaths. */
  factionWar?: [string, string];
  /** Boundary silhouette; omitted = 'rect'. 'ellipse' = inscribed ellipse. */
  shape?: import('../world/shape').ZoneShape;
  /** BOUNDLESS: no outer wall — the player streams forever (the Descent abyss).
   *  clampToBounds skips the perimeter; only doodad collision stops movement, and
   *  the engine streams terrain/enemies around the player. Absent = a normal arena. */
  boundless?: boolean;
  /** Biome tag for faction-traits home matching ('grave' | 'grove' | 'rift'). */
  biome?: string;
  /** Sub-biome variant rolled at generation — a flavour within the biome
   *  (a jungle "clearing" vs "dense floor"). Cosmetic + layout, not faction. */
  variantName?: string;
  /** Suppress waypoints on any OTHER zone minted within this node-unit radius — the
   *  anti-teleport gate around a boss arena (forces a multi-zone trek; survives a
   *  Campfire refresh). Also enforced at fast-travel (travelToWaypoint). */
  wpExclusionRadius?: number;
  /** A hand-authored SPECIAL zone (a boss arena): completely ignores the biome — a
   *  fixed theme, NO ambient packs / faction war / contest, NO overlay events squat
   *  here (demon/crusade/conclave/fracture/hunt/incursion), and the layout stamps no
   *  biome doodads. Only its authored objective (the boss) populates it. */
  special?: boolean;
  /** FIELD mega-zone descriptor (set by World.fieldifyZone at mint when biome==='field').
   *  The zone is shaped to the contiguous Field heat-map blob: the 'field' layout
   *  generator re-samples biomeAt(origin + px/scale, seed) per grid cell to rasterize
   *  the EXACT region silhouette. Stored on the def so revisits / co-op / Zone Memory
   *  replay an identical shape. Absent = a normal zone. */
  field?: FieldRegion;
  /** Multiplier on ambient pack count (default 1) — a per-zone density lever on top of
   *  the automatic sqrt(area) scaling. A Field expanse can be set lush or sparse. */
  packDensity?: number;
  /** Multiplier on the encounter-diamond open chance (default 1) — lets a big zone seed
   *  proportionally more breaches without touching the global cadence. */
  encounterDensity?: number;
  /** LOOT RICHNESS multiplier (default 1) on the kill-path drop-chance gates
   *  (DROP_CFG.killItemChance / killGemChance / vestigeChance in World.rollDrops)
   *  — THE zone-level "rich ground" lever. Never touches guaranteed paths (boss
   *  tables, per-monster hoards). Set at mint (a Holdfast pocket's earned haul,
   *  a future gilded event's field); serializes with the graph. */
  bounty?: number;
  /** A PURCHASED-POCKET dead-end (a Holdfast's earned ground): its only road
   *  leads back through the gate that sold it. The world web treats it as a
   *  cul-de-sac — never weave-linked, never an eager-web link target, never an
   *  anchor for other mints (worldgen honors this flag everywhere roads form). */
  pocket?: boolean;
}

/** Describes a FIELD mega-zone's mapping from in-zone PIXELS back to world NODE space,
 *  so the layout generator can re-sample the biome heat-map and rasterize the exact
 *  contiguous-Field silhouette. Pure data (serialized with the def). */
export interface FieldRegion {
  /** Node-space coordinate the arena's (0,0) maps to (the padded region bbox top-left). */
  originX: number;
  originY: number;
  /** Pixels per node unit. node = origin + pixel / scale (and arena = nodeExtent * scale). */
  scale: number;
  /** The biome-field seed to re-sample with raw biomeAt (warp-blind, stable per run). */
  seed: number;
  /** Canonical id of the contiguous Field region — the MINT-ONCE-per-region key, so
   *  re-approaching the same expanse from another direction links to the same zone. */
  regionId: string;
  /** Node-space footprint of the region (= arena size / scale) — so the world map draws the
   *  node SPANNING the whole heat-map blob, and the zone's exits project from its BOUNDARY. */
  nodeW: number;
  nodeH: number;
}

export const START_ZONE = 'lastlight';
/** The one hand-placed zone besides the town: the hub the world fans out from.
 *  WHERE it sits is rolled per run — worldgen.randomizeStarterWeb re-deals the
 *  road's direction and the hub's frontiers from the run seed, so these two
 *  defs carry a canonical layout that every run immediately re-shuffles. */
export const HUB_ZONE = 'crossroads';

export const ZONES: Record<string, ZoneDef> = {

  // The town: a SANCTUARY. The run begins here; the waypoint and the
  // sacrificial font are always lit; the single road leads to the Crossroads
  // — and past it, a world minted fresh every run.
  lastlight: {
    id: 'lastlight', name: 'Lastlight',
    level: 0,
    size: { w: 1400, h: 1000 },
    // HOME reads warm: lamplit earth tones, flowering verges, a fountain
    // square, benches by the lanterns — comfort, not another dungeon floor.
    theme: {
      floor: '#1c1611', grid: '#2a221a', border: '#5c503a',
      obstacle: '#4a4030', obstacleEdge: '#6c5e44', accent: '#f0cf82',
      wall: '#7a6440', water: '#1d4254', mud: '#332a1c',
      grass: '#546038', tree: '#3a5230',
      dayLight: 1.15, nightDark: 0.5, // cozy dusk — the lanterns hold it
      ground: {
        palette: ['#191207', '#251c10', '#322717', '#3e3320', '#4a3f28'],
        bias: 0.56, alpha: 0.5, speckles: 1.3,
      },
    },
    seed: 1187, // the town keeps its shape — it's home
    layout: [
      { kind: 'trees', count: [10, 10], radius: [13, 20] },
      { kind: 'grass', count: [5, 5] },
      { kind: 'flowers', count: [3, 3] },
      { kind: 'brush', count: [2, 2] },
      { kind: 'river', count: [1, 1] },
      { kind: 'fountain', count: [1, 1] },
      { kind: 'lantern_post', count: [5, 5] },
      { kind: 'bench', count: [3, 3] },
    ],
    fixtures: [
      { structure: 'blacksmith', x: 450, y: 320 },
      { structure: 'inn', x: 960, y: 300 },
      { structure: 'house_small', x: 420, y: 700 },
      // The spare house keeps a cellar under its boards (data/sidezones.ts):
      // dwell the hatch INSIDE to descend. Packages may dig deeper from there.
      { structure: 'cellar_house', x: 640, y: 760 },
      { structure: 'wayside_camp', x: 960, y: 660 },
    ],
    objective: { kind: 'safe' },
    waypoint: true,
    exits: [
      // The town's ONLY road — to the hub. Its true side is rolled per run
      // (randomizeStarterWeb): east this run, north the next. The Crossroads
      // is the gateway; the world opens from there.
      { to: 'crossroads', side: 'e' },
    ],
    map: { x: -35, y: 160 },
  },

  crossroads: {
    id: 'crossroads', name: "Wayfarer's Crossroads",
    level: 1,
    size: { w: 1700, h: 1200 },
    // A WORN meeting of ways: trodden dirt cut with desire paths, dull
    // grass hanging on between the wheel ruts, a toppled cart, old signs.
    theme: {
      floor: '#181309', grid: '#251e10', border: '#4a4430',
      obstacle: '#3e3a2a', obstacleEdge: '#5e5840', accent: '#d8b86b',
      road: '#4c4130', grass: '#57633c', mud: '#2e2414', tree: '#2e4422',
      dayLight: 1.05,
      ground: {
        palette: ['#1d150a', '#2a210f', '#352b15', '#3a3a1d', '#434d24'],
        bias: 0.52, alpha: 0.55, stretchX: 1.35, speckles: 1.4,
      },
    },
    layout: [
      { kind: 'road', count: [3, 4] },
      { kind: 'rocks', count: [5, 8], radius: [22, 46] },
      { kind: 'trees', count: [5, 8] },
      { kind: 'grass', count: [5, 7] },
      { kind: 'flowers', count: [1, 2] },
      { kind: 'mud', count: [1, 2] },
      { kind: 'water', count: [0, 1], radius: [26, 40] },
      { kind: 'broken_cart', count: [1, 2] },
      { kind: 'signpost', count: [1, 2] },
      { kind: 'lantern_post', count: [1, 2] },
    ],
    objective: { kind: 'clear' },
    packs: {
      count: [3, 4], size: [2, 4],
      // The hub is the GENTLE first fight: shamblers and rusted bones only —
      // no swarms, no casters, no summoners. The Risen Host's worthier dead
      // (and its lich warlord) wait on real grave ground past the frontiers.
      table: [
        { id: 'zombie', weight: 3 },
        { id: 'skeleton_warrior', weight: 2 },
      ],
    },
    exits: [
      // FOUR ways and no more: home behind you, three uncharted roads ahead.
      // randomizeStarterWeb re-deals these sides each run (the back-edge takes
      // the rolled road home; the frontiers fan across the remaining cardinal
      // directions), and the normal mint pipeline — heat-map biome, radial
      // level field, the eager web — grows everything beyond them.
      { to: 'lastlight', side: 'w' },
      { to: '?', side: 'n', tileset: 'meadow' },
      { to: '?', side: 'e', tileset: 'deepwood' },
      { to: '?', side: 's', tileset: 'meadow' },
    ],
    waypoint: true,
    map: { x: 50, y: 160 },
  },
};

export const ZONE_LIST: ZoneDef[] = Object.values(ZONES);
