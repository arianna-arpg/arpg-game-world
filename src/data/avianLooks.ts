import type { LookDef } from '../render/vis/parts';

/** Flight behavior remains on the actor. These bakeable feather assemblies
 * distinguish fast pursuit, broad soaring and compact carrion hunting. */
export const AVIAN_LOOKS: Record<string, LookDef> = {
  falcon_huntress: {
    parts: [
      { kind: 'quillFan', x: -.57, scale: .57 },
      { kind: 'graspingTalons', x: .23, y: .38, scale: .7, rot: .16, mirror: true },
      { kind: 'sweptPinion', x: -.01, scale: .94, mirror: true },
      { kind: 'avianKeel', x: -.08, scale: .82 },
      { kind: 'disc', x: .51, scale: .28 },
      { kind: 'hookedBeak', x: .88, scale: .4 },
      { kind: 'raptorMask', x: .51, scale: .55 },
    ], shadowScale: 1.02,
  },
  vulture_carrion: {
    parts: [
      { kind: 'quillFan', x: -.63, scale: .47 },
      { kind: 'graspingTalons', x: -.2, y: .34, scale: .55, rot: -.3, mirror: true },
      { kind: 'splayedPinion', x: -.05, scale: .85, mirror: true },
      { kind: 'avianKeel', x: -.23, scale: .99 },
      { kind: 'votiveWing', x: .37, scale: .29, rot: 1.14, mirror: true },
      { kind: 'bareCrop', x: .56, scale: .68 },
      { kind: 'disc', x: .95, y: -.04, scale: .21, role: 'bone' },
      { kind: 'hookedBeak', x: 1.17, y: -.04, scale: .42 },
      { kind: 'eyes', x: .94, y: -.04, scale: .3, color: '#241c18', params: { n: 2, spread: .82, dist: .35, size: .13 } },
    ], shadowScale: 1.13,
  },
  shrike_masked: {
    parts: [
      { kind: 'splitQuills', x: -.48, scale: .87 },
      { kind: 'graspingTalons', x: .03, y: .34, scale: .48, rot: .12, mirror: true },
      { kind: 'barredPinion', scale: .88, mirror: true },
      { kind: 'avianKeel', x: -.06, scale: .77 },
      { kind: 'disc', x: .52, scale: .32, role: 'bone' },
      { kind: 'hookedBeak', x: .94, scale: .34 },
      { kind: 'raptorMask', x: .49, scale: .69 },
    ], shadowScale: .93,
  },
};
