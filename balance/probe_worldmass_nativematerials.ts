import assert from 'node:assert/strict';
import { MassPainter } from '../src/worldmass/paint';
import { address, neighborCell, type MassCell } from '../src/worldmass/address';
import { MassGenerator, makeMassRun } from '../src/worldmass/generator';
import { MassState } from '../src/worldmass/state';
import { MassStream } from '../src/worldmass/stream';
import { MassWalk } from '../src/worldmass/walk';
import { massDigest } from '../src/worldmass/random';
import { regionKind } from '../src/world/regions';
import { GroundRenderer } from '../src/render/vis/ground';
import { paintRegionMasonry, paintRegionFoliage } from '../src/render/vis/regionMaterials';
import type { MassSpec } from '../src/worldmass/contracts';
import type { WorldMassRuntime } from '../src/worldmass/runtime';

// Exercise the real MassPainter canvas dispatch. A recording canvas keeps this
// probe headless; browser acceptance separately verifies rasterized frames.
type Command=unknown[];
class RecordedPath { rects:number[][]=[];rect(...args:number[]){this.rects.push(args);} }
class RecordedCanvas {
 width=0;height=0;commands:Command[]=[];context:CanvasRenderingContext2D;
 constructor(){
  const values:Record<string,unknown>={};
  this.context=new Proxy(values,{
   set:(target,key,value)=>{target[String(key)]=value;this.commands.push(['set',key,value]);return true;},
   get:(target,key)=>{
    if(key in target)return target[String(key)];
    if(key==='createImageData')return(w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4)});
    if(key==='putImageData')return(data:{data:Uint8ClampedArray},x:number,y:number)=>this.commands.push(['pixels',massDigest(Array.from(data.data)),x,y]);
    return(...args:unknown[])=>this.commands.push([key,...args.map(a=>a instanceof RecordedPath?a.rects:a instanceof RecordedCanvas?massDigest(a.commands):a)]);
   },
  }) as unknown as CanvasRenderingContext2D;
 }
 getContext(){return this.context;}
}
const savedDocument=globalThis.document,savedPath=globalThis.Path2D;
Object.assign(globalThis,{document:{createElement:()=>new RecordedCanvas()},Path2D:RecordedPath});
const spec:MassSpec={id:'native-material-probe',version:1,addressSpan:240,terrainCell:30,fields:[],
 surfaces:[{id:'grass',priority:0,when:[],region:'ground',color:'#557744',biome:'field'}],places:[]};
const origin=address('surface','-4294967297','4294967298',0,0,240);
const fixture=(kind:string)=>{
 const generator=new MassGenerator(makeMassRun(713,'native-material-probe',spec),spec),state=new MassState(generator.run,30);
 const stream=new MassStream(generator,state,{maxPages:4,maxSamples:512}),walk=new MassWalk(stream,origin);
 const mass={state,stream,walk,generator,origin,config:{terrain:spec}} as unknown as WorldMassRuntime;
 if(kind!=='ground')for(let y=2;y<6;y++)for(let x=2;x<6;x++)state.paint({address:{...origin,x:x*30,y:y*30},region:kind,color:'#123456',cause:'native-material-fixture'});
 const painter=new MassPainter({enabled:false,stepsPerDraw:0,halo:0,maxPending:0});
 const bake=(cell:MassCell=origin)=>(painter as unknown as {bake(m:WorldMassRuntime,c:MassCell):RecordedCanvas}).bake(mass,cell);
 return {state,mass,bake};
};
try{
 const regions=['crag','drystone','hedgewall','sandstone','slagcrag'],hashes=new Set<string>();
 for(const id of regions){
  const f=fixture(id),c=f.bake(),vis=regionKind(id)!.visual!;
  assert.ok(c.commands.some(r=>r[0]==='set'&&r[1]==='fillStyle'&&r[2]===vis.fill),id+' uses its authored fill');
  assert.ok(c.commands.some(r=>r[0]==='set'&&r[1]==='fillStyle'&&r[2]===vis.edge!.color),id+' preserves its native rim');
  assert.equal(c.commands.filter(r=>r[0]==='ellipse').length>0,!!vis.foliage,id+' has leaf geometry only when native foliage is declared');
  const solidClip=c.commands.filter(r=>r[0]==='clip').at(-1);
  assert.deepEqual(solidClip,['clip',[]],id+' must never enter generic stone fracture mask');
  const before=massDigest(c.commands);hashes.add(before);
  const save=JSON.parse(JSON.stringify(f.state.snapshot()));f.state.restore(save);
  f.bake(neighborCell(origin,1,0));assert.equal(massDigest(f.bake().commands),before,id+' is stable across Continue and reversed page work');
 }
 assert.equal(hashes.size,regions.length);
 const generic=fixture('wall').bake();assert.ok(generic.commands.some(r=>r[0]==='set'&&r[1]==='fillStyle'&&r[2]==='#123456'));
 assert.equal((generic.commands.filter(r=>r[0]==='clip').at(-1)![1] as number[][]).length,16,'generic country wall keeps its fracture surface');
 const ground=fixture('ground').bake();assert.equal(ground.commands.filter(r=>r[0]==='ellipse').length,0);
 assert.deepEqual(ground.commands.filter(r=>r[0]==='clip').at(-1),['clip',[]]);
 console.log('PASS actual continuous painter: five distinct native blocking materials, exact native rims, foliage/masonry dispatch, generic wall and ordinary ground preserved');
 // Both ground adapters call exactly the same native operations, including
 // negative coordinates and running-bond joints across a page boundary.
 for(const [method,shared]of [['bakeMasonry',paintRegionMasonry],['bakeFoliage',paintRegionFoliage]] as const){
  const native=new GroundRenderer() as unknown as {seed:number;[key:string]:unknown};native.seed=713;
  const a=new RecordedCanvas(),b=new RecordedCanvas();
  (native[method] as Function).call(native,a.context,210,30,30,-240,240,'#4a4438','#25221c','#877f6e');
  shared(b.context,210,30,30,-240,240,'#4a4438','#25221c','#877f6e',713);
  assert.deepEqual(a.commands,b.commands,method+' extraction must preserve every native drawing operation');
 }
 console.log('PASS unchanged native renderer delegation and deterministic restored material drawing');
}finally{Object.assign(globalThis,{document:savedDocument,Path2D:savedPath});}
