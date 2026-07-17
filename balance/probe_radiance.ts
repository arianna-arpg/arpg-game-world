// RADIANCE / SPANS / COMET-LANE PROBE — the day-night fabric on the real engine.
//
//  · THE SCALAR: radianceOf is pure and honest — noon 1, midnight ~0, rain
//    dims, storm halves, starfall FLOORS the night at 0.32, shelter flattens.
//  · THE SKY: the Aetherial is OPEN by registry (DimensionDef.sky) — the one
//    derivation that made every realm zone read sheltered twilight forever.
//  · THE SPANS (engine/spans.ts, real aether_vesper mints — one zone per span
//    family, forced via the variant/spec layoutParams seam): sunbridges stand
//    at noon and are GONE at night via the fading telegraph (walkable while
//    it warns); star-spans invert; prism-spans exist exactly while rain or
//    storm covers the zone; veiled ways are not a fabric row at all — always
//    walkable, threshold-of-sight paint, star-cairns at the mouths.
//    Walkability tracks the paint — the grid, not a parallel bit.
//  · THE PERMANENT-GROUND CONTRACT: every exit is reachable from the entry
//    over 'ground' alone (spans are shortcuts and prizes, never the road).
//  · THE COMET LANES: cometfall waves field at night and hold at noon
//    (FrontSpawnRow.when through the terrain window).
//
// Exit 1 on any failure.
//   npx tsx balance/probe_radiance.ts

import { bootSimEngine, classById } from '../src/sim/arena';
import { makeAccount } from '../src/meta/account';
import { buildManifest } from '../src/packages/manifest';
import { World } from '../src/engine/world';
import { placeZoneAt } from '../src/engine/worldgen';
import { HUB_ZONE, skyOf } from '../src/data/zones';
import type { ZoneDef } from '../src/data/zones';
import { radianceOf } from '../src/world/radiance';
import { GridWalkField } from '../src/world/gridWalk';
import { regionKind } from '../src/world/regions';

bootSimEngine();

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

// --- 1. THE SCALAR (pure math, no world) ------------------------------------
const NOON = 48, MIDNIGHT = 168; // dayCycle: light peaks at t=0.20 of 240s, troughs at 0.70
check('noon is bright', radianceOf(NOON, null, false) > 0.95, `${radianceOf(NOON, null, false).toFixed(3)}`);
check('midnight is dark', radianceOf(MIDNIGHT, null, false) < 0.05, `${radianceOf(MIDNIGHT, null, false).toFixed(3)}`);
check('rain dims the noon', Math.abs(radianceOf(NOON, 'rain', false) - 0.72) < 0.02);
check('storm halves the noon', Math.abs(radianceOf(NOON, 'storm', false) - 0.5) < 0.02);
check('starfall floors the night', Math.abs(radianceOf(MIDNIGHT, 'starfall', false) - 0.32) < 0.01);
check('shelter reads flat twilight', radianceOf(NOON, 'storm', true) === radianceOf(MIDNIGHT, null, true));

// --- 2. REAL VESPER MINTS — one zone per span family (deterministic) ---------
const account = makeAccount();
const manifest = buildManifest(account, 4321);
const w = new World(account, Object.freeze(manifest));
w.createPlayer(classById('warrior'));
const wa = w as any;
w.devTravelTo(HUB_ZONE);
w.enterDimension('aetherial');
const gate = wa.zoneMap.ae_gate as ZoneDef;
check('the realm reads OPEN sky (DimensionDef.sky)', skyOf(gate) === 'open');

const FAMS = ['span_sun', 'span_star', 'span_prism', 'span_veiled'] as const;
for (let i = 0; i < FAMS.length; i++) {
  const id = `probe_v_${FAMS[i]}`;
  const vz = placeZoneAt({ x: gate.map.x + 90 + i * 70, y: gate.map.y + (i % 2) * 80 }, gate, wa.zoneMap, wa.nextGenId++, {
    id, tileset: 'aether_vesper', dimension: 'aetherial', variant: 'eventide shoals',
    objective: { kind: 'clear' }, seed: (0xbeef ^ (i * 7919)) >>> 0, noBackEdge: true,
    layoutParams: { spanKinds: [{ kind: FAMS[i], w: 1 }], spanLinks: [4, 4], prizeIsles: [2, 2] },
  });
  wa.zoneMap[id] = vz;
}

function loadAt(id: string, time: number): void {
  w.time = time;
  w.devTravelTo(id);
  w.time = time; // travel ticks — pin the hour again
  wa.player.pos = { ...wa.zoneEntry };
}
function tick(secs: number): void {
  for (let t = 0; t < secs; t += 1 / 30) w.update(1 / 30);
}
const spanStates = (): Record<string, string> => wa.spans ? wa.spans.states() : {};
const grid = (): GridWalkField => wa.walk as GridWalkField;
function cellOf(kind: string): { x: number; y: number } | null {
  const g = grid();
  for (let gy = 0; gy < g.rows; gy++) {
    for (let gx = 0; gx < g.cols; gx++) {
      const x = (gx + 0.5) * g.cell, y = (gy + 0.5) * g.cell;
      if (g.regionAt(x, y) === kind) return { x, y };
    }
  }
  return null;
}

// SUNBRIDGES: stand at noon, warn at nightfall, void, re-form at daybreak.
{
  loadAt('probe_v_span_sun', NOON);
  tick(0.6);
  check('sun zone carries the span fabric', !!wa.spans, JSON.stringify(spanStates()));
  check('noon: sunbridge held', spanStates().span_sun === 'held', JSON.stringify(spanStates()));
  const cell = cellOf('span_sun');
  check('noon: sunbridge painted + walkable', !!cell && grid().isWalkable(cell.x, cell.y));
  w.time = MIDNIGHT;
  tick(0.6);
  check('nightfall: sunbridge fading first (the telegraph)', spanStates().span_sun === 'fading');
  check('nightfall: fading span still walkable', !!cell && grid().isWalkable(cell!.x, cell!.y));
  tick(4);
  check('night: sunbridge gone', spanStates().span_sun === 'gone');
  check('night: sun cells void + unwalkable', !!cell && !grid().isWalkable(cell!.x, cell!.y)
    && grid().regionAt(cell!.x, cell!.y) === 'cloud_void');
  w.time = NOON;
  tick(0.6);
  check('daybreak: sunbridge re-forms instantly', spanStates().span_sun === 'held');
  check('daybreak: sun cells walkable again', !!cell && grid().isWalkable(cell!.x, cell!.y));
}

// STAR-SPANS: the inverse — the dark builds them.
{
  loadAt('probe_v_span_star', MIDNIGHT);
  tick(0.6);
  check('midnight: star-span held', spanStates().span_star === 'held', JSON.stringify(spanStates()));
  const cell = cellOf('span_star');
  check('midnight: star cells walkable', !!cell && grid().isWalkable(cell.x, cell.y));
  w.time = NOON;
  tick(5);
  check('noon: star-span gone', spanStates().span_star === 'gone');
  check('noon: star cells unwalkable', !!cell && !grid().isWalkable(cell!.x, cell!.y));
}

// PRISM-SPANS: exist exactly while a rain/storm front covers the zone.
{
  loadAt('probe_v_span_prism', NOON);
  tick(0.6);
  check('clear sky: prism gone', spanStates().span_prism === 'gone', JSON.stringify(spanStates()));
  const wf = wa.sim.weather;
  const vz = wa.zoneMap.probe_v_span_prism as ZoneDef;
  // life/age chosen so the field's own ramp recompute reads full intensity
  // (rampFrac 0.4: ramp-in ends at 24s of a 60s life — age 25 = plateau).
  wf.fronts.push({ kind: 'rain', pos: { x: vz.map.x, y: vz.map.y }, vel: { x: 0, y: 0 }, radius: 400, intensity: 1, age: 25, life: 60 });
  tick(0.6);
  check('rain: prism-span held', spanStates().span_prism === 'held');
  const cell = cellOf('span_prism');
  check('rain: prism cells walkable', !!cell && grid().isWalkable(cell.x, cell.y));
  check('prism wears the living-hue grammar', regionKind('span_prism')?.visual?.animate === 'prism');
  wf.fronts.length = 0;
  tick(0.6);
  check('sky clears: prism fading', spanStates().span_prism === 'fading');
  tick(4);
  check('sky clear: prism gone + unwalkable', spanStates().span_prism === 'gone'
    && !!cell && !grid().isWalkable(cell!.x, cell!.y));
}

// VEILED WAYS: not a fabric row at all — always walkable, threshold paint,
// cairns at the mouths.
{
  loadAt('probe_v_span_veiled', MIDNIGHT);
  tick(0.6);
  check('veiled zone runs NO span fabric (nothing to fail)', wa.spans === null || spanStates().span_veiled === undefined);
  const cell = cellOf('span_veiled');
  check('veiled way painted + walkable at midnight', !!cell && grid().isWalkable(cell!.x, cell!.y));
  w.time = NOON;
  tick(1);
  check('veiled way walkable at noon (it never flickers)', !!cell && grid().isWalkable(cell!.x, cell!.y));
  const vis = regionKind('span_veiled')?.visual;
  check('veiled way sits at the threshold of sight', !!vis && (vis.alpha ?? 1) <= 0.08, `alpha=${vis?.alpha}`);
  check('star cairns mark the veiled mouths', wa.doodads.some((d: any) => d.kind === 'star_cairn'));

  // THE PERMANENT-GROUND CONTRACT (checked here, in the zone whose spans
  // never even participate): every exit reachable over 'ground' alone.
  const g = grid();
  const idx = (gx: number, gy: number): number => gy * g.cols + gx;
  const isGround = (gx: number, gy: number): boolean =>
    g.regionAt((gx + 0.5) * g.cell, (gy + 0.5) * g.cell) === 'ground';
  const seen = new Uint8Array(g.cols * g.rows);
  const q: number[] = [];
  const seedFrom = (p: { x: number; y: number }): void => {
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const gx = (p.x / g.cell | 0) + dx, gy = (p.y / g.cell | 0) + dy;
        if (gx < 0 || gy < 0 || gx >= g.cols || gy >= g.rows || !isGround(gx, gy)) continue;
        if (!seen[idx(gx, gy)]) { seen[idx(gx, gy)] = 1; q.push(idx(gx, gy)); }
      }
    }
  };
  seedFrom(wa.zoneEntry);
  while (q.length) {
    const i = q.pop()!;
    const gx = i % g.cols, gy = i / g.cols | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = gx + dx, ny = gy + dy;
      if (nx < 0 || ny < 0 || nx >= g.cols || ny >= g.rows) continue;
      const j = idx(nx, ny);
      if (seen[j] || !isGround(nx, ny)) continue;
      seen[j] = 1; q.push(j);
    }
  }
  const reachable = (p: { x: number; y: number }): boolean => {
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const gx = (p.x / g.cell | 0) + dx, gy = (p.y / g.cell | 0) + dy;
        if (gx >= 0 && gy >= 0 && gx < g.cols && gy < g.rows && seen[idx(gx, gy)]) return true;
      }
    }
    return false;
  };
  const exits = wa.exits as { pos: { x: number; y: number } }[];
  check('every exit reachable on permanent ground alone', exits.length > 0 && exits.every(e => reachable(e.pos)),
    `${exits.filter(e => reachable(e.pos)).length}/${exits.length}`);
}

// --- 3. THE COMET LANES ------------------------------------------------------
{
  loadAt('probe_v_span_sun', NOON);
  wa.creepEnsure();
  const cf = wa.creep;
  check('vesper mint carries comet lanes', !!cf && (cf.lanes?.length ?? 0) >= 1, `lanes=${cf?.lanes?.length}`);
  tick(20);
  w.time = NOON + 20;
  const daySources = (cf.sources as { def: { id: string } }[]).filter(s => s.def.id === 'cometfall').length;
  check('noon: no comets fly', daySources === 0, `${daySources} sources`);
  w.time = MIDNIGHT;
  let nightSources = 0;
  for (let t = 0; t < 30 && !nightSources; t += 1) {
    tick(1);
    w.time = MIDNIGHT; // hold the night open while the delay band spends
    nightSources = (cf.sources as { def: { id: string } }[]).filter(s => s.def.id === 'cometfall').length;
  }
  check('night: comet waves field', nightSources > 0, `${nightSources} sources`);
}

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL CHECKS PASS');
process.exit(failed ? 1 : 0);
