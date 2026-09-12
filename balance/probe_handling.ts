import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { monsterTurnSpeed, TURNING_CFG } from '../src/engine/handling';
import { updateAI } from '../src/engine/ai';
import { makeSkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { MONSTERS } from '../src/data/monsters';
import { SKILLS } from '../src/data/skills';
import { angleDiff, angleTo, dist, vec } from '../src/core/math';

let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
}
bootSimEngine();
seedGlobalRandom(0x7a12);
const DT = 1 / 60;
function fixture(id = 'brute') {
  const w = makeSimWorld('summoner', 0x7a12);
  const p = w.player;
  p.pos = vec(w.arena.w / 2 + 100, w.arena.h / 2);
  const m = w.createMonster(id, 1, 'enemy');
  m.pos = vec(p.pos.x - 100, p.pos.y);
  w.actors.push(m);
  return { w, p, m };
}

const body = { radius: 12, base: { moveSpeed: 160 } };
check('reference body uses the configured baseline', monsterTurnSpeed(body) === TURNING_CFG.baseRate);
check('larger bodies turn slower at equal pace', monsterTurnSpeed({ ...body, radius: 24 }) < monsterTurnSpeed(body));
check('slow feet reduce innate handling independently', monsterTurnSpeed({ ...body, base: { moveSpeed: 80 } }) < monsterTurnSpeed(body));
check('authored heft adds inertia independently', monsterTurnSpeed({ ...body, heft: 2 }) < monsterTurnSpeed(body));
check('an explicit rate wins over morphology', monsterTurnSpeed({ ...body, radius: 99, turnSpeed: 3 }) === 3);
check('explicit zero remains instant', monsterTurnSpeed({ ...body, turnSpeed: 0 }) === 0);
check('stationary giants retain a finite pivot', monsterTurnSpeed({ radius: 200, base: { moveSpeed: 0 } }) === TURNING_CFG.minRate);
for (const id of ['zombie_crawler', 'zombie', 'skeleton_warrior', 'brute', 'crypt_warden', 'troll_mauler', 'beastkin_gorer', 'gloomling']) {
  const rate = monsterTurnSpeed(MONSTERS[id]);
  console.log(`RATE ${id}: ${rate.toFixed(2)} rad/s; half-turn ${(Math.PI / rate).toFixed(2)}s`);
}
check('Gloomlings keep noticeably quicker bodies than brutes',
  monsterTurnSpeed(MONSTERS.gloomling) > monsterTurnSpeed(MONSTERS.brute) * 3);
{
  const { w, m } = fixture('troll_mauler');
  const largerLevel = w.createMonster('troll_mauler', 40, 'enemy');
  check('levels do not erase physical identity', m.turnSpeed === largerLevel.turnSpeed);
  const start = m.facing;
  m.facing = 3;
  w.update(DT);
  check('first acquisition pays the turn limit', Math.abs(angleDiff(start, m.facing)) <= m.turnSpeed * DT + 1e-9);
}
for (const hz of [30, 60, 120]) {
  const { w, m } = fixture();
  m.facing = m.facingPrev = 0;
  let last = 0, capped = true, elapsed = 0;
  for (let i = 0; i < hz * 3; i++) {
    m.facing = Math.PI;
    w.update(1 / hz);
    capped &&= Math.abs(angleDiff(last, m.facing)) <= m.turnSpeed / hz + 1e-8;
    last = m.facing; elapsed = (i + 1) / hz;
    if (Math.abs(angleDiff(m.facing, Math.PI)) < 1e-8) break;
  }
  check(`body never exceeds its turn budget at ${hz} Hz`, capped);
  check(`half-turn time is consistent at ${hz} Hz`,
    Math.abs(elapsed - Math.PI / m.turnSpeed) <= 1 / hz + 1e-8, `${elapsed.toFixed(3)}s`);
}
{
  const { w, m, p } = fixture();
  m.facing = m.facingPrev = Math.PI - 0.01;
  m.facing = -Math.PI + 0.01;
  w.update(DT);
  check('angle wrapping takes the short way', Math.abs(angleDiff(m.facing, -Math.PI + 0.01)) < 1e-9);
  m.facing = m.facingPrev = 0;
  m.sheet.setSource('pivot-probe', [mod('aiTurnSpeed', 'more', -0.5)]);
  m.facing = 3; w.update(DT);
  check('ordinary modifiers bend the innate pivot', Math.abs(m.facing - m.turnSpeed * 0.5 * DT) < 1e-9);
  p.facingPrev = 0; p.facing = 3; w.update(DT);
  check('player aim remains immediate', p.facing === 3);
  m.sheet.removeSource('pivot-probe');
  m.life = 1;
  m.sheet.setSource('noevade', [mod('evasion', 'override', 0)]);
  w.executeSkill(p, makeSkillInstance(SKILLS.possession, 1), vec(m.pos.x, m.pos.y));
  check('the real possession path transfers the seat', w.localSeat.actor === m);
  m.facingPrev = 0; m.facing = 3; w.update(DT);
  check('a possessed heavy body keeps player-controlled aim free', m.facing === 3);
}
{
  const { w, m } = fixture();
  m.turnSpeed = 1;
  m.facing = m.facingPrev = 0;
  const inst = makeSkillInstance(SKILLS.claw, 1);
  check('cast completion setup uses the real skill pipeline', w.useSkill(m, inst, vec(m.pos.x - 60, m.pos.y)));
  m.casting!.elapsed = m.casting!.total - DT / 2;
  w.update(DT);
  check('a completing cast cannot snap past the turn clamp', !m.casting && Math.abs(m.facing) <= DT + 1e-9);
}
for (const id of ['shield_up', 'infernal_ray']) {
  const { w, m } = fixture('crypt_warden');
  m.turnSpeed = 1.2;
  m.facing = m.facingPrev = 0;
  m.sheet.setSource('fuel', [mod('mana', 'flat', 1000)]); m.mana = m.maxMana();
  check(`${id}: real stance/channel starts`, w.useSkill(m, makeSkillInstance(SKILLS[id], 1), vec(m.pos.x - 100, m.pos.y)));
  if (m.casting) m.casting.aiHold = 10;
  let last = 0, capped = true;
  for (let i = 0; i < 12; i++) {
    m.facing = Math.PI; // AI expresses a rearward desired heading every beat
    w.update(DT);
    capped &&= Math.abs(angleDiff(last, m.facing)) <= 1.2 * DT + 1e-8;
    last = m.facing;
  }
  check(`${id}: the body spends one pivot budget, never two`, capped && Math.abs(last) > 0.01, `${last.toFixed(3)}rad`);
}
{
  const { w, m } = fixture('crypt_warden');
  m.turnSpeed = 1.2; m.facing = m.facingPrev = 0;
  m.sheet.setSource('fuel', [mod('mana', 'flat', 1000)]); m.mana = m.maxMana();
  const fastRay = { ...SKILLS.infernal_ray, channel: { ...SKILLS.infernal_ray.channel!, turnRate: 20 } };
  w.useSkill(m, makeSkillInstance(fastRay, 1), vec(m.pos.x - 100, m.pos.y));
  m.facing = Math.PI;
  w.update(DT);
  check('a fast-steering channel is still limited by its heavy body', Math.abs(m.facing - 1.2 * DT) < 1e-8);
}
{
  const { w, m, p } = fixture();
  p.pos = vec(m.pos.x - 40, m.pos.y);
  m.brain = { type: 'basic', perception: { arcDeg: 360, rearMul: 1 },
    behavior: { castArc: 0.5, recovery: [0.6, 0.6] } };
  m.skills = [makeSkillInstance(SKILLS.claw, 1)];
  m.aiTargetId = p.id;
  m.facing = m.facingPrev = 0;
  let started = false, wrongBearing = false, startTime = 0;
  for (let i = 0; i < 180; i++) {
    updateAI(m, w, DT);
    if (m.casting) {
      started = true; startTime = w.time;
      wrongBearing = Math.abs(angleDiff(m.facingPrev!, angleTo(m.pos, p.pos))) > 0.5 + 1e-8;
      break;
    }
    w.update(DT);
  }
  check('rearward prey buys time before the body can attack', started && startTime > 0.7 && !wrongBearing, `${startTime.toFixed(2)}s`);
  check('the AI carries recovery on its cast', m.casting?.aiRecovery === 0.6);
  const pending = m.casting;
  for (let i = 0; i < 120 && m.casting === pending; i++) w.update(DT);
  check('recovery starts after the completed swing', !m.casting && m.useLock >= 0.59 && m.aiPlantUntil - w.time >= 0.59);
  p.pos = vec(m.pos.x + 180, m.pos.y);
  const at = { ...m.pos };
  for (let i = 0; i < 20; i++) { updateAI(m, w, DT); w.update(DT); }
  check('recovery leaves a real opening to move away', dist(at, m.pos) < 1 && !m.casting);
  for (let i = 0; i < 30; i++) { updateAI(m, w, DT); w.update(DT); }
  check('the body resumes pursuit when recovery expires', dist(at, m.pos) > 5);
}
{
  const { w, m } = fixture();
  w.useSkill(m, makeSkillInstance(SKILLS.claw, 1), vec(m.pos.x + 40, m.pos.y));
  m.casting!.aiRecovery = 2;
  m.applyStatus('stun', 0, 1, 'probe');
  w.update(DT);
  check('an interrupted cast does not pay successful-cast recovery', !m.casting && m.aiPlantUntil <= w.time);
}
{
  const { w, m, p } = fixture();
  const focus = { ...SKILLS.claw,
    targeting: { target: 'enemy' as const, castRange: 300 },
    concentration: { time: 1, onBreak: 'cancel' as const } };
  check('concentration recovery setup uses a real cast',
    w.useSkill(m, makeSkillInstance(focus, 1), vec(p.pos.x, p.pos.y)));
  m.casting!.aiRecovery = 2;
  m.casting!.held = false;
  w.update(DT);
  check('abandoned concentration does not pay completed-cast recovery',
    !m.casting && m.aiPlantUntil <= w.time);
}
{
  const { w, m, p } = fixture('beastkin_gorer');
  // With no usable skill, the fallback rush must still wait for its horns.
  m.skills = [];
  m.brain = { type: 'basic', perception: { arcDeg: 360, rearMul: 1 },
    move: { style: 'charge', commitRange: 320 }, behavior: { castArc: 0.55 } };
  p.pos = vec(m.pos.x - 200, m.pos.y);
  m.aiTargetId = p.id; m.facing = m.facingPrev = 0;
  let launched = false, aligned = false, startedAt = 0;
  for (let i = 0; i < 120; i++) {
    updateAI(m, w, DT);
    if (m.dash) {
      launched = true; startedAt = w.time;
      aligned = Math.abs(angleDiff(m.facingPrev!, m.dash.dir)) <= 0.55;
      break;
    }
    w.update(DT);
  }
  check('a fallback rush also waits until the horns face its target', launched && aligned && startedAt > 0.5);
}
console.log(failed ? `${failed} FAILED` : 'ALL PASSED');
process.exitCode = failed ? 1 : 0;
