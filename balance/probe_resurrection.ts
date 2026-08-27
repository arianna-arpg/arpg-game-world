// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE RESURRECTION COVENANT (meta/modes.ts onDeath 'fall';
// her ruling 2026-08-26): an Undying death fells the vessel instead of the
// free wake — banked in full, run over, no wipe — and the Vault's FALLEN
// shelf (a dynamic 'resurrect' unlock per fallen roster card) is the only
// road back, paid in Mortal Essence from the account's mortal runs. Pins:
//   - THE LADDER: the immortal mode's sworn stage still ADVANCES (the
//     immortalizing crossing is untouched); the undying stage wears 'fall'.
//   - THE FEE CURVE (resurrectFee): positive, monotone in vessel level AND
//     account level, floored at 1 — and FROZEN at the fall (the stamped
//     card never re-prices under later account growth).
//   - THE FALL FLOW (World.concludeWipe → beginModeFall, real engine
//     headless): routes 'fall' to a run END ('fall', gameOver) with NO
//     stage advance; banks the own-ring corpse + the whole carry strip;
//     stashes the PRE-strip appraisal with the true death ground
//     (fallReckoning — the death screen's honesty); stands the party back
//     up alive in the sanctuary (the persisted save is what resurrection
//     wakes); stamps the roster card with the frozen fee.
//   - THE GUEST FALL (bankCouchWipe): an undying couch vessel's card falls
//     beside its host's; the first stamp stands (a grandfathered session's
//     second wipe dies no deeper).
//   - THE FALLEN SHELF (meta/unlocks.ts kind 'resurrect'): entries exist
//     ONLY on the account pass (the static catalog stays pure), cost =
//     the stamped fee, seated on the Vault's FIRST tab, visible only while
//     the card stands fallen, never owned; the standing investment lane
//     pours it full across visits and the grant clears the card
//     (unlockCompleted); a cleared card retires the entry and refuses
//     further pours.
//   - THE SAVE: the fallen stamp survives the account round-trip; a
//     malformed fee heals FAIL-OPEN (shed, never a bricked vessel).
// Run: npx tsx balance/probe_resurrection.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { NullInput } from '../src/net/intent';
import { CLASSES } from '../src/data/classes';
import { rollItem } from '../src/engine/itemgen';
import {
  applyCredits, deserializeAccount, makeAccount, serializeAccount,
} from '../src/meta/account';
import {
  MODE_BY_ID, RESURRECT_CFG, resurrectFee, stageOf, type RosterEntry,
} from '../src/meta/modes';
import {
  allUnlockables, availableUnlocks, investUnlock, investedToward, isUnlockOwned,
  isUnlockVisible, remainingCost, resurrectUnlockId, unlockCompleted,
  VAULT_KIND_LABELS, VAULT_TABS, vaultSeatOf, vaultShelfCensus,
} from '../src/meta/unlocks';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();

// --- A) The ladder -----------------------------------------------------------
{
  const immortal = MODE_BY_ID['immortal'];
  check('ladder: the immortal mode stands, two stages, roster-saved',
    !!immortal && immortal.stages.length === 2 && immortal.save === 'roster');
  check('ladder: the sworn crossing is untouched (advance, reduced tithe, own-ring corpse)',
    stageOf('immortal', 0).onDeath === 'advance' && stageOf('immortal', 0).corpseRing === 'own');
  check('ladder: the undying stage wears the covenant (fall, sealed, payout 0)',
    stageOf('immortal', 1).onDeath === 'fall'
    && stageOf('immortal', 1).metaProgression === false
    && stageOf('immortal', 1).deathPayoutMult === 0);
  check('ladder: the mortal stage never falls (end, as ever)',
    stageOf('mortal', 0).onDeath === 'end');
}

// --- B) The fee curve --------------------------------------------------------
{
  check('fee: positive at the floor (level 1, account 0) and never below 1',
    resurrectFee(1, 0) >= 1 && resurrectFee(0, 0) >= 1 && resurrectFee(-5, -5) >= 1);
  check('fee: the authored floor is base + one level, exactly',
    resurrectFee(1, 0) === Math.round(RESURRECT_CFG.base + RESURRECT_CFG.perLevel));
  const lvls = [1, 5, 12, 30, 60];
  check('fee: monotone in vessel level (a deeper build is dearer to call back)',
    lvls.every((l, i) => i === 0 || resurrectFee(l, 4) > resurrectFee(lvls[i - 1], 4)));
  const accs = [0, 3, 10, 25];
  check('fee: monotone in account level (a rich line pays rich prices)',
    accs.every((a, i) => i === 0 || resurrectFee(20, a) > resurrectFee(20, accs[i - 1])));
}

// --- C) THE FALL FLOW (the real engine, headless) ----------------------------
{
  seedGlobalRandom(8261);
  const w = makeSimWorld('warrior', 8261);
  // The vessel: an Undying immortal with a roster card, some level, a worn
  // piece and a carried wallet (the covenant must corpse + strip it all).
  w.meta.modeId = 'immortal';
  w.meta.modeStage = 1;
  w.meta.charId = 'vessel_fall_probe';
  w.grantXp(2500);
  const heroLevel = w.player.level;
  const item = rollItem({ ilvl: 8 });
  if (item) w.meta.equipped.chest = item;
  check('fall probe setup: an item rolled onto the vessel doll', !!item);
  w.meta.essences.coarse = 21;
  w.meta.essences.pristine = 2;
  applyCredits(w.account, 450); // some account weight, so the fee scales
  const accountLevelAtFall = w.account.level;
  const card: RosterEntry = {
    charId: 'vessel_fall_probe', modeId: 'immortal', slot: 11,
    classId: w.meta.classDef.id, name: 'Probe Vessel', level: heroLevel,
    stage: 1, savedAt: 0,
  };
  w.account.roster.push(card);
  const deathGround = w.zone.name;
  const ringBefore = w.charDeaths.length;

  (w as unknown as { concludeWipe(): void }).concludeWipe();

  check('fall: the run ENDS as a fall (gameOver, reason \'fall\')',
    w.gameOver && w.runEndReason === 'fall');
  check('fall: the ladder does NOT advance (the stage stays undying)',
    w.meta.modeStage === 1);
  check('fall: the own-ring corpse banked (charDeaths grew by one)',
    w.charDeaths.length === ringBefore + 1);
  check('fall: the carry stripped whole (doll + both wallets)',
    w.meta.equipped.chest === undefined && (w.meta.essences.coarse ?? 0) === 0
    && (w.meta.essences.pristine ?? 0) === 0);
  check('fall: the appraisal was read PRE-strip, on the true death ground',
    !!w.fallReckoning && w.fallReckoning.carried === 21 + 2 * 5
    && w.fallReckoning.mult === 0 && w.fallReckoning.minted === 0
    && w.fallReckoning.zoneName === deathGround
    && w.fallReckoning.rows.some(r => r.id === 'coarse' && r.count === 21));
  check('fall: the party stands alive in the sanctuary (the save resurrection wakes)',
    !w.player.dead && !w.player.downed && w.zone.id !== undefined && w.zone.name !== deathGround);
  check('fall: the card is stamped with the frozen fee (level × account weight, this moment)',
    !!card.fallen && card.fallen.fee === resurrectFee(heroLevel, accountLevelAtFall)
    && card.fallen.level === heroLevel);
  const feeAtFall = card.fallen!.fee;
  applyCredits(w.account, 100_000); // the account grows past the fall…
  check('fall: …and the standing debt NEVER re-prices (frozen at the stamp)',
    card.fallen!.fee === feeAtFall);

  // --- D) THE FALLEN SHELF on that same account ------------------------------
  const a = w.account;
  const uid = resurrectUnlockId('vessel_fall_probe');
  check('shelf: the static catalog stays pure (no resurrects without an account)',
    allUnlockables().every(u => u.kind !== 'resurrect'));
  const entry = allUnlockables(a).find(u => u.id === uid);
  check('shelf: the account pass mints the entry at the stamped fee',
    !!entry && entry!.kind === 'resurrect' && entry!.cost === feeAtFall
    && availableUnlocks(a).some(u => u.id === uid));
  check('shelf: the kind is named and seated on the Vault\'s FIRST tab',
    VAULT_KIND_LABELS.resurrect !== undefined
    && vaultSeatOf('resurrect').id === VAULT_TABS[0].id
    && VAULT_TABS[0].kinds?.includes('resurrect') === true);
  const census = vaultShelfCensus(a);
  check('census: the fallen shelf stands first, visible, with the vessel in stock',
    census[0].tab.id === VAULT_TABS[0].id && census[0].visible
    && census[0].stock.some(u => u.id === uid));
  check('shelf: a resurrection is never owned and not yet complete',
    !isUnlockOwned(a, entry!) && !unlockCompleted(a, entry!) && isUnlockVisible(a, entry!));

  // The pour: partial across "runs" (the pool refills between), then full.
  a.credits = 0;
  applyCredits(a, Math.floor(feeAtFall / 2));
  const put1 = investUnlock(a, entry!, a.credits);
  check('pour: a first run\'s harvest invests partway and persists',
    put1 === Math.floor(feeAtFall / 2) && investedToward(a, entry!) === put1
    && !!card.fallen && remainingCost(a, entry!) === feeAtFall - put1);
  applyCredits(a, feeAtFall); // the next reckoning covers the rest
  const put2 = investUnlock(a, entry!, remainingCost(a, entry!));
  check('pour: the completing pour RESURRECTS — card cleared, investment settled',
    put2 === feeAtFall - put1 && card.fallen === undefined
    && a.invested[uid] === undefined && unlockCompleted(a, entry!));
  check('risen: the entry retires with the stamp (invisible, off the shelf, census dark)',
    !isUnlockVisible(a, entry!) && availableUnlocks(a).every(u => u.id !== uid)
    && !vaultShelfCensus(a)[0].visible);
  const creditsBefore = a.credits;
  check('risen: a stale captured card refuses further pours (no double-charge)',
    investUnlock(a, entry!, 50) === 0 && a.credits === creditsBefore);
}

// --- E) THE GUEST FALL (the couch covenant's fall arm) -----------------------
{
  seedGlobalRandom(8262);
  const w = makeSimWorld('warrior', 8262);
  const cls = CLASSES.find(c => c.id !== w.meta.classDef.id) ?? CLASSES[0];
  const guest = w.addSeat('c1', cls, new NullInput());
  guest.couch = { pad: 1, side: 'right', charId: 'vessel_guest_probe', rosterSlot: 12 };
  guest.meta.modeId = 'immortal';
  guest.meta.modeStage = 1; // undying — the falling stage
  guest.meta.charId = 'vessel_guest_probe';
  const card: RosterEntry = {
    charId: 'vessel_guest_probe', modeId: 'immortal', slot: 12,
    classId: cls.id, name: 'Guest Vessel', level: 1, stage: 1, savedAt: 0,
  };
  w.account.roster.push(card);

  (w as unknown as { bankCouchWipe(): void }).bankCouchWipe();
  check('guest fall: the wipe stamps the guest vessel\'s own card',
    !!card.fallen && card.fallen.fee === resurrectFee(w.seatHero(guest).level, w.account.level));
  const first = card.fallen!.fee;
  card.fallen!.fee = first; // (identity anchor for the re-stamp check)
  (w as unknown as { bankCouchWipe(): void }).bankCouchWipe();
  check('guest fall: a second wipe dies no deeper (the first stamp stands)',
    card.fallen!.fee === first);
}

// --- F) The save round-trip + the fail-open heal -----------------------------
{
  const a = makeAccount();
  a.roster.push({
    charId: 'vessel_rt', modeId: 'immortal', slot: 13, classId: 'warrior',
    name: 'RT Vessel', level: 9, stage: 1, savedAt: 0,
    fallen: { fee: 137, at: 42, level: 9 },
  });
  const back = deserializeAccount(JSON.parse(JSON.stringify(serializeAccount(a))));
  check('save: the fallen stamp survives the round-trip whole',
    !!back && back!.roster[0]?.fallen?.fee === 137 && back!.roster[0]?.fallen?.level === 9);
  const dirty = serializeAccount(a);
  (dirty.roster![0] as { fallen?: unknown }).fallen = { fee: Number.NaN, at: 1, level: 2 };
  const healed = deserializeAccount(JSON.parse(JSON.stringify(dirty)));
  check('save: a malformed fee heals FAIL-OPEN (stamp shed, vessel never bricked)',
    !!healed && healed!.roster[0] !== undefined && healed!.roster[0].fallen === undefined);
  const zeroed = serializeAccount(a);
  (zeroed.roster![0] as { fallen?: unknown }).fallen = { fee: 0, at: 1, level: 2 };
  const healed0 = deserializeAccount(JSON.parse(JSON.stringify(zeroed)));
  check('save: a zero fee is malformed too (shed — a free resurrection is not a debt)',
    !!healed0 && healed0!.roster[0].fallen === undefined);
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL CHECKS PASSED');
process.exit(failed ? 2 : 0);
