import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {nativeLegacySourceRepairArchive as legacy} from './nativeLegacySourceRepairArchive';
import {beforeNativeLegacySource,readFileSync} from './nativeLegacySourceRepairFS';
import {beforeNativeTitanLifetimeActorSlots} from './nativeTitanLifetimeReceiptFixture';
import {assertNativeArrivalActorSlots} from './nativeCaravanArrivalReceiptFixture';
const hash=(s:string)=>createHash('sha256').update(s.replace(/\r\n?/g,'\n')).digest('hex');
let mutations=0;
for(const row of legacy){const actual=fs.readFileSync(new URL('../'+row.file,import.meta.url),'utf8');assert.equal(hash(actual),row.afterHash);const committed=execFileSync('git',['show',row.predecessor+':'+row.file],{encoding:'utf8'});assert.equal(row.before,committed);assert.equal(beforeNativeLegacySource(row.file,actual),committed);assert.equal(readFileSync(new URL('../'+row.file,import.meta.url),'utf8'),committed);assert.deepEqual(readFileSync(new URL('../'+row.file,import.meta.url)),Buffer.from(committed));for(const s of [actual,row.before])for(const at of [0,Math.floor(s.length/2),s.length]){assert.throws(()=>beforeNativeLegacySource(row.file,s.slice(0,at)+' unexplained '+s.slice(at)),/Unknown exact/);mutations++;}assert.equal(beforeNativeLegacySource('outside/'+row.file,actual),actual);}
assertNativeArrivalActorSlots(fs.readFileSync(new URL('../src/engine/actor.ts',import.meta.url),'utf8'));
const priorActor=execFileSync('git',['show','e0600ae8:src/engine/actor.ts'],{encoding:'utf8'});assert(!priorActor.includes('companionReturnTo'));for(const name of ['resourceFlows','relicEffectsSuppressed','selfBankCues','presenceBadge'])assert(priorActor.includes(name));
const absent=()=>({$undefined:true});
const actor={id:1,name:'actual fixture',team:'player',restoreGains:[],resourceFlows:[],anatomyCues:{},cosmeticKind:'fixture',relicEffectsSuppressed:absent(),aiCooldown:0,ironWard:0,selfBankCues:absent(),presenceBadge:absent(),chargeState:absent(),decay:0,companionReturnTo:absent(),recallTimer:0,life:17,position:{x:9,y:13}};
const state={runtime:{sources:{$map:[]},heads:{$map:[]},pieces:{$map:[]}},actors:[actor],doodads:[],bridges:[],grounds:[],regrowing:[],flashes:[],shake:0,hazards:[],field:[],ledger:{},messages:[]};
const input={stages:[{name:'native body',state}],draws:[.25,.75],continuation:.5},original=structuredClone(input),expected=structuredClone(input);delete (expected.stages[0].state.actors[0] as Partial<typeof actor>).companionReturnTo;
assert.deepEqual(beforeNativeTitanLifetimeActorSlots(input),expected);assert.deepEqual(input,original,'receipt projection never mutates the actual native record');
for(const value of [0,17,{},{$undefined:false}]){const altered=structuredClone(input);Reflect.set(altered.stages[0].state.actors[0],'companionReturnTo',value);assert.throws(()=>beforeNativeTitanLifetimeActorSlots(altered));mutations++;}
const missing=structuredClone(input);Reflect.deleteProperty(missing.stages[0].state.actors[0],'companionReturnTo');assert.throws(()=>beforeNativeTitanLifetimeActorSlots(missing));mutations++;
const badReference=structuredClone(input);Reflect.set(badReference.stages[0].state,'grounds',[{$ref:999999}]);assert.throws(()=>beforeNativeTitanLifetimeActorSlots(badReference));mutations++;
console.log('PASS full gate fixture controls',JSON.stringify({legacyRows:legacy.length,mutations,exactTitanBoundary:'e0600ae8',originalSlots:4,newScalarRemoved:1,completeRecordPreserved:true}));

import {beforeNativeRuntimeBirthStageZero} from './nativeRuntimeBirthReceiptFixture';
const birth={course:{method:'placeAmalgamMiniboss',kind:'repeat',mechanism:'native'},result:{stages:[0,1].map(i=>({state:{materializedAmalgamMobs:{$set:['amalgam_0:0@gen_123']}},census:[{id:17,life:13}],draws:[.23],other:'unchanged'+i}))}};
const priorBirth=structuredClone(birth);for(const stage of priorBirth.result.stages)stage.state.materializedAmalgamMobs.$set[0]='amalgam_0@gen_123';
const heldBirth=structuredClone(birth);assert.deepEqual(beforeNativeRuntimeBirthStageZero(birth),priorBirth);assert.deepEqual(birth,heldBirth);
for(const key of ['amalgam_0:1@gen_123','amalgam_1:0@gen_123','amalgam_0@gen_123','amalgam_0:0@foreign']){const bad=structuredClone(birth);bad.result.stages[0].state.materializedAmalgamMobs.$set=[key];assert.throws(()=>beforeNativeRuntimeBirthStageZero(bad));}
const duplicateBirth=structuredClone(birth);duplicateBirth.result.stages[0].state.materializedAmalgamMobs.$set.push('amalgam_0:0@gen_123');assert.throws(()=>beforeNativeRuntimeBirthStageZero(duplicateBirth));
const ordinaryBirth={...birth,course:{...birth.course,method:'spawnWarband'}};assert.equal(beforeNativeRuntimeBirthStageZero(ordinaryBirth),ordinaryBirth);
console.log('PASS complete birth stage-zero receipt controls',{exactMarkerOnly:true,completeRecordsPreserved:true,unknownStagesRefused:5,unrelatedCourseUntouched:true});

