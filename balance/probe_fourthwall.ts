// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE FOURTH WALL end to end on the real engine
// (engine/fourthwall.ts; docs/engine/fourthwall.md). Pins:
//   - THE MATH: frameReflect is a pure component-flip + clamp — inside is
//     null, each wall flips its own axis, a corner flips both in one call,
//     the pad insets, and the fallback rect centers on its point,
//   - THE FRAME REBOUND (projFrameBounce): a socketed Mirrored Bounds banks
//     a real firebolt off the fallback frame's edge — the flight never
//     crosses the wall, its range is RE-ARMED by the rebound (it outflies
//     its own range), and it comes back INTO the fight; the naked control
//     flight sails straight through where the wall would have stood
//     (absent == identical: no phantom walls without the lever),
//   - THE KINDRED FOLD: the gem's stat lands on the projectile as a budget
//     (frameBounces 2 at spawn); the naked flight carries none,
//   - THE CAROM MOTOR (Caged Comet): the cast stamps the frame lock from
//     the frame that governs the caster THAT instant (StatusDef.frameLock,
//     the rising-edge law), the ball stays INSIDE the stamped walls for the
//     whole ride while banking off them, contact pays the skill's payload
//     through resolveHit on the rehit clock, and expiry ends motor + status
//     + lock through the one door,
//   - THE ONE CLOCK: hard CC ends the ride (stun → motor + status + lock
//     all gone), and a willed dash quits the ride first (the saddle law),
//   - VOLITION: movementLocked holds while the ride runs (the stick feeds
//     nothing) and releases at the stop,
//   - FACTION-BLIND: a MONSTER cast of the same skill locks its own frame
//     and stays caged exactly the same way (no player special case),
//   - DETERMINISM: two identically seeded rides trace byte-identical paths
//     (the headless fallback frame is a pure function of its bearer),
//   - THE TELL CENSUS: the caroming status wears the 'framecage' screen fx
//     and declares frameLock — the wall the player banks off is drawn.
// Run: npx tsx balance/probe_fourthwall.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { vec } from '../src/core/math';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import { FOURTH_WALL_CFG, fallbackRect, frameReflect } from '../src/engine/fourthwall';
import { makeSkillInstance, supportFitsInst } from '../src/engine/skills';
import { STATUS_DEFS } from '../src/engine/status';
import { STATUS_FX_REGISTRY } from '../src/render/screenFx';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();

const step = (w: World, n = 1): void => { for (let i = 0; i < n; i++) w.update(1 / 60); };
const feed = (a: Actor): void => { a.sheet.setBase('mana', 400); a.fillResources(); };
const spawn = (w: World, id: string, lv: number, x: number, y: number): Actor => {
  const m = w.createMonster(id, lv, 'enemy');
  m.pos = vec(x, y);
  w.actors.push(m);
  return m;
};

// ------------------------------------------------------------------ the math
{
  const rect = { x: 0, y: 0, w: 1000, h: 600 };
  check('math: a body inside the rect reflects nothing',
    frameReflect(500, 300, 0.7, 10, rect) === null);
  const right = frameReflect(995, 300, 0, 10, rect)!;
  check('math: the east wall flips the east-bound heading and clamps inside',
    !!right && Math.cos(right.dir) < 0 && right.x <= 990 && Math.abs(Math.sin(right.dir)) < 1e-9,
    right ? `dir ${right.dir.toFixed(3)} x ${right.x}` : 'null');
  const corner = frameReflect(998, 598, Math.PI / 4, 10, rect)!;
  check('math: a corner flips BOTH axes in one honest call',
    !!corner && Math.cos(corner.dir) < 0 && Math.sin(corner.dir) < 0);
  const pad = frameReflect(992, 300, 0, 10, rect, 5)!;
  check('math: the pad insets the wall (steps clear at w - r - pad)',
    !!pad && pad.x === 985, pad ? `x ${pad.x}` : 'null');
  const fb = fallbackRect(800, 600);
  check('math: the fallback frame centers on its point at the config half-dims',
    fb.x === 800 - FOURTH_WALL_CFG.fallback.halfW && fb.w === FOURTH_WALL_CFG.fallback.halfW * 2
    && fb.y === 600 - FOURTH_WALL_CFG.fallback.halfH && fb.h === FOURTH_WALL_CFG.fallback.halfH * 2);
}

// ---------------------------------------------------- the frame rebound lane
// Fire a firebolt straight DOWN (range 520 > the fallback halfH 380, so the
// wall stands well inside the flight's road). Naked: it sails through where
// the wall would be. Socketed with Mirrored Bounds: it banks at the wall,
// range re-armed, and climbs back into the fight.
{
  const yWall = (cy: number): number => cy + FOURTH_WALL_CFG.fallback.halfH;

  // The naked control: no lever, no wall — absent == identical.
  seedGlobalRandom(7);
  const w = makeSimWorld('warrior', 7);
  w.player.pos = vec(800, 520);
  feed(w.player);
  const fb0 = makeSkillInstance(SKILLS.firebolt, 1, 2);
  check('control: the cast is accepted', w.useSkill(w.player, fb0, vec(800, 1200)) === true);
  let maxY0 = -Infinity;
  let sawFlight0 = false;
  let budget0: number | undefined = 99;
  for (let i = 0; i < 480 && (!sawFlight0 || w.projectiles.length); i++) {
    step(w);
    for (const p of w.projectiles) {
      sawFlight0 = true;
      budget0 = (p as { frameBounces?: number }).frameBounces;
      if (p.pos.y > maxY0) maxY0 = p.pos.y;
    }
  }
  check('control: the naked flight carries NO rebound budget (absent == identical)',
    sawFlight0 && budget0 === undefined, `budget ${String(budget0)}`);
  check('control: it sails PAST where the wall would stand and spends its full range',
    maxY0 > yWall(520) + 60 && maxY0 > 520 + 440,
    `maxY ${maxY0.toFixed(0)} vs wall ${yWall(520)}`);

  // The socketed flight: Mirrored Bounds grants the budget, the wall banks.
  seedGlobalRandom(7);
  const w2 = makeSimWorld('warrior', 7);
  w2.player.pos = vec(800, 520);
  feed(w2.player);
  const fb1 = makeSkillInstance(SKILLS.firebolt, 1, 2);
  fb1.sockets[0] = { def: SUPPORTS.mirrored_bounds, level: 1 };
  check('gate: Mirrored Bounds fits the projectile host',
    supportFitsInst(SUPPORTS.mirrored_bounds, fb1));
  check('rebound: the cast is accepted', w2.useSkill(w2.player, fb1, vec(800, 1200)) === true);
  let maxY1 = -Infinity, minYAfterPeak = Infinity, travelDown = 0, travelUp = 0;
  let sawFlight1 = false, peaked = false;
  let budget1: number | undefined;
  let prevY: number | null = null;
  for (let i = 0; i < 600 && (!sawFlight1 || w2.projectiles.length); i++) {
    step(w2);
    const p = w2.projectiles[0];
    if (!p) { prevY = null; continue; }
    if (!sawFlight1) budget1 = (p as { frameBounces?: number }).frameBounces;
    sawFlight1 = true;
    if (prevY !== null) {
      const dy = p.pos.y - prevY;
      if (dy > 0) travelDown += dy; else travelUp -= dy;
    }
    prevY = p.pos.y;
    if (p.pos.y > maxY1) maxY1 = p.pos.y;
    if (p.pos.y >= yWall(520) - 40) peaked = true;
    if (peaked && p.pos.y < minYAfterPeak) minYAfterPeak = p.pos.y;
  }
  check('fold: the gem lands a 2-rebound budget on the flight at spawn',
    budget1 === 2, `budget ${String(budget1)}`);
  check('rebound: the flight NEVER crosses the frame wall (drawn == tested)',
    sawFlight1 && maxY1 <= yWall(520) + 3, `maxY ${maxY1.toFixed(1)} wall ${yWall(520)}`);
  check('rebound: the wall re-arms the road — the flight outflies its own range',
    travelDown + travelUp > 520 + 120, `flew ${(travelDown + travelUp).toFixed(0)} of range 520`);
  check('rebound: it comes back INTO the fight (climbs well clear of the wall)',
    minYAfterPeak < yWall(520) - 200, `returned to ${minYAfterPeak.toFixed(0)}`);
  check('rebound: the flight still DIES (a budget is a budget, not immortality)',
    w2.projectiles.length === 0);
}

// ----------------------------------------------------------- the carom motor
{
  seedGlobalRandom(23);
  const w = makeSimWorld('warrior', 23);
  w.player.pos = vec(800, 600);
  feed(w.player);
  const prey = spawn(w, 'zombie', 1, 1100, 600);
  prey.sheet.setBase('life', 4000); // a wall of meat: count hits, survive them
  prey.fillResources();
  const cc = makeSkillInstance(SKILLS.caged_comet, 1, 2);
  check('carom: the cast is accepted', w.useSkill(w.player, cc, vec(1600, 600)) === true);
  check('carom: the motor stands and the ride status is worn',
    !!w.player.caromRun && w.player.statuses.some(s => s.id === 'caroming'));
  step(w);
  const lock = w.player.frameLockRect;
  check('lock: the rising edge stamps the frame where the cast stood',
    !!lock && Math.abs(lock.x + lock.w / 2 - 800) < 40 && Math.abs(lock.y + lock.h / 2 - 600) < 40
    && lock.w === FOURTH_WALL_CFG.fallback.halfW * 2,
    lock ? `center ${(lock.x + lock.w / 2).toFixed(0)},${(lock.y + lock.h / 2).toFixed(0)}` : 'null');
  check('volition: the ride is a movement lock (the stick feeds nothing)',
    w.movementLocked(w.player));
  let outOfCage = 0, maxX = -Infinity, minXAfterEast = Infinity, hits = 0;
  let prevLife = prey.life;
  let reachedEast = false;
  for (let i = 0; i < 210; i++) {
    step(w);
    if (w.player.caromRun && lock) {
      const inX = w.player.pos.x >= lock.x - 2 && w.player.pos.x <= lock.x + lock.w + 2;
      const inY = w.player.pos.y >= lock.y - 2 && w.player.pos.y <= lock.y + lock.h + 2;
      if (!inX || !inY) outOfCage++;
      if (w.player.pos.x > maxX) maxX = w.player.pos.x;
      if (w.player.pos.x >= lock.x + lock.w - w.player.radius - 30) reachedEast = true;
      if (reachedEast && w.player.pos.x < minXAfterEast) minXAfterEast = w.player.pos.x;
    }
    if (prey.life < prevLife - 0.01) hits++;
    prevLife = prey.life;
  }
  check('cage: the ball never leaves the stamped walls for the whole ride',
    outOfCage === 0, `${outOfCage} escapes, maxX ${maxX.toFixed(0)}`);
  check('bank: it reached the east wall and came back west (a real rebound)',
    reachedEast && minXAfterEast < maxX - 250,
    `east ${reachedEast}, back to ${minXAfterEast.toFixed(0)} from ${maxX.toFixed(0)}`);
  check('contact: the prey in the lane was struck through the one pipeline',
    hits >= 1, `${hits} hits`);
  check('contact: the rehit clock throttles the grind (no per-tick chainsaw)',
    hits <= 8, `${hits} hits over 3.5s at rehit ${FOURTH_WALL_CFG.carom.rehitSec}s`);
  check('expiry: motor, status and lock all end through the one door',
    !w.player.caromRun && !w.player.statuses.some(s => s.id === 'caroming')
    && !w.player.frameLockRect && !w.movementLocked(w.player));
}

// ------------------------------------------------- the one clock, both ways
{
  seedGlobalRandom(31);
  const w = makeSimWorld('warrior', 31);
  w.player.pos = vec(800, 600);
  feed(w.player);
  check('cc: the ride starts', w.useSkill(w.player, makeSkillInstance(SKILLS.caged_comet, 1, 2), vec(1600, 600)) === true);
  step(w, 10);
  w.player.applyStatus('stun', 0, 1, 'probe');
  step(w, 2);
  check('cc: hard CC ends the ride — motor, status and lock all gone',
    !w.player.caromRun && !w.player.statuses.some(s => s.id === 'caroming') && !w.player.frameLockRect);

  seedGlobalRandom(37);
  const w2 = makeSimWorld('warrior', 37);
  w2.player.pos = vec(800, 600);
  feed(w2.player);
  check('saddle: the ride starts', w2.useSkill(w2.player, makeSkillInstance(SKILLS.caged_comet, 1, 2), vec(1600, 600)) === true);
  step(w2, 10);
  const dashed = w2.useSkill(w2.player, makeSkillInstance(SKILLS.dash, 1, 2), vec(400, 600));
  check('saddle: a willed dash quits the ride first (the saddle law)',
    dashed === true && !w2.player.caromRun && !!w2.player.dash,
    `dashed ${dashed}`);
}

// ------------------------------------------------------------- faction-blind
{
  seedGlobalRandom(41);
  const w = makeSimWorld('warrior', 41);
  w.player.pos = vec(100, 100); // outside the monster's cage — a witness only
  const z = spawn(w, 'zombie', 3, 800, 600);
  feed(z);
  const cast = w.useSkill(z, makeSkillInstance(SKILLS.caged_comet, 1, 2), vec(1500, 600));
  check('monster: the same skill casts from an enemy body (no player special case)',
    cast === true && !!z.caromRun);
  step(w);
  const zl = z.frameLockRect;
  check('monster: it locks ITS OWN frame, never the player\'s drawn one',
    !!zl && Math.abs(zl.x + zl.w / 2 - 800) < 40 && Math.abs(zl.y + zl.h / 2 - 600) < 40,
    zl ? `center ${(zl.x + zl.w / 2).toFixed(0)},${(zl.y + zl.h / 2).toFixed(0)}` : 'null');
  let zOut = 0;
  for (let i = 0; i < 200; i++) {
    step(w);
    if (z.caromRun && zl) {
      if (z.pos.x < zl.x - 2 || z.pos.x > zl.x + zl.w + 2
        || z.pos.y < zl.y - 2 || z.pos.y > zl.y + zl.h + 2) zOut++;
    }
  }
  check('monster: caged exactly the same way (physics, not allegiance)',
    zOut === 0 && !z.caromRun, `${zOut} escapes, motor ${!!z.caromRun}`);
}

// -------------------------------------------------------------- determinism
{
  const ride = (): string => {
    seedGlobalRandom(53);
    const w = makeSimWorld('warrior', 53);
    w.player.pos = vec(800, 600);
    feed(w.player);
    w.useSkill(w.player, makeSkillInstance(SKILLS.caged_comet, 1, 2), vec(1600, 700));
    const path: string[] = [];
    for (let i = 0; i < 200; i++) {
      step(w);
      if (i % 10 === 0) path.push(`${w.player.pos.x.toFixed(3)},${w.player.pos.y.toFixed(3)}`);
    }
    return path.join('|');
  };
  const a = ride(), b = ride();
  check('determinism: two identically seeded rides trace byte-identical paths',
    a === b);
}

// ------------------------------------------------------------------ the data
{
  check('data: the caroming status declares the frame lock (the status\'s law)',
    STATUS_DEFS.caroming?.frameLock === true);
  check('data: the wall is DRAWN — caroming wears the framecage screen fx',
    STATUS_FX_REGISTRY['caroming']?.kind === 'framecage');
  check('data: Caged Comet rides the carom delivery',
    SKILLS.caged_comet?.delivery.type === 'carom');
  check('gate: Mirrored Bounds refuses a flightless host (honesty, self-lifting)',
    !supportFitsInst(SUPPORTS.mirrored_bounds, makeSkillInstance(SKILLS.cleave, 1, 2)));
}

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL OK');
process.exit(failed ? 1 : 0);
