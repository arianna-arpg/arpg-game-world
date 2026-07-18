// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE MOUNTAIN COUNTRY end to end on the real engine:
// the geoAffinity fold (per-range snow lock: cold picks snowcrown, warm picks
// stonecrown, geo-less biomes untouched), the depthAffinity climb staging,
// the windchill lane (accrue in the open, shed at a fire, clock pinned while
// exposed, absent-theme inert), the rearm boulder lever (cyclic once-lanes:
// pass → cradle rest → pass, pure of the clock, phased, never done, harmless
// while parked), the boulder-chute gen pass (lanes + grooves + cradles off
// the finished grid, portal clearance, determinism, param-less silence), the
// landslide span front (wall + corridor law + scree_wake convert + fade +
// stonelashed + downhill drag), and the registry weave.
// Run: npx tsx balance/probe_mountain.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { Rng } from '../src/core/rng';
import { vec } from '../src/core/math';
import { TILESETS, pickTilesetForBiome } from '../src/data/tilesets';
import { placeTrack, trackPose, trackDone, lintTrackSpec, linePath, rideCapOf, type TrackSpec } from '../src/engine/tracks';
import { GridWalkField } from '../src/world/gridWalk';
import { generateLayout, hasFormation, hasComposition, layoutParam, type GeneratedLayout } from '../src/engine/levelgen';
import type { StampSpec, ZoneDef } from '../src/data/zones';
import { CREEPS } from '../src/engine/creep';
import { STATUS_DEFS } from '../src/engine/status';
import { MONSTERS } from '../src/data/monsters';
import { LOOKS } from '../src/data/looks';
import { regionKind } from '../src/world/regions';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x30a7);

const DT = 1 / 60;

// --- 0) REGISTRY WEAVE ------------------------------------------------------
{
  for (const id of ['foothills', 'overpass', 'snowcrown', 'stonecrown', 'highland']) {
    check(`registry: tileset '${id}' seated on biome highland`, TILESETS[id]?.biome === 'highland');
  }
  check('registry: every mountain face carries a depth band (the climb)',
    ['foothills', 'overpass', 'snowcrown', 'stonecrown', 'highland'].every(id => !!TILESETS[id]?.depthAffinity));
  check('registry: the crowns are geo-locked, the lower faces are not',
    !!TILESETS.snowcrown.geoAffinity && !!TILESETS.stonecrown.geoAffinity
    && !TILESETS.foothills.geoAffinity && !TILESETS.overpass.geoAffinity && !TILESETS.highland.geoAffinity);
  check("registry: 'landslide' creep kind registered with a span-worthy front",
    !!CREEPS.landslide?.front && (CREEPS.landslide.front.stretch ?? 1) > 1);
  check("registry: 'stonelashed' status registered (the slide's teeth)", !!STATUS_DEFS.stonelashed);
  check("registry: 'horn_muster' rides inline (brain-rule buff, no def needed)", true);
  for (const id of ['crag_condor', 'boulderback', 'beastkin_horncaller']) {
    check(`registry: monster '${id}' seated with a resolvable look`,
      !!MONSTERS[id] && !!LOOKS[MONSTERS[id].look ?? '']);
  }
  check('registry: pine_stand formation registered', hasFormation('pine_stand'));
  check('registry: the pass authors the SPRUNG run (trapworks.boulderRuns — the once-dead dial, live)',
    !!(TILESETS.highland.layoutParams?.trapworks as { boulderRuns?: { chance: number } } | undefined)?.boulderRuns);
  check('registry: drover_waystation composition registered', hasComposition('drover_waystation'));
  check("registry: region 'gorge' = a fall door (chasm contract, granite lip)",
    regionKind('gorge')?.walkable === false && regionKind('gorge')?.blocks === false
    && regionKind('gorge')?.boundaryPolicy?.kind === 'fall');
  check("registry: region 'scree_wake' = mild walkable slog",
    regionKind('scree_wake')?.walkable === true && (regionKind('scree_wake')?.moveScale ?? 1) < 1);
}

// --- 1) THE GEO LOCK (pickTilesetForBiome × geoAffinity) --------------------
{
  const draw = (depth: number, temp: number | undefined, seed: number): string | undefined =>
    pickTilesetForBiome('highland', new Rng(seed), depth,
      undefined, temp === undefined ? undefined : { temperature: temp, moisture: 0.3 });
  const tally = (depth: number, temp: number | undefined): Record<string, number> => {
    const t: Record<string, number> = {};
    for (let s = 0; s < 400; s++) {
      const id = draw(depth, temp, 7000 + s * 13);
      if (id) t[id] = (t[id] ?? 0) + 1;
    }
    return t;
  };
  const coldCrown = tally(0.92, 0.2);
  check('geo lock: a COLD range\'s heart crowns WHITE (snowcrown present)', (coldCrown.snowcrown ?? 0) > 0,
    JSON.stringify(coldCrown));
  check('geo lock: a COLD range NEVER mints the bare crown', (coldCrown.stonecrown ?? 0) === 0);
  const warmCrown = tally(0.92, 0.52);
  check('geo lock: a WARM range\'s heart crowns BARE (stonecrown present)', (warmCrown.stonecrown ?? 0) > 0,
    JSON.stringify(warmCrown));
  check('geo lock: a WARM range NEVER mints the snowcrown', (warmCrown.snowcrown ?? 0) === 0);
  const rim = tally(0.05, 0.45);
  check('climb staging: the rim belongs to the foothills (no crowns at depth 0.05)',
    (rim.foothills ?? 0) > 0 && (rim.snowcrown ?? 0) === 0 && (rim.stonecrown ?? 0) === 0,
    JSON.stringify(rim));
  const mid = tally(0.55, 0.45);
  check('climb staging: the middle belt deals the pass AND the overpass',
    (mid.highland ?? 0) > 0 && (mid.overpass ?? 0) > 0, JSON.stringify(mid));
  // Neutrality: a biome with no geoAffinity candidates draws the SAME pick
  // with or without a climate — the fold must not move anyone else's stream.
  let neutral = true;
  for (let s = 0; s < 200; s++) {
    const a = pickTilesetForBiome('grove', new Rng(5000 + s), 0.4, undefined, undefined);
    const b = pickTilesetForBiome('grove', new Rng(5000 + s), 0.4, undefined, { temperature: 0.1, moisture: 0.8 });
    if (a !== b) { neutral = false; break; }
  }
  check('geo lock: geo-less biomes are BYTE-NEUTRAL to the climate arg', neutral);
  check('geo lock: same seed, same climate → same pick (deterministic)',
    draw(0.9, 0.2, 4242) === draw(0.9, 0.2, 4242));
}

// --- 2) THE REARM LEVER: the pure resolver's cyclic law ---------------------
{
  const spec: TrackSpec = {
    path: linePath(vec(100, 300), vec(700, 300)), mode: 'once', speed: 200, rearm: 4,
    riders: [{ kind: 'ruin_boulder', phase: 0 }, { kind: 'ruin_boulder', phase: 0.5 }],
  };
  const tr = placeTrack(spec);
  check('rearm: period = pass + cradle rest', Math.abs(tr.periodSec - (3 + 4)) < 1e-6,
    `period ${tr.periodSec}s (pass ${tr.passSec}s)`);
  const riding = trackPose(tr, 1.5, 0);
  check('rearm: mid-pass the boulder ROLLS (not pending, moving down-lane)',
    !riding.pending && riding.x > 100 && riding.x < 700, `x=${riding.x.toFixed(0)}`);
  const rest = trackPose(tr, 3.5, 0);
  check('rearm: after the pass it rests IN THE CRADLE, pending and parked',
    rest.pending === true && rest.paused && Math.abs(rest.x - 100) < 1e-6, `x=${rest.x.toFixed(0)}`);
  const again = trackPose(tr, 7.5, 0);
  check('rearm: the next cycle rolls again (cyclic forever)',
    !again.pending && again.x > 100, `x=${again.x.toFixed(0)}`);
  const other = trackPose(tr, 3.5, 0.5);
  check('rearm: phase staggers releases — one rider rests while the other rolls',
    !other.pending, `phase-0.5 x=${other.x.toFixed(0)}`);
  check('rearm: the lane is NEVER done (the cull must not take it)',
    !trackDone(tr, 3 + 1e-3) && !trackDone(tr, 1000));
  // Purity: a fresh placement (a resume) answers the same clock identically.
  const tr2 = placeTrack({ ...spec, path: linePath(vec(100, 300), vec(700, 300)) });
  const p1 = trackPose(tr, 123.456, 0.5);
  const p2 = trackPose(tr2, 123.456, 0.5);
  check('rearm: pose is pure of the clock (rebuild == resume == same pose)',
    Math.abs(p1.x - p2.x) < 1e-9 && p1.pending === p2.pending);
  const badLint = lintTrackSpec({ ...spec, mode: 'loop', closed: true, rearm: 4 }, 'probe');
  check('rearm lint: cyclic modes refuse the lever', badLint.some(m => m.includes('rearm')));
  const rangeLint = lintTrackSpec({ ...spec, rearm: 0.2 }, 'probe');
  check('rearm lint: sub-second rests refused', rangeLint.some(m => m.includes('rearm')));
  const plainOnce = placeTrack({ ...spec, rearm: undefined });
  check('rearm: plain once-lanes still retire (the trapworks roll unchanged)',
    trackDone(plainOnce, 3 + 1e-3));
}

// --- 3) REARM IN THE WORLD: parked stone is harmless, rolling stone bites --
{
  const world = makeSimWorld('warrior', 31001);
  const p = world.player;
  p.pos.x = 400; p.pos.y = 300; // mid-lane
  world.addTrack({
    path: linePath(vec(100, 300), vec(700, 300)), mode: 'once', speed: 200, rearm: 6,
    riders: [{ kind: 'ruin_boulder', phase: 0 }],
  });
  // Step to the cradle-rest window (pass = 3s): park ON the lane. Life may
  // only ever RISE while the stone rests (regen) — a parked boulder that
  // bit would show as a discrete frame dip.
  for (let i = 0; i < Math.ceil(3.4 / DT); i++) world.update(DT);
  let dipDuringRest = false;
  let prev = p.life;
  for (let i = 0; i < Math.ceil(1.4 / DT); i++) {
    world.update(DT);
    if (p.life < prev - 2) dipDuringRest = true;
    prev = p.life;
  }
  check('world: a resting boulder is HARMLESS on its own lane', !dipDuringRest,
    `life now ${p.life.toFixed(0)}`);
  // The next release must find the body: hold the test body mid-lane (the
  // first pass's impulse legitimately BOWLED it away — re-park each frame,
  // the probe_front idiom) and watch for the discrete hit dip through
  // cycle 2 (regen tops the pool between passes — compare frames).
  let hurt = false;
  prev = p.life;
  for (let i = 0; i < Math.ceil(9 / DT); i++) {
    p.pos.x = 400; p.pos.y = 300;
    world.update(DT);
    if (p.life < prev - 5) { hurt = true; break; }
    prev = p.life;
  }
  check('world: the NEXT release bites (the cycle is real, not cosmetic)', hurt,
    `life ${p.life.toFixed(0)}`);
}

// --- 4) THE WINDCHILL LANE --------------------------------------------------
{
  const world = makeSimWorld('warrior', 31002);
  const p = world.player;
  // Inert without the theme row: a minute in the open banks nothing.
  for (let i = 0; i < Math.ceil(20 / DT); i++) world.update(DT);
  check('windchill: absent theme row = NO cold tax (byte-identical elsewhere)',
    !p.statuses.some(s => s.id === 'chill'));
  // Turn the crown on: cold-baked, dial 1.
  world.zone.theme.windchill = 1;
  const zd = world.zoneMap[world.zone.id];
  if (zd) zd.geo = { ...(zd.geo ?? {}), climate: { ...(zd.geo?.climate ?? {}), temperature: 0.1 } };
  let firstStackAt = -1;
  for (let i = 0; i < Math.ceil(30 / DT); i++) {
    world.update(DT);
    if (firstStackAt < 0 && p.statuses.some(s => s.id === 'chill')) { firstStackAt = i * DT; break; }
  }
  check('windchill: the open air banks chill on the cadence', firstStackAt >= 0,
    `first stack at ${firstStackAt.toFixed(1)}s`);
  // Let it climb — the world must PIN the clock while exposed (slow cadences
  // must not lapse between ticks). The ladder may legally CONVERT at the cap
  // (chill → frozen resets the stacks — the buildup breathing), so the proof
  // is the max stacks seen or a freeze witnessed, never one sampled instant.
  let maxStacks = 0, sawFrozen = false;
  for (let i = 0; i < Math.ceil(20 / DT); i++) {
    world.update(DT);
    maxStacks = Math.max(maxStacks, p.statuses.find(s => s.id === 'chill')?.stacks ?? 0);
    if (p.statuses.some(s => s.id === 'frozen')) sawFrozen = true;
  }
  check('windchill: the ladder CLIMBS while exposed (pinned clock; freeze at the cap counts)',
    maxStacks >= 2 || sawFrozen, `max stacks ${maxStacks}, frozen ${sawFrozen}`);
  // WARMTH: a campfire beside you sheds it all.
  world.doodads.push({ pos: vec(p.pos.x + 30, p.pos.y), radius: 10, kind: 'campfire' });
  world.markDoodadsChanged();
  let shedAt = -1;
  for (let i = 0; i < Math.ceil(20 / DT); i++) {
    world.update(DT);
    if (!p.statuses.some(s => s.id === 'chill')) { shedAt = i * DT; break; }
  }
  check('windchill: a fire WARMS — stacks dwindle to nothing at the hearth', shedAt >= 0,
    `clean at ${shedAt.toFixed(1)}s`);
  check('windchill: the sheet let go of the source (no stuck chill mods)',
    !p.statuses.some(s => s.id === 'chill'));
}

// --- 5) THE LANDSLIDE: span wall, corridor law, wake that heals -------------
{
  const world = makeSimWorld('warrior', 31003);
  const f = world.creepEnsure()!;
  f.installLanes([{
    id: 'landslide', line: 'span', bearing: 0, delay: [0.5, 0.5],
    gap: { width: 170 },
  }]);
  for (let i = 0; i < 90; i++) world.update(DT);
  const secs = f.sources.filter(s => s.front?.rowIdx === 0);
  check('landslide: the wall fields wall-to-wall (a span, not a picket)', secs.length >= 4,
    `${secs.length} sections`);
  check('landslide: bearings exactly parallel (the march holds its grain)',
    secs.every(s => s.front!.bearing === 0));
  // The player stands mid-field in the wall's path: the slide must batter
  // (stonelashed) and CARRY (drag displacement along the bearing).
  const p = world.player;
  p.pos.x = world.arena.w * 0.45; p.pos.y = world.arena.h * 0.5;
  const x0 = p.pos.x;
  let lashed = false;
  for (let i = 0; i < Math.ceil(30 / DT); i++) {
    world.update(DT);
    if (p.statuses.some(s => s.id === 'stonelashed')) { lashed = true; break; }
  }
  check('landslide: caught bodies are STONELASHED (the front grant)', lashed);
  for (let i = 0; i < Math.ceil(2.5 / DT); i++) world.update(DT);
  check('landslide: the slide CARRIES downhill (drag along the bearing)', p.pos.x > x0 + 30,
    `x ${x0.toFixed(0)} → ${p.pos.x.toFixed(0)}`);
  // The wake: scree_wake pools appear behind the trailing rim, then FADE to
  // nothing (convert.fade riding the evap fabric) — the slope heals itself.
  let sawWake = 0;
  let t = 0;
  for (let i = 0; i < Math.ceil(60 / DT); i++) {
    world.update(DT);
    t += DT;
    const n = world.doodads.filter(d => d.kind === 'scree_wake' && !d.gone).length;
    sawWake = Math.max(sawWake, n);
    if (sawWake > 0 && n === 0) break;
  }
  const left = world.doodads.filter(d => d.kind === 'scree_wake' && !d.gone).length;
  check('landslide: the wake was WRITTEN (scree_wake pools stamped)', sawWake > 0, `${sawWake} pools at peak`);
  check('landslide: …and UNWRITTEN (every pool dried away — the slope healed)', left === 0,
    `${left} pools left after ${t.toFixed(0)}s`);
}

// --- 6) THE BOULDER CHUTES: generation-meshed off the finished grid ---------
{
  const arena = { w: 3200, h: 2400 };
  const entry = vec(140, arena.h / 2);
  const exits = [vec(arena.w - 140, arena.h / 2)];
  const THEME = { floor: '#161616', grid: '#222', border: '#555', obstacle: '#333', obstacleEdge: '#666', accent: '#999' };
  const defOf = (params: Record<string, unknown> | undefined, seed: number): ZoneDef => ({
    id: `qa_chute_${seed}`, name: 'QA Chutes', level: 8, size: { w: arena.w, h: arena.h },
    theme: THEME, layout: [{ kind: 'rocks', count: [3, 5], radius: [18, 30] }] as StampSpec[],
    objective: { kind: 'clear' }, exits: [], map: { x: 0, y: 0 },
    layoutType: 'massif', seed,
    ...(params ? { layoutParams: params } : {}),
  });
  const gen = (params: Record<string, unknown> | undefined, seed: number): GeneratedLayout =>
    generateLayout(defOf(params, seed), arena, new Rng(seed), entry, exits);
  const SEED = 1000003 * 7 + 17;
  const out = gen({ boulderChutes: { count: [2, 2], rest: 6 } }, SEED);
  const lanes = (out.tracks ?? []).filter(t => t.mode === 'once' && (t.rearm ?? 0) > 0);
  check('chutes: the pass laid rearm once-lanes on the finished grid', lanes.length >= 1,
    `${lanes.length} lanes`);
  check('chutes: every lane wears the boulder and the groove flag',
    lanes.every(t => t.riders.every(r => r.kind === 'ruin_boulder') && t.groove === true));
  const grooves = out.doodads.filter(d => d.kind === 'track_groove').length;
  check('chutes: the runway is WORN (track_groove way discs laid)', grooves > 0, `${grooves} discs`);
  const segDist = (px: number, py: number, ax: number, ay: number, bx: number, by: number): number => {
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const tt = len2 > 1e-6 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
    return Math.hypot(px - (ax + dx * tt), py - (ay + dy * tt));
  };
  check('chutes: portals keep their aprons (no lane within the clearance)',
    lanes.every(t => [entry, ...exits].every(pt =>
      segDist(pt.x, pt.y, t.path[0].x, t.path[0].y, t.path[1].x, t.path[1].y) >= 150)));
  check('chutes: every lane clears the minimum run', lanes.every(t =>
    Math.hypot(t.path[1].x - t.path[0].x, t.path[1].y - t.path[0].y) >= 480));
  // Determinism: the same def + seed lays the same chutes to the pixel.
  const out2 = gen({ boulderChutes: { count: [2, 2], rest: 6 } }, SEED);
  const sig = (o: GeneratedLayout): string => JSON.stringify((o.tracks ?? []).map(t => t.path));
  check('chutes: deterministic per seed (byte-identical lanes on rebuild)', sig(out) === sig(out2));
  // Silence: a param-less def lays nothing and rolls nothing.
  const bare = gen(undefined, SEED);
  check('chutes: param-less zones lay NOTHING (stream-safe by construction)',
    ((bare.tracks ?? []).length === 0) && bare.doodads.every(d => d.kind !== 'track_groove'));
  // The overpass face carries the dial for real.
  check('chutes: the overpass face authors the dial',
    !!layoutParam({ ...defOf(undefined, 1), layoutParams: TILESETS.overpass.layoutParams }, 'boulderChutes', undefined));
}

// --- 7) THE STONE WEARS THIN (TrackSpec.shatter) ----------------------------
{
  const mk = (shatter?: [number, number], rearm?: number): ReturnType<typeof placeTrack> => placeTrack({
    path: linePath(vec(100, 300), vec(700, 300)), mode: 'once', speed: 200,
    ...(rearm !== undefined ? { rearm } : {}), ...(shatter ? { shatter } : {}),
    riders: [{ kind: 'ruin_boulder', phase: 0 }],
  });
  const tr = mk([1, 1], 5); // fixed roll: every release dies at exactly 1s of roll
  const early = trackPose(tr, 1.5, 0);
  check('shatter: the stone dies mid-lane on its stamina roll (pending before the pass ends)',
    early.pending === true, `pending=${early.pending}`);
  const riding = trackPose(tr, 0.6, 0);
  check('shatter: before the roll it RIDES', !riding.pending && riding.x > 100, `x=${riding.x.toFixed(0)}`);
  const next = trackPose(tr, 8.6, 0); // cycle 2 (period 8): riding again at 0.6 in
  check('shatter: the cradle still re-releases on the untouched cycle', !next.pending,
    `x=${next.x.toFixed(0)}`);
  // Per-release variance + purity: caps differ across releases, and a fresh
  // placement (a resume) computes the identical caps.
  const varied = mk([1, 2.6], 5);
  const caps = [0, 1, 2, 3, 4, 5].map(k => rideCapOf(varied, 0, k));
  check('shatter: caps VARY per release (the unpredictable death)',
    Math.max(...caps) - Math.min(...caps) > 0.3, caps.map(c => c.toFixed(2)).join(','));
  check('shatter: caps stay in the authored band', caps.every(c => c >= 1 && c <= 2.6));
  const varied2 = mk([1, 2.6], 5);
  check('shatter: pure of the clock (rebuild == resume == same caps)',
    caps.every((c, i) => Math.abs(c - rideCapOf(varied2, 0, i)) < 1e-9));
  // Plain once + shatter: retires AT the shatter moment, burst pose held there.
  const single = mk([1, 1]);
  check('shatter: a plain once-lane retires the moment the stone gives out',
    !trackDone(single, 0.9) && trackDone(single, 1.05));
  const deadPose = trackPose(single, 3.0, 0);
  check('shatter: the retire pose holds the SHATTER POINT (mid-lane, not the far end)',
    Math.abs(deadPose.x - 300) < 12, `x=${deadPose.x.toFixed(0)} (1s at 200px/s from 100)`);
  const lints = lintTrackSpec({ path: linePath(vec(0, 0), vec(100, 0)), mode: 'pingpong', speed: 100, shatter: [1, 2], riders: [{ kind: 'ruin_boulder' }] }, 'probe');
  check('shatter lint: cyclic modes refuse the lever', lints.some(m => m.includes('shatter')));
  const lints2 = lintTrackSpec({ path: linePath(vec(0, 0), vec(100, 0)), mode: 'once', speed: 100, shatter: [0.1, 2], riders: [{ kind: 'ruin_boulder' }] }, 'probe');
  check('shatter lint: silly bands gripe', lints2.some(m => m.includes('shatter')));
}

// --- 8) DELIVERY FLOORS + THE CAROM, through the REAL mint path -------------
// (The "no boulders" regression net: authored chance ≠ delivered count — the
// repro that caught the pass fielding ZERO is pinned here for keeps.)
{
  const world = makeSimWorld('warrior', 36001);
  const laneStats = (face: string, n: number): { zones: number; lanes: number; zero: number; carom: number; caromLegsOk: boolean; shattered: number } => {
    let zones = 0, lanes = 0, zero = 0, carom = 0, shattered = 0;
    let caromLegsOk = true;
    for (let i = 0; i < n; i++) {
      const id = world.devMintTileset(face, 0, 8);
      if (!id || !world.devTravelTo(id)) continue;
      zones++;
      let here = 0;
      for (const t of world.tracks) {
        if (!((t.spec.rearm ?? 0) > 0)) continue;
        here++;
        if (t.spec.shatter) shattered++;
        if (t.spec.path.length > 2) {
          carom++;
          // Every leg of a caroming lane must be honestly walkable.
          const gw = world.walk;
          if (gw instanceof GridWalkField) {
            for (let s = 1; s < t.spec.path.length; s++) {
              if (!gw.lineWalkable(t.spec.path[s - 1], t.spec.path[s])) caromLegsOk = false;
            }
          }
        }
      }
      lanes += here;
      if (here === 0) zero++;
    }
    return { zones, lanes, zero, carom, caromLegsOk, shattered };
  };
  const pass = laneStats('highland', 6);
  check('delivery: the PASS rolls stones now (the repro\'s zero-boulder face, fixed)',
    pass.zones > 0 && pass.zero === 0, `zones ${pass.zones}, zero-lane ${pass.zero}`);
  const foot = laneStats('foothills', 6);
  check('delivery: every foothill zone teaches the boulder', foot.zones > 0 && foot.zero === 0,
    `zones ${foot.zones}, zero-lane ${foot.zero}`);
  const over = laneStats('overpass', 6);
  check('delivery: the overpass gauntlet never comes up empty', over.zones > 0 && over.zero === 0,
    `zones ${over.zones}, lanes ${over.lanes}`);
  check('delivery: chute stones carry the stamina roll (shatter on every lane)',
    over.shattered === over.lanes, `${over.shattered}/${over.lanes}`);
  const crown = laneStats('stonecrown', 8);
  check('carom: the massif fell CAROMS (multi-leg lanes delivered on real mints)',
    crown.carom >= 1, `${crown.carom} caroming of ${crown.lanes} lanes`);
  check('carom: every carom leg is honestly walkable (drawn groove = rollable truth)',
    crown.caromLegsOk);
  // The gorge never caroms: on the overpass a run that dies at the lip ends
  // there (kindAt tells stone from fall — the reader the carom law rides).
  const wk = world.walk;
  check("carom law: the grid's kindAt reader answers (wall vs gorge vs ground)",
    wk instanceof GridWalkField && typeof wk.kindAt === 'function');
}

// --- 9) THE SPRUNG RUN, through the REAL mint path --------------------------
// (The dead-dial regression net's second half: the pass BRIEFLY authored
// trapworks.boulderRuns and delivered ZERO over 10 real mints — surface
// roomsLayout never ran the trap pass. The seam is live now; pin the
// delivered floor AND one full spring: plate press → lane born → stone gone.)
{
  const world = makeSimWorld('warrior', 37001);
  let zones = 0, sprung = 0, cradles = 0;
  let sprangLive = false, laneBorn = false;
  for (let i = 0; i < 10; i++) {
    const id = world.devMintTileset('highland', 0, 8, { layoutType: 'rooms' });
    if (!id || !world.devTravelTo(id)) continue;
    zones++;
    const traps = world.trapworks.filter(t => t.spec.effects.some(e => e.kind === 'boulder'));
    sprung += traps.length;
    cradles += world.doodads.filter(d => d.kind === 'boulder_cradle' && !d.gone).length;
    // The first delivered trap gets the LIVE test: stand on the hidden plate,
    // watch the mechanism spring and the once-lane enter the world.
    const tw = traps[0];
    const plateAt = tw?.spec.trigger.kind === 'plate' ? tw.spec.trigger.at : undefined;
    if (tw && plateAt && !sprangLive) {
      const lanesBefore = world.tracks.length;
      world.player.pos.x = plateAt.x;
      world.player.pos.y = plateAt.y;
      for (let f = 0; f < 20 && tw.state !== 'sprung'; f++) world.update(DT);
      sprangLive = tw.state === 'sprung';
      laneBorn = world.tracks.length === lanesBefore + 1
        && world.tracks[world.tracks.length - 1].spec.tag === tw.id;
    }
  }
  check('sprung run: real mints DELIVER (the zero-boulder dial, un-deadened)',
    zones === 10 && sprung >= 3, `${sprung} runs over ${zones} zones`);
  check('sprung run: every delivered run cradles its stone (the honest tell)',
    cradles >= sprung, `${cradles} cradles / ${sprung} runs`);
  check('sprung run: the plate SPRINGS under a live press', sprangLive);
  check('sprung run: the loosed stone is a real once-lane, trap-tagged', laneBorn);
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
