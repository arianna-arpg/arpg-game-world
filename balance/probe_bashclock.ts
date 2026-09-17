// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE ARM CLOCK (docs/engine/guard-bash.md § The arm clock):
// a shield bash is EARNED by the hold. The clock is layered data
// (GuardBashSpec.armTime → BASH_CFG.armTime, × the bashArmTime stat),
// resolved by World.refreshGuardBash into CastingState.bashArmAt and read
// through guardBashReady — the ONE fold the release check, the HUD's arm
// meter, the AI's hold (World.aiHoldOf) and the co-op wire share.
// Rigs: A the pure readied fold; B the player's early vs held release, the
// stat and per-skill dials, the taught + inverted contracts and the break
// burst's exemption; C the AI's wait-to-arm / early / authored-hold policies
// (BehaviorSpec.guardRelease) and the de-arming pressure; D the wire row;
// E the catalog census (every bash-bearing stance can actually arm).
// Run: npx tsx balance/probe_bashclock.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { applyBuild } from '../src/sim/builds';
import { PROBE_ATTRIBUTES } from '../src/sim/compat';
import { updateAI } from '../src/engine/ai';
import { BASH_CFG, guardBashReady, makeSkillInstance, type SkillDef, type SkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { serializeSnapshot } from '../src/net/snapshot';
import { SKILLS } from '../src/data/skills';
import { vec } from '../src/core/math';
import type { Actor } from '../src/engine/actor';
import type { BuildSpec } from '../src/sim/types';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
const near = (a: number, b: number, eps = 1e-6): boolean => Math.abs(a - b) <= eps;

bootSimEngine();
const DT = 1 / 60;
const ARM = BASH_CFG.armTime;

// === RIG A — the readied fold is pure and honest ===========================
{
  const base = { shield: 60, maxShield: 60, bashAt: 0.25, bashArmAt: 1 };
  const early = guardBashReady({ ...base, channelTime: 0.5 });
  check('A1 half a clock: fraction 0.5, line met, NOT ready',
    near(early.clock, 0.5) && early.line && !early.armed && !early.ready);
  const run = guardBashReady({ ...base, channelTime: 1 });
  check('A2 the clock run: ready (clock 1, armed, line)', run.clock === 1 && run.armed && run.line && run.ready);
  const low = guardBashReady({ ...base, channelTime: 2, shield: 6 });
  check('A3 clock run but the wall below its line: armed, not ready', low.armed && !low.line && !low.ready);
  const inv = guardBashReady({ ...base, channelTime: 2, shield: 6, bashAt: 0.75, bashLow: true });
  check('A4 inverted contract: a battered wall past the clock is ready', inv.ready);
  const mute = guardBashReady({ channelTime: 5, shield: 60, maxShield: 60 });
  check('A5 no bash (bashAt undefined): never ready, clock reads 1', !mute.line && !mute.ready && mute.clock === 1);
  const instant = guardBashReady({ ...base, bashArmAt: 0, channelTime: 0 });
  check('A6 a zero clock is instant (the per-skill armTime 0 lever)', instant.armed && instant.ready && instant.clock === 1);
}

// === RIG B — the player's hold ==============================================
const world = makeSimWorld('guardian', 0xa4c10c);
const spec: BuildSpec = {
  id: 'bashclock_probe', classId: 'guardian', level: 12, attributes: PROBE_ATTRIBUTES,
  skills: [
    { id: 'shield_up', level: 3 },                                                       // innate bash
    { id: 'spiked_bulwark', level: 3, supports: [{ id: 'answering_wall', level: 1 }] },  // TAUGHT bash
    { id: 'marching_bulwark', level: 3, supports: [{ id: 'hollow_answer', level: 1 }] }, // INVERTED bash
    { id: 'ice_shield', level: 3 },                                                      // bashOnBreak
  ],
};
const warnings = applyBuild(world, spec, 12);
if (warnings.length) console.log('build warnings:', warnings.join(' | '));
const p = world.player;
const step = (s: number): void => { for (let t = 0; t < s - 1e-9; t += DT) world.update(DT); };
const skill = (id: string): SkillInstance => p.skills.find(s => s?.def.id === id)!;
/** A fresh pinned victim in front of the hero — AI parked so nothing swings
 *  back at the wall mid-hold (the shield must stay where the rig put it). */
const mintVictim = (): Actor => {
  const v = world.createMonster('plains_wolf', 5, 'enemy');
  v.pos = { x: p.pos.x + 45, y: p.pos.y };
  v.aiCooldown = 9999;
  v.sheet.setBase('life', 4000);
  v.sheet.setBase('lifeRegen', 0); // a "no blow" read must not drift upward
  v.life = 4000;
  world.actors.push(v);
  return v;
};
const rearm = (v: Actor): void => {
  p.cooldowns.clear(); p.mana = p.maxMana(); p.useLock = 0;
  v.pos.x = p.pos.x + 45; v.pos.y = p.pos.y; v.vel.x = 0; v.vel.y = 0;
};
/** Raise `inst`, hold `holdSec`, optionally bleed the wall to `frac`, release;
 *  return the damage the release landed on `victim`. */
const holdRelease = (inst: SkillInstance, holdSec: number, victim: Actor, frac?: number): number => {
  rearm(victim);
  if (!world.useSkill(p, inst, { x: victim.pos.x, y: victim.pos.y })) return NaN;
  if (!p.casting || p.casting.mode !== 'guard') return NaN;
  step(holdSec);
  const cs = p.casting;
  if (!cs) return NaN;
  if (frac !== undefined) cs.shield = (cs.maxShield ?? 0) * frac;
  const before = victim.life;
  cs.held = false;
  step(0.25);
  return before - victim.life;
};

{
  const v = mintVictim();
  const su = skill('shield_up');
  // B1-B3 the field, the walk, the early drop.
  rearm(v);
  world.useSkill(p, su, { x: v.pos.x, y: v.pos.y });
  check('B1 the resolver writes bashArmAt = BASH_CFG.armTime on the bare stance',
    near(p.casting?.bashArmAt ?? -1, ARM), `bashArmAt=${p.casting?.bashArmAt}`);
  step(0.3);
  const walk = guardBashReady(p.casting!);
  check('B2 a third of the clock in: the meter reads the walk, line met, NOT ready',
    near(walk.clock, 0.3 / ARM, 0.02) && walk.line && !walk.ready, `clock=${walk.clock.toFixed(3)}`);
  const before = v.life;
  p.casting!.held = false; step(0.25);
  check('B3 an EARLY release is a plain drop: no blow, stance ended, cooldown stamped',
    v.life >= before && !p.casting && (p.cooldowns.get('shield_up') ?? 0) > 0,
    `life ${before.toFixed(1)} -> ${v.life.toFixed(1)} casting=${!!p.casting} cooldown=${p.cooldowns.get('shield_up')?.toFixed(2)}`);
  check('B4 a HELD release (past the clock) bashes', holdRelease(su, ARM + 0.05, v) > 0);
  check('B5 the line still rules a held release (10% < 25% → quiet)', holdRelease(su, ARM + 0.05, v, 0.1) <= 0);

  // B6-B8 the stat: bashArmTime halves the clock, live.
  p.sheet.setSource('probe-arm', [mod('bashArmTime', 'more', -0.5)]);
  rearm(v); world.useSkill(p, su, { x: v.pos.x, y: v.pos.y });
  check('B6 the bashArmTime stat scales the clock (×0.5 → bashArmAt halves)',
    near(p.casting?.bashArmAt ?? -1, ARM * 0.5), `bashArmAt=${p.casting?.bashArmAt}`);
  p.casting!.held = false; step(0.25);
  check('B7 …so a hold of half the shared clock now bashes', holdRelease(su, ARM * 0.5 + 0.05, v) > 0);
  p.sheet.removeSource('probe-arm');
  check('B8 …and the same hold is quiet again once the stat leaves', holdRelease(su, ARM * 0.5 + 0.05, v) <= 0);

  // B9-B11 the per-skill lever: armTime 0 = instant; 2× the shared clock = a longer commitment.
  const withArm = (armTime: number): SkillInstance => makeSkillInstance({ ...SKILLS.shield_up,
    guard: { ...SKILLS.shield_up.guard!, bash: { ...SKILLS.shield_up.guard!.bash!, armTime } } } as SkillDef, 1);
  check('B9 armTime 0: an instant release bashes (the contact probes\' isolation lever)',
    holdRelease(withArm(0), 0.05, v) > 0);
  const slow = withArm(ARM * 2);
  check('B10 armTime 2×: the shared clock is NOT enough for this stance', holdRelease(slow, ARM + 0.2, v) <= 0);
  check('B11 armTime 2×: its own clock is', holdRelease(slow, ARM * 2 + 0.05, v) > 0);

  // B12-B13 the TAUGHT bash (Answering Wall on the spiked wall) wears the same clock.
  const taught = skill('spiked_bulwark');
  check('B12 a TAUGHT bash released early stays quiet', holdRelease(taught, 0.3, v) <= 0);
  check('B13 …and answers once the clock has run', holdRelease(taught, ARM + 0.05, v) > 0);

  // B14-B15 the INVERTED contract (Hollow Answer): battered AND held.
  const inv = skill('marching_bulwark');
  check('B14 an INVERTED bash: battered but released early stays quiet', holdRelease(inv, 0.3, v, 0.3) <= 0);
  check('B15 …battered and held past the clock cashes what the wall lost', holdRelease(inv, ARM + 0.05, v, 0.3) > 0);

  // B16 a BREAK is not a release: the ice shell's dying burst stays instant.
  const ice = skill('ice_shield');
  rearm(v);
  world.useSkill(p, ice, { x: v.pos.x, y: v.pos.y });
  step(0.2);
  const before2 = v.life;
  p.casting!.shield = 1; // one point from breaking
  world.executeSkill(v, makeSkillInstance({ ...SKILLS.claw,
    baseDamage: { physical: [1000, 1000] } } as SkillDef, 1), vec(p.pos.x, p.pos.y));
  step(0.1);
  check('B16 a BREAK is not a release: the ice shell broken at 0.2s still bursts (bashOnBreak)',
    !p.casting && v.life < before2, `landed=${(before2 - v.life).toFixed(1)}`);
  v.dead = true;
}

// === RIG C — the shield hand's hold (the AI reads the same readiness) =======
seedGlobalRandom(0x5a17);
function fixture() {
  const w = makeSimWorld('guardian', 0x5a17);
  const hero = w.player;
  hero.pos = vec(w.arena.w / 2 + 45, w.arena.h / 2);
  hero.sheet.setSource('probe-defense', [mod('life', 'flat', 4000), mod('armor', 'override', 0),
    mod('blockChance', 'override', 0), mod('evasion', 'override', 0)]);
  hero.fillResources();
  const m = w.createMonster('sylvan_warden', 1, 'enemy');
  m.pos = vec(hero.pos.x - 45, hero.pos.y);
  m.facing = m.facingPrev = 0;
  m.sheet.setSource('probe-crit', [mod('critChance', 'override', 0)]);
  w.actors.push(m);
  return { w, hero, m };
}
type Fix = ReturnType<typeof fixture>;
const raise = (f: Fix, windup: number | undefined, hold = 0) => {
  const inst = f.m.skills.find(s => s?.def.id === 'shield_up')!;
  if (!f.w.useSkill(f.m, inst, vec(f.hero.pos.x, f.hero.pos.y))) throw new Error('guard setup failed');
  const cs = f.m.casting!;
  cs.aiHold = hold; cs.aiGuardWindup = windup; cs.aiRecovery = 0.7;
  return cs;
};
const run = (f: Fix, s: number): void => { for (let t = 0; t < s - 1e-9; t += DT) f.w.update(DT); };
const until = (f: Fix, pred: () => boolean, max = 4): number => {
  for (let i = 0; i < Math.ceil(max / DT) && !pred(); i++) f.w.update(DT);
  return f.w.time;
};
{
  // C1-C2 wait-to-arm (the default): a zero roll still holds to the clock.
  const f = fixture(), cs = raise(f, 0.55);
  const before = f.hero.life;
  let warnedAt = -1, hitAt = -1;
  for (let i = 0; i < 240 && f.m.casting; i++) {
    f.w.update(DT);
    if (warnedAt < 0 && cs.aiGuardReleaseAt !== undefined) warnedAt = f.w.time;
    if (hitAt < 0 && f.hero.life < before) hitAt = f.w.time;
  }
  check('C1 wait-to-arm: the warning begins when the clock\'s remainder equals the windup',
    warnedAt >= 0 && near(warnedAt, Math.max(0, ARM - 0.55), DT + 1e-8), `warning=${warnedAt.toFixed(3)}`);
  check('C2 …and the bash lands the moment the clock runs (never before)',
    hitAt >= 0 && hitAt + 1e-6 >= ARM && near(hitAt, Math.max(ARM, 0.55), 2 * DT + 1e-8) && !f.m.casting,
    `hit=${hitAt.toFixed(3)}`);
}
{
  // C3 no windup: unwarned, but still clock-honest.
  const f = fixture(), cs = raise(f, undefined);
  const before = f.hero.life;
  const t = until(f, () => !f.m.casting);
  check('C3 an unwarned hand still waits for its answer: release at the clock, WITH the bash, never a warning',
    f.hero.life < before && cs.aiGuardReleaseAt === undefined && near(t, ARM, 2 * DT + 1e-8), `release=${t.toFixed(3)}`);
}
{
  // C4 a roll outlasting the clock stands as rolled (the extension never shortens a hold).
  const f = fixture(); raise(f, undefined, ARM + 0.8);
  const before = f.hero.life;
  const t = until(f, () => !f.m.casting);
  check('C4 a longer roll stands: release on the roll, with the bash',
    f.hero.life < before && near(t, ARM + 0.8, 2 * DT + 1e-8), `release=${t.toFixed(3)}`);
}
{
  // C5 a battered wall has no answer to wait for: it drops on its roll, quiet.
  const f = fixture(), cs = raise(f, 0.55);
  cs.shield = cs.maxShield! * 0.1;
  const before = f.hero.life;
  f.w.update(DT);
  check('C5 below the line the hand drops on its (zero) roll — no wait, no warning, no blow',
    !f.m.casting && cs.aiGuardReleaseAt === undefined && f.hero.life === before);
}
{
  // C6 pressure de-arms the wait: batter the wall mid-clock and the hand gives up at once.
  const f = fixture(), cs = raise(f, undefined);
  run(f, 0.3);
  check('C6a mid-clock the hand is still holding (the extension stands while the line does)', f.m.casting === cs);
  const before = f.hero.life;
  cs.shield = cs.maxShield! * 0.1;
  f.w.update(DT);
  check('C6b pressure mid-clock de-arms the wait: the wall drops at once, quiet',
    !f.m.casting && f.hero.life === before);
}
{
  // C7-C8 the DATA dials: an authored hold + waitToArm false = a skittish wall.
  const f = fixture();
  f.m.skills = [f.m.skills.find(s => s?.def.id === 'shield_up')!];
  f.m.brain = { type: 'protector', behavior: { castArc: 0.6, guardRelease: { windup: 0.55, hold: [0.3, 0.3], waitToArm: false } } };
  f.m.aiTargetId = f.hero.id;
  for (let i = 0; i < 600 && !f.m.casting; i++) { updateAI(f.m, f.w, DT); f.w.update(DT); }
  const cs = f.m.casting;
  check('C7 the press copies the authored hold and the early policy onto the cast',
    !!cs && cs.mode === 'guard' && cs.aiGuardEarly === true && near(cs.aiHold ?? -1, 0.3),
    `aiHold=${cs?.aiHold} early=${cs?.aiGuardEarly}`);
  const pressedAt = f.w.time, before = f.hero.life;
  let warned = false;
  for (let i = 0; i < 120 && f.m.casting; i++) {
    updateAI(f.m, f.w, DT); f.w.update(DT);
    if (cs?.aiGuardReleaseAt !== undefined) warned = true;
  }
  check('C8 the skittish wall drops on its 0.3s roll: no warning, no blow',
    !f.m.casting && !warned && f.hero.life === before && near(f.w.time - pressedAt, 0.3, 2 * DT + 1e-8),
    `held=${(f.w.time - pressedAt).toFixed(3)}`);
}
{
  // C9-C10 an authored hold with the default policy: the roll stands, the bash rides it.
  const f = fixture();
  f.m.skills = [f.m.skills.find(s => s?.def.id === 'shield_up')!];
  f.m.brain = { type: 'protector', behavior: { castArc: 0.6, guardRelease: { hold: [ARM + 0.6, ARM + 0.6] } } };
  f.m.aiTargetId = f.hero.id;
  for (let i = 0; i < 600 && !f.m.casting; i++) { updateAI(f.m, f.w, DT); f.w.update(DT); }
  const cs = f.m.casting;
  const pressedAt = f.w.time, before = f.hero.life;
  check('C9 an authored hold rides the cast (no early flag)',
    !!cs && near(cs.aiHold ?? -1, ARM + 0.6) && cs.aiGuardEarly === undefined, `aiHold=${cs?.aiHold}`);
  for (let i = 0; i < 600 && f.m.casting; i++) { updateAI(f.m, f.w, DT); f.w.update(DT); }
  check('C10 …and the wall releases on that hold with its bash',
    f.hero.life < before && near(f.w.time - pressedAt, ARM + 0.6, 2 * DT + 1e-8),
    `held=${(f.w.time - pressedAt).toFixed(3)}`);
}

// === RIG D — the wire ======================================================
{
  const v = mintVictim();
  rearm(v);
  world.useSkill(p, skill('shield_up'), { x: v.pos.x, y: v.pos.y });
  step(0.2);
  try {
    const row = serializeSnapshot(world, 0).actors.find(a => a.id === p.id);
    check('D1 the wire ships bashArmAt beside bashAt/bashLow/channelTime',
      !!row?.cast && near(row.cast.bashArmAt ?? -1, ARM) && near(row.cast.channelTime ?? -1, p.casting?.channelTime ?? -2),
      `cast=${JSON.stringify(row?.cast)}`);
    check('D2 the client re-folds the SAME readiness from the shipped row',
      !!row?.cast && guardBashReady(row.cast).clock === guardBashReady(p.casting!).clock
        && guardBashReady(row.cast).ready === guardBashReady(p.casting!).ready);
  } catch (e) {
    check('D1/D2 the wire rig ran', false, String(e));
  }
  p.casting!.held = false; step(0.25);
  v.dead = true;
}

// === RIG E — the catalog census ============================================
{
  const stances = Object.values(SKILLS).filter(s => s.castMode === 'guard' && s.guard?.bash);
  check('E1 census: the three innate bashers of the differentiation all stand',
    ['ice_shield', 'marching_bulwark', 'shield_up'].every(id => stances.some(s => s.id === id)),
    stances.map(s => s.id).join());
  check('E2 census: every bash-bearing stance can actually arm (no maxDuration shorter than its clock)',
    stances.every(s => s.guard!.maxDuration === undefined || (s.guard!.bash!.armTime ?? ARM) <= s.guard!.maxDuration!));
  check('E3 the shared clock is a real hold (BASH_CFG.armTime > 0) — the quick-fire refusal stands', ARM > 0);
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL CHECKS PASSED');
process.exit(failed ? 1 : 0);
