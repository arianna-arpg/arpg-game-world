import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {actualConclave} from './nativeConclaveLifetimeFixture';
interface ReadinessObservation {lane:'native-prefix-control'|'conclave';flag:'adoptedZonePending'|'forgetMemoryOnLeave';selected:number;readinessCalls:number;flagAfter:boolean;error:string;nativeMarker:boolean;zone:string;worldDrivers:string[]}
const rows:ReadinessObservation[]=[];
for(const flag of ['adoptedZonePending','forgetMemoryOnLeave'] as const)for(const lane of ['native-prefix-control','conclave'] as const){
 rows.push(actualConclave(c=>{
  const {departure,travel,b,n,cf}=c,old=Object.getOwnPropertyDescriptor(departure,'captureConclaveDeparture'),original=departure.captureConclaveDeparture,ready=Object.getOwnPropertyDescriptor(departure.memory,'assertReady'),marker=Error('selected departure memory readiness');
  departure[flag]=true;const before=cf.incubationCounter;let calls=0,selected=0,error:unknown;
  Object.defineProperty(departure,'captureConclaveDeparture',{configurable:true,get(){selected++;Object.defineProperty(departure.memory,'assertReady',{configurable:true,value(){calls++;throw marker;}});return lane==='native-prefix-control'?departure.captureZoneMemory:original;}});
  try{travel(b);}catch(e){error=e;}finally{if(old)Object.defineProperty(departure,'captureConclaveDeparture',old);else Reflect.deleteProperty(departure,'captureConclaveDeparture');if(ready)Object.defineProperty(departure.memory,'assertReady',ready);else Reflect.deleteProperty(departure.memory,'assertReady');}
  assert.equal(selected,1);assert.equal(cf.incubationCounter,before);assert.deepEqual(c.calls,[]);
  const row={lane,flag,selected,readinessCalls:calls,flagAfter:departure[flag],error:error instanceof Error?error.message:String(error),nativeMarker:error===marker,zone:c.w.zone.id,worldDrivers:c.calls};
  n.coordinator.retire();return row;
 }));
}
writeFileSync(new URL('./MEMORY-READINESS-OBSERVATION.json',import.meta.url),JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify(rows));
for(const flag of ['adoptedZonePending','forgetMemoryOnLeave']){const control=rows.find(r=>r.flag===flag&&r.lane==='native-prefix-control')!,current=rows.find(r=>r.flag===flag&&r.lane==='conclave')!;assert(control.flagAfter&&control.nativeMarker);assert.equal(current.flagAfter,control.flagAfter,'Selected native readiness failure must precede consuming the skip flag');}
