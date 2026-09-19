import assert from 'node:assert/strict';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { MAGIC_PACKS } from '../src/data/magicPacks';
import { SKILLS } from '../src/data/skills';
import { magicPackErrors, magicPackPool, readMagicPack } from '../src/engine/magicPacks';
import { stepMagicPackMechanics } from '../src/engine/magicPackMechanics';
import { mod } from '../src/engine/stats';
import { SIM_TAP } from '../src/engine/tap';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { START_ZONE } from '../src/data/zones';

bootSimEngine();
let seed = 8731;
function fixture(recipe: string, count = 3) {
  const w = makeSimWorld('warrior', seed++);
  w.zoneMap.qa_magic_mechanics = {
    id: 'qa_magic_mechanics', name: 'Pack probe', level: 20, size: { w: 1600, h: 1200 },
    theme: w.zone.theme, seed: 1234, layout: [], objective: { kind: 'clear', all: true }, exits: [], map: { x: 9000, y: 9000 },
  };
  w.loadZone('qa_magic_mechanics'); w.visited.add(w.zone.id);
  w.actors = [w.player]; w.player.pos = { x: 800, y: 500 };
  w.player.sheet.setSource('probe-life', [mod('life', 'flat', 100000)]); w.player.fillResources();
  const members = Array.from({ length: count }, (_, i) => {
    const a = w.createMonster('skeleton_warrior', 20, 'enemy');
    a.pos = { x: 700 + i * 200, y: 500 }; a.fromZoneGen = true;
    w.actors.push(a); return a;
  });
  assert.ok(w.promoteMagicPack(members, recipe));
  const advance = (seconds: number, hz = 60) => { for (let i = 0; i < Math.round(seconds * hz); i++) w.refreshMagicPacks(1 / hz); };
  return { w, members, advance };
}
const check = (label: string, run: () => void) => { run(); console.log(`PASS ${label}`); };
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);

check('all mechanic unlocks and skill references validate', () => {
  assert.deepEqual(magicPackErrors(id => !!SKILLS[id]), []);
  for (const id of ['breachbearers', 'shifting_breach', 'arclink', 'gravewheel', 'siphon']) {
    const d = MAGIC_PACKS[id];
    assert.ok(!magicPackPool(d.minLevel - 1).includes(d));
    assert.ok(magicPackPool(d.minLevel).includes(d));
  }
});

check('death relay transfers exactly once; other deaths and nearby packs do not steal it', () => {
  const { w, members: [a, b, c], advance } = fixture('breachbearers');
  near(a.sheet.get('damageTaken'), 1.65); near(b.sheet.get('damageTaken'), 0.55);
  advance(15); assert.equal(a.magicPackRole, 'bearer');
  w.kill(c, false, w.player); assert.equal(a.magicPackRole, 'bearer');
  w.kill(a, false, w.player); w.kill(a, false, w.player);
  assert.equal(b.magicPackRole, 'bearer'); near(b.sheet.get('damageTaken'), 1.65);
  assert.equal(b.magicPack!.fallen, 2);
});

check('timed relay warns its successor, rotates without death and pauses away from combat', () => {
  for (const hz of [30, 60, 120]) {
    const { w, members: [a, b, c], advance } = fixture('shifting_breach');
    advance(5, hz); assert.equal(a.magicPackRole, 'bearer'); assert.ok(b.magicPackPending > 0);
    near(b.sheet.get('damageTaken'), 0.55);
    advance(1.1, hz); assert.equal(b.magicPackRole, 'bearer'); near(a.sheet.get('damageTaken'), 0.55);
    w.player.pos = { x: 0, y: 0 }; const left = b.magicPack!.runtime!.rotateLeft;
    advance(10, hz); near(b.magicPack!.runtime!.rotateLeft, left);
    w.player.pos = { x: 800, y: 500 }; w.kill(b, false, w.player);
    assert.equal(c.magicPackRole, 'bearer'); assert.equal(c.magicPack!.runtime!.rotateLeft, 6);
  }
});

check('siphon is proximity, line-of-sight and story scoped; killing its bearer ends the drain', () => {
  const { w, members: [a, b, c] } = fixture('siphon');
  assert.equal(a.magicPackDonors, 1); assert.equal(b.magicPackRole, 'donor'); assert.equal(c.magicPackRole, 'member');
  assert.ok(a.sheet.getSourceMods('magicPack:siphon:0'));
  assert.equal(w.magicPackEffects.filter(v => v.kind === 'siphon').length, 1);
  const boosted = a.sheet.get('attackSpeed');
  b.pos.y += 400; w.refreshMagicPacks(); assert.equal(a.magicPackDonors, 0);
  assert.ok(a.sheet.get('attackSpeed') < boosted); assert.ok(!b.sheet.getSourceMods('magicPack:siphon:1'));
  b.pos.y -= 400; b.tier = 1; w.refreshMagicPacks(); assert.equal(a.magicPackDonors, 0);
  b.tier = 0; b.owner = w.player; w.refreshMagicPacks(); assert.equal(a.magicPackDonors, 0);
  b.owner = undefined;
  const visible = w.lineOfSight; w.lineOfSight = () => false;
  w.refreshMagicPacks(); assert.equal(a.magicPackDonors, 0); w.lineOfSight = visible;
  w.refreshMagicPacks(); assert.equal(a.magicPackDonors, 1);
  w.kill(a, false, w.player); assert.ok(b.magicPack!.runtime!.retired);
  assert.ok(!b.magicPackRole && !c.magicPackRole); assert.equal(w.magicPackEffects.length, 0);
  assert.ok(!b.sheet.getSourceMods('magicPack:siphon:1'));
});

check('beam warns before damage, travels, hits once through shared combat, and can be dodged', () => {
  for (const hz of [30, 60, 120]) {
    const { w, members, advance } = fixture('arclink', 2);
    let hits = 0;
    SIM_TAP.current = { onHit: (caster, target) => {
      assert.equal(caster, members[0]); assert.equal(target, w.player); hits++;
    } };
    try {
      const life = w.player.life;
      advance(3.5, hz); assert.equal(hits, 0); near(w.player.life, life);
      assert.ok(w.magicPackEffects.some(v => v.kind === 'beam' && v.warning));
      assert.ok(w.movementLocked(members[0]));
      advance(0.9, hz); assert.equal(hits, 1); assert.ok(w.player.life < life);
      assert.ok(w.magicPackEffects.some(v => v.kind === 'beam' && !v.warning));
      advance(0.8, hz); assert.equal(hits, 1); assert.equal(w.magicPackEffects.length, 0);
      assert.ok(members[0].sheet.get('moveSpeed') > 0);
      w.player.pos.y += 100; advance(8, hz); assert.equal(hits, 1);
    } finally { SIM_TAP.current = null; }
  }
});

check('beam warning is fixed and cancels on displacement, death, ownership, wall or story change', () => {
  for (const edge of ['move', 'death', 'owner', 'wall', 'story']) {
    const { w, members: [a, b], advance } = fixture('arclink', 2);
    advance(3); const warning = { ...w.magicPackEffects[0] }; assert.ok(warning.warning);
    b.pos.x += 5; w.refreshMagicPacks(); assert.equal(w.magicPackEffects[0].bx, warning.bx);
    if (edge === 'move') b.pos.x += 60;
    if (edge === 'death') w.kill(b, false, w.player);
    if (edge === 'owner') b.owner = w.player;
    if (edge === 'wall') w.lineOfSight = () => false;
    if (edge === 'story') b.tier++;
    const life = w.player.life; advance(2);
    assert.equal(w.magicPackEffects.length, 0); near(w.player.life, life);
    assert.ok(!a.sheet.getSourceMods('magicPack:beamChannel'));
    assert.ok(!b.sheet.getSourceMods('magicPack:beamChannel'));
  }
});

check('gravewheels warn, rotate, damage through combat, survive distant kiting and clear on last death', () => {
  const { w, members: [a, b, c], advance } = fixture('gravewheel');
  w.player.pos = { ...a.pos }; w.kill(a, false, w.player);
  const life = w.player.life;
  assert.equal(w.magicPackEffects.length, 2); assert.ok(w.magicPackEffects.every(v => v.warning));
  advance(1.5); near(w.player.life, life);
  const initial = { ...w.magicPackEffects[0] }; advance(0.7);
  assert.ok(w.player.life < life); assert.notEqual(w.magicPackEffects[0].by, initial.by);
  b.pos.x = c.pos.x = 1550; b.pos.y = c.pos.y = 1100;
  const before = w.player.life; advance(1); assert.ok(w.player.life < before);
  w.kill(b, false, w.player); assert.equal(c.magicPack!.runtime!.graves.length, 2);
  w.kill(b, false, w.player); assert.equal(c.magicPack!.runtime!.graves.length, 2);
  w.kill(c, false, w.player); assert.equal(w.magicPackEffects.length, 0);
  const cleared = w.player.life; advance(2); near(w.player.life, cleared);
});

check('grave geometry clips at walls, rejects other stories and silent retirement creates no grave', () => {
  const { w, members: [a, b, c], advance } = fixture('gravewheel');
  w.kill(a, true); assert.equal(b.magicPack!.runtime!.graves.length, 0);
  w.kill(b, false, w.player); w.player.pos = { ...b.pos }; w.player.tier = 1;
  const life = w.player.life; advance(3); near(w.player.life, life);
  const rows = stepMagicPackMechanics(w.actors, 0, {
    enemies: () => [w.player], clear: () => false,
    clip: (start, end) => ({ x: start.x + (end.x - start.x) * 0.25, y: start.y + (end.y - start.y) * 0.25 }),
    hit: () => assert.fail('other story hit'),
  });
  for (const row of rows) near(Math.hypot(row.bx - row.ax, row.by - row.ay), 115 / 4);
  c.owner = w.player; w.refreshMagicPacks(); assert.equal(w.magicPackEffects.length, 0);
});

check('retaliation can kill the conductor mid-hit without stale beams, locks or grave damage', () => {
  for (const recipe of ['arclink', 'gravewheel']) {
    const { w, members: [a, b], advance } = fixture(recipe, 2);
    w.player.sheet.setSource('probe-thorns', [mod('thorns', 'flat', 1000000)]);
    if (recipe === 'gravewheel') { w.player.pos = { ...a.pos }; w.kill(a, false, w.player); }
    advance(5);
    assert.ok(a.dead); assert.ok(recipe === 'arclink' || b.dead);
    assert.equal(w.magicPackEffects.length, 0);
    assert.ok(!a.sheet.getSourceMods('magicPack:beamChannel'));
    assert.ok(!b.sheet.getSourceMods('magicPack:beamChannel'));
  }
});

check('save/load preserves bearer, retired siphon and graves, and rearms dangerous effects visibly', () => {
  for (const recipe of ['shifting_breach', 'siphon', 'gravewheel', 'arclink']) {
    const { w, members, advance } = fixture(recipe);
    if (recipe !== 'arclink') w.kill(members[0], false, w.player);
    advance(recipe === 'arclink' ? 3.5 : 2);
    const original = members[1].magicPack!;
    w.loadZone(START_ZONE);
    const saved = JSON.parse(JSON.stringify(w.serializeWorldState()));
    const resumed = makeSimWorld('warrior', seed++); resumed.zoneMap.qa_magic_mechanics = w.zoneMap.qa_magic_mechanics;
    assert.ok(resumed.adoptWorldState(saved)); resumed.loadZone('qa_magic_mechanics');
    const restored = resumed.actors.filter(a => a.magicPack);
    assert.equal(restored.length, recipe === 'arclink' ? 3 : 2);
    const state = restored[0].magicPack!.runtime!;
    assert.equal(state.bearer, original.runtime!.bearer); assert.equal(state.retired, original.runtime!.retired);
    if (recipe === 'gravewheel') { assert.equal(state.graves.length, 1); assert.ok(resumed.magicPackEffects.every(v => v.warning)); }
    if (recipe === 'arclink') { assert.ok(!state.beam); assert.equal(resumed.magicPackEffects.length, 0); }
  }
  assert.ok(!readMagicPack({ id: 1, mechanic: 'arclink', size: 3, fallen: 0, runtime: { graves: [] } })!.runtime!.beam);
});

check('co-op carries exact warning geometry and roles, then clears pooled state', () => {
  for (const recipe of ['shifting_breach', 'arclink', 'gravewheel', 'siphon']) {
    const { w, members, advance } = fixture(recipe);
    if (recipe === 'gravewheel') w.kill(members[0], false, w.player);
    advance(recipe === 'shifting_breach' ? 5 : recipe === 'arclink' ? 3 : 0.2);
    const client = makeSimWorld('warrior', seed++); applySnapshot(client, serializeSnapshot(w, 1));
    assert.deepEqual(client.magicPackEffects, w.magicPackEffects);
    for (const remote of client.actors.filter(a => a.magicPack)) {
      const host = members.find(a => a.magicPack!.slot === remote.magicPack!.slot)!;
      assert.equal(remote.magicPackRole, host.magicPackRole);
      near(remote.magicPackPending, host.magicPackPending); assert.equal(remote.magicPackDonors, host.magicPackDonors);
    }
    for (const a of members) if (!a.dead) w.kill(a, false, w.player);
    applySnapshot(client, serializeSnapshot(w, 2)); assert.equal(client.magicPackEffects.length, 0);
  }
});

console.log('PASS magic pack mechanics integration');
