import assert from 'node:assert/strict';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SATELLITES, SATELLITE_CFG, satelliteCountStat, satelliteErrors } from '../src/engine/satelliteSpec';
import { MAGIC_PACKS } from '../src/data/magicPacks';
import { SKILLS } from '../src/data/skills';
import { ITEM_BASES } from '../src/data/itembases';
import { MONSTERS } from '../src/data/monsters';
import { magicPackPool, magicPackErrors } from '../src/engine/magicPacks';
import { mod, type Modifier } from '../src/engine/stats';
import { SIM_TAP } from '../src/engine/tap';
import { forgeItem, compileItemMods, affixPoolsFor, describeItem } from '../src/engine/itemgen';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { START_ZONE } from '../src/data/zones';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';

bootSimEngine();
const stat = satelliteCountStat('iron_wake');
let seed = 7821;
const check = (label: string, run: () => void) => { run(); console.log(`PASS ${label}`); };
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
function fixture() {
  const w = makeSimWorld('warrior', seed++);
  w.actors = [w.player]; w.player.pos = { x: 800, y: 600 };
  w.player.sheet.setSource('probe-survive', [mod('life', 'flat', 100000)]); w.player.fillResources();
  return w;
}
function body(w: World, owner?: Actor) {
  const a = w.createMonster('skeleton_warrior', 12, owner ? owner.team : 'enemy', owner);
  a.pos = { x: 100, y: 100 }; a.fromZoneGen = true;
  a.sheet.setSource('probe-survive', [mod('life', 'flat', 100000), mod('armor', 'override', 0),
    mod('evasion', 'override', 0), mod('blockChance', 'override', 0)]);
  a.fillResources(); w.actors.push(a); return a;
}
function grant(a: Actor, count = 1, stationary = false) {
  a.sheet.setSource('probe-satellite', [mod(stat, 'flat', count), ...(stationary ? [mod('satelliteSpeed', 'more', -1)] : [])]);
}
function advance(w: World, seconds: number, hz = 60) {
  for (let i = 0; i < Math.round(seconds * hz); i++) w.refreshSatellites(1 / hz);
}
function touch(w: World, owner: Actor, victim: Actor) {
  w.refreshSatellites();
  const v = w.satellites.visuals.find(v => v.owner === owner.id)!;
  assert.ok(v); victim.pos = { x: v.x, y: v.y };
}

check('data validates, magic packs unlock at level five, and quantity alone does not grant a family', () => {
  assert.deepEqual(satelliteErrors(id => !!SKILLS[id]), []);
  assert.deepEqual(magicPackErrors(id => !!SKILLS[id]), []);
  assert.ok(!magicPackPool(4).includes(MAGIC_PACKS.iron_wake));
  assert.ok(magicPackPool(5).includes(MAGIC_PACKS.iron_wake));
  const w = fixture(); w.player.sheet.setSource('generic', [mod('satelliteCount', 'flat', 3)]);
  advance(w, 2); assert.equal(w.satellites.visuals.length, 0);
  grant(w.player); w.refreshSatellites(); assert.equal(w.satellites.visuals.length, 4);
  w.player.sheet.setSource('many', [mod(stat, 'flat', 100)]); w.refreshSatellites();
  assert.equal(w.satellites.visuals.length, SATELLITE_CFG.maxPerActor);
});

check('real jewelry affixes stack through equipment, survive character saves, and remove on unequip', () => {
  const w = fixture();
  const base = Object.values(ITEM_BASES).find(b => b.category === 'ring' && b.dropWeight > 0)!;
  assert.ok(affixPoolsFor(base).prefix.some(d => d.id === 'satellite_iron_wake'));
  const mint = () => forgeItem({ baseId: base.id, ilvl: 8, rarity: 'magic',
    affixes: [{ id: 'satellite_iron_wake' }], quality: 1 })!;
  const first = mint(), second = mint();
  assert.equal(compileItemMods(first).find(m => m.stat === stat)?.value, 1);
  assert.ok(JSON.stringify(describeItem(first)).includes('Iron Wake'));
  Object.assign(w.meta.equipped, { ring1: first, ring2: second }); w.recalcSeat(w.localSeat);
  w.refreshSatellites(); assert.equal(w.satellites.visuals.length, 2);
  const saved = JSON.parse(JSON.stringify(serializeCharacter(w)));
  const resumed = fixture(); applySavedCharacter(resumed, saved); resumed.refreshSatellites();
  assert.equal(resumed.satellites.visuals.length, 2);
  assert.ok(resumed.satellites.visuals.every(v => !v.armed));
  delete w.meta.equipped.ring1; w.recalcSeat(w.localSeat); w.refreshSatellites();
  assert.equal(w.satellites.visuals.length, 1);
  delete w.meta.equipped.ring2; w.recalcSeat(w.localSeat); w.refreshSatellites();
  assert.equal(w.satellites.visuals.length, 0);
});

check('arming and recipient cooldowns agree at 30/60/120 Hz; dt=0 never hits', () => {
  for (const hz of [30, 60, 120]) {
    const w = fixture(), a = w.player, e = body(w); grant(a, 1, true); touch(w, a, e);
    let hits = 0;
    SIM_TAP.current = { onHit: (caster, victim, _r, packet) => {
      assert.equal(caster, a); assert.equal(victim, e); assert.equal(packet.sourceName, 'Iron Wake'); hits++;
    } };
    try {
      const life = e.life; advance(w, 0.9, hz); near(e.life, life); assert.equal(hits, 0);
      advance(w, 3.1, hz); assert.equal(hits, 5, `hits at ${hz}Hz`); assert.ok(e.life < life);
      for (let i = 0; i < 100; i++) w.refreshSatellites(); assert.equal(hits, 5);
    } finally { SIM_TAP.current = null; }
  }
});

check('physical and satellite damage scale through real hits; fire/minion bonuses do not', () => {
  const sample = (mods: Modifier[]) => {
    const w = fixture(), a = w.player, e = body(w); grant(a, 1, true); touch(w, a, e);
    a.sheet.setSource('probe-power', [mod('critChance', 'override', 0), ...mods]);
    const amounts: number[] = [];
    SIM_TAP.current = { onHit: (_a, _b, _r, p) => { amounts.push(p.amounts.physical ?? 0); } };
    try { seedGlobalRandom(2189); advance(w, 1.2); } finally { SIM_TAP.current = null; }
    assert.equal(amounts.length, 1); return amounts[0];
  };
  const base = sample([]); assert.ok(base > 0);
  near(sample([mod('damage', 'more', 1, ['physical'])]), base * 2);
  near(sample([mod('damage', 'more', 1, ['satellite'])]), base * 2);
  near(sample([mod('damage', 'more', 1, ['satellite:iron_wake'])]), base * 2);
  near(sample([mod('damage', 'more', 1, ['fire']), mod('minionDamage', 'more', 1)]), base);
});

check('rotating contact leaves safe centers and outer space; friends and other stories are excluded', () => {
  for (const hz of [30, 60, 120]) {
    const w = fixture(), a = w.player, contact = body(w), center = body(w), outside = body(w), upper = body(w), ally = body(w, a);
    grant(a); touch(w, a, contact);
    center.pos = { ...a.pos }; outside.pos = { x: a.pos.x + 180, y: a.pos.y };
    upper.pos = { ...contact.pos }; upper.tier = 1; ally.pos = { ...contact.pos };
    const lives = [center, outside, upper, ally].map(e => e.life), before = contact.life;
    advance(w, 8, hz); assert.ok(contact.life < before);
    [center, outside, upper, ally].forEach((e, i) => near(e.life, lives[i]));
  }
});

check('walls suppress contact and mark occluded orbs; teleport and count changes re-arm', () => {
  const w = fixture(), a = w.player, e = body(w); grant(a, 1, true); touch(w, a, e);
  const sight = w.lineOfSight; w.lineOfSight = () => false;
  const life = e.life; advance(w, 2); near(e.life, life);
  assert.ok(w.satellites.visuals.every(v => v.blocked)); w.lineOfSight = sight;
  advance(w, 0.1); assert.ok(e.life < life);
  a.pos.x += 400; w.refreshSatellites(1 / 30);
  assert.ok(w.satellites.visuals.every(v => !v.armed));
  touch(w, a, e); const moved = e.life; advance(w, 0.5); near(e.life, moved);
  grant(a, 2, true); w.refreshSatellites();
  assert.equal(w.satellites.visuals.length, 2); assert.ok(w.satellites.visuals.every(v => !v.armed));
  touch(w, a, e); advance(w, 1.2); assert.ok(e.life < moved);
});

check('a fast orbit sweeps its arc between frame endpoints without hitting the center chord', () => {
  const w = fixture(), a = w.player, e = body(w); grant(a); a.sheet.setSource('fast', [mod('satelliteSpeed', 'override', 4)]);
  advance(w, 1.1); const v = w.satellites.visuals[0];
  const delta = SATELLITES.iron_wake.turnSpeed * 4 * 0.1;
  e.radius = 0.1; e.pos = { x: a.pos.x + Math.cos(v.angle + delta / 2) * v.orbit,
    y: a.pos.y + Math.sin(v.angle + delta / 2) * v.orbit };
  const before = e.life; w.refreshSatellites(0.1); assert.ok(e.life < before);
});

check('magic members each carry one; ownership/rarity changes remove grants and death retires immediately', () => {
  const w = fixture(), a = body(w), b = body(w);
  assert.ok(w.promoteMagicPack([a, b], 'iron_wake')); w.refreshSatellites();
  assert.equal(w.satellites.visuals.length, 2);
  assert.equal(a.sheet.getSourceMods('magicPack:iron_wake:0')?.[0].stat, stat);
  a.owner = w.player; a.team = 'player'; w.refreshMagicPacks(); w.refreshSatellites();
  assert.equal(w.satellites.visuals.length, 1);
  w.kill(b, true); assert.equal(w.satellites.visuals.length, 0);
  grant(a); w.refreshSatellites(); assert.equal(w.satellites.visuals.length, 1);
  a.downed = true; w.refreshSatellites(); assert.equal(w.satellites.visuals.length, 0);
  a.downed = false; w.refreshSatellites(); assert.ok(!w.satellites.visuals[0].armed);
  w.actors = w.actors.filter(e => e !== a); w.refreshSatellites(); assert.equal(w.satellites.visuals.length, 0);
});

check('monster and allied bearers use the same contact path and preserve kill credit', () => {
  const w = fixture(), enemy = body(w), ally = body(w, w.player), target = body(w);
  enemy.pos = { x: 400, y: 400 }; ally.pos = { x: 1000, y: 700 };
  grant(enemy, 1, true); grant(ally, 1, true);
  touch(w, enemy, w.player); touch(w, ally, target); target.life = 1;
  const before = w.player.life; let killer: Actor | undefined;
  SIM_TAP.current = { onDeath: (victim, credited) => { if (victim === target) killer = credited; } };
  try { advance(w, 1.2); } finally { SIM_TAP.current = null; }
  assert.ok(w.player.life < before); assert.ok(target.dead); assert.equal(killer, ally);
});

check('reflection kills the bearer once and prevents remaining contacts or stale visuals', () => {
  const w = fixture(), a = body(w); grant(a, 3, true); a.life = 1;
  touch(w, a, w.player); w.player.sheet.setSource('reflect', [mod('thorns', 'flat', 100000)]);
  let hits = 0;
  SIM_TAP.current = { onHit: caster => { if (caster === a) hits++; } };
  try { advance(w, 2); } finally { SIM_TAP.current = null; }
  assert.ok(a.dead); assert.equal(hits, 1); assert.equal(w.satellites.visuals.length, 0);
});

check('co-op copies exact host geometry and an omitted field clears it', () => {
  const host = fixture(); grant(host.player, 3); advance(host, 1.1);
  const client = fixture(), snap = serializeSnapshot(host, 1);
  applySnapshot(client, snap); assert.deepEqual(client.satellites.visuals, host.satellites.visuals);
  assert.notEqual(client.satellites.visuals[0], host.satellites.visuals[0]);
  delete snap.satellites; applySnapshot(client, snap); assert.equal(client.satellites.visuals.length, 0);
});

check('pack travel and JSON world restore reconstruct grants with a fresh arming tell', () => {
  const w = fixture(); w.zone.objective = { kind: 'clear', all: true }; w.visited.add(w.zone.id);
  const origin = w.zone.id, a = body(w), b = body(w); w.promoteMagicPack([a, b], 'iron_wake');
  advance(w, 1.2); assert.ok(w.satellites.visuals.every(v => v.armed));
  w.loadZone(START_ZONE); assert.equal(w.satellites.visuals.length, 0);
  const saved = JSON.parse(JSON.stringify(w.serializeWorldState()));
  w.loadZone(origin); w.refreshSatellites(); assert.equal(w.satellites.visuals.length, 2);
  assert.ok(w.satellites.visuals.every(v => !v.armed));
  const resumed = fixture(); assert.ok(resumed.adoptWorldState(saved)); resumed.loadZone(origin); resumed.refreshSatellites();
  assert.equal(resumed.satellites.visuals.length, 2); assert.ok(resumed.satellites.visuals.every(v => !v.armed));
});

check('the ordinary world tick advances satellites without allocating targetable actors', () => {
  const w = fixture(); grant(w.player, 2); const count = w.actors.length;
  w.update(1 / 60); assert.equal(w.satellites.visuals.length, 2); assert.equal(w.actors.length, count);
  const angle = w.satellites.visuals[0].angle; w.update(1 / 60);
  assert.notEqual(w.satellites.visuals[0].angle, angle);
});

check('pooled hostile creatures promote into ordinary attributed satellite contact', () => {
  const w = fixture(); grant(w.player, 1, true); w.refreshSatellites();
  const v = w.satellites.visuals[0];
  const id = 'probe_satellite_pooled';
  MONSTERS[id] = { id, name: 'Satellite probe', color: '#fff', shape: 'circle', radius: 5,
    base: { life: 5, moveSpeed: 0, mana: 0 }, skills: [], xp: 0,
    plies: { count: 1 }, lite: { contact: { damage: 0 }, speed: 0 } };
  let hits = 0;
  try {
    w.lite.spawn(w.liteKindOf(id), v.x, v.y, 0, 0, 1);
    SIM_TAP.current = { onHit: (a, b) => { assert.equal(a, w.player); assert.equal(b.defId, id); hits++; } };
    advance(w, 1.2);
    assert.equal(w.lite.liveCount, 0); assert.ok(hits > 0);
  } finally { SIM_TAP.current = null; delete MONSTERS[id]; }
});


const fireStat = satelliteCountStat('cinder_wake');
function fireFixture(count = 1) {
  const w = fixture(), a = w.player, e = body(w);
  a.sheet.setSource('probe-fire', [mod(fireStat, 'flat', count), mod('satelliteSpeed', 'more', -1), mod('critChance', 'override', 0)]);
  e.pos = { x: 980, y: 600 }; return { w, a, e };
}
check('Cinderbound equipment and level-nine packs grant the same fire family', () => {
  assert.ok(!magicPackPool(8).includes(MAGIC_PACKS.cinder_wake));
  assert.ok(magicPackPool(9).includes(MAGIC_PACKS.cinder_wake));
  const w = fixture(), a = body(w), b = body(w);
  assert.ok(w.promoteMagicPack([a, b], 'cinder_wake')); w.refreshSatellites();
  assert.equal(w.satellites.visuals.filter(v => v.family === 'cinder_wake').length, 2);
  const base = Object.values(ITEM_BASES).find(b => b.category === 'ring' && b.dropWeight > 0)!;
  const item = forgeItem({ baseId: base.id, ilvl: 12, rarity: 'magic', affixes: [{ id: 'satellite_cinder_wake' }], quality: 1 })!;
  assert.equal(compileItemMods(item).find(m => m.stat === fireStat)?.value, 1);
  w.meta.equipped.ring1 = item; w.recalcSeat(w.localSeat); w.refreshSatellites();
  assert.equal(w.satellites.visuals.filter(v => v.owner === w.player.id).length, 1);
  const resumed = fixture(); applySavedCharacter(resumed, JSON.parse(JSON.stringify(serializeCharacter(w)))); resumed.refreshSatellites();
  assert.equal(resumed.satellites.visuals[0].family, 'cinder_wake');
});
check('fire warns for the full flight, hits once per blast and agrees at 30/60/120 Hz', () => {
  for (const hz of [30, 60, 120]) {
    const { w, a, e } = fireFixture(); let hits = 0;
    SIM_TAP.current = { onHit: (caster, victim, _r, packet) => {
      assert.equal(caster, a); assert.equal(victim, e); assert.equal(packet.sourceName, 'Cinder Wake'); hits++;
    } };
    try {
      advance(w, 1.1, hz); assert.equal(w.satellites.flights.visuals.length, 1); assert.equal(hits, 0);
      advance(w, 0.7, hz); assert.equal(hits, 0);
      const geometry = JSON.stringify(w.satellites.flights.visuals);
      for (let i = 0; i < 100; i++) w.refreshSatellites();
      assert.equal(JSON.stringify(w.satellites.flights.visuals), geometry); assert.equal(hits, 0);
      advance(w, 0.2, hz); assert.equal(hits, 1);
      advance(w, 5, hz); assert.equal(hits, 3);
    } finally { SIM_TAP.current = null; }
  }
});
check('a mortar stays at its launch mark: dodging works and a different victim can enter the blast', () => {
  const { w, e } = fireFixture(); advance(w, 1.2);
  const shot = w.satellites.flights.visuals[0], mark = { ...shot.to };
  e.pos.x += 150;
  const entering = body(w); entering.pos = { ...mark };
  const before = e.life, entered = entering.life;
  advance(w, 0.8); near(e.life, before); assert.ok(entering.life < entered);
  assert.deepEqual(w.satellites.flights.visuals[0].to, mark);
});
check('fire and satellite tags scale damage; area investment scales exact telegraphed radius', () => {
  const sample = (mods: Modifier[]) => {
    const { w, a } = fireFixture(); a.sheet.setSource('power', mods); const amounts: number[] = [];
    SIM_TAP.current = { onHit: (_a, _b, _r, p) => amounts.push(p.amounts.fire ?? 0) };
    try { seedGlobalRandom(217); advance(w, 2); } finally { SIM_TAP.current = null; }
    assert.equal(amounts.length, 1); return { damage: amounts[0], radius: w.satellites.flights.visuals[0].radius };
  };
  const base = sample([]); assert.ok(base.damage > 0); near(base.radius, 38);
  for (const tag of ['fire', 'aoe', 'satellite', 'satellite:cinder_wake'] as const)
    near(sample([mod('damage', 'more', 1, [tag])]).damage, base.damage * 2);
  near(sample([mod('damage', 'more', 1, ['physical']), mod('minionDamage', 'more', 1)]).damage, base.damage);
  near(sample([mod('aoeRadius', 'more', 1)]).radius, 76);
});
check('additional fire satellites stagger launches and share the total count cap with iron', () => {
  const { w, a } = fireFixture(3); advance(w, 1.2);
  assert.deepEqual(w.satellites.flights.visuals.map(v => v.slot), [0]);
  advance(w, 0.8); assert.ok(w.satellites.flights.visuals.some(v => v.slot === 1 && v.phase === 'flight'));
  a.sheet.setSource('mixed', [mod(stat, 'flat', 6)]); w.refreshSatellites();
  assert.equal(w.satellites.visuals.length, 8);
  assert.equal(w.satellites.visuals.filter(v => v.family === 'cinder_wake').length, 2);
  assert.equal(w.satellites.flights.visuals.length, 0, 're-spacing cancels the previous generation');
});
check('fire has no contact damage; range, walls, stories, allies and untargetability gate launch or impact', () => {
  const { w, e } = fireFixture(); w.refreshSatellites();
  e.pos = { x: w.satellites.visuals[0].x, y: w.satellites.visuals[0].y };
  const life = e.life; advance(w, 1.2); near(e.life, life);
  for (const mode of ['far', 'wall', 'tier', 'ally', 'untargetable'] as const) {
    const { w, a, e } = fireFixture();
    if (mode === 'far') e.pos.x += 1000;
    if (mode === 'wall') w.lineOfSight = () => false;
    if (mode === 'tier') e.tier = 1;
    if (mode === 'ally') { e.owner = a; e.team = a.team; }
    if (mode === 'untargetable') e.untargetable = true;
    advance(w, 2); assert.equal(w.satellites.flights.visuals.length, 0, mode);
  }
  const f = fireFixture(); advance(f.w, 1.2); const before = f.e.life;
  f.w.lineOfSight = () => false; advance(f.w, 0.8); near(f.e.life, before);
});
check('every bearer lifecycle exit cancels pending fire without a ghost impact', () => {
  for (const mode of ['grant', 'death', 'downed', 'removed', 'tier', 'allegiance', 'teleport', 'zone'] as const) {
    const { w, a, e } = fireFixture(); advance(w, 1.2); assert.ok(w.satellites.flights.visuals.length);
    const before = e.life;
    if (mode === 'grant') a.sheet.removeSource('probe-fire');
    if (mode === 'death') a.dead = true;
    if (mode === 'downed') a.downed = true;
    if (mode === 'removed') w.actors = [e];
    if (mode === 'tier') a.tier = 1;
    if (mode === 'allegiance') a.team = 'enemy';
    if (mode === 'teleport') a.pos.x += 500;
    if (mode === 'zone') w.loadZone(START_ZONE);
    advance(w, 0.8); near(e.life, before); assert.equal(w.satellites.flights.visuals.length, 0, mode);
  }
});
check('fire impacts retain allied kill credit and reflection retires all bearer geometry', () => {
  const w = fixture(), ally = body(w, w.player), target = body(w);
  ally.pos = { x: 900, y: 600 }; target.pos = { x: 1050, y: 600 }; target.life = 1;
  ally.sheet.setSource('fire', [mod(fireStat, 'flat', 1)]); let killer: Actor | undefined;
  SIM_TAP.current = { onDeath: (victim, credited) => { if (victim === target) killer = credited; } };
  try { advance(w, 2); } finally { SIM_TAP.current = null; }
  assert.ok(target.dead); assert.equal(killer, ally);
  const r = fixture(), enemy = body(r); enemy.pos = { x: 950, y: 600 }; enemy.life = 1;
  enemy.sheet.setSource('fire', [mod(fireStat, 'flat', 3)]);
  r.player.sheet.setSource('reflection', [mod('thorns', 'flat', 100000)]);
  advance(r, 2); assert.ok(enemy.dead); assert.equal(r.satellites.flights.visuals.length, 0); assert.equal(r.satellites.visuals.length, 0);
});
check('co-op deep-copies fire arcs and landing marks; omitted flights clear replicas', () => {
  const { w } = fireFixture(); advance(w, 1.5); const client = fixture(), snap = serializeSnapshot(w, 1);
  applySnapshot(client, snap); assert.deepEqual(client.satellites.flights.visuals, w.satellites.flights.visuals);
  assert.notEqual(client.satellites.flights.visuals[0].to, w.satellites.flights.visuals[0].to);
  assert.notEqual(client.satellites.flights.visuals[0].from, snap.satelliteFlights![0].from);
  delete snap.satelliteFlights; applySnapshot(client, snap); assert.equal(client.satellites.flights.visuals.length, 0);
});
console.log('PASS satellite integration');
