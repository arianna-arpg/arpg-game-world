// ---------------------------------------------------------------------------
// THE INTENT LAYER PROBE (docs/design/npc-ai-direction.md, phase 4: the scaffolding).
//   A. The body's die: same run seed and body, same rolls; another seed, other rolls;
//      and it never moves the global die, so a body thinking re-deals nothing else.
//   B. The think clock: the first beat is staggered by id, the gaps sit in range.
//   C. Inert: a body given the axis fights exactly as without it, lever on or off.
//   D. The axis folds through mergeTuning like every other, and null clears it.
//   E. The band-switch column reads on a real fight.
// Run: npx tsx balance/probe_intent.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { INTENT_CFG } from '../src/data/aiIntent';
import { MONSTERS } from '../src/data/monsters';
import { mergeTuning } from '../src/engine/brain';
import { bodyRoll, thinkDue } from '../src/engine/intent';
import { runEpisode } from '../src/sim/runner';
import { matchupDuel, pilotFor } from '../src/sim/data/scenarios';
import { ensureTierBuild } from '../src/sim/data/builds';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
const build = ensureTierBuild('geared', 'warrior', 12);
const duel = (id: string, seed: number, seconds = 20) =>
  runEpisode(matchupDuel(build, id, { level: 12, duration: seconds, pilot: pilotFor('warrior'), idTag: 'intent' }), seed);
const same = (a: ReturnType<typeof duel>, b: ReturnType<typeof duel>): boolean =>
  JSON.stringify(a.fingerprint) === JSON.stringify(b.fingerprint) && JSON.stringify(a.metrics) === JSON.stringify(b.metrics);

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

// --- C) Inert -------------------------------------------------------------------------------
{
  const def = MONSTERS.imp;
  const brain = def.brain;
  const plain = duel('imp', 0x51);
  def.brain = { ...brain, intent: {} };
  const was = INTENT_CFG.enabled;
  try {
    check('a body given the axis fights exactly as without it', same(duel('imp', 0x51), plain));
    INTENT_CFG.enabled = false;
    check('and so it does with the A/B lever off', same(duel('imp', 0x51), plain));
  } finally {
    INTENT_CFG.enabled = was;
    def.brain = brain;
  }
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

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL PASS');
process.exit(failed ? 2 : 0);
