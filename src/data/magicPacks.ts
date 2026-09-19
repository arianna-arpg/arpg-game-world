import { mod } from '../engine/stats';
import type { MagicPackDef } from '../engine/magicPacks';

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
