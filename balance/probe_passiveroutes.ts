import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { PASSIVE_NODES as N, type PassiveNode } from '../src/data/passives';
import { auditPassiveRoutes } from '../src/data/passiveTopology';
import { validatePassiveLayout } from '../src/data/validatePassiveLayout';
import { CROSSROADS_GROUPS } from '../src/data/passiveCrossroads';
import { ROUTE_ACCENTS, ROUTE_PROCS } from '../src/data/passiveRoutes';
import { CLASSES } from '../src/data/classes';
import { STAT_DEFS, mod } from '../src/engine/stats';
import { SKILLS } from '../src/data/skills';
import { makeSkillInstance } from '../src/engine/skills';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { serializeSeatMeta, applySeatMeta } from '../src/net/snapshot';
import type { World } from '../src/engine/world';

let failed=0,checks=0;
function check(label:string,ok:boolean,detail='') { checks++;if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} ${label}${detail?' — '+detail:''}`); }
const near=(a:number,b:number)=>Math.abs(a-b)<1e-6;
const warnings:string[]=[];
const warn=console.warn;console.warn=(...s:unknown[])=>warnings.push(s.join(' '));
seedGlobalRandom(0xf042);bootSimEngine();console.warn=warn;
const added=Object.values(N).filter(n=>n.id.startsWith('route_'));
const geometry:string[]=[];validatePassiveLayout(s=>geometry.push(s));
check('all geometry and route checks pass, including legacy nodes',geometry.length===0,geometry.join('; '));
check('no new content boot warnings',!warnings.some(s=>/route_|conduit|passive route/.test(s)),warnings.filter(s=>/route_|conduit|passive route/.test(s)).join('; '));
check('379 visible passives, with no menu masquerading as a route',added.length===379&&added.every(n=>!n.choice));
check('54 new interactions, including 18 bounded event powers',Object.values(ROUTE_ACCENTS).flat().length===54&&ROUTE_PROCS.length===18&&ROUTE_PROCS.every(p=>(p.icd??0)>0));
check('all modifier endpoints registered',added.every(n=>(n.mods??[]).every(m=>STAT_DEFS[m.stat]&&(!m.fromStat||STAT_DEFS[m.fromStat]))));
for(const choices of [false,true]) {
  const audit=auditPassiveRoutes(N,choices);
  check(`fork within two allocations in both directions, menus ${choices?'included':'excluded'}`,!audit.corridors.length&&!audit.unreachable.length,`${audit.nodes} nodes, ${audit.forks} forks`);
}
// Regression fixtures: unique neighbors, not repeated links, define a fork.
const fixture=(rows:Record<string,string[]>):Record<string,PassiveNode>=>Object.fromEntries(Object.entries(rows).map(([id,links])=>[id,{id,name:id,description:'',kind:id==='a'?'start':'small',x:0,y:0,links}]));
check('audit catches long chains',auditPassiveRoutes(fixture({a:['b'],b:['c'],c:['d'],d:[]})).corridors.length===1);
check('audit catches a closed corridor',auditPassiveRoutes(fixture({a:['b'],b:['c'],c:['a']})).corridors.length===3);
check('duplicate declarations and self-links cannot fake forks',auditPassiveRoutes(fixture({a:['b','b'],b:['a','c','b'],c:['d'],d:[]})).corridors.length===1);
check('a real second route satisfies the contract',auditPassiveRoutes(fixture({a:['b'],b:['c','e'],c:['d'],d:[],e:[]})).corridors.length===0);

function reset(w:World,start='str_start',points=2) {
  w.meta.allocated=new Set([start]);w.meta.choices={};w.meta.grafts={};w.meta.passivePoints=points;w.recalcSeat(w.localSeat);
}
const graph=auditPassiveRoutes(N).graph;
let pairs=0;
for(const start of new Set(CLASSES.map(c=>c.startNode))) {
  const w=makeSimWorld(CLASSES.find(c=>c.startNode===start)!.id,0xf042);
  const entry=graph[start].filter(id=>id.startsWith('route_'));
  check(`${start} has at least three distinct visible entrances`,entry.length>=3&&new Set(entry.map(id=>N[id].name)).size>=3);
  let legal=true;
  for(const first of graph[start])for(const second of graph[first].filter(id=>id!==start)) {
    reset(w,start);
    legal&&=w.allocateNode(first)&&w.allocateNode(second)&&w.meta.passivePoints===0&&Object.keys(w.meta.choices).length===0;
    pairs++;
  }
  check(`${start}: every ordinary two-point walk spends exactly two points without a menu`,legal);
}
for(const c of CLASSES) {
  const w=makeSimWorld(c.id,0xf042);w.meta.passivePoints=2;
  const first=graph[c.startNode].find(id=>id.startsWith('route_'))!;
  const next=graph[first].filter(id=>!w.meta.allocated.has(id));
  check(`${c.name}: real starting allocation immediately opens at least two onward routes`,next.length>=2&&w.allocateNode(first)&&w.allocateNode(next[0])&&w.meta.passivePoints===0);
}
// Every ordinary node is reachable through actual allocation, without choosing
// a deal. This tests the game gates as well as the abstract graph.
const w=makeSimWorld('warrior',0xf042);reset(w,'str_start',Object.keys(graph).length-1);
const queue=['str_start'],seen=new Set(queue);let allocated=true;
for(let i=0;i<queue.length;i++)for(const id of graph[queue[i]])if(!seen.has(id)) {
  seen.add(id);queue.push(id);allocated&&=w.allocateNode(id);
}
check('entire ordinary tree allocates through the real shared gates',allocated&&w.meta.passivePoints===0&&seen.size===Object.keys(graph).length);
check('every visible payload reaches the passive source',added.every(n=>(n.mods??[]).every(m=>w.player.sheet.getSourceMods('passives')?.includes(m))));
check('all plain-node conduits join the actor conversion lane',added.filter(n=>n.conduit).every(n=>w.player.wornConduits?.includes(n.conduit!)));
check('ordinary routes grant native powers, never grafts',added.every(n=>!n.graft));
// Every original option is now also exposed as a literal node, preserving its
// exact payload rather than replacing a mechanic with an approximation.
const payload=(p:{name:string;description:string;mods?:unknown;graft?:unknown;conduit?:unknown})=>JSON.stringify([p.name,p.description,p.mods??null,p.graft??null,p.conduit??null]);
check('all 138 current option effects also exist as visible nodes',CROSSROADS_GROUPS.every(g=>g.options.every(o=>added.some(n=>payload(n)===payload(o)))));

// Exercise all event definitions through the shared runtime dispatcher with
// armed/unarmed, gate, cooldown, tag-scoped consumption and depth controls.
for(const proc of ROUTE_PROCS) {
  const sim=makeSimWorld('warrior',0xf043),p=sim.player;
  const node=added.find(n=>n.mods?.some(m=>m.stat===`proc_${proc.id}`))!;
  reset(sim);sim.meta.allocated.add(node.id);sim.recalcSeat(sim.localSeat);
  p.sheet.setSource('rig',[mod('mana','override',100),mod('es','override',100),mod('poise','override',100),mod('wardGain','override',1)]);
  p.mana=20;p.es=20;p.poise=20;p.ward=0;
  const dash=makeSkillInstance(SKILLS.dash),cleave=makeSkillInstance(SKILLS.cleave);
  const summon=makeSkillInstance(Object.values(SKILLS).find(s=>s.tags.includes('summon'))!);
  p.skills=[dash,cleave,summon];p.cooldowns.set('dash',10);p.cooldowns.set('cleave',10);p.cooldowns.set(summon.def.id,10);
  const def=Object.values(SKILLS).find(s=>proc.tags?.every(t=>s.tags.includes(t)))??SKILLS.cleave;
  const inst=makeSkillInstance(def);
  const target=sim.createMonster('zombie',1,'enemy');target.brain=undefined;
  p.pos={x:100,y:100};target.pos={x:140,y:100};target.facing=0;
  if(proc.vs?.includes('hardCC'))target.applyStatus('stun',0,1,'rig');
  const event={inst,tags:new Set(inst.def.tags),target};
  const read=()=>JSON.stringify([p.mana,p.es,p.poise,p.ward,[...p.cooldowns],[...p.buffs.keys()]]);
  if(proc.when) {
    p.sheet.setConditions([]);const before=read();sim.rollOwnProcs(p,proc.trigger,event);
    check(`${proc.name}: closed owner gate`,read()===before);
    p.sheet.setConditions([proc.when]);
  }
  if(proc.tags) {
    const before=read();sim.rollOwnProcs(p,proc.trigger,{...event,inst:cleave});
    check(`${proc.name}: wrong skill tags refuse the effect`,read()===before);
  }
  if(proc.vs) {
    const before=read();sim.rollOwnProcs(p,proc.trigger,{inst});
    check(`${proc.name}: no qualifying victim refuses the effect`,read()===before);
  }
  const unspent=read();sim.rollOwnProcs(p,proc.trigger,{...event,depth:99});
  check(`${proc.name}: recursive proc depth is bounded`,read()===unspent);
  seedGlobalRandom(1234);sim.rollOwnProcs(p,proc.trigger,event);
  const fx=proc.effect;
  const landed=fx.type==='buff'?p.buffs.has(fx.buff.id)
    :fx.type==='cooldown'?near(p.cooldowns.get(fx.tags?.includes('summon')?summon.def.id:'dash')!,10-fx.seconds!)&&near(p.cooldowns.get('cleave')!,10)
    :fx.type==='ward'?near(p.ward,p.maxLife()*fx.pctMaxLife!)
    :fx.type==='restore'?near(p[fx.resource],20+100*fx.pctMax!):false;
  check(`${proc.name}: exact live effect from an allocated passive`,landed,read());
  const after=read();sim.rollOwnProcs(p,proc.trigger,event);
  check(`${proc.name}: repeated event respects its cooldown`,read()===after);
  if(fx.type==='buff') {
    p.spendBuffs(fx.buff.consumeOn!.on,['melee']);
    check(`${proc.name}: unrelated action preserves preparation`,p.buffs.has(fx.buff.id));
    p.spendBuffs(fx.buff.consumeOn!.on,fx.buff.consumeOn!.tags);
    check(`${proc.name}: matching action consumes preparation`,!p.buffs.has(fx.buff.id));
  }
  sim.time+=proc.icd!+.01;sim.meta.allocated.delete(node.id);sim.recalcSeat(sim.localSeat);
  const removed=read();sim.rollOwnProcs(p,proc.trigger,event);
  check(`${proc.name}: removed passive cannot trigger`,read()===removed);
}

// Real play seams: no direct dispatch calls for these compound loops.
{
  const sim=makeSimWorld('warrior',0xf044),p=sim.player;reset(sim);
  for(const stat of ['proc_route_heal_clock','proc_route_funeral_clock','proc_route_move_needle'])sim.meta.allocated.add(added.find(n=>n.mods?.some(m=>m.stat===stat))!.id);
  sim.recalcSeat(sim.localSeat);
  const dash=makeSkillInstance(SKILLS.dash),summon=makeSkillInstance(SKILLS.raise_zombie??Object.values(SKILLS).find(s=>s.tags.includes('summon'))!);
  p.skills=[dash,summon];p.cooldowns.set('dash',10);p.life=p.maxLife()/2;p.healBy(5);sim.update(.01);
  check('actual healing recovers movement cooldown',near(p.cooldowns.get('dash')!,9.69));
  p.cooldowns.set(summon.def.id,10);
  const pet=sim.createMonster('zombie',1,'player',p);sim.actors.push(pet);sim.kill(pet);
  check('actual summon death recovers summon cooldown',near(p.cooldowns.get(summon.def.id)!,9.6));
  p.cooldowns.delete('dash');p.mana=p.maxMana();const used=sim.useSkill(p,dash,{x:p.pos.x+80,y:p.pos.y});
  for(let i=0;i<8;i++)sim.update(.05);
  check('actual movement cast prepares the projectile follow-up',used&&p.buffs.has('route_move_needle'));
}
{
  const node=added.find(n=>n.conduit?.from==='mana'&&n.conduit.to==='poise')!;
  reset(w);w.meta.allocated.add(node.id);w.recalcSeat(w.localSeat);
  w.player.sheet.setSource('pumpRig',[mod('manaRegen','override',0),mod('manaRegenPct','override',0),mod('poiseRegenPct','override',0)]);
  w.player.mana=w.player.maxMana();w.player.poise=1;
  const mana=w.player.mana,poise=w.player.poise;w.update(.05);
  check('plain passive conduit really spends mana to recover poise',w.player.mana<mana&&w.player.poise>poise);
  const saved=serializeCharacter(w),wire=serializeSeatMeta(w.localSeat);
  const loaded=makeSimWorld('warrior',0xf045);applySavedCharacter(loaded,saved);
  check('save restores the visible passive and derives its conduit',loaded.meta.allocated.has(node.id)&&loaded.player.wornConduits?.includes(node.conduit!)===true);
  const remote=makeSimWorld('warrior',0xf046);applySeatMeta(remote,remote.localSeat,wire);remote.recalcSeat(remote.localSeat);
  check('co-op metadata restores the same plain passive conduit',remote.meta.allocated.has(node.id)&&remote.player.wornConduits?.includes(node.conduit!)===true);
  reset(w);check('rebuild removes a discarded plain conduit',!w.player.wornConduits);
}
console.log(`Passive routes: ${checks} checks, ${pairs} two-point walks, ${failed} failures.`);
if(failed)process.exitCode=1;
