import { strict as assert } from 'node:assert';
import { MEMORY_UNLOCK_CFG, MEMORY_UNLOCKS } from '../src/data/memoryUnlocks';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { FEATURE, makeAccount, serializeAccount, deserializeAccount, STARTER_SKILLS } from '../src/meta/account';
import { allUnlockables, applyUnlock, investUnlock, isUnlockVisible, reconcileClassBundleGems, UNLOCK_CATALOG, unlockCompleted } from '../src/meta/unlocks';
import { awakenMemoryFromDrop, grantMemoryUnlock, memoryCatalog, memoryCommissionReady, memoryKey, memorySecondaryOpen, memoryUnlockCandidates } from '../src/meta/memoryUnlocks';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { GEM_DROP_CFG } from '../src/engine/loot';
import { treeGraph } from '../src/engine/skilltree';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { VENDOR_CFG } from '../src/data/vendors';
import { makeMemoryItem, memoryGroupKey } from '../src/engine/memories';
import { autoPlace } from '../src/engine/inventory';
import { CLASSES } from '../src/data/classes';
import { POWER_PROGRESSION, odysseyMilestoneKey, powerProgressionOpen } from '../src/data/powerProgression';
import { QUESTS } from '../src/quests/defs';
import { abilityEssenceOfTier, skillLevelAbilityCost } from '../src/data/essences';

function graduate(a: ReturnType<typeof makeAccount>): void {
  for (const gate of Object.values(POWER_PROGRESSION)) a.ledger[odysseyMilestoneKey(gate.odysseyStage)] = 1;
}

let passed = 0;
function check(name: string, fn: () => void): void { fn(); passed++; console.log(`PASS ${name}`); }
const discovery = MEMORY_UNLOCKS.find(r => r.tier === 'discovery')!;
const secondary = MEMORY_UNLOCKS.find(r => r.tier === 'secondary')!;
const row = UNLOCK_CATALOG.find(r => r.id === discovery.id)!;
const wake = UNLOCK_CATALOG.find(r => r.id === secondary.id)!;

check('one mixed uniform discovery pool, existing rewards excluded, no internal verbs', () => {
  const a = makeAccount(), pool = memoryUnlockCandidates(a, discovery);
  assert(pool.some(c => c.kind === 'skill') && pool.some(c => c.kind === 'support'));
  assert(pool.every(c => c.weight === 1));
  assert(pool.every(c => c.kind !== 'skill' || (!SKILLS[c.id].noDrop && !a.unlockedSkills.has(c.id))));
  assert(pool.every(c => c.kind !== 'support' || !a.unlockedSupports.has(c.id)));
  assert.equal(allUnlockables(a).filter(u => u.kind === 'skill' || u.kind === 'support').length, 0);
  assert.equal(allUnlockables(a).filter(u => u.kind === 'memory').length, 2);
  const legacy = UNLOCK_CATALOG.find(u => u.kind === 'skill')!;
  a.credits = 10000;
  assert.equal(applyUnlock(a, legacy), false);
  assert.equal(a.credits, 10000);
});

check('partial investment saves, each completion grants once, repeated clicks cost anew', () => {
  let a = makeAccount(); a.credits = row.cost * 3;
  assert.equal(investUnlock(a, row, row.cost - 1), row.cost - 1);
  assert.equal(a.memoryReceipts[row.id], undefined);
  a = deserializeAccount(serializeAccount(a))!;
  assert.equal(investUnlock(a, row, 1000), 1);
  const first = a.memoryReceipts[row.id];
  assert.equal(first.sequence, 1);
  assert(unlockCompleted(a, row, 0));
  assert(!unlockCompleted(a, row, 1));
  assert(applyUnlock(a, row));
  const second = a.memoryReceipts[row.id];
  assert.equal(second.sequence, 2);
  assert.notEqual(memoryKey(first.kind, first.id), memoryKey(second.kind, second.id));
  assert.equal(a.credits, row.cost);
  assert(!memoryUnlockCandidates(a, discovery).some(c => c.kind === first.kind && c.id === first.id));
  assert.equal(deserializeAccount(serializeAccount(a))!.memoryReceipts[row.id].sequence, 2);
});

check('exhausted and unaffordable purchases take no currency or investment', () => {
  const a = makeAccount(); a.credits = row.cost - 1;
  assert(!applyUnlock(a, row)); assert.equal(a.credits, row.cost - 1);
  for (const c of memoryCatalog()) (c.kind === 'skill' ? a.unlockedSkills : a.unlockedSupports).add(c.id);
  a.invested[row.id] = 7; a.credits = 999;
  assert(!isUnlockVisible(a, row)); assert(!applyUnlock(a, row));
  assert.equal(investUnlock(a, row, 100), 0);
  assert.equal(a.credits, 999); assert.equal(a.invested[row.id], 7);
});

check('weights and live registry additions are data, not another authored bundle', () => {
  const a = makeAccount(); const skill = memoryCatalog().find(c => c.kind === 'skill')!;
  const fake = 'probe_new_memory';
  SKILLS[fake] = { ...SKILLS[skill.id], id: fake, name: 'Probe Memory' };
  const old = { ...discovery.weights };
  try {
    discovery.weights.skill = 0;
    assert(memoryUnlockCandidates(a, discovery).every(c => c.kind === 'support'));
    discovery.weights.skill = 1; discovery.weights.support = 0;
    assert(memoryUnlockCandidates(a, discovery).some(c => c.id === fake));
    MEMORY_UNLOCK_CFG.excluded.push(memoryKey('skill', fake));
    assert(!memoryUnlockCandidates(a, discovery).some(c => c.id === fake));
  } finally { delete SKILLS[fake]; Object.assign(discovery.weights, old); MEMORY_UNLOCK_CFG.excluded.length = 0; }
});

check('secondary draw only awakens discoverable skills, and cannot repeat', () => {
  const a = makeAccount(); a.unlockedSkills = new Set([STARTER_SKILLS[0]]); a.credits = wake.cost * 2;
  graduate(a);
  assert(!memorySecondaryOpen(a, 'skill', STARTER_SKILLS[0], 'tree'));
  assert(applyUnlock(a, wake));
  assert(memorySecondaryOpen(a, 'skill', STARTER_SKILLS[0], 'tree'));
  assert(memoryCommissionReady(a, 'skill', STARTER_SKILLS[0], VENDOR_CFG.commission.need));
  assert(!applyUnlock(a, wake)); assert.equal(a.credits, wake.cost);
  assert.equal(memoryUnlockCandidates(a, secondary).length, 0);
  const b = deserializeAccount(serializeAccount(a))!;
  assert(b.memorySecondary.has(memoryKey('skill', STARTER_SKILLS[0])));
  assert.equal(b.memoryReceipts[wake.id].sequence, 1);
});

check('legendary finds and Vault grants share access; drop-only and Vault-only dials', () => {
  const a = makeAccount(), id = STARTER_SKILLS[0];
  assert(!awakenMemoryFromDrop(a, id, 'rare'));
  assert(awakenMemoryFromDrop(a, id, 'legendary'));
  assert(!awakenMemoryFromDrop(a, id, 'legendary'));
  assert(!memoryUnlockCandidates(a, secondary).some(c => c.id === id));
  const b = makeAccount();
  graduate(b);
  try {
    MEMORY_UNLOCK_CFG.secondary.legendaryFinds = false;
    assert(!awakenMemoryFromDrop(b, id, 'legendary'));
    assert(grantMemoryUnlock(b, secondary, () => 0));
    MEMORY_UNLOCK_CFG.secondary.vault = false;
    assert.equal(memoryUnlockCandidates(makeAccount(), secondary).length, 0);
    MEMORY_UNLOCK_CFG.secondary.mechanics.tree = false;
    assert(memorySecondaryOpen(makeAccount(), 'skill', id, 'tree'));
  } finally { MEMORY_UNLOCK_CFG.secondary.legendaryFinds = true; MEMORY_UNLOCK_CFG.secondary.vault = true; MEMORY_UNLOCK_CFG.secondary.mechanics.tree = true; }
});

check('old investments transfer once, overflow pays for separate deliberate draws', () => {
  const a = makeAccount(), legacy = UNLOCK_CATALOG.find(u => u.kind === 'skill')!;
  a.invested[legacy.id] = row.cost * 2 + 9;
  reconcileClassBundleGems(a); reconcileClassBundleGems(a);
  assert.equal(a.invested[row.id], row.cost * 2 + 9);
  assert(applyUnlock(a, row)); assert.equal(a.invested[row.id], row.cost + 9);
  assert(applyUnlock(a, row)); assert.equal(a.invested[row.id], 9);
  assert.equal(a.credits, 0); assert.equal(a.memoryReceipts[row.id].sequence, 2);
});

check('Grand Codex is a retained debug bypass, without paid duplicate draws', () => {
  const a = makeAccount(); a.features.add(FEATURE.UNLOCK_ALL_GEMS);
  assert.equal(memoryUnlockCandidates(a, discovery).length, 0);
  assert.equal(memoryUnlockCandidates(a, secondary).length, 0);
  assert(memorySecondaryOpen(a, 'skill', STARTER_SKILLS[0], 'tree'));
  const support = Object.values(SUPPORTS)[0];
  assert(memorySecondaryOpen(a, 'support', support.id, 'commission'));
});

bootSimEngine();
check('sealed skills still level through Memory Essence without tree prompts or reset spending', () => {
  const w = makeSimWorld('warrior', 0x71af);
  w.account.memorySecondary.clear(); delete w.account.ledger[odysseyMilestoneKey(2)];
  const inst = [...w.meta.knownSkills.values()].find(s => s.def.tree)!;
  inst.level = 4;
  const cost = skillLevelAbilityCost(5), id = abilityEssenceOfTier(cost.tier).id;
  w.meta.abilityEssences[id] = cost.count + 100;
  assert(w.levelUpSkill(inst.def.id));
  assert.equal(inst.level, 5); assert.equal(w.meta.abilityEssences[id], 100);
  assert.equal(inst.state?.treeAwokeAt, undefined);
  assert(!w.treePopupRequested);
  const node = treeGraph(inst.def)!.rootChildren[0]; inst.treeNodes = [node];
  w.fonts = [{ pos: { ...w.player.pos }, tier: w.player.tier }];
  assert(!w.fontResetTree(inst.def.id));
  assert.deepEqual(inst.treeNodes, [node]); assert.equal(w.meta.abilityEssences[id], 100);
});
check('Odyssey gates reject paid and stale grants, remember early legendaries, and survive account reload', () => {
  let a = makeAccount(); a.credits = 1000; a.invested[wake.id] = 23;
  const id = STARTER_SKILLS[0];
  assert(awakenMemoryFromDrop(a, id, 'legendary'));
  for (const stage of [0, 1]) {
    if (stage) a.ledger[odysseyMilestoneKey(stage)] = 1;
    assert(!memorySecondaryOpen(a, 'skill', id, 'tree'));
    assert(!memoryCommissionReady(a, 'skill', id, 3));
    assert(!isUnlockVisible(a, wake)); assert(!applyUnlock(a, wake));
    assert.equal(investUnlock(a, wake, 99), 0);
    assert.equal(grantMemoryUnlock(a, secondary), null);
    assert.equal(a.credits, 1000); assert.equal(a.invested[wake.id], 23);
  }
  const support = [...a.unlockedSupports][0]; a.ledger[`gemdrop:${support}`] = 3;
  assert(!memoryCommissionReady(a, 'support', support, 3));
  a = deserializeAccount(serializeAccount(a))!;
  graduate(a);
  assert(memorySecondaryOpen(a, 'skill', id, 'tree'));
  assert(memoryCommissionReady(a, 'skill', id, 3));
  assert(memoryCommissionReady(a, 'support', support, 3));
  assert(!memoryUnlockCandidates(a, secondary).some(c => c.id === id));
  assert(!memorySecondaryOpen(a, 'skill', STARTER_SKILLS[1], 'tree'));
  assert(powerProgressionOpen(deserializeAccount(serializeAccount(a))!.ledger, 'awakening'));
});
check('class discoveries grant precisely the starting bar; old discoveries remain owned', () => {
  const a = makeAccount();
  for (const u of UNLOCK_CATALOG) {
    if (u.kind !== 'class') continue;
    const cls = CLASSES.find(c => c.id === u.payload.classId)!;
    assert.deepEqual(u.payload.skillIds, [...new Set(cls.bar.filter(Boolean))]);
    assert(u.payload.supportIds.length <= 3);
    a.unlockedClasses.add(cls.id);
  }
  a.unlockedSkills.add('summon_fire_golem');
  reconcileClassBundleGems(a);
  assert(a.unlockedSkills.has('summon_fire_golem'));
  const fresh = makeAccount(); fresh.unlockedClasses.add('summoner');
  reconcileClassBundleGems(fresh);
  assert(!fresh.unlockedSkills.has('summon_fire_golem'));
});
check('Vocation chains require the first account milestone, retaining their class rules', () => {
  const q = Object.values(QUESTS).find(q => q.vocation === 'warbringer' && q.id.endsWith('_1'))!;
  assert(q?.gate);
  const ctx = { classId: 'warrior', vocations: [] as string[], runLedger: {}, accountLedger: {} as Record<string, number> };
  assert(!q.gate(ctx));
  ctx.accountLedger[odysseyMilestoneKey(1)] = 1;
  assert(q.gate(ctx));
  assert(!q.gate({ ...ctx, classId: 'magician' }));
});
check('engine enforces tree gate, genuine legendary mint opens it, client mirrors host', () => {
  const w = makeSimWorld('warrior', 0x71ac);
  delete w.account.ledger[odysseyMilestoneKey(2)];
  w.account.memorySecondary.clear();
  const inst = [...w.localSeat.meta.knownSkills.values()].find(s => s.def.tree)!;
  inst.level = 100;
  const graph = treeGraph(inst.def)!;
  const node = graph.rootChildren[0];
  w.pickTreeNode(inst.def.id, node);
  assert.equal(inst.treeNodes?.length ?? 0, 0);
  const remote = makeSimWorld('warrior', 0x71ac);
  applySnapshot(remote, serializeSnapshot(w, 1));
  assert(remote.memorySecondaryRefusal(inst.def.id));
  const share = GEM_DROP_CFG.memoryShare;
  try {
    GEM_DROP_CFG.memoryShare = 0;
    w.dropGemAt(w.player.pos, undefined, true, undefined, undefined, { k: 'skill', id: inst.def.id, r: 'legendary' });
  } finally { GEM_DROP_CFG.memoryShare = share; }
  assert(w.account.memorySecondary.has(memoryKey('skill', inst.def.id)));
  assert(w.accountDirty);
  w.pickTreeNode(inst.def.id, node);
  assert.equal(inst.treeNodes?.length ?? 0, 0, 'early legendary remains dormant');
  applySnapshot(remote, serializeSnapshot(w, 2));
  assert(remote.memorySecondaryRefusal(inst.def.id), 'host gate overrides graduated client');
  graduate(w.account);
  w.pickTreeNode(inst.def.id, node);
  assert.equal(inst.treeNodes?.length, 1);
  applySnapshot(remote, serializeSnapshot(w, 3));
  assert.equal(remote.memorySecondaryRefusal(inst.def.id), null);
});
check('opaque legendary Memory awakens only at recall, never preview, and respects progression mode', () => {
  const w = makeSimWorld('warrior', 0x71ad), id = STARTER_SKILLS[0];
  w.account.memorySecondary.clear();
  const unit = { d: 'crypt_lich', s: 71, g: { k: 'skill' as const, id, r: 'legendary' as const } };
  const pouch = makeMemoryItem('rough', [unit]);
  assert(autoPlace(w.localSeat.meta.items, pouch));
  w.memoryRecallView(w.localSeat, pouch.uid);
  assert(!w.account.memorySecondary.has(memoryKey('skill', id)));
  assert(w.recallMemory(w.localSeat, pouch.uid, memoryGroupKey(unit)));
  assert(w.account.memorySecondary.has(memoryKey('skill', id)));
  const blocked = makeSimWorld('warrior', 0x71ae);
  blocked.account.memorySecondary.clear();
  blocked.metaProgressionActive = () => false;
  const share = GEM_DROP_CFG.memoryShare;
  try {
    GEM_DROP_CFG.memoryShare = 0;
    blocked.dropGemAt(blocked.player.pos, undefined, true, undefined, undefined, unit.g);
  } finally { GEM_DROP_CFG.memoryShare = share; }
  assert(!blocked.account.memorySecondary.has(memoryKey('skill', id)));
});
console.log(`\n${passed} memory progression checks passed.`);
