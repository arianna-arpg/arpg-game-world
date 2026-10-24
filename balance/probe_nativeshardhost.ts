import assert from 'node:assert/strict';
import {NativeShardHost} from '../server/nativeShardHost';
import {WsTransport,shardResumeFor} from '../src/net/ws';
import {World,type Seat} from '../src/engine/world';
import type {StateSnapshot} from '../src/net/snapshot';
import {COOP_SCALING} from '../src/data/coop';
import {mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {COMBAT_WORLD_METHODS,combatHash,writeCombatProof} from './probe_nativecombatcycle';
const drivers:string[]=[],traps:{name:string;descriptor:PropertyDescriptor}[]=[],clients:WsTransport[]=[];
for(const name of COMBAT_WORLD_METHODS){const descriptor=Object.getOwnPropertyDescriptor(World.prototype,name);if(!descriptor||(typeof descriptor.value!=='function'&&typeof descriptor.get!=='function'))continue;assert(descriptor.configurable);traps.push({name,descriptor});const refuse=()=>{drivers.push(name);throw Error('World local driver invoked: '+name);};Object.defineProperty(World.prototype,name,Object.hasOwn(descriptor,'value')?{...descriptor,value:refuse}:{...descriptor,get:refuse});}
let host:NativeShardHost|undefined;
const logs:string[]=[];
const wait=async(fn:()=>boolean,label:string)=>{const until=Date.now()+8000;while(!fn()&&Date.now()<until)await new Promise(r=>setTimeout(r,10));assert(fn(),label+'; '+logs.slice(-3).join('\n'));};
try {
 const radius=COOP_SCALING.shareRadius;
 host=new NativeShardHost({seed:45927,saveDir:null,log:line=>logs.push(line)});const h=host;
 assert.equal(COOP_SCALING.shareRadius,radius);assert.equal(h.runtime.ready,true);
 const keeper=h.keeper,keeperBody=keeper.actor,keeperPos={...keeperBody.pos},home=h.runtime.current;
 const destination=mintAdditionalNativeArea({writer:h.world,geography:h.runtime.geography,definition:h.runtime.definition});
 const port=await h.listen(0,'127.0.0.1'),url=`ws://127.0.0.1:${port}`;
 const join=async(name:string)=>{const wire=new WsTransport(),states:StateSnapshot[]=[],events:string[]=[];clients.push(wire);wire.onZone(z=>events.push('zone:'+z.zoneId));wire.onState(s=>{states.push(s);events.push('state:'+s.zoneId);});const welcome=await wire.connect(url,{name,classId:'warrior',accountId:'host-test-'+name});await wait(()=>!!h.seats.seatOf(welcome.self),'actual join admitted');return {wire,seat:h.seats.seatOf(welcome.self)!,states,events};};
 const A=await join('Aster'),B=await join('Bryn');assert.notEqual(A.seat.actor,B.seat.actor);assert.equal(h.seats.allSeats().length,2);assert.equal(h.areaOf(A.seat),home);assert.equal(h.areaOf(B.seat),home);assert.equal(COOP_SCALING.shareRadius,radius);
 for(let n=0;n<3;n++){const frame=h.tick(1/60);assert.deepEqual(frame.faults,[],logs.join('\n'));}
 await wait(()=>A.states.length>0&&B.states.length>0,'initial targeted states');assert.equal(h.faults,0,logs.join('\n'));assert.equal(h.net.faults,0,logs.join('\n'));
 assert.equal(A.events[0],'zone:'+home.combat.scene.zone.id);assert.equal(B.events[0],'zone:'+home.combat.scene.zone.id);
 assert(A.states[0].actors.some(a=>a.id===B.seat.actor.id),'neighbors share the same landscape');
 A.wire.sendSession({t:'party',op:'invite',seat:B.seat.id});await wait(()=>!!h.parties.inviteFor(B.seat.id),'actual invite');B.wire.sendSession({t:'party',op:'accept'});await wait(()=>h.parties.membersOf(A.seat.id).includes(B.seat.id),'actual party acceptance');
 const original=[...A.seat.actor.skills],before={...A.seat.actor.pos};let actions=0;const off=h.net.onSession(m=>{if(m.t==='action')actions++;});
 A.wire.sendInput(A.seat.id,{dx:1,dy:0,aim:{...before},held:[],edge:[],seq:7,dt:1/60});A.wire.sendSession({t:'action',action:{t:'swapSkillSlots',a:0,b:1},seq:1});
 await wait(()=>actions===1&&(Reflect.get(h.net,'pending') as Map<string,unknown>).has(A.seat.id),'actual input and action');
 const time=h.world.time,clock=Reflect.get(h.world,'inputClock') as number,frame=h.tick(1/60,.04);assert.deepEqual(frame.faults,[]);assert.equal(h.world.time,time+1/60);assert.equal(Reflect.get(h.world,'inputClock'),clock+.04);assert.equal(A.seat.actor.skills[0],original[1]);assert.notDeepEqual(A.seat.actor.pos,before);assert.equal(A.seat.actor.untargetable,false);assert.equal(B.seat.actor.untargetable,true);
 const move=(seat:Seat,dest:string)=>{const area=h.areaOf(seat);h.coordinator.roadsFor(area.combat).shardWorld!.enqueue({seatId:seat.id,dest});const rows=area.combat.campaignFrame.drainShardRoads();assert.equal(rows[0]?.outcome,'moved',JSON.stringify(rows.map(row=>({...row,error:'error' in row?String(row.error):undefined}))));};
 move(B.seat,destination.id);const remote=h.areaOf(B.seat);assert.notEqual(remote,home);assert.equal(h.areaOf(A.seat),home);assert.equal(h.runtime.current,home);assert.equal(h.keeper.actor,keeperBody);assert.deepEqual(keeperBody.pos,keeperPos);
 A.states.length=0;B.states.length=0;for(let n=0;n<3;n++)assert.deepEqual(h.tick(1/60).faults,[]);await wait(()=>A.states.length>0&&B.states.length>0,'separate area states');assert.equal(B.states.at(-1)!.zoneId,destination.id);assert(!A.states.at(-1)!.actors.some(a=>a.id===B.seat.actor.id));assert(!B.states.at(-1)!.actors.some(a=>a.id===A.seat.actor.id));
 // A genuine replacement connection keeps its remote seat and resets echoes.
 const token=shardResumeFor(url)!;assert.equal(token.seat,B.seat.id);const resumed=new WsTransport();clients.push(resumed);const resumedStates:StateSnapshot[]=[];resumed.onState(s=>resumedStates.push(s));const welcome=await resumed.connect(url,{name:'Bryn',classId:'warrior'},undefined,token,{resumeOnly:true});assert(welcome.resumed);assert.equal(welcome.self,B.seat.id);assert.equal(h.seats.seatOf(B.seat.id),B.seat);assert.equal(h.areaOf(B.seat),remote);
 for(let n=0;n<3;n++)assert.deepEqual(h.tick(1/60).faults,[]);await wait(()=>resumedStates.length>0,'resumed state');assert.equal(resumedStates.at(-1)!.zoneId,destination.id);assert(resumedStates.at(-1)!.seatMeta?.[B.seat.id]);
 move(B.seat,home.combat.scene.zone.id);assert.equal(h.areaOf(B.seat),home);assert.equal(h.areaOf(A.seat),home);assert.equal(h.faults,0,logs.join('\n'));assert.equal(h.net.faults,0,logs.join('\n'));assert.equal(COOP_SCALING.shareRadius,radius);assert.deepEqual(drivers,[]);off();
 const result={actualHost:true,actualSocketClients:2,neighborsSeeEachOther:true,joinParty:true,ownAreaInputsAndActions:true,oneCampaignClock:true,wallInputBudgetOnce:true,spawnGrace:true,splitAndReturn:true,remoteResume:true,keeperStationary:true,globalRadiusRestored:true,hostFaults:h.faults,transportFaults:h.net.faults,worldDrivers:drivers};
 await h.stop({persist:false});assert.equal(h.runtime.ready,false);assert.equal(h.net.connectionCount(),0);await h.stop({persist:false});assert.throws(()=>h.tick(1/60),/current state/);assert.equal(COOP_SCALING.shareRadius,radius);
 writeCombatProof('native-shard-host.json',{scope:'Actual retained server host, two TCP clients, social party, input/actions, split/return, resume and clean shutdown. Persistence, death and delayed muster are separate courses.',result,receipt:combatHash(JSON.stringify(result))});console.log(JSON.stringify(result));
}finally {if(host)await host.stop({persist:false}).catch(error=>console.error('cleanup',error));for(const client of clients)client.leave();for(const row of traps.reverse())Object.defineProperty(World.prototype,row.name,row.descriptor);}
