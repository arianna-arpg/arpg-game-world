import {NativeShardRuntime} from '../server/nativeShardRuntime';
import {NativeShardSeats} from '../server/nativeShardSeats';
import assert from 'node:assert/strict';
import {makeAccount} from '../src/meta/account';
import {CLASSES} from '../src/data/classes';
import {RemoteInput} from '../src/net/remote';
import {refuseWorldStartup} from './nativeClientStartFixture';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
const results=[];
for(const site of ['quest-set','geometry','pack'] as const)for(const when of ['getter','body'] as const)for(const route of (site==='pack'?['within','keeper'] as const:['within','keeper','direct'] as const)){
 const runtime=new NativeShardRuntime({account:makeAccount(),seed:1231});
 results.push(refuseWorldStartup([],drivers=>{runtime.install();const seats=new NativeShardSeats(runtime),area=runtime.current,cls=CLASSES.find(c=>c.id==='tamer')!,source=seats.keeperWorld().addSeat('id-source',cls,new RemoteInput('id-source')),companion=area.combat.scene.actors.find(a=>a.companion&&a.owner===source.actor)!;assert(companion);const saved=area.progression.companionBonds.saved(companion);seats.within(source.id,v=>v.removeSeat(source.id));const peer=seats.keeperWorld().addSeat('id-peer',cls,new RemoteInput('id-peer'),{startingCompanions:false,startingFlasks:false}),id=peer.id,raw=area.combat.scene.actors,before=raw.length,target=site==='quest-set'?runtime.writer.seatQuests:site==='geometry'?area.assembly.input.geometry:area.combat.serverSeats,key=site==='quest-set'?'set':site==='geometry'?'clampPos':'packQuestLedger',original=Reflect.get(target,key),descriptor=Object.getOwnPropertyDescriptor(target,key);let calls=0,getters=0,ownApply=0;
 const selected=function(this:object,...args:unknown[]){calls++;assert.equal(this,target);const result=Reflect.apply(original,this,args);if(when==='body')peer.id='id-changed';return result;};Object.defineProperty(selected,'apply',{get:()=>{ownApply++;throw Error('own apply accessed');}});
 Object.defineProperty(target,key,{configurable:true,get:()=>{getters++;if(when==='getter')peer.id='id-changed';return selected;}});
 const invoke=(v:ReturnType<NativeShardSeats['keeperWorld']>)=>site==='quest-set'?v.adoptQuestLedger(peer,undefined):site==='geometry'?v.restoreCompanions([saved],peer.actor):v.packQuestLedger(peer,123);
 try{assert.throws(()=>route==='within'?seats.within(id,invoke):route==='keeper'?invoke(seats.keeperWorld()):site==='quest-set'?area.combat.serverSeats.adoptQuestLedger(peer,undefined):area.combat.serverSeats.restoreCompanions(peer,[saved],peer.actor),/character changed/);}finally{if(descriptor)Object.defineProperty(target,key,descriptor);else Reflect.deleteProperty(target,key);}
 assert.equal(peer.id,'id-changed','completed identity mutation is preserved');assert.equal(getters,1);assert.equal(calls,when==='getter'?0:1);assert.equal(ownApply,0);assert.equal(raw.length,before,'no later physical insertion');const quest=runtime.writer.seatQuests.has(id);assert.equal(quest,(site==='quest-set'||site==='pack')&&when==='body','completed native write is preserved: '+site+'/'+when+'/'+route);assert.equal(runtime.writer.seatQuests.has('id-changed'),false);peer.id=id;assert.equal(seats.seatOf(id),peer);seats.within(id,invoke);if(site==='geometry')assert.equal(area.combat.scene.actors.filter(a=>a.companion&&a.owner===peer.actor).length,1);if(site==='quest-set')assert(runtime.writer.seatQuests.has(id));assert.deepEqual(drivers,[]);seats.within(id,v=>v.removeSeat(id));runtime.retire();return{site,when,route,getters,calls,ownApply,quest,actualRetry:true,worldDrivers:drivers};}));
}
writeCombatProof('native-shard-vessel-identity.json',{results,receipt:combatHash(JSON.stringify(results))});console.log(JSON.stringify(results));
