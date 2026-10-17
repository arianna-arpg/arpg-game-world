import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {nativeCampaignFixture,birthActualNativeArea,mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {withSeededRandom} from '../src/core/rng';
import {refuseWorldCombat} from './probe_nativecombatcycle';
function course(kind:'merc'|'ascent',retained:boolean){return withSeededRandom(45927,()=>{
 const s=nativeCampaignFixture(45927),w=s.writer,away=s.definition;const defs=[];for(let i=1;i<=48;i++)defs.push(mintAdditionalNativeArea(s,{x:455+180*i,y:160}));s.definition=defs[kind==='merc'?0:2]!;w.player.level=1;w.sim.gatesFor(1);
 const run=(calls:string[])=>{const n=retained?birthActualNativeArea(s):null;if(!n)w.loadZone(s.definition.id);const area=()=>n?.coordinator.published;
 const snapshot=()=>{const a=area(),post=a?a.assembly.input.settlement.host.mercOutpost:w['mercOutpost'],mouths=a?a.assembly.input.geometry.caveEntrances:w['caveEntrances'];return{outpost:!!post,captain:post?.captain.kind,offers:post?.offers.length,geyserMouths:mouths.filter(x=>x.kind==='sky_geyser').length,geyserDoodads:(a?a.assembly.input.geometry.doodads:w.doodads).filter(x=>x.kind==='sky_geyser').length};};
 const first=snapshot(),oldArea=area(),census=n?area()!.combat.scene.actors:w.actors;
 const travel=(id:string)=>{if(n)n.coordinator.runFrom(n.coordinator.published,()=>n.coordinator.loadZone(id));else w.loadZone(id);};travel(away.id);w.player.level=30;w.sim.gatesFor(30);travel(s.definition.id);
 const preFrame=snapshot(),sameCensusAtArrival=n?area()!.combat.scene.actors===census:undefined;if(n)area()!.combat.campaignFrame.tick(1/60);else w.update(1/60);return{sameCensusAtArrival,preFrame,kind,retained,seed:45927,id:s.definition.id,first,last:snapshot(),ascentAllowed:w.sim.ascentField!.geyserAllowed(w.player.level),chance:w.sim.ascentField!.geyserChanceNow(),sameArea:n?area()===oldArea:undefined,sameCensus:n?area()!.combat.scene.actors===census:undefined,worldDrivers:calls};};return retained?refuseWorldCombat([w],run):run([]);
});}
const rows=[];for(const kind of ['merc','ascent'] as const)for(const retained of [false,true]){const row=course(kind,retained);rows.push(row);console.log(JSON.stringify(row));}
const report={scope:'Actual original and retained successor; actual generated definitions, genuine birth and loadZone out/back. Explicit player-level boundary 1 to30 with real gatesFor. No config/RNG overrides, mouths or actors injected. Native oracle outside retained World-driver trap.',rows};writeFileSync(new URL('./reports/native-merc-ascent-arrivals.json',import.meta.url),JSON.stringify({...report,receipt:createHash('sha256').update(JSON.stringify(report)).digest('hex')},null,2)+'\n');
assert.equal(rows[0]!.last.outpost,true);assert.equal(rows[1]!.last.outpost,true);assert.equal(rows[2]!.last.geyserMouths,1);assert.equal(rows[3]!.last.geyserMouths,1);for(const r of rows.filter(x=>x.retained)){assert.equal(r.sameArea,true);assert.equal(r.sameCensusAtArrival,true);assert.deepEqual(r.worldDrivers,[]);}
