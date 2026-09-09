// Finite, terrain-oriented scarps. Map drawing, route checks and local terrain
// sample these same segments and the same traversable pass.
import { hash01 } from '../engine/hash';
import { climateAxisAt, registerClimateInvalidation } from './climate';
import { continentAt, continentSeedFrom } from './continents';
import { geographyVersion } from './geography';
import type { Dir, MapCoord } from './coords';

export const ESCARPMENT_CFG = {
  span: 1100, chance: 0.42, minElevation: 0.52, gradientStep: 140, minRise: 0.045,
  length: [260, 500] as readonly [number, number], reach: 110, passHalfWidth: 52,
  rimWidth: 90, salt: 0x5ca2f,
  ascentLocale: 'cliff_ascent', footLocale: 'cliff_foothills',
  river: { width: 100, bend: 0.03, region: 'locale_river', crossing: 'locale_bridge' },
};
export interface Escarpment {
  id: string; seed: number; a: MapCoord; b: MapCoord; seat: MapCoord;
  normal: MapCoord; passHalfWidth: number;
}
export interface EscarpmentContext extends Escarpment {
  mode: 'pass' | 'foot'; highSide: Dir; blockedSide?: Dir;
}
export const cardinal = (v: MapCoord): Dir => Math.abs(v.x) > Math.abs(v.y) ? v.x > 0 ? 'e' : 'w' : v.y > 0 ? 's' : 'n';
const memo = new Map<string, Escarpment | null>();
export function resetEscarpments(): void { memo.clear(); }
registerClimateInvalidation(resetEscarpments);
function scarpCell(gx: number, gy: number, seed: number): Escarpment | null {
  const key = `${seed}/${gx}/${gy}`;
  if (memo.has(key)) return memo.get(key)!;
  const c = ESCARPMENT_CFG;
  let out: Escarpment | null = null;
  if (hash01(gx, gy, seed ^ c.salt) < c.chance) {
    const seat = { x: (gx + 0.2 + hash01(gx, gy, seed ^ 713) * 0.6) * c.span,
      y: (gy + 0.2 + hash01(gy, gx, seed ^ 731) * 0.6) * c.span };
    const elev = (x: number, y: number) => climateAxisAt({ x, y }, seed, 'elevation');
    const dx = elev(seat.x + c.gradientStep, seat.y) - elev(seat.x - c.gradientStep, seat.y);
    const dy = elev(seat.x, seat.y + c.gradientStep) - elev(seat.x, seat.y - c.gradientStep);
    const rise = Math.hypot(dx, dy);
    if (rise >= c.minRise && elev(seat.x, seat.y) >= c.minElevation) {
      const normal = { x: dx / rise, y: dy / rise };
      const half = (c.length[0] + hash01(gx, gy, seed ^ 937) * (c.length[1] - c.length[0])) / 2;
      const a = { x: seat.x - normal.y * half, y: seat.y + normal.x * half };
      const b = { x: seat.x + normal.y * half, y: seat.y - normal.x * half };
      if ([a, seat, b].every(p => continentAt(p, continentSeedFrom(seed)).kind === 'land')) {
        out = { id: `scarp:${gx}_${gy}`, seed, seat, a, b, normal, passHalfWidth: c.passHalfWidth };
      }
    }
  }
  if (memo.size > 8192) memo.clear();
  memo.set(key, out);
  return out;
}
export function escarpmentsInRect(min: MapCoord, max: MapCoord, seed: number): Escarpment[] {
  if (geographyVersion(seed) < 2) return [];
  const c = ESCARPMENT_CFG, pad = c.length[1] / 2 + c.reach;
  const out: Escarpment[] = [];
  for (let y = Math.floor((min.y - pad) / c.span); y <= Math.floor((max.y + pad) / c.span); y++) {
    for (let x = Math.floor((min.x - pad) / c.span); x <= Math.floor((max.x + pad) / c.span); x++) {
      const s = scarpCell(x, y, seed);
      if (s && s.seat.x >= min.x - pad && s.seat.x <= max.x + pad && s.seat.y >= min.y - pad && s.seat.y <= max.y + pad) out.push(structuredClone(s));
    }
  }
  return out;
}
export function scarpDistance(p: MapCoord, s: Escarpment): number {
  const dx = s.b.x - s.a.x, dy = s.b.y - s.a.y;
  const t = Math.max(0, Math.min(1, ((p.x - s.a.x) * dx + (p.y - s.a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.x - s.a.x - dx * t, p.y - s.a.y - dy * t);
}
export function escarpmentAt(p: MapCoord, seed: number): EscarpmentContext | undefined {
  const s = escarpmentsInRect(p, p, seed).filter(s => scarpDistance(p, s) <= ESCARPMENT_CFG.reach)
    .sort((a, b) => scarpDistance(p, a) - scarpDistance(p, b) || a.id.localeCompare(b.id))[0];
  if (!s) return undefined;
  const highSide = cardinal(s.normal), pass = Math.abs((p.x - s.seat.x) * -s.normal.y + (p.y - s.seat.y) * s.normal.x) <= s.passHalfWidth;
  const signed = (p.x - s.seat.x) * s.normal.x + (p.y - s.seat.y) * s.normal.y;
  const toward = signed <= 0 ? s.normal : { x: -s.normal.x, y: -s.normal.y };
  return { ...s, highSide, mode: pass ? 'pass' : 'foot', ...(pass ? {} : { blockedSide: cardinal(toward) }) };
}
/** A segment may cross a cliff only through its drawn pass, or around its end. */
export function escarpmentRoad(a: MapCoord, b: MapCoord, seed: number): boolean {
  const min = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) }, max = { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) };
  for (const s of escarpmentsInRect(min, max, seed)) {
    const da = (a.x - s.seat.x) * s.normal.x + (a.y - s.seat.y) * s.normal.y;
    const db = (b.x - s.seat.x) * s.normal.x + (b.y - s.seat.y) * s.normal.y;
    if ([a, b].some(p => scarpDistance(p, s) < 0.001 && Math.hypot(p.x - s.seat.x, p.y - s.seat.y) > s.passHalfWidth)) return false;
    if (da * db >= 0 || da === db) continue;
    const t = da / (da - db), p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    if (scarpDistance(p, s) < 0.01 && Math.hypot(p.x - s.seat.x, p.y - s.seat.y) > s.passHalfWidth) return false;
  }
  return true;
}

/** Passes crossed by a road, including steps that overshoot the seat catchment. */
export function escarpmentPassesCrossed(a: MapCoord, b: MapCoord, seed: number): Escarpment[] {
  return escarpmentsInRect({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) },
    { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) }, seed).filter(s => {
      const da = (a.x - s.seat.x) * s.normal.x + (a.y - s.seat.y) * s.normal.y;
      const db = (b.x - s.seat.x) * s.normal.x + (b.y - s.seat.y) * s.normal.y;
      if (da * db >= 0) return false;
      const t = da / (da - db);
      return Math.hypot(a.x + (b.x - a.x) * t - s.seat.x, a.y + (b.y - a.y) * t - s.seat.y) <= s.passHalfWidth;
    });
}
