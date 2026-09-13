import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { updateAI, MOVE_KERNELS, type KernelCtx } from '../src/engine/ai';
import { normalizeBrain, type BrainDef } from '../src/engine/brain';
import { mod } from '../src/engine/stats';
import { makeSkillInstance } from '../src/engine/skills';
import { SKILLS } from '../src/data/skills';
import { angleDiff, angleTo, dist, vec } from '../src/core/math';

bootSimEngine();
let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
}
function fixture(id = 'skeleton_archer', brain?: BrainDef) {
  seedGlobalRandom(0x71AC);
  const w = makeSimWorld('warrior', 0x71AC), p = w.player;
  const a = w.createMonster(id, 1, 'enemy');
  a.pos = vec(p.pos.x + 180, p.pos.y);
  a.facing = a.facingPrev = Math.PI;
  if (brain) a.brain = brain;
  w.actors.push(a);
  return { w, p, a };
}

// A faster ranged body against a slower pursuer, with attacks suppressed
// to isolate catchability. The bone body proves this is not breathing stamina.
function pursuit(hz: number, limited: boolean, style = 'orbit') {
  const { w, p, a } = fixture('skeleton_archer', {
    type: 'basic', move: { style, ring: 180, hold: 280 },
    skillUse: { mode: 'priority', order: [] },
    tempo: { kite: Infinity, ...(limited ? {} : { reposition: false as const }) },
  });
  a.sheet.setSource('probe-speed', [mod('moveSpeed', 'flat', 110)]);
  p.sheet.setSource('probe-speed', [mod('moveSpeed', 'more', -0.25)]);
  let contact = 0, planted = 0, windows = 0, wasHolding = false, firstHold = -1;
  for (let i = 0; i < hz * 18; i++) {
    const holding = (a.aiReposition?.until ?? 0) > w.time;
    if (holding && !wasHolding) { windows++; if (firstHold < 0) firstHold = w.time; }
    wasHolding = holding;
    const at = vec(a.pos.x, a.pos.y);
    updateAI(a, w, 1 / hz);
    if (holding && dist(at, a.pos) < 0.001) planted += 1 / hz;
    if (dist(p.pos, a.pos) <= 75) contact += 1 / hz;
    w.moveActor(p, a.pos.x - p.pos.x, a.pos.y - p.pos.y, 1 / hz);
    w.update(1 / hz);
  }
  return { contact, planted, windows, firstHold, a };
}
for (const hz of [30, 60, 120]) {
  const before = pursuit(hz, false), after = pursuit(hz, true);
  check(`lateral movement creates repeated planted openings at ${hz} Hz`,
    after.windows >= 3 && after.planted > 3 && after.firstHold < 3,
    `${after.windows} windows, ${after.planted.toFixed(1)}s planted; first ${after.firstHold.toFixed(2)}s`);
  check(`slower melee pursuer catches the faster circler at ${hz} Hz`,
    after.contact > before.contact + 1,
    `${before.contact.toFixed(1)}s → ${after.contact.toFixed(1)}s contact`);
  check('explicit opt-out preserves tireless movement and allocates no budget', !before.a.aiReposition);
}
for (const style of ['slideCast', 'holdRange', 'hitAndRun']) {
  const r = pursuit(60, true, style);
  // With the picker suppressed hitAndRun only APPROACHES. Closing must
  // not consume defensive-movement time or stop a melee chase.
  check(`${style} observes its movement contract`, style === 'hitAndRun'
    ? r.windows === 0 : r.windows >= 1 && r.planted > 1,
    `${r.windows} planted windows`);
}

{
  const { w, a } = fixture('skeleton_archer', { type: 'basic', move: { style: 'orbit', ring: 180 },
    skillUse: { mode: 'priority', order: [] }, tempo: null });
  for (let i = 0; i < 180; i++) { updateAI(a, w, 1 / 60); w.update(1 / 60); }
  check('cleared tempo keeps its authored opt-out', !a.aiReposition);
}
{
  const { w, a, p } = fixture('skeleton_archer', { type: 'basic', move: { style: 'orbit', ring: 180 },
    skillUse: { mode: 'priority', order: [] } });
  a.aiReposition = { left: 0, until: w.time + 1.4 };
  const until = a.aiReposition.until;
  const replacement = w.createMonster('target_dummy', 1, 'player');
  replacement.pos = vec(p.pos.x, p.pos.y + 10); w.actors.push(replacement);
  a.aiTargetId = replacement.id; a.aiTargetRef = replacement;
  a.aiPlantUntil = w.time + 0.3;
  for (let i = 0; i < 30; i++) { updateAI(a, w, 1 / 60); w.update(1 / 60); }
  check('target switches and short cast plants do not reset a firing commitment',
    a.aiReposition.until === until && a.aiReposition.left === 0);
}
{
  const { w, p, a } = fixture();
  const inst = a.skills.find(s => s)!;
  let casts = 0;
  const ctx: KernelCtx = { a, world: w, target: p, d: 50, dt: 0,
    spec: { style: 'holdRange', hold: 300 }, tuning: {}, norm: normalizeBrain({}),
    noCast: false, paused: true, goal: p.pos, pick: () => inst, cast: () => { casts++; } };
  MOVE_KERNELS.holdRange(ctx);
  check('planted artillery fires when crowded instead of silently attempting a zero-length retreat', casts === 1);
}

{
  const { w, p, a } = fixture('bandit_matchlock');
  a.brain = { ...a.brain!, skillUse: { mode: 'priority', order: [] } };
  a.pos = vec(p.pos.x + 280, p.pos.y);
  const ally = w.createMonster('bandit_matchlock', 1, 'enemy');
  ally.pos = vec(a.pos.x, a.pos.y + 80); ally.aiTargetId = p.id; w.actors.push(ally);
  for (let i = 0; i < 60 && !a.aiCrossfire; i++) { updateAI(a, w, 1 / 60); w.update(1 / 60); }
  const state = a.aiCrossfire;
  check('marksman chooses a crossfire destination', !!state);
  if (state) {
    const point = vec(state.point.x, state.point.y);
    const allyBearing = angleTo(p.pos, ally.pos);
    check('crossfire widens the firing angle away from its allied shooter',
      Math.abs(angleDiff(angleTo(p.pos, point), allyBearing))
        > Math.abs(angleDiff(angleTo(p.pos, a.pos), allyBearing)));
    p.pos.y += 35;
    for (let i = 0; i < 15; i++) { updateAI(a, w, 1 / 60); w.update(1 / 60); }
    check('the flank destination does not orbit when its quarry moves',
      a.aiCrossfire === state && dist(state.point, point) === 0);
    // Prevent travel without changing its destination or deadline.
    const deadline = state.travelUntil;
    a.anchored = true;
    while (w.time <= deadline + 0.05) { updateAI(a, w, 1 / 60); w.update(1 / 60); }
    a.anchored = false;
    const at = vec(a.pos.x, a.pos.y);
    for (let i = 0; i < 20; i++) { updateAI(a, w, 1 / 60); w.update(1 / 60); }
    check('prevented travel times out into a hold rather than chasing the point forever', dist(at, a.pos) < 0.01);
  }
}

{
  const { w, p, a } = fixture('skeleton_archer');
  a.anchored = true; p.invulnerable = true;
  for (let i = 0; i < 180; i++) { updateAI(a, w, 1 / 60); w.update(1 / 60); }
  check('stationary ranged combat allocates no repositioning state', !a.aiReposition);
}
{
  const { w, p, a } = fixture('bandit_matchlock');
  p.invulnerable = true;
  const start = vec(a.pos.x, a.pos.y);
  let casts = 0, lastAt = -1;
  for (let i = 0; i < 720; i++) {
    updateAI(a, w, 1 / 60);
    if (a.aiLastSkill && a.aiLastSkill.at !== lastAt) { casts++; lastAt = a.aiLastSkill.at; }
    w.update(1 / 60);
  }
  check('crossfire marksman really relocates and returns to its weapon/reload cycle',
    dist(start, a.pos) > 15 && casts >= 2, `${casts} weapon presses`);
}
{
  const { w, p, a } = fixture('hex_weaver');
  a.pos = vec(p.pos.x + 200, p.pos.y);
  const casts: string[] = []; let lastAt = -1;
  for (let i = 0; i < 480 && casts.length < 2; i++) {
    p.life = p.maxLife(); updateAI(a, w, 1 / 60);
    if (a.aiLastSkill && a.aiLastSkill.at !== lastAt) {
      casts.push(a.aiLastSkill.id); lastAt = a.aiLastSkill.at;
    }
    w.update(1 / 60);
  }
  check('Hex Weaver executes curse then attack through its real skill picker',
    casts[0] === 'despair' && casts[1] === 'spark', casts.join(' → '));
}

{
  const { w, p, a } = fixture('bandit_cutthroat');
  a.pos = vec(p.pos.x + 60, p.pos.y);
  a.aiTargetId = p.id; a.aiTargetRef = p; a.aiEngagedAt = 0; w.time = 4;
  const windup = makeSkillInstance({ ...SKILLS.claw, useTime: 2, manaCost: 0 }, 1);
  check('flanking fixture starts a real player wind-up', w.useSkill(p, windup, a.pos));
  updateAI(a, w, 1 / 60);
  check('Cutthroat reads the wind-up and holsters its attack to flank',
    !!a.aiRuleState?.[0].fired && !a.aiLastSkill);
  for (let i = 0; i < 240 && !a.aiLastSkill; i++) {
    p.life = p.maxLife(); a.life = a.maxLife(); w.update(1 / 60); updateAI(a, w, 1 / 60);
  }
  check('Cutthroat resumes attacking after its bounded flank', !!a.aiLastSkill);
}
{
  const { w, p, a } = fixture('grove_singer');
  a.pos = vec(p.pos.x + 200, p.pos.y);
  for (let i = 0; i < 180; i++) { p.life = p.maxLife(); updateAI(a, w, 1 / 60); w.update(1 / 60); }
  check('isolated Grove Singer does not waste its rally', a.aiLastSkill?.id !== 'rallying_howl'
    && !a.statuses.some(s => s.id === 'rally'));
  for (const dy of [-40, 40]) {
    const ally = w.createMonster('sylvan_warden', 1, 'enemy');
    ally.pos = vec(a.pos.x, a.pos.y + dy); w.actors.push(ally);
  }
  let rallied = false;
  for (let i = 0; i < 300 && !rallied; i++) {
    p.life = p.maxLife(); updateAI(a, w, 1 / 60); w.update(1 / 60);
    rallied ||= a.aiLastSkill?.id === 'rallying_howl';
  }
  check('Grove Singer rallies when its supporting allies arrive', rallied);
}
console.log(failed ? `${failed} FAILED` : 'ALL PASSED');
process.exitCode = failed ? 1 : 0;
