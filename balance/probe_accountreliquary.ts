import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { FEATURE, makeAccount, serializeAccount, deserializeAccount, sealReckoning } from '../src/meta/account';
import { RELIQUARY_CFG } from '../src/data/reliquary';
import { reliquaryCost, reliquaryPower, investReliquary } from '../src/meta/reliquary';
import { empowerRelicMods } from '../src/engine/relicPower';
import { migrateRelicCarry } from '../src/engine/accountReliquary';
import { forgeItem, compileItemMods, itemLevelReq, rollItem, rebuildItem, describeItem } from '../src/engine/itemgen';
import { rollRerolledAffix } from '../src/engine/crafting';
import { ITEM_AFFIXES, RELIC_AFFIXES } from '../src/data/itemaffixes';
import { RELIC_UNIQUES } from '../src/data/uniques/relics';
import { mulberry32 } from '../src/sim/rng';
import { autoPlace } from '../src/engine/inventory';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { captureLoot } from '../src/meta/death';
import { RELIQUARY } from '../src/data/containers';
import type { World } from '../src/engine/world';
import { mod, StatSheet } from '../src/engine/stats';
import { serializeSeatMeta, applySeatMeta } from '../src/net/snapshot';
import { migrateRelicCorpses } from '../src/engine/accountReliquary';
import { DEATH_SCHEMA, type DeathRecord } from '../src/meta/death';

const charm = (level = 1) => forgeItem({ ilvl: level, baseId: 'relic_charm', rarity: 'magic', affixes: [{ id: 'relic_life' }], quality: 1 })!;
const near = (a: number, b: number) => assert(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
function home(w: World): void {
  for (const r of RELIQUARY.ladder) w.account.features.add(r.feature);
  w.account.features.add(FEATURE.ORACLE_STONE); w.account.ledger.oracle_rescued = 1;
  w.loadZone('lastlight'); const anchor = w.stationAnchor('oracle')!;
  w.lastCombatAt = -999; w.player.pos = { ...anchor.pos }; w.player.invulnerable = true;
}
const a = makeAccount(); a.credits = 100;
assert.equal(investReliquary(a), 0);
a.ledger[RELIQUARY_CFG.attunement] = 1; a.credits = 10;
assert.equal(investReliquary(a), 10); assert.equal(a.reliquary.rank, 0);
sealReckoning(a); assert.equal(a.reliquary.invested, 10);
const savedAccount = deserializeAccount(serializeAccount(a))!;
savedAccount.credits = 1000;
assert.equal(investReliquary(savedAccount), 15); assert.equal(savedAccount.reliquary.rank, 1);
assert.equal(reliquaryCost(savedAccount.reliquary), 100); near(reliquaryPower(savedAccount.reliquary), 0.02);
assert.equal(investReliquary(savedAccount), 100); assert.equal(reliquaryCost(savedAccount.reliquary), 225);
near(reliquaryPower(savedAccount.reliquary), 0.04);
savedAccount.credits = NaN; assert.equal(investReliquary(savedAccount), 0);
console.log('PASS quadratic costs, linear power, partial investment, seal, save and invalid currency');

const raw = [mod('life', 'flat', 6), mod('damage', 'increased', 0.02), mod('companiongrant_summon_stone_golem', 'flat', 1),
  mod('summonReservation_summon_stone_golem', 'override', 0), mod('fireRes', 'flat', -0.2),
  mod('critChance', 'flat', 0.02), mod('unknown', 'flat', 1), mod('damage', 'flat', 0.5)];
raw[7].fromStat = 'life';
const powered = empowerRelicMods(raw, 1, 2);
assert.equal(powered[0].value, 24); assert.equal(powered[2].value, 1); assert.equal(powered[3].value, 0);
assert.equal(powered[4].value, -0.2); assert.equal(powered[6].value, 1); assert.equal(powered[7].value, 0.5);
assert.equal(raw[0].value, 6); assert.equal(empowerRelicMods(raw, 1e9)[5].value, 0.5);
const low = charm(), high = charm(80);
assert.equal(itemLevelReq(high), 1);
const lowValue = compileItemMods(low)[0].value, highValue = compileItemMods(high)[0].value;
assert.equal(highValue, lowValue); assert(highValue <= 8);
console.log('PASS reduced baseline, level-independent power, numeric allowlist, caps and immutable grants/tradeoffs');

// Discovery and value are separate: every family has its complete budget on
// debut, for both natural drops and the Oracle's existing reroll path.
for (const def of RELIC_AFFIXES) {
  const debut = RELIQUARY_CFG.affixDebut[def.id] ?? 1;
  assert(def.tiers.length >= 1 && def.tiers.length <= 2, def.id);
  assert.equal(def.tiers.filter(t => !t.magicOnly).length, 1, def.id);
  assert(def.tiers.every(t => t.ilvl === debut), def.id);
  for (const rarity of ['magic', 'rare'] as const) {
    for (const quality of [0, 0.5, 1]) {
      const opts = { baseId: 'relic_charm', rarity, affixes: [{ id: def.id }], quality };
      const first = forgeItem({ ...opts, ilvl: debut })!;
      const late = forgeItem({ ...opts, ilvl: 80 })!;
      assert.deepEqual(compileItemMods(first), compileItemMods(late), def.id);
      assert.deepEqual(describeItem(first).affix, describeItem(late).affix, def.id);
      assert.equal(itemLevelReq(late), 1);
      assert.equal(first.affixes[0].tier, rarity === 'magic' ? 0 : def.tiers.length - 1);
      assert.deepEqual(rollRerolledAffix(def, first, mulberry32(41)),
        rollRerolledAffix(def, late, mulberry32(41)), def.id);
    }
    for (let seed = 1; seed <= 16; seed++) {
      const opts = { baseId: 'relic_charm', rarity, withFamily: def.family, rng: mulberry32(seed) };
      const at = rollItem({ ...opts, ilvl: debut })!;
      const landed = at.affixes.find(a => a.id === def.id);
      assert(landed, `${def.id} available on debut`);
      assert(rarity === 'magic' || !def.tiers[landed.tier].magicOnly);
      if (debut > 1) {
        const before = rollItem({ ...opts, ilvl: debut - 1 })!;
        assert(!before.affixes.some(a => a.id === def.id), `${def.id} stays gated even on a themed drop`);
        assert.equal(rollRerolledAffix(def, before), null, `${def.id} reroll stays gated`);
      }
    }
  }
}
const dropRng = mulberry32(0xa771);
const discoveryLevels = [1, 4, 5, 8, 9, 11, 12, 15, 16, 19, 20, 23, 24, 80];
for (const ilvl of discoveryLevels) for (const rarity of ['magic', 'rare'] as const) {
  for (let i = 0; i < 100; i++) {
    const item = rollItem({ ilvl, rarity, baseId: 'relic_effigy', rng: dropRng })!;
    for (const a of item.affixes) {
      const def = ITEM_AFFIXES[a.id];
      assert((RELIQUARY_CFG.affixDebut[a.id] ?? 1) <= ilvl, `${a.id} dropped too early`);
      assert(def.tiers[a.tier] && (rarity === 'magic' || !def.tiers[a.tier].magicOnly));
    }
  }
}
const lifeDef = ITEM_AFFIXES.relic_life;
near(lifeDef.tiers[1].ranges[0][0], 5.44);
near(lifeDef.tiers[1].ranges[0][1], 6.4);
near(lifeDef.tiers[0].ranges[0][1], 6.592);
assert(ITEM_AFFIXES.relic_leech.tiers.every(t => !t.magicOnly));
assert(Object.values(ITEM_AFFIXES).some(d => !d.tags?.includes('relic') && d.tiers.length > 2
  && d.tiers[0].ilvl > d.tiers[d.tiers.length - 1].ilvl), 'ordinary equipment retains its level ladder');
console.log('PASS complete budgets at debut, all family boundaries, 2800 natural drops, rarity gates and Oracle parity');

// Retuned saved indices use the existing restore clamp. Identity, roll heat,
// locks and crafted flags survive; an old lower tier never disappears or
// becomes magic-exclusive on a rare. Already-owned late families remain usable.
for (const rarity of ['magic', 'rare'] as const) for (const tier of [1, 2, 3, 4, 5]) {
  const saved = forgeItem({ ilvl: 1, baseId: 'relic_charm', rarity,
    affixes: [{ id: 'relic_life' }], quality: 0.37 })!;
  saved.relicKey = 'probe:legacy'; saved.affixes[0].tier = tier;
  saved.affixes[0].locked = true; saved.affixes[0].crafted = true;
  const restored = rebuildItem(JSON.parse(JSON.stringify(saved)))!;
  assert.equal(restored.affixes[0].tier, 1);
  assert.equal(restored.relicKey, saved.relicKey);
  assert.deepEqual(restored.affixes[0].rolls, saved.affixes[0].rolls);
  assert(restored.affixes[0].locked && restored.affixes[0].crafted);
  assert.equal(compileItemMods(restored).length, 1);
  assert.equal(describeItem(restored).affix.length, 1);
  assert.deepEqual(rebuildItem(structuredClone(restored)), restored);
}
const legacyFamily = forgeItem({ ilvl: 1, baseId: 'relic_charm', rarity: 'rare',
  affixes: [{ id: 'relic_dmg_conjure', tier: 4 }], quality: 0.37 })!;
assert.equal(compileItemMods(rebuildItem(legacyFamily)!).length, 1);
for (const unique of RELIC_UNIQUES) for (const quality of [0, 0.5, 1]) {
  const opts = { uniqueId: unique.id, quality };
  const first = forgeItem({ ...opts, ilvl: unique.minIlvl ?? 1, rng: mulberry32(71) })!;
  const late = forgeItem({ ...opts, ilvl: 80, rng: mulberry32(71) })!;
  assert.deepEqual(compileItemMods(first), compileItemMods(late), unique.id);
}
console.log('PASS saved tiers retain rolls/identity/flags and all unique budgets stay independent of item level');

// Compiled, empowered conditional lines keep their predicates through the
// real stat fold. They must not leak into an unrelated condition or target.
for (const def of RELIC_AFFIXES.filter(d => d.lines.some(l => l.when || l.tags?.some(t => t.startsWith('vs:'))))) {
  const item = forgeItem({ ilvl: 80, baseId: 'relic_charm', rarity: 'rare',
    affixes: [{ id: def.id }], quality: 1 })!;
  const mods = compileItemMods(item), line = mods[0];
  assert(mods.length === 1 && line.value > 0);
  const sheet = new StatSheet();
  const tags = new Set(line.tags);
  const bare = sheet.get(line.stat, tags);
  sheet.setSource('container:reliquary', empowerRelicMods(mods, 1));
  near(sheet.get(line.stat), bare);
  if (line.when) sheet.setConditions([line.when]);
  const active = sheet.get(line.stat, tags);
  assert(active > bare, def.id);
  sheet.setSource('container:reliquary', mods);
  near(active - bare, (sheet.get(line.stat, tags) - bare) * 2);
  if (line.when) { sheet.setConditions([]); near(sheet.get(line.stat, tags), bare); }
  else near(sheet.get(line.stat), bare);
  sheet.removeSource('container:reliquary'); near(sheet.get(line.stat, tags), bare);
  assert(describeItem(item).affix[0].text.length > 0);
}
console.log('PASS specialized conditions/target scopes, attributable modifiers, empowerment and removal');

const w = makeSimWorld('warrior', 27180); home(w);
autoPlace(w.meta.items, low); const original = structuredClone(low);
const baseLife = w.player.maxLife();
w.containerPlace(w.localSeat, 'reliquary', low.uid, 1, 1);
assert.equal(w.account.reliquary.items.length, 1); assert.equal(w.meta.items.length, 0);
near(w.player.maxLife() - baseLife, lowValue);
w.account.reliquary.rank = 50; w.recalcPlayer(); near(w.player.maxLife() - baseLife, lowValue * 2);
w.recalcPlayer(); near(w.player.maxLife() - baseLife, lowValue * 2);
w.oracleAttune(w.localSeat); assert.equal(w.account.ledger[RELIQUARY_CFG.attunement], 1);
w.player.pos = { x: 0, y: 0 }; w.lastCombatAt = w.time;
w.containerTake(w.localSeat, 'reliquary', low.uid); assert.equal(w.meta.containers.reliquary.length, 1);
home(w);
w.oracleRelic({ ...w.localSeat, id: 'guest' }, low.uid, 'unseat'); assert.equal(w.meta.containers.reliquary.length, 1);
w.dropGearFromBag(w.localSeat, low.uid); assert.equal(w.meta.containers.reliquary.length, 1);
w.containerTake(w.localSeat, 'reliquary', low.uid);
assert.equal(w.meta.containers.reliquary.length, 0); assert.equal(w.meta.items.length, 1); near(w.player.maxLife(), baseLife);
w.oracleRelic(w.localSeat, low.uid, 'equip'); assert.equal(w.meta.containers.reliquary.length, 1);
assert(!captureLoot(w.meta).items.some(i => i.kind === 'gear' && i.item.relicKey));
const accountSave = serializeAccount(w.account), characterSave = serializeCharacter(w);
assert.equal(characterSave.containers?.reliquary.length, 0);
const next = makeSimWorld('warrior', 27181); Object.assign(next.account, deserializeAccount(accountSave)!);
home(next); next.restoreAccountRelics(next.localSeat); next.recalcPlayer();
assert.equal(next.meta.containers.reliquary.length, 1);
assert(applySavedCharacter(next, characterSave)); assert.equal(next.meta.containers.reliquary.length, 1);
near(next.player.maxLife(), w.player.maxLife());
(next as any).stripCarryOf(next.localSeat); assert.equal(next.meta.containers.reliquary.length, 1);
console.log('PASS host and station authority, account equipment/reserve, death, new life, character/account roundtrip, no double stats');

const legacy = structuredClone(characterSave); delete legacy.accountRelics;
legacy.containers = { reliquary: [{ ...original, x: 1, y: 1 }] }; legacy.items = [charm(70)];
const old = makeSimWorld('warrior', 27182); home(old);
assert(applySavedCharacter(old, legacy)); assert.equal(old.account.reliquary.items.length, 2);
assert.equal(old.meta.containers.reliquary.length, 1); assert.equal(old.meta.items.length, 0);
home(old); old.oracleRelic(old.localSeat, old.meta.containers.reliquary[0].uid, 'unseat');
assert(applySavedCharacter(old, legacy)); assert.equal(old.account.reliquary.items.length, 2);
assert.equal(old.meta.containers.reliquary.length, 0, 'stale save cannot reseat or duplicate');
const current = serializeCharacter(old); current.items = [charm()];
assert(applySavedCharacter(old, current)); assert.equal(old.meta.items.filter(i => !i.relicKey).length, 1, 'reload does not auto-bank modern loose finds');
// Canonical copy wins over an old character copy with changed affix rolls.
const stale = { items: [structuredClone(old.account.reliquary.items[0])], equipped: {}, containers: {} };
stale.items[0].affixes[0].rolls[0] = 0;
migrateRelicCarry(old.account, stale, 'other'); assert.equal(old.account.reliquary.items.length, 2);
assert.equal(stale.items.length, 1); assert(old.account.reliquary.items.includes(stale.items[0])); assert.equal(old.account.reliquary.items[0].affixes[0].rolls[0], 1);
console.log('PASS legacy bag/equipment migration, idempotency, stale save authority and loose-find reload distinction');

const mw = makeSimWorld('warrior', 27183); home(mw);
const idol = forgeItem({ ilvl: 30, uniqueId: 'unquarried_idol', quality: 1 })!;
autoPlace(mw.meta.items, idol); mw.containerPlace(mw.localSeat, 'reliquary', idol.uid, 1, 1);
mw.update(0.05);
const follower = mw.actors.find(a => a.owner === mw.player && a.summonInst?.companionGrant)!;
assert(follower); assert.equal(follower.summonInst?.relicSource, idol.relicKey);
assert(follower.sheet.hasSource('relic:' + idol.relicKey));
const damage = follower.sheet.get('damage'), life = follower.maxLife();
mw.player.sheet.setSource('probe:minions', [mod('minionDamage', 'increased', 10), mod('minionLife', 'increased', 10)]);
mw.recalcPlayer(); near(follower.sheet.get('damage'), damage); near(follower.maxLife(), life);
follower.life = follower.maxLife() * 0.4;
mw.account.reliquary.rank = 50; mw.recalcPlayer(); near(follower.sheet.get('damage'), damage * 2);
near(follower.life / follower.maxLife(), 0.4);
mw.player.level = 12; mw.recalcPlayer(); assert.equal(follower.level, 12);
home(mw); mw.reliquaryToggle(mw.localSeat, false); assert(follower.dead);
assert(!mw.player.skills.some(s => s?.relicSource === idol.relicKey));
mw.reliquaryToggle(mw.localSeat, true); mw.update(0.05);
const restoredFollower = mw.actors.find(a => !a.dead && a.owner === mw.player && a.summonInst?.relicSource === idol.relicKey)!;
assert(restoredFollower);
home(mw); mw.oracleRelic(mw.localSeat, idol.uid, 'unseat'); assert(restoredFollower.dead);
console.log('PASS Relic minion provenance, explicit level/power scaling, ordinary-stat isolation, no free heal and removal');

const edge = makeSimWorld('warrior', 27184); home(edge);
edge.account.features = new Set([FEATURE.RELIQUARY, FEATURE.ORACLE_STONE]);
edge.account.ledger.reliquary_lesson = 1;
const first = charm(), second = charm();
autoPlace(edge.meta.items, first); edge.containerPlace(edge.localSeat, 'reliquary', first.uid);
autoPlace(edge.meta.items, second);
const before = JSON.stringify(serializeAccount(edge.account));
edge.containerPlace(edge.localSeat, 'reliquary', second.uid);
assert.equal(JSON.stringify(serializeAccount(edge.account)), before, 'full board leaves account unchanged');
edge.containerPlace(edge.localSeat, 'reliquary', second.uid, 2, 2);
assert.equal(JSON.stringify(serializeAccount(edge.account)), before, 'sealed cell leaves account unchanged');
const staleGround = structuredClone(second);
edge.containerPlace(edge.localSeat, 'reliquary', second.uid, 1, 1);
assert.equal(edge.meta.containers.reliquary[0], second); assert.equal(edge.account.reliquary.items.length, 2);
assert.deepEqual(edge.meta.items, [first]); assert(!edge.account.reliquary.seated.includes(first.relicKey!));
edge.dropGearAt(edge.player.pos, staleGround, undefined, true);
edge.pickupNearestGear(edge.localSeat); assert.deepEqual(edge.meta.items, [first], 'old ground state cannot duplicate a deposit');
edge.account.reliquary.rank = 12; edge.recalcPlayer();
const wire = serializeSeatMeta(edge.localSeat);
const client = makeSimWorld('warrior', 27185); home(client); client.clientActionHook = () => {};
client.account.reliquary.rank = 900;
applySeatMeta(client, client.localSeat, wire);
near(client.meta.relicEmpowerment!, 0.24); near(client.player.maxLife(), edge.player.maxLife());
const untouched = JSON.stringify(serializeAccount(client.account));
client.oracleRelic(client.localSeat, second.uid, 'unseat'); client.oracleAttune(client.localSeat);
assert.equal(JSON.stringify(serializeAccount(client.account)), untouched);
const corpseRelic = charm();
const corpse = { schema: DEATH_SCHEMA, timestamp: 500, owner: 'p0', loot: { items: [{ kind: 'gear', item: corpseRelic }] } } as DeathRecord;
const oldCorpse = structuredClone(corpse);
const corpseAccount = makeAccount(); migrateRelicCorpses(corpseAccount, [corpse]);
assert.equal(corpseAccount.reliquary.items.length, 1); assert.equal(corpse.loot.items.length, 0);
migrateRelicCorpses(corpseAccount, [oldCorpse]); assert.equal(corpseAccount.reliquary.items.length, 1);
console.log('PASS atomic full/sealed refusal, one-occupant swap, stale ground suppression, host-derived client view and corpse migration');
