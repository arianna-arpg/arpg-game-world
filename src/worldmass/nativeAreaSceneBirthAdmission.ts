/** Enroll only bodies returned by the real population factory and inserted by a
 * synchronous native operation. Neighbor observers and arbitrary census additions
 * never acquire authority through a sweep of the scene. */
import type {Actor} from '../engine/actor';
import type {NativeAreaActorAuthority,NativeAreaAuthorityBinding} from './nativeAreaActorAuthority';
import type {NativeAreaScenePopulation,NativeSceneCensus} from './nativeAreaScenePopulation';
export interface NativeSceneBirthAdmissionInput {
 authority:NativeAreaActorAuthority<object>;scene:NativeSceneCensus;population:NativeAreaScenePopulation;
}
interface PendingBirths {
 population:NativeAreaScenePopulation;depth:number;pending:Set<Actor>;
 binding:NativeAreaAuthorityBinding<object>|null;
}
// One scope per real area/authority, even when a watcher calls a rescue driver.
const scopes=new WeakMap<NativeAreaActorAuthority<object>,WeakMap<NativeSceneCensus,PendingBirths>>();
export class NativeAreaSceneBirthAdmission {
 readonly input:NativeSceneBirthAdmissionInput;
 readonly #scope:PendingBirths;
 constructor(raw:NativeSceneBirthAdmissionInput){
  const roots=Object.create(null);
  for(const key of ['authority','scene','population']){
   const d=raw&&Object.getOwnPropertyDescriptor(raw,key);
   if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native birth admission needs own object binding: '+key);
   roots[key]=d.value;
  }
  const input:NativeSceneBirthAdmissionInput=this.input=Object.freeze(roots);
  if(input.population.input.scene!==input.scene)throw Error('Native birth admission needs the identical population census');
  if(input.population.input.campaign as object!==input.authority.campaign)throw Error('Native birth admission needs the identical campaign authority');
  let scenes=scopes.get(input.authority);if(!scenes)scopes.set(input.authority,scenes=new WeakMap());
  let scope=scenes.get(input.scene);
  if(scope&&scope.population!==input.population)throw Error('Native birth admission cannot replace an area population');
  if(!scope)scenes.set(input.scene,scope={population:input.population,depth:0,pending:new Set(),binding:null});
  this.#scope=scope;Object.defineProperty(this,'input',{writable:false,configurable:false});
 }
 /** Select the live factory before its arguments, preserving the provider receiver. */
 get createMonster():NativeAreaScenePopulation['createMonster']{
  const population=this.input.population,fn=population.createMonster;
  return (...args)=>{
   if(!this.#scope.depth)throw Error('Native population birth needs an active admission operation');
   const body=fn.apply(population,args);this.#scope.pending.add(body);return body;
  };
 }
 #publish(binding:NativeAreaAuthorityBinding<object>):void{
  const {authority,scene}=this.input;
  if(authority.bindingFor(scene)!==binding)throw Error('Native birth admission authority changed during operation');
  const born=[...this.#scope.pending].filter(body=>scene.actors.includes(body));
  if(born.length){authority.claim(binding,born);for(const body of born)this.#scope.pending.delete(body);}
 }
 run<T>(operation:()=>T):T{
  const {authority,scene}=this.input,scope=this.#scope,binding=authority.bindingFor(scene);
  if(scope.binding&&scope.binding!==binding)throw Error('Native birth admission cannot reuse a retired authority');
  scope.binding=binding;
  // An outer native operation may have inserted its body before invoking another
  // local driver. Publish only those recorded births before the next guard.
  if(scope.depth)this.#publish(binding);
  authority.assertAdmitted(scene);scope.depth++;
  try{return operation();}
  finally{
   try{this.#publish(binding);authority.assertAdmitted(scene);}
   finally{if(!--scope.depth)scope.pending.clear();}
  }
 }
}
