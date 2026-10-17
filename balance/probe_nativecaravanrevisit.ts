import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {nativeCampaignFixture,birthActualNativeArea} from './nativeCombatRetainedFixture';
import {withSeededRandom} from '../src/core/rng';
import {refuseWorldCombat,writeCombatProof} from './probe_nativecombatcycle';
import {FEATURE} from '../src/meta/account';
import {START_ZONE} from '../src/data/zones';
import {MONSTERS} from '../src/data/monsters';
function course(retained:boolean){return withSeededRandom(45927,()=>{
 const s=nativeCampaignFixture(45927),w=s.writer;w.account.features.add(FEATURE.CARAVAN);
 const run=(calls:string[])=>{
  const n=retained?birthActualNativeArea(s):null;
  const travel=(id:string)=>{if(n){const from=n.coordinator.published;n.coordinator.runFrom(from,()=>n.coordinator.loadZone(id,w.zone.id));}else w.loadZone(id,w.zone.id);};
  travel(START_ZONE);
  const caravan=()=>w.actors.filter(a=>!a.dead&&a.defId&&MONSTERS[a.defId]?.npcRole==='caravanner');
  const depart=(band:number)=>{const candidates=caravan();assert.equal(candidates.length,1);w.player.pos={...candidates[0].pos};return n?n.coordinator.published.combat.campaignFrame.startCaravan(band):w.startCaravan(band);};
  assert.equal(depart(1),true);assert.equal(w.zone.id,'caravan_band_1');
  const definition=w.zone,firstArea=n?.coordinator.published,firstCaravan=caravan()[0];assert(firstCaravan);assert.equal(caravan().length,1);
  const firstNpcId=firstCaravan.id,firstCensus=w.actors;
  assert.equal(depart(0),true);assert.equal(w.zone.id,START_ZONE);
  assert.equal(depart(1),true);assert.equal(w.zone,definition);
  const repeatedCaravan=caravan();assert.equal(repeatedCaravan.length,1);
  const sameOwner=n?n.coordinator.published===firstArea:undefined,sameCaravan=repeatedCaravan[0]===firstCaravan,sameCensus=w.actors===firstCensus;
  if(n){assert.equal(sameOwner,true);assert.equal(sameCaravan,true);assert.equal(sameCensus,true);n.coordinator.published.combat.campaignFrame.tick(1/60);}else w.update(1/60);
  assert.equal(depart(0),true);assert.equal(w.zone.id,START_ZONE);
  return{retained,destination:definition.id,firstNpcId,sameOwner,sameCaravan,sameCensus,returnSucceeded:true,worldDrivers:calls};
 };return retained?refuseWorldCombat([w],run):run([]);
});}
const report={scope:'Actual unlocked caravan action mints band1, returns home, reuses the same destination and returns home again after an actual frame. Unlock is an explicit feature precondition; no dwell or natural progression claim.',original:course(false),retained:course(true)};
assert.deepEqual(report.retained.worldDrivers,[]);writeCombatProof('native-caravan-revisit.json',{...report,receipt:createHash('sha256').update(JSON.stringify(report)).digest('hex')});console.log(JSON.stringify(report));
