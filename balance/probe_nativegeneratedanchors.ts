import assert from 'node:assert/strict';
import {nativeCampaignFixture,birthActualNativeArea,mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat,writeCombatProof,combatHash} from './probe_nativecombatcycle';
import {loadCharacter,readCharacterResume} from '../src/meta/character';
import {prepareCharacterWorld} from '../src/meta/resumeWorld';
import {MassNativeGeography} from '../src/worldmass/nativeGeography';
import {NativeAreaSceneAssembly,freshAssemblyInput} from './nativeFreshAssemblyFixture';
import {seedGlobalRandom} from '../src/sim/rng';
const unseed=seedGlobalRandom(46114);
try{
 const setup=nativeCampaignFixture(46114),{writer,definition,geography}=setup,native={...definition.map},nativeBytes=JSON.stringify(definition.map),geographyBytes=JSON.stringify(geography.spec),destination=mintAdditionalNativeArea(setup),definitionIdentity=definition;
 assert.deepEqual(native,{x:14.917781548997901,y:-3.5202092148481086});assert.throws(()=>geography.physicalAnchor(native),/preserve the authoritative/);
 const result=refuseWorldCombat([writer],worldDrivers=>{
  const {ongoing:a,coordinator}=birthActualNativeArea(setup),source=a.assembly.sourceSession(geography),ticket=source.issue(definition.id),view=source.read(ticket),anchor=view.positions.find(row=>row.id===definition.id)!.physical;
  assert.equal(view.definition,definitionIdentity);assert.equal(writer.zoneMap[definition.id],definitionIdentity);assert.equal(JSON.stringify(definition.map),nativeBytes);assert.ok('policy' in anchor);assert.deepEqual(geography.nativeSourcePoint(anchor),native);assert.ok(a.combat.scene.actors.length>1);
  const before=writer.time;coordinator.runFrom(a,()=>a.combat.updateAI(1/60));a.combat.campaignFrame.tick(1/60);assert.equal(writer.time,before+1/60);
  coordinator.runFrom(a,()=>coordinator.loadZone(destination.id));const b=coordinator.current;assert.equal(b.combat.scene.zone.id,destination.id);coordinator.runFrom(b,()=>coordinator.loadZone(definition.id));assert.equal(coordinator.current,a);assert.equal(JSON.stringify(definition.map),nativeBytes);assert.deepEqual(source.read(ticket).positions,view.positions);
  coordinator.saveCharacter();const saved=loadCharacter();assert.ok(saved?.world);assert.equal(saved.world.player?.zoneId,definition.id);assert.ok(saved.world.memory?.some(row=>row.zoneId===definition.id));assert.equal(JSON.stringify(geography.spec),geographyBytes);assert.deepEqual(worldDrivers,[]);
  return{a:definition.id,b:destination.id,native,anchor,actors:a.combat.scene.actors.length,bodiesB:b.combat.scene.actors.length,worldDrivers,retire:()=>coordinator.retire()};
 });
 const read=await readCharacterResume();assert.equal(read.status,'ready');if(read.status!=='ready')throw Error('Missing actual character authority');
 // Existing staged native Continue is a separate ordinary World lane: saved graph
 // restoration is verified here, not retained client hydration or browser restart.
 const prepared=await prepareCharacterWorld(writer.account,read.resume,{isCurrent:()=>true,fallbackSeed:46114,spawn:'exact'}),restored=prepared.publish();restored.bindGlobalPolicies();
 const restoredDefinition=restored.zoneMap[definition.id];assert.ok(restoredDefinition);assert.equal(JSON.stringify(restoredDefinition.map),nativeBytes);
 const restoredGeography=new MassNativeGeography(JSON.parse(geographyBytes)),assembly=new NativeAreaSceneAssembly(freshAssemblyInput(restored,restoredDefinition)),session=assembly.sourceSession(restoredGeography),ticket=session.issue(definition.id),view=session.read(ticket);
 assert.deepEqual(view.positions.find(row=>row.id===definition.id)!.physical,result.anchor);assert.deepEqual(restoredGeography.nativeSourcePoint(view.positions.find(row=>row.id===definition.id)!.physical),native);assert.equal(JSON.stringify(restoredGeography.spec),geographyBytes);
 result.retire();const {retire,...record}=result;void retire;
 const report={scope:'Actual seed46114 generated source birth, native retained AI/frame, A/B travel and real character save; same-process staged native Continue and renewed source ticket preserve exact graph/geography. Retained Continue hydration, browser restart and general physics exact-coordinate adoption are separate.',result:{...record,restored:restoredDefinition.id,geographyHash:geography.spec.mappingHash},receipt:combatHash(JSON.stringify(record))};writeCombatProof('native-generated-anchors.json',report);console.log(JSON.stringify(report));
}finally{unseed();}
