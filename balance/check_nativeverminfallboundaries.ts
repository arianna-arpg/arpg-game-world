import {placeZoneAt} from '../src/engine/worldgen';
import {RemoteInput} from '../src/net/remote';
import {CLASSES} from '../src/data/classes';
import {NativeAreaCombatOperation} from '../src/worldmass/nativeAreaCombatOperation';
import {killRules} from '../src/engine/killHandlers';
import {writeFileSync} from 'node:fs';
import {verminfallOutputPath} from './nativeVerminfallFixture';
/** Actual retained Verminfall ownership and failure boundaries.
 * Startup, travel, factories, kills, field writes and insertion are real.
 * Fault courses deliberately replace an overlay or selected callback; these are not natural-play claims. */
import assert from 'node:assert/strict';
import {bootSimEngine,withSeededRandom,refuseWorldStartup,setupVerminfallDraft,type VerminfallDraftSetup} from './nativeVerminfallFixture';
bootSimEngine();
const results:unknown[]=[];
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
course('native marker add then throw stays consumed',s=>{
 s.replace();const marker=s.area.assembly.input.registry.input.birth.input.state.materializedInfestation,error=new Error('marker-add-partial'),actors=[...s.w.actors],seen=s.w.ledger.infestation_seen;
 Object.defineProperty(marker,'add',{configurable:true,value:function(id:string){Reflect.apply(Set.prototype.add,this,[id]);throw error;}});
 try{assert.throws(()=>s.live(),e=>e===error);}finally{delete(marker as {add?:unknown}).add;}
 assert(marker.has(s.def.id));s.live();assert.deepEqual(s.w.actors,actors);assert.equal(s.w.ledger.infestation_seen,seen);return{sameException:true,noReplay:true};
});
course('factory failure preserves marker and discovery without retry',s=>{
 s.replace();const population=s.area.assembly.input.population,original=population.createMonster,error=new Error('factory'),actors=[...s.w.actors],seen=s.w.ledger.infestation_seen??0;
 population.createMonster=function(){throw error;};
 try{assert.throws(()=>s.live(),e=>e===error);}finally{population.createMonster=original;}
 assert.equal(s.w.ledger.infestation_seen,seen+1);s.live();assert.deepEqual(s.w.actors,actors);assert.equal(s.w.ledger.infestation_seen,seen+1);return{noReplay:true};
});
course('partial native nest insertion keeps native-finally admission and does not replay',s=>{
 s.replace();const actors=s.w.actors,before=new Set(actors),original=actors.push,error=new Error('nest-insertion');let inserted:typeof s.w.player|undefined;
 Object.defineProperty(actors,'push',{configurable:true,value:function(...items:typeof actors){const result=Reflect.apply(original,this,items);const nest=items.find(x=>x.tag==='warren_nest'&&!before.has(x));if(nest){inserted=nest;throw error;}return result;}});
 try{assert.throws(()=>s.live(),e=>e===error);}finally{delete(actors as {push?:unknown}).push;}
 assert(inserted&&actors.includes(inserted));const partial=[...actors],seen=s.w.ledger.infestation_seen;
 // The explicit observe hook was not reached, but the existing admission frame
 // publishes pending inserted bodies in its native finally. Preserve that policy.
 assert.equal(s.area.combat.input.authority.require(inserted).combat,s.area.combat);
 s.live();assert.deepEqual(actors,partial);assert.equal(s.w.ledger.infestation_seen,seen);
 return{inserted:inserted.id,exactException:true,nativeFinallyAdmission:true,noReplay:true};
});
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
for(const name of ['markDiscovered','surge'] as const)course('placement getter replacement refuses selected '+name+' callback',s=>{
 s.replace();const original=s.vf[name],saved=Object.getOwnPropertyDescriptor(s.vf,name);let calls=0;
 Object.defineProperty(s.vf,name,{configurable:true,get(){s.vf.restore({...s.events(),infestations:[]});return function(){calls++;return Reflect.apply(original,s.vf,arguments as unknown as []);};}});
 try{assert.throws(()=>s.live(),/Verminfall.*changed/);}finally{if(saved)Object.defineProperty(s.vf,name,saved);else delete(s.vf as unknown as Record<string,unknown>)[name];}
 assert.equal(calls,0,'selected custom callable is refused before invocation');return{name,calls};
});
for(const name of ['onNestBroken','onKingSlain'] as const)course('kill getter replacement refuses selected '+name+' callback',s=>{
 let body=s.nests()[0];if(name==='onKingSlain'){for(const nest of s.nests())s.kill(nest);body=s.king()!;assert(body);}
 const saved=Object.getOwnPropertyDescriptor(s.vf,name);let calls=0;
 Object.defineProperty(s.vf,name,{configurable:true,get(){s.replace();return function(){calls++;return name==='onNestBroken'?{remaining:0,kingReady:true}:true;};}});
 try{assert.throws(()=>s.kill(body),/Verminfall.*event changed/);}finally{if(saved)Object.defineProperty(s.vf,name,saved);else delete(s.vf as unknown as Record<string,unknown>)[name];}
 assert.equal(calls,0);return{name,calls};
});
course('native marker delete then throw preserves deletion and permits later new-event attempt',s=>{
 s.replace();const marker=s.area.assembly.input.registry.input.birth.input.state.materializedInfestation,error=new Error('marker-delete-partial'),before=s.nests().length,seen=s.w.ledger.infestation_seen??0;
 Object.defineProperty(marker,'delete',{configurable:true,value:function(id:string){Reflect.apply(Set.prototype.delete,this,[id]);throw error;}});
 try{assert.throws(()=>s.live(),e=>e===error);}finally{delete(marker as {delete?:unknown}).delete;}
 assert(!marker.has(s.def.id));assert.equal(s.nests().length,before);s.live();assert(marker.has(s.def.id));assert.equal(s.w.ledger.infestation_seen,seen+1);return{laterAttempt:true};
});
course('selected factory cannot return an older same-population nest',s=>{
 const population=s.area.assembly.input.population,old=population.createMonster('warren_nest',s.def.level,'enemy'),original=population.createMonster;s.replace();
 population.createMonster=function(){return old;};
 try{assert.throws(()=>s.live(),/foreign|reused|selected invocation/);}finally{population.createMonster=original;}
 assert(!s.w.actors.includes(old));return{oldBody:old.id,notAdopted:true};
});
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
 assert.equal(calls,1);if(active)assert(s.w.actors.filter(x=>!x.dead&&x.tag==='warren_nest').length>s.event.nestsTotal);
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


course('remote occupant keeps old cohort and naturally receives the next infestation',s=>{
 const peer=s.area.combat.party.addSeat('verminfall-peer',CLASSES[0],new RemoteInput('verminfall-peer'),{startingCompanions:false});
 peer.actor.invulnerable=true;
 const actors=s.area.assembly.input.scene.actors,sourceDrops=s.area.assembly.input.physical.input.state.drops;
 const nests=()=>actors.filter(x=>!x.dead&&x.tag==='warren_nest'),kings=()=>actors.filter(x=>!x.dead&&x.tag==='rat_king_manifest');
 const oldNests=nests(),vermin=actors.find(x=>!x.dead&&x.tag==='vermin');assert(vermin,'Actual infestation created a surviving vermin cohort');
 const nestWound=oldNests[0].life=Math.max(1,oldNests[0].life*.41),verminWound=vermin.life=Math.max(1,vermin.life*.43);
 const seen=s.w.ledger.infestation_seen??0,cleared=s.w.ledger.infestations_cleared??0;
 const coordinator=s.area.combat.input.coordinator,authority=s.area.combat.input.authority;
 const road=(destination:string)=>{
  const from=s.runtime.current;from.combat.campaignFrame.enableHostedRoads();
  coordinator.runFrom(from,()=>coordinator.roadsFor(from.combat).shardWorld!.enqueue({seatId:s.w.localSeat.id,dest:destination}));
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
 const newNests=nests();assert.equal(newNests.length,successor.nestsTotal);assert(newNests.every(body=>!oldNests.includes(body)));
 assert.equal(s.w.ledger.infestation_seen,seen+1);assert(actors.includes(vermin));assert.equal(vermin.life,verminWound);
 const successorWound=newNests[0].life=Math.max(1,newNests[0].life*.47);road(s.def.id);
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
// Additive only: insert immediately before the existing unique final report; original courses remain exact.
course('later factory deletion and throw cannot replay a consumed event after a real partial birth',s=>{
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
 try{try{s.live();}catch(error){caught=error;}}
 finally{if(saved)Object.defineProperty(population,'createMonster',saved);else delete (population as unknown as Record<string,unknown>).createMonster;}
 assert.equal(caught,sentinel,'Preserve exact selected factory sentinel');assert.equal(calls,2);assert.equal(addObserved,true);assert(partialBody);
 assert.equal(Reflect.apply(Set.prototype.has,marker,[s.def.id]),false,'Preserve completed callback deletion immediately');
 assert.equal(partialBody.tag,'warren_nest');assert.equal(s.area.combat.input.authority.require(partialBody).combat,s.area.combat);
 assert.equal(s.w.actors.length,beforeActors.length+1,'Only one completed native body before throw');
 assert(beforeActors.every((body,index)=>s.w.actors[index]===body)&&s.w.actors.at(-1)===partialBody,'Preserve exact previous census plus the real partial nest');
 assert.equal(s.w.ledger.infestation_seen??0,beforeSeen+1,'Preserve completed native discovery');
 const fieldAfterFault=s.events(),afterFaultActors=[...s.w.actors],afterFaultSeen=s.w.ledger.infestation_seen??0;
 report.fault={eventId:replacement.id,nestsTotal:replacement.nestsTotal,exactSentinel:true,factoryCalls:calls,completedAddObserved:addObserved,completedDeletePreserved:true,partialBodyId:partialBody.id,partialBodyAdmitted:true,beforeActorIds:beforeActors.map(body=>body.id),afterFaultActorIds:afterFaultActors.map(body=>body.id),discoveryDelta:afterFaultSeen-beforeSeen,field:fieldAfterFault};
 s.live();
 report.retry={actorIds:s.w.actors.map(body=>body.id),addedActorIds:s.w.actors.filter(body=>!afterFaultActors.includes(body)).map(body=>body.id),marker:Reflect.apply(Set.prototype.has,marker,[s.def.id]),seen:s.w.ledger.infestation_seen??0,field:s.events(),worldDrivers:[]};
 assert.deepEqual(s.events(),fieldAfterFault,'Same live event, no replacement before retry');
 assert.equal(s.w.ledger.infestation_seen??0,afterFaultSeen,'Do not repeat discovery');
 report.status=report.retry.addedActorIds.length?'CONSUMPTION_REPLAY_OBSERVED':'NO_REPLAY_OBSERVED';
 assert.equal(s.w.actors.length,afterFaultActors.length,'A completed marker add consumes this event despite a later callback deletion and throw');
 assert(afterFaultActors.every((body,index)=>s.w.actors[index]===body),'Retry preserves exact completed census and partial nest identity');
 report.status='PASS';
 return report;
});
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

const report={status:'executed assertions',scope:'Actual retained start and roads; natural remote successor plus explicitly labeled callback/restore faults. No TCP/browser or broad parity claim.',results};writeFileSync(verminfallOutputPath('boundaries-result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
