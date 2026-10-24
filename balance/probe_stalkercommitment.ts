import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { updateAI } from '../src/engine/ai';
import { setSimTap } from '../src/engine/tap';
import { mod } from '../src/engine/stats';
import { MONSTERS } from '../src/data/monsters';
import { SKILLS } from '../src/data/skills';
import { makeSkillInstance } from '../src/engine/skills';

function encounter(id:string,hz:number,legacy=false){
 const restore=seedGlobalRandom(9142);
 try {
  const w=makeSimWorld('warrior',9142),p=w.player,a=w.createMonster(id,1,'enemy');
  w.actors=[p,a];p.pos={x:600,y:600};a.pos={x:640,y:600};a.aiAnchor={...a.pos};a.facing=Math.PI;p.facing=0;
  p.sheet.setSource('qa:durable',[mod('life','override',100000),mod('evasion','override',0),mod('blockChance','override',0)]);p.fillResources();
  if(legacy){a.brain=structuredClone(a.brain!);delete a.brain.move!.lurkMeleeRange;delete a.brain.skillUse;}
  const casts:{id:string;distance:number}[]=[];let travel=0;
  setSimTap({onCast(b,s){if(b===a)casts.push({id:s.def.id,distance:Math.hypot(a.pos.x-p.pos.x,a.pos.y-p.pos.y)});}});
  for(let frame=0;frame<hz*12;frame++){
   const before={...a.pos};updateAI(a,w,1/hz);w.update(1/hz);travel+=Math.hypot(a.pos.x-before.x,a.pos.y-before.y);
  }
  const close=casts.slice();
  // Break contact: a fresh real gap makes the Thicket's lunge useful again.
  a.casting=null;a.dash=null;a.cooldowns.clear();a.fillResources();
  p.pos={x:a.pos.x-210,y:a.pos.y};p.facing=Math.PI;
  for(let frame=0;frame<hz*6;frame++){updateAI(a,w,1/hz);w.update(1/hz);}
  return {close,all:casts,travel};
 }finally{setSimTap(null);restore();}
}
for(const hz of [30,60,120])for(const id of ['thicket_stalker','marsh_stalker']){
 const now=encounter(id,hz);
 assert.ok(now.close.filter(c=>c.id==='claw').length>=3,id+' actually fights in melee');
 assert.equal(now.close.filter(c=>c.id==='closing_fang').length,0,'no point-blank pounces');
 assert.ok(now.travel<20,id+' holds the close fight instead of crowding through the prey: '+now.travel);
 if(id==='thicket_stalker'){
  const lunges=now.all.filter(c=>c.id==='closing_fang');assert.ok(lunges.length>0,'can still close a real gap');
  assert.ok(lunges.every(c=>c.distance>130),'every native lunge respects its minimum distance');
 }
 console.log('PASS '+hz+' Hz '+id+' close-range attacks and stable feet; ranged approach remains available');
}
const old=encounter('thicket_stalker',60,true);
assert.ok(old.close.some(c=>c.id==='closing_fang'),'historical control reproduces the unwanted point-blank lunge');
console.log('PASS historical Thicket control reproduces melee-range pouncing');
const w=makeSimWorld('warrior',99),p=w.player,a=w.createMonster('thicket_stalker',1,'enemy');
w.actors=[p,a];p.pos={x:600,y:600};a.pos={x:640,y:600};w.devIgnoreSkillAttributes=true;
p.fillResources();assert.ok(w.useSkill(p,makeSkillInstance(SKILLS.closing_fang),a.pos));
assert.equal(MONSTERS.alpha_stalker.brain!.move,undefined,'Alpha Stalker stays unchanged');
console.log('PASS player Closing Fang and unrelated Alpha Stalkers retain their authored behavior');
