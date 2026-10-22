import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { sweepBodyShape } from '../src/engine/bodySweep';
import { shapeDistance, type HitShape } from '../src/engine/shapes';
import type { Doodad } from '../src/engine/levelgen';
import { GridWalkField } from '../src/world/gridWalk';
import { mod } from '../src/engine/stats';
import { doodadNavigation } from '../src/engine/doodadNavigation';

const restore = seedGlobalRandom(281903);
const w = makeSimWorld('rogue', 281903);
w.walk = null; w.actors = [w.player]; w.structures = []; w.exits = [];
const body = w.player, radius = body.radius;
function scene(shapes: { x: number; y: number; shape: HitShape; tier?: number }[]) {
  w.doodads = shapes.map(s => ({ kind:'tree', radius:50, pos:{x:s.x,y:s.y},hitbox:s.shape,tier:s.tier })) as Doodad[];
  w.markDoodadsChanged();
}
// A real floor grid is not a furniture map. Advisory routes must include
// the same solids as the new collision solver, without repainting terrain.
const floor = new GridWalkField(1600,1200,30); floor.fillRect(0,0,1599,1199,true);
scene([{x:795,y:615,shape:{kind:'rect',hw:30,hh:10,rot:.05}}]);
const floorBefore=JSON.stringify(floor.pack());
const nav=doodadNavigation(w,floor,0,14);
assert.equal(nav.isWalkable(795,615),false,'route cannot target the center of a hay bale');
assert.equal(JSON.stringify(floor.pack()),floorBefore,'routing cannot alter floor or shadow geometry');
assert.equal(doodadNavigation(w,floor,0,14),nav,'unchanged furniture reuses the route cache');
assert.ok(doodadNavigation(w,floor,1,14).isWalkable(795,615),'other-floor furniture stays out of the route');
w.walk=floor;w.zone.tiers=undefined;
assert.equal(w.pathField(9),w.pathField(0),'a stale story on flat terrain shares its one furniture route');
w.walk=null;
floor.fillRegion(700,500,700,500,'wall');
assert.equal(doodadNavigation(w,floor,0,14).isWalkable(700,500),false,'terrain edits invalidate the advisory route');
scene([]);
assert.ok(doodadNavigation(w,floor,0,14).isWalkable(795,615),'removed furniture reopens its route');
const circle = { kind:'circle',r:25 } as const;
scene([{x:800,y:600,shape:circle}]);
const hit = w.clampPos({x:900,y:600}, radius, {x:700,y:600}, {mover:body});
assert.ok(Math.abs(hit.x - (775-radius)) < .001, 'fast displacement stops on the incoming trunk face');
assert.equal(hit.y,600);
const tangent = w.clampPos({x:hit.x,y:640},radius,hit,{mover:body});
assert.equal(tangent.y,640,'tangent motion remains free');
assert.equal(w.clampPos({x:700,y:600},radius,hit,{mover:body}).x,700,'can move away from contact');
assert.equal(w.clampPos({x:900,y:600},radius,{x:700,y:600},{mover:body,disp:{ignoreConfine:true}}).x,900,'authored phasing remains free');
body.tier=1;
assert.equal(w.clampPos({x:900,y:600},radius,{x:700,y:600},{mover:body}).x,900,'other-story furniture cannot block');
body.tier=0;
const repaired=w.clampPos({x:1700,y:600},radius,{x:1800,y:600},{mover:body});
assert.ok(repaired.x<=w.arena.w-radius,'a corrupt exterior origin still receives bounds recovery');

// Rotation-independent thin slabs, rounded corners, and multi-lobe bodies.
for (const shape of [circle,{kind:'rect',hw:3,hh:60,rot:.43},{kind:'multi',parts:[{dx:-18,dy:0,r:15},{dx:15,dy:5,r:24}]}] as HitShape[]) {
  scene([{x:800,y:600,shape}]);
  for(let i=0;i<64;i++) {
    const a=i*Math.PI/32,from={x:800+Math.cos(a)*150,y:600+Math.sin(a)*150};
    const to={x:800-Math.cos(a)*150,y:600-Math.sin(a)*150};
    const out=w.clampPos(to,radius,from,{mover:body});
    assert.ok(shapeDistance(shape,800,600,out.x,out.y)>=radius-1e-4,'swept body remains outside exact shape');
    assert.ok(Math.hypot(out.x-from.x,out.y-from.y)<=300.001,'contact adds no displacement');
    assert.ok(sweepBodyShape(shape,800,600,from.x,from.y,to.x-from.x,to.y-from.y,radius));
  }
}

// Seeded collision investigation fixture: a 48px shove used to travel 76.7px
// through overlapping trunks, ending embedded. Preserve the actual counterexample.
scene([
 {x:804.5665064221248,y:624.7950490587391,shape:{kind:'circle',r:21.79984090430662}},
 {x:864.7723651188426,y:613.915098500438,shape:{kind:'circle',r:25.93121799454093}},
 {x:760.6842267420143,y:594.2352787521668,shape:{kind:'circle',r:36.75921646691859}},
 {x:795.3123474866152,y:618.054571102839,shape:{kind:'circle',r:17.114701353013515}},
 {x:826.3512178114615,y:586.1246635811403,shape:{kind:'circle',r:20.526845450978726}},
]);
const from={x:817.3299944563769,y:662.9393292940222},to={x:805.7571451438348,y:616.355328190755};
body.pos={...from};body.push={vx:(to.x-from.x)*30,vy:(to.y-from.y)*30};
for(let i=0;i<32;i++) {
 const before={...body.pos};w.update(1/30);
 assert.equal(w.pointInSolid(body.pos.x,body.pos.y,radius-1e-4),null,'real shove never embeds the body');
 assert.ok(Math.hypot(body.pos.x-before.x,body.pos.y-before.y)<48.001,'no recovery-sized jump');
}

let moves=0;
for(let i=0;i<1500;i++) {
 const from={x:720+Math.random()*170,y:510+Math.random()*180};
 if(w.pointInSolid(from.x,from.y,radius))continue;
 const a=Math.random()*Math.PI*2,d=1+Math.random()*150;
 const out=w.clampPos({x:from.x+Math.cos(a)*d,y:from.y+Math.sin(a)*d},radius,from,{mover:body});
 assert.equal(w.pointInSolid(out.x,out.y,radius-1e-4),null,'random clear-origin movement never enters a solid');
 assert.ok(Math.hypot(out.x-from.x,out.y-from.y)<=d+.001,'obstacle resolution never adds travel');moves++;
}
// A grid wall's alternate axis slide must not introduce a furniture overlap.
const g=new GridWalkField(1600,1200,20);g.fillRegion(0,0,1599,1199,'ground');g.fillRegion(800,0,819,1199,'wall');w.walk=g;
scene([{x:760,y:630,shape:{kind:'circle',r:15}}]);
const out=w.clampPos({x:850,y:680},radius,{x:730,y:570},{mover:body});
assert.ok(g.isWalkable(out.x,out.y));assert.equal(w.pointInSolid(out.x,out.y,radius-1e-4),null);
// Crowded pursuit at two frame rates: use the real movement and separation
// passes, keeping every spawn initially clear of the fixed obstacle cluster.
w.walk=null;
body.sheet.setSource('collision-qa',[mod('life','override',1e6),mod('lifeRegen','override',1e6)]);
body.fillResources();
let crowdFrames=0;
for(const hz of [30,60]) {
 scene([
  {x:850,y:600,shape:{kind:'circle',r:35}},
  {x:876,y:635,shape:{kind:'circle',r:30}},
  {x:880,y:572,shape:{kind:'circle',r:30}},
  {x:915,y:600,shape:{kind:'multi',parts:[{dx:-10,dy:0,r:30},{dx:15,dy:10,r:28}]}},
 ]);
 w.actors=[body];body.pos={x:785,y:600};body.push=null;
 for(let j=0;j<36;j++){
  const a=w.createMonster('zombie',1,'enemy');a.pos=w.findFreeSpot({x:680+(j%6)*20,y:550+Math.floor(j/6)*20},a.radius);w.actors.push(a);
 }
 for(let i=0;i<hz*4;i++){
  w.moveActor(body,1,Math.sin(i/hz*3)*.4,1/hz);
  if(i%hz===0)body.push={vx:600,vy:Math.sin(i)*180};
  w.update(1/hz);crowdFrames++;
  assert.equal(w.pointInSolid(body.pos.x,body.pos.y,radius-1e-4),null,'crowded pursuit cannot push the hero into furniture');
 }
}
restore();console.log(`ALL PASS: exact swept contacts, real knockback, layers/phasing, ${moves} seeded cluster moves and ${crowdFrames} crowded frames`);
