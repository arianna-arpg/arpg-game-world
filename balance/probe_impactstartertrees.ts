import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { CLASSES } from '../src/data/classes';
import { IMPACT_STARTER_TREES } from '../src/data/impactStarterTrees';
import { BASH_CFG, makeSkillInstance, instanceDelivery, instanceChannel, instanceBaseTags, instanceEffects, instanceChargeCost, instanceCastCycle, instancePulsePlan, impactTreeOverrideErrors, instanceMods, skillContextTags, treeNodeRefusal, supportFitsInst, type SkillInstance } from '../src/engine/skills';
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
  const klass = CLASSES.find(c => ['breaker', 'vanguard', 'lancer'].includes(c.id) && c.bar.includes(id))!;
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
function lodge(w: World, a: ReturnType<typeof body>, bank = 100) {
  a.applyStatus('impaled', 0, 10, 'probe', { rupture: bank, ruptureType: 'physical', casterId: w.player.id });
}
const restore = seedGlobalRandom(0xded1ca7e);
try {
  check('Breaker, Vanguard and Lancer have complete starting trees', CLASSES.filter(c => ['breaker', 'vanguard', 'lancer'].includes(c.id)).every(c => c.bar.filter(Boolean).every(id => !!IMPACT_STARTER_TREES[id!])));
  for (const [id, tree] of Object.entries(IMPACT_STARTER_TREES)) {
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
      const a = body(s.w, 60);
      if (id === 'verdict') { a.applyStatus('sundered', 0, 10, 'probe'); a.poiseBroken = true; a.poise = 0; }
      if (id === 'spear_recall') lodge(s.w, a);
      const used = cast(s.w, s.inst, a.pos);
      step(s.w, 2);
      const worked = id === 'marching_bulwark' ? s.p.casting?.mode === 'guard' : a.life < a.maxLife();
      check(id + '/' + leaf.id + ': real cast performs its damage or guard role', used && worked && s.inst.treeNodes?.length === 3);
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
    const rolling = setup('earthquake', ['rolling_quake']), buried = setup('earthquake', ['buried_verdict']);
    for (const s of [rolling, buried]) {
      const foe = body(s.w, 20); cast(s.w, s.inst, foe.pos);
      const zone = s.w.zones.find(z => z.inst === s.inst)!;
      const spec = instancePulsePlan(s.inst).native!;
      check(s.inst.treeNodes![0] + ': live pulse snapshots timing, count, damage and radius', !!zone?.pulse && near(zone.pulse.delay, spec.delay) && zone.pulse.left === spec.count && near(zone.pulse.dmgMult, spec.dmgMult!) && near(zone.pulse.radiusMult, spec.radiusMult!));
      const life = foe.life; step(s.w, spec.delay - 0.1);
      check(s.inst.treeNodes![0] + ': warning remains harmless until its own delay', near(foe.life, life));
      step(s.w, 0.2); check(s.inst.treeNodes![0] + ': actual delayed pulse damages the enemy', foe.life < life);
      const after = foe.life; reset(s.w, s.inst); step(s.w, 2);
      check(s.inst.treeNodes?.join() + ': respec cancels remaining tremors', !s.w.zones.some(z => z.inst === s.inst) && near(foe.life, after));
    }
    const s = setup('earthquake', ['rolling_quake', 'wide_quake', 'fourth_quake']);
    const support = Object.values(SUPPORTS).find(s => !!s.pulse)!; s.inst.sockets[0] = { def: support, level: 1 };
    const plan = instancePulsePlan(s.inst); cast(s.w, s.inst);
    const zone = s.w.zones.find(z => z.inst === s.inst)!;
    check('tree rhythm retains appended pulse supports and additive pulse count', supportFitsInst(support, s.inst) && plan.native?.count === 3 && plan.appended.length === 1 && zone.pulse?.left === 4 && !!zone.pulse.queue?.length);
  }
  {
    for (const root of ['final_sentence', 'passing_sentence']) {
      const s = setup('verdict', [root]), foe = body(s.w, 60); const mana = s.p.mana;
      check(root + ': unsundered target refuses without spending mana', !cast(s.w, s.inst, foe.pos) && s.p.mana === mana);
      foe.applyStatus('sundered', 0, 10, 'probe'); foe.poiseBroken = true; foe.poise = 0;
      check(root + ': a broken target permits a damaging real cast', cast(s.w, s.inst, foe.pos) && foe.life < foe.maxLife());
    }
    const s = setup('verdict', ['passing_sentence', 'sentencers_stride', 'guarded_sentence']); const foe = body(s.w, 60);
    foe.applyStatus('sundered', 0, 10, 'probe'); foe.poiseBroken = true; foe.poise = 0; cast(s.w, s.inst, foe.pos);
    check('completed Verdict grants its movement and defensive blessing', s.p.buffs.has('sentencers_stride') && s.p.sheet.get('damageTaken') < 1);
    reset(s.w, s.inst); check('Verdict respec removes its temporary blessing', !s.p.buffs.has('sentencers_stride'));
  }
  {
    const bank = (id: string, nodes: string[]) => {
      const s = setup(id, nodes), foe = body(s.w, 50); cast(s.w, s.inst, foe.pos); step(s.w, 0.35);
      return { ...s, foe, bank: foe.statuses.find(st => st.id === 'impaled')?.rupture ?? 0 };
    };
    const plain = bank('skewer', []), deep = bank('skewer', ['deep_skewer']);
    check('Deep Skewer increases the real lodged bank at equal investment', plain.bank > 0 && deep.bank > plain.bank * 1.8);
    const pin = bank('pinning_spear', ['lodging_spear']);
    check('Lodging Spear actually primes Extraction and bleeding at range', pin.bank > 0 && pin.foe.statuses.some(st => st.id === 'bleed'));
    const s = setup('skewer', ['raking_spear']), side = body(s.w, 30); side.pos.y += 55;
    cast(s.w, s.inst); check('Raking Spear lodges steel outside the native narrow arc', side.statuses.some(st => st.id === 'impaled'));
  }
  {
    const thrown = (nodes: string[]) => {
      const s = setup('pinning_spear', nodes); cast(s.w, s.inst, { x: s.p.pos.x + 460, y: s.p.pos.y });
      const shots = s.w.projectiles.filter(p => p.inst === s.inst).length; step(s.w, 1.8);
      return { ...s, shots, plants: s.w.actors.filter(a => !a.dead && a.owner === s.p && a.summonInst === s.inst) };
    };
    const base = thrown([]), fence = thrown(['spear_fence', 'lasting_fence', 'sturdy_fence']);
    check('Spear Fence launches three parallel shots and plants three real devices', base.shots === 1 && fence.shots === 3 && base.plants.length === 1 && fence.plants.length === 3);
    check('planted spears receive lifetime and life investment', fence.plants[0]?.lifespan! > base.plants[0]?.lifespan! && fence.plants[0]?.maxLife() > base.plants[0]?.maxLife());
    reset(fence.w, fence.inst); check('respec retires only that instance planted spears', fence.plants.every(a => a.dead) && base.plants.every(a => !a.dead));
    const returning = setup('shockfront', ['returning_front']); cast(returning.w, returning.inst);
    const p = returning.w.projectiles.find(p => p.inst === returning.inst)!; step(returning.w, 1.2);
    check('Returning Front enters its live homeward phase', p.returnMode === 2 && p.returnPhase);
  }
  {
    const extract = (nodes: string[]) => {
      const s = setup('spear_recall', nodes), foe = body(s.w, 300); lodge(s.w, foe); const before = foe.life;
      cast(s.w, s.inst); const pop = before - foe.life;
      const shot = s.w.projectiles.find(p => p.inst.def.id === 'impale_spear');
      return { ...s, foe, pop, shot };
    };
    const base = extract([]), rend = extract(['rending_extraction']), crossing = extract(['crossing_steel']);
    check('Extraction branches spend the same bank at the authored victim shares', base.pop > 0 && near(rend.pop / base.pop, 1.8 / 1.2) && near(crossing.pop / base.pop, 0.7 / 1.2) && [base, rend, crossing].every(s => !s.foe.statuses.some(st => st.id === 'impaled')));
    const intercept = body(crossing.w, 150), rendIntercept = body(rend.w, 150); const crossingLife = intercept.life, rendLife = rendIntercept.life;
    step(crossing.w, 0.3); step(rend.w, 0.3);
    check('Crossing Steel deals greater actual returning damage through an intervening enemy', crossingLife - intercept.life > rendLife - rendIntercept.life && rendLife > rendIntercept.life);
    const s = extract(['crossing_steel']); const other = makeSkillInstance(SKILLS.spear_recall, 20, 3); other.treeNodes = ['rending_extraction']; lodge(s.w, s.foe); cast(s.w, other);
    const shots = [...s.w.projectiles]; reset(s.w, s.inst);
    check('respec clears invested return flights while another same-caster instance survives', !s.w.projectiles.includes(s.shot!) && s.w.projectiles.some(p => shots.includes(p)));
    const guard = setup('spear_recall', ['rending_extraction', 'steel_resolve', 'mending_resolve']); cast(guard.w, guard.inst);
    check('Extraction utility blessing works honestly without a bank', guard.p.buffs.has('steel_resolve') && guard.p.sheet.get('damageTaken') < 1);
    reset(guard.w, guard.inst); check('Extraction respec removes utility blessing', !guard.p.buffs.has('steel_resolve'));
  }
  {
    for (const [id, tree] of Object.entries(IMPACT_STARTER_TREES)) check(id + ': pulse and extraction overrides validate', tree.nodes!.every(n => !impactTreeOverrideErrors(SKILLS[id], n).length));
    check('malformed pulse timing is rejected', !!impactTreeOverrideErrors(SKILLS.earthquake, { id: 'bad', name: 'bad', over: { ground: { pulse: { delay: NaN, count: 1.5 } } } }).length);
    check('extraction payload on an unrelated skill is rejected', !!impactTreeOverrideErrors(SKILLS.skewer, { id: 'bad', name: 'bad', over: { recallImpales: { radius: 100, damageScale: 1, spearShare: 1 } } }).length);
  }

  {
    const bash = (nodes: string[]) => {
      // THE ARM CLOCK: the bash is earned by the hold — stand the wall past
      // BASH_CFG.armTime before releasing (the parked foe never dents it).
      const s = setup('marching_bulwark', nodes), foe = body(s.w, 40); cast(s.w, s.inst, foe.pos); step(s.w, BASH_CFG.armTime + 0.05);
      const shield = s.p.casting!.shield!; s.p.casting!.held = false; step(s.w, 1 / 60);
      return { ...s, shield, damage: foe.maxLife() - foe.life };
    };
    const base = bash([]), answer = bash(['answering_march']);
    check('Answering March trades real shield capacity for a stronger real release', near(answer.shield / base.shield, 0.8) && near(answer.damage / base.damage, 1.28));
    const quicker = bash(['answering_march', 'ready_march']);
    check('guard release stamps invested cooldown and its matching HUD total', quicker.p.cooldowns.get('marching_bulwark')! < base.p.cooldowns.get('marching_bulwark')! && near(quicker.p.cooldowns.get('marching_bulwark')!, quicker.p.cooldownTotals.get('marching_bulwark')!));
    const parry = (nodes: string[], delay: number) => {
      const s = setup('marching_bulwark', nodes), foe = body(s.w, 40); cast(s.w, s.inst, foe.pos); step(s.w, delay);
      const shield = s.p.casting!.shield, life = s.p.life, before = foe.life;
      s.w.executeSkill(foe, makeSkillInstance({ ...SKILLS.frost_nova, effects: [{ type: 'damage' }], baseDamage: { chaos: [20, 20] }, innateMods: [mod('critChance', 'override', 0)] }), s.p.pos);
      return { ...s, damage: before - foe.life, saved: s.p.life === life && s.p.casting?.shield === shield };
    };
    const timed = parry(['measured_march'], 0.1), stronger = parry(['measured_march', 'patient_march', 'punishing_march'], 0.35), late = parry(['measured_march'], 0.35);
    check('Measured March parries in the invested window without spending shield', timed.damage > 0 && timed.saved && stronger.saved && near(stronger.damage / timed.damage, 2 / 1.5) && late.damage === 0);
    reset(stronger.w, stronger.inst); check('guard respec retires its held stance without a bash', !stronger.p.casting);
    const charge = setup('charge', ['battering_charge']); const foe = body(charge.w, 150); cast(charge.w, charge.inst, foe.pos); step(charge.w, 0.4);
    check('Battering Charge stuns a real contact during the unchanged committed run', foe.statuses.some(st => st.id === 'stun') && instanceDelivery(charge.inst) === SKILLS.charge.delivery);
    const maul = (nodes: string[]) => { const s = setup('sunder_maul', nodes), foe = body(s.w, 45); foe.sheet.setSource('poiseRig', [mod('poise', 'override', 10000), mod('poiseRegenPct', 'override', 0)]); foe.fillResources(); s.inst.def = { ...s.inst.def, baseDamage: { physical: [20, 20] } }; cast(s.w, s.inst, foe.pos); return 10000 - foe.poise; };
    check('Faultbreaker increases actual poise loss', maul(['faultbreaker']) > maul([]) * 1.3);
  }
} finally { setSimTap(null); restore(); }
console.log(`Impact starter trees: ${passed} passed, ${failed} failures; ${routes} terminal routes`);
if (failed) process.exitCode = 1;
