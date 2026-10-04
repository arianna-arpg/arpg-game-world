import {PROCS, type ProcDef, type ProcEffect} from '../data/procs';
import {SKILLS} from '../data/skills';
import {STATUS_DEFS} from './status';
import {compileItemMods} from './itemgen';
import {formatModLine, type ItemInstance} from './items';

/** Reference limits affect inspection only, never a proc's execution. */
export const PROC_REFERENCE_CFG = {maxEntries:6,maxCharacters:640,maxNameCharacters:80};
const n=(v:number)=>String(Math.round(v*100)/100), pct=(v:number)=>n(v*100)+'%';
const words=(s:string)=>s.replace(/_/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase();
const clipped=(s:string,max:number)=>{const chars=[...s];return chars.length>max?chars.slice(0,max-1).join('')+'…':s;};
const amount=(flat?:number,fraction?:number,pool='maximum life')=>
 [flat?n(flat):'',fraction?pct(fraction)+' of '+pool:''].filter(Boolean).join(' + ')||'0';
const scale=(base:number,perLevel:number)=>n(base)+(perLevel?' + '+n(perLevel)+' per character level':'');
const triggers:Record<ProcDef['trigger'],string>={
 hit:'When your hit lands',kill:'When you kill an enemy',collision:'When your knockback hits a wall',
 statusApply:'When you apply a status',block:'When you block',evade:'When you evade',
 esBreak:'When your energy shield breaks',esRechargeStart:'When energy shield starts recharging',esFilled:'When energy shield fills',
 poiseBreakDealt:"When you break an enemy's poise",poiseBroken:'When your poise breaks',poiseBracket:'When your poise crosses a threshold',
 poiseRearmed:'When your poise recovers',chargeGain:'When you gain a charge',buffGain:'When you gain a buff',orbPickup:'When you collect an orb',
 surface:'When you break a brittle surface',hurt:'When a hit hurts you',miss:'When an enemy evades your hit',foiled:'When an enemy blocks your hit',
 cast:'When you use a skill',condition:'When the required condition begins',pulse:'Periodically',minionDeath:'When your minion dies',
 heal:'When you are healed',lastGasp:'When last gasp saves you',struck:'When an unblocked hit connects with you',
};
/** Base payload, not predicted damage: defenses, proc power and live context still apply. */
export function procEffectReference(e:ProcEffect):string|null{
 switch(e.type){
  case 'extraHit':return 'Repeats the hit on its target at '+pct(e.damageScale)+' skill damage.';
  case 'explosion':return 'The hit explodes around its target at '+pct(e.damageScale)+' skill damage (radius '+n(e.radius)+').';
  case 'arc':return 'The hit chains to '+n(e.hops)+' fresh targets at '+pct(e.damageScale)+' skill damage (range '+n(e.range)+').';
  case 'displace':return (e.force<0?'Pulls the target toward you':'Pushes the target away')+' with '+n(Math.abs(e.force))+' force.';
  case 'collisionDamage':return 'A target stopped by a wall takes '+pct(e.damageScale)+' skill damage.';
  case 'gainCharge':return 'Grants '+n(e.amount)+' '+words(e.charge)+' charge'+(e.amount===1?'':'s')+' (up to '+n(e.max)+').';
  case 'buff':{
   const b=e.buff,mods=(b.mods??[]).map(m=>formatModLine(m,m.value));
   return (mods.join('; ')||'Grants '+words(b.id))+'. Lasts '+n(b.duration)+' seconds.'
    +(b.maxStacks?' Up to '+n(b.maxStacks)+' stacks.':'')
    +(b.consumeOn?' A stack is spent on '+words(b.consumeOn.on)+(b.consumeOn.tags?.length?' with '+b.consumeOn.tags.map(words).join(', ')+' skills':'')+'.':'');
  }
  case 'status':return 'Applies '+(STATUS_DEFS[e.status]?.label??words(e.status))+' to the target.';
  case 'heal':return 'Heals you for '+amount(e.flat,e.pctMax)+'.';
  case 'restore':return 'Restores '+amount(e.flat,e.pctMax,'maximum '+words(e.resource))+' '+(e.resource==='es'?'energy shield':words(e.resource))+'.'+(e.resetEsDelay?' Starts energy-shield recharge immediately.':'');
  case 'burst':return 'Deals '+scale(e.base,e.perLevel)+' '+e.damage+' damage around you (radius '+n(e.radius)+').';
  case 'delayedBurst':return 'After '+n(e.delay)+' seconds, a burst at '+(e.at==='self'?'your position':'the target')+' (radius '+n(e.radius)+')'
    +(e.damage?' deals '+scale(e.damage.base,e.damage.perLevel)+' '+e.damage.type+' damage':'')
    +(e.healAllies?(e.damage?' and':'')+' heals allies for '+scale(e.healAllies.base,e.healAllies.perLevel):'')+'.';
  case 'ward':return 'Grants ward equal to '+amount(e.flat,e.pctMaxLife)+'.';
  case 'fortify':return 'Grants endurance equal to '+amount(e.flat,e.pctMaxLife)+'.';
  case 'summon':return 'Summons a companion for '+n(e.duration)+' seconds (up to '+n(e.max)+').';
  case 'vent':return 'Creates '+words(e.bank)+' for '+n(e.duration)+' seconds (radius '+n(e.radius)+').';
  case 'kindle':return 'Creates a '+words(e.kind)+' lightwell.';
  default:return null; // Complex authored payloads may supply their own description.
 }
}
export function procReference(def:ProcDef):string|null{
 const effect=def.description??procEffectReference(def.effect);if(!effect)return null;
 const scope=[
  def.trigger==='pulse'?'Every '+n(def.every??0)+' seconds':def.trigger==='condition'?'When '+words(def.condition??'the required condition')+' begins':triggers[def.trigger],
  def.skills?.length?'only '+def.skills.map(id=>SKILLS[id]?.name??words(id)).join(', '):'',
  def.tags?.length?'with '+def.tags.map(words).join(', ')+' skills':'',
  def.when?'while '+words(def.when):'',def.unless?'unless '+words(def.unless):'',
  def.requireStatus?'requires '+[def.requireStatus].flat().map(s=>STATUS_DEFS[s]?.label??words(s)).join(' or '):'',
  def.requireBuff?'requires '+[def.requireBuff].flat().map(words).join(' or '):'',
  def.vs?.length?'against '+def.vs.map(words).join(', '):'',
  def.noCrit?'non-critical hits only':'',def.crit?'critical hits only':'',
  def.status?'status: '+[def.status].flat().map(s=>STATUS_DEFS[s]?.label??words(s)).join(' or '):'',
  def.charge?'charge: '+[def.charge].flat().map(words).join(' or '):'',
  def.buff?'buff: '+[def.buff].flat().map(words).join(' or '):'',
  def.orb?'orb: '+[def.orb].flat().map(words).join(' or '):'',
  def.bracket!==undefined?'poise threshold: '+[def.bracket].flat().map(pct).join(' or '):'',
  def.rollTop?'damage rolls in the top '+pct(def.rollTop):'',
  def.hitType?'dominant '+def.hitType+' damage':'',
  def.receivedTypes?.length?'incoming '+def.receivedTypes.join(', ')+' damage':'',
 ].filter(Boolean).join(' · ');
 return scope+'. '+effect+(def.icd?' Cooldown: '+n(def.icd)+' seconds.':'')+(def.oncePerCast?' Simultaneous hits share one trigger.':'')+(def.ppm?' Base rate: '+n(def.ppm)+' per minute.':'')+(def.minionCarry?' Also rolls when your minions hit.':'');
}
export function itemProcReferences(item:ItemInstance):{name:string;text:string}[]{
 const ids=new Set(compileItemMods(item).filter(m=>m.stat.startsWith('proc_')&&m.kind==='flat'&&m.value>0).map(m=>m.stat.slice(5)));
 return [...ids].flatMap(id=>{
  const def=PROCS[id],text=def&&procReference(def);
  return text?[{name:clipped(def.name,PROC_REFERENCE_CFG.maxNameCharacters),text:clipped(text,PROC_REFERENCE_CFG.maxCharacters)}]:[];
 }).slice(0,PROC_REFERENCE_CFG.maxEntries);
}
