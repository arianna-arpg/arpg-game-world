import assert from 'node:assert/strict';
import {makeSimWorld} from '../src/sim/arena';
import {seedGlobalRandom} from '../src/sim/rng';
import {updateAI} from '../src/engine/ai';
import {WorldMassRuntime} from '../src/worldmass/runtime';
import {massAdventure} from '../src/worldmass/preset';
import {makeSkillInstance} from '../src/engine/skills';
import {SKILLS} from '../src/data/skills';
import {mod} from '../src/engine/stats';

const restore=seedGlobalRandom(73617);
const rig=(cover=true)=>{
 seedGlobalRandom(73617);
 const w=makeSimWorld('warrior',73617),c=structuredClone(massAdventure());
 delete c.settlement;delete c.journey;delete c.progression;delete c.ecology;
 delete c.terrain.patches;
 c.terrain.fields=[];c.terrain.places=[];c.content=[];c.populationRadius=0;c.startRadius=0;c.maxPopulation=0;
 c.terrain.surfaces=[{id:'floor',source:'qa/lane',priority:0,when:[],region:'ground',biome:'downs',color:'#454b32'}];
 const m=new WorldMassRuntime(42,'lane-inspection',c);m.attach(w);
 w.landPartyAt({x:-4016,y:-4016});m.update(w,true);w.actors=[w.player];w.player.invulnerable=true;
 if(cover)m.state.paint({address:m.walk.at(-3910,-4016),region:'arena_stands',color:'#7a6a4c',cause:'qa/cover'});
 m.update(w,true);
 const a=w.createMonster('karst_slinger',4,'enemy');a.pos={x:-3816,y:-4016};a.facing=Math.PI;a.fillResources();a.alertUntil=99;w.actors.push(a);
 const initial={...a.pos},casts:{id:string;clear:boolean}[]=[],use=w.useSkill.bind(w);
 w.useSkill=(...args)=>{const ok=use(...args);if(ok&&args[0]===a)casts.push({id:args[1].def.id,clear:w.lineOfFire(a.pos,w.player.pos,a.tier)});return ok;};
 const tick=(seconds=8,hz=60)=>{for(let i=0;i<seconds*hz;i++){updateAI(a,w,1/hz);w.update(1/hz);}};
 const travel=()=>Math.hypot(a.pos.x-initial.x,a.pos.y-initial.y);
 assert.ok(w.lineOfSight(a.pos,w.player.pos,a.tier,w.player.tier));
 assert.equal(w.lineOfFire(a.pos,w.player.pos,a.tier),!cover);
 return {w,a,casts,tick,travel};
};
try{
 for(const hz of [30,60,120]){
  const q=rig();q.tick(8,hz);
  assert.ok(q.travel()>20,'native shooter moves around visible shot-blocking terrain: '+JSON.stringify({travel:q.travel(),casts:q.casts,target:q.a.aiTargetId,pos:q.a.pos,phase:q.a.aiPhase}));
  assert.ok(q.casts.length&&q.casts.every(c=>c.clear),'native projectile casts only once a physical firing lane opens');
  assert.equal(q.a.aiTargetId,q.w.player.id);
  assert.ok(!q.w.pointInSolid(q.a.pos.x,q.a.pos.y,q.a.radius));
  console.log('PASS '+hz+'Hz native shooter opens a legal firing lane and resumes real attacks');
 }
 const clear=rig(false);clear.tick(3);assert.ok(clear.casts.length);assert.equal(clear.travel(),0);
 console.log('PASS an already-open lane retains native planted firing');
 const opt=rig();opt.a.brain={...opt.a.brain,move:{style:'approach',losSeek:false}};opt.tick();
 assert.equal(opt.travel(),0);assert.equal(opt.casts.length,0);
 console.log('PASS explicit movement policy can keep a ranged body planted');
 const explicit=rig();explicit.a.brain={...explicit.a.brain,move:{style:'approach',losSeek:true}};explicit.tick();
 assert.ok(explicit.travel()>20&&explicit.casts.length);
 console.log('PASS authored lane-seeking uses the shot channel as well as implicit grid conduct');
 const free=rig();free.a.skills=[makeSkillInstance(SKILLS.meteor,4)];free.tick(3);
 assert.equal(free.travel(),0);assert.ok(free.casts.length&&free.casts.every(c=>c.id==='meteor'&&!c.clear));
 const mixed=rig();mixed.a.skills.push(makeSkillInstance(SKILLS.meteor,4));mixed.tick(3);
 assert.ok(mixed.casts.some(c=>c.id==='meteor'&&!c.clear),'the mixed kit casts its native free answer while the shot lane is blocked');
 assert.ok(mixed.casts.every(c=>c.id==='meteor'||c.clear),'ordinary projectiles still require their own lane');
 console.log('PASS native celestial casts remain usable from cover in both free-only and mixed kits');
 const banned=rig();banned.a.skills.push(makeSkillInstance(SKILLS.meteor,4));banned.a.aiSkillBans=new Set(['meteor']);banned.tick();
 assert.ok(banned.travel()>20&&banned.casts.length);assert.ok(banned.casts.every(c=>c.id!=='meteor'&&c.clear));
 console.log('PASS a banned free answer cannot stall the remaining native ranged kit');
 const phase=rig();phase.a.sheet.setSource('qa/phase',[mod('phasing','flat',1)]);phase.tick(3);
 assert.equal(phase.travel(),0);assert.ok(phase.casts.length&&phase.casts.every(c=>!c.clear));
 console.log('PASS actual phasing projectile policy preserves firing through cover');
}finally{restore();}
