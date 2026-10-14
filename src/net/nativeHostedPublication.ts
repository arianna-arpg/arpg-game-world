import type {Seat} from '../engine/world';
import {NativeAreaHostedSnapshots,isNativeAreaHostedSnapshots} from '../worldmass/nativeAreaHostedSnapshots';
import type {NetTransport} from './transport';
const serialize=NativeAreaHostedSnapshots.prototype.serialize,validate=NativeAreaHostedSnapshots.prototype.assertDelivery;
/** Native snapshots are grouped by area before their actual recipient projection.
 * A failed zone send prevents the state send; the next publication retries it. */
export class NativeHostedPublication {
 readonly #runtime:NativeAreaHostedSnapshots;readonly #transport:NetTransport;
 readonly #zones=new Map<string,{key:string;epoch:object|null|undefined}>();#busy=false;#tick=-1;
 constructor(runtime:NativeAreaHostedSnapshots,transport:NetTransport){if(!isNativeAreaHostedSnapshots(runtime))throw Error('Native hosted publication needs the actual installed runtime');this.#runtime=runtime;this.#transport=transport;}
 publish(tick:number,recipients:readonly Seat[]):readonly {seatId:string;zoneSent:boolean;stateSent:boolean}[]{
  if(this.#busy)throw Error('Native hosted publication cannot reenter');this.#busy=true;
  try{
   if(!Number.isSafeInteger(tick)||tick<=this.#tick)throw Error('Native hosted publication needs an increasing tick');
   const transport=this.#transport;if(!transport.isHost)throw Error('Native hosted publication needs its host transport');
   const zoneSend=transport.sendZoneToSeat,stateSend=transport.sendStateToSeat,epochFor=transport.deliveryEpochForSeat;
   if(typeof zoneSend!=='function'||typeof stateSend!=='function')throw Error('Native hosted transport lacks targeted delivery');
   const deliveries=Reflect.apply(serialize,this.#runtime,[tick,recipients]) as ReturnType<typeof serialize>;
   this.#tick=tick;const live=new Set(deliveries.map(row=>row.seatId));for(const id of this.#zones.keys())if(!live.has(id))this.#zones.delete(id);
   const sent:{seatId:string;zoneSent:boolean;stateSent:boolean}[]=[];
   for(const delivery of deliveries){
    Reflect.apply(validate,this.#runtime,[delivery]);
    const epoch=epochFor?Reflect.apply(epochFor,transport,[delivery.seatId]):undefined;
    const current=()=>{const same=!epochFor||Reflect.apply(epochFor,transport,[delivery.seatId])===epoch;Reflect.apply(validate,this.#runtime,[delivery]);return same;};
    const zoneKey=JSON.stringify(delivery.zone),previous=this.#zones.get(delivery.seatId);let zoneSent=false;
    Reflect.apply(validate,this.#runtime,[delivery]);
    if(epoch===null||!current()){sent.push({seatId:delivery.seatId,zoneSent:false,stateSent:false});continue;}
    if(previous?.key!==zoneKey||previous.epoch!==epoch){
     zoneSent=Reflect.apply(zoneSend,transport,[delivery.zone,delivery.seatId,epoch]);
     Reflect.apply(validate,this.#runtime,[delivery]);
     if(!zoneSent||!current()){sent.push({seatId:delivery.seatId,zoneSent,stateSent:false});continue;}
     this.#zones.set(delivery.seatId,{key:zoneKey,epoch});
    }
    Reflect.apply(validate,this.#runtime,[delivery]);
    const stateSent=current()&&Reflect.apply(stateSend,transport,[delivery.snapshot,delivery.seatId,epoch]);
    Reflect.apply(validate,this.#runtime,[delivery]);sent.push({seatId:delivery.seatId,zoneSent,stateSent});
   }
   // Native broadcast semantics: all seats were serialized before clearing the
   // shared dirty set. Dropped updates recover through the existing heartbeat.
   this.#runtime.writer.metaDirty.clear();return Object.freeze(sent);
  }finally{this.#busy=false;}
 }
}
