import { compileNativeFeature, nativeFeatureSourceIdentity, nativeLayoutRequirements, resolveNativeFeature,
  type NativeFeatureRequest, type NativeFeatureDescriptor, type NativeFeatureBlueprint } from './nativeFeatures';
import { canonical, massDigest } from './random';
import { captureNativeEffectSources } from './nativeEffectSources';

export const NATIVE_PREPARATION_PROTOCOL=1;
export interface NativeFeaturePreparation {
  compiler:'native-feature-v1'; requestHash:string; sourceHash:string;
  compileMs:number; bytes:number;
  descriptor?:Readonly<NativeFeatureDescriptor>;
  failure?:{kind:'generation'|'compatibility'|'budget';message:string};
}
export interface NativeCompileJob {
  protocol:1; token:number; request:NativeFeatureRequest;
  identity:ReturnType<typeof nativeFeatureSourceIdentity>; maxBytes:number;
}
export interface NativeCompileReply { protocol:1; token:number; preparation:NativeFeaturePreparation }

/** Pure native work used by the worker, also testable without a browser. The
 * bootstrap is a separate import so ordinary callers never mutate registries. */
export function prepareNativeFeature(job:NativeCompileJob):NativeCompileReply {
  if(job.protocol!==NATIVE_PREPARATION_PROTOCOL||!Number.isSafeInteger(job.token)||job.token<1
    ||!Number.isSafeInteger(job.maxBytes)||job.maxBytes<1024||job.maxBytes>16*1024*1024)
    throw Error('Invalid native compiler job');
  const start=performance.now();
  const finish=(body:Pick<NativeFeaturePreparation,'descriptor'|'failure'>):NativeCompileReply=>{
    const bytes=body.descriptor?JSON.stringify(body.descriptor).length*2:0;
    const bounded=bytes>job.maxBytes?{failure:{kind:'budget' as const,message:'Native preparation exceeds transfer budget'}}:body;
    return{protocol:1,token:job.token,preparation:{...job.identity,...bounded,compileMs:performance.now()-start,bytes:bytes>job.maxBytes?0:bytes}};
  };
  let identity:ReturnType<typeof nativeFeatureSourceIdentity>;
  try{identity=nativeFeatureSourceIdentity(job.request);}
  catch(error){return finish({failure:{kind:'generation',message:String(error instanceof Error?error.message:error)}});}
  if(canonical(identity)!==canonical(job.identity))return finish({failure:{kind:'compatibility',message:'Worker native source registry differs from caller'}});
  try{return finish({descriptor:resolveNativeFeature(job.request)});}
  catch(error){return finish({failure:{kind:'generation',message:String(error instanceof Error?error.message:error)}});}
}

/** A worker message is never a birth receipt. Verify all identity and data on
 * the owner thread before capability admission or durable geography changes. */
export function validateNativePreparation(request:NativeFeatureRequest,prepared:NativeFeaturePreparation):NativeFeatureBlueprint|null {
  const expected=nativeFeatureSourceIdentity(request);
  if(prepared.compiler!==expected.compiler||prepared.requestHash!==expected.requestHash||prepared.sourceHash!==expected.sourceHash
    ||!Number.isFinite(prepared.compileMs)||prepared.compileMs<0||!Number.isSafeInteger(prepared.bytes)||prepared.bytes<0
    ||Boolean(prepared.descriptor)===Boolean(prepared.failure))throw Error('Native preparation identity or envelope mismatch');
  if(prepared.failure){
    if(!['generation','compatibility','budget'].includes(prepared.failure.kind)||typeof prepared.failure.message!=='string')throw Error('Invalid native preparation failure');
    return null;
  }
  const descriptor=prepared.descriptor!;
  if(descriptor.id!==request.id||descriptor.seed!==request.seed||descriptor.compiler!==expected.compiler
    ||!descriptor.effectSources||massDigest({zone:descriptor.sourceZone,authored:descriptor.authored,effectRegistryHash:descriptor.effectSources.registryHash})!==expected.sourceHash
    ||canonical(descriptor.source)!==canonical({...request.source,...(descriptor.zone.variantName?{variant:descriptor.zone.variantName}:{})})
    ||JSON.stringify(descriptor).length*2!==prepared.bytes)throw Error('Native prepared descriptor has foreign source or request');
  const blueprint=compileNativeFeature(descriptor),ownsEnvironment=request.source.kind==='massif'&&request.source.scope!=='landform';
  if(!descriptor.sidechannels||descriptor.environment.owner!==(ownsEnvironment?'source':'containing-region')
    ||canonical(captureNativeEffectSources(blueprint.layout.doodads))!==canonical(descriptor.effectSources)
    ||canonical(nativeLayoutRequirements(blueprint.layout,descriptor.zone,blueprint.entrances,ownsEnvironment,descriptor.sidechannels,descriptor.effectSources))!==canonical(descriptor.requirements))
    throw Error('Native prepared descriptor lost lifecycle requirements');
  return blueprint;
}
