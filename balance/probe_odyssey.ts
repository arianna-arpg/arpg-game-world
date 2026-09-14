import assert from 'node:assert/strict';
import { makeSimWorld, SIM_ARENA_ID } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { newOdyssey, restoreOdyssey, odysseyAct } from '../src/world/odyssey';
import { ODYSSEY_CFG as C, ODYSSEY_FACTIONS, ODYSSEY_TUTORIAL_RELEASE, ODYSSEY_SURVEY, odysseyQuestId, odysseyFaction } from '../src/data/odyssey';
import { MONSTERS } from '../src/data/monsters';
import { TILESETS } from '../src/data/tilesets';
import { QUESTS } from '../src/quests/defs';
import { TUTORIAL_FACTIONS } from '../src/data/commanders';
import { revengeCullId, revengeCommanderId } from '../src/quests/revenge';
import { START_ZONE } from '../src/data/zones';
import { updateAI } from '../src/engine/ai';
import type { World } from '../src/engine/world';
import { angleTo, vec } from '../src/core/math';

seedGlobalRandom(0x0d155e7);
function pass(label: string): void { console.log(`PASS ${label}`); }

for (const f of TUTORIAL_FACTIONS) for (let seed = 0; seed < 100; seed++) {
  const ledger = { [`tutorial_faction:${f.id}`]: 1 };
  const a = newOdyssey(seed, ledger), b = newOdyssey(seed, ledger);
  assert.deepEqual(a, b); assert.equal(new Set(a.roster).size, 4); assert(a.roster.includes(f.id));
  const resumed = restoreOdyssey(JSON.parse(JSON.stringify(a)), seed, { ...ledger, [ODYSSEY_TUTORIAL_RELEASE]: 1 });
  assert.deepEqual(resumed.roster, a.roster);
}
assert(Array.from({ length: 100 }, (_, seed) => newOdyssey(seed, { 'tutorial_faction:goblin': 1, [ODYSSEY_TUTORIAL_RELEASE]: 1 }))
  .some(s => !s.roster.includes('goblin')));
assert.equal(odysseyAct(newOdyssey(1, { 'odyssey_leader:goblin': 100 })), 0);
pass('selection is deterministic, tutorial obligation survives failed worlds, release affects only future worlds, acts ignore account kills');

for (const f of ODYSSEY_FACTIONS) {
  assert(MONSTERS[f.leader]); assert(MONSTERS[f.escort]); assert(TILESETS[f.tileset]);
  assert(!TUTORIAL_FACTIONS.some(t => t.commander === f.leader));
  assert(QUESTS[odysseyQuestId(f.id, 'leader')]);
}
for (const id of [...C.goblin.roster, ...C.bandit.huntRoster]) assert(MONSTERS[id], id);
assert(Object.values(QUESTS).filter(q => q.vocation).every(q => !q.reward.vocationPoints));
pass('campaign references resolve; Vocation chains have no second point income');

let seed = 1;
while (!newOdyssey(seed, {}).roster.includes('bandit')) seed++;
const w = makeSimWorld('warrior', seed);
w.loadZone(START_ZONE); w.odyssey.update();
const s = w.odyssey.state!;
assert.equal(w.activeQuests.filter(q => q.questId.startsWith('odyssey_')).length, 8);
assert(w.zoneMap[`quest_${revengeCommanderId('goblin')}`]);
assert.equal(w.meta.vocations.length, 0);
assert(w.surveyed.has(`quest_${revengeCullId('goblin')}`));
assert(!w.surveyed.has(`quest_${revengeCommanderId('goblin')}`), 'the undiscovered commander remains unknown');
w.odyssey.localLeads();
assert.equal(s.leads.length, 4);
for (const id of s.roster) {
  const leaderZone = w.zoneMap[`quest_${odysseyQuestId(id, 'leader')}`];
  assert.equal(leaderZone.veiled, false);
  assert(w.surveyed.has(leaderZone.id), 'discovered leads register as map intelligence');
  for (const exit of leaderZone.exits) if (w.zoneMap[exit.to]) assert(w.surveyed.has(exit.to));
}
pass('operations and all leaders exist independently, including the exploration-accessible tutorial commander');

function clearQuest(world: World, id: string): void {
  world.loadZone(`quest_${id}`);
  assert(world.actors.some(a => a.team === 'enemy' && !a.dead && !a.invulnerable), `${id} must contain a fight`);
  for (const a of [...world.actors]) if (a.team === 'enemy' && !a.dead && !a.invulnerable) world.kill(a, false, world.player);
  world.update(1 / 60);
  assert(world.completedObjectives.has(`quest_${id}`), `${id} objective completes through gameplay`);
}

clearQuest(w, revengeCommanderId('goblin'));
assert.equal(s.defeated.length, 0);
assert(!w.account.ledger[ODYSSEY_TUTORIAL_RELEASE]);
clearQuest(w, odysseyQuestId('goblin', 'operation'));
assert(s.prepared.includes('goblin'));
assert.equal(w.zoneMap[`quest_${odysseyQuestId('goblin', 'leader')}`].packs!.count[0], 0);
const others = s.roster.filter(id => id !== 'goblin' && id !== 'bandit');
for (const id of others) clearQuest(w, odysseyQuestId(id, 'leader'));
assert.equal(s.defeated.length, 2); assert.equal(w.meta.vocationPoints, 4);
assert(s.prepared.includes('goblin'));
assert.equal(w.zoneMap[`quest_${odysseyQuestId('goblin', 'leader')}`].level, 60);
assert.equal(w.zoneMap[`quest_${odysseyQuestId('goblin', 'leader')}`].packs!.count[0], 0);
pass('real commander/operation/leader fights write distinct milestones; preparations survive act changes; points bank without a Vocation');

const saved = JSON.parse(JSON.stringify(serializeCharacter(w)));
const resumed = makeSimWorld('warrior', seed);
resumed.account.ledger = { ...w.account.ledger };
assert(applySavedCharacter(resumed, saved)); assert(resumed.adoptWorldState(saved.world));
assert.deepEqual(resumed.odyssey.state, s);
assert.equal(resumed.meta.vocationPoints, 4);
resumed.resumeSpawn('exact', saved.world.player);
const receipts = resumed.activeQuests.length;
resumed.odyssey.update(); assert.equal(resumed.activeQuests.length, receipts);
assert.equal(resumed.meta.vocationPoints, 4, 'resuming a completed leader ground never pays again');
pass('character and world save round-trip preserves roster, preparations, receipts, and unspent points');

clearQuest(w, odysseyQuestId('goblin', 'leader'));
assert.equal(w.account.ledger[ODYSSEY_TUTORIAL_RELEASE], 1);
assert.deepEqual(s.roster, newOdyssey(seed, {}).roster);
const points = w.meta.vocationPoints;
w.loadZone(`quest_${odysseyQuestId('goblin', 'leader')}`);
const duplicate = w.createMonster(odysseyFaction('goblin').leader, 60, 'enemy');
w.actors.push(duplicate); w.kill(duplicate, false, w.player); w.update(1 / 60);
assert.equal(w.meta.vocationPoints, points);
clearQuest(w, odysseyQuestId('bandit', 'leader'));
assert.equal(s.defeated.length, 4); assert.equal(w.meta.vocationPoints, 8);
assert(w.activeQuests.some(q => q.questId === ODYSSEY_SURVEY));
clearQuest(w, ODYSSEY_SURVEY); assert(s.surveyDone);
pass('tutorial leader releases future selection; repeat kills cannot repay; fourth victory opens a real survey preparation');

const veteran = makeSimWorld('warrior', seed);
veteran.account.ledger['tutorial_faction:goblin'] = 1;
veteran.account.ledger[ODYSSEY_TUTORIAL_RELEASE] = 1;
veteran.loadZone(START_ZONE); veteran.odyssey.update();
assert.equal(veteran.activeQuests.filter(q => q.questId.startsWith('odyssey_')).length, 8);
assert(!veteran.activeQuests.some(q => q.questId.startsWith('revenge_')));
assert(!veteran.zoneMap[`quest_${revengeCommanderId('goblin')}`]);
for (const id of [revengeCullId('goblin'), revengeCommanderId('goblin')]) {
  assert.equal(QUESTS[id].gate!({ classId: 'warrior', vocations: [],
    runLedger: {}, accountLedger: veteran.account.ledger }), false);
}
pass('settled accounts start fresh campaigns without resurrecting the vendetta through initialization or the quest giver');

// A quiet, flat, connected field for perception and pathing; the real brain,
// line-of-sight, portal-arrival and kill code drive every transition below.
const p = makeSimWorld('warrior', seed);
p.zone.objective = { kind: 'none' }; p.zone.packs = { count: [0, 0], size: [1, 1], table: [{ id: 'bandit_cutthroat', weight: 1 }] };
p.zoneMap.odyssey_probe_dest = { ...p.zone, id: 'odyssey_probe_dest', exits: [] };
p.exits = [{ pos: vec(1400, 600), to: 'odyssey_probe_dest', label: 'Road out', radius: 40, defIndex: 0 }];
p.odyssey.state = newOdyssey(seed, {}); p.odyssey.state.initialized = true;
p.odyssey.state.defeated = [...others];
const ps = p.odyssey.state;
ps.nextScoutAt = 1; p.time = 2; p.odyssey.update();
assert(ps.scout); assert.equal(ps.scout.phase, 'watch'); assert(!ps.report);
const scout = p.actors.find(a => a.tag === 'odyssey_scout')!;
scout.pos = vec(1000, 600); p.player.pos = vec(700, 600); scout.facing = 0;
p.time += 1; p.odyssey.update(); assert.equal(ps.scout.phase, 'watch', 'outside facing cone does not detect');
scout.facing = angleTo(scout.pos, p.player.pos);
p.doodads.push({ kind: 'rock', pos: vec(850, 600), radius: 100, rot: 0 }); p.markDoodadsChanged();
p.time += 1; p.odyssey.update(); assert.equal(ps.scout.phase, 'watch', 'cover prevents detection');
p.doodads.length = 0; p.markDoodadsChanged();
p.time += 1; p.odyssey.update(); assert.equal(ps.scout.phase, 'spotted'); assert(!ps.report);
const before = scout.pos.x;
updateAI(scout, p, 0.1); assert.equal(scout.pos.x, before, 'spotted cue buys a real interception window');
p.time += C.bandit.warningSec; p.odyssey.update(); assert(scout.aiFleeing);
p.odyssey.escaped(scout); assert(!ps.report, 'early arrival call cannot manufacture an escape');
for (let i = 0; i < 600 && ps.scout; i++) {
  p.time += 1 / 60; updateAI(scout, p, 1 / 60); p.odyssey.update();
}
assert(!ps.scout); assert(ps.report); assert(!p.actors.includes(scout));
assert(!p.actors.some(a => a.tag?.startsWith('odyssey_hunt:')));
p.time += C.bandit.responseDelaySec; p.odyssey.update();
assert.equal(p.actors.filter(a => a.tag?.startsWith('odyssey_hunt:')).length, C.bandit.hunters[2]);
const hunter = p.actors.find(a => a.tag?.startsWith('odyssey_hunt:'))!;
const reportGoal = p.odyssey.snapshot()!.report!;
const huntDistance = Math.hypot(hunter.pos.x - reportGoal.x, hunter.pos.y - reportGoal.y);
for (let i = 0; i < 60; i++) { p.time += 1 / 60; updateAI(hunter, p, 1 / 60); }
assert(Math.hypot(hunter.pos.x - reportGoal.x, hunter.pos.y - reportGoal.y) < huntDistance, 'dispatched hunters actually march to the sighting');
p.kill(hunter, false, p.player);
const survivingHunter = p.actors.find(a => !a.dead && a.tag?.startsWith('odyssey_hunt:'))!;
survivingHunter.life *= 0.5;
const survivor = { tag: survivingHunter.tag, defId: survivingHunter.defId, life: survivingHunter.life };
const reportExits = p.exits;
p.loadZone(START_ZONE); p.loadZone(SIM_ARENA_ID); p.odyssey.update();
const returnedHunter = p.actors.find(a => a.tag === survivor.tag)!;
assert(returnedHunter);
assert.equal(returnedHunter.defId, survivor.defId, 'casualties do not reassign surviving hunter kits on re-entry');
assert.equal(returnedHunter.life, survivor.life, 'surviving hunter wounds persist through zone travel');
p.exits = reportExits;
for (const a of [...p.actors]) if (a.tag?.startsWith('odyssey_hunt:')) p.kill(a, false, p.player);
p.odyssey.update(); assert(!ps.report);
ps.nextScoutAt = p.time; p.odyssey.update();
const intercepted = p.actors.find(a => a.tag === 'odyssey_scout')!; assert(intercepted);
p.kill(intercepted, false, p.player); p.odyssey.update(); assert(!ps.scout); assert(!ps.report);
pass('scouts respect facing and real cover, warn before flight, walk to a real exit, send delayed hunters only on escape, and can be intercepted');

// Clocks run away from town. The actual return seats real combat waves; the
// vendor's existing shared refusal is the consequence, not a cosmetic notice.
ps.nextSiegeAt = p.time; p.odyssey.update(); assert.equal(ps.siege?.phase, 'warning');
assert(p.objectiveText().includes('Return to Lastlight'));
p.time += C.goblin.warningSec; p.odyssey.update(); assert.equal(ps.siege?.phase, 'active');
p.time += C.goblin.defenseSec; p.odyssey.update(); assert.equal(ps.siege?.phase, 'raided');
const pressureSave = p.odyssey.snapshot()!;
p.odyssey.restore(JSON.parse(JSON.stringify(pressureSave))); assert.equal(p.odyssey.state!.siege?.phase, 'raided');
p.loadZone(START_ZONE); p.odyssey.update(); assert(p.vendorTradeRefusal()?.includes('Goblins'));
const initial = p.actors.filter(a => a.tag?.startsWith('odyssey_siege:')); assert.equal(initial.length, C.goblin.waveSize);
initial[0].life *= 0.5;
const damaged = p.odyssey.snapshot()!; assert(damaged.siege!.bodies!.some(b => b.life < 1));
const townSave = JSON.parse(JSON.stringify(serializeCharacter(p)));
const townResume = makeSimWorld('warrior', seed);
assert(applySavedCharacter(townResume, townSave)); assert(townResume.adoptWorldState(townSave.world));
townResume.resumeSpawn('exact', townSave.world.player); townResume.odyssey.update();
assert(townResume.vendorTradeRefusal()?.includes('Goblins'));
assert.equal(townResume.actors.filter(a => a.tag?.startsWith('odyssey_siege:')).length, C.goblin.waveSize);
assert(townResume.actors.some(a => a.tag?.startsWith('odyssey_siege:') && a.life < a.maxLife()));
p.loadZone(SIM_ARENA_ID); p.loadZone(START_ZONE); p.odyssey.update();
assert(p.actors.some(a => a.tag?.startsWith('odyssey_siege:') && a.life < a.maxLife()));
for (let wave = 0; wave < 6 && p.odyssey.state!.siege; wave++) {
  for (const a of [...p.actors]) if (a.tag?.startsWith('odyssey_siege:')) p.kill(a, false, p.player);
  p.time += C.goblin.waveGapSec; p.odyssey.update();
}
assert(!p.odyssey.state!.siege); assert(!p.vendorTradeRefusal()?.includes('Goblins'));
assert.equal(p.odyssey.state!.defenses, 1); assert(p.odyssey.state!.nextSiegeAt > p.time);
pass('off-zone warning/deadline forces a return; raid closes real trade; saved wound/wave progress persists; defense restores trade and buys respite');

console.log('ALL ODYSSEY CHECKS PASS');
