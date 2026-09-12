// Rootwild: real AI, timed counterplay, habitat gates and a completable den.
// Run: npx tsx balance/probe_rootwild.ts
import assert from 'node:assert/strict';
import { Rng, withSeededRandom } from '../src/core/rng';
import { vec } from '../src/core/math';
import { makeSimWorld } from '../src/sim/arena';
import { updateAI } from '../src/engine/ai';
import { setSimTap } from '../src/engine/tap';
import { generateLayout } from '../src/engine/levelgen';
import { lairLandmarkRolls } from '../src/engine/lairs';
import { presenceMul } from '../src/engine/presence';
import { FACTIONS, MONSTERS } from '../src/data/monsters';
import { ROOTWILD_MONSTERS } from '../src/data/rootwildMonsters';
import { TILESETS } from '../src/data/tilesets';
import { sidezoneOf } from '../src/data/sidezones';
import type { ZoneDef } from '../src/data/zones';
import type { Actor } from '../src/engine/actor';
import { WARLORD_OF } from '../src/world/warlord';

for (const [id, def] of Object.entries(ROOTWILD_MONSTERS)) {
  const casts: Record<string, number> = {};
  let damage = 0, healing = 0, ensnared = false, bleeding = false, peakBrood = 0, flowered = false;
  const distances = ['rootwild_coppice', 'rootwild_hookvine', 'rootwild_nectar_bell'].includes(id)
    ? [32, 220] : [id === 'rootwild_burrling' ? 32 : ['rootwild_hingejaw', 'rootwild_brambleback'].includes(id) ? 60 : 220];
  for (const distance of distances) withSeededRandom(31931 + distance, () => {
    const w = makeSimWorld('warrior', 71321), a = w.createMonster(id, 15, 'enemy');
    w.player.sheet.setBase('life', 90000); w.player.life = 90000;
    a.pos = { x: w.player.pos.x + distance, y: w.player.pos.y }; a.facing = Math.PI; w.actors.push(a);
    const friend = id === 'rootwild_nectar_bell' ? w.createMonster('rootwild_brambleback', 15, 'enemy') : null;
    if (friend) { friend.pos = { x: a.pos.x, y: a.pos.y + 65 }; friend.life *= 0.3; w.actors.push(friend); }
    setSimTap({
      onCast(c, s) { if (c === a) casts[s.def.id] = (casts[s.def.id] ?? 0) + 1; },
      onHit(c, t, r) { if (c === a && t === w.player) damage += r.total; },
      onHeal(t, landed) { if (t === friend) healing += landed; },
    });
    try {
      for (let i = 0; i < 35 * 60; i++) {
        if (distance < 80) w.player.pos = { x: a.pos.x - distance, y: a.pos.y };
        if (id === 'rootwild_rhizarch' && i === 15 * 60) a.life *= 0.4;
        for (const m of [...w.actors]) if (m !== w.player && m !== friend && !m.dead) updateAI(m, w, 1 / 60);
        w.update(1 / 60);
        ensnared ||= w.player.statuses.some(s => s.id === 'ensnared');
        bleeding ||= w.player.statuses.some(s => s.id === 'bleed');
        flowered ||= a.aiPhaseIdx >= 0;
        peakBrood = Math.max(peakBrood, w.minionsOfSkill(a, 'coppice_seedfall').length);
      }
    } finally { setSimTap(null); }
  });
  for (const skill of def.skills) assert.ok(casts[skill], `${id} never casts ${skill}`);
  assert.ok(damage > 0, `${id} never damages prey`);
  if (id === 'rootwild_nectar_bell') assert.ok(healing > 0, 'Nectar failed to restore a wounded ally');
  if (id === 'rootwild_sundew') assert.ok(ensnared, 'Sundew failed to ensnare');
  if (id === 'rootwild_burrling') assert.ok(bleeding, 'Burrling failed to bleed');
  if (def.skills.includes('coppice_seedfall')) assert.equal(peakBrood, 4, `${id} brood cap`);
  if (def.boss) assert.ok(flowered, 'Rhizarch failed to flower at half life');
  assert.equal(FACTIONS.rootwild.table.some(e => e.id === id), !def.boss, `${id} field eligibility`);
  if (!def.boss) assert.ok(Object.values(TILESETS).some(t => t.packs?.table.some(e => e.id === id)), `${id} has no natural habitat`);
  console.log(`PASS ${id}: ${JSON.stringify({ casts, damage: Math.round(damage), healing: Math.round(healing), peakBrood })}`);
}

// Ordinary paid casts: warning first, damage only if the hero stays, then expiry.
for (const [id, warning] of [['rootwild_pitcher', 1], ['rootwild_sundew', 0.8], ['rootwild_rhizarch', 1.2]] as const) {
  for (const dodge of [false, true]) withSeededRandom(93513, () => {
    const w = makeSimWorld('warrior', 42133), a = w.createMonster(id, 10, 'enemy');
    w.player.sheet.setBase('life', 90000); w.player.life = 90000;
    a.pos = { x: w.player.pos.x + 220, y: w.player.pos.y }; a.facing = Math.PI; w.actors.push(a);
    const start = { ...w.player.pos }; let damage = 0, firstHit = Infinity, time = 0;
    setSimTap({ onHit(c, t, r) { if (c === a && t === w.player && r.total > 0) { damage += r.total; firstHit = Math.min(firstHit, time); } } });
    try {
      assert.ok(w.useSkill(a, a.skills[0]!, start), 'Cast refused');
      for (let i = 0; i < 7 * 60; i++) { time = i / 60; if (dodge && i === 12) w.player.pos = { x: start.x, y: start.y + 180 }; w.update(1 / 60); }
    } finally { setSimTap(null); }
    assert.equal(w.zones.length, 0, `${id} ground effect never expires`);
    if (dodge) assert.equal(damage, 0, `${id} hits safe departure`);
    else { assert.ok(damage > 0); assert.ok(firstHit >= warning - 0.05, `${id} ignores warning`); }
  });
  console.log(`PASS ${id}: warning, safe departure, damage and expiration`);
}

for (const level of [1, 3, 6, 10, 20, 50]) assert.ok(FACTIONS.rootwild.table.some(e => presenceMul(MONSTERS[e.id].presence, level) > 0));
assert.equal(WARLORD_OF.rootwild, undefined, 'The den boss must not become a roaming warlord');
for (const biome of ['forest', 'grove', 'marsh', 'jungle']) {
  const rolls = (level: number) => lairLandmarkRolls({ place: 'surface', biome, level, tileset: 'forest' });
  assert.ok(rolls(14).some(r => r.landmark === 'rootwild_seedbed_mouth'));
  assert.ok(!rolls(13).some(r => r.landmark === 'rootwild_seedbed_mouth'));
}
assert.ok(!lairLandmarkRolls({ place: 'surface', biome: 'desert', level: 30, tileset: 'desert' }).some(r => r.landmark.startsWith('rootwild_')));
assert.ok(!lairLandmarkRolls({ place: 'surface', biome: 'forest', level: 30, tileset: 'forest', noDeeper: true }).some(r => r.landmark.startsWith('rootwild_')));
console.log('PASS field roster, habitat eligibility, den level floor and sealed-pocket exclusion');

withSeededRandom(93215, () => {
  const w = makeSimWorld('warrior', 771001);
  const parent: ZoneDef = { ...w.zone, id: 'rootwild_probe', name: 'Rootwild probe', level: 14, size: { w: 1700, h: 1300 }, theme: { ...TILESETS.cavern.theme }, layout: [], objective: { kind: 'none' }, exits: [], seed: 90210 };
  for (const landmark of ['rootwild_seedbed_mouth', 'rootwild_feeding_patch']) {
    const def = { ...parent, landmarks: [{ landmark, chance: 1 }] };
    const gen = () => generateLayout(def, parent.size, new Rng(90210), vec(140, 650), [vec(1560, 650)]);
    const out = gen();
    assert.deepEqual(out, gen(), `${landmark} is nondeterministic`);
    if (landmark === 'rootwild_seedbed_mouth') assert.equal(out.doodads.filter(d => d.kind === 'rootwild_seedbed_gate').length, 1, 'Den entrance failed to stand');
    else assert.ok((out.landmarkSpawns ?? []).filter(s => s.id.startsWith('rootwild_')).length >= 3, 'Feeding patch failed to seat its natives');
  }
  const sz = sidezoneOf('rootwild_seedbed_gate')!;
  const ctx = { parent, seed: 91101, id: 'rootwild_probe_den', pos: vec(400, 400), playerLevel: 14, pkgActive: () => false };
  const den = sz.mint(ctx);
  assert.deepEqual(den, sz.mint(ctx), 'Den mint is nondeterministic');
  assert.ok(den.noDeeper);
  assert.ok(den.packs?.table.every(e => e.id.startsWith('rootwild_')));
  // Follow the same private seam as probe_lairs; production enters by mouth dwell.
  w.zone.level = 14; // Match the surface floor required to discover this door.
  const live = w as unknown as { enterSidezone(m: { pos: { x: number; y: number }; seed: number; kind: string }): void; kill(a: Actor, quiet: boolean, owner: Actor): void; objectiveDone: boolean };
  live.enterSidezone({ pos: vec(400, 400), seed: 91101, kind: 'rootwild_seedbed_gate' });
  assert.equal(w.zone.name, 'the Seedbed Hollow');
  assert.deepEqual(w.zone.objective, { kind: 'boss', id: 'rootwild_rhizarch' });
  const boss = w.actors.find(a => a.defId === 'rootwild_rhizarch');
  assert.ok(boss, 'Live den failed to spawn the Rhizarch');
  assert.ok(w.actors.some(a => a.defId === 'rootwild_nectar_bell'), 'Live den omitted its healer');
  live.kill(boss, false, w.player); w.update(0.2);
  assert.ok(live.objectiveDone, 'Defeating the Rhizarch failed to complete the den');
  console.log('PASS deterministic mouth and feeding patch, den mint, living natives and boss completion');
});
console.log('PASS Rootwild combat and world integration');
