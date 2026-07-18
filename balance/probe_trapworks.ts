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
  type BoulderEffectRow, type PlacedTrapwork, type TrapHost,
} from '../src/engine/trapworks';
import { generateLayout } from '../src/engine/levelgen';
import { mintCave } from '../src/engine/worldgen';
import { GridWalkField } from '../src/world/gridWalk';
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

// --- 10) THE SURFACE SEAM: the rooms recipe records, the tail lays ----------
// (The dead-dial regression net: layoutParams.trapworks on a surface 'rooms'
// tileset silently laid NOTHING — the pass was interior-only. roomsLayout now
// records its room/corridor truth as ctx.trapGeo and generateLayout's
// finished-grid tail feeds it to the SAME pass via registerTrapPass.)
{
  const THEME = { floor: '#161616', grid: '#222', border: '#555', obstacle: '#333', obstacleEdge: '#666', accent: '#999' };
  const arena = { w: 2600, h: 1950 };
  const entry = vec(140, arena.h / 2), exits = [vec(arena.w - 140, arena.h / 2)];
  const defOf = (seed: number, trapworks?: Record<string, unknown>): Parameters<typeof generateLayout>[0] => ({
    id: `qa_surface_${seed}`, name: 'QA Surface', level: 8, size: { w: arena.w, h: arena.h },
    theme: THEME, layout: [{ kind: 'rocks', count: [3, 5] }], layoutType: 'rooms', seed,
    ...(trapworks ? { layoutParams: { trapworks } } : {}),
    objective: { kind: 'clear' }, exits: [], map: { x: 0, y: 0 },
  }) as Parameters<typeof generateLayout>[0];
  const FORCED = { boulderRuns: { chance: 1, max: 2 }, sawHalls: { chance: 1, max: 1 }, dartWards: { chance: 1, max: 1 } };
  const seed = 61007;
  const out = generateLayout(defOf(seed, FORCED), arena, new Rng(seed), entry, exits);
  const boulders = (out.trapworks ?? []).filter(t => t.effects.some(e => e.kind === 'boulder'));
  check('surface: forced dials LAY sprung runs on the rooms maze',
    boulders.length >= 1, `${boulders.length} boulder traps, ${out.trapworks?.length ?? 0} total`);
  check('surface: the cradle names the head, the groove wears the runway',
    out.doodads.some(d => d.kind === 'boulder_cradle') && out.doodads.some(d => d.kind === 'track_groove'));
  const gw = out.walk;
  const runsOf = (t: { effects: { kind: string }[] }): BoulderEffectRow[] =>
    t.effects.filter((e): e is BoulderEffectRow => e.kind === 'boulder');
  check('surface: every loosed run is honestly rollable (from→to lineWalkable)',
    gw instanceof GridWalkField && boulders.every(t => runsOf(t).every(e =>
      gw.lineWalkable(vec(e.from.x, e.from.y), vec(e.to.x, e.to.y)))));
  check('surface: every plate sits on walkable ground, clear of the portals',
    gw instanceof GridWalkField && (out.trapworks ?? []).every(t => {
      const at = t.trigger.kind === 'plate' ? t.trigger.at : undefined;
      return !at || (gw.isWalkable(at.x, at.y)
        && [entry, ...exits].every(p => Math.hypot(p.x - at.x, p.y - at.y) >= 100));
    }));
  const out2 = generateLayout(defOf(seed, FORCED), arena, new Rng(seed), entry, exits);
  check('surface: deterministic per seed (double-run identical mechanisms)',
    JSON.stringify(out.trapworks ?? []) === JSON.stringify(out2.trapworks ?? []));
  const bare = generateLayout(defOf(seed), arena, new Rng(seed), entry, exits);
  check('surface: dial-less rooms zones lay NOTHING (stream-safe silence)',
    (bare.trapworks ?? []).length === 0 && (bare.tracks ?? []).length === 0
    && bare.doodads.every(d => d.kind !== 'track_groove' && d.kind !== 'boulder_cradle'));
}

// --- 11) THE WHEEL DIALS + THE BLADE LATTICE --------------------------------
// (The trap-polish pass: every mincer wheel rolls its own character — blade
// count, rim speed, FREE seating with real clusters, spin direction, the ONE
// great blade, the carry-bar — and the bladeLattice tiles a grand hall with
// small async wheels behind structural walkable seams.)
{
  const THEME = { floor: '#161616', grid: '#222', border: '#555', obstacle: '#333', obstacleEdge: '#666', accent: '#999' };
  const arena = { w: 1600, h: 1200 };
  const entry = vec(120, arena.h / 2), exits = [vec(arena.w - 120, arena.h / 2)];
  const genWith = (seed: number, trapworks: Record<string, unknown>): ReturnType<typeof generateLayout> =>
    generateLayout({
      id: `qa_wheel_${seed}`, name: 'QA Wheels', level: 8, size: { w: arena.w, h: arena.h },
      theme: THEME, layout: [{ kind: 'rocks', count: [2, 3] }], layoutType: 'dungeon', seed,
      layoutParams: { rooms: [7, 10], roomCellsMax: 13, trapworks },
      objective: { kind: 'clear' }, exits: [], map: { x: 0, y: 0 },
    } as never, arena, new Rng(seed), entry, exits);
  const rings = (out: ReturnType<typeof generateLayout>): NonNullable<typeof out.tracks> =>
    (out.tracks ?? []).filter(t => t.closed);
  const winding = (path: { x: number; y: number }[]): number => {
    let a = 0;
    for (let i = 0; i < path.length; i++) {
      const p = path[i], q = path[(i + 1) % path.length];
      a += p.x * q.y - q.x * p.y;
    }
    return Math.sign(a);
  };

  // Dialed wheels: bands honored, seats free, both windings reachable.
  const DIAL = { mincerRooms: { chance: 1, max: 2, blades: [2, 4], speed: [75, 145], seating: 'random', reverse: 0.5 } };
  let sawCluster = false, bandsOk = true, windings = new Set<number>();
  for (let s = 0; s < 6; s++) {
    const w = rings(genWith(9000 + s * 131, DIAL));
    for (const t of w) {
      if (t.riders.length < 2 || t.riders.length > 4) bandsOk = false;
      if (t.speed < 75 || t.speed > 145) bandsOk = false;
      windings.add(winding(t.path));
      const ph = t.riders.map(r => r.phase ?? 0).sort((x, y) => x - y);
      for (let i = 1; i < ph.length; i++) if (ph[i] - ph[i - 1] < 0.08) sawCluster = true;
    }
  }
  check('wheels: blade count and rim speed stay inside the authored bands', bandsOk);
  check('wheels: FREE seating clusters arms (two seats within 0.08 of a turn witnessed)', sawCluster);
  check('wheels: both spin directions minted (reverse rolls widdershins rings)', windings.size === 2,
    `windings ${[...windings].join(',')}`);

  // The ONE great blade + the carry-bar (forced): rider swap laws.
  const great = rings(genWith(9301, { mincerRooms: { chance: 1, max: 1, greatBlade: 1 } }));
  check('wheels: greatBlade mounts ONE ruin_greatblade (single arm, the whole identity)',
    great.length >= 1 && great.every(t => t.riders.length === 1 && t.riders[0].kind === 'ruin_greatblade'),
    great.map(t => `${t.riders.map(r => r.kind)}×${t.riders.length}`).join(' '));
  const sweep = rings(genWith(9302, { mincerRooms: { chance: 1, max: 1, sweepArm: 1 } }));
  check('wheels: sweepArm mounts the carry-bar (ruin_sweeparm, the push-along debut)',
    sweep.length >= 1 && sweep.every(t => t.riders.every(r => r.kind === 'ruin_sweeparm')));

  // The lattice: async hubs, structural seams, grooved tells.
  let lat: ReturnType<typeof rings> = [];
  let latOut: ReturnType<typeof generateLayout> | null = null;
  for (let s = 0; s < 5 && lat.length < 3; s++) {
    latOut = genWith(9400 + s * 37, { bladeLattice: { chance: 1, max: 1 } });
    lat = rings(latOut);
  }
  const hubOf = (t: (typeof lat)[number]): { x: number; y: number; r: number } => {
    let cx = 0, cy = 0;
    for (const p of t.path) { cx += p.x; cy += p.y; }
    cx /= t.path.length; cy /= t.path.length;
    return { x: cx, y: cy, r: Math.hypot(t.path[0].x - cx, t.path[0].y - cy) };
  };
  check('lattice: a grand hall tiles ≥3 async wheels (adaptive fit delivered)',
    lat.length >= 3, `${lat.length} hubs`);
  check('lattice: every hub swings the short arm on its own rolled speed',
    lat.length >= 3 && lat.every(t => t.riders.every(r => r.kind === 'ruin_scythe'))
    && new Set(lat.map(t => Math.round(t.speed))).size >= 2,
    lat.map(t => Math.round(t.speed)).join(','));
  const REACH = 28; // ruin_scythe arm half-length (mirrors the rider surface)
  let seamsOk = lat.length >= 3;
  for (let i = 0; i < lat.length; i++) {
    for (let j = i + 1; j < lat.length; j++) {
      const a = hubOf(lat[i]), b = hubOf(lat[j]);
      if (Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r + REACH * 2 + 1) seamsOk = false;
    }
  }
  check('lattice: STRUCTURAL seams — no two sweeps can ever meet (walkable weave)', seamsOk);
  check('lattice: the rings are GROOVED (the carved tell) and mincers are not',
    lat.length >= 3 && lat.every(t => t.groove === true));

  // Determinism + the legacy character (chance/max-only dials keep the
  // classic pair — even seats, 105px/s, the fan arm).
  const d1 = genWith(9500, DIAL), d2 = genWith(9500, DIAL);
  check('wheels: deterministic per seed (double-gen identical lanes)',
    JSON.stringify(d1.tracks ?? []) === JSON.stringify(d2.tracks ?? []));
  const legacy = rings(genWith(9501, { mincerRooms: { chance: 1, max: 1 } }));
  check('wheels: legacy chance/max dials keep the CLASSIC pair (2 even arms @105)',
    legacy.length === 1 && legacy[0].riders.length === 2 && legacy[0].speed === 105
    && Math.abs((legacy[0].riders[0].phase ?? 0) - 0) < 1e-9
    && Math.abs((legacy[0].riders[1].phase ?? 0) - 0.5) < 1e-9,
    legacy.map(t => `n=${t.riders.length} v=${t.speed}`).join(' '));
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
