// MASSIF FABRIC PROBE — the open-with-masses mixture archetype, pinned
// structurally (engine/massif.ts): the weave law, the heal, the courts, the
// block textures, and the placement law — instead of waiting for lucky
// sweep seeds.
//
// The promises this rig pins:
//   A. THE WEAVE LAW end-to-end — a massif zone's walkable floor is ONE
//      component (no sealed pocket a spawn could strand in), every exit
//      reachable, coverage inside a sane band, and the whole thing
//      deterministic (same seed → byte-identical doodads AND grid).
//   B. THE PLACEMENT LAW directly — carveMassifs keeps every pair of
//      bounding circles laneW apart and every body portalClear off every
//      portal (the by-construction half of the weave guarantee).
//   C. COURTS — a fold-only country mints interior POIs and every one of
//      them is walkable from the entry (the mouth, or the heal's breach).
//   D. THE HEAL UNDER PRESSURE — starved lanes + heavy coverage still end
//      at one component (swallow/re-open actually working, not idle).
//   E. THE BLOCK TEXTURES — crag/drystone/hedgewall rows carry exactly the
//      three policies the fabric advertises, and every registered mass kind
//      names a registered MASS region (blocks: true — never a fall void).
//
// Rigs carry pressure detection: a rig that never actually stressed its law
// exits 1 rather than passing green.
//   npx tsx balance/probe_massif.ts [-- --seeds 30 --verbose]

// Side-effect registries — the same set genqa loads; a missing import here
// would make the probe test a DIFFERENT game.
import '../src/data/clusters';
import '../src/data/formations';
import '../src/engine/landmarkBuilders';
import '../src/data/landmarks';
import '../src/engine/layoutRecipes';
import '../src/engine/interiorGen';
import '../src/data/massifs';
import '../src/data/compositions';

import { Rng } from '../src/core/rng';
import { vec } from '../src/core/math';
import { generateLayout, hasLayout, type GenCtx, type GeneratedLayout } from '../src/engine/levelgen';
import { GridWalkField } from '../src/world/gridWalk';
import { regionKind } from '../src/world/regions';
import {
  carveMassifs, massKindIds, massKindOf, massShapeIds, MASSIF_CFG,
} from '../src/engine/massif';
import type { StampSpec, ZoneDef } from '../src/data/zones';

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const SEEDS = Number(flag('seeds') ?? 30);
const VERBOSE = args.includes('--verbose');

const arena = { w: 3200, h: 2400 };
const entry = vec(140, arena.h / 2);
const exits = [vec(arena.w - 140, arena.h / 2), vec(arena.w / 2, 140)];

const THEME = { floor: '#161616', grid: '#222', border: '#555', obstacle: '#333', obstacleEdge: '#666', accent: '#999' };
function defOf(id: string, layout: StampSpec[], extra?: Partial<ZoneDef>): ZoneDef {
  return {
    id, name: `QA ${id}`, level: 8, size: { w: arena.w, h: arena.h },
    theme: THEME, layout, objective: { kind: 'clear' }, exits: [], map: { x: 0, y: 0 },
    layoutType: 'massif',
    ...extra,
  };
}
function gen(def: ZoneDef, seed: number): GeneratedLayout {
  return generateLayout({ ...def, seed }, arena, new Rng(seed), entry, exits);
}
const seedAt = (s: number): number => 1000003 * (s + 1) + 17; // genqa's ladder

let fails = 0;
function fail(msg: string): void { fails++; console.log(`FAIL ${msg}`); }
function note(msg: string): void { if (VERBOSE) console.log(`  ${msg}`); }

/** Walkable 4-connected component count + wall fraction of a layout's grid. */
function gridStats(out: GeneratedLayout): { comps: number; wallFrac: number; grid: GridWalkField } | null {
  const grid = out.walk;
  if (!(grid instanceof GridWalkField)) return null;
  const n = grid.cols * grid.rows;
  const label = new Int32Array(n).fill(-1);
  let comps = 0, open = 0;
  const q: number[] = [];
  for (let s = 0; s < n; s++) {
    if (grid.mask[s] !== 1) continue;
    open++;
    if (label[s] >= 0) continue;
    comps++;
    q.length = 0; q.push(s); label[s] = comps;
    for (let head = 0; head < q.length; head++) {
      const c = q[head];
      const cx = c % grid.cols, cy = Math.floor(c / grid.cols);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= grid.cols || ny >= grid.rows) continue;
        const nc = ny * grid.cols + nx;
        if (grid.mask[nc] !== 1 || label[nc] >= 0) continue;
        label[nc] = comps; q.push(nc);
      }
    }
  }
  return { comps, wallFrac: 1 - open / n, grid };
}

/** A minimal hand-built GenCtx for the direct-carver rig. */
function bareCtx(seed: number): GenCtx {
  return {
    rng: new Rng(seed), arena, entry, exits, seed,
    doodads: [], pois: [], camps: [], breakables: [], npcs: [],
    garrisons: [], caveSeeds: [], reserved: [],
  };
}

// --- Rig E first (static): block textures + kind registry ---------------------
{
  if (!hasLayout('massif')) fail('E: layout "massif" not registered');
  for (const s of ['blob', 'slab', 'ridge', 'chain', 'court']) {
    if (!massShapeIds().includes(s)) fail(`E: built-in shape '${s}' missing`);
  }
  const crag = regionKind('crag'), dry = regionKind('drystone'), hedge = regionKind('hedgewall');
  if (!crag || crag.walkable || !crag.blocks || !crag.blocksShot || !crag.blocksSight) {
    fail('E: crag must be a TRUE WALL (blocks + blocksShot + blocksSight)');
  }
  if (!dry || dry.walkable || !dry.blocks || dry.blocksShot || dry.blocksSight) {
    fail('E: drystone must be PARAPET-class (blocks only; shots + sight sail over)');
  }
  if (!hedge || hedge.walkable || !hedge.blocks || hedge.blocksShot || !hedge.blocksSight) {
    fail('E: hedgewall must be BLIND COVER (blocks + blocksSight; shots thread)');
  }
  const wantKinds = ['tor', 'bluff', 'fold', 'hedge', 'ruincourt', 'barrow'];
  for (const k of wantKinds) {
    if (!massKindIds().includes(k)) { fail(`E: mass kind '${k}' missing`); continue; }
    const rk = regionKind(massKindOf(k).region);
    if (!rk) fail(`E: mass kind '${k}' names unregistered region '${massKindOf(k).region}'`);
    else if (rk.walkable || !rk.blocks) fail(`E: mass kind '${k}' region '${massKindOf(k).region}' is not a MASS (walkable/fall-void)`);
  }
  note('E ok: textures + registry');
}

// --- Rig A: the weave law end-to-end ------------------------------------------
{
  let anyMass = false;
  for (let s = 0; s < SEEDS; s++) {
    const seed = seedAt(s);
    const out = gen(defOf('massif_a', []), seed);
    const st = gridStats(out);
    if (!st) { fail(`A: seed ${seed} produced no walk grid`); continue; }
    if (st.comps !== 1) fail(`A: seed ${seed} walkable floor split into ${st.comps} components`);
    if (st.wallFrac > 0.5) fail(`A: seed ${seed} wall fraction ${st.wallFrac.toFixed(2)} — the field drowned`);
    if (st.wallFrac >= 0.05) anyMass = true;
    for (const e of exits) {
      if (!st.grid.reachable(entry, e)) fail(`A: seed ${seed} exit ${Math.round(e.x)},${Math.round(e.y)} unreachable`);
    }
    note(`A seed ${seed}: wallFrac ${st.wallFrac.toFixed(2)}`);
  }
  if (!anyMass) fail('A: pressure — no seed ever painted a meaningful mass (dead rig)');

  // Determinism: same seed twice → byte-identical doodads AND grid bytes.
  const s0 = seedAt(0);
  const a = gen(defOf('massif_a', []), s0);
  const b = gen(defOf('massif_a', []), s0);
  if (JSON.stringify(a.doodads) !== JSON.stringify(b.doodads)) fail('A: doodads differ across same-seed runs');
  const ga = a.walk instanceof GridWalkField ? a.walk.pack().kbits : '';
  const gb = b.walk instanceof GridWalkField ? b.walk.pack().kbits : '';
  if (ga !== gb) fail('A: walk grid differs across same-seed runs');
}

// --- Rig B: the placement law directly ----------------------------------------
{
  let pairs = 0;
  for (let s = 0; s < SEEDS; s++) {
    const seed = seedAt(s) ^ 0xb0b;
    const ctx = bareCtx(seed);
    const def = defOf('massif_b', []);
    const masses = carveMassifs(ctx, { ...def, seed });
    if (masses.length > MASSIF_CFG.maxMasses) fail(`B: seed ${seed} placed ${masses.length} > maxMasses`);
    for (let i = 0; i < masses.length; i++) {
      for (let j = i + 1; j < masses.length; j++) {
        pairs++;
        const a = masses[i], b = masses[j];
        const d = Math.hypot(a.at.x - b.at.x, a.at.y - b.at.y);
        if (d < a.bound + b.bound + MASSIF_CFG.laneW - 1e-6) {
          fail(`B: seed ${seed} masses ${i}/${j} ${Math.round(d)}px apart — lane law broken`);
        }
      }
      for (const p of [entry, ...exits]) {
        if (Math.hypot(p.x - masses[i].at.x, p.y - masses[i].at.y) < MASSIF_CFG.portalClear + masses[i].bound - 1e-6) {
          fail(`B: seed ${seed} mass ${i} crowds a portal`);
        }
      }
    }
  }
  if (!pairs) fail('B: pressure — never placed two masses in one zone (dead rig)');
}

// --- Rig C: courts — interiors exist and stay reachable -----------------------
{
  const params = {
    massifMasses: [{ kind: 'fold', weight: 1 }],
    massifCoverage: [0.2, 0.26] as [number, number],
    massifSizeR: [200, 300] as [number, number],
  };
  let courts = 0;
  for (let s = 0; s < SEEDS; s++) {
    const seed = seedAt(s) ^ 0xc0c;
    const out = gen(defOf('massif_c', [], { layoutParams: params }), seed);
    const st = gridStats(out);
    if (!st) { fail(`C: seed ${seed} no grid`); continue; }
    for (const poi of out.pois) {
      courts++;
      const q = st.grid.isWalkable(poi.x, poi.y) ? poi : st.grid.snapToWalkable(vec(poi.x, poi.y));
      if (!st.grid.reachable(entry, q)) fail(`C: seed ${seed} court interior ${Math.round(poi.x)},${Math.round(poi.y)} unreachable`);
    }
  }
  if (!courts) fail('C: pressure — no court interior ever minted (dead rig)');
  note(`C: ${courts} court interiors checked`);
}

// --- Rig D: the heal under pressure -------------------------------------------
{
  // Barrow-only (blob shape, reach 1.45): paint fills ~(1/1.45)² of each
  // bounding circle — the densest packer in the vocabulary, so the starved
  // 24px lanes between round bodies actually pinch at grid resolution.
  // (Ridge/chain reaches 1.85 cap painted fraction near 0.19 — a fraction
  // threshold over THOSE reads dead when the rig is merely long-armed.)
  const params = {
    massifMasses: [{ kind: 'barrow', weight: 1 }],
    massifLaneW: 24,
    massifCoverage: [0.3, 0.34] as [number, number],
    massifSizeR: [150, 220] as [number, number],
    massifMaxMasses: 20,
  };
  let crowded = false;
  for (let s = 0; s < SEEDS; s++) {
    const seed = seedAt(s) ^ 0xd0d;
    const def = defOf('massif_d', [], { layoutParams: params });
    const out = gen(def, seed);
    const st = gridStats(out);
    if (!st) { fail(`D: seed ${seed} no grid`); continue; }
    if (st.comps !== 1) fail(`D: seed ${seed} heal left ${st.comps} components under pressure`);
    // PRESSURE, structurally: replay the carve (bare ctx, same seed — the
    // draw streams align until the carve completes, so these ARE the zone's
    // masses) and demand some pair sat within 2 lanes of the spacing floor —
    // bodies genuinely packed, pinches genuinely offered to the heal. A
    // global paint-fraction proxy read dead here whenever portal exclusions
    // kept the FRACTION modest while the lanes were starved all the same.
    const masses = carveMassifs(bareCtx(seed), { ...def, seed });
    let minSlack = Infinity;
    for (let i = 0; i < masses.length; i++) {
      for (let j = i + 1; j < masses.length; j++) {
        const d = Math.hypot(masses[i].at.x - masses[j].at.x, masses[i].at.y - masses[j].at.y);
        minSlack = Math.min(minSlack, d - masses[i].bound - masses[j].bound);
      }
    }
    if (minSlack <= (params.massifLaneW as number) * 2) crowded = true;
    note(`D seed ${seed}: wallFrac ${st.wallFrac.toFixed(2)} minSlack ${Number.isFinite(minSlack) ? Math.round(minSlack) : '∞'}`);
  }
  if (!crowded) fail('D: pressure — starved-lane rig never packed bodies near the spacing floor (dead rig)');
}

if (fails) {
  console.log(`\nprobe_massif: ${fails} FAIL(S)`);
  process.exit(1);
} else {
  console.log('\nprobe_massif: ALL PASS');
}
