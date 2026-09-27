import type { LookDef, PartSpec } from '../render/vis/parts';

/** A shared exposed skeleton; equipment changes each school's outline. */
const scholar = (back: PartSpec[], gear: PartSpec[], live: PartSpec[]): LookDef => ({
  parts: [
    { kind: 'scholarMantle', scale: .9 }, ...back,
    { kind: 'boundBones', x: -.13, y: .63, scale: .27, rot: .12, mirror: true },
    { kind: 'ribs', x: -.18, scale: .68, params: { pairs: 4, span: .7 } },
    { kind: 'skull', x: .42, scale: 1.04, params: { glow: 'glow' } }, ...gear,
  ], live, shadowScale: .95,
});
export const SKELETAL_MAGE_LOOKS: Record<string, LookDef> = {
  mage_cinder_scholar: scholar(
    [{ kind: 'cinderCowl', x: .22, scale: .68 }],
    [{ kind: 'brazierFocus', x: .15, y: .88, scale: .72 },
      { kind: 'kindledMass', x: .91, y: .88, scale: .32 }],
    [{ kind: 'flames', x: .95, y: .88, scale: .28, params: { n: 2 } }]),
  mage_rime_scholar: scholar(
    [{ kind: 'frostFan', x: -.04, y: -.56, scale: .48, rot: -.2, mirror: true }],
    [{ kind: 'rimeFocus', x: -.05, y: .89, scale: .81 },
      { kind: 'frostPrism', x: .05, y: -.81, scale: .27, rot: .4 }],
    [{ kind: 'breathPuff', x: .92, y: .86, scale: .2 }]),
  mage_storm_scholar: scholar(
    [{ kind: 'stormYoke', x: .04, scale: .88 }],
    [{ kind: 'conductorFocus', x: .12, y: .92, scale: .79 }],
    [{ kind: 'conductorArc', x: .12, y: .92, scale: .79 }]),
  mage_venom_scholar: scholar(
    [{ kind: 'hood', x: .24, scale: 1.05 },
      { kind: 'scholarVials', x: -.35, y: -.82, scale: .74, rot: -.2 }],
    [{ kind: 'plagueBeak', x: .88, scale: .65 },
      { kind: 'retortCrook', x: .04, y: .91, scale: .84 }],
    [{ kind: 'wisps', x: .35, y: 1.08, scale: .22, params: { n: 2 } }]),
  lich_ossuary_regent: {
    parts: [
      { kind: 'regentMantle', scale: .96 },
      { kind: 'boundBones', x: .01, y: .69, scale: .32, rot: -.22, mirror: true },
      { kind: 'ribs', x: -.27, scale: .88, params: { pairs: 5 } },
      { kind: 'skull', x: -.08, y: -.77, scale: .38, rot: -.35, mirror: true },
      { kind: 'staff', x: .04, y: .1, scale: 1.2, params: { skullTip: true } },
      { kind: 'book', x: .02, y: -1.42, scale: .85 },
      { kind: 'skull', x: .39, scale: 1.22, params: { glow: 'glow' } },
      { kind: 'ossuaryDiadem', x: -.05, scale: .9 },
    ],
    live: [{ kind: 'runes', x: -.24, scale: 1.08, params: { n: 3 } }], shadowScale: 1.17,
  },
};
