import assert from 'node:assert/strict';
const stored=new Map<string,string>();
const writes:string[]=[];
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
  getItem:(key:string)=>stored.get(key)??null,
  setItem:(key:string,value:string)=>{writes.push(key);stored.set(key,value);},
}});
const {recordRuntimeError,runtimeErrorReport}=await import('../src/core/runtimeDiagnostics');
const log=console.error;console.error=()=>{};
try {
  const original=new Error('Invalid native actor checkpoint: aiRingTarget');
  recordRuntimeError('native page restore',original,{page:'native/page-1',seed:713,x:45,y:90});
  recordRuntimeError('native page restore',original,{page:'native/page-1',seed:713,x:45,y:90});
  let report=JSON.parse(runtimeErrorReport());
  assert.equal(report.errors.length,1);assert.equal(report.errors[0].count,2);
  assert.equal(report.errors[0].stack,original.stack);
  assert.equal(report.errors[0].context.page,'native/page-1');
  assert.ok([...stored.values()][0].includes('aiRingTarget'));
  assert.ok(writes.every(key=>key==='hollow-wake-runtime-errors-v1'),'no account/character storage writes');
  for(let i=0;i<35;i++)recordRuntimeError('bounded',new Error('case '+i),{huge:'x'.repeat(5000)});
  report=JSON.parse(runtimeErrorReport());assert.equal(report.errors.length,20);
  assert.ok(report.errors.every((r:{context:{huge:string}})=>r.context.huge.length<=500));
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get:()=>{throw Error('Storage blocked');}});
  assert.doesNotThrow(()=>recordRuntimeError('quota/private mode',new Error('still captured')));
  assert.equal(JSON.parse(runtimeErrorReport()).errors.at(-1).message,'still captured');
  const hostile=new Proxy({}, {get:()=>{throw Error('getter');}});
  assert.doesNotThrow(()=>recordRuntimeError('hostile thrown object',hostile,hostile));
  assert.ok(JSON.parse(runtimeErrorReport()).errors.length<=20);
  console.log('PASS original stacks, page context, bounded history, deduplication, persistence and denied-storage/hostile-value fallbacks.');
} finally {console.error=log;}
