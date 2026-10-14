import {assertNativeCharacterReceipt,type NativeCharacterCreationReceipt} from './nativeAreaCharacterCreation';
/** A fixed preparation cohort becomes physical attendance only after explicit admission. */
import type {Seat} from '../engine/world';
import type {NativeSceneCensus} from './nativeAreaScenePopulation';
import {NativeAreaActorAuthority,type NativeAreaAuthorityBinding} from './nativeAreaActorAuthority';
const finalPresencePhysical=NativeAreaActorAuthority.prototype.assertFinalPhysical;
export class NativeAreaScenePresence {
 readonly scene:NativeSceneCensus;
 readonly campaign:{readonly seats:readonly Seat[]};
 #birthSeats:readonly Seat[];
 #authority?:NativeAreaActorAuthority<object>;
 #binding?:NativeAreaAuthorityBinding<object>;
 constructor(scene:NativeSceneCensus,campaign:{readonly seats:readonly Seat[]},birthSeats:readonly Seat[]){
  if(new Set(birthSeats).size!==birthSeats.length||birthSeats.some(s=>!campaign.seats.includes(s)||!scene.actors.includes(s.actor)))throw Error('Native preparation presence needs an explicit scene cohort');
  this.scene=scene;this.campaign=campaign;this.#birthSeats=Object.freeze([...birthSeats]);
  for(const key of ['scene','campaign'])Object.defineProperty(this,key,{writable:false,configurable:false});
 }
 /** Exactly the native-created seat joins the still-unadmitted birth cohort after its original census push. */
 includeInitialCharacter(token:NativeCharacterCreationReceipt):void {const r=assertNativeCharacterReceipt(token,'birth');if(r.area?.assembly.scenePresence!==this||r.area.assembly.input.scene!==this.scene||r.preparation.input.session.campaign!==this.campaign||this.#authority||this.#birthSeats.length||this.campaign.seats.length!==1||this.campaign.seats[0]!==r.seat||this.scene.actors.length!==1||this.scene.actors[0]!==r.seat.actor)throw Error('Native character birth cohort differs');this.#birthSeats=Object.freeze([r.seat]);}
 get active():boolean{return !!this.#authority;}
 get seats():Seat[]{
  if(this.#authority)return this.#authority.seatsFor(this.#binding!);
  // Preparation observers are not admission. New campaign seats cannot join this
  // fixed cohort, and removed controlled bodies cannot continue receiving effects.
  return this.#birthSeats.filter(s=>this.scene.actors.includes(s.actor));
 }
 /** Verify the exact existing admission without acquiring or replacing it. */
 assertAuthority(authority:NativeAreaActorAuthority<object>):void{
  if(this.#authority!==authority||this.#binding!==authority.bindingFor(this.scene))throw Error('Native presence authority differs');
  authority.assertAdmitted(this.scene);
 }
 /** Private admission identity only; no census check and no acquisition. */
 assertAuthorityIdentity(authority:NativeAreaActorAuthority<object>,binding:NativeAreaAuthorityBinding<object>):void {if(this.#authority!==authority||this.#binding!==binding)throw Error('Native presence authority differs');}
 /** Callback-free preparation for the exact admission's later presence commit. */
 assertFinalActivation(authority:NativeAreaActorAuthority<object>,binding:NativeAreaAuthorityBinding<object>):void {
  if(authority.campaign!==this.campaign||binding.scene!==this.scene)throw Error('Native final presence needs identical roots');
  if(this.#authority&&this.#authority!==authority)throw Error('Native presence authority cannot be replaced');
  if(this.#binding&&this.#binding!==binding)throw Error('Native presence binding cannot be replaced');
 }
 activateFinal(authority:NativeAreaActorAuthority<object>,binding:NativeAreaAuthorityBinding<object>):void {
  Reflect.apply(finalPresenceValidation,this,[authority,binding]);Reflect.apply(finalPresencePhysical,authority,[binding]);this.#authority=authority;this.#binding=binding;
 }
 activate(authority:NativeAreaActorAuthority<object>):void{
  if(authority.campaign!==this.campaign)throw Error('Native presence needs identical campaign authority');
  if(this.#authority&&this.#authority!==authority)throw Error('Native presence authority cannot be replaced');
  const binding=authority.bindingFor(this.scene);authority.assertAdmitted(this.scene);
  if(this.#binding&&this.#binding!==binding)throw Error('Native presence binding cannot be replaced');
  this.#authority=authority;this.#binding=binding;
 }
}

const finalPresenceValidation=NativeAreaScenePresence.prototype.assertFinalActivation;

export const nativeReadyPresence=Object.freeze({active:Object.getOwnPropertyDescriptor(NativeAreaScenePresence.prototype,'active')!.get!,assert:NativeAreaScenePresence.prototype.assertAuthority,identity:NativeAreaScenePresence.prototype.assertAuthorityIdentity});
