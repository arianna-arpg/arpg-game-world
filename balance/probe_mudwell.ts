// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE NEAREST LAW + THE RING LAW (Mu's dwell, her ruling
// 2026-09-13: "given enough class and slot unlocks the dwell ring might be
// too large — standing adjacent to a class could read as the ADJACENT
// class"). Before this pass every vessel within 93px ticked its own linger
// and the seat-order-LAST one wrote the bar and the request: at a hand of 4
// the midpoint linger already picked the wrong class, at 10 a THIRD class.
// Pins:
//   • THE RING LAW (engine/muRing.ts, pure) — small hands land on the exact
//     legacy crescent; a rank whose crescent would pack tighter than its seat
//     gap WIDENS symmetrically about its centre, then CLOSES into a ring,
//     then GROWS; the gap holds at every count up to the whole roster; ranks
//     stack outward by the rank gap; the globe keeps its void beyond the
//     outermost seat (legacy wrap for small hands).
//   • THE DISJOINT REACH — the awake gap is at least twice the dwell reach
//     (the dial law), and in the world at every hand size the midpoint
//     between neighbours engages nobody, while standing by ANY vessel of
//     the hand selects exactly that class.
//   • THE NEAREST LAW (the stage) — under a patched gap that packs vessels
//     inside one reach, the nearest surface engages alone: the seat-order-
//     FIRST vessel wins when nearest (the old code gave it away), the bar
//     names the engaged vessel and nothing else, an exact tie breaks by seat
//     order, a step to the next vessel re-arms the one left behind, and a
//     veiled vessel engages as one refusal.
//   • THE GLOBE — the wrap radius grows past a grown ring and the wisp
//     wraps at the derived radius.
// Run: npx tsx balance/probe_mudwell.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { sceneBegin, muTakeClassRequest, muEngagedVessel } from '../src/engine/scenes';
import { muRankRing, muRings, muDwellReach } from '../src/engine/muRing';
import { MU_CFG, APPARITION_PREFIX, APPARITION_RADIUS, APPARITION_UNKNOWN_ID } from '../src/data/mu';
import { PROLOGUE_SCENE } from '../src/data/scenes';
import { CLASSES } from '../src/data/classes';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

const DT = 1 / 60;
const step = (w: World, s: number): void => {
  for (let t = 0; t < s; t += DT) w.update(DT);
};
const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.hypot(a.x - b.x, a.y - b.y);
const REACH = muDwellReach(APPARITION_RADIUS);
const GAP = MU_CFG.ring.seatGap as { awake: number; veiled: number; faint: number };

bootSimEngine();

/** Seat positions of one ring (unit circle × radius) and the least neighbour distance. */
const seatsOf = (ring: { radius: number; angles: number[] }): { x: number; y: number }[] =>
  ring.angles.map(th => ({ x: Math.cos(th) * ring.radius, y: Math.sin(th) * ring.radius }));
const minNeighbour = (ring: { radius: number; angles: number[] }): number => {
  const s = seatsOf(ring);
  let m = Infinity;
  for (let i = 1; i < s.length; i++) m = Math.min(m, dist(s[i - 1], s[i]));
  return m;
};
const legacyAngles = (n: number): number[] => {
  const span = MU_CFG.arc.to - MU_CFG.arc.from;
  return Array.from({ length: n }, (_, i) => n <= 1 ? MU_CFG.arc.from + span / 2 : MU_CFG.arc.from + span * (i / (n - 1)));
};

// === A) THE RING LAW (pure) ==================================================
{
  let parity = true;
  for (const n of [1, 2, 3]) {
    const r = muRankRing(n, MU_CFG.ranks.awake, GAP.awake);
    const l = legacyAngles(n);
    if (r.radius !== MU_CFG.ranks.awake || r.closed || r.angles.length !== n || r.angles.some((a, i) => a !== l[i])) parity = false;
  }
  check('A1: small hands land on the EXACT legacy crescent (angles ===, base radius, open)', parity);
  let gapHolds = true, worst = Infinity;
  for (let n = 2; n <= CLASSES.length; n++) {
    const r = muRankRing(n, MU_CFG.ranks.awake, GAP.awake);
    const m = minNeighbour(r);
    worst = Math.min(worst, m);
    if (m < GAP.awake - 1e-6) gapHolds = false;
  }
  check(`A2: the awake seat gap (${GAP.awake}px) holds at every count 2..${CLASSES.length}`, gapHolds, `least neighbour ${worst.toFixed(1)}px`);
  let vHolds = true;
  for (let n = 2; n <= CLASSES.length; n++) {
    if (minNeighbour(muRankRing(n, MU_CFG.ranks.veiled, GAP.veiled)) < GAP.veiled - 1e-6) vHolds = false;
  }
  check(`A3: the veiled seat gap (${GAP.veiled}px) holds at every count`, vHolds);
  // The three regimes: the crescent, the widened crescent, the closed ring.
  const centre = MU_CFG.arc.from + (MU_CFG.arc.to - MU_CFG.arc.from) / 2;
  const widened = muRankRing(24, MU_CFG.ranks.veiled, GAP.veiled);
  const span = widened.angles[widened.angles.length - 1] - widened.angles[0];
  check('A4: a too-tight crescent WIDENS symmetrically about its centre, at its floor radius, still open',
    !widened.closed && widened.radius === MU_CFG.ranks.veiled
    && span > (MU_CFG.arc.to - MU_CFG.arc.from) + 1e-6
    && Math.abs((widened.angles[0] + widened.angles[widened.angles.length - 1]) / 2 - centre) < 1e-9,
    `span=${span.toFixed(3)}rad`);
  const closed = muRankRing(12, MU_CFG.ranks.awake, GAP.awake);
  const steps = closed.angles.slice(1).map((a, i) => a - closed.angles[i]);
  const want = GAP.awake / (2 * Math.sin(Math.PI / 12));
  check('A5: twelve awake vessels CLOSE into a ring of equal steps, GROWN exactly to the gap',
    closed.closed && steps.every(s => Math.abs(s - 2 * Math.PI / 12) < 1e-9)
    && Math.abs(closed.radius - want) < 1e-6 && closed.radius > MU_CFG.ranks.awake,
    `radius=${closed.radius.toFixed(1)}`);
  // Rank stacking + the derived globe.
  const big = muRings({ awake: 12, veiled: 24, faint: 12 });
  check('A6: ranks stack outward by at least the rank gap',
    big.veiled.radius >= big.awake.radius + MU_CFG.ring.rankGap - 1e-9
    && big.faint.radius >= big.veiled.radius + MU_CFG.ring.rankGap - 1e-9);
  check('A7: THE GLOBE derives — the wrap keeps `clear` past the outermost seat and its reentry step',
    big.outer === Math.max(big.awake.radius, big.veiled.radius, big.faint.radius)
    && big.wrap.radius === Math.max(MU_CFG.wrap.radius, big.outer + MU_CFG.wrap.clear)
    && big.wrap.radius > MU_CFG.wrap.radius
    && Math.abs(big.wrap.reentry - (big.wrap.radius - (MU_CFG.wrap.radius - MU_CFG.wrap.reentry))) < 1e-9);
  const small = muRings({ awake: 3, veiled: 3, faint: 12 });
  check('A8: a small waking is the legacy world — base radii and the authored globe',
    small.awake.radius === MU_CFG.ranks.awake && small.veiled.radius === MU_CFG.ranks.veiled
    && small.faint.radius === MU_CFG.ranks.faint
    && small.wrap.radius === MU_CFG.wrap.radius && small.wrap.reentry === MU_CFG.wrap.reentry);
  check('A9: THE DISJOINT REACH dial law — the awake gap is at least twice the dwell reach',
    GAP.awake >= 2 * REACH, `gap=${GAP.awake} reach=${REACH}`);
  check('A10: an empty rank stands as a floor for the next (no seats, radius kept)',
    muRankRing(0, 400, GAP.awake).angles.length === 0 && muRankRing(0, 400, GAP.awake).radius === 400);
}

// === helpers over a seated world ============================================
interface Seated { w: World; rows: { id: number; classId: string | null; rank: string }[]; bodies: Actor[]; cx: number; cy: number }
const seatWorld = (hand: number, seed: number, keepClasses = CLASSES.length): Seated => {
  const w = makeSimWorld('warrior', seed);
  w.account.ledger[PROLOGUE_SCENE.ledger] = 1;
  w.account.unlockedSlots.add(hand);
  // A LOCKED remainder (probe_mu's recipe): only the first `keepClasses`
  // stay unlocked, so faint cowls stand and the outermost rank is theirs.
  const keep = new Set(CLASSES.slice(0, keepClasses).map(c => c.id));
  for (const id of [...w.account.unlockedClasses]) if (!keep.has(id)) w.account.unlockedClasses.delete(id);
  sceneBegin(w, 'mu');
  step(w, 0.3);
  const st = w.scene!.state as { apps?: { id: number; classId: string | null; rank: string }[] };
  const rows = (st.apps ?? []).filter(r => r.rank === 'awake');
  const bodies = rows.map(r => w.actors.find(x => x.id === r.id)!);
  return { w, rows, bodies, cx: w.arena.w / 2, cy: w.arena.h / 2 };
};
/** Park the wisp far from every vessel, drain any request, then stand at
 *  (x, y) and linger a full dwell; report the bar labels seen, the engaged
 *  vessel at the end and the request posted. */
const linger = (s: Seated, x: number, y: number): { labels: string[]; engaged: number | null; req: string | null } => {
  const p = s.w.player;
  p.pos.x = s.cx; p.pos.y = s.cy + 300;
  step(s.w, 0.3);
  muTakeClassRequest(s.w);
  p.pos.x = x; p.pos.y = y;
  const labels = new Set<string>();
  for (let t = 0; t < MU_CFG.dwell.sec + 0.4; t += DT) {
    s.w.update(DT);
    const lab = s.w.scene?.bar?.label;
    if (lab) labels.add(lab);
  }
  return { labels: [...labels], engaged: muEngagedVessel(s.w)?.id ?? null, req: muTakeClassRequest(s.w) };
};

// === B) THE DISJOINT REACH in the world ======================================
{
  let chordsOk = true, midpointsClean = true, everySeatSelects = true;
  const detail: string[] = [];
  for (const hand of [3, 4, 6, 8, 10, 12]) {
    const s = seatWorld(hand, 47400 + hand);
    if (s.bodies.length !== hand) { chordsOk = false; detail.push(`hand ${hand}: seated ${s.bodies.length}`); continue; }
    for (let i = 1; i < s.bodies.length; i++) {
      if (dist(s.bodies[i - 1].pos, s.bodies[i].pos) < 2 * REACH - 1e-6) chordsOk = false;
    }
    // the midpoint between the first two neighbours engages nobody
    const a = s.bodies[0], b = s.bodies[1];
    const mid = linger(s, (a.pos.x + b.pos.x) / 2, (a.pos.y + b.pos.y) / 2);
    if (mid.engaged !== null || mid.req !== null || mid.labels.length) { midpointsClean = false; detail.push(`hand ${hand} midpoint → ${mid.req}`); }
    // standing by ANY vessel of the hand selects exactly that class
    for (let i = 0; i < s.bodies.length; i++) {
      const v = s.bodies[i];
      const r = linger(s, v.pos.x, v.pos.y + v.radius + 8);
      if (r.req !== s.rows[i].classId || r.labels.join() !== v.name) { everySeatSelects = false; detail.push(`hand ${hand} seat ${i} (${s.rows[i].classId}) → ${r.req} bar=[${r.labels.join(',')}]`); }
    }
  }
  check('B1: at every hand size neighbours stand at least twice the reach apart (no point reaches two)', chordsOk);
  check('B2: the midpoint between neighbours engages nobody — no bar, no request', midpointsClean, detail.join('; '));
  check('B3: standing by ANY vessel of the hand names that vessel on the bar and requests exactly its class (hands 3..12)',
    everySeatSelects, detail.slice(0, 3).join('; '));
}

// === C) THE NEAREST LAW under a packed gap ===================================
{
  const keep = GAP.awake;
  GAP.awake = 40; // pack twelve vessels 46px apart on the legacy crescent — four inside one reach
  try {
    const s = seatWorld(12, 47513);
    const inReach = (x: number, y: number): number => s.bodies.filter(b => dist({ x, y }, b.pos) <= REACH).length;
    check('C0: the packed crescent stands — several vessels inside one reach',
      s.bodies.length === 12 && inReach(s.bodies[5].pos.x, s.bodies[5].pos.y) >= 3,
      `inReach at seat 5 = ${inReach(s.bodies[5].pos.x, s.bodies[5].pos.y)}`);
    const first = linger(s, s.bodies[0].pos.x, s.bodies[0].pos.y);
    check('C1: the seat-order-FIRST vessel wins when nearest (the old law gave it to a later seat)',
      first.engaged === s.bodies[0].id && first.req === s.rows[0].classId && first.labels.join() === s.bodies[0].name,
      `req=${first.req} bar=[${first.labels.join(',')}]`);
    const midSeat = linger(s, s.bodies[5].pos.x, s.bodies[5].pos.y);
    check('C2: a mid-hand vessel wins when nearest, and the bar names it ALONE',
      midSeat.req === s.rows[5].classId && midSeat.labels.length === 1 && midSeat.labels[0] === s.bodies[5].name);
    // nearer 3 than 4, both in reach
    const a = s.bodies[3], b = s.bodies[4];
    const ux = (b.pos.x - a.pos.x) / dist(a.pos, b.pos), uy = (b.pos.y - a.pos.y) / dist(a.pos, b.pos);
    const lean = linger(s, a.pos.x + ux * 10, a.pos.y + uy * 10);
    check('C3: standing between two vessels but NEARER one selects that one', lean.req === s.rows[3].classId);
    const tie1 = linger(s, (a.pos.x + b.pos.x) / 2, (a.pos.y + b.pos.y) / 2);
    const tie2 = linger(s, (a.pos.x + b.pos.x) / 2, (a.pos.y + b.pos.y) / 2);
    check('C4: an exact tie breaks by seat order, deterministically',
      tie1.req === s.rows[3].classId && tie2.req === s.rows[3].classId, `req=${tie1.req}/${tie2.req}`);
    // re-arm: linger at 3, step to 4, back to 3
    const p = s.w.player;
    const r3 = linger(s, a.pos.x, a.pos.y);
    p.pos.x = b.pos.x; p.pos.y = b.pos.y;
    step(s.w, MU_CFG.dwell.sec + 0.4);
    const r4 = muTakeClassRequest(s.w);
    p.pos.x = a.pos.x; p.pos.y = a.pos.y;
    step(s.w, MU_CFG.dwell.sec + 0.4);
    const r3b = muTakeClassRequest(s.w);
    check('C5: a step to the next vessel re-arms the one left behind (3 → 4 → 3 posts three requests)',
      r3.req === s.rows[3].classId && r4 === s.rows[4].classId && r3b === s.rows[3].classId, `${r3.req} ${r4} ${r3b}`);
    // veiled: one refusal, no request
    const veiled = s.w.actors.find(x => x.defId?.startsWith(APPARITION_PREFIX) && x.defId !== APPARITION_UNKNOWN_ID
      && x.statuses.some(st => st.id === 'mu_veiled'))!;
    const vr = linger(s, veiled.pos.x, veiled.pos.y);
    check('C6: a veiled vessel engages as ONE refusal — no bar, no request',
      muEngagedVessel(s.w)?.rank === 'veiled' && vr.labels.length === 0 && vr.req === null);
  } finally {
    GAP.awake = keep;
  }
}

// === D) THE GLOBE ============================================================
{
  // Every class unlocked: no cowls stand, the veiled crescent is the outer
  // rank, and the derived globe sits at its authored FLOOR — drawn == derived.
  const all = seatWorld(12, 47611);
  const stAll = all.w.scene!.state as { wrap?: { radius: number; reentry: number } };
  const wantAll = muRings({ awake: 12, veiled: CLASSES.length - 12, faint: 0 }).wrap;
  check('D0: the seated globe IS the derived globe (every class unlocked: the authored floor holds)',
    !!stAll.wrap && Math.abs(stAll.wrap.radius - wantAll.radius) < 1e-6 && stAll.wrap.radius === MU_CFG.wrap.radius,
    `wrap=${stAll.wrap?.radius.toFixed(0)}`);
  // A locked remainder: twelve cowls stand outside a grown ring, so the
  // outermost seat pushes the globe past the authored radius.
  const KEEP = 14;
  const s = seatWorld(12, 47612, KEEP);
  const st = s.w.scene!.state as { wrap?: { radius: number; reentry: number } };
  const want = muRings({ awake: 12, veiled: KEEP - 12, faint: Math.min(MU_CFG.faintCap, CLASSES.length - KEEP) }).wrap;
  check('D1: a grown ring stands the globe further out (the seated wrap = the derived wrap, past the authored one)',
    !!st.wrap && st.wrap.radius > MU_CFG.wrap.radius && Math.abs(st.wrap.radius - want.radius) < 1e-6,
    `wrap=${st.wrap?.radius.toFixed(0)} want=${want.radius.toFixed(0)}`);
  const p = s.w.player;
  p.pos.x = s.cx + (st.wrap!.radius + 6); p.pos.y = s.cy;
  s.w.update(DT);
  const d = dist(p.pos, { x: s.cx, y: s.cy });
  check('D2: the wisp wraps at the DERIVED radius, out the antipode at the derived reentry',
    p.pos.x < s.cx && Math.abs(d - st.wrap!.reentry) < 2, `d=${d.toFixed(1)} reentry=${st.wrap!.reentry.toFixed(1)}`);
  const small = seatWorld(3, 47603);
  const st3 = small.w.scene!.state as { wrap?: { radius: number; reentry: number } };
  check('D3: a small waking keeps the authored globe exactly',
    st3.wrap?.radius === MU_CFG.wrap.radius && st3.wrap?.reentry === MU_CFG.wrap.reentry);
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL CHECKS PASS');
process.exit(failed ? 1 : 0);
