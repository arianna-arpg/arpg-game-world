import type { LookDef } from '../render/vis/parts';

/** Previously uncomposed catalogue bodies. Shared parts carry identity;
 * mechanical radius, material, behavior and family membership stay on the actor. */
export const FIELD_ACTOR_LOOKS: Record<string, LookDef> = {
  field_bound_phylactery: {
    parts: [
      { kind: 'canopicJar', scale: 1.65, params: { stopper: 1 } },
      { kind: 'gem', y: .25, scale: .26, role: 'glow' },
    ], binding: [{ kind: 'deviceBinding', x: -.6, scale: .5 }], shadowScale: .55,
  },
  field_timber_door: {
    parts: [{ kind: 'timberSlats' }, { kind: 'timberBrace' }], shadowScale: .7,
  },
  field_quag_gel: {
    parts: [
      { kind: 'blob', x: -.18, scale: 1.08, params: { irr: .34, seed: 571 } },
      { kind: 'blob', x: .65, y: -.53, scale: .46, params: { irr: .24, seed: 15 }, mirror: true },
      { kind: 'veinweb', scale: .8, params: { n: 3 } },
      { kind: 'maw', x: .35, scale: .5 },
      { kind: 'eyeCluster', x: .12, scale: .5, role: 'bone', params: { n: 3 } },
    ], live: [{ kind: 'oozeLobes', scale: .98, params: { n: 3 } }], shadowScale: .85,
  },
  field_quag_gelling: {
    parts: [
      { kind: 'blob', x: -.2, scale: .8, params: { irr: .38, seed: 577 } },
      { kind: 'blob', x: .47, scale: .46, params: { irr: .25, seed: 31 } },
      { kind: 'eyes', x: .16, role: 'bone', params: { n: 1, spread: 0, dist: .2, size: .17 } },
    ], live: [{ kind: 'oozeLobes', scale: .72, params: { n: 2 } }], shadowScale: .6,
  },
  field_pale_watcher: {
    parts: [
      { kind: 'foldedSlabWing', scale: .9 },
      { kind: 'robe', scale: .77, role: 'base' },
      { kind: 'mask', x: .49, scale: .55, role: 'bone' },
      { kind: 'deviceFractures', x: -.22, scale: .63 },
    ], shadowScale: .85,
  },
  field_husk_sovereign: {
    parts: [
      { kind: 'roots', x: -.65, rot: Math.PI, scale: .76, role: 'bone', params: { n: 5 } },
      { kind: 'carapace', x: -.15, scale: 1.12 },
      { kind: 'ribs', scale: .95, role: 'bone' },
      { kind: 'crownOfHorns', x: -.35, scale: .83 },
      { kind: 'maw', x: .54, scale: .65 },
      { kind: 'eyeCluster', x: .43, scale: .53, role: 'glow', params: { n: 3 } },
    ], shadowScale: 1.15,
  },
  field_husk_arm: {
    parts: [{ kind: 'huskPalm' }, { kind: 'deviceFractures', x: -.25, scale: .58 }], shadowScale: .8,
  },
  field_primeval_spawn: {
    parts: [
      { kind: 'legs', scale: .86, params: { n: 6 } },
      { kind: 'carapace', x: -.18, scale: .86 },
      { kind: 'scutes', x: -.14, scale: .68 },
      { kind: 'mandibles', x: .55, scale: .72, role: 'bone' },
    ], shadowScale: .7,
  },
  field_cinderling: {
    parts: [
      { kind: 'tail', x: -.5, scale: .76 },
      { kind: 'carapace', scale: .78 },
      { kind: 'lavaCracks', scale: .74, params: { n: 3 } },
      { kind: 'horns', x: .35, scale: .78 },
      { kind: 'maw', x: .53, scale: .37 },
    ], live: [{ kind: 'flames', x: -.35, scale: .44, params: { n: 3 } }], shadowScale: .65,
  },
};
