import type { LookDef, PartSpec } from '../render/vis/parts';

const p = (kind: string, spec: Omit<PartSpec, 'kind'> = {}): PartSpec => ({ kind, ...spec });
/** Shared silhouettes: every trap carries opposing jaws and a pressure plate;
 * remote mines carry an enclosed charge and a fuse crown. Payload art sits inside. */
export const TRAP_FRAME: PartSpec[] = [p('deviceJaw', { scale: 1.08 }), p('devicePressurePlate', { scale: .53 })];
export const MINE_FRAME: PartSpec[] = [p('deviceCanister'), p('deviceFuseCrown', { x: -.35, scale: .65 })];
const mark = [p('deviceBinding', { x: -.9, scale: .65 })];
export const DEVICE_OBJECT_LOOKS: Record<string, LookDef> = {
  device_war_banner: { parts: [p('deviceStandard', { scale: 1.08 }), p('skull', { x: .15, y: .32, scale: .28 }),
    p('devicePlinth', { x: -.73, scale: .32 })], shadowScale: .55, binding: mark },
  device_soul_cistern: { parts: [p('deviceVessel'), p('deviceFork', { scale: .76, rot: Math.PI / 2 }),
    p('spiritSeed', { scale: .44 })], shadowScale: .65, binding: mark },
  device_aegis_crystal: { parts: [p('deviceFork', { scale: 1.05, rot: Math.PI }),
    p('gem', { scale: .86 }), p('shield', { x: .2, scale: .34 })], shadowScale: .4, binding: mark },
};
export const DEVICE_STATE_VISUALS = {
  trap: { parts: [p('devicePressurePlate', { scale: .26 })], arming: '#806c50', ready: '#e5c790', queued: '#fff0bb' },
  mine: { parts: [-.23, 0, .23].map(y => p('deviceFuseLight', { x: -.35, y, scale: .16 })),
    arming: '#806c50', ready: '#e7ae58', queued: '#fff1bf' },
};
