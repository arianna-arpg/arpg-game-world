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
// swallows nothing), the interior GEN PASS (forced dials lay trapworks
// + lanes deterministically on a real minted sunken_ruin), and THE WIRE WARD
// (the tripline archetype: wall-to-wall spans over real corridor legs, two
// facing anchors as the tell, a volley raking the hall's own length).
// Run: npx tsx balance/probe_trapworks.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { linePath, placeTrack, trackDone, trackPending, trackPose, trackRider, type TrackSpec } from '../src/engine/tracks';
import {
  LEDGER_TRAP_SPRUNG, trapEffect, trapTriggerHit, TRAPWORK_CFG,
  type BoulderEffectRow, type PlacedTrapwork, type TrapHost,
} from '../src/engine/trapworks';
import { blocksMovement, generateLayout, type Doodad } from '../src/engine/levelgen';
import { mintCave } from '../src/engine/worldgen';
import { GridWalkField } from '../src/world/gridWalk';
import { Rng } from '../src/core/rng';
import { serializeZone, applyZone } from '../src/net/snapshot';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import { dist, vec, type Vec2 } from '../src/core/math';

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
  const opened: string[] = [];
  const cleared: string[] = [];
  const collapsed: { cells: number; delay: number; presser?: number; visual?: boolean }[] = [];
  const deferred: { sec: number; run: () => void }[] = [];
  const host: TrapHost = {
    time: 50,
    tracksEnsure: (s) => ensured.push(...s),
    setTracksArmed: (tag, on) => armed.set(tag, on),
    laneArmed: (tag) => armed.get(tag) ?? false,
    setDoorOpen: (id) => opened.push(id),
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
  trapEffect('door')!.spring(host, trap, { kind: 'door', ids: ['vault/d0', 'vault/d1'] });
  check('effect door: every named door opens through the narrow host',
    opened.length === 2 && opened[0] === 'vault/d0' && opened[1] === 'vault/d1');
  check('effect door: no mirror on purpose (door states ride their own 20 Hz channel)',
    !trapEffect('door')!.mirror);
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

// --- 12) THE WIRE WARD — the fabric's TRIPLINE half, end to end -------------
// (The tripline trigger existed as grammar and nothing authored one. wireWards
// is the archetype that fields it: a wire strung wall-to-wall across a real
// corridor stretch, wired to a volley raking the hall's own LENGTH. The
// placement law that matters is SITE HUNGER — laid last it measured zero wires
// over 24 minted ruins, starved of halls by the plate archetypes ahead of it.)
{
  const w = makeSimWorld('warrior', 9801);
  const parent = w.zone;
  const WIRED = { wireWards: { chance: 1, max: 2, rays: [2, 3] as [number, number], crossfire: 1 } };
  let wires = 0, anchors = 0, deterministic = true, plumbed = true;
  let spanned = true, walkable = true, laneWalk = true, crossed = true;
  for (let s = 0; s < 4; s++) {
    const seed = 51000 + s * 907;
    const def = mintCave(parent, seed, `probe_wire_${s}`, 'sunken_ruin', { rollVariant: false });
    const forced = {
      ...def, seed, layoutType: 'dungeon',
      layoutParams: { ...def.layoutParams, trapworks: WIRED },
    } as typeof def;
    const arena = { w: 1300, h: 1000 };
    const entry = vec(120, 500), exits = [vec(1180, 500)];
    const layout = generateLayout(forced, arena, new Rng(seed), entry, exits);
    const layout2 = generateLayout(forced, arena, new Rng(seed), entry, exits);
    if (JSON.stringify(layout.trapworks ?? []) !== JSON.stringify(layout2.trapworks ?? [])) deterministic = false;
    const laid = (layout.trapworks ?? []).filter(t => t.trigger.kind === 'tripline');
    wires += laid.length;
    anchors += layout.doodads.filter(d => d.kind === 'ruin_tripwire').length;
    const gw = layout.walk;
    for (const t of laid) {
      const a = t.trigger.a, b = t.trigger.b;
      if (!a || !b) { spanned = false; continue; }
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      // A wire spans the WHOLE hall (both walls) — never a stub across part of it.
      if (len < 2 * 29 || len > 2 * 60) spanned = false;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (gw instanceof GridWalkField && !gw.isWalkable(mid.x, mid.y)) walkable = false;
      // Drawn == tested: crossing the mid presses; a stride down the hall
      // (perpendicular to the wire, well past the capsule) does not.
      const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
      if (!trapTriggerHit(t.trigger, mid.x, mid.y, 12)) crossed = false;
      if (trapTriggerHit(t.trigger, mid.x + uy * 44, mid.y - ux * 44, 12)) crossed = false;
      for (const eff of t.effects) {
        if (!trapEffect(eff.kind)) plumbed = false;
        for (const ray of (eff as { rays?: { a: Vec2; b: Vec2 }[] }).rays ?? []) {
          // The bolts fly down honest ground, the boulder-runway law.
          if (gw instanceof GridWalkField && !gw.lineWalkable(vec(ray.a.x, ray.a.y), vec(ray.b.x, ray.b.y))) laneWalk = false;
        }
      }
    }
  }
  check('wire: forced dials STRING wires across real corridor legs', wires >= 3, `${wires} wires`);
  check('wire: two facing anchors per wire (the strung hall reads from either mouth)',
    anchors === wires * 2, `${anchors} anchors / ${wires} wires`);
  check('wire: the span crosses the WHOLE hall, wall to wall', spanned);
  check('wire: the wire is strung over walkable ground', walkable);
  check('wire: drawn == tested — crossing presses, striding the hall does not', crossed);
  check('wire: every firing lane runs honest ground (lineWalkable, the runway law)', laneWalk);
  check('wire: the volley it looses resolves a registered handler (no invented kind)', plumbed);
  check('wire: the trap pass stays deterministic per seed with wires in it', deterministic);
  check('wire: the tell is DRAWN — ruin_tripwire owns a DOODAD_VISUALS row',
    !!DOODAD_VISUALS['ruin_tripwire'], DOODAD_VISUALS['ruin_tripwire']?.painter ?? 'MISSING');

  // LIVE: the wire springs on a feet-honest cross and looses its bolts.
  const lw = makeSimWorld('warrior', 9802);
  lw.player.pos.x = 200; lw.player.pos.y = 200;
  const lanesBefore = lw.tracks.length;
  lw.trapworksEnsure([{
    id: 'live_wire',
    trigger: { kind: 'tripline', a: vec(600, 440), b: vec(600, 560), w: 14 },
    effects: [{ kind: 'volley', rays: [
      { a: vec(420, 480), b: vec(820, 480) },
      { a: vec(420, 520), b: vec(820, 520) },
    ] }],
  }]);
  const wire = lw.trapworks.find(t => t.id === 'live_wire')!;
  check('wire live: a tripline plants NO plate tell (the anchors are gen\'s job)',
    !lw.doodads.some(d => d.kind === 'ruin_plate' || d.kind === 'ruin_plate_hidden'));
  lw.player.pos.x = 560; lw.player.pos.y = 500;   // short of the wire, in the hall
  for (let i = 0; i < 30; i++) lw.update(DT);
  check('wire live: walking the hall short of the wire springs nothing', wire.state === 'armed');
  lw.player.pos.x = 600; lw.player.pos.y = 500;   // cross it
  for (let i = 0; i < 12; i++) lw.update(DT);
  check('wire live: the cross SPRINGS it within one sweep beat', wire.state === 'sprung');
  check('wire live: the bolts fly as staggered once-lanes down the hall',
    lw.tracks.length === lanesBefore + 2
    && lw.tracks.slice(-2).every(t => t.spec.mode === 'once' && t.spec.tag === 'live_wire'));
  check('wire live: single-use by default — a cut wire stays cut for the visit',
    wire.rearmAt === Infinity);
}

// --- 13) THE DART GALLERY — the 'lanes' effect's field debut ----------------
// (The dormant half armed: registerTrapEffect('lanes'), TrackSpec.tag/armed
// and World.setTracksArmed all shipped with ZERO authored emitters. dartLanes
// fields them: standing cross-corridor once+rearm lanes born DISARMED, a
// hidden flagstone deep in the gallery wired {lanes,on}, a visible silencing
// plate past the far mouth wired {lanes,off}. The archetype is DIAL-GATED
// before any draw — absent == chance-0, byte for byte, so the authored
// tileset matrix cannot move until a face opts in.)
{
  const w = makeSimWorld('warrior', 9901);
  const parent = w.zone;
  const arena = { w: 1300, h: 1000 };
  const entry = vec(120, 500), exits = [vec(1180, 500)];
  type TrapDials = Record<string, unknown>;
  const genOn = (def: ReturnType<typeof mintCave>, seed: number, trapworks: TrapDials | undefined): ReturnType<typeof generateLayout> =>
    generateLayout({
      ...def, seed, layoutType: 'dungeon',
      layoutParams: { ...def.layoutParams, ...(trapworks ? { trapworks } : {}) },
    } as typeof def, arena, new Rng(seed), entry, exits);
  // The whole surface the archetype could touch, one fingerprint.
  const fp = (out: ReturnType<typeof generateLayout>): string => JSON.stringify({
    t: out.tracks ?? [], w: out.trapworks ?? [],
    d: out.doodads.map(d => [d.kind, Math.round(d.pos.x), Math.round(d.pos.y)]),
  });

  // (a) THE OFF-DEFAULT LAW: absent == chance-0, byte for byte.
  const BASE = { sawHalls: { chance: 1, max: 2 }, dartWards: { chance: 1, max: 2 } };
  let parity = true, absentZero = true;
  for (let s = 0; s < 2; s++) {
    const seed = 71000 + s * 1237;
    const def = mintCave(parent, seed, `probe_gal_par_${s}`, 'sunken_ruin', { rollVariant: false });
    const a = genOn(def, seed, BASE);
    const b = genOn(def, seed, { ...BASE, dartLanes: undefined });
    const c = genOn(def, seed, { ...BASE, dartLanes: { chance: 0, max: 3, stations: [4, 6] as [number, number] } });
    if (fp(a) !== fp(b) || fp(a) !== fp(c)) parity = false;
    if ((a.tracks ?? []).some(t => t.tag?.startsWith('gen_dartlane'))
      || (a.trapworks ?? []).some(t => t.effects.some(e => e.kind === 'lanes'))) absentZero = false;
  }
  check('gallery: ABSENT lays zero (no tagged lanes, no lanes-effect plates)', absentZero);
  check('gallery: absent == chance-0, byte for byte (the off-default law)', parity);

  // (b) FORCED dials lay galleries on real minted sunken ruins.
  let galleries = 0, lanesOk = true, wiredOk = true, mawsOk = true, groovesOk = true;
  let walkOk = true, deterministic = true, phased = true, sided = true, platesClear = true;
  for (let s = 0; s < 4; s++) {
    const seed = 72000 + s * 911;
    const def = mintCave(parent, seed, `probe_gal_${s}`, 'sunken_ruin', { rollVariant: false });
    const DIAL = { dartLanes: { chance: 1, max: 1 } };
    const out = genOn(def, seed, DIAL);
    if (fp(out) !== fp(genOn(def, seed, DIAL))) deterministic = false;
    const lanes = (out.tracks ?? []).filter(t => t.tag === 'gen_dartlane0');
    if (!lanes.length) continue;   // this seed grew no 190px hall — honest scarcity
    galleries++;
    if (lanes.length < 2) lanesOk = false;
    for (const t of lanes) {
      if (t.mode !== 'once' || !((t.rearm ?? 0) >= 1) || t.armed !== false || t.groove !== true
        || t.riders.length !== 1 || t.riders[0].kind !== 'ruin_stinger') lanesOk = false;
    }
    // Every station fires its own beat: phases distinct, marched.
    if (new Set(lanes.map(t => t.riders[0].phase ?? 0)).size !== lanes.length) phased = false;
    // Alternating walls: consecutive crossings spring from opposite sides.
    for (let i = 1; i < lanes.length; i++) {
      const v = (t: TrackSpec): Vec2 => vec(t.path[1].x - t.path[0].x, t.path[1].y - t.path[0].y);
      const p = v(lanes[i - 1]), q = v(lanes[i]);
      if (p.x * q.x + p.y * q.y >= 0) sided = false;
    }
    // The crossing's INTERIOR is honest floor (the ends are buried in the
    // masonry by the dartWard ray law — sample inside the walkable band).
    const gw = out.walk;
    for (const t of lanes) {
      for (const f of [0.4, 0.5, 0.6]) {
        const x = t.path[0].x + (t.path[1].x - t.path[0].x) * f;
        const y = t.path[0].y + (t.path[1].y - t.path[0].y) * f;
        if (gw instanceof GridWalkField && !gw.isWalkable(x, y)) walkOk = false;
      }
    }
    // The wiring: exactly one hidden ON flag + one visible OFF plate, both
    // re-arming, both speaking the gallery's own tag.
    const flag = (out.trapworks ?? []).find(t => t.id === 'gen_dartlane0_flag');
    const still = (out.trapworks ?? []).find(t => t.id === 'gen_dartlane0_still');
    if (!flag || !still || flag.hidden !== true || still.hidden
      || !((flag.rearm ?? 0) > 0) || !((still.rearm ?? 0) > 0)) wiredOk = false;
    for (const [tw, set] of [[flag, 'on'], [still, 'off']] as const) {
      const e = tw?.effects[0] as { kind: string; tags?: string[]; set?: string } | undefined;
      if (!e || e.kind !== 'lanes' || e.set !== set || e.tags?.[0] !== 'gen_dartlane0') wiredOk = false;
    }
    // Plates stand on walkable ground, portal-clear, OUTSIDE every crossing.
    for (const tw of [flag, still]) {
      const at = tw?.trigger.kind === 'plate' ? tw.trigger.at : undefined;
      if (!at) { platesClear = false; continue; }
      if (gw instanceof GridWalkField && !gw.isWalkable(at.x, at.y)) platesClear = false;
      if (![entry, ...exits].every(p => Math.hypot(p.x - at.x, p.y - at.y) >= 100)) platesClear = false;
      for (const t of lanes) {
        const ax = t.path[0].x, ay = t.path[0].y, bx = t.path[1].x, by = t.path[1].y;
        const len2 = (bx - ax) ** 2 + (by - ay) ** 2;
        const f = Math.min(1, Math.max(0, ((at.x - ax) * (bx - ax) + (at.y - ay) * (by - ay)) / len2));
        if (Math.hypot(at.x - (ax + (bx - ax) * f), at.y - (ay + (by - ay) * f)) < 20) platesClear = false;
      }
    }
    // The tells: a maw per station, the crossings grooved.
    if (out.doodads.filter(d => d.kind === 'dart_maw').length !== lanes.length) mawsOk = false;
    if (!out.doodads.some(d => d.kind === 'track_groove')) groovesOk = false;
  }
  check('gallery: forced dials LAY galleries on real minted ruins', galleries >= 2, `${galleries}/4 seeds`);
  check('gallery: standing tagged lanes — once+rearm, DISARMED at birth, grooved, stinger-ridden', lanesOk);
  check('gallery: stations march (distinct phases down the hall)', phased);
  check('gallery: stations alternate walls (the left-right rhythm)', sided);
  check('gallery: every crossing\'s interior is honest floor', walkOk);
  check('gallery: hidden ON flag + visible OFF plate, re-arming, one shared tag', wiredOk);
  check('gallery: plates walkable, portal-clear, outside every crossing line', platesClear);
  check('gallery: a maw per station (the reload read has a home)', mawsOk);
  check('gallery: the crossings are carved (the dormant tell)', groovesOk);
  check('gallery: deterministic per seed (double-gen identical)', deterministic);
  check('gallery: the standing dart wears the volley bolt\'s own painter (drawn == tested, one row)',
    trackRider('ruin_stinger')?.kind === 'ruin_dart' && !!DOODAD_VISUALS['ruin_dart']);
  check('gallery: the standing dart TELEGRAPHS (a warn arc — no rake moment to lean on)',
    (trackRider('ruin_stinger')?.warnAhead ?? 0) >= 100);

  // (c) LIVE: the wrong flag wakes it, the crossing bites, the far plate
  // stills it, and the flag re-arms — the standing lever, end to end.
  const lw = makeSimWorld('warrior', 9905);
  lw.player.pos.x = 200; lw.player.pos.y = 200;
  lw.tracksEnsure([{
    path: linePath(vec(700, 434), vec(700, 566)), mode: 'once', rearm: 2, speed: 340,
    riders: [{ kind: 'ruin_stinger', phase: 0 }], tag: 'gallery', armed: false,
  }]);
  lw.trapworksEnsure([
    { id: 'gal_flag', trigger: { kind: 'plate', at: vec(620, 500), r: 15 }, hidden: true, rearm: 2.5,
      effects: [{ kind: 'lanes', tags: ['gallery'], set: 'on' }] },
    { id: 'gal_still', trigger: { kind: 'plate', at: vec(780, 500), r: 16 }, rearm: 1.5,
      effects: [{ kind: 'lanes', tags: ['gallery'], set: 'off' }] },
  ]);
  const lane = lw.tracks.find(t => t.spec.tag === 'gallery')!;
  const m = lw.createMonster('skeleton_warrior', 3, 'enemy');
  m.pos.x = 700; m.pos.y = 500;
  lw.actors.push(m);
  const life0 = m.life;
  for (let i = 0; i < Math.ceil(2.6 / DT); i++) lw.update(DT);
  check('gallery live: DISARMED, a full would-be cycle touches nothing',
    !lane.armed && m.life === life0, `Δlife=${(life0 - m.life).toFixed(1)}`);
  lw.player.pos.x = 620; lw.player.pos.y = 500;   // the wrong flagstone
  for (let i = 0; i < 12; i++) lw.update(DT);
  check('gallery live: the hidden flag ARMS every lane wearing the tag',
    lane.armed === true && lw.trapworks.find(t => t.id === 'gal_flag')?.state === 'sprung');
  lw.player.pos.x = 200; lw.player.pos.y = 200;   // off the flag — the lane hunts alone
  for (let i = 0; i < Math.ceil(2.6 / DT); i++) lw.update(DT);
  check('gallery live: a body on the crossing takes the swept-beat hit',
    m.life < life0, `Δlife=${(life0 - m.life).toFixed(1)}`);
  lw.player.pos.x = 780; lw.player.pos.y = 500;   // beat it to the silencing plate
  for (let i = 0; i < 12; i++) lw.update(DT);
  check('gallery live: the far plate STILLS it through the same tag',
    lane.armed === false && lw.trapworks.find(t => t.id === 'gal_still')?.state === 'sprung');
  lw.player.pos.x = 200; lw.player.pos.y = 200;
  for (let i = 0; i < Math.ceil(0.4 / DT); i++) lw.update(DT);
  check('gallery live: the flag re-armed on its clock (a standing lever, not a one-shot)',
    lw.trapworks.find(t => t.id === 'gal_flag')?.state === 'armed');
  lw.player.pos.x = 620; lw.player.pos.y = 500;   // the wrong flag, again
  for (let i = 0; i < 12; i++) lw.update(DT);
  check('gallery live: the wrong flag WAKES it again (the bait loop stands forever)',
    lane.armed === true);
}

// --- 14) THE SWITCH LANE — levers, switched doors, the 'door' effect --------
// (The deliberate trigger beside the blundered ones. A LEVER is a DOOR-RECORD
// doodad — DoodadDoor.mode 'pull' — thrown through the door fabric's own
// dwell grammar (reach, idle, the standing ring, one-way persistence), and
// the 'door' effect opens NAMED doors through THE one door gate. mode
// 'switched' refuses the push READABLY (the conditioned-mouth idiom); the
// visible lever and the hidden plate are the two secrecy tiers over one
// effect. The stub-host half of the effect lives in §2 with its siblings.)
{
  // (a) THE GRAMMAR: lint refuses the malformed lever; feet never press one.
  const w0 = makeSimWorld('warrior', 10007);
  const before = w0.trapworks.length;
  w0.trapworksEnsure([{ trigger: { kind: 'lever' }, effects: [{ kind: 'door', ids: ['x'] }] }]);
  check('switch: lint refuses a lever without its record id', w0.trapworks.length === before);
  w0.trapworksEnsure([{
    trigger: { kind: 'lever', door: 'x', at: vec(0, 0) }, rearm: 3,
    effects: [{ kind: 'door', ids: ['x'] }],
  }]);
  check('switch: lint refuses a rearming lever (a thrown lever stays thrown)',
    w0.trapworks.length === before);
  check('switch: feet never press a lever (the pull is a deliberate act)',
    !trapTriggerHit({ kind: 'lever', door: 'x', at: vec(0, 0) }, 0, 0, 12));

  // (b) LIVE: refusal → pull → the door swings across the room, end to end.
  const w = makeSimWorld('warrior', 10009);
  w.player.pos.x = 200; w.player.pos.y = 200;
  const swDoor = {
    pos: vec(600, 300), radius: 30, kind: 'door',
    door: { id: 'p14_door', mode: 'switched' },
  } as Doodad;
  const lever = {
    pos: vec(700, 500), radius: 11, kind: 'ruin_lever',
    door: { id: 'p14_lv', mode: 'pull', dwell: 0.4 },
  } as Doodad;
  const plain = {
    pos: vec(300, 700), radius: 30, kind: 'door',
    door: { id: 'p14_plain', mode: 'dwell', dwell: 0.3 },
  } as Doodad;
  w.doodads.push(swDoor, lever, plain);
  w.trapworksEnsure([{
    id: 'p14_tw',
    trigger: { kind: 'lever', door: 'p14_lv', at: vec(700, 500) },
    effects: [{ kind: 'door', ids: ['p14_door'] }],
    announce: 'the lever throws —',
  }]);
  const tw = w.trapworks.find(t => t.id === 'p14_tw')!;
  check('switch live: the lever trapwork stands armed, tell-less (the stone IS the tell)',
    tw?.state === 'armed' && !w.doodads.some(d => d.kind === 'ruin_plate' && dist(d.pos, vec(700, 500)) < 30));
  check('switch live: drawn == tested at rest — the closed switched door BLOCKS, the closed lever never does',
    blocksMovement(swDoor) && !blocksMovement(lever));
  // Age past the refusal throttle's cold start (doorRefusalAt begins at 0).
  for (let i = 0; i < Math.ceil(2.6 / DT); i++) w.update(DT);
  check('switch live: far away, nothing moves (armed, closed, quiet)',
    tw.state === 'armed' && !swDoor.door!.open && !lever.door!.open);
  w.player.pos.x = 550; w.player.pos.y = 300;   // push the barred mouth
  for (let i = 0; i < Math.ceil(0.5 / DT); i++) w.update(DT);
  check('switch live: the push never opens a switched door', !swDoor.door!.open);
  check('switch live: the refusal READS (the mechanism is named, not a bug)',
    w.texts.some(t => t.text.includes('held fast')));
  check('switch live: no dwell ring ever starts at a switched door',
    w.doorDwellView() === null);
  w.player.pos.x = 660; w.player.pos.y = 500;   // stand at the handle
  for (let i = 0; i < Math.ceil(0.3 / DT); i++) w.update(DT);
  const ring = w.doorDwellView();
  check('switch live: the pull wears the STANDING dwell ring at the lever (drawn == tested mid-throw)',
    !!ring && ring.frac > 0 && ring.frac < 1
    && Math.abs(ring.pos.x - 700) < 1 && Math.abs(ring.pos.y - 500) < 1);
  const led0 = w.ledger[LEDGER_TRAP_SPRUNG] ?? 0;
  for (let i = 0; i < Math.ceil(0.6 / DT); i++) w.update(DT);
  check('switch live: the throw lands — lever record open, trapwork sprung single-use',
    lever.door!.open === true && tw.state === 'sprung' && tw.rearmAt === Infinity);
  check('switch live: the named door swings across the room (the \'door\' effect)',
    swDoor.door!.open === true);
  check('switch live: drawn == tested after — the open way blocks nothing',
    !blocksMovement(swDoor));
  check('switch live: the puller\'s own feet teach the account (the hard-lesson ledger)',
    (w.ledger[LEDGER_TRAP_SPRUNG] ?? 0) === led0 + 1);
  w.player.pos.x = 350; w.player.pos.y = 700;   // the standing sweep, untouched
  for (let i = 0; i < Math.ceil(0.8 / DT); i++) w.update(DT);
  check('switch live: a plain dwell door still opens by push (the sweep regression guard)',
    plain.door!.open === true);

  // (c) GEN: forced leverDoors bar real dead-end chambers on minted ruins.
  const parent = w.zone;
  const arena = { w: 1300, h: 1000 };
  const entry = vec(120, 500), exits = [vec(1180, 500)];
  type TrapDials = Record<string, unknown>;
  const genOn = (def: ReturnType<typeof mintCave>, seed: number, trapworks: TrapDials | undefined): ReturnType<typeof generateLayout> =>
    generateLayout({
      ...def, seed, layoutType: 'dungeon',
      layoutParams: { ...def.layoutParams, ...(trapworks ? { trapworks } : {}) },
    } as typeof def, arena, new Rng(seed), entry, exits);
  // The fingerprint carries door MODES — the re-hang must show, and parity
  // must prove chance-0 re-hangs nothing.
  const fp = (out: ReturnType<typeof generateLayout>): string => JSON.stringify({
    t: out.tracks ?? [], w: out.trapworks ?? [],
    d: out.doodads.map(d => [d.kind, Math.round(d.pos.x), Math.round(d.pos.y), d.door?.mode ?? '']),
  });
  const BASE = { sawHalls: { chance: 1, max: 2 }, falseFloors: { chance: 1, max: 1 } };
  let parity = true, absentZero = true;
  for (let s = 0; s < 2; s++) {
    const seed = 81000 + s * 1237;
    const def = mintCave(parent, seed, `probe_lvr_par_${s}`, 'sunken_ruin', { rollVariant: false });
    const a = genOn(def, seed, BASE);
    const b = genOn(def, seed, { ...BASE, leverDoors: undefined });
    const c = genOn(def, seed, { ...BASE, leverDoors: { chance: 0, max: 2 } });
    if (fp(a) !== fp(b) || fp(a) !== fp(c)) parity = false;
    if (a.doodads.some(d => d.kind === 'ruin_lever' || d.door?.mode === 'switched')
      || (a.trapworks ?? []).some(t => t.trigger.kind === 'lever')) absentZero = false;
  }
  check('lever gen: ABSENT lays zero (no levers, no switched mouths)', absentZero);
  check('lever gen: absent == chance-0, byte for byte (the off-default law)', parity);

  let laid = 0, wiredOk = true, recordOk = true, seatOk = true, strideOk = true, deterministic = true;
  for (let s = 0; s < 4; s++) {
    const seed = 82000 + s * 911;
    const def = mintCave(parent, seed, `probe_lvr_${s}`, 'sunken_ruin', { rollVariant: false });
    const DIAL = { leverDoors: { chance: 1, max: 1 } };
    const out = genOn(def, seed, DIAL);
    if (fp(out) !== fp(genOn(def, seed, DIAL))) deterministic = false;
    const twSpec = (out.trapworks ?? []).find(t => t.id === 'gen_leverdoor0');
    if (!twSpec) continue;   // this seed grew no doored leaf — honest scarcity
    laid++;
    // The wiring: lever trigger → its own record → one 'door' effect naming
    // a real, now-switched mouth.
    const eff = twSpec.effects[0] as { kind: string; ids?: string[] };
    if (twSpec.trigger.kind !== 'lever' || twSpec.trigger.door !== 'gen_leverdoor0_lv'
      || !twSpec.trigger.at || twSpec.effects.length !== 1
      || eff.kind !== 'door' || eff.ids?.length !== 1) wiredOk = false;
    const mouth = out.doodads.find(d => d.door?.id === eff.ids?.[0]);
    if (!mouth || mouth.door?.mode !== 'switched' || mouth.kind !== 'door') wiredOk = false;
    // The lever: a real record doodad in 'pull' mode at the trigger's anchor,
    // wearing the config pull.
    const lv = out.doodads.find(d => d.door?.id === 'gen_leverdoor0_lv');
    if (!lv || lv.kind !== 'ruin_lever' || lv.door?.mode !== 'pull'
      || lv.door?.dwell !== TRAPWORK_CFG.leverPullSec
      || !twSpec.trigger.at || dist(lv.pos, vec(twSpec.trigger.at.x, twSpec.trigger.at.y)) > 1) recordOk = false;
    // The seat: walkable corridor ground, portal-clear, off every FOREIGN door.
    if (lv) {
      const gw = out.walk;
      if (gw instanceof GridWalkField && !gw.isWalkable(lv.pos.x, lv.pos.y)) seatOk = false;
      if (![entry, ...exits].every(p => Math.hypot(p.x - lv.pos.x, p.y - lv.pos.y) >= 149)) seatOk = false;
      // The foreign-door floor is 48 — just past the pull's own reach, so a
      // lever is never pullable from a foreign door's push seat.
      for (const d of out.doodads) {
        if (!d.door || d === lv || d === mouth) continue;
        if (Math.hypot(d.pos.x - lv.pos.x, d.pos.y - lv.pos.y) < 47) seatOk = false;
      }
      // The stride law: beside ITS OWN mouth — visible from the refusal.
      if (mouth) {
        const dd = Math.hypot(mouth.pos.x - lv.pos.x, mouth.pos.y - lv.pos.y);
        if (dd < 40 || dd > 140) strideOk = false;
      }
    }
  }
  check('lever gen: forced dials BAR real chambers on minted ruins', laid >= 2, `${laid}/4 seeds`);
  check('lever gen: lever → own pull record → one door effect → a switched mouth (wired whole)', wiredOk);
  check('lever gen: the record doodad is real, pull-moded, config-dwelled, anchored', recordOk);
  check('lever gen: the seat is walkable, portal-clear, off every foreign door', seatOk);
  check('lever gen: the stride law — the mechanism stands beside its own mouth', strideOk);
  check('lever gen: deterministic per seed (double-gen identical)', deterministic);
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
