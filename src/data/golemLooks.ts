import type { LookDef, PartSpec } from '../render/vis/parts';

/** Broad shoulders, detached forearms and heavy hands make an assembled body.
 * Material parts supply the silhouette; all dimensions are presentation only. */
const assembled = (kind: string, head: string, extra: PartSpec[] = []): PartSpec[] => [
  { kind, x: -.76, y: -.38, scale: .3, mirror: true },
  { kind, x: -.16, scale: .69 },
  { kind, x: -.24, y: -.71, scale: .43, mirror: true, rot: -.18 },
  { kind, x: .25, y: -.94, scale: .29, mirror: true, rot: .35 },
  { kind, x: .65, y: -.88, scale: .43, mirror: true, rot: -.15 },
  ...extra,
  { kind: head, x: .44, scale: .42 },
];

export const GOLEM_LOOKS: Record<string, LookDef> = {
  golem_stone_assembled: {
    parts: assembled('quarriedBlock', 'hewnFace', [
      { kind: 'runes', x: -.3, scale: .43, params: { n: 2 } },
      { kind: 'mossPatch', x: -.27, y: -.69, scale: .22, alpha: .6 },
    ]), shadowScale: 1.18,
  },
  golem_fire_assembled: {
    parts: assembled('kindledMass', 'kindledVisage', [
      { kind: 'kindledMass', x: -.4, scale: .76, rot: .14 },
    ]),
    live: [
      { kind: 'flames', x: -.32, scale: .73, params: { n: 5 } },
      { kind: 'flames', x: .63, y: -.88, scale: .38, mirror: true, params: { n: 3 } },
      { kind: 'emberSparks', scale: .95, params: { n: 5, drift: .5 } },
    ], shadowScale: 1.1,
  },
  golem_ice_assembled: {
    parts: [...assembled('frostPrism', 'frostPrism', [
      { kind: 'frostFan', x: -.29, y: -.68, scale: .48, mirror: true, rot: -.25 },
      { kind: 'frostPrism', x: -.26, scale: .46, rot: Math.PI / 2 },
    ]), { kind: 'eyes', x: .43, scale: .43, params: { spread: .32, dist: .52, size: .08 } }],
    live: [{ kind: 'breathPuff', x: .18, scale: .65, color: '#dff4ff' }], shadowScale: 1.12,
  },
  golem_blood_assembled: {
    parts: [
      { kind: 'clotSinews' },
      ...assembled('vitaeLobe', 'vitaeLobe'),
      { kind: 'vitaeLobe', x: .57, y: .94, scale: .55, rot: .4 },
      { kind: 'eyes', x: .34, scale: .38, params: { spread: .36, dist: .5, size: .11 } },
    ],
    live: [
      { kind: 'veinweb', x: -.2, scale: .62, params: { n: 4 } },
      { kind: 'vitaeHeart', x: -.2, scale: .35 },
      { kind: 'vitaeDrops', x: -.2, scale: 1.15 },
    ], shadowScale: 1.12,
  },
  golem_bone_assembled: {
    parts: [
      { kind: 'boundBones', x: -.68, y: -.4, scale: .31, mirror: true, rot: -.18 },
      { kind: 'ribs', x: -.13, scale: .92, params: { pairs: 5, span: .86, under: true } },
      { kind: 'boundBones', x: -.14, y: -.77, scale: .42, mirror: true, rot: -.6 },
      { kind: 'boundBones', x: .47, y: -.95, scale: .39, mirror: true, rot: .2 },
      { kind: 'skull', x: .49, scale: 1.03 },
      { kind: 'spikes', x: -.12, scale: .69, params: { n: 4 } },
    ], shadowScale: 1.15,
  },
};
