import {bootSimEngine,makeSimWorld} from '../src/sim/arena';
import {seedGlobalRandom} from '../src/sim/rng';
import {PASSIVE_NODES as N,PASSIVE_ADJACENCY as A} from '../src/data/passives';
import {PASSIVE_DISCIPLINES,WEAVE_PROCS} from '../src/data/passiveWeave';
import {auditPassiveRoutes,passiveWalkingGraph} from '../src/data/passiveTopology';
import {validatePassiveLayout} from '../src/data/validatePassiveLayout';
import {STAT_DEFS,CONDITION_IDS,StatSheet,mod,type SkillTag,type Modifier} from '../src/engine/stats';
import {victimConditionKnown} from '../src/engine/victim';
import {makeSkillInstance,type SkillInstance} from '../src/engine/skills';
import {SKILLS} from '../src/data/skills';
import type {Actor} from '../src/engine/actor';
import {serializeCharacter,applySavedCharacter} from '../src/meta/character';
import {serializeSeatMeta,applySeatMeta} from '../src/net/snapshot';
import {SAVE_COMPATIBILITY} from '../src/meta/saveCompatibility';

let failures=0,checks=0;
function check(name:string,ok:boolean,detail=''){checks++;if(!ok)failures++;console.log(`${ok?'PASS':'FAIL'} ${name}${detail?' — '+detail:''}`);}
const near=(a:number,b:number)=>Math.abs(a-b)<1e-6;
const warnings:string[]=[];const originalWarn=console.warn;console.warn=(...args:unknown[])=>warnings.push(args.join(' '));
seedGlobalRandom(1234);bootSimEngine();console.warn=originalWarn;
const added=Object.values(N).filter(n=>n.id.startsWith('weave_')),caps=added.filter(n=>n.kind==='notable'),links=added.filter(n=>n.id.startsWith('weave_link_'));
check('18 disciplines expose 72 distinct native powers and 270 useful smalls',PASSIVE_DISCIPLINES.length===18&&caps.length===72&&added.length===342&&new Set(caps.map(n=>n.name)).size===72&&added.filter(n=>n.kind==='small').every(n=>!!n.mods?.length));
check('no grafts or forced menus in the expansion',added.every(n=>!n.graft&&!n.choice));
check('no weave content warnings',!warnings.some(w=>/weave_|passiveWeave/.test(w)),warnings.filter(w=>/weave_|passiveWeave/.test(w)).join('; '));
check('all stat, source, owner and victim conditions resolve',added.every(n=>(n.mods??[]).every(m=>STAT_DEFS[m.stat]&&(!m.fromStat||STAT_DEFS[m.fromStat])&&(!m.when||CONDITION_IDS.includes(m.when))&&(m.tags??[]).every(t=>!t.startsWith('vs:')||victimConditionKnown(t.slice(3))))));
check('all 18 new events have bounded clocks',WEAVE_PROCS.length===18&&WEAVE_PROCS.every(p=>(p.icd??0)>0));
const geo:string[]=[];validatePassiveLayout(s=>geo.push(s));check('whole-tree geometry and topology remain valid',geo.length===0,geo.slice(0,8).join('; '));
const baseNodes=Object.fromEntries(Object.entries(N).filter(([id])=>!id.startsWith('weave_')&&!id.startsWith('spec_'))),base=passiveWalkingGraph(baseNodes),full=passiveWalkingGraph(N);
function distances(graph:Record<string,string[]>,start:string){const result:Record<string,number>={[start]:0},q=[start];for(let i=0;i<q.length;i++)for(const id of graph[q[i]])if(result[id]===undefined){result[id]=result[q[i]]+1;q.push(id);}return result;}
for(const menus of [false,true]){const audit=auditPassiveRoutes(N,menus);check(`physical forks stay within two allocations, menus ${menus}`,!audit.corridors.length&&!audit.unreachable.length);}
const starts=Object.keys(base).filter(id=>N[id].kind==='start');let improved=0,pointsSaved=0;
for(const start of starts){const old=distances(base,start),now=distances(full,start);for(const end of starts.filter(end=>end>start)){if(now[end]<old[end])improved++;pointsSaved+=old[end]-now[end];}}
check('cross-class travel is shorter across multiple start pairs',improved>=9&&pointsSaved>18,`${improved}/36 pairs improved; ${pointsSaved} total points saved`);
const bridges=[...links,...added.filter(n=>n.id.endsWith('_entry'))];
check('126 two-port junctions connect old routes, rather than dead spurs',bridges.length===126&&bridges.every(n=>n.links.length===2&&n.links.every(id=>!!base[id]&&N[id].kind!=='notable'&&!id.match(/^prep_.*_(a|b|junction)$/))));
check('every junction shortens an existing route',bridges.every(n=>distances(base,n.links[0])[n.links[1]]>2));
const radius={start:13,small:9,notable:14,keystone:17,attr:11,vocation:15,choice:15};
const occupied=Object.values(N).filter(n=>!n.realm),obscured:string[]=[];
for(const n of added)for(const id of A[n.id]){const b=N[id],dx=b.x-n.x,dy=b.y-n.y,sq=dx*dx+dy*dy;for(const o of occupied){if(o.id===n.id||o.id===id)continue;const t=Math.max(0,Math.min(1,((o.x-n.x)*dx+(o.y-n.y)*dy)/(sq||1)));if(Math.hypot(o.x-n.x-t*dx,o.y-n.y-t*dy)<radius[o.kind]+2)obscured.push(`${n.id}/${id}/${o.id}`);}}
check('new connections never run through unrelated node discs',obscured.length===0,obscured.slice(0,4).join('; '));
const w=makeSimWorld('warrior',1234);
for(const cap of caps){
  const entry=N[cap.id+'_entry'],a=cap.id+'_a',b=cap.id+'_b';
  check(`${cap.name}: only supporting feeders reach the payoff`,A[cap.id].length===2&&A[cap.id].every(id=>id===a||id===b));
  for(const anchor of entry.links)for(const feeder of [a,b]){
    w.meta.allocated=new Set(['str_start',anchor]);w.meta.choices={};w.meta.passivePoints=3;w.recalcSeat(w.localSeat);
    const closed=!w.allocateNode(cap.id),enter=w.allocateNode(entry.id)&&!w.allocateNode(cap.id)&&w.meta.passivePoints===2;
    const train=w.allocateNode(feeder)&&w.meta.passivePoints===1&&N[feeder].mods!.every(m=>w.player.sheet.getSourceMods('passives')?.includes(m));
    const take=w.allocateNode(cap.id)&&w.meta.passivePoints===0;
    check(`${cap.name}: ${anchor} via ${feeder.endsWith('_a')?'A':'B'} pays three useful points`,closed&&enter&&train&&take);
  }
}
// Threshold modifiers must switch OFF again: source cache invalidation and
// editor serialization of gaugeAt both matter for these build identities.
for(const n of caps)for(const m of n.mods??[])if(m.gaugeAt!==undefined){
  const sheet=new StatSheet(),context=new Set<SkillTag>(m.tags??[]);sheet.setSource('passive',[m]);const floor=sheet.get(m.stat,context);
  sheet.setGauges([[m.gauge!,m.gaugeAt]]);const active=sheet.get(m.stat,context);
  sheet.setGauges([[m.gauge!,m.gaugeAt-1]]);check(`${n.name}: ${m.stat} enters and leaves its threshold`,active!==floor&&near(sheet.get(m.stat,context),floor));
}
type ProcRuntime={
  rollStatusProcs(a:Actor,i:SkillInstance,t:Actor,s:string,tags:Set<SkillTag>,mods:Modifier[],depth:number):void;
  rollGainProcs(a:Actor,ev:{kind:'orb';id:string;depth:number;n:number}):void;
  resolveHit(a:Actor,i:SkillInstance,t:Actor,mult?:number,depth?:number):void;
};
for(const proc of WEAVE_PROCS){
  const sim=makeSimWorld('warrior',1234),p=sim.player,rt=sim as unknown as ProcRuntime,node=caps.find(n=>n.mods?.some(m=>m.stat==='proc_'+proc.id))!;
  sim.meta.allocated=new Set(['str_start',node.id]);sim.recalcSeat(sim.localSeat);
  p.sheet.setSource('fixture',[mod('life','override',200),mod('mana','override',100),mod('energyShield','override',100),mod('poise','override',100),mod('endurance','override',100),mod('wardGain','override',1)]);
  p.life=50;p.mana=20;p.es=20;p.poise=20;p.endurance=0;p.ward=0;
  const target=sim.createMonster('zombie',1,'enemy');target.brain=undefined;target.pos={x:p.pos.x+40,y:p.pos.y};sim.actors.push(target);
  if(proc.vs?.includes('airborne'))target.flying=true;
  if(proc.vs?.includes('wet'))target.applyStatus('soaked',0,1,'fixture');
  if(proc.effect.type==='cleanse')p.applyStatus('stunned',0,1,'fixture');
  const skill=makeSkillInstance(Object.values(SKILLS).find(s=>proc.tags?.every(t=>s.tags.includes(t)))??SKILLS.cleave);
  const summon=makeSkillInstance(SKILLS.summon_skeleton);p.skills=[skill,summon];p.cooldowns.set(summon.def.id,10);
  const opts={inst:skill,tags:new Set(skill.def.tags),target,crit:false,condition:proc.condition,receivedAmounts:proc.receivedTypes?{fire:1}:undefined};
  const state=()=>JSON.stringify([p.life,p.mana,p.es,p.poise,p.endurance,p.ward,[...p.charges],[...p.buffs.keys()],p.statuses.map(s=>s.id),[...p.cooldowns]]);
  const fire=(depth=0)=>{if(proc.status)rt.rollStatusProcs(p,skill,target,'bleed',opts.tags,[],depth);else if(proc.orb)rt.rollGainProcs(p,{kind:'orb',id:'life',n:1,depth});else sim.rollOwnProcs(p,proc.trigger,{...opts,depth});};
  const unchanged=(label:string,act:()=>void)=>{const before=state();act();check(`${proc.name}: ${label}`,state()===before);};
  if(proc.when){p.sheet.setConditions([]);unchanged('owner condition refuses',()=>fire());p.sheet.setConditions([proc.when]);}
  if(proc.tags)unchanged('absent skill context refuses',()=>sim.rollOwnProcs(p,proc.trigger,{...opts,inst:undefined}));
  if(proc.vs)unchanged('absent victim refuses',()=>sim.rollOwnProcs(p,proc.trigger,{...opts,target:undefined}));
  if(proc.noCrit)unchanged('critical hits refuse',()=>sim.rollOwnProcs(p,proc.trigger,{...opts,crit:true}));
  if(proc.condition)unchanged('other condition edge refuses',()=>sim.rollOwnProcs(p,proc.trigger,{...opts,condition:'fullLife'}));
  if(proc.receivedTypes)unchanged('other incoming type refuses',()=>sim.rollOwnProcs(p,proc.trigger,{...opts,receivedAmounts:{cold:1}}));
  if(proc.status)unchanged('wrong status refuses',()=>rt.rollStatusProcs(p,skill,target,'poison',opts.tags,[],0));
  if(proc.orb)unchanged('wrong orb refuses',()=>rt.rollGainProcs(p,{kind:'orb',id:'mana',n:1,depth:0}));
  unchanged('recursive depth is bounded',()=>fire(99));
  seedGlobalRandom(1234);fire();const fx=proc.effect;
  const fired=fx.type==='restore'?near(p[fx.resource],20+100*fx.pctMax!)
    :fx.type==='ward'?near(p.ward,200*fx.pctMaxLife!)
    :fx.type==='heal'?near(p.life,50+fx.flat!)
    :fx.type==='gainCharge'?p.charges.get(fx.charge)===fx.amount
    :fx.type==='fortify'?near(p.endurance,fx.flat!)
    :fx.type==='buff'?p.buffs.has(fx.buff.id)
    :fx.type==='cleanse'?!p.statuses.some(s=>s.id==='stunned')
    :fx.type==='cooldown'?near(p.cooldowns.get(summon.def.id)!,9.2):false;
  check(`${proc.name}: native effect actually executes`,fired);
  unchanged('internal cooldown prevents another payout',()=>fire());
  if(fx.type==='buff'&&fx.buff.consumeOn){
    p.spendBuffs('hit',['flask']);check(`${proc.name}: unrelated hits retain preparation`,p.buffs.has(fx.buff.id));
    p.spendBuffs('hit',fx.buff.consumeOn.tags);check(`${proc.name}: matching hit consumes preparation`,!p.buffs.has(fx.buff.id));
  }
  sim.time+=proc.icd!+.01;sim.meta.allocated.delete(node.id);sim.recalcSeat(sim.localSeat);unchanged('removing the passive removes future triggers',()=>fire());
}
// Actual minion contacts enter the owner's carried-proc lane, not a manual
// owner event. Both the refill and its attribution must land on the keeper.
{
  const sim=makeSimWorld('warrior',1234),p=sim.player,rt=sim as unknown as ProcRuntime;
  sim.meta.allocated.add('weave_commander_delegated_breath');sim.recalcSeat(sim.localSeat);
  p.sheet.setSource('fixture',[mod('mana','override',100)]);p.mana=20;
  const summon=makeSkillInstance(SKILLS.summon_skeleton),pet=sim.createMonster('zombie',1,'player',p);
  pet.summonInst=summon;pet.sourceSkillId=summon.def.id;pet.brain=undefined;pet.sheet.setSource('fixture',[mod('accuracy','flat',1e6)]);sim.actors.push(pet);
  const victim=sim.createMonster('zombie',1,'enemy');victim.brain=undefined;victim.sheet.setSource('fixture',[mod('life','override',100000),mod('evasion','override',0)]);victim.life=victim.maxLife();sim.actors.push(victim);
  const blow=makeSkillInstance(SKILLS.cleave);seedGlobalRandom(1234);
  for(let i=0;i<8&&!p.procReadyAt.has('weave_delegated_breath');i++)rt.resolveHit(pet,blow,victim);
  check('a real summon hit restores its keeper, with the keeper owning the clock',near(p.mana,22)&&p.procReadyAt.has('weave_delegated_breath')&&!pet.procReadyAt.has('weave_delegated_breath'));
}
{
  const sim=makeSimWorld('warrior',1234),p=sim.player;
  sim.meta.allocated.add('weave_alchemist_red_glass');sim.recalcSeat(sim.localSeat);p.ward=0;
  sim.orbs.push({pos:{...p.pos},kind:'mana',amount:1,bob:0,life:2});sim.update(.05);sim.update(.05);
  check('actual wrong-kind orb pickup grants no shelter',p.ward===0);
  seedGlobalRandom(1234);sim.orbs.push({pos:{...p.pos},kind:'life',amount:1,bob:0,life:2});sim.update(.05);sim.update(.05);
  check('actual life-orb pickup grants shelter',p.ward>0&&p.procReadyAt.has('weave_red_glass'));
}
for(const id of ['weave_shieldweaver_ward_distiller','weave_chorus_quiet_dominion']){
  const sim=makeSimWorld('warrior',1234),p=sim.player,n=N[id];sim.meta.allocated.add(id);sim.recalcSeat(sim.localSeat);
  p.sheet.setSource('fixture',[mod('manaRegen','override',0),mod('manaRegenPct','override',0),mod('esRechargeRate','override',.01),mod('wardDecay','override',0)]);
  p.mana=p.maxMana();p.ward=n.conduit!.from==='ward'?50:0;p.es=0;p.esDelay=100;
  const mana=p.mana,ward=p.ward;sim.update(.05);
  check(`${n.name}: actual source drains and destination fills`,n.conduit!.from==='ward'?p.ward<ward&&p.es>0:p.mana<mana&&p.ward>0);
  if(n.conduit!.from==='mana'){p.mana=p.maxMana()*.7;const bank=p.mana;sim.update(.05);check('Quiet Dominion stops at its reserve floor',near(p.mana,bank));}
  sim.meta.allocated.delete(id);sim.recalcSeat(sim.localSeat);check(`${n.name}: removal detaches the pump`,!p.wornConduits?.length);
}
{
  const banks:number[]=[];
  for(const hz of [30,60,120]){
    const sim=makeSimWorld('warrior',1234),p=sim.player;sim.meta.allocated.add('weave_chorus_quiet_dominion');sim.recalcSeat(sim.localSeat);
    p.sheet.setSource('fixture',[mod('manaRegen','override',0),mod('manaRegenPct','override',0),mod('wardDecay','override',0),mod('wardGain','override',1)]);p.mana=p.maxMana();p.ward=0;
    for(let i=0;i<hz*2;i++)sim.update(1/hz);banks.push(p.ward);
    // Three points fed minus the shared two-point minimum decay each second.
    check(`continuous ward survives at ${hz} Hz without fractional losses`,near(p.ward,2),String(p.ward));
  }
  check('continuous ward accumulation is independent of frame rate',Math.max(...banks)-Math.min(...banks)<1e-6);
}
// Persistent and network state carry the new nodes and conduits unchanged.
w.meta.allocated=new Set(['str_start',...added.map(n=>n.id)]);w.recalcSeat(w.localSeat);
const saved=serializeCharacter(w),restored=makeSimWorld('warrior',1234);applySavedCharacter(restored,saved);
check('all new allocations survive save reconstruction',added.every(n=>restored.meta.allocated.has(n.id)));
const peer=makeSimWorld('warrior',1234);applySeatMeta(peer,peer.localSeat,serializeSeatMeta(w.localSeat));peer.recalcSeat(peer.localSeat);
check('all new allocations survive co-op reconstruction',added.every(n=>peer.meta.allocated.has(n.id)));
check('both new conduits enter the shared actor lane',caps.filter(n=>n.conduit).length===2&&caps.filter(n=>n.conduit).every(n=>w.player.wornConduits?.includes(n.conduit!)));
check('additive expansion preserves run and account compatibility',SAVE_COMPATIBILITY.run===3&&SAVE_COMPATIBILITY.account===1);
console.log(`Passive weave: ${checks} checks, ${failures} failures.`);if(failures)process.exitCode=1;
