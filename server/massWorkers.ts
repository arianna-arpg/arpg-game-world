import { Worker } from 'node:worker_threads';
import { installMassCompilePort, type MassCompilePort, type MassCompiler } from '../src/worldmass/compilePort';

// One bounded compiler thread leaves a core for the simulation on small hosts.
// Each existing queue admits one outstanding job, retaining its byte/queue caps
// and validating the reply on the host before publication. Round-robin message
// order prevents a compiler from monopolizing the worker with its next job.
let worker: Worker | undefined, nextPort = 0;
const ports = new Map<number, NodeMassCompilePort>();
const telemetry = { submitted: 0, completed: 0, failed: 0 };
export function massWorkersStatus() { return { ...telemetry, ports: ports.size, threads: worker ? 1 : 0 }; }

function compilerThread(): Worker {
  if (worker) return worker;
  const current = new Worker(new URL('./massWorkerBootstrap.mjs', import.meta.url), {
    workerData: { entry: new URL('./massCompiler.ts', import.meta.url).href }, execArgv: [], name: 'wilds-compilers',
  });
  worker = current;
  current.on('message', (message: { port: number; reply: unknown }) => {
    if (worker !== current) return;
    const port = ports.get(message.port); if (!port) return;
    telemetry.completed++; port.onmessage?.({ data: message.reply } as MessageEvent);
  });
  const fail = (message: string) => {
    if (worker !== current) return;
    worker = undefined; telemetry.failed++;
    // A failed compiler never falls back to synchronous heavy work in this
    // adapter. Its queue records the failure using its existing error contract.
    for (const port of [...ports.values()]) port.onerror?.({ message } as ErrorEvent);
    void current.terminate();
  };
  current.on('error', error => fail(String(error instanceof Error ? error.message : error)));
  current.on('exit', code => { if (worker === current) fail('Wilds compiler exited (' + code + ')'); });
  current.unref();
  return current;
}
class NodeMassCompilePort implements MassCompilePort {
  onmessage: MassCompilePort['onmessage'] = null;
  onerror: MassCompilePort['onerror'] = null;
  private readonly id = ++nextPort;
  private stopped = false;
  constructor(private readonly kind: MassCompiler) { ports.set(this.id, this); }
  postMessage(job: unknown): void {
    if (this.stopped) throw Error('Wilds compiler port is closed');
    compilerThread().postMessage({ port: this.id, kind: this.kind, job }); telemetry.submitted++;
  }
  terminate(): void {
    if (this.stopped) return;
    this.stopped = true; ports.delete(this.id); this.onmessage = null; this.onerror = null;
    if (!ports.size) { const old = worker; worker = undefined; if (old) void old.terminate(); }
    else worker?.postMessage({ port: this.id, kind: this.kind });
  }
}
export function installNodeMassWorkers(): void { installMassCompilePort(kind => new NodeMassCompilePort(kind)); }
