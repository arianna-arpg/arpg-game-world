// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE OVERDRIVE DEBT ECONOMY (backlog #348: OverdriveSpec in
// engine/skills.ts; Actor.overdrive + canAfford/payCost/updateTimers in
// engine/actor.ts; the activateAura lane install, the deactivate release and
// the debt locks in engine/world.ts). Pins:
//   - COSTS REFUSE WITHOUT A LANE: no toggle → an unaffordable cast refuses,
//     pays nothing, books nothing (the baseline law the fabric inverts).
//   - THE OVERDRAFT: with the toggle on, the SAME press fires — mana pays
//     first, the shortfall books as debt MIRRORED into reservedMana (the
//     inverted energy shield: the pool's top is borrowed, availableMaxMana
//     shrinks) and every booking re-arms the idle wait to its full delay.
//     A fully pool-paid cast books nothing and never touches the wait.
//   - THE CAP REFUSES: debt may not pass overdriveCap × the RAW max pool —
//     at the ceiling the press refuses and books nothing, while pool-paid
//     casts still fire (only overdrafts are refused).
//   - THE DEBT LOCK: while debt stands the toggle refuses its off-press AND
//     refuses unlearning; both release the moment the pool is whole.
//   - ONE LANE PER POOL: a second same-lane toggle refuses to install.
//   - REPAYMENT: debt is FROZEN until idleDelay passes without a booking,
//     then melts at debt × overdriveRecovery + overdriveRecoveryFlat per
//     second — mirrored here frame-by-frame against the engine — with the
//     reservation falling in step and landing on an EXACT zero.
//   - THE FLOW (Controlled Burn): overdriveFlow > 0 trickles repayment
//     DURING the wait at the flow fraction, and the gem's −25% MORE
//     recovery tax really bites the rate.
//   - THE LIFE LANE (Blood Mortgage): a payable blood price is paid in
//     blood (no debt); an unpayable one — including life EXACTLY at the
//     price — books the WHOLE cost, never a partial, never a kill; heals
//     cap at the mortgaged ceiling; repayment metabolizes through life
//     regen × overdriveLifeFactor × attack speed (mirrored the same way).
//   - DETERMINISM: the same seed and script replays a byte-identical debt
//     trajectory.
// Run: npx tsx balance/probe_overdrive.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { makeSkillInstance, skillContextTags, instanceMods } from '../src/engine/skills';
import type { SkillDef } from '../src/engine/skills';
import { ATTRIBUTE_IDS, mod } from '../src/engine/stats';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { vec } from '../src/core/math';
import type { World } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
const near = (a: number, b: number, eps = 1e-6): boolean => Math.abs(a - b) <= eps;
const DT = 1 / 60;

bootSimEngine();

/** A fresh hermetic rig: warrior at flat 40 attributes (every gate met). */
const mkRig = (seed: number) => {
  seedGlobalRandom(seed);
  const w: World = makeSimWorld('warrior', seed);
  const seat = w.localSeat;
  const hero = seat.actor;
  for (const a of ATTRIBUTE_IDS) seat.meta.baseAttrs[a] = 40;
  w.recalcSeat(seat);
  return { w, seat, hero };
};

const { w, seat, hero } = mkRig(0x0dd1);
const aim = () => vec(hero.pos.x + 60, hero.pos.y);
const settle = (): void => {
  hero.casting = null;
  hero.useLock = 0;
  hero.cooldowns.clear();
  w.time += 10;
};
const step = (frames: number): void => { for (let i = 0; i < frames; i++) w.update(DT); };
const learn = (skillId: string): boolean => {
  const item = w.grantSkillGemItem(seat, makeSkillInstance(SKILLS[skillId], 1, 1));
  return !!item && w.learnSkill(item.uid, seat);
};
/** Lane ledgers, NaN-sentineled while closed so reads fail soft. */
const odm = () => hero.overdrive.mana ?? { debt: NaN, idle: NaN };
const odl = () => hero.overdrive.life ?? { debt: NaN, idle: NaN };

// The SPENDER: a plain mana-priced self-cast, its cost read from the actor's
// own skillCost (never hardcoded). Unlearned instances cast fine (the
// possession stance); the toggles below ARE learned — the unlearn law needs
// them on the build.
const conv = makeSkillInstance(SKILLS['convocation'], 1, 1);

// ------------------------ A. COSTS REFUSE WITHOUT A LANE (the baseline law)
hero.mana = 0;
const costA = hero.skillCost(conv).mana;
check('A: the spender costs real mana', costA > 0, `cost ${costA}`);
check('A: rig sanity — the pool holds several casts', hero.maxMana() >= costA * 3,
  `maxMana ${hero.maxMana()}`);
check('A: without a lane the short press refuses',
  w.useSkill(hero, conv, aim()) === false && hero.casting === null);
check('A: ...and books nothing anywhere', hero.mana === 0 && hero.reservedMana === 0
  && hero.overdrive.mana === undefined && hero.overdrive.life === undefined);

// --------------------------------------- B. THE TOGGLE OPENS THE MANA LANE
check('B: overclock learns at met gates', learn('overclock'));
const oc = seat.meta.knownSkills.get('overclock')!;
settle();
hero.mana = hero.maxMana();
check('B: the toggle press fires', w.useSkill(hero, oc, aim()) === true);
step(3);
check('B: the aura stands and the lane opens at zero debt',
  hero.activeAuras.has('overclock') && odm().debt === 0 && hero.reservedMana === 0);

// ------------------------------------------------- C. THE OVERDRAFT BOOKS
settle();
hero.mana = 0;
const cost1 = hero.skillCost(conv).mana;
check('C: with the lane open the SAME short press fires',
  w.useSkill(hero, conv, aim()) === true);
check('C: the whole shortfall books as debt, mirrored into reservation',
  odm().debt === cost1 && hero.reservedMana === cost1);
check('C: the debt borrows the TOP of the pool',
  hero.availableMaxMana() === hero.maxMana() - cost1
  && hero.mana <= hero.availableMaxMana());
check('C: the booking arms the idle wait at its full delay', odm().idle === 2.5);
settle();
hero.mana = 5;
const dPart = odm().debt;
const cost2 = hero.skillCost(conv).mana;
check('C: a partial pool pays mana-first and books only the shortfall',
  w.useSkill(hero, conv, aim()) === true
  && hero.mana === 0 && odm().debt === dPart + (cost2 - 5));
settle();
const idleHeld = odm().idle;
const dPaid = odm().debt;
hero.mana = hero.availableMaxMana();
check('C: a fully paid cast books nothing and leaves the wait untouched',
  w.useSkill(hero, conv, aim()) === true
  && odm().debt === dPaid && odm().idle === idleHeld);

// ---------------------------------------- D. ONE LANE PER POOL (the twin)
const twinDef: SkillDef = { ...SKILLS['overclock'], id: 'probe_ovd_twin', name: 'Probe Twin' };
const twin = makeSkillInstance(twinDef, 1, 1);
settle();
hero.mana = hero.availableMaxMana();
w.useSkill(hero, twin, aim());
step(3);
check('D: a second same-lane toggle refuses to install',
  !hero.activeAuras.has('probe_ovd_twin')
  && hero.overdrive.mana?.inst.def.id === 'overclock');

// ---------------------------------------------------- E. THE CAP REFUSES
const cap = 0.5 * hero.maxMana(); // the spec base through an untouched stat
let refused = false;
let booked = 0;
for (let i = 0; i < 80 && !refused; i++) {
  settle();
  hero.mana = 0;
  if (w.useSkill(hero, conv, aim())) booked++;
  else refused = true;
}
const dCap = odm().debt;
const costE = hero.skillCost(conv).mana;
check('E: the ceiling refuses further overdrafts', refused && booked > 0,
  `${booked} booked, debt ${dCap} of cap ${cap}`);
check('E: refusal lands exactly where headroom runs short',
  dCap <= cap && cap - dCap < costE);
const idleCap = odm().idle;
settle();
hero.mana = 0;
check('E: the refused press books nothing and never touches the wait',
  w.useSkill(hero, conv, aim()) === false && odm().debt === dCap
  && hero.reservedMana === dCap && hero.mana === 0 && odm().idle === idleCap);
settle();
hero.mana = hero.availableMaxMana();
check('E: a pool-paid cast still fires at full debt',
  w.useSkill(hero, conv, aim()) === true && odm().debt === dCap);

// ------------------------------------------------------ F. THE DEBT LOCK
settle();
check('F: the off-press refuses while debt stands',
  w.useSkill(hero, oc, aim()) === false && hero.activeAuras.has('overclock'));
check('F: unlearning refuses while debt stands',
  w.unlearnSkill('overclock', seat) === false && seat.meta.knownSkills.has('overclock'));

// ------------------- G. REPAYMENT: frozen through the breather, then EXACT
settle();
const ocTags = skillContextTags(oc.def);
const ocExtra = instanceMods(oc);
const recPct = hero.sheet.get('overdriveRecovery', ocTags, ocExtra, 0.18);
const recFlat = hero.sheet.get('overdriveRecoveryFlat', ocTags, ocExtra, 3);
const flow0 = hero.sheet.get('overdriveFlow', ocTags, ocExtra);
check('G: untouched dials read their spec bases (and no flow)',
  recPct === 0.18 && recFlat === 3 && flow0 === 0);
check('G: the last booking left the wait armed', odm().idle === 2.5);
const dG = odm().debt;
step(60); // 1.0s of the 2.5s wait
check('G: before the breather the debt is FROZEN', odm().debt === dG);
let simDebt = odm().debt;
let simIdle = odm().idle;
for (let i = 0; i < 180; i++) { // 3.0s more — crosses the wait mid-span
  w.update(DT);
  simIdle -= DT;
  if (simDebt > 0 && simIdle <= 0) {
    simDebt -= Math.min(simDebt, (simDebt * recPct + recFlat) * DT);
  }
}
check('G: past the breather repayment mirrors the law frame-exact',
  near(odm().debt, simDebt) && odm().debt < dG,
  `engine ${odm().debt}, mirror ${simDebt}`);
check('G: the reservation falls in step', near(hero.reservedMana, odm().debt));
let guard = 0;
while (odm().debt > 0 && guard++ < 60 * 30) w.update(DT);
check('G: the pool comes whole — exactly zero, top released',
  odm().debt === 0 && hero.reservedMana === 0
  && hero.availableMaxMana() === hero.maxMana());

// ------------------------------------------------- H. THE REFRESH LAW
settle();
hero.mana = 0;
check('H: a fresh booking re-arms the full wait',
  w.useSkill(hero, conv, aim()) === true && odm().debt > 0 && odm().idle === 2.5);
const dH1 = odm().debt;
step(120); // 2.0s of the 2.5s wait
check('H: still frozen inside the wait', odm().debt === dH1 && near(odm().idle, 0.5));
settle();
hero.mana = 0;
w.useSkill(hero, conv, aim()); // half a second before repayment would begin
const dH2 = odm().debt;
check('H: the new booking REFRESHES the wait', dH2 > dH1 && odm().idle === 2.5);
step(60); // 1.0s — repayment would have flowed without the refresh
check('H: the refreshed wait holds the freeze', odm().debt === dH2);
guard = 0;
while (odm().debt > 0 && guard++ < 60 * 30) w.update(DT);

// ----------------------------------- I. CLOSE RELEASES, UNLEARN LIFTS
settle();
check('I: with the pool whole the off-press releases', w.useSkill(hero, oc, aim()) === true);
step(3);
check('I: the lane closes clean', !hero.activeAuras.has('overclock')
  && hero.overdrive.mana === undefined && hero.reservedMana === 0);
settle();
check('I: ...and the unlearn refusal lifts',
  w.unlearnSkill('overclock', seat) === true && !seat.meta.knownSkills.has('overclock'));

// ------------------------ J. THE LIFE LANE (Blood Mortgage) — books WHOLE
check('J: blood mortgage learns', learn('blood_mortgage'));
const bm = seat.meta.knownSkills.get('blood_mortgage')!;
settle();
hero.mana = hero.maxMana();
check('J: the life toggle stands', w.useSkill(hero, bm, aim()) === true);
step(3);
check('J: the life lane opens at zero debt',
  hero.activeAuras.has('blood_mortgage') && odl().debt === 0 && hero.reservedLife === 0);

const sb = makeSkillInstance(SKILLS['sanguine_burst'], 1, 1);
settle();
hero.life = hero.lifeCeiling();
const costL = hero.skillCost(sb).life;
check('J: the burst prices in blood alone',
  costL > 0 && hero.skillCost(sb).mana === 0, `life cost ${costL}`);
const capL = 0.4 * hero.maxLife();
check('J: rig sanity — the pool and ceiling hold two bookings',
  hero.maxLife() >= costL * 3 + 5 && capL >= costL * 2,
  `maxLife ${hero.maxLife()}, cap ${capL}`);
const lifeFull = hero.life;
check('J: a payable price is paid in BLOOD — no debt',
  w.useSkill(hero, sb, aim()) === true
  && near(hero.life, lifeFull - costL, 1e-9) && odl().debt === 0);
settle();
hero.life = Math.max(1, costL - 5);
const lifeLow = hero.life;
check('J: an unpayable price books WHOLE — and never kills',
  w.useSkill(hero, sb, aim()) === true && odl().debt === costL
  && hero.reservedLife === costL && hero.life === lifeLow && hero.life > 0);
check('J: the ceiling is mortgaged', hero.lifeCeiling() === hero.maxLife() - costL);
check('J: the life wait arms at its own delay', odl().idle === 3);
settle();
hero.life = costL; // life EXACTLY at the price
check('J: at life exactly the price the cast still books (no death door)',
  w.useSkill(hero, sb, aim()) === true
  && odl().debt === costL * 2 && hero.life === costL);
const landed = hero.healBy(1e9);
check('J: heals cap at the mortgaged ceiling',
  hero.life === hero.lifeCeiling() && near(landed, hero.lifeCeiling() - costL, 1e-9));
settle();
check('J: the life toggle locks while the mortgage stands',
  w.useSkill(hero, bm, aim()) === false && hero.activeAuras.has('blood_mortgage'));

const bmTags = skillContextTags(bm.def);
const bmExtra = instanceMods(bm);
const lifeFac = hero.sheet.get('overdriveLifeFactor', bmTags, bmExtra, 0.75);
const atkSpd = hero.sheet.get('attackSpeed');
const recTax = hero.sheet.get('overdriveRecovery', bmTags, bmExtra, 1);
const regen = hero.sheet.get('lifeRegen') + hero.sheet.get('lifeRegenPct') * hero.maxLife();
check('J: the metabolism dials read sane',
  lifeFac === 0.75 && recTax === 1 && regen > 0 && atkSpd > 0,
  `regen ${regen}, atkSpd ${atkSpd}`);
const dLife = odl().debt;
step(60); // 1.0s of the 3.0s wait
check('J: blood debt frozen before the breather', odl().debt === dLife);
let simL = odl().debt;
let simLi = odl().idle;
for (let i = 0; i < 240; i++) { // 4.0s — crosses the wait mid-span
  w.update(DT);
  simLi -= DT;
  if (simL > 0 && simLi <= 0) {
    simL -= Math.min(simL, regen * lifeFac * atkSpd * recTax * DT);
  }
}
check('J: blood repays through the metabolism — mirrored frame-exact',
  near(odl().debt, simL) && odl().debt < dLife,
  `engine ${odl().debt}, mirror ${simL}`);
check('J: the life reservation falls in step', near(hero.reservedLife, odl().debt));
// Melt the rest at pace through an HONEST lever: a probe-named sheet source
// the engine folds itself (the law was pinned above; this only shortens it).
hero.sheet.setSource('probe:regen', [mod('lifeRegen', 'flat', 40)]);
guard = 0;
while (odl().debt > 0 && guard++ < 60 * 60) w.update(DT);
hero.sheet.removeSource('probe:regen');
check('J: the mortgage comes whole — exactly zero, ceiling restored',
  odl().debt === 0 && hero.reservedLife === 0
  && hero.lifeCeiling() === Math.max(1, hero.maxLife()));
settle();
check('J: the freed life toggle releases', w.useSkill(hero, bm, aim()) === true);
step(3);
check('J: the life lane closes', hero.overdrive.life === undefined
  && !hero.activeAuras.has('blood_mortgage'));

// ---------------- K. THE FLOW (Controlled Burn trickles during the wait)
{
  const r2 = mkRig(0xf10a);
  const w2 = r2.w;
  const seat2 = r2.seat;
  const hero2 = r2.hero;
  const aim2 = () => vec(hero2.pos.x + 60, hero2.pos.y);
  const oc2Item = w2.grantSkillGemItem(seat2, makeSkillInstance(SKILLS['overclock'], 1, 1));
  check('K: the flow rig learns overclock',
    !!oc2Item && w2.learnSkill(oc2Item.uid, seat2));
  const cb2Item = w2.grantSupportGemItem(seat2, { def: SUPPORTS['controlled_burn'], level: 1 });
  check('K: the trickle gem sockets into the toggle',
    !!cb2Item && w2.socketSupport(cb2Item.uid, 'overclock', seat2) === true);
  const oc2 = seat2.meta.knownSkills.get('overclock')!;
  hero2.mana = hero2.maxMana();
  check('K: the gemmed toggle stands', w2.useSkill(hero2, oc2, aim2()) === true);
  for (let i = 0; i < 3; i++) w2.update(DT);
  const tags2 = skillContextTags(oc2.def);
  const extra2 = instanceMods(oc2);
  const flow2 = hero2.sheet.get('overdriveFlow', tags2, extra2);
  const rec2 = hero2.sheet.get('overdriveRecovery', tags2, extra2, 0.18);
  const flat2 = hero2.sheet.get('overdriveRecoveryFlat', tags2, extra2, 3);
  check('K: the gem grants flow and taxes the rate',
    flow2 > 0 && rec2 < 0.18 && rec2 >= 0.05 && flat2 === 3,
    `flow ${flow2}, rate ${rec2}`);
  const cv2 = makeSkillInstance(SKILLS['convocation'], 1, 1);
  hero2.casting = null;
  hero2.useLock = 0;
  hero2.cooldowns.clear();
  hero2.mana = 0;
  w2.time += 10;
  check('K: the rig books debt with the wait armed',
    w2.useSkill(hero2, cv2, aim2()) === true
    && (hero2.overdrive.mana?.debt ?? 0) > 0 && hero2.overdrive.mana?.idle === 2.5);
  const dK = hero2.overdrive.mana!.debt;
  let simK = dK;
  let simKi = 2.5;
  for (let i = 0; i < 90; i++) { // 1.5s — the wait never elapses
    w2.update(DT);
    simKi -= DT;
    if (simK > 0) {
      const flowing = simKi <= 0 ? 1 : flow2;
      if (flowing > 0) simK -= Math.min(simK, (simK * rec2 + flat2) * flowing * DT);
    }
  }
  const dKAfter = hero2.overdrive.mana!.debt;
  check('K: repayment TRICKLES during the wait at the flow fraction — mirrored',
    dKAfter < dK && near(dKAfter, simK), `engine ${dKAfter}, mirror ${simK}`);
  check('K: the trickled reservation falls in step', near(hero2.reservedMana, dKAfter));
}

// -------------------- L. DETERMINISM (seeded — byte-identical trajectory)
const traj = (seed: number): string => {
  const r = mkRig(seed);
  const ocItem = r.w.grantSkillGemItem(r.seat, makeSkillInstance(SKILLS['overclock'], 1, 1))!;
  r.w.learnSkill(ocItem.uid, r.seat);
  const t = r.seat.meta.knownSkills.get('overclock')!;
  const at = () => vec(r.hero.pos.x + 60, r.hero.pos.y);
  r.hero.mana = r.hero.maxMana();
  r.w.useSkill(r.hero, t, at());
  for (let i = 0; i < 3; i++) r.w.update(DT);
  const cv = makeSkillInstance(SKILLS['convocation'], 1, 1);
  const samples: number[] = [];
  for (let k = 0; k < 3; k++) {
    r.hero.casting = null;
    r.hero.useLock = 0;
    r.hero.cooldowns.clear();
    r.hero.mana = 0;
    r.w.time += 10;
    r.w.useSkill(r.hero, cv, at());
    for (let i = 0; i < 30; i++) {
      r.w.update(DT);
      if (i % 10 === 9) samples.push(r.hero.overdrive.mana?.debt ?? -1, r.hero.reservedMana);
    }
  }
  for (let i = 0; i < 300; i++) { // through the wait and deep into repayment
    r.w.update(DT);
    if (i % 20 === 19) samples.push(r.hero.overdrive.mana?.debt ?? -1, r.hero.reservedMana);
  }
  return JSON.stringify(samples);
};
const tA = traj(0xbee5);
const tB = traj(0xbee5);
check('L: the seeded debt trajectory replays byte-identical', tA === tB);

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed ? 2 : 0);
