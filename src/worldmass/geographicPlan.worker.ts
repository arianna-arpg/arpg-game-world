import { MassPlanGeneratorCache } from './planGeneratorCache';
import { prepareGeographicPlan,type GeographicPlanJob } from './geographicPlan';
const generators = new MassPlanGeneratorCache();
self.onmessage=(event:MessageEvent<GeographicPlanJob>)=>{
  const job=event.data;
  try{
    self.postMessage(prepareGeographicPlan(job,generators.get(job.input.run,job.input.terrain)));
  }catch(error){self.postMessage({protocol:1,token:job.token,error:String(error instanceof Error?error.message:error)});}
};
