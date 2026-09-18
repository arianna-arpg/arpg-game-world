import {bootSimEngine,makeSimWorld} from '../src/sim/arena';
import {seedGlobalRandom} from '../src/sim/rng';
import {PASSIVE_NODES as N,PASSIVE_ADJACENCY as A} from '../src/data/passives';
import {CHOICE_GROUPS,choiceGroupOf,graftSourcesOf} from '../src/data/passiveChoices';
import {NATIVE_PASSIVE_PROCS,NATIVE_PASSIVE_SCHOOLS} from '../src/data/passiveNotables';
import {STAT_DEFS,mod} from '../src/engine/stats';
import {SKILLS} from '../src/data/skills';
import {makeSkillInstance} from '../src/engine/skills';
import {SAVE_COMPATIBILITY,isCurrentCharacterSave} from '../src/meta/saveCompatibility';
import {serializeCharacter} from '../src/meta/character';
import {auditPassiveRoutes} from '../src/data/passiveTopology';

let failures=0,checks=0;
function check(label:string,ok:boolean,detail=''){checks++;if(!ok)failures++;console.log(`${ok?'PASS':'FAIL'} ${label}${detail?' — '+detail:''}`);}
const near=(a:number,b:number)=>Math.abs(a-b)<1e-6;
const warnings:string[]=[];const originalWarn=console.warn;console.warn=(...args:unknown[])=>warnings.push(args.join(' '));
seedGlobalRandom(1234);bootSimEngine();console.warn=originalWarn;
const nodes=Object.values(N).filter(n=>!n.vocation),main=nodes.filter(n=>!n.realm);
const prep=nodes.filter(n=>n.id.startsWith('prep_')),entries=prep.filter(n=>n.id.endsWith('_entry'));
check('no passive-tree or choice-pool graft grants remain',nodes.every(n=>!n.graft)&&Object.values(CHOICE_GROUPS).every(g=>g.options.every(o=>!o.graft)));
check('all allocated passive powers expose zero graft sources',graftSourcesOf(new Set(nodes.map(n=>n.id)),{},N).length===0);
check('315 new useful small nodes lead into 102 capstones',prep.length===315&&entries.length===102&&prep.every(n=>n.kind==='small'&&!!n.mods?.length&&n.description.includes('Leads toward')));
check('ordinary passives substantially outnumber notables',main.filter(n=>n.kind==='small').length===1045&&main.filter(n=>n.kind==='notable').length===271);
check('54 native replacement powers have meaningful registered payloads',Object.values(NATIVE_PASSIVE_SCHOOLS).flat().length===54&&Object.values(NATIVE_PASSIVE_SCHOOLS).flat().every(p=>!!p.mods?.length&&!p.graft&&p.mods.every(m=>STAT_DEFS[m.stat]&&(!m.fromStat||STAT_DEFS[m.fromStat]))));
check('no new content validation warnings',!warnings.some(s=>/native_|prep_|route_|passive route/.test(s)),warnings.filter(s=>/native_|prep_|route_|passive route/.test(s)).join('; '));
for(const includeMenus of [false,true]){const audit=auditPassiveRoutes(N,includeMenus);check(`frequent forks survive investment clusters, menus ${includeMenus?'included':'excluded'}`,!audit.corridors.length&&!audit.unreachable.length);}
const radius={start:13,small:9,notable:14,keystone:17,attr:11,vocation:15,choice:15};
const obscured:string[]=[];
for(const n of prep)for(const id of A[n.id]) {
  const end=N[id];
  const dx=end.x-n.x,dy=end.y-n.y,lengthSq=dx*dx+dy*dy;
  for(const other of nodes) {
    if(other.realm!==n.realm||other.id===n.id||other.id===id)continue;
    const t=Math.max(0,Math.min(1,((other.x-n.x)*dx+(other.y-n.y)*dy)/(lengthSq||1)));
    if(Math.hypot(other.x-n.x-t*dx,other.y-n.y-t*dy)<radius[other.kind]+2)obscured.push(`${n.id} -> ${id} crosses ${other.id}`);
  }
}
check('investment connections do not cross unrelated node discs',obscured.length===0,obscured.slice(0,5).join('; '));
const w=makeSimWorld('warrior',1234);
for(const entry of entries) {
  const id=entry.id.slice(5,-6),n=N[id],a=`prep_${id}_a`,b=`prep_${id}_b`;
  const cluster=new Set([entry.id,a,b,`prep_${id}_junction`,id]);
  check(`${n.name}: no back door into its capstone`,new Set(A[id]).size===2&&A[id].every(x=>x===a||x===b)&&A[a].includes(entry.id)&&A[b].includes(entry.id));
  // Realm unlock/currency has its own probes. Check both entrance routes
  // through the actual ordinary-tree allocation gates for every main cluster.
  if(n.realm)continue;
  const outside=A[entry.id].find(x=>!cluster.has(x))!;
  for(const feeder of [a,b]) {
    w.meta.allocated=new Set(['str_start',outside]);w.meta.choices={};w.meta.grafts={};w.meta.passivePoints=3;w.recalcSeat(w.localSeat);
    const option=choiceGroupOf(n)?.options[0].id;
    const closed=!w.allocateNode(id,undefined,option);
    const entered=w.allocateNode(entry.id)&&w.meta.passivePoints===2;
    const stillClosed=!w.allocateNode(id,undefined,option)&&w.meta.passivePoints===2;
    const trained=w.allocateNode(feeder)&&w.meta.passivePoints===1&&(N[feeder].mods??[]).every(m=>w.player.sheet.getSourceMods('passives')?.includes(m));
    const bought=w.allocateNode(id,undefined,option)&&w.meta.passivePoints===0;
    check(`${n.name}: ${feeder.endsWith('_a')?'delivery':'sustain'} branch gives benefit before the third-point payoff`,closed&&entered&&stillClosed&&trained&&bought);
  }
}
// Standalone native event grants execute on the shared actor pipeline. Tests
// retain the actual chance cap and seed a successful attempt, never mock it.
for(const proc of NATIVE_PASSIVE_PROCS) {
  const sim=makeSimWorld('warrior',1234),p=sim.player;
  const node=nodes.find(n=>n.mods?.some(m=>m.stat===`proc_${proc.id}`))!;
  sim.meta.allocated=new Set(['str_start',node.id]);sim.recalcSeat(sim.localSeat);
  p.sheet.setSource('fixture',[mod('mana','override',100),mod('energyShield','override',100),mod('poise','override',100),mod('life','override',200),mod('lifeRegen','override',0),mod('lifeRegenPct','override',0),mod('wardGain','override',1)]);
  p.mana=20;p.es=20;p.poise=20;p.life=50;p.ward=0;
  const target=sim.createMonster('zombie',1,'enemy');target.brain=undefined;target.pos={x:p.pos.x+40,y:p.pos.y};sim.actors.push(target);
  const dash=makeSkillInstance(SKILLS.dash),cleave=makeSkillInstance(SKILLS.cleave);
  p.skills=[dash,cleave];p.cooldowns.set('dash',10);p.cooldowns.set('cleave',10);
  const inst=makeSkillInstance(Object.values(SKILLS).find(s=>proc.tags?.every(t=>s.tags.includes(t)))??SKILLS.cleave);
  if(proc.vs?.includes('chill'))target.applyStatus('chill',0,1,'fixture');
  if(proc.effect.type==='cleanse')p.applyStatus('poison',0,1,'fixture');
  const event={inst,tags:new Set(inst.def.tags),target,crit:!!proc.crit,condition:proc.condition,bracket:typeof proc.bracket==='number'?proc.bracket:undefined};
  const state=()=>JSON.stringify([p.mana,p.es,p.poise,p.life,p.ward,[...p.charges],[...p.buffs.keys()],p.statuses.map(s=>s.id),[...p.cooldowns],target.push,sim.flashes.length]);
  if(proc.when){p.sheet.setConditions([]);const before=state();sim.rollOwnProcs(p,proc.trigger,event);check(`${proc.name}: owner gate refuses`,state()===before);p.sheet.setConditions([proc.when]);}
  if(proc.tags){const before=state();sim.rollOwnProcs(p,proc.trigger,{...event,inst:undefined});check(`${proc.name}: absent skill context refuses`,state()===before);}
  if(proc.crit){const before=state();sim.rollOwnProcs(p,proc.trigger,{...event,crit:false});check(`${proc.name}: noncritical hits refuse`,state()===before);}
  if(proc.vs){const before=state();sim.rollOwnProcs(p,proc.trigger,{...event,target:undefined});check(`${proc.name}: missing victim refuses`,state()===before);}
  if(proc.bracket){const before=state();sim.rollOwnProcs(p,proc.trigger,{...event,bracket:.75});check(`${proc.name}: other poise brackets refuse`,state()===before);}
  if(proc.condition){const before=state();sim.rollOwnProcs(p,proc.trigger,{...event,condition:'fullLife'});check(`${proc.name}: other condition edges refuse`,state()===before);}
  const before=state();sim.rollOwnProcs(p,proc.trigger,{...event,depth:99});check(`${proc.name}: recursive depth is bounded`,state()===before);
  seedGlobalRandom(1234);sim.rollOwnProcs(p,proc.trigger,event);
  const fx=proc.effect;
  const fired=fx.type==='restore'?near(p[fx.resource],20+100*fx.pctMax!)
    :fx.type==='ward'?near(p.ward,200*fx.pctMaxLife!)
    :fx.type==='heal'?near(p.life,50+200*fx.pctMax!)
    :fx.type==='gainCharge'?p.charges.get(fx.charge)===fx.amount
    :fx.type==='buff'?p.buffs.has(fx.buff.id)
    :fx.type==='displace'?(target.push?.vx??0)<0
    :fx.type==='cleanse'?!p.statuses.some(s=>s.id==='poison')
    :fx.type==='cooldown'?near(p.cooldowns.get('dash')!,8)&&near(p.cooldowns.get('cleave')!,10)
    :fx.type==='delayedBurst'?sim.flashes.length>0:false;
  check(`${proc.name}: native effect executes`,fired);
  const after=state();sim.rollOwnProcs(p,proc.trigger,event);check(`${proc.name}: internal cooldown prevents repeated payout`,state()===after);
  if(fx.type==='delayedBurst') {
    for(let i=0;i<12;i++)sim.update(.05);
    check(`${proc.name}: delayed healing actually lands`,p.life>=50+fx.healAllies!.base);
  }
  sim.time+=proc.icd!+.01;sim.meta.allocated.delete(node.id);sim.recalcSeat(sim.localSeat);
  const removed=state();sim.rollOwnProcs(p,proc.trigger,event);check(`${proc.name}: removing the passive removes future triggers`,state()===removed);
}
// Exercise event-specific filters through actual play, not manual dispatch.
{
  const sim=makeSimWorld('warrior',1234),p=sim.player;
  sim.meta.allocated.add(nodes.find(n=>n.mods?.some(m=>m.stat==='proc_native_verse_reservoir'))!.id);sim.recalcSeat(sim.localSeat);
  p.sheet.setSource('isolate',[mod('manaRegen','override',0),mod('manaRegenPct','override',0)]);p.mana=0;
  p.gainCharge('fury',1,5);sim.update(.01);check('Verse Reservoir ignores actual Fury gains',p.mana===0);
  seedGlobalRandom(1234);p.gainCharge('verse',1,5);sim.update(.01);check('Verse Reservoir responds to actual Verse gains',p.mana>0);
}
{
  const sim=makeSimWorld('warrior',1234),p=sim.player;
  sim.meta.allocated.add(nodes.find(n=>n.mods?.some(m=>m.stat==='proc_native_venom_breath'))!.id);sim.recalcSeat(sim.localSeat);
  p.sheet.setSource('isolate',[mod('mana','override',300),mod('manaRegen','override',0),mod('manaRegenPct','override',0),mod('accuracy','flat',1e6)]);
  const nova=makeSkillInstance(SKILLS.poison_nova);p.skills[0]=nova;p.mana=150;
  const target=sim.createMonster('zombie',1,'enemy');target.brain=undefined;target.pos={x:p.pos.x+35,y:p.pos.y};target.sheet.setBase('life',10000);target.life=10000;sim.actors.push(target);
  seedGlobalRandom(1234);const cast=sim.useSkill(p,nova,target.pos);for(let i=0;i<35;i++)sim.update(.05);
  check('Venom Breath fires from a real poison application',cast&&target.statuses.some(s=>s.id==='poison')&&p.procReadyAt.has('native_venom_breath'));
}
const saved=serializeCharacter(w);
check('incompatible allocations reset runs while account version stays unchanged',SAVE_COMPATIBILITY.run===3&&SAVE_COMPATIBILITY.account===1&&isCurrentCharacterSave(saved)&&!isCurrentCharacterSave({...saved,schemaVersion:2}));
console.log(`Passive investment: ${checks} checks, ${failures} failures.`);
if(failures)process.exitCode=1;
