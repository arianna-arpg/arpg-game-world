import { MassGenerator } from './generator';
import { canonical } from './random';
import { prepareProcessionPlan, type ProcessionPlanJob } from './processionPlan';
// A single bounded generator cache belongs to this worker. No World, registry
// bootstrap, storage access, global RNG swap or per-descriptor initialization.
let generator: MassGenerator | undefined, key = '';
self.onmessage = (event: MessageEvent<ProcessionPlanJob>) => {
  const job = event.data;
  try {
    const next = canonical([job.input.run, job.input.terrain]);
    if (next !== key) { generator = new MassGenerator(job.input.run, job.input.terrain); key = next; }
    self.postMessage(prepareProcessionPlan(job, generator));
  } catch (error) { self.postMessage({ protocol: 1, token: job?.token ?? 0, error: String(error instanceof Error ? error.message : error) }); }
};
