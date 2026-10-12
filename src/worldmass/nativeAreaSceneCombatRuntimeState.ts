import {NativeAreaSceneCombatFrameState} from './nativeAreaSceneCombatFrameState';
import {nativeAreaStoreClaims} from './nativeAreaStorageClaims';
/** Once-allocated native combat stores and controllers for one retained area.
 * Existing progression, reward, geometry, ecology and tether storage is not copied. */
import {freshNativeCombatMotionState} from '../engine/nativeSceneCombatMotion';
import {vec} from '../core/math';
import type {World} from '../engine/world';
import {ActorGrid} from '../engine/actorGrid';
import {Assaults} from '../engine/assault';
import type {NativeAssaultHost} from '../engine/nativeAssaultHost';
import {Auroras} from '../engine/auroras';
import {Creepers} from '../engine/creepers';
import {Guardians} from '../engine/guardians';
import {Satellites} from '../engine/satellites';
import {ReplenishmentClocks} from '../engine/replenishment';
import {ParryDamageWindow} from '../engine/parry';

type StoreKind='array'|'map'|'weak';
const arraySlots=['corpses','pendingDetonations','pendingAmbushes','pendingBursts','pendingContagions','attuneScratch','surfaceScratch','blastPocks','dissolves','pendingPersists','pendingMetas'] as const;
const mapSlots=['throngLastKill','dissolveCracks','dotAccum','massNativeBrittles','massOccurrenceDecorSources'] as const;
const weakSlots=['movementFlashes','strikeReleaseBodies','throngEvolutionBites','presencePulseAt','resonanceRang','lightningFlashes'] as const;
const mapHas=Map.prototype.has,weakHas=WeakMap.prototype.has,brandKey={};
function rawStore(value:unknown,kind:StoreKind):object {if(kind==='array'){if(!Array.isArray(value))throw Error('Native combat needs an actual raw array');}else{try{Reflect.apply(kind==='map'?mapHas:weakHas,value,[brandKey]);}catch{throw Error('Native combat needs an actual raw '+kind+' store');}}return value as object;}
function ownCombatStorage(state:NativeAreaSceneCombatRuntimeState):void {
 const rows:{key:string;kind:StoreKind;token:object;value:object;enumerable:boolean;mutable:boolean}[]=[],seen=new Set<object>();
 for(const [keys,kind]of [[arraySlots,'array'],[mapSlots,'map'],[weakSlots,'weak']] as const)for(const key of keys){const d=Object.getOwnPropertyDescriptor(state,key);if(!d||!Object.hasOwn(d,'value')||!d.configurable||!d.writable)throw Error('Native combat needs an ordinary raw storage slot: '+key);const value=rawStore(d.value,kind);if(seen.has(value)||nativeAreaStoreClaims.has(value))throw Error('Native combat store already belongs to another owner or slot');seen.add(value);rows.push({key,kind,token:{},value,enumerable:!!d.enumerable,mutable:key!=='attuneScratch'&&key!=='surfaceScratch'});}
 const descriptors:PropertyDescriptorMap={};for(const row of rows){let current=row.value;descriptors[row.key]=row.mutable?{enumerable:row.enumerable,configurable:false,get:()=>current,set:(value:unknown)=>{const next=rawStore(value,row.kind);nativeAreaStoreClaims.set(next,row.token);current=next;}}:{value:current,enumerable:row.enumerable,configurable:false,writable:false};}
 Object.defineProperties(state,descriptors);for(const row of rows)nativeAreaStoreClaims.set(row.value,row.token);
}

export class NativeAreaSceneCombatRuntimeState {
 readonly frame:NativeAreaSceneCombatFrameState;
 readonly motion=freshNativeCombatMotionState();
 corpses:World['corpses']=[];
 pendingDetonations:World['pendingDetonations']=[];
 pendingAmbushes:World['pendingAmbushes']=[];
 pendingBursts:World['pendingBursts']=[];
 pendingContagions:World['pendingContagions']=[];
 movementFlashes:World['movementFlashes']=new WeakMap();
 strikeReleaseBodies:World['strikeReleaseBodies']=new WeakMap();
 throngEvolutionBites:World['throngEvolutionBites']=new WeakMap();
 throngLastKill:World['throngLastKill']=new Map();
 domainSeq=0;sparkSeq=0;scrambleLatch=false;
 readonly attuneScratch:World['attuneScratch']=[];
 readonly surfaceScratch:World['surfaceScratch']=[];
 dissolveCracks:World['dissolveCracks']=new Map();
 dissolveOverride:World['dissolveOverride']=null;
 lastCombatAt=-999;
 readonly actorGrid=new ActorGrid();
 actorGridBuiltFor:unknown=null;actorGridBuiltRev=-1;actorGridRev=0;
 presencePulseAt:World['presencePulseAt']=new WeakMap();
 resonanceRang:World['resonanceRang']=new WeakMap();

 readonly assaults:Assaults;
 readonly auroras=new Auroras();readonly creepers=new Creepers();
 readonly guardians=new Guardians();readonly satellites=new Satellites();
 readonly replenishment=new ReplenishmentClocks();readonly parryDamageWindow=new ParryDamageWindow();
 blastPocks:World["blastPocks"]=[];
 blastPocksKey:World["blastPocksKey"]={ doodads: null, len: -1 };
 dissolves:World["dissolves"]=[];
 dotAccum:World["dotAccum"]=new Map();
 flightScratch:World["flightScratch"]=vec(0, 0);
 lightningFlashes:World["lightningFlashes"]=new WeakMap();
 liteVec:World["liteVec"]=vec(0, 0);
 massNativeBrittles:World["massNativeBrittles"]=new Map();
 massOccurrenceDecorSources:World["massOccurrenceDecorSources"]=new Map();
 pendingPersists:World["pendingPersists"]=[];
 pendingMetas:World["pendingMetas"]=[];
 viewFrame:World["viewFrame"]=null;
 viewFrameAt:World["viewFrameAt"]=-1;
 constructor(assaultHost:NativeAssaultHost,clock:Pick<World,'time'>){
  this.frame=new NativeAreaSceneCombatFrameState(clock);
  this.assaults=new Assaults(assaultHost);
  ownCombatStorage(this);
  for(const key of ['frame','motion','actorGrid','assaults','auroras','creepers','guardians','satellites','replenishment','parryDamageWindow'])Object.defineProperty(this,key,{writable:false,configurable:false});
 }
}
