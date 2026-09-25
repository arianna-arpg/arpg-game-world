import assert from 'node:assert/strict';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { PASSIVE_NODES as N, PASSIVE_ADJACENCY as A, classStartNode } from '../src/data/passives';
import { choiceGroupOf, choicePathing, sanitizeChoices, validatePassiveChoices } from '../src/data/passiveChoices';
import { PASSIVE_ATTRIBUTE_TIERS } from '../src/data/passiveAttributes';
import { passiveWalkingGraph } from '../src/data/passiveTopology';
import { ATTRIBUTE_IDS, type AttributeId } from '../src/engine/stats';
import { SKILLS } from '../src/data/skills';
import { makeSkillInstance } from '../src/engine/skills';
import { applySavedCharacter, serializeCharacter } from '../src/meta/character';
import { applySeatMeta, serializeSeatMeta } from '../src/net/snapshot';
import { passiveRefund } from '../src/engine/passiveRefund';
import { formatStatValue } from '../src/engine/items';

seedGlobalRandom(719);
bootSimEngine();
assert.equal(formatStatValue('critMulti', 'flat', 0.004), '0.004');
assert.equal(formatStatValue('critMulti', 'flat', -0.004), '-0.004');
assert.equal(formatStatValue('critMulti', 'flat', 0), '0');
const nodes = Object.values(N).filter(choicePathing);
assert.equal(nodes.length, 136);
assert.equal(nodes.filter(n => n.choice!.group === 'attribute_training').length, 122);
assert.equal(nodes.filter(n => n.choice!.group === 'attribute_training_major').length, 14);
assert(nodes.every(n => !n.attributes && !n.mods?.length));
const warnings: string[] = [];
validatePassiveChoices(s => warnings.push(s), N);
assert.deepEqual(warnings, []);
for (const tier of PASSIVE_ATTRIBUTE_TIERS) {
  const group = choiceGroupOf(nodes.find(n => n.choice!.group === tier.id)!)!;
  assert.deepEqual(group.options.map(o => o.id), ATTRIBUTE_IDS);
  assert(group.options.every(o => Object.keys(o.attributes!).length === 1 && o.attributes![o.id as AttributeId] === tier.amount));
}
assert.deepEqual(N.str_start.attributes, { strength: 3 });
assert.equal(Object.keys(N.attr_all.attributes!).length, 9);
assert.equal(Object.keys(N.cl_attr_c.attributes!).length, 10);
assert.deepEqual(N.node_29.attributes, { intelligence: 3, willpower: 3 });
assert.equal(N.cl_vit_n.attributes!.vitality, 3);
console.log('PASS all 136 training nodes offer every attribute at their original tier; mixed grants and starts retain their roles');

const w = makeSimWorld('warrior', 719), m = w.meta, start = classStartNode(m.classDef.id);
// Exhaust the real node/option matrix. The adjacent fixture isolates the
// grant; the subsequent cross-class walk exercises actual connected paths.
for (const node of nodes) for (const attr of ATTRIBUTE_IDS) {
  m.allocated = new Set([start, A[node.id][0]]); m.choices = {}; m.passivePoints = 1;
  w.recalcSeat(w.localSeat);
  const before = { ...m.attrs };
  assert(!w.allocateNode(node.id), 'blind allocations refuse');
  assert(!w.allocateNode(node.id, undefined, 'missing_attribute'));
  assert.equal(m.passivePoints, 1);
  assert(w.allocateNode(node.id, undefined, attr));
  const amount = choiceGroupOf(node)!.options.find(o => o.id === attr)!.attributes![attr]!;
  for (const key of ATTRIBUTE_IDS) assert.equal(m.attrs[key], before[key] + (key === attr ? amount : 0), `${node.id}:${key}`);
  assert.equal(m.passivePoints, 0);
  assert.deepEqual(m.choices[node.id], [attr]);
  assert(!w.allocateNode(node.id, undefined, attr));
  assert(!w.allocateNode(node.id, undefined, ATTRIBUTE_IDS.find(a => a !== attr)!));
}
console.log('PASS 1,360 real allocations grant exactly the selected attribute, charge once, and reject invalid or duplicate picks');

// Existing allocations become ordinary choices without changing their total.
const owned = new Set([start, ...nodes.map(n => n.id)]);
m.allocated = owned; m.choices = {}; m.passivePoints = 7;
const old = serializeCharacter(w), restored = makeSimWorld('warrior', 720);
const expected = { ...m.baseAttrs };
expected.strength += 3;
for (const n of nodes) {
  const attr = n.choice!.allocatedDefault as AttributeId;
  expected[attr] += choiceGroupOf(n)!.options.find(o => o.id === attr)!.attributes![attr]!;
}
delete old.choices;
assert(applySavedCharacter(restored, old));
assert.deepEqual(restored.meta.attrs, expected);
assert.equal(restored.meta.passivePoints, 7);
assert.equal(Object.keys(restored.meta.choices).length, nodes.length);
const saved = serializeCharacter(restored);
assert(applySavedCharacter(restored, JSON.parse(JSON.stringify(saved))));
assert.deepEqual(restored.meta.attrs, expected);
assert.deepEqual(restored.meta.choices, saved.choices);
const wire = serializeSeatMeta(restored.localSeat);
delete wire.choices;
applySeatMeta(w, w.localSeat, wire);
assert.deepEqual(w.meta.attrs, expected);
assert.deepEqual(w.meta.choices, saved.choices);
const id = nodes[0].id;
const cleaned = sanitizeChoices({ [id]: ['intelligence', 'strength'], unowned: ['strength'] }, N, new Set([id]));
assert.deepEqual(cleaned, { [id]: ['intelligence'] });
assert.deepEqual(sanitizeChoices({ [id]: ['strength'] }, N, new Set()), {});
assert.deepEqual(sanitizeChoices(undefined, N, new Set()), {});
console.log('PASS old saves and co-op retain all paid attributes; defaults cannot replace valid choices, duplicate power or grant unowned nodes');

// Walk the actual Star until a Warrior can learn and cast Firebolt. Repeated
// Intelligence selections must remain legal on different nodes in one group.
const hero = makeSimWorld('warrior', 721), graph = passiveWalkingGraph(N);
hero.meta.passivePoints = 100;
assert(hero.reqShortfall('firebolt'));
const gem = hero.grantSkillGemItem(hero.localSeat, makeSkillInstance(SKILLS.firebolt, 1, 1))!;
assert(!hero.learnSkill(gem.uid));
let last = '';
while (hero.reqShortfall('firebolt')) {
  const queue = [...hero.meta.allocated], parents = new Map<string, string>();
  const seen = new Set(queue);
  let target = '';
  for (let i = 0; i < queue.length && !target; i++) for (const next of graph[queue[i]] ?? []) {
    if (seen.has(next)) continue;
    seen.add(next); parents.set(next, queue[i]); queue.push(next);
    if (choicePathing(N[next])) { target = next; break; }
  }
  assert(target, 'a further training node must be reachable');
  const path: string[] = [];
  for (let at = target; !hero.meta.allocated.has(at); at = parents.get(at)!) path.unshift(at);
  for (const at of path) assert(hero.allocateNode(at, undefined, N[at].choice ? 'intelligence' : undefined));
  last = target;
}
assert(Object.values(hero.meta.choices).filter(c => c[0] === 'intelligence').length > 1);
assert(hero.learnSkill(gem.uid));
const skill = hero.meta.knownSkills.get('firebolt')!;
hero.player.mana = hero.player.maxMana();
assert(hero.useSkill(hero.player, skill, { x: hero.player.pos.x + 100, y: hero.player.pos.y }));
assert.equal(hero.castReqRefusal(hero.player, skill), undefined);
const choiceSave = serializeCharacter(hero);
assert(applySavedCharacter(restored, choiceSave));
assert.deepEqual(restored.meta.choices, hero.meta.choices);
assert.equal(restored.reqShortfall('firebolt'), undefined);
applySeatMeta(restored, restored.localSeat, serializeSeatMeta(hero.localSeat));
assert.deepEqual(restored.meta.attrs, hero.meta.attrs);
assert.equal(restored.reqShortfall('firebolt'), undefined);
console.log('PASS a real Warrior route selects Intelligence repeatedly and unlocks Firebolt learning/casting across save and co-op restoration');

hero.loadZone('lastlight');
const font = hero.fonts[0]; assert(font);
hero.player.pos = { ...font.pos }; hero.player.tier = font.tier ?? 0;
hero.player.casting = null; hero.time += 30;
const points = hero.meta.passivePoints;
assert.equal(passiveRefund(hero.meta, last).points, 1);
assert(hero.refundPassiveNode(last));
assert.equal(hero.meta.passivePoints, points + 1);
assert(!hero.meta.choices[last]);
assert(hero.reqShortfall('firebolt'));
assert(hero.castReqRefusal(hero.player, skill));
assert(hero.allocateNode(last, undefined, 'intelligence'));
assert.equal(hero.meta.passivePoints, points);
assert.equal(hero.reqShortfall('firebolt'), undefined);
assert(hero.refundPassiveNode(last));
assert(hero.allocateNode(last, undefined, 'vitality'));
assert(hero.reqShortfall('firebolt'));
console.log('PASS Font refunds return one point, remove chosen power, recheck learned-skill requirements and permit a different attribute');
