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
//   G/H/I (M1): THE ERRAND's omen face + entry-deed; THE CULL's remote writ
//      marks + posting-credited claims; THE PAY LANES minting at the turn-in.
//   J (M2): THE SOURCE REGISTRY + K4 THE ANSWER — a probe-registered source
//      row (the open-registry law: extensibility is the truth) feeds the
//      REAL arm; the posting carries the claim (source/key/copy/baseline),
//      THE DELTA LAW reads done off the resolution ledger, THE FIELD WATCH
//      flips the hand ready ANYWHERE (no zone hook) and annuls a departed
//      ask in the field with its courtesy; a resolved-before-taken offer is
//      struck at the arm's reconcile.
//   K (M2): THE LIVE LANES — worldboss/fractures/hunt/harborhold rows all
//      registered (sorted, censuses clean on a bare world); the harborhold
//      deep walk (besieged → census, veiled → filtered, open → resolved,
//      fallen → the FAIL read that never annuls and resolves at the board
//      with no pay); the sanitizer's answer branch (unknown source drops,
//      a K4 posting without its claim drops whole).
//   L (first-writ W0): THE OPEN DOOR — cost 0, ungated, catalog HEAD, the
//      empty-purse claim — and the board lesson's live read (never accepted
//      = live; the M0 accept stamp closes it forever, no new key).
//   M (first-writ W1): THE STARTER BAND — live per run while the Crossroads
//      stands uncleared; young = every seat pinned, essence-only, distinct
//      kinds; mature = one perpetual anchor + near-ground; the cleared
//      Crossroads expires the band structurally.
//   N (first-writ W2): THE GATHER — the fit is the harvest fabric's row
//      read; arrival plants the writ's remainder (the remote-writ law); a
//      REAL rite settled through the standing machinery credits the
//      POSTING at the chokepoint and the hand turns in at the board.
//   O (M3): THE SUMMONS — the summonable roster (headroom at the roll, the
//      cap across slate + hands), THE WORLD ACT at the accept (a failed
//      ignite strikes, a room-filled offer strikes at the reconcile), the
//      born key + at-accept baseline, the delta-law resolve, the field
//      annul on a departed instance. O2: the REAL fracture debut — a
//      fractures-enabled world deals the summons, the accept tears the
//      earth at the posted zone through devIgnite (promoted), the census
//      and fractureIn agree, the seal resolves, the board pays.
//   P (M4): the growth rungs (derived rows, the reach/broader folds, the
//      young law outranking BROADER) + the chevron patron.
//   Q (her adjustments): THE TURN-IN REFRESH (a resolved hand re-deals
//      NOW under the slate-key law — fresh ids, persisted seq, the beat
//      as the no-acceptance fallback; abandons never fish the deal) and
//      THE POSTING PIN (capacity = Reserved Postings rungs; pinned
//      offers ride beat and refresh alike; the pin holds the seat, never
//      the truth).
//   R (THE KINSHIP, walk 2): the board roster (Lastlight + open holds
//      wearing the bounty_board service), ALWAYS-localized slates, one
//      hand per board, the writ walking home to its own counter, the
//      scoped turn-in refresh, one shared lattice, the regional save
//      bookkeeping, and the starter band governing Lastlight alone.
// Run: npx tsx balance/probe_bountyboard.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, classById, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { resetActorIdCounter } from '../src/engine/actor';
import { World } from '../src/engine/world';
import { buildManifest } from '../src/packages/manifest';
import { FEATURE, LEDGER_BOUNTY_DONE, bountyDoneKindKey, featureEnabled, makeAccount } from '../src/meta/account';
import { applyUnlock, availableUnlocks } from '../src/meta/unlocks';
import {
  BOUNTY_BOARD_CFG, BOUNTY_KINDS, BOUNTY_SOURCES, bountySourceRows,
  bountyUniqueCategories, bountyUniquePool, describeBountyPay, liveBountyBand,
  registerBountySource, type BountyPosting, type BountyTargetRef,
} from '../src/data/bountyboard';
import { HOLD_CLASSES, mintHoldState } from '../src/data/harborholds';
import { harvestRowsFor } from '../src/data/harvest';
import { coordDist } from '../src/world/coords';
import { HARVEST_CFG, harvestSeqFor } from '../src/engine/harvest';
import { expandedTown, townSiteAt } from '../src/data/townBuild';
import { STRUCTURES } from '../src/data/structures';
import { QUEST_CATEGORY_CAPS } from '../src/quests/types';
import { START_ZONE, ZONES } from '../src/data/zones';
import { allUnlockables } from '../src/meta/unlocks';
import { sanitizeBountyBoard } from '../src/meta/worldstate';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();

const SEED = 0xb0a4d;
const openBoard = (w: World): void => { w.account.features.add(FEATURE.BOUNTY_BOARD); };
const parkAtBoard = (w: World): void => {
  // THE ONE READ (townBuild's site resolver through the World's own tier).
  const at = w.townSeat('bounty_board');
  w.player.pos.x = at.x;
  w.player.pos.y = at.y;
};
const mkWorld = (): World => {
  const w: World = makeSimWorld('warrior', SEED);
  openBoard(w);
  // Grow the charted country the honest way — an ARRIVAL resolves its mint
  // horizon (world.ts chartWithin at loadZone), exactly as live play does;
  // a boot-bare map holds one eligible zone and the slate would run short.
  w.loadZone('crossroads');
  w.loadZone(START_ZONE);
  // THE STARTER BAND stands down for the standing-grammar rigs (W1 — the
  // fresh-run default IS the band, by design): stamp the Crossroads met.
  // Rig M walks the band itself on an ungraduated world.
  w.completedObjectives.add('crossroads');
  return w;
};

// ------------------------------------------------ A. RESIDENCE + THE GATE
{
  const base = ZONES[START_ZONE];
  const bare = makeAccount();
  const owned = makeAccount();
  owned.features.add(FEATURE.BOUNTY_BOARD);
  const withoutFix = expandedTown(bare, base).fixtures?.some(f => f.structure === 'bounty_alcove') ?? false;
  const withFix = expandedTown(owned, base).fixtures?.some(f => f.structure === 'bounty_alcove') ?? false;
  check('A: the bounty_alcove fixture folds in exactly with the feature', !withoutFix && withFix);
  const site0 = townSiteAt(0, 'bounty_board');
  check('A: the site sits inside the base town footprint',
    !!site0 && site0.x > 0 && site0.x < base.size.w && site0.y > 0 && site0.y < base.size.h);
  check('A: the bounty_alcove structure resolves (the board pinned to its wall — the N cell)',
    !!STRUCTURES.bounty_alcove
    && (STRUCTURES.bounty_alcove.plan?.some(row => row.includes('N')) ?? false));
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
check('B: every offer is honest (zone stands, kind-law holds, band, pay printed, boardId recorded)',
  wB.bountyOffers.every(p => {
    const z = wB.zoneMap[p.zoneId];
    if (!z || p.boardId !== BOUNTY_BOARD_CFG.boardId) return false;
    const paySet = !!(p.pay.essence?.length || p.pay.unique || p.pay.lot || p.pay.pouch || p.pay.gem || p.pay.craft);
    if (!paySet || (z.objective.kind === 'safe' && p.kind !== 'answer')) return false;
    const band = p.kind === 'charge' ? BOUNTY_BOARD_CFG.charge.band
      : p.kind === 'errand' ? BOUNTY_BOARD_CFG.errand.band
      : p.kind === 'answer' ? BOUNTY_BOARD_CFG.answer.band : BOUNTY_BOARD_CFG.cull.band;
    if (z.level < wB.player.level - band.below || z.level > wB.player.level + band.above) return false;
    if (p.kind === 'charge') {
      return !BOUNTY_BOARD_CFG.charge.refuse.includes(z.objective.kind) && !wB.objectiveDoneAt(p.zoneId);
    }
    if (p.kind === 'errand') return !wB.visited.has(p.zoneId) && (p.face === 'omen' || p.face === 'lift');
    if (p.kind === 'cull') {
      return z.objective.kind !== 'bounty' && !z.harborhold && !z.holdAnchor
        && !!p.cull && p.cull.count > 0 && p.cull.claimed === 0;
    }
    if (p.kind === 'answer') {
      // A dealt answer names a registered source whose census still stands
      // behind it (the bare world's censuses are empty, so an answer here
      // means a live ask truly stood — verify the claim, never assume).
      return !!p.answer && !!BOUNTY_SOURCES[p.answer.source]
        && BOUNTY_SOURCES[p.answer.source].census(wB).some(r => r.key === p.answer!.key);
    }
    if (p.kind === 'gather') {
      return z.spoils !== 'none' && harvestRowsFor(z.biome, z.tileset).length > 0
        && !!p.gather && p.gather.count > 0 && p.gather.claimed === 0;
    }
    if (p.kind === 'summons') {
      // A dealt summons names a summonable source, un-ignited (key empty
      // until the accept's world act).
      return !!p.answer && !!BOUNTY_SOURCES[p.answer.source]?.summons && p.answer.key === '';
    }
    return false;
  }));
check('B: THE DIVERSITY CAP holds (no kind over slate.maxPerKind)',
  Object.values(wB.bountyOffers.reduce((m: Record<string, number>, p) => {
    m[p.kind] = (m[p.kind] ?? 0) + 1;
    return m;
  }, {})).every(n => n <= BOUNTY_BOARD_CFG.slate.maxPerKind));
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
// Rigs C/D speak CHARGE law (veil lift, objective done-read, essence pay):
// walk beats until the slate deals a charge paying essence.
let offer0: BountyPosting | undefined;
for (let b = 0; b < 16 && !offer0; b++) {
  wC.time = b * wC.bountyBeatSeconds();
  wC.armBountyBoard();
  offer0 = wC.bountyOffers.find(p => p.kind === 'charge' && !!p.pay.essence?.length);
}
check('C: a slate with an essence-paying charge to take', !!offer0 && wC.bountyOffers.length >= 2,
  `${wC.bountyOffers.length} offers`);
if (!offer0) throw new Error('no essence charge dealt in 16 beats');
const offer1: BountyPosting | undefined = wC.bountyOffers.find(p => p.id !== offer0!.id);
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

// ------------------------------ G. THE ERRAND (M1: reach the place)
// The spread deals mixed kinds now; walk beats until an errand posts (the
// seeded stream is deterministic, so the loop is bounded and stable).
seedGlobalRandom(0xe44a);
const wG = mkWorld();
let errand: BountyPosting | undefined;
for (let b = 0; b < 12 && !errand; b++) {
  wG.time = b * wG.bountyBeatSeconds();
  wG.armBountyBoard();
  errand = wG.bountyOffers.find(p => p.kind === 'errand' && p.face === 'omen');
}
check('G: the spread deals omen-face errands', !!errand, errand ? `${errand.id}@${errand.zoneId}` : 'none in 12 beats');
if (errand) {
  check('G: an errand targets UNWALKED ground', !wG.visited.has(errand.zoneId));
  const wasVeiled = wG.zoneMap[errand.zoneId].veiled === true;
  check('G: the accept takes it', wG.acceptBounty(errand.id) === true);
  check('G: the omen face lifts NO veil (discovery stays the ask)',
    !wasVeiled || wG.zoneMap[errand.zoneId].veiled === true, wasVeiled ? 'was veiled' : 'target unveiled anyway');
  const omens = wG.bountyOmens();
  check('G: the hand whispers an omen (aging, revealing, accent-colored)',
    omens.length === 1 && omens[0].zoneId === errand.zoneId
    && omens[0].reveal === BOUNTY_BOARD_CFG.omen.reveal
    && omens[0].widenPerMin === BOUNTY_BOARD_CFG.omen.widenPerMin);
  wG.loadZone(errand.zoneId);
  check('G: entry is the deed (done() reads the walk; the hand flips ready)',
    BOUNTY_KINDS.errand.done(wG, errand) === true
    && wG.activeQuests.find(e => e.questId === errand!.id)?.fieldDone === true
    && wG.bountyOmens().length === 0);
  wG.loadZone(START_ZONE);
  parkAtBoard(wG);
  check('G: the errand turns in at the board', wG.turnInBounty(errand.id) === true
    && wG.bountyHands.length === 0);
}

// ------------------------------ H. THE CULL (M1: the writ grammar remote)
seedGlobalRandom(0xc011);
const wH = mkWorld();
let cull: BountyPosting | undefined;
for (let b = 0; b < 12 && !cull; b++) {
  wH.time = b * wH.bountyBeatSeconds();
  wH.armBountyBoard();
  cull = wH.bountyOffers.find(p => p.kind === 'cull');
}
check('H: the spread deals culls', !!cull, cull ? `${cull.id}@${cull.zoneId} ×${cull.cull?.count}` : 'none in 12 beats');
if (cull) {
  const z = wH.zoneMap[cull.zoneId];
  check('H: the mixed-lane guard holds (never writ-objective or harborhold ground)',
    z.objective.kind !== 'bounty' && !z.harborhold && !z.holdAnchor);
  check('H: the accept takes it', wH.acceptBounty(cull.id) === true);
  wH.loadZone(cull.zoneId);
  const marks = wH.actors.filter(a => !a.dead && a.tag === 'bounty_mark');
  check('H: arrival posts the marks (promoted, nemesis-named)',
    marks.length === cull.cull!.count
    && marks.every(m => m.name.length > 0 && (m.rarity ?? 'normal') !== 'normal'),
  `${marks.length}/${cull.cull!.count} marks`);
  for (const m of marks) wH.kill(m, false, wH.player);
  check('H: every claim credits the POSTING (readable from anywhere)',
    cull.cull!.claimed >= cull.cull!.count
    && BOUNTY_KINDS.cull.done(wH, cull) === true
    && wH.activeQuests.find(e => e.questId === cull!.id)?.fieldDone === true);
  wH.loadZone(START_ZONE);
  parkAtBoard(wH);
  check('H: the cull turns in at the board', wH.turnInBounty(cull.id) === true);
}

// ------------------------ I. THE PAY LANES (M1: R2/R3/R4 mint at the pay)
// Hand-crafted hands drive each lane through the REAL turn-in (charge kind
// — done() reads the completion set the rig stamps).
seedGlobalRandom(0x1a4e);
const wI = mkWorld();
const anyZone = Object.values(wI.zoneMap).find(z =>
  z.id !== START_ZONE && !z.boundless && z.objective.kind !== 'safe')!;
const gearDrops = (w: World): { rarity: string; name: string }[] =>
  w.drops.filter(d => d.item.kind === 'gear')
    .map(d => ({ rarity: (d.item as { kind: 'gear'; item: { rarity: string; name: string } }).item.rarity, name: (d.item as { kind: 'gear'; item: { rarity: string; name: string } }).item.name }));
const handCraft = (pay: BountyPosting['pay'], n: number): BountyPosting => {
  const p: BountyPosting = {
    id: `bounty_test_${n}`, kind: 'charge', boardId: 'lastlight',
    zoneId: anyZone.id, beat: 0, pay,
  };
  wI.bountyHands.push(p);
  wI.activeQuests.push({ questId: p.id, zoneId: p.zoneId, fieldDone: true });
  return p;
};
wI.completedObjectives.add(anyZone.id);
parkAtBoard(wI);
{
  const uniques = bountyUniquePool(anyZone.level);
  const uid = uniques[0]?.id;
  check('I: a named-unique pool stands at low level', !!uid, uid ?? 'empty');
  if (uid) {
    const p = handCraft({ unique: { id: uid } }, 1);
    const before = gearDrops(wI).length;
    check('I: the NAMED unique pays as itself, owed',
      wI.turnInBounty(p.id) === true
      && gearDrops(wI).length === before + 1
      && gearDrops(wI).slice(-1)[0].rarity === 'unique');
  }
  const cats = bountyUniqueCategories(anyZone.level);
  if (cats.length) {
    const p = handCraft({ unique: { category: cats[0] } }, 2);
    const before = gearDrops(wI).length;
    check('I: the CATEGORY unique pays a unique of that shape ("a unique ring")',
      wI.turnInBounty(p.id) === true && gearDrops(wI).length === before + 1
      && gearDrops(wI).slice(-1)[0].rarity === 'unique');
  }
  const p3 = handCraft({ lot: { count: 3, category: 'boots' } }, 3);
  const before3 = gearDrops(wI).length;
  check('I: the LOT pays its counted assortment',
    wI.turnInBounty(p3.id) === true && gearDrops(wI).length === before3 + 3);
  const anyGem = 'firebolt'; // any registered skill: pay resolves via SKILLS[id]
  const p4 = handCraft({ gem: { id: anyGem } }, 4);
  const gemKeyBefore = wI.account.ledger[`gemdrop:${anyGem}`] ?? 0;
  check('I: the GEM face mints the named Memory + stamps THE MINT LAW',
    wI.turnInBounty(p4.id) === true
    && (wI.account.ledger[`gemdrop:${anyGem}`] ?? 0) === gemKeyBefore + 1);
  const p5 = handCraft({ pouch: { kind: 'rough', count: 4 } }, 5);
  const pouchUnitsBefore = wI.localSeat.meta.items
    .filter(it => it.baseId === 'rough_memory')
    .reduce((s, it) => s + (it.mem?.length ?? 0), 0);
  check('I: the POUCH pays its units (merged or spilled owed)',
    wI.turnInBounty(p5.id) === true
    && (wI.localSeat.meta.items.filter(it => it.baseId === 'rough_memory')
      .reduce((s, it) => s + (it.mem?.length ?? 0), 0) === pouchUnitsBefore + 4
      || wI.drops.some(d => d.item.kind === 'gear'
        && (d.item as { kind: 'gear'; item: { baseId: string } }).item.baseId === 'rough_memory')));
  check('I: describe speaks every lane in the precision register',
    describeBountyPay({ lot: { count: 3, category: 'boots' } }).includes('3')
    && describeBountyPay({ pouch: { kind: 'rough', count: 4 } }).includes('4 Rough Memory')
    && describeBountyPay({ unique: { category: 'ring' } }) === 'a unique ring');
}

// ---------------- J. THE SOURCE REGISTRY + K4 THE ANSWER (M2: the census)
// A probe-registered source row drives the REAL loop end to end — the open
// registry is the law (extensibility is the truth), and the probe's own row
// exercises exactly what a package's row rides. Registered HERE (after the
// earlier rigs ran) so their seeded draws stay untouched.
seedGlobalRandom(0xa45e);
const wJ = mkWorld();
const censusJ: BountyTargetRef[] = [];
registerBountySource({
  id: 'probe_source',
  census: () => [...censusJ],
});
{
  // A standing, banded target for the census (the board's own country).
  const cfgJ = BOUNTY_BOARD_CFG.answer.band;
  const tz = Object.values(wJ.zoneMap).find(z =>
    z.id !== START_ZONE && !z.boundless
    && z.level >= wJ.player.level - cfgJ.below && z.level <= wJ.player.level + cfgJ.above)!;
  censusJ.push({
    key: 't1', zoneId: tz.id, name: 'the Probe Sovereign',
    title: 'The Decree: the Probe Sovereign',
    ask: 'Put the probe sovereign down where it stands.',
    ledger: 'probe_resolved',
  });
  let ans: BountyPosting | undefined;
  for (let b = 0; b < 12 && !ans; b++) {
    wJ.time = b * wJ.bountyBeatSeconds();
    wJ.armBountyBoard();
    ans = wJ.bountyOffers.find(p => p.kind === 'answer' && p.answer?.source === 'probe_source');
  }
  check('J: the registry feeds the arm (an answer posting deals off the census)',
    !!ans, ans ? `${ans.id}@${ans.zoneId}` : 'none in 12 beats');
  if (!ans) throw new Error('no answer posting dealt in 12 beats');
  check('J: the posting carries the claim (source, key, copy, the arm baseline)',
    ans.zoneId === tz.id && ans.answer!.key === 't1' && ans.answer!.base === 0
    && ans.answer!.ledger === 'probe_resolved' && ans.answer!.name === 'the Probe Sovereign');
  check('J: the card speaks the census\'s own register (title override live)',
    BOUNTY_KINDS.answer.copy(wJ, ans).title === 'The Decree: the Probe Sovereign'
    && BOUNTY_KINDS.answer.copy(wJ, ans).ask.includes('probe sovereign'));
  check('J: the accept takes the hand', wJ.acceptBounty(ans.id) === true
    && wJ.activeQuests.some(e => e.questId === ans!.id));
  check('J: THE DELTA LAW — unresolved reads unresolved', BOUNTY_KINDS.answer.done(wJ, ans) === false);
  wJ.ledger.probe_resolved = (wJ.ledger.probe_resolved ?? 0) + 1;
  check('J: THE DELTA LAW — a bump past the baseline reads resolved',
    BOUNTY_KINDS.answer.done(wJ, ans) === true);
  const aqJ = wJ.activeQuests.find(e => e.questId === ans!.id)!;
  check('J: the hand is not yet flipped (the watch has not swept)', aqJ.fieldDone !== true);
  for (let i = 0; i < 80; i++) wJ.update(1 / 30);
  check('J: THE FIELD WATCH flips the hand ready ANYWHERE (no zone hook fired)',
    aqJ.fieldDone === true);
  parkAtBoard(wJ);
  const stampJ = wJ.ledger[bountyDoneKindKey('answer')] ?? 0;
  check('J: the turn-in pays and stamps the kind', wJ.turnInBounty(ans.id) === true
    && wJ.bountyHands.length === 0
    && (wJ.ledger[bountyDoneKindKey('answer')] ?? 0) === stampJ + 1);
  // THE FIELD ANNUL: a second ask departs unresolved while in hand — the
  // watch frees it in the field with the courtesy, no board visit.
  censusJ.push({
    key: 't2', zoneId: tz.id, name: 'the Departing Guest',
    ask: 'Answer the departing guest.', ledger: 'probe_resolved',
  });
  let ans2: BountyPosting | undefined;
  for (let b = 13; b < 26 && !ans2; b++) {
    wJ.time = b * wJ.bountyBeatSeconds();
    wJ.armBountyBoard();
    ans2 = wJ.bountyOffers.find(p => p.kind === 'answer' && p.answer?.key === 't2');
  }
  check('J: a second ask deals', !!ans2, ans2 ? ans2.id : 'none in 13 beats');
  if (ans2) {
    check('J: taken in hand', wJ.acceptBounty(ans2.id) === true);
    censusJ.length = 0; // the guest departs, unresolved
    for (let i = 0; i < 80; i++) wJ.update(1 / 30);
    check('J: THE FIELD ANNUL frees the hand where it stands (courtesy, no penalty)',
      wJ.bountyHands.length === 0 && !wJ.activeQuests.some(e => e.questId === ans2!.id));
  }
  // THE STRIKE: an offer whose ask resolves before it is taken leaves the
  // slate at the arm's reconcile (done work is never advertised).
  censusJ.push({
    key: 't3', zoneId: tz.id, name: 'the Already-Answered',
    ask: 'Answer what another hand already answered.', ledger: 'probe_resolved',
  });
  let ans3: BountyPosting | undefined;
  for (let b = 27; b < 40 && !ans3; b++) {
    wJ.time = b * wJ.bountyBeatSeconds();
    wJ.armBountyBoard();
    ans3 = wJ.bountyOffers.find(p => p.kind === 'answer' && p.answer?.key === 't3');
  }
  check('J: a third ask deals as an offer', !!ans3, ans3 ? ans3.id : 'none in 13 beats');
  if (ans3) {
    wJ.ledger.probe_resolved = (wJ.ledger.probe_resolved ?? 0) + 1; // resolved by "another hand"
    wJ.armBountyBoard(); // same beat: the reconcile at the head strikes it
    check('J: THE STRIKE — a resolved-before-taken offer leaves the slate',
      !wJ.bountyOffers.some(p => p.id === ans3!.id));
  }
  censusJ.length = 0;
}

// ------------------- K. THE LIVE LANES + THE MUSTER's fail read (M2)
seedGlobalRandom(0xbead);
const wK = mkWorld();
{
  const rows = bountySourceRows().map(r => r.id);
  check('K: the four live lanes are registered (the compounding law)',
    ['fractures', 'harborhold', 'hunt', 'worldboss'].every(id => !!BOUNTY_SOURCES[id]));
  check('K: rows read in registration-independent order (sorted by id)',
    rows.join(',') === [...rows].sort().join(','));
  check('K: every census runs clean on a bare world',
    bountySourceRows().every(r => Array.isArray(r.census(wK))));
  // The harborhold deep walk: a minted siege joins the census the moment it
  // is FOUND, resolves on the muster's own standing state, and FAILS —
  // never annuls — on the fall (walk-1's fail ruling, the board's
  // acknowledgment with no pay).
  const zH = Object.values(wK.zoneMap).find(z => z.id !== START_ZONE && !z.boundless)!;
  zH.harborhold = mintHoldState(Object.values(HOLD_CLASSES)[0]);
  zH.veiled = false;
  const holdRow = BOUNTY_SOURCES.harborhold;
  check('K: a found, besieged hold stands in the muster census',
    holdRow.census(wK).some(r => r.key === `hold:${zH.id}` && r.zoneId === zH.id));
  zH.veiled = true;
  check('K: a veiled siege stays off the slate (not the board\'s to tell)',
    !holdRow.census(wK).some(r => r.key === `hold:${zH.id}`));
  zH.veiled = false;
  const pH: BountyPosting = {
    id: 'bounty_test_hold', kind: 'answer', boardId: 'lastlight',
    zoneId: zH.id, beat: 0, pay: { essence: [{ essence: 'coarse', count: 4 }] },
    answer: { source: 'harborhold', key: `hold:${zH.id}`, name: zH.name, ask: 'Break the siege.', base: 0 },
  };
  wK.bountyHands.push(pH);
  wK.activeQuests.push({ questId: pH.id, zoneId: pH.zoneId, fieldDone: false });
  check('K: besieged = the ask stands (not done, not annulled)',
    BOUNTY_KINDS.answer.done(wK, pH) === false && (BOUNTY_KINDS.answer.annulled?.(wK, pH) ?? null) === null);
  zH.harborhold.state = 'open';
  check('K: the muster broken through reads RESOLVED (the standing-state law)',
    BOUNTY_KINDS.answer.done(wK, pH) === true);
  zH.harborhold.state = 'fallen';
  check('K: the fall reads FAILED — and never annuls, though the census is gone',
    BOUNTY_KINDS.answer.done(wK, pH) === false
    && (BOUNTY_KINDS.answer.failed?.(wK, pH) ?? false) === true
    && (BOUNTY_KINDS.answer.annulled?.(wK, pH) ?? null) === null);
  parkAtBoard(wK);
  const failsK = wK.ledger.bounties_failed ?? 0;
  const dropsK = wK.drops.length;
  check('K: the failed muster resolves at the board — acknowledged, no pay',
    wK.turnInBounty(pH.id) === true && wK.bountyHands.length === 0
    && wK.drops.length === dropsK && (wK.ledger.bounties_failed ?? 0) === failsK + 1);
  // The sanitizer's answer branch (keep-what-stands).
  const goodAnswer = {
    id: 'a1', kind: 'answer', boardId: 'lastlight', zoneId: zH.id, beat: 0,
    pay: { essence: [{ essence: 'coarse', count: 2 }] },
    answer: { source: 'harborhold', key: `hold:${zH.id}`, name: zH.name, ask: 'x', title: 'The Muster', ledger: 'l', base: 3 },
  };
  const saneK = sanitizeBountyBoard({
    armedBeat: 0,
    offers: [
      goodAnswer,
      { ...goodAnswer, id: 'a2', answer: { ...goodAnswer.answer, source: 'no_such_source' } },
      { ...goodAnswer, id: 'a3', answer: undefined },
    ],
  }, wK.zoneMap);
  check('K: the sanitizer keeps the sound claim and drops the unsound whole',
    !!saneK && saneK.offers.length === 1 && saneK.offers[0].id === 'a1'
    && saneK.offers[0].answer?.title === 'The Muster' && saneK.offers[0].answer?.base === 3);
}

// ------------- L. THE FIRST WRIT W0 — the open door + the lessons' reads
// (docs/design/bounty-first-writ.md §§1-3, her walk: the board is the
// account's FIRST door at cost zero; both lessons live on standing
// ownership/ledger facts — no new completion keys.)
{
  const row = allUnlockables().find(u => u.id === 'feat_bounty_board');
  check('L: the first door costs nothing and stands ungated',
    !!row && row.cost === 0 && row.tease !== true && !row.reqAnyOf && !row.reqLedger && !row.requiresUnlock);
  check('L: the row seats at the catalog HEAD', allUnlockables()[0]?.id === 'feat_bounty_board');
  const bare = makeAccount();
  check('L: a bare account\'s first Vault visit offers it FIRST',
    availableUnlocks(bare)[0]?.id === 'feat_bounty_board');
  check('L: an empty purse claims it outright (the zero-cost settle path)',
    bare.credits === 0 && row !== undefined && applyUnlock(bare, row) === true
    && featureEnabled(bare, FEATURE.BOUNTY_BOARD));
  // THE BOARD LESSON: live exactly while the account has never accepted —
  // the M0 accept stamp closes it forever, run or account, no new key.
  seedGlobalRandom(0x1e550);
  const wL = mkWorld();
  check('L: the board lesson reads live on a never-accepted account',
    wL.bountyLessonLive() === true);
  wL.armBountyBoard();
  const lOffer = wL.bountyOffers[0];
  check('L: the first accept closes the lesson (the standing stamp)',
    !!lOffer && wL.acceptBounty(lOffer.id) === true && wL.bountyLessonLive() === false);
  const wL2 = mkWorld();
  wL2.account.ledger.bounties_accepted = 1; // a graduated account, fresh run
  check('L: a graduated account never re-opens it', wL2.bountyLessonLive() === false);
}

// ------------- M. THE STARTER BAND (W1 — the young board's small hand;
// docs/design/bounty-first-writ.md §4, walk cards 1+2 coupled: per run
// while the Crossroads stands uncleared, essence-only; every seat pinned
// while the account is YOUNG, one perpetual anchor writ after; the band
// EXPIRES structurally when the Crossroads falls.)
seedGlobalRandom(0xba4d);
{
  const S = BOUNTY_BOARD_CFG.starter;
  const wM = makeSimWorld('warrior', SEED ^ 0xb1);
  openBoard(wM);
  wM.loadZone('crossroads');
  wM.loadZone(START_ZONE);
  check('M: a fresh run reads the starter band live (the crossroads stands)',
    liveBountyBand(wM)?.id === 'starter');
  wM.player.level = 15; // the pin must bypass the level band — the ground is named on purpose
  wM.armBountyBoard();
  check('M: the young slate deals small',
    wM.bountyOffers.length > 0 && wM.bountyOffers.length <= S.offers,
  `${wM.bountyOffers.length}/${S.offers}`);
  check('M: YOUNG — every seat pins the anchor, one kind each (distinct faces)',
    wM.bountyOffers.every(p => p.zoneId === S.anchorZone)
    && new Set(wM.bountyOffers.map(p => p.kind)).size === wM.bountyOffers.length);
  check('M: the young slate pays ONLY essence',
    wM.bountyOffers.every(p => !!p.pay.essence?.length
      && !p.pay.unique && !p.pay.lot && !p.pay.pouch && !p.pay.gem));
  check('M: decrees and errands stay off the young slate (band kind weights)',
    wM.bountyOffers.every(p => p.kind === 'charge' || p.kind === 'cull' || p.kind === 'gather'));
  // MATURE: the turned-in threshold met → ONE perpetual anchor writ, the
  // remainder near-ground ("so that it isn't the only option available").
  wM.account.ledger[S.youngLedger] = S.youngBelow;
  wM.time += wM.bountyBeatSeconds();
  wM.armBountyBoard();
  const anchored = wM.bountyOffers.filter(p => p.zoneId === S.anchorZone);
  check('M: MATURE — exactly one perpetual anchor writ', anchored.length === 1,
    `${anchored.length} of ${wM.bountyOffers.length} on ${S.anchorZone}`);
  check('M: the mature band still pays only essence',
    wM.bountyOffers.every(p => !!p.pay.essence?.length));
  // THE STRUCTURAL HANDOFF: the Crossroads cleared → the band expires and
  // the full grammar returns on the next turned beat.
  wM.completedObjectives.add('crossroads');
  check('M: the cleared crossroads expires the band', liveBountyBand(wM) === null);
  wM.time += wM.bountyBeatSeconds();
  wM.armBountyBoard();
  check('M: the full grammar returns (standing offer cap, no anchor law)',
    wM.bountyOffers.length > 0 && wM.bountyOffers.length <= BOUNTY_BOARD_CFG.offers);
}

// ------------- N. THE GATHER (first-writ W2 — the remote-writ law on the
// harvest fabric: the writ plants what the ground lacks, a settled rite
// credits the posting at the chokepoint, and the hand turns in.)
seedGlobalRandom(0x6a7e);
{
  check('N: the gather kind is registered', !!BOUNTY_KINDS.gather);
  const wN = mkWorld();
  interface NInt {
    manifest: { seed: number };
    harvestNodes: { pos: { x: number; y: number }; spent: boolean }[];
    actors: { team: string; dead: boolean; skills: unknown[]; pos: { x: number; y: number } }[];
  }
  const WN = wN as unknown as NInt;
  const fit = Object.values(wN.zoneMap).find(z => z.id !== START_ZONE && !z.boundless
    && z.objective.kind !== 'safe' && z.spoils !== 'none'
    && harvestRowsFor(z.biome, z.tileset).length > 0);
  check('N: charted country holds gatherable ground (the fabric\'s own fit)',
    !!fit, fit ? `${fit.id} (${fit.tileset ?? fit.biome})` : 'none charted');
  if (fit) {
    const pN: BountyPosting = {
      id: 'bounty_test_gather', kind: 'gather', boardId: 'lastlight',
      zoneId: fit.id, beat: 0, pay: { essence: [{ essence: 'coarse', count: 3 }] },
      gather: { count: 2, claimed: 0 },
    };
    wN.bountyHands.push(pN);
    wN.activeQuests.push({ questId: pN.id, zoneId: pN.zoneId, fieldDone: false });
    wN.loadZone(fit.id);
    const live = (): number => WN.harvestNodes.filter(n => !n.spent).length;
    check('N: arrival plants the writ\'s remainder (the remote-writ law)',
      live() >= pN.gather!.count, `${live()} live nodes for ${pN.gather!.count}`);
    // ONE real rite settles the last claim: prime the ledger to count−1,
    // then drive the standing machinery whole (probe_harvest's recipe —
    // stand calm, take the consent, enter the seeded sequence).
    pN.gather!.claimed = pN.gather!.count - 1;
    const node = WN.harvestNodes.find(n => !n.spent)!;
    const banish = (): void => {
      for (const a of WN.actors) {
        if (a.team === 'enemy' && !a.dead && a.skills.some(s => s)) { a.pos.x = 60; a.pos.y = 60; }
      }
    };
    wN.player.pos.x = node.pos.x + 20;
    wN.player.pos.y = node.pos.y;
    for (let i = 0; i < 45; i++) { banish(); wN.update(0.1); }
    if (HARVEST_CFG.consent === 'press') wN.applyAction(wN.localSeat, { t: 'pickupItem' });
    const seq = harvestSeqFor(WN.manifest.seed, fit.id, node.pos, fit.level);
    const press = (slot: number): void => {
      const held = Array(8).fill(false) as boolean[];
      const edge = Array(8).fill(false) as boolean[];
      held[slot] = true; edge[slot] = true;
      wN.applyInputs(new Map([['p0', { dx: 0, dy: 0, aim: { x: wN.player.pos.x + 40, y: wN.player.pos.y }, held, edge }]]), 0.05);
    };
    for (const s of seq) press(s);
    check('N: the settled rite credits the POSTING at the chokepoint',
      pN.gather!.claimed === pN.gather!.count
      && BOUNTY_KINDS.gather.done(wN, pN) === true
      && wN.activeQuests.find(e => e.questId === pN.id)?.fieldDone === true);
    wN.loadZone(START_ZONE);
    parkAtBoard(wN);
    check('N: the gather turns in at the board', wN.turnInBounty(pN.id) === true
      && wN.bountyHands.length === 0);
  }
}

// ------------- O. THE SUMMONS (M3 K5 — "the board plants the ask": the
// ignite verb promoted into the source rows, the cap + refusal laws, the
// world act at the accept, and the REAL fracture debut end to end.)
seedGlobalRandom(0x50a0);
{
  check('O: the fractures source wears the summons face (fractures-first, her roster ruling)',
    !!BOUNTY_SOURCES.fractures?.summons
    && BOUNTY_SOURCES.fractures.summons!.ledger === 'fractures_sealed');
  const wO = mkWorld();
  let room = true;
  let igniteOk = true;
  let ignitedAt: string | null = null;
  const censusO: BountyTargetRef[] = [];
  registerBountySource({
    id: 'probe_summonable',
    census: () => [...censusO],
    summons: {
      name: 'the probe storm',
      ask: (z, l) => `Call the probe storm down on ${z} (level ${l}).`,
      ledger: 'probe_storms_stilled',
      headroom: () => room,
      ignite: (_w, zoneId) => {
        if (!room || !igniteOk) return false;
        ignitedAt = zoneId;
        room = false; // the package's one-at-a-time breath
        censusO.push({
          key: `storm:${zoneId}`, zoneId, name: 'the probe storm',
          ask: 'Still the storm where it rages.', ledger: 'probe_storms_stilled',
        });
        return true;
      },
    },
  });
  const dealSummons = (from: number): BountyPosting | undefined => {
    for (let b = from; b < from + 14; b++) {
      wO.time = b * wO.bountyBeatSeconds();
      wO.armBountyBoard();
      const p = wO.bountyOffers.find(o => o.kind === 'summons' && o.answer?.source === 'probe_summonable');
      if (p) return p;
    }
    return undefined;
  };
  const sm = dealSummons(0);
  check('O: the slate deals a summons off the summonable roster', !!sm,
    sm ? `${sm.id}@${sm.zoneId}` : 'none in 14 beats');
  if (!sm) throw new Error('no summons dealt');
  check('O: pre-accept it is never done and never census-annulled (nothing is born yet)',
    BOUNTY_KINDS.summons.done(wO, sm) === false
    && (BOUNTY_KINDS.summons.annulled?.(wO, sm) ?? null) === null);
  // THE ROOM-FILLED STRIKE: headroom gone while the offer stands (an
  // ambient instance took the package's breath) → struck at the reconcile.
  room = false;
  wO.armBountyBoard();
  check('O: a room-filled offer is struck at the reconcile',
    !wO.bountyOffers.some(p => p.id === sm.id));
  // THE ACCEPT REFUSAL: the ignite itself fails at the take → struck with
  // the courtesy, no hand seated (the stale-offer race law).
  room = true;
  const smR = dealSummons(20);
  check('O: a fresh summons deals for the refusal rig', !!smR);
  if (smR) {
    igniteOk = false;
    check('O: a failed ignite REFUSES the take and strikes the posting',
      wO.acceptBounty(smR.id) === false
      && !wO.bountyOffers.some(p => p.id === smR.id)
      && wO.bountyHands.length === 0);
    igniteOk = true;
  }
  // THE IGNITION: the world act fires at the accept — the born key is
  // captured and the resolution ledger baselines AT the accept (only
  // seals the summons could have caused count).
  const sm2 = dealSummons(40);
  check('O: a summons deals for the ignition rig', !!sm2);
  if (!sm2) throw new Error('no summons for the ignition rig');
  wO.ledger.probe_storms_stilled = 5;
  check('O: the accept IGNITES — born key captured, baseline stamped at the take',
    wO.acceptBounty(sm2.id) === true
    && ignitedAt === sm2.zoneId
    && sm2.answer!.key === `storm:${sm2.zoneId}`
    && sm2.answer!.base === 5);
  wO.time = 60 * wO.bountyBeatSeconds();
  wO.armBountyBoard();
  check('O: THE CAP — a standing summoned hand blocks another for its source',
    !wO.bountyOffers.some(p => p.kind === 'summons' && p.answer?.source === 'probe_summonable'));
  check('O: unresolved reads unresolved past the old count', BOUNTY_KINDS.summons.done(wO, sm2) === false);
  wO.ledger.probe_storms_stilled = 6;
  check('O: the delta law resolves the summons', BOUNTY_KINDS.summons.done(wO, sm2) === true);
  parkAtBoard(wO);
  check('O: the summons turns in at the board', wO.turnInBounty(sm2.id) === true
    && wO.bountyHands.length === 0);
  // THE FIELD ANNUL: a summoned instance that leaves unresolved frees the
  // hand where it stands (the K4 law verbatim on the born key).
  room = true; censusO.length = 0;
  const sm3 = dealSummons(70);
  check('O: a summons deals for the annul rig', !!sm3);
  if (sm3) {
    check('O: taken and ignited (the storm stands in the census)',
      wO.acceptBounty(sm3.id) === true && censusO.length === 1);
    censusO.length = 0; // the storm passes, unresolved
    for (let i = 0; i < 80; i++) wO.update(1 / 30);
    check('O: THE FIELD ANNUL frees the summoned hand (courtesy, no penalty)',
      !wO.bountyHands.some(h => h.id === sm3.id));
  }
}

// --------- O2. THE FRACTURE DEBUT (M3 — the real package, end to end)
seedGlobalRandom(0xf4ac);
{
  resetActorIdCounter();
  const account = makeAccount();
  account.features.add(FEATURE.BOUNTY_BOARD);
  const manifest = buildManifest(account, 0xf4ac);
  for (const p of manifest.packages) p.enabled = p.id === 'fractures';
  const wF = new World(account, Object.freeze(manifest));
  wF.createPlayer(classById('warrior'));
  wF.loadZone('crossroads');
  wF.loadZone(START_ZONE);
  wF.completedObjectives.add('crossroads'); // past the starter band
  check('O2: a fractures-enabled run reads room to breathe',
    BOUNTY_SOURCES.fractures.summons!.headroom(wF) === true);
  let fsm: BountyPosting | undefined;
  for (let b = 0; b < 20 && !fsm; b++) {
    wF.time = b * wF.bountyBeatSeconds();
    wF.armBountyBoard();
    fsm = wF.bountyOffers.find(o => o.kind === 'summons' && o.answer?.source === 'fractures');
  }
  check('O2: the board deals the fracture summons', !!fsm,
    fsm ? `${fsm.id}@${fsm.zoneId}` : 'none in 20 beats');
  if (fsm) {
    const ff = wF.sim.fractureField!;
    check('O2: THE DEBUT — the accept tears the earth open at the posted zone',
      wF.acceptBounty(fsm.id) === true
      && ff.peek()?.zoneId === fsm.zoneId
      && fsm.answer!.key === `fracture:${ff.peek()!.id}`);
    check('O2: the born fracture is the package\'s own (census + fractureIn agree — transience by construction)',
      BOUNTY_SOURCES.fractures.census(wF).some(r => r.key === fsm!.answer!.key)
      && !!ff.fractureIn(fsm.zoneId));
    check('O2: headroom now reads full (one at a time, the field\'s own law)',
      BOUNTY_SOURCES.fractures.summons!.headroom(wF) === false);
    wF.ledger.fractures_sealed = (wF.ledger.fractures_sealed ?? 0) + 1;
    check('O2: the seal resolves the summons (the delta law)',
      BOUNTY_KINDS.summons.done(wF, fsm) === true);
    wF.player.pos.x = wF.townSeat('bounty_board').x;
    wF.player.pos.y = wF.townSeat('bounty_board').y;
    check('O2: the summons turns in at the board', wF.turnInBounty(fsm.id) === true);
  }
}

// ------------- P. THE GROWTH RUNGS + THE CHEVRON PATRON (M4 — polish)
seedGlobalRandom(0x9401);
{
  const G = BOUNTY_BOARD_CFG.growth;
  // The derived catalog rows: chained, first rung gated on the first
  // bounty ever turned in (the broader-wares doctrine).
  const b1 = allUnlockables().find(u => u.id === 'feat_bounty_broader_1');
  const b2 = allUnlockables().find(u => u.id === 'feat_bounty_broader_2');
  const f1 = allUnlockables().find(u => u.id === 'feat_bounty_farther_1');
  check('P: the growth rows derive from the ladders (chained, deed-gated)',
    !!b1 && !!b2 && !!f1
    && b1.requiresUnlock === 'feat_bounty_board' && b1.reqLedger === 'bounty_done'
    && b2.requiresUnlock === 'feat_bounty_broader_1'
    && b1.cost === G.broader[0].cost && f1.cost === G.farther[0].cost);
  // THE FOLDS: reach multiplies per owned rung; broader widens the cap.
  const wP = mkWorld();
  check('P: an unrung board reads standing reach', wP.bountyReach() === 1);
  for (const r of G.farther) wP.account.features.add(r.flag);
  const wantReach = G.farther.reduce((m, r) => m * r.mul, 1);
  check('P: owned reach rungs multiply the writs\' range', Math.abs(wP.bountyReach() - wantReach) < 1e-9,
    `${wP.bountyReach()} vs ${wantReach}`);
  for (const r of G.broader) wP.account.features.add(r.flag);
  // Seat-search misses can run any ONE beat short (M0's standing law —
  // "the slate runs short"), and a LEVEL-1 hero's band admits only the
  // first two or three zones of the halo (the young country is honestly
  // small — a diagnosed truth, not a defect): open the band the
  // structural way, then walk beats until a slate overflows the old cap.
  wP.player.level = 8;
  const wideCap = BOUNTY_BOARD_CFG.offers + G.broader.reduce((s, r) => s + r.add, 0);
  let widest = 0;
  for (let b = 0; b < 12 && widest <= BOUNTY_BOARD_CFG.offers; b++) {
    wP.time = b * wP.bountyBeatSeconds();
    wP.armBountyBoard();
    widest = Math.max(widest, wP.bountyOffers.length);
  }
  check('P: THE BROADER fold widens the slate past the old cap',
    widest > BOUNTY_BOARD_CFG.offers && widest <= wideCap,
    `widest ${widest} of ${wideCap}`);
  // The young law outranks BROADER: a banded run stays small, rungs owned
  // or not.
  const wPy = makeSimWorld('warrior', SEED ^ 0x9401);
  openBoard(wPy);
  for (const r of G.broader) wPy.account.features.add(r.flag);
  wPy.loadZone('crossroads');
  wPy.loadZone(START_ZONE);
  wPy.armBountyBoard();
  check('P: the starter band outranks BROADER (young boards stay small by law)',
    liveBountyBand(wPy)?.id === 'starter'
    && wPy.bountyOffers.length <= BOUNTY_BOARD_CFG.starter.offers);
  // THE CHEVRON PATRON: a held gather's unspent nodes point in the board's
  // accent; claimed work quiets them.
  const fitP = Object.values(wP.zoneMap).find(z => z.id !== START_ZONE && !z.boundless
    && z.objective.kind !== 'safe' && z.spoils !== 'none'
    && harvestRowsFor(z.biome, z.tileset).length > 0);
  check('P: gatherable ground stands for the chevron rig', !!fitP, fitP?.id ?? 'none');
  if (fitP) {
    const pP: BountyPosting = {
      id: 'bounty_test_chev', kind: 'gather', boardId: 'lastlight',
      zoneId: fitP.id, beat: 0, pay: { essence: [{ essence: 'coarse', count: 2 }] },
      gather: { count: 2, claimed: 0 },
    };
    wP.bountyHands.push(pP);
    wP.activeQuests.push({ questId: pP.id, zoneId: pP.zoneId, fieldDone: false });
    wP.loadZone(fitP.id);
    const pts = wP.bountyAttention();
    check('P: the patron points at every unspent node, in the board\'s accent',
      pts.length >= pP.gather!.count
      && pts.every(a => a.color === BOUNTY_BOARD_CFG.accent && a.glyph === BOUNTY_BOARD_CFG.chevron.glyph));
    pP.gather!.claimed = pP.gather!.count;
    check('P: the met ask quiets the chevrons', wP.bountyAttention().length === 0);
  }
}

// ---- Q. THE TURN-IN REFRESH + THE POSTING PIN (her adjustments, 08-26)
seedGlobalRandom(0x4e5e);
{
  const wQ = mkWorld();
  wQ.player.level = 8; // open the band — full slates for the churn rigs
  wQ.armBountyBoard();
  const ids = (): string => wQ.bountyOffers.map(p => p.id).join('|');
  const slate0 = ids();
  // A resolved hand re-deals NOW — no beat turned, fresh ids (the
  // slate-key law: a same-beat refresh can never re-mint a standing id).
  const zQ = Object.values(wQ.zoneMap).find(z =>
    z.id !== START_ZONE && !z.boundless && z.objective.kind !== 'safe')!;
  const mkHand = (n: number): BountyPosting => {
    const p: BountyPosting = {
      id: `bounty_test_rq${n}`, kind: 'charge', boardId: 'lastlight',
      zoneId: zQ.id, beat: 0, pay: { essence: [{ essence: 'coarse', count: 2 }] },
    };
    wQ.bountyHands.push(p);
    wQ.activeQuests.push({ questId: p.id, zoneId: p.zoneId, fieldDone: true });
    return p;
  };
  wQ.completedObjectives.add(zQ.id);
  parkAtBoard(wQ);
  const t0 = wQ.time;
  const h1 = mkHand(1);
  check('Q: the turn-in re-deals the slate NOW (no beat turned, fresh ids)',
    wQ.turnInBounty(h1.id) === true && wQ.time === t0
    && ids() !== slate0 && wQ.bountyOffers.length > 0
    && wQ.bountyOffers.every(p => !slate0.includes(p.id)));
  const slate1 = ids();
  // The refresh is foreordained: the persisted seq rides the save.
  const wsQ = wQ.serializeWorldState();
  check('Q: the refresh seq persists (the foreordained re-deal)',
    wsQ.bountyBoard?.refreshSeq === 1);
  // An ABANDON never refreshes (no deal-fishing): accept then abandon —
  // no new ids appear.
  const acc = wQ.bountyOffers[0];
  check('Q: accept + abandon leaves the slate alone (no deal-fishing)',
    wQ.acceptBounty(acc.id) === true && wQ.abandonBounty(acc.id) === true
    && ids() === slate1.split('|').filter(x => x !== acc.id).join('|'));
  // THE POSTING PIN: refused at zero capacity, held through re-deals with
  // a rung owned, released on the toggle, struck by the world regardless.
  check('Q: the pin refuses at zero capacity (the Vault sells the service)',
    wQ.bountyLockCapacity() === 0 && wQ.setBountyLock(wQ.bountyOffers[0].id, true) === false);
  wQ.account.features.add(BOUNTY_BOARD_CFG.lock.ladder[0].flag);
  const pinTarget = wQ.bountyOffers[0];
  check('Q: one rung = one pin; the second lock is refused',
    wQ.bountyLockCapacity() === 1
    && wQ.setBountyLock(pinTarget.id, true) === true
    && (wQ.bountyOffers.length < 2 || wQ.setBountyLock(wQ.bountyOffers[1].id, true) === false));
  wQ.time += wQ.bountyBeatSeconds();
  wQ.armBountyBoard();
  check('Q: the pinned posting rides the beat\'s re-deal (the vendor-hold law)',
    wQ.bountyOffers.some(p => p.id === pinTarget.id && p.locked === true)
    && wQ.bountyOffers.length > 1);
  const h2 = mkHand(2);
  check('Q: the pinned posting rides the turn-in refresh too',
    wQ.turnInBounty(h2.id) === true
    && wQ.bountyOffers.some(p => p.id === pinTarget.id));
  check('Q: the release frees the pin', wQ.setBountyLock(pinTarget.id, false) === true
    && wQ.bountyOffers.find(p => p.id === pinTarget.id)?.locked === undefined);
  // The pin holds a SEAT, never the truth: a pinned charge whose work is
  // already done is struck by the reconcile like any other.
  const deadPin = wQ.bountyOffers.find(p => p.kind === 'charge');
  if (deadPin) {
    wQ.setBountyLock(deadPin.id, true);
    wQ.completedObjectives.add(deadPin.zoneId);
    wQ.armBountyBoard(); // same beat — the reconcile at the head
    check('Q: a dead pinned ask is struck regardless (the seat, never the truth)',
      !wQ.bountyOffers.some(p => p.id === deadPin.id));
  }
  // The catalog rows: chained + deed-gated (the Reserved Wares kinship).
  const l1 = allUnlockables().find(u => u.id === 'feat_bounty_lock_1');
  const l2 = allUnlockables().find(u => u.id === 'feat_bounty_lock_2');
  check('Q: the Reserved Postings rows derive from the ladder',
    !!l1 && !!l2 && l1.requiresUnlock === 'feat_bounty_board'
    && l1.reqLedger === 'bounty_done' && l2.requiresUnlock === 'feat_bounty_lock_1'
    && l1.cost === BOUNTY_BOARD_CFG.lock.ladder[0].cost);
}

// ------------- R. THE KINSHIP (walk 2, her rulings — regional boards on
// the shared registry: harbors first, ALWAYS-localized slates, one hand
// per board, one shared beat; the turn-in refresh scoped to its board.)
seedGlobalRandom(0x4145);
{
  const wR = mkWorld();
  wR.player.level = 8;
  check('R: a bare run\'s roster is Lastlight alone',
    wR.bountyBoardRoster().length === 1 && wR.bountyBoardRoster()[0].id === 'lastlight');
  // Stand a quay board: an OPEN hold at prosperity 1 wearing the
  // bounty_board service, anchored from a port zone (the pair's shape).
  const clsR = Object.values(HOLD_CLASSES).find(c => c.services.some(s => s.id === 'bounty_board'))!;
  check('R: a hold class carries the bounty_board service row (the residence)', !!clsR);
  const anchorR = Object.values(wR.zoneMap).find(z =>
    z.id !== START_ZONE && z.id !== 'crossroads' && !z.boundless && !z.holdAnchor)!;
  const portR = Object.values(wR.zoneMap).find(z =>
    z.id !== START_ZONE && z.id !== 'crossroads' && z.id !== anchorR.id && !z.boundless)!;
  anchorR.harborhold = { ...mintHoldState(clsR), state: 'open', prosperity: 1 };
  portR.holdAnchor = anchorR.id;
  const rosterR = wR.bountyBoardRoster();
  check('R: an open, prosperous hold seats its quay board on the roster',
    rosterR.length === 2 && rosterR.some(b => b.id === portR.id && b.homeZoneId === portR.id));
  check('R: a besieged hold seats NO board (the town must live first)',
    (() => { anchorR.harborhold!.state = 'besieged';
      const n = wR.bountyBoardRoster().length;
      anchorR.harborhold!.state = 'open';
      return n === 1; })());
  // THE LOCALIZATION: the quay's slate measures from ITS OWN home — the
  // hero stands in Lastlight the whole time.
  wR.armBountyBoard();
  wR.armBountyBoard(portR.id);
  const quayOffers = (): BountyPosting[] => wR.bountyOffers.filter(o => o.boardId === portR.id);
  const townOffers = (): BountyPosting[] => wR.bountyOffers.filter(o => o.boardId === 'lastlight');
  check('R: the quay board deals its own slate beside Lastlight\'s',
    quayOffers().length > 0 && townOffers().length > 0,
  `quay ${quayOffers().length} · town ${townOffers().length}`);
  check('R: THE LOCALIZATION — every quay writ stands within the quay\'s own reach',
    quayOffers().every(o => coordDist(wR.zoneMap[o.zoneId].map, portR.map) <= 720 * 1.01));
  // ONE HAND PER BOARD (her ruling — the M0 fold turned live): a hand
  // from each board stands together; a second on the SAME board refuses.
  const tOff = townOffers()[0];
  const qOff = quayOffers()[0];
  check('R: one hand from EACH board stands together (the stockpile)',
    wR.acceptBounty(tOff.id) === true && wR.acceptBounty(qOff.id) === true
    && wR.bountyHands.length === 2);
  const tOff2 = townOffers()[0];
  check('R: a second hand on the same board refuses (the per-board cap)',
    tOff2 === undefined || (wR.acceptBounty(tOff2.id) === false && wR.bountyHands.length === 2));
  // THE TURN-IN gate: a hand walks home to ITS OWN board — the quay's
  // hand refuses at Lastlight's counter.
  parkAtBoard(wR);
  const qHand: BountyPosting = {
    id: 'bounty_test_quay', kind: 'charge', boardId: portR.id,
    zoneId: anchorR.id, beat: 0, pay: { essence: [{ essence: 'coarse', count: 2 }] },
  };
  wR.bountyHands.push(qHand);
  wR.activeQuests.push({ questId: qHand.id, zoneId: qHand.zoneId, fieldDone: true });
  wR.completedObjectives.add(anchorR.id);
  check('R: a quay hand refuses Lastlight\'s counter (the writ walks home)',
    wR.turnInBounty(qHand.id) === false && wR.bountyHands.some(h => h.id === qHand.id));
  // THE SCOPED REFRESH: resolving a Lastlight hand re-deals Lastlight
  // alone — the quay's standing slate rides untouched, and both boards
  // read the ONE shared lattice.
  const tHand: BountyPosting = {
    id: 'bounty_test_town', kind: 'charge', boardId: 'lastlight',
    zoneId: anchorR.id, beat: 0, pay: { essence: [{ essence: 'coarse', count: 2 }] },
  };
  wR.bountyHands.push(tHand);
  wR.activeQuests.push({ questId: tHand.id, zoneId: tHand.zoneId, fieldDone: true });
  const quayIds = quayOffers().map(o => o.id).join('|');
  const townIds = townOffers().map(o => o.id).join('|');
  check('R: the turn-in refreshes ITS board alone (the quay slate stands)',
    wR.turnInBounty(tHand.id) === true
    && quayOffers().map(o => o.id).join('|') === quayIds
    && townOffers().map(o => o.id).join('|') !== townIds);
  check('R: one shared lattice — both boards read the same countdown',
    wR.bountyBoardView().countdown === wR.bountyBoardView(portR.id).countdown);
  // THE SAVE: regional bookkeeping rides the boards record and returns.
  const wsR = wR.serializeWorldState();
  check('R: the save carries the quay board\'s own bookkeeping',
    wsR.bountyBoard?.boards?.[portR.id]?.armedBeat !== undefined);
  // THE BAND SCOPE: on a fresh (ungraduated) run the starter band governs
  // Lastlight ALONE — a quay board deals the full grammar from its first
  // beat (a quay across the sea must never pin the Crossroads).
  seedGlobalRandom(0x4146);
  const wR2 = makeSimWorld('warrior', SEED ^ 0x77);
  openBoard(wR2);
  wR2.loadZone('crossroads');
  wR2.loadZone(START_ZONE);
  const anchor2 = Object.values(wR2.zoneMap).find(z =>
    z.id !== START_ZONE && z.id !== 'crossroads' && !z.boundless && !z.holdAnchor)!;
  const port2 = Object.values(wR2.zoneMap).find(z =>
    z.id !== START_ZONE && z.id !== 'crossroads' && z.id !== anchor2.id && !z.boundless)!;
  anchor2.harborhold = { ...mintHoldState(clsR), state: 'open', prosperity: 1 };
  port2.holdAnchor = anchor2.id;
  wR2.armBountyBoard();
  wR2.armBountyBoard(port2.id);
  const town2 = wR2.bountyOffers.filter(o => o.boardId === 'lastlight');
  const quay2 = wR2.bountyOffers.filter(o => o.boardId === port2.id);
  check('R: the starter band governs Lastlight alone (the quay deals unbanded)',
    town2.length > 0 && town2.every(o => o.zoneId === 'crossroads')
    && quay2.length > 0 && quay2.some(o => o.zoneId !== 'crossroads'));
}

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
