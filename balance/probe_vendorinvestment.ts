import assert from 'node:assert/strict';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { makeAccount, FEATURE, LEDGER_VENDOR_BOUGHT, LEDGER_BOUNTY_CRAFT_DONE, serializeAccount, deserializeAccount } from '../src/meta/account';
import { allUnlockables, investUnlock, isUnlockVisible } from '../src/meta/unlocks';
import { VENDOR_CFG } from '../src/data/vendors';
import { BRANDT_CFG } from '../src/data/brandt';
import { ITEM_AFFIXES } from '../src/data/itemaffixes';
import { itemGridSize, improveAffixQuality, rollItem } from '../src/engine/itemgen';
import { Rng } from '../src/core/rng';
import { BOUNTY_BOARD_CFG, type BountyPosting } from '../src/data/bountyboard';
import { ensureBountyRewardChoices, rollBudgetBountyPay } from '../src/data/bountyRewards';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';

bootSimEngine();
const row = (id: string) => allUnlockables().find(u => u.id === id)!;
const a = makeAccount(); a.credits = 100000;
for (const family of ['restock', 'wares']) {
  for (let i = 1; i <= 10; i++) {
    const u = row(`feat_vendor_${family}_${i}`); assert(u);
    if (i === 4) {
      a.features.delete(FEATURE.BRANDT_MAGIC_WARES);
      assert(!isUnlockVisible(a, u)); a.features.add(FEATURE.BRANDT_MAGIC_WARES);
    }
    if (i === 6) {
      a.features.delete(BRANDT_CFG.rareWares.flag);
      assert(!isUnlockVisible(a, u)); a.features.add(BRANDT_CFG.rareWares.flag);
    }
    assert(isUnlockVisible(a, u)); assert.equal(investUnlock(a, u, u.cost), u.cost);
  }
}
assert.equal(VENDOR_CFG.restock.baseSec, 1200); assert.equal(BOUNTY_BOARD_CFG.beatSec, 1200);
assert.equal(VENDOR_CFG.restock.baseSec - VENDOR_CFG.restock.ladder.reduce((n, r) => n + r.cutSec, 0), 300);
for (let i = 1; i <= 5; i++) {
  const u = row(`feat_vendor_quality_${i}`);
  const needed = i === 1 ? VENDOR_CFG.quality.requiresRestock : VENDOR_CFG.quality.ladder[i - 1].requiresWares;
  a.features.delete(needed); assert(!isUnlockVisible(a, u)); a.features.add(needed);
  assert.equal(investUnlock(a, u, u.cost), u.cost);
}
const reserve = makeAccount(); reserve.credits = 9999;
reserve.features.add(FEATURE.VENDOR_GEMS); reserve.ledger[LEDGER_VENDOR_BOUGHT] = 1;
assert(!isUnlockVisible(reserve, row('feat_vendor_lock_1')));
reserve.features.add(FEATURE.VENDOR_WARES_2); assert(!isUnlockVisible(reserve, row('feat_vendor_lock_1')));
reserve.features.add(FEATURE.VENDOR_RESTOCK_2);
assert.equal(investUnlock(reserve, row('feat_vendor_lock_1'), 80), 80);
assert(!isUnlockVisible(reserve, row('feat_vendor_lock_2'))); reserve.features.add('vendor_quality_2');
assert.equal(investUnlock(reserve, row('feat_vendor_lock_2'), 160), 160);
assert(!isUnlockVisible(reserve, row('feat_vendor_lock_3'))); reserve.features.add('vendor_quality_4');
assert.equal(investUnlock(reserve, row('feat_vendor_lock_3'), 280), 280);
assert.deepEqual(deserializeAccount(serializeAccount(a))!.features, a.features);
console.log('PASS ten-rank gates, five quality ranks, three reservations and account persistence');

const w = makeSimWorld('warrior', 1551); w.loadZone('lastlight');
a.features.add(FEATURE.VENDOR_GEMS); Object.assign(w.account, a);
const signature = (stock: typeof w.vendorStock) => JSON.stringify(stock, (k, v) => k === 'uid' ? undefined : v);
const curated = (item: ReturnType<typeof rollItem>) => !!item?.affixes.length
  && item.affixes.every(f => f.rolls.every(r => r >= VENDOR_CFG.quality.rollFloor && r <= 1))
  && item.affixes.some(f => f.tier <= ITEM_AFFIXES[f.id].tiers.findIndex(t => t.ilvl <= item.ilvl && (!t.magicOnly || item.rarity === 'magic')));
for (const level of [1, 10, 35, 80]) for (let beat = 0; beat < 8; beat++) {
  w.player.level = level; w.time = beat * 300;
  const stock = w.armVendorStock('brandt');
  assert.equal(signature(stock), signature(w.armVendorStock('brandt')), 'same-beat reload cannot reroll quality');
  const good = stock.filter(e => e.kind === 'item' && curated(e.item));
  assert(good.length >= 10, `quality quota at level ${level}, beat ${beat}`);
  assert(good.filter(e => e.kind === 'item' && e.item.rarity === 'magic').length >= 2);
  assert(stock.every(e => e.kind !== 'item' || e.item.rarity !== 'unique'));
  const pack = w.vendorGridPack(stock, { w: 4, h: 4 });
  assert(pack.pages > 1); assert.equal(pack.cells.size + pack.gemCells.size, stock.length);
  const occupied = new Set<string>();
  for (const [i, e] of stock.entries()) {
    const at = e.kind === 'item' ? pack.cells.get(e.item.uid)! : pack.gemCells.get(i)!;
    const size = e.kind === 'item' ? itemGridSize(e.item) : { w: 1, h: 1 };
    for (let x = at.x; x < at.x + size.w; x++) for (let y = at.y; y < at.y + size.h; y++) {
      assert(x < 4 && y < 4); const key = `${at.page}:${x}:${y}`;
      assert(!occupied.has(key), 'tiles may not overlap on a page'); occupied.add(key);
    }
  }
}
const held = rollItem({ baseId: 'helmet_armor', ilvl: 10, rarity: 'magic', rng: () => 0.1 })!;
w.vendorHolds.brandt = { watchedSec: w.time, locks: [{ idx: 0, entry: { kind: 'item', item: held } }] };
const before = JSON.stringify(held);
w.vendorStock = w.armVendorStock('brandt'); assert.equal(JSON.stringify(held), before);
assert(w.vendorStock.filter(e => e.kind === 'item' && e.item.uid !== held.uid && curated(e.item)).length >= 10);
const save = serializeCharacter(w), loaded = makeSimWorld('warrior', 1551); Object.assign(loaded.account, a);
assert(applySavedCharacter(loaded, save));
assert(loaded.adoptWorldState(w.serializeWorldState())); loaded.loadZone('lastlight');
assert.equal(JSON.stringify(loaded.vendorHolds.brandt.locks[0].entry), JSON.stringify(w.vendorHolds.brandt.locks[0].entry));
const smith = loaded.actors.find(actor => actor.defId === 'townsfolk_smith')!;
loaded.player.pos = { ...smith.pos }; loaded.vendorStock = loaded.armVendorStock('brandt');
for (const id of Object.keys(loaded.meta.essences)) loaded.meta.essences[id as keyof typeof loaded.meta.essences] = 100000;
const pack = loaded.vendorGridPack(loaded.vendorStock);
const index = loaded.vendorStock.findIndex((e, i) => (e.kind === 'item' ? pack.cells.get(e.item.uid) : pack.gemCells.get(i))!.page > 0);
assert(index >= 0); const bought = loaded.vendorStock[index]; assert(loaded.buyVendorGem(index));
assert(!loaded.vendorStock.includes(bought));
console.log('PASS curated quotas, magic bases, no legendary leakage, stable shelves, paging, held-item reload and later-page purchase');

const ex = Object.values(ITEM_AFFIXES).find(d => d.tiers.some(t => t.magicOnly))!;
const exTier = ex.tiers.findIndex(t => t.magicOnly);
const affixes = [{ id: ex.id, tier: exTier, rolls: ex.lines.map(() => 0.2) }];
improveAffixQuality(affixes, 1, 'magic', VENDOR_CFG.quality, () => 0.5);
assert.equal(affixes[0].tier, exTier, 'curation must preserve naturally overrolled EX tiers');
for (const rarity of ['magic', 'rare'] as const) {
  const r1 = new Rng(771), r2 = new Rng(771);
  const ordinary = rollItem({ ilvl: 35, baseId: 'helmet_armor', rarity, rng: () => r1.next() })!;
  const better = rollItem({ ilvl: 35, baseId: 'helmet_armor', rarity, affixQuality: VENDOR_CFG.quality, rng: () => r2.next() })!;
  assert.deepEqual(better.affixes.map(f => f.id), ordinary.affixes.map(f => f.id));
  assert(better.affixes.every((f, i) => f.tier <= ordinary.affixes[i].tier));
  if (rarity === 'rare') assert(better.affixes.every(f => !ITEM_AFFIXES[f.id].tiers[f.tier].magicOnly));
}
console.log('PASS curation keeps families, natural EX overrolls and rare affix legality');

const host = { pickGemId: () => null };
for (let seed = 1; seed <= 30; seed++) {
  const posts: BountyPosting[] = [0, 1].map(i => ({ id: `bounty_${i}`, kind: 'cull', zoneId: 'crossroads', boardId: 'lastlight', beat: 0,
    pay: rollBudgetBountyPay(host, new Rng(seed + i), 10, undefined, seed % 2 ? 'coarse_cache' : 'field_pay') }));
  ensureBountyRewardChoices(posts, new Set(), host, new Rng(seed), BOUNTY_BOARD_CFG.starter.lanes);
  assert.equal(posts.filter(p => p.pay.craft && p.pay.essence?.length).length, 1);
  assert.equal(posts.filter(p => !p.pay.craft && !p.pay.xp && p.pay.essence?.length).length, 1);
  assert(posts.every(p => p.pay.level === 10));
  const snapshot = JSON.stringify(posts); posts.forEach(p => p.locked = true);
  ensureBountyRewardChoices(posts, new Set(posts.map(p => p.id)), host, new Rng(seed + 1), BOUNTY_BOARD_CFG.starter.lanes);
  assert.equal(JSON.stringify(posts.map(({ locked, ...p }) => p)), snapshot);
}
console.log('PASS writ-and-cash choice, frozen quest levels and pinned reward protection');

w.account.features.add(FEATURE.BOUNTY_BOARD);
w.loadZone('crossroads'); w.completedObjectives.add('crossroads'); w.loadZone('lastlight');
w.player.pos = { ...w.bountyBoardsHere()[0].pos };
const mixed: BountyPosting = { id: 'bounty_investment_writ', kind: 'charge', boardId: 'lastlight', zoneId: 'crossroads', beat: 0,
  pay: rollBudgetBountyPay(host, new Rng(12), 10, undefined, 'smith_writ') };
w.bountyHands.push(mixed); w.activeQuests.push({ questId: mixed.id, zoneId: mixed.zoneId, fieldDone: true });
const startDrops = w.drops.length, deeds = w.account.ledger[LEDGER_BOUNTY_CRAFT_DONE] ?? 0;
assert(w.turnInBounty(mixed.id)); assert(!w.turnInBounty(mixed.id));
const rewards = w.drops.slice(startDrops);
assert.equal(rewards.reduce((n, d) => n + (d.item.kind === 'essence' && d.item.essence === 'coarse' ? d.item.count : 0), 0),
  mixed.pay.essence!.find(c => c.essence === 'coarse')!.count);
assert.equal(w.account.ledger[LEDGER_BOUNTY_CRAFT_DONE], deeds + 1);
assert(rewards.some(d => d.item.kind === 'gear' && d.item.item.baseId === 'smith_writ' && d.item.item.ilvl === 10));
console.log('PASS combined payout drops exact essence and the frozen-level writ and qualifies exactly once');
