import { latticeAt, type MassAddress } from './address';
import { massHash } from './random';

function latticeSample(at: MassAddress, gx: bigint, gy: bigint, salt: number): number {
  return massHash(JSON.stringify([at.dimension, gx.toString(), gy.toString()]), salt) / 0x100000000;
}

/** Smooth geographic noise. Full integer cells survive negative boundaries and
 * distant frames; residency and the current camera never enter the sample. */
export function massNoise(at: MassAddress, span: number, period: number, salt: number, periodY = period): number {
  const x = latticeAt(at, span, period);
  const y = periodY === period ? x : latticeAt(at, span, periodY);
  const a = latticeSample(at, x.gx, y.gy, salt), b = latticeSample(at, x.gx + 1n, y.gy, salt);
  const c = latticeSample(at, x.gx, y.gy + 1n, salt), d = latticeSample(at, x.gx + 1n, y.gy + 1n, salt);
  const sx = x.fx * x.fx * (3 - 2 * x.fx), sy = y.fy * y.fy * (3 - 2 * y.fy);
  return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
}
