import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { ENCOUNTER_GROUPS } from '../src/data/encounterGroups';
import { ENCOUNTER_ADVENTURERS } from '../src/data/encounterAdventurers';
import { encounterGroupErrors, encounterGroupSpecErrors, encounterGroupContext, encounterGroupPool, planEncounterGroup,
  rollEncounterGroup, readEncounterGroup, applyEncounterGroup, updateEncounterGroups } from '../src/engine/encounterGroups';
import { MONSTERS } from '../src/data/monsters';
import { TILESETS } from '../src/data/tilesets';
import { SKILLS } from '../src/data/skills';
import { LOOKS } from '../src/data/looks';
import { Rng } from '../src/core/rng';
import { seedGlobalRandom } from '../src/sim/rng';
import { normalizeBrain } from '../src/engine/brain';
import { updateAI } from '../src/engine/ai';
import { setSimTap } from '../src/engine/tap';
import { START_ZONE } from '../src/data/zones';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { ensureMovementTether, movementTetherDistance } from '../src/engine/movementTether';

const restore=seedGlobalRandom(0xc0a07);
const w=makeSimWorld('warrior',0xc0a07);
assert.deepEqual(encounterGroupErrors(),[]);
const centre={x:800,y:650};
function clear(tileset:string,level:number) {
  w.actors=[w.player]; w.doodads=[]; w.markDoodadsChanged(); w.walk=null;
  w.zone={...w.zone,tileset,level,biome:undefined,anchor:undefined,caveDepth:undefined};
  w.player.pos={x:800,y:1100}; w.player.life=w.player.maxLife();
}
for(const g of Object.values(ENCOUNTER_GROUPS)) {
  const tileset=g.habitats!.tilesets![0];
  clear(tileset,g.minLevel);
  const q=encounterGroupContext(w.zone,g.faction);
  assert.ok(g.habitats!.tilesets!.some(id=>TILESETS[id]?.packs.table.some(r=>MONSTERS[r.id]?.faction===g.faction)),`${g.id}: no natural source`);
  for(const ts of g.habitats!.tilesets!) assert.ok(TILESETS[ts],`${g.id}: missing terrain ${ts}`);
  assert.ok(encounterGroupPool(q).some(r=>r.id===g.id));
  assert.deepEqual(planEncounterGroup(g.id,{...q,level:g.minLevel-1}),[],`${g.id}: early leak`);
  assert.deepEqual(planEncounterGroup(g.id,{...q,tileset:'not_a_habitat'}),[],`${g.id}: habitat leak`);
  assert.deepEqual(planEncounterGroup(g.id,{...q,faction:'unrelated'}),[],`${g.id}: allegiance leak`);
  const original=JSON.stringify(g);
  const members=w.spawnEncounterGroup(g.id,g.minLevel,centre,{facing:Math.PI/2,persistent:true});
  assert.ok(members.length>=2,`${g.id}: refused on clear ground`);
  assert.equal(members.filter(a=>a.squadLeader).length,1);
  assert.equal(new Set(members.map(a=>a.squadId)).size,1);
  assert.ok(members.every(a=>a.encounterGroup?.recipe===g.id && a.fromZoneGen));
  for(const slot of g.members) assert.ok(members.filter(a=>a.encounterGroup?.slot===slot.slot).length>=(slot.count?.[0]??1),`${g.id}: missing ${slot.slot}`);
  assert.equal(JSON.stringify(g),original,'Spawning must not mutate shared recipes');
  console.log(`PASS ${g.id}: ${members.length} members, native habitat, hard debut, coherent squad`);
}
assert.equal(Object.keys(ENCOUNTER_GROUPS).length,47);
assert.equal(new Set(Object.values(ENCOUNTER_GROUPS).map(g=>g.faction)).size,19);
for(const d of Object.values(ENCOUNTER_ADVENTURERS)) {
  assert.ok(LOOKS[d.look!],`${d.id}: appearance`);
  assert.ok(d.skills.every(id=>SKILLS[id]?.ai && SKILLS[id].manaCost<=(d.base.mana??0)),`${d.id}: affordable kit`);
}
assert.ok(TILESETS.forest.packs.table.some(r=>r.id==='rootlash_snapper'));
assert.ok(TILESETS.jungle.packs.table.some(r=>r.id==='rootlash_snapper'));
assert.ok(TILESETS.crypt.packs.table.some(r=>r.id==='gravebound_shade'));

clear('highland',18);
const q=encounterGroupContext(w.zone,'bandit');
let draws=0;
assert.equal(rollEncounterGroup(q,false,()=>{draws++;return 0;}),undefined); assert.equal(draws,0);
assert.equal(rollEncounterGroup(q,{table:[],chance:1}),undefined);
assert.equal(rollEncounterGroup(q,{chance:NaN}),undefined);
assert.equal(rollEncounterGroup(q,{chance:1,table:[{id:'wayward_expedition',weight:Infinity}]}),undefined);
assert.ok(encounterGroupSpecErrors({chance:2,maxMembers:1,table:[{id:'missing',weight:0}]}).length===4);
assert.equal(rollEncounterGroup(q,{chance:1,maxMembers:2}),undefined);
assert.equal(rollEncounterGroup({...q,faction:undefined},{chance:1}),undefined);
assert.equal(rollEncounterGroup({...q,level:2},{table:[{id:'wayward_expedition',weight:1}],chance:1}),undefined);
const rngA=new Rng(51),rngB=new Rng(51);
assert.deepEqual(planEncounterGroup('wayward_veterans',{...q,level:24},8,()=>rngA.next()),planEncounterGroup('wayward_veterans',{...q,level:24},8,()=>rngB.next()));
assert.equal(planEncounterGroup('wayward_veterans',q).length,4,'Optional outriders unlock later');
const variants=new Set<string>();
for(let seed=1;seed<=40;seed++) { const rng=new Rng(seed); for(const s of planEncounterGroup('wayward_veterans',{...q,level:24},8,()=>rng.next())) if(s.member.slot==='outrider') variants.add(s.monster); }
assert.ok(variants.has('steppe_ronin') && variants.has('bandit_cutthroat'));
assert.equal(readEncounterGroup({id:NaN,recipe:'wayward_expedition',slot:'vanguard'}),undefined);
assert.equal(readEncounterGroup({id:1,recipe:'wayward_expedition',slot:'invented'}),undefined);
assert.equal(readEncounterGroup({id:1,recipe:'__proto__',slot:'invented'}),undefined);
assert.deepEqual(w.spawnEncounterGroup('wayward_expedition',18,centre,{maxMembers:2}),[]);
assert.deepEqual(w.spawnEncounterGroup('wayward_expedition',18,centre,{tier:2}),[]);
const before=w.actors.length, find=w.findFreeSpot;
w.findFreeSpot=()=>({x:3000,y:3000});
assert.deepEqual(w.spawnEncounterGroup('wayward_expedition',18,centre),[]);
assert.equal(w.actors.length,before,'Refused seating leaves no partial party'); w.findFreeSpot=find;
console.log('PASS strict filtering, optional alternatives, deterministic plans, limits and atomic seating');

// Actual ambient spawner: a curated pool replaces normal cohorts; opting out
// leaves the single-species path and sealed authored cohorts untouched.
for(const disabled of [false,true]) {
  clear('highland',8);
  w.zone.packs={count:[20,20],size:[3,3],table:[{id:'bandit_cutthroat',weight:1}],
    encounterGroups:disabled?false:{chance:1,table:[{id:'wayward_expedition',weight:1}]}};
  w.zone.packDensity=1;
  (w as any).spawnPacks(w.zone);
  const grouped=w.actors.filter(a=>a.encounterGroup);
  assert.equal(grouped.length>0,!disabled);
  const ids=new Set(grouped.map(a=>a.encounterGroup!.id));
  for(const id of ids) assert.equal(grouped.filter(a=>a.encounterGroup!.id===id).length,4);
}
clear('highland',8); w.zone.cohort='authored';
w.zone.packs={count:[12,12],size:[3,3],table:[{id:'bandit_cutthroat',weight:1}]};
(w as any).spawnPacks(w.zone);
assert.ok(!w.actors.some(a=>a.encounterGroup)); delete w.zone.cohort;
console.log('PASS production ambient replacement, complete roles, explicit opt-out and authored isolation');

// Rival adventurers must actually guard, heal and deal damage together.
clear('highland',10);
w.player.sheet.setBase('life',90000); w.player.life=90000;
const crew=w.spawnEncounterGroup('wayward_expedition',10,centre,{facing:Math.PI/2,persistent:true});
assert.equal(crew.length,4);
for(let i=0;i<180;i++) w.update(1/60);
const tank=crew.find(a=>a.defId==='wayward_vanguard')!;
tank.life=tank.maxLife()*0.3;
w.player.pos={x:800,y:860};
const casts=new Set<string>(); let healed=0,damage=0,guarded=false;
setSimTap({onCast(a,s){if(crew.includes(a)) casts.add(`${a.defId}:${s.def.id}`);},
  onHeal(a,n){if(a===tank) healed+=n;},onHit(c,t,r){if(crew.includes(c)&&t===w.player) damage+=r.total;}});
for(let i=0;i<24*60;i++) { for(const a of crew) if(!a.dead) updateAI(a,w,1/60); guarded ||= tank.isGuarding(); w.update(1/60); }
// Close on the frontline after the ranged exchange: a protector stays with
// its ward instead of chasing a distant, stationary target.
w.player.pos={x:tank.pos.x,y:tank.pos.y+45};
for(let i=0;i<8*60;i++) { for(const a of crew) if(!a.dead) updateAI(a,w,1/60); guarded ||= tank.isGuarding(); w.update(1/60); }
setSimTap(null);
assert.ok(healed>0,'Mender never heals the frontline');
assert.ok(guarded,'Vanguard never guards');
assert.ok(casts.has('wayward_vanguard:challenging_shout'),'Vanguard never challenges');
assert.ok(casts.has('wayward_arcanist:firebolt'),'Arcanist never attacks');
assert.ok(casts.has('wayward_scout:bolt_repeater'),'Scout never attacks'); assert.ok(damage>0);
const originalBrain=MONSTERS.wayward_scout.brain;
assert.notEqual(crew[3].brain,originalBrain); assert.equal(originalBrain?.squad,undefined);
applyEncounterGroup(crew[3],crew[3].encounterGroup!);
assert.equal(crew[3].encounterGroupBaseBrain,originalBrain,'Reapplying tactics must not stack or lose the native brain');
w.kill(tank,false,w.player);
assert.ok(crew.filter(a=>!a.dead).every(a=>a.aiMoraleUntil>w.time),'Leader loss never breaks the expedition');
console.log(`PASS actual rival roles: guard, challenge, ${Math.round(healed)} healing, ${Math.round(damage)} damage, leader-loss response`);

// Losing the leader, leaving and reloading cannot refill a slot or merge squads.
const source=w.zone.id, survivors=crew.filter(a=>!a.dead), oldId=survivors[0].squadId;
w.loadZone(START_ZONE); const saved=JSON.parse(JSON.stringify(w.serializeWorldState())); w.loadZone(source);
const returned=w.actors.filter(a=>a.encounterGroup?.recipe==='wayward_expedition');
assert.equal(returned.length,3); assert.ok(returned.every(a=>!a.squadLeader && a.squadId!==oldId));
assert.ok(returned.every(a=>normalizeBrain(a.brain!).base.squad?.focusLeader));
const resumed=makeSimWorld('warrior',0xc0a08);
assert.ok(resumed.adoptWorldState(saved)); resumed.loadZone(source);
assert.equal(resumed.actors.filter(a=>a.encounterGroup?.recipe==='wayward_expedition').length,3);
const shot=serializeSnapshot(resumed,1), client=makeSimWorld('warrior',0xc0a09);
applySnapshot(client,shot); assert.equal(client.actors.filter(a=>a.encounterGroup).length,3);
for(const a of shot.actors) a.encounterGroup=undefined;
applySnapshot(client,shot); assert.ok(!client.actors.some(a=>a.encounterGroup));
const convert=resumed.actors.find(a=>a.encounterGroup)!;
convert.team='player'; updateEncounterGroups(resumed.actors);
assert.equal(convert.encounterGroup,undefined); assert.equal(convert.squadId,undefined);
assert.equal(convert.brain,MONSTERS[convert.defId!].brain);
console.log('PASS leader stays dead, survivors retain tactics, fresh squad IDs, JSON reload, co-op clearing and allegiance cleanup');

clear('hell_steppes',8);
const kennels=w.spawnEncounterGroup('ashen_posts',8,centre);
for(const a of kennels) ensureMovementTether(a);
w.update(0.1);
assert.ok(kennels.filter(a=>a.defId==='stakebound_hound').every(a=>a.bondHeld));
for(const hound of kennels.filter(a=>a.movementTether)) {
  const point={...hound.movementTether!.point}; hound.pos.x+=800; w.update(0.1);
  assert.deepEqual(hound.movementTether!.point,point); assert.ok(movementTetherDistance(hound.movementTether!,hound.pos)<=235.001);
}
restore();
console.log('PASS encounterGroups: habitat audit, 47 recipes / 19 factions, real coordination, persistence and tethered companions');
