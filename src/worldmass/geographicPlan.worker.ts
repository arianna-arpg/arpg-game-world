import { MassGenerator } from './generator';
import { canonical } from './random';
import { prepareGeographicPlan,type GeographicPlanJob } from './geographicPlan';
// One frozen generator per owning run; its terrain/place caches are bounded by
// MassGenerator. No native bootstrap, World construction or runtime RNG.
let generator:MassGenerator|undefined,key='';
self.onmessage=(event:MessageEvent<GeographicPlanJob>)=>{
  const job=event.data;
  try{
    const next=canonical([job.input.run,job.input.terrain]);
    if(next!==key){generator=new MassGenerator(job.input.run,job.input.terrain);key=next;}
    self.postMessage(prepareGeographicPlan(job,generator));
  }catch(error){self.postMessage({protocol:1,token:job.token,error:String(error instanceof Error?error.message:error)});}
};
