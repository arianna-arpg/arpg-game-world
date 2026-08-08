// ---------------------------------------------------------------------------
// THE PUZZLE FABRIC — activity riddles as data.
//
// A puzzle is a small machine of STRUCK FIXTURES: crystal bodies (ordinary
// passive monster defs — they reach resolveHit like anything else, so every
// delivery in the game can play them: arcs, arrows, novas, minions) wired to
// a PUZZLE RUN that a registered KIND drives. Seven kinds ship here; the
// registry is open — a package or future biome adds a kind + a spec row and
// the placer, HUD, objective plumbing and reward lane all follow.
//
//   • lattice — the lights-out grid: striking a crystal TOGGLES it and its
//     orthogonal neighbors between kindled (lightning tone) and dark
//     (ground state). Kindle the whole lattice. Scrambled at boot by
//     simulated strikes from the solved board, so every board is solvable.
//   • refrain — the singing ring: the zone PLAYS a sequence of chimes,
//     then listens. Answer the crystals in the order shown; a wrong note
//     falters and the refrain plays again.
//   • chord — the attunement riddle (rides the attunement fabric,
//     engine/tuning.ts): a locked HEART holds a rolled tone; strike the
//     ring's crystals with matching damage until every voice joins the
//     chord. The heartless 'shatter' variant boots the ring mistuned and
//     asks for silence — batter every crystal back to physical.
//   • tempo — the rising measure: every voice pulses on its own period
//     from one synced opening bar; strike them slowest first, fastest
//     last. The order is READ off the world, never memorized — a wrong
//     voice breaks the measure and re-syncs the bar for a fresh read.
//   • accord — the twin voices: opposite seats share a color; ring BOTH
//     halves of a pair inside the linger window to bind it. The shipped
//     spill:'all' consumer — one wide blow through the ring can bind a
//     pair whole, and walking between partners solves it just as truly.
//   • ember — the tended ring: a struck coal stays alight for its gutter
//     window; have EVERY coal alight at once. No falter, no clock but the
//     coals' own — patience circles, breadth blazes.
//   • iceslide — the pushed block (the Zelda ice-court law): strike a loose
//     block and it SLIDES on the blow's axis, grid-true, stopping only
//     against a stopper stone or its kin (THE CATCH LAW: a push with
//     nothing to catch it refuses — no invisible walls, no runaway ice).
//     Seat every block on its drawn goal socket. Boards deal by REVERSE
//     MOVES from the solved pose and an exhaustive reachability proof
//     rejects any deal with a trappable line — solvable BY CONSTRUCTION.
//
// The lattice also takes a FORMAT (LATTICE_FORMATS, spec.format): the same
// lights-out law on shaped courts — a wheel, a cross, a diamond, a gapped
// board — each a data row carrying its own seats + neighbor map. Formats
// re-seat the placer's minted line at boot; formatless boards are untouched.
//
// Placement happens at ZONE LOAD (World's puzzle placer), never at
// generation: no genqa surface, no layout-rng movement — the same salted
// discipline fog banks and creep pockets follow. Specs are authored in
// src/data/puzzles.ts (PUZZLES) and rolled per zone from TilesetDef.puzzles
// rows or pinned by a zone's `puzzle` OBJECTIVE (zones.ts).
//
// STRIKE ROUTING obeys THREE LAWS, each a data dial (spec → kind →
// PUZZLE_CFG) so every build's delivery answers honestly:
//   • THE KNOCK LAW (`knock`) — a node answers the KNOCK, never the wound:
//     any LANDED damaging blow rings it, however mitigated (a full septic
//     forgo, a shield's soak, an invulnerable fixture's 'immune'). Evades
//     and blocks stay refusals — those never connected. DoT ticks never
//     knock: the ache is not a blow, and a wrong-node bleed must not
//     falter a song every tick.
//   • THE SPILL LAW (`spill`) — one blow rings ONE bell: when a single
//     blow (same striker, same instant) knocks several of a run's nodes —
//     a scaled cleave arc, melee reverb, a nova across the ring — only the
//     node best aligned with the striker's facing is judged; the rest is
//     spill. Without it, arc order (ring index, not aim) decides the note.
//   • THE HUM (`hum`) — a just-judged node swallows repeat knocks (echo
//     re-strikes, multistrike double-taps read as ONE knock) until a
//     DIFFERENT node rings or the hum fades. Structurally safe for the
//     refrain: its sequence never asks the same note twice in a row, so a
//     repeat inside the hum can never be the intended next answer.
//
// Kinds speak to the world through the narrow PuzzleHost — flashes, text,
// dressings, completion — so this module never imports World, and a kind
// can be unit-probed against a stub host.
// ---------------------------------------------------------------------------

import type { Vec2 } from '../core/math';
import { angleDiff, angleTo, dist, vec } from '../core/math';
import type { Actor } from './actor';
import type { DamageType } from './stats';
import { ELEMENTAL_TYPES } from './stats';

/** An authored, hand-pinned ice-slide board (probe rigs + future set-piece
 *  courts): explicit cells as [x, y]. A pin is the author's word — boot
 *  verifies it and WARNS on a dishonest deal, but stands it as written. */
export interface IceSlideBoard {
  /** Board dims [w, h] in cells. */
  board: [number, number];
  /** Stopper stones. blocks.length + rocks.length must equal the run's
   *  minted node census (spec.grid[0]) — a mismatch discards the pin. */
  rocks: [number, number][];
  /** Pushable blocks (node idx 0..blocks-1 wear the ice dress). */
  blocks: [number, number][];
  /** Goal seats, one per block (drawn as the pulsing want). */
  sockets: [number, number][];
}

/** What a RESOLVED riddle pays (World.completePuzzle) — every lane optional,
 *  lanes compose when several are named:
 *    • `cast` — free-cast a catalog skill at the site (the flourish).
 *    • `gems` — N draws of the classic gem droplet (world.dropGemAt), the
 *      fabric's founding coin, kept verbatim for byte-compat.
 *    • `washFor` — a generous parting wash of the finishing tone over the
 *      solver's side (the puzzle pays in the fabric's own coin; never loot,
 *      so it fires even on sealed ground).
 *    • `table` — THE DIVERSIFIED POUR: resolve this LOOT TABLE id
 *      (data/loottables.ts through engine/loot.ts — the standing nestable
 *      drop fabric) at the site and land the results through the ordinary
 *      drop primitives. Themed grave-goods, deepwinter kit, forge spoils
 *      are one table id here — never a bespoke payout path. UNOWED by law:
 *      a riddle pays of the ground underfoot, not of a writ, so sealed
 *      (spoils 'none') ground refuses the mint exactly like the gem lane.
 *  Resolution is spec → kind (puzzleRewardOf), WHOLE-ROW — see the dial. */
export interface PuzzleRewardSpec {
  cast?: string;
  gems?: number;
  washFor?: number;
  table?: string;
}

/** An authored puzzle (data/puzzles.ts) — everything the placer + kind read. */
export interface PuzzleSpec {
  /** PUZZLE_KINDS id. */
  kind: string;
  /** Node fixture def (default: the kind's nodeMonster). */
  node?: string;
  /** Heart fixture def (chord; default: the kind's heartMonster).
   *  `false` = heartless (the shatter variant's fixed goal). */
  heart?: string | false;
  /** lattice: board dims [w, h] (default [3, 3]). For a SHAPED court
   *  (`format`) pin this via latticeFormatGrid(id) — the squarest ≥2×2
   *  rect whose PRODUCT is the format's census; the placer's rect is
   *  scaffolding (boot re-seats every node) and its reserved footprint
   *  covers the drawn spread. iceslide: the same product law — grid is
   *  the whole fixture budget (blocks + stones), both dims ≥ 2, and the
   *  rect's reserve covers the rink (max board dim ≤ max grid dim + 3
   *  at the house pitch — probe-pinned). */
  grid?: [number, number];
  /** lattice: a LATTICE_FORMATS id — the same lights-out law on a shaped
   *  court (wheel / cross / diamond / gapped). Absent = the plain
   *  rectangle, byte-identical to the pre-format law. */
  format?: string;
  /** iceslide: rink dims [w, h] in cells (default ICESLIDE_CFG.board). */
  board?: [number, number];
  /** iceslide: pushable-block count band (default ICESLIDE_CFG.blocks;
   *  clamped so every block keeps a catch stone — blocks ≤ bodies / 2). */
  blocks?: [number, number];
  /** iceslide: reverse-move scramble band rolled at boot (default
   *  ICESLIDE_CFG.shuffle) — the lattice scramble law's sibling. */
  shuffle?: [number, number];
  /** iceslide: a hand-authored board (probes, set-piece courts) — skips
   *  generation; verified, warned about if dishonest, stood as written. */
  pinned?: IceSlideBoard;
  /** ring kinds: node count band (default per kind). */
  count?: [number, number];
  /** refrain: notes in the sequence (band; default [4, 6]). */
  rounds?: [number, number];
  /** refrain: seconds between played notes (default 0.85). */
  beat?: number;
  /** refrain: answer seconds granted PER NOTE — pooled into ONE window for
   *  the whole answer (window × notes; default 8 — a puzzle, not a reflex
   *  test); dawdling past the pool replays the song. */
  window?: number;
  /** lattice: scramble strikes band rolled at boot (default [3, 6]). */
  scramble?: [number, number];
  /** chord: the heart's tone pool (default the three elements). The
   *  heartless variant reads tones[0] as the fixed goal — and the accord
   *  draws each PAIR's shared color from the same pool. */
  tones?: DamageType[];
  /** tempo: the slowest voice's seconds-per-pulse (default 2.4). */
  period?: number;
  /** tempo: per-rank period cut in seconds (default 0.35) — each rank up
   *  pulses this much sooner; the fastest voice floors at the kind's min. */
  step?: number;
  /** accord: seconds a lone rung voice holds for its partner (default 3).
   *  The worn kindle IS this window — drawn == tested. */
  linger?: number;
  /** ember: seconds a struck coal stays alight before guttering (default 7). */
  gutter?: number;
  /** Whose strikes the kind counts (default: the kind's own doctrine). */
  who?: 'player' | 'any';
  /** THE KNOCK LAW: what rings a node (default PUZZLE_CFG.knock). 'landed'
   *  counts any landed damaging blow, however mitigated — a fully-forgone
   *  septic hit, a soaked-to-zero strike, an invulnerable fixture's
   *  'immune' all knock; 'wounding' demands the life bar actually moved. */
  knock?: 'landed' | 'wounding';
  /** THE SPILL LAW: one blow, one bell (default PUZZLE_CFG.spill). 'aim'
   *  collapses a single blow's multi-node strikes to the node best aligned
   *  with the striker's facing; 'all' lets a wide swing ring every bell it
   *  touched (a future gong-storm's fan-out). */
  spill?: 'aim' | 'all';
  /** THE HUM: seconds a just-judged node ignores repeat knocks (echo
   *  re-strikes, multistrike double-taps). Cleared early when any OTHER
   *  node rings; 0 disables. Default PUZZLE_CFG.hum. */
  hum?: number;
  /** Node spacing: grid cell pitch / ring radius (defaults per kind). */
  spacing?: number;
  /** Completion pay (PuzzleRewardSpec above; resolved spec → kind through
   *  puzzleRewardOf — absent on both levels, the resolve pays nothing but
   *  the objective lane, the standing law). */
  reward?: PuzzleRewardSpec;
  /** HUD noun ("the charged lattice"). Default per kind. */
  label?: string;
}

/** One live puzzle in the current zone (built by World's placer). */
export interface PuzzleRun {
  id: string;
  spec: PuzzleSpec;
  kind: PuzzleKindDef;
  at: Vec2;
  nodes: Actor[];
  heart?: Actor;
  /** Kind-owned scratch state (each kind documents its own shape). */
  state: Record<string, unknown>;
  /** THE HUM's ledger (engine-owned, never kind state): node actor id →
   *  world-time its hum fades. One acknowledged ring holds the hum; any
   *  OTHER node's ring clears the map (the structural discriminator). */
  hums: Map<number, number>;
  done: boolean;
  /** This run IS the zone objective (updateObjective watches it). */
  isObjective: boolean;
}

/** The narrow world surface kinds drive — World hands the placer one
 *  adapter; kinds never import World. */
export interface PuzzleHost {
  now(): number;
  rng(): number;
  flash(pos: Vec2, radius: number, color: string, life?: number): void;
  say(pos: Vec2, msg: string, color: string, size?: number): void;
  /** Set a puzzle-OWNED body's tone + worn dressing (the lattice's lit
   *  state rides the same status lane a real attunement does). */
  setTone(node: Actor, tone: DamageType): void;
  /** Blink a short-lived dressing on a node (refrain playback/answers). */
  kindle(node: Actor, seconds: number): void;
  /** Shed the kindled dressing (a faltered refrain goes dark). */
  quench(node: Actor): void;
  /** A hero (a real seat, not a minion) stands within `within` of pos. */
  heroNear(pos: Vec2, within: number): boolean;
  complete(run: PuzzleRun): void;
}

export interface PuzzleKindDef {
  id: string;
  /** Default fixture defs (data/monsters.ts). */
  nodeMonster: string;
  heartMonster?: string;
  /** Node geometry the placer lays: a centered grid or an even ring. */
  geometry: 'grid' | 'ring';
  /** Whose strikes count by default ('player' includes minions/allies —
   *  the SIDE, not the seat; 'any' lets the zone itself play). */
  who: 'player' | 'any';
  /** Kind-level routing-law defaults (spec rows override; PUZZLE_CFG
   *  backstops) — see the header's three laws. */
  knock?: 'landed' | 'wounding';
  spill?: 'aim' | 'all';
  hum?: number;
  /** Kind-level completion pay — the reward dial's fallback seat (a spec's
   *  own `reward` overrides it WHOLE; see puzzleRewardOf). */
  reward?: PuzzleRewardSpec;
  /** Default ring radius / grid pitch (spec.spacing overrides). */
  spacing: number;
  /** Default node count band for ring kinds. */
  count?: [number, number];
  /** Node-count GRAIN for ring kinds (default 1): the placer rounds the
   *  rolled count DOWN to this multiple (floor one grain), so a kind built
   *  of pairs (the accord's 2) or triads can never mint an orphan voice. */
  quantize?: number;
  label: string;
  boot(run: PuzzleRun, h: PuzzleHost): void;
  /** A qualifying landed hit on a node (resolveHit routes here). */
  struck?(run: PuzzleRun, node: Actor, h: PuzzleHost, striker: Actor | null): void;
  /** A node's TONE moved (the attunement fabric routes here — chord). */
  tuned?(run: PuzzleRun, node: Actor, h: PuzzleHost, tone: DamageType): void;
  tick?(run: PuzzleRun, h: PuzzleHost, dt: number): void;
  /** Dress the SOLVED end-state (zone memory re-entering a finished run:
   *  the lattice stands kindled, the chord holds — proof, not homework). */
  solved?(run: PuzzleRun, h: PuzzleHost): void;
  /** One HUD line (objectiveText / the zone panel). */
  status(run: PuzzleRun): string;
}

/** Open kind registry — engine kinds below; packages add their own. */
export const PUZZLE_KINDS: Record<string, PuzzleKindDef> = {};
export function registerPuzzleKind(def: PuzzleKindDef): void {
  PUZZLE_KINDS[def.id] = def;
}

/** THE PUZZLE tunables (World's placer + runtime). */
export const PUZZLE_CFG = {
  /** Placement stream salt over the zone seed (the fog-bank discipline —
   *  puzzles can never advance layout/spawn rng). */
  salt: 0x9c7a11,
  /** Most riddles a single zone stands up (objective one included). */
  maxPerZone: 2,
  /** Door clearance for a puzzle court (interactSpot's clear). */
  portalClear: 260,
  /** The preset a bare `puzzle` objective falls back to when the zone
   *  carries no puzzles rows of its own. */
  defaultPreset: 'great_chord',
  /** The short-blink display status refrain playback/answers wear. */
  kindleStatus: 'kindled',
  /** Playback earshot: a refrain sings only with someone to hear it. */
  earshot: 620,
  /** THE KNOCK LAW default: any landed damaging blow rings, however
   *  mitigated ('wounding' would demand a moved life bar). */
  knock: 'landed' as 'landed' | 'wounding',
  /** THE SPILL LAW default: one blow rings the bell it AIMED at. */
  spill: 'aim' as 'aim' | 'all',
  /** THE HUM default (seconds): swallows echo-family re-strikes and
   *  multistrike double-taps (all well inside a second) while any
   *  deliberate return to the same node — two answers minimum away in the
   *  refrain, a slow undo press on the lattice — either rings another
   *  node first (which clears the hum) or outlasts it. */
  hum: 0.9,
} as const;

/** THE ROUTING DIALS resolve spec → kind → config (the fabric's usual
 *  precedence); exported for World's drain and the probes. */
export function puzzleKnockOf(run: PuzzleRun): 'landed' | 'wounding' {
  return run.spec.knock ?? run.kind.knock ?? PUZZLE_CFG.knock;
}
export function puzzleSpillOf(run: PuzzleRun): 'aim' | 'all' {
  return run.spec.spill ?? run.kind.spill ?? PUZZLE_CFG.spill;
}
export function puzzleHumOf(run: PuzzleRun): number {
  return run.spec.hum ?? run.kind.hum ?? PUZZLE_CFG.hum;
}

/** THE REWARD DIAL resolves spec → kind, WHOLE-ROW: a level that names any
 *  reward owns the whole payout — fields never merge across levels, so a
 *  themed table can retire a kind's gems without a phantom residue. Absent
 *  on both = undefined, and the resolve pays nothing (the standing law for
 *  rewardless specs — byte-identical to the pre-lever world). No PUZZLE_CFG
 *  backstop on purpose: a config default would put pay under every future
 *  rewardless spec and break that law. Note the court-shrine wrapper
 *  REBINDS run.kind to its inner riddle at boot, so the kind seat here is
 *  the LIVE kind's — the riddle that actually ran is the one that pays. */
export function puzzleRewardOf(run: PuzzleRun): PuzzleRewardSpec | undefined {
  return run.spec.reward ?? run.kind.reward;
}

/** THE SPILL LAW's pick: of the nodes ONE blow struck, the bell the blow
 *  MEANT — best aligned with the striker's facing (a cleave answers where
 *  it swung, a nova where its caster faced), ties broken by distance, then
 *  by arrival order (deterministic). A striker-less knock keeps arrival
 *  order. Pure — the probes drive it bare. */
export function pickKnockNode(nodes: readonly Actor[], striker: Actor | null): Actor {
  if (nodes.length <= 1 || !striker) return nodes[0];
  let best = nodes[0];
  let bestAlign = Infinity;
  let bestDist = Infinity;
  for (const n of nodes) {
    const align = Math.abs(angleDiff(striker.facing, angleTo(striker.pos, n.pos)));
    const d = dist(striker.pos, n.pos);
    if (align < bestAlign - 1e-9
      || (Math.abs(align - bestAlign) <= 1e-9 && d < bestDist)) {
      best = n; bestAlign = align; bestDist = d;
    }
  }
  return best;
}

/** Roll an inclusive integer band with the host's rng. */
function rollBand(h: PuzzleHost, band: [number, number] | undefined, fallback: [number, number]): number {
  const [lo, hi] = band ?? fallback;
  return lo + Math.floor(h.rng() * (hi - lo + 1));
}

// --- LATTICE FORMATS (the board's SHAPE as data) -----------------------------
// The lights-out law is graph-blind: a strike flips a node + its NEIGHBORS,
// and scrambling by simulated strikes from solved keeps ANY board solvable —
// so the court's shape is pure data. A format row carries its drawn seats
// (pitch units around the court center) and its own neighbor map; the
// lattice boot re-seats the placer's minted line onto them (the court
// shrine's re-seat precedent) and swaps only the toggle's adjacency.
// Formatless presets never touch any of this — byte-identical, structurally.

export interface LatticeFormat {
  id: string;
  /** Node seats in PITCH units around the court center — the drawn board.
   *  Every seat must sit within (cells − 1) / 2 units so the preset's
   *  [cells, 1] grid pin (latticeFormatGrid) always over-reserves it. */
  seats: { x: number; y: number }[];
  /** The format's neighbor map: striking node i also flips adj[i]. */
  adj: number[][];
}

/** Open format registry — the four house shapes below; packages add rows. */
export const LATTICE_FORMATS: Record<string, LatticeFormat> = {};
export function registerLatticeFormat(f: LatticeFormat): void {
  LATTICE_FORMATS[f.id] = f;
}

/** A shaped preset's `grid` pin: the SQUAREST ≥2×2 rectangle whose product
 *  is the format's census — the placer mints exactly that many bodies (its
 *  seat rect is scaffolding; boot re-seats every node), the validator's
 *  rectangle sanity holds (2×2..5×5), and the rect's reserved footprint
 *  covers the drawn spread through the placer's own +90px grace (house
 *  formats keep their spread within it — probe-pinned). House censuses are
 *  COMPOSITE by design: a prime cell count could only pin [n, 1]. */
export function latticeFormatGrid(id: string): [number, number] {
  const n = Math.max(1, LATTICE_FORMATS[id]?.seats.length ?? 1);
  for (let b = Math.floor(Math.sqrt(n)); b >= 2; b--) {
    if (n % b === 0) return [n / b, b];
  }
  return [n, 1]; // a prime census — the validator will say so, loudly
}

/** Orthogonal adjacency among explicit seats (unit-spaced grids with holes —
 *  a missing cell simply breaks the neighborhood, no special casing). */
function orthoAdjOf(seats: { x: number; y: number }[]): number[][] {
  return seats.map((a, i) => seats.flatMap((z, j) => {
    if (j === i) return [];
    const dx = Math.abs(a.x - z.x), dy = Math.abs(a.y - z.y);
    return dx + dy > 0.99 && dx + dy < 1.01 && Math.min(dx, dy) < 0.01 ? [j] : [];
  }));
}

/** Center explicit grid points on their bounding box (the drawn court). */
function centeredSeats(pts: [number, number][]): { x: number; y: number }[] {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  return pts.map(p => ({ x: p[0] - cx, y: p[1] - cy }));
}

// THE WHEEL — ten voices on a circle; a strike rolls its two ring
// neighbors with it (the 3-flip drum). Radius in pitch units is a look
// dial: 1.9 × the lattice's 66px pitch ≈ the ring riddles' own court.
{
  const n = 10, r = 1.9; // ⚠ unblessed look numbers (batch-35 puzzle wave)
  const seats = Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  });
  registerLatticeFormat({
    id: 'wheel', seats,
    adj: seats.map((_, i) => [(i + n - 1) % n, (i + 1) % n]),
  });
}
// THE CROSS — nine cells in a plus; the center strike flips five, an arm's
// tip flips two. Reads at a glance as a waymark on the ground.
{
  const pts: [number, number][] = [
    [0, 0], [1, 0], [2, 0], [-1, 0], [-2, 0], [0, 1], [0, 2], [0, -1], [0, -2],
  ];
  const seats = centeredSeats(pts);
  registerLatticeFormat({ id: 'cross', seats, adj: orthoAdjOf(seats) });
}
// THE DIAMOND — twelve cells, |x| + |y| ≤ 2 with the heart left hollow: the
// rectangle turned on its point, corners pared to lone voices. (Twelve, not
// thirteen, on purpose: a prime census could not wear a validator-legal
// grid pin — and the hollow heart reads better anyway.)
{
  const pts: [number, number][] = [];
  for (let y = -2; y <= 2; y++) {
    for (let x = -2; x <= 2; x++) {
      const d = Math.abs(x) + Math.abs(y);
      if (d <= 2 && d > 0) pts.push([x, y]);
    }
  }
  const seats = centeredSeats(pts);
  registerLatticeFormat({ id: 'diamond', seats, adj: orthoAdjOf(seats) });
}
// THE GAPPED BOARD — a 4×4 with two cells eaten out of the diagonal: the
// holes break the neighborhoods around them, so the same strike does less
// where the board is thin (sparse-holes, the asked-for fourth shape).
{
  const pts: [number, number][] = [];
  for (let y = 0; y <= 3; y++) {
    for (let x = 0; x <= 3; x++) {
      if ((x === 1 && y === 1) || (x === 2 && y === 2)) continue;
      pts.push([x, y]);
    }
  }
  const seats = centeredSeats(pts);
  registerLatticeFormat({ id: 'gapped', seats, adj: orthoAdjOf(seats) });
}

// --- LATTICE (lights-out) ----------------------------------------------------
// state: { w, h, lit: boolean[] } — lit rides each node's tone ('lightning'
// kindled / 'physical' dark) so the board reads at a glance and co-op wires
// it for free (the tone dressing is an ordinary status). A SHAPED court
// (spec.format) adds state.adj — the format's neighbor map — and re-seats
// the nodes; everything else (scramble, dress, status) is the one law.

const LATTICE_LIT: DamageType = 'lightning';
const LATTICE_DARK: DamageType = 'physical';

function latticeDress(run: PuzzleRun, h: PuzzleHost, idx: number): void {
  const lit = (run.state.lit as boolean[])[idx];
  h.setTone(run.nodes[idx], lit ? LATTICE_LIT : LATTICE_DARK);
}

function latticeToggle(run: PuzzleRun, idx: number): number[] {
  const lit = run.state.lit as boolean[];
  // A shaped court flips by its format's own neighbor map…
  const adj = run.state.adj as number[][] | undefined;
  if (adj) {
    const flipped = [idx, ...(adj[idx] ?? [])];
    for (const i of flipped) lit[i] = !lit[i];
    return flipped;
  }
  // …and the plain rectangle keeps its original orthogonal math, verbatim.
  const w = run.state.w as number, hgt = run.state.h as number;
  const col = idx % w, row = Math.floor(idx / w);
  const flipped: number[] = [];
  const flip = (c: number, r: number): void => {
    if (c < 0 || c >= w || r < 0 || r >= hgt) return;
    const i = r * w + c;
    lit[i] = !lit[i];
    flipped.push(i);
  };
  flip(col, row); flip(col - 1, row); flip(col + 1, row);
  flip(col, row - 1); flip(col, row + 1);
  return flipped;
}

registerPuzzleKind({
  id: 'lattice',
  nodeMonster: 'lattice_crystal',
  geometry: 'grid',
  who: 'player',
  spacing: 66,
  label: 'the charged lattice',
  boot(run, h) {
    const [w, hgt] = run.spec.grid ?? [3, 3];
    // THE FORMAT: a shaped court re-seats the placer's minted line onto its
    // own drawn seats and records its neighbor map; a missing or
    // census-mismatched format warns and falls back to the plain rectangle
    // (degrade, never wedge). Formatless boards take the exact old path.
    const fmt = run.spec.format ? LATTICE_FORMATS[run.spec.format] : undefined;
    if (run.spec.format && (!fmt || fmt.seats.length !== w * hgt)) {
      console.warn(`[puzzles] lattice '${run.id}': format '${run.spec.format}' `
        + `${fmt ? `census ${fmt.seats.length} ≠ grid ${w * hgt}` : 'is not registered'} — plain board`);
    }
    if (fmt && fmt.seats.length === w * hgt) {
      const pitch = run.spec.spacing ?? this.spacing;
      for (let i = 0; i < run.nodes.length && i < fmt.seats.length; i++) {
        run.nodes[i].pos.x = run.at.x + fmt.seats[i].x * pitch;
        run.nodes[i].pos.y = run.at.y + fmt.seats[i].y * pitch;
      }
      run.state.adj = fmt.adj;
    }
    const lit = new Array<boolean>(w * hgt).fill(true);
    run.state.w = w; run.state.h = hgt; run.state.lit = lit;
    // Scramble by SIMULATED strikes from the solved board — every board a
    // real sequence of moves away from kindled, so every board solves.
    const strikes = rollBand(h, run.spec.scramble, [3, 6]);
    do {
      for (let s = 0; s < strikes; s++) {
        latticeToggle(run, Math.floor(h.rng() * lit.length));
      }
    } while (lit.every(v => v)); // a cancelled scramble re-rolls (never boot solved)
    for (let i = 0; i < run.nodes.length; i++) latticeDress(run, h, i);
  },
  struck(run, node, h) {
    const idx = node.puzzleNode?.idx ?? -1;
    if (idx < 0) return;
    const flipped = latticeToggle(run, idx);
    for (const i of flipped) latticeDress(run, h, i);
    const lit = run.state.lit as boolean[];
    if (lit.every(v => v)) h.complete(run);
  },
  solved(run, h) {
    (run.state.lit as boolean[]).fill(true);
    for (let i = 0; i < run.nodes.length; i++) latticeDress(run, h, i);
  },
  status(run) {
    const lit = (run.state.lit as boolean[]).filter(v => v).length;
    return `${run.spec.label ?? this.label}: ${lit}/${(run.state.lit as boolean[]).length} kindled`;
  },
});

// --- REFRAIN (the singing ring) ----------------------------------------------
// state: { seq: number[], phase: 'play'|'answer', at: number (next beat /
// answer deadline), note: number (playback cursor), progress: number }.

const REFRAIN_TINT = '#ffe9a8';
const REFRAIN_FALTER = '#e86a5a';

function refrainReplay(run: PuzzleRun, h: PuzzleHost, pause: number): void {
  run.state.phase = 'play';
  run.state.note = 0;
  run.state.progress = 0;
  run.state.at = h.now() + pause;
  for (const n of run.nodes) h.quench(n);
}

registerPuzzleKind({
  id: 'refrain',
  nodeMonster: 'chime_crystal',
  geometry: 'ring',
  who: 'player',
  spacing: 112,
  count: [4, 5],
  label: 'the refrain',
  boot(run, h) {
    const notes = rollBand(h, run.spec.rounds, [4, 6]);
    const seq: number[] = [];
    for (let i = 0; i < notes; i++) {
      // No immediate repeats — twice-in-a-row reads as a missed flash.
      let pick = Math.floor(h.rng() * run.nodes.length);
      if (seq.length && pick === seq[seq.length - 1]) {
        pick = (pick + 1) % run.nodes.length;
      }
      seq.push(pick);
    }
    run.state.seq = seq;
    refrainReplay(run, h, 1.6);
  },
  tick(run, h) {
    const seq = run.state.seq as number[];
    const beat = run.spec.beat ?? 0.85;
    if (run.state.phase === 'play') {
      // A refrain sings only with someone to hear it — mid-song wanderers
      // pause the beat clock, never the song's place in it.
      if (!h.heroNear(run.at, PUZZLE_CFG.earshot)) {
        run.state.at = Math.max(run.state.at as number, h.now() + 0.4);
        return;
      }
      if (h.now() < (run.state.at as number)) return;
      const note = run.state.note as number;
      if (note < seq.length) {
        const n = run.nodes[seq[note]];
        h.kindle(n, beat * 0.6);
        h.flash(n.pos, n.radius + 22, REFRAIN_TINT, 0.3);
        h.say(n.pos, '♪', REFRAIN_TINT, 14);
        run.state.note = note + 1;
        run.state.at = h.now() + beat;
      } else {
        run.state.phase = 'answer';
        run.state.progress = 0;
        run.state.at = h.now() + (run.spec.window ?? 8) * seq.length;
        h.say(run.at, 'answer the refrain…', REFRAIN_TINT, 13);
      }
      return;
    }
    // answer phase: dawdling past the window replays the song.
    if (h.now() >= (run.state.at as number)) {
      h.say(run.at, 'the refrain fades — listen again…', REFRAIN_FALTER, 12);
      refrainReplay(run, h, 1.2);
    }
  },
  struck(run, node, h) {
    if (run.state.phase !== 'answer') {
      h.say(node.pos, 'listen…', REFRAIN_TINT, 11);
      return;
    }
    const seq = run.state.seq as number[];
    const progress = run.state.progress as number;
    const idx = node.puzzleNode?.idx ?? -1;
    if (idx === seq[progress]) {
      run.state.progress = progress + 1;
      h.kindle(node, 9999);
      h.flash(node.pos, node.radius + 18, REFRAIN_TINT, 0.25);
      if ((run.state.progress as number) >= seq.length) h.complete(run);
    } else {
      h.flash(node.pos, node.radius + 26, REFRAIN_FALTER, 0.35);
      h.say(node.pos, 'the refrain falters…', REFRAIN_FALTER, 12);
      refrainReplay(run, h, 1.2);
    }
  },
  solved(run, h) {
    run.state.phase = 'answer';
    run.state.progress = (run.state.seq as number[]).length;
    run.state.at = Infinity;
    for (const n of run.nodes) h.kindle(n, 9999);
  },
  status(run) {
    const seq = run.state.seq as number[];
    const label = run.spec.label ?? this.label;
    return run.state.phase === 'play'
      ? `${label}: listen — ${seq.length} notes`
      : `${label}: answer — ${run.state.progress as number}/${seq.length}`;
  },
});

// --- CHORD (the attunement riddle) -------------------------------------------
// state: { goal: DamageType }. Node tones move through the REAL attunement
// fabric (strike them with the element); this kind only listens and counts.

registerPuzzleKind({
  id: 'chord',
  nodeMonster: 'chord_crystal',
  heartMonster: 'heart_crystal',
  geometry: 'ring',
  who: 'any',
  spacing: 128,
  count: [4, 6],
  label: 'the chord',
  boot(run, h) {
    // The heart holds the goal; heartless specs (the shatter variant) pin
    // it from the pool — and mis-tune the ring so there is work to do.
    const pool = run.spec.tones ?? [...ELEMENTAL_TYPES];
    const goal = run.heart?.tone ?? pool[Math.floor(h.rng() * pool.length)];
    run.state.goal = goal;
    if (!run.heart) {
      for (const n of run.nodes) {
        if (n.tone !== goal) continue;
        const off = ELEMENTAL_TYPES.filter(t => t !== goal);
        h.setTone(n, off[Math.floor(h.rng() * off.length)] ?? 'fire');
      }
    }
  },
  tuned(run, node, h, tone) {
    const goal = run.state.goal as DamageType;
    if (tone !== goal) return;
    h.flash(node.pos, node.radius + 20, '#e8f4ff', 0.3);
    if (run.nodes.every(n => n.tone === goal)) h.complete(run);
  },
  solved(run, h) {
    const goal = run.state.goal as DamageType;
    for (const n of run.nodes) h.setTone(n, goal);
  },
  status(run) {
    const goal = run.state.goal as DamageType;
    const matched = run.nodes.filter(n => n.tone === goal).length;
    const verb = goal === 'physical' ? 'shattered to silence' : `attuned to ${goal}`;
    return `${run.spec.label ?? this.label}: ${matched}/${run.nodes.length} ${verb}`;
  },
});

// --- TEMPO (the rising measure) ------------------------------------------------
// state: { order: number[] (node idx by rank, slowest first), progress:
// number, pulseAt: number[] }. The order is READ, never memorized: every
// unsettled voice pulses on its own period — rank r pulses (period − r×step)
// seconds apart, floored — from ONE synced opening bar, so the comparison is
// legible from the first drift. A wrong voice breaks the measure and
// re-syncs the bar (a fresh read, not a punishment). Settled voices hold
// steady light and stop pulsing; re-tapping one is quietly ignored.

const TEMPO_TINT = '#d8b8ff';
const TEMPO_BREAK = '#e86a5a';
/** The united opening blink's lead-in, and the re-sync pause after a break. */
const TEMPO_OPEN = 1.2;
/** A pulse's visible blink (kindle seconds). */
const TEMPO_BLINK = 0.35;
/** The fastest voice's period floor — readability's hard deck. */
const TEMPO_MIN = 0.4;

function tempoPeriodOf(run: PuzzleRun, rank: number): number {
  const base = run.spec.period ?? 2.4;
  const step = run.spec.step ?? 0.35;
  return Math.max(TEMPO_MIN, base - rank * step);
}

function tempoResync(run: PuzzleRun, h: PuzzleHost): void {
  const at = h.now() + TEMPO_OPEN;
  run.state.pulseAt = run.nodes.map(() => at);
}

registerPuzzleKind({
  id: 'tempo',
  nodeMonster: 'tempo_crystal',
  geometry: 'ring',
  who: 'player',
  spacing: 112,
  count: [4, 5],
  label: 'the rising tempo',
  boot(run, h) {
    // Ranks are a SHUFFLED permutation — the ring's seating never betrays
    // the measure (Fisher–Yates on the host's stream).
    const order = run.nodes.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(h.rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    run.state.order = order;
    run.state.progress = 0;
    tempoResync(run, h);
  },
  tick(run, h, dt) {
    const at = run.state.pulseAt as number[];
    // Nobody watching: hold every phase in place — the synced bar and all
    // its relative drift survive the walk away (the refrain's earshot law).
    if (!h.heroNear(run.at, PUZZLE_CFG.earshot)) {
      for (let i = 0; i < at.length; i++) at[i] += dt;
      return;
    }
    const order = run.state.order as number[];
    const progress = run.state.progress as number;
    for (let i = 0; i < run.nodes.length; i++) {
      if (h.now() < at[i]) continue;
      const rank = order.indexOf(i);
      at[i] = h.now() + tempoPeriodOf(run, rank);
      if (rank < progress) continue; // settled voices hold steady light
      h.kindle(run.nodes[i], TEMPO_BLINK);
      h.flash(run.nodes[i].pos, run.nodes[i].radius + 14, TEMPO_TINT, 0.22);
    }
  },
  struck(run, node, h) {
    const idx = node.puzzleNode?.idx ?? -1;
    if (idx < 0) return;
    const order = run.state.order as number[];
    const progress = run.state.progress as number;
    const rank = order.indexOf(idx);
    if (rank < progress) return; // an already-settled voice — quiet
    if (rank === progress) {
      run.state.progress = progress + 1;
      h.kindle(node, 9999);
      h.flash(node.pos, node.radius + 18, TEMPO_TINT, 0.25);
      if ((run.state.progress as number) >= order.length) h.complete(run);
      return;
    }
    h.flash(node.pos, node.radius + 26, TEMPO_BREAK, 0.35);
    h.say(node.pos, 'the measure breaks…', TEMPO_BREAK, 12);
    run.state.progress = 0;
    for (const n of run.nodes) h.quench(n);
    tempoResync(run, h); // a fresh bar — the re-read starts legible
  },
  solved(run, h) {
    run.state.progress = (run.state.order as number[]).length;
    for (const n of run.nodes) h.kindle(n, 9999);
  },
  status(run) {
    const n = (run.state.order as number[]).length;
    return `${run.spec.label ?? this.label}: ${run.state.progress as number}/${n} voices in measure`;
  },
});

// --- ACCORD (the twin voices) --------------------------------------------------
// state: { bound: boolean[], pending: ({ half: number; until: number } |
// null)[] } — one slot per PAIR. Partners sit OPPOSITE (idx and idx+pairs)
// and SHARE a tone off the spec's pool: the color names the partnership.
// Ring one half and it holds — kindled for exactly the linger window
// (drawn == tested) — ring its partner inside that window and the pair
// BINDS for good. Bound pairs never come undone: the riddle is per-pair
// simultaneity, never a global restart. The kind-level spill:'all' is the
// law's shipped fan-out consumer — one wide blow may bind a pair whole
// (both knocks land in the same drained group), several pairs at once if
// the blow is wide enough.

const ACCORD_TINT = '#e8fff0';
const ACCORD_SLIP = '#9ab0c8';

function accordLingerOf(run: PuzzleRun): number {
  return run.spec.linger ?? 3;
}
/** idx ↔ partner: pair p seats nodes p and p+pairs (opposite on the ring). */
function accordPairOf(run: PuzzleRun, idx: number): number {
  return idx % (run.nodes.length >> 1);
}

registerPuzzleKind({
  id: 'accord',
  nodeMonster: 'accord_crystal',
  geometry: 'ring',
  who: 'player',
  spill: 'all',
  spacing: 128,
  count: [4, 6],
  quantize: 2, // pairs stay whole — the placer floors odd rolls
  label: 'the twin accord',
  boot(run, h) {
    const pairs = run.nodes.length >> 1;
    const pool = run.spec.tones ?? [...ELEMENTAL_TYPES];
    run.state.bound = new Array<boolean>(pairs).fill(false);
    run.state.pending = new Array<{ half: number; until: number } | null>(pairs).fill(null);
    for (let i = 0; i < run.nodes.length; i++) {
      h.setTone(run.nodes[i], pool[accordPairOf(run, i) % pool.length] ?? 'fire');
    }
  },
  tick(run, h) {
    const pending = run.state.pending as ({ half: number; until: number } | null)[];
    for (let p = 0; p < pending.length; p++) {
      const pend = pending[p];
      if (!pend || h.now() <= pend.until) continue;
      pending[p] = null; // the lone voice's window lapses — its light with it
      const node = run.nodes[pend.half];
      h.quench(node);
      h.say(node.pos, 'the accord slips…', ACCORD_SLIP, 11);
    }
  },
  struck(run, node, h) {
    const idx = node.puzzleNode?.idx ?? -1;
    if (idx < 0) return;
    const bound = run.state.bound as boolean[];
    const pending = run.state.pending as ({ half: number; until: number } | null)[];
    const p = accordPairOf(run, idx);
    if (bound[p]) return; // a bound pair holds — quiet
    const pend = pending[p];
    if (pend && pend.half !== idx && h.now() <= pend.until) {
      bound[p] = true;
      pending[p] = null;
      const other = run.nodes[pend.half];
      h.kindle(node, 9999);
      h.kindle(other, 9999);
      h.flash(node.pos, node.radius + 20, ACCORD_TINT, 0.3);
      h.flash(other.pos, other.radius + 20, ACCORD_TINT, 0.3);
      if (bound.every(v => v)) h.complete(run);
      return;
    }
    // First (or refreshed) half: hold the window, wear it as light.
    pending[p] = { half: idx, until: h.now() + accordLingerOf(run) };
    h.kindle(node, accordLingerOf(run));
    h.flash(node.pos, node.radius + 16, ACCORD_TINT, 0.22);
  },
  solved(run, h) {
    (run.state.bound as boolean[]).fill(true);
    for (const n of run.nodes) h.kindle(n, 9999);
  },
  status(run) {
    const bound = run.state.bound as boolean[];
    return `${run.spec.label ?? this.label}: ${bound.filter(v => v).length}/${bound.length} accords bound`;
  },
});

// --- EMBER (the tended ring) ---------------------------------------------------
// state: { litUntil: number[] }. A struck coal is ALIGHT for the gutter
// window — worn as kindle for exactly those seconds, so the fade the player
// sees IS the clock the kind tests. Have every coal alight at once. No
// falter: the coals' own guttering is the only pressure, so patience
// circles the ring forever and breadth lights it in a blow (the kind-level
// spill:'all' — a wide swing feeds several coals; echo re-taps merely
// refresh). The tick only lets expired coals go out (litUntil → 0, the
// worn kindle fades on its own matched clock); completion is judged at
// the strike.

const EMBER_TINT = '#ffb27a';

function emberGutterOf(run: PuzzleRun): number {
  return run.spec.gutter ?? 7;
}

registerPuzzleKind({
  id: 'ember',
  nodeMonster: 'ember_crystal',
  geometry: 'ring',
  who: 'player',
  spill: 'all',
  spacing: 112,
  count: [5, 6],
  label: 'the ember ring',
  boot(run) {
    run.state.litUntil = run.nodes.map(() => 0);
  },
  tick(run, h) {
    const lit = run.state.litUntil as number[];
    for (let i = 0; i < lit.length; i++) {
      if (lit[i] > 0 && lit[i] <= h.now()) lit[i] = 0; // guttered out
    }
  },
  struck(run, node, h) {
    const idx = node.puzzleNode?.idx ?? -1;
    if (idx < 0) return;
    const lit = run.state.litUntil as number[];
    lit[idx] = h.now() + emberGutterOf(run);
    h.kindle(node, emberGutterOf(run));
    h.flash(node.pos, node.radius + 16, EMBER_TINT, 0.22);
    if (lit.every(t => t > h.now())) h.complete(run);
  },
  solved(run, h) {
    run.state.litUntil = run.nodes.map(() => Infinity);
    for (const n of run.nodes) h.kindle(n, 9999);
  },
  status(run) {
    const lit = run.state.litUntil as number[];
    return `${run.spec.label ?? this.label}: ${lit.filter(t => t > 0).length}/${lit.length} alight`;
  },
});

// --- ICE SLIDE (the pushed block) ----------------------------------------------
// state: { w, h, pitch, rocks: number[] (cells), sockets: number[] (cells),
// blockCells: number[] (one per block node, idx 0..B-1), sliding: { idx,
// fx, fy, tx, ty, t0, dur } | null, pulseAt, goal: 'cold' }.
//
// THE LAWS OF THE RINK:
//   • ONE INPUT, the knock: fixtures are anchored bodies (pulls and shoves
//     pass them by — the fixture contract), so the standing knock grammar
//     is the whole grammar: any landed blow pushes a block along the BLOW'S
//     bearing, squared to the rink's axes. Every delivery in the game plays
//     it, exactly like every other riddle.
//   • THE SLIDE: grid-true, to the last open cell before a stopper (a stone
//     or another block). Occupancy is claimed the instant a block is loosed;
//     the glide is the drawn catch-up, snapped to the tested cell on
//     arrival (drawn == tested at rest, and one block moves at a time).
//   • THE CATCH LAW: a push whose ray leaves the rink uncaught REFUSES —
//     the block does not budge and says why. No invisible walls, no
//     runaway ice; every stop the player sees is a body the world drew.
//   • SOLVABLE BY CONSTRUCTION: boards deal sockets + their catch stones,
//     seat the blocks SOLVED, scramble by REVERSE moves (each one the
//     mirror of a legal push — the lattice scramble law's sibling), then
//     PROVE the deal: an exhaustive slide-graph flood rejects any board
//     with a reachable dead end. A dry deal budget degrades to silent
//     scenery (the court shrine's doctrine) — and completes a vacuous
//     OBJECTIVE ask rather than seal a zone (the unknown-preset precedent).
//   • THE GOAL IS DRAWN: unseated sockets pulse their want on a slow clock
//     at the exact cell the seat test reads; a seated block kindles.

export const ICESLIDE_CFG = {
  // ⚠ UNBLESSED numbers (batch-35 puzzle wave) — my picks, flagged for
  // Arianna: pitch/speed are feel, bands are difficulty, tries/states are
  // generation budget, tints are look.
  /** Cell pitch px (the kind's spacing doubles as the placer's line pitch). */
  pitch: 46,
  /** Default rink dims [w, h] in cells. */
  board: [6, 5] as [number, number],
  /** Default pushable-block band. */
  blocks: [1, 1] as [number, number],
  /** Default reverse-move scramble band. */
  shuffle: [4, 9] as [number, number],
  /** A loosed block's glide, px/s. */
  slideSpeed: 300,
  /** Seconds between goal-socket telegraph pulses. */
  socketPulse: 0.8,
  /** Bounded deal budget before the degrade. */
  genTries: 40,
  /** Reachability-proof state ceiling (shipped boards sit far below it —
   *  a blown flood is treated as an unsafe deal, never trusted). */
  maxStates: 6000,
  tintIce: '#bfe8f8',
  tintSocket: '#ffd88a',
  tintRefuse: '#9ab0c8',
} as const;

/** The block's worn dress vs the stones' (the lattice LIT/DARK idiom — the
 *  tone lane is the co-op-safe paint, and 'cold' IS the ice). */
const ICESLIDE_ICE: DamageType = 'cold';
const ICESLIDE_STONE: DamageType = 'physical';
const SLIDE_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

/** Everything solid on the rink but the mover itself. */
function slideOcc(rocks: number[], blocks: number[], skip: number): Set<number> {
  const occ = new Set(rocks);
  for (let i = 0; i < blocks.length; i++) {
    if (i !== skip) occ.add(blocks[i]);
  }
  return occ;
}

/** THE SLIDE + THE CATCH LAW, pure: the landing cell for a push of `from`
 *  along (dc, dr) — `from` itself for a bump, −1 for an uncaught ray. */
function slideDest(occ: ReadonlySet<number>, w: number, h: number,
  from: number, dc: number, dr: number): number {
  let x = from % w, y = Math.floor(from / w);
  let prev = from;
  for (;;) {
    x += dc; y += dr;
    if (x < 0 || x >= w || y < 0 || y >= h) return -1; // nothing would catch it
    const c = y * w + x;
    if (occ.has(c)) return prev; // the cell before the stopper
    prev = c;
  }
}

/** THE PROOF: flood every position the blocks can reach by legal slides
 *  (completion locks a solved board, so solved states spread no further),
 *  then flood BACK from the solved set over the transposed graph — the deal
 *  is honest only if every reachable state can still finish. Pure; the
 *  probe re-proves it with an independent implementation. */
function slideVerify(w: number, h: number, rocks: number[], sockets: number[],
  blocks: number[], cap: number): boolean {
  const keyOf = (b: number[]): string => [...b].sort((a, z) => a - z).join(',');
  const solvedAt = (b: number[]): boolean => sockets.every(s => b.includes(s));
  const start = keyOf(blocks);
  const seen = new Map<string, number[]>([[start, [...blocks]]]);
  const edges = new Map<string, string[]>();
  const queue = [start];
  const solvedKeys: string[] = [];
  while (queue.length) {
    const k = queue.pop()!;
    const b = seen.get(k)!;
    const out: string[] = [];
    edges.set(k, out);
    if (solvedAt(b)) { solvedKeys.push(k); continue; } // the board locks solved
    for (let i = 0; i < b.length; i++) {
      const occ = slideOcc(rocks, b, i);
      for (const [dc, dr] of SLIDE_DIRS) {
        const dest = slideDest(occ, w, h, b[i], dc, dr);
        if (dest < 0 || dest === b[i]) continue;
        const nb = [...b];
        nb[i] = dest;
        const nk = keyOf(nb);
        out.push(nk);
        if (!seen.has(nk)) {
          if (seen.size >= cap) return false; // a blown flood is an unsafe deal
          seen.set(nk, nb);
          queue.push(nk);
        }
      }
    }
  }
  if (!solvedKeys.length) return false;
  const rev = new Map<string, string[]>();
  for (const [k, outs] of edges) {
    for (const o of outs) {
      const r = rev.get(o);
      if (r) r.push(k); else rev.set(o, [k]);
    }
  }
  const canFinish = new Set(solvedKeys);
  const back = [...solvedKeys];
  while (back.length) {
    const k = back.pop()!;
    for (const pk of rev.get(k) ?? []) {
      if (!canFinish.has(pk)) { canFinish.add(pk); back.push(pk); }
    }
  }
  for (const k of seen.keys()) {
    if (!canFinish.has(k)) return false; // a reachable dead end — reject the deal
  }
  return true;
}

/** THE DEAL: sockets each with a catch stone, the leftover stones strewn,
 *  blocks seated SOLVED and walked backward by reverse moves — then the
 *  proof above, rejection-sampled inside a bounded budget. Pure on the
 *  host's stream (the world's global die; probes hand it a seeded one). */
function genSlideBoard(h: PuzzleHost, w: number, hh: number, bodies: number,
  bBand: [number, number], kBand: [number, number]):
  { rocks: number[]; sockets: number[]; blocks: number[] } | null {
  const cells = w * hh;
  const pick = (n: number): number => Math.floor(h.rng() * n);
  const inB = (x: number, y: number): boolean => x >= 0 && x < w && y >= 0 && y < hh;
  for (let attempt = 0; attempt < ICESLIDE_CFG.genTries; attempt++) {
    // Every block keeps a catch stone: B ≤ bodies / 2, always ≥ 1.
    const b = Math.max(1, Math.min(Math.floor(bodies / 2), rollBand(h, bBand, bBand)));
    const rocks: number[] = [];
    const sockets: number[] = [];
    const taken = new Set<number>(); // stones + sockets — sockets stay open ice
    let dealt = true;
    for (let s = 0; s < b && dealt; s++) {
      dealt = false;
      for (let t = 0; t < 40; t++) {
        const c = pick(cells);
        if (taken.has(c)) continue;
        const d = SLIDE_DIRS[pick(4)];
        const x = c % w, y = Math.floor(c / w);
        if (!inB(x + d[0], y + d[1])) continue;
        const catcher = (y + d[1]) * w + (x + d[0]);
        if (taken.has(catcher)) continue;
        sockets.push(c); taken.add(c);
        rocks.push(catcher); taken.add(catcher);
        dealt = true;
        break;
      }
    }
    if (!dealt) continue;
    for (let r = b; r < bodies - b && dealt; r++) {
      dealt = false;
      for (let t = 0; t < 60; t++) {
        const c = pick(cells);
        if (taken.has(c)) continue;
        rocks.push(c); taken.add(c);
        dealt = true;
        break;
      }
    }
    if (!dealt) continue;
    // The scramble: each reverse move is a legal push played backward — a
    // stopper past the seat to have landed against, open ice behind to
    // have come from. Forward play retraces it by construction.
    const blocks = [...sockets];
    const k = rollBand(h, kBand, kBand);
    for (let step = 0; step < k; step++) {
      const cands: { i: number; lane: number[] }[] = [];
      for (let i = 0; i < blocks.length; i++) {
        const occ = slideOcc(rocks, blocks, i);
        const x0 = blocks[i] % w, y0 = Math.floor(blocks[i] / w);
        for (const [dc, dr] of SLIDE_DIRS) {
          const sx = x0 + dc, sy = y0 + dr;
          if (!inB(sx, sy) || !occ.has(sy * w + sx)) continue;
          const lane: number[] = [];
          let bx = x0 - dc, by = y0 - dr;
          while (inB(bx, by) && !occ.has(by * w + bx)) {
            lane.push(by * w + bx);
            bx -= dc; by -= dr;
          }
          if (lane.length) cands.push({ i, lane });
        }
      }
      if (!cands.length) break;
      const c = cands[pick(cands.length)];
      blocks[c.i] = c.lane[pick(c.lane.length)];
    }
    if (sockets.every(s => blocks.includes(s))) continue; // dealt itself solved — re-deal
    if (!slideVerify(w, hh, rocks, sockets, blocks, ICESLIDE_CFG.maxStates)) continue;
    return { rocks, sockets, blocks };
  }
  return null;
}

/** A rink cell's world seat (the board centers on the run's court). */
function slideCellPos(run: PuzzleRun, cell: number): Vec2 {
  const w = run.state.w as number, h = run.state.h as number;
  const pitch = run.state.pitch as number;
  const x = cell % w, y = Math.floor(cell / w);
  return vec(run.at.x + (x - (w - 1) / 2) * pitch,
    run.at.y + (y - (h - 1) / 2) * pitch);
}

interface SlideAnim { idx: number; fx: number; fy: number; tx: number; ty: number; t0: number; dur: number }

registerPuzzleKind({
  id: 'iceslide',
  nodeMonster: 'lattice_crystal',
  geometry: 'grid',
  who: 'player',
  spacing: ICESLIDE_CFG.pitch,
  label: 'the ice slide',
  boot(run, h) {
    const pin = run.spec.pinned;
    let bw: number, bh: number;
    let bd: { rocks: number[]; sockets: number[]; blocks: number[] } | null = null;
    if (pin) {
      bw = pin.board[0]; bh = pin.board[1];
      const cellOf = (p: [number, number]): number => p[1] * bw + p[0];
      const cand = {
        rocks: pin.rocks.map(cellOf), sockets: pin.sockets.map(cellOf),
        blocks: pin.blocks.map(cellOf),
      };
      if (cand.blocks.length + cand.rocks.length !== run.nodes.length
        || cand.blocks.length !== cand.sockets.length) {
        console.warn(`[puzzles] iceslide '${run.id}': pinned board census `
          + 'mismatches its minted nodes — pin discarded');
      } else {
        if (!slideVerify(bw, bh, cand.rocks, cand.sockets, cand.blocks, ICESLIDE_CFG.maxStates)) {
          console.warn(`[puzzles] iceslide '${run.id}': pinned board is not `
            + 'honestly solvable — it stands as authored');
        }
        bd = cand;
      }
    }
    if (!bd) {
      [bw, bh] = run.spec.board ?? ICESLIDE_CFG.board;
      bd = genSlideBoard(h, bw, bh, run.nodes.length,
        run.spec.blocks ?? ICESLIDE_CFG.blocks,
        run.spec.shuffle ?? ICESLIDE_CFG.shuffle);
    } else {
      bw = pin!.board[0]; bh = pin!.board[1];
    }
    if (!bd) {
      // The degrade (never wedge): the bodies stand as silent scenery, and
      // an OBJECTIVE ask completes vacuously rather than seal a zone.
      console.warn(`[puzzles] iceslide '${run.id}' dealt no honest board in `
        + `${ICESLIDE_CFG.genTries} tries — degraded to scenery`);
      if (run.isObjective) h.complete(run);
      return;
    }
    run.state.w = bw; run.state.h = bh;
    run.state.pitch = run.spec.spacing ?? this.spacing;
    run.state.rocks = bd.rocks;
    run.state.sockets = bd.sockets;
    run.state.blockCells = bd.blocks;
    run.state.sliding = null;
    run.state.pulseAt = 0;
    run.state.goal = ICESLIDE_ICE; // the parting wash pays in the rink's coin
    for (let i = 0; i < run.nodes.length; i++) {
      const isBlock = i < bd.blocks.length;
      const cell = isBlock ? bd.blocks[i] : bd.rocks[i - bd.blocks.length];
      const p = slideCellPos(run, cell);
      run.nodes[i].pos.x = p.x;
      run.nodes[i].pos.y = p.y;
      h.setTone(run.nodes[i], isBlock ? ICESLIDE_ICE : ICESLIDE_STONE);
      if (isBlock && bd.sockets.includes(cell)) h.kindle(run.nodes[i], 9999);
    }
  },
  struck(run, node, h, striker) {
    const cells = run.state.blockCells as number[] | undefined;
    if (!cells || !striker) return; // a degraded rink is silent scenery
    const idx = node.puzzleNode?.idx ?? -1;
    if (idx < 0) return;
    if (idx >= cells.length) { // a stopper stone — it holds fast, quietly
      h.flash(node.pos, node.radius + 8, ICESLIDE_CFG.tintRefuse, 0.15);
      return;
    }
    if (run.state.sliding) { // one loosed block at a time — the ice is busy
      h.flash(node.pos, node.radius + 10, ICESLIDE_CFG.tintRefuse, 0.18);
      return;
    }
    // The push takes the blow's bearing, squared to the rink's axes.
    const w = run.state.w as number, hh = run.state.h as number;
    const dx = node.pos.x - striker.pos.x, dy = node.pos.y - striker.pos.y;
    const dc = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 1 : -1) : 0;
    const dr = dc === 0 ? (dy >= 0 ? 1 : -1) : 0;
    const dest = slideDest(slideOcc(run.state.rocks as number[], cells, idx),
      w, hh, cells[idx], dc, dr);
    if (dest < 0) { // THE CATCH LAW: with nothing to stop it, the block refuses
      h.say(node.pos, 'nothing would catch it…', ICESLIDE_CFG.tintRefuse, 11);
      h.flash(node.pos, node.radius + 12, ICESLIDE_CFG.tintRefuse, 0.2);
      return;
    }
    if (dest === cells[idx]) { // shoved square into a stopper — a dull thud
      h.flash(node.pos, node.radius + 10, ICESLIDE_CFG.tintRefuse, 0.18);
      return;
    }
    const sockets = run.state.sockets as number[];
    if (sockets.includes(cells[idx])) h.quench(node); // it leaves its seat
    const from = slideCellPos(run, cells[idx]);
    const to = slideCellPos(run, dest);
    const moved = Math.abs((dest % w) - (cells[idx] % w))
      + Math.abs(Math.floor(dest / w) - Math.floor(cells[idx] / w));
    cells[idx] = dest; // the lane is claimed the moment the block is loosed
    run.state.sliding = {
      idx, fx: from.x, fy: from.y, tx: to.x, ty: to.y,
      t0: h.now(), dur: (moved * (run.state.pitch as number)) / ICESLIDE_CFG.slideSpeed,
    } satisfies SlideAnim;
    h.flash(node.pos, node.radius + 10, ICESLIDE_CFG.tintIce, 0.18);
  },
  tick(run, h) {
    const cells = run.state.blockCells as number[] | undefined;
    if (!cells) return;
    const sockets = run.state.sockets as number[];
    // The goal telegraph: unseated sockets pulse their want on a slow clock
    // at the exact cell the seat test reads (drawn == tested).
    if (h.now() >= (run.state.pulseAt as number)) {
      run.state.pulseAt = h.now() + ICESLIDE_CFG.socketPulse;
      for (const s of sockets) {
        if (cells.includes(s)) continue;
        h.flash(slideCellPos(run, s), (run.state.pitch as number) * 0.42,
          ICESLIDE_CFG.tintSocket, 0.55);
      }
    }
    const sl = run.state.sliding as SlideAnim | null;
    if (!sl) return;
    const node = run.nodes[sl.idx];
    const t = sl.dur <= 0 ? 1 : (h.now() - sl.t0) / sl.dur;
    if (t < 1) {
      node.pos.x = sl.fx + (sl.tx - sl.fx) * t;
      node.pos.y = sl.fy + (sl.ty - sl.fy) * t;
      return;
    }
    node.pos.x = sl.tx; node.pos.y = sl.ty; // the snap: at rest, drawn == tested
    run.state.sliding = null;
    if (sockets.includes(cells[sl.idx])) {
      h.kindle(node, 9999);
      h.flash(node.pos, node.radius + 18, ICESLIDE_CFG.tintSocket, 0.3);
      if (sockets.every(s => cells.includes(s))) h.complete(run);
    }
  },
  solved(run, h) {
    const cells = run.state.blockCells as number[] | undefined;
    if (!cells) return; // a degraded rink has nothing to prove
    const sockets = run.state.sockets as number[];
    run.state.sliding = null;
    for (let b = 0; b < cells.length; b++) {
      cells[b] = sockets[b];
      const p = slideCellPos(run, sockets[b]);
      run.nodes[b].pos.x = p.x;
      run.nodes[b].pos.y = p.y;
      h.kindle(run.nodes[b], 9999);
    }
  },
  status(run) {
    const label = run.spec.label ?? this.label;
    const cells = run.state.blockCells as number[] | undefined;
    if (!cells) return `${label}: the ice lies still`;
    const sockets = run.state.sockets as number[];
    const seated = sockets.filter(s => cells.includes(s)).length;
    return `${label}: ${seated}/${sockets.length} blocks seated`;
  },
});
