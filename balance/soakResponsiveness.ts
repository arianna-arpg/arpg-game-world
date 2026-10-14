/** Harness-only observations. A covered input sequence is not proof that a
 * move/cast succeeded: the host also acknowledges blocked and dead seats. */
export const SOAK_RESPONSE_LIMITS = {
  pendingPerBot: 4096,
  histogramBins: 2402,
  percentileResolution: 'Upper bounds: 1 ms through 1000 ms, 10 ms through 10000 ms, 100 ms through 60000 ms; null above 60000 ms or when count is zero.',
} as const;

export type ResponseBoundary = 'death' | 'new-run' | 'raw-cut' | 'resume' | 'host-lost' | 'zone-change' | 'end' | 'epoch-replaced';
export interface ResponseDistribution {
  count: number; meanMs: number | null; maxMs: number | null;
  p50UpperMs: number | null; p95UpperMs: number | null; p99UpperMs: number | null;
  over100Ms: number; over250Ms: number; over1000Ms: number; over60000Ms: number;
}

class Distribution {
  readonly bins = new Float64Array(SOAK_RESPONSE_LIMITS.histogramBins);
  count = 0; sum = 0; max = 0; over100 = 0; over250 = 0; over1000 = 0;
  add(ms: number): void {
    const bin = ms <= 1000 ? Math.ceil(ms) : ms <= 10000 ? 1000 + Math.ceil((ms - 1000) / 10)
      : ms <= 60000 ? 1900 + Math.ceil((ms - 10000) / 100) : 2401;
    this.bins[bin]++; this.count++; this.sum += ms; this.max = Math.max(this.max, ms);
    if (ms > 100) this.over100++; if (ms > 250) this.over250++; if (ms > 1000) this.over1000++;
  }
  merge(other: Distribution): void {
    for (let i = 0; i < this.bins.length; i++) this.bins[i] += other.bins[i];
    this.count += other.count; this.sum += other.sum; this.max = Math.max(this.max, other.max);
    this.over100 += other.over100; this.over250 += other.over250; this.over1000 += other.over1000;
  }
  report(): ResponseDistribution {
    const percentile = (p: number): number | null => {
      if (!this.count) return null;
      const rank = Math.min(this.count - 1, Math.floor(this.count * p)) + 1;
      let seen = 0;
      for (let i = 0; i < this.bins.length; i++) if ((seen += this.bins[i]) >= rank)
        return i <= 1000 ? i : i <= 1900 ? 1000 + (i - 1000) * 10 : i <= 2400 ? 10000 + (i - 1900) * 100 : null;
      return null;
    };
    return { count: this.count, meanMs: this.count ? this.sum / this.count : null, maxMs: this.count ? this.max : null,
      p50UpperMs: percentile(.5), p95UpperMs: percentile(.95), p99UpperMs: percentile(.99),
      over100Ms: this.over100, over250Ms: this.over250, over1000Ms: this.over1000, over60000Ms: this.bins[2401] };
  }
}

const counts = () => ({ epochs: 0, sent: 0, tracked: 0, covered: 0, censored: 0, ringOverflow: 0,
  sendFailures: 0, invalidClocks: 0, invalidSequences: 0, nonIncreasingSends: 0, invalidSnapshotTicks: 0,
  backwardsSnapshotTicks: 0, invalidAcks: 0, regressingAcks: 0, unmatchedAcks: 0, missingAcks: 0,
  snapshots: 0, duplicateSnapshots: 0, coverageSnapshots: 0, inactiveSnapshots: 0, inactiveSends: 0 });
export interface SoakResponseReport {
  status: 'complete observations' | 'incomplete observations';
  counts: ReturnType<typeof counts>;
  pending: number; pendingAtFinish: number; oldestPendingAgeMs: number; maxPendingAgeMs: number;
  maxSnapshotSilenceMs: number; finished: boolean;
  censoredByReason: Partial<Record<ResponseBoundary, number>>;
  serviceRtt: ResponseDistribution; censoredAge: ResponseDistribution;
  snapshotInterarrival: ResponseDistribution; advancingSnapshotInterarrival: ResponseDistribution;
  unfinishedSnapshotSilence: ResponseDistribution;
}

/** Fixed-size pending ring and fixed-size histograms; no raw sample history.
 * Callers supply one client's monotonic clock. Lifecycle boundaries censor
 * unfinished observations, never turn them into successful low latencies. */
export class SoakResponsiveness {
  private readonly seqs: Float64Array;
  private readonly sentAt: Float64Array;
  private head = 0; private size = 0; private active = false; private done = false;
  private lastTime = -Infinity; private epochAt = 0;
  private lastSent: number | undefined; private lastAck: number | undefined;
  private lastSnapshot: number | undefined; private lastAdvance: number | undefined; private lastTick: number | undefined;
  private zone: string | undefined;
  private readonly counters = counts();
  private readonly reasons: Partial<Record<ResponseBoundary, number>> = {};
  private readonly rtt = new Distribution(); private readonly censoredAge = new Distribution();
  private readonly gaps = new Distribution(); private readonly advanceGaps = new Distribution();
  private readonly unfinishedGaps = new Distribution();
  private pendingAtFinish = 0; private maxPendingAge = 0; private maxSilence = 0;

  constructor(private readonly capacity: number = SOAK_RESPONSE_LIMITS.pendingPerBot) {
    if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > SOAK_RESPONSE_LIMITS.pendingPerBot)
      throw Error('Invalid responsiveness ring capacity');
    this.seqs = new Float64Array(capacity); this.sentAt = new Float64Array(capacity);
  }
  private time(now: number): boolean {
    if (!Number.isFinite(now) || now < this.lastTime) { this.counters.invalidClocks++; return false; }
    this.lastTime = now;
    if (this.size) this.maxPendingAge = Math.max(this.maxPendingAge, now - this.sentAt[this.head]);
    if (this.active) this.maxSilence = Math.max(this.maxSilence, now - (this.lastSnapshot ?? this.epochAt));
    return true;
  }
  beginEpoch(now: number): void {
    if (this.done || !this.time(now)) return;
    if (this.active) this.close('epoch-replaced', now);
    this.active = true; this.epochAt = now; this.counters.epochs++;
    this.lastSent = this.lastAck = this.lastSnapshot = this.lastAdvance = this.lastTick = undefined; this.zone = undefined;
  }
  private close(reason: ResponseBoundary, now: number): void {
    if (!this.active) return;
    this.unfinishedGaps.add(now - (this.lastSnapshot ?? this.epochAt));
    while (this.size) {
      this.censoredAge.add(now - this.sentAt[this.head]); this.head = (this.head + 1) % this.capacity; this.size--;
      this.counters.censored++; this.reasons[reason] = (this.reasons[reason] ?? 0) + 1;
    }
    this.active = false;
  }
  endEpoch(reason: ResponseBoundary, now: number): void {
    if (!this.done && this.time(now)) this.close(reason, now);
  }
  sent(seq: number | undefined, now: number): void {
    if (this.done || !this.time(now)) return;
    if (!this.active) { this.counters.inactiveSends++; return; }
    if (!Number.isSafeInteger(seq) || seq! < 0) { this.counters.invalidSequences++; return; }
    if (this.lastSent !== undefined && seq! <= this.lastSent) { this.counters.nonIncreasingSends++; return; }
    this.counters.sent++; this.lastSent = seq;
    // Retain the oldest pending evidence when full; never evict a slow input.
    if (this.size === this.capacity) { this.counters.ringOverflow++; return; }
    const at = (this.head + this.size) % this.capacity;
    this.seqs[at] = seq!; this.sentAt[at] = now; this.size++; this.counters.tracked++;
  }
  sendFailed(): void { if (!this.done) this.counters.sendFailures++; }
  snapshot(tick: number, ack: number | undefined, zone: string, now: number): void {
    if (this.done || !this.time(now)) return;
    if (!this.active) { this.counters.inactiveSnapshots++; return; }
    if (this.zone !== undefined && zone !== this.zone) { this.close('zone-change', now); this.beginEpoch(now); }
    this.zone = zone; this.counters.snapshots++;
    if (this.lastSnapshot !== undefined) this.gaps.add(now - this.lastSnapshot);
    this.lastSnapshot = now;
    if (!Number.isSafeInteger(tick) || tick < 0) { this.counters.invalidSnapshotTicks++; return; }
    if (this.lastTick !== undefined && tick < this.lastTick) { this.counters.backwardsSnapshotTicks++; return; }
    if (tick === this.lastTick) this.counters.duplicateSnapshots++;
    else { if (this.lastAdvance !== undefined) this.advanceGaps.add(now - this.lastAdvance); this.lastAdvance = now; this.lastTick = tick; }
    if (ack === undefined) { this.counters.missingAcks++; return; }
    if (!Number.isSafeInteger(ack) || ack < 0) { this.counters.invalidAcks++; return; }
    // An old-life echo or a snapshot before the first send cannot acknowledge
    // this epoch. A reconnect's reset sequence must never inherit old samples.
    if (this.lastSent === undefined || ack > this.lastSent) { this.counters.unmatchedAcks++; return; }
    if (this.lastAck !== undefined && ack < this.lastAck) { this.counters.regressingAcks++; return; }
    this.lastAck = ack; let covered = false;
    while (this.size && this.seqs[this.head] <= ack) {
      this.rtt.add(now - this.sentAt[this.head]); this.head = (this.head + 1) % this.capacity; this.size--;
      this.counters.covered++; covered = true;
    }
    if (covered) this.counters.coverageSnapshots++;
  }
  finish(now: number): void {
    if (this.done || !this.time(now)) return;
    this.pendingAtFinish = this.size; this.close('end', now); this.done = true;
  }
  report(): SoakResponseReport { return SoakResponsiveness.aggregate([this]); }
  static aggregate(meters: readonly SoakResponsiveness[]): SoakResponseReport {
    const total = counts(), reasons: Partial<Record<ResponseBoundary, number>> = {};
    const rtt = new Distribution(), censored = new Distribution(), gaps = new Distribution(), advancing = new Distribution(), unfinished = new Distribution();
    let pending = 0, atFinish = 0, oldest = 0, maxAge = 0, maxSilence = 0;
    for (const m of meters) {
      for (const key of Object.keys(total) as (keyof typeof total)[]) total[key] += m.counters[key];
      for (const key of Object.keys(m.reasons) as ResponseBoundary[]) reasons[key] = (reasons[key] ?? 0) + m.reasons[key]!;
      rtt.merge(m.rtt); censored.merge(m.censoredAge); gaps.merge(m.gaps); advancing.merge(m.advanceGaps); unfinished.merge(m.unfinishedGaps);
      pending += m.size; atFinish += m.pendingAtFinish; maxAge = Math.max(maxAge, m.maxPendingAge); maxSilence = Math.max(maxSilence, m.maxSilence);
      if (m.size) oldest = Math.max(oldest, m.lastTime - m.sentAt[m.head]);
    }
    const finished = meters.length > 0 && meters.every(m => m.done);
    const incomplete = !finished || total.ringOverflow || total.sendFailures || total.invalidClocks || total.invalidSequences || total.nonIncreasingSends
      || total.invalidSnapshotTicks || total.backwardsSnapshotTicks || total.invalidAcks || total.regressingAcks || total.inactiveSends;
    return { status: incomplete ? 'incomplete observations' : 'complete observations', counts: total,
      pending, pendingAtFinish: atFinish, oldestPendingAgeMs: oldest, maxPendingAgeMs: maxAge, maxSnapshotSilenceMs: maxSilence,
      finished, censoredByReason: reasons,
      serviceRtt: rtt.report(), censoredAge: censored.report(), snapshotInterarrival: gaps.report(), advancingSnapshotInterarrival: advancing.report(),
      unfinishedSnapshotSilence: unfinished.report() };
  }
}
