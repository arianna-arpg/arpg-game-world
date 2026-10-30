import type { LookDef, PartSpec } from '../render/vis/parts';

const part = (kind: string, spec: Omit<PartSpec, 'kind'> = {}): PartSpec => ({ kind, ...spec });
/** Shared weapon anatomy for airborne and persistent versions. */
export const PLANTED_SPEAR: PartSpec[] = [part('weaponShaft', { role: 'wood' }), part('weaponWrap'), part('weaponLeaf', { role: 'metal' })];
export const BARBED_LANCE: PartSpec[] = [part('weaponShaft', { role: 'wood' }), part('weaponWrap'), part('weaponBarb', { role: 'bone' }),
  part('weaponFletch', { scale: .8, role: 'bone' })];
export const CONDUCTIVE_ARROW: PartSpec[] = [part('weaponShaft', { role: 'metal' }),
  part('weaponArrowhead', { role: 'metal' }), part('weaponFletch', { role: 'bone' }), part('weaponConductor')];
export const SPECTRAL_ARROW: PartSpec[] = [part('weaponShaft', { role: 'glow' }),
  part('weaponFletch', { role: 'glow' }), part('weaponArrowhead', { role: 'glow' })];
export const BONE_ARROW: PartSpec[] = [part('weaponShaft', { role: 'bone' }),
  part('weaponFletch', { role: 'bone' }), part('weaponArrowhead', { role: 'bone' })];

/** Defaults for derived spawn paths. Native sources may override the ordinary
 * look ID; future sources never silently inherit a wall for a landed missile. */
export const SECONDARY_LOOKS = {
  planted: 'object_pinning_spear',
  hanging: 'object_hanging_arrow',
  spiritTotem: 'object_spirit_totem',
  channelVessel: 'object_channel_vessel',
  effigy: 'object_goad_effigy',
  pursuer: 'object_burrowing_pursuer',
} as const;
const body = (parts: PartSpec[], shadowScale = .3): LookDef => ({
  parts, shadowScale, untargetableAlpha: 1, binding: [part('deviceBinding', { scale: .48, x: -.45, y: .35 })],
});
/** Bodies outside direct ConstructDelivery definitions. No skill-ID draw branches. */
export const SECONDARY_BODY_LOOKS: Record<string, LookDef> = {
  object_pinning_spear: body(PLANTED_SPEAR),
  object_impale_lance: body(BARBED_LANCE),
  object_arclight_arrow: body(CONDUCTIVE_ARROW),
  object_hanging_arrow: { ...body([
    ...SPECTRAL_ARROW,
    part('weaponArrowhead', { x: -.5, y: -.55, scale: .65, alpha: .6, role: 'glow' }),
    part('weaponArrowhead', { x: -.5, y: .55, scale: .65, alpha: .6, role: 'glow' }),
  ], .12), untargetableAlpha: .82 },
  object_spirit_totem: body([part('spiritCage'), part('weaponWrap', { x: -.83, rot: Math.PI / 2 })], .65),
  object_channel_vessel: body([part('ritualTripod'), part('gem', { scale: .3 })], .5),
  object_goad_effigy: body([part('effigyFork'), part('deviceFractures', { x: .5, scale: .35 })], .6),
  object_burrowing_pursuer: { parts: [part('burrowRidge')], shadowScale: .15, binding: [], untargetableAlpha: .9 },
};
