import assert from 'node:assert/strict';
import { GridWalkField } from '../src/world/gridWalk';
import { LightSightCache, litPolygon } from '../src/render/vis/sight';
import { castGridRay } from '../src/engine/los';
import { SightVeil } from '../src/render/vis/sightVeil';
import { feedingStyle } from '../src/engine/feedingCues';
import { FEEDING_CUE_STYLES } from '../src/data/feedingCues';
const g=new GridWalkField(600,600,10),w={walk:g};
g.fillRegion(0,0,599,599,'ground');
g.fillRegion(300,0,309,599,'wall');
const east=(poly:ReturnType<typeof litPolygon>)=>poly!.find(p=>Math.abs(p.y-250)<1e-7&&p.x>250)!.x;
assert.equal(east(litPolygon(w,250,250,100)),303);
const cache=new LightSightCache(),key={};
const first=cache.read(w,key,250,250,100);
assert.equal(cache.read(w,key,250,250,100),first);
g.fillRegion(300,0,309,599,'window');assert.equal(cache.read(w,key,250,250,100),null);
g.fillRegion(300,0,309,599,'wall');assert.equal(east(cache.read(w,key,250,250,100)),303);
assert.equal(cache.read(w,key,150,250,100),null);
assert.equal(cache.read(w,key,250,250,30),null);
const replacement=new GridWalkField(600,600,10);replacement.fillRegion(0,0,599,599,'ground');replacement.version=g.version;
assert.equal(cache.read({walk:replacement},key,250,250,100),null);
g.fillRegion(0,0,599,599,'butte_top');
assert.equal(cache.read(w,key,250,250,100,1),null,'a source lights its own plateau');
assert.ok(cache.read(w,key,250,250,100,0),'the plateau still blocks a lower source');
g.fillRegion(0,0,599,599,'storey_wall');
assert.equal(cache.read(w,key,250,250,100,0),null,'light passes beneath a hanging partition');
assert.ok(cache.read(w,key,250,250,100,1),'same-story partition blocks light');
for(const r of [0,-1,Infinity,NaN])assert.equal(litPolygon(w,250,250,r),null);
assert.equal(feedingStyle('restoration'),FEEDING_CUE_STYLES.restoration);
assert.notEqual(feedingStyle('restoration'),feedingStyle('flesh'));
console.log('PASS exact light rays; door/window/replacement/movement/range/tier invalidation; restoration material');

// Every sample of a moving visual ray must obey the physical cell crossings.
g.fillRegion(0,0,599,599,'ground');g.fillRegion(300,300,309,309,'wall');
for(let y=235;y<=285;y+=.25){
 const from={x:250,y},p=litPolygon(w,from.x,from.y,110);
 for(const q of p??[]){
  const d=Math.hypot(q.x-from.x,q.y-from.y);if(d<1e-8)continue;
  const target={x:from.x+(q.x-from.x)/d*110,y:from.y+(q.y-from.y)/d*110};
  const hit=castGridRay(g,from,target,'sight');
  assert.ok(hit===null||d<=hit*110+3.001,'painted vertex crosses no more than the wall-face allowance');
 }
}
console.log('PASS 201 movement poses retain physical wall clipping');

// Dense scenes repeatedly query the same actor through links and body draws.
// Reuse a committed current-frame shade instead of re-casting identical rays.
const veil=new SightVeil(),actor={pos:{x:450,y:250},tier:0};
const view={player:{pos:{x:250,y:250},tier:0},walk:g,zone:{},doodads:[],doodadsNear:()=>[],doodadRev:0};
veil.update(view,0,1280,960);
let calls=0;const query=veil.occludedAt.bind(veil);
veil.occludedAt=(...args)=>{calls++;return query(...args)};
for(let i=0;i<100;i++)veil.actorShade(actor,1/60);
assert.equal(calls,1,'one body has one visibility evaluation per frame');
veil.update(view,0,1280,960);veil.actorShade(actor,1/60);assert.equal(calls,2);
console.log('PASS repeated body/link reads use one current-frame visibility query');
