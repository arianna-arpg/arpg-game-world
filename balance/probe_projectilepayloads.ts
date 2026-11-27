import assert from 'node:assert/strict';
import { withSeededRandom } from '../src/core/rng';
import { mechanicBurst } from '../src/data/mechanicVisuals';
import { PROJECTILE_BURSTS, projectileBurstVoice } from '../src/data/projectileBursts';
import { projectileEndKind } from '../src/data/projectileEndings';
import { ORB_DISCHARGE_STYLE } from '../src/data/lightningVisuals';
import { applySnapshot, serializeSnapshot } from '../src/net/snapshot';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import type { Actor } from '../src/engine/actor';
import { skillBaseTypeOf } from '../src/engine/bodyVoices';
import { makeSkillInstance } from '../src/engine/skills';
import { previewSkill } from '../src/engine/skillPreview';
import { setSimTap } from '../src/engine/tap';
import { makeSimWorld } from '../src/sim/arena';

withSeededRandom(4721, () => {
  const w = makeSimWorld('magician', 4721), caster = w.player;
  const origin = { x: 650, y: 600 };
  w.walk = null; w.doodads = []; w.markDoodadsChanged();
  caster.pos = { ...origin };
  caster.sheet.setSource('probe', [{ stat: 'accuracy', kind: 'flat', value: 100000 }]);
  function launch(id: string, supports: string[] = []) {
    w.actors = [caster]; w.flashes = []; w.projectiles = []; w.zones = [];
    w.doodads = []; w.markDoodadsChanged();
    w.lite.reset(w.arena.w, w.arena.h);
    w.time += 10; // let any previous specimen's lure expire
    const inst = makeSkillInstance(SKILLS[id]);
    supports.forEach((s, i) => { inst.sockets[i] = { def: SUPPORTS[s], level: 1 }; });
    w.spawnProjectile(caster, inst, { ...origin }, 0);
    return w.projectiles[0];
  }
  function bystander(x: number, y: number, tier = caster.tier, team: Actor['team'] = 'enemy') {
    const a = w.createMonster('zombie', 1, team);
    a.sheet.setSource('probe', [{ stat: 'life', kind: 'flat', value: 10000 }]);
    a.fillResources(); a.pos = { x, y }; a.tier = tier; w.actors.push(a);
    return a;
  }
  const step = (dt = 1 / 60) => (w as unknown as { updateProjectiles(dt: number): void }).updateProjectiles(dt);
  const fireBlasts = () => w.flashes.filter(f => f.fx === projectileBurstVoice('fireball'));
  const ends = () => w.flashes.filter(f => f.projectileEnd);
  let checked = 0, explosive = 0;
  for (const def of Object.values(SKILLS)) {
    const d = def.delivery;
    if (d.type !== 'projectile') continue;
    const p = launch(def.id);
    // Exhaust the remaining range; retain native trajectories, return turns, constructs and payloads.
    p.range = p.traveled;
    const target = bystander(origin.x, origin.y + 32);
    step();
    checked++;
    const fx = d.explode?.impactFx ?? projectileBurstVoice(def.id) ?? mechanicBurst(`burst_${skillBaseTypeOf(def.baseDamage) ?? 'physical'}`);
    const bursts = w.flashes.filter(f => f.fx === fx);
    if (d.explode) {
      explosive++;
      assert.equal(bursts.length, 1, def.id + ' should burst once at expiry');
      assert.deepEqual(bursts[0].pos, p.pos, def.id);
      assert.equal(bursts[0].recoveryCueTier, p.tier, def.id);
      assert.equal(bursts[0].color, p.color, def.id);
      assert.ok(target.life < target.maxLife(), def.id + ' visible burst must damage an off-path bystander');
    } else {
      assert.equal(bursts.length, 0, def.id + ' invented an explosion');
      assert(!w.flashes.some(f => f.fx?.startsWith('projectileBurst:')), def.id);
    }
    if (w.projectiles.includes(p)) {
      assert.ok(p.returnPhase, def.id + ' unexpectedly survived expiry');
      assert.equal(ends().length, 0, def.id + ' falsely showed a spent shot');
    } else if (d.plantOnLand) {
      assert.ok(w.actors.some(a => a.construct), def.id);
      assert.equal(ends().length, 0, def.id);
    } else {
      assert.equal(ends().length, 1, def.id);
      assert.equal(ends()[0].projectileEnd?.kind, projectileEndKind(p), def.id);
    }
  }
  console.log('PASS', checked, 'direct projectile skills at range, including', explosive, 'real splash payloads');
  assert.deepEqual(Object.keys(PROJECTILE_BURSTS).sort(), Object.values(SKILLS).filter(s =>
    s.delivery.type === 'projectile' && s.delivery.explode && !s.delivery.explode.impactFx).map(s => s.id).sort());
  const painted = launch('fireball');
  painted.color = '#ab4de0'; painted.range = 0; step();
  assert.equal(fireBlasts()[0]?.color, painted.color, 'the blast follows the flight recolor');
  const override = launch('fireball');
  const native = override.inst.def.delivery;
  assert(native.type === 'projectile' && native.explode);
  override.inst = { ...override.inst, def: { ...override.inst.def, delivery: { ...native,
    explode: { ...native.explode, impactFx: 'ember_nova' } } } };
  override.range = 0; step();
  assert(w.flashes.some(f => f.fx === 'ember_nova') && fireBlasts().length === 0);

  const peer = makeSimWorld('magician',4721);
  for (const def of Object.values(SKILLS)) {
    if (def.delivery.type !== 'projectile' || !def.delivery.zap) continue;
    const p = launch(def.id);
    p.zapTimer = 0; step();
    assert(!w.flashes.some(f => f.lightning?.discharge), def.id + ' empty pulse');
    const foes = Array.from({length: 6}, (_, i) => bystander(p.pos.x + 38, p.pos.y + i * 3));
    const excluded = bystander(p.pos.x + 35, p.pos.y, caster.tier + 1);
    const bad = bystander(p.pos.x + 450, p.pos.y);
    const positions = foes.map(e => ({...e.pos}));
    p.zapTimer = 0; step(.001);
    const arcs = w.flashes.flatMap(f => f.lightning?.discharge ? [f.lightning] : []);
    assert.equal(arcs.length, ORB_DISCHARGE_STYLE.perPulse, def.id);
    for (const arc of arcs) {
      assert.equal(arc.discharge, def.delivery.zap.visual ?? 'filament');
      assert.equal(arc.skillId, def.id);
      assert.deepEqual(arc.points[0], {...p.pos, at: p.age});
      assert(positions.some(pos => pos.x === arc.points[1].x && pos.y === arc.points[1].y));
    }
    assert(foes.every(e => e.life < e.maxLife()), def.id + ' visual cap cut off damage');
    assert.equal(excluded.life, excluded.maxLife()); assert.equal(bad.life, bad.maxLife());
    applySnapshot(peer, JSON.parse(JSON.stringify(serializeSnapshot(w,1))));
    assert.deepEqual(peer.flashes.flatMap(f => f.lightning?.discharge ? [f.lightning] : []), arcs);
  }
  const field = launch('soulflay');
  assert(field.auraRadius && field.auraRadius > field.radius);
  const snapshot = serializeSnapshot(w,2);
  applySnapshot(peer, snapshot);
  assert.equal(peer.projectiles[0].auraRadius, field.auraRadius);
  delete snapshot.projectiles[0].auraRadius;
  applySnapshot(peer,snapshot); assert.equal(peer.projectiles[0].auraRadius, undefined);
  const spear = launch('ice_spear');
  bystander(spear.pos.x+15,spear.pos.y); step();
  assert.equal(w.projectiles.filter(p => p.inst.def.id === 'glacial_shard').length, 5);
  const frozen = launch('frozen_orb');
  assert(frozen.emit); frozen.emit.timer = 0; step();
  assert(w.projectiles.some(p => p.inst.def.id === 'frostbolt'));
  console.log('PASS orb discharges, secondary shards, emitted Frostbolts and moving field replication');

  for (const def of Object.values(SKILLS)) {
    const d = def.delivery;
    if (d.type !== 'projectile') continue;
    for (const obstacle of ['wall', 'body']) {
      const p = launch(def.id);
      step();
      const pos = { ...p.pos };
      w.flashes = [];
      let body: Actor | undefined;
      if (obstacle === 'wall') {
        w.doodads = [{ kind: 'wall', radius: 24, pos }];
        w.markDoodadsChanged();
      } else {
        body = bystander(pos.x, pos.y);
        // Cover the painted rim too: a crescent or annulus has a hollow center.
        body.radius = Math.max(body.radius, p.radius * 2);
      }
      const bounces = p.bounces ?? 0;
      step(1 / 240);
      const spent = !w.projectiles.includes(p);
      if (body) {
        assert.ok(p.hits.has(body.id) || p.returnPhase, def.id + ' failed body contact');
        assert.equal(ends().length, 0, def.id + ' false miss on body');
      } else if (spent) {
        if (d.plantOnLand) assert.ok(w.actors.some(a => a.construct), def.id);
        else assert.equal(ends()[0]?.projectileEnd?.surface, 'wall', def.id);
      } else assert.ok(p.phase || bounces > (p.bounces ?? 0), def.id + ' unexplained wall survival');
      const fx: string = d.explode?.impactFx ?? projectileBurstVoice(def.id) ?? mechanicBurst(`burst_${skillBaseTypeOf(def.baseDamage) ?? 'physical'}`);
      assert.equal(w.flashes.filter(f => f.fx === fx).length,
        d.explode && (spent || (body && p.hitDetonate)) ? 1 : 0, def.id + ' ' + obstacle + ' blast count');
    }
  }
  console.log('PASS real wall and body contacts across the catalogue');

  for (const id of ['fireball', 'firebolt']) {
    const p = launch(id);
    const x = origin.x + p.range;
    const inside = bystander(x + 14, origin.y + 55);
    const outside = bystander(x + 14, origin.y + 125);
    const ally = bystander(x, origin.y + 55, caster.tier, caster.team);
    const upstairs = bystander(x, origin.y + 55, caster.tier + 1);
    for (let i = 0; w.projectiles.includes(p) && i < 180; i++) step();
    assert.ok(!w.projectiles.includes(p) && !p.hits.size && ends()[0]?.projectileEnd?.surface === 'spent');
    assert.equal(inside.life < inside.maxLife(), id === 'fireball', id);
    for (const a of [outside, ally, upstairs]) assert.equal(a.life, a.maxLife(), id);
    assert.equal(fireBlasts().length, id === 'fireball' ? 1 : 0);
    if (id === 'fireball') assert.equal(fireBlasts()[0].radius, 85);
    console.log('PASS', id, 'natural range, off-path HP lost', inside.maxLife() - inside.life);
  }

  for (const supports of [[], ['piercing'], ['fulminate']]) {
    const p = launch('fireball', supports);
    const timing = previewSkill(caster, p.inst).rows.find(row => row.key === 'projectileExplosion');
    assert.ok(timing && timing.value.includes('hits it survives') === supports.includes('fulminate'));
    const body = bystander(origin.x + 45, origin.y);
    const side = bystander(body.pos.x, origin.y + 50);
    let bodyHits = 0, sideHits = 0;
    setSimTap({ onHit: (_, victim) => {
      if (victim === body) bodyHits++;
      if (victim === side) sideHits++;
    } });
    try { for (let i = 0; i < 20 && !p.hits.has(body.id); i++) step(); }
    finally { setSimTap(null); }
    assert.ok(p.hits.has(body.id) && body.life < body.maxLife());
    const survives = supports.length > 0;
    const hitBlast = !survives || supports.includes('fulminate');
    assert.equal(bodyHits, 1, 'the direct hit never double-charges its own target');
    assert.equal(sideHits, Number(hitBlast));
    assert.equal(fireBlasts().length, hitBlast ? 1 : 0);
    assert.equal(side.life < side.maxLife(), hitBlast);
    assert.equal(w.projectiles.includes(p), survives);
    assert.equal(ends().length, 0);
    if (survives) {
      const before = body.life;
      p.range = p.traveled + 1; step();
      assert.equal(fireBlasts().length, Number(hitBlast) + 1);
      assert.ok(body.life < before, 'a previous piercing hit must not immunize a body against a later explosion');
    }
  }

  for (const support of ['fulminate', 'parting_gift']) {
    const p = launch('firebolt', [support]);
    const other = bystander(origin.x, origin.y + 58);
    p.range = 1; step();
    assert.equal(fireBlasts().length, 0, support + ' fabricated an intrinsic explosion');
    assert.equal(other.life < other.maxLife(), support === 'parting_gift', support);
  }

  // The third body turns the supported shot once its two additional pierces are spent.
  const returning = launch('fireball', ['fulminate', 'returning']);
  const bodies = [45, 100, 155].map(x => bystander(origin.x + x, origin.y));
  for (let i = 0; i < 60 && !returning.returnPhase; i++) step();
  assert.ok(returning.returnPhase && w.projectiles.includes(returning));
  assert.ok(bodies.every(b => b.life < b.maxLife()));
  assert.equal(fireBlasts().length, 3, 'the impact that starts the return is also a survived hit');

  const orb = launch('rubble_conduit', ['fulminate', 'forking']);
  const stone = bystander(origin.x + 25, origin.y);
  for (let i = 0; i < 20 && !orb.hits.has(stone.id); i++) step();
  assert.ok(orb.hits.has(stone.id) && !w.projectiles.includes(orb) && w.projectiles.length === 2);
  assert.equal(w.flashes.filter(f => f.fx === projectileBurstVoice('rubble_conduit')).length, 1, 'a forking parent bursts once');

  for (const supports of [[], ['fulminate']]) {
    const p = launch('fireball', supports);
    const kind = w.liteKindOf('vermin_tide');
    const primary = w.lite.spawn(kind, origin.x + 14, origin.y, 0, 0, 3);
    const adjacent = w.lite.spawn(kind, origin.x + 14, origin.y + 45, 0, 0, 3);
    const ally = w.lite.spawn(kind, origin.x + 14, origin.y + 45, 1, 0, 3);
    w.lite.rebuildBuckets(); step();
    assert.equal(w.lite.plies[primary], 2, 'struck swarm body does not take its own splash');
    assert.equal(w.lite.plies[adjacent], 2, 'swarm bystander inside the visible blast takes a hit');
    assert.equal(w.lite.plies[ally], 3);
    assert.equal(fireBlasts().length, 1);
    assert.deepEqual(fireBlasts()[0].pos, { x: w.lite.x[primary], y: w.lite.y[primary] });
    assert.equal(w.projectiles.includes(p), supports.length > 0);
  }

  // A circle and square differ at the upper right corner. A brittle prop and a
  // bystander at the same spot must agree with the blast's advertised shape.
  for (const supports of [[], ['square_sigil']]) {
    const p = launch('fireball', supports);
    p.range = 0;
    const pos = { x: origin.x + 79, y: origin.y + 79 };
    const target = bystander(pos.x, pos.y); target.radius = 3;
    w.doodads = [{ kind: 'clay_pots', pos, radius: 3 }]; w.markDoodadsChanged();
    const pot = w.doodads[0];
    step();
    assert.equal(!!pot.gone, supports.length > 0);
    assert.equal(target.life < target.maxLife(), supports.length > 0);
    assert.equal(fireBlasts()[0].shape, supports.length ? 1 : 0);
  }

  const edge = launch('fireball');
  edge.pos.x = edge.anchor.x = w.arena.w - 4;
  edge.speed = 1000; step(.08);
  assert.equal(fireBlasts()[0].pos.x, w.arena.w);
  assert.deepEqual(fireBlasts()[0].pos, ends()[0].pos);

  for (const id of ['fireball', 'pinning_spear', 'blightspear', 'sacrament_of_ruin', 'lure_lantern', 'hurl_swarmpod']) {
    const p = launch(id);
    const dome = bystander(origin.x + 30, origin.y);
    dome.construct = { kind: 'dome', domeRadius: 45 } as NonNullable<Actor['construct']>;
    step();
    assert.ok(p.dissolved && !w.projectiles.includes(p), id);
    assert.ok(w.flashes.some(f => f.fx === mechanicBurst('flightAbsorb')));
    assert.equal(ends().length + fireBlasts().length + w.zones.length, 0, id + ' absorbed');
    assert.equal(w.lite.liveCount, 0, id + ' poured through a dome');
    assert.equal(w.lureFor(dome), null, id + ' lured through a dome');
    assert.equal(w.actors.filter(a => a.construct && a !== dome).length, 0, id + ' planted through a dome');
  }
  console.log('PASS impact, surviving pierce, supported hit, return, fork and absorption');
});
