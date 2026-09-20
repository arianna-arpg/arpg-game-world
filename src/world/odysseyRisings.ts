import { ODYSSEY_RISINGS } from '../data/odysseyRisings';

/** Only cadence belongs to the campaign. Living bodies use ordinary zone
 * memory; warnings are local commitments cancelled by travel or reload. */
export interface OdysseyRisingClock { nextAt: number; interval: number }
export type OdysseyRisingClocks = Record<string, OdysseyRisingClock>;

export function restoreRisingClocks(raw: unknown): OdysseyRisingClocks {
  const out: OdysseyRisingClocks = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const def of ODYSSEY_RISINGS) {
    const row = (raw as Record<string, OdysseyRisingClock>)[def.id];
    if (row && Number.isFinite(row.nextAt) && row.nextAt >= 0
      && Number.isFinite(row.interval) && row.interval > 0)
      out[def.id] = { nextAt: row.nextAt, interval: row.interval };
  }
  return out;
}
