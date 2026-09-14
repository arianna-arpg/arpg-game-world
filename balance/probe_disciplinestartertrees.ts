import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { applyGuardSurge, guardSurgePreview } from '../src/engine/guardSurge';
import { previewSkill } from '../src/engine/skillPreview';
import { CLASSES } from '../src/data/classes';
import { DISCIPLINE_STARTER_TREES } from '../src/data/disciplineStarterTrees';
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
  const klass = CLASSES.find(c => ['ascetic', 'flagellant', 'firebrand'].includes(c.id) && c.bar.includes(id))!;
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
  if (inst.def.castMode === 'charge') { step(w, 3); const held = w.player.casting; if (held) held.held = false; step(w, 0.05); }
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
  check('Ascetic, Flagellant and Firebrand have complete starting trees', CLASSES.filter(c => ['ascetic', 'flagellant', 'firebrand'].includes(c.id)).every(c => c.bar.filter(Boolean).every(id => !!DISCIPLINE_STARTER_TREES[id!])));
  for (const [id, tree] of Object.entries(DISCIPLINE_STARTER_TREES)) {
    const nodes = tree.nodes!, roots = nodes.filter(n => n.excludes?.length), neutral = nodes.find(n => !n.links?.length && !n.excludes?.length)!;
    const plain = setup(id), passive = setup(id, Array(4).fill(neutral.id)), m = neutral.mods?.[0];
    const base = SKILLS[id], bare = makeSkillInstance({ ...base, tree: undefined }, 20, 3);
    check(id + ': unallocated cost, damage and effects equal a tree-less definition', canonical(plain.p.skillCost(plain.inst)) === canonical(plain.p.skillCost(bare)) && canonical(instanceMods(plain.inst)) === canonical(instanceMods(bare)) && instanceEffects(plain.inst) === base.effects);
    check(id + ': four neutral ranks preserve original effects, tags, delivery and channel', passive.inst.treeNodes?.length === 4 && (id === 'ashen_vow' || instanceDelivery(passive.inst) === base.delivery) && instanceEffects(passive.inst) === base.effects && instanceChannel(passive.inst) === base.channel && canonical(instanceBaseTags(passive.inst)) === canonical(base.tags));
    if (m) check(id + ': neutral investment strengthens its intended stat', passive.p.sheet.get(m.stat, skillContextTags(passive.inst), instanceMods(passive.inst), m.stat === 'overdriveLifeFactor' ? 0.75 : undefined) > plain.p.sheet.get(m.stat, skillContextTags(plain.inst), instanceMods(plain.inst), m.stat === 'overdriveLifeFactor' ? 0.75 : undefined));
    else { cast(plain.w, plain.inst); cast(passive.w, passive.inst); check(id + ': four aura ranks grant twelve thorns without duplication', near(passive.p.sheet.get('thorns') - plain.p.sheet.get('thorns'), 12)); }
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
      const a = body(s.w, 40); const used = cast(s.w, s.inst, a.pos); step(s.w, 0.05);
      const worked = ['wellspring_stance', 'ashen_vow', 'blood_mortgage'].includes(id) ? s.p.activeAuras.has(id)
        : id === 'transgression' ? s.p.absorb > 0 && s.p.mana < s.p.maxMana()
        : id === 'incite' ? s.w.actors.length > 1 && used
        : a.life < a.maxLife();
      check(id + '/' + leaf.id + ': real cast performs its native role with the invested route', used && worked && s.inst.treeNodes?.length === 3);
      const saved = rebuildSkill(serializeCharacter(s.w).knownSkills.find(k => k.skillId === id)!)!;
      check(id + '/' + leaf.id + ': save rebuild preserves picks and resolved behavior', saved.treeNodes?.join() === s.inst.treeNodes?.join() && canonical(instanceEffects(saved)) === canonical(instanceEffects(s.inst)) && canonical(instanceDelivery(saved)) === canonical(instanceDelivery(s.inst)) && canonical(instanceChannel(saved)) === canonical(instanceChannel(s.inst)) && canonical(instanceCastCycle(saved)) === canonical(instanceCastCycle(s.inst)));
      const other = setup(id); applySeatMeta(other.w, other.w.localSeat, serializeSeatMeta(s.w.localSeat));
      const wired = other.w.meta.knownSkills.get(id)!;
      check(id + '/' + leaf.id + ': network rebuild restores modifiers, grafts and effects', canonical(instanceMods(wired)) === canonical(instanceMods(saved)) && canonical(instanceEffects(wired)) === canonical(instanceEffects(s.inst)) && canonical(instanceCastCycle(wired)) === canonical(instanceCastCycle(s.inst)) && canonical(instanceDelivery(wired)) === canonical(instanceDelivery(s.inst)));
      check(id + '/' + leaf.id + ': save and network rebuild preserve spender contracts', canonical(instanceChargeCost(saved)) === canonical(instanceChargeCost(s.inst)) && canonical(instanceChargeCost(wired)) === canonical(instanceChargeCost(s.inst)));
    }
  }
  check('all 72 terminal routes exercised', routes === 72);
  for (const [id, tree] of Object.entries(DISCIPLINE_STARTER_TREES)) check(id + ': all self and recipient aura patches validate', tree.nodes!.every(n => !treeAuraOverrideErrors(SKILLS[id], n).length));
  {
    const w = makeSimWorld('flagellant', 13), p = w.player, inst = p.skills.find(s => s?.def.id === 'transgression')!;
    const mana = p.mana, plan = guardSurgePreview(p, inst, { type: 'guardSurge', manaFraction: 0.5, ratio: 1.4, unguarded: { duration: 3, capLife: 0.3 } });
    check('live preview exposes the paid ward before the first cast', previewSkill(p, inst).rows.some(r => r.key === 'guardSurge_protection' && r.value.startsWith(String(Math.round(plan.amount)))));
    check('fresh Flagellant can cast Transgression without an external guard', w.useSkill(p, inst, p.pos, true) && near(p.mana, mana / 2) && p.absorb > 0);
    check('standalone Transgression respects its life-based cap and duration', near(p.absorb, p.maxLife() * 0.3) && near(p.absorbTimer, 3));
    const bank = p.mana; check('cooldown refusal neither pays nor refreshes the ward', !w.useSkill(p, inst, p.pos, true) && near(p.mana, bank));
    step(w, 3.2); check('paid standalone ward expires on its ordinary timer', p.absorb === 0);
    p.mana = 0; check('zero-mana surge cannot create a ward', !applyGuardSurge(p, inst, { type: 'guardSurge', manaFraction: 0.5, ratio: 1.4, unguarded: { duration: 3, capLife: 0.3 } }) && p.absorb === 0);
  }
  {
    const s = setup('transgression', ['lasting_absolution', 'deep_absolution']);
    const shield = makeSkillInstance(SKILLS.shield_up, 1); s.p.skills[1] = shield;
    cast(s.w, shield); const guard = s.p.casting!, before = guard.shield!, mana = s.p.mana;
    check('Transgression is usable during an existing held guard', s.w.useSkill(s.p, s.inst, s.p.pos, true));
    check('guard overfill pays exactly half remaining mana and inherits protection power', s.p.casting === guard && near(s.p.mana, mana / 2) && near(guard.shield! - before, mana * 0.5 * 1.4 * 1.8) && guard.maxShield === guard.shield && s.p.absorb === 0);
    const plain = setup('transgression'), invested = setup('transgression', ['lasting_absolution']); cast(plain.w, plain.inst); cast(invested.w, invested.inst);
    check('ward investment increases both capped protection and its duration', invested.p.absorb > plain.p.absorb && invested.p.absorbTimer > plain.p.absorbTimer);
    const stronger = invested.p.absorb + 100; invested.p.absorb = stronger; invested.p.absorbTimer = 20; cast(invested.w, invested.inst);
    check('a weaker surge does not add to or shorten existing absorb', invested.p.absorb === stronger && invested.p.absorbTimer === 20);
  }
  for (const [id, root] of [['wellspring_stance', 'iron_stillness'], ['ashen_vow', 'barbed_vow'], ['blood_mortgage', 'secured_mortgage']]) {
    const s = setup(id, [root]), ally = body(s.w, 2, 'player'), before = { armor: ally.sheet.get('armor'), thorns: ally.sheet.get('thorns'), poise: ally.sheet.get('poise') };
    const baseline = { armor: s.p.sheet.get('armor'), thorns: s.p.sheet.get('thorns'), poise: s.p.sheet.get('poise') };
    cast(s.w, s.inst); step(s.w, 0.2);
    check(id + ': active self-only investment reaches its bearer', id === 'wellspring_stance' ? s.p.sheet.get('poise') > baseline.poise && near(s.p.sheet.get('damageTaken'), 0.88) : id === 'ashen_vow' ? s.p.sheet.get('thorns') === baseline.thorns + 12 : s.p.sheet.get('armor') > baseline.armor);
    check(id + ': self-only modifiers do not leak even to an adjacent ally', ally.sheet.get('armor') === before.armor && ally.sheet.get('thorns') === before.thorns && ally.sheet.get('poise') === before.poise);
    const value = s.p.sheet.get(id === 'ashen_vow' ? 'thorns' : 'armor'); step(s.w, 0.5);
    check(id + ': ticking never duplicates the self source', s.p.sheet.get(id === 'ashen_vow' ? 'thorns' : 'armor') === value);
    check(id + ': respec retires the exact active aura and its captured self modifiers', reset(s.w, s.inst) && !s.p.activeAuras.has(id) && s.p.sheet.get('armor') === baseline.armor && s.p.sheet.get('thorns') === baseline.thorns && s.p.sheet.get('poise') === baseline.poise);
  }
  {
    const plain = setup('wellspring_stance'), fast = setup('wellspring_stance', ['rising_spring']);
    for (const s of [plain, fast]) { cast(s.w, s.inst); s.p.poise = 0; s.p.mana = s.p.maxMana(); step(s.w, 0.05); }
    check('Rising Spring changes the actual mana-to-poise exchange', fast.p.poise > plain.p.poise);
    fast.p.poise = 0; fast.p.mana = fast.p.maxMana() * 0.35; const floor = fast.p.mana; step(fast.w, 0.1);
    check('Rising Spring retains the native mana safety floor', fast.p.mana >= floor - 0.00001);
    const s = setup('ashen_vow', ['fervent_vow', 'guarded_fervor']); cast(s.w, s.inst);
    s.p.life = s.p.maxLife(); step(s.w, 0.01); const healthy = s.p.sheet.get('damageTaken'); s.p.life = s.p.maxLife() * s.p.lowLifeLine() * 0.5; step(s.w, 0.01);
    check('low-life vow additions respect the native conditional boundary', s.p.sheet.get('damageTaken') < healthy);
  }
  {
    const plain = setup('blood_mortgage'), paid = setup('blood_mortgage', ['secured_mortgage', 'swift_repayment']);
    for (const s of [plain, paid]) { s.p.sheet.removeSource('rig'); s.p.sheet.setSource('regen', [mod('lifeRegen', 'flat', 5)]); cast(s.w, s.inst); const od = s.p.overdrive.life!; od.debt = 20; od.idle = 0; s.p.reservedLife = 20; step(s.w, 0.5); }
    check('blood-debt investments repay actual reserved life faster', paid.p.overdrive.life!.debt < plain.p.overdrive.life!.debt && paid.p.reservedLife < plain.p.reservedLife);
    paid.p.casting = null; paid.p.useLock = 0; paid.p.cooldowns.clear();
    check('native debt lock still refuses ordinary toggle-off while debt remains', !paid.w.useSkill(paid.p, paid.inst, paid.p.pos, true) && paid.p.activeAuras.has('blood_mortgage'));
    check('tree reset settles captured debt through native cleanup', reset(paid.w, paid.inst) && !paid.p.overdrive.life && paid.p.reservedLife === 0);
  }
  {
    const s = setup('mantra_strike', ['flowing_palm']); const a = body(s.w, 35);
    for (let i = 0; i < 7; i++) cast(s.w, s.inst, a.pos);
    check('Mantra retains six completed-use stacks and its native peel law', s.inst.state?.stackN === 6); step(s.w, 2.7);
    check('Mantra stacks decay after practice rests', (s.inst.state?.stackN ?? 0) < 6);
    const totals = [undefined, 'short_breath', 'deep_breath'].map(root => { const r = setup('long_exhale', root ? [root] : []); r.w.useSkill(r.p, r.inst, r.p.pos, true); return r.p.casting!.total; });
    check('Short and Deep Breath really change the held charge time', near(totals[1], totals[0] * 0.6) && near(totals[2], totals[0] * 1.25));
    const charge = setup('long_exhale', ['deep_breath']); charge.w.useSkill(charge.p, charge.inst, charge.p.pos, true);
    check('respec cancels the old held breath without releasing it', reset(charge.w, charge.inst) && charge.p.casting === null);
  }
  {
    const s = setup('incite', ['certain_riot']); const a = body(s.w, 60); a.sheet.setSource('resistance', [mod('ailmentResist', 'override', 0)]); cast(s.w, s.inst, a.pos);
    check('Certain Riot produces native Maddened control on a real target', a.statuses.some(st => st.id === 'maddened'));
    const peal = setup('trumpet_peal', ['rallying_peal', 'gathering_peal', 'guarded_peal']); const ally = body(peal.w, 50, 'player', true), far = body(peal.w, 1500, 'player'); const enemy = body(peal.w, 70);
    cast(peal.w, peal.inst, enemy.pos);
    check('Rallying Peal both hits enemies and blesses the nearby court', enemy.life < enemy.maxLife() && ally.buffs.has('rallying_peal') && peal.p.buffs.has('rallying_peal') && !far.buffs.has('rallying_peal'));
    check('rally adds the advertised damage reduction to its recipient', near(ally.sheet.get('damageTaken'), 0.9));
    check('respec removes owner-recorded allied rally blessings', reset(peal.w, peal.inst) && !ally.buffs.has('rallying_peal') && !peal.p.buffs.has('rallying_peal'));
    const control = setup('trumpet_peal', ['deafening_peal']), victim = body(control.w, 60); victim.sheet.setSource('resistance', [mod('ailmentResist', 'override', 0)]); cast(control.w, control.inst, victim.pos);
    check('Deafening Peal applies the actual native Bewilder status', victim.statuses.some(st => st.id === 'bewilder'));
    const wail = (nodes: string[], statuses: string[]) => {
      const r = setup('harrowing_wail', nodes), a = body(r.w, 40);
      r.inst.def = { ...r.inst.def, baseDamage: { physical: [10, 10] } };
      for (const id of statuses) a.applyStatus(id, 0, 1, 'rig');
      cast(r.w, r.inst, a.pos); return a.maxLife() - a.life;
    };
    for (const statuses of [[], ['harrowing'], ['horrified'], ['harrowing', 'horrified']]) {
      check('Dread Sentence multiplies the actual hit once per live fear status: ' + statuses.join(), near(wail(['dread_sentence'], statuses) / wail([], statuses), 1.3 ** statuses.length));
    }
  }
  for (const [id, parent, leaf] of [
    ['mantra_strike', ['flowing_palm', 'long_palm'], 'mending_palm'],
    ['mantra_strike', ['anchored_palm', 'heavy_palm'], 'hungry_palm'],
    ['long_exhale', ['short_breath', 'ready_breath'], 'hungry_breath'],
    ['harrowing_wail', ['dread_sentence', 'carried_dread'], 'hungry_dread'],
  ] as const) {
    const gain = (nodes: string[]) => { const s = setup(id, nodes), a = body(s.w); s.p.life = s.p.maxLife() / 2; const before = s.p.life; cast(s.w, s.inst, a.pos); step(s.w, 0.5); return s.p.life - before; };
    check(leaf + ': landed damage delivers actual extra life recovery', gain([...parent, leaf]) > gain([...parent]));
  }
  {
    const s = setup('transgression', ['defiant_absolution']), a = body(s.w);
    cast(s.w, s.inst); check('Defiant Absolution creates a real next-attack preparation', s.p.buffs.has('defiant_absolution'));
    s.w.executeSkill(s.p, makeSkillInstance(SKILLS.frost_nova), a.pos); check('a spell does not spend the attack preparation', s.p.buffs.has('defiant_absolution'));
    s.w.executeSkill(s.p, makeSkillInstance(SKILLS.improvised_strike), a.pos); check('the starting empty-slot attack can spend the preparation', !s.p.buffs.has('defiant_absolution'));
  }
} finally { restore(); }
console.log(`Discipline starting trees: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
