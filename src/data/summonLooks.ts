import type { LookDef } from '../render/vis/parts';

/** Six roles that previously borrowed generic bodies. Visual anatomy only;
 * the existing summon size, lifespan, collision and source attribution remain. */
export const SUMMON_LOOKS: Record<string, LookDef> = {
  amalgam_stitched: {
    parts: [
      { kind: 'boundBones', x: -.73, y: -.4, scale: .31, rot: -.2, mirror: true },
      { kind: 'graftSpurs', x: -.36, y: -.66, scale: .53, rot: .44 },
      { kind: 'graftArm', x: .29, y: .91, scale: .65, rot: -.23 },
      { kind: 'boundBones', x: .11, y: -.92, scale: .45, rot: .64 },
      { kind: 'graftTrunk', scale: .95 },
      { kind: 'ribs', x: -.36, y: .21, scale: .48, rot: -.32, params: { pairs: 3, span: .82 } },
      { kind: 'stitchSeams', x: -.23, y: -.37, scale: .42, params: { n: 2 } },
      { kind: 'skull', x: .39, y: -.34, scale: .75, rot: -.25 },
      { kind: 'skull', x: -.13, y: -.69, scale: .48, rot: -.62 },
      { kind: 'maw', x: .35, y: .36, scale: .53, rot: .22, params: { arc: .7 } },
      { kind: 'claws', x: .31, y: -.9, scale: .42, rot: .4, params: { len: .54, talons: 3 } },
    ],
    live: [{ kind: 'veinweb', x: -.04, y: .29, scale: .39, params: { n: 3 } }],
    shadowScale: 1.28,
  },
  familiar_pactbeast: {
    parts: [
      { kind: 'pactTail', x: -.1, scale: .77 },
      { kind: 'blob', x: -.22, scale: .62, params: { irr: .11, seed: 21 } },
      { kind: 'runes', x: -.31, scale: .48, params: { n: 3 } },
      { kind: 'pactMask', x: .36, scale: .72 },
    ],
    live: [{ kind: 'pactSatellites', scale: .85 }], shadowScale: .82,
  },
  cherub_feathered: {
    parts: [
      { kind: 'votiveWing', x: -.09, scale: .91, mirror: true },
      { kind: 'robe', x: -.14, scale: .51 },
      { kind: 'votiveFace', x: .37, scale: .94 },
      { kind: 'halo', x: .45, scale: .52 },
    ],
    live: [{ kind: 'wisps', x: -.55, scale: .34, params: { n: 2 } }], shadowScale: .9,
  },
  mender_cradle: {
    parts: [
      { kind: 'mendingCradle', scale: .97 },
      { kind: 'spiritSeed', x: .02, scale: .67 },
      { kind: 'eyes', x: .5, scale: .37, params: { spread: .38, dist: .4, size: .1 } },
    ],
    live: [{ kind: 'spiritSeedGlint', scale: .67 }, { kind: 'wisps', x: -.67, scale: .3, params: { n: 2 } }],
    shadowScale: .75,
  },
  raging_deathmask: {
    parts: [
      { kind: 'cometTresses', x: -.05, scale: .85 },
      { kind: 'skull', x: .21, scale: .97 },
      { kind: 'fangs', x: .21, scale: .49 },
    ],
    live: [{ kind: 'flames', x: -.64, scale: .46, params: { n: 3 } }], shadowScale: .65,
  },
  sprite_kindled: {
    parts: [
      { kind: 'emberWings', scale: .98 },
      { kind: 'kindledMass', x: -.23, scale: .64 },
      { kind: 'kindledVisage', x: .35, scale: .48 },
    ],
    live: [{ kind: 'flames', x: -.4, scale: .44, params: { n: 3 } },
      { kind: 'emberSparks', scale: .71, params: { n: 3, drift: .38 } }], shadowScale: .78,
  },
};
