import assert from 'node:assert/strict';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { FEATURE, LEDGER_BOUNTY_CRAFT_DONE, makeAccount, serializeAccount, deserializeAccount, questDoneKey } from '../src/meta/account';
import { allUnlockables, isUnlockVisible, investUnlock } from '../src/meta/unlocks';
import { VENDOR_CFG, VENDORS } from '../src/data/vendors';
import { BRANDT_CFG } from '../src/data/brandt';
import { BOUNTY_BOARD_CFG, type BountyPosting } from '../src/data/bountyboard';
import { BRANDT_HAMMER_QUEST } from '../src/data/npcDialogues';
import { ITEM_BASES } from '../src/data/itembases';
import { rollItem } from '../src/engine/itemgen';
import { collectAttention } from '../src/world/attention';
import { liveActorPortrait } from '../src/render/actorPortrait';
import { mergeLedger } from '../src/packages/ledger';
bootSimEngine(); let passed = 0;
const test = (name: string, fn: () => void) => { fn(); passed++; console.log('PASS ' + name); };
const smithDef = VENDORS.find(v => v.id === 'brandt')!;
const row = (id: string) => allUnlockables().find(u => u.id === id)!;
const town = (seed = 1255) => {
  const w = makeSimWorld('warrior', seed); w.loadZone('lastlight');
  const smith = w.actors.find(a => a.defId === 'townsfolk_smith')!;
  w.player.pos = { x: smith.pos.x + 10, y: smith.pos.y }; return { w, smith };
};
test('Fresh Brandt buys scrap and sells only white equipment', () => {
  const { w } = town(); assert.ok(w.nearScrapVendor()); assert.equal(w.vendorTradeRefusal(smithDef), null);
  assert.equal(w.buyAbilityEssence('brandt', 1), false);
  for (const level of [1, 15, 60]) {
    w.player.level = level;
    for (let i = 0; i < 25; i++) {
      w.time = i * VENDOR_CFG.restock.baseSec; const stock = w.armVendorStock('brandt');
      assert.equal(stock.length, 3);
      for (const e of stock) { assert.equal(e.kind, 'item'); if (e.kind === 'item') { assert.equal(e.item.rarity, 'common'); assert.ok(!e.item.mem && !e.item.gem); } }
    }
  }
  w.localSeat.meta.essences.coarse = 9999;
  assert.ok(w.buyVendorGem(0));
  const item = w.meta.items.find(i => !i.gem && !i.mem)!; assert.ok(item);
  const money = w.meta.essences.coarse; w.salvageItem(w.localSeat, item.uid, 'sell');
  assert.ok(!w.meta.items.some(i => i.uid === item.uid)); assert.ok(w.meta.essences.coarse > money);
});
test('Rarity ceilings reject family promotions and explicit contradictions', () => {
  const base = Object.values(ITEM_BASES).find(b => b.minRarity && b.minRarity !== 'common')!;
  assert.ok(base);
  assert.equal(rollItem({ ilvl: 80, baseId: base.id, rarity: 'common', rarityCeiling: 'common' }), null);
  assert.equal(rollItem({ ilvl: 80, rarity: 'rare', rarityCeiling: 'magic' }), null);
});
test('Magic stock and old saved reservations respect rarity gates', () => {
  const { w } = town(); w.account.features.add(FEATURE.BRANDT_MAGIC_WARES); let magic = 0;
  for (let i = 0; i < 20; i++) {
    w.time = i * VENDOR_CFG.restock.baseSec;
    for (const e of w.armVendorStock('brandt')) if (e.kind === 'item') {
      assert.ok(['common', 'magic'].includes(e.item.rarity)); magic += Number(e.item.rarity === 'magic');
    }
  }
  assert.ok(magic > 0);
  const rare = rollItem({ ilvl: 10, rarity: 'rare' })!;
  w.vendorStock = [{ kind: 'item', item: rare }]; w.meta.essences.coarse = 9999;
  assert.equal(w.buyVendorGem(0), false); assert.equal(w.vendorStock.length, 1); assert.equal(w.meta.essences.coarse, 9999);
  w.vendorHolds.brandt = { watchedSec: w.time, locks: [{ entry: w.vendorStock[0], idx: 0 }] };
  assert.equal(w.armVendorStock('brandt').length, 3);
  assert.equal(w.vendorHolds.brandt.locks.length, 0, 'unavailable old reservations cannot trap reserve capacity');
  w.account.features.add(FEATURE.VENDOR_GEMS);
  assert.ok(w.armVendorStock('brandt').some(e => e.kind === 'skill'));
  assert.ok(!w.armVendorStock('brandt').some(e => e.kind === 'support'));
});
test('Early investment and both gated ten-tier ladders', () => {
  const a = makeAccount(); a.credits = 10000;
  for (const family of ['restock', 'wares']) {
    for (let i = 1; i <= 3; i++) {
      const u = row(`feat_vendor_${family}_${i}`); assert.ok(isUnlockVisible(a, u)); assert.equal(investUnlock(a, u, u.cost), u.cost);
    }
    assert.equal(isUnlockVisible(a, row(`feat_vendor_${family}_4`)), false);
  }
  const { w } = town(); w.time = 0; w.restockVendor(); assert.equal(w.vendorRestockAt, 1200);
  const times: number[] = [];
  for (const r of VENDOR_CFG.restock.ladder) { w.account.features.add(r.flag); w.restockVendor(); times.push(w.vendorRestockAt); }
  assert.deepEqual(times, [1110, 1020, 930, 840, 750, 660, 570, 480, 390, 300]);
  a.features.add(FEATURE.BRANDT_MAGIC_WARES);
  for (const family of ['restock', 'wares']) for (let i = 4; i <= 5; i++) {
    const u = row(`feat_vendor_${family}_${i}`); assert.ok(isUnlockVisible(a, u)); assert.equal(investUnlock(a, u, u.cost), u.cost);
  }
});
test('Ten actual craft-paying turn-ins qualify without save/death double counting', () => {
  const { w } = town(); w.account.features.add(FEATURE.BOUNTY_BOARD); w.loadZone('crossroads'); w.loadZone('lastlight');
  const board = w.bountyBoardsHere()[0]; assert.ok(board); w.player.pos = { ...board.pos };
  const zone = Object.values(w.zoneMap).find(z => z.id !== 'lastlight' && z.objective.kind !== 'safe' && !z.boundless)!;
  w.completedObjectives.add(zone.id);
  const pay = (id: number, craft: boolean, failed = false) => {
    const p: BountyPosting = { id: `bounty_brandt_test_${id}`, kind: 'charge', boardId: board.id, zoneId: zone.id, beat: 0,
      failed, pay: craft ? { craft: { category: 'helmet', complexity: 1 } } : { xp: 1 } };
    w.bountyHands.push(p); w.activeQuests.push({ questId: p.id, zoneId: zone.id, fieldDone: true });
    assert.ok(w.turnInBounty(p.id)); assert.equal(w.turnInBounty(p.id), false);
  };
  pay(0, true, true); pay(1, false); assert.equal(w.account.ledger[LEDGER_BOUNTY_CRAFT_DONE] ?? 0, 0);
  for (let i = 1; i <= 9; i++) pay(i + 1, true);
  const unlock = row(BRANDT_CFG.magicWares.unlock); assert.equal(isUnlockVisible(w.account, unlock), false);
  pay(11, true); assert.equal(w.account.ledger[LEDGER_BOUNTY_CRAFT_DONE], 10);
  assert.ok(isUnlockVisible(w.account, unlock)); assert.ok(!w.account.features.has(FEATURE.BRANDT_MAGIC_WARES));
  const saved = deserializeAccount(serializeAccount(w.account))!;
  mergeLedger(saved.ledger, w.ledger); assert.equal(saved.ledger[LEDGER_BOUNTY_CRAFT_DONE], 10);
  saved.credits = unlock.cost; assert.equal(investUnlock(saved, unlock, unlock.cost), unlock.cost);
  assert.ok(saved.features.has(FEATURE.BRANDT_MAGIC_WARES));
});
test('Board introduction follows the real anchor and has a durable completion receipt', () => {
  const { w } = town(); assert.deepEqual(w.boardIntroduction(), []);
  w.account.features.add(FEATURE.BOUNTY_BOARD); w.loadZone('crossroads'); w.loadZone('lastlight');
  const b = w.boardIntroduction()[0]; assert.ok(b);
  assert.ok(collectAttention(w).some(a => a.id === `board-introduction:${b.id}`));
  assert.deepEqual(b.pos, w.bountyBoardsHere()[0].pos);
  w.player.pos = { ...b.pos };
  w.armBountyBoard();
  const offer = w.bountyBoardView().offers[0]; assert.ok(offer); assert.ok(w.acceptBounty(offer.id));
  assert.equal(w.account.ledger[BOUNTY_BOARD_CFG.boardIntroduction.receipt], 1);
  assert.deepEqual(w.boardIntroduction(), []);
  assert.ok(!collectAttention(w).some(a => a.id.startsWith('board-introduction:')));
});
test('Body, portrait and dialogue share account/quest state', () => {
  const { w, smith } = town(); assert.equal(smith.look, 'npc_smith_unarmed'); assert.equal(liveActorPortrait(smith).look, smith.look);
  w.account.features.add(FEATURE.BOUNTY_BOARD); assert.equal(w.npcDialogues.dwell(smith)?.def.id, 'brandt_writ_hint');
  w.account.ledger[LEDGER_BOUNTY_CRAFT_DONE] = 10; assert.equal(w.npcDialogues.dwell(smith)?.def.id, 'brandt_magic_ready');
  w.account.features.add(FEATURE.BRANDT_MAGIC_WARES); assert.equal(w.npcDialogues.dwell(smith)?.def.id, 'brandt_magic_stock');
  w.account.ledger[questDoneKey(BRANDT_HAMMER_QUEST)] = 1; w.npcSpeechView();
  assert.equal(smith.look, 'npc_smith'); assert.equal(liveActorPortrait(smith).look, 'npc_smith');
  assert.equal(w.npcDialogues.dwell(smith)?.def.id, 'brandt_hammer_remembered');
});
console.log(`BRANDT PROGRESSION: ${passed} scenarios passed`);
