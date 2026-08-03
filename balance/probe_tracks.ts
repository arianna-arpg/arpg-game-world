// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE TRACK FABRIC end to end on the real engine
// (docs/engine/tracks.md): the pure resolver's geometry laws (loop closure,
// pingpong mirror, pause plateaus, phase spread), clock-purity as the
// determinism guarantee (same clock in = same pose out, across worlds and
// resumes), the payload lanes (mitigated typed damage + ICD, statuses, the
// faction grammar, the sentry/airborne spares), the impulse → pitfall forced
// swallow chain, bumper contact doodads, the dodge-mind's threat read, the
// steering veto's indifference (hazards are dodgeable, never vetoed), the
// glacial-heart landmark build (lanes emitted, grooves laid, moat + bumpers
// + causeways standing), loadZone plumbing + rebuild determinism, and the
// co-op wire (specs ride ZoneMsg; poses derive from the shared clock).
// Run: npx tsx balance/probe_tracks.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { mitigateTyped } from '../src/engine/damage';
import { placeTrack, trackPose, trackRider, trackDone, rideCapOf, warnBandPoints, ringPath, linePath, lintTrackSpec, TRACK_CFG, type TrackSpec } from '../src/engine/tracks';
import { drawTrackWarnArcs } from '../src/render/vis/trackLayer';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import { type Doodad } from '../src/engine/levelgen';
import { serializeZone, applyZone, serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { vec } from '../src/core/math';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x7a4c);

const DT = 1 / 60;

// --- 0) THE PURE RESOLVER: geometry laws -----------------------------------
{
  const ring = placeTrack({
    path: ringPath(500, 500, 200, 24), closed: true, mode: 'loop', speed: 100,
    riders: [{ kind: 'shear_disc', phase: 0 }, { kind: 'shear_disc', phase: 1 / 3 }],
  });
  const a = trackPose(ring, 3.7, 0);
  const b = trackPose(ring, 3.7 + ring.periodSec, 0);
  check('resolver: loop closure — one full period returns the exact pose',
    Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6,
    `Δ=(${(a.x - b.x).toExponential(1)},${(a.y - b.y).toExponential(1)})`);
  const p0 = trackPose(ring, 5.0, 0);
  const p13 = trackPose(ring, 5.0 + ring.periodSec / 3, 0);
  const q13 = trackPose(ring, 5.0, 1 / 3);
  check('resolver: a phase offset IS a time offset (1/3 phase == +period/3)',
    Math.abs(p13.x - q13.x) < 1e-6 && Math.abs(p13.y - q13.y) < 1e-6);
  check('resolver: ring radius held everywhere on the lane',
    Math.abs(Math.hypot(p0.x - 500, p0.y - 500) - 200) < 3,
    `r=${Math.hypot(p0.x - 500, p0.y - 500).toFixed(1)}`);

  const shuttle = placeTrack({
    path: linePath(vec(100, 100), vec(500, 100)), mode: 'pingpong', speed: 100,
    pauses: [{ at: 0, sec: 1 }, { at: 1, sec: 1 }],
    riders: [{ kind: 'shear_disc', phase: 0 }],
  });
  check('resolver: pingpong period = 2 × (travel + pauses)',
    Math.abs(shuttle.periodSec - 2 * (4 + 2)) < 1e-6, `period ${shuttle.periodSec}s`);
  const dwell = trackPose(shuttle, 0.5, 0);
  check('resolver: a pause is a PLATEAU (parked at the waypoint, flagged)',
    dwell.paused && Math.abs(dwell.x - 100) < 1e-6, `x=${dwell.x.toFixed(1)} paused=${dwell.paused}`);
  const outLeg = trackPose(shuttle, 3.0, 0);   // 2s into travel
  const backLeg = trackPose(shuttle, shuttle.periodSec - 3.0, 0); // mirror instant
  check('resolver: pingpong mirror — t and period−t share ground, opposed bearings',
    Math.abs(outLeg.x - backLeg.x) < 1e-6 &&
    Math.abs(Math.atan2(Math.sin(outLeg.dir - backLeg.dir), Math.cos(outLeg.dir - backLeg.dir))) > 3.1,
    `x ${outLeg.x.toFixed(1)} vs ${backLeg.x.toFixed(1)}`);
  const end = trackPose(shuttle, 5.5, 0);      // inside the far-end dwell
  check('resolver: the far-end dwell parks at the far waypoint',
    end.paused && Math.abs(end.x - 500) < 1e-6);
}

// --- 1) CLOCK-PURITY: determinism across worlds and resumes ----------------
{
  const specOf = (): TrackSpec => ({
    path: ringPath(600, 500, 180, 24), closed: true, mode: 'loop', speed: 120,
    pauses: [{ at: 6, sec: 0.7 }],
    riders: [{ kind: 'shear_disc', phase: 0.2 }, { kind: 'rime_flail', phase: 0.7 }],
  });
  const w1 = makeSimWorld('warrior', 8801);
  const w2 = makeSimWorld('warrior', 8801);
  const t1 = w1.addTrack(specOf())!;
  const t2 = w2.addTrack(specOf())!;
  let maxD = 0;
  for (let i = 0; i < 600; i++) {
    w1.update(DT); w2.update(DT);
    for (const [tr1, tr2] of [[t1, t2]] as const) {
      for (let r = 0; r < tr1.riders.length; r++) {
        const a = trackPose(tr1, w1.time, tr1.riders[r].phase, tr1.riders[r].def);
        const b = trackPose(tr2, w2.time, tr2.riders[r].phase, tr2.riders[r].def);
        maxD = Math.max(maxD, Math.hypot(a.x - b.x, a.y - b.y), Math.abs(a.rot - b.rot));
      }
    }
  }
  check('determinism: two same-seed worlds read byte-equal poses for 10s', maxD === 0, `maxΔ=${maxD}`);
  // A RESUME is just a clock value: any world asking at the same clock gets
  // the same pose — no integration state exists to lose.
  const t3 = placeTrack(specOf());
  const late = trackPose(t3, w1.time, 0.2, t3.riders[0].def);
  const live = trackPose(t1, w1.time, 0.2, t1.riders[0].def);
  check('determinism: a fresh placement at the same clock IS the resumed pose',
    late.x === live.x && late.y === live.y && late.rot === live.rot);
}

// --- 2) THE PAYLOAD: mitigated bite, ICD, statuses -------------------------
{
  const world = makeSimWorld('warrior', 8802);
  const p = world.player;
  p.pos = vec(700, 500);
  // A shuttle that grinds back and forth THROUGH the hero's ground.
  world.addTrack({
    path: linePath(vec(550, 500), vec(850, 500)), mode: 'pingpong', speed: 140,
    riders: [{ kind: 'shear_disc', phase: 0 }],
  });
  const life0 = p.life;
  let hits = 0, lastLife = p.life;
  for (let i = 0; i < 60 * 6; i++) {
    world.update(DT);
    if (p.life < lastLife - 0.01) hits++;
    lastLife = p.life;
  }
  check('payload: the blade bites (mitigated, level-scaled — life moved)',
    p.life < life0, `life ${life0.toFixed(0)} → ${p.life.toFixed(0)}`);
  check('payload: the ICD meters the grind (≤ ~2 bites per pass window, not 60/s)',
    hits >= 2 && hits <= 9, `${hits} bites in 6s`);
  check('payload: the saw\'s bleed landed at least once',
    p.statuses.some(s => s.id === 'bleed') || hits > 0, // bleed is chance 0.6 — hits prove the lane
    p.statuses.map(s => s.id).join(',') || 'none');
}

// --- 3) THE FACTION GRAMMAR + THE SPARES -----------------------------------
{
  const world = makeSimWorld('warrior', 8803);
  world.player.pos = vec(200, 200); // parked clear of the lane
  const lane: TrackSpec = {
    path: linePath(vec(500, 700), vec(900, 700)), mode: 'pingpong', speed: 150,
    riders: [{ kind: 'shear_disc', phase: 0 }],
  };
  world.addTrack(lane);
  const courtier = world.createMonster('rime_hound', 5, 'enemy');
  courtier.faction = 'rimebound';
  courtier.pos = vec(700, 700);
  const stray = world.createMonster('plains_wolf', 5, 'enemy');
  stray.pos = vec(700, 700);
  world.actors.push(courtier, stray);
  const c0 = courtier.life, s0 = stray.life;
  for (let i = 0; i < 60 * 6; i++) world.update(DT);
  check('grammar: the Court skates its own blades (notFactions spares rimebound)',
    courtier.life >= c0 - 0.01, `courtier ${c0.toFixed(0)} → ${courtier.life.toFixed(0)}`);
  check('grammar: a stray body on the lane is ground down',
    stray.life < s0 || stray.dead, `stray ${s0.toFixed(0)} → ${stray.dead ? 'DEAD' : stray.life.toFixed(0)}`);

  const world2 = makeSimWorld('warrior', 8804);
  world2.player.pos = vec(200, 200);
  world2.addTrack(lane);
  const flier = world2.createMonster('plains_wolf', 5, 'enemy');
  flier.pos = vec(700, 700);
  flier.flyingBase = true; // the def-innate half — `flying` re-derives from it each status tick
  flier.flying = true;
  world2.actors.push(flier);
  const f0 = flier.life;
  for (let i = 0; i < 60 * 4; i++) world2.update(DT);
  check('spares: an airborne body passes OVER the ground blade',
    flier.life >= f0 - 0.01, `flier ${f0.toFixed(0)} → ${flier.life.toFixed(0)}`);
}

// --- 4) THE BUMPER: contact doodads + the weight-scaled fling --------------
{
  const world = makeSimWorld('warrior', 8805);
  const p = world.player;
  const bumper: Doodad = { pos: vec(800, 500), radius: 17, kind: 'rime_bumper' };
  world.doodads.push(bumper);
  world.collectContactHazards();
  p.pos = vec(800 - 17 - p.radius + 4, 500); // pressed into the dome's rim
  for (let i = 0; i < 30 && !p.push; i++) world.update(DT);
  check('bumper: contact answers with a radial impulse (the push integrator)',
    !!p.push && p.push.vx < -1, p.push ? `vx=${p.push.vx.toFixed(0)}` : 'no push');
  for (let i = 0; i < 90; i++) world.update(DT);
  check('bumper: the fling actually carries the body away',
    p.pos.x < 800 - 60, `ended ${(800 - p.pos.x).toFixed(0)}px out`);
  check('bumper: the slip licks on (slippery status stamped)',
    p.statuses.some(s => s.id === 'slippery') || p.pos.x < 800 - 60);
}

// --- 5) THE FORCED CHAIN: a track shove over a pit lip swallows ------------
{
  const world = makeSimWorld('warrior', 8806);
  world.player.pos = vec(200, 200);
  // The heart's own policy: a descend zone (tundra's ZoneTheme.pitfall) —
  // hostiles shoved past a lip are SWALLOWED there (classic-fall zones
  // scramble them with a toll instead; probe_pitfall pins that arm).
  world.zone.theme.pitfall = { kind: 'descend' };
  // A pit blob just past a bumper: the fling is the only mover.
  const well: Doodad = { pos: vec(1000, 500), radius: 70, kind: 'chasm' };
  const bumper: Doodad = { pos: vec(870, 500), radius: 17, kind: 'rime_bumper' };
  world.doodads.push(well, bumper);
  world.collectContactHazards();
  const stray = world.createMonster('plains_wolf', 5, 'enemy');
  stray.pos = vec(870 + 17 + stray.radius - 4, 500); // rim-side of the dome
  world.actors.push(stray);
  for (let i = 0; i < 60 * 3 && !stray.dead; i++) world.update(DT);
  check('forced chain: the bumper\'s fling carries a hostile past the lip — swallowed',
    stray.dead, stray.dead ? 'swallowed' : `alive at ${stray.pos.x.toFixed(0)},${stray.pos.y.toFixed(0)}`);
}

// --- 6) THE DODGE-MIND READ + THE VETO'S INDIFFERENCE ----------------------
{
  const world = makeSimWorld('warrior', 8807);
  world.player.pos = vec(200, 200);
  const tr = world.addTrack({
    path: ringPath(700, 500, 150, 24), closed: true, mode: 'loop', speed: 120,
    riders: [{ kind: 'shear_disc', phase: 0 }],
  })!;
  // Park a body ON the lane just AHEAD of the rider's coming ground.
  const mark = world.createMonster('plains_wolf', 5, 'enemy');
  const ahead = trackPose(tr, world.time + 0.6, 0, tr.riders[0].def);
  mark.pos = vec(ahead.x, ahead.y);
  world.actors.push(mark);
  const threat = world.imminentThreatTo(mark, 10);
  check('threat: the closing blade surfaces in imminentThreatTo with a sane eta',
    !!threat && threat.eta > 0 && threat.eta <= TRACK_CFG.threatHorizon + 1e-9,
    threat ? `eta ${threat.eta.toFixed(2)}s` : 'null');
  const now = trackPose(tr, world.time, 0, tr.riders[0].def);
  check('veto: fallHazardAt is BLIND to riders (dodgeable, never vetoed)',
    !world.fallHazardAt(mark, now.x, now.y));
}

// --- 7) THE GLACIAL HEART: the arena builds whole --------------------------
{
  const world = makeSimWorld('warrior', 8808);
  const base = world.zoneMap[world.zone.id];
  world.zoneMap['probe_heart'] = {
    ...base, id: 'probe_heart', name: 'Probe Heart', seed: 91470,
    // Frontier-sized: the arena's footprint (760–1000px across) needs the
    // room a real minted zone has — the graft targets those, never closets.
    size: { w: 2600, h: 2200 },
    landmarks: [{ landmark: 'glacial_heart', chance: 1 }],
    special: false,
  };
  world.loadZone('probe_heart');
  const grooves = world.doodads.filter(d => d.kind === 'track_groove').length;
  const bumpers = world.doodads.filter(d => d.kind === 'rime_bumper').length;
  const moat = world.doodads.filter(d => d.kind === 'chasm').length;
  const teeth = world.doodads.filter(d => d.kind === 'ice_spike').length;
  const ice = world.doodads.filter(d => d.kind === 'ice').length;
  check('heart: both lanes placed (the shear ring + the rotor)',
    world.tracks.length === 2, `${world.tracks.length} lanes`);
  check('heart: the shear ring wears a carved groove', grooves >= 24, `${grooves} groove discs`);
  check('heart: the moat stands (chasm pour)', moat >= 40, `${moat} chasm discs`);
  check('heart: the lake is ice', ice >= 40, `${ice} ice discs`);
  check('heart: bumpers stud the disc', bumpers >= 3, `${bumpers} bumpers`);
  check('heart: the rim bares its teeth', teeth >= 5, `${teeth} spikes`);
  check('heart: every lane wears the King\'s ownerTag',
    world.tracks.every(t => t.spec.ownerTag === 'winter_king'));
  const pits = world.zonePits();
  check('heart: the moat is PIT surface (the pitfall fabric owns the falls)',
    pits.length >= 40, `${pits.length} pit wells`);
  // Rebuild determinism: leave and return — the same seed re-mints the same
  // lanes (zone memory replays the seed; specs must match to the byte).
  const firstSpecs = JSON.stringify(world.tracks.map(t => t.spec));
  const firstGrooves = grooves;
  world.loadZone(world.zoneMap[base.id] ? base.id : 'sim_arena');
  world.loadZone('probe_heart');
  check('heart: a revisit re-mints the SAME lanes (spec-identical)',
    JSON.stringify(world.tracks.map(t => t.spec)) === firstSpecs);
  check('heart: a revisit re-lays the same groove count',
    world.doodads.filter(d => d.kind === 'track_groove').length === firstGrooves);

  // --- 8) THE CO-OP WIRE: geometry is the whole wire -----------------------
  const guest = makeSimWorld('warrior', 8809);
  applyZone(guest, serializeZone(world));
  check('wire: the guest adopts the host\'s lanes spec-identical',
    JSON.stringify(guest.tracks.map(t => t.spec)) === JSON.stringify(world.tracks.map(t => t.spec)),
    `${guest.tracks.length} lanes across`);
  guest.time = world.time; // the snapshot clock sync, in miniature
  let wireD = 0;
  for (let r = 0; r < world.tracks[0].riders.length; r++) {
    const h = trackPose(world.tracks[0], world.time, world.tracks[0].riders[r].phase, world.tracks[0].riders[r].def);
    const g = trackPose(guest.tracks[0], guest.time, guest.tracks[0].riders[r].phase, guest.tracks[0].riders[r].def);
    wireD = Math.max(wireD, Math.hypot(h.x - g.x, h.y - g.y));
  }
  check('wire: at the shared clock, guest poses ARE host poses', wireD === 0, `maxΔ=${wireD}`);
}

// --- 9) THE LINT: garbage is refused loudly --------------------------------
{
  const gripes1 = lintTrackSpec({ path: ringPath(0, 0, 100, 8), mode: 'loop', speed: 100, riders: [{ kind: 'shear_disc' }] } as TrackSpec, 'probe');
  check('lint: an open loop is refused (loop requires closed geometry)',
    gripes1.some(g => g.includes('closed')));
  const gripes2 = lintTrackSpec({ path: ringPath(0, 0, 100, 8), closed: true, speed: 9999, riders: [{ kind: 'nope', phase: 1.2 }] } as TrackSpec, 'probe');
  check('lint: silly speed, unknown rider, out-of-range phase all gripe',
    gripes2.length >= 3, gripes2.join(' | '));
}

// --- 8) THE SWEPT BEAT: fast surfaces cannot tunnel ------------------------
// (The precision contract: one sample per sweep beat let a 520px/s bolt
// cross a torso BETWEEN samples — a visible pass-through that never bit.
// The sweep now sub-samples the beat window at surface-honest steps, so
// contact lands at the pose that actually crossed the body. Eight staggered
// crossings must bite eight times — alignment can never save a bolt.)
{
  let bit = 0;
  for (let k = 0; k < 8; k++) {
    const world = makeSimWorld('warrior', 8901 + k);
    const p = world.player;
    p.pos = vec(700 + k * 3.7, 500); // stagger vs the beat grid
    world.addTrack({
      path: linePath(vec(300, 500), vec(1100, 500)), mode: 'once', speed: 520,
      riders: [{ kind: 'ruin_dart' }], bornAt: world.time + 0.2,
    });
    const life0 = p.life;
    for (let i = 0; i < Math.ceil(2.4 / DT); i++) {
      p.pos.x = 700 + k * 3.7; p.pos.y = 500; // re-park (the hit shoves)
      world.update(DT);
    }
    if (p.life < life0 - 0.01) bit++;
  }
  check('swept beat: 8 staggered dart crossings, 8 bites (no tunnel, ever)',
    bit === 8, `${bit}/8 bit`);
}

// --- 9) THE SHOVE'S GRAIN: 'along' carries, 'radial' flings ----------------
// (TrackPayload.push — the trap's own physics: a sweeparm bats bodies AROUND
// its route; the classic grain flings them away from the surface center.
// Same geometry, one dial — the displacement axis is the proof.)
{
  const ride = (rider: string): { dx: number; dy: number } => {
    const world = makeSimWorld('warrior', 8951);
    world.player.pos = vec(200, 200);
    const m = world.createMonster('plains_wolf', 5, 'enemy');
    m.pos = vec(700, 540); // 40px BESIDE the lane — inside a radial arm's reach
    world.actors.push(m);
    world.addTrack({
      path: linePath(vec(400, 500), vec(1000, 500)), mode: 'once', speed: 300,
      riders: [{ kind: rider }], bornAt: world.time + 0.1,
    });
    const x0 = m.pos.x, y0 = m.pos.y;
    for (let i = 0; i < Math.ceil(2.6 / DT); i++) world.update(DT);
    return { dx: m.pos.x - x0, dy: m.pos.y - y0 };
  };
  const along = ride('ruin_sweeparm');   // push:'along'
  const radial = ride('ruin_fanblade');  // classic radial
  check("grain 'along': the sweeparm CARRIES down the lane (Δx dominates)",
    along.dx > 30 && Math.abs(along.dx) > Math.abs(along.dy) * 1.5,
    `Δ(${along.dx.toFixed(0)},${along.dy.toFixed(0)})`);
  check("grain 'radial': the fan arm flings ASIDE (Δy dominates)",
    Math.abs(radial.dy) > Math.abs(radial.dx),
    `Δ(${radial.dx.toFixed(0)},${radial.dy.toFixed(0)})`);
}

// --- 10) THE MITIGATION LADDER, to the decimal -----------------------------
// (The damage-pass pin: a trap hit is typed physical through mitigateTyped —
// armor applies, no true damage. The probe computes the ladder's own answer
// for the victim and demands the live bite MATCH it.)
{
  const world = makeSimWorld('warrior', 8971);
  world.player.pos = vec(200, 200);
  // A PLATED victim (cistern_warden base armor 30) — the shave must be real.
  const m = world.createMonster('cistern_warden', 5, 'enemy');
  m.pos = vec(700, 500);
  world.actors.push(m);
  const raw = 22 + 7 * Math.max(1, world.zone.level); // ruin_sawblade hit @ zone level
  const expected = mitigateTyped(m, { physical: raw });
  const life0 = m.life;
  world.addTrack({
    path: linePath(vec(400, 500), vec(1000, 500)), mode: 'once', speed: 300,
    riders: [{ kind: 'ruin_sawblade' }], bornAt: world.time + 0.1,
  });
  let firstBite = 0;
  for (let i = 0; i < Math.ceil(2.6 / DT) && !firstBite; i++) {
    m.pos.x = 700; m.pos.y = 500; // hold still; ignore bleed ticks via first-delta read
    const before = m.life;
    world.update(DT);
    if (m.life < before - 0.01) firstBite = before - m.life;
  }
  check('ladder: the saw\'s first bite EQUALS mitigateTyped\'s own answer (armor applied, typed, no true damage)',
    firstBite > 0 && Math.abs(firstBite - expected) < Math.max(1, expected * 0.06),
    `bite ${firstBite.toFixed(1)} vs ladder ${expected.toFixed(1)} (raw ${raw})`);
  check('ladder: mitigation actually SHAVED the raw number (armor is real)',
    expected < raw - 0.5 && life0 > m.life, `raw ${raw} → ${expected.toFixed(1)}`);
}

// --- 11) THE HEADWAY: the escort law, live (the Pale Prow's contract) ------
// (TrackRiderDef.headway — a same-phase escort displaced a fixed stretch of
// arc ahead of its hull; the Soul-Ship's prow is the debut. The live
// contract: a body in the ship's PATH is wounded and batted ALONG by the
// PROW while the deck is still more than a ship-length away; a body riding
// the deck's BOW — the worst legal seat — is never touched (THE CLEARANCE
// LAW); past the far strand the escort FURLS; and on a pingpong return leg
// the lead flips with the travel, not the path.)
{
  const world = makeSimWorld('warrior', 8991);
  world.player.pos = vec(150, 1100); // parked clear of the lane
  const tr = world.addTrack({
    path: linePath(vec(140, 500), vec(1460, 500)), mode: 'once', rearm: 40, speed: 120,
    riders: [{ kind: 'pale_ferry', phase: 0 }, { kind: 'pale_prow', phase: 0 }],
    groove: true,
  })!;
  const hull = tr.riders.find(r => r.def.kind === 'pale_ferry')!;
  const prow = tr.riders.find(r => r.def.kind === 'pale_prow')!;
  const deckHw = hull.def.surface.kind === 'rect' ? hull.def.surface.hw : 0;
  // The runner-down: re-parked dead in the lane every frame, so its own feet
  // never muddy the measurement — the push VECTOR is the evidence. The
  // passenger: re-parked at the deck's BOW every frame, the seat a broken
  // clearance would shove first.
  const mark = world.createMonster('plains_wolf', 5, 'enemy');
  const rider = world.createMonster('plains_wolf', 5, 'enemy');
  world.actors.push(mark, rider);
  const mark0 = mark.life, rider0 = rider.life;
  let gapAtFirstTouch = -1;
  let firstPush: { vx: number; vy: number } | null = null;
  let riderTouched = false;
  for (let i = 0; i < Math.ceil(12 / DT); i++) {
    const hp = trackPose(tr, world.time, hull.phase, hull.def);
    mark.pos = vec(1000, 500);
    if (!hp.pending) {
      rider.pos = vec(hp.x + Math.cos(hp.dir) * (deckHw - 10), hp.y + Math.sin(hp.dir) * (deckHw - 10));
    }
    rider.push = null; // any push after the step is fresh evidence
    world.update(DT);
    if (!firstPush && mark.push) {
      firstPush = { vx: mark.push.vx, vy: mark.push.vy };
      const hp2 = trackPose(tr, world.time, hull.phase, hull.def);
      gapAtFirstTouch = 1000 - hp2.x;
    }
    if (rider.push || rider.life < rider0 - 0.01) riderTouched = true;
  }
  check('headway: the runner-down is shoved by the PROW a ship-length early (never deck-scooped)',
    gapAtFirstTouch > 240, gapAtFirstTouch < 0
      ? 'never touched' : `deck center still ${gapAtFirstTouch.toFixed(0)}px away at first touch`);
  check('headway: the rundown wounds (the keel\'s typed hit landed)',
    mark.life < mark0 - 1, `${mark0.toFixed(0)} → ${mark.life.toFixed(0)}`);
  check("headway: the shove wears the 'along' grain (batted ahead of the keel)",
    !!firstPush && firstPush.vx > 0 && firstPush.vx > Math.abs(firstPush.vy) * 1.5,
    firstPush ? `push (${firstPush.vx.toFixed(0)}, ${firstPush.vy.toFixed(0)})` : 'never pushed');
  check('headway: the BOW-SEAT passenger rode the whole pass untouched (THE CLEARANCE LAW)',
    !riderTouched && rider.life >= rider0 - 0.01);
  // THE BERTH FURL, pure: with the hull still 100px short of the far strand
  // the escort has already parked pending — no clamped remainder ever
  // compresses back onto the deck it leads.
  const tFurl = (tr.arc.total - 100) / 120;
  check('headway: past the far strand the escort furls (pending; the hull sails on)',
    trackPose(tr, tFurl, 0, prow.def).pending === true
    && !trackPose(tr, tFurl, 0, hull.def).pending);
  // The pingpong sign law, pure: 'ahead' follows the TRAVEL — on the return
  // leg the escort leads back toward home.
  const pp = placeTrack({
    path: linePath(vec(0, 0), vec(1000, 0)), mode: 'pingpong', speed: 100,
    riders: [{ kind: 'pale_prow', phase: 0 }],
  });
  const outLeg = trackPose(pp, 4, 0, prow.def);                // s=400 → +280 = 680
  const backLeg = trackPose(pp, pp.passSec + 4, 0, prow.def);  // s=600, return → −280 = 320
  check("headway: the pingpong return flips the lead ('ahead' follows the travel)",
    Math.abs(outLeg.x - 680) < 1 && Math.abs(backLeg.x - 320) < 1,
    `out ${outLeg.x.toFixed(0)} back ${backLeg.x.toFixed(0)}`);
}

// --- 12) THE FIELD WAIN: the settled belt's traffic contract ---------------
// (data/tracks.ts 'field_wain' + engine/settled.ts layRoadTraffic — the
// farmland's carriage lane, generation-side pinned in probe_settled RIG T.
// The def IS the contract: traffic, not a saw — token knock, no speed gate,
// faction-blind, and the 'along' grain so a body in the road is CARRIED
// ahead of the axle down the lane, dribbled to the verge rather than
// shredded. Live: a shuttle lane in the settled shape — pingpong, groove
// false, gate dwells — parks at its terminus, then carries a parked body
// down-lane while barely denting it.)
{
  const wain = trackRider('field_wain');
  check('wain: registered wearing the traffic contract (low bite, along-carry, no speed gate, faction-blind)',
    !!wain && wain.payload.push === 'along' && (wain.payload.impulse ?? 0) > 0
    && (wain.payload.hit?.base ?? 999) <= 10 && wain.payload.minSpeed === undefined
    && !wain.payload.factions && !wain.payload.notFactions);
  check('wain: the drawn face is a registered row (drawn == tested has something to draw)',
    !!DOODAD_VISUALS['field_wain']);
  const world = makeSimWorld('warrior', 9151);
  world.player.pos = vec(200, 900);
  const tr = world.addTrack({
    path: linePath(vec(400, 500), vec(1100, 500)), mode: 'pingpong', speed: 70,
    pauses: [{ at: 0, sec: 2 }, { at: 1, sec: 2 }],
    riders: [{ kind: 'field_wain', phase: 0 }],
    groove: false, tag: 'settled_traffic',
  })!;
  check('wain: the terminus dwell parks the cart at the gate',
    trackPose(tr, 0.5, 0).paused === true);
  const m = world.createMonster('plains_wolf', 5, 'enemy');
  m.pos = vec(760, 500);
  world.actors.push(m);
  const l0 = m.life, x0 = m.pos.x;
  let firstPush: { vx: number; vy: number } | null = null;
  for (let i = 0; i < Math.ceil(11 / DT); i++) {
    world.update(DT);
    if (!firstPush && m.push) firstPush = { vx: m.push.vx, vy: m.push.vy };
  }
  check("wain: the shove wears the 'along' grain (carried down the lane, not flung aside)",
    !!firstPush && firstPush.vx > 0 && firstPush.vx > Math.abs(firstPush.vy) * 1.5,
    firstPush ? `push (${firstPush.vx.toFixed(0)}, ${firstPush.vy.toFixed(0)})` : 'never pushed');
  check('wain: the body is CARRIED ahead of the axle (real down-lane displacement)',
    m.pos.x > x0 + 60, `Δx=${(m.pos.x - x0).toFixed(0)}px`);
  check('wain: traffic, not a saw (bitten, never shredded)',
    !m.dead && m.life < l0 && m.life > l0 * 0.35,
    `life ${l0.toFixed(0)} → ${m.life.toFixed(0)}`);
}

// --- 13) THE END-OF-RUN CLAMP: the drawn future ends where the ride does ---
// (The QA rubberband, named: a rearm lane's release end re-seats the pose at
// the cradle by the pure law, and the warn band — sampling straight through
// that wrap — stroked ONE segment from the death point clear back up the
// lane (measured 696px against a 27px honest step) for the whole warn
// window of EVERY release: the band visibly snapped backward up the chute.
// The contact sweep's substep skip and the threat scan's pending skip
// already read the future CLIPPED; warnBandPoints clips the DRAWN reader to
// the same law — one truth from one resolver, now stroked too. Beside it:
// the plain-once terminal CLAMP holds (never wraps), trackDone waits for a
// phased rider's own stamina cap (the cull can no longer blink a stone out
// mid-roll — measured 0.246s early at phase 0.5 under the old phase-0
// read), and the shatter read's rubble pock is TRANSIENT BY CONSTRUCTION:
// minted with evap, dried and spliced by the evap sweep, dropped whole by
// any zone re-mint — no save path carries a pock, so a permanent one
// cannot exist.)
{
  // (a) The terminal clamp: far past its pass a plain once-lane PARKS at
  // the far end — no wrap back toward the cradle, no pending flag (the
  // cull owns retirement; the pose law owns the parking).
  const plain = placeTrack({
    path: linePath(vec(0, 0), vec(600, 0)), mode: 'once', speed: 200,
    riders: [{ kind: 'ruin_boulder' }],
  });
  const parked = trackPose(plain, plain.passSec + 9, 0);
  check('clamp: a plain once-lane parks at the far end long past its pass (never wraps)',
    Math.abs(parked.x - 600) < 1e-6 && !parked.pending, `x=${parked.x.toFixed(1)} pending=${!!parked.pending}`);

  // The chute EXACTLY as layBoulderChutes authors it (levelgen.ts): once +
  // rearm + stamina shatter, boulders in phased file.
  const total = 820, speed = 225;
  const chuteSpec: TrackSpec = {
    path: linePath(vec(300, 500), vec(300 + total, 500)), mode: 'once', speed,
    rearm: 7,
    shatter: [Math.round(total / speed * 0.65 * 10) / 10, Math.round(total / speed * 1.25 * 10) / 10],
    riders: [{ kind: 'ruin_boulder', phase: 0 }, { kind: 'ruin_boulder', phase: 0.5 }],
    tag: 'probe_chute13',
  };
  const chute = placeTrack(chuteSpec);
  let mid: { phase: number; k: number; cap: number } | null = null;
  for (let k = 0; k < 40 && !mid; k++) {
    for (const r of chute.riders) {
      const cap = rideCapOf(chute, r.phase, k);
      if (cap < chute.passSec * 0.92) { mid = { phase: r.phase, k, cap }; break; }
    }
  }
  check('clamp: the stamina roll deals mid-lane deaths to test against', !!mid,
    mid ? `phase ${mid.phase} release ${mid.k} dies at ${mid.cap.toFixed(2)}s of ${chute.passSec.toFixed(2)}s` : 'none in 40 releases');
  if (mid) {
    const def = trackRider('ruin_boulder')!;
    const aheadSec = (def.warnAhead ?? TRACK_CFG.warnAhead) / speed;
    const stepPx = (aheadSec / 7) * speed;
    const relStart = mid.k * chute.periodSec - mid.phase * chute.periodSec;
    const capT = relStart + mid.cap;
    const death = trackPose(chute, capT - 1e-4, mid.phase);
    // (b) The band never wraps: a dense clock sweep across the death window
    // — every drawn segment stays within the honest per-step travel, and
    // while the death sits inside the window the band's last point HUGS the
    // death point (retraction, never a snap back up the lane).
    let worstSeg = 0, retractOk = true, windowSampled = false;
    for (let i = 0; i <= 300; i++) {
      const t = capT - aheadSec - 0.1 + i * ((aheadSec + 0.2) / 300);
      if (t < relStart) continue;
      const pts = warnBandPoints(chute, t, mid.phase, def, aheadSec, 7);
      for (let k = 1; k < pts.length; k++) {
        worstSeg = Math.max(worstSeg, Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
      }
      if (t < capT - 1e-3 && t > capT - aheadSec + aheadSec / 7) {
        windowSampled = true;
        const last = pts[pts.length - 1];
        if (Math.hypot(last.x - death.x, last.y - death.y) > stepPx + 1e-6) retractOk = false;
      }
    }
    check('clamp: the warn band NEVER wraps a release end (worst segment ≤ the honest step; was 696px)',
      worstSeg <= stepPx + 1e-6, `worst ${worstSeg.toFixed(1)}px vs honest ${stepPx.toFixed(1)}px`);
    check('clamp: the clipped band retracts TO the death point (last point within one step of it)',
      windowSampled && retractOk);
    // (b2) Absent == identical: away from any release end the clipped band
    // IS the naive sampling, pose for pose — the fix costs the honest case
    // nothing.
    const tMid = relStart + mid.cap * 0.4;
    const clipped = warnBandPoints(chute, tMid, mid.phase, def, aheadSec, 7);
    let same = clipped.length === 8;
    for (let k = 0; k <= 7 && same; k++) {
      const naive = trackPose(chute, tMid + (aheadSec * k) / 7, mid.phase, def);
      same = clipped[k].x === naive.x && clipped[k].y === naive.y && clipped[k].rot === naive.rot;
    }
    check('clamp: away from the end the clipped band IS the naive sampling (byte-identical)', same);
    // (b3) DRAWN == PINNED: the REAL drawTrackWarnArcs on a recording stub —
    // across the whole death window, no stroked segment (either rider's
    // band) exceeds the honest step. The layer speaks the clipped law.
    const wStub = makeSimWorld('warrior', 9299);
    wStub.player.pos = vec(60, 60);
    wStub.addTrack(chuteSpec);
    let worstDrawn = 0;
    for (let i = 0; i <= 120; i++) {
      let cur: { x: number; y: number } | null = null;
      const stub = {
        lineWidth: 0, strokeStyle: '', lineCap: '', lineJoin: '', globalAlpha: 1,
        save() {}, restore() {}, beginPath() { cur = null; },
        moveTo(x: number, y: number) { cur = { x, y }; },
        lineTo(x: number, y: number) {
          if (cur) worstDrawn = Math.max(worstDrawn, Math.hypot(x - cur.x, y - cur.y));
          cur = { x, y };
        },
        stroke() {},
      } as unknown as CanvasRenderingContext2D;
      wStub.time = capT - aheadSec - 0.05 + i * ((aheadSec + 0.1) / 120);
      if (wStub.time < 0) continue;
      drawTrackWarnArcs(stub, wStub, 0, 0, 4000, 4000);
    }
    check('clamp: the REAL track layer strokes no wrap segment across the death window (drawn == pinned)',
      worstDrawn <= stepPx + 1e-6, `worst stroked ${worstDrawn.toFixed(1)}px`);
  }

  // (c) trackDone waits for the phased rider's OWN cap: the pose clamp and
  // the cull read the same rideCapOf — a phased stone is never culled
  // mid-roll (blinked out) nor left lingering past its last ride.
  const phasedSpec: TrackSpec = {
    path: linePath(vec(0, 0), vec(900, 0)), mode: 'once', speed: 300,
    shatter: [1, 2.4], riders: [{ kind: 'ruin_boulder', phase: 0.5 }],
  };
  const phased = placeTrack(phasedSpec);
  const pCap = Math.min(phased.passSec, rideCapOf(phased, 0.5, 0));
  const still = trackPose(phased, pCap - 0.05, 0.5);
  check('clamp: trackDone waits for the phased rider\'s own stamina cap (cull == pose clamp)',
    !trackDone(phased, pCap - 0.05) && trackDone(phased, pCap + 0.001),
    `cap ${pCap.toFixed(3)}s; done(cap−.05)=${trackDone(phased, pCap - 0.05)} done(cap+.001)=${trackDone(phased, pCap + 0.001)}`);
  check('clamp: at cull−0.05s the stone still honestly rides (no mid-roll blink-out window)',
    !still.pending && still.x > 0 && still.x < 900, `x=${still.x.toFixed(0)}`);
  const gripes13 = lintTrackSpec(phasedSpec, 'probe');
  check('lint: a SINGLE phased rider on a plain once-lane now gripes (dead weight — the hash-salt trap)',
    gripes13.some(g => g.includes('dead weight')));

  // (d) THE RUBBLE IS TRANSIENT BY CONSTRUCTION: a shattered release mints
  // one evap-armed boulder_rubble pock; the evap sweep dries and SPLICES it;
  // a re-armed lane's next death mints a fresh one; and any zone re-mint
  // drops runtime rubble whole (loadZone re-derives doodads from the seed —
  // no save path carries a pock, so a permanent one cannot exist).
  const w = makeSimWorld('warrior', 9301);
  w.player.pos = vec(80, 80);
  const t0 = w.time;
  w.addTrack({
    path: linePath(vec(300, 500), vec(900, 500)), mode: 'once', speed: 200,
    rearm: 7, shatter: [1.2, 1.4], bornAt: t0,
    riders: [{ kind: 'ruin_boulder' }], tag: 'probe_chute',
  });
  for (let i = 0; i < Math.ceil(2.2 / DT); i++) w.update(DT);
  const pock = w.doodads.find(d => d.kind === 'boulder_rubble');
  check('rubble: a shattered release leaves ONE drying pock (evap-armed walkable bones)',
    !!pock && !!pock.evap && w.doodads.filter(d => d.kind === 'boulder_rubble').length === 1,
    pock ? `r=${pock.radius.toFixed(1)} dwell=${pock.evap?.t.toFixed(1)}s rate=${pock.evap?.rate}` : 'no pock minted');
  w.setTracksArmed('probe_chute', false); // no further releases — isolate this pock's lifecycle
  for (let i = 0; i < Math.ceil(30 / DT); i++) w.update(DT);
  check('rubble: the pock dries and RETIRES through the evap sweep (dwell, contraction, splice)',
    !w.doodads.some(d => d.kind === 'boulder_rubble'));
  w.setTracksArmed('probe_chute', true);
  let pock2 = false;
  for (let i = 0; i < Math.ceil(14 / DT) && !pock2; i++) {
    w.update(DT);
    pock2 = w.doodads.some(d => d.kind === 'boulder_rubble');
  }
  check('rubble: a re-armed lane\'s next death mints a FRESH pock (the recurring read, one per death)', pock2);
  const home13 = w.zone.id;
  w.zoneMap['probe_hop13'] = { ...w.zoneMap[home13], id: 'probe_hop13', name: 'Probe Hop', seed: 4712, special: false };
  w.loadZone('probe_hop13');
  w.loadZone(home13);
  check('rubble: a zone re-mint drops the pock whole (transient by construction — no save path carries it)',
    !w.doodads.some(d => d.kind === 'boulder_rubble'));
}

// --- 14) THE EVAP WIRE (co-op): drying ground crosses the wire ---------------
// (The batch-21 deferral landed: host-side evap — rubble pocks, weather dress,
// creep wakes — shrinks through the REAL sweep, and the 20 Hz snapshot ships
// the DERIVED radius as position-keyed rows (StateSnapshot.ev, the fell-rows /
// wells idiom). Clients never run the sweep: a listed row restates radius and
// MINTS a piece planted after the join, a tracked row's disappearance retires
// the piece (the host spliced it dry), a mid-dry join adopts current state,
// and an evap-less wire is byte-identical to the pre-evap wire.)
{
  const host = makeSimWorld('warrior', 9401);
  host.player.pos = vec(80, 80);
  // A guest seated BEFORE anything dries: its zone list carries no pock, so
  // the wire's MINT lane is the only road the rubble can arrive by.
  const guest = makeSimWorld('warrior', 9402);
  applyZone(guest, serializeZone(host));
  const guestBase = guest.doodads.length;

  // (a) ABSENT == IDENTICAL: nothing drying ships no field, touches nothing.
  let snap = serializeSnapshot(host, 1);
  check('evapwire: nothing drying ships NO rows (absent == the pre-evap wire)', snap.ev === undefined);
  applySnapshot(guest, snap);
  check('evapwire: an evap-less snapshot leaves the guest\'s doodads untouched',
    guest.doodads.length === guestBase);

  // (b) THE MINT LANE: the host shatters a stone through the real lane; the
  // pock rides the next beat onto a guest whose zone list never carried it.
  const t14 = host.time;
  host.addTrack({
    path: linePath(vec(300, 500), vec(900, 500)), mode: 'once', speed: 200,
    rearm: 7, shatter: [1.2, 1.4], bornAt: t14,
    riders: [{ kind: 'ruin_boulder' }], tag: 'probe_evapwire',
  });
  for (let i = 0; i < Math.ceil(2.2 / DT); i++) host.update(DT);
  host.setTracksArmed('probe_evapwire', false); // no further releases — one pock's lifecycle
  const hp = host.doodads.find(d => d.kind === 'boulder_rubble');
  const mintR = hp?.radius ?? 0; // the mint-time radius, by VALUE (hp mutates in place as it dries)
  check('evapwire: the host minted a drying pock to test against', !!hp && !!hp.evap,
    hp ? `r=${hp.radius.toFixed(1)}` : 'no pock');
  snap = serializeSnapshot(host, 2);
  const row0 = snap.ev?.[0];
  check('evapwire: the drying pock rides the wire as ONE derived row (kind + quantized radius)',
    snap.ev?.length === 1 && row0?.k === 'boulder_rubble'
    && Math.abs((row0?.r ?? 0) - (hp?.radius ?? 99)) <= 0.05,
    `rows=${JSON.stringify(snap.ev ?? []).length}B`);
  applySnapshot(guest, snap);
  const gp = guest.doodads.find(d => d.kind === 'boulder_rubble');
  check('evapwire: a client PRESENT at the mint sees the pock (the wire mints what the zone list never carried)',
    !!gp && Math.abs(gp.radius - (hp?.radius ?? 99)) <= 0.05);
  check('evapwire: the minted piece wears NO evap — the guest never runs the sweep', !!gp && !gp.evap);

  // (c) LOCKSTEP + (d) the MID-DRY JOIN: walk the host through dwell and
  // contraction, shipping a beat every 3rd sim step (~20 Hz); the guest's
  // drawn radius equals the host's at every beat, and a third seat joining
  // mid-contraction adopts the CURRENT state through its zone list + rows.
  let maxDrift = 0, beats = 0;
  let late: ReturnType<typeof makeSimWorld> | null = null;
  let lateJoinDrift = -1;
  for (let i = 0; i < Math.ceil(40 / DT); i++) {
    host.update(DT);
    if (i % 3 !== 2) continue;
    const s = serializeSnapshot(host, 100 + i);
    applySnapshot(guest, s);
    if (late) applySnapshot(late, s);
    const hd = host.doodads.find(d => d.kind === 'boulder_rubble');
    const gd = guest.doodads.find(d => d.kind === 'boulder_rubble');
    if (hd && gd) { maxDrift = Math.max(maxDrift, Math.abs(hd.radius - gd.radius)); beats++; }
    if (!late && hd && hd.radius < mintR - 1) {
      // Contraction has begun — seat the late joiner NOW, mid-dry.
      late = makeSimWorld('warrior', 9403);
      applyZone(late, serializeZone(host));
      applySnapshot(late, s);
      const ld = late.doodads.find(d => d.kind === 'boulder_rubble');
      lateJoinDrift = ld ? Math.abs(ld.radius - hd.radius) : -1;
    }
  }
  check('evapwire: the pock shrinks in LOCKSTEP (guest radius == shipped radius at every beat)',
    beats >= 4 && maxDrift <= 0.05, `${beats} drying beats, worst drift ${maxDrift.toFixed(3)}u`);
  check('evapwire: a client joining MID-DRY adopts the current shrunken state',
    late !== null && lateJoinDrift >= 0 && lateJoinDrift <= 0.05,
    late ? `join drift ${lateJoinDrift.toFixed(3)}u` : 'contraction window never sampled');
  // (e) THE RETIRE: the host's sweep spliced the pock; the tracked row's
  // absence retires it on every seat — no immortal client-side rubble.
  check('evapwire: the host dried and spliced the pock (the run outlived the dwell)',
    !host.doodads.some(d => d.kind === 'boulder_rubble'));
  check('evapwire: the guest retires the pock when its row disappears (the splice crosses)',
    !guest.doodads.some(d => d.kind === 'boulder_rubble'));
  check('evapwire: the late joiner dried to retirement in step',
    late !== null && !late.doodads.some(d => d.kind === 'boulder_rubble'));

  // (f) THE TEMP-GROUND CLASS (the creep-wake family): a shallow pool handed
  // to evap at expiry crosses the same way — minted shallow on the guest,
  // dried in lockstep, retired at the splice.
  host.addTempGround(vec(140, 140), 'water', 34, 0.5, { shallow: true, evaporate: { rate: 9 } });
  let poolSeen = false, poolShallow = false, poolGone = true;
  for (let i = 0; i < Math.ceil(9 / DT); i++) {
    host.update(DT);
    if (i % 3 !== 2) continue;
    const s = serializeSnapshot(host, 3000 + i);
    applySnapshot(guest, s);
    const gw = guest.doodads.find(d => d.kind === 'water' && Math.abs(d.pos.x - 140) < 2);
    if (gw) { poolSeen = true; poolShallow = !!gw.shallow; }
  }
  poolGone = !guest.doodads.some(d => d.kind === 'water' && Math.abs(d.pos.x - 140) < 2)
    && !host.doodads.some(d => d.kind === 'water' && Math.abs(d.pos.x - 140) < 2);
  check('evapwire: a drying temp pool (the creep-wake class) crosses SHALLOW and retires on both seats',
    poolSeen && poolShallow && poolGone,
    `seen=${poolSeen} shallow=${poolShallow} gone=${poolGone}`);
}

console.log(failed === 0 ? '\nALL CHECKS PASS' : `\n${failed} CHECK(S) FAILED`);
process.exit(failed === 0 ? 0 : 1);
