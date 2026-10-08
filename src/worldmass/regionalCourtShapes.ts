import { freezeData, massRandom } from './random';

export const regionalCourtFamilies = ['circle', 'ellipse', 'beveled_hall', 'kite', 'scalloped', 'cleft', 'polygon', 'cross'] as const;
export type RegionalCourtFamily = typeof regionalCourtFamilies[number];
/** Saved shape vocabulary and bounded proportions. The graph owns connectivity;
 * these independent rules own each court's outline inside its original radius. */
export interface RegionalCourtMorphology {
  source: string; version: 1;
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
/** Admission checks saved bounds, not a live default or mutable family table. */
export function validateRegionalCourtMorphology(value: RegionalCourtMorphology): void {
  const range = (v: readonly number[], lo: number, hi: number, integer = false): boolean =>
    Array.isArray(v) && v.length === 2 && v.every(n => Number.isFinite(n) && n >= lo && n <= hi && (!integer || Number.isSafeInteger(n))) && v[0] <= v[1];
  if (!value || value.version !== 1 || typeof value.source !== 'string' || !value.source || value.source.length > 256
    || !Array.isArray(value.families) || !value.families.length || value.families.length > regionalCourtFamilies.length
    || value.families.some((entry: { family: RegionalCourtFamily; weight: number }) => !entry || !regionalCourtFamilies.includes(entry.family)
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
