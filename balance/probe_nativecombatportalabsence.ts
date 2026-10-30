import assert from 'node:assert/strict';
import {withSeededRandom} from '../src/core/rng';
import {TOWN_PORTAL_CFG} from '../src/data/townportals';
import {NativeAreaCampaignFrameState} from '../src/worldmass/nativeAreaCampaignFrameState';
import {nativeCampaignFixture,birthActualNativeArea,mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat,writeCombatProof,combatHash} from './probe_nativecombatcycle';
const result=withSeededRandom(44864,()=>{const setup=nativeCampaignFixture(),defB=mintAdditionalNativeArea(setup);return refuseWorldCombat([setup.writer],worldDrivers=>{
 const {ongoing:a,coordinator,writer}=birthActualNativeArea(setup),hero=writer.localSeat.actor,seat=writer.localSeat,state=NativeAreaCampaignFrameState.forWriter(writer),idA=a.assembly.input.scene.zone.id;
 assert.equal(a.combat.control.townPortalRefusal(seat),null);a.combat.control.openTownPortal(seat);const portal=state.townPortals.find(row=>row.owner===seat.id);assert(portal,'genuine native control creates the actual portal record');state.townPortalDwell.set(seat.id,TOWN_PORTAL_CFG.dwellSeconds/2);state.townPortalArrival.add(seat.id);
 coordinator.runFrom(a,()=>coordinator.loadZone(defB.id,idA));const b=coordinator.current;assert.equal(portal.origin.zoneId,idA);const currentPos=hero.pos,descriptor=Object.getOwnPropertyDescriptor(hero,'pos')!;let posReads=0;Object.defineProperty(hero,'pos',{configurable:true,enumerable:descriptor.enumerable,get(){posReads++;return currentPos;},set(){throw Error('absent source must not write the foreign hero position');}});
 try{assert.equal(a.combat.campaignFrame.updateTownPortals(TOWN_PORTAL_CFG.dwellSeconds),false);}finally{Object.defineProperty(hero,'pos',descriptor);}
 assert.equal(posReads,0,'absent area cannot read foreign spatial coordinates');assert.equal(state.townPortalArrival.has(seat.id),true,'absent source cannot clear destination arrival latch');assert.equal(state.townPortalDwell.has(seat.id),false,'absent source clears its stale local portal dwell');assert.equal(state.townPortals.includes(portal),true);assert.equal(coordinator.current,b);assert.equal(coordinator.residentAreas().length,2);
 return{source:idA,destination:defB.id,posReads,arrival:state.townPortalArrival.has(seat.id),dwell:state.townPortalDwell.has(seat.id),portalRetained:state.townPortals.includes(portal),worldDrivers};
 });});const report={scope:'Actual native portal construction followed by physical departure; real source owner must preserve destination arrival latch and avoid foreign position reads or tickets while clearing stale source dwell.',result,receipt:combatHash(JSON.stringify(result))};writeCombatProof('native-combat-portalabsence.json',report);console.log(JSON.stringify(report));
