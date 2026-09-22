import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { FEATURE, deserializeAccount, serializeAccount } from '../src/meta/account';
import { RELIQUARY } from '../src/data/containers';
import { forgeItem } from '../src/engine/itemgen';
import { autoPlace } from '../src/engine/inventory';
import { isRelic, migrateRelicCarry, migrateRelicCorpses } from '../src/engine/accountReliquary';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { captureLoot, DEATH_SCHEMA, type DeathRecord } from '../src/meta/death';
import { NullInput } from '../src/net/intent';

const charm = () => forgeItem({ baseId: 'relic_charm', ilvl: 1, rarity: 'magic' })!;
function fixture(seed: number) {
  const w = makeSimWorld('warrior', seed);
  for (const rung of RELIQUARY.ladder) w.account.features.add(rung.feature);
  w.account.features.add(FEATURE.ORACLE_STONE); w.account.ledger.oracle_rescued = 1;
  w.loadZone('lastlight'); w.player.pos = { ...w.stationAnchor('oracle')!.pos }; w.lastCombatAt = -999;
  const equipped = charm(), stored = charm(), withdrawn = charm(), unseated = charm(), fresh = charm();
  for (const i of [equipped, stored, withdrawn, unseated]) {
    assert(autoPlace(w.meta.items, i)); w.oracleRelic(w.localSeat, i.uid, 'store');
  }
  w.oracleRelic(w.localSeat, equipped.uid, 'equip');
  w.oracleRelic(w.localSeat, unseated.uid, 'equip'); w.containerTake(w.localSeat, 'reliquary', unseated.uid);
  w.withdrawRelic(w.localSeat, withdrawn.uid); assert(autoPlace(w.meta.items, fresh));
  assert.deepEqual(w.meta.items.filter(isRelic), [unseated, withdrawn, fresh]);
  withdrawn.locked = true; // Item locks never insure a pack against death.
  const lockerItem = forgeItem({ baseId: 'helmet_armor', ilvl: 1, rarity: 'magic' })!;
  return { w, equipped, stored, withdrawn, unseated, fresh, lockerItem };
}

for (const [mode, stage, cave] of [['mortal', 0, false], ['mortal', 0, true], ['immortal', 0, false], ['immortal', 1, false]] as const) {
  const { w, equipped, stored, withdrawn, unseated, fresh, lockerItem } = fixture(28000 + stage + (cave ? 10 : 0));
  w.meta.modeId = mode; w.meta.modeStage = stage; w.meta.charId = 'relic-death-vessel';
  if (mode === 'immortal') {
    w.account.roster.push({ charId: w.meta.charId, modeId: mode, slot: 11, classId: 'warrior', name: 'Test', level: 1, stage, savedAt: 0 });
    autoPlace(w.meta.items, lockerItem); w.personalStash(w.localSeat, lockerItem.uid, 'store');
  }
  // A switched-off Reliquary still protects its contents.
  w.reliquaryToggle(w.localSeat, false);
  const saved = serializeCharacter(w), before = structuredClone(w.account.reliquary);
  const scope = saved.relicScope!;
  const lostKeys = [withdrawn.relicKey!, unseated.relicKey!, `legacy:${scope}:${fresh.uid}`];
  const legacyCopies = [withdrawn, unseated, fresh].map(i => structuredClone(i));
  const allLoot = captureLoot(w.meta, { knownSkills: true, bagItems: true, equipment: true, containers: true });
  assert(!allLoot.items.some(row => row.kind === 'gear' && isRelic(row.item)), 'Relics never enter corpse loot, even under a bag-drop policy');
  if (cave) w.caveReturn = { zoneId: 'lastlight', pos: { ...w.player.pos }, entryFrom: null };
  w.kill(w.player);
  assert.deepEqual(w.account.reliquary.items, [equipped, stored], `${mode}/${stage}: only protected Relics survive`);
  assert.equal(w.account.reliquary.carried.length, 0);
  assert(!w.meta.items.some(isRelic));
  assert(lostKeys.every(k => w.account.reliquary.released.includes(k)));
  assert.deepEqual(w.account.reliquary.seated, before.seated);
  assert.deepEqual(w.account.reliquary.stash.cells, before.stash.cells);
  assert.equal(w.account.reliquary.enabled, false);
  assert(!w.drops.some(d => d.item.kind === 'gear' && isRelic(d.item.item)), 'no ground drops');
  // Main's mortal epilogue repeats capture; no corpse and cave early returns must still be safe.
  const settled = JSON.stringify(serializeAccount(w.account)); w.recordDeath();
  assert.equal(JSON.stringify(serializeAccount(w.account)), settled);
  if (mode === 'immortal') assert.equal(w.meta.stash?.items[0], lockerItem);
  if (mode === 'mortal') assert(w.gameOver);
  else if (stage === 0) assert.equal(w.meta.modeStage, 1);
  else assert(w.account.roster[0].fallen);
  const next = makeSimWorld('warrior', 28100);
  Object.assign(next.account, deserializeAccount(serializeAccount(w.account))!);
  assert(applySavedCharacter(next, saved), 'replay the pre-death character save');
  assert(!next.meta.items.some(isRelic), 'neither fresh nor withdrawn pack Relics can return from an old save');
  assert.equal(next.meta.containers.reliquary.length, 1);
  assert.equal(next.account.reliquary.items.length, 2);
  const legacy = { items: structuredClone(legacyCopies), equipped: {},
    containers: { reliquary: structuredClone(legacyCopies.filter(i => i.relicKey)) } };
  migrateRelicCarry(next.account, legacy, scope, true);
  assert.equal(legacy.items.length, 0); assert.equal(next.account.reliquary.items.length, 2);
  assert.deepEqual(legacy.containers.reliquary.map(i => i.relicKey), [equipped.relicKey]);
  const corpse = { schema: DEATH_SCHEMA, owner: 'p0', timestamp: 1, loot: { items: legacyCopies.filter(i => i.relicKey).map(item => ({ kind: 'gear', item })) } } as DeathRecord;
  migrateRelicCorpses(next.account, [corpse]); assert.equal(corpse.loot.items.length, 0); assert.equal(next.account.reliquary.items.length, 2);
  console.log(`PASS ${mode}/${stage}${cave ? ' cave' : ''}: pack loss, locked/withdrawn/unseated/fresh items, protected board/stash, idempotence and stale-save rejection`);
}

const { w, withdrawn } = fixture(28200);
const guest = w.addSeat('guest', w.meta.classDef, new NullInput());
w.kill(w.player); assert(w.player.downed); assert(w.meta.items.includes(withdrawn), 'revivable down is not a final death');
const loose = charm(); autoPlace(guest.meta.items, loose);
w.kill(guest.actor); assert(!w.meta.items.some(isRelic)); assert(!guest.meta.items.some(isRelic));
console.log('PASS co-op down preserves pack until party wipe; both seats lose pack Relics on final death');
