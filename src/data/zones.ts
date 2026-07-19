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
import type { ZoneCreepSpec } from '../engine/creep';
import type { CollapseSpec } from '../engine/collapse';
import type { FluxSpec } from '../engine/flux';
import type { RecoveryPolicy } from '../world/regions';
import type { SpanRowSpec } from '../engine/spans';
import type { TrackSpec } from '../engine/tracks';
import type { TrapworkSpec } from '../engine/trapworks';
import type { ZoneLiteSpec } from '../engine/lite';
import { dimensionDef } from '../world/dimensions';
import type { WildlifeRow } from './monsters';
import type { HarborholdState } from './harborholds';

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
  /** NO ask at all: a HOSTILE ground with no errand — the population spawns
   *  like anywhere else, but nothing ever completes, nothing pays (no clear
   *  bounty, no chest), and exits never seal. The vocabulary for "just
   *  terrain": pit-dropped hollows (PIT_CFG.dropCave.objective) and any
   *  future pocket that is a place, not a task. `label` overrides the HUD's
   *  default line. */
  | { kind: 'none'; label?: string }
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
  /** Dormant SURVEY SPIRES stand at POIs: hold your ground beside one and it
   *  charges (seconds PER STONE: chargeSec → the 'beacon' transit row →
   *  BEACON_CFG); banked charge LURES idle wanderers toward the glow (the
   *  world's own population is the pressure — no waves, no bonus spawns).
   *  When EVERY stone is full the objective flares and SURVEYS the overworld
   *  within `revealRadius` map units (charts '?' frontiers, lifts
   *  concealment, marks map intel). `count` 1 (default) is the lone spire;
   *  2+ is the ATTUNEMENT CIRCUIT — smaller waystones, the fight migrating
   *  stone to stone as the lure follows your work. All numbers default from
   *  data/beacons.ts BEACON_CFG. */
  | { kind: 'beacon'; count?: number; chargeSec?: number; lureRadius?: number; revealRadius?: number }
  /** ESCORT THE CARAVAN: a cart waits DORMANT (immobile, immune) by the gate
   *  you entered through; linger beside it and the procession sets out down a
   *  carved gravel way toward the far exit. Robbers converge — the zone's own
   *  population is drawn to the goods, and bandit ambushes puff from the
   *  smoke as it rolls. The cart arriving intact completes the objective;
   *  the cart destroyed LOSES it (objectiveLost — the bounty is forfeit, the
   *  roads never lock, the zone's TTL refresh deals a fresh caravan). All
   *  numbers default from data/processions.ts PROCESSION_CFG. */
  | { kind: 'procession'; robbers?: PackTableEntry[]; puffEvery?: [number, number]; speedMul?: number }
  /** THE BOUNTY WRIT: `count` of the zone's own bodies walk it as MARKED
   *  QUARRY — named (the nemesis vocabulary), promoted to `rarity`, roaming
   *  with the population. Claim every writ (any death counts — the world is
   *  allowed to do your work) and the objective completes. The hunt is pure
   *  population state: Zone Memory resumes a half-claimed writ with the SAME
   *  named marks at the same wounds, for free. Numbers default from
   *  data/bounties.ts BOUNTY_CFG. */
  | { kind: 'bounty'; count?: [number, number]; rarity?: MonsterRarity; stacks?: number }
  /** OFFERINGS TO THE ALTAR: an altar from the registry (data/shrines.ts —
   *  `altarId` pins one; absent = a weighted roll, so a storm or gilded altar
   *  reshapes the whole ask) stands at a POI. Kills WITHIN ITS FIELD power
   *  it, `need` deep — any death counts, credited or not, ambient or not
   *  (a migration herd stampeding through, or the storm's own bolts, feed it
   *  too). Nothing left alive before it's sated? The objective STALLS — not
   *  lost, just hungry — until a world event brings new blood. Numbers
   *  default from data/objectives.ts OFFERING_CFG. */
  | { kind: 'offering'; need?: [number, number]; altarId?: string }
  /** AN ACTIVITY PUZZLE (engine/puzzles.ts — the puzzle fabric): the zone
   *  stands up one of its riddles as THE ask — a lights-out lattice to
   *  kindle, a refrain to answer, a chord to attune. `puzzle` pins a
   *  PUZZLES preset (data/puzzles.ts); absent, the zone rolls from its own
   *  `ZoneDef.puzzles` rows (folded from TilesetDef.puzzles at mint), so
   *  the biome's repertoire IS the objective pool. Roads stay open (the
   *  riddle waits); the chest banks on the solve. */
  | { kind: 'puzzle'; puzzle?: string }
) & ObjectiveTuning;

/** Per-kind DEFAULT exit policy: does an UNMET objective seal the zone's other
 *  exits? Bosses keep the classic arena commitment; everything else leaves the
 *  roads open — "crossing a zone boundary never punishes you" extends to
 *  objectives now that wave/spawner progress rides Zone Memory. A zone's
 *  ObjectiveTuning.seal overrides its kind's row. */
export const OBJECTIVE_SEALS: Record<ObjectiveSpec['kind'], boolean> = {
  safe: false, none: false, clear: false, waves: false, escape: false, spawners: false,
  boss: true, beacon: false, procession: false, bounty: false, offering: false,
  puzzle: false,
};

/** Does this zone's UNMET objective seal its exits? (An endless arena never
 *  seals — there is nothing to finish.) */
export function objectiveSeals(o: ObjectiveSpec): boolean {
  if (o.kind === 'waves' && o.waves === 0) return false;
  return o.seal ?? OBJECTIVE_SEALS[o.kind];
}

/** THE MAP READ — how each objective kind announces itself on the world map's
 *  zone pane BEFORE you walk in: a glyph + a static "what this ground asks"
 *  phrase. No live progress here (that's World.objectiveText(), the in-zone
 *  HUD line) — this is the chart's promise, not the fight's scoreboard. A
 *  Record over the kind union so a new kind can't ship unreadable — the
 *  compiler demands its row, exactly like OBJECTIVE_SEALS above. */
export const OBJECTIVE_READS: Record<ObjectiveSpec['kind'], { glyph: string; read: string }> = {
  safe: { glyph: '⌂', read: 'sanctuary' },
  none: { glyph: '·', read: 'open ground — nothing asked' },
  clear: { glyph: '⚔', read: 'clear the area' },
  waves: { glyph: '≋', read: 'survive the assault' },
  escape: { glyph: '⇥', read: 'find the way out' },
  spawners: { glyph: '✸', read: 'destroy the spawners' },
  boss: { glyph: '☠', read: 'a lair' },
  beacon: { glyph: '◬', read: 'charge the survey spire' },
  procession: { glyph: '⛟', read: 'escort the caravan' },
  bounty: { glyph: '✜', read: 'hunt the marked quarry' },
  offering: { glyph: '♨', read: 'feed the hungering altar' },
  puzzle: { glyph: '❖', read: 'answer the riddle' },
};

/** Resolve a spec to its pane read, honoring the spec-level refinements the
 *  static table can't know (endless arenas, authored 'none' labels, the
 *  waystone circuit). Boss NAMES stay a call-site concern — the panel owns
 *  the MONSTERS import and its own spoiler policy. */
export function objectiveRead(o: ObjectiveSpec): { glyph: string; read: string } {
  const base = OBJECTIVE_READS[o.kind];
  if (o.kind === 'none' && o.label) return { glyph: base.glyph, read: o.label };
  if (o.kind === 'waves') {
    return { glyph: base.glyph, read: o.waves === 0 ? 'endless waves' : `survive ${o.waves} waves` };
  }
  if (o.kind === 'beacon' && (o.count ?? 1) > 1) {
    return { glyph: base.glyph, read: `attune the waystone circuit (${o.count})` };
  }
  return base;
}

/** Which kinds bank a sealed objective CHEST (the treasure that unlocks on
 *  completion). DECOUPLED from exit-sealing on purpose: a waves zone no longer
 *  locks its roads, yet still stakes its reward. Endless arenas never do —
 *  nothing completes. */
export const OBJECTIVE_CHEST_KINDS: ReadonlySet<ObjectiveSpec['kind']> =
  new Set<ObjectiveSpec['kind']>(['boss', 'spawners', 'waves', 'beacon', 'procession', 'bounty', 'offering', 'puzzle']);

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
  // The ship-deck kit (the Wraithsail's boarding decks)
  | 'ship_mast' | 'cargo_stack'
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
 *    'forbid'      — ignores the kind's forbidOn ground list
 *    'clearway'    — may stand ON a traveled way (the clearway carve spares the
 *                    pieces, tagged `waive`: an authored blockade across a road)
 *    'habitat'     — ignores the kind's ground affinity (a DELIBERATELY inundated
 *                    biome beds kelp on dry land; pieces tagged, genqa honors) */
export type StampIgnoreRule =
  | 'border' | 'portalClear' | 'reserved' | 'solids' | 'spacing' | 'walk' | 'forbid'
  | 'clearway' | 'habitat';

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

/** A blend WEIGHT-FIELD shape (the blend fabric, engine/blend.ts): HOW the
 *  partner tileset's share runs across the arena. `kind` names a registered
 *  shape (axisX/axisY transition ramps, radial core/rim, pockets Voronoi
 *  tessellation, noise patchwork — open registry); the post-ops compose on
 *  any shape. Pure data — compiled per zone off (arena, seed). */
export interface BlendFieldSpec {
  kind: string;
  /** Shape knobs forwarded to the field factory (from/to fractions, span,
   *  coverage, scale…) — each shape documents its own. */
  params?: Record<string, unknown>;
  /** Domain WARP: organic boundary wobble (amp in world units, scale = noise
   *  feature size). Absent = the modular default; amp 0 = ruler-straight. */
  warp?: { amp?: number; scale?: number };
  /** Remap the shape's 0..1 through [lo, hi] — harden a ramp into a front
   *  line (band [0.45, 0.55]) or soften a tessellation. */
  band?: [number, number];
  /** Flip the field (the partner claims the other end). */
  invert?: boolean;
}

/** A ZONE BLEND (the blend fabric): this zone interleaves a PARTNER tileset's
 *  theme + kit + packs across its arena by the weight field — 0 reads fully
 *  as the zone's own tileset, 1 fully as the partner. Durable on the def
 *  (persists + replays like theme/layout); resolved at mint from
 *  TilesetDef.blend or authored directly by a mint. No pair is hardcoded:
 *  `with` is a structural tileset-id ref, validated at boot. */
export interface BlendSpec {
  /** The partner TILESET id whose theme/kit/packs interleave. */
  with: string;
  field: BlendFieldSpec;
  /** Partner share of the merged pack table (0..1). Absent = the field
   *  shape's nominal mean coverage. */
  packs?: number;
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
  /** BLEND SIDE (the blend fabric, engine/blend.ts): which end of a blended
   *  zone's weight field this entry belongs to — 'base' sitings thin as the
   *  partner takes over, 'with' sitings thin toward the base end, 'any' opts
   *  out of the gate entirely. The mint's compose step tags untagged rows;
   *  authored rows may pre-declare. Meaningless (ignored) in unblended zones. */
  blend?: 'base' | 'with' | 'any';
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

/** A zone's SECRET-HOLLOWS budget (the hollows fabric — engine/levelgen
 *  stampHollows): how many secrets a GRID layout tries to wall up, and the
 *  weighted table of registered reveal kinds (data/hollows.ts) each rolls.
 *  Best-effort: a cramped grid places fewer than rolled, never breaks. */
export interface HollowRollSpec {
  count: [number, number];
  table: Record<string, number>;
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
  /** OVERGROWTH override for this way alone (0..1 wild share, rolled in
   *  runs — see levelgen wayRoller). Absent = the zone's own dial
   *  (layoutParams.overgrowth). A Holdfast's KEPT road pins 0: kept means
   *  kept. */
  overgrowth?: number;
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
   *  the winter AURORA, drifting fungal SPORES, and OVERCLOUDS — higher
   *  cloud streaming OVER the scene at camera parallax (the sky countries'
   *  verticality read). Screen-space, stateless, data-extensible. */
  ambientFx?: { kind: 'bubbles' | 'caustics' | 'heatHaze' | 'motes' | 'aurora' | 'spores' | 'sandDrift' | 'overclouds'; intensity?: number; color?: string }[];
  /** SIGHT-VEIL tuning (render/vis/sightVeil.ts): per-zone multipliers over
   *  the pass's global strengths (VIS_CFG.sightVeil) — `mul` scales both
   *  shadow families, `regionMul` the true-wall shadows (rampart, verdure,
   *  cave wall), `doodadMul` the solid-body shadows (trunks, boulders,
   *  standing stones). 0 disables a family for the zone; omitted = 1. Art
   *  direction only — the engine's LoS ray never reads this. */
  sightVeil?: { mul?: number; regionMul?: number; doodadMul?: number };
  /** LIVING FOG (the fog fabric, engine/fog.ts): which fog KINDS this zone
   *  breathes and how many banks roll per visit. Banks drift, coil, breathe
   *  and dissipate; standing in live fog grants the kind's statuses — the
   *  drawn shape IS the hit surface. Rolled on a SALTED stream (never moves
   *  layout rng). No spec = only sky-born mist under a 'fog' weather front. */
  fog?: ZoneFogSpec;
  /** LIVING CREEP (the creep fabric, engine/creep.ts): pockets of organism
   *  SKIN grown over the floor — anchored membrane patches that breathe,
   *  feed their own faction and mire everyone else (the kind's grants; the
   *  drawn skin IS the hit surface). Ambient pockets roll on a SALTED
   *  stream (never moves layout rng); packages and creep-heart monsters
   *  plant more at runtime through World.creepEnsure(). No spec = no
   *  ambient creep. */
  creep?: ZoneCreepSpec;
  /** THE LITE TIER's ambient pours (engine/lite.ts): pockets of PACKED-POOL
   *  bodies — the wade-through crowd — seated on the leftover-POI stream
   *  at zone boot (salted; never moves layout/spawn rng). Each row's
   *  monsterId must opt in via MonsterDef.lite. No spec = no pours. */
  lite?: ZoneLiteSpec;
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
  /** THE PITFALL POLICY (the pitfall fabric, engine/pitfall.ts): what a
   *  PIT-FAMILY fall MEANS in this zone — every arrest past a chasm/void/
   *  abyss lip (grid cells and stamped pit doodads alike) resolves through
   *  THIS policy instead of the region row's default. The flagship is
   *  `{ kind: 'descend' }`: the faller drops ONE STRATUM into the pit's own
   *  deterministically-minted underzone (landing toll in `damage`; omitted =
   *  PIT_CFG.fallDamage), hostiles shoved past the lip are swallowed with
   *  full credit to the shover, and the hollow's mouth climbs back out at
   *  the rim. Absent = the region rows' classic behavior, byte-identical.
   *  Sky doors (skyfall rows) and authored ejects are never overridden.
   *  Variants override wholesale (the collapse precedent). */
  pitfall?: RecoveryPolicy;
  /** EPHEMERAL SPANS (engine/spans.ts): condition-held ground — walkable
   *  region runs whose EXISTENCE tracks a RadianceCond (world/radiance.ts):
   *  sunbridges that stand while the sky is bright, star-spans that stand
   *  at night, prism-spans that stand under rain or storm. The layout
   *  paints the kinds; these rows set only the CONDITIONS. Spans are
   *  shortcuts and prizes, never the only road (the recipes keep every
   *  exit on permanent ground — probe_radiance pins it). Needs a grid
   *  layout. Variants override wholesale, like collapse/flux. */
  spans?: SpanRowSpec[];
  /** MOVING-HAZARD LANES (the track fabric, engine/tracks.ts): authored
   *  hazard tracks this zone always runs — buzzsaw rings, shuttling blades,
   *  anything a TrackSpec can say. Zone-space coordinates, so theme rows fit
   *  FIXED layouts (authored interiors, arenas); generated zones author
   *  lanes from their landmark builders/recipes instead (the groove bakes
   *  under the blade there). Rider poses derive from the shared clock —
   *  deterministic across seats and resumes by construction. */
  tracks?: TrackSpec[];
  /** TRAPWORK MECHANISMS (engine/trapworks.ts) for FIXED layouts — plates,
   *  triplines and their wired effects at authored coordinates; generated
   *  zones author trapworks from their own gen pass instead (plates seated
   *  in real corridors, runways pre-grooved). */
  trapworks?: TrapworkSpec[];
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
  /** OPEN-SUN SWELTER (World.updateHeat): zones that declare this bake
   *  sunscorch stacks under bare daylight — no shimmer pocket required —
   *  scaled by the zone's own baked climate temperature. The desert
   *  country's tax: unshaded daylight is the hazard, shade/night/water the
   *  relief, shimmer fields the fast lane. 0/absent = only shimmer bakes
   *  (every non-desert biome, byte-identical). ~0.85 waste, 1 erg,
   *  1.2 glasspan. All cadence math in HEAT_CFG. */
  swelter?: number;
  /** OPEN-AIR WINDCHILL (World.updateWindchill): swelter's high-country
   *  inverse. Zones that declare this bank CHILL stacks on the ordinary cold
   *  ladder (chill → frozen at the cap) while a player stands in the open —
   *  cadence scaled by the zone's baked climate temperature (colder bakes
   *  faster), the LIVE gale (windAt strength — a blizzard on the crown bites
   *  hardest), and the dark. WARMTH sheds: a warms-ruled fire
   *  (DoodadRule.warms — the waystation hearth), a roof, or the lee of any
   *  windbreak while wind blows (windAt's own shelter probe — duck behind a
   *  boulder to warm up). 0/absent = no cold tax (every other biome,
   *  byte-identical). The mountain country's commitment: in the open you are
   *  freezing or you are warming. Cadence math in WINDCHILL_CFG. */
  windchill?: number;
  /** THE GAZE (World.updateGaze): the zone's own eyes regard whoever walks
   *  it. Doodads of `kinds` are EYES: any OPEN eye with a player seat in its
   *  `reach` (beyond `closeReach` — walk right up and it flinches shut, the
   *  fabric's built-in counterplay) builds `status` stacks; out of regard
   *  they dwindle. The status's own buildup ladder decides what being seen
   *  costs, and the lane answers a fresh conversion with a lure ping
   *  (`lureRadius` — the zone turning toward you). Cadence in GAZE_CFG;
   *  swelter's sibling lane, in eyes. */
  gaze?: {
    kinds: string[];
    /** REGION kinds that watch too (the watching shell — ocular_wall):
     *  standing near an eyes-grown wall builds the same ladder. Wall eyes
     *  never flinch shut and cannot be burst — the counterplay is the
     *  oldest one: don't linger where the wall can see you. */
    wallKinds?: string[];
    reach?: number;
    closeReach?: number;
    /** Default 'beheld' (GAZE_CFG.status). */
    status?: string;
    lureRadius?: number;
  };
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

/** THE TIER FABRIC's zone declaration (engine/tiers.ts — a second walkable
 *  layer derived from the region map). Lives here so the data leaf owns the
 *  schema and the engine imports the type, never the reverse. */
export interface ZoneTiers {
  /** Which way the second layer sits — labels + render semantics only. */
  kind: 'over' | 'under';
  /** 'open' = both layers visible at once (buttes); 'covered' = only the
   *  ACTIVE layer draws (sewers, future stacked floors). */
  exposure: 'open' | 'covered';
  /** HUD label for tier 1 ("the butte tops", "the drains"). */
  label?: string;
  /** Fraction of ambient packs seeded on tier 1 (default TIER_CFG.packSplit). */
  packSplit?: number;
  /** RIM DUELS (open exposure): cross-tier hostility is ALLOWED — sight and
   *  the region map mediate instead (butte walls block eyes and arrows, so
   *  the fights that happen are the honest ones: across rims and spans).
   *  Covered zones must never set it (a ceiling is not a vantage). */
  rimDuels?: boolean;
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
  /** ACTIVITY PUZZLES this zone may stand up at LOAD (engine/puzzles.ts):
   *  chance-rolled rows into the PUZZLES presets (data/puzzles.ts), capped
   *  by PUZZLE_CFG.maxPerZone, placed on a SALTED stream (never moves
   *  layout/spawn rng — the fog-bank discipline). Folded from
   *  TilesetDef.puzzles at mint; authored zones list rows directly. A
   *  `puzzle` OBJECTIVE draws its preset from these rows when unpinned. */
  puzzles?: { id: string; chance: number }[];
  /** AMBIENT SCENERY-ACTORS planted at LOAD (World.bootScenery): passive
   *  object-actor rows — the crystal country's freestanding resonant
   *  crystals — on their own salted stream, the puzzles discipline
   *  exactly. Folded from TilesetDef.scenery at mint. (Distinct from
   *  `fixtures` below — those are STRUCTURE stamps at authored spots.) */
  scenery?: { monster: string; count: [number, number] }[];
  packs?: PackSpec;
  /** AUTHORED AMBIENT FAUNA — this zone's own WildlifeRow list, REPLACING the
   *  biome's WILDLIFE table outright. The one lane past the sanctuary gate:
   *  authored fauna spawns even on SAFE ground (the town's gutter rats, the
   *  cellar's roaches — texture the zone asked for by name), so the validator
   *  requires safe-zone rows to be 'critter'-tagged. Absent = the biome list. */
  fauna?: WildlifeRow[];
  exits: ZoneExitDef[];
  /** Layout position on the world map panel (M). */
  map: { x: number; y: number };
  /** This zone holds a waypoint — attune it once, fast-travel forever. */
  waypoint?: boolean;
  /** ZONE KIND — an open identity id into ZONE_KINDS (data/zoneKinds.ts): what
   *  this zone IS (a town today; sanctums/outposts tomorrow), driving the world
   *  map's indicator ring/glyph, the never-hidden name card, and the info-pane
   *  chip. Absent = plain ground. Identity, not state: worldstate's sanitizer
   *  re-asserts the live registry's kind for authored zones on save-restore. */
  kind?: string;
  /** Minted UNCHARTED + DISCONNECTED (no road) — a fog-of-war quest target you
   *  must EXPLORE toward; a road forms on approach (cleared then). The inverse of
   *  the demon-invasion force-connect. Absent = normally connected. */
  floating?: boolean;
  /** Minted CONCEALED — hidden from the world map (the fog seam world.visible()
   *  reads) and excluded from its auto-fit, so a far Incursion landing stays
   *  obscured + never zooms the map out. Cleared when the player approaches
   *  (connectFloatingZone) or enters it. Absent = a normal, visible zone. */
  concealed?: boolean;
  /** THE FORECHART (engine forechart fabric): this zone was minted AHEAD of the
   *  player's own exploration — a full citizen of the graph (events seat on it,
   *  factions contest it, roads weave through it) that no player-facing surface
   *  shows until it is FOUND. Distinct from `concealed` (a hidden event mint
   *  that stays out of the road weave): veiled ground weaves and links like any
   *  ground — only the map is blind. Unveiled by entry, by adjacency to a
   *  visited zone (the classic one-ring map preview), by a survey pulse, or by
   *  an omen/chart reveal. Absent = a normal, visible zone. */
  veiled?: boolean;
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
  /** SECRET HOLLOWS budget (the hollows fabric, engine/levelgen
   *  stampHollows): how many secrets a GRID layout tries to wall up, and the
   *  weighted table of registered reveal kinds (data/hollows.ts) they roll.
   *  Grid zones only — convex layouts keep the classic secret_wall beat. */
  hollows?: HollowRollSpec;
  /** THE TIER FABRIC (engine/tiers.ts): this zone carries a SECOND walkable
   *  layer derived from its region map (RegionKind.tier/tierLink rows).
   *  Stamped by the recipes that carve one (needles buttes, district sewer
   *  lattices) — regenerated with the layout, never authored by hand. */
  tiers?: ZoneTiers;
  /* (ZoneTiers lives just below ZoneDef — the tier fabric's declaration.) */
  /** GEOGRAPHIC context baked at mint — how the zone sits in the WORLD's
   *  fields. biomeDepth: 0 = at its biome blob's edge, 1 = deep interior
   *  (a deep-sea zone far inside the deepsea region rolls more void trenches
   *  than a coastal one — generation that reads the world map). climate: the
   *  climate axes sampled at the minted coordinate (world/climate.ts —
   *  temperature/moisture/wildness/…), so generators, UI, and future systems
   *  can read the zone's weather without re-deriving the field. */
  geo?: { biomeDepth?: number; climate?: Record<string, number> };
  /** THE BLEND (engine/blend.ts): this zone interleaves a partner tileset's
   *  theme + kit + packs by a weight field — resolved at mint (from
   *  TilesetDef.blend or authored by the mint), DURABLE like theme/layout
   *  (revisits, saves, and co-op replay the identical composition). The
   *  layout rows and pack table on this def are ALREADY composed; the field
   *  itself compiles on demand wherever it's sampled (ground bake, findSpot
   *  gate, the 'blend' WHERE field). */
  blend?: BlendSpec;
  /** A PORT: the land ends here — a harbor zone on a continent's shore. Its
   *  dock opens the Sail menu (naval travel to other discovered ports /
   *  chart-a-course landfalls). Frontiers never mint past a port into open
   *  ocean; the sea itself is the road. */
  port?: boolean;
  /** THE SEA this port serves (world/seas.ts Sea.id) — baked at mint so the
   *  sail menu, zone-info, and lane law read the sea without re-filling.
   *  Islands carry their hosting sea too. Absent on legacy free-docked
   *  ports (they grandfather into landings but join no ring). */
  seaId?: string;
  /** PORT TIER (the sea's deliberate system): 'haven' = the sea's hub
   *  harbor (lane spokes converge, quay dressing at load); 'cove' = a
   *  landing. Absent = a plain legacy port. */
  portTier?: 'haven' | 'cove';
  /** THE HARBORHOLD (data/harborholds.ts): this mainland port is a walled
   *  quay-town with a siege lifecycle — found besieged, opened by breaking
   *  the siege, burned by losing one. The MUTABLE state rides here (pure
   *  JSON — persists with the zones array verbatim); identity (class row,
   *  services, timers) re-derives from data every read. Stamped only by
   *  ensureSeaPorts on sea spots — islands and legacy ports never carry it
   *  (bare quays by design). */
  harborhold?: HarborholdState;
  /** Which DIMENSION this zone belongs to (default 'surface'). The map shows
   *  one dimension per tab; frontiers inherit their source's dimension. */
  dimension?: string;
  /** THE ZONE DIRECTLY BELOW this one (a cloud shelf hangs over the land its
   *  geyser erupted from): `zoneId` is the ground a collapse-fall drops you
   *  to, `ax`/`ay` the point in THAT zone this zone's center hangs above —
   *  the anchor both the fall mapping and the understory capture share.
   *  Pure data (serializes verbatim); set by whatever mints the shelf. */
  below?: { zoneId: string; ax: number; ay: number };
  /** CAVE LADDER depth (caves only): 1 = a surface cave, each cave-within-a-
   *  cave one deeper. WHAT a depth means (its display band, level climb,
   *  deeper-mouth chance, dark floor, breach point) is the STRATA registry's
   *  business (world/strata.ts) — never hardcode the ladder's shape here.
   *  Presence IS the cave/off-graph discriminator (mintCave is the sole writer):
   *  categorize on `caveDepth != null`, never by sniffing the 'cave_' id prefix —
   *  the prefix survives only as a churn-id namespace for string-only classifiers
   *  over zones that may no longer exist (corpse records, save strips). */
  caveDepth?: number;
  /** PIT-CHAIN depth (pit-minted hollows only — the pitfall fabric): how many
   *  CONSECUTIVE pit-falls hang above this pocket. beginPitDescent stamps
   *  parent chain + 1 at mint; at PIT_CFG.dropCave.maxChain the player's
   *  falls stop descending (the classic edge-bite instead — the world runs
   *  out of down). Walking in through a real mouth mints no chain, so only
   *  chained DROPS are metered. Absent = 0. */
  pitChain?: number;
  /** NO WAY ON: this pocket minted with no way further down or sideways —
   *  no deeper-mouth roll, no Underworld breach, no descending hollow
   *  reveals, and generateLayout strips any sidezone ENTRANCE a face,
   *  variant or composition tries to place (the one chokepoint; the Descent
   *  Delver honors it too). Its own chasms may still drop, metered by
   *  pitChain above. Stamped by mintCave (CaveMintOpts.noDeeper). */
  noDeeper?: boolean;
  /** The SURFACE biome this underground ladder hangs beneath (caves only) —
   *  provenance for the strata fabric's cave-face pick, inherited rung to
   *  rung so a depth-3 gallery still knows it lives under volcanic country.
   *  mintCave stamps it from the parent's anchor ?? biome. */
  anchor?: string;
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
  /** BIOME-MELD annotations, index-aligned with `exits` — the meld id (data/
   *  melds.ts) of the DIFFERENT biome each exit faces, when that biome
   *  declares an edge dressing: the layout pipeline grows a band of the
   *  foreign kit along that edge ("you can see the jungle from here").
   *  TRANSIENT like exitBoundaries: stamped per-load by the World off the
   *  same heat-map prediction seam, never authored, never saved. */
  exitMelds?: (string | undefined)[];
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
  /** CAMERA PIN — force one camera mode here regardless of the player's Options
   *  pick (render/camera.ts registry: 'hero' locked-follow / 'zone' classic
   *  frame): a fixed-frame boss arena or a cinematic shelf declares itself.
   *  Omitted = the player's choice rules. A stale id degrades to the fabric
   *  default. (Type-only import — the registry stays a render concern.) */
  camera?: import('../render/camera').CameraModeId;
  /** Biome tag for faction-traits home matching ('grave' | 'grove' | 'rift'). */
  biome?: string;
  /** AQUATIC arena (stamped at mint from BiomeInfo.marine === 'deep', or
   *  authored on underwater defs): the whole floor is seabed. Habitat-bearing
   *  kinds (live kelp, coral) place freely — the water is ambient — and the
   *  DEFAULT gravel exit-road stands down (an ExitRoadSpec that authors its
   *  kind still lays). Durable on the def like `geo`, so revisits and co-op
   *  regenerate identically. */
  aquatic?: boolean;
  /** Sub-biome variant rolled at generation — a flavour within the biome
   *  (a jungle "clearing" vs "dense floor"). Cosmetic + layout, not faction.
   *  THE BARE-NAME LAW: this face is DATA, never baked into `name` — the
   *  playing field (portals, banners, event lines) wears the bare name only;
   *  the MAP pane's biome chip supplies this typing deliberately. The
   *  worldstate sanitizer strips legacy "(face)" names on restore. */
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
  /** THE QUICKENING's stamp (packages/overlays/quickening.ts): while a surge
   *  holds this ground, `level` above is the SURGED level and this block
   *  remembers how to put it back. Written and reverted ONLY by the engine's
   *  reconcile sweep (world.ts updateQuickening) off the overlay's live arcs
   *  — never authored, never hand-edited — and it serializes with the graph
   *  so a mid-window save resumes stamped (the overlay's own snapshot carries
   *  the clock; the sweep re-marries the two and reverts orphans either way).
   *  `key` = the owning arc's instance id; `baseLevel` = the true level the
   *  fade restores; `until` = the world-clock second the window closes (a
   *  display mirror — the overlay's clock is the authority). */
  quickened?: { key: string; baseLevel: number; until: number };
  /** A PURCHASED-POCKET dead-end (a Holdfast's earned ground): its only road
   *  leads back through the gate that sold it. The world web treats it as a
   *  cul-de-sac — never weave-linked, never an eager-web link target, never an
   *  anchor for other mints (worldgen honors this flag everywhere roads form),
   *  and world events never target it (zonePolicy.eventTargetable): the
   *  ground was bought for what the FORM promises, not for event roulette. */
  pocket?: boolean;
  /** WHICH SHAPE the purchased ground took (data/pocketForms.ts id), rolled
   *  once at mint and baked here: 'hoard' = the small loot-littered hollow,
   *  'delve' = the full hidden zone. Read at load for the treasure litter +
   *  ambient-event gate, and by the parley/zone-info pitch. Absent (an older
   *  save, an unregistered id) degrades to the default delve. */
  pocketForm?: string;
  /** SKY EXPOSURE — does the world's weather reach the ground here? Baked at
   *  mint from TilesetDef.sky / ZoneSpec.sky, or authored on a def directly.
   *  Omitted, skyOf() DERIVES it (off-surface dimensions and cave-ladder
   *  pockets are sheltered); an explicit value OVERRIDES the derivations in
   *  either direction (a roofless crater-cave may declare 'open'). */
  sky?: SkyExposure;
}

/** Sky-exposure vocabulary: 'open' feels the weather fabric end to end —
 *  fronts, directional wind, sky strikes, spawn bias, particles and wash —
 *  while 'sheltered' feels NONE of it. A zone's own authored fabrics
 *  (ZoneTheme.fog banks, creep, ambient FX) are untouched either way: the
 *  cellar keeps its stillness, a haunted cave keeps its mist. */
export type SkyExposure = 'open' | 'sheltered';

/** THE sky predicate — every weather consumer asks this ONE question (the
 *  world's strike/wind/fog/snow ticks via World.skyFront, the spawn bias,
 *  the zone-info chip, the renderer's particles). Priority: the def's own
 *  word > off-surface dimension (the underworld has its own sky) > the
 *  cave-ladder discriminator (caveDepth — every sidezone pocket: cellars,
 *  caves, sunken ruins, buried vaults) > open ground. Pure ZoneDef data —
 *  the tileset's say is BAKED at mint — so engine, sim, overlays and both
 *  co-op sides agree from a fresh mint, a save, or a snapshot alike. */
export function skyOf(zone: ZoneDef): SkyExposure {
  if (zone.sky) return zone.sky;
  // Off-surface ground derives its DIMENSION's declared exposure (the
  // underworld's roof of world vs the Aetherial's open heavens) — default
  // sheltered, the pre-registry behavior. Cave pockets shelter regardless
  // of whose dimension they hang in (an explicit def sky still overrides).
  if (zone.caveDepth != null) return 'sheltered';
  if ((zone.dimension ?? 'surface') !== 'surface') {
    return dimensionDef(zone.dimension).sky ?? 'sheltered';
  }
  return 'open';
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
    kind: 'town', // the identity lever (data/zoneKinds.ts): ring + glyph on the map, a card no label mode hides
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
      // THE WAKING HOUSE (data/structures.ts): where every run opens its
      // eyes — bedside spawn cell, confined vision, one teaching door. The
      // quiet north-west, clear of the square (the perf walk arcs the
      // center; the house must never lean on the town control's meter).
      { structure: 'waking_house', x: 210, y: 180 },
    ],
    objective: { kind: 'safe' },
    // THE TOWN'S SMALL LIVES (the Verminfall) — authored fauna spawns even on
    // safe ground: rats in the gutters, roaches at the cellar door, a squirrel
    // working the benches. Pure texture ('critter'-tagged, validator-enforced)
    // — and a LIVING GAUGE: while warrens fester in the near ring, the
    // VerminfallField's townPressure swells these rows. Home tells you.
    fauna: [
      { id: 'gutter_rat', chance: 0.85, count: [2, 4] },
      { id: 'gutter_roach', chance: 0.6, count: [2, 4] },
      { id: 'squirrel', chance: 0.5, count: [1, 2] },
    ],
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
