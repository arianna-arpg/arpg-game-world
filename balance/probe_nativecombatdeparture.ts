import assert from 'node:assert/strict';
import {withSeededRandom} from '../src/core/rng';
import {nativeCampaignFixture,birthActualNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat,writeCombatProof,combatHash} from './probe_nativecombatcycle';
const rows=[];
for(const mode of ['flags','incubate','disrupt','partial'] as const)rows.push(withSeededRandom(44801,()=>{
 const setup=nativeCampaignFixture(),cf=setup.writer.sim.conclaveField;assert.ok(cf,'actual installed native Conclave field required');
 if(mode!=='flags')assert.equal(cf.devOpenRitual(setup.writer.devOverlayView(),setup.definition.id),true,'labeled native QA opening before genuine area birth');
 return refuseWorldCombat([setup.writer],calls=>{const all=birthActualNativeArea(setup),{ongoing:a,coordinator,campaign}=all,departure=coordinator.departureFor(a.combat),memo=departure.memory.snapshot();assert.ok(memo);const zone=a.assembly.input.scene.zone.id,oldCounter=cf.incubationCounter,oldLedger=campaign.ledger.rituals_incubated??0;
 if(mode==='flags'){
  let snapshots=0;const fn=departure.memory.snapshot;Object.defineProperty(departure.memory,'snapshot',{configurable:true,value:function(this:typeof departure.memory){snapshots++;return Reflect.apply(fn,this,[]);}});campaign.zoneMemory.set(zone,memo);departure.adoptedZonePending=true;departure.forgetMemoryOnLeave=true;departure.captureZoneMemory();assert.equal(departure.adoptedZonePending,false);assert.equal(departure.forgetMemoryOnLeave,true);assert.equal(campaign.zoneMemory.get(zone),memo);assert.equal(snapshots,0);departure.captureZoneMemory();assert.equal(departure.forgetMemoryOnLeave,false);assert.equal(campaign.zoneMemory.has(zone),false);assert.equal(snapshots,0);departure.captureZoneMemory();assert.equal(snapshots,1);assert.ok(campaign.zoneMemory.get(zone));return{mode,snapshots,worldDrivers:calls};
 }
 const site=a.assembly.input.registry.input.birth.input.state.ritualSite;assert.ok(site);assert.equal(site.cultistIds.length,cf.surge().ritual.cultistCount);assert.ok(site.cultistIds.every(id=>a.assembly.input.scene.actors.some(body=>body.id===id&&!body.dead)));assert.ok(cf.ritualIn(zone));assert.equal(cf.incubationCounter,oldCounter,'ordinary snapshots cannot incubate');
 campaign.zoneMemory.delete(zone);
 if(mode==='disrupt'){const body=a.assembly.input.scene.actors.find(body=>body.id===site.cultistIds[0])!;body.dead=true;} // labeled controlled preexisting casualty, not a kill-pipeline proof
 if(mode==='partial'){const marker=Error('actual incubate callback late failure'),original=cf.incubate;Object.defineProperty(cf,'incubate',{configurable:true,value:function(this:typeof cf,z:string){Reflect.apply(original,this,[z]);throw marker;}});assert.throws(()=>departure.captureZoneMemory(),e=>e===marker);assert.equal(cf.incubationCounter,oldCounter+1);assert.equal(cf.ritualIn(zone),null);assert.equal(campaign.ledger.rituals_incubated??0,oldLedger);assert.equal(campaign.zoneMemory.has(zone),false);}
 else{departure.captureZoneMemory();assert.equal(cf.ritualIn(zone),null);assert.equal(cf.incubationCounter,oldCounter+(mode==='incubate'?1:0));assert.equal(campaign.ledger.rituals_incubated??0,oldLedger+(mode==='incubate'?1:0));assert.ok(campaign.zoneMemory.get(zone));}
 return{mode,cultists:site.cultistIds.length,incubated:cf.incubationCounter-oldCounter,ledgerGain:(campaign.ledger.rituals_incubated??0)-oldLedger,memoStored:campaign.zoneMemory.has(zone),worldDrivers:calls};
 });
}));const report={mode:'Actual retained departure-memory owner: native flags, genuine ritual birth from real QA-opened overlay, pure snapshots, incubation/disruption and partial callback failure. No event scheduler or death-pipeline claim.',rows,receipt:combatHash(JSON.stringify(rows))};writeCombatProof('native-combat-departure.json',report);console.log(JSON.stringify(report));
