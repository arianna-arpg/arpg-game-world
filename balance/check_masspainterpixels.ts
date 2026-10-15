/** Actual floor-generator ownership controls with an instrumented Canvas API.
 * Browser pixels and Firefox memory usage are separate acceptance courses. */
import assert from 'node:assert/strict';
import { MassPainter, MASS_FLOOR_VIEW } from '../src/worldmass/paint';
import { MassGenerator, makeMassRun } from '../src/worldmass/generator';
import { MassState } from '../src/worldmass/state';
import { MassStream } from '../src/worldmass/stream';
import { MassWalk } from '../src/worldmass/walk';
import { address, neighborCell, type MassCell } from '../src/worldmass/address';
import type { MassSpec } from '../src/worldmass/contracts';
import type { WorldMassRuntime } from '../src/worldmass/runtime';

const canvases: Canvas[] = [], copies: {source: Canvas; width: number; height: number}[] = [];
let failContext = -1, failCopy = false, liveLimit = 7;
const liveCount = () => canvases.filter(canvas=>canvas.width>0 && canvas.height>0).length;
class Canvas {
  private w = 300; private h = 150; readonly id = canvases.length;
  releases = 0;
  get width() { return this.w; }
  set width(value: number) { this.w = value; }
  get height() { return this.h; }
  set height(value: number) {
    this.h = value;
    if (value===0 && this.w===0) { this.releases++; assert.equal(this.releases,1,'release each buffer once'); }
  }
  constructor() { canvases.push(this); assert(liveCount()<=liveLimit,'bounded live buffers in the one-page courses'); }
  getContext() {
    if (this.id === failContext) throw Error('selected context failure');
    return context(this);
  }
}
function context(canvas?: Canvas): CanvasRenderingContext2D {
  const base: Record<string, unknown> = {
    canvas,
    createImageData: (w: number, h: number) => ({data: new Uint8ClampedArray(w*h*4), width: w, height: h}),
    createLinearGradient: () => ({addColorStop() {}}),
    drawImage: (source: Canvas) => {
      assert(source.width > 0 && source.height > 0, 'only live pixels may be copied');
      copies.push({source, width: source.width, height: source.height});
      if (canvas && failCopy) throw Error('selected copy failure');
    },
  };
  return new Proxy(base, {
    get: (target, key) => key in target ? Reflect.get(target, key) : () => {},
    set: (target, key, value) => Reflect.set(target, key, value),
  }) as unknown as CanvasRenderingContext2D;
}
const documentBefore = Object.getOwnPropertyDescriptor(globalThis, 'document');
const pathBefore = Object.getOwnPropertyDescriptor(globalThis, 'Path2D');
Object.defineProperty(globalThis, 'document', {configurable: true, value: {
  createElement: (tag: string) => { assert.equal(tag, 'canvas'); return new Canvas(); },
}});
Object.defineProperty(globalThis, 'Path2D', {configurable: true, value: class {
  rect() {} moveTo() {} lineTo() {} closePath() {}
}});
const spec: MassSpec = {
  id:'probe:floor-pixels', version:1, addressSpan:240, terrainCell:30,
  fields:[{id:'elevation',base:.5,layers:[]}],
  surfaces:[{id:'land',priority:0,when:[],region:'ground',color:'#557744',biome:'field'}], places:[],
};
const origin = address('surface','0','0',0,0,240);
const released = (canvas: Canvas) => assert.deepEqual([canvas.width, canvas.height], [0,0]);
function fixture(enabled = false, capacity = 3) {
  liveLimit=capacity+4; // one pending allowance, one settlement and bounded transient work
  const generator = new MassGenerator(makeMassRun(42,'floor-pixels',spec), spec);
  const state = new MassState(generator.run,30);
  const stream = new MassStream(generator,state,{maxPages:capacity,maxSamples:2048});
  stream.request([origin,neighborCell(origin,1,0),neighborCell(origin,0,1)].slice(0,capacity));
  stream.step(256);
  const mass = {state,stream,generator,origin,walk:new MassWalk(stream,origin),config:{terrain:spec}} as unknown as WorldMassRuntime;
  const painter = new MassPainter({...MASS_FLOOR_VIEW,enabled,stepsPerDraw:1,maxPending:1,maxWorkMs:undefined});
  const draw = (x = 1) => painter.draw(context(),mass,x,1,100,100);
  return {mass,painter,draw,state};
}
function course(name: string, run: () => void): void { run(); console.log('PASS '+name); }
try {
  course('completed scratch release, LRU reuse/eviction, runtime change and idempotent disposal', () => {
    const f=fixture(false,1), start=canvases.length;
    f.draw();
    const floor=canvases[start], scratch=canvases[start+1];
    assert.equal(canvases.length,start+2); assert.equal(floor.width,240); released(scratch);
    assert(copies.some(row=>row.source===scratch && row.width===60));
    f.draw();
    assert.equal(canvases.length,start+2,'LRU refresh reuses live floor');
    assert.equal(floor.width,240);
    f.draw(481); released(floor);
    const retained=canvases.at(-2)!; assert.equal(retained.width,240);
    f.painter.draw(context(),{...f.mass} as WorldMassRuntime,1,1,100,100); released(retained);
    f.painter.dispose(); f.painter.dispose();
    for(const canvas of canvases.slice(start)) released(canvas);
  });
  course('terrain invalidation releases the old complete floor', () => {
    const f=fixture(), start=canvases.length;
    f.draw(); const old=canvases[start];
    f.state.paint({address:{...origin,x:0,y:0},region:'mud',color:'#123456',cause:'probe/pixel-release'});
    f.draw(); released(old); f.painter.dispose();
    for(const canvas of canvases.slice(start)) released(canvas);
  });
  course('departed partial preparation releases its full canvas', () => {
    const f=fixture(true), start=canvases.length;
    f.draw(); f.draw();
    const partial=canvases[start+2]; assert(partial && partial.width===240);
    f.draw(9601); released(partial); f.painter.dispose();
    for(const canvas of canvases.slice(start)) released(canvas);
  });
  course('cancelling the actual generator while scratch is live releases both buffers', () => {
    const f=fixture(), start=canvases.length;
    const work=(Reflect.get(f.painter,'bakeSteps') as
      (mass:WorldMassRuntime,cell:MassCell)=>Generator<void,HTMLCanvasElement>).call(f.painter,f.mass,origin);
    while(canvases.length<start+2) assert.equal(work.next().done,false);
    assert.equal(canvases[start].width,240); assert.equal(canvases[start+1].width,60);
    work.return(undefined as never); released(canvases[start]); released(canvases[start+1]);
    f.painter.dispose();
  });
  course('selected copy failure releases unpublished buffers and a retry paints fresh pixels', () => {
    const f=fixture(), start=canvases.length;
    failCopy=true;
    try { assert.throws(()=>f.draw(),/selected copy failure/); } finally { failCopy=false; }
    for(const canvas of canvases.slice(start)) released(canvas);
    f.draw(); assert.equal(canvases.at(-2)!.width,240,'retry owns a fresh complete page');
    f.painter.dispose();
  });
  course('failed pending generator is removed and can retry', () => {
    const f=fixture(true), start=canvases.length;
    f.draw(); failContext=canvases.length;
    try { assert.throws(()=>f.draw(),/selected context failure/); } finally { failContext=-1; }
    released(canvases[start+2]);
    assert.equal((Reflect.get(f.painter,'pending') as Map<string,unknown>).size,0);
    f.draw(); f.painter.dispose();
    for(const canvas of canvases.slice(start)) released(canvas);
  });
  course('selected scratch-context failure releases both allocations', () => {
    const f=fixture(), start=canvases.length;
    failContext=start+1;
    try { assert.throws(()=>f.draw(),/selected context failure/); } finally { failContext=-1; }
    assert.equal(canvases.length,start+2);
    for(const canvas of canvases.slice(start)) released(canvas);
    f.painter.dispose();
  });
  course('pixel census observes suspended work and explicit disposal', () => {
    const f=fixture(true),start=canvases.length;f.draw();f.draw();
    const live=canvases.slice(start).filter(canvas=>canvas.width>0 && canvas.height>0);
    assert.deepEqual(f.painter.pixelStats(),{count:live.length,bytes:live.reduce((n,c)=>n+c.width*c.height*4,0)});
    f.painter.dispose();assert.deepEqual(f.painter.pixelStats(),{count:0,bytes:0});
  });
  course('settlement pixel buffer has the same explicit disposal owner', () => {
    const f=fixture(), start=canvases.length;
    const town={...f.mass,settlement:{zone:{size:{w:240,h:240}},spec:{blend:24}}} as unknown as WorldMassRuntime;
    f.painter.drawSettlement(context(),town,1,1,100,100,g=>g.fillRect(0,0,10,10));
    assert.equal(canvases[start].width,100);
    f.painter.dispose(); released(canvases[start]);
  });
  assert.equal(liveCount(),0,'all course-owned canvases are released');
  for(const canvas of canvases)assert.equal(canvas.releases,1,'every allocated canvas released exactly once');
} finally {
  if(documentBefore) Object.defineProperty(globalThis,'document',documentBefore); else Reflect.deleteProperty(globalThis,'document');
  if(pathBefore) Object.defineProperty(globalThis,'Path2D',pathBefore); else Reflect.deleteProperty(globalThis,'Path2D');
}
