import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { makeSkillInstance, type SkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { meleeReachCueOf } from '../src/engine/meleeReach';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';

const restore=seedGlobalRandom(87264);
function setup(){
 const w=makeSimWorld('rogue',71),p=w.player,e=w.createMonster('zombie',1,'enemy');
 w.actors=[p,e];p.pos={x:500,y:500};e.pos={x:530,y:500};e.facing=0;p.facing=0;
 for(const a of [p,e]){
  a.sheet.setSource('qa/constant-combat',[
   ...['armor','evasion','blockChance','critChance','lifeRegen','energyShield','endurance','poise'].map(s=>mod(s,'override',0)),
   mod('life','override',10000),mod('mana','override',10000),mod('accuracy','override',100000),
   mod('damage','override',1),mod('damageTaken','override',1),
  ]);a.fillResources();a.skills=[];a.casting=null;
 }
 const inst=makeSkillInstance({...SKILLS.backstab,requirements:undefined,manaCost:0,
  baseDamage:{physical:[40,40]},effects:[{type:'damage'}],innateMods:[mod('critChance','override',0)]});
 return {w,p,e,inst};
}
const rear=(w:ReturnType<typeof setup>['w'])=>w.flashes.filter(f=>f.combatCue?.style==='rear_hit');
let frontDamage=0;
for(const kind of ['front','rear','immune','evaded','blocked','zero','disabled','override'] as const){
 const {w,p,e,inst}=setup();
 if(kind==='front')e.facing=Math.PI;
 if(kind==='immune')e.invulnerable=true;
 if(kind==='evaded')e.sheet.setSource('qa/refusal',[mod('hitImmune','override',1)]);
 if(kind==='blocked')e.sheet.setSource('qa/refusal',[mod('blockChance','override',1)]);
 if(kind==='zero')p.sheet.setSource('qa/converted-hit',[mod('hitToAffliction','override',1)]);
 if(kind==='disabled')inst.def={...inst.def,backstabCue:false};
 if(kind==='override')inst.def={...inst.def,backstabCue:'perfect'};
 const life=e.life;
 (w as unknown as {resolveHit(c:typeof p,i:SkillInstance,t:typeof e):void}).resolveHit(p,inst,e);
 const damage=life-e.life;
 if(kind==='front'){assert.ok(damage>0);frontDamage=damage;}
 if(kind==='rear'){
  assert.equal(damage,frontDamage*2.5);assert.equal(rear(w).length,1);
  assert.deepEqual(rear(w)[0].pos,e.pos);assert.equal(rear(w)[0].combatCue!.facing,Math.PI);
  const c=makeSimWorld('rogue',72);applySnapshot(c,serializeSnapshot(w,1));
  assert.deepEqual(rear(c)[0].combatCue,rear(w)[0].combatCue);
 }else assert.equal(rear(w).length,0,kind+' must not emit a rear-hit success');
 if(['immune','evaded','zero'].includes(kind))assert.equal(damage,0,kind);
 if(kind==='blocked'){assert.ok(damage>=0&&damage<frontDamage*2.5);assert.ok(w.flashes.some(f=>f.defenseCue?.kind==='guard'));}
 if(kind==='disabled'||kind==='override')assert.equal(damage,frontDamage*2.5);
 if(kind==='override')assert.ok(w.flashes.some(f=>f.combatCue?.style==='perfect'));
 assert.ok(!w.texts.some(t=>t.text==='backstab!'),'legacy caption must not promise a refused hit');
}
console.log('PASS positional multiplier unchanged; cue only on landed rear wounds, refusals/silence/override and native mirror');

for(const scale of [.5,1,1.8]){
 for(const where of ['inside','outside','arc-in','arc-out'] as const){
  const {w,p,e,inst}=setup();
  p.sheet.setSource('qa/reach',[mod('meleeReach','override',scale),mod('swingArc','override',.8),mod('aoeRadius','override',1.44)]);
  assert.ok(w.useSkill(p,inst,{x:700,y:500}));const q=meleeReachCueOf(p)!;assert.ok(q);
  const angle=where==='arc-in'?q.arc/2-.001:where==='arc-out'?q.arc/2+.001:0;
  const distance=where==='inside'?q.reach+e.radius-.001:where==='outside'?q.reach+e.radius+.001:q.reach*.6;
  e.pos={x:p.pos.x+Math.cos(angle)*distance,y:p.pos.y+Math.sin(angle)*distance};
  const state=JSON.stringify([p.pos,p.mana,p.casting?.elapsed,w.time]);assert.deepEqual(meleeReachCueOf(p),q);
  assert.equal(state,JSON.stringify([p.pos,p.mana,p.casting?.elapsed,w.time]));
  const life=e.life;w.executeSkill(p,inst,{x:700,y:500});
  assert.equal(e.life<life,where==='inside'||where==='arc-in',scale+' '+where);
 }
}
console.log('PASS drawn direct-melee radial/angular boundaries match native hits across live reach/area/arc modifiers');

{
 const {w,p,inst}=setup();assert.ok(w.useSkill(p,inst,{x:700,y:600}));
 inst.def={...inst.def,innateMods:[...inst.def.innateMods!,mod('meleeReach','more',.4)]};
 const read=meleeReachCueOf(p);assert.ok(read);const c=makeSimWorld('rogue',73),s=serializeSnapshot(w,1);
 applySnapshot(c,s);assert.deepEqual(meleeReachCueOf(c.player),read);
 for(const a of s.actors)if(a.cast)delete a.cast.meleeReach;
 applySnapshot(c,s);assert.equal(meleeReachCueOf(c.player),undefined,'old wire clears an earlier read');
 const cs=p.casting!,original=inst.def;
 inst.def={...original,reachCue:false};assert.equal(meleeReachCueOf(p),undefined);inst.def=original;
 cs.mode='channel';assert.equal(meleeReachCueOf(p),undefined);cs.mode='cast';
 p.sheet.setSource('qa/sweep',[mod('meleeSweep','override',1)]);assert.equal(meleeReachCueOf(p),undefined);p.sheet.removeSource('qa/sweep');
 cs.targetInfo={};assert.equal(meleeReachCueOf(p),undefined);delete cs.targetInfo;
 cs.plantTotem=true;assert.equal(meleeReachCueOf(p),undefined);delete cs.plantTotem;
 p.dead=true;assert.equal(meleeReachCueOf(p),undefined);p.dead=false;
 p.casting=null;assert.equal(meleeReachCueOf(p),undefined);
 applySnapshot(c,serializeSnapshot(w,2));assert.equal(meleeReachCueOf(c.player),undefined);
}
console.log('PASS host-resolved skill-local geometry, old-wire clearing, cancellation and unsupported-mode/skill opt-outs');
restore();
