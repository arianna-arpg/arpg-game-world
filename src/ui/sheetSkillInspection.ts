import { MONSTERS } from '../data/monsters';
import { statBlurbOf, statDetailOf } from '../data/sheet';
import { SKILLS } from '../data/skills';
import type { PreviewRow, SkillPreview } from '../engine/skillPreview';
import type { SummonedAbility, SummonedRoster } from '../engine/summonedSkillPreview';
import type { InspectionRoster } from '../net/skillInspection';
import { grimoireForm, instanceDelivery, instanceSummon, summonCrewOf, type SkillInstance } from '../engine/skills';
import { STAT_DEFS } from '../engine/stats';
import { STATUS_DEFS } from '../engine/status';
import { esc } from './dom';
import { inspectionLink as link } from './inspectableTooltips';
import type { TooltipContent } from './tooltip';

export interface SkillInspection {
  selector: string;
  details: string;
  topics: Map<string, TooltipContent>;
  bodyKey?: string;
}

const format = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits:value < 10 ? 1 : 0 });
const rowStats: Record<string, string[]> = {
  damage:['damage','critChance'], crit:['critChance','critMulti'],
  cooldown:['cooldownRecovery'], area:['aoeRadius'], minionCap:['minionMaxCount'], minionDuration:['effectDuration'],
};
const related: Record<string, string[]> = { damage:['critChance'], critChance:['critMulti'], critMulti:['critChance'] };

function mechanics(topics: SkillInspection['topics'], ids: string[]): string {
  return ids.filter(id => STAT_DEFS[id]).map(id => {
    const key = 'stat/' + id;
    if (!topics.has(key)) {
      const info = { title:esc(STAT_DEFS[id].label), description:esc(statDetailOf(id) ?? statBlurbOf(id) ?? STAT_DEFS[id].label), meta:'' };
      topics.set(key, info);
      info.meta = mechanics(topics, related[id] ?? []);
    }
    return link(key, STAT_DEFS[id].label);
  }).join(' · ');
}

function rowList(rows: PreviewRow[], scope: string, topics: SkillInspection['topics']): string {
  return '<dl class="inspect-values">' + rows.map(row => {
    const statusId = /^(?:status_|apply_|attackSequence_status_)(.+)$/.exec(row.key)?.[1];
    const status = statusId && STATUS_DEFS[statusId];
    const statusText = status ? `Base duration ${status.duration}s.${status.stacking && status.maxStacks ? ' Base stack limit ' + status.maxStacks + '.' : ''}` : '';
    const stats = rowStats[row.key] ?? (row.key.startsWith('buff_') ? ['effectDuration'] : []);
    const more = mechanics(topics, stats);
    const key = scope + '/row/' + row.key;
    if (more || row.note || statusText) topics.set(key, {
      title:esc(row.label), description:[row.value, row.note, statusText].filter(Boolean).map(v => esc(v!)).join(' · '), meta:more,
    });
    return `<div><dt>${topics.has(key) ? link(key,row.label) : esc(row.label)}</dt><dd>${esc(row.value)}</dd></div>`;
  }).join('') + '</dl>';
}

function measuredSkill(body: NonNullable<SummonedRoster['selected']>, ability: SummonedAbility, topics: SkillInspection['topics'], index: number): string {
  const {preview:view,name} = ability;
  const dps = view.estimatedHitDps;
  const key = `body/${body.id}/${index}/${ability.id}`;
  const readout = dps !== undefined ? '≈ ' + format(dps) + ' hit DPS'
    : view.averageDirectHit !== undefined ? format(view.averageDirectHit) + ' avg. hit' : '';
  const hit = view.averageDirectHit;
  topics.set(key, {title:esc(name), description:`<p>${esc(ability.description)}</p>`
    + (hit !== undefined ? `<p>${format(hit)} average damage per direct hit · ${link('basis','before defenses')}</p>` : '')
    + rowList(view.rows, key, topics), meta:`${esc(body.name)} · Skill level ${ability.level}`});
  const utility = view.rows.find(row => row.key === 'absorb' || row.key.startsWith('buff_') || row.key === 'minionCap');
  return `<li>${link(key,name)}<strong>${esc(readout || (utility ? utility.label + ' · ' + utility.value : 'View skill'))}</strong></li>`;
}

/** Only called for an expanded ribbon. The actor census and previews are read-only. */
export function skillInspection(inst: SkillInstance, preview: SkillPreview, roster: InspectionRoster | undefined, selected?: string): SkillInspection {
  const topics: SkillInspection['topics'] = new Map();
  topics.set('basis', {title:'Direct hit estimate', description:'Average hit includes ordinary critical strikes, before defenses. Hit DPS assumes one landed hit per use or channel pulse and uninterrupted casting. Additional hits and damage over time are excluded.',
    meta:mechanics(topics,['damage','critChance'])});
  const delivery = instanceDelivery(inst);
  const summon = delivery.type === 'summon' ? delivery : instanceSummon(inst);
  const forms = summon ? [grimoireForm(inst) ?? summon.monsterId].filter((id): id is string => !!id) : [];
  if (!forms.length && summon?.pool) forms.push(...new Set(summon.pool.map(form => form.id)));
  const bodies = roster?.bodies ?? [];
  const counts = new Map<string,number>();
  for (const body of bodies) counts.set(body.name,(counts.get(body.name) ?? 0) + 1);
  const options = bodies.map((body, i) => ({key:'body/' + body.id, label:`${body.name} · Lv ${body.level}${counts.get(body.name)! > 1 ? ' · ' + (i + 1) : ''}`}));
  if (!bodies.length) for (const id of forms) if (MONSTERS[id]) options.push({key:'form/' + id, label:MONSTERS[id].name});
  const choice = options.find(option => option.key === (roster?.selected ? 'body/' + roster.selected.id : selected)) ?? options[0];
  let selector = '', abilities = '';
  if (choice) {
    const caption = bodies.length ? (delivery.type === 'construct' ? 'Active construct' : 'Active summon') : 'Summoned form';
    selector = options.length > 1
      ? `<label class="inspect-body-picker"><span>${caption}</span><select data-inspect-body>${options.map(o => `<option value="${esc(o.key)}"${o.key === choice.key ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>`
      : `<div class="inspect-body-picker"><span>${caption}</span><b>${esc(choice.label)}</b></div>`;
  }
  const body = roster?.selected;
  if (body) {
    const skills = body.abilities;
    abilities = skills.length ? '<ul class="inspect-abilities">' + skills.map((s,i) => measuredSkill(body,s,topics,i)).join('') + '</ul>'
      : '<p>This summon has no castable skills.</p>';
    if (skills.some(s => s.preview.averageDirectHit !== undefined)) abilities += `<p class="inspect-note">${link('basis','Direct hit estimates')} for this ${delivery.type === 'construct' ? 'construct' : 'summon'}.</p>`;
  } else if ((!roster || roster.pending) && (summon || delivery.type === 'construct' || bodies.length)) {
    abilities = '<p class="inspect-note">Waiting for the host’s summon details…</p>';
  } else if (summon || delivery.type === 'construct') {
    const form = choice?.key.slice('form/'.length);
    const kit = form && summon ? summonCrewOf({...summon,monsterId:form},id=>MONSTERS[id],id=>SKILLS[id])
      : delivery.type === 'construct' && delivery.castSkillId && SKILLS[delivery.castSkillId] ? [SKILLS[delivery.castSkillId]] : [];
    const names = (Array.isArray(kit) ? kit : []).map(def => {
      topics.set('form-skill/' + def.id, {title:esc(def.name), description:esc(def.description)});
      return link('form-skill/' + def.id, def.name);
    });
    if (names.length) abilities += '<p>' + names.join(' · ') + '</p>';
    abilities += '<p class="inspect-note">' + (delivery.type === 'construct' ? 'Deploy this construct to inspect its active abilities.'
      : summon?.fromCorpse && !forms.length ? 'Raise a corpse to inspect its abilities and damage.' : 'Summon a body to inspect its abilities and damage.') + '</p>';
  }
  const facts = rowList(preview.rows, 'learned/' + inst.def.id, topics);
  return {selector, bodyKey:roster ? choice?.key : selected, topics, details:abilities + (preview.rows.length ? `<details class="inspect-cast"${abilities ? '' : ' open'}><summary>Cast statistics</summary>${facts}</details>` : '')};
}
