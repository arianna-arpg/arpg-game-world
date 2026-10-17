/** Server presentation stays with each actual retained area. Legacy World slots
 * remain unavailable; this owner only supplies muster rows and journal marks. */
import type {World,Seat} from '../engine/world';
import type {Actor} from '../engine/actor';
import {NativeAreaActorAuthority} from './nativeAreaActorAuthority';
import {NativeAreaSceneTransitionCoordinator,isNativeAreaSceneTransitionCoordinator} from './nativeAreaSceneTransitionCoordinator';
import type {NativeAreaSceneCombat} from './nativeAreaSceneCombat';
import {assertNativeRetainedWriterLive} from './nativeAreaRetainedLifetime';
type Marks=NonNullable<World['seatCorpseMarks']>;
const owners=new WeakMap<NativeAreaSceneTransitionCoordinator,NativeAreaHostedPresentation>(),used=new WeakSet<object>();
function own<T>(o:object,key:PropertyKey):T{const d=Object.getOwnPropertyDescriptor(o,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native hosted presentation requires ordinary data: '+String(key));return d.value as T;}
function rows<T>(value:T[]):T[]{if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)throw Error('Native hosted presentation needs ordinary rows');const out:T[]=[];for(let i=0;i<own<number>(value,'length');i++)out.push(own(value,i));return out;}
export function nativeAreaHostedPresentation(coordinator:NativeAreaSceneTransitionCoordinator):NativeAreaHostedPresentation|undefined{return owners.get(coordinator);}
export class NativeAreaHostedPresentation {
 readonly #areaFor=NativeAreaSceneTransitionCoordinator.prototype.areaFor;readonly #idle=NativeAreaSceneTransitionCoordinator.prototype.assertIdleFrame;readonly #physical=NativeAreaActorAuthority.prototype.assertFinalPhysical;
 readonly #coordinator:NativeAreaSceneTransitionCoordinator;readonly #writer:World;readonly #marks:Marks;
 readonly #rings=new WeakMap<NativeAreaSceneCombat,World['musterRings']>();#busy=false;#retired=false;
 constructor(coordinator:NativeAreaSceneTransitionCoordinator,corpseMarks:Marks){
  if(!isNativeAreaSceneTransitionCoordinator(coordinator)||used.has(coordinator)||typeof corpseMarks!=='function')throw Error('Native hosted presentation needs one actual unused coordinator and marks provider');
  Reflect.apply(this.#idle,coordinator,[]);this.#coordinator=coordinator;this.#writer=coordinator.input.characterWriter;this.#marks=corpseMarks;assertNativeRetainedWriterLive(this.#writer);used.add(coordinator);owners.set(coordinator,this);
 }
 #area(combat:NativeAreaSceneCombat){if(this.#retired||owners.get(this.#coordinator)!==this)throw Error('Native hosted presentation is retired');assertNativeRetainedWriterLive(this.#writer);const area=Reflect.apply(this.#areaFor,this.#coordinator,[combat]);Reflect.apply(this.#physical,this.#coordinator.input.authority,[area.binding,[]]);return area;}
 setMusterRings(combat:NativeAreaSceneCombat,value:World['musterRings']):void{
  if(this.#busy)throw Error('Native hosted presentation cannot reenter');this.#busy=true;try{Reflect.apply(this.#idle,this.#coordinator,[]);this.#area(combat);
   const copied=value===null?null:rows(value).map(row=>{const result={} as NonNullable<World['musterRings']>[number];for(const key of ['x','y','r','have','need','left','wait'] as const){const v=own<number>(row,key);if(!Number.isFinite(v))throw Error('Native muster row needs finite geometry and time');result[key]=v;}result.party=own<string>(row,'party');if(typeof result.party!=='string')throw Error('Native muster row needs its party');return Object.freeze(result);});
   this.#area(combat);this.#rings.set(combat,copied);
  }finally{this.#busy=false;}
 }
 musterRings(combat:NativeAreaSceneCombat):World['musterRings']{this.#area(combat);const saved=this.#rings.get(combat);return saved?saved.map(row=>({...row})):null;}
 corpseMarks(combat:NativeAreaSceneCombat,seat:Seat):ReturnType<Marks>{
  if(this.#busy)throw Error('Native hosted presentation cannot reenter');this.#busy=true;
  try{const area=this.#area(combat),body=own<Actor>(seat,'actor'),id=own<string>(seat,'id'),meta=own<Seat['meta']>(seat,'meta'),roster=own<Seat[]>(this.#writer,'seats');
   const check=()=>{this.#area(combat);if(own(this.#writer,'seats')!==roster||!rows(roster).includes(seat)||own(seat,'actor')!==body||own(seat,'id')!==id||own(seat,'meta')!==meta)throw Error('Native corpse mark recipient changed');Reflect.apply(this.#physical,this.#coordinator.input.authority,[area.binding,[body]]);};check();
   const value=Reflect.apply(this.#marks,undefined,[seat]);check();const copied=rows(value).map(row=>{const zoneId=own<string>(row,'zoneId'),name=own<string>(row,'name'),classId=own<string>(row,'classId'),level=own<number>(row,'level');if(typeof zoneId!=='string'||typeof name!=='string'||typeof classId!=='string'||!Number.isFinite(level))throw Error('Native corpse mark needs ordinary identity');const m=Object.getOwnPropertyDescriptor(row,'map');let map:{x:number;y:number}|undefined;if(m){if(!Object.hasOwn(m,'value'))throw Error('Native corpse mark map is an accessor');if(m.value!==undefined){const x=own<number>(m.value,'x'),y=own<number>(m.value,'y');if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Native corpse mark map needs finite coordinates');map={x,y};}}return {zoneId,name,classId,level,...(map?{map}:{})};});check();return copied;
  }finally{this.#busy=false;}
 }
 retire():void{if(this.#busy)throw Error('Native hosted presentation cannot retire during a read');if(this.#retired)return;this.#retired=true;owners.delete(this.#coordinator);}
}
