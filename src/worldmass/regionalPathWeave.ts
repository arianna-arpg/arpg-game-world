import { freezeData, massRandom } from './random';

export const regionalPathStyles = ['direct', 'meander', 'switchback', 'elbow', 'sweep'] as const;
export type RegionalPathStyle = typeof regionalPathStyles[number];
export interface RegionalPathPoint { x: number; y: number }
/** Saved edge-local steering. Amplitude is a fraction of the parent separation,
 * never a corridor width: the native terrain owner still paints body clearance. */
export interface RegionalPathWeave {
  source: string; version: 1;
  styles: readonly { style: RegionalPathStyle; weight: number }[];
  amplitude: readonly [number, number];
  turns: readonly [number, number];
  samples: readonly [number, number];
  taper: readonly [number, number];
}
export function defaultRegionalPathWeave(): RegionalPathWeave {
  return freezeData({ source: 'worldmass/regional-path-weave-v1', version: 1,
    styles: [{ style: 'direct', weight: 1 }, { style: 'meander', weight: 4 },
      { style: 'switchback', weight: 3 }, { style: 'elbow', weight: 3 }, { style: 'sweep', weight: 3 }],
    amplitude: [.12, .22], turns: [1, 3], samples: [20, 32], taper: [.16, .28] });
}
export function validateRegionalPathWeave(policy: RegionalPathWeave): void {
  const range = (value: readonly number[], lo: number, hi: number, integer = false): boolean =>
    Array.isArray(value) && value.length === 2 && value.every(n => Number.isFinite(n)
      && n >= lo && n <= hi && (!integer || Number.isSafeInteger(n))) && value[0] <= value[1];
  if (!policy || policy.version !== 1 || typeof policy.source !== 'string' || !policy.source || policy.source.length > 256
    || !Array.isArray(policy.styles) || !policy.styles.length || policy.styles.length > regionalPathStyles.length
    || policy.styles.some((row: { style: RegionalPathStyle; weight: number }) => !row || !regionalPathStyles.includes(row.style)
      || !Number.isFinite(row.weight) || row.weight <= 0 || row.weight > 100)
    || new Set(policy.styles.map((row: { style: RegionalPathStyle }) => row.style)).size !== policy.styles.length
    || !range(policy.amplitude, .04, .22) || !range(policy.turns, 1, 3, true)
    || !range(policy.samples, 12, 32, true) || !range(policy.taper, .12, .3))
    throw Error('Invalid regional path weave');
}
const smooth = (t: number): number => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };
type SteeringKnot = { t: number; y: number };
function steering(knots: readonly SteeringKnot[], t: number, round: boolean): number {
  for (let i = 1; i < knots.length; i++) {
    const a = knots[i - 1], b = knots[i];
    if (t > b.t) continue;
    const along = Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t)));
    return a.y + (b.y - a.y) * (round ? smooth(along) : along);
  }
  return knots[knots.length - 1].y;
}

/** A fresh namespaced cursor never consumes topology, court, shoulder or child
 * draws. Canonical endpoint framing makes reverse traversal retrace precisely
 * the same geometry. Longitudinal progress is strictly monotone; lateral
 * steering stays inside .22 * gap and tapers to exact shared node centers.
 * This is a centerline contract, not a proof about later rasterized corridors:
 * the caller must still verify native widths and nonincident route separation. */
export function regionalWovenPath(policy: RegionalPathWeave, seed: number, attempt: number, edge: number,
  start: RegionalPathPoint, end: RegionalPathPoint, gap: number): Readonly<{ style: RegionalPathStyle; points: RegionalPathPoint[] }> {
  validateRegionalPathWeave(policy);
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff
    || !Number.isSafeInteger(attempt) || attempt < 0 || !Number.isSafeInteger(edge) || edge < 0
    || !start || !end || ![start.x, start.y, end.x, end.y].every(v => Number.isFinite(v) && Math.abs(v) <= 1048576)
    || !Number.isFinite(gap) || gap <= 0 || gap > 4096) throw Error('Invalid regional path inputs');
  const reverse = start.x > end.x || start.x === end.x && start.y > end.y;
  const a = reverse ? end : start, b = reverse ? start : end;
  const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
  if (length < 1e-6) throw Error('Regional path needs separate endpoints');
  const ux = dx / length, uy = dy / length;
  const rng = massRandom(seed, [policy.source, policy.version, 'edge', attempt, edge]);
  const style = rng.weighted(policy.styles).style, amplitude = rng.range(...policy.amplitude) * Math.min(gap, length);
  const turns = rng.int(...policy.turns), samples = rng.int(...policy.samples), taper = rng.range(...policy.taper);
  const side = rng.chance(.5) ? -1 : 1, skew = rng.range(-.065, .065);
  let knots: SteeringKnot[];
  if (style === 'direct') knots = [{ t: 0, y: 0 }, { t: 1, y: 0 }];
  else if (style === 'sweep') {
    // A broad asymmetrical shoulder stays apparent after the court interiors
    // cover the ends of the route. Its peak always lies in the exposed middle.
    knots = [{ t: 0, y: 0 }, { t: .23 + skew, y: rng.range(.35, .6) },
      { t: .5 + skew * .35, y: 1 }, { t: .77 + skew, y: rng.range(.35, .6) }, { t: 1, y: 0 }];
  } else if (style === 'elbow') {
    const enter = .35 + skew, leave = .65 + skew;
    knots = [{ t: 0, y: 0 }, { t: enter - .11, y: rng.range(0, .18) },
      { t: enter, y: 1 }, { t: leave, y: rng.range(.78, 1) },
      { t: leave + .11, y: rng.range(0, .18) }, { t: 1, y: 0 }];
  } else {
    // Alternate real lateral seats through the visible middle, rather than
    // spending all curvature under the large endpoint courts. More turns are
    // still longitudinally ordered. Graph admission rejects nonincident
    // crossings; finite body-route probes measure detours after rasterization.
    const courtFraction = .455 * Math.min(gap, length) / length, minimumPeak = amplitude * .8 / length;
    const enter = Math.max(.36, Math.min(.47, Math.sqrt(Math.max(0, courtFraction * courtFraction - minimumPeak * minimumPeak)) + .018));
    const core = turns === 1 ? [.5 + skew * .1]
      : Array.from({ length: turns }, (_, i) => enter + (1 - enter * 2) * i / (turns - 1) + skew * .03);
    knots = [{ t: 0, y: 0 }, { t: .2 + skew, y: -.35 }];
    core.forEach((t, i) => knots.push({ t, y: (i % 2 ? -1 : 1) * (i === 0 ? 1 : rng.range(.8, 1)) }));
    knots.push({ t: .8 + skew, y: (turns % 2 ? -1 : 1) * .35 }, { t: 1, y: 0 });
  }
  // Include authored extrema as well as regular samples. This keeps a maximum
  // lateral turn from disappearing between samples; the bound is 39 intervals
  // even at the largest saved sample/turn counts.
  const seats = [...new Set([...Array.from({ length: samples + 1 }, (_, i) => i / samples), ...knots.map(k => k.t)])].sort((x, y) => x - y);
  const points = seats.map(t => {
    if (t === 0) return { x: a.x, y: a.y };
    if (t === 1) return { x: b.x, y: b.y };
    const feather = smooth(t / taper) * smooth((1 - t) / taper);
    const lateral = side * amplitude * feather * steering(knots, t, style !== 'switchback');
    return { x: a.x + dx * t - uy * lateral, y: a.y + dy * t + ux * lateral };
  });
  if (reverse) points.reverse();
  return freezeData({ style, points });
}
