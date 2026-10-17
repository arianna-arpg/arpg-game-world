import assert from 'node:assert/strict';
import {makeSimWorld} from '../src/sim/arena';
import {seedGlobalRandom} from '../src/sim/rng';
import {SKILLS} from '../src/data/skills';
import {makeSkillInstance} from '../src/engine/skills';
import {mod} from '../src/engine/stats';
import {angleTo,angleDiff} from '../src/core/math';
const restore=seedGlobalRandom(6641);
try {
 for(const delay of [0,.15])for(let heading=0;heading<8;heading++) {
  const w=makeSimWorld('rogue',42),p=w.player;w.doodads=[];w.markDoodadsChanged();
  const foe=w.createMonster('zombie',1,'enemy');foe.pos={x:800,y:800};foe.facing=heading*Math.PI/4;foe.facingPrev=foe.facing;
  foe.skills=[];foe.brain=undefined;w.actors=[p,foe];p.pos={x:800+Math.cos(foe.facing)*140,y:800+Math.sin(foe.facing)*140};
  p.facingPrev=p.facing=angleTo(p.pos,foe.pos);
  const blink=makeSkillInstance({...SKILLS.shadow_step,delivery:{type:'blink',range:500,behindTarget:true,...(delay?{delay}:{})}});
  assert.ok(w.useSkill(p,blink,foe.pos));
  if(delay)(w as unknown as {updatePendingBlinks(dt:number):void}).updatePendingBlinks(delay);
  assert.ok(Math.abs(angleDiff(p.facing,angleTo(p.pos,foe.pos)))<1e-8);
  assert.equal(p.facingPrev,p.facing,'arrival turn cannot be capped back toward the previous heading');
  assert.ok(Math.abs(angleDiff(foe.facing,angleTo(foe.pos,p.pos)))>2);
  p.useLock=0;p.casting=null;p.sheet.setSource('test',[mod('accuracy','override',100000),mod('critChance','override',0)]);
  foe.sheet.setSource('test',[mod('life','override',100000),mod('evasion','override',0),mod('blockChance','override',0),mod('armor','override',0)]);foe.fillResources();
  const stab=makeSkillInstance(SKILLS.backstab),aim={...foe.pos};
  const damage=()=>{foe.life=foe.maxLife();foe.es=0;const before=foe.life;const r=seedGlobalRandom(1234);w.executeSkill(p,stab,aim);r();return before-foe.life;};
  const rear=damage();foe.facing=angleTo(foe.pos,p.pos);const front=damage();
  assert.ok(front>0&&Math.abs(rear/front-SKILLS.backstab.backstabMult!)<1e-6,'immediate native Backstab receives its full rear damage multiplier');
 }
 console.log('PASS immediate/delayed behind-target arrivals face the victim in eight headings and enable a real rear Backstab');
}finally{restore();}
