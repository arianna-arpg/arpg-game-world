import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { updateAI } from '../src/engine/ai';
import { makeSkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { resolveTell } from '../src/engine/tells';
import { MONSTERS } from '../src/data/monsters';
import { SKILLS } from '../src/data/skills';
import { angleDiff, dist, vec } from '../src/core/math';

let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
}
bootSimEngine();
seedGlobalRandom(0x5a17);
const DT = 1 / 60;
function fixture(id = 'sylvan_warden') {
  const w = makeSimWorld('guardian', 0x5a17);
  const p = w.player;
  p.pos = vec(w.arena.w / 2 + 45, w.arena.h / 2);
  p.sheet.setSource('probe-defense', [mod('life', 'flat', 4000), mod('armor', 'override', 0),
    mod('blockChance', 'override', 0), mod('evasion', 'override', 0)]);
  p.fillResources();
  const m = w.createMonster(id, 1, 'enemy');
  m.pos = vec(p.pos.x - 45, p.pos.y);
  m.facing = m.facingPrev = 0;
  m.sheet.setSource('probe-crit', [mod('critChance', 'override', 0)]);
  w.actors.push(m);
  return { w, p, m };
}
function raise(f: ReturnType<typeof fixture>, windup: number | undefined = 0.55) {
  const inst = f.m.skills.find(s => s?.def.id === 'shield_up')!;
  if (!f.w.useSkill(f.m, inst, vec(f.p.pos.x, f.p.pos.y))) throw new Error('Guard setup failed');
  const cs = f.m.casting!;
  cs.aiHold = 0;
  cs.aiGuardWindup = windup;
  cs.aiRecovery = 0.7;
  return cs;
}
function settle(f: ReturnType<typeof fixture>, seconds = 0.8) {
  for (let i = 0; i < Math.ceil(seconds / DT); i++) f.w.update(DT);
}
{
  const f = fixture(), cs = raise(f);
  cs.aiHold = 2;
  let warnedAt = 0;
  for (let i = 0; i < 180 && f.m.casting; i++) {
    f.w.update(DT);
    if (!warnedAt && cs.aiGuardReleaseAt !== undefined) warnedAt = f.w.time;
  }
  check('the warning occupies the end of the hold instead of extending it',
    warnedAt >= 1.45 - DT && warnedAt <= 1.45 + DT
    && Math.abs(f.w.time - 2) <= DT + 1e-8, `warning=${warnedAt.toFixed(3)}, release=${f.w.time.toFixed(3)}`);
}
for (const hz of [30, 60, 120]) {
  const f = fixture(), cs = raise(f);
  const before = f.p.life;
  f.w.update(1 / hz);
  const started = f.w.time;
  check(`${hz} Hz: release starts a warning without damage`,
    cs.aiGuardReleaseAt !== undefined && f.m.casting === cs && f.p.life === before);
  let early = false;
  for (let i = 0; i < hz; i++) {
    f.w.update(1 / hz);
    if (f.p.life < before && f.w.time - started < 0.55 - 1e-8) early = true;
    if (!f.m.casting) break;
  }
  check(`${hz} Hz: a stationary target is hit after the whole warning`,
    !early && f.p.life < before && Math.abs(f.w.time - started - 0.55) <= 1 / hz + 1e-8);
  check(`${hz} Hz: the completed bash pays recovery`, f.m.useLock >= 0.69);
}
{
  const f = fixture(), cs = raise(f);
  f.w.update(DT);
  const facing = f.m.facing, at = { ...f.m.pos }, before = f.p.life;
  f.p.pos = vec(f.m.pos.x - 45, f.m.pos.y);
  for (let i = 0; i < 18; i++) {
    cs.aim = { ...f.p.pos };
    f.m.facing = Math.PI; // fresh target-tracking requests cannot rotate the commitment
    updateAI(f.m, f.w, DT); f.w.update(DT);
  }
  check('warning plants feet and locks the bash bearing',
    dist(at, f.m.pos) < 0.1 && Math.abs(angleDiff(facing, f.m.facing)) < 1e-8);
  check('the body tell reads real warning progress',
    resolveTell({ source: 'guardRelease', steps: 20, channel: { kind: 'lean', amp: 1 } }, f.m, f.w) > 0);
  settle(f);
  check('circling behind avoids the committed bash', f.p.life === before);
  check('the warning tell clears when the stance ends',
    resolveTell({ source: 'guardRelease', channel: { kind: 'lean', amp: 1 } }, f.m, f.w) === 0);
}
{
  const f = fixture(), cs = raise(f);
  const before = f.p.life;
  f.w.update(DT);
  cs.shield = cs.maxShield! * 0.1;
  settle(f);
  check('weakening the shield during the warning denies its bash', !f.m.casting && f.p.life === before);
}
{
  const f = fixture(), cs = raise(f);
  cs.shield = cs.maxShield! * 0.1;
  f.w.update(DT);
  check('an unarmed shield drops without a false bash warning', !f.m.casting && cs.aiGuardReleaseAt === undefined);
}
{
  const f = fixture(); raise(f); f.w.update(DT);
  const before = f.p.life;
  f.m.applyStatus('stun', 0, 1, 'probe');
  settle(f);
  check('stunning the wind-up cancels its bash', !f.m.casting && f.p.life === before);
}
{
  const f = fixture(); raise(f); f.w.update(DT);
  const before = f.p.life;
  const breaker = { ...SKILLS.claw, baseDamage: { physical: [1000, 1000] as [number, number] } };
  f.w.executeSkill(f.p, makeSkillInstance(breaker, 1), vec(f.m.pos.x, f.m.pos.y));
  check('a real frontal hit can break the guard during its warning', !f.m.casting);
  settle(f);
  check('a broken guard leaves no delayed ghost bash', f.p.life === before);
}
{
  const f = fixture(); raise(f, 0); const before = f.p.life;
  f.w.update(DT);
  check('zero warning preserves immediate release', !f.m.casting && f.p.life < before);
}
{
  const f = fixture(); const cs = raise(f); delete cs.aiGuardWindup;
  f.w.update(DT);
  check('an omitted warning preserves existing guards', !f.m.casting && cs.aiGuardReleaseAt === undefined);
}
{
  const f = fixture();
  f.w.useSkill(f.p, makeSkillInstance(SKILLS.shield_up, 1), vec(f.m.pos.x, f.m.pos.y));
  if (!f.p.casting) throw new Error('Player guard setup failed');
  f.p.casting.aiGuardWindup = 0.55;
  f.p.casting.held = false;
  f.w.update(DT);
  check('player shield release does not inherit an AI warning', !f.p.casting);
}
{
  const f = fixture(); raise(f); f.w.update(DT);
  f.m.life = 1;
  f.m.sheet.setSource('probe-possession', [mod('evasion', 'override', 0), mod('blockChance', 'override', 0)]);
  f.p.pos = vec(f.m.pos.x - 45, f.m.pos.y);
  f.w.executeSkill(f.p, makeSkillInstance(SKILLS.possession, 1), vec(f.m.pos.x, f.m.pos.y));
  check('a real possession takes over the warning body', f.w.localSeat.actor === f.m);
  if (f.m.casting) f.m.casting.held = false;
  f.w.update(DT);
  check('taking the seat removes the pending AI release commitment',
    !f.m.casting || f.m.casting.aiGuardReleaseAt === undefined);
}
{
  const f = fixture();
  f.m.skills = [f.m.skills.find(s => s?.def.id === 'shield_up')!];
  f.m.aiTargetId = f.p.id;
  for (let i = 0; i < 360 && !f.m.casting; i++) { updateAI(f.m, f.w, DT); f.w.update(DT); }
  check('live Warden AI copies its resolved warning and recovery',
    f.m.casting?.aiGuardWindup === 0.55 && (f.m.casting.aiRecovery ?? 0) >= 0.65);
}
{
  function damage(power?: number) {
    const f = fixture();
    if (power !== undefined) f.m.sheet.setSource('probe-power', [mod('bashPower', 'override', power)]);
    raise(f, 0); const before = f.p.life; f.w.update(DT); return before - f.p.life;
  }
  const current = damage(), full = damage(1);
  check('Warden bash damage uses the shared 35% reduction',
    full > 0 && Math.abs(current / full - 0.65) < 1e-6, `${current.toFixed(2)} / ${full.toFixed(2)}`);
}
{
  const def = MONSTERS.sylvan_warden, original = def.boons;
  // Force a single deterministic real doctrine to exercise eligibility at the
  // exact boundary; restore shared data even when setup or assertions fail.
  try {
    def.boons = [{ group: 'bulwark_doctrines', pick: 99, chance: 1, minLevel: 8 }];
    const w = fixture().w;
    const young = w.createMonster('sylvan_warden', 7, 'enemy');
    const veteran = w.createMonster('sylvan_warden', 8, 'enemy');
    check('defensive doctrines are absent below their authored level', !young.wornConduits?.length);
    check('doctrines become eligible at the exact level boundary', (veteran.wornConduits?.length ?? 0) >= 2,
      `level=${veteran.level}, conduits=${veteran.wornConduits?.length}, sources=${veteran.sheet.sourceNames().join(',')}`);
    def.boons = [{ group: 'bulwark_doctrines', pick: 99, chance: 1 }];
    check('omitted doctrine gate remains eligible at level one',
      (w.createMonster('sylvan_warden', 1, 'enemy').wornConduits?.length ?? 0) >= 2);
  } finally { def.boons = original; }
}
console.log(failed ? `${failed} FAILED` : 'ALL PASSED');
process.exitCode = failed ? 1 : 0;
