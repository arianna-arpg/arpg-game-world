/** Preparation must not acquire the party's routing or another area's activity. */
import assert from 'node:assert/strict';
import {makeSimWorld} from '../src/sim/arena';
import {withSeededRandom} from '../src/core/rng';
import {Actor} from '../src/engine/actor';
import {Timeflow} from '../src/engine/timeflow';
import {mod} from '../src/engine/stats';
import {STATUS_RELAYS,relayStatusStat} from '../src/engine/reception';
import type {World} from '../src/engine/world';
import {NativeAreaScenePopulation} from '../src/worldmass/nativeAreaScenePopulation';
import {NativeAreaTimeflow} from '../src/worldmass/nativeAreaTimeflow';
import {freshAssemblyInput,NativeAreaSceneAssembly} from './nativeFreshAssemblyFixture';

withSeededRandom(991,()=>{
 const w=makeSimWorld('warrior',991),player=w.player;
 const partner=new Actor('Other seat','player',{x:700,y:400});
 const minion=w.createMonster('zombie',3,'player');
 const relayCalls:number[]=[];
 const playerRelay:NonNullable<Actor['statusRelay']>=(actor)=>{relayCalls.push(actor.id);return true;};
 const partnerRelay:NonNullable<Actor['statusRelay']>=()=>false;
 Object.defineProperty(player,'statusRelay',{value:playerRelay,writable:false,configurable:true});
 partner.statusRelay=partnerRelay;
 const minionRelay=minion.statusRelay;
 const zA={...w.zone,id:'isolation-a',objective:{kind:'none' as const}},zB={...w.zone,id:'isolation-b',objective:{kind:'none' as const}};
 w.zoneMap[zA.id]=zA;w.zoneMap[zB.id]=zB;
 const rawA=freshAssemblyInput(w,zA);rawA.initialActors=[player,partner,minion];
 const rawB=freshAssemblyInput(w,zB,rawA.campaign);rawB.initialActors=[player,partner,minion];
 const a=new NativeAreaSceneAssembly(rawA),b=new NativeAreaSceneAssembly(rawB);
 const routing=()=>{assert.equal(player.statusRelay,playerRelay);assert.equal(partner.statusRelay,partnerRelay);assert.equal(minion.statusRelay,minionRelay);};
 routing();
 // Changing the caller's list cannot retroactively transfer the shared party.
 (rawA.initialActors as Actor[]).splice(0);
 a.input.population.transferRelays([player,partner,minion]);routing();
 player.statusRelay!(player,['shock',3,1,'neighbor test']);assert.deepEqual(relayCalls,[player.id]);
 assert.notEqual(a.input.scene.actors,b.input.scene.actors);
 assert.notEqual(a.input.occurrences.input.services.traceRuns,b.input.occurrences.input.services.traceRuns);
 assert.equal(a.input.environment.input.services.timeflow,a.timeflow);
 assert.equal(a.input.occurrences.input.services.timeflow,a.timeflow);

 // Real native grounding chooses only this retained area's census, even when
 // a foreign recipient is physically closer. The shared World has neither.
 const owner=a.input.population.createMonster('goblin_brute',20,'player');
 const nearA=a.input.population.createMonster('zombie',20,'enemy');
 const nearB=b.input.population.createMonster('zombie',20,'enemy');
 owner.pos={x:100,y:100};nearA.pos={x:130,y:100};nearB.pos={x:101,y:100};
 owner.sheet.setSource('isolation-relay',[mod(relayStatusStat('grounding'),'flat',1)]);
 a.input.scene.actors.push(owner,nearA);b.input.scene.actors.push(nearB);
 const nativeRelay=owner.statusRelay;
 assert.ok(nativeRelay);assert.notEqual(nativeRelay,playerRelay);assert.notEqual(nativeRelay,nearB.statusRelay);
 const status=STATUS_RELAYS.grounding.status;
 owner.applyStatus(status,8,1,'actual native relay');
 assert.ok(nearA.statuses.some(s=>s.id===status));assert.ok(!nearB.statuses.some(s=>s.id===status));
 assert.ok(!owner.statuses.some(s=>s.id===status));routing();

 const trace=(area:NativeAreaSceneAssembly)=>area.input.occurrences.input.services;
 const tracesA=[{held:true}] as World['traceRuns'],tracesB=[{held:true}] as World['traceRuns'];
 trace(a).traceRuns=tracesA;trace(b).traceRuns=tracesB;
 assert.ok(a.timeflow.holdSurface('trace'));assert.ok(b.timeflow.holdSurface('trace'));
 assert.ok(a.timeflow.holdSurface('trace'),'refresh replaces this owner only');
 b.input.occurrences.traceAbortAll();assert.equal(trace(a).traceRuns,tracesA);assert.deepEqual(trace(b).traceRuns,[]);
 assert.equal(w.timeflow.worldScale(),0);assert.equal(w.timeflow.heldBy('trace'),true);
 a.input.occurrences.traceAbortAll();assert.equal(w.timeflow.worldScale(),1);

 // A legacy/global hold is outside both scopes, including unearned releases.
 const campaignTraceState=w as unknown as {traceRuns:World['traceRuns']};
 campaignTraceState.traceRuns=[{held:true}] as World['traceRuns'];const campaignTraces=campaignTraceState.traceRuns;
 w.timeflow.holdSurface('trace');a.timeflow.release('trace');b.timeflow.release('trace');
 a.input.occurrences.traceAbortAll();b.input.occurrences.traceAbortAll();
 assert.equal(campaignTraceState.traceRuns,campaignTraces);assert.equal(w.timeflow.worldScale(),0);
 w.timeflow.release('trace');assert.equal(w.timeflow.worldScale(),1);

 for(const area of [a,b]){
  area.input.environment.input.state.harvestSessions=[{held:true}] as World['harvestSessions'];
  assert.ok(area.timeflow.holdSurface('harvest'));
 }
 const bHarvest=b.input.environment.input.state.harvestSessions;
 a.input.environment.bootHarvest({...zA,spoils:'none'},[]);
 assert.equal(b.input.environment.input.state.harvestSessions,bHarvest);assert.equal(w.timeflow.worldScale(),0);
 b.input.environment.bootHarvest({...zB,spoils:'none'},[]);assert.equal(w.timeflow.worldScale(),1);
 assert.ok(!a.timeflow.holdSurface('unregistered-surface'));
 assert.ok(!a.timeflow.holdSurface('__proto__'));

 // The native policy remains live and gets its original receiver/logical id.
 const policy=w.timeflow.allowHold;w.timeflow.allowHold=function(h){assert.equal(this,w.timeflow);assert.equal(h.id,'trace');return false;};
 assert.equal(a.timeflow.allowHold({id:'trace',kind:'trace',scale:0}),false);
 w.timeflow.allowHold=policy;

 // Malformed shared bindings fail before any actor callback changes.
 const local=a.input.population.input;
 for(const sharedActors of [[player,player],[new Actor('foreign','player',{x:0,y:0})]])
  assert.throws(()=>new NativeAreaScenePopulation({...local,sharedActors}),/shared actors/);
 const accessor={...local};Object.defineProperty(accessor,'sharedActors',{get(){throw Error('must not read accessor');}});
 assert.throws(()=>new NativeAreaScenePopulation(accessor),/own shared actor list/);routing();
 Object.defineProperty(player,'statusRelay',{value:playerRelay,writable:true,configurable:true});
});

// An exception after an actual hold must not strand it or authorize release of
// an unrelated hold. Test the real shared clock behind a receiver-sensitive port.
const clock=new Timeflow(),calls:string[]=[];
clock.holdSurface('trace');
const port={allowHold:()=>true,hold(h:Parameters<Timeflow['hold']>[0]){assert.equal(this,port);clock.hold(h);throw Error('after real hold');},release(id:string){assert.equal(this,port);calls.push(id);clock.release(id);}};
const scope=new NativeAreaTimeflow(port),other=new NativeAreaTimeflow(port);
other.release('trace');assert.equal(calls.length,0);
assert.throws(()=>scope.holdSurface('trace'),/after real hold/);
scope.release('trace');assert.equal(calls.length,1);assert.notEqual(calls[0],'trace');assert.equal(clock.worldScale(),0);
clock.release('trace');assert.equal(clock.worldScale(),1);
assert.throws(()=>new NativeAreaTimeflow({release(){}} as any),/actual campaign clock/);
console.log('PASS native area coexistence: shared player/seat/minion routing, real local grounding, independent trace and harvest cleanup, live clock policy and partial failure cleanup');
