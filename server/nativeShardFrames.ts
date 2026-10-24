/** Dedicated retained server frame owner. Seat/vessel admission and durable
 * persistence are supplied by the host integration; this owner never creates
 * a second World or ticks a client render shell. */
import {NativeShardRuntime,isNativeShardRuntime,type NativeShardAction,type NativeShardFrameResult} from './nativeShardRuntime';
import {ShardTransport} from './shardTransport';
import {SHARD_CFG} from './shardHost';
import {NativeHostedPublication} from '../src/net/nativeHostedPublication';
import {resetActionEcho} from '../src/net/snapshot';
import type {SessionMsg} from '../src/net/transport';
import type {Seat} from '../src/engine/world';
import type {PlayerInput} from '../src/net/intent';
import {NativeAreaSceneCampaignFrame} from '../src/worldmass/nativeAreaSceneCampaignFrame';
export interface NativeShardFrameHooks {readonly deferRoadDrain?:boolean;beforeSimulation?(inputs:Map<string,PlayerInput>):void;afterSimulation?(dt:number,frame:NativeShardFrameResult|undefined,faults:readonly {phase:string;error:unknown}[]):void;afterPublication?(dt:number):void}
interface Pending extends NativeShardAction {readonly seat:Seat;readonly epoch:object}
export interface NativeShardTick {readonly tick:number;readonly frame:NativeShardFrameResult|undefined;readonly delivered:readonly {seatId:string;zoneSent:boolean;stateSent:boolean}[];readonly faults:readonly {phase:string;error:unknown}[]}
const owners=new WeakMap<NativeShardRuntime,NativeShardFrames>();
function own<T>(object:object,key:PropertyKey):T{const descriptor=Object.getOwnPropertyDescriptor(object,key);if(!descriptor||!Object.hasOwn(descriptor,'value'))throw Error('Native shard frame requires ordinary data: '+String(key));return descriptor.value as T;}
export class NativeShardFrames {
 readonly #hooks:Readonly<NativeShardFrameHooks>;readonly #runtime:NativeShardRuntime;readonly #net:ShardTransport;readonly #publish:NativeHostedPublication;readonly #dispose:(()=>void)[]=[];
 readonly #dispatch=NativeShardRuntime.prototype.dispatch;readonly #epoch=ShardTransport.prototype.deliveryEpochForSeat;readonly #drain=ShardTransport.prototype.drainInputs;
 readonly #pending:Pending[]=[];#busy=false;#retired=false;#ticks=0;#snapTick=0;#heartbeat=0;
 constructor(runtime:NativeShardRuntime,net:ShardTransport,hooks:NativeShardFrameHooks={}){
  if(!isNativeShardRuntime(runtime)||!(net instanceof ShardTransport)||!runtime.ready||owners.has(runtime))throw Error('Native shard frames need one ready dedicated runtime and its actual socket transport');
  this.#hooks=Object.freeze({...hooks});this.#runtime=runtime;this.#net=net;this.#publish=new NativeHostedPublication(runtime.hosted,net);
  Reflect.apply(NativeAreaSceneCampaignFrame.prototype.enableHostedRoads,runtime.current.combat.campaignFrame,[]);
  try {this.#dispose.push(Reflect.apply(ShardTransport.prototype.onSession,net,[(msg:SessionMsg,from:string)=>{
   if(this.#retired||msg.t!=='action')return;const seat=this.#seat(from),epoch=Reflect.apply(this.#epoch,net,[from]);if(!seat||!epoch)return;
   this.#pending.push({seatId:from,seat,epoch,action:msg.action,seq:msg.seq});
  }]));
  this.#dispose.push(Reflect.apply(ShardTransport.prototype.onPeerResume,net,[(id:string)=>{if(this.#retired)return;const seat=this.#seat(id);if(seat){resetActionEcho(seat);runtime.writer.lastInputSeq.delete(id);runtime.writer.metaDirty.add(id);}}]));
  owners.set(runtime,this);
  }catch(error){for(const dispose of this.#dispose)try{dispose();}catch{}throw error;}
 }
 #seat(id:string):Seat|undefined{const rows=own<Seat[]>(this.#runtime.writer,'seats');if(!Array.isArray(rows)||Object.getPrototypeOf(rows)!==Array.prototype)throw Error('Native shard frame requires actual roster');let found:Seat|undefined;for(let i=0;i<own<number>(rows,'length');i++){const seat=own<Seat>(rows,i);if(own(seat,'id')===id){if(found)throw Error('Native shard frame seat is ambiguous');if(!Object.getOwnPropertyDescriptor(seat,'keeper')?.value)found=seat;}}return found;}
 tick(dt:number,wallSeconds=dt):NativeShardTick{
  if(this.#retired||owners.get(this.#runtime)!==this)throw Error('Native shard frames are retired');if(this.#busy)throw Error('Native shard frame cannot reenter');
  if(!Number.isFinite(dt)||dt<0||!Number.isFinite(wallSeconds)||wallSeconds<dt)throw Error('Native shard tick requires finite time within its wall budget');this.#busy=true;
  try{
   const pending=this.#pending.splice(0),faults:{phase:string;error:unknown}[]=[],actions:NativeShardAction[]=[];let inputs=new Map<string,PlayerInput>(),frame:NativeShardFrameResult|undefined;
   try{inputs=Reflect.apply(this.#drain,this.#net,[]);}catch(error){faults.push({phase:'input',error});}
   for(const row of pending){try{if(this.#seat(row.seatId)===row.seat&&Reflect.apply(this.#epoch,this.#net,[row.seatId])===row.epoch)actions.push({seatId:row.seatId,action:row.action,seq:row.seq,current:()=>this.#seat(row.seatId)===row.seat&&Reflect.apply(this.#epoch,this.#net,[row.seatId])===row.epoch});}catch(error){faults.push({phase:'queued action',error});}}
   try{this.#hooks.beforeSimulation?.(inputs);}catch(error){faults.push({phase:'before simulation',error});}
   try{const result=Reflect.apply(this.#dispatch,this.#runtime,[{dt,wallSeconds,inputs,actions,...(this.#hooks.deferRoadDrain?{deferRoadDrain:true}:{})}]) as NativeShardFrameResult;frame=result;for(const row of result.droppedActions)faults.push({phase:'action '+row.seatId,error:row.error});}catch(error){faults.push({phase:'simulation',error});}
   try{this.#hooks.afterSimulation?.(dt,frame,Object.freeze([...faults]));}catch(error){faults.push({phase:'after simulation',error});}
   this.#ticks++;this.#heartbeat-=dt;let delivered:NativeShardTick['delivered']=Object.freeze([]);
   try{if(this.#runtime.ready){const recipients:Seat[]=[];const rows=own<Seat[]>(this.#runtime.writer,'seats');for(let i=0;i<own<number>(rows,'length');i++){const seat=own<Seat>(rows,i),id=own<string>(seat,'id');if(!Object.getOwnPropertyDescriptor(seat,'keeper')?.value&&Reflect.apply(this.#epoch,this.#net,[id])!==null)recipients.push(seat);}
    if(recipients.length){if(this.#heartbeat<=0){for(const seat of recipients)this.#runtime.writer.metaDirty.add(own<string>(seat,'id'));this.#heartbeat=SHARD_CFG.metaHeartbeatSec;}
     if(this.#ticks%Math.max(1,Math.round(SHARD_CFG.tickHz/SHARD_CFG.stateHz))===0)delivered=this.#publish.publish(++this.#snapTick,recipients);
    }
   }}catch(error){faults.push({phase:'publication',error});}
   try{this.#hooks.afterPublication?.(dt);}catch(error){faults.push({phase:'after publication',error});}
   return Object.freeze({tick:this.#ticks,frame,delivered,faults:Object.freeze(faults)});
  }finally{this.#busy=false;}
 }
 retire():void{if(this.#retired)return;if(this.#busy)throw Error('Native shard frames cannot retire during a tick');this.#retired=true;this.#pending.length=0;for(const dispose of this.#dispose)dispose();}
}
