import {captureNativeActorConstruction} from '../engine/nativeActorConstruction';
/** Admit only privately attested factory bodies at explicit native insertion points.
 * Raw census identity and native partial writes remain intact. */
import type {Actor} from '../engine/actor';
import {NativeAreaActorAuthority,type NativeAreaAuthorityBinding} from './nativeAreaActorAuthority';
import {NativeAreaScenePopulation,nativeBirthAsyncResult,type NativeSceneCensus} from './nativeAreaScenePopulation';
export interface NativeSceneBirthAdmissionInput {
 authority:NativeAreaActorAuthority<object>;scene:NativeSceneCensus;population:NativeAreaScenePopulation;
}
interface BirthFrame {readonly finalAdmission:boolean;active:boolean;pending:Set<Actor>;binding:NativeAreaAuthorityBinding<object>;parent:BirthFrame|null}
interface BirthScopes {population:NativeAreaScenePopulation;top:BirthFrame|null;binding:NativeAreaAuthorityBinding<object>|null}
// Controllers in the same actual area share a stack, never an ambient depth permission.
const scopes=new WeakMap<NativeAreaActorAuthority<object>,WeakMap<NativeSceneCensus,BirthScopes>>();
const finalBirthBinding=NativeAreaActorAuthority.prototype.bindingFor,finalBirthPhysical=NativeAreaActorAuthority.prototype.assertFinalPhysical;
const createMonsterForAdmission=NativeAreaScenePopulation.prototype.createMonsterForAdmission;
export class NativeAreaSceneBirthAdmission {
 readonly input:NativeSceneBirthAdmissionInput;
 readonly #scope:BirthScopes;
 constructor(raw:NativeSceneBirthAdmissionInput){
  const roots=Object.create(null);
  for(const key of ['authority','scene','population']){
   const d=raw&&Object.getOwnPropertyDescriptor(raw,key);
   if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native birth admission needs own object binding: '+key);
   roots[key]=d.value;
  }
  const input:NativeSceneBirthAdmissionInput=this.input=Object.freeze(roots);
  if(!(input.population instanceof NativeAreaScenePopulation)||input.population.input.scene!==input.scene)throw Error('Native birth admission needs the identical population census');
  if(input.population.input.campaign as object!==input.authority.campaign)throw Error('Native birth admission needs the identical campaign authority');
  let scenes=scopes.get(input.authority);if(!scenes)scopes.set(input.authority,scenes=new WeakMap());
  let scope=scenes.get(input.scene);
  if(scope&&scope.population!==input.population)throw Error('Native birth admission cannot replace an area population');
  if(!scope)scenes.set(input.scene,scope={population:input.population,top:null,binding:null});
  this.#scope=scope;Object.defineProperty(this,'input',{writable:false,configurable:false});
 }
 #active(frame:BirthFrame|null):asserts frame is BirthFrame {
  if(!frame?.active||this.#scope.top!==frame)throw Error('Native population birth needs an active admission operation in its exact top frame');
  if((frame.finalAdmission?Reflect.apply(finalBirthBinding,this.input.authority,[this.input.scene]):this.input.authority.bindingFor(this.input.scene))!==frame.binding)throw Error('Native birth admission authority changed during operation');
 }
 /** Select the live callable before arguments; retain its receiver without reading fn.apply. */
 get createMonster():NativeAreaScenePopulation['createMonster']{
  const frame=this.#scope.top;this.#active(frame);
  const population=this.input.population,fn=population.createMonster;
  return (...args)=>{
   this.#active(frame);
   const body=Reflect.apply(createMonsterForAdmission,population,[fn,args]);
   this.#active(frame);
   if(this.input.scene.actors.includes(body)||frame.pending.has(body))throw Error('Native birth factory requires a fresh uninserted body');
   this.input.authority.assertUnclaimed(body);frame.pending.add(body);return body;
  };
 }
 /** A non-granting exact-frame query for the aggregate's private pre-insertion
  * stat scope. A matching body shape or another frame never suffices. */
 isPending(body:Actor):boolean {const frame=this.#scope.top;this.#active(frame);return frame.pending.has(body)&&!this.input.scene.actors.includes(body);}
 /** Direct native new-Actor expressions mint at the real constructor seam.
  * The returned identity must be new in this precise synchronous capture. */
 constructActor(construct:()=>Actor):Actor {const frame=this.#scope.top;this.#active(frame);const result=captureNativeActorConstruction(construct);if(nativeBirthAsyncResult(result.value))throw Error('Native direct birth requires a synchronous constructor');this.#active(frame);const body=result.value;if(!result.created.has(body)||frame.pending.has(body)||this.input.scene.actors.includes(body))throw Error('Native direct birth needs its exact new Actor construction');this.input.authority.assertUnclaimed(body);frame.pending.add(body);return body;}
 /** An explicit hook follows the native push, before any subsequent native effect. */
 admitInserted(body:Actor):void {
  const frame=this.#scope.top;this.#active(frame);
  if(!frame.pending.has(body))throw Error('Native birth insertion needs an unused body from its exact creation scope');
  if(!this.input.scene.actors.includes(body))throw Error('Native birth insertion needs its actual inserted body');
  this.input.authority.assertUnclaimed(body);
  Reflect.apply(NativeAreaActorAuthority.prototype.claimInserted,this.input.authority,[frame.binding,body]);frame.pending.delete(body);
 }
 #publish(frame:BirthFrame):void{
  this.#active(frame);
  const born=[...frame.pending].filter(body=>this.input.scene.actors.includes(body));
  if(born.length){this.input.authority.claim(frame.binding,born);for(const body of born)frame.pending.delete(body);}
 }
 run<T>(operation:()=>T):T{return this.#run(operation,false);}
 /** The complete aggregate already requires ordinary physical descriptors. Its
  * admission checks cannot invoke selected census iterators around native work. */
 runFinal<T>(operation:()=>T):T{return this.#run(operation,true);}
 #run<T>(operation:()=>T,finalAdmission:boolean):T{
  const {authority,scene}=this.input,scope=this.#scope,binding=finalAdmission?Reflect.apply(finalBirthBinding,authority,[scene]):authority.bindingFor(scene);
  if(scope.binding&&scope.binding!==binding)throw Error('Native birth admission cannot reuse a retired authority');
  scope.binding=binding;
  // A genuinely recorded outer birth may precede entry into another local driver.
  if(scope.top)this.#publish(scope.top);
  if(finalAdmission)Reflect.apply(finalBirthPhysical,authority,[binding]);else authority.assertAdmitted(scene);
  const frame:BirthFrame={finalAdmission,active:true,pending:new Set(),binding,parent:scope.top};scope.top=frame;let completed=false;
  try{
   const result=operation();
   if(nativeBirthAsyncResult(result))throw Error('Native birth admission requires a synchronous operation');
   completed=true;return result;
  }finally{
   let finalized=false;
   try{this.#publish(frame);if(finalAdmission)Reflect.apply(finalBirthPhysical,authority,[binding]);else authority.assertAdmitted(scene);finalized=true;}
   finally{
    frame.active=false;scope.top=frame.parent;
    // Native procession creation returns uninserted bodies to its active outer
    // operation. Only successful nested work transfers those private receipts.
    if(completed&&finalized&&frame.parent?.active)for(const body of frame.pending)frame.parent.pending.add(body);
    frame.pending.clear();
   }
  }
 }
}
