// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE LEGEND FABRIC (docs/engine/legends.md): uniques that
// ENABLE builds. Pins:
//   A. THE ROSTER CENSUS — every legend validates (known stats; a real skill
//      behind every skillgrant_; a registered proc behind every proc_ /
//      procPower_; every LEGEND_PROC registered on the live list) and wears
//      at least one SIGNATURE line (THE DEFINING LAW: a shape no rolled
//      affix can produce), and the describer speaks the new lines.
//   B. THE GRANTED SKILL — equip → a real instance on the seat's granted
//      lane at the folded level, auto-seated on the bar, castable, refusing
//      unlearn and essence leveling, socketing a support whose residence
//      lands on the item, surviving unequip → re-equip and a save round
//      trip (same seat, same stone), summing across grantors, and leaving
//      cleanly (off the bar, the lane empty).
//   C. THE OWN-COPY CAST — the flagship's spell-cast trigger fires the HELD
//      granted instance (its socketed stone rides the payload).
//   D. THE PROC POWER + THE BLOW'S TYPE GATE — scaleProcEffect folds the
//      magnitude; a lightning blow rings Stormcall's answer, a physical one
//      does not.
//   E. THE STRIDE — walking arms 'strided' at the sheet's reach, the
//      condition pays the roll, a landed blow spends it at the next tick.
//   F. THE ROOTED RAMP — the 'still' gauge climbs with idleFor to its cap
//      and the sheet's damage climbs with it.
//   G. THE BLOOM — a minion of a bloom-wearing keeper wears the marker,
//      detonates on time, wounds the foe beside it, and dies.
//   H. THE EXTRA LANE — extraAs_fire adds fire on top of an unconverted roll.
// Run: npx tsx balance/probe_legends.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { vec } from '../src/core/math';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import { GRANT_CFG, makeSkillInstance, skillGrantStat, skillMaxLevel } from '../src/engine/skills';
import { STAT_DEFS, extraAsStat, mod } from '../src/engine/stats';
import { applyConversion } from '../src/engine/damage';
import { DERIVED_GAUGES, GAUGE_CFG } from '../src/engine/gauges';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { ITEM_AFFIX_LIST } from '../src/data/itemaffixes';
import { LEGEND_PROCS, UNIQUE_LIST } from '../src/data/uniques';
import { PROCS, PROC_LIST, procPowerStat, procStat, scaleProcEffect } from '../src/data/procs';
import { compileItemMods, describeItem, isKnownItemStat, rollItem } from '../src/engine/itemgen';
import type { ModLineDef } from '../src/engine/items';
import { sheetFamilyOf } from '../src/data/sheet';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x1e9e);

const step = (w: World, dt: number, n = 1): void => { for (let i = 0; i < n; i++) w.update(dt); };
/** Step until `pred` holds (a cast bar completing, a flight landing) or the
 *  budget runs out; returns whether it held. */
const until = (w: World, pred: () => boolean, dt = 0.05, max = 40): boolean => {
  for (let i = 0; i < max; i++) { if (pred()) return true; w.update(dt); }
  return pred();
};
const spawn = (w: World, id: string, lv: number, x: number, y: number): Actor => {
  const m = w.createMonster(id, lv, 'enemy');
  m.pos = vec(x, y);
  w.actors.push(m);
  return m;
};
/** A standing target that cannot evade, cannot mitigate, does not think and
 *  does not die (the probe_talents dummy idiom — single-hit rigs must land). */
const dummy = (w: World, x: number, y: number, life = 1000): Actor => {
  const z = spawn(w, 'zombie', 3, x, y);
  z.sheet.setSource('probe', [mod('evasion', 'flat', -1e6), mod('armor', 'flat', -1e6)]);
  z.sheet.setBase('life', life);
  z.life = life;
  z.brain = undefined;
  return z;
};

// ------------------------------------------------- A. THE ROSTER CENSUS
const shapeKey = (l: ModLineDef): string =>
  `${l.stat}|${l.kind}|${l.when ?? ''}|${l.gauge ?? ''}|${(l.tags ?? []).join(',')}|${l.fromStat ?? ''}|${l.local ? 'L' : ''}`;
const affixShapes = new Set(ITEM_AFFIX_LIST.flatMap(a => a.lines.map(shapeKey)));
// THE DEFINING LAW's read: a line is a SIGNATURE when no affix family rolls
// its exact shape, OR when it grants a KIT-LEVER family (the sheet's own
// 'skills' category — grafts, grants, procs, combos: a granted power is a
// build lever even where an affix can roll one — The Rote Hand's law).
const isSignature = (l: ModLineDef): boolean =>
  !affixShapes.has(shapeKey(l)) || sheetFamilyOf(l.stat)?.cat === 'skills';
{
  const unknown: string[] = [];
  const badGrant: string[] = [];
  const badProc: string[] = [];
  const poolOnly: string[] = [];
  const signatures: string[] = [];
  for (const u of UNIQUE_LIST) {
    let sig = 0;
    for (const l of u.lines) {
      if (!isKnownItemStat(l.stat)) unknown.push(`${u.id}:${l.stat}`);
      if (l.stat.startsWith('skillgrant_') && !SKILLS[l.stat.slice('skillgrant_'.length)]) badGrant.push(`${u.id}:${l.stat}`);
      if (l.stat.startsWith('proc_') && !PROCS[l.stat.slice('proc_'.length)]) badProc.push(`${u.id}:${l.stat}`);
      if (l.stat.startsWith('procPower_') && !PROCS[l.stat.slice('procPower_'.length)]) badProc.push(`${u.id}:${l.stat}`);
      if (isSignature(l)) sig++;
    }
    if (sig === 0) poolOnly.push(u.id);
    signatures.push(`${u.id}:${sig}`);
  }
  check('A1 every legend line names a known stat', unknown.length === 0, unknown.join(' '));
  check('A2 every skillgrant_ names a real skill', badGrant.length === 0, badGrant.join(' '));
  check('A3 every proc_ / procPower_ names a registered proc', badProc.length === 0, badProc.join(' '));
  check('A4 THE DEFINING LAW: no legend is a pure affix pool', poolOnly.length === 0,
    poolOnly.length ? `pool-only: ${poolOnly.join(' ')}` : signatures.join(' '));
  check('A5 every LEGEND_PROC stands on the live registry + list with both stat rows',
    LEGEND_PROCS.every(d => PROCS[d.id] === d && PROC_LIST.includes(d)
      && !!STAT_DEFS[procStat(d.id)] && STAT_DEFS[procPowerStat(d.id)]?.base === 1));
  check('A6 the roster carries the ruled identities',
    ['cindervigil', 'wanderers_wake', 'gravebloom', 'stormcall', 'the_unmoved', 'emberbrand'].every(id => UNIQUE_LIST.some(u => u.id === id)));
  const vigil = rollItem({ ilvl: 20, uniqueId: 'cindervigil' });
  const spoken = vigil ? describeItem(vigil).unique.join(' | ') : '';
  check('A7 the describer speaks the grant, the trigger and the extra lane',
    /Grants Level \d Firebolt/.test(spoken) && spoken.includes('Grants Level 1 Pyroclast Bolt')
    && spoken.includes('looses your Pyroclast Bolt') && /Gain \d+(\.\d+)?% of damage as extra fire/.test(spoken),
    spoken);
  const wake = rollItem({ ilvl: 20, uniqueId: 'wanderers_wake' });
  const wakeSpoken = wake ? describeItem(wake).unique.join(' | ') : '';
  check('A8 the stride speaks whole paces and the condition\'s words',
    /After walking \d+ paces/.test(wakeSpoken) && wakeSpoken.includes('on your next blow after striding'), wakeSpoken);
  const unmoved = rollItem({ ilvl: 20, uniqueId: 'the_unmoved' });
  const unmovedSpoken = unmoved ? describeItem(unmoved).unique.join(' | ') : '';
  check('A9 the rooted ramp speaks a percent per second', /\d+(\.\d+)?% more damage for every second/.test(unmovedSpoken), unmovedSpoken);
}

// --------------------------------------------- B. THE GRANTED SKILL
const w: World = makeSimWorld('warrior', 0x1e9f);
const seat = w.localSeat;
const hero = seat.actor;
check('B0 a bare seat grants nothing (census hygiene)',
  seat.grantedSkills === undefined && seat.grantedInsts === undefined);
const vigil = rollItem({ ilvl: 20, uniqueId: 'cindervigil' })!;
const vigilMods = compileItemMods(vigil);
const rolledFire = Math.floor(vigilMods.find(m => m.stat === skillGrantStat('firebolt'))!.value);
check('B1 the legend compiles both grant lines (Firebolt at a whole level ≥ 1, Pyroclast at 1)',
  rolledFire >= 1 && vigilMods.some(m => m.stat === skillGrantStat('pyroclast_bolt') && m.value === 1), `firebolt L${rolledFire}`);
seat.meta.equipped['helmet'] = vigil;
w.recalcSeat(seat);
const fireRow = () => (seat.grantedSkills ?? []).find(r => r.def.id === 'firebolt');
const pyroRow = () => (seat.grantedSkills ?? []).find(r => r.def.id === 'pyroclast_bolt');
check('B2 worn, the helm grants both skills at the folded levels, sourced to the piece',
  fireRow()?.level === rolledFire && pyroRow()?.level === 1
  && fireRow()?.inst.grantedBy === vigil.name && fireRow()?.hostUid === vigil.uid,
  (seat.grantedSkills ?? []).map(r => `${r.def.id}@L${r.level}:${r.slot}`).join(' '));
check('B3 a grant is worn, not owned: the learned book never holds it',
  !seat.meta.knownSkills.has('firebolt') && !seat.meta.knownSkills.has('pyroclast_bolt'));
check('B4 THE SEATING: both auto-seat on empty bar seats',
  (fireRow()?.slot ?? -1) >= 0 && hero.skills[fireRow()!.slot] === fireRow()!.inst
  && (pyroRow()?.slot ?? -1) >= 0);
check('B5 the granted instance carries GRANT_CFG.sockets sockets',
  fireRow()?.inst.sockets.length === GRANT_CFG.sockets);
{
  // A cast bar (useTime) — the bolt leaves when the bar completes.
  const fire = fireRow()!.inst;
  const ok = w.useSkill(hero, fire, vec(hero.pos.x + 220, hero.pos.y));
  const flew = until(w, () => w.projectiles.some(p => p.inst === fire));
  check('B6 castable: the granted Firebolt fires from the bar', ok && flew,
    `press ${ok}, ${w.projectiles.length} in flight`);
  until(w, () => !w.projectiles.length, 0.1, 40); // let the flight land before the next rig
}
check('B7 unlearn refuses (no gem to mint back)', !w.unlearnSkill('firebolt', seat) && fireRow() !== undefined);
check('B8 essence leveling refuses (the roll is the level)', !w.levelUpSkill('firebolt', seat) && fireRow()?.level === rolledFire);
const stone = w.grantSupportGemItem(seat, { def: SUPPORTS['splitting'], level: 1 });
check('B9 a support sockets into the granted skill', !!stone && w.socketSupport(stone!.uid, 'firebolt', seat)
  && fireRow()!.inst.sockets.some(s => s?.def.id === 'splitting'));
check('B10 THE RESIDENCE ON THE ITEM: the stone lands on the helm\'s grantState',
  vigil.grantState?.firebolt?.sockets.some(s => s?.supportId === 'splitting') === true);
const seatBefore = fireRow()!.slot;
const instBefore = fireRow()!.inst;
delete seat.meta.equipped['helmet'];
w.recalcSeat(seat);
check('B11 unequipped, the grant leaves cleanly: lane empty, bar cleared',
  seat.grantedSkills === undefined && seat.grantedInsts === undefined
  && hero.skills.every(s => s?.def.id !== 'firebolt' && s?.def.id !== 'pyroclast_bolt'));
seat.meta.equipped['helmet'] = vigil;
w.recalcSeat(seat);
check('B12 re-equipped, a fresh instance wears the same stone from the item',
  fireRow()!.inst !== instBefore && fireRow()!.inst.sockets.some(s => s?.def.id === 'splitting'));
w.bindSkill(seatBefore, 'firebolt', seat);
check('B13 bindSkill seats a granted id by name', hero.skills[seatBefore]?.def.id === 'firebolt');
{
  const save = serializeCharacter(w);
  check('B14 the save carries the grant only as the helm + the bar id (no learned entry)',
    !save.knownSkills.some(s => s.skillId === 'firebolt') && save.bar[seatBefore] === 'firebolt'
    && JSON.stringify(save.equipped).includes('"grantState"'));
  const w2: World = makeSimWorld('warrior', 0x1ea0);
  check('B15 the save adopts', applySavedCharacter(w2, save));
  const row2 = (w2.localSeat.grantedSkills ?? []).find(r => r.def.id === 'firebolt');
  check('B16 a reload seats the granted skill where it stood, at its level, wearing its stone',
    row2?.slot === seatBefore && row2?.level === rolledFire
    && row2?.inst.sockets.some(s => s?.def.id === 'splitting') === true
    && w2.localSeat.actor.skills[seatBefore] === row2?.inst,
    `${row2?.slot}@L${row2?.level}`);
}
{
  const ember = rollItem({ ilvl: 20, uniqueId: 'emberbrand' })!;
  const emberLvl = compileItemMods(ember).find(m => m.stat === skillGrantStat('firebolt'))!.value;
  seat.meta.equipped['ring1'] = ember;
  w.recalcSeat(seat);
  const summed = Math.min(skillMaxLevel(SKILLS.firebolt), Math.floor(
    vigilMods.find(m => m.stat === skillGrantStat('firebolt'))!.value + emberLvl));
  check('B17 two grantors SUM through the one stat engine (the same instance re-leveled)',
    fireRow()?.level === summed && fireRow()?.inst === hero.skills[seatBefore], `helm + ring → L${summed}`);
  delete seat.meta.equipped['ring1'];
  w.recalcSeat(seat);
  check('B18 …and the ring\'s share leaves with it', fireRow()?.level === rolledFire);
}

// ------------------------------------------------ C. THE OWN-COPY CAST
{
  // Socket a stone into the GRANTED Pyroclast Bolt; a spell cast must fire
  // that very instance (the payload's projectile carries it).
  const pyro = pyroRow()!.inst;
  const stone2 = w.grantSupportGemItem(seat, { def: SUPPORTS['splitting'], level: 1 });
  check('C1 the granted Pyroclast Bolt takes a stone', !!stone2 && w.socketSupport(stone2!.uid, 'pyroclast_bolt', seat)
    && pyro.sockets.some(s => s?.def.id === 'splitting'));
  // The answer rides the COMPLETED cast (the bar's end), at its capped
  // 95% — two presses, so a single seeded miss can never read as a law.
  let ownFlew = false;
  let pyroCount = 0;
  let allCount = 0;
  let pressed = 0;
  for (let i = 0; i < 2 && !ownFlew; i++) {
    hero.mana = hero.maxMana();
    const before = w.projectiles.length;
    if (w.useSkill(hero, fireRow()!.inst, vec(hero.pos.x + 220, hero.pos.y))) pressed++;
    until(w, () => w.projectiles.slice(before).some(p => p.inst.def.id === 'pyroclast_bolt'), 0.05, 30);
    const fired = w.projectiles.slice(before);
    allCount = fired.length;
    pyroCount = fired.filter(p => p.inst.def.id === 'pyroclast_bolt').length;
    ownFlew = fired.some(p => p.inst === pyro);
    until(w, () => !w.projectiles.length, 0.1, 40);
  }
  check('C2 casting a spell also looses the HELD Pyroclast Bolt (the own-copy law)',
    pressed > 0 && ownFlew, `${pressed} presses, ${allCount} projectiles on the last, ${pyroCount} pyroclast`);
  check('C3 the payload never re-triggers itself (one answer per press)', pyroCount >= 1 && pyroCount <= 2);
}
delete seat.meta.equipped['helmet'];
w.recalcSeat(seat);

// ---------------------------- D. THE PROC POWER + THE BLOW'S TYPE GATE
{
  const fx = { type: 'explosion' as const, damageScale: 0.9, radius: 85 };
  const scaled = scaleProcEffect(fx, 1.3);
  check('D1 scaleProcEffect folds the magnitude (explosion)',
    scaled.type === 'explosion' && Math.abs(scaled.damageScale - 1.17) < 1e-9 && scaled.radius === 85);
  check('D2 power 1 returns the authored object (no copy)', scaleProcEffect(fx, 1) === fx);
  const cast = scaleProcEffect({ type: 'cast', cast: { skillId: 'stormcall_strike', count: [1, 1] } }, 1.5);
  check('D3 a cast payload scales its multiplier', cast.type === 'cast' && cast.cast.mult === 1.5);
  const buff = { type: 'buff' as const, buff: { type: 'buff' as const, id: 'x', duration: 3, mods: [] } };
  check('D4 structural shapes stay as authored', scaleProcEffect(buff, 2) === buff);
  check('D5 stormcall_answer gates on the lightning blow', PROCS.stormcall_answer?.hitType === 'lightning');
  // A forced 100% answer: a lightning bolt rings it, a physical cleave does not.
  hero.sheet.setSource('probe', [mod(procStat('stormcall_answer'), 'flat', 1)]);
  const z = dummy(w, hero.pos.x + 44, hero.pos.y);
  const answered = () => w.texts.filter(t => t.text === 'Stormcall!').length;
  const t0 = answered();
  // A STRAIGHT lightning bolt (chain_lightning — spark_bolt wobbles and can
  // miss a small body). Cast bar + flight; capped 95% — two bolts so a
  // seeded miss is no law. The blow must LAND for the gate to be tested.
  hero.skills[6] = makeSkillInstance(SKILLS.chain_lightning, 1);
  const zLife = z.life;
  for (let i = 0; i < 2 && answered() === t0; i++) {
    hero.mana = hero.maxMana();
    w.useSkill(hero, hero.skills[6]!, vec(z.pos.x, z.pos.y));
    until(w, () => answered() > t0, 0.05, 24);
  }
  check('D6 a lightning blow calls the answer', z.life < zLife && answered() > t0,
    `landed=${z.life < zLife}, ${t0} → ${answered()}`);
  const t1 = answered();
  const cleave = hero.skills.find(s => s?.def.id === 'cleave')!;
  const z2 = dummy(w, hero.pos.x + 30, hero.pos.y);
  const z2Life = z2.life;
  for (let i = 0; i < 2 && z2.life >= z2Life; i++) {
    hero.mana = hero.maxMana();
    w.useSkill(hero, cleave, vec(z2.pos.x, z2.pos.y));
    until(w, () => z2.life < z2Life, 0.05, 24);
  }
  check('D7 a physical blow does not', z2.life < z2Life && answered() === t1, `landed=${z2.life < z2Life}, ${t1} → ${answered()}`);
  hero.sheet.removeSource('probe');
  hero.skills[6] = null;
  for (const a of [z, z2]) if (!a.dead) w.kill(a, true);
}

// ------------------------------------------------------ E. THE STRIDE
{
  const w3: World = makeSimWorld('warrior', 0x1ea1);
  const s3 = w3.localSeat;
  const p3 = s3.actor;
  const baseDmg = p3.sheet.get('damage');
  const wake = rollItem({ ilvl: 20, uniqueId: 'wanderers_wake' })!;
  s3.meta.equipped['boots'] = wake;
  w3.recalcSeat(s3);
  const reach = p3.sheet.get('strideReach');
  check('E1 the boots arm a reach', reach > 0, `reach ${reach}`);
  check('E2 unwalked: no stride, no bonus', p3.strideDist === 0 && !p3.conditionHolds('strided')
    && Math.abs(p3.sheet.get('damage') - baseDmg) < 1e-9);
  let steps = 0;
  const startX = p3.pos.x;
  while (p3.strideDist < reach && steps < 400) { w3.moveActor(p3, steps % 40 < 20 ? 1 : -1, 0, 0.05); steps++; }
  p3.updateTimers(0.016);
  check('E3 walking the reach arms the condition (the odometer is post-clamp distance)',
    p3.strideDist >= reach && p3.conditionHolds('strided'), `${steps} steps, ${p3.strideDist.toFixed(0)} paces, moved ${Math.abs(p3.pos.x - startX).toFixed(0)}`);
  check('E4 the strided lines pay the roll', p3.sheet.get('damage') > baseDmg + 0.3
    && p3.sheet.get('addedPhysical') >= 8);
  const z = dummy(w3, p3.pos.x + 30, p3.pos.y);
  const zLife = z.life;
  const cleave = p3.skills.find(s => s?.def.id === 'cleave')!;
  const walked = p3.strideDist;
  p3.mana = p3.maxMana();
  w3.useSkill(p3, cleave, vec(z.pos.x, z.pos.y));
  // The bar completes, the blow lands and MARKS the walk spent; the NEXT
  // tick resets the odometer (every contact of the landing frame saw it).
  const landed = until(w3, () => z.life < zLife, 0.05, 30);
  const marked = p3.strideSpent;
  step(w3, 0.016);
  check('E5 a landed blow spends the walk (marked at the blow, reset on the tick after)',
    landed && marked && p3.strideDist < walked * 0.05 && !p3.strideSpent,
    `landed=${landed}, marked=${marked}, ${walked.toFixed(0)} → ${p3.strideDist.toFixed(0)} paces`);
  p3.updateTimers(0.016);
  check('E6 …and the condition falls with it', !p3.conditionHolds('strided'));
  check('E7 unarmed walkers never accrue',
    (() => { delete s3.meta.equipped['boots']; w3.recalcSeat(s3); p3.strideDist = 0;
      for (let i = 0; i < 20; i++) w3.moveActor(p3, 1, 0, 0.05); return p3.strideDist === 0; })());
}

// ------------------------------------------------- F. THE ROOTED RAMP
{
  const still = DERIVED_GAUGES.still;
  check('F1 the still gauge is registered with a spoken label', !!still && /standing still/.test(still.label));
  const w4: World = makeSimWorld('warrior', 0x1ea2);
  const s4 = w4.localSeat;
  const p4 = s4.actor;
  const gw = { actors: w4.actors, time: w4.time };
  p4.idleFor = 3.7;
  check('F2 whole seconds, floored', still.sample(p4, gw) === 3);
  p4.idleFor = 99;
  check('F3 capped at GAUGE_CFG.stillCap', still.sample(p4, gw) === GAUGE_CFG.stillCap);
  const base = p4.sheet.get('damage');
  s4.meta.equipped['chest'] = rollItem({ ilvl: 20, uniqueId: 'the_unmoved' })!;
  w4.recalcSeat(s4);
  p4.idleFor = 0;
  step(w4, 0.05, 4); // the sweep publishes; barely stood — no ramp yet
  const early = p4.sheet.get('damage');
  p4.idleFor = 10;
  step(w4, 0.3, 3);
  const late = p4.sheet.get('damage');
  check('F4 the ramp climbs with stillness (sheet damage rises once the gauge stands)',
    late > early && late > base, `base ${base.toFixed(3)} early ${early.toFixed(3)} late ${late.toFixed(3)}`);
}

// ------------------------------------------------------- G. THE BLOOM
{
  const w5: World = makeSimWorld('warrior', 0x1ea3);
  const s5 = w5.localSeat;
  const p5 = s5.actor;
  p5.sheet.setSource('probe', [mod('minionBloom', 'flat', 1.0), mod('minionBloomPower', 'flat', 0.5)]);
  const summon = makeSkillInstance(SKILLS.summon_skeleton, 1);
  p5.skills[5] = summon;
  p5.mana = p5.maxMana();
  const ok = w5.useSkill(p5, summon, vec(p5.pos.x + 40, p5.pos.y));
  // The summon's bar completes, then the body stands (poll at fine grain so
  // the fuse reads within a frame of its stamp).
  const emerged = until(w5, () => w5.actors.some(a => a.owner === p5 && !a.dead), 0.02, 60);
  const minion = w5.actors.find(a => a.owner === p5 && !a.dead);
  check('G1 a minion emerges wearing the bloom', ok && emerged && !!minion
    && minion!.bloomIn > 0.9 && minion!.bloomIn <= 1.0
    && minion!.statuses.some(s => s.id === 'blooming'), minion ? `bloomIn ${minion.bloomIn.toFixed(3)}` : 'no minion');
  if (minion) {
    const z = dummy(w5, minion.pos.x + 20, minion.pos.y); // survives the burst so the wound reads
    const zLife = z.life;
    step(w5, 0.05, 26);
    check('G2 on time, it bursts — the foe beside it is wounded — and it dies',
      minion.dead && z.life < zLife, `zombie ${zLife.toFixed(0)} → ${z.life.toFixed(0)}, minion dead=${minion.dead}`);
  } else {
    check('G2 on time, it bursts — the foe beside it is wounded — and it dies', false, 'no minion to bloom');
  }
  p5.sheet.removeSource('probe');
}

// -------------------------------------------------- H. THE EXTRA LANE
{
  const w6: World = makeSimWorld('warrior', 0x1ea4);
  const p6 = w6.localSeat.actor;
  const tags = new Set<'melee'>(['melee']);
  const plain: Partial<Record<'physical' | 'fire', number>> = { physical: 100 };
  applyConversion(p6, plain, tags as never);
  check('H1 unarmed: conversion adds nothing', plain.physical === 100 && plain.fire === undefined);
  p6.sheet.setSource('probe', [mod(extraAsStat('fire'), 'flat', 0.5)]);
  const extra: Partial<Record<'physical' | 'fire', number>> = { physical: 100 };
  applyConversion(p6, extra, tags as never);
  check('H2 the extra lane ADDS fire and keeps the physical whole',
    extra.physical === 100 && Math.abs((extra.fire ?? 0) - 50) < 1e-9, JSON.stringify(extra));
  p6.sheet.removeSource('probe');
}

console.log(failed === 0 ? '\nALL GREEN' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
