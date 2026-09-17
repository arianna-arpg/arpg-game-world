import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { CLASSES } from '../src/data/classes';
import { BASTION_STARTER_TREES } from '../src/data/bastionStarterTrees';
import { BASH_CFG, makeSkillInstance, instanceDelivery, instanceChannel, instanceBaseTags, instanceEffects, instanceChargeCost, instanceCastCycle, treeAuraOverrideErrors, hostSockets, instanceMods, skillContextTags, treeNodeRefusal, supportFitsInst, type SkillInstance } from '../src/engine/skills';
import { mod, STAT_DEFS } from '../src/engine/stats';
import { serializeCharacter, rebuildSkill } from '../src/meta/character';
import { serializeSeatMeta, applySeatMeta } from '../src/net/snapshot';
import type { World } from '../src/engine/world';
let failed = 0, passed = 0, routes = 0;
const check = (name: string, ok: boolean) => { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (ok) passed++; else failed++; };
const near = (a: number, b: number) => Math.abs(a - b) < 0.00001;
const canonical = (x: unknown): string => JSON.stringify(x, (_k, v) => Array.isArray(v) ? [...v].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) : v);
function setup(id: string, nodes: string[] = []) {
  const klass = CLASSES.find(c => ['sentinel', 'warlord', 'wallwright'].includes(c.id) && c.bar.includes(id))!;
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
  check('Sentinel, Warlord and Wallwright have complete starting trees', CLASSES.filter(c => ['sentinel', 'warlord', 'wallwright'].includes(c.id)).every(c => c.bar.filter(Boolean).every(id => !!BASTION_STARTER_TREES[id!])));
  for (const [id, tree] of Object.entries(BASTION_STARTER_TREES)) {
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
      const a = body(s.w, 40); s.p.recentHurt = 0;
      const origin = { ...s.p.pos };
      const used = cast(s.w, s.inst, id === 'shield_charge' ? { x: s.p.pos.x + 230, y: s.p.pos.y } : a.pos);
      step(s.w, 0.1);
      if (id === 'spiked_bulwark') s.w.executeSkill(a, makeSkillInstance({ ...SKILLS.frost_nova, effects: [{ type: 'damage' }], baseDamage: { chaos: [20, 20] }, innateMods: [mod('critChance', 'override', 0)] }), s.p.pos);
      step(s.w, 1);
      const worked = id === 'spiked_bulwark' ? !!s.p.casting?.shield && a.life < a.maxLife()
        : id === 'bristleback' ? s.p.activeAuras.has(id) && s.p.sheet.get('thorns') >= 10
        : id === 'stone_rampart' || id === 'battle_standard' ? s.w.actors.some(a => !a.dead && a.construct && a.summonInst === s.inst)
        : id === 'single_out' ? a.statuses.some(st => st.id === 'exposed') && a.statuses.some(st => st.id === 'taunted')
        : id === 'challenging_shout' ? a.statuses.some(st => st.id === 'taunted')
        : id === 'shield_charge' ? s.p.pos.x > origin.x + 100 && a.life < a.maxLife() : a.life < a.maxLife();
      check(id + '/' + leaf.id + ': real cast performs its native role with the invested route', used && worked && s.inst.treeNodes?.length === 3);
      const saved = rebuildSkill(serializeCharacter(s.w).knownSkills.find(k => k.skillId === id)!)!;
      check(id + '/' + leaf.id + ': save rebuild preserves picks and resolved behavior', saved.treeNodes?.join() === s.inst.treeNodes?.join() && canonical(instanceEffects(saved)) === canonical(instanceEffects(s.inst)) && canonical(instanceDelivery(saved)) === canonical(instanceDelivery(s.inst)) && canonical(instanceChannel(saved)) === canonical(instanceChannel(s.inst)) && canonical(instanceCastCycle(saved)) === canonical(instanceCastCycle(s.inst)));
      const other = setup(id); applySeatMeta(other.w, other.w.localSeat, serializeSeatMeta(s.w.localSeat));
      const wired = other.w.meta.knownSkills.get(id)!;
      check(id + '/' + leaf.id + ': network rebuild restores modifiers, grafts and effects', canonical(instanceMods(wired)) === canonical(instanceMods(s.inst)) && canonical(instanceEffects(wired)) === canonical(instanceEffects(s.inst)) && canonical(instanceCastCycle(wired)) === canonical(instanceCastCycle(s.inst)) && canonical(instanceDelivery(wired)) === canonical(instanceDelivery(s.inst)));
      check(id + '/' + leaf.id + ': save and network rebuild preserve spender contracts', canonical(instanceChargeCost(saved)) === canonical(instanceChargeCost(s.inst)) && canonical(instanceChargeCost(wired)) === canonical(instanceChargeCost(s.inst)));
    }
  }
  check('all 72 terminal routes exercised', routes === 72);
  for (const [id, tree] of Object.entries(BASTION_STARTER_TREES)) {
    check(id + ': aura mutations validate', tree.nodes!.every(n => !treeAuraOverrideErrors(SKILLS[id], n).length));
    check(id + ': recipient modifiers use finite registered stats', tree.nodes!.every(n => [...(n.over?.aura?.allyMods ?? []), ...(n.over?.aura?.enemyMods ?? [])].every(m => !!STAT_DEFS[m.stat] && Number.isFinite(m.value))));
  }
  check('aura mutation refuses a skill without a native field', treeAuraOverrideErrors(SKILLS.reprisal, { id: 'bad', name: 'bad', over: { aura: { allyMods: [mod('thorns', 'flat', 1)] } } }).length > 0);
  check('aura mutation rejects nonfinite and unknown recipient stats', treeAuraOverrideErrors(SKILLS.bristleback, { id: 'bad', name: 'bad', over: { aura: { allyMods: [mod('bogus', 'flat', NaN)] } } }).length > 0);

  for (const [id, root] of [['bristleback', 'sheltering_quills'], ['battle_standard', 'sheltering_colors']]) {
    const s = setup(id, [root]), ally = body(s.w, 70, 'player', true), enemy = body(s.w, 70), upstairs = body(s.w, 60, 'player'), far = body(s.w, 1000, 'player'); upstairs.tier++;
    cast(s.w, s.inst, s.p.pos); step(s.w, 0.1);
    check(id + ': native and tree field benefits reach caster and minion on the same story', near(s.p.sheet.get('damageTaken'), 0.88) && near(ally.sheet.get('damageTaken'), 0.88) && ally.sheet.get('thorns') > 0);
    check(id + ': hostile, far and other-story recipients get no allied field benefits', [enemy, upstairs, far].every(a => a.sheet.get('thorns') === 0 && near(a.sheet.get('damageTaken'), 1)));
    step(s.w, 1); check(id + ': repeated field ticks never stack the same source twice', near(ally.sheet.get('damageTaken'), 0.88));
    ally.pos.x += 1500; step(s.w, 0.1); check(id + ': leaving the field strips both native and invested modifiers', ally.sheet.get('thorns') === 0 && near(ally.sheet.get('damageTaken'), 1));
    ally.pos = { x: s.p.pos.x + 70, y: s.p.pos.y }; step(s.w, 0.1);
    ally.sheet.setSource('aura_budget', [mod('mana', 'flat', 1000)]); ally.mana = ally.maxMana();
    const otherInst = makeSkillInstance(SKILLS.bristleback, 20); s.w.executeSkill(ally, otherInst, ally.pos); step(s.w, 0.1);
    check(id + ': second bearer has an independently active native aura before reset', ally.activeAuras.has('bristleback'));
    check(id + ': reset retires its live aura immediately and preserves another bearer\'s native quills', reset(s.w, s.inst) && near(ally.sheet.get('damageTaken'), 1) && ally.sheet.get('thorns') === 10 && ally.activeAuras.has('bristleback'));
    check(id + ': reset releases captured reservations', s.p.reservedMana === 0 && !s.p.activeAuras.has(id));
    if (id === 'battle_standard') check('banner reset retires all source devices and their aura maps', s.w.actors.filter(a => a.summonInst === s.inst).every(a => a.dead && a.activeAuras.size === 0));
  }
  {
    const s = setup('bristleback'); cast(s.w, s.inst); step(s.w, 0.1);
    check('native Bristleback reserves mana and radiates its original quills', s.p.reservedMana > 0 && s.p.sheet.get('thorns') === 10);
    s.w.pickTreeNode('bristleback', 'hunting_quills');
    check('first tree investment retires an already-running native toggle', !s.p.activeAuras.size && s.p.reservedMana === 0 && s.p.sheet.get('thorns') === 0);
    cast(s.w, s.inst); step(s.w, 0.1);
    check('restarted Hunting Quills supplies its attack conversion and vulnerability', near(s.p.sheet.get('thornsToHit'), 0.6) && near(s.p.sheet.get('damageTaken'), 1.1));
    cast(s.w, s.inst); check('ordinary toggle-off immediately removes tree modifiers and reservation', !s.p.activeAuras.size && s.p.reservedMana === 0 && s.p.sheet.get('thornsToHit') === 0 && near(s.p.sheet.get('damageTaken'), 1));
  }
  {
    const s = setup('bristleback', ['hunting_quills', 'wide_hunt', 'snagging_hunt']), a = body(s.w, 40);
    a.sheet.removeSource('rig'); a.skills = [];
    const speed = a.sheet.get('moveSpeed'); cast(s.w, s.inst); step(s.w, 0.1);
    check('Snagging Hunt slows a real enemy through the aura domain', a.sheet.get('moveSpeed') < speed);
    reset(s.w, s.inst); check('reset strips an invested enemy aura source immediately', near(a.sheet.get('moveSpeed'), speed));
  }
  {
    const hit = (nodes: string[]) => {
      const s = setup('bristleback', nodes), a = body(s.w, 40); a.sheet.setSource('armor', [mod('armor', 'override', 0)]);
      cast(s.w, s.inst); step(s.w, 0.1);
      s.w.executeSkill(s.p, makeSkillInstance({ ...SKILLS.frost_nova, effects: [{ type: 'damage' }], baseDamage: { physical: [20, 20] }, innateMods: [mod('critChance', 'override', 0)] }), a.pos);
      return a.maxLife() - a.life;
    };
    check('Hunting Quills actually adds thorns to a landed hit', hit(['hunting_quills', 'barbed_hunt']) > hit([]));
  }
  {
    const s = setup('battle_standard', ['conquering_colors', 'ready_colors', 'second_colors']);
    for (let i = 0; i < 4; i++) cast(s.w, s.inst, { x: s.p.pos.x + i * 60, y: s.p.pos.y });
    const banners = s.w.actors.filter(a => !a.dead && a.summonInst === s.inst);
    check('Another Front retains three banners including the native level-12 threshold', banners.length === 3);
    step(s.w, 0.1); check('separate overlapping banners retain native independent-source stacking', s.p.sheet.get('attackSpeed') >= 1.45);
    reset(s.w, s.inst); check('reset removes all overlapping banner bonuses without waiting for another tick', banners.every(a => a.dead) && near(s.p.sheet.get('thorns'), 0));
  }
  for (const [id, root, buffId] of [['single_out', 'warband_verdict', 'warband_verdict'], ['challenging_shout', 'rallying_challenge', 'rallying_challenge']]) {
    const s = setup(id, [root]), ally = body(s.w, 70, 'player', true), far = body(s.w, 1500, 'player'), foe = body(s.w, 40), down = body(s.w, 60, 'player'), upstairs = body(s.w, 60, 'player'); down.downed = true; upstairs.tier++;
    const device = s.w.spawnConstruct(s.p, makeSkillInstance(SKILLS.flame_totem), { type: 'construct', kind: 'totem', range: 200, duration: 10, maxActive: 1 }, s.p.pos)!;
    cast(s.w, s.inst, foe.pos);
    check(id + ': snapshot blessing reaches caster and minion, excluding hostile, far, downed, other-story and construct bodies', s.p.buffs.has(buffId) && ally.buffs.has(buffId) && [far, foe, down, upstairs, device].every(a => !a.buffs.has(buffId)));
    const other = makeSkillInstance(SKILLS[id], 20); other.treeNodes = [root]; s.w.executeSkill(far, other, foe.pos);
    check(id + ': respec strips only its source blessing', reset(s.w, s.inst) && !s.p.buffs.has(buffId) && !ally.buffs.has(buffId) && far.buffs.has(buffId));
  }
  {
    const s = setup('single_out', ['warband_verdict']), a = body(s.w, 40); cast(s.w, s.inst, a.pos);
    s.w.executeSkill(s.p, makeSkillInstance(SKILLS.frost_nova), a.pos);
    check('Warband Verdict survives a spell hit', s.p.buffs.has('warband_verdict'));
    const damage = s.p.sheet.get('damage', skillContextTags(SKILLS.toppling_stroke));
    s.w.executeSkill(s.p, makeSkillInstance(SKILLS.toppling_stroke), a.pos);
    check('a landed attack spends Warband Verdict after receiving its damage bonus', !s.p.buffs.has('warband_verdict') && s.p.sheet.get('damage', skillContextTags(SKILLS.toppling_stroke)) < damage);
  }
  for (const [id, root, buffId] of [['single_out', 'personal_challenge', 'personal_challenge'], ['challenging_shout', 'defiant_challenge', 'defiant_challenge'], ['shield_charge', 'sheltering_charge', 'sheltering_charge']]) {
    const s = setup(id, [root]), a = body(s.w, 40); cast(s.w, s.inst, a.pos);
    check(id + ': private blessing grants its defensive role', s.p.buffs.has(buffId));
    check(id + ': reset clears the private blessing', reset(s.w, s.inst) && !s.p.buffs.has(buffId));
  }
  {
    const s = setup('challenging_shout', ['defiant_challenge']), a = body(s.w, 40), guard = makeSkillInstance(SKILLS.spiked_bulwark, 20);
    cast(s.w, guard, a.pos); const stance = s.p.casting;
    const used = s.w.useSkill(s.p, s.inst, a.pos, true);
    check('invested Challenging Shout remains usable behind a held guard', used && s.p.casting === stance && s.p.buffs.has('defiant_challenge') && a.statuses.some(st => st.id === 'taunted'));
  }
  {
    for (const root of ['quilled_answer', 'sweeping_rebuke']) {
      const s = setup('reprisal', [root]), a = body(s.w, 40), mana = s.p.mana;
      s.p.recentHurt = 4;
      check(root + ': no recent wound refuses before payment', !s.w.useSkill(s.p, s.inst, a.pos, true) && s.p.mana === mana && !s.p.casting);
      s.p.recentHurt = 0; check(root + ': a recent wound permits the native attack', cast(s.w, s.inst, a.pos) && a.life < a.maxLife());
    }
    const hit = (nodes: string[]) => {
      const s = setup('reprisal', nodes), a = body(s.w, 40); s.p.recentHurt = 0;
      s.inst.def = { ...s.inst.def, baseDamage: { physical: [20, 20] } }; s.p.sheet.setSource('quills', [mod('thorns', 'flat', 40)]); a.sheet.setSource('armor', [mod('armor', 'override', 0)]);
      cast(s.w, s.inst, a.pos); return a.maxLife() - a.life;
    };
    check('Quilled Answer turns actual thorns into added attack damage', hit(['quilled_answer']) > hit([]));
    const bleed = setup('reprisal', ['quilled_answer', 'deep_answer', 'feeding_answer']), target = body(bleed.w, 40); bleed.p.recentHurt = 0;
    cast(bleed.w, bleed.inst, target.pos); check('Feed the Answer has a bleeding parent on its own terminal route', target.statuses.some(st => st.id === 'bleed'));
  }
  {
    const guard = (nodes: string[], release: boolean) => {
      const s = setup('spiked_bulwark', nodes), a = body(s.w, 40); cast(s.w, s.inst, a.pos); step(s.w, 0.05);
      const shield = s.p.casting!.shield!;
      // THE ARM CLOCK: a taught bash is earned by the hold too — stand the
      // wall past BASH_CFG.armTime (the parked foe never dents it) first.
      if (release) { step(s.w, BASH_CFG.armTime); s.p.casting!.held = false; step(s.w, 1 / 60); }
      else s.w.executeSkill(a, makeSkillInstance({ ...SKILLS.frost_nova, baseDamage: { chaos: [20, 20] }, effects: [{ type: 'damage' }], innateMods: [mod('critChance', 'override', 0)] }), s.p.pos);
      return { ...s, a, shield, damage: a.maxLife() - a.life };
    };
    const plain = guard([], false), hedge = guard(['living_hedge'], false);
    check('Living Hedge exchanges real guard capacity for stronger retaliation', near(hedge.shield / plain.shield, 0.8) && near(hedge.damage - plain.damage, 24));
    const mute = guard([], true), answering = guard(['answering_spikes'], true);
    check('Answering Spikes grants an actual release attack to the native mute guard', mute.damage === 0 && answering.damage > 0);
    const held = guard(['answering_spikes'], false), before = held.a.life;
    check('guard tree reset cancels the stance without its release attack', reset(held.w, held.inst) && !held.p.casting && held.a.life === before);
    const mend = setup('spiked_bulwark', ['living_hedge', 'deep_hedge', 'mending_hedge']), ally = body(mend.w, 80, 'player'); ally.life -= 100;
    cast(mend.w, mend.inst); const life = ally.life; step(mend.w, 0.5);
    check('Mending Hedge heals a nearby ally while the guard is held', ally.life > life);
  }
  {
    const wall = (nodes: string[]) => {
      const s = setup('stone_rampart', nodes); cast(s.w, s.inst, { x: s.p.pos.x + 100, y: s.p.pos.y });
      return { ...s, bodies: s.w.actors.filter(a => a.summonInst === s.inst && !a.dead) };
    };
    const plain = wall([]), holding = wall(['holding_masonry']);
    check('Holding Masonry keeps three segments with greater life and native taunt bodies', holding.bodies.length === 3 && near(holding.bodies[0].maxLife() / plain.bodies[0].maxLife(), 1.5) && holding.bodies.every(a => a.taunt));
    const answer = wall(['answering_masonry']), pillar = answer.bodies[0], a = body(answer.w, 40); a.pos = { x: pillar.pos.x + 40, y: pillar.pos.y }; const life = a.life;
    answer.w.kill(pillar, false, a); check('Answering Masonry pays a real death bash from a destroyed segment', a.life < life);
    const survivorLife = a.life; check('wall reset silently retires remaining segments', reset(answer.w, answer.inst) && answer.bodies.every(a => a.dead) && a.life === survivorLife);
    const expiring = wall(['answering_masonry']), e = body(expiring.w, 40); e.pos = { x: expiring.bodies[0].pos.x + 40, y: expiring.bodies[0].pos.y }; expiring.bodies[0].lifespan = 0.01; const before = e.life; step(expiring.w, 0.05);
    check('natural segment expiry still pays the native release', e.life < before);
  }
  {
    const arrival = (nodes: string[]) => {
      const s = setup('shield_charge', nodes), a = body(s.w, 290); cast(s.w, s.inst, { x: s.p.pos.x + 260, y: s.p.pos.y }); step(s.w, 0.7); return a.maxLife() - a.life;
    };
    check('Answering Charge adds a real arrival hit beyond the corridor', arrival(['answering_charge']) > arrival([]));
    const s = setup('toppling_stroke', ['demolition_stroke']), a = body(s.w, 40); cast(s.w, s.inst, a.pos);
    check('Demolition Stroke guarantees the native sunder on a landed victim', a.statuses.some(st => st.id === 'sundered'));
    for (const [id, root] of [['reprisal', 'sweeping_rebuke'], ['toppling_stroke', 'clearing_stroke']]) {
      const wide = setup(id, [root]), side = body(wide.w, 0); side.pos.y += 60; wide.p.recentHurt = 0;
      cast(wide.w, wide.inst, { x: wide.p.pos.x + 100, y: wide.p.pos.y });
      check(id + ': expanded arc hits a real flanker', side.life < side.maxLife());
    }
  }
  for (const [id, root] of [['spiked_bulwark', 'answering_spikes'], ['stone_rampart', 'answering_masonry'], ['shield_charge', 'answering_charge']]) {
    const s = setup(id, [root]);
    check(id + ': Answering Wall graft passes its mechanism gate', supportFitsInst(SUPPORTS.answering_wall, s.inst) && hostSockets(s.inst).filter(g => g.def.id === 'answering_wall').length === 1);
    s.inst.sockets[0] = { def: SUPPORTS.answering_wall, level: 1 }; s.w.recalcPlayer();
    check(id + ': a socketed twin replaces rather than duplicates the tree graft', hostSockets(s.inst).filter(g => g.def.id === 'answering_wall').length === 1);
  }
  {
    const exitHit = (quiet: boolean) => {
      const s = setup('bristleback', ['sheltering_quills']), a = body(s.w, 40);
      const d = s.inst.def.delivery;
      if (d.type !== 'aura') throw new Error('aura fixture');
      s.inst.def = { ...s.inst.def, delivery: { ...d, onDeactivate: { skillId: 'frost_nova' } } };
      cast(s.w, s.inst); step(s.w, 0.1); const before = a.life;
      if (quiet) reset(s.w, s.inst); else cast(s.w, s.inst);
      return { damage: before - a.life, reserved: s.p.reservedMana };
    };
    const ordinary = exitHit(false), quiet = exitHit(true);
    check('ordinary toggle-off preserves a native release attack, tree retirement suppresses it', ordinary.damage > 0 && quiet.damage === 0 && ordinary.reserved === 0 && quiet.reserved === 0);
    const original = canonical(SKILLS.bristleback.delivery), s = setup('bristleback', ['sheltering_quills', 'iron_quills', 'mending_quills', 'steady_quills']);
    const d = instanceDelivery(s.inst);
    check('composed aura retains every sibling benefit without mutating the native catalog', d.type === 'aura' && d.aura.allyMods!.length === 6 && canonical(SKILLS.bristleback.delivery) === original);
  }
} finally { restore(); }
console.log(`Bastion starting trees: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
