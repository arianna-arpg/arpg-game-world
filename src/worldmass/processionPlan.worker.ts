import { MassPlanGeneratorCache } from './planGeneratorCache';
import { prepareProcessionPlan, type ProcessionPlanJob } from './processionPlan';
const generators = new MassPlanGeneratorCache();
self.onmessage = (event: MessageEvent<ProcessionPlanJob>) => {
  const job = event.data;
  try {
    self.postMessage(prepareProcessionPlan(job, generators.get(job.input.run, job.input.terrain)));
  } catch (error) { self.postMessage({ protocol: 1, token: job?.token ?? 0, error: String(error instanceof Error ? error.message : error) }); }
};
