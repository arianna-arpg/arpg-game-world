// ---------------------------------------------------------------------------
// VESTIGES & EPITAPHS — deterministic socket-craft (the D2 rune tradition,
// wearing Hollow Wake's shroud).
//
// A VESTIGE is a stackable, satchel-borne remnant of the dead — never a bag
// item. Socketing one into gear CONSUMES it and grants a FIXED, deterministic
// line that depends on WHERE it sits: the same Kessa gives +life in a chest
// but life-on-hit in gloves (effects[category], 'default' as the fallback) —
// every copy identical, a crafting material you can read like a table.
// Socketing over an occupied socket destroys the old vestige forever: gear
// adapts in town, but the dead are spent, not refunded.
//
// An EPITAPH is a WORD written across a whole item: socket exactly its
// vestige SEQUENCE (order matters, sockets full, none spare) into a COMMON
// (white) base of an allowed category and the item awakens — keeping every
// vestige's own line AND gaining the epitaph's, plus the name. Only plain
// stone takes an inscription: magic/rare/unique bases never activate one.
// The check is DERIVED (rarity + category + socket contents), never stored.
//
// Adding a vestige or an epitaph is one row here; drops, socketing, tooltips,
// the satchel, and activation all read the registries.
// ---------------------------------------------------------------------------

import type { ItemCategory } from '../engine/items';
import type { ConditionId, ModKind, SkillTag } from '../engine/stats';

/** One deterministic granted line (a Modifier with its value baked in). */
export interface VestigeLine {
  stat: string;
  kind: ModKind;
  value: number;
  tags?: SkillTag[];
  when?: ConditionId;
}

export interface VestigeDef {
  id: string;
  name: string;
  /** Satchel/ground glyph. */
  glyph: string;
  color: string;
  /** Drop weight within the vestige pool. */
  weight: number;
  /** Per-category grant; 'default' covers everything unlisted. */
  effects: Partial<Record<ItemCategory | 'default', VestigeLine[]>>;
}

export const VESTIGE_LIST: VestigeDef[] = [
  {
    id: 'kessa', name: 'Kessa, Vestige of the Vein', glyph: 'ᚲ', color: '#d05050', weight: 100,
    effects: {
      chest: [{ stat: 'life', kind: 'flat', value: 25 }],
      gloves: [{ stat: 'lifeOnHit', kind: 'flat', value: 2 }],
      boots: [{ stat: 'lifeRegen', kind: 'flat', value: 2 }],
      default: [{ stat: 'life', kind: 'flat', value: 12 }],
    },
  },
  {
    // The flesh country's socketable: the iris that never closes.
    id: 'orra', name: 'Orra, Vestige of the Iris', glyph: 'ᛟ', color: '#d8b04a', weight: 70,
    effects: {
      helmet: [{ stat: 'detectionRange', kind: 'increased', value: 0.15 }],
      gloves: [{ stat: 'apply_beheld', kind: 'flat', value: 0.12 }],
      amulet: [{ stat: 'damageVs_seen', kind: 'flat', value: 0.08 }],
      default: [{ stat: 'accuracy', kind: 'increased', value: 0.08 }],
    },
  },
  {
    id: 'dur', name: 'Dur, Vestige of the Bulwark', glyph: 'ᛞ', color: '#c8b088', weight: 100,
    effects: {
      chest: [{ stat: 'armor', kind: 'flat', value: 60 }],
      belt: [{ stat: 'poise', kind: 'flat', value: 20 }],
      default: [{ stat: 'armor', kind: 'flat', value: 30 }],
    },
  },
  {
    id: 'thal', name: 'Thal, Vestige of the Pyre', glyph: 'ᚦ', color: '#ff8a4a', weight: 90,
    effects: {
      chest: [{ stat: 'fireRes', kind: 'flat', value: 0.12 }],
      gloves: [{ stat: 'addedFire', kind: 'flat', value: 3 }],
      default: [{ stat: 'damage', kind: 'increased', value: 0.06, tags: ['fire'] }],
    },
  },
  {
    id: 'morren', name: 'Morren, Vestige of the Tide', glyph: 'ᛗ', color: '#7ab8d8', weight: 80,
    effects: {
      chest: [{ stat: 'energyShield', kind: 'flat', value: 20 }],
      gloves: [{ stat: 'castSpeed', kind: 'increased', value: 0.05 }],
      default: [{ stat: 'mana', kind: 'flat', value: 15 }],
    },
  },
  {
    id: 'sylph', name: 'Sylph, Vestige of the Gale', glyph: 'ᛋ', color: '#9ad8b8', weight: 75,
    effects: {
      boots: [{ stat: 'moveSpeed', kind: 'increased', value: 0.07 }],
      gloves: [{ stat: 'attackSpeed', kind: 'increased', value: 0.05 }],
      default: [{ stat: 'evasion', kind: 'flat', value: 40 }],
    },
  },
  {
    id: 'aurel', name: 'Aurel, Vestige of the Dawn', glyph: 'ᚨ', color: '#ffd34d', weight: 55,
    effects: {
      gloves: [{ stat: 'critChance', kind: 'flat', value: 0.015 }],
      helmet: [{ stat: 'critMulti', kind: 'flat', value: 0.12 }],
      default: [{ stat: 'accuracy', kind: 'flat', value: 40 }],
    },
  },
  {
    id: 'noct', name: 'Noct, Vestige of the Hollow', glyph: 'ᚾ', color: '#c45ae0', weight: 50,
    effects: {
      gloves: [{ stat: 'addedChaos', kind: 'flat', value: 4 }],
      helmet: [{ stat: 'minionDamage', kind: 'increased', value: 0.12 }],
      default: [{ stat: 'chaosRes', kind: 'flat', value: 0.1 }],
    },
  },
  {
    id: 'grim', name: 'Grim, Vestige of the Grave', glyph: 'ᚷ', color: '#8ec84e', weight: 45,
    effects: {
      helmet: [{ stat: 'minionLife', kind: 'increased', value: 0.15 }],
      chest: [{ stat: 'minionDamage', kind: 'increased', value: 0.1 }],
      default: [{ stat: 'minionRegen', kind: 'flat', value: 1.5 }],
    },
  },
  // The Aetherial's own remembered name — carried down by whoever survives
  // the crossing. Boots remember the causeway; helm the halo's arithmetic.
  {
    id: 'seraphiel', name: 'Seraphiel, Vestige of the Host', glyph: 'ᛋ', color: '#ffe9a8', weight: 42,
    effects: {
      boots: [{ stat: 'moveSpeed', kind: 'increased', value: 0.06 }],
      helmet: [{ stat: 'apply_shock', kind: 'flat', value: 0.08 }],
      gloves: [{ stat: 'damage', kind: 'increased', value: 0.08, tags: ['movement'] }],
      default: [{ stat: 'lightningRes', kind: 'flat', value: 0.1 }],
    },
  },
];

export const VESTIGES: Record<string, VestigeDef> =
  Object.fromEntries(VESTIGE_LIST.map(v => [v.id, v]));

// ------------------------------------------------------------- epitaphs ----

export interface EpitaphDef {
  id: string;
  name: string;
  /** The EXACT vestige sequence, in socket order (repeats allowed). */
  sequence: string[];
  /** Categories whose white bases can bear this word. */
  categories: ItemCategory[];
  /** The word's own lines — granted ON TOP of each vestige's. */
  effects: VestigeLine[];
  flavor?: string;
}

export const EPITAPH_LIST: EpitaphDef[] = [
  {
    id: 'wakeward', name: 'Wakeward', sequence: ['dur', 'kessa', 'dur'], categories: ['chest'],
    effects: [
      { stat: 'armor', kind: 'increased', value: 0.3 },
      { stat: 'thorns', kind: 'flat', value: 12 },
      { stat: 'poise', kind: 'flat', value: 40 },
    ],
    flavor: 'Let them break on me as the wake breaks on stone.',
  },
  {
    id: 'still_waters', name: 'Still Waters', sequence: ['morren', 'kessa'], categories: ['chest'],
    effects: [
      { stat: 'energyShield', kind: 'increased', value: 0.25 },
      { stat: 'manaShield', kind: 'flat', value: 0.12 },
    ],
    flavor: 'The surface forgets every stone thrown through it.',
  },
  {
    id: 'pyre_song', name: 'Pyre Song', sequence: ['thal', 'sylph'], categories: ['gloves'],
    effects: [
      { stat: 'attackSpeed', kind: 'increased', value: 0.08 },
      { stat: 'addedFire', kind: 'flat', value: 6 },
      { stat: 'apply_burn', kind: 'flat', value: 0.1 },
    ],
    flavor: 'Fast hands feed the fire.',
  },
  {
    id: 'gravebound_choir', name: 'Gravebound Choir', sequence: ['grim', 'noct', 'kessa'], categories: ['helmet'],
    effects: [
      { stat: 'minionDamage', kind: 'increased', value: 0.25 },
      { stat: 'minionLife', kind: 'increased', value: 0.2 },
      { stat: 'minionApply_poison', kind: 'flat', value: 0.08 },
    ],
    flavor: 'Every voice below the ground, singing up through one skull.',
  },
  {
    id: 'herald_of_dawn', name: 'Herald of Dawn', sequence: ['aurel', 'sylph', 'morren'], categories: ['helmet'],
    effects: [
      { stat: 'critChance', kind: 'flat', value: 0.02 },
      { stat: 'castSpeed', kind: 'increased', value: 0.08 },
      { stat: 'insight', kind: 'flat', value: 25 },
    ],
    flavor: 'The first light does not knock.',
  },
];

export const EPITAPHS: Record<string, EpitaphDef> =
  Object.fromEntries(EPITAPH_LIST.map(e => [e.id, e]));

/** The epitaph a socket layout spells, if any: COMMON base, allowed
 *  category, and the filled sequence matching EXACTLY (order and count). */
export function epitaphFor(
  rarity: string, category: ItemCategory, sockets: readonly (string | null)[] | undefined,
): EpitaphDef | null {
  if (rarity !== 'common' || !sockets || sockets.length === 0) return null;
  if (sockets.some(s => s === null)) return null;
  for (const e of EPITAPH_LIST) {
    if (!e.categories.includes(category)) continue;
    if (e.sequence.length !== sockets.length) continue;
    if (e.sequence.every((id, i) => sockets[i] === id)) return e;
  }
  return null;
}
