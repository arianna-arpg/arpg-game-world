import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { CLASSES } from '../src/data/classes';
import { RESONATOR_STARTER_TREES } from '../src/data/resonatorStarterTrees';
import { makeSkillInstance, instanceDelivery, instanceChannel, instanceBaseTags, instanceEffects, instanceChargeCost, instanceCastCycle, treeAuraOverrideErrors, instanceMods, skillContextTags, treeNodeRefusal, type SkillInstance } from '../src/engine/skills';
import { mod, STAT_DEFS } from '../src/engine/stats';
import { serializeCharacter, rebuildSkill } from '../src/meta/character';
import { serializeSeatMeta, applySeatMeta } from '../src/net/snapshot';
import type { World } from '../src/engine/world';
let failed = 0, passed = 0, routes = 0;
const check = (name: string, ok: boolean) => { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (ok) passed++; else failed++; };
const near = (a: number, b: number) => Math.abs(a - b) < 0.00001;
const canonical = (x: unknown): string => JSON.stringify(x, (_k, v) => Array.isArray(v) ? [...v].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) : v);
function setup(id: string, nodes: string[] = []) {
  const klass = CLASSES.find(c => ['resonator'].includes(c.id) && c.bar.includes(id))!;
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
  check('Resonator have complete starting trees', CLASSES.filter(c => ['resonator'].includes(c.id)).every(c => c.bar.filter(Boolean).every(id => !!RESONATOR_STARTER_TREES[id!])));
  for (const [id, tree] of Object.entries(RESONATOR_STARTER_TREES)) {
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
      const used = cast(s.w, s.inst, a.pos);
      step(s.w, 0.1);
      const worked = id === 'purity_of_elements' ? s.p.activeAuras.has(id) && s.p.sheet.get('fireRes') >= 0.2 : a.life < a.maxLife();
      check(id + '/' + leaf.id + ': real cast performs its native role with the invested route', used && worked && s.inst.treeNodes?.length === 3);
      const saved = rebuildSkill(serializeCharacter(s.w).knownSkills.find(k => k.skillId === id)!)!;
      check(id + '/' + leaf.id + ': save rebuild preserves picks and resolved behavior', saved.treeNodes?.join() === s.inst.treeNodes?.join() && canonical(instanceEffects(saved)) === canonical(instanceEffects(s.inst)) && canonical(instanceDelivery(saved)) === canonical(instanceDelivery(s.inst)) && canonical(instanceChannel(saved)) === canonical(instanceChannel(s.inst)) && canonical(instanceCastCycle(saved)) === canonical(instanceCastCycle(s.inst)));
      const other = setup(id); applySeatMeta(other.w, other.w.localSeat, serializeSeatMeta(s.w.localSeat));
      const wired = other.w.meta.knownSkills.get(id)!;
      check(id + '/' + leaf.id + ': network rebuild restores modifiers, grafts and effects', canonical(instanceMods(wired)) === canonical(instanceMods(s.inst)) && canonical(instanceEffects(wired)) === canonical(instanceEffects(s.inst)) && canonical(instanceCastCycle(wired)) === canonical(instanceCastCycle(s.inst)) && canonical(instanceDelivery(wired)) === canonical(instanceDelivery(s.inst)));
      check(id + '/' + leaf.id + ': save and network rebuild preserve spender contracts', canonical(instanceChargeCost(saved)) === canonical(instanceChargeCost(s.inst)) && canonical(instanceChargeCost(wired)) === canonical(instanceChargeCost(s.inst)));
    }
  }
  check('all 24 terminal routes exercised', routes === 24);
  for (const [id, tree] of Object.entries(RESONATOR_STARTER_TREES)) {
    check(id + ': aura mutations validate', tree.nodes!.every(n => !treeAuraOverrideErrors(SKILLS[id], n).length));
    check(id + ': recipient modifiers use finite registered stats', tree.nodes!.every(n => [...(n.over?.aura?.allyMods ?? []), ...(n.over?.aura?.enemyMods ?? [])].every(m => !!STAT_DEFS[m.stat] && Number.isFinite(m.value))));
  }

  const tones = ['attuned_fire', 'attuned_cold', 'attuned_lightning'];
  {
    const s = setup('tuning_strike', ['full_peal']), a = body(s.w);
    check('Full Peal lands through the ordinary cast path', cast(s.w, s.inst, a.pos));
    check('Full Peal applies all three native tones together', tones.every(id => a.statuses.some(st => st.id === id)));
    check('tones retain their native beneficial resistances', ['fireRes', 'coldRes', 'lightningRes'].every(stat => a.sheet.get(stat) >= 0.1));
    const life = a.life, expiry = Math.max(...a.statuses.map(st => st.remaining));
    reset(s.w, s.inst);
    check('respec clears investment without retroactively consuming target tones or hitting again', !s.inst.treeNodes?.length && a.life === life && tones.every(id => a.statuses.some(st => st.id === id)));
    step(s.w, expiry + 0.1); check('native tone statuses expire normally after respec', tones.every(id => !a.statuses.some(st => st.id === id)));
    const plain = setup('tuning_strike');
    const peal = setup('tuning_strike', ['full_peal']);
    check('Full Peal pays its slower attack contract', near(peal.p.skillUseTime(peal.inst) / plain.p.skillUseTime(plain.inst), 1.25));
    const counts = new Set<number>();
    for (let i = 0; i < 40; i++) { const a = body(plain.w); cast(plain.w, plain.inst, a.pos); counts.add(a.statuses.filter(st => tones.includes(st.id)).length); a.dead = true; }
    check('unallocated native attunements are independent rolls, including zero and multiple tones', counts.has(0) && [...counts].some(n => n > 1));
  }
  {
    const durations = (nodes: string[]) => { const s = setup('tuning_strike', ['full_peal', ...nodes]), a = body(s.w); cast(s.w, s.inst, a.pos); return a.statuses.find(st => st.id === 'attuned_fire')!.remaining; };
    check('Sustained Peal lengthens a real applied tone', durations(['sustained_peal']) > durations([]));
    const hit = (nodes: string[]) => { const s = setup('tuning_strike', nodes), a = body(s.w, 0); a.pos.y += 60; cast(s.w, s.inst, { x: s.p.pos.x + 80, y: s.p.pos.y }); return a.life < a.maxLife(); };
    check('Choir Sweep reaches a flanker excluded by the native arc', !hit([]) && hit(['choir_sweep']));
  }
  // A/B with identical rolled damage and victim defenses: the only difference
  // is the tree's victim-scoped multiplier. Never stub resolveHit/executeSkill.
  const chord = (nodes: string[], attunements: string[], distance = 40) => {
    const s = setup('shatterchord', nodes), a = body(s.w, distance);
    s.inst.def = { ...s.inst.def, baseDamage: { fire: [10, 10], cold: [10, 10], lightning: [10, 10] } };
    for (const id of attunements) a.applyStatus(id, 0, 1, 'rig');
    cast(s.w, s.inst, a.pos); return { ...s, a, damage: a.maxLife() - a.life };
  };
  for (let count = 0; count <= 3; count++) {
    const chosen = tones.slice(0, count), native = chord([], chosen), invested = chord(['sympathetic_ruin'], chosen);
    check('Sympathetic Ruin multiplies exactly once per live tone: ' + count, near(invested.damage / native.damage, 1.3 ** count));
    check('chord preserves native and invested tone statuses: ' + count, chosen.every(id => native.a.statuses.some(st => st.id === id) && invested.a.statuses.some(st => st.id === id)));
  }
  const reach = setup('shatterchord');
  const nativeRadius = 190 * reach.p.sheet.get('aoeRadius', skillContextTags(reach.inst), instanceMods(reach.inst));
  check('Sympathetic Ruin trades actual reach for its payoff', chord([], [], nativeRadius * 0.95).damage > 0 && chord(['sympathetic_ruin'], [], nativeRadius * 0.95).damage === 0);
  check('Piercing Harmony overcomes real elemental resistance', chord(['sympathetic_ruin', 'piercing_harmony'], tones).damage > chord(['sympathetic_ruin'], tones).damage);
  {
    const s = chord(['damping_chord'], []), longer = chord(['damping_chord', 'wide_damping', 'lasting_damping'], []);
    check('Damping Chord applies a real stun', s.a.statuses.some(st => st.id === 'stun'));
    check('Lasting Silence increases real stun duration', longer.a.statuses.find(st => st.id === 'stun')!.remaining > s.a.statuses.find(st => st.id === 'stun')!.remaining);
    check('Damping Chord pays its damage tradeoff', near(s.damage / chord([], []).damage, 0.8));
  }
  // Exercise shared economic and sustain consumers with damageable bodies;
  // a registered modifier alone is not proof that a terminal node works.
  for (const [id, parent, leaf] of [
    ['tuning_strike', ['full_peal', 'sustained_peal'], 'fed_peal'],
    ['tuning_strike', ['choir_sweep', 'wide_choir'], 'paid_choir'],
    ['shatterchord', ['sympathetic_ruin', 'piercing_harmony'], 'hungry_harmony'],
    ['shatterchord', ['damping_chord', 'wide_damping'], 'paid_damping'],
  ] as const) {
    const gain = (nodes: string[]) => { const s = setup(id, nodes), a = body(s.w); s.p.life = s.p.maxLife() / 2; const before = s.p.life; cast(s.w, s.inst, a.pos); step(s.w, 1); return s.p.life - before; };
    check(leaf + ': landed damage actually restores more life', gain([...parent, leaf]) > gain([...parent]));
  }
  for (const [id, parent, leaf] of [
    ['tuning_strike', ['full_peal', 'long_peal'], 'cheap_peal'],
    ['shatterchord', ['sympathetic_ruin', 'ready_harmony'], 'cheap_harmony'],
    ['shatterchord', ['damping_chord', 'ready_damping'], 'cheap_damping'],
  ] as const) {
    const base = setup(id, [...parent]), invested = setup(id, [...parent, leaf]);
    check(leaf + ': reduces the actual quoted mana payment', invested.p.skillCost(invested.inst).mana < base.p.skillCost(base.inst).mana);
  }
  for (const [root, fork] of [['sympathetic_ruin', 'ready_harmony'], ['damping_chord', 'ready_damping']]) {
    const remaining = (nodes: string[]) => { const s = setup('shatterchord', nodes); cast(s.w, s.inst); step(s.w, 1); return s.p.cooldowns.get('shatterchord') ?? 0; };
    check(fork + ': accelerates an actual running cooldown', remaining([root, fork]) < remaining([root]));
  }
  {
    const gain = (nodes: string[]) => {
      const s = setup('purity_of_elements', nodes), ally = body(s.w, 70, 'player', true); ally.life = ally.maxLife() / 2;
      const life = ally.life; cast(s.w, s.inst); step(s.w, 1); return ally.life - life;
    };
    check('Mending Harmony regenerates an actual wounded ally', gain(['sheltering_harmony', 'steady_harmony', 'mending_harmony']) > gain(['sheltering_harmony', 'steady_harmony']));
    const hit = (nodes: string[]) => {
      const s = setup('purity_of_elements', nodes), a = body(s.w); cast(s.w, s.inst); step(s.w, 0.1);
      const inst = makeSkillInstance({ ...SKILLS.shatterchord, baseDamage: { fire: [10, 10], cold: [10, 10], lightning: [10, 10] } }, 20);
      cast(s.w, inst, a.pos); return a.maxLife() - a.life;
    };
    check('Resounding Harmony increases an actual elemental chord hit', hit(['resounding_harmony']) > hit([]));
    check('Piercing Resonance improves actual chord damage through its aura source', hit(['resounding_harmony', 'quick_resonance', 'piercing_resonance']) > hit(['resounding_harmony', 'quick_resonance']));
  }
  for (const root of ['sheltering_harmony', 'resounding_harmony']) {
    const s = setup('purity_of_elements', [root]), ally = body(s.w, 70, 'player', true), foe = body(s.w), far = body(s.w, 2000, 'player'), upstairs = body(s.w, 60, 'player'); upstairs.tier++;
    const nativeRes = ally.sheet.get('fireRes'), damageTaken = root === 'sheltering_harmony' ? 0.88 : 1.1;
    cast(s.w, s.inst); step(s.w, 0.1);
    check(root + ': native resistance and tree payload reach owner and allied minion', near(ally.sheet.get('fireRes') - nativeRes, 0.2) && near(ally.sheet.get('damageTaken'), damageTaken) && near(s.p.sheet.get('damageTaken'), damageTaken));
    check(root + ': preserves exact native 35 mana reservation', s.p.reservedMana === 35);
    check(root + ': excludes hostile, distant and other-story bodies', [foe, far, upstairs].every(a => near(a.sheet.get('damageTaken'), 1)));
    step(s.w, 1); check(root + ': repeated aura updates do not stack', near(ally.sheet.get('damageTaken'), damageTaken));
    ally.pos.x += 2000; step(s.w, 0.1); check(root + ': leaving strips native and invested modifiers', near(ally.sheet.get('fireRes'), nativeRes) && near(ally.sheet.get('damageTaken'), 1));
    ally.pos = { x: s.p.pos.x + 70, y: s.p.pos.y }; step(s.w, 0.1);
    ally.sheet.setSource('aura_budget', [mod('mana', 'flat', 1000)]); ally.fillResources();
    s.w.executeSkill(ally, makeSkillInstance(SKILLS.purity_of_elements, 20), ally.pos); step(s.w, 0.1);
    check(root + ': reset immediately removes owned aura but preserves another bearer', reset(s.w, s.inst) && near(ally.sheet.get('damageTaken'), 1) && ally.activeAuras.has('purity_of_elements') && near(ally.sheet.get('fireRes') - nativeRes, 0.2) && !s.p.activeAuras.has('purity_of_elements') && s.p.reservedMana === 0);
  }
  {
    const s = setup('purity_of_elements'); cast(s.w, s.inst); step(s.w, 0.1);
    s.w.pickTreeNode('purity_of_elements', 'resounding_harmony');
    check('first allocation retires an existing native toggle and releases its reservation', s.p.reservedMana === 0 && !s.p.activeAuras.size);
    cast(s.w, s.inst); step(s.w, 0.1); cast(s.w, s.inst);
    check('ordinary toggle-off removes invested payload immediately', s.p.reservedMana === 0 && !s.p.activeAuras.size && near(s.p.sheet.get('damageTaken'), 1));
    const slow = setup('purity_of_elements', ['resounding_harmony', 'wide_resonance', 'damping_resonance']), enemy = body(slow.w);
    enemy.sheet.removeSource('rig'); const speed = enemy.sheet.get('moveSpeed');
    cast(slow.w, slow.inst); step(slow.w, 0.1);
    check('Damp the Pursuit slows a real hostile recipient', enemy.sheet.get('moveSpeed') < speed);
    reset(slow.w, slow.inst); check('respec strips enemy aura modifiers immediately', near(enemy.sheet.get('moveSpeed'), speed));
  }
} finally { restore(); }
console.log(`Resonator starter trees: ${passed} passed, ${failed} failed; ${routes} terminal routes.`);
if (failed) process.exitCode = 1;
