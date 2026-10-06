import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { address,moveAddress } from '../src/worldmass/address';
import { canonical,massDigest } from '../src/worldmass/random';
import { MassGeographicGameplay } from '../src/worldmass/geographicGameplay';
import { compileGeographicPlan,geographicPlanIdentity,prepareGeographicPlan,validateGeographicPreparation,validateGeographicPreparationSteps,type GeographicPlanInput,type GeographicPlanJob,type GeographicPlanReply } from '../src/worldmass/geographicPlan';
import { GeographicPlanWarmQueue,createGeographicPlanWarmQueue,type GeographicCompilePort } from '../src/worldmass/geographicWarm';

const undo=seedGlobalRandom(901743);
try{
 const w=makeSimWorld('warrior',901743);w.startWorldMass(901743);const m=w.massRuntime!,g=m.geography!;
 const center=(x:number,y:number)=>address('surface','0','0',x*5400+2700,y*5400+2700,960);
 const fixture=[[3,1,'9efb0cd46dc1b2b4'],[6,2,'d7f01aa80265ed5b'],[-3,14,'996e6c671cdaa7d3']] as const;
 const inputs=fixture.map(([x,y])=>g.preparationInput(center(x,y))!);assert.ok(inputs.every(Boolean));
 const job=(input:Readonly<GeographicPlanInput>,token=1):GeographicPlanJob=>({protocol:1,token,input,...geographicPlanIdentity(input),maxBytes:262144});
 const random=Math.random;Math.random=()=>{throw Error('Pure geographic kernel consumed ambient RNG');};
 try{
  for(const [i,input]of inputs.entries()){
   const sync=compileGeographicPlan(input),reply=prepareGeographicPlan(job(input));assert.ok(reply.preparation?.plan,reply.error??'missing plan');
   assert.equal(canonical(reply.preparation.plan),canonical(sync.plan));
   // Captured by executing committed d6f572db planner independently before extraction.
   assert.equal(massDigest(sync.plan),fixture[i][2]);
   assert.equal(canonical(validateGeographicPreparation(input,reply.preparation)),canonical(sync.plan));
   const steps=validateGeographicPreparationSteps(input,reply.preparation);let count=0;for(;;){const next=steps.next();if(next.done){assert.equal(canonical(next.value),canonical(sync.plan));break;}assert.ok(++count<50000);}
   assert.ok(count>100,'terrain/body checks are cooperatively yielded');
  }
 }finally{Math.random=random;}
 console.log('PASS all three real native families match independently captured committed plan hashes, worker/sync equality and ambient RNG isolation');
 const input=inputs[0],prepared=prepareGeographicPlan(job(input)).preparation!;
 for(const edit of [(p:typeof prepared)=>{p.sourceHash='other';},(p:typeof prepared)=>{p.inputHash='other';},(p:typeof prepared)=>{p.plan!.access.paths[0][0]++;}]){const bad=structuredClone(prepared);edit(bad);assert.throws(()=>validateGeographicPreparation(input,bad));}
 const changed=structuredClone(input) as GeographicPlanInput;changed.fixtureRadius++;assert.equal(new MassGeographicGameplay(m,m.config.geography!,undefined,null).adoptPrepared(changed,{...prepared,...geographicPlanIdentity(changed)}),'stale','worker cannot invent a registered source via coherent headers');
 const late=new MassGeographicGameplay(m,m.config.geography!,undefined,null);const expected=late.plannedAt(input.owner.center);assert.equal(late.adoptPrepared(input,prepared),'existing');assert.equal(canonical(late.plannedAt(input.owner.center)),canonical(expected));
 const warmed=new MassGeographicGameplay(m,m.config.geography!,undefined,null);assert.equal(warmed.adoptPrepared(input,prepared),'adopted');assert.equal(canonical(warmed.plannedAt(input.owner.center)),canonical(expected));assert.equal(warmed.warmStats.synchronous,0);assert.equal(warmed.warmStats.used,1);warmed.dispose();assert.equal(warmed.adoptPrepared(inputs[1],prepareGeographicPlan(job(inputs[1])).preparation!),'disposed');
 console.log('PASS current registered-source adoption, exact cold result, already-computed owner wins and disposal gate');
 class Port implements GeographicCompilePort{
  onmessage:GeographicCompilePort['onmessage']=null;onerror:GeographicCompilePort['onerror']=null;jobs:GeographicPlanJob[]=[];terminated=0;
  postMessage(j:GeographicPlanJob){this.jobs.push(j);}terminate(){this.terminated++;}
  reply(r?:GeographicPlanReply){const j=this.jobs.shift()!;assert.ok(j);this.onmessage?.({data:r??prepareGeographicPlan(j)} as MessageEvent<GeographicPlanReply>);}
 }
 const port=new Port(),queue=new GeographicPlanWarmQueue(port,{maxQueued:3,maxReady:2,maxInputBytes:262144,maxPayloadBytes:262144,maxReadyBytes:524288});
 const mutable=structuredClone(input);queue.offer([mutable,...inputs.slice(1)]);mutable.context.zone.name='foreign after offer';assert.notEqual(port.jobs[0].input.context.zone.name,mutable.context.zone.name);assert.equal(port.jobs.length,1);
 port.reply();port.reply();assert.equal(queue.stats.ready,2);assert.equal(port.jobs.length,0);assert.ok(queue.stats.readyBytes<=queue.config.maxReadyBytes);
 assert.equal(queue.takeReady()!.input.owner.id,input.owner.id);assert.equal(port.jobs.length,1);
 queue.offer([input]);assert.equal(queue.stats.ready,0);port.reply();assert.equal(queue.stats.ready,0);port.reply();assert.equal(queue.takeReady()!.input.owner.id,input.owner.id);
 const cb=port.onmessage;queue.dispose();queue.dispose();cb?.({data:null} as unknown as MessageEvent<GeographicPlanReply>);assert.equal(port.terminated,1);assert.equal(queue.stats.ready,0);
 for(const malformed of ['null','cyclic','token','oversized'] as const){
  const p=new Port(),q=new GeographicPlanWarmQueue(p);q.offer([input]);const r=structuredClone(prepareGeographicPlan(p.jobs[0]));
  if(malformed==='token')r.token++;if(malformed==='oversized')r.preparation!.bytes=1e7;
  if(malformed==='cyclic')(r.preparation!.plan as unknown as Record<string,unknown>).cycle=r;
  assert.doesNotThrow(()=>{if(malformed==='null')p.onmessage?.({data:null} as unknown as MessageEvent<GeographicPlanReply>);else p.reply(r);});
  assert.equal(q.stats.disposed,true,malformed);assert.equal(p.terminated,1);
 }
 const stagedPort=new Port(),stagedQueue=new GeographicPlanWarmQueue(stagedPort),staged=new MassGeographicGameplay(m,m.config.geography!,undefined,stagedQueue);
 stagedQueue.offer([input]);stagedPort.reply();staged.prepare(input.owner.center,0);assert.equal(staged.warmStats.adopted,0,'partial route is never published');assert.equal(staged.warmStats.validating,input.owner.id);
 for(let n=0;n<1000&&!staged.warmStats.adopted;n++)staged.prepare(input.owner.center,.001);
 assert.equal(staged.warmStats.adopted,1);assert.equal(canonical(staged.plannedAt(input.owner.center)),canonical(expected));assert.equal(staged.warmStats.synchronous,0);
 const racePort=new Port(),raceQueue=new GeographicPlanWarmQueue(racePort),race=new MassGeographicGameplay(m,m.config.geography!,undefined,raceQueue);
 raceQueue.offer([input]);racePort.reply();race.prepare(input.owner.center,0);race.plannedAt(input.owner.center);race.prepare(input.owner.center,.001);assert.equal(race.warmStats.adopted,0);assert.equal(race.warmStats.validating,null);assert.equal(race.warmStats.late,1);
 const stopPort=new Port(),stopQueue=new GeographicPlanWarmQueue(stopPort),stopped=new MassGeographicGameplay(m,m.config.geography!,undefined,stopQueue);
 stopQueue.offer([input]);stopPort.reply();stopped.prepare(input.owner.center,0);assert.ok(stopped.warmStats.validating);stopped.dispose();stopped.prepare(input.owner.center,1);assert.equal(stopped.warmStats.validating,null);assert.equal(stopped.warmStats.adopted,0);assert.equal(stopPort.terminated,1);
 staged.dispose();race.dispose();assert.equal(createGeographicPlanWarmQueue(),null);
 const far=g.preparationInput(moveAddress(center(-3,14),{x:0,y:0},960));assert.ok(far);
 console.log('PASS bounded single inflight/ready bytes, copied input, turn discard, malformed/cyclic reply failure, late callbacks, staged no-partial publication and synchronous race');
 console.log('ALL GEOGRAPHIC WORKER PROBES PASS');
}finally{undo();}
