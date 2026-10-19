import { beforeWildernessPaths } from './worldmassFixtures';
import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { geographicLevel, validateMassProgression } from '../src/worldmass/progression';
import { canonical } from '../src/worldmass/random';
import { localOffset } from '../src/worldmass/address';
import { serializeCharacter, applySavedCharacter, characterBody } from '../src/meta/character';
import { MONSTERS } from '../src/data/monsters';
import { LOOT_TABLES } from '../src/data/loottables';
import { ITEM_BASES } from '../src/data/itembases';
import { ORB_DEFS, orbAmount } from '../src/data/orbs';
import { massMap } from '../src/worldmass/paint';
import type { Chest } from '../src/engine/world';
import { massQuestDestination, massQuestSatisfied } from '../src/worldmass/quests';
import { Q_UNDEAD_SOUTH } from '../src/quests/defs';
import { BRANDT_CFG, BRANDT_HAMMER_QUEST } from '../src/data/brandt';
import { ORACLE_RESCUED } from '../src/data/oracle';
import { revengeCullId, revengeCommanderId, revengeFactionOf } from '../src/quests/revenge';
import type { SavedQuestEntry } from '../src/meta/worldstate';

const restore = seedGlobalRandom(74812);
const cfg = beforeWildernessPaths(structuredClone(massAdventure())), policy = cfg.progression!;
validateMassProgression(policy, cfg.terrain);
for (const field of [-1, 0, 1]) {
  assert.equal(geographicLevel(policy, 0, { danger: field }), 1);
  assert.equal(geographicLevel(policy, 1600, { danger: field }), 1);
  for (const distance of [1800, 5800, 20000, 1e8]) {
    const level = geographicLevel(policy, distance, { danger: field });
    assert.ok(level >= 1 && level <= 24 && Number.isInteger(level));
  }
}
assert.ok(geographicLevel(policy, 13000, { danger: -1 }) < geographicLevel(policy, 13000, { danger: 1 }));
assert.equal(geographicLevel(policy, 1e8, { danger: 1 }), 24);
for (const bad of [
  { ...policy, maxLevel: 101 }, { ...policy, stops: [{ distance: 0, level: 1 }, { distance: 0, level: 2 }] },
  { ...policy, variation: { field: 'missing', levels: 1, start: 0, span: 1 } },
]) assert.throws(() => validateMassProgression(bad, cfg.terrain));
assert.throws(() => geographicLevel(policy, Infinity, { danger: 0 }));
assert.throws(() => geographicLevel(policy, 2000, {}));
const geographicContent=cfg.content.filter(c=>c.levels);
assert.ok(geographicContent.length>=9,'existing geographic rosters retain their full level envelopes');
for (const c of geographicContent) {
  assert.equal(c.levels!.length, 24);
  assert.ok(c.levels!.every(r => r.table.length > 0));
}
assert.ok(geographicContent.some(c => canonical(c.levels![0].table) !== canonical(c.levels![23].table)),
  'the native presence envelopes change composition, not only hit points');
console.log('PASS configurable geographic bands, regional variation, caps, validation and native roster diversity');

// A flat deterministic field isolates encounter attribution from terrain placement.
const fixture: MassAdventure = JSON.parse(canonical(cfg));
delete fixture.settlement; delete fixture.journey; delete fixture.ecology;
fixture.progression = { source: 'probe/progression', minLevel: 1, maxLevel: 12,
  stops: [{ distance: 0, level: 1 }, { distance: 2000, level: 1 }, { distance: 9000, level: 12 }] };
delete fixture.terrain.patches;delete fixture.terrain.landforms;delete fixture.terrain.regionalDiscoveries;delete fixture.terrain.nativeRegional;
fixture.terrain.fields = [];
fixture.terrain.surfaces = [{ id: 'land', priority: 0, when: [], region: 'ground', color: '#445522', biome: 'downs' }];
fixture.terrain.places = [{ id: 'camp', version: 1, content: 'wayside-camp', period: 1800,
  radius: 180, jitter: 0, chance: 1, when: [], priority: 1 }];
fixture.content = [{ ...fixture.content.find(c => c.id === 'wayside-camp')!, count: 1,
  levels: Array.from({ length: 12 }, (_, i) => ({ level: i + 1,
    table: [{ id: i < 4 ? 'zombie' : 'skeleton_warrior', weight: 1 }] })) }];
fixture.populationRadius = 500;
const w = makeSimWorld('warrior', 572), m = new WorldMassRuntime(777, 'expedition:777', fixture);
m.attach(w); w.player.invulnerable = true;
const near = { x: 900, y: 900 }, far = { x: 9900, y: 900 };
const find = (p: { x: number; y: number }) => m.generator.placesInCell(m.walk.at(p.x, p.y))
  .find(place => Math.hypot(...Object.values(localOffset(place.center, m.walk.at(p.x, p.y), 960))) < 1)!;
const a = find(near), b = find(far); assert.ok(a && b);
w.player.pos = near; m.update(w, true);
const early = m.snapshot(w).enemies.filter(e => e.monster === 'zombie'); assert.equal(early.length, 1); assert.equal(early[0].level, 1);
w.player.pos = far; m.update(w, true);
const later = m.snapshot(w).enemies.find(e => e.monster === 'skeleton_warrior')!; assert.equal(later.level, 12);
const native = w.actors.find(body => body.defId === later.monster && body.level === later.level)!;
const life = native.maxLife(), xp = native.xpValue;
const chest = w.chests.find(c => c.rewardSource === canonical([b.id, 'cache']))!;
assert.equal(chest.rewardLevel, 12);
assert.ok(massMap(m, far).includes('Wayside Camp · Lv 12'));
w.player.level = 80; w.player.pos = near; m.update(w, true);
assert.equal(m.populationFor(b).level, 12); assert.equal(native.level, 12);
assert.equal(native.maxLife(), life); assert.equal(native.xpValue, xp);
assert.equal(w.zone.level, 1, 'one player must not rewrite the shared zone level');
assert.equal(m.populationFor(a).level, 1);
console.log('PASS native encounter levels, compositions, cache attribution and hero-independent revisits');

const beforeLoot = MONSTERS.skeleton_warrior.loot;
LOOT_TABLES['probe:mass-gear'] = { id: 'probe:mass-gear', rolls: [
  { count: 1, entries: [{ kind: 'item', category: 'ring', rarity: 'common', weight: 1 }] },
] };
try {
  MONSTERS.skeleton_warrior.loot = 'probe:mass-gear';
  native.pos = { ...near }; // the high-level body has followed the hero to low-level land
  const start = w.drops.length;
  w.kill(native, false, w.player);
  const rings = w.drops.slice(start).flatMap(d => d.item.kind === 'gear' && ITEM_BASES[d.item.item.baseId]?.category === 'ring' ? [d.item.item] : []);
  assert.equal(rings.length, 1); assert.equal(rings[0].ilvl, 12);
  const count = w.drops.length; w.kill(native, false, w.player); assert.equal(w.drops.length, count);
  chest.pos = { ...near }; chest.rarity = 'rare';
  const before = w.drops.length;
  (w as unknown as { openChest(c: Chest): void }).openChest(chest);
  const rare = w.drops.slice(before).flatMap(d => d.item.kind === 'gear' && d.item.item.rarity === 'rare' ? [d.item.item] : []);
  assert.ok(rare.some(item => item.ilvl === 12), 'cache rewards retain their site level even after relocation');
  for (const orb of w.orbs.slice(-2)) assert.equal(orb.amount, orbAmount(ORB_DEFS[orb.kind], 12));
  w.shedOrb('life', near); assert.equal(w.orbs.at(-1)!.amount, orbAmount(ORB_DEFS.life, 1),
    'completed payout must not leak its reward context');
} finally { MONSTERS.skeleton_warrior.loot = beforeLoot; delete LOOT_TABLES['probe:mass-gear']; }
console.log('PASS native kill/cache loot stays source-owned after travel, single credit and reward-context cleanup');
const internals = w as unknown as {
  fireStrikeAt(strike: { skillId: string; radius: number; telegraph: number }, at: { x: number; y: number }): void;
  withMassReward<T>(level: number, fn: () => T): T;
};
const strike = { skillId: 'cleave', radius: 60, telegraph: 1 };
internals.fireStrikeAt(strike, far); const farStrike = w.zones.at(-1)!;
internals.fireStrikeAt(strike, near); const nearStrike = w.zones.at(-1)!;
assert.notEqual(farStrike.caster, nearStrike.caster);
assert.equal(farStrike.caster.level, 12); assert.equal(nearStrike.caster.level, 1);
assert.deepEqual(farStrike.caster.pos, far);
assert.throws(() => internals.withMassReward(12, () => { throw Error('payout interrupted'); }));
w.shedOrb('life', near); assert.equal(w.orbs.at(-1)!.amount, orbAmount(ORB_DEFS.life, 1));
console.log('PASS simultaneous geographic hazards retain their sources and failed rewards restore context');

const save = serializeCharacter(w), stored = save.world!.worldmass!;
const replayWorld = makeSimWorld('warrior', 98); replayWorld.adoptWorldState(save.world);
replayWorld.startWorldMass(777, stored);
const replay = replayWorld.massRuntime!;
assert.deepEqual(replay.snapshot(replayWorld).enemies, stored.enemies);
assert.equal(replay.populationFor(b).level, 12);
assert.ok(replayWorld.chests.find(c => c.rewardSource === chest.rewardSource)?.opened);
for (let i = 0; i < 600; i++) replay.levelAt({ x: -i * 60, y: i * 30 });
assert.equal(replay.levelAt(far), 12); assert.equal(replay.levelAt(near), 1);
assert.equal(replay.snapshot(replayWorld).state.run.version, stored.state.run.version);
const legacy: MassAdventure = JSON.parse(canonical(fixture)); delete legacy.progression;
for (const c of legacy.content) { delete c.levels; delete c.levelOffset; }
legacy.terrain.version = 3;
const old = new WorldMassRuntime(777, 'old', legacy);
assert.equal(old.levelAt(far), 1); assert.equal(old.populationFor(b).level, 1);
console.log('PASS save/reload, bounded danger-cache eviction and legacy constant-level descriptors');

// Current campaign integration: the same native rewards are earned by exact
// physical targets; nothing swaps the surface zone or substitutes a clear flag.
const campaign=makeSimWorld('warrior',42);
campaign.account.features.add(BRANDT_CFG.magicWares.flag);
delete campaign.account.ledger[ORACLE_RESCUED];
campaign.player.level=20; campaign.startWorldMass(42);
const cm=campaign.massRuntime!;
const natives=(cm as unknown as {natives:Map<string,import('../src/engine/actor').Actor>}).natives;
const take=(id:string,giver:string)=>{
  const npc=campaign.actors.find(a=>a.defId===giver&&!a.dead)!;assert.ok(npc,giver);
  campaign.landPartyAt({...npc.pos});
  assert.ok(campaign.acceptQuestOffer(id),id+' must be offered by its native giver');
  const place=massQuestDestination(cm,id)!;assert.ok(place);
  campaign.landPartyAt(cm.journey!.local(place));campaign.time+=60;
  for(let tick=0;tick<8;tick++)cm.update(campaign,true);
  return place;
};
const defeat=(id:string)=>{
  const place=massQuestDestination(cm,id)!, binding=cm.config.settlement!.quests!.bindings.find(b=>b.quest===id)!;
  const keys=binding.defeat?[canonical([place.id,'fixture',binding.defeat.index])]:[...natives.keys()].filter(key=>{
    try{return JSON.parse(key)[0]===place.id;}catch{return false;}
  });
  assert.ok(keys.length);
  for(const key of keys){const body=natives.get(key);assert.ok(body,key+' population='+cm.population);if(!body.dead)campaign.kill(body,false,campaign.player);}
  cm.update(campaign,true);assert.ok(massQuestSatisfied(cm,id,place.id),id+' physical deed');
};
const grave=take(Q_UNDEAD_SOUTH.id,'townsfolk_questgiver');
const unrelated=campaign.createMonster('gravecaller',5,'enemy');campaign.actors.push(unrelated);campaign.kill(unrelated,false,campaign.player);
assert.equal(massQuestSatisfied(cm,Q_UNDEAD_SOUTH.id,grave.id),false,'an unrelated gravecaller is not this quest target');
defeat(Q_UNDEAD_SOUTH.id);
assert.equal(campaign.questStanding(campaign.activeQuests.find(q=>q.questId===Q_UNDEAD_SOUTH.id)!),'ready');
const smith=take(BRANDT_HAMMER_QUEST,'townsfolk_smith');defeat(BRANDT_HAMMER_QUEST);
const hammer=campaign.drops.filter(d=>d.item.kind==='gear'&&d.item.item.questId===BRANDT_HAMMER_QUEST);
assert.equal(hammer.length,1,'Brandt’s real quest cargo is dropped on its physical ground');
(campaign as unknown as {ensureQuestCargo():void}).ensureQuestCargo();
assert.equal(campaign.drops.filter(d=>d.item.kind==='gear'&&d.item.item.questId===BRANDT_HAMMER_QUEST).length,1);
assert.ok(hammer[0].item.kind==='gear');campaign.meta.items.push(hammer[0].item.item);campaign.drops=campaign.drops.filter(d=>d!==hammer[0]);
const faction=revengeFactionOf(campaign.account.ledger),cull=revengeCullId(faction),commander=revengeCommanderId(faction);
take(cull,'townsfolk_questgiver');defeat(cull);assert.ok(campaign.completedQuests.has(cull));
take(commander,'townsfolk_questgiver');defeat(commander);
assert.ok(campaign.account.ledger[ORACLE_RESCUED]);cm.update(campaign,true);
assert.ok(campaign.actors.some(a=>a.defId==='townsfolk_oracle'&&cm.settlement!.isResident(a)),'the rescued Oracle returns without a zone reload');
const savedCampaign=serializeCharacter(campaign),continued=makeSimWorld('warrior',123);
const efficientSave=serializeCharacter(campaign,true);
assert.deepEqual(efficientSave,savedCampaign,'fast persistence captures the same character and world');
assert.equal(characterBody(campaign,efficientSave),JSON.stringify(efficientSave),'frozen land serialization preserves exact bytes');
assert.equal(characterBody(campaign,efficientSave),JSON.stringify(efficientSave),'cached land serialization preserves exact bytes');
assert.equal(efficientSave.world!.worldmass!.config,cm.config,'the fast path shares only immutable land');
assert.notEqual(savedCampaign.world!.worldmass!.config,cm.config,'ordinary exports remain independent');
assert.ok(savedCampaign.world!.worldmass!.state.terrain.every(p=>!p.cause.startsWith(cm.journey!.spec.source)),
  'campaign roads are derived from the pinned journey');
assert.ok(continued.adoptWorldState(savedCampaign.world));continued.startWorldMass(42,savedCampaign.world!.worldmass);
assert.ok(applySavedCharacter(continued,savedCampaign));
assert.deepEqual(continued.massRuntime!.state.patchAt(cm.walk.at(cm.journey!.trails[0].points[2].x,cm.journey!.trails[0].points[2].y)),
  cm.state.patchAt(cm.walk.at(cm.journey!.trails[0].points[2].x,cm.journey!.trails[0].points[2].y)),'the road is identical after Continue');
assert.ok(continued.activeQuests.find(q=>q.questId===commander)?.fieldDone);
assert.ok(massQuestSatisfied(continued.massRuntime!,BRANDT_HAMMER_QUEST,smith.id));
const smithBody=continued.actors.find(a=>a.defId==='townsfolk_smith')!;continued.landPartyAt(smithBody.pos);
const entry=continued.activeQuests.find(q=>q.questId===BRANDT_HAMMER_QUEST)!;
assert.equal(continued.questStanding(entry),'ready');
const reward=continued as unknown as {onQuestZoneCleared(e:SavedQuestEntry):void};reward.onQuestZoneCleared(entry);reward.onQuestZoneCleared(entry);
assert.equal(continued.questImbues.filter(i=>i.questId===BRANDT_HAMMER_QUEST).length,1,'native return reward pays once across Continue');
assert.equal(continued.zone.id,'worldmass_expedition');
campaign.massRuntime?.dispose();continued.massRuntime?.dispose();
console.log('PASS native campaign bosses, cargo, revenge/Oracle rescue and once-only return rewards across Continue');
restore();
