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
//
// Run: npx tsx balance/probe_webperf.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import type { ZoneDef } from '../src/data/zones';
import { HUB_ZONE } from '../src/data/zones';
import { WEB_CFG, settleWeb, settleMovable, webDisturbance, pokeWeb } from '../src/engine/worldgen';
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

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'} — ${pass} pass / ${fail} fail`);
if (fail > 0) process.exit(2);
