/** Harness-only sequence-service observations: no sockets, world, timers or RNG.
 * Run: node --import tsx balance/probe_shardresponsiveness.ts
 * The reference retains raw samples and searches future snapshots offline; it
 * does not use the meter's pending ring, histogram or lifecycle implementation.
 * A covering sequence proves service through a received snapshot, not a
 * successful action, network-only RTT, snapshot wire ack, or input-to-paint. */
import assert from 'node:assert/strict';
import { SOAK_RESPONSE_LIMITS, SoakResponsiveness, type ResponseBoundary, type ResponseDistribution, type SoakResponseReport } from './soakResponsiveness';

let checks = 0;
function eq(actual: unknown, expected: unknown, name: string): void {
  assert.deepEqual(actual, expected, name); checks++;
}
function conservation(r: SoakResponseReport): void {
  eq(r.counts.tracked, r.counts.covered + r.counts.censored + r.pending, 'every tracked input has exactly one disposition');
  eq(r.counts.sent, r.counts.tracked + r.counts.ringOverflow, 'overflow is never silently discarded');
  eq(r.serviceRtt.count, r.counts.covered, 'only covered inputs enter RTT');
  eq(r.censoredAge.count, r.counts.censored, 'censored ages stay separate');
}
function expectedDistribution(raw: readonly number[]): ResponseDistribution {
  const sorted = [...raw].sort((a, b) => a - b);
  const upper = (p: number): number | null => {
    if (!sorted.length) return null;
    const n = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
    if (n > 60000) return null;
    return Math.ceil(n / (n <= 1000 ? 1 : n <= 10000 ? 10 : 100)) * (n <= 1000 ? 1 : n <= 10000 ? 10 : 100);
  };
  return { count: raw.length, meanMs: raw.length ? raw.reduce((a, b) => a + b, 0) / raw.length : null,
    maxMs: raw.length ? sorted[sorted.length - 1] : null,
    p50UpperMs: upper(.5), p95UpperMs: upper(.95), p99UpperMs: upper(.99),
    over100Ms: raw.filter(n => n > 100).length, over250Ms: raw.filter(n => n > 250).length,
    over1000Ms: raw.filter(n => n > 1000).length, over60000Ms: raw.filter(n => n > 60000).length };
}

// Coalescing covers each sent sequence once; duplicate snapshots do not create
// extra successful samples, and receive gaps differ from advancing-tick gaps.
{
  const m = new SoakResponsiveness(); m.beginEpoch(0);
  m.sent(1, 10); m.sent(2, 20); m.sent(3, 30);
  m.snapshot(1, 2, 'a', 35); m.snapshot(1, 2, 'a', 40);
  m.snapshot(2, 3, 'a', 80); m.snapshot(3, 3, 'a', 180); m.finish(250);
  const r = m.report(); conservation(r);
  eq(r.serviceRtt, expectedDistribution([25, 15, 50]), 'merged sequence coverage');
  eq(r.snapshotInterarrival, expectedDistribution([5, 40, 100]), 'every receive gap');
  eq(r.advancingSnapshotInterarrival, expectedDistribution([45, 100]), 'only advancing tick gaps');
  eq(r.unfinishedSnapshotSilence, expectedDistribution([70]), 'last unfinished receive silence retained');
  eq([r.counts.duplicateSnapshots, r.counts.coverageSnapshots, r.maxPendingAgeMs, r.maxSnapshotSilenceMs], [1, 2, 50, 100], 'duplicates, coverage and worst gaps');
  eq([r.finished, r.status], [true, 'complete observations'], 'finished complete meter');
  const frozenReport = m.report(); m.sent(4, 300); m.snapshot(4, 4, 'a', 400); m.beginEpoch(500); m.sendFailed(); m.finish(600);
  eq(m.report(), frozenReport, 'observations frozen at the end boundary');
}

// Raw-cut/resume reuses sequence numbers but cannot inherit an old pending
// sample. A stale high ack after reconnect is counted, never called a success.
{
  const m = new SoakResponsiveness(); m.beginEpoch(0);
  m.sent(1, 1); m.sent(2, 3); m.snapshot(1, 1, 'a', 10); m.sent(3, 12);
  m.endEpoch('raw-cut', 30); m.beginEpoch(50); m.sent(1, 51);
  m.snapshot(1, 3, 'a', 55); m.snapshot(2, 1, 'a', 60); m.finish(70);
  const r = m.report(); conservation(r);
  eq(r.serviceRtt, expectedDistribution([9, 9]), 'fresh epoch only acknowledges fresh samples');
  eq(r.censoredAge, expectedDistribution([27, 18]), 'cut ages are lower bounds');
  eq(r.censoredByReason, { 'raw-cut': 2 }, 'cut reason retained');
  eq([r.counts.epochs, r.counts.unmatchedAcks], [2, 1], 'epoch reset and stale echo recorded');
}

// Censoring and overflow cannot improve the reported successful RTT. The
// oldest slow inputs remain in the ring when its bounded capacity is exceeded.
{
  const m = new SoakResponsiveness(2); m.beginEpoch(0);
  m.sent(1, 10); m.sent(2, 20); m.sent(3, 30);
  eq([m.report().pending, m.report().oldestPendingAgeMs, m.report().status], [2, 20, 'incomplete observations'], 'unfinished observations and oldest pending');
  m.snapshot(1, 3, 'a', 300); m.sent(4, 310); m.finish(1310);
  const r = m.report(); conservation(r);
  eq(r.serviceRtt, expectedDistribution([290, 280]), 'overflow retains oldest inputs');
  eq([r.counts.ringOverflow, r.pending, r.pendingAtFinish, r.status], [1, 0, 1, 'incomplete observations'], 'overflow and end-pending visible');
  eq(r.censoredAge, expectedDistribution([1000]), 'end-pending is not a successful RTT');
  eq(r.censoredByReason, { end: 1 }, 'end-censored disposition');
}
{
  const m = new SoakResponsiveness(); m.beginEpoch(0); m.sent(0, 1); m.snapshot(1, undefined, 'a', 5);
  m.snapshot(1, undefined, 'b', 10); // moving zone censors the old authority's input
  m.sent(1, 11); m.endEpoch('death', 20); m.snapshot(4, 1, 'b', 22);
  m.beginEpoch(30); m.sent(2, 31); m.beginEpoch(40); m.sent(3, 41); m.finish(50);
  const r = m.report(); conservation(r);
  eq(r.censoredByReason, { 'zone-change': 1, death: 1, 'epoch-replaced': 1, end: 1 }, 'every lifecycle boundary keeps censor reasons');
  eq(r.serviceRtt.count, 0, 'no invented successful sample across lifecycle boundaries');
  eq([r.counts.epochs, r.counts.inactiveSnapshots, r.counts.missingAcks, r.pendingAtFinish], [4, 1, 2, 1], 'lifecycle, missing ack and pending counters');
}

// An independent raw-sample oracle searches the first future same-epoch
// snapshot for each input. It also obtains gaps directly from adjacent rows.
{
  const m = new SoakResponsiveness(16), service: number[] = [], censored: number[] = [], gaps: number[] = [];
  const advance: number[] = [], unfinished: number[] = [];
  for (let epoch = 0; epoch < 32; epoch++) {
    const start = epoch * 1000, end = start + 150;
    const sends = Array.from({ length: 12 }, (_, i) => ({ seq: i + 1, at: start + i * 10 + .125 }));
    const snaps = [2, 5, 8].map((i, j) => ({ tick: j + 1, ack: i + 1, at: start + i * 10 + 7.5 }));
    const tape = [...sends.map(s => ({ at: s.at, run: () => m.sent(s.seq, s.at) })),
      ...snaps.map(s => ({ at: s.at, run: () => m.snapshot(s.tick, s.ack, `zone${epoch}`, s.at) }))].sort((a, b) => a.at - b.at);
    m.beginEpoch(start); for (const e of tape) e.run();
    m.endEpoch(epoch % 2 ? 'death' : 'raw-cut', end);
    for (const s of sends) {
      const covering = snaps.find(a => a.at >= s.at && a.ack >= s.seq);
      if (covering) service.push(covering.at - s.at); else censored.push(end - s.at);
    }
    for (let i = 1; i < snaps.length; i++) { gaps.push(snaps[i].at - snaps[i - 1].at); advance.push(snaps[i].at - snaps[i - 1].at); }
    unfinished.push(end - snaps[snaps.length - 1].at);
    conservation(m.report());
  }
  m.finish(32000); const r = m.report(); conservation(r);
  eq(r.serviceRtt, expectedDistribution(service), 'offline future-snapshot service oracle');
  eq(r.censoredAge, expectedDistribution(censored), 'offline unserved-input age oracle');
  eq(r.snapshotInterarrival, expectedDistribution(gaps), 'offline receive-gap oracle');
  eq(r.advancingSnapshotInterarrival, expectedDistribution(advance), 'offline advancing-gap oracle');
  eq(r.unfinishedSnapshotSilence, expectedDistribution(unfinished), 'offline unfinished-silence oracle');
  eq([r.counts.sent, r.counts.covered, r.counts.censored, r.counts.epochs], [384, 288, 96, 32], 'whole tape census');
}

// Thresholds are strict tails, and quantiles are explicitly upper bounds; a
// >60s tail has no finite histogram upper bound, while its exact max survives.
{
  const values = [0, .125, 1, 100, 100.125, 250, 250.125, 1000, 1000.125, 10000, 10000.125, 60000, 60000.125];
  const meters = values.map(ms => { const m = new SoakResponsiveness(); m.beginEpoch(0); m.sent(1, 0); m.snapshot(1, 1, 'a', ms); m.finish(ms); return m; });
  const r = SoakResponsiveness.aggregate(meters); conservation(r);
  eq(r.serviceRtt, expectedDistribution(values), 'pooled raw-value histogram oracle');
  eq([r.serviceRtt.p95UpperMs, r.serviceRtt.over60000Ms, r.serviceRtt.maxMs], [null, 1, 60000.125], 'unbounded tail is visibly unbounded');
  const many = new SoakResponsiveness(); many.beginEpoch(0);
  for (let i = 1; i <= 100; i++) { many.sent(i, i * 10); many.snapshot(i, i, 'b', i * 10 + 1); }
  many.finish(1002);
  const pooled = SoakResponsiveness.aggregate([many, meters[meters.length - 1]]);
  eq(pooled.serviceRtt, expectedDistribution([...Array<number>(100).fill(1), 60000.125]), 'aggregate quantiles use sample weights, not bot percentile averages');
}

// Broken observations stay visible instead of being converted to valid RTT.
{
  const m = new SoakResponsiveness(); m.sent(1, 0); m.beginEpoch(1);
  m.sent(undefined, 2); m.sent(-1, 3); m.sent(1, 4); m.sent(1, 5);
  m.snapshot(NaN, 1, 'a', 6); m.snapshot(2, NaN, 'a', 7);
  m.snapshot(1, 1, 'a', 8); m.snapshot(3, 1, 'a', 9);
  m.snapshot(4, 0, 'a', 10); m.snapshot(5, undefined, 'a', 11);
  m.snapshot(6, 4, 'a', 12); m.sent(2, NaN); m.sent(2, 11); m.sendFailed(); m.finish(15);
  const r = m.report(); conservation(r);
  eq(r.status, 'incomplete observations', 'errors cannot report complete observations');
  eq([r.counts.inactiveSends, r.counts.invalidSequences, r.counts.nonIncreasingSends, r.counts.invalidSnapshotTicks,
    r.counts.invalidAcks, r.counts.backwardsSnapshotTicks, r.counts.regressingAcks, r.counts.missingAcks,
    r.counts.unmatchedAcks, r.counts.invalidClocks, r.counts.sendFailures], [1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1], 'error counters exact');
  eq(r.serviceRtt, expectedDistribution([5]), 'invalid observations do not acknowledge pending input');
}
{
  const empty = SoakResponsiveness.aggregate([]);
  eq([empty.finished, empty.status, empty.serviceRtt.count, empty.serviceRtt.p95UpperMs], [false, 'incomplete observations', 0, null], 'no meters is not completed evidence');
  const stalled = new SoakResponsiveness(); stalled.beginEpoch(0); stalled.sent(1, 1); stalled.finish(10001);
  eq([stalled.report().maxSnapshotSilenceMs, stalled.report().pendingAtFinish], [10001, 1], 'complete snapshot silence and unserved input survive end');
  eq(stalled.report().censoredAge, expectedDistribution([10000]), 'no-snapshot input is censored, not discarded');
  for (const capacity of [0, -1, 1.5, NaN, SOAK_RESPONSE_LIMITS.pendingPerBot + 1]) {
    assert.throws(() => new SoakResponsiveness(capacity), /Invalid responsiveness ring capacity/); checks++;
  }
  // Every exposed boundary retains its own count rather than merging failures.
  const boundaries: ResponseBoundary[] = ['death', 'new-run', 'raw-cut', 'resume', 'host-lost', 'zone-change', 'end', 'epoch-replaced'];
  const m = new SoakResponsiveness();
  for (let i = 0; i < boundaries.length; i++) { m.beginEpoch(i * 10); m.sent(1, i * 10 + 1); m.endEpoch(boundaries[i], i * 10 + 2); }
  m.finish(100);
  eq(m.report().censoredByReason, Object.fromEntries(boundaries.map(reason => [reason, 1])), 'all boundary dispositions retained');
  conservation(m.report());
}

console.log(`PASS shardresponsiveness: ${checks} assertions; offline raw-sample oracle, merged sequences, epochs/censoring, bounded overflow, pooled quantiles, snapshot gaps and errors.`);
