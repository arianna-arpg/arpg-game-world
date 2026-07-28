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
//   F. THE FLOOR (massifMinMasses + the rescue pass) — on the bastion faces'
//      live merged params (the worldgen variant merge mirrored), deliberately
//      hostile min-size seeds that shipped 1-2 wall bodies before the floor
//      never mint below the documented floor of FOUR, the weave/portal
//      invariants hold over rescue bodies, and THE PREFIX LAW: a floor-less
//      carve is a byte-exact prefix of the floored carve on the same seed —
//      the rescue only APPENDS, so every minMasses-0 zone in the game is
//      untouched by construction.
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
import { TILESETS } from '../src/data/tilesets';
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

// --- Rig F: THE FLOOR — massifMinMasses + the rescue pass ---------------------
// The bastion faces are the debut author (data/tilesets.ts): the base face
// asks massifMinMasses 5 with massifRescueShrink 0.3, and the worldgen
// variant merge (per-key spread — worldgen.ts) carries both onto every face.
// The DOCUMENTED never-below floor is FOUR wall bodies: the bottom ~1% of
// min-size cloud rolls hold no fifth seat at any body size, and clearance
// never relaxes to conjure one (laneW / portalClear / reservations / the
// ground seat are structural — healMassifWeave's contract).
{
  const ts = TILESETS.aether_bastion;
  const sea = ts?.variants?.find(v => v.name === 'sea of ramparts');
  if (!ts || !sea) fail('F: aether_bastion tileset or its sea-of-ramparts face missing');
  else {
    // The live merged param sets (mirror worldgen's per-key variant merge).
    const SEA_PARAMS = { ...ts.layoutParams, ...sea.layoutParams } as Record<string, unknown>;
    const floorAsk = Number(SEA_PARAMS.massifMinMasses ?? 0);
    const DOC_FLOOR = 4;
    if (!(floorAsk >= DOC_FLOOR)) fail(`F: merged sea-of-ramparts params ask massifMinMasses ${floorAsk} — the floor dial is gone`);

    // Wall-body count + cover, read off the finished grid (drawn == tested):
    // 4-conn components of the mass kinds' region cells.
    const bodyStats = (grid: GridWalkField, w: number, h: number): { bodies: number; cover: number } => {
      const kinds = grid.pack().kinds;
      const massBytes = new Set<number>();
      kinds.forEach((k, i) => { if (k === 'bastion_wall' || k === 'gilt_parapet') massBytes.add(i); });
      const { cols, rows } = grid;
      const n = cols * rows;
      const isMass = (i: number): boolean => massBytes.has(grid.kind[i]);
      const seen = new Int32Array(n).fill(-1);
      const q: number[] = [];
      let bodies = 0, cells = 0;
      for (let s = 0; s < n; s++) {
        if (!isMass(s)) continue;
        cells++;
        if (seen[s] >= 0) continue;
        bodies++;
        q.length = 0; q.push(s); seen[s] = bodies;
        for (let head = 0; head < q.length; head++) {
          const c = q[head], cx = c % cols, cy = Math.floor(c / cols);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
            const nx = cx + dx, ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
            const nc = ny * cols + nx;
            if (!isMass(nc) || seen[nc] >= 0) continue;
            seen[nc] = bodies; q.push(nc);
          }
        }
      }
      return { bodies, cover: cells * grid.cell * grid.cell / (w * h) };
    };

    // Min-size bastion arena (the starved end of the authored sizeW/sizeH
    // bands — where every HEAD collapse lived) + genqa's portal idiom.
    const W = 2600, H = 1900;
    const fEntry = vec(120, H / 2);
    const fExits = [vec(W - 120, H / 2), vec(W / 2, 120)];
    const seaDef = (id: string, params: Record<string, unknown>): ZoneDef => ({
      id, name: `QA ${id}`, level: 14, size: { w: W, h: H },
      theme: { ...ts.theme, ...(sea.theme ?? {}) } as ZoneDef['theme'],
      layout: [...(ts.common ?? []), ...sea.layout],
      ...(ts.forceLayout ? { layoutType: ts.forceLayout } : {}),
      layoutParams: params,
      objective: { kind: 'clear' }, exits: [], map: { x: 0, y: 0 },
      ...(ts.compositions ? { compositions: ts.compositions } : {}),
    });
    const mint = (id: string, params: Record<string, unknown>, seed: number): { bodies: number; cover: number; comps: number; exitsOk: boolean } | null => {
      const out = generateLayout({ ...seaDef(id, params), seed }, { w: W, h: H }, new Rng(seed), fEntry, fExits);
      const st = out.walk instanceof GridWalkField ? gridStats(out) : null;
      if (!st || !(out.walk instanceof GridWalkField)) return null;
      const bs = bodyStats(out.walk, W, H);
      const exitsOk = fExits.every(e => st.grid.reachable(fEntry, e));
      return { ...bs, comps: st.comps, exitsOk };
    };

    // DELIBERATELY HOSTILE SEEDS, all from the measured ladder sweeps
    // (2026-07): 23000086 + 25000092 shipped TWO wall bodies at HEAD before
    // the floor; 22000083 + 30000107 stalled a body short until the deep
    // rescue relief; 63000206 is the shipped dials' worst min-size cloud.
    const HOSTILE = [23000086, 25000092, 22000083, 30000107, 63000206];
    let askMet = 0;
    for (const seed of HOSTILE) {
      const m = mint('massif_f_sea', SEA_PARAMS, seed);
      if (!m) { fail(`F: seed ${seed} produced no walk grid`); continue; }
      if (m.bodies < DOC_FLOOR) fail(`F: seed ${seed} minted ${m.bodies} wall bodies — under the documented floor of ${DOC_FLOOR}`);
      if (m.bodies >= floorAsk) askMet++;
      if (m.comps !== 1) fail(`F: seed ${seed} walkable floor split into ${m.comps} components (rescue broke the weave)`);
      if (!m.exitsOk) fail(`F: seed ${seed} left an exit unreachable`);
      if (m.cover < 0.02) fail(`F: seed ${seed} wall cover ${(m.cover * 100).toFixed(1)}% — the face collapsed despite the floor`);
      if (m.cover > 0.5) fail(`F: seed ${seed} wall cover ${(m.cover * 100).toFixed(1)}% — the field drowned`);
      note(`F sea seed ${seed}: ${m.bodies} bodies, cover ${(m.cover * 100).toFixed(1)}%`);
    }
    if (askMet < 3) fail(`F: the ask (${floorAsk}) pulled only ${askMet}/${HOSTILE.length} hostile seeds to it — the rescue lost its reach`);

    // PRESSURE, before/after in one frame: with the floor dialed OFF the
    // hostilest seed collapses exactly as HEAD did — proving these seeds
    // stress the law rather than passing green on friendly geometry.
    const bare = mint('massif_f_sea_nofloor', { ...SEA_PARAMS, massifMinMasses: 0 }, HOSTILE[0]);
    if (!bare) fail('F: floorless control produced no walk grid');
    else if (bare.bodies > 3) fail(`F: pressure — floorless control minted ${bare.bodies} bodies (hostile seed no longer hostile; re-pick the pins)`);

    // The parent face rides the same dials (it authored them): its two HEAD
    // one-body seeds hold the documented floor too.
    const baseDef = (id: string, params: Record<string, unknown>): ZoneDef => ({
      ...seaDef(id, params),
      theme: ts.theme as ZoneDef['theme'],
      layout: [...(ts.common ?? []), ...ts.layout],
    });
    for (const seed of [2000023, 36000125]) {
      const out = generateLayout({ ...baseDef('massif_f_base', ts.layoutParams as Record<string, unknown>), seed },
        { w: W, h: H }, new Rng(seed), fEntry, fExits);
      if (!(out.walk instanceof GridWalkField)) { fail(`F: base seed ${seed} no grid`); continue; }
      const bs = bodyStats(out.walk, W, H);
      if (bs.bodies < DOC_FLOOR) fail(`F: base face seed ${seed} minted ${bs.bodies} wall bodies — under the documented floor`);
      note(`F base seed ${seed}: ${bs.bodies} bodies, cover ${(bs.cover * 100).toFixed(1)}%`);
    }

    // THE PREFIX LAW + the placement law over rescue bodies, on the carver
    // directly: same seed, floor off vs on — the floor-less carve must be a
    // byte-exact prefix of the floored one (the rescue only APPENDS, so the
    // main-loop stream is untouched and every minMasses-0 zone in the game
    // is byte-identical by construction), and every floored pair/portal
    // still honors the merged lane and portal clearances.
    const laneW = Number(SEA_PARAMS.massifLaneW ?? MASSIF_CFG.laneW);
    const portalClear = Number(SEA_PARAMS.massifPortalClear ?? MASSIF_CFG.portalClear);
    const SYNTH = { w: 1400, h: 1000 };
    const sEntry = vec(120, SYNTH.h / 2);
    const sExits = [vec(SYNTH.w - 120, SYNTH.h / 2), vec(SYNTH.w / 2, 120)];
    const synthCtx = (seed: number): GenCtx => ({
      rng: new Rng(seed), arena: SYNTH, entry: sEntry, exits: sExits, seed,
      doodads: [], pois: [], camps: [], breakables: [], npcs: [],
      garrisons: [], caveSeeds: [], reserved: [],
    });
    // The synthetic prefix def carves on OPEN ground (no cloud): drop the
    // ground seat so the starvation is the small arena's spacing/portals —
    // the laws under test — not a seat test with no cloud to seat on.
    const synthParams = { ...SEA_PARAMS, massifSeatGround: false };
    let rescued = 0, prefixPairs = 0;
    for (let s = 0; s < Math.min(SEEDS, 12); s++) {
      const seed = seedAt(s) ^ 0xf0f;
      const def = defOf('massif_f_prefix', [], { layoutParams: synthParams });
      const floorless = carveMassifs(synthCtx(seed), { ...def, seed, size: { w: SYNTH.w, h: SYNTH.h }, layoutParams: { ...synthParams, massifMinMasses: 0 } });
      const floored = carveMassifs(synthCtx(seed), { ...def, seed, size: { w: SYNTH.w, h: SYNTH.h } });
      prefixPairs++;
      if (floored.length < floorless.length
        || JSON.stringify(floored.slice(0, floorless.length)) !== JSON.stringify(floorless)) {
        fail(`F: seed ${seed} floored carve is not a prefix-extension of the floor-less carve — the rescue disturbed the main loop`);
      }
      if (floored.length > floorless.length) rescued++;
      for (let i = 0; i < floored.length; i++) {
        for (let j = i + 1; j < floored.length; j++) {
          const d = Math.hypot(floored[i].at.x - floored[j].at.x, floored[i].at.y - floored[j].at.y);
          if (d < floored[i].bound + floored[j].bound + laneW - 1e-6) {
            fail(`F: seed ${seed} rescued masses ${i}/${j} ${Math.round(d)}px apart — the rescue relaxed the lane law`);
          }
        }
        for (const p of [sEntry, ...sExits]) {
          if (Math.hypot(p.x - floored[i].at.x, p.y - floored[i].at.y) < portalClear + floored[i].bound - 1e-6) {
            fail(`F: seed ${seed} rescued mass ${i} crowds a portal — the rescue relaxed the portal law`);
          }
        }
      }
    }
    if (!prefixPairs) fail('F: prefix rig never ran (dead rig)');
    if (!rescued) fail('F: pressure — the rescue never fired on the synthetic starved arena (dead rig)');
    note(`F: prefix law held on ${prefixPairs} pairs, rescue fired on ${rescued}`);
  }
}

if (fails) {
  console.log(`\nprobe_massif: ${fails} FAIL(S)`);
  process.exit(1);
} else {
  console.log('\nprobe_massif: ALL PASS');
}
