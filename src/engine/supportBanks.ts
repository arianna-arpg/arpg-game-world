import type { Actor } from './actor';
import type { Modifier, SkillTag } from './stats';
import { grantedTags, hostSockets, instanceCastMode, instanceMods, socketSpec, instanceChargeCost, type EchoRiderSpec, skillContextTags, TRIGGER_CFG, type SkillInstance, type TriggerSpec, type OverchargeSpec } from './skills';

export function triggerBankThreshold(owner:Actor,inst:SkillInstance,spec:TriggerSpec,
  tags=skillContextTags(inst,grantedTags(inst)),extra=instanceMods(inst)):number|undefined {
  if (spec.on==='damageTaken')
    return Math.max(.05,owner.sheet.get('triggerThreshold',tags,extra,spec.lifeFrac ?? TRIGGER_CFG.lifeFrac))*owner.maxLife();
  if (spec.on==='statusApply')
    return Math.max(1,owner.sheet.get('triggerPower',tags,extra,spec.power ?? 1));
}

export function overchargeStageCap(owner:Actor,spec:OverchargeSpec,tags:Set<SkillTag>,extra:Modifier[]) {
  return Math.max(1,Math.floor(owner.sheet.get('overchargeStages',tags,extra,spec.stages)));
}

/** The two contributions add before the shared projectile limit is applied. */
export function channelSpoolBank(owner:Actor,seconds:number,hits:number,tags:Set<SkillTag>,extra:Modifier[]) {
  const cap=Math.floor(owner.sheet.get('channelSpoolCap',tags,extra));
  const time=Math.floor(Math.max(0,owner.sheet.get('channelSpool',tags,extra))*seconds);
  const hit=Math.floor(Math.max(0,owner.sheet.get('channelHitSpool',tags,extra))*hits);
  return {time,hit,cap,total:Math.min(cap,time+hit)};
}

export function gatheredCast(inst:SkillInstance,mode=instanceCastMode(inst)) {
  if (mode==='cast' && !inst.def.concentration && inst.def.useTime>=.3) return socketSpec(inst,'gather');
}

export function canPlantSkillTotem(inst:SkillInstance) {
  const delivery=inst.def.delivery.type;
  return !['construct','aura','detonate','summon','mark','dash','blink','leap'].includes(delivery)
    && (delivery!=='self' || instanceCastMode(inst)==='guard');
}

export function echoableSkill(inst:SkillInstance,spec:EchoRiderSpec) {
  if (spec.mode==='mimic') return true;
  const def=inst.def, cost=instanceChargeCost(inst);
  return !['construct','aura','detonate','detonateProjectile','summon','mark','dash','blink','leap','self'].includes(def.delivery.type)
    && !def.pool && !def.targeting && (!cost || !!cost.optional);
}

/** Each echo family owns its flat count. Other echo gems cannot multiply it. */
export function echoCapacity(owner:Actor,inst:SkillInstance,spec:EchoRiderSpec,key:string) {
  let others=0;
  if (!key.endsWith(':self')) {
    const own=key.slice(key.indexOf(':')+1);
    for (const gem of hostSockets(inst)) if (gem.def.echo && gem.def.id!==own)
      for (const m of gem.def.mods) if (m.stat==='mirageCount' && m.kind==='flat') others+=m.value;
  }
  return Math.round(owner.sheet.get('mirageCount',skillContextTags(inst.def),instanceMods(inst),spec.count ?? 0))-others;
}

export const strikeEchoFlights=3;
export const graftConstructBaseCap=1;
export function constructCapacity(actor:Actor,inst:SkillInstance,base:number) {
  return Math.max(1,Math.round(actor.sheet.get('constructMaxCount',skillContextTags(inst),instanceMods(inst),base)));
}
