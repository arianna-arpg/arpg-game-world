import type {RoadTicket} from '../src/engine/shardUnits';
import type {NativeAreaSceneCombat} from '../src/worldmass/nativeAreaSceneCombat';
/** Original muster rules over actual retained areas and their nominal road makers. */
import type {World,Seat} from '../src/engine/world';
import type {Actor} from '../src/engine/actor';
import type {MusterRoad} from '../src/engine/shardMuster';
import type {NativeAreaRoadDestination} from '../src/worldmass/nativeAreaRoadDestination';
import {NativeAreaHostedPresentation,nativeAreaHostedPresentation} from '../src/worldmass/nativeAreaHostedPresentation';
import {NativeAreaSceneTransitionCoordinator} from '../src/worldmass/nativeAreaSceneTransitionCoordinator';
import {NativeAreaActorAuthority} from '../src/worldmass/nativeAreaActorAuthority';
import type {NativeAreaSceneOngoing} from '../src/worldmass/nativeAreaSceneOngoing';
import {assertNativeRetainedWriterLive} from '../src/worldmass/nativeAreaRetainedLifetime';
import {NativeShardRuntime,isNativeShardRuntime} from './nativeShardRuntime';
import {NativeShardSeats} from './nativeShardSeats';
import {MusterDesk,type MusterHooks} from './muster';
import type {MusterArea,MusterAreas} from './musterAreas';
import type {PartyDesk} from './party';
function own<T>(o:object,key:PropertyKey):T{const d=Object.getOwnPropertyDescriptor(o,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native muster needs ordinary selected data: '+String(key));return d.value as T;}
export class NativeShardMuster {
 readonly #coordinator:NativeAreaSceneTransitionCoordinator;readonly #writer:World;readonly #seats:NativeShardSeats;readonly #presentation:NativeAreaHostedPresentation;readonly #desk:MusterDesk<NativeAreaRoadDestination>;
 readonly #units=new WeakMap<NativeAreaSceneOngoing,MusterArea>();readonly #areas=new WeakMap<MusterArea,NativeAreaSceneOngoing>();#retired=false;#busy=false;
 readonly #areaFor=NativeAreaSceneTransitionCoordinator.prototype.areaFor;readonly #physical=NativeAreaActorAuthority.prototype.assertFinalPhysical;readonly #idle=NativeAreaSceneTransitionCoordinator.prototype.assertIdleFrame;
 constructor(runtime:NativeShardRuntime,parties:PartyDesk,presentation:NativeAreaHostedPresentation,hooks:MusterHooks){if(!isNativeShardRuntime(runtime))throw Error('Native muster needs its actual keeper runtime');this.#seats=new NativeShardSeats(runtime);this.#writer=own(runtime,'writer');const area=Reflect.apply(Object.getOwnPropertyDescriptor(NativeShardRuntime.prototype,'current')!.get!,runtime,[]) as NativeAreaSceneOngoing;this.#coordinator=area.combat.input.coordinator;this.#presentation=presentation;if(nativeAreaHostedPresentation(this.#coordinator)!==presentation)throw Error('Native muster needs its actual presentation owner');this.#live();
 const units:MusterAreas<NativeAreaRoadDestination>=Object.freeze({musterAreas:true as const,unitOf:(id:string)=>{this.#live();const seat=this.#seats.seatOf(id);if(!seat)return;return this.#unit(this.#selected(seat).area);},unit:(key:string)=>{this.#live();const area=this.#coordinator.residentAreas().find(a=>a.combat.scene.zone.id===key);return area&&this.#unit(area);},each:()=>{this.#live();return this.#coordinator.residentAreas().map(a=>this.#unit(a));},run:<T>(unit:MusterArea,fn:()=>T):T=>{const area=this.#actual(unit);return this.#coordinator.runFrom(area,()=>{const check=this.#cohort(area);check();const result=fn();check();return result;});},enqueue:(ticket:RoadTicket<NativeAreaRoadDestination>)=>{const seat=this.#seats.seatOf(ticket.seatId);if(!seat)throw Error('Native muster ticket lost its actual member');const {area,check}=this.#selected(seat),link=this.#coordinator.roadsFor(area.combat).shardWorld;check();if(!link)throw Error('Native muster source has no hosted road');const fn=link.enqueue;check();Reflect.apply(fn,link,[ticket]);check();},publish:(unit:MusterArea,rows:World['musterRings'])=>{const area=this.#actual(unit);const fn=NativeAreaHostedPresentation.prototype.setMusterRings;Reflect.apply(fn,presentation,[area.combat,rows]);this.#actual(unit);},entryLanding:(destination:NativeAreaRoadDestination,from:string|null)=>destination.entryLanding(from)});
 const partyView=Object.freeze(Object.defineProperty({},'partyOf',{get:()=>{const check=this.#cohort(),fn=parties.partyOf;check();return(id:string)=>{check();const result=Reflect.apply(fn,parties,[id]);check();return result;};}})) as Pick<PartyDesk,'partyOf'>;
 const guarded:MusterHooks={standing:seat=>{const {check}=this.#selected(seat),fn=hooks.standing;check();const result=Reflect.apply(fn,hooks,[seat]);check();return result;},log:line=>{const check=this.#cohort(),fn=hooks.log;check();Reflect.apply(fn,hooks,[line]);check();}};
 this.#desk=new MusterDesk(units,partyView,guarded);
 }
 #live():void{if(this.#retired)throw Error('Native muster is retired');assertNativeRetainedWriterLive(this.#writer);if(nativeAreaHostedPresentation(this.#coordinator)!==this.#presentation)throw Error('Native muster presentation changed');}
 #selected(seat:Seat):{area:NativeAreaSceneOngoing;check:()=>void}{this.#live();const id=own<string>(seat,'id'),body=own<Actor>(seat,'actor'),meta=own<Seat['meta']>(seat,'meta'),owner=this.#coordinator.input.authority.require(body),area=Reflect.apply(this.#areaFor,this.#coordinator,[own<NativeAreaSceneCombat>(owner,'combat')]) as NativeAreaSceneOngoing;const check=()=>{this.#live();if(this.#seats.seatOf(id)!==seat||own(seat,'id')!==id||own(seat,'actor')!==body||own(seat,'meta')!==meta)throw Error('Native muster selected character changed');Reflect.apply(this.#physical,this.#coordinator.input.authority,[area.binding,[body]]);};check();return{area,check};}
 #cohort(area?:NativeAreaSceneOngoing):()=>void{this.#live();const selections=this.#seats.allSeats().map(s=>this.#selected(s)).filter(r=>!area||r.area===area);const check=()=>{this.#live();for(const r of selections)r.check();};check();return check;}
 #actual(unit:MusterArea):NativeAreaSceneOngoing{this.#live();const area=this.#areas.get(unit);if(!area||this.#units.get(area)!==unit||Reflect.apply(this.#areaFor,this.#coordinator,[area.combat])!==area)throw Error('Native muster area is retired or foreign');Reflect.apply(this.#physical,this.#coordinator.input.authority,[area.binding,[]]);return area;}
 #unit(area:NativeAreaSceneOngoing):MusterArea{let unit=this.#units.get(area);if(unit)return unit;const self=this,world={} as MusterArea['world'];unit=Object.freeze({key:area.combat.scene.zone.id,broken:false,world});const selected=unit;for(const key of ['zone','time','seats','musterRings'] as const)Object.defineProperty(world,key,{get(){self.#actual(selected);if(key==='zone')return area.combat.scene.zone;if(key==='time')return self.#writer.time;if(key==='musterRings')return self.#presentation.musterRings(area.combat);return self.#seats.allSeats().filter(s=>self.#selected(s).area===area);}});Object.freeze(world);this.#units.set(area,unit);this.#areas.set(unit,area);return unit;}
 #call<T>(action:()=>T,idle=false):T{this.#live();if(this.#busy)throw Error('Native muster cannot reenter');if(idle)Reflect.apply(this.#idle,this.#coordinator,[]);this.#busy=true;try{const result=action();this.#live();return result;}finally{this.#busy=false;}}
 offer(seat:Seat,road:MusterRoad<NativeAreaRoadDestination>):boolean{return this.#call(()=>{const {check}=this.#selected(seat);if(!this.#coordinator.ownsHostedMusterRoad(road,seat))throw Error('Native muster requires its actual issued road');const result=this.#desk.offer(seat,road);check();return result;});}
 mustering(id:string):boolean{return this.#call(()=>this.#desk.mustering(id));}
 judge(time:number):void{this.#call(()=>this.#desk.judge(time),true);}
 status(time:number):Record<string,unknown>[]{return this.#call(()=>this.#desk.status(time));}
 get size():number{this.#live();return this.#desk.size;}get raised():number{this.#live();return this.#desk.raised;}get fired():number{this.#live();return this.#desk.fired;}get lapsed():number{this.#live();return this.#desk.lapsed;}get moved():number{this.#live();return this.#desk.moved;}
 retire():void{if(this.#busy)throw Error('Native muster cannot retire while active');this.#retired=true;}
}
