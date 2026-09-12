import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { updateAI } from '../src/engine/ai';
import { clingMotionShaken, clingSeatsOf } from '../src/engine/cling';
import { makeSkillInstance } from '../src/engine/skills';
import { SKILLS } from '../src/data/skills';
import { MONSTERS } from '../src/data/monsters';
import { vec, dist } from '../src/core/math';
import { mod } from '../src/engine/stats';
import { setSimTap } from '../src/engine/tap';

let failed = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail}`);
  if (!ok) failed++;
}
bootSimEngine();
seedGlobalRandom(0xc119);
const DT = 1 / 60;
function fixture() {
  const w = makeSimWorld('summoner', 0xc119);
  const p = w.player;
  p.pos = vec(w.arena.w / 2, w.arena.h / 2);
  p.sheet.setSource('probe', [mod('lifeRegen', 'more', -1)]);
  const g = w.createMonster('gloomling', 1, 'enemy');
  g.pos = vec(p.pos.x + p.radius + g.radius + 4, p.pos.y);
  g.aiTargetId = p.id;
  w.actors.push(g);
  return { w, p, g };
}
function tick(w: ReturnType<typeof makeSimWorld>, seconds: number) {
  for (let i = 0; i < Math.ceil(seconds / DT); i++) w.update(DT);
}

check('Gloomling has only a weak close-range kit',
  MONSTERS.gloomling.skills.length === 1 && MONSTERS.gloomling.skills[0] === 'gloom_nip'
  && SKILLS.gloom_nip.delivery.type === 'melee' && !MONSTERS.gloomling.brain?.rules?.length);
{
  const { w, p, g } = fixture();
  const before = p.life;
  w.useSkill(g, makeSkillInstance(SKILLS.gloom_nip, 1), p.pos);
  w.update(DT);
  check('contact latches and cancels the unfinished nip', g.clingTo?.id === p.id && !g.casting);
  check('contact itself deals no burst', p.life === before);
  check('latched body stays targetable by its host', w.hostileTo(p, g));
  check('gnaw replaces casts while attached', !w.useSkill(g, makeSkillInstance(SKILLS.gloom_nip, 1), p.pos));
  tick(w, 0.4);
  check('first chew waits a full beat', p.life === before);
  tick(w, 0.2);
  check('steady chaos chew wounds without a projectile', p.life < before && p.life > before - 3);
  p.facing += Math.PI;
  w.update(DT);
  check('a sharp half-turn flings the rider free', !g.clingTo && dist(p.pos, g.pos) > 40);
  check('shake earns 2.5 seconds before reattachment', g.clingCooldownUntil - w.time > 2.4);
  const after = p.life;
  tick(w, 0.6);
  check('detachment stops the chew immediately', p.life === after);
  g.pos = vec(p.pos.x + p.radius, p.pos.y);
  tick(w, 0.3);
  check('touching again during grace cannot relatch', !g.clingTo);
}
{
  const { w, p, g } = fixture();
  w.update(DT);
  const start = { ...p.pos };
  for (let i = 0; i < 120 && g.clingTo; i++) {
    w.moveActor(p, 1, 0, DT);
    w.update(DT);
  }
  check('ordinary walking shakes off darkness', !g.clingTo, `travel ${dist(start, p.pos).toFixed(1)}`);
  check('walking escape uses the authored distance', dist(start, p.pos) >= 235 && dist(start, p.pos) < 250);
}
{
  const { w, p, g } = fixture();
  w.update(DT);
  // Pure samples isolate angle wrapping, gentle aim and frame-rate behavior.
  p.facing = Math.PI - 0.01;
  g.clingTo!.motion = undefined;
  clingMotionShaken(g, p, 10);
  p.facing = -Math.PI + 0.01;
  check('crossing the angle seam is not a full spin', !clingMotionShaken(g, p, 10.1));
  for (let i = 1; i <= 120; i++) {
    p.facing += DT;
    clingMotionShaken(g, p, 10.1 + i * DT);
  }
  check('gentle aim adjustment does not shake a stationary rider', g.clingTo!.motion!.wear < 0.01);
  g.clingTo!.motion = undefined;
  clingMotionShaken(g, p, 20);
  p.pos.x += 10;
  clingMotionShaken(g, p, 20 + DT);
  p.pos.x -= 10;
  check('a sharp reversal of movement works with aim held steady', clingMotionShaken(g, p, 20 + 2 * DT));
}
for (const hz of [30, 60, 120]) {
  const { w, p, g } = fixture();
  w.update(DT);
  let poppedAt = 0;
  for (let i = 1; i <= hz * 2; i++) {
    p.facing += Math.PI * 2 / hz;
    if (clingMotionShaken(g, p, w.time + i / hz)) { poppedAt = i / hz; break; }
  }
  check(`turn escape agrees at ${hz} Hz`, Math.abs(poppedAt - 0.5) < 1 / hz + 1e-6, `${poppedAt}s`);
}
{
  const { w, p, g } = fixture();
  for (let i = 0; i < 7; i++) {
    const other = w.createMonster('gloomling', 1, 'enemy');
    other.pos = { ...g.pos }; other.aiTargetId = p.id; w.actors.push(other);
  }
  tick(w, 0.2);
  const count = w.actors.filter(a => a.clingTo?.id === p.id).length;
  check('abundant packs respect the shared seat cap', count === clingSeatsOf(p), `${count} riders`);
  p.facing += Math.PI;
  w.update(DT);
  check('one sharp turn sheds all attached riders', !w.actors.some(a => a.clingTo?.id === p.id));
}
{
  const { w, p, g } = fixture();
  w.update(DT);
  tick(w, 4.2);
  check('standing still still has a finite hold', !g.clingTo);
  g.clingCooldownUntil = 0; g.clingThinkAt = 0;
  g.pos = vec(p.pos.x + p.radius, p.pos.y);
  g.applyStatus('stun', 0, 1, 'probe');
  w.update(DT);
  check('an incapacitated rider cannot start a new latch', !g.clingTo);
}
{
  const { w, p, g } = fixture();
  g.pos = vec(p.pos.x + 180, p.pos.y);
  let caught = false;
  for (let i = 0; i < 180; i++) {
    updateAI(g, w, DT); w.update(DT);
    caught ||= g.clingTo?.id === p.id;
  }
  check('live swarm AI approaches and latches with the new kit', caught);
}
{
  const { w, p, g } = fixture();
  w.update(DT);
  p.dead = true;
  w.update(DT);
  check('host death clears the ride', !g.clingTo);
}
for (const hz of [30, 60, 120]) {
  const w = makeSimWorld('summoner', 0x9012);
  const p = w.player;
  p.pos = vec(w.arena.w / 2, w.arena.h / 2);
  const m = w.createMonster('beastkin_gorer', 4, 'enemy');
  m.pos = vec(p.pos.x - 200, p.pos.y); w.actors.push(m);
  const inst = makeSkillInstance(SKILLS.gore_charge, 1);
  w.useSkill(m, inst, vec(p.pos.x + 230, p.pos.y));
  let contactX: number | undefined, releasedAt: number | undefined;
  for (let i = 0; i < hz * 2; i++) {
    w.update(1 / hz);
    if (m.gripping && contactX === undefined) contactX = m.pos.x;
    if (contactX !== undefined && !m.gripping && releasedAt === undefined) releasedAt = w.time;
  }
  check(`Gorer carries at most 90 units after contact at ${hz} Hz`,
    contactX !== undefined && m.pos.x - contactX <= 90.001 && m.pos.x - contactX > 0,
    `${contactX === undefined ? 'miss' : (m.pos.x - contactX).toFixed(2)} units`);
  check(`Gorer release grants shared three-second grace at ${hz} Hz`,
    releasedAt !== undefined && p.grabProofUntil >= releasedAt + 3 - 1e-6);
  const other = w.createMonster('beastkin_gorer', 4, 'enemy');
  other.pos = vec(p.pos.x - 40, p.pos.y); w.actors.push(other);
  w.useSkill(other, makeSkillInstance(SKILLS.gore_charge, 1), vec(p.pos.x + 100, p.pos.y));
  let recaught = false;
  for (let i = 0; i < hz; i++) { w.update(1 / hz); recaught ||= p.heldBy !== undefined; }
  check(`a second Gorer cannot chain-grab during grace at ${hz} Hz`, !recaught);
}
{
  const w = makeSimWorld('summoner', 0x9123);
  const p = w.player;
  p.pos = vec(w.arena.w / 2, w.arena.h / 2);
  const m = w.createMonster('beastkin_gorer', 4, 'enemy');
  m.pos = vec(p.pos.x - 200, p.pos.y - 200); w.actors.push(m);
  // Missed skill charge finishes, then a plain AI movement rush crosses
  // a fresh victim. The old corridor ledger must not give it free attacks.
  w.useSkill(m, makeSkillInstance(SKILLS.gore_charge, 1), vec(m.pos.x + 430, m.pos.y));
  tick(w, 1.2);
  m.pos = vec(p.pos.x - 80, p.pos.y);
  m.dash = { dir: 0, speed: 420, remaining: 0.4 };
  let seized = false;
  for (let i = 0; i < 30; i++) { w.update(DT); seized ||= p.heldBy === m.id; }
  check('AI-only rush cannot inherit a completed charge\'s grab', !seized);
}
{
  const { w, p, g } = fixture();
  w.update(DT);
  let credited = false, measured = 0;
  setSimTap({
    onDot(target, landed, type) { if (target === p && type === 'chaos') measured += landed; },
    onDeath(target, killer) { if (target === p) credited = killer === g; },
  });
  p.life = 0.1;
  try { tick(w, 0.6); } finally { setSimTap(null); }
  check('gnaw damage is visible to balance telemetry', measured > 0);
  check('a lethal gnaw credits the actual Gloomling', credited && p.dead);
}
console.log(`${failed ? `${failed} FAILED` : 'ALL PASSED'}`);
process.exitCode = failed ? 1 : 0;
