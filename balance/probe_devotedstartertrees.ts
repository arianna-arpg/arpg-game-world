import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { CLASSES } from '../src/data/classes';
import { DEVOTED_STARTER_TREES } from '../src/data/devotedStarterTrees';
import { makeSkillInstance, instanceDelivery, instanceChannel, instanceBaseTags, instanceEffects, instanceConduits, instanceMods, skillContextTags, treeNodeRefusal, supportFitsInst, type SkillInstance } from '../src/engine/skills';
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
  const klass = CLASSES.find(c => ['berserker', 'sorcerer', 'cleric'].includes(c.id) && c.bar.includes(id))!;
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
  check('Berserker, Sorcerer and Cleric have complete starting trees', CLASSES.filter(c => ['berserker', 'sorcerer', 'cleric'].includes(c.id)).every(c => c.bar.filter(Boolean).every(id => !!DEVOTED_STARTER_TREES[id!])));
  for (const [id, tree] of Object.entries(DEVOTED_STARTER_TREES)) {
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
      check(id + '/' + root.id + ': allocation order does not change composed effects or modifiers', canonical(instanceMods(a.inst)) === canonical(instanceMods(b.inst)) && canonical(instanceEffects(a.inst)) === canonical(instanceEffects(b.inst)) && canonical(instanceChannel(a.inst)) === canonical(instanceChannel(b.inst)));
      const rival = nodes.find(n => n.id === root.excludes![0])!, locked = setup(id, [root.id]);
      check(id + '/' + root.id + ': rival descendants refuse with points still available', nodes.filter(n => n.links?.includes(rival.id)).every(n => !!treeNodeRefusal(locked.inst, n.id)));
      for (const mid of mids) {
        const leaves = nodes.filter(n => n.links?.includes(mid.id));
        const forward = setup(id, [root.id, mid.id, leaves[0].id, leaves[1].id]), reverse = setup(id, [root.id, mid.id, leaves[1].id, leaves[0].id]);
        check(id + '/' + mid.id + ': sibling leaves both allocate and commute', forward.inst.treeNodes?.length === 4 && reverse.inst.treeNodes?.length === 4 && canonical(instanceMods(forward.inst)) === canonical(instanceMods(reverse.inst)) && canonical(instanceEffects(forward.inst)) === canonical(instanceEffects(reverse.inst)) && canonical(instanceConduits(forward.inst)) === canonical(instanceConduits(reverse.inst)));
      }
    }
    for (const leaf of nodes.filter(n => n.links?.length && !nodes.some(o => o.links?.includes(n.id)))) {
      routes++;
      const mid = nodes.find(n => n.id === leaf.links![0])!, s = setup(id, [mid.links![0], mid.id, leaf.id]);
      const sweepingHeal = id === 'sanctified_strike' && mid.links![0] === 'pilgrim_arc';
      const a = body(s.w, sweepingHeal ? 160 : 40), ally = body(s.w, sweepingHeal ? 160 : 30, 'player'); ally.life /= 2; const allyBefore = ally.life;
      if (leaf.id === 'circling_flame') { a.pos.x = s.p.pos.x + 80; a.pos.y = s.p.pos.y + 50; }
      const used = cast(s.w, s.inst, id === 'mend' ? ally.pos : a.pos); step(s.w, leaf.id === 'circling_flame' ? 4 : 1.2);
      const worked = id === 'dash' ? s.p.buffs.size > 0 && s.p.pos.x !== ally.pos.x - 30
        : id === 'ice_shield' ? s.p.casting?.mode === 'guard' && (s.p.casting.shield ?? 0) > 0
        : id === 'mend' ? ally.life > allyBefore
        : ['sanctified_strike', 'consecration'].includes(id) ? ally.life > allyBefore && a.life < a.maxLife()
        : a.life < a.maxLife();
      check(id + '/' + leaf.id + ': actual cast performs its damage/heal/movement/guard role', used && worked && s.inst.treeNodes?.length === 3);
      const saved = rebuildSkill(serializeCharacter(s.w).knownSkills.find(k => k.skillId === id)!)!;
      check(id + '/' + leaf.id + ': save rebuild preserves picks and resolved behavior', saved.treeNodes?.join() === s.inst.treeNodes?.join() && canonical(instanceEffects(saved)) === canonical(instanceEffects(s.inst)) && canonical(instanceDelivery(saved)) === canonical(instanceDelivery(s.inst)) && canonical(instanceChannel(saved)) === canonical(instanceChannel(s.inst)));
      const other = setup(id); applySeatMeta(other.w, other.w.localSeat, serializeSeatMeta(s.w.localSeat));
      const wired = other.w.meta.knownSkills.get(id)!;
      check(id + '/' + leaf.id + ': network rebuild restores modifiers, grafts and effects', canonical(instanceMods(wired)) === canonical(instanceMods(s.inst)) && canonical(instanceEffects(wired)) === canonical(instanceEffects(s.inst)));
      if (id === 'ice_shield') check(id + '/' + leaf.id + ': save and network rebuild preserve resource pumps', canonical(instanceConduits(saved)) === canonical(instanceConduits(s.inst)) && canonical(instanceConduits(wired)) === canonical(instanceConduits(s.inst)));
    }
  }
  check('all 72 terminal routes exercised', routes === 72);

  // Reproduce the shared chain-exclusion defect with an actual mixed arc.
  {
    const { w, p, inst } = setup('sanctified_strike', ['communion_strike', 'open_communion', 'gathered_communion']);
    const ally = body(w, 35, 'player'), remote = body(w, 175, 'player'), enemy = body(w, 150), downed = body(w, 90, 'player'), upper = body(w, 110, 'player');
    ally.life *= 0.5; remote.life *= 0.6; enemy.life *= 0.1; downed.life = 1; downed.downed = true; upper.life = 1; upper.tier = p.tier + 1;
    p.life = 1; const before = p.life, outside = remote.life, enemyBefore = enemy.life;
    w.executeSkill(p, inst, ally.pos);
    check('chained Sanctified Strike never mends its excluded caster', p.life === before);
    check('healing chains skip downed allies and other stories to reach eligible wounded allies', downed.life === 1 && upper.life === 1 && remote.life > outside);
    check('healing chains never mend enemies', enemy.life === enemyBefore);
  }
  {
    const { w, p, inst } = setup('sanctified_strike', ['pilgrim_arc', 'pilgrim_reach', 'distant_mercy']);
    const ally = body(w, 160, 'player'), enemy = body(w, 160); ally.life /= 2; p.life /= 2;
    let heals = 0; const life = p.life;
    setSimTap({ onHeal: a => { if (a === ally) heals++; } }); cast(w, inst, enemy.pos); step(w, 2); setSimTap(null);
    check('traveling sanctified arc heals a distant ally once and hits an enemy', heals === 1 && enemy.life < enemy.maxLife() && p.life === life);
  }
  {
    const { w, p, inst } = setup('mend', ['passing_grace', 'widened_fellowship', 'deep_grace']);
    const allies = [body(w, 30, 'player'), body(w, 180, 'player'), body(w, 330, 'player'), body(w, 480, 'player')];
    allies.forEach(a => a.life /= 2); const lives = allies.map(a => a.life);
    cast(w, inst, allies[0].pos);
    const gains = allies.map((a, i) => a.life - lives[i]);
    check('Mend chain heals four actual recipients with 75% falloff', gains.every(g => g > 0) && gains.slice(1).every((g, i) => near(g / gains[i], 0.75)));
    check('healing arcs retain caster and skill attribution', w.tethers.filter(t => t.skillId === inst.def.id).length === 3 && w.tethers.every(t => t.owner === p));
  }
  {
    const { w, p, inst } = setup('mend', ['banked_mercy', 'deep_mercy', 'brimming_mercy']); const ally = body(w, 30, 'player');
    ally.sheet.setSource('foreign', [mod('healPower', 'flat', 100), mod('absorbPower', 'flat', 100)]);
    cast(w, inst, ally.pos); const shield = ally.absorb;
    const fx = SKILLS.mend.effects.find(f => f.type === 'heal')!;
    const expected = Math.min(ally.maxLife() * 0.5, (fx.amount! + fx.pctMax! * ally.maxLife()) * p.sheet.get('healPower', skillContextTags(inst), instanceMods(inst)) * 1.1);
    check('overhealing uses caster healing investment, independent of recipient heal/absorb power', shield > 0 && near(shield, expected));
    cast(w, inst, ally.pos); check('overheal shield refreshes without adding pools', near(ally.absorb, shield));
    ally.absorb = 0; ally.life *= 0.1; cast(w, inst, ally.pos);
    check('a wound that consumes the whole mend earns no overheal ward', ally.absorb === 0);
  }
  {
    const { w, p, inst } = setup('consecration', ['sanctuary_floor', 'sanctuary_border', 'long_sanctuary']);
    const ally = body(w, 30, 'player'), enemy = body(w, 30); p.life /= 2; const life = p.life;
    cast(w, inst, ally.pos); step(w, 1.2);
    check('sanctuary ground mends caster, banks ally overhealing, harms enemy', p.life > life && ally.absorb > 0 && enemy.absorb === 0 && enemy.life < enemy.maxLife());
    check('invested field keeps source, radius, duration and cadence', w.zones.some(z => z.inst === inst && z.caster === p && z.radius > 110 && z.linger > 5 && z.tickInterval === 0.5));
    check('respec clears old consecration fields', reset(w, inst) && !w.zones.some(z => z.inst === inst));
  }
  {
    const { w, p, inst } = setup('storm_call', ['thunder_sequence', 'third_thunder']); const enemy = body(w);
    let casts = 0, owned = true; setSimTap({ onCast: (a, i) => { if (i === inst) { casts++; owned &&= a === p; } } });
    const mana = p.mana; cast(w, inst, enemy.pos); const paid = mana - p.mana; step(w, 1.4); setSimTap(null);
    check('thunder sequence executes three attributable strikes for one payment', casts === 3 && owned && enemy.life < enemy.maxLife() && paid <= p.skillCost(inst).mana && mana - p.mana <= p.skillCost(inst).mana);
    const field = setup('storm_call', ['storm_residence', 'storm_border', 'long_residence']); body(field.w); cast(field.w, field.inst); step(field.w, 0.1);
    check('storm residence creates actual invested lightning ground', field.w.zones.some(z => z.inst === field.inst && z.linger > 4 && z.radius > 80));
    const pending = setup('storm_call', ['thunder_sequence', 'third_thunder']); const victim = body(pending.w); cast(pending.w, pending.inst, victim.pos);
    const before = victim.life; reset(pending.w, pending.inst); step(pending.w, 2);
    check('respec cancels pending repeats and delayed storm damage', victim.life === before);
    const shared = setup('storm_call', ['thunder_sequence']); const caster = body(shared.w, 30, 'player'), target = body(shared.w, 60);
    shared.w.executeSkill(caster, shared.inst, target.pos); reset(shared.w, shared.inst); step(shared.w, 1.2);
    check('respec preserves another caster scheduled work even when it shares the instance', target.life < target.maxLife());
  }
  {
    const rooted = setup('whirlwind', ['rooted_vortex', 'vortex_mouth', 'iron_gravity']); const a = body(rooted.w, 70);
    const start = a.pos.x; cast(rooted.w, rooted.inst); step(rooted.w, 0.6);
    check('vortex actually pulls hit enemies inward', a.pos.x < start && a.life < a.maxLife());
    step(rooted.w, 3.5); const at = rooted.p.pos.x; rooted.w.moveActor(rooted.p, 1, 0, 0.2);
    check('held vortex becomes rooted', near(at, rooted.p.pos.x));
    check('respec releases the rooted channel', reset(rooted.w, rooted.inst) && !rooted.p.casting);
    const mobile = setup('whirlwind', ['blood_dance']); cast(mobile.w, mobile.inst); const origin = mobile.p.pos.x; mobile.w.moveActor(mobile.p, 1, 0, 0.1);
    check('blood dance actually allows movement while pulsing', mobile.p.pos.x > origin && mobile.p.casting?.mode === 'channel');
  }
  {
    const siege = setup('infernal_ray', ['siege_furnace']), mobile = setup('infernal_ray', ['roaming_furnace']);
    for (const s of [siege, mobile]) { cast(s.w, s.inst); s.w.moveActor(s.p, 1, 0, 0.1); }
    check('siege remains immobile while roaming furnace walks', mobile.p.pos.x > siege.p.pos.x);
    const { w, p } = siege; const enemy = body(w, 90); let early = 0, late = 0;
    setSimTap({ onHit: (a, t, r) => { if (a === p && t === enemy) { if (w.time < 0.8) early = r.total; if (w.time > 4.8) late = r.total; } } }); step(w, 5.2); setSimTap(null);
    check('siege commitment increases actual later pulse damage', early > 0 && late > early * 2);
    check('channel pays repeatedly and stops when resources run out', p.mana < p.maxMana() && (() => { p.mana = 0; p.sheet.setSource('dry', [mod('manaRegen', 'override', 0)]); step(w, 0.8); return !p.casting; })());
  }
  {
    const { w, p, inst } = setup('ice_shield', ['glacial_reservoir', 'thick_glacier', 'efficient_ice']);
    p.sheet.setSource('pump-rig', [mod('manaRegen', 'override', 0)]);
    cast(w, inst); const cs = p.casting!; cs.shield! -= 60; const shield = cs.shield!, mana = p.mana;
    step(w, 0.4); check('glacial reservoir spends real mana to rebuild dented guard at invested efficiency', cs.shield! > shield && near((cs.shield! - shield) / (mana - p.mana), 2.7));
    const fullMana = p.mana; step(w, 0.3); check('full ice guard stops drawing mana', near(p.mana, fullMana));
    cs.shield = 1; p.mana = p.maxMana() * 0.25; step(w, 0.3);
    check('ice reservoir respects its mana floor', near(p.mana, p.maxMana() * 0.25) && cs.shield === 1);
    reset(w, inst); check('respec retires ice guard and conduit', !p.casting && instanceConduits(inst).length === 0);
    const mirror = setup('ice_shield', ['mirror_ice', 'patient_mirror', 'cruel_reflection']); const enemy = body(mirror.w);
    cast(mirror.w, mirror.inst); step(mirror.w, 0.35); const guard = mirror.p.casting!.shield, life = mirror.p.life, target = enemy.life;
    mirror.w.executeSkill(enemy, hit(), mirror.p.pos);
    check('extended mirror window parries a real hit and preserves guard', enemy.life < target && mirror.p.life === life && mirror.p.casting!.shield === guard);
    step(mirror.w, 0.2); mirror.w.executeSkill(enemy, hit(), mirror.p.pos);
    check('expired mirror window blocks by spending guard', mirror.p.casting!.shield! < guard!);
    const before = enemy.life; mirror.p.casting!.held = false; step(mirror.w, 0.05);
    check('releasing the mirror shell delivers its cold bash', !mirror.p.casting && enemy.life < before);
  }
  {
    const { w, p, inst } = setup('dash', ['headlong_entry', 'sighted_entry', 'feeding_entry']);
    cast(w, inst); step(w, 0.4); const enemy = body(w); p.life /= 2;
    cast(w, hit(), enemy.pos); check('Dash preparation survives non-melee spell hits', p.buffs.has('dash_entry'));
    const attack = makeSkillInstance({ ...SKILLS.heavy_strike, cooldown: 0, useTime: 0, effects: [{ type: 'damage' }] });
    const life = p.life; cast(w, attack, enemy.pos);
    check('Dash preparation empowers and is consumed by its melee hit, leeching life', !p.buffs.has('dash_entry') && p.life > life);
    const escape = setup('dash', ['breakaway', 'long_escape', 'slipping_escape']); cast(escape.w, escape.inst); step(escape.w, 0.4);
    escape.p.sheet.setSource('defender', [mod('evasion', 'override', 0), mod('blockChance', 'override', 0)]); escape.p.es = 0;
    const attacker = body(escape.w); const before = escape.p.life; escape.w.executeSkill(attacker, hit(), escape.p.pos); const first = before - escape.p.life;
    const secondBefore = escape.p.life; escape.w.executeSkill(attacker, hit(), escape.p.pos);
    check('breakaway protects its breaking hit then loses protection', first > 0 && !escape.p.buffs.has('dash_escape') && first < secondBefore - escape.p.life);
    cast(escape.w, escape.inst); step(escape.w, 0.4); check('respec removes Dash temporary modifiers', reset(escape.w, escape.inst) && !escape.p.buffs.has('dash_escape'));
    const expiry = setup('dash', ['headlong_entry']); cast(expiry.w, expiry.inst); step(expiry.w, 5);
    check('unused Dash preparation expires on its normal clock', !expiry.p.buffs.has('dash_entry'));
  }
  {
    const plain = setup('heavy_strike'), wave = setup('heavy_strike', ['fault_wave']);
    check('area support follows Heavy Strike transformed area behavior', !supportFitsInst(SUPPORTS.widening, plain.inst) && supportFitsInst(SUPPORTS.widening, wave.inst));
    check('traveling identity admits sweep supports and refuses redundant sweeping conversion', instanceBaseTags(wave.inst).includes('sweep') && !supportFitsInst(SUPPORTS.sweeping_blow, wave.inst));
    const dash = setup('dash', ['headlong_entry']); check('Dash advertises its actual temporary buff and duration', instanceBaseTags(dash.inst).includes('buff') && instanceBaseTags(dash.inst).includes('duration'));
  }
} finally { setSimTap(null); restore(); }
console.log(`Devoted starter trees: ${passed} passed, ${failed} failures; ${routes} terminal routes`);
if (failed) process.exitCode = 1;
