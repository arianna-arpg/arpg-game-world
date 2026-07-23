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
//   - THE MARKET CHAIN (rig E): the TRADE GATE refuses every purchase until
//     the Salvage Station is owned (browsing free, refusals mutate nothing);
//     the GEM CASE refuses gem buys until its own unlock; the BROADER-WARES
//     ladder widens gems AND gear by its rows' own numbers; THE COUNTER
//     GLASS seats every rolled piece deterministically and provably holds
//     the catalog's worst case (capacity law derived, never guessed); the
//     single-face builders roll clean (the delver's gems-only counter).
//   - THE GATEWORK AVENUES (rig F): a gated family rung hangs SEALED once
//     its chain is walked, and opens along ANY authored road — level /
//     vocation / quest, the player's own order — with the level stamp
//     REGISTERED by derivation (catalogLevelMilestones).
// Run: npx tsx balance/probe_vendorlocker.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import {
  FEATURE, STARTER_SKILLS, STARTER_SUPPORTS, gemDropKey,
  LEDGER_GEMDROP_TOTAL, LEDGER_VENDOR_BOUGHT, makeAccount,
  questDoneKey, reachedLevelKey, vocationUnlockKey,
} from '../src/meta/account';
import { VENDOR_CFG } from '../src/data/vendors';
import { sanitizeVendorHolds } from '../src/meta/worldstate';
import {
  allUnlockables, catalogLevelMilestones, isUnlockVisible, sealedUnlocks,
} from '../src/meta/unlocks';
import { START_ZONE } from '../src/data/zones';
import { MONSTERS } from '../src/data/monsters';
import { ESSENCE_IDS, VENDOR_ITEM_CFG } from '../src/data/essences';
import { ITEM_BASES } from '../src/data/itembases';
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
/** Open the market's meta gates (THE TRADE GATE + THE GEM CASE) so rigs that
 *  are not ABOUT those laws can buy freely — rig E owns the laws themselves.
 *  Neither flag touches a stock roll, so seeded determinism is unmoved. */
const openMarket = (w: World): void => {
  w.account.features.add(FEATURE.SALVAGE_STATION);
  w.account.features.add(FEATURE.VENDOR_GEMS);
};
const entryId = (e: VendorEntry): string =>
  e.kind === 'skill' ? e.inst.def.id : e.kind === 'support' ? e.gem.def.id : `item:${e.item.uid}`;
const commRow = (w: World, key = 'brandt') => w.vendorHolds[key]?.locks.find(r => r.commission);

// ------------------------------------------------ A. THE RESERVE LADDER
const SEED_A = 0x51c7;
seedGlobalRandom(0x77e2);
const wA: World = makeSimWorld('warrior', SEED_A);
openMarket(wA);
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
  // The Vault's ladder rung 1 stands at the CHAIN's far end now: the Gem
  // Counter + a Broader Wares rung owned AND the market ledger stamped —
  // the fresh account sees nothing, the walked one sees the card.
  const fresh = makeAccount();
  const lock1 = allUnlockables().find(u => u.id === 'feat_vendor_lock_1')!;
  const met = makeAccount();
  met.ledger[LEDGER_VENDOR_BOUGHT] = 1;
  met.features.add(FEATURE.VENDOR_GEMS);
  met.features.add(VENDOR_CFG.wares.ladder[0].flag);
  const chainOnly = makeAccount();
  chainOnly.features.add(FEATURE.VENDOR_GEMS);
  chainOnly.features.add(VENDOR_CFG.wares.ladder[0].flag);
  check('A: the Vault hides the ladder until the whole chain is walked + the account has traded',
    !isUnlockVisible(fresh, lock1) && !isUnlockVisible(chainOnly, lock1) && isUnlockVisible(met, lock1));
  check('A: the walked-but-untraded rung TEASES sealed (visible, unbuyable, its road printed)',
    sealedUnlocks(chainOnly).some(s => s.u.id === 'feat_vendor_lock_1')
    && !sealedUnlocks(fresh).some(s => s.u.id === 'feat_vendor_lock_1'));
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
  openMarket(wC);
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
  openMarket(wD);
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
  openMarket(wR);
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

  // The Vault's commission card: purchasable exactly when at least ONE gem
  // is ORDERABLE (some gemdrop:* key at the commission's own need — the
  // gatework's prefix avenue), never on a bare total.
  const bare = makeAccount();
  bare.ledger[LEDGER_VENDOR_BOUGHT] = 1;
  bare.features.add(rungs[0].flag);
  const comm = allUnlockables().find(u => u.id === 'feat_vendor_commission')!;
  const seen = makeAccount();
  seen.ledger[LEDGER_VENDOR_BOUGHT] = 1;
  seen.features.add(rungs[0].flag);
  seen.ledger[gemDropKey(skillId)] = need;
  const shallow = makeAccount();
  shallow.ledger[LEDGER_VENDOR_BOUGHT] = 1;
  shallow.features.add(rungs[0].flag);
  shallow.ledger[LEDGER_GEMDROP_TOTAL] = 999; // a wide index with no DEEP gem
  shallow.ledger[gemDropKey(skillId)] = need - 1;
  check('D: the Vault sells the order exactly when ONE gem is orderable (prefix ≥ need; totals prove nothing)',
    !isUnlockVisible(bare, comm) && !isUnlockVisible(shallow, comm) && isUnlockVisible(seen, comm));
  check('D: the hold-owning account TEASES the sealed order card with its road',
    sealedUnlocks(shallow).some(s => s.u.id === 'feat_vendor_commission'
      && s.lines.some(l => l.anyOf && !l.met)));
}

// ------------------------------------------------ E. THE MARKET CHAIN
// The trade gate, the gem case, the broader-wares fold, the counter glass,
// and the gatework avenues — the user's meta-progression as one walk.
{
  seedGlobalRandom(0x77e2);
  const wE = makeSimWorld('warrior', 0x3e11);
  enterTown(wE);
  fund(wE);

  // --- THE TRADE GATE: a bare account browses freely and buys NOTHING.
  const gearIdx = wE.vendorStock.findIndex(e => e.kind === 'item');
  const gemIdx = wE.vendorStock.findIndex(e => e.kind !== 'item');
  const stockLen = wE.vendorStock.length;
  const coarseBefore = wE.localSeat.meta.essences.coarse;
  check('E: the trade gate speaks while the station is unowned',
    typeof wE.vendorTradeRefusal() === 'string');
  check('E: a gated counter refuses GEAR — stock intact, essence unspent',
    gearIdx >= 0 && wE.buyVendorGem(gearIdx) === false
    && wE.vendorStock.length === stockLen
    && wE.localSeat.meta.essences.coarse === coarseBefore);
  check('E: a gated counter refuses GEMS the same', gemIdx >= 0 && wE.buyVendorGem(gemIdx) === false);

  // --- The station opens TRADE; the gem case stays shut on its own law.
  wE.account.features.add(FEATURE.SALVAGE_STATION);
  check('E: the salvage station opens the trade gate', wE.vendorTradeRefusal() === null);
  check('E: gear now sells', wE.buyVendorGem(wE.vendorStock.findIndex(e => e.kind === 'item')) === true);
  check('E: the gem case still refuses without its own unlock',
    wE.vendorGemsOpen() === false
    && wE.buyVendorGem(wE.vendorStock.findIndex(e => e.kind !== 'item')) === false);
  wE.account.features.add(FEATURE.VENDOR_GEMS);
  check('E: the gem counter unlock opens the case',
    wE.vendorGemsOpen() === true
    && wE.buyVendorGem(wE.vendorStock.findIndex(e => e.kind !== 'item')) === true);

  // --- THE BROADER-WARES FOLD: both faces widen per the ladder's own rows
  // (expectations DERIVED from config — nothing here counts to three).
  const countKinds = (w: World): { gems: number; gear: number } => ({
    gems: w.vendorStock.filter(e => e.kind !== 'item').length,
    gear: w.vendorStock.filter(e => e.kind === 'item').length,
  });
  wE.restockVendor();
  const base = countKinds(wE);
  check('E: the bare shelf is the configured base',
    base.gems === VENDOR_CFG.wares.baseGems && base.gear === VENDOR_ITEM_CFG.slots,
    `gems ${base.gems} gear ${base.gear}`);
  for (const r of VENDOR_CFG.wares.ladder) wE.account.features.add(r.flag);
  wE.restockVendor();
  const wide = countKinds(wE);
  const expGems = VENDOR_CFG.wares.baseGems + VENDOR_CFG.wares.ladder.reduce((n, r) => n + r.gems, 0);
  const expGear = VENDOR_ITEM_CFG.slots + VENDOR_CFG.wares.ladder.reduce((n, r) => n + r.gear, 0);
  check('E: the full ladder widens BOTH faces by its own numbers',
    wide.gems === expGems && wide.gear === expGear,
    `gems ${wide.gems}/${expGems} gear ${wide.gear}/${expGear}`);

  // --- THE COUNTER GLASS: every piece seats, deterministically, and the
  // board provably holds the WORST case (widest ladder × largest base) —
  // the capacity law derived from the catalog, so content that outgrows
  // the glass fails HERE, never silently in a panel.
  const pack1 = wE.vendorGridPack(wE.vendorStock);
  const pack2 = wE.vendorGridPack(wE.vendorStock);
  check('E: the glass seats every rolled piece', pack1.overflow.length === 0,
    `${pack1.cells.size} seated`);
  check('E: the pack is deterministic (same stock, same glass)',
    JSON.stringify([...pack1.cells.entries()]) === JSON.stringify([...pack2.cells.entries()]));
  const maxFoot = Object.values(ITEM_BASES).reduce((m, b) => Math.max(m, (b.w ?? 1) * (b.h ?? 1)), 1);
  check('E: the capacity law — the glass holds the worst case the catalog can roll',
    expGear * maxFoot <= VENDOR_CFG.gearGrid.w * VENDOR_CFG.gearGrid.h,
    `${expGear} pieces × ${maxFoot} cells ≤ ${VENDOR_CFG.gearGrid.w * VENDOR_CFG.gearGrid.h}`);

  // --- The single-face builders (the delver's gems-only counter).
  check('E: a gems-only build rolls no gear',
    wE.buildVendorStock({ gear: false }).every(e => e.kind !== 'item'));
  check('E: a gear-only build rolls no gems',
    wE.buildVendorStock({ gems: false }).every(e => e.kind === 'item'));
}

// ------------------------------------------------ F. THE GATEWORK AVENUES
// Rung 3 of the wares family opens along ANY of its authored roads — level,
// vocation, quest — in the player's own order; until then it hangs SEALED.
{
  const rung3 = allUnlockables().find(u => u.id === 'feat_vendor_wares_3')!;
  const walk = (): ReturnType<typeof makeAccount> => {
    const a = makeAccount();
    a.features.add(FEATURE.SALVAGE_STATION);
    a.features.add(VENDOR_CFG.wares.ladder[0].flag);
    a.features.add(VENDOR_CFG.wares.ladder[1].flag);
    return a;
  };
  const chained = walk();
  check('F: rung 3 hangs SEALED once rung 2 is owned (visible road, shut door)',
    !isUnlockVisible(chained, rung3)
    && sealedUnlocks(chained).some(s => s.u.id === 'feat_vendor_wares_3'
      && s.lines.filter(l => l.anyOf).length === (VENDOR_CFG.wares.ladder[2].gate?.length ?? 0)));
  check('F: an un-walked chain teases NOTHING (structure first, roads after)',
    !sealedUnlocks(makeAccount()).some(s => s.u.id === 'feat_vendor_wares_3'));

  const byLevel = walk();
  byLevel.ledger[reachedLevelKey(15)] = 1;
  const byVocation = walk();
  byVocation.ledger[vocationUnlockKey('warbringer')] = 1;
  const byQuest = walk();
  byQuest.ledger[questDoneKey('undead_south')] = 1;
  const byOldQuests = walk();
  byOldQuests.ledger.quests_completed = 3; // the pre-gatework spelling still speaks
  check('F: the LEVEL road opens rung 3 alone', isUnlockVisible(byLevel, rung3));
  check('F: the VOCATION road opens rung 3 alone', isUnlockVisible(byVocation, rung3));
  check('F: the QUEST road opens rung 3 alone', isUnlockVisible(byQuest, rung3));
  check('F: an old account\'s quests_completed counter opens the quest road',
    isUnlockVisible(byOldQuests, rung3));

  // THE MILESTONE DERIVATION: authoring the level avenue REGISTERED its
  // stamp — the catalog's own scan carries 15 (rung 3's road and the old
  // dead reached_level_15 gate both live now, one mechanism).
  check('F: catalogLevelMilestones carries every authored level road',
    catalogLevelMilestones().includes(15), catalogLevelMilestones().join(','));
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
