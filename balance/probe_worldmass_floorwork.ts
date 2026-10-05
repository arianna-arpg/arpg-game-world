import assert from 'node:assert/strict';
import { MassPainter, MASS_FLOOR_VIEW, type MassFloorPreparation } from '../src/worldmass/paint';
import { address, cellKey, neighborCell, localOffset, type MassCell } from '../src/worldmass/address';
import { MassGenerator, makeMassRun } from '../src/worldmass/generator';
import { MassState } from '../src/worldmass/state';
import { MassStream } from '../src/worldmass/stream';
import { MassWalk } from '../src/worldmass/walk';
import { canonical } from '../src/worldmass/random';
import type { MassSpec } from '../src/worldmass/contracts';
import type { WorldMassRuntime } from '../src/worldmass/runtime';

const spec:MassSpec={id:'probe:floor-work',version:1,addressSpan:240,terrainCell:30,
 fields:[{id:'elevation',base:.5,layers:[]}],
 surfaces:[{id:'land',priority:0,when:[],region:'ground',color:'#557744',biome:'field'}],places:[]};
const origin=address('surface','-9007199254740994','9007199254740993',0,0,240);
interface RecordedCanvas {key:string;serial:number;complete:boolean}
const fixture=(policy:Partial<MassFloorPreparation>={},capacity=4)=>{
 const generator=new MassGenerator(makeMassRun(42,'floor-work',spec),spec);
 const state=new MassState(generator.run,30),stream=new MassStream(generator,state,{maxPages:capacity,maxSamples:2048});
 const walk=new MassWalk(stream,origin),mass={state,stream,walk,generator,origin,config:{terrain:spec}} as unknown as WorldMassRuntime;
 const cells=[origin,neighborCell(origin,1,0),neighborCell(origin,0,1),neighborCell(origin,1,1)];
 stream.request(cells.slice(0,capacity));stream.step(256);
 const painter=new MassPainter({...MASS_FLOOR_VIEW,stepsPerDraw:2,maxPending:1,...policy});
 const internals=painter as unknown as {bake:(mass:WorldMassRuntime,cell:MassCell)=>HTMLCanvasElement;bakeSteps:(mass:WorldMassRuntime,cell:MassCell)=>Generator<void,HTMLCanvasElement>;baked:Map<string,{canvas:RecordedCanvas}>;pending:Map<string,unknown>};
 const drawn:RecordedCanvas[]=[],created:RecordedCanvas[]=[];let steps=0,sync=0;
 internals.bakeSteps=function*(_m,cell){
  const canvas={key:cellKey(cell),serial:created.length+1,complete:false};created.push(canvas);
  for(let i=0;i<6;i++){steps++;yield;}steps++;canvas.complete=true;
  return canvas as unknown as HTMLCanvasElement;
 };
 const bake=internals.bake.bind(painter);
 internals.bake=(...args)=>{sync++;return bake(...args);};
 const ctx={drawImage:(canvas:RecordedCanvas)=>{assert.ok(canvas.complete,'no partial canvas is ever visible');drawn.push(canvas);}} as unknown as CanvasRenderingContext2D;
 const draw=(x=0,y=0)=>painter.draw(ctx,mass,x,y,100,100);
 const paint=(cell:MassCell)=>state.paint({address:{...cell,x:0,y:0},region:'mud',color:'#123456',cause:'probe/floor-work'});
 return {mass,state,stream,painter,internals,created,drawn,draw,paint,cells,
  counts:()=>({steps,sync}),point:(cell:MassCell)=>localOffset({...cell,x:0,y:0},origin,240)};
};
{
 const f=fixture();f.draw();assert.deepEqual(f.counts(),{steps:9,sync:1});
 assert.equal(f.internals.pending.size,1);assert.equal(f.internals.baked.size,1);
 const target=f.created[1],cell=f.cells.find(c=>cellKey(c)===target.key)!;
 for(let i=0;i<3;i++){const before=f.counts().steps;f.draw();assert.ok(f.counts().steps-before<=2);}
 assert.equal(f.internals.baked.get(target.key)?.canvas,target,'publish the completed original job');
 const before=f.counts().sync,p=f.point(cell);f.draw(p.x,p.y);
 assert.equal(f.counts().sync,before,'entering prepared ground causes no synchronous bake');
 assert.equal(f.drawn.at(-1),target);
 console.log('PASS budgeted preparation, atomic original-canvas publication and prepared crossing');
}
{
 const f=fixture();f.draw();const target=f.created[1],cell=f.cells.find(c=>cellKey(c)===target.key)!,p=f.point(cell);
 const before=f.counts().sync;f.draw(p.x,p.y);
 assert.equal(f.counts().sync,before,'visible partial work resumes instead of restarting');
 assert.equal(f.drawn.at(-1),target);assert.ok(target.complete);
 const far=neighborCell(origin,-30,30),q=f.point(far);f.draw(q.x,q.y);
 assert.equal(f.counts().sync,before+1,'a cold jump still produces complete ground synchronously');
 assert.equal(f.internals.pending.size,0,'departed speculative work is discarded');
 console.log('PASS partial crossing, complete cold fallback and departed-work disposal');
}
{
 const f=fixture();f.draw();const target=f.created[1];
 f.paint(neighborCell(origin,30,30));f.draw();assert.equal(f.created[1],target);
 assert.equal(f.created.length,2,'unrelated edit preserves partially finished work');
 const cell=f.cells.find(c=>cellKey(c)===target.key)!;
 f.paint(neighborCell(cell,1,0));f.draw();
 assert.notEqual(f.created.at(-1),target,'palette halo invalidates unfinished work');
 for(let i=0;i<8;i++)f.draw();
 assert.notEqual(f.internals.baked.get(target.key)?.canvas,target,'stale job can never publish');
 const saved=f.state.snapshot(),before=f.internals.baked.get(target.key)?.canvas;
 f.state.restore(saved);f.stream.step(256);for(let i=0;i<15;i++)f.draw();
 assert.notEqual(f.internals.baked.get(target.key)?.canvas,before,'restore restarts all renderer work');
 const beforeState=canonical(f.state.snapshot()),random=Math.random;Math.random=()=>{throw Error('simulation RNG in renderer');};
 try{for(let i=0;i<20;i++)f.draw();}finally{Math.random=random;}
 assert.equal(canonical(f.state.snapshot()),beforeState);
 console.log('PASS remote retention, changed-halo cancellation, restore and simulation purity');
}
{
 const f=fixture({maxPending:2},3);for(let i=0;i<40;i++){
  f.draw();assert.ok(f.internals.baked.size+f.internals.pending.size<=3);
 }
 const before=f.counts();for(let i=0;i<20;i++)f.draw();
 assert.deepEqual(f.counts(),before,'a full stable apron never churns completed speculative pages');
 f.painter.draw({drawImage:()=>{}} as unknown as CanvasRenderingContext2D,{...f.mass} as WorldMassRuntime,0,0,100,100);
 assert.ok(f.counts().sync>before.sync,'new runtime owns new canvases');
 const off=fixture({enabled:false});off.draw();assert.deepEqual(off.counts(),{steps:7,sync:1});assert.equal(off.internals.pending.size,0);
 const zero=fixture({stepsPerDraw:0});zero.draw();assert.deepEqual(zero.counts(),{steps:7,sync:1});
 const crowded=fixture({},1);crowded.draw();assert.equal(crowded.internals.pending.size,0);
 console.log('PASS combined residency cap, stable full apron, runtime ownership and opt-outs');
}
{
 for(const bad of [{stepsPerDraw:NaN},{stepsPerDraw:-1},{stepsPerDraw:1025},{halo:3},{halo:.5},{maxPending:9},{enabled:1}])
  assert.throws(()=>new MassPainter({...MASS_FLOOR_VIEW,...bad} as MassFloorPreparation));
 // A fresh stream with only visible geography available cannot speculate.
 const empty=fixture();(empty.mass as unknown as {stream:MassStream}).stream=new MassStream(empty.mass.generator,empty.state,{maxPages:4,maxSamples:100});
 empty.draw();assert.equal(empty.internals.pending.size,0);
 console.log('PASS invalid-policy refusal and no speculative generation of unavailable pages');
}
{
 const f=fixture({maxPending:2});
 f.stream.request([...f.cells.slice(1),neighborCell(origin,-1,0)]);f.stream.step(256);
 for(let i=0;i<60;i++)f.draw();
 const before=f.counts();for(let i=0;i<20;i++)f.draw();
 assert.deepEqual(f.counts(),before,'more prepared neighbors than spare canvas slots cannot cause endless evict/rebuild');
 assert.equal(f.internals.baked.size,4);assert.equal(f.internals.pending.size,0);
 console.log('PASS oversubscribed prepared apron settles without cache churn');
}
