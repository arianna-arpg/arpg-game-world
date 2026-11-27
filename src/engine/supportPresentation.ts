import { SKILLS } from '../data/skills';
import { CLUTCH_CFG } from './clutch';
import { supportCensus, supportFamily } from './supportCensus';
import { summonCapacity } from './summonContracts';
import { PROCS } from '../data/procs';
import { triggerBankThreshold, overchargeStageCap, channelSpoolBank, gatheredCast, canPlantSkillTotem, echoableSkill, echoCapacity, strikeEchoFlights, constructCapacity, graftConstructBaseCap } from './supportBanks';
import { THRONG_CFG } from './throng';
import { instanceDelivery, instanceChannel, instanceMods } from './skills';
import { chargeLabel } from './charges';
import { resolveVein, spawnVeinOf, veinMods } from './supportbase';
import { gateOpen } from './buffPresentation';
import { GLOBAL_SUPPORT_STATS, hostSockets, supportFitsInst, supportFitsOwnInst, crewSkillsServed, instanceChargeCost, instanceMetas, instanceCastMode, instanceBirth, instanceBrood, instanceEchoes, instanceCurseField, instanceTurret, instanceSummon, socketSpec, instanceOvercharge, instanceSelfStack, instanceSideFeast,
  instanceTrigger, instanceTriggerArmed, useChargeSupport, instanceUseCharges, socketsWithGrafts, skillContextTags, type SkillInstance, type SupportInstance, type SupportDef } from './skills';
import type { Modifier, SkillTag } from './stats';
import type { Actor } from './actor';
import type { World } from './world';

import { FIELD_ROLES, PROC_ROLES, SUPPORT_ROLES, visualRoleForStat, type SupportCounter, type SupportRole } from '../data/supportVisuals';
export { SUPPORT_ROLES, type SupportRole } from '../data/supportVisuals';

const SUPPORT_PULSE_SECONDS = 0.55;
const rolesByDef = new WeakMap<SupportDef,readonly SupportRole[]>();
export function supportRoles(d:SupportDef):readonly SupportRole[] {
  const cached=rolesByDef.get(d);
  if (cached) return cached;
  const rolled=d.rollBase?.axes.flatMap(axis=>axis.rows.flatMap(row=>row.mods ?? [])) ?? [];
  const result=classify(d,[...d.mods,...(d.perLevel ?? []),...rolled]);
  rolesByDef.set(d,result);
  return result;
}
function classify(d:SupportDef,mods:readonly Modifier[]):readonly SupportRole[] {
  const roles=new Set<SupportRole>(d.presentation?.roles);
  for (const key of Object.keys(d) as (keyof typeof FIELD_ROLES)[]) {
    if (d[key]!==undefined && Object.hasOwn(FIELD_ROLES,key)) for (const role of FIELD_ROLES[key]) roles.add(role);
  }
  if (d.rollBase?.kind==='spawn') roles.add('companion');
  for (const m of mods) {
    if (GLOBAL_SUPPORT_STATS.has(m.stat)) roles.add('wearer');
    if (m.when || m.unless || (m.gauge && m.gauge!=='level')) roles.add('condition');
    if (m.stat.startsWith('proc_')) {
      roles.add('proc');
      const fx=PROCS[m.stat.slice(5)]?.effect;
      if (fx) {
        for (const role of PROC_ROLES[fx.type]) roles.add(role);
        if (fx.type==='delayedBurst' && fx.healAllies) roles.add('recovery');
        if (fx.type==='status' && fx.onAppliedMend) {
          roles.add('recovery');
          if (fx.onAppliedMend.onHeal) roles.add('field');
        }
      }
    } else {
      const role=visualRoleForStat(m.stat);
      if (role) roles.add(role);
      if (m.stat.startsWith('minionApply_')) roles.add('target');
    }
  }
  if (roles.size>1) roles.delete('mod');
  if (!roles.size) roles.add('mod');
  return Object.freeze((Object.keys(SUPPORT_ROLES) as SupportRole[]).filter(role=>roles.has(role)));
}
const severalBuffs=new WeakMap<SupportDef,boolean>();
/** A support that grants several buffs keeps the individual effect faces on its recipient. */
export function multipleSupportBuffs(def:SupportDef):boolean {
  const cached=severalBuffs.get(def);
  if (cached!==undefined) return cached;
  const buffs=new Set<string>();
  if (def.spawnBuff) buffs.add(def.spawnBuff.id);
  const rolled=def.rollBase?.axes.flatMap(a=>a.rows.flatMap(r=>r.mods ?? [])) ?? [];
  for (const m of [...def.mods,...(def.perLevel ?? []),...rolled]) {
    if (!m.stat.startsWith('proc_')) continue;
    const fx=PROCS[m.stat.slice(5)]?.effect;
    if (fx?.type==='buff') buffs.add(fx.buff.id);
  }
  const multiple=buffs.size>1;severalBuffs.set(def,multiple);return multiple;
}
const fittedViews=new WeakMap<SupportInstance,ReturnType<typeof fittedView>>();
function fittedView(gem:SupportInstance) {
  const {def,rolled,level}=gem;
  const mods=[...def.mods,...(level>1 ? def.perLevel ?? [] : []),...(def.rollBase ? veinMods(def.rollBase,rolled) : [])];
  const populations=new Set<string>();
  const banks=new Set(def.chargeGain?.map(spec=>spec.charge));
  for (const m of mods) {
    if (!m.stat.startsWith('proc_')) continue;
    const fx=PROCS[m.stat.slice(5)]?.effect;
    if (fx?.type==='summon' || fx?.type==='birth') populations.add(m.stat.slice(5));
    if (fx?.type==='gainCharge') banks.add(fx.charge);
  }
  const spool=mods.find(m=>m.stat==='channelSpool' || m.stat==='channelHitSpool')?.stat;
  const vein=def.rollBase && spawnVeinOf(def.rollBase,rolled), totem=mods.some(m=>m.stat==='castAsTotem');
  const hasPopulation=!!(vein || populations.size || def.corpseSpawn || def.dominate || def.brood || def.birth ||
    def.summon || def.echo || totem || def.turret || def.curseField?.mode==='ground');
  return {def,rolled,level,mods,banks,populations,vein,spool,totem,hasPopulation,roles:classify(def,mods),gates:mods.filter(m=>m.when || m.unless || (m.gauge && m.gauge!=='level')),
    lines:def.rollBase ? Object.values(resolveVein(def.rollBase,rolled)).map(row=>row.line) : []};
}
function viewOf(gem:SupportInstance) {
  const cached=fittedViews.get(gem);
  if(cached && cached.def===gem.def && cached.level===gem.level && cached.rolled===gem.rolled) return cached;
  const view=fittedView(gem);fittedViews.set(gem,view);return view;
}
export interface SupportMark {
  id:string; name:string; color:string; role:SupportRole; graft:boolean; serving:boolean;
  roles?:readonly SupportRole[]; fired?:boolean; routedTo?:'crew'|'component';
  counter?:SupportCounter; useBank?:true; fuelBank?:string;
  readout?:string; meter?:{count:number; cap:number}; lit?:boolean;
  extraReadings?:SupportReading[];
  nativeReadout?:'brim'|'roster';
  threshold?:number;
}
export interface SupportReading {
  readout:string; meter:{count:number;cap:number}; counter?:SupportCounter; threshold?:number;
}
function addReading(mark:SupportMark,reading:SupportReading) {
  if (mark.meter) (mark.extraReadings ??= []).push(reading);
  else Object.assign(mark,reading);
}
/** Keep one miniature per socket while giving each live reading its own face and hitbox. */
export function supportMeters(marks:readonly SupportMark[]):SupportMark[] {
  return marks.flatMap(m=>m.meter ? [m.extraReadings ? {...m,extraReadings:undefined} : m,...(m.extraReadings ?? []).map(r=>({...m,...r,useBank:undefined,extraReadings:undefined}))] : []);
}
export function skillBarSupportMarks(world:World,actor:Actor) {
  const census=supportCensus(world);
  return actor.skills.map(inst=>inst ? supportMarks(world,actor,inst,census) : []);
}
function addPopulationReadings(mark:SupportMark,view:ReturnType<typeof fittedView>,actor:Actor,inst:SkillInstance,census:ReturnType<typeof supportCensus>) {
  const d=view.def, host=inst.def.id;
  const population=(count:number,cap:number,readout:string,counter=d.presentation?.counter)=>{
    if (cap>0) addReading(mark,{counter,readout,meter:{count,cap}});
  };
  if (view.vein) population(census('family',actor.owner ?? actor,supportFamily.vein(host,d.id)),view.vein.cap,'Living brood from this vein',d.presentation?.populationCounter);
  if (d.corpseSpawn && socketSpec(inst,'corpseSpawn')===d.corpseSpawn)
    population(census('family',actor,supportFamily.hive(host)),d.corpseSpawn.max,'Living corpse summons');
  if (d.dominate && socketSpec(inst,'dominate')===d.dominate)
    population(census('family',actor,supportFamily.dominate(host)),d.dominate.max,'Living dominated thralls');
  if (d.brood && instanceBrood(inst)===d.brood)
    population(census('family',actor,supportFamily.brood(d.brood.monsterId)),d.brood.max,'Living ailment brood of this kind');
  for (const proc of view.populations) {
    const fx=PROCS[proc].effect;
    if (fx.type==='summon' || fx.type==='birth') population(census('family',actor.owner ?? actor,supportFamily.proc(proc)),
      fx.type==='summon' ? fx.max : fx.birth.cap ?? CLUTCH_CFG.minionCap,'Living '+PROCS[proc].name+' summons');
  }
  const birth=d.birth && instanceBirth(inst)===d.birth ? d.birth : undefined;
  const summon=d.summon && instanceDelivery(inst).type==='construct' && instanceSummon(inst)===d.summon ? d.summon : undefined;
  if (birth || summon) {
    const spec=summon ?? {type:'summon' as const,count:1,monsterId:birth?.monsterId,maxActive:birth?.cap ?? CLUTCH_CFG.minionCap};
    population(census('primary',actor,host),summonCapacity(actor,inst,spec),'Living summons in this skill’s roster');
    mark.nativeReadout='roster';
  }
  if (d.echo && !actor.construct && echoableSkill(inst,d.echo)) {
    const family=instanceEchoes(inst).find(row=>row.spec===d.echo);
    if (family) {
      const strike=d.echo.mode==='strike';
      const cap=echoCapacity(actor,inst,d.echo,family.key)*(strike ? strikeEchoFlights : 1);
      population(census('echo',actor,family.key),cap,strike?'Spirits in flight':'Stationed mirages');
    }
  }
  if (view.totem && !actor.construct && canPlantSkillTotem(inst) &&
      actor.sheet.get('castAsTotem',skillContextTags(inst.def),instanceMods(inst))>0)
    population(census('construct',actor,host),constructCapacity(actor,inst,graftConstructBaseCap),'Totems in this skill’s roster');
  if (d.turret && instanceTurret(inst)===d.turret) {
    const delivery=instanceDelivery(inst);
    if (delivery.type==='ground' && (delivery.lingerDuration ?? 0)>0 && SKILLS[d.turret.castSkillId])
      population(census('construct',actor,host),constructCapacity(actor,inst,graftConstructBaseCap),'Living offering effigies');
  }
  if (d.curseField?.mode==='ground' && instanceCurseField(inst)===d.curseField)
    population(census('patch',actor,host),1,'Active cursed ground');
}

const isClockModifier=(m:SupportDef['mods'][number])=>m.stat==='addedCooldown' || m.stat==='cooldownRecovery';
export function supportMarks(world:World, actor:Actor, inst:SkillInstance, census=supportCensus(world)):SupportMark[] {
  if (actor.supportPresentation) return Object.hasOwn(actor.supportPresentation,inst.def.id) ? actor.supportPresentation[inst.def.id] : [];
  if (!inst.grafts?.length && !inst.sockets.some(Boolean)) return [];
  const serving=hostSockets(inst), bankOwner=useChargeSupport(inst,serving);
  return socketsWithGrafts(inst).flatMap(gem=>{
    if (!gem) return [];
    const d=gem.def, view=viewOf(gem), roles=view.roles, role=roles[0];
    const mark:SupportMark={id:d.id,name:d.name,color:d.color,role,roles,graft:!!inst.grafts?.includes(gem),serving:serving.includes(gem) && (!(d.requiresMechanisms?.length || d.rollBase || inst.def.castPolicy) || supportFitsOwnInst(d,inst,gem.rolled))};
    if (d.presentation?.counter) mark.counter=d.presentation.counter;
    if (!mark.serving) {
      if (supportFitsInst(d,inst,gem.rolled)) mark.routedTo='component';
      else if (crewSkillsServed(d,inst,world.summonCrewSkills(inst))) mark.routedTo='crew';
      return [mark];
    }
    if (gem===bankOwner) mark.useBank=true;
    const last=inst.state?.supportFiredAt?.[d.id];
    if (last!==undefined && world.time>=last && world.time-last<SUPPORT_PULSE_SECONDS) mark.fired=true;
    const facts=[...view.lines];
    for (const bank of view.banks) facts.push(chargeLabel(bank)+' held · '+(actor.charges.get(bank) ?? 0));
    if (d.gate) {
      mark.lit=actor.gatesMet(inst);
      facts.push(mark.lit?'Cast gates open':'Cast gated');
    }
    if (roles.includes('ammo') && instanceUseCharges(inst)) {
      const cap=actor.skillChargeCap(inst), held=actor.skillChargeState.get(inst.def.id)?.count ?? cap;
      mark.readout=held+' / '+cap+' charges';
    }
    const reading=(meter:SupportReading['meter'],readout:string)=>addReading(mark,{meter,readout,counter:d.presentation?.counter});
    if (d.selfStack && d.selfStack===instanceSelfStack(inst)) {
      const pile=world.selfStacksOf(inst);
      if (pile) reading({count:pile.count,cap:pile.max},'Skill stacks');
    }
    if (roles.includes('cooldown') && view.mods.some(isClockModifier)) {
      const remaining=actor.cooldowns.get(world.slotFaceOf(actor,inst).id) ?? 0;
      facts.push(remaining>0 ? 'Cooldown '+remaining.toFixed(1)+'s' : 'Cooldown ready');
    }
    if (roles.includes('seals')) {
      const seals=world.unleashSealsOf(actor,inst);
      if (seals) reading({count:seals.count,cap:seals.max},'Stored repeat seals');
    }
    if (d.chargeCost && (d.chargeCost===instanceChargeCost(inst) || d.chargeCost===instanceSideFeast(inst))) {
      const id=d.chargeCost.charge;
      reading({count:actor.charges.get(id) ?? 0,cap:actor.chargeCounterCap(id,inst)},chargeLabel(id));
      mark.fuelBank=id;
    }
    if (view.vein?.hits) reading({count:gem.gauge ?? 0,cap:view.vein.hits},'Hits toward next summon');
    if (d.trigger && d.trigger===instanceTrigger(inst)) {
      mark.lit=instanceTriggerArmed(inst);facts.push(mark.lit?'Armed':'Disarmed');
      if (d.trigger.on==='damageTaken' || d.trigger.on==='statusApply') {
        const need=triggerBankThreshold(actor,inst,d.trigger)!;
        reading({count:inst.state?.trigAccum ?? 0,cap:d.trigger.on==='statusApply'?Math.ceil(need):need},
          d.trigger.on==='damageTaken' ? 'Damage taken toward cast' : 'Matching applications toward cast');
      }
    }
    if (d.meta && instanceMetas(inst).includes(d.meta)) {
      const action=SKILLS[d.meta.skillId], cost=action?.chargeCost;
      facts.push(d.meta.label);
      if (cost) {
        const bank=cost.charge, gate=action.gate?.charge;
        const need=Math.max(typeof cost.amount==='number' ? cost.amount : 1,gate?.id===bank ? gate.amount : 0);
        addReading(mark,{counter:d.presentation?.counter,meter:{count:actor.charges.get(bank) ?? 0,cap:actor.chargeCounterCap(bank,inst)},
          threshold:need,readout:action.name+' · '+need+' '+chargeLabel(bank)+' required'});
        mark.fuelBank=bank;
      }
    }
    if (d.overcharge && instanceOvercharge(inst)===d.overcharge) {
      const cast=actor.casting?.inst===inst && actor.casting.mode==='overcharge' ? actor.casting : undefined;
      reading({count:cast?.stage ?? 0,cap:overchargeStageCap(actor,d.overcharge,skillContextTags(inst.def),instanceMods(inst))},'Banked overcharge stages');
    }
    if (d.throngSource?.kind==='gauge' && inst.def.throng) {
      reading({count:inst.state?.throngGauge ?? 0,cap:THRONG_CFG.gaugeCapacity},'Husk gauge on this skill');
    }
    const channel=view.spool && instanceChannel(inst);
    if (channel && instanceDelivery(inst).type==='projectile' && channel.release?.pulses!==false) {
      const cast=actor.casting?.inst===inst && actor.casting.mode==='channel' ? actor.casting : undefined;
      const bank=channelSpoolBank(actor,cast?.channelTime ?? 0,cast?.hitSpool ?? 0,skillContextTags(inst.def),instanceMods(inst));
      const hit=view.spool==='channelHitSpool';
      reading({count:Math.min(bank.cap,hit ? bank.hit : bank.time),cap:bank.cap},
        (hit?'Hit-fed':'Time-fed')+' windings · Combined bonus projectiles '+bank.total+' / '+bank.cap);
    }
    const host=inst.def.id;
    if (d.curseField?.mode==='follow' && instanceCurseField(inst)===d.curseField) {
      mark.lit=census('wornField',actor,host)>0;
      facts.push(mark.lit?'Curse field sustained':'Curse field off');
    }
    if (view.hasPopulation) addPopulationReadings(mark,view,actor,inst,census);
    if (d.gather && gatheredCast(inst)===d.gather) {
      addReading(mark,{counter:d.presentation?.counter,meter:{count:(actor.brims?.get(host)?.fill ?? 0)*100,cap:100},
        threshold:(d.gather.minRelease ?? .15)*100,readout:'Stored cast (%)'});
      mark.nativeReadout='brim';
    }
    if (d.shellGraft && instanceCastMode(inst)==='guard' && inst.def.guard && socketSpec(inst,'shellGraft')===d.shellGraft) {
      const shell=actor.shellGuard?.fromAura===host ? actor.shellGuard : undefined;
      const cap=shell?.max ?? d.shellGraft.max*actor.sheet.get('guardStrength',skillContextTags(inst.def),instanceMods(inst));
      addReading(mark,{counter:d.presentation?.counter,meter:{count:shell && !shell.broken ? shell.pool : 0,cap},
        readout:shell ? (shell.broken?'Rear carapace broken':'Rear carapace strength') : 'Rear carapace · guard lowered'});
    }
    if (roles.includes('condition')) {
      const active=view.gates.filter(m=>gateOpen(actor.sheet,m));
      if (view.gates.length) {
        mark.lit=active.length>0;
        const conditions=new Set(active.map(m=>m.when ?? (m.unless?'without '+m.unless:m.gauge)).filter(Boolean));
        facts.push(mark.lit?'Active · '+[...conditions].join(', '):'Condition unmet');
      }
    }
    if (mark.readout) facts.unshift(mark.readout);
    if (facts.length) mark.readout=facts.join(' · ');
    return [mark];
  });
}
/** Attribute a resolved stat-driven effect to its contributing skill-local modifiers. */
export function noteSupportStat(actor:Actor, inst:SkillInstance, stat:string, now:number, tags:ReadonlySet<SkillTag>=skillContextTags(inst)):string[]|undefined {
  const ids:string[]=[];
  for (const gem of hostSockets(inst)) {
    if (gem.forwardScale===0) continue;
    const applies=(m:SupportDef['mods'][number])=>m.stat===stat && m.value>0 &&
      (!m.tags || m.tags.every(t=>tags.has(t))) && gateOpen(actor.sheet,m);
    if (!viewOf(gem).mods.some(applies)) continue;
    ids.push(gem.def.id);
  }
  if (!ids.length) return;
  noteSupportFired(inst,ids,now);
  return [...new Set(ids)];
}
export function noteSupportFired(inst:SkillInstance, ids:readonly string[], now:number):void {
  const state=inst.state ??= {};
  // Expire prior pulses so repeated socket swaps cannot grow the history.
  const recent=state.supportFiredAt ??= Object.create(null);
  for (const id of Object.keys(recent)) if (now-recent[id]>=SUPPORT_PULSE_SECONDS) delete recent[id];
  for (const id of ids) recent[id]=now;
}
export type SupportPresentation = Record<string,SupportMark[]>;
export function copySupportPresentation(rows:SupportPresentation):SupportPresentation {
  return Object.fromEntries(Object.entries(rows).map(([id,marks])=>[id,marks.map(m=>{
    const copy={...m};
    if (m.meter) copy.meter={...m.meter};
    if (m.extraReadings) copy.extraReadings=m.extraReadings.map(r=>({...r,meter:{...r.meter}}));
    return copy;
  })]));
}
export function supportCaption(mark:SupportMark):string {
  const amount=mark.meter ? Number(mark.meter.count.toFixed(2))+' / '+Number(mark.meter.cap.toFixed(2)) : undefined;
  const destination=mark.serving ? (mark.roles ?? [mark.role]).map(r=>SUPPORT_ROLES[r]).join(' / ')
    : mark.routedTo==='crew'?'Companion casts':mark.routedTo==='component'?'Component skill':'Outside the host cast';
  return [mark.name+(mark.graft?' (graft)':''),destination,mark.readout,amount,...(mark.extraReadings ?? []).map(r=>r.readout+' · '+r.meter.count+' / '+r.meter.cap)].filter(Boolean).join(' · ');
}
