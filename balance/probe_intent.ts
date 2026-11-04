// ---------------------------------------------------------------------------
// THE INTENT LAYER PROBE (docs/design/npc-ai-direction.md, phases 4 to 6).
//   A. The body's die: same run seed and body, same rolls; another seed, other rolls;
//      and it never moves the global die, so a body thinking re-deals nothing else.
//   B. The think clock: the first beat is staggered by id, the gaps sit in range.
//   C. The A/B lever: off, a body with the axis fights exactly like one opted out of
//      it; on, the pilot body really fights differently.
//   D. The axis folds through mergeTuning like every other. A listed kernel bucket
//      supplies a default, and null opts a body out of it through the fold.
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
//   K. The buckets: a body in a listed kernel decides with no axis of its own, `intent:
//      null` keeps it exactly on the lever's off side, and a body the player claims
//      never decides again.
//   L. The kiter's choice, now its stance (phase 7, probed whole in probe_stance): a body
//      whose ready ranged skill keeps a distance mostly kites and now and then stands and
//      fights, and a decision taken while kiting never walks it in for a skill that works
//      only inside that distance.
// Run: npx tsx balance/probe_intent.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { INTENT_CFG } from '../src/data/aiIntent';
import { MONSTERS } from '../src/data/monsters';
import { SKILLS } from '../src/data/skills';
import { mergeTuning, normalizeBrain, type MoveStyleId } from '../src/engine/brain';
import { bodyRoll, intentOf, thinkDue } from '../src/engine/intent';
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
  // Opted out, not merely without the axis: the imp's kernel bucket would supply one.
  const def = MONSTERS.imp;
  const brain = def.brain!;
  def.brain = { ...brain, intent: null };
  let plain: ReturnType<typeof duel>;
  try { plain = duel('imp', 0x51); } finally { def.brain = brain; }
  check('with the lever off, a body with the axis fights exactly as without it', same(withLever(false, () => duel('imp', 0x51)), plain));
  check('with it on, the pilot body really does fight differently', !same(duel('imp', 0x51), plain));
}

// --- D) The axis folds ---------------------------------------------------------------------
{
  const m = mergeTuning({ intent: { floor: 0.2 } }, { intent: { think: [1, 2] } });
  check('the intent axis folds layer over layer', m.intent?.floor === 0.2 && m.intent?.think?.[1] === 2);
  const style = INTENT_CFG.buckets[0] as MoveStyleId | undefined;
  const outside = (['hold', 'lurk', 'turtle'] as MoveStyleId[]).find(s => !INTENT_CFG.buckets.includes(s))!;
  check('a body in a listed kernel bucket carries its default', !!style && !!intentOf({ move: { style } }), String(style));
  check('null opts it out, and keeps doing so through the fold', intentOf(mergeTuning({ move: { style } }, { intent: null })) === undefined);
  check('a later layer may opt back in', intentOf(mergeTuning({ move: { style }, intent: null }, { intent: { floor: 0.3 } }))?.floor === 0.3);
  check('a body outside the buckets carries none unless authored', !intentOf({ move: { style: outside } }) && !!intentOf({ move: { style: outside }, intent: {} }));
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
  // already moved more than that without the layer may not move much more with it. Read as
  // the mean of four seeds: the count moves in steps of 0.5 per 10 s and a still hero's
  // knockback drives most of it, so one seed swung the knight's own side from 3 to 5.
  const still = ensureTierBuild('starter', 'warrior', 12);
  const seeds = [0x63, 0x64, 0x65, 0x66];
  const bands = (id: string): number => seeds.reduce((s, seed) =>
    s + (runEpisode(threatScenario(still, id, 12, 20), seed).metrics.band_switches_10s ?? 0), 0) / seeds.length;
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

// --- K) The buckets ------------------------------------------------------------------------------
{
  const inBucket = (k: string): boolean => {
    const def = MONSTERS[k];
    // A body that rolls its mind at spawn may run another kernel than its def reads.
    if (def.passive || !def.brain || def.brainVariants?.length) return false;
    const base = normalizeBrain(def.brain).base;
    return base.intent === undefined && INTENT_CFG.buckets.includes(base.move?.style ?? 'approach')
      && (def.skills ?? []).filter(s => SKILLS[s]?.ai).length >= 2;
  };
  const id = Object.keys(MONSTERS).sort().find(inBucket);
  check('a listed kernel bucket holds bodies with a kit to choose from', !!id, id ?? 'none');
  if (id) {
    let decided = 0;
    watch(id, 0x66, 8, {}, body => { if (body.aiIntent) decided++; });
    check(`${id} decides with no axis of its own`, decided > 0);
    const def = MONSTERS[id], brain = def.brain;
    def.brain = { ...brain, intent: null };
    let optedOut: ReturnType<typeof duel> | undefined, clock = -1;
    try {
      optedOut = duel(id, 0x67);
      watch(id, 0x66, 8, {}, body => { clock = Math.max(clock, body.aiThinkAt); });
    } finally { def.brain = brain; }
    check('intent: null keeps it on the plain ready ring', clock < 0);
    check('exactly as the lever\'s off side does', same(withLever(false, () => duel(id, 0x67)), optedOut!));
    // Claimed mid-fight with a foe at hand, it drops its last wild decision and never
    // decides again, so nothing narrows a companion's kit.
    seedGlobalRandom(0x68);
    const w = makeSimWorld('warrior', 0x68), p = w.player;
    p.skills = []; p.casting = null;
    p.sheet.setSource('probe-rig', [mod('life', 'override', 1e7), mod('moveSpeed', 'override', 0)]);
    p.fillResources();
    const body = w.createMonster(id, 12, 'enemy');
    body.pos = { x: p.pos.x + 240, y: p.pos.y }; body.tier = p.tier;
    const foe = w.createMonster(id, 12, 'enemy');
    foe.pos = { x: p.pos.x + 330, y: p.pos.y + 40 }; foe.tier = p.tier;
    w.actors = [p, body, foe];
    let claimed = false, wild = 0, decisions = 0, engaged = 0;
    const dt = 1 / 60;
    for (let t = 0; t < 10; t += dt) {
      if (!claimed && t >= 4) { w.tameCompanion(p, body, 'tame_beast'); claimed = true; }
      const before = body.aiIntent;
      w.applyInputs(new Map(), dt);
      for (const a of [...w.actors]) updateAI(a, w, dt);
      w.update(dt);
      if (body.aiIntent !== before) { if (claimed) decisions++; else wild++; }
      if (claimed && body.aiTargetId === foe.id) engaged++;
    }
    check('claimed by the player, it drops its decision and never decides again', wild > 0 && !body.aiIntent && engaged > 0 && decisions === 0,
      `${wild} wild decisions, ${engaged} ticks engaged with the foe, ${decisions} decisions after the claim`);
  }
}

// --- L) The kiter's choice, now its stance ------------------------------------------------------
{
  // cistern_crone keeps 260 px for its firebolt and carries a claw; as a caster it keeps
  // its distance in most rolls (data/aiIntent.ts STANCE_MIX).
  let rolls = 0, keeps = 0, walkIns = 0;
  for (const seed of [0x71, 0x72, 0x73, 0x74, 0x75]) {
    let at = -1, intent: unknown;
    watch('cistern_crone', seed, 30, {}, (body, d) => {
      if (body.aiStance && body.aiStanceAt !== at) {
        at = body.aiStanceAt; rolls++;
        if (body.aiStance === 'keep') keeps++;
      }
      if (body.aiIntent && body.aiIntent !== intent) {
        intent = body.aiIntent;
        const ai = SKILLS[body.aiIntent.id]?.ai;
        if (body.aiKiteKeep > 0 && ai && ai.range < body.aiKiteKeep && d > ai.range + body.radius + 60) walkIns++;
      }
    });
  }
  check('a kiter mostly kites and now and then stands and fights', rolls >= 12 && keeps < rolls && keeps / rolls >= 0.5,
    `${keeps} of ${rolls} rolls kept its distance`);
  check('kiting, it never decides to walk in for a skill that works only inside its distance', walkIns === 0, `${walkIns} walk-ins`);
}

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL PASS');
process.exit(failed ? 2 : 0);
