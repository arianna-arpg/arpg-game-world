import { VIS_CFG } from './visConfig';
/** A role-first caption keeps objective membership readable even with long
 * modded names. The full name remains in the discovered map/place index. */
export function garrisonCaption(name: string, measure: (s: string) => number, room: number): string {
  const limit = Math.min(VIS_CFG.combatFocus.names.garrisonWidth, room);
  if (limit <= 0 || measure('…') > limit) return '';
  const text = 'Garrison · ' + name;
  if (measure(text) <= limit) return text;
  const points = [...text];
  while (points.length && measure(points.join('') + '…') > limit) points.pop();
  return points.join('') + '…';
}
