import type { DamageType } from '../engine/stats';
import type { Projectile } from '../engine/world';
import { skillBaseTypeOf } from '../engine/bodyVoices';
import { cosmeticStyle, COSMETIC_PROJECTILES } from './cosmeticStyles';
import { projectileFlightProfile } from './projectileArtVisuals';
import type { BurstMotif } from './skillVisuals';

export const PROJECTILE_ENDINGS = {
  lodge: { seconds: .92, pieces: 3 },
  settle: { seconds: .58, pieces: 3 },
  cinder: { seconds: .37, pieces: 5 },
  shatter: { seconds: .36, pieces: 6 },
  discharge: { seconds: .23, pieces: 4 },
  spatter: { seconds: .39, pieces: 5 },
  unravel: { seconds: .34, pieces: 4 },
};
export type ProjectileEnding = keyof typeof PROJECTILE_ENDINGS;
export const PROJECTILE_END_STYLE = { minRadius: 3, maxRadius: 18, drawReach: 6 };
export type EndSurface = 'spent' | 'wall';
export interface ProjectileEndCue {
  kind: ProjectileEnding;
  surface: EndSurface;
  /** Keep the actual solid head, pose and wardrobe skin through the landing. */
  source: string;
  skin?: string;
  orbPaint?: Projectile['orbPaint'];
  age: number;
  shape: Projectile['shape'];
}
const byElement: Record<DamageType, ProjectileEnding> = {
  fire: 'cinder', cold: 'shatter', lightning: 'discharge', chaos: 'spatter', physical: 'settle',
};

export function cloneProjectileEnd(cue: ProjectileEndCue | undefined): ProjectileEndCue | undefined {
  if (!cue) return;
  return cue.orbPaint ? { ...cue, orbPaint: { ...cue.orbPaint } } : { ...cue };
}
const byMotif: Partial<Record<BurstMotif, ProjectileEnding>> = {
  ice: 'shatter', flame: 'cinder', sparks: 'discharge', blood: 'spatter', spores: 'spatter',
  runes: 'unravel', souls: 'unravel', steam: 'unravel',
};

export function projectileEndKind(p: Projectile): ProjectileEnding {
  const skin = cosmeticStyle(COSMETIC_PROJECTILES, p.cosmeticProjectile);
  const d = p.inst.def.delivery;
  const flight = projectileFlightProfile(p.skillVisualId ?? p.inst.def.id);
  const authored = skin?.ending ?? p.ending ?? (d.type === 'projectile' ? d.ending : undefined) ?? flight?.ending;
  if (authored && Object.hasOwn(PROJECTILE_ENDINGS, authored)) return authored;
  if (flight?.weapon) return 'lodge';
  const motif = flight && byMotif[flight.head];
  if (motif) return motif;
  const type = p.conductElem ?? skillBaseTypeOf(p.inst.def.baseDamage);
  if (type === 'physical' && p.shape === 'line') return 'lodge';
  return type ? byElement[type] : 'unravel';
}

export function projectileEndFlash(p: Projectile, surface: EndSurface, at = p.pos) {
  const kind = projectileEndKind(p), life = PROJECTILE_ENDINGS[kind].seconds;
  const projectileEnd: ProjectileEndCue = { kind, surface, source: p.skillVisualId ?? p.inst.def.id,
    age: p.age, shape: p.shape };
  if (p.cosmeticProjectile) projectileEnd.skin = p.cosmeticProjectile;
  else if (p.orbPaint) projectileEnd.orbPaint = { ...p.orbPaint };
  return { fx: 'projectileEnd', projectileEnd, recoveryCueTier: p.tier ?? 0, pos: { ...at },
    color: p.color, radius: p.radius, facing: p.dir, life, maxLife: life };
}
