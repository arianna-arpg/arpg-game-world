import type { NativeFeaturePlacement } from './nativeResidency';
import { nativeFeatureSourceIdentity } from './nativeFeatures';
import { canonical, freezeData } from './random';
import { type NativeCompileJob, type NativeCompileReply, type NativeFeaturePreparation } from './nativePreparation';

export interface NativeCompilePort {
  onmessage:((event:MessageEvent<NativeCompileReply>)=>void)|null;
  onerror:((event:ErrorEvent)=>void)|null;
  postMessage(job:NativeCompileJob):void;
  terminate():void;
}
export interface NativeWarmConfig { maxQueued:number;maxReady:number;maxReadyBytes:number;maxPayloadBytes:number }
export const NATIVE_WARM_DEFAULTS:Readonly<NativeWarmConfig>=Object.freeze({maxQueued:8,maxReady:4,maxReadyBytes:8*1024*1024,maxPayloadBytes:2*1024*1024});
export interface NativeReadyFeature {placement:Readonly<NativeFeaturePlacement>;preparation:NativeFeaturePreparation}
interface Pending { placement:Readonly<NativeFeaturePlacement>;key:string }

/** Best-effort preparation only. Collision keeps its synchronous compiler.
 * One worker request may run, pending offers and completed descriptors are
 * count/byte bounded. Caller supplies nearest-first candidates and consumes at
 * most one ready result per tick. Nothing here creates persistent geography. */
export class NativeFeatureWarmQueue {
  readonly config:Readonly<NativeWarmConfig>;
  private pending:Pending[]=[];
  private ready=new Map<string,NativeReadyFeature>();
  private inflight:{row:Pending;job:NativeCompileJob}|null=null;
  private sequence=0;
  private stopped=false;
  private wanted=new Set<string>();
  private skipped=new Map<string,true>();
  private counters={offered:0,completed:0,discarded:0,failed:0,workerMs:0};
  error:string|null=null;
  constructor(private readonly port:NativeCompilePort,config:NativeWarmConfig={...NATIVE_WARM_DEFAULTS}){
    if(![config.maxQueued,config.maxReady,config.maxReadyBytes,config.maxPayloadBytes].every(Number.isSafeInteger)
      ||config.maxQueued<1||config.maxQueued>32||config.maxReady<1||config.maxReady>8
      ||config.maxPayloadBytes<1024||config.maxPayloadBytes>16*1024*1024
      ||config.maxReadyBytes<config.maxPayloadBytes||config.maxReadyBytes>32*1024*1024)throw Error('Invalid native warm budget');
    this.config=Object.freeze({...config});
    port.onmessage=event=>this.receive(event.data);
    port.onerror=event=>{this.error=event.message||'Native compiler worker failed';this.dispose();};
  }
  /** Replaces the unstarted queue with the current ahead-of-player shortlist.
   * A turn/backtrack can discard obsolete work, but never cancel live physics. */
  offer(placements:readonly NativeFeaturePlacement[]):void{
    if(this.stopped)return;
    if(placements.length>256)throw Error('Native preparation shortlist exceeds bounded input');
    const rows:Pending[]=[],seen=new Set<string>();
    for(const placement of placements){
      const key=canonical(placement);
      if(seen.has(key))continue;seen.add(key);
      if(rows.length>=this.config.maxQueued+this.config.maxReady+1)break;
      rows.push({placement,key});
    }
    this.wanted=new Set(rows.map(r=>r.key));
    for(const[key]of this.ready)if(!this.wanted.has(key)){this.ready.delete(key);this.counters.discarded++;}
    this.pending=rows.filter(r=>r.key!==this.inflight?.row.key&&!this.ready.has(r.key)&&!this.skipped.has(r.key))
      .slice(0,this.config.maxQueued).map(r=>({key:r.key,placement:freezeData(JSON.parse(JSON.stringify(r.placement)) as NativeFeaturePlacement)}));
    this.counters.offered+=this.pending.length;this.pump();
  }
  private pump():void{
    if(this.stopped||this.inflight||this.ready.size>=this.config.maxReady
      ||this.readyBytes+this.config.maxPayloadBytes>this.config.maxReadyBytes)return;
    const row=this.pending.shift();if(!row)return;
    try{
      const job:NativeCompileJob={protocol:1,token:++this.sequence,request:row.placement.request,
        identity:nativeFeatureSourceIdentity(row.placement.request),maxBytes:this.config.maxPayloadBytes};
      this.inflight={row,job};this.port.postMessage(job);
    }catch(error){this.error=String(error instanceof Error?error.message:error);this.dispose();}
  }
  private receive(reply:NativeCompileReply):void{
    if(this.stopped)return;
    const active=this.inflight;
    if(!active||reply.protocol!==1||reply.token!==active.job.token){this.error='Unexpected native worker response';this.dispose();return;}
    this.inflight=null;
    const p=reply.preparation,i=active.job.identity;
    if(!p||p.compiler!==i.compiler||p.requestHash!==i.requestHash||p.sourceHash!==i.sourceHash
      ||!Number.isSafeInteger(p.bytes)||p.bytes<0||p.bytes>this.config.maxPayloadBytes||!Number.isFinite(p.compileMs)||p.compileMs<0
      ||Boolean(p.descriptor)===Boolean(p.failure)){
      this.error='Invalid native worker response';this.dispose();return;
    }
    this.counters.workerMs+=p.compileMs;
    if(p.failure?.kind==='compatibility'){this.error=p.failure.message;this.dispose();return;}
    if(p.failure?.kind==='budget'){
      this.skipped.set(active.row.key,true);
      if(this.skipped.size>this.config.maxQueued*2)this.skipped.delete(this.skipped.keys().next().value!);
      this.counters.discarded++;
    }else if(this.wanted.has(active.row.key)){
      this.ready.set(active.row.key,{placement:active.row.placement,preparation:p});
      this.counters.completed++;if(p.failure)this.counters.failed++;
    }else this.counters.discarded++;
    this.pump();
  }
  takeReady():NativeReadyFeature|undefined{
    const first=this.ready.entries().next().value;
    if(!first)return undefined;
    this.ready.delete(first[0]);this.pump();return first[1];
  }
  /** Call before replacing runtime, entering a native side scene or discarding
   * a World. Late callbacks cannot retain or mutate the discarded runtime. */
  dispose():void{
    if(this.stopped)return;this.stopped=true;this.port.onmessage=null;this.port.onerror=null;this.port.terminate();
    this.pending=[];this.ready.clear();this.inflight=null;this.wanted.clear();this.skipped.clear();
  }
  private get readyBytes(){let n=0;for(const r of this.ready.values())n+=r.preparation.bytes;return n;}
  get stats(){return{...this.counters,queued:this.pending.length,ready:this.ready.size,readyBytes:this.readyBytes,
    inflight:this.inflight?1:0,disposed:this.stopped,error:this.error};}
}
export function createNativeFeatureWarmQueue(config?:NativeWarmConfig):NativeFeatureWarmQueue|null{
  if(typeof Worker==='undefined')return null;
  try{return new NativeFeatureWarmQueue(new Worker(new URL('./nativeCompile.worker.ts',import.meta.url),{type:'module',name:'native-country-compiler'}),config);}
  catch{return null;}
}
