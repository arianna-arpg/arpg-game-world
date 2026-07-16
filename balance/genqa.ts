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
//              (exemptions mirror the splice EXACTLY: keep-tagged waiver
//              pieces, doors, plan-structure rects — a bare reservation
//              shields nothing from the carve)
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
import { generateZone, randomizeStarterWeb, spacedExitAt, MIN_PORTAL_SEP } from '../src/engine/worldgen';
import {
  generateLayout, validateStamps, validateCompositions, compositionDefs,
  doodadRuleOf, layoutIds, blocksMovement, normalizeDoodadBound,
  type Doodad, type GeneratedLayout,
} from '../src/engine/levelgen';
import { shapeBoundR } from '../src/engine/shapes';
import { GridWalkField } from '../src/world/gridWalk';
import { regionKind } from '../src/world/regions';
import { TILESETS } from '../src/data/tilesets';
import { ZONES, type StampSpec, type ZoneDef } from '../src/data/zones';
import { MELDS } from '../src/data/melds';
import { blendFieldIds, composeBlendLayout, hasBlendField } from '../src/engine/blend';
import { hollowDef, hollowShapeOf } from '../src/data/hollows';
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
  // GROUND REQUIRED inverse (DoodadRule.voidOk): on a grid, no doodad stands
  // with its center over a VOID-LIKE cell (open sky, chasm — !walkable &&
  // !blocks) unless its rule opts out. The outcome-side of the placement
  // gate, exactly like the forbidOn inverse above.
  if (layout.walk instanceof GridWalkField) {
    const floating = new Set<string>();
    for (const d of doodads) {
      if (doodadRuleOf(d.kind).voidOk) continue;
      const rk = regionKind(layout.walk.regionAt(d.pos.x, d.pos.y));
      if (rk && !rk.walkable && !rk.blocks) floating.add(d.kind);
    }
    if (floating.size) fails.push(`${name}: doodad(s) floating over void (${[...floating].join(', ')})`);
  }
  // Portal clears: CONVEX zones only — the splice contract. Grid layouts'
  // promise is reachability (asserted below); their blockers may legally
  // neighbor a portal the flow-field routes around. The exemption set here
  // (keep / door / structure rect) IS the splice's, one-for-one — reserved
  // footprints deliberately absent on BOTH sides, so scatter a later
  // reservation covers is carved like any other (probe_portal_contract.ts
  // pins the alignment).
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
  // HOLLOWS (the hollows fabric): every recorded secret must be SEALED — its
  // carve rect entirely non-walkable (identity is the disguise), its seams
  // present and sharing its id (a pocket one, a passage two), and its reveal
  // kind registered. The seam is the only door.
  if (layout.hollows?.length) {
    const wf = layout.walk instanceof GridWalkField ? layout.walk : null;
    if (!wf) fails.push(`${name}: hollows recorded on a convex layout`);
    const ids = new Set<string>();
    for (const h of layout.hollows) {
      if (ids.has(h.id)) fails.push(`${name}: duplicate hollow id '${h.id}'`);
      ids.add(h.id);
      if (!hollowDef(h.kind)) fails.push(`${name}: hollow '${h.id}' names unregistered kind '${h.kind}'`);
      const seams = doodads.filter(d => d.hollow === h.id);
      const wantSeams = hollowShapeOf(h.kind) === 'passage' ? 2 : 1;
      if (seams.length !== wantSeams) {
        fails.push(`${name}: hollow '${h.id}' (${h.kind}) has ${seams.length} seam(s), wants ${wantSeams}`);
      }
      if (wf) {
        let leak = false;
        for (let y = h.rect.y + wf.cell / 2; y < h.rect.y + h.rect.h && !leak; y += wf.cell) {
          for (let x = h.rect.x + wf.cell / 2; x < h.rect.x + h.rect.w && !leak; x += wf.cell) {
            if (wf.isWalkable(x, y)) leak = true;
          }
        }
        if (leak) fails.push(`${name}: hollow '${h.id}' rect holds walkable ground — the secret leaks`);
      }
    }
    // Every seam doodad must point at a recorded hollow (no orphans).
    for (const d of doodads) {
      if (d.hollow && !ids.has(d.hollow)) fails.push(`${name}: seam doodad points at unknown hollow '${d.hollow}'`);
    }
  }
  // HIT-SURFACE fabric invariants (engine/shapes.ts):
  //  - every door doodad carries an authored slab rect that stays INSIDE its
  //    cells rect (the slab is the door you see, never wider than the breach);
  //  - any authored/rule surface keeps the broad-phase promise after
  //    normalizeDoodadBound: shapeBoundR(surface) ≤ max(radius, boundR), or
  //    spatial-index queries near a slab corner would miss the doodad.
  for (const d of doodads) {
    normalizeDoodadBound(d);
    if (d.hitbox) {
      const bound = Math.max(d.radius, d.boundR ?? 0);
      if (shapeBoundR(d.hitbox) > bound + 0.01) {
        fails.push(`${name}: ${d.kind} hitbox bound ${shapeBoundR(d.hitbox).toFixed(1)} exceeds broad-phase ${bound.toFixed(1)}`);
        break;
      }
    }
    if (d.kind === 'door') {
      const c = d.door?.cells;
      if (!d.hitbox || d.hitbox.kind !== 'rect') {
        fails.push(`${name}: door ${d.door?.id ?? '?'} lacks its slab rect hitbox`);
        break;
      }
      if (c && (d.hitbox.hw > c.w / 2 + 0.01 || d.hitbox.hh > c.h / 2 + 0.01)) {
        fails.push(`${name}: door ${d.door?.id ?? '?'} slab (${d.hitbox.hw.toFixed(0)}×${d.hitbox.hh.toFixed(0)}) pokes past its cells (${c.w}×${c.h})`);
        break;
      }
    }
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
  // Biome-meld rows are ordinary stamp rows the edge-band builder emits —
  // an unregistered kind here would silently skip at generation time.
  ...Object.values(MELDS).map(m => ({ source: `meld ${m.id}`, specs: m.rows as StampSpec[] })),
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
  // A biome naming an edge dressing must name a REGISTERED one.
  ...Object.entries(BIOMES).flatMap(([id, b]) =>
    b.meld && !MELDS[b.meld] ? [`biome ${id}: unregistered meld '${b.meld}'`] : []),
  // THE BLEND FABRIC: every declared partner/field must resolve (a bad ref
  // no-ops silently at mint — this is where it fails loudly instead).
  ...Object.values(TILESETS).flatMap(t =>
    [{ tag: '', roll: t.blend }, ...(t.variants ?? []).map(v => ({ tag: ` variant '${v.name}'`, roll: v.blend ?? undefined }))]
      .flatMap(({ tag, roll }) => !roll ? [] : [
        ...(!TILESETS[roll.with] ? [`tileset ${t.id}${tag}: unregistered blend partner '${roll.with}'`] : []),
        ...(roll.with === t.id ? [`tileset ${t.id}${tag}: blend partner is itself`] : []),
        ...(!hasBlendField(roll.field.kind) ? [`tileset ${t.id}${tag}: unregistered blend field '${roll.field.kind}'`] : []),
      ])),
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

// --- 3b². HOLLOWS forced on every face that budgets them ----------------------
// The hollows fabric only fires on GRID layouts, and the tileset cases above
// run their default (usually convex) generator — so force each hollow-
// budgeted tileset through 'rooms' at cave scale with a fat budget, and let
// checkLayout's hollow invariants (sealed rect, seam zip, registered kinds)
// bite on real placements.
for (const ts of Object.values(TILESETS)) {
  if (!ts.hollows) continue;
  runCase(`hollows:${ts.id}`, {
    id: `qa_hollows_${ts.id}`, name: `QA hollows ${ts.id}`, level: 8,
    size: { w: 1300, h: 1000 },
    theme: ts.theme,
    layout: [...(ts.common ?? []), ...ts.layout],
    layoutType: 'rooms',
    hollows: { count: [2, 3], table: ts.hollows.table },
    objective: { kind: 'clear' },
    exits: [], map: { x: 0, y: 0 },
  });
}

// --- 3c. BOUNDARY GATES on every enclave biome's layouts ----------------------
// Live, the World stamps def.exitBoundaries at load (placeExit's prediction
// seam); headless defs author it directly so the gate composable — façade,
// throat, doodad splice, reservation, floor bake — is exercised against BOTH
// the enclave's own interiors (the inside face) and representative open
// layouts (the outside face), with the reachability invariant holding through
// the mouth. Auto-derives from BiomeInfo.enclave: a future walled biome joins
// this group the day it is tagged, unedited.
for (const [biomeId, b] of Object.entries(BIOMES)) {
  if (!b.enclave) continue;
  const faces = [...new Set([...Object.keys(b.allowedLayouts ?? {}), 'plains', 'riverland'])];
  for (const layoutId of faces) {
    runCase(`boundary:${biomeId}@${layoutId}`, {
      id: `qa_bgate_${biomeId}_${layoutId}`, name: `QA gate ${layoutId}`, level: 8,
      size: { w: 2400, h: 1800 },
      theme: { floor: '#161616', grid: '#222', border: '#555', obstacle: '#333', obstacleEdge: '#666', accent: '#999' },
      layout: [
        { kind: 'rocks', count: [4, 7] },
        { kind: 'water', count: [1, 2] }, { kind: 'grass', count: [3, 5] },
      ],
      layoutType: layoutId,
      ...(b.layoutParams ? { layoutParams: b.layoutParams } : {}),
      // Both of runCase's generated exits wear the gate (the hook reads
      // positions from ctx.exits, ids from this array — def.exits stays []).
      exitBoundaries: [b.enclave.gate, b.enclave.gate],
      objective: { kind: 'clear' },
      exits: [], map: { x: 0, y: 0 },
    });
  }
}

// --- 3d. HOLDFAST GATE + KEPT ROAD over representative layout families --------
// Live, a Holdfast's locked bonus exit wears its guardian's gate ('toll_gate')
// through the SAME exitBoundaries seam the enclaves use, plus an exitRoads
// entry that carves the traveled way source-portal → gate mouth. Headless
// defs author both annotations directly so the road composable — the wander,
// the artery reservation, the corridor CUT through walled layouts, the
// gate-aware endpoint — is exercised over open, canopy, carved-grid and
// liquid families with every invariant (portals, reachability, inverse
// forbidOn, determinism) holding through it.
for (const layoutId of ['plains', 'forest', 'winding', 'riverland']) {
  runCase(`holdfast:${layoutId}`, {
    id: `qa_holdfast_${layoutId}`, name: `QA toll ${layoutId}`, level: 6,
    size: { w: 2400, h: 1800 },
    theme: { floor: '#161616', grid: '#222', border: '#555', obstacle: '#333', obstacleEdge: '#666', accent: '#999' },
    layout: [
      { kind: 'rocks', count: [4, 7] },
      { kind: 'water', count: [1, 2] }, { kind: 'grass', count: [3, 5] },
    ],
    layoutType: layoutId,
    // Exit 0 is the holdfast: it wears the toll gate AND receives the road.
    exitBoundaries: ['toll_gate', undefined],
    exitRoads: [{ from: 'entry' }, undefined],
    objective: { kind: 'clear' },
    exits: [], map: { x: 0, y: 0 },
  });
}

// --- 3e. BIOME MELDS over open + carved-grid layout families ------------------
// Live, the World stamps def.exitMelds at load (placeExit's prediction seam —
// the third rider on the gates/roads annotation fabric); headless defs author
// it directly so the edge-band composable — the axis WHERE gate, the dedicated
// per-exit rng, every placement rule — is exercised over an open family and
// the jungle's own carved thicket, with all invariants (portals, reachability,
// inverse forbidOn, byte determinism) holding through it. Auto-derives from
// the MELDS registry: a future biome's edge dressing joins this group the day
// it registers, unedited.
for (const m of Object.values(MELDS)) {
  for (const layoutId of ['plains', 'thicket']) {
    runCase(`meld:${m.id}@${layoutId}`, {
      id: `qa_meld_${m.id}_${layoutId}`, name: `QA meld ${layoutId}`, level: 6,
      size: { w: 2400, h: 1800 },
      theme: { floor: '#161616', grid: '#222', border: '#555', obstacle: '#333', obstacleEdge: '#666', accent: '#999' },
      layout: [
        { kind: 'rocks', count: [4, 7] },
        { kind: 'water', count: [1, 2] }, { kind: 'grass', count: [3, 5] },
      ],
      layoutType: layoutId,
      // Both generated exits wear the foreign kit (the hook reads positions
      // from ctx.exits, ids from this array — def.exits stays []).
      exitMelds: [m.id, m.id],
      objective: { kind: 'clear' },
      exits: [], map: { x: 0, y: 0 },
    });
  }
}

// --- 3f. THE BLEND FABRIC (engine/blend.ts) ------------------------------------
// Two sweeps, both self-extending:
//  (a) every registered FIELD SHAPE over a derived tileset pair (the first two
//      frontier tilesets by id — no pair is special-cased), across an open and
//      a carved-grid family: the compose (side-tagged rows), the findSpot
//      dither gate, and the 'blend' WHERE field all run under every invariant
//      (portals, reachability, inverse forbidOn, byte determinism);
//  (b) every tileset that DECLARES a blend (tileset-level or variant override)
//      generates with it forced on — the day a blended tileset registers, its
//      real composition joins the sweep unedited.
{
  const frontierIds = Object.values(TILESETS)
    .filter(t => t.frontier !== false && !t.boundless)
    .map(t => t.id).sort();
  const [qaBaseId, qaPartnerId] = frontierIds;
  const qaBase = TILESETS[qaBaseId], qaPartner = TILESETS[qaPartnerId];
  if (qaBase && qaPartner) {
    for (const kind of blendFieldIds()) {
      for (const layoutId of ['plains', 'dungeon']) {
        runCase(`blend:${kind}@${layoutId}`, {
          id: `qa_blend_${kind}_${layoutId}`, name: `QA blend ${kind}`, level: 8,
          size: { w: 2000, h: 1500 },
          theme: qaBase.theme,
          layout: composeBlendLayout([...(qaBase.common ?? []), ...qaBase.layout], qaPartner),
          layoutType: layoutId,
          blend: { with: qaPartner.id, field: { kind } },
          objective: { kind: 'clear' },
          exits: [], map: { x: 0, y: 0 },
        });
      }
    }
  }
  for (const ts of Object.values(TILESETS)) {
    const rolls: { tag: string; roll: NonNullable<typeof ts.blend> }[] = [
      ...(ts.blend ? [{ tag: 'base', roll: ts.blend }] : []),
      ...(ts.variants ?? []).flatMap(v => v.blend ? [{ tag: v.name, roll: v.blend }] : []),
    ];
    for (const { tag, roll } of rolls) {
      const partner = TILESETS[roll.with];
      if (!partner) continue; // the registry sweep already flagged it
      const variant = ts.variants?.find(v => v.name === tag);
      const rows = variant ? variant.layout : ts.layout;
      const layoutType = ts.forceLayout
        ?? (ts.caveLayouts ? Object.entries(ts.caveLayouts).sort((a, b) => b[1] - a[1])[0][0] : undefined);
      runCase(`blend:${ts.id}/${tag}`, {
        id: `qa_blend_${ts.id}_${tag.replace(/\W+/g, '_')}`, name: `QA blend ${ts.id}`, level: 8,
        size: { w: mid(ts.sizeW), h: mid(ts.sizeH) },
        theme: ts.theme,
        layout: composeBlendLayout([...(ts.common ?? []), ...rows], partner),
        ...(layoutType ? { layoutType } : {}),
        ...(ts.layoutParams ? { layoutParams: ts.layoutParams } : {}),
        blend: { with: roll.with, field: roll.field, ...(roll.packs !== undefined ? { packs: roll.packs } : {}) },
        objective: { kind: 'clear' },
        exits: [], map: { x: 0, y: 0 },
      });
    }
  }
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

// --- 5. EXIT SPACING — the worldgen graph layer's promise ---------------------
// Drives the REAL graph builder (randomizeStarterWeb → generateZone charts,
// with their back-edges, frontier deals, weaves and reciprocals) plus the
// guarded append paths (spacedExitAt — holdfast bonus exits, the Field
// frontier spread), and asserts the promise the live dwell relies on: every
// pair of a def's exits resolves to portal PIXELS ≥ MIN_PORTAL_SEP apart,
// corner collisions included. Two stacked portals leave one un-dwellable —
// the "can't choose which zone I enter" hard-lock this net exists to catch.
// placeExit's edge math is mirrored below (the harness asserts the OBSERVABLE
// promise); MIN_PORTAL_SEP itself is imported — it's the engine's public
// contract now, shared with world.ts's live resolve.
const P_INSET = 90; // mirror of worldgen PORTAL_EDGE_INSET (placeExit's edge math)
function portalPixel(side: 'n' | 's' | 'e' | 'w', at: number, size: { w: number; h: number }): { x: number; y: number } {
  const cx = Math.min(Math.max(size.w * at, P_INSET), size.w - P_INSET);
  const cy = Math.min(Math.max(size.h * at, P_INSET), size.h - P_INSET);
  return side === 'n' ? { x: cx, y: P_INSET } : side === 's' ? { x: cx, y: size.h - P_INSET }
    : side === 'w' ? { x: P_INSET, y: cy } : { x: size.w - P_INSET, y: cy };
}
function checkExitSpacing(label: string, def: Pick<ZoneDef, 'exits' | 'size'>, fails: string[]): void {
  for (let i = 0; i < def.exits.length; i++) {
    for (let j = i + 1; j < def.exits.length; j++) {
      const a = def.exits[i], b = def.exits[j];
      const pa = portalPixel(a.side, a.at ?? 0.5, def.size), pb = portalPixel(b.side, b.at ?? 0.5, def.size);
      const d = Math.hypot(pa.x - pb.x, pa.y - pb.y);
      if (d < MIN_PORTAL_SEP - 0.5) {
        fails.push(`${label}: exits ${i} (${a.side}@${(a.at ?? 0.5).toFixed(2)}→${a.to}) and `
          + `${j} (${b.side}@${(b.at ?? 0.5).toFixed(2)}→${b.to}) only ${d.toFixed(0)}px apart `
          + `(< ${MIN_PORTAL_SEP}) on a ${def.size.w}×${def.size.h} zone`);
      }
    }
  }
}
if (!FILTER || 'exit-spacing'.includes(FILTER)) {
  const fails: string[] = [];
  const t0 = performance.now();
  const webs = SEEDS * 2;
  let charted = 0;
  for (let w = 0; w < webs; w++) {
    // Fresh deep clones — ZONES defs are module singletons; a probe web must
    // never share their exits arrays (the cloneZones by-reference trap).
    const zoneMap: Record<string, ZoneDef> = {};
    for (const [id, z] of Object.entries(ZONES)) {
      zoneMap[id] = { ...z, exits: z.exits.map(e => ({ ...e })), size: { ...z.size }, map: { ...z.map } };
    }
    randomizeStarterWeb(zoneMap, (0x5eed + w * 7919) >>> 0);
    const rng = new Rng((0xac3 + w) >>> 0);
    let genIdx = 1000 + w * 100;
    // Chart '?' frontiers the way travel does, ~12 mints per web (the weave
    // machinery runs inside generateZone — reciprocals and all).
    for (let step = 0; step < 12; step++) {
      const openDefs = Object.values(zoneMap).filter(z => z.exits.some(e => e.to === '?' && !e.lock));
      if (!openDefs.length) break;
      const src = openDefs[rng.int(0, openDefs.length - 1)];
      const e = src.exits.find(x => x.to === '?' && !x.lock)!;
      const gen = generateZone(src, e, zoneMap, genIdx++);
      zoneMap[gen.id] = gen;
      e.to = gen.id;
      charted++;
    }
    // The graph layer's own deals + weaves…
    for (const z of Object.values(zoneMap)) checkExitSpacing(`web ${w} zone ${z.id}`, z, fails);
    // …then the GUARDED append paths, stressed. Holdfast-style: the overlay's
    // real raw at-candidates, pushed through the spacing guard, twice per zone.
    for (const z of Object.values(zoneMap)) {
      for (let k = 0; k < 2; k++) {
        const side = rng.pick(['n', 's', 'e', 'w'] as const);
        const at = rng.pick([0.2, 0.32, 0.68, 0.8]);
        z.exits.push({ to: '?', side, at: spacedExitAt(z, side, at) });
      }
      checkExitSpacing(`web ${w} zone ${z.id} +holdfast-appends`, z, fails);
    }
    // Field-style spread: keep the real roads, re-deal 2-per-side frontiers
    // through the guard (mirrors world.fieldifyZone's rebuild).
    for (const z of Object.values(zoneMap)) {
      const reals = z.exits.filter(x => x.to !== '?').map(e => ({ ...e }));
      if (!reals.length) continue;
      const rebuilt = { exits: reals, size: z.size };
      for (const side of ['n', 's', 'e', 'w'] as const) {
        for (const at of [0.3, 0.7]) rebuilt.exits.push({ to: '?', side, at: spacedExitAt(rebuilt, side, at) });
      }
      checkExitSpacing(`web ${w} zone ${z.id} field-spread`, rebuilt, fails);
    }
  }
  results.push({ name: 'exit-spacing:webs', seeds: webs, doodads: charted,
    ms: (performance.now() - t0) / Math.max(1, webs), fails, warns: [] });
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
