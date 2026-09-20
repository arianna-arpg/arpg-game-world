import { strict as assert } from 'node:assert';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { updateAI } from '../src/engine/ai';
import { castRay } from '../src/engine/los';
import { sightCoverClip } from '../src/engine/sightCover';
import { concealmentActive, PERCEPTION_CFG } from '../src/engine/perception';
import { senseReach, WATCH_RUNG } from '../src/engine/watch';
import { watchFanRadius } from '../src/render/vis/watchLayer';
import { SKILLS } from '../src/data/skills';
import { makeSkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import type { Doodad } from '../src/engine/levelgen';
import type { Actor } from '../src/engine/actor';
bootSimEngine();
seedGlobalRandom(0x57ea17);
const v = (x: number, y = 500) => ({ x, y });
const near = (a: number, b: number) => assert.ok(Math.abs(a-b)<1e-6, `${a} != ${b}`);
const rig = (klass = 'rogue') => {
  const w = makeSimWorld(klass, 0x57ea17);
  w.doodads = []; w.markDoodadsChanged(); w.player.pos = v(500);
  w.player.sheet.setSource('probe', [mod('mana','flat',10000),mod('accuracy','flat',100000),mod('critChance','override',0)]);
  w.player.fillResources();
  const e = w.createMonster('zombie', 1, 'enemy');
  e.pos = v(700); e.skills = []; e.facing = Math.PI; e.facingPrev = Math.PI;
  e.sheet.setSource('probe', [mod('life','flat',10000),mod('evasion','override',0),mod('blockChance','override',0)]);
  e.fillResources(); w.actors.push(e);
  return {w,p:w.player,e};
};
type W = ReturnType<typeof makeSimWorld>;
function cast(w: W, id: string, aim = w.player.pos) {
  w.player.casting = null; w.player.useLock = 0; w.player.cooldowns.clear();
  assert.ok(w.useSkill(w.player, makeSkillInstance(SKILLS[id]), aim, true), `cast ${id}`);
  for(let i=0;i<180 && w.player.casting;i++) w.update(1/60);
}
function scan(w: W, e: Actor, dt = 1/60) { e.aiRescanAt = 0; updateAI(e,w,dt); }
function step(w: W, seconds: number) { for(let i=0;i<Math.ceil(seconds*60);i++)w.update(1/60); }
{
  const doodads: Doodad[] = [{kind:'tree',pos:v(500),radius:100}];
  const env = {walk:null,doodadsAt:()=>doodads};
  assert.equal(castRay(env,v(350,550),v(650,550),'sight'),null,'eyes pass under crown');
  assert.ok(castRay(env,v(350),v(650),'sight'),'trunk blocks eyes');
  doodads[0]={kind:'brush',pos:v(500),radius:100};
  assert.equal(castRay(env,v(490),v(520),'sight'),null,'close bodies see through leaves');
  near(castRay(env,v(350),v(650),'sight')!.x,448);
  near(castRay(env,v(650),v(350),'sight')!.x,552);
  assert.equal(castRay(env,v(350),v(650),'shot'),null,'brush is not a projectile wall');
  assert.equal(castRay(env,v(350),v(650),'sight',{from:1.5,to:1.5}),null,'cover stays on its story');
  doodads.push({...doodads[0]});
  near(castRay(env,v(350),v(650),'sight')!.x,448);
  for(const d of doodads)d.felled={at:0,wake:100};
  assert.equal(castRay(env,v(350),v(650),'sight'),null,'felled leaves no longer cover');
  near(sightCoverClip([{from:10,to:30,density:1},{from:60,to:100,density:1}]),88);
  assert.equal(sightCoverClip([{from:10,to:30,density:1}]),Infinity,'shallow leaf margin stays visible');
  doodads.length=0;doodads.push({kind:'wheat',pos:v(500),radius:90});
  assert.equal(castRay(env,v(490),v(520),'sight'),null,'nearby wheat does not blind combatants');
  assert.ok(castRay(env,v(350),v(650),'sight'),'deep wheat breaks sight');
}
console.log('PASS foliage: trunks, optical depth, close sight, reciprocal rays, overlap, gaps, felling, tiers, crops and shots');
{
  const {w,p,e}=rig();
  w.doodads=[{kind:'forest_oak',pos:v(600,450),radius:100}];w.markDoodadsChanged();
  step(w,.2); e.facing = Math.PI; e.facingPrev = Math.PI; scan(w,e);
  assert.equal(p.sheet.get('detectability'),1); assert.equal(e.aiTargetId,p.id,'forest crown permits combat');
  w.doodads=[{kind:'brush',pos:v(600),radius:90}];w.markDoodadsChanged();step(w,.4);scan(w,e);
  assert.equal(e.aiTargetId,undefined,'cover drops combat lock');
  const remembered={...e.alertFrom!}; assert.ok(e.alertUntil>w.time);
  p.pos=v(420,650);step(w,.15);scan(w,e);
  assert.deepEqual(e.alertFrom,remembered,'search cannot track hidden movement');
  assert.equal(e.aiTargetRef,undefined);
}
console.log('PASS forest combat and foliage loss: no passive stealth; copied last known position');
for(const klass of ['rogue','tamer']) {
  const {w,p,e}=rig(klass); e.pos=v(700);e.facing=0;e.facingPrev=0;p.pos=v(655);
  cast(w,'cloak'); assert.ok(concealmentActive(p,w.time));
  scan(w,e);assert.equal(e.aiTargetId,undefined,`${klass} approaches zombie from behind`);
  const before=e.life;cast(w,'backstab',e.pos);
  assert.ok(e.life<before,'backstab lands');assert.ok(p.buffs.has('cloak'),'base cloak remains available after a strike');
  assert.ok(!concealmentActive(p,w.time),'attack exposes concealment');
  e.facing=Math.PI;scan(w,e);assert.equal(e.aiTargetId,p.id,'exposed attacker can be fought');
  // Move outside the narrowed frontal detection reach before cloak returns.
  p.pos=v(200);step(w,PERCEPTION_CFG.exposureSec+.1);scan(w,e);
  assert.ok(concealmentActive(p,w.time));assert.equal(e.aiTargetId,undefined);
}
console.log('PASS Rogue and Tamer: cloak approach, backstab, exposure, enemy response and escape');
{
  const {w,p,e}=rig(); e.brain={type:'basic',perception:{memory:2}};
  scan(w,e);assert.equal(e.aiTargetId,p.id);const last={...e.aiLastSeen!};
  cast(w,'invisibility');scan(w,e);assert.equal(e.aiTargetId,undefined);assert.deepEqual(e.alertFrom,last);
  p.pos=v(400,800);e.pos={...last};const facing=e.facing;
  scan(w,e,.1);assert.notEqual(e.facing,facing,'arrived search turns visibly');
  assert.deepEqual(e.alertFrom,last,'looking around does not erase search prematurely');
  w.time=e.alertUntil+.01;scan(w,e);assert.equal(e.alertFrom,null,'finite search expires');
}
{
  const {w,p,e}=rig(); e.brain={type:'basic',target:{relentless:true}};
  scan(w,e);assert.equal(e.aiTargetId,p.id);
  w.doodads=[{kind:'brush',pos:v(600),radius:100}];w.markDoodadsChanged();step(w,.4);scan(w,e);
  assert.equal(e.aiTargetId,undefined,'relentless is persistence, not x-ray tracking');
  e.brain={type:'basic',perception:{xray:true}};scan(w,e);assert.equal(e.aiTargetId,p.id,'authored xray remains available');
  cast(w,'invisibility');scan(w,e);assert.equal(e.aiTargetId,undefined,'xray does not reveal invisibility');
}
console.log('PASS invisibility, finite search, relentless pursuit and explicit xray');
{
  const {w,p,e}=rig();cast(w,'stealth');assert.equal(p.charges.get('stealth'),3);
  p.pos=v(655);e.facing=0;cast(w,'backstab',e.pos);
  assert.equal(p.charges.get('stealth'),2);assert.ok(!concealmentActive(p,w.time));
  step(w,1.4);assert.ok(concealmentActive(p,w.time));
  cast(w,'invisibility');cast(w,'backstab',e.pos);assert.equal(p.sheet.get('invisible'),0);
}
{
  const {w,p,e}=rig();cast(w,'cloak');e.pos=v(550);e.facing=0;e.watch={fan:'show'};
  e.brain={type:'basic',perception:{arcDeg:90,rearMul:.3}};e.alertUntil=w.time+5;
  scan(w,e);assert.equal(e.aiTargetId,undefined,'alert retains concealed rear opening');
  const rear=watchFanRadius(w,e,Math.PI,p.sheet.get('detectability'),true);
  near(rear,senseReach(e.senseDetect,1,true,true,false,e.senseRearMul));
  p.concealmentExposedUntil=w.time+1;
  const snap=serializeSnapshot(w,1);const client=makeSimWorld('rogue',0x57ea18);applySnapshot(client,snap);
  const wire=client.actors.find(a=>a.id===p.id) ?? client.player;
  assert.equal(wire.sheet.get('concealment'),1);assert.equal(wire.concealmentExposedUntil,p.concealmentExposedUntil);
  assert.ok(!concealmentActive(wire,w.time));
}
console.log('PASS charges, offensive invisibility break, alerted rear opening, truthful fan and co-op concealment');
{
  const {w,p,e}=rig();
  w.doodads=[{kind:'brush',pos:v(600),radius:100}];w.markDoodadsChanged();
  const life=e.life;cast(w,'firebolt',e.pos);
  const flight=w.projectiles.find(p=>p.caster===w.player);assert.ok(flight,'shot launched');
  const origin={...flight.origin};p.pos=v(400,850);step(w,1);
  assert.ok(e.life<life,'shots pass through foliage');
  assert.ok(e.alertUntil>w.time,'ordinary wounded mind investigates');
  assert.deepEqual(e.alertFrom,origin,'projectile evidence uses launch point, not hidden caster position');
  scan(w,e);assert.equal(e.aiTargetId,undefined);assert.deepEqual(e.alertFrom,origin);
}
{
  const {w,p,e}=rig();e.watch={fan:'show'};e.brain={type:'basic'};
  e.aiTargetId=p.id;e.aiTargetRef=p;e.aiLastSeen={...p.pos};e.aggroed=true;
  cast(w,'invisibility');scan(w,e);
  assert.equal(e.watchRung,WATCH_RUNG.search);assert.equal(e.aggroed,false,'lost watcher no longer reports a lock');
}
{
  const {w,p,e}=rig();p.pos=v(655);e.facing=0;e.facingPrev=0;cast(w,'cloak');
  e.sheet.setSource('probe_armor',[mod('armor','override',0)]);
  const damage=()=>{
    e.life=e.maxLife();e.es=0;e.alertUntil=0;p.useLock=0;p.casting=null;p.cooldowns.clear();
    const restore=seedGlobalRandom(1234), life=e.life;
    assert.ok(w.useSkill(p,makeSkillInstance({...SKILLS.backstab,id:'probe_ambush',useTime:0,
      tags:['spell','physical'],baseDamage:{physical:[100,100]},effects:[{type:'damage'}]}),e.pos,true));
    restore();return life-e.life;
  };
  const hidden=damage();p.removeBuff('cloak');const plain=damage();near(hidden/plain,1.3);
}
console.log('PASS hidden projectile launch evidence, watch search rung and ordinary Cloak ambush bonus');
console.log('PASS stealth perception regression');
