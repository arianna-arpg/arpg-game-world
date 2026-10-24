import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { nativeMassEncounters } from '../src/worldmass/encounters';
import { canonical } from '../src/worldmass/random';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { encounterGroupPool } from '../src/engine/encounterGroups';
import { updateAI } from '../src/engine/ai';
import { setSimTap } from '../src/engine/tap';
import { SUPPORTS } from '../src/data/supports';
import { makeSupportGemItem } from '../src/engine/gemitems';
import { mintSupportInstance } from '../src/engine/supportbase';
import { autoPlace } from '../src/engine/inventory';
import type { World } from '../src/engine/world';
const recipe='undead_caravan_watch';
const arrive=(w:World)=>{
 const m=w.massRuntime!,p=m.journey!.places.find(p=>p.content==='caravan-wreck')!;
 w.landPartyAt(m.journey!.local(p));m.update(w,true);
 return {m,p,group:w.actors.filter(a=>a.encounterGroup?.recipe===recipe)};
};
const resume=(w:World)=>{
 const saved=serializeCharacter(w),r=makeSimWorld('magician',8761);
 assert.ok(applySavedCharacter(r,saved));assert.ok(r.adoptWorldState(saved.world));
 r.startWorldMass(saved.world!.worldmass!.state.run.seed,saved.world!.worldmass);return r;
};
const restore=seedGlobalRandom(106042);
try{
 const q={level:2,faction:'undead',tileset:'downs',biome:'downs',place:'surface' as const,story:0};
 assert.ok(!encounterGroupPool(q).some(r=>r.id===recipe));
 assert.equal(nativeMassEncounters('downs','downs',1,{chance:1,table:[{id:recipe,weight:1}]}),undefined);
 assert.equal(nativeMassEncounters('tundra','tundra',2,{chance:1,table:[{id:recipe,weight:1}]}),undefined);
 assert.ok(nativeMassEncounters('downs','downs',2,{chance:1,table:[{id:recipe,weight:1}]}));
 for(const seed of [1,42,451,7108,99871]){
  const w=makeSimWorld('magician',seed);w.startWorldMass(seed);const {m,p,group}=arrive(w);
  assert.deepEqual(group.map(a=>a.defId).sort(),['skeletal_cleric','skeleton_warrior','skeleton_warrior','skeleton_archer'].sort());
  assert.equal(group.filter(a=>a.squadLeader).length,1);assert.equal(new Set(group.map(a=>a.squadId)).size,1);
  assert.ok(group.every(a=>a.level===2&&(a.rarity??'normal')==='normal'&&!w.pointInSolid(a.pos.x,a.pos.y,a.radius)));
  assert.ok(w.chests.some(c=>c.rewardSource===canonical([p.id,'cache'])));
  assert.ok(m.population<=96);assert.match(m.localSite(w.player.pos)?.activity?.text??'',/Garrison · 4 remaining/);
 }
 console.log('PASS explicit native level/habitat gates and five complete, ordinary, collision-free four-role caravan admissions');
 const w=makeSimWorld('magician',42);w.startWorldMass(42);const {m,p,group}=arrive(w);
 const leader=group.find(a=>a.squadLeader)!,warrior=group.find(a=>a.defId==='skeleton_warrior')!;
 warrior.life*=.35;const low=warrior.life,casts=new Set<string>();let healed=0;
 w.player.invulnerable=true;
 setSimTap({onCast(a,s){if(group.includes(a))casts.add(s.def.id);},onHeal(a,n){if(a===warrior)healed+=n;}});
 for(let i=0;i<900;i++){for(const a of w.actors)updateAI(a,w,1/60);w.update(1/60);}
 setSimTap(null);
 assert.ok(casts.has('soothing_touch')&&healed>0&&warrior.life>low,'native mender actually heals a wounded sword');
 assert.ok(casts.has('cleave')&&casts.has('bone_arrow'),'native melee and ranged roles execute');
 console.log('PASS actual AI uses healing, melee and arrows: '+[...casts].join(', ')+'; healed '+healed);
 w.kill(leader,false,w.player);warrior.life=warrior.maxLife()*.41;m.update(w,true);
 const rows=(world:World)=>world.actors.filter(a=>!a.dead&&a.encounterGroup?.recipe===recipe).map(a=>({
   def:a.defId,name:a.name,life:a.life,pos:a.pos,anchor:a.aiAnchor,slot:a.encounterGroup!.slot,leader:!!a.squadLeader,
 })).sort((a,b)=>a.slot.localeCompare(b.slot)||a.pos.x-b.pos.x||a.pos.y-b.pos.y);
 const before=rows(w),re=resume(w);assert.deepEqual(rows(re),before);
 assert.match(re.massRuntime!.localSite(re.player.pos)?.activity?.text??'',/Garrison · 3 remaining/);
 for(const a of re.actors.filter(a=>!a.dead&&a.encounterGroup?.recipe===recipe))re.kill(a,false,re.player);
 re.massRuntime!.update(re,true);assert.ok(re.massRuntime!.state.claimed('site-cleared',p.id));
 const xp=re.meta.xp;re.massRuntime!.update(re,true);assert.equal(re.meta.xp,xp);
 console.log('PASS exact wounded native roles/positions through Continue and full-garrison once-only clearance');
 const shot=(arcing:boolean)=>{
  const undo=seedGlobalRandom(110642),world=makeSimWorld('magician',42);
  try{
   if(arcing){const item=makeSupportGemItem(mintSupportInstance(SUPPORTS.arcing,1));assert.ok(autoPlace(world.meta.items,item));assert.ok(world.socketSupport(item.uid,'firebolt'));}
   world.startWorldMass(42);const {group}=arrive(world);world.player.invulnerable=true;
   const target=group.find(a=>a.defId==='skeleton_warrior')!,hits=new Set<number>();let casts=0;
   // Prepared caster stand; all native targets keep their original admitted seats and live AI.
   for(let i=0;i<32;i++){const t=i*Math.PI/16,pos={x:target.pos.x+Math.cos(t)*145,y:target.pos.y+Math.sin(t)*145};
    if(world.walk!.isWalkable(pos.x,pos.y)&&!world.pointInSolid(pos.x,pos.y,world.player.radius)&&world.lineOfSight(pos,target.pos)){world.landPartyAt(pos);break;}}
   setSimTap({onCast(a,s){if(a===world.player&&s.def.id==='firebolt')casts++;},onHit(a,b,r){if(a===world.player&&group.includes(b)&&r.total>0)hits.add(b.id);}});
   for(let i=0;i<240;i++){world.applyInputs(new Map([[world.localSeat.id,{dx:0,dy:0,aim:target.pos,held:[casts===0],edge:[]}]]),1/60);for(const a of world.actors)updateAI(a,world,1/60);world.update(1/60);}
   assert.equal(casts,1);return hits.size;
  }finally{setSimTap(null);undo();}
 };
 const plain=shot(false),arcing=shot(true);assert.equal(plain,1);assert.ok(arcing>plain);
 console.log('PASS one native Firebolt hits '+plain+' escort without support and '+arcing+' with Arcing; live AI and original enemy seats');
 const legacy=structuredClone(massAdventure()) as MassAdventure,c=legacy.content.find(c=>c.id==='caravan-wreck')!;
 delete c.encounters;c.count=1;c.site!.fixtures.unshift({monster:'skeleton_archer',x:70,y:-70,garrison:true});
 const old=makeSimWorld('magician',42);new WorldMassRuntime(42,'legacy-caravan',legacy).attach(old);arrive(old);
 const oldAgain=resume(old);assert.ok(!oldAgain.actors.some(a=>a.encounterGroup?.recipe===recipe));
 assert.equal(oldAgain.massRuntime!.config.content.find(c=>c.id==='caravan-wreck')!.count,1);
 console.log('PASS continued prior roster does not gain new formation members');
}finally{setSimTap(null);restore();}
