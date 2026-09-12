import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { CLASSES } from '../src/data/classes';
import { PRECISION_STARTER_TREES } from '../src/data/precisionStarterTrees';
import { makeSkillInstance, instanceDelivery, instanceChannel, instanceBaseTags, instanceEffects, instanceChargeCost, instanceCastCycle, instanceMods, skillContextTags, treeNodeRefusal, supportFitsInst, type SkillInstance } from '../src/engine/skills';
import { mod, STAT_DEFS } from '../src/engine/stats';
import { serializeCharacter, rebuildSkill } from '../src/meta/character';
import { serializeSeatMeta, applySeatMeta } from '../src/net/snapshot';
import { setSimTap } from '../src/engine/tap';
import type { World } from '../src/engine/world';
let failed = 0, passed = 0, routes = 0;
const check = (name: string, ok: boolean) => { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (ok) passed++; else failed++; };
const near = (a: number, b: number) => Math.abs(a - b) < 0.00001;
const canonical = (x: unknown): string => JSON.stringify(x, (_k, v) => Array.isArray(v) ? [...v].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) : v);
function setup(id: string, nodes: string[] = []) {
  const klass = CLASSES.find(c => ['assassin', 'blademaster', 'brawler'].includes(c.id) && c.bar.includes(id))!;
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
  const p = w.player; p.casting = null; p.useLock = 0; p.cooldowns.clear();
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
function hit() { return makeSkillInstance({ ...SKILLS.frost_nova, effects: [{ type: 'damage' }], baseDamage: { chaos: [20, 20] }, innateMods: [mod('critChance', 'override', 0)] }); }
const restore = seedGlobalRandom(0xded1ca7e);
try {
  check('Assassin, Blademaster and Brawler have complete starting trees', CLASSES.filter(c => ['assassin', 'blademaster', 'brawler'].includes(c.id)).every(c => c.bar.filter(Boolean).every(id => !!PRECISION_STARTER_TREES[id!])));
  for (const [id, tree] of Object.entries(PRECISION_STARTER_TREES)) {
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
      const a = body(s.w, id === 'rend' && mid.links![0] === 'ragged_crescent' ? 150 : 40);
      if (id === 'eviscerate') a.applyStatus('bleed', 5, 1, s.p.name);
      if (id === 'haymaker') s.p.gainCharge('fury', 3, 5);
      const used = cast(s.w, s.inst, a.pos);
      if (id === 'riposte') s.w.executeSkill(a, hit(), s.p.pos);
      step(s.w, id === 'invisibility' ? 0.1 : 1.2);
      const worked = id === 'invisibility' ? s.p.sheet.get('invisible') > 0 : a.life < a.maxLife();
      check(id + '/' + leaf.id + ': real cast performs its damage/concealment/counter role', used && worked && s.inst.treeNodes?.length === 3);
      const saved = rebuildSkill(serializeCharacter(s.w).knownSkills.find(k => k.skillId === id)!)!;
      check(id + '/' + leaf.id + ': save rebuild preserves picks and resolved behavior', saved.treeNodes?.join() === s.inst.treeNodes?.join() && canonical(instanceEffects(saved)) === canonical(instanceEffects(s.inst)) && canonical(instanceDelivery(saved)) === canonical(instanceDelivery(s.inst)) && canonical(instanceChannel(saved)) === canonical(instanceChannel(s.inst)) && canonical(instanceCastCycle(saved)) === canonical(instanceCastCycle(s.inst)));
      const other = setup(id); applySeatMeta(other.w, other.w.localSeat, serializeSeatMeta(s.w.localSeat));
      const wired = other.w.meta.knownSkills.get(id)!;
      check(id + '/' + leaf.id + ': network rebuild restores modifiers, grafts and effects', canonical(instanceMods(wired)) === canonical(instanceMods(s.inst)) && canonical(instanceEffects(wired)) === canonical(instanceEffects(s.inst)) && canonical(instanceCastCycle(wired)) === canonical(instanceCastCycle(s.inst)));
      check(id + '/' + leaf.id + ': save and network rebuild preserve spender contracts', canonical(instanceChargeCost(saved)) === canonical(instanceChargeCost(s.inst)) && canonical(instanceChargeCost(wired)) === canonical(instanceChargeCost(s.inst)));
    }
  }
  check('all 72 terminal routes exercised', routes === 72);

  {
    const { w, p, inst } = setup('eviscerate', ['reopened_wound']); const foe = body(w);
    const mana = p.mana; check('Eviscerate refuses an unbleeding target without payment', !cast(w, inst, foe.pos) && p.mana === mana);
    foe.applyStatus('bleed', 4, 1, p.name); const old = foe.statuses.find(s => s.id === 'bleed'); cast(w, inst, foe.pos);
    const fresh = foe.statuses.find(s => s.id === 'bleed');
    check('Reopened Wound consumes the old bleed and lands a new one', !!fresh && fresh !== old && fresh.dps > 0);
    check('fresh wound permits the next real execution', cast(w, inst, foe.pos));
    const splash = setup('eviscerate', ['crimson_execution', 'wide_execution']); const primary = body(splash.w), nearby = body(splash.w, 130), far = body(splash.w, 250), ally = body(splash.w, 120, 'player');
    primary.applyStatus('bleed', 10, 1, splash.p.name); cast(splash.w, splash.inst, primary.pos);
    check('Crimson Execution consumes bleed and splashes at invested radius without hurting allies', !primary.statuses.some(s => s.id === 'bleed') && nearby.life < nearby.maxLife() && far.life === far.maxLife() && ally.life === ally.maxLife());
    check('area support follows Crimson Execution area behavior', supportFitsInst(SUPPORTS.widening, splash.inst) && !supportFitsInst(SUPPORTS.widening, inst));
  }
  {
    const { w, p, inst } = setup('invisibility', ['assassins_intent', 'certain_intent', 'hungry_intent']); cast(w, inst);
    const foe = body(w, 160); p.life /= 2; const life = p.life;
    const arrow = makeSkillInstance({ ...SKILLS.piercing_arrow, useTime: 0, cooldown: 0, effects: [{ type: 'damage' }] });
    cast(w, arrow, foe.pos);
    check('offensive projectile launch spends invisibility but preserves prepared attack', p.sheet.get('invisible') === 0 && p.buffs.has('assassins_intent'));
    step(w, 0.7); check('landed projectile consumes attack preparation and leeches to caster', !p.buffs.has('assassins_intent') && p.life > life && foe.life < foe.maxLife());
    cast(w, inst); check('respec removes both true invisibility and attack preparation', reset(w, inst) && !p.buffs.has('assassins_intent') && !p.buffs.has('invisibility'));
    const escape = setup('invisibility', ['patient_vanish']); escape.p.sheet.removeSource('rig'); const baseRegen = escape.p.sheet.get('lifeRegen'); escape.p.life /= 2; const before = escape.p.life; cast(escape.w, escape.inst); step(escape.w, 0.6);
    check('Patient Vanish regenerates while actually invisible', escape.p.life > before && escape.p.sheet.get('invisible') > 0);
    step(escape.w, 10); check('concealment and healing expire together', !escape.p.buffs.has('invisibility') && escape.p.sheet.get('lifeRegen') === baseRegen);
  }
  for (const [root, count, scale] of [['quick_composure', 2, 1.5], ['deep_composure', 4, 4]] as const) {
    const { w, p, inst } = setup('zanshin_cut', [root]); const foe = body(w);
    check(root + ': native counter identity resolves through tree', instanceCastCycle(inst)?.count === count && instanceCastCycle(inst)?.buff.nextHit?.statusScale === scale);
    for (let i = 0; i < count - 1; i++) cast(w, inst, foe.pos);
    check(root + ': preparation waits for the authored number of completed cuts', !p.buffs.has('zanshin'));
    cast(w, inst, foe.pos); check(root + ': final cut prepares the next melee hit', p.buffs.has('zanshin') && !foe.statuses.some(s => s.id === 'bleed'));
    cast(w, inst, foe.pos); check(root + ': next cut consumes preparation and applies bleed', !p.buffs.has('zanshin') && foe.statuses.some(s => s.id === 'bleed' && s.dps > 0));
    for (let i = 1; i < count; i++) cast(w, inst, foe.pos);
    check(root + ': another full cycle can prepare again', p.buffs.has('zanshin'));
    reset(w, inst); check(root + ': respec clears preparation and cast counter', !p.buffs.has('zanshin') && !p.castCycles.has(inst.def.id) && instanceCastCycle(inst) === SKILLS.zanshin_cut.castCycle);
  }
  {
    const { w, p, inst } = setup('one_two', ['knuckle_flurry', 'deep_flurry']); const foe = body(w);
    let jabs = 0, crosses = 0; setSimTap({ onCast: (a, i) => { if (a === p) { if (i.def.id === 'one_two') jabs++; if (i.def.id === 'cross_jab') crosses++; } } });
    for (let i = 0; i < 3; i++) { cast(w, inst, foe.pos); step(w, 0.3); } setSimTap(null);
    check('One-Two stays jab, jab, Cross Jab with exactly one repeat per beat', jabs === 4 && crosses === 2);
    check('finisher inherits Fury cap and repeat investment', p.charges.get('fury') === 6 && !!w.comboStepOf(p, inst, 2)?.comboTreeMods?.some(m => m.stat === 'repeatCount'));
    const stepInst = w.comboStepOf(p, inst, 2)!; const invested = canonical(instanceMods(stepInst));
    reset(w, inst); const fresh = w.comboStepOf(p, inst, 2)!;
    check('respec retires cached finisher and removes inherited tree investment', fresh !== stepInst && !fresh.comboTreeMods && canonical(instanceMods(fresh)) !== invested);
    const plain = setup('one_two'), passive = setup('one_two', Array(4).fill('jab_practice'));
    const a = plain.w.comboStepOf(plain.p, plain.inst, 2)!, b = passive.w.comboStepOf(passive.p, passive.inst, 2)!;
    check('neutral ranks strengthen Cross Jab exactly once', near(passive.p.sheet.get('damage', skillContextTags(b), instanceMods(b)) - plain.p.sheet.get('damage', skillContextTags(a), instanceMods(a)), 0.6));
    const saved = rebuildSkill(serializeCharacter(passive.w).knownSkills.find(k => k.skillId === 'one_two')!)!;
    check('save-rebuilt host derives the same finisher investment', canonical(instanceMods(passive.w.comboStepOf(passive.p, saved, 2)!)) === canonical(instanceMods(b)));
  }
  {
    const parry = (nodes: string[], delay: number) => {
      const s = setup('riposte', nodes), foe = body(s.w); cast(s.w, s.inst, foe.pos); step(s.w, delay);
      const before = foe.life, life = s.p.life; s.w.executeSkill(foe, hit(), s.p.pos);
      return { ...s, counter: before - foe.life, protected: s.p.life === life };
    };
    const base = parry([], 0.1), razor = parry(['razors_reply', 'cruel_reply', 'brutal_reply'], 0.1);
    check('Razor reply uses its actual invested incoming-damage multiple', base.counter > 0 && near(razor.counter / base.counter, 4.5 / 2.2) && razor.protected && !razor.p.casting);
    const expired = parry(['razors_reply'], 0.5), patient = parry(['protectors_counter', 'patient_counter', 'lasting_counter'], 0.9);
    check('short and extended parry durations control whether real hits are countered', expired.counter === 0 && patient.counter > 0);
    const recovery = parry(['razors_reply', 'quick_reply'], 0.1);
    check('successful parry stamps invested cooldown and HUD duration', recovery.p.cooldowns.get('riposte')! < base.p.cooldowns.get('riposte')! && near(recovery.p.cooldownTotals.get('riposte')!, recovery.p.cooldowns.get('riposte')!));
    const timeout = setup('riposte', ['razors_reply', 'quick_reply']); cast(timeout.w, timeout.inst); step(timeout.w, 0.5);
    check('unanswered stance also honors cooldown investment', !timeout.p.casting && timeout.p.cooldowns.get('riposte')! < 3);
    const shared = setup('riposte', ['protectors_counter']), minion = body(shared.w, 20, 'player', true), foe = body(shared.w, 80);
    const targetHit = makeSkillInstance({ ...SKILLS.ignite, requirements: undefined, manaCost: 0, effects: [{ type: 'damage' }], baseDamage: { chaos: [20, 20] }, innateMods: [mod('critChance', 'override', 0)] });
    cast(shared.w, shared.inst, foe.pos); const before = minion.life; shared.w.useSkill(foe, targetHit, minion.pos);
    check('Protector counter intercepts a real hit on an owned minion', minion.life === before && foe.life < foe.maxLife() && !shared.p.casting);
  }
  {
    const { w, inst } = setup('chain_pull', ['barbed_reel']); const foe = body(w, 220), start = foe.pos.x;
    cast(w, inst, foe.pos); step(w, 0.7);
    check('barbed chain actually pulls and primes bleed plus impale', foe.pos.x < start - 100 && foe.statuses.some(s => s.id === 'bleed') && foe.statuses.some(s => s.id === 'impaled'));
    const fan = setup('chain_pull', ['dragnet_chain']); fan.w.executeSkill(fan.p, fan.inst, { x: fan.p.pos.x + 400, y: fan.p.pos.y });
    check('Dragnet launches three actual chains', fan.w.projectiles.filter(a => a.inst === fan.inst).length === 3);
  }
  {
    const { w, p, inst } = setup('haymaker', ['measured_hook']); const foe = body(w); p.gainCharge('fury', 1, 5); const mana = p.mana;
    check('Measured Hook refuses fewer than two Fury before charging mana', !cast(w, inst, foe.pos) && p.mana === mana && p.charges.get('fury') === 1);
    p.gainCharge('fury', 4, 5); const x = foe.pos.x; cast(w, inst, foe.pos); step(w, 0.3);
    check('Measured Hook spends two Fury, preserves three, and retains knockback', p.charges.get('fury') === 3 && foe.pos.x > x);
    const wide = setup('haymaker', ['clearing_hook']), enemy = body(wide.w, 20); enemy.pos.y += 30; cast(wide.w, wide.inst);
    check('Clearing Hook hits a side target beyond the original narrow arc', enemy.life < enemy.maxLife());
  }
  {
    for (const root of ['blood_draw', 'flowing_draw']) {
      const { w, p, inst } = setup('iai_strike', [root]); const foe = body(w, 120), start = p.pos.x;
      const used = cast(w, inst, { x: p.pos.x + 240, y: p.pos.y }); step(w, 0.5);
      check(root + ': timed draw keeps actual phasing movement, damage and disarm', used && p.pos.x > start + 100 && foe.life < foe.maxLife() && foe.statuses.some(s => s.id === 'disarm'));
      if (root === 'flowing_draw') check('Flowing Draw creates a temporary defensive blessing that respec removes', p.buffs.has('flowing_draw') && reset(w, inst) && !p.buffs.has('flowing_draw'));
      else check('Blood Draw opens an actual bleeding wound', foe.statuses.some(s => s.id === 'bleed'));
    }
  }
} finally { setSimTap(null); restore(); }
console.log(`Precision starter trees: ${passed} passed, ${failed} failures; ${routes} terminal routes`);
if (failed) process.exitCode = 1;
