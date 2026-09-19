import assert from 'node:assert/strict';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { MAGIC_PACKS } from '../src/data/magicPacks';
import { SKILLS } from '../src/data/skills';
import { magicPackErrors, magicPackPool } from '../src/engine/magicPacks';
import { mod } from '../src/engine/stats';
import { SIM_TAP } from '../src/engine/tap';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { START_ZONE } from '../src/data/zones';

bootSimEngine(); let seed = 38213;
function fixture(recipe: string, count = 3) {
  const w = makeSimWorld('warrior', seed++);
  w.zoneMap.qa_pack_events = { id: 'qa_pack_events', name: 'Pack events', level: 20, size: { w: 1800, h: 1200 },
    theme: w.zone.theme, seed: 132, layout: [], objective: { kind: 'clear', all: true }, exits: [], map: { x: 9000, y: 9000 } };
  w.loadZone('qa_pack_events'); w.visited.add(w.zone.id); w.actors = [w.player];
  w.player.pos = { x: 780, y: 500 }; w.player.sheet.setSource('probe-life', [mod('life', 'flat', 100000)]); w.player.fillResources();
  const members = Array.from({ length: count }, (_, i) => {
    const a = w.createMonster('skeleton_warrior', 20, 'enemy'); a.fromZoneGen = true;
    a.pos = { x: 700 + 160 * i, y: 500 }; w.actors.push(a); return a;
  });
  const speed = members[0].sheet.get('moveSpeed'); assert.ok(w.promoteMagicPack(members, recipe));
  if (recipe === 'encirclement') { members[1].pos = { x: 900, y: 500 }; members[2].pos = { x: 800, y: 700 }; w.player.pos = { x: 800, y: 550 }; }
  if (recipe === 'mending_relay') members[1].life = members[1].maxLife() * 0.4;
  const advance = (seconds: number, hz = 60) => { for (let i = 0; i < Math.round(seconds * hz); i++) w.refreshMagicPacks(1 / hz); };
  return { w, members, advance, speed };
}
const check = (label: string, run: () => void) => { run(); console.log(`PASS ${label}`); };
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

check('content validates, level gates unlock gradually and rituals require a trio', () => {
  assert.deepEqual(magicPackErrors(id => !!SKILLS[id]), []);
  for (const id of ['cinderchain', 'mending_relay', 'encirclement', 'hollow_choir']) {
    const spec = MAGIC_PACKS[id]; assert.ok(!magicPackPool(spec.minLevel - 1).includes(spec));
    assert.ok(magicPackPool(spec.minLevel).includes(spec));
  }
  assert.ok(!magicPackPool(20, { mechanics: ['encirclement'] }, 2).length);
});

check('living blasts slow members, warn every hop, hit once, and recur without any deaths at 30/60/120 Hz', () => {
  for (const hz of [30, 60, 120]) {
    const { w, members, advance, speed } = fixture('cinderchain'); near(members[0].sheet.get('moveSpeed'), speed * 0.75);
    const sources: number[] = [];
    SIM_TAP.current = { onHit: (source, victim) => { assert.equal(victim, w.player); sources.push(source.id); } };
    try {
      advance(3.2, hz); assert.equal(sources.length, 0); assert.ok(w.magicPackEffects.every(v => v.warning));
      assert.ok(w.movementLocked(members[0]));
      advance(1.4, hz); assert.deepEqual(sources, [members[0].id]);
      assert.ok(w.magicPackEffects.some(v => v.warning && v.ax === members[1].pos.x));
      advance(1.4, hz); assert.deepEqual(sources, [members[0].id, members[1].id]);
      advance(2, hz); assert.ok(members.every(a => !a.dead)); assert.equal(w.magicPackEffects.length, 0);
      assert.ok(members.every(a => !w.movementLocked(a))); assert.equal(sources.length, 2);
      advance(10, hz); assert.ok(sources.length > 2); // a second living chain
    } finally { SIM_TAP.current = null; }
  }
});

check('separation and walls stop propagation; displacement cancels a marked blast and ownership clears holds', () => {
  for (const edge of ['separate', 'wall', 'displace', 'claim']) {
    const { w, members: [a, b, c], advance } = fixture('cinderchain');
    if (edge === 'separate') { b.pos.x = 1200; c.pos.x = 1500; }
    if (edge === 'wall') { const visible = w.lineOfSight.bind(w); w.lineOfSight = (p, q, ...rest) => q.x >= 850 ? false : visible(p, q, ...rest); }
    advance(3.2); const life = w.player.life;
    if (edge === 'displace') a.pos.y += 60;
    if (edge === 'claim') a.owner = w.player;
    advance(4.5);
    assert.equal(w.magicPackEffects.length, 0); assert.ok(!a.sheet.getSourceMods('magicPack:eventChannel'));
    if (edge === 'displace' || edge === 'claim') near(w.player.life, life);
    else assert.ok(w.player.life < life);
    assert.ok(!b.magicPack!.runtime!.events!.burst!.visited.includes(c.magicPack!.slot!));
  }
});

check('mending links warn and heal through healTaken; killing, claiming, separating or occluding either end interrupts', () => {
  for (const edge of ['complete', 'death', 'claim', 'range', 'wall', 'story']) {
    const { w, members: [a, b], advance } = fixture('mending_relay', 2);
    b.sheet.setSource('probe-heal', [mod('healTaken', 'more', -0.5)]);
    advance(2.2); const life = b.life; assert.ok(w.magicPackEffects.some(v => v.kind === 'mend' && v.warning));
    assert.ok(w.movementLocked(a));
    if (edge === 'death') w.kill(a, false, w.player);
    if (edge === 'claim') a.owner = w.player;
    if (edge === 'range') b.pos.x += 400;
    if (edge === 'wall') w.lineOfSight = () => false;
    if (edge === 'story') b.tier++;
    advance(2.5); near(b.life, life + (edge === 'complete' ? b.maxLife() * 0.09 : 0));
    assert.equal(w.magicPackEffects.length, 0); assert.ok(!a.sheet.getSourceMods('magicPack:eventChannel'));
  }
});

check('triad footprint hits its interior, allows escape and collapses when a corner is removed', () => {
  for (const edge of ['inside', 'escape', 'death', 'displace', 'wall', 'degenerate']) {
    const { w, members, advance } = fixture('encirclement');
    if (edge === 'degenerate') members[2].pos = { x: 1100, y: 500 };
    advance(3.7);
    if (edge === 'degenerate') { assert.equal(w.magicPackEffects.length, 0); continue; }
    assert.equal(w.magicPackEffects[0].points!.length, 3); assert.ok(w.magicPackEffects[0].warning);
    assert.ok(members.every(a => w.movementLocked(a)));
    if (edge === 'escape') w.player.pos.y += 250;
    if (edge === 'death') w.kill(members[2], false, w.player);
    if (edge === 'displace') members[2].pos.x += 50;
    if (edge === 'wall') w.lineOfSight = () => false;
    const life = w.player.life;
    advance(2.2); if (edge === 'inside') assert.ok(w.player.life < life); else near(w.player.life, life);
    assert.equal(w.magicPackEffects.length, 0); assert.ok(members.every(a => !a.sheet.getSourceMods('magicPack:eventChannel')));
  }
});

check('hollow volleys leave true safe centers and outer escape, while overlapping allied rings remain dangerous', () => {
  for (const where of ['center', 'ring', 'outside', 'overlap', 'story']) {
    const { w, members: [a, b], advance } = fixture('hollow_choir', 2);
    b.pos.x = where === 'overlap' ? 850 : 1200;
    w.player.pos = { x: a.pos.x + (where === 'ring' ? 120 : where === 'outside' ? 250 : 0), y: 500 };
    if (where === 'story') w.player.tier++;
    const life = w.player.life; advance(4);
    if (where !== 'story') assert.ok(w.magicPackEffects.every(v => v.warning && v.innerRadius === 85));
    advance(1.2);
    if (where === 'ring' || where === 'overlap') assert.ok(w.player.life < life); else near(w.player.life, life);
  }
});

check('retaliation, simultaneous pack clearing, and disengagement cannot leave live damage or movement locks', () => {
  for (const recipe of ['cinderchain', 'encirclement', 'hollow_choir']) {
    const { w, members, advance } = fixture(recipe);
    if (recipe === 'hollow_choir') w.player.pos.x = 820;
    w.player.sheet.setSource('probe-thorns', [mod('thorns', 'flat', 1000000)]);
    advance(6); assert.ok(members.some(a => a.dead), recipe);
    for (const a of members) if (!a.dead) w.kill(a, false, w.player);
    assert.equal(w.magicPackEffects.length, 0); assert.ok(members.every(a => !a.sheet.getSourceMods('magicPack:eventChannel')));
  }
  const { w, members, advance } = fixture('cinderchain'); advance(3.2);
  w.player.pos = { x: 0, y: 1100 }; advance(5);
  assert.equal(w.magicPackEffects.length, 0); assert.ok(members.every(a => !w.movementLocked(a)));
});

check('co-op copies charge geometry and travel/save re-arms full warnings without pending hits or stale holds', () => {
  for (const recipe of ['cinderchain', 'mending_relay', 'encirclement', 'hollow_choir']) {
    const { w, members, advance } = fixture(recipe); advance(recipe === 'mending_relay' ? 2.2 : 3.7);
    assert.ok(w.magicPackEffects.length);
    const client = makeSimWorld('warrior', seed++); applySnapshot(client, serializeSnapshot(w, 1));
    assert.deepEqual(client.magicPackEffects, w.magicPackEffects);
    const origin = w.zone.id; w.loadZone(START_ZONE);
    const saved = JSON.parse(JSON.stringify(w.serializeWorldState()));
    const resumed = makeSimWorld('warrior', seed++); resumed.zoneMap[origin] = w.zoneMap[origin];
    assert.ok(resumed.adoptWorldState(saved)); resumed.loadZone(origin);
    assert.equal(resumed.magicPackEffects.length, 0);
    assert.ok(resumed.actors.filter(a => a.magicPack).every(a => !resumed.movementLocked(a)));
    for (const a of members) a.dead = true;
    applySnapshot(client, serializeSnapshot(w, 2)); assert.equal(client.magicPackEffects.length, 0);
  }
});
console.log('PASS magic pack event integration');
