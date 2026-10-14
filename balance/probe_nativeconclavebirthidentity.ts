import assert from 'node:assert/strict';
import {nativeCampaignFixture,birthActualNativeArea,mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat,combatHash,writeCombatProof} from './probe_nativecombatcycle';
import {withSeededRandom} from '../src/core/rng';
import {nativeConclaveBirthCalls} from '../src/engine/nativeSceneRuntimeBirth';
const diagnostic=process.argv.includes('--diagnostic');
const rows=['foreignId','foreignZone','sameIdRestore'].map(mode=>withSeededRandom(17431,()=>{
 const setup=nativeCampaignFixture(17431),w=setup.writer;w.player.level=15;const other=mintAdditionalNativeArea(setup),cf=w.sim.conclaveField;assert(cf);let steps=0;while(!cf.peek().length&&steps++<15000)cf.update(.5,w.devOverlayView());const event=cf.peek()[0];assert(event);return refuseWorldCombat([w],worldDrivers=>{
  const n=birthActualNativeArea(setup),travel=(to:string)=>n.coordinator.runFrom(n.coordinator.published,()=>n.coordinator.loadZone(to,w.zone.id)),before=cf.incubationCounter,query=cf.ritualIn;let selected=0,error:unknown;
  Object.defineProperty(cf,'ritualIn',{configurable:true,value:function(this:typeof cf,zone:string){const result=Reflect.apply(query,this,[zone]);if(zone===event.zoneId&&result){selected++;if(mode==='sameIdRestore'){const old=result;cf.restore(cf.snapshot());return old;}return mode==='foreignId'?{...result,id:result.id+'_foreign'}:{...result,zoneId:'foreign-zone'};}return result;}});
  try{travel(event.zoneId);}catch(e){error=e;}finally{Reflect.deleteProperty(cf,'ritualIn');}
  assert.equal(error,undefined);
  const area=n.coordinator.current,state=area.combat.input.assembly.input.registry.input.birth.input.state,site=state.ritualSite;assert(site);const receipt=nativeConclaveBirthCalls.read(area.combat.input.assembly.input.registry.input.birth.host),bodyCount=area.combat.scene.actors.filter(a=>site.cultistIds.includes(a.id)).length;assert.equal(bodyCount,5);
  let departed=false,departureError:unknown;try{travel(event.zoneId===setup.definition.id?other.id:setup.definition.id);departed=true;}catch(e){departureError=e;}
  const row={mode,selected,receipt:!!receipt,departed,incubated:cf.incubationCounter-before,bodyCount,error:departureError?String(departureError):null,worldDrivers};
  if(!diagnostic){if(mode==='foreignId'||mode==='foreignZone'){assert.equal(receipt,undefined);assert.equal(departed,false);assert.equal(cf.incubationCounter,before);}else{assert(receipt);assert.equal(departed,true);assert.equal(cf.incubationCounter,before+1);}}assert.deepEqual(worldDrivers,[]);n.coordinator.retire();return row;
 });
}));writeCombatProof(diagnostic?'native-conclave-birth-negative.json':'native-conclave-birth-identity.json',{diagnostic,rows,receipt:combatHash(JSON.stringify(rows))});console.log(JSON.stringify(rows));