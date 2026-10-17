import assert from 'node:assert/strict';
import {nativeCampaignFixture,birthActualNativeArea,mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {withSeededRandom} from '../src/core/rng';
import {refuseWorldCombat,writeCombatProof} from './probe_nativecombatcycle';
import {START_ZONE} from '../src/data/zones';
function course(retained:boolean){return withSeededRandom(45927,()=>{
 const setup=nativeCampaignFixture(45927),w=setup.writer,definitions=[setup.definition];
 for(const y of [-500,0,500])for(const x of [-650,-150,350,850])definitions.push(mintAdditionalNativeArea(setup,{x,y}));
 const run=(calls:string[])=>{const n=retained?birthActualNativeArea(setup):null;
  const travel=(id:string)=>{if(n){const from=n.coordinator.published;n.coordinator.runFrom(from,()=>n.coordinator.loadZone(id,w.zone.id));}else w.loadZone(id,w.zone.id);};
  assert.equal(w.sim.warlord.lords.size,0,'course begins before actual first crowning');
  const visited=new Set<string>();for(const def of definitions){travel(def.id);visited.add(def.id);assert.equal(w.actors.filter(a=>a.tag==='warlord').length,0);}
  travel(START_ZONE);if(n)n.coordinator.published.combat.campaignFrame.tick(1/60);else w.update(1/60);
  const lords=[...w.sim.warlord.lords.values()].map(l=>({...l}));
  const lord=lords.find(l=>l.alive&&visited.has(l.capitalId)&&w.sim.warlord.bossId(l.faction));assert(lord,'native first faction/warlord update crowns on visited generated ground');
  const remembered=w['zoneMemory'].has(lord.capitalId);travel(lord.capitalId);
  const first=w.actors.filter(a=>a.tag==='warlord'&&!a.dead).map(a=>({id:a.id,defId:a.defId,faction:a.faction}));
  if(n)n.coordinator.published.combat.campaignFrame.tick(1/60);else w.update(1/60);
  const after=w.actors.filter(a=>a.tag==='warlord'&&!a.dead).map(a=>({id:a.id,defId:a.defId,faction:a.faction}));
  return{retained,visited:[...visited],lord,lords,remembered,first,after,worldDrivers:calls};
 };return retained?refuseWorldCombat([w],run):run([]);
});}
const report={scope:'First visit to 13 actual generated areas before the first campaign frame; genuine faction/WarlordField crowning at town, then real return and frame. No injected lord, faction influence, package gate, body or RNG override beyond the fixed course seed; direct zone dispatch does not prove UI navigation.',original:course(false),retained:course(true)};
writeCombatProof('native-warlord-arrival.json',report);console.log(JSON.stringify(report));assert(report.original.first.length>0);assert.equal(report.retained.first.length,1);assert.equal(report.retained.after.length,1);assert.deepEqual(report.retained.worldDrivers,[]);
