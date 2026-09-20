import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { ENCOUNTER_GROUPS } from '../src/data/encounterGroups';
import { ENCOUNTER_TACTICS } from '../src/data/encounterTactics';
import { TACTICAL_ENCOUNTERS } from '../src/data/tacticalEncounters';
import { encounterCueOf, updateEncounterCombat, encounterCombatErrors, encounterOrderTuning, encounterOrderTarget, encounterOrderWard } from '../src/engine/encounterCombat';
import { updateAI } from '../src/engine/ai';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { ensureMovementTether, movementTetherDistance } from '../src/engine/movementTether';
import { makeSkillInstance } from '../src/engine/skills';
import { SKILLS } from '../src/data/skills';
import { dist } from '../src/core/math';
import { setSimTap } from '../src/engine/tap';
import { START_ZONE } from '../src/data/zones';

const restore=seedGlobalRandom(0xeca77);
const w=makeSimWorld('warrior',0xeca77);
assert.deepEqual(encounterCombatErrors(),[]);
assert.equal(Object.keys(TACTICAL_ENCOUNTERS).length,12);
assert.equal(Object.keys(ENCOUNTER_TACTICS).length,6);
function setup(recipe='wayward_expedition',level=18) {
  w.actors=[w.player]; w.doodads=[]; w.texts=[]; w.flashes=[]; w.walk=null; w.markDoodadsChanged();
  w.zone={...w.zone,tileset:ENCOUNTER_GROUPS[recipe].habitats!.tilesets![0],level};
  w.player.casting=null; w.player.statuses=[]; w.player.tier=0;
  w.player.sheet.setBase('invisible',0); w.player.sheet.setBase('life',90000); w.player.life=90000;
  const members=w.spawnEncounterGroup(recipe,level,{x:800,y:600},{facing:Math.PI/2,persistent:true});
  assert.ok(members.length>0,recipe);
  const leader=members.find(a=>a.squadLeader)!;
  w.player.pos={x:leader.pos.x,y:leader.pos.y+350};
  for(const a of members) {a.emergeUntil=undefined;a.aiTargetId=w.player.id;a.aggroed=true;ensureMovementTether(a);}
  updateEncounterCombat(w);
  return {members,leader};
}
const think=(sec=0.4)=>{w.time+=sec;updateEncounterCombat(w);};
const planOf=(members:typeof w.actors)=>members.find(a=>a.encounterOrder)?.encounterOrder;
function arm(expected:string,members:typeof w.actors) {
  think(1.3); const o=planOf(members);
  assert.equal(o?.plan,expected); assert.equal(o?.phase,'warning');
  assert.ok(members.every(a=>encounterOrderTuning(a,w)===undefined),'No maneuver starts before its warning');
  assert.ok(members.some(a=>encounterCueOf(a,w)?.phase==='warning'),'Missing live warning cue');
  assert.ok(!w.texts.some(t=>t.text===ENCOUNTER_TACTICS[expected].signal),'Retired plan caption returned');
  return o!;
}

for(const name of Object.keys(ENCOUNTER_TACTICS)) {
  const recipe=name==='pincer'?'ember_drovers':name==='root_barrage'?'snare_nursery':name==='countercast'?'rift_observatory':'wayward_expedition';
  const f=setup(recipe);
  if(name==='protect_support') {const support=f.members.find(a=>a.defId==='wayward_mender')!;w.player.pos={x:support.pos.x+100,y:support.pos.y};support.life*=0.4;}
  if(name==='covered_withdrawal') f.leader.life*=0.3;
  if(name==='pincer') w.player.pos={x:f.leader.pos.x,y:f.leader.pos.y+300};
  if(name==='countercast') w.player.casting={inst:makeSkillInstance(SKILLS.firebolt,1),mode:'cast',aim:f.leader.pos,elapsed:0,total:5,held:true,baseMult:1};
  arm(name,f.members);
  const target=f.members.find(a=>a.encounterOrder?.target!==undefined)?.encounterOrder?.target;
  think(ENCOUNTER_TACTICS[name].warning+0.01);
  assert.equal(planOf(f.members)?.phase,'commit');
  assert.ok(f.members.some(a=>encounterOrderTuning(a,w)));
  // A target switch during the commitment cannot silently redirect the plan.
  assert.equal(f.members.find(a=>a.encounterOrder?.target!==undefined)?.encounterOrder?.target,target);
  think(ENCOUNTER_TACTICS[name].duration+0.01);
  assert.equal(planOf(f.members)?.phase,'recover');
  assert.ok(f.members.filter(a=>a.encounterOrder).every(a=>encounterOrderTuning(a,w)?.move?.style==='hold'));
  think(ENCOUNTER_TACTICS[name].recovery+0.01);
  assert.ok(f.members.every(a=>!a.encounterOrder));
  console.log(`PASS ${name}: observed selection, warning, committed tactics and finite recovery`);
}

// Breaking the conductor or line of sight wins the warning window.
for(const breakKind of ['stun','death','capture','wall','invisible','story','support_loss'] as const) {
  const f=setup(); const healer=f.members.find(a=>a.defId==='wayward_mender')!;
  w.player.pos={x:healer.pos.x+100,y:healer.pos.y}; arm('protect_support',f.members);
  const sight=w.lineOfSight;
  if(breakKind==='stun') {f.leader.poise=0;f.leader.applyStatus('stun',0,2,'probe');assert.ok(f.leader.isStunned());}
  if(breakKind==='death') f.leader.dead=true;
  if(breakKind==='capture') {f.leader.owner=w.player;f.leader.team='player';}
  if(breakKind==='wall') w.lineOfSight=()=>false;
  if(breakKind==='invisible') w.player.sheet.setBase('invisible',1);
  if(breakKind==='story') w.player.tier=1;
  if(breakKind==='support_loss') healer.dead=true;
  think(0.4);
  assert.ok(f.members.every(a=>a.encounterOrder?.phase!=='commit'),breakKind);
  assert.equal(planOf(f.members)?.phase,'recover',breakKind);
  assert.ok(f.members.every(a=>!encounterOrderTarget(a,w)));
  w.lineOfSight=sight;
}
console.log('PASS interruption, leader death/capture, lost support, walls, invisibility and story isolation');

// Actual AI consumes the order: cover names the healer and physically interposes;
// the ranged members still spend real ammunition/mana and deal ordinary damage.
{
  const f=setup(); const healer=f.members.find(a=>a.defId==='wayward_mender')!;
  w.player.pos={x:healer.pos.x+180,y:healer.pos.y}; healer.life*=0.4;
  arm('protect_support',f.members); think(1.12);
  const guard=f.leader, before={...guard.pos};
  assert.equal(encounterOrderWard(guard,w),healer);
  assert.equal(encounterOrderTarget(guard,w),w.player);
  const skills=guard.skills; guard.skills=[]; // isolate movement from guarding/casting holds
  for(let i=0;i<30;i++) {updateAI(guard,w,1/60);w.time+=1/60;}
  assert.ok(dist(before,guard.pos)>1,'The assigned protector never moves'); guard.skills=skills;
  // A challenge remains authoritative over a shared target.
  const decoy=w.createMonster('skeleton_warrior',18,'player'); decoy.pos={x:guard.pos.x+50,y:guard.pos.y};w.actors.push(decoy);
  guard.applyStatus('taunted',0,2,'probe',{casterId:decoy.id});
  updateAI(guard,w,1/60); assert.equal(guard.aiTargetId,decoy.id,'Tactical focus overrode taunt');
  guard.statuses=[];
  let damage=0;setSimTap({onHit(c,t,r){if(f.members.includes(c)&&t===w.player)damage+=r.total;}});
  for(let i=0;i<10*60;i++){for(const a of f.members)updateAI(a,w,1/60);w.update(1/60);}
  setSimTap(null);assert.ok(damage>0,'Coordinating bodies stopped using the real combat pipeline');
}
console.log('PASS AI movement, explicit ward assignment, normal damage and taunt priority');

// Fairness and isolation: no unseen acquisition, no early tactics, no refill,
// no shared state between encounters, no transient order persisted on revisit.
{
  const f=setup();f.members.forEach(a=>{a.aiTargetId=undefined;a.aiHitById=-1;});think(2);
  assert.ok(f.members.every(a=>!a.encounterOrder));
  const early=setup('wayward_expedition',8);early.leader.life*=0.2;think(2);
  assert.notEqual(planOf(early.members)?.plan,'covered_withdrawal');
  const clean=setup();const before=JSON.stringify(clean.members.map(a=>({life:a.life,mana:a.mana,skills:a.skills.map(s=>s?.def.id)})));
  arm('crossfire',clean.members);
  assert.equal(JSON.stringify(clean.members.map(a=>({life:a.life,mana:a.mana,skills:a.skills.map(s=>s?.def.id)}))),before);
  const second=w.spawnEncounterGroup('wayward_expedition',18,{x:1300,y:1000});
  assert.ok(second.every(a=>!a.encounterOrder));
  const snap=serializeSnapshot(w,1), client=makeSimWorld('warrior',10);applySnapshot(client,snap);
  assert.ok(client.actors.some(a=>a.encounterOrder?.phase==='warning'));
  client.clientActionHook=()=>{};
  updateEncounterCombat(client);
  assert.ok(client.actors.some(a=>a.encounterOrder?.phase==='warning'),'A client rewrote the host cue');
  for(const a of snap.actors)a.encounterOrder=undefined;
  applySnapshot(client,snap);assert.ok(client.actors.every(a=>!a.encounterOrder));
  const source=w.zone.id;w.loadZone(START_ZONE);w.loadZone(source);
  assert.ok(w.actors.every(a=>!a.encounterOrder));
}
console.log('PASS observed-only information, level gates, resource neutrality, separate squads, co-op and revisit cleanup');
// A sustained opportunity cannot reroll every frame or chain maneuvers without
// its rearm window. Different frame rates keep the same bounded schedule.
for(const hz of [30,60,120]) {
  const f=setup(); let warnings=0,previous='';
  for(let i=0;i<30*hz;i++) {
    think(1/hz);const phase=planOf(f.members)?.phase??'';
    if(phase==='warning'&&previous!=='warning')warnings++;
    previous=phase;
  }
  assert.equal(warnings,3,`${hz} Hz: sustained crossfire should rearm only three times in 30 seconds`);
}
{
  const f=setup();arm('crossfire',f.members);think(1.12);
  const shooter=f.members.find(a=>a.encounterOrder?.target!==undefined)!;
  const second=w.createMonster('skeleton_warrior',18,'player');second.pos={x:800,y:800};w.actors.push(second);
  shooter.aiTargetId=second.id;think(0.4);
  assert.equal(encounterOrderTarget(shooter,w),w.player,'The existing plan silently switched quarry');
  shooter.pos.x+=900;
  assert.equal(encounterOrderTuning(shooter,w),undefined,'Orders reached beyond the communication radius');
}
console.log('PASS cooldown pacing at 30/60/120 Hz, fixed quarry and communication range');
{
  const f=setup('ashen_hunting_school',18);w.player.pos={x:f.leader.pos.x,y:f.leader.pos.y+300};
  think(1.3);think(1.5);
  for(const a of f.members.filter(a=>a.movementTether)) {
    const origin={...a.movementTether!.point}; a.pos.x+=900; w.update(0.1);
    assert.deepEqual(a.movementTether!.point,origin);
    assert.ok(movementTetherDistance(a.movementTether!,a.pos)<=235.001);
  }
}
restore();console.log('PASS encounterCombat: native tethers remain sovereign under shared maneuvers');
