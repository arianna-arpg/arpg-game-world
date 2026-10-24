import { Session } from 'node:inspector/promises';
import type { Profiler } from 'node:inspector';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { cpus } from 'node:os';
import { World } from '../src/engine/world';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { massWorkersStatus } from '../server/massWorkers';
import type { ShardHost } from '../server/shardHost';

const round = (n: number) => Math.round(n * 100) / 100;
function summary(values: number[]) {
  const rows = [...values].sort((a, b) => a - b);
  const pct = (p: number) => round(rows[Math.min(rows.length - 1, Math.floor(rows.length * p))] ?? 0);
  return { calls: rows.length, totalMs: round(rows.reduce((a, b) => a + b, 0)), p50: pct(.5), p95: pct(.95), p99: pct(.99), max: pct(1) };
}
const cpuTimes = () => cpus().reduce((n, c) => ({ idle: n.idle + c.times.idle,
  total: n.total + Object.values(c.times).reduce((a, b) => a + b, 0) }), { idle: 0, total: 0 });

/** Opt-in harness instrumentation. Measurements are inclusive and overlap;
 * runtime.update is inside world.update. Never sum these as disjoint phases.
 * Wrappers preserve receivers, arguments, results and exceptions. */
export class ShardPerformance {
  private open = false;
  private rows = new Map<string, number[]>();
  private undo: (() => void)[] = [];
  private inspector?: Session;
  private cpu = cpuTimes();
  private usage = process.cpuUsage();
  private started = 0;
  private samples: unknown[] = [];
  private counts: Record<string, number> = {};
  private closed?: { machineBusyPercent: number; processCpuCores: number };
  private profileResult?: Promise<Profiler.StopReturnType>;

  constructor(private profilePath?: string) {
    this.wrap(World.prototype, 'update', 'world.update');
    this.wrap(World.prototype, 'applyInputs', 'world.applyInputs');
    this.wrap(World.prototype, 'settleNearScale', 'world.settleNearScale');
    this.wrap(World.prototype, 'serializeWorldState', 'world.serializeWorldState');
    this.wrap(WorldMassRuntime.prototype, 'update', 'runtime.update');
    this.wrap(WorldMassRuntime.prototype, 'attach', 'runtime.attach', true);
    this.wrap(WorldMassRuntime.prototype, 'nativeReadiness', 'runtime.nativeReadiness');
  }
  private wrap<T extends object, K extends keyof T>(target: T, key: K, name: string, always = false) {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    const original = target[key];
    if (typeof original !== 'function') throw Error(`Cannot meter ${name}`);
    const meter = this;
    Object.defineProperty(target, key, { configurable: true, writable: true, value: function(this: T, ...args: unknown[]) {
      if (!always && !meter.open) return Reflect.apply(original, this, args);
      const start = performance.now();
      try { return Reflect.apply(original, this, args); }
      finally {
        let rows = meter.rows.get(name);
        if (!rows) meter.rows.set(name, rows = []);
        rows.push(performance.now() - start);
      }
    } });
    this.undo.push(() => { if (descriptor) Object.defineProperty(target, key, descriptor); else Reflect.deleteProperty(target, key); });
  }
  bind(host: ShardHost) {
    // The harness deliberately measures the host's private wire phase without
    // adding a diagnostic branch to every production tick.
    this.wrap(host as unknown as { wire(...args: unknown[]): void }, 'wire', 'wire.snapshotEncodeSend');
    this.wrap(host.net, 'sendStateTo', 'wire.encodeSend');
    this.wrap(host.net, 'drainInputs', 'input.drain');
    this.wrap(host.units, 'drain', 'units.drain');
    this.wrap(host.vessels, 'tick', 'vessels.tick');
    this.wrap(host.corpses, 'tick', 'corpses.tick');
    const runtime = host.world.massRuntime;
    if (runtime) {
      this.count(runtime.stream, 'sample', 'terrain.sample');
      // A terrainAt wrapper changes the generator capability and correctly
      // refuses worker adoption. Measure preparation through queue telemetry;
      // these two legacy call counters cover only the keeper's runtime.
      this.count(runtime.walk, 'regionAt', 'terrain.region');
    }
  }
  private count<T extends object, K extends keyof T>(target: T, key: K, name: string) {
    const descriptor = Object.getOwnPropertyDescriptor(target, key), original = target[key], meter = this;
    if (typeof original !== 'function') throw Error(`Cannot count ${name}`);
    Object.defineProperty(target, key, { configurable: true, writable: true, value: function(this: T, ...args: unknown[]) {
      if (meter.open) meter.counts[name] = (meter.counts[name] ?? 0) + 1;
      return Reflect.apply(original, this, args);
    } });
    this.undo.push(() => { if (descriptor) Object.defineProperty(target, key, descriptor); else Reflect.deleteProperty(target, key); });
  }
  async start() {
    if (this.profilePath) {
      this.inspector = new Session(); this.inspector.connect();
      await this.inspector.post('Profiler.enable');
      await this.inspector.post('Profiler.setSamplingInterval', { interval: 1000 });
      await this.inspector.post('Profiler.start');
    }
    this.cpu = cpuTimes(); this.usage = process.cpuUsage(); this.started = performance.now();
    this.open = true;
  }
  sample(host: ShardHost) {
    const runtime = host.world.massRuntime;
    this.samples.push({ sec: round((performance.now() - this.started) / 1000), workers: massWorkersStatus(),
      native: runtime?.nativeWarm?.stats, geographic: runtime?.geography?.warmStats,
      terrainPreparation: [...new Set([host.world,...host.units.worlds()])].map(world=>(world.massRuntime as unknown as { terrainWarm?: { stats?: unknown } } | null)?.terrainWarm?.stats??null),
      paging: runtime?.nativePagingStats, resumePending: runtime?.resumePending,
      terrain: runtime?.stream.stats, terrainRevision: runtime?.stream.revision, nativeRevision: runtime?.nativeFeatures?.version,
      counts: { ...this.counts } });
  }
  close() {
    this.open = false;
    const wallSec = (performance.now() - this.started) / 1000, cpu = cpuTimes(), usage = process.cpuUsage(this.usage);
    const machineBusyPercent = round(100 * (1 - (cpu.idle - this.cpu.idle) / Math.max(1, cpu.total - this.cpu.total)));
    this.closed = { machineBusyPercent, processCpuCores: round((usage.user + usage.system) / 1e6 / wallSec) };
    if (this.inspector) this.profileResult = this.inspector.post('Profiler.stop');
  }
  async finish(host: ShardHost) {
    if (this.inspector && this.profilePath) {
      const { profile } = (await this.profileResult)!;
      this.inspector.disconnect();
      mkdirSync(dirname(this.profilePath), { recursive: true });
      writeFileSync(this.profilePath, JSON.stringify(profile));
    }
    // The ordinary soak is ephemeral: no persistence beat fires. Measure the
    // real checkpoint explicitly outside its timed window, and label it so.
    const start = performance.now();
    host.units.captureAll();
    const save = host.world.serializeWorldState({ massCheckpoint: true });
    const serializeMs = performance.now() - start;
    const jsonStart = performance.now(), bytes = Buffer.byteLength(JSON.stringify(save));
    const checkpoint = { outsideWindow: true, diskWrite: false, bytes, serializeMs: round(serializeMs), jsonMs: round(performance.now() - jsonStart) };
    for (const undo of this.undo.reverse()) undo();
    return { profile: this.profilePath ?? null, ...this.closed,
      phasesInclusiveMs: Object.fromEntries([...this.rows].map(([name, values]) => [name, summary(values)])),
      counts: this.counts, checkpoint, samples: this.samples };
  }
}
