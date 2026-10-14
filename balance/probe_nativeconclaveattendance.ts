import assert from 'node:assert/strict';
import {actualConclave} from './nativeConclaveLifetimeFixture';
import {CLASSES} from '../src/data/classes';
import {RemoteInput} from '../src/net/remote';
import type {Seat} from '../src/engine/world';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
const rows=['idle','downed','dead'] .map(mode=>actualConclave(c=>{
 const {w,cf,n,a,b,area,state,site,bodies}=c;
 const peer=area.combat.party.addSeat('ritual-peer-'+mode,CLASSES.find(x=>x.id==='warrior')!,new RemoteInput('ritual-peer-'+mode),{startingCompanions:false,startingFlasks:false});
 area.combat.campaignFrame.enableHostedRoads();if(mode==='downed')peer.actor.downed=true;if(mode==='dead')peer.actor.dead=true;
 bodies[0].life=Math.round(bodies[0].maxLife()*.81);const wound=bodies[0].life,counter=cf.incubationCounter;
 const move=(seat:Seat,to:string)=>{const from=n.coordinator.areaFor(n.authority.require(seat.actor).combat);n.coordinator.roadsFor(from.combat).shardWorld!.enqueue({seatId:seat.id,dest:to});const result=from.combat.campaignFrame.drainShardRoads()[0];if(result?.outcome==='failed')throw result.error;assert.equal(result?.outcome,'moved');};
 move(w.localSeat,b);assert.equal(cf.incubationCounter,counter);assert.equal(cf.ritualIn(a)?.id,site.id);assert.equal(state.ritualSite,site);assert(bodies.every(x=>area.combat.scene.actors.includes(x)));assert.equal(bodies[0].life,wound);
 peer.actor.dead=false;peer.actor.downed=false;move(peer,b);assert.equal(cf.incubationCounter,counter+1);assert.equal(state.ritualSite,null);assert(!bodies.some(x=>area.combat.scene.actors.includes(x)));move(w.localSeat,a);assert.equal(state.ritualSite,null);move(w.localSeat,b);assert.equal(cf.incubationCounter,counter+1);assert.deepEqual(c.calls,[]);n.coordinator.retire();return{mode,realRemoteSeat:true,hostedTickets:true,remainingPeerPreserved:true,lastPeerIncubatesOnce:true,originalWound:wound,worldDrivers:c.calls};
}));
writeCombatProof('native-conclave-attendance.json',{scope:'Genuine native party creation and hosted selected-seat road tickets. Idle RemoteInput and explicit preexisting downed/dead states test physical attendance; no TCP disconnect/dormancy timer claim.',rows,receipt:combatHash(JSON.stringify(rows))});console.log(JSON.stringify(rows));
