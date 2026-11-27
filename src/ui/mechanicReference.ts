import { formatModLine, type ModLineDef } from '../engine/items';
import type { SkillDef, SupportDef } from '../engine/skills';
import { resolveVein, type SupportRolled } from '../engine/supportbase';
import type { Modifier } from '../engine/stats';
import { SEATED_CAT_BY_STAT } from '../data/sheet';
import { mechanicTitle, mechanicTopic, modifierLineTopic, modifierSubjectName, modifierTopics, skillGrowth } from '../meta/mechanics';
import { esc } from './dom';
import { inspectionLink } from './inspectableTooltips';
import type { TooltipContent } from './tooltip';

export function mechanicLinks(keys: readonly string[]): string {
  return keys.flatMap(key => {
    const label = mechanicTitle(key);
    return label ? [inspectionLink(key,label)] : [];
  }).join(' · ');
}

function termPattern(names: string[]): RegExp {
  const pattern = names.sort((a,b) => b.length - a.length)
    .map(s => s.replace(/[.*+?^\${}()|[\]\\]/g,'\\$&')).join('|');
  return new RegExp('(?<![\\p{L}\\p{N}_])(?:'+pattern+')(?![\\p{L}\\p{N}_])','giu');
}

/** Match only named, structured relationships in plain authored text, before escaping it. */
export function mechanicTextRenderer(keys: readonly string[], primary?: { key: string; alias?: string }, matched?: Set<string>): (value: string) => string {
  const terms = new Map<string,string>();
  if (primary?.alias) terms.set(primary.alias.toLowerCase(),primary.key);
  for (const key of keys) {
    const title = mechanicTitle(key)?.toLowerCase();
    if (title && !terms.has(title)) terms.set(title,key);
  }
  if (!terms.size) return esc;
  const matches = termPattern([...terms.keys()]);
  return value => {
    const parts: string[] = [];
    let start = 0;
    let linkedPrimary = false;
    for (const match of value.matchAll(matches)) {
      const key = terms.get(match[0].toLowerCase());
      if (!key) continue;
      matched?.add(key);
      if (key === primary?.key) linkedPrimary = true;
      parts.push(esc(value.slice(start,match.index)),inspectionLink(key,match[0]));
      start = match.index! + match[0].length;
    }
    if (primary && !linkedPrimary) return inspectionLink(primary.key,value);
    return parts.join('') + esc(value.slice(start));
  };
}
export function mechanicText(value: string, keys: readonly string[]): string {
  return mechanicTextRenderer(keys)(value);
}

/** Descriptions can mention a stat without granting it (e.g. a shell that scales with Guard Strength).
 * Index unambiguous multi-word names once. Explicit payloads take precedence over incidental mentions. */
let sheetNames: {pattern:RegExp; keys:Map<string,string>} | undefined;
export function mechanicProse(value: string, related: readonly string[], matched?: Set<string>): string {
  if (!sheetNames) {
    const keys = new Map<string,string>();
    for (const id of SEATED_CAT_BY_STAT.keys()) {
      const key = 'stat/'+id, name = mechanicTitle(key)?.toLowerCase();
      if (name?.includes(' ')) keys.set(name,keys.has(name) ? '' : key);
    }
    const names = [...keys].filter(([,key]) => key).map(([name]) => name);
    sheetNames = {keys,pattern:termPattern(names)};
  }
  const keys = new Set(related);
  for (const word of value.matchAll(sheetNames.pattern)) keys.add(sheetNames.keys.get(word[0].toLowerCase())!);
  return mechanicTextRenderer([...keys],undefined,matched)(value);
}

/** Keep authored wording inspectable even when it paraphrases the stat's display name. */
export function itemModifierText(value: string, line?: Pick<ModLineDef,'stat' | 'fromStat'>): string {
  if (!line) return esc(value);
  const key = modifierLineTopic(line.stat);
  if (!mechanicTitle(key)) return esc(value);
  const keys = line.fromStat ? [key,modifierLineTopic(line.fromStat)] : [key];
  return mechanicTextRenderer(keys,{key,alias:modifierSubjectName(line.stat)})(value);
}

export function mechanicTooltip(key: string): TooltipContent | undefined {
  const entry = mechanicTopic(key);
  if (!entry) return;
  const prose = [entry.description,entry.detail].filter((s,i,a): s is string => !!s && a.indexOf(s) === i);
  const line = mechanicTextRenderer(entry.related);
  const facts = entry.facts.map(f => '<div><dt>' + esc(f.label) + '</dt><dd>' + line(f.value) + '</dd></div>').join('');
  return { title:esc(entry.title), description:prose.map(s => '<p>'+line(s)+'</p>').join('')
    + (facts ? '<dl class="inspect-values">'+facts+'</dl>' : ''), meta:mechanicLinks(entry.related) };
}

export function modifierHtml(mod: Modifier): string {
  return itemModifierText(formatModLine(mod,mod.value),mod);
}

export function skillGrowthHtml(def: SkillDef): string {
  return skillGrowth(def).map(({label,mods}) => '<div><dt>'+esc(label)+'</dt><dd>'+mods.map(modifierHtml).join(' · ')+'</dd></div>').join('');
}

/** A related row covers mechanics described in ordinary prose, even when the name is paraphrased. */
export function linkedDescription(prose: string, keys: readonly string[]): string {
  const matched = new Set<string>();
  const description = mechanicProse(prose,keys,matched);
  const other = mechanicLinks(keys.filter(key => !matched.has(key)));
  return description + (other ? '<div class="tt-meta">'+other+'</div>' : '');
}

export function supportDescription(def: SupportDef): string {
  return linkedDescription(def.description,modifierTopics([...def.mods,...(def.perLevel ?? [])]));
}

export function supportRollHtml(def: SupportDef, rolled?: SupportRolled): string {
  if (!def.rollBase) return '';
  return Object.values(resolveVein(def.rollBase,rolled)).map(row =>
    '<div style="color:#c8b06a">◈ '+linkedDescription(row.line,modifierTopics(row.mods ?? []))+'</div>').join('');
}
