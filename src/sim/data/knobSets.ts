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
import { KNOB_GROUP, knobCensus } from '../knobs';
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
  /** How much a finding in this direction counts when ranking proposals (default 1). */
  weight?: { high?: number; low?: number };
}

/** Numeric payload fields that say how hard a gem hits. */
const SUPPORT_POWER_FIELDS = new Set(['damageScale', 'damagePerCharge', 'power', 'moreDamage']);

/** A monster's kit skills that nothing else uses, so moving one moves only this body. */
function ownKit(monsterId: string | undefined): string[] {
  const kit = (monsterId ? MONSTERS[monsterId]?.skills : undefined) ?? [];
  const owners = (s: string): number => Object.values(MONSTERS).filter(m => m.skills?.includes(s)).length;
  return kit.filter(s => SKILLS[s]?.baseDamage && SKILLS[s]?.noDrop && owners(s) === 1);
}

/** The bodies a skill fields deal what their kit deals. */
const fieldedBody = (skillId: string): string | undefined => {
  const d = SKILLS[skillId]?.delivery as { type?: string; monsterId?: string } | undefined;
  return d?.type === 'summon' ? d.monsterId : undefined;
};

/** Where a skill keeps what it grants, wherever that sits: modifier rows and heals. */
const GRANT_FIELDS = new Set(['amount', 'pctMax', 'magnitude']);
function grantPaths(id: string): string[] {
  const out: string[] = [];
  const walk = (v: unknown, at: string): void => {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${at}.${i}`)); return; }
    for (const [k, x] of Object.entries(v)) {
      if (k === 'mods' && Array.isArray(x)) { if (x.length) out.push(`${at}.mods`); }
      else if (k === 'addedDamage' || (typeof x === 'number' && GRANT_FIELDS.has(k))) out.push(`${at}.${k}`);
      else walk(x, `${at}.${k}`);
    }
  };
  const def = SKILLS[id] as unknown as { effects?: unknown; delivery?: unknown } | undefined;
  walk(def?.effects, `skills.${id}.effects`);
  walk(def?.delivery, `skills.${id}.delivery`);
  return out;
}

export const TUNING_RULES: TuningRule[] = [
  {
    // A buff, hex, ward or heal: everything it grants moves together, and a skill that
    // fields bodies also has their kit.
    kinds: ['skill_assist'],
    knobs: id => {
      const grants = grantPaths(id);
      return [...(grants.length ? [grants.join(KNOB_GROUP)] : []), ...ownKit(fieldedBody(id)).map(s => `skills.${s}.baseDamage`)];
    },
    guard: ['mana_floor_pct'],
  },
  {
    kinds: ['skill'],
    knobs: id => [
      ...(SKILLS[id]?.baseDamage ? [`skills.${id}.baseDamage`] : []),
      ...ownKit(fieldedBody(id)).map(s => `skills.${s}.baseDamage`),
    ],
    guard: ['life_floor_pct', 'mana_floor_pct', 'casts_per_sec'],
  },
  {
    kinds: ['monster_durability'],
    knobs: id => (MONSTERS[id]?.base?.life ? [`monsters.${id}.base.life`] : []),
    guard: ['dps_in', 'player_deaths'],
    // A frail critter is often the design. An unkillable one rarely is.
    weight: { low: 0.5 },
  },
  {
    // A monster's blow lives in its kit skill. Only a kit skill it does not
    // share can be moved without moving other monsters too.
    kinds: ['monster_threat'],
    knobs: id => ownKit(id).map(s => `skills.${s}.baseDamage`),
    guard: ['ttk_wave_mean', 'kills'],
    // A body that hits softly may do its work some other way. One that hits far too
    // hard is the finding that hurts players.
    weight: { low: 0.25 },
  },
  {
    // A class's starter power lives in its opening bar and the bodies it fields. Each
    // dial alone first, then all of them together, since output is usually spread
    // across them, and finally the class's own attributes.
    kinds: ['class'],
    knobs: id => {
      const cls = CLASSES.find(c => c.id === id);
      if (!cls) return [];
      const skills = new Set<string>();
      for (const s of cls.bar) {
        if (!s) continue;
        if (SKILLS[s]?.baseDamage) skills.add(s);
        for (const k of ownKit(fieldedBody(s))) skills.add(k);
      }
      for (const c of cls.startingCompanions ?? []) for (const k of ownKit(c.monsterId)) skills.add(k);
      const dials = [...skills].map(s => `skills.${s}.baseDamage`);
      return [...dials, ...(dials.length > 1 ? [dials.join(KNOB_GROUP)] : []), `classes.${id}.attributes`];
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
    // A gem's strength may sit in a payload it carries (a trail's damage scale), its
    // damage line, or its other lines taken together. Tried in that order.
    kinds: ['support'],
    knobs: id => {
      const def = SUPPORTS[id] as unknown as Record<string, unknown> | undefined;
      if (!def) return [];
      const out: string[] = [];
      const walk = (v: unknown, at: string): void => {
        if (!v || typeof v !== 'object' || Array.isArray(v)) return;
        for (const [k, x] of Object.entries(v)) {
          if (typeof x === 'number' && SUPPORT_POWER_FIELDS.has(k)) out.push(`${at}.${k}`);
          else walk(x, `${at}.${k}`);
        }
      };
      walk(def, `supports.${id}`);
      const mods = SUPPORTS[id].mods;
      if (mods.some(m => m.stat === 'damage')) out.push(`supports.${id}.mods[stat=damage].value`);
      if (mods.length) out.push(`supports.${id}.mods`);
      return out;
    },
    guard: ['mana_floor_pct'],
  },
];

export const tuningRuleFor = (kind: string): TuningRule | undefined =>
  TUNING_RULES.find(r => r.kinds.includes(kind));
