import type { NativeAreaScenePopulation } from './nativeAreaScenePopulation';
import type { NativeSceneObjectiveState } from './nativeSceneState';
import * as native from '../engine/nativeScenePopulation';
import type { NativeSceneServiceHost } from '../engine/nativeScenePopulation';
const birthBindings=new WeakMap<object,{population:NativeAreaScenePopulation;state:NativeSceneObjectiveState}>();
export function hasNativeSceneObjectiveBinding(host:object,population:NativeAreaScenePopulation,state:NativeSceneObjectiveState):boolean {
 const b=birthBindings.get(host);return b?.population===population&&b.state===state;
}
const environmentBindings=new WeakMap<object,NativeSceneObjectiveState>();
export function bindNativeSceneObjectives<T extends object>(services:T,state:NativeSceneObjectiveState):T&Pick<NativeSceneObjectiveState,'objectiveDone'> {
 if(Object.hasOwn(services,'objectiveDone'))throw Error('Native objectives would replace an existing service');
 Object.defineProperty(services,'objectiveDone',{enumerable:true,get:()=>state.objectiveDone});
 environmentBindings.set(services,state);return services as T&Pick<NativeSceneObjectiveState,'objectiveDone'>;
}
export function hasNativeSceneObjectiveState(services:object,state:NativeSceneObjectiveState):boolean{return environmentBindings.get(services)===state;}
/** Real shared native objective birth services. Additional package adoption,
 * completion/reward, beacon and runtime controllers remain explicit owners. */
export type NativeSceneObjectiveContext=Pick<NativeSceneServiceHost,
 'pathField'|'zoneEntry'|'sim'|'farPoint'|'notice'|'walk'|'pointInSolid'|'structures'|'text'|
 'arena'|'farthestStand'|'time'>;
export function sceneObjectiveServices(pop:NativeAreaScenePopulation,state:NativeSceneObjectiveState,
 context:NativeSceneObjectiveContext):Omit<NativeSceneServiceHost,'seats'|'partyScaleCount'> {
 const out:Omit<NativeSceneServiceHost,'seats'|'partyScaleCount'>={
  get actors(){return pop.actors;},set actors(v){pop.actors=v;},
  get zone(){return pop.input.scene.zone;},get player(){return pop.input.scene.player;},
  get wave(){return state.wave;},set wave(v){state.wave=v;},get waveActive(){return state.waveActive;},set waveActive(v){state.waveActive=v;},
  get pathField(){const f=context.pathField;return (...a:Parameters<typeof f>)=>f.apply(context,a);},
  get zoneEntry(){return context.zoneEntry;},get sim(){return context.sim;},
  get farPoint(){const f=context.farPoint;return (...a:Parameters<typeof f>)=>f.apply(context,a);},
  get notice(){const f=context.notice;return (...a:Parameters<typeof f>)=>f.apply(context,a);},
  get walk(){return context.walk;},get structures(){return context.structures;},get arena(){return context.arena;},get time(){return context.time;},
  get pointInSolid(){const f=context.pointInSolid;return (...a:Parameters<typeof f>)=>f.apply(context,a);},
  get text(){const f=context.text;return (...a:Parameters<typeof f>)=>f.apply(context,a);},
  get farthestStand(){const f=context.farthestStand;return (...a:Parameters<typeof f>)=>f.apply(context,a);},
  get createMonster(){const f=pop.createMonster;return (...a:Parameters<typeof f>)=>f.apply(pop,a);},
  get nextSquadId(){const f=pop.nextSquadId;return (...a:Parameters<typeof f>)=>f.apply(pop,a);},
  get promoteRarity(){const f=pop.promoteRarity;return (...a:Parameters<typeof f>)=>f.apply(pop,a);},
  get clampPos(){const f=pop.clampPos;return (...a:Parameters<typeof f>)=>f.apply(pop,a);},
  get refreshMagicPacks(){const f=pop.refreshMagicPacks;return (...a:Parameters<typeof f>)=>f.apply(pop,a);},
  get weightedPick(){const p=pop.input.sources.ambient,f=p.weightedPick;return (...a:Parameters<typeof f>)=>f.apply(p,a);},
  get effectiveSpawn(){const f=pop.effectiveSpawn;return (...a:Parameters<typeof f>)=>f.apply(pop,a);},
  get baseTable(){const f=pop.baseTable;return (...a:Parameters<typeof f>)=>f.apply(pop,a);},
  objectiveCountable:(...a:Parameters<NativeSceneServiceHost['objectiveCountable']>)=>native.sceneObjectiveCountable(out,...a),
  isAmbientTag:(...a:Parameters<NativeSceneServiceHost['isAmbientTag']>)=>native.sceneIsAmbientTag(out,...a),
  confineUnreachable:(...a:Parameters<NativeSceneServiceHost['confineUnreachable']>)=>native.sceneConfineUnreachable(out,...a),
  countedEnemies:()=>native.sceneCountedEnemies(out),
  spawnPoint:(...a:Parameters<NativeSceneServiceHost['spawnPoint']>)=>native.sceneSpawnPoint(out,...a),
  applyWaveFrenzy:(...a:Parameters<NativeSceneServiceHost['applyWaveFrenzy']>)=>native.applySceneWaveFrenzy(out,...a),
 };
 birthBindings.set(out,{population:pop,state});
 return out;
}
