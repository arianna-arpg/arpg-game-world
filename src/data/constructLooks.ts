import type { LookDef, PartSpec } from '../render/vis/parts';

const part = (kind: string, spec: Omit<PartSpec, 'kind'> = {}): PartSpec => ({ kind, ...spec });
const body = (parts: PartSpec[], shadowScale = .8, live?: PartSpec[]): LookDef => ({
  parts, shadowScale, binding: [part('deviceBinding', { x: -.9, scale: .65 })],
  ...(live ? { live } : {}),
});
const plinth = () => part('devicePlinth', { scale: .8 });
const gem = (scale = .55) => part('gem', { scale });
const ribs = (n: number) => part('stakeRow', { role: 'bone', params: { n, span: 1.8 } });
const egg = (x: number, y: number, scale: number) => part('egg', { x, y, scale });

/** Native construct compositions. Deliveries select these through their normal
 * `look` field; parts remain reusable by any future skill, creature or mod.
 * Low-frequency outlines carry identity at the actual 8/13px actor radii.
 * Persistent bodies claim neither an attack clock nor an affected area.
 * Original art: Hollow Wake. Echoes deliberately retain their owner's body. */
export const CONSTRUCT_BODY_LOOKS: Record<string, LookDef> = {
  device_temporal_pad: body([
    part('devicePlinth', { scale: 1.05 }), part('deviceHourglass', { scale: .72 }),
  ], .3),
  device_gate_shift: body([
    part('deviceArch'), part('deviceSlit', { scale: .69, rot: Math.PI / 2 }),
    part('gem', { x: -.65, y: -.62, scale: .22, mirror: true }),
  ], .45),
  device_orb_of_storms: body([
    part('deviceFork', { rot: Math.PI, scale: .95 }), part('orb', { x: .16, scale: .55 }),
    part('boltCrest', { x: .2, scale: .6 }),
  ], .4),
  device_flame_totem: body([
    part('totemPost', { scale: .72, role: 'wood', params: { rings: 3 } }),
    part('deviceBrazier', { x: .24, scale: .86 }),
  ], .8, [part('flames', { x: .25, scale: .46, params: { n: 3 } })]),
  device_ballista_sentry: body([
    part('crateBox', { x: -.36, scale: .55 }), part('bow', { scale: 1.18 }), part('deviceRail'),
  ], .85),
  device_frost_trap: body([
    part('deviceJaw', { scale: 1.05 }), part('frostFan', { scale: .44, params: { n: 3 } }),
  ], .4),
  device_fire_mine: body([
    part('deviceCanister', { scale: .95 }), part('deviceBrazier', { x: -.05, scale: .37 }),
  ], .55),
  device_storm_pylon: body([
    plinth(), part('deviceFork', { rot: Math.PI / 2 }), gem(.73),
    part('boltCrest', { scale: .7 }),
  ]),
  device_lodestone: body([
    part('devicePlinth', { scale: .88, role: 'base' }),
    part('quarriedBlock', { scale: .86 }), part('deviceFork', { scale: .65, rot: Math.PI }),
  ]),
  device_bone_prison: body([
    ribs(3), part('boundBones', { scale: .55, rot: Math.PI / 2 }),
  ], .65),
  device_bone_cage: body([
    ribs(4), part('ribs', { scale: .65, rot: Math.PI / 2 }), part('skull', { scale: .36 }),
  ], .7),
  device_stone_rampart: body([
    part('deviceButtress', { color: '#8a8276' }), part('deviceFractures', { scale: .65 }),
  ], .8),
  device_sanctuary: body([
    part('deviceFork', { scale: 1.02, rot: Math.PI }),
    part('shield', { scale: .72 }), part('gem', { x: .14, scale: .35 }),
  ]),
  device_repulsor_beacon: body([
    plinth(), part('deviceFork', { scale: 1.12 }), part('deviceFork', { scale: .74, rot: Math.PI }),
    gem(.34),
  ]),
  device_tree_of_life: body([
    part('roots', { scale: .95, params: { n: 5 } }),
    part('roots', { scale: .95, rot: Math.PI, params: { n: 4 } }),
    part('petalRuff', { scale: .9 }), part('bloomCap', { scale: .74 }),
  ], .95),
  device_font_of_renewal: body([
    plinth(), part('mendingCradle', { scale: .83 }), part('spiritSeed', { scale: .55 }),
  ], .7),
  device_lay_brood_egg: body([
    part('nestTwigs', { scale: .85, params: { n: 8 } }), egg(0, 0, .9),
    part('silkAnchors', { scale: .6 }),
  ], .65),
  device_lay_chitin_clutch: body([
    part('mandibles', { scale: .9 }), egg(-.24, -.35, .55), egg(-.24, .35, .55),
    part('carapace', { x: .24, scale: .65 }),
  ], .7),
  device_lay_grub_clutch: body([
    part('nestTwigs', { scale: .78, params: { n: 6 } }),
    egg(-.3, -.3, .44), egg(-.35, .32, .48), egg(.35, 0, .61),
  ], .65),
  device_strangler_seed: body([
    part('roots', { scale: 1.05, params: { n: 4 } }),
    part('roots', { scale: .85, rot: Math.PI, params: { n: 3 } }),
    part('maw', { scale: .68 }), part('petalRuff', { x: -.23, scale: .52 }),
  ], .75),
  device_bramble_hedge: body([
    part('stakeRow', { color: '#5a7a34', params: { n: 3, span: 1.8 } }),
    part('roots', { rot: Math.PI / 2, scale: .75, params: { n: 5 } }),
    part('barbs', { scale: .83 }),
  ], .7),
  device_hell_rift: body([
    part('deviceArch', { role: 'bone' }), part('fangs', { scale: .75 }),
    part('deviceSlit', { scale: .84 }),
  ], .45, [part('flames', { x: -.08, scale: .4, params: { n: 2 } })]),
  device_volcano: body([
    part('quarriedBlock', { scale: 1.02 }), part('lavaCracks', { scale: .9, params: { n: 4 } }),
    part('deviceBrazier', { scale: .6 }),
  ], .95),
  device_solar_orb: body([
    part('deviceSun'),
  ], .35),
  device_lay_formic_clutch: body([
    part('mandibles', { scale: .94 }), egg(-.42, 0, .42), egg(.16, -.4, .43), egg(.16, .4, .43),
    part('carapace', { x: .27, scale: .32 }),
  ], .6),
  device_warden_relic: body([
    part('deviceCoffer', { scale: .82 }), part('shield', { x: .15, scale: .78 }),
    part('deviceFork', { x: -.2, scale: .65, rot: Math.PI }),
  ]),
  device_mender_relic: body([
    part('deviceCoffer', { scale: .8 }), part('mendingCradle', { scale: .76, rot: Math.PI / 2 }),
    part('spiritSeed', { scale: .44 }),
  ]),
  device_stone_spires: body([
    part('quarriedBlock', { scale: .46, x: -.34, y: -.6 }),
    part('quarriedBlock', { scale: .54, x: -.2, y: .52 }),
    part('gem', { scale: .9, color: '#a39a86' }),
  ], .8),
  device_frost_wall: body([
    part('stakeRow', { color: '#bcdcec', params: { n: 3, span: 1.8 } }),
    part('frostFan', { scale: .81, params: { n: 3 } }),
  ], .75),
  device_wall_of_meat: body([
    part('graftTrunk', { scale: .88 }), part('ribs', { scale: .61 }),
    part('stitchSeams', { scale: .85, params: { n: 3 } }),
  ], .8),
  device_shardrift: body([
    part('crystalGrowths', { scale: .88, params: { n: 4 } }),
    part('deviceSlit', { scale: 1.02, rot: Math.PI / 2 }),
  ], .45),
  device_stormbrand_beacon: body([
    plinth(), part('deviceStandard', { scale: .87 }), part('boltCrest', { x: .35, scale: .5 }),
  ]),
  device_glacial_bulwark: body([
    part('deviceButtress', { color: '#bcdcec', scale: .94 }),
    part('shield', { scale: .65 }), part('frostFan', { x: -.3, scale: .49, params: { n: 3 } }),
  ], .8),
  device_cinderwhirl_trap: body([
    part('deviceFork', { scale: .88 }), part('deviceFork', { scale: .88, rot: Math.PI }),
    part('deviceBrazier', { scale: .55 }),
  ], .45),
  device_aftershock_snare: body([
    part('deviceJaw'), part('deviceButtress', { scale: .5 }),
    part('deviceFractures', { scale: .43 }),
  ], .45),
  device_battle_standard: body([
    part('devicePlinth', { x: -.45, scale: .55 }), part('deviceStandard', { scale: 1.1 }),
  ], .6),
  device_torpor_field: body([
    part('deviceArch', { scale: .86 }), part('deviceHourglass', { scale: .82, rot: Math.PI / 2 }),
  ], .6),
  device_broodpod: body([
    part('roots', { scale: .85, params: { n: 3 } }),
    part('graftTrunk', { scale: .75 }), part('maw', { x: .28, scale: .48 }),
  ], .7),
  device_nitrocask: body([
    part('keg', { scale: .85 }), part('deviceCanister', { scale: .7, rot: Math.PI / 2 }),
  ], .75),
  device_holy_relic: body([
    part('deviceCoffer', { scale: .86 }), part('votiveWing', { scale: .72, mirror: true }),
    gem(.47),
  ]),
  device_tolling_bell: body([
    part('deviceArch', { scale: 1.05, rot: Math.PI }), part('bell', { scale: 1.1, params: { swing: 0 } }),
  ], .85),
  device_lay_brood_clutch: body([
    part('nestTwigs', { scale: .89, params: { n: 10 } }),
    egg(-.3, -.39, .49), egg(-.3, .39, .49), egg(.38, 0, .58),
    part('silkAnchors', { scale: .72 }),
  ], .7),
  device_colonnade: body([
    part('devicePlinth', { scale: .82 }),
    part('totemPost', { role: 'bone', scale: .87, params: { rings: 4 } }),
    part('laurelCrown', { x: .32, scale: .73 }),
  ]),
};
