import type { MassLandformShape } from './landforms';

/** Only actual native cells and their untouched, body-wide local apron reserve
 * a host. Transparent far corners are not part of a natural motif's footprint. */
export interface RegionalMotifSupport {
  runs: readonly { x: number; y: number; length: number }[];
  radius: number;
}
export const regionalMotifFeather = 4; // 120 world units at the pinned native cell grain.
const cachedRegionalMotifs = new WeakMap<MassLandformShape, RegionalMotifSupport>();
export function regionalMotifSupport(child: MassLandformShape): RegionalMotifSupport {
  const cached = cachedRegionalMotifs.get(child); if (cached) return cached;
  const m = child.rows.length, pad = regionalMotifFeather, size = m + pad * 2;
  const mask = new Uint8Array(size * size);
  for (let y = 0; y < m; y++) for (let x = 0; x < m; x++) if (child.rows[y][x] !== '.')
    for (let dy = -pad; dy <= pad; dy++) for (let dx = -pad; dx <= pad; dx++)
      mask[(y + pad + dy) * size + x + pad + dx] = 1;
  const runs: { x: number; y: number; length: number }[] = [];
  let radius = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size;) {
    if (!mask[y * size + x]) { x++; continue; }
    const start = x; while (x < size && mask[y * size + x]) x++;
    const row = { x: start - pad, y: y - pad, length: x - start };
    runs.push(Object.freeze(row));
    for (const end of [row.x, row.x + row.length - 1])
      radius = Math.max(radius, Math.hypot(end - (m - 1) / 2, row.y - (m - 1) / 2));
  }
  const support = Object.freeze({ runs: Object.freeze(runs), radius });
  // Saved source rows are frozen. Mutable test/source drafts never poison a
  // cached proof if their contents subsequently change.
  if (Object.isFrozen(child) && Object.isFrozen(child.rows)) cachedRegionalMotifs.set(child, support);
  return support;
}
export interface RegionalMotifFloor { size: number; prefix: Uint16Array }
/** Per-row prefix sums keep a complete support proof bounded by its row runs,
 * including both original floor and later protected-site composition. */
export function regionalMotifRows(rows: readonly (readonly string[] | string)[], foundation?: readonly string[],
  reservations?: Uint8Array): RegionalMotifFloor {
  const size = rows.length, stride = size + 1, prefix = new Uint16Array(size * stride);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++)
    prefix[y * stride + x + 1] = prefix[y * stride + x]
      + (rows[y][x] !== 'g' || foundation && foundation[y][x] !== 'g' || reservations?.[y * size + x] ? 1 : 0);
  return { size, prefix };
}
export function regionalMotifFits(floor: RegionalMotifFloor, support: RegionalMotifSupport, x: number, y: number): boolean {
  const n = floor.size, stride = n + 1;
  for (const run of support.runs) {
    const yy = y + run.y, xx = x + run.x, end = xx + run.length;
    if (yy < 0 || yy >= n || xx < 0 || end > n
      || floor.prefix[yy * stride + end] !== floor.prefix[yy * stride + xx]) return false;
  }
  return true;
}
export function reserveRegionalMotif(reservations: Uint8Array, size: number, support: RegionalMotifSupport, x: number, y: number): void {
  for (const run of support.runs)
    reservations.fill(1, (y + run.y) * size + x + run.x, (y + run.y) * size + x + run.x + run.length);
}
