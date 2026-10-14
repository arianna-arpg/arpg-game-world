import assert from 'node:assert/strict';
import '../src/worldmass/nativeBootstrap';
import { address, type MassAddress } from '../src/worldmass/address';
import { MassGenerator, makeMassRun } from '../src/worldmass/generator';
import { MassState } from '../src/worldmass/state';
import { MassStream } from '../src/worldmass/stream';
import type { MassCompilePort } from '../src/worldmass/compilePort';
import { TerrainWarmQueue, terrainPreparationCenters, type TerrainPreparationInit } from '../src/worldmass/terrainWarm';
import { captureTerrainPreparationSource, createTerrainPreparationCompiler, createTerrainPreparationGenerator, type TerrainPreparationJob } from '../src/worldmass/terrainPreparation';
import { regionKind } from '../src/world/regions';
import { installTerrainBasePreparation } from '../src/worldmass/terrainBasePreparation';

const spec = { id:'terrain-warm-proof', version:1, addressSpan:960, terrainCell:24, fields:[],
  surfaces:[{id:'dry',priority:0,when:[],region:'ground',color:'#445533',biome:'grassland'}],places:[] };
class Port implements MassCompilePort {
  onmessage: MassCompilePort['onmessage'] = null;
  onerror: MassCompilePort['onerror'] = null;
  jobs: (TerrainPreparationInit | TerrainPreparationJob)[] = [];
  closed = false;
  postMessage(job: TerrainPreparationInit | TerrainPreparationJob): void { this.jobs.push(structuredClone(job)); }
  terminate(): void { this.closed = true; }
  deliver(reply: unknown): void { this.onmessage?.({data:structuredClone(reply)} as MessageEvent); }
}
function fixture() {
  const generator = createTerrainPreparationGenerator(makeMassRun(791,'warm',spec),spec),source = captureTerrainPreparationSource(generator);
  assert.ok(source);
  const port = new Port(),queue = new TerrainWarmQueue(generator,source,port,{maxQueued:128,maxReady:64,maxReadyBytes:1024*1024});
  const state = new MassState(generator.run,spec.terrainCell),stream = new MassStream(generator,state,{maxPages:9,maxSamples:128});
  installTerrainBasePreparation(generator,at => queue.take(at));
  const init = port.jobs.shift() as TerrainPreparationInit;
  assert.equal(init.token,1);
  const compiler = createTerrainPreparationCompiler(init.source);
  const start = () => port.deliver({protocol:1,token:1,sourceId:source.sourceId,ready:true});
  const finish = () => { const job=port.jobs.shift() as TerrainPreparationJob;assert.ok(job);assert.ok(job.addresses.length<=64);const reply=compiler.prepare(job);port.deliver(reply);return {job,reply}; };
  return {generator,source,port,queue,state,stream,start,finish};
}
const at = address('surface','0','0',12,12,960), second = {...at,x:36},third = {...at,x:60};
let checks=0;
{
  const f=fixture();f.queue.offer([at,second]);
  assert.equal(f.queue.take(at),undefined,'unready request returns immediately');
  assert.equal(f.stream.stats.samples,0,'preparation does not publish samples');
  f.start();f.finish();
  assert.equal(f.queue.stats.ready,1,'a synchronous miss makes its speculative reply unnecessary');
  const generated=new MassGenerator(f.generator.run,f.generator.spec).terrainAt(second),terrain=f.stream.sample(second);
  assert.deepEqual(terrain,generated);assert.equal(f.queue.stats.adopted,1);
  assert.equal(f.stream.sample(second),terrain,'ordinary LRU identity retained after adoption');
  assert.equal(f.stream.stats.samples,1);assert.equal(f.queue.stats.readyBytes,0);
  assert.equal(f.queue.stats.disposed,false);f.queue.dispose();assert.equal(f.port.closed,true);checks+=8;
}
{
  const f=fixture();f.queue.offer([at,second]);f.start();f.finish();
  f.state.paint({address:at,region:'ground',color:'#112233',cause:'player-paint'});
  let overlays=0;
  f.stream.overlay={revision:2,revisionAt:()=>2,sample:(query,base)=>{overlays++;assert.deepEqual(query,at);return {...base,biome:'live-overlay'};}};
  const terrain=f.stream.sample(at);
  assert.equal(terrain.color,'#112233');assert.equal(terrain.source.source,'player-paint');assert.equal(terrain.biome,'live-overlay');assert.equal(overlays,1);
  assert.equal(f.queue.stats.adopted,1,'prepared base composes current patch and overlay at original query');
  f.stream.sample(at);assert.equal(overlays,2);f.queue.dispose();checks+=6;
}
{
  const f=fixture();f.queue.offer([at]);f.start();
  f.queue.offer([second]);f.finish();
  assert.equal(f.queue.stats.ready,0,'old interest cannot publish');
  f.finish();assert.ok(f.queue.take(second));f.queue.dispose();checks+=2;
}
for(const corruption of ['token','bytes','sourceId','length'] as const){
  const f=fixture();f.queue.offer([at]);f.start();
  const job=f.port.jobs.shift() as TerrainPreparationJob,reply=createTerrainPreparationCompiler(structuredClone(f.source)).prepare(job);
  if(corruption==='token')reply.token++;else if(corruption==='bytes')reply.bytes++;else if(corruption==='sourceId')reply.sourceId+='x';else reply.rows=[];
  f.port.deliver(reply);assert.equal(f.queue.stats.disposed,true);assert.ok(f.queue.error);
  assert.deepEqual(f.stream.sample(at),f.generator.terrainAt(at),'invalid worker data retains synchronous truth');checks+=3;
}
{
  const f=fixture();f.queue.offer([at]);f.start();f.finish();
  Reflect.set(f.generator,'fieldsAt',()=>{throw Error('authoritative generation failure');});
  assert.throws(()=>f.stream.sample(at),/authoritative generation failure/);
  assert.equal(f.queue.stats.adopted,0);assert.equal(f.queue.stats.disposed,true);checks+=3;
}
{
  const f=fixture();f.queue.offer([at]);f.start();f.finish();
  const material=regionKind('ground')!,before=material.walkable;
  try{material.walkable=!before;assert.deepEqual(f.stream.sample(at),new MassGenerator(f.generator.run,f.generator.spec).terrainAt(at));assert.equal(f.queue.stats.adopted,1);}
  finally{material.walkable=before;f.queue.dispose();}checks+=2;
}
{
  const f=fixture();f.queue.offer([at]);f.start();
  const late=f.port.onmessage;f.queue.dispose();
  late?.({data:{protocol:1,token:2,sourceId:f.source.sourceId,rows:[],bytes:4}} as MessageEvent);
  assert.equal(f.queue.stats.ready,0);assert.equal(f.queue.take(at),undefined);checks+=2;
}
{
  const f=fixture(),rows=terrainPreparationCenters([{at,ahead:at},{at:{...at,cx:'-9007199254740993'},ahead:{...at,cx:'-9007199254740993'}}],960,24,128);
  assert.equal(rows.length,128);assert.deepEqual(rows[0],at);assert.equal(rows[1].cx,'-9007199254740993');
  assert.equal(new Set(rows.map(row=>JSON.stringify(row))).size,128);
  const edge={...at,cx:'9223372036854775807',x:948};
  assert.ok(terrainPreparationCenters([{at:edge,ahead:edge}],960,24,128).every(row=>BigInt(row.cx)<=9223372036854775807n));
  f.queue.offer(rows);f.start();f.finish();assert.equal(f.queue.stats.ready,64);assert.ok(f.queue.stats.readyBytes<=f.queue.config.maxReadyBytes);
  assert.equal(f.port.jobs.length,0,'ready count and byte pressure stop submission');
  for(const row of rows.slice(0,64))f.queue.take(row);
  f.queue.offer(rows);f.finish();assert.equal(f.queue.stats.ready,64);f.queue.dispose();checks+=9;
}
{
  const f=fixture();f.queue.offer([at,second,third]);f.port.onerror?.({message:'fixture failure'} as ErrorEvent);
  assert.equal(f.queue.stats.disposed,true);assert.deepEqual(f.stream.sample(at),f.generator.terrainAt(at));checks+=2;
}

// Independently retained shortlist implementation from the pre-change module
// SHA256 6e8dbc2b6a933d69ef4ba2051919b83a3bfb703ff462ac2fe4c5e23907c626f0.
// Only the local names are prefixed; unchanged address() is a shared dependency.
// This reference never imports or reuses the candidate's memo or offset array.
const originalOffsets: { x:number; y:number }[] = [];
for(let y=-20;y<=20;y++)for(let x=-20;x<=20;x++)originalOffsets.push({x,y});
originalOffsets.sort((a,b)=>a.x*a.x+a.y*a.y-b.x*b.x-b.y*b.y);
function originalCenters(foci:readonly {at:MassAddress;ahead:MassAddress}[],span:number,cell:number,limit:number):MassAddress[]{
  if(foci.length>16||!Number.isSafeInteger(limit)||limit<1||limit>8192)throw Error('Invalid terrain focus shortlist');
  const centers=foci.flatMap(f=>[f.at,f.ahead]),rows:MassAddress[]=[],seen=new Set<string>();
  for(const offset of originalOffsets)for(const center of centers){
    // At the signed world edge, only the out-of-range optional hint is omitted.
    let at:MassAddress;
    try{at=address(center.dimension,center.cx,center.cy,(Math.floor(center.x/cell)+offset.x+.5)*cell,(Math.floor(center.y/cell)+offset.y+.5)*cell,span);}
    catch(error){if(error instanceof RangeError)continue;throw error;}
    const key=originalKeyOf(at);if(seen.has(key))continue;seen.add(key);rows.push(at);if(rows.length===limit)return rows;
  }
  return rows;
}
const originalKeyOf = (at: MassAddress): string => JSON.stringify([at.dimension, at.cx, at.cy, at.x, at.y]);
type ShortlistArgs = Parameters<typeof terrainPreparationCenters>;
type ShortlistFixture = {args:ShortlistArgs;tape:unknown[]};
type ShortlistCreator = () => ShortlistFixture;
const point=(cx='0',cy='0',x=12,y=12,dimension='surface'):MassAddress=>({dimension,cx,cy,x,y});
function ordinary(points:MassAddress[],limit=4096,span=960,cell=24):ShortlistFixture {
  return {args:[points.map((at,i)=>({at,ahead:points[(i+1)%points.length]})),span,cell,limit],tape:[]};
}
function result(picker:typeof terrainPreparationCenters,create:ShortlistCreator):unknown {
  const {args,tape}=create();
  try{return {rows:picker(...args),tape};}
  catch(error){return {error:error instanceof Error?{name:error.name,message:error.message}:error,tape};}
}
function parity(label:string,create:ShortlistCreator):void {
  assert.deepEqual(result(terrainPreparationCenters,create),result(originalCenters,create),label);checks++;
}
const groupPoints=()=>Array.from({length:6},(_,i)=>point('0','0',12+(i%3)*24,12+Math.floor(i/3)*24));
const spreadPoints=()=>Array.from({length:6},(_,i)=>point(String(i*100003),String(-i*99991),12+i*24,12+i*48));
const aliasPoints=()=>Array.from({length:6},(_,i)=>point(String(i),String(-i),12-i*960,12+i*960));
const edgePoints=()=>[
  point('9223372036854775807','9223372036854775807',948,948),
  point('-9223372036854775808','-9223372036854775808',12,12),
  point('9007199254740993','-9007199254740993',948,12),
  point('-9007199254740993','9007199254740993',12,948),
  point('9223372036854775807','-9223372036854775808',948,12),
  point('-9223372036854775808','9223372036854775807',12,948),
];
for(const [label,points] of [
  ['group',groupPoints],['spread',spreadPoints],['aliases',aliasPoints],['edges',edgePoints],
  ['subcell',()=>Array.from({length:6},(_,i)=>point('0','0',i/2,23-i/2))],
  ['reverse group',()=>groupPoints().reverse()],
  ['dimensions',()=>['surface','quote"\\','雪','\ud800','__proto__','constructor'].map(d=>point('0','0',12,12,d))],
  ['fractional edges',()=>[point('-1','1',-0,-0),point('1','-1',-24.001,960.001),point('0','0',-1e-12,24-1e-12)]],
] as const)for(const limit of [1,2,17,64,512,4096,8192])parity(`${label}/${limit}`,()=>ordinary(points(),limit));
parity('empty foci',()=>ordinary([]));
parity('sixteen foci',()=>ordinary(Array.from({length:16},(_,i)=>point(String(i),String(i))),8192));
parity('same object aliases',()=>{const p=point();return ordinary([p,p,p,p,p,p],4096);});
for(const limit of [-1,0,1.5,8193,NaN,Infinity])parity(`invalid limit ${limit}`,()=>ordinary([point()],limit));
parity('too many foci',()=>ordinary(Array.from({length:17},()=>point()),64));
for(const span of [0,-1,NaN,Infinity,1.5])parity(`invalid span ${span}`,()=>ordinary([point()],64,span));
for(const cell of [0,-24,NaN,Infinity,-Infinity,0.25])parity(`cell ${cell}`,()=>ordinary([point()],64,960,cell));
for(const patch of [
  {dimension:''},{dimension:'x'.repeat(129)},{cx:'00'},{cy:'-0'},
  {cx:'9223372036854775808'},{cy:'-9223372036854775809'},
  {x:NaN},{y:Infinity},{x:Number.MAX_SAFE_INTEGER},{y:-Number.MAX_SAFE_INTEGER},
] as const)parity(`invalid address ${JSON.stringify(patch)}`,()=>ordinary([{...point(),...patch}],64));

// Each run gets fresh accessors/proxies. A changing argument must still be read
// even after the immediately preceding raw tuple was successfully remembered.
for(const field of ['dimension','cx','cy','x','y'] as const){
  for(const mode of ['stable','change','range','error','nonprimitive'] as const){
    parity(`getter ${field}/${mode}`,()=>{
      const tape:unknown[]=[],base=point();let reads=0;
      const watched={...base};
      Object.defineProperty(watched,field,{enumerable:true,get(){
        reads++;tape.push([field,reads]);
        if(mode==='range'&&reads===3)throw new RangeError(`range ${field}`);
        if(mode==='error'&&reads===3)throw new Error(`error ${field}`);
        if(mode==='change'&&reads>=3)return field==='dimension'?'other':field==='cx'||field==='cy'?'1':36;
        if(mode==='nonprimitive'&&reads===3)return {valueOf(){tape.push(['coerce',field]);return 12;},toString(){tape.push(['string',field]);return '0';}};
        return base[field];
      }});
      // Use the same object twice, retaining both reads in each offset visit.
      return {args:[[{at:watched,ahead:watched}],960,24,64],tape};
    });
  }
}
parity('all input getter order including focus and proxy',()=>{
  const tape:unknown[]=[],base=point();
  const watched=new Proxy(base,{get(target,key,receiver){tape.push(String(key));return Reflect.get(target,key,receiver);}});
  const foci=[{get at(){tape.push('focus.at');return watched;},get ahead(){tape.push('focus.ahead');return watched;}}];
  return {args:[foci,960,24,64],tape};
});
parity('focus getter failure before iteration',()=>{
  const tape:unknown[]=[],foci=[{get at(){tape.push('at');return point();},get ahead():MassAddress{tape.push('ahead');throw new RangeError('focus failure');}}];
  return {args:[foci,960,24,64],tape};
});
parity('late invalid decimal after a successful duplicate',()=>{
  const tape:unknown[]=[];let reads=0;
  const watched={...point(),get cx(){tape.push(++reads);return reads===3?'not-a-cell':'0';}};
  return {args:[[{at:watched,ahead:watched}],960,24,64],tape};
});
parity('getter mutates a later center',()=>{
  const tape:unknown[]=[],later=point();let reads=0;
  const watched={...point(),get x(){tape.push(++reads);later.x=reads%2?12:36;return 12;}};
  return {args:[[{at:watched,ahead:later}],960,24,64],tape};
});
for(const mode of ['stable','change','range','error'] as const)parity(`object cell ${mode}`,()=>{
  const tape:unknown[]=[];let reads=0;
  const cell={valueOf(){tape.push(++reads);if(mode==='range'&&reads===9)throw new RangeError('cell range');if(mode==='error'&&reads===9)throw Error('cell error');return mode==='change'&&reads>8?48:24;}};
  return {args:[[{at:point(),ahead:point()}],960,cell as unknown as number,64],tape};
});
parity('object span retains non-coercing validation',()=>{
  const tape:unknown[]=[],span={valueOf(){tape.push('span valueOf');return 960;}};
  return {args:[[{at:point(),ahead:point()}],span as unknown as number,24,64],tape};
});
parity('invalid primitive argument does not suppress later reads',()=>{
  const tape:unknown[]=[],watched={...point(),get cx(){tape.push('cx');return 'bad';},get x(){tape.push('x');return 12;},get y():number{tape.push('y');throw Error('y before address validation');}};
  return {args:[[{at:watched,ahead:point()}],960,24,64],tape};
});

console.log(JSON.stringify({result:'PASS',checks,method:'Controlled worker delivery plus independently pinned original shortlist: exact ordered outputs, getters/coercions/errors, alias and signed-boundary parity. Shared unchanged address arithmetic; stable standard intrinsics. No encounter, readiness, queue or scheduling changes.'}));

// Optional creator-inclusive component timing. Each measured iteration includes
// fresh focus/address construction, the complete ordered shortlist (up to 4096 rows) and
// its ordered checksum, identically for both implementations. This is the same
// tsx execution mode, not a production-bundle or live responsiveness claim.
if(process.argv.includes('--bench')){
  const workloads=[['group',groupPoints],['spread',spreadPoints],['aliases',aliasPoints],['edges',edgePoints]] as const;
  const iterations=24,rounds=4;
  const median=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);return (sorted[(sorted.length-1)>>1]+sorted[sorted.length>>1])/2;};
  function measure(picker:typeof terrainPreparationCenters,make:()=>MassAddress[]):{ms:number;checksum:number;rows:number}{
    let checksum=0,rows=0;const start=performance.now();
    for(let iteration=0;iteration<iterations;iteration++){
      const input=ordinary(make()),output=picker(...input.args);rows+=output.length;
      for(const row of output){
        checksum=Math.imul(checksum^row.dimension.length,16777619);
        for(const cell of [row.cx,row.cy])for(let i=0;i<cell.length;i++)checksum=Math.imul(checksum^cell.charCodeAt(i),16777619);
        checksum=Math.imul(checksum^row.x,16777619);checksum=Math.imul(checksum^row.y,16777619);
      }
    }
    return {ms:performance.now()-start,checksum:checksum>>>0,rows};
  }
  const receipt=[];
  for(const [name,make] of workloads){
    // Untimed, symmetric warmup before alternating independent full creations.
    const warmA=measure(originalCenters,make),warmB=measure(terrainPreparationCenters,make);
    assert.equal(warmA.checksum,warmB.checksum);assert.equal(warmA.rows,warmB.rows);
    const pairs=[];
    for(let round=0;round<rounds;round++){
      let original,candidate;
      if(round%2===0){original=measure(originalCenters,make);candidate=measure(terrainPreparationCenters,make);}
      else{candidate=measure(terrainPreparationCenters,make);original=measure(originalCenters,make);}
      assert.equal(candidate.checksum,original.checksum);assert.equal(candidate.rows,original.rows);
      pairs.push({order:round%2===0?'original/candidate':'candidate/original',original,candidate});
    }
    const originalMs=median(pairs.map(p=>p.original.ms)),candidateMs=median(pairs.map(p=>p.candidate.ms));
    receipt.push({name,pairs,median:{originalMs,candidateMs,changePercent:(candidateMs/originalMs-1)*100}});
  }
  console.log(JSON.stringify({benchmark:'shortlist creator-inclusive',method:'Same tsx transform, four alternating pairs, no timing gates; fresh input construction and ordered checksum included. Component evidence only.',iterations,rounds,receipt}));
}
