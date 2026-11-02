// ---------------------------------------------------------------------------
// THE INTENT LAYER PROBE (docs/design/npc-ai-direction.md, phases 4 and 5).
//   A. The body's die: same run seed and body, same rolls; another seed, other rolls;
//      and it never moves the global die, so a body thinking re-deals nothing else.
//   B. The think clock: the first beat is staggered by id, the gaps sit in range.
//   C. The A/B lever: off, a body with the axis fights exactly like one without it;
//      on, the pilot body really fights differently.
//   D. The axis folds through mergeTuning like every other, and null clears it.
//   E. The band-switch column reads on a real fight.
//   F. A pilot body decides: the knight's priority order means what it says, and it
//      still swings once its curse rests.
//   G. The feet follow the decision: with its fire resting, the imp walks in to claw;
//      with its claw resting, it keeps its distance and throws fire, where the plain
//      imp walks into melee anyway.
//   H. Busy hands keep the decision: a body never decides mid-cast or mid-recovery.
//   I. No flip-flop: against a still hero, no pilot body changes band more than once per
//      3 s, or much more than it did without the layer.
//   J. Same seed, same fight.
// Run: npx tsx balance/probe_intent.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { INTENT_CFG } from '../src/data/aiIntent';
import { MONSTERS } from '../src/data/monsters';
import { mergeTuning } from '../src/engine/brain';
import { bodyRoll, thinkDue } from '../src/engine/intent';
import { updateAI } from '../src/engine/ai';
import type { Actor } from '../src/engine/actor';
import { mod } from '../src/engine/stats';
import { setSimTap } from '../src/engine/tap';
import { runEpisode } from '../src/sim/runner';
import { threatScenario } from '../src/sim/sweeps';
import { matchupDuel, pilotFor } from '../src/sim/data/scenarios';
import { ensureTierBuild } from '../src/sim/data/builds';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
const PILOT = Object.keys(MONSTERS).filter(id => MONSTERS[id].brain?.intent);
const build = ensureTierBuild('geared', 'warrior', 12);
const duel = (id: string, seed: number, seconds = 20) =>
  runEpisode(matchupDuel(build, id, { level: 12, duration: seconds, pilot: pilotFor('warrior'), idTag: 'intent' }), seed);
const same = (a: ReturnType<typeof duel>, b: ReturnType<typeof duel>): boolean =>
  JSON.stringify(a.fingerprint) === JSON.stringify(b.fingerprint) && JSON.stringify(a.metrics) === JSON.stringify(b.metrics);
const withLever = <T>(on: boolean, run: () => T): T => {
  const was = INTENT_CFG.enabled;
  INTENT_CFG.enabled = on;
  try { return run(); } finally { INTENT_CFG.enabled = was; }
};

// --- A) The body's die -----------------------------------------------------------------
{
  const rolls = (seed: number): number[] => {
    seedGlobalRandom(seed);
    const w = makeSimWorld('warrior', seed);
    const a = w.createMonster('imp', 12, 'enemy');
    return Array.from({ length: 6 }, () => bodyRoll(a, w));
  };
  check('the same run seed and body roll the same', JSON.stringify(rolls(7)) === JSON.stringify(rolls(7)));
  check('another run seed rolls otherwise', JSON.stringify(rolls(7)) !== JSON.stringify(rolls(8)));
  check('rolls are in [0, 1)', rolls(9).every(x => x >= 0 && x < 1));
  seedGlobalRandom(5);
  const plain = [Math.random(), Math.random(), Math.random()];
  seedGlobalRandom(5);
  const w = makeSimWorld('warrior', 5);
  seedGlobalRandom(5);
  const a = w.createMonster('imp', 12, 'enemy');
  seedGlobalRandom(5);
  const mixed = [Math.random(), (bodyRoll(a, w), Math.random()), (bodyRoll(a, w), Math.random())];
  check('the global die never moves for a body\'s roll', JSON.stringify(plain) === JSON.stringify(mixed));
}

// --- B) The think clock ------------------------------------------------------------------
{
  seedGlobalRandom(3);
  const w = makeSimWorld('warrior', 3);
  const [lo, hi] = INTENT_CFG.think;
  const bodies = Array.from({ length: 8 }, () => w.createMonster('imp', 12, 'enemy'));
  const firsts = bodies.map(b => { thinkDue(b, w, {}); return b.aiThinkAt - w.time; });
  check('first beats are staggered by id, within the first gap', firsts.every(f => f >= 0 && f <= lo) && new Set(firsts.map(f => f.toFixed(3))).size > 4,
    firsts.map(f => f.toFixed(2)).join(' '));
  const b = bodies[0];
  const gaps: number[] = [];
  for (let k = 0; k < 6; k++) {
    w.time = b.aiThinkAt;
    const before = w.time;
    check(`beat ${k} fires when due, and only once`, thinkDue(b, w, {}) && !thinkDue(b, w, {}));
    gaps.push(b.aiThinkAt - before);
  }
  check('each gap sits in the think range', gaps.every(g => g >= lo && g <= hi), gaps.map(g => g.toFixed(2)).join(' '));
}

// --- C) The A/B lever ---------------------------------------------------------------------
{
  const def = MONSTERS.imp;
  const brain = def.brain!;
  const { intent: _carried, ...without } = brain;
  def.brain = without;
  let plain: ReturnType<typeof duel>;
  try { plain = duel('imp', 0x51); } finally { def.brain = brain; }
  check('with the lever off, a body with the axis fights exactly as without it', same(withLever(false, () => duel('imp', 0x51)), plain));
  check('with it on, the pilot body really does fight differently', !same(duel('imp', 0x51), plain));
}

// --- D) The axis folds ---------------------------------------------------------------------
{
  const m = mergeTuning({ intent: { floor: 0.2 } }, { intent: { think: [1, 2] } });
  check('the intent axis folds layer over layer', m.intent?.floor === 0.2 && m.intent?.think?.[1] === 2);
  check('null clears it', mergeTuning({ intent: { floor: 0.2 } }, { intent: null }).intent === undefined);
}

// --- E) The band-switch column --------------------------------------------------------------
{
  const ep = duel('imp', 0x52);
  check('band switches read on a real fight', typeof ep.metrics.band_switches_10s === 'number' && ep.metrics.band_switches_10s >= 0, String(ep.metrics.band_switches_10s));
}

/** One body against a hero who stands still and cannot die, read every tick. */
function watch(id: string, seed: number, seconds: number, opts: { at?: number; setup?: (body: Actor) => void },
  each: (body: Actor, d: number) => void): string[] {
  seedGlobalRandom(seed);
  const w = makeSimWorld('warrior', seed), p = w.player;
  p.skills = []; p.casting = null;
  p.sheet.setSource('probe-rig', [mod('life', 'override', 1e7), mod('moveSpeed', 'override', 0)]);
  p.fillResources();
  const body = w.createMonster(id, 12, 'enemy');
  body.pos = { x: p.pos.x + (opts.at ?? 240), y: p.pos.y }; body.tier = p.tier; body.facing = Math.PI;
  w.actors = [p, body];
  opts.setup?.(body);
  const casts: string[] = [];
  setSimTap({ onCast: (a, inst) => { if (a === body) casts.push(inst.def.id); } });
  const dt = 1 / 60;
  try {
    for (let t = 0; t < seconds; t += dt) {
      w.applyInputs(new Map(), dt);
      for (const a of [...w.actors]) updateAI(a, w, dt);
      w.update(dt);
      each(body, Math.hypot(body.pos.x - p.pos.x, body.pos.y - p.pos.y));
    }
  } finally { setSimTap(null); }
  return casts;
}

// --- F) A pilot body decides ---------------------------------------------------------------
{
  check('the pilot is about ten bodies', PILOT.length >= 8 && PILOT.length <= 12, PILOT.join(', '));
  let decided = 0;
  const casts = watch('oblivion_knight', 0x61, 20, {}, body => { if (body.aiIntent) decided++; });
  check('the knight forms intents', decided > 0);
  check('its priority order means what it says: Despair comes first', casts[0] === 'despair', casts.slice(0, 4).join(', '));
  check('and it still swings once the curse rests', casts.some(c => c === 'heavy_strike' || c === 'cleave'), casts.join(' '));
}

// --- G) The feet follow the decision -------------------------------------------------------
{
  // One skill rests the whole rig, so the imp has one thing to want.
  const closest = (resting: string): number => {
    let min = Infinity;
    watch('imp', 0x62, 6, { at: 400, setup: b => b.cooldowns.set(resting, 99) }, (_b, d) => { min = Math.min(min, d); });
    return min;
  };
  const clawing = closest('fireball');
  const firing = closest('claw');
  const plainFiring = withLever(false, () => closest('claw'));
  check('wanting its claw, the imp walks in to claw\'s reach', clawing < 70, `closest ${clawing.toFixed(0)} px`);
  check('wanting fire, it keeps its distance', firing > 150, `closest ${firing.toFixed(0)} px`);
  check('where the plain imp walks into melee with only fire to throw', plainFiring < 70, `closest ${plainFiring.toFixed(0)} px`);
}

// --- H) Busy hands keep the decision ---------------------------------------------------------
{
  // Every decision moves the think clock, and none may happen in a tick the body began busy.
  let beats = 0, busy = 0, clock = -1, wasFree = true;
  watch('imp', 0x65, 12, {}, body => {
    if (body.aiThinkAt !== clock) { beats++; if (!wasFree) busy++; clock = body.aiThinkAt; }
    wasFree = body.canAct();
  });
  check('a body never decides mid-cast or mid-recovery', beats > 5 && busy === 0, `${beats} beats, ${busy} while busy`);
}

// --- I) No flip-flop ----------------------------------------------------------------------------
{
  // Read on the ground against a hero who stands still, so a band change is the body's own
  // or a knockback. (A duel's hero walks up, knocks back and steps away, and plain bodies
  // change band there often too.) The plan's bound is under one change per 3 s; a body that
  // already moved more than that without the layer may not move much more with it.
  const still = ensureTierBuild('starter', 'warrior', 12);
  const bands = (id: string): number => runEpisode(threatScenario(still, id, 12, 20), 0x63).metrics.band_switches_10s ?? 0;
  const rows: string[] = [], worse: string[] = [];
  for (const id of PILOT) {
    const a = withLever(false, () => bands(id)), b = bands(id);
    rows.push(`${id} ${a}→${b}`);
    if (b > Math.max(10 / 3, a * 1.25 + 0.5)) worse.push(id);
  }
  check('no pilot body changes band on the ground much more than it did without the layer', !worse.length, (worse.length ? worse.join(', ') + ' — ' : '') + rows.join(', '));
}

// --- J) Same seed, same fight -------------------------------------------------------------------
check('the same seed fights the same fight with intents', same(duel('oblivion_knight', 0x64), duel('oblivion_knight', 0x64)));

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL PASS');
process.exit(failed ? 2 : 0);
