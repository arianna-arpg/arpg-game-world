import { mod } from '../engine/stats';
import type { MagicPackDef } from '../engine/magicPacks';
import { satelliteCountStat } from '../engine/satelliteSpec';
import './satellites';

/** Magic is an encounter tier. These knobs govern a whole group, not its leader. */
export const MAGIC_PACK_CFG = {
  maxMembers: 6,
  engageRadius: 720,
  roleTell: { exposedColor: '#ffd17a', protectedColor: '#648de0', donorColor: '#82929e', radius: 10, width: 3 },
  tell: { pipRadius: 2.5, rimOffset: 8, angleStep: 0.4 },
  sizeByLevel: [
    { level: 1, size: [2, 3] },
    { level: 6, size: [3, 4] },
    { level: 12, size: [4, 5] },
    { level: 20, size: [4, 6] },
  ] as { level: number; size: [number, number] }[],
};

/** Open recipes: compose proximity and casualty rules with ordinary sheet mods.
 * No recipe-specific combat code, damage path, or monster-definition mutation. */
export const MAGIC_PACKS: Record<string, MagicPackDef> = {
  cinder_wake: {
    id: 'cinder_wake', name: 'Cinder Wake', minLevel: 9, weight: 2, color: '#f4a15b',
    hint: 'Orbiting embers lob mortars onto fixed ground marks.',
    activeLabel: 'Cinder satellite', inactiveLabel: 'Cinder satellite',
    rules: [{ mods: [mod(satelliteCountStat('cinder_wake'), 'flat', 1)] }],
  },
  iron_wake: {
    id: 'iron_wake', name: 'Iron Wake', minLevel: 5, weight: 3, color: '#c5c9d2',
    hint: 'Each bearer carries a hollow iron orb. Avoid the moving orb, step inside its orbit, or kill its bearer.',
    activeLabel: 'Iron satellite', inactiveLabel: 'Iron satellite',
    rules: [{ mods: [mod(satelliteCountStat('iron_wake'), 'flat', 1)] }],
  },
  cinderchain: {
    id: 'cinderchain', name: 'Cinderchain', minLevel: 7, weight: 3, color: '#ff9566',
    hint: 'Slow bodies ignite without dying. Spread them apart to stop the chain; leave each marked blast.',
    activeLabel: 'Living fuse', inactiveLabel: 'Living fuse',
    rules: [{ mods: [mod('moveSpeed', 'more', -0.25)] }],
    burst: { skill: 'magic_pack_blast', cooldown: 7, initialDelay: 3, warning: 1.35, flash: 0.35,
      breakDistance: 32, radius: 105, chainRange: 220 },
  },
  mending_relay: {
    id: 'mending_relay', name: 'Mending Relay', minLevel: 8, weight: 2, color: '#8ce5b2',
    hint: 'A green link is preparing an ally heal. Kill the healer or separate the pair before it fills.',
    activeLabel: 'Mending relay', inactiveLabel: 'Mending relay', rules: [],
    mend: { cooldown: 7, initialDelay: 2, warning: 1.8, flash: 0.4, breakDistance: 32,
      range: 300, fraction: 0.18, below: 0.75 },
  },
  encirclement: {
    id: 'encirclement', name: 'Encirclement', minLevel: 15, weight: 2, color: '#ee91cc',
    hint: 'Three members mark a ritual. Leave its triangle, or kill or displace a corner before it erupts.',
    activeLabel: 'Triad ritual', inactiveLabel: 'Triad ritual', rules: [],
    ritual: { skill: 'magic_pack_ritual', cooldown: 8, initialDelay: 3.5, warning: 1.7, flash: 0.45,
      breakDistance: 32, range: 430, minArea: 2400 },
  },
  hollow_choir: {
    id: 'hollow_choir', name: 'Hollow Choir', minLevel: 18, weight: 2, color: '#9aaaff',
    hint: 'Hollow rings erupt together. Stand in a clear center or beyond every marked rim.',
    activeLabel: 'Hollow chorus', inactiveLabel: 'Hollow chorus', rules: [],
    burst: { skill: 'magic_pack_hollow', cooldown: 8, initialDelay: 3, warning: 1.6, flash: 0.4,
      breakDistance: 32, radius: 175, innerRadius: 85 },
  },
  wardbound: {
    id: 'wardbound', name: 'Wardbound', minLevel: 1, weight: 4,
    hint: 'Separate allies to break their shared protection.',
    activeLabel: 'Ward active', inactiveLabel: 'Ward broken',
    color: '#81b9ff',
    rules: [{ nearby: { radius: 190, min: 1 }, mods: [mod('damageTaken', 'more', -0.18)] }],
  },
  chorus: {
    id: 'chorus', name: 'Hunting Chorus', minLevel: 6, weight: 3,
    hint: 'Break the trio to slow their attacks and spells.',
    activeLabel: 'Chorus active', inactiveLabel: 'Chorus broken',
    color: '#99d9ee',
    rules: [{ nearby: { radius: 240, min: 2 }, mods: [
      mod('attackSpeed', 'increased', 0.18), mod('castSpeed', 'increased', 0.18),
    ] }],
  },
  vendetta: {
    id: 'vendetta', name: 'Vendetta', minLevel: 12, weight: 2,
    hint: 'Each fallen ally strengthens survivors; weaken them together.',
    activeLabel: 'Vengeance', inactiveLabel: 'No vengeance yet',
    color: '#caa2ff',
    rules: [{ fallen: { max: 3 }, mods: [
      mod('damage', 'increased', 0.12), mod('moveSpeed', 'increased', 0.06),
    ] }],
  },
  breachbearers: {
    id: 'breachbearers', name: 'Breachbearers', minLevel: 4, weight: 3,
    hint: 'Strike the broken golden ward; it passes when its bearer falls.',
    activeLabel: 'Ward relay', inactiveLabel: 'Ward relay', color: '#82aaff',
    bearer: { warning: 1.2, onLoss: 'next', color: '#ffd17a' },
    rules: [
      { role: 'bearer', mods: [mod('damageTaken', 'more', 0.65)] },
      { role: 'others', mods: [mod('damageTaken', 'more', -0.45)] },
    ],
  },
  shifting_breach: {
    id: 'shifting_breach', name: 'Shifting Breach', minLevel: 9, weight: 2,
    hint: 'The broken golden ward moves; the dotted halo warns who is next.',
    activeLabel: 'Shifting ward', inactiveLabel: 'Shifting ward', color: '#92acff',
    bearer: { warning: 1.4, rotateEvery: 6, onLoss: 'next', color: '#ffd17a' },
    rules: [
      { role: 'bearer', mods: [mod('damageTaken', 'more', 0.65)] },
      { role: 'others', mods: [mod('damageTaken', 'more', -0.45)] },
    ],
  },
  arclink: {
    id: 'arclink', name: 'Arclink', minLevel: 10, weight: 2,
    hint: 'Leave the dashed path before it fires, or kill or displace an endpoint.',
    activeLabel: 'Arc link', inactiveLabel: 'Arc charging', color: '#94eaff', rules: [],
    beam: { skill: 'magic_pack_arc', cooldown: 5.5, initialDelay: 2.8, warning: 1.25,
      travel: 0.8, pulseLength: 80, halfWidth: 11, range: 460, breakDistance: 28 },
  },
  gravewheel: {
    id: 'gravewheel', name: 'Gravewheel', minLevel: 16, weight: 2,
    hint: 'Fallen allies leave rotating blades; finish the pack to silence them.',
    activeLabel: 'Gravewheels', inactiveLabel: 'Gravewheels', color: '#cc93ed', rules: [],
    grave: { skill: 'magic_pack_gravewheel', warning: 1.5, radius: 115, halfWidth: 10,
      spokes: 2, turnSpeed: 0.65, tick: 0.45 },
  },
  siphon: {
    id: 'siphon', name: 'Siphon Court', minLevel: 13, weight: 2,
    hint: 'Separate the siphoner from its feeders, or kill it to end the drain.',
    activeLabel: 'Siphoning', inactiveLabel: 'Siphon broken', color: '#f0ad69',
    bearer: { warning: 1.2, onLoss: 'end', siphonRadius: 230, color: '#ffb45c' },
    rules: [
      { role: 'bearer', perDonor: true, mods: [mod('attackSpeed', 'increased', 0.16),
        mod('castSpeed', 'increased', 0.16), mod('moveSpeed', 'increased', 0.07)] },
      { role: 'donor', mods: [mod('attackSpeed', 'more', -0.15), mod('castSpeed', 'more', -0.15), mod('moveSpeed', 'more', -0.22)] },
    ],
  },
};
