import assert from 'node:assert/strict';
import { GridWalkField } from '../src/world/gridWalk';
import type { RegionGrid } from '../src/world/walk';
import { litPolygon, LightSightCache } from '../src/render/vis/sight';
import { makeSimWorld } from '../src/sim/arena';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { massAdventure } from '../src/worldmass/preset';
import { canonical } from '../src/worldmass/random';
import { seedGlobalRandom } from '../src/sim/rng';

const restore=seedGlobalRandom(91735), cache=new LightSightCache();
const grid=new GridWalkField(600,600,10);
grid.fillRegion(0,0,599,599,'ground');grid.fillRegion(300,0,309,599,'wall');
const finite={walk:grid}, from={x:250,y:250}, radius=100;
const poly=litPolygon(finite,from.x,from.y,radius)!;
assert.equal(poly.length,48);assert.equal(poly[0].x,303);
assert.equal(poly[24].x,150,'open side keeps full light radius');
const translated:RegionGrid={cellOcclusion:true,cellSize:10,version:0,
 isWalkable:(x,y)=>grid.isWalkable(x+1000,y+1000),
 snapToWalkable:p=>p,regionAt:(x,y)=>grid.regionAt(x+1000,y+1000)};
assert.deepEqual(litPolygon({walk:translated},-750,-750,radius)!.map(p=>({x:p.x+1000,y:p.y+1000}))
 .map(p=>({x:Math.round(p.x*1e7),y:Math.round(p.y*1e7)})),
 poly.map(p=>({x:Math.round(p.x*1e7),y:Math.round(p.y*1e7)})));
assert.ok(litPolygon(finite,20,250,100)![24].x>=-3.000001,'finite out-of-bounds wall retained');
grid.fillRegion(300,0,309,599,'window');assert.equal(litPolygon(finite,250,250,100),null,'windows pass light');
assert.equal(litPolygon({walk:null},1,1,100),null);
for(const r of [0,-1,Infinity,NaN])assert.equal(litPolygon(finite,250,250,r),null);
console.log('PASS exact terrain light rays on finite and translated unbounded grids; walls, windows, bounds and invalid reach');

grid.fillRegion(300,0,309,599,'wall');
const key={},first=cache.read(finite,key,250,250,100);
assert.equal(cache.read(finite,key,250,250,100),first,'unchanged source reuses polygon');
grid.fillRegion(300,0,309,599,'ground');
assert.equal(cache.read(finite,key,250,250,100),null,'repaint invalidates cached wall');
grid.fillRegion(300,0,309,599,'wall');
assert.notEqual(cache.read(finite,key,250,250,100),first);
const sameVersion=new GridWalkField(600,600,10);sameVersion.fillRegion(0,0,599,599,'ground');
sameVersion.version=grid.version;
assert.equal(cache.read({walk:sameVersion},key,250,250,100),null,'same revision on replacement grid cannot inherit shadow');
assert.ok(cache.read(finite,key,250,250,100));
assert.equal(cache.read(finite,key,150,250,100),null,'moved source invalidates');
assert.ok(cache.read(finite,key,250,250,100));
assert.equal(cache.read(finite,key,250,250,30),null,'changed reach invalidates');
console.log('PASS static light cache responds to terrain, replacement map, motion and reach without per-frame rebuilds');

for(const seed of [1,42,451]){
 const w=makeSimWorld('magician',seed),m=new WorldMassRuntime(seed,'light:'+seed,massAdventure());m.attach(w);
 const d=w.doodads.find(d=>d.door?.id.startsWith('waking_house#'))!;
 assert.ok(d?.door);assert.ok(!d.door.open,'fixture starts with a native closed door');
 const x=d.pos.x,y=d.pos.y-42,r=120;
 const before=canonical(m.snapshot(w)),closed=cache.read(w,d,x,y,r)!;
 assert.ok(closed,'actual worldmass walls now admit a light polygon');
 assert.ok(closed[12].y<d.pos.y+20,'closed native door arrests south ray');
 assert.equal(canonical(m.snapshot(w)),before,'reading light never mutates run');
 w.setDoorState(d.door!.id,'open',{silent:true});
 const open=cache.read(w,d,x,y,r)!;
 assert.ok(open[12].y>closed[12].y+30,'native door paint invalidates through settlement overlay');
 (w as unknown as {resealDoor(id:string):void}).resealDoor(d.door!.id);
 assert.deepEqual(cache.read(w,d,x,y,r),closed,'closing restores same silhouette');
 const pos={x:-6000,y:-6000},cs=m.config.terrain.terrainCell;
 for(let cy=-5;cy<=5;cy++)for(let cx=-5;cx<=5;cx++)m.state.paint({
  address:m.walk.at(pos.x+cx*cs,pos.y+cy*cs),region:cx===1?'wall':'ground',cause:'probe/light',color:'#445522'});
 const remote=cache.read(w,key,pos.x+cs/2,pos.y+cs/2,80)!;
 assert.ok(remote[0].x<pos.x+cs*2,'negative wilderness geography blocks independently of page residency');
 m.state.paint({address:m.walk.at(pos.x+cs,pos.y),region:'ground',cause:'probe/light-open',color:'#445522'});
 assert.ok(cache.read(w,key,pos.x+cs/2,pos.y+cs/2,80)![0].x>remote[0].x+20,'wilderness repaint invalidates');
}
console.log('PASS native Lastlight door opening/closing, immutable light reads and negative wilderness edits across three seeds');

let reads=0;
const fine:RegionGrid={cellOcclusion:true,cellSize:2,version:1,isWalkable:()=>true,snapToWalkable:p=>p,
 regionAt:()=>{reads++;return 'ground';}};
assert.equal(litPolygon({walk:fine},-5000,5000,1024),null);
assert.ok(reads<80000,'light work follows ray crossings instead of a square-area scan');
const n=reads,stable={};cache.read({walk:fine},stable,-5000,5000,1024);const once=reads;
cache.read({walk:fine},stable,-5000,5000,1024);assert.equal(reads,once);
assert.ok(n>1000,'budget assertion exercised fine-grid rays');
console.log('PASS 1024-radius fine-grid light uses '+n+' region reads; unchanged static light uses zero extra reads');
restore();
