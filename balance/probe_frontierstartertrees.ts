import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { CLASSES } from '../src/data/classes';
import { FRONTIER_STARTER_TREES } from '../src/data/frontierStarterTrees';
import { makeSkillInstance, instanceDelivery, instanceBaseTags, instanceEffects, instanceThrongSources, instanceMods, skillContextTags, treeNodeRefusal, type SkillInstance } from '../src/engine/skills';
import { mod, STAT_DEFS } from '../src/engine/stats';
import { updateAI } from '../src/engine/ai';
import { skillAbsorbAmount } from '../src/engine/absorb';
import { previewSkill } from '../src/engine/skillPreview';
import { serializeCharacter, rebuildSkill } from '../src/meta/character';
import { serializeSeatMeta, applySeatMeta } from '../src/net/snapshot';
import type { World } from '../src/engine/world';
let failed = 0;
const check = (name: string, ok: boolean) => { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) failed++; };
const near = (a: number, b: number) => Math.abs(a - b) < 0.00001;
function setup(id: string, nodes: string[] = []) {
  const klass = CLASSES.find(c => c.bar.includes(id))!;
  const w = makeSimWorld(klass.id, 0xbee22), p = w.player;
  for (const attr of Object.keys(w.meta.baseAttrs) as (keyof typeof w.meta.baseAttrs)[]) w.meta.baseAttrs[attr] = 100;
  w.recalcPlayer(); const inst = makeSkillInstance(SKILLS[id], 20, 3);
  w.meta.knownSkills.set(id, inst); p.skills.fill(null); p.skills[0] = inst;
  for (const n of nodes) w.pickTreeNode(id, n);
  p.sheet.setSource('rig', [mod('mana', 'flat', 10000), mod('accuracy', 'flat', 100000), mod('lifeRegen', 'override', 0)]);
  p.fillResources(); return { w, p, inst };
}
function step(w: World, seconds: number, minds = false) { for (let i = 0; i < Math.ceil(seconds * 60); i++) { if (minds) for (const a of [...w.actors]) if (a.owner) updateAI(a, w, 1 / 60); w.update(1 / 60); } }
function cast(w: World, inst: SkillInstance, aim = { x: w.player.pos.x + 90, y: w.player.pos.y }) {
  const p = w.player; p.casting = null; p.useLock = 0; p.cooldowns.clear();
  const ok = w.useSkill(p, inst, aim, true);
  for (let i = 0; i < 150 && p.casting && !inst.def.channel; i++) step(w, 1 / 60);
  return ok;
}
function body(w: World, x = 90, team: 'player' | 'enemy' = 'enemy', owner = false) {
  const a = w.createMonster(owner ? 'swarmling' : 'zombie', 1, team, owner ? w.player : undefined); if (!owner) a.skills = [];
  a.pos = { x: w.player.pos.x + x, y: w.player.pos.y }; a.tier = w.player.tier;
  a.sheet.setSource('rig', [mod('life', 'flat', 100000), mod('evasion', 'override', 0), mod('blockChance', 'override', 0)]); a.fillResources(); w.actors.push(a); return a;
}
function reset(w: World, inst: SkillInstance) { w.fonts.push({ pos: { ...w.player.pos } }); w.meta.abilityEssences.ability4 = 999; return w.fontResetTree(inst.def.id); }
const restore = seedGlobalRandom(0xbee22);
try {
  check('Hivecaller, Ranger and Guardian have complete opening bars', CLASSES.filter(c => ['hivecaller', 'ranger', 'guardian'].includes(c.id)).every(c => c.bar.filter(Boolean).every(id => !!FRONTIER_STARTER_TREES[id!])));
  for (const [id, tree] of Object.entries(FRONTIER_STARTER_TREES)) {
    const nodes = tree.nodes!, roots = nodes.filter(n => n.excludes?.length), neutral = nodes.find(n => !n.links?.length && !n.excludes?.length)!;
    const plain = setup(id), passive = setup(id, Array(4).fill(neutral.id)), m = neutral.mods![0];
    check(id + ': neutral ranks preserve effects, tags, delivery and source rows', passive.inst.treeNodes?.length === 4 && instanceDelivery(passive.inst) === plain.inst.def.delivery && instanceEffects(passive.inst) === plain.inst.def.effects && instanceBaseTags(passive.inst).join() === instanceBaseTags(plain.inst).join() && !instanceThrongSources(passive.inst).length);
    check(id + ': four neutral ranks increase the intended stat', passive.p.sheet.get(m.stat, new Set([...skillContextTags(passive.inst), ...(m.tags ?? [])]), instanceMods(passive.inst)) > plain.p.sheet.get(m.stat, new Set([...skillContextTags(plain.inst), ...(m.tags ?? [])]), instanceMods(plain.inst)));
    check(id + ': 15 nodes with two exclusive identities and four two-leaf forks', nodes.length === 15 && roots.length === 2 && roots.every(r => nodes.filter(n => n.links?.includes(r.id)).length === 2) && nodes.filter(n => n.links?.length && !nodes.some(other => other.links?.includes(n.id))).length === 8);
    check(id + ': every modifier is finite and registered', nodes.every(n => [...(n.mods ?? []), ...(n.buffs ?? []).flatMap(b => b.mods ?? []), ...(n.over?.summon?.crewMods ?? [])].every(m => !!STAT_DEFS[m.stat] && Number.isFinite(m.value))));
    for (const root of roots) {
      const mids = nodes.filter(n => n.links?.includes(root.id)), s = setup(id, [root.id, ...mids.map(n => n.id), neutral.id]);
      check(id + '/' + root.id + ': both forks and neutral mix, rival locks', s.inst.treeNodes?.length === 4 && !!treeNodeRefusal(s.inst, root.excludes![0]));
    }
    for (const leaf of nodes.filter(n => n.links?.length && !nodes.some(other => other.links?.includes(n.id)))) {
      const mid = nodes.find(n => n.id === leaf.links![0])!, s = setup(id, [mid.links![0], mid.id, leaf.id]);
      if (id === 'raise_gnatveil') s.w.devThrongMint(id, 3);
      const a = body(s.w, id === 'hammer_of_judgment' && mid.links![0] === 'bastion_orbit' ? 55 : 90);
      const ally = id === 'command_assault' ? body(s.w, 30, 'player', true) : body(s.w, 25, 'player');
      const used = cast(s.w, s.inst, a.pos); step(s.w, 0.8, true);
      const worked = id === 'summon_swarmlings' ? s.w.minionsOfSkill(s.p, id).length > 0
        : id === 'raise_gnatveil' ? s.w.throngRosterCount(s.p, s.inst) > 0 && s.p.casting?.mode === 'channel'
        : id === 'command_assault' ? !!ally.aiCommand && ally.buffs.size > 0
        : id === 'quickstep' ? s.p.buffs.has('quickstep')
        : id === 'aegis_ward' ? ally.absorb > 0 && ally.buffs.size > 0
        : id === 'rallying_howl' ? ally.statuses.some(z => z.id === 'rally') && ally.buffs.size > 0
        : a.life < a.maxLife();
      check(id + '/' + leaf.id + ': live route performs its role', used && worked);
      const saved = serializeCharacter(s.w).knownSkills.find(k => k.skillId === id)!;
      check(id + '/' + leaf.id + ': saving preserves route and resolved effects', rebuildSkill(saved)?.treeNodes?.join() === s.inst.treeNodes?.join() && JSON.stringify(instanceEffects(rebuildSkill(saved)!)) === JSON.stringify(instanceEffects(s.inst)));
    }
  }
  {
    const large = setup('summon_swarmlings', ['royal_guard', 'royal_carapace', 'barbed_regents']); cast(large.w, large.inst);
    const royals = large.w.minionsOfSkill(large.p, large.inst.def.id);
    const swarm = setup('summon_swarmlings', ['teeming_contract', 'crowded_cells', 'overflowing_cells']); cast(swarm.w, swarm.inst);
    check('royal brood has two larger, thorned bodies', royals.length === 2 && royals.every(a => a.sheet.get('thorns') >= 20) && royals[0].radius > swarm.w.minionsOfSkill(swarm.p, swarm.inst.def.id)[0].radius);
    check('teeming brood changes actual birth count', swarm.w.minionsOfSkill(swarm.p, swarm.inst.def.id).length === 6);
    large.w.kill(royals[0]); step(large.w, 4.2); check('royal contract reknits its changed body', large.w.minionsOfSkill(large.p, large.inst.def.id).length === 2);
    check('reset removes old contract bodies and their reservations', reset(large.w, large.inst) && large.w.minionsOfSkill(large.p, large.inst.def.id).length === 0);
  }
  {
    const { w, p, inst } = setup('raise_gnatveil', ['patient_condensation', 'room_in_the_air', 'billowing_veil']);
    (inst.state ??= {}).throngMoteAt = 999; step(w, 7.6);
    check('patient branch produces a real claimable or claimed gnat below cap', w.throngRosterCount(p, inst) > 0 || w.actors.some(a => !a.dead && a.throngWild === 'gnatling'));
    check('gnat cap counts both branches of its capacity investment', w.throngCapOf(p, inst) === 40);
    const before = instanceThrongSources(inst).length; reset(w, inst);
    check('reset removes the grafted source but keeps native mote acquisition', before === 1 && instanceThrongSources(inst).length === 0 && inst.def.throng!.sources[0].kind === 'motes');
  }
  {
    const { w, p, inst } = setup('command_assault', ['killing_signal', 'rapid_signals', 'patient_signal']);
    const anchor = makeSkillInstance(SKILLS.raise_gnatveil, 20); p.skills[1] = anchor; w.meta.knownSkills.set(anchor.def.id, anchor); w.devThrongMint(anchor.def.id, 3); step(w, 1);
    const kind = w.liteKindOf('gnatling'); check('command test begins with genuinely pooled gnats', w.lite.countOwned(p.id, kind) === 3);
    const a = body(w, 180); cast(w, inst, a.pos);
    const troops = w.throngBodiesOf(p, anchor.def.id);
    check('ordinary assault promotes and commands the whole pooled roster', troops.length === 3 && w.lite.countOwned(p.id, kind) === 0 && troops.every(m => m.aiCommand?.targetId === a.id));
    check('each promoted minion receives its own preparation', troops.every(m => m.buffs.has('assault_preparation')));
    troops.forEach(m => { m.aiCommand = undefined; m.aiTargetId = undefined; m.casting = null; }); step(w, 1);
    check('a live blessing prevents lossy demotion', troops.every(m => !m.dead && m.buffs.has('assault_preparation')));
    reset(w, inst); step(w, 1); check('reset removes command blessings and permits quiet demotion', !troops.some(m => m.buffs.has('assault_preparation')) && w.lite.countOwned(p.id, kind) === 3);
  }
  {
    const { w, inst } = setup('command_assault', ['sheltered_advance']); const a = body(w, 20, 'player', true), b = body(w, -20, 'player', true); cast(w, inst);
    a.spendBuffs('hurt'); // clearOnHit is a defender hit hook, not a consumeOn event.
    check('sheltered command grants both minions independent blessings', a.buffs.get('assault_shelter')?.def !== b.buffs.get('assault_shelter')?.def && a.buffs.has('assault_shelter'));
    const wire = serializeSeatMeta(w.localSeat), other = setup('command_assault'); applySeatMeta(other.w, other.w.localSeat, wire);
    check('network seat rebuilds added command effects', JSON.stringify(instanceEffects(other.w.meta.knownSkills.get(inst.def.id)!)) === JSON.stringify(instanceEffects(inst)));
  }
  {
    const base = setup('aegis_ward'); cast(base.w, base.inst); check('plain absorb retains its exact original amount', near(base.p.absorb, 45));
    const { w, p, inst } = setup('aegis_ward', ['sustaining_aegis', 'deep_reserve', 'quiet_refuge']); const ally = body(w, 25, 'player');
    ally.sheet.setSource('unrelated', [mod('absorbPower', 'flat', 20)]); cast(w, inst);
    const expected = skillAbsorbAmount(p, inst, 45);
    check('ally absorb uses the granting skill investment, not recipient absorb power', near(p.absorb, expected) && near(ally.absorb, expected) && expected > 45);
    check('absorb preview shares the amount resolver', previewSkill(p, inst).rows.some(r => r.key === 'absorb' && r.value.startsWith(String(Math.round(expected)))));
    cast(w, inst); check('repeated absorbs refresh without adding pools', near(p.absorb, expected));
    check('ally mutation reaches caster and nearby ally without hitting enemies', p.buffs.has('aegis_vigil') && ally.buffs.has('aegis_vigil'));
  }
  {
    const { w, inst } = setup('hammer_of_judgment', ['pilgrim_hammer']); cast(w, inst);
    check('pilgrim hammer actually loses orbit and spiral', w.projectiles.length === 1 && w.projectiles[0].orbit === 0 && w.projectiles[0].spiral === 0);
    const ring = setup('hammer_of_judgment', ['bastion_orbit']); cast(ring.w, ring.inst);
    check('bastion hammers retain orbit without outward growth', ring.w.projectiles.length === 2 && ring.w.projectiles.every(p => p.orbit > 0 && p.spiral === 0));
  }
} finally { restore(); }
if (failed) process.exitCode = 1;
console.log('Frontier starter trees: ' + failed + ' failures');
