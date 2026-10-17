import type { GeographicPlanInput,GeographicPlanJob,GeographicPlanReply,GeographicPreparation } from './geographicPlan';
import { geographicPlanIdentity } from './geographicPlan';
import { canonical } from './random';
import { massCompileInput, massCompilePort } from './compilePort';
export interface GeographicCompilePort {
  onmessage:((event:MessageEvent<GeographicPlanReply>)=>void)|null;onerror:((event:ErrorEvent)=>void)|null;
  postMessage(job:GeographicPlanJob):void;terminate():void;
}
export interface GeographicWarmConfig {maxQueued:number;maxReady:number;maxInputBytes:number;maxPayloadBytes:number;maxReadyBytes:number}
export const GEOGRAPHIC_WARM_DEFAULTS:Readonly<GeographicWarmConfig>=Object.freeze({maxQueued:16,maxReady:4,maxInputBytes:8*1024*1024,maxPayloadBytes:256*1024,maxReadyBytes:1024*1024});
interface Pending {input:Readonly<GeographicPlanInput>;key:string;sourceHash:string}
export interface GeographicReady {input:Readonly<GeographicPlanInput>;preparation:GeographicPreparation}
export class GeographicPlanWarmQueue{
  readonly config:Readonly<GeographicWarmConfig>;
  private pending:Pending[]=[];private ready=new Map<string,GeographicReady>();private wanted=new Set<string>();
  private inflight:{row:Pending;token:number}|null=null;private sequence=0;private stopped=false;
  private counters={offered:0,completed:0,discarded:0,workerMs:0};error:string|null=null;
  constructor(private readonly port:GeographicCompilePort,config:GeographicWarmConfig={...GEOGRAPHIC_WARM_DEFAULTS}){
    if(!Object.values(config).every(Number.isSafeInteger)||config.maxQueued<1||config.maxQueued>32||config.maxReady<1||config.maxReady>8
      ||config.maxInputBytes<1024||config.maxInputBytes>8*1024*1024||config.maxPayloadBytes<1024||config.maxPayloadBytes>1024*1024
      ||config.maxReadyBytes<config.maxPayloadBytes||config.maxReadyBytes>8*1024*1024)throw Error('Invalid geographic worker budget');
    this.config=Object.freeze({...config});port.onmessage=e=>this.receive(e.data);port.onerror=e=>this.fail(e.message||'Geographic worker failed');
  }
  offer(inputs:readonly Readonly<GeographicPlanInput>[]):void{
    if(this.stopped)return;if(inputs.length>64)throw Error('Geographic preparation shortlist exceeds budget');
    const rows:Pending[]=[],seen=new Set<string>();
    for(const input of inputs){
      const text=canonical(input);if(text.length*2>this.config.maxInputBytes)continue;
      const {inputHash:key,sourceHash}=geographicPlanIdentity(input);if(seen.has(key))continue;seen.add(key);
      rows.push({input:massCompileInput(input),key,sourceHash});if(rows.length>=this.config.maxQueued+this.config.maxReady+1)break;
    }
    this.wanted=new Set(rows.map(r=>r.key));for(const[key]of this.ready)if(!this.wanted.has(key)){this.ready.delete(key);this.counters.discarded++;}
    this.pending=rows.filter(r=>r.key!==this.inflight?.row.key&&!this.ready.has(r.key)).slice(0,this.config.maxQueued);
    this.counters.offered+=this.pending.length;this.pump();
  }
  private pump():void{
    if(this.stopped||this.inflight||this.ready.size>=this.config.maxReady||this.readyBytes+this.config.maxPayloadBytes>this.config.maxReadyBytes)return;
    const row=this.pending.shift();if(!row)return;const token=++this.sequence;this.inflight={row,token};
    try{this.port.postMessage({protocol:1,token,input:row.input,inputHash:row.key,sourceHash:row.sourceHash,maxBytes:this.config.maxPayloadBytes});}
    catch(error){this.fail(String(error instanceof Error?error.message:error));}
  }
  private receive(reply:GeographicPlanReply):void{
    if(this.stopped)return;
    try{this.receiveChecked(reply);}catch(error){this.fail(String(error instanceof Error?error.message:error));}
  }
  private receiveChecked(reply:GeographicPlanReply):void{
    if(this.stopped)return;const active=this.inflight;
    if(!active||!reply||reply.protocol!==1||reply.token!==active.token||Boolean(reply.error)===Boolean(reply.preparation)){this.fail('Unexpected geographic worker reply');return;}
    this.inflight=null;if(reply.error){this.fail(reply.error);return;}
    const p=reply.preparation!;
    if(p.inputHash!==active.row.key||p.sourceHash!==active.row.sourceHash||p.compiler!==active.row.input.compiler
      ||!Number.isSafeInteger(p.bytes)||p.bytes<0||p.bytes>this.config.maxPayloadBytes||p.bytes!==JSON.stringify(p.plan).length*2
      ||!Number.isFinite(p.compileMs)||p.compileMs<0){this.fail('Invalid geographic worker envelope');return;}
    this.counters.workerMs+=p.compileMs;
    if(this.wanted.has(active.row.key)){this.ready.set(active.row.key,{input:active.row.input,preparation:p});this.counters.completed++;}
    else this.counters.discarded++;
    this.pump();
  }
  takeReady():GeographicReady|undefined{const first=this.ready.entries().next().value;if(!first)return;this.ready.delete(first[0]);this.pump();return first[1];}
  fail(message:string):void{this.error=message;this.dispose();}
  dispose():void{if(this.stopped)return;this.stopped=true;this.port.onmessage=null;this.port.onerror=null;this.port.terminate();this.pending=[];this.ready.clear();this.wanted.clear();this.inflight=null;}
  private get readyBytes():number{let n=0;for(const r of this.ready.values())n+=r.preparation.bytes;return n;}
  get stats(){return {...this.counters,queued:this.pending.length,ready:this.ready.size,readyBytes:this.readyBytes,inflight:this.inflight?1:0,disposed:this.stopped,error:this.error};}
}
export function createGeographicPlanWarmQueue(config?:GeographicWarmConfig):GeographicPlanWarmQueue|null{
  const port=massCompilePort('geographic');if(port)return new GeographicPlanWarmQueue(port,config);
  if(typeof Worker==='undefined')return null;
  try{return new GeographicPlanWarmQueue(new Worker(new URL('./geographicPlan.worker.ts',import.meta.url),{type:'module',name:'geographic-plan-compiler'}),config);}catch{return null;}
}
