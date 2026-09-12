import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { CLASSES } from '../src/data/classes';
import { CONTROL_STARTER_TREES } from '../src/data/controlStarterTrees';
import { makeSkillInstance, instanceDelivery, instanceChannel, instanceBaseTags, instanceEffects, instanceChargeCost, instanceCastCycle, instanceMods, skillContextTags, treeNodeRefusal, supportFitsInst, type SkillInstance } from '../src/engine/skills';
import { mod, STAT_DEFS } from '../src/engine/stats';
import { serializeCharacter, rebuildSkill } from '../src/meta/character';
import { serializeSeatMeta, applySeatMeta } from '../src/net/snapshot';
import { setSimTap } from '../src/engine/tap';
import { CLASS_BUNDLES, settleClassUnlocks, reconcileClassBundleGems } from '../src/meta/unlocks';
import { makeAccount, isSupportUnlockedForDrop } from '../src/meta/account';
import type { World } from '../src/engine/world';
let failed = 0, passed = 0, routes = 0;
const check = (name: string, ok: boolean) => { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (ok) passed++; else failed++; };
const near = (a: number, b: number) => Math.abs(a - b) < 0.00001;
const canonical = (x: unknown): string => JSON.stringify(x, (_k, v) => Array.isArray(v) ? [...v].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) : v);
function setup(id: string, nodes: string[] = []) {
  const klass = CLASSES.find(c => ['trapper', 'skald', 'chronomancer'].includes(c.id) && c.bar.includes(id))!;
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
  check('Trapper, Skald and Chronomancer have complete starting trees', CLASSES.filter(c => ['trapper', 'skald', 'chronomancer'].includes(c.id)).every(c => c.bar.filter(Boolean).every(id => !!CONTROL_STARTER_TREES[id!])));
  for (const [id, tree] of Object.entries(CONTROL_STARTER_TREES)) {
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
      const a = body(s.w, id === 'ballista_sentry' ? 230 : 60);
      if (id === 'coda') s.p.gainCharge('verse', 3, 5);
      if (id === 'time_dilation') { s.p.cooldowns.set('firebolt', 10); }
      const used = cast(s.w, s.inst, id === 'aftershock_snare' ? s.p.pos : a.pos);
      step(s.w, 2);
      const worked = id === 'war_chant' ? s.p.sheet.get('damage') > 1
        : id === 'torpor_field' ? s.w.actors.some(b => !b.dead && b.owner === s.p && b.construct?.kind === 'dome')
        : id === 'time_dilation' ? (s.p.cooldowns.get('firebolt') ?? 0) < 8
        : a.life < a.maxLife();
      check(id + '/' + leaf.id + ': real cast performs its damage, field or rewind role', used && worked && s.inst.treeNodes?.length === 3);
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
    const s = setup('caltrops', ['rolling_spikes']); const foe = body(s.w, 60); cast(s.w, s.inst, foe.pos); step(s.w, 0.2);
    const zone = s.w.zones.find(z => z.inst === s.inst)!; s.p.pos.x += 150; step(s.w, 0.1);
    check('Rolling Spikes follows the caster while retaining its original cut effects', !!zone && near(zone.pos.x, s.p.pos.x) && instanceEffects(s.inst) === SKILLS.caltrops.effects);
    check('respec retires following spikes', reset(s.w, s.inst) && !s.w.zones.some(z => z.inst === s.inst));
    const snag = setup('caltrops', ['snagging_spikes']), victim = body(snag.w, 60), ally = body(snag.w, 65, 'player');
    victim.sheet.removeSource('rig'); ally.sheet.removeSource('rig');
    const speed = victim.sheet.get('moveSpeed'), allySpeed = ally.sheet.get('moveSpeed');
    cast(snag.w, snag.inst, victim.pos); step(snag.w, 0.1);
    check('Snagging Spikes slows enemies without slowing allies', victim.sheet.get('moveSpeed') < speed && near(ally.sheet.get('moveSpeed'), allySpeed));
    victim.pos.x += 500; step(snag.w, 0.1); check('leaving the spikes removes their movement penalty', near(victim.sheet.get('moveSpeed'), speed));
  }
  {
    const s = setup('war_chant', ['sheltering_hymn', 'mending_hymn', 'armored_hymn']);
    const friend = body(s.w, 20, 'player'), hostile = body(s.w, 25), high = body(s.w, 25, 'player'), downed = body(s.w, 25, 'player');
    high.tier = (s.p.tier + 1) as typeof high.tier; downed.downed = true;
    friend.sheet.removeSource('rig'); friend.life = friend.maxLife() / 2; const life = friend.life, hostileTaken = hostile.sheet.get('damageTaken');
    cast(s.w, s.inst); step(s.w, 0.2);
    check('War Chant preserves its half-second listening requirement', near(friend.sheet.get('damageTaken'), 1));
    step(s.w, 0.6);
    check('Sheltering Hymn actually shields and heals a listening ally', friend.sheet.get('damageTaken') < 1 && friend.life > life);
    check('song preserves native offensive buff alongside additive branch modifiers', friend.sheet.get('damage') > 1 && friend.sheet.get('lifeRegen') >= 4);
    check('song excludes enemies, downed allies and other stories', near(hostile.sheet.get('damageTaken'), hostileTaken) && near(high.sheet.get('damageTaken'), 1) && near(downed.sheet.get('damageTaken'), 1));
    friend.pos.x += 600; step(s.w, 0.1); check('leaving the song strips its protection immediately', near(friend.sheet.get('damageTaken'), 1));
    friend.pos = { ...s.p.pos }; step(s.w, 0.7); reset(s.w, s.inst);
    check('song respec strips both its domain and the native field', near(friend.sheet.get('damageTaken'), 1) && !s.w.zones.some(z => z.inst === s.inst));
    const dirge = setup('dissonance', ['grinding_dirge', 'wide_dirge', 'dragging_dirge']); const foe = body(dirge.w, 40);
    foe.sheet.removeSource('rig'); const before = foe.sheet.get('damageTaken'); cast(dirge.w, dirge.inst); step(dirge.w, 0.1);
    check('Grinding Dirge creates a real enemy vulnerability field', foe.sheet.get('damageTaken') > before && dirge.p.sheet.get('damageTaken') === 1);
    const poison = setup('dissonance', ['withering_refrain']); const poisoned = body(poison.w, 40); cast(poison.w, poison.inst); step(poison.w, 1.3);
    check('Withering Refrain leaves damaging poison while banking its Verse', poisoned.statuses.some(x => x.id === 'poison' && x.dps > 0) && poison.p.charges.get('verse') === 1);
  }
  {
    const s = setup('coda', ['measured_coda']); const foe = body(s.w, 60); s.p.gainCharge('verse', 1, 5); const mana = s.p.mana;
    check('Measured Coda refuses insufficient Verse before mana payment', !cast(s.w, s.inst, foe.pos) && s.p.mana === mana && s.p.charges.get('verse') === 1);
    s.p.gainCharge('verse', 4, 5); cast(s.w, s.inst, foe.pos);
    check('Measured Coda spends two, preserves three and lands its nova', s.p.charges.get('verse') === 3 && foe.life < foe.maxLife());
    const chant = setup('war_chant', ['marching_anthem', 'carrying_anthem', 'banked_anthem']);
    for (let i = 0; i < 8; i++) cast(chant.w, chant.inst);
    check('invested singing banks Verse to its seven-charge cap', chant.p.charges.get('verse') === 7);
  }
  {
    const shotTravel = (nodes: string[], friendly = false) => {
      const s = setup('torpor_field', nodes); cast(s.w, s.inst, s.p.pos);
      const shooter = friendly ? s.p : body(s.w, -65); const missile = makeSkillInstance({ ...SKILLS.firebolt, effects: [], baseDamage: undefined });
      s.w.executeSkill(shooter, missile, { x: shooter.pos.x + 400, y: shooter.pos.y });
      const pr = s.w.projectiles.find(p => p.inst === missile)!; step(s.w, 1 / 60);
      const before = pr.pos.x; step(s.w, 1 / 60);
      return { ...s, distance: pr.pos.x - before };
    };
    const base = shotTravel([]), deep = shotTravel(['deep_stillness']), friend = shotTravel(['deep_stillness'], true);
    check('Deep Stillness slows an actual enemy missile three times more than native Torpor', base.distance > 0 && near(deep.distance / base.distance, 1 / 3));
    check('friendly missiles pass through Deep Stillness at full speed', friend.distance > deep.distance * 5);
    const s = setup('torpor_field', ['pocket_seconds', 'wide_pockets', 'extra_pocket']);
    for (let i = 0; i < 5; i++) cast(s.w, s.inst, { x: s.p.pos.x + 40 * i, y: s.p.pos.y });
    const domes = s.w.actors.filter(a => !a.dead && a.summonInst === s.inst);
    check('Pocket Seconds respects its invested four-dome cap, radius and destructibility', domes.length === 4 && domes.every(a => !a.invulnerable && near(a.construct!.domeRadius!, 117)));
    const other = makeSkillInstance(SKILLS.torpor_field, 20); s.w.executeSkill(s.p, other, s.p.pos); const foreign = s.w.actors.find(a => !a.dead && a.summonInst === other)!;
    const nearby = body(s.w, 30); const lifeBeforeReset = nearby.life;
    domes[0].construct!.deathBurst = { radius: 500, fraction: 5 };
    reset(s.w, s.inst); check('respec retires only devices belonging to the changed instance', domes.every(a => a.dead) && !foreign.dead);
    check('retiring devices cannot cash out their death bursts', nearby.life === lifeBeforeReset);
  }
  {
    for (const [root, seconds, fraction] of [['short_turn', 1, 0.1], ['deep_turn', 4, 0.4]] as const) {
      const s = setup('time_dilation', [root]); s.p.cooldowns.set('firebolt', 10); s.p.cooldowns.set('ice_shield', 3); s.p.cooldowns.set('time_dilation', 16);
      s.w.executeSkill(s.p, s.inst, s.p.pos, { noCooldown: true });
      check(root + ': rewinds actual other clocks by the complete branch contract', near(s.p.cooldowns.get('firebolt') ?? 0, Math.max(0, 10 - seconds - 10 * fraction)) && near(s.p.cooldowns.get('ice_shield') ?? 0, Math.max(0, 3 - seconds - 3 * fraction)));
      check(root + ': cannot rewind itself or create absent cooldowns', s.p.cooldowns.get('time_dilation') === 16 && !s.p.cooldowns.has('rend'));
      reset(s.w, s.inst); check(root + ': respec restores the original rewind effects', instanceEffects(s.inst) === SKILLS.time_dilation.effects);
    }
    const s = setup('time_dilation', ['deep_turn', 'borrowed_momentum', 'forceful_momentum']); cast(s.w, s.inst);
    check('rewind grants its temporary offensive window', s.p.buffs.has('borrowed_momentum') && s.p.sheet.get('damage') > 1);
    reset(s.w, s.inst); check('rewind respec removes its temporary offensive window', !s.p.buffs.has('borrowed_momentum'));
  }
  {
    const s = setup('stasis_lock', ['certain_stasis']); const foe = body(s.w, 140); cast(s.w, s.inst, foe.pos); step(s.w, 0.5);
    check('Certain Stasis lands both time statuses', foe.statuses.some(x => x.id === 'stasis') && foe.statuses.some(x => x.id === 'temporal_drag'));
    const fan = setup('stasis_lock', ['fractured_seconds']); fan.w.executeSkill(fan.p, fan.inst, { x: fan.p.pos.x + 400, y: fan.p.pos.y });
    check('Fractured Seconds launches three piercing needles', fan.w.projectiles.filter(p => p.inst === fan.inst).length === 3);
  }
  {
    const support = SUPPORTS.overwound_mechanism;
    check('Overwound Mechanism belongs to the earned Trapper gem pool', !!CLASS_BUNDLES.find(b => b.classId === 'trapper')?.supportIds?.includes(support.id));
    const account = makeAccount(); account.unlockedClasses.add('trapper');
    reconcileClassBundleGems(account);
    const unlocked = settleClassUnlocks(account);
    check('existing Trappers gain the new droppable support without a duplicate class notice', isSupportUnlockedForDrop(account, support.id) && !unlocked.some(u => u.kind === 'class' && u.payload.classId === 'trapper'));
    check('Overwound Mechanism admits aimed devices and rejects single-use or passive constructs', ['ballista_sentry', 'flame_totem'].every(id => SKILLS[id] && supportFitsInst(support, makeSkillInstance(SKILLS[id]))) && ['aftershock_snare', 'torpor_field', 'fire_mine', 'war_chant', 'shadow_clone'].every(id => !supportFitsInst(support, makeSkillInstance(SKILLS[id]))));
    const run = (supported: boolean) => {
      const s = setup('ballista_sentry', ['siege_anchor']); if (supported) s.inst.sockets[0] = { def: support, level: 1 };
      const foe = body(s.w, 270); let casts = 0;
      setSimTap({ onCast: (a, i) => { if (a.owner === s.p && i.def.id === 'piercing_arrow') casts++; } });
      cast(s.w, s.inst, foe.pos); const turret = s.w.actors.find(a => a.summonInst === s.inst)!; const lifespan = turret.lifespan;
      step(s.w, 4); setSimTap(null); return { ...s, casts, turret, lifespan, damage: foe.maxLife() - foe.life };
    };
    const base = run(false), fast = run(true);
    check('Overwound Mechanism shortens actual device lifetime by 25%', Math.abs(fast.lifespan - base.lifespan * 0.75) < 1 / 60);
    check('Overwound Mechanism produces more actual autonomous attacks and damage', fast.casts > base.casts && fast.damage > base.damage);
    check('tree impale investment reaches the autonomous arrow payload', base.damage > 0 && base.turret.sheet.get('impalePower') >= 0.3);
    reset(fast.w, fast.inst);
    check('respec retires invested sentry and its outstanding missiles', fast.turret.dead && !fast.w.projectiles.some(p => p.caster === fast.turret));
    const splinter = setup('aftershock_snare', ['splinter_snare']); const foe = body(splinter.w, 90); cast(splinter.w, splinter.inst, splinter.p.pos);
    const trap = splinter.w.actors.find(a => a.summonInst === splinter.inst)!; step(splinter.w, 0.65);
    check('Splinter Snare fires its replacement payload on proximity', trap.construct?.castInst?.def.id === 'fan_of_blades' && trap.dead && (foe.life < foe.maxLife() || splinter.w.projectiles.some(p => p.caster === trap)));
    reset(splinter.w, splinter.inst); check('respec also clears the flying payload of an already spent trap', !splinter.w.projectiles.some(p => p.caster === trap));
  }
} finally { setSimTap(null); restore(); }
console.log(`Control starter trees: ${passed} passed, ${failed} failures; ${routes} terminal routes`);
if (failed) process.exitCode = 1;
