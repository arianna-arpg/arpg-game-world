import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nativeCampaignFixture,birthActualNativeArea,mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat} from './probe_nativecombatcycle';
import {withSeededRandom} from '../src/core/rng';
function course(retained:boolean){return withSeededRandom(17431,()=>{
 const s=nativeCampaignFixture(17431),w=s.writer;w.player.level=15;
 const other=mintAdditionalNativeArea(s,{x:455,y:160});
 const cf=w.sim.conclaveField;assert(cf);
 let ignitionSteps=0;while(cf.peek().length===0&&ignitionSteps++<15000)cf.update(.5,w.devOverlayView());
 const ritual=cf.peek()[0];assert(ritual,'natural installed Conclave event');
 const a=ritual.zoneId,b=a===s.definition.id?other.id:s.definition.id;
 const execute=(worldDrivers:string[])=>{
  const n=retained?birthActualNativeArea(s):null;
  const travel=(id:string)=>{if(n){const p=n.coordinator.published;n.coordinator.runFrom(p,()=>n.coordinator.loadZone(id,w.zone.id));}else w.loadZone(id,w.zone.id);};
  const tick=()=>{if(n)n.coordinator.published.combat.campaignFrame.tick(1/60);else w.update(1/60);};
  const site=()=>n?n.coordinator.published.combat.input.assembly.input.registry.input.birth.input.state.ritualSite:w['ritualSite'];
  const capture=()=>({zone:w.zone.id,site:site()&&{...site(),cultistIds:[...site()!.cultistIds]},live:w.actors.filter(x=>x.tag==='ritual_cultist'&&!x.dead).map(x=>({id:x.id,life:x.life,max:x.maxLife(),fromZoneGen:x.fromZoneGen})),field:cf.ritualIn(a),counter:cf.incubationCounter,ledger:{incubated:w.ledger.rituals_incubated??0,seen:w.ledger.rituals_seen??0}});
  travel(a);tick();const first=capture();assert.equal(first.site?.id,ritual.id);assert.equal(first.live.length,cf.surge().ritual.cultistCount);
  const originalBodies=w.actors.filter(x=>first.site!.cultistIds.includes(x.id));assert.equal(originalBodies.length,5);
  const sourceArea=n?.coordinator.published;
  travel(b);const afterFirstLeave={...capture(),originalBodiesStillInSource:sourceArea?originalBodies.filter(x=>sourceArea.combat.scene.actors.includes(x)).length:null};
  assert.equal(afterFirstLeave.counter,first.counter+1);assert.equal(cf.ritualIn(a),null,'actual leave removed live field ritual');
  travel(a);tick();const returned={...capture(),sameOriginalBodies:w.actors.filter(x=>originalBodies.includes(x)).length};
  travel(b);const afterSecondLeave=capture();
  return{retained,seed:17431,ignitionSteps,ritual,a,b,first,afterFirstLeave,returned,afterSecondLeave,worldDrivers};
 };return retained?refuseWorldCombat([w],execute):execute([]);
});}
const result={scope:'Natural installed Conclave activation and actual native A-B-A-B zone dispatch. Installed Crossroads plus a genuinely generated destination, untouched native cultists, genuine departure memory; direct dispatch, not TCP/UI. No event injection, kill, raw area mutation or timing claim.',ordinary:course(false),retained:course(true)};
fs.writeFileSync(new URL('../CONCLAVE-RETURN.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
assert.equal(result.ordinary.returned.live.length,0);assert.equal(result.ordinary.afterSecondLeave.counter,result.ordinary.afterFirstLeave.counter);
assert.equal(result.retained.returned.sameOriginalBodies,0);assert.equal(result.retained.afterSecondLeave.counter,result.retained.afterFirstLeave.counter);assert.deepEqual(result.retained.worldDrivers,[]);
