// ---------------------------------------------------------------------------
// ONE-OFF PROBE — MIREILLE'S FLASK LESSON latches COMPLETED on the real
// engine: the gift arc end to end (dwell hand-over, learn, bar, brim reward,
// account graduation), then every way a finished lesson must STAY finished —
// unbinding a flask, unlearning both, a veteran deal on a graduated account,
// mid-lesson unlearn as agency, gems traded away, and a legacy resumed save.
// The lesson state is a LEDGER fact (world.ts MIREILLE_LESSON_STEPS): no
// teaching surface — tab glow, flap glow, talk line, open-on-Skill-Gems —
// may ever re-light over the player's own build choices.
// Run: npx tsx balance/probe_mireille_lesson.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { makeSkillInstance } from '../src/engine/skills';
import { SKILLS } from '../src/data/skills';
import { LEDGER_FLASK_LESSON } from '../src/meta/account';
import { bumpLedger } from '../src/packages/ledger';
import type { World } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

// The run-ledger keys under test (module-scoped in world.ts, mirrored here
// the way every probe mirrors content ids).
const GIFT = 'mireille_flasks_given';
const LIVED = 'mireille_lesson_lived';
const FLASKS = ['life_flask', 'mana_flask'];

const step = (w: World, s: number): void => {
  const dt = 1 / 60;
  for (let t = 0; t < s; t += dt) w.update(dt);
};
const learn = (w: World, sid: string): boolean =>
  w.learnSkill(w.meta.skillInv.findIndex(i => i.def.id === sid));
const bindFree = (w: World, sid: string): boolean =>
  w.bindSkill(w.player.skills.findIndex(s => s === null), sid);
const barSlotOf = (w: World, sid: string): number =>
  w.player.skills.findIndex(s => s?.def.id === sid);
// The gift's own shape, dealt directly (mireilleService's hand-over) for the
// worlds that don't walk the dwell.
const giveDirect = (w: World): void => {
  for (const sid of FLASKS) w.meta.skillInv.push(makeSkillInstance(SKILLS[sid]!, 1, 0));
  bumpLedger(w.ledger, GIFT);
};

bootSimEngine();

// === A) the full arc on the REAL paths: dwell gift → learn → bar → latch ===
const A = makeSimWorld('tamer', 24601);
check('A0: no lesson before her arc begins', A.mireilleGiftLesson() === null);
// Arc scoping: a wild-loot flask gem is just a gem — no gift, no lesson.
A.meta.skillInv.push(makeSkillInstance(SKILLS['life_flask']!, 1, 0));
check('A0b: a wild carried flask gem rolls no lesson (arc-scoped)',
  A.mireilleGiftLesson() === null);
A.meta.skillInv.pop();

// Mireille herself, spawned the way town does (createMonster + push), close
// enough to dwell — open-air, so her 'roof' reach degrades to sight.
const mireille = A.createMonster('townsfolk_innkeep', 1, 'player');
mireille.pos = { x: A.player.pos.x + 60, y: A.player.pos.y };
A.actors.push(mireille);
step(A, 1.5); // idle dwell ≥ MIREILLE_DWELL → the welcome gift
check('A1: the dwell hands over both gift gems',
  FLASKS.every(sid => A.meta.skillInv.some(i => i.def.id === sid)),
  `skillInv=[${A.meta.skillInv.map(i => i.def.id).join(',')}]`);
check('A1b: the hand-over is ledgered', (A.ledger[GIFT] ?? 0) >= 1);
check('A1c: lesson opens on the learn step', A.mireilleGiftLesson() === 'learn');

check('A2: learning one flask keeps the learn step (one still carried)',
  learn(A, 'life_flask') && A.mireilleGiftLesson() === 'learn');
check('A3: learning the second advances to the bar step',
  learn(A, 'mana_flask') && A.mireilleGiftLesson() === 'bar');
check('A4: barring one flask keeps the bar step (one still unbound) — mid-arc teaching persists',
  bindFree(A, 'life_flask') && A.mireilleGiftLesson() === 'bar');
check('A5: barring the second completes the lesson',
  bindFree(A, 'mana_flask') && A.mireilleGiftLesson() === null);

step(A, 0.2); // updateMireille: the belt ledgers the close + graduation + the brim
check('A5b: the close is LEDGERED (the belt)', (A.ledger[LIVED] ?? 0) >= 1);
check('A6: the account graduates the moment the lesson is lived',
  (A.account.ledger[LEDGER_FLASK_LESSON] ?? 0) >= 1);
check('A6b: her reward brims the founts (fill ledgered)',
  (A.ledger['mireille_flasks_filled'] ?? 0) >= 1
  && (A.player.charges.get('flask_life') ?? 0) > 0,
  `flask_life=${A.player.charges.get('flask_life') ?? 0}`);

// THE REPORTED BUG: un-equipping a flask must never re-open the lesson.
A.bindSkill(barSlotOf(A, 'life_flask'), null);
check('A7: unbinding a flask does NOT re-light the lesson (the bug)',
  A.mireilleGiftLesson() === null);
check('A8: unlearning both flasks does NOT re-light the lesson',
  A.unlearnSkill('life_flask') && A.unlearnSkill('mana_flask')
  && A.mireilleGiftLesson() === null);
const prompt = A.innkeepPrompt();
check('A9: her talk line holds no stale directions',
  prompt === null || (!prompt.includes('Skill Gems') && !prompt.includes('BUILD flap')),
  `prompt="${prompt}"`);

// === B) the veteran deal: a graduated account's fresh character ============
const B = makeSimWorld('tamer', 24602);
B.account.ledger[LEDGER_FLASK_LESSON] = 1;
B.dealVeteranFlasks();
check('B1: veteran flasks arrive learned and barred',
  FLASKS.every(sid => B.meta.knownSkills.has(sid))
  && FLASKS.every(sid => barSlotOf(B, sid) >= 0));
check('B1b: the deal bumps both of her run keys',
  (B.ledger[GIFT] ?? 0) >= 1 && (B.ledger['mireille_flasks_filled'] ?? 0) >= 1);
check('B1c: no lesson rolls for the veteran', B.mireilleGiftLesson() === null);
B.bindSkill(barSlotOf(B, 'life_flask'), null);
step(B, 0.2);
check('B2: the veteran unbinding a flask stays quiet', B.mireilleGiftLesson() === null);

// === C) mid-lesson agency: unlearning her gift IS commanding the loop ======
const C = makeSimWorld('tamer', 24603);
giveDirect(C);
check('C1: gift dealt directly opens the learn step', C.mireilleGiftLesson() === 'learn');
learn(C, 'life_flask');
check('C2: unlearning mid-lesson closes the lesson for good (agency)',
  C.unlearnSkill('life_flask') && C.mireilleGiftLesson() === null
  && (C.ledger[LIVED] ?? 0) >= 1);
step(C, 0.2);
check('C2b: that mastery graduates the account too',
  (C.account.ledger[LEDGER_FLASK_LESSON] ?? 0) >= 1);

// === D) gems traded away: the end-state belt closes the lesson =============
const D = makeSimWorld('tamer', 24604);
giveDirect(D);
D.meta.skillInv.length = 0; // sold, dropped, sacrificed — gone is gone
step(D, 0.2);
check('D1: a hero who trades the gift away owes no lesson',
  D.mireilleGiftLesson() === null && (D.ledger[LIVED] ?? 0) >= 1);

// === E) legacy resumed save: filled before the step keys existed ===========
const E = makeSimWorld('tamer', 24605);
giveDirect(E);
learn(E, 'life_flask'); learn(E, 'mana_flask'); // known, never re-barred
// This save predates the lived key — only the old fill marker proves the
// lesson (a pre-latch character who brimmed, unbound, and saved).
bumpLedger(E.ledger, 'mireille_flasks_filled');
check('E1: an old save with the fill marker reads LIVED (no bar-step nag)',
  E.mireilleGiftLesson() === null);
step(E, 0.2);
check('E1b: and graduates the account on resume',
  (E.account.ledger[LEDGER_FLASK_LESSON] ?? 0) >= 1);

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL CHECKS PASS');
process.exit(failed ? 1 : 0);
