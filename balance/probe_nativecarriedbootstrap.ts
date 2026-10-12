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
import {nativeCampaignFixture,birthActualNativeArea,mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {freshAssemblyInput} from './nativeFreshAssemblyFixture';
import {refuseWorldCombat,writeCombatProof,combatHash} from './probe_nativecombatcycle';
function nativeCarry(setup:ReturnType<typeof nativeCampaignFixture>){const {writer,definition}=setup;writer.loadZone(definition.id);const home=writer.player,inst=makeSkillInstance(SKILLS.form_of_the_dire_wolf,1),effect=inst.def.effects.find(fx=>fx.type==='shapeshift');assert.ok(effect&&effect.type==='shapeshift');Reflect.apply(writer['shapeshiftPress'],writer,[home,inst,effect.shift]);const body=writer.player;assert.equal(writer.localSeat.home,home);assert.notEqual(body,home);assert.equal(body.defId,'dire_wolf');return{home,body,inst};}
const results=withSeededRandom(45971,()=>{
 const rows:unknown[]=[];
 {const setup=nativeCampaignFixture(),defB=mintAdditionalNativeArea(setup),{home,body}=nativeCarry(setup);rows.push(refuseWorldCombat([setup.writer],worldDrivers=>{const {writer,ongoing:a,coordinator,authority}=birthActualNativeArea(setup);assert.equal(authority.require(home).combat,a.combat);assert.equal(authority.require(body).combat,a.combat);assert(!a.assembly.input.scene.actors.includes(home));authority.assertUnclaimed(home);coordinator.runFrom(a,()=>coordinator.loadZone(defB.id,setup.definition.id));assert.equal(writer.localSeat.home,undefined);assert.equal(writer.player,home);assert.equal(authority.require(home).combat,coordinator.current.combat);assert(coordinator.current.assembly.input.scene.actors.includes(home));assert.deepEqual(worldDrivers,[]);return{course:'native already-carried birth and actual travel ejection',form:body.defId,ejected:true,worldDrivers};}));}
 if(process.argv.includes('--positive-only'))return rows;
 {const setup=nativeCampaignFixture(),defB=mintAdditionalNativeArea(setup),{home,body}=nativeCarry(setup);rows.push(refuseWorldCombat([setup.writer],worldDrivers=>{const {writer,definition,geography}=setup,raw=freshAssemblyInput(writer,definition),session=new NativeAreaCampaignSession(writer),campaign=session.campaign,authority=new NativeAreaActorAuthority<NativeAreaOngoingRuntime>(campaign),memoryRegistry=new NativeAreaMemoryRegistry(writer),coordinator=new NativeAreaSceneTransitionCoordinator({campaign,characterWriter:writer,authority,memoryRegistry});session.bindCoordinator(coordinator);const maddenLedger=new NativeAreaMaddenLedger({campaign,authority,banks:writer['maddenBanks']}),recipe={...raw,campaign,authority,coordinator,maddenLedger,characterWriter:writer,...freshAreaOngoingState(campaign.time)},area=new NativeAreaSceneOngoing(recipe),source=area.assembly.sourceSession(geography);session.duringPreparation(area,()=>{const p=area.assembly.prepare(source,source.issue(definition.id),{x:definition.size.w/2,y:definition.size.h/2},false);body.pos=area.assembly.input.geometry.clampPos({...p.spawnAt??p.entry},body.radius);area.assembly.birth();});
 const census=area.assembly.input.scene.actors,bodies=[...census],seat=writer.localSeat,ride=body.possession!,originalId=ride.seatId,slot=Object.getOwnPropertyDescriptor(writer,'seats')!,relays=[...bodies,home].map(actor=>({actor,descriptor:Object.getOwnPropertyDescriptor(actor,'statusRelay')})),checks:string[]=[];
 const untouched=(foreignHome=false)=>{for(const actor of bodies)authority.assertUnclaimed(actor);if(!foreignHome)authority.assertUnclaimed(home);for(const row of relays)assert.deepEqual(Object.getOwnPropertyDescriptor(row.actor,'statusRelay'),row.descriptor);assert.equal(area.assembly.scenePresence.active,false);};
 const refused=(label:string,action:()=>void,foreignHome=false)=>{assert.throws(action,label);untouched(foreignHome);checks.push(label);};
 ride.seatId='stale-native-seat';refused('stale possession seat id',()=>area.admit(bodies));ride.seatId=originalId;
 const vacancy=home.vacated!;home.vacated=undefined;refused('missing actual native home vacancy',()=>area.admit(bodies));home.vacated=vacancy;
 census.push(home);refused('carried home physically included',()=>area.admit([...census]));census.pop();
 writer.seats.push(seat);refused('ambiguous repeated carried seat',()=>area.admit(bodies));writer.seats.pop();
 const peerRaw=freshAssemblyInput(writer,defB),peer=new NativeAreaSceneOngoing({...peerRaw,campaign,authority,coordinator,maddenLedger,characterWriter:writer,...freshAreaOngoingState(campaign.time)}),peerCensus=peer.assembly.input.scene.actors;peerCensus.splice(0,peerCensus.length,home);authority.claim(peer.binding,[home]);refused('actual other registered area owns home',()=>area.admit(bodies),true);authority.release(peer.binding,[home]);peerCensus.length=0;
 const inject=(label:string,mutation:()=>void,restore:()=>void)=>{let reads=0;Object.defineProperty(writer,'seats',{configurable:true,enumerable:slot.enumerable,get(){reads++;mutation();return slot.value;}});refused(label,()=>area.admit(bodies));assert.equal(reads,1);Object.defineProperty(writer,'seats',slot);restore();};
 inject('late changed home',()=>{seat.home=body;},()=>{seat.home=home;});
 inject('late changed controlled body',()=>{seat.actor=home;},()=>{seat.actor=body;});
 inject('late changed possession id',()=>{ride.seatId='late-native-seat';},()=>{ride.seatId=originalId;});
 inject('late changed native home vacancy',()=>{vacancy.seatId='late-vacancy';},()=>{vacancy.seatId=seat.id;});
 inject('late replaced writer roster',()=>{Object.defineProperty(writer,'seats',{...slot,value:[...slot.value]});},()=>{});
 const token=area.combat.prepareActivation(bodies);assert(Object.isFrozen(token));assert(Object.isFrozen(token.relayBodies));assert(token.relayBodies.includes(home));
 seat.home=body;refused('captured token stale home',()=>area.combat.assertActivation(token,bodies));seat.home=home;
 refused('foreign aggregate token',()=>peer.combat.assertActivation(token,peerCensus));
 refused('forged token',()=>area.combat.assertActivation({relayBodies:[home]} as unknown as typeof token,bodies));
 let shadowCalls=0;for(const name of ['prepareActivation','assertActivation','activate'] as const)Object.defineProperty(area.combat,name,{configurable:true,value(){shadowCalls++;throw Error('forged public activation forwarding');}});
 area.admit(bodies);assert.equal(shadowCalls,0);for(const name of ['prepareActivation','assertActivation','activate'] as const)Reflect.deleteProperty(area.combat,name);checks.push('captured genuine activation forwarding');authority.assertAdmitted(area.assembly.input.scene);assert.equal(area.assembly.scenePresence.active,true);assert.equal(authority.require(home).combat,area.combat);assert.throws(()=>area.combat.activate(bodies,token),/Expired|foreign/,'old pre-admission token cannot reactivate');checks.push('expired activation token');
 area.admit(bodies); // Identical existing receipt is safe; it is never overwritten.
 area.combat.control.seatEject(seat,'travel');assert.equal(seat.home,undefined);assert.equal(seat.actor,home);assert(census.includes(home));assert.equal(authority.require(home).combat,area.combat);checks.push('valid retry and exact native restore');
 // A later raw relation is not initial bootstrap authority. Native prior writes
 // stay explicit fixture setup; no new claim or status routing may be inferred.
 const after=[...census],afterRelays=after.map(actor=>Object.getOwnPropertyDescriptor(actor,'statusRelay'));seat.home=home;seat.actor=body;body.possession=ride;home.vacated=vacancy;census.splice(census.indexOf(home),1);authority.release(area.binding,[home]);assert.throws(()=>area.admit([...census]),/bootstrap.*receipt/);for(let i=0;i<after.length;i++)assert.deepEqual(Object.getOwnPropertyDescriptor(after[i],'statusRelay'),afterRelays[i]);authority.assertUnclaimed(home);checks.push('later admission cannot mint a new carried receipt');
 assert.deepEqual(worldDrivers,[]);return{course:'actual unadmitted carried cohort refusal and retry',checks,worldDrivers};}));}
 return rows;
});const report={scope:'Initial actual ordinary-World carried relation adopted only through exact born cohort activation; restoration provenance, never source or physical permission.',results,receipt:combatHash(JSON.stringify(results))};writeCombatProof('native-carried-bootstrap.json',report);console.log(JSON.stringify(report));
