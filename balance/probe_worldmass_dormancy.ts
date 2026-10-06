import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { MassDormancy, captureNativeActorState, massDormancyPins, nativeDormancyRefusal,
  restoreNativeActorState, type MassDormancySave } from '../src/worldmass/dormancy';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import type { Actor } from '../src/engine/actor';
import { applyEncounterGroup } from '../src/engine/encounterGroups';
import { ENCOUNTER_GROUPS } from '../src/data/encounterGroups';

const undo=seedGlobalRandom(43779);
const policy={source:'probe/native-dormancy',wakeRadius:1000,sleepRadius:2200,quietSeconds:8};
const w=makeSimWorld('warrior',43779),owned=new Map<string,Actor>(),m=new MassDormancy(policy);
w.time=100;
const make=(id:string,x:number)=>{
  const a=w.createMonster('gnoll_prowler',3,'enemy');a.fromZoneGen=true;a.pos={x,y:40};a.aiAnchor={...a.pos};
  a.fillResources();owned.set(id,a);w.actors.push(a);return a;
};
const rows:{id:string;a:Actor;life:number;mana:number;es:number}[]=[];
// More than one old 96-body budget must be encountered without defeating any
// of it. The resident array stays local while ownership and wounds stay exact.
for(let page=0;page<30;page++){
  w.player.pos={x:page*3200,y:0};m.update(w,owned);
  for(let slot=0;slot<6;slot++){
    const id='page:'+page+':'+slot,a=make(id,w.player.pos.x+slot*55);
    a.life*=.4+slot*.07;a.mana*=.3;a.es=slot;a.essenceSpilled=slot;a.spillBank=slot*.2;
    a.lootSack=[];a.evadeEntropy=.39;a.aiSign=slot%2?1:-1;
    rows.push({id,a,life:a.life,mana:a.mana,es:a.es});
  }
  assert.ok(m.activeCount(owned)<=12,'walking forward releases active population');
}
assert.equal(owned.size,180);assert.ok(rows.slice(0,174).every(r=>m.isSleeping(r.a)));
assert.equal(w.kills,0,'retirement never routes through the kill/reward artery');
for(let page=0;page<30;page++){
  w.player.pos={x:page*3200,y:0};m.update(w,owned);
  for(const row of rows.slice(page*6,page*6+6)){
    assert.ok(w.actors.includes(row.a),'return mounts the identical native body');
    assert.equal(owned.get(row.id),row.a);assert.equal(row.a.life,row.life);assert.equal(row.a.mana,row.mana);
    assert.equal(row.a.es,row.es);assert.equal(row.a.evadeEntropy,.39);
  }
  assert.ok(m.activeCount(owned)<=12);
}
console.log('PASS 180 wounded native identities across 30 distant trips and every return; no population reset or reward');

w.player.pos={x:200000,y:0};m.update(w,owned);
assert.ok(rows.every(r=>m.isSleeping(r.a)));
const saved:MassDormancySave=JSON.parse(JSON.stringify(m.snapshot(owned,w)));
assert.equal(saved.actors.length,180);assert.equal(saved.unsupported.length,0);
const next=makeSimWorld('warrior',889),again=new Map<string,Actor>(),replay=new MassDormancy(policy);next.time=w.time;
// Allocate another body first so saved IDs cannot coincidentally match.
next.createMonster('gnoll_prowler',1,'enemy');
for(const row of rows){const a=next.createMonster('gnoll_prowler',3,'enemy');a.fromZoneGen=true;again.set(row.id,a);next.actors.push(a);}
replay.restore(saved,again,next);
for(const row of rows){const a=again.get(row.id)!;assert.equal(a.life,row.life);assert.equal(a.mana,row.mana);assert.equal(a.es,row.es);
 assert.equal(a.essenceSpilled,row.a.essenceSpilled);assert.equal(a.spillBank,row.a.spillBank);assert.equal(a.evadeEntropy,.39);
 assert.ok(a.sheet.get('life')>0);assert.equal(a.since.constructor,Float64Array);assert.equal(a.carrionStallD,Infinity);
 assert.equal(replay.isSleeping(a),m.isSleeping(row.a));assert.equal(typeof a.statusRelay,'function');}
next.player.pos={...rows[0].a.pos};replay.update(next,again);assert.ok(next.actors.includes(again.get(rows[0].id)!));
console.log('PASS JSON Continue restores whole native resources, loot banks, sheets, typed recency clocks and dormant ownership');

// Native actions remain authoritative: an unresolved status, cast or emission
// must stay active, even far away. Do not manufacture a save-friendly idle foe.
const focus=make('dependency',-10000);w.player.pos={x:100000,y:0};
focus.statuses.push({id:'burn',remaining:9,total:9,stacks:1,dps:7,sourceName:'probe'});
assert.match(nativeDormancyRefusal(focus,w,8)!, /live native timer/);

m.update(w,owned);assert.ok(w.actors.includes(focus));assert.equal(focus.statuses[0].remaining,9);
const statusState=captureNativeActorState(focus)!;
const twin=w.createMonster('gnoll_prowler',3,'enemy');
restoreNativeActorState(twin,JSON.parse(JSON.stringify(statusState)),new Map([[focus.id,twin]]));
assert.deepEqual(twin.statuses,focus.statuses,'the actor codec preserves active native state even though streaming pins it');
focus.statuses=[];
const dependent=w.createMonster('gnoll_prowler',1,'player');dependent.owner=focus;dependent.pos={x:100000,y:100};w.actors.push(dependent);
assert.ok(massDormancyPins(w,owned).has(focus));m.update(w,owned);assert.ok(w.actors.includes(focus));
w.actors=w.actors.filter(a=>a!==dependent);
w.pendingFollowUps.push({caster:focus,inst:focus.skills.find(Boolean)!,aim:{x:0,y:0},timer:2});
assert.ok(massDormancyPins(w,owned).has(focus));m.update(w,owned);assert.ok(w.actors.includes(focus));
w.pendingFollowUps=[];focus.procReadyAt.set('probe',w.time+60);m.update(w,owned);assert.ok(w.actors.includes(focus));
focus.procReadyAt.clear();focus.aiRuleState=[{until:w.time+15,readyAt:w.time+20,fired:false}];m.update(w,owned);assert.ok(w.actors.includes(focus));
focus.aiRuleState=undefined;focus.venting.add('probe');m.update(w,owned);assert.ok(w.actors.includes(focus));
focus.venting.clear();const stateful=focus.skills.find(Boolean)!;stateful.state={stackN:2,stackT:9};
m.update(w,owned);assert.ok(w.actors.includes(focus));stateful.state=undefined;
focus.garrison={slotId:'feature/slot'};
assert.match(nativeDormancyRefusal(focus,w,8)!,/garrison/);
assert.match(nativeDormancyRefusal(focus,w,8,undefined,{garrisonSlot:'foreign/slot'})!,/garrison/);
assert.equal(nativeDormancyRefusal(focus,w,8,undefined,{garrisonSlot:'feature/slot'}),null);
focus.garrison.pending=true;assert.match(nativeDormancyRefusal(focus,w,8,undefined,{garrisonSlot:'feature/slot'})!,/garrison/);
focus.garrison=undefined;m.update(w,owned);assert.ok(m.isSleeping(focus));
console.log('PASS native status, owned summon and pending emitted attack pin distant actors until dependencies finish');

const grouped=makeSimWorld('warrior',554),groupOwned=new Map<string,Actor>(),gm=new MassDormancy(policy);grouped.time=100;
const recipe=ENCOUNTER_GROUPS.gnoll_road_foragers,squad=grouped.nextSquadId();
for(const [i,seat] of recipe.members.entries()){
 const a=grouped.createMonster(seat.monster!,3,'enemy');a.fromZoneGen=true;a.pos={x:20000+i*60,y:0};
 applyEncounterGroup(a,{id:squad,recipe:recipe.id,slot:seat.slot});assert.ok(a.encounterGroup);
 groupOwned.set(seat.slot,a);grouped.actors.push(a);
}
const leader=groupOwned.get('leader')!,hunter=groupOwned.get('hunter')!;
hunter.aggroed=true;gm.update(grouped,groupOwned);assert.equal(gm.activeCount(groupOwned),3,'one engagement retains the whole formation');
hunter.aggroed=false;gm.update(grouped,groupOwned);assert.equal(gm.activeCount(groupOwned),0);
grouped.player.pos={...leader.pos};gm.update(grouped,groupOwned);assert.equal(gm.activeCount(groupOwned),3);
grouped.player.pos={x:100000,y:0};gm.update(grouped,groupOwned);
const gs=JSON.parse(JSON.stringify(gm.snapshot(groupOwned,grouped))) as MassDormancySave;
const restored=makeSimWorld('warrior',663),restoredOwned=new Map<string,Actor>();restored.time=100;
restored.nextSquadId();const newSquad=restored.nextSquadId();
for(const seat of recipe.members){const a=restored.createMonster(seat.monster!,3,'enemy');a.fromZoneGen=true;
 applyEncounterGroup(a,{id:newSquad,recipe:recipe.id,slot:seat.slot});restoredOwned.set(seat.slot,a);restored.actors.push(a);}
new MassDormancy(policy).restore(gs,restoredOwned,restored);
assert.ok([...restoredOwned.values()].every(a=>a.squadId===newSquad&&a.encounterGroup?.id===newSquad));
assert.equal(restoredOwned.get('leader')!.squadLeader,true);assert.equal(restoredOwned.get('hunter')!.encounterGroup?.slot,'hunter');
console.log('PASS native formations sleep and wake atomically, with exact recipe/role/leader and remapped group identities');

const opaque=make('opaque',-30000);Reflect.set(opaque,'unknownNativeCallback',()=>1);
assert.equal(captureNativeActorState(opaque),null);m.update(w,owned);assert.ok(w.actors.includes(opaque));
assert.ok(m.snapshot(owned,w).unsupported.includes('opaque'),'unsupported state is explicit, never silently trimmed');
const good=captureNativeActorState(twin)!,bad=JSON.parse(JSON.stringify(good));bad.nodes[0].entries.push(['sheet',{ref:999999}]);
const before=twin.life;assert.throws(()=>restoreNativeActorState(twin,bad,new Map()));assert.equal(twin.life,before);
console.log('PASS opaque mechanics remain resident and malformed native snapshots fail before actor mutation');
const fair=makeSimWorld('warrior',722),fairOwned=new Map<string,Actor>(),fm=new MassDormancy(policy);fair.time=100;
for(let i=0;i<40;i++){
 const a=fair.createMonster('gnoll_prowler',3,'enemy');a.fromZoneGen=true;a.pos={x:30000+i*50,y:0};
 if(i<28)Reflect.set(a,'unknownNativeCallback',()=>1);
 fairOwned.set('fair:'+i,a);fair.actors.push(a);
}
for(let i=0;i<4;i++)fm.update(fair,fairOwned);
assert.ok([...fairOwned.values()].slice(0,28).every(a=>!fm.isSleeping(a)));
assert.ok([...fairOwned.values()].slice(28).every(a=>fm.isSleeping(a)),'unsupported prefix cannot starve eligible later bodies');
console.log('PASS a persistent unsupported prefix cannot exhaust every retirement budget or starve later cohorts');
const onlyOwner={nodes:[focus]},foreignOwner={caster:focus};
Reflect.set(w,'dormancyProbeOwner',onlyOwner);
assert.ok(massDormancyPins(w,owned).has(focus));
assert.ok(!massDormancyPins(w,owned,new Set([onlyOwner])).has(focus));
Reflect.set(w,'dormancyProbeForeign',foreignOwner);
assert.ok(massDormancyPins(w,owned,new Set([onlyOwner])).has(focus),'excluding the exact run cannot hide another native owner');
Reflect.deleteProperty(w,'dormancyProbeOwner');Reflect.deleteProperty(w,'dormancyProbeForeign');
const activeSave=m.snapshot(owned,w);assert.ok(!activeSave.actors.some(r=>r.id==='opaque'));
const drift=makeSimWorld('warrior',441);drift.time=saved.clock+50000;const driftOwned=new Map<string,Actor>();
for(const row of rows){const a=drift.createMonster('gnoll_prowler',3,'enemy');a.fromZoneGen=true;driftOwned.set(row.id,a);drift.actors.push(a);}
new MassDormancy(policy).restore(saved,driftOwned,drift);
assert.equal(driftOwned.get(rows[0].id)!.life,rows[0].life);
assert.equal(driftOwned.get(rows[0].id)!.casting,null);
assert.ok(driftOwned.get(rows[0].id)!.aiAttendUntil<=drift.time);
console.log('PASS elapsed native scene time never restarts a settled sleeper deadline or reinstates active combat');
console.log('PASS kind-owned retirement may exclude its exact run while foreign dependencies remain authoritative');
const generated=makeSimWorld('warrior',99),runtime=new WorldMassRuntime(99,'dormancy-country');runtime.attach(generated);
for(let i=0;i<26;i++){generated.time+=13;generated.player.pos={x:5000+i*3200,y:4000};runtime.update(generated,true);}
const country=runtime.snapshot(generated);assert.ok(country.enemies.length>96,'real generated country must exceed the former lifetime budget');
assert.ok(country.dormancy!.sleeping.length>96);assert.ok(runtime.population<=runtime.config.maxPopulation);
const continued=makeSimWorld('warrior',27);continued.time=generated.time;
const rr=new WorldMassRuntime(99,'dormancy-country',country.config,country);rr.attach(continued,country);
const continuedRows=new Map(rr.snapshot(continued).enemies.map(e=>[e.id,e]));
for(const row of country.enemies){const actual=continuedRows.get(row.id)!;assert.ok(actual);assert.equal(actual.life,row.life);assert.equal(actual.monster,row.monster);assert.deepEqual(actual.birth,row.birth);}
assert.ok(rr.population<=rr.config.maxPopulation);
console.log('PASS actual generated country exceeds 96 distinct surviving natives, releases active capacity and retains them through native runtime Continue');
const identityAtDeath=rr.snapshot(continued).dormancy!.identities.find(r=>continued.actors.some(a=>a.id===r.actorId&&!a.dead))!;assert.ok(identityAtDeath);
const immediate=continued.actors.find(a=>a.id===identityAtDeath.actorId)!,killedId=identityAtDeath.id;
immediate.dead=true;immediate.life=0; // Save at the death boundary, before runtime.update removes its owned entry.
const afterKill=rr.snapshot(continued);assert.ok(!afterKill.enemies.some(e=>e.id===killedId));
assert.ok(!afterKill.dormancy!.identities.some(e=>e.id===killedId));
const afterDeathWorld=makeSimWorld('warrior',28),afterDeath=new WorldMassRuntime(99,'dormancy-country',afterKill.config,afterKill);
afterDeath.attach(afterDeathWorld,afterKill);assert.ok(!afterDeath.snapshot(afterDeathWorld).enemies.some(e=>e.id===killedId));
console.log('PASS immediate post-kill Save/Continue excludes the dead native from both population and exact identity tables');
undo();
