/** Durable addresses use canonical decimal cells; physics stays in a local frame. */
export interface MassAddress { dimension: string; cx: string; cy: string; x: number; y: number }
export interface MassCell { dimension: string; cx: string; cy: string }
export interface MassPoint { x: number; y: number }

const CELL_MIN = -(1n << 63n), CELL_MAX = (1n << 63n) - 1n;
const DECIMAL = /^(0|-?[1-9][0-9]*)$/;
export function cellInteger(value: string): bigint {
  if (typeof value !== 'string' || value.length > 20 || !DECIMAL.test(value))
    throw new Error('World cell must be a canonical decimal integer');
  const n = BigInt(value);
  if (n < CELL_MIN || n > CELL_MAX) throw new RangeError('World cell exceeds signed 64-bit address range');
  return n;
}
export function validSpan(span: number): void {
  if (!Number.isSafeInteger(span) || span <= 0) throw new RangeError('World cell span must be a positive safe integer');
}
function axis(cell: string, offset: number, span: number): [string, number] {
  if (!Number.isFinite(offset) || Math.abs(offset) > Number.MAX_SAFE_INTEGER / 2)
    throw new RangeError('World offset exceeds precise local range');
  const step = Math.floor(offset / span);
  let n = cellInteger(cell) + BigInt(step), rest = offset - step * span;
  if (rest >= span) { n++; rest = 0; }
  if (n < CELL_MIN || n > CELL_MAX) throw new RangeError('World address overflow');
  return [n.toString(), rest === 0 ? 0 : rest];
}
export function address(dimension: string, cx: string, cy: string, x: number, y: number, span: number): MassAddress {
  validSpan(span);
  if (typeof dimension !== 'string' || !dimension || dimension.length > 128) throw new Error('World dimension needs a stable ID');
  const [ax, lx] = axis(cx, x, span), [ay, ly] = axis(cy, y, span);
  return { dimension, cx: ax, cy: ay, x: lx, y: ly };
}
export function moveAddress(at: MassAddress, delta: MassPoint, span: number): MassAddress {
  return address(at.dimension, at.cx, at.cy, at.x + delta.x, at.y + delta.y, span);
}
export function cellKey(at: MassCell): string {
  cellInteger(at.cx); cellInteger(at.cy);
  return JSON.stringify([at.dimension, at.cx, at.cy]);
}
/** Explicit bound prevents distant addresses silently losing pixel precision. */
export function localOffset(at: MassAddress, origin: MassAddress, span: number, maxCells = 4096): MassPoint {
  validSpan(span);
  if (at.dimension !== origin.dimension) throw new Error('Cannot subtract addresses in different dimensions');
  if (!Number.isSafeInteger(maxCells) || maxCells < 0 || maxCells * span > Number.MAX_SAFE_INTEGER / 2)
    throw new RangeError('Invalid local-frame bound');
  const dx = cellInteger(at.cx) - cellInteger(origin.cx), dy = cellInteger(at.cy) - cellInteger(origin.cy);
  const cap = BigInt(maxCells);
  if (dx < -cap || dx > cap || dy < -cap || dy > cap) throw new RangeError('Address lies outside local simulation frame');
  return { x: Number(dx) * span + at.x - origin.x, y: Number(dy) * span + at.y - origin.y };
}
export function neighborCell(at: MassCell, dx: number, dy: number): MassCell {
  if (!Number.isSafeInteger(dx) || !Number.isSafeInteger(dy)) throw new Error('Neighbor offsets must be integral');
  const cx = (cellInteger(at.cx) + BigInt(dx)).toString(), cy = (cellInteger(at.cy) + BigInt(dy)).toString();
  cellInteger(cx); cellInteger(cy);
  return { dimension: at.dimension, cx, cy };
}
export function floorDiv(a: bigint, b: bigint): bigint {
  if (b <= 0n) throw new RangeError('Divisor must be positive');
  const q = a / b;
  return a % b < 0n ? q - 1n : q;
}
/** Arbitrary integer-sized generation lattice, independent of residency pages. */
export function latticeAt(at: MassAddress, span: number, period: number): { gx: bigint; gy: bigint; fx: number; fy: number } {
  validSpan(span); validSpan(period);
  const p = BigInt(period);
  const one = (c: string, off: number): [bigint, number] => {
    if (!Number.isFinite(off)) throw new RangeError('Invalid lattice offset');
    const whole = Math.floor(off), fractional = off - whole;
    if (!Number.isSafeInteger(whole)) throw new RangeError('Imprecise lattice offset');
    const n = cellInteger(c) * BigInt(span) + BigInt(whole), g = floorDiv(n, p);
    return [g, (Number(n - g * p) + fractional) / period];
  };
  const [gx, fx] = one(at.cx, at.x), [gy, fy] = one(at.cy, at.y);
  return { gx, gy, fx, fy };
}
