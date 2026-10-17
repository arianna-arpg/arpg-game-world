import { Worker } from 'node:worker_threads';
import { installMassCompilePort, type MassCompilePort, type MassCompiler } from '../src/worldmass/compilePort';
import { installMassDependencyCacheDefault } from '../src/worldmass/ownedDependencyCache';

// The existing content compilers share one thread. Optional terrain preparation
// has its own bounded lane so a cold content job cannot head-of-line block it.
// Both lanes are lazy, and each queue admits at most one outstanding job.
type Lane = 'content' | 'terrain';
const workers = new Map<Lane, Worker>();
let nextPort = 0;
const ports = new Map<number, NodeMassCompilePort>();
const telemetry = { submitted: 0, completed: 0, failed: 0, roundTripMs: 0, maxRoundTripMs: 0 };
export function massWorkersStatus() { return { ...telemetry, ports: ports.size, threads: workers.size }; }

function compilerThread(lane: Lane): Worker {
  const previous = workers.get(lane); if (previous) return previous;
  const current = new Worker(new URL('./massWorkerBootstrap.mjs', import.meta.url), {
    workerData: { entry: new URL('./massCompiler.ts', import.meta.url).href }, execArgv: [], name: 'wilds-' + lane,
  });
  workers.set(lane, current);
  current.on('message', (message: { port: number; reply: unknown }) => {
    if (workers.get(lane) !== current) return;
    const port = ports.get(message.port); if (!port || port.lane !== lane) return;
    port.complete();
    telemetry.completed++; port.onmessage?.({ data: message.reply } as MessageEvent);
  });
  const fail = (message: string) => {
    if (workers.get(lane) !== current) return;
    workers.delete(lane); telemetry.failed++;
    // A failed compiler never falls back to synchronous heavy work in this
    // adapter. Its queue records the failure using its existing error contract.
    for (const port of [...ports.values()]) if (port.lane === lane) port.onerror?.({ message } as ErrorEvent);
    void current.terminate();
  };
  current.on('error', error => fail(String(error instanceof Error ? error.message : error)));
  current.on('exit', code => { if (workers.get(lane) === current) fail('Wilds compiler exited (' + code + ')'); });
  current.unref();
  return current;
}
class NodeMassCompilePort implements MassCompilePort {
  onmessage: MassCompilePort['onmessage'] = null;
  onerror: MassCompilePort['onerror'] = null;
  private readonly id = ++nextPort;
  private stopped = false;
  private submittedAt = 0;
  readonly lane: Lane;
  constructor(private readonly kind: MassCompiler) { this.lane = kind === 'terrain' ? 'terrain' : 'content'; ports.set(this.id, this); }
  postMessage(job: unknown): void {
    if (this.stopped) throw Error('Wilds compiler port is closed');
    this.submittedAt = performance.now();
    compilerThread(this.lane).postMessage({ port: this.id, kind: this.kind, job }); telemetry.submitted++;
  }
  /** Includes worker queueing and host event-loop delay, not just compiler CPU. */
  complete(): void {
    const ms = performance.now() - this.submittedAt;
    telemetry.roundTripMs += ms; telemetry.maxRoundTripMs = Math.max(telemetry.maxRoundTripMs, ms);
  }
  terminate(): void {
    if (this.stopped) return;
    this.stopped = true; ports.delete(this.id); this.onmessage = null; this.onerror = null;
    const worker = workers.get(this.lane);
    if (![...ports.values()].some(port => port.lane === this.lane)) {
      workers.delete(this.lane); if (worker) void worker.terminate();
    } else worker?.postMessage({ port: this.id, kind: this.kind });
  }
}
/** Independent process-wide experiments. Neither has established a consistent
 * responsiveness win, so ordinary hosts retain native sample Maps and content
 * workers only. Explicit options override their separate environment flags. */
export function installNodeMassWorkers(options: { terrainPreparation?: boolean; dependencyCache?: boolean } = {}): void {
  const terrainPreparation = options.terrainPreparation ?? process.env.HOLLOW_WAKE_TERRAIN_PREPARATION === '1';
  const dependencyCache = options.dependencyCache ?? process.env.HOLLOW_WAKE_DEPENDENCY_CACHE === '1';
  installMassDependencyCacheDefault(dependencyCache);
  installMassCompilePort(kind => kind === 'terrain' && !terrainPreparation ? undefined : new NodeMassCompilePort(kind));
}
