// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE PATRON'S HOLD end to end (data/vendors.ts VENDOR_CFG +
// engine/world.ts + meta/worldstate.ts + meta/unlocks.ts). Pins:
//   - THE RESERVE LADDER: capacity = owned rungs (VENDOR_CFG.lock.ladder),
//     0 rungs refuse, each rung opens one slot; a reserved row rides every
//     restock and every leave/re-enter AS THE SAME OBJECT while free slots
//     re-roll; releasing re-opens the slot; buying clears the row and frees
//     capacity; the first purchase stamps LEDGER_VENDOR_BOUGHT (the Vault's
//     discovery gate — hidden before, visible after).
//   - SAVE FIDELITY: holds ride serializeWorldState → adoptWorldState (idx,
//     gem id/level/rarity, commission mark, ordinal); a stateless world
//     writes NO vendorHolds (empty is not load-bearing here); the sanitizer
//     drops unknown gems / vendors / dead site-scopes and never throws.
//   - THE DROP INDEX (gemdrop:<id>): dropGemAt mints bump it; a player
//     DISCARD does not; a counter PURCHASE does not — abuse-proof at the
//     mint site by construction.
//   - THE STANDING ORDER: refusals (no rung / unknown gem / index below
//     need / odds 0 before supports are sold) each in their own words; the
//     watch resolves elapsed beats at the shelf's true odds and seats the
//     find RESERVED (exempt from the reserve cap); a reload replays the
//     IDENTICAL outcome (find, rarity, seat — world seed × counter × gem ×
//     beat is the whole roll); purchase fulfills; releasing the find
//     unbought resumes the watch; withdrawal releases order and find.
//   - The chandler shares the fabric by registry (holds on its VendorDef
//     row; the live-port rig stays with probe_harborholds' ground).
// Run: npx tsx balance/probe_vendorlocker.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import {
  FEATURE, STARTER_SKILLS, STARTER_SUPPORTS, gemDropKey,
  LEDGER_GEMDROP_TOTAL, LEDGER_VENDOR_BOUGHT, makeAccount,
} from '../src/meta/account';
import { VENDOR_CFG } from '../src/data/vendors';
import { sanitizeVendorHolds } from '../src/meta/worldstate';
import { allUnlockables, isUnlockVisible } from '../src/meta/unlocks';
import { START_ZONE } from '../src/data/zones';
import { MONSTERS } from '../src/data/monsters';
import { ESSENCE_IDS } from '../src/data/essences';
import type { World, VendorEntry } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();

const RESTOCK_SEC = 30; // no BRANDT_FAST_RESTOCK granted anywhere below
const need = VENDOR_CFG.commission.need;
const rungs = VENDOR_CFG.lock.ladder;

/** Park the hero at Brandt's elbow (nearSmith: 160px + dwell-reachable). */
const parkAtSmith = (w: World): void => {
  const smith = w.actors.find(a => !a.dead && a.defId && MONSTERS[a.defId]?.npcRole === 'vendor');
  if (!smith) throw new Error('no smith in town');
  w.player.pos.x = smith.pos.x + 40;
  w.player.pos.y = smith.pos.y;
};
const enterTown = (w: World): void => { w.loadZone(START_ZONE); parkAtSmith(w); };
const leaveTown = (w: World): void => {
  const away = Object.values(w.zoneMap).find(z => z.id !== START_ZONE && !z.boundless)!;
  w.loadZone(away.id);
};
const fund = (w: World): void => { for (const id of ESSENCE_IDS) w.localSeat.meta.essences[id] = 99999; };
const entryId = (e: VendorEntry): string =>
  e.kind === 'skill' ? e.inst.def.id : e.kind === 'support' ? e.gem.def.id : `item:${e.item.uid}`;
const commRow = (w: World, key = 'brandt') => w.vendorHolds[key]?.locks.find(r => r.commission);

// ------------------------------------------------ A. THE RESERVE LADDER
const SEED_A = 0x51c7;
seedGlobalRandom(0x77e2);
const wA: World = makeSimWorld('warrior', SEED_A);
enterTown(wA);
check('A: the town arms a stocked counter', wA.vendorStock.length > 0,
  `${wA.vendorStock.length} wares`);
check('A: zero rungs = zero capacity, the toggle refuses',
  wA.vendorLockCap() === 0 && wA.setVendorLock('brandt', 0, true) === false);

wA.account.features.add(rungs[0].flag);
check('A: the first rung opens one slot', wA.vendorLockCap() === 1);
const heldA = wA.vendorStock[0];
check('A: a ware reserves within capacity',
  wA.setVendorLock('brandt', 0, true) === true
  && wA.vendorEntryHold('brandt', heldA) !== undefined);
check('A: the ledger full, a second reserve refuses',
  wA.setVendorLock('brandt', 1, true) === false);
wA.account.features.add(rungs[1].flag);
wA.account.features.add(rungs[2].flag);
check('A: the whole ladder counts (no literal three)', wA.vendorLockCap() === rungs.length);
const heldA2 = wA.vendorStock[1];
check('A: capacity grown, the second reserve stands', wA.setVendorLock('brandt', 1, true) === true);

const freeA = wA.vendorStock[2];
wA.restockVendor();
check('A: a restock re-seats reserved rows as the SAME objects at their slots',
  wA.vendorStock[0] === heldA && wA.vendorStock[1] === heldA2);
check('A: a free slot re-rolled (fresh object)', wA.vendorStock[2] !== freeA);

check('A: releasing a reserve stands', wA.setVendorLock('brandt', 1, false) === true);
wA.restockVendor();
check('A: the released slot re-rolls; the standing reserve rides on',
  wA.vendorStock[1] !== heldA2 && wA.vendorStock[0] === heldA
  && wA.vendorHolds.brandt.locks.length === 1);

leaveTown(wA);
check('A: leaving town empties the shelf but never the hold',
  wA.vendorStock.length === 0 && wA.vendorHolds.brandt.locks.length === 1);
enterTown(wA);
check('A: re-entry re-seats the reserved row — the very object, at its seat',
  wA.vendorStock[0] === heldA);

fund(wA);
const stockLenA = wA.vendorStock.length;
check('A: buying the reserved ware clears its row and frees the ledger',
  wA.buyVendorGem(0) === true
  && wA.vendorStock.length === stockLenA - 1
  && wA.vendorHolds.brandt.locks.length === 0);
check('A: the purchase stamps the market ledger',
  (wA.account.ledger[LEDGER_VENDOR_BOUGHT] ?? 0) >= 1);

{
  // The Vault's discovery gate reads the same stamp.
  const fresh = makeAccount();
  const lock1 = allUnlockables().find(u => u.id === 'feat_vendor_lock_1')!;
  const met = makeAccount();
  met.ledger[LEDGER_VENDOR_BOUGHT] = 1;
  check('A: the Vault hides the ladder until the account has traded',
    !isUnlockVisible(fresh, lock1) && isUnlockVisible(met, lock1));
}

// ------------------------------------------------ B. SAVE FIDELITY
{
  const heldNow = wA.vendorStock[3];
  check('B: (setup) a gem row reserved for the ride',
    !!heldNow && wA.setVendorLock('brandt', 3, true) === true);
  const ws = wA.serializeWorldState();
  const savedHold = ws.vendorHolds?.brandt;
  check('B: the hold rides the save (row, seat, loot arm)',
    !!savedHold && savedHold.locks.length === 1 && savedHold.locks[0].idx === 3);

  seedGlobalRandom(0x77e2);
  const wB = makeSimWorld('warrior', SEED_A);
  for (const r of rungs) wB.account.features.add(r.flag);
  check('B: adoptWorldState stands the hold back up', wB.adoptWorldState(ws) === true
    && wB.vendorHolds.brandt?.locks.length === 1);
  wB.loadZone(START_ZONE);
  const seated = wB.vendorStock[3];
  check('B: the restored row arms at its seat wearing its identity',
    !!seated && entryId(seated) === entryId(heldNow)
    && (seated.kind !== 'skill' || heldNow.kind !== 'skill'
      || (seated.inst.rarity === heldNow.inst.rarity && seated.inst.level === heldNow.inst.level)));

  // A stateless world writes NO holds (empty is not load-bearing here).
  seedGlobalRandom(0x77e2);
  const wEmpty = makeSimWorld('warrior', 0x51c9);
  wEmpty.loadZone(START_ZONE);
  check('B: a holdless world saves no vendorHolds field',
    wEmpty.serializeWorldState().vendorHolds === undefined);
}

// ------------------------------------------------ B2. the sanitizer's floor
{
  const town = wA.zoneMap[START_ZONE];
  const goodRow = { idx: 2, loot: { kind: 'skill' as const, skillId: STARTER_SKILLS[0], level: 1, rarity: 'common' as const, sockets: [null] } };
  const raw: Record<string, unknown> = {
    brandt: {
      locks: [
        goodRow,
        { idx: 0, loot: { kind: 'skill', skillId: 'no_such_skill', level: 1, rarity: 'common', sockets: [] } },
        { idx: -4, loot: goodRow.loot },
        { idx: 1, loot: { kind: 'support', supportId: 'no_such_support', level: 1 } },
        null, 42, { idx: 1 },
      ],
      commission: { kind: 'skill', id: STARTER_SKILLS[0] },
      ordinal: 12.7,
    },
    chandler: { locks: [], commission: { kind: 'support', id: 'no_such_support' } },
    nobody: { locks: [goodRow] },
    [`brandt@${START_ZONE}`]: { locks: [goodRow] },
    'brandt@gone_zone': { locks: [goodRow] },
  };
  const out = sanitizeVendorHolds(raw, { [START_ZONE]: town });
  check('B2: the good row + order survive; garbage rows drop',
    out.brandt?.locks.length === 1 && out.brandt.locks[0].idx === 2
    && out.brandt.commission?.id === STARTER_SKILLS[0] && out.brandt.ordinal === 12,
    JSON.stringify(out.brandt?.locks.map(r => r.idx)));
  check('B2: an order for a de-registered gem releases (its hold drops empty)',
    out.chandler === undefined);
  check('B2: an unregistered counter drops; a dead site-scope drops with its ground',
    out.nobody === undefined && out['brandt@gone_zone'] === undefined
    && out[`brandt@${START_ZONE}`]?.locks.length === 1);
  check('B2: pure garbage never throws',
    Object.keys(sanitizeVendorHolds(['nonsense', { a: 1 }], {})).length === 0
    && Object.keys(sanitizeVendorHolds(null, {})).length === 0);
}

// ------------------------------------------------ C. THE DROP INDEX
{
  seedGlobalRandom(0x77e2);
  const wC = makeSimWorld('warrior', 0x2b31);
  enterTown(wC);
  const snapshot = (): string => JSON.stringify(
    Object.entries(wC.account.ledger).filter(([k]) => k.startsWith('gemdrop')).sort());
  const before = snapshot();
  wC.dropGemAt(wC.player.pos);
  const minted = wC.drops[wC.drops.length - 1];
  const mintedId = minted.item.kind === 'skill' ? minted.item.inst.def.id
    : minted.item.kind === 'support' ? minted.item.gem.def.id : '';
  check('C: a genuine mint stamps the index + the total',
    snapshot() !== before
    && (wC.account.ledger[gemDropKey(mintedId)] ?? 0) >= 1
    && (wC.account.ledger[LEDGER_GEMDROP_TOTAL] ?? 0) >= 1, mintedId);

  // A DISCARD moves owned goods — never a mint. (Pick the minted gem up
  // first: updateDrops is the pickup path; shortcut straight to the bag.)
  const afterMint = snapshot();
  if (minted.item.kind === 'skill') wC.localSeat.meta.skillInv.push(minted.item.inst);
  else if (minted.item.kind === 'support') wC.localSeat.meta.inventory.push(minted.item.gem);
  wC.drops.pop();
  wC.dropFromInventory(wC.localSeat, minted.item.kind === 'skill' ? 'skill' : 'support', 0);
  check('C: a player discard never feeds the index', snapshot() === afterMint);

  // A counter purchase moves stock — never a mint.
  fund(wC);
  const afterDiscard = snapshot();
  check('C: a counter purchase never feeds the index',
    wC.buyVendorGem(0) === true && snapshot() === afterDiscard);
}

// ------------------------------------------------ D. THE STANDING ORDER
{
  const SEED_D = 0x66d3;
  seedGlobalRandom(0x77e2);
  const wD = makeSimWorld('warrior', SEED_D);
  enterTown(wD);
  const skillId = STARTER_SKILLS[0];
  const supId = STARTER_SUPPORTS[0];

  check('D: no rung, no order', wD.setVendorCommission('brandt', { kind: 'skill', id: skillId }) === false);
  wD.account.features.add(FEATURE.VENDOR_COMMISSION);
  check('D: an unknown gem refuses',
    wD.setVendorCommission('brandt', { kind: 'skill', id: 'no_such_gem' }) === false);
  check('D: an index below the need refuses',
    wD.setVendorCommission('brandt', { kind: 'skill', id: skillId }) === false);
  wD.account.ledger[gemDropKey(skillId)] = need;
  wD.account.ledger[gemDropKey(supId)] = need;
  check('D: a support refuses at HONEST zero odds while Brandt sells none',
    wD.commissionOdds({ kind: 'support', id: supId }) === 0
    && wD.setVendorCommission('brandt', { kind: 'support', id: supId }) === false);
  wD.account.features.add(FEATURE.BRANDT_SELL_SUPPORTS);
  check('D: once supports sell, the same support prices real odds',
    wD.commissionOdds({ kind: 'support', id: supId }) > 0);

  const p = wD.commissionOdds({ kind: 'skill', id: skillId });
  check('D: the shelf odds are honest (0 < p ≤ 1)', p > 0 && p <= 1, `p=${p.toFixed(4)}`);
  check('D: a KNOWN gem places the order',
    wD.setVendorCommission('brandt', { kind: 'skill', id: skillId }) === true
    && wD.vendorHolds.brandt.commission?.id === skillId);
  check('D: the watch starts at the CURRENT beat (no retroactive windfall)',
    wD.vendorHolds.brandt.ordinal === Math.floor(wD.time / RESTOCK_SEC));

  // Bank the pre-resolution save for the replay rig, then resolve away beats.
  const wsPre = wD.serializeWorldState();
  const BEATS = 400; // p≈>0.05 folded over 400 beats — a miss is ~impossible
  leaveTown(wD);
  wD.time += BEATS * RESTOCK_SEC;
  enterTown(wD);
  const found1 = commRow(wD);
  check('D: the away watch resolves and seats the find RESERVED',
    !!found1 && entryId(found1.entry) === skillId
    && wD.vendorStock[found1.idx] === found1.entry);
  check('D: the order still stands (fulfilled by PURCHASE, not by the find)',
    wD.vendorHolds.brandt.commission?.id === skillId);
  const rarity1 = found1?.entry.kind === 'skill' ? found1.entry.inst.rarity : undefined;

  // THE REPLAY: the same save, the same clock — the identical find (seat,
  // gem, rarity). World seed × counter × gem × beat is the whole roll.
  seedGlobalRandom(0x77e2);
  const wR = makeSimWorld('warrior', SEED_D);
  wR.account.features.add(FEATURE.VENDOR_COMMISSION);
  wR.account.features.add(FEATURE.BRANDT_SELL_SUPPORTS);
  wR.account.ledger[gemDropKey(skillId)] = need;
  wR.account.ledger[gemDropKey(supId)] = need;
  check('D: (replay) the save stands back up', wR.adoptWorldState(wsPre) === true);
  wR.time += BEATS * RESTOCK_SEC;
  enterTown(wR);
  const found2 = commRow(wR);
  check('D: a reload replays the IDENTICAL find — seat, gem, rarity',
    !!found2 && !!found1
    && found2.idx === found1.idx
    && entryId(found2.entry) === entryId(found1.entry)
    && (found2.entry.kind === 'skill' ? found2.entry.inst.rarity : undefined) === rarity1,
    `rarity=${String(rarity1)}`);

  // Purchase FULFILLS: the order clears and later restocks seat nothing new.
  fund(wD);
  check('D: buying the find fulfills the standing order',
    !!found1 && wD.buyVendorGem(found1.idx) === true
    && wD.vendorHolds.brandt.commission === undefined
    && commRow(wD) === undefined);
  wD.restockVendor();
  check('D: a fulfilled order stays fulfilled (no re-seat)', commRow(wD) === undefined);

  // Release-unbought RESUMES the watch; withdrawal releases order + find.
  check('D: (re-place for the release rig)',
    wD.setVendorCommission('brandt', { kind: 'skill', id: skillId }) === true);
  leaveTown(wD);
  wD.time += BEATS * RESTOCK_SEC;
  enterTown(wD);
  const found3 = commRow(wD);
  check('D: the re-placed watch finds again', !!found3);
  check('D: releasing the find unbought keeps the order armed',
    !!found3 && wD.setVendorLock('brandt', found3.idx, false) === true
    && wD.vendorHolds.brandt.commission?.id === skillId
    && commRow(wD) === undefined);
  leaveTown(wD);
  wD.time += BEATS * RESTOCK_SEC;
  enterTown(wD);
  check('D: the resumed watch finds anew', commRow(wD) !== undefined);
  check('D: withdrawal releases order and find together',
    wD.setVendorCommission('brandt', null) === true
    && wD.vendorHolds.brandt.commission === undefined && commRow(wD) === undefined);

  // The find is EXEMPT from the reserve cap (rung 1 only: one reserve +
  // the find coexist; a second reserve still refuses).
  wD.account.features.add(rungs[0].flag);
  check('D: (setup) one reserve fills rung one', wD.setVendorLock('brandt', 0, true) === true);
  check('D: (setup) the order re-places', wD.setVendorCommission('brandt', { kind: 'skill', id: skillId }) === true);
  leaveTown(wD);
  wD.time += BEATS * RESTOCK_SEC;
  enterTown(wD);
  check('D: the find seats BESIDE a full reserve ledger (cap-exempt)',
    commRow(wD) !== undefined && wD.vendorHolds.brandt.locks.length === 2);
  check('D: the reserve cap still binds ordinary rows',
    wD.setVendorLock('brandt', wD.vendorStock.findIndex(e => !wD.vendorEntryHold('brandt', e)), true) === false);

  // The Vault's commission card: hidden until the index has SEEN loot.
  const bare = makeAccount();
  bare.ledger[LEDGER_VENDOR_BOUGHT] = 1;
  const comm = allUnlockables().find(u => u.id === 'feat_vendor_commission')!;
  const seen = makeAccount();
  seen.ledger[LEDGER_VENDOR_BOUGHT] = 1;
  seen.features.add(rungs[0].flag);
  seen.ledger[LEDGER_GEMDROP_TOTAL] = VENDOR_CFG.commission.discoverTotal;
  check('D: the Vault hides the order until the index has seen loot (and the first rung is owned)',
    !isUnlockVisible(bare, comm) && isUnlockVisible(seen, comm));
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
