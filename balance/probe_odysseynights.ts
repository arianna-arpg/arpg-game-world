import assert from 'node:assert/strict';
import { makeSimWorld, SIM_ARENA_ID } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { newOdyssey, restoreOdyssey } from '../src/world/odyssey';
import { restoreRisingClocks } from '../src/world/odysseyRisings';
import { ODYSSEY_RISINGS, risingInterval, risingTag } from '../src/data/odysseyRisings';
import { odysseyQuestId } from '../src/data/odyssey';
import { MONSTERS } from '../src/data/monsters';
import { START_ZONE } from '../src/data/zones';
import { GridWalkField } from '../src/world/gridWalk';
import { dist, vec } from '../src/core/math';
import { updateAI } from '../src/engine/ai';
import type { World } from '../src/engine/world';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { effectVoiceOf } from '../src/render/vis/effectVoice';
import '../src/render/vis/groundRising';

seedGlobalRandom(0xdead123);
const c = ODYSSEY_RISINGS[0], tag = risingTag(c.id);
let seed = 1;
while (!newOdyssey(seed, {}).roster.includes(c.faction)) seed++;
const pass = (s: string): void => console.log(`PASS ${s}`);
const live = (w: World) => w.actors.filter(a => !a.dead && a.tag === tag);
function field(): World {
  const w = makeSimWorld('warrior', seed);
  w.loadZone(START_ZONE); w.odyssey.update(); w.loadZone(SIM_ARENA_ID);
  w.zone.objective = { kind: 'none' }; w.zone.level = 8;
  w.time = 125;
  w.doodads = [{ kind: 'tombstone', pos: vec(1120, 600), radius: 22 }];
  w.markDoodadsChanged(); w.odyssey.update();
  return w;
}
function warn(w: World): void {
  w.odyssey.state!.risings![c.id].nextAt = w.time;
  w.odyssey.update();
}
function resolve(w: World): void { w.time += c.warningSec; w.odyssey.update(); }

assert.deepEqual(c.everySec.map((_, i) => risingInterval(c, i, false)), [32, 24, 16, 10]);
assert.equal(risingInterval(c, 3, true), 20);
for (const id of c.roster) assert.equal(MONSTERS[id]?.faction, 'undead');
assert(c.fieldCap >= c.batch && c.warningSec < Math.min(...c.everySec));
pass('content resolves and cadence escalates with defeated leaders; preparation halves frequency');

const w = field();
const clock = w.odyssey.state!.risings![c.id];
assert.equal(clock.nextAt, w.time + c.entryGraceSec);
assert.equal(w.odyssey.pressureText(), null);
const textCount = w.texts.length, noticeCount = w.notices.length, objective = w.objectiveText();
warn(w);
const sites = w.flashes.filter(f => f.fx === c.cue.fx && f.life > 0);
assert.equal(sites.length, c.batch);
assert.equal(w.texts.length, textCount, 'the warning adds no text');
assert.equal(w.notices.length, noticeCount, 'the warning adds no notice');
assert.equal(w.objectiveText(), objective, 'the warning does not replace the objective with instructions');
assert(!w.odyssey.status().includes('every '), 'no prose tutorial of the rising cadence');
assert(effectVoiceOf(c.cue.fx) && effectVoiceOf(c.cue.settleFx), 'authored voices resolve');
const wire = serializeSnapshot(w, 1);
const remote = makeSimWorld('warrior', seed);
applySnapshot(remote, wire);
assert.deepEqual(remote.flashes.filter(f => f.fx === c.cue.fx).map(f => [f.pos, f.life, f.maxLife]),
  sites.map(f => [{ x: Math.round(f.pos.x * 100) / 100, y: Math.round(f.pos.y * 100) / 100 }, f.life, f.maxLife]),
  'co-op shares cue positions at native wire precision and exact progress');
assert.equal(live(w).length, 0, 'warning precedes all bodies');
assert.equal(w.odyssey.pressureText(), null);
assert(w.flashes.some(f => f.color === c.cue.color && f.maxLife === c.warningSec));
w.time += c.warningSec - 0.1; w.odyssey.update(); assert.equal(live(w).length, 0);
w.time += 0.1; w.odyssey.update(); assert.equal(live(w).length, c.batch);
assert.equal(w.odyssey.pressureText(), null, 'ordinary objective returns after the warning');
for (const a of live(w)) {
  assert(a.fromZoneGen && a.name === MONSTERS[a.defId!].name);
  assert(sites.some(site => dist(site.pos, a.pos) < 0.001), 'each body emerges at its shown patch');
  assert.equal(a.level, w.zone.level);
  assert(dist(a.pos, w.player.pos) >= c.sourceRange[0]);
  assert(dist(a.pos, w.doodads[0].pos) > a.radius + w.doodads[0].radius);
  assert(a.aiCommand);
}
const marcher = live(w)[0], before = dist(marcher.pos, w.player.pos);
for (let i = 0; i < 60; i++) { w.time += 1 / 60; updateAI(marcher, w, 1 / 60); }
assert(dist(marcher.pos, w.player.pos) < before, 'ordinary assault AI actually approaches the warned sighting');
pass('real warning, attributed local-level bodies, collision-safe placement and native approach AI');

// Ordinary zone memory, not a second Odyssey-owned body save.
live(w)[0].life *= 0.5;
const survivor = live(w)[0];
const memo = { name: survivor.name, defId: survivor.defId, life: survivor.life };
w.kill(live(w)[1], false, w.player);
const saved = JSON.parse(JSON.stringify(serializeCharacter(w)));
const restored = makeSimWorld('warrior', seed);
assert(applySavedCharacter(restored, saved)); assert(restored.adoptWorldState(saved.world));
restored.resumeSpawn('exact', saved.world.player); restored.odyssey.update();
assert.equal(live(restored).length, 1, 'reload neither duplicates bodies nor resurrects casualties');
assert.deepEqual({ name: live(restored)[0].name, defId: live(restored)[0].defId, life: live(restored)[0].life }, memo);
assert.equal(restored.odyssey.state!.risings![c.id].interval, clock.interval);
w.loadZone(START_ZONE); w.loadZone(SIM_ARENA_ID); w.odyssey.update();
assert.equal(live(w).length, 1); assert.equal(live(w)[0].life, memo.life);
pass('ordinary save/reload and zone travel retain source identity, kit, wounds and casualties exactly once');

const gates = field();
for (const phaseTime of [20, 100, 220]) {
  gates.time = phaseTime; warn(gates); resolve(gates); assert.equal(live(gates).length, 0);
}
gates.time = 130;
gates.zone.objective = { kind: 'safe' }; warn(gates); resolve(gates); assert.equal(live(gates).length, 0);
gates.zone.objective = { kind: 'none' }; gates.zone.sky = 'sheltered';
warn(gates); resolve(gates); assert.equal(live(gates).length, 0);
gates.zone.sky = 'open'; gates.doodads[0].tier = 1;
warn(gates); resolve(gates); assert.equal(live(gates).length, 0);
gates.doodads[0].tier = 0; gates.doodads[0].kind = 'brazier';
warn(gates); resolve(gates); assert.equal(live(gates).length, 0);
gates.doodads[0].kind = 'tombstone'; gates.markDoodadsChanged();
warn(gates); gates.doodads[0].gone = true; resolve(gates); assert.equal(live(gates).length, 0);
gates.doodads[0].gone = false;
warn(gates); gates.player.pos = vec(200, 200); resolve(gates); assert.equal(live(gates).length, 0);
gates.player.pos = vec(800, 600);
warn(gates); gates.time = 216; gates.odyssey.update(); assert.equal(live(gates).length, 0, 'dawn cancels an armed rising');
gates.time = 130; warn(gates); gates.odyssey.leaveZone(); resolve(gates); assert.equal(live(gates).length, 0);
gates.odyssey.state!.roster = gates.odyssey.state!.roster.map(id => id === 'undead' ? 'test_absent' : id);
gates.odyssey.update(); assert(!gates.odyssey.state!.risings![c.id]);
pass('daylight, sanctuary, shelter, other stories, unsuitable/lost sources, walking away, travel and absent factions suppress risings');

const geometry = field();
geometry.doodads.push({ kind: 'rock', pos: vec(1120, 600), radius: 170 }); geometry.markDoodadsChanged();
warn(geometry); resolve(geometry); assert.equal(live(geometry).length, 0, 'no wall births or teleport fallback');
geometry.doodads.pop(); geometry.markDoodadsChanged();
geometry.exits = [{ pos: vec(1120, 600), to: START_ZONE, radius: 80, label: 'Town', defIndex: 0 }];
warn(geometry); resolve(geometry); assert.equal(live(geometry).length, 0, 'portal clearance');
geometry.exits = [];
const grid = new GridWalkField(1600, 1200);
grid.fillRegion(0, 0, 1600, 1200, 'ground');
grid.fillRegion(950, 0, 1010, 1200, 'wall');
geometry.walk = grid;
warn(geometry); resolve(geometry); assert.equal(live(geometry).length, 0, 'disconnected scenery cannot strand enemies');
pass('solid terrain, portal clearance and disconnected walk regions reject births');

const blocked = field();
warn(blocked);
const marked = blocked.flashes.filter(f => f.fx === c.cue.fx && f.life > 0);
assert.equal(marked.length, 2);
for (const patch of marked) blocked.doodads.push({ kind: 'rock', pos: { ...patch.pos }, radius: 20 });
blocked.markDoodadsChanged(); resolve(blocked);
assert.equal(live(blocked).length, 0, 'blocked committed sites never relocate to unmarked terrain');
assert(marked.every(f => f.life === 0), 'blocked hands withdraw');
assert(blocked.flashes.some(f => f.fx === c.cue.settleFx && f.life > 0), 'the soil visibly settles');
pass('births honor actual marked ground; interruptions settle without text or surprise relocation');

const cancellation = field();
warn(cancellation); cancellation.doodads[0].pos.x += 30;
resolve(cancellation); assert.equal(live(cancellation).length, 0, 'a moved source cannot move the warned birth site');
warn(cancellation); cancellation.player.downed = true; resolve(cancellation);
assert.equal(live(cancellation).length, 0);
cancellation.player.downed = false; cancellation.odyssey.update();
assert(cancellation.odyssey.state!.risings![c.id].nextAt >= cancellation.time + c.entryGraceSec);
warn(cancellation); cancellation.clientActionHook = () => {}; resolve(cancellation);
assert.equal(live(cancellation).length, 0, 'clients cannot materialize host pressure');
cancellation.clientActionHook = undefined; cancellation.odyssey.update();
warn(cancellation); cancellation.time = 200; cancellation.odyssey.update();
assert.equal(live(cancellation).length, c.batch, 'a late frame resolves at most the warned batch');
assert(cancellation.odyssey.state!.risings![c.id].nextAt > cancellation.time);
cancellation.odyssey.update(); assert.equal(cancellation.odyssey.pressureText(), null, 'no catch-up warning burst');
pass('moved sources and incapacitation cancel; clients do not spawn; delayed ticks never catch up multiple risings');

const cap = field();
for (let i = 0; i < 12; i++) { warn(cap); resolve(cap); }
assert.equal(live(cap).length, c.fieldCap);
cap.kill(live(cap)[0], false, cap.player);
warn(cap); resolve(cap); assert.equal(live(cap).length, c.fieldCap, 'partial batch honors the final cap slot');
const cs = cap.odyssey.state!, other = cs.roster.find(id => id !== c.faction)!;
cs.risings![c.id].nextAt = cap.time + 20;
cs.defeated.push(other); cap.odyssey.update();
assert.equal(cs.risings![c.id].interval, 24);
assert.equal(cs.risings![c.id].nextAt, cap.time + 15, 'remaining cooldown rescales at act transition');
cs.prepared.push(c.faction); cap.odyssey.update();
assert.equal(cs.risings![c.id].nextAt, cap.time + 30, 'preparation immediately eases remaining cooldown');
assert.equal(cs.risings![c.id].interval, 48);
pass('bounded population, partial batches, live act/preparation cadence without instruction text');

const campaign = field();
function clearQuest(id: string): void {
  campaign.loadZone(`quest_${id}`);
  for (const a of [...campaign.actors]) if (a.team === 'enemy' && !a.dead && !a.invulnerable) campaign.kill(a, false, campaign.player);
  campaign.update(1 / 60);
  assert(campaign.completedObjectives.has(`quest_${id}`));
}
clearQuest(odysseyQuestId('undead', 'operation'));
assert(campaign.odyssey.state!.prepared.includes('undead'));
campaign.odyssey.update(); // objective receipts are written after the pressure tick
assert.equal(campaign.odyssey.state!.risings![c.id].interval, 64);
clearQuest(odysseyQuestId('undead', 'leader'));
campaign.loadZone(SIM_ARENA_ID); campaign.time = 130; campaign.odyssey.update();
assert(!campaign.odyssey.state!.risings![c.id]);
assert(!campaign.odyssey.status().includes('Undead nights'));
assert.equal(live(campaign).length, 0);
assert.equal(campaign.meta.vocationPoints, 2);
pass('real crypt and leader objectives weaken then end future risings without changing campaign rewards');

assert.deepEqual(restoreRisingClocks({ [c.id]: { nextAt: -1, interval: 10 }, unknown: { nextAt: 1, interval: 1 } }), {});
assert.deepEqual(restoreRisingClocks({ [c.id]: { nextAt: 1, interval: 0 } }), {});
const old = newOdyssey(seed, {}); assert.equal(restoreOdyssey(old, seed, {}).risings, undefined);
pass('optional clocks preserve old saves and reject malformed or unknown pressure rows');
console.log('ALL ODYSSEY NIGHTS CHECKS PASS');
