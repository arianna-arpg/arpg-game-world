/** One native ritual allocation and its actual last-occupant departure. */
import type {Actor} from '../engine/actor';
import type {World} from '../engine/world';
import {nativeConclaveBirthCalls,type NativeConclaveBirthReceipt} from '../engine/nativeSceneRuntimeBirth';
import {nativeConclaveLifetimeCalls} from '../packages/overlays/conclave';
import {sceneCaptureZoneMemory,type NativeSceneDepartureMemoryHost} from '../engine/nativeSceneDepartureMemory';
import {sceneSlipAway,type NativeSceneCombatMotionHost} from '../engine/nativeSceneCombatMotion';
import {assertNativeCombatOwnerEntry,type NativeAreaCombatOwnerEntry} from './nativeAreaCombatOperation';
import {isNativeAreaSceneCombat,type NativeAreaSceneCombat} from './nativeAreaSceneCombat';
import {nativeReadyAuthority,nativeUnclaimedActor} from './nativeAreaActorAuthority';
import {nativePopulationFactoryOwner} from './nativeAreaScenePopulation';
import {selectedNativeConclaveDeparture} from './nativeAreaSceneTransitionCoordinator';
import type {NativeAreaSceneDepartureMemory} from './nativeAreaSceneDepartureMemory';
const includes=Array.prototype.includes,setDelete=Set.prototype.delete;

function own<T>(value:object,key:PropertyKey):T {const d=Object.getOwnPropertyDescriptor(value,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native ritual needs an ordinary owned '+String(key));return d.value as T;}
interface Active {departure:NativeAreaSceneDepartureMemory;receipt:NativeConclaveBirthReceipt|undefined;site:World['ritualSite'];last:boolean;actors:Actor[];doodads:World['doodads'];field:World['sim']['conclaveField'];definition:World['zone'];snapshot:boolean}
export class NativeAreaSceneConclaveLifetime {
 readonly #combat:NativeAreaSceneCombat;readonly #entry:NativeAreaCombatOwnerEntry;readonly #physical:NativeSceneCombatMotionHost;
 #active:Active|undefined;readonly #pendingRemoval=new WeakMap<Actor,NativeConclaveBirthReceipt>();readonly #removedPentagrams=new WeakSet<NativeConclaveBirthReceipt>();readonly #paintedPentagrams=new WeakSet<NativeConclaveBirthReceipt>();readonly #consumed=new WeakSet<NativeConclaveBirthReceipt>();readonly #closed=new WeakSet<NativeConclaveBirthReceipt>();
 constructor(combat:NativeAreaSceneCombat,entry:NativeAreaCombatOwnerEntry,physical:NativeSceneCombatMotionHost){if(!isNativeAreaSceneCombat(combat))throw Error('Native ritual requires its genuine combat owner');assertNativeCombatOwnerEntry(combat,entry);this.#combat=combat;this.#entry=entry;this.#physical=physical;}
 #check(a:Active):void {
  const c=this.#combat,birth=c.input.assembly.input.registry.input.birth;
  if(this.#active!==a||selectedNativeConclaveDeparture(c.input.coordinator,c)!==a.last||c.scene.zone!==a.definition||c.scene.actors!==a.actors||c.input.assembly.input.geometry.doodads!==a.doodads||birth.input.state.ritualSite!==a.site||c.input.campaign.sim.conclaveField!==a.field)throw Error('Native ritual departure selection changed');
  if(a.receipt&&(nativeConclaveBirthCalls.read(birth.host)!==a.receipt||a.receipt.site!==a.site||a.receipt.host!==birth.host||a.receipt.definition!==a.definition||a.receipt.field!==a.field||!a.receipt.epoch||own(a.site!,'id')!==a.receipt.id||own(a.site!,'zoneId')!==a.receipt.zoneId||this.#closed.has(a.receipt)))throw Error('Native ritual birth identity changed');
  if(a.receipt){const r=a.receipt,ids=own<readonly number[]>(a.site!,'cultistIds');if(ids!==r.cultistIds||Object.getPrototypeOf(ids)!==Array.prototype||own(ids,'length')!==r.bodyIds.length||r.bodyIds.some((id,i)=>own(ids,i)!==id||own(r.bodies[i],'id')!==id)||typeof own(a.site!,'subdued')!=='boolean')throw Error('Native ritual allocation fields changed');if(!this.#current(r)&&!this.#settled(r))throw Error('Native ritual event identity was replaced');}
  const binding=Reflect.apply(nativeReadyAuthority.binding,c.input.authority,[c.scene]);Reflect.apply(nativeReadyAuthority.physical,c.input.authority,[binding]);
 }
 #settled(r:NativeConclaveBirthReceipt):boolean {return !!r.epoch&&Reflect.apply(nativeConclaveLifetimeCalls.settled,r.field,[r.epoch]);}
 #current(r:NativeConclaveBirthReceipt):boolean {return !!r.epoch&&Reflect.apply(nativeConclaveLifetimeCalls.epoch,r.field,[r.definition.id])===r.epoch;}
 #capture(a:Active):void {
  const base=a.departure.host,self=this,host=Object.create(base) as NativeSceneDepartureMemoryHost;
  const read=<T>(key:keyof NativeSceneDepartureMemoryHost):T=>{self.#check(a);const value=Reflect.get(base,key,base);self.#check(a);return value as T;};
  for(const key of ['adoptedZonePending','forgetMemoryOnLeave'] as const)Object.defineProperty(host,key,{get:()=>read<boolean>(key),set:value=>{self.#check(a);Reflect.set(base,key,value,base);self.#check(a);}});
  for(const key of ['zone','ledger'] as const)Object.defineProperty(host,key,{get:()=>read(key)});
  Object.defineProperty(host,'ritualSite',{get:()=>{self.#check(a);const r=a.receipt;if(!a.last||!r||self.#consumed.has(r)||self.#settled(r))return null;if(!self.#current(r))throw Error('Native ritual event was replaced before departure');return a.site;}});
  for(const key of ['zoneMemorySnapshot','actorById'] as const)Object.defineProperty(host,key,{get:()=>{const fn=read<Function>(key);return(...args:unknown[])=>{self.#check(a);const value=Reflect.apply(fn,base,args);self.#check(a);if(key==='zoneMemorySnapshot')a.snapshot=!!value;return value;};}});
  Object.defineProperty(host,'zoneMemory',{get:()=>{const memory=read<World['zoneMemory']>('zoneMemory'),view=Object.create(memory);for(const key of ['set','delete'] as const)Object.defineProperty(view,key,{get:()=>{self.#check(a);const fn=Reflect.get(memory,key,memory);self.#check(a);return(...args:unknown[])=>{self.#check(a);const value=Reflect.apply(fn,memory,args);self.#check(a);return value;};}});return view;}});
  Object.defineProperty(host,'sim',{get:()=>{const sim=read<World['sim']>('sim'),view=Object.create(sim);Object.defineProperty(view,'conclaveField',{get:()=>{self.#check(a);const field=sim.conclaveField;self.#check(a);if(!field)return field;const selected=Object.create(field);for(const key of ['incubate','clearRitual'] as const)Object.defineProperty(selected,key,{get:()=>{self.#check(a);const fn=Reflect.get(field,key,field);self.#check(a);return(...args:unknown[])=>{self.#check(a);const r=a.receipt;if(!r||!a.last||!self.#current(r)||self.#consumed.has(r))throw Error('Native ritual departure effect lost its exact live event');let failed=false;try{return Reflect.apply(fn,field,args);}catch(error){failed=true;throw error;}finally{if(self.#settled(r))self.#consumed.add(r);if(failed){try{self.#check(a);}catch{ /* Preserve the original selected callback's exception. */ }}else self.#check(a);}};}});return selected;}});return view;}});
  sceneCaptureZoneMemory(host);
 }
 #retire(a:Active,r:NativeConclaveBirthReceipt):void {
  const c=this.#combat,geometry=c.input.assembly.input.geometry,check=()=>{this.#check(a);if(!a.last||!this.#settled(r))throw Error('Native ritual cleanup requires its genuinely settled last departure');};
  check();if(new Set(r.bodies).size!==r.bodies.length||r.bodies.length!==r.bodyIds.length||r.bodies.some((body,i)=>own(body,'id')!==r.bodyIds[i]||!Reflect.apply(nativePopulationFactoryOwner,c.input.assembly.input.population,[body])))throw Error('Native ritual cleanup lost its actual factory bodies');
  for(const body of r.bodies){check();if(!Reflect.apply(includes,a.actors,[body])){
   let released=false;try{Reflect.apply(nativeUnclaimedActor,c.input.authority,[body]);released=true;}catch{}
   if(!released){if(this.#pendingRemoval.get(body)!==r)throw Error('Native ritual absent body has no selected removal receipt');this.#entry(this,{permission:'proc',physical:[],sources:[]},()=>{check();const retire=this.#physical.retireCombatBody;check();Reflect.apply(retire,this.#physical,[body]);check();});Reflect.apply(nativeUnclaimedActor,c.input.authority,[body]);}
   this.#pendingRemoval.delete(body);continue;
  }
   const binding=Reflect.apply(nativeReadyAuthority.binding,c.input.authority,[c.scene]);Reflect.apply(nativeReadyAuthority.physical,c.input.authority,[binding,[body]]);
   this.#entry(this,{permission:'proc',physical:[body],sources:[]},()=>{
    const live=this.#physical,host=Object.create(live) as NativeSceneCombatMotionHost;
    const present=()=>{check();Reflect.apply(nativeReadyAuthority.physical,c.input.authority,[binding,[body]]);};
    Object.defineProperty(host,'actors',{get:()=>{present();const actors=live.actors;present();const owner=this;return new Proxy(actors,{get(target,key){const value=Reflect.get(target,key,target);present();if(key!=='indexOf'&&key!=='splice')return value;return(...args:unknown[])=>{present();if(key==='indexOf'){const result=Reflect.apply(value,target,args);present();return result;}let failed=false;try{return Reflect.apply(value,target,args);}catch(error){failed=true;throw error;}finally{if(!Reflect.apply(includes,target,[body]))owner.#pendingRemoval.set(body,r);if(failed){try{check();}catch{}}else check();}};}});}});
    for(const key of ['despawnPartsOf','retireCombatBody','text'] as const)Object.defineProperty(host,key,{get:()=>{const fn=Reflect.get(live,key);check();return(...args:unknown[])=>{check();const value=Reflect.apply(fn,live,args);check();return value;};}});
    Object.defineProperty(host,'flashes',{get:()=>{check();const flashes=live.flashes;check();return new Proxy(flashes,{get(target,key){const value=Reflect.get(target,key,target);check();return key==='push'?(...args:unknown[])=>{check();const result=Reflect.apply(value,target,args);check();return result;}:value;}});}});sceneSlipAway(host,body,'');
   });
   check();if(Reflect.apply(includes,a.actors,[body]))throw Error('Native ritual retirement left its body');Reflect.apply(nativeUnclaimedActor,c.input.authority,[body]);this.#pendingRemoval.delete(body);
  }
  check();const doodads=a.doodads,selectedIndex=doodads.indexOf;check();const index=Reflect.apply(selectedIndex,doodads,[r.pentagram]);check();if(index<0&&!this.#removedPentagrams.has(r))throw Error('Native ritual pentagram disappeared without selected removal');if(index>=0){const selectedSplice=doodads.splice;check();if(own(doodads,index)!==r.pentagram)throw Error('Native ritual selected pentagram changed');let failed=false;try{Reflect.apply(selectedSplice,doodads,[index,1]);}catch(error){failed=true;throw error;}finally{if(!Reflect.apply(includes,doodads,[r.pentagram]))this.#removedPentagrams.add(r);if(failed){try{check();}catch{}}else check();}}
  if(Reflect.apply(includes,doodads,[r.pentagram]))throw Error('Native ritual retirement left its pentagram');
  if(this.#removedPentagrams.has(r)&&!this.#paintedPentagrams.has(r)){const changed=geometry.markDoodadsChanged;check();Reflect.apply(changed,geometry,[]);check();this.#paintedPentagrams.add(r);}
  const state=c.input.assembly.input.registry.input.birth.input.state;check();state.ritualSite=null;Reflect.apply(setDelete,state.materializedRituals,[`${r.id}@${r.zoneId}`]);this.#closed.add(r);
 }
 capture(departure:NativeAreaSceneDepartureMemory):void {
  if(this.#active||departure.ongoing.combat!==this.#combat)throw Error('Native ritual departure cannot borrow or reenter');
  const c=this.#combat,birth=c.input.assembly.input.registry.input.birth,site=birth.input.state.ritualSite,receipt=site?nativeConclaveBirthCalls.read(birth.host):undefined;
  if(site&&(!receipt||receipt.site!==site))throw Error('Native ritual departure has no actual birth receipt');
  const a:Active={departure,site,receipt,last:selectedNativeConclaveDeparture(c.input.coordinator,c),actors:c.scene.actors,doodads:c.input.assembly.input.geometry.doodads,field:c.input.campaign.sim.conclaveField,definition:c.scene.zone,snapshot:false};this.#active=a;
  let failed=false,error:unknown;try{this.#check(a);this.#capture(a);}catch(e){failed=true;error=e;}
  try{if(a.last&&receipt&&(a.snapshot||this.#consumed.has(receipt))&&this.#settled(receipt)){this.#consumed.add(receipt);this.#retire(a,receipt);}}catch(e){if(!failed){failed=true;error=e;}}finally{this.#active=undefined;}
  if(failed)throw error;
 }
}
