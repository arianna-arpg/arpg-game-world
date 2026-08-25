// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE BOUNTY BOARD M0 (docs/design/bounty-board.md;
// data/bountyboard.ts + engine/world.ts + meta/worldstate.ts + townBuild).
// Pins:
//   A. THE RESIDENCE + THE GATE: the bounty_post fixture folds into the
//      expanded town exactly when the feature is owned (expandedTown is a
//      pure function of the account); the site sits inside the base
//      footprint; the structure + catalog row + kind registry all resolve.
//   B. THE FOREORDAINED SLATE + THE BEAT: the arm deals ≤ five offers off
//      the seeded (worldSeed, board, beat) stream — same seed + same beat =
//      byte-identical slate across worlds; a same-beat re-arm keeps THE
//      STANDING SLATE; a TURNED beat re-deals whole. Every offer is HONEST:
//      a standing zone, a completable objective kind, inside the level
//      band, no finished work advertised, boardId recorded (the per-board
//      law's shape).
//   C. THE ONE-HAND LAW + THE CLAIM LANE: accepting seats the hand AND the
//      ordinary activeQuests row (journal category 'bounty'); a second
//      accept refuses (cap folded per board; the constant re-dialed 2 → 1
//      — the dormant-default leak guard); a veiled target's veil lifts at
//      accept (the charge tells you the way — ruled).
//   D. THE PREDICATE + THE TURN-IN + THE SHARED-STAMP LAW: turn-in refuses
//      while the ask stands (done() is the law, a pure read); once the
//      zone's objective completes, the turn-in AT THE BOARD pays (essence
//      ground packets at the payout site) and stamps bounty_done +
//      bounty_done:<kind> run + account — and NEVER a per-id quest_done:
//      key (the ledger-bloat pitfall); the posting id never joins
//      completedQuests; the hand frees.
//   E. SAVE FIDELITY (the headline pitfall — the load filter eats generated
//      quests): the slate + the taken hand ride serializeWorldState →
//      adoptWorldState VERBATIM (persisted, never re-derived — the
//      live-world pool law); the hand's activeQuests row SURVIVES the
//      quest filter through questDefOf; a stateless world writes no
//      bountyBoard key; the sanitizer drops unknown kinds / dead zones
//      and never throws.
//   F. THE ABANDON: the hand frees, the row goes, the posting never
//      returns to the slate.
// Run: npx tsx balance/probe_bountyboard.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { FEATURE, LEDGER_BOUNTY_DONE, bountyDoneKindKey, makeAccount } from '../src/meta/account';
import { BOUNTY_BOARD_CFG, BOUNTY_KINDS, type BountyPosting } from '../src/data/bountyboard';
import { BOUNTY_BOARD_SITE, expandedTown } from '../src/data/townBuild';
import { STRUCTURES } from '../src/data/structures';
import { QUEST_CATEGORY_CAPS } from '../src/quests/types';
import { START_ZONE, ZONES } from '../src/data/zones';
import { allUnlockables } from '../src/meta/unlocks';
import { sanitizeBountyBoard } from '../src/meta/worldstate';
import type { World } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();

const SEED = 0xb0a4d;
const openBoard = (w: World): void => { w.account.features.add(FEATURE.BOUNTY_BOARD); };
const parkAtBoard = (w: World): void => {
  w.player.pos.x = BOUNTY_BOARD_SITE.x;
  w.player.pos.y = BOUNTY_BOARD_SITE.y;
};
const mkWorld = (): World => {
  const w: World = makeSimWorld('warrior', SEED);
  openBoard(w);
  // Grow the charted country the honest way — an ARRIVAL resolves its mint
  // horizon (world.ts chartWithin at loadZone), exactly as live play does;
  // a boot-bare map holds one eligible zone and the slate would run short.
  w.loadZone('crossroads');
  w.loadZone(START_ZONE);
  return w;
};

// ------------------------------------------------ A. RESIDENCE + THE GATE
{
  const base = ZONES[START_ZONE];
  const bare = makeAccount();
  const owned = makeAccount();
  owned.features.add(FEATURE.BOUNTY_BOARD);
  const withoutFix = expandedTown(bare, base).fixtures?.some(f => f.structure === 'bounty_post') ?? false;
  const withFix = expandedTown(owned, base).fixtures?.some(f => f.structure === 'bounty_post') ?? false;
  check('A: the bounty_post fixture folds in exactly with the feature', !withoutFix && withFix);
  check('A: the site sits inside the base town footprint',
    BOUNTY_BOARD_SITE.x > 0 && BOUNTY_BOARD_SITE.x < base.size.w
    && BOUNTY_BOARD_SITE.y > 0 && BOUNTY_BOARD_SITE.y < base.size.h);
  check('A: the bounty_post structure resolves (board prop worn)',
    !!STRUCTURES.bounty_post
    && (STRUCTURES.bounty_post.props?.some(p => p.kind === 'bounty_board') ?? false));
  check('A: the catalog row stands (feat_bounty_board → the feature flag)',
    allUnlockables().some(u => u.id === 'feat_bounty_board'
      && u.kind === 'feature' && u.payload.flag === FEATURE.BOUNTY_BOARD));
  check('A: the charge kind is registered', !!BOUNTY_KINDS.charge);
  check('A: THE ONE-HAND constant re-dialed (the dormant-2 leak guard)',
    QUEST_CATEGORY_CAPS.bounty === 1);
}

// ------------------------------------- B. THE FOREORDAINED SLATE + THE BEAT
seedGlobalRandom(0x5eed1);
const wB = mkWorld();
wB.armBountyBoard();
const slateIds = (w: World): string => w.bountyOffers.map(p => `${p.id}@${p.zoneId}`).join('|');
const firstSlate = slateIds(wB);
check('B: the arm deals a slate', wB.bountyOffers.length > 0
  && wB.bountyOffers.length <= BOUNTY_BOARD_CFG.offers,
`${wB.bountyOffers.length}/${BOUNTY_BOARD_CFG.offers} offers`);
check('B: every offer is honest (zone stands, kind completable, band, no finished work, boardId recorded)',
  wB.bountyOffers.every(p => {
    const z = wB.zoneMap[p.zoneId];
    return !!z
      && !BOUNTY_BOARD_CFG.charge.refuse.includes(z.objective.kind)
      && z.objective.kind !== 'safe'
      && !wB.objectiveDoneAt(p.zoneId)
      && z.level >= wB.player.level - BOUNTY_BOARD_CFG.charge.band.below
      && z.level <= wB.player.level + BOUNTY_BOARD_CFG.charge.band.above
      && p.boardId === BOUNTY_BOARD_CFG.boardId
      && p.pay.essence.length > 0;
  }));
wB.armBountyBoard();
check('B: a same-beat re-arm keeps THE STANDING SLATE', slateIds(wB) === firstSlate);
seedGlobalRandom(0x5eed1);
const wB2 = mkWorld();
wB2.time = wB.time;
wB2.armBountyBoard();
check('B: same seed + same beat = the identical slate (foreordained)',
  slateIds(wB2) === firstSlate, firstSlate);
wB.time += wB.bountyBeatSeconds();
wB.armBountyBoard();
check('B: a TURNED beat re-deals whole (fresh posting ids)',
  slateIds(wB) !== firstSlate && wB.bountyOffers.every(p => p.beat === 1));

// --------------------------------- C. THE ONE-HAND LAW + THE CLAIM LANE
seedGlobalRandom(0xc0c0a);
const wC = mkWorld();
wC.armBountyBoard();
check('C: a slate to take from', wC.bountyOffers.length >= 2, `${wC.bountyOffers.length} offers`);
const offer0: BountyPosting = wC.bountyOffers[0];
const offer1: BountyPosting | undefined = wC.bountyOffers[1];
// Force the claim-lane veil case deliberately: a charge on veiled ground
// LIFTS the veil at accept (walk-1 card 4 — the errand alone keeps it).
wC.zoneMap[offer0.zoneId].veiled = true;
check('C: the accept takes the hand', wC.acceptBounty(offer0.id) === true
  && wC.bountyHands.length === 1 && wC.bountyHands[0].id === offer0.id);
check('C: the ordinary quest row seats (the same primitive, a different giver)',
  wC.activeQuests.some(e => e.questId === offer0.id && e.zoneId === offer0.zoneId));
check('C: the journal reads it as a bounty',
  wC.questLog().active.some(r => r.id === offer0.id && r.category === 'bounty'));
check('C: the claim lane lifted the veil', wC.zoneMap[offer0.zoneId].veiled !== true);
check('C: THE ONE-HAND LAW refuses a second take (folded per board)',
  offer1 !== undefined && wC.acceptBounty(offer1.id) === false && wC.bountyHands.length === 1);
check('C: questDefOf resolves the generated def (turn-in lane worn)',
  wC.questDefOf(offer0.id)?.category === 'bounty' && !!wC.questDefOf(offer0.id)?.turnIn);

// ----------------- D. THE PREDICATE + THE TURN-IN + THE SHARED-STAMP LAW
parkAtBoard(wC);
check('D: the board is in reach for the turn-in', wC.nearBountyBoard());
check('D: an unfinished ask refuses the turn-in (done() is the law)',
  wC.turnInBounty(offer0.id) === false && wC.bountyHands.length === 1);
wC.completedObjectives.add(offer0.zoneId);
check('D: the predicate reads the completion', BOUNTY_KINDS.charge.done(wC, offer0) === true);
const dropsBefore = wC.drops.length;
check('D: the turn-in at the board pays and frees the hand',
  wC.turnInBounty(offer0.id) === true && wC.bountyHands.length === 0
  && !wC.activeQuests.some(e => e.questId === offer0.id));
check('D: the pay landed as ground packets at the payout site', wC.drops.length > dropsBefore,
  `${wC.drops.length - dropsBefore} packet(s)`);
check('D: THE SHARED-STAMP LAW — run ledger', (wC.ledger[LEDGER_BOUNTY_DONE] ?? 0) === 1
  && (wC.ledger[bountyDoneKindKey('charge')] ?? 0) === 1);
check('D: THE SHARED-STAMP LAW — account mirror', (wC.account.ledger[LEDGER_BOUNTY_DONE] ?? 0) >= 1
  && (wC.account.ledger[bountyDoneKindKey('charge')] ?? 0) >= 1);
check('D: no per-id quest_done: key ever stamps (the ledger-bloat guard)',
  !Object.keys(wC.ledger).some(k => k === `quest_done:${offer0.id}`)
  && !Object.keys(wC.account.ledger).some(k => k === `quest_done:${offer0.id}`));
check('D: the posting id never joins completedQuests', !wC.completedQuests.has(offer0.id));

// ------------------------------------------------------- E. SAVE FIDELITY
seedGlobalRandom(0xe5a7e);
const wE = mkWorld();
wE.armBountyBoard();
const eOffer = wE.bountyOffers[0];
check('E: a hand in flight to save', wE.acceptBounty(eOffer.id) === true);
const eSlate = slateIds(wE);
const ws = wE.serializeWorldState();
check('E: the save carries the board bag', !!ws.bountyBoard
  && (ws.bountyBoard?.hands?.length ?? 0) === 1);
seedGlobalRandom(0xe5a7e);
const wE2 = mkWorld();
check('E: adoptWorldState stands the slate + hand back up VERBATIM',
  wE2.adoptWorldState(ws) === true
  && slateIds(wE2) === eSlate
  && wE2.bountyHands.length === 1 && wE2.bountyHands[0].id === eOffer.id);
check('E: THE LOAD FILTER keeps the generated quest row (the resolver seam)',
  wE2.activeQuests.some(e => e.questId === eOffer.id)
  && wE2.questDefOf(eOffer.id)?.category === 'bounty');
const wClean = makeSimWorld('warrior', SEED ^ 7);
check('E: a stateless world writes no board bag',
  wClean.serializeWorldState().bountyBoard === undefined);
const doctored = {
  armedBeat: 0,
  offers: [
    { id: 'x1', kind: 'no_such_kind', boardId: 'lastlight', zoneId: eOffer.zoneId, beat: 0, pay: { essence: [] } },
    { id: 'x2', kind: 'charge', boardId: 'lastlight', zoneId: 'zone_that_never_was', beat: 0, pay: { essence: [] } },
  ],
};
const sane = sanitizeBountyBoard(doctored, wE2.zoneMap);
check('E: the sanitizer drops unknown kinds + dead ground, never throws',
  sane === null || sane.offers.length === 0);

// ---------------------------------------------------------- F. THE ABANDON
seedGlobalRandom(0xfa9);
const wF = mkWorld();
wF.armBountyBoard();
const fOffer = wF.bountyOffers[0];
const fCount = wF.bountyOffers.length;
check('F: take a hand to abandon', wF.acceptBounty(fOffer.id) === true
  && wF.bountyOffers.length === fCount - 1);
check('F: the abandon frees the hand; the posting never returns',
  wF.abandonBounty(fOffer.id) === true
  && wF.bountyHands.length === 0
  && !wF.activeQuests.some(e => e.questId === fOffer.id)
  && !wF.bountyOffers.some(p => p.id === fOffer.id));

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
