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
//   G. THE GARRISON + THE ROW GRAIN (the 2026-07-30 expansion) — THE FORK
//      LAW: authoring a garrison perturbs garrisons ALONE (same-seed carves
//      byte-identical with it on or off — the roll rides a per-mass fork,
//      never the layout stream); the patron default (faction absent = the
//      zone biome's patron, no biome = nobody posts); `over: {}` is a no-op;
//      per-row/per-kind sizeR bands honored; inner dressing lands on court
//      floors (off the POI seat's standoff) and the invariants hold under
//      authored ringInner/mouthScale.
//   H. THE MESA — the tableland tileset (desert biome, forceLayout massif),
//      the sandstone TRUE-WALL region row, the mesa kind's own size band
//      honored on minted ground, and garrisoned courts posting the desert's
//      patron.
//   I. THE COURT COUNTRY (the extreme regime) — the court-of-sands face:
//      court kinds only, high coverage, the weave/exit/POI guarantees intact,
//      shipped garrison chances seating guards, the great-court row's size
//      band live, and a forced-chance run garrisoning every court exactly.
//   J. THE COURTLANDS (the court-country pass — the regime grown into a
//      BIOME): the rim-claim law (the moisture band stands astride the
//      desert's dry fade-out), ring-only pools on every face (court/crescent
//      silhouettes exclusively), the two new kinds (well_court stocked,
//      fallen_court crescent), minted census over base + both faces with
//      garrisons speaking the DYNASTY, and the threshold rhythm's testable
//      half — the posted sweeping sentinel in the pack table, the dove's
//      quiet-ring roost in the wildlife layer.
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
import { BIOME_FIELD_BANDS, BIOMES, patronFaction } from '../src/world/biomes';
import { climateEnvelope } from '../src/world/climate';
import { presenceMul } from '../src/engine/presence';
import { MONSTERS, WILDLIFE } from '../src/data/monsters';
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

// --- Rig G: the garrison fork law + the row grain -----------------------------
{
  // G1 — THE FORK LAW: garrison on vs off, same seed → the carved masses are
  // byte-identical (the roll rides a per-mass fork of the shape seed, never
  // the layout stream); garrisons land at interiors with the authored
  // faction/size.
  const plainRows = [{ kind: 'fold', weight: 1 }];
  const garrRows = [{ kind: 'fold', weight: 1, over: { garrison: { chance: 1, faction: 'gnoll', size: [2, 3] as [number, number] } } }];
  const G_PARAMS = { massifCoverage: [0.2, 0.26] as [number, number], massifSizeR: [200, 300] as [number, number] };
  let forked = 0;
  for (let s = 0; s < Math.min(SEEDS, 10); s++) {
    const seed = seedAt(s) ^ 0xa11;
    const cPlain = bareCtx(seed);
    const plain = carveMassifs(cPlain, { ...defOf('massif_g', [], { layoutParams: { ...G_PARAMS, massifMasses: plainRows } }), seed });
    const cGarr = bareCtx(seed);
    const garr = carveMassifs(cGarr, { ...defOf('massif_g', [], { layoutParams: { ...G_PARAMS, massifMasses: garrRows } }), seed });
    if (JSON.stringify(plain) !== JSON.stringify(garr)) {
      fail(`G1: seed ${seed} authoring a garrison disturbed the carve — the fork law broke`);
    }
    if (cPlain.garrisons.length) fail(`G1: seed ${seed} garrison-less rows posted ${cPlain.garrisons.length} garrisons`);
    const interiors = garr.filter(m => m.interior);
    if (cGarr.garrisons.length !== interiors.length) {
      fail(`G1: seed ${seed} chance-1 garrison posted ${cGarr.garrisons.length} packs over ${interiors.length} courts`);
    }
    for (const g of cGarr.garrisons) {
      if (g.faction !== 'gnoll') fail(`G1: seed ${seed} garrison faction '${g.faction}' — authored 'gnoll' lost`);
      if (g.size[0] !== 2 || g.size[1] !== 3) fail(`G1: seed ${seed} garrison size ${g.size} — authored [2,3] lost`);
      if (!interiors.some(m => m.interior!.x === g.pos.x && m.interior!.y === g.pos.y)) {
        fail(`G1: seed ${seed} garrison at ${Math.round(g.pos.x)},${Math.round(g.pos.y)} matches no court interior`);
      }
    }
    forked += cGarr.garrisons.length;
  }
  if (!forked) fail('G1: pressure — no garrison ever posted (dead rig)');

  // G2 — THE PATRON DEFAULT: faction absent = the zone biome's patron
  // (desert → gnoll); no biome and no faction = nobody posts (the roll still
  // rides the fork, so the carve is untouched either way).
  {
    const seed = seedAt(3) ^ 0xa22;
    const rows = [{ kind: 'fold', weight: 1, over: { garrison: { chance: 1 } } }];
    const cPatron = bareCtx(seed);
    carveMassifs(cPatron, { ...defOf('massif_g2', [], { layoutParams: { ...G_PARAMS, massifMasses: rows }, biome: 'desert' }), seed });
    if (!cPatron.garrisons.length) fail('G2: desert-biome courts posted no patron garrison');
    for (const g of cPatron.garrisons) {
      if (g.faction !== 'gnoll') fail(`G2: patron default resolved '${g.faction}', expected the desert's gnolls`);
    }
    const cNone = bareCtx(seed);
    carveMassifs(cNone, { ...defOf('massif_g2b', [], { layoutParams: { ...G_PARAMS, massifMasses: rows } }), seed });
    if (cNone.garrisons.length) fail('G2: biome-less def posted a garrison from nowhere');
  }

  // G3 — `over: {}` is a NO-OP: the merge seam adds no draws and changes no
  // reads.
  {
    const seed = seedAt(5) ^ 0xa33;
    const a = carveMassifs(bareCtx(seed), { ...defOf('massif_g3', [], { layoutParams: { ...G_PARAMS, massifMasses: [{ kind: 'fold', weight: 1 }] } }), seed });
    const b = carveMassifs(bareCtx(seed), { ...defOf('massif_g3', [], { layoutParams: { ...G_PARAMS, massifMasses: [{ kind: 'fold', weight: 1, over: {} }] } }), seed });
    if (JSON.stringify(a) !== JSON.stringify(b)) fail('G3: over:{} disturbed the carve — the merge seam is not a no-op');
  }

  // G4 — THE ROW BAND: a row's sizeR remaps every landed body of that row
  // into its own band (draw-free — the zone's roll is re-mapped, never
  // re-drawn).
  {
    let banded = 0;
    for (let s = 0; s < Math.min(SEEDS, 8); s++) {
      const seed = seedAt(s) ^ 0xa44;
      const rows = [{ kind: 'tor', weight: 1, sizeR: [80, 110] as [number, number] }];
      const masses = carveMassifs(bareCtx(seed), { ...defOf('massif_g4', [], { layoutParams: { massifMasses: rows, massifCoverage: [0.1, 0.14] as [number, number] } }), seed });
      for (const m of masses) {
        banded++;
        if (m.r < 80 - 1e-9 || m.r > 110 + 1e-9) fail(`G4: seed ${seed} row-banded tor rolled r=${m.r.toFixed(1)} outside [80,110]`);
      }
    }
    if (!banded) fail('G4: pressure — no row-banded mass ever landed (dead rig)');
  }

  // G5 — INNER DRESSING: a court kind's inner rows stock its own floor —
  // pieces inside the ring (off the 42px POI-seat standoff), none anywhere
  // else (the def's layout is EMPTY, so every landed piece IS an inner
  // piece), and the interior stays reachable around them.
  {
    const innerRows = [{ kind: 'clay_pots', weight: 1, radius: [10, 14] as [number, number] }];
    const rows = [{ kind: 'fold', weight: 1, over: { inner: innerRows, innerChance: 1, innerSpacing: 40 } }];
    let pots = 0, courts = 0;
    for (let s = 0; s < Math.min(SEEDS, 8); s++) {
      const seed = seedAt(s) ^ 0xa55;
      const def = defOf('massif_g5', [], { layoutParams: { ...G_PARAMS, massifMasses: rows } });
      const out = gen(def, seed);
      const st = gridStats(out);
      if (!st) { fail(`G5: seed ${seed} no grid`); continue; }
      const masses = carveMassifs(bareCtx(seed), { ...def, seed });
      const inner = out.doodads.filter(d => d.kind === 'clay_pots');
      pots += inner.length;
      courts += masses.filter(m => m.interior).length;
      for (const d of inner) {
        const home = masses.find(m => m.interior && Math.hypot(d.pos.x - m.interior.x, d.pos.y - m.interior.y) <= m.r * 0.6 * 0.9 + 15);
        if (!home) fail(`G5: seed ${seed} inner piece at ${Math.round(d.pos.x)},${Math.round(d.pos.y)} sits outside every court floor`);
        else if (Math.hypot(d.pos.x - home.interior!.x, d.pos.y - home.interior!.y) < 42 - 15) {
          fail(`G5: seed ${seed} inner piece crowds the POI seat — the standoff broke`);
        }
      }
      for (const poi of out.pois) {
        const q = st.grid.isWalkable(poi.x, poi.y) ? poi : st.grid.snapToWalkable(vec(poi.x, poi.y));
        if (!st.grid.reachable(entry, q)) fail(`G5: seed ${seed} stocked court interior unreachable`);
      }
    }
    if (!courts) fail('G5: pressure — no court minted (dead rig)');
    if (!pots) fail('G5: pressure — inner dressing never landed a piece (dead rig)');
    note(`G5: ${pots} inner pieces over ${courts} courts`);
  }

  // G6 — RING DIALS UNDER THE INVARIANTS: authored ringInner (thick and
  // thin) + widened mouths keep the weave one component, exits + interiors
  // reachable.
  for (const [ri, ms] of [[0.45, 1], [0.75, 1.4]] as const) {
    for (let s = 0; s < Math.min(SEEDS, 6); s++) {
      const seed = seedAt(s) ^ 0xa66;
      const rows = [{ kind: 'fold', weight: 1, over: { ringInner: ri, mouthScale: ms } }];
      const out = gen(defOf('massif_g6', [], { layoutParams: { ...G_PARAMS, massifMasses: rows } }), seed);
      const st = gridStats(out);
      if (!st) { fail(`G6: ri=${ri} seed ${seed} no grid`); continue; }
      if (st.comps !== 1) fail(`G6: ri=${ri} ms=${ms} seed ${seed} split the weave (${st.comps} comps)`);
      for (const e of exits) if (!st.grid.reachable(entry, e)) fail(`G6: ri=${ri} seed ${seed} exit unreachable`);
      for (const poi of out.pois) {
        const q = st.grid.isWalkable(poi.x, poi.y) ? poi : st.grid.snapToWalkable(vec(poi.x, poi.y));
        if (!st.grid.reachable(entry, q)) fail(`G6: ri=${ri} seed ${seed} interior unreachable`);
      }
    }
  }
}

// --- Rig H: the mesa — tableland tileset + sandstone + the kind band ----------
{
  const ts = TILESETS.tableland;
  if (!ts) fail('H: tableland tileset missing');
  else {
    if (ts.forceLayout !== 'massif') fail(`H: tableland forceLayout '${ts.forceLayout}' — the massif coupling is gone`);
    if (ts.biome !== 'desert') fail(`H: tableland biome '${ts.biome}' — the desert claim is gone`);
    if (!ts.depthAffinity) fail('H: tableland carries no depthAffinity — the country staging is gone');
    const sand = regionKind('sandstone');
    if (!sand || sand.walkable || !sand.blocks || !sand.blocksShot || !sand.blocksSight) {
      fail('H: sandstone must be a TRUE WALL (blocks + blocksShot + blocksSight)');
    }
    const mesa = massKindOf('mesa');
    if (mesa.id !== 'mesa') fail('H: mass kind mesa missing');
    else {
      if (mesa.region !== 'sandstone') fail(`H: mesa region '${mesa.region}' — expected sandstone`);
      if (!mesa.sizeR) fail('H: mesa carries no kind-default size band');
    }
    const court = massKindOf('sand_court');
    if (court.id !== 'sand_court') fail('H: mass kind sand_court missing');
    else {
      if (!court.garrison) fail('H: sand_court authors no garrison — Part A left the regime');
      if (court.garrison?.faction) fail(`H: sand_court hardcodes faction '${court.garrison.faction}' — the patron default is the law`);
      if (!court.inner?.length) fail('H: sand_court authors no inner rows — the stocked ring is gone');
    }

    // Minted base face (compositions omitted so the carve replay's streams
    // align — rig D's law; genqa sweeps the composed whole).
    const W = 3400, H2 = 2500;
    const hEntry = vec(130, H2 / 2);
    const hExits = [vec(W - 130, H2 / 2), vec(W / 2, 130)];
    const baseDef = (id: string, params: Record<string, unknown>, layout: StampSpec[]): ZoneDef => ({
      id, name: `QA ${id}`, level: 9, size: { w: W, h: H2 },
      theme: ts.theme as ZoneDef['theme'],
      layout,
      layoutType: 'massif',
      layoutParams: params,
      biome: ts.biome,
      objective: { kind: 'clear' }, exits: [], map: { x: 0, y: 0 },
    });
    const mesaBand = massKindOf('mesa').sizeR!;
    let sandCells = false, mesas = 0;
    for (let s = 0; s < Math.min(SEEDS, 6); s++) {
      const seed = seedAt(s) ^ 0xbe5a;
      const def = baseDef('massif_h', ts.layoutParams as Record<string, unknown>, [...(ts.common ?? []), ...ts.layout]);
      const out = generateLayout({ ...def, seed }, { w: W, h: H2 }, new Rng(seed), hEntry, hExits);
      if (!(out.walk instanceof GridWalkField)) { fail(`H: seed ${seed} no grid`); continue; }
      const st = gridStats(out)!;
      if (st.comps !== 1) fail(`H: seed ${seed} tableland weave split (${st.comps} comps)`);
      for (const e of hExits) if (!st.grid.reachable(hEntry, e)) fail(`H: seed ${seed} exit unreachable`);
      if (out.walk.pack().kinds.includes('sandstone')) sandCells = true;
      // Carve replay (no compositions in the def, streams align): the kind
      // band holds — mesas inside their own [200,360], courts inside the
      // zone default.
      const ctx: GenCtx = {
        rng: new Rng(seed), arena: { w: W, h: H2 }, entry: hEntry, exits: hExits, seed,
        doodads: [], pois: [], camps: [], breakables: [], npcs: [],
        garrisons: [], caveSeeds: [], reserved: [],
      };
      const masses = carveMassifs(ctx, { ...def, seed });
      for (const m of masses) {
        if (m.kind === 'mesa') {
          mesas++;
          if (m.r < mesaBand[0] - 1e-9 || m.r > mesaBand[1] + 1e-9) {
            fail(`H: seed ${seed} mesa r=${m.r.toFixed(1)} outside its kind band [${mesaBand}]`);
          }
        }
        if (m.kind === 'sand_court' && (m.r < MASSIF_CFG.sizeR[0] - 1e-9 || m.r > MASSIF_CFG.sizeR[1] + 1e-9)) {
          fail(`H: seed ${seed} sand_court r=${m.r.toFixed(1)} outside the zone band`);
        }
      }
      // Any posted garrison speaks the desert's patron.
      for (const g of ctx.garrisons) {
        if (g.faction !== 'gnoll') fail(`H: seed ${seed} tableland garrison faction '${g.faction}' — patron is gnoll`);
      }
    }
    if (!sandCells) fail('H: pressure — no minted tableland ever painted sandstone (dead rig)');
    if (!mesas) fail('H: pressure — no mesa ever landed (dead rig)');
    note(`H: ${mesas} mesas banded`);
  }
}

// --- Rig I: the court country — the extreme regime, census'd ------------------
{
  const ts = TILESETS.tableland;
  const face = ts?.variants?.find(v => v.name === 'the court of sands');
  if (!ts || !face) fail('I: the court-of-sands face is missing');
  else {
    const MERGED = { ...ts.layoutParams, ...face.layoutParams } as Record<string, unknown>;
    const pool = MERGED.massifMasses as { kind: string; sizeR?: [number, number]; over?: Record<string, unknown> }[];
    // Court kinds ONLY, structurally: every pool row names a kind whose every
    // silhouette is the court shape.
    for (const row of pool) {
      const kd = massKindOf(row.kind);
      if (kd.shapes.some(sh => sh.shape !== 'court')) {
        fail(`I: regime pool row '${row.kind}' rolls non-court shapes — the court country leaked`);
      }
    }
    const W = 3400, H2 = 2500;
    const iEntry = vec(130, H2 / 2);
    const iExits = [vec(W - 130, H2 / 2), vec(W / 2, 130)];
    const regimeDef = (id: string, params: Record<string, unknown>): ZoneDef => ({
      id, name: `QA ${id}`, level: 9, size: { w: W, h: H2 },
      theme: { ...ts.theme, ...(face.theme ?? {}) } as ZoneDef['theme'],
      layout: [...(ts.common ?? []), ...face.layout],
      layoutType: 'massif',
      layoutParams: params,
      biome: ts.biome,
      objective: { kind: 'clear' }, exits: [], map: { x: 0, y: 0 },
    });
    let courts = 0, guards = 0, great = 0;
    for (let s = 0; s < Math.min(SEEDS, 6); s++) {
      const seed = seedAt(s) ^ 0xc0a7;
      const def = regimeDef('massif_i', MERGED);
      const out = generateLayout({ ...def, seed }, { w: W, h: H2 }, new Rng(seed), iEntry, iExits);
      if (!(out.walk instanceof GridWalkField)) { fail(`I: seed ${seed} no grid`); continue; }
      const st = gridStats(out)!;
      if (st.comps !== 1) fail(`I: seed ${seed} the regime split the weave (${st.comps} comps)`);
      if (st.wallFrac > 0.5) fail(`I: seed ${seed} wall fraction ${st.wallFrac.toFixed(2)} — the field drowned`);
      for (const e of iExits) if (!st.grid.reachable(iEntry, e)) fail(`I: seed ${seed} exit unreachable at the regime dials`);
      for (const poi of out.pois) {
        const q = st.grid.isWalkable(poi.x, poi.y) ? poi : st.grid.snapToWalkable(vec(poi.x, poi.y));
        if (!st.grid.reachable(iEntry, q)) fail(`I: seed ${seed} court interior unreachable at the regime dials`);
      }
      // Replay the carve for the census (rig D's law; def carries no comps).
      const ctx: GenCtx = {
        rng: new Rng(seed), arena: { w: W, h: H2 }, entry: iEntry, exits: iExits, seed,
        doodads: [], pois: [], camps: [], breakables: [], npcs: [],
        garrisons: [], caveSeeds: [], reserved: [],
      };
      const masses = carveMassifs(ctx, { ...def, seed });
      if (masses.length < 3) fail(`I: seed ${seed} regime minted only ${masses.length} courts — the country is empty`);
      for (const m of masses) {
        if (m.kind !== 'sand_court') fail(`I: seed ${seed} non-court mass '${m.kind}' in the court country`);
        if (!m.interior) fail(`I: seed ${seed} a court reported no interior`);
        if (m.r > 300 + 1e-9) great++;
      }
      courts += masses.length;
      guards += ctx.garrisons.length;
      for (const g of ctx.garrisons) {
        if (g.faction !== 'gnoll') fail(`I: seed ${seed} regime garrison faction '${g.faction}'`);
      }
      note(`I seed ${seed}: ${masses.length} courts, ${ctx.garrisons.length} garrisoned, wallFrac ${st.wallFrac.toFixed(2)}`);
    }
    if (courts < 18) fail(`I: pressure — the regime aggregated only ${courts} courts over the sweep (dead regime)`);
    if (!guards) fail('I: shipped garrison chances posted NO guard across the whole sweep (statistically impossible at 0.55)');
    if (!great) fail('I: the great-court row never landed (its sizeR band is dead in the shipped face)');

    // Forced-chance control: every court garrisoned, exactly.
    {
      const seed = seedAt(2) ^ 0xc1a7;
      const forcedPool = pool.map(row => ({ ...row, over: { ...(row.over ?? {}), garrison: { chance: 1 } } }));
      const ctx: GenCtx = {
        rng: new Rng(seed), arena: { w: W, h: H2 }, entry: iEntry, exits: iExits, seed,
        doodads: [], pois: [], camps: [], breakables: [], npcs: [],
        garrisons: [], caveSeeds: [], reserved: [],
      };
      const masses = carveMassifs(ctx, { ...regimeDef('massif_i_forced', { ...MERGED, massifMasses: forcedPool }), seed });
      const interiors = masses.filter(m => m.interior).length;
      if (!interiors) fail('I: forced control minted no courts');
      else if (ctx.garrisons.length !== interiors) {
        fail(`I: forced chance-1 garrisoned ${ctx.garrisons.length}/${interiors} courts — the roll leaks`);
      }
    }
  }
}

// --- Rig J: THE COURTLANDS — the desert's rim of rings ------------------------
// The court-country pass: rig I's regime grown into a BIOME. The law under
// test is THE THRESHOLD RHYTHM's structural half — nothing but TRUE-wall
// ring architecture (the relief), a watched, hunted open (the peril) — plus
// the citizenship wiring that makes it a country: the rim climate claim,
// the dynasty's patronage, the stocked well ring, the crescent ruin lane.
{
  const ts = TILESETS.courtland;
  const biome = BIOMES.courtland;
  if (!ts) fail('J: courtland tileset missing');
  else if (!biome) fail('J: courtland biome row missing');
  else {
    // J1 — citizenship statics.
    if (ts.forceLayout !== 'massif') fail(`J: courtland forceLayout '${ts.forceLayout}' — the massif coupling is gone`);
    if (ts.biome !== 'courtland') fail(`J: courtland tileset biome '${ts.biome}' — the country lost its tag`);
    if (patronFaction('courtland') !== 'sarcophate') {
      fail(`J: courtland patron '${patronFaction('courtland')}' — the dynasty lost its belt`);
    }
    // THE RIM LAW (the border-proof sweep's landed shape): the claim hugs
    // the desert's WETTER VERGE — full on desert-grade ground (0.42: both
    // envelopes full — the rim stands ON the waste's margin), dead in the
    // arid heart (0.28: the deep desert stays its parent's alone), dead on
    // the green flank (0.55), and TAPERING through the semi-arid shoulder
    // (0.48: both bands mid-fade — the crossing ground the rim was built
    // to read).
    const dry = climateEnvelope('moisture', BIOMES.desert.climate!.moisture);
    const rim = climateEnvelope('moisture', biome.climate!.moisture);
    if (presenceMul(rim, 0.42) < 1 - 1e-9 || presenceMul(dry, 0.42) < 1 - 1e-9) {
      fail('J: the rim no longer stands on the desert\'s verge (both envelopes must be FULL at 0.42)');
    }
    if (presenceMul(rim, 0.28) > 0) fail('J: the rim claims the desert\'s arid heart');
    if (presenceMul(dry, 0.28) < 1 - 1e-9) fail('J: 0.28 left the desert\'s full-dry band — re-pin the rim law');
    if (presenceMul(rim, 0.55) > 0) fail('J: the rim claims the green flank');
    const rimTaper = presenceMul(rim, 0.48), dryTaper = presenceMul(dry, 0.48);
    if (!(rimTaper > 0 && rimTaper < 1 && dryTaper > 0 && dryTaper < 1)) {
      fail('J: 0.48 is not a shared taper of rim and dry — the shoulder read is gone');
    }
    // THE VERGE TILT: the desert_verge field band stands, tilts (never
    // replaces), and names both family rows — the lever the measured
    // adjacency rides (biomes.ts carries the numbers).
    const verge = BIOME_FIELD_BANDS.find(b => b.id === 'desert_verge');
    if (!verge) fail('J: the desert_verge field band is gone — the rim\'s adjacency lever');
    else {
      if (verge.mode !== 'tilt') fail('J: desert_verge must TILT, never replace');
      if (verge.when.axis !== 'moisture') fail(`J: desert_verge gates on '${verge.when.axis}' — the stratum is moisture`);
      for (const b of ['desert', 'courtland']) {
        if (!verge.table.some(r => r.biome === b)) fail(`J: desert_verge lost its '${b}' row`);
      }
    }

    // The two new kinds: sandstone rings, the well stocked, the ruin a crescent.
    const well = massKindOf('well_court');
    if (well.id !== 'well_court') fail('J: mass kind well_court missing');
    else {
      if (well.region !== 'sandstone') fail(`J: well_court region '${well.region}' — expected sandstone`);
      if (!well.inner?.some(r => r.kind === 'stone_cistern')) fail('J: well_court lost its cistern — the watered ring is dry');
      if ((well.garrison?.chance ?? 0) > 0.3) fail('J: well_court garrison chance rose past the relief read');
    }
    const fallen = massKindOf('fallen_court');
    if (fallen.id !== 'fallen_court') fail('J: mass kind fallen_court missing');
    else if (fallen.shapes.some(s => s.shape !== 'crescent')) fail('J: fallen_court rolls non-crescent shapes');

    // NOTHING BUT RINGS, on every face: each pool row (the biome row, the
    // base face, both variants) names a kind whose every silhouette is
    // court or crescent — ring architecture whole or breached, never a
    // slab, never a mesa.
    const faces: { label: string; params: Record<string, unknown> }[] = [
      { label: 'biome', params: (biome.layoutParams ?? {}) as Record<string, unknown> },
      { label: 'base', params: ts.layoutParams as Record<string, unknown> },
      ...(ts.variants ?? []).map(v => ({
        label: v.name, params: { ...ts.layoutParams, ...v.layoutParams } as Record<string, unknown>,
      })),
    ];
    for (const f of faces) {
      const pool = f.params.massifMasses as { kind: string }[] | undefined;
      if (!pool?.length) { fail(`J: face '${f.label}' carries no court pool`); continue; }
      for (const row of pool) {
        const kd = massKindOf(row.kind);
        if (kd.shapes.some(sh => sh.shape !== 'court' && sh.shape !== 'crescent')) {
          fail(`J: face '${f.label}' row '${row.kind}' rolls non-ring shapes — the court country leaked`);
        }
      }
    }

    // J3 — THE THRESHOLD RHYTHM's testable half. The open is READ before it
    // is crossed: the sentinel wears the watch fabric's sweeping fan ON A
    // POST and stands in the tileset's own pack table; the dove roosts at
    // the urns inside quiet rings (the `near` lever), so the burst of pale
    // wings is the no-tenant read.
    const sen = MONSTERS.ushabti_sentinel;
    if (!sen) fail('J: ushabti_sentinel def missing');
    else {
      if (!sen.watch?.sweep) fail('J: the sentinel lost its sweeping watch — the fans went dark');
      if (!sen.post) fail('J: the sentinel lost its post — the gaps go unwatched');
      if (sen.faction !== 'sarcophate') fail(`J: the sentinel serves '${sen.faction}' — the watch is the dynasty's`);
    }
    if (!ts.packs?.table.some(r => r.id === 'ushabti_sentinel')) {
      fail('J: ushabti_sentinel absent from the courtland pack table — the open goes unwatched');
    }
    const fauna = WILDLIFE.courtland;
    if (!fauna || fauna.length < 3 || fauna.length > 6) {
      fail(`J: courtland wildlife carries ${fauna?.length ?? 0} rows — the ambient law wants 3-5`);
    }
    const dove = fauna?.find(r => r.id === 'tomb_dove');
    if (!dove) fail('J: tomb_dove missing from courtland wildlife');
    else if (dove.near !== 'burial_urn') fail('J: the dove lost its urn roost — the quiet-ring tell is gone');
    if (MONSTERS.tomb_dove?.tag !== 'critter') fail('J: tomb_dove is not critter-tagged (the ambient-exemption law)');

    // J2 — the minted census: base + both faces, weave/exits/interiors
    // whole, ring-only silhouettes on the carved truth, garrisons speaking
    // the dynasty, the kept-court row landing, the watered face's cistern
    // stock inside its own floors.
    const W = 3400, H2 = 2500;
    const jEntry = vec(130, H2 / 2);
    const jExits = [vec(W - 130, H2 / 2), vec(W / 2, 130)];
    const faceDefs = [
      {
        label: 'base',
        params: ts.layoutParams as Record<string, unknown>,
        layout: [...(ts.common ?? []), ...ts.layout],
        theme: ts.theme as ZoneDef['theme'],
      },
      ...(ts.variants ?? []).map(v => ({
        label: v.name,
        params: { ...ts.layoutParams, ...v.layoutParams } as Record<string, unknown>,
        layout: [...(ts.common ?? []), ...v.layout],
        theme: { ...ts.theme, ...(v.theme ?? {}) } as ZoneDef['theme'],
      })),
    ];
    let rings = 0, guards = 0, kept = 0, fallenSeen = 0, wellStock = 0;
    for (const f of faceDefs) {
      for (let s = 0; s < Math.min(SEEDS, 4); s++) {
        const seed = seedAt(s) ^ 0xd0c7 ^ (f.label.length << 8);
        const def: ZoneDef = {
          id: `massif_j_${f.label.replace(/\W+/g, '_')}`, name: `QA courtland ${f.label}`, level: 9,
          size: { w: W, h: H2 }, theme: f.theme, layout: f.layout,
          layoutType: 'massif', layoutParams: f.params, biome: 'courtland',
          objective: { kind: 'clear' }, exits: [], map: { x: 0, y: 0 },
        };
        const out = generateLayout({ ...def, seed }, { w: W, h: H2 }, new Rng(seed), jEntry, jExits);
        if (!(out.walk instanceof GridWalkField)) { fail(`J: ${f.label} seed ${seed} no grid`); continue; }
        const st = gridStats(out)!;
        if (st.comps !== 1) fail(`J: ${f.label} seed ${seed} split the weave (${st.comps} comps)`);
        if (st.wallFrac > 0.5) fail(`J: ${f.label} seed ${seed} wall fraction ${st.wallFrac.toFixed(2)} — the rim drowned`);
        for (const e of jExits) if (!st.grid.reachable(jEntry, e)) fail(`J: ${f.label} seed ${seed} exit unreachable`);
        for (const poi of out.pois) {
          const q = st.grid.isWalkable(poi.x, poi.y) ? poi : st.grid.snapToWalkable(vec(poi.x, poi.y));
          if (!st.grid.reachable(jEntry, q)) fail(`J: ${f.label} seed ${seed} ring interior unreachable`);
        }
        // Carve replay (defs carry no compositions — rig D's stream-align law).
        const ctx: GenCtx = {
          rng: new Rng(seed), arena: { w: W, h: H2 }, entry: jEntry, exits: jExits, seed,
          doodads: [], pois: [], camps: [], breakables: [], npcs: [],
          garrisons: [], caveSeeds: [], reserved: [],
        };
        const masses = carveMassifs(ctx, { ...def, seed });
        for (const m of masses) {
          rings++;
          if (m.shape !== 'court' && m.shape !== 'crescent') {
            fail(`J: ${f.label} seed ${seed} non-ring silhouette '${m.shape}' in the courtlands`);
          }
          if (m.shape === 'crescent') fallenSeen++;
          if (f.label === 'base' && m.kind === 'sand_court' && m.r > 300) kept++;
        }
        guards += ctx.garrisons.length;
        for (const g of ctx.garrisons) {
          if (g.faction !== 'sarcophate') fail(`J: ${f.label} seed ${seed} garrison faction '${g.faction}' — the rings answer to the dynasty`);
        }
        if (f.label === 'the watered courts') {
          const ri = massKindOf('well_court').ringInner ?? 0.6;
          const wells = masses.filter(m => m.kind === 'well_court' && m.interior);
          for (const d of out.doodads.filter(d => d.kind === 'stone_cistern')) {
            wellStock++;
            if (!wells.some(m => Math.hypot(d.pos.x - m.interior!.x, d.pos.y - m.interior!.y) <= m.r * ri * 0.9 + 16)) {
              fail(`J: watered face seed ${seed} cistern at ${Math.round(d.pos.x)},${Math.round(d.pos.y)} sits outside every well-court floor`);
            }
          }
        }
        note(`J ${f.label} seed ${seed}: ${masses.length} rings, ${ctx.garrisons.length} garrisoned, wallFrac ${st.wallFrac.toFixed(2)}`);
      }
    }
    if (rings < 30) fail(`J: pressure — the country aggregated only ${rings} rings over the sweep (dead regime)`);
    if (!guards) fail('J: shipped garrison chances posted NO dynasty guard across the sweep');
    if (!kept) fail('J: the kept-court row never landed (its sizeR band is dead in the shipped base face)');
    if (!fallenSeen) fail('J: no fallen ring ever landed (the crescent lane is dead)');
    if (!wellStock) fail('J: the watered face never landed a cistern (the relief is dry)');
  }
}

if (fails) {
  console.log(`\nprobe_massif: ${fails} FAIL(S)`);
  process.exit(1);
} else {
  console.log('\nprobe_massif: ALL PASS');
}
