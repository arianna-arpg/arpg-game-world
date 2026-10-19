import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { orbHitChance, orbReserveNeed } from '../src/engine/orbGeneration';
import { ORB_HIT_RECOVERY as C } from '../src/data/orbs';
import { makeSkillInstance, type SkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import type { Actor } from '../src/engine/actor';
let checks = 0;
const check = (name: string, ok: unknown) => { assert.ok(ok, name); checks++; console.log('PASS ' + name); };
const close = (a: number, b: number) => Math.abs(a - b) < 1e-8;
const restore = seedGlobalRandom(9183);
function rig() {
  const w = makeSimWorld('warrior', 9183), p = w.player;
  p.skills = [makeSkillInstance(SKILLS.life_flask), makeSkillInstance(SKILLS.mana_flask)];
  p.sheet.setSource('rig', [mod('life', 'override', 1000), mod('mana', 'override', 1000), mod('critChance', 'override', 0), mod('accuracy', 'override', 100000)]);
  p.fillResources(); p.charges.clear(); p.pos = { x: 500, y: 600 }; w.walk = null; w.doodads = []; w.markDoodadsChanged(); w.time = 10; w.orbs = []; w.actors = [p];
  const e = w.createMonster('zombie', 1, 'enemy'); e.pos = { x: p.pos.x + 70, y: p.pos.y }; e.tier = p.tier;
  e.sheet.setSource('rig', [mod('life', 'override', 1e9), mod('evasion', 'override', 0), mod('blockChance', 'override', 0), mod('armor', 'override', 0)]);
  e.fillResources(); e.skills = []; e.brain = undefined; w.actors.push(e);
  const inst = makeSkillInstance({ ...SKILLS.claw, baseDamage: { physical: [10, 10] }, effects: [{ type: 'damage' }] });
  const hit = (skill = inst, victim = e, depth = 0) => (w as unknown as { resolveHit(a: Actor, s: SkillInstance, e: Actor, m: number, d: number): void }).resolveHit(p, skill, victim, 1, depth);
  return { w, p, e, inst, hit };
}
try {
  {
    const { p } = rig(); p.life = 0; p.mana = 0;
    check('no eligible grant gains nothing', orbHitChance(p, 'life', 0, 0) === 0);
    check('empty resource and flask raise 5% to 20%', close(orbHitChance(p, 'life', .05, 0), .2));
    check('repeated attempts in same interval are rejected', orbHitChance(p, 'life', .05, .749) === 0);
    check('mana has an independent kind clock', close(orbHitChance(p, 'mana', .05, 0), .2));
    check('clock opens at the exact deadline', orbHitChance(p, 'life', .05, C.interval) > 0);
    check('restoring an earlier world clock does not strand recovery', orbHitChance(p, 'life', .05, 0) > 0);
    check('independent casters do not share a roll clock', orbHitChance(rig().p, 'life', .05, 0) > 0);
  }
  for (const resource of [0, .15, .3, .45, .6, 1]) for (const charges of [0, 1, 2, 3]) {
    const { p } = rig(); p.life = 1000 * resource; p.charges.set('flask_life', charges);
    const expected = .05 * (1 + 3 * Math.max(0, 1 - resource / .6) * (1 - charges / 3));
    check('smooth life/bank odds ' + resource + '/' + charges, close(orbHitChance(p, 'life', .05, 0), expected));
  }
  {
    const { p } = rig(); p.reservedLife = 800; p.reservedMana = 800; p.life = p.lifeCeiling(); p.mana = p.availableMaxMana();
    check('full usable pools do not gain a reservation bonus', close(orbHitChance(p, 'life', .05, 0), .05) && close(orbHitChance(p, 'mana', .05, 0), .05));
    p.life = 1; check('stacked sources remain below existing 50% ceiling', orbHitChance(p, 'life', 20, 1) === .5);
  }
  {
    const { p } = rig(); p.charges.set('flask_mana', 3); p.charges.set('flask_quicksilver', 3);
    p.skills.push(makeSkillInstance(SKILLS.quicksilver_flask));
    check('unrelated full flasks do not mask missing life reserves', orbReserveNeed(p, 'life') === 1);
    const life = p.skills[0]!; p.charges.set('flask_life', 1); p.skills.push(life);
    check('duplicate slots do not double-count a reserve', close(orbReserveNeed(p, 'life'), 2 / 3));
    p.skills = [makeSkillInstance(SKILLS.mana_flask)]; p.charges.set('flask_life', 3);
    check('unequipped banks do not affect assistance', orbReserveNeed(p, 'life') === 1);
  }
  {
    const { p } = rig(), catalyst = makeSkillInstance(SKILLS.catalyst_flask);
    p.skills.push(catalyst); p.charges.set('flask_catalyst', 6);
    check('a filled restorative wildcard flask counts for both resources', orbReserveNeed(p, 'life') === 0 && orbReserveNeed(p, 'mana') === 0);
  }
  {
    const s = rig(); s.p.sheet.setSource('orbs', [mod('orbOnHit_life', 'flat', 1), mod('orbOnHit_mana', 'flat', 1)]);
    const random = Math.random;
    try {
      Math.random = () => .99; s.hit();
      check('the first failed hit still deals damage', s.e.life < 1e9);
      Math.random = () => 0;
      for (let i = 0; i < 100; i++) s.hit(i % 2 ? makeSkillInstance(SKILLS.heavy_strike) : s.inst);
      check('failed rolls consume shared cooldown across hits and skill swaps', s.w.orbs.length === 0);
      s.w.time += C.interval; s.hit();
      check('first later contact can shed one orb of each kind', s.w.orbs.length === 2);
      for (let i = 0; i < 20; i++) s.hit();
      check('successful rolls also consume the interval', s.w.orbs.length === 2);
      s.w.time += C.interval; s.hit(s.inst, s.e, 1);
      check('proc-depth hits cannot shed or steal the window', s.w.orbs.length === 2);
      s.hit(); check('a top-level hit keeps its window after a proc', s.w.orbs.length === 4);
    } finally { Math.random = random; }
  }
  // Count actual sheds through resolveHit, independent from combat RNG. Same
  // hit times with extra targets/repeats must yield the same bounded stream.
  function barrage(interval: number, targets: number) {
    const s = rig(); s.p.sheet.setSource('orbs', [mod('orbOnHit_life', 'flat', 1)]);
    const random = Math.random; let count = 0;
    try {
      Math.random = () => 0;
      for (let tick = 0; tick < 600; tick++) {
        s.w.time = 10 + tick / 20;
        if (tick % Math.round(interval * 20) !== 0) continue;
        for (let i = 0; i < targets; i++) s.hit();
        count += s.w.orbs.length; s.w.orbs = [];
      }
    } finally { Math.random = random; }
    return count;
  }
  const plain = barrage(.75, 1), chained = barrage(.75, 12), fast = barrage(.05, 12);
  check('one target, twelve hits and hyper-fast attacks all cap at 40 attempts/30s', plain === 40 && chained === plain && fast === plain);
  {
    const s = rig(); s.p.sheet.setSource('orbs', [mod('orbOnHit_life', 'flat', 1)]);
    const random = Math.random;
    try {
      Math.random = () => 0;
      // Execute real Chain Lightning against a crowd. Its secondary
      // damage must land without extra generation opportunities.
      for (let i = 0; i < 5; i++) { const e = s.w.createMonster('zombie', 1, 'enemy'); e.pos = { x: s.e.pos.x + i * 10, y: s.e.pos.y + 30 }; e.sheet.setSource('rig', [mod('life', 'override', 1e6), mod('evasion', 'override', 0)]); e.fillResources(); s.w.actors.push(e); }
      s.w.actors.filter(a => a !== s.p).forEach(a => { a.brain = undefined; a.anchored = true; });
      s.w.executeSkill(s.p, makeSkillInstance(SKILLS.chain_lightning), s.e.pos);
      for (let i = 0; i < 30; i++) s.w.update(1 / 60);
      check('real Chain Lightning damages multiple targets with one life-orb opportunity', s.w.orbs.filter(o => o.kind === 'life').length === 1 && s.w.actors.filter(a => a !== s.p && a.life < a.maxLife()).length >= 2);
    } finally { Math.random = random; }
  }
  {
    const s = rig(); s.inst.sockets[0] = { def: SUPPORTS.crimson_harvest, level: 1 };
    const random = Math.random;
    try { Math.random = () => 0; s.hit(); check('skill-local Harvest grants still participate', s.w.orbs.length === 1); }
    finally { Math.random = random; }
  }
  {
    const s = rig(); s.p.sheet.setSource('orbs', [mod('orbOnHit_wakeflame', 'flat', 1)]);
    const random = Math.random;
    try { Math.random = () => 0; s.hit(); s.hit(); check('unrelated Wakeflame hit economy is unchanged', s.w.orbs.length === 2); }
    finally { Math.random = random; }
  }
  console.log('PASS ' + checks + ' orb generation checks');
} finally { restore(); }
