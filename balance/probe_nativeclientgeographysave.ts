import '../src/engine/world';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {bootSimEngine} from '../src/sim/arena';
import {makeAccount} from '../src/meta/account';
import {serializeCharacter,type CharacterSave} from '../src/meta/character';
import {CLASSES} from '../src/data/classes';
import {buildManifest} from '../src/packages/manifest';
import {NativeClientStart} from '../src/worldmass/nativeClientStart';
import {readNativeRetainedSave,type NativeRetainedSaveV1} from '../src/worldmass/nativeRetainedSave';
import {canonical} from '../src/worldmass/random';
import {address} from '../src/worldmass/address';
import type {MassNativeMapping} from '../src/worldmass/nativeGeography';
import {refuseWorldStartup} from './nativeClientStartFixture';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
import {withSeededRandom} from '../src/core/rng';
bootSimEngine();
const input=process.argv.indexOf('--read');
if(input>=0){const raw=readFileSync(process.argv[input+1],'utf8'),save=JSON.parse(raw) as CharacterSave,result=readNativeRetainedSave(save);assert.equal(JSON.stringify(save),raw);writeFileSync(process.argv[input+1]+'.restored.json',JSON.stringify({sourceJson:result.geography.spec.sourceJson,identity:result.geography.identity,manifest:result.manifest,worldHash:save.world!.nativeRetained!.worldHash,player:result.world.player,memory:result.world.memory}));console.log(JSON.stringify({restored:true}));}
else {
 const mapping:MassNativeMapping={schema:1,algorithm:'bigint-relative-native-map-v1',addressSpan:960,physicalOrigin:address('surface','0','0',0,0,960),nativeOrigin:{x:0,y:0},physicalUnitsPerNativeUnit:{numerator:'20',denominator:'1'},nativeDimension:'surface',nativeBounds:{minX:-10000,minY:-10000,maxX:10000,maxY:10000},outsideDomain:'refuse',rounding:'nearest-binary64-ties-even-once'};
 const result=withSeededRandom(48010,()=>refuseWorldStartup([],worldDrivers=>{
  const account=makeAccount(),start=new NativeClientStart(account,mapping),made=start.begin({kind:'run',classDef:CLASSES.find(c=>c.id==='tamer')!,manifest:buildManifest(account,1211),prologue:'skip'});assert(made);
  const p=made.writer.player;p.life=p.maxLife()*.37;p.mana=p.maxMana()*.43;
  const save=serializeCharacter(made.writer),raw=JSON.stringify(save),parsed=JSON.parse(raw) as CharacterSave,record=readNativeRetainedSave(parsed);
  assert.equal(record.geography.spec.sourceJson,made.runtime.geography.spec.sourceJson);assert.equal(record.geography.identity,made.runtime.geography.identity);assert.equal(canonical(record.manifest),canonical(made.writer.manifest));
  assert.equal(parsed.world!.player!.vitals!.life,.37);assert(parsed.companions?.length,'actual starter companion rides the original save');
  const checks=[];for(const [name,mutate] of [
   ['missing envelope',(s:CharacterSave)=>{delete s.world!.nativeRetained;}],
   ['world edit',(s:CharacterSave)=>{s.world!.time++;}],
   ['manifest edit',(s:CharacterSave)=>{s.expedition!.seed++;}],
   ['character edit',(s:CharacterSave)=>{s.classId='warrior';}],
   ['source edit',(s:CharacterSave)=>{Reflect.set((s.world!.nativeRetained! as NativeRetainedSaveV1).geography,'sourceJson',(s.world!.nativeRetained! as NativeRetainedSaveV1).geography.sourceJson+' ');}],
   ['mapping edit',(s:CharacterSave)=>{(s.world!.nativeRetained! as NativeRetainedSaveV1).geography.mapping.nativeOrigin.x++;}],
  ] as const){const s=structuredClone(parsed);mutate(s);const before=JSON.stringify(s);assert.throws(()=>readNativeRetainedSave(s),/retained|Retained|checksum|Conflicting|Native/);assert.equal(JSON.stringify(s),before);checks.push(name);}
  mkdirSync(resolve('balance/reports'),{recursive:true});const output=resolve('balance/reports/geography-save-character-'+process.pid+'.json');writeFileSync(output,raw);const cli=createRequire(import.meta.url).resolve('tsx/cli');const child=execFileSync(process.execPath,[cli,fileURLToPath(import.meta.url),'--read',output],{encoding:'utf8',windowsHide:true});assert.deepEqual(JSON.parse(child.trim().split(/\r?\n/).at(-1)!),{restored:true});const cold=JSON.parse(readFileSync(output+'.restored.json','utf8'));
  assert.equal(cold.sourceJson,made.runtime.geography.spec.sourceJson);assert.equal(cold.identity,made.runtime.geography.identity);assert.deepEqual(cold.player,record.world.player);assert.deepEqual(cold.memory,record.world.memory);assert.equal(readFileSync(output,'utf8'),raw);
  const facts={worldHash:parsed.world!.nativeRetained!.worldHash,sourceHash:record.geography.spec.sourceHash,mappingHash:record.geography.spec.mappingHash,life:parsed.world!.player!.vitals!.life,companions:parsed.companions!.length,coldProcess:true,refusals:checks,worldDrivers};start.cancel();return facts;
 }));
 const report={scope:'Real retained save envelope and independent-process recorded geography restoration. Actual character hydration is covered by separate Continue courses.',result,receipt:combatHash(JSON.stringify(result))};mkdirSync(resolve('balance/reports'),{recursive:true});writeCombatProof('native-client-geography-save.json',report);console.log(JSON.stringify(report));
}
