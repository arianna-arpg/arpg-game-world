// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE LAKE zone type (Scald Basin M2a), end to end on the real
// registries and the real engine (charter docs/design/scald-basin.md §3/§6,
// card 1 ratified; recipe engine/lake.ts — id `lakeshore`; drawn half
// render/vis/lakeLayer.ts; kit rows data/scald.ts; docs docs/engine/lake.md).
// Pins:
//   A  THE REGISTRY + THE ROWS: the recipe stands under `lakeshore` (THE
//      UNIQUE-ID LAW — `lake` is the furniture landmark's id, and the two
//      never share a registry), the liquids 'sulphur' / 'sulphur_deep' +
//      the generic 'lake_shallows' / 'lake_deep' are registered and named
//      (no orphan), the SHELF row law (wading, the pool's sting at a lighter
//      amount, a lighter fire DoT through res, the scorch feed, NO douse —
//      the brine-sink law, a priced detour), the DEEP row law (refused as
//      ground through an EJECT — never a fall-family policy, which caves
//      turn into pit doors — shots AND sight passing, the broil as its
//      visual word, jump/blink crossing), the generic twins, the heart
//      face's PIN (forceLayout + the liquids + the vent + the LARGE size),
//      and ABSENT == IDENTICAL: no other face or biome names the recipe.
//   B  THE CARVE (headless generateLayout on the face): a lake stands; the
//      deep is ONE component around the arena center; CLASSIFY-BEFORE-PAINT
//      (every painted cell == the plan's class — the deep is never carved);
//      THE RING (every exit + every isle POI reachable from the entry, isles
//      stand in the shelf band); DETERMINISM (same seed → the same grid,
//      doodads and vent); the authored GREAT vent offshore on its isle (the
//      only authored row, on ground, ringed by water, between the deep's rim
//      and the lake's); the waterline dress stands on land and no blocker
//      stands on water; the generic bare recipe (genqa's case shape) pours
//      lake_shallows + lake_deep; the `deepPolicy: 'swim'` dial pours
//      deep_water (walkable); a LYING row falls back with a warning;
//      ALL-OR-NOTHING (a zone too small refuses and stays byte-flat: every
//      cell ground, the kit still scattered); THE SHORE LANDING (a center
//      entry moves to the nearest shore; a portal entry never moves); an
//      ellipse arena keeps every water cell inside its rim.
//   C  DRAWN == TESTED: the broil seat resolver (the renderer's own) seats
//      only on interior sulphur_deep cells — every seat refuses a body — the
//      resolver is pure, the simmer stays inside its band, the generic deep
//      (drift) seats NOTHING (the broil is the sulphur word), and the source
//      wiring holds: the vent's broil and the lake's both draw through ONE
//      drawRoil, the renderer's animated pass speaks 'broil'.
//   D  LIVE (the real mint path): the heart face mints a lake through
//      devMintTileset (tileset, recipe, the two waters on the live grid, the
//      plan kept), the authored great vent stands in the world's field as a
//      PRIVATE anchor band (the metronome law) at the plan's seat, the deep
//      REFUSES the hero (walking at the middle never stands on a deep cell;
//      the eject fires and scalds), a SHOT crosses the deep where no body can
//      (lineOfFire true across the middle — and sight too), the SHELF wades +
//      stings + wounds + climbs the scorch bar, the live grid's broil seats
//      are all non-walkable deep cells, and the geyser_fields face mints NO
//      lake (absent == identical on the sibling face).
// Run: npx tsx balance/probe_lake.ts
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { Rng, withSeededRandom } from '../src/core/rng';
import { vec, type Vec2 } from '../src/core/math';
import { generateLayout, hasLayout, hasLandmark, layoutIds, blocksMovement } from '../src/engine/levelgen';
import { liquidIds, liquidOf } from '../src/engine/genkit';
import { genPins } from '../src/engine/genPins';
import { LAKE_CFG, LAKE_CELL, LAKE_PLANS } from '../src/engine/lake';
import { broilSeatsIn, broilSimmerAt, LAKE_BROIL_CFG } from '../src/render/vis/lakeLayer';
import { GridWalkField } from '../src/world/gridWalk';
import { insideBounds } from '../src/world/shape';
import { regionKind } from '../src/world/regions';
import { BIOMES } from '../src/world/biomes';
import { TILESETS } from '../src/data/tilesets';
import type { ZoneDef } from '../src/data/zones';


let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();

const DT = 1 / 60;
const FACE = TILESETS.sulphur_pools;
const RECIPE = 'lakeshore';

/** A headless def on the heart face at its mid size (genqa's own case shape). */
const faceDef = (seed: number, over?: Partial<ZoneDef> & { w?: number; h?: number }): ZoneDef => {
  const w = over?.w ?? 4100, h = over?.h ?? 3000;
  return {
    id: `probe_lake_${seed}_${w}x${h}${over?.shape ? '_' + over.shape : ''}`, name: 'Probe lake', level: 8, seed,
    biome: 'scald', size: { w, h }, theme: FACE.theme, layout: FACE.layout,
    layoutType: RECIPE, layoutParams: FACE.layoutParams,
    exits: [], map: { x: 2, y: 2 }, objective: { kind: 'clear' },
    ...over,
  } as unknown as ZoneDef;
};
const portals = (w: number, h: number): { entry: Vec2; exits: Vec2[] } => ({
  entry: vec(120, h / 2),
  exits: [vec(w - 40, h * 0.4), vec(w * 0.5, 40), vec(w * 0.3, h - 40)],
});
const regionCounts = (wf: GridWalkField): Record<string, number> => {
  const out: Record<string, number> = {};
  for (let gy = 0; gy < wf.rows; gy++) {
    for (let gx = 0; gx < wf.cols; gx++) {
      const id = wf.regionAt((gx + 0.5) * wf.cell, (gy + 0.5) * wf.cell);
      out[id] = (out[id] ?? 0) + 1;
    }
  }
  return out;
};
const snap = (wf: GridWalkField, p: Vec2): Vec2 => wf.isWalkable(p.x, p.y) ? vec(p.x, p.y) : wf.snapToWalkable(vec(p.x, p.y));
const fp = (ds: { kind: string; pos: { x: number; y: number } }[]): string =>
  JSON.stringify(ds.map(d => [d.kind, Math.round(d.pos.x), Math.round(d.pos.y)]));

// --------------------------------------------- A) the registry + the rows --
{
  check('A1 recipe: `lakeshore` is a registered layout — and `lake` stays the furniture LANDMARK, never a layout (THE UNIQUE-ID LAW)',
    hasLayout(RECIPE) && layoutIds().includes(RECIPE) && hasLandmark('lake') && !hasLayout('lake'));
  const ids = liquidIds();
  check('A2 liquids: sulphur → sulphur_shelf, sulphur_deep → sulphur_deep; the generic lake_shallows / lake_deep / deep_water all registered',
    liquidOf('sulphur').region === 'sulphur_shelf' && liquidOf('sulphur_deep').region === 'sulphur_deep'
    && ['lake_shallows', 'lake_deep', 'deep_water'].every(id => ids.includes(id)));
  const pins = genPins().filter(p => p.registry === 'liquid').map(p => p.id);
  check('A3 pins: the recipe declares its default liquids to the orphan census (lake_shallows, lake_deep, deep_water)',
    ['lake_shallows', 'lake_deep', 'deep_water'].every(id => pins.includes(id)), pins.join(','));
  const shelf = regionKind('sulphur_shelf'), pool = regionKind('sulphur_pool'), deep = regionKind('sulphur_deep');
  check('A4 shelf row: wadeable, the mire band, a LIGHTER fire DoT than the pool through res, the SAME sting id at a lighter amount',
    !!shelf && shelf.walkable && shelf.standStatus === 'wading' && shelf.severity === 30
    && shelf.standDamage?.type === 'fire' && (shelf.standDamage?.dps ?? 99) < (pool?.standDamage?.dps ?? 0)
    && shelf.enterStatus?.id === 'sulphur_sting' && (shelf.enterStatus?.amount ?? 99) < (pool?.enterStatus?.amount ?? 0));
  check('A5 shelf row: FEEDS the scorch bar (the fill route), NO douse (the brine-sink law), a priced detour',
    shelf?.survival?.resource === 'scorch' && (shelf?.survival?.drain ?? 0) > 0 && shelf?.douses === undefined && (shelf?.pathCost ?? 1) > 1.5);
  check('A6 deep row: refused as ground — not walkable, not blocking, an EJECT boundary (never a fall-family policy: caves turn those into pit doors)',
    !!deep && !deep.walkable && !deep.blocks && deep.boundaryPolicy?.kind === 'eject'
    && (deep.boundaryPolicy.kind === 'eject' ? (deep.boundaryPolicy.damage?.type === 'fire') : false));
  check('A7 deep row: SHOTS and SIGHT pass (no blocksShot / blocksSight), jump/blink cross it, and it wears THE BROIL (animate broil + a crust rim)',
    !!deep && !deep.blocksShot && !deep.blocksSight
    && !!deep.crossableBy?.({ ignoreFall: true } as never) && !!deep.crossableBy?.({ ignoreConfine: true } as never)
    && deep.visual?.animate === 'broil' && !!deep.visual?.edge);
  const gd = regionKind('lake_deep'), gs = regionKind('lake_shallows');
  check('A8 generic twins: lake_deep refuses (eject, no blocksShot, drifts — no broil: that is the sulphur word); lake_shallows wades and DOUSES (the water row\'s grammar)',
    !!gd && !gd.walkable && !gd.blocks && gd.boundaryPolicy?.kind === 'eject' && !gd.blocksShot && gd.visual?.animate !== 'broil'
    && !!gs && gs.walkable && gs.standStatus === 'wading' && !!gs.douses);
  const lp = (FACE.layoutParams ?? {}) as Record<string, unknown>;
  check('A9 the pin: the heart face pins the recipe, names both waters, blocks the deep, authors the great vent, and runs LARGE',
    FACE.forceLayout === RECIPE && lp.lakeLiquid === 'sulphur' && lp.deepPolicy === 'block' && lp.deepLiquid === 'sulphur_deep'
    && lp.lakeVent === 'great' && FACE.sizeW[0] >= 3600 && FACE.sizeH[0] >= 2600, `${FACE.sizeW}×${FACE.sizeH}`);
  const otherPins = Object.values(TILESETS).filter(t => t.id !== 'sulphur_pools' && t.forceLayout === RECIPE).map(t => t.id);
  const biomePins = Object.entries(BIOMES).filter(([, b]) => RECIPE in (b.allowedLayouts ?? {})).map(([id]) => id);
  check('A10 absent == identical: no other face pins the recipe and no biome rolls it — a lake mints ONLY through the heart face',
    otherPins.length === 0 && biomePins.length === 0, `faces ${otherPins.join(',') || '-'} biomes ${biomePins.join(',') || '-'}`);
}

// ------------------------------------------------------------ B) the carve --
{
  for (const seed of [11, 47, 90210]) {
    const def = faceDef(seed);
    const { entry, exits } = portals(4100, 3000);
    const a = generateLayout(def, { w: 4100, h: 3000 }, new Rng(seed), vec(entry.x, entry.y), exits.map(e => vec(e.x, e.y)));
    const wf = a.walk as GridWalkField;
    const plan = LAKE_PLANS.get(def.id);
    const counts = regionCounts(wf);
    check(`B1 [${seed}] a lake stands: plan kept, not refused, deep + shelf poured`,
      !!plan && !plan.refused && (counts.sulphur_deep ?? 0) > 200 && (counts.sulphur_shelf ?? 0) > 200, JSON.stringify(counts));
    if (!plan || plan.refused) continue;
    // THE DEEP IS ONE BODY around the center: flood from the center cell over
    // deep cells; every deep cell must be reached.
    const cols = wf.cols, rows = wf.rows, cell = wf.cell;
    const isDeep = (gx: number, gy: number): boolean => gx >= 0 && gy >= 0 && gx < cols && gy < rows
      && wf.regionAt((gx + 0.5) * cell, (gy + 0.5) * cell) === 'sulphur_deep';
    const seen = new Uint8Array(cols * rows);
    const cx0 = Math.floor(plan.cx / cell), cy0 = Math.floor(plan.cy / cell);
    let reached = 0;
    if (isDeep(cx0, cy0)) {
      const q: number[] = [cy0 * cols + cx0];
      seen[cy0 * cols + cx0] = 1;
      while (q.length) {
        const i = q.pop()!;
        reached++;
        const gx = i % cols, gy = Math.floor(i / cols);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = gx + dx, ny = gy + dy;
          if (!isDeep(nx, ny) || seen[ny * cols + nx]) continue;
          seen[ny * cols + nx] = 1;
          q.push(ny * cols + nx);
        }
      }
    }
    check(`B2 [${seed}] the deep is ONE component holding the arena center`, reached === (counts.sulphur_deep ?? -1), `${reached}/${counts.sulphur_deep}`);
    // CLASSIFY-BEFORE-PAINT: every cell's painted region is the plan's class.
    let mismatches = 0;
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const k = plan.classes[gy * cols + gx];
        const id = wf.regionAt((gx + 0.5) * cell, (gy + 0.5) * cell);
        const want = k === LAKE_CELL.deep ? 'sulphur_deep' : k === LAKE_CELL.shelf ? 'sulphur_shelf' : 'ground';
        // 2026-08-21 (M3 THE CISTERN — data/cistern.ts): the under-tier tail
        // may sink a STORY under the great shoal AFTER the recipe (the face
        // dials `underTier: 'cistern'`); those cells wear the story's tier
        // rows over the plan's 'ground' — legal ONLY over isle/spit class
        // (the chamber never repaints a drop of water: probe_cistern pins the
        // chamber ⊂ shoal). The lake's own classify-before-paint law is
        // untouched; a tier row over water or land would still be a mismatch.
        const rk = regionKind(id);
        if (rk && (rk.tier || rk.tierLink)) {
          if (k !== LAKE_CELL.isle && k !== LAKE_CELL.spit) mismatches++;
          continue;
        }
        if (id !== want) mismatches++;
      }
    }
    check(`B3 [${seed}] classify-before-paint: every painted cell IS its planned class (the deep never carved, isles/spits ground)`, mismatches === 0, `${mismatches} mismatches`);
    const en = snap(wf, entry);
    check(`B4 [${seed}] THE RING: every exit reachable from the entry over walkable ground`,
      exits.every(e => wf.reachable(en, snap(wf, e))));
    check(`B5 [${seed}] isles: ≥ 2 isle POIs, each reachable (through the wading shelf or a spit) and seated IN the shelf band`,
      plan.isles.length >= 2 && a.pois.every(p => wf.reachable(en, snap(wf, p)))
      && plan.isles.every(i => {
        const th = Math.atan2(i.pos.y - plan.cy, i.pos.x - plan.cx);
        const d = Math.hypot(i.pos.x - plan.cx, i.pos.y - plan.cy);
        return d > plan.deepAt(th) && d < plan.rimAt(th) && wf.isWalkable(i.pos.x, i.pos.y);
      }), `${plan.isles.length} isles`);
    // DETERMINISM: the same seed twice → identical grid + doodads + vent.
    const b = generateLayout(def, { w: 4100, h: 3000 }, new Rng(seed), vec(entry.x, entry.y), exits.map(e => vec(e.x, e.y)));
    const wb = b.walk as GridWalkField;
    let sameGrid = wb.kind.length === wf.kind.length;
    for (let i = 0; i < wf.kind.length && sameGrid; i++) if (wf.kind[i] !== wb.kind[i]) sameGrid = false;
    const va = a.authoredVents?.[0], vb = b.authoredVents?.[0];
    check(`B6 [${seed}] determinism: same seed → the same lake (grid), the same doodads, the same vent seat`,
      sameGrid && fp(a.doodads) === fp(b.doodads) && !!va && !!vb && va.pos.x === vb.pos.x && va.pos.y === vb.pos.y);
    // THE METRONOME: one authored great vent, offshore on its isle.
    const vents = a.authoredVents ?? [];
    const v = vents[0];
    let offshore = false;
    if (v) {
      const th = Math.atan2(v.pos.y - plan.cy, v.pos.x - plan.cx);
      const d = Math.hypot(v.pos.x - plan.cx, v.pos.y - plan.cy);
      const ringed = [0, Math.PI / 2, Math.PI, -Math.PI / 2].every(a2 => {
        const x = v.pos.x + Math.cos(a2) * (LAKE_CFG.metronome.isleR + 24), y = v.pos.y + Math.sin(a2) * (LAKE_CFG.metronome.isleR + 24);
        const id = wf.regionAt(x, y);
        return id === 'sulphur_shelf' || id === 'sulphur_deep';
      });
      offshore = d > plan.deepAt(th) && d < plan.rimAt(th) && wf.regionAt(v.pos.x, v.pos.y) === 'ground' && ringed;
    }
    check(`B7 [${seed}] the metronome: exactly ONE authored vent, class great, on its isle's ground, ringed by water, between the deep's rim and the lake's`,
      vents.length === 1 && v?.cls === 'great' && !v?.shared && offshore && !!plan.ventAt);
    // THE DRESS: shore pieces on land; no blocker on water; nothing on the deep.
    const dressKinds = ['sulphur_crust', 'sinter_shelf', 'steam_pocket'];
    const dress = a.doodads.filter(d => dressKinds.includes(d.kind as string));
    const onWater = (p: Vec2): boolean => { const id = wf.regionAt(p.x, p.y); return id === 'sulphur_shelf' || id === 'sulphur_deep'; };
    check(`B8 [${seed}] the waterline dress stands (crusts + shelves) and no BLOCKER stands on the water, nothing at all on the deep`,
      dress.length >= 10 && !a.doodads.some(d => blocksMovement(d) && onWater(d.pos))
      && !a.doodads.some(d => wf.regionAt(d.pos.x, d.pos.y) === 'sulphur_deep'), `${dress.length} dress pieces`);
  }
  // THE GENERIC RECIPE (genqa's bare layout case shape): no params → the
  // pinned defaults pour; the swim dial; a lying row; all-or-nothing.
  const bare = (id: string, params?: Record<string, unknown>, w = 2400, h = 1800): { def: ZoneDef; w: number; h: number } => ({
    def: {
      id, name: 'QA lake', level: 8, seed: 7,
      size: { w, h },
      theme: { floor: '#161616', grid: '#222', border: '#555', obstacle: '#333', obstacleEdge: '#666', accent: '#999' },
      layout: [{ kind: 'rocks', count: [4, 7] }, { kind: 'trees', count: [5, 8] }, { kind: 'water', count: [1, 2] }, { kind: 'grass', count: [3, 5] }],
      layoutType: RECIPE, ...(params ? { layoutParams: params } : {}),
      objective: { kind: 'clear' }, exits: [], map: { x: 0, y: 0 },
    } as unknown as ZoneDef, w, h,
  });
  {
    const { def, w, h } = bare('probe_lake_bare');
    const { entry, exits } = portals(w, h);
    const a = generateLayout(def, { w, h }, new Rng(7), vec(entry.x, entry.y), exits.map(e => vec(e.x, e.y)));
    const wf = a.walk as GridWalkField;
    const counts = regionCounts(wf);
    const plan = LAKE_PLANS.get(def.id);
    check('B9 bare: a param-less lake pours the pinned defaults (lake_shallows + lake_deep), authors NO vent, keeps the ring reachable',
      !!plan && !plan.refused && (counts.lake_shallows ?? 0) > 100 && (counts.lake_deep ?? 0) > 100
      && !(a.authoredVents?.length) && exits.every(e => wf.reachable(snap(wf, entry), snap(wf, e))), JSON.stringify(counts));
  }
  {
    const { def, w, h } = bare('probe_lake_swim', { deepPolicy: 'swim' });
    const { entry, exits } = portals(w, h);
    const a = generateLayout(def, { w, h }, new Rng(7), vec(entry.x, entry.y), exits.map(e => vec(e.x, e.y)));
    const wf = a.walk as GridWalkField;
    const counts = regionCounts(wf);
    const mid = wf.regionAt(w / 2, h / 2);
    check('B10 the swim dial: deepPolicy swim pours deep_water (walkable, breath-priced by standing law) — the middle can be had, at a price',
      (counts.deep_water ?? 0) > 100 && !(counts.lake_deep) && mid === 'deep_water' && wf.isWalkable(w / 2, h / 2)
      && regionKind('deep_water')?.survival?.resource === 'breath', JSON.stringify(counts));
  }
  {
    const { def, w, h } = bare('probe_lake_liar', { deepPolicy: 'block', deepLiquid: 'deep_water' });
    const { entry, exits } = portals(w, h);
    const warns: string[] = [];
    const orig = console.warn;
    console.warn = (...args: unknown[]): void => { warns.push(args.map(String).join(' ')); };
    let counts: Record<string, number> = {};
    try {
      const a = generateLayout(def, { w, h }, new Rng(7), vec(entry.x, entry.y), exits.map(e => vec(e.x, e.y)));
      counts = regionCounts(a.walk as GridWalkField);
    } finally { console.warn = orig; }
    check('B11 a LYING row (block + a walkable deepLiquid) warns and falls back to the policy default — the refusal is never quietly dropped',
      (counts.lake_deep ?? 0) > 100 && !(counts.deep_water) && warns.some(s => /deepLiquid/.test(s)), warns.join(' | ').slice(0, 160));
  }
  {
    const { def, w, h } = bare('probe_lake_tiny', undefined, 900, 700);
    const { entry, exits } = portals(w, h);
    const warns: string[] = [];
    const orig = console.warn;
    console.warn = (...args: unknown[]): void => { warns.push(args.map(String).join(' ')); };
    let a!: ReturnType<typeof generateLayout>;
    try {
      a = generateLayout(def, { w, h }, new Rng(7), vec(entry.x, entry.y), exits.map(e => vec(e.x, e.y)));
    } finally { console.warn = orig; }
    const wf = a.walk as GridWalkField;
    const counts = regionCounts(wf);
    const plan = LAKE_PLANS.get(def.id);
    const keys = Object.keys(counts);
    check('B12 ALL-OR-NOTHING: a zone too small REFUSES loudly and stays byte-flat — every cell ground, no water, no vent; the kit still scatters',
      !!plan?.refused && keys.length === 1 && keys[0] === 'ground' && !(a.authoredVents?.length) && a.doodads.length > 0
      && warns.some(s => /stands no lake/.test(s)), `refused: ${plan?.refused}`);
  }
  // THE SHORE LANDING + the portal entry.
  {
    const def = faceDef(5);
    const { exits } = portals(4100, 3000);
    const entry = vec(2050, 1500); // the no-back-portal center default
    const a = generateLayout(def, { w: 4100, h: 3000 }, new Rng(5), entry, exits.map(e => vec(e.x, e.y)));
    const wf = a.walk as GridWalkField;
    const plan = LAKE_PLANS.get(def.id)!;
    const moved = entry.x !== 2050 || entry.y !== 1500;
    check('B13 THE SHORE LANDING: a center entry (the no-back-portal default) moves to the nearest SHORE — dry, walkable, every exit reachable from it',
      moved && !!plan.landing && wf.regionAt(entry.x, entry.y) === 'ground' && wf.isWalkable(entry.x, entry.y)
      && exits.every(e => wf.reachable(entry, snap(wf, e))), `→ ${Math.round(entry.x)},${Math.round(entry.y)}`);
    const def2 = faceDef(5);
    const pe = vec(120, 1500);
    generateLayout(def2, { w: 4100, h: 3000 }, new Rng(5), pe, exits.map(e => vec(e.x, e.y)));
    check('B14 a portal entry on the ring never moves', pe.x === 120 && pe.y === 1500 && !LAKE_PLANS.get(def2.id)?.landing);
  }
  // THE ELLIPSE ARENA: the lake conforms to the rim.
  {
    const def = faceDef(23, { shape: 'ellipse' } as Partial<ZoneDef>);
    const { entry, exits } = portals(4100, 3000);
    const a = generateLayout(def, { w: 4100, h: 3000, shape: 'ellipse' } as { w: number; h: number }, new Rng(23), vec(entry.x, entry.y), exits.map(e => vec(e.x, e.y)));
    const wf = a.walk as GridWalkField;
    const counts = regionCounts(wf);
    let outside = 0;
    const bounds = { w: 4100, h: 3000, shape: 'ellipse' as const };
    for (let gy = 0; gy < wf.rows; gy++) {
      for (let gx = 0; gx < wf.cols; gx++) {
        const x = (gx + 0.5) * wf.cell, y = (gy + 0.5) * wf.cell;
        const id = wf.regionAt(x, y);
        if ((id === 'sulphur_deep' || id === 'sulphur_shelf') && !insideBounds(vec(x, y), 0, bounds)) outside++;
      }
    }
    check('B15 an ELLIPSE arena: the lake stands and every water cell sits inside the rim (the conform law follows the arena\'s own shape)',
      (counts.sulphur_deep ?? 0) > 200 && outside === 0, `${outside} outside`);
  }
}

// ----------------------------------------------- C) drawn == tested (broil) --
{
  const def = faceDef(11);
  const { entry, exits } = portals(4100, 3000);
  const a = generateLayout(def, { w: 4100, h: 3000 }, new Rng(11), vec(entry.x, entry.y), exits.map(e => vec(e.x, e.y)));
  const wf = a.walk as GridWalkField;
  const seats = broilSeatsIn(wf, 0, 0, 4100, 3000);
  const all = (pred: (s: { x: number; y: number }) => boolean): boolean => seats.every(pred);
  check('C1 the broil seats exist and EVERY seat stands on a sulphur_deep cell that refuses a body (drawn == tested off one regionAt)',
    seats.length > 40 && all(s => wf.regionAt(s.x, s.y) === 'sulphur_deep' && !wf.isWalkable(s.x, s.y)), `${seats.length} seats`);
  check('C2 every seat is INTERIOR — its four neighbours are deep too (no roil straddles the drop-off)',
    all(s => [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => wf.regionAt(s.x + dx * wf.cell, s.y + dy * wf.cell) === 'sulphur_deep')));
  const again = broilSeatsIn(wf, 0, 0, 4100, 3000);
  check('C3 the seat resolver is PURE (same grid → the same seats, same order, same radii/phases)',
    JSON.stringify(again) === JSON.stringify(seats));
  const seat = seats[0];
  const sims = [0, 1.7, 3.3, 5.9, 12.4].map(t => broilSimmerAt(seat, t));
  check('C4 the simmer holds inside its band — never the vent\'s full broil (that face means "imminent now")',
    sims.every(b => b >= LAKE_BROIL_CFG.simmer[0] - 1e-9 && b <= LAKE_BROIL_CFG.simmer[1] + 1e-9) && LAKE_BROIL_CFG.simmer[1] < 1);
  // A generic lake (lake_deep drifts) seats NOTHING — the broil is the sulphur word.
  const gdef = {
    id: 'probe_lake_generic_broil', name: 'QA', level: 8, seed: 3, size: { w: 2400, h: 1800 },
    theme: { floor: '#161616', grid: '#222', border: '#555', obstacle: '#333', obstacleEdge: '#666', accent: '#999' },
    layout: [], layoutType: RECIPE, objective: { kind: 'clear' }, exits: [], map: { x: 0, y: 0 },
  } as unknown as ZoneDef;
  const g = generateLayout(gdef, { w: 2400, h: 1800 }, new Rng(3), vec(120, 900), [vec(2360, 700)]);
  check('C5 a generic lake_deep lake seats NO broil (the roil is data on the sulphur row, never an id compare)',
    broilSeatsIn(g.walk as GridWalkField, 0, 0, 2400, 1800).length === 0 && (regionCounts(g.walk as GridWalkField).lake_deep ?? 0) > 100);
  // THE ONE DRAWN WORD: source wiring.
  const gl = readFileSync('src/render/vis/geyserLayer.ts', 'utf8');
  const ll = readFileSync('src/render/vis/lakeLayer.ts', 'utf8');
  const rr = readFileSync('src/render/renderer.ts', 'utf8');
  check('C6 ONE roil: the vent\'s broil draws through drawRoil, the lake pass imports the same function, the renderer\'s animated pass speaks broil + calls the lake pass',
    /export function drawRoil\(/.test(gl) && /drawRoil\(ctx, v\.pos\.x, v\.pos\.y, mouthR, read\.broil, t, vi\)/.test(gl)
    && /import \{ drawRoil \} from '\.\/geyserLayer'/.test(ll)
    && /vis\.animate === 'broil'/.test(rr) && /drawLakeBroil\(ctx, wf, world\.time/.test(rr));
}

// --------------------------------------------------------- D) the real path --
{
  const w = makeSimWorld('warrior', 0x1a4e);
  let zid: string | null = null;
  withSeededRandom(0x1a4e01, () => { zid = w.devMintTileset('sulphur_pools', 0.5, 8, { seed: 4242 }); });
  const wf = w.walk as GridWalkField;
  const plan = zid ? LAKE_PLANS.get(zid) : undefined;
  const counts = wf instanceof GridWalkField ? regionCounts(wf) : {};
  check('D1 live: the heart face mints a LAKE through the real path — the recipe pinned, both waters on the live grid, the plan kept',
    !!zid && w.zone.tileset === 'sulphur_pools' && w.zone.layoutType === RECIPE && !!plan && !plan.refused
    && (counts.sulphur_deep ?? 0) > 200 && (counts.sulphur_shelf ?? 0) > 200, `${zid} ${JSON.stringify(counts)}`);
  const field = w.geysers;
  const authored = field?.vents[0];
  check('D2 live: the authored great vent stands FIRST in the field, at the plan\'s seat, on a PRIVATE anchor band (the metronome law), among the face\'s own vents',
    !!field && !!authored && !!plan?.ventAt && authored.cls === 'great'
    && Math.abs(authored.pos.x - plan.ventAt.x) < 1 && Math.abs(authored.pos.y - plan.ventAt.y) < 1
    && authored.band >= field.banding.n && field.vents.length > 1,
    `vents ${field?.vents.length ?? 0}, band ${authored?.band}/${field?.banding.n}`);
  // THE REFUSAL: walk the hero at the middle from the shelf's inner edge.
  const p = w.player;
  const cell = wf.cell;
  // A shelf cell adjacent to the deep, on the east side of the center.
  let seat: Vec2 | null = null;
  if (plan && !plan.refused) {
    for (let x = plan.cx; x < w.arena.w && !seat; x += cell) {
      if (wf.regionAt(x, plan.cy) === 'sulphur_shelf' && wf.regionAt(x - cell, plan.cy) === 'sulphur_deep') seat = vec(x + cell * 0.5, plan.cy);
    }
  }
  let stoodOnDeep = false, ejected = false, lifeDrop = 0, controlDrop = 0;
  if (seat) {
    // CONTROL: stand still on the same shelf seat — the shelf's own DoT.
    p.pos = w.clampPos(vec(seat.x, seat.y), p.radius);
    p.life = p.maxLife();
    let life0 = p.life;
    for (let i = 0; i < 120; i++) w.update(DT);
    controlDrop = life0 - p.life;
    // THE WALK AT THE MIDDLE: the eject's debounce stamp (Actor.lastFall —
    // resolveBoundary's own witness) is the proof the refusal FIRED.
    p.pos = w.clampPos(vec(seat.x, seat.y), p.radius);
    p.life = p.maxLife();
    life0 = p.life;
    const t0 = w.time;
    // THE LEDGE-GRASP LAW lets a body's CENTER overhang a void-like cell
    // while its disc still touches ground (touching a lip is a grasp, not a
    // fall) — so the refusal's honest witness is SUPPORT: the body is never
    // adrift in the deep (no part of its disc on walkable ground).
    for (let i = 0; i < 120; i++) {
      w.moveActor(p, -1, 0, DT);
      w.update(DT);
      if (!wf.supportedAt(p.pos.x, p.pos.y, p.radius)) stoodOnDeep = true;
    }
    const lastFall = (p as unknown as { lastFall?: number }).lastFall;
    ejected = lastFall !== undefined && lastFall >= t0;
    lifeDrop = life0 - p.life;
  }
  check('D3 live: the deep REFUSES the hero — 120 frames of walking at the middle never leave the body unsupported (adrift in the deep); the eject FIRES and SCALDS beyond the shelf\'s own DoT',
    !!seat && !stoodOnDeep && ejected && lifeDrop > controlDrop + 1,
    `seat ${seat ? `${seat.x.toFixed(0)},${seat.y.toFixed(0)}` : 'none'}, Δlife ${lifeDrop.toFixed(1)} vs still ${controlDrop.toFixed(1)}, ejected ${ejected}`);
  // SHOTS PASS: a firing line straight across the deep.
  let fireAcross = false, sightAcross = false;
  if (plan && !plan.refused && seat) {
    const from = vec(seat.x, seat.y);
    // the mirror seat on the west side of the center
    let to: Vec2 | null = null;
    for (let x = plan.cx; x > 0 && !to; x -= cell) {
      if (wf.regionAt(x, plan.cy) === 'sulphur_shelf' && wf.regionAt(x + cell, plan.cy) === 'sulphur_deep') to = vec(x - cell * 0.5, plan.cy);
    }
    if (to) {
      fireAcross = w.lineOfFire(from, to);
      sightAcross = w.sightClipD(from, to) === Infinity;
    }
  }
  check('D4 live: a SHOT crosses the boiling middle where no body can — lineOfFire true shore to shore, and sight too (the lake\'s firing lane)',
    fireAcross && sightAcross);
  // THE SHELF: wade it — wading + the sting + a wound + the bar climbs.
  let shelfOk = false, detail = '';
  if (plan && !plan.refused) {
    let sc: Vec2 | null = null;
    for (let x = plan.cx; x < w.arena.w && !sc; x += cell) {
      if (wf.regionAt(x, plan.cy + cell * 2) === 'sulphur_shelf' && wf.regionAt(x + cell * 2, plan.cy + cell * 2) === 'sulphur_shelf'
        && wf.regionAt(x - cell * 2, plan.cy + cell * 2) === 'sulphur_shelf') sc = vec(x, plan.cy + cell * 2);
    }
    if (sc) {
      // Step onto dry ring land first (the sting is an ENTER status — a body
      // already wading the shelf re-enters nothing), then into the shelf.
      let land: Vec2 | null = null;
      for (let x = sc.x; x < w.arena.w && !land; x += cell) {
        if (wf.regionAt(x, sc.y) === 'ground' && wf.isWalkable(x, sc.y)) land = vec(x, sc.y);
      }
      if (land) { p.pos = vec(land.x, land.y); w.update(DT); w.update(DT); }
      p.pos = vec(sc.x, sc.y);
      p.life = p.maxLife();
      const life0 = p.life;
      const bar0 = w.scorchOf(p);
      const has = (id: string): boolean => p.statuses.some(s => s.id === id);
      // The sting is a ONE-SECOND enter status: read it at the step-in, then
      // let the DoT + the bar speak over the longer stand.
      for (let i = 0; i < 6; i++) w.update(DT);
      const stung = has('sulphur_sting');
      for (let i = 0; i < 84; i++) w.update(DT);
      shelfOk = has('wading') && stung && p.life < life0 - 0.2 && w.scorchOf(p) > bar0 + 0.05
        && wf.regionAt(p.pos.x, p.pos.y) === 'sulphur_shelf';
      detail = `wading ${has('wading')}, sting ${stung}, Δlife ${(life0 - p.life).toFixed(2)}, bar ${bar0.toFixed(2)}→${w.scorchOf(p).toFixed(2)}`;
    }
  }
  check('D5 live: the SHELF wades + stings + wounds + climbs the scorch bar (the pool\'s milder cousin, priced)', shelfOk, detail);
  const liveSeats = wf instanceof GridWalkField ? broilSeatsIn(wf, 0, 0, w.arena.w, w.arena.h) : [];
  check('D6 live: the drawn broil seats on the LIVE grid all sit on non-walkable sulphur_deep cells (drawn == tested where the hero plays)',
    liveSeats.length > 40 && liveSeats.every(s => wf.regionAt(s.x, s.y) === 'sulphur_deep' && !wf.isWalkable(s.x, s.y)), `${liveSeats.length} seats`);
  // ABSENT == IDENTICAL on the sibling face. (A fresh sim world restarts its
  // zone ids — the probe's own reuse of 'gen_1' — so the first world's plan is
  // dropped before the second mint; the registry is a probe/dev handle keyed
  // by zone id, never engine truth.)
  if (zid) LAKE_PLANS.delete(zid);
  const w2 = makeSimWorld('warrior', 0x1a4f);
  let zid2: string | null = null;
  withSeededRandom(0x1a4f01, () => { zid2 = w2.devMintTileset('geyser_fields', 0.5, 8, { seed: 4343 }); });
  const c2 = w2.walk instanceof GridWalkField ? regionCounts(w2.walk) : {};
  check('D7 live: the geyser_fields face mints NO lake — no water rows, no plan, not the recipe, its vents count-rolled as before (absent == identical)',
    !!zid2 && w2.zone.layoutType !== RECIPE && !(c2.sulphur_deep) && !(c2.sulphur_shelf) && !(c2.lake_deep)
    && !LAKE_PLANS.has(zid2 ?? '') && !!w2.geysers && w2.geysers.vents.length > 0,
    `${zid2} layout ${w2.zone.layoutType ?? 'plains'} ${JSON.stringify(c2)} vents ${w2.geysers?.vents.length ?? 0}`);
}

seedGlobalRandom(0);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
