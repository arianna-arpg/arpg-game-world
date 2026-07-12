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
//
// SCOPES: defense families come in LOCAL ("… on this item" — folds into the
// item's own defense header, priced hot because it scales one item) and
// GLOBAL (character-wide, priced at a fraction) flavors, generated per
// DefenseKind by DEFENSE_GAMUT below. The display suffix is the contract:
// a line without "on this item" ALWAYS means your whole character.
// ---------------------------------------------------------------------------

import {
  DEFENSE_KINDS, ITEM_CFG,
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
  /** LOCAL SCOPE: the single line modifies THIS ITEM's own stats (the fold
   *  in itemgen) instead of the wearer's sheet — displays " on this item".
   *  Multi-line families set `local` per line in `lines` instead. */
  local?: boolean;
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
  /** The WHOLE family is magic-exclusive (every tier magicOnly) — a class
   *  of power blues alone can carry, beyond the per-family EX tier. */
  magicOnly?: boolean;
  /** THEME tags — meet ItemBaseDef.affinity multipliers, so a 'caster'
   *  family leans onto energy-shield bases without being gated there. */
  themes?: string[];
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
    ...(o.local ? { local: true } : {}),
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
      ...(o.magicOnly ? { magicOnly: true } : {}),
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
    themes: o.themes,
  };
}

// The theme vocabulary — open strings; these constants only guard typos.
// A base declares AFFINITY for a theme (itembases.ts); a themed family
// rolls proportionally more often there. Weights within a themed pool stay
// per-family (AffixDef.weight), so "spell damage outnumbers fortitude on a
// caster chest" is both levers composing.
const CASTER = 'caster';
const MARTIAL = 'martial';
const RANGER = 'ranger';
const SUMMONER = 'summoner';
const DEFENSE = 'defense';
const SUSTAIN = 'sustain';

const cap = (s: string): string => s[0].toUpperCase() + s.slice(1);

// ------------------------------------------------ defense gamut (generated) -
//
// Every registered DefenseKind gets the SAME three-lane wardrobe, minted from
// one spec row — the LOCAL/GLOBAL doctrine in data form:
//  · <id>_flat        LOCAL  — "+45 Energy Shield on this item". Slot-flavored
//                              gates (poise reads belt/torso, insight head/feet).
//  · <id>_pct         LOCAL  — "60% increased Armor on this item". Rolls ONLY
//                              on bases CARRYING the kind (its mix tag), so the
//                              multiplier always has something to multiply.
//  · <id>_pct_global  GLOBAL — "10% increased Armor", character-wide, priced
//                              several times lower BECAUSE it scales everything.
//                              Jewelry/belt territory — and since a belt can
//                              carry both scopes at once, the two phrasings
//                              teach themselves on sight.
// A kind may also open a GLOBAL FLAT lane (ES's classic jewelry roll).
// Registering a new defense kind ships its whole wardrobe with one row here.

/** Per-kind knobs for the generated local/global defense affix gamut. */
interface DefenseGamutSpec {
  /** DEFENSE_KINDS key (also the mix tag bases carry). */
  kind: string;
  /** Affix id stem ('es' → es_flat / es_pct / es_pct_global). */
  id: string;
  flatNames: string[];
  pctNames: string[];
  globalNames: string[];
  /** Local flat: T1 top, floor, slot gates, weight. */
  flatTop: number;
  flatFloor?: number;
  flatTags: string[];
  flatWeight?: number;
  /** Local %: T1 top override (exotic pools run cooler than the big three). */
  pctTop?: number;
  pctWeight?: number;
  /** Global %: T1 top / weight overrides. */
  globalTop?: number;
  globalWeight?: number;
  /** Open the global FLAT jewelry lane at this top (omit = no such lane). */
  globalFlatTop?: number;
  globalFlatNames?: string[];
  themes?: string[];
}

/** LOCAL % tops — item-defining because they scale ONE item. */
const LOCAL_PCT_TOP = 0.8;
/** GLOBAL % top — deliberately a fraction of the local ceiling; mid tiers
 *  read "10% increased X" against the local lane's "50% … on this item". */
const GLOBAL_PCT_TOP = 0.15;
/** Where the global % lanes live: jewelry plus the belt bridge slot (a belt
 *  can roll BOTH scopes of one stat — the built-in teaching moment). */
const GLOBAL_PCT_TAGS = ['jewelry', 'belt'];

const DEFENSE_GAMUT: DefenseGamutSpec[] = [
  {
    kind: 'armor', id: 'armor', themes: [DEFENSE],
    flatNames: ['Adamant', 'Lacquered', 'Studded', 'Boiled'],
    flatTop: 160, flatFloor: 0.1, flatTags: ['armour'], flatWeight: 110,
    pctNames: ['Impregnable', 'Reinforced', 'Riveted'],
    globalNames: ['Bastioned', 'Fortified', 'Bolstered'],
  },
  {
    kind: 'evasion', id: 'evasion', themes: [DEFENSE, RANGER],
    flatNames: ['Phantasmal', 'Limber', 'Supple', 'Oiled'],
    flatTop: 140, flatFloor: 0.1, flatTags: ['armour'], flatWeight: 110,
    pctNames: ['Untouchable', 'Nimble', 'Fleet'],
    globalNames: ['Spectral', 'Elusive', 'Shifting'],
  },
  {
    kind: 'energyShield', id: 'es', themes: [CASTER],
    flatNames: ['Radiant', 'Gleaming', 'Shining', 'Glimmering'],
    flatTop: 45, flatFloor: 0.12, flatTags: ['armour'], flatWeight: 90,
    pctNames: ['Resplendent', 'Luminous', 'Bright'],
    globalNames: ['Aetheric', 'Otherworldly', 'Numinous'],
    // The classic jewelry lane: global flat ES on rings/amulets.
    globalFlatTop: 30, globalFlatNames: ['Opalescent', 'Pearled', 'Lustrous'],
  },
  // The exotic pools — smaller multipliers (the pools are cheaper per point),
  // same three-lane shape: invest in ONE great poise item, or in the pool.
  {
    kind: 'poise', id: 'poise', themes: [DEFENSE],
    flatNames: ['Immovable', 'Unyielding', 'Braced'],
    flatTop: 60, flatTags: ['belt', 'chest', 'helmet'], flatWeight: 70,
    pctNames: ['Adamantine', 'Rooted', 'Planted'],
    globalNames: ['Steadfast', 'Grounded', 'Composed'],
    pctTop: 0.65, pctWeight: 60, globalWeight: 40,
  },
  {
    kind: 'endurance', id: 'endurance', themes: [DEFENSE, SUSTAIN],
    flatNames: ['Marathon', 'Tireless', 'Enduring'],
    flatTop: 45, flatTags: ['belt'], flatWeight: 70,
    pctNames: ['Indefatigable', 'Unflagging'],
    globalNames: ['Persevering', 'Stubborn'],
    pctTop: 0.65, pctWeight: 60, globalWeight: 40,
  },
  {
    kind: 'insight', id: 'insight', themes: [DEFENSE],
    flatNames: ['Oracular', 'Keen', 'Watchful'],
    flatTop: 40, flatTags: ['helmet', 'boots'], flatWeight: 70,
    pctNames: ['Illuminated', 'Clear-Eyed'],
    globalNames: ['Clairvoyant', 'Perceptive', 'Heedful'],
    pctTop: 0.65, pctWeight: 60, globalWeight: 40,
  },
];

/** Mint one kind's wardrobe: local flat, local %, global % (+ global flat). */
function defenseGamut(spec: DefenseGamutSpec): AffixDef[] {
  const stat = DEFENSE_KINDS[spec.kind].stat;
  const out: AffixDef[] = [
    fam({
      id: `${spec.id}_flat`, kind: 'prefix', themes: spec.themes, local: true,
      names: spec.flatNames, stat, top: spec.flatTop,
      floor: spec.flatFloor ?? 0.15, baseTags: spec.flatTags,
      weight: spec.flatWeight ?? 90,
    }),
    fam({
      id: `${spec.id}_pct`, kind: 'prefix', themes: spec.themes, local: true,
      names: spec.pctNames, stat, modKind: 'increased',
      top: spec.pctTop ?? LOCAL_PCT_TOP, floor: 0.2,
      baseTags: [spec.kind], weight: spec.pctWeight ?? 90,
    }),
    fam({
      id: `${spec.id}_pct_global`, kind: 'prefix', themes: spec.themes,
      names: spec.globalNames, stat, modKind: 'increased',
      top: spec.globalTop ?? GLOBAL_PCT_TOP, floor: 0.2,
      baseTags: GLOBAL_PCT_TAGS, weight: spec.globalWeight ?? 50,
    }),
  ];
  if (spec.globalFlatTop !== undefined) {
    out.push(fam({
      id: `${spec.id}_flat_global`, kind: 'prefix', themes: spec.themes,
      names: spec.globalFlatNames ?? spec.flatNames, stat,
      top: spec.globalFlatTop, floor: 0.15, baseTags: ['jewelry'], weight: 60,
    }));
  }
  return out;
}

const DEFENSE_AFFIXES: AffixDef[] = DEFENSE_GAMUT.flatMap(defenseGamut);

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
  id: `added_${t}`, kind: 'prefix', themes: t === 'physical' ? [MARTIAL] : [CASTER, MARTIAL],
  names: [ADDED_NAMES[t] ?? cap(t)],
  stat: `added${cap(t)}`, top: t === 'physical' ? 9 : 11, floor: 0.18,
  baseTags: ['gloves', 'ring', 'amulet', 'quiver', 'weapon'], weight: 80,
}));

/** %-increased damage prefixes by skill tag — the build-lane amplifiers. */
const LANE_THEME: Record<string, string[]> = {
  melee: [MARTIAL], spell: [CASTER], projectile: [RANGER], minion: [SUMMONER],
  physical: [MARTIAL], fire: [CASTER], cold: [CASTER], lightning: [CASTER], chaos: [CASTER],
};
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
  id: `dmg_${l.key}`, kind: 'prefix', themes: LANE_THEME[l.key],
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
    id: 'mana', kind: 'prefix', themes: [CASTER],
    names: ['Azure', 'Cerulean', 'Sapphirine', 'Beryl'],
    stat: 'mana', top: 60, floor: 0.1, weight: 100,
  }),
  // The whole defense wardrobe — local flat / local % / global % for every
  // registered DefenseKind — is GENERATED above (DEFENSE_GAMUT).
  ...DEFENSE_AFFIXES,
  fam({
    id: 'thorns', kind: 'prefix', themes: [DEFENSE],
    names: ['Bristling', 'Barbed', 'Spiked'],
    stat: 'thorns', top: 25, floor: 0.15, baseTags: ['chest', 'belt'], weight: 60,
  }),
  fam({
    id: 'minion_damage', kind: 'prefix', themes: [SUMMONER],
    names: ["Tyrant's", "Overseer's", "Taskmaster's"],
    stat: 'minionDamage', modKind: 'increased', top: 0.3, floor: 0.2,
    baseTags: ['helmet', 'amulet'], weight: 60,
  }),
  fam({
    id: 'minion_life', kind: 'prefix', themes: [SUMMONER],
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

  // PROC AFFIXES — chance stats from the PROC registry (proc_<id>; procs.ts
  // golden rules cap and depth-gate them). The two MAGIC-ONLY families are a
  // rarity identity, not a top tier: blues alone can carry them at all — the
  // D2 Crushing-Blow class of power, kept exclusive to keep blues forever
  // worth the look.
  fam({
    id: 'proc_concussive', kind: 'prefix', themes: [MARTIAL], magicOnly: true,
    names: ['Skullcracking', 'Concussive', 'Jarring'],
    stat: 'proc_brutal_strike', tags: ['attack'],
    top: 0.25, floor: 0.3, count: 3,
    baseTags: ['gloves', 'belt', 'ring'], weight: 55,
  }),
  fam({
    id: 'proc_stormlit', kind: 'prefix', themes: [CASTER], magicOnly: true,
    names: ['Stormlit', 'Static-Laced'],
    stat: 'proc_thunderstruck', tags: ['spell'],
    top: 0.18, floor: 0.3, count: 3,
    baseTags: ['amulet', 'ring', 'helmet'], weight: 55,
  }),
  // Hybrid demos — multi-line families with per-line tops.
  fam({
    id: 'hybrid_life_mana', kind: 'prefix',
    names: ['Opaline', 'Nacreous'],
    lines: [{ stat: 'life', kind: 'flat' }, { stat: 'mana', kind: 'flat' }],
    top: [40, 35], floor: 0.2, count: 3, weight: 45,
  }),
  fam({
    id: 'hybrid_armor_evasion', kind: 'prefix', themes: [DEFENSE],
    names: ["Scrapper's", "Skirmisher's"],
    // Both lines LOCAL — the hybrid armours the piece itself, PoE-style.
    lines: [{ stat: 'armor', kind: 'flat', local: true }, { stat: 'evasion', kind: 'flat', local: true }],
    top: [90, 80], floor: 0.2, count: 3, baseTags: ['armour'], weight: 45,
  }),
  ...ADDED_AFFIXES,
  ...DAMAGE_AFFIXES,
];

// ------------------------------------------------------------- suffixes ----

const SUFFIXES: AffixDef[] = [
  fam({
    id: 'attack_speed', kind: 'suffix', themes: [MARTIAL],
    names: ['of Alacrity', 'of Celerity', 'of Quickness'],
    stat: 'attackSpeed', modKind: 'increased', top: 0.13, floor: 0.3,
    baseTags: ['gloves', 'ring', 'amulet', 'quiver', 'weapon'], weight: 85,
  }),
  fam({
    id: 'cast_speed', kind: 'suffix', themes: [CASTER],
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
    id: 'crit_chance', kind: 'suffix', themes: [MARTIAL, CASTER],
    names: ['of Precision', 'of Incision', 'of Aim'],
    stat: 'critChance', top: 0.045, floor: 0.22,
    baseTags: ['gloves', 'ring', 'amulet', 'quiver', 'weapon'], weight: 75,
  }),
  fam({
    id: 'crit_multi', kind: 'suffix', themes: [MARTIAL, CASTER],
    names: ['of Ruin', 'of Havoc', 'of Malice'],
    stat: 'critMulti', top: 0.35, floor: 0.2,
    baseTags: ['gloves', 'ring', 'amulet', 'quiver', 'weapon'], weight: 70,
  }),
  fam({
    id: 'accuracy', kind: 'suffix', themes: [MARTIAL, RANGER],
    names: ['of the Hawk', 'of the Kestrel', 'of Marksmanship'],
    stat: 'accuracy', top: 120, floor: 0.15, weight: 80,
  }),
  fam({
    id: 'life_regen', kind: 'suffix', themes: [SUSTAIN],
    names: ['of Mending', 'of Knitting', 'of Scabbing'],
    stat: 'lifeRegen', top: 6, floor: 0.15, weight: 90,
  }),
  fam({
    id: 'mana_regen', kind: 'suffix', themes: [CASTER, SUSTAIN],
    names: ['of the Font', 'of the Spring', 'of the Trickle'],
    stat: 'manaRegen', top: 4, floor: 0.15, weight: 90,
  }),
  fam({
    id: 'life_leech', kind: 'suffix', themes: [SUSTAIN, MARTIAL],
    names: ['of the Leech', 'of the Tick'],
    stat: 'lifeLeech', top: 0.03, floor: 0.3, count: 3, weight: 50,
  }),
  fam({
    id: 'mana_leech', kind: 'suffix', themes: [SUSTAIN, CASTER],
    names: ['of the Lamprey', 'of the Mosquito'],
    stat: 'manaLeech', top: 0.03, floor: 0.3, count: 3, weight: 50,
  }),
  fam({
    id: 'life_on_hit', kind: 'suffix', themes: [SUSTAIN],
    names: ['of Biting', 'of Gnawing'],
    stat: 'lifeOnHit', top: 4, floor: 0.25, count: 3, weight: 55,
  }),
  fam({
    id: 'life_on_kill', kind: 'suffix', themes: [SUSTAIN],
    names: ['of Reaping', 'of Harvesting'],
    stat: 'lifeOnKill', top: 12, floor: 0.2, count: 3, weight: 55,
  }),
  fam({
    id: 'mana_on_kill', kind: 'suffix', themes: [SUSTAIN, CASTER],
    names: ['of Osmosis', 'of Sipping'],
    stat: 'manaOnKill', top: 8, floor: 0.2, count: 3, weight: 55,
  }),
  // POISE cycle levers — the break-bar's recovery machine, investable on
  // gear: faster recovery climbs, fight-to-stay-armed on-hit refill, and
  // overcharge headroom for the crest-then-eat-the-haymaker play.
  fam({
    id: 'poise_recovery', kind: 'suffix', themes: [DEFENSE, SUSTAIN],
    names: ['of Re-arming', 'of Recomposure'],
    stat: 'poiseRegenPct', modKind: 'increased', top: 0.4, floor: 0.25,
    baseTags: ['belt', 'chest', 'helmet'], weight: 55,
  }),
  fam({
    id: 'poise_on_hit', kind: 'suffix', themes: [DEFENSE, MARTIAL],
    names: ['of Bracing Blows', 'of Footing'],
    stat: 'poiseOnHit', top: 3, floor: 0.25, count: 3,
    baseTags: ['weapon', 'gloves'], weight: 50,
  }),
  fam({
    id: 'poise_overcharge', kind: 'suffix', themes: [DEFENSE],
    names: ['of the Bulwark Crest', 'of Bracing'],
    stat: 'poiseOvercharge', top: 0.25, floor: 0.3,
    baseTags: ['belt', 'amulet'], weight: 45,
  }),
  // ES recharge levers: the flow's speed, and its refusal to be interrupted.
  fam({
    id: 'es_recharge_rate', kind: 'suffix', themes: [CASTER, DEFENSE],
    names: ['of Resurgence', 'of the Rising Tide'],
    stat: 'esRechargeRate', modKind: 'increased', top: 0.45, floor: 0.25,
    baseTags: ['armour', 'amulet', 'ring'], weight: 55,
  }),
  fam({
    id: 'es_steadfast', kind: 'suffix', themes: [CASTER, DEFENSE],
    names: ['of Still Waters', 'of the Unbroken Stream'],
    stat: 'esRechargeSteadfast', top: 0.35, floor: 0.3,
    baseTags: ['armour', 'amulet'], weight: 45,
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
    id: 'proj_speed', kind: 'suffix', themes: [RANGER],
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
    id: 'heal_power', kind: 'suffix', themes: [SUSTAIN],
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
  // Dormant until weapon bases ship — the WEAPON-LOCAL lane, pre-proven:
  // "% increased Critical Strike Chance on this item" folds over the
  // weapon's OWN base crit (once weapon bases seed it), never the sheet.
  // Global crit stays the crit_chance family above; the two phrasings are
  // the whole disambiguation.
  fam({
    id: 'crit_pct_local', kind: 'suffix', themes: [MARTIAL, CASTER], local: true,
    names: ['of the Honed Edge', 'of the Whetted Edge'],
    stat: 'critChance', modKind: 'increased', top: 0.35, floor: 0.25, count: 4,
    baseTags: ['weapon'], weight: 60,
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
  // SKILL-SPECIFIC rolls — gear carrying ONE skill's signature proc (the
  // registry already scopes these procs to Sanctified Strike; any rarity
  // may roll them — the seam every future per-skill affix rides).
  fam({
    id: 'proc_radiant_oath', kind: 'suffix',
    names: ['of the Radiant Oath', 'of the Sworn Light'],
    stat: 'proc_radiant_reprisal',
    top: 0.2, floor: 0.3, count: 3,
    baseTags: ['amulet', 'gloves'], weight: 40,
  }),
  fam({
    id: 'proc_cascading_light', kind: 'suffix',
    names: ['of Cascading Light'],
    stat: 'proc_radiant_cascade',
    top: 0.12, floor: 0.35, count: 2,
    baseTags: ['amulet', 'helmet'], weight: 30,
  }),
  // The orb economy's one universal roll: richer sheds of EVERY kind —
  // harvest founts, flask loops and wakeflame votives all drink from it.
  fam({
    id: 'orb_shed_rate', kind: 'suffix',
    names: ['of Abundance', 'of the Overflowing'],
    stat: 'orbShedRate', modKind: 'increased',
    top: 0.3, floor: 0.25, count: 3,
    baseTags: ['amulet', 'ring', 'boots'], weight: 45,
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
