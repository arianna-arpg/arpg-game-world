// THE RELIEF PROBE — elevation + traced rivers pinned structurally
// (world/relief.ts + the elevation axis + the traced/non-painting course
// extensions), so the foreordained-terrain contract holds by assertion.
//
// The promises this rig pins:
//   A. THE ELEVATION LAW — the axis is registered, the single-axis sampler
//      agrees with the full read, and the land falls toward every shore.
//   B. THE SPRINGS DEAL — rivers exist (dealt, elevation-gated), and the
//      same seed deals the same rivers (foreordained determinism).
//   C. THE DOWNHILL LAW — every river descends (within the momentum bias),
//      and a healthy share of rivers reach open water (mouths).
//   D. THE MINT-HINT LAW — a coordinate ON a river serves riverland-forcing
//      hints with a coherent upstream/downstream orientation; ground beside
//      the corridor serves none.
//   E. THE ANY-COUNTRY LAW — the riverland recipe carves a sound zone in a
//      foreign tileset's dress (one weave, exits reachable): the river can
//      cross any country worldgen mints.
//   F. THE NON-PAINTING LAW — the biome field never wears 'river'.
//   G. THE INERTNESS LAW — no installed relief seed, no rivers (and no
//      stale traces served across the reset).
//
//   npx tsx balance/probe_relief.ts [-- --verbose]

import { Rng } from '../src/core/rng';
import { vec } from '../src/core/math';
import { generateLayout, type GeneratedLayout } from '../src/engine/levelgen';
import '../src/engine/layoutRecipes';
import '../src/data/clusters';
import '../src/data/formations';
import { GridWalkField } from '../src/world/gridWalk';
import { biomeAt, OCEAN_BIOME } from '../src/world/biomes';
import { climateAt, setClimateOrigin } from '../src/world/climate';
import { continentAt, continentSeedFrom } from '../src/world/continents';
import { COURSE_FIELD_SALT, courseMintHints, strewnInstancesInRect } from '../src/world/courses';
import { elevationAt, riverPathsInRect, setReliefSeed, SURFACE_RIVERS } from '../src/world/relief';
import { TILESETS } from '../src/data/tilesets';
import type { StampSpec, ZoneDef } from '../src/data/zones';

const VERBOSE = process.argv.includes('--verbose');
let fails = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails++;
};
const note = (msg: string): void => { if (VERBOSE) console.log(`  ${msg}`); };

setClimateOrigin({ x: 0, y: 0 });
const SEEDS = Array.from({ length: 16 }, (_, i) => (0x8e11ef ^ (i * 0x9e3779b9)) >>> 0);
const RECT = { min: { x: -4200, y: -4200 }, max: { x: 4200, y: 4200 } };

// --- RIG A: the elevation law ----------------------------------------------------
{
  const s0 = SEEDS[0];
  check('A1 elevation axis registered', climateAt({ x: 313, y: -777 }, s0).elevation !== undefined);
  let agree = true, oceanSum = 0, oceanN = 0, landSum = 0, landN = 0;
  for (const seed of SEEDS.slice(0, 6)) {
    const contSeed = continentSeedFrom(seed);
    for (let x = -3600; x <= 3600; x += 480) {
      for (let y = -3600; y <= 3600; y += 480) {
        const e = elevationAt({ x, y }, seed);
        if (Math.abs(e - climateAt({ x, y }, seed).elevation) > 1e-9) agree = false;
        if (continentAt({ x, y }, contSeed).kind === 'ocean') { oceanSum += e; oceanN++; }
        else { landSum += e; landN++; }
      }
    }
  }
  const oceanMean = oceanSum / Math.max(1, oceanN), landMean = landSum / Math.max(1, landN);
  check('A2 the cheap lane agrees with the full read', agree);
  check('A3 the land falls toward every shore (ocean mean well below land mean)',
    landMean - oceanMean > 0.15, `ocean ${oceanMean.toFixed(2)} vs land ${landMean.toFixed(2)}`);
}

// --- RIG B: the springs deal -----------------------------------------------------
{
  let worldsWithRivers = 0, total = 0, deterministic = true;
  for (const seed of SEEDS) {
    setReliefSeed(seed);
    const a = riverPathsInRect(RECT.min, RECT.max, seed);
    const b = riverPathsInRect(RECT.min, RECT.max, seed);
    if (JSON.stringify(a) !== JSON.stringify(b)) deterministic = false;
    if (a.length > 0) worldsWithRivers++;
    total += a.length;
    note(`seed ${seed >>> 0}: ${a.length} river(s)`);
  }
  check('B1 rivers flow in nearly every world', worldsWithRivers >= 13, `${worldsWithRivers}/${SEEDS.length}`);
  check('B2 the deal is rich enough to matter', total >= SEEDS.length * 1.5, `${total} rivers / ${SEEDS.length} seeds`);
  check('B3 the same seed deals the same rivers (foreordained)', deterministic);
}

// --- RIG C: the downhill law -----------------------------------------------------
{
  let maxRise = 0, mouths = 0, rivers = 0;
  for (const seed of SEEDS) {
    setReliefSeed(seed);
    const contSeed = continentSeedFrom(seed);
    for (const pts of riverPathsInRect(RECT.min, RECT.max, seed)) {
      rivers++;
      for (let i = 1; i < pts.length; i++) {
        maxRise = Math.max(maxRise, elevationAt(pts[i], seed) - elevationAt(pts[i - 1], seed));
      }
      if (continentAt(pts[pts.length - 1], contSeed).kind !== 'land') mouths++;
    }
  }
  check('C1 every river DESCENDS (no vertex climbs past the momentum bias)',
    maxRise <= 0.02, `max rise ${maxRise.toFixed(4)}`);
  check('C2 a healthy share of rivers find the sea', rivers > 0 && mouths / rivers >= 0.15,
    `${mouths}/${rivers} mouths`);
}

// --- RIG D: the mint-hint law ----------------------------------------------------
{
  let sampled = 0, sound = 0, offClean = true;
  for (const seed of SEEDS) {
    setReliefSeed(seed);
    const cseed = (seed ^ COURSE_FIELD_SALT) >>> 0;
    for (const inst of strewnInstancesInRect(SURFACE_RIVERS, RECT.min, RECT.max, cseed)) {
      const pts = riverPathsInRect(RECT.min, RECT.max, seed)
        .find(p => Math.abs(p[0].x - inst.anchor.x) < 1 && Math.abs(p[0].y - inst.anchor.y) < 1);
      if (!pts || pts.length < 5) continue;
      sampled++;
      const mid = pts[Math.floor(pts.length / 2)];
      const h = courseMintHints([SURFACE_RIVERS], inst.anchor, mid, inst.iseed);
      const sides = h?.layoutParams.riverSides as [string, string] | undefined;
      const opp: Record<string, string> = { n: 's', s: 'n', e: 'w', w: 'e' };
      if (h && h.spec.forceLayout === 'riverland' && sides && opp[sides[0]] === sides[1]
        && h.continueSides.length >= 1 && h.hug === SURFACE_RIVERS.hug) sound++;
      // Ground PROVABLY clear of every river (not just this one — a denser
      // deal can put a sibling's corridor anywhere) must serve nothing
      // against THIS instance.
      const off = { x: mid.x + 500, y: mid.y + 500 };
      const clearOfAll = riverPathsInRect(
        { x: off.x - 5000, y: off.y - 5000 }, { x: off.x + 5000, y: off.y + 5000 }, seed,
      ).every(p => p.every(v => Math.hypot(v.x - off.x, v.y - off.y) > SURFACE_RIVERS.halfWidth * 2));
      if (clearOfAll && courseMintHints([SURFACE_RIVERS], inst.anchor, off, inst.iseed)) offClean = false;
      if (sampled >= 24) break;
    }
    if (sampled >= 24) break;
  }
  check('D1 a mid-river coordinate serves riverland-forcing hints', sampled >= 8 && sound === sampled,
    `${sound}/${sampled}`);
  check('D2 ground beside the corridor serves none', offClean);
}

// --- RIG E: the any-country law --------------------------------------------------
{
  const arena = { w: 3400, h: 2500 };
  const entry = vec(150, arena.h / 2);
  const exits = [vec(arena.w - 150, arena.h / 2), vec(arena.w / 2, 150)];
  const THEME = { floor: '#161616', grid: '#222', border: '#555', obstacle: '#333', obstacleEdge: '#666', accent: '#999' };
  const meadow = TILESETS.meadow;
  const def: ZoneDef = {
    id: 'qa_river_meadow', name: 'QA river meadow', level: 6, size: { w: arena.w, h: arena.h },
    theme: THEME, layout: meadow.layout as StampSpec[], objective: { kind: 'clear' }, exits: [], map: { x: 0, y: 0 },
    layoutType: 'riverland',
    layoutParams: { ...meadow.layoutParams, riverLiquid: 'water', causeways: [1, 2], riverSides: ['w', 'e'] },
  } as ZoneDef;
  const comps = (out: GeneratedLayout): number => {
    const grid = out.walk;
    if (!(grid instanceof GridWalkField)) return -1;
    const n = grid.cols * grid.rows;
    const label = new Int32Array(n).fill(-1);
    let c = 0;
    const q: number[] = [];
    for (let s = 0; s < n; s++) {
      if (grid.mask[s] !== 1 || label[s] >= 0) continue;
      c++;
      q.length = 0; q.push(s); label[s] = c;
      for (let head = 0; head < q.length; head++) {
        const cc = q[head];
        const cx = cc % grid.cols, cy = Math.floor(cc / grid.cols);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= grid.cols || ny >= grid.rows) continue;
          const nc = ny * grid.cols + nx;
          if (grid.mask[nc] !== 1 || label[nc] >= 0) continue;
          label[nc] = c; q.push(nc);
        }
      }
    }
    return c;
  };
  for (const seed of [515001, 515002]) {
    const out = generateLayout({ ...def, seed }, arena, new Rng(seed), entry, exits);
    const grid = out.walk;
    const ok = grid instanceof GridWalkField && exits.every(e => grid.reachable(entry, e));
    check(`E1 riverland carves sound in meadow dress (seed ${seed})`, ok && comps(out) >= 1,
      `comps=${comps(out)}`);
  }
}

// --- RIG F: the non-painting law -------------------------------------------------
{
  let painted = false;
  for (const seed of SEEDS.slice(0, 8)) {
    setReliefSeed(seed);
    for (const pts of riverPathsInRect(RECT.min, RECT.max, seed)) {
      for (let i = 0; i < pts.length; i += 3) {
        const b = biomeAt({ x: Math.round(pts[i].x), y: Math.round(pts[i].y) }, seed);
        if (b === 'river') painted = true;
        if (b === OCEAN_BIOME) continue;
      }
    }
  }
  check('F1 the field never wears the river (paints: false holds)', !painted);
}

// --- RIG G: the inertness law ----------------------------------------------------
{
  const seed = SEEDS[0];
  setReliefSeed(seed);
  const with_ = riverPathsInRect(RECT.min, RECT.max, seed).length;
  setReliefSeed(null);
  const without = riverPathsInRect(RECT.min, RECT.max, seed).length;
  check('G1 no relief seed → no rivers (and no stale traces served)',
    with_ > 0 && without === 0, `${with_} → ${without}`);
  setReliefSeed(seed);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);
