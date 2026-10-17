import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {nativeCampaignFixture,birthActualNativeArea,mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {withSeededRandom} from '../src/core/rng';
import {refuseWorldCombat} from './probe_nativecombatcycle';
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function course(index:number,retained:boolean){return withSeededRandom(45927,()=>{
 const s=nativeCampaignFixture(45927),w=s.writer,away=s.definition,defs=[];
 for(let i=1;i<=48;i++)defs.push(mintAdditionalNativeArea(s,{x:455+180*i,y:160}));
 s.definition=defs[index]!;w.player.level=1;const lowGates=[...w.sim.gatesFor(1)];
 const nativePrestate={seed:45927,index,definition:s.definition,away:away.id,generatedIds:defs.map(d=>d.id),manifest:w.manifest,lowGates};
 const run=(calls:string[])=>{
  const n=retained?birthActualNativeArea(s):null;if(!n)w.loadZone(s.definition.id);
  const area=()=>n?.coordinator.published;
  const read=()=>{const a=area(),rows=a?a.assembly.input.encounters.input.state.encounters:w['encounters'];return {ownerMatches:a?a.assembly.transition.encounters===rows:undefined,rows:rows.map(e=>({id:e.def.id,packageId:e.def.packageId,scale:e.scale.id,phase:e.phase,pos:{...e.pos},spawned:[...e.spawned]})),rng:(a?a.assembly.input.encounters.input.state.encRng:w['encRng']).snapshot()};};
  const first=read(),originalArea=area(),originalEncounters=area()?.assembly.input.encounters.input.state.encounters;
  const travel=(id:string)=>{if(n)n.coordinator.runFrom(n.coordinator.published,()=>n.coordinator.loadZone(id));else w.loadZone(id);};
  travel(away.id);w.player.level=30;const highGates=[...w.sim.gatesFor(30)];travel(s.definition.id);
  const returnBeforeFrame=read();if(n)area()!.combat.campaignFrame.tick(1/60);else w.update(1/60);
  return {retained,nativePrestate,prestateHash:hash(nativePrestate),first,highGates,returnBeforeFrame,afterFrame:read(),sameArea:n?area()===originalArea:undefined,sameEncounterArray:n?area()!.assembly.input.encounters.input.state.encounters===originalEncounters:undefined,worldDrivers:calls};
 };return retained?refuseWorldCombat([w],run):run([]);
});}
const attempts=[];let native;
for(let i=0;i<8;i++){const row=course(i,false);attempts.push(row);console.log(JSON.stringify({kind:'candidate',index:i,zone:row.nativePrestate.definition.id,first:row.first.rows,after:row.afterFrame.rows}));if(row.first.rows.length===0&&row.returnBeforeFrame.rows.length>0){native=row;break;}}
assert.ok(native,'finite first-eight native candidates must yield an actual delayed encounter');
const retained=course(native.nativePrestate.index,true),finding=native.afterFrame.rows.length>0&&retained.afterFrame.rows.length===0;
const report={input:'138e59388d443eb5e4bee3c2c5becb4cc8efe7061e447736cf99abfde5695c07',scope:'Independent actual native/retained delayed encounter discovery. Existing approved level fixture 1 to30 and ordinary seeded harness only; no package/gate/RNG-method overrides; no injected encounters, actors or content. First eight generated candidates bounded; stop at first actual native delayed discovery.',attempts,retained,finding};
writeFileSync(new URL('./reports/native-late-encounter-arrival.json',import.meta.url),JSON.stringify({...report,receipt:hash(report)},null,2)+'\n');
assert.equal(native.prestateHash,retained.prestateHash,'same actual generated native prestate');assert.equal(retained.first.ownerMatches,true);assert.equal(retained.afterFrame.ownerMatches,true);assert.deepEqual(retained.worldDrivers,[]);assert.equal(retained.sameArea,true);assert.equal(retained.sameEncounterArray,true);
console.log(JSON.stringify({finding,zone:retained.nativePrestate.definition.id,native:native.afterFrame.rows,retained:retained.afterFrame.rows,receipt:hash(report)}));

assert.equal(retained.afterFrame.rows.length,1,'retained late discovery is installed');assert.equal(retained.afterFrame.rows[0]!.id,native.afterFrame.rows[0]!.id);assert.equal(retained.afterFrame.rows[0]!.scale,native.afterFrame.rows[0]!.scale);
