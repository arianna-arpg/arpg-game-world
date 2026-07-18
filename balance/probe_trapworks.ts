// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE TRAPWORKS FABRIC end to end on the real engine
// (docs/engine/trapworks.md): the pure trigger law (feet-press pad, tripline
// capsule), the ONCE-lane resolver (pending before bornAt, single clamped
// pass, trackDone retirement), the four core effects through a STUB host
// (the PuzzleHost law — no World import needed to exercise a handler), the
// live spring chain (plate press → volley lanes born staggered → retire),
// the armed lever (a disarmed lane touches nothing; armed, it bites), the
// boulder run (mitigated crush + shove on a parked body, lane culled at the
// far wall), the FALSE FLOOR (crumble → fall-able gaps planted → standing
// body swallowed through the pitfall fabric's forced lane WITH credit,
// off-cells body untouched), the co-op wire (specs ride ZoneMsg, states
// converge via setNetTrapState, the collapse MIRROR plants visual gaps and
// swallows nothing), and the interior GEN PASS (forced dials lay trapworks
// + lanes deterministically on a real minted sunken_ruin).
// Run: npx tsx balance/probe_trapworks.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { linePath, placeTrack, trackDone, trackPending, trackPose, type TrackSpec } from '../src/engine/tracks';
import {
  trapEffect, trapTriggerHit, TRAPWORK_CFG,
  type PlacedTrapwork, type TrapHost,
} from '../src/engine/trapworks';
import { generateLayout } from '../src/engine/levelgen';
import { mintCave } from '../src/engine/worldgen';
import { Rng } from '../src/core/rng';
import { serializeZone, applyZone } from '../src/net/snapshot';
import { vec } from '../src/core/math';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x51ab);

const DT = 1 / 60;

// --- 0) THE PURE TRIGGER LAW ------------------------------------------------
{
  const plate = { kind: 'plate' as const, at: vec(300, 300), r: 16 };
  check('trigger: a body ON the plate presses it',
    trapTriggerHit(plate, 300, 302, 12));
  check('trigger: feet, not shoulders — a rim brush is not a press',
    !trapTriggerHit(plate, 300 + 16 + 12 * TRAPWORK_CFG.pressPad + 2, 300, 12));
  const wire = { kind: 'tripline' as const, a: vec(100, 100), b: vec(200, 100), w: 10 };
  check('trigger: crossing the tripline capsule trips it',
    trapTriggerHit(wire, 150, 106, 8));
  check('trigger: walking beside the wire does not',
    !trapTriggerHit(wire, 150, 100 + 10 + 8 * TRAPWORK_CFG.pressPad + 2, 8));
  check('trigger: beyond the segment ends the wire is not there',
    !trapTriggerHit(wire, 240, 100, 8));
}

// --- 1) THE ONCE-LANE RESOLVER ----------------------------------------------
{
  const lane = placeTrack({
    path: linePath(vec(100, 500), vec(500, 500)), mode: 'once', speed: 200,
    riders: [{ kind: 'ruin_boulder' }], bornAt: 10,
  } as TrackSpec);
  const pre = trackPose(lane, 8, 0, lane.riders[0].def);
  check('once: PENDING before bornAt — parked at the start, flagged',
    !!pre.pending && Math.abs(pre.x - 100) < 1e-6, `x=${pre.x.toFixed(1)}`);
  check('once: pending reads through trackPending', trackPending(lane, 8) && !trackPending(lane, 10.5));
  const mid = trackPose(lane, 11, 0, lane.riders[0].def);
  check('once: 1s after birth = speed × 1s down the lane',
    Math.abs(mid.x - 300) < 1e-6 && !mid.pending, `x=${mid.x.toFixed(1)}`);
  const end = trackPose(lane, 30, 0, lane.riders[0].def);
  check('once: the pass CLAMPS at the far end — no wrap, ever',
    Math.abs(end.x - 500) < 1e-6, `x=${end.x.toFixed(1)}`);
  check('once: done exactly past one pass',
    !trackDone(lane, 11.9) && trackDone(lane, 12.01), `passSec=${lane.passSec}`);
  const spin0 = trackPose(lane, 9, 0, lane.riders[0].def);
  check('once: a pending rider is unspun (frozen in the cradle)',
    Math.abs(spin0.rot - pre.rot) < 1e-6);
}

// --- 2) THE CORE EFFECTS ON A STUB HOST (the PuzzleHost law) ----------------
{
  const ensured: TrackSpec[] = [];
  const armed = new Map<string, boolean>([['gate', true]]);
  const cleared: string[] = [];
  const collapsed: { cells: number; delay: number; presser?: number; visual?: boolean }[] = [];
  const deferred: { sec: number; run: () => void }[] = [];
  const host: TrapHost = {
    time: 50,
    tracksEnsure: (s) => ensured.push(...s),
    setTracksArmed: (tag, on) => armed.set(tag, on),
    laneArmed: (tag) => armed.get(tag) ?? false,
    collapseFloor: (cells, delay, presser, visual) =>
      collapsed.push({ cells: cells.length, delay, presser, visual }),
    clearDoodads: (kind) => cleared.push(kind),
    fx: () => { /* recorded elsewhere */ },
    defer: (sec, run) => deferred.push({ sec, run }),
  };
  const trap: PlacedTrapwork = {
    spec: { trigger: { kind: 'plate', at: vec(0, 0) }, effects: [] },
    id: 'probe_trap', state: 'sprung', rearmAt: Infinity, sprungAt: 50, springs: 1,
  };
  trapEffect('lanes')!.spring(host, trap, { kind: 'lanes', tags: ['gate'], set: 'toggle' });
  check('effect lanes: toggle reads laneArmed and flips it', armed.get('gate') === false);
  trapEffect('boulder')!.spring(host, trap,
    { kind: 'boulder', from: vec(0, 0), to: vec(400, 0) }, 7);
  check('effect boulder: one ONCE-lane, presser-credited, trap-tagged, born after the rumble',
    ensured.length === 1 && ensured[0].mode === 'once' && ensured[0].ownerId === 7
    && ensured[0].tag === 'probe_trap'
    && Math.abs((ensured[0].bornAt ?? 0) - (50 + TRAPWORK_CFG.boulderDelay)) < 1e-6);
  check('effect boulder: the cradle empties', cleared.includes('boulder_cradle'));
  ensured.length = 0;
  trapEffect('volley')!.spring(host, trap, {
    kind: 'volley',
    rays: [{ a: vec(0, 0), b: vec(120, 0) }, { a: vec(0, 30), b: vec(120, 30) }, { a: vec(0, 60), b: vec(120, 60) }],
  }, 7);
  check('effect volley: one once-lane per ray, births STAGGERED (the rake reads first)',
    ensured.length === 3
    && Math.abs((ensured[1].bornAt ?? 0) - (ensured[0].bornAt ?? 0) - TRAPWORK_CFG.volleyStagger) < 1e-6
    && ensured.every(s => s.mode === 'once' && s.ownerId === 7));
  trapEffect('collapse')!.spring(host, trap, {
    kind: 'collapse', cells: [{ x: 0, y: 0 }, { x: 30, y: 0 }],
  }, 7);
  check('effect collapse: routes cells + crumble delay + presser to the host',
    collapsed.length === 1 && collapsed[0].cells === 2 && collapsed[0].presser === 7
    && Math.abs(collapsed[0].delay - TRAPWORK_CFG.crumbleSec) < 1e-6);
  trapEffect('collapse')!.mirror!(host, trap, { kind: 'collapse', cells: [{ x: 0, y: 0 }] });
  deferred.forEach(d => d.run());
  check('effect collapse MIRROR: defers to the host schedule, plants visual-only',
    collapsed.length === 2 && collapsed[1].visual === true && collapsed[1].presser === undefined);
}

// --- 3) LIVE: plate press → volley springs, retires, re-arms ----------------
{
  const w = makeSimWorld('warrior', 9107);
  w.player.pos.x = 200; w.player.pos.y = 200;
  const lanesBefore = w.tracks.length;
  w.trapworksEnsure([{
    id: 'live_ward',
    trigger: { kind: 'plate', at: vec(600, 500), r: 16 },
    rearm: 3,
    effects: [{ kind: 'volley', rays: [
      { a: vec(520, 460), b: vec(680, 460) },
      { a: vec(520, 500), b: vec(680, 500) },
      { a: vec(520, 540), b: vec(680, 540) },
    ] }],
  }]);
  const tw = w.trapworks.find(t => t.id === 'live_ward')!;
  check('live: the mechanism stands armed with its tell planted',
    tw?.state === 'armed' && w.doodads.some(d => d.kind === 'ruin_plate'));
  for (let i = 0; i < 30; i++) w.update(DT);
  check('live: nobody near = nothing springs', tw.state === 'armed');
  w.player.pos.x = 600; w.player.pos.y = 500;
  for (let i = 0; i < 12; i++) w.update(DT);
  check('live: the press SPRINGS it within one sweep beat', tw.state === 'sprung');
  check('live: three dart lanes born (staggered once-lanes)',
    w.tracks.length === lanesBefore + 3
    && w.tracks.slice(-3).every(t => t.spec.mode === 'once' && t.spec.tag === 'live_ward'));
  w.player.pos.x = 200; w.player.pos.y = 200;
  for (let i = 0; i < Math.ceil(2.2 / DT); i++) w.update(DT);
  check('live: spent bolts retire themselves (once-lanes culled)',
    w.tracks.length === lanesBefore, `${w.tracks.length - lanesBefore} lanes linger`);
  for (let i = 0; i < Math.ceil(1.2 / DT); i++) w.update(DT);
  check('live: the ward re-arms on its clock', tw.state === 'armed');
}

// --- 4) LIVE: the armed lever gates the whole lane --------------------------
{
  const w = makeSimWorld('warrior', 9203);
  w.player.pos.x = 100; w.player.pos.y = 100;
  w.tracksEnsure([{
    path: linePath(vec(500, 700), vec(900, 700)), mode: 'pingpong', speed: 140,
    riders: [{ kind: 'ruin_sawblade' }], tag: 'sawgate', armed: false,
  }]);
  const m = w.createMonster('skeleton_warrior', 3, 'enemy');
  m.pos.x = 700; m.pos.y = 700;
  w.actors.push(m);
  const life0 = m.life;
  for (let i = 0; i < Math.ceil(1.5 / DT); i++) w.update(DT);
  check('armed lever: a DISARMED lane touches nothing',
    m.life === life0, `Δlife=${(life0 - m.life).toFixed(1)}`);
  w.setTracksArmed('sawgate', true);
  for (let i = 0; i < Math.ceil(2.2 / DT); i++) w.update(DT);
  check('armed lever: armed, the blade bites the parked body',
    m.life < life0, `Δlife=${(life0 - m.life).toFixed(1)}`);
  w.setTracksArmed('sawgate', false);
  // Let the saw's bleed run OUT first (the wound outlives the blade — that
  // is the status fabric working, not the lane), then hold a quiet window.
  for (let i = 0; i < Math.ceil(6 / DT); i++) w.update(DT);
  const life1 = m.life;
  for (let i = 0; i < Math.ceil(1.5 / DT); i++) w.update(DT);
  check('armed lever: disarmed again, the hall bites no more (regen may mend)',
    m.life >= life1 - 0.01, `Δlife=${(life1 - m.life).toFixed(2)}`);
}

// --- 5) LIVE: the boulder run — crush, shove, retire ------------------------
{
  const w = makeSimWorld('warrior', 9301);
  w.player.pos.x = 100; w.player.pos.y = 100;
  const m = w.createMonster('skeleton_warrior', 3, 'enemy');
  m.pos.x = 700; m.pos.y = 800;
  w.actors.push(m);
  const life0 = m.life, x0 = m.pos.x;
  const lanesBefore = w.tracks.length;
  w.trapworksEnsure([{
    id: 'live_boulder',
    trigger: { kind: 'plate', at: vec(450, 800), r: 15 },
    hidden: true,
    effects: [{ kind: 'boulder', from: vec(420, 800), to: vec(900, 800) }],
  }]);
  w.player.pos.x = 450; w.player.pos.y = 800;   // spring it ourselves
  for (let i = 0; i < 12; i++) w.update(DT);
  check('boulder: the hidden plate springs under the presser',
    w.trapworks.find(t => t.id === 'live_boulder')?.state === 'sprung');
  w.player.pos.x = 100; w.player.pos.y = 100;   // step off the runway
  for (let i = 0; i < Math.ceil(3.4 / DT); i++) w.update(DT);
  check('boulder: the parked body is CRUSHED (mitigated) and SHOVED down the lane',
    m.life < life0 && m.pos.x > x0 + 20,
    `Δlife=${(life0 - m.life).toFixed(1)} Δx=${(m.pos.x - x0).toFixed(0)}`);
  check('boulder: the stone meets the wall and is gone (lane culled)',
    w.tracks.length === lanesBefore);
}

// --- 6) LIVE: the FALSE FLOOR — crumble, gaps, the credited swallow ---------
{
  const w = makeSimWorld('warrior', 9407);
  // The sunken ruins get 'descend' structurally (caveDepth ≥ 1); the flat sim
  // arena opts in by theme so the probe exercises the REAL swallow lane.
  w.zone.theme.pitfall = { kind: 'descend' } as never;
  w.player.pos.x = 300; w.player.pos.y = 300;
  const onCells = w.createMonster('skeleton_warrior', 3, 'enemy');
  onCells.pos.x = 800; onCells.pos.y = 640;
  w.actors.push(onCells);
  const offCells = w.createMonster('skeleton_warrior', 3, 'enemy');
  offCells.pos.x = 950; offCells.pos.y = 640;
  w.actors.push(offCells);
  w.trapworksEnsure([{
    id: 'live_floor',
    trigger: { kind: 'plate', at: vec(700, 640), r: 14 },
    hidden: true,
    effects: [{ kind: 'collapse', cells: [
      { x: 800, y: 640, r: 26 }, { x: 826, y: 652, r: 24 },
    ] }],
  }]);
  w.player.pos.x = 700; w.player.pos.y = 640;   // press — WE are the presser
  for (let i = 0; i < 12; i++) w.update(DT);
  w.player.pos.x = 300; w.player.pos.y = 300;   // stand clear of the drop
  check('floor: sprung by the press',
    w.trapworks.find(t => t.id === 'live_floor')?.state === 'sprung');
  check('floor: the crumble is a telegraph — no gap yet',
    !w.doodads.some(d => d.kind === 'ruin_floor_gap'));
  for (let i = 0; i < Math.ceil((TRAPWORK_CFG.crumbleSec + 0.4) / DT); i++) w.update(DT);
  check('floor: the gaps yawn (fall-able pit doodads planted)',
    w.doodads.filter(d => d.kind === 'ruin_floor_gap' && !d.gone).length === 2);
  for (let i = 0; i < Math.ceil(0.8 / DT); i++) w.update(DT);
  // (Presser CREDIT is pinned at the effect layer — §2's ownerId=7 lanes and
  // the collapse row's presser pass-through; the swallow's shover credit is
  // the pitfall fabric's own probed contract.)
  check('floor: the body OVER the dark is swallowed', onCells.dead);
  check('floor: the body OFF the cells never falls', !offCells.dead);
}

// --- 7) THE CO-OP WIRE ------------------------------------------------------
{
  const host = makeSimWorld('warrior', 9511);
  host.player.pos.x = 200; host.player.pos.y = 200;
  host.trapworksEnsure([{
    id: 'wire_floor',
    trigger: { kind: 'plate', at: vec(600, 600), r: 14 },
    hidden: true,
    effects: [{ kind: 'collapse', cells: [{ x: 660, y: 600, r: 24 }], delay: 0 }],
  }]);
  const client = makeSimWorld('warrior', 9512);
  applyZone(client, serializeZone(host));
  check('wire: ZoneMsg carries the mechanism (client adopts the spec)',
    client.trapworks.length === host.trapworks.length
    && client.trapworks[0]?.id === 'wire_floor');
  check('wire: the tell rides the doodad list once (no double plant)',
    client.doodads.filter(d => d.kind === 'ruin_plate_hidden').length
    === host.doodads.filter(d => d.kind === 'ruin_plate_hidden').length);
  const before = client.actors.filter(a => !a.dead).length;
  client.setNetTrapState([{ i: 'wire_floor', s: 1, t: client.time - 1 }]);
  client.setNetTrapState([{ i: 'wire_floor', s: 1, t: client.time - 1 }]);  // drain the deferred mirror
  check('wire: the sprung MIRROR plants the visual gap client-side',
    client.trapworks[0].state === 'sprung'
    && client.doodads.some(d => d.kind === 'ruin_floor_gap'));
  check('wire: the mirror swallows NOTHING (visual-only law)',
    client.actors.filter(a => !a.dead).length === before);
  check('wire: re-applying the same state is silent (idempotent 20 Hz)',
    (() => { const n = client.doodads.length; client.setNetTrapState([{ i: 'wire_floor', s: 1, t: client.time - 1 }]); return client.doodads.length === n; })());
}

// --- 8) THE GEN PASS: forced dials on a real minted sunken ruin -------------
{
  const w = makeSimWorld('warrior', 9601);
  const parent = w.zone;
  const FULL = {
    sawHalls: { chance: 1, max: 2 }, mincerRooms: { chance: 1, max: 1 },
    dartWards: { chance: 1, max: 2 }, boulderRuns: { chance: 1, max: 1 },
    falseFloors: { chance: 1, max: 2 },
  };
  let bestTraps = 0, bestLanes = 0, deterministic = true, plumbed = true;
  for (let s = 0; s < 3; s++) {
    const seed = 42000 + s * 1117;
    const def = mintCave(parent, seed, `probe_ruin_${s}`, 'sunken_ruin', { rollVariant: false });
    const forced = {
      ...def, seed,
      layoutType: 'dungeon',
      layoutParams: { ...def.layoutParams, trapworks: FULL },
    } as typeof def;
    const arena = { w: 1300, h: 1000 };
    const entry = vec(120, 500), exits = [vec(1180, 500)];
    const layout = generateLayout(forced, arena, new Rng(seed), entry, exits);
    const layout2 = generateLayout(forced, arena, new Rng(seed), entry, exits);
    if (JSON.stringify(layout.trapworks ?? []) !== JSON.stringify(layout2.trapworks ?? [])) deterministic = false;
    bestTraps = Math.max(bestTraps, layout.trapworks?.length ?? 0);
    bestLanes = Math.max(bestLanes, layout.tracks?.length ?? 0);
    for (const twSpec of layout.trapworks ?? []) {
      for (const eff of twSpec.effects) if (!trapEffect(eff.kind)) plumbed = false;
    }
  }
  check('gen: forced dials LAY mechanisms on real minted interiors',
    bestTraps >= 3, `best ${bestTraps} trapworks`);
  check('gen: forced dials LAY lanes (saws/mincers) too',
    bestLanes >= 1, `best ${bestLanes} lanes`);
  check('gen: every laid effect kind resolves a registered handler', plumbed);
  check('gen: the trap pass is deterministic per seed (double-run identical)', deterministic);
}

// --- 9) THE MINT PATH REGRESSIONS (the player's "no traps" report) ----------
// (a) mintCave DROPPED variant layoutParams — the toothed halls' dense dials
// never fired underground; (b) labyrinth faces had no trap pass at all.
{
  const w = makeSimWorld('warrior', 9701);
  const def = mintCave(w.zone, 555001, 'probe_toothed', 'sunken_ruin', { variant: 'toothed halls' });
  const dials = (def.layoutParams?.trapworks ?? {}) as Record<string, { chance?: number }>;
  check('mint: a cave VARIANT carries its layoutParams down the ladder (toothed dials land)',
    dials.sawHalls?.chance === 0.9, `sawHalls.chance=${dials.sawHalls?.chance}`);
  const FULL = {
    sawHalls: { chance: 1, max: 2 }, mincerRooms: { chance: 1, max: 1 },
    dartWards: { chance: 1, max: 2 }, boulderRuns: { chance: 1, max: 1 },
    falseFloors: { chance: 1, max: 2 },
  };
  let traps = 0, lanes = 0;
  for (let s = 0; s < 3 && traps + lanes === 0; s++) {
    const seed = 777 + s * 3301;
    const forced = {
      ...def, seed, layoutType: 'labyrinth',
      layoutParams: { ...def.layoutParams, trapworks: FULL },
    } as typeof def;
    const layout = generateLayout(forced, { w: 1300, h: 1000 }, new Rng(seed), vec(120, 500), [vec(1180, 500)]);
    traps = layout.trapworks?.length ?? 0;
    lanes = layout.tracks?.length ?? 0;
  }
  check('mint: the LABYRINTH is trap country (lattice runs + chambers feed the one pass)',
    traps >= 2 && lanes >= 1, `traps=${traps} lanes=${lanes}`);
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
