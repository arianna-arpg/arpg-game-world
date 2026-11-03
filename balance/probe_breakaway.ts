import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { makeSkillInstance } from '../src/engine/skills';
import { applySnapshot, serializeSnapshot } from '../src/net/snapshot';

const w = makeSimWorld('warrior', 8124);
seedGlobalRandom(8124);
const p = w.player, spider = w.createMonster('broodmother', 1, 'enemy');
w.actors = [p, spider];
spider.pos = { x: p.pos.x + 64, y: p.pos.y };
const pin = () => p.statuses.find(s => s.id === 'rooted');
const feed = (dx: number, physical = dx) => w.applyInputs(new Map([[w.localSeat.id,
  { dx, dy: 0, breakawayAxis: physical, aim: p.pos, held: [], edge: [] }]]), 1 / 60);

// Take the actual projectile through its normal chance, attribution and clock.
for (let i = 0; i < 12 && !pin(); i++) {
  w.executeSkill(spider, makeSkillInstance(SKILLS.web_shot), p.pos);
  for (let f = 0; f < 30 && !pin(); f++) w.update(1 / 60);
}
assert.equal(pin()?.casterId, spider.id);
assert.equal(pin()?.sourceName, spider.name);
assert.equal(pin()?.statusDuration, 1.8);
assert(w.movementLocked(p));
assert(!p.isStunned());
assert(p.tagsForbidden(makeSkillInstance(SKILLS.dash)));
assert(!p.tagsForbidden(makeSkillInstance(SKILLS.firebolt)));
const pos = { ...p.pos };
for (const dx of [0.25, 1, 1, 0, 1]) feed(dx);
assert.deepEqual(p.pos, pos);
assert.equal(pin()?.breakaway, 1);
p.applyStatus('rooted', 0, 1, 'second web');
feed(1, -1); // Physical left under inverted movement.
assert.equal(pin()?.breakaway, -2);
const client = makeSimWorld('warrior', 8125);
applySnapshot(client, JSON.parse(JSON.stringify(serializeSnapshot(w, 1))));
assert.equal(client.player.statuses.find(s => s.id === 'rooted')?.breakaway, -2);
assert(client.movementLocked(client.player));
feed(1); feed(-1);
assert(!w.movementLocked(p));
p.updateTimers(1 / 60);
assert(!pin());
p.vel = { x: 80, y: 12 };
p.applyStatus('rooted', 0, 1, 'new web');
assert.deepEqual(p.vel, { x: 0, y: 0 });
assert.equal(pin()?.breakaway, undefined);
p.updateTimers(2.01);
assert(!pin());
p.applyStatus('ensnared', 0, 1, 'briars');
assert(!w.movementLocked(p));
console.log('PASS spider projectile, pin, ordinary actions, alternating escape, refresh, replica, expiry and soft snare');
