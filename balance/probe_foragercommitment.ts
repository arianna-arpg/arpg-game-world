import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { updateAI } from '../src/engine/ai';
import { setSimTap } from '../src/engine/tap';
import { normalizeBrain } from '../src/engine/brain';
import { ENCOUNTER_GROUPS } from '../src/data/encounterGroups';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import type { World } from '../src/engine/world';

const recipe=ENCOUNTER_GROUPS.gnoll_road_foragers, members=recipe.members;
const arrive=(w:World,side=1)=>{
 const m=w.massRuntime!,p=m.journey!.places.find(p=>p.content==='cinderwatch')!,q=m.journey!.local(p),t=side*Math.PI/2;
 w.landPartyAt({x:q.x+Math.cos(t)*420,y:q.y+Math.sin(t)*420});m.update(w,true);
 return {q,t,m,p,group:w.actors.filter(a=>a.encounterGroup?.recipe===recipe.id)};
};
// Prepared approach to the actual generated camp. The hero walks for at most
// two seconds, then holds. No attacks are invented or enemies reseated. Other
// enemies are removed and the hero is invulnerable to isolate group conduct.
const approach=(seed:number,side:number,prior:boolean)=>{
 const restore=seedGlobalRandom(111000+seed);
 recipe.members=prior?members.map(m=>m.monster==='gnoll_prowler'?{...m,tactics:undefined}:m):members;
 try{
  const w=makeSimWorld('magician',seed);w.startWorldMass(seed);const {q,t,group}=arrive(w,side);
  w.player.invulnerable=true;
  for(const a of w.actors)if(a.team==='enemy'&&!group.includes(a)&&!a.passive){a.dead=true;a.life=0;}
  let meleeCasts=0,shots=0,closeFrames=0;
  setSimTap({onCast(a){if(group.includes(a)){if(a.defId==='gnoll_prowler')meleeCasts++;else shots++;}}});
  for(let f=0;f<600;f++){
   const d=Math.hypot(w.player.pos.x-q.x,w.player.pos.y-q.y),go=f<120&&d>210;
   w.applyInputs(new Map([[w.localSeat.id,{dx:go?-Math.cos(t):0,dy:go?-Math.sin(t):0,aim:q,held:[],edge:[]}]]),1/60);
   for(const a of w.actors)updateAI(a,w,1/60);w.update(1/60);
   if(group.some(a=>a.defId==='gnoll_prowler'&&Math.hypot(a.pos.x-w.player.pos.x,a.pos.y-w.player.pos.y)<75))closeFrames++;
  }
  return {meleeCasts,shots,closeSec:closeFrames/60};
 }finally{recipe.members=members;setSimTap(null);restore();}
};
for(const [seed,side] of [[42,1],[451,0],[7108,3]]){
 const before=approach(seed,side,true),after=approach(seed,side,false);
 assert.ok(after.meleeCasts>=before.meleeCasts+4,'native hunters answer with attacks instead of repeated circling');
 assert.ok(after.closeSec>before.closeSec+2,'melee engagement is sustained, not merely one earlier cast');
 assert.ok(after.shots>=1,'the ordinary bone-thrower still contributes');
 console.log('PASS generated camp '+seed+': melee casts '+before.meleeCasts+' → '+after.meleeCasts
  +'; close time '+before.closeSec.toFixed(2)+' → '+after.closeSec.toFixed(2)+' seconds');
}

const restore=seedGlobalRandom(111042);
try{
 const w=makeSimWorld('magician',42);w.startWorldMass(42);const {group,m,p,q}=arrive(w);
 w.landPartyAt({x:q.x,y:q.y+180});m.update(w,true);
 assert.equal(group.length,3);
 for(const a of group){
  const muster=normalizeBrain(a.brain!).base.squad?.muster;
  if(a.defId==='gnoll_prowler')assert.deepEqual(muster,{count:2,radius:380,bloodiedAt:.9,patience:2.2});
  else assert.equal(muster,undefined,'the ranged scavenger gains no no-cast waiting gate');
 }
 const ordinary=w.createMonster('gnoll_prowler',1,'enemy');
 assert.deepEqual(normalizeBrain(ordinary.brain!).base.squad?.muster,{count:3,radius:380,bloodiedAt:.9,patience:6});
 assert.deepEqual(group.map(a=>a.maxLife()),group.map(a=>{
  const b=w.createMonster(a.defId!,a.level,'enemy');return b.maxLife();
 }),'no added life or rarity multiplier');
 const leader=group.find(a=>a.squadLeader)!;w.kill(leader,false,w.player);
 const survivor=group.find(a=>!a.dead)!;survivor.life*=.41;m.update(w,true);
 assert.ok(group.some(a=>!a.dead&&a.aiMoraleUntil>w.time),'leader loss still creates a native scatter opening');
 const rows=(world:World)=>world.actors.filter(a=>!a.dead&&a.encounterGroup?.recipe===recipe.id)
  .map(a=>({def:a.defId,slot:a.encounterGroup!.slot,life:a.life,pos:a.pos,anchor:a.aiAnchor,leader:!!a.squadLeader}))
  .sort((a,b)=>a.slot.localeCompare(b.slot));
 const before=rows(w),saved=serializeCharacter(w),r=makeSimWorld('magician',999);
 assert.ok(applySavedCharacter(r,saved));assert.ok(r.adoptWorldState(saved.world));
 r.startWorldMass(saved.world!.worldmass!.state.run.seed,saved.world!.worldmass);
 assert.deepEqual(rows(r),before,'Continue neither restages nor heals the surviving patrol');
 assert.match(r.massRuntime!.siteActivity(p.id)?.text??'',/Garrison · 2 remaining/);
 console.log('PASS recipe-owned melee wait, unchanged unrelated packs/ranged role/stats, native leader-loss opening and exact wounded Continue');
}finally{setSimTap(null);recipe.members=members;restore();}
