// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE CONNECTIVE TISSUE (seamless-world M0, src/world/tissue.ts):
// the between-zones country synthesized from the global fields, against the
// TissueSampler contract (src/world/seamless.ts). Pins:
//   A  THE PURITY LAW: two samplers built off the SAME world answer
//      byte-identically over a 40×40 lattice spanning two linked nodes, and
//      one sampler re-asked answers itself byte-identically (any internal
//      cache is invisible — same answers cached or cold),
//   B  THE SEA GROWS NO TISSUE: open-ocean ground (continentAt's own verdict,
//      the independent oracle) never samples walkable — and its tone is the
//      sea's own mapColor (drawn and tested agree on the water),
//   C  THE ROAD RIBBON: every sample within SEAMLESS_CFG.roadHalfPx of the
//      segment between two LINKED nodes' seats reads road:true AND
//      walkable:true (roads are always walkable), while ground far off every
//      ribbon reads road:false,
//   D  THE HONEST TONE: three different biomes' tissue tones are sane hexes
//      and each IS that biome's own BiomeInfo.mapColor — the same tint the
//      world-map wash paints, read through the mint path's own biomeAt lane,
//   E  THE NULL SEAM: getTissueSampler() is null at boot (fresh module
//      state), STILL null after builders run (buildTissueSampler is
//      export-only — install belongs to the placement lane), and the
//      registry round-trips set/read/clear,
//   F  THE CAPTURE LAW: a sampler captures the graph AT BUILD — linking two
//      new nodes after the build leaves the old sampler blind to their road,
//      while a fresh sampler poured off the grown graph draws it,
//   G  THE CLIFF LAW: land whose relief slope exceeds TISSUE_CFG.slopeMax
//      (the field's own elevationAt read — the independent oracle) refuses
//      tissue off-road, so the slope lane is live wiring, not dead code.
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
import { mapToPx } from '../src/world/coords';
import { elevationAt } from '../src/world/relief';
import { SEAMLESS_CFG, getTissueSampler, setTissueSampler } from '../src/world/seamless';
import { TISSUE_CFG, buildTissueSampler } from '../src/world/tissue';

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

// ---------------------------------------------------------------- E (part 1)
check('E: getTissueSampler() is null at boot — fresh module state', getTissueSampler() === null);

const s1 = buildTissueSampler(world);
const s2 = buildTissueSampler(world);
check('E: STILL null after builders run — buildTissueSampler is export-only', getTissueSampler() === null);

// -------------------------------------------------------------------------- A
{
  const [a, b] = pairs[0];
  const pa = mapToPx(a.map), pb = mapToPx(b.map);
  const pad = 256;
  const minX = Math.min(pa.x, pb.x) - pad, maxX = Math.max(pa.x, pb.x) + pad;
  const minY = Math.min(pa.y, pb.y) - pad, maxY = Math.max(pa.y, pb.y) + pad;
  const N = 40;
  const row = (fn: (x: number, y: number) => string): string => {
    let out = '';
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const x = minX + ((i + 0.5) / N) * (maxX - minX);
        const y = minY + ((j + 0.5) / N) * (maxY - minY);
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
  check('B: the sea wears the sea\'s own tone (drawn and tested agree on the water)', wrongTone === 0,
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
  const found = new Map<string, { x: number; y: number }>();
  for (let x = -5000; x <= 5000 && found.size < 3; x += 331) {
    for (let y = -5000; y <= 5000 && found.size < 3; y += 331) {
      const biome = biomeAt({ x, y }, seed);
      if (!found.has(biome)) found.set(biome, { x, y });
    }
  }
  check('D: three different biomes stand within the scan window', found.size >= 3,
    [...found.keys()].join(', '));
  for (const [biome, c] of found) {
    const p = mapToPx(c);
    const t = s1(p.x, p.y, seed);
    const saneHex = /^#[0-9a-f]{3,8}$/i.test(t.tone);
    check(`D: '${biome}' tissue tone is a sane hex AND the biome's own mapColor (the map wash's tint)`,
      saneHex && t.tone === BIOMES[biome]?.mapColor, t.tone);
  }
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

// ---------------------------------------------------------------- E (part 2)
{
  setTissueSampler(s1);
  check('E: the seam round-trips — installed sampler reads back', getTissueSampler() === s1);
  setTissueSampler(null);
  check('E: and clears back to null', getTissueSampler() === null);
}

console.log(failed ? `\nprobe_tissue: ${failed} FAILED` : '\nprobe_tissue: all green');
process.exit(failed ? 1 : 0);
