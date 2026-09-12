import { PROJ_FORM_GEO as G } from '../../engine/projForms';
import { VIS_CFG } from './visConfig';

/** Rotation-independent reach of every projectile painter, in radii.
 * Shared for the whole pass: conservative bounds are cheaper than deriving
 * a rotated box per flight. Include decorative echoes and round stroke caps,
 * which extend beyond the simulation's hit surface. Read live tuning. */
export function projectileDrawScale(): number {
  return Math.max(
    1 + G.vortex.stroke * 5, // even the default miter join stays inside
    G.square.half * Math.SQRT2,
    G.line.hAlong + G.line.hAcross,
    1 + G.triangle.base,
    G.bar.hAlong + G.bar.hAcross,
    G.bar.ghost.back + 2 * G.bar.ghost.hAlong + G.bar.ghost.hAcross,
    G.arc.back + G.arc.ring + G.arc.stroke / 2,
    G.arc.ghost.back + G.arc.ghost.ring + G.arc.ghost.stroke / 2,
    G.wave.span + G.wave.amp + G.wave.stroke / 2,
    VIS_CFG.fx.glowScale,
    VIS_CFG.fx.streakLen + 0.85 / 2,
  );
}
