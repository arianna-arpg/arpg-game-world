// ---------------------------------------------------------------------------
// THE OMEN FABRIC — the world MURMURS about what waits unfound.
//
// The forechart (world/forechart.ts) lets events seat themselves in country
// the player has never seen. This registry is the other half of that bargain
// — the FINDABILITY GUARANTEE: every seated, unfound event may publish an
// OMEN, and the world whispers it to a player who wanders near — a bearing,
// a flavor line, never a map pin — then, closer still (or as the omen AGES
// and its voice carries farther), a REVEAL that surveys the seat onto the
// map. Nothing waits forever in silence; nothing is handed over either.
//
// Mirrors mapMarkers/bulletins/attention: a feature registers an OmenSource
// at import time — a pure read of its own overlay state — and the engine's
// single pass (World.updateOmens) does the murmuring. Harbors listen too:
// the harbor board (data/ports.ts) surfaces FAR omens as hearsay rows, with
// purchasable charts that trigger the same reveal machinery.
//
// DESIGN LAW — events that swore silence keep it: the Crusade announces
// nothing until walked (its doctrine); the Conclave incubates in secret.
// An omen is an opt-in per event, never an obligation.
// ---------------------------------------------------------------------------

import type { MapCoord } from './coords';
import type { World } from '../engine/world';

export interface Omen {
  /** Stable per event INSTANCE (whisper/reveal memory keys on it). */
  id: string;
  /** Where the thing waits (node space). */
  at: MapCoord;
  /** The seat's zone id when zone-anchored — the reveal surveys THIS zone.
   *  Coord-only omens (a marching column) whisper but never self-reveal. */
  zoneId?: string;
  /** Whisper accent colour (the owning event's palette). */
  color?: string;
  /** Whisper line pool — one is rolled per whisper. `{bearing}` expands to
   *  the compass word toward the seat; `{dist}` to a distance band word. */
  lines: string[];
  /** Node-unit radius the whisper carries at age 0. */
  whisper: number;
  /** Node-unit radius the REVEAL carries (0/absent = whisper-only). */
  reveal?: number;
  /** THE GUARANTEE: both radii widen by this many node-units per MINUTE the
   *  omen stands — an unfound seat's shadow grows until someone trips it. */
  widenPerMin?: number;
  /** The owning event's own clock, seconds (drives the widening). */
  age: number;
  /** The dimension this omen belongs to (default 'surface'). */
  dimension?: string;
}

export type OmenSource = (world: World) => Omen[];

/** Fabric levers — one place, never inline. */
export const OMEN_CFG = {
  /** Seconds between omen passes (a murmur cadence, not a combat one). */
  checkSec: 2.5,
  /** A given omen whispers to the same ears at most once per this many
   *  seconds — the world murmurs, it does not nag. */
  whisperCooldownSec: 300,
  /** Distance bands for the `{dist}` word (node units, ascending). */
  distBands: [
    { upTo: 220, word: 'close by' },
    { upTo: 460, word: 'a hard walk out' },
    { upTo: Infinity, word: 'far off' },
  ],
  /** Whisper toast look (bulletin-adjacent, but hushed). */
  color: '#b8a8d8',
  size: 14,
};

const SOURCES: OmenSource[] = [];

/** Register an omen source (called once at boot per feature, import-time). */
export function registerOmenSource(s: OmenSource): void { SOURCES.push(s); }

/** Resolve every source (a source that throws is skipped — one bad murmur
 *  never silences the rest). */
export function collectOmens(world: World): Omen[] {
  const out: Omen[] = [];
  for (const s of SOURCES) {
    try { out.push(...s(world)); } catch { /* hushed */ }
  }
  return out;
}

/** An omen's CURRENT radii, aged by its widening rate. */
export function omenReach(o: Omen): { whisper: number; reveal: number } {
  const widen = (o.widenPerMin ?? 0) * (o.age / 60);
  return { whisper: o.whisper + widen, reveal: (o.reveal ?? 0) > 0 ? (o.reveal ?? 0) + widen : 0 };
}

/** The compass word from `from` toward `to` (eight winds). */
export function bearingWord(from: MapCoord, to: MapCoord): string {
  const a = Math.atan2(to.y - from.y, to.x - from.x); // screen-space: +y = south
  const octant = Math.round(a / (Math.PI / 4));
  switch (((octant % 8) + 8) % 8) {
    case 0: return 'east';
    case 1: return 'south-east';
    case 2: return 'south';
    case 3: return 'south-west';
    case 4: return 'west';
    case 5: return 'north-west';
    case 6: return 'north';
    default: return 'north-east';
  }
}

/** The `{dist}` band word for a node-unit distance. */
export function distWord(d: number): string {
  for (const b of OMEN_CFG.distBands) if (d <= b.upTo) return b.word;
  return OMEN_CFG.distBands[OMEN_CFG.distBands.length - 1].word;
}

/** Expand an omen line's placeholders for a listener at `from`. */
export function omenLine(o: Omen, line: string, from: MapCoord): string {
  const d = Math.hypot(o.at.x - from.x, o.at.y - from.y);
  return line
    .replace('{bearing}', bearingWord(from, o.at))
    .replace('{dist}', distWord(d));
}
