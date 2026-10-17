import { MassGenerator } from './generator';
import { massCompileInput, massCompilePort } from './compilePort';
import { canonical, freezeData } from './random';
import { compileProcessionPlanSteps, processionPlanIdentity, type ProcessionPlanInput, type ProcessionPlanJob,
  type ProcessionPlanReply, type ProcessionPreparation } from './processionPlan';
export interface ProcessionCompilePort {
  onmessage: ((event: MessageEvent<ProcessionPlanReply>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(job: ProcessionPlanJob): void; terminate(): void;
}
export interface ProcessionWarmConfig { maxQueued: number; maxReady: number; maxInputBytes: number; maxPayloadBytes: number; maxReadyBytes: number }
export const PROCESSION_WARM_DEFAULTS: Readonly<ProcessionWarmConfig> = Object.freeze({ maxQueued: 8, maxReady: 2, maxInputBytes: 8388608, maxPayloadBytes: 131072, maxReadyBytes: 33554432 });
interface Pending { input: Readonly<ProcessionPlanInput>; key: string; sourceHash: string; inputBytes: number }
export interface ProcessionReady { input: Readonly<ProcessionPlanInput>; preparation: Readonly<ProcessionPreparation> }
interface Ready extends ProcessionReady { bytes: number }
/** Ready means envelope-checked, not admitted. The host must incrementally run
 * validateProcessionPlanSteps against CURRENT expected input, then perform its
 * full native body sweep before publishing any road/cart or reservation. */
export class ProcessionPlanWarmQueue {
  readonly config: Readonly<ProcessionWarmConfig>;
  private pending: Pending[] = []; private ready = new Map<string, Ready>(); private wanted = new Set<string>();
  private inflight: { row: Pending; token: number; steps?: Generator<void, Readonly<ProcessionPreparation>, unknown>; elapsed: number } | null = null;
  private sequence = 0; private stopped = false; private generator?: MassGenerator; private generatorKey = '';
  private counters = { offered: 0, completed: 0, discarded: 0, workerMs: 0, fallbackMs: 0, fallbackSteps: 0, maxFallbackSliceMs: 0 };
  error: string | null = null;
  constructor(private readonly port: ProcessionCompilePort | null, config: ProcessionWarmConfig = { ...PROCESSION_WARM_DEFAULTS }) {
    if (!Object.values(config).every(Number.isSafeInteger) || config.maxQueued < 1 || config.maxQueued > 16 || config.maxReady < 1 || config.maxReady > 4
      || config.maxInputBytes < 1024 || config.maxInputBytes > 8388608 || config.maxPayloadBytes < 1024 || config.maxPayloadBytes > 1048576
      || config.maxReadyBytes < config.maxPayloadBytes + config.maxInputBytes || config.maxReadyBytes > 33554432) throw Error('Invalid procession preparation budget');
    this.config = Object.freeze({ ...config });
    if (port) { port.onmessage = e => this.receive(e.data); port.onerror = e => this.fail(e.message || 'Procession worker failed'); }
  }
  offer(inputs: readonly Readonly<ProcessionPlanInput>[]): void {
    if (this.stopped) return; if (inputs.length > 64) throw Error('Procession shortlist exceeds budget');
    const rows: Pending[] = [], seen = new Set<string>();
    for (const input of inputs) {
      const text = canonical(input), inputBytes = text.length * 2; if (inputBytes > this.config.maxInputBytes) continue;
      const { inputHash: key, sourceHash } = processionPlanIdentity(input); if (seen.has(key)) continue; seen.add(key);
      rows.push({ input: massCompileInput(input), key, sourceHash, inputBytes });
      if (rows.length >= this.config.maxQueued + this.config.maxReady + 1) break;
    }
    this.wanted = new Set(rows.map(r => r.key));
    for (const [key] of this.ready) if (!this.wanted.has(key)) { this.ready.delete(key); this.counters.discarded++; }
    if (!this.port && this.inflight && !this.wanted.has(this.inflight.row.key)) { this.inflight.steps?.return(undefined as never); this.inflight = null; this.counters.discarded++; }
    this.pending = rows.filter(r => r.key !== this.inflight?.row.key && !this.ready.has(r.key)).slice(0, this.config.maxQueued);
    this.counters.offered += this.pending.length; this.pump();
  }
  private pump(): void {
    if (this.stopped || this.inflight || this.ready.size >= this.config.maxReady || this.readyBytes + this.config.maxInputBytes + this.config.maxPayloadBytes > this.config.maxReadyBytes) return;
    const row = this.pending.shift(); if (!row) return; const token = ++this.sequence;
    this.inflight = { row, token, elapsed: 0 };
    if (!this.port) return; // Fallback construction and every kernel step wait for advance().
    try { this.port.postMessage({ protocol: 1, token, input: row.input, inputHash: row.key, sourceHash: row.sourceHash, maxBytes: this.config.maxPayloadBytes }); }
    catch (error) { this.fail(String(error instanceof Error ? error.message : error)); }
  }
  /** Soft budget: one source envelope/native place page/search expansion may
   * exceed2ms. Telemetry records the actual slice; work is never silently lost. */
  advance(maxSteps = 64, budgetMs = 2): void {
    if (this.stopped || this.port || !this.inflight) return;
    if (!Number.isSafeInteger(maxSteps) || maxSteps < 1 || maxSteps > 256 || !Number.isFinite(budgetMs) || budgetMs <= 0 || budgetMs > 16) throw Error('Invalid procession fallback slice');
    const start = performance.now(), active = this.inflight;
    try {
      if (!active.steps) {
        const key = canonical([active.row.input.run, active.row.input.terrain]);
        if (key !== this.generatorKey) { this.generator = new MassGenerator(active.row.input.run, active.row.input.terrain); this.generatorKey = key; }
        active.steps = compileProcessionPlanSteps(active.row.input, this.generator);
      }
      for (let i = 0; i < maxSteps; i++) {
        const next = active.steps.next(); this.counters.fallbackSteps++;
        if (next.done) {
          const bytes = canonical(next.value).length * 2;
          this.receive({ protocol: 1, token: active.token, preparation: next.value, bytes, compileMs: active.elapsed + performance.now() - start }); break;
        }
        if (performance.now() - start >= budgetMs) break;
      }
    } catch (error) { this.fail(String(error instanceof Error ? error.message : error)); }
    finally { const elapsed = performance.now() - start; active.elapsed += elapsed; this.counters.fallbackMs += elapsed; this.counters.maxFallbackSliceMs = Math.max(this.counters.maxFallbackSliceMs, elapsed); }
  }
  private receive(reply: ProcessionPlanReply): void {
    if (this.stopped) return;
    try {
      const active = this.inflight;
      if (!active || !reply || reply.protocol !== 1 || reply.token !== active.token || Boolean(reply.error) === Boolean(reply.preparation)) throw Error('Unexpected procession reply');
      if (reply.error) throw Error(reply.error);
      const result = reply.preparation!, text = canonical(result);
      if (result.compiler !== active.row.input.compiler || result.inputHash !== active.row.key || result.sourceHash !== active.row.sourceHash
        || !Number.isSafeInteger(reply.bytes) || reply.bytes !== text.length * 2 || reply.bytes > this.config.maxPayloadBytes
        || !Number.isFinite(reply.compileMs) || reply.compileMs! < 0) throw Error('Invalid procession envelope');
      this.inflight = null; if (this.port) this.counters.workerMs += reply.compileMs!;
      if (this.wanted.has(active.row.key)) { this.ready.set(active.row.key, { input: active.row.input, preparation: freezeData(JSON.parse(text) as ProcessionPreparation), bytes: reply.bytes + active.row.inputBytes }); this.counters.completed++; }
      else this.counters.discarded++;
      this.pump();
    } catch (error) { this.fail(String(error instanceof Error ? error.message : error)); }
  }
  takeReady(): ProcessionReady | undefined { const first = this.ready.entries().next().value; if (!first) return; this.ready.delete(first[0]); this.pump(); return first[1]; }
  fail(message: string): void { this.error = message; this.dispose(); }
  dispose(): void {
    if (this.stopped) return; this.stopped = true;
    if (this.port) { this.port.onmessage = null; this.port.onerror = null; this.port.terminate(); }
    this.inflight?.steps?.return(undefined as never); this.inflight = null; this.pending = []; this.ready.clear(); this.wanted.clear(); this.generator = undefined; this.generatorKey = '';
  }
  private get readyBytes(): number { let bytes = 0; for (const r of this.ready.values()) bytes += r.bytes; return bytes; }
  get stats() { return { ...this.counters, mode: this.port ? 'worker' : 'incremental', queued: this.pending.length, ready: this.ready.size, readyBytes: this.readyBytes, inflight: this.inflight ? 1 : 0, disposed: this.stopped, error: this.error }; }
}
/** Worker unavailable still prepares the exact same pure kernel incrementally. */
export function createProcessionPlanWarmQueue(config?: ProcessionWarmConfig): ProcessionPlanWarmQueue {
  const port=massCompilePort('procession');if(port)return new ProcessionPlanWarmQueue(port,config);
  if (typeof Worker !== 'undefined') try { return new ProcessionPlanWarmQueue(new Worker(new URL('./processionPlan.worker.ts', import.meta.url), { type: 'module', name: 'procession-route-compiler' }), config); } catch { /* CSP/worker support: use bounded fallback. */ }
  return new ProcessionPlanWarmQueue(null, config);
}
