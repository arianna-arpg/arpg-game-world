import '../src/engine/world';
import assert from 'node:assert/strict';
import {NativeShardRuntime} from '../server/nativeShardRuntime';
import {makeAccount} from '../src/meta/account';
import {CLASSES} from '../src/data/classes';
import {RemoteInput} from '../src/net/remote';
import {COOP_SCALING} from '../src/data/coop';
import {SHARD_CFG} from '../server/shardHost';
import {World,type Seat} from '../src/engine/world';
import {mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {COMBAT_WORLD_METHODS,combatHash,writeCombatProof} from './probe_nativecombatcycle';
const runtime=new NativeShardRuntime({account:makeAccount(),seed:45927}),writer=runtime.writer,saved:{name:string;descriptor:PropertyDescriptor}[]=[],drivers:string[]=[],radius=COOP_SCALING.shareRadius;
for(const name of [...COMBAT_WORLD_METHODS,'settleNearScale']){const d=Object.getOwnPropertyDescriptor(World.prototype,name);if(!d||(typeof d.value!=='function'&&typeof d.get!=='function'))continue;saved.push({name,descriptor:d});const refuse=()=>{drivers.push(name);throw Error('World local driver invoked: '+name);};Object.defineProperty(World.prototype,name,Object.hasOwn(d,'value')?{...d,value:refuse}:{...d,get:refuse});}
try{
 COOP_SCALING.shareRadius=SHARD_CFG.nearRadius;runtime.install();const a=runtime.current,coordinator=a.combat.input.coordinator,authority=a.authority;a.combat.campaignFrame.enableHostedRoads();const d=mintAdditionalNativeArea({writer,geography:runtime.geography,definition:runtime.definition});
 const add=(id:string)=>a.combat.party.addSeat(id,CLASSES.find(c=>c.id==='warrior')!,new RemoteInput(id),{startingCompanions:false,startingFlasks:false}),A=add('near-A'),B=add('near-B'),C=add('near-C');
 const move=(seat:Seat,to:string)=>{const from=coordinator.areaFor(authority.require(seat.actor).combat);coordinator.roadsFor(from.combat).shardWorld!.enqueue({seatId:seat.id,dest:to});assert.equal(from.combat.campaignFrame.drainShardRoads()[0].outcome,'moved');};move(A,d.id);move(B,d.id);const b=coordinator.areaFor(authority.require(A.actor).combat),enemy=b.combat.scene.actors.find(x=>x.team==='enemy'&&!x.dead&&!x.owner)!;assert(enemy,'generated destination has actual enemy');
 const at={...enemy.pos};A.actor.pos={...at};B.actor.pos={x:at.x+SHARD_CFG.nearRadius+100,y:at.y};C.actor.pos={...at};runtime.keeper.actor.pos={...at};
 b.combat.settleNearScale(true);const soloMax=enemy.maxLife();enemy.life=soloMax*.43;const wounded=enemy.life;
 B.actor.pos={...at};b.combat.settleNearScale(true);const pairMax=enemy.maxLife();assert(pairMax>soloMax);assert.equal(enemy.life,Math.min(pairMax,Math.max(1,Math.round(pairMax*wounded/soloMax))));
 const pairLife=enemy.life;move(B,a.combat.scene.zone.id);const otherActors=a.combat.scene.actors.map(x=>({actor:x,life:x.life,max:x.maxLife()}));b.combat.settleNearScale(true);assert.equal(enemy.maxLife(),soloMax);assert.equal(enemy.life,Math.min(soloMax,Math.max(1,Math.round(soloMax*pairLife/pairMax))));for(const row of otherActors){assert.equal(row.actor.life,row.life);assert.equal(row.actor.maxLife(),row.max);}
 move(B,d.id);B.actor.pos={...at};const q=b.combat.runtimeState.frame.nearScaleDue;q.push(enemy);const beforeQueueLife=enemy.life,beforeQueueMax=enemy.maxLife();b.combat.settleNearScale();assert.equal(q.length,0);assert.equal(enemy.life,Math.min(enemy.maxLife(),Math.max(1,Math.round(enemy.maxLife()*beforeQueueLife/beforeQueueMax))));
 const noQueueLife=enemy.life;b.combat.settleNearScale();assert.equal(enemy.life,noQueueLife);
 const foreignQueue=a.combat.runtimeState.frame.nearScaleDue;foreignQueue.push(enemy);const wrongLife=enemy.life;assert.throws(()=>a.combat.settleNearScale(),/local|foreign|area|authority|belong/i);assert.equal(enemy.life,wrongLife);assert.equal(foreignQueue.length,1,'foreign admission refuses before consuming native queue');foreignQueue.length=0;
 const dead=enemy.dead;enemy.dead=true;const deadLife=enemy.life;B.actor.pos={x:at.x+SHARD_CFG.nearRadius+100,y:at.y};q.push(enemy);const index=b.combat.scene.actors.indexOf(enemy);b.combat.scene.actors.splice(index,1);try{b.combat.settleNearScale();assert.equal(enemy.life,deadLife);assert.equal(q.length,0);}finally{b.combat.scene.actors.splice(index,0,enemy);enemy.dead=dead;}
 const actorRows:unknown[]=[];
 for(const mode of ['set-getter','set-body','remove-getter','remove-body','set-replace','remove-replace'] as const){
  const victim=b.combat.scene.actors.find(x=>x!==enemy&&x.team==='enemy'&&!x.dead&&!x.owner)!;assert(victim,'actual generated enemy for '+mode);
  const removing=mode.startsWith('remove'),key=removing?'removeSource':'setSource',sheet=victim.sheet,original=sheet[key],descriptor=Object.getOwnPropertyDescriptor(sheet,key);
  A.actor.pos={...victim.pos};B.actor.pos=removing?{...victim.pos}:{x:victim.pos.x+SHARD_CFG.nearRadius+100,y:victim.pos.y};q.push(victim);b.combat.settleNearScale();
  B.actor.pos=removing?{x:victim.pos.x+SHARD_CFG.nearRadius+100,y:victim.pos.y}:{...victim.pos};victim.life=victim.maxLife()*.431037;
  const before={life:victim.life,max:victim.maxLife()};let getters=0,calls=0,departures=0,ownApply=0,error:string|null=null,replaced=false;
  const depart=()=>{b.combat.slipAway(victim,'');departures++;};
  const selected=function(this:typeof sheet,...args:unknown[]){calls++;assert.equal(this,sheet);assert.equal(args[0],'partyScale');assert.equal(args.length,removing?1:2);const value=Reflect.apply(original,this,args);if(mode.endsWith('body'))depart();return value;};
  Object.defineProperty(selected,'apply',{get:()=>{ownApply++;throw Error('own apply accessed');}});
  Object.defineProperty(sheet,key,{configurable:true,get:()=>{getters++;if(mode.endsWith('getter'))depart();if(mode.endsWith('replace')){victim.sheet=enemy.sheet;replaced=true;}return selected;}});
  q.push(victim);try{b.combat.settleNearScale();}catch(e){error=String(e);}finally{if(descriptor)Object.defineProperty(sheet,key,descriptor);else Reflect.deleteProperty(sheet,key);if(replaced)victim.sheet=sheet;}
  let retired=false;try{authority.require(victim);}catch{retired=true;}const after={life:victim.life,max:victim.maxLife()};
  assert(error,'actual callback boundary must refuse');assert.equal(getters,1);assert.equal(ownApply,0);assert.equal(q.length,0,'completed queue drain stays');assert.equal(after.life,before.life,'no life write after callback');
  if(mode.endsWith('body')){assert.equal(calls,1);assert(removing?after.max<before.max:after.max>before.max,'completed selected method effect stays');}else{assert.equal(calls,0);assert.equal(after.max,before.max,'stale selected callable never runs');}
  if(replaced){assert.equal(departures,0);assert.equal(retired,false);assert(b.combat.scene.actors.includes(victim));assert.match(error,/sheet changed/);}else{assert.equal(departures,1);assert(retired);assert(!b.combat.scene.actors.includes(victim));}
  actorRows.push({mode,getters,calls,departures,ownApply,error,before,after,queueLength:q.length,retired,stillPresent:b.combat.scene.actors.includes(victim)});
 }
 writeCombatProof('native-shard-near-scale-selection.json',{actorRows,receipt:combatHash(JSON.stringify(actorRows))});console.log('SELECTION '+JSON.stringify(actorRows));assert.deepEqual(drivers,[]);const result={actualGeneratedArea:d.id,soloMax,pairMax,roundedWoundPreserved:true,remotePlayersExcluded:true,keeperExcluded:true,leaveRescalesOnlyArea:true,actualQueueDrained:true,emptyQueueNoop:true,foreignQueueRefusedBeforeConsumption:true,retiredDeadQueueConsumedWithoutChange:true,worldDrivers:drivers};writeCombatProof('native-shard-near-scale-selection-positive.json',{result,receipt:combatHash(JSON.stringify(result))});console.log(JSON.stringify(result));
}finally{runtime.retire();COOP_SCALING.shareRadius=radius;for(const row of saved.reverse())Object.defineProperty(World.prototype,row.name,row.descriptor);}
