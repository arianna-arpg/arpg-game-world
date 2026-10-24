import {NativeShardRuntime} from '../server/nativeShardRuntime';
import {NativeShardSeats} from '../server/nativeShardSeats';
import assert from 'node:assert/strict';
import {makeAccount} from '../src/meta/account';
import {CLASSES} from '../src/data/classes';
import {SKILLS} from '../src/data/skills';
import {makeSkillInstance} from '../src/engine/skills';
import {RemoteInput} from '../src/net/remote';
import {refuseWorldStartup} from './nativeClientStartFixture';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
import {throngRowsOf} from '../src/meta/character';
const runtime=new NativeShardRuntime({account:makeAccount(),seed:1231});
const result=refuseWorldStartup([],drivers=>{runtime.install();const seats=new NativeShardSeats(runtime),area=runtime.current,peer=seats.keeperWorld().addSeat('throng-peer',CLASSES.find(c=>c.id==='tamer')!,new RemoteInput('throng-peer'),{startingCompanions:false,startingFlasks:false});
 // Exact skill fixture already used by the native full Continue throng oracle.
 for(const [i,id]of ['gather_cinderkin','raise_gnatveil'].entries()){const inst=makeSkillInstance(SKILLS[id],1);peer.meta.knownSkills.set(id,inst);peer.actor.skills[4+i]=inst;}seats.within(peer.id,w=>w.adoptSeatMeta(peer,peer.meta,peer.actor.skills.map(s=>s?.def.id??null),peer.actor.level));
 const expected=[{skillId:'gather_cinderkin',defId:'cinderkin',level:1,count:2},{skillId:'raise_gnatveil',defId:'gnatling',level:1,count:3}];seats.within(peer.id,w=>w.restoreThrong(expected,peer.actor));const actual=throngRowsOf(seats.worldOf(peer.id)!,peer.actor);assert.equal(actual.length,2);for(const row of expected)assert.equal(actual.find(r=>r.skillId===row.skillId)?.count,row.count);for(const body of area.combat.scene.actors.filter(a=>a.owner===peer.actor))assert.equal(area.authority.require(body).combat,area.combat);
 const saved={at:123,active:[],completed:['first_blood'],keys:{ordinary:2},leads:['first_blood'],imbues:[]};seats.within(peer.id,w=>w.adoptQuestLedger(peer,saved));const packed=seats.within(peer.id,w=>w.packQuestLedger(peer,123))!;assert.deepEqual(packed.completed,saved.completed);assert.deepEqual(packed.keys,saved.keys);assert.deepEqual(packed.leads,saved.leads);
 const coordinator=area.combat.input.coordinator;area.combat.campaignFrame.enableHostedRoads();coordinator.roadsFor(area.combat).shardWorld!.enqueue({seatId:peer.id,dest:'crossroads'});const moved=area.combat.campaignFrame.drainShardRoads()[0];if(moved.outcome==='failed')throw moved.error;assert.equal(moved.outcome,'moved');assert.equal(seats.worldOf(peer.id)!.zone.id,'crossroads');const there=throngRowsOf(seats.worldOf(peer.id)!,peer.actor);assert.deepEqual(there,actual);assert.deepEqual(seats.within(peer.id,w=>w.packQuestLedger(peer,123)),packed);seats.within(peer.id,w=>w.removeSeat(peer.id));assert.equal(seats.seatOf(peer.id),undefined);assert.deepEqual(drivers,[]);runtime.retire();return{actual,questCompleted:packed.completed,remoteThrongPreserved:true,worldDrivers:drivers};});
writeCombatProof('native-shard-vessel-throng.json',{result,receipt:combatHash(JSON.stringify(result))});console.log(JSON.stringify(result));
