// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE TIMEFLOW FABRIC's castChrono bridge, BOTH consumers
// end to end on the real engine (docs/engine/timeflow.md):
//   A) the SKILL door — SkillDef.chrono → executeSkill → castChrono: an
//      actor-scoped stop whose exempt circle stays live, expiring on the
//      raw clock, re-casts refreshing one hold;
//   B) the SCRIPT door — the `{ do: 'chrono' }` AIAction → runAIActions →
//      castChrono: the world-scoped phase-reveal held frame (the world
//      clock STOPS), refresh under fast-chained re-fires (the Zone-Memory
//      re-entry law), the `chrono:script:<id>` hold-id contract, and the
//      policy seam (the beat is no MENU — Timeflow.allowHold's solo-only
//      law passes it by, so a co-op join can never strand a boss fight);
//   C) the DEBUT — the Unmade (unmade_chronophage) walked through its REAL
//      script FSM: crossing the conjurer HP gate holds the world, no cheap
//      hits land while held, and the beat lets go on schedule;
//   D) the HONESTY CENSUS — every authored script beat repo-wide is finite,
//      brief (≤ the cap), and a stop or slow-motion, never fast-forward;
//      the Unmade's two beats exist and are world-scoped reveals.
// Run: npx tsx balance/probe_timeflow.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { MONSTERS } from '../src/data/monsters';
import { makeSkillInstance } from '../src/engine/skills';
import { updateAI } from '../src/engine/ai';
import { runAIActions } from '../src/engine/aiActions';
import { dist, vec } from '../src/core/math';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x71f0);

const DT = 1 / 60;
// The HOST frame loop, verbatim (sim/runner.ts order): AI per actor, then
// the world tick. Holds age on RAW frame seconds inside w.update.
const step = (w: ReturnType<typeof makeSimWorld>, sec: number): void => {
  for (let t = 0; t < sec; t += DT) {
    for (const a of w.actors) updateAI(a, w, DT);
    w.update(DT);
  }
};
/** Live hold count — reaching past the private field on purpose: the
 *  refresh law is a COUNT claim (one hold, never a staircase), and no
 *  public read exposes it. */
const holdCount = (w: ReturnType<typeof makeSimWorld>): number =>
  (w.timeflow as unknown as { holds: unknown[] }).holds.length;

// --- A) The SKILL door: the fabric's founding consumer ----------------------
{
  const w = makeSimWorld('sorcerer', 0x71f1);
  const p = w.player;
  const foe = w.createMonster('lesser_brute', 5, 'enemy');
  foe.pos = vec(p.pos.x + 300, p.pos.y);
  w.actors.push(foe);
  const inst = makeSkillInstance(SKILLS.time_stop, 1);
  w.executeSkill(p, inst, vec(p.pos.x, p.pos.y));
  check('A: the cast minted a live hold', w.timeflow.active);
  check('A: actor-scoped — the WORLD clock keeps flowing',
    w.timeflow.worldScale() === 1);
  check('A: the foe is fully held', w.timeflow.actorScale(foe) === 0);
  check('A: the caster walks its own stop (the exempt circle)',
    w.timeflow.actorScale(p) === 1);
  const t0 = w.time;
  const fp = vec(foe.pos.x, foe.pos.y);
  step(w, 1.0);
  check('A: world time flowed for the exempt world', w.time > t0);
  check('A: the held foe did not move', dist(foe.pos, fp) < 1e-6,
    `moved ${dist(foe.pos, fp).toFixed(3)}`);
  w.executeSkill(p, inst, vec(p.pos.x, p.pos.y));
  check('A: a re-cast REFRESHES one hold, never stacks', holdCount(w) === 1,
    `holds=${holdCount(w)}`);
  step(w, 3.2); // past the refreshed 2.6 s, on the raw clock
  check('A: the hold expired on the raw clock and the foe resumed',
    !w.timeflow.active && w.timeflow.actorScale(foe) === 1);
}

// --- B) The SCRIPT door: the verb crosses the same bridge -------------------
{
  const w = makeSimWorld('warrior', 0x71f2);
  const boss = w.createMonster('unmade_chronophage', 20, 'enemy');
  boss.pos = vec(w.player.pos.x + 400, w.player.pos.y);
  w.actors.push(boss);
  runAIActions(w, boss,
    [{ do: 'chrono', duration: 0.6, world: true, label: 'probe beat' }]);
  check('B: the verb crossed castChrono into a WORLD hold',
    w.timeflow.active && w.timeflow.worldScale() === 0);
  const t0 = w.time;
  step(w, 0.3);
  check('B: the world clock is STOPPED while the beat holds', w.time === t0);
  runAIActions(w, boss, [{ do: 'chrono', duration: 0.6, world: true }]);
  check('B: a fast-chained re-fire REFRESHES one hold (the re-entry law)',
    holdCount(w) === 1, `holds=${holdCount(w)}`);
  step(w, 0.75); // past the refreshed 0.6 s on the raw clock
  check('B: the beat expired out of the very clock it stopped',
    !w.timeflow.active && w.time > t0);

  // The policy seam: the beat is no MENU. The solo-only allowHold law
  // (main.ts wires it to "no live co-op peers") gates 'menu'-kind holds
  // ONLY — the world's own fight beat must ride through in co-op, brief
  // and duration-bounded, or a join would strand the boss's choreography.
  w.timeflow.allowHold = () => false;
  runAIActions(w, boss, [{ do: 'chrono', duration: 0.5, world: true }]);
  check('B: the beat is no MENU — the solo-only policy passes it by',
    w.timeflow.active && !w.timeflow.heldBy('menu'));
  w.timeflow.release(`chrono:script:${boss.id}`);
  check('B: the hold wears the documented id (chrono:script:<actorId>)',
    !w.timeflow.active);
}

// --- C) The DEBUT: the Unmade's reveal through the REAL script FSM ----------
{
  const w = makeSimWorld('warrior', 0x71f3);
  const p = w.player;
  p.invulnerable = true;
  const boss = w.createMonster('unmade_chronophage', 20, 'enemy');
  boss.pos = vec(p.pos.x + 220, p.pos.y);
  w.actors.push(boss);
  step(w, 0.5); // seat the FSM in its opening act
  boss.life = boss.maxLife() * 0.6; // under the 0.66 gate → the conjurer
  let held = false;
  for (let t = 0; t < 8 && !held; t += DT) {
    for (const a of w.actors) updateAI(a, w, DT);
    w.update(DT);
    if (boss.dead) break;
    if (w.timeflow.worldScale() === 0) held = true;
  }
  check('C: crossing the conjurer gate HELD the world (the flood reveal)', held);
  const t0 = w.time;
  step(w, 0.4);
  check('C: no cheap hits — the whole sim hangs, the chronophage included',
    w.time === t0);
  step(w, 1.2); // the beat is 0.85 s — let it expire
  check('C: the beat let go on schedule and the fight resumed',
    w.timeflow.worldScale() === 1 && w.time > t0);
}

// --- D) The HONESTY CENSUS: authored beats stay brief, forever --------------
{
  // A held frame is a REVEAL, not a cutscene: the cap is law, so a future
  // 30-second stop is a probe failure instead of a surprise. The verb's
  // `duration` is required at the type level; this census guards the
  // NUMBERS every def actually wrote.
  const CAP = 1.5;
  type Beat = { duration: number; scale?: number; world?: boolean };
  const beats: { id: string; act: Beat }[] = [];
  const walk = (id: string, v: unknown): void => {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) { for (const x of v) walk(id, x); return; }
    const o = v as Record<string, unknown>;
    if (o.do === 'chrono') beats.push({ id, act: o as unknown as Beat });
    for (const k of Object.keys(o)) walk(id, o[k]);
  };
  for (const [id, def] of Object.entries(MONSTERS)) walk(id, def.brain);
  const unmade = beats.filter(b => b.id === 'unmade_chronophage');
  check('D: the debut exists — the Unmade carries two held-frame reveals',
    unmade.length === 2, `found ${unmade.length}`);
  check('D: the Unmade\'s beats are world-scoped reveals (never one-sided)',
    unmade.length > 0 && unmade.every(b => b.act.world === true));
  for (const b of beats) {
    check(`D: ${b.id} beat is finite and brief (≤${CAP}s)`,
      Number.isFinite(b.act.duration) && b.act.duration > 0 && b.act.duration <= CAP,
      `duration=${b.act.duration}`);
    check(`D: ${b.id} beat stops or slows, never fast-forwards`,
      (b.act.scale ?? 0) >= 0 && (b.act.scale ?? 0) < 1,
      `scale=${b.act.scale ?? 0}`);
  }
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
