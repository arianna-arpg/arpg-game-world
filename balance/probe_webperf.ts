// ---------------------------------------------------------------------------
// THE SETTLE SWEEP's COST LAWS — the whole-chart settling pass pinned cheap.
//
// The perf gate (2026-07-23) caught World.updateWebSettle spending WHOLE
// FRAMES by mid-session: an ungated all-pairs N² scan every 8s plus uncapped
// relax work while the forechart halo minted. The fix is three laws, pinned
// here:
//
//   THE HASH SCAN — settleWeb's violation/candidate scans ride a spatial
//     hash (pairsWithin) that finds EXACTLY the naive nested walk's pairs in
//     EXACTLY its (i-major, j-ascending) order — byte-identical relaxation
//     by construction (saves/replays/co-op re-derive identical positions).
//   THE QUIET GATE — the sweep beat runs only while webDisturbance() has
//     moved (mints, node moves, deferred work); a converged chart pays
//     NOTHING per beat, however large the halo grows.
//   THE CLUSTER CAP — one sweep beat relaxes at most settle.sweepClusters
//     hot neighbourhoods; deferred clusters stay armed and later beats
//     finish the job (bounded worst beat, amortized convergence).
//   THE SCAN LATTICE — the per-CANDIDATE chart scans (chordClearsNodes /
//     footprintBars / insideFieldFootprint) ride a derived index (field
//     roster + coord cell bins) keyed (zoneMap identity, count,
//     webDisturbance()) — the 2026-07-23 charting-unit audit caught the
//     all-zones walks costing 50-95ms PER UNIT at halo scale. Pinned here:
//     answers byte-equal a naive replica at grown-chart scale, stay coherent
//     through the pokeWeb relocation contract, and serve temp maps (the
//     severFootprintCrossers lone-map shape) without poisoning the main one.
//
// Run: npx tsx balance/probe_webperf.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import type { ZoneDef } from '../src/data/zones';
import { HUB_ZONE } from '../src/data/zones';
import { WEB_CFG, settleWeb, settleMovable, webDisturbance, pokeWeb, chordClearsNodes, footprintBars, insideFieldFootprint } from '../src/engine/worldgen';
import { fieldCoreRect } from '../src/world/fieldRegion';
import { OCEAN_BIOME } from '../src/world/biomes';
import { zoneKindOf } from '../src/data/zoneKinds';

let pass = 0, fail = 0;
function check(label: string, ok: boolean, detail?: string): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (ok) pass++; else fail++;
}

bootSimEngine();
seedGlobalRandom(0x9e3b01);
const w = makeSimWorld('warrior', 0x9e3b01);
w.loadZone(HUB_ZONE);
const priv = w as unknown as {
  chartNeighborsOf(z: ZoneDef): void;
  biomeFor(pt: { x: number; y: number }): string;
  updateWebSettle(): void;
  webSettleNextAt: number;
  time: number;
};
const canStand = (z: ZoneDef, pt: { x: number; y: number }): boolean =>
  (z.dimension ? true : priv.biomeFor(pt) !== OCEAN_BIOME);

// Grow a real chart (the same frontier resolution travel + the halo ride).
for (let r = 0; r < 12; r++) {
  const batch = Object.values(w.zoneMap).filter(z =>
    (z.dimension ?? 'surface') === 'surface' && z.caveDepth == null && !z.pocket
    && z.objective.kind !== 'safe' && !z.floating && !zoneKindOf(z)?.staticExits
    && z.exits.some(e => e.to === '?'));
  for (const z of batch) priv.chartNeighborsOf(z);
}
const surface = (): ZoneDef[] => Object.values(w.zoneMap).filter(z => z.caveDepth == null);
console.log(`grown chart: ${surface().length} settle-visible zones`);

// Converge fully before the pins below.
for (let i = 0; i < 8; i++) if (settleWeb(w.zoneMap, null, { canStand }) === 0) break;

// ------------------------------------------------ A. THE HASH SCAN EQUIVALENCE
// pairsWithin is private — pin it through settleWeb's OBSERVABLE contract
// instead: identical final coordinates vs a positions-snapshot replay, and
// a hand-rolled naive pair scan agreeing with the residual count on a
// manufactured violation field.
{
  const naivePairs = (pool: ZoneDef[], within: number): [number, number][] => {
    const out: [number, number][] = [];
    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        if ((pool[i].dimension ?? 'surface') !== (pool[j].dimension ?? 'surface')) continue;
        if (Math.hypot(pool[j].map.x - pool[i].map.x, pool[j].map.y - pool[i].map.y) < within) out.push([i, j]);
      }
    }
    return out;
  };
  // Manufacture a deterministic scatter of violations, snapshot, settle,
  // restore, settle again: the two runs must land every zone byte-equal
  // (the hash scan cannot depend on Map iteration luck).
  const pool = surface().filter(z => !z.pocket && z.objective.kind !== 'safe' && !z.floating);
  let h = 0xbeef;
  const disturbed: ZoneDef[] = [];
  for (let k = 0; k < pool.length && disturbed.length < 10; k++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const z = pool[h % pool.length];
    if (disturbed.includes(z)) continue;
    let best: ZoneDef | null = null, bd = Infinity;
    for (const o of pool) {
      if (o === z) continue;
      const d = Math.hypot(o.map.x - z.map.x, o.map.y - z.map.y);
      if (d < bd) { bd = d; best = o; }
    }
    if (!best || bd < 1) continue;
    const ux = (best.map.x - z.map.x) / bd, uy = (best.map.y - z.map.y) / bd;
    z.map.x += ux * Math.max(0, bd - 16); z.map.y += uy * Math.max(0, bd - 16);
    disturbed.push(z);
  }
  const snap = new Map(surface().map(z => [z.id, { x: z.map.x, y: z.map.y }] as const));
  const preNaive = naivePairs(surface(), WEB_CFG.hoverClear).length;
  check('A: manufactured violations exist (fixture sane)', preNaive >= 8, `${preNaive} naive pairs from ${disturbed.length} shoves`);

  settleWeb(w.zoneMap, null, { canStand });
  const runA = new Map(surface().map(z => [z.id, { x: z.map.x, y: z.map.y }] as const));
  for (const z of surface()) { const s = snap.get(z.id)!; z.map.x = s.x; z.map.y = s.y; }
  settleWeb(w.zoneMap, null, { canStand });
  let diverged = 0;
  for (const z of surface()) {
    const a = runA.get(z.id)!;
    if (a.x !== z.map.x || a.y !== z.map.y) diverged++;
  }
  check('A: hash-scan settle is deterministic (twin replay byte-equal)', diverged === 0, `${diverged} diverged`);
  // The return value is pool-scoped by design (chained residue past the pool
  // edge is the SWEEP's job) — the honest global pin: repeated full passes
  // drive the naive all-pairs ACTIONABLE count (≥1 movable end) to zero.
  for (let i = 0; i < 10; i++) settleWeb(w.zoneMap, null, { canStand });
  const surf = surface();
  const actionableNaive = naivePairs(surf, WEB_CFG.hoverClear)
    .filter(([i, j]) => settleMovable(surf[i]) || settleMovable(surf[j])).length;
  check('A: repeated passes heal every actionable violation (naive scan)', actionableNaive === 0,
    `${actionableNaive} actionable pairs stand`);
}

// ------------------------------------------------ B. THE QUIET GATE
{
  // Converged chart: repeated sweep beats must not move the disturbance seq
  // (the gate parks after one end-clean pass).
  const beat = (): void => { priv.webSettleNextAt = 0; priv.updateWebSettle(); };
  beat(); // the parking pass (mints during growth left the seq hot)
  beat();
  const s0 = webDisturbance();
  beat(); beat(); beat();
  check('B: converged chart parks the sweep (seq still)', webDisturbance() === s0,
    `seq ${s0} → ${webDisturbance()}`);
  // A poke re-arms exactly one checking pass, which ends clean and re-parks.
  pokeWeb();
  const s1 = webDisturbance();
  beat();
  const s2 = webDisturbance();
  beat(); beat();
  check('B: a disturbance re-arms one clean pass then re-parks',
    s1 === s0 + 1 && s2 === s1 && webDisturbance() === s2,
    `seq ${s0} →poke ${s1} →beat ${s2} →beats ${webDisturbance()}`);
}

// ------------------------------------------------ C. THE CLUSTER CAP
{
  // Disturb several FAR-APART pairs (distinct clusters), then sweep with a
  // cap of 2: later clusters' zones must stand EXACTLY where they were
  // (deferred whole), and successive beats must finish the job.
  const pool = surface().filter(z => !z.pocket && z.objective.kind !== 'safe' && !z.floating
    && !zoneKindOf(z)?.staticExits && !z.field && !z.port && !z.holdAnchor);
  pool.sort((a, b) => a.id < b.id ? -1 : 1);
  const picked: ZoneDef[] = [];
  for (const z of pool) {
    if (picked.every(p => Math.hypot(p.map.x - z.map.x, p.map.y - z.map.y) > WEB_CFG.settle.radius * 3)) picked.push(z);
    if (picked.length >= 6) break;
  }
  check('C: fixture found far-apart movable zones', picked.length >= 5, `${picked.length}`);
  const shoved: ZoneDef[] = [];
  for (const z of picked) {
    let best: ZoneDef | null = null, bd = Infinity;
    for (const o of surface()) {
      if (o === z) continue;
      const d = Math.hypot(o.map.x - z.map.x, o.map.y - z.map.y);
      if (d < bd) { bd = d; best = o; }
    }
    if (!best) continue;
    const ux = (best.map.x - z.map.x) / bd, uy = (best.map.y - z.map.y) / bd;
    z.map.x += ux * Math.max(0, bd - 14); z.map.y += uy * Math.max(0, bd - 14);
    shoved.push(z);
  }
  const before = new Map(surface().map(z => [z.id, { x: z.map.x, y: z.map.y }] as const));
  settleWeb(w.zoneMap, null, { canStand, maxClusters: 2 });
  let movedZones = 0, untouchedShoved = 0;
  for (const z of surface()) {
    const b = before.get(z.id)!;
    if (b.x !== z.map.x || b.y !== z.map.y) movedZones++;
  }
  for (const z of shoved) {
    const b = before.get(z.id)!;
    if (b.x === z.map.x && b.y === z.map.y) untouchedShoved++;
  }
  check('C: a capped beat works SOME clusters and defers the rest whole',
    movedZones > 0 && untouchedShoved > 0, `${movedZones} moved, ${untouchedShoved} shoved-but-deferred`);
  const naiveActionable = (): number => {
    const surf = surface();
    let n = 0;
    for (let i = 0; i < surf.length; i++) {
      for (let j = i + 1; j < surf.length; j++) {
        if ((surf[i].dimension ?? 'surface') !== (surf[j].dimension ?? 'surface')) continue;
        if (!settleMovable(surf[i]) && !settleMovable(surf[j])) continue;
        if (Math.hypot(surf[j].map.x - surf[i].map.x, surf[j].map.y - surf[i].map.y) < WEB_CFG.hoverClear) n++;
      }
    }
    return n;
  };
  let beats = 1; // the capped beat above was the first
  for (; beats < 10 && naiveActionable() > 0; beats++) {
    settleWeb(w.zoneMap, null, { canStand, maxClusters: 2 });
  }
  check('C: successive capped beats converge the whole scatter', naiveActionable() === 0,
    `${beats} beats, ${naiveActionable()} actionable left`);
}

// ------------------------------------------------ D. THE SCAN LATTICE
{
  // Naive replicas of the three scans' OLD all-zones walks — the lattice's
  // answers must byte-equal these on the grown, settled chart (the pairsWithin
  // equivalence idiom: same candidate superset ⇒ same boolean).
  const naiveChord = (a: { x: number; y: number }, b: { x: number; y: number }, dim: string | undefined, skip: ReadonlySet<string>): boolean => {
    for (const z of Object.values(w.zoneMap)) {
      if (skip.has(z.id) || z.caveDepth != null) continue;
      if ((z.dimension ?? 'surface') !== (dim ?? 'surface')) continue;
      const abx = b.x - a.x, aby = b.y - a.y;
      const l2 = abx * abx + aby * aby;
      const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((z.map.x - a.x) * abx + (z.map.y - a.y) * aby) / l2));
      if (Math.hypot(z.map.x - (a.x + t * abx), z.map.y - (a.y + t * aby)) < WEB_CFG.chordNodeClear) return false;
    }
    return true;
  };
  const naiveBars = (a: { x: number; y: number }, b: { x: number; y: number }, zm: Record<string, ZoneDef>, skip?: ReadonlySet<string>): boolean => {
    for (const z of Object.values(zm)) {
      if (!z.field || z.dimension || (skip && skip.has(z.id))) continue;
      const r = fieldCoreRect(z.field, z.size);
      if (r.x1 <= r.x0 || r.y1 <= r.y0) continue;
      const inside = (p: { x: number; y: number }): boolean => p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1;
      if (inside(a) || inside(b)) continue;
      // Proper-crossing via the sampled midpoint ladder is NOT the law —
      // reuse the real answer only through insideness + the indexed call
      // would be circular. Walk the rect edges exactly as segCrossesRect.
      const d = (u: { x: number; y: number }, v: { x: number; y: number }, p: { x: number; y: number }): number =>
        (v.x - u.x) * (p.y - u.y) - (v.y - u.y) * (p.x - u.x);
      const cross = (p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }, p4: { x: number; y: number }): boolean => {
        const d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4);
        return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
      };
      const c1 = { x: r.x0, y: r.y0 }, c2 = { x: r.x1, y: r.y0 }, c3 = { x: r.x1, y: r.y1 }, c4 = { x: r.x0, y: r.y1 };
      if (cross(a, b, c1, c2) || cross(a, b, c2, c3) || cross(a, b, c3, c4) || cross(a, b, c4, c1)) return true;
    }
    return false;
  };
  const naiveInside = (pt: { x: number; y: number }, zm: Record<string, ZoneDef>, skipId?: string): boolean => {
    for (const z of Object.values(zm)) {
      if (!z.field || z.dimension || z.id === skipId) continue;
      const r = fieldCoreRect(z.field, z.size);
      if (pt.x >= r.x0 && pt.x <= r.x1 && pt.y >= r.y0 && pt.y <= r.y1) return true;
    }
    return false;
  };

  // The grown chart may not have rolled an expanse this seed — plant a
  // synthetic one so the footprint pins always bite (count key re-derives
  // the roster; removed again below).
  const hadField = Object.values(w.zoneMap).some(z => z.field && !z.dimension);
  if (!hadField) {
    const zs = surface();
    const at = zs[Math.floor(zs.length / 2)].map;
    w.zoneMap['probe_scan_field'] = {
      ...zs[0],
      id: 'probe_scan_field', name: 'Probe Meadow', exits: [],
      map: { x: at.x + 60, y: at.y + 60 }, size: { w: 3200, h: 3200 }, dimension: undefined,
      field: { originX: at.x - 140, originY: at.y - 140, scale: 8, seed: 7, regionId: 'probe_scan_r', nodeW: 400, nodeH: 400 },
    };
  }

  // A deterministic probe sweep: chords of several lengths/angles from every
  // 7th zone, with/without skip sets, surface + a foreign dimension.
  const zs = surface();
  let chordN = 0, chordBad = 0, barsN = 0, barsBad = 0, insideN = 0, insideBad = 0;
  for (let i = 0; i < zs.length; i += 7) {
    const z = zs[i];
    for (const [dx, dy] of [[90, 0], [0, -90], [64, 64], [400, -130], [12, 5]] as const) {
      const a = { x: z.map.x + 11, y: z.map.y - 7 };
      const b = { x: a.x + dx, y: a.y + dy };
      for (const [dim, skip] of [
        [undefined, new Set([z.id])] as const,
        [undefined, new Set<string>()] as const,
        ['underworld', new Set([z.id])] as const,
      ]) {
        chordN++;
        if (chordClearsNodes(a, b, w.zoneMap, dim, skip) !== naiveChord(a, b, dim, skip)) chordBad++;
      }
      barsN++;
      if (footprintBars(a, b, w.zoneMap) !== naiveBars(a, b, w.zoneMap)) barsBad++;
      barsN++;
      const sk = new Set(['probe_scan_field']);
      if (footprintBars(a, b, w.zoneMap, sk) !== naiveBars(a, b, w.zoneMap, sk)) barsBad++;
      insideN++;
      if (insideFieldFootprint(a, w.zoneMap) !== naiveInside(a, w.zoneMap)) insideBad++;
    }
  }
  // …and chords aimed square at the field rect (the crossing lane must fire).
  const f = Object.values(w.zoneMap).find(z => z.field && !z.dimension)!;
  const r = fieldCoreRect(f.field!, f.size);
  const mid = { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 };
  const far = { l: { x: r.x0 - 300, y: mid.y }, r: { x: r.x1 + 300, y: mid.y } };
  barsN += 2;
  if (footprintBars(far.l, far.r, w.zoneMap) !== naiveBars(far.l, far.r, w.zoneMap)) barsBad++;
  if (footprintBars(far.l, mid, w.zoneMap) !== naiveBars(far.l, mid, w.zoneMap)) barsBad++;
  const crossFires = footprintBars(far.l, far.r, w.zoneMap) && !footprintBars(far.l, mid, w.zoneMap);
  insideN += 1;
  if (insideFieldFootprint(mid, w.zoneMap) !== naiveInside(mid, w.zoneMap)) insideBad++;
  const insideFires = insideFieldFootprint(mid, w.zoneMap);

  check('D: chordClearsNodes ≡ naive walk at chart scale', chordBad === 0, `${chordBad}/${chordN} diverged`);
  check('D: footprintBars ≡ naive walk (incl. the crossing + skip lanes)', barsBad === 0 && crossFires,
    `${barsBad}/${barsN} diverged; cross-chord barred=${crossFires}`);
  check('D: insideFieldFootprint ≡ naive walk (incl. the interior)', insideBad === 0 && insideFires,
    `${insideBad}/${insideN} diverged; interior hit=${insideFires}`);

  // THE RELOCATION CONTRACT: move a node by hand + pokeWeb (the documented
  // lane for movers outside placeZoneAt/settleWeb) — the lattice must
  // re-derive and agree with the naive walk on the moved chart, including a
  // chord the OLD position would have answered differently.
  const mover = zs.find(z => settleMovable(z) && !z.field)!;
  const before = { x: mover.map.x, y: mover.map.y };
  // Find a probe chord in genuinely EMPTY country (clear pre-move), so the
  // pin demonstrates the FLIP: clear → barred the instant the mover parks on
  // it under the pokeWeb contract. Deterministic outward scan.
  let a2 = { x: before.x, y: before.y }, b2 = a2, preMove = false;
  for (let step = 1; step <= 40 && !preMove; step++) {
    a2 = { x: before.x + 300 + step * 97, y: before.y + 1 + step * 31 };
    b2 = { x: a2.x + 90, y: a2.y };
    preMove = chordClearsNodes(a2, b2, w.zoneMap, undefined, new Set<string>());
  }
  mover.map.x = a2.x + 45; mover.map.y = a2.y; // park ON the probe chord
  pokeWeb();
  const postMove = chordClearsNodes(a2, b2, w.zoneMap, undefined, new Set<string>());
  const postNaive = naiveChord(a2, b2, undefined, new Set<string>());
  check('D: pokeWeb re-derives the lattice (moved node flips a clear chord)',
    preMove && postMove === postNaive && postMove === false,
    `pre=${preMove} post=${postMove} naive=${postNaive}`);
  mover.map.x = before.x; mover.map.y = before.y;
  pokeWeb();

  // THE TEMP-MAP LANE (severFootprintCrossers' lone map): a fresh one-entry
  // record answers for ITS zone only, and the main map's next answer is
  // untouched (identity keying — no cross-poisoning).
  const lone = { [f.id]: f } as Record<string, ZoneDef>;
  const loneBars = footprintBars(far.l, far.r, lone);
  const mainAgain = footprintBars(far.l, far.r, w.zoneMap) === naiveBars(far.l, far.r, w.zoneMap);
  check('D: a temp lone-map serves and never poisons the main memo',
    loneBars === naiveBars(far.l, far.r, lone) && mainAgain,
    `lone=${loneBars} mainAgree=${mainAgain}`);

  if (!hadField) delete w.zoneMap['probe_scan_field'];
}

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'} — ${pass} pass / ${fail} fail`);
if (fail > 0) process.exit(2);
