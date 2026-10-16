/** Narrow filesystem controls for explicit current-runtime dispatch. No game
 * engine is imported and no probe process runs in this control. */
import assert from 'node:assert/strict';
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
console.log('PASS explicit current source is dispatched and visibly named');
const ordinary:ProbeRow={probe:'probe_other.ts',status:'green',tier:'slow',args:['--retained'],why:'control'};
assert.deepEqual(resolveProbeExecution(ordinary,scratch),{file:ordinary.probe,args:['--retained'],label:ordinary.probe,historicalSourceOnly:false});
assert.equal(probeRerunCommand(ordinary),'npx tsx balance/probe_other.ts --retained');
console.log('PASS unrelated invocation arguments and labels remain unchanged');
for(const file of ['proberoster.ts',spec.historicalProbe,spec.currentCheck]){
 const target=path.join(scratch,'balance',file),original=readFileSync(target);
 try{writeFileSync(target,Buffer.concat([original,Buffer.from('\n// changed source identity\n')]));assert.throws(()=>resolveProbeExecution(historical,scratch),/source identity changed/);}finally{writeFileSync(target,original);}
}
for(const changed of [{...historical,status:'excluded',excuse:'red'},{...historical,tier:'slow'},{...historical,args:['--historical']},{...historical,why:'new reason'}])assert.throws(()=>resolveProbeExecution(changed as ProbeRow,scratch));
assert.throws(()=>validateProbeSupersessions(PROBE_ROSTER.filter(row=>row!==historical),scratch),/Exactly one/);
assert.throws(()=>validateProbeSupersessions([...PROBE_ROSTER,historical],scratch),/Exactly one/);
console.log('PASS source, row identity, missing and duplicate registration refuse before dispatch');
validateProbeSupersessions(PROBE_ROSTER,scratch);
console.log(JSON.stringify({status:'executed runner controls',scratch,engineProcesses:0,historicalGameplayRuns:0,currentTarget:spec.currentCheck,acceptanceRule:CRUSADE_ARRIVAL_RULE.id,historicalMappings:CRUSADE_ARRIVAL_HISTORICAL_CASES}));
