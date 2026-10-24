import assert from 'node:assert/strict';
import {makeSimWorld} from '../src/sim/arena';
import {seedGlobalRandom} from '../src/sim/rng';
import {rollSkillDamage} from '../src/engine/damage';
import {mod, type SkillTag} from '../src/engine/stats';
import {recentWindow} from '../src/engine/recency';

const restore=seedGlobalRandom(71625),tags=new Set<SkillTag>(['melee']);
function rig() {
 const w=makeSimWorld('warrior',91),p=w.player;w.meta.passivePoints=1;
 assert.ok(w.allocateNode('route_str_pursuit_counter'));assert.equal(w.meta.passivePoints,0);
 const foe=w.createMonster('plains_wolf',1,'enemy');
 foe.pos={x:p.pos.x+60,y:p.pos.y};foe.aiCooldown=999;w.actors.push(foe);
 p.facing=0;const guard=p.skills.find(s=>s?.def.id==='shield_up')!;
 assert.ok(w.useSkill(p,guard,foe.pos));p.updateTimers(0);
 return {w,p,foe,guard};
}
function roll(p:ReturnType<typeof rig>['p']) {
 const unseed=seedGlobalRandom(401);
 try{return rollSkillDamage(p,p.skills.find(s=>s?.def.id==='cleave')!).amounts.physical!;}
 finally{unseed();}
}
try{
 for(const parry of [false,true]) {
  const {w,p,foe}=rig();
  if(parry)p.sheet.setSource('probe-parry',[mod('guardParry','flat',1)]);
  const before=p.sheet.get('damage',tags),packetBefore=roll(p),life=p.life,shield=p.casting!.shield!;
  assert.equal(p.recently('block'),false);
  // Exercise the native hit resolver, not a manually stamped event.
  (w as any).resolveHit(foe,foe.skills[0],p);
  assert.equal(p.life,life);assert.ok(p.recently('block'));
  if(parry)assert.equal(p.casting!.shield,shield,'native opening parry costs no shield');
  else assert.ok(p.casting!.shield!<shield,'ordinary guard pays shield capacity');
  p.updateTimers(0);
  assert.ok(Math.abs(p.sheet.get('damage',tags)-before-.16)<1e-8);
  assert.ok(Math.abs(roll(p)/packetBefore-(before+.16)/before)<1e-8,
   'the actual native Cleave packet receives the earned conditional modifier');
  p.updateTimers(recentWindow('block')+.01);p.updateTimers(0);
  assert.equal(p.recently('block'),false);assert.equal(p.sheet.get('damage',tags),before);
  console.log('PASS '+(parry?'parry':'guard')+' interception activates earned counterattack damage, then expires on the native window');
 }
 for(const refusal of ['rear','empty','lowered']) {
  const {w,p,foe}=rig();
  if(refusal==='rear')foe.pos.x=p.pos.x-60;
  if(refusal==='empty')p.casting!.shield=0;
  if(refusal==='lowered')p.casting=null;
  assert.equal((w as any).tryGuardBlock(p,foe,foe.pos,10),false);
  assert.equal(p.recently('block'),false);
 }
 console.log('PASS rear, depleted and lowered guards do not grant a block event');
 {
  const {w,p,foe}=rig();p.sheet.setSource('probe-aegis',[mod('guardAegis','flat',1)]);
  const ally=w.createMonster('plains_wolf',1,'player');ally.owner=p;
  ally.pos={x:p.pos.x+20,y:p.pos.y};w.actors.push(ally);
  assert.equal((w as any).tryGuardBlock(ally,foe,foe.pos,10),true);
  assert.ok(p.recently('block'));assert.equal(ally.recently('block'),false);
  assert.equal(foe.recently('block'),false);
 }
 console.log('PASS an ally interception credits the actual guarding owner only');
 {
  const {w,p,foe}=rig();assert.equal((w as any).tryGuardBlock(p,foe,foe.pos,10000),true);
  assert.equal(p.casting,null);assert.ok(p.recently('block'),'a shield-breaking interception was still a made block');
 }
 console.log('PASS a fully absorbed shield-breaking hit retains its made-block event');
}finally{restore();}
