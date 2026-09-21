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
check('engine enforces tree gate, genuine legendary mint opens it, client mirrors host', () => {
  const w = makeSimWorld('warrior', 0x71ac);
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
  assert.equal(inst.treeNodes?.length, 1);
  applySnapshot(remote, serializeSnapshot(w, 2));
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
