import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { CLASSES } from '../src/data/classes';
import { INVOCATIONS, RUNE_INFO, resolveInvocation } from '../src/data/invocations';
import { instanceInvocation, invocationTreeErrors, runeForCast, makeInvocationPayload } from '../src/engine/invocation';
import { previewSkill } from '../src/engine/skillPreview';
import { skillDamageBands } from '../src/engine/damage';
import { RUNEWEAVER_STARTER_TREES } from '../src/data/runeweaverStarterTrees';
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
  const klass = CLASSES.find(c => ['runeweaver'].includes(c.id) && c.bar.includes(id))!;
  const w = makeSimWorld(klass.id, 0xded1ca7e), p = w.player;
  for (const attr of Object.keys(w.meta.baseAttrs) as (keyof typeof w.meta.baseAttrs)[]) w.meta.baseAttrs[attr] = 100;
  w.recalcPlayer(); const inst = makeSkillInstance(SKILLS[id], 20, 3);
  w.meta.knownSkills.set(id, inst); p.skills.fill(null); p.skills[0] = inst;
  for (const node of nodes) w.pickTreeNode(id, node);
  p.sheet.setSource('rig', [mod('mana', 'flat', 10000), mod('accuracy', 'flat', 100000), mod('critChance', 'override', 0), mod('lifeRegen', 'override', 0)]);
  if (id === 'invocation') p.skills[1] = makeSkillInstance(SKILLS.warp, 20);
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
  check('Runeweaver have complete starting trees', CLASSES.filter(c => ['runeweaver'].includes(c.id)).every(c => c.bar.filter(Boolean).every(id => !!RUNEWEAVER_STARTER_TREES[id!])));
  for (const [id, tree] of Object.entries(RUNEWEAVER_STARTER_TREES)) {
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
      const a = body(s.w, 40), origin = { ...s.p.pos };
      if (id === 'invocation') cast(s.w, s.p.skills[1]!, s.p.pos);
      const used = cast(s.w, s.inst, id === 'warp' ? { x: s.p.pos.x + 230, y: s.p.pos.y } : a.pos);
      step(s.w, 1.2);
      const worked = id === 'invocation' ? a.life < a.maxLife() && s.p.runes.length === 0
        : id === 'warp' ? s.p.pos.x > origin.x + 100 : s.w.zones.some(z => z.inst === s.inst);
      check(id + '/' + leaf.id + ': actual cast performs the invested role', used && worked && s.inst.treeNodes?.length === 3);
      const saved = rebuildSkill(serializeCharacter(s.w).knownSkills.find(k => k.skillId === id)!)!;
      check(id + '/' + leaf.id + ': save rebuild preserves picks and resolved behavior', saved.treeNodes?.join() === s.inst.treeNodes?.join() && canonical(instanceEffects(saved)) === canonical(instanceEffects(s.inst)) && canonical(instanceDelivery(saved)) === canonical(instanceDelivery(s.inst)) && canonical(instanceChannel(saved)) === canonical(instanceChannel(s.inst)) && canonical(instanceCastCycle(saved)) === canonical(instanceCastCycle(s.inst)));
      const other = setup(id); applySeatMeta(other.w, other.w.localSeat, serializeSeatMeta(s.w.localSeat));
      const wired = other.w.meta.knownSkills.get(id)!;
      check(id + '/' + leaf.id + ': network rebuild restores modifiers, grafts and effects', canonical(instanceMods(wired)) === canonical(instanceMods(s.inst)) && canonical(instanceEffects(wired)) === canonical(instanceEffects(s.inst)) && canonical(instanceCastCycle(wired)) === canonical(instanceCastCycle(s.inst)) && canonical(instanceDelivery(wired)) === canonical(instanceDelivery(s.inst)));
      check(id + '/' + leaf.id + ': save and network rebuild preserve spender contracts', canonical(instanceChargeCost(saved)) === canonical(instanceChargeCost(s.inst)) && canonical(instanceChargeCost(wired)) === canonical(instanceChargeCost(s.inst)));
    }
  }
  check('all 24 terminal routes exercised', routes === 24);
  for (const [id, tree] of Object.entries(RUNEWEAVER_STARTER_TREES)) check(id + ': invocation overrides validate', tree.nodes!.every(n => !invocationTreeErrors(SKILLS[id], n).length));
  check('invocation override rejects a non-invoker', invocationTreeErrors(SKILLS.warp, { id: 'bad', name: 'bad', over: { invocation: { untypedRunes: ['glyph'], damagePerRune: 0.2 } } }).length > 0);
  check('invocation override rejects an empty alphabet or nonfinite multiplier', invocationTreeErrors(SKILLS.invocation, { id: 'bad', name: 'bad', over: { invocation: { untypedRunes: [], damagePerRune: NaN } } }).length === 2);
  {
    const plain = makeSkillInstance(SKILLS.invocation);
    check('schoolless opening spells generate Glyph without any tree points', ['warp', 'rune_of_power'].every(id => runeForCast(SKILLS[id], plain, []) === 'glyph'));
    check('physical, chaos, attack and melee skills do not get schoolless fuel', ['cleave', 'ruin', 'essence_drain'].every(id => !runeForCast(SKILLS[id], plain, []))
      && !runeForCast({ ...SKILLS.warp, tags: ['spell', 'attack'] }, plain, []) && !runeForCast({ ...SKILLS.warp, tags: ['spell', 'melee'] }, plain, []));
    check('elemental casts retain their original school precedence', runeForCast(SKILLS.firebolt, plain, []) === 'ember' && runeForCast(SKILLS.frost_nova, plain, []) === 'rime' && runeForCast(SKILLS.chain_lightning, plain, []) === 'arc');
    check('Invocation never banks a rune for itself', !runeForCast(SKILLS.invocation, plain, []));
    check('Glyph matches the native fallback without pretending to be an elemental recipe', resolveInvocation(['glyph'])?.id === 'release' && resolveInvocation(['glyph', 'glyph', 'glyph'])?.id === 'release' && RUNE_INFO.glyph.element === 'physical');
  }
  {
    const w = makeSimWorld('runeweaver', 91), p = w.player;
    const inv = p.skills.find(s => s?.def.id === 'invocation')!, warp = p.skills.find(s => s?.def.id === 'warp')!, rune = p.skills.find(s => s?.def.id === 'rune_of_power')!;
    const a = body(w, 140), mana = p.mana;
    check('fresh level-one Invocation refuses empty fuel without spending mana', !w.useSkill(p, inv, a.pos, true) && near(p.mana, mana) && !p.casting);
    const use = (inst: SkillInstance, aim = p.pos) => { const ok = w.useSkill(p, inst, aim, true); for (let i = 0; i < 120 && p.casting; i++) step(w, 1 / 60); return ok; };
    check('fresh starting attributes and mana can inscribe Rune of Power', use(rune) && p.runes.join() === 'glyph');
    step(w, 0.3);
    check('first Invocation spends real starting fuel and damages an enemy', use(inv, a.pos) && p.runes.length === 0); step(w, 0.5);
    check('the first working reaches the marked ground', a.life < a.maxLife());
    step(w, 2.1); check('Warp supplies the next rune through a paid real cast', use(warp, { x: p.pos.x + 40, y: p.pos.y }) && p.runes.join() === 'glyph');
    step(w, 1); const before = a.life;
    check('starting kit repeats its damage loop without an external spell or investment', use(inv, a.pos) && !p.runes.length); step(w, 0.5);
    check('second starting-kit working deals damage with ordinary mana and cooldowns', a.life < before);
    console.log('OPENING', JSON.stringify({ maxMana: p.maxMana(), remainingMana: p.mana, damage: a.maxLife() - a.life, seconds: w.time, warpCost: p.skillCost(warp), runeCost: p.skillCost(rune), invocationCost: p.skillCost(inv) }));
  }
  {
    const s = setup('invocation', ['prismatic_script']);
    for (let i = 0; i < 3; i++) cast(s.w, s.p.skills[1]!, s.p.pos);
    check('Prismatic Script cycles real schoolless casts through the authored alphabet', s.p.runes.join() === 'ember,rime,arc');
    const saved = rebuildSkill(serializeCharacter(s.w).knownSkills.find(k => k.skillId === 'invocation')!)!;
    const peer = setup('invocation'); applySeatMeta(peer.w, peer.w.localSeat, serializeSeatMeta(s.w.localSeat));
    check('saved and network trees rebuild the identical fuel alphabet', canonical(instanceInvocation(saved)) === canonical(instanceInvocation(s.inst)) && canonical(instanceInvocation(peer.w.meta.knownSkills.get('invocation')!)) === canonical(instanceInvocation(s.inst)));
    const mana = s.p.mana; s.p.casting = null; s.p.cooldowns.set('warp', 10);
    check('refused cooldown cast adds no fuel and costs nothing', !s.w.useSkill(s.p, s.p.skills[1]!, s.p.pos, true) && s.p.runes.length === 3 && s.p.mana === mana);
    s.w.executeSkill(s.p, s.p.skills[1]!, s.p.pos, { noCooldown: true });
    s.w.executeSkill(s.p, s.p.skills[1]!, s.p.pos, { noRepeat: true });
    check('triggered and repeated executions cannot manufacture runes', s.p.runes.length === 3);
    for (let i = 0; i < 20; i++) cast(s.w, s.p.skills[1]!, s.p.pos);
    check('banking retains only the capped newest runes', s.p.runes.length === 7 && s.p.runes.slice(-3).join() === 'arc,ember,rime');
    check('respec clears the previous alphabet and pending invoker fields', reset(s.w, s.inst) && !s.p.runes.length);
  }
  {
    const s = setup('invocation'), channel = makeSkillInstance({ ...SKILLS.wild_strike, id: 'schoolless_channel', tags: ['spell', 'channel'] });
    s.p.skills[1] = channel; cast(s.w, channel); step(s.w, 2.2);
    check('held schoolless channel banks on the one-per-second clock, not every pulse', s.p.runes.length === 2 && s.p.runes.every(r => r === 'glyph'));
    s.p.casting = null; const before = s.p.runes.length;
    const other = body(s.w, 40, 'player'); other.skills = [makeSkillInstance(SKILLS.warp)]; s.w.executeSkill(other, other.skills[0]!, other.pos);
    check('a caster without an invoker cannot bank fuel for itself or the player', !other.runes.length && s.p.runes.length === before);
    const device = s.w.spawnConstruct(s.p, makeSkillInstance(SKILLS.flame_totem), { type: 'construct', kind: 'totem', range: 200, duration: 10, maxActive: 1 }, s.p.pos)!;
    device.skills = [makeSkillInstance(SKILLS.invocation), makeSkillInstance(SKILLS.firebolt)]; s.w.executeSkill(device, device.skills[1]!, s.p.pos);
    check('autonomous construct casts never bank invocation fuel', !device.runes.length && s.p.runes.length === before);
  }
  for (const root of ['prismatic_script', 'patient_script']) {
    const s = setup('invocation', [root]), a = body(s.w, 100);
    s.p.runes = ['glyph', 'glyph', 'glyph']; cast(s.w, s.inst, a.pos); step(s.w, 0.4);
    check(root + ': release consumes the bank exactly once and its payload cannot re-bank', s.p.runes.length === 0 && a.life < a.maxLife());
    const preview = previewSkill(s.p, s.inst);
    check(root + ': preview explains the live alphabet and empty-bank action', preview.rows.some(r => r.key === 'invocation_fuel') && preview.rows.some(r => r.key === 'invocation_empty'));
  }
  {
    const s = setup('invocation', ['patient_script', 'banked_script', 'hungry_script']), host = s.inst;
    check('Widening fits the invoker before its working is selected', supportFitsInst(SUPPORTS.widening, host));
    host.sockets[0] = { def: SUPPORTS.widening, level: 3 };
    const snapshot = makeInvocationPayload(host, SKILLS.invoke_burst, 'glyph');
    const flat = makeInvocationPayload(makeSkillInstance(SKILLS.invocation, 20), SKILLS.invoke_burst, 'glyph');
    check('release inherits host tree and support modifiers exactly once', snapshot.invocationHost === host && s.p.sheet.get('lifeLeech', skillContextTags(snapshot), instanceMods(snapshot)) === 0.06
      && s.p.sheet.get('aoeRadius', skillContextTags(snapshot), instanceMods(snapshot)) > s.p.sheet.get('aoeRadius', skillContextTags(flat), instanceMods(flat)));
    const mods = canonical(instanceMods(snapshot)); host.treeNodes = undefined; host.sockets[0] = null;
    check('a release snapshot does not change when the host is edited later', canonical(instanceMods(snapshot)) === mods);
    const fire = makeInvocationPayload(host, SKILLS.invoke_burst, 'ember'), damage = skillDamageBands(s.p, fire);
    check('closing Ember converts to fire and uses spell/fire context without leaving physical damage', !!damage.bands.fire && !damage.bands.physical && skillContextTags(fire).has('fire'));
  }
  {
    const hit = (nodes: string[], support = false) => {
      const s = setup('invocation', nodes), a = body(s.w, 100); a.sheet.setSource('armor', [mod('armor', 'override', 0)]);
      if (support) s.inst.sockets[0] = { def: { ...SUPPORTS.widening, id: 'probe_damage', mods: [mod('damage', 'more', 0.5)] }, level: 1 };
      const payload = SKILLS.invoke_burst.baseDamage!; const old = payload.physical!; payload.physical = [20, 20];
      try { s.p.runes = ['glyph', 'glyph', 'glyph']; cast(s.w, s.inst, a.pos); step(s.w, 0.4); } finally { payload.physical = old; }
      return a.maxLife() - a.life;
    };
    const base = hit([]), invested = hit(['invocation_practice']), supported = hit([], true);
    check('neutral Invocation damage investment reaches real released damage', invested > base);
    check('a host damage support increases real damage once, not zero or twice', near(supported / base, 1.5));
    check('Patient Script pays off a longer bank through real damage', hit(['patient_script']) > base);
  }
  for (const runes of [['glyph'], ['ember', 'arc'], ['ember', 'ember', 'ember'], ['arc', 'arc', 'arc'], ['rime', 'rime', 'rime'], ['ember', 'rime', 'arc', 'glyph']]) {
    const s = setup('invocation', ['invocation_practice']), a = body(s.w, 100); s.p.runes = runes;
    const rule = resolveInvocation(runes)!; cast(s.w, s.inst, a.pos);
    check(rule.id + ': release schedules fields or flights tied to the exact investing host', [...s.w.zones, ...s.w.projectiles].some(x => x.inst.invocationHost === s.inst));
    const other = makeSkillInstance(SKILLS.invocation, 20); const otherPayload = makeInvocationPayload(other, SKILLS.invoke_burst, 'glyph'); s.w.executeSkill(s.p, otherPayload, a.pos, { noRepeat: true, noCooldown: true });
    check(rule.id + ': reset removes its own release and preserves an independent same-id host', reset(s.w, s.inst) && ![...s.w.zones, ...s.w.projectiles].some(x => x.inst.invocationHost === s.inst) && s.w.zones.some(z => z.inst.invocationHost === other));
  }
  check('every native invocation recipe is retained', INVOCATIONS.length === 11);
  for (const [root, buffId] of [['prepared_warp', 'prepared_warp'], ['sheltered_warp', 'sheltered_warp']]) {
    const s = setup('warp', [root]), origin = { ...s.p.pos }; cast(s.w, s.inst, { x: origin.x + 200, y: origin.y });
    check(root + ': the blessing protects/prepares the native delay before displacement', s.p.buffs.has(buffId) && s.p.pos.x === origin.x && s.w.pendingBlinks.some(b => b.inst === s.inst));
    check(root + ': respec cancels both blessing and pending displacement', reset(s.w, s.inst) && !s.p.buffs.has(buffId) && !s.w.pendingBlinks.some(b => b.inst === s.inst));
    step(s.w, 1); check(root + ': a reset Warp cannot move the player later', near(s.p.pos.x, origin.x));
  }
  {
    const s = setup('warp', ['prepared_warp']), a = body(s.w, 100); cast(s.w, s.inst, s.p.pos);
    const inv = makeSkillInstance(SKILLS.invocation); s.p.runes = ['glyph'];
    s.w.executeSkill(s.p, inv, a.pos); step(s.w, 0.4);
    check('Prepared Crossing empowers and is consumed by an actual Invocation spell hit', !s.p.buffs.has('prepared_warp') && a.life < a.maxLife());
  }
  for (const root of ['sheltering_rune', 'wandering_rune']) {
    const s = setup('rune_of_power', [root]), ally = body(s.w, 50, 'player', true), baseline = ally.sheet.get('damage', new Set(['spell'])); cast(s.w, s.inst, s.p.pos); step(s.w, 0.2);
    const z = s.w.zones.find(z => z.inst === s.inst)!;
    check(root + ': real circle grants native spell bonuses to the nearby ally', ally.sheet.get('damage', new Set(['spell'])) > 1);
    const at = { ...z.pos }; s.p.pos.x += 400; step(s.w, 0.1);
    check(root + ': only Wandering Rune follows its caster', root === 'wandering_rune' ? near(z.pos.x, s.p.pos.x) : near(z.pos.x, at.x));
    check(root + ': respec removes its captured circle and recipient sources', reset(s.w, s.inst) && !s.w.zones.some(z => z.inst === s.inst) && near(ally.sheet.get('damage', new Set(['spell'])), baseline));
  }
  {
    const w = makeSimWorld('runeweaver', 98), p = w.player, a = body(w, 120);
    const inv = p.skills.find(s => s?.def.invokes)!, warp = p.skills.find(s => s?.def.id === 'warp')!, rune = p.skills.find(s => s?.def.id === 'rune_of_power')!;
    let releases = 0, fuelCasts = 0;
    for (let tick = 0; tick < 60 * 30; tick++) {
      if (!p.casting && p.useLock <= 0) {
        if (p.runes.length && w.useSkill(p, inv, a.pos, true)) releases++;
        else if (!p.runes.length && w.useSkill(p, warp, p.pos, true)) fuelCasts++;
        else if (!p.runes.length && w.useSkill(p, rune, p.pos, true)) fuelCasts++;
      }
      w.update(1 / 60);
    }
    check('level-one 30-second rotation sustains at least eight damaging releases without outside skills or resource refills', releases >= 8 && fuelCasts >= releases && a.life < a.maxLife() && p.mana >= 0);
    console.log('ROTATION', JSON.stringify({ releases, fuelCasts, mana: p.mana, damage: a.maxLife() - a.life, seconds: 30 }));
  }
} finally { restore(); }
console.log(`Runeweaver starting trees: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
