// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE CONNECTIVE TISSUE (seamless-world M0, re-scoped M1.5
// THE BORDER BLEND — src/world/tissue.ts): the country between and around
// the zones, against the TissueSampler contract (src/world/seamless.ts) and
// the partition law's cell fold (src/world/cells.ts). Pins:
//   A  THE PURITY LAW: two samplers built off the SAME world answer
//      byte-identically over a 40×40 lattice spanning two linked nodes, and
//      one sampler re-asked answers itself byte-identically (any internal
//      cache is invisible — same answers cached or cold),
//   B  THE SEA GROWS NO TISSUE + THE SHORE EXCEPTION: open-ocean ground
//      (continentAt's own verdict, the independent oracle) never samples
//      walkable — and its tone is the sea's own mapColor (the sea is
//      nobody's outskirts; a cell's claim stops at the shore),
//   C  THE ROAD RIBBON: every sample within SEAMLESS_CFG.roadHalfPx of the
//      segment between two LINKED nodes' seats reads road:true AND
//      walkable:true (roads are always walkable), while ground far off every
//      ribbon reads road:false,
//   D  THE OWN-TONE LAW: a zone whose seat stands beyond the blend band of
//      every other cell (the fold's own verdict, re-derived as oracle)
//      samples AT ITS SEAT to exactly its OWN zone tone — def.biome's
//      mapColor, the seat-field tint when the def carries none — never the
//      raw field tone of the sample point: the no-man's tone is dead inside
//      a cell,
//   E  THE NULL SEAM: getTissueSampler() is null at boot (fresh module
//      state), STILL null after builders run (buildTissueSampler is
//      export-only — install belongs to the placement lane), and the
//      registry round-trips set/read/clear,
//   F  THE CAPTURE LAW (roads): a sampler captures the graph AT BUILD —
//      linking two new nodes after the build leaves the old sampler blind
//      to their road, while a fresh sampler poured off the grown graph
//      draws it,
//   G  THE CLIFF LAW: land whose relief slope exceeds TISSUE_CFG.slopeMax
//      (the field's own elevationAt read — the independent oracle) refuses
//      tissue off-road, so the slope lane is live wiring, not dead code,
//   H  THE BLEND BAND: across a known shared border between two minted-
//      theme cells (a synthetic pair with hand-picked max-contrast biomes),
//      samples walked border-perpendicular move MONOTONICALLY per channel
//      from one zone's pure tone to the other's; the border itself is the
//      exact 50/50 mix (independent arithmetic); beyond ±blendBandPx the
//      tone is the pure own tone; the blend is deterministic across fresh
//      samplers; and a sampler built BEFORE the pair existed is blind to
//      it (THE CAPTURE LAW reaches the cells),
//   I  THE WEDGE: a point the axis-cut fold leaves in NO cell (a synthetic
//      triple whose fold is re-derived probe-side as the oracle) blends the
//      nearest TWO cells' tones — the equidistant spine reads the exact
//      50/50 of the flanking pair (the far third cell weightless), and the
//      walk across the wedge is monotone between them,
//   J  THE SOLID BETWEEN (M2 wave 5 — the walkable law AMENDED by her
//      enclosure doctrine, item 3): walkable and road over the whole A
//      lattice equal the amended derivation re-implemented verbatim as
//      oracle — road by the segment ribbon; else ocean (biomeAt) and cliff
//      (the centered elevationAt read) refuse; else INSIDE any fold cell is
//      open ground while OUTSIDE every cell only a mouth apron
//      (borderAgreedPoint of a linked resident-eligible pair, radius
//      PARTITION_CFG.mouthApronPx) admits — wedges and long-link country
//      refuse. A second scan proves the refusal FIRES on real remainder
//      ground (off-road outside-cell samples read unwalkable) and that a
//      real ribbon still crosses it,
//   K  THE MASS DRESS (M2 wave 6 — the reads the between's painter
//      consumes): the sampler CARRIES the dress read (massDressOf — the
//      TissueSample contract itself untouched, install still export-only);
//      massAt/landAt/shadeAt/flanksAt answer byte-identically across
//      independent builders; THE CLEARWAY LAW — every stamp seat the pure
//      helper massStampSeatsForChunk derives reads UNWALKABLE through the
//      sampler, stands clear of every ribbon by the shoulder (independent
//      segment oracle), outside every fold cell (re-derived oracle), and on
//      land; seats are deterministic across builders and non-empty over
//      known mass; flank weights speak the ONE WEIGHT LAW on a synthetic
//      pair (own seat = own voice alone at weight 1, the shared border =
//      both voices at weight 1, canonical order); massKitFor resolves
//      authored ▷ derived ▷ default with glyph-map-closed kinds; shadeAt is
//      0 on ocean, bounded on land, and alive somewhere (the relief is
//      wired),
//   L  THE ROAD DRESS (M2 wave 8 — the reads the road-face painter + the
//      wayside dress consume): the carried read speaks the road lane;
//      roadSegsForChunk is deterministic across builders/re-asks, lists ONLY
//      real linked pairs' chords (endpoint oracle), holds every pair's chord
//      at its own midpoint chunk, and COVERS the ribbon — every road:true
//      sample finds a listed segment within roadHalfPx of itself in its own
//      chunk's list (the painter's per-chunk geometry can never hole the
//      face); roadToneAt is deterministic, sane hex, pure at an isolated
//      cell's own seat (its theme.road verbatim), the exact 50/50 midHex at
//      a synthetic pair's equidistant chord middle, and the packed-grey
//      default where a theme names none; THE WAYSIDE SEATS through the pure
//      helper waysideSeatsForChunk are deterministic, never walkable through
//      the sampler, centered INSIDE the clearway shoulder band of a real
//      segment (independent oracle), body-clear of every ribbon, outside
//      every fold cell, beyond every mouth apron + shoulder, on land, drawn
//      from the closed WAYSIDE_GLYPHS pool — and ALIVE along a synthetic
//      long-link's between-stretch; the one-shoulder arithmetic holds
//      (waysideOff max + widest glyph ≤ shoulderPx, roadGap < waysideOff
//      min); and the road-dress reads install NOTHING (the seam stays
//      null — discrete play reads none of this),
//   M  THE ROUTED RIBBON (M2 wave 8b — her feel report: "the transitions
//      don't actually align"): a linked pair's captured way is a POLYLINE
//      through its true crossing, never a bare center-to-center chord —
//      ABUTTING resident-eligible pairs bend through their agreed border
//      point (borderAgreedPoint, the engine's own seat/carve derivation),
//      NON-ABUTTING eligible pairs route center → door seat → rim MOUTH →
//      partner mouth → partner seat → center (placeExit's edge formula
//      over the fitted cell + the seat's rim projection — exactly where
//      the mint carves its corridor and the border treatment opens its
//      gap), and pairs no pairing applies to keep the chord. Pins: the
//      stage is honest (fixtures eligible through the engine's own
//      predicate, the abutting stage NON-TRIVIAL, the oblique stage
//      truly oblique) · THE ALIGNMENT PIN (the sampler's own chunk
//      segments pass within RIG_M_EPS of P / both seats / both mouths,
//      each reading road:true) · THE DEAD CROSSING WALKS (the strip
//      corridor is walkable mouth-to-mouth through the sampler while the
//      OLD chord's strip crossing reads solid mass — the swap pinned both
//      ways) · chord country unchanged where no pairing applies ·
//      determinism ×3 over routed geometry · THE COVERING LAW over every
//      routed piece · the solid between + the mass-dress subset law
//      survive routing · the rig installs nothing.
// Run: npx tsx balance/probe_tissue.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, classById } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { resetActorIdCounter } from '../src/engine/actor';
import { World } from '../src/engine/world';
import { buildManifest } from '../src/packages/manifest';
import { makeAccount } from '../src/meta/account';
import { START_ZONE, type ZoneDef } from '../src/data/zones';
import { BIOMES, OCEAN_BIOME, biomeAt } from '../src/world/biomes';
import { continentAt, continentSeedFrom } from '../src/world/continents';
import { mapToPx, pxToMap } from '../src/world/coords';
import { elevationAt } from '../src/world/relief';
import { PARTITION_CFG, SEAMLESS_CFG, getTissueSampler, setTissueSampler, type CellRect } from '../src/world/seamless';
import { borderAgreedPoint, foldCells, type CellSeat } from '../src/world/cells';
import { PORTAL_EDGE_INSET } from '../src/engine/worldgen';
import { TISSUE_CFG, buildTissueSampler, massDressOf, massStampSeatsForChunk,
  waysideSeatsForChunk, type MassStampSeat, type TissueRoadSeg } from '../src/world/tissue';
import { MASSDRESS_CFG, MASS_KITS, MASS_KIT_DEFAULT, MASS_STAMP_GLYPHS,
  ROADDRESS_CFG, ROAD_TONE_DEFAULT, WAYSIDE_GLYPHS, massKitFor } from '../src/data/enclosure';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x7155e);

// ------------------------------------------------------------- one real world
resetActorIdCounter();
const account = makeAccount();
const manifest = buildManifest(account, 715513);
const world = new World(account, Object.freeze(manifest));
world.createPlayer(classById('warrior'));
world.loadZone(START_ZONE);
const seed = world.manifest.seed;

// The probe's own independent re-derivation of the linked-pair list (the same
// filter the sampler documents: surface↔surface, real destinations, deduped).
function linkedPairs(zm: Record<string, ZoneDef>): Array<[ZoneDef, ZoneDef]> {
  const out: Array<[ZoneDef, ZoneDef]> = [];
  const seen = new Set<string>();
  for (const z of Object.values(zm)) {
    if ((z.dimension ?? 'surface') !== 'surface') continue;
    for (const e of z.exits) {
      if (e.to === '?' || e.crossDim) continue;
      const dest = zm[e.to];
      if (!dest || (dest.dimension ?? 'surface') !== 'surface') continue;
      const key = z.id < e.to ? `${z.id}|${e.to}` : `${e.to}|${z.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push([z, dest]);
    }
  }
  return out;
}
const pairs = linkedPairs(world.zoneMap);
check('boot: the booted web holds at least one linked surface pair', pairs.length > 0,
  `${pairs.length} pairs over ${Object.keys(world.zoneMap).length} zones`);

/** Distance in px from a point to the nearest linked-pair segment (oracle). */
function nearestSegDist(px: number, py: number): number {
  let best = Infinity;
  for (const [a, b] of pairs) {
    const pa = mapToPx(a.map), pb = mapToPx(b.map);
    const dx = pb.x - pa.x, dy = pb.y - pa.y;
    const len2 = dx * dx + dy * dy;
    let t = len2 > 0 ? ((px - pa.x) * dx + (py - pa.y) * dy) / len2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    best = Math.min(best, Math.hypot(px - (pa.x + dx * t), py - (pa.y + dy * t)));
  }
  return best;
}

// --- The probe's OWN color arithmetic (the oracle side, independent of the
// sampler's implementation — same rounding rule, separate code). -------------
const hexRgb = (hex: string): [number, number, number] | null => {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const s = m[1];
  if (s.length === 3) return [parseInt(s[0] + s[0], 16), parseInt(s[1] + s[1], 16), parseInt(s[2] + s[2], 16)];
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};
const rgbHex = (r: number, g: number, b: number): string => {
  const c = (v: number): string => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
};
const midHex = (a: string, b: string): string => {
  const ra = hexRgb(a)!, rb = hexRgb(b)!;
  return rgbHex((ra[0] + rb[0]) / 2, (ra[1] + rb[1]) / 2, (ra[2] + rb[2]) / 2);
};
/** Rect distance oracle (the fold consumers' own metric, re-derived). */
const rectDistP = (x: number, y: number, c: { x0: number; y0: number; x1: number; y1: number }): number => {
  const dx = x < c.x0 ? c.x0 - x : x > c.x1 ? x - c.x1 : 0;
  const dy = y < c.y0 ? c.y0 - y : y > c.y1 ? y - c.y1 : 0;
  return Math.hypot(dx, dy);
};
/** The partition's surface roster (probe-side twin of the sampler's cell
 *  capture filter — and probe_cells' own). */
const cellRosterOf = (zm: Record<string, ZoneDef>): ZoneDef[] =>
  Object.values(zm).filter(z =>
    (z.dimension ?? 'surface') === 'surface' && z.caveDepth == null && !z.pocket && !z.floating);

// ---------------------------------------------------------------- E (part 1)
check('E: getTissueSampler() is null at boot — fresh module state', getTissueSampler() === null);

const s1 = buildTissueSampler(world);
const s2 = buildTissueSampler(world);
check('E: STILL null after builders run — buildTissueSampler is export-only', getTissueSampler() === null);

// -------------------------------------------------------------------------- A
let latMinX = 0, latMaxX = 0, latMinY = 0, latMaxY = 0;
{
  const [a, b] = pairs[0];
  const pa = mapToPx(a.map), pb = mapToPx(b.map);
  const pad = 256;
  latMinX = Math.min(pa.x, pb.x) - pad; latMaxX = Math.max(pa.x, pb.x) + pad;
  latMinY = Math.min(pa.y, pb.y) - pad; latMaxY = Math.max(pa.y, pb.y) + pad;
  const N = 40;
  const row = (fn: (x: number, y: number) => string): string => {
    let out = '';
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const x = latMinX + ((i + 0.5) / N) * (latMaxX - latMinX);
        const y = latMinY + ((j + 0.5) / N) * (latMaxY - latMinY);
        out += fn(x, y) + ';';
      }
    }
    return out;
  };
  const dump = (s: ReturnType<typeof buildTissueSampler>) => row((x, y) => {
    const t = s(x, y, seed);
    return `${x.toFixed(3)},${y.toFixed(3)}:${t.walkable ? 1 : 0}${t.road ? 1 : 0}${t.tone}`;
  });
  const d1 = dump(s1), d2 = dump(s2), d1again = dump(s1);
  check('A: two samplers off the same world answer byte-identically (40×40 lattice spanning a linked pair)',
    d1 === d2, `${a.id} ↔ ${b.id}, ${N * N} samples`);
  check('A: one sampler re-asked answers itself byte-identically — the cache is invisible', d1 === d1again);
  const kinds = new Set([...d1.matchAll(/:(\d\d)/g)].map(m => m[1]));
  check('A: the lattice is not degenerate (both road and off-road ground sampled)', kinds.size >= 2,
    `sample classes seen: ${[...kinds].join(' ')}`);
}

// -------------------------------------------------------------------------- B
{
  const contSeed = continentSeedFrom(seed);
  const ocean: Array<{ x: number; y: number }> = [];
  for (let x = -8000; x <= 8000 && ocean.length < 200; x += 251) {
    for (let y = -8000; y <= 8000 && ocean.length < 200; y += 251) {
      if (continentAt({ x, y }, contSeed).kind === 'ocean') ocean.push({ x, y });
    }
  }
  let tested = 0, wetWalkable = 0, wrongTone = 0, roadSkips = 0;
  for (const c of ocean) {
    const p = mapToPx(c);
    const t = s1(p.x, p.y, seed);
    if (t.road) { roadSkips++; continue; } // M0's honest TODO: roads may cross water
    tested++;
    if (t.walkable) wetWalkable++;
    if (t.tone !== BIOMES[OCEAN_BIOME].mapColor) wrongTone++;
  }
  check('B: open ocean found to test against (the continent oracle)', tested >= 50,
    `${tested} ocean points tested (${roadSkips} on road ribbons skipped)`);
  check('B: water is NEVER walkable — the sea grows no tissue', tested > 0 && wetWalkable === 0,
    `${wetWalkable}/${tested} wet-walkable`);
  check('B: THE SHORE EXCEPTION — the sea wears the sea\'s own tone, never a cell\'s', wrongTone === 0,
    `${wrongTone} mismatches vs BIOMES.${OCEAN_BIOME}.mapColor`);
}

// -------------------------------------------------------------------------- C
{
  let inRibbon = 0, roadOk = 0, walkOk = 0;
  for (const [a, b] of pairs.slice(0, Math.min(3, pairs.length))) {
    const pa = mapToPx(a.map), pb = mapToPx(b.map);
    const dx = pb.x - pa.x, dy = pb.y - pa.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) continue;
    const nx = -dy / len, ny = dx / len;
    for (let ti = 0; ti <= 20; ti++) {
      const t = ti / 20;
      for (const off of [-0.9, 0, 0.9]) {
        const o = off * SEAMLESS_CFG.roadHalfPx;
        const x = pa.x + dx * t + nx * o, y = pa.y + dy * t + ny * o;
        const s = s1(x, y, seed);
        inRibbon++;
        if (s.road) roadOk++;
        if (s.walkable) walkOk++;
      }
    }
  }
  check('C: every sample within the ribbon of a linked pair reads road:true', inRibbon > 0 && roadOk === inRibbon,
    `${roadOk}/${inRibbon}`);
  check('C: every ribbon sample reads walkable:true — roads are always walkable', inRibbon > 0 && walkOk === inRibbon,
    `${walkOk}/${inRibbon}`);

  // The control: ground far off EVERY ribbon never reads road (walk outward
  // from a pair's midpoint until the oracle says we are clear of all ways).
  const [a, b] = pairs[0];
  const pa = mapToPx(a.map), pb = mapToPx(b.map);
  let control: { x: number; y: number } | null = null;
  for (let r = SEAMLESS_CFG.roadHalfPx * 4; r < SEAMLESS_CFG.roadHalfPx * 200 && !control; r *= 1.5) {
    for (let k = 0; k < 8 && !control; k++) {
      const ang = (k / 8) * Math.PI * 2;
      const x = (pa.x + pb.x) / 2 + Math.cos(ang) * r, y = (pa.y + pb.y) / 2 + Math.sin(ang) * r;
      if (nearestSegDist(x, y) > SEAMLESS_CFG.roadHalfPx * 3) control = { x, y };
    }
  }
  check('C: ground far off every ribbon reads road:false', !!control && !s1(control.x, control.y, seed).road,
    control ? `control at (${control.x.toFixed(0)}, ${control.y.toFixed(0)})` : 'no clear ground found');
}

// -------------------------------------------------------------------------- D
{
  // THE OWN-TONE LAW at the seats of the REAL captured web: the fold
  // re-derived probe-side gives the isolation oracle (seat beyond the blend
  // band of every OTHER cell ⇒ the blend has exactly one voice there).
  const roster = cellRosterOf(world.zoneMap);
  const seats: CellSeat[] = roster.map(z => ({ id: z.id, ...mapToPx(z.map) }));
  const foldD = foldCells(seats);
  let tested = 0, wrong = 0, notHex = 0;
  const details: string[] = [];
  for (const z of roster) {
    if (biomeAt(z.map, seed) === OCEAN_BIOME) continue; // shore-exception seats speak the sea's tone
    const sp = mapToPx(z.map);
    let isolated = true;
    for (const [oid, oc] of foldD) {
      if (oid === z.id) continue;
      if (rectDistP(sp.x, sp.y, oc) <= PARTITION_CFG.blendBandPx + 1) { isolated = false; break; }
    }
    if (!isolated) continue;
    tested++;
    const expected = (z.biome && BIOMES[z.biome]?.mapColor)
      || BIOMES[biomeAt(z.map, seed)]?.mapColor || TISSUE_CFG.fallbackTone;
    const t = s1(sp.x, sp.y, seed);
    if (!/^#[0-9a-f]{3,8}$/i.test(t.tone)) notHex++;
    if (t.tone !== expected) { wrong++; details.push(`${z.id}: ${t.tone} ≠ ${expected}`); }
  }
  check('D: isolated real seats stand to test against (the fold oracle)', tested >= 2, `${tested} seats`);
  check('D: every isolated seat wears its OWN zone tone — the no-man\'s tone is dead inside a cell',
    tested > 0 && wrong === 0, wrong ? details.slice(0, 3).join('; ') : `${tested}/${tested} exact`);
  check('D: every tone sampled is a sane hex', notHex === 0, `${notHex} malformed`);
}

// -------------------------------------------------------------------------- F
{
  // Seat a fake linked pair on empty ground (walk outward until the oracle
  // says no real ribbon is anywhere near the fake road's midpoint).
  let ux = 4000;
  while (nearestSegDist(mapToPx({ x: ux + 43, y: 4000 }).x, mapToPx({ x: ux + 43, y: 4000 }).y)
      < SEAMLESS_CFG.roadHalfPx * 10) ux += 4000;
  const seatA = { x: ux, y: 4000 }, seatB = { x: ux + 86, y: 4000 };
  const mid = mapToPx({ x: ux + 43, y: 4000 });
  check('F: the fake road\'s ground reads road:false before the graph grows', !s1(mid.x, mid.y, seed).road);

  const [tplA, tplB] = pairs[0];
  world.zoneMap['tissue_fake_a'] = {
    ...tplA, id: 'tissue_fake_a', map: seatA,
    exits: [{ to: 'tissue_fake_b', side: 'e' }],
  };
  world.zoneMap['tissue_fake_b'] = {
    ...tplB, id: 'tissue_fake_b', map: seatB,
    exits: [{ to: 'tissue_fake_a', side: 'w' }],
  };
  const before = s1(mid.x, mid.y, seed);
  check('F: THE CAPTURE LAW — the old sampler stays blind to ground linked after its build', !before.road);
  const s3 = buildTissueSampler(world);
  const after = s3(mid.x, mid.y, seed);
  check('F: a fresh sampler poured off the grown graph draws the new road', after.road);
  check('F: and the new road is walkable ground', after.walkable);
  delete world.zoneMap['tissue_fake_a'];
  delete world.zoneMap['tissue_fake_b'];
}

// -------------------------------------------------------------------------- G
{
  const contSeed = continentSeedFrom(seed);
  const h = TISSUE_CFG.slopeStepUnits;
  let cliff: { x: number; y: number } | null = null;
  for (let x = -8000; x <= 8000 && !cliff; x += 173) {
    for (let y = -8000; y <= 8000 && !cliff; y += 173) {
      if (continentAt({ x, y }, contSeed).kind === 'ocean') continue;
      const gx = elevationAt({ x: x + h, y }, seed) - elevationAt({ x: x - h, y }, seed);
      const gy = elevationAt({ x, y: y + h }, seed) - elevationAt({ x, y: y - h }, seed);
      if (Math.hypot(gx, gy) / (2 * h) <= TISSUE_CFG.slopeMax) continue;
      const p = mapToPx({ x, y });
      if (nearestSegDist(p.x, p.y) <= SEAMLESS_CFG.roadHalfPx * 3) continue; // roads waive the cliff — test bare ground
      cliff = { x, y };
    }
  }
  check('G: oracle-steep land stands within the scan window (the cliff class is ~0.5% of land)', !!cliff,
    cliff ? `cliff at (${cliff.x}, ${cliff.y})` : 'none found — widen the scan');
  if (cliff) {
    const p = mapToPx(cliff);
    const t = s1(p.x, p.y, seed);
    check('G: THE CLIFF LAW — steep relief refuses tissue off-road', !t.road && !t.walkable,
      `walkable=${t.walkable} road=${t.road}`);
  }
}

// --- The blend fixtures' shared machinery ------------------------------------
// Max-contrast biome pair, picked deterministically from the registry: the
// gradient pins want channel deltas far above rounding grain.
const biomeIds = Object.keys(BIOMES).filter(id => id !== OCEAN_BIOME && hexRgb(BIOMES[id].mapColor) !== null);
let toneA = '', toneB = '', biomeA = '', biomeB = '', bestDelta = -1;
for (let i = 0; i < biomeIds.length; i++) {
  for (let j = i + 1; j < biomeIds.length; j++) {
    const ra = hexRgb(BIOMES[biomeIds[i]].mapColor)!, rb = hexRgb(BIOMES[biomeIds[j]].mapColor)!;
    const d = Math.abs(ra[0] - rb[0]) + Math.abs(ra[1] - rb[1]) + Math.abs(ra[2] - rb[2]);
    if (d > bestDelta) {
      bestDelta = d;
      biomeA = biomeIds[i]; biomeB = biomeIds[j];
      toneA = BIOMES[biomeIds[i]].mapColor; toneB = BIOMES[biomeIds[j]].mapColor;
    }
  }
}

/** Find a base seat (map units) whose candidate sample points are ALL land
 *  (the shore exception must not bite the blend fixtures) — scan a far
 *  window, deterministic. `probe` maps a base to the px points that must
 *  be dry. */
function findLandBase(probePts: (bx: number, by: number) => Array<{ x: number; y: number }>): { bx: number; by: number } | null {
  for (let bx = 2500; bx <= 6500; bx += 67) {
    for (let by = -2010; by <= 2010; by += 67) {
      const pts = probePts(bx, by);
      let dry = true;
      for (const p of pts) {
        if (biomeAt(pxToMap(p), seed) === OCEAN_BIOME) { dry = false; break; }
      }
      if (dry) return { bx, by };
    }
  }
  return null;
}

/** Per-channel monotonicity along an ordered tone walk, directed A→B. */
function monotoneAB(tones: string[], a: string, b: string): boolean {
  const ra = hexRgb(a)!, rb = hexRgb(b)!;
  for (let ch = 0; ch < 3; ch++) {
    const dir = Math.sign(rb[ch] - ra[ch]);
    for (let k = 1; k < tones.length; k++) {
      const prev = hexRgb(tones[k - 1])![ch], cur = hexRgb(tones[k])![ch];
      if (dir >= 0 ? cur < prev : cur > prev) return false;
    }
  }
  return true;
}

// -------------------------------------------------------------------------- H
{
  const band = PARTITION_CFG.blendBandPx;
  const fracs = [-1.25, -1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1, 1.25];
  // Two seats 86 units apart share a midpoint-cut border; the walk crosses
  // it perpendicular at the seats' own latitude.
  const walkPts = (bx: number, by: number): Array<{ x: number; y: number }> => {
    const pa = mapToPx({ x: bx, y: by }), pb = mapToPx({ x: bx + 86, y: by });
    const borderX = (pa.x + pb.x) / 2;
    return fracs.map(f => ({ x: borderX + f * band, y: pa.y }));
  };
  const base = findLandBase(walkPts);
  check('H: a dry fixture window stands within the far scan', base !== null,
    base ? `base (${base.bx}, ${base.by}) units` : 'none found — widen the scan');
  if (base) {
    const { bx, by } = base;
    const preBlind = s1(walkPts(bx, by)[5].x, walkPts(bx, by)[5].y, seed).tone;
    const [tplA, tplB] = pairs[0];
    world.zoneMap['tissue_blend_a'] = {
      ...tplA, id: 'tissue_blend_a', map: { x: bx, y: by }, exits: [], biome: biomeA,
    };
    world.zoneMap['tissue_blend_b'] = {
      ...tplB, id: 'tissue_blend_b', map: { x: bx + 86, y: by }, exits: [], biome: biomeB,
    };
    const s4 = buildTissueSampler(world);
    const pts = walkPts(bx, by);
    const tones = pts.map(p => s4(p.x, p.y, seed).tone);
    check(`H: beyond −band the tone is pure '${biomeA}' (the own-tone outskirts)`,
      tones[0] === toneA && tones[1] === toneA, `${tones[0]}/${tones[1]} vs ${toneA}`);
    check(`H: beyond +band the tone is pure '${biomeB}'`,
      tones[9] === toneB && tones[10] === toneB, `${tones[9]}/${tones[10]} vs ${toneB}`);
    check('H: the border itself is the exact 50/50 mix (independent arithmetic)',
      tones[5] === midHex(toneA, toneB), `${tones[5]} vs ${midHex(toneA, toneB)}`);
    check('H: the walk moves monotonically per channel from tone to tone',
      monotoneAB(tones, toneA, toneB), tones.join(' '));
    const inBand = [tones[3], tones[4], tones[6], tones[7]];
    check('H: in-band samples are true gradients — neither pure tone',
      inBand.every(t => t !== toneA && t !== toneB), inBand.join(' '));
    const s5 = buildTissueSampler(world);
    check('H: the blend is deterministic — a fresh sampler answers the walk byte-identically',
      pts.every((p, i) => s5(p.x, p.y, seed).tone === tones[i]));
    check('H: THE CAPTURE LAW reaches the cells — the pre-fixture sampler is blind to the pair',
      preBlind !== tones[5], `blind ${preBlind} vs blended ${tones[5]}`);
    delete world.zoneMap['tissue_blend_a'];
    delete world.zoneMap['tissue_blend_b'];
  }
}

// -------------------------------------------------------------------------- I
{
  const band = PARTITION_CFG.blendBandPx;
  // Three seats whose axis cuts open a true wedge strip between A (x≤45u)
  // and B (x≥49.5u) below C's floor (y≥40u): the fold's own geometry,
  // re-derived probe-side as the oracle.
  const seatsOf = (bx: number, by: number) => [
    { id: 'tissue_wedge_a', x: bx, y: by },
    { id: 'tissue_wedge_b', x: bx + 90, y: by + 5 },
    { id: 'tissue_wedge_c', x: bx + 9, y: by + 80 },
  ];
  const walkOf = (bx: number, by: number): Array<{ x: number; y: number }> => {
    const pa = mapToPx({ x: bx, y: by });
    const u = mapToPx({ x: bx + 1, y: by }).x - pa.x; // px per unit, derived not assumed
    const xA = pa.x + 45 * u, xB = pa.x + 49.5 * u;   // the two wedge rims
    const out: Array<{ x: number; y: number }> = [];
    const from = xB - band - 60, to = xA + band + 60;
    for (let k = 0; k <= 12; k++) out.push({ x: from + (k / 12) * (to - from), y: pa.y });
    out.push({ x: (xA + xB) / 2, y: pa.y }); // the equidistant spine, exact
    return out;
  };
  const base = findLandBase(walkOf);
  check('I: a dry wedge window stands within the far scan', base !== null,
    base ? `base (${base.bx}, ${base.by}) units` : 'none found — widen the scan');
  if (base) {
    const { bx, by } = base;
    const [tplA, tplB] = pairs[0];
    const thirdBiome = biomeIds.find(id => id !== biomeA && id !== biomeB) ?? biomeA;
    const defs: Array<[string, { x: number; y: number }, string]> = [
      ['tissue_wedge_a', { x: bx, y: by }, biomeA],
      ['tissue_wedge_b', { x: bx + 90, y: by + 5 }, biomeB],
      ['tissue_wedge_c', { x: bx + 9, y: by + 80 }, thirdBiome],
    ];
    for (const [id, map, biome] of defs) {
      world.zoneMap[id] = { ...(id.endsWith('_b') ? tplB : tplA), id, map, exits: [], biome };
    }
    // The oracle: fold the three seats alone (the real web is beyond every
    // cut's reach out here) and prove the spine point sits in NO cell.
    const seats: CellSeat[] = seatsOf(bx, by).map(s => ({ id: s.id, ...mapToPx({ x: s.x, y: s.y }) }));
    const foldW = foldCells(seats);
    const walk = walkOf(bx, by);
    const spine = walk[walk.length - 1];
    const inNoCell = [...foldW.values()].every(c =>
      !(spine.x >= c.x0 && spine.x <= c.x1 && spine.y >= c.y0 && spine.y <= c.y1));
    check('I: the spine point is claimed by NO cell — a true wedge (the fold oracle)', inNoCell,
      `spine (${spine.x.toFixed(0)}, ${spine.y.toFixed(0)})`);
    const s6 = buildTissueSampler(world);
    const spineTone = s6(spine.x, spine.y, seed).tone;
    check('I: the wedge spine blends the nearest TWO cells 50/50 — the far third is weightless',
      spineTone === midHex(toneA, toneB), `${spineTone} vs ${midHex(toneA, toneB)}`);
    const tones = walk.slice(0, 13).map(p => s6(p.x, p.y, seed).tone);
    check('I: the walk across the wedge is monotone between the flanking pair',
      monotoneAB(tones, toneA, toneB), tones.join(' '));
    check('I: the wedge\'s far flanks read the pure own tones',
      tones[0] === toneA && tones[12] === toneB, `${tones[0]} / ${tones[12]}`);
    for (const [id] of defs) delete world.zoneMap[id];
  }
}

// -------------------------------------------------------------------------- J
{
  // THE SOLID BETWEEN's law re-implemented verbatim as oracle: road by the
  // segment ribbon (same squared compare, all segments — the bins are a
  // conservative superset, so verdicts match exactly), ocean by the same
  // biomeAt read, slope by the same centered elevationAt formula; then the
  // amended corridor clause — inside ANY fold cell open, outside every cell
  // only a mouth apron admits (linked resident-eligible pairs' agreed
  // border points, the engine's own public eligibility predicate as the
  // gate the sampler documents).
  const segsJ = pairs.map(([a, b]) => {
    const pa = mapToPx(a.map), pb = mapToPx(b.map);
    return { ax: pa.x, ay: pa.y, bx: pb.x, by: pb.y };
  });
  const ribbonSq = SEAMLESS_CFG.roadHalfPx * SEAMLESS_CFG.roadHalfPx;
  const segDistSqJ = (px: number, py: number, s: { ax: number; ay: number; bx: number; by: number }): number => {
    const dx = s.bx - s.ax, dy = s.by - s.ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 > 0 ? ((px - s.ax) * dx + (py - s.ay) * dy) / len2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = s.ax + dx * t, qy = s.ay + dy * t;
    return (px - qx) * (px - qx) + (py - qy) * (py - qy);
  };
  const rosterJ = cellRosterOf(world.zoneMap);
  const seatsJ: CellSeat[] = rosterJ.map(z => ({ id: z.id, ...mapToPx(z.map) }));
  const foldJ = foldCells(seatsJ);
  const cellsJ = [...foldJ.values()];
  const insideAnyCellJ = (x: number, y: number): boolean =>
    cellsJ.some(c => x >= c.x0 && x <= c.x1 && y >= c.y0 && y <= c.y1);
  const apronsJ: Array<{ x: number; y: number }> = [];
  for (const [a, b] of pairs) {
    if (!world.seamlessResidentEligible(a) || !world.seamlessResidentEligible(b)) continue;
    const ca = foldJ.get(a.id), cb = foldJ.get(b.id);
    if (!ca || !cb) continue;
    const p = borderAgreedPoint(ca, cb);
    if (p) apronsJ.push({ x: p.x, y: p.y });
  }
  const apronSqJ = PARTITION_CFG.mouthApronPx * PARTITION_CFG.mouthApronPx;
  const lawWalkable = (x: number, y: number, road: boolean): boolean => {
    if (road) return true;
    const c = pxToMap({ x, y });
    if (biomeAt(c, seed) === OCEAN_BIOME) return false;
    const h = TISSUE_CFG.slopeStepUnits;
    const gx = elevationAt({ x: c.x + h, y: c.y }, seed) - elevationAt({ x: c.x - h, y: c.y }, seed);
    const gy = elevationAt({ x: c.x, y: c.y + h }, seed) - elevationAt({ x: c.x, y: c.y - h }, seed);
    if (Math.hypot(gx, gy) / (2 * h) > TISSUE_CFG.slopeMax) return false;
    if (insideAnyCellJ(x, y)) return true;
    return apronsJ.some(a => (x - a.x) * (x - a.x) + (y - a.y) * (y - a.y) <= apronSqJ);
  };
  const N = 40;
  let mismatched = 0;
  let firstBad = '';
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const x = latMinX + ((i + 0.5) / N) * (latMaxX - latMinX);
      const y = latMinY + ((j + 0.5) / N) * (latMaxY - latMinY);
      const road = segsJ.some(s => segDistSqJ(x, y, s) <= ribbonSq);
      const walkable = lawWalkable(x, y, road);
      const t = s1(x, y, seed);
      if (t.road !== road || t.walkable !== walkable) {
        mismatched++;
        if (!firstBad) firstBad = `(${x.toFixed(0)}, ${y.toFixed(0)}): got ${t.walkable}/${t.road}, law says ${walkable}/${road}`;
      }
    }
  }
  check('J: walkable + road equal the amended law on every lattice sample (blend still touches TONE only)',
    mismatched === 0, mismatched ? `${mismatched} mismatches; first ${firstBad}` : `${N * N} samples byte-equal`);

  // --- J2: THE REFUSAL FIRES — real remainder ground outside every cell,
  // off every ribbon, on dry flat land, reads UNWALKABLE (the solid
  // between is live wiring); a real linked pair's ribbon still crosses
  // whatever gap it spans (corridors walk border-to-border). -----------------
  {
    let refused = 0, wrongOpen = 0, found = 0;
    // Scan outward from the web's first pair midpoint in golden-angle rays
    // until we bank enough oracle-qualified outside-cell samples.
    const [a0, b0] = pairs[0];
    const pa0 = mapToPx(a0.map), pb0 = mapToPx(b0.map);
    const cx = (pa0.x + pb0.x) / 2, cy = (pa0.y + pb0.y) / 2;
    for (let k = 0; k < 4000 && found < 60; k++) {
      const ang = k * 2.399963229728653;
      const r = 200 + (k / 4000) * 12000;
      const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r;
      if (insideAnyCellJ(x, y)) continue;
      if (segsJ.some(s => segDistSqJ(x, y, s) <= ribbonSq * 4)) continue; // clear of ribbons (margin)
      if (apronsJ.some(ap => (x - ap.x) * (x - ap.x) + (y - ap.y) * (y - ap.y) <= apronSqJ * 2)) continue;
      const c = pxToMap({ x, y });
      if (biomeAt(c, seed) === OCEAN_BIOME) continue;
      const h = TISSUE_CFG.slopeStepUnits;
      const gx = elevationAt({ x: c.x + h, y: c.y }, seed) - elevationAt({ x: c.x - h, y: c.y }, seed);
      const gy = elevationAt({ x: c.x, y: c.y + h }, seed) - elevationAt({ x: c.x, y: c.y - h }, seed);
      if (Math.hypot(gx, gy) / (2 * h) > TISSUE_CFG.slopeMax) continue;
      found++;
      const t = s1(x, y, seed);
      if (!t.walkable) refused++; else wrongOpen++;
    }
    check('J2: dry flat outside-cell ground stands to test against (the remainder country exists)',
      found >= 20, `${found} samples banked`);
    check('J2: THE SOLID BETWEEN fires — every such sample refuses tissue', found > 0 && wrongOpen === 0,
      `${refused}/${found} refused`);

    // A linked pair whose cells DON'T abut spans a true gap — its ribbon
    // must still walk (the corridor between the zones).
    let gapPair: { midX: number; midY: number } | null = null;
    for (const [a, b] of pairs) {
      const ca = foldJ.get(a.id), cb = foldJ.get(b.id);
      if (!ca || !cb || borderAgreedPoint(ca, cb)) continue;
      const pa = mapToPx(a.map), pb = mapToPx(b.map);
      // march the chord; take the first sample outside BOTH cells
      for (let t = 0.1; t <= 0.9; t += 0.02) {
        const x = pa.x + (pb.x - pa.x) * t, y = pa.y + (pb.y - pa.y) * t;
        if (!insideAnyCellJ(x, y)) { gapPair = { midX: x, midY: y }; break; }
      }
      if (gapPair) break;
    }
    check('J2: a real ribbon crosses its gap walkable (corridors walk border-to-border)',
      !gapPair || s1(gapPair.midX, gapPair.midY, seed).walkable,
      gapPair ? `gap sample (${gapPair.midX.toFixed(0)}, ${gapPair.midY.toFixed(0)})` : 'no non-abutting linked pair on this web (vacuous — the abutting crossings need no tissue)');
  }
}

// -------------------------------------------------------------------------- K
{
  // K0 — THE CARRY: the dress read travels ON the sampler function
  // (world/seamless.ts's TissueSample contract is byte-untouched; a bare or
  // null sampler dresses nothing and no consumer throws).
  const d1 = massDressOf(s1), d2 = massDressOf(s2);
  check('K: a built sampler carries the mass-dress read', d1 !== null && d2 !== null);
  check('K: massDressOf(null) stands down null — the null-seam law', massDressOf(null) === null);
  if (d1 && d2) {
    // K1 — determinism: all four reads byte-identical across independent
    // builders and across re-asks (the A law's own idiom at dress grain).
    const N = 24;
    const dumpDress = (d: NonNullable<ReturnType<typeof massDressOf>>): string => {
      let out = '';
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          const x = latMinX + ((i + 0.5) / N) * (latMaxX - latMinX);
          const y = latMinY + ((j + 0.5) / N) * (latMaxY - latMinY);
          const fl = d.flanksAt(x, y, seed).map(f => `${f.zoneId}:${f.tileset ?? ''}:${f.weight.toFixed(6)}`).join('|');
          out += `${d.massAt(x, y, seed) ? 1 : 0}${d.landAt(x, y, seed) ? 1 : 0}${d.shadeAt(x, y, seed).toFixed(6)};${fl};;`;
        }
      }
      return out;
    };
    const kd1 = dumpDress(d1);
    check('K: two builders\' dress reads answer byte-identically over the lattice', kd1 === dumpDress(d2));
    check('K: one dress read re-asked answers itself byte-identically', kd1 === dumpDress(d1));

    // K2 — THE SUBSET LAW: dressable mass is NEVER walkable through the
    // sampler (lattice + the J2 golden-angle scatter as the sample bank).
    const [a0k, b0k] = pairs[0];
    const pa0k = mapToPx(a0k.map), pb0k = mapToPx(b0k.map);
    const mxK = (pa0k.x + pb0k.x) / 2, myK = (pa0k.y + pb0k.y) / 2;
    const scanPts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < 40; i++) {
      for (let j = 0; j < 40; j++) {
        scanPts.push({
          x: latMinX + ((i + 0.5) / 40) * (latMaxX - latMinX),
          y: latMinY + ((j + 0.5) / 40) * (latMaxY - latMinY),
        });
      }
    }
    for (let k = 0; k < 4000; k++) {
      const ang = k * 2.399963229728653;
      const r = 200 + (k / 4000) * 12000;
      scanPts.push({ x: mxK + Math.cos(ang) * r, y: myK + Math.sin(ang) * r });
    }
    let massSeen = 0, massWalkable = 0;
    let massAnchor: { x: number; y: number } | null = null;
    for (const p of scanPts) {
      if (!d1.massAt(p.x, p.y, seed)) continue;
      massSeen++;
      if (!massAnchor) massAnchor = p;
      if (s1(p.x, p.y, seed).walkable) massWalkable++;
    }
    check('K: dressable mass stands to test against (the between exists)', massSeen >= 20, `${massSeen} mass points banked`);
    check('K: THE CLEARWAY LAW roots — mass is never walkable through the sampler',
      massSeen > 0 && massWalkable === 0, `${massWalkable}/${massSeen}`);

    // K3 — THE STAMP SEATS through the painter's own pure helper: window
    // chunks + the mass anchor's 3×3; deterministic across builders and
    // re-asks; every seat unwalkable, shoulder-clear of every ribbon
    // (independent segment oracle), outside every fold cell (re-derived
    // oracle), on land, with a glyph-closed kind and a sane radius.
    const C = SEAMLESS_CFG.chunkPx;
    const chunkList: Array<{ cx: number; cy: number }> = [];
    for (let cyK = Math.floor(latMinY / C); cyK <= Math.floor(latMaxY / C); cyK++) {
      for (let cxK = Math.floor(latMinX / C); cxK <= Math.floor(latMaxX / C); cxK++) {
        chunkList.push({ cx: cxK, cy: cyK });
      }
    }
    if (massAnchor) {
      const acx = Math.floor(massAnchor.x / C), acy = Math.floor(massAnchor.y / C);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) chunkList.push({ cx: acx + dx, cy: acy + dy });
      }
    }
    const allSeats: MassStampSeat[] = [];
    let j1 = '', j2 = '', j3 = '';
    for (const ck of chunkList) {
      const l1 = massStampSeatsForChunk(d1, seed, ck.cx, ck.cy);
      j1 += JSON.stringify(l1);
      j2 += JSON.stringify(massStampSeatsForChunk(d2, seed, ck.cx, ck.cy));
      j3 += JSON.stringify(massStampSeatsForChunk(d1, seed, ck.cx, ck.cy));
      allSeats.push(...l1);
    }
    check('K: seats are deterministic across independent builders', j1 === j2);
    check('K: seats are deterministic across re-asks', j1 === j3);
    check('K: seats stand over known mass (the scatter is alive)', allSeats.length >= 1,
      `${allSeats.length} seats over ${chunkList.length} chunks`);
    const foldK = foldCells(cellRosterOf(world.zoneMap).map(z => ({ id: z.id, ...mapToPx(z.map) })));
    const cellsK = [...foldK.values()];
    const glyphKinds = new Set(Object.values(MASS_STAMP_GLYPHS).map(g => g.kind));
    for (const kit of Object.values(MASS_KITS)) for (const row of kit) glyphKinds.add(row.kind);
    for (const row of MASS_KIT_DEFAULT) glyphKinds.add(row.kind);
    let badWalk = 0, badShoulder = 0, badCell = 0, badLand = 0, badKind = 0;
    for (const st of allSeats) {
      if (s1(st.x, st.y, seed).walkable) badWalk++;
      if (nearestSegDist(st.x, st.y) <= SEAMLESS_CFG.roadHalfPx + MASSDRESS_CFG.shoulderPx) badShoulder++;
      if (cellsK.some(cc => st.x >= cc.x0 && st.x <= cc.x1 && st.y >= cc.y0 && st.y <= cc.y1)) badCell++;
      if (biomeAt(pxToMap({ x: st.x, y: st.y }), seed) === OCEAN_BIOME) badLand++;
      if (!glyphKinds.has(st.kind) || !(st.r > 0)) badKind++;
    }
    check('K: no seat is walkable through the sampler — the clearway law at seat grain', badWalk === 0, `${badWalk}/${allSeats.length}`);
    check('K: every seat clears every ribbon by the shoulder (independent oracle)', badShoulder === 0, `${badShoulder} inside roadHalfPx+shoulderPx`);
    check('K: every seat stands outside every fold cell (re-derived oracle)', badCell === 0, `${badCell} inside a cell`);
    check('K: every seat stands on land', badLand === 0, `${badLand} wet`);
    check('K: every seat wears a glyph-closed kind and a sane radius', badKind === 0, `${badKind} bad`);

    // K4 — THE FLANK VOICES on a synthetic isolated pair with authored-kit
    // tilesets: the one weight law's own weights, with mint provenance.
    {
      const bxK = 5200, byK = 1500; // far from the real web — geometry only, no dryness needed
      const [tplA, tplB] = pairs[0];
      world.zoneMap['tissue_mass_a'] = { ...tplA, id: 'tissue_mass_a', map: { x: bxK, y: byK }, exits: [], tileset: 'mire' };
      world.zoneMap['tissue_mass_b'] = { ...tplB, id: 'tissue_mass_b', map: { x: bxK + 86, y: byK }, exits: [], tileset: 'downs' };
      const s7 = buildTissueSampler(world);
      const d7 = massDressOf(s7);
      const paK = mapToPx({ x: bxK, y: byK }), pbK = mapToPx({ x: bxK + 86, y: byK });
      const atSeat = d7 ? d7.flanksAt(paK.x, paK.y, seed) : [];
      check('K: an isolated cell\'s own seat hears ONE voice at weight 1',
        atSeat.length === 1 && atSeat[0].zoneId === 'tissue_mass_a' && Math.abs(atSeat[0].weight - 1) < 1e-9,
        JSON.stringify(atSeat));
      check('K: and the voice carries the mint\'s tileset (the kit key)', atSeat[0]?.tileset === 'mire');
      const border = d7 ? d7.flanksAt((paK.x + pbK.x) / 2, paK.y, seed) : [];
      check('K: the shared border hears BOTH voices at weight 1, canonical order',
        border.length === 2 && border[0].zoneId === 'tissue_mass_a' && border[1].zoneId === 'tissue_mass_b'
        && Math.abs(border[0].weight - 1) < 1e-9 && Math.abs(border[1].weight - 1) < 1e-9,
        JSON.stringify(border));
      delete world.zoneMap['tissue_mass_a'];
      delete world.zoneMap['tissue_mass_b'];
    }

    // K5 — THE KIT LADDER: authored ▷ derived-from-own-stamps ▷ default,
    // memo-stable, every row glyph-closed.
    check('K: massKitFor honors AUTHORED rows first',
      massKitFor('mire') === MASS_KITS.mire && massKitFor('downs') === MASS_KITS.downs);
    const jungleKit = massKitFor('jungle');
    check('K: a kit-less tileset DERIVES its kit from its own stamps (jungle wears its thicket)',
      jungleKit.length > 0 && jungleKit !== MASS_KIT_DEFAULT
      && jungleKit.every(r2 => glyphKinds.has(r2.kind) && r2.weight > 0 && r2.radius[0] > 0 && r2.radius[1] >= r2.radius[0]),
      JSON.stringify(jungleKit));
    check('K: no tileset draws THE DEFAULT kit', massKitFor(undefined) === MASS_KIT_DEFAULT);
    check('K: the kit memo is invisible — the same table forever', massKitFor('jungle') === jungleKit);

    // K6 — THE SHADE: 0 on the sea, bounded on land, alive somewhere (the
    // relief lane is wired, not dead).
    {
      const contSeed = continentSeedFrom(seed);
      let oceanPt: { x: number; y: number } | null = null;
      const landPx: Array<{ x: number; y: number }> = [];
      for (let x = -8000; x <= 8000 && landPx.length < 200; x += 173) {
        for (let y = -8000; y <= 8000 && landPx.length < 200; y += 173) {
          if (continentAt({ x, y }, contSeed).kind === 'ocean') {
            if (!oceanPt) oceanPt = mapToPx({ x, y });
          } else {
            landPx.push(mapToPx({ x, y }));
          }
        }
      }
      check('K: the sea wears no relief — shadeAt is 0 on ocean',
        oceanPt !== null && d1.shadeAt(oceanPt.x, oceanPt.y, seed) === 0);
      let outOfBounds = 0, alive = 0;
      for (const p of landPx) {
        const sh = d1.shadeAt(p.x, p.y, seed);
        if (sh < -1 || sh > 1 || Number.isNaN(sh)) outOfBounds++;
        if (Math.abs(sh) > 0.01) alive++;
      }
      check('K: land shade is bounded in [-1, 1]', landPx.length >= 100 && outOfBounds === 0,
        `${outOfBounds}/${landPx.length} out of bounds`);
      check('K: the relief is alive — shade moves somewhere on land', alive > 0,
        `${alive}/${landPx.length} with |shade| > 0.01`);
    }

    check('K: the dress reads installed NOTHING — the seam stays null', getTissueSampler() === null);
  }
}

// -------------------------------------------------------------------------- L
{
  // THE ROAD DRESS (M2 wave 8) — the reads the road-face painter and the
  // wayside dress consume, plus the wayside seat law through the exported
  // pure helper. Oracles are all probe-side re-derivations (segments from
  // the pair list, cells from the fold, aprons from borderAgreedPoint).
  const d1 = massDressOf(s1), d2 = massDressOf(s2);
  const speaks = (d: ReturnType<typeof massDressOf>): boolean =>
    !!d && typeof d.roadSegsForChunk === 'function' && typeof d.roadToneAt === 'function'
    && typeof d.massSansRoadAt === 'function' && typeof d.shoulderSeatAt === 'function';
  check('L: the carried read speaks the road lane (segments/tone/under-color/seat test)',
    speaks(d1) && speaks(d2));
  const segDistSqL = (px: number, py: number, s: TissueRoadSeg): number => {
    const dx = s.bx - s.ax, dy = s.by - s.ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 > 0 ? ((px - s.ax) * dx + (py - s.ay) * dy) / len2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return (px - (s.ax + dx * t)) ** 2 + (py - (s.ay + dy * t)) ** 2;
  };
  if (d1 && d2 && speaks(d1) && speaks(d2)) {
    const C = SEAMLESS_CFG.chunkPx;
    const pad = SEAMLESS_CFG.roadHalfPx;

    // L1 — SEGMENT TRUTH: the chunk lists the painter strokes are the
    // capture's own bins — deterministic, real-pairs-only, complete at each
    // pair's midpoint chunk, and COVERING (no ribbon pixel can miss its
    // chunk's list — the face can never hole).
    const chunkWin: Array<{ cx: number; cy: number }> = [];
    for (let cyL = Math.floor(latMinY / C); cyL <= Math.floor(latMaxY / C); cyL++) {
      for (let cxL = Math.floor(latMinX / C); cxL <= Math.floor(latMaxX / C); cxL++) {
        chunkWin.push({ cx: cxL, cy: cyL });
      }
    }
    for (const [a, b] of pairs) {
      const pa = mapToPx(a.map), pb = mapToPx(b.map);
      chunkWin.push({ cx: Math.floor((pa.x + pb.x) / 2 / C), cy: Math.floor((pa.y + pb.y) / 2 / C) });
    }
    const segDump = (d: NonNullable<typeof d1>): string =>
      chunkWin.map(k => JSON.stringify(d.roadSegsForChunk(k.cx, k.cy))).join(';');
    const sd1 = segDump(d1);
    check('L: chunk segment lists are deterministic across independent builders', sd1 === segDump(d2));
    check('L: and across re-asks', sd1 === segDump(d1));
    const q = (v: number): string => v.toFixed(1);
    const pairKeyAB = (ax: number, ay: number, bx: number, by: number): string =>
      `${q(ax)},${q(ay)}|${q(bx)},${q(by)}`;
    const pairKeys = new Set<string>();
    for (const [a, b] of pairs) {
      const pa = mapToPx(a.map), pb = mapToPx(b.map);
      pairKeys.add(pairKeyAB(pa.x, pa.y, pb.x, pb.y));
      pairKeys.add(pairKeyAB(pb.x, pb.y, pa.x, pa.y));
    }
    let listed = 0, foreign = 0;
    for (const k of chunkWin) {
      for (const s of d1.roadSegsForChunk(k.cx, k.cy)) {
        listed++;
        if (!pairKeys.has(pairKeyAB(s.ax, s.ay, s.bx, s.by))) foreign++;
      }
    }
    check('L: every listed segment is a real linked pair\'s chord (endpoint oracle)',
      listed > 0 && foreign === 0, `${foreign}/${listed} foreign`);
    let missingMid = 0;
    for (const [a, b] of pairs) {
      const pa = mapToPx(a.map), pb = mapToPx(b.map);
      const list = d1.roadSegsForChunk(Math.floor((pa.x + pb.x) / 2 / C), Math.floor((pa.y + pb.y) / 2 / C));
      const k1 = pairKeyAB(pa.x, pa.y, pb.x, pb.y), k2 = pairKeyAB(pb.x, pb.y, pa.x, pa.y);
      if (!list.some(s => { const k = pairKeyAB(s.ax, s.ay, s.bx, s.by); return k === k1 || k === k2; })) missingMid++;
    }
    check('L: every pair\'s chord stands in its own midpoint chunk\'s list', missingMid === 0,
      `${missingMid}/${pairs.length} missing`);
    // THE COVERING LAW: every road:true sample finds a listed segment within
    // the ribbon in ITS OWN chunk's list (lattice + on-spine walks).
    const roadPts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < 40; i++) {
      for (let j = 0; j < 40; j++) {
        const x = latMinX + ((i + 0.5) / 40) * (latMaxX - latMinX);
        const y = latMinY + ((j + 0.5) / 40) * (latMaxY - latMinY);
        if (s1(x, y, seed).road) roadPts.push({ x, y });
      }
    }
    for (const [a, b] of pairs.slice(0, Math.min(3, pairs.length))) {
      const pa = mapToPx(a.map), pb = mapToPx(b.map);
      for (let ti = 0; ti <= 20; ti++) {
        const t = ti / 20;
        roadPts.push({ x: pa.x + (pb.x - pa.x) * t, y: pa.y + (pb.y - pa.y) * t });
      }
    }
    let uncovered = 0;
    for (const p of roadPts) {
      const list = d1.roadSegsForChunk(Math.floor(p.x / C), Math.floor(p.y / C));
      if (!list.some(s => segDistSqL(p.x, p.y, s) <= pad * pad)) uncovered++;
    }
    check('L: THE COVERING LAW — every road sample finds its segment in its own chunk\'s list',
      roadPts.length >= 40 && uncovered === 0, `${uncovered}/${roadPts.length} uncovered`);

    // L2 — ROAD TONE over the K lattice: deterministic, sane hex.
    const toneDump = (d: NonNullable<typeof d1>): string => {
      let out = '';
      for (let i = 0; i < 24; i++) {
        for (let j = 0; j < 24; j++) {
          const x = latMinX + ((i + 0.5) / 24) * (latMaxX - latMinX);
          const y = latMinY + ((j + 0.5) / 24) * (latMaxY - latMinY);
          out += d.roadToneAt(x, y, seed) + ';';
        }
      }
      return out;
    };
    const td1 = toneDump(d1);
    check('L: road tones are deterministic across independent builders', td1 === toneDump(d2));
    check('L: and across re-asks', td1 === toneDump(d1));
    check('L: every road tone is a sane hex', td1.split(';').filter(Boolean).every(h => hexRgb(h) !== null));

    // L2b/L3 — THE SYNTHETIC LONG LINK: two zones 300 units (9600px) apart
    // with authored theme road colors — cells clamp at 2400px halves, so a
    // TRUE between-stretch of ~4800px spans the chord (the wayside dress's
    // guaranteed stage; the fake-pair grammar of rig F, stretched). The
    // chord's shoulder must be dry land for the seat rig, so the base is
    // scanned (findLandBase's own idiom).
    const roadA = '#804020', roadB = '#204080';
    const base = findLandBase((bx, by) => {
      const pa = mapToPx({ x: bx, y: by });
      const pts: Array<{ x: number; y: number }> = [];
      for (let along = 2500; along <= 7100; along += 460) {
        for (const off of [-90, 0, 90]) pts.push({ x: pa.x + along, y: pa.y + off });
      }
      return pts;
    });
    check('L: a dry long-link stage stands within the far scan', base !== null,
      base ? `base (${base.bx}, ${base.by})` : 'no dry stretch found — widen the scan');
    if (base) {
      const { bx, by } = base;
      const [tplA, tplB] = pairs[0];
      world.zoneMap['tissue_road_a'] = {
        ...tplA, id: 'tissue_road_a', map: { x: bx, y: by },
        exits: [{ to: 'tissue_road_b', side: 'e' }],
        theme: { ...tplA.theme, road: roadA },
      };
      world.zoneMap['tissue_road_b'] = {
        ...tplB, id: 'tissue_road_b', map: { x: bx + 300, y: by },
        exits: [{ to: 'tissue_road_a', side: 'w' }],
        theme: { ...tplB.theme, road: roadB },
      };
      world.zoneMap['tissue_road_c'] = {
        ...tplA, id: 'tissue_road_c', map: { x: bx, y: by + 900 }, exits: [],
        theme: { ...tplA.theme, road: undefined },
      };
      const s8 = buildTissueSampler(world), s9 = buildTissueSampler(world);
      const d8 = massDressOf(s8), d9 = massDressOf(s9);
      check('L: the grown world\'s samplers carry the road lane', speaks(d8) && speaks(d9));
      if (d8 && d9 && speaks(d8)) {
        const paL = mapToPx({ x: bx, y: by }), pbL = mapToPx({ x: bx + 300, y: by });
        // Tone law: pure at the isolated seat, exact 50/50 at the
        // equidistant chord middle, the default where the theme is silent.
        check('L: an isolated cell\'s own seat wears its OWN theme road tone verbatim',
          d8.roadToneAt(paL.x, paL.y, seed) === roadA,
          `got ${d8.roadToneAt(paL.x, paL.y, seed)}, authored ${roadA}`);
        const midX = (paL.x + pbL.x) / 2;
        check('L: the equidistant chord middle mixes the pair 50/50 (midHex oracle)',
          d8.roadToneAt(midX, paL.y, seed) === midHex(roadA, roadB),
          `got ${d8.roadToneAt(midX, paL.y, seed)}, oracle ${midHex(roadA, roadB)}`);
        const pcL = mapToPx({ x: bx, y: by + 900 });
        check('L: a theme without a road lane wears the packed-grey default',
          d8.roadToneAt(pcL.x, pcL.y, seed) === ROAD_TONE_DEFAULT,
          `got ${d8.roadToneAt(pcL.x, pcL.y, seed)}`);

        // THE WAYSIDE SEATS along the between-stretch, through the pure
        // helper: deterministic across builders + re-asks, alive, and every
        // seat honest against the independent oracles.
        const chord: TissueRoadSeg = { ax: paL.x, ay: paL.y, bx: pbL.x, by: pbL.y };
        const cxA = Math.floor((paL.x + 2400) / C), cxB = Math.floor((paL.x + 7200) / C);
        const cyMid = Math.floor(paL.y / C);
        const wsSeats: MassStampSeat[] = [];
        let w1 = '', w2 = '', w3 = '';
        for (let cxL = cxA; cxL <= cxB; cxL++) {
          for (let cyL = cyMid - 1; cyL <= cyMid + 1; cyL++) {
            const list = waysideSeatsForChunk(d8, seed, cxL, cyL);
            w1 += JSON.stringify(list);
            w2 += JSON.stringify(waysideSeatsForChunk(d9, seed, cxL, cyL));
            w3 += JSON.stringify(waysideSeatsForChunk(d8, seed, cxL, cyL));
            wsSeats.push(...list);
          }
        }
        check('L: wayside seats are deterministic across independent builders', w1 === w2);
        check('L: and across re-asks', w1 === w3);
        check('L: the verge is alive along the between-stretch', wsSeats.length >= 1,
          `${wsSeats.length} seats over ${(cxB - cxA + 1) * 3} chunks`);
        // Oracles: the grown web's own fold cells + agreed aprons + every
        // segment (real pairs + the chord).
        const rosterL = cellRosterOf(world.zoneMap);
        const foldL = foldCells(rosterL.map(z => ({ id: z.id, ...mapToPx(z.map) })));
        const cellsL = [...foldL.values()];
        const grownPairs = linkedPairs(world.zoneMap);
        const apronsL: Array<{ x: number; y: number }> = [];
        for (const [a, b] of grownPairs) {
          if (!world.seamlessResidentEligible(a) || !world.seamlessResidentEligible(b)) continue;
          const ca = foldL.get(a.id), cb = foldL.get(b.id);
          if (!ca || !cb) continue;
          const p = borderAgreedPoint(ca, cb);
          if (p) apronsL.push({ x: p.x, y: p.y });
        }
        const nearestAll = (x: number, y: number): number =>
          Math.min(nearestSegDist(x, y), Math.sqrt(segDistSqL(x, y, chord)));
        const poolKinds = new Set(WAYSIDE_GLYPHS.map(r => r.kind));
        const rLo = Math.min(...WAYSIDE_GLYPHS.map(r => r.radius[0]));
        const rHi = Math.max(...WAYSIDE_GLYPHS.map(r => r.radius[1]));
        let badWalk = 0, badBand = 0, badBody = 0, badCell = 0, badApron = 0, badLand = 0, badKind = 0;
        for (const st of wsSeats) {
          if (s8(st.x, st.y, seed).walkable) badWalk++;
          const nd = nearestAll(st.x, st.y);
          if (!(nd <= pad + MASSDRESS_CFG.shoulderPx)) badBand++;
          if (!(nd > pad + ROADDRESS_CFG.waysideRoadGap + st.r)) badBody++;
          if (cellsL.some(cc => st.x >= cc.x0 && st.x <= cc.x1 && st.y >= cc.y0 && st.y <= cc.y1)) badCell++;
          if (apronsL.some(ap => Math.hypot(st.x - ap.x, st.y - ap.y)
            <= PARTITION_CFG.mouthApronPx + MASSDRESS_CFG.shoulderPx)) badApron++;
          if (biomeAt(pxToMap({ x: st.x, y: st.y }), seed) === OCEAN_BIOME) badLand++;
          if (!poolKinds.has(st.kind) || !(st.r >= rLo && st.r <= rHi)) badKind++;
        }
        check('L: no wayside seat is walkable through the sampler (drawn == tested)',
          badWalk === 0, `${badWalk}/${wsSeats.length}`);
        check('L: every seat centers INSIDE the clearway shoulder band (independent oracle)',
          badBand === 0, `${badBand} beyond roadHalfPx+shoulderPx`);
        check('L: every seat\'s body clears every ribbon by the crossing gap',
          badBody === 0, `${badBody} within pad+gap+r`);
        check('L: every seat stands outside every fold cell (re-derived oracle)', badCell === 0,
          `${badCell} inside a cell`);
        check('L: every seat stands clear of every mouth apron + shoulder (the M0.5 posts keep their stage)',
          badApron === 0, `${badApron} crowding`);
        check('L: every seat stands on land', badLand === 0, `${badLand} wet`);
        check('L: every seat draws from the closed wayside pool at a sane radius', badKind === 0,
          `${badKind} bad`);
      }
      delete world.zoneMap['tissue_road_a'];
      delete world.zoneMap['tissue_road_b'];
      delete world.zoneMap['tissue_road_c'];
    }

    // L4 — THE ONE-SHOULDER ARITHMETIC (the law the seat test leans on).
    const maxGlyph = Math.max(...WAYSIDE_GLYPHS.map(r => r.radius[1]));
    check('L: THE ONE SHOULDER fits — waysideOff max + widest glyph ≤ shoulderPx (bin-valid by arithmetic)',
      ROADDRESS_CFG.waysideOff[1] + maxGlyph <= MASSDRESS_CFG.shoulderPx,
      `${ROADDRESS_CFG.waysideOff[1]} + ${maxGlyph} vs ${MASSDRESS_CFG.shoulderPx}`);
    check('L: the crossing gap undercuts the own-road offset (a seat\'s own segment can never refuse it)',
      ROADDRESS_CFG.waysideRoadGap < ROADDRESS_CFG.waysideOff[0],
      `${ROADDRESS_CFG.waysideRoadGap} vs ${ROADDRESS_CFG.waysideOff[0]}`);
    check('L: the wayside pool is non-empty and sane',
      WAYSIDE_GLYPHS.length > 0 && WAYSIDE_GLYPHS.every(r =>
        r.weight > 0 && r.radius[0] > 0 && r.radius[1] >= r.radius[0]));

    // L5 — the road lane installed NOTHING (discrete play reads none of it).
    check('L: the road-dress reads installed NOTHING — the seam stays null', getTissueSampler() === null);
  }
}

// -------------------------------------------------------------------------- M
{
  // THE ROUTED RIBBON (M2 wave 8b) — the header carries the law. Three
  // fixture groups on one scanned dry base, y-separated 300u (9600px —
  // beyond every cut's reach of 2×cellMaxHalfPx and of the real web far
  // behind the scan window): AB abuts (86u apart) with a north CUTTER
  // trimming A's border band so the agreed point stands OFF the old chord
  // (non-trivial by construction); NA stands 170u apart (a true 640px
  // tissue strip — the border-treatment coda's gen_33↔gen_41 class) with
  // deliberately OFFSET door `at`s (0.3 / 0.7 — the oblique class the
  // 08-14 route census measured at 62% of live pairs); CH is the
  // ineligible control (seedless spreads — towns keep their chords).
  const RIG_M_EPS = 0.5; // px — the alignment bound (flagged; endpoints are exact by construction)
  const C = SEAMLESS_CFG.chunkPx;
  const pad = SEAMLESS_CFG.roadHalfPx;
  const segDistSqM = (px: number, py: number, s: { ax: number; ay: number; bx: number; by: number }): number => {
    const dx = s.bx - s.ax, dy = s.by - s.ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 > 0 ? ((px - s.ax) * dx + (py - s.ay) * dy) / len2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return (px - (s.ax + dx * t)) ** 2 + (py - (s.ay + dy * t)) ** 2;
  };

  // The dry scan covers the points the MASS pins read (road pins are
  // dryness-free — roads are always walkable); u = px per unit, derived
  // not assumed (the I-rig idiom).
  const uPx = mapToPx({ x: 1, y: 0 }).x - mapToPx({ x: 0, y: 0 }).x;
  const massPts = (bx: number, by: number): Array<{ x: number; y: number }> => {
    const pts: Array<{ x: number; y: number }> = [];
    for (const gx of [80, 85, 90]) {
      for (const gy of [240, 270, 330, 360]) pts.push(mapToPx({ x: bx + gx, y: by + gy }));
    }
    for (const gx of [78, 82, 88, 92]) pts.push(mapToPx({ x: bx + gx, y: by + 300 }));
    return pts;
  };
  const baseM = findLandBase(massPts);
  check('M: a dry fixture base stands within the far scan', baseM !== null,
    baseM ? `base (${baseM.bx}, ${baseM.by}) units` : 'none found — widen the scan');
  if (baseM) {
    const { bx, by } = baseM;
    const [tplA, tplB] = pairs[0];
    // GROUP AB (abutting, at by): eligible pair + the ineligible cutter.
    world.zoneMap['tissue_rt_ab_a'] = {
      ...tplB, id: 'tissue_rt_ab_a', map: { x: bx, y: by }, seed: 424242,
      exits: [{ to: 'tissue_rt_ab_b', side: 'e', at: 0.35 }],
    };
    world.zoneMap['tissue_rt_ab_b'] = {
      ...tplB, id: 'tissue_rt_ab_b', map: { x: bx + 86, y: by + 30 }, seed: 424243,
      exits: [{ to: 'tissue_rt_ab_a', side: 'w', at: 0.62 }],
    };
    world.zoneMap['tissue_rt_ab_cut'] = {
      ...tplB, id: 'tissue_rt_ab_cut', map: { x: bx - 5, y: by - 60 }, exits: [],
    };
    // GROUP NA (non-abutting, at by+300): a real strip, oblique doors.
    world.zoneMap['tissue_rt_na_a'] = {
      ...tplB, id: 'tissue_rt_na_a', map: { x: bx, y: by + 300 }, seed: 424244,
      exits: [{ to: 'tissue_rt_na_b', side: 'e', at: 0.3 }],
    };
    world.zoneMap['tissue_rt_na_b'] = {
      ...tplB, id: 'tissue_rt_na_b', map: { x: bx + 170, y: by + 300 }, seed: 424245,
      exits: [{ to: 'tissue_rt_na_a', side: 'w', at: 0.7 }],
    };
    // GROUP CH (ineligible control, at by-300): seedless — towns keep chords.
    world.zoneMap['tissue_rt_ch_a'] = {
      ...tplA, id: 'tissue_rt_ch_a', map: { x: bx, y: by - 300 },
      exits: [{ to: 'tissue_rt_ch_b', side: 'e' }],
    };
    world.zoneMap['tissue_rt_ch_b'] = {
      ...tplB, id: 'tissue_rt_ch_b', map: { x: bx + 86, y: by - 300 },
      exits: [{ to: 'tissue_rt_ch_a', side: 'w' }],
    };
    const rtIds = ['tissue_rt_ab_a', 'tissue_rt_ab_b', 'tissue_rt_ab_cut',
      'tissue_rt_na_a', 'tissue_rt_na_b', 'tissue_rt_ch_a', 'tissue_rt_ch_b'];

    // M0 — the stage is honest, through the engine's own predicate.
    const elig = (id: string): boolean => world.seamlessResidentEligible(world.zoneMap[id]);
    check('M0: the four routed fixtures are resident-eligible (the engine\'s own predicate)',
      elig('tissue_rt_ab_a') && elig('tissue_rt_ab_b') && elig('tissue_rt_na_a') && elig('tissue_rt_na_b'));
    check('M0: the control pair is NOT eligible (seedless — the chord class exists)',
      !elig('tissue_rt_ch_a') && !elig('tissue_rt_ch_b'));

    // The probe's own oracle twin: the fold, the placeExit edge formula
    // (side-first, an independent re-derivation), and the route classifier.
    const foldM = foldCells(cellRosterOf(world.zoneMap).map(z => ({ id: z.id, ...mapToPx(z.map) })));
    const doorWayOracle = (z: ZoneDef, destId: string, cell: CellRect):
      { seat: { x: number; y: number }; mouth: { x: number; y: number } } | null => {
      const e = z.exits.find(ex => ex.to === destId && !(ex as { crossDim?: true }).crossDim);
      if (!e) return null;
      const w = cell.x1 - cell.x0, h = cell.y1 - cell.y0;
      const t = e.at ?? 0.5, lo = PORTAL_EDGE_INSET;
      const ax = Math.min(w - lo, Math.max(lo, w * t));
      const ay = Math.min(h - lo, Math.max(lo, h * t));
      const seat = e.side === 'n' ? { x: ax, y: lo } : e.side === 's' ? { x: ax, y: h - lo }
        : e.side === 'w' ? { x: lo, y: ay } : { x: w - lo, y: ay };
      const mouth = e.side === 'n' ? { x: seat.x, y: 0 } : e.side === 's' ? { x: seat.x, y: h }
        : e.side === 'w' ? { x: 0, y: seat.y } : { x: w, y: seat.y };
      return { seat: { x: cell.x0 + seat.x, y: cell.y0 + seat.y },
        mouth: { x: cell.x0 + mouth.x, y: cell.y0 + mouth.y } };
    };
    const routeOracle = (a: ZoneDef, b: ZoneDef): Array<{ x: number; y: number }> => {
      const pa = mapToPx(a.map), pb = mapToPx(b.map);
      if (!world.seamlessResidentEligible(a) || !world.seamlessResidentEligible(b)) return [pa, pb];
      const ca = foldM.get(a.id), cb = foldM.get(b.id);
      if (!ca || !cb) return [pa, pb];
      const p = borderAgreedPoint(ca, cb);
      if (p) return [pa, { x: p.x, y: p.y }, pb];
      const wa = doorWayOracle(a, b.id, ca), wb = doorWayOracle(b, a.id, cb);
      const out: Array<{ x: number; y: number }> = [pa];
      if (wa) out.push(wa.seat, wa.mouth);
      if (wb) out.push(wb.mouth, wb.seat);
      out.push(pb);
      return out;
    };
    const zm = (id: string): ZoneDef => world.zoneMap[id];
    const cellAB_a = foldM.get('tissue_rt_ab_a')!, cellAB_b = foldM.get('tissue_rt_ab_b')!;
    const cellNA_a = foldM.get('tissue_rt_na_a')!, cellNA_b = foldM.get('tissue_rt_na_b')!;
    const pAB = borderAgreedPoint(cellAB_a, cellAB_b);
    check('M0: the AB pair abuts with an agreed point (the fold oracle)', pAB !== null);
    check('M0: the NA pair does NOT abut — a true tissue strip lies between',
      borderAgreedPoint(cellNA_a, cellNA_b) === null,
      `gap ${(cellNA_b.x0 - cellNA_a.x1).toFixed(0)}px`);
    const wayNA_a = doorWayOracle(zm('tissue_rt_na_a'), 'tissue_rt_na_b', cellNA_a);
    const wayNA_b = doorWayOracle(zm('tissue_rt_na_b'), 'tissue_rt_na_a', cellNA_b);
    check('M0: both NA door ways derive (seat + mouth)', wayNA_a !== null && wayNA_b !== null);
    // Non-triviality: the OLD chord misses P (AB) and the doors stand
    // laterally offset (NA) — the routed shapes actually bend.
    const abA = mapToPx(zm('tissue_rt_ab_a').map), abB = mapToPx(zm('tissue_rt_ab_b').map);
    let chordAtBorder: { x: number; y: number } | null = null;
    if (pAB) {
      const t = (pAB.x - abA.x) / (abB.x - abA.x);
      chordAtBorder = { x: pAB.x, y: abA.y + (abB.y - abA.y) * t };
    }
    check('M0: the abutting stage is NON-TRIVIAL — the old chord crossed the border off P',
      !!pAB && !!chordAtBorder && Math.abs(chordAtBorder.y - pAB.y) > 60,
      pAB && chordAtBorder ? `chord ${chordAtBorder.y.toFixed(1)} vs P ${pAB.y.toFixed(1)} (Δ${Math.abs(chordAtBorder.y - pAB.y).toFixed(0)}px)` : '');
    check('M0: the oblique stage is truly oblique — the NA doors stand far apart along the rim',
      !!wayNA_a && !!wayNA_b && Math.abs(wayNA_a.seat.y - wayNA_b.seat.y) > 500,
      wayNA_a && wayNA_b ? `lateral Δ${Math.abs(wayNA_a.seat.y - wayNA_b.seat.y).toFixed(0)}px over a ${(cellNA_b.x0 - cellNA_a.x1).toFixed(0)}px strip` : '');

    // Fresh samplers over the staged web (M4's determinism trio).
    const sM1 = buildTissueSampler(world), sM2 = buildTissueSampler(world);
    const dM1 = massDressOf(sM1)!;

    // M1 — THE ALIGNMENT PIN: the sampler's OWN chunk segments pass within
    // RIG_M_EPS of every crossing point, and each point reads road:true.
    const segsNear = (x: number, y: number): readonly TissueRoadSeg[] =>
      dM1.roadSegsForChunk(Math.floor(x / C), Math.floor(y / C));
    const minDistTo = (x: number, y: number): number => {
      let best = Infinity;
      for (const s of segsNear(x, y)) best = Math.min(best, Math.sqrt(segDistSqM(x, y, s)));
      return best;
    };
    const alignPts: Array<[string, { x: number; y: number }]> = [];
    if (pAB) alignPts.push(['AB agreed point', { x: pAB.x, y: pAB.y }]);
    if (wayNA_a) alignPts.push(['NA seat A', wayNA_a.seat], ['NA mouth A', wayNA_a.mouth]);
    if (wayNA_b) alignPts.push(['NA seat B', wayNA_b.seat], ['NA mouth B', wayNA_b.mouth]);
    let alignBad = '';
    for (const [name, pt] of alignPts) {
      const d = minDistTo(pt.x, pt.y);
      if (d > RIG_M_EPS) alignBad += `${name} Δ${d.toFixed(2)}px; `;
      if (!sM1(pt.x, pt.y, seed).road) alignBad += `${name} not road; `;
    }
    check('M1: THE ALIGNMENT PIN — the ribbon passes within eps of P, both seats and both mouths, all road:true',
      alignPts.length === 5 && alignBad === '', alignBad || `${alignPts.length} crossing points exact`);

    // M2 — THE DEAD CROSSING WALKS. The strip corridor: mouth to mouth at
    // 6px steps, every sample road+walkable through the sampler; the strip
    // is REAL (samples outside both cells exist).
    if (wayNA_a && wayNA_b) {
      const mA = wayNA_a.mouth, mB = wayNA_b.mouth;
      const len = Math.hypot(mB.x - mA.x, mB.y - mA.y);
      let walkN = 0, walkBad = 0, outside = 0;
      for (let d = 0; d <= len; d += 6) {
        const x = mA.x + (mB.x - mA.x) * (d / len), y = mA.y + (mB.y - mA.y) * (d / len);
        const t = sM1(x, y, seed);
        walkN++;
        if (!t.walkable || !t.road) walkBad++;
        const inA = x >= cellNA_a.x0 && x <= cellNA_a.x1 && y >= cellNA_a.y0 && y <= cellNA_a.y1;
        const inB = x >= cellNA_b.x0 && x <= cellNA_b.x1 && y >= cellNA_b.y0 && y <= cellNA_b.y1;
        if (!inA && !inB) outside++;
      }
      check('M2: the NA corridor walks mouth-to-mouth — every step road+walkable (the dead crossing lives)',
        walkN > 0 && walkBad === 0, `${walkN - walkBad}/${walkN} steps, ${len.toFixed(0)}px`);
      check('M2: and the walk truly crosses the strip (outside-cell steps exist)', outside >= 20,
        `${outside} outside-cell steps`);

      // The OLD chord's strip crossing reads solid mass now (the swap's
      // other face): qualified samples = outside both cells, dry, flat,
      // clear of every routed piece (oracle) by 2× the ribbon.
      const naA = mapToPx(zm('tissue_rt_na_a').map), naB = mapToPx(zm('tissue_rt_na_b').map);
      const oraclePieces: Array<{ ax: number; ay: number; bx: number; by: number }> = [];
      for (const [pa2, pb2] of [
        [zm('tissue_rt_ab_a'), zm('tissue_rt_ab_b')] as const,
        [zm('tissue_rt_na_a'), zm('tissue_rt_na_b')] as const,
        [zm('tissue_rt_ch_a'), zm('tissue_rt_ch_b')] as const,
      ]) {
        const pts = routeOracle(pa2, pb2);
        for (let k = 1; k < pts.length; k++) {
          oraclePieces.push({ ax: pts[k - 1].x, ay: pts[k - 1].y, bx: pts[k].x, by: pts[k].y });
        }
      }
      const clearOfRouted = (x: number, y: number, margin: number): boolean =>
        oraclePieces.every(s => segDistSqM(x, y, s) > margin * margin)
        && nearestSegDist(x, y) > margin;
      let deadN = 0, deadBad = 0;
      for (let t = 0.3; t <= 0.7; t += 0.02) {
        const x = naA.x + (naB.x - naA.x) * t, y = naA.y + (naB.y - naA.y) * t;
        const inA = x >= cellNA_a.x0 && x <= cellNA_a.x1 && y >= cellNA_a.y0 && y <= cellNA_a.y1;
        const inB = x >= cellNA_b.x0 && x <= cellNA_b.x1 && y >= cellNA_b.y0 && y <= cellNA_b.y1;
        if (inA || inB) continue;
        if (!clearOfRouted(x, y, pad * 2)) continue;
        const cm = pxToMap({ x, y });
        if (biomeAt(cm, seed) === OCEAN_BIOME) continue;
        const h = TISSUE_CFG.slopeStepUnits;
        const gx = elevationAt({ x: cm.x + h, y: cm.y }, seed) - elevationAt({ x: cm.x - h, y: cm.y }, seed);
        const gy = elevationAt({ x: cm.x, y: cm.y + h }, seed) - elevationAt({ x: cm.x, y: cm.y - h }, seed);
        if (Math.hypot(gx, gy) / (2 * h) > TISSUE_CFG.slopeMax) continue;
        const t2 = sM1(x, y, seed);
        deadN++;
        if (t2.road || t2.walkable) deadBad++;
      }
      check('M2: the OLD chord\'s strip crossing reads solid mass (the misaligned way is dead)',
        deadN >= 2 && deadBad === 0, `${deadN - deadBad}/${deadN} qualified chord samples refused`);
    }

    // M3 — chord country unchanged where no pairing applies: the control
    // pair's midpoint chunk lists EXACTLY its bare chord (endpoint oracle),
    // and the chord midpoint still reads road.
    {
      const chA = mapToPx(zm('tissue_rt_ch_a').map), chB = mapToPx(zm('tissue_rt_ch_b').map);
      const q = (v: number): string => v.toFixed(1);
      const key = (s: { ax: number; ay: number; bx: number; by: number }): string =>
        `${q(s.ax)},${q(s.ay)}|${q(s.bx)},${q(s.by)}`;
      const want = new Set([
        `${q(chA.x)},${q(chA.y)}|${q(chB.x)},${q(chB.y)}`,
        `${q(chB.x)},${q(chB.y)}|${q(chA.x)},${q(chA.y)}`,
      ]);
      const mx = (chA.x + chB.x) / 2, my = (chA.y + chB.y) / 2;
      const list = dM1.roadSegsForChunk(Math.floor(mx / C), Math.floor(my / C));
      check('M3: the ineligible pair keeps its bare chord — the midpoint chunk lists it endpoint-exact',
        list.length >= 1 && list.every(s2 => want.has(key(s2))) && list.some(s2 => want.has(key(s2))),
        `${list.length} listed`);
      check('M3: and the chord midpoint still reads road (doors keep their ways)',
        sM1(mx, my, seed).road);
    }

    // M4 — determinism ×3 over routed geometry: samples and chunk lists.
    {
      const windows: Array<[number, number]> = [
        [mapToPx({ x: bx, y: by }).x, mapToPx({ x: bx, y: by }).y],
        [mapToPx({ x: bx, y: by + 300 }).x, mapToPx({ x: bx, y: by + 300 }).y],
        [mapToPx({ x: bx, y: by - 300 }).x, mapToPx({ x: bx, y: by - 300 }).y],
      ];
      const span = 190 * uPx;
      const dump = (s: ReturnType<typeof buildTissueSampler>): string => {
        const d = massDressOf(s)!;
        let out = '';
        for (const [wx, wy] of windows) {
          for (let i = 0; i < 24; i++) {
            for (let j = 0; j < 24; j++) {
              const x = wx + ((i + 0.5) / 24 - 0.25) * span, y = wy + ((j + 0.5) / 24 - 0.5) * span * 0.6;
              const t = s(x, y, seed);
              out += `${t.walkable ? 1 : 0}${t.road ? 1 : 0}${t.tone};`;
            }
          }
          for (let cx2 = Math.floor((wx - span / 4) / C); cx2 <= Math.floor((wx + span * 0.75) / C); cx2++) {
            for (let cy2 = Math.floor((wy - span * 0.3) / C); cy2 <= Math.floor((wy + span * 0.3) / C); cy2++) {
              out += JSON.stringify(d.roadSegsForChunk(cx2, cy2)) + ';';
            }
          }
        }
        return out;
      };
      const m1 = dump(sM1);
      check('M4: two builders answer the routed geometry byte-identically', m1 === dump(sM2));
      check('M4: a re-ask answers itself byte-identically', m1 === dump(sM1));
    }

    // M5 — THE COVERING LAW over the routed geometry: every road:true
    // sample (lattice + marches along every oracle piece) finds a listed
    // segment within the ribbon in its OWN chunk's list.
    {
      const roadPtsM: Array<{ x: number; y: number }> = [];
      for (const [pa2, pb2] of [
        [zm('tissue_rt_ab_a'), zm('tissue_rt_ab_b')] as const,
        [zm('tissue_rt_na_a'), zm('tissue_rt_na_b')] as const,
        [zm('tissue_rt_ch_a'), zm('tissue_rt_ch_b')] as const,
      ]) {
        const pts = routeOracle(pa2, pb2);
        for (let k = 1; k < pts.length; k++) {
          const p0 = pts[k - 1], p1 = pts[k];
          const n = 20;
          for (let i = 0; i <= n; i++) {
            roadPtsM.push({ x: p0.x + (p1.x - p0.x) * (i / n), y: p0.y + (p1.y - p0.y) * (i / n) });
          }
        }
      }
      let offRibbon = 0, uncoveredM = 0;
      for (const p of roadPtsM) {
        if (!sM1(p.x, p.y, seed).road) { offRibbon++; continue; }
        const list = dM1.roadSegsForChunk(Math.floor(p.x / C), Math.floor(p.y / C));
        if (!list.some(s2 => segDistSqM(p.x, p.y, s2) <= pad * pad)) uncoveredM++;
      }
      check('M5: every oracle-piece march point reads road through the sampler (route == capture)',
        roadPtsM.length > 60 && offRibbon === 0, `${offRibbon}/${roadPtsM.length} off-ribbon`);
      check('M5: THE COVERING LAW holds over routed pieces — every road sample finds its own chunk\'s segment',
        uncoveredM === 0, `${uncoveredM}/${roadPtsM.length} uncovered`);
    }

    // M6 — the solid between + the subset law survive routing: strip grid
    // ground clear of the corridor refuses tissue AND reads dressable mass;
    // ON the routed strip piece the mass read stands down (road exclusion).
    if (wayNA_a && wayNA_b) {
      let stripN = 0, stripOpen = 0, stripNotMass = 0;
      for (const p of massPts(bx, by)) {
        // the twelve strip-grid points (the dry scan's own list, first 12)
        if (p.y === mapToPx({ x: 0, y: by + 300 }).y) continue; // chord-lane points belong to M2
        const inA = p.x >= cellNA_a.x0 && p.x <= cellNA_a.x1 && p.y >= cellNA_a.y0 && p.y <= cellNA_a.y1;
        const inB = p.x >= cellNA_b.x0 && p.x <= cellNA_b.x1 && p.y >= cellNA_b.y0 && p.y <= cellNA_b.y1;
        if (inA || inB) continue;
        const clear = Math.sqrt(Math.min(
          segDistSqM(p.x, p.y, { ax: wayNA_a.mouth.x, ay: wayNA_a.mouth.y, bx: wayNA_b.mouth.x, by: wayNA_b.mouth.y }),
          segDistSqM(p.x, p.y, { ax: wayNA_a.seat.x, ay: wayNA_a.seat.y, bx: wayNA_a.mouth.x, by: wayNA_a.mouth.y }),
          segDistSqM(p.x, p.y, { ax: wayNA_b.seat.x, ay: wayNA_b.seat.y, bx: wayNA_b.mouth.x, by: wayNA_b.mouth.y }),
        ));
        if (clear <= pad + MASSDRESS_CFG.shoulderPx + 1) continue;
        const cm = pxToMap(p);
        if (biomeAt(cm, seed) === OCEAN_BIOME) continue;
        const h = TISSUE_CFG.slopeStepUnits;
        const gx = elevationAt({ x: cm.x + h, y: cm.y }, seed) - elevationAt({ x: cm.x - h, y: cm.y }, seed);
        const gy = elevationAt({ x: cm.x, y: cm.y + h }, seed) - elevationAt({ x: cm.x, y: cm.y - h }, seed);
        if (Math.hypot(gx, gy) / (2 * h) > TISSUE_CFG.slopeMax) continue;
        stripN++;
        if (sM1(p.x, p.y, seed).walkable) stripOpen++;
        if (!dM1.massAt(p.x, p.y, seed)) stripNotMass++;
      }
      check('M6: off-corridor strip ground still refuses tissue (the solid between survives routing)',
        stripN >= 4 && stripOpen === 0, `${stripN - stripOpen}/${stripN} refused`);
      check('M6: and reads dressable mass (the country dress reaches the routed strip)',
        stripN >= 4 && stripNotMass === 0, `${stripN - stripNotMass}/${stripN} mass`);
      const midStrip = {
        x: (wayNA_a.mouth.x + wayNA_b.mouth.x) / 2,
        y: (wayNA_a.mouth.y + wayNA_b.mouth.y) / 2,
      };
      check('M6: ON the routed corridor the mass read stands down (the road exclusion reaches routed pieces)',
        !dM1.massAt(midStrip.x, midStrip.y, seed) && sM1(midStrip.x, midStrip.y, seed).road);
      check('M6: the routed rig installed NOTHING — the seam stays null', getTissueSampler() === null);
    }

    for (const id of rtIds) delete world.zoneMap[id];
  }
}

// ---------------------------------------------------------------- E (part 2)
{
  setTissueSampler(s1);
  check('E: the seam round-trips — installed sampler reads back', getTissueSampler() === s1);
  setTissueSampler(null);
  check('E: and clears back to null', getTissueSampler() === null);
}

console.log(failed ? `\nprobe_tissue: ${failed} FAILED` : '\nprobe_tissue: all green');
process.exit(failed ? 1 : 0);
