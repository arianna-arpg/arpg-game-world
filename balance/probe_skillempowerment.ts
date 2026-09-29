// Real Font, tree, save and wire regression for legendary duplicate investment.
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { SKILL_EMPOWERMENT } from '../src/data/skillEmpowerment';
import { ABILITY_ESSENCES } from '../src/data/essences';
import { makeSkillGem, instanceMods, skillContextTags, treeNodeRefusal, validTreeNodes } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { treeGraph } from '../src/engine/skilltree';
import { empowermentNumeral, empowermentPassive, empowermentRank, skillInstanceName, treePointBudget, treeInstanceNodeRanks } from '../src/engine/skillEmpowerment';
import { skillMergePlan } from '../src/engine/skillMerge';
import { freeCellCount, makeSkillGemItem, packSkillGemPayload, rebuildAnyItem, skillOfGemItem } from '../src/engine/gemitems';
import { serializeCharacter, rebuildSkill, rebuildSavedMeta } from '../src/meta/character';
import { skillToLoot } from '../src/meta/death';
import { serializeSeatMeta, applySeatMeta } from '../src/net/snapshot';

bootSimEngine(); seedGlobalRandom(0xe770);
let failed = 0;
const check = (name: string, ok: boolean): void => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; };
const w = makeSimWorld('swashbuckler', 0xe770), seat = w.localSeat, m = seat.meta;
w.fonts.push({ pos: { ...seat.actor.pos } }); m.items = [];
const fresh = (rank = 0, level = 20, id = 'wild_strike') => {
  const inst = makeSkillGem(SKILLS[id], level, 'legendary');
  if (rank) inst.empowermentRank = rank;
  return inst;
};
const grant = (rank = 0, level = 20) => w.grantSkillGemItem(seat, fresh(rank, level))!;
const copies = () => m.items.filter(i => i.gem?.kind === 'skill' && i.gem.skillId === 'wild_strike');

check('base legendary has no numeral; subtractive and extended Roman ranks',
  skillInstanceName(fresh()) === SKILLS.wild_strike.name && empowermentNumeral(4) === 'IV'
  && empowermentNumeral(49) === 'XLIX' && empowermentNumeral(4001) === '(IV)I');
const source = fresh(2, 10); source.treeNodes = ['ws_duelist', 'ws_firm_wrist', 'ws_economy', 'ws_economy'];
source.sockets[0] = { def: SUPPORTS.splitting, level: 3, locked: true };
source.attunedForm = 'dire_wolf'; source.replenishmentPaused = true;
w.grantSkillGemItem(seat, source);
const donor = fresh(1); donor.sockets[0] = { def: SUPPORTS.multistrike, level: 2, locked: true };
w.grantSkillGemItem(seat, donor);
const locked = grant(8); locked.locked = true;
const spark = fresh(10); spark.granted = true; const granted = w.grantSkillGemItem(seat, spark)!;
const preview = skillMergePlan(m.items, 'wild_strike', 'legendary');
check('preview conserves donor investment, picks highest rank and retains highest level',
  preview.result?.empowermentRank === 4 && preview.result.level === 20 && preview.barred === 2);
check('host Font action succeeds', w.fontMergeSkill('wild_strike', 'legendary'));
let keeperItem = copies().find(i => !i.locked && i.uid !== granted.uid)!;
let keeper = skillOfGemItem(keeperItem)!;
check('legendary keeper carries rank, tree, sockets, attunement and toggle preference',
  keeper.empowermentRank === 4 && keeper.level === 20 && keeper.sockets.length === 4
  && keeper.treeNodes?.join() === source.treeNodes.join() && keeper.sockets[0]?.locked === true
  && keeper.sockets[0]?.level === 3 && keeper.attunedForm === 'dire_wolf' && !!keeper.replenishmentPaused);
check('donor support returns locked and leveled; protected copies survive',
  m.items.some(i => i.gem?.kind === 'support' && i.gem.supportId === 'multistrike' && i.gem.level === 2 && i.locked)
  && m.items.includes(locked) && m.items.includes(granted));
grant(); check('a fresh rank-zero duplicate advances an invested copy', w.fontMergeSkill('wild_strike', 'legendary'));
keeperItem = copies().find(i => !i.locked && i.uid !== granted.uid)!; keeper = skillOfGemItem(keeperItem)!;
check('repeated merge advances IV to V without another equally ranked copy', keeper.empowermentRank === 5);
const before = JSON.stringify(m.items);
check('short pool refuses without mutation', !w.fontMergeSkill('wild_strike', 'legendary') && JSON.stringify(m.items) === before);
check('different identity or rarity cannot count', !skillMergePlan(m.items, 'fireball', 'legendary').result
  && !skillMergePlan(m.items, 'wild_strike', 'rare').result);
grant(); const awayBefore = JSON.stringify(m.items); seat.actor.pos.x += 1000;
check('station reach is authoritative', !w.fontMergeSkill('wild_strike', 'legendary') && JSON.stringify(m.items) === awayBefore);
seat.actor.pos.x -= 1000;
SKILL_EMPOWERMENT.enabled = false;
check('merge enable dial refuses without consuming investment', !w.fontMergeSkill('wild_strike', 'legendary'));
SKILL_EMPOWERMENT.enabled = true; SKILL_EMPOWERMENT.maxRank = 5;
check('configured cap refuses the whole merge', !w.fontMergeSkill('wild_strike', 'legendary'));
SKILL_EMPOWERMENT.maxRank = null;

const inst = fresh(2); m.knownSkills.set(inst.def.id, inst); seat.actor.skills[0] = inst;
const passive = 'ws_economy';
for (let i = 0; i < 6; i++) w.pickTreeNode(inst.def.id, passive);
check('passive spends exceed the old four-rank cap through real host actions',
  inst.treeNodes?.length === 6 && treeInstanceNodeRanks(inst, passive) === 6 && treePointBudget(inst).free === 0);
const allocated = inst.treeNodes?.join(); w.pickTreeNode(inst.def.id, passive);
check('expanded passive cap still holds', inst.treeNodes?.join() === allocated);
// Use the graph's legal ordinary picks instead of depending on one authored leaf name.
inst.treeNodes = [];
for (const id of treeGraph(inst.def)!.order) {
  if (!empowermentPassive(inst.def, id) && !treeNodeRefusal(inst, id) && inst.treeNodes.length < 4) w.pickTreeNode(inst.def.id, id);
}
check('ordinary branch point budget is unchanged', inst.treeNodes.length === 4 && treePointBudget(inst).abilityFree === 0);
const extraBranch = treeGraph(inst.def)!.order.find(id => !empowermentPassive(inst.def, id) && !inst.treeNodes!.includes(id))!;
check('passive-only points cannot buy branch upgrades', treeNodeRefusal(inst, extraBranch) !== null);
w.pickTreeNode(inst.def.id, passive); w.pickTreeNode(inst.def.id, passive);
check('bonus points remain spendable alongside a fully invested branch', inst.treeNodes.length === 6 && treePointBudget(inst).free === 0);

const saved = serializeCharacter(w), row = saved.knownSkills.find(s => s.skillId === inst.def.id)!;
check('saved character retains expanded passive allocations', rebuildSkill(row)?.treeNodes?.join() === inst.treeNodes.join()
  && rebuildSavedMeta(saved)?.meta.knownSkills.get(inst.def.id)?.empowermentRank === 2);
const wrapped = makeSkillGemItem(inst), rebuilt = rebuildAnyItem(JSON.parse(JSON.stringify(wrapped)))!;
check('bag serialization and reload preserve rank, numeral and every allocation', rebuilt.name.endsWith(' II')
  && JSON.stringify(packSkillGemPayload(skillOfGemItem(rebuilt)!)) === JSON.stringify(wrapped.gem));
const loot = skillToLoot(inst);
check('recoverable loot keeps empowerment and allocations', loot.kind === 'skill' && rebuildSkill(loot)?.treeNodes?.length === 6);
const wire = serializeSeatMeta(seat); applySeatMeta(w, seat, wire);
check('co-op host/client round trip retains rank and passive over-cap', m.knownSkills.get(inst.def.id)?.empowermentRank === 2
  && m.knownSkills.get(inst.def.id)?.treeNodes?.length === 6);
for (const bad of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
  check(`invalid rank ${bad} grants no empowerment`, empowermentRank({ rarity: 'legendary', empowermentRank: bad }) === 0);
}
check('lower rarity cannot smuggle empowerment', empowermentRank({ rarity: 'rare', empowermentRank: 5 }) === 0);
check('loader trims excess passive ranks and rejects unauthorized branch budget',
  validTreeNodes(inst.def, Array(8).fill(passive), 20, { rarity: 'legendary', empowermentRank: 2, quiet: true })?.length === 6
  && validTreeNodes(inst.def, row.treeNodes!, 20, { rarity: 'rare', empowermentRank: 2, quiet: true })?.length === 4);
for (const e of ABILITY_ESSENCES) m.abilityEssences[e.id] = 99;
check('Font respec refunds allocation while preserving rank and both budgets', w.fontResetTree(inst.def.id)
  && m.knownSkills.get(inst.def.id)?.empowermentRank === 2
  && treePointBudget(m.knownSkills.get(inst.def.id)!).passiveFree === 2);
SKILL_EMPOWERMENT.reward.pointsPerRank = 2;
check('reward tuning re-derives from saved rank', treePointBudget(m.knownSkills.get(inst.def.id)!).passive === 4);
SKILL_EMPOWERMENT.reward.pointsPerRank = 1;

// A full pack must never eat paid supports when the consumed wrappers free cells.
m.items = [];
for (let i = 0; i < 2; i++) {
  const full = fresh();
  full.sockets = Array.from({ length: 4 }, () => ({ def: SUPPORTS.splitting, level: 3, locked: true }));
  w.grantSkillGemItem(seat, full);
}
while (freeCellCount(m.items) > 0) w.grantSupportGemItem(seat, { def: SUPPORTS.multistrike, level: 1 });
const looseBefore = m.items.filter(i => i.gem?.kind === 'support').length;
const dropsBefore = w.drops.length;
check('full-bag merge succeeds with a surviving keeper', w.fontMergeSkill('wild_strike', 'legendary'));
const overflow = w.drops.slice(dropsBefore).filter(d => d.item.kind === 'support');
const fullKeeper = skillOfGemItem(copies()[0])!;
check('all eight socketed supports survive in keeper, bag or ground overflow',
  fullKeeper.sockets.filter(Boolean).length + m.items.filter(i => i.gem?.kind === 'support').length - looseBefore
    + overflow.length === 8 && overflow.length === 3
  && overflow.every(d => d.item.kind === 'support' && d.item.gem.locked && d.item.gem.level === 3));

// Multiple eligible passive nodes share one point bank; no per-node duplication.
const flask = Object.values(SKILLS).find(d => (treeGraph(d)?.order.filter(n => empowermentPassive(d, n)).length ?? 0) > 1)!;
const flaskInst = fresh(2, 20, flask.id);
const passiveIds = treeGraph(flask)!.order.filter(n => empowermentPassive(flask, n));
flaskInst.treeNodes = Array(3).fill(passiveIds[0]).concat(Array(3).fill(passiveIds[1]));
check('multiple passive slots share the same two bonus points', treePointBudget(flaskInst).free === 0
  && validTreeNodes(flask, [...flaskInst.treeNodes, passiveIds[0]], 20,
    { rarity: 'legendary', empowermentRank: 2, quiet: true })?.length === 6);

const policyBag = [makeSkillGemItem(fresh()), makeSkillGemItem(fresh()), makeSkillGemItem(fresh())];
SKILL_EMPOWERMENT.copiesPerMerge = 3; SKILL_EMPOWERMENT.ranksPerMerge = 2;
check('recipe size and rank gain are live policy', skillMergePlan(policyBag, 'wild_strike', 'legendary').result?.empowermentRank === 2);
SKILL_EMPOWERMENT.copiesPerMerge = 2; SKILL_EMPOWERMENT.ranksPerMerge = 1;

// The actual shared stat fold used by heals and newborn minions sees extra ranks.
for (const [id, stat] of [['mend', 'healPower'], ['shambler_horde', 'minionLife']] as const) {
  const def = SKILLS[id] ?? Object.values(SKILLS).find(d => treeGraph(d)?.order.some(n =>
    empowermentPassive(d, n) && treeGraph(d)!.nodes.get(n)!.node.mods?.some(mo => mo.stat === stat)))!;
  const node = treeGraph(def)!.order.find(n => empowermentPassive(def, n)
    && treeGraph(def)!.nodes.get(n)!.node.mods?.some(mo => mo.stat === stat))!;
  const skill = fresh(1, 20, def.id); skill.treeNodes = Array(4).fill(node);
  const base = seat.actor.sheet.get(stat, skillContextTags(def), instanceMods(skill));
  skill.treeNodes.push(node);
  check(`${stat} grows through the real modifier fold beyond four ranks`,
    seat.actor.sheet.get(stat, skillContextTags(def), instanceMods(skill)) > base);
}
const treeless = Object.values(SKILLS).find(d => !d.tree && !d.noDrop)!;
check('future trees can use banked investment without a bespoke skill rule',
  treePointBudget(fresh(3, 20, treeless.id)).passiveFree === 3);

// Confirm the granted rank reaches actual healing and a newborn minion's body.
const combat = makeSimWorld('cleric', 0xe771), healer = combat.player;
healer.sheet.setSource('empowerment-probe', [mod('life', 'flat', 10000), mod('critChance', 'override', 0)]);
const mend = fresh(1, 20, 'mend'); mend.treeNodes = Array(4).fill('mending_practice');
healer.life = 1; combat.executeSkill(healer, mend, healer.pos, { targetInfo: { actor: healer, pos: { ...healer.pos } } }); const healed4 = healer.life - 1;
mend.treeNodes.push('mending_practice');
healer.life = 1; combat.executeSkill(healer, mend, healer.pos, { targetInfo: { actor: healer, pos: { ...healer.pos } } }); const healed5 = healer.life - 1;
check('extra passive rank increases life actually restored by Mend', healed4 > 0 && healed5 > healed4);
const horde = fresh(1, 20, 'shambler_horde'); horde.treeNodes = Array(4).fill('stitched_flesh');
combat.executeSkill(healer, horde, healer.pos);
const firstCrew = combat.actors.filter(a => a.owner === healer && a.sourceSkillId === horde.def.id);
const life4 = firstCrew[0]?.maxLife() ?? 0;
for (const a of firstCrew) a.dead = true;
horde.treeNodes.push('stitched_flesh'); combat.executeSkill(healer, horde, healer.pos);
const life5 = combat.actors.find(a => !a.dead && a.owner === healer && a.sourceSkillId === horde.def.id)?.maxLife() ?? 0;
check('extra passive rank increases newly summoned minion life', life4 > 0 && life5 > life4);
console.log(`Legendary empowerment: ${failed} failures.`); process.exitCode = failed ? 1 : 0;
