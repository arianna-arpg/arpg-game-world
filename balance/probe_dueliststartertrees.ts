import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { CLASSES } from '../src/data/classes';
import { DUELIST_STARTER_TREES } from '../src/data/duelistStarterTrees';
import { makeSkillInstance, instanceDelivery, instanceChannel, instanceBaseTags, instanceEffects, instanceChargeCost, instanceCastCycle, instanceMods, skillContextTags, treeNodeRefusal, supportFitsInst, type SkillInstance } from '../src/engine/skills';
import { mod, STAT_DEFS } from '../src/engine/stats';
import { serializeCharacter, rebuildSkill } from '../src/meta/character';
import { serializeSeatMeta, applySeatMeta } from '../src/net/snapshot';
import type { World } from '../src/engine/world';
let failed = 0, passed = 0, routes = 0;
const check = (name: string, ok: boolean) => { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (ok) passed++; else failed++; };
const near = (a: number, b: number) => Math.abs(a - b) < 0.00001;
const canonical = (x: unknown): string => JSON.stringify(x, (_k, v) => Array.isArray(v) ? [...v].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) : v);
function setup(id: string, nodes: string[] = []) {
  const klass = CLASSES.find(c => ['swashbuckler', 'matador', 'sharper'].includes(c.id) && c.bar.includes(id))!;
  const w = makeSimWorld(klass.id, 0xded1ca7e), p = w.player;
  for (const attr of Object.keys(w.meta.baseAttrs) as (keyof typeof w.meta.baseAttrs)[]) w.meta.baseAttrs[attr] = 100;
  w.recalcPlayer(); const inst = makeSkillInstance(SKILLS[id], 20, 3);
  w.meta.knownSkills.set(id, inst); p.skills.fill(null); p.skills[0] = inst;
  for (const node of nodes) w.pickTreeNode(id, node);
  p.sheet.setSource('rig', [mod('mana', 'flat', 10000), mod('accuracy', 'flat', 100000), mod('critChance', 'override', 0), mod('lifeRegen', 'override', 0)]);
  p.fillResources(); return { w, p, inst };
}
function step(w: World, seconds: number) { for (let i = 0; i < Math.ceil(seconds * 60); i++) w.update(1 / 60); }
function cast(w: World, inst: SkillInstance, aim = { x: w.player.pos.x + 40, y: w.player.pos.y }) {
  const p = w.player; p.casting = null; p.useLock = 0; p.cooldowns.delete(inst.def.id);
  const ok = w.useSkill(p, inst, aim, true);
  for (let i = 0; i < 150 && p.casting && !inst.def.guard && !inst.def.channel; i++) step(w, 1 / 60);
  return ok;
}
function body(w: World, x = 40, team: 'player' | 'enemy' = 'enemy', owner = false) {
  const a = w.createMonster('zombie', 1, team, owner ? w.player : undefined); a.skills = []; a.pos = { x: w.player.pos.x + x, y: w.player.pos.y }; a.tier = w.player.tier;
  a.sheet.setSource('rig', [mod('life', 'flat', 10000), mod('moveSpeed', 'override', 0), mod('lifeRegen', 'override', 0), mod('evasion', 'override', 0), mod('blockChance', 'override', 0)]);
  a.fillResources(); w.actors.push(a); return a;
}
function reset(w: World, inst: SkillInstance) { w.fonts.push({ pos: { ...w.player.pos } }); w.meta.abilityEssences.ability4 = 999; return w.fontResetTree(inst.def.id); }
const restore = seedGlobalRandom(0xded1ca7e);
try {
  check('Swashbuckler, Matador and Sharper have complete starting trees', CLASSES.filter(c => ['swashbuckler', 'matador', 'sharper'].includes(c.id)).every(c => c.bar.filter(Boolean).every(id => !!DUELIST_STARTER_TREES[id!])));
  for (const [id, tree] of Object.entries(DUELIST_STARTER_TREES)) {
    const nodes = tree.nodes!, roots = nodes.filter(n => n.excludes?.length), neutral = nodes.find(n => !n.links?.length && !n.excludes?.length)!;
    const plain = setup(id), passive = setup(id, Array(4).fill(neutral.id)), m = neutral.mods![0];
    const base = SKILLS[id], bare = makeSkillInstance({ ...base, tree: undefined }, 20, 3);
    check(id + ': unallocated cost, damage and effects equal a tree-less definition', canonical(plain.p.skillCost(plain.inst)) === canonical(plain.p.skillCost(bare)) && canonical(instanceMods(plain.inst)) === canonical(instanceMods(bare)) && instanceEffects(plain.inst) === base.effects);
    check(id + ': four neutral ranks preserve original effects, tags, delivery and channel', passive.inst.treeNodes?.length === 4 && instanceDelivery(passive.inst) === base.delivery && instanceEffects(passive.inst) === base.effects && instanceChannel(passive.inst) === base.channel && canonical(instanceBaseTags(passive.inst)) === canonical(base.tags));
    check(id + ': neutral investment strengthens its intended stat', passive.p.sheet.get(m.stat, new Set([...skillContextTags(passive.inst), ...(m.tags ?? [])]), instanceMods(passive.inst)) > plain.p.sheet.get(m.stat, new Set([...skillContextTags(plain.inst), ...(m.tags ?? [])]), instanceMods(plain.inst)));
    check(id + ': 15 nodes, four-rank passive, two exclusive trunks and eight leaves', nodes.length === 15 && neutral.ranks === 4 && roots.length === 2 && roots.every(r => nodes.filter(n => n.links?.includes(r.id)).length === 2) && nodes.filter(n => n.links?.length && !nodes.some(o => o.links?.includes(n.id))).length === 8);
    check(id + ': every authored stat is finite and registered', nodes.every(n => [...(n.mods ?? []), ...(n.buffs ?? []).flatMap(b => b.mods ?? [])].every(m => !!STAT_DEFS[m.stat] && Number.isFinite(m.value))));
    for (const level of [4, 5, 9, 10, 14, 15, 19, 20]) {
      const s = setup(id); s.inst.level = level;
      for (let i = 0; i < 5; i++) s.w.pickTreeNode(id, neutral.id);
      check(id + ': correct point budget at level ' + level, (s.inst.treeNodes?.length ?? 0) === Math.floor(level / 5));
    }
    for (const root of roots) {
      const mids = nodes.filter(n => n.links?.includes(root.id)), a = setup(id, [root.id, mids[0].id, mids[1].id, neutral.id]), b = setup(id, [neutral.id, root.id, mids[1].id, mids[0].id]);
      check(id + '/' + root.id + ': mixed forks and passive spend four points; rival and its descendants lock', a.inst.treeNodes?.length === 4 && !!treeNodeRefusal(a.inst, root.excludes![0]));
      check(id + '/' + root.id + ': allocation order does not change composed effects or modifiers', canonical(instanceMods(a.inst)) === canonical(instanceMods(b.inst)) && canonical(instanceEffects(a.inst)) === canonical(instanceEffects(b.inst)) && canonical(instanceChannel(a.inst)) === canonical(instanceChannel(b.inst)) && canonical(instanceDelivery(a.inst)) === canonical(instanceDelivery(b.inst)) && canonical(instanceChargeCost(a.inst)) === canonical(instanceChargeCost(b.inst)));
      const rival = nodes.find(n => n.id === root.excludes![0])!, locked = setup(id, [root.id]);
      check(id + '/' + root.id + ': rival descendants refuse with points still available', nodes.filter(n => n.links?.includes(rival.id)).every(n => !!treeNodeRefusal(locked.inst, n.id)));
      for (const mid of mids) {
        const leaves = nodes.filter(n => n.links?.includes(mid.id));
        const forward = setup(id, [root.id, mid.id, leaves[0].id, leaves[1].id]), reverse = setup(id, [root.id, mid.id, leaves[1].id, leaves[0].id]);
        check(id + '/' + mid.id + ': sibling leaves both allocate and commute', forward.inst.treeNodes?.length === 4 && reverse.inst.treeNodes?.length === 4 && canonical(instanceMods(forward.inst)) === canonical(instanceMods(reverse.inst)) && canonical(instanceEffects(forward.inst)) === canonical(instanceEffects(reverse.inst)) && canonical(instanceDelivery(forward.inst)) === canonical(instanceDelivery(reverse.inst)) && canonical(instanceChargeCost(forward.inst)) === canonical(instanceChargeCost(reverse.inst)));
      }
    }
    for (const leaf of nodes.filter(n => n.links?.length && !nodes.some(o => o.links?.includes(n.id)))) {
      routes++;
      const mid = nodes.find(n => n.id === leaf.links![0])!, s = setup(id, [mid.links![0], mid.id, leaf.id]);
      const a = body(s.w, 40);
      if (id === 'buckler_strike') a.pos.y += 45;
      const origin = { ...s.p.pos };
      if (id === 'wild_strike') a.radius = 35;
      const used = cast(s.w, s.inst, id === 'buckler_strike' ? { x: s.p.pos.x + 100, y: s.p.pos.y } : { x: s.p.pos.x + 230, y: s.p.pos.y });
      step(s.w, 2);
      const worked = id === 'cape_feint' ? s.p.pos.x > origin.x + 100
        : id === 'quiet_step' ? s.p.buffs.has('quiet_step')
        : id === 'stack_the_deck' ? s.p.buffs.has('stacked_deck') : a.life < a.maxLife();
      check(id + '/' + leaf.id + ': real cast performs its damage, movement or blessing role', used && worked && s.inst.treeNodes?.length === 3);
      const saved = rebuildSkill(serializeCharacter(s.w).knownSkills.find(k => k.skillId === id)!)!;
      check(id + '/' + leaf.id + ': save rebuild preserves picks and resolved behavior', saved.treeNodes?.join() === s.inst.treeNodes?.join() && canonical(instanceEffects(saved)) === canonical(instanceEffects(s.inst)) && canonical(instanceDelivery(saved)) === canonical(instanceDelivery(s.inst)) && canonical(instanceChannel(saved)) === canonical(instanceChannel(s.inst)) && canonical(instanceCastCycle(saved)) === canonical(instanceCastCycle(s.inst)));
      const other = setup(id); applySeatMeta(other.w, other.w.localSeat, serializeSeatMeta(s.w.localSeat));
      const wired = other.w.meta.knownSkills.get(id)!;
      check(id + '/' + leaf.id + ': network rebuild restores modifiers, grafts and effects', canonical(instanceMods(wired)) === canonical(instanceMods(s.inst)) && canonical(instanceEffects(wired)) === canonical(instanceEffects(s.inst)) && canonical(instanceCastCycle(wired)) === canonical(instanceCastCycle(s.inst)));
      check(id + '/' + leaf.id + ': save and network rebuild preserve spender contracts', canonical(instanceChargeCost(saved)) === canonical(instanceChargeCost(s.inst)) && canonical(instanceChargeCost(wired)) === canonical(instanceChargeCost(s.inst)));
    }
  }
  check('all 72 terminal routes exercised', routes === 72);
  for (const [id, root, buffId] of [['stack_the_deck', 'shared_table', 'stacked_deck'], ['quiet_step', 'quiet_company', 'quiet_step']]) {
    const s = setup(id, [root]), ally = body(s.w, 70, 'player', true), far = body(s.w, 700, 'player'), foe = body(s.w, 70);
    const down = body(s.w, 60, 'player'), upstairs = body(s.w, 60, 'player'); down.downed = true; upstairs.tier = s.p.tier + 1;
    const device = s.w.spawnConstruct(s.p, makeSkillInstance(SKILLS.flame_totem), { type: 'construct', kind: 'totem', range: 200, duration: 10, maxActive: 1 }, s.p.pos)!;
    cast(s.w, s.inst);
    check(id + ': shared blessing reaches caster and owned minion, excludes distant, hostile, downed, other-story and construct bodies', s.p.buffs.has(buffId) && ally.buffs.has(buffId) && [far, foe, down, upstairs, device].every(a => !a.buffs.has(buffId)));
    const other = makeSkillInstance(SKILLS[id], 20); other.treeNodes = [root];
    s.w.executeSkill(far, other, far.pos); // a separate caster refreshes its own distant blessing
    check(id + ': respec clears source blessings but preserves another caster\'s application', reset(s.w, s.inst) && !s.p.buffs.has(buffId) && !ally.buffs.has(buffId) && far.buffs.has(buffId));
    check(id + ': area support admits the shared route only', supportFitsInst(SUPPORTS.widening, setup(id, [root]).inst) && !supportFitsInst(SUPPORTS.widening, setup(id).inst));
  }
  for (const [id, root, buffId, attackId] of [['cape_feint', 'scarlet_answer', 'scarlet_answer', 'perfect_strike'], ['stack_the_deck', 'ace_in_reserve', 'stacked_deck', 'thrown_ace']]) {
    const s = setup(id, [root]); cast(s.w, s.inst); step(s.w, 0.2);
    const a = body(s.w, 35); const attack = makeSkillInstance(SKILLS[attackId]);
    const tags = skillContextTags(attack);
    const boost = s.p.sheet.get('damage', tags);
    cast(s.w, makeSkillInstance(SKILLS.frost_nova), a.pos);
    check(id + ': a spell hit leaves attack preparation intact', s.p.buffs.has(buffId));
    cast(s.w, attack, a.pos); step(s.w, 0.15);
    check(id + ': a landed qualifying attack spends its actual damage blessing', !s.p.buffs.has(buffId) && boost > s.p.sheet.get('damage', tags));
    cast(s.w, s.inst); check(id + ': respec clears unspent preparation', reset(s.w, s.inst) && !s.p.buffs.has(buffId));
  }
  {
    const s = setup('quiet_step', ['silent_cover']), a = body(s.w, 30);
    s.p.sheet.setSource('defender', [mod('evasion', 'override', 0), mod('blockChance', 'override', 0)]); s.p.es = 0;
    cast(s.w, s.inst);
    const hit = makeSkillInstance({ ...SKILLS.frost_nova, baseDamage: { chaos: [20, 20] }, effects: [{ type: 'damage' }], innateMods: [mod('critChance', 'override', 0)] });
    const before = s.p.life; s.w.executeSkill(a, hit, s.p.pos); const first = before - s.p.life;
    const after = s.p.life; s.w.executeSkill(a, hit, s.p.pos);
    check('Silent Cover protects the hit that breaks it', first > 0 && first < after - s.p.life && !s.p.buffs.has('quiet_step'));
  }
  for (const [id, root] of [['thrown_ace', 'full_hand'], ['planted_banderilla', 'public_challenge']]) {
    const s = setup(id, [root]); cast(s.w, s.inst);
    check(id + ': three real parallel projectiles are launched', s.w.projectiles.filter(p => p.inst === s.inst).length === 3);
    reset(s.w, s.inst); check(id + ': respec clears invested flights', !s.w.projectiles.some(p => p.inst === s.inst));
  }
  {
    const s = setup('thrown_ace', ['returning_ace']); cast(s.w, s.inst);
    const shot = s.w.projectiles.find(p => p.inst === s.inst)!; step(s.w, 1);
    check('Returning Ace enters a real homeward phase and keeps all four damage types', shot.returnPhase && shot.returnMode === 2 && Object.keys(s.inst.def.baseDamage!).length === 4);
  }
  for (const root of ['final_act', 'sweeping_finale']) {
    const hit = (timed: boolean) => {
      const s = setup('perfect_strike', [root]), a = body(s.w, 35); a.applyStatus('taunted', 0, 10, 'rig');
      s.inst.def = { ...s.inst.def, baseDamage: { physical: [20, 20] } };
      a.sheet.setSource('timing_target', [mod('armor', 'override', 0)]);
      s.w.useSkill(s.p, s.inst, a.pos, true); const cs = s.p.casting!;
      if (timed) { cs.elapsed = cs.total * 0.8; s.w.castPress(s.p); }
      step(s.w, 2); return { damage: a.maxLife() - a.life, cs };
    };
    const flat = hit(false), timed = hit(true);
    check(root + ': native golden window retains its 70% bonus through actual casts', timed.cs.empowered === 1.7 && near(timed.damage / flat.damage, 1.7));
  }
  for (const [id, root] of [['buckler_strike', 'barbed_figure'], ['dash_strike', 'threading_blade'], ['planted_banderilla', 'blood_challenge']]) {
    const s = setup(id, [root]), a = body(s.w, 35); if (id === 'buckler_strike') a.pos.y += 45;
    cast(s.w, s.inst, { x: s.p.pos.x + 230, y: s.p.pos.y }); step(s.w, 0.35);
    check(id + ': barbed route creates both bleed and an impale bank', a.statuses.some(st => st.id === 'bleed') && a.statuses.some(st => st.id === 'impaled' && st.rupture! > 0));
  }
  {
    const s = setup('dash_strike', ['duelists_pass', 'flowing_pass', 'mending_pass']); cast(s.w, s.inst);
    check('Duelist\'s Pass grants defense, movement and life recovery at dash start', s.p.buffs.has('duelists_pass') && s.p.sheet.get('damageTaken') < 1 && s.p.sheet.get('lifeRegenPct') >= 0.01);
    reset(s.w, s.inst); check('dash respec clears its source blessing', !s.p.buffs.has('duelists_pass'));
    const cape = setup('cape_feint', ['sheltering_cape']); cast(cape.w, cape.inst);
    const decoys = cape.w.actors.filter(a => a.owner === cape.p && a.construct?.kind === 'decoy');
    check('Cape Feint keeps its real afterimage alongside shelter', decoys.length === 1 && cape.p.buffs.has('sheltering_cape'));
    reset(cape.w, cape.inst); check('cape respec retires its afterimage and shelter', decoys.every(a => a.dead) && !cape.p.buffs.has('sheltering_cape'));
  }

} finally { restore(); }
console.log(`Duelist starting trees: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
