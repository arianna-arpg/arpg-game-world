/** Actual per-seat input routing over admitted retained combat owners. */
import type {Actor} from '../engine/actor';
import type {Seat} from '../engine/world';
import type {PlayerInput} from '../net/intent';
import * as core from '../engine/nativeSceneInput';
import {NativeAreaActorAuthority} from './nativeAreaActorAuthority';
import {isNativeAreaSceneCombat,type NativeAreaSceneCombat} from './nativeAreaSceneCombat';
import {assertNativeCombatOwnerEntry,type NativeAreaCombatOwnerEntry} from './nativeAreaCombatOperation';
const active=new WeakSet<object>(),actual=new WeakSet<object>();
const select=NativeAreaActorAuthority.prototype.selectActors,final=NativeAreaActorAuthority.prototype.assertFinalPhysical,finalSelections=NativeAreaActorAuthority.prototype.assertFinalSelections;
function own<T>(o:object,k:PropertyKey):T{const d=Object.getOwnPropertyDescriptor(o,k);if(!d||!Object.hasOwn(d,'value'))throw Error('Native input requires ordinary actual fields: '+String(k));return d.value as T;}
function rows<T>(value:readonly T[]):readonly T[]{if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)throw Error('Native input needs the actual raw campaign roster');const length=own<number>(value,'length');for(let i=0;i<length;i++)own(value,i);return value;}
function contains<T>(members:readonly T[],value:T):boolean{const length=own<number>(members,'length');for(let i=0;i<length;i++)if(own(members,i)===value)return true;return false;}
export class NativeAreaSceneInput {
 readonly #combat:NativeAreaSceneCombat;readonly #entry:NativeAreaCombatOwnerEntry;readonly #host:core.NativeSceneInputHost;
 constructor(combat:NativeAreaSceneCombat,entry:NativeAreaCombatOwnerEntry,host:core.NativeSceneInputHost){if(!isNativeAreaSceneCombat(combat)||!host||typeof host!=='object')throw Error('Native input needs its actual aggregate');assertNativeCombatOwnerEntry(combat,entry);this.#combat=combat;this.#entry=entry;this.#host=host;actual.add(this);}
 #installed():void{const combat=this.#combat;if(own(combat,'inputFrame')!==this||combat.input.coordinator.areaFor(combat).combat!==combat)throw Error('Native input owner was replaced or unregistered');}
 #run<T>(action:()=>T,body?:Actor):T{this.#installed();const combat=this.#combat;return combat.input.coordinator.runFrom(combat.input.coordinator.areaFor(combat),()=>this.#entry(this,{permission:'proc',physical:body?[body]:[]},action));}
 #seat(seat:Seat,body:Actor,id:string,inputs:Map<string,PlayerInput>,dt:number):void{this.#run(()=>{const combat=this.#combat,campaign=combat.input.campaign,members=rows(campaign.seats);if(!contains(members,seat)||own(seat,'actor')!==body||own(seat,'id')!==id)throw Error('Native input seat changed during owner selection');Reflect.apply(final,combat.input.authority,[combat.input.authority.bindingFor(combat.scene),[body]]);core.sceneInputSeat(this.#host,seat,inputs,dt);},body);}
 /** The clock/prefix and final acting-seat clear run once, in native order.
  * A failed seat preserves the original partial effects and acting-seat value. */
 applyInputs(inputs:Map<string,PlayerInput>,dt:number):void{const combat=this.#combat,coordinator=combat.input.coordinator;if(active.has(coordinator))throw Error('Native input cannot reenter');active.add(coordinator);try{this.#installed();coordinator.assertIdleFrame();
  this.#run(()=>core.sceneInputBegin(this.#host,dt));
  const seats=rows(combat.input.campaign.seats);for(let i=0;i<seats.length;i++){const seat=own<Seat>(seats,i),body=own<Actor>(seat,'actor'),id=own<string>(seat,'id'),selected=Reflect.apply(select,combat.input.authority,[[body],false]);if(selected.length!==1)throw Error('Native input needs the actual controlled body');Reflect.apply(finalSelections,combat.input.authority,[selected]);const owner=own<NativeAreaSceneInput>(selected[0].owner.combat,'inputFrame');if(!actual.has(owner)||owner.#combat.input.coordinator!==coordinator)throw Error('Native input selected a foreign campaign');owner.#seat(seat,body,id,inputs,dt);}
  this.#run(()=>core.sceneInputEnd(this.#host));
 }finally{active.delete(coordinator);}}
 passInputTime(sec:number):void{const coordinator=this.#combat.input.coordinator;if(active.has(coordinator))throw Error('Native input cannot reenter its clock');active.add(coordinator);try{this.#installed();coordinator.assertIdleFrame();this.#run(()=>core.scenePassInputTime(this.#host,sec));}finally{active.delete(coordinator);}}
}
