// ---------------------------------------------------------------------------
// THE SIGHT VEIL — positional occlusion shadows (VIS_CFG.sightVeil).
//
// The drawn expression of the LoS fabric's honest ray (engine/los.ts): from
// the LOCAL HERO's eye, every sight-blocking body throws "unseen" dark behind
// itself. Two occluder families, both resolved from data the terrain already
// declares (nothing here names a kind):
//
//   REGIONS — walk-grid cells whose RegionKind.blocksSight is true (rampart
//             lines, cave walls, verdure, palisades…). Closed doors seal
//             their cells into the grid as rampart and reopen with it, so a
//             door's shadow follows its state with zero code here. Shadows
//             cast from the solid mass's FACING EDGES (merged runs), so a
//             whole wall line is one quad, not thirty.
//   DOODADS — solid bodies via the hit-surface fabric at their SHOT surface
//             (hitSurfaceOf 'shot': the TRUNK — you fight under the leaves
//             and hide behind the bole; the crown's own pixels + the canopy
//             veil already own what's beneath the leaves). Gated + GRADED by
//             sightShadowFrac (DoodadRule.sightShadow — boolean or the
//             low-profile ladder {minR, softR, mul}): windows, kelp and the
//             hearth never shadow; boulders, trunks and masonry piers throw
//             full dark; a fire-ring stone or headstone the eye honestly
//             sees OVER breathes a SHORT, FAINT gloom (strength and length
//             both scale with the body — the southern-Lastlight lesson:
//             knee-high props must never read as rampart cover).
//
// RENDER-ONLY BY DOCTRINE. Engine LoS keeps its own ray — AI perception is
// blinded WIDER than this veil draws (crowns block sight at full radius);
// the asymmetry always favors the player. The veil is the drawn horizon of
// attention: what stands in a shadow is unseen with the ground it stands on
// (actor sprites fade via actorShade, nameplates gate via occludedAt), and
// the whole pass composites AFTER the actor pass but BEFORE canopies and
// roofs — a building's far side goes dark while the building itself, its
// roof-line and its crowns stay lit (the skyline is tall; the street is not).
//
// PERF SHAPE (smoothness is the crux): occluder GATHERING is cached against
// (hero bucket × doodad-list rev × grid version) — a walk rebuilds a few
// times a second, microseconds each; per FRAME the work is one facing test
// per cached edge, one tangent wedge per cached disc, a handful of layered
// fills into a downscaled sheet, and ONE composite. Bodies whose whole
// shadow lies beyond the veil radius are culled per frame (mirrored in
// occludedAt, so drawn and tested agree about the rim), which keeps the
// maxOccluders cap a true pathological backstop — the cap must NEVER bite
// inside the visible field: when it did (dense jungle at 288), every
// 96px gather re-sort swapped dozens of ON-SCREEN wedges in one frame (the
// "veil bouncing between darker and lighter" flicker sighting).
// Zones with nothing to occlude skip the sheet entirely. The room veil owns
// a fully wrapped frame: this pass fades itself out as confinement wraps.
// Ablate pass name: 'sightveil'.
//
// UNION IS ABSOLUTE (the max-blend contract): overlapping shadows never
// stack — not within a family, not ACROSS families or strength tiers. Every
// layer is one Path2D filled twice: first punched out of the sheet
// (destination-out), then painted at its own alpha, ascending weak→strong —
// so any pixel wears exactly the STRONGEST shadow that covers it. (Two
// same-shape fills share one blur, so feathered fringes compose cleanly.)
// Before this, the region fill over the doodad fill summed to 0.94 where
// 0.8 was authored — moving bands of double-dark in any trunk-plus-wall
// country (the jungle's shifting two-tone patches).
//
// GEOMETRIC SMOOTHNESS (the no-pop contract): every cutoff a moving eye can
// cross MELTS instead of snapping (SIGHT_VEIL_GEO), and every shadow's far
// boundary is an ARC FAN swept from the eye — never a straight chord
// between pushed endpoints. The chord was the "sight hack": pressing the
// eye against a long wall or slab drives the silhouette span toward π, the
// pushed endpoints run nearly PARALLEL to the face, and the chord between
// them sags to a sliver hugging the wall — everything deep behind lights
// up in an inverted "overview" while occludedAt still reports hidden
// (grid collision lets the eye reach the face line itself, so no feather
// can absorb it; live-measured buffer alpha 0 with occ 1.0). The fan
// subdivides the far boundary every SIGHT_VEIL_GEO.arcStep radians, so a
// pressed eye's near-π wedge honestly covers the half-plane. Melts remain
// for displacement THROUGH a body: a disc's reach fades across the last
// few px of SURFACE distance, and a slab's the same way (surfaceFeather —
// span-based melting is gone: it engaged at ordinary press distance on any
// long slab, hw·tan(feather) px off the face). Wall-edge facing flips need
// no feather: their quads are area-continuous through the plane.
// And a DOODAD's shadow is BOUNDED BY ITS CASTER (castLen): the wedge ends
// a body-scaled length past the body, never at the screen rim — unbounded,
// a knee-high rock banded the whole zone in dark from off-screen (the
// "two differently shaded sections split by a straight line" sighting).
// Wall runs keep the veil's full reach: the rampart is a visible cause.
//
// THE VEIL ACROSS BORDERS (seamless mode — VIS_CFG.sightVeil.crossBorder,
// M2 wave 5): with resident neighbors standing at their map seats, the
// occluder set extends past the active rim — each neighbor MINT's wall
// cells and solid trunks join at its seat offset (memoized WHOLE per mint
// identity × the hero's story, folded into the live set at the same reach
// the active sweep uses — mint grain, never per-frame re-derivation), and
// the query march routes every sample to the grid that OWNS its ground:
// the active grid inside its own extent (today's law verbatim), a resident
// neighbor's grid inside its span, and NO grid — the connective tissue —
// reads OPEN. Away open ground contributes no occlusion: the veil answers
// walls, never administrative lines (regionAt answers 'wall' for every
// out-of-grid point, so the un-routed march read the WHOLE beyond-rim
// country as one administrative wall — that sweep dies here). TWO deliberate
// asymmetries against the active extraction, both documented at
// buildNbMemo: a neighbor's out-of-grid reads OPEN (its rim walls are
// watched from OUTSIDE and must cast over their own interior), and its
// roofs ALWAYS conceal (nobody stands inside an away region — the hull law
// at away posture). Discrete play is byte-identical BY CONSTRUCTION: no
// seats = the lane is structurally inert (empty fold, the march's
// discrete path untouched).
//
// The vis-layer doctrine holds: no World import — the pass reads a structural
// view (World satisfies it) plus the same pure terrain-data helpers the LoS
// ray itself resolves through. The path builders speak to a structural
// PathSink (Path2D and 2D contexts both satisfy it), so the headless probe
// (balance/probe_sightveil.ts) walks the EXACT polygons the sheet fills.
// ---------------------------------------------------------------------------

import { registerVisCache } from './caches';
import { VIS_ABLATE, VIS_CFG } from './visConfig';
import type { Doodad } from '../../engine/levelgen';
import { doodadRuleOf, sightShadowFrac, hitSurfaceOf } from '../../engine/levelgen';
import { LOS_CFG } from '../../engine/los';
import { tierElevOf } from '../../engine/tiers';
import { GridWalkField } from '../../world/gridWalk';
import { regionKind } from '../../world/regions';

interface Pt { x: number; y: number }

/** The sliver of World this pass needs (structural — never the class). */
export interface SightView {
  /** The eye — pos plus its STORY (Actor.tier; THE ELEVATION LAW). */
  player: { pos: Pt; tier?: number };
  walk: unknown;
  zone: { id?: string; theme?: { sightVeil?: { mul?: number; regionMul?: number; doodadMul?: number } } };
  doodads: readonly Doodad[];
  doodadsNear(x: number, y: number, reach: number): readonly Doodad[];
  doodadRev: number;
  /** THE VEIL ACROSS BORDERS (seamless mode) — all three optional: absent,
   *  or the mode off, or no seats, or the active zone unseated, and the
   *  cross-border lane is structurally inert (discrete play byte-identical
   *  — the seamlessDrawActive predicate's shape, minus the tissue sampler:
   *  the veil answers MINTS, never tissue). World satisfies these fields
   *  as it stands; probe literals simply omit them. */
  seamless?: boolean;
  seamlessRegions?: readonly { zoneId: string; originPx: { x: number; y: number } }[];
  seamlessMints?: { get(zoneId: string): SeamlessVeilMint | undefined };
}

/** The sliver of a resident neighbor's mint the veil reads (structural —
 *  World.seamlessMints rows satisfy it; the probe builds literals). The
 *  layout is the placement lane's OWN resident mint, so the shadows a
 *  neighbor casts come from the same ground the threshold sweep lands on
 *  (drawn == arrived-at — the body-chunk lane's contract). */
export interface SeamlessVeilMint {
  layout: {
    walk?: unknown;
    doodads: readonly Doodad[];
    structures?: readonly { roofs: readonly { x: number; y: number; w: number; h: number }[] }[];
  };
}

/** The path surface the shadow builders draw into. Path2D and canvas
 *  contexts both satisfy it structurally — the probe passes a collector and
 *  walks the EXACT geometry the sheet fills (drawn==tested at the polygon). */
export interface PathSink {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
}

/** One cached solid-body silhouette (flattened from its HitShape). `s` is the
 *  kind's graded shadow strength (sightShadowFrac — scales alpha AND length). */
interface OccDisc { x: number; y: number; r: number; s: number }
interface OccRect { x: number; y: number; hw: number; hh: number; rot: number; boundR: number; s: number }
/** One cached wall FACE (a merged run of solid-cell edges), with the outward
 *  normal (away from the solid mass, toward the ground it faces). */
export interface OccEdge { ax: number; ay: number; bx: number; by: number; nx: number; ny: number }
/** One cached INTERACTABLE reveal (DoodadRule.veilPierce): a feathered disc
 *  punched out of the finished sheet so the object stays discernible through
 *  any shadow — a door on the wall plane must never read as wall. */
interface Pierce { x: number; y: number; r: number; s: number }

/** One resident neighbor's occluders, extracted WHOLE in NEIGHBOR-LOCAL px
 *  and memoized against (mint identity × the settled hero story) — the
 *  mint-identity idiom (SeamlessBodyChunks.statics): a re-minted record
 *  rebuilds, a standing one never re-derives. `gw`/`gh` are the grid's
 *  pixel extent — the march's ownership test. */
interface NbMemo {
  mint: SeamlessVeilMint;
  heroT: number;
  grid: GridWalkField | null;
  gw: number; gh: number;
  /** The mint's roof rects (neighbor-local) — ALWAYS concealing (the hull
   *  law at away posture: nobody stands inside an away region). */
  roofs: readonly { x: number; y: number; w: number; h: number }[];
  edges: OccEdge[];
  discs: OccDisc[];
  rects: OccRect[];
  pierces: Pierce[];
}

/** A resolved resident neighbor: its memo + this frame's seat offset —
 *  neighbor-local + (dx,dy) = ACTIVE-local (one affine, the RegionSeat
 *  contract), so a threshold rebase only moves the offsets. */
interface NbRef { zoneId: string; dx: number; dy: number; memo: NbMemo }

/** Hero-bucket size for cache keys (px): crossing one triggers a re-gather. */
const GATHER_BUCKET = 96;
/** Extra gather reach past the veil radius, so a bucket-crossing never has
 *  to re-gather for occluders that were just out of the last sweep. */
const GATHER_PAD = 160;

/** Geometric smoothness dials (module defaults — the BLEND_CFG idiom:
 *  the fabric's own dials live with the fabric). The feather is ZERO-COST
 *  and invisible in normal movement — doodad collision keeps the eye a body
 *  radius off every solid surface — and exists so displacement (phasing,
 *  pulls, knockback-through) melts a shadow instead of snapping it (see
 *  GEOMETRIC SMOOTHNESS above). */
export const SIGHT_VEIL_GEO = {
  /** World px of SURFACE distance across which a body's shadow melts to
   *  nothing as a displaced eye presses through it — discs measure from the
   *  rim (d − r), slabs from the oriented face. Grid EDGES never melt (their
   *  quads are area-continuous through the facing plane, and grid collision
   *  can carry the eye to the face line itself — a melt there would BE the
   *  sight hack). */
  surfaceFeather: 10,
  /** Far-boundary fan pitch (radians): every shadow's far side is swept as
   *  an eye-centered arc in steps of at most this, never closed with one
   *  straight chord. Distant casters span less than one step and pay zero
   *  extra points; a pressed eye's near-π silhouette gets the honest
   *  half-plane. (The chord's sag toward the eye at wide spans was the
   *  wall-press "overview" inversion.) */
  arcStep: Math.PI / 6,
  /** World px of ON-PLANE tolerance for a wall face's facing test. Grid
   *  collision holds the eye's CENTER on the face line itself (measured
   *  0.00–0.7px pressed), so a strict `dot <= 0` skip sat on a knife's
   *  edge: sliding along a wall blinked the whole face's shadow off for a
   *  frame at every jitter, and standing in a corner pocket held the
   *  quadrant behind the perpendicular face (dot exactly 0) permanently
   *  lit — the durance/flesh "changes abruptly, reverts, changes again"
   *  and the corner that granted sight it must obscure. Within this band
   *  the eye is clamped half a px onto the OPEN side for that face's
   *  geometry instead of dropped (the sweep side of the far fan follows
   *  the eye's side of the plane, so the clamp also keeps a sub-pixel
   *  inside-the-line eye from fanning the wrong half-plane). Must stay
   *  well under a wall cell's thickness so a thin wall's FAR face (a full
   *  cell away) never draws. */
  faceSlack: 1.5,
  /** A DOODAD shadow's LENGTH scales with its CASTER, never the screen:
   *  the wedge ends castLen(bodyR, s) = clamp(r × castFarR, ≥ castFarFloor)
   *  × s world px past the body (still capped by the veil's own far).
   *  Without the cap a knee-high rock threw its wedge the full view
   *  diagonal — a razor-edged dark band crossing the whole zone from a
   *  caster standing OFF-SCREEN, read in playtests as "two differently
   *  shaded sections split by a straight line" (the Sundered Point
   *  sighting). Bodies shade like bodies: a trunk throws a tree-length
   *  shadow, a boulder a boulder's — and a GRADED low-profile kind a
   *  fraction of that (s: the same number that fades its alpha). WALL runs
   *  (OccEdge) keep the full far on purpose — a rampart's far side is
   *  honestly unseen, and the wall itself is a visible cause standing at
   *  the shadow's root. */
  castFarR: 13,
  /** Shadow-length floor (world px) so saplings still read as cover. */
  castFarFloor: 160,
} as const;

/** THE ONE doodad-shadow length resolver (world px past the body) — draw()
 *  and occludedAt() both ride it, so drawn and tested can never disagree
 *  about where a shadow ends. `s` is the body's graded strength: a soft
 *  shadow is a SHORT shadow too. */
export function castLen(bodyR: number, s = 1): number {
  return Math.max(SIGHT_VEIL_GEO.castFarFloor, bodyR * SIGHT_VEIL_GEO.castFarR) * s;
}

/** blocksSight + tier ELEVATION per region id, memoized (regionAt returns
 *  strings at cell cadence — a Map get beats a registry walk in the
 *  extraction loop). Elevation rides along for THE ELEVATION LAW
 *  (engine/los.ts RayElev): a blocking row that is tier FLOOR occludes only
 *  eyes below its deck — a butte top goes clear the moment you stand on it. */
const sightBlockCache = new Map<string, { b: boolean; e: number | null }>();
function sightBlockOf(id: string): { b: boolean; e: number | null } {
  let v = sightBlockCache.get(id);
  if (v === undefined) {
    v = { b: !!regionKind(id)?.blocksSight, e: tierElevOf(id) };
    sightBlockCache.set(id, v);
  }
  return v;
}

export class SightVeil {
  /** The shadow sheet (lazy: headless probes construct + query with no DOM). */
  private buf: HTMLCanvasElement | null = null;
  private bctx: CanvasRenderingContext2D | null = null;

  /** THE PLAYER'S SHADE DIAL (Settings.veilDarkness — the renderer stamps it
   *  each frame before update): one multiplier over BOTH shadow families, so
   *  the sheet, the roof composites, label gating and hidden-actor fades all
   *  dim together and pixels can never disagree with text. 1 = the authored
   *  night; 0 lifts the veil (active goes false — the pass costs nothing).
   *  Purely aesthetic: the engine's own LoS ray never reads it. */
  userMul = 1;
  /** THE COUCH SUSPEND (data/couch.ts COUCH_CFG.render): this veil is a
   *  single-eye fabric — under a shared couch frame the renderer parks it
   *  here. Folds into `active`, so every consumer (occludedAt, actorShade,
   *  draw) degrades to CLEAR through its own existing inactive path. */
  suspend = false;

  /** Live per-frame state (update() resolves; draw()/queries consume). */
  private active = false;
  private regionF = 0;   // hide-fraction of a true-wall shadow (0..1)
  private doodadF = 0;   // hide-fraction of a full-strength body shadow (0..1)
  private px = 0; private py = 0;
  /** The eye's STORY (THE ELEVATION LAW) — part of every occluder cache key. */
  private heroT = 0;
  /** THE SETTLE DEBOUNCE (VIS_CFG.sightVeil.tierSettleFrames): a candidate
   *  story waiting to hold enough consecutive frames before heroT adopts it
   *  (the ramp-lip flicker guard). null = nothing pending. */
  private pendTier: number | null = null;
  private pendTierN = 0;
  private heroTInit = false;
  private radius = 0;
  private frame = 0;

  // --- occluder caches (rebuilt on hero-bucket / revision change) -----------
  private discs: OccDisc[] = [];
  private rects: OccRect[] = [];
  private pierces: Pierce[] = [];
  private dooBx = 1e9; private dooBy = 1e9; private dooRev = -1;
  private dooArr: readonly Doodad[] | null = null; private dooLen = -1; private dooR = 0;

  private edges: OccEdge[] = [];
  private gridRef: GridWalkField | null = null;
  private gridBx = 1e9; private gridBy = 1e9; private gridV = -1; private gridR = 0;

  /** THE VEIL ACROSS BORDERS: the resolved resident neighbors (empty =
   *  discrete play / mode off / dial off — the whole lane inert) + the
   *  per-zone memo store. Working set = the resident ring BY CONSTRUCTION:
   *  resolveNeighbors prunes demoted zones, and an emptied seat list
   *  (discrete load, run end) prunes everything. */
  private nbs: NbRef[] = [];
  private nbMemo = new Map<string, NbMemo>();

  constructor() {
    // The steward row (instance caches register at construction — the
    // ground/canopy idiom; re-registering the id replaces the row, so probe
    // rigs constructing throwaway veils never accumulate rows). No
    // onZoneSwap on purpose — the memo is world-keyed like the seamless
    // chunk caches (clearing at the threshold would re-derive every
    // neighbor at the exact moment that must stay smooth); demotion prunes
    // through resolveNeighbors instead.
    registerVisCache({
      id: 'sightVeilBorders',
      count: () => this.nbMemo.size,
      bytes: () => {
        let n = 0;
        for (const m of this.nbMemo.values()) {
          n += m.edges.length + m.discs.length + m.rects.length + m.pierces.length + m.roofs.length;
        }
        return n * 96; // census-grade: small numeric records
      },
      onRunSwap: () => { this.nbs = []; this.nbMemo.clear(); },
    });
  }

  /** THE HULL LAW: roof rects currently CONCEALING (standing roofs, fed by
   *  the renderer each frame) — their cells read solid to the extraction
   *  and to occludedAt alike, so an open doorway never lances a wedge
   *  across a hidden interior. Key detects set changes (re-extract). */
  private concealed: readonly { x: number; y: number; w: number; h: number }[] = [];
  private concealKey = '';

  /** The composite mapping draw() last used (compositeOver replays it so a
   *  roof's veil blit lands pixel-identical to the main sheet). */
  private drew = false;
  private drewW = 0; private drewH = 0;

  /** Per-actor smoothed hide fades (WeakMap: dead actors collect themselves). */
  private shades = new WeakMap<object, { v: number; f: number }>();

  /** Resolve strengths + refresh occluder caches. Once per frame, before
   *  draw. confineFrac is the room veil's wrap (this pass yields to a
   *  confined frame); vw/vh the view extent in world units (the veil reach
   *  derives from it); `concealed` is THE HULL LAW's roof-rect list (roofs
   *  standing this frame — their coverage reads solid from outside).
   *  Per-body smoothing rides actorShade's own dt. */
  update(view: SightView, confineFrac: number, vw: number, vh: number,
    concealed: readonly { x: number; y: number; w: number; h: number }[] = []): void {
    const cfg = VIS_CFG.sightVeil;
    this.frame++;
    this.drew = false;
    const t = view.zone.theme?.sightVeil;
    const open = 1 - Math.min(1, confineFrac);
    const mul = (t?.mul ?? 1) * open * Math.max(0, Math.min(1, this.userMul));
    this.regionF = Math.max(0, Math.min(1, cfg.regionStrength * (t?.regionMul ?? 1) * mul));
    this.doodadF = Math.max(0, Math.min(1, cfg.doodadStrength * (t?.doodadMul ?? 1) * mul));
    this.active = cfg.enabled && !VIS_ABLATE.has('sightveil') && !this.suspend
      && (this.regionF > 0.01 || this.doodadF > 0.01);
    if (!this.active) return;

    const p = view.player.pos;
    this.px = p.x; this.py = p.y;
    this.radius = Math.min(cfg.maxRadius, Math.hypot(vw, vh) / 2 + 120);

    // THE ELEVATION LAW: the eye's story joins both cache keys — stepping
    // off a ramp re-gathers, so a butte's own mass stops occluding the
    // moment the hero stands on its deck (and resumes when they leave).
    // THE SETTLE DEBOUNCE: on ramp lips and leap/dash landings the tier can
    // flicker frame-to-frame, each flip a full re-gather + re-extract — so
    // a CHANGED story is adopted only once it holds tierSettleFrames
    // consecutive frames (a flicker back home costs nothing), while the
    // first-ever story adopts instantly (a fresh veil has only cold caches).
    // Until adoption the caches AND occludedAt keep the committed story
    // TOGETHER — drawn==tested never splits mid-debounce.
    const hT = view.player.tier ?? 0;
    let heroLifted = false;
    if (!this.heroTInit) { this.heroTInit = true; this.heroT = hT; }
    else if (hT === this.heroT) this.pendTier = null;
    else if (this.pendTier !== hT) { this.pendTier = hT; this.pendTierN = 1; }
    else if (++this.pendTierN >= cfg.tierSettleFrames) {
      this.pendTier = null; this.heroT = hT; heroLifted = true;
    }

    // THE VEIL ACROSS BORDERS: resolve the resident-neighbor fold (seat
    // offsets + mint-identity memos, heroT-aware — hence after the settle
    // block above). A changed fold (admission, demotion, re-mint, rebase,
    // a settled story) re-runs both gathers below; an unchanged one costs
    // a handful of compares. Discrete play: structurally empty, free.
    const nbChanged = this.resolveNeighbors(view);

    // Doodad silhouettes: re-gather when the hero crosses a bucket, the
    // doodad list changes (identity/length/rev), or the reach outgrows the
    // last sweep. Between rebuilds this costs nothing per frame.
    const bx = Math.floor(p.x / GATHER_BUCKET), by = Math.floor(p.y / GATHER_BUCKET);
    if (bx !== this.dooBx || by !== this.dooBy || view.doodadRev !== this.dooRev
      || view.doodads !== this.dooArr || view.doodads.length !== this.dooLen
      || this.radius > this.dooR || heroLifted || nbChanged) {
      this.gatherDoodads(view);
      this.dooBx = bx; this.dooBy = by; this.dooRev = view.doodadRev;
      this.dooArr = view.doodads; this.dooLen = view.doodads.length;
      this.dooR = this.radius + GATHER_PAD;
    }

    // The hull set: a change (a roof lifting as the hero steps in, a fresh
    // zone's structures) re-extracts — the concealed cells read solid below.
    let ck = '';
    for (const r of concealed) ck += `${r.x},${r.y},${r.w},${r.h};`;
    const hullChanged = ck !== this.concealKey;
    this.concealed = concealed;
    this.concealKey = ck;

    // Wall faces: re-extract when the hero crosses a GRID cell bucket, the
    // grid repaints (doors, terraforms, hollows — GridWalkField.version),
    // or the hull set changes.
    const g = view.walk instanceof GridWalkField ? view.walk : null;
    if (g) {
      const gbx = Math.floor(p.x / g.cellSize), gby = Math.floor(p.y / g.cellSize);
      if (g !== this.gridRef || gbx !== this.gridBx || gby !== this.gridBy
        || g.version !== this.gridV || this.radius > this.gridR || hullChanged
        || heroLifted || nbChanged) {
        this.extractEdges(g);
        this.gridRef = g; this.gridBx = gbx; this.gridBy = gby;
        this.gridV = g.version; this.gridR = this.radius + GATHER_PAD;
      }
    } else if (this.gridRef) {
      // No active grid = no region veil at all (neighbor edges fold inside
      // extractEdges, so they stand down WITH it — and the query march
      // gates on gridRef the same way: drawn == tested in the degenerate).
      this.gridRef = null;
      this.edges.length = 0;
    }
  }

  /** Is this WORLD point under a standing roof (THE HULL LAW)? Solid to the
   *  extraction and the query alike while the roof stands. */
  private concealedAt(x: number, y: number): boolean {
    for (const r of this.concealed) {
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
    }
    return false;
  }

  /** Flatten every shadow-casting doodad in reach into discs/rects. */
  private gatherDoodads(view: SightView): void {
    const cfg = VIS_CFG.sightVeil;
    const reach = this.radius + GATHER_PAD;
    this.discs.length = 0;
    this.rects.length = 0;
    this.pierces.length = 0;
    const heroEye = this.heroT + LOS_CFG.elev.eye;
    for (const d of view.doodadsNear(this.px, this.py, reach)) {
      const dx = d.pos.x - this.px, dy = d.pos.y - this.py;
      if (dx * dx + dy * dy > reach * reach) continue;
      // THE ELEVATION LAW: a body occludes (and pierces) only the story
      // whose air it fills — deck furniture never shades the street below,
      // and a butte hero sees clean over the valley's trunks.
      const dT = d.tier ?? 0;
      if (heroEye < dT || heroEye >= dT + LOS_CFG.elev.doodadBand) continue;
      // Interactable reveals gather regardless of shadow policy (doors cast
      // nothing — the GRID owns their shadow — yet must pierce it).
      const vp = doodadRuleOf(d.kind).veilPierce;
      if (vp) {
        const spec = vp === true ? undefined : vp;
        this.pierces.push({
          x: d.pos.x, y: d.pos.y,
          r: spec?.radius ?? cfg.pierceRadius,
          s: Math.max(0, Math.min(1, spec?.strength ?? cfg.pierceStrength)),
        });
      }
      const sf = sightShadowFrac(d);
      if (sf <= 0) continue;
      const s = hitSurfaceOf(d, 'shot');
      if (s.kind === 'circle') {
        if (s.r > 0.5) this.discs.push({ x: d.pos.x, y: d.pos.y, r: s.r, s: sf });
      } else if (s.kind === 'multi') {
        for (const q of s.parts) {
          if (q.r > 0.5) this.discs.push({ x: d.pos.x + q.dx, y: d.pos.y + q.dy, r: q.r, s: sf });
        }
      } else {
        this.rects.push({
          x: d.pos.x, y: d.pos.y, hw: s.hw, hh: s.hh, rot: s.rot ?? 0,
          boundR: Math.hypot(s.hw, s.hh), s: sf,
        });
      }
    }
    // THE CROSS-BORDER GATHER: resident neighbors' bodies join the live set
    // at the SAME center-distance reach the active sweep used, translated
    // by their seat offsets (memo holds each zone whole at mint grain; this
    // fold is the only per-gather cost, and it runs at bucket cadence).
    for (const nb of this.nbs) {
      const m = nb.memo;
      const ex = this.px - nb.dx, ey = this.py - nb.dy; // the eye, neighbor-local
      for (const c of m.discs) {
        const dx = c.x - ex, dy = c.y - ey;
        if (dx * dx + dy * dy > reach * reach) continue;
        this.discs.push({ x: c.x + nb.dx, y: c.y + nb.dy, r: c.r, s: c.s });
      }
      for (const r of m.rects) {
        const dx = r.x - ex, dy = r.y - ey;
        if (dx * dx + dy * dy > reach * reach) continue;
        this.rects.push({ x: r.x + nb.dx, y: r.y + nb.dy, hw: r.hw, hh: r.hh,
          rot: r.rot, boundR: r.boundR, s: r.s });
      }
      for (const q of m.pierces) {
        const dx = q.x - ex, dy = q.y - ey;
        if (dx * dx + dy * dy > reach * reach) continue;
        this.pierces.push({ x: q.x + nb.dx, y: q.y + nb.dy, r: q.r, s: q.s });
      }
    }
    // Backstop for pathological groves: keep the NEAREST bodies (the far
    // ones matter least — the per-frame far cull already skips any body
    // whose whole shadow lies past the veil radius, so by construction the
    // cap only ever drops OFF-SCREEN casters unless a grove packs more than
    // maxOccluders inside one screen). Runs over the cross-border union, so
    // a grove straddling a seam degrades exactly like a native one.
    if (this.discs.length > cfg.maxOccluders) {
      const px = this.px, py = this.py;
      this.discs.sort((a, b) =>
        ((a.x - px) ** 2 + (a.y - py) ** 2) - ((b.x - px) ** 2 + (b.y - py) ** 2));
      this.discs.length = cfg.maxOccluders;
    }
  }

  /** Extract the solid mass's facing edges (merged runs) within reach.
   *  Out-of-window and out-of-grid both read as SOLID, so no phantom edge
   *  ever appears at the sweep rim or the arena border. Resident neighbors'
   *  faces (THE CROSS-BORDER GATHER) fold in at the tail — even when the
   *  eye stands so deep in tissue that the active window is empty. */
  private extractEdges(g: GridWalkField): void {
    this.edges.length = 0;
    const cs = g.cellSize;
    const reach = this.radius + GATHER_PAD;
    const x0 = Math.max(0, Math.floor((this.px - reach) / cs));
    const x1 = Math.min(g.cols - 1, Math.floor((this.px + reach) / cs));
    const y0 = Math.max(0, Math.floor((this.py - reach) / cs));
    const y1 = Math.min(g.rows - 1, Math.floor((this.py + reach) / cs));
    if (x1 >= x0 && y1 >= y0) {
      const w = x1 - x0 + 1, h = y1 - y0 + 1;
      const solid = new Uint8Array(w * h);
      const heroEye = this.heroT + LOS_CFG.elev.eye;
      for (let cy = y0; cy <= y1; cy++) {
        for (let cx = x0; cx <= x1; cx++) {
          const wx = (cx + 0.5) * cs, wy = (cy + 0.5) * cs;
          // The hull law: cells under a standing roof read solid from outside
          // — the structure is one opaque mass, and its doorways/slits spill
          // only as the roof yields. THE ELEVATION LAW: a blocking cell that
          // is tier FLOOR reads solid only to eyes below its deck.
          const sb = sightBlockOf(g.regionAt(wx, wy));
          if ((sb.b && (sb.e === null || heroEye < sb.e)) || this.concealedAt(wx, wy)) {
            solid[(cy - y0) * w + (cx - x0)] = 1;
          }
        }
      }
      SightVeil.mergeGridFaces(solid, w, h, x0, y0, cs, 1, this.edges);
    }
    // THE CROSS-BORDER GATHER: resident neighbors' wall faces join at the
    // same reach, by SEGMENT distance (a merged run's midpoint can stand far
    // beyond reach while its near end shadows the border — center distance
    // would drop the exact walls this lane exists to draw).
    for (const nb of this.nbs) {
      const ex = this.px - nb.dx, ey = this.py - nb.dy; // the eye, neighbor-local
      for (const e of nb.memo.edges) {
        const vx = e.bx - e.ax, vy = e.by - e.ay;
        const wx2 = ex - e.ax, wy2 = ey - e.ay;
        const l2 = vx * vx + vy * vy;
        let t = l2 > 0 ? (wx2 * vx + wy2 * vy) / l2 : 0;
        if (t < 0) t = 0; else if (t > 1) t = 1;
        const dx2 = wx2 - vx * t, dy2 = wy2 - vy * t;
        if (dx2 * dx2 + dy2 * dy2 > reach * reach) continue;
        this.edges.push({
          ax: e.ax + nb.dx, ay: e.ay + nb.dy,
          bx: e.bx + nb.dx, by: e.by + nb.dy, nx: e.nx, ny: e.ny,
        });
      }
    }
  }

  /** Merge a solid mask's facing edges into `out` — ONE merge law shared by
   *  the active window extraction and the neighbor whole-grid extraction,
   *  differing only in the boundary rule: `outside` is what beyond-mask
   *  reads as. 1 (solid) for the active window — no phantom edge at the
   *  sweep rim or the arena border; 0 (open) for a neighbor grid — its rim
   *  walls are watched from OUTSIDE and must cast over their own interior
   *  (see buildNbMemo). Mask coords are cells; (x0,y0) the mask's cell
   *  offset; emitted edges are px. */
  private static mergeGridFaces(solid: Uint8Array, w: number, h: number,
    x0: number, y0: number, cs: number, outside: 0 | 1, out: OccEdge[]): void {
    const solidAt = (wx: number, wy: number): number =>
      wx < 0 || wy < 0 || wx >= w || wy >= h ? outside : solid[wy * w + wx];
    // Horizontal faces (top: outward −y; bottom: outward +y), merged per row.
    for (let wy = 0; wy < h; wy++) {
      for (const [dy, ny] of [[-1, -1], [1, 1]] as const) {
        let run = -1;
        for (let wx = 0; wx <= w; wx++) {
          const face = wx < w && solid[wy * w + wx] === 1 && solidAt(wx, wy + dy) === 0;
          if (face && run < 0) run = wx;
          else if (!face && run >= 0) {
            const yEdge = (y0 + wy + (dy > 0 ? 1 : 0)) * cs;
            out.push({
              ax: (x0 + run) * cs, ay: yEdge,
              bx: (x0 + wx) * cs, by: yEdge, nx: 0, ny,
            });
            run = -1;
          }
        }
      }
    }
    // Vertical faces (left: outward −x; right: outward +x), merged per column.
    for (let wx = 0; wx < w; wx++) {
      for (const [dx, nx] of [[-1, -1], [1, 1]] as const) {
        let run = -1;
        for (let wy = 0; wy <= h; wy++) {
          const face = wy < h && solid[wy * w + wx] === 1 && solidAt(wx + dx, wy) === 0;
          if (face && run < 0) run = wy;
          else if (!face && run >= 0) {
            const xEdge = (x0 + wx + (dx > 0 ? 1 : 0)) * cs;
            out.push({
              ax: xEdge, ay: (y0 + run) * cs,
              bx: xEdge, by: (y0 + wy) * cs, nx, ny: 0,
            });
            run = -1;
          }
        }
      }
    }
  }

  /** THE VEIL ACROSS BORDERS — resolve this frame's resident-neighbor fold.
   *  Returns true when it CHANGED (admission/demotion/re-mint/rebase/a
   *  settled story), which forces both gathers. The steady frame is a
   *  handful of compares and zero allocation; discrete play (no seats, or
   *  the mode/dial off) resolves structurally empty. */
  private resolveNeighbors(view: SightView): boolean {
    const mints = view.seamlessMints;
    const zid = view.zone.id;
    let seats: SightView['seamlessRegions'];
    let ax = 0, ay = 0;
    if (VIS_CFG.sightVeil.crossBorder && view.seamless && mints && zid
      && view.seamlessRegions?.length) {
      // The active zone must hold a seat — without its origin, seat offsets
      // are unaddressable (seamlessDrawActive's own stand-down).
      for (const s of view.seamlessRegions) {
        if (s.zoneId === zid) { ax = s.originPx.x; ay = s.originPx.y; seats = view.seamlessRegions; break; }
      }
    }
    // First pass: does the standing fold still match? (allocation-free)
    let n = 0, same = true;
    if (seats && mints) {
      for (const s of seats) {
        if (s.zoneId === zid) continue;
        const mint = mints.get(s.zoneId);
        if (!mint) continue; // no mint = stand down (the body lane's rule)
        const cur = this.nbs[n++];
        if (!cur || cur.zoneId !== s.zoneId || cur.memo.mint !== mint
          || cur.memo.heroT !== this.heroT
          || cur.dx !== s.originPx.x - ax || cur.dy !== s.originPx.y - ay) {
          same = false;
          break;
        }
      }
    }
    if (same && n === this.nbs.length) return false;
    // Rebuild the fold, reusing every memo whose (mint, story) still holds.
    this.nbs = [];
    if (seats && mints) {
      for (const s of seats) {
        if (s.zoneId === zid) continue;
        const mint = mints.get(s.zoneId);
        if (!mint) continue;
        this.nbs.push({
          zoneId: s.zoneId,
          dx: s.originPx.x - ax, dy: s.originPx.y - ay,
          memo: this.nbMemoFor(s.zoneId, mint),
        });
      }
    }
    // The working-set guard: the memo store never outgrows the resident
    // ring — demoted (or mode-dropped) zones prune here.
    if (this.nbMemo.size > this.nbs.length) {
      for (const id of [...this.nbMemo.keys()]) {
        if (!this.nbs.some(nb => nb.zoneId === id)) this.nbMemo.delete(id);
      }
    }
    return true;
  }

  private nbMemoFor(zoneId: string, mint: SeamlessVeilMint): NbMemo {
    const hit = this.nbMemo.get(zoneId);
    if (hit && hit.mint === mint && hit.heroT === this.heroT) return hit;
    const memo = this.buildNbMemo(mint);
    this.nbMemo.set(zoneId, memo);
    return memo;
  }

  /** Extract one resident neighbor's occluders WHOLE, neighbor-local — at
   *  MINT grain (re-runs only on a re-mint or a settled hero-story change,
   *  never per frame; the ring's own mint budget already paces admissions
   *  to one layout per beat, and this ride-along is a fraction of one).
   *  The flattening laws are the active gather's, verbatim (tier band,
   *  graded strength, shot surface, pierce rows) — with the two AWAY
   *  asymmetries: OUT-OF-GRID READS OPEN in the face merge (a neighbor is
   *  watched from OUTSIDE; with the active law's solid-outside its rim
   *  walls would never emit a boundary face and a walled zone would read
   *  lit through its own rampart — while an OPEN rim still emits nothing,
   *  so the border line itself casts no shadow: the veil answers walls,
   *  never administrative lines), and ROOFS ALWAYS CONCEAL (the hull law
   *  at away posture — nobody stands inside an away region, so every roof
   *  stands; its cells read solid to face merge and march alike). */
  private buildNbMemo(mint: SeamlessVeilMint): NbMemo {
    const cfg = VIS_CFG.sightVeil;
    const heroEye = this.heroT + LOS_CFG.elev.eye;
    const roofs: { x: number; y: number; w: number; h: number }[] = [];
    for (const st of mint.layout.structures ?? []) for (const r of st.roofs) roofs.push(r);
    const memo: NbMemo = {
      mint, heroT: this.heroT, grid: null, gw: 0, gh: 0, roofs,
      edges: [], discs: [], rects: [], pierces: [],
    };
    for (const d of mint.layout.doodads) {
      if (d.gone) continue; // evaporated remains in a memory-carried layout
      const dT = d.tier ?? 0;
      if (heroEye < dT || heroEye >= dT + LOS_CFG.elev.doodadBand) continue;
      const vp = doodadRuleOf(d.kind).veilPierce;
      if (vp) {
        const spec = vp === true ? undefined : vp;
        memo.pierces.push({
          x: d.pos.x, y: d.pos.y,
          r: spec?.radius ?? cfg.pierceRadius,
          s: Math.max(0, Math.min(1, spec?.strength ?? cfg.pierceStrength)),
        });
      }
      const sf = sightShadowFrac(d);
      if (sf <= 0) continue;
      const s = hitSurfaceOf(d, 'shot');
      if (s.kind === 'circle') {
        if (s.r > 0.5) memo.discs.push({ x: d.pos.x, y: d.pos.y, r: s.r, s: sf });
      } else if (s.kind === 'multi') {
        for (const q of s.parts) {
          if (q.r > 0.5) memo.discs.push({ x: d.pos.x + q.dx, y: d.pos.y + q.dy, r: q.r, s: sf });
        }
      } else {
        memo.rects.push({
          x: d.pos.x, y: d.pos.y, hw: s.hw, hh: s.hh, rot: s.rot ?? 0,
          boundR: Math.hypot(s.hw, s.hh), s: sf,
        });
      }
    }
    const g = mint.layout.walk instanceof GridWalkField ? mint.layout.walk : null;
    if (g) {
      memo.grid = g;
      memo.gw = g.cols * g.cellSize;
      memo.gh = g.rows * g.cellSize;
      const cs = g.cellSize;
      const solid = new Uint8Array(g.cols * g.rows);
      for (let cy = 0; cy < g.rows; cy++) {
        for (let cx = 0; cx < g.cols; cx++) {
          const wx = (cx + 0.5) * cs, wy = (cy + 0.5) * cs;
          const sb = sightBlockOf(g.regionAt(wx, wy));
          if ((sb.b && (sb.e === null || heroEye < sb.e))
            || SightVeil.nbRoofAt(roofs, wx, wy)) {
            solid[cy * g.cols + cx] = 1;
          }
        }
      }
      SightVeil.mergeGridFaces(solid, g.cols, g.rows, 0, 0, cs, 0, memo.edges);
    }
    return memo;
  }

  /** Is this NEIGHBOR-LOCAL point under one of the mint's roofs? (The away
   *  hull — see buildNbMemo.) */
  private static nbRoofAt(roofs: readonly { x: number; y: number; w: number; h: number }[],
    x: number, y: number): boolean {
    for (const r of roofs) {
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
    }
    return false;
  }

  /** How occluded a WORLD point is from the hero's eye (0 clear .. 1 fully
   *  hidden) — the label pass multiplies its reveal through this, exactly
   *  the roomVeil.veiledAt contract. Tested against the SAME cached
   *  occluders — same graded strengths, same far cull, same shadow lengths —
   *  the sheet draws, so text and pixels can never disagree.
   *  THE ELEVATION LAW: `targetElev` is the queried thing's STORY (an
   *  actor's tier — actorShade passes it); omitted, the point reads the
   *  floor it sits on. The region march lerps eye→target height exactly
   *  like castRay, so a rim-stander pokes above the cliff darkness while a
   *  deep-bench body stays honestly hidden. */
  occludedAt(pos: Pt, targetElev?: number): number {
    if (!this.active) return 0;
    const px = this.px, py = this.py;
    const qx = pos.x - px, qy = pos.y - py;
    const len2 = qx * qx + qy * qy;
    if (len2 < 1) return 0;
    let f = 0;
    if (this.doodadF > 0) {
      const len = Math.sqrt(len2);
      for (const c of this.discs) {
        const v = this.doodadF * c.s;
        if (v <= f) continue;
        const bd = Math.hypot(c.x - px, c.y - py);
        // The drawn pass's own guards, mirrored exactly: a body whose whole
        // shadow lies past the veil radius casts nothing; a point past a
        // body's shadow length reads clear of THAT body.
        if (bd - c.r > this.radius) continue;
        if (len > bd + castLen(c.r, c.s)) continue;
        if (segHitsCircle(px, py, qx, qy, len2, c.x, c.y, c.r)) {
          f = v;
          if (f >= this.doodadF) break;
        }
      }
      if (f < this.doodadF) {
        for (const r of this.rects) {
          const v = this.doodadF * r.s;
          if (v <= f) continue;
          const bd = Math.hypot(r.x - px, r.y - py);
          if (bd - r.boundR > this.radius) continue;
          if (len > bd + castLen(r.boundR, r.s)) continue;
          // Broad phase at the bounding circle, then THE EXACT SLAB: the
          // drawn wedge walks the TRUE oriented corners (rectShadowPath),
          // so the query must test the same slab. The circle verdict alone
          // reported "hidden" over ground nothing painted — worst on long
          // thin slabs at 45° (wall runs, plank spans, wreck hulls), where
          // boundR sweeps a disc the body fills a sliver of.
          if (segHitsCircle(px, py, qx, qy, len2, r.x, r.y, r.boundR)
            && segHitsOBB(px, py, qx, qy, r)) {
            f = v;
            if (f >= this.doodadF) break;
          }
        }
      }
    }
    if (this.regionF > f && this.gridRef) {
      // Half-cell march, start cell excused — the castRay grid idiom. The
      // hull law joins the march exactly as it joins the extraction; THE
      // ELEVATION LAW lerps the ray's height eye → target (castRay's rule).
      const g = this.gridRef;
      const len = Math.sqrt(len2);
      const step = g.cellSize / 2;
      const limit = Math.min(len, this.radius);
      const eye = LOS_CFG.elev.eye;
      const hFrom = this.heroT + eye;
      if (!this.nbs.length) {
        // Discrete play (and the dial off): today's march, verbatim —
        // regionAt's out-of-grid 'wall' answer included (nothing stands
        // past a discrete zone's rim for it to misread).
        const hTo = (targetElev ?? (tierElevOf(g.regionAt(pos.x, pos.y)) ?? 0)) + eye;
        for (let s = step; s < limit; s += step) {
          const t = s / len;
          const wx = px + qx * t, wy = py + qy * t;
          const sb = sightBlockOf(g.regionAt(wx, wy));
          if ((sb.b && (sb.e === null || hFrom + (hTo - hFrom) * t < sb.e))
            || this.concealedAt(wx, wy)) {
            f = this.regionF;
            break;
          }
        }
      } else {
        // THE SEAMLESS MARCH (the veil across borders): every sample reads
        // the grid that OWNS its ground — the active grid inside its own
        // extent (today's law verbatim), a resident neighbor's grid inside
        // its span at the seat offset (its roofs conceal — the away hull),
        // and NO grid (the connective tissue) reads OPEN: away open ground
        // contributes no occlusion. Beyond-extent samples no longer take
        // regionAt's out-of-grid 'wall' answer — that read darkened the
        // whole neighbor country (the administrative sweep this lane kills).
        const gw = g.cols * g.cellSize, gh = g.rows * g.cellSize;
        const hTo = (targetElev ?? this.floorElevAt(pos.x, pos.y, g, gw, gh)) + eye;
        for (let s = step; s < limit; s += step) {
          const t = s / len;
          const wx = px + qx * t, wy = py + qy * t;
          const rayH = hFrom + (hTo - hFrom) * t;
          let hit = false;
          if (wx >= 0 && wy >= 0 && wx < gw && wy < gh) {
            const sb = sightBlockOf(g.regionAt(wx, wy));
            hit = (sb.b && (sb.e === null || rayH < sb.e)) || this.concealedAt(wx, wy);
          } else {
            for (const nb of this.nbs) {
              const m = nb.memo;
              if (!m.grid) continue;
              const lx = wx - nb.dx, ly = wy - nb.dy;
              if (lx < 0 || ly < 0 || lx >= m.gw || ly >= m.gh) continue;
              const sb = sightBlockOf(m.grid.regionAt(lx, ly));
              hit = (sb.b && (sb.e === null || rayH < sb.e))
                || SightVeil.nbRoofAt(m.roofs, lx, ly);
              break; // spans tile without overlap (the partition law)
            }
          }
          if (hit) {
            f = this.regionF;
            break;
          }
        }
      }
    }
    // The interactable reveals thin the answer exactly as they thin the
    // sheet (drawn==tested at the door's threshold).
    if (f > 0 && this.pierces.length) f *= 1 - this.pierceAt(pos.x, pos.y);
    return f;
  }

  /** The floor story a WORLD point sits on, routed by owning grid (the
   *  seamless march's hTo when the caller gave no story): the active grid
   *  inside its extent (today's read), a resident neighbor's inside its
   *  span, the tissue ground floor 0. */
  private floorElevAt(x: number, y: number, g: GridWalkField, gw: number, gh: number): number {
    if (x >= 0 && y >= 0 && x < gw && y < gh) return tierElevOf(g.regionAt(x, y)) ?? 0;
    for (const nb of this.nbs) {
      const m = nb.memo;
      if (!m.grid) continue;
      const lx = x - nb.dx, ly = y - nb.dy;
      if (lx < 0 || ly < 0 || lx >= m.gw || ly >= m.gh) continue;
      return tierElevOf(m.grid.regionAt(lx, ly)) ?? 0;
    }
    return 0;
  }

  /** The reveal fraction at a point (0 none .. 1 fully pierced) — the linear
   *  falloff the punched radial gradient paints. */
  private pierceAt(x: number, y: number): number {
    let m = 0;
    for (const q of this.pierces) {
      const d = Math.hypot(q.x - x, q.y - y);
      if (d < q.r) {
        const v = q.s * (1 - d / q.r);
        if (v > m) m = v;
      }
    }
    return m;
  }

  /** A body's smoothed hide-fade (0 visible .. 1 gone): occludedAt chased at
   *  fadeRate × the actor-hide lever, per actor, self-collecting. A stale
   *  entry (off-screen a while, zone swap) SNAPS instead of replaying.
   *  Rides the body's own STORY (THE ELEVATION LAW), so a same-tier butte
   *  neighbor draws solid and a rim archer pokes above the cliff's dark. */
  actorShade(a: { pos: Pt; tier?: number }, dt: number): number {
    if (!this.active) return 0;
    const target = this.occludedAt(a.pos, a.tier ?? 0) * VIS_CFG.sightVeil.actorHide;
    let e = this.shades.get(a);
    if (!e) { e = { v: target, f: this.frame }; this.shades.set(a, e); return e.v; }
    if (e.f === this.frame) return e.v;
    e.v = this.frame - e.f > 3 ? target
      : e.v + (target - e.v) * Math.min(1, dt * VIS_CFG.sightVeil.fadeRate);
    e.f = this.frame;
    return e.v;
  }

  /** Build + composite the shadow sheet. Called mid-world-pass (the caller's
   *  transform is the world transform); composites at identity, projected
   *  through the same effective camera the light layer uses. Free when
   *  nothing in reach occludes. */
  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number,
    zoom: number, w: number, h: number): void {
    const cfg = VIS_CFG.sightVeil;
    if (!this.active) return;
    const regionA = cfg.alpha * this.regionF;
    const doodadA = cfg.alpha * this.doodadF;
    if (regionA <= 0.02 && doodadA <= 0.02) return;

    const px = this.px, py = this.py;
    const far = this.radius * cfg.farSlack;

    const scale = cfg.scale;
    const bw = Math.max(2, Math.ceil(w * scale)), bh = Math.max(2, Math.ceil(h * scale));
    if (!this.buf) {
      this.buf = document.createElement('canvas');
      this.bctx = this.buf.getContext('2d');
    }
    const b = this.bctx;
    if (!b) return;
    if (this.buf.width !== bw || this.buf.height !== bh) {
      this.buf.width = bw; this.buf.height = bh;
    }
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.globalCompositeOperation = 'source-over';
    b.clearRect(0, 0, bw, bh);
    const k = zoom * scale;
    const ox = camX, oy = camY;

    // --- build the shadow LAYERS (one Path2D per strength tier) -------------
    // Facing selection happens per frame (the caches hold BOTH facings so a
    // mid-cell hero move never pops a stale shadow).
    let quads = 0;
    const layers: { path: Path2D; alpha: number }[] = [];

    // True-wall shadows: one union path at the region strength (the facing
    // test + on-plane clamp live in edgeShadowForEye — see faceSlack).
    if (regionA > 0.02 && this.edges.length) {
      const path = new Path2D();
      let n = 0;
      for (const e of this.edges) {
        n += edgeShadowForEye(path, e, px, py, far, ox, oy, k);
      }
      if (n) { layers.push({ path, alpha: regionA }); quads += n; }
    }

    // Solid-body shadows: tangent wedges bucketed by their graded strength
    // (sightShadowFrac quantized upward to eighths — a zone of full-strength
    // bodies stays ONE layer; a town's soft props add one or two more).
    if (doodadA > 0.02 && (this.discs.length || this.rects.length)) {
      const buckets = new Map<number, { path: Path2D; n: number }>();
      const bucketOf = (s: number): { path: Path2D; n: number } => {
        const q = Math.min(1, Math.ceil(s * 8) / 8);
        let bk = buckets.get(q);
        if (!bk) { bk = { path: new Path2D(), n: 0 }; buckets.set(q, bk); }
        return bk;
      };
      for (const c of this.discs) {
        const bd = Math.hypot(c.x - px, c.y - py);
        // Far cull (mirrored in occludedAt): the whole wedge starts at the
        // body's silhouette — beyond the veil radius it can't touch a pixel.
        if (bd - c.r > this.radius) continue;
        const bk = bucketOf(c.s);
        bk.n += discShadowPath(bk.path, c.x, c.y, c.r, c.s, px, py, far, ox, oy, k);
      }
      for (const r of this.rects) {
        const bd = Math.hypot(r.x - px, r.y - py);
        if (bd - r.boundR > this.radius) continue;
        const bk = bucketOf(r.s);
        bk.n += rectShadowPath(bk.path, r, px, py, far, ox, oy, k);
      }
      for (const [q, bk] of buckets) {
        if (bk.n) { layers.push({ path: bk.path, alpha: doodadA * q }); quads += bk.n; }
      }
    }
    if (!quads) return;

    // --- fill ascending weak → strong: punch, then paint (max, never sum) ---
    layers.sort((a, b) => a.alpha - b.alpha);
    const t = cfg.tint;
    if (cfg.featherPx > 0) b.filter = `blur(${cfg.featherPx}px)`;
    for (const L of layers) {
      b.globalCompositeOperation = 'destination-out';
      b.fillStyle = 'rgba(0,0,0,1)';
      b.fill(L.path);
      b.globalCompositeOperation = 'source-over';
      b.fillStyle = `rgba(${t.r},${t.g},${t.b},${L.alpha.toFixed(3)})`;
      b.fill(L.path);
    }
    if (cfg.featherPx > 0) b.filter = 'none';

    // THE INTERACTABLE REVEALS (DoodadRule.veilPierce): punch a feathered
    // disc of visibility over each pierce doodad — a door must stay
    // discernible from the wall plane it shares. After every layer, so the
    // punch wins over any shadow family; occludedAt mirrors via pierceAt.
    if (this.pierces.length) {
      b.globalCompositeOperation = 'destination-out';
      for (const q of this.pierces) {
        const sx = (q.x - ox) * k, sy = (q.y - oy) * k, sr = q.r * k;
        if (sx < -sr || sy < -sr || sx > bw + sr || sy > bh + sr) continue;
        const grad = b.createRadialGradient(sx, sy, 0, sx, sy, sr);
        grad.addColorStop(0, `rgba(0,0,0,${q.s})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        b.fillStyle = grad;
        b.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
      }
    }
    b.globalCompositeOperation = 'source-over';

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.buf, 0, 0, bw, bh, 0, 0, w, h);
    ctx.restore();
    this.drew = true;
    this.drewW = w; this.drewH = h;
  }

  /** ROOFS WEAR THE VEIL: re-composite this frame's sheet clipped to the
   *  given WORLD-space rects (the caller's transform must be the world
   *  transform — drawRoofs'). The blit replays the mapping draw() used, so
   *  a roof's dark lands pixel-identical to the street's beside it and an
   *  occluded structure reads as ONE contiguous mass instead of a bright
   *  lid floating over its own shadow. Free when the sheet didn't draw. */
  compositeOver(ctx: CanvasRenderingContext2D,
    rects: readonly { x: number; y: number; w: number; h: number }[], alpha: number): void {
    if (!this.drew || !this.buf || alpha <= 0.02 || !rects.length) return;
    ctx.save();
    ctx.beginPath();
    for (const r of rects) ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.buf, 0, 0, this.buf.width, this.buf.height, 0, 0, this.drewW, this.drewH);
    ctx.restore();
  }
}

/** Append the far-boundary ARC between two eye-relative bearings (short way,
 *  θfrom → θto), one point per ≤ arcStep radians at radius R from the eye.
 *  This is what keeps a wide silhouette honest: a chord between the extreme
 *  far points sags toward the eye as the span approaches π (the wall-press
 *  inversion); the fan holds the boundary at full reach the whole way. */
function farArc(sink: PathSink, px: number, py: number, thFrom: number,
  thTo: number, R: number, ox: number, oy: number, k: number): void {
  let d = thTo - thFrom;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  const n = Math.ceil(Math.abs(d) / SIGHT_VEIL_GEO.arcStep);
  for (let i = 1; i < n; i++) {
    const th = thFrom + d * (i / n);
    sink.lineTo((px + Math.cos(th) * R - ox) * k, (py + Math.sin(th) * R - oy) * k);
  }
}

/** Append one edge-shadow polygon (A→B, far side swept as an eye-centered
 *  fan). Exported for the headless probe — the sheet fills this exact
 *  geometry. THE CORNER LIMIT: an eye standing ON an endpoint (pressed into
 *  a wall corner — grid collision carries the eye to the face line, so
 *  sliding along a wall crosses every run endpoint within a px) keeps the
 *  face: the push direction's limit is the edge's own line, so that
 *  direction is substituted instead of dropping the polygon. The old
 *  `la < 1 → skip` blinked the ENTIRE wall shadow off for a frame at every
 *  corner passed, and held it off while standing in the pocket — the
 *  durance/flesh "changes abruptly, reverts, changes again", and the corner
 *  that granted sight it must obscure. */
export function edgeShadowPath(sink: PathSink, ax: number, ay: number,
  bx2: number, by2: number, px: number, py: number, far: number,
  ox: number, oy: number, k: number): number {
  const dax = ax - px, day = ay - py;
  const dbx = bx2 - px, dby = by2 - py;
  const el = Math.hypot(bx2 - ax, by2 - ay);
  if (el < 0.5) return 0;                        // zero-length edge
  let la = Math.hypot(dax, day), lb = Math.hypot(dbx, dby);
  // Raw directions are numerically sound down to fractions of a px — an eye
  // rounding a free wall end honestly PEELS the far side fast (real corner
  // peeking), and freezing the direction near the endpoint would snap it
  // back in one frame instead. Only the measure-zero exact hit substitutes
  // the along-edge limit (an inner corner's other face covers its side via
  // faceSlack either way).
  let uax: number, uay: number, ubx: number, uby: number;
  if (la < 1e-4) { uax = (ax - bx2) / el; uay = (ay - by2) / el; la = 1e-4; }
  else { uax = dax / la; uay = day / la; }
  if (lb < 1e-4) { ubx = (bx2 - ax) / el; uby = (by2 - ay) / el; lb = 1e-4; }
  else { ubx = dbx / lb; uby = dby / lb; }
  const fax = ax + uax * far, fay = ay + uay * far;
  const fbx = bx2 + ubx * far, fby = by2 + uby * far;
  sink.moveTo((ax - ox) * k, (ay - oy) * k);
  sink.lineTo((bx2 - ox) * k, (by2 - oy) * k);
  sink.lineTo((fbx - ox) * k, (fby - oy) * k);
  // Fan radius rides past both endpoint anchors so the swept boundary never
  // dips inside them; overshoot beyond `far` is invisible (far already
  // clears the screen by farSlack).
  const R = (far + Math.max(la, lb)) / Math.cos(SIGHT_VEIL_GEO.arcStep / 2);
  farArc(sink, px, py, Math.atan2(uby, ubx), Math.atan2(uay, uax), R, ox, oy, k);
  sink.lineTo((fax - ox) * k, (fay - oy) * k);
  sink.closePath();
  return 1;
}

/** Draw one wall FACE for a given eye — the facing law in one place, shared
 *  by draw() and the probe. A face the eye is honestly behind is skipped;
 *  an eye ON the plane (within faceSlack: pressed-collision jitter, corner
 *  pockets where the perpendicular face reads dot 0.00) is clamped half a
 *  px onto the OPEN side for this face's geometry instead of dropped — the
 *  strict `dot <= 0` skip was a knife's edge that blinked whole wall
 *  shadows frame to frame at contact. The clamp also pins the far fan's
 *  sweep to the correct half-plane when collision leaves the eye a
 *  sub-pixel INSIDE the face line. */
export function edgeShadowForEye(sink: PathSink, e: OccEdge, px: number,
  py: number, far: number, ox: number, oy: number, k: number): number {
  const dot = e.nx * (px - e.ax) + e.ny * (py - e.ay);
  if (dot <= -SIGHT_VEIL_GEO.faceSlack) return 0;
  if (dot < 0.5) {
    const push = 0.5 - dot;
    px += e.nx * push; py += e.ny * push;
  }
  return edgeShadowPath(sink, e.ax, e.ay, e.bx, e.by, px, py, far, ox, oy, k);
}

/** Append a disc body's shadow wedge: tangent mouth, body-scaled reach
 *  (castLen × the graded strength), far side fanned at the reach arc. MELT:
 *  reach fades across the last few px of surface distance, so a displaced
 *  eye entering the body never pops the wedge — as d → r the tangent mouth
 *  and the reach both collapse. Exported for the headless probe. */
export function discShadowPath(sink: PathSink, cx: number, cy: number,
  r: number, s: number, px: number, py: number, far: number,
  ox: number, oy: number, k: number): number {
  const dx = cx - px, dy = cy - py;
  const d2 = dx * dx + dy * dy;
  if (d2 <= r * r + 1) return 0;   // the eye is inside the body
  const d = Math.sqrt(d2);
  const melt = Math.min(1, (d - r) / SIGHT_VEIL_GEO.surfaceFeather);
  if (melt <= 0) return 0;
  const reach = Math.min(far, d + castLen(r, s)) * melt;
  const sin = r / d, cos = Math.sqrt(Math.max(0, 1 - sin * sin));
  const L = d * cos;
  if (reach <= L + 0.5) return 0;  // fully melted: the wedge has no length left
  const ux = dx / d, uy = dy / d;
  const t1x = ux * cos - uy * sin, t1y = ux * sin + uy * cos;
  const t2x = ux * cos + uy * sin, t2y = -ux * sin + uy * cos;
  sink.moveTo((px + t1x * L - ox) * k, (py + t1y * L - oy) * k);
  sink.lineTo((px + t2x * L - ox) * k, (py + t2y * L - oy) * k);
  sink.lineTo((px + t2x * reach - ox) * k, (py + t2y * reach - oy) * k);
  farArc(sink, px, py, Math.atan2(t2y, t2x), Math.atan2(t1y, t1x), reach, ox, oy, k);
  sink.lineTo((px + t1x * reach - ox) * k, (py + t1y * reach - oy) * k);
  sink.closePath();
  return 1;
}

/** Append an oriented-rect body's shadow: the two bearing-extreme corners
 *  from the eye pushed to a body-scaled reach, far side fanned. MELT rides
 *  the eye's distance to the slab's SURFACE (the disc rule, oriented) — the
 *  old span-based melt engaged hw·tan(feather) px off any LONG face, i.e.
 *  at ordinary press distance against a wall slab. Exported for the probe. */
export function rectShadowPath(sink: PathSink, r: OccRectLike,
  px: number, py: number, far: number, ox: number, oy: number, k: number): number {
  const cos = Math.cos(r.rot), sin = Math.sin(r.rot);
  // Surface distance in the slab's local frame (0 inside).
  const rx = px - r.x, ry = py - r.y;
  const lx = rx * cos + ry * sin, ly = -rx * sin + ry * cos;
  const ddx = Math.max(0, Math.abs(lx) - r.hw), ddy = Math.max(0, Math.abs(ly) - r.hh);
  const sd = Math.hypot(ddx, ddy);
  const melt = Math.min(1, sd / SIGHT_VEIL_GEO.surfaceFeather);
  if (melt <= 0) return 0;         // the eye is inside (or on) the slab
  const base = Math.atan2(r.y - py, r.x - px);
  let minD = Infinity, maxD = -Infinity;
  let minX = 0, minY = 0, maxX = 0, maxY = 0;
  for (let i = 0; i < 4; i++) {
    const sx = i & 1 ? r.hw : -r.hw, sy = i & 2 ? r.hh : -r.hh;
    const cx = r.x + sx * cos - sy * sin, cy = r.y + sx * sin + sy * cos;
    let d = Math.atan2(cy - py, cx - px) - base;
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    if (d < minD) { minD = d; minX = cx; minY = cy; }
    if (d > maxD) { maxD = d; maxX = cx; maxY = cy; }
  }
  if (maxD - minD >= Math.PI) return 0;   // degenerate (eye on a face plane)
  const reach = Math.min(far, Math.hypot(r.x - px, r.y - py) + castLen(r.boundR, r.s)) * melt;
  return edgeShadowPath(sink, minX, minY, maxX, maxY, px, py, reach, ox, oy, k);
}

/** The rect fields the shadow builder needs (structural, for the probe). */
export interface OccRectLike {
  x: number; y: number; hw: number; hh: number; rot: number; boundR: number; s: number;
}

/** Does the segment (P → P+Q, squared length len2) cross the circle? The
 *  occlusion test the queries share with the drawn wedges. */
function segHitsCircle(px: number, py: number, qx: number, qy: number,
  len2: number, cx: number, cy: number, r: number): boolean {
  const wx = cx - px, wy = cy - py;
  let t = (wx * qx + wy * qy) / len2;
  if (t < 0) t = 0; else if (t > 1) t = 1;
  const dx = wx - qx * t, dy = wy - qy * t;
  return dx * dx + dy * dy < r * r;
}

/** Does the segment (P → P+Q) cross the oriented slab? The EXACT rect
 *  mirror of segHitsCircle: the segment enters the slab's local frame
 *  through the SAME rotation rectShadowPath spins its corners by (and the
 *  melt measures surface distance in), then a standard slab clip walks
 *  both axes. Runs only behind the boundR broad phase. */
function segHitsOBB(px: number, py: number, qx: number, qy: number,
  r: { x: number; y: number; hw: number; hh: number; rot: number }): boolean {
  const cos = Math.cos(r.rot), sin = Math.sin(r.rot);
  const sx = px - r.x, sy = py - r.y;
  const lx = sx * cos + sy * sin, ly = -sx * sin + sy * cos;
  const dx = qx * cos + qy * sin, dy = -qx * sin + qy * cos;
  let t0 = 0, t1 = 1;
  // X slab, then Y slab (unrolled — this sits on the per-query hot path).
  if (Math.abs(dx) < 1e-9) {
    if (Math.abs(lx) > r.hw) return false;
  } else {
    let ta = (-r.hw - lx) / dx, tb = (r.hw - lx) / dx;
    if (ta > tb) { const t = ta; ta = tb; tb = t; }
    if (ta > t0) t0 = ta;
    if (tb < t1) t1 = tb;
    if (t0 > t1) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (Math.abs(ly) > r.hh) return false;
  } else {
    let ta = (-r.hh - ly) / dy, tb = (r.hh - ly) / dy;
    if (ta > tb) { const t = ta; ta = tb; tb = t; }
    if (ta > t0) t0 = ta;
    if (tb < t1) t1 = tb;
    if (t0 > t1) return false;
  }
  return true;
}
