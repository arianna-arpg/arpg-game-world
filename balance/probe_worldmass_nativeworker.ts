import assert from 'node:assert/strict';
import '../src/worldmass/nativeBootstrap';
import { nativeFeatureSourceIdentity, resolveNativeFeature, type NativeFeatureRequest, type NativeFeatureDescriptor } from '../src/worldmass/nativeFeatures';
import { prepareNativeFeature, validateNativePreparation, type NativeCompileJob, type NativeCompileReply } from '../src/worldmass/nativePreparation';
import { NativeFeatureWarmQueue, createNativeFeatureWarmQueue, type NativeCompilePort } from '../src/worldmass/nativeWarm';
import { MassNativeResidency, type NativeFeaturePlacement } from '../src/worldmass/nativeResidency';
import { address, moveAddress } from '../src/worldmass/address';
import { canonical, massDigest } from '../src/worldmass/random';

const clone=<T>(x:T):T=>JSON.parse(JSON.stringify(x)) as T;
const origin=address('surface','0','0',0,0,960);
const request:NativeFeatureRequest={id:'worker-native-rock',seed:42,source:{kind:'massif',id:'tor',tileset:'downs',scope:'landform',variant:'the grey tors',poolIndex:0},rockEntrance:true};
const placement:NativeFeaturePlacement={id:request.id,origin,request};
const job=(r:NativeFeatureRequest,token=1):NativeCompileJob=>({protocol:1,token,request:clone(r),identity:nativeFeatureSourceIdentity(r),maxBytes:2*1024*1024});
const random=Math.random;Math.random=()=>{throw Error('Native worker must not consume ambient runtime RNG');};
try{
 const fixtures:NativeFeatureRequest[]=[request,
  {id:'worker-native-slag',seed:101,source:{kind:'massif',id:'slag_tor',tileset:'wyrmfields',scope:'landform',poolIndex:0},rockEntrance:true},
  {id:'worker-native-market',seed:713,source:{kind:'structure',id:'market_row',tileset:'grassland'}},
  {id:'worker-native-manor',seed:714,source:{kind:'structure',id:'walled_manor',tileset:'downs'}},
  {id:'worker-native-full',seed:42,source:{kind:'massif',id:'downs',tileset:'downs'},rockEntrance:true},
  ...[2,23].map(seed=>({id:'worker-court/'+seed,seed,source:{kind:'massif' as const,id:'well_court',tileset:'courtland',scope:'landform' as const,poolIndex:1}}))];
 for(const r of fixtures){
  const synchronous=resolveNativeFeature(r),p=prepareNativeFeature(job(r)).preparation;
  assert.ok(p.descriptor,p.failure?.message??'Native descriptor missing');assert.equal(canonical(p.descriptor),canonical(synchronous));
  assert.equal(validateNativePreparation(r,p)!.descriptor.hash,synchronous.hash);
  if(r.id==='worker-court/23'){assert.ok(synchronous.sidechannels!.occurrences.length);assert.ok(synchronous.requirements.includes('occurrences'));}
  if(r.id==='worker-court/2'){assert.ok(synchronous.sidechannels!.puzzles.length);assert.ok(synchronous.requirements.includes('puzzles'));assert.notEqual(canonical(synchronous.sourceZone),canonical(synchronous.zone),'resolved shrine mutations survive separately from immutable authored source');}
 }
 console.log('PASS isolated native registration bootstrap, source/compiler identity, seeded full descriptor parity and no ambient RNG consumption');
 const prepared=prepareNativeFeature(job(request)).preparation;
 for(const edit of [(p:typeof prepared)=>{p.requestHash='foreign';},(p:typeof prepared)=>{p.sourceHash='foreign';},
  (p:typeof prepared)=>{p.descriptor!.geometry.support[0]^=1;},(p:typeof prepared)=>{p.descriptor!.source.id='bluff';}]){
  const bad=clone(prepared);edit(bad);assert.throws(()=>validateNativePreparation(request,bad));
 }
 const silent={...clone(prepared),descriptor:clone(prepared.descriptor!) as NativeFeatureDescriptor};silent.descriptor.requirements=[];
 const {hash:_hash,...body}=silent.descriptor!;silent.descriptor!.hash=massDigest(body);silent.bytes=JSON.stringify(silent.descriptor).length*2;
 assert.throws(()=>validateNativePreparation(request,silent),/lifecycle requirements/);
 const wrong=job(request);wrong.identity.sourceHash='obsolete';assert.equal(prepareNativeFeature(wrong).preparation.failure?.kind,'compatibility');
 assert.equal(prepareNativeFeature({...job(request),maxBytes:1024}).preparation.failure?.kind,'budget');
 console.log('PASS damaged/foreign descriptor, rehashed missing lifecycle requirements, source drift and transfer budget refusal');
 const descriptor=prepared.descriptor!,caps=new Set(descriptor.requirements),cfg={run:'worker-probe',addressSpan:960,maxBlueprints:4,maxResidents:1,maxCandidates:2};
 const make=(save?:ReturnType<MassNativeResidency['snapshot']>)=>new MassNativeResidency(cfg,()=>[placement],caps,()=>origin,save,{regionAt:()=> 'ground',reservePadding:120});
 const warmed=make();assert.ok(warmed.preparationNeeded(placement));assert.equal(warmed.adoptPrepared(placement,prepared),'adopted');
 assert.equal(warmed.stats.preparation.synchronous,0);assert.equal(warmed.stats.resident,0);assert.equal(warmed.preparationNeeded(placement),false);
 const cold=make(),at=moveAddress(origin,descriptor.approach,960);assert.equal(warmed.regionAt(at),cold.regionAt(at));
 assert.equal(canonical(warmed.snapshot(0)),canonical(cold.snapshot(0)),'warm scheduling cannot change durable geography/ingress');
 assert.equal(cold.stats.preparation.synchronous,1);assert.equal(cold.adoptPrepared(placement,prepared),'existing');
 assert.equal(canonical(make(warmed.snapshot(0)).snapshot(0)),canonical(warmed.snapshot(0)));
 const grid=warmed.gridAt(descriptor.approach)!.grid;grid.fillRegion(descriptor.approach.x,descriptor.approach.y,descriptor.approach.x,descriptor.approach.y,'wall');
 const changed=canonical(warmed.snapshot(1));assert.equal(warmed.adoptPrepared(placement,prepared),'existing');
 assert.equal(canonical(warmed.snapshot(1)),changed,'late worker result cannot overwrite sparse terrain consequences');
 assert.equal(make(warmed.snapshot(1)).regionAt(at),'wall');
 const refused=new MassNativeResidency(cfg,()=>[placement],new Set(),()=>origin);
 assert.equal(refused.adoptPrepared(placement,prepared),'refused');assert.equal(refused.stats.born,0);
 console.log('PASS warm/cold physical truth and exact birth/ingress/Continue equivalence, no scene admission, late result and capability refusal');
 class FakePort implements NativeCompilePort{
  onmessage:NativeCompilePort['onmessage']=null;onerror:NativeCompilePort['onerror']=null;
  jobs:NativeCompileJob[]=[];terminated=0;
  postMessage(j:NativeCompileJob){this.jobs.push(j);}terminate(){this.terminated++;}
  reply(r?:NativeCompileReply){const next=this.jobs.shift()!;assert.ok(next);this.onmessage?.({data:r??prepareNativeFeature(next)} as MessageEvent<NativeCompileReply>);}
 }
 const rows=Array.from({length:30},(_,i)=>({...placement,id:request.id+':'+i,request:{...request,id:request.id+':'+i,seed:42+i}}));
 const port=new FakePort(),queue=new NativeFeatureWarmQueue(port,{maxQueued:3,maxReady:2,maxReadyBytes:4*1024*1024,maxPayloadBytes:2*1024*1024});
 queue.offer(rows);assert.equal(port.jobs.length,1);assert.ok(queue.stats.queued<=3);
 port.reply();assert.equal(queue.stats.ready,1);assert.equal(port.jobs.length,1);
 port.reply();assert.equal(queue.stats.ready,2);assert.equal(port.jobs.length,0,'full ready queue applies backpressure');
 assert.ok(queue.stats.readyBytes<=queue.config.maxReadyBytes);const first=queue.takeReady()!;
 assert.equal(first.placement.id,rows[0].id);assert.ok(Object.isFrozen(first.placement));assert.equal(port.jobs.length,1);
 queue.offer([rows[20]]);assert.equal(queue.stats.ready,0,'turning discards obsolete unadopted work');
 port.reply();assert.equal(queue.stats.ready,0,'obsolete inflight result cannot become geography');assert.equal(port.jobs.length,1);
 port.reply();assert.equal(queue.takeReady()!.placement.id,rows[20].id);
 const callback=port.onmessage;queue.offer([rows[25]]);queue.dispose();queue.dispose();
 assert.equal(port.terminated,1);assert.equal(queue.stats.inflight,0);assert.equal(queue.stats.readyBytes,0);
 callback?.({data:prepareNativeFeature(job(rows[25].request,999))} as MessageEvent<NativeCompileReply>);assert.equal(queue.stats.ready,0);
 const invalidPort=new FakePort(),invalidQueue=new NativeFeatureWarmQueue(invalidPort);invalidQueue.offer([placement]);
 const badReply=prepareNativeFeature(invalidPort.jobs[0]);badReply.token++;
 invalidPort.reply(badReply);assert.equal(invalidQueue.stats.disposed,true);assert.match(invalidQueue.stats.error!,/Unexpected/);assert.equal(invalidPort.terminated,1);
 assert.equal(createNativeFeatureWarmQueue(),null,'headless runtime keeps exact sync fallback without worker');
 console.log('PASS one inflight, bounded pending/ready bytes, FIFO, backpressure, stale work discard, idempotent termination and late callback isolation');
 console.log('ALL NATIVE WORKER PROBES PASS');
}finally{Math.random=random;}
