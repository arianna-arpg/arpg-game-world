import { mod } from '../engine/stats';
import type { MagicPackDef } from '../engine/magicPacks';

/** Magic is an encounter tier. These knobs govern a whole group, not its leader. */
export const MAGIC_PACK_CFG = {
  maxMembers: 6,
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
};
