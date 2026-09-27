import type { LookDef } from '../render/vis/parts';

/** Longlimbs share anatomical parts, with the canine kit supplying selected
 * hindquarters, coats, ears and jaws. Native behavior stays on the monster. */
export const STALKER_LOOKS: Record<string, LookDef> = {
  stalker_gloomblade: { parts: [
    { kind: 'whipTail', x: -.77, scale: .73, rot: .18 },
    { kind: 'stiltHindleg', x: -.5, scale: .66, rot: -.15, mirror: true },
    { kind: 'bladeForelimb', x: .27, scale: 1, rot: -.17, mirror: true },
    { kind: 'longlimbTrunk', x: -.02, scale: .88 },
    { kind: 'dorsalScutes', x: .03, scale: .85, role: 'dark' },
    { kind: 'forkedCrest', x: .59, y: -.12, scale: .48, rot: -.75, mirror: true },
    { kind: 'wedgeSkull', x: .77, scale: .72 },
  ], shadowScale: .9 },
  strider_longstep: { parts: [
    { kind: 'whipTail', x: -.79, scale: .64, rot: -.35 },
    { kind: 'stiltHindleg', x: -.58, scale: .96, rot: -.13, mirror: true },
    { kind: 'stiltHindleg', x: .42, scale: 1.04, rot: .49, mirror: true },
    { kind: 'longlimbTrunk', x: -.09, scale: .9 },
    { kind: 'shaggyRuff', x: .35, scale: .49, role: 'bone' },
    { kind: 'forkedCrest', x: .75, y: -.07, scale: .65, role: 'bone', mirror: true },
    { kind: 'wedgeSkull', x: 1, scale: .68 },
  ], shadowScale: 1.04 },
  stalker_veilmantle: { parts: [
    { kind: 'whipTail', x: -.72, scale: .95, rot: -.13 },
    { kind: 'stiltHindleg', x: -.54, scale: .81, mirror: true },
    { kind: 'bladeForelimb', x: .36, scale: .79, rot: .23, mirror: true },
    { kind: 'veilFin', x: -.07, y: -.11, scale: .99, mirror: true },
    { kind: 'longlimbTrunk', x: -.03, scale: .79 },
    { kind: 'dorsalScutes', x: -.12, scale: .46, role: 'bone' },
    { kind: 'forkedCrest', x: .79, scale: .49, rot: -.6, mirror: true },
    { kind: 'wedgeSkull', x: .97, scale: .77, role: 'bone' },
  ], shadowScale: .98 },
  stalker_packalpha: { parts: [
    { kind: 'whipTail', x: -.84, scale: .59, rot: .48 },
    { kind: 'runningHaunch', x: -.56, scale: 1.02, mirror: true },
    { kind: 'knuckleForelimb', x: .32, scale: 1.04, mirror: true },
    { kind: 'longlimbTrunk', x: -.09, scale: 1.1 },
    { kind: 'shaggyRuff', x: .3, scale: 1.13 },
    { kind: 'dorsalScutes', x: -.15, scale: .74, role: 'bone' },
    { kind: 'prickedEar', x: .77, y: -.18, scale: .6, mirror: true },
    { kind: 'scavengerJaw', x: .99, scale: .92 },
  ], shadowScale: 1.18 },
};
