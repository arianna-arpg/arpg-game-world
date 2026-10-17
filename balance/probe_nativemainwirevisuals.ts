import assert from 'node:assert/strict';
import {makeSimWorld} from '../src/sim/arena';
import {SKILLS} from '../src/data/skills';
import {makeSkillInstance} from '../src/engine/skills';
import {serializeSnapshot,applySnapshot,interpolateSnapshot,WIRE_CFG} from '../src/net/snapshot';
import {skillFieldVisual} from '../src/engine/skillFieldVisual';
const originalReach=WIRE_CFG.eyes.zoneReach;WIRE_CFG.eyes.zoneReach=600;
const checks:string[]=[];function check(name:string,fn:()=>void){fn();checks.push(name);console.log('PASS '+name);}
const host=makeSimWorld('warrior',98281),peer=makeSimWorld('warrior',98282);host.actors=[host.player];peer.clientSeatId=host.localSeat.id;
host.executeSkill(host.player,makeSkillInstance(SKILLS.consecration),host.player.pos);assert(host.zones.length);const template=host.zones[0];
function field(x=host.player.pos.x,y=host.player.pos.y){return {...template,pos:{x,y},follow:false,anchor:undefined,delay:1,delay0:2,exploded:false,tier:0};}
check('one filtered field payload preserves identity and own hotbar state',()=>{
 const near=field(),far=field(host.player.pos.x+100000),enemy=host.createMonster('skeleton_warrior',5,'enemy');host.actors.push(enemy);const hostile={...field(),caster:enemy,inst:makeSkillInstance(SKILLS.toxic_cloud)};
 near.toggled=true;host.zones=[near,far,hostile];const snap=serializeSnapshot(host,1);assert.equal(snap.skillFields,undefined);assert.equal(snap.zones!.length,2);assert(snap.zones!.some(z=>z.sk==='consecration'&&z.ci===host.player.id&&z.tg===1));assert(snap.zones!.some(z=>z.vi==='toxic_cloud'&&z.sk===undefined));
 applySnapshot(peer,snap);assert.equal(peer.remoteSkillFields!.length,2);assert.deepEqual(peer.remoteSkillFields!.map(z=>z.skillId).sort(),['consecration','toxic_cloud']);for(const paint of peer.remoteSkillFields!)assert(!('caster'in paint)&&!('inst'in paint));assert.equal(peer.zones.find(z=>z.toggled)!.inst.def.id,'consecration');
});
check('near-field cap and keeper exclusion remain authoritative',()=>{
 host.zones=Array.from({length:WIRE_CFG.eyes.zoneMax+9},(_,i)=>field(host.player.pos.x+i));assert.equal(serializeSnapshot(host,2).zones!.length,WIRE_CFG.eyes.zoneMax);
 const previous=host.localSeat.keeper;host.localSeat.keeper={reviveSec:1};try{assert.equal(serializeSnapshot(host,3).zones,undefined);}finally{host.localSeat.keeper=previous;}
});
check('field IDs retain glide after reordering and paint follows every frame',()=>{
 const a=field(800,600),b=field(900,600);host.zones=[a,b];const first=serializeSnapshot(host,4);a.pos.x=840;a.radius+=20;a.delay=.5;b.pos.x=920;host.zones=[b,a];const next=serializeSnapshot(host,5);assert.equal(next.zones![1].id,first.zones![0].id);applySnapshot(peer,next,first,.5);
 const paint=peer.remoteSkillFields![1];assert.equal(paint.pos.x,820);assert.equal(paint.radius,(first.zones![0].r+next.zones![1].r)/2);assert.equal(paint.delay,1-((first.zones![0].fill!+next.zones![1].fill!)/2));interpolateSnapshot(peer,first,next,1);assert.equal(paint.pos.x,840);
});
check('predicted field riders and tether endpoints share real replica bodies',()=>{
 const ride={...field(),follow:true};host.zones=[ride];const snap=serializeSnapshot(host,6);assert.equal(snap.zones![0].ri,host.player.id);snap.tethers=[{ax:1,ay:2,bx:3,by:4,c:'#fff',w:2,ai:host.player.id,bi:-1,voice:'healing_chain',skillId:'consecration',age:.2,fade:.5,fromTier:0,toTier:1}];applySnapshot(peer,snap);peer.player.pos.x+=37;assert.equal(peer.remoteSkillFields![0].pos.x,peer.player.pos.x);const band=peer.remoteSkillTethers![0];assert.equal(band.ax,peer.player.pos.x);assert.equal(band.bx,3);assert.equal(band.by,4);assert.equal(band.voice,'healing_chain');assert.equal(band.skillId,'consecration');assert.equal(band.fade,.5);assert.equal(peer.tethers.length,0);assert(!('owner'in band)&&!('amounts'in band));
});
check('explicit field tier and grounded footprint survive the wire',()=>{
 const z={...field(),tier:2,onGround:['water'],shape:3,arcRad:1.7,edgeFrac:.4};host.player.tier=0;host.zones=[z];const visual=skillFieldVisual(z,host.time);assert.equal(visual.tier,2);const snap=serializeSnapshot(host,7);applySnapshot(peer,snap);const paint=peer.remoteSkillFields![0];assert.equal(paint.tier,2);assert.deepEqual(paint.onGround,['water']);assert.notEqual(paint.onGround,snap.zones![0].og);assert.equal(paint.shape,3);assert.equal(paint.arcRad,1.7);assert.equal(paint.edgeFrac,.4);
});
check('release-arm holds and zero-fuse completion retain their distinct phases',()=>{
 const held={...field(),armed:true,delay:9999},ready={...field(),delay:0,delay0:0};host.zones=[held,ready];let snap=serializeSnapshot(host,8);applySnapshot(peer,snap);assert(peer.remoteSkillFields![0].armed);assert.equal(peer.remoteSkillFields![0].delay,1);assert(!peer.remoteSkillFields![1].armed);assert.equal(peer.remoteSkillFields![1].delay,0);
 held.armed=false;held.delay0=.05;held.delay=.025;snap=serializeSnapshot(host,9);applySnapshot(peer,snap);assert(!peer.remoteSkillFields![0].armed);assert.equal(peer.remoteSkillFields![0].delay,.5);
});
check('projectile identity accompanies retained flight ID and velocity',()=>{
 host.projectiles=[];host.executeSkill(host.player,makeSkillInstance(SKILLS.firebolt),{x:host.player.pos.x+200,y:host.player.pos.y});assert(host.projectiles.length);const snap=serializeSnapshot(host,10),p=snap.projectiles[0];assert.equal(p.skillId,'firebolt');assert.equal(typeof p.id,'number');assert(p.v?.every(Number.isFinite));applySnapshot(peer,snap);assert.equal(peer.projectiles[0].skillVisualId,'firebolt');
});
check('quiet snapshots omit fields and clear all previous paint',()=>{
 host.zones=[];host.tethers=[];host.projectiles=[];const snap=serializeSnapshot(host,11);assert.equal(snap.zones,undefined);assert.equal(snap.skillFields,undefined);assert(!JSON.stringify(snap).includes('"skillFields"'));applySnapshot(peer,snap);assert.deepEqual(peer.remoteSkillFields,[]);assert.deepEqual(peer.remoteSkillTethers,[]);assert.equal(peer.zones.length,0);
});
check('legacy raw paint is copied only without canonical rows',()=>{
 const paint=skillFieldVisual({...field(),onGround:['water']},host.time),snap=serializeSnapshot(host,12);snap.skillFields=[paint];applySnapshot(peer,snap);assert.deepEqual(peer.remoteSkillFields,[paint]);assert.notEqual(peer.remoteSkillFields![0].pos,paint.pos);assert.notEqual(peer.remoteSkillFields![0].onGround,paint.onGround);snap.zones=[];applySnapshot(peer,snap);assert.deepEqual(peer.remoteSkillFields,[]);
});
WIRE_CFG.eyes.zoneReach=originalReach;
console.log('PASS '+checks.length+' native/main wire visual groups');
