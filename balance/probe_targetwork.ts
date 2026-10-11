/**
 * Fixed-work target acquisition oracle. Run: npm run probe -- targetwork
 * The independent reference below is the exact 401dfdfa picker and its two
 * local helpers, retained in source so this probe needs no Git checkout.
 * Actual current acquireTarget is extracted and executed with real imported
 * helpers. Compare results, actor state, ordered sight queries and RNG use;
 * hostility call counts prove saved work without a wall-time threshold.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { Actor } from '../src/engine/actor';
import type { World } from '../src/engine/world';
import { type BrainTuning, alertScale, BEHAVIOR_CFG, normalizeBrain } from '../src/engine/brain';
import { angleDiff, angleTo, dist, rand, vec } from '../src/core/math';
import { MONSTERS, factionStance } from '../src/data/monsters';
import { feedWatch, SENSE_CFG, senseReach, WATCH_CFG, WATCH_RUNG, watchArcDeg,
  watchRiseAmount, watchRungOf, watchValueOf } from '../src/engine/watch';
import { nearestBody, segsHittable } from '../src/engine/segments';
import { LOS_CFG } from '../src/engine/los';
import { concealmentActive, investigateLoss } from '../src/engine/perception';
import { throngTravelProtected } from '../src/engine/throngEvolution';
import { clingBurrowed } from '../src/engine/cling';
import { STATUS_DEFS } from '../src/engine/status';
import { nativeHostileTo, nativeIsPrey } from '../src/engine/nativeHostility';
import { seedGlobalRandom } from '../src/sim/rng';

const archivedSource = `
function scoreTarget(
  prefer: NonNullable<import('./brain').TargetSpec['prefer']>,
  actor: Actor, e: Actor, d: number,
): number {
  const targetPriority = e.sheet.get('targetPriority');
  switch (prefer) {
    case 'nearest': return targetPriority / (d + 24);
    case 'farthest': return targetPriority * (d + 1);
    case 'highestThreat': return (actor.threat.get(e.id) ?? 0) + targetPriority / (d + 24);
    case 'lowestLife': return targetPriority * ((1 - e.life / Math.max(1, e.maxLife())) + 0.05 / (d + 24));
    case 'highestLife': return targetPriority * (e.life / Math.max(1, e.maxLife()) + 0.05 / (d + 24));
    case 'random': {
      // Stable per-pair pseudo-random: preference without per-tick thrash.
      const h = Math.sin(actor.id * 374761.393 + e.id * 668265.263) * 43758.5453;
      return targetPriority * (0.1 + (h - Math.floor(h)));
    }
  }
}
function attendSpanOf(
  per: [number, number] | undefined, fickle: [number, number] | undefined,
): [number, number] | undefined {
  if (!per) return fickle;
  if (!fickle) return per;
  return fickle[0] + fickle[1] < per[0] + per[1] ? fickle : per;
}
function acquireTarget(
  actor: Actor, world: World, tuning: BrainTuning,
): { target: Actor | null; d: number } {
  // Sight is a CONE: full detection range inside the frontal arc, a short
  // all-around HEARING radius behind it — so flanking and backstabs are real
  // tactics, not wishes. Stealth charges SHROUD their bearer hard on top;
  // \`invisible\` removes them entirely. An ALERTED actor (struck from the
  // shadows, or its kin was) watches all around at heightened range instead.
  const per = tuning.perception;
  // ATTENTION SPAN (dim brains): the lock LAPSES — forget the target and
  // stumble into a short daze. A landed hit since the daze began snaps the
  // actor out of it (pain is a great teacher, briefly). A worn FICKLE
  // window (StatusDef.fickleSpan — the adrenal strain) folds in at
  // SHORTEST WINDOW WINS; landing MID-LOCK it ARMS the un-stamped clock
  // instead of lapsing on the spot (the infection staggers the mind, it
  // doesn't blink it).
  {
    const span = attendSpanOf(per?.attentionSpan, actor.fickleSpan());
    if (span && actor.aiTargetId !== undefined) {
      if (actor.aiAttendUntil <= 0 && !per?.attentionSpan) {
        actor.aiAttendUntil = world.time + rand(span[0], span[1]);
      } else if (world.time >= actor.aiAttendUntil) {
        actor.aiTargetId = undefined;
        actor.aggroed = false;
        actor.aiAttendUntil = 0; // consumed — a later lock re-arms, never inherits
        actor.aiDazeFrom = world.time;
        actor.aiDazeUntil = world.time + rand(1.5, 3);
      }
    }
  }
  if (actor.aiDazeUntil > world.time && actor.lastCombatAt >= actor.aiDazeFrom) {
    actor.aiDazeUntil = 0; // re-stimulated: the haze lifts
  }
  const dazed = actor.aiDazeUntil > world.time;
  let detect = actor.sheet.get('detectionRange') * (tuning.target?.detectMul ?? 1);
  if (tuning.target?.relentless && actor.aggroed) detect = Infinity;
  // The daze is a HARD lapse — the thread is gone even with the quarry at
  // arm's length; only pain (the re-stimulation above) or its passing
  // restores the eyes. Walk on; it has forgotten you.
  if (dazed) detect = 0;
  const vis = actor.defId ? MONSTERS[actor.defId]?.vision : undefined;
  // THE WATCH FABRIC (engine/watch.ts): a sleeper below the stir rung has
  // its eyes SHUT — the authored cone collapses to 0 and every approach is
  // rear hearing (drawn as the ring). Watchless bodies pass through verbatim.
  const watchV = actor.watch ? watchValueOf(actor, actor.watch, world.time) : 0;
  const arcHalf = (watchArcDeg(actor.watch, watchV,
    per?.arcDeg ?? vis?.arcDeg ?? SENSE_CFG.arcDeg) * Math.PI / 180) / 2;
  const rearMul = per?.rearMul ?? vis?.rearMul ?? SENSE_CFG.rearMul;
  const alerted = world.time < actor.alertUntil;
  // THE STAMPED SENSE (drawn == tested by construction): record the exact
  // scalars this scan tests — the drawn cone, the co-op wire and the
  // probes read the stamps, never a re-derivation that could drift.
  if (actor.watch) {
    actor.senseDetect = detect;
    actor.senseArcHalf = arcHalf;
    actor.senseRearMul = rearMul;
    actor.senseAlerted = alerted;
  }
  const prefer = tuning.target?.prefer ?? 'nearest';
  const bias = tuning.target?.kindBias;
  // Every live combat lock needs sight. A lost line becomes a copied-place
  // investigation; relentless extends reach, never grants tracking through
  // cover. Only an authored xray sense bypasses the ray. The world's memo
  // keeps ray work at event rate.
  const losGated = LOS_CFG.perception && per?.xray !== true;

  // THE RESCAN CADENCE (BEHAVIOR_CFG.retarget + TargetSpec.rescanSec): the
  // roster walk below is O(actors) per caller, per tick — across a crowded
  // erg it WAS the sim's quadratic half (~170 bodies ≈ 21ms median frames,
  // most of them unaggroed wildlife confirming "still nothing" sixty times
  // a second). The walk now runs on a staggered clock: a VALID held lock
  // re-validates alone between clocks (O(1), seen-ledger still refreshed),
  // an empty watch simply waits, and three things pull the walk forward —
  // the clock, an ALERT landing mid-window (the hunt cadence caps that
  // wait), and a blow from a NEW assailant (aiHitById ≠ the lock: the
  // flank snaps heads next tick; a 1v1 brawl never re-walks for its own
  // exchange). Preference, stickiness and taunts referee at scan time
  // only; between scans the lock simply holds — stickiness made locks
  // sticky long before this clock existed, and a mid-window taunt waits
  // at most the hunt cadence.
  const rc = BEHAVIOR_CFG.retarget;
  const scanDue = world.time >= actor.aiRescanAt
    || (alerted && world.time >= actor.aiLastScanAt + rc.alertSec)
    || (actor.aiHitAt >= actor.aiLastScanAt && actor.aiHitById !== (actor.aiTargetId ?? -1));
  if (!scanDue && !dazed) {
    if (actor.aiTargetId === undefined) return { target: null, d: Infinity };
    const e = actor.aiTargetRef;
    if (e && e.id === actor.aiTargetId
      && !e.dead && !e.untargetable && !e.downed && !e.passive
      && (world.hostileTo(actor, e)
        || (e.construct?.breakable !== undefined && e.owner === actor))
      && !(e.sheet.get('invisible') > 0)) {
      const d = segsHittable(e)
        ? dist(actor.pos, nearestBody(e, actor.pos).pos)
        : dist(actor.pos, e.pos);
      const reach = senseReach(detect, e.sheet.get('detectability'),
        concealmentActive(e, world.time), alerted,
        Math.abs(angleDiff(actor.facing, angleTo(actor.pos, e.pos))) < arcHalf,
        rearMul);
      if (d <= reach) {
        const seen = !losGated || world.losCached(actor, e);
        if (seen) {
          actor.aiLosSeenAt = world.time;
          if (actor.aiLastSeen) { actor.aiLastSeen.x = e.pos.x; actor.aiLastSeen.y = e.pos.y; }
          else actor.aiLastSeen = vec(e.pos.x, e.pos.y);
          actor.aiLastSeenTier = e.tier;
          if (tuning.target?.relentless) actor.aggroed = true;
          actor.lastProgress = undefined;
          return { target: e, d };
        }
      }
    }
    // The held thread failed a gate mid-window — walk the roster NOW; the
    // scan owns the loss bookkeeping (memory stalk, the shrug back).
  }

  let target: Actor | null = null;
  let bestScore = -Infinity;
  let bestD = Infinity;
  let current: Actor | null = null;
  let currentScore = 0;
  let currentD = 0;
  let tauntTarget: Actor | null = null;
  let tauntBest = Infinity;
  // ZERO-ALLOC candidate walk: this scan runs per actor per tick, and
  // world.enemiesOf() mints a fresh filtered array per call — at a hundred
  // bodies that alone was a meaningful slice of the sim's measured
  // garbage-per-second (GC pressure IS the crowd-fight stutter on the
  // engines that collect it slowest). Same predicate as enemiesOf, inline,
  // cheapest checks first; behavior byte-identical.
  const roster = world.actors;
  for (let ri = 0; ri < roster.length; ri++) {
    const e = roster[ri];
    if (e.dead || e.untargetable || e.downed) continue;
    // Scenery is not prey: nobody dedicates their life to a barrel,
    // and the townsfolk are not on the menu.
    if (e.passive) continue;
    if (!(world.hostileTo(actor, e)
      || (e.construct?.breakable !== undefined && e.owner === actor))) continue;
    if (e.sheet.get('invisible') > 0) continue;
    // SEGMENT FABRIC: a segmented creature is engaged by its NEAREST
    // hittable body — the coil beside you counts, not only the far head.
    // Detection, range gates and kiting all inherit this d. Perception
    // LoS below stays head-based (you SEE the creature by its head);
    // plain monsters take the classic center distance, byte-identical.
    const d = segsHittable(e)
      ? dist(actor.pos, nearestBody(e, actor.pos).pos)
      : dist(actor.pos, e.pos);
    const reach = senseReach(detect, e.sheet.get('detectability'),
      concealmentActive(e, world.time), alerted,
      Math.abs(angleDiff(actor.facing, angleTo(actor.pos, e.pos))) < arcHalf,
      rearMul);
    if (d > reach) continue;
    if (losGated && !world.losCached(actor, e)) continue;
    if (e.taunt && d < tauntBest) { tauntBest = d; tauntTarget = e; }
    let score = scoreTarget(prefer, actor, e, d);
    if (bias) score *= bias[e.kind ?? 'monster'] ?? 1;
    if (e.id === actor.aiTargetId) { current = e; currentScore = score; currentD = d; }
    if (score > bestScore) { bestScore = score; target = e; bestD = d; }
  }
  // STICKINESS: a challenger must beat the held lock by the margin, or the
  // lock holds (taunts still override below).
  const stick = tuning.target?.stickiness ?? 1;
  if (current && target && target !== current && bestScore <= currentScore * stick) {
    target = current;
    bestD = currentD;
  }
  if (tauntTarget && !tuning.target?.ignoreTaunt) { target = tauntTarget; bestD = tauntBest; }
  // THE WATCH GATE (engine/watch.ts): a watcher's UNPROVOKED fresh lock does
  // not lock — it CLIMBS. The would-be acquisition feeds the suspicion
  // ladder (proximity-tapered, alert-hastened, footfall-scaled for
  // sleepers) and the gate holds below the top rung: STIRRING turns the
  // head (updateWatch), SEARCHING plants the standing investigate walk
  // (the same alertFrom walk kin callouts use), and only a full meter
  // falls through to the ordinary lock — shout, opener, aggro, everything
  // downstream unchanged. Pain skips the climb (a wounded watcher needs no
  // ladder), a taunt is its own provocation (resolved above), and a held
  // or aggroed lock never re-gates. Back off mid-climb and the meter
  // decays — watchable, learnable, reversible below the lock.
  if (target && actor.watch && actor.aiTargetId === undefined && !actor.aggroed
    && !(tauntTarget && !tuning.target?.ignoreTaunt)
    && !(actor.aiHitAt >= 0 && world.time - actor.aiHitAt < WATCH_CFG.provokedSec)) {
    const w = actor.watch;
    // One rescan beat of exposure, bounded (the scan clock is staggered).
    const dtSee = Math.max(0, Math.min(world.time - actor.aiLastScanAt, rc.sec * 2));
    // This target's tested reach, re-folded through the SAME senseReach the
    // walk just used — the proximity taper reads the honest fraction.
    // (strict <: a collapsed sleeper arc of 0 admits nothing — the exact
    //  boundary ray is measure-zero for every honest cone.)
    const inCone = Math.abs(angleDiff(actor.facing, angleTo(actor.pos, target.pos))) < arcHalf;
    const reach = senseReach(detect, target.sheet.get('detectability'),
      concealmentActive(target, world.time), alerted, inCone, rearMul);
    // Sleepers hear FOOTFALLS: a slow creep feeds at stillMul.
    const sl = w.sleep;
    const asleep = !!sl && watchV < WATCH_CFG.rungs.stir;
    const stillMul = asleep
      && Math.hypot(target.vel.x, target.vel.y) < WATCH_CFG.sleep.stillSpeed
      ? ((typeof sl === 'object' ? sl.stillMul : undefined) ?? WATCH_CFG.sleep.stillMul)
      : 1;
    const v = feedWatch(actor, w, world.time, watchRiseAmount(
      w, dtSee, reach > 0 ? Math.min(1, bestD / reach) : 1, alerted, stillMul));
    if (actor.watchAt) { actor.watchAt.x = target.pos.x; actor.watchAt.y = target.pos.y; }
    else actor.watchAt = vec(target.pos.x, target.pos.y);
    const rung = watchRungOf(v);
    if (rung >= WATCH_RUNG.search && watchRungOf(watchV) < WATCH_RUNG.search) {
      // THE SEARCH CROSSING: plant the standing investigation, once per
      // climb (alertMul scales it like every other alert duration).
      actor.alertUntil = Math.max(actor.alertUntil,
        world.time + (w.searchSec ?? WATCH_CFG.searchSec) * alertScale(actor));
      actor.alertFrom = vec(target.pos.x, target.pos.y);
      actor.alertTier = target.tier;
    }
    actor.watchRung = rung;
    if (v >= 1) {
      actor.aggroed = true; // the ladder's top — the alert tell pins
    } else {
      target = null; // the gate holds: no lock this beat
      bestD = Infinity;
    }
  }
  if (target && tuning.target?.relentless) actor.aggroed = true;
  // Fighting resets the leash-recall stuck window — a stationary brawl must
  // never read as "snagged on terrain" the moment it ends.
  if (target) actor.lastProgress = undefined;

  if (target) {
    if (actor.aiTargetId === undefined) {
      // THE WATCH FABRIC: for a watcher, ANY fresh lock is the ladder's top
      // rung — climbed, wound-bypassed or taunted alike — so the meter pins,
      // the worn tell reads LOCKED and the drawn cone stands down (the tell
      // must never say "searching" about a body already fighting you). The
      // stand-down sweep walks it back down when the fight is over.
      if (actor.watch) actor.aggroed = true;
      // A FRESH engagement (openers key off it) — and the sentry's CALLOUT:
      // kin within the shout radius go on alert toward the prey.
      if (actor.aiEngagedAt < 0
        || world.time - Math.max(actor.lastCombatAt, actor.aiEngagedAt) > 8) {
        actor.aiEngagedAt = world.time;
        // REACTION (BehaviorSpec.reaction): dim wits take a beat between
        // sighting and the first cast — the feet close, the blade waits.
        const react = tuning.behavior?.reaction;
        if (react) actor.aiReactAt = world.time + rand(react[0], react[1]);
        // THE PACK TEMPO (SkillPolicy.strike): stamp the prey's cluster
        // ledger — fresh engagements landing within packTempo.clusterWin of
        // the last read as ONE acquisition wave (the zone-entry moment).
        // The stamp is dial-blind bookkeeping; only a strike-dialed 2nd+
        // acquirer rolls its burst-verb stagger off it, so the first body
        // keeps its clean opening and the pack spreads out behind it
        // instead of arriving as one simultaneous volley.
        if (target.aiSwarmedAt >= 0
          && world.time - target.aiSwarmedAt <= BEHAVIOR_CFG.packTempo.clusterWin) {
          target.aiSwarmN++;
        } else target.aiSwarmN = 1;
        target.aiSwarmedAt = world.time;
        const stag = tuning.skillUse?.strike?.stagger;
        if (stag && target.aiSwarmN >= 2) {
          actor.aiBurstHoldUntil = world.time + rand(stag[0], stag[1]);
        }
      }
      // Dim brains roll how long this lock can HOLD their attention — a
      // worn FICKLE window (StatusDef.fickleSpan) folds in, shortest wins.
      const attendSpan = attendSpanOf(per?.attentionSpan, actor.fickleSpan());
      if (attendSpan) {
        actor.aiAttendUntil = world.time + rand(attendSpan[0], attendSpan[1]);
      }
      const shout = tuning.perception?.alertShout;
      if (shout) {
        for (const a of world.actors) {
          if (a.dead || a === actor || a.team !== actor.team || a.passive || a.construct) continue;
          if (dist(a.pos, actor.pos) > shout) continue;
          a.alertUntil = Math.max(a.alertUntil, world.time + 5 * alertScale(a));
          if (a.aiTargetId === undefined) { a.alertFrom = vec(target.pos.x, target.pos.y); a.alertTier = target.tier; }
          // THE WATCH FABRIC: a warned watcher's ladder JUMPS to the search
          // rung (capped — a shout names a place, never a prey; its own
          // senses must close the lock) and its climb runs alert-fast.
          if (a.watch) {
            const v = feedWatch(a, a.watch, world.time, 1, WATCH_CFG.rungs.search);
            a.watchRung = Math.max(a.watchRung, watchRungOf(v));
            if (a.watchAt) { a.watchAt.x = target.pos.x; a.watchAt.y = target.pos.y; }
            else a.watchAt = vec(target.pos.x, target.pos.y);
          }
        }
      }
    }
    actor.aiTargetId = target.id;
    actor.alertFrom = null;
    // The last-SEEN ledger stays honest: position and clock refresh only
    // while the eye actually reaches (a blind chase stalks a stale spot).
    if (!losGated || world.losCached(actor, target)) {
      actor.aiLosSeenAt = world.time;
      actor.aiLastSeen = vec(target.pos.x, target.pos.y);
      actor.aiLastSeenTier = target.tier;
    }
  } else if (actor.aiTargetId !== undefined) {
    // LOST the lock: with perception memory, stalk the last-seen position
    // (rides the alert-investigate walk); without, shrug back to the watch.
    investigateLoss(actor, world, tuning);
  }
  // Cadence bookkeeping for the fast path above: mirror the FINAL lock as a
  // direct reference (spares the O(actors) id lookup) and arm the next-walk
  // clock — tuning rescanSec, else the alerted hunt cadence, else the
  // ambient default, staggered by an id hash so packs never scan in phase.
  actor.aiTargetRef = target ?? undefined;
  actor.aiLastScanAt = world.time;
  const cadence = tuning.target?.rescanSec ?? (alerted ? rc.alertSec : rc.sec);
  actor.aiRescanAt = world.time
    + cadence * (1 - rc.jitter * ((((actor.id * 2654435761) >>> 13) & 1023) / 1023));
  return { target, d: bestD };
}
`;

const source = readFileSync(new URL('../src/engine/ai.ts', import.meta.url), 'utf8');
assert.equal(createHash('sha256').update(archivedSource.trim()).digest('hex'),
  '736c7157786eeed87d8071bb1c784913cb00abc4ae10b611cd69505e31e02daa',
  'preserved 401dfdfa picker and helper bodies');
function extract(text: string): string {
  const ast = ts.createSourceFile('ai.ts', text, ts.ScriptTarget.Latest, true);
  return ['scoreTarget', 'attendSpanOf', 'acquireTarget'].map(name => {
    const f = ast.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === name);
    assert.ok(f, 'actual picker helper exists: ' + name);
    return text.slice(f.getStart(ast), f.end);
  }).join('\n');
}
const context = { angleDiff, angleTo, dist, rand, vec, MONSTERS, alertScale, BEHAVIOR_CFG,
  feedWatch, SENSE_CFG, senseReach, WATCH_CFG, WATCH_RUNG, watchArcDeg, watchRiseAmount,
  watchRungOf, watchValueOf, nearestBody, segsHittable, LOS_CFG, concealmentActive, investigateLoss };
type Pick = (a: Actor, w: World, tuning: BrainTuning) => { target: Actor | null; d: number };
function compile(text: string): Pick {
  const js = ts.transpileModule(text, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  return new Function(...Object.keys(context), '"use strict";' + js + ';return acquireTarget;')(...Object.values(context));
}
const before = compile(archivedSource), current = compile(extract(source));
const hostilitySources = { throngTravelProtected, clingBurrowed, normalizeBrain, STATUS_DEFS, factionStance, dist };

interface Rig {
  actor: Actor; targets: Actor[]; world: World; tuning: BrainTuning;
  blocked: Set<number>; sanctuary: Set<number>; calls: { hostile: number; sight: number[] };
}
function actor(id: number, x: number, team: 'enemy' | 'player'): Actor {
  const a = new Actor('targetwork-' + id, team, vec(x, 0));
  a.id = id; a.facing = 0; a.radius = 10; a.life = 100;
  a.sheet.setBase('life', 100);
  a.sheet.setBase('detectionRange', 100);
  a.sheet.setBase('detectability', 1);
  a.sheet.setBase('targetPriority', 1);
  return a;
}
function rig(count = 4): Rig {
  const a = actor(1, 0, 'enemy'), targets = Array.from({ length: count }, (_, i) => actor(i + 2, 80 * (i + 1), 'player'));
  const blocked = new Set<number>(), sanctuary = new Set<number>();
  const calls = { hostile: 0, sight: [] as number[] };
  const host = {
    actors: [a, ...targets], zone: {},
    sanctuaryBlocksCombat(_a: Actor, b: Actor) { return sanctuary.has(b.id); },
    isPrey(a: Actor, b: Actor) { return nativeIsPrey(hostilitySources, a, b); },
    hostileTo(a: Actor, b: Actor) { calls.hostile++; return nativeHostileTo(host, hostilitySources, a, b); },
    time: 10,
    losCached(_a: Actor, b: Actor) { calls.sight.push(b.id); return !blocked.has(b.id); },
  };
  return { actor: a, targets, world: host as unknown as World,
    tuning: { perception: { arcDeg: 360, rearMul: 1 } }, blocked, sanctuary, calls };
}
// All actor-owned data except derived stat caches. The sheets are actual
// StatSheets, updated through their public mutators between synchronous scans.
// Actor references become IDs so independently constructed rigs compare.
function data(v: unknown): unknown {
  if (v instanceof Actor) return { actor: v.id };
  if (v instanceof Map) return { map: [...v].map(([k, x]) => [data(k), data(x)]) };
  if (v instanceof Set) return { set: [...v].map(data) };
  if (Array.isArray(v)) return v.map(data);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, data(x)]));
  return v;
}
function snapshot(a: Actor): unknown {
  return Object.fromEntries(Object.entries(a).map(([k, v]) => [k, k === 'sheet'
    ? Object.fromEntries(Object.entries(a.sheet).filter(([field]) => field !== 'cache' && field !== 'modsByStat')
      .map(([field, value]) => [field, data(value)]))
    : data(v)]));
}
type Step = { change?: (r: Rig) => void; expected?: number | null; force?: boolean };
type Case = { name: string; setup?: (r: Rig) => void; steps?: Step[]; count?: number; saved?: boolean };
let cases = 0, scans = 0, oldHostility = 0, newHostility = 0, sightCalls = 0;
const savings: { name: string; old: number; current: number }[] = [];
function run(fn: Pick, spec: Case) {
  const restore = seedGlobalRandom(0xface451);
  const random = Math.random;
  let draws = 0;
  Math.random = () => { draws++; return random(); };
  try {
    const r = rig(spec.count), history: unknown[] = [];
    spec.setup?.(r);
    for (const step of spec.steps ?? [{}]) {
      step.change?.(r);
      if (step.force !== false) r.actor.aiRescanAt = -Infinity;
      const result = fn(r.actor, r.world, r.tuning);
      if (step.expected !== undefined) assert.equal(result.target?.id ?? null, step.expected, spec.name + ' expected target');
      history.push({
        target: result.target?.id ?? null, d: result.d, draws,
        actors: r.world.actors.map(snapshot), sight: [...r.calls.sight],
      });
    }
    return { history, hostile: r.calls.hostile, sight: r.calls.sight.length };
  } finally { restore(); }
}
function pair(spec: Case): void {
  const old = run(before, spec), now = run(current, spec);
  assert.deepEqual(now.history, old.history, spec.name);
  assert.ok(now.hostile <= old.hostile, spec.name + ' never adds hostility queries');
  if (spec.saved) {
    assert.ok(now.hostile < old.hostile, spec.name + ' saves actual hostility queries');
    savings.push({ name: spec.name, old: old.hostile, current: now.hostile });
  }
  cases++; scans += old.history.length; oldHostility += old.hostile; newHostility += now.hostile; sightCalls += old.sight;
}

pair({ name: 'ordinary range, actual native hostility and sight', steps: [{ expected: 2 }], saved: true });
pair({ name: 'full roster far work is removed', count: 64,
  setup: r => r.targets.slice(1).forEach((a, i) => { a.pos.x = 1000 + i * 50; }),
  steps: [{ expected: 2 }], saved: true });
pair({ name: 'strict boundary includes exact range', setup: r => { r.targets[0].pos.x = 100; },
  steps: [{ expected: 2 }, { change: r => { r.targets[0].pos.x = 100 + 1e-10; }, expected: null }] });
pair({ name: 'zero range preserves coincident target', setup: r => {
  r.actor.sheet.setBase('detectionRange', 0); r.targets[0].pos = vec(0, 0);
}, steps: [{ expected: 2 }] });
pair({ name: 'large detection modifier admits far target', setup: r => {
  r.targets[0].pos.x = 20000; r.targets.slice(1).forEach(a => { a.dead = true; });
  r.tuning.target = { detectMul: 300 };
}, steps: [{ expected: 2 }] });
pair({ name: 'unbounded target detectability', setup: r => {
  r.targets[0].pos.x = 20000; r.targets[0].sheet.setBase('detectability', 300);
}, steps: [{ expected: 2 }] });
pair({ name: 'relentless aggro has unbounded reach', setup: r => {
  r.actor.aggroed = true; r.tuning.target = { relentless: true };
  r.targets.forEach((a, i) => { a.pos.x = 100000 + i * 100; });
}, steps: [{ expected: 2 }] });
pair({ name: 'segmented nearest coil with distant head', setup: r => {
  r.targets[0].pos.x = 5000;
  r.targets[0].worm = { length: 2, spacing: 30, taper: 0.9, hittable: true,
    segments: [vec(4000, 0), vec(45, 0)] };
}, steps: [{ expected: 2 }] });
pair({ name: 'decorative segments do not grant near body', setup: r => {
  r.targets[0].pos.x = 5000;
  r.targets[0].worm = { length: 1, spacing: 30, taper: 0.9, segments: [vec(45, 0)] };
}, steps: [{ expected: null }], saved: true });
pair({ name: 'same-tick concealment, exposure, invisibility and stat mutation', count: 1,
  setup: r => { r.targets[0].pos.x = 500; },
  steps: [
    { expected: null },
    { change: r => r.targets[0].sheet.setBase('detectability', 6), expected: 2 },
    { change: r => { r.targets[0].charges.set('stealth', 1); }, expected: null },
    { change: r => { r.targets[0].concealmentExposedUntil = 11; }, expected: 2 },
    { change: r => r.targets[0].sheet.setBase('invisible', 1), expected: null },
    { change: r => { r.targets[0].sheet.setBase('invisible', 0); r.targets[0].sheet.setBase('detectability', 0); }, expected: null },
    { change: r => { r.targets[0].sheet.setBase('detectability', 1); r.actor.sheet.setBase('detectionRange', 600); }, expected: 2 },
    { change: r => { r.targets[0].concealmentExposedUntil = 0; r.targets[0].charges.delete('stealth'); r.targets[0].sheet.setBase('concealment', 1); }, expected: null },
    { change: r => r.targets[0].sheet.setBase('concealment', 0), expected: 2 },
  ] });
pair({ name: 'same-tick modifier changes are live', count: 1, setup: r => { r.targets[0].pos.x = 500; },
  steps: [
    { expected: null },
    { change: r => r.targets[0].sheet.setSource('probe-range', [{ stat: 'detectability', kind: 'more', value: 9 }]), expected: 2 },
    { change: r => r.targets[0].sheet.removeSource('probe-range'), expected: null },
  ] });
for (const reverse of [false, true]) pair({ name: 'equal score roster order ' + reverse, setup: r => {
  r.targets[1].pos = { ...r.targets[0].pos };
  if (reverse) r.world.actors = [r.actor, ...r.targets.slice().reverse()];
}, steps: [{ expected: reverse ? 3 : 2 }] });
pair({ name: 'target priority beats distance', setup: r => {
  r.targets[1].pos.x = 90; r.targets[1].sheet.setBase('targetPriority', 10);
}, steps: [{ expected: 3 }] });
for (const ignoreTaunt of [false, true]) pair({ name: 'taunt arbitration ' + ignoreTaunt, setup: r => {
  r.targets[1].pos.x = 90; r.targets[1].taunt = true;
  r.targets[0].sheet.setBase('targetPriority', 10); r.tuning.target = { ignoreTaunt };
}, steps: [{ expected: ignoreTaunt ? 2 : 3 }] });
pair({ name: 'sticky held target, then same-tick priority change', setup: r => {
  r.targets[1].pos.x = 90; r.actor.aiTargetId = 3; r.actor.aiTargetRef = r.targets[1];
  r.tuning.target = { stickiness: 2 };
}, steps: [{ expected: 3 }, { change: r => r.targets[0].sheet.setBase('targetPriority', 10), expected: 2 }] });
for (const prefer of ['nearest', 'farthest', 'highestThreat', 'lowestLife', 'highestLife', 'random'] as const) pair({
  name: 'all score preferences ' + prefer, setup: r => {
    r.actor.sheet.setBase('detectionRange', 350); r.actor.threat.set(3, 500);
    r.targets[0].life = 25; r.targets[1].life = 75; r.targets[2].kind = 'monster';
    r.tuning.target = { prefer, kindBias: { monster: 1.5 } };
  },
});
pair({ name: 'LOS rejects nearer body and preserves query order', setup: r => {
  r.targets[1].pos.x = 90; r.blocked.add(2);
}, steps: [{ expected: 3 }, { change: r => { r.blocked.clear(); }, expected: 2 }] });
pair({ name: 'xray preserves absent LOS queries', setup: r => {
  r.blocked.add(2); r.tuning.perception!.xray = true;
}, steps: [{ expected: 2 }] });
pair({ name: 'own breakable bypasses hostility but keeps range', count: 1, setup: r => {
  r.targets[0].team = r.actor.team; r.targets[0].owner = r.actor;
  r.targets[0].construct = { breakable: { ownerMult: 1 } } as Actor['construct'];
  r.sanctuary.add(2);
}, steps: [{ expected: 2 }, { change: r => { r.targets[0].pos.x = 2000; }, expected: null }] });
pair({ name: 'lifecycle filters and same-tick live diplomacy', setup: r => {
  r.targets[1].pos.x = 90; r.targets[2].pos.x = 95;
  r.targets[0].dead = true; r.targets[1].passive = true;
  r.targets[2].team = r.actor.team; r.targets[3].untargetable = true;
}, steps: [{ expected: null }, { change: r => { r.targets[2].team = 'player'; }, expected: 4 },
  { change: r => { r.targets[2].downed = true; }, expected: null }] });
pair({ name: 'same-tick tier and sanctuary gates', count: 1,
  steps: [{ expected: 2 }, { change: r => { r.targets[0].tier = 1; }, expected: null },
    { change: r => { r.targets[0].tier = 0; r.sanctuary.add(2); }, expected: null },
    { change: r => r.sanctuary.clear(), expected: 2 }] });
pair({ name: 'held cadence, mid-window lost sight and reacquisition', count: 1,
  steps: [{ expected: 2 }, { force: false, expected: 2 },
    { force: false, change: r => { r.blocked.add(2); }, expected: null },
    { change: r => { r.blocked.clear(); }, expected: 2 }] });
pair({ name: 'rear cone, alert expansion and concealed alert hearing', count: 1, setup: r => {
  r.tuning.perception = { arcDeg: 90, rearMul: 0.25 }; r.targets[0].pos.x = -80;
}, steps: [{ expected: null }, { change: r => { r.actor.alertUntil = 20; }, expected: 2 },
  { change: r => { r.targets[0].charges.set('stealth', 1); }, expected: null }] });
pair({ name: 'daze suppresses reach and same-tick pain restores it', count: 1, setup: r => {
  r.actor.aiDazeFrom = 10; r.actor.aiDazeUntil = 20; r.actor.lastCombatAt = 0;
}, steps: [{ expected: null }, { change: r => { r.actor.lastCombatAt = 10; }, expected: 2 }] });
pair({ name: 'attention lapse and RNG sequence', count: 1, setup: r => {
  r.tuning.perception!.attentionSpan = [1, 2]; r.tuning.behavior = { reaction: [0.1, 0.4] };
}, steps: [{ expected: 2 }, { change: r => { r.world.time = 20; }, expected: null },
  { change: r => { r.world.time = 24; }, expected: 2 }] });
pair({ name: 'watch suspicion, kin callout and RNG-dependent fresh engagement', setup: r => {
  r.actor.watch = { riseSec: 0.6 }; r.actor.aiLastScanAt = 9.8;
  r.targets[1].team = r.actor.team; r.targets[1].watch = { riseSec: 1 };
  r.targets[1].pos.x = 50;
  r.tuning.perception = { arcDeg: 180, rearMul: 0.5, alertShout: 300, attentionSpan: [1, 2] };
  r.tuning.behavior = { reaction: [0.1, 0.3] };
}, steps: Array.from({ length: 8 }, () => ({ change: r => { r.world.time += 0.2; } })) });
pair({ name: 'sleeping watch has no front cone', count: 1, setup: r => {
  r.actor.watch = { sleep: true }; r.tuning.perception = { arcDeg: 360, rearMul: 0.1 };
}, steps: [{ expected: null }] });

// Non-finite and unusually signed scalars are not silently capped. These go
// through the entire archived/current picker, including LOS tapes: NaN reach
// can pass the old rejection even when its eventual score does not win.
const values = [-Infinity, -3, -0, Number.MIN_VALUE, 0.25, 1, 4, Number.MAX_VALUE, Infinity, NaN];
const cfg = SENSE_CFG as unknown as { stealthMul: number; alertMul: number; concealedRearMul: number };
const savedConfig = { stealthMul: cfg.stealthMul, alertMul: cfg.alertMul, concealedRearMul: cfg.concealedRearMul };
try {
  const configs = [
    savedConfig,
    { stealthMul: -2, alertMul: -3, concealedRearMul: -4 },
    { stealthMul: NaN, alertMul: 2, concealedRearMul: 0.1 },
    { stealthMul: Infinity, alertMul: -Infinity, concealedRearMul: NaN },
  ];
  for (let c = 0; c < configs.length; c++) {
    Object.assign(cfg, configs[c]);
    for (let i = 0; i < values.length; i++) for (let j = 0; j < values.length; j++) pair({
      name: 'numeric/config full picker ' + c + '/' + i + '/' + j,
      count: 2, setup: r => {
        r.actor.sheet.setBase('detectionRange', values[i]);
        r.targets[0].sheet.setBase('detectability', values[j]);
        r.targets[1].sheet.setBase('detectability', values[(j + 3) % values.length]);
        r.tuning.perception!.rearMul = values[(i + j) % values.length];
        r.actor.alertUntil = (i + j) % 2 ? 20 : 0;
        r.targets[0].pos = vec((i % 2 ? -1 : 1) * 400, 700);
        r.targets[1].pos = vec(900, -300);
        if ((i + j) % 3) r.targets[0].charges.set('stealth', 1);
        if ((i + j) % 4) r.targets[1].sheet.setBase('concealment', 1);
      },
    });
  }
} finally { Object.assign(cfg, savedConfig); }
// Stat bases clamp authored negative detection to zero; the live tuning
// multiplier can still produce a signed value and must retain that behavior.
for (const detectMul of [-Infinity, -2, -0, Number.MIN_VALUE, Infinity, NaN]) pair({
  name: 'runtime detection multiplier ' + String(detectMul), count: 2,
  setup: r => {
    r.tuning.target = { detectMul };
    r.targets[0].pos = vec(0, 0); r.targets[1].pos = vec(1000, 500);
  },
});
for (const x of [NaN, Infinity, -Infinity, Number.MAX_VALUE]) for (const y of [NaN, 1000, Infinity]) pair({
  name: 'non-finite coordinates ' + String(x) + '/' + String(y), count: 1,
  setup: r => { r.targets[0].pos = vec(x, y); },
});
pair({ name: 'infinite reach and distance retain original inclusive comparison', count: 1, setup: r => {
  r.actor.sheet.setBase('detectionRange', Infinity); r.targets[0].pos.x = Infinity;
}, steps: [{ expected: 2 }] });

console.log(JSON.stringify({
  pass: true, reference: '401dfdfa', archivedSHA256: createHash('sha256').update(archivedSource.trim()).digest('hex'),
  cases, scans, oldHostility, newHostility, identicalSightCalls: sightCalls, savings,
  scope: 'Actual picker, real Actor/StatSheet/native hostility; deterministic range/LOS fixtures. No frame-time claim or full-world lifecycle simulation.',
}, null, 2));
