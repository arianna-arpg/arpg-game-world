import type { Actor } from '../engine/actor';
import { previewSkill, type PreviewRow } from '../engine/skillPreview';
import { effectiveSkillLevel, instanceEffects, type SkillInstance } from '../engine/skills';
import { skillInstanceName } from '../engine/skillEmpowerment';
import { skillIconSvg } from '../render/skillIcons';
import { esc } from './dom';
import { inspectionLink } from './inspectableTooltips';
import { previewMechanics, skillReferenceKey } from '../meta/mechanics';

export const SHEET_SKILL_SHELL = `<div class="sheet-skill-wrap">
  <button type="button" class="sheet-inspect-ribbon" data-skill-ribbon aria-label="Inspect skill details" aria-expanded="false" aria-controls="learned-skill-details" title="Inspect skill details"><span aria-hidden="true">›</span></button>
  <div class="sheet-skill-card"><div class="sheet-skill-face"></div><div data-sheet-skill-facts></div>
    <select data-sheet-inspect aria-label="Inspect learned skill"></select>
  </div><section id="learned-skill-details" data-skill-drawer data-inspect-scope aria-label="Skill details" hidden><div data-inspect-selector></div><div data-inspect-details></div></section>
</div>`;

/** Preserve the native option nodes while the live card refreshes. */
export function syncSheetSkillOptions(select: HTMLSelectElement, known: ReadonlyMap<string, SkillInstance>): void {
  let index = 0;
  for (const skill of known.values()) {
    let option = select.options[index++];
    if (!option) {
      option = document.createElement('option');
      option.append(document.createElement('span'),document.createElement('small'));
      select.add(option);
    }
    if (option.value !== skill.def.id) option.value = skill.def.id;
    if (option.dataset.ink !== skill.def.color) {
      option.dataset.ink = skill.def.color;
      option.style.setProperty('--option-ink', skill.def.color);
    }
    const name = skillInstanceName(skill), level = ' Lv ' + effectiveSkillLevel(skill);
    if (option.firstElementChild!.textContent !== name) option.firstElementChild!.textContent = name;
    if (option.lastElementChild!.textContent !== level) option.lastElementChild!.textContent = level;
  }
  if (select.length !== index) select.length = index;
}

export function sheetSkillCard(hero: Actor, inst: SkillInstance) {
  const preview = previewSkill(hero, inst);
  const rows = preview.rows;
  const priority = ['minionCap', 'guardArtAbsorb', 'guardArtCapacity', 'guardSurge_protection', 'absorb', 'invocation_release', 'replenish', 'trigger'];
  const feature = priority.map(key => rows.find(row => row.key === key)).find(Boolean)
    ?? rows.find(row => row.key.startsWith('buff_'))
    ?? (instanceEffects(inst).some(fx => fx.type === 'damage') ? rows.find(row => row.key === 'damage') : undefined);
  const dps = preview.estimatedHitDps;
  const label = dps !== undefined ? 'Est. hit DPS' : feature?.label;
  const value = dps !== undefined ? '≈ ' + dps.toLocaleString(undefined, {maximumFractionDigits:dps < 10 ? 1 : 0}) : feature?.value;
  const details = (dps !== undefined ? ['pulseTime', 'damage', 'castTime', 'cooldown', 'crit', 'cost']
    : ['replenish', 'minionDuration', 'castTime', 'cooldown', 'cost'])
    .map(key => rows.find(row => row.key === key))
    .filter((row): row is PreviewRow => !!row && (dps !== undefined || row !== feature)).slice(0, 2);
  const unit = rows.some(row => row.key === 'pulseTime') ? 'pulse' : 'use';
  const note = dps !== undefined
    ? `One direct hit per ${unit} before defenses, including ordinary critical strikes. Extra hits, ailments, conditional bonuses and resource downtime are excluded.`
    : feature?.note ?? '';
  const term = (name: string, key?: string) => key ? inspectionLink(key,name) : esc(name);
  const metricKey = dps !== undefined ? 'basis' : feature && previewMechanics(feature)[0];
  const facts = `${label && value ? `<div class="sheet-skill-metric"><small>${term(label,metricKey)}</small><strong>${esc(value)}</strong></div>` : ''}
    ${details.length ? `<dl>${details.map(row => `<div><dt>${term(row.label,previewMechanics(row)[0])}</dt><dd>${esc(row.value)}</dd></div>`).join('')}</dl>` : ''}
    ${dps !== undefined ? `<small class="sheet-skill-basis">One hit per ${unit} · before defenses</small>` : ''}`;
  const face = `<span aria-hidden="true" class="ability-icon-holder">${skillIconSvg(inst.def,23)}</span>
    <span><small>Learned skill · Lv ${effectiveSkillLevel(inst)}</small><b>${inspectionLink(skillReferenceKey(inst.def.id),skillInstanceName(inst))}</b></span><span class="sheet-skill-chevron" aria-hidden="true">⌄</span>`;
  return { face, facts, hint:note ? 'Inspect learned skill. ' + note : 'Inspect learned skill', preview };
}
