/** Cold module entry must retain the original population operation across later
 * prototype/instance replacement. Preparation mints remain uninserted/unclaimed. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import type {Actor} from '../src/engine/actor';
import type {NativeSummonPreparationScope,NativeSummonPreparationRuntime} from '../src/worldmass/nativeAreaSceneSummonPreparation';
import type {NativeSceneProgressionAuthority} from '../src/worldmass/nativeAreaSceneProgression';
const cold=process.argv.find(v=>v.startsWith('--cold-factory='))?.split('=')[1];
if(cold){
 if(cold==='population')await import('../src/worldmass/nativeAreaScenePopulation');
 else if(cold==='summon')await import('../src/worldmass/nativeAreaSceneSummonPreparation');
 else if(cold==='operation')await import('../src/worldmass/nativeAreaCombatOperation');
 else throw Error('Unknown cold entry');
 const module=await import('../src/worldmass/nativeAreaScenePopulation');
 assert.equal(module.nativePopulationCreateMonster,module.NativeAreaScenePopulation.prototype.createMonster);
 assert.equal(typeof module.nativePopulationCreateMonster,'function');
 assert.equal(module.nativePopulationCreateMonsterForAdmission,module.NativeAreaScenePopulation.prototype.createMonsterForAdmission);
 console.log('PASS original population operation after cold '+cold);
}else{
 const identityOnly=process.argv.includes('--identity-only'),modes=identityOnly?[]:['population','summon','operation'];
 await Promise.all(modes.map(mode=>new Promise<void>((resolve,reject)=>{
  const child=spawn(process.execPath,['--import','tsx',fileURLToPath(import.meta.url),'--cold-factory='+mode],{windowsHide:true,stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);child.on('error',reject);child.on('close',code=>{try{assert.equal(code,0,stderr+'\n'+stdout);assert(stdout.includes('PASS original population operation after cold '+mode));resolve();}catch(error){reject(error);}});
 })));
 // The explicit identity-only diagnostic separates operation identity from cold import ordering.
 if(identityOnly)await import('../src/engine/world');
 // Deliberately enter the population module first in the full course.
 const {NativeAreaScenePopulation,nativePopulationCreateMonster,nativePopulationCreateMonsterForAdmission}=await import('../src/worldmass/nativeAreaScenePopulation');
 const {makeSimWorld}=await import('../src/sim/arena');
 const {NativeAreaActorAuthority}=await import('../src/worldmass/nativeAreaActorAuthority');
 const {NativeAreaSceneProgression,freshSceneProgressionState}=await import('../src/worldmass/nativeAreaSceneProgression');
 const {NativeAreaSceneSummonPreparation}=await import('../src/worldmass/nativeAreaSceneSummonPreparation');
 const {freshAssemblyInput,NativeAreaSceneAssembly}=await import('./nativeFreshAssemblyFixture');
 const w=makeSimWorld('warrior',19381),raw=freshAssemblyInput(w,w.zone),campaign=Object.assign(raw.campaign,{seatOf:w.seatOf.bind(w),timeflow:w.timeflow,mercSyncedLevel:(w as unknown as {mercSyncedLevel:number}).mercSyncedLevel});
 const area=new NativeAreaSceneAssembly(raw),scene=area.input.scene,population=area.input.population;
 const authority=new NativeAreaActorAuthority<NativeSummonPreparationRuntime>(campaign);
 const progression=new NativeAreaSceneProgression({scene,population,ecology:area.input.ecology,geometry:area.input.geometry,runtime:area.input.registry.input.birth,loot:area.lootController,campaign,state:freshSceneProgressionState(),authority:authority as unknown as NativeSceneProgressionAuthority});
 const input={scene,population,campaign,progression,authority},owner=new NativeAreaSceneSummonPreparation(input),binding=authority.register(scene,{progression});authority.claim(binding,scene.actors);
 const caster=scene.player,census=[...scene.actors],proto=NativeAreaScenePopulation.prototype,descriptor=Object.getOwnPropertyDescriptor(proto,'createMonster')!,args=['skeleton_warrior',9,caster.team,caster] as const;
 assert.equal(descriptor.value,nativePopulationCreateMonster);assert.equal(population.createMonster,nativePopulationCreateMonster);
 let forgedCalls=0;const forged=function(){forgedCalls++;throw Error('Forged factory executed');};
 const replace=()=>Object.defineProperty(proto,'createMonster',{...descriptor,value:forged});
 let held!:NativeSummonPreparationScope['createMonster'],first!:Actor,second!:Actor;
 try{
  replace();
  const laterOwner=new NativeAreaSceneSummonPreparation(input);
  assert.throws(()=>laterOwner.run(caster,s=>s.createMonster(...args)),/actual population factory operation/);
  assert.equal(forgedCalls,0,'constructor cannot recapture an altered prototype');
  assert.equal(nativePopulationCreateMonster,descriptor.value,'export retains the original module-time operation');
 }finally{Object.defineProperty(proto,'createMonster',descriptor);}
 const ownDescriptor=Object.getOwnPropertyDescriptor(population,'createMonster');
 try{
  Object.defineProperty(population,'createMonster',{configurable:true,writable:true,value:forged});
  assert.throws(()=>owner.run(caster,s=>s.createMonster(...args)),/actual population factory operation/);
  assert.equal(forgedCalls,0);
 }finally{if(ownDescriptor)Object.defineProperty(population,'createMonster',ownDescriptor);else delete (population as {createMonster?:unknown}).createMonster;}
 owner.run(caster,s=>{
  held=s.createMonster;first=held(...args);assert.equal(first.owner,caster);assert.equal(population.factoryOwnerOf(first)?.owner,caster);authority.assertUnclaimed(first);assert(!scene.actors.includes(first));
  try{
   replace();
   second=held(...args);assert.notEqual(second,first);assert.equal(second.owner,caster);assert.equal(population.factoryOwnerOf(second)?.owner,caster);authority.assertUnclaimed(second);assert(!scene.actors.includes(second));
   assert.throws(()=>s.createMonster(...args),/actual population factory operation/);
  }finally{Object.defineProperty(proto,'createMonster',descriptor);}
  assert.throws(()=>held('skeleton_warrior',9,caster.team,first),/scoped caster/);
  first.life=1;
 });
 assert.throws(()=>held(...args),/Expired or nested/);
 assert.equal(first.life,1,'completed native preparation effect remains');
 assert.equal(forgedCalls,0);assert.deepEqual(scene.actors,census);authority.assertAdmitted(scene);authority.assertUnclaimed(first);authority.assertUnclaimed(second);
 for(const actor of census)assert.equal(authority.require(actor).scene,scene);
 const {NativeAreaSceneBirthAdmission}=await import('../src/worldmass/nativeAreaSceneBirthAdmission');
 const attestDescriptor=Object.getOwnPropertyDescriptor(proto,'createMonsterForAdmission')!,ownAttest=Object.getOwnPropertyDescriptor(population,'createMonsterForAdmission');
 assert.equal(attestDescriptor.value,nativePopulationCreateMonsterForAdmission);
 let forgedAttestationCalls=0,unissuedFactoryCalls=0,admitted!:Actor,heldAdmission!:NativeSummonPreparationScope['createMonster'];
 const forgedAttestation=function(){forgedAttestationCalls++;return first;};
 try{
  Object.defineProperty(proto,'createMonsterForAdmission',{...attestDescriptor,value:forgedAttestation});
  Object.defineProperty(population,'createMonsterForAdmission',{configurable:true,writable:true,value:forgedAttestation});
  const admission=new NativeAreaSceneBirthAdmission({authority,scene,population});
  admission.run(()=>{
   heldAdmission=admission.createMonster;
   try{
    Object.defineProperty(population,'createMonster',{configurable:true,writable:true,value:()=>{unissuedFactoryCalls++;return first;}});
    admitted=heldAdmission(...args);assert.equal(admitted.owner,caster);authority.assertUnclaimed(admitted);
    assert.equal(population.factoryOwnerOf(admitted)?.owner,caster);
    scene.actors.push(admitted);admission.admitInserted(admitted);assert.equal(authority.require(admitted).scene,scene);
    assert.throws(()=>admission.createMonster(...args),/foreign or reused/);
   }finally{if(ownDescriptor)Object.defineProperty(population,'createMonster',ownDescriptor);else delete (population as {createMonster?:unknown}).createMonster;}
  });
  assert.throws(()=>heldAdmission(...args),/exact top frame/);
 }finally{
  Object.defineProperty(proto,'createMonsterForAdmission',attestDescriptor);
  if(ownAttest)Object.defineProperty(population,'createMonsterForAdmission',ownAttest);else delete (population as {createMonsterForAdmission?:unknown}).createMonsterForAdmission;
 }
 assert.equal(forgedAttestationCalls,0);assert.equal(unissuedFactoryCalls,1);assert.equal(nativePopulationCreateMonsterForAdmission,attestDescriptor.value);
 assert.deepEqual(scene.actors,[...census,admitted]);authority.assertAdmitted(scene);authority.assertUnclaimed(first);authority.assertUnclaimed(second);
 const result={admissionOriginalExportIdentity:true,admissionConstructorDoesNotRecapture:true,forgedAttestationCalls,unissuedFactoryCalls,heldAdmissionPreservesSelectedFactory:true,genuineExplicitInsertionAdmitted:true,expiredAdmissionRefused:true,coldEntries:modes,originalExportIdentity:true,constructorDoesNotRecapture:true,forgedPrototypeRefused:true,forgedInstanceRefused:true,heldGenuineOperationSurvivesReplacement:true,wrongOwnerRefused:true,expiredOperationRefused:true,forgedCalls,completedBodies:2,uninsertedUnclaimed:true,scope:'Original operation identity and preparation lifetime only; not full summon insertion or process/server save recovery'};
 const report={result,receipt:createHash('sha256').update(JSON.stringify(result)).digest('hex')};fs.mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('./reports/native-cold-factory.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
