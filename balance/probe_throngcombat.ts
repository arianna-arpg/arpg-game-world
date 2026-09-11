// Seeded army encounters: actual AI, casts, collision and damage at 60 Hz.
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { updateAI, issueCommand } from '../src/engine/ai';
import { setSimTap } from '../src/engine/tap';
import { makeSkillInstance } from '../src/engine/skills';
import { SKILLS } from '../src/data/skills';
import { mod } from '../src/engine/stats';
import { applyHit, applyDot } from '../src/engine/damage';
import { SMALL_ARMY_COMBAT, type MinionCombatSpec } from '../src/engine/minionCombat';
import { dist } from '../src/core/math';

bootSimEngine();
const DT = 1 / 60;
let failed = 0;
function check(label: string, ok: boolean, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label} ${detail}`);
  if (!ok) failed++;
}
function step(w: ReturnType<typeof makeSimWorld>, seconds: number) {
  for (let tick = 0; tick < Math.round(seconds / DT); tick++) {
    for (const a of w.actors) updateAI(a, w, DT);
    w.update(DT);
  }
}
const modes: Record<string, MinionCombatSpec> = {
  legacy: {}, threat: { threat: 0.1 }, area: { areaAvoidance: 0.75 },
  handling: { commandSpeed: 1.3 }, combined: SMALL_ARMY_COMBAT,
};
function encounter(seed: number, enemyId: string, anchor: string, mode: string) {
  seedGlobalRandom(seed);
  const w = makeSimWorld('hivecaller', seed), p = w.player;
  p.pos = { x: 650, y: 600 };
  // Keep the observer alive without removing it from enemy target selection.
  p.sheet.setSource('probe:observer', [mod('life', 'flat', 10000)]);
  p.fillResources();
  const inst = makeSkillInstance({ ...SKILLS[anchor], minionCombat: modes[mode] });
  p.skills = [inst];
  if (inst.def.throng) w.restoreThrong([{ skillId: anchor, defId: inst.def.throng.monsterId, level: 1, count: 10 }], p);
  else for (let i = 0; i < 5; i++) w['spawnMinion'](p, inst, { pos: { x: 685, y: 575 + i * 12 } });
  const army = w.actors.filter(a => a.owner === p);
  const foe = w.createMonster(enemyId, 1, 'enemy');
  foe.pos = { x: 940, y: 600 };
  w.actors.push(foe);
  let damage = 0, firstHit = -1, lost = 0, minionTargets = 0, targets = 0;
  setSimTap({
    onHit(a, b, r) { if (a.owner === p && b === foe && r.total > 0) {
      damage += r.total; if (firstHit < 0) firstHit = w.time;
    } },
    onDeath(a) { if (army.includes(a)) lost++; },
  });
  for (let tick = 0; tick < 60 * 12 && !foe.dead; tick++) {
    if (tick % 30 === 0) for (const a of army) if (!a.dead) issueCommand(a, {
      kind: 'assault', pos: { ...foe.pos }, targetId: foe.id,
      until: w.time + 1, radius: 170, issuerId: p.id,
    });
    for (const a of w.actors) updateAI(a, w, DT);
    if (foe.aiTargetId !== undefined) {
      targets++; if (army.some(a => a.id === foe.aiTargetId)) minionTargets++;
    }
    w.update(DT);
  }
  setSimTap(null);
  return { seed, enemyId, anchor, mode, bodies: army.length, damage: +damage.toFixed(1),
    firstHit: +firstHit.toFixed(2), lost, killed: foe.dead,
    minionTargetPct: +(100 * minionTargets / Math.max(1, targets)).toFixed(1) };
}
const results: ReturnType<typeof encounter>[] = [];
for (const anchor of ['summon_swarmlings', 'gather_cinderkin'])
  for (const enemy of ['zombie', 'breach_hollowchill'])
    for (const mode of Object.keys(modes))
      for (const seed of [17, 31, 73]) results.push(encounter(seed, enemy, anchor, mode));
const sum = (rows: typeof results, key: 'lost' | 'firstHit' | 'damage') =>
  rows.reduce((n, r) => n + r[key], 0);
for (const anchor of ['summon_swarmlings', 'gather_cinderkin'])
  for (const enemy of ['zombie', 'breach_hollowchill'])
    for (const mode of Object.keys(modes)) {
      const rows = results.filter(r => r.anchor === anchor && r.enemyId === enemy && r.mode === mode);
      console.log(JSON.stringify({ anchor, enemy, mode, runs: rows.length,
        wins: rows.filter(r => r.killed).length, losses: sum(rows, 'lost'),
        meanFirstHit: +(sum(rows, 'firstHit') / rows.length).toFixed(2),
        damage: +sum(rows, 'damage').toFixed(1) }));
    }
const casterRuns = results.filter(r => r.anchor === 'summon_swarmlings' && r.enemyId === 'breach_hollowchill');
const before = casterRuns.filter(r => r.mode === 'legacy');
const after = casterRuns.filter(r => r.mode === 'combined');
check('frost encounter improves survival and wins',
  sum(after, 'lost') < sum(before, 'lost') && after.filter(r => r.killed).length > before.filter(r => r.killed).length);
check('commanded approach reaches useful damage earlier', sum(after, 'firstHit') < sum(before, 'firstHit'));
check('counterplay: improved swarm still loses bodies', sum(after, 'lost') > 0);
check('baseline reproduced: frost caster wipes the original five bodies', sum(before, 'lost') === 15);

// Magnitude reduction alone still strips plies. Avoidance protects whole hits
// with a bounded probability and leaves direct hits and DoTs fully operative.
{
  seedGlobalRandom(713);
  const w = makeSimWorld('hivecaller', 713), p = w.player;
  const anchor = makeSkillInstance(SKILLS.gather_cinderkin);
  p.skills = [anchor];
  w.restoreThrong([{ skillId: anchor.def.id, defId: 'cinderkin', count: 2, level: 1 }]);
  const [protectedBody, reducedBody] = w.throngBodiesOf(p, anchor.def.id);
  const attacker = w.createMonster('zombie', 1, 'enemy');
  reducedBody.sheet.removeSource('minionCombat');
  reducedBody.sheet.setSource('probe:reduction', [mod('damageTaken', 'more', -0.75, ['aoe'])]);
  let avoided = 0, reducedTears = 0;
  for (let i = 0; i < 200; i++) {
    for (const b of [protectedBody, reducedBody]) b.plies = 4;
    const packet = () => ({ amounts: { physical: 80 }, tags: new Set<'spell' | 'aoe'>(['spell', 'aoe']), crit: false, sourceName: 'probe area' });
    if (applyHit(attacker, protectedBody, packet()).evaded) avoided++;
    applyHit(attacker, reducedBody, packet());
    if (reducedBody.plies === 3) reducedTears++;
  }
  check('area protection saves plies without immunity', avoided > 110 && avoided < 185, `${avoided}/200 avoided`);
  check('75% magnitude reduction still tears every ply', reducedTears === 200);
  protectedBody.plies = 4;
  applyHit(attacker, protectedBody, { amounts: { physical: 80 }, tags: new Set(['spell']), crit: false, sourceName: 'probe direct' });
  check('single-target hit still strips a full ply', protectedBody.plies === 3);
  const life = protectedBody.life;
  applyDot(protectedBody, 3, 'physical');
  check('DoT bypasses avoidance and plies', protectedBody.life < life && protectedBody.plies === 3);
  p.sheet.setSource('probe:protection', [mod('minionAreaAvoidance', 'flat', 1)]);
  w.bakeMinionOwnerStats(protectedBody, p, anchor, 0.2);
  check('protection capped below immunity', protectedBody.sheet.get('areaAvoidance') === 0.85);
  w.bakeMinionOwnerStats(protectedBody, p, anchor, 0.2);
  check('rebake is idempotent and does not refill spent armor', protectedBody.sheet.get('areaAvoidance') === 0.85
    && protectedBody.plies === 3);
}

// Actual command skill + actual meta entry: pooled gnats join the assault,
// then dismount and follow a moving keeper without re-engaging nearby prey.
{
  seedGlobalRandom(817);
  const w = makeSimWorld('hivecaller', 817), p = w.player;
  p.pos = { x: 650, y: 600 };
  const anchor = makeSkillInstance(SKILLS.raise_gnatveil);
  const assault = makeSkillInstance(SKILLS.command_assault);
  p.skills = [anchor, assault];
  p.sheet.setSource('probe:mana', [mod('mana', 'flat', 1000)]); p.fillResources();
  w.restoreThrong([{ skillId: anchor.def.id, defId: 'gnatling', count: 12, level: 1 }]);
  const target = w.createMonster('zombie', 1, 'enemy');
  target.pos = { x: 930, y: 600 }; target.passive = true;
  target.sheet.setSource('probe:life', [mod('life', 'flat', 10000), mod('moveSpeed', 'override', 0)]); target.fillResources();
  w.actors.push(target);
  check('gnats start pooled', w.throngBodiesOf(p, anchor.def.id).length === 0 && w.throngRosterCount(p, anchor) === 12);
  target.passive = false;
  target.skills = [];
  w.useSkill(p, assault, target.pos);
  const army = w.throngBodiesOf(p, anchor.def.id);
  check('Assault reaches every pooled gnat with a pinned order', army.length === 12
    && army.every(a => a.aiCommand?.targetId === target.id));
  step(w, 2);
  check('ordered gnats engage and latch', army.some(a => a.clingTo?.id === target.id));
  // The real meta dispatcher tests host-scope semantics as well as recall.
  w.useMetaSkill(p, assault, target.pos);
  step(w, 0.15);
  check('Recall meta releases riders and cancels quarry', army.every(a => !a.clingTo
    && a.aiTargetId === undefined && a.aiCommand?.kind === 'recall'));
  p.pos = { x: 450, y: 600 };
  step(w, 3);
  check('recalled army follows the moving keeper', army.every(a => dist(a.pos, p.pos) < 120));
  check('recall holds instead of starting nearby fights', army.every(a => !a.clingTo && a.aiTargetId === undefined));
  p.cooldowns.delete(assault.def.id);
  w.useSkill(p, assault, target.pos);
  check('fresh Assault overrides recall', army.every(a => a.aiCommand?.kind === 'assault'));
}

{
  seedGlobalRandom(901);
  const w = makeSimWorld('hivecaller', 901), p = w.player;
  p.pos = { x: 600, y: 600 };
  const anchor = makeSkillInstance(SKILLS.summon_swarmlings);
  p.skills = [anchor];
  const minion = w['spawnMinion'](p, anchor, { pos: { x: 800, y: 600 } })!;
  const enemy = w.createMonster('zombie', 1, 'enemy');
  enemy.pos = { x: 900, y: 600 }; enemy.facing = Math.PI;
  enemy.brain = { type: 'swarm', target: { prefer: 'nearest' }, perception: { arcDeg: 360 } };
  enemy.skills = []; w.actors.push(enemy);
  updateAI(enemy, w, DT);
  check('low priority favors keeper over a nearer minion', enemy.aiTargetId === p.id);
  p.untargetable = true; enemy.aiRescanAt = 0;
  updateAI(enemy, w, DT);
  check('minion remains a legal target when alone', enemy.aiTargetId === minion.id);
  p.untargetable = false; minion.taunt = true; enemy.aiRescanAt = 0;
  updateAI(enemy, w, DT);
  check('taunt overrides low priority', enemy.aiTargetId === minion.id);
  const classic = makeSkillInstance(SKILLS.summon_skeleton);
  p.skills.push(classic);
  const skeleton = w['spawnMinion'](p, classic)!;
  check('ordinary summon remains neutral', skeleton.sheet.get('areaAvoidance') === 0
    && skeleton.sheet.get('targetPriority') === 1 && skeleton.sheet.get('threatGen') === 1);
  check('damage investment remains attributable and unchanged',
    minion.sheet.getSourceMods('minionCombat')?.every(m => m.stat !== 'damage') === true);
}

{
  seedGlobalRandom(917);
  const w = makeSimWorld('hivecaller', 917), p = w.player;
  const anchor = makeSkillInstance(SKILLS.raise_gnatveil);
  p.skills = [anchor];
  const count = 24;
  w.restoreThrong([{ skillId: anchor.def.id, defId: 'gnatling', count, level: 1 }]);
  const enemy = w.createMonster('zombie', 1, 'enemy');
  const kind = w.liteKindOf('gnatling');
  const initial = w.lite.countOwned(p.id, kind);
  w['strikeSurfaces'](enemy, p.pos, 200);
  const survived = w.lite.countOwned(p.id, kind);
  check('pooled gnats share bounded area protection', initial === count && survived > 0 && survived < initial,
    `${survived}/${initial} survived one blast`);
  for (let i = 0; i < 60; i++) w['strikeSurfaces'](enemy, p.pos, 200);
  check('sustained area hits still destroy the pooled army', w.lite.countOwned(p.id, kind) === 0);
  w.restoreThrong([{ skillId: anchor.def.id, defId: 'gnatling', count, level: 1 }]);
  w['strikeSurfaces'](enemy, p.pos, 200, undefined, undefined, undefined, false);
  check('non-area surface hits retain full counterplay against pooled bodies', w.lite.countOwned(p.id, kind) === 0);
}

// The pool has no full life/ply budget. Invested or damaged bodies must
// preserve their complete actor state instead of shedding bought armor.
{
  seedGlobalRandom(929);
  const w = makeSimWorld('hivecaller', 929), p = w.player;
  const anchor = makeSkillInstance(SKILLS.raise_gnatveil); p.skills = [anchor];
  const restore = () => w.restoreThrong([{ skillId: anchor.def.id, defId: 'gnatling', count: 6, level: 1 }]);
  const kind = w.liteKindOf('gnatling');
  restore();
  const initial = w.lite.countOwned(p.id, kind);
  const row = [...Array(w.lite.used).keys()].find(i => w.lite.alive[i] && w.lite.owner[i] === p.id)!;
  const healthy = w.promoteLite(row)!;
  w['liteDemoteSweep']();
  check('healthy neutral gnat returns to the pool', healthy.dead && w.lite.countOwned(p.id, kind) === initial);
  p.sheet.setSource('probe:plies', [mod('minionPlies', 'flat', 2)]);
  step(w, 1.2);
  const invested = w.throngBodiesOf(p, anchor.def.id);
  check('buying armor promotes existing pooled gnats before combat', invested.length === 6
    && w.lite.countOwned(p.id, kind) === 0 && invested.every(a => a.plies === 3));
  w['liteDemoteSweep']();
  check('invested gnats keep their full bought armor while idle', invested.every(a => !a.dead && a.plies === 3));
  restore();
  check('restored invested gnats are born with full armor', w.throngBodiesOf(p, anchor.def.id).length === 12
    && w.throngBodiesOf(p, anchor.def.id).every(a => a.plies === 3));
  const worn = invested[0];
  const enemy = w.createMonster('zombie', 1, 'enemy');
  applyHit(enemy, worn, { amounts: { physical: 80 }, tags: new Set(['spell']), crit: false, sourceName: 'wear' });
  applyDot(worn, 1, 'physical');
  const life = worn.life;
  w['liteDemoteSweep']();
  check('spent armor and injured life cannot heal through demotion', !worn.dead && worn.plies === 2 && worn.life === life);
  p.sheet.removeSource('probe:plies');
  w.bakeMinionOwnerStats(worn, p, anchor, 0.2);
  w['liteDemoteSweep']();
  check('removing investment preserves spent armor and the exposed life pool',
    !worn.dead && worn.plies === 0 && worn.life === life);
}

{
  seedGlobalRandom(931);
  const w = makeSimWorld('hivecaller', 931), p = w.player;
  const original = SKILLS.gather_cinderkin;
  const anchor = makeSkillInstance({ ...original, throng: { ...original.throng!, untamed: { huntRadius: 600 } } });
  const recall = makeSkillInstance(SKILLS.command_recall); p.skills = [anchor, recall];
  w.restoreThrong([{ skillId: anchor.def.id, defId: 'cinderkin', count: 2, level: 1 }]);
  const target = w.createMonster('zombie', 1, 'enemy');
  target.pos = { x: p.pos.x + 200, y: p.pos.y }; target.skills = [];
  target.sheet.setSource('probe:still', [mod('moveSpeed', 'override', 0)]);
  w.actors.push(target);
  w.useSkill(p, recall, target.pos); step(w, 2);
  check('untamed drive cannot overwrite an explicit recall',
    w.throngBodiesOf(p, anchor.def.id).every(a => a.aiCommand?.kind === 'recall' && !a.clingTo));
}

console.log(`throng combat: ${failed} failures`);
process.exitCode = failed ? 1 : 0;
