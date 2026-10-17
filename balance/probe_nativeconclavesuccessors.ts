import assert from 'node:assert/strict';
import {actualConclave} from './nativeConclaveLifetimeFixture';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
const rows=[false,true].map(completed=>actualConclave(c=>{
 const {w,cf,n,a,b,area,state,site,bodies,travel,tick}=c;const currentSite=()=>state.ritualSite;const counter=cf.incubationCounter,subdued=w.ledger.rituals_subdued??0;
 if(completed){for(const body of bodies)area.combat.kill(body,false,w.player);tick();assert.equal(state.ritualSite,site);assert.equal(site.subdued,true);assert.equal(w.ledger.rituals_subdued,subdued+1);assert.equal(cf.ritualIn(a),null);}
 const extra=area.combat.scene.actors.filter(x=>!bodies.includes(x)&&x.defId===cf.surge().ritual.bloodDemonId);
 travel(b);assert.equal(state.ritualSite,null);assert(!bodies.some(x=>area.combat.scene.actors.includes(x)));assert(extra.every(x=>area.combat.scene.actors.includes(x)),'cleanup does not sweep erupted blood demons');assert.equal(cf.incubationCounter,counter+(completed?0:1));
 let successor=cf.ritualIn(a),visited=0,steps=0;
 while(!successor&&visited<50){while(!cf.peek().length&&steps++<25000)cf.update(.5,w.devOverlayView());successor=cf.ritualIn(a);if(successor)break;const event=cf.peek()[0];assert(event,'natural subsequent Conclave event');travel(event.zoneId);tick();travel(b);visited++;}
 assert(successor,'natural successor eventually selects the original charted area');assert.notEqual(successor.id,site.id);
 travel(a);tick();const second=currentSite();assert(second);assert.equal(second.id,successor.id);assert.notEqual(second,site);const newBodies=second.cultistIds.map(id=>area.combat.scene.actors.find(x=>x.id===id)!);assert(newBodies.every(x=>x&&!bodies.includes(x)));assert.equal(w.ledger.rituals_subdued??0,subdued+(completed?1:0),'completed old ritual does not pay again');tick();assert.equal(state.ritualSite,second);assert.equal(newBodies.length,5);assert.deepEqual(c.calls,[]);n.coordinator.retire();return{completed,first:site.id,successor:successor.id,naturalOffTargetRitualVisits:visited,ignitionSteps:steps,bloodDemonsPreserved:extra.length,worldDrivers:c.calls};
}));writeCombatProof('native-conclave-successors.json',{rows,receipt:combatHash(JSON.stringify(rows))});console.log(JSON.stringify(rows));
