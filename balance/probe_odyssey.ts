import assert from 'node:assert/strict';
import { makeSimWorld, SIM_ARENA_ID } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { newOdyssey, restoreOdyssey, defeatOdysseyLeader, odysseyAct } from '../src/world/odyssey';
import { odysseyEscalationTier, odysseyPressureTier } from '../src/world/odysseyPressure';
import { odysseyPressureInterval, odysseyTierValue } from '../src/data/odysseyPressure';
import { ODYSSEY_RISINGS } from '../src/data/odysseyRisings';
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
import { odysseyMilestoneKey, powerProgressionOpen } from '../src/data/powerProgression';
import { ORACLE_RESCUED } from '../src/data/oracle';

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

for (const faction of ODYSSEY_FACTIONS) {
  const s = newOdyssey(1, {});
  s.roster = [faction.id, ...ODYSSEY_FACTIONS.filter(f => f.id !== faction.id).slice(0, 3).map(f => f.id)];
  const mechanic = { faction: faction.id, startsAfter: 1 }, later = { ...mechanic, startsAfter: 2 };
  assert.equal(odysseyEscalationTier(s, faction.id), 0);
  assert.equal(odysseyPressureTier(s, { ...mechanic, startsAfter: 0 }), null, 'tier zero is always dormant');
  assert.equal(odysseyEscalationTier(s, 'absent'), null);
  for (const [index, id] of s.roster.slice(1).reverse().entries()) {
    assert(defeatOdysseyLeader(s, id));
    assert(!defeatOdysseyLeader(s, id), 'duplicate leader receipts cannot escalate twice');
    assert.equal(odysseyEscalationTier(s, id), null, 'eliminated factions have no pressure');
    assert.equal(odysseyPressureTier(s, mechanic), index + 1);
    assert.equal(odysseyPressureTier(s, later), index >= 1 ? index + 1 : null);
  }
  assert(defeatOdysseyLeader(s, faction.id));
  assert.equal(odysseyPressureTier(s, mechanic), null);
  assert.equal(odysseyPressureTier(s, later), null);
}
for (const def of [C.bandit, C.goblin, ...ODYSSEY_RISINGS]) {
  assert.equal(def.startsAfter, 1, `${def.id} begins after one elimination`);
  for (let tier = 1; tier < C.rosterSize; tier++) {
    assert(Number.isFinite(odysseyPressureInterval(def, tier, false)));
    assert(odysseyPressureInterval(def, tier, false) > 0);
    if (tier > 1) assert(odysseyPressureInterval(def, tier, false) < odysseyPressureInterval(def, tier - 1, false));
  }
  assert.equal(odysseyPressureInterval(def, 99, false), def.everySec.at(-1));
}
pass('every faction follows the shared dormant/1/2/3/eliminated law; data rows accumulate and retain their final tuning');

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
delete w.account.ledger[odysseyMilestoneKey(1)];
delete w.account.ledger[odysseyMilestoneKey(2)];
w.loadZone(START_ZONE); w.odyssey.update();
const s = w.odyssey.state!;
assert.equal(w.activeQuests.filter(q => q.questId.startsWith('odyssey_')).length, 8);
assert(w.zoneMap[`quest_${revengeCommanderId('goblin')}`]);
assert.equal(w.meta.vocations.length, 0);
assert(w.activeQuests.find(q => q.zoneId === `quest_${revengeCullId('goblin')}`)?.directionsKnown);
assert(!w.surveyed.has(`quest_${revengeCullId('goblin')}`));
assert(!w.surveyed.has(`quest_${revengeCommanderId('goblin')}`), 'the undiscovered commander remains unknown');
w.odyssey.localLeads();
assert.equal(s.leads.length, 4);
for (const id of s.roster) {
  const leaderZone = w.zoneMap[`quest_${odysseyQuestId(id, 'leader')}`];
  assert(w.activeQuests.find(q => q.zoneId === leaderZone.id)?.directionsKnown);
  assert(!w.surveyed.has(leaderZone.id), 'leads grant bearings without surveying terrain');
}
pass('operations and all leaders exist independently, including the exploration-accessible tutorial commander');

function clearQuest(world: World, id: string): void {
  world.loadZone(`quest_${id}`);
  assert(world.actors.some(a => a.team === 'enemy' && !a.dead && !a.invulnerable), `${id} must contain a fight`);
  for (const a of [...world.actors]) if (a.team === 'enemy' && !a.dead && !a.invulnerable) world.kill(a, false, world.player);
  world.update(1 / 60);
  assert(world.completedObjectives.has(`quest_${id}`), `${id} objective completes through gameplay`);
}

// The requested sequence through real objective completions, including the
// initial quiet world even after enough time for every pressure to be overdue.
let progressionSeed = 1;
const example = ['undead', 'goblin', 'bandit', 'gnoll'];
while (!example.every(id => newOdyssey(progressionSeed, {}).roster.includes(id))) progressionSeed++;
const progression = makeSimWorld('warrior', progressionSeed);
progression.loadZone(START_ZONE); progression.odyssey.update();
const es = progression.odyssey.state!;
progression.time = 10000; progression.odyssey.update();
assert.equal(es.nextScoutAt, 0); assert.equal(es.nextSiegeAt, 0);
assert(!es.scout && !es.report && !es.siege);
assert.equal(Object.keys(es.risings ?? {}).length, 0);
clearQuest(progression, odysseyQuestId('gnoll', 'operation'));
assert.equal(odysseyEscalationTier(es, 'undead'), 0, 'optional operations never awaken other factions');
for (const [index, id] of ['gnoll', 'goblin', 'bandit', 'undead'].entries()) {
  clearQuest(progression, odysseyQuestId(id, 'leader'));
  progression.odyssey.update(); // objective receipts follow the pressure tick
  for (const f of example) assert.equal(odysseyEscalationTier(es, f), es.defeated.includes(f) ? null : index + 1);
  if (index === 0) {
    assert.equal(es.nextScoutAt, progression.time + C.bandit.everySec[1]);
    assert.equal(es.nextSiegeAt, progression.time + C.goblin.everySec[1]);
    assert(es.risings!.undead_nights);
    assert(!es.scout && !es.siege, 'activation starts a full cooldown, never an overdue burst');
    // First-tier sieges are real two-wave encounters, not the old zero entry.
    es.nextSiegeAt = progression.time; progression.odyssey.update();
    assert.equal(es.siege!.waves, 2);
  }
  const copy = restoreOdyssey(JSON.parse(JSON.stringify(progression.odyssey.snapshot())), progressionSeed, {});
  assert.deepEqual(JSON.parse(JSON.stringify(copy)), JSON.parse(JSON.stringify(es)));
}
assert.equal(es.nextScoutAt, 0); assert.equal(es.nextSiegeAt, 0);
assert(!es.scout && !es.report && !es.siege);
assert.equal(Object.keys(es.risings ?? {}).length, 0);
pass('real Gnoll/Goblin/Bandit/Undead eliminations awaken all survivors together and persist every tier');

const pacing = makeSimWorld('warrior', progressionSeed);
pacing.loadZone(START_ZONE); pacing.odyssey.update();
const ts = pacing.odyssey.state!;
ts.defeated = ['gnoll']; ts.prepared = ['bandit', 'goblin'];
pacing.time = 100; pacing.odyssey.update();
assert.equal(ts.nextScoutAt, pacing.time + C.bandit.everySec[1] * C.bandit.preparedInterval);
assert.equal(ts.nextSiegeAt, pacing.time + C.goblin.everySec[1] * C.goblin.preparedInterval);
ts.prepared = []; pacing.odyssey.update();
assert.equal(ts.nextScoutAt, 280); assert.equal(ts.nextSiegeAt, 1000);
pacing.time += 60; ts.defeated.push('undead'); pacing.odyssey.update();
assert.equal(ts.nextScoutAt, 240, 'two-thirds of the scout cooldown remains at tier two');
assert.equal(ts.nextSiegeAt, 832, 'remaining siege cooldown rescales at tier two');
ts.prepared.push('bandit', 'goblin'); pacing.odyssey.update();
assert.equal(ts.nextScoutAt, 300); assert.equal(ts.nextSiegeAt, 1168);
const ticking = JSON.parse(JSON.stringify(pacing.odyssey.snapshot()));
pacing.odyssey.restore(ticking); pacing.odyssey.update();
assert.deepEqual(pacing.odyssey.snapshot(), ticking, 'reload never resets active cooldown progress');
delete ticking.scoutInterval; delete ticking.siegeInterval;
pacing.odyssey.restore(ticking); pacing.odyssey.update();
assert.equal(pacing.odyssey.state!.nextScoutAt, 300, 'older active saves retain their deadlines');
assert.equal(pacing.odyssey.state!.nextSiegeAt, 1168);
assert.equal(odysseyTierValue(C.goblin.waves, 3), 4);
pass('first pressure honors preparation; tier and preparation changes retime remaining cooldowns; reload preserves progress');

const stale = JSON.parse(JSON.stringify(progression.odyssey.snapshot()));
stale.defeated = []; stale.nextScoutAt = 1; stale.nextSiegeAt = 1;
stale.scoutInterval = -1; stale.siegeInterval = 0;
stale.scout = { id: 'odyssey_messenger', zoneId: START_ZONE, phase: 'watch', x: 1, y: 1, life: 1 };
stale.report = { zoneId: START_ZONE, arrivesAt: 1, x: 1, y: 1, remaining: ['odyssey_hunt:0'] };
stale.siege = { phase: 'raided', deadline: 1, wave: 1, waves: 2, remaining: [], nextWaveAt: 0, level: 23 };
stale.risings = { undead_nights: { nextAt: 1, interval: 32 } };
pacing.odyssey.restore(stale);
const quiet = pacing.odyssey.state!;
assert.equal(quiet.nextScoutAt, 0); assert.equal(quiet.nextSiegeAt, 0);
assert(!quiet.scout && !quiet.report && !quiet.siege && !quiet.scoutInterval && !quiet.siegeInterval);
assert.equal(Object.keys(quiet.risings!).length, 0);
assert.equal(pacing.odyssey.tradeRefusal(), null);
pass('restoring a dormant campaign discards stale pressure, overdue clocks and trade lockouts');

clearQuest(w, revengeCommanderId('goblin'));
assert.equal(s.defeated.length, 0);
assert(!powerProgressionOpen(w.account.ledger, 'vocations'));
assert(!w.account.ledger[ODYSSEY_TUTORIAL_RELEASE]);
clearQuest(w, odysseyQuestId('goblin', 'operation'));
assert(s.prepared.includes('goblin'));
assert.equal(w.zoneMap[`quest_${odysseyQuestId('goblin', 'leader')}`].packs!.count[0], 0);
const others = s.roster.filter(id => id !== 'goblin' && id !== 'bandit');
for (const [index, id] of others.entries()) {
  clearQuest(w, odysseyQuestId(id, 'leader'));
  assert(powerProgressionOpen(w.account.ledger, 'vocations'));
  assert.equal(powerProgressionOpen(w.account.ledger, 'awakening'), index >= 1);
  assert(w.accountDirty);
}
assert.equal(s.defeated.length, 2); assert.equal(w.meta.vocationPoints, 4);
assert(s.prepared.includes('goblin'));
assert.equal(w.zoneMap[`quest_${odysseyQuestId('goblin', 'leader')}`].level, 60);
assert.equal(w.zoneMap[`quest_${odysseyQuestId('goblin', 'leader')}`].packs!.count[0], 0);
pass('real commander/operation/leader fights write distinct milestones; preparations survive act changes; points bank without a Vocation');

const saved = JSON.parse(JSON.stringify(serializeCharacter(w)));
const resumed = makeSimWorld('warrior', seed);
resumed.account.ledger = { ...w.account.ledger };
delete resumed.account.ledger[odysseyMilestoneKey(1)];
delete resumed.account.ledger[odysseyMilestoneKey(2)];
assert(applySavedCharacter(resumed, saved)); assert(resumed.adoptWorldState(saved.world));
assert(powerProgressionOpen(resumed.account.ledger, 'awakening'), 'validated saved campaign restores account milestones');
assert.deepEqual(resumed.odyssey.state, s);
assert.equal(resumed.meta.vocationPoints, 4);
resumed.resumeSpawn('exact', saved.world.player);
const receipts = resumed.activeQuests.length;
resumed.odyssey.update(); assert.equal(resumed.activeQuests.length, receipts);
assert.equal(resumed.meta.vocationPoints, 4, 'resuming a completed leader ground never pays again');
pass('character and world save round-trip preserves roster, preparations, receipts, and unspent points');

const unearned = makeSimWorld('warrior', seed);
unearned.account.ledger = { 'odyssey_leader:goblin': 100, 'odyssey_leader:bandit': 100 };
unearned.odyssey.restore(undefined);
assert(!powerProgressionOpen(unearned.account.ledger, 'awakening'), 'lifetime faction kills never synthesize depth');
unearned.metaProgressionActive = () => false;
unearned.odyssey.restore(saved.world.odyssey);
assert(!powerProgressionOpen(unearned.account.ledger, 'awakening'), 'non-progressing mode cannot earn account milestones');
pass('historical faction totals and non-progressing modes cannot bypass milestone receipts');

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
veteran.account.ledger[ORACLE_RESCUED] = 1;
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
