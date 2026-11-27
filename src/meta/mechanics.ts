import { COMBO_RULES } from '../data/combos';
import { CONJURE_RIDERS } from '../data/conjury';
import { PROCS, type ProcEffect } from '../data/procs';
import { SKILLS } from '../data/skills';
import { SUPPORTS } from '../data/supports';
import { UNIQUES } from '../data/uniques';
import { uniqueDefinitionLines } from '../engine/itemchoices';
import { SHEET_CATS, SEATED_CAT_BY_STAT, sheetFamilyOf, statBlurbOf, statDetailOf, statRestingValue } from '../data/sheet';
import { formatModLine } from '../engine/items';
import { COMPANION_GRANT_PREFIX } from '../engine/companionGrants';
import { POCKET_GRANTS, TRAIL_GRANTS } from '../engine/fieldgrants';
import { STATUS_RELAYS } from '../engine/reception';
import { ATTRIBUTE_BEQUESTS } from '../engine/bequests';
import { procReference, procEffectReference } from '../engine/procReference';
import { ATTRIBUTES, ATTRIBUTE_IDS, DAMAGE_TYPES, STAT_DEFS, addedDamageStat, isAttributeId, type AttributeId, type DamageType, type Modifier } from '../engine/stats';
import { STATUS_DEFS, WET_STAND_STATUSES } from '../engine/status';
import type { PreviewRow } from '../engine/skillPreview';
import { DEFAULT_LEVELING, instanceDelivery, instanceEffects, instanceFollowUps, instanceSequel, instanceTurret, makeSkillInstance, parseSkillGrantStat, parseSlotGraftStat, type SkillDef, type SkillInstance } from '../engine/skills';

export interface MechanicTopic {
  key: string;
  title: string;
  description: string;
  detail?: string;
  tags: string[];
  facts: { label: string; value: string }[];
  related: string[];
}

const stat = (id: string) => 'stat/' + id;
const status = (id: string) => 'status/' + id;
export const skillReferenceKey = (id: string) => 'skill/' + id;
export function modifierLineTopic(id: string): string {
  const skill = parseSkillGrantStat(id);
  if (skill) return skillReferenceKey(skill);
  if (id.startsWith('proc_')) return 'proc/' + id.slice(5);
  if (id.startsWith('combo_')) return 'combo/' + id.slice(6);
  return isAttributeId(id) ? 'attr/' + id : stat(id);
}
export function modifierTopics(modifiers: readonly Modifier[]): string[] {
  return [...new Set(modifiers.flatMap(m => m.fromStat ? [m.stat,m.fromStat] : [m.stat]).map(modifierLineTopic))].filter(k => mechanicTitle(k));
}

function statSkillReference(id: string): string | undefined {
  if (id.startsWith(COMPANION_GRANT_PREFIX)) return id.slice(COMPANION_GRANT_PREFIX.length);
  if (id.startsWith('summonReservation_')) return id.slice('summonReservation_'.length);
  if (id.startsWith('trailGrant_')) return TRAIL_GRANTS[id.slice('trailGrant_'.length)]?.skillId;
  return undefined;
}

/** The compact item line can name the granted support or summon directly. */
export function modifierSubjectName(id: string): string | undefined {
  const graft = parseSlotGraftStat(id);
  if (graft) return SUPPORTS[graft.gemId]?.name;
  const skill = statSkillReference(id);
  return skill ? SKILLS[skill]?.name : undefined;
}
/** Preview concepts that describe a rule rather than a single character statistic. */
const previewRules: Record<string,{title:string; description:string; related:string[]}> = {
  invocation: {title:'Rune weaving',description:'Cast spells to bank runes. The runes you have woven determine which working an invocation can release.',related:['stat/runeCap']},
  skillCost: {title:'Skill cost',description:'The cast lists the resources your character would spend for one use. Added costs, cost multipliers and effects that shift payment between life and mana can change the amount shown.',related:['stat/manaCost','stat/addedManaCost','stat/addedLifeCost','stat/costToLife','stat/costToMana']},
  paymentShield: {title:'Payment shield',description:'Paying a skill cost with life or mana can grant a temporary absorb shield. The amount depends on the resources actually paid, up to a share of maximum life. The stronger pool survives.',related:['stat/costWard_life','stat/costWard_mana','stat/costWardCap','stat/costWardDuration']},
  castGuard: {title:'Cast guard',description:'Some guard disciplines turn a raised shield into an instant cast. A share of the guard’s capacity becomes a temporary absorb shield.',related:['stat/guardStrength','stat/absorbPower','stat/effectDuration']},
  patientShield: {title:'Patient shield',description:'After the required time without casting, your next qualifying guard cast grants a larger, longer-lasting shield.',related:['rule/castGuard']},
  hitCycle: {title:'Landed-hit cycle',description:'Each qualifying hit advances the sequence. Its final hit completes the cycle and resets the count. The skill determines the reward for each stage.',related:['stat/damage']},
  axeRecovery: {title:'Axe recovery',description:'Retrieve the thrown axe to use it again. A missed throw delays recovery. Skills with an airborne catch can release an additional attack when you intercept the returning axe before it lands.',related:['rule/hitCycle']},
  castingSweeps: {title:'Casting sweeps',description:'These attacks occur during the windup of the throw. Each sweep has its own timing in the casting sequence.',related:['stat/attackSpeed']},
  meleeRelease: {title:'Armed melee release',description:'Toggle the skill on to arm it. A landed melee attack releases the armed skill and pays its cost.',related:['stat/manaCost']},
  summonedForms: {title:'Summoned forms',description:'A summon can create a fixed creature or draw from a pool. Each form brings its own abilities. The Character skill ribbon shows the abilities of a particular summoned body.',related:['rule/minionArts','stat/minionMaxCount']},
  minionArts: {title:'Minion abilities',description:'Each summoned form has its own skill set. Its summoning skill can add or replace abilities, so two forms can use different attacks or spells.',related:['stat/minionDamage','stat/minionHaste']},
  escort: {title:'Escort formation',description:'An escort stays near its keeper and attacks from its assigned position. The formation limits how far it will pursue a target.',related:['rule/summonedForms']},
  consolidation: {title:'Consolidated summon',description:'Several capacity slots can support one body. Additional slots strengthen that summon while the number of bodies stays the same.',related:['stat/minionMaxCount']},
  replenishment: {title:'Passive replenishment',description:'While the skill is seated on the bar, free slots refill in batches after an interval. Where a toggle is available, pausing births preserves existing summons.',related:['stat/minionRespawnTime','stat/summonCount','stat/minionMaxCount']},
  minionLifespan: {title:'Minion lifespan',description:'A timed summon expires at the end of its lifespan. Effect Duration scales that timer. A summon with no lifespan limit can remain until destroyed or dismissed.',related:['stat/effectDuration','stat/minionLife']},
};
export function previewMechanics(row: PreviewRow): string[] {
  return (row.mechanics ?? []).filter(k => mechanicTitle(k));
}
/** Read payload IDs from the resolved delivery, effects and sockets. An edge is one click, even for cycles. */
export function skillPayloadKeys(inst: SkillInstance): string[] {
  const d = instanceDelivery(inst);
  const ids = [inst.def.guard?.pulse?.skillId, instanceSequel(inst)?.skillId, instanceTurret(inst)?.castSkillId,
    ...instanceFollowUps(inst).map(f => f.skillId)];
  if (d.type === 'construct') ids.push(d.castSkillId,d.hatch?.skillId);
  if (d.type === 'projectile') ids.push(d.emit?.skillId,d.shatter?.skillId);
  if (d.type === 'ground') ids.push(d.emit?.skillId);
  if (d.type === 'aura') ids.push(d.onDeactivate?.skillId);
  if (d.type === 'summon') ids.push(d.strikeRelease?.skill, ...(d.crewSkills ?? []), ...(d.crewAuras ?? []));
  for (const effect of instanceEffects(inst)) if (effect.type === 'minionCast') ids.push(effect.skillId);
  return [...new Set(ids)].filter((id): id is string => !!id && id !== inst.def.id && !!SKILLS[id]).map(skillReferenceKey);
}
export function skillMechanics(def: SkillDef, inst = makeSkillInstance(def)): string[] {
  const keys = [
    ...skillPayloadKeys(inst),
    ...modifierTopics([...(def.leveling?.perLevel ?? DEFAULT_LEVELING), ...(def.innateMods ?? []), ...(def.equipMods ?? []), ...(def.thresholds ?? []).flatMap(t => t.mods)]),
    ...(def.guard ? [stat('guardStrength')] : []),
    ...(def.guard?.bash?.stunChance ? [status('stun')] : []),
    ...Object.keys(def.requirements ?? {}).map(id => 'attr/'+id),
    ...(def.baseDamage ? ['basis',stat('damage')] : []),
    ...(def.useTime ? [stat(def.tags.includes('attack') ? 'attackSpeed' : 'castSpeed')] : []),
    ...(def.cooldown ? [stat('cooldownRecovery')] : []),
  ];
  for (const effect of instanceEffects(inst)) {
    if (effect.type === 'status') keys.push(status(effect.status));
    if (effect.type === 'buff') keys.push(...modifierTopics(effect.mods ?? []));
  }
  return [...new Set(keys)].filter(k => mechanicTitle(k));
}
const number = (v: number, percent = false) => String(Number((percent ? v * 100 : v).toFixed(4))) + (percent ? '%' : '');
const groups = [
  ['attackSpeed','castSpeed','cooldownRecovery'], ['damage','accuracy','critChance','critMulti'],
  ['life','lifeRegen','lifeLeech'], ['mana','manaRegen','manaCost'], ['armor','armorPen','armorDamageFloor'],
  ['energyShield','esRecharge','esDelay'], ['blockChance','blockRecovery'], ['ward','wardRecovery'],
  ['guardStrength','blockValue','blockPower','blockChance','absorbPower'],
  ['statusChance','statusMagnitude','effectDuration','ailmentStacks'], ['minionMaxCount','minionDamage','minionLife','effectDuration'],
  ['projectileCount','pierceCount','chainCount'], ['fireRes','coldRes','lightningRes','chaosRes'],
];
const statPeers = new Map<string, string[]>();
for (const group of groups) for (const id of group) statPeers.set(id,[...(statPeers.get(id) ?? []),...group]);

function effectLinks(effect: ProcEffect): string[] {
  switch (effect.type) {
    case 'cast': return [skillReferenceKey(effect.cast.skillId)];
    case 'status': return [status(effect.status)];
    case 'cleanse': return (effect.statuses ?? []).map(status);
    case 'buff': return (effect.buff.mods ?? []).map(m => stat(m.stat));
    case 'ward': return [stat('ward'),stat('life')];
    case 'summon': case 'birth': return [stat('minionMaxCount'),stat('effectDuration')];
    case 'cooldown': return [stat('cooldownRecovery')];
    case 'heal': return [stat('life')];
    case 'restore': return [stat(effect.resource === 'es' ? 'energyShield' : effect.resource)];
    case 'extraHit': case 'explosion': case 'arc': case 'burst': case 'delayedBurst': case 'collisionDamage': return [stat('damage')];
    default: return [];
  }
}

function titleFor(kind: string, id: string): string | undefined {
  switch (kind) {
    case 'rule': return previewRules[id]?.title;
    case 'hit': return DAMAGE_TYPES.includes(id as DamageType) ? id[0].toUpperCase()+id.slice(1)+' hit damage' : undefined;
    case 'skill': return SKILLS[id]?.name;
    case 'stat': return STAT_DEFS[id]?.label;
    case 'attr': return ATTRIBUTES[id as AttributeId]?.label;
    case 'proc': return PROCS[id]?.name;
    case 'combo': return COMBO_RULES[id]?.name;
    case 'status': return STATUS_DEFS[id]?.label;
    case 'basis': return 'Direct hit estimate';
    case 'conversion': return 'Damage conversion';
  }
}
export function mechanicTitle(key: string): string | undefined {
  const [kind,id] = key.split('/');
  return titleFor(kind,id);
}

/** Read on demand so balance changes and package registrations also reach the reference. */
export function mechanicTopic(key: string): MechanicTopic | undefined {
  const [kind,id] = key.split('/');
  const title = titleFor(kind,id);
  if (!title) return;
  const topic: MechanicTopic = {key,title,description:'',tags:[],facts:[],related:[]};
  const fact = (label: string, value: string) => topic.facts.push({label,value});
  switch (kind) {
    case 'hit':
      topic.tags = ['Damage',id];
      topic.description = 'The part of a hit dealt as '+id+' damage, shown from its lowest to highest roll before the target’s defenses. Damage conversion can move damage into or out of this range.';
      topic.related = ['conversion','basis',stat(addedDamageStat(id as DamageType)),stat('addedMin_'+id),stat('addedMax_'+id),stat(id === 'physical' ? 'armor' : id+'Res')];
      break;
    case 'rule': {
      const rule = previewRules[id];
      topic.tags = ['Skill mechanic'];
      topic.description = rule.description;
      topic.related = rule.related;
      break;
    }
    case 'skill': {
      const def = SKILLS[id];
      topic.tags = ['Skill',...def.tags];
      topic.description = def.description;
      topic.facts = skillReferenceFacts(def);
      topic.related = skillMechanics(def);
      break;
    }
    case 'stat': {
      const def = STAT_DEFS[id], family = sheetFamilyOf(id);
      const category = SHEET_CATS[SEATED_CAT_BY_STAT.get(id) ?? family?.cat ?? ''];
      topic.tags = ['Statistic',category?.label ?? 'Other'];
      topic.description = statBlurbOf(id) ?? 'The default and limits describe this statistic before build modifiers.';
      topic.detail = statDetailOf(id) ?? undefined;
      fact('Default',number(statRestingValue(id),def.percent));
      if (def.min !== undefined) fact('Minimum',number(def.min,def.percent));
      if (def.max !== undefined) fact('Maximum',number(def.max,def.percent));
      const skill = statSkillReference(id);
      if (skill) topic.related.push(skillReferenceKey(skill));
      for (const rider of CONJURE_RIDERS) if (rider.stat === id) topic.related.push(status(rider.grant.status));
      const graft = parseSlotGraftStat(id);
      const support = graft && SUPPORTS[graft.gemId];
      if (support) {
        fact(support.name, support.description);
        topic.related.push(...modifierTopics([...support.mods, ...(support.perLevel ?? [])]));
      }
      if (family) {
        const subject = id.slice(family.prefix.length);
        if (['proc_','procPower_'].includes(family.prefix)) topic.related.push('proc/' + subject);
        if (family.prefix === 'combo_') topic.related.push('combo/' + subject);
        if (['apply_','applyWet_','minionApply_','damageVs_','popPower_'].includes(family.prefix)) topic.related.push(status(subject));
        const relay = family.prefix === 'relayStatus_' && STATUS_RELAYS[subject];
        if (relay) {
          topic.related.push(status(relay.status));
          fact('Redirection radius',String(relay.radius));
        }
        const pocket = family.prefix === 'pocketGrant_' && POCKET_GRANTS[subject];
        if (pocket) {
          for (const m of pocket.inside) fact('Inside the refuge',formatModLine(m,m.value));
          for (const m of pocket.outside) fact('Outside the refuge',formatModLine(m,m.value));
          topic.related.push(...modifierTopics([...pocket.inside,...pocket.outside]));
        }
        const bequest = family.prefix === 'bequest_' && ATTRIBUTE_BEQUESTS[subject];
        if (bequest) topic.related.push(...bequest.attributes.map(a => 'attr/'+a));
        if (['convert_','gainAs_','extraAs_'].includes(family.prefix)) topic.related.push('conversion');
      }
      topic.related.push(...ATTRIBUTE_IDS.filter(a => ATTRIBUTES[a].perPoint.some(m => m.stat === id)).map(a => 'attr/' + a));
      topic.related.push(...(statPeers.get(id) ?? []).map(stat));
      if (!topic.related.some(k => k !== key && mechanicTitle(k))) topic.related.push(...(category?.core ?? []).slice(0,3).map(stat));
      break;
    }
    case 'attr': {
      const def = ATTRIBUTES[id as AttributeId];
      topic.tags = ['Attribute',def.group];
      topic.description = def.description;
      for (const m of def.perPoint) { fact('Per point',formatModLine(m,m.value)); topic.related.push(stat(m.stat)); }
      break;
    }
    case 'proc': {
      const def = PROCS[id];
      topic.tags = ['Triggered effect', 'Proc'];
      topic.description = procReference(def);
      const effect = procEffectReference(def.effect);
      if (def.description && effect !== def.description) topic.facts.push({label:'Base effect',value:effect});
      topic.related.push(...effectLinks(def.effect),...[def.status ?? [],def.requireStatus ?? []].flat().map(status));
      if (def.crit || def.noCrit) topic.related.push(stat('critChance'));
      topic.related.push(stat('procPower_' + id),stat('proc_' + id));
      break;
    }
    case 'combo': {
      const def = COMBO_RULES[id];
      topic.tags = ['Combo'];
      topic.description = def.blurb;
      topic.detail = def.detail;
      topic.related.push(...effectLinks(def.effect),stat('comboWindow'),stat('combo_' + id));
      break;
    }
    case 'status': {
      const def = STATUS_DEFS[id], rules: string[] = def.description ? [def.description] : [];
      topic.tags = ['Status',...(def.element ? [def.element] : [])];
      if (def.dotType) rules.push('Deals ' + def.dotType + ' damage over time.');
      if (def.hardCC) rules.push('Prevents movement and skill use.');
      if (def.immobilize) rules.push('Prevents voluntary movement.');
      if (def.forbidsTags?.length) rules.push('Prevents the use of ' + def.forbidsTags.join(' and ') + ' skills.');
      if (def.invertMove) rules.push('Reverses movement direction.');
      if (def.panic) rules.push('Makes affected creatures flee.');
      if (def.flight) rules.push('Grants flight.');
      if (def.frameLock) rules.push('Holds the boundaries of the current view in place.');
      if (def.conceals) rules.push('Conceals the bearer from view.');
      else if (def.ghostAlpha !== undefined && !def.description) rules.push('The bearer appears as a faint silhouette.');
      if (def.timeScale !== undefined) rules.push(def.timeScale === 0 ? 'Suspends the bearer’s movement, actions and timers.' : 'The bearer’s time runs at ' + number(def.timeScale,true) + ' of its usual rate.');
      if (def.boundToAbsorb) rules.push('Ends when the shield granting it breaks.');
      if (def.smellsOfPrey) rules.push('Hunters can track the bearer as prey.');
      if (WET_STAND_STATUSES.includes(id)) rules.push('Counts as wet for effects that check the target’s wetness.');
      if (def.dischargeOnHit) rules.push('Releases stored damage on the next qualifying hit' + (def.dischargeMatchingType ? ' of the matching damage type.' : '.'));
      if (def.cullsAtLethal) rules.push('Detonates early when its stored damage reaches the bearer’s remaining life.');
      if (def.weakSpot) rules.push('Taking damage inside the marked life band deals ' + number(def.weakSpot.bonus,true) + ' more damage. Dropping below the band destroys the weak spot.');
      if (def.zapNearby) rules.push('Strikes nearby allies of the bearer every ' + number(def.zapNearby.interval) + ' seconds.');
      if (def.lashOut) rules.push('The bearer strikes the nearest body every ' + number(def.lashOut.interval) + ' seconds.');
      if (def.dpsCurve) rules.push(def.dpsCurve === 'ramp' ? 'Damage builds over its duration.' : 'Damage is strongest at the start and fades over time.');
      if (def.pop) { rules.push('Reapplying the effect releases ' + number(def.pop.fraction,true) + ' of its remaining damage immediately.'); topic.related.push(stat('popPower_'+id)); }
      if (def.interruptChance) rules.push('Skills may fizzle and briefly stun the bearer.');
      if (def.scrambleChance) rules.push('Using a skill may trigger another ready skill.');
      if (def.propagateOnDeath) rules.push('Spreads to nearby allies of the bearer on death.');
      if (def.buildup) { rules.push('At full stacks, becomes ' + STATUS_DEFS[def.buildup.into].label + '.'); topic.related.push(status(def.buildup.into)); }
      if (def.hitVulnerability) rules.push('Each stack increases ' + def.hitVulnerability.type + ' damage taken from matching skills by ' + number(def.hitVulnerability.perStack,true) + '.');
      if (def.stackPolicy === 'strongest') rules.push('Only a stronger application replaces the current one.');
      if (def.independentStacks) rules.push('Each stack expires separately.');
      for (const m of def.mods ?? []) { fact(def.modsPerStack ? 'Per stack' : 'While affected',formatModLine(m,m.value)); topic.related.push(stat(m.stat)); }
      topic.description = rules.join(' ') || (def.mods?.length ? 'Changes the bearer’s statistics while active.' : 'Skills and effects can apply or respond to ' + title + '.');
      fact('Base duration',number(def.duration) + ' s');
      if (def.stacking && def.maxStacks) { fact('Base stack limit',String(def.maxStacks)); topic.related.push(stat('ailmentStacks')); }
      topic.related.push(stat('effectDuration'), stat('apply_' + id));
      break;
    }
    case 'basis':
      topic.tags = ['Skill estimate','Damage'];
      topic.description = 'Average hit includes ordinary critical strikes before defenses. Hit DPS assumes one landed hit per use or channel pulse and uninterrupted casting. Additional hits and damage over time are excluded.';
      topic.related = ['damage','critChance','critMulti','attackSpeed','castSpeed'].map(stat);
      break;
    case 'conversion':
      topic.tags = ['Damage'];
      topic.description = 'Conversion moves damage between types after scaling. Targets are visited in the order below, spending at most the remaining source damage. Converted damage can feed a type processed later in that order.';
      fact('Processing order',DAMAGE_TYPES.join(' → '));
      fact('Gain as extra','Adds damage from the post-conversion total without consuming it. Extra gains do not feed one another.');
      topic.related = [stat('damage')];
      break;
  }
  topic.related = [...new Set(topic.related)].filter(k => k !== key && mechanicTitle(k));
  return topic;
}

export function mechanicKeys(): string[] {
  // Index payloads and actual item grants. Every catalog skill has a potential grant stat.
  const skills = new Set<string>();
  for (const unique of Object.values(UNIQUES)) for (const line of uniqueDefinitionLines(unique)) {
    const id = parseSkillGrantStat(line.stat);
    if (id && SKILLS[id]) skills.add(skillReferenceKey(id));
  }
  for (const id of Object.keys(STAT_DEFS)) {
    const skill = statSkillReference(id);
    if (skill && SKILLS[skill]) skills.add(skillReferenceKey(skill));
  }
  for (const def of [...Object.values(PROCS),...Object.values(COMBO_RULES)]) {
    if (def.effect.type === 'cast' && SKILLS[def.effect.cast.skillId]) skills.add(skillReferenceKey(def.effect.cast.skillId));
  }
  for (const key of skills) {
    for (const child of skillPayloadKeys(makeSkillInstance(SKILLS[key.slice(6)]))) skills.add(child);
  }
  return ['basis','conversion',...DAMAGE_TYPES.map(t=>'hit/'+t),...Object.keys(previewRules).map(id=>'rule/'+id),...ATTRIBUTE_IDS.map(id=>'attr/'+id), ...Object.keys(PROCS).map(id=>'proc/'+id),
    ...Object.keys(COMBO_RULES).map(id=>'combo/'+id),...skills,...Object.keys(STATUS_DEFS).map(status),...Object.keys(STAT_DEFS).map(stat)];
}

export function skillReferenceFacts(def: SkillDef): MechanicTopic['facts'] {
  const facts: MechanicTopic['facts'] = [];
  if (def.baseDamage) facts.push({label:'Base damage',value:Object.entries(def.baseDamage).map(([type,band]) => band[0]+'–'+band[1]+' '+type).join(' · ')});
  facts.push({label:'Base mana cost',value:String(def.manaCost)});
  if (def.lifeCost) facts.push({label:'Base life cost',value:String(def.lifeCost)});
  facts.push({label:'Base use time',value:def.useTime+'s'},{label:'Base cooldown',value:def.cooldown+'s'});
  for (const {label,mods} of skillGrowth(def)) facts.push({label,value:mods.map(m => formatModLine(m,m.value)).join(' · ')});
  return facts;
}

/** Both the Codex and skill cards read the growth applied by instanceInnateMods. */
export function skillGrowth(def: SkillDef): {label:string; mods:Modifier[]}[] {
  return [{label:'Per additional level',mods:def.leveling?.perLevel ?? DEFAULT_LEVELING},
    ...(def.thresholds ?? []).map(t => ({label:'Lv '+t.level+' · '+t.label,mods:t.mods}))].filter(row => row.mods.length);
}
