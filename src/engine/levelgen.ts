// ---------------------------------------------------------------------------
// Level generation — set-piece stamps composed into a layout.
//
// The terrain vocabulary is DOODADS: circles with a kind that decides how
// the engine treats them.
//
//   rock    blocks movement and projectiles (a boulder / tree)
//   cliff   same blocking, but stamped in woven runs that read as walls
//   mud     blocks nothing; actors wading through it move slowly
//   chasm   blocks movement but NOT projectiles — you can shoot across
//   bridge  negates chasm beneath it: the walkable span over the gap
//
// Stamps are the set pieces: a rock cluster, a winding cliff run, a mud
// patch, a chasm lake, a RAVINE that cuts across the map with bridges
// spanning it, and a ruin ring whose center is returned as a point of
// interest (spawner objects and gem caches nest there).
//
// Everything draws from one Rng, so a layout is one seed.
// ---------------------------------------------------------------------------

import { dist, vec, type Vec2 } from '../core/math';
import type { Rng } from '../core/rng';
import type { StampIgnoreRule, StampRuleOverride, StampSpec, ZoneDef } from '../data/zones';
import { STRUCTURES, legendCell, type CellSpec, type StructureDef } from '../data/structures';
import { runStructureGen } from './structureGen';
import type { Modifier } from './stats';
import type { WalkField } from '../world/walk';
import { GridWalkField } from '../world/gridWalk';
import { isFieldPixel } from '../world/fieldRegion';
// Safe despite genkit importing our types: those are `import type` edges,
// erased at runtime — no actual module cycle exists.
import { Mask, GEN_CELL } from './genkit';

export type KnownDoodadKind =
  | 'rock' | 'cliff' | 'chasm' | 'bridge' | 'wall'
  // Ground overlays: walkable, but standing in them applies a terrain
  // status (see World.updateTerrainEffects). Mud mires, swamps trudge,
  // bogs poison on entry, water slows by depth, ice steals your traction.
  | 'mud' | 'swamp' | 'bog' | 'water' | 'ice'
  // Flora & furnishing
  | 'tree'      // blocks movement and shots — a rock wearing a canopy
  | 'brush'     // walkable cover: standing in it CONCEALS you
  | 'grass'     // pure decoration — tufts and splotches
  | 'campfire'  // pure decoration — a flickering warm light
  | 'road'      // ground overlay: a walkable gravel path — a mild move-speed boost (no status)
  // Biome-expansion terrain (batch 6)
  | 'sand'      // ground overlay: wind-blown grit that slows like mud
  | 'vines'     // blocks movement but NOT shots — a jungle wall you fire through
  | 'thicket'   // blocks movement AND shots — dense impassable bramble
  | 'tombstone' // blocks movement AND shots — a crypt marker
  | 'palm'      // blocks both — a tree variant (beach/jungle canopy)
  | 'lava'      // blocks movement but NOT shots — molten, like a chasm
  | 'cave_entrance' // blocks nothing — a transition trigger into a cave sub-zone
  | 'ritual_pentagram' // blocks nothing — a Conclave ritual circle (walkable; cultists ring it)
  | 'tentacle_field' // ground overlay: an Eldritch tentacle patch that ensnares on entry
  | 'crystal'   // blocks both — a faceted shard that periodically fires a laser beam
  | 'lava_vent' // blocks movement not shots — a volcanic vent that launches lava orbs
  // Flesh biome ("Belly of the Beast") themed doodads
  | 'flesh_pod' // blocks both — a bulbous organic sac/polyp growing from the meat
  | 'bone'      // blocks both — a pale ribcage/spine strut jutting from the flesh
  | 'gore'      // ground overlay: a viscera pool (decoration; no terrain effect)
  // Volcanic biome themed doodads
  | 'obsidian'  // blocks both — a glassy black volcanic shard
  | 'cinder'    // ground overlay: an ash/ember patch (decoration)
  | 'ember_vent' // blocks movement not shots — a SMALL vent: a single lava orb, not a volley
  // Descent ("the abyss") themed doodads
  | 'light_spot'   // trigger: a glowing crystalline cluster — run over for a burst of Light
  | 'void_chasm'   // blocks movement not shots, stamped fall:true — a gaping abyss pit (void recovery)
  | 'ruin_obelisk' // blocks both — an ancient cursed monolith that lashes nearby intruders (trap)
  | 'descent_platform' // trigger: the mineshaft platform — dwell to descend / climb out
  // Marine / deep-sea themed doodads
  | 'kelp'         // walkable cover: a swaying kelp frond field (decorative)
  | 'coral'        // blocks both — a vibrant branching coral head
  | 'sea_rock'     // blocks both — a barnacled rocky outcropping
  // Mycelia ("The Bloom") fungal biome doodads
  | 'giant_mushroom' // blocks both — a towering capped stalk (a tree of fungus)
  | 'spore_pod'      // blocks movement not shots — a bulbous sac that PUFFS a spore cloud
  | 'glow_cap'       // ground overlay: a small bioluminescent cap (decoration + light)
  | 'mycelial_mat'   // ground overlay: a glowing hyphal carpet (the spore-density tell underfoot)
  | 'fruiting_tower' // blocks both — a towering fungal spire raised at HIGH spore density
  // Plan-structure furniture (placeStructurePlan emits these; never scattered)
  | 'door'    // blocks everything while closed; open/broken = walk/shoot/see through
  | 'window'  // an arrow-slit frame: blocks movement, passes shots + sight
  | 'dock'    // a port's harbor planks — dwell to cast off (the Voyage)
  | 'breach'  // the torn way into the Underworld (bottom of the cave ladder)
  | 'landmass'    // the Voyage's streamed COASTLINE (a shore-collision blob)
  | 'isle_beacon'; // a Voyage Island's guiding light + name (pure signage)

/** Open doodad vocabulary: the known kinds keep autocomplete + the exhaustive
 *  DOODAD_RULES row check, while a package/structure/legend kind registered via
 *  registerDoodadRule rides the same field (the renderer falls back to a generic
 *  disc for kinds it has no bespoke branch for). Same widening idiom as StampKind. */
export type DoodadKind = KnownDoodadKind | (string & {});

/** A periodic AREA INTERACTION a doodad can carry — the doodad-effect framework.
 *  Generic + extensible: a new effect is one registry handler (see world.ts
 *  doodadEffects) keyed on `id`; the handler interprets `power` for its kind
 *  (damage for an Eldritch tentacle SWING, heal for a Thicket pulse, …). `faction`
 *  is whose side the effect serves, so it only ever touches OPPONENTS, never allies.
 *  Assigned at zone-gen for permanent effects, or dynamically at runtime (the
 *  Eldritch doodad_mutation event grafts the swing onto existing doodads). */
export interface DoodadEffect {
  /** Registry id selecting the behavior (world.ts doodadEffects). */
  id: string;
  /** The side this effect serves. */
  faction?: string;
  /** Who the effect reaches for, resolved by the shared target scan: 'opponent'
   *  (the default — the player or a non-`faction` enemy, e.g. a tentacle SWING) or
   *  'ally' (a `faction` member, e.g. a Thicket pulsing HEAL to its Sylvan kin). */
  target?: 'opponent' | 'ally';
  /** Seconds between attempts. */
  interval: number;
  /** Live countdown, managed by the engine tick (omit at authoring). */
  cd?: number;
  /** Reach of the interaction (node/world units). For a beam, the beam LENGTH. */
  radius: number;
  /** Beam effects only: half-thickness of the damage band along the ray. */
  width?: number;
  /** Per-attempt chance it actually fires (the "not every time" knob). */
  chance: number;
  /** Magnitude — interpreted per effect (swing damage, heal amount, …). */
  power: number;
  // --- VOLLEY fields (the lava-orb eruption): a doodad ERUPTS a ring of impacts
  // AROUND its own epicenter, like a volcano firing off its vent. All optional so
  // existing effects (tentacle_swing, crystal_beam) and authoring are untouched.
  /** Impacts launched per eruption (default 1 — a single orb). */
  count?: number;
  /** Distance from the source the ring of impacts lands at (defaults to `radius`).
   *  This is what makes it erupt AROUND the vent, not anywhere in the zone. */
  ringRadius?: number;
  /** Random ± applied to each impact's ring distance, so the crown isn't perfect. */
  jitter?: number;
  /** Seconds added per successive impact's fuse, so the volley ripples outward. */
  stagger?: number;
  /** Splat AoE radius of each impact (lava-orb default 86). */
  blast?: number;
}

export interface Doodad {
  pos: Vec2;
  radius: number;
  kind: DoodadKind;
  /** Bridges: orientation of the span (for plank rendering). */
  dir?: number;
  /** Water only: a ford — always wading-depth, never swimming. */
  shallow?: boolean;
  /** Vegetation/rock random spin (radians), set at stamp time from the seeded
   *  layout rng — so a place keeps its orientations across revisits. */
  rot?: number;
  /** A silhouette adornment grafted onto the doodad (e.g. 'tentacles' from an
   *  Eldritch mutation). Purely visual; replicated to co-op clients on zone load
   *  (a mid-zone mutation shows for a guest already inside only on re-entry). */
  adorn?: string;
  /** A ticking AREA effect this doodad carries (the doodad-effect framework). */
  effect?: DoodadEffect;
  /** A 'chasm' marked FALL-ABLE (Phase 3): instead of just blocking at its rim, a
   *  move arrested here reports a 'void' collision → the void RegionKind's recovery
   *  (respawn-on-edge + damage). Default (absent) = today's blocking chasm. Per-chasm
   *  data, so a generator chooses which gaps are lethal. */
  fall?: boolean;
  /** GEN-TIME ONLY: placed by a rule-breaker stamp that ignored 'portalClear' —
   *  the convex portal-clear splice spares it (deliberate portal furniture). */
  keep?: boolean;
  /** LANDMASS (kind 'landmass', the Voyage's streamed coastline): which land
   *  this shore sample belongs to — the renderer tints it by biome, a bridge
   *  sample reads as a walkable sand isthmus, and an islandId marks a VOYAGE
   *  ISLAND's shore (landing routes to that island's own zone). */
  land?: { biome: string; bridge: boolean; islandId?: string };
  /** A short caption drawn with the doodad (an island beacon's name). */
  label?: string;
  /** DOOR state (kind 'door'): openable/breakable structure doors. The blocking
   *  derivations (blocksMovement/-Projectiles/-SightOf) consult `open`, so one
   *  state flip opens the way for movement, shots, and AI vision at once. */
  door?: DoodadDoor;
}

/** The live state a door doodad carries. Ids are deterministic per zone seed
 *  (`<structureId>/d<n>`), which is what lets Zone Memory + co-op re-apply
 *  states onto a regenerated layout. */
export interface DoodadDoor {
  id: string;
  mode: 'dwell' | 'breakable' | 'both' | 'sealed';
  open?: boolean;
  broken?: boolean;
  /** World rect of the door's plan cells — repainted to floor when it opens. */
  cells?: { x: number; y: number; w: number; h: number };
  /** Breakable doors: the door-actor's life override (else level-scaled). */
  life?: number;
  /** Dwell-to-open seconds override (else the DOORS config default). */
  dwell?: number;
}

/** A garrisonable position inside a placed structure (a tower core). AI claims
 *  a slot via the 'garrison' verb: teleports/walks in, holds it (anchored),
 *  wears the slot's mods while inside. Occupancy is host-authoritative and
 *  SELF-HEALING (dead/absent occupant ids are dropped on each evaluation). */
export interface PlacedSlot {
  id: string;
  pos: Vec2;
  kind: string;
  capacity: number;
  mods?: Modifier[];
  entry: 'teleport' | 'walk';
  /** Claim reach: how far away an AI may notice + claim this slot. */
  leash?: number;
  occupants: number[];
}

/** A door's placement record (the structure-level view of a door doodad). */
export interface PlacedDoor {
  door: DoodadDoor;
  pos: Vec2;
  /** Outward unit normal — where the door's APRON (guaranteed-clear approach
   *  ground outside the doorway) lies. */
  normal: Vec2;
}

/** A structure raised into a zone: its true rect footprint, roof rects (merged
 *  from the plan's interior cells), doors, and garrison slots. Persisted on the
 *  layout → World.structures → ZoneMsg, so renderers (roof reveal), AI
 *  (garrison), and interactions (doors) all read ONE record. */
export interface PlacedStructure {
  id: string;
  defId: string;
  rect: { x: number; y: number; w: number; h: number };
  cellSize: number;
  roofs: { x: number; y: number; w: number; h: number }[];
  roofStyle: string;
  doors: PlacedDoor[];
  slots: PlacedSlot[];
}

export interface GeneratedLayout {
  doodads: Doodad[];
  /** Set-piece centers (ruin interiors, camp yards) — where POIs live. */
  pois: Vec2[];
  /** Walled-camp centers (each gets a guard pack). */
  camps: Vec2[];
  /** Destructible clutter to spawn (barrels, crates) — monster ids. */
  breakables: { id: string; pos: Vec2 }[];
  /** Friendly scenery folk to spawn (the smith at her forge). */
  npcs: { id: string; pos: Vec2 }[];
  /** Pre-inhabited POIs: a faction guard pack posts at each footprint. */
  garrisons: { pos: Vec2; faction: string; size: [number, number] }[];
  /** Cave-mouth seeds, one per 'cave_entrance' doodad (same push order). */
  caveSeeds: number[];
  /** PHASE-2 SEAM (see world/walk.ts): a non-convex layout's walkability model.
   *  Undefined for the convex layouts (plains, bridge-islands) — those rely on the
   *  classic bounds-minus-blocking-discs model in World.clampPos. A true island/
   *  maze/rooms generator will populate this so clampPos / samplers / AI program
   *  against the WalkField instead of the rect/ellipse hull. */
  walk?: WalkField;
  /** Air-pocket discs (underwater zones): centre + radius, surfaced so the renderer
   *  can draw a clean circular wash + rising bubbles over the chunky grid cells. */
  airPockets?: { x: number; y: number; r: number }[];
  /** Plan structures raised in this zone (rects/roofs/doors/slots) — see
   *  PlacedStructure. Absent when the zone rolled none. */
  structures?: PlacedStructure[];
  /** Deliberately foot-unreachable areas (jump/blink pockets) — spawn policy +
   *  the reachability invariant read these; the renderer may hint them. */
  pockets?: { x: number; y: number; r: number }[];
  /** Landmark-seeded entities (pit dwellers) — loadZone spawns them with the
   *  base population (memory-captured like every other resident). */
  landmarkSpawns?: { id: string; pos: Vec2 }[];
}

// PLACEMENT RULES — the single per-kind registry that decides everything about how
// a doodad PLACES and COLLIDES, so adding a kind is ONE row, not edits across four
// hand-synced lists (the old OVERLAP_SOLID + blocksMovement + blocksProjectiles +
// scattered spacing/areaFreeOf literals). Pure data; everything below derives from it.
//
//   overlap : 'solid'  — spaced off other solids; in a grid zone it must land on
//                        walkable ground (no boulder embedded in a wall).
//             'ground' — a terrain overlay (mud/water/lava): merges freely, gates
//                        nothing. (walkOnly opts a decorative overlay onto walkable
//                        ground so it stays inside carved chambers.)
//             'inert'  — blocks the body (chasm/vines) but never participates in the
//                        solid-overlap check (preserves today's placement exactly).
//             'trigger'— a non-blocking interaction point (cave mouth) kept on
//                        walkable ground.
//   spacing  — min gap from other SOLIDS when placed via findSpot.
//   forbidOn — ground kinds this may NOT sit inside (a vent won't spawn in a lake).
//   walkOnly — in a GRID zone, reject non-walkable cells (defaults true for
//              solids/triggers; ground/inert opt in).
type OverlapClass = 'solid' | 'ground' | 'inert' | 'trigger';
export interface DoodadRule {
  overlap: OverlapClass;
  blocksMove?: boolean;
  blocksShot?: boolean;
  /** Blocks LINE OF SIGHT (AI vision) independently of shots. Defaults to
   *  blocksShot, so every existing kind keeps today's behavior; a WINDOW frame
   *  sets blocksMove true + blocksSight false (see through, walk into). */
  blocksSight?: boolean;
  spacing?: number;
  forbidOn?: DoodadKind[];
  walkOnly?: boolean;
  /** Renderer occlusion (fake-2D depth): when the LOCAL hero stands within
   *  `radius + pad` of this doodad, its draw fades toward `alpha` so the
   *  character reads through the canopy. Data-driven per kind. */
  occlude?: { pad?: number; alpha?: number };
  /** This kind is INDEX-PAIRED with a parallel gen-list (cave_entrance ↔
   *  caveSeeds): only its dedicated stamp may emit it — clusters/legends/fx
   *  layers are validator-forbidden from placing it (the zip would shear). */
  seedPaired?: boolean;
  /** ENGULFING terrain: when a stamp lays this kind, earlier solids/triggers
   *  its discs cover are spliced (a boulder hovering over a fresh chasm is a
   *  draw error). FALSE keeps the lapping look (a pool around its boulders).
   *  Deliberate overlaps stay available via stamp rule-breakers (`keep`). */
  swallowsSolids?: boolean;
}

const DOODAD_RULES: Record<KnownDoodadKind, DoodadRule> = {
  // Solids (must not pile on each other; walk-gated in grid zones). Spacings are
  // migrated verbatim from the old per-stamp literals so existing zones don't shift.
  rock:      { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 30 },
  cliff:     { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 40 },
  wall:      { overlap: 'solid', blocksMove: true, blocksShot: true },
  // Canopy kinds (occlude): their crowns draw ABOVE actors and FADE when the
  // hero stands under them — the fake-2D depth layer (renderer drawCanopies).
  tree:      { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 18, occlude: { pad: 10, alpha: 0.3 } },
  palm:      { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 18, occlude: { pad: 10, alpha: 0.3 } },
  thicket:   { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 28, occlude: { pad: 12, alpha: 0.35 } },
  tombstone: { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 22 },
  // Hazard solids — now also kept OUT of pools/pits (the QA fix) and apart enough to
  // read as distinct shards/vents (crystal bumped 30→60 so two never near-touch).
  crystal:   { overlap: 'solid', blocksMove: true, blocksShot: true,  spacing: 60, forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'] },
  lava_vent: { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 44, forbidOn: ['water', 'chasm'] },
  // Ground overlays — terrain that merges freely. chasm/lava/vines BLOCK but stay
  // 'inert'/'ground' in the overlap check (today's behaviour).
  // A chasm ENGULFS what it cuts through (a boulder can't hover over the
  // void); lava/water keep the lapping look (boulders shoulder out of pools).
  chasm:     { overlap: 'inert',  blocksMove: true,  blocksShot: false, swallowsSolids: true },
  lava:      { overlap: 'inert',  blocksMove: true,  blocksShot: false },
  vines:     { overlap: 'inert',  blocksMove: true,  blocksShot: false },
  bridge:    { overlap: 'ground' },
  mud:       { overlap: 'ground' },
  swamp:     { overlap: 'ground' },
  bog:       { overlap: 'ground' },
  water:     { overlap: 'ground' },
  ice:       { overlap: 'ground' },
  sand:      { overlap: 'ground' },
  road:      { overlap: 'ground', walkOnly: true }, // a walkable gravel path (stays on walkable ground in grid zones)
  grass:     { overlap: 'ground' },
  brush:     { overlap: 'ground' },
  campfire:  { overlap: 'ground' },
  ritual_pentagram: { overlap: 'ground' },
  tentacle_field:   { overlap: 'ground' },
  cave_entrance:    { overlap: 'trigger', spacing: 40, seedPaired: true },
  // Flesh themed doodads (walk-gated so they land inside the carved chambers).
  flesh_pod: { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 36 },
  bone:      { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 26 },
  gore:      { overlap: 'ground', walkOnly: true },
  // Volcanic themed doodads.
  obsidian:   { overlap: 'solid', blocksMove: true, blocksShot: true,  spacing: 34, forbidOn: ['water', 'lava', 'chasm'] },
  cinder:     { overlap: 'ground', walkOnly: true },
  ember_vent: { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 32, forbidOn: ['water', 'chasm'] },
  // Descent doodads. light_spot/descent_platform are non-blocking triggers (touched
  // by the engine); void_chasm is an inert fall pit (reports 'void' → recovery);
  // ruin_obelisk is a solid that carries a lashing trap DoodadEffect.
  light_spot:       { overlap: 'trigger', spacing: 60 },
  void_chasm:       { overlap: 'inert', blocksMove: true, blocksShot: false, swallowsSolids: true },
  ruin_obelisk:     { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 46 },
  descent_platform: { overlap: 'trigger', spacing: 40 },
  // Marine: kelp is walkable cover (decorative); coral + sea rocks are solids.
  kelp:     { overlap: 'ground', walkOnly: true },
  coral:    { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 30 },
  sea_rock: { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 40 },
  // Mycelia fungal doodads. giant_mushroom/fruiting_tower are tree-like solids; spore_pod
  // is an active puffer (blocks move not shots, like lava_vent); glow_cap/mycelial_mat are
  // walkable ground overlays (decoration + the spore carpet).
  giant_mushroom: { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 42, occlude: { pad: 12, alpha: 0.3 } },
  fruiting_tower: { overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 54, occlude: { pad: 12, alpha: 0.3 } },
  spore_pod:      { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 38, forbidOn: ['water', 'lava', 'chasm', 'bog'] },
  glow_cap:       { overlap: 'ground' },
  mycelial_mat:   { overlap: 'ground', walkOnly: true },
  // Plan-structure furniture. A closed door blocks EVERYTHING; the derivations
  // below consult Doodad.door state, so opening/breaking it clears movement,
  // shots, and sight in one flip. A window passes shots + sight, never bodies.
  door:   { overlap: 'solid', blocksMove: true, blocksShot: true, blocksSight: true },
  window: { overlap: 'solid', blocksMove: true, blocksShot: false, blocksSight: false },
  dock:   { overlap: 'trigger', spacing: 40 },
  breach: { overlap: 'trigger', spacing: 60 },
  // The Voyage's streamed coastline: the boat can't drive ashore, but a
  // shot arcs over the shallows (sight too — you can see the beach you round).
  landmass: { overlap: 'inert', blocksMove: true, blocksShot: false },
  isle_beacon: { overlap: 'trigger', spacing: 0 },
};

/** Rules registered at runtime for NEW kinds (packages, structure legends, fx
 *  layers) — the open half of the vocabulary. Known kinds stay in the exhaustive
 *  table above so tsc still proves full coverage for the built-ins. */
const RUNTIME_RULES: Record<string, DoodadRule> = {};

/** Register a placement/collision rule for a NEW doodad kind (one row = the kind
 *  exists engine-wide; the renderer draws unknown kinds as a generic themed disc
 *  until given a bespoke branch). Warns on collision so two packages can't
 *  silently fight over one id. */
export function registerDoodadRule(kind: string, rule: DoodadRule): void {
  if ((DOODAD_RULES as Record<string, DoodadRule>)[kind] || RUNTIME_RULES[kind]) {
    console.warn(`[doodads] re-registering rule for '${kind}' — overriding`);
  }
  RUNTIME_RULES[kind] = rule;
}

/** The placement rule for a kind (a safe non-blocking ground default if unlisted). */
function doodadRule(kind: DoodadKind): DoodadRule {
  return (DOODAD_RULES as Record<string, DoodadRule>)[kind] ?? RUNTIME_RULES[kind] ?? { overlap: 'ground' };
}

/** Public accessor for consumers outside the generator (renderer occlusion,
 *  validators) — same resolution as the internal lookup. */
export function doodadRuleOf(kind: DoodadKind): DoodadRule { return doodadRule(kind); }

/** Does the kind have a REGISTERED rule (built-in or runtime)? Validators use
 *  this to catch typo'd legend/fx kinds, which would otherwise silently fall
 *  to the walkable 'ground' default and lose their blocking/hazard nature. */
export function hasDoodadRule(kind: string): boolean {
  return kind in DOODAD_RULES || kind in RUNTIME_RULES;
}

export function blocksMovement(d: Doodad): boolean {
  if (d.door?.open || d.door?.broken) return false; // an open doorway is a doorway
  return !!doodadRule(d.kind).blocksMove;
}
export function blocksProjectiles(d: Doodad): boolean {
  if (d.door?.open || d.door?.broken) return false;
  return !!doodadRule(d.kind).blocksShot;
}
/** Blocks AI line of sight — defaults to the shot rule so existing kinds are
 *  untouched; windows opt out (see through what you cannot walk through). */
export function blocksSightOf(d: Doodad): boolean {
  if (d.door?.open || d.door?.broken) return false;
  const r = doodadRule(d.kind);
  return r.blocksSight ?? !!r.blocksShot;
}

/** A solid doodad rejects placement overlapping other solids (but not ground). */
function isSolid(kind: DoodadKind): boolean { return doodadRule(kind).overlap === 'solid'; }

/** Should this kind be kept on WALKABLE ground in a grid zone? Solids/triggers
 *  always; ground/inert overlays only when they opt in via walkOnly. */
function walkGated(kind: DoodadKind): boolean {
  const rule = doodadRule(kind);
  return rule.walkOnly ?? (rule.overlap === 'solid' || rule.overlap === 'trigger');
}

/** Does this disc overlap any SOLID doodad placed BEFORE index `before`? Cluster
 *  stamps (grove, thicket) use this to keep their pieces out of pre-existing
 *  rocks/trees from earlier stamps, while still letting their OWN pieces pack
 *  tightly (those live at/after `before`, so they're excluded). */
function overlapsSolidBefore(ctx: GenCtx, p: Vec2, r: number, before: number): boolean {
  for (let i = 0; i < before; i++) {
    const d = ctx.doodads[i];
    if (isSolid(d.kind) && dist(p, d.pos) < r + d.radius) return true;
  }
  return false;
}

/** The generation scratch space a layout generator works in: the seeded rng, the
 *  arena box, the portals to keep clear, and the growing doodad/POI/etc. lists it
 *  appends to. Exported so a new layout family can be authored as a generator that
 *  uses the stamp toolbox (stampRavine, findSpot, …) just like the built-ins. */
/** A footprint later stamps route around: the legacy CIRCLE (camps, ruins, the
 *  classic placeStructure — kept verbatim so existing zones' findSpot accept/
 *  reject sequences never shift) or a true RECT (the plan-structure path, which
 *  stops the circle-slop smushing on big rectangular castles). */
export type Reservation =
  | { pos: Vec2; radius: number }
  | { rect: { x: number; y: number; w: number; h: number }; margin?: number };

export interface GenCtx {
  rng: Rng;
  arena: { w: number; h: number };
  entry: Vec2;
  exits: Vec2[];
  doodads: Doodad[];
  pois: Vec2[];
  camps: Vec2[];
  breakables: { id: string; pos: Vec2 }[];
  npcs: { id: string; pos: Vec2 }[];
  garrisons: { pos: Vec2; faction: string; size: [number, number] }[];
  caveSeeds: number[];
  /** Structure footprints (camps, ruins): later stamps route around them. */
  reserved: Reservation[];
  /** TRANSIENT: the running stamp's rule relaxations (set by stamp() around each
   *  handler call, read by clearOf/inReserved/findSpot) — how ONE spec opts out
   *  of individual placement gates without threading params through every stamp. */
  ruleOver?: StampRuleOverride;
  /** Plan structures raised so far (placeStructurePlan appends). */
  structures?: PlacedStructure[];
  /** The walk grid was LAZILY created by a plan structure in an otherwise-convex
   *  zone (ensureGrid) — the convex portal-clear splice must still run, because
   *  the scatter stamps that ran before the grid existed were never exit-aware. */
  gridEnsured?: boolean;
  /** Extra points the UNIVERSAL reachability invariant must connect to the
   *  entry (landmark anchors, objective set-pieces) — beyond the always-checked
   *  exits/POIs/camps/garrisons/door-aprons. */
  mustReach?: Vec2[];
  /** Deliberately FOOT-UNREACHABLE areas (Pillars-of-Arun jump/blink pockets):
   *  the reachability invariant SKIPS required points inside these — an
   *  unreachable pocket is the feature, not a defect. Spawning policy rides
   *  the landmark that declared the pocket. */
  pockets?: { x: number; y: number; r: number }[];
  /** Entities a landmark seeded (pit dwellers), resolved at gen — loadZone
   *  materializes them inside the memory-tagging window (base population). */
  landmarkSpawns?: { id: string; pos: Vec2 }[];
  /** A non-convex generator sets this; generateLayout passes it through to the
   *  returned GeneratedLayout.walk (the Phase-2 walkability seam). */
  walk?: WalkField;
  /** Air-pocket discs an underwater generator records, for the renderer's bubbles. */
  airPockets?: { x: number; y: number; r: number }[];
}

/** A whole-zone LAYOUT GENERATOR: given the prepared context (rng/arena/portals,
 *  with fixtures already stamped + reserved) it lays out the zone's terrain by
 *  appending doodads/pois/etc. to ctx. The classic stamp-scatter is the 'plains'
 *  generator; islands/maze/rooms register their own. Keep it seed-deterministic —
 *  it must reproduce identically across revisits, reloads, and co-op clients. */
export type LayoutGenerator = (ctx: GenCtx, def: ZoneDef) => void;

const LAYOUT_GENERATORS: Record<string, LayoutGenerator> = {};

/** Register a layout generator under an open-string id (default 'plains'). */
export function registerLayout(id: string, gen: LayoutGenerator): void {
  LAYOUT_GENERATORS[id] = gen;
}

/** Is a layout id registered? (Boot validation for biome allowedLayouts refs.) */
export function hasLayout(id: string): boolean {
  return id in LAYOUT_GENERATORS;
}

/** A layout-generator KNOB, resolved from the zone's merged layoutParams
 *  (spec ▷ tileset ▷ biome, baked at mint) — how ONE recipe serves a spiral
 *  cauldron, a winding road, and an open expanse without forking. */
export function layoutParam<T>(def: ZoneDef, key: string, dflt: T): T {
  const v = def.layoutParams?.[key];
  return v === undefined ? dflt : (v as T);
}

/** PLAINS — the classic layout: walk the def.layout StampSpec[] and scatter each
 *  set-piece over the convex floor. This is the byte-identical default; extracting
 *  it changes nothing for any existing zone. */
function plainsLayout(ctx: GenCtx, def: ZoneDef): void {
  for (const spec of def.layout) {
    const n = ctx.rng.int(spec.count[0], spec.count[1]);
    for (let i = 0; i < n; i++) stamp(ctx, spec);
  }
}
registerLayout('plains', plainsLayout);

/** ISLANDS (the convex-compatible PROOF generator) — carve the convex floor into
 *  lobes with chasm INLETS (each bridged) and pool a sea of water + shallow shores
 *  between them, then lay the tileset's own decoration (palms/rocks/grass) on the
 *  land. The cuts are PARTIAL (stampRavine spans ~0.22-0.34 of the zone), so the
 *  floor stays ONE connected piece — you walk around an inlet's end or cross its
 *  bridge — which is why it needs no walkability model yet. The discrete
 *  islands-in-OPEN-sea + push-into-void-damage version is Phase 2 (it sets
 *  GeneratedLayout.walk). This proves registry + biome→layout + policy end-to-end. */
function islandsLayout(ctx: GenCtx, def: ZoneDef): void {
  const { rng, arena } = ctx;
  const span = Math.min(arena.w, arena.h);
  // Chasm inlets + bridges — 2-4 scaled by zone size (stampRavine self-limits near
  // portals + reserved fixtures and always bridges a long-enough cut).
  const cuts = 2 + (span > 1400 ? 1 : 0) + (rng.chance(0.5) ? 1 : 0);
  for (let i = 0; i < cuts; i++) stampRavine(ctx);
  // A shallow sea between the lobes: deep pools + wadeable shores (island feel,
  // still walkable — water only slows, per the convex model).
  const pools = rng.int(2, 4);
  for (let i = 0; i < pools; i++) stampBlob(ctx, 'water', [44, 80], [6, 12], false);
  const shores = rng.int(2, 3);
  for (let i = 0; i < shores; i++) stampShallows(ctx);
  // Then the tileset's authored decoration scatters on the land (data-driven).
  plainsLayout(ctx, def);
}
registerLayout('islands', islandsLayout);

/** DESCENT — the boundless abyss's STARTER patch (the engine streams more terrain
 *  around the player as they delve, see World.updateDescent). CONVEX (sets no walk
 *  field) so the boundless zone needs no walk-grid: claustrophobic rock pillars +
 *  glowing crystalline light spots (respite) + gaping void pits (fall) + a rare
 *  cursed obelisk (a lashing trap). Hazards are kept clear of the entry so the
 *  player never drops onto a pit. Seed-deterministic like every generator. */
function descentLayout(ctx: GenCtx, def: ZoneDef): void {
  const { rng, entry } = ctx;
  const clearOfEntry = (p: Vec2, gap: number): boolean => dist(p, entry) >= gap;
  // Rock pillars — cover that boxes you in (the claustrophobia).
  for (let i = 0; i < 16; i++) {
    const r = rng.range(26, 62);
    const p = findSpot(ctx, r, false, doodadRule('rock').spacing ?? 0, true, 'rock');
    if (p && clearOfEntry(p, 120)) ctx.doodads.push({ pos: p, radius: r, kind: 'rock', rot: rng.range(-0.4, 0.4) });
  }
  // Glowing crystalline clusters — light spots (brief respite). Some near the entry.
  for (let i = 0; i < 5; i++) {
    const r = rng.range(15, 24);
    const p = findSpot(ctx, r, false, doodadRule('light_spot').spacing ?? 0, true, 'light_spot');
    if (p) ctx.doodads.push({ pos: p, radius: r, kind: 'light_spot' });
  }
  // Gaping void pits — fall hazard (reuses the void RegionKind's recovery).
  for (let i = 0; i < 4; i++) {
    const r = rng.range(38, 80);
    const p = findSpot(ctx, r, false, 28, true, 'void_chasm');
    if (p && clearOfEntry(p, 240)) ctx.doodads.push({ pos: p, radius: r, kind: 'void_chasm', fall: true });
  }
  // A cursed obelisk or two — an ancient ruin that lashes nearby intruders.
  for (let i = 0; i < 2; i++) {
    const r = rng.range(20, 28);
    const p = findSpot(ctx, r, false, doodadRule('ruin_obelisk').spacing ?? 0, true, 'ruin_obelisk');
    if (p && clearOfEntry(p, 260)) {
      ctx.doodads.push({ pos: p, radius: r, kind: 'ruin_obelisk',
        effect: { id: 'descent_trap', interval: 2.6, radius: 130, chance: 0.85, power: 8 } });
    }
  }
}
registerLayout('descent', descentLayout);

/** BASTION — the zone IS a structure: one large plan structure (castle,
 *  fortress, labyrinth) raised at the arena center, the tileset's own
 *  decoration scattered around it. The candidate pool comes from the ZONE'S
 *  structure-roll DATA (def.structures entries whose defs carry a `bastion`
 *  weight) — never a literal id list, so a biome curates its own bastions
 *  (a chance of 0 marks a def as bastion-only, never scatter-rolled). */
function bastionLayout(ctx: GenCtx, def: ZoneDef): void {
  const pool = (def.structures ?? [])
    .map(r => STRUCTURES[r.structure])
    .filter((s): s is StructureDef => !!s && !!s.bastion && !!(s.plan || s.generator));
  if (!pool.length) {
    console.warn(`[structures] bastion layout on '${def.id}' with no bastion-capable structure rolls — plains fallback`);
    plainsLayout(ctx, def);
    return;
  }
  const total = pool.reduce((a, s) => a + s.bastion!.weight, 0);
  let roll = ctx.rng.range(0, total);
  let chosen = pool[pool.length - 1];
  for (const s of pool) { roll -= s.bastion!.weight; if (roll <= 0) { chosen = s; break; } }
  placeStructurePlan(ctx, chosen, vec(ctx.arena.w / 2, ctx.arena.h / 2));
  // The tileset's own decoration dresses the grounds around the bastion.
  plainsLayout(ctx, def);
}
registerLayout('bastion', bastionLayout);

/** An L-shaped corridor (horizontal then vertical) carved walkable into the grid. */
function tunnel(grid: GridWalkField, a: { cx: number; cy: number }, b: { cx: number; cy: number }, halfW: number): void {
  grid.carveCorridor(a.cx, a.cy, b.cx, a.cy, halfW);
  grid.carveCorridor(b.cx, a.cy, b.cx, b.cy, halfW);
}

/** A WINDING corridor carved walkable: marches a→b but bows sideways with a coherent
 *  curve plus organic jitter, so the passage SNAKES like a gut instead of the
 *  rectilinear L of tunnel(). Always finishes straight into b, so connectivity holds.
 *  (Works in WORLD coordinates — carveCorridor paints world-space cells.) */
function carveWander(grid: GridWalkField, a: Vec2, b: Vec2, halfW: number, rng: Rng): void {
  const total = Math.hypot(b.x - a.x, b.y - a.y);
  const segs = Math.max(2, Math.round(total / 110));
  const perp = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
  const bow = rng.range(-0.28, 0.28) * total; // one coherent sideways curve per tube
  let prev = a;
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    const off = Math.sin(t * Math.PI) * bow + rng.range(-14, 14); // bow envelope + jitter
    const x = a.x + (b.x - a.x) * t + Math.cos(perp) * off;
    const y = a.y + (b.y - a.y) * t + Math.sin(perp) * off;
    grid.carveCorridor(prev.x, prev.y, x, y, halfW);
    prev = vec(x, y);
  }
  grid.carveCorridor(prev.x, prev.y, b.x, b.y, halfW);
}

/** ROOMS+TUNNELS (the "maggot lair" — the Phase-2 NON-CONVEX proof). Paints a
 *  GridWalkField: rectangular rooms joined by corridors into ONE connected
 *  component, with a room+spur carved at the entry and every exit so portals
 *  always sit on reachable ground. The walkable region is now the EXCEPTION (not
 *  the whole box), so this is the first generator that genuinely needs the grid:
 *  clampPos confines actors to it, AI paths the corridors, spawns land only on it.
 *  Sets ctx.walk; the renderer paints the non-walkable cells as wall/void. */
function roomsLayout(ctx: GenCtx, _def: ZoneDef): void {
  const { rng, arena } = ctx;
  const grid = new GridWalkField(arena.w, arena.h, 30);
  const M = 70;
  const rooms: { cx: number; cy: number }[] = [];
  const n = rng.int(5, 8);
  for (let i = 0; i < n; i++) {
    const rw = rng.range(240, 440), rh = rng.range(220, 380);
    const cx = rng.range(M + rw / 2, Math.max(M + rw / 2, arena.w - M - rw / 2));
    const cy = rng.range(M + rh / 2, Math.max(M + rh / 2, arena.h - M - rh / 2));
    grid.fillRect(cx - rw / 2, cy - rh / 2, cx + rw / 2, cy + rh / 2, true);
    rooms.push({ cx, cy });
  }
  // Every portal (entry + exits) gets a room + a spur from the exact portal point,
  // so the player and each exit are guaranteed on connected walkable ground.
  for (const pt of [ctx.entry, ...ctx.exits]) {
    const rw = 260, rh = 240;
    const cx = Math.min(Math.max(pt.x, M + rw / 2), arena.w - M - rw / 2);
    const cy = Math.min(Math.max(pt.y, M + rh / 2), arena.h - M - rh / 2);
    grid.fillRect(cx - rw / 2, cy - rh / 2, cx + rw / 2, cy + rh / 2, true);
    grid.carveCorridor(pt.x, pt.y, cx, cy, 44);
    rooms.push({ cx, cy });
  }
  // Chain every room (guarantees ONE connected component) + a few extra loops.
  for (let i = 1; i < rooms.length; i++) tunnel(grid, rooms[i - 1], rooms[i], 42);
  const extra = rng.int(2, 4);
  for (let i = 0; i < extra; i++) tunnel(grid, rng.pick(rooms), rng.pick(rooms), 38);
  ctx.walk = grid;
}
registerLayout('rooms', roomsLayout);

/** UNDERWATER (the deep-marine Phase-3 instance). The whole zone is DEEP WATER —
 *  walkable but you SWIM (slowed) and your BREATH drains; you must reach AIR POCKETS
 *  to refill. A few VOID TRENCHES are instant-fall hazards. Every portal opens onto
 *  an air pocket so you never spawn drowning. Proves the typed-region + survival +
 *  recovery instances at once; it's all RegionKind DATA the engine already drives. */
function underwaterLayout(ctx: GenCtx, def: ZoneDef): void {
  const { rng, arena } = ctx;
  const grid = new GridWalkField(arena.w, arena.h, 30);
  grid.fillRegion(0, 0, arena.w, arena.h, 'deep_water'); // the open sea
  ctx.airPockets = [];
  // CIRCULAR air pockets (fillDisc, not a square fillRegion) of VARIED sizes — recorded
  // so the renderer can draw a clean round wash + rising bubbles inside each.
  const air = (cx: number, cy: number, r: number): void => {
    grid.fillDisc(cx, cy, r, 'air_pocket');
    ctx.airPockets!.push({ x: cx, y: cy, r });
  };
  for (let i = 0, n = rng.int(5, 9); i < n; i++) {
    const r = rng.range(60, 180);
    air(rng.range(r + 40, arena.w - r - 40), rng.range(r + 40, arena.h - r - 40), r);
  }
  // Each portal surfaces in an air pocket (so you don't arrive drowning).
  for (const pt of [ctx.entry, ...ctx.exits]) air(pt.x, pt.y, 130);
  // Void trenches: instant-fall danger threading the sea. Carved AFTER the air
  // pockets, so a trench must never overlap one — else the renderer would still
  // draw a breathing bubble over what is secretly a fatal fall (a lie to the player).
  // The COUNT reads the zone's GEO context: deep inside the deepsea blob the
  // floor tears open (up to +3 trenches at full depth); a coastal fringe zone
  // keeps the gentle legacy roll. def.geo absent = legacy, byte-identical.
  const depthBonus = Math.round((def.geo?.biomeDepth ?? 0) * (layoutParam(def, 'trenchDepthBonus', 3) as number));
  for (let i = 0, n = rng.int(1, 3) + depthBonus; i < n; i++) {
    const tw = rng.range(54, 110), th = rng.range(180, 360);
    const cx = rng.range(tw, arena.w - tw), cy = rng.range(th, arena.h - th);
    if (Math.hypot(cx - ctx.entry.x, cy - ctx.entry.y) < 260) continue; // never on the entry
    // skip if the trench rect overlaps any air pocket disc (AABB-vs-circle bound)
    if (ctx.airPockets!.some(a => Math.abs(cx - a.x) < tw / 2 + a.r && Math.abs(cy - a.y) < th / 2 + a.r)) continue;
    grid.fillRegion(cx - tw / 2, cy - th / 2, cx + tw / 2, cy + th / 2, 'void');
  }
  ctx.walk = grid;
  // Run the tileset's authored decoration (kelp/coral/sea_rock) — findSpot walk-gates
  // solids onto the walkable seabed. (Underwater previously stamped NOTHING from the
  // tileset layout; this makes the sea doodads actually appear.)
  plainsLayout(ctx, def);
}
registerLayout('underwater', underwaterLayout);

/** UNMADE VAULT — the Unmade boss arena (a GridWalkField zone so World.updateBoss
 *  can repaint regions LIVE: a plains zone has walk=null and every reshape silently
 *  no-ops). An inset rectangular vault FLOOR ringed by an abyssal 'void' margin the
 *  boss shoves you toward (weaponized edge; fall-recovery, not instant death). The
 *  centre dais is pois[0] — the boss anchor. Entry + every exit get a carved ground
 *  stem + a corridor to the dais so portals never strand you in the void and the
 *  floor is one connected piece. The flood/meteor/cage/void-crack hazards are all
 *  painted at runtime by updateBoss; the layout just lays the stage. */
function unmadeVaultLayout(ctx: GenCtx, def: ZoneDef): void {
  const { arena } = ctx;
  const grid = new GridWalkField(arena.w, arena.h, 30);
  const cx = arena.w / 2, cy = arena.h / 2;
  const margin = 70; // the abyssal void border the boss knocks you into
  grid.fillRegion(0, 0, arena.w, arena.h, 'void');                 // the surrounding abyss
  grid.fillRegion(margin, margin, arena.w - margin, arena.h - margin, 'ground'); // the vault floor
  // Portals must never sit in the void: carve a ground stem at each + a corridor
  // back to the dais, so entry/exits are always reachable on one connected island.
  grid.fillDisc(ctx.entry.x, ctx.entry.y, 110, 'ground');
  grid.carveCorridor(ctx.entry.x, ctx.entry.y, cx, cy, 80);
  for (const ex of ctx.exits) {
    grid.fillDisc(ex.x, ex.y, 110, 'ground');
    grid.carveCorridor(ex.x, ex.y, cx, cy, 70);
  }
  ctx.walk = grid;
  ctx.airPockets = [];           // updateBoss fills these during the flood phase
  ctx.pois.unshift(vec(cx, cy)); // the dais / boss anchor is pois[0]
  // NO tileset/biome doodads: a SPECIAL arena is a clean stage (the fight's flood/
  // cracks/meteors are the only "terrain"). Deliberately skips plainsLayout(def).
}
registerLayout('unmade_vault', unmadeVaultLayout);

/** FLESH (the "writhing pulsing flesh" biome) — a CIRCLE-based, organic topology:
 *  rounded chambers (fillDisc) joined by tubes, vs the rooms generator's rectangles.
 *  The chambers are a pulsing 'flesh' region (visual throb); tubes are plain floor.
 *  Entry + every exit get a chamber + a tube so portals sit on connected ground. */
function fleshLayout(ctx: GenCtx, def: ZoneDef): void {
  const { rng, arena } = ctx;
  const grid = new GridWalkField(arena.w, arena.h, 30);
  // The whole zone starts as solid FLESH WALL; chambers + winding tubes are CARVED
  // out of it — so the negative space reads as living tissue ("Belly of the Beast"),
  // not black void. (flesh_wall is non-walkable like a wall, but renders fleshy.)
  grid.fillRegion(0, 0, arena.w, arena.h, 'flesh_wall');
  const M = 90;
  const chambers: Vec2[] = [];
  const n = rng.int(5, 8);
  for (let i = 0; i < n; i++) {
    const r = rng.range(120, 220);
    const cx = rng.range(M + r, Math.max(M + r, arena.w - M - r));
    const cy = rng.range(M + r, Math.max(M + r, arena.h - M - r));
    grid.fillDisc(cx, cy, r, 'flesh');
    chambers.push(vec(cx, cy));
  }
  for (const pt of [ctx.entry, ...ctx.exits]) {
    const cx = Math.min(Math.max(pt.x, M + 130), arena.w - M - 130);
    const cy = Math.min(Math.max(pt.y, M + 130), arena.h - M - 130);
    grid.fillDisc(cx, cy, 130, 'flesh');
    carveWander(grid, vec(pt.x, pt.y), vec(cx, cy), 46, rng); // winding tube to the portal
    chambers.push(vec(cx, cy));
  }
  // Join chambers with WINDING tubes (one connected component) + a few extra loops.
  for (let i = 1; i < chambers.length; i++) carveWander(grid, chambers[i - 1], chambers[i], rng.range(34, 50), rng);
  const extra = rng.int(2, 4);
  for (let i = 0; i < extra; i++) carveWander(grid, rng.pick(chambers), rng.pick(chambers), rng.range(32, 44), rng);
  ctx.walk = grid;
  // Themed organic clutter scatters INSIDE the carved chambers — findSpot walk-gates
  // flesh_pod/bone/gore onto walkable cells, so nothing embeds in the flesh walls.
  plainsLayout(ctx, def);
}
registerLayout('flesh', fleshLayout);

/** MYCELIA — a carved fungal GROTTO. Bulbous chambers + winding hyphal tubes are cut
 *  from solid FUNGAL WALL (the negative space reads as dense living mycelium, not void);
 *  the carved floor is plain walkable ground (the tileset paints it violet), into which
 *  the fungal clutter (caps / pods / glow-caps / mats) scatters walk-gated. Mirrors flesh. */
function myceliaLayout(ctx: GenCtx, def: ZoneDef): void {
  const { rng, arena } = ctx;
  const grid = new GridWalkField(arena.w, arena.h, 30);
  grid.fillRegion(0, 0, arena.w, arena.h, 'fungal_wall');
  const M = 90;
  const chambers: Vec2[] = [];
  const n = rng.int(5, 8);
  for (let i = 0; i < n; i++) {
    const r = rng.range(130, 230);
    const cx = rng.range(M + r, Math.max(M + r, arena.w - M - r));
    const cy = rng.range(M + r, Math.max(M + r, arena.h - M - r));
    grid.fillDisc(cx, cy, r, 'ground');
    chambers.push(vec(cx, cy));
  }
  for (const pt of [ctx.entry, ...ctx.exits]) {
    const cx = Math.min(Math.max(pt.x, M + 130), arena.w - M - 130);
    const cy = Math.min(Math.max(pt.y, M + 130), arena.h - M - 130);
    grid.fillDisc(cx, cy, 130, 'ground');
    carveWander(grid, vec(pt.x, pt.y), vec(cx, cy), 48, rng); // winding hyphal tube to the portal
    chambers.push(vec(cx, cy));
  }
  for (let i = 1; i < chambers.length; i++) carveWander(grid, chambers[i - 1], chambers[i], rng.range(36, 52), rng);
  const extra = rng.int(2, 4);
  for (let i = 0; i < extra; i++) carveWander(grid, rng.pick(chambers), rng.pick(chambers), rng.range(34, 46), rng);
  ctx.walk = grid;
  plainsLayout(ctx, def);
}
registerLayout('mycelia', myceliaLayout);

/** Integer clamp helper for area-scaled flora counts. */
function clampInt(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

/** Inscribed-ellipse test (the FIELD generator's fallback silhouette when a zone has
 *  no def.field — a directed mint onto Field ground that never went through fieldifyZone). */
function ellipseHas(arena: { w: number; h: number }, px: number, py: number): boolean {
  const rx = arena.w / 2, ry = arena.h / 2;
  const nx = (px - rx) / rx, ny = (py - ry) / ry;
  return nx * nx + ny * ny <= 1;
}

/** A tight clump of grass tufts around an anchor — the meadow's dappled texture. */
function stampGrassClump(ctx: GenCtx, center: Vec2, onBlob: (p: Vec2, r: number) => boolean): void {
  const n = ctx.rng.int(4, 8);
  for (let i = 0; i < n; i++) {
    const ang = ctx.rng.range(0, Math.PI * 2), off = ctx.rng.range(0, 52);
    const r = ctx.rng.range(14, 32);
    const p = vec(center.x + Math.cos(ang) * off, center.y + Math.sin(ang) * off);
    if (onBlob(p, r)) ctx.doodads.push({ pos: p, radius: r, kind: 'grass' });
  }
}

/** A tight cluster of rocks with MUD coalescing in a ring AROUND them (the user's
 *  "mud especially near the rock clusters"). Rocks pack among themselves (overlapsSolidBefore)
 *  but avoid earlier solids; the mud is a soft ground overlay lapping their skirt. */
function stampRockMudCluster(ctx: GenCtx, center: Vec2, onBlob: (p: Vec2, r: number) => boolean): void {
  const before = ctx.doodads.length;
  const rocks = ctx.rng.int(3, 6);
  for (let i = 0; i < rocks; i++) {
    const ang = ctx.rng.range(0, Math.PI * 2), off = ctx.rng.range(8, 46);
    const r = ctx.rng.range(16, 34);
    const p = vec(center.x + Math.cos(ang) * off, center.y + Math.sin(ang) * off);
    if (!onBlob(p, r) || overlapsSolidBefore(ctx, p, r, before)) continue;
    ctx.doodads.push({ pos: p, radius: r, kind: 'rock', rot: ctx.rng.range(-0.4, 0.4) });
  }
  const muds = ctx.rng.int(5, 9);
  for (let i = 0; i < muds; i++) {
    const ang = ctx.rng.range(0, Math.PI * 2), off = ctx.rng.range(40, 92);
    const r = ctx.rng.range(20, 38);
    const p = vec(center.x + Math.cos(ang) * off, center.y + Math.sin(ang) * off);
    if (onBlob(p, r)) ctx.doodads.push({ pos: p, radius: r, kind: 'mud' });
  }
}

/** FIELD — the open grassland EXPANSE, shaped to the contiguous Field heat-map blob.
 *  Rasterizes def.field (the region→pixel map) by re-sampling biomeAt per grid cell:
 *  Field cells become walkable 'ground' (the grass floor), everything else a non-
 *  walkable 'tallgrass' hedge — so the zone's SILHOUETTE IS the heat map. Entry + every
 *  exit get a carved grass stem onto the blob (a portal never strands in the hedge).
 *  Flora: dense grass clumps, tight rock clusters with mud coalescing around them, and
 *  a little brush — NO trees / water / void. A wide, walkable expedition expanse. */
function fieldLayout(ctx: GenCtx, def: ZoneDef): void {
  const { rng, arena } = ctx;
  const grid = new GridWalkField(arena.w, arena.h, 30);
  grid.fillRegion(0, 0, arena.w, arena.h, 'tallgrass'); // the off-blob hedge boundary
  const f = def.field;
  const cell = grid.cell, cols = grid.cols, rows = grid.rows;
  const inBlob = (px: number, py: number): boolean =>
    f ? isFieldPixel(f, px, py) : ellipseHas(arena, px, py);
  // Rasterize the blob as walkable 'ground' (per-row runs keep the fillRegion count
  // down), collecting Field-cell centres as flora + portal-stem anchors.
  const anchors: Vec2[] = [];
  for (let cy = 0; cy < rows; cy++) {
    let run = -1;
    for (let cx = 0; cx <= cols; cx++) {
      const here = cx < cols && inBlob((cx + 0.5) * cell, (cy + 0.5) * cell);
      if (here) { if (run < 0) run = cx; anchors.push(vec((cx + 0.5) * cell, (cy + 0.5) * cell)); }
      // fillRegion is cell-INCLUSIVE on both ends, so paint exactly the run's field cells
      // [run..cx-1] on THIS row (cx is the first non-field col) — no +1 down-right bleed.
      else if (run >= 0) { grid.fillRegion(run * cell, cy * cell, (cx - 1) * cell, cy * cell, 'ground'); run = -1; }
    }
  }
  ctx.walk = grid;
  // Every portal sits on connected ground: carve a clearing + a corridor to the nearest
  // blob cell (a path in from the expanse's edge).
  const nearestAnchor = (p: Vec2): Vec2 => {
    let best = p, bd = Infinity;
    for (const a of anchors) { const d = dist(p, a); if (d < bd) { bd = d; best = a; } }
    return best;
  };
  for (const pt of [ctx.entry, ...ctx.exits]) {
    grid.fillDisc(pt.x, pt.y, 120, 'ground');
    if (anchors.length) { const a = nearestAnchor(pt); grid.carveCorridor(pt.x, pt.y, a.x, a.y, 54); }
  }
  // CONNECTIVITY GUARANTEE: the blob is ONE component in node-space and its features are
  // many cells wide at this scale, so 30px rasterization can't normally fragment it — but
  // as belt-and-suspenders, any exit not reachable from the entry gets a direct carved road
  // across the meadow (reachable() uses the grid's connected components), so a portal can
  // NEVER strand the player behind the hedge. Each carve invalidates the region cache.
  for (const pt of ctx.exits) {
    if (!grid.reachable(ctx.entry, pt)) grid.carveCorridor(ctx.entry.x, ctx.entry.y, pt.x, pt.y, 54);
  }
  if (!anchors.length) return; // degenerate (no blob sampled) — the carved clearings stand alone

  // Flora — area-scaled by the blob's cell count, all kept on walkable ground.
  const area = anchors.length;
  const pick = (): Vec2 => rng.pick(anchors);
  const onBlob = (p: Vec2, r: number): boolean =>
    grid.isWalkable(p.x, p.y) && dist(p, ctx.entry) > ENTRY_CLEAR
    && !ctx.exits.some(e => dist(p, e) < EXIT_CLEAR * 0.6) && !inReserved(ctx, p, r);
  for (let i = 0, n = clampInt(area / 12, 10, 70); i < n; i++) stampGrassClump(ctx, pick(), onBlob);
  for (let i = 0, n = clampInt(area / 46, 4, 26); i < n; i++) stampRockMudCluster(ctx, pick(), onBlob);
  for (let i = 0, n = clampInt(area / 70, 2, 16); i < n; i++) {
    const c = pick(), r = rng.range(24, 42);
    if (onBlob(c, r)) ctx.doodads.push({ pos: c, radius: r, kind: 'brush', rot: rng.range(0, Math.PI * 2) });
  }
}
registerLayout('field', fieldLayout);

/** A crystal shard: solid, and it periodically fires a laser beam (the crystal_beam
 *  doodad-effect) in a random direction — the constant-movement "dance" hazard. */
function stampCrystal(ctx: GenCtx): void {
  const r = ctx.rng.range(20, 34);
  const p = findSpot(ctx, r, true, doodadRule('crystal').spacing ?? 0, true, 'crystal');
  if (p) ctx.doodads.push({
    pos: p, radius: r, kind: 'crystal', rot: ctx.rng.range(0, Math.PI * 2),
    effect: { id: 'crystal_beam', interval: 2.6, cd: ctx.rng.range(0, 2.6), radius: 560, width: 16, chance: 0.7, power: 4 },
  });
}

/** A lava vent: a molten fissure that periodically ERUPTS — launching a VOLLEY of
 *  lava orbs in a ring around its OWN epicenter (the lava_orb doodad-effect, now
 *  count/ringRadius/stagger-driven), like a volcano firing off the vent. */
function stampLavaVent(ctx: GenCtx): void {
  const r = ctx.rng.range(26, 44);
  const p = findSpot(ctx, r, true, doodadRule('lava_vent').spacing ?? 0, true, 'lava_vent');
  if (p) ctx.doodads.push({
    pos: p, radius: r, kind: 'lava_vent', rot: ctx.rng.range(0, Math.PI * 2),
    effect: { id: 'lava_orb', interval: 4.4, cd: ctx.rng.range(0, 4.4), radius: 150,
      count: 6, ringRadius: 150, jitter: 38, stagger: 0.12, blast: 82, chance: 0.7, power: 0 },
  });
}

/** A spore-pod: a bulbous fungal sac that periodically PUFFS a lingering spore cloud
 *  (the spore_puff doodad-effect — a gentle poison cloud, area-denial not a damage volley). */
function stampSporePod(ctx: GenCtx): void {
  const r = ctx.rng.range(18, 30);
  const p = findSpot(ctx, r, true, doodadRule('spore_pod').spacing ?? 0, true, 'spore_pod');
  if (p) ctx.doodads.push({
    pos: p, radius: r, kind: 'spore_pod', rot: ctx.rng.range(0, Math.PI * 2),
    effect: { id: 'spore_puff', interval: 5.0, cd: ctx.rng.range(0, 5.0), radius: 95,
      count: 1, ringRadius: 0, jitter: 0, stagger: 0, blast: 0, chance: 0.6, power: 0 },
  });
}

/** A SMALL ember vent: a lesser cousin of the lava vent that coughs up a SINGLE orb
 *  (count 1) close by — peppering the ground between full eruptions. Same effect
 *  handler, different data: the volley framework scales from one orb to a crown. */
function stampEmberVent(ctx: GenCtx): void {
  const r = ctx.rng.range(14, 24);
  const p = findSpot(ctx, r, true, doodadRule('ember_vent').spacing ?? 0, true, 'ember_vent');
  if (p) ctx.doodads.push({
    pos: p, radius: r, kind: 'ember_vent', rot: ctx.rng.range(0, Math.PI * 2),
    effect: { id: 'lava_orb', interval: 3.4, cd: ctx.rng.range(0, 3.4), radius: 64,
      count: 1, ringRadius: 56, jitter: 28, stagger: 0, blast: 60, chance: 0.55, power: 0 },
  });
}

/** Is this disc free of the given doodad kinds? (Site suitability.) */
function areaFreeOf(ctx: GenCtx, p: Vec2, radius: number, kinds: DoodadKind[]): boolean {
  return !ctx.doodads.some(d =>
    kinds.includes(d.kind) && dist(p, d.pos) < radius + d.radius);
}

/** Is this point inside a reserved structure footprint? Handles both the legacy
 *  circles and the plan-structure rects; honors a stamp's 'reserved' relaxation
 *  (which thereby covers EVERY caller — findSpot, blobs, cliffs, ravines). */
function inReserved(ctx: GenCtx, p: Vec2, radius: number): boolean {
  if (ruleIgnored(ctx, 'reserved')) return false;
  return ctx.reserved.some(r => {
    if ('rect' in r) {
      const m = (r.margin ?? 0) + radius;
      return p.x > r.rect.x - m && p.x < r.rect.x + r.rect.w + m
          && p.y > r.rect.y - m && p.y < r.rect.y + r.rect.h + m;
    }
    return dist(p, r.pos) < r.radius + radius;
  });
}

const ENTRY_CLEAR = 220;
const EXIT_CLEAR = 150;
const BORDER = 50;
/** Radius (around each entry/exit) that a CONVEX layout's blocking doodads are
 *  cleared from post-generation, so a scattered solid never walls off a portal. */
const EXIT_CLEAR_CARVE = 95;

/** Generate a zone's terrain from its layout spec. */
export function generateLayout(
  def: ZoneDef, arena: { w: number; h: number },
  rng: Rng, entry: Vec2, exits: Vec2[],
): GeneratedLayout {
  const ctx: GenCtx = {
    rng, arena, entry, exits,
    doodads: [], pois: [], camps: [], breakables: [], npcs: [],
    garrisons: [], caveSeeds: [], reserved: [],
  };
  // LEGACY FIXTURES first (common to EVERY layout): hand-placed structures at
  // exact zone coordinates (the town's smithy stands where the town says it
  // stands). They reserve their footprints, so whatever layout generator runs
  // flows around them.
  for (const f of def.fixtures ?? []) {
    const s = STRUCTURES[f.structure];
    if (s && !s.plan && !s.generator) placeStructure(ctx, s, vec(f.x, f.y));
  }
  // Dispatch to the zone's layout generator (default 'plains' = byte-identical).
  const gen = LAYOUT_GENERATORS[def.layoutType ?? 'plains'] ?? plainsLayout;
  gen(ctx, def);
  // PLAN fixtures raise AFTER the layout: a grid generator REPLACES ctx.walk,
  // which would wipe a plan fixture's painted walls into ghost geometry (roofs
  // over open rock, unenforced ramparts) if it painted first. Placing here, the
  // fixture carves into whatever grid the layout built (or ensures one).
  for (const f of def.fixtures ?? []) {
    const s = STRUCTURES[f.structure];
    if (s && (s.plan || s.generator)) placeStructurePlan(ctx, s, vec(f.x, f.y));
  }
  // LANDMARK ROLLS first (they're TERRAIN — the ground-before-solids
  // convention: a structure sites around a lake, never under it), then
  // STRUCTURE ROLLS — both the zone's data-declared chances (merged from
  // tileset + biome at mint, or authored on the def). Rolled HERE, after the
  // layout dispatch, so they are layout-agnostic (a field zone and a plains
  // zone roll alike) and draw rng only when the data exists (byte-identity
  // for every zone without rolls).
  for (const roll of def.landmarks ?? []) {
    if (!ctx.rng.chance(roll.chance)) continue;
    const n = roll.count ? ctx.rng.int(roll.count[0], roll.count[1]) : 1;
    for (let i = 0; i < n; i++) stamp(ctx, { kind: 'landmark', landmark: roll.landmark, count: [1, 1] });
  }
  for (const roll of def.structures ?? []) {
    if (!ctx.rng.chance(roll.chance)) continue;
    const n = roll.count ? ctx.rng.int(roll.count[0], roll.count[1]) : 1;
    for (let i = 0; i < n; i++) stamp(ctx, { kind: 'structure', structure: roll.structure, count: [1, 1] });
  }
  // REACHABILITY GUARD: a CONVEX layout (no walk grid) scatters its solids without
  // exit awareness, so a rock / cliff / wall can land ON a portal and wall it off —
  // the player then can't reach the exit (seen on crusade-minted + wall-heavy zones).
  // Walk-grid layouts already carve a ground disc at every exit; the convex
  // equivalent is to CLEAR blocking doodads from a disc around each entry/exit, so
  // every portal stays reachable. (No-op for grid layouts — they set ctx.walk —
  // EXCEPT when the grid was lazily ensured by a plan structure: the scatter that
  // ran before it existed was never exit-aware, so the splice still applies.)
  if (!ctx.walk || ctx.gridEnsured) {
    const pts = [ctx.entry, ...ctx.exits];
    for (let i = ctx.doodads.length - 1; i >= 0; i--) {
      const d = ctx.doodads[i];
      // Only clear GENERATED scatter — never authored structure geometry (a fixture's
      // walls/props sit in a reserved footprint the rest of the layout already flows
      // around, exactly like every other solid-placement path here).
      if (blocksMovement(d) && !d.keep && !inReserved(ctx, d.pos, d.radius)
        && pts.some(p => dist(p, d.pos) < EXIT_CLEAR_CARVE + d.radius)) {
        ctx.doodads.splice(i, 1);
      }
    }
  }
  // THE UNIVERSAL REACHABILITY INVARIANT: an entrance or exit that is not
  // accessible is neither an entrance nor an exit; an objective set-piece the
  // player cannot walk to may as well not exist. Draw-free (no rng), no-op
  // when everything already connects — the belt-and-suspenders every layout,
  // structure, and landmark composition inherits for free.
  // THE CAVE LADDER'S GUARANTEE: a cave that ROLLED a deeper mouth (mintCave's
  // seeded chance appends the stamp) MUST hold one — a cramped grid can
  // exhaust the stamp's placement tries. Force it deterministically — the
  // walkable point FARTHEST from the entry (draw-free: pure geometry, no rng)
  // — so a rolled way down always exists. A cave whose roll came up empty has
  // no stamp and gets no force (the rarity IS the roll). Runs BEFORE the
  // reachability invariant and joins its required points, so a mouth in a
  // sealed pocket gets carved to. The paired seed derives from the zone seed
  // (lockstep append with the seeds list).
  // (Boundless zones — the Descent's streamed abyss — are exempt: their layout
  // deliberately hosts no deeper mouth, and a mouth in the starter patch would
  // splice the Underworld ladder into a mode built around resurfacing.)
  if (def.caveDepth && !def.breach && !def.boundless
    && def.layout.some(s => s.kind === 'cave')
    && !ctx.doodads.some(d => d.kind === 'cave_entrance')) {
    let best: Vec2 | null = null;
    let bd = -1;
    const step = 60;
    for (let y = BORDER + 30; y < arena.h - BORDER; y += step) {
      for (let x = BORDER + 30; x < arena.w - BORDER; x += step) {
        if (ctx.walk && !ctx.walk.isWalkable(x, y)) continue;
        if (inReserved(ctx, vec(x, y), 20)) continue;
        // Reject ALL movement blockers — lava/chasm blobs are 'inert', not
        // 'solid', but a mouth inside one is just as unreachable.
        if (ctx.doodads.some(d => doodadRule(d.kind).blocksMove && dist(vec(x, y), d.pos) < 30 + d.radius)) continue;
        const d = dist(vec(x, y), ctx.entry);
        if (d > bd) { bd = d; best = vec(x, y); }
      }
    }
    if (best) {
      ctx.doodads.push({ pos: best, radius: 22, kind: 'cave_entrance' });
      ctx.caveSeeds.push(((def.seed ?? 1) ^ 0x9e3779b9) >>> 0);
      (ctx.mustReach ??= []).push(best);
    }
  }
  ensureReachability(ctx);
  return {
    doodads: ctx.doodads, pois: ctx.pois, camps: ctx.camps,
    breakables: ctx.breakables, npcs: ctx.npcs,
    garrisons: ctx.garrisons, caveSeeds: ctx.caveSeeds,
    walk: ctx.walk, airPockets: ctx.airPockets,
    structures: ctx.structures,
    pockets: ctx.pockets,
    landmarkSpawns: ctx.landmarkSpawns,
  };
}

/** The universal invariant's engine (grid zones; convex zones stay guaranteed
 *  by the portal-clear splice + their connected-by-construction floors):
 *  every exit, POI, camp, garrison post, door APRON (open-doors topology), and
 *  declared mustReach point must share the entry's component. A stranded point
 *  gets a corridor carved to the nearest reachable ground along the best of 8
 *  bearings — never through a structure's reserved rect (a rescue that
 *  breaches a castle wall would be a worse defect than the one it fixes).
 *  Points inside a declared POCKET are exempt: unreachable-on-foot is their
 *  feature (jump/blink islands). */
function ensureReachability(ctx: GenCtx): void {
  const grid = ctx.walk;
  if (!(grid instanceof GridWalkField)) return;
  const inPocket = (p: Vec2): boolean =>
    (ctx.pockets ?? []).some(k => dist(p, vec(k.x, k.y)) <= k.r);
  // Open-doors topology: door cells pass for the check, resealed after.
  const doorRects: { x: number; y: number; w: number; h: number }[] = [];
  for (const st of ctx.structures ?? []) {
    for (const pd of st.doors) if (pd.door.cells) doorRects.push(pd.door.cells);
  }
  for (const c of doorRects) grid.fillRegion(c.x, c.y, c.x + c.w - 0.01, c.y + c.h - 0.01, 'ground');

  const required: Vec2[] = [
    ...ctx.exits,
    ...ctx.pois,
    ...ctx.camps,
    ...ctx.garrisons.map(g => g.pos),
    ...(ctx.mustReach ?? []),
  ];
  for (const st of ctx.structures ?? []) {
    for (const pd of st.doors) {
      required.push(vec(
        pd.pos.x + pd.normal.x * st.cellSize * APRON_CELLS,
        pd.pos.y + pd.normal.y * st.cellSize * APRON_CELLS));
    }
  }

  // The carve swath is halfW≈36 and fillRegion is intersect-inclusive — the
  // no-breach test must hold for the SWATH, not just the ray line, so the
  // structure rects are checked with a swath-wide margin.
  const CARVE_MARGIN = ((grid.cellSize ?? 30) * 1.2) + (grid.cellSize ?? 30);
  const insideStructure = (x: number, y: number): boolean =>
    (ctx.structures ?? []).some(st =>
      x > st.rect.x - CARVE_MARGIN && x < st.rect.x + st.rect.w + CARVE_MARGIN
      && y > st.rect.y - CARVE_MARGIN && y < st.rect.y + st.rect.h + CARVE_MARGIN);

  for (const p of required) {
    if (inPocket(p)) continue;
    if (!grid.reachable) break;
    // Snap the required point to its nearest walkable cell first (a POI's
    // center may sit on a decorative rim); still unreachable = act. If the
    // snap itself lands in a POCKET, the point belongs to the jump-only
    // feature — never carve a land bridge to it.
    const q = grid.isWalkable(p.x, p.y) ? p : grid.snapToWalkable(vec(p.x, p.y));
    if (inPocket(q)) continue;
    if (grid.reachable(ctx.entry, q)) continue;
    // 8-bearing ray march: find the SHORTEST ray to reachable ground that
    // never crosses a structure rect NOR a pocket (a rescue causeway across a
    // void gulf would foot-bridge the blink-only islands); carve that corridor.
    let bestPts: Vec2[] | null = null;
    let bestLen = Infinity;
    for (let b = 0; b < 8; b++) {
      const ang = (b / 8) * Math.PI * 2;
      const step = grid.cellSize ?? 30;
      for (let d = step; d <= Math.max(ctx.arena.w, ctx.arena.h) * 0.6; d += step) {
        const x = q.x + Math.cos(ang) * d, y = q.y + Math.sin(ang) * d;
        if (x < 0 || y < 0 || x > ctx.arena.w || y > ctx.arena.h) break;
        if (insideStructure(x, y)) break; // never breach a castle to rescue a POI
        if (inPocket(vec(x, y))) break;   // never bridge a jump-only pocket
        if (grid.isWalkable(x, y) && grid.reachable(ctx.entry, vec(x, y))) {
          if (d < bestLen) { bestLen = d; bestPts = [vec(q.x, q.y), vec(x, y)]; }
          break;
        }
      }
    }
    if (bestPts) {
      grid.carveCorridor(bestPts[0].x, bestPts[0].y, bestPts[1].x, bestPts[1].y, (grid.cellSize ?? 30) * 1.2);
    } else {
      console.warn(`[levelgen] reachability: point ${Math.round(p.x)},${Math.round(p.y)} unrescuable (no clear bearing) — check the layout recipe`);
    }
  }

  // Reseal the doors (closed state is the shipped topology).
  for (const c of doorRects) grid.fillRegion(c.x, c.y, c.x + c.w - 0.01, c.y + c.h - 0.01, 'rampart');
}

/** Stamp a structure blueprint: wall strips, props, clutter, folk. */
function placeStructure(ctx: GenCtx, s: StructureDef, at: Vec2): void {
  ctx.reserved.push({ pos: at, radius: Math.max(s.halfW, s.halfH) * 1.25 + 20 });
  const segR = 11;
  for (const strip of s.walls ?? []) {
    const steps = Math.max(1, Math.round(strip.length / (segR * 1.8)));
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * strip.length;
      ctx.doodads.push({
        pos: vec(
          at.x + strip.x + (strip.dir === 'h' ? t : 0),
          at.y + strip.y + (strip.dir === 'v' ? t : 0)),
        radius: segR, kind: 'wall',
      });
    }
  }
  for (const prop of s.props ?? []) {
    ctx.doodads.push({
      pos: vec(at.x + prop.x, at.y + prop.y),
      radius: prop.radius ?? 12, kind: prop.kind,
    });
  }
  for (const b of s.breakables ?? []) {
    ctx.breakables.push({ id: b.id, pos: vec(at.x + b.x, at.y + b.y) });
  }
  for (const n of s.npcs ?? []) {
    ctx.npcs.push({ id: n.id, pos: vec(at.x + n.x, at.y + n.y) });
  }
  // Pre-inhabited: a faction posts a guard pack at the structure's heart.
  if (s.garrison) {
    ctx.garrisons.push({ pos: vec(at.x, at.y), faction: s.garrison, size: s.garrisonSize ?? [3, 5] });
  }
  ctx.pois.push(vec(at.x, at.y));
}

// --- PLAN STRUCTURES (the char-grid pipeline) --------------------------------

/** One resolved plan cell (position + spec), the working unit of placement. */
interface PlanCell { cx: number; cy: number; char: string; spec: CellSpec }

/** Resolve a def's plan rows (authored or generator-emitted) into cells. */
function resolvePlan(ctx: GenCtx, def: StructureDef): { rows: string[]; cells: PlanCell[] } | null {
  const rows = def.plan ?? (def.generator ? runStructureGen(def.generator, ctx.rng, def.genParams ?? {}) : null);
  if (!rows || !rows.length) return null;
  const cells: PlanCell[] = [];
  for (let cy = 0; cy < rows.length; cy++) {
    for (let cx = 0; cx < rows[cy].length; cx++) {
      const char = rows[cy][cx];
      const spec = legendCell(char, def.legend);
      if (spec) cells.push({ cx, cy, char, spec });
    }
  }
  return { rows, cells };
}

/** Does a candidate footprint rect overlap any reservation? (rect-vs-circle +
 *  rect-vs-rect — the rect-aware sibling of inReserved's point test). */
function rectReserved(ctx: GenCtx, rect: { x: number; y: number; w: number; h: number }): boolean {
  return ctx.reserved.some(r => {
    if ('rect' in r) {
      const m = r.margin ?? 0;
      return rect.x < r.rect.x + r.rect.w + m && rect.x + rect.w > r.rect.x - m
          && rect.y < r.rect.y + r.rect.h + m && rect.y + rect.h > r.rect.y - m;
    }
    const nx = Math.max(rect.x, Math.min(r.pos.x, rect.x + rect.w));
    const ny = Math.max(rect.y, Math.min(r.pos.y, rect.y + rect.h));
    return dist(vec(nx, ny), r.pos) < r.radius;
  });
}

/** Grow the walk grid lazily for a plan structure in a convex zone: everything
 *  starts walkable 'ground' (the plains floor), and the structure paints its
 *  walls into it. Sets gridEnsured so the convex portal-clear splice still runs.
 *  Exported: layout recipes compose on the same grid. */
export function ensureGrid(ctx: GenCtx): GridWalkField {
  if (ctx.walk instanceof GridWalkField) return ctx.walk;
  const grid = new GridWalkField(ctx.arena.w, ctx.arena.h, 30);
  grid.fillRect(0, 0, ctx.arena.w, ctx.arena.h, true);
  ctx.walk = grid;
  ctx.gridEnsured = true;
  return grid;
}

const APRON_CELLS = 1.6;      // how far outside a door its guaranteed-clear apron sits
const HAZARD_GROUNDS: DoodadKind[] = ['chasm', 'water', 'lava', 'bog', 'swamp', 'void_chasm'];

/** Is a point inside any doodad of the given kinds? (Point probe — the cheap
 *  siting test big footprints use instead of a whole-disc areaFreeOf, which a
 *  decorated zone can never satisfy at castle scale.) */
function pointOnKinds(ctx: GenCtx, p: Vec2, kinds: DoodadKind[]): boolean {
  return ctx.doodads.some(d => kinds.includes(d.kind) && dist(p, d.pos) < d.radius);
}

/** Find a center for a plan structure's rect footprint: clear of the entry, the
 *  portals, reservations, and hazard grounds — and with every perimeter door's
 *  APRON on viable ground. Draws-before-filters like findSpot (2 draws/try).
 *  Hazards are POINT-probed (center/corners/edge midpoints): light overlap is
 *  fine because placement then CLEARS the footprint (builders drain the pond). */
function findStructureSpot(
  ctx: GenCtx, w: number, h: number, aprons: { dx: number; dy: number }[],
): Vec2 | null {
  for (let tries = 0; tries < 18; tries++) {
    const c = vec(
      ctx.rng.range(BORDER + w / 2, Math.max(BORDER + w / 2, ctx.arena.w - BORDER - w / 2)),
      ctx.rng.range(BORDER + h / 2, Math.max(BORDER + h / 2, ctx.arena.h - BORDER - h / 2)));
    const rect = { x: c.x - w / 2, y: c.y - h / 2, w, h };
    // Entry/portal clearance measured to the rect's closest point.
    const nearest = (p: Vec2): number => dist(p, vec(
      Math.max(rect.x, Math.min(p.x, rect.x + rect.w)),
      Math.max(rect.y, Math.min(p.y, rect.y + rect.h))));
    if (nearest(ctx.entry) < ENTRY_CLEAR) continue;
    if (ctx.exits.some(e => nearest(e) < EXIT_CLEAR)) continue;
    if (rectReserved(ctx, rect)) continue;
    const hazardProbes = [c,
      vec(rect.x, rect.y), vec(rect.x + w, rect.y), vec(rect.x, rect.y + h), vec(rect.x + w, rect.y + h),
      vec(c.x, rect.y), vec(c.x, rect.y + h), vec(rect.x, c.y), vec(rect.x + w, c.y)];
    if (hazardProbes.some(p => pointOnKinds(ctx, p, HAZARD_GROUNDS))) continue;
    // Pre-existing grid zones (field/rooms/flesh): the footprint's anchor points
    // must sit on walkable ground pre-paint, or the castle lands inside rock.
    if (ctx.walk && !ctx.gridEnsured) {
      const probes = [c,
        vec(rect.x + 4, rect.y + 4), vec(rect.x + rect.w - 4, rect.y + 4),
        vec(rect.x + 4, rect.y + rect.h - 4), vec(rect.x + rect.w - 4, rect.y + rect.h - 4)];
      if (probes.some(p => !ctx.walk!.isWalkable(p.x, p.y))) continue;
    }
    // Every door apron must land inside the arena and off reservations.
    const apronsOk = aprons.every(a => {
      const p = vec(c.x + a.dx, c.y + a.dy);
      return p.x > BORDER && p.x < ctx.arena.w - BORDER
          && p.y > BORDER && p.y < ctx.arena.h - BORDER
          && !inReserved(ctx, p, 20);
    });
    if (!apronsOk) continue;
    return c;
  }
  return null;
}

/** Raise a PLAN structure (char-grid blueprint or generator-emitted): reserve a
 *  true rect, paint the walk grid (walls/windows/parapets/floors), emit door +
 *  window + prop doodads, record roofs/slots/doors on a PlacedStructure, stamp
 *  fx layers, and guarantee every door an open apron reachable from the entry. */
function placeStructurePlan(ctx: GenCtx, def: StructureDef, at?: Vec2): void {
  const resolved = resolvePlan(ctx, def);
  if (!resolved) return;
  const { rows, cells } = resolved;
  // QUANTIZE the plan cell to a multiple of the WALK cell (30), and later snap
  // the footprint origin to the walk lattice: every plan cell then maps to
  // exactly k×k walk cells. Unaligned cells bleed via fillRegion's intersect-
  // inclusive painting and can pinch a 1-cell corridor SHUT depending on the
  // footprint's pixel phase (the fortress ring corridor taught us that).
  const WALK_CELL = 30;
  const cell = Math.max(1, Math.round((def.cellSize ?? WALK_CELL) / WALK_CELL)) * WALK_CELL;
  const planW = Math.max(...rows.map(r => r.length));
  const planH = rows.length;
  const w = planW * cell, h = planH * cell;

  // Group door cells (4-adjacent, same mode) into logical doors and compute the
  // outward normal of each BEFORE siting, so aprons can gate the spot choice.
  const doorCells = cells.filter(c => c.spec.door);
  const doorGroups: { cells: PlanCell[]; mode: NonNullable<CellSpec['door']> }[] = [];
  const seen = new Set<PlanCell>();
  for (const dc of doorCells) {
    if (seen.has(dc)) continue;
    const group = [dc]; seen.add(dc);
    for (let i = 0; i < group.length; i++) {
      for (const other of doorCells) {
        if (seen.has(other)) continue;
        if (Math.abs(other.cx - group[i].cx) + Math.abs(other.cy - group[i].cy) === 1
            && other.spec.door!.mode === dc.spec.door!.mode) {
          group.push(other); seen.add(other);
        }
      }
    }
    // Door state repaints operate on the group's BOUNDING BOX — a non-
    // rectangular (L/blob) group would hole the wall on open. All shipped
    // doors are straight runs; warn loudly the day a plan authors otherwise.
    const minX = Math.min(...group.map(c => c.cx)), maxX = Math.max(...group.map(c => c.cx));
    const minY = Math.min(...group.map(c => c.cy)), maxY = Math.max(...group.map(c => c.cy));
    if (group.length !== (maxX - minX + 1) * (maxY - minY + 1)) {
      console.warn(`[structures] '${def.id}': non-rectangular door group (${group.length} cells in a ${maxX - minX + 1}×${maxY - minY + 1} box) — open/close repaints will hole the wall`);
    }
    doorGroups.push({ cells: group, mode: dc.spec.door! });
  }
  const groupNormal = (g: PlanCell[]): Vec2 => {
    const gx = g.reduce((a, c) => a + c.cx, 0) / g.length;
    const gy = g.reduce((a, c) => a + c.cy, 0) / g.length;
    if (g.some(c => c.cy === 0)) return vec(0, -1);
    if (g.some(c => c.cy === planH - 1)) return vec(0, 1);
    if (g.some(c => c.cx === 0)) return vec(-1, 0);
    if (g.some(c => c.cx === planW - 1)) return vec(1, 0);
    // Interior door (a keep): normal points from the plan center toward it.
    const ddx = gx - planW / 2, ddy = gy - planH / 2;
    return Math.abs(ddx) >= Math.abs(ddy) ? vec(Math.sign(ddx) || 1, 0) : vec(0, Math.sign(ddy) || 1);
  };
  const apronOffsets = doorGroups.map(g => {
    const n = groupNormal(g.cells);
    const gx = (g.cells.reduce((a, c) => a + c.cx, 0) / g.cells.length + 0.5 - planW / 2) * cell;
    const gy = (g.cells.reduce((a, c) => a + c.cy, 0) / g.cells.length + 0.5 - planH / 2) * cell;
    return { dx: gx + n.x * cell * APRON_CELLS, dy: gy + n.y * cell * APRON_CELLS };
  });

  const sited = at ?? findStructureSpot(ctx, w, h, apronOffsets);
  if (!sited) return;
  // Snap the footprint origin onto the walk lattice (see the quantization note).
  const rect = {
    x: Math.round((sited.x - w / 2) / WALK_CELL) * WALK_CELL,
    y: Math.round((sited.y - h / 2) / WALK_CELL) * WALK_CELL,
    w, h,
  };
  const center = vec(rect.x + w / 2, rect.y + h / 2);
  ctx.reserved.push({ rect, margin: def.margin ?? cell * 1.5 });
  // CLEAR THE SITE: builders drain the pond and fell the trees — every doodad
  // whose center falls inside the footprint is removed before the walls rise
  // (rolls run AFTER the layout's scatter, so the structure wins its ground).
  // Draw-free, so the rng sequence is untouched. A removed SEED-PAIRED doodad
  // (cave_entrance) takes its caveSeeds entry with it — the index zip between
  // mouths and seeds must never shear (every surviving mouth keeps ITS cave).
  for (let i = ctx.doodads.length - 1; i >= 0; i--) {
    const d = ctx.doodads[i];
    if (d.pos.x > rect.x - d.radius * 0.4 && d.pos.x < rect.x + rect.w + d.radius * 0.4
        && d.pos.y > rect.y - d.radius * 0.4 && d.pos.y < rect.y + rect.h + d.radius * 0.4) {
      if (doodadRule(d.kind).seedPaired) {
        let ordinal = 0;
        for (let k = 0; k < i; k++) if (ctx.doodads[k].kind === d.kind) ordinal++;
        if (ordinal < ctx.caveSeeds.length) ctx.caveSeeds.splice(ordinal, 1);
      }
      ctx.doodads.splice(i, 1);
    }
  }

  // Plan structures always paint the grid: interiors are real carved space.
  const grid = ensureGrid(ctx);
  const cellRect = (cx: number, cy: number): { x0: number; y0: number; x1: number; y1: number } => ({
    x0: rect.x + cx * cell, y0: rect.y + cy * cell,
    x1: rect.x + (cx + 1) * cell - 0.01, y1: rect.y + (cy + 1) * cell - 0.01,
  });
  const cellCenter = (cx: number, cy: number): Vec2 =>
    vec(rect.x + (cx + 0.5) * cell, rect.y + (cy + 0.5) * cell);

  // Paint floors first, then walls/regions, then door cells (closed = rampart),
  // so overlapping specs resolve wall-wins deterministically.
  for (const c of cells) {
    if (c.spec.interior || c.spec.courtyard || c.spec.slot || c.spec.breakable || c.spec.npc || c.spec.doodad) {
      const r = cellRect(c.cx, c.cy);
      grid.fillRegion(r.x0, r.y0, r.x1, r.y1, 'ground');
    }
  }
  for (const c of cells) {
    if (c.spec.region && !c.spec.door) {
      const r = cellRect(c.cx, c.cy);
      grid.fillRegion(r.x0, r.y0, r.x1, r.y1, c.spec.region);
    }
  }
  // (Door cells stay FLOOR for now — they seal LAST, after the apron guarantee
  // below has verified the open-doors topology: the true invariant is "every
  // apron reachable once its doors open", not "while the castle is sealed".)

  const sid = `${def.id}#${ctx.structures?.length ?? 0}`;
  const placed: PlacedStructure = {
    id: sid, defId: def.id, rect, cellSize: cell,
    roofs: [], roofStyle: def.roofStyle ?? 'timber', doors: [], slots: [],
  };

  // Doodads / breakables / npcs / slots from cells.
  for (const c of cells) {
    const p = cellCenter(c.cx, c.cy);
    if (c.spec.doodad) {
      ctx.doodads.push({
        pos: p, radius: c.spec.doodad.radius ?? cell * 0.55, kind: c.spec.doodad.kind,
        effect: c.spec.doodad.effect ? { ...c.spec.doodad.effect } : undefined,
      });
    }
    // Window cells get a frame doodad (the arrow-slit sill dressing) oriented
    // along the wall run they sit in — draw-free w.r.t. rng.
    if (c.spec.region === 'window') {
      const wallish = (cx: number, cy: number): boolean => {
        const ch = rows[cy]?.[cx];
        const spec = ch ? legendCell(ch, def.legend) : undefined;
        return !!spec?.region;
      };
      const horizontal = wallish(c.cx - 1, c.cy) || wallish(c.cx + 1, c.cy);
      ctx.doodads.push({ pos: p, radius: cell * 0.5, kind: 'window', rot: horizontal ? 0 : Math.PI / 2 });
    }
    if (c.spec.breakable) ctx.breakables.push({ id: c.spec.breakable, pos: p });
    if (c.spec.npc) ctx.npcs.push({ id: c.spec.npc, pos: p });
    if (c.spec.slot) {
      placed.slots.push({
        id: `${sid}/s${placed.slots.length}`, pos: p, kind: c.spec.slot.kind,
        capacity: c.spec.slot.capacity ?? 1, mods: c.spec.slot.mods,
        entry: c.spec.slot.entry ?? 'teleport', leash: c.spec.slot.leash,
        occupants: [],
      });
    }
  }

  // Door doodads: one per group, sized to span the breach.
  for (let gi = 0; gi < doorGroups.length; gi++) {
    const g = doorGroups[gi];
    const n = groupNormal(g.cells);
    const minCx = Math.min(...g.cells.map(c => c.cx)), maxCx = Math.max(...g.cells.map(c => c.cx));
    const minCy = Math.min(...g.cells.map(c => c.cy)), maxCy = Math.max(...g.cells.map(c => c.cy));
    const cellsRect = {
      x: rect.x + minCx * cell, y: rect.y + minCy * cell,
      w: (maxCx - minCx + 1) * cell, h: (maxCy - minCy + 1) * cell,
    };
    const pos = vec(cellsRect.x + cellsRect.w / 2, cellsRect.y + cellsRect.h / 2);
    const door: DoodadDoor = {
      id: `${sid}/d${gi}`, mode: g.mode.mode,
      cells: cellsRect, life: g.mode.life, dwell: g.mode.dwell,
    };
    ctx.doodads.push({
      pos, radius: Math.max(cellsRect.w, cellsRect.h) / 2,
      kind: 'door', dir: Math.atan2(n.y, n.x), door,
    });
    placed.doors.push({ door, pos, normal: n });
  }

  // Roofs: merge roofed cells (interior, not courtyard, NOT doors — a roofed
  // gate hides the closed-gate art + its guard's health bar exactly while the
  // door render matters most) into row runs, then stack identical runs
  // vertically into rects.
  if (def.roofs === 'auto') {
    const roofed = new Set(cells.filter(c => c.spec.interior && !c.spec.courtyard && !c.spec.door).map(c => c.cy * planW + c.cx));
    const runs: { cx0: number; cx1: number; cy: number }[] = [];
    for (let cy = 0; cy < planH; cy++) {
      let start = -1;
      for (let cx = 0; cx <= planW; cx++) {
        if (cx < planW && roofed.has(cy * planW + cx)) { if (start < 0) start = cx; }
        else if (start >= 0) { runs.push({ cx0: start, cx1: cx - 1, cy }); start = -1; }
      }
    }
    const merged: { cx0: number; cx1: number; cy0: number; cy1: number }[] = [];
    for (const run of runs) {
      const prev = merged.find(m => m.cx0 === run.cx0 && m.cx1 === run.cx1 && m.cy1 === run.cy - 1);
      if (prev) prev.cy1 = run.cy;
      else merged.push({ cx0: run.cx0, cx1: run.cx1, cy0: run.cy, cy1: run.cy });
    }
    placed.roofs = merged.map(m => ({
      x: rect.x + m.cx0 * cell, y: rect.y + m.cy0 * cell,
      w: (m.cx1 - m.cx0 + 1) * cell, h: (m.cy1 - m.cy0 + 1) * cell,
    }));
  }

  // FX LAYERS — the interwoven ground effects (a fire-laden siege: cinder floors
  // + ember vents INSIDE the castle). Doodads scattered over matching cells.
  // Door + slot cells are NEVER matched (a solid vent centered on a doorway
  // corks the breach forever — the door 'opens' but the disc still blocks),
  // and a blocking fx kind rejects spots overlapping already-placed solids.
  for (const fx of def.fx ?? []) {
    const matches = cells.filter(c =>
      !c.spec.door && !c.spec.slot
      && (fx.where === 'interior' ? (c.spec.interior || c.spec.courtyard)
        : fx.where === 'perimeter' ? c.spec.region === 'rampart'
          : c.char === fx.char));
    if (!matches.length) continue;
    const fxBlocks = !!doodadRule(fx.doodad.kind).blocksMove;
    const n = Math.round(ctx.rng.range(fx.countPer100Cells[0], fx.countPer100Cells[1]) * matches.length / 100);
    for (let i = 0; i < n; i++) {
      // Draws BEFORE the overlap filter, so a rejected spot never shifts the
      // sequence of later instances.
      const m = matches[ctx.rng.int(0, matches.length - 1)];
      const p = cellCenter(m.cx, m.cy);
      const jx = ctx.rng.range(-cell * 0.3, cell * 0.3), jy = ctx.rng.range(-cell * 0.3, cell * 0.3);
      const r = ctx.rng.range(fx.doodad.radius[0], fx.doodad.radius[1]);
      // Effect clones get a random cd phase so a castle's vents RIPPLE instead
      // of erupting in a synchronized full-castle barrage from tick 1.
      const cd = fx.doodad.effect ? ctx.rng.range(0, fx.doodad.effect.interval) : 0;
      const pos = vec(p.x + jx, p.y + jy);
      if (fxBlocks && ctx.doodads.some(d => isSolid(d.kind) && dist(pos, d.pos) < r + d.radius)) continue;
      ctx.doodads.push({
        pos, radius: r, kind: fx.doodad.kind,
        effect: fx.doodad.effect ? { ...fx.doodad.effect, cd } : undefined,
      });
    }
  }

  // APRON GUARANTEE: every door needs open ground just outside it, connected to
  // the zone entry ONCE ITS DOORS OPEN (A-9: the guard targets the APRON, never
  // the door cell — a carve through the wall would pre-breach every castle).
  // The apron is SEARCHED along the door's outward normal (a fixed offset can
  // land on a second wall line — the concentric fortress taught us that); blind
  // carves are allowed only OUTSIDE the footprint, so a wall is never breached.
  for (let gi = 0; gi < doorGroups.length; gi++) {
    const pd = placed.doors[gi];
    let apron: Vec2 | null = null;
    for (let step = 1.2; step <= 3.4; step += 0.5) {
      const p = vec(pd.pos.x + pd.normal.x * cell * step, pd.pos.y + pd.normal.y * cell * step);
      if (grid.isWalkable(p.x, p.y)) { apron = p; break; }
    }
    if (!apron) {
      const p = vec(pd.pos.x + pd.normal.x * cell * APRON_CELLS, pd.pos.y + pd.normal.y * cell * APRON_CELLS);
      const outside = p.x < rect.x || p.x > rect.x + rect.w || p.y < rect.y || p.y > rect.y + rect.h;
      if (outside) {
        // Perimeter door into pre-existing rock (a grid layout): carve egress.
        grid.fillDisc(p.x, p.y, cell, 'ground');
        const far = vec(p.x + pd.normal.x * cell * 4, p.y + pd.normal.y * cell * 4);
        grid.carveCorridor(p.x, p.y, far.x, far.y, cell * 0.8);
        apron = p;
      } else {
        console.warn(`[structures] ${sid}: door ${pd.door.id} has no walkable apron along its normal (authoring/generator gap)`);
        continue;
      }
    }
    if (grid.reachable && !grid.reachable(ctx.entry, apron)) {
      console.warn(`[structures] ${sid}: door ${pd.door.id} apron not reachable from entry (open-doors topology)`);
    }
  }

  // NOW seal the doors: paint their cells rampart (closed). Opening a door
  // (setDoorState) repaints exactly these cells back to floor.
  for (const c of doorCells) {
    const r = cellRect(c.cx, c.cy);
    grid.fillRegion(r.x0, r.y0, r.x1, r.y1, 'rampart');
  }

  (ctx.structures ??= []).push(placed);
  ctx.pois.push(center);
  if (def.garrison) {
    ctx.garrisons.push({ pos: center, faction: def.garrison, size: def.garrisonSize ?? [3, 5] });
  }
}

/** Build a structure's SOLID pieces (wall posts + props) as world-space doodads,
 *  for stamping a structure into a LIVE arena AFTER generation. Used by the
 *  Crusade, which decides a zone's structures at LOAD time from its influence
 *  tier (camp → fortress → labyrinth-city), not at zone-mint. Returns only the
 *  doodads; the caller spawns whatever garrison it wants with full control. Pure
 *  (no GenCtx, no rng), so it reproduces identically each visit. */
export function structureDoodads(s: StructureDef, at: Vec2): Doodad[] {
  // PLAN defs are gen-time only (they need the grid painter + deterministic ids);
  // a runtime materializer (Crusade/Holdfast) must use walls/props defs — loud
  // guard so a def wired into the wrong path fails visibly, not silently empty.
  if (s.plan || s.generator) {
    console.warn(`[structures] '${s.id}' is a PLAN structure — structureDoodads (runtime path) cannot raise it; use a walls/props def`);
    return [];
  }
  const out: Doodad[] = [];
  const segR = 11;
  for (const strip of s.walls ?? []) {
    const steps = Math.max(1, Math.round(strip.length / (segR * 1.8)));
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * strip.length;
      out.push({
        pos: vec(at.x + strip.x + (strip.dir === 'h' ? t : 0),
          at.y + strip.y + (strip.dir === 'v' ? t : 0)),
        radius: segR, kind: 'wall',
      });
    }
  }
  for (const prop of s.props ?? []) {
    out.push({ pos: vec(at.x + prop.x, at.y + prop.y), radius: prop.radius ?? 12, kind: prop.kind });
  }
  return out;
}

// STAMP REGISTRY — the open dispatch that replaced the closed switch. Every
// built-in case below registers a VERBATIM closure (same functions, same
// per-kind default args), so the rng draw sequence for existing layouts is
// byte-identical (golden-seed verified). A package adds a set-piece with ONE
// registerStamp call; boot validation (validateStamps) checks every layout
// entry in ZONES/TILESETS against the live registry, so the safety net the
// closed union provided lives on as a loud warning instead of a compile error.
export type StampHandler = (ctx: GenCtx, spec: StampSpec) => void;

const STAMP_HANDLERS: Record<string, StampHandler> = {};

/** Register a set-piece stamp under an open-string kind (see StampKind). */
export function registerStamp(id: string, h: StampHandler): void {
  if (STAMP_HANDLERS[id]) console.warn(`[stamps] re-registering stamp '${id}' — overriding`);
  STAMP_HANDLERS[id] = h;
}

/** Is a stamp kind registered? (Boot validation for layout refs.) */
export function hasStamp(id: string): boolean { return id in STAMP_HANDLERS; }

const unknownStampWarned = new Set<string>();

function stamp(ctx: GenCtx, spec: StampSpec): void {
  const h = STAMP_HANDLERS[spec.kind];
  if (!h) {
    if (!unknownStampWarned.has(spec.kind)) {
      unknownStampWarned.add(spec.kind);
      console.warn(`[stamps] layout references unregistered stamp '${spec.kind}' — skipped`);
    }
    return;
  }
  // The stamp's rule relaxations ride the ctx for the duration of the handler
  // (read by clearOf/inReserved/findSpot); doodads born under a 'portalClear'
  // waiver are tagged keep so the convex portal-clear splice spares them.
  const n0 = ctx.doodads.length;
  ctx.ruleOver = spec.rules;
  try {
    h(ctx, spec);
  } finally {
    ctx.ruleOver = undefined;
  }
  if (spec.rules?.ignore?.includes('portalClear')) {
    for (let i = n0; i < ctx.doodads.length; i++) ctx.doodads[i].keep = true;
  }
  // TERRAIN SWALLOWS SCATTER: a stamp that lays ENGULFING terrain (chasm
  // ravines/pools — DoodadRule.swallowsSolids) removes earlier solids and
  // triggers its discs now cover: a boulder hovering over a freshly-cut pit is
  // a draw error, not composition. Water/mud deliberately keep LAPPING their
  // boulders (their rule stays false); rule-breaker stamps' `keep` doodads and
  // reserved structure footprints are spared. Draw-free (no rng) — zones
  // without an engulf overlap stay byte-identical.
  let frame = n0; // where this stamp's own doodads begin — shifts as pre-stamp doodads splice out
  for (let i = frame; i < ctx.doodads.length; i++) {
    const blob = ctx.doodads[i];
    if (!doodadRule(blob.kind).swallowsSolids) continue;
    for (let j = frame - 1; j >= 0; j--) {
      const s = ctx.doodads[j];
      const cls = doodadRule(s.kind).overlap;
      if (s.keep || (cls !== 'solid' && cls !== 'trigger')) continue;
      if (inReserved(ctx, s.pos, s.radius)) continue;
      if (dist(s.pos, blob.pos) >= blob.radius - s.radius * 0.2) continue;
      if (doodadRule(s.kind).seedPaired) {
        let ordinal = 0;
        for (let k = 0; k < j; k++) if (ctx.doodads[k].kind === s.kind) ordinal++;
        if (ordinal < ctx.caveSeeds.length) ctx.caveSeeds.splice(ordinal, 1);
      }
      ctx.doodads.splice(j, 1);
      i--; frame--; // everything at or above j shifted down one
    }
  }
}

// DEFAULT SIZE RANGES are deliberately WIDE (roughly ±40% past the old
// bounds, skewed larger): the same stamp rolls a puddle in one zone and a
// proper lake in the next, a pebble field here and a boulder run there —
// terrain features stop reading as same-sized cookie cutters. A layout entry
// that wants a tight band still overrides via `spec.radius`.
registerStamp('rocks', (ctx, spec) => stampRock(ctx, spec.radius ?? [14, 58]));
registerStamp('cliff', (ctx) => stampCliff(ctx));
registerStamp('mud', (ctx) => stampBlob(ctx, 'mud', [20, 62], [5, 9], false));
registerStamp('swamp', (ctx) => stampBlob(ctx, 'swamp', [24, 68], [7, 12], false));
registerStamp('bog', (ctx) => stampBlob(ctx, 'bog', [22, 60], [5, 9], false));
registerStamp('water', (ctx, spec) => stampBlob(ctx, 'water', spec.radius ?? [26, 92], [6, 12], false));
registerStamp('ice', (ctx) => stampBlob(ctx, 'ice', [26, 80], [6, 11], false));
registerStamp('chasm', (ctx) => stampBlob(ctx, 'chasm', [28, 76], [6, 12], true));
registerStamp('ravine', (ctx) => stampRavine(ctx));
registerStamp('river', (ctx) => stampRiver(ctx));
registerStamp('ruin', (ctx) => stampRuin(ctx));
registerStamp('camp', (ctx) => stampCamp(ctx));
registerStamp('trees', (ctx, spec) => stampTree(ctx, spec.radius ?? [12, 30]));
registerStamp('grove', (ctx) => stampGrove(ctx));
registerStamp('grass', (ctx) => stampBlob(ctx, 'grass', [16, 54], [4, 8], false));
registerStamp('brush', (ctx) => stampBlob(ctx, 'brush', [20, 56], [3, 6], false));
registerStamp('sand', (ctx) => stampBlob(ctx, 'sand', [24, 72], [5, 9], false));
registerStamp('vines', (ctx) => stampBlob(ctx, 'vines', [20, 56], [4, 8], true));
registerStamp('lava', (ctx) => stampBlob(ctx, 'lava', [26, 68], [5, 9], true));
registerStamp('shallows', (ctx) => stampShallows(ctx));
registerStamp('palm', (ctx, spec) => stampTree(ctx, spec.radius ?? [16, 28], 'palm'));
registerStamp('thicket', (ctx) => stampThicket(ctx));
registerStamp('tombstone', (ctx) => stampGraves(ctx));
registerStamp('cave', (ctx) => stampCaveMouth(ctx));
registerStamp('crystal', (ctx) => stampCrystal(ctx));
registerStamp('lava_vent', (ctx) => stampLavaVent(ctx));
// Flesh themed clutter (solids land in carved chambers; gore is a ground pool).
registerStamp('flesh_pod', (ctx, spec) => stampSolid(ctx, 'flesh_pod', spec.radius ?? [18, 30]));
registerStamp('bone', (ctx, spec) => stampSolid(ctx, 'bone', spec.radius ?? [12, 20]));
registerStamp('gore', (ctx, spec) => stampBlob(ctx, 'gore', spec.radius ?? [26, 46], [4, 7], false));
// Volcanic themed clutter.
registerStamp('obsidian', (ctx, spec) => stampSolid(ctx, 'obsidian', spec.radius ?? [20, 40]));
registerStamp('cinder', (ctx, spec) => stampBlob(ctx, 'cinder', spec.radius ?? [28, 50], [4, 8], false));
registerStamp('ember_vent', (ctx) => stampEmberVent(ctx));
// Marine clutter: kelp fields (walkable beds), coral heads + rocky outcrops (solids).
registerStamp('kelp', (ctx, spec) => stampBlob(ctx, 'kelp', spec.radius ?? [22, 40], [3, 6], false));
registerStamp('coral', (ctx, spec) => stampSolid(ctx, 'coral', spec.radius ?? [16, 28]));
registerStamp('sea_rock', (ctx, spec) => stampSolid(ctx, 'sea_rock', spec.radius ?? [22, 40]));
// Mycelia fungal clutter: towering caps + spires (solids), puffing spore-pods
// (active), glow-caps + a hyphal carpet (walkable ground overlays).
registerStamp('giant_mushroom', (ctx, spec) => stampSolid(ctx, 'giant_mushroom', spec.radius ?? [24, 42]));
registerStamp('fruiting_tower', (ctx, spec) => stampSolid(ctx, 'fruiting_tower', spec.radius ?? [26, 40]));
registerStamp('spore_pod', (ctx) => stampSporePod(ctx));
registerStamp('glow_cap', (ctx, spec) => stampSolid(ctx, 'glow_cap', spec.radius ?? [8, 14]));
registerStamp('mycelial_mat', (ctx, spec) => stampBlob(ctx, 'mycelial_mat', spec.radius ?? [30, 52], [4, 7], false));
registerStamp('structure', (ctx, spec) => {
  const s = spec.structure ? STRUCTURES[spec.structure] : undefined;
  if (!s) return;
  // Plan/generator defs route through the plan pipeline; legacy walls/props defs
  // keep the VERBATIM classic path (dispatch gated on the def, so the rng draw
  // pattern of every existing structure stamp is untouched).
  if (s.plan || s.generator) { placeStructurePlan(ctx, s); return; }
  const at = findSpot(ctx, Math.max(s.halfW, s.halfH) * 1.3, true, 30);
  if (at && areaFreeOf(ctx, at, Math.max(s.halfW, s.halfH) * 1.2, ['chasm', 'water'])) {
    placeStructure(ctx, s, at);
  }
});
registerStamp('cluster', (ctx, spec) => {
  const def = spec.cluster ? CLUSTERS[spec.cluster] : undefined;
  if (!def) return;
  stampCluster(ctx, def);
});
registerStamp('landmark', (ctx, spec) => {
  const def = spec.landmark ? LANDMARKS[spec.landmark] : undefined;
  if (!def) return;
  placeLandmark(ctx, def);
});

// LANDMARKS — geographic set-pieces (a fjord, a caldera, an oasis) as DATA
// recipes over the genkit shape primitives. A LandmarkDef names a registered
// BUILDER + its params; builders live in engine/landmarkBuilders.ts, recipe
// data in data/landmarks.ts. Landmarks require the walk grid (their shapes
// paint regions), reserve a circle footprint, honor the universal reachability
// invariant (mustReach anchors) or declare deliberate jump-only POCKETS, and
// may seed entity SPAWNS over their interior (an open pit crawling with them).
export interface LandmarkSpawns {
  table: { id: string; weight: number }[];
  count: [number, number];
  where: 'interior' | 'rim';
}

export interface LandmarkDef {
  id: string;
  /** LANDMARK_BUILDERS id (engine/landmarkBuilders.ts registers the library). */
  builder: string;
  /** Builder knobs — sizes, counts, variant switches; pure data. */
  params?: Record<string, unknown>;
  /** Footprint DIAMETER range (px), rolled per placement. */
  size: [number, number];
  /** Liquid id (genkit registry) builders resolve via bctx.liquid() — the
   *  same coast recipe pours water, lava, poison bog, ice, or the void. */
  liquid?: string;
  /** The anchor joins the reachability invariant (objective-grade landmark). */
  mustReach?: boolean;
  /** The interior is a deliberate jump/blink-only pocket (exempt from the
   *  invariant; spawn policy rides `spawns`). */
  pocket?: boolean;
  /** Entities seeded over the landmark (pit dwellers). */
  spawns?: LandmarkSpawns;
  /** Record the anchor as a POI (spawners/caches nest there). */
  poi?: boolean;
  /** Clear pre-existing doodads under the footprint before building. */
  clearSite?: boolean;
}

/** What a builder receives: the reserved footprint, the ensured grid, the
 *  zone rng, param/liquid resolution, and an OUT mask it fills with its
 *  interior (spawn + pocket sampling reads it; defaults to the inner disc). */
export interface LandmarkBuildCtx {
  ctx: GenCtx;
  grid: GridWalkField;
  rect: { x: number; y: number; w: number; h: number };
  center: Vec2;
  r: number;
  rng: Rng;
  def: LandmarkDef;
  param<T>(key: string, dflt: T): T;
  interior: Mask;
}

export type LandmarkBuilder = (b: LandmarkBuildCtx) => void;

const LANDMARK_BUILDERS: Record<string, LandmarkBuilder> = {};
const LANDMARKS: Record<string, LandmarkDef> = {};

export function registerLandmarkBuilder(id: string, b: LandmarkBuilder): void {
  if (LANDMARK_BUILDERS[id]) console.warn(`[landmarks] re-registering builder '${id}' — overriding`);
  LANDMARK_BUILDERS[id] = b;
}

export function registerLandmark(def: LandmarkDef): void {
  if (LANDMARKS[def.id]) console.warn(`[landmarks] re-registering '${def.id}' — overriding`);
  LANDMARKS[def.id] = def;
}

export function hasLandmark(id: string): boolean { return id in LANDMARKS; }

/** COMPOSITION EXPORTS — the pieces a layout RECIPE assembles (see
 *  engine/layoutRecipes.ts): the tileset's own decoration scatter, a landmark
 *  by id at a chosen anchor, a plan structure at a plot. Everything a recipe
 *  composes routes through the same placement/reachability machinery. */
export function scatterDecoration(ctx: GenCtx, def: ZoneDef): void { plainsLayout(ctx, def); }

export function placeLandmarkById(ctx: GenCtx, id: string, at?: Vec2): void {
  const def = LANDMARKS[id];
  if (!def) { console.warn(`[landmarks] placeLandmarkById: unknown '${id}'`); return; }
  placeLandmark(ctx, def, at);
}

export function raiseStructure(ctx: GenCtx, defId: string, at?: Vec2): void {
  const s = STRUCTURES[defId];
  if (!s) { console.warn(`[structures] raiseStructure: unknown '${defId}'`); return; }
  if (s.plan || s.generator) placeStructurePlan(ctx, s, at);
  else if (at) placeStructure(ctx, s, at);
}
export function hasLandmarkBuilder(id: string): boolean { return id in LANDMARK_BUILDERS; }
export function landmarkDefs(): LandmarkDef[] { return Object.values(LANDMARKS); }

/** Site a landmark footprint: portal/entry clearance + reservations + (on a
 *  pre-existing grid) walkable anchor probes. Draws-before-filters. */
function findLandmarkSpot(ctx: GenCtx, r: number): Vec2 | null {
  for (let tries = 0; tries < 18; tries++) {
    const p = vec(
      ctx.rng.range(BORDER + r, Math.max(BORDER + r, ctx.arena.w - BORDER - r)),
      ctx.rng.range(BORDER + r, Math.max(BORDER + r, ctx.arena.h - BORDER - r)));
    if (!clearOf(ctx, p, r * 0.8, true)) continue;
    if (inReserved(ctx, p, r * 0.8)) continue;
    // Anchor probes run on ANY grid — including a lazily-ensured one a carving
    // recipe (winding/spiral) has since repainted mostly wall: a landmark must
    // never site blind into solid rock (all-ground ensured grids pass free).
    if (ctx.walk) {
      const probes = [p, vec(p.x - r * 0.5, p.y), vec(p.x + r * 0.5, p.y), vec(p.x, p.y - r * 0.5), vec(p.x, p.y + r * 0.5)];
      if (probes.some(q => !ctx.walk!.isWalkable(q.x, q.y))) continue;
    }
    // Hazard-ground probes (the structure sitter's discipline): a pit straddling
    // an earlier recipe's lava river would bury its own approach.
    const hz = [p, vec(p.x - r * 0.6, p.y), vec(p.x + r * 0.6, p.y), vec(p.x, p.y - r * 0.6), vec(p.x, p.y + r * 0.6)];
    if (hz.some(q => pointOnKinds(ctx, q, HAZARD_GROUNDS))) continue;
    return p;
  }
  return null;
}

function placeLandmark(ctx: GenCtx, def: LandmarkDef, at?: Vec2): void {
  const builder = LANDMARK_BUILDERS[def.builder];
  if (!builder) { console.warn(`[landmarks] '${def.id}': unknown builder '${def.builder}'`); return; }
  const dia = ctx.rng.range(def.size[0], def.size[1]);
  const sited = at ?? findLandmarkSpot(ctx, dia / 2);
  if (!sited) return;
  // SNAP the footprint onto the walk lattice (the plan-structure rule): an
  // unsnapped mask origin phase-shifts every painted run one bleed cell in
  // +x/+y (fillRegion is intersect-inclusive) — thin rims seal, floors shrink.
  // Origin AND span are cell-quantized, so Mask.ox/oy/cols land exactly.
  const span = Math.ceil(dia / GEN_CELL) * GEN_CELL;
  const r = span / 2;
  const ox = Math.round((sited.x - r) / GEN_CELL) * GEN_CELL;
  const oy = Math.round((sited.y - r) / GEN_CELL) * GEN_CELL;
  const center = vec(ox + r, oy + r);
  ctx.reserved.push({ pos: vec(center.x, center.y), radius: r * 1.12 });
  if (def.clearSite) {
    for (let i = ctx.doodads.length - 1; i >= 0; i--) {
      const d = ctx.doodads[i];
      if (dist(d.pos, center) < r + d.radius * 0.4) {
        if (doodadRule(d.kind).seedPaired) {
          let ordinal = 0;
          for (let k = 0; k < i; k++) if (ctx.doodads[k].kind === d.kind) ordinal++;
          if (ordinal < ctx.caveSeeds.length) ctx.caveSeeds.splice(ordinal, 1);
        }
        ctx.doodads.splice(i, 1);
      }
    }
  }
  const grid = ensureGrid(ctx);
  const rect = { x: center.x - r, y: center.y - r, w: r * 2, h: r * 2 };
  // The interior mask frames the footprint at walk-cell resolution; builders
  // overwrite it with their true interior (spawn/pocket sampling reads it).
  const interior = Mask.forRect(rect.x, rect.y, rect.w, rect.h);
  const b: LandmarkBuildCtx = {
    ctx, grid, rect, center: vec(center.x, center.y), r, rng: ctx.rng, def,
    param: <T>(key: string, dflt: T): T => {
      const v = def.params?.[key];
      return v === undefined ? dflt : (v as T);
    },
    interior,
  };
  const preBuild = ctx.doodads.length;
  builder(b);
  // TERRAIN WINS: the builder painted rims/walls/gulfs AFTER the base layout's
  // open-ground scatter, so an earlier doodad whose footing is no longer
  // walkable is now embedded in a crater wall or hovering over a gulf — splice
  // it. Builder-placed pieces (rim rocks ON the wall ring, gulf islands) are
  // deliberate and stay: only indices < preBuild are candidates. seedPaired
  // kinds keep their parallel seed list zipped. Draw-free.
  for (let i = preBuild - 1; i >= 0; i--) {
    const d = ctx.doodads[i];
    if (d.keep) continue;
    if (Math.abs(d.pos.x - center.x) > r + d.radius || Math.abs(d.pos.y - center.y) > r + d.radius) continue;
    if (grid.isWalkable(d.pos.x, d.pos.y)) continue;
    if (doodadRule(d.kind).seedPaired) {
      let ordinal = 0;
      for (let k = 0; k < i; k++) if (ctx.doodads[k].kind === d.kind) ordinal++;
      if (ordinal < ctx.caveSeeds.length) ctx.caveSeeds.splice(ordinal, 1);
    }
    ctx.doodads.splice(i, 1);
  }
  if (def.poi) ctx.pois.push(vec(center.x, center.y));
  if (def.mustReach) (ctx.mustReach ??= []).push(vec(center.x, center.y));
  if (def.pocket) (ctx.pockets ??= []).push({ x: center.x, y: center.y, r });
  // Entity SPAWNS over the landmark: weighted picks over interior/rim cells,
  // resolved AT GEN (deterministic per seed) — loadZone materializes them.
  if (def.spawns) {
    const src = def.spawns.where === 'rim' ? b.interior.edge() : b.interior;
    const cells: Vec2[] = [];
    src.forEach((cx, cy) => {
      const c = src.center(cx, cy);
      if (!ctx.walk || ctx.walk.isWalkable(c.x, c.y)) cells.push(c);
    });
    if (cells.length) {
      const total = def.spawns.table.reduce((a, e) => a + e.weight, 0);
      const n = ctx.rng.int(def.spawns.count[0], def.spawns.count[1]);
      for (let i = 0; i < n; i++) {
        let roll = ctx.rng.range(0, total);
        let pick = def.spawns.table[def.spawns.table.length - 1];
        for (const e of def.spawns.table) { roll -= e.weight; if (roll <= 0) { pick = e; break; } }
        const cell = cells[ctx.rng.int(0, cells.length - 1)];
        (ctx.landmarkSpawns ??= []).push({ id: pick.id, pos: vec(cell.x, cell.y) });
      }
    }
  }
}


// CLUSTER STAMPS — data-driven composites. One ClusterDef generalizes the
// bespoke grove/thicket/rock-mud stamps: an ANCHOR found by the normal
// placement rules, then PIECES scattered on a radial band around it. Pieces
// avoid solids placed before them (spread look) unless `packed`, which lets a
// cluster's own pieces overlap each other while still avoiding everything that
// existed before the cluster began (grove semantics). Registered clusters ride
// the 'cluster' stamp: `{ kind: 'cluster', cluster: 'boulder_field', count: [1,3] }`.
export interface ClusterPiece {
  kind: DoodadKind;
  radius: [number, number];
  count: [number, number];
  /** Radial offset band from the anchor center (default [20, 85]). */
  ring?: [number, number];
  /** Pieces may PACK among themselves (only avoid pre-cluster solids). */
  packed?: boolean;
  /** Draw a random spin per piece (trees/rocks read better rotated). */
  rot?: boolean;
}

export interface ClusterDef {
  id: string;
  /** findSpot params for the cluster's center (kind supplies spacing/walk/forbid
   *  gates from its DOODAD_RULES row when given). */
  anchor: { radius: number; hard?: boolean; spacing?: number; kind?: DoodadKind };
  pieces: ClusterPiece[];
  /** Record the anchor as a POI (spawners/caches nest there). */
  poi?: boolean;
}

const CLUSTERS: Record<string, ClusterDef> = {};

/** Register a composite cluster stamp (pure data — no new engine code). */
export function registerCluster(def: ClusterDef): void {
  if (CLUSTERS[def.id]) console.warn(`[stamps] re-registering cluster '${def.id}' — overriding`);
  CLUSTERS[def.id] = def;
}

/** Is a cluster id registered? (Boot validation for layout refs.) */
export function hasCluster(id: string): boolean { return id in CLUSTERS; }

/** All registered cluster defs (boot validation walks their piece kinds). */
export function clusterDefs(): ClusterDef[] { return Object.values(CLUSTERS); }

function stampCluster(ctx: GenCtx, def: ClusterDef): void {
  const a = def.anchor;
  const spacing = a.spacing ?? (a.kind ? doodadRule(a.kind).spacing ?? 0 : 0);
  const center = findSpot(ctx, a.radius, a.hard ?? true, spacing, true, a.kind);
  if (!center) return;
  const clusterStart = ctx.doodads.length;
  for (const piece of def.pieces) {
    const rule = doodadRule(piece.kind);
    const hard = !!rule.blocksMove;
    const ring = piece.ring ?? [20, 85];
    const n = ctx.rng.int(piece.count[0], piece.count[1]);
    for (let i = 0; i < n; i++) {
      // Draws happen BEFORE the filters (findSpot discipline) so a rejected
      // spot never shifts the sequence of later pieces.
      const ang = ctx.rng.range(0, Math.PI * 2);
      const off = ctx.rng.range(ring[0], ring[1]);
      const r = ctx.rng.range(piece.radius[0], piece.radius[1]);
      const rot = piece.rot ? ctx.rng.range(0, Math.PI * 2) : undefined;
      const p = vec(center.x + Math.cos(ang) * off, center.y + Math.sin(ang) * off);
      if (!clearOf(ctx, p, r, hard)) continue;
      if (inReserved(ctx, p, r)) continue;
      if (ctx.walk && walkGated(piece.kind) && !ruleIgnored(ctx, 'walk') && !ctx.walk.isWalkable(p.x, p.y)) continue;
      if (isSolid(piece.kind)
          && overlapsSolidBefore(ctx, p, r, piece.packed ? clusterStart : ctx.doodads.length)) continue;
      ctx.doodads.push({ pos: p, radius: r, kind: piece.kind, rot });
    }
  }
  if (def.poi) ctx.pois.push(center);
}

/** BOOT VALIDATION (wired in sim.ts like the biome validators): every layout
 *  entry across the authored data must name a registered stamp, every cluster/
 *  structure ref must resolve, and no cluster piece may emit a seed-paired kind
 *  (cave_entrance's caveSeeds zip would shear). The caller supplies the layout
 *  sources so this module stays data-import-free (no engine→data cycle). */
export function validateStamps(sources: { source: string; specs: StampSpec[] }[]): string[] {
  const bad: string[] = [];
  for (const { source, specs } of sources) {
    for (const s of specs ?? []) {
      if (!hasStamp(s.kind)) bad.push(`${source}: unregistered stamp '${s.kind}'`);
      if (s.kind === 'cluster' && (!s.cluster || !hasCluster(s.cluster))) {
        bad.push(`${source}: cluster stamp names unknown cluster '${s.cluster ?? '(none)'}'`);
      }
      if (s.kind === 'landmark' && (!s.landmark || !hasLandmark(s.landmark))) {
        bad.push(`${source}: landmark stamp names unknown landmark '${s.landmark ?? '(none)'}'`);
      }
      if (s.kind === 'structure' && s.structure && !STRUCTURES[s.structure]) {
        bad.push(`${source}: structure stamp names unknown structure '${s.structure}'`);
      }
    }
  }
  for (const c of clusterDefs()) {
    for (const p of c.pieces) {
      if (doodadRule(p.kind).seedPaired) {
        bad.push(`cluster '${c.id}': piece kind '${p.kind}' is seed-paired (only its dedicated stamp may emit it)`);
      }
    }
  }
  return bad;
}

/** A single tree (or palm): a rock that grew up. The kind is parametric so a
 *  palm reuses the exact placement logic — modularity for the next canopy. */
function stampTree(ctx: GenCtx, radius: [number, number], kind: DoodadKind = 'tree'): void {
  const r = ctx.rng.range(radius[0], radius[1]);
  const p = findSpot(ctx, r, true, doodadRule(kind).spacing ?? 0, true, kind);
  if (p) ctx.doodads.push({ pos: p, radius: r, kind, rot: ctx.rng.range(0, Math.PI * 2) });
}

/** A thicket: a tight cluster of impassable bramble wrapped in a vine mat —
 *  real cover you cannot push through, only fight around. */
function stampThicket(ctx: GenCtx): void {
  const center = findSpot(ctx, 80, true, doodadRule('thicket').spacing ?? 0, true, 'thicket');
  if (!center) return;
  const before = ctx.doodads.length; // thicket pieces avoid earlier solids, pack among themselves
  const n = ctx.rng.int(4, 7);
  for (let i = 0; i < n; i++) {
    const ang = ctx.rng.range(0, Math.PI * 2);
    const off = ctx.rng.range(14, 70);
    const r = ctx.rng.range(16, 26);
    const p = vec(center.x + Math.cos(ang) * off, center.y + Math.sin(ang) * off);
    if (!clearOf(ctx, p, r, true) || inReserved(ctx, p, r)) continue;
    if (overlapsSolidBefore(ctx, p, r, before)) continue;
    ctx.doodads.push({ pos: p, radius: r, kind: 'thicket', rot: ctx.rng.range(0, Math.PI * 2) });
  }
  ctx.doodads.push({ pos: center, radius: ctx.rng.range(30, 46), kind: 'vines' });
}

/** A single tombstone — generateLayout already loops per rolled count, so the
 *  crypt's headstone field grows from a `tombstone` stamp with a high count. */
function stampGraves(ctx: GenCtx): void {
  const r = ctx.rng.range(10, 16);
  const p = findSpot(ctx, r, true, doodadRule('tombstone').spacing ?? 0, true, 'tombstone');
  // A slight lean (±~17°), not a full spin — headstones stand upright, just
  // weathered askew like an old graveyard.
  if (p) ctx.doodads.push({ pos: p, radius: r, kind: 'tombstone', rot: ctx.rng.range(-0.3, 0.3) });
}

/** A shallow swathe: a wading-depth water patch (beaches and isle shores). It
 *  reuses the water kind with `shallow:true`, so groundAt wades it, never swims. */
function stampShallows(ctx: GenCtx): void {
  const R = ctx.rng.range(26, 78);
  const center = findSpot(ctx, R * 1.6, false, 16, false); // ground: merges over solids
  if (!center) return;
  const n = ctx.rng.int(5, 9);
  ctx.doodads.push({ pos: center, radius: R, kind: 'water', shallow: true });
  for (let i = 0; i < n; i++) {
    const ang = ctx.rng.range(0, Math.PI * 2);
    const off = ctx.rng.range(R * 0.5, R * 1.2);
    const r = R * ctx.rng.range(0.55, 0.95);
    const p = vec(center.x + Math.cos(ang) * off, center.y + Math.sin(ang) * off);
    if (!clearOf(ctx, p, r, false) || inReserved(ctx, p, r)) continue;
    ctx.doodads.push({ pos: p, radius: r, kind: 'water', shallow: true });
  }
}

/** A cave mouth: a non-blocking trigger doodad with a STABLE per-entrance seed
 *  recorded in lock-step, so the same cave regenerates on every revisit. The
 *  doodad and its seed are pushed together; loadZone zips them back by index. */
function stampCaveMouth(ctx: GenCtx): void {
  const p = findSpot(ctx, 30, true, doodadRule('cave_entrance').spacing ?? 0, true, 'cave_entrance');
  if (!p) return;
  const seed = (ctx.rng.int(0, 0x7fffffff) ^ 0xca5e) >>> 0;
  ctx.doodads.push({ pos: p, radius: 28, kind: 'cave_entrance' });
  ctx.caveSeeds.push(seed);
}

/** A grove: trees crowded around brush and grass — real cover. */
function stampGrove(ctx: GenCtx): void {
  const center = findSpot(ctx, 90, true, 30);
  if (!center) return;
  const before = ctx.doodads.length; // grove trees avoid earlier solids, not each other
  const trees = ctx.rng.int(3, 6);
  for (let i = 0; i < trees; i++) {
    const ang = ctx.rng.range(0, Math.PI * 2);
    const off = ctx.rng.range(20, 85);
    const r = ctx.rng.range(13, 22);
    const p = vec(center.x + Math.cos(ang) * off, center.y + Math.sin(ang) * off);
    if (!clearOf(ctx, p, r, true) || inReserved(ctx, p, r)) continue;
    if (overlapsSolidBefore(ctx, p, r, before)) continue;
    ctx.doodads.push({ pos: p, radius: r, kind: 'tree', rot: ctx.rng.range(0, Math.PI * 2) });
  }
  ctx.doodads.push({ pos: center, radius: ctx.rng.range(34, 50), kind: 'brush', rot: ctx.rng.range(0, Math.PI * 2) });
  ctx.doodads.push({
    pos: vec(center.x + ctx.rng.range(-30, 30), center.y + ctx.rng.range(-30, 30)),
    radius: ctx.rng.range(24, 40), kind: 'grass',
  });
}

/** Is this rule relaxed by the RUNNING stamp's override? (Transient, set by
 *  stamp() — reads draw nothing, so rng sequences are untouched.) */
function ruleIgnored(ctx: GenCtx, rule: StampIgnoreRule): boolean {
  return !!ctx.ruleOver?.ignore?.includes(rule);
}

/** Is this spot clear of the entry, the portals, and the zone border? */
function clearOf(ctx: GenCtx, p: Vec2, r: number, hard: boolean): boolean {
  if (!ruleIgnored(ctx, 'border')) {
    if (p.x < BORDER + r || p.x > ctx.arena.w - BORDER - r) return false;
    if (p.y < BORDER + r || p.y > ctx.arena.h - BORDER - r) return false;
  }
  if (ruleIgnored(ctx, 'portalClear')) return true;
  if (dist(p, ctx.entry) < r + ENTRY_CLEAR) return false;
  // Soft terrain (mud) may lap closer to portals than blocking terrain.
  const margin = hard ? EXIT_CLEAR : EXIT_CLEAR * 0.6;
  return !ctx.exits.some(e => dist(p, e) < r + margin);
}

/** Try a few random placements; null when the zone is too crowded. When
 *  `checkSolids` (default), the spacing test rejects spots overlapping any
 *  SOLID doodad — so solids never pile on each other. Ground stamps pass false
 *  so a blob may merge freely over rocks/trees (a pool laps the boulders). The
 *  placement DRAWS happen before the filter, so the rng sequence is unchanged. */
function findSpot(
  ctx: GenCtx, r: number, hard: boolean, spacing = 0, checkSolids = true, kind?: DoodadKind,
): Vec2 | null {
  const rule = kind ? doodadRule(kind) : null;
  const over = ctx.ruleOver;
  // Rule-breaker relaxations (absent = today's path, byte-identical): a spacing
  // override swaps the caller's gap; 'border' WIDENS the sample rect (the draw
  // COUNT is unchanged — 2 range draws per try either way, so rng stays aligned).
  // ignore:'spacing' keeps the OVERLAP test alive at zero gap (abut, never
  // intersect) — distinct from ignore:'solids', which skips the test entirely.
  const spacingIgnored = ruleIgnored(ctx, 'spacing');
  const effSpacing = spacingIgnored ? 0 : (over?.spacing ?? spacing);
  const inset = ruleIgnored(ctx, 'border') ? r : BORDER + r;
  for (let tries = 0; tries < 26; tries++) {
    const p = vec(
      ctx.rng.range(inset, ctx.arena.w - inset),
      ctx.rng.range(inset, ctx.arena.h - inset));
    if (!clearOf(ctx, p, r, hard)) continue;
    if (inReserved(ctx, p, r)) continue;
    if ((effSpacing > 0 || spacingIgnored) && checkSolids && !ruleIgnored(ctx, 'solids')
        && ctx.doodads.some(d => isSolid(d.kind) && dist(p, d.pos) < r + d.radius + effSpacing)) continue;
    // RULE gates (only when a kind is supplied): keep solids/decoration on walkable
    // ground in grid zones, and out of forbidden pools/pits. Placed AFTER the legacy
    // checks so the rng draw sequence is byte-identical for callers passing no kind.
    if (rule) {
      if (!ruleIgnored(ctx, 'walk') && ctx.walk && walkGated(kind!) && !ctx.walk.isWalkable(p.x, p.y)) continue;
      const forbid = over?.forbidOn ?? rule.forbidOn;
      if (!ruleIgnored(ctx, 'forbid') && forbid && !areaFreeOf(ctx, p, r, forbid)) continue;
    }
    return p;
  }
  return null;
}

// --- the stamps --------------------------------------------------------------

/** A single SOLID doodad placed by its own rule (spacing + walk-gating + forbidden
 *  grounds) — the generic body most solids share (boulders, organic pods, obsidian
 *  shards). Adding a solid kind needs only a DOODAD_RULES row + this stamp + a render
 *  branch; no bespoke placement code. */
function stampSolid(ctx: GenCtx, kind: DoodadKind, radius: [number, number]): void {
  const r = ctx.rng.range(radius[0], radius[1]);
  const p = findSpot(ctx, r, true, doodadRule(kind).spacing ?? 0, true, kind);
  if (p) ctx.doodads.push({ pos: p, radius: r, kind, rot: ctx.rng.range(0, Math.PI * 2) });
}

function stampRock(ctx: GenCtx, radius: [number, number]): void { stampSolid(ctx, 'rock', radius); }

/**
 * A cliff run: overlapping circles deposited along a wandering walk, so the
 * pieces weave together into a wall. Stops early rather than sealing off an
 * entry or portal.
 */
function stampCliff(ctx: GenCtx): void {
  const start = findSpot(ctx, 60, true, doodadRule('cliff').spacing ?? 0, true, 'cliff');
  if (!start) return;
  let dir = ctx.rng.range(0, Math.PI * 2);
  const steps = ctx.rng.int(7, 14);
  const baseR = ctx.rng.range(20, 30);
  let p = vec(start.x, start.y);
  for (let i = 0; i < steps; i++) {
    const r = baseR * ctx.rng.range(0.85, 1.2);
    if (!clearOf(ctx, p, r, true)) break;
    if (inReserved(ctx, p, r)) break; // cliffs don't wall off structures
    ctx.doodads.push({ pos: vec(p.x, p.y), radius: r, kind: 'cliff' });
    dir += ctx.rng.range(-0.45, 0.45);
    p = vec(p.x + Math.cos(dir) * r * 1.5, p.y + Math.sin(dir) * r * 1.5);
  }
}

/** A blob of overlapping circles — mud patches and chasm lakes. */
function stampBlob(
  ctx: GenCtx, kind: DoodadKind,
  radius: [number, number], pieces: [number, number], hard: boolean,
): void {
  const R = ctx.rng.range(radius[0], radius[1]);
  // Blobs are terrain, not solids: they merge freely over rocks/trees (a pool
  // laps the boulders) — checkSolids=false. Only brush spins per-piece, and its
  // rot draw is conditional so non-brush blobs keep the exact same rng sequence.
  const center = findSpot(ctx, R * 1.8, hard, 20, false, kind);
  if (!center) return;
  const n = ctx.rng.int(pieces[0], pieces[1]);
  const crot = (): number | undefined => kind === 'brush' ? ctx.rng.range(0, Math.PI * 2) : undefined;
  ctx.doodads.push({ pos: center, radius: R, kind, rot: crot() });
  for (let i = 0; i < n; i++) {
    const ang = ctx.rng.range(0, Math.PI * 2);
    const off = ctx.rng.range(R * 0.5, R * 1.2);
    const r = R * ctx.rng.range(0.55, 0.95);
    const p = vec(center.x + Math.cos(ang) * off, center.y + Math.sin(ang) * off);
    if (!clearOf(ctx, p, r, hard)) continue;
    if (inReserved(ctx, p, r)) continue;
    ctx.doodads.push({ pos: p, radius: r, kind, rot: crot() });
  }
}

/**
 * A ravine: a chasm strip cut across the middle of the map, spanned by one
 * or two plank bridges. Circles that would crowd the entry or a portal are
 * simply skipped — the gap becomes a natural crossing.
 */
function stampRavine(ctx: GenCtx): void {
  const { rng, arena } = ctx;
  const dir = rng.range(0, Math.PI);
  const center = vec(
    arena.w * rng.range(0.35, 0.65),
    arena.h * rng.range(0.35, 0.65));
  const half = Math.min(arena.w, arena.h) * rng.range(0.22, 0.34);
  const r = rng.range(36, 46);
  const step = r * 1.1;

  const path: Vec2[] = [];
  let wob = 0;
  for (let s = -half; s <= half; s += step) {
    wob += rng.range(-0.12, 0.12);
    const d = dir + wob;
    const p = vec(center.x + Math.cos(d) * s, center.y + Math.sin(d) * s);
    if (p.x < BORDER || p.x > arena.w - BORDER || p.y < BORDER || p.y > arena.h - BORDER) continue;
    if (dist(p, ctx.entry) < r + ENTRY_CLEAR * 0.8) continue;
    if (ctx.exits.some(e => dist(p, e) < r + EXIT_CLEAR)) continue;
    if (inReserved(ctx, p, r)) continue; // ravines route around structures
    ctx.doodads.push({ pos: p, radius: r, kind: 'chasm' });
    path.push(p);
  }
  if (path.length < 4) return;

  // Bridges span the gap perpendicular to the cut.
  const spans = path.length > 10 ? 2 : 1;
  const fracs = spans === 2 ? [0.3, 0.72] : [rng.range(0.35, 0.65)];
  for (const f of fracs) {
    const i = Math.max(1, Math.min(path.length - 2, Math.round(f * path.length)));
    const at = path[i];
    const along = Math.atan2(path[i + 1].y - path[i - 1].y, path[i + 1].x - path[i - 1].x);
    const perp = along + Math.PI / 2;
    const reach = r * 1.7;
    for (let s = -reach; s <= reach; s += 18) {
      ctx.doodads.push({
        pos: vec(at.x + Math.cos(perp) * s, at.y + Math.sin(perp) * s),
        radius: 24, kind: 'bridge', dir: perp,
      });
    }
  }
}

/**
 * A river: a winding strip of water cut across the map. Crossable anywhere
 * (water slows, it doesn't block), but FORDS — marked shallow stretches —
 * are the dignified way over: wading-depth no matter how wide the channel.
 */
function stampRiver(ctx: GenCtx): void {
  const { rng, arena } = ctx;
  const dir = rng.range(0, Math.PI);
  const center = vec(
    arena.w * rng.range(0.35, 0.65),
    arena.h * rng.range(0.35, 0.65));
  const half = Math.min(arena.w, arena.h) * rng.range(0.3, 0.45);
  // Channel width varies river-to-river (a creek here, a broad flow there);
  // step stays proportional so the discs always overlap into ONE body and
  // the deep channel never strobes at the seams (see groundAt's deepInset).
  const r = rng.range(32, 60);
  const step = r * 0.95;

  const placed: Doodad[] = [];
  let wob = 0;
  for (let s = -half; s <= half; s += step) {
    wob += rng.range(-0.16, 0.16);
    const d = dir + wob;
    const p = vec(center.x + Math.cos(d) * s, center.y + Math.sin(d) * s);
    if (p.x < BORDER || p.x > arena.w - BORDER || p.y < BORDER || p.y > arena.h - BORDER) continue;
    if (dist(p, ctx.entry) < r + ENTRY_CLEAR * 0.7) continue;
    if (ctx.exits.some(e => dist(p, e) < r + EXIT_CLEAR * 0.7)) continue;
    if (inReserved(ctx, p, r)) continue; // rivers bend around camps and ruins
    const doo: Doodad = { pos: p, radius: r * rng.range(0.9, 1.1), kind: 'water' };
    ctx.doodads.push(doo);
    placed.push(doo);
  }
  if (placed.length < 4) return;
  // Fords: 1-2 shallow windows along the channel.
  const fords = placed.length > 11 ? 2 : 1;
  const fracs = fords === 2 ? [0.28, 0.7] : [rng.range(0.35, 0.65)];
  for (const f of fracs) {
    const i = Math.round(f * (placed.length - 1));
    for (const j of [i - 1, i, i + 1]) {
      if (placed[j]) placed[j].shallow = true;
    }
  }
}

/**
 * A walled camp: a palisade rectangle with 1-2 gate gaps, its yard a POI
 * (spawners, caches, shrines and altars nest inside) — and the world posts
 * a guard pack at the center. Wall pieces block movement AND projectiles,
 * so storming a camp is a real proposition.
 */
function stampCamp(ctx: GenCtx): void {
  const { rng } = ctx;
  const halfW = rng.range(130, 190);
  const halfH = rng.range(110, 160);
  // Camps tolerate company — a boulder inside the palisade is flavor — but
  // nobody builds a fort over a chasm or in a lake: the footprint must be
  // free of hazard terrain, and once sited it's RESERVED so later rivers
  // and ravines route around it.
  const footprint = Math.max(halfW, halfH) * 1.15;
  let center: Vec2 | null = null;
  for (let tries = 0; tries < 14 && !center; tries++) {
    const p = findSpot(ctx, Math.max(halfW, halfH) * 0.55, true, 0);
    if (p && areaFreeOf(ctx, p, footprint, ['chasm', 'water', 'bog', 'swamp'])) center = p;
  }
  if (!center) return;
  ctx.reserved.push({ pos: center, radius: footprint + 20 });
  const segR = 13;
  const spacing = segR * 1.7;
  const gates: ('n' | 's' | 'e' | 'w')[] = ['n', 's', 'e', 'w'];
  const gateSides = new Set([gates[rng.int(0, 3)]]);
  if (rng.chance(0.45)) gateSides.add(gates[rng.int(0, 3)]);
  const gateAt = rng.range(-0.4, 0.4); // gate position along its side
  const gateHalf = 58; // generous: walk through, don't squeeze

  const sides: { side: 'n' | 's' | 'e' | 'w'; from: Vec2; to: Vec2 }[] = [
    { side: 'n', from: vec(center.x - halfW, center.y - halfH), to: vec(center.x + halfW, center.y - halfH) },
    { side: 's', from: vec(center.x - halfW, center.y + halfH), to: vec(center.x + halfW, center.y + halfH) },
    { side: 'w', from: vec(center.x - halfW, center.y - halfH), to: vec(center.x - halfW, center.y + halfH) },
    { side: 'e', from: vec(center.x + halfW, center.y - halfH), to: vec(center.x + halfW, center.y + halfH) },
  ];
  for (const s of sides) {
    const len = dist(s.from, s.to);
    const steps = Math.ceil(len / spacing);
    const gateCenter = len / 2 + gateAt * len * 0.5;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * len;
      if (gateSides.has(s.side) && Math.abs(t - gateCenter) < gateHalf) continue;
      const p = vec(
        s.from.x + (s.to.x - s.from.x) * (t / len),
        s.from.y + (s.to.y - s.from.y) * (t / len));
      if (!clearOf(ctx, p, segR, true)) continue; // broken walls are flavor
      ctx.doodads.push({ pos: p, radius: segR, kind: 'wall' });
    }
  }
  ctx.pois.push(center);
  ctx.camps.push(center);
}

/**
 * A ruin ring: broken walls around an interior worth visiting. The center
 * is recorded as a POI — spawners and gem caches are placed there first.
 */
function stampRuin(ctx: GenCtx): void {
  const R = ctx.rng.range(95, 140);
  let center: Vec2 | null = null;
  for (let tries = 0; tries < 10 && !center; tries++) {
    const p = findSpot(ctx, R + 40, true, 30);
    if (p && areaFreeOf(ctx, p, R + 30, ['chasm', 'water'])) center = p;
  }
  if (!center) return;
  ctx.reserved.push({ pos: center, radius: R + 40 });
  const segments = ctx.rng.int(10, 14);
  const gapAt = ctx.rng.range(0, Math.PI * 2);
  const gapWidth = ctx.rng.range(0.9, 1.5);
  const secondGap = ctx.rng.chance(0.5) ? gapAt + Math.PI + ctx.rng.range(-0.6, 0.6) : null;
  for (let i = 0; i < segments; i++) {
    const ang = (i / segments) * Math.PI * 2;
    const da = Math.abs(Math.atan2(Math.sin(ang - gapAt), Math.cos(ang - gapAt)));
    if (da < gapWidth / 2) continue;
    if (secondGap !== null) {
      const db = Math.abs(Math.atan2(Math.sin(ang - secondGap), Math.cos(ang - secondGap)));
      if (db < gapWidth / 2) continue;
    }
    const r = ctx.rng.range(15, 22);
    const p = vec(center.x + Math.cos(ang) * R, center.y + Math.sin(ang) * R);
    if (!clearOf(ctx, p, r, true)) continue;
    ctx.doodads.push({ pos: p, radius: r, kind: 'rock', rot: ctx.rng.range(0, Math.PI * 2) });
  }
  ctx.pois.push(center);
}
