// ---------------------------------------------------------------------------
// THE SUMMON-FILL PROBE — toggled contracts × the sequence grammar. A
// sequencing gem's "scattered in sequence" holds on toggled contracts too:
// the ON-fill emerges through the SAME grammar the plain path uses (first
// body now, the rest on the standing 0.35s beat), while bare toggles keep
// the one-frame muster. The rigs pin the fill AND its three interaction
// hazards:
//   A  THE BARE MUSTER — Hivecall alone: count 3 in ONE frame, the
//      reconciler tops the remaining slots on the 4s respawn clock, and no
//      trickle entry ever exists.
//   B  THE SEQUENCED FILL — + Cascading Call: exactly 1 at cast-complete,
//      the rest at ~0.35s beats to min(slots, count + summonCount); the
//      respawn queue stays EMPTY for the whole run (the reconciler counts
//      still-emerging bodies as owed — no double-queue, no eviction churn,
//      no phantom sixth body at +4s), and the fill's bodies all survive.
//   C  THE OFF-PURGE — a toggle-OFF mid-stagger dismisses the bodies AND
//      the queued emergence: no births after dismissal, reservation freed.
//   D  THE LEGION BURST — + Legion Call ("all at once", no sequence stat):
//      the one-frame muster stands untouched.
//   E  THE PLAIN LANE — summon_skeleton + Cascading Call (non-toggle): the
//      classic 1-now + staggered sequence, byte-untouched by the toggle
//      work (no contract entry, no reservation).
//   F  THE DEAD CASTER'S TRICKLE — updatePendingSummons drops a dead
//      caster's queued emergence (owner death also funnels through
//      dismissSummonToggle, which rig C pins).
// Run: npx tsx balance/probe_summonfill.ts
// ---------------------------------------------------------------------------

import { makeSimWorld, SIM_CFG } from '../src/sim/arena';
import { applyBuild } from '../src/sim/builds';
import { starterBuild } from '../src/sim/data/builds';
import { vec } from '../src/core/math';
import type { PlayerInput } from '../src/net/intent';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

const DT = SIM_CFG.dt;
const SEED = 0x51c4;

interface GemSpec { id: string; level: number }
interface LaneLog {
  world: World; p: Actor;
  births: { t: number; n: number }[];
  seen: Set<number>;
  aliveEnd: number;
  /** Max pendingRespawns length observed at any tick of the run. */
  respawnPeak: number;
  /** Max pendingSummons length observed at any tick of the run. */
  trickePeak: number;
  /** Fill bodies seen dead while the toggle still stood (eviction churn). */
  evictedSeen: number;
  /** New bodies born at/after the OFF-press (must be 0 with offAt). */
  offBirths: number;
  reservedEnd: number;
}

function runLane(skill: string, gems: GemSpec[], seconds: number, offAt?: number): LaneLog {
  const world = makeSimWorld('hivecaller', SEED);
  const build = starterBuild('hivecaller', 40);
  build.skills = [{ id: skill, level: 1, supports: gems.length ? gems : undefined }];
  build.bar = [skill];
  applyBuild(world, build, SEED);
  const seat = world.localSeat;
  const p = world.player;
  const slot = p.skills.findIndex(s => s?.def.id === skill);
  if (slot < 0) throw new Error(`${skill} not on the bar`);
  const inst = p.skills[slot]!;
  const aim = vec(p.pos.x + 120, p.pos.y);
  world.useSkill(p, inst, aim, true);

  const seen = new Set<number>();
  const births: { t: number; n: number }[] = [];
  const mine = (): Actor[] => world.actors.filter(a => a.owner === p
    && a.sourceSkillId === skill && !a.dead);
  let respawnPeak = 0, trickePeak = 0, evictedSeen = 0, offBirths = 0;
  let offed = false;

  const ticks = Math.round(seconds / DT);
  for (let tick = 0; tick <= ticks; tick++) {
    const t = tick * DT;
    if (offAt !== undefined && !offed && t >= offAt) {
      world.useSkill(p, inst, aim, true);
      offed = true;
    }
    let n = 0;
    for (const m of mine()) {
      if (!seen.has(m.id)) { seen.add(m.id); n++; }
    }
    if (n > 0) {
      births.push({ t, n });
      if (offed) offBirths += n;
    }
    respawnPeak = Math.max(respawnPeak, world.pendingRespawns.length);
    trickePeak = Math.max(trickePeak, world.pendingSummons.length);
    if (p.summonToggles.has(skill)) {
      let deadSeen = 0;
      for (const a of world.actors) {
        if (a.dead && seen.has(a.id) && a.sourceSkillId === skill) deadSeen++;
      }
      evictedSeen = Math.max(evictedSeen, deadSeen);
    }
    const intent: PlayerInput = {
      dx: 0, dy: 0, aim,
      held: new Array(8).fill(false), edge: new Array(8).fill(false),
    };
    const inputs = new Map<string, PlayerInput>();
    inputs.set(seat.id, intent);
    world.applyInputs(inputs, DT);
    world.update(DT);
  }
  return {
    world, p, births, seen, aliveEnd: mine().length,
    respawnPeak, trickePeak, evictedSeen, offBirths,
    reservedEnd: p.reservedMana,
  };
}

// --- RIG A — THE BARE MUSTER -----------------------------------------------
{
  const a = runLane('summon_swarmlings', [], 8);
  check('A: bare toggle-ON births count(3) in ONE frame',
    a.births.length >= 1 && a.births[0].n === 3 && a.births[0].t < 1.0,
    a.births.map(b => `t=${b.t.toFixed(2)} +${b.n}`).join(' · '));
  check('A: the reconciler tops the remaining 2 slots together on the 4s clock',
    a.births.length === 2 && a.births[1].n === 2
    && a.births[1].t - a.births[0].t > 3.6 && a.births[1].t - a.births[0].t < 4.4,
    a.births.length === 2 ? `gap=${(a.births[1].t - a.births[0].t).toFixed(2)}s` : `${a.births.length} events`);
  check('A: no trickle entry ever exists for a bare toggle', a.trickePeak === 0,
    `pendingSummons peak=${a.trickePeak}`);
  check('A: steady state — 5 alive, 5 ever born, queue drained, no churn',
    a.aliveEnd === 5 && a.seen.size === 5 && a.evictedSeen === 0
    && a.world.pendingRespawns.length === 0,
    `alive=${a.aliveEnd} seen=${a.seen.size} evicted=${a.evictedSeen}`);
}

// --- RIG B — THE SEQUENCED FILL --------------------------------------------
{
  const b = runLane('summon_swarmlings', [{ id: 'cascading_call', level: 1 }], 10);
  check('B: sequenced toggle-ON births exactly ONE at cast-complete',
    b.births.length >= 1 && b.births[0].n === 1 && b.births[0].t < 1.0,
    b.births.map(x => `t=${x.t.toFixed(2)} +${x.n}`).join(' · '));
  check('B: the rest emerge one per beat to min(slots, count+summonCount) = 5',
    b.births.length === 5 && b.births.every(x => x.n === 1) && b.seen.size === 5,
    `${b.births.length} events, seen=${b.seen.size}`);
  const gapsOk = b.births.slice(1).every((x, i) => {
    const gap = x.t - b.births[i].t;
    return gap > 0.30 && gap < 0.45;
  });
  check('B: stagger beats ride the standing 0.35s interval', gapsOk,
    b.births.slice(1).map((x, i) => (x.t - b.births[i].t).toFixed(2)).join(' · '));
  check('B: the respawn queue stays EMPTY the whole run (no double-queue)',
    b.respawnPeak === 0, `pendingRespawns peak=${b.respawnPeak}`);
  check('B: no eviction churn and no phantom body after the fill',
    b.evictedSeen === 0 && b.aliveEnd === 5 && b.seen.size === 5
    && b.world.pendingSummons.length === 0,
    `evicted=${b.evictedSeen} alive=${b.aliveEnd} seen=${b.seen.size}`);
}

// --- RIG C — THE OFF-PURGE -------------------------------------------------
{
  // THE COOLDOWN GATES THE OFF-SWITCH (standing law, canUse's cooldown
  // refusal sits above the toggle-release exemptions; the clock stamps at
  // cast-complete by default): a player OFF-press is only legal once the
  // skill's own 3s clock runs out (~3.72s here), so the rig grows slots
  // until the stagger (1-now + 9 beats, filling to ~4.0s) OUTLASTS the
  // cooldown and dismisses at 3.85s — 9 bodies stand, the 10th still
  // queued in the trickle. (The pool swap, unlearn and owner death reach
  // the same purge with no cooldown in the way.)
  const gems = [
    { id: 'cascading_call', level: 10 },
    { id: 'commanding', level: 1 },
    { id: 'legion_doctrine', level: 10 },
  ];
  const c = runLane('summon_swarmlings', gems, 6, 3.85);
  check('C: the stagger was genuinely mid-flight at the OFF-press',
    c.births.filter(x => x.t < 3.85).reduce((s, x) => s + x.n, 0) === 9,
    c.births.map(x => `t=${x.t.toFixed(2)} +${x.n}`).join(' · '));
  check('C: a toggle-OFF mid-stagger births NOTHING after the dismissal',
    c.offBirths === 0 && c.seen.size === 9, `offBirths=${c.offBirths} seen=${c.seen.size}`);
  check('C: the dismissal purges bodies, trickle, queue and reservation',
    c.aliveEnd === 0 && c.world.pendingSummons.length === 0
    && c.world.pendingRespawns.length === 0 && !c.p.summonToggles.has('summon_swarmlings')
    && c.reservedEnd === 0,
    `alive=${c.aliveEnd} trickle=${c.world.pendingSummons.length}`
    + ` queue=${c.world.pendingRespawns.length} reserved=${c.reservedEnd.toFixed(1)}`);
}

// --- RIG D — THE LEGION BURST ----------------------------------------------
{
  const d = runLane('summon_swarmlings', [{ id: 'legion_call', level: 1 }], 8);
  check('D: Legion Call (no sequence stat) keeps the one-frame muster',
    d.births.length >= 1 && d.births[0].n === 4 && d.births[0].t < 1.0,
    d.births.map(x => `t=${x.t.toFixed(2)} +${x.n}`).join(' · '));
  check('D: no trickle entry ever exists for an unsequenced toggle',
    d.trickePeak === 0, `pendingSummons peak=${d.trickePeak}`);
  check('D: the reconciler tops the 5th slot on the 4s clock, then steady',
    d.births.length === 2 && d.births[1].n === 1 && d.aliveEnd === 5
    && d.seen.size === 5 && d.evictedSeen === 0,
    `alive=${d.aliveEnd} seen=${d.seen.size}`);
}

// --- RIG E — THE PLAIN LANE, UNTOUCHED -------------------------------------
{
  const e = runLane('summon_skeleton', [{ id: 'cascading_call', level: 1 }], 4);
  check('E: a plain (non-toggle) summon keeps the classic 1-now + staggered fill',
    e.births.length === 3 && e.births.every(x => x.n === 1) && e.births[0].t < 1.1,
    e.births.map(x => `t=${x.t.toFixed(2)} +${x.n}`).join(' · '));
  const gapsOk = e.births.slice(1).every((x, i) => {
    const gap = x.t - e.births[i].t;
    return gap > 0.30 && gap < 0.45;
  });
  check('E: plain-lane beats ride the same standing interval', gapsOk,
    e.births.slice(1).map((x, i) => (x.t - e.births[i].t).toFixed(2)).join(' · '));
  check('E: no contract, no reservation — the toggle fabric never engaged',
    !e.p.summonToggles.has('summon_skeleton') && e.reservedEnd === 0
    && e.aliveEnd === 3,
    `reserved=${e.reservedEnd.toFixed(1)} alive=${e.aliveEnd}`);
}

// --- RIG F — THE DEAD CASTER'S TRICKLE -------------------------------------
{
  const world = makeSimWorld('hivecaller', SEED);
  const build = starterBuild('hivecaller', 40);
  build.skills = [{ id: 'summon_swarmlings', level: 1 }];
  build.bar = ['summon_swarmlings'];
  applyBuild(world, build, SEED);
  const p = world.player;
  const inst = p.skills.find(s => s?.def.id === 'summon_swarmlings')!;
  const dummy = world.createMonster('swarmling', 1, 'enemy');
  world.kill(dummy, true);
  world.pendingSummons.push({ caster: dummy, inst, remaining: 3, timer: 0.01, interval: 0.35 });
  const bodiesOf = (owner: Actor): number =>
    world.actors.filter(a => a.owner === owner && !a.dead).length;
  for (let i = 0; i < 3; i++) { world.applyInputs(new Map(), DT); world.update(DT); }
  check('F: a dead caster\'s queued emergence is dropped, not born',
    world.pendingSummons.length === 0 && bodiesOf(dummy) === 0,
    `trickle=${world.pendingSummons.length} bodies=${bodiesOf(dummy)}`);
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
