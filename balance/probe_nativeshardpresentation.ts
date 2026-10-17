import '../src/engine/world';
import assert from 'node:assert/strict';
import {NativeShardRuntime} from '../server/nativeShardRuntime';
import {NativeAreaHostedPresentation} from '../src/worldmass/nativeAreaHostedPresentation';
import {makeAccount} from '../src/meta/account';
import {CLASSES} from '../src/data/classes';
import {RemoteInput} from '../src/net/remote';
import {World,type Seat} from '../src/engine/world';
import {mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {COMBAT_WORLD_METHODS,combatHash,writeCombatProof} from './probe_nativecombatcycle';
const runtime=new NativeShardRuntime({account:makeAccount(),seed:45927}),writer=runtime.writer,drivers:string[]=[],saved:{name:string;descriptor:PropertyDescriptor}[]=[];
for(const name of COMBAT_WORLD_METHODS){const descriptor=Object.getOwnPropertyDescriptor(World.prototype,name);if(!descriptor||(typeof descriptor.value!=='function'&&typeof descriptor.get!=='function'))continue;assert(descriptor.configurable);saved.push({name,descriptor});const refuse=()=>{drivers.push(name);throw Error('World local driver invoked: '+name);};Object.defineProperty(World.prototype,name,Object.hasOwn(descriptor,'value')?{...descriptor,value:refuse}:{...descriptor,get:refuse});}
let presentation:NativeAreaHostedPresentation|undefined;
try{
 runtime.install();const a=runtime.current,coordinator=a.combat.input.coordinator,authority=a.authority,definition=mintAdditionalNativeArea({writer,geography:runtime.geography,definition:runtime.definition});a.combat.campaignFrame.enableHostedRoads();
 const add=(id:string)=>a.combat.party.addSeat(id,CLASSES.find(c=>c.id==='warrior')!,new RemoteInput(id),{startingCompanions:false,startingFlasks:false}),A=add('mark-A'),B=add('mark-B'),C=add('mark-C');
 const move=(seat:Seat,to:string)=>{const from=coordinator.areaFor(authority.require(seat.actor).combat);coordinator.roadsFor(from.combat).shardWorld!.enqueue({seatId:seat.id,dest:to});assert.equal(from.combat.campaignFrame.drainShardRoads()[0].outcome,'moved');};move(B,definition.id);move(C,definition.id);const b=coordinator.areaFor(authority.require(B.actor).combat);assert.notEqual(a,b);
 let nested=false,travel=false,swapMeta=false,reads=0;presentation=new NativeAreaHostedPresentation(coordinator,seat=>{reads++;if(swapMeta&&seat===B){swapMeta=false;B.meta=A.meta;}if(nested){nested=false;assert.throws(()=>presentation!.corpseMarks(b.combat,seat),/reenter/);}if(travel&&seat===B){travel=false;move(B,a.combat.scene.zone.id);}return[{zoneId:definition.id,name:'Corpse-'+seat.id,classId:'warrior',level:7}];});
 assert.throws(()=>new NativeAreaHostedPresentation(coordinator,()=>[]),/unused/);
 const ring={x:13,y:27,r:400,party:'remote-party',have:1,need:2,left:17,wait:20};presentation.setMusterRings(b.combat,[ring]);ring.x=999;assert.equal(presentation.musterRings(b.combat)![0].x,13);presentation.musterRings(b.combat)![0].x=999;assert.equal(presentation.musterRings(b.combat)![0].x,13);
 const originalMeta=B.meta;swapMeta=true;writer.journalDirty.add(B.id);try{assert.throws(()=>runtime.hosted.serialize(0,[B]),/recipient changed/);}finally{B.meta=originalMeta;}writer.journalDirty.add(B.id);assert.doesNotThrow(()=>runtime.hosted.serialize(0,[B]));
 writer.dropRuleOf=id=>[A.id,B.id,C.id].includes(id)?{rule:'timed',freeAfterSec:20,allocation:'killer'}:null;
 const loot=b.assembly.lootController,d0=loot.input.physical.input.state.drops.length;loot.dropAbilityEssenceAt({x:B.actor.pos.x+90,y:B.actor.pos.y},1,13,()=>.25);loot.ownSpoils(d0,B);assert.equal(loot.input.physical.input.state.drops[d0].owner,B.id);
 for(const seat of [A,B,C])writer.journalDirty.add(seat.id);nested=true;const deliveries=runtime.hosted.serialize(1,[A,B,C]),one=(id:string)=>deliveries.find(r=>r.seatId===id)!.snapshot;
 assert.equal(one(A.id).mu,undefined);assert.deepEqual(one(B.id).mu,[{...ring,x:13}]);assert.deepEqual(one(C.id).mu,one(B.id).mu);assert.equal(one(B.id).drops[d0].o,B.id);assert.equal(one(B.id).drops[d0].fa,20);assert.equal(one(C.id).drops[d0].o,B.id);assert(!one(A.id).drops.some(d=>d.o===B.id));
 for(const seat of [A,B,C]){const snap=one(seat.id),own=snap.seats![seat.id];assert(own.jn?.pins.some(pin=>pin.title?.includes('Corpse-'+seat.id)));for(const other of [A,B,C].filter(s=>s!==seat))assert(!JSON.stringify(snap).includes('Corpse-'+other.id));}
 assert.throws(()=>presentation!.corpseMarks(a.combat,B),/physical|belong|attend|area/i);
 writer.musterRings=[ring];assert.throws(()=>runtime.hosted.serialize(2,[A,B]),/legacy shard-only/);writer.musterRings=null;writer.seatCorpseMarks=()=>[];writer.journalDirty.add(A.id);writer.journalDirty.add(B.id);assert.throws(()=>runtime.hosted.serialize(3,[A,B]),/legacy shard-only/);writer.seatCorpseMarks=null;
 travel=true;writer.journalDirty.add(B.id);assert.throws(()=>runtime.hosted.serialize(4,[B,C]),/physical|belong|attend|area|changed/i);assert.equal(coordinator.areaFor(authority.require(B.actor).combat),a,'completed native road remains');writer.journalDirty.add(B.id);assert.doesNotThrow(()=>runtime.hosted.serialize(5,[B,C]));
 loot.input.physical.input.state.drops[d0].freeAt=writer.time;const free=runtime.hosted.serialize(6,[C])[0].snapshot.drops[d0];assert.equal(free.o,undefined);assert.equal(free.fa,undefined);
 assert.deepEqual(drivers,[]);presentation.retire();assert.throws(()=>presentation!.musterRings(b.combat),/retired/);assert.equal(runtime.hosted.serialize(7,[C])[0].snapshot.mu,undefined);
 const result={actualGeneratedArea:definition.id,perAreaMuster:true,detachedRows:true,perSeatCorpseJournal:true,unrelatedMarksAbsent:true,originalDropOwner:B.id,timedFreeAfter:20,expiryPreserved:true,legacyWriterGuardsPreserved:true,selectedTravelPreservedAndRejected:true,recovery:true,providerReentryRefused:true,selectedMetadataSwapRefused:true,reads,worldDrivers:drivers};writeCombatProof('native-shard-presentation.json',{scope:'Finite actual area presentation and original drop stamping; actual host lifecycle and muster desk remain separate.',result,receipt:combatHash(JSON.stringify(result))});console.log(JSON.stringify(result));
}finally{presentation?.retire();runtime.retire();for(const row of saved.reverse())Object.defineProperty(World.prototype,row.name,row.descriptor);}
