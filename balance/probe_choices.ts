// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE PASSIVE CHOICE FABRIC end to end, incl. THE DEAL LAW
// (PassiveChoiceGroup.deal). Pins:
//   - THE BASELINE DEALS: an 'each' group deals at every node sharing it; a
//     multi-pick node re-pays the pool per pick and closes at its limit; a
//     character-unique group locks the TAKEN option across nodes and leaves
//     the rest live; picks FOLD (the option's mods land on the live sheet).
//   - 'sole' (the OATH cluster): the first node picked claims the group —
//     every sibling option refuses ('cluster claimed at …'), siblings can
//     never be allocated (blind allocation refuses too — a choice node with
//     a live deal never allocates blind), the shared helpers say why
//     (choiceNodeLocked / choiceDealClaimant), and the claimant itself keeps
//     dealing its own remaining picks.
//   - 'first' (the WAYPOST shortcut): the first node picked deals + grants;
//     siblings stay allocatable PLAIN — cost exactly 1, no pick recorded,
//     sheet byte-unchanged, options refused — and keep working as adjacency
//     (the shortcut actually shortcuts to a further node).
//   - THE LOAD LAW: sanitizeChoices keeps ONE claimant per 'sole'/'first'
//     group (record order) and keeps every node of an 'each' group.
//   - THE VALIDATOR: a 'sole'/'first' group dealt by one lone node warns
//     (the law is inert); the same group dealt by two stays silent.
//   - THE DEBUTS: road_oaths ships deal 'sole', wayposts ships deal 'first'.
// Run: npx tsx balance/probe_choices.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import type { World } from '../src/engine/world';
import { CLASSES } from '../src/data/classes';
import { PASSIVE_ADJACENCY, PASSIVE_NODES, classStartNode, type PassiveNode } from '../src/data/passives';
import {
  CHOICE_GROUPS, choiceDealClaimant, choiceDealSpent, choiceLockReason, choiceNodeLocked,
  registerChoiceGroup, sanitizeChoices, validatePassiveChoices,
} from '../src/data/passiveChoices';
import { mod } from '../src/engine/stats';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0xc401ce);

// ---------------------------------------------------------------- the groups
// Registered BEFORE the world boots so recalc folds them like shipped data.
const opt = (id: string, life: number): { id: string; name: string; description: string; mods: ReturnType<typeof mod>[] } =>
  ({ id, name: id, description: `+${life} life`, mods: [mod('life', 'flat', life)] });
registerChoiceGroup({ id: 'pr_each', name: 'Each', options: [opt('ea', 11), opt('eb', 13)] });
registerChoiceGroup({ id: 'pr_multi', name: 'Multi', pick: 2, options: [opt('ma', 17), opt('mb', 19), opt('mc', 23)] });
registerChoiceGroup({ id: 'pr_char', name: 'Char', unique: 'character', options: [opt('ca', 5), opt('cb', 7), opt('cc', 9)] });
registerChoiceGroup({ id: 'pr_sole', name: 'Sole', deal: 'sole', options: [opt('s1', 29), opt('s2', 31)] });
registerChoiceGroup({ id: 'pr_first', name: 'First', deal: 'first', options: [opt('f1', 37), opt('f2', 41)] });

const w = makeSimWorld(CLASSES[0].id, 0xbeef) as World;
const W = w as unknown as {
  meta: { passivePoints: number; allocated: Set<string>; choices: Record<string, string[]> };
  player: { sheet: { get(stat: string): number } };
};
const m = W.meta;
const life = (): number => W.player.sheet.get('life');
const start = classStartNode(CLASSES[0].id);

// Plant a probe choice node adjacent to `at` (registry + adjacency, both ways).
let nx = 0;
const plant = (id: string, group: string, at: string): void => {
  const n: PassiveNode = {
    id, name: id, description: '', kind: 'choice',
    x: 9000 + (nx += 40), y: 9000, links: [], choice: { group },
  };
  PASSIVE_NODES[id] = n;
  PASSIVE_ADJACENCY[id] = [at];
  (PASSIVE_ADJACENCY[at] ??= []).push(id);
};
plant('pr_each_a', 'pr_each', start);
plant('pr_each_b', 'pr_each', start);
plant('pr_multi_a', 'pr_multi', start);
plant('pr_char_a', 'pr_char', start);
plant('pr_char_b', 'pr_char', start);
plant('pr_sole_a', 'pr_sole', start);
plant('pr_sole_b', 'pr_sole', start);
plant('pr_first_a', 'pr_first', start);
plant('pr_first_b', 'pr_first', start);
plant('pr_first_c', 'pr_first', 'pr_first_b'); // reachable ONLY through b — the shortcut chain

m.passivePoints = 50;
check('start node allocated at creation', m.allocated.has(start));

// ------------------------------------------------------- baseline: 'each'
{
  const L0 = life();
  check('each: node A deals', w.allocateNode('pr_each_a', undefined, 'ea'));
  check('each: node B still deals (default law)', w.allocateNode('pr_each_b', undefined, 'eb'));
  check('each: both picks recorded', m.choices['pr_each_a']?.[0] === 'ea' && m.choices['pr_each_b']?.[0] === 'eb');
  check('each: picks FOLD onto the sheet', life() > L0, `life ${L0} -> ${life()}`);
}

// ------------------------------------------------------- baseline: multi-pick
{
  const p0 = m.passivePoints;
  check('multi: first pick allocates', w.allocateNode('pr_multi_a', undefined, 'ma'));
  check('multi: second pick re-pays, no fresh walk', w.allocateNode('pr_multi_a', undefined, 'mb'));
  check('multi: each pick cost exactly 1', m.passivePoints === p0 - 2, `${p0} -> ${m.passivePoints}`);
  check('multi: third pick refused at the limit', !w.allocateNode('pr_multi_a', undefined, 'mc'));
  check('multi: limit reason says so', choiceLockReason(PASSIVE_NODES['pr_multi_a'], 'mc', m.choices, PASSIVE_NODES) === 'all picks made');
}

// ------------------------------------------------- baseline: character-unique
{
  check('char-unique: node A takes an option', w.allocateNode('pr_char_a', undefined, 'ca'));
  check('char-unique: the TAKEN option locks at node B', !w.allocateNode('pr_char_b', undefined, 'ca'));
  const why = choiceLockReason(PASSIVE_NODES['pr_char_b'], 'ca', m.choices, PASSIVE_NODES);
  check('char-unique: reason names the taker', why !== null && why.includes('taken at'), String(why));
  check('char-unique: OTHER options stay live at node B', w.allocateNode('pr_char_b', undefined, 'cb'));
}

// ------------------------------------------------------------- THE OATH: sole
{
  const nodeB = PASSIVE_NODES['pr_sole_b'];
  check('sole: pre-claim, sibling options are open', choiceLockReason(nodeB, 's2', m.choices, PASSIVE_NODES) === null);
  check('sole: pre-claim, sibling is not locked', !choiceNodeLocked(nodeB, m.choices, PASSIVE_NODES));
  const L0 = life();
  check('sole: first node claims the cluster', w.allocateNode('pr_sole_a', undefined, 's1'));
  check('sole: the claim GRANTS', life() > L0, `life ${L0} -> ${life()}`);
  check('sole: sibling refuses every option', !w.allocateNode('pr_sole_b', undefined, 's2') && !w.allocateNode('pr_sole_b', undefined, 's1'));
  const why = choiceLockReason(nodeB, 's2', m.choices, PASSIVE_NODES);
  check('sole: reason is the cluster claim', why !== null && why.includes('cluster claimed'), String(why));
  check('sole: sibling refuses blind allocation too', !w.allocateNode('pr_sole_b'));
  check('sole: helper says locked, names the claimant',
    choiceNodeLocked(nodeB, m.choices, PASSIVE_NODES)
    && choiceDealClaimant(nodeB, m.choices, PASSIVE_NODES) === 'pr_sole_a');
  check('sole: sibling never allocated', !m.allocated.has('pr_sole_b'));
  check('sole: the claimant itself is NOT locked', !choiceNodeLocked(PASSIVE_NODES['pr_sole_a'], m.choices, PASSIVE_NODES));
  check('sole: claimant closed only by its own pick limit',
    choiceLockReason(PASSIVE_NODES['pr_sole_a'], 's2', m.choices, PASSIVE_NODES) === 'all picks made');
}

// -------------------------------------------------- THE WAYPOST: first
{
  const L0 = life();
  check('first: the first node deals + grants', w.allocateNode('pr_first_a', undefined, 'f1'));
  check('first: the deal GRANTS', life() > L0, `life ${L0} -> ${life()}`);
  const nodeB = PASSIVE_NODES['pr_first_b'];
  check('first: sibling deal reads SPENT', choiceDealSpent(nodeB, m.choices, PASSIVE_NODES)
    && choiceDealClaimant(nodeB, m.choices, PASSIVE_NODES) === 'pr_first_a');
  check('first: sibling is NOT sole-locked', !choiceNodeLocked(nodeB, m.choices, PASSIVE_NODES));
  check('first: sibling refuses OPTIONS', !w.allocateNode('pr_first_b', undefined, 'f2'));
  const p0 = m.passivePoints, L1 = life();
  check('first: sibling allocates PLAIN (the shortcut)', w.allocateNode('pr_first_b'));
  check('first: the shortcut costs exactly 1 point', m.passivePoints === p0 - 1, `${p0} -> ${m.passivePoints}`);
  check('first: the shortcut grants NOTHING', life() === L1, `life ${L1} -> ${life()}`);
  check('first: no pick recorded at the shortcut', m.choices['pr_first_b'] === undefined);
  check('first: shortcut re-allocation refused', !w.allocateNode('pr_first_b'));
  check('first: the shortcut IS adjacency — the chain continues', w.allocateNode('pr_first_c'));
}

// ------------------------------------------------------------- THE LOAD LAW
{
  const soleRaw = { pr_sole_a: ['s1'], pr_sole_b: ['s2'] };
  const soleOut = sanitizeChoices(soleRaw, PASSIVE_NODES);
  check('sanitize: sole keeps ONE claimant (record order)', soleOut['pr_sole_a']?.[0] === 's1' && soleOut['pr_sole_b'] === undefined);
  const soleRev = sanitizeChoices({ pr_sole_b: ['s2'], pr_sole_a: ['s1'] }, PASSIVE_NODES);
  check('sanitize: reversed record keeps the OTHER claimant', soleRev['pr_sole_b']?.[0] === 's2' && soleRev['pr_sole_a'] === undefined);
  const firstOut = sanitizeChoices({ pr_first_a: ['f1'], pr_first_b: ['f2'] }, PASSIVE_NODES);
  check('sanitize: first keeps one dealer too', firstOut['pr_first_a']?.[0] === 'f1' && firstOut['pr_first_b'] === undefined);
  const eachOut = sanitizeChoices({ pr_each_a: ['ea'], pr_each_b: ['eb'] }, PASSIVE_NODES);
  check('sanitize: each keeps every node', eachOut['pr_each_a']?.[0] === 'ea' && eachOut['pr_each_b']?.[0] === 'eb');
}

// ------------------------------------------------------------- THE VALIDATOR
{
  registerChoiceGroup({ id: 'pr_lonely', name: 'Lonely', deal: 'sole', options: [opt('la', 1), opt('lb', 2)] });
  const lone: string[] = [];
  validatePassiveChoices(msg => lone.push(msg), {
    pr_lone_1: { id: 'pr_lone_1', kind: 'choice', choice: { group: 'pr_lonely' } },
  });
  check('validator: a lone-node deal group warns inert', lone.some(msg => msg.includes('pr_lonely') && msg.includes('inert')));
  const paired: string[] = [];
  validatePassiveChoices(msg => paired.push(msg), {
    pr_sole_a: PASSIVE_NODES['pr_sole_a'],
    pr_sole_b: PASSIVE_NODES['pr_sole_b'],
  });
  check('validator: a two-node deal group stays silent', !paired.some(msg => msg.includes('pr_sole') && msg.includes('inert')));
}

// ---------------------------------------------------------------- THE DEBUTS
check('debut: road_oaths ships deal sole', CHOICE_GROUPS['road_oaths']?.deal === 'sole');
check('debut: wayposts ships deal first', CHOICE_GROUPS['wayposts']?.deal === 'first');

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
