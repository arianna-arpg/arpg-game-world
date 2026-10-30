import { CODEX_CFG } from '../data/codex';
import { CLASSES } from '../data/classes';
import { SHOWCASE_SETUPS } from '../data/skillShowcase';
import { SKILLS } from '../data/skills';
import { SUPPORTS } from '../data/supports';
import { MAGIC_PACKS } from '../data/magicPacks';
import { BESTIARY_CFG, bestiaryKills, bestiaryList, bestiaryReveals, bestiaryThreshold } from '../data/bestiary';
import { encipher } from '../data/runescript';
import { SHEET_CATS, sheetFamilyOf, statBlurbOf, statRestingValue } from '../data/sheet';
import { ATTRIBUTES, ATTRIBUTE_IDS, DAMAGE_TYPES, STAT_DEFS, conversionStat, extraAsStat, StatSheet, type DamageType, type Modifier } from '../engine/stats';
import { formatModLine } from '../engine/items';
import { AFFIXES, RARITY_DEFS } from '../engine/rarity';
import { applyConversion } from '../engine/damage';
import { codexEncountered } from '../engine/codexSightings';
import { makeSkillInstance, supportFitsInst, skillMaxLevel, supportMaxLevel } from '../engine/skills';
import { FEATURE, isClassDiscovered, isClassUnlocked, isSkillUnlockedForDrop, isSupportUnlockedForDrop, type Account } from './account';
import { allUnlockables, classRumorRead, classUnlockFor, classUnlockProgress, isUnlockOwned, shroudedClassUnlocks, VAULT_KIND_LABELS } from './unlocks';
import { memorySecondaryOwned } from './memoryUnlocks';

export interface CodexFact { label: string; value: string }
/** Public reading model. A locked row carries no plain name, id, icon or hidden tags.
 * The opaque key indexes the current registry, never a secret content identifier. */
export interface CodexEntry {
  key: string; title: string; description: string; tags: string[]; state: string; locked: boolean;
  facts: CodexFact[];
  source?: { kind: 'skill' | 'support' | 'monster' | 'class'; id: string };
  color?: string;
  preview?: { skillId: string; supports?: { id: string }[] };
  conversion?: boolean;
}
export interface CodexFilter { query: string; tags: string[]; status: 'all' | 'known' | 'locked' }
const fact = (label: string, value: string | number): CodexFact => ({ label, value: String(value) });
const mods = (rows: readonly Modifier[]): string => rows.map(m => formatModLine(m, m.value)).join(' · ');
const number = (v: number, percent = false): string => `${Number((percent ? v * 100 : v).toFixed(4))}${percent ? '%' : ''}`;
function row(key: string, title: string, description: string, tags: string[], facts: CodexFact[] = []): CodexEntry {
  return { key, title, description, tags, facts, state: 'Known', locked: false };
}
function shrouded(key: string, name: string, kind: string): CodexEntry {
  return { key, title: encipher(name), description: 'This entry is still unwritten. Discover it through play.',
    tags: [], facts: [], state: `Locked ${kind}`, locked: true };
}
export function codexSkillIds(): string[] {
  const opening = new Set(CLASSES.flatMap(c => [...c.bar, ...(c.kit ?? []).map(r => r.skill)]));
  return Object.values(SKILLS).filter(s => (!s.noDrop && (s.dropWeight ?? 100) > 0)
    || opening.has(s.id) || CODEX_CFG.extraSkills.includes(s.id)).map(s => s.id);
}
function skillEntries(a: Account): CodexEntry[] {
  return codexSkillIds().map((id, i) => {
    const s = SKILLS[id], key = `skills:${i}`;
    if (!isSkillUnlockedForDrop(a, id)) return shrouded(key, s.name, 'skill');
    const r = row(key, s.name, s.description, [...s.tags], [
      ...(s.baseDamage ? [fact('Base damage', Object.entries(s.baseDamage).map(([type, band]) => `${band[0]}–${band[1]} ${type}`).join(' · '))] : []),
      fact('Base mana cost', s.manaCost), ...(s.lifeCost ? [fact('Base life cost', s.lifeCost)] : []),
      fact('Base use time', `${s.useTime}s`), fact('Base cooldown', `${s.cooldown}s`),
      fact('Casting', s.castMode ?? 'cast'), fact('Maximum trained level', skillMaxLevel(s)),
      fact('Requirements', Object.entries(s.requirements ?? {}).map(([k, v]) => `${ATTRIBUTES[k as keyof typeof ATTRIBUTES]?.label ?? k} ${v}`).join(' · ') || 'None'),
      fact('Awakening', memorySecondaryOwned(a, 'skill', id) ? 'Awakened' : 'Dormant'),
    ]);
    r.source = { kind: 'skill', id }; r.color = s.color; r.state = 'Unlocked';
    if (!SHOWCASE_SETUPS[id]?.skip) r.preview = { skillId: id };
    else r.facts.push(fact('Demonstration', SHOWCASE_SETUPS[id].skip!));
    return r;
  });
}
function supportEntries(a: Account): CodexEntry[] {
  return Object.values(SUPPORTS).filter(s => s.weight > 0).map((s, i) => {
    const key = `supports:${i}`;
    if (!isSupportUnlockedForDrop(a, s.id)) return shrouded(key, s.name, 'support');
    const r = row(key, s.name, s.description, [...new Set([...(s.requiresTags ?? []), ...(s.grantsTags ?? [])])], [
      fact('Accepts any of', s.requiresTags?.join(' · ') || 'Any skill tag'),
      ...(s.excludeTags?.length ? [fact('Excludes', s.excludeTags.join(' · '))] : []),
      fact('At level 1', mods(s.mods) || 'Changes the skill’s behavior'),
      ...(s.perLevel?.length ? [fact('Per additional level', mods(s.perLevel))] : []),
      fact('Maximum trained level', supportMaxLevel(s)),
    ]);
    r.source = { kind: 'support', id: s.id }; r.color = s.color; r.state = 'Unlocked';
    return r;
  });
}
/** Base-instance compatibility, through the game's socket gate. Only known hosts are listed.
 * A modified build can acquire mechanisms that make further combinations possible. */
export function codexSupportHosts(a: Account, id: string): string[] {
  const s = SUPPORTS[id];
  if (!s || !isSupportUnlockedForDrop(a, id)) return [];
  return codexSkillIds().filter(k => !SHOWCASE_SETUPS[k]?.skip && isSkillUnlockedForDrop(a, k) && supportFitsInst(s, makeSkillInstance(SKILLS[k])));
}
function creatureEntries(a: Account): CodexEntry[] {
  const tracking = a.features.has(FEATURE.TRACKER);
  return bestiaryList().map((d, i) => {
    const key = `creatures:${i}`;
    if (!codexEncountered(a, d.id)) return shrouded(key, 'Unknown creature', 'creature');
    const kills = bestiaryKills(a, d.id), need = bestiaryThreshold(d);
    const reveal = (g: string): boolean => tracking && bestiaryReveals(a, d, g);
    const r = row(key, d.name, tracking
      ? 'Study grows with credited kills. These are the creature’s base values; level, rarity and other effects change a living specimen.'
      : 'Encounter recorded. Recruit the Tracker through the Vault to read the deeper knowledge earned by your hunts.',
      [d.boss ? 'Boss' : 'Creature', ...(d.faction ? [d.faction] : [])], [fact('Allegiance', d.faction ?? 'None')]);
    r.state = !tracking ? 'Encountered' : kills >= need ? 'Mastered' : 'Studying';
    r.source = { kind: 'monster', id: d.id }; r.color = d.color;
    if (tracking) {
      r.facts.push(fact('Study', `${kills} / ${need} credited kills`));
      const next = BESTIARY_CFG.revealTiers.find(t => t.at > kills / need);
      if (next) r.facts.push(fact('Next revelation', `${next.group} at ${Math.max(1, Math.ceil(next.at * need))} kills`));
    }
    if (reveal('vitals')) r.facts.push(fact('Base life', d.base.life ?? STAT_DEFS.life.base), fact('Base pace', d.base.moveSpeed ?? STAT_DEFS.moveSpeed.base));
    if (reveal('arts')) r.facts.push(fact('Base accuracy', d.base.accuracy ?? STAT_DEFS.accuracy.base), fact('Arts', d.skills.map(id => SKILLS[id]?.name ?? 'Unknown art').join(' · ') || 'None'));
    if (reveal('hide')) r.facts.push(fact('Base armor', d.base.armor ?? STAT_DEFS.armor.base), fact('Base evasion', d.base.evasion ?? STAT_DEFS.evasion.base), fact('Innate modifiers', mods(d.mods ?? []) || 'None'));
    return r;
  });
}
function statEntries(): CodexEntry[] {
  return Object.entries(STAT_DEFS).map(([id, d]) => {
    const cat = Object.entries(SHEET_CATS).find(([, c]) => [...c.core, ...c.used].includes(id))?.[0] ?? sheetFamilyOf(id)?.cat;
    return row(`stats:${id}`, d.label, statBlurbOf(id) ?? 'A registered statistic. Its base and limits below are read from the current game rules.',
      [SHEET_CATS[cat ?? '']?.label ?? 'Other'], [fact('Default', number(statRestingValue(id), d.percent)),
        ...(d.min !== undefined ? [fact('Minimum', number(d.min, d.percent))] : []),
        ...(d.max !== undefined ? [fact('Maximum', number(d.max, d.percent))] : [])]);
  });
}
function classEntries(a: Account): CodexEntry[] {
  const rumors = new Set(shroudedClassUnlocks(a).map(u => u.id));
  return CLASSES.map((c, i) => {
    const key = `classes:${i}`, unlock = classUnlockFor(c.id);
    if (!isClassDiscovered(a, c.id)) {
      const r = shrouded(key, 'Unclaimed vessel', 'class');
      if (unlock && rumors.has(unlock.id)) {
        const read = classRumorRead(a, unlock);
        r.title = read.title; r.description = read.body;
        r.facts = read.rows.map(p => fact(p.met ? 'Fulfilled' : 'Discovery', p.label));
      }
      return r;
    }
    const r = row(key, c.name, c.description, ['Class'], [
      fact('Starting attributes', ATTRIBUTE_IDS.map(id => `${ATTRIBUTES[id].short} ${c.attributes[id]}`).join(' · ')),
      fact('Starting skills', c.bar.flatMap(id => id && SKILLS[id] ? [SKILLS[id].name] : []).join(' · ')),
      ...(c.innate?.length ? [fact('Innate modifiers', mods(c.innate))] : []),
      ...(unlock ? classUnlockProgress(a, unlock).rows.map(p => fact(p.met ? 'Fulfilled deed' : 'Deed', p.label)) : []),
    ]);
    r.state = isClassUnlocked(a, c.id) ? 'Unlocked' : 'Discovered · activate in Vault';
    r.source = { kind: 'class', id: c.id }; r.color = c.color;
    return r;
  });
}
/** Providers are open: adding a shelf means one provider and a section/page row. */
export const CODEX_PROVIDERS: Record<string, (a: Account) => CodexEntry[]> = {
  skills: skillEntries, supports: supportEntries, creatures: creatureEntries, classes: classEntries,
  owned: a => allUnlockables(a).filter(u => isUnlockOwned(a, u)
    && !(u.kind === 'class' && a.pendingClassUnlocks.has(u.payload.classId))).map((u, i) => {
    const r = row(`owned:${i}`, u.label, u.description, [VAULT_KIND_LABELS[u.kind]],
      u.kind === 'class' ? classUnlockProgress(a, u).rows.map(p => fact(p.met ? 'Fulfilled deed' : 'Deed', p.label)) : []);
    r.state = 'Owned'; return r;
  }),
  magic: () => Object.values(MAGIC_PACKS).map(d => row(`magic:${d.id}`, d.name, d.hint, ['Magic pack'], [
    fact('First level', d.minLevel), ...d.rules.map((r, i) => fact(`Effect ${i + 1}`, [
      r.role ? `Role: ${r.role}` : 'Every member',
      r.nearby ? `${r.nearby.min}${r.nearby.max !== undefined ? `–${r.nearby.max}` : '+'} allies within ${r.nearby.radius}` : '',
      r.fallen ? `Per fallen member, up to ${r.fallen.max}` : '', mods(r.mods),
    ].filter(Boolean).join(' · '))),
    ...(d.burst ? [fact('Warning', `${d.burst.warning}s`), fact('Pulse interval', `${d.burst.cooldown}s`)] : []),
    ...(d.mend ? [fact('Healing warning', `${d.mend.warning}s`), fact('Healing', number(d.mend.fraction, true))] : []),
  ])),
  affixes: () => AFFIXES.map(d => row(`affixes:${d.id}`, d.label, mods(d.mods), ['Elite affix'])),
  rarities: () => Object.entries(RARITY_DEFS).map(([id, d]) => row(`rarities:${id}`, d.label || 'Normal',
    id === 'magic' ? 'Magic cohorts share a pack mechanic. Individual rarity modifiers and pack effects are separate.' : 'Rarity scales a creature’s base statistics and rewards.', ['Rarity'], [
      fact('Life multiplier', `×${d.lifeMul}`), fact('Damage multiplier', `×${d.dmgMul}`),
      fact('Experience multiplier', `×${d.xpMul}`), fact('Affix slots (individual leaders)', d.affixes), fact('Bonus gem drops', d.drops),
    ])),
  attributes: () => ATTRIBUTE_IDS.map(id => row(`attributes:${id}`, ATTRIBUTES[id].label,
    'Each invested point grants these modifiers. Any class can invest in any attribute.', [ATTRIBUTES[id].group],
    ATTRIBUTES[id].perPoint.map(m => fact('Per point', formatModLine(m, m.value))))),
  stats: statEntries,
  conversions: () => [
    { ...row('conversion:overview', 'Damage conversion', 'Conversion moves damage between types after scaling. Targets are visited in the order below, spending at most the remaining source damage. Converted damage can feed a type processed later in that order.', ['Damage'], [
      fact('Processing order', DAMAGE_TYPES.join(' → ')),
      fact('Gain as extra', 'Adds damage from the post-conversion total without consuming it. Extra gains do not feed one another.'),
    ]), conversion: true },
    ...DAMAGE_TYPES.flatMap(from => DAMAGE_TYPES.filter(to => to !== from).map(to => {
      const id = conversionStat(from, to), d = STAT_DEFS[id];
      return row(`conversions:${id}`, d.label, statBlurbOf(id) ?? '', [from, to], [fact('Default', number(d.base, true)), fact('Maximum', number(d.max ?? 1, true))]);
    })),
    ...DAMAGE_TYPES.map(to => { const id = extraAsStat(to), d = STAT_DEFS[id];
      return row(`conversions:${id}`, d.label, statBlurbOf(id) ?? '', [to], [fact('Default', number(d.base, true))]); }),
  ],
};
export function codexEntries(a: Account, page: string): CodexEntry[] { return CODEX_PROVIDERS[page]?.(a) ?? []; }
export function codexFilter(entries: readonly CodexEntry[], f: CodexFilter): CodexEntry[] {
  const q = f.query.trim().toLocaleLowerCase();
  return entries.filter(r => (f.status === 'all' || r.locked === (f.status === 'locked'))
    // Secret names, tags, stats and rune word-shapes cannot be used as a search oracle.
    && (!r.locked || (!q && !f.tags.length))
    && f.tags.every(t => r.tags.includes(t))
    && (!q || `${r.title} ${r.description} ${r.tags.join(' ')}`.toLocaleLowerCase().includes(q)))
    .sort((a, b) => Number(a.locked) - Number(b.locked) || (a.locked ? 0 : a.title.localeCompare(b.title)));
}
/** A worked example executed by the actual combat conversion path. */
export function codexConversion(from: DamageType, to: DamageType, percent: number): Partial<Record<DamageType, number>> {
  const sheet = new StatSheet();
  sheet.setSource('codex:example', [{ stat: conversionStat(from, to), kind: 'flat', value: Math.max(0, Math.min(100, percent)) / 100 }]);
  const amounts = { [from]: 100 };
  applyConversion({ sheet }, amounts, new Set());
  return amounts;
}
