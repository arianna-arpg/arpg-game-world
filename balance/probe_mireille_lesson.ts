// ---------------------------------------------------------------------------
// ONE-OFF PROBE — MIREILLE'S FLASK LESSON latches COMPLETED on the real
// engine: the gift arc end to end (dwell hand-over as magic-rarity bag
// ITEMS, the one seat gesture, brim reward, account graduation), then every
// way a finished lesson must STAY finished — unbinding a flask, unlearning
// both, a veteran deal on a graduated account, mid-lesson unlearn as
// agency, the gift traded away, and a legacy resumed save. The lesson
// state is a LEDGER fact (world.ts MIREILLE_LESSON_STEPS — ONE 'learn'
// row since M4: learn = seat = barred): no teaching surface — the flask
// bag-tile glows, the SKILLS flap glow, the empty rack-seat glows, her
// talk line — may ever re-light over the player's own build choices. The
// step's SUBJECTS (mireilleLessonSkills — which gift skills still want
// the move; the grain behind the per-item bag glow) must track the arc
// one flask at a time and wear the same latch. M4 adds: THE GIFT'S
// BAGFULL (all-or-nothing, refuse-before-mutating, her beat consumed),
// THE VAULT CHAIN (LEDGER_FLASK_LESSON opens feat_mireille_life; the
// Bestiary road hangs off the care chain untouched by the rework), and
// THE AFTERGLOW (the brim's send-off holds until the player steps away —
// the locked-care pitch waits for the return visit).
// Run: npx tsx balance/probe_mireille_lesson.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { makeSkillInstance } from '../src/engine/skills';
import { SKILLS } from '../src/data/skills';
import { freeCellCount, skillGemPayloadOf } from '../src/engine/gemitems';
import { FEATURE, LEDGER_FLASK_LESSON } from '../src/meta/account';
import { UNLOCK_CATALOG, isUnlockVisible } from '../src/meta/unlocks';
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
// THE RESIDENCE (M1): a carried gift is a bag WRAPPER item; learn = seat
// (learnSkill takes the wrapper's uid and the skill lands barred).
const bagFlask = (w: World, sid: string) =>
  w.meta.items.find(i => i.gem?.kind === 'skill' && i.gem.skillId === sid);
const learn = (w: World, sid: string): boolean => {
  const item = bagFlask(w, sid);
  return !!item && w.learnSkill(item.uid);
};
const barSlotOf = (w: World, sid: string): number =>
  w.player.skills.findIndex(s => s?.def.id === sid);
// The key-grain read, flattened for equality checks (registry order:
// life then mana — MIREILLE_GIFT_SKILLS' own).
const subjects = (w: World): string => w.mireilleLessonSkills().join(',');
// The gift's own shape, dealt directly (mireilleService's hand-over) for the
// worlds that don't walk the dwell.
const giveDirect = (w: World): void => {
  for (const sid of FLASKS) w.grantSkillGemItem(w.localSeat, makeSkillInstance(SKILLS[sid]!, 1, 0));
  bumpLedger(w.ledger, GIFT);
};

bootSimEngine();

// === A) the full arc on the REAL paths: dwell gift → learn → bar → latch ===
const A = makeSimWorld('tamer', 24601);
check('A0: no lesson before her arc begins', A.mireilleGiftLesson() === null);
// Arc scoping: a wild-loot flask gem is just a gem — no gift, no lesson.
const wildFlask = A.grantSkillGemItem(A.localSeat, makeSkillInstance(SKILLS['life_flask']!, 1, 0))!;
check('A0b: a wild carried flask gem rolls no lesson (arc-scoped)',
  A.mireilleGiftLesson() === null);
check('A0c: and names no subjects (key-grain glows stay dark too)',
  subjects(A) === '', `subjects=[${subjects(A)}]`);
A.meta.items.splice(A.meta.items.findIndex(i => i.uid === wildFlask.uid), 1);

// Mireille herself, spawned the way town does (createMonster + push), close
// enough to dwell — open-air, so her 'roof' reach degrades to sight.
const mireille = A.createMonster('townsfolk_innkeep', 1, 'player');
mireille.pos = { x: A.player.pos.x + 60, y: A.player.pos.y };
A.actors.push(mireille);
step(A, 1.5); // idle dwell ≥ MIREILLE_DWELL → the welcome gift
check('A1: the dwell hands over both gift gems (bag wrapper items now)',
  FLASKS.every(sid => !!bagFlask(A, sid)),
  `bag=[${A.meta.items.filter(i => i.gem?.kind === 'skill').map(i => i.name).join(',')}]`);
check('A1-rarity: her authored generosity — both wrappers carry MAGIC gems',
  FLASKS.every(sid => skillGemPayloadOf(bagFlask(A, sid)!)?.rarity === 'magic'));
check('A1b: the hand-over is ledgered', (A.ledger[GIFT] ?? 0) >= 1);
check('A1c: lesson opens on the learn step', A.mireilleGiftLesson() === 'learn');
check('A1d: the learn step names both carried gifts as its subjects',
  subjects(A) === 'life_flask,mana_flask', `subjects=[${subjects(A)}]`);
// THE VOICE (M4): her directions speak the pack→rack register — the
// register is pinned, never the sentence (her exact words stay hers).
const learnPrompt = A.innkeepPrompt() ?? '';
check('A1e: her learn-step line points pack → rack',
  learnPrompt.includes('pack') && learnPrompt.includes('rack'),
  `prompt="${learnPrompt}"`);

check('A2: seating one flask keeps the learn step (one still carried)',
  learn(A, 'life_flask') && A.mireilleGiftLesson() === 'learn');
check('A2b: the subjects narrow to the flask still carried',
  subjects(A) === 'mana_flask', `subjects=[${subjects(A)}]`);
// LEARNED = SEATED: learning IS barring — seating the second flask
// completes the whole lesson in the one gesture (M4 collapsed the old
// 'bar' row outright: its pending state was unreachable by construction).
check('A3: seating the second completes the lesson (learn = seat = barred)',
  learn(A, 'mana_flask') && A.mireilleGiftLesson() === null);
check('A3b: both flasks stand on the bar — the seat IS the bar slot',
  FLASKS.every(sid => barSlotOf(A, sid) >= 0));
check('A5c: no subjects survive the close', subjects(A) === '', `subjects=[${subjects(A)}]`);

step(A, 0.2); // updateMireille: the belt ledgers the close + graduation + the brim
check('A5b: the close is LEDGERED (the belt)', (A.ledger[LIVED] ?? 0) >= 1);
check('A6: the account graduates the moment the lesson is lived',
  (A.account.ledger[LEDGER_FLASK_LESSON] ?? 0) >= 1);
check('A6b: her reward brims the founts (fill ledgered)',
  (A.ledger['mireille_flasks_filled'] ?? 0) >= 1
  && (A.player.charges.get('flask_life') ?? 0) > 0,
  `flask_life=${A.player.charges.get('flask_life') ?? 0}`);

// THE AFTERGLOW (M4 tail): the closed lesson never pivots mid-breath into
// the locked-care pitch — her prompt is the warm send-off until the player
// steps out of her reach, and the standing line waits for the return visit.
const after = A.innkeepPrompt() ?? '';
check('A6c: after the brim her line is the send-off, not the innstay pitch',
  after.length > 0 && !after.includes('innstay'), `prompt="${after}"`);
const homeX = A.player.pos.x, homeY = A.player.pos.y;
A.player.pos.x += 600; step(A, 0.3); // step out of her reach — afterglow clears
A.player.pos.x = homeX; A.player.pos.y = homeY; step(A, 0.3);
const back = A.innkeepPrompt() ?? '';
check('A6d: the return visit meets her standing line (afterglow cleared)',
  back.includes('innstay'), `prompt="${back}"`);

// THE REPORTED BUG: un-equipping a flask must never re-open the lesson.
A.bindSkill(barSlotOf(A, 'life_flask'), null);
check('A7: unbinding a flask does NOT re-light the lesson (the bug)',
  A.mireilleGiftLesson() === null);
check('A7b: nor its keys — the latch covers the key grain',
  subjects(A) === '', `subjects=[${subjects(A)}]`);
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
check('B2b: and their keys never glow', subjects(B) === '', `subjects=[${subjects(B)}]`);

// === C) mid-lesson agency: unlearning her gift IS commanding the loop ======
const C = makeSimWorld('tamer', 24603);
giveDirect(C);
check('C1: gift dealt directly opens the learn step', C.mireilleGiftLesson() === 'learn');
learn(C, 'life_flask');
check('C2: unlearning mid-lesson closes the lesson for good (agency)',
  C.unlearnSkill('life_flask') && C.mireilleGiftLesson() === null
  && (C.ledger[LIVED] ?? 0) >= 1);
check('C2-keys: the agency latch empties the subjects mid-arc too',
  subjects(C) === '', `subjects=[${subjects(C)}]`);
step(C, 0.2);
check('C2b: that mastery graduates the account too',
  (C.account.ledger[LEDGER_FLASK_LESSON] ?? 0) >= 1);

// === D) gems traded away: the end-state belt closes the lesson =============
const D = makeSimWorld('tamer', 24604);
giveDirect(D);
// sold, dropped, sacrificed — gone is gone (sweep the gem wrappers)
D.meta.items = D.meta.items.filter(i => !i.gem);
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

// === F) THE GIFT'S BAGFULL (M4): all-or-nothing, refuse-before-mutating ====
// The gift is a bag grant now, so it can be REFUSED — and a half-gift
// would orphan the other flask forever. One free cell for a two-flask
// hand must grant NOTHING, ledger NOTHING, and keep the gift OWED; her
// refusal consumes the dwell beat (once per cooldown, never per frame).
const F = makeSimWorld('tamer', 24607);
const fMireille = F.createMonster('townsfolk_innkeep', 1, 'player');
fMireille.pos = { x: F.player.pos.x + 60, y: F.player.pos.y };
F.actors.push(fMireille);
while (freeCellCount(F.meta.items) > 1) {
  if (!F.grantSkillGemItem(F.localSeat, makeSkillInstance(SKILLS['fireball']!, 1, 0))) break;
}
check('F0: the rig packed the bag to ONE free cell', freeCellCount(F.meta.items) === 1);
step(F, 1.5); // the dwell fires — and must refuse the whole hand
check('F1: a one-cell pack refuses the WHOLE gift (no half-hand)',
  FLASKS.every(sid => !bagFlask(F, sid)) && freeCellCount(F.meta.items) === 1);
check('F1b: nothing is ledgered — the gift stays owed',
  !(F.ledger[GIFT] ?? 0) && F.mireilleGiftOwed());
check('F1c: no lesson opens over a refused gift', F.mireilleGiftLesson() === null);
// Make room (two cells) and wait out her beat: the same dwell now lands both.
const filler = F.meta.items.find(i => i.gem?.kind === 'skill' && i.gem.skillId === 'fireball')!;
F.meta.items.splice(F.meta.items.indexOf(filler), 1);
step(F, 6.5); // cooldown (5s) + dwell
check('F2: with room made, the next beat hands over BOTH flasks',
  FLASKS.every(sid => !!bagFlask(F, sid)) && (F.ledger[GIFT] ?? 0) >= 1);
check('F2b: and the lesson opens as ever', F.mireilleGiftLesson() === 'learn');

// === G) THE VAULT CHAIN (M4's ledger law): the rework moves no gates ======
// feat_mireille_life hangs on LEDGER_FLASK_LESSON — the same account key
// the belt stamps at both-flasks-seated — and the Bestiary road
// (feat_tracker) hangs off the care chain above it.
const lifeRow = UNLOCK_CATALOG.find(u => u.id === 'feat_mireille_life')!;
const trackerRow = UNLOCK_CATALOG.find(u => u.id === 'feat_tracker')!;
check('G0: rig A\'s walked lesson opened the chain head on its own account',
  isUnlockVisible(A.account, lifeRow));
const G = makeSimWorld('tamer', 24608);
check('G1: a fresh account\'s Vault breathes no word of her chain',
  !isUnlockVisible(G.account, lifeRow) && !isUnlockVisible(G.account, trackerRow));
G.account.ledger[LEDGER_FLASK_LESSON] = 1;
check('G2: the lesson stamp alone surfaces feat_mireille_life',
  isUnlockVisible(G.account, lifeRow));
check('G2b: the Tracker still waits behind the care chain',
  !isUnlockVisible(G.account, trackerRow));
G.account.features.add(FEATURE.MIREILLE_HEAL_LIFE);
G.account.features.add(FEATURE.MIREILLE_HEAL_MANA);
check('G3: owned care opens the Bestiary road (feat_tracker surfaces)',
  isUnlockVisible(G.account, trackerRow));

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL CHECKS PASS');
process.exit(failed ? 1 : 0);
