/** Explicit current-runtime replacements for preserved historical contracts.
 * The sealed roster and original probe bytes are still checked. Neither a
 * source check nor a predecessor replay counts as current gameplay execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import type {ProbeRow} from './proberoster';

/** Committed one-to-one migration evidence. The exact current-source digest below
 * binds this ordered entry map to the reviewed source; runtime supervisors compare
 * actual reported names separately. Source preservation is not a runtime pass. */
export const CRUSADE_ARRIVAL_RULE=Object.freeze({
  "id": "native-crusade-consumed-visit-82c516",
  "predecessor": "82c516cedb474e6da6e0b0bc1d4a879bcdf52fb6",
  "observedMismatchReportSha256": "84f814b43a6dd510adc16a6e02d6ce6eb7e9fd15aea14fa0d76fe64a963114e7",
  "observedMismatch": "Strict paired dev-supported setup: ordinary same-visit successor 0 bodies/0 discovery; retained 12 bodies/+1 discovery.",
  "currentContract": "A completed native garrison marker consumes the visit; genuine unoccupied return may admit a never-spent event while preserving old cohorts and issuing-event rewards.",
  "limits": "Named engineering acceptance rule tied to this bounded observation and proposed repair; not an independent user gameplay ruling or natural-recurrence claim."
});
export const CRUSADE_ARRIVAL_CURRENT_CASES:readonly string[]=Object.freeze([
  "same event retains wounded garrison on frames and real return",
  "occupied remote surface defers successor and keeps old bodies and kill effects",
  "expired event commander keeps ordinary kill rewards only",
  "live older event commander suppresses only its campaign while successor muster waits",
  "arrival query-throw",
  "arrival query-remove-body",
  "arrival query-replace-marker",
  "arrival query-reenter",
  "arrival delete-getter-replace",
  "arrival delete-partial",
  "arrival add-partial",
  "arrival notice-partial",
  "selected kill callback replacing event cannot suppress successor",
  "actual occupied frames suppress a new dominant event until unoccupied return",
  "A to B to A dominance never pours spent A twice",
  "same logical event restoration does not reopen consumed visit or return",
  "event absence stays consumed until real empty return allows first appearance",
  "physical peer defers changed event on real return; downed=false",
  "physical peer defers changed event on real return; downed=true",
  "add then later delete and throw consumes native placement exactly once",
  "unhandled delete partial preserves prefix and prevents later arrival hook",
  "unhandled add partial preserves prefix and prevents later arrival hook",
  "asynchronous selected arrival return refuses later hooks",
  "arrival getter cannot borrow sibling or live authority",
  "arrival callable cannot borrow sibling or live authority",
  "claim readiness reserves entry before selected validation reentry",
  "selected query retiring its actual event refuses stale projection",
  "selected query replacing actual census refuses before marker release",
  "initial coordinator selection blocks sibling and live registry entry",
  "query getter replacing marker refuses its returned callable",
  "second factory failure preserves exactly one native partial body",
  "repairing a missing visit guard does not spend unseen dominant event",
  "selected query first error precedes missing guard repair"
]);
export interface CrusadeHistoricalCase {
 readonly historicalIndex:number; readonly historicalName:string;
 readonly disposition:string; readonly currentIndex:number;
 readonly currentCase:string; readonly rationale:string;
}
export const CRUSADE_ARRIVAL_HISTORICAL_CASES:readonly CrusadeHistoricalCase[]=Object.freeze([
 Object.freeze({"historicalIndex":1,"historicalName":"same event retains wounded garrison on frames and real return","disposition":"unchanged course body","currentIndex":1,"currentCase":"same event retains wounded garrison on frames and real return","rationale":"Retain the original course body and every assertion; this instance needs no timing change."}),
 Object.freeze({"historicalIndex":2,"historicalName":"occupied remote surface renews event without removing old bodies","disposition":"explicit timing supersession","currentIndex":2,"currentCase":"occupied remote surface defers successor and keeps old bodies and kill effects","rationale":"Discovery remains 1 during remote-occupied visit, replacing 2; all old body, wound, terrain, stale-commander field/drop and remote ownership assertions retained. Actual unoccupied renewal separately covered by current14."}),
 Object.freeze({"historicalIndex":3,"historicalName":"expired event commander keeps ordinary kill rewards only","disposition":"unchanged course body","currentIndex":3,"currentCase":"expired event commander keeps ordinary kill rewards only","rationale":"Retain the original course body and every assertion; this instance needs no timing change."}),
 Object.freeze({"historicalIndex":4,"historicalName":"live older event commander can suppress only its own campaign","disposition":"explicit timing supersession","currentIndex":4,"currentCase":"live older event commander suppresses only its campaign while successor muster waits","rationale":"Pre-kill discovery remains 1, replacing 2. Exact older issuing-event power nick, successor power, modifier attribution, event ledger and ordinary XP assertions retained."}),
 Object.freeze({"historicalIndex":5,"historicalName":"query-throw","disposition":"same fault relocated to selected genuine arrival","currentIndex":5,"currentCase":"arrival query-throw","rationale":"Fault installed after transfer; original exact exception and receiver assertions preserved."}),
 Object.freeze({"historicalIndex":6,"historicalName":"query-remove-body","disposition":"same fault relocated to selected genuine arrival","currentIndex":6,"currentCase":"arrival query-remove-body","rationale":"Actual incoming hand removed from selected census, refusal asserted and hand restored before transition completes."}),
 Object.freeze({"historicalIndex":7,"historicalName":"query-replace-marker","disposition":"same fault relocated to selected genuine arrival","currentIndex":7,"currentCase":"arrival query-replace-marker","rationale":"Captured marker replaced by selected query; original receiver and unchanged old guard assertions retained."}),
 Object.freeze({"historicalIndex":8,"historicalName":"query-reenter","disposition":"same fault relocated to selected genuine arrival","currentIndex":8,"currentCase":"arrival query-reenter","rationale":"Selected query attempts actual live entry; new arrival guard must refuse it."}),
 Object.freeze({"historicalIndex":9,"historicalName":"delete-getter-replace","disposition":"same fault relocated to selected genuine arrival","currentIndex":9,"currentCase":"arrival delete-getter-replace","rationale":"Selected getter swaps marker; returned callable must remain uncalled."}),
 Object.freeze({"historicalIndex":10,"historicalName":"delete-partial","disposition":"same fault relocated to selected genuine arrival","currentIndex":10,"currentCase":"arrival delete-partial","rationale":"Immediate exact deletion and sentinel retained. Retry only after actual transition completes, requiring discovery 2."}),
 Object.freeze({"historicalIndex":11,"historicalName":"add-partial","disposition":"same fault relocated to selected genuine arrival","currentIndex":11,"currentCase":"arrival add-partial","rationale":"Immediate exact add and sentinel retained. Idle retry still requires discovery 1 and no replay."}),
 Object.freeze({"historicalIndex":12,"historicalName":"notice-partial","disposition":"same fault relocated to selected genuine arrival","currentIndex":12,"currentCase":"arrival notice-partial","rationale":"Immediate exact discovery and full body census retained; idle retry compares the same current census identity and exact bodies."}),
 Object.freeze({"historicalIndex":13,"historicalName":"selected kill callback replacing event cannot suppress successor","disposition":"unchanged course body","currentIndex":13,"currentCase":"selected kill callback replacing event cannot suppress successor","rationale":"Retain the original course body and every assertion; this instance needs no timing change."})
]);
function assertCrusadeCaseMap():void {
 assert.equal(CRUSADE_ARRIVAL_RULE.id,'native-crusade-consumed-visit-82c516');
 assert.equal(CRUSADE_ARRIVAL_HISTORICAL_CASES.length,13);
 assert.equal(CRUSADE_ARRIVAL_CURRENT_CASES.length,33);
 assert.equal(new Set(CRUSADE_ARRIVAL_CURRENT_CASES).size,33);
 assert.deepEqual(CRUSADE_ARRIVAL_HISTORICAL_CASES.map(row=>row.historicalIndex),Array.from({length:13},(_,i)=>i+1));
 assert.equal(new Set(CRUSADE_ARRIVAL_HISTORICAL_CASES.map(row=>row.historicalName)).size,13);
 assert.equal(new Set(CRUSADE_ARRIVAL_HISTORICAL_CASES.map(row=>row.currentCase)).size,13);
 for(const row of CRUSADE_ARRIVAL_HISTORICAL_CASES){
  assert(Number.isInteger(row.currentIndex)&&row.currentIndex>=1&&row.currentIndex<=33);
  assert.equal(row.currentCase,CRUSADE_ARRIVAL_CURRENT_CASES[row.currentIndex-1],'Historical case lost its exact current entry mapping');
  assert(row.disposition.length>0&&row.rationale.length>0,'Historical case needs disposition and rationale');
 }
}
export const CRUSADE_ARRIVAL_SUPERSESSION=Object.freeze({
 rule:CRUSADE_ARRIVAL_RULE,
 historicalCases:CRUSADE_ARRIVAL_HISTORICAL_CASES,
 currentCases:CRUSADE_ARRIVAL_CURRENT_CASES,
 historicalProbe:'probe_nativecrusadeepochboundaries.ts',
 currentCheck:'check_nativecrusadearrivalboundaries.ts',
 predecessor:'82c516cedb474e6da6e0b0bc1d4a879bcdf52fb6',
 historicalLfSha256:'4c3a892667d2d4625db2a55080d129ffae4e167c115ebc6723fcfc10652a45ea',
 rosterLfSha256:'63700ea35d9b3726ceef55aa297ac4b40b718ca871e9f53ed543e698b0aa56ed',
 currentLfSha256:'366844bf6d068fe7a3809fdd01494e09f91a65d26f4e8bb5cf194694223a195d',
 expectedWhy:'Reviewed repeat-event gate, garrison and commander ownership; original assertions preserved.',
 reason:'Visit timing supersedes two historical expectations and relocates eight selected faults; all 13 original instances map to 33 current assertions.',
});
export interface ProbeExecution {
 readonly file:string;
 readonly args:readonly string[];
 readonly label:string;
 readonly historicalSourceOnly:boolean;
}
const digest=(body:string)=>createHash('sha256').update(body.replace(/\r\n/g,'\n'),'utf8').digest('hex');
function exactSource(root:string,file:string,expected:string):void{
 assert(/^[a-f0-9]{64}$/.test(expected),'Unfrozen current-probe supersession');
 assert.equal(digest(readFileSync(path.join(root,'balance',file),'utf8')),expected,'Probe supersession source identity changed: '+file);
}
/** Root is the caller's repository root; neither CLI nor environment can select
 * a substitute. The one explicit table entry must match its sealed row exactly. */
export function resolveProbeExecution(row:ProbeRow,root:string):ProbeExecution{
 const s=CRUSADE_ARRIVAL_SUPERSESSION;
 if(row.probe!==s.historicalProbe)return Object.freeze({file:row.probe,args:Object.freeze([...(row.args??[])]),label:row.probe,historicalSourceOnly:false});
 assertCrusadeCaseMap();
 assert.deepEqual(Object.keys(row).sort(),['probe','status','tier','why'],'Superseded roster row shape changed');
 assert.equal(row.status,'green');assert('tier'in row);assert.equal(row.tier,'fast');assert.equal(row.why,s.expectedWhy);
 exactSource(root,'proberoster.ts',s.rosterLfSha256);
 exactSource(root,s.historicalProbe,s.historicalLfSha256);
 exactSource(root,s.currentCheck,s.currentLfSha256);
 return Object.freeze({file:s.currentCheck,args:Object.freeze([]),label:row.probe+' [CURRENT-SUCCESSOR -> '+s.currentCheck+']',historicalSourceOnly:true});
}
/** Called after the existing complete census, including --list. No missing or
 * duplicate registration can turn a source identity refusal into a skipped row. */
export function validateProbeSupersessions(rows:readonly ProbeRow[],root:string):void{
 const selected=rows.filter(row=>row.probe===CRUSADE_ARRIVAL_SUPERSESSION.historicalProbe);
 assert.equal(selected.length,1,'Exactly one original superseded roster row is required');
 resolveProbeExecution(selected[0],root);
}
export function probeExecutionLabel(row:ProbeRow):string{
 const s=CRUSADE_ARRIVAL_SUPERSESSION;
 return row.probe===s.historicalProbe?row.probe+' [CURRENT-SUCCESSOR -> '+s.currentCheck+']':row.probe;
}
/** Rendering/filtering never throws due to later source drift. Only invocation
 * resolution grants execution after validating the real current files. */
export function probeExecutionFile(row:ProbeRow):string{return row.probe===CRUSADE_ARRIVAL_SUPERSESSION.historicalProbe?CRUSADE_ARRIVAL_SUPERSESSION.currentCheck:row.probe;}
export function probeMatchesFilter(row:ProbeRow,filter:string):boolean{return row.probe.includes(filter)||probeExecutionFile(row).includes(filter);}
export function probeRerunCommand(row:ProbeRow):string{
 const args=row.probe===CRUSADE_ARRIVAL_SUPERSESSION.historicalProbe?[]:row.args??[];
 return 'npx tsx balance/'+probeExecutionFile(row)+(args.length?' '+args.join(' '):'');
}
