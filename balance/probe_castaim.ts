import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { makeSkillInstance } from '../src/engine/skills';
import { updateCastAim } from '../src/engine/castAim';
import { meleeReachCueOf } from '../src/engine/meleeReach';
import { bodyActionPoseOf } from '../src/engine/bodyAction';
import { castMovementHeld } from '../src/render/vis/castReadout';
import { mod } from '../src/engine/stats';
import { setSimTap } from '../src/engine/tap';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';

assert.equal(SKILLS.cleave.castMove,undefined);
assert.equal(SKILLS.cleave.castAim,undefined);
assert.equal(SKILLS.cleave.useTime,.7);
const restore=seedGlobalRandom(1845);
try {
 for(const hz of [30,60,120]) {
  const w=makeSimWorld('warrior',451),p=w.player;
  w.actors=[p];p.pos={x:600,y:600};
  p.sheet.setSource('qa',[mod('accuracy','override',100000),mod('manaRegen','override',0),mod('manaRegenPct','override',0)]);
  const left=w.createMonster('zombie',1,'enemy'),right=w.createMonster('zombie',1,'enemy');
  left.pos={x:560,y:600};right.pos={x:640,y:600};w.actors.push(left,right);
  const hits:number[]=[];setSimTap({onHit(b,v){if(b===p)hits.push(v.id);}});
  const mana=p.mana,origin={...p.pos},aim={x:800,y:600};
  assert.ok(w.useSkill(p,p.skills[0]!,aim));
  const cs=p.casting!,paid=p.mana;
  assert.ok(paid<mana);assert.equal(castMovementHeld(w,p),true);
  assert.equal(w.useSkill(p,p.skills[2]!,left.pos,true),false,'another skill cannot cancel a committed swing');
  w.applyInputs(new Map([[w.localSeat.id,{dx:1,dy:0,aim:{x:400,y:600},held:[],edge:[]}]]),1/hz);
  assert.deepEqual(p.pos,origin);assert.deepEqual(cs.aim,aim);assert.equal(p.casting,cs);
  assert.equal(p.mana,paid,'moving the cursor pays no second cost');
  const cue=meleeReachCueOf(p)!;
  assert.equal(cue.facing,0);assert.equal(bodyActionPoseOf(p,w.time)!.facing,0);
  const client=makeSimWorld('warrior',452);applySnapshot(client,serializeSnapshot(w,1));
  assert.deepEqual(meleeReachCueOf(client.player),cue);
  for(let f=0;f<hz*2&&p.casting;f++){
   p.aimPos={x:400,y:600};w.moveActor(p,1,0,1/hz);w.update(1/hz);
  }
  assert.equal(p.casting,null);assert.deepEqual(p.pos,origin);
  assert.deepEqual(hits,[right.id],'damage stays in the original arc despite a 180-degree cursor pivot');
  setSimTap(null);
  console.log('PASS '+hz+' Hz planted Cleave, fixed aim, real hit arc, costs, commitment and replica');
 }
 const w=makeSimWorld('warrior',454),p=w.player;w.actors=[p];p.pos={x:600,y:600};
 const start={...p.pos};w.moveActor(p,1,0,.05);const stride=p.pos.x-start.x;p.pos={...start};
 p.sheet.setSource('qa:investment',[mod('castMobility','flat',.25)]);
 assert.ok(w.useSkill(p,p.skills[0]!,{x:800,y:600}));const aim={...p.casting!.aim};
 w.moveActor(p,1,0,.05);assert.ok(Math.abs(p.pos.x-start.x-stride*.25)<1e-7);
 p.aimPos={x:400,y:600};updateCastAim(p);assert.deepEqual(p.casting!.aim,aim);
 assert.equal(castMovementHeld(w,p),false);
 console.log('PASS earned cast-mobility investment still works without granting free aim steering');
 // The generic authoring opt-in remains available; no default Cleave opts in.
 p.casting=null;p.fillResources();const mobile=makeSkillInstance({...SKILLS.cleave,castMove:.35,castAim:'live'});
 assert.ok(w.useSkill(p,mobile,{x:800,y:600}));const cs=p.casting!;
 p.aimPos={x:400,y:600};updateCastAim(p);assert.deepEqual(cs.aim,p.aimPos);assert.notEqual(cs.aim,p.aimPos);
 const locked={...cs.aim};
 for(const mode of ['channel','charge','guard','overcharge','concentration','perfect','timed','multitude'] as const){
  cs.mode=mode;p.aimPos={x:500,y:900};updateCastAim(p);assert.deepEqual(cs.aim,locked);
 }
 cs.mode='cast';cs.lockedAim={x:200,y:200};updateCastAim(p);assert.deepEqual(cs.aim,locked);delete cs.lockedAim;
 p.dead=true;updateCastAim(p);assert.deepEqual(cs.aim,locked);p.dead=false;
 p.aimPos={x:NaN,y:0};updateCastAim(p);assert.deepEqual(cs.aim,locked);
 console.log('PASS explicit authoring opt-in retains finite aim, life, locked-use and mode gates');
} finally {setSimTap(null);restore();}
