/** Live renderer/authority-snapshot publication of genuine retained owners.
 * This does not activate the browser client or provide unextracted UI helpers. */
import type {World} from '../engine/world';
import type {NativeAreaSceneOngoing} from './nativeAreaSceneOngoing';
export interface NativeAreaPublicationBinding {get:()=>unknown;set?:(value:unknown)=>void}
/** Called only while the real coordinator prepares its complete descriptor set.
 * Query lookup captures the actual selected owner and callable before arguments. */
export function extendNativeAreaPublication(bindings:Map<string,NativeAreaPublicationBinding>,area:()=>NativeAreaSceneOngoing):void {
 const add=(key:string,binding:NativeAreaPublicationBinding)=>{if(bindings.has(key))throw Error('Duplicate native publication field: '+key);bindings.set(key,binding);};
 const field=<K extends keyof World>(key:K,provider:()=>Pick<World,K>)=>add(key,{get:()=>provider()[key],set:value=>{if(!Reflect.set(provider(),key,value))throw new TypeError('Native published field is not writable: '+key);}});
 const fixed=<K extends keyof World>(key:K,read:()=>World[K])=>add(key,{get:read});
 const query=<K extends keyof World>(key:K,provider:()=>Pick<World,K>)=>add(key,{get:()=>{const receiver=provider(),fn=receiver[key];if(typeof fn!=='function')throw new TypeError('Native published query is not callable: '+key);return(...args:unknown[])=>Reflect.apply(fn,receiver,args);}});
 field('airPockets',()=>area().assembly.input.geometry);
 field('arenaWash',()=>area().assembly.input.geometry);
 field('collapse',()=>area().assembly.input.geometry);
 field('conjured',()=>area().assembly.input.geometry);
 field('creep',()=>area().assembly.input.geometry);
 field('doodads',()=>area().assembly.input.geometry);
 field('flux',()=>area().assembly.input.geometry);
 field('fog',()=>area().assembly.input.geometry);
 field('snowCover',()=>area().assembly.input.geometry);
 field('structures',()=>area().assembly.input.geometry);
 field('tracks',()=>area().assembly.input.geometry);
 field('trapworks',()=>area().assembly.input.geometry);
 field('waypointPos',()=>area().assembly.input.geometry);
 field('zoneHollows',()=>area().assembly.input.geometry);
 field('openedHollows',()=>area().assembly.input.geometry);
 field('zoneAnnexSpecs',()=>area().assembly.input.geometry);
 field('shake',()=>area().assembly.input.geometry);
 field('syncedGrantedPockets',()=>area().assembly.input.geometry);
 field('chests',()=>area().assembly.input.physical.input.state);
 field('shrines',()=>area().assembly.input.physical.input.state);
 field('altars',()=>area().assembly.input.physical.input.state);
 field('corpses',()=>area().combat.runtimeState);
 field('dissolves',()=>area().combat.runtimeState);
 field('pendingPersists',()=>area().combat.runtimeState);
 field('ownWalk',()=>area().combat.runtimeState.motion);
 field('pings',()=>area().combat.runtimeState.frame);
 field('emergences',()=>area().progression.input.state);
 field('deathBursts',()=>area().combat.killAftermath.input.state);
 field('remnants',()=>area().combat.killAftermath.input.state);
 field('fonts',()=>area().assembly.input.state);
 field('geysers',()=>area().assembly.input.environment.input.state);
 field('playerCorpses',()=>area().assembly.input.history.input.state);
 field('magicPackEffects',()=>area().assembly.input.population.input.state);
 field('annexOpen',()=>area().assembly.input.openings.input.state);
 field('liteKinds',()=>area().assembly.input.ecology.input.state);
 field('wave',()=>area().assembly.input.objectives);
 field('waveActive',()=>area().assembly.input.objectives);
 field('waveTimer',()=>area().assembly.input.objectives);
 field('zoneEnteredAt',()=>area().watching.input.state);
 fixed('auroras',()=>area().combat.runtimeState.auroras);
 fixed('creepers',()=>area().combat.runtimeState.creepers);
 fixed('guardians',()=>area().combat.runtimeState.guardians);
 fixed('satellites',()=>area().combat.runtimeState.satellites);
 fixed('lite',()=>area().progression.lite);
 fixed('guardArts',()=>area().progression.guardArts);
 fixed('titans',()=>area().assembly.input.registry.input.titans.runtime);
 fixed('npcDialogues',()=>area().assembly.input.residents.npcDialogues);
 query('skyFront',()=>area().assembly.sky);
 query('actorById',()=>area().assembly.input.ecology);
 query('hostileTo',()=>area().assembly.input.population);
 query('liteKindOf',()=>area().assembly.input.ecology);
}
