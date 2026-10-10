// Only pure generation runs here. Live actors, saves and World stay on the host.
import { parentPort } from 'node:worker_threads';
import '../src/worldmass/nativeBootstrap';
import { MassGenerator } from '../src/worldmass/generator';
import { canonical } from '../src/worldmass/random';
import { prepareNativeFeature, type NativeCompileJob } from '../src/worldmass/nativePreparation';
import { prepareGeographicPlan, type GeographicPlanJob } from '../src/worldmass/geographicPlan';
import { prepareProcessionPlan, type ProcessionPlanJob } from '../src/worldmass/processionPlan';
import type { MassCompiler } from '../src/worldmass/compilePort';

const generators = new Map<number, { key: string; generator: MassGenerator }>();
parentPort!.on('message', (message: { port: number; kind: MassCompiler; job?: NativeCompileJob | GeographicPlanJob | ProcessionPlanJob }) => {
  const { port, kind, job } = message;
  if (!job) { generators.delete(port); return; }
  try {
    if (kind === 'native') {
      parentPort!.postMessage({ port, reply: prepareNativeFeature(job as NativeCompileJob) }); return;
    }
    const input = (job as GeographicPlanJob | ProcessionPlanJob).input;
    const key = canonical([input.run, input.terrain]);
    let row = generators.get(port);
    if (row?.key !== key) { row = { key, generator: new MassGenerator(input.run, input.terrain) }; generators.set(port, row); }
    const reply = kind === 'geographic' ? prepareGeographicPlan(job as GeographicPlanJob, row.generator)
      : prepareProcessionPlan(job as ProcessionPlanJob, row.generator);
    parentPort!.postMessage({ port, reply });
  } catch (error) {
    parentPort!.postMessage({ port, reply: { protocol: 1, token: job.token, error: String(error instanceof Error ? error.message : error) } });
  }
});
