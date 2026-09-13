// ---------------------------------------------------------------------------
// THE SEAT LAW — power that reads the BOARD (engine/containers.ts).
//
// A container is a tetris board, and the debut law of THE RELIC LEGENDS
// (data/uniques/relics.ts) is that WHERE a piece sits can matter as much as
// what it says. Three amplifier MODES, each an ordinary registered stat a
// piece's own lines may carry (a unique line, a future affix, a vestige
// word), consumed by THE CONTAINER FOLD (World.recalcSeat) as one FACTOR per
// seated piece:
//   · outward   — every piece TOUCHING this one has its lines scaled by the
//                 value (the crown: seat it in the heart, ring it with charms);
//   · solitude  — this piece's OWN lines scale by the value PER open seat
//                 touching it that stands empty (the hermit: give it room);
//   · communion — this piece's OWN lines scale by the value PER piece
//                 touching it (the lodestone: crowd it).
//   factor = 1 + Σ outward worn by the pieces touching it
//              + solitude × empty seats against it
//              + communion × pieces against it        (floored at 0)
// THE SINGLE HOP: amplifier lines are read RAW — never scaled, never emitted
// to the sheet. A crown beside a crown amplifies the other's damage, not its
// crown; chains are impossible by construction (the conversion fabric's
// golden rule, worn by the board). Only FLAT amplifier lines count.
// TOUCHING is orthogonal adjacency of footprint cells over OPEN cells of the
// live board: a sealed cell is not a seat, so it is neither empty nor
// occupied. The geometry lives beside the board (containers.ts
// seatNeighbourhood / seatAmplification); this leaf owns the vocabulary so a
// data file names the stats without importing the fabric (no import cycle
// through itemgen → uniques → the legends).
//
// THE CASE GAUGE rides beside it: every registered container publishes a
// derived gauge `seated:<id>` — the count of pieces seated on its live board
// — so any line anywhere reads "per relic seated in your Reliquary" through
// the ordinary gauge axis (Modifier.gauge; registered in registerContainer).
// ---------------------------------------------------------------------------

import { STAT_DEFS, type Modifier } from './stats';

export type SeatAmplifierMode = 'outward' | 'solitude' | 'communion';

export interface SeatAmplifierDef {
  stat: string;
  mode: SeatAmplifierMode;
  label: string;
}

export const SEAT_POWER_PREFIX = 'seatPower_';

/** The stat id an amplifier mode reads: seatPower_<mode>. */
export function seatPowerStat(mode: SeatAmplifierMode): string {
  return SEAT_POWER_PREFIX + mode;
}

/** The registry, keyed by stat id — the fold's one read. */
export const SEAT_AMPLIFIERS: Record<string, SeatAmplifierDef> = {};

/** Register an amplifier mode's stat: the label + blurb land on the stat
 *  registry (the seatPower_ family seat in data/sheet.ts serves the sheet). */
export function registerSeatAmplifier(def: { mode: SeatAmplifierMode; label: string; desc: string }): string {
  const stat = seatPowerStat(def.mode);
  SEAT_AMPLIFIERS[stat] = { stat, mode: def.mode, label: def.label };
  STAT_DEFS[stat] = { label: def.label, base: 0, percent: true, desc: def.desc };
  return stat;
}

export function seatAmplifierOf(stat: string): SeatAmplifierDef | undefined {
  return SEAT_AMPLIFIERS[stat];
}

/** The sum of a piece's FLAT amplifier lines of one mode — raw, unscaled. */
export function seatPowerOf(mods: readonly Modifier[], mode: SeatAmplifierMode): number {
  let v = 0;
  for (const m of mods) if (m.kind === 'flat' && SEAT_AMPLIFIERS[m.stat]?.mode === mode) v += m.value;
  return v;
}

/** A piece's compiled lines under its factor: amplifier lines are CONSUMED
 *  (dropped — never scaled, never emitted), every other line's value scales
 *  by the factor. Returns the input itself when nothing would change. */
export function amplifySeatMods(mods: Modifier[], factor: number): Modifier[] {
  const hasAmp = mods.some(m => SEAT_AMPLIFIERS[m.stat] !== undefined);
  if (!hasAmp && factor === 1) return mods;
  const out: Modifier[] = [];
  for (const m of mods) {
    if (SEAT_AMPLIFIERS[m.stat]) continue;
    out.push(factor === 1 ? m : { ...m, value: m.value * factor });
  }
  return out;
}

export const SEATED_GAUGE_PREFIX = 'seated:';

/** THE CASE GAUGE id of a container: seated:<containerId>. */
export function seatedGaugeId(containerId: string): string {
  return SEATED_GAUGE_PREFIX + containerId;
}

// THE DEBUT ROWS (docs/engine/containers.md — THE SEAT LAW).
registerSeatAmplifier({
  mode: 'outward', label: 'Outward Seat Power',
  desc: 'Read from a container seat only: every piece touching this one has its lines scaled by this much.',
});
registerSeatAmplifier({
  mode: 'solitude', label: 'Solitude Seat Power',
  desc: 'Read from a container seat only: this piece\'s own lines scale by this much for every open seat touching it that stands empty.',
});
registerSeatAmplifier({
  mode: 'communion', label: 'Communion Seat Power',
  desc: 'Read from a container seat only: this piece\'s own lines scale by this much for every piece touching it.',
});
