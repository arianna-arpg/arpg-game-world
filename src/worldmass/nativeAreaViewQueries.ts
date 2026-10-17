import type {World} from '../engine/world';
export const NATIVE_AREA_VIEW_QUERIES=Object.freeze(["amalgamPickView","boardIntroduction","boroughHint","bossBarInfo","bountyBoardHint","campfireHint","chestObjectiveDone","couchActive","couchHeroes","couchSeats","deathBurstsView","descentView","dimGatesView","dwellRingsView","dwellTargetsView","encountersView","extractionHint","fractureView","frameLockFocus","gloamingView","grantedPocketsFor","harvestView","holdfastTollPrompt","huntFootprintView","isExitLocked","isPressingFoe","levelAt","leylineView","memorySecondaryRefusal","minionsOfSkill","modeDef","npcSpeechView","objectiveText","oracleHint","pingVisibleTo","publishViewFrame","rampageActive","realmGatesView","reviveHint","salvageHint","sameSeatParty","seatIdOfActor","seatModeDef","seatStageDef","selfStacksOf","skillUsable","slotFaceOf","speechApproachHint","speechDwellTargetsView","speechFocusTarget","spoilStoryAt","storeyedStructures","survivalRowVisible","throngBodiesOf","townPortalViews","traceView","trackerHint","unleashSealsOf","veilIndex","voyageLandingView","voyageShip","zoneWind","finishNpcDialogue","npcDialogueReachable","dissolveCrackView","dissolveFloorCrackView","emergeOf","gloomDarkness","radiance","lightwellDoodads","doodadFamilyRev","lineOfSight","movementLocked","sailPrompt","sightClipD","skyBelowDef","doodadsNear","roofedStructureAt","dropHolder"] as const);
export type NativeAreaViewQuery=typeof NATIVE_AREA_VIEW_QUERIES[number];
export type NativeAreaViewQueryMethods=Pick<World,NativeAreaViewQuery>;
const actorQueries:ReadonlySet<NativeAreaViewQuery>=new Set(["bossBarInfo","grantedPocketsFor","isPressingFoe","minionsOfSkill","seatIdOfActor","slotFaceOf","skillUsable","throngBodiesOf","unleashSealsOf","emergeOf","movementLocked"]);
const queryKeys:ReadonlySet<string>=new Set(NATIVE_AREA_VIEW_QUERIES);
export function isNativeAreaViewQuery(key:unknown):key is NativeAreaViewQuery {return typeof key==='string'&&queryKeys.has(key);}
export function nativeAreaViewActorArgument(key:NativeAreaViewQuery):boolean {return actorQueries.has(key);}

/** Actual query selection captures the published combat owner and callable. */
export function extendNativeAreaViewQueries(bindings:Map<string,{get:()=>unknown;set?:(value:unknown)=>void}>,area:()=>import('./nativeAreaSceneOngoing').NativeAreaSceneOngoing):void {
 const add=(key:string,binding:{get:()=>unknown;set?:(value:unknown)=>void})=>{if(bindings.has(key))throw Error('Duplicate native view field: '+key);bindings.set(key,binding);};
 const field=<K extends keyof World>(key:K,provider:()=>Pick<World,K>)=>add(key,{get:()=>provider()[key],set:value=>{if(!Reflect.set(provider(),key,value))throw new TypeError('Native view field is not writable: '+key);}});
 field('pendingAmbushes',()=>area().combat.runtimeState);
 field('geyserMode',()=>area().combat.runtimeState.motion);
 add('doodadRev',{get:()=>area().assembly.input.geometry.doodadsRev});
 add('stationAnchor',{get:()=>{const owner=area().combat,fn=owner.stationAnchor;return(...args:Parameters<World['stationAnchor']>)=>Reflect.apply(fn,owner,args);}});
 for(const key of NATIVE_AREA_VIEW_QUERIES){
  if(bindings.has(key))throw Error('Duplicate native view query: '+key);
  bindings.set(key,{get:()=>{const owner=area().combat,fn=owner.queryView;if(typeof fn!=='function')throw new TypeError('Native area view query is not callable');return(...args:unknown[])=>Reflect.apply(fn,owner,[key,...args]);}});
 }
}
