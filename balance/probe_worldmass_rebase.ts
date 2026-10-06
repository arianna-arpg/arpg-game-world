import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { address, type MassPoint } from '../src/worldmass/address';
import { makeMassRun, MassGenerator } from '../src/worldmass/generator';
import { MassState } from '../src/worldmass/state';
import { MassStream } from '../src/worldmass/stream';
import { MassWalk } from '../src/worldmass/walk';
import { massAdventure } from '../src/worldmass/preset';
import { planMassRebase,commitMassRebase,massRebaseDestination,MASS_LIVE_REBASE_OWNERS,
  MASS_REBASE_MAX_ERROR,type MassLocalFrame } from '../src/worldmass/rebase';

const undo=seedGlobalRandom(772);
const frame:MassLocalFrame={origin:{dimension:'surface',cx:'9007199254740991',cy:'-9007199254740991'},epoch:0};
const w=makeSimWorld('warrior',772);w.player.pos={x:40000.25,y:-39000.75};
const foe=w.createMonster('gnoll_prowler',2,'enemy');foe.pos={x:40100.5,y:-38900.5};foe.aiAnchor={x:40040.75,y:-38810.25};w.actors.push(foe);
const aim={x:40200.5,y:-38900.75},emitted={x:40060.5,y:-38940.5},terrain={x:39960,y:-38880};
const velocity={x:170,y:40};
const points:MassPoint[]=[w.player.pos,foe.pos,foe.aiAnchor,aim,emitted,terrain];
const span=960,target=massRebaseDestination(frame,w.player.pos,span)!;
const positions=points.map(p=>({...p})),before=points.map(p=>address(frame.origin.dimension,frame.origin.cx,frame.origin.cy,p.x,p.y,span));
const missing=planMassRebase(frame,target,span,[{id:'actors',points:[w.player.pos,foe.pos]}]);
assert.equal(missing.ok,false);assert.equal(frame.epoch,0);assert.deepEqual(points,positions);
if(!missing.ok)assert.ok(missing.reasons.some(r=>r.includes('skill-effects')));
// Controlled native-body fixture covers only these named coordinates. The live
// game's ten-owner default deliberately refuses this incomplete registration.
const required=['actors','skill-effects','terrain-scenery'];
const owners=[{id:'actors',points:[w.player.pos,foe.pos,foe.aiAnchor]},
 {id:'skill-effects',points:[aim,emitted,foe.pos]}, // shared alias moves once
 {id:'terrain-scenery',points:[terrain]}];
const result=planMassRebase(frame,target,span,owners,required);assert.ok(result.ok);
assert.equal(result.plan.pointCount,points.length);assert.deepEqual(points,positions,'planning is pure');
assert.ok(commitMassRebase(result.plan));assert.equal(frame.epoch,1);assert.equal(commitMassRebase(result.plan),false);
for(let i=0;i<points.length;i++){
 const a=address(frame.origin.dimension,frame.origin.cx,frame.origin.cy,points[i].x,points[i].y,span),b=before[i];
 assert.equal(a.cx,b.cx);assert.equal(a.cy,b.cy);assert.ok(Math.abs(a.x-b.x)<=MASS_REBASE_MAX_ERROR&&Math.abs(a.y-b.y)<=MASS_REBASE_MAX_ERROR);
}
assert.deepEqual(velocity,{x:170,y:40});assert.equal(foe.pos.x-w.player.pos.x,positions[1].x-positions[0].x);
console.log('PASS actual native actor/anchor and controlled effect coordinates retain huge signed-cell addresses and pairwise geometry');

const stale=planMassRebase(frame,{...frame.origin,cx:(BigInt(frame.origin.cx)+1n).toString()},span,owners,required);assert.ok(stale.ok);
foe.pos.x+=1;const staleBefore=points.map(p=>({...p}));assert.equal(commitMassRebase(stale.plan),false);assert.deepEqual(points,staleBefore);
const refusal=planMassRebase(frame,target,span,[...owners,{id:'native-owner',points:[],refusal:'unregistered active beam endpoints'}],[...required,'native-owner']);
assert.equal(refusal.ok,false);
const frozenPoint=Object.freeze({x:1,y:2});assert.equal(planMassRebase(frame,target,span,[{id:'actors',points:[frozenPoint]}],['actors']).ok,false);
const badDimension=planMassRebase(frame,{...frame.origin,dimension:'interior'},span,owners,required);assert.equal(badDimension.ok,false);
console.log('PASS missing/opaque owners, stale state, immutable coordinates and cross-dimension shifts refuse atomically');

// The same durable sample is queried through two real navigation fields. Rebase
// planning does not alter generator truth, sparse patches, or the scene seed.
const spec=massAdventure().terrain,run=makeMassRun(772,'rebase-query',spec),gen=new MassGenerator(run,spec),state=new MassState(run,spec.terrainCell),stream=new MassStream(gen,state,{maxPages:9,maxSamples:32768});
const oldOrigin={dimension:'surface',cx:'1000000000000',cy:'-1000000000000'};
const local={x:40000.25,y:-39000.75},nextOrigin=massRebaseDestination({origin:oldOrigin,epoch:0},local,spec.addressSpan)!;
const oldWalk=new MassWalk(stream,oldOrigin),sample=oldWalk.at(local.x,local.y),region=oldWalk.regionAt(local.x,local.y);
const f={origin:oldOrigin,epoch:0},q=planMassRebase(f,nextOrigin,spec.addressSpan,[{id:'sample',points:[local]}],['sample']);assert.ok(q.ok);assert.ok(commitMassRebase(q.plan));
const newWalk=new MassWalk(stream,f.origin);assert.deepEqual(newWalk.at(local.x,local.y),sample);assert.equal(newWalk.regionAt(local.x,local.y),region);assert.equal(state.revision,0);
assert.equal(MASS_LIVE_REBASE_OWNERS.length,10);
console.log('PASS native navigation samples retain generator truth across a planned frame transfer; live integration remains gated on all ten owners');
undo();
