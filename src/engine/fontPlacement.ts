import type { ZoneDef } from '../data/zones';

/** Settlement service policy; explicit zone overrides support future authored sites. */
export const FONT_PLACEMENT = { safeSettlements: true, harbors: true };
export function fontStandsIn(zone: ZoneDef): boolean {
  return zone.font ?? (!zone.special && (
    (FONT_PLACEMENT.safeSettlements && zone.objective.kind === 'safe')
    || (FONT_PLACEMENT.harbors && !!zone.port)
  ));
}
