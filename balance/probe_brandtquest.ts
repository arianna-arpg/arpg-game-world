import assert from 'node:assert/strict';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { BRANDT_CFG, BRANDT_HAMMER_QUEST as HAMMER, BRANDT_TROPHY_QUEST as TROPHY } from '../src/data/brandt';
import { FEATURE, questDoneKey, serializeAccount, deserializeAccount } from '../src/meta/account';
import { allUnlockables, investUnlock, isUnlockVisible } from '../src/meta/unlocks';
import { QUESTS } from '../src/quests/defs';
import type { QuestDef } from '../src/quests/types';
import { World, type VendorEntry } from '../src/engine/world';
import { forgeItem, rebuildItem } from '../src/engine/itemgen';
import { autoPlace } from '../src/engine/inventory';
import { imbueOptions, mintQuestImbue, restoreQuestImbues } from '../src/engine/questImbue';
import { ITEM_AFFIXES } from '../src/data/itemaffixes';
import { ITEM_BASES } from '../src/data/itembases';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { Rng } from '../src/core/rng';
import type { RoughMemoryUnit, ItemInstance } from '../src/engine/items';
import { SKILLS } from '../src/data/skills';
import { makeSkillGem, type SkillRarity } from '../src/engine/skills';
bootSimEngine(); let passed = 0;
const test = (name: string, fn: () => void) => { fn(); passed++; console.log('PASS ' + name); };
const row = (id: string) => allUnlockables().find(u => u.id === id)!;
const town = (seed = 9274) => {
  const w = makeSimWorld('warrior', seed); w.loadZone('lastlight');
  const smith = w.actors.find(a => a.defId === 'townsfolk_smith')!;
  w.player.pos = { x: smith.pos.x + 10, y: smith.pos.y };
  w.player.level = 12; return w;
};
type Hooks = {
  acceptableQuests(): QuestDef[]; updateQuestGiver(dt: number): void;
  acceptQuest(q: QuestDef): void; completeObjective(label: string): void;
  onQuestZoneFieldCleared(zoneId: string): void; ensureQuestCargo(): void;
  onQuestZoneCleared(aq: World['activeQuests'][number]): void;
  resolveMemoryCut(seat: World['localSeat'], unit: RoughMemoryUnit, facet?: string): { kind: string; rarity?: SkillRarity };
  mintCommissionEntry(c: { kind: 'skill'; id: string }, rng: Rng, key: string): VendorEntry | null;
};
const hooks = (w: World) => w as unknown as Hooks;
const home = (w: World) => { w.loadZone('lastlight'); const s = w.actors.find(a => a.defId === 'townsfolk_smith')!; w.player.pos = { x: s.pos.x + 10, y: s.pos.y }; return s; };
const undertake = (w: World, id = HAMMER) => {
  w.account.features.add(FEATURE.BRANDT_MAGIC_WARES);
  assert.ok(hooks(w).acceptableQuests().some(q => q.id === id));
  hooks(w).updateQuestGiver(4);
  const aq = w.activeQuests.find(q => q.questId === id)!; assert.ok(aq);
  w.loadZone(aq.zoneId); assert.equal(w.zone.level, BRANDT_CFG.quest.level);
  const boss = w.actors.find(a => a.defId === BRANDT_CFG.quest.monster)!; assert.ok(boss);
  boss.dead = true; hooks(w).completeObjective('Cindermaw defeated');
  const drop = w.drops.find(d => d.item.kind === 'gear' && d.item.item.questId === id)!; assert.ok(drop);
  return { aq, drop };
};
const collect = (w: World, drop: World['drops'][number]) => {
  w.player.pos = { ...drop.pos }; w.player.tier = drop.tier ?? 0;
  for (let i = 0; i < 20 && w.drops.includes(drop); i++) w.pickupNearestGear(w.localSeat);
  assert.ok(!w.drops.includes(drop));
};
const finish = (w: World, id = HAMMER) => {
  const { aq, drop } = undertake(w, id); collect(w, drop); home(w);
  hooks(w).updateQuestGiver(4); assert.ok(w.completedQuests.has(id)); return aq;
};
const gear = () => forgeItem({ baseId: 'helmet_armor', ilvl: 10, rarity: 'magic', affixes: [{ id: 'life' }], rng: () => 0.5 })!;

test('Vault chain: magic → memories → reservations; hammer → rare → salvage', () => {
  const w = town(), a = w.account; a.credits = 99999;
  const memory = row('feat_vendor_gems'); assert.equal(isUnlockVisible(a, memory), false);
  a.features.add(FEATURE.BRANDT_MAGIC_WARES);
  assert.ok(isUnlockVisible(a, memory)); assert.equal(investUnlock(a, memory, memory.cost), memory.cost);
  const reserve = row('feat_vendor_lock_1'); assert.equal(isUnlockVisible(a, reserve), false);
  for (const [key, n] of Object.entries(reserve.reqLedgerCounts ?? {})) a.ledger[key] = n;
  if (reserve.reqLedger) for (const key of Array.isArray(reserve.reqLedger) ? reserve.reqLedger : [reserve.reqLedger]) a.ledger[key] = 1;
  assert.ok(isUnlockVisible(a, reserve)); assert.ok(!a.features.has(FEATURE.BRANDT_EXTRA_GEMS));
  assert.equal(isUnlockVisible(a, row(BRANDT_CFG.rareWares.unlock)), false);
  assert.equal(isUnlockVisible(a, row('feat_salvage_station')), false);
  a.ledger[questDoneKey(HAMMER)] = 1;
  const rare = row(BRANDT_CFG.rareWares.unlock); assert.ok(isUnlockVisible(a, rare));
  assert.equal(investUnlock(a, rare, rare.cost), rare.cost);
  assert.ok(isUnlockVisible(a, row('feat_salvage_station')));
});

test('Offer levels are seeded in 9–12, feature gated, and never missed by late heroes', () => {
  const w = town(), seen = new Set<number>();
  for (let seed = 1; seed <= 60; seed++) {
    const fixture = { manifest: { seed } } as World;
    const n = w.questOfferLevel.call(fixture, QUESTS[HAMMER]);
    assert.ok(n >= 9 && n <= 12); assert.equal(n, w.questOfferLevel.call(fixture, QUESTS[HAMMER])); seen.add(n);
  }
  assert.equal(seen.size, 4);
  w.player.level = 100; assert.ok(!hooks(w).acceptableQuests().some(q => q.id === HAMMER));
  w.account.features.add(FEATURE.BRANDT_MAGIC_WARES);
  w.player.level = w.questOfferLevel(QUESTS[HAMMER]) - 1;
  assert.ok(!hooks(w).acceptableQuests().some(q => q.id === HAMMER));
  w.player.level = 100; assert.ok(hooks(w).acceptableQuests().some(q => q.id === HAMMER));
});

test('A physical hammer must be collected, survives a full pack, and cannot be sold or dropped', () => {
  const w = town(), { aq, drop } = undertake(w);
  assert.equal(w.questStanding(aq), 'afield'); hooks(w).onQuestZoneCleared(aq); assert.equal(w.questImbues.length, 0);
  const cargo = drop.item.kind === 'gear' ? drop.item.item : null; assert.ok(cargo);
  const filler: ItemInstance = { ...cargo, questId: undefined, baseId: 'quest_trophy' };
  while (autoPlace(w.meta.items, { ...filler, uid: Math.random() * 1000000 })) { /* fill pack */ }
  w.player.pos = { ...drop.pos }; w.pickupNearestGear(w.localSeat); assert.ok(w.drops.includes(drop));
  w.meta.items = []; collect(w, drop); assert.equal(w.questStanding(aq), 'ready');
  assert.equal(rebuildItem(cargo)?.questId, HAMMER);
  home(w); w.salvageItem(w.localSeat, cargo.uid, 'sell'); w.salvageBulk(w.localSeat, 'item', undefined, 'sell');
  w.dropGearFromBag(w.localSeat, cargo.uid); assert.ok(w.meta.items.includes(cargo));
  hooks(w).updateQuestGiver(4); assert.ok(!w.meta.items.includes(cargo)); assert.equal(w.questImbues.length, 1);
  hooks(w).onQuestZoneCleared(aq); assert.equal(w.questImbues.length, 1);
  assert.ok(w.account.ledger[questDoneKey(HAMMER)]);
  assert.ok(isUnlockVisible(w.account, row(BRANDT_CFG.rareWares.unlock)));
  w.npcDialogues.refreshAppearances(); assert.equal(w.actors.find(a => a.defId === 'townsfolk_smith')!.look, 'npc_smith');
});

test('An expired ground cache restores the owed object once, only at its site', () => {
  const w = town(), { aq } = undertake(w);
  w.drops = []; hooks(w).ensureQuestCargo(); hooks(w).ensureQuestCargo();
  assert.equal(w.drops.filter(d => d.item.kind === 'gear' && d.item.item.questId === HAMMER).length, 1);
  home(w); hooks(w).ensureQuestCargo(); assert.ok(!w.drops.some(d => d.item.kind === 'gear' && d.item.item.questId === HAMMER));
  assert.equal(w.questStanding(aq), 'afield');
});

test('Deferred offers survive character/world resume and remain level 10 at hero level 100', () => {
  const w = town(); finish(w); const sealed = structuredClone(w.questImbues);
  const saved = JSON.parse(JSON.stringify(serializeCharacter(w)));
  const next = new World(w.account, w.manifest); next.createPlayer(w.meta.classDef, { startingFlasks: false, startingCompanions: false });
  assert.ok(applySavedCharacter(next, saved)); assert.ok(next.adoptWorldState(saved.world)); home(next);
  assert.deepEqual(next.questImbues, sealed); next.player.level = 100;
  assert.deepEqual(next.questImbues, sealed);
  for (const choices of Object.values(next.questImbues[0].offers)) for (const a of choices) {
    assert.ok(ITEM_AFFIXES[a.id].tiers[a.tier].ilvl <= BRANDT_CFG.quest.level);
    assert.ok(!ITEM_AFFIXES[a.id].tiers[a.tier].magicOnly);
  }
});

test('One chosen affix preserves existing lines and makes a valid two-affix rare exactly once', () => {
  const w = town(); finish(w); const item = gear(); assert.ok(item); assert.equal(item.affixes.length, 1);
  autoPlace(w.meta.items, item); const before = structuredClone(item.affixes), reward = w.questImbues[0];
  const opts = imbueOptions(reward, item); assert.ok(opts.length);
  const offered = structuredClone(opts); item.uid += 1000; assert.deepEqual(imbueOptions(reward, item), offered);
  assert.equal(w.claimQuestImbue(HAMMER, item.uid, 'not-an-offer'), false);
  assert.equal(w.claimQuestImbue(HAMMER, item.uid, opts[0].id, { ...w.localSeat, id: 'guest' }), false);
  item.locked = true; assert.equal(w.claimQuestImbue(HAMMER, item.uid, opts[0].id), false); item.locked = false;
  const at = { ...w.player.pos }; w.player.pos.x += 1000;
  assert.equal(w.claimQuestImbue(HAMMER, item.uid, opts[0].id), false); w.player.pos = at;
  assert.ok(w.claimQuestImbue(HAMMER, item.uid, opts[0].id));
  const result = w.meta.items.find(i => i.uid === item.uid)!;
  assert.equal(result.rarity, 'rare'); assert.equal(result.affixes.length, 2); assert.deepEqual(result.affixes.slice(0, 1), before);
  assert.deepEqual(result.affixes[1], opts[0]); assert.equal(rebuildItem(result)?.affixes.length, 2);
  assert.equal(w.claimQuestImbue(HAMMER, item.uid, opts[0].id), false); assert.equal(w.questImbues.length, 0);
  assert.deepEqual(restoreQuestImbues(w.serializeWorldState().questImbues), []);
  w.account.features.add(FEATURE.SALVAGE_STATION); home(w);
  assert.ok(w.stationReach('salvage', w.localSeat));
  const family = ITEM_AFFIXES[opts[0].id].family;
  assert.equal(w.account.craftLore[family]?.rank ?? 0, 0);
  w.salvageItem(w.localSeat, item.uid, 'break');
  assert.ok(!w.meta.items.some(i => i.uid === item.uid));
  assert.ok(w.account.craftLore[family] && (w.account.craftLore[family].rank > 0 || w.account.craftLore[family].progress > 0));
});

test('Later lives remember the hammer and earn one trophy imbue without repeating its lore', () => {
  const first = town(); finish(first);
  const w = town(4321); Object.assign(w.account, deserializeAccount(serializeAccount(first.account))!); const smith = home(w);
  assert.equal(smith.look, 'npc_smith'); assert.equal(w.questImbues.length, 0);
  assert.ok(!hooks(w).acceptableQuests().some(q => q.id === HAMMER));
  finish(w, TROPHY); assert.equal(w.questImbues.length, 1);
  assert.ok(!hooks(w).acceptableQuests().some(q => [HAMMER, TROPHY].includes(q.id)));
  assert.equal(w.npcDialogues.dwell(w.actors.find(a => a.defId === 'townsfolk_smith')!)?.def.id, 'brandt_trophy_imbue');
  const item = gear(); autoPlace(w.meta.items, item);
  assert.ok(w.questImbueOffers()[0].items.find(i => i.uid === item.uid)?.options.some(o => o.unstudied));
});

test('Memories, commissions and unopened traded pouches obey the wares ceiling', () => {
  const w = town(); w.account.features.add(FEATURE.VENDOR_GEMS); w.account.features.add(FEATURE.BRANDT_MAGIC_WARES);
  const sid = w.player.skills.find(Boolean)!.def.id; let rares = 0;
  for (const ceiling of ['magic', 'rare'] as const) {
    if (ceiling === 'rare') w.account.features.add(BRANDT_CFG.rareWares.flag);
    assert.equal(w.vendorMemoryCeiling('brandt'), ceiling);
    for (let n = 0; n < 150; n++) {
      w.time = n * 900;
      for (const e of w.armVendorStock('brandt')) {
        if (e.kind === 'skill') { assert.ok(['common', 'magic', ...(ceiling === 'rare' ? ['rare'] : [])].includes(e.inst.rarity!)); rares += Number(e.inst.rarity === 'rare'); }
        if (e.kind === 'item' && e.item.mem) for (const unit of e.item.mem) {
          assert.equal(unit.ceiling, ceiling);
          const restored = rebuildItem(JSON.parse(JSON.stringify(e.item)))!.mem![0];
          const cut = hooks(w).resolveMemoryCut(w.localSeat, restored);
          if (cut.kind === 'skill') assert.ok(['common', 'magic', ...(ceiling === 'rare' ? ['rare'] : [])].includes(cut.rarity!));
        }
      }
      const entry = hooks(w).mintCommissionEntry({ kind: 'skill', id: sid }, new Rng(n + 1), 'brandt');
      assert.ok(entry && w.vendorEntryAllowed('brandt', entry));
    }
  }
  assert.ok(rares > 0); assert.equal(w.vendorEntryAllowed('brandt', { kind: 'skill', inst: makeSkillGem(SKILLS[sid], 1, 'legendary') }), false);
  const early: RoughMemoryUnit = { d: 'traded', s: 992, ceiling: 'magic' };
  for (let n = 0; n < 100; n++) { early.s = n; const cut = hooks(w).resolveMemoryCut(w.localSeat, early, 'strength'); if (cut.kind === 'skill') assert.ok(['common', 'magic'].includes(cut.rarity!)); }
});

test('Saved offers are stable, family-compatible, and respect small relic caps', () => {
  const reward = mintQuestImbue(HAMMER, 54, 10, 3);
  assert.deepEqual(reward, mintQuestImbue(HAMMER, 54, 10, 3));
  assert.deepEqual(restoreQuestImbues(JSON.parse(JSON.stringify([reward]))), [reward]);
  assert.deepEqual(restoreQuestImbues([null, {}, { ...reward, level: NaN }]), []);
  for (const base of Object.values(ITEM_BASES).filter(b => b.category === 'relic')) {
    const item = forgeItem({ baseId: base.id, ilvl: 10, rarity: 'magic', rng: () => 0.5 })!;
    for (const a of imbueOptions(reward, item)) assert.ok(!item.affixes.some(x => ITEM_AFFIXES[x.id].family === ITEM_AFFIXES[a.id].family));
  }
});
console.log(`Brandt quest: ${passed} scenarios passed`);
