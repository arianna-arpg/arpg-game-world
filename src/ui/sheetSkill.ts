import type { Actor } from '../engine/actor';
import { previewSkill, type PreviewRow } from '../engine/skillPreview';
import { effectiveSkillLevel, instanceEffects, type SkillInstance } from '../engine/skills';
import { skillInstanceName } from '../engine/skillEmpowerment';
import { skillIconSvg } from '../render/skillIcons';
import { esc } from './dom';

/** The selector stays mounted while live stat values change underneath it. */
export function sheetSkillCard(hero: Actor, known: ReadonlyMap<string, SkillInstance>, selected?: string) {
  const inst = (selected && known.get(selected)) || known.values().next().value;
  if (!inst) return { face:'<div class="sheet-skill-empty">Learn a skill to inspect its statistics.</div>', facts:'', hint:'', inst:undefined, preview:undefined };
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
  const facts = `${label && value ? `<div class="sheet-skill-metric"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>` : ''}
    ${details.length ? `<dl>${details.map(row => `<div><dt>${esc(row.label)}</dt><dd>${esc(row.value)}</dd></div>`).join('')}</dl>` : ''}
    ${dps !== undefined ? `<small class="sheet-skill-basis">One hit per ${unit} · before defenses</small>` : ''}`;
  const options = [...known.values()].map(skill =>
    `<option value="${esc(skill.def.id)}"${skill === inst ? ' selected' : ''}>${esc(skillInstanceName(skill))} · Lv ${effectiveSkillLevel(skill)}</option>`).join('');
  const face = `<div class="sheet-skill-wrap" style="--skill-ink:${esc(inst.def.color)}">
    <button type="button" class="sheet-inspect-ribbon" data-skill-ribbon aria-label="Inspect skill details" aria-expanded="false" aria-controls="learned-skill-details" title="Inspect skill details"><span aria-hidden="true">›</span></button>
    <div class="sheet-skill-card"><div class="sheet-skill-face"><span aria-hidden="true" class="ability-icon-holder">${skillIconSvg(inst.def,23)}</span>
      <span><small>Learned skill · Lv ${effectiveSkillLevel(inst)}</small><b>${esc(skillInstanceName(inst))}</b></span><span class="sheet-skill-chevron" aria-hidden="true">⌄</span></div>
    <div data-sheet-skill-facts></div>
    <select data-sheet-inspect aria-label="Inspect learned skill">${options}</select>
    </div><section id="learned-skill-details" data-skill-drawer aria-label="Skill details" hidden><div data-inspect-selector></div><div data-inspect-details></div></section>
  </div>`;
  return { face, facts, hint:note ? 'Inspect learned skill. ' + note : 'Inspect learned skill', inst, preview };
}
