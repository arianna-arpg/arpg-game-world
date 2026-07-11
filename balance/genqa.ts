// ---------------------------------------------------------------------------
// GENERATION QA — the layout invariant sweep (`npm run genqa`).
//
// Runs generateLayout headlessly over the WHOLE authored matrix — every
// tileset (base + each variant, with its common rows and structure/landmark
// rolls) plus every registered layout generator under a representative def —
// across several seeds, and asserts the invariants the generation systems
// promise. This is the regression net for the stamp/pour/fuse/formation/
// strata grammar: a data row that breaks a promise fails CI-style (exit 2),
// exactly like the balance baseline gate.
//
// Invariants checked per generated layout:
//   registry   validateStamps over every authored layout source (unknown
//              stamps/clusters/landmarks/formations/fields fail the sweep),
//              plus composition defs (at→site refs, when-gate keys) and every
//              tileset/biome composition ROLL naming a registered bundle
//   sanity     no NaN positions/radii, doodad count within ceilings
//   determinism the same seed generates byte-identical doodads twice
//   forbidOn   no solid intersects ground its rule forbids (inverse audit)
//   portals    no movement-blocking scatter left within the portal clears
//              (structure footprints exempt — their walls are the point)
//   caveSeeds  the cave_entrance ↔ caveSeeds index zip holds
//   reachable  on walk-grid layouts, every exit shares the entry's component
//   doors      placed doors keep walkable floor on BOTH sides (warn)
//   fuse       poured same-kind bodies never sit a sliver apart (warn)
//
// Case groups: every tileset (base + variants, with its rolls), every
// registered layout generator, and every composition FORCED at chance 1.
//
// Usage: npm run genqa [-- --seeds 3 --filter mire --verbose]
// ---------------------------------------------------------------------------

// Side-effect registries — the same set main.ts and the sim arena load; a
// missing import here would make the sweep test a DIFFERENT game.
import '../src/data/clusters';
import '../src/data/formations';
import '../src/engine/landmarkBuilders';
import '../src/data/landmarks';
import '../src/engine/layoutRecipes';
import '../src/engine/interiorGen';
import '../src/data/compositions';

import { Rng } from '../src/core/rng';
import { vec } from '../src/core/math';
import {
  generateLayout, validateStamps, validateCompositions, compositionDefs,
  doodadRuleOf, layoutIds, blocksMovement,
  type Doodad, type GeneratedLayout,
} from '../src/engine/levelgen';
import { GridWalkField } from '../src/world/gridWalk';
import { TILESETS } from '../src/data/tilesets';
import { ZONES, type StampSpec, type ZoneDef } from '../src/data/zones';
import { BIOMES } from '../src/world/biomes';
import { CLIMATE_AXES } from '../src/world/climate';
import { interiorRoleDefs } from '../src/engine/interiorGen';

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const SEEDS = Number(flag('seeds') ?? 3);
const FILTER = flag('filter');
const VERBOSE = args.includes('--verbose');

// Portal-clear constants mirrored from levelgen (not exported on purpose —
// the harness asserts the OBSERVABLE promise, not the internals).
const EXIT_CLEAR_CARVE = 95;

interface CaseResult {
  name: string;
  seeds: number;
  doodads: number;
  ms: number;
  fails: string[];
  warns: string[];
}

const results: CaseResult[] = [];

function mid(band: [number, number]): number { return Math.round((band[0] + band[1]) / 2); }

function checkLayout(name: string, layout: GeneratedLayout, def: ZoneDef,
  arena: { w: number; h: number }, entry: { x: number; y: number },
  exits: { x: number; y: number }[], fails: string[], warns: string[]): void {
  const doodads = layout.doodads;
  // Sanity: finite geometry, plausible volume.
  for (const d of doodads) {
    if (!Number.isFinite(d.pos.x) || !Number.isFinite(d.pos.y) || !Number.isFinite(d.radius)) {
      fails.push(`${name}: non-finite doodad (${d.kind})`);
      break;
    }
  }
  if (doodads.length > 9000) fails.push(`${name}: doodad explosion (${doodads.length})`);
  // forbidOn inverse: no solid intersecting ground its rule forbids.
  const forbidPairs = new Set<string>();
  for (const s of doodads) {
    const forbid = doodadRuleOf(s.kind).forbidOn;
    if (!forbid) continue;
    for (const g of doodads) {
      if (!forbid.includes(g.kind)) continue;
      if (Math.hypot(s.pos.x - g.pos.x, s.pos.y - g.pos.y) < s.radius + g.radius) {
        forbidPairs.add(`${s.kind}×${g.kind}`);
        break;
      }
    }
  }
  if (forbidPairs.size) fails.push(`${name}: solids on forbidden ground (${[...forbidPairs].join(', ')})`);
  // Portal clears: CONVEX zones only — the splice contract. Grid layouts'
  // promise is reachability (asserted below); their blockers may legally
  // neighbor a portal the flow-field routes around.
  if (!layout.walk) {
    const inStructure = (d: Doodad): boolean =>
      (layout.structures ?? []).some(st =>
        d.pos.x > st.rect.x - d.radius && d.pos.x < st.rect.x + st.rect.w + d.radius
        && d.pos.y > st.rect.y - d.radius && d.pos.y < st.rect.y + st.rect.h + d.radius);
    const pts = [entry, ...exits];
    const blockersNearPortals = doodads.filter(d =>
      blocksMovement(d) && !d.keep && d.kind !== 'door' && !inStructure(d)
      && pts.some(p => Math.hypot(p.x - d.pos.x, p.y - d.pos.y) < EXIT_CLEAR_CARVE * 0.9 + d.radius));
    if (blockersNearPortals.length) {
      fails.push(`${name}: ${blockersNearPortals.length} blocker(s) inside a portal clear (${[...new Set(blockersNearPortals.map(d => d.kind))].join(',')})`);
    }
  }
  // caveSeeds zip.
  const mouths = doodads.filter(d => d.kind === 'cave_entrance').length;
  if (mouths !== layout.caveSeeds.length) {
    fails.push(`${name}: caveSeeds zip sheared (${mouths} mouths vs ${layout.caveSeeds.length} seeds)`);
  }
  // Grid reachability: the universal invariant, asserted from outside. Both
  // endpoints snap exactly the way ensureReachability's own check snaps (a
  // global nearest-walkable search) — the assertion mirrors the engine's
  // contract, no stronger and no weaker.
  if (layout.walk instanceof GridWalkField && layout.walk.reachable) {
    const en = layout.walk.isWalkable(entry.x, entry.y)
      ? vec(entry.x, entry.y) : layout.walk.snapToWalkable(vec(entry.x, entry.y));
    for (const e of exits) {
      const q = layout.walk.isWalkable(e.x, e.y) ? vec(e.x, e.y) : layout.walk.snapToWalkable(vec(e.x, e.y));
      if (!layout.walk.reachable(en, q)) {
        fails.push(`${name}: exit (${Math.round(e.x)},${Math.round(e.y)}) unreachable from entry`);
      }
    }
    // Door sanity (warn): a placed door should open BETWEEN two walkable
    // sides along its normal — a door with a wall behind it is dead décor.
    // Mirrors the engine's apron contract: a SEARCH along the normal
    // (1.2–3.4 cells, either sign), not a fixed-offset probe — fixed
    // offsets land on second wall lines exactly like the apron warns the
    // manor pass fixed.
    for (const st of layout.structures ?? []) {
      for (const pd of st.doors) {
        const grid = layout.walk;
        const open = (sign: number): boolean => {
          for (let k = 1.2; k <= 3.4; k += 0.4) {
            const x = pd.pos.x + pd.normal.x * st.cellSize * k * sign;
            const y = pd.pos.y + pd.normal.y * st.cellSize * k * sign;
            if (grid.isWalkable(x, y)) return true;
          }
          return false;
        };
        if (!open(1) || !open(-1)) {
          warns.push(`${name}: door ${pd.door.id} lacks floor on ${!open(1) ? 'its apron' : 'its room'} side`);
        }
      }
    }
  }
  // Fuse promise (warn): poured same-kind bodies never a sliver apart.
  const pouredKinds = [...new Set(doodads.filter(d => doodadRuleOf(d.kind).pour
    && (doodadRuleOf(d.kind).pour!.fuseGap ?? 1) > 0).map(d => d.kind))];
  for (const kind of pouredKinds) {
    const discs = doodads.filter(d => d.kind === kind);
    if (discs.length < 2 || discs.length > 1200) continue;
    const parent = discs.map((_, i) => i);
    const find = (i: number): number => parent[i] === i ? i : (parent[i] = find(parent[i]));
    for (let i = 0; i < discs.length; i++) {
      for (let j = i + 1; j < discs.length; j++) {
        if (Math.hypot(discs[i].pos.x - discs[j].pos.x, discs[i].pos.y - discs[j].pos.y)
          < discs[i].radius + discs[j].radius - 6) {
          const ri = find(i), rj = find(j);
          if (ri !== rj) parent[ri] = rj;
        }
      }
    }
    let minGap = Infinity;
    for (let i = 0; i < discs.length; i++) {
      for (let j = i + 1; j < discs.length; j++) {
        if (find(i) === find(j)) continue;
        const g = Math.hypot(discs[i].pos.x - discs[j].pos.x, discs[i].pos.y - discs[j].pos.y)
          - discs[i].radius - discs[j].radius;
        if (g < minGap) minGap = g;
      }
    }
    if (minGap < 25) warns.push(`${name}: ${kind} bodies ${minGap.toFixed(0)}px apart (guard split or fuse miss)`);
  }
}

function runCase(name: string, def: ZoneDef): void {
  if (FILTER && !name.includes(FILTER)) return;
  const fails: string[] = [];
  const warns: string[] = [];
  const arena = { w: def.size.w, h: def.size.h };
  const entry = vec(120, arena.h / 2);
  const exits = [vec(arena.w - 120, arena.h / 2), vec(arena.w / 2, 120)];
  let count = 0;
  const t0 = performance.now();
  for (let s = 0; s < SEEDS; s++) {
    const seed = 1000003 * (s + 1) + 17;
    const d = { ...def, seed };
    try {
      const layout = generateLayout(d, arena, new Rng(seed), entry, exits);
      const layout2 = generateLayout(d, arena, new Rng(seed), entry, exits);
      if (JSON.stringify(layout.doodads) !== JSON.stringify(layout2.doodads)) {
        fails.push(`${name} seed ${seed}: NON-DETERMINISTIC`);
      }
      count = layout.doodads.length;
      checkLayout(`${name} seed ${seed}`, layout, d, arena, entry, exits, fails, warns);
    } catch (e) {
      fails.push(`${name} seed ${seed}: THREW ${(e as Error).message}`);
    }
  }
  results.push({ name, seeds: SEEDS, doodads: count, ms: (performance.now() - t0) / SEEDS, fails, warns });
}

// --- 1. Registry validation over every authored layout source --------------
const layoutSources = [
  ...Object.values(ZONES).map(z => ({ source: `zone ${z.id}`, specs: z.layout })),
  ...Object.values(TILESETS).flatMap(t => [
    { source: `tileset ${t.id}`, specs: t.layout },
    { source: `tileset ${t.id} common`, specs: (t.common ?? []) as StampSpec[] },
    ...(t.variants ?? []).map((v, i) => ({ source: `tileset ${t.id} variant ${v.name ?? i}`, specs: v.layout })),
  ]),
  // Composition entries speak the same StampSpec vocabulary (plus `at`).
  ...compositionDefs().flatMap(c => [
    { source: `composition ${c.id} pre`, specs: (c.pre ?? []) as StampSpec[], allowAt: true },
    { source: `composition ${c.id} post`, specs: (c.post ?? []) as StampSpec[], allowAt: true },
  ]),
  // Interior room-role furnishings are stamped inside dungeon rooms.
  ...interiorRoleDefs().map(r => ({ source: `interiorRole ${r.id}`, specs: (r.furnish ?? []) as StampSpec[] })),
];
const registryErrors = [
  ...validateStamps(layoutSources),
  // Composition-local invariants: at→site refs, when-gate keys, site bands.
  ...validateCompositions(id => id in CLIMATE_AXES),
  // Every composition ROLL on a tileset must name a registered bundle.
  ...Object.values(TILESETS).flatMap(t => (t.compositions ?? [])
    .filter(r => !compositionDefs().some(c => c.id === r.composition))
    .map(r => `tileset ${t.id}: unregistered composition '${r.composition}'`)),
  ...Object.entries(BIOMES).flatMap(([id, b]) => (b.compositions ?? [])
    .filter(r => !compositionDefs().some(c => c.id === r.composition))
    .map(r => `biome ${id}: unregistered composition '${r.composition}'`)),
];

// --- 2. Every tileset, base + variants --------------------------------------
for (const ts of Object.values(TILESETS)) {
  const base: ZoneDef = {
    id: `qa_${ts.id}`, name: `QA ${ts.id}`, level: 8,
    size: { w: mid(ts.sizeW), h: mid(ts.sizeH) },
    theme: ts.theme,
    layout: [...(ts.common ?? []), ...ts.layout],
    ...(ts.forceLayout ? { layoutType: ts.forceLayout } : {}),
    ...(ts.layoutParams ? { layoutParams: ts.layoutParams } : {}),
    objective: { kind: 'clear' },
    exits: [], map: { x: 0, y: 0 },
    ...(ts.structures ? { structures: ts.structures } : {}),
    ...(ts.landmarks ? { landmarks: ts.landmarks } : {}),
    ...(ts.compositions ? { compositions: ts.compositions } : {}),
  };
  runCase(`tileset:${ts.id}`, base);
  for (const [i, v] of (ts.variants ?? []).entries()) {
    runCase(`tileset:${ts.id}/${v.name ?? i}`, {
      ...base, id: `qa_${ts.id}_v${i}`,
      layout: [...(ts.common ?? []), ...v.layout],
    });
  }
}

// --- 3. Every registered layout generator -----------------------------------
// A representative liquid-y def; layoutParams sampled from the first biome
// that rolls the layout (riverland gets its freezeAt, spiral its lava).
for (const id of layoutIds()) {
  // 'field' shapes itself to a World-side heat-map region (fieldifyZone
  // overrides the footprint; def.field carries the blob) — no headless def
  // is representative. It is exercised through the real world web instead.
  if (id === 'field') continue;
  const biome = Object.values(BIOMES).find(b => b.allowedLayouts && id in b.allowedLayouts);
  runCase(`layout:${id}`, {
    id: `qa_layout_${id}`, name: `QA ${id}`, level: 8,
    size: { w: 2400, h: 1800 },
    theme: { floor: '#161616', grid: '#222', border: '#555', obstacle: '#333', obstacleEdge: '#666', accent: '#999' },
    layout: [
      { kind: 'rocks', count: [4, 7] }, { kind: 'trees', count: [5, 8] },
      { kind: 'water', count: [1, 2] }, { kind: 'grass', count: [3, 5] },
    ],
    layoutType: id,
    ...(biome?.layoutParams ? { layoutParams: biome.layoutParams } : {}),
    objective: { kind: 'clear' },
    exits: [], map: { x: 0, y: 0 },
  });
}

// --- 3b. Interior layouts at CAVE scale ---------------------------------------
// mintCave rolls dungeon/labyrinth from caveLayouts at cavern arena sizes
// (~1200×900) — far smaller than group 3's representative def. Rooms, portal
// chambers, and door mouths must all still fit and connect down there.
for (const id of ['dungeon', 'labyrinth', 'edifice']) {
  runCase(`layout:${id}@cave`, {
    id: `qa_cave_${id}`, name: `QA cave ${id}`, level: 8,
    size: { w: 1150, h: 880 },
    theme: { floor: '#161616', grid: '#222', border: '#555', obstacle: '#333', obstacleEdge: '#666', accent: '#999' },
    layout: [
      { kind: 'rocks', count: [2, 4] }, { kind: 'grass', count: [2, 4] },
    ],
    layoutType: id,
    objective: { kind: 'clear' },
    exits: [], map: { x: 0, y: 0 },
  });
}

// --- 4. Every composition, FORCED (chance 1) ---------------------------------
// The tileset sweep exercises compositions probabilistically; this group pins
// every bundle at least once per seed over a representative liquid-y def (the
// water rows let shore-banded entries site). when-gates pass neutrally here
// (headless defs bake no geo) — exactly the authored contract.
for (const c of compositionDefs()) {
  runCase(`composition:${c.id}`, {
    id: `qa_comp_${c.id}`, name: `QA ${c.id}`, level: 8,
    size: { w: 2400, h: 1800 },
    theme: { floor: '#161616', grid: '#222', border: '#555', obstacle: '#333', obstacleEdge: '#666', accent: '#999' },
    layout: [
      { kind: 'rocks', count: [4, 7] }, { kind: 'trees', count: [5, 8] },
      { kind: 'water', count: [1, 2] }, { kind: 'grass', count: [3, 5] },
    ],
    compositions: [{ composition: c.id, chance: 1 }],
    objective: { kind: 'clear' },
    exits: [], map: { x: 0, y: 0 },
  });
}

// --- Report ------------------------------------------------------------------
let failTotal = registryErrors.length;
for (const msg of registryErrors) console.log(`REGISTRY FAIL: ${msg}`);
let warnTotal = 0;
for (const r of results) {
  failTotal += r.fails.length;
  warnTotal += r.warns.length;
  for (const f of r.fails) console.log(`FAIL: ${f}`);
  for (const w of r.warns) console.log(`warn: ${w}`);
  if (VERBOSE && !r.fails.length) {
    console.log(`ok   ${r.name} — ${r.doodads} doodads, ${r.ms.toFixed(1)}ms/seed`);
  }
}
const slow = results.filter(r => r.ms > 400);
for (const r of slow) console.log(`warn: ${r.name} slow (${r.ms.toFixed(0)}ms/seed)`);
console.log(`\ngenqa: ${results.length} cases × ${SEEDS} seeds — ${failTotal} fail(s), ${warnTotal + slow.length} warn(s)`);
process.exit(failTotal ? 2 : 0);
