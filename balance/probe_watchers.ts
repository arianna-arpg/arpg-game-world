// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE WATCH FABRIC end to end on the real engine
// (docs/engine/watchers.md): the registry weave (every watcher validates,
// the Barrow Watch trio stands with looks whose parts resolve, the Din gem
// is wired), the pure ladder laws (lazy decay through the grace, the feed
// cap that never lowers, the proximity taper, rung thresholds, the trail
// ring's lay/consume/gap algebra), the sense-shape laws (the sleep
// collapse, the reach fold's stealth/alert/rear cases), DRAWN == TESTED
// against the live gate (the fan boundary admits exactly where the scan
// feeds — open ground, both sides of a wall, and the stamped scalars are
// the scan's own), THE LADDER END TO END (climb through stir/search/lock
// on the real acquireTarget, the search crossing planting the standing
// investigate walk, the lock firing the callout that jumps kin ladders to
// the search cap, back-off decay + the stand-down re-arming the gate),
// PAIN NEEDS NO LADDER (a wound through the real skill pipeline locks
// through the gate while the ladder is still mid-climb), THE SLEEPER
// (eyes shut = a frontal approach outside the ring is unheard, footfalls
// feed inside it, a still creep feeds slower than a sprint), THE TRACKER
// (trail acquired, prints marched in lay order through the investigate
// walk, the wading gap losing the nose, the unbroken line ending in a
// true own-eyes lock), THE NOISE STIMULUS (noiseAt caps at search + aims
// the walk; the noiseOnHit stat rings through the REAL resolveHit), the
// co-op wire round trip (wp derived scalars through the real serialize/
// apply path, the client fan equal on open ground), and same-seed
// determinism with watchers live.
//
// The sim never runs brains on its own (the standing trap): the tick here
// runs the HOST frame loop verbatim — updateAI per actor, then the world
// tick — and every rig PARKS the arena hero far out of reach (a live
// player body at arena center would feed every gate and lay every trail).
// Run: npx tsx balance/probe_watchers.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld, SIM_ARENA_ID } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { MONSTERS } from '../src/data/monsters';
import { LOOKS } from '../src/data/looks';
import { SUPPORTS } from '../src/data/supports';
import { PART_PAINTERS } from '../src/render/vis/parts';
import { blocksSightOf, generateLayout, type GenCtx } from '../src/engine/levelgen';
import { carveMassifs } from '../src/engine/massif';
import { GridWalkField } from '../src/world/gridWalk';
import { Rng } from '../src/core/rng';
import { POST_CFG } from '../src/engine/brain';
import { WATCH_POST_DETAILS } from '../src/data/watchposts';
import type { ZoneDef } from '../src/data/zones';
import { updateAI } from '../src/engine/ai';
import {
  feedWatch, layTrailPoint, SENSE_CFG, senseReach, trailNewest, trailNext,
  validateWatch, WATCH_CFG, WATCH_RUNG, watchArcDeg, watchFanVisible,
  watchRiseAmount, watchRungOf, watchValueOf,
  type TrailBody, type WatchBody,
} from '../src/engine/watch';
import { WATCH_FAN_DEV, watchFanRadius } from '../src/render/vis/watchLayer';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { vec, type Vec2 } from '../src/core/math';
import { mod } from '../src/engine/stats';
import type { Actor } from '../src/engine/actor';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0xa7c4);

const DT = 1 / 60;
type SimWorld = ReturnType<typeof makeSimWorld>;
// THE HOST LOOP VERBATIM: AI per actor, then the world tick (the sim runs
// no brains on its own — the balance harness drives them explicitly).
const tick = (w: SimWorld, sec: number, per?: (w: SimWorld) => void): void => {
  for (let t = 0; t < sec; t += DT) {
    per?.(w);
    for (const a of w.actors) updateAI(a, w, DT);
    w.update(DT);
  }
};
const spawn = (w: SimWorld, id: string, lvl = 5,
  team: 'enemy' | 'player' = 'enemy'): Actor => {
  const m = w.createMonster(id, lvl, team);
  w.actors.push(m);
  return m;
};
const world = (seed: number): SimWorld => {
  const w = makeSimWorld('warrior', seed);
  // Park the hero AND make it undetectable: a live player body anywhere in
  // the arena is inside an ALERTED watchman's all-around reach — it would
  // feed gates, hold locks open and lay trails under every rig.
  w.player.pos.x = 60;
  w.player.pos.y = 60;
  w.player.sheet.setBase('detectability', 0);
  return w;
};
const pin = (a: Actor, facing: number): void => {
  a.facing = facing;
  a.aiPostFacing = facing;
};

// Probe kinds: a pinned-gaze watcher (no sweep — geometry stays put), an
// inert warm body for it to notice (never passive: scenery is not prey),
// and an archer to prove pain needs no ladder.
MONSTERS.probe_watch_eye = {
  id: 'probe_watch_eye', name: 'Probe Eye', color: '#8899aa', shape: 'circle',
  radius: 12, base: { life: 400, moveSpeed: 140, accuracy: 100, mana: 0 },
  skills: [], xp: 1, faction: 'undead',
  post: true,
  watch: {},
  brain: { type: 'basic', perception: { arcDeg: 90, rearMul: 0.3 } },
};
MONSTERS.probe_watch_body = {
  id: 'probe_watch_body', name: 'Probe Body', color: '#aa9988', shape: 'circle',
  radius: 12, base: { life: 4000, moveSpeed: 0, accuracy: 100, mana: 0 },
  skills: [], xp: 1, faction: 'beast',
  brain: { type: 'basic' },
};
MONSTERS.probe_watch_archer = {
  id: 'probe_watch_archer', name: 'Probe Archer', color: '#ccbb88', shape: 'circle',
  radius: 12, base: { life: 300, moveSpeed: 0, accuracy: 400, mana: 0 },
  skills: ['bone_arrow'], xp: 1, faction: 'beast',
  brain: { type: 'basic' },
};
MONSTERS.probe_din_striker = {
  id: 'probe_din_striker', name: 'Din Striker', color: '#ccbb88', shape: 'circle',
  radius: 12, base: { life: 200, moveSpeed: 0, accuracy: 400, mana: 0 },
  mods: [mod('noiseOnHit', 'flat', 420)],
  skills: ['claw'], xp: 1, faction: 'beast',
  brain: { type: 'basic' },
};

// --- 0) Registry weave -------------------------------------------------------
{
  const faults = validateWatch(MONSTERS);
  check('weave: every shipped watcher validates (legible, sane dials)',
    faults.length === 0, faults.slice(0, 3).join(' | '));
  const trio = ['barrow_watchman', 'gorged_ghoul', 'barrow_hound'] as const;
  check('weave: the Barrow Watch trio stands (defs + looks, every part a painter)',
    trio.every(id => MONSTERS[id] && LOOKS[id]
      && LOOKS[id].parts.every(p => !!PART_PAINTERS[p.kind])));
  check('weave: the three postures are authored (sweep / sleep / scent)',
    !!MONSTERS.barrow_watchman.watch?.sweep && !!MONSTERS.gorged_ghoul.watch?.sleep
    && !!MONSTERS.barrow_hound.watch?.scent);
  check('weave: every trio body wears a watch-sourced tell (the legibility law twice over)',
    trio.every(id => MONSTERS[id].tells?.some(t => t.source === 'watch')));
  check('weave: the ghoul look is EYELESS (its eyes are the tell part)',
    !LOOKS.gorged_ghoul.parts.some(p => p.kind === 'eyes'));
  check('weave: the sentry showcase retrofit reads (skeleton_archer wears the fabric)',
    !!MONSTERS.skeleton_archer.watch
    && MONSTERS.skeleton_archer.tells?.some(t => t.source === 'watch') === true);
  check('weave: the Din gem is wired (ringing_report → noiseOnHit, strikes-gated)',
    SUPPORTS.ringing_report?.mods.some(m => m.stat === 'noiseOnHit')
    && SUPPORTS.ringing_report?.requiresMechanisms?.includes('strikes') === true);
  const bad = validateWatch({
    shirker: { watch: { cone: false } },
    negRise: { watch: { riseSec: -1 } },
  });
  check('weave: validateWatch names the shirker and the bad dial',
    bad.length === 2 && bad[0].includes('ILLEGIBLE'));
}

// --- 1) The pure ladder laws ---------------------------------------------------
{
  const w = {} as const;
  const b = (): WatchBody => ({ watchS: 0, watchFedAt: -1e9, aggroed: false });
  const a = b();
  feedWatch(a, w, 10, 0.5);
  check('ladder: a feed banks and holds through the grace',
    watchValueOf(a, w, 10 + WATCH_CFG.graceSec - 0.01) === 0.5);
  const afterHalf = watchValueOf(a, w, 10 + WATCH_CFG.graceSec + WATCH_CFG.decaySec / 2);
  check('ladder: decay is linear after the grace (a half pool drains in half decaySec)',
    Math.abs(afterHalf) < 1e-9, `got ${afterHalf}`);
  const c = b();
  feedWatch(c, w, 0, 0.9);
  feedWatch(c, w, 1, 0.5, WATCH_CFG.rungs.search);
  check('ladder: a capped feed never LOWERS a higher meter (and refreshes the clock)',
    c.watchS === 0.9 && c.watchFedAt === 1);
  const d = b();
  feedWatch(d, w, 0, 0.3, WATCH_CFG.rungs.search);
  feedWatch(d, w, 1, 0.9, WATCH_CFG.rungs.search);
  check('ladder: capped feeds stop AT the cap',
    d.watchS === WATCH_CFG.rungs.search);
  check('ladder: rungs read the vocabulary thresholds',
    watchRungOf(0) === WATCH_RUNG.unaware
    && watchRungOf(WATCH_CFG.rungs.stir) === WATCH_RUNG.stir
    && watchRungOf(WATCH_CFG.rungs.search) === WATCH_RUNG.search
    && watchRungOf(1) === WATCH_RUNG.locked);
  const e = b();
  e.aggroed = true;
  check('ladder: aggro pins the meter at 1 (the locked tell never flickers)',
    watchValueOf(e, w, 999) === 1);
  const near = watchRiseAmount(w, 1, 0.2, false);
  const edge = watchRiseAmount(w, 1, 1, false);
  check('ladder: the proximity taper (full rate near, edgeFrac at the rim)',
    Math.abs(near - 1 / WATCH_CFG.riseSec) < 1e-9
    && Math.abs(edge - WATCH_CFG.edgeFrac / WATCH_CFG.riseSec) < 1e-9);
  check('ladder: an alerted mind climbs alertRiseMul faster',
    Math.abs(watchRiseAmount(w, 1, 0.2, true) - WATCH_CFG.alertRiseMul / WATCH_CFG.riseSec) < 1e-9);
}

// --- 2) The trail ring's algebra ------------------------------------------------
{
  const t: TrailBody = { trailIdx: 0 };
  for (let i = 0; i < WATCH_CFG.trail.max + 10; i++) layTrailPoint(t, i, 0, i);
  check('trail: the ring wraps at max and the newest print is the last laid',
    t.trail!.length === WATCH_CFG.trail.max
    && trailNewest(t)!.t === WATCH_CFG.trail.max + 9);
  const now = WATCH_CFG.trail.max + 9;
  const next = trailNext(t.trail, now - 5.5, now, 5);
  check('trail: the nose takes the OLDEST print fresher than the cursor and young enough',
    next!.t === now - 5, `got ${String(next?.t)}, expected ${now - 5}`);
  check('trail: a range-bounded nose refuses far prints',
    trailNext(t.trail, -1, now, 999, { x: 0, y: 500, range: 100 }) === undefined
    && trailNext(t.trail, -1, now, 999, { x: now, y: 0, range: 40 })!.t >= now - 40);
  check('trail: a cold trail reads empty (maxAge)',
    trailNext(t.trail, -1, now + 100, 5) === undefined);
}

// --- 3) The sense shape ----------------------------------------------------------
{
  check('sense: the fold — in-cone full, behind × rearMul, stealth × stealthMul, alerted × alertMul all-around',
    senseReach(500, 1, false, false, true, 0.3) === 500
    && senseReach(500, 1, false, false, false, 0.3) === 150
    && senseReach(500, 1, true, false, true, 0.3) === 500 * SENSE_CFG.stealthMul
    && senseReach(500, 0.5, false, false, true, 0.3) === 250
    && senseReach(500, 1, false, true, false, 0.3) === 500 * SENSE_CFG.alertMul);
  check('sense: the sleep collapse — eyes shut below the stir rung, open above',
    watchArcDeg({ sleep: true }, WATCH_CFG.rungs.stir - 0.01, 130) === 0
    && watchArcDeg({ sleep: true }, WATCH_CFG.rungs.stir, 130) === 130
    && watchArcDeg({}, 0, 130) === 130
    && watchArcDeg(undefined, 0, 150) === 150);
}

// --- 4) DRAWN == TESTED (the fan boundary is the live gate's boundary) ----------
{
  const w = world(0xd12a);
  const eye = spawn(w, 'probe_watch_eye', 5);
  eye.pos = vec(600, 800);
  eye.aiAnchor = vec(600, 800);
  pin(eye, 0);
  tick(w, 0.4, () => pin(eye, 0));
  check('drawn==tested: the scan STAMPS the scalars it tested (arc from the def, detect from the sheet)',
    Math.abs(eye.senseArcHalf - (90 * Math.PI / 180) / 2) < 1e-9
    && Math.abs(eye.senseDetect - eye.sheet.get('detectionRange')) < 1e-6
    && eye.senseRearMul === 0.3 && !eye.senseAlerted);
  const inCone = watchFanRadius(w, eye, 0, 1, false);
  check('drawn==tested: open ground — the on-axis fan radius IS the tested reach',
    eye.senseDetect > 0 && Math.abs(inCone - eye.senseDetect) < 1e-6);
  const body = spawn(w, 'probe_watch_body', 5, 'player');
  const tryAt = (x: number, y: number): number => {
    body.pos = vec(x, y);
    eye.watchS = 0; eye.watchFedAt = -1e9; eye.watchAt = undefined;
    eye.watchRung = 0; eye.aggroed = false; eye.aiTargetId = undefined;
    eye.alertUntil = 0; eye.alertFrom = null;
    tick(w, 0.6, () => pin(eye, 0));
    return eye.watchS;
  };
  check('drawn==tested: a body just INSIDE the drawn rim feeds the ladder',
    tryAt(600 + inCone - 8, 800) > 0);
  check('drawn==tested: a body just OUTSIDE the drawn rim feeds nothing',
    tryAt(600 + inCone + 8, 800) === 0);
  const behindR = watchFanRadius(w, eye, Math.PI, 1, false);
  check('drawn==tested: the rear ring is the drawn rim too (hearing feeds inside, not outside)',
    Math.abs(behindR - eye.senseDetect * 0.3) < 1e-6
    && tryAt(600 - (behindR - 8), 800) > 0
    && tryAt(600 - (behindR + 8), 800) === 0);
  // THE WALL: a sight-blocking body across the gaze clips the DRAWN fan and
  // blinds the TESTED gate at the same line.
  const rock = { pos: vec(600 + 200, 800), radius: 18, kind: 'rock' } as (typeof w.doodads)[number];
  w.doodads.push(rock);
  w.markDoodadsChanged();
  check('drawn==tested: the wall premise holds (rock blocks sight)', blocksSightOf(rock));
  const clipped = watchFanRadius(w, eye, 0, 1, false);
  const rayD = w.sightClipD(eye.pos, vec(600 + eye.senseDetect, 800), eye.tier);
  check('drawn==tested: the fan clips exactly where the engine\'s own sight ray clips',
    Number.isFinite(rayD) && rayD < 200 && Math.abs(clipped - rayD) < 1e-6,
    `fan ${clipped.toFixed(1)} vs ray ${rayD.toFixed(1)}`);
  check('drawn==tested: a body BEHIND the wall (inside raw reach) feeds nothing — the same verdict',
    tryAt(600 + 260, 800) === 0);
  w.doodads.pop();
  w.markDoodadsChanged();
}

// --- 4b) THE FAN-VISIBILITY LEVER (gates WHETHER a fan draws, never what it says) -
{
  // The pure resolution ladder: per-entity stamp > kind posture > the
  // standing law (wild show, owned hide). Both directions authorable at
  // both grains.
  const wild = {} as { owner?: unknown; watchFan?: 'show' | 'hide' };
  const owned = { owner: { id: 1 } } as typeof wild;
  check('fan: the standing law — wild watchers SHOW (the readability contract)',
    watchFanVisible(wild, {}) === true);
  check('fan: the standing law — owned bodies HIDE (the summoner-crew mud)',
    watchFanVisible(owned, {}) === false);
  check('fan: the kind posture flips either way (WatchSpec.fan)',
    watchFanVisible(owned, { fan: 'show' }) === true
    && watchFanVisible(wild, { fan: 'hide' }) === false);
  check('fan: the per-entity stamp wins over the kind posture, both directions',
    watchFanVisible({ ...owned, watchFan: 'show' }, { fan: 'hide' }) === true
    && watchFanVisible({ ...wild, watchFan: 'hide' }, { fan: 'show' }) === false);
  check('fan: the dev flood ships OFF (QA chrome, never a shipped default)',
    WATCH_FAN_DEV.all === false);
  const faults = validateWatch({
    stripped: { watch: { fan: 'hide' } },
    strippedLegible: { watch: { fan: 'hide' }, tells: [{ source: 'watch' }] },
    forced: { watch: { fan: 'show' } },
  });
  check('fan: fan:\'hide\' without a watch tell is ILLEGIBLE; with one (or fan:\'show\') clean',
    faults.length === 1 && faults[0].startsWith('stripped:'),
    faults.join(' | '));

  // THE LIVE CREW (the diagnosis pinned): a player-owned skeleton_archer
  // runs the SAME scan (senses stamped — the mechanism that painted the
  // mud), resolves HIDDEN by the standing law, and its geometry stays the
  // scan's own stamps (the lever never touches what a fan would say). The
  // wild sentry beside it resolves SHOWN — today's read exactly.
  const w = world(0xfa11);
  const crew = spawn(w, 'skeleton_archer', 6, 'player');
  crew.owner = w.player;
  crew.pos = vec(700, 900);
  const sentry = spawn(w, 'skeleton_archer', 6);
  sentry.pos = vec(1400, 900);
  sentry.aiAnchor = vec(1400, 900);
  tick(w, 0.4);
  check('fan live: the owned crew ran the scan (senses stamped — the mud\'s mechanism)',
    crew.senseDetect > 0 && !!crew.watch);
  check('fan live: the crew resolves HIDDEN, the wild sentry SHOWN (one law, no id lists)',
    watchFanVisible(crew, crew.watch!) === false
    && watchFanVisible(sentry, sentry.watch!) === true);
  check('fan live: hidden ≠ zeroed — the crew\'s fan geometry is still its stamped truth',
    watchFanRadius(w, crew, 0, 1, false) > 0);
  crew.watchFan = 'show';
  check('fan live: one data field flips the body (the classic cone read, forced)',
    watchFanVisible(crew, crew.watch!) === true);
  crew.watchFan = undefined;
  sentry.watchFan = 'hide';
  check('fan live: the same field strips a wild watcher (true-stealth authoring)',
    watchFanVisible(sentry, sentry.watch!) === false);
  sentry.watchFan = undefined;

  // The wire: the client rebuilds owner from the mn flag (a shared stand-in)
  // and the posture from its own registry — the standing law folds the SAME
  // verdicts client-side, nothing new on the wire.
  const snap = serializeSnapshot(w, 1);
  const w2 = makeSimWorld('warrior', 0xfa12);
  applySnapshot(w2, snap);
  const cCrew = w2.actors[snap.actors.findIndex(x => x.id === crew.id)];
  const cSentry = w2.actors[snap.actors.findIndex(x => x.id === sentry.id)];
  check('fan wire: the client resolves crew hidden / sentry shown from its own adopt',
    !!cCrew?.watch && !!cSentry?.watch
    && watchFanVisible(cCrew, cCrew.watch) === false
    && watchFanVisible(cSentry, cSentry.watch) === true);
}

// --- 5) THE LADDER END TO END (sentinel: climb, callout, decay, stand-down) -----
{
  const w = world(0xd12b);
  const eye = spawn(w, 'barrow_watchman', 6);
  eye.pos = vec(500, 700);
  eye.aiAnchor = vec(500, 700);
  const kin = spawn(w, 'barrow_watchman', 6);
  kin.pos = vec(240, 700);
  kin.aiAnchor = vec(240, 700);
  const prey = spawn(w, 'probe_watch_body', 6, 'player');
  prey.pos = vec(640, 700); // deep in eye's cone; behind kin's turned back
  const hold = (): void => { pin(eye, 0); pin(kin, Math.PI); };
  hold();
  const rungsSeen: number[] = [];
  let kinAtShout = -1;
  tick(w, 3.2, () => {
    hold();
    if (!rungsSeen.includes(eye.watchRung)) rungsSeen.push(eye.watchRung);
    if (eye.aggroed && kinAtShout < 0) kinAtShout = kin.watchS;
  });
  check('e2e: the ladder climbed THROUGH its rungs (no teleport to locked)',
    rungsSeen.join(',').startsWith('0,1,2'), `saw [${rungsSeen.join(',')}]`);
  check('e2e: the search crossing planted the standing investigate walk',
    eye.alertUntil > 0 && eye.watchAt !== undefined);
  check('e2e: the top rung LOCKED (aggro + the real target id)',
    eye.aggroed && eye.aiTargetId === prey.id);
  check('e2e: the callout jumped the kin ladder to the search cap (never straight to lock)',
    kinAtShout >= WATCH_CFG.rungs.search - 1e-6
    && kinAtShout <= WATCH_CFG.rungs.search + 0.1
    && kin.alertUntil > 0,
    `kin at the shout beat: ${kinAtShout.toFixed(3)}`);
  // Back off: the prey vanishes; the lock breaks, the investigation runs
  // dry, the stand-down clears aggro and the meter drains to nothing.
  prey.pos = vec(4000, 4000);
  tick(w, 24, hold);
  check('e2e: the stand-down came all the way DOWN (aggro cleared, meter drained, rung 0)',
    !eye.aggroed && eye.watchRung === WATCH_RUNG.unaware
    && watchValueOf(eye, eye.watch!, w.time) === 0);
  prey.pos = vec(640, 700);
  tick(w, 0.5, hold);
  check('e2e: a fresh approach re-gates (the ladder re-arms after a stand-down)',
    !eye.aggroed && eye.aiTargetId === undefined && eye.watchS > 0);
}

// --- 6) PAIN NEEDS NO LADDER (a wound through the real pipeline beats the climb) -
{
  const w = world(0xd12c);
  const eye = spawn(w, 'probe_watch_eye', 5);
  eye.pos = vec(500, 700);
  eye.aiAnchor = vec(500, 700);
  pin(eye, 0);
  // The archer sits BEHIND the eye, beyond every unprovoked sense (dist
  // 380 > the 156px rear ring; the +X cone faces away) and beyond its own
  // bone_arrow keepDistance, so it fires freely. The ladder NEVER feeds —
  // the arrow alone must open the gate: hit → the struck alarm → the very
  // next scan locks through the bypass.
  const archer = spawn(w, 'probe_watch_archer', 5, 'player');
  archer.pos = vec(120, 700);
  let aggroAt = -1;
  let fedBeforeHit = false;
  tick(w, 3.5, () => {
    pin(eye, 0);
    if (eye.aiHitAt < 0 && eye.watchS > 0) fedBeforeHit = true;
    if (eye.aggroed && aggroAt < 0) aggroAt = w.time;
  });
  check('pain: unprovoked, the archer sat beyond every sense (the ladder never fed)',
    !fedBeforeHit && eye.aiHitAt >= 0);
  check('pain: the wound alone opened the gate — locked within two scans of the arrow',
    aggroAt > 0 && aggroAt - eye.aiHitAt < 0.6 && eye.aiTargetId === archer.id,
    `hit at ${eye.aiHitAt.toFixed(2)}s, aggro at ${aggroAt.toFixed(2)}s`);
}

// --- 7) THE SLEEPER (eyes shut, the ring is the read, footfalls wake) -----------
{
  const w = world(0xd12d);
  const ghoul = spawn(w, 'gorged_ghoul', 6);
  ghoul.pos = vec(600, 800);
  ghoul.aiAnchor = vec(600, 800);
  pin(ghoul, 0);
  tick(w, 0.3, () => pin(ghoul, 0));
  check('sleeper: asleep, the stamped arc is COLLAPSED (the ring is the whole read)',
    ghoul.senseArcHalf === 0);
  const ring = watchFanRadius(w, ghoul, 0, 1, false);
  check('sleeper: the drawn ring is the rear-hearing radius in every direction',
    ring > 0 && Math.abs(ring - ghoul.senseDetect * 0.5) < 1e-6
    && Math.abs(watchFanRadius(w, ghoul, 2.2, 1, false) - ring) < 1e-6);
  const prey = spawn(w, 'probe_watch_body', 6, 'player');
  prey.pos = vec(600 + ring + 60, 800); // frontal — an OPEN eye's cone would see it
  tick(w, 1.2, () => pin(ghoul, 0));
  check('sleeper: a frontal approach OUTSIDE the ring is simply unheard (the eyes are shut)',
    ghoul.watchS === 0);
  prey.pos = vec(600 + ring - 30, 800);
  tick(w, 1.0, () => pin(ghoul, 0));
  const crept = ghoul.watchS;
  check('sleeper: inside the ring the ladder climbs', crept > 0);
  ghoul.watchS = 0; ghoul.watchFedAt = -1e9; ghoul.watchRung = 0;
  ghoul.watchAt = undefined;
  tick(w, 1.0, () => { pin(ghoul, 0); prey.vel.x = 200; });
  check('sleeper: the same second of LOUD footfalls feeds faster than the creep',
    crept > 0 && ghoul.watchS > crept * 1.5,
    `crept ${crept.toFixed(3)} vs loud ${ghoul.watchS.toFixed(3)}`);
}

// --- 8) THE TRACKER (the trail marched in lay order; water gaps the line) -------
{
  const w = world(0xd12e);
  const hound = spawn(w, 'barrow_hound', 6);
  hound.pos = vec(330, 1000); // 100px off the walked line: nose range, hearing rim clear
  hound.aiAnchor = vec(330, 1000);
  const prey = spawn(w, 'probe_watch_body', 6, 'player');
  prey.kind = 'player'; // the trail layer prints player-kind bodies
  prey.pos = vec(140, 900);
  // The prey OUTRUNS the hound (330 px/s vs 190): the nose is the only way
  // to hold the line. It wades (no prints) between x 460 and 700 — a 240px
  // gap, wider than the 130px nose.
  let quarryHeld = false;
  let cappedWhileFar = true;
  let onLine = false;
  tick(w, 8, () => {
    // While unaware, the hound faces NORTH — the walked line crosses its
    // REAR hearing (a brief prick, never the front-cone lock the naked
    // pass-by geometry would hand it).
    if (hound.watchRung === 0 && !hound.aggroed) pin(hound, -Math.PI / 2);
    if (prey.pos.x < 1400) prey.pos.x += 5.5;
    if (prey.pos.x > 460 && prey.pos.x < 700) prey.applyStatus('wading', 0, 1, 'probe');
    if (hound.watchQuarryId === prey.id) {
      quarryHeld = true;
      // The CAP law holds for the NOSE alone: sample it only while the prey
      // is beyond every real sense (its brief pass through earshot may
      // legitimately feed the open gate above the cap).
      const dx = prey.pos.x - hound.pos.x, dy = prey.pos.y - hound.pos.y;
      if (dx * dx + dy * dy > 700 * 700 && !hound.aggroed
        && hound.watchS > WATCH_CFG.rungs.search + 1e-6) {
        cappedWhileFar = false;
      }
      const af = hound.alertFrom;
      if (af && af.y > 860 && af.y < 940) onLine = true;
    }
  });
  check('tracker: the nose held the quarry and marched the printed line (scent capped below lock)',
    quarryHeld && onLine && cappedWhileFar && !hound.aggroed,
    `held ${String(quarryHeld)}, onLine ${String(onLine)}, capped ${String(cappedWhileFar)}, aggro ${String(hound.aggroed)}`);
  tick(w, 8);
  check('tracker: the wading gap LOST the nose (quarry forgotten, no lock ever)',
    hound.watchQuarryId === undefined && hound.aiTargetId === undefined
    && !hound.aggroed,
    `quarry ${String(hound.watchQuarryId)}, lock ${String(hound.aiTargetId)}, aggro ${String(hound.aggroed)}`);
  // The unbroken line: a fresh hound, no wade — it runs the trail down and
  // its own short eyes close the lock when the prey stops.
  const w2 = world(0xd12f);
  const h2 = spawn(w2, 'barrow_hound', 6);
  h2.pos = vec(330, 1000);
  h2.aiAnchor = vec(330, 1000);
  const p2 = spawn(w2, 'probe_watch_body', 6, 'player');
  p2.kind = 'player';
  p2.pos = vec(140, 900);
  tick(w2, 3, () => {
    if (h2.watchRung === 0 && !h2.aggroed) pin(h2, -Math.PI / 2);
    if (p2.pos.x < 820) p2.pos.x += 5.5;
  });
  tick(w2, 12);
  check('tracker: on an unbroken line the hound RUNS THE TRAIL DOWN and locks with its own eyes',
    h2.aggroed && h2.aiTargetId === p2.id,
    `hound at ${h2.pos.x.toFixed(0)},${h2.pos.y.toFixed(0)}; quarry ${String(h2.watchQuarryId)}`);
}

// --- 9) THE NOISE STIMULUS (the bang names a place; the Din stat rings) ---------
{
  const w = world(0xd130);
  const eye = spawn(w, 'probe_watch_eye', 5);
  eye.pos = vec(500, 700);
  eye.aiAnchor = vec(500, 700);
  pin(eye, 0);
  tick(w, 0.3, () => pin(eye, 0));
  w.noiseAt(vec(500, 600), 300);
  const oneBang = eye.watchS;
  check('noise: one bang feeds toward the SPOT (sub-search: ears prick, no walk yet)',
    oneBang > 0 && oneBang < WATCH_CFG.rungs.search
    && eye.watchAt!.y === 600 && eye.alertFrom === null);
  w.noiseAt(vec(500, 600), 300);
  check('noise: the second bang crossed into SEARCH — capped there, and the walk is aimed at the sound',
    Math.abs(eye.watchS - WATCH_CFG.rungs.search) < 1e-6
    && eye.alertFrom !== null && eye.alertFrom!.y === 600 && eye.alertUntil > w.time);
  w.noiseAt(vec(5000, 5000), 200);
  check('noise: out of earshot hears nothing', eye.watchAt!.y === 600);
  // The stat end to end: a Din-wearing striker claws a bystander and a far
  // watcher — gaze turned AWAY — hears the blow through the REAL resolveHit.
  const w3 = world(0xd131);
  const striker = spawn(w3, 'probe_din_striker', 5, 'player');
  striker.pos = vec(600, 700);
  const mark = spawn(w3, 'probe_watch_body', 5);
  mark.pos = vec(600, 740);
  const far = spawn(w3, 'probe_watch_eye', 5);
  far.pos = vec(920, 700);
  far.aiAnchor = vec(920, 700);
  pin(far, 0); // gaze +X: the scuffle sits in its deaf 156px-rear — only the DIN reaches
  const claw = striker.skills.find(s => s?.def.id === 'claw');
  check('noise: the rig premise holds (the striker carries a claw)', !!claw);
  if (claw) w3.useSkill(striker, claw, mark.pos);
  tick(w3, 1.4, () => pin(far, 0));
  check('noise: the Din stat RANG through the real hit (the far watcher heard the blow land)',
    far.watchS > 0 && far.watchAt !== undefined
    && Math.abs(far.watchAt.x - 600) < 60 && Math.abs(far.watchAt.y - 740) < 60,
    `meter ${far.watchS.toFixed(3)}`);
}

// --- 10) The co-op wire (wp derived scalars through the real path) ---------------
{
  const w = world(0xd132);
  const eye = spawn(w, 'barrow_watchman', 6);
  eye.pos = vec(500, 700);
  eye.aiAnchor = vec(500, 700);
  const prey = spawn(w, 'probe_watch_body', 6, 'player');
  prey.pos = vec(660, 700);
  tick(w, 0.7, () => pin(eye, 0));
  const midValue = watchValueOf(eye, eye.watch!, w.time);
  check('wire: the rig climbed to a MID-ladder reading', midValue > 0 && midValue < 1,
    `value ${midValue.toFixed(3)}`);
  const snap = serializeSnapshot(w, 1);
  const row = snap.actors.find(x => x.id === eye.id);
  const wp = row?.wp;
  check('wire: wp ships the stamped sense + the ladder (derived scalars only)',
    !!wp && wp[0] === Math.round(eye.senseDetect)
    && Math.abs(wp[1] - eye.senseArcHalf) < 1e-3
    && Math.abs(wp[4] - midValue) < 2e-3);
  const still = snap.actors.find(x => x.id === prey.id);
  check('wire: a watchless body ships no wp', still?.wp === undefined);
  // The REAL adopt path (client shells keep their own ids — match by order).
  const w2 = makeSimWorld('warrior', 0xd133);
  applySnapshot(w2, snap);
  const c = w2.actors[snap.actors.findIndex(x => x.id === eye.id)];
  check('wire: the client adopted the posture from its OWN registry + the stamps from the wire',
    !!wp && c.watch === MONSTERS.barrow_watchman.watch
    && c.senseDetect === wp[0] && c.senseArcHalf === wp[1]
    && Math.abs(c.watchS - wp[4]) < 1e-9);
  const hostFan = watchFanRadius(w, eye, 0.4, 1, false);
  const clientFan = watchFanRadius(w2, c, 0.4, 1, false);
  check('wire: host and client draw the SAME fan from the same numbers (open ground)',
    hostFan > 0 && Math.abs(hostFan - clientFan) < 1.5,
    `host ${hostFan.toFixed(1)} vs client ${clientFan.toFixed(1)}`);
}

// --- 11) Determinism (same seed, same watchers, byte-same ladder) ----------------
{
  const run = (seed: number): string => {
    seedGlobalRandom(seed); // the sim law: a determinism run owns its stream
    const w = world(seed);
    const eye = spawn(w, 'barrow_watchman', 6);
    eye.pos = vec(500, 700);
    eye.aiAnchor = vec(500, 700);
    const hound = spawn(w, 'barrow_hound', 6);
    hound.pos = vec(320, 980);
    hound.aiAnchor = vec(320, 980);
    const prey = spawn(w, 'probe_watch_body', 6, 'player');
    prey.kind = 'player';
    prey.pos = vec(300, 900);
    tick(w, 4, () => { if (prey.pos.x < 900) prey.pos.x += 2.0; });
    return w.actors.map(a =>
      `${a.id}:${a.pos.x.toFixed(3)},${a.pos.y.toFixed(3)},${a.facing.toFixed(5)},`
      + `${a.watchS.toFixed(6)},${a.watchRung},${a.aggroed ? 1 : 0}`).join('|');
  };
  check('determinism: two same-seed runs land byte-identical watch state',
    run(0xf00d) === run(0xf00d));
}

// --- 12) THE WATCH POST TENANT — generation laws (data/watchposts.ts) -----------
// The ring-tenant composition: a court ring seats a POSTED WATCHER through the
// massif fabric's occupancy draw (landmarkSpawns rows — the pit-dweller lane),
// under the fork law (a table perturbs occupants alone), the replacement law
// (the table silences the kind's independent garrison/inner chances), the
// body law (only watch+post kin seat; strangers refused, nothing thrown), the
// dress law (the brazier keeps the seat standoff and the floor), and the lite
// agreement (a lite and a full mint agree on WHO holds the ring).
{
  const wpArena = { w: 2600, h: 2000 };
  const wpEntry = vec(120, 1000);
  const wpExits = [vec(2480, 1000)];
  const WP_THEME = { floor: '#161616', grid: '#222', border: '#555', obstacle: '#333', obstacleEdge: '#666', accent: '#999' };
  const WP_PARAMS = { massifCoverage: [0.2, 0.26] as [number, number], massifSizeR: [210, 300] as [number, number] };
  const wpDef = (id: string, rows: unknown[], extra?: Partial<ZoneDef>): ZoneDef => ({
    id, name: `QA ${id}`, level: 8, size: { w: wpArena.w, h: wpArena.h },
    theme: WP_THEME, layout: [], objective: { kind: 'clear' }, exits: [], map: { x: 0, y: 0 },
    layoutType: 'massif', layoutParams: { ...WP_PARAMS, massifMasses: rows },
    ...extra,
  });
  const wpGen = (def: ZoneDef, seed: number) =>
    generateLayout({ ...def, seed }, wpArena, new Rng(seed), wpEntry, wpExits);
  const wpCtx = (seed: number, lite?: boolean): GenCtx => ({
    rng: new Rng(seed), arena: wpArena, entry: wpEntry, exits: wpExits, seed,
    doodads: [], pois: [], camps: [], breakables: [], npcs: [],
    garrisons: [], caveSeeds: [], reserved: [], ...(lite ? { lite: true } : {}),
  });
  const seedOf = (s: number): number => (1000003 * (s + 1) + 17) ^ 0x77a1;
  // ruincourt forced to pure court silhouettes (the K2 pattern) — its authored
  // independent lanes (garrison 0.35 + urn/pot inner) are the replacement
  // law's live pressure.
  const courtRows = (tenants?: unknown[]): unknown[] => [{
    kind: 'ruincourt', weight: 1,
    over: { shapes: [{ shape: 'court', weight: 1 }], ...(tenants ? { tenants } : {}) },
  }];
  const WP_TABLE = [{ kind: 'watch_post', weight: 1, params: { watchers: [{ id: 'ushabti_sentinel', weight: 1 }] } }];
  const floorROf = (m: { r: number }): number => m.r * 0.6 * 0.9; // ruincourt has no ringInner → the handler's default floor law

  // The def premise the whole seat rides (the def-lane post stamp).
  check('post gen: the rim sentinel wears BOTH watch and post (the seat\'s def-lane premise)',
    !!MONSTERS.ushabti_sentinel.watch && !!MONSTERS.ushabti_sentinel.post
    && !!MONSTERS.barrow_watchman.watch && !!MONSTERS.barrow_watchman.post);
  // The preset census: every WATCH_POST_DETAILS body qualifies (rot pin).
  check('post gen: every preset detail fields only true watchers (watch + post, ids resolve)',
    Object.values(WATCH_POST_DETAILS).every(d =>
      [...d.watchers, ...(d.aides?.pool ?? [])].every(r =>
        !!MONSTERS[r.id]?.watch && !!MONSTERS[r.id]?.post)));

  // 12a — the seat: one watcher per court, on the floor, deterministic, the
  // brazier under the dress law; the carve twin's fork stream lands the SAME
  // spawn rows the full gen shipped.
  {
    let courts = 0, fires = 0, ok = true, detail = '';
    for (let s = 0; s < 4 && ok; s++) {
      const seed = seedOf(s);
      const def = wpDef('wp_seat', courtRows(WP_TABLE));
      const out = wpGen(def, seed);
      const again = wpGen(def, seed);
      if (JSON.stringify(out.landmarkSpawns ?? []) !== JSON.stringify(again.landmarkSpawns ?? [])) {
        ok = false; detail = `seed ${seed}: two same-seed gens disagree on the seats`; break;
      }
      const ctx2 = wpCtx(seed);
      const masses = carveMassifs(ctx2, { ...def, seed });
      if (JSON.stringify(ctx2.landmarkSpawns ?? []) !== JSON.stringify(out.landmarkSpawns ?? [])) {
        ok = false; detail = `seed ${seed}: the carve twin's fork stream diverged from the shipped gen`; break;
      }
      const spawns = out.landmarkSpawns ?? [];
      const braziers = out.doodads.filter(d => d.kind === 'brazier');
      for (const m of masses.filter(m => m.interior)) {
        courts++;
        const mine = spawns.filter(sp => Math.hypot(sp.pos.x - m.interior!.x, sp.pos.y - m.interior!.y) <= floorROf(m) + 1e-6);
        if (mine.length !== 1 || mine[0].id !== 'ushabti_sentinel') {
          ok = false; detail = `seed ${seed}: a court seats ${mine.length} watchers`; break;
        }
        const fire = braziers.filter(d => Math.hypot(d.pos.x - m.interior!.x, d.pos.y - m.interior!.y) <= floorROf(m) + 1e-6);
        for (const f of fire) {
          const dSeat = Math.hypot(f.pos.x - m.interior!.x, f.pos.y - m.interior!.y);
          if (dSeat < 42 - 1e-6) { ok = false; detail = `seed ${seed}: a brazier crowds the POI seat (${dSeat.toFixed(0)}px)`; }
        }
        fires += fire.length;
      }
      for (const sp of spawns) {
        if (!masses.some(m => m.interior && Math.hypot(sp.pos.x - m.interior.x, sp.pos.y - m.interior.y) <= floorROf(m) + 1e-6)) {
          ok = false; detail = `seed ${seed}: a watcher leaked outside every court floor`;
        }
      }
    }
    check('post gen: every court seats exactly ONE watcher on its floor, deterministically (carve twin agrees)',
      ok && courts >= 8, detail || `${courts} courts over the sweep`);
    check('post gen: the lit stand lands (braziers on floors, never crowding the seat)',
      fires > 0, `${fires} braziers over ${courts} courts`);
  }

  // 12b — THE REPLACEMENT LAW: the watch_post table silences ruincourt's
  // independent garrison + inner-stock chances (both proven live table-less).
  {
    let plainGarr = 0, plainPots = 0, tabledGarr = 0, tabledPots = 0;
    // Inner-only kinds (the K2 law): ruincourt's skirt/crest speak rubble and
    // rock, so only urns/pots witness the inner-stock lane.
    const potKinds = new Set(['burial_urn', 'clay_pots']);
    for (let s = 0; s < 4; s++) {
      const seed = seedOf(s) ^ 0x3;
      const mkPots = (out: ReturnType<typeof wpGen>, masses: { r: number; interior?: Vec2 }[]): number =>
        out.doodads.filter(d => potKinds.has(d.kind)
          && masses.some(m => m.interior && Math.hypot(d.pos.x - m.interior.x, d.pos.y - m.interior.y) <= floorROf(m) + 1e-6)).length;
      const plainDef = wpDef('wp_repl', courtRows(), { biome: 'desert' });
      const cP = wpCtx(seed);
      const mP = carveMassifs(cP, { ...plainDef, seed });
      plainGarr += cP.garrisons.length;
      plainPots += mkPots(wpGen(plainDef, seed), mP);
      const tabledDef = wpDef('wp_repl', courtRows(WP_TABLE), { biome: 'desert' });
      const cT = wpCtx(seed);
      const mT = carveMassifs(cT, { ...tabledDef, seed });
      tabledGarr += cT.garrisons.length;
      tabledPots += mkPots(wpGen(tabledDef, seed), mT);
    }
    check('post gen: the replacement law — the table silences the independent garrison + stock lanes',
      tabledGarr === 0 && tabledPots === 0, `tabled posted ${tabledGarr} garrisons, ${tabledPots} inner pieces`);
    check('post gen: replacement pressure — the silenced lanes were LIVE table-less',
      plainGarr > 0 && plainPots > 0, `plain: ${plainGarr} garrisons, ${plainPots} inner pieces`);
  }

  // 12c — THE FORK LAW: on a clean kind (fold court — no garrison, no inner)
  // the watch_post table adds its seats + fires and moves NOTHING else — the
  // grid, the POIs and every other doodad byte-match the table-less mint.
  {
    const mkRows = (tenants?: unknown[]): unknown[] => [{
      kind: 'fold', weight: 1,
      over: { shapes: [{ shape: 'court', weight: 1 }], ...(tenants ? { tenants } : {}) },
    }];
    let ok = true, detail = '', seats = 0;
    for (let s = 0; s < 3 && ok; s++) {
      const seed = seedOf(s) ^ 0x5;
      const a = wpGen(wpDef('wp_fork', mkRows()), seed);
      const b = wpGen(wpDef('wp_fork', mkRows(WP_TABLE)), seed);
      if ((a.landmarkSpawns ?? []).length) { ok = false; detail = 'the table-less mint seated a watcher from nowhere'; }
      seats += (b.landmarkSpawns ?? []).length;
      if (JSON.stringify(a.doodads) !== JSON.stringify(b.doodads.filter(d => d.kind !== 'brazier'))) {
        ok = false; detail = `seed ${seed}: the table moved dress beyond its own fires`;
      }
      const ga = a.walk instanceof GridWalkField ? a.walk.pack().kbits : 'a';
      const gb = b.walk instanceof GridWalkField ? b.walk.pack().kbits : 'b';
      if (ga !== gb) { ok = false; detail = `seed ${seed}: the table moved the grid`; }
      if (JSON.stringify(a.pois) !== JSON.stringify(b.pois)) { ok = false; detail = `seed ${seed}: the table moved the POIs`; }
    }
    check('post gen: the fork law — the table adds seats + fires and disturbs nothing else',
      ok && seats > 0, detail || `${seats} seats over the sweep`);
  }

  // 12d — THE LITE AGREEMENT: a lite carve seats the SAME watchers (occupancy
  // draws untouched) and plants NO fire (dress stands down).
  {
    let ok = true, detail = '', fires = 0, seats = 0;
    for (let s = 0; s < 3 && ok; s++) {
      const seed = seedOf(s) ^ 0x9;
      const def = wpDef('wp_lite', courtRows(WP_TABLE));
      const full = wpCtx(seed);
      carveMassifs(full, { ...def, seed });
      const lite = wpCtx(seed, true);
      carveMassifs(lite, { ...def, seed });
      seats += (full.landmarkSpawns ?? []).length;
      if (JSON.stringify(full.landmarkSpawns ?? []) !== JSON.stringify(lite.landmarkSpawns ?? [])) {
        ok = false; detail = `seed ${seed}: lite and full mints disagree on who holds the ring`;
      }
      fires += full.doodads.filter(d => d.kind === 'brazier').length;
      if (lite.doodads.some(d => d.kind === 'brazier')) { ok = false; detail = `seed ${seed}: a lite mint lit a fire`; }
    }
    check('post gen: the lite agreement — same seats either way, fires only on the full mint',
      ok && seats > 0 && fires > 0, detail || `${seats} seats, ${fires} full-mint fires`);
  }

  // 12e — THE BODY LAW's refusals: a gateless body (watch, no post), a
  // driftless body (post, no watch), a stranger and a bare row all seat
  // nothing — warn-once, nothing thrown, the carve undisturbed.
  {
    MONSTERS.probe_wp_gateless = {
      id: 'probe_wp_gateless', name: 'Gateless', color: '#888', shape: 'circle',
      radius: 12, base: { life: 10, moveSpeed: 100, accuracy: 100, mana: 0 },
      skills: [], xp: 1, faction: 'beast', watch: {}, brain: { type: 'basic' },
    };
    MONSTERS.probe_wp_driftless = {
      id: 'probe_wp_driftless', name: 'Driftless', color: '#888', shape: 'circle',
      radius: 12, base: { life: 10, moveSpeed: 100, accuracy: 100, mana: 0 },
      skills: [], xp: 1, faction: 'beast', post: true, brain: { type: 'basic' },
    };
    const seed = seedOf(7) ^ 0xb;
    const tables: [string, unknown][] = [
      ['gateless', { watchers: [{ id: 'probe_wp_gateless', weight: 1 }] }],
      ['driftless', { watchers: [{ id: 'probe_wp_driftless', weight: 1 }] }],
      ['stranger', { watchers: [{ id: 'no_such_watcher', weight: 1 }] }],
      ['bare row', undefined],
      ['unknown detail', { detail: 'no_such_detail' }],
    ];
    let ok = true, detail = '';
    for (const [label, params] of tables) {
      const rows = courtRows([{ kind: 'watch_post', weight: 1, ...(params !== undefined ? { params } : {}) }]);
      const ctx2 = wpCtx(seed);
      carveMassifs(ctx2, { ...wpDef('wp_refuse', rows), seed });
      if ((ctx2.landmarkSpawns ?? []).length || ctx2.doodads.some(d => d.kind === 'brazier')) {
        ok = false; detail = `the ${label} table still seated a body or lit a fire`;
      }
    }
    check('post gen: the body law refuses gateless/driftless/stranger/bare rows (seats nothing, throws nothing)',
      ok, detail);
  }
}

// --- 13) THE LIVE POST (caveMap mint → loadZone → the seated watcher's conduct) --
// The end-to-end: the tenant's landmarkSpawns row materializes through the
// REAL loadZone lane, arrives wearing the def's watch + the def-lane postSpec,
// anchors its STATION at the authored stand (first-tick anchor), walks home
// when displaced (the sentry fabric), climbs the ladder in place (stirring
// turns the head, searching walks), stands down HOME, and pain bypasses the
// gate (the wound jumps straight to a lock).
{
  const w = world(0xd140);
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const wAny = w as any;
  const LIVE_SEED = 771307;
  const liveDef: ZoneDef = {
    id: 'probe_watchpost_court', name: 'Probe Watch Court', level: 6,
    size: { w: 2200, h: 1800 },
    theme: { floor: '#161616', grid: '#222', border: '#555', obstacle: '#333', obstacleEdge: '#666', accent: '#999' },
    layout: [], layoutType: 'massif',
    layoutParams: {
      massifCoverage: [0.16, 0.2] as [number, number], massifSizeR: [230, 280] as [number, number],
      massifMasses: [{
        kind: 'ruincourt', weight: 1,
        over: {
          shapes: [{ shape: 'court', weight: 1 }],
          tenants: [{ kind: 'watch_post', weight: 1, params: { watchers: [{ id: 'barrow_watchman', weight: 1 }] } }],
        },
      }],
    },
    objective: { kind: 'none' },
    packs: { table: [], count: [0, 0], size: [0, 0] }, packDensity: 0,
    exits: [{ to: SIM_ARENA_ID, side: 's' }],
    map: { x: 0, y: 0 }, seed: LIVE_SEED,
  };
  wAny.caveMap[liveDef.id] = liveDef;
  w.loadZone(liveDef.id);
  // Re-park the hero (loadZone stood it at the entry) — undetectable, far out.
  w.player.pos.x = 60;
  w.player.pos.y = 60;
  const watchers = w.actors.filter(a => a.defId === 'barrow_watchman');
  check('live: the minted court seats its watchman (the landmarkSpawns lane materialized)',
    watchers.length >= 1, `${watchers.length} seated`);
  const eye = watchers[0];
  const stand = vec(eye.pos.x, eye.pos.y);
  check('live: the body arrives wearing the fabric (the def\'s own WatchSpec + the def-lane postSpec)',
    eye.watch === MONSTERS.barrow_watchman.watch && !!eye.postSpec);
  tick(w, 0.2);
  check('live: the first tick anchors the STATION at the authored stand (post == the seat)',
    !!eye.aiAnchor && Math.hypot(eye.aiAnchor.x - stand.x, eye.aiAnchor.y - stand.y) < 0.5
    && Math.hypot(eye.pos.x - stand.x, eye.pos.y - stand.y) < 2);

  // THE WALK HOME: shove the watcher past the slack; the duty post walks it
  // back and re-plants the posted facing. Candidates read the LIVE zone's
  // own walk grid — the same truth the walk-back will path over.
  {
    const walk = wAny.walk as GridWalkField | undefined;
    let displaced: Vec2 | undefined;
    for (let k = 0; k < 16 && !displaced; k++) {
      const a = (k / 16) * Math.PI * 2;
      const x = stand.x + Math.cos(a) * 110, y = stand.y + Math.sin(a) * 110;
      if (walk?.isWalkable(x, y)) displaced = vec(x, y);
    }
    check('live: displacement premise (the zone walks, and a walkable spot past the slack exists)',
      !!walk && !!displaced && 110 > POST_CFG.slack);
    if (displaced) {
      eye.pos = vec(displaced.x, displaced.y);
      tick(w, 12);
      check('live: the strayed watchman WALKED HOME to its stand (the sentry fabric composed)',
        Math.hypot(eye.pos.x - stand.x, eye.pos.y - stand.y) < 24,
        `ended ${Math.hypot(eye.pos.x - stand.x, eye.pos.y - stand.y).toFixed(0)}px out`);
      check('live: the posted facing re-planted on arrival',
        eye.aiPostFacing !== undefined && Math.abs(eye.facing - eye.aiPostFacing) < 1e-6);
    }
  }

  // Candidate seats on the LIVE court floor: walkable on the zone's own grid
  // and SIGHT-CLEAR to the eye (the ring wall occludes — a blind spot would
  // test nothing), banded by bearing off the post's base gaze.
  const fcBase = eye.aiPostFacing ?? eye.facing;
  const seatSpot = (loDeg: number, hiDeg: number, dists: number[]): Vec2 | undefined => {
    const walk = wAny.walk as GridWalkField | undefined;
    for (const d of dists) {
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        let off = a - fcBase;
        while (off > Math.PI) off -= 2 * Math.PI;
        while (off < -Math.PI) off += 2 * Math.PI;
        const offDeg = Math.abs(off) * 180 / Math.PI;
        if (offDeg < loDeg || offDeg > hiDeg) continue;
        const x = eye.pos.x + Math.cos(a) * d, y = eye.pos.y + Math.sin(a) * d;
        if (!walk?.isWalkable(x, y)) continue;
        const ray = w.sightClipD(eye.pos, vec(x, y), eye.tier);
        if (Number.isFinite(ray) && ray < d - 1) continue;
        return vec(x, y);
      }
    }
    return undefined;
  };

  // THE LADDER IN PLACE: prey inside the swept cone's coverage — the gaze
  // crosses it, the ladder climbs THROUGH its rungs, stirring turns the head
  // toward the stimulus, the search crossing plants the walk, the top locks.
  {
    const preyAt = seatSpot(0, 55, [120, 100, 140]);
    check('live: ladder premise (a walkable, sight-clear spot inside the swept coverage)', !!preyAt);
    const prey = spawn(w, 'probe_watch_body', 6, 'player');
    prey.pos = preyAt ? vec(preyAt.x, preyAt.y) : vec(stand.x + 120, stand.y);
    const rungsSeen: number[] = [];
    let headTurned = false;
    tick(w, 16, () => {
      if (!rungsSeen.includes(eye.watchRung)) rungsSeen.push(eye.watchRung);
      if (eye.watchRung === 1) {
        const want = Math.atan2(prey.pos.y - eye.pos.y, prey.pos.x - eye.pos.x);
        let d = eye.facing - want;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        if (Math.abs(d) < 0.35) headTurned = true;
      }
    });
    check('live: the seated ladder climbed THROUGH its rungs to a lock (no teleport)',
      rungsSeen.join(',').startsWith('0,1,2') && eye.aggroed && eye.aiTargetId === prey.id,
      `saw [${rungsSeen.join(',')}]`);
    check('live: stirring turned the head toward the stimulus', headTurned);
    check('live: the search crossing planted the investigate walk',
      eye.alertUntil > 0 && eye.watchAt !== undefined);
    // Stand-down: prey gone → the lock breaks, the meter drains, and the
    // POST walks the investigation's wander back to the stand.
    prey.pos = vec(4000, 4000);
    tick(w, 26);
    check('live: the stand-down came home (aggro cleared, rung 0, back AT the stand)',
      !eye.aggroed && eye.watchRung === WATCH_RUNG.unaware
      && Math.hypot(eye.pos.x - stand.x, eye.pos.y - stand.y) < 24,
      `ended ${Math.hypot(eye.pos.x - stand.x, eye.pos.y - stand.y).toFixed(0)}px out, rung ${eye.watchRung}`);
  }

  // PAIN NEEDS NO LADDER, seated: an archer BEHIND the post's swept coverage
  // (±110° = cone half 35 + sweep half 75) and beyond the rear ring, but
  // sight-clear inside the court — the arrow fired through the REAL useSkill
  // is the only stimulus, and the wound alone opens the gate.
  {
    const archAt = seatSpot(135, 180, [180, 160, 200]);
    check('live: pain premise (a rear, sight-clear stand beyond every unprovoked sense)',
      !!archAt && (!archAt || Math.hypot(archAt.x - eye.pos.x, archAt.y - eye.pos.y) > eye.senseDetect * eye.senseRearMul + 30));
    const archer = spawn(w, 'probe_watch_archer', 6, 'player');
    archer.pos = archAt ? vec(archAt.x, archAt.y) : vec(stand.x - 180, stand.y);
    const bow = archer.skills.find(s => s?.def.id === 'bone_arrow');
    check('live: pain premise (the archer carries its bow)', !!bow);
    let aggroAt = -1;
    let firstHitAt = -1;
    let fedBeforeHit = false;
    const t0 = w.time;
    tick(w, 4, () => {
      // One wound is the test: hold fire once the gate answered (a 46-life
      // watchman under 4s of arrows would die mid-assertion).
      if (aggroAt < 0 && bow && !archer.casting) w.useSkill(archer, bow, eye.pos);
      // The DECAYED meter (watchValueOf) — the raw field legitimately holds a
      // stale pre-stand-down number the lazy-decay law has already spent.
      if (firstHitAt < 0 && eye.aiHitAt >= t0) firstHitAt = eye.aiHitAt;
      if (firstHitAt < 0 && watchValueOf(eye, eye.watch!, w.time) > 1e-6) fedBeforeHit = true;
      if (eye.aggroed && aggroAt < 0) aggroAt = w.time;
    });
    check('live: pain bypassed the seated gate (the wound alone locked, toward its author)',
      !fedBeforeHit && firstHitAt >= t0 && aggroAt > 0 && aggroAt - firstHitAt < 0.6
      && eye.aiTargetId === archer.id && !eye.dead,
      `hit at ${firstHitAt.toFixed(2)}s, aggro at ${aggroAt.toFixed(2)}s`);
  }
}

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL PASS');
process.exit(failed ? 1 : 0);
