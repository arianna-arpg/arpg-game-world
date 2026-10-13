import type {Seat} from '../engine/world';
import {NativeAreaHostedSnapshots,isNativeAreaHostedSnapshots} from '../worldmass/nativeAreaHostedSnapshots';
import type {NetTransport} from './transport';
const serialize=NativeAreaHostedSnapshots.prototype.serialize,validate=NativeAreaHostedSnapshots.prototype.assertDelivery;
/** Native snapshots are grouped by area before their actual recipient projection.
 * A failed zone send prevents the state send; the next publication retries it. */
export class NativeHostedPublication {
 readonly #runtime:NativeAreaHostedSnapshots;readonly #transport:NetTransport;
 readonly #zones=new Map<string,string>();#busy=false;#tick=-1;
 constructor(runtime:NativeAreaHostedSnapshots,transport:NetTransport){if(!isNativeAreaHostedSnapshots(runtime))throw Error('Native hosted publication needs the actual installed runtime');this.#runtime=runtime;this.#transport=transport;}
 publish(tick:number,recipients:readonly Seat[]):readonly {seatId:string;zoneSent:boolean;stateSent:boolean}[]{
  if(this.#busy)throw Error('Native hosted publication cannot reenter');this.#busy=true;
  try{if(!Number.isSafeInteger(tick)||tick<=this.#tick)throw Error('Native hosted publication needs an increasing tick');const transport=this.#transport;if(!transport.isHost)throw Error('Native hosted publication needs its host transport');const zoneSend=transport.sendZoneToSeat,stateSend=transport.sendStateToSeat;if(typeof zoneSend!=='function'||typeof stateSend!=='function')throw Error('Native hosted transport lacks targeted delivery');
   const deliveries=Reflect.apply(serialize,this.#runtime,[tick,recipients]) as ReturnType<typeof serialize>;this.#tick=tick;const sent:{seatId:string;zoneSent:boolean;stateSent:boolean}[]=[];
   for(const delivery of deliveries){Reflect.apply(validate,this.#runtime,[delivery]);const zoneKey=JSON.stringify(delivery.zone);let zoneSent=false;if(this.#zones.get(delivery.seatId)!==zoneKey){zoneSent=Reflect.apply(zoneSend,transport,[delivery.zone,delivery.seatId]);Reflect.apply(validate,this.#runtime,[delivery]);if(!zoneSent){sent.push({seatId:delivery.seatId,zoneSent:false,stateSent:false});continue;}this.#zones.set(delivery.seatId,zoneKey);}Reflect.apply(validate,this.#runtime,[delivery]);const stateSent=Reflect.apply(stateSend,transport,[delivery.snapshot,delivery.seatId]);Reflect.apply(validate,this.#runtime,[delivery]);sent.push({seatId:delivery.seatId,zoneSent,stateSent});}
   // Native broadcast semantics: all seats were serialized before clearing the
   // shared dirty set. Dropped updates recover through the existing heartbeat.
   this.#runtime.writer.metaDirty.clear();return Object.freeze(sent);
  }finally{this.#busy=false;}
 }
}
