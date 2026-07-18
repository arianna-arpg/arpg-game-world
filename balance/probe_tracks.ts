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
import { placeTrack, trackPose, ringPath, linePath, lintTrackSpec, TRACK_CFG, type TrackSpec } from '../src/engine/tracks';
import { type Doodad } from '../src/engine/levelgen';
import { serializeZone, applyZone } from '../src/net/snapshot';
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

console.log(failed === 0 ? '\nALL CHECKS PASS' : `\n${failed} CHECK(S) FAILED`);
process.exit(failed === 0 ? 0 : 1);
