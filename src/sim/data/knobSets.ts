// ---------------------------------------------------------------------------
// KNOB SETS AND TUNING RULES — the tuning vocabulary as open data.
//
// KNOB_SETS answers "which numbers are worth perturbing for this subject?" and
// TUNING_RULES answers "which number would an author move to fix this finding,
// and what does it trade away?". Both read the live defs, so a retuned skill or
// a new class needs no edits here. A new kind of subject is one row.
// ---------------------------------------------------------------------------

import { CLASSES } from '../../data/classes';
import { MONSTERS } from '../../data/monsters';
import { SKILLS } from '../../data/skills';
import { SUPPORTS } from '../../data/supports';
import { ATTRIBUTE_IDS } from '../../engine/stats';
import { ITEM_AFFIXES } from '../../data/itemaffixes';
import { knobCensus } from '../knobs';
import type { SensitivityKnob } from '../whatif';

/** A Modifier row's selector, or its index when stat+kind are not unique. */
function modPaths(rootPath: string, mods: readonly { stat: string; kind: string; value: number }[], field: string): SensitivityKnob[] {
  const seen = new Map<string, number>();
  for (const m of mods) seen.set(`${m.stat}|${m.kind}`, (seen.get(`${m.stat}|${m.kind}`) ?? 0) + 1);
  return mods.map((m, i) => {
    const unique = seen.get(`${m.stat}|${m.kind}`) === 1 && mods.filter(x => x.stat === m.stat).length === 1;
    return {
      id: `${field}:${m.stat}:${m.kind}`,
      mode: 'scale' as const,
      path: unique ? `${rootPath}.${field}[stat=${m.stat}].value` : `${rootPath}.${field}.${i}.value`,
    };
  });
}

/** Open registry: `--knobset <id>[:<arg>]`. */
export const KNOB_SETS: Record<string, (arg?: string) => SensitivityKnob[]> = {
  /** What is +10 of each attribute worth to this class? `attributes:warrior`. */
  attributes: (classId = 'warrior') => {
    if (!CLASSES.some(c => c.id === classId)) throw new Error(`unknown class '${classId}'`);
    return ATTRIBUTE_IDS.map(a => ({
      id: `attr:${a}`, mode: 'step' as const, step: 10, path: `classes.${classId}.attributes.${a}`,
    }));
  },
  /** One skill's own dials. `skill:fireball`. */
  skill: (id = '') => {
    const d = SKILLS[id] as unknown as Record<string, unknown> | undefined;
    if (!d) throw new Error(`unknown skill '${id}'`);
    const k: SensitivityKnob[] = [];
    if (d.baseDamage) k.push({ id: 'baseDamage', mode: 'scale', path: `skills.${id}.baseDamage` });
    if (Number(d.manaCost) > 0) k.push({ id: 'manaCost', mode: 'scale', path: `skills.${id}.manaCost` });
    if (Number(d.cooldown) > 0) k.push({ id: 'cooldown', mode: 'scale', path: `skills.${id}.cooldown` });
    if (Number(d.useTime) > 0) k.push({ id: 'useTime', mode: 'scale', path: `skills.${id}.useTime` });
    return k;
  },
  /** One monster's body. `monster:zombie`. */
  monster: (id = '') => {
    const d = MONSTERS[id];
    if (!d) throw new Error(`unknown monster '${id}'`);
    const k: SensitivityKnob[] = [];
    for (const [stat, v] of Object.entries(d.base ?? {})) {
      if (typeof v === 'number' && v > 0) k.push({ id: `base.${stat}`, mode: 'scale', path: `monsters.${id}.base.${stat}` });
    }
    for (const skillId of d.skills ?? []) {
      if (SKILLS[skillId]?.baseDamage) k.push({ id: `kit.${skillId}`, mode: 'scale', path: `skills.${skillId}.baseDamage` });
    }
    return k;
  },
  /** One support's payload rows. `support:splitting`. */
  support: (id = '') => {
    const d = SUPPORTS[id];
    if (!d) throw new Error(`unknown support '${id}'`);
    return [
      ...modPaths(`supports.${id}`, d.mods, 'mods'),
      ...modPaths(`supports.${id}`, d.perLevel ?? [], 'perLevel'),
    ];
  },
  /** Every number in one exported config. `cfg:DEFENSE_CFG`. The caller loads the
   *  config first (balance/farm/verbs.ts finds it on disk by name). */
  cfg: (name = '') => knobCensus(`cfg.${name}`, 60)
    .filter(row => row.value !== 0)
    .map(row => ({ id: row.path.replace(/^cfg\./, ''), mode: 'scale' as const, path: row.path })),
  /** One affix family's magnitudes. `affix:<affix id>`. */
  affix: (id = '') => [{ id: `${id}.ranges`, mode: 'scale' as const, path: `affixes.${id}.tiers.*.ranges` }],
  /** The hero's own growth dials. */
  growth: () => [
    { id: 'hero_life_per_level', mode: 'scale', path: 'progression.lifePerLevel' },
    { id: 'hero_mana_per_level', mode: 'scale', path: 'progression.manaPerLevel' },
  ],
};

export function resolveKnobSet(spec: string): SensitivityKnob[] {
  const at = spec.indexOf(':');
  const id = at < 0 ? spec : spec.slice(0, at);
  const arg = at < 0 ? undefined : spec.slice(at + 1);
  const make = KNOB_SETS[id];
  if (!make) throw new Error(`unknown knob set '${id}' (have: ${Object.keys(KNOB_SETS).join(', ')})`);
  return make(arg);
}

// ------------------------------------------------------------ tuning rules --

/** One subject kind's fix vocabulary, most natural first. A rule's knob is what a
 *  proposal moves; `guard` metrics are read for side effects and reported beside
 *  the headline, so a fix that buys damage by making the kit unplayable shows it. */
export interface TuningRule {
  /** Finding kinds this rule serves. */
  kinds: string[];
  /** Candidate multiplier paths for a subject id, first viable wins. */
  knobs: (subject: string) => string[];
  guard: string[];
}

export const TUNING_RULES: TuningRule[] = [
  {
    kinds: ['skill'],
    knobs: id => (SKILLS[id]?.baseDamage ? [`skills.${id}.baseDamage`] : []),
    guard: ['life_floor_pct', 'mana_floor_pct', 'casts_per_sec'],
  },
  {
    kinds: ['monster_durability'],
    knobs: id => (MONSTERS[id]?.base?.life ? [`monsters.${id}.base.life`] : []),
    guard: ['dps_in', 'player_deaths'],
  },
  {
    // A monster's blow lives in its kit skill. Only a kit skill it does not
    // share can be moved without moving other monsters too.
    kinds: ['monster_threat'],
    knobs: id => {
      const kit = (MONSTERS[id]?.skills ?? []).filter(s => SKILLS[s]?.baseDamage);
      const owners = (s: string): number => Object.values(MONSTERS).filter(m => m.skills?.includes(s)).length;
      return kit.filter(s => owners(s) === 1 && SKILLS[s]?.noDrop).map(s => `skills.${s}.baseDamage`);
    },
    guard: ['ttk_wave_mean', 'kills'],
  },
  {
    // A class's starter power mostly lives in its opening skills; the first bar
    // skill that deals damage is the natural dial.
    kinds: ['class'],
    knobs: id => {
      const cls = CLASSES.find(c => c.id === id);
      return (cls?.bar ?? []).filter((s): s is string => !!s && !!SKILLS[s]?.baseDamage).map(s => `skills.${s}.baseDamage`);
    },
    guard: ['life_floor_pct', 'player_deaths', 'mana_floor_pct'],
  },
  {
    // Subject is the affix family: every id wearing it scales together.
    kinds: ['affix'],
    knobs: family => Object.values(ITEM_AFFIXES).filter(a => a.family === family).slice(0, 1)
      .map(a => `affixes.${a.id}.tiers.*.ranges`),
    guard: ['life_floor_pct', 'mana_floor_pct'],
  },
  {
    kinds: ['support'],
    knobs: id => {
      const row = SUPPORTS[id]?.mods.find(m => m.stat === 'damage');
      return row ? [`supports.${id}.mods[stat=damage].value`] : [];
    },
    guard: ['mana_floor_pct'],
  },
];

export const tuningRuleFor = (kind: string): TuningRule | undefined =>
  TUNING_RULES.find(r => r.kinds.includes(kind));
