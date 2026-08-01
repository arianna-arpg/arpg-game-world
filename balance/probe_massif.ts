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
//      the shipped RING-TENANT tables seating guards (and the great courts
//      almost never vacant), the great-court row's size band live, and a
//      forced garrison-only table garrisoning every court exactly.
//   J. THE COURTLANDS (the court-country pass — the regime grown into a
//      BIOME): the rim-claim law (the moisture band stands astride the
//      desert's dry fade-out), ring-only pools on every face (court/crescent
//      silhouettes exclusively), the two new kinds (well_court stocked,
//      fallen_court crescent), minted census over base + both faces with
//      garrisons speaking the DYNASTY, and the threshold rhythm's testable
//      half — the posted sweeping sentinel in the pack table, the dove's
//      quiet-ring roost in the wildlife layer.
//   K. THE RING TENANTS (the expansion-lane lever) — one weighted occupancy
//      draw per court on a per-mass fork stream: THE FORK LAW both ways
//      (a vacant table leaves the WHOLE layout byte-identical; any table
//      leaves the carved masses byte-identical), THE REPLACEMENT LAW (a
//      table silences the kind's independent garrison/inner chances; an
//      EMPTY table is no law at all), one-occupant exclusivity + weights
//      honored over a sweep, per-row grain via `over.tenants`, the cache
//      knot's floor/standoff geometry, and registry resolution (the core
//      four + the held_stock composition; a probe-registered kind runs
//      deterministically; an unknown kind seats nothing and breaks nothing).
//   L. THE DEPTH-GRADED DIAL (the environment-lever pass) — layoutParam's
//      `{ byDepth: [atRim, atHeart] }` ramp: scalar + band-end lerps exact at
//      forced rim/heart, THE ABSENT-GEO LAW (no baked geo → the midpoint),
//      out-of-range depth clamped, plain object/array dials passed through BY
//      REFERENCE (the marker guard — massifBores/tierKit/overgrowth's bare
//      pair can never be misread), malformed ramps warning once and falling
//      to the reference default, and ABSENT == BYTE-IDENTICAL: a ramp-less
//      def mints the same layout bytes across the whole geo swing while a
//      ramped dial moves the mint in the authored direction.
//   M. THE PER-BIOME TABLE — `over.tenants` REPLACES a kind's OWN authored
//      tenant table wholesale (same kind, different country, different court
//      society — the biome retable), and a pool row WITHOUT the override
//      keeps the kind's own table (the replacement law intact both ways).
//   N. THE NEEDLES PRESS (the depth-graded debut, data/tilesets.ts) — the
//      shipped rows: a cliff-kinds-only pool (butte alone — no court society
//      in the spire country: zero tenants, zero garrisons on minted ground),
//      the depth-graded dials crowding the heart (deep mints denser than rim
//      mints, the tightened lane actually ENGAGED), rim ends reading the
//      authored values exactly (edge zones stay recognizable), portalClear
//      flat by law, and the weave/exit guarantees holding at the heart's
//      densest roll (forced geo 1).
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
import '../src/engine/tiers'; // registers the 'needles' recipe rig N mints
import '../src/data/massifs';
import '../src/data/compositions';

import { Rng } from '../src/core/rng';
import { vec } from '../src/core/math';
import { generateLayout, hasLayout, layoutParam, type GenCtx, type GeneratedLayout } from '../src/engine/levelgen';
import { GridWalkField } from '../src/world/gridWalk';
import { regionKind } from '../src/world/regions';
import {
  carveMassifs, massKindIds, massKindOf, massShapeIds, MASSIF_CFG,
  registerTenantKind, tenantKindIds, type MassAnchorRow, type TenantRow,
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
    // THE RING-TENANT DEBUT (the ring-tenants pass): both shipped rows wear
    // occupancy tables via the per-row grain, and the GREAT courts (the
    // sizeR row) almost never stand vacant — what was worth building big is
    // worth holding.
    for (const row of pool) {
      const table = row.over?.tenants as TenantRow[] | undefined;
      if (!table?.length) { fail(`I: court-of-sands row '${row.kind}' lost its tenant table`); continue; }
      if (row.sizeR) {
        const tot = table.reduce((a, r) => a + r.weight, 0);
        const vac = table.filter(r => r.kind === 'vacant').reduce((a, r) => a + r.weight, 0);
        if (vac / tot > 0.1) {
          fail(`I: the great-court row stands vacant at ${(vac / tot * 100).toFixed(0)}% — a GREAT court is almost never empty`);
        }
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
    if (!guards) fail('I: the shipped tenant tables posted NO guard across the whole sweep (statistically impossible at their garrison shares)');
    if (!great) fail('I: the great-court row never landed (its sizeR band is dead in the shipped face)');

    // Forced control — a garrison-only TABLE: every court garrisoned,
    // exactly (the one-draw law with a one-row table).
    {
      const seed = seedAt(2) ^ 0xc1a7;
      const forcedPool = pool.map(row => ({ ...row, over: { ...(row.over ?? {}), tenants: [{ kind: 'garrison', weight: 1 }] } }));
      const ctx: GenCtx = {
        rng: new Rng(seed), arena: { w: W, h: H2 }, entry: iEntry, exits: iExits, seed,
        doodads: [], pois: [], camps: [], breakables: [], npcs: [],
        garrisons: [], caveSeeds: [], reserved: [],
      };
      const masses = carveMassifs(ctx, { ...regimeDef('massif_i_forced', { ...MERGED, massifMasses: forcedPool }), seed });
      const interiors = masses.filter(m => m.interior).length;
      if (!interiors) fail('I: forced control minted no courts');
      else if (ctx.garrisons.length !== interiors) {
        fail(`I: forced garrison-only table garrisoned ${ctx.garrisons.length}/${interiors} courts — the draw leaks`);
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
      // THE RING-TENANT DEBUT: occupancy is the kind's own table now — the
      // relief read holds as the table's GARRISON SHARE (rows that post a
      // pack: garrison + the held_stock composition) staying at the old
      // one-in-five, never past 0.3; and the DRY WELL (vacant) stays a
      // whisper, never the theme.
      if (!well.tenants?.length) fail('J: well_court authors no tenant table — the ring-tenant debut is gone');
      else {
        const tot = well.tenants.reduce((a, r) => a + r.weight, 0);
        const manned = well.tenants.filter(r => r.kind === 'garrison' || r.kind === 'held_stock')
          .reduce((a, r) => a + r.weight, 0);
        if (manned / tot > 0.3) fail(`J: well_court garrison share ${(manned / tot * 100).toFixed(0)}% rose past the relief read`);
        const vac = well.tenants.filter(r => r.kind === 'vacant').reduce((a, r) => a + r.weight, 0);
        if (!vac) fail('J: well_court table lost its dry well (the vacant breather)');
        if (vac / tot > 0.25) fail(`J: well_court stands dry at ${(vac / tot * 100).toFixed(0)}% — vacancy is a whisper here, not the theme`);
      }
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

// --- Rig K: THE RING TENANTS — one draw per court, fork-law pure --------------
// The expansion-lane lever (the court-country pass's recorded want): a court
// kind (or a pool row via `over.tenants`) authors a weighted OCCUPANCY TABLE —
// one draw per ring on a per-mass fork of the body's own shape seed
// (TENANT_SALT), resolving to ONE registered tenant kind whose handler seats
// the occupant off the same forked stream. The laws pinned here are the
// lever's whole contract; each pin was bite-verified by toggling its engine
// clause when the rig landed.
{
  const K_PARAMS = { massifCoverage: [0.2, 0.26] as [number, number], massifSizeR: [200, 300] as [number, number] };

  // K1 — THE FORK LAW, strongest form: a vacant-only table on a kind with no
  // garrison and no inner rows must leave the WHOLE layout byte-identical —
  // the draw, the registry resolve and the handler cost ZERO layout-stream
  // draws (doodads, grid, POIs, garrisons all match the table-less mint).
  for (let s = 0; s < Math.min(SEEDS, 6); s++) {
    const seed = seedAt(s) ^ 0x7e1;
    const plainDef = defOf('massif_k1', [], { layoutParams: { ...K_PARAMS, massifMasses: [{ kind: 'fold', weight: 1 }] } });
    const tableDef = defOf('massif_k1', [], { layoutParams: { ...K_PARAMS, massifMasses: [{ kind: 'fold', weight: 1, over: { tenants: [{ kind: 'vacant', weight: 1 }] } }] } });
    const a = gen(plainDef, seed), b = gen(tableDef, seed);
    if (JSON.stringify(a.doodads) !== JSON.stringify(b.doodads)) fail(`K1: seed ${seed} a vacant table moved the dress — the fork leaked into the layout stream`);
    const ga = a.walk instanceof GridWalkField ? a.walk.pack().kbits : 'a';
    const gb = b.walk instanceof GridWalkField ? b.walk.pack().kbits : 'b';
    if (ga !== gb) fail(`K1: seed ${seed} a vacant table moved the grid`);
    if (JSON.stringify(a.pois) !== JSON.stringify(b.pois)) fail(`K1: seed ${seed} a vacant table moved the POIs`);
    if (a.garrisons.length || b.garrisons.length) fail(`K1: seed ${seed} a garrison posted from nowhere`);
  }

  // K2 — THE REPLACEMENT LAW + carve identity: a table on a kind that
  // authors independent garrison + inner chances (ruincourt: 0.35 + urns)
  // SILENCES both — while the carved masses stay byte-identical to the
  // table-less carve on the same seed.
  {
    const mkRows = (tenants?: TenantRow[]): unknown[] => [{
      kind: 'ruincourt', weight: 1,
      over: { shapes: [{ shape: 'court', weight: 1 }], ...(tenants ? { tenants } : {}) },
    }];
    let plainGarr = 0, plainPots = 0;
    for (let s = 0; s < Math.min(SEEDS, 8); s++) {
      const seed = seedAt(s) ^ 0x7e2;
      const mk = (rows: unknown[]): ZoneDef => defOf('massif_k2', [], { layoutParams: { ...K_PARAMS, massifMasses: rows }, biome: 'desert' });
      const plainRows = mkRows();
      const vacantRows = mkRows([{ kind: 'vacant', weight: 1 }]);
      const cPlain = bareCtx(seed);
      const plain = carveMassifs(cPlain, { ...mk(plainRows), seed });
      const cVac = bareCtx(seed);
      const vac = carveMassifs(cVac, { ...mk(vacantRows), seed });
      if (JSON.stringify(plain) !== JSON.stringify(vac)) fail(`K2: seed ${seed} the table disturbed the carve — the fork law broke`);
      plainGarr += cPlain.garrisons.length;
      if (cVac.garrisons.length) fail(`K2: seed ${seed} a vacant table still posted ${cVac.garrisons.length} garrisons — the replacement law broke`);
      // The dress lane: the table-less kind stocks its floors (urns/pots
      // are inner-only kinds — the skirt speaks rubble/rock); the tabled
      // kind must not.
      const potKinds = new Set(['burial_urn', 'clay_pots']);
      const dPlain = gen(mk(plainRows), seed).doodads.filter(d => potKinds.has(d.kind)).length;
      const dVac = gen(mk(vacantRows), seed).doodads.filter(d => potKinds.has(d.kind)).length;
      plainPots += dPlain;
      if (dVac) fail(`K2: seed ${seed} a vacant table still stocked ${dVac} inner pieces — the replacement law broke`);
    }
    if (!plainGarr) fail('K2: pressure — the independent lane never posted a garrison (dead rig)');
    if (!plainPots) fail('K2: pressure — the independent lane never stocked a floor (dead rig)');
  }

  // K3 — ONE OCCUPANT, EXCLUSIVELY + weights honored: a 3:1 garrison/stock
  // table splits the courts — every court draws exactly one tenant (a posted
  // pack XOR a stocked floor, never both, never neither), and the weighting
  // shows up across the sweep.
  {
    const table: TenantRow[] = [
      { kind: 'garrison', weight: 3, faction: 'gnoll' },
      { kind: 'stock', weight: 1, rows: [{ kind: 'clay_pots', weight: 1, radius: [10, 14] }], chance: 1, spacing: 40 },
    ];
    const rows = [{ kind: 'fold', weight: 1, over: { tenants: table } }];
    let courts = 0, garr = 0, stocked = 0;
    for (let s = 0; s < Math.min(SEEDS, 10); s++) {
      const seed = seedAt(s) ^ 0x7e3;
      const def = defOf('massif_k3', [], { layoutParams: { ...K_PARAMS, massifMasses: rows } });
      const ctx = bareCtx(seed);
      const masses = carveMassifs(ctx, { ...def, seed });
      const pots = gen(def, seed).doodads.filter(d => d.kind === 'clay_pots');
      for (const m of masses) {
        if (!m.interior) continue;
        courts++;
        const hasG = ctx.garrisons.some(g => g.pos.x === m.interior!.x && g.pos.y === m.interior!.y);
        const floorR = m.r * 0.6 * 0.9 + 15;
        const hasS = pots.some(d => Math.hypot(d.pos.x - m.interior!.x, d.pos.y - m.interior!.y) <= floorR);
        if (hasG && hasS) fail(`K3: seed ${seed} a court drew TWO tenants (garrison + stock)`);
        if (!hasG && !hasS) fail(`K3: seed ${seed} a court drew NO tenant (the garrison/stock table left it bare)`);
        if (hasG) garr++; else stocked++;
      }
    }
    if (courts < 20) fail(`K3: pressure — only ${courts} courts over the sweep (dead rig)`);
    const gFrac = garr / Math.max(1, courts);
    if (gFrac < 0.55 || gFrac > 0.92) fail(`K3: the 3:1 table drew ${garr} garrisons / ${stocked} stocks over ${courts} courts (${gFrac.toFixed(2)}) — weights not honored`);
    note(`K3: ${garr} garrisons / ${stocked} stocks over ${courts} courts`);
  }

  // K4 — THE ROW GRAIN: `over.tenants` scopes to its row alone — the sibling
  // row's independent lane stands untouched beside it.
  {
    const rows = [
      { kind: 'fold', weight: 1, over: { garrison: { chance: 1, faction: 'gnoll' } } },
      { kind: 'ruincourt', weight: 1, over: { shapes: [{ shape: 'court', weight: 1 }], tenants: [{ kind: 'vacant', weight: 1 }] } },
    ];
    let folds = 0, ruins = 0;
    for (let s = 0; s < Math.min(SEEDS, 8); s++) {
      const seed = seedAt(s) ^ 0x7e4;
      const ctx = bareCtx(seed);
      const masses = carveMassifs(ctx, { ...defOf('massif_k4', [], { layoutParams: { ...K_PARAMS, massifMasses: rows } }), seed });
      for (const m of masses) {
        if (!m.interior) continue;
        const g = ctx.garrisons.some(x => x.pos.x === m.interior!.x && x.pos.y === m.interior!.y);
        if (m.kind === 'fold') { folds++; if (!g) fail(`K4: seed ${seed} a chance-1 fold court went unposted beside a tabled row`); }
        if (m.kind === 'ruincourt') { ruins++; if (g) fail(`K4: seed ${seed} a vacant-tabled ruincourt court posted a garrison`); }
      }
    }
    if (!folds || !ruins) fail(`K4: pressure — sweep landed ${folds} fold / ${ruins} ruincourt courts (dead rig)`);
  }

  // K5 — THE CACHE KNOT: containers cluster on the court floor, past the POI
  // seat's standoff, never past the floor, inside the count band — and the
  // knot never leaks into the open field.
  {
    const rows = [{
      kind: 'fold', weight: 1,
      over: { tenants: [{ kind: 'cache', weight: 1, rows: [{ kind: 'clay_pots', weight: 1, radius: [10, 14] }], count: [3, 5] }] },
    }];
    let pieces = 0, courts = 0;
    for (let s = 0; s < Math.min(SEEDS, 8); s++) {
      const seed = seedAt(s) ^ 0x7e5;
      const def = defOf('massif_k5', [], { layoutParams: { ...K_PARAMS, massifMasses: rows } });
      const out = gen(def, seed);
      const masses = carveMassifs(bareCtx(seed), { ...def, seed });
      const pots = out.doodads.filter(d => d.kind === 'clay_pots');
      for (const m of masses.filter(m => m.interior)) {
        courts++;
        const floorR = m.r * 0.6 * 0.9;
        const mine = pots.filter(d => Math.hypot(d.pos.x - m.interior!.x, d.pos.y - m.interior!.y) <= floorR + 1e-6);
        pieces += mine.length;
        if (mine.length > 5) fail(`K5: seed ${seed} a cache knot holds ${mine.length} pieces — over the count band`);
        for (const d of mine) {
          if (Math.hypot(d.pos.x - m.interior!.x, d.pos.y - m.interior!.y) < 42 - 1e-6) {
            fail(`K5: seed ${seed} a cache piece crowds the POI seat`);
          }
        }
      }
      for (const d of pots) {
        if (!masses.some(m => m.interior && Math.hypot(d.pos.x - m.interior.x, d.pos.y - m.interior.y) <= m.r * 0.6 * 0.9 + 1e-6)) {
          fail(`K5: seed ${seed} a cache piece at ${Math.round(d.pos.x)},${Math.round(d.pos.y)} leaked outside every floor`);
        }
      }
    }
    if (!courts) fail('K5: pressure — no court minted (dead rig)');
    if (!pieces) fail('K5: pressure — the cache never landed a container (dead rig)');
    note(`K5: ${pieces} cache pieces over ${courts} courts`);
  }

  // K6 — REGISTRY-RESOLVED handlers: the core four + the held_stock
  // composition stand; a probe-registered kind runs once per court on a
  // deterministic forked stream; an unknown kind seats nothing and breaks
  // nothing; an EMPTY table is no law at all (the independent lanes stand).
  {
    for (const k of ['garrison', 'stock', 'cache', 'vacant']) {
      if (!tenantKindIds().includes(k)) fail(`K6: core tenant kind '${k}' missing`);
    }
    if (!tenantKindIds().includes('held_stock')) fail('K6: content tenant kind held_stock missing (the composition debut)');
    const calls: number[] = [];
    registerTenantKind('probe_totem', (_ctx, _def, _grid, mass, rng) => {
      if (!mass.interior) fail('K6: a handler received a court with no interior');
      calls.push(rng.int(0, 1 << 30));
    });
    const rows = [{ kind: 'fold', weight: 1, over: { tenants: [{ kind: 'probe_totem', weight: 1 }] } }];
    const seed = seedAt(4) ^ 0x7e6;
    const def = defOf('massif_k6', [], { layoutParams: { ...K_PARAMS, massifMasses: rows } });
    const m1 = carveMassifs(bareCtx(seed), { ...def, seed });
    const first = [...calls];
    calls.length = 0;
    carveMassifs(bareCtx(seed), { ...def, seed });
    if (!first.length) fail('K6: the probe-registered tenant kind never ran');
    const interiors = m1.filter(m => m.interior).length;
    if (first.length !== interiors) fail(`K6: the handler ran ${first.length}× over ${interiors} courts — not one draw per court`);
    if (JSON.stringify(first) !== JSON.stringify(calls)) fail('K6: the forked handler stream is not deterministic across same-seed carves');
    // Unknown kind: warns once, seats nothing, carve identical.
    const unkRows = [{ kind: 'fold', weight: 1, over: { tenants: [{ kind: 'no_such_tenant', weight: 1 }] } }];
    const cU = bareCtx(seed);
    const mU = carveMassifs(cU, { ...defOf('massif_k6', [], { layoutParams: { ...K_PARAMS, massifMasses: unkRows } }), seed });
    if (cU.garrisons.length) fail('K6: an unknown tenant kind posted a garrison');
    if (JSON.stringify(mU) !== JSON.stringify(m1)) fail('K6: an unknown tenant kind disturbed the carve');
    // The empty table: no law at all.
    const emptyRows = [{ kind: 'fold', weight: 1, over: { tenants: [], garrison: { chance: 1, faction: 'gnoll' } } }];
    const cE = bareCtx(seed);
    const mE = carveMassifs(cE, { ...defOf('massif_k6', [], { layoutParams: { ...K_PARAMS, massifMasses: emptyRows } }), seed });
    const eInteriors = mE.filter(m => m.interior).length;
    if (eInteriors && cE.garrisons.length !== eInteriors) {
      fail(`K6: an EMPTY tenant table silenced the independent garrison (${cE.garrisons.length}/${eInteriors}) — empty is no law`);
    }
  }
}

// --- Rig L: THE DEPTH-GRADED DIAL — the byDepth ramp through layoutParam ------
// The environment-lever pass: one authored form (`{ byDepth: [atRim, atHeart] }`)
// resolved at the ONE dial seam (levelgen's layoutParam), so ANY recipe knob
// can grade itself over the zone's place in its biome. Pinned: exact ends,
// the midpoint absent-geo law, the clamp, the marker guard (legitimate
// object/array values pass through BY REFERENCE — including overgrowthOf's
// historical bare-pair dialect), malformed → the reference default, and
// ABSENT == BYTE-IDENTICAL (a ramp-less def cannot tell geo 0 from geo 1).
{
  const geoDef = (geo: number | undefined, params: Record<string, unknown>): ZoneDef =>
    defOf('massif_l', [], {
      layoutParams: params,
      ...(geo !== undefined ? { geo: { biomeDepth: geo } } : {}),
    });

  // L1 — resolver semantics, directly.
  const scalar = { byDepth: [90, 120] };
  if (layoutParam<number>(geoDef(0, { d: scalar }), 'd', -1) !== 90) fail('L1: rim end not exact');
  if (layoutParam<number>(geoDef(1, { d: scalar }), 'd', -1) !== 120) fail('L1: heart end not exact');
  if (layoutParam<number>(geoDef(0.25, { d: scalar }), 'd', -1) !== 90 * 0.75 + 120 * 0.25) fail('L1: quarter-depth lerp wrong');
  if (layoutParam<number>(geoDef(undefined, { d: scalar }), 'd', -1) !== 105) fail('L1: absent geo must read the midpoint');
  if (layoutParam<number>(geoDef(1.7, { d: scalar }), 'd', -1) !== 120) fail('L1: depth past 1 must clamp to the heart end');
  if (layoutParam<number>(geoDef(-0.3, { d: scalar }), 'd', -1) !== 90) fail('L1: depth below 0 must clamp to the rim end');
  const band = { byDepth: [[0.2, 0.28], [0.3, 0.38]] };
  const bandAt = (g: number | undefined): number[] =>
    layoutParam<number[]>(geoDef(g, { b: band }), 'b', [-1, -1]);
  const rimB = bandAt(0), heartB = bandAt(1), midB = bandAt(undefined);
  if (rimB[0] !== 0.2 || rimB[1] !== 0.28) fail(`L1: band rim end [${rimB}] — expected the authored [0.2,0.28]`);
  if (heartB[0] !== 0.3 || heartB[1] !== 0.38) fail(`L1: band heart end [${heartB}] — expected the authored [0.3,0.38]`);
  if (Math.abs(midB[0] - 0.25) > 1e-12 || Math.abs(midB[1] - 0.33) > 1e-12) fail(`L1: band midpoint [${midB}] — the absent-geo law broke`);
  // The marker guard: plain objects and arrays pass through BY REFERENCE.
  const obj = { chance: 0.5, max: 2 };
  if (layoutParam<unknown>(geoDef(1, { o: obj }), 'o', undefined) !== obj) fail('L1: a plain object dial no longer passes through by reference');
  const arr = [{ kind: 'tor', weight: 1 }];
  if (layoutParam<unknown>(geoDef(1, { a: arr }), 'a', undefined) !== arr) fail('L1: an array dial no longer passes through by reference');
  const barePair = [0.2, 0.6];
  if (layoutParam<unknown>(geoDef(1, { og: barePair }), 'og', 0) !== barePair) fail('L1: the bare-pair overgrowth dialect must pass through untouched');
  // Malformed ramps: warn once per key, resolve to the reference default.
  if (layoutParam(geoDef(1, { m1: { byDepth: [1, 'x'] } }), 'm1', 7) !== 7) fail('L1: a mixed-type ramp must fall to the default');
  if (layoutParam(geoDef(1, { m2: { byDepth: [[1, 2], [3]] } }), 'm2', 7) !== 7) fail('L1: a length-mismatched band ramp must fall to the default');
  if (layoutParam(geoDef(1, { m3: { byDepth: [1, 2, 3] } }), 'm3', 7) !== 7) fail('L1: a three-ended ramp must fall to the default');

  // L2 — ABSENT == BYTE-IDENTICAL: a ramp-less massif def mints the same
  // layout bytes at geo 0, geo 1, and no geo at all — the resolver reads
  // geography ONLY through an authored ramp.
  const FLAT = {
    massifMasses: [{ kind: 'tor', weight: 1 }],
    massifCoverage: [0.2, 0.26] as [number, number],
    massifSizeR: [200, 300] as [number, number],
  };
  const fp = (out: GeneratedLayout): string =>
    JSON.stringify(out.doodads) + '|' + (out.walk instanceof GridWalkField ? out.walk.pack().kbits : '?') + '|' + JSON.stringify(out.pois);
  for (let s = 0; s < Math.min(SEEDS, 6); s++) {
    const seed = seedAt(s) ^ 0x1de9;
    const at = (geo: number | undefined): string =>
      fp(gen(defOf('massif_l2', [], { layoutParams: FLAT, ...(geo !== undefined ? { geo: { biomeDepth: geo } } : {}) }), seed));
    const rim = at(0), heart = at(1), none = at(undefined);
    if (rim !== heart || rim !== none) fail(`L2: seed ${seed} a ramp-less def minted different bytes across the geo swing — absent is no longer byte-identical`);
  }

  // L3 — the ramp moves the mint in the authored direction: coverage, body
  // budget, lane and dart budget all ramped up-with-depth paint far more
  // wall at the heart than at the rim (averaged over the sweep; the
  // ramp-less twin's identity is L2). Barrow-only on rig D's reasoning —
  // the densest packer, so the heart regime is D's own proven ground — and
  // the lane's heart end is D's proven 24.
  const RAMPED = {
    massifMasses: [{ kind: 'barrow', weight: 1 }],
    massifSizeR: [150, 220] as [number, number],
    massifCoverage: { byDepth: [[0.12, 0.16], [0.3, 0.34]] },
    massifMaxMasses: { byDepth: [6, 20] },
    massifLaneW: { byDepth: [110, 24] },
    massifPlaceTries: { byDepth: [90, 150] },
  };
  let rimFrac = 0, heartFrac = 0, l3n = 0;
  for (let s = 0; s < Math.min(SEEDS, 6); s++) {
    const seed = seedAt(s) ^ 0x1dea;
    const at = (geo: number): number => {
      const st = gridStats(gen(defOf('massif_l3', [], { layoutParams: RAMPED, geo: { biomeDepth: geo } }), seed));
      return st ? st.wallFrac : NaN;
    };
    const r = at(0), h = at(1);
    if (Number.isNaN(r) || Number.isNaN(h)) { fail(`L3: seed ${seed} no grid`); continue; }
    rimFrac += r; heartFrac += h; l3n++;
  }
  if (l3n && !(heartFrac / l3n > rimFrac / l3n + 0.05)) {
    fail(`L3: ramped coverage painted rim ${(rimFrac / l3n).toFixed(3)} vs heart ${(heartFrac / l3n).toFixed(3)} — the ramp never pressed`);
  }
  note(`L: ramp direction rim ${(rimFrac / Math.max(1, l3n)).toFixed(3)} → heart ${(heartFrac / Math.max(1, l3n)).toFixed(3)}`);
}

// --- Rig M: THE PER-BIOME TABLE — over.tenants beats the kind's OWN table -----
// The environment-lever headline: the SAME registered kind holds court
// differently per country. A pool row's `over.tenants` REPLACES the kind's
// own authored table wholesale (the resolved-kind merge is the whole law),
// and a row WITHOUT the override keeps the kind's own. Pinned on well_court —
// the shipped kind that AUTHORS a table (stocked cisterns + vacancy, the
// garrison a whisper; rig J owns that shape, this rig rides it as substrate).
{
  const wc = massKindOf('well_court');
  if (!wc.tenants?.length) fail('M: well_court no longer authors its own tenant table — this rig needs the substrate');
  const M_PARAMS = { massifCoverage: [0.2, 0.26] as [number, number], massifSizeR: [200, 300] as [number, number] };
  let ownCourts = 0, ownGarr = 0, ownCisterns = 0;
  let reCourts = 0, reGarr = 0, reCisterns = 0;
  for (let s = 0; s < Math.min(SEEDS, 10); s++) {
    const seed = seedAt(s) ^ 0x3e7a;
    const mk = (rows: unknown[]): ZoneDef =>
      defOf('massif_m', [], { layoutParams: { ...M_PARAMS, massifMasses: rows }, biome: 'courtland' });
    const ownDef = mk([{ kind: 'well_court', weight: 1 }]);
    const reDef = mk([{
      kind: 'well_court', weight: 1,
      over: { tenants: [{ kind: 'garrison', weight: 1, faction: 'probe_dynasty' }] },
    }]);
    const cOwn = bareCtx(seed);
    const own = carveMassifs(cOwn, { ...ownDef, seed });
    const cRe = bareCtx(seed);
    const re = carveMassifs(cRe, { ...reDef, seed });
    if (JSON.stringify(own) !== JSON.stringify(re)) fail(`M: seed ${seed} the retable disturbed the carve — the fork law broke`);
    ownCourts += own.filter(m => m.interior).length;
    ownGarr += cOwn.garrisons.length;
    for (const g of cOwn.garrisons) {
      if (g.faction !== 'sarcophate') fail(`M: seed ${seed} the kind's own table posted '${g.faction}' — the dynasty default is gone`);
    }
    reCourts += re.filter(m => m.interior).length;
    reGarr += cRe.garrisons.length;
    for (const g of cRe.garrisons) {
      if (g.faction !== 'probe_dynasty') fail(`M: seed ${seed} the retable posted '${g.faction}' — the override row's tailoring lost`);
    }
    ownCisterns += gen(ownDef, seed).doodads.filter(d => d.kind === 'stone_cistern').length;
    reCisterns += gen(reDef, seed).doodads.filter(d => d.kind === 'stone_cistern').length;
  }
  if (!ownCourts) fail('M: pressure — no well court ever minted (dead rig)');
  if (!ownCisterns) fail('M: pressure — the kind\'s own table never stocked a cistern across the sweep (dead control)');
  if (ownGarr >= ownCourts) fail(`M: the kind's own table garrisoned every court (${ownGarr}/${ownCourts}) — the control reads like the override`);
  if (reGarr !== reCourts) fail(`M: the garrison-only retable posted ${reGarr}/${reCourts} courts — over.tenants did not replace the kind's own table`);
  if (reCisterns) fail(`M: the retable still stocked ${reCisterns} cisterns — the kind's own stock rows survived the replacement`);
  note(`M: own table ${ownGarr}/${ownCourts} garrisoned + ${ownCisterns} cisterns; retable ${reGarr}/${reCourts} + ${reCisterns}`);
}

// --- Rig N: THE NEEDLES PRESS — the depth-graded debut on the shipped rows ----
// The commissioned regime: butte country that CROWDS the deeper the zone
// stands in its biome — more, slightly slimmer tables on tighter lanes —
// while the fringe keeps today's open read and every structural law holds at
// the heart's densest roll. Also the biome-restriction pin: the pool is
// CLIFF KINDS ONLY (butte alone — no tenants, no garrison, no ring
// silhouettes: no court society in the spire country).
{
  const ts = TILESETS.needles;
  if (!ts) fail('N: needles tileset missing');
  else if (ts.forceLayout !== 'needles') fail(`N: needles forceLayout '${ts.forceLayout}' — the butte coupling is gone`);
  else {
    // N1 — statics: the restricted pool + the authored ramps' shape.
    const faces = [
      { label: 'base', params: ts.layoutParams as Record<string, unknown> },
      ...(ts.variants ?? []).map(v => ({
        label: v.name ?? '?', params: { ...ts.layoutParams, ...v.layoutParams } as Record<string, unknown>,
      })),
    ];
    for (const f of faces) {
      const pool = f.params.massifMasses as { kind: string }[] | undefined;
      if (!pool?.length) { fail(`N: face '${f.label}' carries no massif pool`); continue; }
      for (const row of pool) {
        if (row.kind !== 'butte') fail(`N: face '${f.label}' rolls '${row.kind}' — the needle country is butte-only`);
        const kd = massKindOf(row.kind);
        if (kd.tenants?.length) fail(`N: '${row.kind}' authors a tenant table — the spire country holds no court society`);
        if (kd.garrison) fail(`N: '${row.kind}' authors a garrison — cliffs post nobody`);
        if (kd.shapes.some(sh => sh.shape === 'court' || sh.shape === 'crescent')) {
          fail(`N: '${row.kind}' rolls ring silhouettes — cliff kinds only`);
        }
      }
    }
    const P = ts.layoutParams as Record<string, unknown>;
    for (const key of ['massifCoverage', 'massifSizeR', 'massifLaneW', 'massifMaxMasses', 'massifPlaceTries']) {
      const v = P[key];
      if (!v || typeof v !== 'object' || Array.isArray(v) || !('byDepth' in (v as object))) {
        fail(`N: needles ${key} carries no byDepth ramp — the press is gone`);
      }
    }
    if (typeof P.massifPortalClear !== 'number') fail('N: massifPortalClear must stay FLAT — portal clearance never ramps');

    // Resolved ends: the rim reads its authored end exactly (edge zones stay
    // recognizable), the heart tightens (lane down, bodies up, tables no
    // grander), and the absent-geo read (genqa's regime) is the midpoint.
    const W = Math.round((ts.sizeW[0] + ts.sizeW[1]) / 2), H2 = Math.round((ts.sizeH[0] + ts.sizeH[1]) / 2);
    const nEntry = vec(140, H2 / 2);
    const nExits = [vec(W - 140, H2 / 2), vec(W / 2, 140)];
    const needleDef = (geo: number | undefined): ZoneDef => ({
      id: 'massif_n', name: 'QA needles', level: 8, size: { w: W, h: H2 },
      theme: ts.theme as ZoneDef['theme'],
      layout: [...(ts.common ?? []), ...ts.layout],
      layoutType: 'needles',
      layoutParams: ts.layoutParams as Record<string, unknown>,
      biome: ts.biome,
      ...(geo !== undefined ? { geo: { biomeDepth: geo } } : {}),
      objective: { kind: 'clear' }, exits: [], map: { x: 0, y: 0 },
    });
    const laneRim = layoutParam<number>(needleDef(0), 'massifLaneW', -1);
    const laneHeart = layoutParam<number>(needleDef(1), 'massifLaneW', -1);
    const laneMid = layoutParam<number>(needleDef(undefined), 'massifLaneW', -1);
    if (!(laneHeart < laneRim)) fail(`N: laneW rim ${laneRim} → heart ${laneHeart} — the press must TIGHTEN with depth`);
    if (laneHeart < 64) fail(`N: laneW heart end ${laneHeart} under the production-proven floor (64, the bocage face)`);
    if (laneMid !== (laneRim + laneHeart) / 2) fail('N: absent-geo laneW is not the midpoint — genqa\'s regime drifted');
    const maxRim = layoutParam<number>(needleDef(0), 'massifMaxMasses', -1);
    const maxHeart = layoutParam<number>(needleDef(1), 'massifMaxMasses', -1);
    if (!(maxHeart > maxRim)) fail(`N: maxMasses rim ${maxRim} → heart ${maxHeart} — the heart must afford MORE bodies`);
    const covRim = layoutParam<[number, number]>(needleDef(0), 'massifCoverage', [-1, -1]);
    const covHeart = layoutParam<[number, number]>(needleDef(1), 'massifCoverage', [-1, -1]);
    if (!(covHeart[0] > covRim[0] && covHeart[1] > covRim[1])) {
      fail(`N: coverage rim [${covRim}] → heart [${covHeart}] — both ends must press with depth`);
    }
    const szRim = layoutParam<[number, number]>(needleDef(0), 'massifSizeR', [-1, -1]);
    const szHeart = layoutParam<[number, number]>(needleDef(1), 'massifSizeR', [-1, -1]);
    if (!(szHeart[0] <= szRim[0] && szHeart[1] <= szRim[1])) {
      fail(`N: sizeR rim [${szRim}] → heart [${szHeart}] — heart tables must run no grander (more, slimmer needles)`);
    }
    if (layoutParam<number>(needleDef(0), 'massifPortalClear', -1) !== layoutParam<number>(needleDef(1), 'massifPortalClear', -1)) {
      fail('N: portalClear ramped — mouths must always open onto country');
    }

    // N2 — minted: the press direction on the real recipe. THE COUNT IS THE
    // CLAUSTROPHOBIA: slimmer-but-more tables hold wall AREA roughly flat
    // (paint ∝ r² and spacing ∝ bound cancel), so the commissioned signals
    // are BODY COUNT up with depth and the LANE tightened — wallFrac rides
    // the note as telemetry, never the gate. Also: the tightened lane
    // ENGAGED (some heart pair sits inside the rim lane — a seat rim rules
    // would have rejected), the weave/exit invariants whole at BOTH ends,
    // and NO court society on minted ground (zero garrisons, butte-only).
    let rimFrac = 0, heartFrac = 0, rimBodies = 0, heartBodies = 0, mints = 0, engaged = false;
    for (let s = 0; s < Math.min(SEEDS, 6); s++) {
      const seed = seedAt(s) ^ 0x9ee1;
      const mintAt = (geo: number): { frac: number; bodies: number } | null => {
        const def = needleDef(geo);
        const out = generateLayout({ ...def, seed }, { w: W, h: H2 }, new Rng(seed), nEntry, nExits);
        const st = gridStats(out);
        if (!st) { fail(`N: geo ${geo} seed ${seed} no grid`); return null; }
        if (st.comps !== 1) fail(`N: geo ${geo} seed ${seed} split the weave (${st.comps} comps)`);
        for (const e of nExits) if (!st.grid.reachable(nEntry, e)) fail(`N: geo ${geo} seed ${seed} exit unreachable`);
        // Carve replay (rig D's stream-align law — carveMassifs is the
        // needles recipe's first draw).
        const ctx: GenCtx = {
          rng: new Rng(seed), arena: { w: W, h: H2 }, entry: nEntry, exits: nExits, seed,
          doodads: [], pois: [], camps: [], breakables: [], npcs: [],
          garrisons: [], caveSeeds: [], reserved: [],
        };
        const masses = carveMassifs(ctx, { ...def, seed });
        if (ctx.garrisons.length) fail(`N: geo ${geo} seed ${seed} the spire country posted ${ctx.garrisons.length} garrisons`);
        for (const m of masses) if (m.kind !== 'butte') fail(`N: geo ${geo} seed ${seed} minted a '${m.kind}' — the butte-only pool leaked`);
        const lane = geo >= 1 ? laneHeart : laneRim;
        for (let i = 0; i < masses.length; i++) {
          for (let j = i + 1; j < masses.length; j++) {
            const d = Math.hypot(masses[i].at.x - masses[j].at.x, masses[i].at.y - masses[j].at.y);
            if (d < masses[i].bound + masses[j].bound + lane - 1e-6) {
              fail(`N: geo ${geo} seed ${seed} masses ${i}/${j} broke the resolved lane (${Math.round(d)}px)`);
            }
            if (geo >= 1 && d < masses[i].bound + masses[j].bound + laneRim) engaged = true;
          }
        }
        return { frac: st.wallFrac, bodies: masses.length };
      };
      const r = mintAt(0), h = mintAt(1);
      if (!r || !h) continue;
      rimFrac += r.frac; heartFrac += h.frac; rimBodies += r.bodies; heartBodies += h.bodies; mints++;
    }
    if (!mints) fail('N: no mint pair ever completed (dead rig)');
    else {
      if (!(heartBodies > rimBodies + mints)) {
        fail(`N: press bodies — rim ${rimBodies} vs heart ${heartBodies} over ${mints} mint pairs: the heart must stand MORE tables (at least one more per zone on average)`);
      }
      if (!engaged) fail('N: pressure — no heart pair ever sat inside the rim lane (the tightened lane never engaged; the press is cosmetic)');
      note(`N: rim ${rimBodies} bodies @ ${(rimFrac / mints).toFixed(3)} → heart ${heartBodies} bodies @ ${(heartFrac / mints).toFixed(3)}, lane ${laneRim}→${laneHeart}`);
    }
  }
}

// --- Rig O: THE COLOSSAL ANCHOR LANE — landmark-grade bodies seated first ----
// The batch-18 lane (engine/massif.ts massifAnchors): anchors place BEFORE
// the coverage darts, over the coverage budget, under UNBENDING structural
// law — the weave lane, the ground seat, and a portal clearance that GROWS
// with the body (anchorPortalK). Pinned here: the shipped WYRMFIELDS regime
// (the volcanic deep-heart face — one exclusive wyrm_caldera crowning almost
// every mint, slag tors weaving around it), THE FIRST-SEAT ORDER (a seated
// anchor is always masses[0]), THE TERRITORIAL LAW under a hostile pool
// (same-kind rows can never stand two), the per-row MAX cap, THE GRACEFUL
// REFUSAL (an unseatable band ships the zone without it, laws intact), and
// the anchor-chance byDepth ramp's BOTH ends (the face's own rim may go
// calderaless; its heart always crowns). NOTE: this probe's registry world
// deliberately omits data/lairs (the tenant-door half lives in probe_lairs
// rig N with the full import set), so lair_mouth draws degrade to a warn
// here — the LANE is what this rig owns.
{
  const ts = TILESETS.wyrmfields;
  if (!ts) fail('O: wyrmfields tileset missing');
  else if (ts.forceLayout !== 'massif') fail(`O: wyrmfields forceLayout '${ts.forceLayout}' — the massif coupling is gone`);
  else {
    // O1 — statics: the deep-heart staging, the anchor row's shape, the
    // caldera kind's ring dials, the slagcrag TRUE WALL.
    if (!ts.depthAffinity || (ts.depthAffinity.from ?? 0) < 0.55) {
      fail('O: wyrmfields must stage to the biome heart (depthAffinity.from ≥ 0.55)');
    }
    const P = ts.layoutParams as Record<string, unknown>;
    const anchors = P.massifAnchors as MassAnchorRow[] | undefined;
    if (!anchors || anchors.length !== 1) fail('O: wyrmfields must field exactly ONE anchor row');
    const aRow = anchors?.[0];
    if (aRow && (aRow.kind !== 'wyrm_caldera' || !aRow.exclusive || (aRow.max ?? 1) !== 1
      || !aRow.sizeR || aRow.sizeR[0] < 380)) {
      fail('O: the caldera row must be exclusive, max 1, at colossal scale (sizeR ≥ 380)');
    }
    const chance = P.massifAnchorChance;
    if (!chance || typeof chance !== 'object' || !('byDepth' in (chance as object))) {
      fail('O: massifAnchorChance carries no byDepth ramp — the staging doctrine is gone');
    }
    const kd = massKindOf('wyrm_caldera');
    if (!kd.shapes.every(s => s.shape === 'court')) fail('O: the caldera must be court-shaped (the ring floor is the den seat)');
    if (!kd.ringInner || !kd.mouths || kd.mouths[1] !== 1) fail('O: the caldera must author its ring (ringInner + ONE breach)');
    if (!kd.tenants?.length || kd.tenants.reduce((a, r) => a + r.weight, 0) !== 100) {
      fail('O: the caldera tenant table must stand at total 100 (the ambiguous grain)');
    }
    const doorRow = kd.tenants?.find(t => t.kind === 'lair_mouth');
    if (!doorRow || (doorRow.params as { den?: string } | undefined)?.den !== 'kilnhoard') {
      fail("O: the caldera's lair_mouth row must key den 'kilnhoard'");
    }
    if (!kd.tenants?.some(t => t.kind === 'vacant' && t.weight > 0)) {
      fail('O: the caldera table must keep vacancy (a caldera that always pays is a promise, not a question)');
    }
    const slag = regionKind('slagcrag');
    if (!slag || slag.walkable || !slag.blocks || !slag.blocksShot || !slag.blocksSight) {
      fail('O: slagcrag must be a TRUE WALL (blocks + blocksShot + blocksSight)');
    }

    // The shipped-face def at a forced geo (the rig N idiom): the mint the
    // wyrmfields actually run, heart and rim.
    const W = Math.round((ts.sizeW[0] + ts.sizeW[1]) / 2), H2 = Math.round((ts.sizeH[0] + ts.sizeH[1]) / 2);
    const oEntry = vec(140, H2 / 2);
    const oExits = [vec(W - 140, H2 / 2), vec(W / 2, 140)];
    const fieldDef = (geo: number | undefined): ZoneDef => ({
      id: 'massif_o', name: 'QA wyrmfields', level: 10, size: { w: W, h: H2 },
      theme: ts.theme as ZoneDef['theme'],
      layout: [...(ts.common ?? []), ...ts.layout],
      layoutType: 'massif',
      layoutParams: ts.layoutParams as Record<string, unknown>,
      biome: ts.biome,
      ...(geo !== undefined ? { geo: { biomeDepth: geo } } : {}),
      objective: { kind: 'clear' }, exits: [], map: { x: 0, y: 0 },
    });
    const oCtx = (seed: number): GenCtx => ({
      rng: new Rng(seed), arena: { w: W, h: H2 }, entry: oEntry, exits: oExits, seed,
      doodads: [], pois: [], camps: [], breakables: [], npcs: [],
      garrisons: [], caveSeeds: [], reserved: [],
    });
    const portalClear = layoutParam<number>(fieldDef(1), 'massifPortalClear', MASSIF_CFG.portalClear);
    const portalK = layoutParam<number>(fieldDef(1), 'massifAnchorPortalK', MASSIF_CFG.anchorPortalK);
    const laneW = layoutParam<number>(fieldDef(1), 'massifLaneW', MASSIF_CFG.laneW);

    // O2 — THE HEART REGIME live: chance resolves 1 at geo 1, so EVERY seed
    // crowns exactly one caldera, seated FIRST, under every law, with the
    // ordinary slag bones still weaving around it.
    let crowned = 0, others = 0, firstBad = 0, lawBad = 0, interiorless = 0;
    for (let s = 0; s < SEEDS; s++) {
      const seed = seedAt(s) ^ 0xc07a;
      const masses = carveMassifs(oCtx(seed), { ...fieldDef(1), seed });
      const cal = masses.filter(m => m.kind === 'wyrm_caldera');
      if (cal.length > 1) fail(`O: seed ${seed} stood ${cal.length} calderas — the territorial law broke`);
      if (cal.length === 1) {
        crowned++;
        const a = cal[0];
        if (masses[0] !== a) firstBad++;
        if (!a.interior) interiorless++;
        for (const p of [oEntry, ...oExits]) {
          if (Math.hypot(p.x - a.at.x, p.y - a.at.y) < portalClear + a.bound * portalK - 1e-6) lawBad++;
        }
        for (const m of masses) {
          if (m === a) continue;
          const d = Math.hypot(m.at.x - a.at.x, m.at.y - a.at.y);
          if (d < m.bound + a.bound + laneW - 1e-6) lawBad++;
        }
      }
      others += masses.filter(m => m.kind !== 'wyrm_caldera').length;
    }
    if (crowned !== SEEDS) fail(`O: heart regime crowned ${crowned}/${SEEDS} — the measured 40/40 seat rate regressed`);
    if (firstBad) fail(`O: ${firstBad} calderas were not masses[0] — anchors must seat FIRST`);
    if (interiorless) fail(`O: ${interiorless} calderas reported no interior — the ring floor is gone`);
    if (lawBad) fail(`O: ${lawBad} structural-law breaches at colossal scale (portal-K / lane)`);
    if (others < SEEDS * 2) fail(`O: only ${others} coverage bodies over ${SEEDS} heart mints — the anchor starved the field`);

    // O3 — the ramp's RIM end: at geo 0 the chance reads its authored rim
    // value (< 1), so across the sweep BOTH outcomes must appear — the
    // face's own edge sometimes refuses to promise.
    let rimCrowned = 0;
    for (let s = 0; s < SEEDS; s++) {
      const seed = seedAt(s) ^ 0x0e1b;
      const masses = carveMassifs(oCtx(seed), { ...fieldDef(0), seed });
      if (masses.some(m => m.kind === 'wyrm_caldera')) rimCrowned++;
    }
    if (rimCrowned === 0 || rimCrowned === SEEDS) {
      fail(`O: rim regime crowned ${rimCrowned}/${SEEDS} — the byDepth chance ramp never expressed both outcomes`);
    }

    // O4 — the full recipe end-to-end at the heart: the weave stays ONE
    // component and every exit reachable with a colossal in the field.
    for (let s = 0; s < Math.min(SEEDS, 6); s++) {
      const seed = seedAt(s) ^ 0x04ea;
      const out = gen(fieldDef(1), seed);
      const st = gridStats(out);
      if (!st) { fail(`O: seed ${seed} no grid`); continue; }
      if (st.comps !== 1) fail(`O: seed ${seed} split the weave (${st.comps} comps) under the colossal`);
      for (const e of exits) if (!st.grid.reachable(entry, e)) fail(`O: seed ${seed} exit unreachable under the colossal`);
    }

    // O5 — THE TERRITORIAL LAW under a hostile pool + the per-row MAX cap:
    // two same-kind rows (both exclusive) asked for three seats can stand
    // only ONE body; the same pool non-exclusive at max 2 must some-seed
    // stand TWO and never three (the cap the law is measured against).
    const twinPool = (excl: boolean): MassAnchorRow[] => [
      { kind: 'wyrm_caldera', weight: 1, max: excl ? 3 : 2, exclusive: excl, sizeR: [340, 400] },
      { kind: 'wyrm_caldera', weight: 1, max: excl ? 3 : 2, exclusive: excl, sizeR: [340, 400] },
    ];
    const hostileDef = (excl: boolean): ZoneDef => ({
      ...fieldDef(undefined),
      layoutParams: {
        ...(ts.layoutParams as Record<string, unknown>),
        massifAnchors: twinPool(excl),
        massifAnchorChance: 1,
        massifAnchorCount: [3, 3] as [number, number],
      },
    });
    let everTwo = 0, everThree = 0, exclBroke = 0;
    for (let s = 0; s < SEEDS; s++) {
      const seed = seedAt(s) ^ 0x7e22;
      const ex = carveMassifs(oCtx(seed), { ...hostileDef(true), seed })
        .filter(m => m.kind === 'wyrm_caldera').length;
      if (ex > 1) exclBroke++;
      const open = carveMassifs(oCtx(seed ^ 0x11), { ...hostileDef(false), seed: seed ^ 0x11 })
        .filter(m => m.kind === 'wyrm_caldera').length;
      if (open >= 2) everTwo++;
      if (open > 4) everThree++; // two rows × max 2 = the hard ceiling
    }
    if (exclBroke) fail(`O: exclusion broke on ${exclBroke} seeds — two wyrm homes shared a zone`);
    if (!everTwo) fail('O: pressure — the non-exclusive control never stood two calderas (the exclusion rig proved nothing)');
    if (everThree) fail(`O: the per-row max cap broke on ${everThree} seeds`);

    // O6 — THE GRACEFUL REFUSAL: a band no arena can hold ships the zone
    // anchorless with the ordinary field intact.
    for (let s = 0; s < Math.min(SEEDS, 8); s++) {
      const seed = seedAt(s) ^ 0x9ef0;
      const def: ZoneDef = {
        ...fieldDef(1),
        layoutParams: {
          ...(ts.layoutParams as Record<string, unknown>),
          massifAnchors: [{ kind: 'wyrm_caldera', weight: 1, sizeR: [1500, 1600] }] as MassAnchorRow[],
          massifAnchorChance: 1,
        },
      };
      const masses = carveMassifs(oCtx(seed), { ...def, seed });
      if (masses.some(m => m.kind === 'wyrm_caldera')) fail(`O: seed ${seed} seated an unseatable band — the refusal lied`);
      if (!masses.length) fail(`O: seed ${seed} refused the anchor AND the field — the refusal starved coverage`);
    }
    note(`O: heart ${crowned}/${SEEDS} crowned (avg ${(others / SEEDS).toFixed(1)} coverage bodies), rim ${rimCrowned}/${SEEDS}`);
  }
}

if (fails) {
  console.log(`\nprobe_massif: ${fails} FAIL(S)`);
  process.exit(1);
} else {
  console.log('\nprobe_massif: ALL PASS');
}
