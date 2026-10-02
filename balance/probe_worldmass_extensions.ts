import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { canonical } from '../src/worldmass/random';
import { serializeCharacter } from '../src/meta/character';
import { updateAI } from '../src/engine/ai';
import { massGarrisonSlots } from '../src/worldmass/clearance';
import { siteOffset } from '../src/worldmass/sites';

const restore=seedGlobalRandom(80223),cfg=massAdventure();
const world=makeSimWorld('warrior',42),m=new WorldMassRuntime(42,'extension',cfg);m.attach(world);
const journey=m.journey!,stone=journey.places.find(p=>p.content==='stoneward')!;
const gate=journey.places.find(p=>p.recipe==='north-ruin')!;
const branch=journey.trails.find(t=>t.id===stone.id+'/approach')!;
assert.deepEqual(branch.points[0],journey.local(gate));
assert.deepEqual(branch.points.at(-1),journey.local(stone));
assert.equal(journey.departurePoints.length,4,'branches add no new town departure');
assert.equal(m.populationFor(stone).level,4);
world.player.level=18;
assert.equal(m.populationFor(stone).level,4,'guardian danger does not scale to the player');
world.player.pos=journey.local(stone);m.update(world,true);
const guards=world.actors.filter(a=>a.defId==='stone_sentinel');
assert.equal(guards.length,1);assert.equal(guards[0].level,4);
assert.ok(world.objectiveCountable(guards[0]));
assert.ok(guards[0].skills.some(s=>s?.def.id==='shield_up'));
assert.ok(world.altars.some(a=>a.def.id==='wrath_altar'&&a.level===4));
const stoneContent=m.config.content.find(c=>c.id==='stoneward')!;
const slinger=world.actors.find(a=>a.defId==='karst_slinger')!;
assert.ok(slinger);assert.equal(slinger.level,4);
assert.ok(slinger.skills.some(s=>s?.def.id==='hurl_debris'));
const fixtureId=canonical([stone.id,'fixture',0]),garrison=massGarrisonSlots(stoneContent,stone.id);
assert.equal(garrison.length,2);assert.ok(m.state.claimed('site-guardian',fixtureId));
assert.ok(world.objectiveCountable(slinger));
slinger.life*=.7;
console.log('PASS a physical branch reaches a fixed native guardian and shared Wrath field');

// Controlled displacement invokes the real native return decision, then saves
// inside its hysteresis band. Continue must not adopt this position as home.
const guardian=guards[0],home={...guardian.aiAnchor!};
assert.deepEqual(home,guardian.pos,'home is fixed at admission, before the first AI tick');
guardian.pos={x:home.x+650,y:home.y};updateAI(guardian,world,1/60);
assert.equal(guardian.aiPhase,'leash_home');
guardian.pos={x:home.x+400,y:home.y};guardian.life*=.6;
const checkpoint=m.snapshot(world);
const resumed=makeSimWorld('warrior',47),runtime=new WorldMassRuntime(42,'extension',cfg,checkpoint);
runtime.attach(resumed,checkpoint);
const returned=resumed.actors.find(a=>a.defId==='stone_sentinel')!;
assert.deepEqual(returned.aiAnchor,home);assert.equal(returned.aiPhase,'leash_home');
assert.equal(returned.life,guardian.life);
const continuedSlinger=resumed.actors.find(a=>a.defId==='karst_slinger')!;
assert.equal(continuedSlinger.life,slinger.life);
assert.deepEqual(continuedSlinger.skills.map(s=>s?.def.id),slinger.skills.map(s=>s?.def.id));
assert.deepEqual(continuedSlinger.aiAnchor,slinger.aiAnchor);
assert.ok(runtime.state.claimed('site-guardian',fixtureId));
const distance=Math.hypot(returned.pos.x-home.x,returned.pos.y-home.y);
updateAI(returned,resumed,1/60);
assert.equal(returned.aiPhase,'leash_home','hysteresis still returning below its outer radius');
assert.ok(Math.hypot(returned.pos.x-home.x,returned.pos.y-home.y)<distance);
assert.ok(returned.life>guardian.life,'native return healing resumes only during simulation');
for(const patch of [{anchor:null},{anchor:{x:NaN,y:0}},{leashHome:'yes'},{anchor:undefined,leashHome:true}]) {
 const invalid=structuredClone(checkpoint);Object.assign(invalid.enemies[0],patch);
 assert.throws(()=>new WorldMassRuntime(42,'extension',cfg,invalid),/Invalid worldmass survivor/);
}
const legacyHome=structuredClone(checkpoint);
for(const enemy of legacyHome.enemies){delete enemy.anchor;delete enemy.leashHome;}
const oldHomeWorld=makeSimWorld('warrior',48);
new WorldMassRuntime(42,'extension',cfg,legacyHome).attach(oldHomeWorld,legacyHome);
const fallback=oldHomeWorld.actors.find(a=>a.defId==='stone_sentinel')!;
assert.deepEqual(fallback.aiAnchor,fallback.pos,'old records have no earlier home to recover');
console.log('PASS native guardian home, return hysteresis and wounds survive Continue; legacy homes and invalid records are explicit');

world.kill(guardian,false,world.player);m.update(world,true);
assert.equal(m.siteCleared(stone.id),false,'the ranged garrison survives the central defender');
world.kill(slinger,false,world.player);m.update(world,true);
assert.ok(m.siteCleared(stone.id),'all native garrison roles complete the same reward');
m.update(world,true);
assert.ok(m.state.claimed('fallen',fixtureId),'a slain placed guard cannot respawn');
console.log('PASS fixed ranged role, native kit, wounds/home/eligibility through Continue and final-garrison completion');

const partialWorld=makeSimWorld('warrior',842),partial=new WorldMassRuntime(42,'partial-role',cfg);partial.attach(partialWorld);
const partialSite=partial.journey!.places.find(p=>p.content==='stoneward')!;
const partialCenter=partial.journey!.local(partialSite),placed=siteOffset(partialSite,90,-65);
const nativeFind=partialWorld.findFreeSpot.bind(partialWorld);
partialWorld.findFreeSpot=(point,radius,...rest)=>
 Math.hypot(point.x-partialCenter.x-placed.x,point.y-partialCenter.y-placed.y)<.1
 ? {x:partialCenter.x+100000,y:partialCenter.y} : nativeFind(point,radius,...rest);
partialWorld.player.pos=partialCenter;partial.update(partialWorld,true);
assert.ok(!partialWorld.actors.some(a=>a.defId==='karst_slinger'));
assert.ok(!partialWorld.altars.some(a=>a.def.id==='wrath_altar'));
assert.ok(!partialWorld.chests.some(c=>c.rewardSource===canonical([partialSite.id,'cache'])));
partialWorld.findFreeSpot=nativeFind;partial.update(partialWorld,true);
assert.equal(partialWorld.actors.filter(a=>a.defId==='karst_slinger').length,1);
assert.equal(partialWorld.altars.filter(a=>a.def.id==='wrath_altar').length,1);
assert.equal(partialWorld.chests.filter(c=>c.rewardSource===canonical([partialSite.id,'cache'])).length,1);
console.log('PASS unplaced declared guards delay the native field/cache; a later valid admission creates each once');

const legacyRoles:MassAdventure=JSON.parse(canonical(cfg));
delete legacyRoles.content.find(c=>c.id==='stoneward')!.site!.fixtures[0].garrison;
assert.equal(massGarrisonSlots(legacyRoles.content.find(c=>c.id==='stoneward')!,stone.id).length,1);
const oldRoleWorld=makeSimWorld('warrior',843),oldRoles=new WorldMassRuntime(42,'legacy-role',legacyRoles);oldRoles.attach(oldRoleWorld);
oldRoleWorld.player.pos=oldRoles.journey!.local(oldRoles.journey!.places.find(p=>p.content==='stoneward')!);
oldRoles.update(oldRoleWorld,true);
const oldRoleSite=oldRoles.journey!.places.find(p=>p.content==='stoneward')!;
assert.ok(!oldRoles.state.claimed('site-guardian',canonical([oldRoleSite.id,'fixture',0])));
oldRoleWorld.kill(oldRoleWorld.actors.find(a=>a.defId==='stone_sentinel')!,false,oldRoleWorld.player);
oldRoles.update(oldRoleWorld,true);
assert.ok(oldRoles.siteCleared(oldRoleSite.id),'unflagged legacy fixtures add no new completion obligation');
console.log('PASS omitted garrison roles retain previous fixture completion semantics');

const base:MassAdventure=JSON.parse(canonical(cfg));delete base.journey!.extensions;
const oldWorld=makeSimWorld('warrior',43),old=new WorldMassRuntime(42,'extension',base);old.attach(oldWorld);
assert.equal(old.journey!.places.length,4);
assert.deepEqual(journey.trails.slice(0,8),old.journey!.trails,'adding a branch cannot reroute the original circuit');
const oldSave=serializeCharacter(oldWorld),oldAgain=makeSimWorld('warrior',44);
oldAgain.adoptWorldState(oldSave.world);oldAgain.startWorldMass(42,oldSave.world!.worldmass);
assert.equal(oldAgain.massRuntime!.journey!.places.length,4,'old expedition acquires no new branch');
console.log('PASS original circuit geometry and legacy continued expeditions remain unchanged');

const chained:MassAdventure=JSON.parse(canonical(cfg));
chained.journey!.extensions!.push({id:'westward',from:'north-stoneward',content:'cinderwatch',
 offset:{x:-1400,y:0},radius:310,jitter:0});
const chainWorld=makeSimWorld('warrior',45),chain=new WorldMassRuntime(42,'chained',chained);chain.attach(chainWorld);
const next=chain.journey!.places.find(p=>p.recipe==='westward')!;
assert.deepEqual(chain.journey!.trails.find(t=>t.id===next.id+'/approach')!.points[0],
 chain.journey!.local(chain.journey!.places.find(p=>p.recipe==='north-stoneward')!));
console.log('PASS authored branches can chain from earlier branches with durable independent identities');

for(const mutate of [
 (c:MassAdventure)=>{c.journey!.extensions![0].from='missing';},
 (c:MassAdventure)=>{c.journey!.extensions![0].id='north-ruin';},
 (c:MassAdventure)=>{c.journey!.extensions![0].offset={x:0,y:100};},
 (c:MassAdventure)=>{c.journey!.extensions![0].offset={x:0,y:3400};},
 (c:MassAdventure)=>{c.journey!.extensions![0].content='missing';},
 (c:MassAdventure)=>{c.journey!.extensions![0].radius=NaN;},
 (c:MassAdventure)=>{(c.content.find(c=>c.id==='stoneward')!.site!.fixtures[0] as unknown as {garrison:string}).garrison='yes';},
]) {
 const invalid:MassAdventure=JSON.parse(canonical(cfg));mutate(invalid);
 assert.throws(()=>new WorldMassRuntime(42,'invalid',invalid).attach(makeSimWorld('warrior',46)));
}
console.log('PASS missing parents/content, duplicate identities, short paths, town crossings and invalid geometry refuse');
restore();
