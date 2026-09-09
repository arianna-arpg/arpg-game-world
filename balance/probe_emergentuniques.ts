// Real-engine content contracts: gear grants, socketed trigger payloads,
// owner credit, cooldown discipline, removal, and save fidelity.
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { vec } from '../src/core/math';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import { makeSkillInstance, type SkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { setSimTap } from '../src/engine/tap';
import { compileItemMods, describeItem, rebuildItem, rollItem } from '../src/engine/itemgen';
import { ITEM_BASES } from '../src/data/itembases';
import { UNIQUE_LIST, UNIQUES } from '../src/data/uniques';
import { EMERGENT_PROCS, EMERGENT_UNIQUES } from '../src/data/uniques/emergent';
import { PROC_LIST, procPowerStat, procStat } from '../src/data/procs';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { applySavedCharacter, serializeCharacter } from '../src/meta/character';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failed++;
};
const step = (w: World, seconds: number): void => {
  for (let n = 0; n < Math.ceil(seconds * 60); n++) w.update(1 / 60);
};
const rig = (seed: number): World => {
  const w = makeSimWorld('warrior', seed);
  // Pin combat AFTER town construction, independent of its random seating.
  seedGlobalRandom(seed);
  return w;
};
const body = (w: World, x: number, y: number, owner?: Actor): Actor => {
  const a = w.createMonster('zombie', 3, owner ? 'player' : 'enemy');
  a.pos = vec(x, y);
  a.owner = owner;
  a.brain = undefined;
  a.sheet.setBase('life', 10000);
  a.life = a.maxLife();
  a.sheet.setSource('fixture', [mod('evasion', 'flat', -1e6), mod('armor', 'flat', -1e6)]);
  w.actors.push(a);
  return a;
};
const equip = (w: World, id: string): void => {
  const item = rollItem({ ilvl: 20, uniqueId: id })!;
  const slot = ITEM_BASES[item.baseId].category;
  // These three categories are also their equipment-slot IDs.
  Object.assign(w.localSeat.meta.equipped, { [slot]: item });
  w.recalcSeat(w.localSeat);
};
const unequip = (w: World): void => {
  w.localSeat.meta.equipped = {};
  w.recalcSeat(w.localSeat);
};

bootSimEngine();
seedGlobalRandom(0xe113);
for (const def of EMERGENT_UNIQUES) {
  check(`${def.id}: registered once on a droppable base`,
    UNIQUE_LIST.filter(u => u.id === def.id).length === 1 && UNIQUES[def.id] === def
    && ITEM_BASES[def.baseId]?.dropWeight > 0 && def.weight > 0);
  for (const ilvl of [def.minIlvl!, 30, 60, 100]) {
    const item = rollItem({ ilvl, uniqueId: def.id })!;
    const mods = compileItemMods(item);
    check(`${def.id}@${ilvl}: finite rolls, bounded chance, readable lines`,
      mods.every(m => Number.isFinite(m.value))
      && mods.filter(m => m.stat.startsWith('proc_')).every(m => m.value >= 0.65 && m.value <= 0.85)
      && describeItem(item).unique.every(s => s.length > 0 && !/\{v|NaN|undefined/.test(s)));
    const restored = rebuildItem(JSON.parse(JSON.stringify(item)))!;
    check(`${def.id}@${ilvl}: item save preserves modifiers`,
      JSON.stringify(compileItemMods(restored)) === JSON.stringify(mods));
  }
}
check('each new proc registers once', EMERGENT_PROCS.every(p => PROC_LIST.filter(d => d.id === p.id).length === 1));

// Rimewake: press a real movement art; observe a real socketed Frost Nova.
{
  const w = rig(0xe114), p = w.player;
  equip(w, 'rimewake');
  const row = w.localSeat.grantedSkills!.find(g => g.def.id === 'frost_nova')!;
  check('Rimewake: the granted skill is attributed to its item', row.source === 'Rimewake');
  const stone = w.grantSupportGemItem(w.localSeat, { def: SUPPORTS.widening, level: 1 });
  check('Rimewake: its granted nova accepts Widening', !!stone && w.socketSupport(stone.uid, 'frost_nova', w.localSeat));
  const novaCasts: SkillInstance[] = [];
  setSimTap({ onCast: (caster, inst) => {
    if (caster === p && inst.def.id === 'frost_nova') novaCasts.push(inst);
  } });
  const dash = makeSkillInstance(SKILLS.dash, 1);
  p.skills[7] = dash;
  let chilled = false;
  for (let n = 0; n < 6 && !novaCasts.length; n++) {
    // Beyond the unsocketed nova's 115 + body-radius reach, within Widening.
    const target = body(w, p.pos.x + 145, p.pos.y);
    p.mana = p.maxMana();
    p.cooldowns.clear();
    w.useSkill(p, dash, vec(p.pos.x + 120, p.pos.y));
    chilled ||= target.statuses.some(s => s.id === 'chill');
    if (!novaCasts.length) step(w, 3);
  }
  check('Rimewake: movement releases the held, socketed nova and chills nearby foes',
    novaCasts.length === 1 && novaCasts[0] === row.inst
    && row.inst.sockets.some(s => s?.def.id === 'widening') && chilled);
  // Cast-family negative and ICD tests use the public event seam without
  // waiting out its clock; the positive above entered through useSkill.
  const before = novaCasts.length;
  for (let n = 0; n < 12; n++) w.rollOwnProcs(p, 'cast', { inst: dash });
  check('Rimewake: repeated movement events respect the shared ICD', novaCasts.length === before);
  step(w, 3);
  for (let n = 0; n < 12; n++) w.rollOwnProcs(p, 'cast', { inst: makeSkillInstance(SKILLS.firebolt, 1) });
  check('Rimewake: ordinary spell casts do not qualify', novaCasts.length === before);
  setSimTap(null);
  const saved = JSON.parse(JSON.stringify(serializeCharacter(w)));
  const loaded = rig(0xe115);
  applySavedCharacter(loaded, saved);
  check('Rimewake: character save retains its granted socket',
    loaded.localSeat.grantedInsts?.get('frost_nova')?.sockets.some(s => s?.def.id === 'widening') === true);
  unequip(w);
  check('Rimewake: removal drops grant and trigger',
    !w.localSeat.grantedInsts?.has('frost_nova') && p.sheet.get(procStat('rimewake_release')) === 0);
}

// Mourning Bell: a real granted summon feeds its own keeper when it dies.
{
  const w = rig(0xe116), p = w.player;
  equip(w, 'mourning_bell');
  const summon = w.localSeat.grantedInsts!.get('summon_skeleton')!;
  p.mana = p.maxMana();
  const cast = w.useSkill(p, summon, vec(p.pos.x + 60, p.pos.y));
  step(w, 1.2);
  const pet = w.actors.find(a => a.owner === p && !a.dead);
  check('Mourning Bell: granted skill raises a real owned minion', cast && !!pet);
  const wardBefore = p.ward;
  if (pet) w.kill(pet);
  // A missed chance is not a broken trigger; a seeded bounded sample
  // exercises the authored chance without replacing the equipment grant.
  for (let n = 0; n < 5 && p.ward === wardBefore; n++) w.kill(body(w, 300 + n * 40, 300, p));
  const expected = 0.08 * p.maxLife() * p.sheet.get(procPowerStat('mourning_bell_toll')) * p.sheet.get('wardGain');
  check('Mourning Bell: ward uses keeper life, rolled proc power and ward gain',
    Math.abs(p.ward - wardBefore - expected) < 1e-6, `gained ${p.ward - wardBefore}, expected ${expected}`);
  const after = p.ward;
  for (let n = 0; n < 8; n++) w.kill(body(w, 300 + n * 40, 400, p));
  check('Mourning Bell: simultaneous deaths cannot bypass ICD', p.ward === after);
  step(w, 2);
  const other = body(w, 300, 500), held = p.ward;
  for (let n = 0; n < 8; n++) w.kill(body(w, 350 + n * 40, 500, other));
  check('Mourning Bell: another keeper\'s losses grant this wearer nothing', p.ward === held);
  unequip(w);
  const bare = p.ward;
  for (let n = 0; n < 8; n++) w.kill(body(w, 300 + n * 40, 600, p));
  check('Mourning Bell: no new ward or granted summon after removal',
    p.ward === bare && !w.localSeat.grantedInsts?.has('summon_skeleton'));
}

// Faultline: an owned knockback reaches a real rock; open travel pays nothing.
{
  const w = rig(0xe117), p = w.player;
  equip(w, 'faultline_grips');
  const dash = makeSkillInstance(SKILLS.dash, 1), fire = makeSkillInstance(SKILLS.firebolt, 1);
  const blow = makeSkillInstance(SKILLS.cleave, 1);
  p.skills[6] = fire; p.skills[7] = dash;
  w.doodads.push({ pos: vec(700, 300), radius: 42, kind: 'rock' });
  w.markDoodadsChanged();
  const clocks = (): void => { p.cooldowns.set('dash', 10); p.cooldowns.set('firebolt', 10); };
  const gap = (): number => (p.cooldowns.get('firebolt') ?? 0) - (p.cooldowns.get('dash') ?? 0);
  clocks();
  w.pushActor(body(w, 400, 700), 0, 120, p, blow);
  step(w, 0.8);
  check('Faultline: unobstructed knockback gives no refund', Math.abs(gap()) < 1e-6);
  let refunded = false;
  for (let n = 0; n < 6 && !refunded; n++) {
    clocks();
    const target = body(w, 610, 300);
    w.pushActor(target, 0, 260, p, blow);
    step(w, 0.5);
    refunded = gap() > 2;
    // Remove the old body's collision surface before the next attempt.
    target.pos = vec(100 + n * 50, 900);
  }
  check('Faultline: a real wall arrest refunds movement but not ordinary spells', refunded, `clock difference ${gap()}`);
  clocks();
  for (let n = 0; n < 12; n++) w.rollOwnProcs(p, 'collision', { inst: blow });
  check('Faultline: collision spam respects ICD', Math.abs(gap()) < 1e-6);
  step(w, 3);
  clocks();
  // Same public event, now with a fresh clock: the amount is a fraction
  // of what remains, not a reset or a fixed number of seconds.
  for (let n = 0; n < 12 && gap() === 0; n++) w.rollOwnProcs(p, 'collision', { inst: blow });
  check('Faultline: exactly a quarter of remaining movement cooldown is removed',
    p.cooldowns.get('dash') === 7.5 && p.cooldowns.get('firebolt') === 10);
  step(w, 3);
  unequip(w);
  clocks();
  for (let n = 0; n < 12; n++) w.rollOwnProcs(p, 'collision', { inst: blow });
  check('Faultline: removal disables the refund', Math.abs(gap()) < 1e-6);
}

setSimTap(null);
console.log(`\nEmergent uniques: ${failed ? `${failed} FAILED` : 'all passed'}`);
process.exitCode = failed ? 1 : 0;
