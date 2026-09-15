import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { makeSkillInstance, instanceThrongSources, instanceMods, skillContextTags, type SkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { applyHit, applyDot } from '../src/engine/damage';
import { updateAI, issueCommand } from '../src/engine/ai';
import { serializeCharacter } from '../src/meta/character';
import { serializeSnapshot } from '../src/net/snapshot';
import { throngTravelProtected, throngClusterPlies } from '../src/engine/throngEvolution';
import type { World } from '../src/engine/world';

bootSimEngine();
seedGlobalRandom(0x91a7);
let failed = 0;
function check(label: string, ok: boolean, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label} ${detail}`);
  if (!ok) failed++;
}
const close = (a: number, b: number) => Math.abs(a - b) < 0.00001;
function setup(nodes: string[] = []) {
  const w = makeSimWorld('hivecaller', 0x91a7), p = w.player;
  p.pos = { x: 650, y: 600 };
  p.sheet.setSource('rig', [mod('mana', 'flat', 100000), mod('life', 'flat', 100000)]);
  p.fillResources();
  const inst = makeSkillInstance(SKILLS.raise_gnatveil, 1, 3);
  inst.treeNodes = nodes;
  inst.state = { throngMoteAt: 99999 };
  p.skills = [inst];
  w.meta.knownSkills.set(inst.def.id, inst);
  return { w, p, inst };
}
function step(w: World, sec: number, minds = false) {
  for (let i = 0; i < Math.round(sec * 60); i++) {
    if (minds) for (const a of [...w.actors]) if (a.owner) updateAI(a, w, 1 / 60);
    w.update(1 / 60);
  }
}
function foe(w: World, x = 760, y = 600) {
  const a = w.createMonster('zombie', 1, 'enemy');
  a.pos = { x, y };
  a.sheet.setSource('target', [mod('life', 'override', 100000), mod('armor', 'override', 0),
    mod('evasion', 'override', 0), mod('blockChance', 'override', 0), mod('areaAvoidance', 'override', 0),
    mod('poise', 'override', 0), mod('lifeRegen', 'override', 0)]);
  a.fillResources();
  w.actors.push(a);
  return a;
}
function gain(w: World, inst: SkillInstance, count: number) { return w['throngGain'](w.player, inst, count); }
function conduct(w: World, inst: SkillInstance, aim = { x: 770, y: 600 }) {
  w.player.useLock = 0;
  w.player.casting = null;
  check('conduct starts', w.useSkill(w.player, inst, aim, true));
}

{
  const { w, p, inst } = setup(['patient_condensation']);
  step(w, 4.1);
  check('Patient Condensation spawns a real attached Gnat on its own clock', w.throngRosterCount(p, inst) === 1 && w.throngBodiesOf(p, inst.def.id)[0].throngCarried === true);
  check('native trunk consumes no graft slot', instanceThrongSources(inst).length === 0);
  const attached = w.throngBodiesOf(p, inst.def.id)[0];
  issueCommand(attached, { kind: 'assault', pos: { x: 800, y: 600 }, until: w.time + 5, radius: 100, issuerId: p.id });
  check('ordinary command orders can release attached Gnats', !attached.throngCarried && !!attached.aiCommand);
  inst.sockets[0] = { def: SUPPORTS.patient_brood, level: 1 };
  step(w, 7.6);
  check('Patient Brood and native clock both produce Gnats', w.throngRosterCount(p, inst) >= 3 && instanceThrongSources(inst).length === 1);
  inst.treeNodes = ['patient_condensation', 'room_in_the_air', 'billowing_veil'];
  step(w, 0.1);
  check('capacity nodes give 42 normal Gnats and instant floor of eight', w.throngCapOf(p, inst) === 42 && w.throngRosterCount(p, inst) >= 8);
  const victim = w.throngBodiesOf(p, inst.def.id)[0];
  w.kill(victim);
  check('a death immediately refills Unbroken Veil', w.throngRosterCount(p, inst) >= 8);
  const before = w.throngRosterCount(p, inst);
  step(w, 2.6);
  check('Room in the Air quickens actual accumulation', w.throngRosterCount(p, inst) > before);
  inst.treeNodes = [];
  inst.sockets = [];
  step(w, 0.1);
  const resetCount = w.throngRosterCount(p, inst);
  step(w, 8.1);
  check('respec stops the native clock', w.throngRosterCount(p, inst) === resetCount);
}
{
  const { w, p, inst } = setup(['patient_condensation', 'room_in_the_air', 'heavy_motes']);
  gain(w, inst, 200);
  step(w, 0.1);
  check('overflow recruitment has a hard safety cap', gain(w, inst, 20).length === 0 && w.throngRosterCount(p, inst) === 200);
  const bodies = w.throngBodiesOf(p, inst.def.id), stable = bodies[0], excess = bodies.at(-1)!;
  check('only units beyond normal cap deteriorate', bodies.filter(b => b.decay).length === 166 && !stable.decay && !!excess.decay);
  const life = excess.life;
  step(w, 7);
  check('decay bypasses plies and drains actual life', excess.life < life && excess.plies === excess.pliesMax, JSON.stringify({life,now:excess.life,decay:excess.decay,regen:excess.sheet.get('lifeRegen'),pct:excess.sheet.get('lifeRegenPct'),plies:excess.plies,max:excess.pliesMax}));
  p.sheet.setSource('regen', [mod('minionRegen', 'flat', 80)]);
  w.bakeMinionOwnerStats(excess, p, inst, 1 / 8);
  const wounded = excess.life;
  step(w, 0.5);
  check('ordinary minion regeneration offsets overflow decay', excess.life > wounded, `${wounded} => ${excess.life}`);
  inst.treeNodes = ['patient_condensation', 'room_in_the_air'];
  step(w, 0.1);
  check('removing Borrowed Wings stops its decay without deleting the army', !excess.decay && !excess.dead);
}
{
  const { w, p, inst } = setup(['patient_condensation', 'layered_wings', 'quiet_flutter']);
  const initial = gain(w, inst, 16);
  initial[0].life /= 2; initial[0].plies = 0;
  step(w, 0.1);
  const cluster = w.throngBodiesOf(p, inst.def.id)[0];
  check('Swarm Incarnate becomes one actor while preserving sixteen Gnats', w.throngBodiesOf(p, inst.def.id).length === 1 && w.throngRosterCount(p, inst) === 16);
  check('cluster size, life and damage grow with its cargo', cluster.radius > 15 && cluster.maxLife() >= 80 && cluster.sheet.get('damage') >= 16);
  check('plies grow at square-number milestones; merging preserves damage', throngClusterPlies(16) === 3 && cluster.pliesMax === 4 && cluster.plies === 3 && cluster.life < cluster.maxLife());
  cluster.plies = 0;
  step(w, 2.1);
  check('repeated owner rebakes never refill spent cluster plies', cluster.plies === 0);
  const save = serializeCharacter(w);
  check('save counts constituent Gnats, not the single cluster actor', save.throng?.find(r => r.skillId === inst.def.id)?.count === 16);
  const snapshot = serializeSnapshot(w, 1);
  check('co-op snapshot carries the full clustered roster badge', snapshot.actors.find(a => a.id === p.id)?.thr?.[inst.def.id] === 16
    && snapshot.actors.find(a => a.id === cluster.id)?.thu === 16);
  const resumed = setup(['patient_condensation', 'layered_wings', 'quiet_flutter']);
  resumed.w.restoreThrong(save.throng ?? [], resumed.p);
  step(resumed.w, 0.1);
  check('restoring a clustered save keeps all constituent Gnats', resumed.w.throngRosterCount(resumed.p, resumed.inst) === 16 && resumed.w.throngBodiesOf(resumed.p, resumed.inst.def.id).length === 1);
  resumed.p.skills = [];
  step(resumed.w, 0.3);
  check('direct cluster disband releases every constituent', resumed.w.actors.filter(a => !a.dead && a.throngWild === 'gnatling').length === 16);
  inst.treeNodes = ['patient_condensation', 'layered_wings'];
  step(w, 0.1);
  const split = w.throngBodiesOf(p, inst.def.id);
  check('respec splits the cluster with no free health or plies', split.length === 16 && split.every(b => b.plies === 0 && b.life < b.maxLife()));
  p.skills = [];
  step(w, 0.3);
  check('unequipping disbands the complete roster', w.throngRosterCount(p, inst) === 0 && w.actors.filter(a => !a.dead && a.throngWild === 'gnatling').length === 16);
}
{
  const plain = setup(['patient_condensation']), invested = setup(['patient_condensation', 'layered_wings']);
  for (const s of [plain, invested]) s.p.sheet.setSource('life investment', [mod('minionLife', 'increased', 1)]);
  const a = gain(plain.w, plain.inst, 1)[0], b = gain(invested.w, invested.inst, 1)[0];
  check('Scouring Wings improves actual minion life scaling', close(a.maxLife(), 5.625) && close(b.maxLife(), 7.5));
}
{
  const { w, inst } = setup(['patient_condensation', 'layered_wings']);
  const b = gain(w, inst, 1)[0], target = foe(w);
  conduct(w, inst, { x: 900, y: 600 });
  step(w, 0.27);
  b.pos = { x: target.pos.x - 60, y: target.pos.y };
  b.throngContactPos = { ...b.pos };
  const before = target.life;
  b.pos = { x: target.pos.x + 60, y: target.pos.y };
  w['updateThrongEvolution'](1 / 60);
  check('Scouring Wings damages a crossed enemy between frame endpoints', target.life < before);
  const after = target.life;
  b.pos = { x: target.pos.x - 60, y: target.pos.y };
  w['updateThrongEvolution'](1 / 60);
  check('crossing the same enemy again respects the contact cooldown', target.life === after);
  target.tier = 1;
  w['throngEvolutionBurst'](b, target.pos, 100, 10);
  check('Gnat bursts do not damage enemies on another floor', target.life === after);
}
{
  const { w, p, inst } = setup(['battle_hatching']);
  const target = foe(w);
  inst.sockets[0] = { def: SUPPORTS.hidden_reserves, level: 1 };
  for (let i = 0; i < 34; i++) w['throngOnHit'](p, target, false, false);
  check('native hit bar gives half the missing roster as attached Gnats', w.throngRosterCount(p, inst) === 12 && w.throngBodiesOf(p, inst.def.id).every(b => b.throngCarried));
  check('Hidden Reserves has an independent working gauge', inst.state!.throngEvolutionGauge === 2 && w.actors.some(a => !a.dead && a.throngWild === 'gnatling'));
  check('co-op snapshot carries the native hatch bar', serializeSnapshot(w, 1).actors.find(a => a.id === p.id)?.thg?.[inst.def.id] === 2);
  gain(w, inst, 11);
  for (let i = 0; i < 34; i++) w['throngOnHit'](p, target, false, false);
  check('half-missing rounds up to fill the final slot', w.throngRosterCount(p, inst) === 24);
  inst.treeNodes = ['battle_hatching', 'rich_hatch'];
  w.kill(w.throngBodiesOf(p, inst.def.id)[0], true);
  const egg = w['mintThrongFind'](p, inst, { x: 1000, y: 1000 })!;
  check('Volatile Clutch produces a batch egg near the enemy', egg.throngEgg === 4 && Math.hypot(egg.pos.x - target.pos.x, egg.pos.y - target.pos.y) < 100);
  const life = target.life;
  w['claimThrongHusk'](p, inst, egg);
  check('collecting an egg bursts, respects cap and consumes the egg', egg.dead && w.throngRosterCount(p, inst) === 24 && target.life < life);
}
{
  const { w, p, inst } = setup(['battle_hatching', 'rich_hatch', 'burst_hatch']);
  const b = gain(w, inst, 1)[0], enemy = foe(w);
  const packet = { amounts: { physical: 100 }, crit: false, tags: new Set<'physical'>(['physical']), sourceName: 'probe' };
  check('unattached Gnats are untargeted and immune to hits and DoTs', !w.hostileTo(enemy, b) && applyHit(enemy, b, packet).immune && applyDot(b, 10, 'chaos') === 0);
  b.throngCarried = false;
  b.pos = { x: enemy.pos.x - 12, y: enemy.pos.y };
  b.aiTargetId = enemy.id;
  w['updateClings']();
  check('protected travel still reaches a genuine enemy latch', !!b.clingTo && !throngTravelProtected(b) && w.hostileTo(enemy, b));
  check('latched Gnats can be damaged normally', !applyHit(enemy, b, packet).immune);
  const life = enemy.life;
  step(w, 1.1, true);
  check('the latched Gnat actually bites its target', enemy.life < life);
  const beforeRavenous = b.sheet.get('damage');
  inst.treeNodes = ['battle_hatching', 'rich_hatch', 'ravenous_motes'];
  w.bakeMinionOwnerStats(b, p, inst, 1 / 8);
  check('Ravenous Motes gives a full 60% MORE multiplier', close(b.sheet.get('damage'), beforeRavenous * 1.6), String(b.sheet.get('damage')));
}
{
  const { w, p, inst } = setup(['patient_condensation', 'layered_wings', 'double_membrane']);
  const bodies = gain(w, inst, 24), target = foe(w);
  const life = target.life;
  conduct(w, inst, target.pos);
  step(w, 0.27);
  check('a full veil commits all existing Gnats to a dive', bodies.every(b => !!b.throngDive));
  step(w, 0.5);
  check('diving Gnats explode at their target and die', bodies.every(b => b.dead) && target.life < life);
  check('a spent volley does not magically refill the normal cap', w.throngRosterCount(p, inst) === 0);
}
{
  const { w, p, inst } = setup(['battle_hatching', 'walking_conductor', 'tireless_conductor', 'frenzied_wings']);
  const bodies = gain(w, inst, 8), target = foe(w, 730, 600);
  const life = target.life, dmg = bodies[0].sheet.get('damage'), speed = bodies[0].sheet.get('moveSpeed');
  conduct(w, inst, { x: 1200, y: 900 });
  step(w, 1.4, true);
  check('Cyclone of Wings deals real orbit contact damage around the caster', target.life < life && bodies.every(b => Math.hypot(b.pos.x - p.pos.x, b.pos.y - p.pos.y) < 130));
  check('Frenzied Conductor fury applies in full to the whirlwind', close(bodies[0].sheet.get('damage'), dmg * 1.25) && close(bodies[0].sheet.get('moveSpeed'), speed * 2));
  check('whirlwind hits feed the native hatch bar', (inst.state?.throngEvolutionGauge ?? 0) > 0 || w.throngRosterCount(p, inst) > 8);
  check('Splintering Bites adds a real ply', bodies.every(b => b.pliesMax === 2));
  p.casting = null;
  step(w, 0.1);
  check('releasing conduct removes fury and forced orbit immediately', close(bodies[0].sheet.get('damage'), dmg) && !bodies[0].throngDriven);
  const adjacent = foe(w, target.pos.x + 15, target.pos.y), before = adjacent.life;
  bodies[0].sheet.setSource('aim', [mod('accuracy', 'flat', 1000000)]);
  for (let i = 0; i < 3; i++) w['resolveHit'](bodies[0], bodies[0].skills[0]!, target);
  check('ordinary bites splash adjacent enemies', adjacent.life < before);
}
{
  const { w, p, inst } = setup(['patient_condensation']);
  const b = gain(w, inst, 1)[0], target = foe(w);
  target.sheet.setSource('plate', [mod('armor', 'override', 1000000)]);
  const hit = applyHit(b, target, { amounts: { physical: 4 }, crit: false, tags: new Set(['physical']), sourceName: 'gnat' });
  check('heavy armor leaves one point of a baseline Gnat hit', close(hit.total, 1));
  target.plySpec = { count: 2 }; target.pliesMax = 2; target.plies = 2;
  applyHit(b, target, { amounts: { physical: 4 }, crit: false, tags: new Set(['physical']), sourceName: 'gnat' });
  check('the baseline hit can strip protective plies through armor', target.plies === 1);
  target.plies = 0;
  const life = target.life;
  w['litePooledHit'](target, { physical: 4 }, p);
  check('pooled owned Gnats use the same armor floor', close(life - target.life, 1));
}
for (const ranks of [1, 4]) {
  const { w, p, inst } = setup(['battle_hatching', 'rich_hatch', ...Array(ranks).fill('veil_tending')]);
  inst.state!.throngMoteAt = 0; step(w, 0.1);
  const eggs = w.actors.filter(a => !a.dead && a.throngEgg);
  check(`Veil Tending rank ${ranks} applies 50% find yield per point`, close(p.sheet.get('throngYield', skillContextTags(inst), instanceMods(inst)), 1 + 0.5 * ranks));
  check(`Veil Tending rank ${ranks} grows a real mote event into more eggs`, eggs.reduce((n, a) => n + a.throngEgg!, 0) === 4 * Math.round(1 + 0.5 * ranks));
}
console.log(`Gnatveil: ${failed} failures`);
if (failed) process.exitCode = 1;
