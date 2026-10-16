import {placeZoneAt} from '../src/engine/worldgen';
import {RemoteInput} from '../src/net/remote';
import {CLASSES} from '../src/data/classes';
import {NativeAreaCombatOperation} from '../src/worldmass/nativeAreaCombatOperation';
import {killRules} from '../src/engine/killHandlers';
import {existsSync,mkdtempSync,writeFileSync} from 'node:fs';
import {isAbsolute,join} from 'node:path';
import {tmpdir} from 'node:os';
import {claimNativeVerminfallArrival} from '../src/worldmass/nativeAreaSceneTransitionCoordinator';
/** Actual retained Verminfall ownership and failure boundaries.
 * Startup, travel, factories, kills, field writes and insertion are real.
 * Fault courses deliberately replace an overlay or selected callback; these are not natural-play claims. */
import assert from 'node:assert/strict';
import {bootSimEngine,withSeededRandom,refuseWorldStartup,setupVerminfallDraft,type VerminfallDraftSetup} from './nativeVerminfallFixture';
const output=process.argv[2]??join(mkdtempSync(join(tmpdir(),'hollow-wake-verminfall-boundaries-')),'result.json');
assert(isAbsolute(output)&&!existsSync(output),'Provide an absent absolute receipt path');
console.log(JSON.stringify({receiptPath:output}));
bootSimEngine();
const results:unknown[]=[];
/** Eight historical placement faults run at the actual selected arrival callable,
 * after transfer. This helper preserves their exact census/error assertions.
 * Their caught leaf errors do not prove transition propagation; separate courses do. */
function withWarmArrival<T>(s:VerminfallDraftSetup,run:(arrive:()=>void,after:(check:()=>void)=>void)=>T):T {
 const owner=s.area.combat.verminfallLifetime,original=owner.arrive,saved=Object.getOwnPropertyDescriptor(owner,'arrive'),coordinator=s.area.combat.input.coordinator;
 const afterTransition:(()=>void)[]=[];let calls=0,result:T|undefined;s.travel(s.town);
 Object.defineProperty(owner,'arrive',{configurable:true,writable:true,value:function(this:typeof owner){
  calls++;assert.equal(coordinator.current,s.area);assert.equal(coordinator.published,s.area);assert.equal(s.area.assembly.input.scene.player,s.w.player);
  assert.equal(s.area.combat.input.authority.require(s.w.player).combat,s.area.combat);
  result=run(()=>Reflect.apply(original,this,[]),check=>afterTransition.push(check));
 }});
 try{
  s.travel(s.def.id);assert.equal(calls,1);assert.equal(s.runtime.current,s.area,'Retry checkpoints require the actual transition to have finished');
  for(const check of afterTransition)check();return result as T;
 }finally{if(saved)Object.defineProperty(owner,'arrive',saved);else delete(owner as {arrive?:unknown}).arrive;}
}
function laterCalls(s:VerminfallDraftSetup){
 const vendetta=s.area.combat.vendettaLifetime,original=vendetta.arrive,saved=Object.getOwnPropertyDescriptor(vendetta,'arrive');
 let calls=0;Object.defineProperty(vendetta,'arrive',{configurable:true,writable:true,value:function(){calls++;return Reflect.apply(original,this,[]);}});
 return{count:()=>calls,restore(){if(saved)Object.defineProperty(vendetta,'arrive',saved);else delete(vendetta as {arrive?:unknown}).arrive;}};
}

function course(name:string,run:(s:VerminfallDraftSetup)=>unknown){
 const result=withSeededRandom(55501,()=>refuseWorldStartup([],worldDrivers=>{
  localStorage.clear();const s=setupVerminfallDraft();
  try{const details=run(s);assert.deepEqual(worldDrivers,[]);return{name,details,worldDrivers};}finally{s.start.cancel();}
 }));
 results.push(result);console.log(JSON.stringify(result));
}
course('same event keeps warm bodies and wounds',s=>{
 const bodies=s.nests(),wound=bodies[0].life=Math.max(1,bodies[0].life*.4),seen=s.w.ledger.infestation_seen;
 s.travel(s.town);s.travel(s.def.id);for(let i=0;i<3;i++)s.live();
 assert.equal(s.runtime.current,s.area);assert.deepEqual(s.nests(),bodies);assert.equal(bodies[0].life,wound);assert.equal(s.w.ledger.infestation_seen,seen);
 return{sameBodies:true,wound};
});
course('stale nest cannot advance its successor',s=>{
 const old=s.nests()[0],replacement=s.replace();s.live();const before=s.events(),ledger=s.w.ledger.warren_nests_broken??0,kings=s.w.actors.filter(x=>x.tag==='rat_king_manifest').length;
 s.kill(old);assert(old.dead);assert.deepEqual(s.events(),before);assert.equal(s.w.ledger.warren_nests_broken??0,ledger);assert.equal(s.w.actors.filter(x=>x.tag==='rat_king_manifest').length,kings);
 return{old:s.event.id,replacement:replacement.id,successorUntouched:true};
});
course('stale king cannot clear or pay a successor',s=>{
 for(const nest of s.nests())s.kill(nest);const king=s.king();assert(king);
 const replacement=s.replace();s.live();const before=s.events(),slain=s.w.ledger.rat_kings_slain??0,cleared=s.w.ledger.infestations_cleared??0,xp=s.w.localSeat.meta.xp;
 s.kill(king);assert(king.dead);assert.deepEqual(s.events(),before);assert.equal(s.w.ledger.rat_kings_slain??0,slain);assert.equal(s.w.ledger.infestations_cleared??0,cleared);
 // Generic monster XP is permitted; exact package bonus exclusion needs the paired current-kill course.
 return{replacement:replacement.id,eventLedgersUnchanged:true,genericXpDelta:s.w.localSeat.meta.xp-xp};
});
course('selected nest resolver cannot redirect to successor',s=>{
 const original=s.vf.onNestBroken,old=s.nests()[0];let replacement='';
 s.vf.onNestBroken=function(zone){replacement=s.replace().id;return Reflect.apply(original,this,[zone]);};
 try{assert.throws(()=>s.kill(old),/Verminfall.*event changed/);}finally{s.vf.onNestBroken=original;}
 const active=s.events().infestations.find(x=>x.id===replacement);assert(active);assert.equal(active.nestsBroken,0);
 assert.equal(s.w.ledger.warren_nests_broken??0,0);return{replacement,oldDeathPreserved:old.dead};
});
course('selected king resolver cannot clear successor',s=>{
 for(const nest of s.nests())s.kill(nest);const king=s.king();assert(king);
 const original=s.vf.onKingSlain;let replacement='';
 s.vf.onKingSlain=function(zone){replacement=s.replace().id;return Reflect.apply(original,this,[zone]);};
 try{assert.throws(()=>s.kill(king),/Verminfall.*event changed/);}finally{s.vf.onKingSlain=original;}
 const active=s.events().infestations.find(x=>x.id===replacement);assert(active&&!active.dead);assert.equal(active.nestsBroken,0);assert.equal(s.w.ledger.infestations_cleared??0,0);return{replacement};
});
course('query returning old projection after replacement is rejected',s=>{
 s.replace();const original=s.vf.infestOn,actors=[...s.w.actors],seen=s.w.ledger.infestation_seen;let calls=0;
 s.vf.infestOn=function(zone){const old=Reflect.apply(original,this,[zone]);if(zone===s.def.id&&++calls===1)s.replace();return old;};
 try{assert.throws(()=>s.live(),/actual selected infestation|selected query changed/);}finally{s.vf.infestOn=original;}
 assert.deepEqual(s.w.actors,actors);assert.equal(s.w.ledger.infestation_seen,seen);return{calls};
});
course('native marker add then throw stays consumed',s=>withWarmArrival(s,(arrive,after)=>{
 s.replace();const marker=s.area.assembly.input.registry.input.birth.input.state.materializedInfestation,error=new Error('marker-add-partial'),actors=[...s.w.actors],seen=s.w.ledger.infestation_seen;
 Object.defineProperty(marker,'add',{configurable:true,value:function(id:string){Reflect.apply(Set.prototype.add,this,[id]);throw error;}});
 try{assert.throws(()=>arrive(),e=>e===error);}finally{delete(marker as {add?:unknown}).add;}
 assert(marker.has(s.def.id));assert.deepEqual(s.w.actors,actors);assert.equal(s.w.ledger.infestation_seen,seen);
 after(()=>{s.live();assert.deepEqual(s.w.actors,actors);assert.equal(s.w.ledger.infestation_seen,seen);});return{sameException:true,noReplay:true};
}));
course('factory failure preserves marker and discovery without retry',s=>withWarmArrival(s,(arrive,after)=>{
 s.replace();const population=s.area.assembly.input.population,original=population.createMonster,error=new Error('factory'),actors=[...s.w.actors],seen=s.w.ledger.infestation_seen??0;
 population.createMonster=function(){throw error;};
 try{assert.throws(()=>arrive(),e=>e===error);}finally{population.createMonster=original;}
 assert.equal(s.w.ledger.infestation_seen,seen+1);assert.deepEqual(s.w.actors,actors);
 after(()=>{s.live();assert.deepEqual(s.w.actors,actors);assert.equal(s.w.ledger.infestation_seen,seen+1);});return{noReplay:true};
}));
course('partial native nest insertion keeps native-finally admission and does not replay',s=>withWarmArrival(s,(arrive,after)=>{
 s.replace();const actors=s.w.actors,before=new Set(actors),original=actors.push,error=new Error('nest-insertion');let inserted:typeof s.w.player|undefined;
 Object.defineProperty(actors,'push',{configurable:true,value:function(...items:typeof actors){const result=Reflect.apply(original,this,items);const nest=items.find(x=>x.tag==='warren_nest'&&!before.has(x));if(nest){inserted=nest;throw error;}return result;}});
 try{assert.throws(()=>arrive(),e=>e===error);}finally{delete(actors as {push?:unknown}).push;}
 assert(inserted&&actors.includes(inserted));const partial=[...actors],seen=s.w.ledger.infestation_seen;
 // The explicit observe hook was not reached, but the existing admission frame
 // publishes pending inserted bodies in its native finally. Preserve that policy.
 assert.equal(s.area.combat.input.authority.require(inserted).combat,s.area.combat);
 after(()=>{assert.equal(s.w.actors,actors);s.live();assert.equal(s.w.actors,actors);assert.deepEqual(actors,partial);assert.equal(s.w.ledger.infestation_seen,seen);});
 return{inserted:inserted.id,exactException:true,nativeFinallyAdmission:true,noReplay:true};
}));
course('last-nest king factory failure preserves armed field',s=>{
 const nests=s.nests();for(const nest of nests.slice(0,-1))s.kill(nest);
 const population=s.area.assembly.input.population,original=population.createMonster,error=new Error('king-factory'),before=s.w.ledger.warren_nests_broken??0;
 population.createMonster=function(...args){if(args[0]===s.vf.surge().kingDefId)throw error;return Reflect.apply(original,this,args);};
 try{assert.throws(()=>s.kill(nests.at(-1)!),e=>e===error);}finally{population.createMonster=original;}
 assert(s.vf.infestOn(s.def.id)?.kingArmed);assert.equal(s.w.ledger.warren_nests_broken,before+1);assert.equal(s.king(),undefined);s.live();assert.equal(s.king(),undefined);
 return{armed:true,noWarmKingRetry:true};
});
course('last-nest king partial insertion retains incomplete native body',s=>{
 const nests=s.nests();for(const nest of nests.slice(0,-1))s.kill(nest);
 const actors=s.w.actors,original=actors.push,before=new Set(actors),error=new Error('king-insertion');let inserted:typeof s.w.player|undefined;
 Object.defineProperty(actors,'push',{configurable:true,value:function(...items:typeof actors){const result=Reflect.apply(original,this,items);const king=items.find(x=>x.defId===s.vf.surge().kingDefId&&!before.has(x));if(king){inserted=king;throw error;}return result;}});
 try{assert.throws(()=>s.kill(nests.at(-1)!),e=>e===error);}finally{delete(actors as {push?:unknown}).push;}
 assert(inserted&&actors.includes(inserted));assert(s.vf.infestOn(s.def.id)?.kingArmed);assert.notEqual(inserted.tag,'rat_king_manifest');
 assert.equal(s.w.ledger.infestations_cleared??0,0);return{inserted:inserted.id,armed:true,incompleteTag:inserted.tag??null};
});

for(const role of ['nest','king'] as const)course('unrelated retained body retagged '+role+' is not event-owned',s=>{
 const body=s.w.actors.find(x=>!x.dead&&x.team==='enemy'&&x.fromZoneGen&&x.tag!=='warren_nest'&&x.tag!=='rat_king_manifest');assert(body,'actual native zone has an unrelated living enemy');
 body.tag=role==='nest'?'warren_nest':'rat_king_manifest';const before=s.events(),broken=s.w.ledger.warren_nests_broken??0,slain=s.w.ledger.rat_kings_slain??0,cleared=s.w.ledger.infestations_cleared??0;
 s.kill(body);assert(body.dead);assert.deepEqual(s.events(),before);assert.equal(s.w.ledger.warren_nests_broken??0,broken);assert.equal(s.w.ledger.rat_kings_slain??0,slain);assert.equal(s.w.ledger.infestations_cleared??0,cleared);
 return{role,genuineUnboundRetainedBody:body.id,noPackageEffects:true};
});
for(const name of ['markDiscovered','surge'] as const)course('placement getter replacement refuses selected '+name+' callback',s=>withWarmArrival(s,arrive=>{
 s.replace();const original=s.vf[name],saved=Object.getOwnPropertyDescriptor(s.vf,name);let calls=0;
 Object.defineProperty(s.vf,name,{configurable:true,get(){s.vf.restore({...s.events(),infestations:[]});return function(){calls++;return Reflect.apply(original,s.vf,arguments as unknown as []);};}});
 try{assert.throws(()=>arrive(),/Verminfall.*changed/);}finally{if(saved)Object.defineProperty(s.vf,name,saved);else delete(s.vf as unknown as Record<string,unknown>)[name];}
 assert.equal(calls,0,'selected custom callable is refused before invocation');return{name,calls};
}));
for(const name of ['onNestBroken','onKingSlain'] as const)course('kill getter replacement refuses selected '+name+' callback',s=>{
 let body=s.nests()[0];if(name==='onKingSlain'){for(const nest of s.nests())s.kill(nest);body=s.king()!;assert(body);}
 const saved=Object.getOwnPropertyDescriptor(s.vf,name);let calls=0;
 Object.defineProperty(s.vf,name,{configurable:true,get(){s.replace();return function(){calls++;return name==='onNestBroken'?{remaining:0,kingReady:true}:true;};}});
 try{assert.throws(()=>s.kill(body),/Verminfall.*event changed/);}finally{if(saved)Object.defineProperty(s.vf,name,saved);else delete(s.vf as unknown as Record<string,unknown>)[name];}
 assert.equal(calls,0);return{name,calls};
});
course('native marker delete then throw preserves deletion and permits later new-event attempt',s=>withWarmArrival(s,(arrive,after)=>{
 s.replace();const marker=s.area.assembly.input.registry.input.birth.input.state.materializedInfestation,error=new Error('marker-delete-partial'),before=s.nests().length,seen=s.w.ledger.infestation_seen??0;
 Object.defineProperty(marker,'delete',{configurable:true,value:function(id:string){Reflect.apply(Set.prototype.delete,this,[id]);throw error;}});
 try{assert.throws(()=>arrive(),e=>e===error);}finally{delete(marker as {delete?:unknown}).delete;}
 assert(!marker.has(s.def.id));assert.equal(s.nests().length,before);
 after(()=>{s.live();assert(marker.has(s.def.id));assert.equal(s.w.ledger.infestation_seen,seen+1);});return{laterAttempt:true};
}));
course('selected factory cannot return an older same-population nest',s=>withWarmArrival(s,arrive=>{
 const population=s.area.assembly.input.population,old=population.createMonster('warren_nest',s.def.level,'enemy'),original=population.createMonster;s.replace();
 population.createMonster=function(){return old;};
 try{assert.throws(()=>arrive(),/foreign|reused|selected invocation/);}finally{population.createMonster=original;}
 assert(!s.w.actors.includes(old));return{oldBody:old.id,notAdopted:true};
}));
course('selected king factory cannot return an older same-population body',s=>{
 const population=s.area.assembly.input.population,old=population.createMonster(s.vf.surge().kingDefId,s.def.level,'enemy'),original=population.createMonster,nests=s.nests();
 for(const nest of nests.slice(0,-1))s.kill(nest);
 population.createMonster=function(...args){return args[0]===s.vf.surge().kingDefId?old:Reflect.apply(original,this,args);};
 try{assert.throws(()=>s.kill(nests.at(-1)!),/foreign|reused|selected invocation/);}finally{population.createMonster=original;}
 assert(s.vf.infestOn(s.def.id)?.kingArmed);assert.equal(s.w.ledger.infestations_cleared??0,0);return{oldBody:old.id,armed:true};
});


course('query getter replacement refuses returned custom callable before invocation',s=>{
 const saved=Object.getOwnPropertyDescriptor(s.vf,'infestOn');let calls=0;
 Object.defineProperty(s.vf,'infestOn',{configurable:true,get(){s.vf.restore({...s.events(),infestations:[]});return function(){calls++;return null;};}});
 try{assert.throws(()=>s.live(),/selected query changed/);}finally{if(saved)Object.defineProperty(s.vf,'infestOn',saved);else delete(s.vf as {infestOn?:unknown}).infestOn;}
 assert.equal(calls,0);return{calls};
});


for(const active of [false,true])course('historical direct Crusade entry composes once; active='+active,s=>{
 if(active)s.replace();else s.vf.restore({...s.events(),infestations:[]});
 const registry=s.area.assembly.input.registry,original=registry.materializeLiveZoneEvents;let calls=0;
 registry.materializeLiveZoneEvents=function(){calls++;return Reflect.apply(original,this,[]);};
 try{s.area.combat.crusadeLifetime.materializeLiveZoneEvents();}finally{registry.materializeLiveZoneEvents=original;}
 assert.equal(calls,1);if(active){assert.equal(s.w.actors.filter(x=>!x.dead&&x.tag==='warren_nest').length,s.event.nestsTotal,'Replacement cannot reopen consumed visit through direct Crusade entry');s.travel(s.town);s.travel(s.def.id);assert(s.w.actors.filter(x=>!x.dead&&x.tag==='warren_nest').length>s.event.nestsTotal,'Genuine unoccupied arrival renews');}
 return{active,registryCalls:calls};
});
course('recursive selected query cannot dispatch registry twice',s=>{
 const registry=s.area.assembly.input.registry,originalRegistry=registry.materializeLiveZoneEvents,query=s.vf.infestOn;let calls=0;
 registry.materializeLiveZoneEvents=function(){calls++;return Reflect.apply(originalRegistry,this,[]);};
 Object.defineProperty(s.vf,'infestOn',{configurable:true,get(){s.area.combat.crusadeLifetime.materializeLiveZoneEvents();return query;}});
 try{assert.throws(()=>s.live(),/cannot reenter/);}finally{delete(s.vf as {infestOn?:unknown}).infestOn;registry.materializeLiveZoneEvents=originalRegistry;}
 assert.equal(calls,1);return{registryCalls:calls};
});
course('Crusade method getter has no ready-scope authority',s=>{
 const crusade=s.area.combat.crusadeLifetime,original=crusade.materializeLiveZoneEvents,registry=s.area.assembly.input.registry,originalRegistry=registry.materializeLiveZoneEvents;let calls=0;
 registry.materializeLiveZoneEvents=function(){calls++;return Reflect.apply(originalRegistry,this,[]);};
 Object.defineProperty(crusade,'materializeLiveZoneEvents',{configurable:true,get(){Reflect.apply(original,crusade,[]);return original;}});
 try{assert.throws(()=>s.live(),/cannot reenter/);}finally{delete(crusade as {materializeLiveZoneEvents?:unknown}).materializeLiveZoneEvents;registry.materializeLiveZoneEvents=originalRegistry;}
 assert.equal(calls,0);return{registryCalls:calls};
});


course('remote and downed occupancy prevent successor until genuine last-departure return',s=>{
 const peer=s.area.combat.party.addSeat('verminfall-peer',CLASSES[0],new RemoteInput('verminfall-peer'),{startingCompanions:false});
 peer.actor.invulnerable=true;
 const actors=s.area.assembly.input.scene.actors,sourceDrops=s.area.assembly.input.physical.input.state.drops;
 const nests=()=>actors.filter(x=>!x.dead&&x.tag==='warren_nest'),kings=()=>actors.filter(x=>!x.dead&&x.tag==='rat_king_manifest');
 const oldNests=nests(),vermin=actors.find(x=>!x.dead&&x.tag==='vermin');assert(vermin,'Actual infestation created a surviving vermin cohort');
 const nestWound=oldNests[0].life=Math.max(1,oldNests[0].life*.41),verminWound=vermin.life=Math.max(1,vermin.life*.43);
 const seen=s.w.ledger.infestation_seen??0,cleared=s.w.ledger.infestations_cleared??0;
 const coordinator=s.area.combat.input.coordinator,authority=s.area.combat.input.authority;
 const road=(destination:string,seat=s.w.localSeat)=>{
  const from=coordinator.areaFor(authority.require(seat.actor).combat);from.combat.campaignFrame.enableHostedRoads();
  coordinator.runFrom(from,()=>coordinator.roadsFor(from.combat).shardWorld!.enqueue({seatId:seat.id,dest:destination}));
  const moved=from.combat.campaignFrame.drainShardRoads();assert.equal(moved.length,1);if(moved[0].error)throw moved[0].error;assert.equal(moved[0].outcome,'moved');
 };
 road(s.town);assert.notEqual(s.runtime.current,s.area);assert.equal(authority.require(peer.actor).combat,s.area.combat);
 const townDrops=s.runtime.current.assembly.input.physical.input.state.drops,townBefore=[...townDrops];
 for(let i=0;i<3;i++)s.live();
 assert.deepEqual(nests(),oldNests);assert.equal(oldNests[0].life,nestWound);assert.equal(vermin.life,verminWound);assert.equal(s.w.ledger.infestation_seen,seen);
 const remoteKill=(body:typeof s.w.player)=>s.area.combat.kill(body,false,peer.actor);
 for(const nest of nests())remoteKill(nest);assert.equal(kings().length,1);remoteKill(kings()[0]);
 assert.equal(s.vf.infestOn(s.def.id),null);assert.equal(s.w.ledger.infestations_cleared,cleared+1);assert.deepEqual(townDrops,townBefore);
 let steps=0;while(!s.events().infestations.some(row=>!row.dead)&&steps<2000){s.vf.update(.5,s.w.devOverlayView());steps++;}
 const successor=s.events().infestations.find(row=>!row.dead);assert(successor,'Bounded natural successor while actual peer stays present');
 assert.equal(successor.zoneId,s.def.id,JSON.stringify({reason:'Natural remote course selected different eligible ground',successor,steps}));
 assert.notEqual(successor.id,s.event.id);s.live();
 assert.equal(nests().length,0,'A replacement cannot reopen the peer-occupied consumed visit');assert.equal(s.w.ledger.infestation_seen,seen);
 road(s.def.id);assert.equal(nests().length,0,'Standing peer blocks join renewal');road(s.town);
 peer.actor.downed=true;
 try{road(s.def.id);assert.equal(nests().length,0,'Downed physical peer still occupies the visit');road(s.town);}finally{peer.actor.downed=false;}
 road(s.town,peer);assert.equal(authority.require(peer.actor).combat,s.runtime.current.combat);
 s.live();assert.equal(nests().length,0,'An empty resident frame cannot renew the consumed visit');assert.equal(s.w.ledger.infestation_seen,seen);
 road(s.def.id);assert.equal(s.runtime.current,s.area,'Only first genuine return after last departure renews');
 const newNests=nests();assert.equal(newNests.length,successor.nestsTotal);assert(newNests.every(body=>!oldNests.includes(body)));
 assert.equal(s.w.ledger.infestation_seen,seen+1);assert(actors.includes(vermin));assert.equal(vermin.life,verminWound);
 const successorWound=newNests[0].life=Math.max(1,newNests[0].life*.47);road(s.def.id,peer);
 assert.equal(s.runtime.current,s.area);assert.equal(authority.require(peer.actor).combat,s.area.combat);s.live();
 assert.deepEqual(nests(),newNests);assert.equal(newNests[0].life,successorWound);assert.equal(vermin.life,verminWound);assert.equal(s.w.ledger.infestation_seen,seen+1);
 const lootBefore=sourceDrops.length;for(const nest of nests())remoteKill(nest);assert.equal(kings().length,1);remoteKill(kings()[0]);
 assert.equal(s.w.ledger.infestations_cleared,cleared+2);assert.equal(s.vf.infestOn(s.def.id),null);assert(sourceDrops.length>lootBefore);assert.deepEqual(townDrops,townBefore);
 return{peer:peer.id,naturalSuccessor:successor.id,steps,warmNestWound:nestWound,survivingVerminWound:verminWound,successorWound,clearDelta:2,actualRetainedRoads:true,transportProof:false};
});
course('selected native king spawn returns after admission then throws without granting event ownership',s=>{
 const nests=s.nests();for(const nest of nests.slice(0,-1))s.kill(nest);
 const before=s.w.ledger.warren_nests_broken??0,actors=s.area.assembly.input.scene.actors,originalBodies=new Set(actors),error=new Error('king-spawn-return-then-throw');
 const prototype=NativeAreaCombatOperation.prototype,original=prototype.combatEventCallback;
 let completed=0,returned:typeof s.w.player|undefined;
 // Decorate during genuine callback creation, before the original KillCtx receipt
 // is issued. The actual native spawn performs construction, insertion AND admission.
 prototype.combatEventCallback=function(this:NativeAreaCombatOperation,...args:Parameters<typeof original>){
  const selected=Reflect.apply(original,this,args);
  if(args[0]!=='spawnHostileAt')return selected;
  return function(this:unknown,...spawnArgs:unknown[]){
   const body=Reflect.apply(selected,this,spawnArgs) as typeof s.w.player;
   if(spawnArgs[0]===s.vf.surge().kingDefId){completed++;returned=body;throw error;}
   return body;
  };
 } as typeof original;
 try{assert.throws(()=>s.kill(nests.at(-1)!),caught=>caught===error);}finally{prototype.combatEventCallback=original;}
 assert.equal(completed,1);assert(returned&&!originalBodies.has(returned)&&actors.includes(returned));
 assert.equal(s.area.combat.input.authority.require(returned).combat,s.area.combat,'Original admission completed before the injected throw');
 assert(nests.at(-1)!.dead);assert.equal(s.w.ledger.warren_nests_broken,before+1);assert(s.vf.infestOn(s.def.id)?.kingArmed);
 assert.notEqual(returned.tag,'rat_king_manifest','Native tag assignment follows the selected callback return');
 const sameBodies=[...actors];s.live();assert.deepEqual(actors,sameBodies);assert.equal(s.king(),undefined);
 // Explicit negative shortcut: a copied package tag must not turn this incomplete
 // selected spawn into an owned successful king or clear its armed event.
 returned.tag='rat_king_manifest';const field=s.events(),slain=s.w.ledger.rat_kings_slain??0,cleared=s.w.ledger.infestations_cleared??0;
 const rule=killRules().find(row=>row.id==='rat_king_laid_low');assert(rule);const run=rule.run;let packageCalls=0;
 rule.run=function(ctx){packageCalls++;return Reflect.apply(run,this,[ctx]);};
 try{s.kill(returned);}finally{rule.run=run;}
 assert(returned.dead);assert.equal(packageCalls,0);assert.deepEqual(s.events(),field);assert.equal(s.w.ledger.rat_kings_slain??0,slain);assert.equal(s.w.ledger.infestations_cleared??0,cleared);
 return{nativeSpawnReturned:true,admissionCompleted:true,exactException:true,earlierNestDeathAndWritePreserved:true,noWarmRetry:true,retagPackageCalls:packageCalls};
});


type NativeEventRow={id:string;zoneId:string;nestsTotal:number;nestsBroken:number;age:number;seen:boolean;dead:boolean};
const actualRows=(s:VerminfallDraftSetup)=>(s.vf as unknown as {infestations:NativeEventRow[]}).infestations;
course('selected resolver cannot redirect actual native find to another genuine live event',s=>{
 const w=s.w;let target:{x:number;y:number}|undefined;
 for(let radius=180;radius<=540&&!target;radius+=30)for(let step=0;step<24;step++){
  const at={x:Math.round(Math.cos(step*Math.PI/12)*radius),y:Math.round(Math.sin(step*Math.PI/12)*radius)};
  if(Math.hypot(at.x-s.def.map.x,at.y-s.def.map.y)>=70&&w['biomeFor'](at)==='farmland'&&w['continentFor'](at).kind!=='ocean'&&w['levelFor'](at)<=s.vf.surge().levelMax){target=at;break;}
 }
 assert(target,'Bounded installed-geography search found a distinct eligible native claim');
 const other=placeZoneAt(target,null,w.zoneMap,w['nextGenId']++,{seed:1211^0x22a1,fieldBiome:true,biomeFor:w['biomeFor'],biomeDepthFor:w['biomeDepthFor'],climateFor:w['climateFor'],levelFor:w['levelFor'],courseFor:w['courseMintFor']('surface')});
 assert.equal(other.biome,'farmland');w.zoneMap[other.id]=other;w.sim.onNodeCharted(other,w.devOverlayView());w.sim.update(0,w.devOverlayView());
 assert(s.vf.devIgnite(w.devOverlayView(),other.id),'Explicit fault staging uses a genuine second overlay event on actual eligible ground');
 const rows=actualRows(s),a=rows.find(row=>row.id===s.event.id),b=rows.find(row=>row.zoneId===other.id&&!row.dead);assert(a&&b&&a!==b);
 const before=s.events(),broken=w.ledger.warren_nests_broken??0,original=s.vf.onNestBroken,descriptor=Object.getOwnPropertyDescriptor(rows,'find');let calls=0;
 s.vf.onNestBroken=function(zone){
  Object.defineProperty(rows,'find',{configurable:true,value:()=>{calls++;return b;}});
  try{return Reflect.apply(original,this,[zone]);}finally{if(descriptor)Object.defineProperty(rows,'find',descriptor);else delete(rows as {find?:unknown}).find;}
 };
 const nest=s.nests()[0];try{assert.throws(()=>s.kill(nest),/selected resolver returned another event/);}finally{s.vf.onNestBroken=original;}
 assert.equal(calls,1,'The selected callback runs and its returned row is authenticated');assert(nest.dead);assert.deepEqual(s.events(),before);assert.equal(w.ledger.warren_nests_broken??0,broken);
 return{event:a.id,other:b.id,selectedFindCalls:calls,wrongEventWriteRefused:true};
});
course('overridden array some cannot revive a retired body epoch',s=>{
 const nest=s.nests()[0];s.vf.restore({...s.events(),infestations:[]});
 const rows=actualRows(s),before=s.events(),broken=s.w.ledger.warren_nests_broken??0,descriptor=Object.getOwnPropertyDescriptor(rows,'some');let calls=0;
 Object.defineProperty(rows,'some',{configurable:true,value:()=>{calls++;return true;}});
 try{s.kill(nest);}finally{if(descriptor)Object.defineProperty(rows,'some',descriptor);else delete(rows as {some?:unknown}).some;}
 assert(nest.dead);assert.deepEqual(s.events(),before);assert.equal(s.w.ledger.warren_nests_broken??0,broken);assert.equal(calls,0,'Native membership reads actual ordinary row storage');
 return{retiredEvent:s.event.id,forgedMembershipCalls:calls,noPackageWrite:true};
});
course('same-event nest-count accessor cannot reenter a second native mutation',s=>{
 const row=actualRows(s).find(row=>row.id===s.event.id);assert(row);const saved=Object.getOwnPropertyDescriptor(row,'nestsBroken');assert(saved&&Object.hasOwn(saved,'value'));
 const original=s.vf.onNestBroken,before=s.events(),broken=s.w.ledger.warren_nests_broken??0,nest=s.nests()[0];let reads=0,value=row.nestsBroken;
 s.vf.onNestBroken=function(zone){
  Object.defineProperty(row,'nestsBroken',{configurable:true,get(){reads++;if(reads===1)Reflect.apply(original,s.vf,[zone]);return value;},set(next:number){value=next;}});
  try{return Reflect.apply(original,this,[zone]);}finally{Object.defineProperty(row,'nestsBroken',saved);}
 };
 try{assert.throws(()=>s.kill(nest),/Native Verminfall event needs ordinary data/);}finally{s.vf.onNestBroken=original;Object.defineProperty(row,'nestsBroken',saved);}
 assert(nest.dead);assert.equal(reads,0);assert.equal(value,saved.value);assert.deepEqual(s.events(),before);assert.equal(s.w.ledger.warren_nests_broken??0,broken);
 return{accessorInvocations:reads,noReentrantProgress:true};
});
course('selected array-find getter cannot invoke returned callable after retiring epoch',s=>{
 const rows=actualRows(s),saved=Object.getOwnPropertyDescriptor(rows,'find'),original=s.vf.onNestBroken,nest=s.nests()[0];let calls=0;
 s.vf.onNestBroken=function(zone){
  Object.defineProperty(rows,'find',{configurable:true,get(){s.vf.restore({...s.events(),infestations:[]});return()=>{calls++;return undefined;};}});
  try{return Reflect.apply(original,this,[zone]);}finally{if(saved)Object.defineProperty(rows,'find',saved);else delete(rows as {find?:unknown}).find;}
 };
 try{assert.throws(()=>s.kill(nest),/Verminfall.*event changed/);}finally{s.vf.onNestBroken=original;}
 assert(nest.dead);assert.equal(calls,0);assert.equal(s.events().infestations.length,0);assert.equal(s.w.ledger.warren_nests_broken??0,0);
 return{retirementPreserved:true,selectedCallableInvocations:calls};
});

for(const kind of ['getter','callable'] as const)course('selected find '+kind+' reentry preserves one completed inner mutation and refuses the outer write',s=>{
 const rows=actualRows(s),saved=Object.getOwnPropertyDescriptor(rows,'find'),original=s.vf.onNestBroken,nest=s.nests()[0],before=s.events(),broken=s.w.ledger.warren_nests_broken??0;
 let reentered=false,calls=0;
 const invoke=(predicate:(row:NativeEventRow)=>boolean)=>{calls++;return Reflect.apply(Array.prototype.find,rows,[predicate]) as NativeEventRow|undefined;};
 s.vf.onNestBroken=function(zone){
  if(kind==='getter')Object.defineProperty(rows,'find',{configurable:true,get(){
   if(!reentered){reentered=true;Reflect.apply(original,s.vf,[zone]);}
   return invoke;
  }});
  else Object.defineProperty(rows,'find',{configurable:true,value:(predicate:(row:NativeEventRow)=>boolean)=>{
   if(!reentered){reentered=true;Reflect.apply(original,s.vf,[zone]);}
   return invoke(predicate);
  }});
  try{return Reflect.apply(original,this,[zone]);}finally{if(saved)Object.defineProperty(rows,'find',saved);else delete(rows as {find?:unknown}).find;}
 };
 try{assert.throws(()=>s.kill(nest),/selected resolver reentered its mutation/);}finally{s.vf.onNestBroken=original;}
 const expected=structuredClone(before),event=expected.infestations.find(row=>row.id===s.event.id);assert(event);event.nestsBroken++;
 assert(nest.dead);assert(reentered);assert.equal(calls,kind==='getter'?1:2);assert.deepEqual(s.events(),expected,'The original inner mutation survives; no outer second increment');
 assert.equal(s.w.ledger.warren_nests_broken??0,broken,'Outer resolver failed before its later package ledger statement');
 return{kind,selectedFindInvocations:calls,completedNativeIncrements:1,outerWriteRefused:true};
});
// Historical marker-consumption control below is relocated to genuine arrival; original committed source/receipts remain immutable.
course('later factory deletion and throw cannot replay a consumed event after a real partial birth',s=>withWarmArrival(s,(arrive,after)=>{
 const report:any={};
 const replacement=s.replace();assert(replacement.nestsTotal>=2,'Existing replacement seed must naturally provide at least two nests');
 const marker=s.area.assembly.input.registry.input.birth.input.state.materializedInfestation;
 const population=s.area.assembly.input.population,original=population.createMonster;
 const saved=Object.getOwnPropertyDescriptor(population,'createMonster');
 const beforeActors=[...s.w.actors],beforeSeen=s.w.ledger.infestation_seen??0,sentinel=new Error('second-factory-deleted-completed-marker');
 let calls=0,addObserved=false,caught:unknown,partialBody:typeof s.w.player|undefined;
 Object.defineProperty(population,'createMonster',{configurable:true,writable:true,value:function(this:typeof population,...args:Parameters<typeof original>){
  calls++;
  if(calls===1){partialBody=Reflect.apply(original,this,args);return partialBody;}
  assert.equal(calls,2,'Fault exactly at the second actual factory');
  assert(partialBody&&s.w.actors.includes(partialBody),'First actual factory body already inserted');
  assert.equal(s.area.combat.input.authority.require(partialBody).combat,s.area.combat,'First actual body already admitted');
  assert.equal(Reflect.apply(Set.prototype.has,marker,[s.def.id]),true,'Native add completed before the selected later factory');
  addObserved=true;Reflect.apply(Set.prototype.delete,marker,[s.def.id]);throw sentinel;
 }});
 try{try{arrive();}catch(error){caught=error;}}
 finally{if(saved)Object.defineProperty(population,'createMonster',saved);else delete (population as unknown as Record<string,unknown>).createMonster;}
 assert.equal(caught,sentinel,'Preserve exact selected factory sentinel');assert.equal(calls,2);assert.equal(addObserved,true);assert(partialBody);
 assert.equal(Reflect.apply(Set.prototype.has,marker,[s.def.id]),false,'Preserve completed callback deletion immediately');
 assert.equal(partialBody.tag,'warren_nest');assert.equal(s.area.combat.input.authority.require(partialBody).combat,s.area.combat);
 assert.equal(s.w.actors.length,beforeActors.length+1,'Only one completed native body before throw');
 assert(beforeActors.every((body,index)=>s.w.actors[index]===body)&&s.w.actors.at(-1)===partialBody,'Preserve exact previous census plus the real partial nest');
 assert.equal(s.w.ledger.infestation_seen??0,beforeSeen+1,'Preserve completed native discovery');
 const fieldAfterFault=s.events(),afterFaultActors=[...s.w.actors],afterFaultSeen=s.w.ledger.infestation_seen??0;
 report.fault={eventId:replacement.id,nestsTotal:replacement.nestsTotal,exactSentinel:true,factoryCalls:calls,completedAddObserved:addObserved,completedDeletePreserved:true,partialBodyId:partialBody.id,partialBodyAdmitted:true,beforeActorIds:beforeActors.map(body=>body.id),afterFaultActorIds:afterFaultActors.map(body=>body.id),discoveryDelta:afterFaultSeen-beforeSeen,field:fieldAfterFault};
 after(()=>{
  s.live();
  report.retry={actorIds:s.w.actors.map(body=>body.id),addedActorIds:s.w.actors.filter(body=>!afterFaultActors.includes(body)).map(body=>body.id),marker:Reflect.apply(Set.prototype.has,marker,[s.def.id]),seen:s.w.ledger.infestation_seen??0,field:s.events(),worldDrivers:[]};
  assert.deepEqual(s.events(),fieldAfterFault,'Same live event, no replacement before retry');
  assert.equal(s.w.ledger.infestation_seen??0,afterFaultSeen,'Do not repeat discovery');
  report.status=report.retry.addedActorIds.length?'CONSUMPTION_REPLAY_OBSERVED':'NO_REPLAY_OBSERVED';
  assert.equal(s.w.actors.length,afterFaultActors.length,'A completed marker add consumes this event despite a later callback deletion and throw');
  assert(afterFaultActors.every((body,index)=>s.w.actors[index]===body),'Retry preserves exact completed census and partial nest identity');
  report.status='PASS';
 });
 return report;
}));
course('selected nest resolver cannot shadow its active scope after supported replacement',s=>{
 const old=s.nests()[0],original=s.vf.onNestBroken,saved=Object.getOwnPropertyDescriptor(s.vf,'onNestBroken');
 const oldEpoch=s.vf.nativeInfestationEpoch(s.def.id);assert(oldEpoch);
 const beforeKill={kills:s.w.kills,xp:s.w.localSeat.meta.xp,drops:s.w.drops.length};
 let selectedCalls=0,nestedCalls=0,nestedCommits=0,caught:unknown,nestedError:unknown,replacementId='';
 let restored:ReturnType<typeof s.events>|undefined,prefix:{kills:number;xp:number;needed:number;level:number;drops:typeof s.w.drops;ledger:typeof s.w.ledger}|undefined;
 Object.defineProperty(s.vf,'onNestBroken',{configurable:true,writable:true,value:function(this:typeof s.vf,zone:string){
  selectedCalls++;assert.equal(zone,s.def.id);assert(old.dead,'The real generic death prefix completed before the selected package resolver');
  prefix={kills:s.w.kills,xp:s.w.localSeat.meta.xp,needed:s.w.localSeat.meta.xpNeeded,level:s.w.player.level,drops:[...s.w.drops],ledger:structuredClone(s.w.ledger)};
  replacementId=s.replace().id;restored=s.events();
  const epoch=this.nativeInfestationEpoch(zone);assert(epoch);assert.notEqual(epoch,oldEpoch,'Supported restore/devIgnite creates a genuine new current event');
  const active=restored.infestations.find(row=>row.id===replacementId);assert(active);assert.equal(active.nestsBroken,0);
  try{return this.withNativeInfestation(epoch,zone,'nest',()=>{},()=>{nestedCommits++;},()=>{nestedCalls++;return Reflect.apply(original,this,[zone]);});}
  catch(error){nestedError=error;throw error;}
 }});
 try{try{s.kill(old);}catch(error){caught=error;}}
 finally{if(saved)Object.defineProperty(s.vf,'onNestBroken',saved);else delete(s.vf as unknown as Record<string,unknown>).onNestBroken;}
 assert.equal(selectedCalls,1);assert(old.dead);assert(prefix&&restored);assert(caught instanceof Error,'Actual kill must report the failing event boundary');
 assert.equal(s.w.kills,prefix.kills);assert.equal(s.w.localSeat.meta.xp,prefix.xp);assert.equal(s.w.localSeat.meta.xpNeeded,prefix.needed);assert.equal(s.w.player.level,prefix.level);
 assert.deepEqual(s.w.drops,prefix.drops,'Preserve exact completed generic drops without a later package effect');assert.deepEqual(s.w.ledger,prefix.ledger,'Preserve completed prefix ledgers; no later package ledger');
 const after=s.events(),successor=after.infestations.find(row=>row.id===replacementId);assert(successor);
 const details={oldBodyId:old.id,oldEventId:s.event.id,replacementId,selectedCalls,nestedCalls,nestedCommits,oldDeathPreserved:old.dead,genericKillsDelta:prefix.kills-beforeKill.kills,genericXpDelta:prefix.xp-beforeKill.xp,genericDropsDelta:prefix.drops.length-beforeKill.drops,restored,after,error:{name:caught.name,message:caught.message},firstNestedErrorPreserved:!!nestedError&&caught===nestedError};
 assert.deepEqual(after,restored,'An old nest callback must not mutate the supported replacement through a nested native scope');
 assert.equal(successor.nestsBroken,0);assert.equal(nestedCalls,0);assert.equal(nestedCommits,0);
 assert.equal(caught,nestedError,'The nested-scope guard remains the exact first exception');
 assert.match(caught.message,/^Native Verminfall scope cannot reenter$/);
 return details;
});

course('same logical-id restore retains consumed visit and exact warm bodies',s=>{
 const before=s.nests(),life=before[0].life=Math.max(1,before[0].life*.39),seen=s.w.ledger.infestation_seen;
 const old=s.vf.nativeInfestationEpoch(s.def.id),snapshot=s.events();s.vf.restore(snapshot);
 assert.notEqual(s.vf.nativeInfestationEpoch(s.def.id),old);s.live();assert.deepEqual(s.nests(),before);
 s.travel(s.town);s.travel(s.def.id);assert.deepEqual(s.nests(),before);assert.equal(before[0].life,life);assert.equal(s.w.ledger.infestation_seen,seen);
 return{sameLogicalId:s.event.id,objectReplaced:true,exactBodies:true,life};
});
course('arrival without a current event releases visit for one later first claim',s=>{
 s.travel(s.town);s.vf.restore({...s.events(),infestations:[]});s.travel(s.def.id);
 const marker=s.area.assembly.input.registry.input.birth.input.state.materializedInfestation;assert(!marker.has(s.def.id));
 const before=[...s.w.actors],seen=s.w.ledger.infestation_seen??0,replacement=s.replace();s.live();
 const added=s.w.actors.filter(body=>!before.includes(body));assert.equal(added.filter(body=>body.tag==='warren_nest').length,replacement.nestsTotal);
 assert.equal(s.w.ledger.infestation_seen,seen+1);const after=[...s.w.actors];s.live();assert.deepEqual(s.w.actors,after);
 return{replacement:replacement.id,firstClaimPoursOnce:true};
});
course('bare arrival and expired arrival invocation have no authority',s=>{
 const owner=s.area.combat.verminfallLifetime,before=[...s.w.actors],seen=s.w.ledger.infestation_seen;
 assert.throws(()=>owner.arrive(),/selected unclaimed arrival invocation/);
 s.travel(s.town);s.travel(s.def.id);assert.throws(()=>owner.arrive(),/selected unclaimed arrival invocation/);
 assert.deepEqual(s.nests(),before.filter(body=>!body.dead&&body.tag==='warren_nest'));assert.equal(s.w.ledger.infestation_seen,seen);
 return{bareRefused:true,expiredRefused:true};
});
for(const operation of ['delete','add'] as const)course('unhandled arrival marker '+operation+' error escapes, preserves effects and revokes stage',s=>{
 const owner=s.area.combat.verminfallLifetime,original=owner.arrive,saved=Object.getOwnPropertyDescriptor(owner,'arrive');
 const marker=s.area.assembly.input.registry.input.birth.input.state.materializedInfestation,sentinel=new Error('unhandled-arrival-'+operation),later=laterCalls(s);
 let before:typeof s.w.actors=[],seen=0,selected=0;
 s.replace();s.travel(s.town);
 Object.defineProperty(owner,'arrive',{configurable:true,writable:true,value:function(this:typeof owner){
  before=[...s.w.actors];seen=s.w.ledger.infestation_seen??0;
  Object.defineProperty(marker,operation,{configurable:true,value:function(id:string){selected++;Reflect.apply(operation==='delete'?Set.prototype.delete:Set.prototype.add,this,[id]);throw sentinel;}});
  try{return Reflect.apply(original,this,[]);}finally{delete(marker as unknown as Record<string,unknown>)[operation];}
 }});
 let caught:unknown;try{s.travel(s.def.id);}catch(error){caught=error;}
 finally{if(saved)Object.defineProperty(owner,'arrive',saved);else delete(owner as {arrive?:unknown}).arrive;later.restore();}
 assert.equal(caught,sentinel);assert.equal(selected,1);assert.equal(later.count(),0);assert.equal(s.runtime.current,s.area);
 assert.equal(s.area.combat.input.authority.require(s.w.player).combat,s.area.combat);assert.deepEqual(s.w.actors,before);assert.equal(s.w.ledger.infestation_seen??0,seen);
 assert.equal(marker.has(s.def.id),operation==='add');assert.throws(()=>owner.arrive(),/selected unclaimed arrival invocation/);
 s.live();
 if(operation==='add'){assert.deepEqual(s.w.actors,before);assert.equal(s.w.ledger.infestation_seen??0,seen);}
 else{assert.equal(s.w.ledger.infestation_seen,seen+1);assert(s.w.actors.length>before.length);}
 return{operation,exactSentinel:true,laterLeafCalls:later.count(),transferPreserved:true,afterTransitionRetry:operation==='add'?'no replay':'one unused attempt'};
});
for(const kind of ['promise','thenable'] as const)course('selected arrival '+kind+' result refuses later leaves after completed effects',s=>{
 const owner=s.area.combat.verminfallLifetime,original=owner.arrive,saved=Object.getOwnPropertyDescriptor(owner,'arrive'),later=laterCalls(s);
 const replacement=s.replace();s.travel(s.town);let before:typeof s.w.actors=[],seen=0;
 Object.defineProperty(owner,'arrive',{configurable:true,writable:true,value:function(this:typeof owner){
  before=[...s.w.actors];seen=s.w.ledger.infestation_seen??0;Reflect.apply(original,this,[]);
  return kind==='promise'?Promise.resolve():{then(resolve:()=>void){resolve();}};
 }});
 try{assert.throws(()=>s.travel(s.def.id),/arrival must be synchronous/);}
 finally{if(saved)Object.defineProperty(owner,'arrive',saved);else delete(owner as {arrive?:unknown}).arrive;later.restore();}
 assert.equal(later.count(),0);assert.equal(s.runtime.current,s.area);assert.equal(s.w.ledger.infestation_seen,seen+1);
 assert.equal(s.w.actors.filter(body=>!before.includes(body)&&body.tag==='warren_nest').length,replacement.nestsTotal);
 const after=[...s.w.actors];assert.throws(()=>owner.arrive(),/selected unclaimed arrival invocation/);s.live();assert.deepEqual(s.w.actors,after);
 return{kind,completedEffectsKept:true,laterLeafCalls:0,afterTransitionNoReplay:true};
});
for(const kind of ['getter','callable'] as const)course('arrival '+kind+' cannot borrow sibling or live-registry authority',s=>{
 const owner=s.area.combat.verminfallLifetime,original=owner.arrive,saved=Object.getOwnPropertyDescriptor(owner,'arrive'),registry=s.area.assembly.input.registry,registryCall=registry.materializeLiveZoneEvents;
 let registryCalls=0,attempts=0;registry.materializeLiveZoneEvents=function(){registryCalls++;return Reflect.apply(registryCall,this,[]);};
 const refuse=()=>{attempts++;assert.throws(()=>s.area.combat.vendettaLifetime.arrive(),/leaf is selected for Verminfall/);assert.throws(()=>s.area.combat.crusadeLifetime.materializeLiveZoneEvents(),/cannot reenter/);assert.throws(()=>Reflect.apply(original,owner,[]),/arrival cannot reenter|selected unclaimed arrival invocation/);};
 s.travel(s.town);s.replace();
 if(kind==='getter')Object.defineProperty(owner,'arrive',{configurable:true,get(){refuse();return original;}});
 else Object.defineProperty(owner,'arrive',{configurable:true,writable:true,value:function(this:typeof owner){
  const field=s.vf,query=field.infestOn;field.infestOn=function(zone){refuse();return Reflect.apply(query,this,[zone]);};
  try{return Reflect.apply(original,this,[]);}finally{field.infestOn=query;}
 }});
 try{s.travel(s.def.id);}finally{if(saved)Object.defineProperty(owner,'arrive',saved);else delete(owner as {arrive?:unknown}).arrive;registry.materializeLiveZoneEvents=registryCall;}
 assert(attempts>0);assert.equal(registryCalls,0);return{kind,attempts,extraRegistryCalls:registryCalls};
});
course('claim validation reserves entry before selected physical validation can reenter',s=>withWarmArrival(s,arrive=>{
 s.replace();const authority=s.area.combat.input.authority,original=authority.assertFinalPhysical,owner=s.area.combat.verminfallLifetime;
 let injected=false,refusals=0;
 authority.assertFinalPhysical=function(...args:Parameters<typeof original>){
  if(!injected){injected=true;assert.throws(()=>claimNativeVerminfallArrival(s.area.combat.input.coordinator,s.area.combat,owner),/selected unclaimed arrival invocation/);refusals++;assert.throws(()=>arrive(),/arrival cannot reenter|unclaimed arrival/);refusals++;assert.throws(()=>s.area.combat.crusadeLifetime.materializeLiveZoneEvents(),/cannot reenter/);refusals++;}
  return Reflect.apply(original,this,args);
 };
 try{arrive();}finally{authority.assertFinalPhysical=original;}
 assert(injected);assert.equal(refusals,3);return{injected,refusals};
}));
course('initial coordinator validation blocks sibling and registry before callable selection',s=>{
 s.replace();s.travel(s.town);const owner=s.area.combat.verminfallLifetime,c=s.area.combat.input.coordinator,authority=s.area.combat.input.authority,original=authority.assertFinalPhysical;
 const warlord=s.area.combat.warlordArrival,warlordCall=warlord.arrive,warlordSaved=Object.getOwnPropertyDescriptor(warlord,'arrive');
 let armed=false,injected=false,registryCalls=0;const registry=s.area.assembly.input.registry,registryCall=registry.materializeLiveZoneEvents;
 Object.defineProperty(warlord,'arrive',{configurable:true,writable:true,value:function(){const result=Reflect.apply(warlordCall,this,[]);armed=true;return result;}});
 registry.materializeLiveZoneEvents=function(){registryCalls++;return Reflect.apply(registryCall,this,[]);};
 authority.assertFinalPhysical=function(...args:Parameters<typeof original>){
  if(armed&&!injected){injected=true;assert.throws(()=>s.area.combat.vendettaLifetime.arrive(),/leaf is selected for Verminfall/);assert.throws(()=>owner.materializeLiveZoneEvents(),/cannot reenter/);}
  return Reflect.apply(original,this,args);
 };
 try{s.travel(s.def.id);}finally{authority.assertFinalPhysical=original;registry.materializeLiveZoneEvents=registryCall;if(warlordSaved)Object.defineProperty(warlord,'arrive',warlordSaved);else delete(warlord as {arrive?:unknown}).arrive;}
 assert(injected);assert.equal(registryCalls,0);assert.equal(c.published,s.area);return{injected,extraRegistryCalls:0};
});

assert.equal(results.length,46,'35 mapped historical courses plus 11 additive arrival controls');
const report={status:'executed assertions',scope:'Genuine arrival successor: 25 trigger-independent course instances retained; 8 placement faults relocated; 2 timing expectations explicitly superseded; 11 new arrival controls. Actual remote/downed Seat and hosted roads, no TCP dormancy acceptance.',results};writeFileSync(output,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify(report));
