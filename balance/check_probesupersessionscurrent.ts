/** Current filesystem controls; prior check_probesupersessions.ts remains historical. No game
 * engine is imported and no probe process runs in this control. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {CRUSADE_CURRENT_ASSERTION_SUPERSESSION as assertionSpec,CRUSADE_CURRENT_ASSERTION_CASES as assertionCases,CRUSADE_CURRENT_OBSERVED_REFUSALS as observedRefusals} from './probesupersessioncontracts';
import {nativeRepeatEventArchive} from './nativeRepeatEventArchive';
import {CRUSADE_HISTORICAL_SOURCE_SEAL as seal,VERMINFALL_CRUSADE_CI_SUPERSESSION as ciSpec,VERMINFALL_CRUSADE_HISTORICAL_CASES as ciMap,VERMINFALL_CRUSADE_CURRENT_CASES as ciCases,VERMINFALL_CRUSADE_ORIGINAL_FINAL_ASSERTIONS as originalFinalAssertions,VERMINFALL_CRUSADE_RECORDED_FAILURE as recordedFailure,PROBE_SUPERSESSION_CONTROL_MIGRATION as controlMigration,PROBE_SUPERSESSION_CONTROL_CASES as controlCases} from './probesupersessioncontracts';
import {copyFileSync,mkdtempSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PROBE_ROSTER,type ProbeRow} from './proberoster';
import {CRUSADE_ARRIVAL_SUPERSESSION as spec,CRUSADE_ARRIVAL_RULE,CRUSADE_ARRIVAL_HISTORICAL_CASES,CRUSADE_ARRIVAL_CURRENT_CASES,resolveProbeExecution,validateProbeSupersessions,probeExecutionLabel,probeRerunCommand,probeMatchesFilter} from './probesupersessions';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const scratch=mkdtempSync(path.join(tmpdir(),'hollow-wake-probe-supersession-'));
mkdirSync(path.join(scratch,'balance'));
for(const file of ['proberoster.ts',spec.historicalProbe,spec.currentCheck])copyFileSync(path.join(root,'balance',file),path.join(scratch,'balance',file));
const historical=PROBE_ROSTER.find(row=>row.probe===spec.historicalProbe)!;assert(historical);
validateProbeSupersessions(PROBE_ROSTER,scratch);
assert.equal(CRUSADE_ARRIVAL_RULE.id,'native-crusade-consumed-visit-82c516');
assert.equal(CRUSADE_ARRIVAL_RULE.predecessor,spec.predecessor);
assert.equal(CRUSADE_ARRIVAL_RULE.observedMismatchReportSha256,'84f814b43a6dd510adc16a6e02d6ce6eb7e9fd15aea14fa0d76fe64a963114e7');
assert.equal(spec.historicalCases,CRUSADE_ARRIVAL_HISTORICAL_CASES);
assert.equal(spec.currentCases,CRUSADE_ARRIVAL_CURRENT_CASES);
assert(Object.isFrozen(CRUSADE_ARRIVAL_RULE)&&Object.isFrozen(CRUSADE_ARRIVAL_HISTORICAL_CASES)&&Object.isFrozen(CRUSADE_ARRIVAL_CURRENT_CASES));
assert.equal(CRUSADE_ARRIVAL_HISTORICAL_CASES.length,13);
assert.deepEqual(CRUSADE_ARRIVAL_HISTORICAL_CASES.map(row=>row.historicalIndex),Array.from({length:13},(_,i)=>i+1));
assert.equal(new Set(CRUSADE_ARRIVAL_HISTORICAL_CASES.map(row=>row.historicalName)).size,13);
assert.equal(new Set(CRUSADE_ARRIVAL_HISTORICAL_CASES.map(row=>row.currentCase)).size,13);
const entryCases=new Set(CRUSADE_ARRIVAL_CURRENT_CASES);assert.equal(entryCases.size,33);
const historicalSource=readFileSync(path.join(scratch,'balance',spec.historicalProbe),'utf8');
for(const row of CRUSADE_ARRIVAL_HISTORICAL_CASES){
 assert(Object.isFrozen(row));assert(historicalSource.includes("'"+row.historicalName+"'"),'Mapped original name must exist in the exact pinned historical source');
 assert(entryCases.has(row.currentCase),'Mapped current name must belong to the exact source-pinned entry map');
 assert.equal(row.currentCase,CRUSADE_ARRIVAL_CURRENT_CASES[row.currentIndex-1]);
 assert(row.disposition.length>0&&row.rationale.length>0);
}
console.log('PASS all thirteen historical cases have unique frozen dispositions in the exact current entry map');
const selected=resolveProbeExecution(historical,scratch);
assert.equal(selected.file,spec.currentCheck);assert.equal(selected.historicalSourceOnly,true);assert.deepEqual(selected.args,[]);
assert.match(selected.label,/CURRENT-SUCCESSOR/);assert(selected.label.includes(spec.historicalProbe)&&selected.label.includes(spec.currentCheck));
assert.equal(probeExecutionLabel(historical),selected.label);
assert.equal(probeRerunCommand(historical),'npx tsx balance/'+spec.currentCheck);
assert.deepEqual(PROBE_ROSTER.filter(row=>probeMatchesFilter(row,spec.currentCheck)),[historical]);
assert.deepEqual(PROBE_ROSTER.filter(row=>probeMatchesFilter(row,spec.historicalProbe)),[historical]);
assert.deepEqual(PROBE_ROSTER.filter(row=>probeMatchesFilter(row,assertionSpec.historicalCheck)),[historical]);
console.log('PASS explicit current source is dispatched and visibly named');
const ordinary:ProbeRow={probe:'probe_other.ts',status:'green',tier:'slow',args:['--retained'],why:'control'};
assert.deepEqual(resolveProbeExecution(ordinary,scratch),{file:ordinary.probe,args:['--retained'],label:ordinary.probe,historicalSourceOnly:false});
assert.equal(probeRerunCommand(ordinary),'npx tsx balance/probe_other.ts --retained');
console.log('PASS unrelated invocation arguments and labels remain unchanged');
for(const file of [spec.historicalProbe,spec.currentCheck]){
 const target=path.join(scratch,'balance',file),original=readFileSync(target);
 try{writeFileSync(target,Buffer.concat([original,Buffer.from('\n// changed source identity\n')]));assert.throws(()=>resolveProbeExecution(historical,scratch),/source identity changed/);}finally{writeFileSync(target,original);}
}
for(const changed of [{...historical,status:'excluded',excuse:'red'},{...historical,tier:'slow'},{...historical,args:['--historical']},{...historical,why:'new reason'}])assert.throws(()=>resolveProbeExecution(changed as ProbeRow,scratch));
assert.throws(()=>validateProbeSupersessions(PROBE_ROSTER.filter(row=>row!==historical),scratch),/Exactly one/);
assert.throws(()=>validateProbeSupersessions([...PROBE_ROSTER,historical],scratch),/Exactly one/);
console.log('PASS source, row identity, missing and duplicate registration refuse before dispatch');
validateProbeSupersessions(PROBE_ROSTER,scratch);
// Final current-control report follows every source and migration assertion below.

// The original whole-file roster refusal is explicitly superseded. Its exact
// old control remains untouched and is source evidence, never current PASS.
const lf=(text:string)=>text.replace(/\r\n/g,'\n');
const sha=(text:string|Buffer)=>createHash('sha256').update(text).digest('hex');
assert.equal(sha(lf(readFileSync(path.join(root,'balance',controlMigration.historicalControl),'utf8'))),controlMigration.historicalLfSha256);
assert.equal(controlMigration.currentControl,'check_probesupersessionscurrent.ts');
assert.equal(controlCases.length,8);assert.equal(new Set(controlCases.map(row=>row.id)).size,8);
assert.equal(controlCases.filter(row=>row.disposition==='explicit policy supersession').length,1);
const rosterTarget=path.join(scratch,'balance','proberoster.ts'),rosterOriginal=readFileSync(rosterTarget);
try{
 writeFileSync(rosterTarget,Buffer.concat([rosterOriginal,Buffer.from('\n// unrelated roster text may evolve\n')]));
 assert.deepEqual(resolveProbeExecution(historical,scratch),selected);
 validateProbeSupersessions([...PROBE_ROSTER,ordinary],scratch);
}finally{writeFileSync(rosterTarget,rosterOriginal);}
console.log('PASS exact superseded row refuses drift while unrelated roster changes remain allowed; original whole-roster control is historical');

// One finite line-ending witness binds the current historical source to the
// named sealed raw archive record and the actual predecessor Git blob.
function assertHistoricalSeal(source:string):void{
 const body=lf(source),bytes=Buffer.from(body,'utf8');
 assert.equal(seal.predecessor,spec.predecessor);assert.equal(seal.file,'balance/'+spec.historicalProbe);
 assert.equal(bytes.length,seal.parentBlobBytes);assert.equal(sha(bytes),seal.parentBlobSha256);
 assert.equal(spec.historicalLfSha256,seal.parentBlobSha256);
 assert.equal(createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex'),seal.parentBlobOid);
 assert.equal(seal.legacyArchive,'balance/nativeRepeatEventArchive.ts');assert.equal(seal.legacyCollection,'accepted');
 const rows=nativeRepeatEventArchive.accepted.filter(row=>row.file===seal.file);assert.equal(rows.length,1);assert.equal(rows[0].sha256,seal.legacyRawSha256);
 assert.deepEqual(seal.legacyCrLfLines,[28]);const lines=body.split('\n');
 for(const line of seal.legacyCrLfLines){assert(Number.isInteger(line)&&line>0&&line<lines.length);lines[line-1]+='\r';}
 const restored=Buffer.from(lines.join('\n'),'utf8');assert.equal(restored.length,seal.legacyRawBytes);assert.equal(sha(restored),rows[0].sha256);
}
assertHistoricalSeal(historicalSource);assert.throws(()=>assertHistoricalSeal(historicalSource+'\n// drift\n'));
console.log('PASS historical Crusade source matches the sealed archive and exact predecessor blob through the declared line-ending witness');

mkdirSync(path.join(scratch,'.github','workflows'),{recursive:true});
for(const file of [ciSpec.historicalCheck,ciSpec.currentCheck])copyFileSync(path.join(root,'balance',file),path.join(scratch,'balance',file));
copyFileSync(path.join(root,'.github','workflows','ci.yml'),path.join(scratch,'.github','workflows','ci.yml'));
function assertVerminfallCiContract(at:string):void{
 const old=lf(readFileSync(path.join(at,'balance',ciSpec.historicalCheck),'utf8')),current=lf(readFileSync(path.join(at,'balance',ciSpec.currentCheck),'utf8'));
 assert.equal(sha(old),ciSpec.historicalLfSha256,'Historical46 source identity changed');assert.equal(sha(current),ciSpec.currentLfSha256,'Current48 source identity changed');
 assert.equal(ciSpec.kind,'ci-check');assert.equal(ciSpec.ruleId,'native-verminfall-crusade-composition-82c516');
 assert.equal(ciMap.length,46);assert.equal(ciCases.length,48);assert.equal(new Set(ciCases).size,48);
 assert.deepEqual(ciMap.map(row=>row.oldIndex),Array.from({length:46},(_,i)=>i+1));
 assert.deepEqual(ciMap.map(row=>row.currentIndex),Array.from({length:46},(_,i)=>i+1));
 assert.equal(new Set(ciMap.map(row=>row.oldName)).size,46);
 for(const row of ciMap){assert.equal(row.currentName,ciCases[row.currentIndex-1]);assert.equal(row.oldName,row.currentName);assert.equal(row.assertionsChanged,false);}
 assert(ciMap.slice(0,45).every(row=>row.disposition==='body-byte-exact'));assert.match(ciMap[45].disposition,/hook-relocated/);
 const marker="course('"+ciSpec.case46Name+"',s=>{";
 const split=(text:string)=>{assert.equal(text.split(marker).length,2,'Unique case46 boundary required');return text.indexOf(marker);};
 const oldPrefix=old.slice(0,split(old)),currentPrefix=current.slice(0,split(current));
 assert.equal(currentPrefix.split(ciSpec.currentImport).length,2,'Only declared import delta may be reversed');
 assert.equal(currentPrefix.replace(ciSpec.currentImport,ciSpec.originalImport),oldPrefix);
 assert.equal(Buffer.byteLength(oldPrefix,'utf8'),ciSpec.prefixBeforeCase46Utf8Bytes);assert.equal(sha(oldPrefix),ciSpec.prefixBeforeCase46LfSha256);
 const oldFinal=old.slice(split(old),old.indexOf('\nassert.equal(results.length,46,')),currentFinal=current.slice(split(current),current.indexOf('\n// These two controls'));
 assert(oldFinal.length>0&&currentFinal.length>0);assert.equal(originalFinalAssertions.length,5);
 for(const assertion of originalFinalAssertions){assert(oldFinal.includes(assertion),'Original final assertion missing');assert(currentFinal.includes(assertion),'Current final assertion missing');}
 assert.equal(recordedFailure.sourceFile,'balance/'+ciSpec.historicalCheck);assert.equal(recordedFailure.sourceLfSha256,ciSpec.historicalLfSha256);
 assert.equal(recordedFailure.exit,1);assert.equal(recordedFailure.closed,true);assert.equal(recordedFailure.forced,false);assert.equal(recordedFailure.cleanupUnresolved,false);
 assert.equal(recordedFailure.logSha256,'d0d5431994a3617be3ced2a41e71c0b0f41531c499b69cc003937e868d8c49b3');
 const commands=lf(readFileSync(path.join(at,'.github','workflows','ci.yml'),'utf8')).split('\n').map(line=>line.trim());
 assert.equal(commands.filter(line=>line===ciSpec.currentCiCommand).length,1,'CI must invoke exact current48 once');
 assert.equal(commands.filter(line=>line===ciSpec.historicalCiCommand).length,0,'Historical46 must not masquerade as current CI');
 assert.equal(commands.filter(line=>line==='npx tsx balance/'+controlMigration.currentControl).length,1);
 assert.equal(commands.filter(line=>line==='npx tsx balance/'+controlMigration.historicalControl).length,0);
}
assertVerminfallCiContract(scratch);
for(const file of [ciSpec.historicalCheck,ciSpec.currentCheck]){const target=path.join(scratch,'balance',file),before=readFileSync(target);try{writeFileSync(target,Buffer.concat([before,Buffer.from('\n// drift\n')]));assert.throws(()=>assertVerminfallCiContract(scratch),/source identity changed/);}finally{writeFileSync(target,before);}}
const ciPath=path.join(scratch,'.github','workflows','ci.yml'),ciBefore=readFileSync(ciPath,'utf8');
for(const replacement of [ciSpec.historicalCiCommand,ciSpec.currentCiCommand+'\n          '+ciSpec.currentCiCommand]){try{writeFileSync(ciPath,ciBefore.replace(ciSpec.currentCiCommand,replacement));assert.throws(()=>assertVerminfallCiContract(scratch),/CI must invoke/);}finally{writeFileSync(ciPath,ciBefore);}}
assertVerminfallCiContract(scratch);
console.log('PASS committed46-to48 CI map preserves first45 prefix and every original final assertion; source or CI drift refuses');


const prior33=lf(readFileSync(path.join(root,'balance',assertionSpec.historicalCheck),'utf8'));
const current33=lf(readFileSync(path.join(root,'balance',assertionSpec.currentCheck),'utf8'));
assert.equal(sha(prior33),assertionSpec.historicalLfSha256);assert.equal(sha(current33),assertionSpec.currentLfSha256);
assert.equal(spec.currentCheck,assertionSpec.currentCheck);assert.equal(spec.currentLfSha256,assertionSpec.currentLfSha256);
assert.equal(assertionCases.length,33);assert.deepEqual(assertionCases.map(row=>row.historicalIndex),Array.from({length:33},(_,i)=>i+1));
assert.deepEqual(assertionCases.map(row=>row.currentIndex),Array.from({length:33},(_,i)=>i+1));
assert.deepEqual(assertionCases.map(row=>row.currentName),CRUSADE_ARRIVAL_CURRENT_CASES);
assert(assertionCases.every(row=>row.historicalName===row.currentName));
assert.deepEqual(assertionCases.filter(row=>row.disposition==='exact observed name/message replaces broader regex').map(row=>row.currentIndex),[6,7,8,9]);
assert.equal(observedRefusals.length,4);assert.deepEqual(observedRefusals.map(row=>row.currentIndex),[6,7,8,9]);
for(const row of observedRefusals){assert.equal(row.name,'Error');assert.equal(row.reportSha256,assertionSpec.observationReportSha256);assert.equal(row.observedParent,assertionSpec.predecessor);assert.equal(row.matchesOriginalNarrowPattern,true);assert.match(row.message,/changed|physical|subject|census|missing|ownership|belong|authority|reenter/i);assert(current33.includes("'"+row.kind+"':Object.freeze({name:'"+row.name+"',message:'"+row.message+"'})"));}
const once=(text:string,from:string,to:string)=>{assert.equal(text.split(from).length,2,'Exact single current33 migration edit required');return text.replace(from,to);};
let restored33=once(current33,assertionSpec.newHeader,assertionSpec.oldHeader);
restored33=once(restored33,"import assert from 'node:assert/strict';\n"+assertionSpec.helperSource,"import assert from 'node:assert/strict';");
restored33=once(restored33,assertionSpec.currentExpression,assertionSpec.priorBroaderPattern);
assert.equal(restored33,prior33,'Only documented header/helper/four-branch matcher changes may differ from prior33');
console.log('PASS all33 previous arrival cases remain accounted for; four current refusals use observed exact error identity and all other source is restored byte-for-byte');

console.log(JSON.stringify({status:'executed current source controls',scratch,engineProcesses:0,historicalGameplayRuns:0,currentTarget:spec.currentCheck,acceptanceRule:CRUSADE_ARRIVAL_RULE.id,historicalMappings:CRUSADE_ARRIVAL_HISTORICAL_CASES,priorControl:controlMigration.historicalControl,currentControl:controlMigration.currentControl,controlMigration:controlCases,ciHistoricalCases:ciMap.length,ciCurrentCases:ciCases.length,recordedFailure,sourceSeal:seal,current33Mapping:assertionCases,observedRefusals}));
