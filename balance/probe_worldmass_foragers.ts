import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { nativeMassEncounters, validateMassEncounters } from '../src/worldmass/encounters';
import { canonical } from '../src/worldmass/random';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { encounterGroupPool, planEncounterGroup } from '../src/engine/encounterGroups';
import { updateAI } from '../src/engine/ai';
import { setSimTap } from '../src/engine/tap';
import type { World } from '../src/engine/world';
const recipe='gnoll_road_foragers';
const arrive=(w:World)=>{
 const m=w.massRuntime!,p=m.journey!.places.find(p=>p.content==='cinderwatch')!;
 w.landPartyAt(m.journey!.local(p));m.update(w,true);
 return {m,p,group:w.actors.filter(a=>a.encounterGroup?.recipe===recipe)};
};
const resume=(w:World)=>{
 const saved=serializeCharacter(w),r=makeSimWorld('warrior',8761);
 assert.ok(applySavedCharacter(r,saved));assert.ok(r.adoptWorldState(saved.world));
 r.startWorldMass(saved.world!.worldmass!.state.run.seed,saved.world!.worldmass);return r;
};
const restore=seedGlobalRandom(104042);
try{
 const q={level:1,faction:'gnoll',tileset:'downs',biome:'downs',place:'surface' as const,story:0};
 assert.ok(!encounterGroupPool(q).some(r=>r.id===recipe),'authored patrol does not enter ambient pools');
 assert.equal(planEncounterGroup(recipe,q).length,3);
 assert.equal(nativeMassEncounters('downs','downs',1),undefined);
 assert.equal(nativeMassEncounters('downs','downs',1,false),undefined);
 assert.equal(nativeMassEncounters('tundra','tundra',1,{chance:1,table:[{id:recipe,weight:1}]}),undefined);
 const authored=nativeMassEncounters('downs','downs',1,{chance:1,table:[{id:recipe,weight:1}]})!;
 validateMassEncounters(authored,1);
 assert.ok(authored.plans.every(p=>p.recipe===recipe&&p.seats.length===3));
 console.log('PASS explicit native selection retains level/habitat/role gates and leaves default ambient pools unchanged');
 for(const seed of [1,42,451,7108,99871]){
  const w=makeSimWorld('warrior',seed);w.startWorldMass(seed);const {m,p,group}=arrive(w);
  assert.equal(group.length,3,'full patrol at seed '+seed);
  assert.deepEqual(group.map(a=>a.defId).sort(),['gnoll_prowler','gnoll_prowler','gnoll_bonepicker'].sort());
  assert.equal(group.filter(a=>a.squadLeader).length,1);assert.equal(new Set(group.map(a=>a.squadId)).size,1);
  assert.ok(group.every(a=>a.level===1&&(a.rarity??'normal')==='normal'&&!w.pointInSolid(a.pos.x,a.pos.y,a.radius)));
  assert.ok(w.chests.some(c=>c.rewardSource===canonical([p.id,'cache'])));
  assert.ok(m.population<=96);assert.match(m.localSite(w.player.pos)?.activity?.text??'',/Garrison · 3 remaining/);
 }
 console.log('PASS five native camp admissions contain three ordinary coherent bodies, a leader, collision-free seats and a complete garrison');
 const w=makeSimWorld('warrior',42);w.startWorldMass(42);const {m,p,group}=arrive(w);
 const leader=group.find(a=>a.squadLeader)!,scavenger=group.find(a=>a.defId==='gnoll_bonepicker')!;
 w.kill(leader,false,w.player);
 assert.ok(scavenger.aiMoraleUntil>w.time,'native leader casualty breaks borrowed courage');
 scavenger.life=scavenger.maxLife()*.41;m.update(w,true);
 const records=(world:World)=>world.actors.filter(a=>!a.dead&&a.encounterGroup?.recipe===recipe).map(a=>({
   def:a.defId,name:a.name,life:a.life,max:a.maxLife(),pos:a.pos,anchor:a.aiAnchor,slot:a.encounterGroup!.slot,leader:!!a.squadLeader,
 })).sort((a,b)=>a.slot.localeCompare(b.slot));
 const before=records(w),re=resume(w);assert.deepEqual(records(re),before);
 assert.equal(re.actors.filter(a=>!a.dead&&a.encounterGroup?.recipe===recipe).length,2);
 assert.match(re.massRuntime!.localSite(re.player.pos)?.activity?.text??'',/Garrison · 2 remaining/);
 for(const a of re.actors.filter(a=>!a.dead&&a.encounterGroup?.recipe===recipe))re.kill(a,false,re.player);
 re.massRuntime!.update(re,true);assert.ok(re.massRuntime!.state.claimed('site-cleared',p.id));
 const xp=re.meta.xp;re.massRuntime!.update(re,true);assert.equal(re.meta.xp,xp);
 console.log('PASS native leader-loss morale, exact wounded roles/positions through Continue, full-garrison clearance and once-only payment');
 const live=makeSimWorld('warrior',42);live.startWorldMass(42);const battle=arrive(live),casts=new Set<string>();
 live.player.invulnerable=true;
 setSimTap({onCast(a,s){if(battle.group.includes(a))casts.add(s.def.id);}});
 for(let i=0;i<900;i++){for(const a of live.actors)updateAI(a,live,1/60);live.update(1/60);}
 setSimTap(null);
 assert.ok(casts.has('hurl_debris'),'bonepicker actually uses its ranged kit');
 assert.ok(casts.has('claw')||casts.has('rend'),'prowlers actually engage at melee range');
 console.log('PASS native AI actually delivers distinct melee and thrown attacks: '+[...casts].join(', '));
 const blocked=makeSimWorld('warrior',42),delayed=structuredClone(massAdventure()) as MassAdventure;
 delayed.populationRadius=300;new WorldMassRuntime(42,'delayed-patrol',delayed).attach(blocked);
 const bm=blocked.massRuntime!,bp=bm.journey!.places.find(p=>p.content==='cinderwatch')!,find=blocked.findFreeSpot;
 blocked.findFreeSpot=()=>({x:1e8,y:1e8});blocked.player.pos=bm.journey!.local(bp);bm.update(blocked,true);
 assert.ok(!blocked.actors.some(a=>a.encounterGroup?.recipe===recipe));assert.ok(!blocked.chests.some(c=>c.rewardSource===canonical([bp.id,'cache'])));
 blocked.findFreeSpot=find;bm.update(blocked,true);assert.equal(blocked.actors.filter(a=>a.encounterGroup?.recipe===recipe).length,3);
 const legacy=structuredClone(massAdventure()) as MassAdventure,c=legacy.content.find(c=>c.id==='cinderwatch')!;
 delete c.encounters;c.count=2;
 const old=makeSimWorld('warrior',42);new WorldMassRuntime(42,'legacy-camp',legacy).attach(old);arrive(old);
 const oldAgain=resume(old);assert.ok(!oldAgain.actors.some(a=>a.encounterGroup?.recipe===recipe));
 assert.equal(oldAgain.massRuntime!.config.content.find(c=>c.id==='cinderwatch')!.count,2);
 console.log('PASS blocked placement admits no partial patrol or cache, retry admits all roles, and omitted legacy rosters stay unchanged');
}finally{setSimTap(null);restore();}
