// ---------------------------------------------------------------------------
// REGION KINDS — the unified, data-driven "what is this ground/space, and what
// does being in it DO" registry. The Phase-3 spine.
//
// Before this, three things were hardcoded: the terrain-status switch
// (updateTerrainEffects), the GROUND_KINDS list, and the binary walk mask. They
// all collapse into ONE open registry of RegionKind rows. Each row is pure DATA:
//   • collision policy  — walkable? blocks at the boundary, or enter-then-resolve?
//   • boundary policy    — what happens when a MOVE enters it (void → fall)
//   • standing effect    — a per-tick status / survival drain / speed scale
//   • enter effect       — a once-on-entry status + floating text (bog poison…)
//   • visual             — a purely-graphical region needs NO behaviour
//   • escape-hatch hooks — onEnter/onStand/onExit for arbitrary future behaviour
//
// So void-damage, underwater-breath, an environmental slow, and a visual-only
// shimmer are all just ROWS here — and the example future mechanics (a knockback-
// collision support, a void-fall-respawn, a flicker teleport, env effects) plug
// into the same seams (procs, RecoveryPolicy, DisplacementPolicy) without engine
// surgery. Adding a kind = registerRegion(...), never an engine edit.
//
// Pure data + types: imports only TYPES (Actor/World) for the optional handler
// signatures, so it stays a leaf with no runtime cycle (mirrors traits/biomes).
// ---------------------------------------------------------------------------

import type { Actor } from '../engine/actor';
import type { World } from '../engine/world';
import type { DamageType } from '../engine/stats';

/** How much a recovery/collision outcome hurts. */
export interface DamageSpec {
  /** Flat amount, OR a fraction of the victim's max life. */
  amount: number;
  pctMaxLife?: number;
  type: DamageType;
  /** May this damage kill (a fatal fall flows into the normal death path)? */
  canKill?: boolean;
}

/** What happens when an actor LEAVES the survivable region (enters a non-blocking
 *  non-walkable region like void). A discriminated union, resolved by `kind`.
 *  `block` is the Phase-2 default (confine at the boundary). NO literal "void rule"
 *  exists anywhere — void is just a RegionKind whose boundaryPolicy is `fall`. */
export type RecoveryPolicy =
  | { kind: 'block' }
  | { kind: 'eject'; to: 'edge'; damage?: DamageSpec }
  | { kind: 'fall'; to: 'edge' | 'lastNode'; damage?: DamageSpec }
  | { kind: 'instakill' }
  | { kind: 'teleport'; to: 'lastNode' | 'waypoint' }
  // THE EDGE IS A DOOR: stepping off standing cloud IS the fall — the world
  // below catches you (the vertical fabrics' proportional skyfall; the sky
  // keeps whatever else steps off). Wings, levitation and airborne moves
  // (dash/leap) never trigger it. Ends every detached-island hard-lock: any
  // edge, anywhere, is always a way down.
  | { kind: 'skyfall' }
  // THE PIT IS A DOOR (the pitfall fabric, engine/pitfall.ts): losing the
  // floor over a chasm DROPS you one stratum — the pit's own underzone mints
  // deterministically (the strata fabric's ladder) and the world continues
  // below: the player rides the chasm_fall traversal down and climbs back
  // out at the very rim; ally seats scramble; a hostile SHOVED past the lip
  // is swallowed — killed with full credit to whoever shoved it (the
  // knockback payoff), loot left at the rim. Wings, levitation, airborne
  // moves, and bodies whose HABITAT is the pit never fall. `damage` is the
  // landing toll (never lethal for players — applyEnvDamage floors at 1
  // unless canKill).
  | { kind: 'descend'; damage?: DamageSpec };

/** Per-DISPLACEMENT override so no movement ability is ever boxed in by the
 *  walkability model. A flicker teleport / wall-phase / future "insane mechanic"
 *  declares which confinements it ignores. Default {} = full confinement (today). */
export interface DisplacementPolicy {
  /** Pass through walls / region boundaries (don't confine to walkable). */
  ignoreConfine?: boolean;
  /** Cross a fall region (void) without triggering its boundary policy. */
  ignoreFall?: boolean;
  /** Ignore standing hazards/effects during the move. */
  ignoreHazard?: boolean;
}

/** What clampPos can OPTIONALLY report about a move that was arrested — the seam
 *  the collision-proc (knockback-collision support) reads. Opt-in: omit `out` and
 *  clampPos costs exactly what it did before. */
export interface CollisionResult {
  hit: 'none' | 'bounds' | 'wall' | 'void' | 'entity';
  at: { x: number; y: number };
  /** Outward normal from the blocker (for impact direction), when known. */
  normal?: { x: number; y: number };
  /** The region kind / doodad kind that stopped the move. */
  blockedKind?: string;
}

/** A purely-graphical region's render hint (consumed by a generic renderer pass). */
export interface RegionVisualSpec {
  fill: string;
  /** 0..1 opacity of the wash. */
  alpha?: number;
  /** A gentle animated shimmer/pulse (renderer interprets). 'prism' walks
   *  the fill's hue around the whole spectrum, phase-offset per cell — the
   *  rainbow-span grammar (the declared fill becomes the fallback only). */
  animate?: 'shimmer' | 'pulse' | 'drift' | 'prism';
  /** BOUNDARY EDGE: painted on every side facing walkable ground so the
   *  region's rim READS at a glance — a flesh wall's pale membrane, the
   *  mycelium's luminous weave. Bakes with the ground chunks; `width` in
   *  world units (default 4). Without it a visual-region wall can sit in
   *  the same tones as its biome's floor and swallow the boundary. */
  edge?: { color: string; width?: number };
  /** DRESSED-STONE coursework (running-bond masonry) over the wall fill —
   *  the built-structure read. A flag, not an id compare: any future
   *  fortification region opts in with one word. */
  masonry?: boolean;
  /** ORGANIC FOLIAGE over the wall fill — seeded leaf clumps + sprig curls
   *  in the wall's own shade ramp, so a LIVING wall (the jungle's verdure)
   *  reads as packed vegetation instead of flat paint. Masonry's green
   *  sibling: a flag, not an id compare. */
  foliage?: boolean;
  /** EYES grown into the wall mass — the baker lays seeded SOCKETS (rims,
   *  sclera, lid creases) in the wall's own ramp, and the live wallEyes
   *  pass gives them drearily SEEKING pupils (render/vis/wallEyes.ts; one
   *  geometry, two halves). Foliage's watching sibling: a flag, not an id
   *  compare — any wall that should look back opts in with one word. */
  eyes?: boolean;
  /** A WINDOW to whatever renders BENEATH the ground layer: the baker CLEARS
   *  these cells instead of filling them, so the understory (the zone far
   *  below a cloud shelf, a starfield, the frame backdrop) shows through the
   *  hole. `fill` becomes the no-understory fallback tint only; the `edge`
   *  rim still bakes — a cloud lip around every gap. */
  window?: boolean;
}

/** A once-on-enter status (bog poison, tentacle stun). amount scales with zone
 *  level via amountPerLevel so the migration reproduces today's numbers exactly. */
export interface RegionEnterStatus {
  id: string;
  amount?: number;
  amountPerLevel?: number;
  duration: number;
}

/** A region row's DOUSE lane (RegionKind.douses): the ground as CURE.
 *  Statuses shed while you stand in it — the wet inverse of the swelter
 *  bake, read by World's region sweep (shedding) and by the ambient
 *  accrual loops (suppression: doused ground never bakes what it strips). */
export interface DouseSpec {
  /** Status ids this ground strips (one stack from each per beat). */
  statuses: string[];
  /** Seconds per shed beat (DOUSE_CFG.every when unset). */
  every?: number;
  /** Floating text when a listed status fully lifts. */
  text?: string;
  /** Text tint (DOUSE_CFG.color when unset). */
  color?: string;
}

/** Douse-lane defaults (the per-row fields override). */
export const DOUSE_CFG = {
  /** Seconds per shed beat when a row names none — brisk on purpose: refuge
   *  should feel decisive (8 scorch stacks gone in ~2.5s of wading). */
  every: 0.3,
  /** Default float tint: cool water-blue. */
  color: '#7ad4f0',
} as const;

export interface RegionKind {
  id: string;
  /** Does NORMAL movement stay inside walkable cells (i.e. is THIS cell standable)? */
  walkable: boolean;
  /** When !walkable: confine at the boundary (wall) vs let a move ENTER then resolve
   *  via boundaryPolicy (void). Ignored when walkable. */
  blocks: boolean;
  /** Outcome when a move enters a non-blocking non-walkable region (void → fall). */
  boundaryPolicy?: RecoveryPolicy;
  /** applyStatus source label, to reproduce today's "the mud" / "the bog" text. */
  label?: string;
  /** Per-tick status while standing in (mud→mired, water→wading). */
  standStatus?: string;
  /** Depth-aware variant (water deep → swimming). */
  standStatusDeep?: string;
  /** Once-on-enter status (bog→poison, tentacle_field→stun). */
  enterStatus?: RegionEnterStatus;
  /** Floating text on enter ("bogged!"). */
  enterText?: { text: string; color: string };
  /** Drains a survival resource while standing in (deep_water → breath). */
  survival?: { resource: string; drain: number };
  /** DOUSE (refuge as data): standing in this ground SHEDS the listed
   *  statuses — one stack from each per `every` seconds (DOUSE_CFG.every
   *  when unset), sheet kept honest per shed, `text` floating once when a
   *  status fully lifts. The heat loop honors it in reverse: ground that
   *  douses a status also refuses to BAKE it while you stand there (water
   *  is true refuge from the sun, not a slower tug-of-war). Insurance
   *  gates it like every other ground effect — a flier skimming the pool
   *  is not wet. Any row may wear one: the water family strips sunscorch
   *  today; a snowmelt spring could strip burn tomorrow. */
  douses?: DouseSpec;
  /** TERRAIN DAMAGE: typed dps while standing in (lava). Applied through
   *  the victim's RESISTANCE only — never armor/evasion (terrain doesn't
   *  swing) — so capping the matching res IS the build answer. The
   *  insured walk free: fliers, bodies whose habitat IS this ground, and
   *  MonsterDef.immuneGround bearers (the magma bestiary swims its own
   *  melt). dps + dpsPerLevel × zone level. */
  standDamage?: { dps: number; dpsPerLevel?: number; type: DamageType };
  /** Direct move-speed multiplier while standing in (for kinds that don't use a
   *  status). Existing grounds keep using statuses; this is for new kinds. */
  moveScale?: number;
  /** TRAVEL PREFERENCE (the wayfaring fabric): how much a pathing mind pays to
   *  cross a cell of this ground, as a multiplier of plain floor (1 = neutral,
   *  >1 = detoured around in proportion, <1 = actively sought — roads pull).
   *  DETERRENCE, never a wall: a finite cost means a mind still wades a thin
   *  lava band when the detour is longer than the pain. Omit and the cost is
   *  DERIVED from the row's own declared effects (regionPathCost: standDamage /
   *  enterStatus / survival / moveScale — future hazard rows are priced safely
   *  by default). Per-ACTOR modulation lives on the profile, not here: the
   *  terrain-damage insurance (fliers, habitat, immuneGround) neutralizes a
   *  kind's cost, and MonsterDef.pathCosts overrides it outright (a magma worm
   *  relishes the melt at 0.5). Non-walkable kinds never need this — the mask
   *  already refuses them. */
  pathCost?: number;
  /** Pure-graphical region — no gameplay effect at all. */
  visualOnly?: boolean;
  visual?: RegionVisualSpec;
  /** Data-driven crossing exception: which displacements may pass despite !walkable
   *  (a bridge, a teleport). Replaces the hardcoded chasm/bridge branch. */
  crossableBy?: (disp: DisplacementPolicy) => boolean;
  /** Escape-hatch handlers for ARBITRARY behaviour the declarative fields can't
   *  express — the open door for future "insane mechanics" (type-only World use). */
  onEnter?: (actor: Actor, world: World) => void;
  onStand?: (actor: Actor, world: World, dt: number) => void;
  onExit?: (actor: Actor, world: World) => void;
  /** Cells of this kind STOP projectiles (swept per sub-cell step). Default FALSE
   *  = a CHASM-LIKE: bodies can't cross but shots sail over (void/chasm/water/
   *  ledges). TRUE WALLS opt in — rampart masonry plus wall/flesh_wall/
   *  fungal_wall: an arrow has no business flying through a rock face. */
  blocksShot?: boolean;
  /** Cells of this kind block AI LINE OF SIGHT (ray-marched). Default FALSE (a
   *  chasm-like: you see across the pit). The true walls above opt in; parapet/
   *  window stay see-through — the arrow-slit: a wall you can shoot and see
   *  through but never walk through. */
  blocksSight?: boolean;
  /** THE TIER FABRIC (engine/tiers.ts): this region is FLOOR on the zone's
   *  SECOND walkable layer. Composes with `walkable` (the tier-0 truth):
   *  {walkable:false, tier:1} = a butte top / a duct under a building —
   *  wall to one layer, ground to the other; {walkable:true, tier:1} = a
   *  bridge deck / a duct under the street — one cell, two floors. */
  tier?: 1;
  /** A CROSSING between the tiers (ramps, stairwell wells, culverts):
   *  walkable on BOTH layers; a body stepping off it toward ground only the
   *  other tier owns FLIPS its tier (resolveTierCrossing). Implies tier. */
  tierLink?: boolean;
  /** What the SECOND layer looks like where a covered zone reveals it (the
   *  sewer view): drawn live by the tier veil for the local under-player.
   *  Open-exposure rows skip it — their ordinary visual serves both reads. */
  tierVisual?: { fill: string; edge?: string };
  /** SURFACE MOTION FX: bodies moving through this ground spawn the named
   *  transient (renderer motion-FX system) — water's wake rings today; a
   *  future tar could ripple with one word. Data, never an id compare in
   *  draw code. */
  surfaceWake?: 'ripple';
  /** SURFACE REFLECTION: bodies standing on this ground draw a faded flipped
   *  ghost beneath them (the frozen mirror). */
  surfaceMirror?: boolean;
  /** CONJURABLE: walkable cloud may be CALLED INTO BEING over this kind
   *  (World.conjureCloud — the flux fabric's second half). A data flag on
   *  void kinds, never an id list in engine code: the open sky takes a
   *  conjured bridge; a rock wall does not. */
  conjurable?: boolean;
}

/** A generic ENVIRONMENTAL-SURVIVAL meter (breath today; heat/cold/corruption
 *  later). A RegionKind.survival drains it while you stand in; out of it you take
 *  underflow damage. Lives on Actor.survival as a Map (NOT a hardcoded field). */
export interface SurvivalResourceDef {
  id: string;
  label: string;
  max: number;
  /** Regen per second while NOT being drained. */
  regen: number;
  /** While empty, lose this fraction of MAX life per second (drowning) — the STARTING
   *  rate. If underflowRampTo/Secs are set, the rate RAMPS from here up to underflowRampTo
   *  over underflowRampSecs of continuous underflow (the dread of staying down too long). */
  underflowPctLifePerSec: number;
  /** Peak per-sec %max-life damage the underflow ramps to (omit = no ramp, flat rate). */
  underflowRampTo?: number;
  /** Seconds of continuous underflow to reach underflowRampTo (omit = no ramp). */
  underflowRampSecs?: number;
  /** Floating warning shown ~every 0.8s while empty and taking underflow damage.
   *  Each meter names its own doom ('drowning!', 'the dark gnaws!') — REQUIRED when
   *  underflowPctLifePerSec > 0 (validated at boot, so a damaging meter can never
   *  borrow another meter's death cry). */
  underflowText?: string;
  /** Warning text colour (defaults to the meter colour). */
  underflowTextColor?: string;
  /** HUD meter fill colour (the readout loops this table, so a new resource draws
   *  for free — just add a row + a colour). */
  color: string;
}

export const SURVIVAL_RESOURCES: Record<string, SurvivalResourceDef> = {
  // Drowning RAMPS: ~5%/s at first, climbing to ~25%/s after 10s under without air —
  // a tightening panic, not a flat tax. Refilling breath (an air pocket) resets it.
  breath: { id: 'breath', label: 'Breath', max: 12, regen: 5, underflowPctLifePerSec: 0.05, underflowRampTo: 0.25, underflowRampSecs: 10, underflowText: 'drowning!', color: '#6ac0f8' },
  // LIGHT — the darkness-survival meter, worn by TWO fabrics. It only ever DRAINS
  // (no passive regen); light SOURCES give it back. In the Descent the dark
  // CONSUMES you at zero (updateDescent resurfaces BEFORE the meter can underflow —
  // predictive check, so the ramp below never fires down there). Under THE GLOAMING
  // (the surface dark, packages/defs/gloaming.ts) an empty meter gnaws exactly like
  // drowning: same ramp shape, the panic of the unlit. The HUD survival readout
  // draws this meter for free (it loops this table).
  light: { id: 'light', label: 'Light', max: 100, regen: 0, underflowPctLifePerSec: 0.05, underflowRampTo: 0.25, underflowRampSecs: 10, underflowText: 'the dark gnaws!', underflowTextColor: '#a89ad0', color: '#ffe08a' },
};

export function survivalResource(id: string): SurvivalResourceDef | undefined { return SURVIVAL_RESOURCES[id]; }

const REGION_KINDS: Record<string, RegionKind> = {};

/** Register a region kind under an open-string id. */
export function registerRegion(def: RegionKind): void {
  REGION_KINDS[def.id] = def;
  pathCostMemo.delete(def.id); // a late/re-registered row re-prices (wayfaring memo)
}

/** Look up a region kind (undefined for an unknown id). */
export function regionKind(id: string | undefined): RegionKind | undefined {
  return id ? REGION_KINDS[id] : undefined;
}

/** Every registered region id (GROUND_KINDS etc. derive from this — no literals). */
export function regionIds(): string[] { return Object.keys(REGION_KINDS); }

/** Region ids that are sensed from DOODAD grounds (the old GROUND_KINDS), i.e. a
 *  walkable overlay terrain a `groundAt` disc reports. Derived, not a literal list
 *  (moveScale counts: the road's speed boost is an effect too — a new legend/fx
 *  ground kind registered with any effect auto-joins the ground sensing). */
export function doodadGroundIds(): string[] {
  return Object.keys(REGION_KINDS).filter(id => REGION_KINDS[id].walkable && !REGION_KINDS[id].visualOnly
    && (REGION_KINDS[id].standStatus || REGION_KINDS[id].enterStatus || REGION_KINDS[id].survival
      || REGION_KINDS[id].moveScale !== undefined));
}

/** LIQUID DEPTH tuning for doodad-disc water (groundAt). `deepInset` is how far
 *  past a covering disc's rim (its penetration, in world units) a point must be
 *  before the water counts as DEEP: the shore ring shallower than this wades,
 *  everything further in swims. Body-aware by construction — the seam between
 *  two overlapping stamped discs measures penetration into EITHER, so a lake
 *  built from many discs never strobes wade↔swim mid-crossing. Tuned to match
 *  the old per-disc 0.55×radius feel on typical pool/river stamp sizes. */
export const LIQUID_CFG = {
  deepInset: 22,
};

/** THE WAYFARING TUNABLES — travel-preference framework knobs (never inline
 *  magic). Derivation defaults price a hazard row that declares effects but no
 *  explicit pathCost; the clamps bound every resolved cost (explicit, derived,
 *  per-actor override alike) so one bad data row can't wedge the flow field;
 *  vetoLookahead is the AI self-preservation probe distance. */
export const PATH_CFG = {
  /** Derived cost for a row with standDamage (typed dps while standing —
   *  the lava class). High: crossing should be a last resort, not a wall. */
  standDamageCost: 12,
  /** Derived cost for a row with a once-on-enter sting (the bog-rot class). */
  enterCost: 3,
  /** Derived cost for a row that drains a survival resource (breath class). */
  survivalCost: 3,
  /** Clamp floor for any resolved cost — relish included (0 would make a
   *  kind read FREE and vacuum every path through it). */
  minCost: 0.25,
  /** Clamp ceiling. Sized to the flow field's fixed-point byte headroom
   *  (see gridWalk PATH_SCALE): 30 × 8 = 240 < 255. */
  maxCost: 30,
  /** SELF-PRESERVATION VETO: how far past its own body radius a steering
   *  mind probes the ground ahead before refusing a step into a fall/self-
   *  destruct boundary (world units). */
  vetoLookahead: 20,
};

/** Resolved travel cost for a region kind: the row's explicit pathCost, else
 *  DERIVED from its own declared effects (the safety net that prices future
 *  hazard rows without anyone remembering to). Deliberately mechanical — only
 *  unambiguous pain derives (standDamage / enterStatus / survival / moveScale);
 *  a standStatus alone derives NOTHING (concealment is a benefit, not a toll —
 *  the slow grounds carry explicit rows instead). Memoized; registerRegion
 *  invalidates, so late package rows re-price. */
const pathCostMemo = new Map<string, number>();
export function regionPathCost(id: string): number {
  const hit = pathCostMemo.get(id);
  if (hit !== undefined) return hit;
  const rk = REGION_KINDS[id];
  let c = 1;
  if (rk && rk.walkable) {
    if (rk.pathCost !== undefined) {
      c = rk.pathCost;
    } else {
      if (rk.standDamage) c = Math.max(c, PATH_CFG.standDamageCost);
      if (rk.enterStatus) c = Math.max(c, PATH_CFG.enterCost);
      if (rk.survival) c = Math.max(c, PATH_CFG.survivalCost);
      if (rk.moveScale !== undefined && rk.moveScale > 0) c = Math.max(c, 1 / rk.moveScale);
    }
    c = Math.min(PATH_CFG.maxCost, Math.max(PATH_CFG.minCost, c));
  }
  pathCostMemo.set(id, c);
  return c;
}

// --- DEFAULT ROWS -----------------------------------------------------------
// Grid substrate kinds (no terrain effect; pure collision policy).
registerRegion({ id: 'ground', walkable: true, blocks: false });
// TRUE WALLS: a mountain pass's rock face stops arrows and sight — a shot has
// no business flying "over" a cliff wall (a valley or a void is different: see
// 'void'/'chasm', which bodies cannot cross but shots sail over). Flipped in
// the primitives pass now that AI reposition (implicit losSeek) exists.
registerRegion({ id: 'wall', walkable: false, blocks: true, blocksShot: true, blocksSight: true });
// (The HOLLOWS fabric — engine/levelgen stampHollows — deliberately adds NO
//  region kind: a sealed pocket's cells KEEP their native wall kind, whatever
//  the zone builds from (wall, fungal_wall, sunkstone_wall…). Identity is the
//  disguise — pixel-for-pixel, physics-for-physics — until the seam gives and
//  World.openHollow repaints the recorded rect to ground.)

// Existing DOODAD grounds, migrated VERBATIM from the updateTerrainEffects switch
// (same statuses, sources, durations, and zone-level-scaled bog poison).
// TRAVEL PREFERENCE (pathCost): the slow grounds price their slog explicitly —
// derivation deliberately refuses to guess from standStatus names (regionPathCost).
registerRegion({ id: 'mud', walkable: true, blocks: false, label: 'the mud', standStatus: 'mired', pathCost: 2 });
registerRegion({ id: 'sand', walkable: true, blocks: false, label: 'the sand', standStatus: 'mired', pathCost: 2 });
// ASHFIELD — the wildfire front's wake (the creep fabric's convert lane):
// dead burnt ground, fully walkable, no hazard and no molten glow — the
// danger PASSED here, that's the point. moveScale 1 is deliberate: a benign
// effect keeps it in doodadGroundIds so groundAt senses it, clients rebuild
// it, and affinity tables can name it.
registerRegion({ id: 'ashfield', walkable: true, blocks: false, label: 'the ashfield', moveScale: 1 });
registerRegion({ id: 'swamp', walkable: true, blocks: false, label: 'the swamp', standStatus: 'sodden', pathCost: 2.2 });
// Water is REFUGE (the douse lane): wading strips the desert's sunscorch —
// and the heatstroke it curdled into — a stack per beat, and suppresses the
// bake while you stand in. This is why the mirage oasis is cruel: the water
// that would save you is the one thing it only looks like.
registerRegion({ id: 'water', walkable: true, blocks: false, label: 'the water', standStatus: 'wading', standStatusDeep: 'swimming', surfaceWake: 'ripple', pathCost: 1.8,
  douses: { statuses: ['sunscorched', 'heatstroke'], every: 0.25, text: 'the water quenches…' } });
registerRegion({ id: 'ice', walkable: true, blocks: false, label: 'the ice', standStatus: 'slippery', surfaceMirror: true, pathCost: 1.25 });
registerRegion({ id: 'brush', walkable: true, blocks: false, label: 'the brush', standStatus: 'concealed' });
registerRegion({ id: 'bog', walkable: true, blocks: false, label: 'the bog', standStatus: 'bogged', pathCost: 3.5,
  // bog_rot, NOT combat 'poison': its own row carries the same level-scaled
  // dot without the combat-poison screen vignette — crossing a bog line
  // must sting, never read as the renderer breaking (see status.ts).
  enterStatus: { id: 'bog_rot', amount: 1.5, amountPerLevel: 0.7, duration: 1 }, enterText: { text: 'bogged!', color: '#6a8a3a' } });
// The littoral country's wet kit. The TIDE POOL is a wadeable jewel (mirror-
// bright, harmless); the BRINE SINK is the exposed seabed's caustic heart —
// a salt-burn on entry (the bog's level-scaled idiom, poison = the caustic
// lane), a true swim where fused sinks pool deep, and the Coilborn wade
// both without noticing (MonsterDef.immuneGround).
registerRegion({ id: 'tide_pool', walkable: true, blocks: false, label: 'the tide pool',
  standStatus: 'wading', surfaceWake: 'ripple', surfaceMirror: true, pathCost: 1.4,
  douses: { statuses: ['sunscorched', 'heatstroke'], text: 'the water quenches…' } });
// (NO douse row here, deliberately: the brine is hot caustic soup, not
// refuge — and the saltflat's design commitment is a pan with no mercy.
// The probe pins this absence; add one only as a considered design change.)
registerRegion({ id: 'brine_sink', walkable: true, blocks: false, label: 'the brine',
  standStatus: 'wading', standStatusDeep: 'swimming', surfaceWake: 'ripple', pathCost: 2.6,
  // brine_burn, NOT combat 'poison' — same caustic dot, no combat-poison
  // screen vignette: the Coast playtest's "shaders break past a line" was
  // this exact borrow snapping the wash at every sink shoreline.
  enterStatus: { id: 'brine_burn', amount: 1.5, amountPerLevel: 0.7, duration: 1 },
  enterText: { text: 'the brine burns!', color: '#9fd8c8' } });
// LAVA — a real LIQUID: crossable, and it COOKS whoever isn't insured
// (fliers, habitat-matched bodies, immuneGround bearers wade free). Heavy
// typed fire per second through RESISTANCE only — capping fire res is the
// build answer, wading anyway is the desperate one. The mired slog keeps
// the crossing a decision, not a stroll; the impassable molten WALL (the
// caldera's spiral) is the separate magma_core doodad kind.
registerRegion({ id: 'lava', walkable: true, blocks: false, label: 'the lava',
  // pathCost 14: the uninsured detour HARD (a lane one cell wide is still worth
  // a fourteen-cell walk around) but finitely — a mind crosses a thin band when
  // the way around is longer than the pain. The insured (habitat / immuneGround
  // / fliers) price it neutral through the profile, never through this row.
  pathCost: 14,
  standStatus: 'mired',
  standDamage: { dps: 14, dpsPerLevel: 2.2, type: 'fire' },
  enterStatus: { id: 'burn', amount: 1.2, amountPerLevel: 0.5, duration: 2 },
  enterText: { text: 'scalded!', color: '#ff8a3a' } });
// THE FLESH COUNTRY's grounds. Pooled BLOOD: entry turns the head light (one
// faintness stack — the vasovagal ladder does the rest; blood-mist fog is the
// sustained lane). The drag is moveScale-mild ON PURPOSE: no icon for wading
// through shallows of what used to be somebody.
registerRegion({ id: 'blood_pool', walkable: true, blocks: false, label: 'the blood',
  moveScale: 0.94, pathCost: 1.3,
  enterStatus: { id: 'faintness', duration: 6 },
  enterText: { text: 'light-headed…', color: '#d8ccd8' } });
// CHYME — the Gutworks' digesting bile: the lava doctrine in acid. Typed
// chaos per second through resistance only, a mired slog, queasy on entry —
// capping chaos res is the build answer, wading anyway the desperate one.
registerRegion({ id: 'chyme_pool', walkable: true, blocks: false, label: 'the bile',
  pathCost: 10,
  standStatus: 'mired',
  standDamage: { dps: 9, dpsPerLevel: 1.8, type: 'chaos' },
  enterStatus: { id: 'queasy', duration: 5 },
  enterText: { text: 'stomach turns!', color: '#a8b86a' } });
registerRegion({ id: 'tentacle_field', walkable: true, blocks: false, label: 'the tentacles', standStatus: 'ensnared', pathCost: 4.5,
  enterStatus: { id: 'stun', duration: 0.6 }, enterText: { text: 'ensnared!', color: '#7fce6a' } });
// ROAD: a packed gravel path — a VERY mild move-speed boost (moveScale, NOT a status, so
// there's no status icon for so minor an effect). The first consumer of the moveScale seam.
// pathCost 0.9: the road PULLS — flow-field minds drift onto live ways when
// one runs their direction (composes with the coherence fabric's clearways).
registerRegion({ id: 'road', walkable: true, blocks: false, label: 'the road', moveScale: 1.04, pathCost: 0.9 });
// (fog_bank region RETIRED: volumetric fog is the LIVING fog fabric now —
//  engine/fog.ts grants fogveiled from roaming banks; no ground region.)
// WEBBING: sticky sheets slow like mire (spider country).
registerRegion({ id: 'web', walkable: true, blocks: false, label: 'the webbing', standStatus: 'mired', pathCost: 2.2,
  enterText: { text: 'webbed!', color: '#d8d4c8' } });
// REEDS: water-margin blades conceal like brush (the ambush margin).
registerRegion({ id: 'reeds', walkable: true, blocks: false, label: 'the reeds', standStatus: 'concealed' });
// BERRY BUSH: a fruiting shrub — conceals exactly like the brush it grows from.
registerRegion({ id: 'berry_bush', walkable: true, blocks: false, label: 'the bushes', standStatus: 'concealed' });

// --- PHASE-3 INSTANCE ROWS --------------------------------------------------
// VOID: not walkable, does NOT block (you can be shoved/walk in) → its boundary
// policy makes you FALL: respawn at the chasm edge taking a chunk of max life.
// A bridge or a fall-ignoring displacement crosses it (crossableBy).
registerRegion({
  id: 'void', walkable: false, blocks: false, label: 'the void',
  boundaryPolicy: { kind: 'fall', to: 'edge', damage: { amount: 0, pctMaxLife: 0.18, type: 'physical', canKill: true } },
  crossableBy: (d) => !!d.ignoreFall || !!d.ignoreConfine,
  // The lip: a whisper of violet-grey on every walkable-facing side — the
  // ground remembering the light before the drop (the cave-mouth rim's
  // lesson), so the abyss reads as an EDGE falling away, not flat paint.
  visual: { fill: '#050507', alpha: 1, edge: { color: '#221c36', width: 5 } },
});
// ABYSS: the Underworld's own drop — the void's physics (enter → fall recovery,
// shots and sight sail across) under hell's palette: a warm-black depth whose
// walkable-facing rim BURNS — the ember under-glow of the outer steppes' pits.
// A separate row (not a void retint) so surface voids keep their cold violet
// and future dimensions can tune their own falls without touching either. The
// fall burns (typed fire, resistable) instead of the void's blunt physical.
registerRegion({
  id: 'abyss', walkable: false, blocks: false, label: 'the abyss',
  boundaryPolicy: { kind: 'fall', to: 'edge', damage: { amount: 0, pctMaxLife: 0.18, type: 'fire', canKill: true } },
  crossableBy: (d) => !!d.ignoreFall || !!d.ignoreConfine,
  visual: { fill: '#0c0407', alpha: 1, edge: { color: '#a83a16', width: 5 } },
});
// CHASM: the karst country's gorge — the void's physics exactly (enter → fall
// recovery at the rim, shots and sight sail across, jump/blink displacement
// crosses) under LIMESTONE's palette: a warm rock-dark depth whose walkable-
// facing lip is sun-bleached pale stone, so every gap reads as wind-cut karst
// falling away, never cosmic void. A separate row (the abyss precedent) so
// surface voids keep their cold violet and the gorge stays free to tune its
// own fall without touching either.
registerRegion({
  id: 'chasm', walkable: false, blocks: false, label: 'the chasm',
  boundaryPolicy: { kind: 'fall', to: 'edge', damage: { amount: 0, pctMaxLife: 0.18, type: 'physical', canKill: true } },
  crossableBy: (d) => !!d.ignoreFall || !!d.ignoreConfine,
  visual: { fill: '#0b0906', alpha: 1, edge: { color: '#8d8672', width: 5 } },
});
// THE GORGE — the mountain country's fall (the overpass ledges hang over it):
// the chasm's exact contract under GRANITE — a cold blue-black drop whose
// standing lip is frost-pale grey stone, so every gap reads as sheer
// mountainside falling away. Its own row (the comment above, honored) so the
// karst limestone and the mountain granite each tune their depth freely.
registerRegion({
  id: 'gorge', walkable: false, blocks: false, label: 'the gorge',
  boundaryPolicy: { kind: 'fall', to: 'edge', damage: { amount: 0, pctMaxLife: 0.18, type: 'physical', canKill: true } },
  crossableBy: (d) => !!d.ignoreFall || !!d.ignoreConfine,
  visual: { fill: '#07090c', alpha: 1, edge: { color: '#9aa2ac', width: 5 } },
});
// SCREE WAKE — the landslide front's settling rubble (the creep fabric's
// convert lane, the ashfield's mountain twin): loose sliding stone that
// slows the crossing a touch while it lasts — the front's convert.fade
// evaporates each pool, so the slope heals itself. The mild moveScale keeps
// it in doodadGroundIds (groundAt senses it, clients rebuild it, affinity
// tables can name it).
registerRegion({ id: 'scree_wake', walkable: true, blocks: false, label: 'the slide-scree', moveScale: 0.85, pathCost: 1.5 });
// CLOUD VOID: the gap where a cloud shelf has fallen away (the collapse
// fabric's melt region) — and the Aetherial's authored sky-gaps. The void's
// physics (shots and sight sail over, levitators float free) under the
// SKY's own read: a WINDOW region — the ground baker clears these cells so
// the understory (the zone far below, the endless cloud sea) shows THROUGH
// the hole instead of painting an abyss-black pit. THE EDGE IS A DOOR
// (boundaryPolicy 'skyfall'): step off the cloud and the world below
// catches you — the same proportional drop the crumbling floor routes. No
// confinement lip, no rubberband, and NO HARD-LOCK: strand yourself on a
// detached island and the way out is always one deliberate step off the
// edge. (Two earlier drafts both lost: fall-to-edge read as rubberbanding;
// a blocking lip hard-locked runners on melted-out islands.)
registerRegion({
  id: 'cloud_void', walkable: false, blocks: false, label: 'the open sky',
  boundaryPolicy: { kind: 'skyfall' },
  crossableBy: (d) => !!d.ignoreFall || !!d.ignoreConfine,
  conjurable: true,
  // The cloud lip: sunlit white on every standing side, so each gap reads as
  // torn cloud-edge; the fill only ever shows with no understory beneath.
  visual: { fill: '#10131d', alpha: 1, window: true, edge: { color: '#f2f6fd', width: 6 } },
});
// --- THE FLUX KINDS (engine/flux.ts — living, shifting ground) --------------
// All four are WINDOW visuals with NO edge and NO animate: the baked floor
// holds a clean hole while the FLUX LAYER (render/vis/fluxLayer.ts) draws the
// living cloud — forming, breathing, tattering — exactly where the walkable
// truth is. That bake-identity is what lets the fabric repaint cells QUIETLY
// (no dirty rects, no chunk churn) a dozen times a minute. The lip-less read
// is deliberate too: a flux basin's rims belong to the living clouds, not to
// baked paint that would go stale the moment a pad phased.
// FLUX VOID: the sky inside a flux basin — where a pad or lane is NOT.
// Same door as cloud_void: step off a pad's edge and you fall to the world
// below — mistime a crossing and the honest out is always DOWN, never a
// hard-lock against an invisible lip.
registerRegion({
  id: 'flux_void', walkable: false, blocks: false, label: 'the open sky',
  boundaryPolicy: { kind: 'skyfall' },
  crossableBy: (d) => !!d.ignoreFall || !!d.ignoreConfine,
  conjurable: true,
  visual: { fill: '#10131d', alpha: 1, window: true },
});
// SHIFTING CLOUD: a phasing pad's ground while it stands. Honest at both
// ends of its cycle: not yet walkable while forming, still walkable while
// fraying — the tatter IS the countdown.
registerRegion({
  id: 'cloud_flux', walkable: true, blocks: false, label: 'the shifting cloud',
  visual: { fill: '#10131d', alpha: 1, window: true },
});
// THE ALTERNATORS: cloud_flux's identical twins. A stepping-stone chain
// interleaves A-B-A-B so TOUCHING pads remain SEPARATE platforms — flux
// components split per kind — while the chain stays contiguous for the
// generation reachability invariant. The THIRD kind is the satellite's: a
// side-stone hangs off any chain pad without ever fusing chains together
// (a B-kind satellite touching the next B pad cascade-merged whole chains
// into 200-cell mega-pads — the live-QA lesson). Same policy, same window;
// only the component math tells them apart.
registerRegion({
  id: 'cloud_flux_b', walkable: true, blocks: false, label: 'the shifting cloud',
  visual: { fill: '#10131d', alpha: 1, window: true },
});
registerRegion({
  id: 'cloud_flux_c', walkable: true, blocks: false, label: 'the shifting cloud',
  visual: { fill: '#10131d', alpha: 1, window: true },
});
// DRIFT LANE: a carrier's footprint (and, during the warmup, the whole lane
// band). Walkable exactly where a raft currently holds the sky open.
registerRegion({
  id: 'cloud_lane', walkable: true, blocks: false, label: 'the drift',
  visual: { fill: '#10131d', alpha: 1, window: true },
});
// CONJURED CLOUD: ground a skill called into being (World.conjureCloud). It
// frays and lets go like everything else — the sky keeps no promises long.
registerRegion({
  id: 'cloud_conjured', walkable: true, blocks: false, label: 'the conjured cloud',
  visual: { fill: '#10131d', alpha: 1, window: true },
});
// FRAIL CLOUD: cloud-stuff that was never meant to hold you — the High
// Heavens' ephemeral spans and fraying skirts. Walkable and honest about it:
// a duskier, faintly SHIMMERING wash marks every span that may let go (the
// stable deck wears no wash at all — the distinction IS the read). The
// collapse fabric names it via CollapseSpec.melts, so on spire ground ONLY
// frail cells ever crumble: the courts and the marble stand forever.
registerRegion({
  id: 'cloud_frail', walkable: true, blocks: false, label: 'the frail cloud',
  visual: { fill: '#8e97b8', alpha: 0.3, animate: 'shimmer' },
});
// AUREATE COURT: the High Heavens' built floor — pale gold-washed marble
// coursework atop the great cloud bases (a walkable region, so the same
// paint serves any future celestial architecture). Never in any melts list:
// what the Host BUILT does not fall.
registerRegion({
  id: 'aureate_court', walkable: true, blocks: false, label: 'the court',
  visual: { fill: '#efe9d6', alpha: 0.5 },
});
// --- THE EPHEMERAL SPANS (engine/spans.ts — condition-held ground) -----------
// Bridges whose EXISTENCE answers the sky (world/radiance.ts conditions).
// Each family is a walkable base kind + a `_fading` twin (the leaving
// warning): the span fabric repaints base ↔ twin ↔ the zone's sky-void as
// its condition swings, and the visuals here are the whole render story —
// no fabric-specific drawing anywhere. All REAL fills (never window): a
// standing bridge is present, honest paint over the sky beneath it.
// SUNBRIDGE: stands while the sky is bright (day, and not under a black
// storm) — warm gold light laid across the gap.
registerRegion({
  id: 'span_sun', walkable: true, blocks: false, label: 'the sunbridge',
  visual: { fill: '#f4d98a', alpha: 0.5, animate: 'drift', edge: { color: '#ffedbb', width: 4 } },
});
registerRegion({
  id: 'span_sun_fading', walkable: true, blocks: false, label: 'the failing sunbridge',
  visual: { fill: '#e8c56a', alpha: 0.34, animate: 'shimmer' },
});
// STAR-SPAN: the inverse — a walk of starlight that only the dark reveals.
// By day the gap is simply bare.
registerRegion({
  id: 'span_star', walkable: true, blocks: false, label: 'the star-span',
  visual: { fill: '#bcd2ff', alpha: 0.44, animate: 'shimmer', edge: { color: '#e6eeff', width: 3 } },
});
registerRegion({
  id: 'span_star_fading', walkable: true, blocks: false, label: 'the failing star-span',
  visual: { fill: '#93a8d8', alpha: 0.3, animate: 'shimmer' },
});
// PRISM-SPAN: stands only while rain or storm covers the zone — the rainbow
// bridge, hue walking the spectrum (the 'prism' grammar above).
registerRegion({
  id: 'span_prism', walkable: true, blocks: false, label: 'the prism-span',
  visual: { fill: '#b8e0c8', alpha: 0.5, animate: 'prism', edge: { color: '#f2fbff', width: 3 } },
});
registerRegion({
  id: 'span_prism_fading', walkable: true, blocks: false, label: 'the failing prism-span',
  visual: { fill: '#b8e0c8', alpha: 0.3, animate: 'prism' },
});
// VEILED WAY: the leap of faith. ALWAYS walkable — no span row, no fabric,
// nothing to fail — but painted at the very threshold of sight: a breath of
// paleness over the void that only a deliberate eye (or a monster casually
// crossing the gap) betrays. The star-cairn doodads at its mouths are the
// authored "tiniest inclination"; walking out anyway is the faith.
registerRegion({
  id: 'span_veiled', walkable: true, blocks: false, label: 'the veiled way',
  visual: { fill: '#cfd8ea', alpha: 0.06 },
});
// GLEAMWAY: the High Bastion's bridge — light made PERMANENT ROAD. Same
// ephemeral-blue family as the star-span, but no span row ever drives it:
// the recipe paints it as standing ground (the citadels' engineers bound
// the light; the sky is not consulted). Brighter than any conditional span
// on purpose — a promise that holds reads richer than one that comes and
// goes, and the two must never be mistaken for each other mid-fight.
registerRegion({
  id: 'span_gleam', walkable: true, blocks: false, label: 'the gleamway',
  // Alpha rides HIGH: the live drift overlay is all the paint this ground
  // gets (animated fills never bake), and beneath it glows the sunlit
  // cloudsea — at half-alpha the blue muddied to tan over the warm deck.
  visual: { fill: '#9fd4ff', alpha: 0.8, animate: 'drift', edge: { color: '#e8f6ff', width: 4 } },
});
// DEEP WATER: walkable but you SWIM (slowed) and your BREATH drains; out of air
// you start drowning (the survival system). The underwater zones' open sea.
registerRegion({
  id: 'deep_water', walkable: true, blocks: false, label: 'the depths',
  // The ocean FLOOR: a mild slow + a slippery, low-traction step ('seabed') — trudging
  // the seabed, not the heavier 'swimming' wade. Breath still drains down here.
  standStatus: 'seabed', survival: { resource: 'breath', drain: 1 },
  // Fully submerged = fully quenched (the douse lane, water's own row echoed).
  douses: { statuses: ['sunscorched', 'heatstroke'], text: 'the water quenches…' },
  visual: { fill: '#0c2740', alpha: 0.55, animate: 'drift' },
});
// FLESH: a writhing organic chamber floor (the flesh biome's circular chambers).
// Walkable; a pulsing red visual makes the ground throb like living tissue.
registerRegion({ id: 'flesh', walkable: true, blocks: false, label: 'the flesh', visual: { fill: '#6a1f2a', alpha: 0.4, animate: 'pulse' } });
// FLESH WALL: the living TISSUE between chambers (the flesh biome's negative space).
// Non-walkable + blocks like a wall, but a deep organic-red visual so the warren
// reads as carved-from-meat ("Belly of the Beast") — NOT the black void/fall region.
// A solid wash (no pulse) keeps the walls reading as solid; the floor does the throb.
registerRegion({ id: 'flesh_wall', walkable: false, blocks: true, label: 'the flesh',
  blocksShot: true, blocksSight: true,
  // The pale strained-membrane rim: the floor throbs in the same reds, so the
  // WALL announces itself at its boundary or you run face-first into meat.
  visual: { fill: '#3a0e16', alpha: 1, edge: { color: '#8a3a46', width: 5 } } });
// THE WATCHING SHELL: flesh wall that has OPENED — the Ocular's ring
// generator lays patches of it into the wall mass around chamber rims
// (fleshRing.eyeWalls), the baker grows the sockets (visual.eyes), the
// wallEyes pass gives them seeking pupils, and GazeSpec.wallKinds makes
// standing in their regard COUNT. Same collision truth as flesh_wall —
// the difference is entirely that it looks back.
registerRegion({ id: 'ocular_wall', walkable: false, blocks: true, label: 'the watching wall',
  blocksShot: true, blocksSight: true,
  visual: { fill: '#3e1018', alpha: 1, eyes: true, edge: { color: '#96424e', width: 5 } } });
// DURANCE WALL: the hate-citadel's dressed black masonry (the durance biome's
// interior negative space + its boundary-gate façades). A TRUE WALL, coursed
// like rampart so the halls read BUILT, not cave-carved; the sickly-green rim
// announces it in its own near-black floor's tones (the flesh-wall lesson).
registerRegion({ id: 'durance_wall', walkable: false, blocks: true, label: 'the durance',
  blocksShot: true, blocksSight: true,
  visual: { fill: '#1d1a26', alpha: 1, masonry: true, edge: { color: '#4a7a42', width: 4 } } });
// FUNGAL WALL: the dense living MYCELIUM between a mycelia grotto's chambers (the negative
// space the myceliaLayout carves into). Non-walkable + blocks like a wall, but a deep
// purple-fungal visual so the warren reads as carved-from-mushroom, NOT the black void.
registerRegion({ id: 'fungal_wall', walkable: false, blocks: true, label: 'the mycelium',
  blocksShot: true, blocksSight: true,
  // Luminous hyphal weave along the rim — the grotto's own glow marks where
  // the soft dark becomes solid mycelium.
  visual: { fill: '#241634', alpha: 1, edge: { color: '#6a4a92', width: 5 } } });
// VERDURE: the JUNGLE's living wall — the thicket layout's negative space is
// one continuous mass of interlocked growth, not stone. Bodies, arrows and
// SIGHT all stop at it (narrow lanes + blind green walls = the biome's
// claustrophobia), and the brittle face-cut kinds carve pockets INTO it —
// the one wall in the game you open with a machete. Leaf-lit rim over deep
// green (fill lum ≈ .20 vs the jungle floor's ≈ .06 — CONTRAST GUARD clear).
registerRegion({ id: 'verdure', walkable: false, blocks: true, label: 'the verdure',
  blocksShot: true, blocksSight: true,
  visual: { fill: '#22421a', alpha: 1, foliage: true, edge: { color: '#4f7a2c', width: 5 } } });
// RUIN WALL: root-riven masonry — the sunken ruin interiors' negative space
// (the jungle swallowed a civilization; its halls are what's left). A TRUE
// WALL like rampart, coursed so the halls read BUILT — the pale moss-grey rim
// marks stone against the dark interior loam (the flesh-wall lesson).
registerRegion({ id: 'ruin_wall', walkable: false, blocks: true, label: 'the old stone',
  blocksShot: true, blocksSight: true,
  visual: { fill: '#2c342a', alpha: 1, masonry: true, edge: { color: '#5c6a4e', width: 4 } } });
// AIR POCKET: a safe walkable bubble in an underwater zone — breath refills here
// (no drain), the player's lifeline. Pure walkable + a visual tell.
registerRegion({ id: 'air_pocket', walkable: true, blocks: false, label: 'air', visual: { fill: '#2a6a8a', alpha: 0.35, animate: 'pulse' } });
// SHIMMER: the PROOF that a purely-graphical environmental region is just a row —
// walkable, no gameplay effect at all, only a render wash (mechanic (d)). Adding an
// ambient visual env effect needs zero engine code.
registerRegion({ id: 'shimmer', walkable: true, blocks: false, visualOnly: true, visual: { fill: '#3a7a9a', alpha: 0.16, animate: 'shimmer' } });
// TALLGRASS: the FIELD mega-zone's natural boundary — the off-blob area outside the
// contiguous Field heat-map shape. Non-walkable + blocks (an impenetrable hedgerow of
// tall grass marking the expanse's edge), but a deep grassy visual so the zone EDGE
// reads as overgrown meadow, NOT a cave wall or the black void. The walkable interior
// is plain 'ground' (the grassland floor); this paints only the silhouette's outside.
registerRegion({ id: 'tallgrass', walkable: false, blocks: true, label: 'the tall grass',
  // The hedge EDGE (the flesh biome's lesson): a sunlit fringe on every side
  // facing the meadow, so the boundary reads as overgrown hedgerow at a
  // glance instead of swallowing itself in the floor's own greens. Tuned
  // live against the Field's day wash — subtler values vanish into it.
  visual: { fill: '#182c0e', alpha: 1, edge: { color: '#79b84a', width: 6 } },
  // Explicit, deliberate: the Field's hedge is a SOFT boundary — never an arrow-stopper.
  blocksShot: false, blocksSight: false });

// --- THE DUNE SEA (the 'dunefield' recipe, layoutRecipes.ts) ------------------
// DUNE FACE: the steep slip-wall of a marching sand ridge — the parapet policy
// in sand: bodies never climb it, but shots and SIGHT sail over the crest, so
// the erg stays a landscape of long views and forced detours, never a corridor
// maze (claustrophobia belongs to the jungle). The recipe guarantees slipface
// BREACHES through every ridge — the passes caravans died looking for.
registerRegion({ id: 'duneface', walkable: false, blocks: true, label: 'the dune face',
  blocksShot: false, blocksSight: false,
  // Fill-only, NO cell edge: any rim here traces the walk lattice's stair-
  // steps (sticker-boxes in live QA). The dune_crest comb art — stamped to
  // OVERLAP along every rail — is the ridge's true silhouette and light.
  // LIGHTER than the sand-palette floor: raised sand catches sun (a darker
  // fill inverted into checker-holes the moment the floor palettes went in).
  visual: { fill: '#63512a', alpha: 0.9 } });
// SOFT SAND: the loose lee where a ridge sheds itself — deep going, slow.
// A moveScale (the road's seam, inverted) instead of a status on purpose:
// crossing a dune sea means wading a dozen lees an hour, and a status pip
// strobing on every one would be noise (the mired icon keeps meaning bogs).
registerRegion({ id: 'softsand', walkable: true, blocks: false, label: 'the soft sand',
  moveScale: 0.82,
  visual: { fill: '#241c10', alpha: 0.25 } });
// HARDPAN: wind-rammed clay and salt scoured flat between the ridges — the
// desert's own road (the caravans knew). The dunefield recipe threads pan
// lanes ALONG the prevailing wind: walking the grain of the land is faster
// than fighting it, and the lanes make that legible underfoot.
registerRegion({ id: 'hardpan', walkable: true, blocks: false, label: 'the hardpan',
  moveScale: 1.05,
  visual: { fill: '#8a7a4e', alpha: 0.3 } });

// --- THE MASSIF FABRIC's reference walls (engine/massif.ts) -------------------
// CRAG: bare standing rock — the interior mass of open-country massif zones
// (tors, bluffs, scarp slabs). A TRUE WALL like the mountain face it is:
// bodies, arrows and SIGHT all stop (a shot has no business flying through a
// crag — the 'wall' doctrine), and the pale weathered rim announces stone
// against any floor (the flesh-wall lesson). Uncoursed on purpose: this is
// the land's own bone, not masonry — ruin/rampart kinds carry the built read.
registerRegion({ id: 'crag', walkable: false, blocks: true, label: 'the crag',
  blocksShot: true, blocksSight: true,
  visual: { fill: '#3d3a31', alpha: 1, edge: { color: '#93886d', width: 5 } } });
// DRYSTONE: a waist-high field wall — stacked stone, no mortar (fold courts,
// old boundary lines). The PARAPET POLICY in the open country: bodies never
// cross, but shots and sight sail over, so a walled fold is a prize you duel
// ACROSS before you walk around to its mouth — never a corridor. Masonry
// coursing at a lower alpha so it reads BUILT but low.
registerRegion({ id: 'drystone', walkable: false, blocks: true, label: 'the field wall',
  blocksShot: false, blocksSight: false,
  visual: { fill: '#4a4438', alpha: 0.94, masonry: true, edge: { color: '#928a6e', width: 3 } } });
// HEDGEWALL: a grown boundary line — bocage, not brush (data/massifs.ts rides
// it for hedge masses). The THIRD block texture between crag and drystone:
// bodies stop, SIGHT stops (you cannot read what waits behind the green), but
// SHOTS pass — an arrow threads leaves a wall of stone would eat. Firing
// blind THROUGH your own cover is the kind's whole conversation. Foliage
// coursing over a deep hedge green, sunlit fringe rim (the verdure contrast
// discipline; distinct tones so jungle verdure stays its own read).
registerRegion({ id: 'hedgewall', walkable: false, blocks: true, label: 'the hedgerow',
  blocksShot: false, blocksSight: true,
  visual: { fill: '#1e3610', alpha: 1, foliage: true, edge: { color: '#68a03c', width: 5 } } });
// BED WALL: the Tender's raised planter bed at bug height — timber boards
// shoring a rampart of worked soil (data/garden.ts rides it for the
// planter_bed masses). A TRUE WALL: at this scale the boards stand a
// building tall, so bodies, shots and sight all stop. Coursed like built
// timber (it IS built), the pale plank rim reading carpentry against the
// garden floor; the dark loam fill reads soil, not stone.
registerRegion({ id: 'bed_wall', walkable: false, blocks: true, label: 'the planter boards',
  blocksShot: true, blocksSight: true,
  visual: { fill: '#3a2c1c', alpha: 1, masonry: true, edge: { color: '#a08a5c', width: 5 } } });
// NEST WALL: the formicary's worked earth — tunnel walls the colony chewed
// and tamped (the garden country's interior, data/tilesets.ts 'formicary').
// A TRUE WALL in packed loam: bodies, shots and sight stop; no masonry
// coursing (nothing here was ever STACKED — it was excavated), the pale
// rim reading dry-crumb earth against the gallery dark.
registerRegion({ id: 'nest_wall', walkable: false, blocks: true, label: 'the worked earth',
  blocksShot: true, blocksSight: true,
  visual: { fill: '#33261a', alpha: 1, edge: { color: '#8a6c48', width: 4 } } });

// SUNKSTONE WALL: the buried vault's dressed sandstone — the negative space
// of halls the desert swallowed (the ruin_wall contract in sand tones). A
// TRUE WALL, coursed so the vault reads BUILT; the pale-gold rim announces
// stone against the dark interior dust (the flesh-wall lesson).
registerRegion({ id: 'sunkstone_wall', walkable: false, blocks: true, label: 'the old sandstone',
  blocksShot: true, blocksSight: true,
  visual: { fill: '#332a18', alpha: 1, masonry: true, edge: { color: '#8a7448', width: 4 } } });

// --- STRUCTURE REGIONS (the plan-structure framework) ------------------------
// RAMPART: dressed structural stone — a castle/fortress curtain wall. A TRUE
// WALL (stops shots and sight, like wall/flesh_wall/fungal_wall): storming a
// keep means finding the gate or a window line, not trading arrows through
// masonry.
registerRegion({ id: 'rampart', walkable: false, blocks: true, label: 'the rampart',
  blocksShot: true, blocksSight: true, visual: { fill: '#3b3f4c', alpha: 1, masonry: true } });
// PARAPET: a waist-high battlement rim (tower crowns, wall walks). Blocks MOVEMENT
// only — shots and sight sail over, which is what lets a garrisoned archer rain
// fire from a tower while staying unreachable (the Arreat-plateau imp fantasy).
registerRegion({ id: 'parapet', walkable: false, blocks: true, label: 'the parapet',
  blocksShot: false, blocksSight: false, visual: { fill: '#4a4f5e', alpha: 0.9 } });
// ARENA STANDS: a colosseum's crowd annulus — a TRUE barrier to feet AND
// arrows (the fight stays in the pit; no stray shot thins the audience) that
// the EYE sails over: the stands sit BELOW the rail and the crowd is the
// whole point of the set-piece — the sight veil must never darken what a
// colosseum exists to show. Distinct from parapet (see + SHOOT over) and
// rampart (nothing passes): this is the third combination, see-but-never-
// shoot. Warm stonework matching the grand arena's palette; any future
// arena picks its own row via layoutParams.standRegion.
registerRegion({ id: 'arena_stands', walkable: false, blocks: true, label: 'the stands',
  blocksShot: true, blocksSight: false,
  visual: { fill: '#7a6a4c', alpha: 1, masonry: true, edge: { color: '#9a8a64', width: 4 } } });
// WINDOW: an arrow-slit in a rampart line. Same policy as parapet (see + shoot
// through, never walk through) — a distinct id so blueprints, renders, and future
// rules can tell a slit from a battlement.
registerRegion({ id: 'window', walkable: false, blocks: true, label: 'the window',
  blocksShot: false, blocksSight: false, visual: { fill: '#2b3140', alpha: 0.85 } });
// PALISADE: a staked-timber curtain — the built wall of whoever stacks wood
// instead of coursing stone (war camps, toll-gates, frontier holdfasts). A
// TRUE WALL like rampart (stops movement, shots and sight — sharpened stakes
// stand taller than a head); flat timber fill, no masonry coursing, a pale
// cut-top rim so the stake line reads at a glance against dark ground.
registerRegion({ id: 'palisade', walkable: false, blocks: true, label: 'the palisade',
  blocksShot: true, blocksSight: true,
  visual: { fill: '#41301b', alpha: 1, edge: { color: '#7a6236', width: 4 } } });

// --- THE SETTLED BELT (engine/settled.ts recipes; kinds in data/massifs.ts) ---
// TENEMENT WALL: the stacked city block — brick over timber bones, coursed so
// the ward reads BUILT street after street. A TRUE WALL (bodies, shots and
// sight all stop): the warrens' whole conversation is which alley you can't
// see down, and a wall you could shoot through would give the ghetto away.
// Warm brick against the paved greys; pale mortar rim (the flesh-wall lesson).
registerRegion({ id: 'tenement_wall', walkable: false, blocks: true, label: 'the tenements',
  blocksShot: true, blocksSight: true,
  visual: { fill: '#4a3226', alpha: 1, masonry: true, edge: { color: '#8a6a4a', width: 4 } } });
// MANOR WALL: the high quarter's dressed pale stone — finer coursing, cooler
// tones (the same TRUE-WALL policy; nobility buys thicker walls, not kinder
// ones). Distinct from rampart on purpose: a patrician terrace must never
// read as a fortress curtain.
registerRegion({ id: 'manor_wall', walkable: false, blocks: true, label: 'the manor walls',
  blocksShot: true, blocksSight: true,
  visual: { fill: '#45483e', alpha: 1, masonry: true, edge: { color: '#9a9a84', width: 4 } } });
// SEWER WALL: the undercity's slick coursed stone — the city's masonry gone
// green at the waterline (a TRUE WALL; the drains were built as well as the
// streets above them, and they keep their secrets the same way).
registerRegion({ id: 'sewer_wall', walkable: false, blocks: true, label: 'the sewer wall',
  blocksShot: true, blocksSight: true,
  visual: { fill: '#26302a', alpha: 1, masonry: true, edge: { color: '#54745c', width: 3 } } });

// --- THE TIER FABRIC ROWS (engine/tiers.ts — one cell, two floors) -------------
// BUTTE TOP: the needle's summit — a cliff wall to the valley (TRUE WALL:
// bodies, shots and sight stop at the rock), FLOOR to whoever stands on it.
// The plateau fill + pale rim carry the height read from below.
registerRegion({ id: 'butte_top', walkable: false, blocks: true, label: 'the butte top',
  blocksShot: true, blocksSight: true, tier: 1,
  visual: { fill: '#57503c', alpha: 1, edge: { color: '#a89a72', width: 6 } } });
// BUTTE SPAN: a rope-and-plank deck strung between summits — the valley
// walks UNDER it, the tops walk OVER it (walkable on both tiers). Shots and
// sight pass (open air both above and below the planks).
registerRegion({ id: 'butte_span', walkable: true, blocks: false, label: 'the span',
  tier: 1,
  visual: { fill: '#6a5638', alpha: 0.85, edge: { color: '#8a744e', width: 3 } } });
// TIER RAMP: the switchback cut up a butte's rim — THE crossing (walkable on
// both tiers; stepping off it onto ground only one tier owns flips you).
registerRegion({ id: 'tier_ramp', walkable: true, blocks: false, label: 'the ramp',
  tier: 1, tierLink: true,
  visual: { fill: '#7a6a48', alpha: 0.9, edge: { color: '#a89a72', width: 3 } } });
// SEWER DUCT: the drain under the street — the street above keeps its own
// face (no visual: the cell draws as ordinary ground), the duct below shows
// only through the tier veil when you're down there.
registerRegion({ id: 'sewer_duct', walkable: true, blocks: false, label: 'the duct',
  tier: 1,
  tierVisual: { fill: '#1c241e', edge: '#54745c' } });
// SEWER UNDER-WALL: the duct where it runs beneath a building — the block
// keeps its brick face and its TRUE-WALL policy on the street tier; the
// tunnel below is the tier's business alone.
registerRegion({ id: 'sewer_under_wall', walkable: false, blocks: true, label: 'the under-wall',
  blocksShot: true, blocksSight: true, tier: 1,
  visual: { fill: '#4a3226', alpha: 1, masonry: true, edge: { color: '#8a6a4a', width: 4 } },
  tierVisual: { fill: '#181f1a', edge: '#54745c' } });
// CULVERT WELL: the open drain-mouth — the crossing between street and duct
// (walkable both tiers, flips on exit). Reads as a ringed well from above.
registerRegion({ id: 'culvert_well', walkable: true, blocks: false, label: 'the culvert',
  tier: 1, tierLink: true,
  visual: { fill: '#222824', alpha: 0.95, edge: { color: '#54745c', width: 4 } },
  tierVisual: { fill: '#26302a', edge: '#6a8a70' } });

// TOR GALLERY: a hollow tor's bored tunnel (the massif-bore lane,
// engine/tiers.ts boreMassifTunnels): the mass keeps the CRAG's exact
// surface face — true wall, same granite, the bore invisible from above —
// while the gallery through the rock is the covered tier's alone.
registerRegion({ id: 'tor_gallery', walkable: false, blocks: true, label: 'the tor gallery',
  blocksShot: true, blocksSight: true, tier: 1,
  visual: { fill: '#3d3a31', alpha: 1, edge: { color: '#93886d', width: 5 } },
  tierVisual: { fill: '#16181c', edge: '#7a828c' } });
// TOR MOUTH: the cut stair into the hillside — the crossing between the
// open slope and the gallery (the culvert well's granite twin: walkable
// both tiers, flips on the ladder toggle).
registerRegion({ id: 'tor_mouth', walkable: true, blocks: false, label: 'the tor mouth',
  tier: 1, tierLink: true,
  visual: { fill: '#2e2b24', alpha: 0.95, edge: { color: '#93886d', width: 4 } },
  tierVisual: { fill: '#1c1f24', edge: '#8a8f98' } });

// --- THE HIGH BASTION (aether_bastion; kinds in data/massifs.ts) -------------
// BASTION WALL: the Host's citadel curtain — glossy silver coursing under a
// polished rim (the brightest TRUE wall in the register: every other wall is
// the ground's dark bone; this one is ARCHITECTURE wearing light). Bodies,
// shots and sight all stop — a citadel you could shoot through would be a
// pavilion — so the country plays as the massif negotiation at fortress
// scale: you see the silver, you walk AROUND it.
registerRegion({ id: 'bastion_wall', walkable: false, blocks: true, label: 'the bastion wall',
  blocksShot: true, blocksSight: true,
  // Fill authored BRIGHT on purpose: the masonry bake courses most of the
  // surface in mix(fill, black, 0.42) — a mid fill reads slate; only a pale
  // silver base keeps the coursing metallic (measured, not guessed).
  visual: { fill: '#b8c2d8', alpha: 1, masonry: true, edge: { color: '#eef2fc', width: 5 } } });
// GILT PARAPET: the gold balustrade — waist-high glory (the drystone/parapet
// policy in precious metal): bodies never cross, but shots and sight sail
// over, so a gilded court is a prize you duel ACROSS before you find its
// gate. The gold-against-silver counterpoint is the country's palette law.
registerRegion({ id: 'gilt_parapet', walkable: false, blocks: true, label: 'the gilt parapet',
  blocksShot: false, blocksSight: false,
  visual: { fill: '#b08a3e', alpha: 0.92, masonry: true, edge: { color: '#ffd97a', width: 4 } } });
// PANTHEON WALL: the seraph city's white marble — dressed coursing under a
// gold rim (the same pale-fill law as bastion_wall: the masonry bake keeps
// most of the surface near mix(fill, black, 0.42), so only a bright base
// reads MARBLE). A TRUE WALL: the dome and the temple ring stop everything.
registerRegion({ id: 'pantheon_wall', walkable: false, blocks: true, label: 'the pantheon wall',
  blocksShot: true, blocksSight: true,
  visual: { fill: '#e2dcc8', alpha: 1, masonry: true, edge: { color: '#ffd97a', width: 5 } } });
// COLONNADE: marble columns in line — the SEE-THROUGH wall (bodies stop;
// shots and sight thread the columns), the amphitheater's seating and the
// forum's pillar runs. Distinct from gilt_parapet on purpose: gold rail vs
// white columns is the city's material counterpoint.
registerRegion({ id: 'colonnade', walkable: false, blocks: true, label: 'the colonnade',
  blocksShot: false, blocksSight: false,
  visual: { fill: '#d8d2be', alpha: 0.92, masonry: true, edge: { color: '#f8f2de', width: 4 } } });
