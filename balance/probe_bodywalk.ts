import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { bodyWalkPoseOf } from '../src/engine/bodyWalk';
import { BODY_WALK_CFG } from '../src/data/bodyWalk';
import { LOOKS } from '../src/data/looks';
import { PART_PAINTERS } from '../src/render/vis/parts';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';

const w=makeSimWorld('warrior',714),p=w.player;w.actors=[p];
let covered=0;
for(let i=0;i<30;i++){
 const before={...p.pos};w.moveActor(p,1,0,1/60);
 covered+=Math.hypot(p.pos.x-before.x,p.pos.y-before.y)/p.radius;w.update(1/60);
}
assert.ok(covered>1);assert.ok(Math.abs(p.bodyWalk!.travel-covered)<1e-8);
assert.ok(bodyWalkPoseOf(p,w.time));
const frozen=JSON.stringify([p.bodyWalk,p.pos,p.life,p.mana,p.radius,w.time]);
assert.deepEqual(bodyWalkPoseOf(p,w.time),bodyWalkPoseOf(p,w.time));
assert.equal(JSON.stringify([p.bodyWalk,p.pos,p.life,p.mana,p.radius,w.time]),frozen);
const travel=p.bodyWalk!.travel;
w.update(.2);assert.equal(p.bodyWalk!.travel,travel);assert.equal(bodyWalkPoseOf(p,w.time),undefined);
console.log('PASS native displacement drives stride, repeated reads preserve state, and idle settles');

w.moveActor(p,0,1,1/60);
assert.ok(Math.abs(p.bodyWalk!.direction-Math.PI/2)<1e-6);
for(const key of ['dead','downed','passive','anchored','flying'] as const){
 const old=p[key];(p as any)[key]=true;assert.equal(bodyWalkPoseOf(p,w.time),undefined,key);(p as any)[key]=old;
}
const pose=bodyWalkPoseOf(p,w.time);assert.ok(pose);
p.push={vx:100,vy:0} as any;assert.equal(bodyWalkPoseOf(p,w.time),undefined);p.push=null;
const enabled=BODY_WALK_CFG.enabled;BODY_WALK_CFG.enabled=false;
assert.equal(bodyWalkPoseOf(p,w.time),undefined);BODY_WALK_CFG.enabled=enabled;
const snap=serializeSnapshot(w,1),client=makeSimWorld('warrior',715);
applySnapshot(client,snap);assert.deepEqual(bodyWalkPoseOf(client.player,client.time),pose);
assert.notEqual(client.player.bodyWalkPose,pose);
for(const a of snap.actors)delete a.bodyWalkPose;
applySnapshot(client,snap);assert.equal(client.player.bodyWalkPose,null);
assert.equal(bodyWalkPoseOf(client.player,client.time),undefined);
console.log('PASS direction, exclusions, global opt-out, host pose and legacy pooled mirror clearing');

const town=makeSimWorld('warrior',12345);town.loadZone('lastlight');
const h=town.player;town.actors=[h];
const house=town.structures.find(s=>s.defId==='house_small')!;assert.ok(house);
h.pos.x=house.rect.x-60;h.pos.y=house.rect.y+house.rect.h/2;
for(let i=0;i<180;i++){town.moveActor(h,1,0,1/60);town.update(1/60);}
const blockedTravel=h.bodyWalk!.travel,blockedPosition={...h.pos};
for(let i=0;i<60;i++){town.moveActor(h,1,0,1/60);town.update(1/60);}
assert.deepEqual(h.pos,blockedPosition);assert.equal(h.bodyWalk!.travel,blockedTravel);
assert.equal(bodyWalkPoseOf(h,town.time),undefined,'holding into a real wall cannot step in place');
console.log('PASS native Lastlight wall collision stops the gait while movement remains held');

const spell=makeSimWorld('magician',717),mage=spell.player;spell.actors=[mage];
assert.ok(spell.useSkill(mage,mage.skills[0]!,{x:mage.pos.x+100,y:mage.pos.y}));
const at={...mage.pos};
for(let i=0;i<10;i++){spell.moveActor(mage,1,0,1/60);spell.update(1/60);}
assert.deepEqual(mage.pos,at);assert.equal(mage.bodyWalk,undefined);
console.log('PASS native committed rooted cast cannot stamp walking');

for(const [id,look] of Object.entries(LOOKS)){
 const gait=look.walk;if(!gait)continue;
 assert.ok(Number.isFinite(gait.cycle)&&gait.cycle>0,id);
 for(const v of [gait.swing,gait.sway,gait.lift])assert.ok(Number.isFinite(v)&&v>=0,id);
 assert.ok(gait.parts.length>0,id);
 for(const spec of gait.parts){assert.ok(PART_PAINTERS[spec.kind],id);assert.ok(Number.isFinite(spec.phase??1),id);}
}
console.log('PASS every opted-in look has finite configuration and registered limb painters');
