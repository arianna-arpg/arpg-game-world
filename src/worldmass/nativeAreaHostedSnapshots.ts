import {isNativeWorld,type World,type Seat} from '../engine/world';
import type {Actor} from '../engine/actor';
import {NativeAreaActorAuthority,type NativeAreaActorSelection} from './nativeAreaActorAuthority';
import type {NativeAreaSceneTransitionCoordinator} from './nativeAreaSceneTransitionCoordinator';
import type {NativeAreaSceneCombat} from './nativeAreaSceneCombat';
import {serializeNativeHostedArea,nativeHostedCoordinator} from './nativeHostedSerialization';
import type {NativeAreaOngoingRuntime,NativeAreaSceneOngoing} from './nativeAreaSceneOngoing';
import {ownEntryView,type StateSnapshot,type ZoneMsg} from '../net/snapshot';
import {seatAudienceSplit,seatAudienceFor} from '../net/seatView';
const select=NativeAreaActorAuthority.prototype.selectActors,final=NativeAreaActorAuthority.prototype.assertFinalSelections,physical=NativeAreaActorAuthority.prototype.assertFinalPhysical;
const owners=new WeakMap<World,NativeAreaHostedSnapshots>(),actual=new WeakSet<object>();
function own<T>(o:object,key:PropertyKey):T{const d=Object.getOwnPropertyDescriptor(o,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native hosted wire needs ordinary actual data: '+String(key));return d.value as T;}
function roster(writer:World):Seat[]{const rows=own<Seat[]>(writer,'seats');if(!Array.isArray(rows)||Object.getPrototypeOf(rows)!==Array.prototype)throw Error('Native hosted wire needs its raw roster');for(let i=0;i<own<number>(rows,'length');i++)own(rows,i);return rows;}
function member(rows:readonly Seat[],seat:Seat):boolean{for(let i=0;i<own<number>(rows,'length');i++)if(own(rows,i)===seat)return true;return false;}
interface Capture{seat:Seat;id:string;body:Actor;rows:Seat[];selection:readonly NativeAreaActorSelection<NativeAreaOngoingRuntime>[];area:NativeAreaSceneOngoing}
export interface NativeHostedDelivery{readonly seatId:string;readonly zone:ZoneMsg;readonly snapshot:StateSnapshot}
export function isNativeAreaHostedSnapshots(value:unknown):value is NativeAreaHostedSnapshots{return !!value&&typeof value==='object'&&actual.has(value);}
/** One native wire authority for one genuine retained campaign. No writer scene swap. */
export class NativeAreaHostedSnapshots{
 readonly writer:World;readonly #coordinator:NativeAreaSceneTransitionCoordinator;readonly #authority:NativeAreaActorAuthority<NativeAreaOngoingRuntime>;
 #busy=false;#generation=0;readonly #deliveries=new WeakMap<NativeHostedDelivery,{generation:number;capture:Capture}>();
 constructor(input:{writer:World;coordinator:NativeAreaSceneTransitionCoordinator;authority:NativeAreaActorAuthority<NativeAreaOngoingRuntime>}){
  const writer=own<World>(input,'writer'),coordinator=own<NativeAreaSceneTransitionCoordinator>(input,'coordinator'),authority=own<NativeAreaActorAuthority<NativeAreaOngoingRuntime>>(input,'authority');
  if(!isNativeWorld(writer)||owners.has(writer)||!nativeHostedCoordinator().is(coordinator))throw Error('Native hosted wire needs its one actual retained campaign');
  const roots=own<NativeAreaSceneTransitionCoordinator['input']>(coordinator,'input');if(roots.characterWriter!==writer||roots.authority!==authority||roots.campaign!==authority.campaign)throw Error('Native hosted wire roots differ');
  this.writer=writer;this.#coordinator=coordinator;this.#authority=authority;Object.defineProperty(this,'writer',{writable:false,configurable:false});owners.set(writer,this);actual.add(this);
 }
 #live():void{if(owners.get(this.writer)!==this)throw Error('Native hosted wire owner changed');Reflect.apply(nativeHostedCoordinator().idle,this.#coordinator,[]);}
 #capture(seat:Seat):Capture{const rows=roster(this.writer);if(!member(rows,seat))throw Error('Native hosted recipient left campaign');const body=own<Actor>(seat,'actor'),id=own<string>(seat,'id'),selection=Reflect.apply(select,this.#authority,[[body],false]) as NativeAreaActorSelection<NativeAreaOngoingRuntime>[];if(selection.length!==1)throw Error('Native hosted recipient needs one physical owner');const area=Reflect.apply(nativeHostedCoordinator().areaFor,this.#coordinator,[selection[0].owner.combat]) as NativeAreaSceneOngoing;return{seat,id,body,rows,selection,area};}
 #final(rows:readonly Capture[]):void{for(const row of rows)Reflect.apply(final,this.#authority,[row.selection]);this.#live();for(const row of rows){if(roster(this.writer)!==row.rows||!member(row.rows,row.seat)||own(row.seat,'id')!==row.id||own(row.seat,'actor')!==row.body)throw Error('Native hosted recipient changed after validation');Reflect.apply(physical,this.#authority,[row.selection[0].binding,[row.body]]);}}
 serialize(tick:number,recipients:readonly Seat[]):readonly NativeHostedDelivery[]{
  if(this.#busy)throw Error('Native hosted wire cannot reenter');this.#busy=true;
  try{this.#live();if(!Number.isSafeInteger(tick)||tick<0)throw Error('Native hosted tick must be an ordinary nonnegative integer');if(!Reflect.apply(nativeHostedCoordinator().ready,this.#coordinator,[]))throw Error('Native hosted wire needs admitted publication');this.#live();if(!Array.isArray(recipients)||Object.getPrototypeOf(recipients)!==Array.prototype)throw Error('Native hosted recipients need an ordinary cohort');
   const generation=++this.#generation,selected:Capture[]=[],seen=new Set<Seat>(),ids=new Set<string>();for(let i=0;i<own<number>(recipients,'length');i++){const seat=own<Seat>(recipients,i);if(seen.has(seat))throw Error('Duplicate native hosted recipient');seen.add(seat);const row=this.#capture(seat),keeper=Object.getOwnPropertyDescriptor(seat,'keeper');if(keeper&&!Object.hasOwn(keeper,'value'))throw Error('Native hosted keeper policy needs ordinary data');if(!keeper&&Object.getPrototypeOf(seat)!==Object.prototype&&Object.getPrototypeOf(seat)!==null)throw Error('Native hosted keeper policy needs an ordinary Seat');if(ids.has(row.id)||keeper?.value)throw Error('Native hosted recipient needs a unique player seat');ids.add(row.id);selected.push(row);}this.#final(selected);
   const frames=new Map<NativeAreaSceneOngoing,ReturnType<NativeAreaSceneCombat['serializeHostedArea']>>();for(const row of selected)if(!frames.has(row.area)){this.#final(selected);const frame:ReturnType<NativeAreaSceneCombat['serializeHostedArea']>=serializeNativeHostedArea(row.area.combat,tick);this.#final(selected);frames.set(row.area,frame);}
   const deliveries:NativeHostedDelivery[]=[];for(const row of selected){const frame=frames.get(row.area)!,audience=seatAudienceSplit(frame.snapshot),snapshot=audience?{...audience.shared,...seatAudienceFor(audience,row.id)}:ownEntryView(frame.snapshot,row.id),delivery=Object.freeze({seatId:row.id,zone:frame.zone,snapshot});this.#deliveries.set(delivery,{generation,capture:row});deliveries.push(delivery);}this.#final(selected);return Object.freeze(deliveries);
  }finally{this.#busy=false;}
 }
 assertDelivery(delivery:NativeHostedDelivery):void{if(this.#busy)throw Error('Native hosted wire cannot reenter');this.#busy=true;try{this.#live();const receipt=this.#deliveries.get(delivery);if(!receipt||receipt.generation!==this.#generation)throw Error('Native hosted delivery has expired');this.#final([receipt.capture]);}finally{this.#busy=false;}}
}
