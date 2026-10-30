import type { PartSpec } from '../render/vis/parts';
import { PLANTED_SPEAR, BARBED_LANCE, CONDUCTIVE_ARROW, SPECTRAL_ARROW } from './secondaryVisuals';

export interface WeaponFlightArt {
  weapon: PartSpec[];
  /** x/scale use projectile-radius units; spin is radians per simulation second. */
  weaponPose?: { x?: number; scale?: number; spin?: number };
}
const part = (kind: string, props: Omit<PartSpec, 'kind'> = {}): PartSpec => ({ kind, ...props });
const arrow: PartSpec[] = [part('weaponShaft', { role: 'wood' }),
  part('weaponFletch', { role: 'cloth' }), part('weaponArrowhead', { role: 'metal' })];
const centered = (weapon: PartSpec[], scale: number, spin = 0): WeaponFlightArt =>
  ({ weapon, weaponPose: { x: 0, scale, spin } });

/** Reusable projectile families, not skill identities. Wakes continue to carry
 * the source-specific rhythm/material; these parts say what was thrown. */
export const WEAPON_FLIGHT_ART = {
  arrow: { weapon: arrow },
  spectralArrow: { weapon: SPECTRAL_ARROW },
  dart: { weapon: arrow, weaponPose: { scale: .7 } },
  kegArrow: { weapon: [...arrow, part('deviceCanister', { x: .45, scale: .38 })] },
  ribbonedBarb: { weapon: [...BARBED_LANCE, part('weaponFletch', { x: .3, y: -.35, scale: .7, role: 'cloth' })] },
  lance: { weapon: PLANTED_SPEAR },
  voltLance: { weapon: CONDUCTIVE_ARROW },
  blightLance: { weapon: [...BARBED_LANCE, part('deviceVessel', { x: -.35, scale: .3 })] },
  radiantLance: { weapon: PLANTED_SPEAR.map(p => ({ ...p, role: 'glow' as const })) },
  knife: { weapon: [part('throwingKnife')] },
  hook: { weapon: [part('barbedHook')] },
  blade: centered([part('throwingKnife')], .7, 12),
  shuriken: centered([part('thrownShuriken', { role: 'metal' })], .72, 14),
  boneShuriken: centered([part('thrownShuriken', { role: 'bone' })], .72, 14),
  axe: centered([part('thrownAxe')], .66, 10),
  card: centered([part('throwingCard')], .64, 9),
  grenade: centered([part('deviceCanister'), part('deviceFuseLight', { x: .9, y: -.43, scale: .15 })], .62, 7),
  stone: centered([part('thrownStone')], .85, 4),
  slug: centered([part('shotSlug')], .8),
  feather: { weapon: [part('razorFeather')], weaponPose: { x: -.35, scale: .85 } },
} satisfies Record<string, WeaponFlightArt>;
