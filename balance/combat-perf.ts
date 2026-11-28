// ---------------------------------------------------------------------------
// HEADLESS COMBAT & SWARM FORENSICS CLI (`npm run perf:sim`)
//
// Runs the deterministic high-density combat stress suite in Node with V8 GC
// observation (`--expose-gc`), recording per-scenario tick percentiles/max,
// 8 simulation sub-slabs, StatSheet cache hit/miss ratios, context-tag Set
// allocations, raycast counts, heap allocation deltas, GC pause telemetry,
// and bit-exact state + RNG fingerprints.
//
// Usage:
//   npm run perf:sim -- --label=baseline
//   npm run perf:sim -- --label=after --compare=baseline
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { PerformanceObserver } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import v8 from 'node:v8';
import {
  runCombatStressHeadless,
  type CombatStressReport,
  type CombatStressRow,
} from '../src/dev/combatStress';
import { SIM_SLAB_NAMES, type SimSlabId } from '../src/engine/perfSlabs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = path.join(__dirname, 'reports');

function flag(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

interface HeapForensics {
  gcExposed: boolean;
  heapBeforeKB: number;
  heapAfterRawKB: number;
  heapAfterGcKB: number;
  rawDeltaKB: number;
  retainedDeltaKB: number;
  rawBytesPerTick: number;
  gcCount: number;
  gcPauseTotalMs: number;
  gcPauseMaxMs: number;
}

interface SimForensicsFile {
  generatedAt: string;
  label: string;
  nodeVersion: string;
  warmupTicks: number;
  measureTicks: number;
  scenarios: (CombatStressRow & { heap: HeapForensics })[];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pctDelta(before: number, after: number): string {
  if (before === 0) return after === 0 ? '0.0%' : 'n/a';
  const d = ((after - before) / before) * 100;
  return `${d >= 0 ? '+' : ''}${d.toFixed(1)}%`;
}

function formatMarkdown(data: SimForensicsFile, baseline?: SimForensicsFile): string {
  const lines: string[] = [];
  lines.push(`# Combat & Swarm Sim Forensics — \`${data.label}\``);
  lines.push('');
  lines.push(`- Generated: ${data.generatedAt}`);
  lines.push(`- Runtime: Node ${data.nodeVersion} (warmup ${data.warmupTicks} ticks, measured ${data.measureTicks} ticks @ 60Hz)`);
  lines.push('');
  lines.push('## Scenario Headline Summary');
  lines.push('');
  lines.push('| Scenario | Tick mean (ms) | Tick p50 | Tick p95 | Tick p99 | Tick max | Stat Hit% | Uncached Walks | Tag Allocs | Rays (world/grid) | Heap Δ KB | GC (n / ms) | Hash |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|');
  for (const s of data.scenarios) {
    const c = s.slabs.counters;
    const h = s.heap;
    lines.push(
      `| \`${s.id}\` | ${s.slabs.simTotal.mean.toFixed(3)} | ${s.slabs.simTotal.p50.toFixed(3)} | ${s.slabs.simTotal.p95.toFixed(3)} | ${s.slabs.simTotal.p99.toFixed(3)} | ${s.slabs.simTotal.max.toFixed(3)} | ${c.statHitRatePct.toFixed(1)}% | ${c.statUncachedWalks} | ${c.contextTagAllocs} | ${c.raysCast}/${c.gridRaysCast} | ${h.rawDeltaKB.toFixed(0)} | ${h.gcCount} / ${h.gcPauseTotalMs.toFixed(2)} | \`${s.fingerprint.hashHex}\` |`,
    );
  }
  lines.push('');
  lines.push('## Simulation Slab Breakdown (mean ms / tick)');
  lines.push('');
  lines.push(`| Scenario | ${SIM_SLAB_NAMES.map(n => `\`${n}\``).join(' | ')} | Entities (act/proj/zone/lite) |`);
  lines.push(`|---|${SIM_SLAB_NAMES.map(() => '---:').join('|')}|---:|`);
  for (const s of data.scenarios) {
    const e = s.slabs.entities;
    const cols = SIM_SLAB_NAMES.map((k: SimSlabId) => s.slabs.simSlabs[k].mean.toFixed(3)).join(' | ');
    lines.push(`| \`${s.id}\` | ${cols} | ${e.actorsMean}/${e.projectilesMean}/${e.zonesMean}/${e.liteMean} |`);
  }

  if (baseline) {
    lines.push('');
    lines.push(`## Comparison vs \`${baseline.label}\``);
    lines.push('');
    lines.push('| Scenario | Parity | Tick mean (before → after) | Tick p99 (before → after) | Uncached Walks | Tag Allocs | GC ms |');
    lines.push('|---|---|---:|---:|---:|---:|---:|');
    for (const s of data.scenarios) {
      const b = baseline.scenarios.find(x => x.id === s.id);
      if (!b) continue;
      const match = b.fingerprint.hashHex === s.fingerprint.hashHex && b.fingerprint.nextRngU32 === s.fingerprint.nextRngU32;
      lines.push(
        `| \`${s.id}\` | ${match ? 'PASS (`' + s.fingerprint.hashHex + '`)' : 'DRIFT (`' + b.fingerprint.hashHex + '` -> `' + s.fingerprint.hashHex + '`)'} | ${b.slabs.simTotal.mean.toFixed(3)} → ${s.slabs.simTotal.mean.toFixed(3)} (${pctDelta(b.slabs.simTotal.mean, s.slabs.simTotal.mean)}) | ${b.slabs.simTotal.p99.toFixed(3)} → ${s.slabs.simTotal.p99.toFixed(3)} (${pctDelta(b.slabs.simTotal.p99, s.slabs.simTotal.p99)}) | ${b.slabs.counters.statUncachedWalks} → ${s.slabs.counters.statUncachedWalks} (${pctDelta(b.slabs.counters.statUncachedWalks, s.slabs.counters.statUncachedWalks)}) | ${b.slabs.counters.contextTagAllocs} → ${s.slabs.counters.contextTagAllocs} (${pctDelta(b.slabs.counters.contextTagAllocs, s.slabs.counters.contextTagAllocs)}) | ${b.heap.gcPauseTotalMs.toFixed(2)} → ${s.heap.gcPauseTotalMs.toFixed(2)} |`,
      );
    }
  }
  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const label = flag('label', 'current').replace(/[^a-z0-9_-]/gi, '');
  const compareLabel = flag('compare', '').replace(/[^a-z0-9_-]/gi, '');
  const filter = flag('filter', '');
  const warmupTicks = Math.max(0, Number(flag('warmup', '120')));
  const measureTicks = Math.max(30, Number(flag('ticks', '360')));
  const repeats = Math.max(1, Number(flag('repeats', '1')));

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const gcFn = (globalThis as unknown as { gc?: () => void }).gc;

  let gcCount = 0;
  let gcPauseTotalMs = 0;
  let gcPauseMaxMs = 0;
  let observingGc = false;

  const gcObs = new PerformanceObserver(list => {
    if (!observingGc) return;
    for (const entry of list.getEntries()) {
      gcCount++;
      gcPauseTotalMs += entry.duration;
      if (entry.duration > gcPauseMaxMs) gcPauseMaxMs = entry.duration;
    }
  });
  gcObs.observe({ entryTypes: ['gc'] });

  let heapBefore = 0;
  const heapByScenario = new Map<string, HeapForensics>();
  const passReports: CombatStressReport[] = [];

  for (let pass = 0; pass < repeats; pass++) {
    const rep = await runCombatStressHeadless({
      filter,
      warmupTicks,
      measureTicks,
      beforeMeasure: () => {
        observingGc = false;
        gcFn?.();
        gcFn?.();
        gcCount = 0;
        gcPauseTotalMs = 0;
        gcPauseMaxMs = 0;
        heapBefore = v8.getHeapStatistics().used_heap_size;
        observingGc = true;
      },
      afterMeasure: (_id, ticks) => {
        observingGc = false;
        const heapAfterRaw = v8.getHeapStatistics().used_heap_size;
        const snapGcCount = gcCount;
        const snapGcTotal = gcPauseTotalMs;
        const snapGcMax = gcPauseMaxMs;
        gcFn?.();
        const heapAfterGc = v8.getHeapStatistics().used_heap_size;
        const rawDelta = heapAfterRaw - heapBefore;
        const hf: HeapForensics = {
          gcExposed: typeof gcFn === 'function',
          heapBeforeKB: round2(heapBefore / 1024),
          heapAfterRawKB: round2(heapAfterRaw / 1024),
          heapAfterGcKB: round2(heapAfterGc / 1024),
          rawDeltaKB: round2(rawDelta / 1024),
          retainedDeltaKB: round2((heapAfterGc - heapBefore) / 1024),
          rawBytesPerTick: Math.round(rawDelta / Math.max(1, ticks)),
          gcCount: snapGcCount,
          gcPauseTotalMs: round2(snapGcTotal),
          gcPauseMaxMs: round2(snapGcMax),
        };
        heapByScenario.set(`${pass}:${_id}`, hf);
        return { heap: hf };
      },
    });
    passReports.push(rep);
  }

  gcObs.disconnect();

  // Select the median-simTotal-mean pass per scenario when repeats > 1, and assert determinism across passes!
  const first = passReports[0];
  const mergedScenarios: (CombatStressRow & { heap: HeapForensics })[] = [];

  for (let si = 0; si < first.scenarios.length; si++) {
    const id = first.scenarios[si].id;
    const baseFp = first.scenarios[si].fingerprint;
    const candidates = passReports.map((r, pIdx) => ({
      row: r.scenarios[si],
      heap: heapByScenario.get(`${pIdx}:${id}`)!,
    }));
    for (let pIdx = 1; pIdx < candidates.length; pIdx++) {
      const fp = candidates[pIdx].row.fingerprint;
      if (fp.hashHex !== baseFp.hashHex || fp.nextRngU32 !== baseFp.nextRngU32) {
        throw new Error(`Determinism failure across repeats on '${id}': ${baseFp.hashHex} vs ${fp.hashHex}`);
      }
    }
    candidates.sort((a, b) => a.row.slabs.simTotal.mean - b.row.slabs.simTotal.mean);
    const chosen = candidates[Math.floor(candidates.length / 2)];
    if (chosen.row.buildWarnings.length > 0) {
      console.warn(`[warn] ${id} build warnings:`, chosen.row.buildWarnings);
    }
    mergedScenarios.push({ ...chosen.row, heap: chosen.heap });
  }

  const out: SimForensicsFile = {
    generatedAt: new Date().toISOString(),
    label,
    nodeVersion: process.version,
    warmupTicks,
    measureTicks,
    scenarios: mergedScenarios,
  };

  let baseline: SimForensicsFile | undefined;
  let parityFailed = false;
  if (compareLabel) {
    const basePath = path.join(REPORTS_DIR, `combat-sim-${compareLabel}.json`);
    if (fs.existsSync(basePath)) {
      baseline = JSON.parse(fs.readFileSync(basePath, 'utf8')) as SimForensicsFile;
      for (const s of out.scenarios) {
        const b = baseline.scenarios.find(x => x.id === s.id);
        if (b && (b.fingerprint.hashHex !== s.fingerprint.hashHex || b.fingerprint.nextRngU32 !== s.fingerprint.nextRngU32)) {
          parityFailed = true;
        }
      }
    } else {
      console.warn(`[warn] --compare=${compareLabel} file not found at ${basePath}`);
    }
  }

  const jsonPath = path.join(REPORTS_DIR, `combat-sim-${label}.json`);
  const mdPath = path.join(REPORTS_DIR, `combat-sim-${label}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(out, null, 2));
  const md = formatMarkdown(out, baseline);
  fs.writeFileSync(mdPath, md);

  console.log(md);
  console.log(`Saved: ${jsonPath}`);
  console.log(`Saved: ${mdPath}`);

  if (parityFailed) {
    console.error(`ERROR: Deterministic fingerprint drift detected vs '${compareLabel}'!`);
    process.exit(2);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
