// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE RIVER OF SOULS end to end (docs/engine/soulriver.md),
// PASS TWO (the inversion): the foreordained PLAN's laws (pure function of
// seed+size; dock islets at the meander apexes; the country deal; STRAND-
// ISLETS clear of the sailing lane), the SOULWAY course seat (midpoint node,
// corridor funnel), the PORT coordinates (spread along the ribbon), THE
// SOUL-SHIP's lane on the pure resolver (dock pauses, the once+rearm journey
// cycle, arc-fraction for the ephemeral tail), THE DECK LAW live on the real
// engine (a near-landmass deck carrying bodies rigidly through bends, byte-
// determinism of carried positions), THE BOARDS SHIELD + THE SOUL TETHER
// (grid soul-water drains the survival meter; the deck suspends the ground
// beneath — no wading, no drain, on a paused OR sailing deck), the PORTS
// mint (veiled spread destinations, real edges, the searoute chain), and
// the creep fabric's flow.channel window (the current follows its own WATER
// between open banks; confined undertow; the riverbound waived).
// Run: npx tsx balance/probe_soulriver.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { Rng } from '../src/core/rng';
import { vec } from '../src/core/math';
import {
  dockDestCoords, ferryLaneFor, nearRiverSeat, riverSeat, soulriverPlan,
  SOULRIVER_CFG, SOULWAY_COURSE,
} from '../src/world/soulriver';
import { coursePolyline } from '../src/world/courses';
import {
  lintTrackSpec, placeTrack, riderSurface, trackArcFrac, trackPose, trackRider,
} from '../src/engine/tracks';
import { CreepField, CREEPS, type CreepActorLike, type CreepTerrain } from '../src/engine/creep';
import { GridWalkField } from '../src/world/gridWalk';
import { SURVIVAL_RESOURCES, regionKind } from '../src/world/regions';
import { TILESETS } from '../src/data/tilesets';
import { MONSTERS } from '../src/data/monsters';
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
  check(`plan: stations — headwater + ${Math.floor(cfg.waves * 2)} apexes + terminus = ${wantDocks} dock islets`,
    a.docks.length === wantDocks, `${a.docks.length}`);
  check('plan: the headwater boards on the west edge, the terminus on the east',
    a.docks[0].side === 'w' && a.docks[a.docks.length - 1].side === 'e');
  const apexSides = a.docks.slice(1, -1).map(d => d.side).join('');
  check('plan: apex docks alternate south/north down the sweep',
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
  check('plan: dock islet radii inside the authored band',
    a.docks.every(d => d.outcropR >= cfg.outcropR[0] && d.outcropR <= cfg.outcropR[1]));
  const dealt = [...a.docks.map(d => d.biome)].sort().join(',');
  check('plan: the country deal is a permutation of the realm palette',
    dealt === [...PALETTE].sort().join(','), dealt);
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
  check('plan: islets keep clear of the dock islets too',
    a.islets.every(s => a.docks.every(d => Math.hypot(s.x - d.pos.x, s.y - d.pos.y) >= d.outcropR + s.r + 60)));
}

// --- 1) THE SEAT + THE CORRIDOR (the soulway on the hell map) --------------
{
  const gate = { x: 40, y: -60 };
  const seed = 0xabcd;
  const s1 = riverSeat(gate, seed);
  const s2 = riverSeat(gate, seed);
  check('seat: pure — one seed, one seat', s1.x === s2.x && s1.y === s2.y);
  const pts = coursePolyline(SOULWAY_COURSE, gate, seed);
  const mid = pts[Math.floor(pts.length / 2)];
  check('seat: the node sits at the soulway\'s midpoint (the sea\'s heart)',
    s1.x === mid.x && s1.y === mid.y);
  check('corridor: every point ON the ribbon funnels to the river',
    pts.every(p => nearRiverSeat(p, gate, seed)));
  const off = pts[Math.floor(pts.length / 3)];
  const far = { x: off.x, y: off.y + SOULWAY_COURSE.halfWidth * 3 + 60 };
  check('corridor: a coord well off the ribbon misses', !nearRiverSeat(far, gate, seed));
  // THE PORTS: spread along the ribbon, never stacked.
  const coords = dockDestCoords(gate, seed, 7);
  check('ports: seven spread coordinates', coords.length === 7);
  let minSep = Infinity;
  for (let i = 0; i < coords.length; i++) {
    for (let j = i + 1; j < coords.length; j++) {
      minSep = Math.min(minSep, Math.hypot(coords[i].x - coords[j].x, coords[i].y - coords[j].y));
    }
  }
  check('ports: pairwise separation is real geography (≥ 60 node-units)',
    minSep >= 60, `min ${minSep.toFixed(0)}`);
}

// --- 2) THE SHIP'S LANE on the pure resolver --------------------------------
{
  const plan = soulriverPlan(777, 4900, 4400, PALETTE);
  const spec = ferryLaneFor(plan);
  const gripes = lintTrackSpec(spec, 'ferry');
  check('lane: lint-clean (speed/pauses/rearm/riders all inside the bands)',
    gripes.length === 0, gripes.join('; '));
  check('lane: a pause at every pier', spec.pauses!.length === plan.docks.length);
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
  const mid = trackPose(tr, tr.passSec * 0.4, 0);
  check('lane: mid-journey the ship sails (not pending)', !mid.pending);
  const rest = trackPose(tr, tr.passSec + SOULRIVER_CFG.ferry.restSec * 0.5, 0);
  check('lane: the rest window wears the cradle (pending — the dissolved read)',
    rest.pending === true);
  const again = trackPose(tr, tr.periodSec + tr.passSec * 0.4, 0);
  check('lane: the next cycle repeats the exact pose (pure clock, forever)',
    Math.abs(again.x - mid.x) < 1e-6 && Math.abs(again.y - mid.y) < 1e-6);
  const fEnd = trackArcFrac(tr, tr.passSec - spec.pauses![spec.pauses!.length - 1].sec - 0.4, 0);
  check('frac: the last reach reads near 1 (the ephemeral tail\'s window)',
    fEnd !== null && fEnd > 1 - SOULRIVER_CFG.ferry.fadeTail, `${fEnd?.toFixed(3)}`);
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
  // Board during the pause at a FAR deck-local seat — the melee line's
  // corner post, a full agency stroll from center.
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

// --- 4) THE SOUL TETHER + THE BOARDS SHIELD, live ---------------------------
{
  check('tether: the soul survival row stands (the light-bar fabric, repurposed)',
    !!SURVIVAL_RESOURCES.soul && SURVIVAL_RESOURCES.soul.underflowPctLifePerSec > 0);
  check('tether: soul-water names the drain (region → survival row)',
    regionKind('soul_water')?.survival?.resource === 'soul');
  check('tether: soul-water is the LIVING water (animate \'souls\')',
    regionKind('soul_water')?.visual?.animate === 'souls');

  const world = makeSimWorld('warrior', 9104);
  const p = world.player;
  // Pour a pocket sea into the arena's grid (the recipe's own pour, in
  // miniature): everything in [200..1400]×[300..900] is the pale water.
  const wf = new GridWalkField(1600, 1200, 30);
  wf.fillRegion(0, 0, 1600, 1200, 'ground');
  wf.fillRegion(200, 300, 1400, 900, 'soul_water');
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
  // Ashore: the tether breathes back.
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

// --- 6) THE PORTS MINT: spread veiled destinations, real edges, the lane ---
{
  const world = makeSimWorld('warrior', 9103);
  const gate = { x: 10, y: 10 };
  const river = {
    id: SOULRIVER_CFG.zoneId, name: 'The River of Souls', level: 14,
    seed: 5150, size: { w: 4900, h: 4400 }, map: riverSeat(gate, world.sim.biomeField.fieldSeed),
    dimension: 'underworld',
    exits: [{ to: 'uw_shore_1', side: 'w', at: 0.22 }],
    layoutParams: {},
  } as unknown as ZoneDef;
  world.zoneMap[river.id] = river;
  (world as unknown as { soulriverPorts(r: ZoneDef, g: { x: number; y: number }): void })
    .soulriverPorts(river, gate);
  const palette = (river.layoutParams as { dockBiomes?: string[] }).dockBiomes ?? [];
  check('ports: the country deal is stamped for the layout to read', palette.length > 0);
  const plan = soulriverPlan(5150, 4900, 4400, palette);
  const reals = river.exits.filter(x => x.to !== '?' && !x.to.startsWith('soul_dock_'));
  check('ports: the discovery shore (real edge) is kept untouched',
    reals.length === 1 && reals[0].to === 'uw_shore_1');
  const dockExits = river.exits.filter(x => x.to.startsWith('soul_dock_'));
  check('ports: one REAL edge per station (no frontiers left)',
    dockExits.length === plan.docks.length && river.exits.every(x => x.to !== '?'),
    `${dockExits.length} vs ${plan.docks.length}`);
  const dests = plan.docks.map(d => world.zoneMap[`soul_dock_${d.i}`]).filter(Boolean);
  check('ports: every destination MINTED on the map', dests.length === plan.docks.length);
  check('ports: destinations mint VEILED (revealed as found)',
    dests.every(d => d.veiled === true));
  let minSep = Infinity;
  for (let i = 0; i < dests.length; i++) {
    for (let j = i + 1; j < dests.length; j++) {
      minSep = Math.min(minSep, Math.hypot(dests[i].map.x - dests[j].map.x, dests[i].map.y - dests[j].map.y));
    }
  }
  check('ports: destinations spread along the ribbon (true geography, ≥ 50nu apart)',
    minSep >= 50, `min ${minSep.toFixed(0)}`);
  check('ports: back-edges wire every destination to the river',
    dests.every(d => d.exits.some(e => e.to === river.id)));
  const chained = dests.filter(d => (d.searoutes ?? []).length > 0).length;
  check('ports: the searoute lane chains the docks down the ribbon',
    chained >= dests.length - 1, `${chained}/${dests.length}`);
  const rerun = river.exits.length;
  (world as unknown as { soulriverPorts(r: ZoneDef, g: { x: number; y: number }): void })
    .soulriverPorts(river, gate);
  check('ports: idempotent (a second call mints nothing, doubles nothing)',
    river.exits.length === rerun
    && plan.docks.every(d => world.zoneMap[`soul_dock_${d.i}`] === dests[d.i]));
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
  check('kit: the soulway course rides the underworld chart (the map\'s sea)',
    SOULWAY_COURSE.biome === 'soulway' && SOULWAY_COURSE.feather === 0);
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
