import assert from 'node:assert/strict';
import {SKILLS} from '../src/data/skills';
import {makeSkillInstance} from '../src/engine/skills';
import {withSeededRandom} from '../src/core/rng';
import {NativeAreaCampaignSession} from '../src/worldmass/nativeAreaCampaignSession';
import {NativeAreaActorAuthority} from '../src/worldmass/nativeAreaActorAuthority';
import {NativeAreaMemoryRegistry} from '../src/worldmass/nativeAreaMemoryRegistry';
import {NativeAreaMaddenLedger} from '../src/worldmass/nativeAreaMaddenLedger';
import {NativeAreaSceneTransitionCoordinator} from '../src/worldmass/nativeAreaSceneTransitionCoordinator';
import {NativeAreaSceneOngoing,freshAreaOngoingState,type NativeAreaOngoingRuntime} from '../src/worldmass/nativeAreaSceneOngoing';
import {nativeCampaignFixture,mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {freshAssemblyInput} from './nativeFreshAssemblyFixture';
import {refuseWorldCombat,writeCombatProof,combatHash} from './probe_nativecombatcycle';
function nativeCarry(setup:ReturnType<typeof nativeCampaignFixture>){const {writer,definition}=setup;writer.loadZone(definition.id);const home=writer.player,inst=makeSkillInstance(SKILLS.form_of_the_dire_wolf,1),effect=inst.def.effects.find(fx=>fx.type==='shapeshift');assert.ok(effect&&effect.type==='shapeshift');Reflect.apply(writer['shapeshiftPress'],writer,[home,inst,effect.shift]);const body=writer.player;assert.equal(writer.localSeat.home,home);assert.notEqual(body,home);assert.equal(body.defId,'dire_wolf');return{home,body,inst};}

function prepared(setup:ReturnType<typeof nativeCampaignFixture>){
 const {writer,definition,geography}=setup,raw=freshAssemblyInput(writer,definition),session=new NativeAreaCampaignSession(writer),campaign=session.campaign,authority=new NativeAreaActorAuthority<NativeAreaOngoingRuntime>(campaign),memoryRegistry=new NativeAreaMemoryRegistry(writer),coordinator=new NativeAreaSceneTransitionCoordinator({campaign,characterWriter:writer,authority,memoryRegistry});session.bindCoordinator(coordinator);
 const maddenLedger=new NativeAreaMaddenLedger({campaign,authority,banks:writer['maddenBanks']}),area=new NativeAreaSceneOngoing({...raw,campaign,authority,coordinator,maddenLedger,characterWriter:writer,...freshAreaOngoingState(campaign.time)}),source=area.assembly.sourceSession(geography);
 session.duringPreparation(area,()=>{const p=area.assembly.prepare(source,source.issue(definition.id),{x:definition.size.w/2,y:definition.size.h/2},false);writer.player.pos=area.assembly.input.geometry.clampPos({...p.spawnAt??p.entry},writer.player.radius);area.assembly.birth();});return{area,authority,campaign,coordinator,maddenLedger};
}
const results=withSeededRandom(45971,()=>['census','cohort','lifecycle','inherited-relay','relay-attributes','late-cohort','late-relay','late-claim-conflict','native-deed-error'].map(mode=>{
 const setup=nativeCampaignFixture(),defB=mode==='late-claim-conflict'?mintAdditionalNativeArea(setup):undefined,{home,body}=nativeCarry(setup);
 return refuseWorldCombat([setup.writer],worldDrivers=>{
  const {writer}=setup,{area,authority,campaign,coordinator,maddenLedger}=prepared(setup),census=area.assembly.input.scene.actors,bodies=[...census],ride=body.possession!,rideId=ride.seatId,relayRows=[...bodies,home].map(actor=>({actor,slot:Object.getOwnPropertyDescriptor(actor,'statusRelay')}));
  const restore:(()=>void)[]=[],sentinel=Error('selected native post-admission deed callback'),seatSlot=Object.getOwnPropertyDescriptor(writer,'seats')!;let calls=0,reads=0,externalClaim:typeof body|undefined;
  const poison=()=>{calls++;ride.seatId='forged-final-callback';throw Error('selected final infrastructure callback');};
  const shadow=(o:object,key:PropertyKey,descriptor:PropertyDescriptor)=>{const before=Object.getOwnPropertyDescriptor(o,key);Object.defineProperty(o,key,{configurable:true,...descriptor});restore.push(()=>{if(before)Object.defineProperty(o,key,before);else Reflect.deleteProperty(o,key);});};
  const rawHooks=(rows:typeof bodies)=>{shadow(rows,'includes',{value:poison});shadow(rows,Symbol.iterator,{value:poison});};
  if(mode==='census')rawHooks(census);
  if(mode==='cohort')rawHooks(bodies);
  if(mode==='lifecycle'){
   for(const key of ['claim','claimFinal','bindingFor','assertAdmitted'])shadow(authority,key,{value:poison});
   shadow(area.assembly,'activatePresence',{value:poison});shadow(area.assembly,'phase',{get:poison});
   for(const key of ['activate','activateFinal','assertFinalActivation'])shadow(area.assembly.scenePresence,key,{value:poison});shadow(area.assembly.scenePresence,'active',{get:poison});
   for(const key of ['prepareActivation','assertActivation','activate'])shadow(area.combat,key,{value:poison});
   assert.throws(()=>Object.defineProperty(area.assembly.input.population.factory,'relayStatus',{get:poison}));
   assert.throws(()=>Object.defineProperty(area.assembly.input.population,'relay',{get:poison}));
  }
  if(mode==='inherited-relay'){const prototype=Object.getPrototypeOf(body);Object.setPrototypeOf(body,Object.create(prototype,{statusRelay:{configurable:true,set:poison,get:poison}}));Reflect.deleteProperty(body,'statusRelay');restore.push(()=>Object.setPrototypeOf(body,prototype));}
  if(mode==='relay-attributes')Object.defineProperty(body,'statusRelay',{value:body.statusRelay,writable:true,enumerable:false,configurable:false});
  if(mode==='late-cohort')shadow(writer,'seats',{get(){reads++;bodies[0]=home;return seatSlot.value;}});
  if(mode==='late-relay')shadow(writer,'seats',{get(){reads++;Object.defineProperty(body,'statusRelay',{configurable:true,get:poison,set:poison});return seatSlot.value;}});
  if(mode==='late-claim-conflict'){
   const peerRaw=freshAssemblyInput(writer,defB!),peer=new NativeAreaSceneOngoing({...peerRaw,campaign,authority,coordinator,maddenLedger,characterWriter:writer,...freshAreaOngoingState(campaign.time)}),peerCensus=peer.assembly.input.scene.actors;externalClaim=bodies[bodies.length-1];peerCensus.splice(0,peerCensus.length,externalClaim);
   shadow(writer,'seats',{get(){reads++;authority.claim(peer.binding,[externalClaim!]);return seatSlot.value;}});
  }
  if(mode==='native-deed-error')shadow(writer,'seats',{get(){if(++reads>1)throw sentinel;return seatSlot.value;}});
  let error:unknown;try{area.admit(bodies);}catch(e){error=e;}finally{for(let i=restore.length-1;i>=0;i--)restore[i]();}
  assert.equal(calls,0,'final infrastructure must not select instance/array hooks');assert.equal(ride.seatId,rideId);
  const refusal=mode.startsWith('late-');if(refusal){assert.ok(error);assert.equal(reads,1);for(const row of relayRows){if(row.actor!==externalClaim)authority.assertUnclaimed(row.actor);if(mode!=='late-relay'||row.actor!==body)assert.deepEqual(Object.getOwnPropertyDescriptor(row.actor,'statusRelay'),row.slot);}assert.equal(area.assembly.scenePresence.active,false);}
  else {if(mode==='native-deed-error')assert.equal(error,sentinel,'native callback identity/earlier effects remain');else assert.equal(error,undefined);authority.assertFinalPhysical(area.binding,census);assert.equal(area.assembly.scenePresence.active,true);for(const row of relayRows)assert.equal(row.actor.statusRelay,area.assembly.input.population.factory.relayStatus);assert.equal(authority.require(home).combat,area.combat);}
  if(mode==='relay-attributes'){const slot=Object.getOwnPropertyDescriptor(body,'statusRelay')!;assert.equal(slot.enumerable,false);assert.equal(slot.configurable,false);assert.equal(slot.writable,true);}
  if(mode==='late-relay')Object.defineProperty(body,'statusRelay',relayRows.find(row=>row.actor===body)!.slot!);
  assert.deepEqual(worldDrivers,[]);return{mode,calls,refused:refusal,nativePartial:mode==='native-deed-error',worldDrivers};
 });
}));
const report={scope:'Actual carried admission has a callback-free claim, routing and presence boundary; genuine later deed work preserves its native partial effects.',results,receipt:combatHash(JSON.stringify(results))};writeCombatProof('native-carried-admission-final.json',report);console.log(JSON.stringify(report));
