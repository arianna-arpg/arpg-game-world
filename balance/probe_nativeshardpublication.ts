import '../src/engine/world';
import assert from 'node:assert/strict';
import {ShardTransport,SHARD_WIRE_CFG} from '../server/shardTransport';
import {WsTransport,shardResumeFor} from '../src/net/ws';
import {NativeAreaHostedSnapshots} from '../src/worldmass/nativeAreaHostedSnapshots';
import {NativeHostedPublication} from '../src/net/nativeHostedPublication';
import {CLASSES} from '../src/data/classes';
import {RemoteInput} from '../src/net/remote';
import {World,type Seat} from '../src/engine/world';
import type {StateSnapshot,ZoneMsg} from '../src/net/snapshot';
import {nativeCampaignFixture,birthActualNativeArea,mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {COMBAT_WORLD_METHODS,combatHash,writeCombatProof} from './probe_nativecombatcycle';
const setup=nativeCampaignFixture(45927),{writer}=setup,destination=mintAdditionalNativeArea(setup),drivers:string[]=[];
// Install once before native publication and keep the trap across socket awaits.
// Replacing installed publication descriptors would test tampering with the owner.
const saved:{target:object;name:string;descriptor:PropertyDescriptor}[]=[];
for(const target of [World.prototype,writer])for(const name of COMBAT_WORLD_METHODS){const d=Object.getOwnPropertyDescriptor(target,name);if(!d||(typeof d.value!=='function'&&typeof d.get!=='function'))continue;assert(d.configurable);saved.push({target,name,descriptor:d});const refuse=()=>{drivers.push(name);throw Error('World local driver invoked: '+name);};Object.defineProperty(target,name,Object.hasOwn(d,'value')?{...d,value:refuse}:{...d,get:refuse});}
const native=<T>(fn:()=>T):T=>fn();
const {ongoing:a,coordinator,authority}=native(()=>birthActualNativeArea(setup));
writer.localSeat.keeper={reviveSec:5};
const runtime=new NativeAreaHostedSnapshots({writer,coordinator,authority}),net=new ShardTransport(),publisher=new NativeHostedPublication(runtime,net),clients:WsTransport[]=[];
const dormant=new Set<string>();net.onPeerDormant(id=>{dormant.add(id);});net.onPeerResume(id=>{dormant.delete(id);writer.metaDirty.add(id);});
net.log=()=>{};net.setSeedSource(()=>writer.manifest.seed);
net.onPeerJoin(peer=>native(()=>a.combat.party.addSeat(peer.id,CLASSES.find(c=>c.id===peer.classId)!,new RemoteInput(peer.id),{startingCompanions:false,startingFlasks:false})));
const wait=async(fn:()=>boolean)=>{const end=Date.now()+5000;while(!fn()&&Date.now()<end)await new Promise(r=>setTimeout(r,10));assert(fn(),'socket event completed within deadline');};
interface Client {wire:WsTransport;seat:Seat;events:{kind:'zone'|'snap';zoneId:string}[];snapshots:StateSnapshot[];zones:ZoneMsg[]}
try{
 const port=await net.listen(0,'127.0.0.1'),url=`ws://127.0.0.1:${port}`;await net.host({name:'Keeper',classId:'warrior'});
 const join=async(name:string):Promise<Client>=>{const wire=new WsTransport(),events:Client['events']=[],snapshots:StateSnapshot[]=[],zones:ZoneMsg[]=[];clients.push(wire);wire.onZone(z=>{zones.push(z);events.push({kind:'zone',zoneId:z.zoneId});});wire.onState(s=>{snapshots.push(s);events.push({kind:'snap',zoneId:s.zoneId});});const welcome=await wire.connect(url,{name,classId:'warrior'});await wait(()=>writer.seats.some(s=>s.id===welcome.self));return{wire,seat:writer.seats.find(s=>s.id===welcome.self)!,events,snapshots,zones};};
 const A=await join('Aster'),B=await join('Bryn'),recipients=[A.seat,B.seat];assert.equal(net.faults,0);
 native(()=>a.combat.campaignFrame.enableHostedRoads());
 let tick=0;const publish=()=>native(()=>publisher.publish(++tick,recipients));
 publish();await wait(()=>A.snapshots.length===1&&B.snapshots.length===1);for(const c of [A,B]){assert.deepEqual(c.events.map(e=>e.kind),['zone','snap']);assert(c.snapshots[0].seatMeta?.[c.seat.id],'actual fresh socket receives its own full build');}
 const move=(seat:Seat,to:string)=>native(()=>{const from=coordinator.areaFor(authority.require(seat.actor).combat);coordinator.roadsFor(from.combat).shardWorld!.enqueue({seatId:seat.id,dest:to});const result=from.combat.campaignFrame.drainShardRoads();assert.equal(result[0].outcome,'moved');});
 move(B.seat,destination.id);const b=coordinator.areaFor(authority.require(B.seat.actor).combat);assert.notEqual(a,b);B.seat.actor.pos={...A.seat.actor.pos};
 native(()=>{a.assembly.lootController.dropAbilityEssenceAt({...A.seat.actor.pos},1,7,()=>.25);b.assembly.lootController.dropAbilityEssenceAt({...B.seat.actor.pos},1,11,()=>.25);});
 publish();await wait(()=>A.snapshots.length===2&&B.snapshots.length===2);
 const sa=A.snapshots.at(-1)!,sb=B.snapshots.at(-1)!;assert.equal(sa.zoneId,a.combat.scene.zone.id);assert.equal(sb.zoneId,b.combat.scene.zone.id);assert(sa.actors.some(x=>x.id===A.seat.actor.id));assert(!sa.actors.some(x=>x.id===B.seat.actor.id));assert(sb.actors.some(x=>x.id===B.seat.actor.id));assert(!sb.actors.some(x=>x.id===A.seat.actor.id));assert(sa.drops.some(x=>x.cnt===7)&&!sa.drops.some(x=>x.cnt===11));assert(sb.drops.some(x=>x.cnt===11)&&!sb.drops.some(x=>x.cnt===7));assert(!sa.seatMeta?.[B.seat.id]&&!sb.seatMeta?.[A.seat.id]);
 const conns=Reflect.get(net,'bySeat') as Map<string,{sock:import('node:net').Socket;sentTick:number}>;
 move(B.seat,a.combat.scene.zone.id);const conn=conns.get(B.seat.id)!,beforeEvents=B.events.length,beforeStamp=conn.sentTick,cap=Object.getOwnPropertyDescriptor(conn.sock,'writableLength');
 Object.defineProperty(conn.sock,'writableLength',{configurable:true,value:SHARD_WIRE_CFG.sendBufferCap});
 try{const held=publish().find(r=>r.seatId===B.seat.id)!;assert.equal(held.zoneSent,false);assert.equal(held.stateSent,false);assert.equal(conn.sentTick,beforeStamp);}finally{if(cap)Object.defineProperty(conn.sock,'writableLength',cap);else Reflect.deleteProperty(conn.sock,'writableLength');}
 await wait(()=>A.snapshots.length===3);assert.equal(B.events.length,beforeEvents);
 publish();await wait(()=>B.events.length===beforeEvents+2);assert.deepEqual(B.events.slice(-2).map(e=>e.kind),['zone','snap']);
 const oldEpoch=net.deliveryEpochForSeat(B.seat.id),beforeResume=B.events.length,body=B.seat.actor;assert(oldEpoch);
 const token=shardResumeFor(url);assert(token&&token.seat===B.seat.id);assert(!net.isDormant(B.seat.id));
 const replacement=new WsTransport();clients.push(replacement);replacement.onZone(z=>{B.zones.push(z);B.events.push({kind:'zone',zoneId:z.zoneId});});replacement.onState(s=>{B.snapshots.push(s);B.events.push({kind:'snap',zoneId:s.zoneId});});
 const resumed=await replacement.connect(url,{name:'Bryn',classId:'warrior'},undefined,token,{resumeOnly:true});assert(resumed.resumed);assert.equal(resumed.self,B.seat.id);B.wire=replacement;
 assert.notEqual(net.deliveryEpochForSeat(B.seat.id),oldEpoch);assert.equal(B.seat.actor,body);assert.equal(writer.seats.filter(s=>s===B.seat).length,1);
 assert.equal(net.sendZoneToSeat(B.zones.at(-1)!,B.seat.id,oldEpoch),false);assert.equal(net.sendStateToSeat(B.snapshots.at(-1)!,B.seat.id,oldEpoch),false);
 // Even with the current socket token, state cannot precede this socket's terrain.
 assert.equal(net.sendStateToSeat(B.snapshots.at(-1)!,B.seat.id,net.deliveryEpochForSeat(B.seat.id)),false);
 publish();await wait(()=>B.events.length===beforeResume+2);assert.deepEqual(B.events.slice(-2).map(e=>e.kind),['zone','snap']);assert.equal(B.events.at(-1)!.zoneId,a.combat.scene.zone.id);assert(B.snapshots.at(-1)!.seatMeta?.[B.seat.id],'actual replacement socket receives refreshed own build');
 const live=conns.get(B.seat.id)!,write=Object.getOwnPropertyDescriptor(live.sock,'write'),stamp=live.sentTick,beforeThrow=B.events.length;
 Object.defineProperty(live.sock,'write',{configurable:true,value:()=>{throw Error('simulated socket write failure');}});
 try{assert.equal(publish().find(r=>r.seatId===B.seat.id)!.stateSent,false);assert.equal(live.sentTick,stamp);}finally{if(write)Object.defineProperty(live.sock,'write',write);else Reflect.deleteProperty(live.sock,'write');}
 publish();await wait(()=>B.events.length===beforeThrow+1);assert.equal(B.events.at(-1)!.kind,'snap');
 (Reflect.get(B.wire,'ws') as WebSocket).close();await wait(()=>net.isDormant(B.seat.id));assert(dormant.has(B.seat.id));assert.equal(net.deliveryEpochForSeat(B.seat.id),null);assert.equal(publish().find(r=>r.seatId===B.seat.id)!.stateSent,false);
 const beforeDormantResume=B.events.length;assert.deepEqual(await B.wire.resumeInPlace(),{ok:true});publish();await wait(()=>B.events.length===beforeDormantResume+2);assert.deepEqual(B.events.slice(-2).map(e=>e.kind),['zone','snap']);
 assert(B.snapshots.at(-1)!.seatMeta?.[B.seat.id],'dormant resume receives refreshed own build');
 assert.equal(net.faults,0);assert.deepEqual(drivers,[]);
 const result={actualWebSocketClients:2,genuineLaterPartyInsertion:true,actualSplitTravel:true,equalCoordinatesIsolated:true,areaDropsIsolated:true,ownMetadataIsolated:true,ownMetadataOnJoinAndBothResumes:true,actualReturn:true,forcedSocketBackpressureRetry:true,writeFailureDoesNotStamp:true,liveSocketReplacement:true,dormantSocketReplacement:true,staleEpochRefused:true,terrainBeforeStateOnEachSocket:true,legacyWorldDrivers:drivers};
 writeCombatProof('native-shard-publication.json',{scope:'Real ShardTransport TCP and two WsTransport clients over actual retained areas. Initial local fixture predates server keeper integration; socket congestion and write throw are injected on real sockets. Does not establish dedicated ShardHost, upload, persistence or scale parity.',result,receipt:combatHash(JSON.stringify(result))});console.log(JSON.stringify(result));
}finally{await net.close();for(const client of clients)client.leave();coordinator.retire();for(const row of saved.reverse())Object.defineProperty(row.target,row.name,row.descriptor);}
