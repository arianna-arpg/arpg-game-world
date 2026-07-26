// ---------------------------------------------------------------------------
// PUZZLE PRESETS — the authored riddle repertoire (engine/puzzles.ts).
//
// A preset is pure data: which KIND runs it, its board/ring/palette dials,
// and what resolving it pays. Biomes offer presets per zone via
// TilesetDef.puzzles chance rows (folded onto minted ZoneDefs); a 'puzzle'
// OBJECTIVE draws from the same rows. Adding a riddle to a biome is one row;
// adding a NEW preset is one entry here; adding a new KIND is a
// registerPuzzleKind in engine (or a package) — three seams, all data-shaped.
//
// This module also wires the shared presentation lanes, the beacons.ts idiom:
//   - zone panel rows      → registerZoneInfoSource (live riddles + state)
//   - off-screen chevron   → registerAttentionSource (the objective riddle)
// ---------------------------------------------------------------------------

import type { PuzzleSpec } from '../engine/puzzles';
import type { World } from '../engine/world';
import { registerAttentionSource, type AttentionPoint } from '../world/attention';
import { registerZoneInfoSource } from '../world/zoneInfo';

/** The riddle chevron/panel accent (crystal-glass blue). */
export const PUZZLE_ACCENT = '#9fd8ff';

export const PUZZLES: Record<string, PuzzleSpec> = {
  // THE GREAT CHORD — a locked heart holds a rolled element; strike the
  // ring's crystals with matching damage until every voice joins. The
  // parting wash is the heart's own tone, paid generously.
  great_chord: {
    kind: 'chord',
    label: 'the great chord',
    reward: { gems: 2, washFor: 20 },
  },
  // THE SHATTERED CHORD — the heartless inversion: the ring wakes mistuned
  // and asks for SILENCE. Batter every crystal back to physical — the
  // ground state is a note too, and this riddle is its anthem.
  shatter_chord: {
    kind: 'chord',
    heart: false,
    tones: ['physical'],
    label: 'the shattered chord',
    count: [4, 5],
    reward: { gems: 2, washFor: 20 },
  },
  // THE CHARGED LATTICE — lights-out on a 3×3 of crystals: a strike toggles
  // a cell and its orthogonal neighbors. Kindle the whole board.
  charged_lattice: {
    kind: 'lattice',
    grid: [3, 3],
    label: 'the charged lattice',
    reward: { gems: 2, washFor: 20 },
  },
  // THE SINGING REFRAIN — the ring plays; you answer. Wrong notes falter
  // the song back to its opening bar; the crystals are patient.
  singing_refrain: {
    kind: 'refrain',
    label: 'the singing refrain',
    reward: { gems: 2, washFor: 20 },
  },
  // THE GLIMMER REFRAIN — the grove country's version of the same patience:
  // the ring flashes a firefly sign; you answer it back. The lampwrights
  // have been running this call-and-answer since before anyone walked here.
  glimmer_refrain: {
    kind: 'refrain',
    label: 'the glimmer refrain',
    reward: { gems: 2, washFor: 20 },
  },
  // THE RISING TEMPO — every voice keeps its own time from one synced
  // opening bar; strike them slowest first, fastest last. Nothing to
  // memorize: the order is read straight off the pulses, and a broken
  // measure only re-syncs the bar for a fresh look.
  rising_tempo: {
    kind: 'tempo',
    label: 'the rising tempo',
    reward: { gems: 2, washFor: 20 },
  },
  // THE TWIN ACCORD — opposite seats share a color; ring both halves of a
  // pair inside the linger and the accord binds for good. A wide blow can
  // bind a pair whole (spill 'all' is this kind's law) — or just walk it.
  twin_accord: {
    kind: 'accord',
    label: 'the twin accord',
    reward: { gems: 2, washFor: 20 },
  },
  // THE EMBER RING — struck coals stay alight for their gutter window;
  // have every coal burning at once. Patience circles the ring forever,
  // breadth lights half of it in a swing — no falter, no penalty, only
  // the coals' own cooling.
  ember_ring: {
    kind: 'ember',
    label: 'the ember ring',
    reward: { gems: 2, washFor: 20 },
  },
};

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

// Zone panel: every live riddle in the CURRENT zone reads out its state —
// resolved ones stand as proof (and stop advertising a gift).
registerZoneInfoSource((world: World, zoneId: string) => {
  if (world.zone?.id !== zoneId) return [];
  return world.puzzleViews().map(p => ({
    kind: 'event' as const, icon: '◈', color: PUZZLE_ACCENT,
    label: p.done ? `${cap(p.label)} — resolved` : cap(p.label),
    detail: p.done ? 'its gift is spent' : p.line,
  }));
});

// Off-screen chevron: only the OBJECTIVE riddle points (side riddles stay
// discoveries — the panel lists them, the world doesn't nag).
registerAttentionSource((world: World): AttentionPoint[] => {
  return world.puzzleViews()
    .filter(p => p.isObjective && !p.done)
    .map(p => ({
      id: `puzzle_${p.id}`, pos: p.pos, color: PUZZLE_ACCENT, glyph: '◈',
      label: p.label, z: 2,
    }));
});
