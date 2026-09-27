import type { LookDef } from '../render/vis/parts';

/** Advanced summon silhouettes compose the same parts as their base kin.
 * Equipment communicates role without changing combat anatomy or simulation. */
export const UNDEAD_COURT_LOOKS: Record<string, LookDef> = {
  sentinel_ossuary_guard: {
    parts: [
      { kind: 'tatters', x: -.15, scale: .69, params: { n: 3 } },
      { kind: 'boundBones', x: -.15, y: .59, scale: .32, mirror: true },
      { kind: 'ribs', x: -.14, scale: .85, params: { pairs: 4, span: .72 } },
      { kind: 'pauldrons', x: .04, scale: .85, role: 'bone' },
      { kind: 'sword', x: .13, y: .26, scale: .88, params: { len: .9, w: .15 } },
      { kind: 'skull', x: .4, scale: 1.02 },
      { kind: 'ossuaryPavise', x: .08, y: -.85, scale: .97, rot: -.12 },
    ], shadowScale: 1.05,
  },
  duelist_boneblades: {
    parts: [
      { kind: 'tatters', x: -.4, scale: .46, params: { n: 2 } },
      { kind: 'boundBones', x: -.2, y: .55, scale: .26, rot: .3, mirror: true },
      { kind: 'ribs', x: -.2, scale: .78, params: { pairs: 4, span: .65 } },
      { kind: 'duelingSaber', x: .05, y: .79, scale: .95, rot: -.16, mirror: true },
      { kind: 'skull', x: .4, scale: 1.03 },
    ], shadowScale: .91,
  },
  abomination_stitched_brute: {
    parts: [
      { kind: 'boundBones', x: -.66, y: .45, scale: .29, rot: -.18, mirror: true },
      { kind: 'graftArm', x: .08, y: .87, scale: .63, rot: .12, mirror: true },
      { kind: 'graftTrunk', x: -.15, scale: .95 },
      { kind: 'ribs', x: -.16, y: .38, scale: .38, rot: -.35, params: { pairs: 3 } },
      { kind: 'burialHarness', x: -.07, scale: 1.05 },
      { kind: 'skull', x: .62, scale: .81, role: 'base' },
      { kind: 'stitchSeams', x: .57, scale: .23, params: { n: 2 } },
    ], shadowScale: 1.25,
  },
  ember_frenzied: {
    parts: [
      { kind: 'cometTresses', x: -.1, scale: .74 },
      { kind: 'emberWings', x: -.16, scale: .57 },
      { kind: 'skull', x: .17, scale: 1.02, params: { glow: 'glow' } },
      { kind: 'frenziedJaw', x: .55, scale: .74 },
    ],
    live: [{ kind: 'flames', x: -.68, scale: .43, params: { n: 2 } }], shadowScale: .6,
  },
  vigil_censer: {
    parts: [
      { kind: 'vigilCage', x: -.08, scale: 1.12 },
      { kind: 'kindledMass', x: -.14, scale: .56 },
      { kind: 'kindledVisage', x: .4, scale: .46 },
      { kind: 'skull', x: -.6, scale: .34 },
    ],
    live: [{ kind: 'flames', x: .03, scale: .39, params: { n: 3 } },
      { kind: 'emberSparks', scale: .6, params: { n: 2, drift: .24 } }], shadowScale: 1.05,
  },
  shade_hexwoven: {
    parts: [
      { kind: 'hexVeil', scale: .96 },
      { kind: 'boundBones', x: .02, y: .74, scale: .25, rot: .24, mirror: true },
      { kind: 'hood', x: .38, scale: .88, params: { eyes: true } },
      { kind: 'book', x: -.19, y: -1.41, scale: .72 },
    ],
    live: [{ kind: 'hexSpindle', x: .44, y: .97, scale: .73 },
      { kind: 'wisps', x: -.71, scale: .26, params: { n: 2 } }], shadowScale: .95,
  },
  reaver_soulscythe: {
    parts: [
      { kind: 'reapingMantle', x: -.02, scale: .87 },
      { kind: 'ribs', x: -.1, scale: .54, params: { pairs: 3, span: .64 } },
      { kind: 'boundBones', x: .05, y: -.55, scale: .3, rot: -.3 },
      { kind: 'soulScythe', x: .18, y: -.93, scale: .98, rot: .1 },
      { kind: 'hood', x: .34, scale: .82 },
      { kind: 'skull', x: .46, scale: .65, params: { glow: 'glow' } },
    ],
    live: [{ kind: 'wisps', x: -.81, scale: .33, params: { n: 2 } }], shadowScale: .86,
  },
};
