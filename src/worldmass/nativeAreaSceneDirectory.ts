/** Stable read view over one actual registered retained area. Methods select
 * genuine live owners; this object never pretends to be a World or issues actor authority. */
import type {World} from '../engine/world';
import type {NativeAreaDirectoryView} from './nativeAreaDirectoryView';
import {isNativeAreaSceneCombat,type NativeAreaSceneCombat} from './nativeAreaSceneCombat';
import {isNativeAreaSceneTransitionCoordinator,type NativeAreaSceneTransitionCoordinator} from './nativeAreaSceneTransitionCoordinator';
type Endpoint='resealDoor'|'refreshHoldDress'|'refreshHoldServices'|'spawnWarband'|'dissipateHauntSpawns'|'realmArenaWake'|'clearWaypointLanding'|'nearBountyBoard';
/** The final aggregate owns these concrete endpoints. A missing endpoint is a
 * construction/integration failure, never a World fallback or supplied callback. */
function endpoint<K extends Endpoint>(combat:NativeAreaSceneCombat,key:K):NativeAreaDirectoryView[K]{const selected:unknown=Reflect.get(combat,key);if(typeof selected!=='function')throw Error('Actual native directory endpoint not installed: '+key);return ((...args:unknown[])=>Reflect.apply(selected,combat,args)) as NativeAreaDirectoryView[K];}
export class NativeAreaSceneDirectory {
 readonly view:NativeAreaDirectoryView;
 constructor(coordinator:NativeAreaSceneTransitionCoordinator,combat:NativeAreaSceneCombat){
  if(!isNativeAreaSceneTransitionCoordinator(coordinator)||!isNativeAreaSceneCombat(combat)||combat.input.coordinator!==coordinator)throw Error('Native directory requires actual identical owners');
  const area=()=>coordinator.areaFor(combat);area();
  const view:NativeAreaDirectoryView={
   get zone(){return area().assembly.input.scene.zone;},get actors(){return area().assembly.input.scene.actors;},get seats(){area();return coordinator.seatsFor(combat);},
   get presentationActor(){area();return coordinator.presentationActorFor(combat);},get player(){area();const actor=coordinator.presentationActorFor(combat);if(!actor)throw Error('Native area has no physical presentation actor');return actor;},
   get structures(){return area().assembly.input.geometry.structures;},get holdDefense(){return area().assembly.input.registry.input.state.holdDefense;},
   get theaterRuns(){return area().assembly.input.theater.input.state.theaterRuns;},get encounters(){return area().assembly.transition.encounters;},
   get seatQuests(){area();return Reflect.get(coordinator.input.characterWriter,'seatQuests') as World['seatQuests'];},
   get text(){const owner=area().assembly.objectiveController,fn=owner.text;return(...args:Parameters<World['text']>)=>Reflect.apply(fn,owner,args);},
   get notice(){area();const owner=coordinator.input.campaign,fn=owner.notice;return(...args:Parameters<World['notice']>)=>Reflect.apply(fn,owner,args);},
   get resealDoor(){area();return endpoint(combat,'resealDoor');},get refreshHoldDress(){area();return endpoint(combat,'refreshHoldDress');},get refreshHoldServices(){area();return endpoint(combat,'refreshHoldServices');},
   get spawnWarband(){area();return endpoint(combat,'spawnWarband');},get dissipateHauntSpawns(){area();return endpoint(combat,'dissipateHauntSpawns');},get realmArenaWake(){area();return endpoint(combat,'realmArenaWake');},get clearWaypointLanding(){area();return endpoint(combat,'clearWaypointLanding');},get nearBountyBoard(){area();return endpoint(combat,'nearBountyBoard');},
  };
  this.view=Object.freeze(view);Object.defineProperty(this,'view',{writable:false,configurable:false});
 }
}
