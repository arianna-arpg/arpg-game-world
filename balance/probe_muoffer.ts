// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE OFFERED CONTRACT (Mu × the Immortal covenant, her
// ruling 2026-09-13): meta/modes.ts ModeOfferSpec (`CharacterModeDef.muOffer`)
// rolled by engine/muDeal.ts onto the dealt hand, worn by the offered vessel
// as the contract's marker status (the drawn tell), read by the card through
// modesSwearableFrom (the ONE predicate for a card's contract row). Pins:
//   • THE REGISTRY — the Immortal wears a muOffer whose marker (`mu_sworn`)
//     exists and DRAWS (bodyFx glow + rim): shown, never told.
//   • THE GATE — no covenant unlock = no offer, ever; a FULL roster (fallen
//     vessels included) = no offer; a freed slot re-opens the roll.
//     Eligibility is derived at every deal, never stored.
//   • THE ROLL — per-vessel chance along the dealt hand, capped at `max`
//     per waking, awake vessels only, one contract per vessel; measured
//     over a thousand sittings against the analytic rate; the dials rule.
//   • THE STREAM LAW — the hand is byte-identical with the covenant on or
//     off (the roll draws AFTER the deal); a sitting re-deals the same
//     hand AND the same offer; a run or a death moves the seed.
//   • THE SEATED TELL — in the world exactly the offered vessel wears the
//     marker, it stands AWAKE, the dwell posts its class as ever, and
//     muOfferOf names the contract (null for every other vessel); the wisp
//     wears nothing; an un-sworn account's Mu marks nobody.
//   • THE ONE PREDICATE — an `only` contract lists solely on the vessel
//     carrying its offer (Mortal alone otherwise — the deliberation law),
//     `release` decides whether the offered vessel may step back to
//     Mortal, a lost unlock voids the offer, `only: false` restores the
//     legacy free row, and availableModes stays untouched.
// Run: npx tsx balance/probe_muoffer.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { sceneBegin, muTakeClassRequest, muOfferOf } from '../src/engine/scenes';
import { muDeal, muDealSeed } from '../src/engine/muDeal';
import { MU_CFG, APPARITION_PREFIX, apparitionDefId } from '../src/data/mu';
import { PROLOGUE_SCENE } from '../src/data/scenes';
import { CLASSES } from '../src/data/classes';
import { STATUS_DEFS } from '../src/engine/status';
import { FEATURE, makeAccount, selectableSlotCount, ROSTER_SLOT_BASE, type Account } from '../src/meta/account';
import {
  MODE_BY_ID, DEFAULT_MODE_ID, availableModes, muOfferableModes, modesSwearableFrom,
  rosterCapacity, freeRosterSlot, type ModeOfferSpec,
} from '../src/meta/modes';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

const DT = 1 / 60;
const step = (w: World, s: number): void => {
  for (let t = 0; t < s; t += DT) w.update(DT);
};

bootSimEngine();

const IMM = MODE_BY_ID.immortal;
const spec = IMM.muOffer as ModeOfferSpec;
const marker = STATUS_DEFS[spec?.status ?? ''];

/** Run `f` with the Immortal's offer dials patched, restored after — the
 *  dials are the truth, so the probe turns them to pin each law. */
const patched = <T>(patch: Partial<ModeOfferSpec>, f: () => T): T => {
  const keep = { ...spec };
  Object.assign(spec, patch);
  try { return f(); } finally { Object.assign(spec, keep); }
};

/** A throwaway account with the whole roster earned; `covenant` owns the
 *  Immortal unlock (the gate the roll reads). */
const mkAcc = (covenant: boolean): Account => {
  const a = makeAccount();
  for (const c of CLASSES) a.unlockedClasses.add(c.id);
  if (covenant) a.features.add(FEATURE.IMMORTAL);
  return a;
};
const ids = (list: { id: string }[]): string => list.map(x => x.id).join(',');
const seedAt = (i: number): number => (i * 7919 + 13) >>> 0;
const offersOver = (acc: Account, n: number): { hands: number; total: number; maxPer: number } => {
  let hands = 0, total = 0, maxPer = 0;
  for (let i = 0; i < n; i++) {
    const d = muDeal(acc, seedAt(i));
    if (d.offers.size) hands++;
    total += d.offers.size;
    maxPer = Math.max(maxPer, d.offers.size);
  }
  return { hands, total, maxPer };
};

// === A) THE REGISTRY =========================================================
check('A1: the Immortal covenant wears a muOffer row', !!spec);
check('A2: its marker status exists and DRAWS — a glow and a rim (shown, never told)',
  !!marker && !!marker.bodyFx?.glow && !!marker.bodyFx?.rim, `status=${spec?.status}`);
check('A3: the dials read sane — chance in (0,1], max >= 1, release ON, only ON (the deliberation law)',
  !!spec && spec.chance > 0 && spec.chance <= 1 && spec.max >= 1 && spec.release === true && spec.only === true,
  `chance=${spec?.chance} max=${spec?.max}`);
check('A4: the default contract wears no offer (it is what an offer releases to)',
  !MODE_BY_ID[DEFAULT_MODE_ID].muOffer);
check('A5: the card\'s header words carry the {mode} slot and the marker its ink',
  MU_CFG.offer.sworn.includes('{mode}') && MU_CFG.offer.declined.includes('{mode}')
  && typeof marker?.color === 'string' && marker.color.length > 0);

// === B) THE GATE =============================================================
const bare = mkAcc(false);
const sworn = mkAcc(true);
const SEEDS = 1000;
check('B1: no covenant unlock → nothing offerable, no offer over a thousand sittings',
  muOfferableModes(bare).length === 0 && offersOver(bare, SEEDS).total === 0);
check('B2: covenant owned + a free vessel slot → the Immortal is offerable (and only it)',
  ids(muOfferableModes(sworn)) === 'immortal');
{
  const full = mkAcc(true);
  const cap = rosterCapacity(full, IMM);
  for (let i = 0; i < cap; i++) {
    full.roster.push({ charId: `c${i}`, modeId: 'immortal', slot: ROSTER_SLOT_BASE + i,
      classId: 'warrior', name: 'vessel', level: 1, stage: 0, savedAt: 0 });
  }
  check('B3: a FULL roster (every vessel slot sworn) → nothing offerable, no offer',
    freeRosterSlot(full, IMM) === null && muOfferableModes(full).length === 0
    && offersOver(full, SEEDS).total === 0, `cap=${cap}`);
  full.roster[0].fallen = { fee: 10, at: 0, level: 1 };
  check('B4: a FALLEN vessel still holds its slot — no offer until it is raised or released',
    muOfferableModes(full).length === 0);
  full.roster.pop();
  check('B5: releasing a vessel re-opens the roll (eligibility is derived per deal, never stored)',
    ids(muOfferableModes(full)) === 'immortal');
}

// === C) THE ROLL =============================================================
{
  const hand = Math.min(selectableSlotCount(sworn), CLASSES.length);
  const r = offersOver(sworn, SEEDS);
  const pHand = r.hands / SEEDS;
  const pExp = 1 - Math.pow(1 - spec.chance, hand);
  check(`C1: THE ROLL lands at the analytic rate — P(a waking carries an offer) ≈ ${pExp.toFixed(3)} at max 1`,
    spec.max !== 1 || Math.abs(pHand - pExp) < 0.06,
    `measured ${pHand.toFixed(3)} over ${SEEDS} sittings (hand ${hand}, chance ${spec.chance})`);
  check('C2: some wakings offer, none offers more than `max`',
    r.maxPer >= 1 && r.maxPer <= spec.max, `maxPer=${r.maxPer}`);
  let awakeOnly = true, oneEach = true;
  for (let i = 0; i < 300; i++) {
    const d = muDeal(sworn, seedAt(i));
    for (const [cid, mid] of d.offers) {
      if (!d.awake.some(c => c.id === cid) || mid !== 'immortal') awakeOnly = false;
      if (d.veiled.some(c => c.id === cid)) oneEach = false;
    }
  }
  check('C3: every offer sits on an AWAKE vessel of the dealt hand, under the Immortal, never a veiled one',
    awakeOnly && oneEach);
  check('C4: chance 1 → every waking offers exactly `max` (the cap is the ceiling)',
    patched({ chance: 1, max: 1 }, () => { const q = offersOver(sworn, 200); return q.hands === 200 && q.total === 200; }));
  check('C5: chance 0 → no waking offers (the dial is the truth)',
    patched({ chance: 0, max: 1 }, () => offersOver(sworn, 200).total === 0));
  check('C6: max 2 at chance 1 → two vessels per waking, bounded by the hand',
    patched({ chance: 1, max: 2 }, () => {
      const want = Math.min(2, hand);
      const q = offersOver(sworn, 50);
      return q.maxPer === want && q.total === 50 * want;
    }), `hand=${hand}`);
}

// === D) THE STREAM LAW =======================================================
{
  let identical = true;
  for (let i = 0; i < 300; i++) {
    const a = muDeal(bare, seedAt(i)), b = muDeal(sworn, seedAt(i));
    if (ids(a.awake) !== ids(b.awake) || ids(a.veiled) !== ids(b.veiled) || a.faintN !== b.faintN) identical = false;
  }
  check('D1: THE STREAM LAW — the hand is byte-identical with the covenant on or off (the roll draws AFTER the deal)',
    identical);
  const s = muDealSeed(sworn);
  const x = muDeal(sworn, s), y = muDeal(sworn, s);
  check('D2: a sitting re-deals the same hand AND the same offer (the seed is the account\'s own history)',
    ids(x.awake) === ids(y.awake) && [...x.offers].join('|') === [...y.offers].join('|'));
  const acc2 = mkAcc(true);
  const s0 = muDealSeed(acc2);
  (acc2.runRecords as unknown[]).push({});
  const s1 = muDealSeed(acc2);
  (acc2.deaths as unknown[]).push({});
  const s2 = muDealSeed(acc2);
  check('D3: a completed run or a death moves the seed — the next waking re-deals hand and offer alike',
    s0 !== s1 && s1 !== s2 && s0 !== s2);
  check('D4: an ineligible account draws nothing past the deal — the hand under a FULL roster is the bare hand',
    (() => {
      const full = mkAcc(true);
      for (let i = 0; i < rosterCapacity(full, IMM); i++) {
        full.roster.push({ charId: `f${i}`, modeId: 'immortal', slot: ROSTER_SLOT_BASE + i,
          classId: 'warrior', name: 'vessel', level: 1, stage: 0, savedAt: 0 });
      }
      for (let i = 0; i < 100; i++) {
        const a = muDeal(bare, seedAt(i)), b = muDeal(full, seedAt(i));
        if (ids(a.awake) !== ids(b.awake) || b.offers.size) return false;
      }
      return true;
    })());
}

// === E) THE SEATED TELL ======================================================
{
  const w = makeSimWorld('warrior', 47101);
  w.account.ledger[PROLOGUE_SCENE.ledger] = 1; // a veteran: the tutorial is behind
  w.account.features.add(FEATURE.IMMORTAL);
  // Force THIS sitting's roll (chance 1, max 1) so the tell stands to be read;
  // a stage BEGINS on its first update (SceneRuntime.begun), so the patch
  // holds through that step and the dials are restored once the deal is seated.
  const expected = patched({ chance: 1, max: 1 }, () => {
    const d = muDeal(w.account);
    check('E0: the standalone hub scene takes with the covenant owned', sceneBegin(w, 'mu'));
    step(w, 0.3);
    return d;
  });
  const p = w.player;
  const apps = w.actors.filter(a => !!a.defId && a.defId.startsWith(APPARITION_PREFIX)) as Actor[];
  const marked = apps.filter(a => a.statuses.some(s => s.id === spec.status));
  const classOf = (a: Actor): string | null => CLASSES.find(c => apparitionDefId(c.id) === a.defId)?.id ?? null;
  check('E1: exactly ONE vessel wears the marker (max 1)', marked.length === 1, `marked=${marked.length}`);
  const v = marked[0];
  const cid = v ? classOf(v) : null;
  check('E2: the marked vessel stands AWAKE (no rank marker) and is a class of the hand',
    !!v && !v.statuses.some(s => s.id === 'mu_veiled' || s.id === 'mu_faint')
    && !!cid && expected.awake.some(c => c.id === cid));
  check('E3: drawn == dealt — the seated marker sits exactly where the pure deal put the offer',
    !!cid && expected.offers.get(cid) === 'immortal' && expected.offers.size === 1);
  const others = apps.filter(a => a !== v && classOf(a) && !a.statuses.some(s => s.id === 'mu_veiled' || s.id === 'mu_faint'));
  check('E4: muOfferOf names the Immortal for that class and null for every other awake vessel',
    !!cid && muOfferOf(w, cid) === 'immortal' && others.every(o => muOfferOf(w, classOf(o)!) === null),
    `others=${others.length}`);
  check('E5: the wisp wears no marker — the tell belongs to the vessel', !p.statuses.some(s => s.id === spec.status));
  if (v) {
    p.pos.x = v.pos.x; p.pos.y = v.pos.y + v.radius + 8;
    step(w, MU_CFG.dwell.sec + 0.6);
    const req = muTakeClassRequest(w);
    check('E6: the still linger posts the offered vessel\'s class as ever — and the offer reads beside it (the card opens pre-sworn)',
      req === cid && muOfferOf(w, cid!) === 'immortal', `req=${req}`);
  }
  const w2 = makeSimWorld('warrior', 47102);
  w2.account.ledger[PROLOGUE_SCENE.ledger] = 1;
  patched({ chance: 1, max: 1 }, () => { sceneBegin(w2, 'mu'); step(w2, 0.3); });
  check('E7: an un-sworn account\'s Mu marks nobody, even at chance 1 (the gate is the unlock)',
    !w2.actors.some(a => a.statuses.some(s => s.id === spec.status)));
}

// === F) THE ONE PREDICATE ====================================================
{
  check('F1: without an offer, an `only` contract is ABSENT — the row is Mortal alone (the deliberation law)',
    ids(modesSwearableFrom(sworn, null)) === 'mortal');
  check('F2: with the offer, the row lists Mortal AND Immortal — the offer is a choice (release)',
    ids(modesSwearableFrom(sworn, 'immortal')) === 'mortal,immortal');
  check('F3: release OFF → the offered contract is the WHOLE row (take it or step away)',
    patched({ release: false }, () => ids(modesSwearableFrom(sworn, 'immortal')) === 'immortal'));
  check('F4: only OFF → the legacy free row (listed with no offer at all)',
    patched({ only: false }, () => ids(modesSwearableFrom(sworn, null)) === 'mortal,immortal'));
  check('F5: an offer the account cannot swear into is VOID (unlock gone → Mortal alone)',
    ids(modesSwearableFrom(bare, 'immortal')) === 'mortal');
  check('F6: availableModes is untouched — the covenant still counts as unlocked for the roster pane',
    ids(availableModes(sworn)) === 'mortal,immortal' && ids(availableModes(bare)) === 'mortal');
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL CHECKS PASS');
process.exit(failed ? 1 : 0);
