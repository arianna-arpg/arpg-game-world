import { updateAI } from '../src/engine/ai';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { CLASSES } from '../src/data/classes';
import { PACT_STEEL_STARTER_TREES } from '../src/data/pactSteelStarterTrees';
import { makeSkillInstance, instanceDelivery, instanceChannel, instanceBaseTags, instanceEffects, instanceChargeCost, instanceMods, skillContextTags, treeNodeRefusal, supportFitsInst, type SkillInstance } from '../src/engine/skills';
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
  const klass = CLASSES.find(c => ['summoner', 'juggernaut', 'pyromancer'].includes(c.id) && c.bar.includes(id))!;
  const w = makeSimWorld(klass.id, 0xded1ca7e), p = w.player;
  for (const attr of Object.keys(w.meta.baseAttrs) as (keyof typeof w.meta.baseAttrs)[]) w.meta.baseAttrs[attr] = 100;
  w.recalcPlayer(); const inst = makeSkillInstance(SKILLS[id], 20, 3);
  w.meta.knownSkills.set(id, inst); p.skills.fill(null); p.skills[0] = inst;
  for (const node of nodes) w.pickTreeNode(id, node);
  p.sheet.setSource('rig', [mod('mana', 'flat', 10000), mod('accuracy', 'flat', 100000), mod('critChance', 'override', 0), mod('lifeRegen', 'override', 0)]);
  p.fillResources(); return { w, p, inst };
}
function step(w: World, seconds: number, minds = false) { for (let i = 0; i < Math.ceil(seconds * 60); i++) { if (minds) for (const a of [...w.actors]) if (a.owner) updateAI(a, w, 1 / 60); w.update(1 / 60); } }
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
  check('Summoner, Juggernaut and Pyromancer have complete starting trees', CLASSES.filter(c => ['summoner', 'juggernaut', 'pyromancer'].includes(c.id)).every(c => c.bar.filter(Boolean).every(id => !!PACT_STEEL_STARTER_TREES[id!])));
  for (const [id, tree] of Object.entries(PACT_STEEL_STARTER_TREES)) {
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
      if (id === 'reckoning') s.p.gainCharge('fury', 3, 5);
      const used = cast(s.w, s.inst, a.pos); step(s.w, id === 'pillar_of_flame' ? 3 : 1.2);
      const worked = id === 'bind_familiar' ? s.w.actors.some(a => a.owner === s.p && !a.dead && a.defId === 'arcane_familiar')
        : id === 'stone_skin' ? s.p.buffs.has('stone_skin') : a.life < a.maxLife();
      check(id + '/' + leaf.id + ': actual cast performs its damage/summon/protection role', used && worked && s.inst.treeNodes?.length === 3);
      const saved = rebuildSkill(serializeCharacter(s.w).knownSkills.find(k => k.skillId === id)!)!;
      check(id + '/' + leaf.id + ': save rebuild preserves picks and resolved behavior', saved.treeNodes?.join() === s.inst.treeNodes?.join() && canonical(instanceEffects(saved)) === canonical(instanceEffects(s.inst)) && canonical(instanceDelivery(saved)) === canonical(instanceDelivery(s.inst)) && canonical(instanceChannel(saved)) === canonical(instanceChannel(s.inst)));
      const other = setup(id); applySeatMeta(other.w, other.w.localSeat, serializeSeatMeta(s.w.localSeat));
      const wired = other.w.meta.knownSkills.get(id)!;
      check(id + '/' + leaf.id + ': network rebuild restores modifiers, grafts and effects', canonical(instanceMods(wired)) === canonical(instanceMods(s.inst)) && canonical(instanceEffects(wired)) === canonical(instanceEffects(s.inst)));
      check(id + '/' + leaf.id + ': save and network rebuild preserve spender contracts', canonical(instanceChargeCost(saved)) === canonical(instanceChargeCost(s.inst)) && canonical(instanceChargeCost(wired)) === canonical(instanceChargeCost(s.inst)));
    }
  }
  check('all 72 terminal routes exercised', routes === 72);

  {
    const { w, p, inst } = setup('ruin', ['pact_signal', 'clear_signal', 'hungry_signal']);
    const minion = body(w, 20, 'player', true), ally = body(w, 25, 'player'), enemy = body(w, 40);
    cast(w, inst, enemy.pos);
    check('Pact Signal blesses owned minions without blessing caster, allies or enemies', minion.buffs.has('pact_signal') && !p.buffs.has('pact_signal') && !ally.buffs.has('pact_signal') && !enemy.buffs.has('pact_signal'));
    minion.life /= 2; const before = minion.life;
    w.executeSkill(minion, hit(), enemy.pos);
    check('prepared spell hit leeches to the minion and consumes its own preparation', minion.life > before && !minion.buffs.has('pact_signal'));
    cast(w, inst, enemy.pos); check('respec clears owned minion preparation', reset(w, inst) && !minion.buffs.has('pact_signal'));
  }
  for (const root of ['pact_keeper', 'rift_conductor']) {
    const { w, p, inst } = setup('bind_familiar', [root]);
    const crew = () => w.actors.filter(a => a.owner === p && !a.dead && a.defId === 'arcane_familiar');
    cast(w, inst); step(w, 0.2); const familiar = crew()[0], reserved = p.reservedMana;
    check(root + ': exactly one persistent familiar with correct art and reservation', crew().length === 1 && reserved === 24 && familiar.skills.some(s => s?.def.id === (root === 'pact_keeper' ? 'pact_mend' : 'pact_lance')) && (root !== 'rift_conductor' || !familiar.skills.some(s => s?.def.id === 'unmaking_bolt')));
    if (root === 'pact_keeper') {
      const downed = body(w, 15, 'player'), upper = body(w, 18, 'player'); downed.life = 1; downed.downed = true; upper.life = 1; upper.tier++;
      p.life /= 2; const before = p.life; step(w, 2, true);
      check('familiar AI mends its wounded owner while skipping downed and other-floor allies', p.life > before && downed.life === 1 && upper.life === 1);
    } else {
      const a = body(w, 100), b = body(w, 180); familiar.pos = { ...p.pos };
      w.executeSkill(familiar, familiar.skills.find(s => s?.def.id === 'pact_lance')!, b.pos); step(w, 0.7);
      check('Rift Lance actually pierces two enemies', a.life < a.maxLife() && b.life < b.maxLife());
    }
    w.kill(familiar, false); step(w, 5.5);
    check(root + ': automatic replacement preserves single cap, invested kit and reservation', crew().length === 1 && crew()[0] !== familiar && crew()[0].skills.some(s => s?.def.id === (root === 'pact_keeper' ? 'pact_mend' : 'pact_lance')) && p.reservedMana === reserved);
    w.pickTreeNode(inst.def.id, root === 'pact_keeper' ? 'gentle_pact' : 'quick_conductor'); step(w, 5.5);
    check(root + ': spending a point rebuilds the active familiar without dropping its contract', crew().length === 1 && p.reservedMana === reserved && p.summonToggles.has(inst.def.id));
    check(root + ': respec retires familiar and releases reservation', reset(w, inst) && crew().length === 0 && p.reservedMana === 0);
    cast(w, inst); step(w, 0.1); cast(w, inst);
    check(root + ': base toggle still dismisses familiar after respec', crew().length === 0 && p.reservedMana === 0);
  }
  {
    const { w, p, inst } = setup('piledriver', ['twin_foundations', 'deep_foundations']); const target = body(w);
    p.sheet.setSource('dry', [mod('manaRegen', 'override', 0)]); const mana = p.mana;
    let casts = 0; setSimTap({ onCast: (_a, i) => { if (i === inst) casts++; } });
    cast(w, inst, target.pos); step(w, 0.35); setSimTap(null);
    check('Twin Foundations banks four Fury from two real blows for one payment', p.charges.get('fury') === 4 && casts === 2 && near(mana - p.mana, p.skillCost(inst).mana));
    cast(w, inst, target.pos); step(w, 0.35); check('invested Piledriver cap holds seven Fury', p.charges.get('fury') === 7);
    const pull = setup('piledriver', ['anchor_pile', 'long_anchor', 'buried_anchor']); const enemy = body(pull.w, 60), start = enemy.pos.x;
    cast(pull.w, pull.inst, enemy.pos); step(pull.w, 0.3); check('Anchor Pile actually draws enemies toward the caster', enemy.pos.x < start);
  }
  {
    const { w, p, inst } = setup('reckoning', ['measured_sentence']); const enemy = body(w);
    const mana = p.mana; check('Measured Sentence refuses an empty Fury bank without charging mana', !cast(w, inst, enemy.pos) && p.mana === mana);
    p.gainCharge('fury', 4, 5); cast(w, inst, enemy.pos);
    check('Measured Sentence spends exactly one Fury and lands its hit', p.charges.get('fury') === 3 && enemy.life < enemy.maxLife());
    inst.sockets[0] = { def: SUPPORTS.ravening, level: 1 };
    check('socket spender retains precedence over tree spender', instanceChargeCost(inst) === SUPPORTS.ravening.chargeCost);
    inst.sockets[0] = null;
    check('respec restores original all-Fury optional contract', reset(w, inst) && instanceChargeCost(inst) === SKILLS.reckoning.chargeCost);
    for (const count of [0, 1, 5]) {
      const s = setup('reckoning', ['fury_cascade']); const foe = body(s.w); s.p.gainCharge('fury', count, 5);
      s.p.sheet.setSource('dry', [mod('manaRegen', 'override', 0)]); const mana = s.p.mana;
      let casts = 0, owner = true; setSimTap({ onCast: (a, i) => { if (i === s.inst) { casts++; owner &&= a === s.p; } } });
      cast(s.w, s.inst, foe.pos); step(s.w, 1.5); setSimTap(null);
      check(`Fury Cascade at ${count} charges: ${count + 1} owned blows, one payment, empty bank`, casts === count + 1 && owner && (s.p.charges.get('fury') ?? 0) === 0 && near(mana - s.p.mana, s.p.skillCost(s.inst).mana));
    }
    const s = setup('reckoning', ['fury_cascade']); const foe = body(s.w); s.p.gainCharge('fury', 5, 5); cast(s.w, s.inst, foe.pos);
    reset(s.w, s.inst); const life = foe.life; step(s.w, 2); check('respec cancels all remaining Fury repeats', foe.life === life);
  }
  {
    const { w, p, inst } = setup('stone_skin', ['stone_legion', 'legion_border', 'legion_breath']);
    const ally = body(w, 195, 'player'), far = body(w, 320, 'player'), enemy = body(w, 30), down = body(w, 30, 'player'), upper = body(w, 35, 'player'); down.downed = true; upper.tier++;
    cast(w, inst); check('Stone Legion grants the invested radius only to eligible allies', p.buffs.has('stone_skin') && ally.buffs.has('stone_skin') && !far.buffs.has('stone_skin') && !enemy.buffs.has('stone_skin') && !down.buffs.has('stone_skin') && !upper.buffs.has('stone_skin'));
    ally.pos.x += 400; step(w, 0.5); check('Stone Legion blessing persists after leaving its cast radius', ally.buffs.has('stone_skin'));
    check('respec removes shared Stone Skin blessings', reset(w, inst) && !ally.buffs.has('stone_skin') && !p.buffs.has('stone_skin'));
    const spikes = setup('stone_skin', ['bristling_cuirass', 'jagged_cuirass', 'biting_cuirass']); cast(spikes.w, spikes.inst);
    const before = spikes.p.sheet.get('thorns'); check('Bristling Cuirass grants actual thorns and attack conversion', before === 30 && spikes.p.sheet.get('thornsToHit', new Set(['attack'])) === 0.75 && spikes.p.sheet.get('thornsToHit', new Set(['spell'])) === 0);
    reset(spikes.w, spikes.inst); check('respec clears thorns investment', spikes.p.sheet.get('thorns') === 0);
  }
  {
    const { w, p, inst } = setup('ignite', ['powderheart']); const victim = body(w, 40), nearVictim = body(w, 180), farVictim = body(w, 350);
    p.sheet.setSource('area', [mod('aoeRadius', 'more', 1)]); cast(w, inst, victim.pos);
    const status = victim.statuses.find(s => s.id === 'burn')!; const bank = status.rupture!, deadline = status.remaining;
    const initial = victim.life; step(w, 0.4);
    check('Powderheart banks damage without any burn ticks', bank > 0 && status.dps === 0 && victim.life === initial);
    const remaining = status.remaining; cast(w, inst, victim.pos);
    check('reapplying Powderheart grows its bank without resetting the fuse', status.rupture! > bank && near(status.remaining, remaining) && status.remaining < deadline);
    check('detonation snapshots source area investment', near(status.ruptureRadius!, 180));
    p.sheet.removeSource('area'); step(w, deadline + 0.3);
    check('expiry detonates against enemies inside snapshotted radius only', nearVictim.life < nearVictim.maxLife() && farVictim.life === farVictim.maxLife());
    const slow = setup('ignite', ['slow_pyre', 'deep_pyre', 'feeding_pyre']); const foe = body(slow.w); slow.p.life /= 2; const before = slow.p.life;
    cast(slow.w, slow.inst, foe.pos); const afterHit = foe.life; step(slow.w, 0.6);
    check('Slow Pyre burns over time and leeches life to its caster', foe.life < afterHit && slow.p.life > before && !foe.statuses.find(s => s.id === 'burn')?.rupture);
    check('Powderheart admits area support; Slow Pyre retains duration without false area delivery', supportFitsInst(SUPPORTS.widening, inst) && !supportFitsInst(SUPPORTS.widening, slow.inst));
    const manual = body(w, 500); manual.applyStatus('burn', 1, 1, p.name);
    check('ordinary status refresh does not invent rupture geometry', (manual.applyStatus('burn', 1, 1, p.name, {}), manual.statuses[0].ruptureRadius === undefined));
    manual.applyStatus('burn', 0, 1, p.name, { rupture: 20, ruptureType: 'fire', ruptureRadius: 45 });
    check('adding a reduced-area rupture to an ordinary burn preserves reduced radius', manual.statuses[0].ruptureRadius === 45);
  }
  {
    const { w, p, inst } = setup('essence_drain', ['borrowed_time', 'heavy_debt', 'sustaining_debt']); const victim = body(w, 40), nearby = body(w, 105); p.life /= 2;
    cast(w, inst, victim.pos); step(w, 0.4); const s = victim.statuses.find(s => s.id === 'decay')!, before = p.life;
    check('Borrowed Time keeps both ticking decay and its expiry bank', s.dps > 0 && s.rupture! > 0);
    step(w, s.remaining + 0.2); check('Borrowed Time sustains the caster and ruptures into nearby enemies', p.life > before && nearby.life < nearby.maxLife());
  }
  {
    const { w, p, inst } = setup('pillar_of_flame', ['walking_kiln']); cast(w, inst, { x: p.pos.x + 250, y: p.pos.y }); step(w, 0.45);
    const zone = w.zones.find(z => z.inst === inst)!; const start = zone.pos.x; p.pos.x += 50; step(w, 0.05);
    check('Walking Kiln tracks caster center and keeps source attribution', zone.follow === true && zone.pos.x === p.pos.x && zone.pos.x !== start && zone.caster === p);
    check('Walking Kiln keeps native hollow fill and tick cadence', zone.tickInterval === 0.35 && instanceDelivery(inst).type === 'ground' && SKILLS.pillar_of_flame.delivery.type === 'ground' && canonical({ ...instanceDelivery(inst), follow: undefined }) === canonical(SKILLS.pillar_of_flame.delivery));
    check('respec removes moving kiln field', reset(w, inst) && !w.zones.some(z => z.inst === inst));
    const multi = setup('pillar_of_flame', ['triune_pyres']); cast(multi.w, multi.inst); step(multi.w, 0.05);
    check('Triune Pyres creates three independently placed owned rings', multi.w.zones.filter(z => z.inst === multi.inst && z.caster === multi.p).length === 3 && new Set(multi.w.zones.filter(z => z.inst === multi.inst).map(z => z.pos.x)).size === 3);
  }
  {
    const { w, p, inst } = setup('flame_arrow', ['kiln_arrow']);
    const source = makeSkillInstance(SKILLS.pillar_of_flame, 20, 1); p.skills[1] = source; w.meta.knownSkills.set(source.def.id, source);
    w.pickTreeNode(source.def.id, 'pillar_studies');
    w.executeSkill(p, source, { x: p.pos.x + 160, y: p.pos.y }); step(w, 0.5);
    w.executeSkill(p, inst, { x: p.pos.x + 400, y: p.pos.y }); step(w, 0.16);
    check('Kiln Arrow actually conducts a crossed allied fire field and captures its source', w.projectiles.some(b => b.inst === inst && b.conductElem === 'fire' && b.suffuse?.inst === source));
    step(w, 0.75);
    check('carried fire blooms at arrow end with caster credit and source identity', w.zones.some(z => z.inst === source && z.caster === p && z.depth === 1 && z.pos.x > p.pos.x + 300 && z.radius < 135));
    reset(w, source); check('respec of carried field source removes its echoed ground', !w.zones.some(z => z.inst === source));
    w.pickTreeNode(source.def.id, 'pillar_studies');
    w.executeSkill(p, source, { x: p.pos.x + 160, y: p.pos.y }); step(w, 0.5);
    w.executeSkill(p, inst, { x: p.pos.x + 400, y: p.pos.y }); step(w, 0.16);
    check('second arrow carries invested ground before respec', w.projectiles.some(b => b.inst === inst && b.suffuse?.inst === source));
    reset(w, source); step(w, 1);
    check('respec prevents an in-flight arrow from replanting retired ground', !w.zones.some(z => z.inst === source));
  }
} finally { setSimTap(null); restore(); }
console.log(`Pact and steel starter trees: ${passed} passed, ${failed} failures; ${routes} terminal routes`);
if (failed) process.exitCode = 1;
