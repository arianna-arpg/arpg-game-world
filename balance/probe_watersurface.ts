import assert from 'node:assert/strict';
import { WATER_SURFACE, ordinaryWater } from '../src/data/waterSurface';
import { waterRipple, paintWaterSurface } from '../src/render/vis/waterSurface';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
assert.equal((DOODAD_VISUALS.water.params!.core as {color:string}).color,WATER_SURFACE.deep);
assert.equal(DOODAD_VISUALS.water.params!.waterMotion,true);
assert.equal(DOODAD_VISUALS.mirage_oasis.params!.sheen,DOODAD_VISUALS.water.params!.sheen);
assert.ok(ordinaryWater('water') && ordinaryWater('deep_water') && !ordinaryWater('soul_water') && !ordinaryWater('lava'));
for (const x of [-14,0,17]) for (const y of [-10,0,13]) {
  assert.deepEqual(waterRipple(x,y,4),waterRipple(x,y,4));
  assert.notDeepEqual(waterRipple(x,y,4),waterRipple(x,y,6));
  assert.ok(Math.abs(waterRipple(x,y,4).y-waterRipple(x,y,6).y)<=WATER_SURFACE.drift*2);
}
const calls: number[][]=[];
const ctx={save(){},restore(){},beginPath(){},moveTo(x:number,y:number){calls.push([x,y]);},lineTo(x:number,y:number){calls.push([x,y]);},stroke(){}} as unknown as CanvasRenderingContext2D;
paintWaterSurface(ctx,{x:-200,y:-100,w:400,h:200},1);const first=JSON.stringify(calls);calls.length=0;
paintWaterSurface(ctx,{x:-200,y:-100,w:400,h:200},2);assert.notEqual(JSON.stringify(calls),first);
assert.ok(calls.length<10000);
calls.length=0;paintWaterSurface(ctx,{x:-200,y:-100,w:400,h:200},2,()=>0);
assert.equal(calls.length,0,'fully faded water emits no stray ripples');
console.log('PASS shared water palette, slow clocked motion, negative coordinates and bounded visible drawing');
