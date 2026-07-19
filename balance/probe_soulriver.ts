// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE RIVER OF SOULS end to end (docs/engine/soulriver.md):
// the foreordained PLAN's laws (pure function of seed+size; stations at the
// meander apexes; the country deal), the SEAT's laws (hashed off the gate,
// catch basin), THE PALE FERRY's lane on the pure resolver (dock pauses,
// the once+rearm journey cycle, the dissolved rest window, arc-fraction for
// the ephemeral tail), THE DECK LAW live on the real engine (bodies carried
// by the rigid step, deck-local seats preserved through bends, the paused
// deck moving nothing, airborne bodies spared, byte-determinism of carried
// positions across same-seed worlds), the DOCKIFY hook (exits rewritten to
// the plan, promised tilesets resolving, real edges kept), and the creep
// fabric's NEW flow.channel window (the soul current follows its own WATER
// between fully open banks; confinement and the undertow drag read the
// same window; the riverbound ride free).
// Run: npx tsx balance/probe_soulriver.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { Rng } from '../src/core/rng';
import { vec } from '../src/core/math';
import {
  ferryLaneFor, nearRiverSeat, riverSeat, soulriverPlan, SOULRIVER_CFG,
} from '../src/world/soulriver';
import {
  lintTrackSpec, placeTrack, riderSurface, trackArcFrac, trackPose, trackRider,
} from '../src/engine/tracks';
import { CreepField, CREEPS, type CreepActorLike, type CreepTerrain } from '../src/engine/creep';
import { TILESETS } from '../src/data/tilesets';
import { MONSTERS } from '../src/data/monsters';
import { shapeContains } from '../src/engine/shapes';
import type { ZoneDef, ZoneExitDef } from '../src/data/zones';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x50f7);

const DT = 1 / 60;
const PALETTE = ['grave', 'rift', 'volcanic', 'steppes', 'flesh', 'caul', 'durance'];

// --- 0) THE PLAN: one pure truth ------------------------------------------
{
  const a = soulriverPlan(1234, 4800, 3000, PALETTE);
  const b = soulriverPlan(1234, 4800, 3000, PALETTE);
  check('plan: pure — same seed+size deal the identical river',
    JSON.stringify(a) === JSON.stringify(b));
  const c = soulriverPlan(1235, 4800, 3000, PALETTE);
  check('plan: seeded — a different seed bends a different course',
    JSON.stringify(a.channel) !== JSON.stringify(c.channel));

  const cfg = SOULRIVER_CFG.plan;
  const wantDocks = 2 + Math.floor(cfg.waves * 2);
  check(`plan: stations — headwater + ${Math.floor(cfg.waves * 2)} apexes + terminus = ${wantDocks} docks`,
    a.docks.length === wantDocks, `${a.docks.length}`);
  check('plan: the headwater boards on the west edge, the terminus on the east',
    a.docks[0].side === 'w' && a.docks[a.docks.length - 1].side === 'e');
  const apexSides = a.docks.slice(1, -1).map(d => d.side).join('');
  check('plan: apex docks alternate south/north down the serpentine',
    apexSides === 'snsns', apexSides);
  check('plan: every pier sits ON the channel centerline (pier == channel[chIdx])',
    a.docks.every(d => {
      const p = a.channel[d.chIdx];
      return p && Math.hypot(p.x - d.pier.x, p.y - d.pier.y) < 1e-6;
    }));
  check('plan: exit fractions stay inside the edge (0.06..0.94)',
    a.docks.every(d => d.at >= 0.06 && d.at <= 0.94));
  check('plan: channel respects the margins',
    a.channel.every(p => p.x > cfg.margin - 60 && p.x < 4800 - cfg.margin + 60
      && p.y > 120 && p.y < 3000 - 120));
  check('plan: half-width inside the authored band',
    a.halfW >= cfg.width[0] / 2 && a.halfW <= cfg.width[1] / 2, `${a.halfW.toFixed(1)}`);
  const dealt = [...a.docks.map(d => d.biome)].sort().join(',');
  check('plan: the country deal is a permutation of the realm palette',
    dealt === [...PALETTE].sort().join(','), dealt);
}

// --- 1) THE SEAT: where the river runs ------------------------------------
{
  const gate = { x: 40, y: -60 };
  const s1 = riverSeat(gate, 0xabcd);
  const s2 = riverSeat(gate, 0xabcd);
  check('seat: pure — one seed, one seat', s1.x === s2.x && s1.y === s2.y);
  const d = Math.hypot(s1.x - gate.x, s1.y - gate.y);
  const [d0, d1] = SOULRIVER_CFG.seat.dist;
  check('seat: hangs the authored reach off the gate', d >= d0 && d <= d1, `${d.toFixed(0)}nu`);
  check('seat: the catch basin owns its center', nearRiverSeat(s1, gate, 0xabcd));
  const far = { x: s1.x + SOULRIVER_CFG.seat.catch + 8, y: s1.y };
  check('seat: a step past the basin misses', !nearRiverSeat(far, gate, 0xabcd));
  const s3 = riverSeat(gate, 0xabce);
  check('seat: another world seeds another shore', s3.x !== s1.x || s3.y !== s1.y);
}

// --- 2) THE FERRY LANE on the pure resolver --------------------------------
{
  const plan = soulriverPlan(777, 4800, 3000, PALETTE);
  const spec = ferryLaneFor(plan);
  const gripes = lintTrackSpec(spec, 'ferry');
  check('lane: lint-clean (speed/pauses/rearm/riders all inside the bands)',
    gripes.length === 0, gripes.join('; '));
  check('lane: a pause at every pier', spec.pauses!.length === plan.docks.length);
  check(`lane: ${SOULRIVER_CFG.ferry.count} ferries share the lane a phase apart`,
    spec.riders.length === SOULRIVER_CFG.ferry.count
    && spec.riders.every(r => trackRider(r.kind)?.carry === true));
  const tr = placeTrack(spec);
  const pauseSum = spec.pauses!.reduce((s, p) => s + p.sec, 0);
  check('lane: pass = travel + every dock dwell',
    Math.abs(tr.passSec - (tr.arc.total / spec.speed + pauseSum)) < 1e-6,
    `${tr.passSec.toFixed(1)}s`);
  check('lane: the cycle adds the cradle rest (once+rearm)',
    Math.abs(tr.periodSec - (tr.passSec + SOULRIVER_CFG.ferry.restSec)) < 1e-6);
  // The journey: sailing mid-pass, parked at a pier at its pause window,
  // DISSOLVED (pending) in the rest window, reborn next cycle.
  const mid = trackPose(tr, tr.passSec * 0.4, 0);
  check('lane: mid-journey the ferry sails (not pending)', !mid.pending);
  const rest = trackPose(tr, tr.passSec + SOULRIVER_CFG.ferry.restSec * 0.5, 0);
  check('lane: the rest window wears the cradle (pending — the dissolved read)',
    rest.pending === true);
  const again = trackPose(tr, tr.periodSec + tr.passSec * 0.4, 0);
  check('lane: the next cycle repeats the exact pose (pure clock, forever)',
    Math.abs(again.x - mid.x) < 1e-6 && Math.abs(again.y - mid.y) < 1e-6);
  // Arc fraction: holds at a pier, nears 1 at the strand, null while resting.
  const f0 = trackArcFrac(tr, 1.0, 0); // inside the boarding hold at the head
  check('frac: the boarding hold reads 0 (parked at the head)', f0 !== null && f0 < 1e-6);
  const fRest = trackArcFrac(tr, tr.passSec + 2, 0);
  check('frac: the rest window reads null (no ferry abroad)', fRest === null);
  const fEnd = trackArcFrac(tr, tr.passSec - spec.pauses![spec.pauses!.length - 1].sec - 0.4, 0);
  check('frac: the last reach reads near 1 (the ephemeral tail\'s window)',
    fEnd !== null && fEnd > 1 - SOULRIVER_CFG.ferry.fadeTail, `${fEnd?.toFixed(3)}`);
  const p0 = trackPose(tr, tr.passSec * 0.4, 0);
  const p1 = trackPose(tr, tr.passSec * 0.4, 1 / SOULRIVER_CFG.ferry.count);
  check('lane: the second ferry rides its own leg (phase offset is real)',
    Math.hypot(p0.x - p1.x, p0.y - p1.y) > 100);
}

// --- 3) THE DECK LAW: carried bodies, live --------------------------------
{
  const world = makeSimWorld('warrior', 9101);
  const p = world.player;
  // A slow shuttle with a long boarding pause — the probe's pocket ferry.
  const tr = world.addTrack({
    path: [vec(300, 600), vec(900, 600), vec(900, 900)],
    mode: 'pingpong', speed: 120,
    pauses: [{ at: 0, sec: 1 }],
    riders: [{ kind: 'pale_ferry', phase: 0 }],
    groove: true,
  })!;
  const rider = tr.riders[0];
  // Board during the pause: stand a deck-local seat off-center.
  p.pos = vec(300 + 20, 600 - 10);
  const seat0 = { x: 20, y: -10 };
  // The paused deck moves nothing.
  const before = { x: p.pos.x, y: p.pos.y };
  for (let i = 0; i < 30; i++) world.update(DT);
  check('deck: a paused deck moves nobody',
    Math.abs(p.pos.x - before.x) < 0.5 && Math.abs(p.pos.y - before.y) < 0.5,
    `drift ${(Math.hypot(p.pos.x - before.x, p.pos.y - before.y)).toFixed(2)}px`);
  // Sail: the passenger rides, keeping the deck-local seat.
  for (let i = 0; i < 60 * 4; i++) world.update(DT);
  const pose = trackPose(tr, world.time, rider.phase, rider.def);
  const cos = Math.cos(pose.rot), sin = Math.sin(pose.rot);
  const lx = cos * (p.pos.x - pose.x) + sin * (p.pos.y - pose.y);
  const ly = -sin * (p.pos.x - pose.x) + cos * (p.pos.y - pose.y);
  check('deck: the passenger RODE (carried well away from the boarding shore)',
    Math.hypot(p.pos.x - 320, p.pos.y - 590) > 200,
    `at (${p.pos.x.toFixed(0)}, ${p.pos.y.toFixed(0)})`);
  check('deck: the deck-local seat held through the ride (rigid step)',
    Math.abs(lx - seat0.x) < 1.5 && Math.abs(ly - seat0.y) < 1.5,
    `seat (${lx.toFixed(2)}, ${ly.toFixed(2)}) vs (${seat0.x}, ${seat0.y})`);
  check('deck: still honestly ON the boards (drawn == tested == carried)',
    shapeContains(riderSurface(rider.def, pose), pose.x, pose.y, p.pos.x, p.pos.y, 0));
  // The corner: ride through the bend — the seat swings with the bow.
  for (let i = 0; i < 60 * 4; i++) world.update(DT);
  const poseB = trackPose(tr, world.time, rider.phase, rider.def);
  const cosB = Math.cos(poseB.rot), sinB = Math.sin(poseB.rot);
  const lxB = cosB * (p.pos.x - poseB.x) + sinB * (p.pos.y - poseB.y);
  const lyB = -sinB * (p.pos.x - poseB.x) + cosB * (p.pos.y - poseB.y);
  check('deck: the seat survived the BEND (swung with the bow, not smeared)',
    Math.abs(lxB - seat0.x) < 1.5 && Math.abs(lyB - seat0.y) < 1.5,
    `seat (${lxB.toFixed(2)}, ${lyB.toFixed(2)})`);
  // Overboard: a body off the boards is left behind.
  const shorePos = vec(poseB.x + 300, poseB.y + 300);
  p.pos = vec(shorePos.x, shorePos.y);
  for (let i = 0; i < 30; i++) world.update(DT);
  check('deck: a body off the boards keeps its own footing',
    Math.hypot(p.pos.x - shorePos.x, p.pos.y - shorePos.y) < 0.5);
  // The airborne spare: a body ALOFT over the deck hovers free. (Actor.flying
  // is stamped from flight statuses each frame — the probe grants the real
  // 'aloft' status rather than fighting the status system's pen.)
  const poseC = trackPose(tr, world.time, rider.phase, rider.def);
  p.pos = vec(poseC.x, poseC.y);
  p.applyStatus('aloft', 0, 3, 'the probe');
  const hover = { x: p.pos.x, y: p.pos.y };
  for (let i = 0; i < 20; i++) world.update(DT);
  check('deck: an ALOFT body above the boards is never dragged',
    Math.abs(p.pos.x - hover.x) < 0.5 && Math.abs(p.pos.y - hover.y) < 0.5,
    `drift ${(Math.hypot(p.pos.x - hover.x, p.pos.y - hover.y)).toFixed(2)}px`);
}

// --- 4) DETERMINISM: carried positions byte-equal across worlds ------------
{
  const rig = (): { w: ReturnType<typeof makeSimWorld>; trIdx: number } => {
    const w = makeSimWorld('warrior', 9102);
    w.addTrack({
      path: [vec(300, 500), vec(1200, 500)], mode: 'pingpong', speed: 100,
      riders: [{ kind: 'pale_ferry', phase: 0 }], groove: true,
    });
    w.player.pos = vec(300, 500);
    return { w, trIdx: w.tracks.length - 1 };
  };
  const A = rig(), B = rig();
  let maxD = 0;
  for (let i = 0; i < 600; i++) {
    A.w.update(DT); B.w.update(DT);
    maxD = Math.max(maxD,
      Math.abs(A.w.player.pos.x - B.w.player.pos.x),
      Math.abs(A.w.player.pos.y - B.w.player.pos.y));
  }
  check('determinism: two same-seed worlds carry the passenger byte-equal for 10s',
    maxD === 0, `maxΔ=${maxD}`);
}

// --- 5) THE DOCKIFY: exits rewritten to the plan ---------------------------
{
  const world = makeSimWorld('warrior', 9103);
  const back: ZoneExitDef = { to: 'uw_shore_1', side: 'w', at: 0.22 };
  const def = {
    id: SOULRIVER_CFG.zoneId, name: 'The River of Souls', level: 14,
    seed: 5150, size: { w: 4800, h: 3000 }, map: { x: 0, y: 0 },
    dimension: 'underworld',
    exits: [back, { to: '?', side: 'n', at: 0.5 }],
    layoutParams: {},
  } as unknown as ZoneDef;
  (world as unknown as { soulriverifyZone(d: ZoneDef): void }).soulriverifyZone(def);
  const palette = (def.layoutParams as { dockBiomes?: string[] }).dockBiomes ?? [];
  check('dockify: the country deal is stamped for the layout to read',
    palette.length > 0 && palette.every(b => typeof b === 'string'));
  const plan = soulriverPlan(5150, 4800, 3000, palette);
  const reals = def.exits.filter(x => x.to !== '?');
  check('dockify: the discovery shore (real edge) is kept untouched',
    reals.length === 1 && reals[0].to === 'uw_shore_1');
  const docksOut = def.exits.filter(x => x.to === '?');
  check('dockify: one frontier per station', docksOut.length === plan.docks.length,
    `${docksOut.length} vs ${plan.docks.length}`);
  check('dockify: sides follow the plan',
    docksOut.every((x, i) => x.side === plan.docks[i].side));
  const promised = docksOut.filter(x => x.tileset && TILESETS[x.tileset]);
  check('dockify: promised tilesets resolve in the registry',
    promised.length >= Math.floor(plan.docks.length * 0.7),
    `${promised.length}/${docksOut.length} promised`);
}

// --- 6) THE CHANNEL WINDOW: the current follows its own water --------------
{
  // An L-shaped RIBBON of soul_water across fully OPEN country — the old
  // wall-following bore would run straight; the channel row must turn.
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

  // Confinement + the undertow read the same window: a body IN the water is
  // dragged downstream; a body on the open bank beside it is untouched; the
  // riverbound swim free.
  const f2 = new CreepField(new Rng(22), 1500, 1000);
  const drags = new Map<CreepActorLike, number>();
  const terrain2: CreepTerrain = {
    ...terrain,
    drag: (a, dx) => { drags.set(a, (drags.get(a) ?? 0) + dx); },
  };
  f2.setTerrain(terrain2);
  const straight = (x: number, y: number): boolean => Math.abs(y - 500) <= 90 && x >= 100 && x <= 1400;
  (terrain2 as { groundKindAt(x: number, y: number): string | null }).groundKindAt =
    (x, y) => (straight(x, y) ? 'soul_water' : null);
  const src2 = f2.addFront(CREEPS['soul_current'], 150, 500, 0, { reach: 70, bornFrac: 1 })!;
  const body = (x: number, y: number, faction?: string): CreepActorLike =>
    ({ pos: vec(x, y), radius: 12, dead: false, faction, applyStatus: () => {} } as unknown as CreepActorLike);
  const swimmer = body(360, 500);
  const banker = body(360, 720);
  const kin = body(360, 480, 'riverbound');
  for (let i = 0; i < 60 * 4 && f2.sources.includes(src2); i++) {
    f2.update(DT, i * DT, [swimmer, banker, kin]);
    // Hold the bodies in place — we are measuring the ASK, not the ride.
    swimmer.pos.x = 360; banker.pos.x = 360; kin.pos.x = 360;
  }
  check('undertow: a body in the water is asked DOWNSTREAM',
    (drags.get(swimmer) ?? 0) > 0, `Σdx=${(drags.get(swimmer) ?? 0).toFixed(0)}`);
  check('undertow: the open bank beside the water is never gripped (confine)',
    (drags.get(banker) ?? 0) === 0);
  check('undertow: the riverbound ride their own current free',
    (drags.get(kin) ?? 0) === 0);
}

// --- 7) CONTENT LAWS: the kit stands whole --------------------------------
{
  const ferry = trackRider('pale_ferry');
  check('kit: the Pale Ferry rider is registered, a carrier, and harmless',
    !!ferry && ferry.carry === true && !ferry.payload.hit && !ferry.payload.impulse);
  const cfgDeck = SOULRIVER_CFG.ferry.deck;
  check('kit: deck config == rider surface (the agreement contract)',
    ferry?.surface.kind === 'rect' && ferry.surface.hw === cfgDeck.hw && ferry.surface.hh === cfgDeck.hh);
  check('kit: the riverbound stand in the roster',
    ['lorn_shade', 'drowned_hauler', 'soul_wellspring', 'soul_mote', 'farshore_warden']
      .every(id => !!MONSTERS[id]));
  check('kit: the mote is lite + one ply (the wading-through law)',
    !!MONSTERS['soul_mote']?.lite && MONSTERS['soul_mote']?.plies?.count === 1);
  check('kit: the wellspring anchors the mote colony',
    MONSTERS['soul_wellspring']?.colony?.monsterId === 'soul_mote');
  check('kit: the current is registered with its channel window',
    CREEPS['soul_current']?.front?.flow?.channel?.includes('soul_water') === true);
  check('kit: the river tileset stands (frontier-locked, perf-probed)',
    TILESETS['river_of_souls']?.frontier === false && TILESETS['river_of_souls']?.perfProbe === true);
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
