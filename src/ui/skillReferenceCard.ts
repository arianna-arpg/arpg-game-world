import { COMBO_RULES } from '../data/combos';
import { PROCS } from '../data/procs';
import { SKILLS } from '../data/skills';
import { previewSkill } from '../engine/skillPreview';
import { skillInstanceName } from '../engine/skillEmpowerment';
import { effectiveSkillLevel, makeSkillInstance } from '../engine/skills';
import type { Seat, World } from '../engine/world';
import { previewMechanics, skillMechanics, skillReferenceKey } from '../meta/mechanics';
import { skillIconSvg } from '../render/skillIcons';
import { esc } from './dom';
import { inspectionLink } from './inspectableTooltips';
import { mechanicLinks, mechanicProse, mechanicText, mechanicTooltip, skillGrowthHtml } from './mechanicReference';
import type { TooltipContent } from './tooltip';

/** A proc's own-copy flag determines whether its payload can use a learned or granted instance. */
export function skillReferenceCard(id: string, parent: string | undefined, world?: World, seat?: Seat): TooltipContent | undefined {
  const def = SKILLS[id];
  if (!def) return;
  const titleFor = (name: string) => '<span class="skill-reference-title"><span aria-hidden="true">'+skillIconSvg(def,24)+'</span>'+esc(name)+'</span>';
  if (!world || !seat) {
    const base = mechanicTooltip(skillReferenceKey(id))!;
    return {...base,title:titleFor(def.name),description:'<small class="skill-reference-source">Skill reference · Lv 1</small>'+base.description};
  }
  const [kind, source] = parent?.split('/') ?? [];
  const effect = kind === 'proc' ? PROCS[source]?.effect : kind === 'combo' ? COMBO_RULES[source]?.effect : undefined;
  const cast = effect?.type === 'cast' && effect.cast.skillId === id ? effect.cast : undefined;
  const payload = !!cast || kind === 'skill' || kind === 'body' || kind === 'form-skill';
  const actor = world.seatHero(seat);
  const held = cast?.own ? world.heldSkillInst(actor,id)
    : !payload ? seat.meta.knownSkills.get(id) ?? world.heldSkillInst(actor,id) : undefined;
  const inst = held ?? makeSkillInstance(def);
  const preview = previewSkill(actor,inst);
  const related = skillMechanics(def,inst);
  const sourceName = held ? (held.grantedBy ? 'Granted by '+held.grantedBy : 'Learned skill') : 'Skill reference';
  const caption = [sourceName,'Lv '+effectiveSkillLevel(inst)];
  if (!held) caption.push('current character modifiers');
  const rows = preview.rows.filter(row => !payload || !['cost','castTime','cooldown','costWard'].includes(row.key));
  const linked = new Set<string>();
  const values = rows.map(row => {
    const terms = previewMechanics(row), key = terms[0];
    if (key) linked.add(key);
    const name = key ? inspectionLink(key,row.label) : esc(row.label);
    return '<div><dt>'+name+'</dt><dd>'+mechanicText(row.value,terms)+(row.note ? '<small>'+mechanicText(row.note,terms)+'</small>' : '')+'</dd></div>';
  }).join('');
  const metric = payload ? preview.averageDirectHit : preview.estimatedHitDps;
  const label = payload ? 'Average direct hit' : 'Estimated hit DPS';
  const metricHtml = metric === undefined ? '' : '<div class="skill-reference-metric"><span>'+inspectionLink('basis',label)+'</span><strong>≈ '+
    metric.toLocaleString(undefined,{maximumFractionDigits:metric < 10 ? 1 : 0})+'</strong></div>';
  const notes = [];
  if (payload && metric !== undefined) notes.push('Per hit, before defenses and trigger modifiers.');
  if (cast && !held) notes.push('Actual cast level depends on the triggering event.');
  const more = [...new Set([...related,...rows.flatMap(previewMechanics)])].filter(key => !linked.has(key) && (key !== 'basis' || metric === undefined));
  const baseLabel = /\d/.test(def.description) ? '<small class="skill-reference-source">Base effect</small>' : '';
  return {title:titleFor(skillInstanceName(inst)),live:true,description:'<small class="skill-reference-source">'+esc(caption.join(' · '))+'</small>'
    + '<p>'+baseLabel+mechanicProse(def.description,related)+'</p>'+metricHtml
    + '<dl class="inspect-values skill-reference-values">'+values+skillGrowthHtml(def)+'</dl>'
    + notes.map(note => '<p class="inspect-note">'+note+'</p>').join(''),meta:mechanicLinks(more)};
}
