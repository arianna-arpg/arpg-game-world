/** Read, stage and publish an actual recorded retained Continue. Older saves stay
 * untouched and require explicit migration; there is no legacy runtime fallback. */
import {World} from '../engine/world';
import {serializeAccount,type Account} from '../meta/account';
import {characterResumeAuthority,characterResumeCurrent} from '../meta/character';
import type {CharacterResume} from '../meta/characterResume';
import type {ResumeSpawn} from '../meta/worldstate';
import {soloResumeRefusal} from '../net/shardDoor';
import {START_ZONE} from '../data/zones';
import {readNativeRetainedSave} from './nativeRetainedSave';
import {NativeAreaCharacterResume} from './nativeAreaCharacterResume';
import {NativeClientRuntime} from './nativeClientRuntime';
export interface PreparedNativeCharacterWorld {readonly writer:World;readonly runtime:NativeClientRuntime;publish():Readonly<{writer:World;runtime:NativeClientRuntime}>;discard():void}
const installLoading=NativeClientRuntime.prototype.installLoading;
const install=NativeClientRuntime.prototype.install,retire=NativeClientRuntime.prototype.retire;
export async function prepareNativeCharacterContinue(account:Account,resume:CharacterResume,options:{readonly isCurrent:()=>boolean;readonly signal?:AbortSignal;readonly spawn:ResumeSpawn;readonly loadingStage?:(label:string)=>Promise<void>}):Promise<PreparedNativeCharacterWorld>{
 const baseline=JSON.stringify(serializeAccount(account));
 const current=()=>!options.signal?.aborted&&options.isCurrent()&&characterResumeAuthority(resume)&&JSON.stringify(serializeAccount(account))===baseline;
 if(!current()||!await characterResumeCurrent(resume)||!current())throw Error('Continue was superseded');
 if(resume.kind!=='inline')throw Error('This save has no recorded retained geography envelope; migration is required and the save was not changed');
 const bound=soloResumeRefusal(resume.save);if(bound)throw Error(bound);
 const wait=async(label:string)=>{if(!current())throw Error('Continue was superseded');if(options.loadingStage)await options.loadingStage(label);if(!current())throw Error('Continue was superseded');};
 const record=readNativeRetainedSave(resume.save);
 await wait('Reading the recorded world');
 if(options.loadingStage)await options.loadingStage('Restoring the recorded world');if(!current())throw Error('Continue was superseded');
 const writer=World.staged(structuredClone(account),Object.freeze(record.manifest));let runtime:NativeClientRuntime|undefined,published=false,discarded=false;
 const discard=()=>{if(published||discarded)return;discarded=true;if(runtime)Reflect.apply(retire,runtime,[]);};
 try{
  const restore=new NativeAreaCharacterResume(writer,resume.save,resume);
  if(options.loadingStage)await wait('Preparing your recorded vessel');
  runtime=new NativeClientRuntime({writer,definition:writer.zoneMap[START_ZONE],geography:record.geography.spec,...record.catalog?{catalog:record.catalog.spec}:{},resume:restore,resumePolicy:options.spawn});
  if(options.loadingStage){await wait('Restoring your starting ground');await Reflect.apply(installLoading,runtime,[wait,options.signal]);}
  else writer.withGlobalPolicies(()=>Reflect.apply(install,runtime!,[options.signal]));
  if(options.loadingStage)await wait('Restoring retained area ownership');
  if(!current()||!await characterResumeCurrent(resume)||!current())throw Error('Continue was superseded');
  const ready=runtime;
  return {writer,runtime:ready,discard,publish:()=>{if(discarded||published||!current())throw Error('Continue was superseded');if(!writer.publishResumeAccount(account,baseline))throw Error('The account changed during Continue');published=true;return Object.freeze({writer,runtime:ready});}};
 }catch(error){discard();throw error;}
}
