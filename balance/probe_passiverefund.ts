import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { NullInput } from '../src/net/intent';
import { classStartNode, PASSIVE_ADJACENCY, PASSIVE_NODES, vocationGateNodeId, type PassiveNode } from '../src/data/passives';
import { registerChoiceGroup } from '../src/data/passiveChoices';
import { registerPassiveRealm } from '../src/data/passiveRealms';
import { VOCATIONS, vocationRootId } from '../src/data/vocations';
import { passiveRefund } from '../src/engine/passiveRefund';
import { mod } from '../src/engine/stats';
import { makeSkillInstance } from '../src/engine/skills';
import { SKILLS } from '../src/data/skills';
import { applySavedCharacter, serializeCharacter } from '../src/meta/character';

const w = makeSimWorld('warrior', 711);
w.loadZone('lastlight');
const font = w.fonts[0]; assert(font);
w.player.pos = { ...font.pos }; w.player.tier = font.tier ?? 0;
assert.equal(w.passiveRefundRefusal(), null);
const m = w.meta, start = classStartNode(m.classDef.id);
m.passivePoints = 100;
const plant = (id: string, links: string[], extra: Partial<PassiveNode> = {}) => {
  PASSIVE_NODES[id] = { id, name: id, description: '', kind: 'small', x: 0, y: 0, links, ...extra };
  PASSIVE_ADJACENCY[id] = [...links];
  for (const to of links) (PASSIVE_ADJACENCY[to] ??= []).push(id);
};
const link = (a: string, b: string) => { PASSIVE_ADJACENCY[a].push(b); PASSIVE_ADJACENCY[b].push(a); };
plant('refund_bridge', [start]); plant('refund_leaf', ['refund_bridge'], { mods: [mod('life', 'flat', 20)] });
const life0 = w.player.maxLife();
assert(w.allocateNode('refund_bridge')); assert(w.allocateNode('refund_leaf'));
const before = m.passivePoints;
assert(!w.refundPassiveNode('refund_bridge')); assert.equal(m.passivePoints, before);
assert(!w.refundPassiveNode(start));
assert(w.refundPassiveNode('refund_leaf')); assert.equal(w.player.maxLife(), life0);
assert(!w.refundPassiveNode('refund_leaf')); assert(w.refundPassiveNode('refund_bridge'));
assert.equal(m.passivePoints, 100);
console.log('PASS bridges cannot be removed, free roots never refund, leaves return exact points and power');

plant('refund_route', [start, 'refund_leaf']);
assert(w.allocateNode('refund_bridge')); assert(w.allocateNode('refund_leaf')); assert(w.allocateNode('refund_route'));
assert(w.refundPassiveNode('refund_bridge'), 'an alternate paid path permits the refund');
assert(!w.refundPassiveNode('refund_route'));
assert(w.refundPassiveNode('refund_leaf')); assert(w.refundPassiveNode('refund_route'));
assert.equal(m.passivePoints, 100);
console.log('PASS alternate connected routes remain legal without leaving isolated cycles');

plant('refund_cycle_a', ['refund_bridge']); plant('refund_cycle_b', ['refund_cycle_a']);
plant('refund_cycle_c', ['refund_cycle_a', 'refund_cycle_b']);
for (const id of ['refund_bridge', 'refund_cycle_a', 'refund_cycle_b', 'refund_cycle_c']) assert(w.allocateNode(id));
assert(!w.refundPassiveNode('refund_bridge'), 'a cycle cannot become its own root');
for (const id of ['refund_cycle_c', 'refund_cycle_b', 'refund_cycle_a', 'refund_bridge']) assert(w.refundPassiveNode(id));
assert.equal(m.passivePoints, 100);

registerChoiceGroup({ id: 'refund_multi', name: 'Refund', pick: 2, options: [
  { id: 'a', name: 'A', description: '', mods: [mod('life', 'flat', 10)] },
  { id: 'b', name: 'B', description: '', mods: [mod('life', 'flat', 15)] },
] });
plant('refund_choice', [start], { kind: 'choice', choice: { group: 'refund_multi' }, graft: { support: 'added_fire' } });
assert(w.allocateNode('refund_choice', undefined, 'a')); assert(w.allocateNode('refund_choice', undefined, 'b'));
m.grafts.refund_choice = 'cleave'; m.grafts['refund_choice:a'] = 'cleave';
assert.equal(passiveRefund(m, 'refund_choice').points, 2);
assert(w.refundPassiveNode('refund_choice')); assert.equal(m.passivePoints, 100);
assert.equal(m.choices.refund_choice, undefined); assert.equal(m.grafts.refund_choice, undefined);
assert.equal(m.grafts['refund_choice:a'], undefined); assert.equal(w.player.maxLife(), life0);
console.log('PASS all choice picks and bindings return together without stale grants');

registerChoiceGroup({ id: 'refund_first', name: 'First', deal: 'first', options: [
  { id: 'a', name: 'A', description: '' }, { id: 'b', name: 'B', description: '' },
] });
plant('refund_claimant', [start], { kind: 'choice', choice: { group: 'refund_first' } });
plant('refund_shortcut', [start], { kind: 'choice', choice: { group: 'refund_first' } });
assert(w.allocateNode('refund_claimant', undefined, 'a')); assert(w.allocateNode('refund_shortcut'));
assert(!w.refundPassiveNode('refund_claimant')); assert(w.refundPassiveNode('refund_shortcut'));
assert(w.refundPassiveNode('refund_claimant')); assert.equal(m.passivePoints, 100);
assert(w.allocateNode('refund_shortcut', undefined, 'b')); assert(w.refundPassiveNode('refund_shortcut'));
assert.equal(m.passivePoints, 100);
console.log('PASS shared-deal shortcuts cannot duplicate point credit or retain a removed choice');

const voc = Object.values(VOCATIONS).find(v => vocationGateNodeId(v.id) !== start)!;
const gate = vocationGateNodeId(voc.id)!; link(start, gate);
assert(w.allocateNode(gate)); m.vocations.push(voc.id); m.allocated.add(vocationRootId(voc.id)); m.vocationPoints = 5;
const vn = PASSIVE_ADJACENCY[vocationRootId(voc.id)][0]; assert(w.allocateNode(vn));
assert(!w.refundPassiveNode(gate)); assert(!w.refundPassiveNode(vocationRootId(voc.id)));
assert(w.refundPassiveNode(vn)); assert.equal(m.vocationPoints, 5);
plant('refund_other_start_branch', [gate]); assert(w.allocateNode('refund_other_start_branch'));
assert(!w.refundPassiveNode(gate), 'a purchased class start cannot anchor an orphaned branch');
assert(w.refundPassiveNode('refund_other_start_branch')); assert(w.refundPassiveNode(gate));
assert.equal(m.passivePoints, 100);
console.log('PASS Vocation gate requirements and original Vocation currency remain intact');

registerPassiveRealm({ id: 'refund_realm', label: 'Test', roots: ['refund_root'], currency: 'refund_currency' });
plant('refund_root', [], { realm: 'refund_realm' }); plant('refund_realm_node', ['refund_root'], { realm: 'refund_realm' });
m.realmPoints.refund_currency = 3; assert(w.allocateNode('refund_realm_node'));
assert(!w.refundPassiveNode('refund_root')); assert(w.refundPassiveNode('refund_realm_node'));
assert.equal(m.realmPoints.refund_currency, 3); assert.equal(m.passivePoints, 100);
registerPassiveRealm({ id: 'refund_free', label: 'Free', adjacency: 'free', currency: 'communion' });
plant('refund_free_node', [], { realm: 'refund_free' }); m.realmPoints.communion = 1;
assert(w.allocateNode('refund_free_node')); assert(w.refundPassiveNode('refund_free_node'));
assert.equal(m.realmPoints.communion, 1);
console.log('PASS rooted and free constellations refund their own currencies');

assert(w.allocateNode('refund_bridge'));
const badPointCount = m.passivePoints;
for (const nodeId of ['__proto__', 'constructor', 'not_a_node']) assert(!w.refundPassiveNode(nodeId));
w.applyAction(w.localSeat, { t: 'refundPassive', nodeId: 4 } as never);
assert.equal(m.passivePoints, badPointCount);
w.player.pos.x += 1000; assert(!w.refundPassiveNode('refund_bridge'));
w.player.pos = { ...font.pos }; w.player.tier = (font.tier ?? 0) + 1; assert(!w.refundPassiveNode('refund_bridge'));
w.player.tier = font.tier ?? 0;
w.player.dead = true; assert(!w.refundPassiveNode('refund_bridge')); w.player.dead = false;
w.player.downed = true; assert(!w.refundPassiveNode('refund_bridge')); w.player.downed = false;
const objective = w.zone.objective; w.zone.objective = { kind: 'none' }; w.lastCombatAt = w.time;
assert(!w.refundPassiveNode('refund_bridge')); w.zone.objective = objective;
const guest = w.addSeat('refund_guest', m.classDef, new NullInput());
guest.meta.passivePoints = 3; assert(w.allocateNode('refund_bridge', guest));
guest.actor.pos = { x: font.pos.x + 1000, y: font.pos.y };
w.applyAction(guest, { t: 'refundPassive', nodeId: 'refund_bridge' }); assert.equal(guest.meta.passivePoints, 2);
guest.actor.pos = { ...font.pos }; guest.actor.tier = font.tier ?? 0;
w.applyAction(guest, { t: 'refundPassive', nodeId: 'refund_bridge' }); assert.equal(guest.meta.passivePoints, 3);
assert.equal(m.passivePoints, badPointCount);
assert(w.refundPassiveNode('refund_bridge'));
console.log('PASS host validates proximity, story, living/calm state, malformed intents and owning seat');

plant('refund_minion', [start], { mods: [mod('minionDamage', 'increased', 1), mod('minionLife', 'increased', 1)] });
assert(w.allocateNode('refund_minion'));
const inst = makeSkillInstance(SKILLS.summon_skeleton, 1);
m.knownSkills.set(inst.def.id, inst);
const body = w.createMonster('skeleton_warrior', 1, 'player', w.player); body.summonInst = inst;
w.actors.push(body);
w.bakeMinionOwnerStats(body, w.player, inst); body.life = body.maxLife();
const damage = body.sheet.get('damage'), fullLife = body.maxLife();
assert(w.refundPassiveNode('refund_minion'));
assert(body.sheet.get('damage') < damage); assert(body.maxLife() < fullLife); assert(body.life <= body.maxLife());
console.log('PASS already summoned bodies lose refunded owner power immediately');

const saved = JSON.parse(JSON.stringify(serializeCharacter(w)));
const restored = makeSimWorld('warrior', 711); assert(applySavedCharacter(restored, saved));
assert.equal(restored.meta.passivePoints, m.passivePoints);
assert(!restored.meta.allocated.has('refund_minion')); assert(!restored.meta.choices.refund_choice);
console.log('PASS save/load retains refunds without resurrecting nodes or choices');
