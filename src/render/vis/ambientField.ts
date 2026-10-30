// Stable, bounded world ambience. Camera and viewport only select what to draw;
// births, paths and identity depend on the zone, cell, slot and world clock.
import { hash01 } from '../../engine/hash';
import type { AmbientFieldSpec } from '../../world/ambientFx';

export interface AmbientWorldView {
  x: number; y: number; w: number; h: number;
  zoom: number;
  seed: number;
  bounds?: { w: number; h: number };
  /** Ground decoration can reject blocked/roofed positions without simulation. */
  groundAt?: (x: number, y: number) => boolean;
}

export interface AmbientParticle {
  id: string;
  x: number; y: number; radius: number;
  phase: number; fade: number; seed: number;
}

export const AMBIENT_FIELDS = {
  sand: { spacing: 480, count: 10, radius: 22, velocity: [170, -55], period: 8, lifetime: 8, chance: 1, seed: 113 },
  devil: { spacing: 800, count: 1, radius: 44, velocity: [32, -8], period: 16, lifetime: 6, chance: 0.65, seed: 227 },
  tumbleweed: { spacing: 720, count: 1, radius: 12, velocity: [48, -16], period: 22, lifetime: 16, chance: 0.7, seed: 349 },
  heat: { spacing: 640, count: 1, radius: 110, velocity: [0, 0], period: 0, lifetime: 0, chance: 0.7, seed: 461 },
} satisfies Record<string, Required<AmbientFieldSpec>>;

const finite = (n: number | undefined, fallback: number): number => Number.isFinite(n) ? n! : fallback;

/** Stateless visible sample. Expanded birth bounds include the entire travel
 *  envelope, so a particle born offscreen still arrives along its original path.
 *  Neither screen wrapping nor a camera-relative spawn window is involved. */
export function ambientField(view: AmbientWorldView, time: number,
  defaults: Required<AmbientFieldSpec>, overrides?: AmbientFieldSpec): AmbientParticle[] {
  if (![view.x, view.y, view.w, view.h, view.zoom, time].every(Number.isFinite)
    || view.w <= 0 || view.h <= 0 || view.zoom <= 0) return [];
  const d = { ...defaults, ...overrides };
  const spacing = Math.max(128, finite(d.spacing, defaults.spacing));
  const count = Math.max(0, Math.min(32, Math.floor(finite(d.count, defaults.count))));
  const radius = Math.max(1, Math.min(256, finite(d.radius, defaults.radius)));
  const period = Math.max(0, finite(d.period, defaults.period));
  const lifetime = Math.max(0, Math.min(period, 120, finite(d.lifetime, defaults.lifetime)));
  const chance = Math.max(0, Math.min(1, finite(d.chance, defaults.chance)));
  if (!count || !chance || (period > 0 && !lifetime)) return [];
  const vx = Math.max(-500, Math.min(500, finite(d.velocity[0], defaults.velocity[0])));
  const vy = Math.max(-500, Math.min(500, finite(d.velocity[1], defaults.velocity[1])));
  const salt = (view.seed ^ finite(d.seed, defaults.seed)) | 0;
  const right = view.x + view.w / view.zoom, bottom = view.y + view.h / view.zoom;
  const travelX = vx * lifetime, travelY = vy * lifetime;
  const x0 = Math.floor((view.x - radius - Math.max(0, travelX)) / spacing);
  const x1 = Math.floor((right + radius - Math.min(0, travelX)) / spacing);
  const y0 = Math.floor((view.y - radius - Math.max(0, travelY)) / spacing);
  const y1 = Math.floor((bottom + radius - Math.min(0, travelY)) / spacing);
  const out: AmbientParticle[] = [];
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
    for (let i = 0; i < count; i++) {
      const seed = (hash01(cx, cy, salt + i * 67) * 0x100000000) >>> 0;
      const clock = time + hash01(seed, 3) * period;
      const cycle = period > 0 ? Math.floor(clock / period) : 0;
      const age = period > 0 ? clock - cycle * period : 0;
      if (period > 0 && age >= lifetime || hash01(seed, cycle, 7) >= chance) continue;
      const x = (cx + hash01(seed, cycle, 11)) * spacing + vx * age;
      const y = (cy + hash01(seed, cycle, 13)) * spacing + vy * age;
      if (x + radius < view.x || x - radius > right || y + radius < view.y || y - radius > bottom) continue;
      if (view.bounds && (x < 0 || y < 0 || x > view.bounds.w || y > view.bounds.h)) continue;
      const phase = period > 0 ? age / lifetime : hash01(seed, 17);
      out.push({ id: `${salt}:${cx}:${cy}:${i}:${cycle}`, x, y, radius,
        phase, fade: period > 0 ? Math.min(1, phase * 6, (1 - phase) * 6) : 1, seed });
    }
  }
  return out;
}
