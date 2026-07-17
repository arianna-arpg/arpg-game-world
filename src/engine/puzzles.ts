// ---------------------------------------------------------------------------
// THE PUZZLE FABRIC — activity riddles as data.
//
// A puzzle is a small machine of STRUCK FIXTURES: crystal bodies (ordinary
// passive monster defs — they reach resolveHit like anything else, so every
// delivery in the game can play them: arcs, arrows, novas, minions) wired to
// a PUZZLE RUN that a registered KIND drives. Three kinds ship here; the
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
//
// Placement happens at ZONE LOAD (World's puzzle placer), never at
// generation: no genqa surface, no layout-rng movement — the same salted
// discipline fog banks and creep pockets follow. Specs are authored in
// src/data/puzzles.ts (PUZZLES) and rolled per zone from TilesetDef.puzzles
// rows or pinned by a zone's `puzzle` OBJECTIVE (zones.ts).
//
// Kinds speak to the world through the narrow PuzzleHost — flashes, text,
// dressings, completion — so this module never imports World, and a kind
// can be unit-probed against a stub host.
// ---------------------------------------------------------------------------

import type { Vec2 } from '../core/math';
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
  /** refrain: answer seconds allowed PER NOTE before the refrain replays
   *  (default 8 — a puzzle, not a reflex test). */
  window?: number;
  /** lattice: scramble strikes band rolled at boot (default [3, 6]). */
  scramble?: [number, number];
  /** chord: the heart's tone pool (default the three elements). The
   *  heartless variant reads tones[0] as the fixed goal. */
  tones?: DamageType[];
  /** Whose strikes the kind counts (default: the kind's own doctrine). */
  who?: 'player' | 'any';
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
  /** Default ring radius / grid pitch (spec.spacing overrides). */
  spacing: number;
  /** Default node count band for ring kinds. */
  count?: [number, number];
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
} as const;

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
