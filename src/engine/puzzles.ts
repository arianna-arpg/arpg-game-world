// ---------------------------------------------------------------------------
// THE PUZZLE FABRIC — activity riddles as data.
//
// A puzzle is a small machine of STRUCK FIXTURES: crystal bodies (ordinary
// passive monster defs — they reach resolveHit like anything else, so every
// delivery in the game can play them: arcs, arrows, novas, minions) wired to
// a PUZZLE RUN that a registered KIND drives. Six kinds ship here; the
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
import { angleDiff, angleTo, dist } from '../core/math';
import type { Actor } from './actor';
import type { DamageType } from './stats';
import { ELEMENTAL_TYPES } from './stats';

/** An authored puzzle (data/puzzles.ts) — everything the placer + kind read. */
export interface PuzzleSpec {
  /** PUZZLE_KINDS id. */
  kind: string;
  /** Node fixture def (default: the kind's nodeMonster). */
  node?: string;
  /** Heart fixture def (chord; default: the kind's heartMonster).
   *  `false` = heartless (the shatter variant's fixed goal). */
  heart?: string | false;
  /** lattice: board dims [w, h] (default [3, 3]). */
  grid?: [number, number];
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
  /** Completion flourish: free-cast a catalog skill at the site, sprinkle
   *  gems, and/or wash the finishing tone over the solver's side for a
   *  GENEROUS `washFor` seconds (the puzzle pays in the fabric's own coin). */
  reward?: { cast?: string; gems?: number; washFor?: number };
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

// --- LATTICE (lights-out) ----------------------------------------------------
// state: { w, h, lit: boolean[] } — lit rides each node's tone ('lightning'
// kindled / 'physical' dark) so the board reads at a glance and co-op wires
// it for free (the tone dressing is an ordinary status).

const LATTICE_LIT: DamageType = 'lightning';
const LATTICE_DARK: DamageType = 'physical';

function latticeDress(run: PuzzleRun, h: PuzzleHost, idx: number): void {
  const lit = (run.state.lit as boolean[])[idx];
  h.setTone(run.nodes[idx], lit ? LATTICE_LIT : LATTICE_DARK);
}

function latticeToggle(run: PuzzleRun, idx: number): number[] {
  const w = run.state.w as number, hgt = run.state.h as number;
  const lit = run.state.lit as boolean[];
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
