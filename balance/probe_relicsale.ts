import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { FEATURE, deserializeAccount, serializeAccount } from '../src/meta/account';
import { RELIQUARY } from '../src/data/containers';
import { forgeItem } from '../src/engine/itemgen';
import { autoPlace } from '../src/engine/inventory';
import { isRelic, migrateRelicCarry } from '../src/engine/accountReliquary';
import { salvageItemYield, sellItemYield } from '../src/engine/crafting';
import { ESSENCE_IDS } from '../src/data/essences';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';

// Exercise the public sale/salvage actions with real account custody, not just
// the retirement helper. Each combination must pay once and survive stale saves.
for (const mode of ['sell', 'break'] as const) for (const bulk of [false, true]) for (const sealed of [false, true]) {
  const w = makeSimWorld('warrior', 28300);
  for (const rung of RELIQUARY.ladder) w.account.features.add(rung.feature);
  w.account.features.add(FEATURE.ORACLE_STONE); w.account.features.add(FEATURE.SALVAGE_STATION);
  w.account.ledger.oracle_rescued = 1;
  w.loadZone('lastlight'); w.player.pos = { ...w.stationAnchor('oracle')!.pos }; w.lastCombatAt = -999;
  w.meta.items.length = 0;
  const charm = () => forgeItem({ baseId: 'relic_charm', ilvl: 1, rarity: 'magic', affixes: [{ id: 'relic_life' }], quality: 1 })!;
  const equipped = charm(), stored = charm(), withdrawn = charm(), locked = charm(), fresh = charm();
  for (const i of [equipped, stored, withdrawn, locked]) {
    assert(autoPlace(w.meta.items, i)); w.oracleRelic(w.localSeat, i.uid, 'store');
  }
  w.oracleRelic(w.localSeat, equipped.uid, 'equip');
  for (const i of [withdrawn, locked]) w.withdrawRelic(w.localSeat, i.uid);
  locked.locked = true; assert(autoPlace(w.meta.items, fresh));
  if (sealed) { w.meta.modeId = 'immortal'; w.meta.modeStage = 1; }
  const saved = serializeCharacter(w), scope = saved.relicScope!;
  const legacy = [withdrawn, fresh].map(i => structuredClone(i));
  const snapshot = () => JSON.stringify({ account: serializeAccount(w.account), bag: w.meta.items, wallet: w.meta.essences });
  w.player.pos = { x: 0, y: 0 };
  const denied = snapshot();
  w.salvageItem(w.localSeat, withdrawn.uid, mode); w.salvageBulk(w.localSeat, 'item', undefined, mode);
  assert.equal(snapshot(), denied, 'station reach refusal is atomic');
  w.player.pos = { ...(mode === 'sell' ? w.actors.find(a => a.defId === 'townsfolk_smith')!.pos : w.townSeat('salvage')) };
  assert(mode === 'sell' ? w.nearScrapVendor() : w.stationReach('salvage'));
  const protectedState = snapshot();
  for (const i of [equipped, stored, locked]) w.salvageItem(w.localSeat, i.uid, mode);
  assert.equal(snapshot(), protectedState, 'equipped, stored and locked items are protected');
  w.salvageBulk(w.localSeat, 'item', 'rare', mode);
  assert.equal(snapshot(), protectedState, 'rarity filter applies to Relics');
  const guest=w.addSeat('relic-sale-guest',w.localSeat.meta.classDef,w.localSeat.input);
  guest.actor.pos={...w.player.pos};guest.actor.tier=w.player.tier;guest.meta.items.length=0;
  guest.meta.items.push(structuredClone(withdrawn));
  assert(mode==='sell'?w.nearScrapVendor(guest):w.stationReach('salvage',guest),'guest is in real station reach');
  assert(!w.canRetireRelics(guest),'guest cannot retire the host account collection');
  const guestState=JSON.stringify({bag:guest.meta.items,wallet:guest.meta.essences});
  w.salvageItem(guest,withdrawn.uid,mode);w.salvageBulk(guest,'item',undefined,mode);
  assert.equal(JSON.stringify({bag:guest.meta.items,wallet:guest.meta.essences}),guestState,'guest requests refuse without consuming or paying');
  assert.equal(snapshot(),protectedState,'guest requests leave account custody and host wallet unchanged');
  w.clientActionHook=()=>{};assert(!w.canRetireRelics(w.localSeat),'render client cannot advertise account retirement');w.clientActionHook=undefined;
  const before = { ...w.meta.essences }, lore = structuredClone(w.account.craftLore);
  const yields = [withdrawn, fresh].map(mode === 'sell' ? sellItemYield : salvageItemYield);
  if (bulk) w.salvageBulk(w.localSeat, 'item', 'magic', mode);
  else for (const i of [withdrawn, fresh]) w.salvageItem(w.localSeat, i.uid, mode);
  for (const id of ESSENCE_IDS) assert.equal((w.meta.essences[id] ?? 0) - (before[id] ?? 0),
    yields.filter(y => y.essence === id).reduce((n, y) => n + y.count, 0), `${mode}: exact receipt`);
  assert.deepEqual(w.meta.items, [locked]);
  assert.deepEqual(w.account.reliquary.items, [equipped, stored, locked]);
  assert.deepEqual(w.account.reliquary.carried, [locked.relicKey]);
  assert(w.account.reliquary.released.includes(withdrawn.relicKey!));
  assert(w.account.reliquary.released.includes(`legacy:${scope}:${fresh.uid}`));
  assert(w.accountDirty && w.charDirty, 'account removal and character proceeds are queued for persistence');
  if (mode === 'sell' || sealed) assert.deepEqual(w.account.craftLore, lore, 'selling and sealed salvage do not teach lore');
  const settled = snapshot();
  for (const i of [withdrawn, fresh]) w.salvageItem(w.localSeat, i.uid, mode);
  w.salvageBulk(w.localSeat, 'item', undefined, mode);
  assert.equal(snapshot(), settled, 'repeated requests never pay twice');
  const next = makeSimWorld('warrior', 28301);
  Object.assign(next.account, deserializeAccount(serializeAccount(w.account))!);
  assert(applySavedCharacter(next, saved));
  assert.deepEqual(next.meta.items.filter(isRelic).map(i => i.relicKey), [locked.relicKey]);
  const old = { items: legacy, equipped: {}, containers: { reliquary: [] } };
  migrateRelicCarry(next.account, old, scope, true);
  assert(!old.items.some(i => i.uid === withdrawn.uid || i.uid === fresh.uid), 'old keyed and unkeyed copies cannot return');
  assert.equal(next.account.reliquary.items.length, 3);
  console.log(`PASS ${mode}/${bulk ? 'bulk' : 'single'}/${sealed ? 'sealed Immortal' : 'mortal'}: exact proceeds, protection, retirement, reload and stale-save rejection`);
}
