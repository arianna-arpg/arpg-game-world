import assert from 'node:assert/strict';
import { address, neighborCell, type MassCell } from '../src/worldmass/address';
import { canonical } from '../src/worldmass/random';
import { MassGenerator, makeMassRun } from '../src/worldmass/generator';
import { MassState } from '../src/worldmass/state';
import { MassStream } from '../src/worldmass/stream';
import { MassWalk } from '../src/worldmass/walk';
import { MassPainter } from '../src/worldmass/paint';
import type { MassSpec } from '../src/worldmass/contracts';
import type { WorldMassRuntime } from '../src/worldmass/runtime';

const spec:MassSpec={id:'probe:dirty-terrain',version:1,addressSpan:240,terrainCell:30,
 fields:[{id:'elevation',base:.5,layers:[]}],
 surfaces:[{id:'land',priority:0,when:[],region:'ground',color:'#557744',biome:'field'}],places:[]};
const gen=new MassGenerator(makeMassRun(42,'dirty-terrain',spec),spec);
const origin=address('surface','0','0',0,0,240),east=neighborCell(origin,1,0),far=neighborCell(origin,20,-20);
const factory=()=>{const state=new MassState(gen.run,30),stream=new MassStream(gen,state,{maxPages:4,maxSamples:200});
 return {state,stream};};
const paint=(state:MassState,cell:MassCell,color='#123456')=>state.paint({address:{...cell,x:0,y:0},region:'wall',color,cause:'probe/terrain'});
{
 const {state}=factory();const old=state.snapshot();
 paint(state,origin);const rev=state.terrainRevision;
 assert.equal(state.terrainRevisionAt(origin),rev);assert.equal(state.terrainRevisionAt(east),0);
 paint(state,origin);state.claim('survey','one');
 assert.equal(state.terrainRevision,rev,'identical painting and nonterrain claims do not dirty terrain');
 const distant=address('surface','9007199254740993','-9007199254740992',-1,0,240);
 paint(state,distant);assert.ok(state.terrainRevisionAt(distant)>rev);
 assert.equal(state.terrainRevisionAt({...distant,dimension:'below'}),0,'dimensions never alias');
 state.restore(old);assert.ok(state.terrainRevisionAt(origin)>rev);
 assert.equal(state.terrainRevisionAt(origin),state.terrainRevisionAt(far),'restore invalidates previously untouched pages too');
 assert.deepEqual(Object.keys(state.snapshot()).sort(),['claims','revision','run','terrain']);
 console.log('PASS sparse page stamps, signed huge addresses, idempotence, claims and unsaved restore epoch');
}
{
 const {state,stream}=factory();stream.request([origin,east]);stream.step(69);
 const page=stream.page(origin),sample=stream.sample({...origin,x:10,y:10});assert.ok(page);
 paint(state,far);
 assert.equal(stream.page(origin),page);assert.equal(stream.sample({...origin,x:10,y:10}),sample);
 assert.deepEqual(stream.step(59),{sampled:59,published:1},'unrelated edits retain five prepared samples');
 const eastPage=stream.page(east),eastSample=stream.sample({...east,x:1,y:1});
 paint(state,origin);assert.equal(stream.page(origin),undefined);assert.equal(stream.page(east),eastPage);
 assert.equal(stream.sample({...origin,x:10,y:10}).region,'wall','lazy cache invalidates before the next physics read');
 assert.equal(stream.sample({...east,x:1,y:1}),eastSample);
 stream.step(64);assert.equal(stream.page(origin)?.samples[0].color,'#123456');
 assert.ok(stream.stats.samples<=200&&stream.stats.resident<=4);
 console.log('PASS actual resident pages, lazy samples and partial preparation survive only unrelated edits');
}
{
 const {state,stream}=factory();stream.request([origin,east]);stream.step(5);paint(state,origin);
 assert.equal(stream.step(63).published,0,'a touched partial page restarts atomically');
 assert.equal(stream.step(1).published,1);stream.step(9);
 paint(state,origin,'#445566');assert.equal(stream.step(64).published,1);
 assert.equal(stream.page(origin)?.samples[0].color,'#445566','dirty nearer page retains caller priority');
 assert.equal(stream.page(east),undefined);
 assert.equal(stream.step(55).published,1,'farther unfinished work keeps its nine samples');
 console.log('PASS touched-job restart, nearest-first scheduling, atomic publication and preserved pending work');
}
{
 const {state,stream}=factory();const old=state.snapshot();
 stream.request([origin,east]);stream.step(128);paint(state,origin);stream.step(64);
 const patched=stream.sample({...origin,x:1,y:1}),page=stream.page(east);
 const before=canonical(state.snapshot());
 assert.throws(()=>state.restore({...old,claims:[['duplicate','x'],['duplicate','x']]}));
 assert.equal(canonical(state.snapshot()),before);assert.equal(stream.page(east),page);
 state.restore(old);assert.equal(stream.page(east),undefined);
 assert.notEqual(stream.sample({...origin,x:1,y:1}),patched);
 assert.equal(stream.sample({...origin,x:1,y:1}).region,'ground');stream.step(128);
 const fresh=factory();fresh.state.restore(state.snapshot());fresh.stream.request([origin,east]);fresh.stream.step(128);
 assert.deepEqual(stream.page(origin)?.samples,fresh.stream.page(origin)?.samples);
 assert.deepEqual(stream.page(east)?.samples,fresh.stream.page(east)?.samples);
 console.log('PASS older restore flushes all affected state, failed restore is atomic, and warm/cold terrain matches');
}
{
 const {state,stream}=factory(),walk=new MassWalk(stream,origin);
 const mass={state,stream,walk,generator:gen,config:{terrain:spec}} as unknown as WorldMassRuntime;
 const painter=new MassPainter(),drawn:HTMLCanvasElement[]=[];let count=0;
 // Record real draw/cache decisions. Pixel output is checked separately in
 // the browser; this fixture only replaces the expensive canvas bake.
 (painter as unknown as {bake:()=>HTMLCanvasElement}).bake=()=>({serial:++count} as unknown as HTMLCanvasElement);
 const ctx={drawImage:(c:HTMLCanvasElement)=>drawn.push(c)} as unknown as CanvasRenderingContext2D;
 const draw=()=>painter.draw(ctx,mass,0,0,100,100);
 draw();const first=drawn.at(-1);draw();assert.equal(drawn.at(-1),first);
 paint(state,far);draw();assert.equal(drawn.at(-1),first,'remote edit cannot rebake visible ground');
 paint(state,neighborCell(origin,-1,-1));draw();assert.notEqual(drawn.at(-1),first,'diagonal blend halo invalidates');
 const second=drawn.at(-1);state.claim('reward','one');draw();assert.equal(drawn.at(-1),second);
 const save=state.snapshot(),before=canonical(save),random=Math.random;
 Math.random=()=>{throw Error('Rendering consumed simulation randomness');};
 try{draw();}finally{Math.random=random;}assert.equal(canonical(state.snapshot()),before);
 state.restore(save);draw();assert.notEqual(drawn.at(-1),second,'restore cannot reuse an earlier baked appearance');
 const restored=drawn.at(-1);
 painter.draw(ctx,{...mass} as WorldMassRuntime,0,0,100,100);
 assert.notEqual(drawn.at(-1),restored,'runtime identity still owns canvas lifetime');
 for(let i=0;i<20;i++)painter.draw(ctx,mass,i*240,0,100,100);
 assert.ok((painter as unknown as {baked:Map<string,unknown>}).baked.size<=stream.config.maxPages);
 console.log('PASS real painter retention, diagonal halo, restore/runtime ownership, RNG purity and cache bounds');
}

{
 const {state}=factory();paint(state,origin);paint(state,far);
 const first=state.patchesInCells([origin,origin]);assert.equal(first.length,1);
 assert.equal(first[0],state.patchAt(origin));assert.ok(Object.isFrozen(first)&&Object.isFrozen(first[0].address));
 const before=state.snapshot();paint(state,origin,'#abcdef');
 assert.equal(first[0].color,'#123456','earlier route input stays frozen across later edits');
 assert.equal(state.patchesInCells([origin])[0].color,'#abcdef');
 assert.equal(state.patchesInCells([{...origin,dimension:'below'}]).length,0);
 assert.throws(()=>state.patchesInCells(Array(129).fill(origin)));
 state.restore(before);assert.equal(state.patchesInCells([origin])[0].color,'#123456');
 const fresh=new MassState(gen.run,30);state.restore(fresh.snapshot());assert.equal(state.patchesInCells([origin,far]).length,0);
 console.log('PASS bounded local terrain inputs retain signed-page isolation and immutable edit/restore snapshots');
}
