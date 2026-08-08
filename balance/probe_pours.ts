// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE FLASK REDESIGN (2026-08-08, design-locked): the
// TWO-STREAM SIP on the real engine. Pins the whole blessing unit:
//   A  the two streams pour as authored across two classes (surge 15% of
//      max over 0.4s, settle flat 18 +4/lvl over 4.5s), and the surge is a
//      FIXED FLOOR — gem level grows the settle alone;
//   B  stacking conservation — three rapid sips deliver exactly 3× one sip
//      (stacking concentrates, never mints or loses);
//   C  THE ONCE-PER-DRINK LAW — the drinker's restorePctMax folds into the
//      settle lane only: +3% is +3% per SIP, never +6%;
//   D  the lane dials — pourPower_settle halves the settle alone,
//      pourPct_surge deepens the surge alone; the trade gem (adrenal_decant)
//      carries both, and its pour:surge/pour:settle mechanisms refuse every
//      surge-less host honestly;
//   E  THIRST — refused at true full (no prime), admitted at any missing;
//   F  THE PRIMED POUR — a full-pool press with pourPrime BANKS (charges
//      spent, zero heal, no quaffing), the first wound releases it (hit
//      path AND DoT tick), released streams run past re-full, the cap
//      holds, and an unslotted entry dissolves silently;
//   G  THE TAGGED CLOCK — flask-scoped cooldownRecovery speeds the flask's
//      cooldown and leaves an untagged skill's clock unchanged;
//   H  STREAM OVERMEND — pour past full hardens into absorb with the
//      overheal stat, evaporates without it;
//   I  THE LUCKY POUR — one roll per sip: a two-stream drink crits whole
//      or not at all, never half-and-half.
// Run: npx tsx balance/probe_pours.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { mod } from '../src/engine/stats';
import { makeSkillInstance, mechanismHolds, supportFitsInst } from '../src/engine/skills';
import type { SkillInstance } from '../src/engine/skills';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import type { Actor } from '../src/engine/actor';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
const near = (a: number, b: number, eps = 1e-3): boolean => Math.abs(a - b) < eps;

bootSimEngine();
seedGlobalRandom(0xf1a5c);

type SimW = ReturnType<typeof makeSimWorld>;

/** Seat a life flask on the hero's bar (release looks the bar up by id). */
const flaskOn = (p: Actor, level = 1, skillId = 'life_flask'): SkillInstance => {
  const inst = makeSkillInstance(SKILLS[skillId], level, 3);
  let idx = p.skills.findIndex(s => s === null);
  if (idx === -1) idx = p.skills.length - 1;
  p.skills[idx] = inst;
  p.charges.set('flask_life', 3);
  return inst;
};
const noCrit = (p: Actor): void =>
  p.sheet.setSource('probeNoCrit', [mod('critChance', 'more', -1)]);
const clearPress = (p: Actor): void => {
  p.casting = null; p.useLock = 0; p.reflexLock = 0; p.cooldowns.clear();
};
const sip = (w: SimW, p: Actor, inst: SkillInstance): boolean => {
  clearPress(p);
  return w.useSkill(p, inst, p.pos);
};
/** The two streams a fresh sip just pushed, surge first (def order). */
const lastTwo = (p: Actor): [surge: { perSec: number; remaining: number }, settle: { perSec: number; remaining: number }] | null => {
  const n = p.restoreStreams.length;
  if (n < 2) return null;
  return [p.restoreStreams[n - 2], p.restoreStreams[n - 1]];
};
const streamsTotal = (p: Actor): number =>
  p.restoreStreams.reduce((s, st) => s + st.remaining, 0);

// === RIG A — the two-stream sip as authored, across two classes ============
for (const cls of ['warrior', 'rogue']) {
  const w = makeSimWorld(cls, 0xa11ce);
  const p = w.player;
  noCrit(p);
  const inst = flaskOn(p);
  const max = p.maxLife();
  p.life = max * 0.5;
  const ok = sip(w, p, inst);
  const pair = lastTwo(p);
  check(`A1 ${cls}: a dented-pool press pours TWO streams`, ok && p.restoreStreams.length === 2,
    `pressed ${ok}, streams ${p.restoreStreams.length}`);
  if (pair) {
    const [surge, settle] = pair;
    check(`A2 ${cls}: the surge pours 15% of max (pool ${Math.round(max)})`,
      near(surge.remaining, 0.15 * max, 0.01), `surge ${surge.remaining.toFixed(2)} want ${(0.15 * max).toFixed(2)}`);
    check(`A3 ${cls}: the settle pours flat 18 at level 1`,
      near(settle.remaining, 18, 0.01), `settle ${settle.remaining.toFixed(2)}`);
    // Durations ride effectDuration together — the RATIO is the authored one.
    const ratio = (settle.remaining / settle.perSec) / (surge.remaining / surge.perSec);
    check(`A4 ${cls}: settle runs 4.5/0.4 as long as the surge`,
      near(ratio, 4.5 / 0.4, 0.05), `ratio ${ratio.toFixed(2)}`);
  }
}
{
  // THE FIXED FLOOR: gem level grows the settle ALONE (surge % already
  // scales once with the pool — growing it per level would scale it twice).
  const w = makeSimWorld('warrior', 0xf100);
  const p = w.player;
  noCrit(p);
  const inst = flaskOn(p, 5);
  const max = p.maxLife();
  p.life = max * 0.5;
  sip(w, p, inst);
  const pair = lastTwo(p);
  check('A5 level 5: the surge is a FIXED FLOOR (still 15% of max)',
    !!pair && near(pair[0].remaining, 0.15 * max, 0.01),
    pair ? `surge ${pair[0].remaining.toFixed(2)}` : 'no streams');
  check('A6 level 5: the settle alone carries the growth (18 + 4×4)',
    !!pair && near(pair[1].remaining, 34, 0.01),
    pair ? `settle ${pair[1].remaining.toFixed(2)}` : 'no streams');
}

// === RIG B — stacking conservation ==========================================
{
  const w = makeSimWorld('warrior', 0xb0b);
  const p = w.player;
  noCrit(p);
  const inst = flaskOn(p);
  p.life = p.maxLife() * 0.3;
  sip(w, p, inst);
  const one = streamsTotal(p);
  sip(w, p, inst);
  sip(w, p, inst);
  check('B1 three rapid sips hold exactly 3× one sip (stacking concentrates, never mints/loses)',
    p.restoreStreams.length === 6 && near(streamsTotal(p), 3 * one, 1e-6),
    `streams ${p.restoreStreams.length}, total ${streamsTotal(p).toFixed(4)} want ${(3 * one).toFixed(4)}`);
}

// === RIG C — THE ONCE-PER-DRINK LAW =========================================
{
  const w = makeSimWorld('warrior', 0xc0c);
  const p = w.player;
  noCrit(p);
  const inst = flaskOn(p);
  const max = p.maxLife();
  p.life = max * 0.5;
  sip(w, p, inst);
  const base = streamsTotal(p);
  const basePair = lastTwo(p)!;
  const baseSurge = basePair[0].remaining;
  p.restoreStreams = [];
  p.charges.set('flask_life', 3);
  // The Bottomless Draught shape: +3% restored of maximum, from anywhere.
  p.sheet.setSource('probePct', [mod('restorePctMax', 'flat', 0.03)]);
  sip(w, p, inst);
  const pair = lastTwo(p)!;
  check('C1 +3% restorePctMax is +3% per SIP, not +6% (folds once, into the settle)',
    near(streamsTotal(p) - base, 0.03 * max, 0.01),
    `delta ${(streamsTotal(p) - base).toFixed(2)} want ${(0.03 * max).toFixed(2)}`);
  check('C2 the surge never wears the drinker\'s percent lever',
    near(pair[0].remaining, baseSurge, 1e-6),
    `surge ${pair[0].remaining.toFixed(2)} vs ${baseSurge.toFixed(2)}`);
  p.sheet.setSource('probePct', []);
}

// === RIG D — the lane dials + the trade gem + its honest gate ===============
{
  const w = makeSimWorld('warrior', 0xd0d);
  const p = w.player;
  noCrit(p);
  const inst = flaskOn(p);
  const max = p.maxLife();

  p.sheet.setSource('probeLane', [mod('pourPower_settle', 'more', -0.5)]);
  p.life = max * 0.5;
  sip(w, p, inst);
  let pair = lastTwo(p)!;
  check('D1 pourPower_settle −50% halves the settle alone',
    near(pair[1].remaining, 9, 0.01) && near(pair[0].remaining, 0.15 * max, 0.01),
    `surge ${pair[0].remaining.toFixed(2)}, settle ${pair[1].remaining.toFixed(2)}`);

  p.sheet.setSource('probeLane', [mod('pourPct_surge', 'flat', 0.10)]);
  p.restoreStreams = [];
  p.charges.set('flask_life', 3);
  sip(w, p, inst);
  pair = lastTwo(p)!;
  check('D2 pourPct_surge +10pp deepens the surge alone (15% → 25%)',
    near(pair[0].remaining, 0.25 * max, 0.01) && near(pair[1].remaining, 18, 0.01),
    `surge ${pair[0].remaining.toFixed(2)} want ${(0.25 * max).toFixed(2)}, settle ${pair[1].remaining.toFixed(2)}`);
  p.sheet.setSource('probeLane', []);

  // THE TRADE GEM carries both dials through the socket (instance mods).
  const gInst = flaskOn(p);
  gInst.sockets[0] = { def: SUPPORTS.adrenal_decant, level: 1 };
  p.restoreStreams = [];
  p.charges.set('flask_life', 3);
  sip(w, p, gInst);
  pair = lastTwo(p)!;
  check('D3 adrenal_decant trades on the socket: surge 25% of max, settle halved',
    near(pair[0].remaining, 0.25 * max, 0.01) && near(pair[1].remaining, 9, 0.01),
    `surge ${pair[0].remaining.toFixed(2)}, settle ${pair[1].remaining.toFixed(2)}`);

  // THE HONEST GATE: both pour lanes demanded — every surge-less host refuses.
  check('D4 the gem FITS the two-stream life flask',
    supportFitsInst(SUPPORTS.adrenal_decant, makeSkillInstance(SKILLS.life_flask, 1, 3)));
  check('D5 the gem REFUSES the settle-only mana flask (no surge lane)',
    !supportFitsInst(SUPPORTS.adrenal_decant, makeSkillInstance(SKILLS.mana_flask, 1, 3)));
  check('D6 the gem REFUSES the catalyst gulp (settle lanes only)',
    !supportFitsInst(SUPPORTS.adrenal_decant, makeSkillInstance(SKILLS.catalyst_flask, 1, 3)));
  check('D7 the gem REFUSES a pour-less stance flask',
    !supportFitsInst(SUPPORTS.adrenal_decant, makeSkillInstance(SKILLS.quicksilver_flask, 1, 3)));
  const lifeInst = makeSkillInstance(SKILLS.life_flask, 1, 3);
  const manaInst = makeSkillInstance(SKILLS.mana_flask, 1, 3);
  check('D8 the pour mechanisms read the lanes (bare pour / pour:surge / pour:settle)',
    mechanismHolds('pour', lifeInst) && mechanismHolds('pour:surge', lifeInst)
    && mechanismHolds('pour:settle', lifeInst) && mechanismHolds('pour', manaInst)
    && !mechanismHolds('pour:surge', manaInst) && mechanismHolds('pour:settle', manaInst));
}

// === RIG E — THIRST: refused at true full, admitted at any missing ==========
{
  const w = makeSimWorld('warrior', 0xe0e);
  const p = w.player;
  noCrit(p);
  const inst = flaskOn(p);
  p.fillResources();
  const okFull = sip(w, p, inst);
  check('E1 a true-full press is refused (no prime) and eats nothing',
    !okFull && (p.charges.get('flask_life') ?? 0) === 3 && p.restoreStreams.length === 0,
    `pressed ${okFull}, charges ${p.charges.get('flask_life')}`);
  p.life = p.maxLife() - 2;
  const okDent = sip(w, p, inst);
  check('E2 any real dent admits the ordinary pour',
    okDent && p.restoreStreams.length === 2 && (p.charges.get('flask_life') ?? 0) === 2,
    `pressed ${okDent}, streams ${p.restoreStreams.length}`);
}

// === RIG F — THE PRIMED POUR =================================================
{
  // F1/F2: the bank — a full-pool press with prime capacity SUCCEEDS, pays
  // everything, applies nothing; the cap refuses the press past it.
  const w = makeSimWorld('warrior', 0xf0f1);
  const p = w.player;
  noCrit(p);
  const inst = flaskOn(p);
  p.sheet.setSource('probePrime', [mod('pourPrime', 'flat', 1)]);
  p.fillResources();
  const ok = sip(w, p, inst);
  check('F1 a full-pool press with pourPrime BANKS: charges spent, clock stamped, zero heal, no quaffing',
    ok && p.primedPours.length === 1 && (p.charges.get('flask_life') ?? 0) === 2
    && p.restoreStreams.length === 0 && !p.buffs.has('quaffing')
    && p.cooldowns.has('life_flask') && near(p.life, p.maxLife(), 1e-6),
    `pressed ${ok}, bank ${p.primedPours.length}, charges ${p.charges.get('flask_life')}, streams ${p.restoreStreams.length}`);
  const okOver = sip(w, p, inst);
  check('F2 the cap holds: a second full press past the bank is refused, nothing eaten',
    !okOver && p.primedPours.length === 1 && (p.charges.get('flask_life') ?? 0) === 2,
    `pressed ${okOver}, bank ${p.primedPours.length}`);

  // F3: the DoT tick releases — and the released streams run past re-full.
  const max = p.maxLife();
  p.applyStatus('poison', 5, 1, 'probe');
  w.update(0.05);
  check('F3 the first DoT tick RELEASES: bank drained, both streams live, quaffing starts now',
    p.primedPours.length === 0 && p.restoreStreams.length === 2 && p.buffs.has('quaffing'),
    `bank ${p.primedPours.length}, streams ${p.restoreStreams.length}, quaffing ${p.buffs.has('quaffing')}`);
  const released = streamsTotal(p);
  check('F4 the released sip poured fresh (15% of max + flat 18, banked charges honored)',
    near(released, 0.15 * max + 18, 0.05), `total ${released.toFixed(2)} want ${(0.15 * max + 18).toFixed(2)}`);
  for (let t = 0; t < 8; t += 0.1) w.update(0.1);
  check('F5 released streams are ORDINARY streams: they ran past re-full to the last drop',
    p.restoreStreams.length === 0 && near(p.life, p.maxLife(), 0.5),
    `streams ${p.restoreStreams.length}, life ${p.life.toFixed(1)}/${p.maxLife().toFixed(1)}`);
  p.sheet.setSource('probePrime', []);
}
{
  // F6: the HIT path releases too (resolveHit's recent-wound stamp).
  const w = makeSimWorld('warrior', 0xf0f2);
  const p = w.player;
  noCrit(p);
  const inst = flaskOn(p);
  p.sheet.setSource('probePrime', [mod('pourPrime', 'flat', 1)]);
  p.fillResources();
  sip(w, p, inst);
  check('F6a the bank stands before the blow', p.primedPours.length === 1);
  const foe = w.createMonster('target_dummy', 10, 'enemy');
  foe.pos = { x: p.pos.x + 30, y: p.pos.y };
  w.actors.push(foe);
  const swingDef = Object.values(SKILLS).find(s =>
    s.delivery.type === 'melee' && !!s.baseDamage && s.tags.includes('attack'))!;
  const swing = makeSkillInstance(swingDef, 3, 0);
  for (let i = 0; i < 5 && p.primedPours.length > 0; i++) {
    w.executeSkill(foe, swing, p.pos);
  }
  check('F6b a landed hit RELEASES the banked sip',
    p.primedPours.length === 0 && p.restoreStreams.length === 2,
    `bank ${p.primedPours.length}, streams ${p.restoreStreams.length}`);
  p.sheet.setSource('probePrime', []);
}
{
  // F7: a two-deep bank; F8: the unslotted entry DISSOLVES silently.
  const w = makeSimWorld('warrior', 0xf0f3);
  const p = w.player;
  noCrit(p);
  const inst = flaskOn(p);
  p.sheet.setSource('probePrime', [mod('pourPrime', 'flat', 2)]);
  p.fillResources();
  sip(w, p, inst);
  sip(w, p, inst);
  const third = sip(w, p, inst);
  check('F7 pourPrime 2 banks two and refuses the third',
    !third && p.primedPours.length === 2 && (p.charges.get('flask_life') ?? 0) === 1,
    `bank ${p.primedPours.length}, charges ${p.charges.get('flask_life')}`);
  const idx = p.skills.findIndex(s => s?.def.id === 'life_flask');
  p.skills[idx] = null;
  p.applyStatus('poison', 5, 1, 'probe');
  w.update(0.05);
  check('F8 unslotted entries DISSOLVE at release (the unslot-disbands precedent)',
    p.primedPours.length === 0 && p.restoreStreams.length === 0 && !p.buffs.has('quaffing'),
    `bank ${p.primedPours.length}, streams ${p.restoreStreams.length}`);
  p.sheet.setSource('probePrime', []);
}

// === RIG G — THE TAGGED CLOCK (flask-scoped cooldownRecovery) ===============
{
  const w = makeSimWorld('warrior', 0x60d);
  const p = w.player;
  noCrit(p);
  flaskOn(p);
  const other = p.skills.find(s => s !== null && s.def.id !== 'life_flask')!;
  // Baseline: no tagged source — both clocks tick at the one untagged rate.
  p.cooldowns.set('life_flask', 2);
  p.cooldowns.set(other.def.id, 2);
  p.updateTimers(0.5);
  const flaskBase = p.cooldowns.get('life_flask') ?? 0;
  const otherBase = p.cooldowns.get(other.def.id) ?? 0;
  check('G1 untagged baseline: both clocks tick together (today\'s single read)',
    near(flaskBase, otherBase, 1e-6), `flask ${flaskBase.toFixed(3)}, other ${otherBase.toFixed(3)}`);
  // Flask-scoped +100% recovery: the flask clock doubles, the other holds.
  p.sheet.setSource('probeCdr', [mod('cooldownRecovery', 'flat', 1, ['flask'])]);
  p.cooldowns.set('life_flask', 2);
  p.cooldowns.set(other.def.id, 2);
  p.updateTimers(0.5);
  const flaskFast = p.cooldowns.get('life_flask') ?? 0;
  const otherHeld = p.cooldowns.get(other.def.id) ?? 0;
  check('G2 flask-scoped CDR speeds the flask clock alone',
    near(flaskFast, 1.0, 1e-6) && near(otherHeld, 1.5, 1e-6),
    `flask ${flaskFast.toFixed(3)} want 1.0, other ${otherHeld.toFixed(3)} want 1.5`);
  p.sheet.setSource('probeCdr', []);
}

// === RIG H — STREAM OVERMEND (overflow hardens with the overheal stat) ======
{
  const w = makeSimWorld('warrior', 0x0f1);
  const p = w.player;
  noCrit(p);
  p.fillResources();
  // Without the stat: spill evaporates exactly as before.
  p.restoreStreams.push({ resource: 'life', perSec: 100, remaining: 50 });
  p.updateTimers(0.1);
  check('H1 without overheal, full-pool spill evaporates', p.absorb === 0,
    `absorb ${p.absorb.toFixed(2)}`);
  // With it: overflow × overheal accrues into absorb (Overmend's clock).
  p.restoreStreams = [];
  p.sheet.setSource('probeOh', [mod('overheal', 'flat', 0.5)]);
  p.restoreStreams.push({ resource: 'life', perSec: 100, remaining: 50 });
  p.updateTimers(0.1);
  check('H2 with overheal 50%, a 10-point spill hardens 5 into absorb (timer 6s)',
    near(p.absorb, 5, 0.01) && p.absorbTimer >= 5.9,
    `absorb ${p.absorb.toFixed(2)}, timer ${p.absorbTimer.toFixed(1)}`);
  p.updateTimers(0.1);
  check('H3 the trickle ACCRUES (a stream\'s summed ticks are one pour)',
    near(p.absorb, 10, 0.02), `absorb ${p.absorb.toFixed(2)}`);
  check('H4 the accrual honors Overmend\'s ceiling (maxLife/2)',
    p.absorb <= p.maxLife() * 0.5 + 1e-6);
  p.sheet.setSource('probeOh', []);
  w.update(0); // keep the world referenced
}

// === RIG I — THE LUCKY POUR rolls once per sip ==============================
{
  const w = makeSimWorld('warrior', 0x1cc);
  const p = w.player;
  const inst = flaskOn(p);
  const max = p.maxLife();
  p.sheet.setSource('probeCrit', [mod('critChance', 'flat', 0.5)]);
  const M = p.sheet.get('critMulti');
  let plain = 0, crit = 0, mixed = 0;
  for (let i = 0; i < 40; i++) {
    p.restoreStreams = [];
    p.life = max * 0.5;
    p.charges.set('flask_life', 3);
    sip(w, p, inst);
    const pair = lastTwo(p);
    if (!pair) { mixed++; continue; }
    const [surge, settle] = pair;
    const isPlain = near(surge.remaining, 0.15 * max, 0.01) && near(settle.remaining, 18, 0.01);
    const isCrit = near(surge.remaining, 0.15 * max * M, 0.01) && near(settle.remaining, 18 * M, 0.01);
    if (isPlain) plain++;
    else if (isCrit) crit++;
    else mixed++;
  }
  check('I1 the sip crits WHOLE or not at all — never half-and-half (one roll per press)',
    mixed === 0, `plain ${plain}, crit ${crit}, mixed ${mixed} (×${M.toFixed(2)})`);
  check('I2 both outcomes observed at 50% (the roll is real)', plain > 0 && crit > 0,
    `plain ${plain}, crit ${crit}`);
  p.sheet.setSource('probeCrit', []);
}

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL PASS');
process.exit(failed ? 2 : 0);
