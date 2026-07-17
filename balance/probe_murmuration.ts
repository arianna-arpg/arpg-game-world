// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE FLOCKING FABRIC end to end on the real engine
// (docs/engine/flocking.md). Pins:
//   - THE ONE MATH: weaveOffset golden values; weaveVel IS the analytic
//     derivative of weaveOffset (numeric-diff agreement); spinOffset golden
//     — the projectile integrator and the flock steer share these bytes,
//   - FLIGHT AS A STATE: the aloft status raises Actor.flying on the next
//     status tick, shedding it lands the body, and a def-innate flier
//     (flyingBase) stays aloft when a worn status ends — the re-derive
//     contract, every removal path self-healing,
//   - the aloft speed gift (moveSpeed reads through the sheet),
//   - THE ALTITUDE SPLIT: a flying body overlapping a grounded one is NOT
//     shouldered apart (streams over it); the same pair grounded parts,
//   - FLOCK COHESION: scattered skimmers pull into a fold and take wing
//     (idle flocking — no target anywhere),
//   - TRAJECTORY-WORN WEAVE: an aloft flock body's bearing oscillates
//     (sign flips) far more than a plain swarm body walking the same watch,
//   - THE DIVE CYCLE: aloft → a scripted locust_dive (real pipeline cast)
//     → a telegraphed leap (landing ring carried on the leap state, read by
//     imminentThreatTo) → wings SHED at commit → a grounded window (script
//     phase, flying false) → wings again — the whole wheel, observed live,
//   - THE SONG: a stridulant's stridulate carries furor onto flock kin,
//   - data pins: the wingling wears the flock graft; packSize declared.
// Run: npx tsx balance/probe_murmuration.ts
// ---------------------------------------------------------------------------

import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { updateAI } from '../src/engine/ai';
import { MONSTERS } from '../src/data/monsters';
import { weaveOffset, weaveVel, spinOffset } from '../src/engine/flight';
import { vec } from '../src/core/math';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

seedGlobalRandom(0x5eed);

// --- A. THE ONE MATH ---------------------------------------------------------
{
  const out = vec(0, 0);
  // Golden: weave 3, amp 40, age 1.25, head 0 → lat = 40·sin(7.5),
  // lon = 20·sin(15), perp = π/2 ⇒ x = lon, y = lat.
  weaveOffset(3, 40, 1.25, 0, out);
  const lat = 40 * Math.sin(3 * 1.25 * 2);
  const lon = 20 * Math.sin(3 * 1.25 * 4);
  check('math: weaveOffset golden', Math.abs(out.x - lon) < 1e-9 && Math.abs(out.y - lat) < 1e-9,
    `got (${out.x.toFixed(4)}, ${out.y.toFixed(4)})`);
  // weaveVel is d/dt weaveOffset: numeric-diff agreement at 3 sample ages.
  let maxErr = 0;
  const h = 1e-5;
  const a2 = vec(0, 0), b2 = vec(0, 0), v2 = vec(0, 0);
  for (const age of [0.3, 1.1, 2.7]) {
    weaveOffset(3.2, 30, age + h, 0.7, a2);
    weaveOffset(3.2, 30, age - h, 0.7, b2);
    weaveVel(3.2, 30, age, 0.7, v2);
    maxErr = Math.max(maxErr,
      Math.abs((a2.x - b2.x) / (2 * h) - v2.x), Math.abs((a2.y - b2.y) / (2 * h) - v2.y));
  }
  check('math: weaveVel = d/dt weaveOffset', maxErr < 1e-3, `max err ${maxErr.toExponential(2)}`);
  spinOffset(4, 35, 0.5, out);
  const r = 35 * Math.min(1, 4 / 8);
  check('math: spinOffset golden',
    Math.abs(out.x - Math.cos(2) * r) < 1e-9 && Math.abs(out.y - Math.sin(2) * r) < 1e-9);
}

// --- the shared stepping loop (updateAI is main-loop driven, not w.update) ---
const DT = 1 / 60;
function step(w: World, secs: number): void {
  const n = Math.round(secs / DT);
  for (let i = 0; i < n; i++) {
    for (const a of w.actors) updateAI(a, w, DT);
    w.update(DT);
  }
}
function retire(w: World, bodies: Actor[]): void {
  for (const a of bodies) { a.dead = true; }
  w.update(DT);
}
function mint(w: World, id: string, x: number, y: number): Actor {
  const m = w.createMonster(id, 5, 'enemy');
  m.pos = vec(x, y);
  w.actors.push(m);
  return m;
}

// --- B. FLIGHT AS A STATE ------------------------------------------------------
{
  const w = makeSimWorld('warrior', 0xf11e);
  w.player.pos = vec(120, 120);
  w.player.invulnerable = true;
  const drone = mint(w, 'chitin_drone', 900, 900);
  w.update(DT);
  check('state: a drone walks grounded', !drone.flying);
  drone.applyStatus('aloft', 0, 1, 'probe');
  w.update(DT);
  check('state: aloft raises Actor.flying on the next tick', drone.flying);
  const msAloft = drone.sheet.get('moveSpeed');
  drone.endStatus('aloft');
  w.update(DT);
  check('state: shedding aloft lands the body', !drone.flying);
  const msGround = drone.sheet.get('moveSpeed');
  check('state: aloft carried the speed gift', msAloft > msGround * 1.2,
    `${msAloft.toFixed(1)} aloft vs ${msGround.toFixed(1)} grounded`);
  // The re-derive restores the def-innate base, not bare ground.
  drone.flyingBase = true;
  drone.applyStatus('aloft', 0, 1, 'probe');
  w.update(DT);
  drone.endStatus('aloft');
  w.update(DT);
  check('state: a def-innate flier stays aloft past a worn status', drone.flying);
  retire(w, [drone]);

  // --- D. THE ALTITUDE SPLIT (separation) — no AI, pure physics ticks ------
  // (4px offset: perfectly-coincident bodies are the engine's own
  // degenerate-angle skip, not the altitude rule under test.)
  const flier = mint(w, 'chitin_skimmer', 700, 600);
  flier.applyStatus('aloft', 0, 1, 'probe');
  const walker = mint(w, 'chitin_drone', 704, 600);
  for (let i = 0; i < 30; i++) w.update(DT);
  const dMixed = Math.hypot(flier.pos.x - walker.pos.x, flier.pos.y - walker.pos.y);
  check('split: a flier streams over a grounded body (no shoulder)',
    dMixed < (flier.radius + walker.radius) * 0.7, `sep ${dMixed.toFixed(1)}px`);
  flier.endStatus('aloft');
  for (let i = 0; i < 45; i++) w.update(DT);
  const dGround = Math.hypot(flier.pos.x - walker.pos.x, flier.pos.y - walker.pos.y);
  check('split: the same pair grounded parts normally',
    dGround >= (flier.radius + walker.radius) * 0.9, `sep ${dGround.toFixed(1)}px`);
  retire(w, [flier, walker]);
}

// --- E. THE FOLD HOLDS (controlled: coupling on vs coupling off) ---------------
// Flocks SPAWN folded (packSize spreads a pack ±90px) — the fabric's job is
// keeping the shape against 12 seconds of wander + weave churn. Two octets
// of IDENTICAL bodies (same speed, same aloft, same weave/erratic noise,
// same restless idle): one wears the coupling triad, the control has it
// zeroed with a deaf 1px sense reach. Only the murmuration terms differ.
{
  const runOctet = (coupled: boolean): number => {
    const w = makeSimWorld('warrior', coupled ? 0xf10c : 0xf10d);
    w.player.pos = vec(80, 80); // parked far out of any sight cone
    w.player.invulnerable = true;
    const flock: Actor[] = [];
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const m = mint(w, 'chitin_skimmer', 1000 + Math.cos(ang) * 90, 700 + Math.sin(ang) * 90);
      m.brain = {
        type: 'swarm',
        behavior: { flock: coupled
          ? { kin: 'def', radius: 220, cohesion: 1.1, alignment: 1.25, separation: 1, weave: 3.2, erratic: 1.1 }
          : { kin: 'def', radius: 1, cohesion: 0, alignment: 0, separation: 0, weave: 3.2, erratic: 1.1 } },
      };
      m.applyStatus('aloft', 0, 1, 'probe');
      flock.push(m);
    }
    step(w, 12);
    let s = 0, n = 0;
    for (let i = 0; i < flock.length; i++) {
      for (let j = i + 1; j < flock.length; j++) {
        s += Math.hypot(flock[i].pos.x - flock[j].pos.x, flock[i].pos.y - flock[j].pos.y);
        n++;
      }
    }
    const flew = flock.every(a => a.flying);
    retire(w, flock);
    return flew ? s / n : Number.NaN;
  };
  const held = runOctet(true);
  const drifted = runOctet(false);
  check('flock: the coupled octet stayed a SHAPE, the deaf one diffused',
    held < drifted * 0.72, `mean pair ${held.toFixed(0)}px coupled vs ${drifted.toFixed(0)}px deaf`);
}

// --- F. TRAJECTORY-WORN WEAVE (bearing sign-flips vs a plain swarm body) ------
{
  const w = makeSimWorld('warrior', 0xf1ea);
  w.player.pos = vec(1400, 600);
  w.player.invulnerable = true;
  const flips = (a: Actor, secs: number): number => {
    let n = 0, lastSign = 0, lastBearing: number | undefined;
    const ticks = Math.round(secs / DT);
    for (let i = 0; i < ticks; i++) {
      for (const x of w.actors) updateAI(x, w, DT);
      w.update(DT);
      const px = a.posPrev ?? a.pos;
      const dx = a.pos.x - px.x, dy = a.pos.y - px.y;
      if (Math.hypot(dx, dy) < 0.2) continue;
      const b = Math.atan2(dy, dx);
      if (lastBearing !== undefined) {
        let diff = b - lastBearing;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const sign = Math.sign(diff);
        if (sign !== 0 && lastSign !== 0 && sign !== lastSign) n++;
        if (sign !== 0) lastSign = sign;
      }
      lastBearing = b;
    }
    return n;
  };
  const skimmer = mint(w, 'chitin_skimmer', 950, 600);
  const weaveFlips = flips(skimmer, 5);
  retire(w, [skimmer]);
  const drone = mint(w, 'chitin_drone', 950, 600);
  const droneFlips = flips(drone, 5);
  retire(w, [drone]);
  check('weave: the aloft flock body boils, the plain body beelines',
    weaveFlips > droneFlips + 4, `${weaveFlips} flips vs ${droneFlips}`);
}

// --- G. THE DIVE CYCLE (the whole wheel, observed live) ------------------------
{
  const w = makeSimWorld('warrior', 0xd1fe);
  w.player.pos = vec(800, 600);
  w.player.invulnerable = true;
  const sk = mint(w, 'chitin_skimmer', 1080, 600); // 280px — inside the press lane
  let sawAloft = false, sawBar = false, sawLeap = false, sawTelegraph = false;
  let threatRead = false, shedAtCommit = false, sawGroundedPhase = false, reWinged = false;
  let landedAt = -1;
  const ticks = Math.round(24 / DT);
  for (let i = 0; i < ticks; i++) {
    for (const a of w.actors) updateAI(a, w, DT);
    w.update(DT);
    if (sk.flying && sk.aiScriptIdx === 0) sawAloft = true;
    if (sk.casting && sk.casting.inst.def.id === 'locust_dive') sawBar = true;
    if (sk.leap) {
      sawLeap = true;
      if (sk.leap.telegraph) sawTelegraph = true;
      if (!sk.flying) shedAtCommit = true; // wings folded the moment the dive committed
      const threat = w.imminentThreatTo(w.player, 10);
      if (threat && threat.ref === sk.leap) threatRead = true;
    }
    if (landedAt < 0 && sawLeap && !sk.leap) landedAt = i;
    if (landedAt >= 0 && sk.aiScriptIdx === 2 && !sk.flying) sawGroundedPhase = true;
    if (sawGroundedPhase && sk.flying && sk.aiScriptIdx === 0 && i > landedAt + 60) { reWinged = true; break; }
  }
  check('dive: the body held an aloft script phase', sawAloft);
  check('dive: locust_dive cast a REAL bar (pipeline, not teleport)', sawBar);
  check('dive: the stoop is a leap', sawLeap);
  check('dive: the leap carries its landing telegraph', sawTelegraph);
  check('dive: imminentThreatTo surfaces the stoop (dodge-readable)', threatRead);
  check('dive: aloft SHED at commit — the landing window is honest', shedAtCommit);
  check('dive: a grounded script window followed the landing', sawGroundedPhase);
  check('dive: the wings came back — the wheel turns', reWinged);
  retire(w, [sk]);
}

// --- H. THE SONG (stridulate carries furor to flock kin) ------------------------
{
  const w = makeSimWorld('warrior', 0x50f6);
  w.player.pos = vec(600, 600);
  w.player.invulnerable = true;
  const singer = mint(w, 'chitin_stridulant', 1050, 620);
  const kinA = mint(w, 'chitin_skimmer', 1000, 560);
  const kinB = mint(w, 'chitin_skimmer', 1090, 660);
  let sungOnKin = false;
  const ticks = Math.round(18 / DT);
  for (let i = 0; i < ticks; i++) {
    for (const a of w.actors) updateAI(a, w, DT);
    w.update(DT);
    if (kinA.statuses.some(s => s.id === 'furor') || kinB.statuses.some(s => s.id === 'furor')) {
      sungOnKin = true;
      break;
    }
  }
  check('song: stridulation carried furor onto flock kin', sungOnKin);
  retire(w, [singer, kinA, kinB]);
}

// --- I. DATA PINS ----------------------------------------------------------------
{
  check('data: the wingling wears the flock graft (the Swarming swirls)',
    MONSTERS.chitin_wingling.brain?.behavior?.flock !== undefined);
  check('data: the skimmer declares its natural flock size',
    JSON.stringify(MONSTERS.chitin_skimmer.packSize) === JSON.stringify([8, 12]));
  check('data: the singer never dives (its script has no stoop)',
    !(MONSTERS.chitin_stridulant.brain?.script ?? []).some(p => p.id === 'stoop'));
}

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
