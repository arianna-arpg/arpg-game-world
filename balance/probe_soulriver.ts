// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE RIVER OF SOULS end to end (docs/engine/soulriver.md),
// PASS THREE (the untethering): THE STREWN DEAL (instances dealt across the
// underworld chart, pure f(seed), no gate — PAINT == FUNNEL pinned end to
// end against the real dimension sampler), the foreordained PLAN's laws
// (pure function of seed+size; pier islets at the meander apexes; the
// country deal; THE LANDING DEAL — only a dealt, well-spread few stations
// carry exits; THE APRON law — boards end a gangway short of the hull;
// STRAND-ISLETS clear of the sailing lane), THE COIN AT THE CRADLE
// (TrackSpec.reversal: journeys deal their direction per release — both
// directions occur, pauses land on the same piers, arc-frac stays
// journey-relative, everything pure of the clock), THE SOUL-SHIP's lane on
// the pure resolver, THE DECK LAW live (a near-landmass deck carrying
// bodies rigidly through bends, byte-determinism of carried positions),
// THE BOARDS SHIELD + THE SOUL TETHER + THE BOARDWALK (grid soul-water
// drains the survival meter; the deck suspends it; a poured boardwalk
// pier suspends it STATICALLY — the bridge law), the PORTS mint (landing
// destinations only, veiled, spread along the instance's own ribbon, the
// searoute chain, idempotence, wild strands minting NOTHING), and the
// creep fabric's flow.channel window (the current follows its own WATER
// between open banks; confined undertow; the riverbound waived).
// Run: npx tsx balance/probe_soulriver.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { Rng } from '../src/core/rng';
import { vec } from '../src/core/math';
import {
  channelFracOf, dockDestCoordsFor, ferryLaneFor, isSoulriverId, ribbonCoordAt,
  riverSeatOf, riverZoneId, soulriverInstanceOf, soulriverKeyOf, soulriverPlan,
  soulwayCatchAt, soulwayInstancesNear, soulwaySeed,
  SOULRIVER_CFG, SOULWAY_COURSE, type CourseInstance,
} from '../src/world/soulriver';
import { coursePolyline } from '../src/world/courses';
import {
  lintTrackSpec, placeTrack, releaseReversed, riderSurface, trackArcFrac, trackPose, trackRider,
} from '../src/engine/tracks';
import { CreepField, CREEPS, type CreepActorLike, type CreepTerrain } from '../src/engine/creep';
import { GridWalkField } from '../src/world/gridWalk';
import { SURVIVAL_RESOURCES, regionKind } from '../src/world/regions';
import { TILESETS } from '../src/data/tilesets';
import { MONSTERS } from '../src/data/monsters';
import { ZONE_KINDS } from '../src/data/zoneKinds';
import { shapeContains } from '../src/engine/shapes';
import type { ZoneDef } from '../src/data/zones';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x50f7);

const DT = 1 / 60;
const PALETTE = ['grave', 'rift', 'volcanic', 'steppes', 'flesh', 'caul', 'durance'];

/** First dealt instance in a spiral of lattice-sized steps out from the
 *  origin (pure of the seed — the deal makes one near-certain within a few
 *  cells; the throw is the broken-deal alarm). */
const findInstance = (fieldSeed: number): CourseInstance => {
  const span = SOULWAY_COURSE.strew?.span ?? 1400;
  for (let r = 0; r < 12; r++) {
    for (let gy = -r; gy <= r; gy++) {
      for (let gx = -r; gx <= r; gx++) {
        if (Math.max(Math.abs(gx), Math.abs(gy)) !== r) continue;
        const list = soulwayInstancesNear({ x: gx * span + span / 2, y: gy * span + span / 2 }, fieldSeed);
        if (list.length) return list[0];
      }
    }
  }
  throw new Error('no strewn instance within 12 cells — the deal is broken');
};

// --- 0) THE PLAN: one pure truth (the inversion's geometry) -----------------
{
  const a = soulriverPlan(1234, 4900, 4400, PALETTE);
  const b = soulriverPlan(1234, 4900, 4400, PALETTE);
  check('plan: pure — same seed+size deal the identical sea',
    JSON.stringify(a) === JSON.stringify(b));
  const c = soulriverPlan(1235, 4900, 4400, PALETTE);
  check('plan: seeded — a different seed sweeps a different route',
    JSON.stringify(a.channel) !== JSON.stringify(c.channel));

  const cfg = SOULRIVER_CFG.plan;
  const wantDocks = 2 + Math.floor(cfg.waves * 2);
  check(`plan: stations — headwater + ${Math.floor(cfg.waves * 2)} apexes + terminus = ${wantDocks} pier islets`,
    a.docks.length === wantDocks, `${a.docks.length}`);
  check('plan: the headwater boards on the west edge, the terminus on the east',
    a.docks[0].side === 'w' && a.docks[a.docks.length - 1].side === 'e');
  const apexSides = a.docks.slice(1, -1).map(d => d.side).join('');
  check('plan: apex stations alternate south/north down the sweep',
    apexSides === 'snsns', apexSides);
  check('plan: every pause point sits ON the route (pier == channel[chIdx])',
    a.docks.every(d => {
      const p = a.channel[d.chIdx];
      return p && Math.hypot(p.x - d.pier.x, p.y - d.pier.y) < 1e-6;
    }));
  check('plan: exit fractions stay inside the edge (0.06..0.94)',
    a.docks.every(d => d.at >= 0.06 && d.at <= 0.94));
  check('plan: the sailing lane clearance = deck beam + laneClear',
    a.laneHalfW === SOULRIVER_CFG.ferry.deck.hh + cfg.laneClear, `${a.laneHalfW}`);
  check('plan: pier islet radii inside the authored band',
    a.docks.every(d => d.outcropR >= cfg.outcropR[0] && d.outcropR <= cfg.outcropR[1]));
  const dealt = [...a.docks.map(d => d.biome)].sort().join(',');
  check('plan: the country deal is a permutation of the realm palette',
    dealt === [...PALETTE].sort().join(','), dealt);

  // THE LANDING DEAL: the culled few — exits are scarce, the ride is the
  // content. Count in the authored band, well-spread along the route, and
  // every landing wears a DISTINCT country (the shuffled deal guarantees it
  // while the palette outnumbers the landings).
  check(`plan: landings dealt inside the band [${cfg.landings[0]},${cfg.landings[1]}]`,
    a.landings.length >= cfg.landings[0] && a.landings.length <= cfg.landings[1],
    `${a.landings.length} of ${a.docks.length} stations`);
  check('plan: landings are a strict SUBSET — wild strands remain',
    a.landings.length < a.docks.length
    && a.landings.every(d => d.landing)
    && a.docks.filter(d => d.landing).length === a.landings.length);
  const idxs = a.landings.map(d => d.chIdx).sort((x, y) => x - y);
  let minSepIdx = Infinity;
  for (let i = 1; i < idxs.length; i++) minSepIdx = Math.min(minSepIdx, idxs[i] - idxs[i - 1]);
  check('plan: landings spread along the route (max-min deal — never adjacent piers)',
    a.landings.length < 2 || minSepIdx >= cfg.pts / (cfg.waves * 2) * 0.9,
    `min chIdx gap ${minSepIdx}`);
  const landBiomes = a.landings.map(d => d.biome);
  check('plan: every landing serves a distinct country',
    new Set(landBiomes).size === landBiomes.length, landBiomes.join(','));

  // THE APRON LAW: the pier's boards end a gangway short of the hull's
  // flank — ON the islet→pier line, deckHh+plankGap from the pause point.
  check('plan: every apron sits a gangway short of the hull (deckHh + plankGap off the pier)',
    a.docks.every(d => {
      const want = SOULRIVER_CFG.ferry.deck.hh + cfg.plankGap;
      return Math.abs(Math.hypot(d.apron.x - d.pier.x, d.apron.y - d.pier.y) - want) < 1;
    }));
  check('plan: every apron rides its own islet→pier line',
    a.docks.every(d => {
      const vx = d.pier.x - d.pos.x, vy = d.pier.y - d.pos.y;
      const wx = d.apron.x - d.pos.x, wy = d.apron.y - d.pos.y;
      const cross = Math.abs(vx * wy - vy * wx) / (Math.hypot(vx, vy) || 1);
      return cross < 1e-6;
    }));

  // THE ISLET LAWS: land adrift in the expanse, never in the ship's way.
  check('plan: strand-islets rolled (the inversion has land to hop)',
    a.islets.length >= 3, `${a.islets.length}`);
  const laneClear = a.islets.every(s => {
    for (let i = 0; i < a.channel.length - 1; i++) {
      const p = a.channel[i], q = a.channel[i + 1];
      const vx = q.x - p.x, vy = q.y - p.y;
      const L2 = vx * vx + vy * vy || 1;
      const u = Math.max(0, Math.min(1, ((s.x - p.x) * vx + (s.y - p.y) * vy) / L2));
      const d = Math.hypot(s.x - (p.x + vx * u), s.y - (p.y + vy * u));
      if (d < a.laneHalfW + s.r) return false;
    }
    return true;
  });
  check('plan: every islet keeps clear of the sailing lane (nothing moors in the way)', laneClear);
  check('plan: islets keep clear of the pier islets too',
    a.islets.every(s => a.docks.every(d => Math.hypot(s.x - d.pos.x, s.y - d.pos.y) >= d.outcropR + s.r + 60)));
}

// --- 1) THE STREWN DEAL + THE CORRIDOR (paint == funnel, dealt plural) ------
{
  const seed = 0xabcd;
  const inst = findInstance(seed);
  const again = findInstance(seed);
  check('strew: pure — one seed, one deal (same instance twice)',
    inst.key === again.key && inst.anchor.x === again.anchor.x && inst.iseed === again.iseed);
  const other = findInstance(0xabce);
  check('strew: seeded — a different seed deals differently',
    inst.key !== other.key || inst.anchor.x !== other.anchor.x || inst.iseed !== other.iseed);

  const pts = coursePolyline(SOULWAY_COURSE, inst.anchor, inst.iseed);
  const mid = pts[Math.floor(pts.length / 2)];
  const seat = riverSeatOf(inst);
  check('seat: the node sits at the instance\'s own midpoint (the sea\'s heart)',
    seat.x === mid.x && seat.y === mid.y);
  check('corridor: every point ON an instance\'s ribbon funnels to A river',
    pts.every(p => soulwayCatchAt(p, seed) !== null));
  const c1 = soulwayCatchAt(mid, seed), c2 = soulwayCatchAt(mid, seed);
  check('corridor: the catch is deterministic (same instance on every ask)',
    !!c1 && !!c2 && c1.key === c2.key && c1.iseed === c2.iseed);

  // THE ROUNDTRIP: a river's stable zone id re-derives its whole instance
  // (the Foreordained Tenet — never a lookup).
  const rid = riverZoneId(inst.key);
  check('ids: riverZoneId ↔ soulriverKeyOf roundtrip', soulriverKeyOf(rid) === inst.key
    && isSoulriverId(rid) && isSoulriverId('soul_river') && !isSoulriverId('soul_dock_1_2_0'));
  const re = soulriverInstanceOf(rid, seed);
  check('ids: the instance re-derives whole from the zone id (anchor + seed)',
    !!re && re.anchor.x === inst.anchor.x && re.anchor.y === inst.anchor.y && re.iseed === inst.iseed);

  // PAINT == FUNNEL, against the REAL dimension sampler (the seed-expression
  // law: soulwaySeed is the sampler's own derivation, so the drawn ribbon
  // and the caught corridor are ONE predicate). The sim world's underworld
  // has no minted gate, so the flame course is dormant and the equivalence
  // is exact.
  const world = makeSimWorld('warrior', 9105);
  const fs = world.sim.biomeField.fieldSeed;
  check('seed law: soulwaySeed is the dimension sampler\'s own fold',
    soulwaySeed(fs) === ((fs ^ 0xd1a0) >>> 0));
  const winst = findInstance(fs);
  const wpts = coursePolyline(SOULWAY_COURSE, winst.anchor, winst.iseed);
  let agree = 0, samples = 0, painted = 0;
  const span = SOULWAY_COURSE.strew?.span ?? 1400;
  const rng = new Rng(0xbeef);
  for (let i = 0; i < 240; i++) {
    const c = i < 40
      ? wpts[Math.floor(rng.next() * wpts.length)]                  // on the ribbon
      : { x: winst.anchor.x + rng.range(-span * 1.5, span * 1.5),   // the countryside around
          y: winst.anchor.y + rng.range(-span * 1.5, span * 1.5) };
    const isPaint = world.dimensionBiomeAtMap('underworld', c) === SOULWAY_COURSE.biome;
    const isCatch = soulwayCatchAt(c, fs) !== null;
    samples++;
    if (isPaint) painted++;
    if (isPaint === isCatch) agree++;
  }
  check('PAINT == FUNNEL: the drawn ribbon and the catch corridor are the same predicate',
    agree === samples, `${agree}/${samples} agree (${painted} painted)`);
  check('paint: the ribbon actually paints (the sweep sampled real water)', painted >= 40, `${painted}`);

  // THE PORT COORDS: spread along the instance's own ribbon, alternating
  // banks, never stacked.
  const fracs = [0.1, 0.5, 0.9];
  const coords = dockDestCoordsFor(winst, fracs);
  check('ports: one coordinate per landing fraction', coords.length === fracs.length);
  let minSep = Infinity;
  for (let i = 0; i < coords.length; i++) {
    for (let j = i + 1; j < coords.length; j++) {
      minSep = Math.min(minSep, Math.hypot(coords[i].x - coords[j].x, coords[i].y - coords[j].y));
    }
  }
  check('ports: pairwise separation is real geography (≥ 60 node-units)',
    minSep >= 60, `min ${minSep.toFixed(0)}`);
  check('ribbon: coordAt walks the polyline (t=0 at the spring, t=1 at the terminus)',
    Math.hypot(ribbonCoordAt(winst, 0).x - wpts[0].x, ribbonCoordAt(winst, 0).y - wpts[0].y) < 1e-6
    && Math.hypot(ribbonCoordAt(winst, 1).x - wpts[wpts.length - 1].x, ribbonCoordAt(winst, 1).y - wpts[wpts.length - 1].y) < 1e-6);
}

// --- 2) THE SHIP'S LANE + THE COIN AT THE CRADLE ----------------------------
{
  const plan = soulriverPlan(777, 4900, 4400, PALETTE);
  const spec = ferryLaneFor(plan);
  const gripes = lintTrackSpec(spec, 'ferry');
  check('lane: lint-clean (speed/pauses/rearm/reversal all inside the bands)',
    gripes.length === 0, gripes.join('; '));
  check('lane: a pause at every pier', spec.pauses!.length === plan.docks.length);
  check('lane: the end holds are SYMMETRIC (boarding reads the same both ways)',
    spec.pauses![0].sec === SOULRIVER_CFG.ferry.boardSec
    && spec.pauses![spec.pauses!.length - 1].sec === SOULRIVER_CFG.ferry.boardSec);
  check('lane: the coin is armed (spec.reversal = the ferry dial)',
    spec.reversal === SOULRIVER_CFG.ferry.reversal);
  check(`lane: ${SOULRIVER_CFG.ferry.count} ships share the lane a phase apart`,
    spec.riders.length === SOULRIVER_CFG.ferry.count
    && spec.riders.every(r => trackRider(r.kind)?.carry === true));
  const tr = placeTrack(spec);
  const pauseSum = spec.pauses!.reduce((s, p) => s + p.sec, 0);
  check('lane: pass = travel + every dock dwell',
    Math.abs(tr.passSec - (tr.arc.total / spec.speed + pauseSum)) < 1e-6,
    `${tr.passSec.toFixed(1)}s`);
  check('lane: the cycle adds the cradle rest (once+rearm)',
    Math.abs(tr.periodSec - (tr.passSec + SOULRIVER_CFG.ferry.restSec)) < 1e-6);
  check('lane: the reversed tables stand (arcR mirrors the arc, same length)',
    !!tr.arcR && !!tr.scheduleR && Math.abs(tr.arcR.total - tr.arc.total) < 1e-6);
  const mid = trackPose(tr, tr.passSec * 0.4, 0);
  check('lane: mid-journey the ship sails (not pending)', !mid.pending);
  const rest = trackPose(tr, tr.passSec + SOULRIVER_CFG.ferry.restSec * 0.5, 0);
  check('lane: the rest window wears the cradle (pending — the dissolved read)',
    rest.pending === true);

  // THE COIN: both directions occur across releases (chance 0.5 — 32
  // ordinals miss a side with odds 2^-31), each release is pure, and a
  // reversed journey springs from the FAR strand.
  const flips: boolean[] = [];
  for (let k = 0; k < 32; k++) flips.push(releaseReversed(tr, 0, k));
  check('coin: both directions dealt across releases',
    flips.includes(true) && flips.includes(false),
    `${flips.filter(Boolean).length}/32 reversed`);
  check('coin: pure — the same ordinal deals the same face',
    flips.every((f, k) => releaseReversed(tr, 0, k) === f));
  const head = plan.channel[0], term = plan.channel[plan.channel.length - 1];
  const kRev = flips.indexOf(true), kFwd = flips.indexOf(false);
  const springOf = (k: number): { x: number; y: number } => trackPose(tr, k * tr.periodSec + 0.05, 0);
  const sRev = springOf(kRev), sFwd = springOf(kFwd);
  check('coin: a FORWARD release springs at the headwater',
    Math.hypot(sFwd.x - head.x, sFwd.y - head.y) < 2,
    `(${sFwd.x.toFixed(0)},${sFwd.y.toFixed(0)})`);
  check('coin: a REVERSED release springs at the terminus (upstream journeys exist)',
    Math.hypot(sRev.x - term.x, sRev.y - term.y) < 2,
    `(${sRev.x.toFixed(0)},${sRev.y.toFixed(0)})`);
  // The reversed pass still calls at EVERY pier (pauses re-keyed to the
  // same physical waypoints).
  const visited = new Set<number>();
  for (let t = kRev * tr.periodSec; t <= kRev * tr.periodSec + tr.passSec; t += 0.2) {
    const p = trackPose(tr, t, 0);
    if (!p.paused || p.pending) continue;
    for (const d of plan.docks) {
      if (Math.hypot(p.x - d.pier.x, p.y - d.pier.y) < 3) visited.add(d.i);
    }
  }
  check('coin: the reversed journey calls at every pier',
    visited.size === plan.docks.length, `${visited.size}/${plan.docks.length}`);
  // Arc-frac stays JOURNEY-relative: the fade window opens near the end of
  // the pass whichever way the coin fell.
  const lastPause = spec.pauses![spec.pauses!.length - 1].sec;
  const fEndFwd = trackArcFrac(tr, kFwd * tr.periodSec + tr.passSec - lastPause - 0.4, 0);
  const fEndRev = trackArcFrac(tr, kRev * tr.periodSec + tr.passSec - lastPause - 0.4, 0);
  check('frac: the last reach reads near 1 on a FORWARD journey',
    fEndFwd !== null && fEndFwd > 1 - SOULRIVER_CFG.ferry.fadeTail, `${fEndFwd?.toFixed(3)}`);
  check('frac: …and near 1 on a REVERSED journey (journey-relative, not east-relative)',
    fEndRev !== null && fEndRev > 1 - SOULRIVER_CFG.ferry.fadeTail, `${fEndRev?.toFixed(3)}`);
  const fStartRev = trackArcFrac(tr, kRev * tr.periodSec + 0.2, 0);
  check('frac: a reversed journey BEGINS near 0 (its own spring)',
    fStartRev !== null && fStartRev < 0.05, `${fStartRev?.toFixed(3)}`);
  // Purity across placements: two placeTracks of the same spec agree pose
  // for pose at arbitrary clocks (the byte-determinism the wire relies on).
  const tr2 = placeTrack(ferryLaneFor(plan));
  let poseAgree = true;
  for (let i = 0; i < 200; i++) {
    const t = i * (tr.periodSec / 37.3);
    const p1 = trackPose(tr, t, 0.5), p2 = trackPose(tr2, t, 0.5);
    if (p1.x !== p2.x || p1.y !== p2.y || p1.rot !== p2.rot || p1.pending !== p2.pending) { poseAgree = false; break; }
  }
  check('coin: two same-spec placements agree byte-for-byte at every clock', poseAgree);
  // Legacy lanes never flip: a spec without the lever has no reversed
  // tables and every release reads forward.
  const plain = placeTrack({ ...spec, reversal: undefined });
  check('coin: a lever-less lane never reverses (legacy byte-path)',
    !plain.arcR && [0, 1, 2, 3, 4, 5].every(k => !releaseReversed(plain, 0, k)));
}

// --- 3) THE DECK LAW: a near-landmass carrying bodies, live ----------------
{
  const world = makeSimWorld('warrior', 9101);
  const p = world.player;
  const tr = world.addTrack({
    path: [vec(400, 600), vec(1000, 600), vec(1000, 900)],
    mode: 'pingpong', speed: 120,
    pauses: [{ at: 0, sec: 1 }],
    riders: [{ kind: 'pale_ferry', phase: 0 }],
    groove: true,
  })!;
  const rider = tr.riders[0];
  check('deck: the Soul-Ship is a NEAR-LANDMASS (rect ≥ 400×180 of boards)',
    rider.def.surface.kind === 'rect' && rider.def.surface.hw >= 200 && rider.def.surface.hh >= 90,
    `${rider.def.surface.kind === 'rect' ? rider.def.surface.hw * 2 + 'x' + rider.def.surface.hh * 2 : '?'}`);
  const seat0 = { x: 150, y: -70 };
  p.pos = vec(400 + seat0.x, 600 + seat0.y);
  const before = { x: p.pos.x, y: p.pos.y };
  for (let i = 0; i < 30; i++) world.update(DT);
  check('deck: a paused deck moves nobody',
    Math.abs(p.pos.x - before.x) < 0.5 && Math.abs(p.pos.y - before.y) < 0.5);
  for (let i = 0; i < 60 * 4; i++) world.update(DT);
  const pose = trackPose(tr, world.time, rider.phase, rider.def);
  const cos = Math.cos(pose.rot), sin = Math.sin(pose.rot);
  const lx = cos * (p.pos.x - pose.x) + sin * (p.pos.y - pose.y);
  const ly = -sin * (p.pos.x - pose.x) + cos * (p.pos.y - pose.y);
  check('deck: the passenger RODE at the far corner seat (rigid step, no smear)',
    Math.abs(lx - seat0.x) < 1.5 && Math.abs(ly - seat0.y) < 1.5,
    `seat (${lx.toFixed(2)}, ${ly.toFixed(2)}) vs (${seat0.x}, ${seat0.y})`);
  for (let i = 0; i < 60 * 4; i++) world.update(DT);
  const poseB = trackPose(tr, world.time, rider.phase, rider.def);
  const cosB = Math.cos(poseB.rot), sinB = Math.sin(poseB.rot);
  const lxB = cosB * (p.pos.x - poseB.x) + sinB * (p.pos.y - poseB.y);
  const lyB = -sinB * (p.pos.x - poseB.x) + cosB * (p.pos.y - poseB.y);
  check('deck: the corner seat survived the BEND (swung with the bow)',
    Math.abs(lxB - seat0.x) < 1.5 && Math.abs(lyB - seat0.y) < 1.5,
    `seat (${lxB.toFixed(2)}, ${lyB.toFixed(2)})`);
  check('deck: still honestly ON the boards (drawn == tested == carried)',
    shapeContains(riderSurface(rider.def, poseB), poseB.x, poseB.y, p.pos.x, p.pos.y, 0));
}

// --- 4) THE SOUL TETHER + THE BOARDS SHIELD + THE BOARDWALK, live -----------
{
  check('tether: the soul survival row stands (the light-bar fabric, repurposed)',
    !!SURVIVAL_RESOURCES.soul && SURVIVAL_RESOURCES.soul.underflowPctLifePerSec > 0);
  check('tether: soul-water names the drain (region → survival row)',
    regionKind('soul_water')?.survival?.resource === 'soul');
  check('tether: soul-water is the LIVING water (animate \'souls\')',
    regionKind('soul_water')?.visual?.animate === 'souls');
  const bw = regionKind('boardwalk');
  check('boards: the boardwalk region stands — walkable, statusless, drainless',
    !!bw && bw.walkable === true && !bw.standStatus && !bw.survival && !bw.douses);

  const world = makeSimWorld('warrior', 9104);
  const p = world.player;
  // Pour a pocket sea into the arena's grid (the recipe's own pour, in
  // miniature): everything in [200..1400]×[300..900] is the pale water,
  // with a BOARDWALK pier strip poured over it (the bridge law).
  const wf = new GridWalkField(1600, 1200, 30);
  wf.fillRegion(0, 0, 1600, 1200, 'ground');
  wf.fillRegion(200, 300, 1400, 900, 'soul_water');
  wf.fillRegion(240, 560, 560, 640, 'boardwalk');
  (world as unknown as { walk: GridWalkField }).walk = wf;
  // A ship paused mid-water: the boards between the hero and the river.
  world.addTrack({
    path: [vec(700, 600), vec(1300, 600)],
    mode: 'pingpong', speed: 100,
    pauses: [{ at: 0, sec: 4 }],
    riders: [{ kind: 'pale_ferry', phase: 0 }],
    groove: true,
  });
  p.pos = vec(700, 600); // on the paused deck, over the water
  for (let i = 0; i < 60; i++) world.update(DT);
  const onDeckSoul = p.survival?.get('soul') ?? SURVIVAL_RESOURCES.soul.max;
  const wadingOnDeck = p.statuses?.some?.(s => s.id === 'wading') ?? false;
  check('shield: on the boards the ground beneath is SUSPENDED (no wading)',
    !wadingOnDeck && p.gridRegion === undefined);
  check('shield: the soul tether never drains through the hull',
    onDeckSoul >= SURVIVAL_RESOURCES.soul.max - 1e-6, `${onDeckSoul.toFixed(2)}`);
  // Overboard: the river takes hold.
  p.pos = vec(400, 700); // open water, no deck
  for (let i = 0; i < 90; i++) world.update(DT);
  const overboardSoul = p.survival?.get('soul') ?? SURVIVAL_RESOURCES.soul.max;
  check('tether: in the water the soul DRAINS (~1.5s ≈ 1.5 spent)',
    overboardSoul <= SURVIVAL_RESOURCES.soul.max - 1.2,
    `${overboardSoul.toFixed(2)} / ${SURVIVAL_RESOURCES.soul.max}`);
  check('tether: the water also wades (the region\'s stand status)',
    p.statuses?.some?.(s => s.id === 'wading') === true);
  // THE BOARDWALK: step onto the poured pier strip — mid-water, but the
  // cell IS boards: the wade lifts, the drain stops, the tether breathes.
  p.pos = vec(400, 600); // on the pier strip, water all around
  for (let i = 0; i < 90; i++) world.update(DT);
  const onPierSoul = p.survival?.get('soul') ?? 0;
  check('boards: the pier cell reads boardwalk under the feet',
    wf.regionAt(400, 600) === 'boardwalk' && p.gridRegion === 'boardwalk');
  check('boards: standing the pier REFILLS the tether (the bridge law — no debuff at the dock)',
    onPierSoul > overboardSoul + 1, `${overboardSoul.toFixed(2)} → ${onPierSoul.toFixed(2)}`);
  check('boards: no wading on the pier (dry boots over the deep)',
    p.statuses?.some?.(s => s.id === 'wading') !== true);
  // Ashore: the tether breathes back the same way.
  p.pos = vec(100, 100); // dry ground
  for (let i = 0; i < 90; i++) world.update(DT);
  const ashoreSoul = p.survival?.get('soul') ?? 0;
  check('tether: ashore the soul refills (regen off the row)',
    ashoreSoul > overboardSoul + 1, `${overboardSoul.toFixed(2)} → ${ashoreSoul.toFixed(2)}`);
}

// --- 5) DETERMINISM: carried positions byte-equal across worlds ------------
{
  const rig = (): ReturnType<typeof makeSimWorld> => {
    const w = makeSimWorld('warrior', 9102);
    w.addTrack({
      path: [vec(300, 500), vec(1200, 500)], mode: 'pingpong', speed: 100,
      riders: [{ kind: 'pale_ferry', phase: 0 }], groove: true,
    });
    w.player.pos = vec(340, 520);
    return w;
  };
  const A = rig(), B = rig();
  let maxD = 0;
  for (let i = 0; i < 600; i++) {
    A.update(DT); B.update(DT);
    maxD = Math.max(maxD,
      Math.abs(A.player.pos.x - B.player.pos.x),
      Math.abs(A.player.pos.y - B.player.pos.y));
  }
  check('determinism: two same-seed worlds carry the passenger byte-equal for 10s',
    maxD === 0, `maxΔ=${maxD}`);
}

// --- 6) THE PORTS MINT: landing destinations only, veiled, chained ---------
{
  const world = makeSimWorld('warrior', 9103);
  const fs = world.sim.biomeField.fieldSeed;
  const inst = findInstance(fs);
  const seat = riverSeatOf(inst);
  const river = {
    id: riverZoneId(inst.key), name: 'The River of Souls', level: 14,
    seed: 5150, size: { w: 4900, h: 4400 }, map: { x: seat.x, y: seat.y },
    dimension: 'underworld',
    exits: [{ to: 'uw_shore_1', side: 'w', at: 0.22 }],
    layoutParams: {},
  } as unknown as ZoneDef;
  world.zoneMap[river.id] = river;
  (world as unknown as { soulriverPorts(r: ZoneDef): void }).soulriverPorts(river);
  const palette = (river.layoutParams as { dockBiomes?: string[] }).dockBiomes ?? [];
  check('ports: the country deal is stamped for the layout to read', palette.length > 0);
  const plan = soulriverPlan(5150, 4900, 4400, palette);
  const dockPre = `${SOULRIVER_CFG.dockIdBase}_`;
  const reals = river.exits.filter(x => x.to !== '?' && !x.to.startsWith(dockPre));
  check('ports: the discovery shore (real edge) is kept untouched',
    reals.length === 1 && reals[0].to === 'uw_shore_1');
  const dockExits = river.exits.filter(x => x.to.startsWith(dockPre));
  check('ports: exits for the LANDINGS ONLY (the culled few — no wall of doors)',
    dockExits.length === plan.landings.length && river.exits.every(x => x.to !== '?'),
    `${dockExits.length} exits vs ${plan.landings.length} landings of ${plan.docks.length} stations`);
  const dests = plan.landings.map(d => world.zoneMap[`${dockPre}${inst.key}_${d.i}`]).filter(Boolean);
  check('ports: every landing destination MINTED on the map', dests.length === plan.landings.length);
  const wildIds = plan.docks.filter(d => !d.landing).map(d => `${dockPre}${inst.key}_${d.i}`);
  check('ports: wild strands mint NOTHING (the ferry calls; the shore leads nowhere)',
    wildIds.every(id => !world.zoneMap[id]));
  check('ports: destinations mint VEILED (revealed as found)',
    dests.every(d => d.veiled === true));
  let minSep = Infinity;
  for (let i = 0; i < dests.length; i++) {
    for (let j = i + 1; j < dests.length; j++) {
      minSep = Math.min(minSep, Math.hypot(dests[i].map.x - dests[j].map.x, dests[i].map.y - dests[j].map.y));
    }
  }
  check('ports: destinations spread along the ribbon (true geography, ≥ 50nu apart)',
    dests.length < 2 || minSep >= 50, `min ${minSep.toFixed(0)}`);
  check('ports: back-edges wire every destination to the river',
    dests.every(d => d.exits.some(e => e.to === river.id)));
  const chained = dests.filter(d => (d.searoutes ?? []).length > 0).length;
  check('ports: the searoute lane chains the landings down the ribbon',
    chained >= dests.length - 1, `${chained}/${dests.length}`);
  const rerun = river.exits.length;
  (world as unknown as { soulriverPorts(r: ZoneDef): void }).soulriverPorts(river);
  check('ports: idempotent (a second call mints nothing, doubles nothing)',
    river.exits.length === rerun
    && plan.landings.every((d, k) => world.zoneMap[`${dockPre}${inst.key}_${d.i}`] === dests[k]));
  // THE CHART'S SHIPS: with the river charted, the pure ferry pose projects
  // onto the ribbon (the voyage-boat idiom) — coordinates land ON the
  // course corridor.
  (world.visited as Set<string>).add(river.id);
  river.layoutParams = { ...river.layoutParams };
  const ships = world.soulriverShipCoords();
  check('chart: soul-ship markers ride once the river is charted (abroad ships only)',
    ships.length >= 1, `${ships.length} abroad`);
  check('chart: every ship marker sits ON its ribbon (projection == corridor)',
    ships.every(s => soulwayCatchAt({ x: s.x, y: s.y }, fs) !== null));
  check('chart: frac projection is sane (0 at the spring, 1 at the terminus)',
    Math.abs(channelFracOf(plan, plan.channel[0].x, plan.channel[0].y)) < 0.01
    && Math.abs(channelFracOf(plan, plan.channel[plan.channel.length - 1].x, plan.channel[plan.channel.length - 1].y) - 1) < 0.01);
}

// --- 7) THE CHANNEL WINDOW: the current follows its own water --------------
{
  const inWater = (x: number, y: number): boolean =>
    (Math.abs(y - 500) <= 90 && x >= 100 && x <= 1290)
    || (Math.abs(x - 1200) <= 90 && y >= 410 && y <= 1560);
  const terrain: CreepTerrain = {
    groundKindAt: (x, y) => (inWater(x, y) ? 'soul_water' : null),
    eachFuelNear: () => {},
    consume: () => {},
    stamp: () => {},
    drag: () => {},
    drown: () => {},
    openAt: () => true, // the banks are OPEN — that is the whole point
  };
  const f = new CreepField(new Rng(21), 1500, 1700);
  f.setTerrain(terrain);
  const src = f.addFront(CREEPS['soul_current'], 150, 500, 0, { reach: 60, bornFrac: 1 })!;
  let inCh = 0, samples = 0, reachedSouth = false;
  for (let i = 0; i < 60 * 26 && f.sources.includes(src); i++) {
    f.update(DT, i * DT, []);
    if (i % 30 === 0) { samples++; if (inWater(src.pos.x, src.pos.y)) inCh++; }
    if (src.pos.y > 1250) { reachedSouth = true; break; }
  }
  check('channel: the current TURNED with its water across open banks',
    reachedSouth, `ended (${src.pos.x.toFixed(0)}, ${src.pos.y.toFixed(0)})`);
  check('channel: the surge stayed in its water the whole run',
    samples > 0 && inCh / samples >= 0.9, `${inCh}/${samples}`);

  const f2 = new CreepField(new Rng(22), 1500, 1000);
  const drags = new Map<CreepActorLike, number>();
  const straight = (x: number, y: number): boolean => Math.abs(y - 500) <= 90 && x >= 100 && x <= 1400;
  const terrain2: CreepTerrain = {
    ...terrain,
    groundKindAt: (x, y) => (straight(x, y) ? 'soul_water' : null),
    drag: (a, dx) => { drags.set(a, (drags.get(a) ?? 0) + dx); },
  };
  f2.setTerrain(terrain2);
  const src2 = f2.addFront(CREEPS['soul_current'], 150, 500, 0, { reach: 70, bornFrac: 1 })!;
  const body = (x: number, y: number, faction?: string): CreepActorLike =>
    ({ pos: vec(x, y), radius: 12, dead: false, faction, applyStatus: () => {} } as unknown as CreepActorLike);
  const swimmer = body(360, 500);
  const banker = body(360, 720);
  const kin = body(360, 480, 'riverbound');
  for (let i = 0; i < 60 * 4 && f2.sources.includes(src2); i++) {
    f2.update(DT, i * DT, [swimmer, banker, kin]);
    swimmer.pos.x = 360; banker.pos.x = 360; kin.pos.x = 360;
  }
  check('undertow: a body in the water is asked DOWNSTREAM',
    (drags.get(swimmer) ?? 0) > 0, `Σdx=${(drags.get(swimmer) ?? 0).toFixed(0)}`);
  check('undertow: the open bank beside the water is never gripped (confine)',
    (drags.get(banker) ?? 0) === 0);
  check('undertow: the riverbound ride their own current free',
    (drags.get(kin) ?? 0) === 0);
}

// --- 8) CONTENT LAWS: the kit stands whole --------------------------------
{
  const ferry = trackRider('pale_ferry');
  check('kit: the Soul-Ship rider is registered, a carrier, and harmless',
    !!ferry && ferry.carry === true && !ferry.payload.hit && !ferry.payload.impulse);
  const cfgDeck = SOULRIVER_CFG.ferry.deck;
  check('kit: deck config == rider surface (the agreement contract)',
    ferry?.surface.kind === 'rect' && ferry.surface.hw === cfgDeck.hw && ferry.surface.hh === cfgDeck.hh);
  check('kit: the riverbound stand in the roster',
    ['lorn_shade', 'drowned_hauler', 'soul_wellspring', 'soul_mote', 'farshore_warden']
      .every(id => !!MONSTERS[id]));
  check('kit: the current is registered with its channel window',
    CREEPS['soul_current']?.front?.flow?.channel?.includes('soul_water') === true);
  check('kit: the sea tileset stands (frontier-locked, realm-owned, perf-probed)',
    TILESETS['river_of_souls']?.frontier === false
    && TILESETS['river_of_souls']?.realm === 'underworld'
    && TILESETS['river_of_souls']?.perfProbe === true);
  check('kit: the soulway is STREWN on the underworld chart (untethered, paint==funnel)',
    SOULWAY_COURSE.biome === 'soulway' && SOULWAY_COURSE.feather === 0
    && SOULWAY_COURSE.anchor === 'strewn' && !!SOULWAY_COURSE.strew
    && SOULWAY_COURSE.strew.chance > 0 && SOULWAY_COURSE.strew.span > SOULWAY_COURSE.halfWidth * 2);
  check('kit: the sea-node identity stands (zone kind — lanes + level kept)',
    !!ZONE_KINDS['soulriver'] && !!ZONE_KINDS['soulriver'].lanes && ZONE_KINDS['soulriver'].keepLevel === true);
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
