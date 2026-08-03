// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE RECKONING (the essence-normalized meta-progression):
//   · THE MORTAL EXCHANGE (data/essences.ts): every essence declares an
//     integer worth, the cheapest tier is worth exactly 1 (THE CHANGE LAW),
//     the ladder rises with rarity, and the wallet appraisal/spend are exact
//     to the unit — a spend that breaks a deep tint refunds perfect change,
//     conserving value; a short wallet is refused untouched.
//   · THE INVESTMENT LANE (meta/unlocks.ts): pours clamp to the pool and the
//     remainder, persist on Account.invested, grant at full cost, and settle
//     a retuned-below-investment entry outright; applyUnlock keeps its exact
//     historical semantics as the one-shot face (prior pours count toward
//     it); the gate is the visibility gate.
//   · THE FIRST EXCHANGE: the Salvage Station costs exactly 1 and surfaces
//     on the essence-touched ledger — the run that first meets essence can
//     always claim it at its own reckoning.
//   · THE SEAL (meta/account.ts): sealing zeroes the pool, never lifetime
//     totals or investments — Mortal Essence does not cross between runs.
//   · THE RUN CHRONICLE: records cap with personal bests protected (top-10
//     by essence, top-10 by renown, newest 10), and standings rank 1-based
//     with strictly-better rows ahead.
//   · The save round-trip carries invested + runRecords; a legacy save
//     without them loads to clean defaults.
// Run: npx tsx balance/probe_reckoning.ts
// ---------------------------------------------------------------------------

import {
  ESSENCES, ESSENCE_IDS, ESSENCE_OF_RARITY, essenceUnitsForValue, LEDGER_ESSENCE_TOUCHED,
  spendWalletMortalValue, walletBreakdown, walletMortalValue, type EssenceId,
} from '../src/data/essences';
import {
  FEATURE, MAX_RUN_RECORDS, RUN_RECORD_SCHEMA, accountLevelFor, accountLevelThreshold,
  applyCredits, deserializeAccount, makeAccount, recordRun, renownForRun,
  runStanding, sealReckoning, serializeAccount, type RunRecord,
} from '../src/meta/account';
import {
  SKILL_GRAFT_COST, UNLOCK_CATALOG, applyUnlock, availableUnlocks, investUnlock,
  investedToward, isUnlockOwned, isUnlockVisible, remainingCost, vaultSeatOf,
  type Unlockable,
} from '../src/meta/unlocks';
import {
  GILDED_TOLLGATE, HOLDFAST_DEFS, SOVEREIGN_TOLLGATE, holdfastTollCost,
  holdfastTollLabel, unlockImplemented,
} from '../src/packages/holdfast';
import { MERC_CFG } from '../src/meta/mercs';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

const wallet = (w: Partial<Record<EssenceId, number>>): Record<EssenceId, number> => {
  const out = {} as Record<EssenceId, number>;
  for (const id of ESSENCE_IDS) out[id] = w[id] ?? 0;
  return out;
};

// --- A) The exchange table ---------------------------------------------------
{
  check('exchange: every essence declares a positive integer mortalWorth',
    ESSENCE_IDS.every(id => Number.isInteger(ESSENCES[id].mortalWorth) && ESSENCES[id].mortalWorth >= 1),
    ESSENCE_IDS.map(id => `${id}:${ESSENCES[id].mortalWorth}`).join(' '));
  const worths = ESSENCE_IDS.map(id => ESSENCES[id].mortalWorth);
  check('exchange: THE CHANGE LAW — the cheapest tier is worth exactly 1',
    Math.min(...worths) === 1);
  check('exchange: the ladder rises with rarity (authored order strictly ascending)',
    worths.every((w, i) => i === 0 || w > worths[i - 1]));
}

// --- B) The appraisal fold ---------------------------------------------------
{
  // The design brief's own example: 100 coarse + 20 pristine = 200.
  const w = wallet({ coarse: 100, pristine: 20 });
  check('appraisal: 100 coarse + 20 pristine = 200 (the brief, verbatim)',
    walletMortalValue(w) === 100 * ESSENCES.coarse.mortalWorth + 20 * ESSENCES.pristine.mortalWorth
    && walletMortalValue(w) === 200, `${walletMortalValue(w)}`);
  check('appraisal: empty and partial wallets read 0 / their own fold',
    walletMortalValue({}) === 0 && walletMortalValue({ glimmering: 3 }) === 3 * ESSENCES.glimmering.mortalWorth);
  const rows = walletBreakdown(w);
  check('appraisal: the breakdown carries exactly the non-empty tiers, values summing to the fold',
    rows.length === 2 && rows.reduce((s, r) => s + r.value, 0) === walletMortalValue(w)
    && rows.every(r => r.value === r.count * ESSENCES[r.id].mortalWorth));
}

// --- C) The spend (greedy + exact change) ------------------------------------
{
  const exact = wallet({ coarse: 5, glimmering: 2 });
  check('spend: an exact spend drains cheapest-first, no change minted',
    spendWalletMortalValue(exact, 7) && exact.coarse === 0 && exact.glimmering === 1
    && walletMortalValue(exact) === 2);
  // Change-giving: pay 3 from a single pristine (worth 5) → 2 coarse back.
  const change = wallet({ pristine: 1 });
  const before = walletMortalValue(change);
  check('spend: breaking a deep tint refunds exact change in the cheapest tier',
    spendWalletMortalValue(change, 3) && change.pristine === 0
    && change.coarse === ESSENCES.pristine.mortalWorth - 3
    && before - walletMortalValue(change) === 3);
  // Value conservation across a messy mixed spend.
  const messy = wallet({ coarse: 1, glimmering: 1, brilliant: 1, pristine: 1 });
  const total = walletMortalValue(messy);
  check('spend: a mixed spend conserves value to the unit',
    spendWalletMortalValue(messy, 6) && total - walletMortalValue(messy) === 6);
  // Refusal leaves the wallet untouched.
  const short = wallet({ coarse: 2 });
  const snap = JSON.stringify(short);
  check('spend: a short wallet refuses untouched; a zero price is a free no-op',
    !spendWalletMortalValue(short, 3) && JSON.stringify(short) === snap
    && spendWalletMortalValue(short, 0) && JSON.stringify(short) === snap);
}

// --- D) The investment lane --------------------------------------------------
{
  const a = makeAccount();
  // A visible-from-the-start feature row with a real cost (the Grand Codex
  // gates on level 2 — pick the all-gems flip's cheaper sibling instead):
  // the first slot tier is gated by pool depth; use a plain catalog entry
  // that is visible on a fresh account.
  const fresh = availableUnlocks(a);
  check('invest: a fresh account has stock on the shelf', fresh.length > 0, `${fresh.length}`);
  const u = fresh.reduce((m, x) => (x.cost > m.cost ? x : m), fresh[0]);
  applyCredits(a, Math.floor(u.cost / 2));
  const put = investUnlock(a, u, a.credits);
  check('invest: a pour clamps to the pool, records progress, spends the pool',
    put === Math.floor(u.cost / 2) && investedToward(a, u) === put && a.credits === 0
    && !isUnlockOwned(a, u) && remainingCost(a, u) === u.cost - put);
  const dry = investUnlock(a, u, 50);
  check('invest: a dry pool pours nothing', dry === 0 && investedToward(a, u) === put);
  // applyUnlock compat: refuses below the REMAINDER, buys at it.
  applyCredits(a, remainingCost(a, u) - 1);
  check('invest: applyUnlock refuses when the pool is under the remainder',
    !applyUnlock(a, u) && !isUnlockOwned(a, u));
  applyCredits(a, 1);
  check('invest: applyUnlock completes at exactly the remainder, clearing the investment',
    applyUnlock(a, u) && isUnlockOwned(a, u) && a.invested[u.id] === undefined && a.credits === 0);
  // Over-pour clamps to the remainder.
  const b = makeAccount();
  const v = availableUnlocks(b).reduce((m, x) => (x.cost > m.cost ? x : m), availableUnlocks(b)[0]);
  applyCredits(b, v.cost + 500);
  const putAll = investUnlock(b, v, 99999);
  check('invest: an over-pour clamps to the cost and grants',
    putAll === v.cost && isUnlockOwned(b, v) && b.credits === 500);
  // The gate is the visibility gate: an invisible entry takes nothing.
  const c = makeAccount();
  applyCredits(c, 10_000);
  const hidden = UNLOCK_CATALOG.find(x => availableUnlocks(c).every(y => y.id !== x.id) && !isUnlockOwned(c, x));
  check('invest: an invisible entry refuses the pour',
    !!hidden && investUnlock(c, hidden as Unlockable, 100) === 0 && c.credits === 10_000);
  // A retune below an existing investment settles outright.
  const d = makeAccount();
  const w2 = availableUnlocks(d)[0];
  d.invested[w2.id] = w2.cost + 25; // as if the catalog price dropped
  check('invest: a retuned-below-investment entry settles (grants, clears) without new essence',
    investUnlock(d, w2, 0) === 0 && isUnlockOwned(d, w2) && d.invested[w2.id] === undefined);
}

// --- E) The first exchange (Salvage Station) ---------------------------------
{
  const row = UNLOCK_CATALOG.find(u => u.id === 'feat_salvage_station');
  check('first exchange: the Salvage Station costs exactly 1 and gates on essence touched',
    !!row && row.cost === 1 && row.reqLedger === LEDGER_ESSENCE_TOUCHED);
  const a = makeAccount();
  a.ledger[LEDGER_ESSENCE_TOUCHED] = 1;
  applyCredits(a, 1);
  const u = availableUnlocks(a).find(x => x.id === 'feat_salvage_station');
  check('first exchange: one touched essence + one minted Mortal Essence buys it',
    !!u && applyUnlock(a, u!) && a.credits === 0);
}

// --- F) The seal --------------------------------------------------------------
{
  const a = makeAccount();
  applyCredits(a, 320);
  const u = availableUnlocks(a)[0];
  investUnlock(a, u, 20);
  const lifetime = a.lifetimeCredits;
  const passed = sealReckoning(a);
  check('seal: zeroes the pool, returns what passed, never touches lifetime or investments',
    passed === 300 && a.credits === 0 && a.lifetimeCredits === lifetime
    && investedToward(a, u) === 20);
}

// --- G) The chronicle ---------------------------------------------------------
{
  const a = makeAccount();
  const rec = (i: number, essence: number, renown: number): RunRecord => ({
    schema: RUN_RECORD_SCHEMA, at: 1_000_000 + i, name: `run${i}`, classId: 'warrior',
    level: 1, zones: 1, kills: 1, reason: 'death', essence, renown,
  });
  // An early all-time best, then a long tail of mediocre runs: the best must
  // survive a full rotation of the cap.
  recordRun(a, rec(0, 9_999, 9_999));
  for (let i = 1; i <= MAX_RUN_RECORDS + 30; i++) recordRun(a, rec(i, 10 + (i % 7), 20 + (i % 5)));
  check('chronicle: caps at MAX_RUN_RECORDS',
    a.runRecords.length === MAX_RUN_RECORDS, `${a.runRecords.length}`);
  check('chronicle: the protected set keeps the all-time best through a full rotation',
    a.runRecords.some(r => r.essence === 9_999));
  check('chronicle: the newest run always survives the trim',
    a.runRecords.some(r => r.at === 1_000_000 + MAX_RUN_RECORDS + 30));
  const best = a.runRecords.find(r => r.essence === 9_999)!;
  const st = runStanding(a, best);
  check('chronicle: the best run ranks #1 on both axes',
    st.byEssence === 1 && st.byRenown === 1 && st.of === a.runRecords.length);
  const worst = [...a.runRecords].sort((x, y) => x.essence - y.essence)[0];
  check('chronicle: a middling run ranks strictly behind the best',
    runStanding(a, worst).byEssence > 1);
  check('chronicle: renown is the old journey formula, verbatim',
    renownForRun(12, 15, 200) === Math.floor(200 * 1 + 15 * 10 + 12 * 2));
  check('chronicle: the level curve inverts exactly at every rung it names',
    [0, 1, 2, 5, 10, 30].every(l =>
      accountLevelFor(accountLevelThreshold(l)) === l
      && (l === 0 || accountLevelFor(accountLevelThreshold(l) - 1) === l - 1)));
}

// --- H) The save round-trip ---------------------------------------------------
{
  const a = makeAccount();
  applyCredits(a, 100);
  const u = availableUnlocks(a)[0];
  investUnlock(a, u, 15);
  recordRun(a, {
    schema: RUN_RECORD_SCHEMA, at: 42, name: 'ser probe', classId: 'rogue',
    level: 9, zones: 4, kills: 77, reason: 'retire', essence: 85, renown: 135,
  });
  const back = deserializeAccount(JSON.parse(JSON.stringify(serializeAccount(a))));
  check('save: invested + runRecords survive the round-trip',
    !!back && back!.invested[u.id] === 15 && back!.runRecords.length === 1
    && back!.runRecords[0].essence === 85 && back!.credits === a.credits);
  // A legacy save (fields absent) loads to clean defaults.
  const legacy = serializeAccount(makeAccount());
  delete (legacy as { invested?: unknown }).invested;
  delete (legacy as { runRecords?: unknown }).runRecords;
  const old = deserializeAccount(JSON.parse(JSON.stringify(legacy)));
  check('save: a legacy save without the fields loads to clean defaults',
    !!old && Object.keys(old!.invested).length === 0 && old!.runRecords.length === 0);
  // Malformed investment entries are dropped, never a wipe.
  const dirty = serializeAccount(makeAccount());
  dirty.invested = { good: 5, zero: 0, neg: -3, nan: Number.NaN };
  const cleaned = deserializeAccount(JSON.parse(JSON.stringify(dirty)));
  check('save: malformed investment entries are dropped, honest ones kept',
    !!cleaned && cleaned!.invested.good === 5 && Object.keys(cleaned!.invested).length === 1);
}

// --- I) The tinted tolls -------------------------------------------------------
{
  const tinted = HOLDFAST_DEFS.filter(d => d.unlock.tint);
  check('tolls: the tinted gates are enrolled and implemented (they may roll)',
    tinted.length >= 2 && tinted.every(d => unlockImplemented(d.unlock)),
    tinted.map(d => d.id).join(', '));
  check('tolls: every tinted gate names a real essence and speaks its price in that tint',
    tinted.every(d => {
      const t = d.unlock.tint!;
      if (!ESSENCES[t]) return false;
      const label = holdfastTollLabel(d, 12, 'MORTAL');
      return label.includes(ESSENCES[t].label) && label.startsWith(`${holdfastTollCost(d, 12)}×`);
    }));
  check('tolls: an untinted gate still quotes the mixed-wallet coin',
    holdfastTollLabel(HOLDFAST_DEFS[0], 5, 'MORTAL').endsWith('MORTAL'));
  // THE THEMED ANSWER: each tinted gate's promised cache rarity matches the
  // essence↔rarity canon (the tint IS the reward's tier, spoken twice).
  check('tolls: the themed cache honors the essence↔rarity canon (pristine → unique)',
    tinted.every(d => {
      const cr = d.pocket?.cacheRarity;
      return !!cr && ESSENCE_OF_RARITY[cr] === d.unlock.tint;
    }));
  check('tolls: the sovereign gate guards a unique; the gilded a rare',
    SOVEREIGN_TOLLGATE.pocket?.cacheRarity === 'unique' && GILDED_TOLLGATE.pocket?.cacheRarity === 'rare');
}

// --- J) The veteran's coin -----------------------------------------------------
{
  check('mercs: the retired tint is a real essence (or deliberately null)',
    MERC_CFG.retiredTint === null || !!ESSENCES[MERC_CFG.retiredTint]);
  check('mercs: unit conversion is exact ceil at the exchange, floored at one',
    essenceUnitsForValue('brilliant', 90) === Math.ceil(90 / ESSENCES.brilliant.mortalWorth)
    && essenceUnitsForValue('pristine', 1) === 1
    && essenceUnitsForValue('coarse', 7) === 7);
}

// --- K) The skill graft --------------------------------------------------------
{
  const a = makeAccount();
  const graft = UNLOCK_CATALOG.find(u => u.kind === 'graft');
  check('graft: exactly one graft entry, priced as authored, seated on a real shelf',
    UNLOCK_CATALOG.filter(u => u.kind === 'graft').length === 1
    && graft?.cost === SKILL_GRAFT_COST && !!vaultSeatOf('graft').kinds?.includes('graft'));
  check('graft: hidden until the Grand Codex is owned',
    !!graft && !isUnlockVisible(a, graft));
  a.features.add(FEATURE.UNLOCK_ALL_GEMS);
  check('graft: the codex surfaces it; it is never "owned"',
    !!graft && isUnlockVisible(a, graft) && !isUnlockOwned(a, graft));
  applyCredits(a, SKILL_GRAFT_COST);
  check('graft: buying arms the charge and empties the pool',
    !!graft && applyUnlock(a, graft) && a.skillGraft === true && a.credits === 0);
  check('graft: an ARMED charge stands the entry down (no double-arm road)',
    !!graft && !isUnlockVisible(a, graft) && investUnlock(a, graft, 50) === 0);
  a.skillGraft = false; // the run began and spent it (main.ts startGame)
  check('graft: consumption returns the entry to the shelf',
    !!graft && isUnlockVisible(a, graft));
  // The armed charge survives the save round-trip.
  a.skillGraft = true;
  const back = deserializeAccount(JSON.parse(JSON.stringify(serializeAccount(a))));
  check('graft: the armed charge survives the save round-trip; legacy saves load unarmed',
    !!back && back!.skillGraft === true
    && deserializeAccount(JSON.parse(JSON.stringify((() => { const s = serializeAccount(makeAccount()); delete (s as { skillGraft?: unknown }).skillGraft; return s; })())))!.skillGraft === false);
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL CHECKS PASSED');
process.exit(failed ? 2 : 0);
