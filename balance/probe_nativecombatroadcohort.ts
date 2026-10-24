import assert from 'node:assert/strict';
import {withSeededRandom} from '../src/core/rng';
import {CLASSES} from '../src/data/classes';
import {NullInput} from '../src/net/intent';
import type {RoadTicket} from '../src/engine/shardUnits';
import type {NativeAreaRoadDestination} from '../src/worldmass/nativeAreaRoadDestination';
import {nativeCampaignFixture,birthActualNativeArea,mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat,writeCombatProof,combatHash} from './probe_nativecombatcycle';
const result=withSeededRandom(44862,()=>{const setup=nativeCampaignFixture(),definitionB=mintAdditionalNativeArea(setup),definitionC=mintAdditionalNativeArea(setup,{x:955,y:160});
 // Native ordinary factory creates the second real seat before the trap; explicit
 // publisher admission below is labelled fixture setup, not a retained join proof.
 const remote=setup.writer.addSeat('road-peer',CLASSES.find(c=>c.id==='warrior')!,new NullInput(),{startingCompanions:false,startingFlasks:false});
 return refuseWorldCombat([setup.writer],worldDrivers=>{
  const {ongoing:a,coordinator,writer,authority}=birthActualNativeArea(setup),idA=a.assembly.input.scene.zone.id,hero=writer.localSeat.actor;
  a.assembly.input.scene.actors.push(remote.actor);remote.actor.pos={...hero.pos};a.admit([...a.assembly.input.scene.actors]);a.combat.campaignFrame.enableHostedRoads();const linkA=coordinator.roadsFor(a.combat).shardWorld!,before={...hero.pos},deedCallback=hero.onLifeHealed;
  let callbackRows:string[]=[];const remoteTicket:RoadTicket<NativeAreaRoadDestination>={seatId:remote.id,dest:definitionB.id,after(view){callbackRows=coordinator.frame.seats.map(s=>s.id);assert.equal(view.player,remote.actor);assert.equal(view.seatHero(remote),remote.actor);assert.throws(()=>view.seatHero(writer.localSeat),/another seat/);}};
  linkA.enqueue(remoteTicket);const first=a.combat.campaignFrame.drainShardRoads();if(first[0].outcome==='failed')throw first[0].error;assert.equal(first[0].outcome,'moved');const b=coordinator.residentAreas().find(area=>area.assembly.input.scene.zone.id===definitionB.id)!;
  assert.deepEqual(callbackRows,[remote.id]);assert.equal(coordinator.published,a);assert.equal(coordinator.current,a,'remote travel never repoints the local writer');assert.equal(writer.zone.id,idA);assert.deepEqual(hero.pos,before);assert.equal(hero.onLifeHealed,deedCallback);assert.equal(authority.selectActors([hero])[0].binding,a.binding);assert.equal(authority.selectActors([remote.actor])[0].binding,b.binding);assert.deepEqual(coordinator.seatsFor(a.combat),[writer.localSeat]);assert.deepEqual(coordinator.seatsFor(b.combat),[remote]);
  assert.throws(()=>linkA.enqueue({seatId:remote.id,dest:definitionC.id}),/source/);
  const linkB=coordinator.roadsFor(b.combat).shardWorld!;linkB.enqueue({seatId:remote.id,dest:definitionC.id});coordinator.runFrom(b,()=>coordinator.loadZone(idA,definitionB.id));const stale=a.combat.campaignFrame.drainShardRoads();assert.equal(stale[0].outcome,'failed');assert.match(String(stale[0].error),/original area/);assert.equal(coordinator.residentAreas().length,2,'stale ticket cannot birth its destination');assert.equal(authority.selectActors([remote.actor])[0].binding,a.binding);
  return{first:first[0].outcome,callbackRows,published:coordinator.published.assembly.input.scene.zone.id,stale:stale[0].outcome,remoteReturned:coordinator.seatsFor(a.combat).map(s=>s.id),worldDrivers};
 });});const report={scope:'Native-created second seat, explicit actual publisher admission, remote-only queued transfer without stealing local writer/deeds, exact one-seat callback cohort, and actual pre-drain travel expiring the old ticket. Not a retained join or native server covenant proof.',result,receipt:combatHash(JSON.stringify(result))};writeCombatProof('native-combat-roadcohort.json',report);console.log(JSON.stringify(report));
