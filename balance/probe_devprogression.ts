import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { applyDevProgression, devProgressionCatalog, devProgressionOwned, devProgressionReceipt } from '../src/dev/progression';
import { FEATURE, deserializeAccount, makeAccount, serializeAccount } from '../src/meta/account';
import { POWER_PROGRESSION, odysseyMilestoneKey, powerProgressionOpen } from '../src/data/powerProgression';
import { ORACLE_RESCUED, ORACLE_RESCUE } from '../src/data/oracle';
import { RELIQUARY, CONTAINER_DEFS } from '../src/data/containers';
import { RELIQUARY_CFG } from '../src/data/reliquary';
import { SKILLS } from '../src/data/skills';
import { memoryCatalog, memoryKey } from '../src/meta/memoryUnlocks';
import { containerBoard } from '../src/engine/containers';
import { allUnlockables, isUnlockVisible } from '../src/meta/unlocks';
import { forgeItem } from '../src/engine/itemgen';

const w = makeSimWorld('warrior', 27811);
Object.assign(w.account, makeAccount());
const catalog = devProgressionCatalog();
assert.equal(new Set(catalog.map(r => r.id)).size, catalog.length);
assert.equal(catalog.filter(r => r.memories).length, memoryCatalog().length);
assert.equal(catalog.filter(r => r.group === 'Containers').length, CONTAINER_DEFS.reduce((n, c) => n + c.ladder.length, 0) + 1);
assert(catalog.every(r => (r.requires ?? []).every(id => catalog.some(p => p.id === id))));
const skill = [...w.meta.knownSkills.values()].find(i => i.def.tree && memoryCatalog().some(m => m.kind === 'skill' && m.id === i.def.id))!.def.id;
const skillId = `memory:skill:${skill}`;
const pristine = JSON.stringify(serializeAccount(w.account));
assert(w.memorySecondaryRefusal(skill));
assert.equal(containerBoard(RELIQUARY), null);
assert(!applyDevProgression(w, ['power:vocations', 'unknown']).ok);
assert.equal(JSON.stringify(serializeAccount(w.account)), pristine, 'invalid batch must not partially grant');
assert(!applyDevProgression(w, ['a'], [{ id: 'a', label: 'a', group: 'test', description: '', requires: ['a'] }]).ok);
assert.equal(JSON.stringify(serializeAccount(w.account)), pristine);
console.log('PASS registry coverage, prerequisites and atomic invalid/cyclic batches');

const noChange = () => assert.equal(JSON.stringify(serializeAccount(w.account)), pristine);
w.clientActionHook = () => {};
assert(!applyDevProgression(w, [skillId]).ok); noChange();
w.clientActionHook = undefined;
w.meta.modeId = 'immortal'; w.meta.modeStage = 1;
assert(!applyDevProgression(w, [skillId]).ok); noChange();
w.meta.modeId = 'mortal'; w.meta.modeStage = 0;
w.player.dead = true;
assert(!applyDevProgression(w, [skillId]).ok); noChange(); w.player.dead = false;
w.player.downed = true;
assert(!applyDevProgression(w, [skillId]).ok); noChange(); w.player.downed = false;
console.log('PASS remote, non-progressing, dead and downed actions refuse account writes');

// A dormant legendary receipt must still offer a grant for its missing milestone.
w.account.memorySecondary.add(memoryKey('skill', skill));
assert(!devProgressionOwned(w.account, catalog.find(r => r.id === skillId)!, catalog));
const beforeRun = JSON.stringify({ ledger: w.ledger, quests: w.activeQuests, done: [...w.completedQuests],
  campaign: w.odyssey.state, items: w.meta.items, xp: w.meta.xp, level: w.player.level });
assert(applyDevProgression(w, [skillId]).ok);
assert.equal(w.memorySecondaryRefusal(skill), null);
assert(powerProgressionOpen(w.account.ledger, 'awakening'));
assert(powerProgressionOpen(w.account.ledger, 'vocations'));
assert(w.accountDirty);
assert.equal(w.account.ledger[devProgressionReceipt('power:awakening')], 1);
assert.equal(w.account.credits, 0);
assert.equal(JSON.stringify({ ledger: w.ledger, quests: w.activeQuests, done: [...w.completedQuests],
  campaign: w.odyssey.state, items: w.meta.items, xp: w.meta.xp, level: w.player.level }), beforeRun);
console.log('PASS targeted awakening opens the real tree gate with prerequisites and no campaign/reward side effects');

assert(applyDevProgression(w, ['container:reliquary:4', 'reliquary:attunement']).ok);
assert.equal(w.account.ledger[ORACLE_RESCUED], 1);
assert(ORACLE_RESCUE.features.every(f => w.account.features.has(f)));
assert(RELIQUARY.ladder.every(r => w.account.features.has(r.feature)));
assert(containerBoard(RELIQUARY));
assert.equal(w.account.ledger[RELIQUARY_CFG.attunement], 1);
assert(allUnlockables(w.account).some(u => u.kind === 'power' && isUnlockVisible(w.account, u)));
assert.equal(w.account.reliquary.rank, 0);
const granted = JSON.stringify(serializeAccount(w.account));
assert(applyDevProgression(w, ['container:reliquary:4', 'reliquary:attunement', skillId]).ok);
assert.equal(JSON.stringify(serializeAccount(w.account)), granted, 'repeating a grant is byte-identical');
const restored = deserializeAccount(JSON.parse(granted))!;
assert(restored.features.has(FEATURE.RELIQUARY_CASE));
assert(restored.memorySecondary.has(memoryKey('skill', skill)));
assert.equal(restored.ledger[devProgressionReceipt('container:reliquary:4')], 1);
w.loadZone('lastlight');
assert(w.actors.some(a => a.defId === ORACLE_RESCUE.npc));
assert(w.townTierIndex() >= 1);
const relic = forgeItem({ ilvl: 1, baseId: 'relic_charm', rarity: 'magic', affixes: [{ id: 'relic_life' }], quality: 1 })!;
const drops = w.drops.length; w.dropGearAt(w.player.pos, relic);
assert.equal(w.drops.length, drops + 1);
console.log('PASS full container ladder, rescue residency, Relic drops, ordinary investments, idempotence and persistence');

// Live content additions and tuning flow into the tool without UI edits.
const fake = 'dev_progression_probe_memory', oldStage = POWER_PROGRESSION.awakening.odysseyStage;
try {
  SKILLS[fake] = { ...SKILLS[skill], id: fake, name: 'Test added Memory' };
  POWER_PROGRESSION.awakening.odysseyStage = oldStage + 1;
  const dynamic = devProgressionCatalog();
  assert(dynamic.some(r => r.id === `memory:skill:${fake}`));
  assert.equal(dynamic.find(r => r.id === 'power:awakening')!.ledger![odysseyMilestoneKey(oldStage + 1)], 1);
} finally { delete SKILLS[fake]; POWER_PROGRESSION.awakening.odysseyStage = oldStage; }
console.log('PASS new Memory definitions and retuned progression stages derive automatically');
