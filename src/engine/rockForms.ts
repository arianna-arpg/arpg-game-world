// ---------------------------------------------------------------------------
// ROCK FORMS — the boulder painter's seed-rolled form grammar as ONE shared
// derivation (the projForms precedent: a single geometry table the renderer
// AND the sim consume). Every stone rolls its form from its position seed —
// mono boulder / split pair / shoulder outcrop — and until this fabric the
// sim ignored the roll entirely: every rock blocked as a full-radius disc
// while the painter drew a wobbled ~0.83r mass, or two offset lobes, or a
// shoulder with satellites. Now the painter draws these bodies and
// hitSurfaceOf resolves the SAME bodies as a union of lobe circles, so the
// pixels stay the contract per instance with zero per-kind renderer code.
//
// Opt-in is data: `DoodadRule.rockForm` carries the cluster chance + spire
// flag. The PAINTER prefers the rule's values over its own visual params
// (painters.ts boulder), so the two sources cannot drift — one row is both
// the look's grammar and the collision's.
// ---------------------------------------------------------------------------

import { hash01 } from './hash';
import type { HitShape } from './shapes';

/** One rolled stone body in the doodad's local frame (unrotated). `seed`
 *  feeds the painter's per-body silhouette wobble — shipping it here keeps
 *  the extracted roll byte-identical to what the painter always drew. */
export interface RockFormBody { cx: number; cy: number; r: number; seed: number }

/** A kind's form grammar (DoodadRule.rockForm). Mirrors the boulder
 *  painter's RockParams levers of the same names. */
export interface RockFormSpec { cluster?: number; spire?: boolean }

export const ROCK_FORM_CFG = {
  /** traceRock's rim wanders 0.88 ± wobble of each body radius — collision
   *  lobes stand at the MEAN, so crag tips read as crag, not as wall. */
  traceMean: 0.88,
  /** The painter's default cluster chance when no source speaks. */
  cluster: 0.45,
};

/** The boulder painter's per-stone seed — exactly its inline formula. */
export function rockSeedOf(x: number, y: number): number {
  return ((x * 13 + y * 7) | 0) >>> 0;
}

/** THE FORM ROLL — which bodies this stone grew. Constants are the boulder
 *  painter's own, extracted verbatim; retune them only in lockstep with the
 *  drawn look (they ARE the drawn look). */
export function rockFormBodies(seed: number, radius: number, spec: RockFormSpec): RockFormBody[] {
  const roll = hash01(seed, 91);
  const clusterChance = spec.spire ? 0 : (spec.cluster ?? ROCK_FORM_CFG.cluster);
  if (roll < clusterChance * 0.4 && radius > 12) {
    // SPLIT PAIR: one stone that cracked into two lobes across a rolled axis.
    const a = hash01(seed, 27) * Math.PI * 2;
    const g = radius * 0.34;
    return [
      { cx: Math.cos(a) * g, cy: Math.sin(a) * g, r: radius * 0.64, seed },
      { cx: -Math.cos(a) * g, cy: -Math.sin(a) * g, r: radius * 0.52, seed: seed + 13 },
    ];
  }
  if (roll < clusterChance && radius > 14) {
    // SHOULDER OUTCROP: a main mass with satellite stones at its skirt.
    const bodies: RockFormBody[] = [
      { cx: -radius * 0.12, cy: -radius * 0.08, r: radius * 0.72, seed },
    ];
    const sats = 2 + (seed % 2);
    for (let i = 0; i < sats; i++) {
      const a = hash01(i, seed + 41) * Math.PI * 2;
      const d = radius * (0.62 + hash01(i, seed + 47) * 0.16);
      bodies.push({
        cx: Math.cos(a) * d, cy: Math.sin(a) * d,
        r: radius * (0.24 + hash01(i, seed + 53) * 0.14), seed: seed + i * 7 + 3,
      });
    }
    return bodies;
  }
  // MONO: one centered boulder (spires stand a hair narrower).
  return [{ cx: 0, cy: 0, r: radius * (spec.spire ? 0.9 : 0.94), seed }];
}

/** Per-doodad surface memo: the roll is pure in (kind, pos, radius, rot) and
 *  rocks never move, resize or respin at runtime — clampPos and castRay ask
 *  for these surfaces in their hottest loops, so each instance derives once.
 *  (Single slot per doodad: every rockForm kind resolves all three channels
 *  at the same radius today — bodyScale-less by design.) */
const surfCache = new WeakMap<object, { kind: string; r: number; rot: number; shape: HitShape }>();

/** The rolled form as a HIT SURFACE: a lone centered lobe collapses to the
 *  exact-parity circle branch; anything more is a 'multi' union of lobe
 *  circles, offsets spun by the same `rot` the painter applies. */
export function rockSurfaceOf(
  d: { kind: string; pos: { x: number; y: number }; radius: number; rot?: number },
  r: number, spec: RockFormSpec,
): HitShape {
  const rot = d.rot ?? 0;
  const hit = surfCache.get(d);
  if (hit && hit.kind === d.kind && hit.r === r && hit.rot === rot) return hit.shape;
  const scale = r / d.radius; // channel radius over the visual radius the painter draws at
  const bodies = rockFormBodies(rockSeedOf(d.pos.x, d.pos.y), d.radius, spec);
  let shape: HitShape;
  if (bodies.length === 1) {
    // Mono is always centered — the classic disc, honestly sized.
    shape = { kind: 'circle', r: bodies[0].r * ROCK_FORM_CFG.traceMean * scale };
  } else {
    const cos = Math.cos(rot), sin = Math.sin(rot);
    shape = {
      kind: 'multi',
      parts: bodies.map(b => ({
        dx: (b.cx * cos - b.cy * sin) * scale,
        dy: (b.cx * sin + b.cy * cos) * scale,
        r: b.r * ROCK_FORM_CFG.traceMean * scale,
      })),
    };
  }
  surfCache.set(d, { kind: d.kind, r, rot, shape });
  return shape;
}
