import { updateAI } from '../src/engine/ai';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { CLASSES } from '../src/data/classes';
import { BOND_STARTER_TREES } from '../src/data/bondStarterTrees';
import { makeSkillInstance, instanceDelivery, instanceChannel, instanceBaseTags, instanceEffects, instanceChargeCost, instanceCastCycle, instanceMods, skillContextTags, treeNodeRefusal, type SkillInstance } from '../src/engine/skills';
import { mod, STAT_DEFS } from '../src/engine/stats';
import { serializeCharacter, rebuildSkill } from '../src/meta/character';
import { serializeSeatMeta, applySeatMeta } from '../src/net/snapshot';
import type { Actor } from '../src/engine/actor';
import { SUPPORTS } from '../src/data/supports';
import { instanceTameMod, supportFitsInst } from '../src/engine/skills';
import type { World } from '../src/engine/world';
let failed = 0, passed = 0, routes = 0;
const check = (name: string, ok: boolean) => { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (ok) passed++; else failed++; };
const near = (a: number, b: number) => Math.abs(a - b) < 0.00001;
const canonical = (x: unknown): string => JSON.stringify(x, (_k, v) => Array.isArray(v) ? [...v].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) : v);
function setup(id: string, nodes: string[] = []) {
  const klass = CLASSES.find(c => ['tamer', 'beguiler', 'falconer'].includes(c.id) && c.bar.includes(id))!;
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
  for (let i = 0; i < 300 && p.casting; i++) { const cs = (p as Actor).casting!; cs.held = true; cs.aim = { ...aim }; step(w, 1 / 60); }
  return ok;
}
function body(w: World, x = 40, team: 'player' | 'enemy' = 'enemy', owner = false) {
  const a = w.createMonster('plains_wolf', 1, team, owner ? w.player : undefined); a.skills = []; a.pos = { x: w.player.pos.x + x, y: w.player.pos.y }; a.tier = w.player.tier;
  a.sheet.setSource('rig', [mod('life', 'flat', 10000), mod('moveSpeed', 'override', 0), mod('lifeRegen', 'override', 0), mod('evasion', 'override', 0), mod('blockChance', 'override', 0)]);
  a.fillResources(); w.actors.push(a); return a;
}
function reset(w: World, inst: SkillInstance) { w.fonts.push({ pos: { ...w.player.pos } }); w.meta.abilityEssences.ability4 = 999; return w.fontResetTree(inst.def.id); }
function nativeWorked(w: World, inst: SkillInstance, a: Actor): boolean {
  switch (inst.def.id) {
    case 'tame_beast': return a.companion && a.owner === w.player;
    case 'stalk': return w.player.buffs.has('stalk');
    case 'decoy': case 'cloudstep': return w.actors.some(b => !b.dead && b.owner === w.player && b.sourceSkillId === inst.def.id && b.taunt);
    case 'shadow_clone': return w.actors.some(b => !b.dead && b.owner === w.player && b.construct?.echo?.mode === 'mimic');
    case 'cast_falcon': return w.actors.some(b => !b.dead && b.owner === w.player && b.defId === 'hunting_falcon');
    case 'goad': return a.statuses.some(s => s.id === 'taunted');
    case 'beguile': return a.statuses.some(s => s.id === 'maddened');
    case 'expose_weakness': return a.statuses.some(s => s.id === 'exposed');
    default: return false;
  }
}
const restore = seedGlobalRandom(0xded1ca7e);
try {
  check('Bond classes have complete starting trees', CLASSES.filter(c => ['tamer', 'beguiler', 'falconer'].includes(c.id)).every(c => c.bar.filter(Boolean).every(id => !!BOND_STARTER_TREES[id!])));
  for (const [id, tree] of Object.entries(BOND_STARTER_TREES)) {
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
      const a = body(s.w, 40); a.life = a.maxLife() * 0.4; s.p.recentHurt = 0;
      const used = cast(s.w, s.inst, a.pos);
      step(s.w, 0.4);
      const worked = nativeWorked(s.w, s.inst, a);
      check(id + '/' + leaf.id + ': real cast performs its native role with the invested route', used && worked && s.inst.treeNodes?.length === 3);
      const saved = rebuildSkill(serializeCharacter(s.w).knownSkills.find(k => k.skillId === id)!)!;
      check(id + '/' + leaf.id + ': save rebuild preserves picks and resolved behavior', saved.treeNodes?.join() === s.inst.treeNodes?.join() && canonical(instanceEffects(saved)) === canonical(instanceEffects(s.inst)) && canonical(instanceDelivery(saved)) === canonical(instanceDelivery(s.inst)) && canonical(instanceChannel(saved)) === canonical(instanceChannel(s.inst)) && canonical(instanceCastCycle(saved)) === canonical(instanceCastCycle(s.inst)));
      const loaded = setup(id); loaded.w.meta.knownSkills.set(id, saved); loaded.p.skills[0] = saved; loaded.w.recalcPlayer();
      check(id + '/' + leaf.id + ': save recalc re-derives grafts and their live modifiers', canonical(instanceMods(saved)) === canonical(instanceMods(s.inst)) && canonical(instanceTameMod(saved)) === canonical(instanceTameMod(s.inst)));
      const other = setup(id); applySeatMeta(other.w, other.w.localSeat, serializeSeatMeta(s.w.localSeat));
      const wired = other.w.meta.knownSkills.get(id)!;
      check(id + '/' + leaf.id + ': network rebuild restores modifiers, grafts and effects', canonical(instanceMods(wired)) === canonical(instanceMods(s.inst)) && canonical(instanceEffects(wired)) === canonical(instanceEffects(s.inst)) && canonical(instanceCastCycle(wired)) === canonical(instanceCastCycle(s.inst)) && canonical(instanceDelivery(wired)) === canonical(instanceDelivery(s.inst)));
      check(id + '/' + leaf.id + ': save and network rebuild preserve spender contracts', canonical(instanceChargeCost(saved)) === canonical(instanceChargeCost(s.inst)) && canonical(instanceChargeCost(wired)) === canonical(instanceChargeCost(s.inst)));
    }
  }
  check('all 72 terminal routes exercised', routes === 72);
  for (const [id, tree] of Object.entries(BOND_STARTER_TREES)) {
    const neutral = tree.nodes!.find(n => n.ranks === 4)!;
    const run = (bare: boolean, picks: string[] = []) => {
      const reseed = seedGlobalRandom(0xbeef);
      try {
        const s = setup(id, picks), a = body(s.w); a.life *= 0.4;
        if (bare) s.inst.def = { ...s.inst.def, tree: undefined };
        const used = cast(s.w, s.inst, a.pos); step(s.w, 0.4);
        return { used, worked: nativeWorked(s.w, s.inst, a), fingerprint: canonical({
          mana: s.p.mana, reserve: s.p.reservedMana, position: s.p.pos, targetLife: a.life,
          companion: a.companion, statuses: a.statuses, buffs: [...s.p.buffs],
          bodies: s.w.actors.filter(b => b.owner === s.p).map(b => ({ id: b.defId, life: b.life, lifespan: b.lifespan, taunt: b.taunt, echo: b.construct?.echoPower })),
        }) };
      } finally { reseed(); }
    };
    check(id + ': real unallocated cast is byte-identical to tree-less cast', run(false).fingerprint === run(true).fingerprint);
    const invested = run(false, Array(4).fill(neutral.id));
    check(id + ': four neutral ranks still perform the native real cast', invested.used && invested.worked && !neutral.over && !neutral.buffs && !neutral.graft);
  }
  for (const [id, tree] of Object.entries(BOND_STARTER_TREES)) {
    for (const node of tree.nodes!) {
      if (node.graft) check(id + '/' + node.id + ': graft exists and is admitted', !!SUPPORTS[node.graft.support] && supportFitsInst(SUPPORTS[node.graft.support], makeSkillInstance(SKILLS[id])));
      const path = (n: typeof node): string[] => n.links?.length ? [...path(tree.nodes!.find(x => x.id === n.links![0])!), n.id] : [n.id];
      const picks = path(node), parent = setup(id, picks.slice(0, -1)), child = setup(id, picks);
      for (const m of node.mods ?? []) {
        if (m.stat === 'manaCost') check(id + '/' + node.id + ': actual quoted mana changes', parent.p.skillCost(parent.inst).mana !== child.p.skillCost(child.inst).mana);
        if (m.stat === 'castSpeed' || m.stat === 'attackSpeed') check(id + '/' + node.id + ': actual cast or concentration speed changes', parent.p.speedFactor(parent.inst) !== child.p.speedFactor(child.inst));
        if (m.stat === 'cooldownRecovery') {
          const a = body(parent.w), b = body(child.w); a.life *= 0.4; b.life *= 0.4;
          cast(parent.w, parent.inst, a.pos); cast(child.w, child.inst, b.pos);
          check(id + '/' + node.id + ': actual stamped cooldown changes', parent.p.cooldowns.get(id) !== child.p.cooldowns.get(id));
        }
      }
    }
  }
  const claim = (nodes: string[], fraction = 0.4, rare = false) => {
    const s = setup('tame_beast', nodes), a = body(s.w); a.life = a.maxLife() * fraction;
    if (rare) a.rarity = 'rare';
    const used = cast(s.w, s.inst, a.pos); return { ...s, a, used };
  };
  {
    const gentle = claim(['gentle_claim'], 0.5, true), plain = claim([], 0.4, true), swift = claim(['swift_claim']);
    check('Sovereign Bond completes a real rare-beast claim at 50% life', gentle.used && gentle.a.companion);
    check('native claim refuses rare beasts without changing their team', !plain.a.companion && plain.a.team === 'enemy');
    check('Growing Litter leaves Tame Beast available after its first claim', swift.a.companion && swift.w.companionCapOf(swift.inst) === 2 && swift.w.slotFaceOf(swift.p, swift.inst).id === 'tame_beast');
    check('Gentle Claim keeps its full-life chance and native bond capacity', near(instanceTameMod(gentle.inst).wildChanceAdd, 0) && gentle.w.companionCapOf(gentle.inst) === 1);
    check('bonded slot presents Whistle', gentle.w.slotFaceOf(gentle.p, gentle.inst).id === 'companion_whistle');
    gentle.w.kill(gentle.a); check('bonded beast is downed rather than killed', gentle.a.downed && !gentle.a.dead);
    cast(gentle.w, gentle.inst, gentle.a.pos);
    check('converted press really revives the bonded beast', !gentle.a.downed && gentle.a.life === gentle.a.maxLife());
    reset(gentle.w, gentle.inst);
    check('respec removes claim graft while preserving the existing native bond', !gentle.inst.grafts?.length && gentle.a.companion && !gentle.a.dead && gentle.w.slotFaceOf(gentle.p, gentle.inst).id === 'companion_whistle');
  }
  for (const root of ['gentle_claim']) {
    const nodes = root === 'gentle_claim' ? [root, 'gentle_pour', 'gentle_instinct', 'gentle_return'] : [root, 'swift_instinct', 'swift_pour', 'swift_return'];
    const s = claim(nodes); s.p.life *= 0.5; s.a.life *= 0.5;
    s.p.gainCharge('frenzy', 1, 3); step(s.w, 0.1);
    check(root + ': invested Pack Instinct transfers actual charges', s.a.charges.get('frenzy') === 1);
    const flask = makeSkillInstance(SKILLS.life_flask, 1); s.p.skills[1] = flask; s.p.gainCharge('flask_life', 1, 3);
    cast(s.w, flask); step(s.w, 0.1);
    const own = s.p.restoreStreams.find(x => x.resource === 'life'), pet = s.a.restoreStreams.find(x => x.resource === 'life');
    check(root + ': invested Alpha\'s Bond transfers a double-strength flask stream', !!own && !!pet && Math.abs(pet.remaining / own.remaining - 2) < 0.01);
    s.p.restoreStreams.length = 0; s.a.restoreStreams.length = 0;
    const before = s.p.life, mend = makeSkillInstance(SKILLS.mend, 1);
    cast(s.w, mend, s.a.pos); step(s.w, 0.1);
    check(root + ': invested Reciprocal Bond returns actual mending', s.p.life > before);
    reset(s.w, s.inst); const bank = s.a.charges.get('frenzy'); s.p.gainCharge('frenzy', 1, 3); step(s.w, 0.1);
    check(root + ': respec removes sympathy graft without releasing the beast', s.a.charges.get('frenzy') === bank && s.a.companion);
  }
  const suggestion = (nodes: string[], id = 'beguile') => { const s = setup(id, nodes), a = body(s.w); cast(s.w, s.inst, a.pos); step(s.w, 0.4); return { ...s, a }; };
  {
    const s = suggestion(['certain_confusion']), a = body(s.w, 65), ownLife = s.a.life, friendLife = a.life;
    check('Certain Confusion really applies both native conditions', ['maddened', 'befuddlement'].every(id => s.a.statuses.some(st => st.id === id)));
    step(s.w, 1);
    check('madness harms a same-team neighbor without converting either enemy', a.life < friendLife && s.a.life <= ownLife && a.team === 'enemy' && s.a.team === 'enemy' && !s.a.owner);
    const violent = suggestion(['certain_confusion', 'lasting_confusion', 'violent_confusion']);
    check('Violent Confusion applies real reeling alongside madness', violent.a.statuses.some(st => st.id === 'reeling') && violent.a.sheet.get('insightRegenPct') === 0);
    const line = (nodes: string[]) => { const s = setup('beguile', nodes), a = body(s.w, 80), b = body(s.w, 140); cast(s.w, s.inst, b.pos); step(s.w, 0.7); return [a, b].filter(a => a.statuses.some(st => st.id === 'maddened')).length; };
    check('Spreading Rumor applies native madness through the front body', line(['spreading_rumor']) === 2 && line([]) === 1);
  }
  {
    const s = suggestion(['barbed_challenge'], 'goad');
    check('Barbed Challenge delivers both native taunt and new bleed', ['taunted', 'bleed'].every(id => s.a.statuses.some(st => st.id === id)));
    const duration = (nodes: string[]) => suggestion(nodes, 'goad').a.statuses.find(st => st.id === 'taunted')!.remaining;
    check('Lasting Challenge lengthens actual taunt', duration(['pack_challenge', 'certain_challenge', 'lasting_challenge']) > duration(['pack_challenge', 'certain_challenge']));
    const volley = setup('goad', ['pack_challenge']); cast(volley.w, volley.inst, { x: volley.p.pos.x + 400, y: volley.p.pos.y });
    check('Pack Challenge launches three real stones', volley.w.projectiles.filter(p => p.caster === volley.p).length === 3);
  }
  {
    const s = suggestion(['crippling_mark'], 'expose_weakness'), plain = suggestion([], 'expose_weakness');
    check('Crippling Mark adds chill and preserves exposed window dimensions', s.a.statuses.some(st => st.id === 'chill') && near(s.a.statuses.find(st => st.id === 'exposed')!.window!.hi - s.a.statuses.find(st => st.id === 'exposed')!.window!.lo, plain.a.statuses.find(st => st.id === 'exposed')!.window!.hi - plain.a.statuses.find(st => st.id === 'exposed')!.window!.lo));
    const heavy = suggestion(['crippling_mark', 'lasting_mark', 'heavy_mark'], 'expose_weakness');
    check('Heavy Mark adds real vulnerability', heavy.a.statuses.some(st => st.id === 'vulnerable') && heavy.a.sheet.get('damageTaken') > s.a.sheet.get('damageTaken'));
  }
  for (const [id, root, buffId] of [
    ['stalk', 'sheltered_stalk', 'stalk'], ['stalk', 'hunters_opening', 'hunters_opening'],
    ['decoy', 'sheltered_departure', 'sheltered_departure'], ['cloudstep', 'cloud_shelter', 'cloud_shelter'],
    ['cloudstep', 'cloud_ambush', 'cloud_ambush'], ['expose_weakness', 'hunters_signal', 'hunters_signal'],
  ]) {
    const s = setup(id, [root]), a = body(s.w), ally = body(s.w, 60, 'player', true), foreignOwner = body(s.w, 300, 'player'), foreign = body(s.w, 65, 'player'); foreign.owner = foreignOwner;
    cast(s.w, s.inst, a.pos); step(s.w, 0.1);
    const recipient = id === 'expose_weakness' ? ally : s.p;
    check(root + ': actual blessing reaches intended recipient only', recipient.buffs.has(buffId) && !a.buffs.has(buffId) && !foreign.buffs.has(buffId));
    foreign.addBuff({ type: 'buff', id: buffId, duration: 30, mods: [mod('armor', 'flat', 7)] });
    reset(s.w, s.inst);
    check(root + ': respec clears owned blessing and preserves foreign source', !recipient.buffs.has(buffId) && foreign.buffs.has(buffId));
  }
  for (const id of ['decoy', 'cloudstep', 'shadow_clone']) {
    const tree = BOND_STARTER_TREES[id], root = tree.nodes!.find(n => n.excludes?.length)!.id;
    const s = setup(id, [root]), start = { ...s.p.pos }; cast(s.w, s.inst); step(s.w, 0.4);
    const owned = s.w.actors.filter(a => !a.dead && a.owner === s.p && a.sourceSkillId === id);
    check(id + ': actual movement leaves owned killable doubles', owned.length > 0 && owned.every(a => !a.invulnerable && a.lifespan > 0) && Math.hypot(s.p.pos.x - start.x, s.p.pos.y - start.y) > 0);
    const foreign = body(s.w, 200, 'player'); foreign.construct = { kind: 'decoy', range: 0, timer: 0 }; foreign.sourceSkillId = id;
    reset(s.w, s.inst); step(s.w, 0.1);
    check(id + ': respec retires owned doubles while preserving foreign body', owned.every(a => a.dead) && !foreign.dead);
  }
  for (const [id, root, prep] of [['stalk', 'hunters_opening', 'hunters_opening'], ['cloudstep', 'cloud_ambush', 'cloud_ambush']]) {
    const hit = (invested: boolean) => {
      const reseed = seedGlobalRandom(0xcafe);
      try {
        const s = setup(id, invested ? [root] : []); cast(s.w, s.inst); step(s.w, 0.4);
        const ready = s.p.buffs.has(prep), a = body(s.w, 80), before = a.life;
        const shot = makeSkillInstance({ ...SKILLS.goad, baseDamage: { physical: [20, 20] } }, 1);
        cast(s.w, shot, a.pos); step(s.w, 1);
        return { damage: before - a.life, ready, consumed: !s.p.buffs.has(prep), hush: id !== 'stalk' || s.p.buffs.has('stalk') };
      } finally { reseed(); }
    };
    const plain = hit(false), invested = hit(true);
    check(root + ': preparation survives the movement, increases an actual projectile hit and consumes once', invested.ready && invested.consumed && invested.hush && invested.damage > plain.damage);
  }
  const shadow = (nodes: string[]) => {
    const s = setup('shadow_clone', nodes); cast(s.w, s.inst); step(s.w, 0.1);
    const clones = s.w.actors.filter(a => !a.dead && a.owner === s.p && a.construct?.echo?.mode === 'mimic');
    return { ...s, clones };
  };
  {
    const plain = shadow([]), heavy = shadow(['weighty_shadow']), quick = shadow(['eager_shadow']);
    check('clone identities alter real echo power and replay clock', heavy.clones[0].construct!.echoPower! > plain.clones[0].construct!.echoPower! && heavy.clones[0].construct!.castInterval! > plain.clones[0].construct!.castInterval! && quick.clones[0].construct!.castInterval! < plain.clones[0].construct!.castInterval!);
    const s = heavy, a = body(s.w, 150); step(s.w, 1); const before = a.life;
    check('idle clones do not attack independently', a.life === a.maxLife());
    const shot = makeSkillInstance({ ...SKILLS.goad, baseDamage: { physical: [20, 20] } }, 1); cast(s.w, shot, a.pos); step(s.w, 1);
    check('eligible owner shot queues and lands an actual clone replay', a.life < before && s.clones.some(c => (c.construct!.echoReadyAt ?? 0) > 0));
    check('Sturdy Shadow strengthens real clone life', shadow(['weighty_shadow', 'lasting_shadow', 'sturdy_shadow']).clones[0].maxLife() > heavy.clones[0].maxLife());
    const pending = shadow(['eager_shadow']), target = body(pending.w, 250);
    const instant = makeSkillInstance({ ...SKILLS.goad, useTime: 0 }, 1);
    cast(pending.w, instant, target.pos);
    check('clone has a real queued replay before reset', pending.w.pendingRepeats.some(r => pending.clones.includes(r.caster)));
    reset(pending.w, pending.inst);
    check('respec cancels the retired clones\' queued replays and projectiles', !pending.w.pendingRepeats.some(r => pending.clones.includes(r.caster)) && !pending.w.projectiles.some(p => pending.clones.includes(p.caster)));
    check('clone respec preserves the owner\'s own borrowed-skill shot', pending.w.projectiles.some(p => p.caster === pending.p && p.inst === instant));
    const airborne = shadow(['weighty_shadow']), distant = body(airborne.w, 500);
    const slowShot = makeSkillInstance({ ...SKILLS.goad, useTime: 0, delivery: { type: 'projectile', speed: 180, radius: 8, range: 1000 } }, 1);
    cast(airborne.w, slowShot, distant.pos); step(airborne.w, 0.3);
    check('clone replay has emitted an actual airborne projectile before reset', airborne.w.projectiles.some(p => airborne.clones.includes(p.caster)));
    reset(airborne.w, airborne.inst);
    check('respec removes airborne clone payload but preserves the owner shot', !airborne.w.projectiles.some(p => airborne.clones.includes(p.caster)) && airborne.w.projectiles.some(p => p.caster === airborne.p));
  }
  const falcons = (nodes: string[]) => { const s = setup('cast_falcon', nodes); cast(s.w, s.inst); step(s.w, 0.1); return { ...s, birds: s.w.actors.filter(a => !a.dead && a.owner === s.p && a.defId === 'hunting_falcon') }; };
  {
    const pair = falcons(['paired_hunt']), one = falcons(['watchful_hunt']);
    check('Paired Hunt fields two real birds with per-bird reservation', pair.birds.length === 2 && pair.p.reservedMana === 18);
    check('Watchful Hunt keeps one native bird and reserve', one.birds.length === 1 && one.p.reservedMana === 9 && one.birds[0].sheet.get('damageTaken') < pair.birds[0].sheet.get('damageTaken'));
    const armor = falcons(['watchful_hunt', 'watchful_vigor', 'watchful_armor']);
    check('Watchful Armor applies to the actual bird', armor.birds[0].sheet.get('armor') > one.birds[0].sheet.get('armor'));
    const regen = falcons(['paired_hunt', 'hardy_wings', 'mending_wings']), bird = regen.birds[0]; bird.life *= 0.5; const life = bird.life; step(regen.w, 1);
    check('Mending Wings heals a real wounded bird', bird.life > life);
    // Fresh world immediately before minting prey: actor ids reset per sim world.
    const hunt = falcons(['watchful_hunt']), prey = body(hunt.w, 80);
    let latched = false;
    for (let i = 0; i < 360; i++) { for (const actor of hunt.w.actors) updateAI(actor, hunt.w, 1 / 60); step(hunt.w, 1 / 60); latched ||= hunt.birds[0].clingTo?.id === prey.id && prey.statuses.some(s => s.id === 'vulnerable'); }
    check('native falcon actually latches and applies vulnerability', latched);
    hunt.w.kill(hunt.birds[0]); step(hunt.w, 5.2);
    check('native persistent contract respawns after death', hunt.w.actors.some(a => !a.dead && a.owner === hunt.p && a.defId === 'hunting_falcon') && hunt.p.reservedMana === 9);
    reset(hunt.w, hunt.inst); step(hunt.w, 6);
    check('falcon respec clears birds, reservations and pending respawns', hunt.p.reservedMana === 0 && !hunt.w.actors.some(a => !a.dead && a.owner === hunt.p && a.defId === 'hunting_falcon'));
    cast(pair.w, pair.inst); step(pair.w, 0.1);
    check('native toggle-off retires both invested falcons and reservations', pair.p.reservedMana === 0 && pair.birds.every(a => a.dead));
    const scoped = falcons(['paired_hunt']), keeper = body(scoped.w, 300, 'player');
    keeper.sheet.setSource('foreign_budget', [mod('mana', 'flat', 1000), mod('dexterity', 'flat', 100)]); keeper.fillResources();
    const foreignInst = makeSkillInstance(SKILLS.cast_falcon, 1); keeper.skills = [foreignInst];
    const used = scoped.w.useSkill(keeper, foreignInst, keeper.pos, true); step(scoped.w, 1);
    const foreignBird = scoped.w.actors.find(a => !a.dead && a.owner === keeper && a.defId === 'hunting_falcon');
    check('foreign owner can cast the same native falcon skill', used && !!foreignBird && keeper.reservedMana === 9);
    reset(scoped.w, scoped.inst); step(scoped.w, 0.1);
    check('falcon respec preserves a different owner\'s bird and reservation', scoped.birds.every(a => a.dead) && !!foreignBird && !foreignBird.dead && keeper.reservedMana === 9 && scoped.p.reservedMana === 0);
  }
} finally { restore(); }
console.log(`Bond starter trees: ${passed} passed, ${failed} failed; ${routes} terminal routes.`);
if (failed) process.exitCode = 1;
