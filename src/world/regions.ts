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
  | { kind: 'skyfall' };

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
  /** A gentle animated shimmer/pulse (renderer interprets). */
  animate?: 'shimmer' | 'pulse' | 'drift';
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
  /** HUD meter fill colour (the readout loops this table, so a new resource draws
   *  for free — just add a row + a colour). */
  color: string;
}

export const SURVIVAL_RESOURCES: Record<string, SurvivalResourceDef> = {
  // Drowning RAMPS: ~5%/s at first, climbing to ~25%/s after 10s under without air —
  // a tightening panic, not a flat tax. Refilling breath (an air pocket) resets it.
  breath: { id: 'breath', label: 'Breath', max: 12, regen: 5, underflowPctLifePerSec: 0.05, underflowRampTo: 0.25, underflowRampSecs: 10, color: '#6ac0f8' },
  // LIGHT — the Descent's encroaching-darkness countdown. It only ever DRAINS (no
  // passive regen); running over a light spot bursts it back up. underflow does NO
  // life damage — at zero the dark CONSUMES you and the engine resurfaces you
  // (handled explicitly in updateDescent), a cleaner "the dark takes you" than chip
  // damage. The HUD survival readout draws this meter for free (it loops this table).
  light: { id: 'light', label: 'Light', max: 100, regen: 0, underflowPctLifePerSec: 0, color: '#ffe08a' },
};

export function survivalResource(id: string): SurvivalResourceDef | undefined { return SURVIVAL_RESOURCES[id]; }

const REGION_KINDS: Record<string, RegionKind> = {};

/** Register a region kind under an open-string id. */
export function registerRegion(def: RegionKind): void { REGION_KINDS[def.id] = def; }

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

// --- DEFAULT ROWS -----------------------------------------------------------
// Grid substrate kinds (no terrain effect; pure collision policy).
registerRegion({ id: 'ground', walkable: true, blocks: false });
// TRUE WALLS: a mountain pass's rock face stops arrows and sight — a shot has
// no business flying "over" a cliff wall (a valley or a void is different: see
// 'void'/'chasm', which bodies cannot cross but shots sail over). Flipped in
// the primitives pass now that AI reposition (implicit losSeek) exists.
registerRegion({ id: 'wall', walkable: false, blocks: true, blocksShot: true, blocksSight: true });

// Existing DOODAD grounds, migrated VERBATIM from the updateTerrainEffects switch
// (same statuses, sources, durations, and zone-level-scaled bog poison).
registerRegion({ id: 'mud', walkable: true, blocks: false, label: 'the mud', standStatus: 'mired' });
registerRegion({ id: 'sand', walkable: true, blocks: false, label: 'the sand', standStatus: 'mired' });
registerRegion({ id: 'swamp', walkable: true, blocks: false, label: 'the swamp', standStatus: 'sodden' });
registerRegion({ id: 'water', walkable: true, blocks: false, label: 'the water', standStatus: 'wading', standStatusDeep: 'swimming', surfaceWake: 'ripple' });
registerRegion({ id: 'ice', walkable: true, blocks: false, label: 'the ice', standStatus: 'slippery', surfaceMirror: true });
registerRegion({ id: 'brush', walkable: true, blocks: false, label: 'the brush', standStatus: 'concealed' });
registerRegion({ id: 'bog', walkable: true, blocks: false, label: 'the bog', standStatus: 'bogged',
  enterStatus: { id: 'poison', amount: 1.5, amountPerLevel: 0.7, duration: 1 }, enterText: { text: 'bogged!', color: '#6a8a3a' } });
// LAVA — a real LIQUID: crossable, and it COOKS whoever isn't insured
// (fliers, habitat-matched bodies, immuneGround bearers wade free). Heavy
// typed fire per second through RESISTANCE only — capping fire res is the
// build answer, wading anyway is the desperate one. The mired slog keeps
// the crossing a decision, not a stroll; the impassable molten WALL (the
// caldera's spiral) is the separate magma_core doodad kind.
registerRegion({ id: 'lava', walkable: true, blocks: false, label: 'the lava',
  standStatus: 'mired',
  standDamage: { dps: 14, dpsPerLevel: 2.2, type: 'fire' },
  enterStatus: { id: 'burn', amount: 1.2, amountPerLevel: 0.5, duration: 2 },
  enterText: { text: 'scalded!', color: '#ff8a3a' } });
registerRegion({ id: 'tentacle_field', walkable: true, blocks: false, label: 'the tentacles', standStatus: 'ensnared',
  enterStatus: { id: 'stun', duration: 0.6 }, enterText: { text: 'ensnared!', color: '#7fce6a' } });
// ROAD: a packed gravel path — a VERY mild move-speed boost (moveScale, NOT a status, so
// there's no status icon for so minor an effect). The first consumer of the moveScale seam.
registerRegion({ id: 'road', walkable: true, blocks: false, label: 'the road', moveScale: 1.04 });
// (fog_bank region RETIRED: volumetric fog is the LIVING fog fabric now —
//  engine/fog.ts grants fogveiled from roaming banks; no ground region.)
// WEBBING: sticky sheets slow like mire (spider country).
registerRegion({ id: 'web', walkable: true, blocks: false, label: 'the webbing', standStatus: 'mired',
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
// DEEP WATER: walkable but you SWIM (slowed) and your BREATH drains; out of air
// you start drowning (the survival system). The underwater zones' open sea.
registerRegion({
  id: 'deep_water', walkable: true, blocks: false, label: 'the depths',
  // The ocean FLOOR: a mild slow + a slippery, low-traction step ('seabed') — trudging
  // the seabed, not the heavier 'swimming' wade. Breath still drains down here.
  standStatus: 'seabed', survival: { resource: 'breath', drain: 1 },
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
  visual: { fill: '#22421a', alpha: 1, edge: { color: '#4f7a2c', width: 5 } } });
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
