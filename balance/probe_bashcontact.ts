import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { makeSkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { SKILLS } from '../src/data/skills';
import { vec } from '../src/core/math';
import { setSimTap } from '../src/engine/tap';

bootSimEngine();
let failures = 0;
function check(name: string, ok: boolean) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failures++;
}
const DT = 1 / 60;
function fixture(fuse = false) {
  seedGlobalRandom(0xba51);
  const w = makeSimWorld('guardian', 0xba51), p = w.player;
  p.pos = vec(w.arena.w / 2, w.arena.h / 2);
  const m = w.createMonster('skeleton_warrior', 1, 'enemy');
  m.pos = vec(p.pos.x + 45, p.pos.y);
  m.facing = m.facingPrev = Math.PI;
  m.sheet.setSource('probe-target', [mod('life', 'flat', 5000),
    mod('evasion', 'override', 0), mod('blockChance', 'override', 0)]);
  m.fillResources(); w.actors.push(m);
  const def = { ...SKILLS.shield_up,
    guard: { ...SKILLS.shield_up.guard!, bash: { ...SKILLS.shield_up.guard!.bash!, stunChance: 1 } },
    ...(fuse ? { fuse: { delay: 0.2 } } : {}) };
  const inst = makeSkillInstance(def, 1);
  if (!w.useSkill(p, inst, vec(m.pos.x, m.pos.y))) throw new Error('Unable to raise test shield');
  const release = () => { p.casting!.held = false; w.update(DT); };
  const settle = () => { for (let i = 0; i < 15; i++) w.update(DT); };
  return { w, p, m, inst, release, settle };
}
{
  const f = fixture();
  f.w.useSkill(f.m, makeSkillInstance(SKILLS.shield_up, 1), vec(f.p.pos.x, f.p.pos.y));
  const before = f.m.life;
  f.release();
  check('a guarding victim blocks the bash damage', f.m.life === before);
  check('a blocked bash cannot stun through the guard', !f.m.isStunned());
  check('a blocked bash cannot push through the guard', !f.m.push);
}
{
  const f = fixture(); f.m.invulnerable = true;
  const before = f.m.life; f.release();
  check('an immune victim takes no bash damage', f.m.life === before);
  check('an immune bash applies no stun or knockback', !f.m.isStunned() && !f.m.push);
}
{
  const f = fixture(), before = f.m.life;
  f.release();
  check('an unblocked bash still damages, stuns and shoves',
    f.m.life < before && f.m.isStunned() && !!f.m.push);
  check('bash stun and shove retain their source attribution',
    f.m.statuses.find(s => s.id === 'stun')?.casterId === f.p.id && f.m.push?.caster === f.p);
}
for (const refusal of ['blocked', 'evaded'] as const) {
  let witnessed = false, leaked = false;
  for (let seed = 1; seed <= 40 && !witnessed; seed++) {
    const f = fixture();
    // Evasion is attack-tagged in the shared damage rules. Exercise a
    // bash-bearing attack guard without changing ordinary Shield Up tags.
    if (refusal === 'evaded') f.inst.def.tags = [...f.inst.def.tags, 'attack'];
    f.m.sheet.setSource('probe-refusal', [refusal === 'blocked'
      ? mod('blockChance', 'override', 1) : mod('evasion', 'override', 1e8)]);
    seedGlobalRandom(seed);
    setSimTap({ onHit: (caster, target, result) => {
      if (caster === f.p && target === f.m && result[refusal]) witnessed = true;
    } });
    try { f.release(); } finally { setSimTap(null); }
    if (witnessed) leaked = f.m.isStunned() || !!f.m.push;
  }
  check(`${refusal}: a real rolled refusal rejects bash control effects`, witnessed && !leaked);
}
{
  const f = fixture(true), before = f.m.life;
  f.release();
  check('a fused bash queues its damage', f.w.pendingFuses.length === 1 && f.m.life === before);
  check('fused stun and knockback wait for the damage', !f.m.isStunned() && !f.m.push);
  f.settle();
  check('a fused bash delivers all contact effects on arrival',
    f.m.life < before && f.m.isStunned() && !!f.m.push);
}
{
  const f = fixture(true); f.release();
  f.w.useSkill(f.m, makeSkillInstance(SKILLS.shield_up, 1), vec(f.p.pos.x, f.p.pos.y));
  const before = f.m.life; f.settle();
  check('a guard raised before fuse arrival blocks every bash component',
    f.m.life === before && !f.m.isStunned() && !f.m.push);
}
{
  const f = fixture(true); f.release(); const before = f.m.life;
  f.p.dead = true; f.settle();
  check('a dead caster leaves no delayed stun or shove',
    f.m.life === before && !f.m.isStunned() && !f.m.push);
}
console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
process.exitCode = failures ? 1 : 0;
