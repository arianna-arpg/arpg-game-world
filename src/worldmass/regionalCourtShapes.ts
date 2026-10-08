import { freezeData, massRandom } from './random';

export const regionalCourtFamilies = ['circle', 'ellipse', 'beveled_hall', 'kite', 'scalloped', 'cleft', 'polygon', 'cross',
  'fan', 'hammerhead', 'fork', 'terrace'] as const;
const sculptedRegionalCourtFamilies = ['fan', 'hammerhead', 'fork', 'terrace'] as const;
export type RegionalCourtFamily = typeof regionalCourtFamilies[number];
/** Saved shape vocabulary and bounded proportions. The graph owns connectivity;
 * these independent rules own each court's outline inside its original radius. */
export interface RegionalCourtMorphology {
  source: string; version: 1 | 2;
  families: readonly { family: RegionalCourtFamily; weight: number }[];
  aspect: readonly [number, number]; depth: readonly [number, number];
  lobes: readonly [number, number]; facets: readonly [number, number];
}
export interface RegionalCourtProfile {
  family: RegionalCourtFamily; angle: number; aspect: number; depth: number;
  lobes: number; phase: number;
  /** Unit-radius, unrotated vertices; the implicit origin stays inside. */
  vertices?: readonly { x: number; y: number }[];
}
export function defaultRegionalCourtMorphology(): RegionalCourtMorphology {
  return freezeData({ source: 'worldmass/regional-court-morphology-v1', version: 1,
    families: [{ family: 'circle', weight: 1 }, { family: 'ellipse', weight: 2 },
      { family: 'beveled_hall', weight: 3 }, { family: 'kite', weight: 2 },
      { family: 'scalloped', weight: 3 }, { family: 'cleft', weight: 2 },
      { family: 'polygon', weight: 3 }, { family: 'cross', weight: 2 }],
    aspect: [.68, .96], depth: [.16, .36], lobes: [3, 7], facets: [4, 9] });
}
/** The second vocabulary is explicit saved data. Historical factory weights,
 * namespace and profiles stay unchanged; new worlds opt into these additions. */
export function sculptedRegionalCourtMorphology(): RegionalCourtMorphology {
  const historical = defaultRegionalCourtMorphology();
  return freezeData<RegionalCourtMorphology>({ ...historical, source: 'worldmass/regional-court-morphology-v2', version: 2,
    families: [...historical.families, ...sculptedRegionalCourtFamilies.map(family => ({ family, weight: 3 }))] });
}
/** Admission checks saved bounds, not a live default or mutable family table. */
export function validateRegionalCourtMorphology(value: RegionalCourtMorphology): void {
  const range = (v: readonly number[], lo: number, hi: number, integer = false): boolean =>
    Array.isArray(v) && v.length === 2 && v.every(n => Number.isFinite(n) && n >= lo && n <= hi && (!integer || Number.isSafeInteger(n))) && v[0] <= v[1];
  if (!value || ![1, 2].includes(value.version) || typeof value.source !== 'string' || !value.source || value.source.length > 256
    || !Array.isArray(value.families) || !value.families.length || value.families.length > regionalCourtFamilies.length
    || value.families.some((entry: { family: RegionalCourtFamily; weight: number }) => !entry || !regionalCourtFamilies.includes(entry.family)
      || value.version === 1 && sculptedRegionalCourtFamilies.some(family => family === entry.family)
      || !Number.isFinite(entry.weight) || entry.weight <= 0 || entry.weight > 100)
    || new Set(value.families.map((entry: { family: RegionalCourtFamily }) => entry.family)).size !== value.families.length
    || !range(value.aspect, .6, 1) || !range(value.depth, .08, .4)
    || !range(value.lobes, 3, 8, true) || !range(value.facets, 4, 10, true)) throw Error('Invalid regional court morphology');
}

/** Different node seats never consume the graph, shoulder or child cursor.
 * Optional omission therefore reproduces all pre-morphology source bytes. */
export function regionalCourtProfile(policy: RegionalCourtMorphology, seed: number, attempt: number, node: number): RegionalCourtProfile {
  const rng = massRandom(seed, [policy.source, policy.version, 'court', attempt, node]);
  const family = rng.weighted(policy.families).family, angle = rng.range(0, Math.PI * 2),
    aspect = rng.range(...policy.aspect), depth = rng.range(...policy.depth), lobes = rng.int(...policy.lobes), phase = rng.range(0, Math.PI * 2);
  const profile: RegionalCourtProfile = { family, angle, aspect, depth, lobes, phase };
  let vertices: { x: number; y: number }[] | undefined;
  if (family === 'beveled_hall') {
    const bevelX = depth, bevelY = depth * aspect;
    vertices = [{ x: 1 - bevelX, y: -aspect }, { x: 1, y: -aspect + bevelY },
      { x: 1, y: aspect - bevelY }, { x: 1 - bevelX, y: aspect },
      { x: -1 + bevelX, y: aspect }, { x: -1, y: aspect - bevelY },
      { x: -1, y: -aspect + bevelY }, { x: -1 + bevelX, y: -aspect }];
  } else if (family === 'kite') {
    const back = rng.range(.76, .98), skew = rng.range(-.12, .12);
    vertices = [{ x: 1, y: 0 }, { x: skew, y: aspect }, { x: -back, y: 0 }, { x: skew, y: -aspect }];
  } else if (family === 'polygon') {
    const facets = rng.int(...policy.facets), step = Math.PI * 2 / facets;
    vertices = Array.from({ length: facets }, (_, i) => {
      const a = i * step + rng.range(-.14, .14) * step, radius = 1 - depth * rng.next();
      return { x: Math.cos(a) * radius, y: Math.sin(a) * radius * aspect };
    });
  } else if (family === 'cross') {
    const neck = .56 - depth * .25;
    vertices = [{ x: neck, y: -1 }, { x: neck, y: -neck }, { x: 1, y: -neck }, { x: 1, y: neck },
      { x: neck, y: neck }, { x: neck, y: 1 }, { x: -neck, y: 1 }, { x: -neck, y: neck },
      { x: -1, y: neck }, { x: -1, y: -neck }, { x: -neck, y: -neck }, { x: -neck, y: -1 }]
      .map(p => ({ x: p.x, y: p.y * aspect }));
  } else if (family === 'fan') {
    // A broad faceted head opens from a narrow rear court. The arc spans only
    // the forward side, distinguishing a fan from another full radial rosette.
    const opening = rng.range(1.04, 1.34), slices = rng.int(4, 7), neck = rng.range(.4, .55), back = rng.range(.55, .78);
    vertices = [{ x: -back, y: -neck }, ...Array.from({ length: slices + 1 }, (_, i) => {
      const a = -opening + 2 * opening * i / slices, r = i === 0 || i === slices ? rng.range(.9, 1) : 1;
      return { x: Math.cos(a) * r, y: Math.sin(a) * r };
    }), { x: -back, y: neck }, { x: -back - .08, y: 0 }].map(p => ({ x: p.x, y: p.y * aspect }));
  } else if (family === 'hammerhead') {
    // An open crossbar with a single deep stem: the broad head and two
    // recessed shoulders are not produced by the old four-armed cross.
    const top = rng.range(.67, .91), shoulder = rng.range(.32, .46), neck = rng.range(.4, .55), stem = rng.range(.87, 1);
    vertices = [{ x: -1, y: -top }, { x: 1, y: -top }, { x: 1, y: shoulder },
      { x: neck, y: shoulder }, { x: neck, y: stem }, { x: -neck, y: stem },
      { x: -neck, y: shoulder }, { x: -1, y: shoulder }].map(p => ({ x: p.x, y: p.y * aspect }));
  } else if (family === 'fork') {
    // Two broad forward tines and an unequal rear stem share the protected
    // center. The forward notch is dry-core bounded, never a disconnected tip.
    const spread = rng.range(.63, .95), half = rng.range(.18, .25), notch = rng.range(.42, .54);
    const rays = [
      { a: -Math.PI, r: rng.range(.86, 1) }, { a: -2.55, r: rng.range(.62, .76) },
      { a: -1.75, r: rng.range(.45, .56) }, { a: -spread - half, r: rng.range(.85, .94) },
      { a: -spread, r: 1 }, { a: -spread + half, r: rng.range(.86, .96) }, { a: 0, r: notch },
      { a: spread - half, r: rng.range(.86, .96) }, { a: spread, r: rng.range(.91, 1) },
      { a: spread + half, r: rng.range(.85, .94) }, { a: 1.75, r: rng.range(.45, .56) },
      { a: 2.55, r: rng.range(.62, .76) },
    ];
    vertices = rays.map(p => ({ x: Math.cos(p.a) * p.r, y: Math.sin(p.a) * p.r * aspect }));
  } else if (family === 'terrace') {
    // Each quadrant rises through different broad steps. Monotone polar
    // order makes every ledge visible from the center without undercut pockets.
    const left = rng.range(.63, .76), right = rng.range(.56, .72), top = rng.range(.78, .91), bottom = rng.range(.76, .94),
      crown = rng.range(.19, .31), upper = rng.range(.39, .53), lower = rng.range(.27, .4), foot = rng.range(.28, .41);
    vertices = [{ x: -1, y: -upper }, { x: -left, y: -upper }, { x: -left, y: -top },
      { x: -crown, y: -top }, { x: -crown, y: -1 }, { x: crown, y: -1 },
      { x: crown, y: -top }, { x: right, y: -top }, { x: right, y: -upper }, { x: 1, y: -upper },
      { x: 1, y: lower }, { x: right, y: lower }, { x: right, y: .64 },
      { x: foot, y: .64 }, { x: foot, y: bottom }, { x: -foot, y: bottom },
      { x: -foot, y: .58 }, { x: -left, y: .58 }, { x: -left, y: lower }, { x: -1, y: lower }]
      .map(p => ({ x: p.x, y: p.y * aspect }));
  }
  if (vertices) {
    const outer = Math.max(...vertices.map(p => Math.hypot(p.x, p.y)));
    profile.vertices = vertices.map(p => ({ x: p.x / outer, y: p.y / outer }));
  }
  return profile;
}

/** The radial contract guarantees a dry central disk of .4r and an outer
 * envelope no larger than r. Every profile is star-shaped about its graph node;
 * bays and recessed corners never create detached floor islands. */
export function regionalCourtRadius(profile: RegionalCourtProfile, angle: number): number {
  if (profile.family === 'circle') return 1;
  const a = angle - profile.angle, ux = Math.cos(a), uy = Math.sin(a);
  let radius = 1 / Math.sqrt(ux * ux + uy * uy / (profile.aspect * profile.aspect));
  if (profile.vertices) {
    radius = Infinity;
    for (let i = 0; i < profile.vertices.length; i++) {
      const p = profile.vertices[i], q = profile.vertices[(i + 1) % profile.vertices.length], dx = q.x - p.x, dy = q.y - p.y;
      const cross = ux * dy - uy * dx;
      if (Math.abs(cross) < 1e-12) continue;
      const t = (p.x * dy - p.y * dx) / cross, s = (p.x * uy - p.y * ux) / cross;
      if (t >= 0 && s >= -1e-10 && s <= 1 + 1e-10) radius = Math.min(radius, t);
    }
  } else if (profile.family === 'scalloped') {
    radius *= 1 - profile.depth * (.5 + .5 * Math.cos(profile.lobes * a + profile.phase));
  } else if (profile.family === 'cleft') {
    const delta = Math.atan2(Math.sin(a - profile.phase), Math.cos(a - profile.phase)), width = .3 + profile.depth;
    radius *= 1 - profile.depth * Math.exp(-delta * delta / (width * width));
  }
  return Math.max(.4, Math.min(1, radius));
}
