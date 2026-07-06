// ---------------------------------------------------------------------------
// ITEM AFFIXES — the rollable mod gamut, as generated families.
//
// Every family is one fam() call: it builds a BEST-FIRST tier ladder
// (contiguous value windows spread across the item-level range) and — unless
// opted out — auto-mints an EXQUISITE tier above T1 that only MAGIC items can
// roll (ITEM_CFG.exquisite): the D2 rule that a blue can carry the single
// highest roll in the game, unrollable on rares.
//
// Wherever a real registry exists we GENERATE from it rather than hand-list:
// attributes from ATTRIBUTES, resistances/added-damage from DAMAGE_TYPES,
// ailment chances from the apply_<status> stat family. A new attribute,
// damage type, or status becomes rollable gear the moment it registers.
//
// Prefix/suffix split follows genre convention: prefixes are POOLS AND POWER
// (life, defenses, damage), suffixes are RATES AND FACULTIES (attributes,
// resists, speeds, crit, sustain). Base gating rides base TAGS (category ids,
// 'armour', 'jewelry', defense kinds), so a family declares WHERE it rolls in
// the same vocabulary bases declare what they are.
// ---------------------------------------------------------------------------

import {
  ITEM_CFG,
  type AffixDef, type AffixKind, type AffixTierDef, type ModLineDef,
} from '../engine/items';
import {
  ATTRIBUTE_IDS, ATTRIBUTES, DAMAGE_TYPES,
  type ConditionId, type ModKind, type SkillTag,
} from '../engine/stats';
import { CLASSES, classSkillStat } from './classes';

// ------------------------------------------------------------ generation ---

interface FamOpts {
  id: string;
  kind: AffixKind;
  /** Name particles, BEST-FIRST (clamped at the last for low tiers). */
  names: string[];
  /** Single-line families: the stat + mod kind (+ optional filters). */
  stat?: string;
  modKind?: ModKind;
  tags?: SkillTag[];
  when?: ConditionId;
  /** Multi-line families (hybrids, all-res) override the single line. */
  lines?: ModLineDef[];
  /** Top-tier MAX per line (scalar broadcast when lines share a scale). */
  top: number | number[];
  /** Worst tier's floor as a fraction of top (windows are contiguous). */
  floor?: number;
  /** Ladder length (before the exquisite mint). */
  count?: number;
  weight?: number;
  /** Rolls only on bases sharing ≥1 of these tags. */
  baseTags?: string[];
  excludeTags?: string[];
  /** Opt out of the auto EXQUISITE tier. */
  exquisite?: boolean;
  /** ilvl at which T1 unlocks (ladder spreads 1..this). Defaults to the
   *  second-to-last tier break so T1 affixes arrive before endgame bases. */
  maxIlvl?: number;
}

const DEFAULT_FLOOR = 0.14;
const DEFAULT_COUNT = 5;
const LADDER_CURVE = 1.15;

/** Build one affix family: contiguous best-first tier windows + exquisite. */
function fam(o: FamOpts): AffixDef {
  const lines: ModLineDef[] = o.lines ?? [{
    stat: o.stat!, kind: o.modKind ?? 'flat', tags: o.tags, when: o.when,
  }];
  const tops = Array.isArray(o.top) ? o.top : lines.map(() => o.top as number);
  const floor = o.floor ?? DEFAULT_FLOOR;
  const count = o.count ?? DEFAULT_COUNT;
  const maxIlvl = o.maxIlvl ?? ITEM_CFG.tierBreaks[Math.max(0, ITEM_CFG.tierBreaks.length - 2)];

  // Value fence posts per line: floor·top → top across `count` windows.
  const post = (top: number, i: number): number =>
    top * (floor + (1 - floor) * Math.pow(i / count, LADDER_CURVE));

  const tiers: AffixTierDef[] = [];
  for (let t = 0; t < count; t++) {
    // t = 0 is the BEST tier (window count-1..count of the fence).
    const k = count - t;
    tiers.push({
      ilvl: Math.max(1, Math.round(1 + (maxIlvl - 1) * ((k - 1) / Math.max(1, count - 1)))),
      ranges: tops.map(top => [post(top, k - 1), post(top, k)] as [number, number]),
      weight: 100,
    });
  }
  if (o.exquisite !== false) {
    const ex = ITEM_CFG.exquisite;
    tiers.unshift({
      ilvl: tiers[0].ilvl + ex.ilvlPad,
      ranges: tops.map(top => [top, top * (1 + ex.rangeLift)] as [number, number]),
      weight: Math.round(100 * ex.weightFrac),
      magicOnly: true,
    });
  }
  return {
    id: o.id, kind: o.kind, family: o.id, names: o.names, lines, tiers,
    weight: o.weight ?? 100, tags: o.baseTags, excludeTags: o.excludeTags,
  };
}

const cap = (s: string): string => s[0].toUpperCase() + s.slice(1);

// ---------------------------------------------------- registry-generated ---

/** +Attribute suffixes — one per registered attribute, all ten triads. */
const ATTRIBUTE_AFFIXES: AffixDef[] = ATTRIBUTE_IDS.map(id => fam({
  id: `attr_${id}`, kind: 'suffix',
  names: [`of ${ATTRIBUTES[id].label}`],
  stat: id, top: 12, floor: 0.2, count: 4, weight: 70,
}));

const RES_NAMES: Record<string, string> = {
  fire: 'of the Salamander', cold: 'of the Glacier',
  lightning: 'of the Tempest', chaos: 'of the Void',
};

/** Resistance suffixes — generated per damage type carrying a resist stat. */
const RESIST_AFFIXES: AffixDef[] = DAMAGE_TYPES
  .filter(t => t !== 'physical')
  .map(t => fam({
    id: `res_${t}`, kind: 'suffix',
    names: [RES_NAMES[t] ?? `of ${cap(t)} Warding`],
    stat: `${t}Res`, top: 0.35, floor: 0.15, weight: 110,
  }));

const ADDED_NAMES: Record<string, string> = {
  physical: 'Jagged', fire: 'Flaming', cold: 'Chilling',
  lightning: 'Charged', chaos: 'Vile',
};

/** Flat added-damage prefixes — hands, jewelry, and the future weapon lanes. */
const ADDED_AFFIXES: AffixDef[] = DAMAGE_TYPES.map(t => fam({
  id: `added_${t}`, kind: 'prefix',
  names: [ADDED_NAMES[t] ?? cap(t)],
  stat: `added${cap(t)}`, top: t === 'physical' ? 9 : 11, floor: 0.18,
  baseTags: ['gloves', 'ring', 'amulet', 'quiver', 'weapon'], weight: 80,
}));

/** %-increased damage prefixes by skill tag — the build-lane amplifiers. */
const DAMAGE_LANES: { key: string; tag: SkillTag; name: string }[] = [
  { key: 'melee', tag: 'melee', name: 'Brutal' },
  { key: 'spell', tag: 'spell', name: 'Arcane' },
  { key: 'projectile', tag: 'projectile', name: 'Fletched' },
  { key: 'minion', tag: 'minion', name: 'Commanding' },
  { key: 'aoe', tag: 'aoe', name: 'Vast' },
  { key: 'physical', tag: 'physical', name: 'Savage' },
  { key: 'fire', tag: 'fire', name: 'Pyric' },
  { key: 'cold', tag: 'cold', name: 'Rimed' },
  { key: 'lightning', tag: 'lightning', name: 'Voltaic' },
  { key: 'chaos', tag: 'chaos', name: 'Baleful' },
];
const DAMAGE_AFFIXES: AffixDef[] = DAMAGE_LANES.map(l => fam({
  id: `dmg_${l.key}`, kind: 'prefix',
  names: [l.name],
  stat: 'damage', modKind: 'increased', tags: [l.tag],
  top: 0.24, floor: 0.2, weight: 70,
}));

const APPLY_NAMES: Record<string, string> = {
  burn: 'of Immolation', bleed: 'of Laceration', poison: 'of Venom',
  chill: 'of Rime', shock: 'of Static',
};

/** Ailment-chance suffixes over the generated apply_<status> stat family. */
const APPLY_AFFIXES: AffixDef[] = Object.keys(APPLY_NAMES).map(s => fam({
  id: `apply_${s}`, kind: 'suffix',
  names: [APPLY_NAMES[s]],
  stat: `apply_${s}`, top: 0.22, floor: 0.25, count: 4, weight: 55,
}));

/** "+1 to <Class> Skills" — one family per registered class, resolving
 *  DYNAMICALLY against that class's live starting bar (classes.ts
 *  classSkillStat + recalcSeat). Integer ladder: T1 grants +1; the
 *  EXQUISITE grants +2 — a chase blue amulet for every archetype. */
const CLASS_SKILL_AFFIXES: AffixDef[] = CLASSES.map(c => ({
  id: `class_skills_${c.id}`,
  kind: 'suffix' as AffixKind,
  family: `class_skills_${c.id}`,
  names: [`of the ${c.name}`],
  lines: [{ stat: classSkillStat(c.id), kind: 'flat' as ModKind }],
  tiers: [
    {
      ilvl: ITEM_CFG.tierBreaks[Math.max(0, ITEM_CFG.tierBreaks.length - 2)] + ITEM_CFG.exquisite.ilvlPad,
      ranges: [[2, 2]] as [number, number][],
      weight: Math.round(100 * ITEM_CFG.exquisite.weightFrac),
      magicOnly: true,
    },
    { ilvl: 8, ranges: [[1, 1]] as [number, number][], weight: 100 },
  ],
  weight: 22,
  tags: ['amulet', 'helmet'],
}));

// ------------------------------------------------------------- prefixes ----

const PREFIXES: AffixDef[] = [
  fam({
    id: 'life', kind: 'prefix',
    names: ['Colossal', 'Virile', 'Vigorous', 'Stout', 'Hale'],
    stat: 'life', top: 85, floor: 0.08, count: 6, weight: 130,
  }),
  fam({
    id: 'mana', kind: 'prefix',
    names: ['Azure', 'Cerulean', 'Sapphirine', 'Beryl'],
    stat: 'mana', top: 60, floor: 0.1, weight: 100,
  }),
  fam({
    id: 'es_flat', kind: 'prefix',
    names: ['Radiant', 'Gleaming', 'Shining', 'Glimmering'],
    stat: 'energyShield', top: 45, floor: 0.12, weight: 90,
  }),
  fam({
    id: 'es_pct', kind: 'prefix',
    names: ['Resplendent', 'Luminous', 'Bright'],
    stat: 'energyShield', modKind: 'increased', top: 0.35, floor: 0.2,
    baseTags: ['armour'], weight: 80,
  }),
  fam({
    id: 'armor_flat', kind: 'prefix',
    names: ['Adamant', 'Lacquered', 'Studded', 'Boiled'],
    stat: 'armor', top: 160, floor: 0.1, baseTags: ['armour'], weight: 110,
  }),
  fam({
    id: 'armor_pct', kind: 'prefix',
    names: ['Impregnable', 'Reinforced', 'Riveted'],
    stat: 'armor', modKind: 'increased', top: 0.4, floor: 0.2,
    baseTags: ['armour'], weight: 90,
  }),
  fam({
    id: 'evasion_flat', kind: 'prefix',
    names: ['Phantasmal', 'Limber', 'Supple', 'Oiled'],
    stat: 'evasion', top: 140, floor: 0.1, baseTags: ['armour'], weight: 110,
  }),
  fam({
    id: 'evasion_pct', kind: 'prefix',
    names: ['Untouchable', 'Nimble', 'Fleet'],
    stat: 'evasion', modKind: 'increased', top: 0.4, floor: 0.2,
    baseTags: ['armour'], weight: 90,
  }),
  fam({
    id: 'poise', kind: 'prefix',
    names: ['Immovable', 'Unyielding', 'Braced'],
    stat: 'poise', top: 60, floor: 0.15, baseTags: ['belt', 'chest', 'helmet'], weight: 70,
  }),
  fam({
    id: 'endurance', kind: 'prefix',
    names: ['Marathon', 'Tireless', 'Enduring'],
    stat: 'endurance', top: 45, floor: 0.15, baseTags: ['belt'], weight: 70,
  }),
  fam({
    id: 'insight', kind: 'prefix',
    names: ['Oracular', 'Keen', 'Watchful'],
    stat: 'insight', top: 40, floor: 0.15, baseTags: ['helmet', 'boots'], weight: 70,
  }),
  fam({
    id: 'thorns', kind: 'prefix',
    names: ['Bristling', 'Barbed', 'Spiked'],
    stat: 'thorns', top: 25, floor: 0.15, baseTags: ['chest', 'belt'], weight: 60,
  }),
  fam({
    id: 'minion_damage', kind: 'prefix',
    names: ["Tyrant's", "Overseer's", "Taskmaster's"],
    stat: 'minionDamage', modKind: 'increased', top: 0.3, floor: 0.2,
    baseTags: ['helmet', 'amulet'], weight: 60,
  }),
  fam({
    id: 'minion_life', kind: 'prefix',
    names: ["Warden's", "Shepherd's", "Keeper's"],
    stat: 'minionLife', modKind: 'increased', top: 0.35, floor: 0.2,
    baseTags: ['helmet', 'amulet'], weight: 60,
  }),
  // MONSTER-INFREQUENT lines — roll ONLY on mi_<theme> bases (the same tag
  // gate as everything else; see data/infrequents.ts). Each theme gets one
  // signature family, exquisite included: a magic Goblin Scrapper can carry
  // the greediest Scavenger's roll in the game.
  fam({
    id: 'mi_goblin_scavenger', kind: 'prefix',
    names: ["Kleptocrat's", "Scavenger's", "Mudgrubber's"],
    lines: [{ stat: 'lifeOnKill', kind: 'flat' }, { stat: 'manaOnKill', kind: 'flat' }],
    top: [10, 7], floor: 0.25, count: 4, baseTags: ['mi_goblin'], weight: 90,
  }),
  fam({
    id: 'mi_bandit_extortion', kind: 'prefix',
    names: ["Highwayman's", "Extortioner's", "Footpad's"],
    lines: [{ stat: 'lifeLeech', kind: 'flat' }, { stat: 'manaLeech', kind: 'flat' }],
    top: [0.035, 0.035], floor: 0.3, count: 3, baseTags: ['mi_bandit'], weight: 90,
  }),
  fam({
    id: 'mi_undead_gravecaller', kind: 'prefix',
    names: ["Lichgate", "Gravecaller's", "Mournful"],
    lines: [{ stat: 'minionDamage', kind: 'increased' }, { stat: 'minionRegen', kind: 'flat' }],
    top: [0.35, 3], floor: 0.25, count: 4, baseTags: ['mi_undead'], weight: 90,
  }),

  // Hybrid demos — multi-line families with per-line tops.
  fam({
    id: 'hybrid_life_mana', kind: 'prefix',
    names: ['Opaline', 'Nacreous'],
    lines: [{ stat: 'life', kind: 'flat' }, { stat: 'mana', kind: 'flat' }],
    top: [40, 35], floor: 0.2, count: 3, weight: 45,
  }),
  fam({
    id: 'hybrid_armor_evasion', kind: 'prefix',
    names: ["Scrapper's", "Skirmisher's"],
    lines: [{ stat: 'armor', kind: 'flat' }, { stat: 'evasion', kind: 'flat' }],
    top: [90, 80], floor: 0.2, count: 3, baseTags: ['armour'], weight: 45,
  }),
  ...ADDED_AFFIXES,
  ...DAMAGE_AFFIXES,
];

// ------------------------------------------------------------- suffixes ----

const SUFFIXES: AffixDef[] = [
  fam({
    id: 'attack_speed', kind: 'suffix',
    names: ['of Alacrity', 'of Celerity', 'of Quickness'],
    stat: 'attackSpeed', modKind: 'increased', top: 0.13, floor: 0.3,
    baseTags: ['gloves', 'ring', 'amulet', 'quiver', 'weapon'], weight: 85,
  }),
  fam({
    id: 'cast_speed', kind: 'suffix',
    names: ['of Incantation', 'of Recitation', 'of Murmurs'],
    stat: 'castSpeed', modKind: 'increased', top: 0.13, floor: 0.3,
    baseTags: ['gloves', 'ring', 'amulet'], weight: 85,
  }),
  // THE chase blue: exquisite move speed exists only on magic boots.
  fam({
    id: 'move_speed', kind: 'suffix',
    names: ['of the Zephyr', 'of the Stag', 'of the Courser', 'of Pace'],
    stat: 'moveSpeed', modKind: 'increased', top: 0.2, floor: 0.25, count: 4,
    baseTags: ['boots'], weight: 90,
  }),
  fam({
    id: 'crit_chance', kind: 'suffix',
    names: ['of Precision', 'of Incision', 'of Aim'],
    stat: 'critChance', top: 0.045, floor: 0.22,
    baseTags: ['gloves', 'ring', 'amulet', 'quiver', 'weapon'], weight: 75,
  }),
  fam({
    id: 'crit_multi', kind: 'suffix',
    names: ['of Ruin', 'of Havoc', 'of Malice'],
    stat: 'critMulti', top: 0.35, floor: 0.2,
    baseTags: ['gloves', 'ring', 'amulet', 'quiver', 'weapon'], weight: 70,
  }),
  fam({
    id: 'accuracy', kind: 'suffix',
    names: ['of the Hawk', 'of the Kestrel', 'of Marksmanship'],
    stat: 'accuracy', top: 120, floor: 0.15, weight: 80,
  }),
  fam({
    id: 'life_regen', kind: 'suffix',
    names: ['of Mending', 'of Knitting', 'of Scabbing'],
    stat: 'lifeRegen', top: 6, floor: 0.15, weight: 90,
  }),
  fam({
    id: 'mana_regen', kind: 'suffix',
    names: ['of the Font', 'of the Spring', 'of the Trickle'],
    stat: 'manaRegen', top: 4, floor: 0.15, weight: 90,
  }),
  fam({
    id: 'life_leech', kind: 'suffix',
    names: ['of the Leech', 'of the Tick'],
    stat: 'lifeLeech', top: 0.03, floor: 0.3, count: 3, weight: 50,
  }),
  fam({
    id: 'mana_leech', kind: 'suffix',
    names: ['of the Lamprey', 'of the Mosquito'],
    stat: 'manaLeech', top: 0.03, floor: 0.3, count: 3, weight: 50,
  }),
  fam({
    id: 'life_on_hit', kind: 'suffix',
    names: ['of Biting', 'of Gnawing'],
    stat: 'lifeOnHit', top: 4, floor: 0.25, count: 3, weight: 55,
  }),
  fam({
    id: 'life_on_kill', kind: 'suffix',
    names: ['of Reaping', 'of Harvesting'],
    stat: 'lifeOnKill', top: 12, floor: 0.2, count: 3, weight: 55,
  }),
  fam({
    id: 'mana_on_kill', kind: 'suffix',
    names: ['of Osmosis', 'of Sipping'],
    stat: 'manaOnKill', top: 8, floor: 0.2, count: 3, weight: 55,
  }),
  fam({
    id: 'cooldown', kind: 'suffix',
    names: ['of Readiness', 'of Promptness'],
    stat: 'cooldownRecovery', modKind: 'increased', top: 0.16, floor: 0.3, weight: 60,
  }),
  fam({
    id: 'aoe', kind: 'suffix',
    names: ['of Breadth', 'of Span'],
    stat: 'aoeRadius', modKind: 'increased', top: 0.18, floor: 0.3, weight: 60,
  }),
  fam({
    id: 'proj_speed', kind: 'suffix',
    names: ['of Flight', 'of Loft'],
    stat: 'projectileSpeed', modKind: 'increased', top: 0.25, floor: 0.25,
    baseTags: ['quiver', 'ring', 'gloves'], weight: 60,
  }),
  fam({
    id: 'duration', kind: 'suffix',
    names: ['of Persistence', 'of Lingering'],
    stat: 'effectDuration', modKind: 'increased', top: 0.2, floor: 0.25, weight: 60,
  }),
  fam({
    id: 'heal_power', kind: 'suffix',
    names: ['of Benediction', 'of Grace'],
    stat: 'healPower', modKind: 'increased', top: 0.25, floor: 0.25,
    baseTags: ['amulet', 'gloves', 'ring'], weight: 55,
  }),
  fam({
    id: 'luck', kind: 'suffix',
    names: ['of Fortune', 'of Serendipity'],
    stat: 'luck', modKind: 'increased', top: 0.2, floor: 0.3,
    baseTags: ['jewelry'], weight: 45,
  }),
  fam({
    id: 'skill_charges', kind: 'suffix',
    names: ['of Reserves'],
    stat: 'skillCharges', top: 1, floor: 1, count: 1, exquisite: false,
    maxIlvl: 15, weight: 25,
  }),
  fam({
    id: 'charge_rate', kind: 'suffix',
    names: ['of Stamina', 'of Wind'],
    stat: 'skillChargeRate', modKind: 'increased', top: 0.25, floor: 0.25, weight: 50,
  }),
  // Dormant until offhand bases ship — proves future-slot gating costs nothing.
  fam({
    id: 'block', kind: 'suffix',
    names: ['of Warding', 'of Parrying'],
    stat: 'blockChance', top: 0.08, floor: 0.3, count: 3,
    baseTags: ['offhand'], weight: 60,
  }),
  fam({
    id: 'all_res', kind: 'suffix',
    names: ['of the Prism', 'of the Rainbow'],
    lines: DAMAGE_TYPES.filter(t => t !== 'physical').map((t, i) => ({
      stat: `${t}Res`, kind: 'flat' as ModKind, sharedRoll: i > 0,
    })),
    top: DAMAGE_TYPES.filter(t => t !== 'physical').map(() => 0.12),
    floor: 0.3, count: 3, weight: 40,
  }),
  ...ATTRIBUTE_AFFIXES,
  ...RESIST_AFFIXES,
  ...APPLY_AFFIXES,
  ...CLASS_SKILL_AFFIXES,
];

// ---------------------------------------------------------------- export ---

export const ITEM_AFFIX_LIST: AffixDef[] = [...PREFIXES, ...SUFFIXES];

export const ITEM_AFFIXES: Record<string, AffixDef> =
  Object.fromEntries(ITEM_AFFIX_LIST.map(a => [a.id, a]));
