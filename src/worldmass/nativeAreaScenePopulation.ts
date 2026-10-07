/** Mutable local population owner. No World value, prototype borrowing,
 * published World field swap, census cap, reseeding, or controller substitute. */
import type { Actor } from '../engine/actor';
import type { ZoneDef, PackTableEntry } from '../data/zones';
import type { NativeAreaBirthMemory } from '../engine/nativeAreaBirth';
import type { NativeInhabitantHost } from '../engine/nativeInhabitants';
import type { NativeAreaAmbientSources, NativeAreaAmbientContext, NativeAreaResidentContext } from './nativeAreaAmbient';
import type { NativeAreaPopulationCampaign } from './nativeAreaPopulation';
import type { NativeAreaSight } from './nativeAreaLocal';
import { createNativeMonster, stampNativeMonsterLevel, armNativeMonsterAmbush, type NativeMonsterFactoryHost } from '../engine/nativeMonsterFactory';
import { promoteNativeRarity, promoteNativeRarityStacked, promoteNativeMagicPack, refreshNativeMagicPacks, type NativeMonsterPromotionHost } from '../engine/nativeMonsterPromotion';
import { nativeHostileTo, nativeIsPrey, nativeEnemiesOf, type NativeHostilityHost } from '../engine/nativeHostility';
import { nativeRelayStatus } from '../engine/nativeStatusRelay';
import { spawnNativePacks, spawnNativeWildlife, placeNativeInHabitat, type NativeAmbientHost } from '../engine/nativeAmbient';
import { spawnNativeEncounterGroup, type NativeEncounterGroupHost } from '../engine/nativeEncounterGroup';
import { nativeSimView, nativeBaseTable, nativeEffectiveSpawn, nativeWildlifeTableFor, nativeCaveAirFor, nativeVerminPressure,
  type NativePopulationHost, type NativePopulationSources } from '../engine/nativePopulationResolution';
import type { NativeAreaBirthHost } from '../engine/nativeAreaBirth';
import type { MagicPackVisual } from '../engine/magicPackMechanics';
import { restoreSceneEnemies } from '../engine/nativeScenePopulation';

export interface NativeSceneCensus {
  zone: ZoneDef;
  actors: Actor[];
  player: Actor;
}
/** Root mutable geometry owner supplies real methods, including mover-aware
 * clampPos for memory. A fixed NativeAreaLocal placement-only clamp is NOT enough. */
export interface NativeScenePopulationGeometry extends Pick<NativeAmbientHost,
  'arena'|'walk'|'tierViews'|'doodads'|'isGridWalk'|'findFreeSpot'>, NativeAreaSight {
  farPoint: NativeAreaBirthHost['farPoint'];
  clampPos: NativeAreaBirthHost['clampPos'];
  pathField: NativeEncounterGroupHost['pathField'];
  pointInSolid: NativeEncounterGroupHost['pointInSolid'];
}
export interface NativeScenePopulationState {
  squadSequence:number; bombardMintRev:number; zoneGenTagging:boolean;
  magicPackEffects:MagicPackVisual[]; magicPackResolving:boolean; magicPackRefreshPending:boolean;
}
export interface NativeScenePopulationInput {
  scene:NativeSceneCensus; geometry:NativeScenePopulationGeometry;
  campaign:NativeAreaPopulationCampaign; sources:NativeAreaAmbientSources;
  populationSources:NativePopulationSources; context:NativeAreaAmbientContext;
  state:NativeScenePopulationState;
}
/** Forward a declared native capability lazily. Selection happens before argument
 * evaluation, and invocation retains its original explicit provider receiver. */
function methods<T extends object>(out:T, provider:()=>object, keys:readonly string[]):void {
  for(const key of keys)Object.defineProperty(out,key,{enumerable:true,get(){
    const owner=provider() as Record<string,Function>,fn=owner[key];
    if(typeof fn!=='function')throw Error('Missing native scene capability: '+key);
    return (...args:unknown[])=>fn.apply(owner,args);
  }});
}
export class NativeAreaScenePopulation {
  readonly ambient:NativeAmbientHost;
  readonly groups:NativeEncounterGroupHost;
  readonly population:NativePopulationHost;
  readonly factory:NativeMonsterFactoryHost;
  readonly promotion:NativeMonsterPromotionHost;
  readonly hostility:NativeHostilityHost;
  private readonly relayHost={enemiesOf:(a:Actor)=>this.enemiesOf(a)};
  private readonly relay:NonNullable<Actor['statusRelay']>=(a,args)=>nativeRelayStatus(this.relayHost,this.input.sources.relay,a,args);
  readonly input:NativeScenePopulationInput;
  constructor(raw:NativeScenePopulationInput) {
    const bindings=Object.create(null);
    for(const key of ['scene','geometry','campaign','sources','populationSources','context','state']){
      const d=raw&&Object.getOwnPropertyDescriptor(raw,key);
      if(!d||!Object.hasOwn(d,'value'))throw Error('Native scene population requires own binding: '+key);
      bindings[key]=d.value;
    }
    const input:NativeScenePopulationInput=this.input=Object.freeze(bindings);
    const callbacks={} as Pick<NativeAreaAmbientContext,'applyPartyScale'|'sanctuaryBlocksCombat'|'resolveHit'>;
    for(const key of ['applyPartyScale','sanctuaryBlocksCombat','resolveHit'] as const){
      const d=Object.getOwnPropertyDescriptor(input.context,key);
      if(!d||!Object.hasOwn(d,'value')||typeof d.value!=='function')throw Error('Native scene population requires local callback: '+key);
      callbacks[key]=d.value;
    }
    const area=this, scene=input.scene,geometry=input.geometry,state=input.state;
    if(!Array.isArray(scene.actors)||!scene.actors.includes(scene.player))throw Error('Scene needs its detached complete census and player');
    // No defaults: the caller owns the actual prior-stage counters and refresh state.
    for(const key of ['squadSequence','bombardMintRev','zoneGenTagging','magicPackEffects','magicPackResolving','magicPackRefreshPending'])
      if(!Object.getOwnPropertyDescriptor(state,key)||!Object.hasOwn(Object.getOwnPropertyDescriptor(state,key)!,'value'))throw Error('Missing own-data scene population state: '+key);
    if(!Number.isSafeInteger(state.squadSequence)||state.squadSequence<0||!Number.isSafeInteger(state.bombardMintRev)||state.bombardMintRev<0
      ||typeof state.zoneGenTagging!=='boolean'||!Array.isArray(state.magicPackEffects)||typeof state.magicPackResolving!=='boolean'||typeof state.magicPackRefreshPending!=='boolean')
      throw Error('Invalid native scene population state');
    this.population={get zone(){return scene.zone;},get actors(){return scene.actors;},get player(){return scene.player;},
      get zoneMap(){return input.campaign.zoneMap;},get time(){return input.campaign.time;},get sim(){return input.campaign.sim;},
      get visited(){return input.campaign.visited;},get surveyed(){return input.campaign.surveyed;},
      continentFor:c=>input.campaign.continentFor(c),simView:()=>nativeSimView(area.population)};
    this.hostility={get zone(){return scene.zone;},get actors(){return scene.actors;},
      sanctuaryBlocksCombat:(...args)=>callbacks.sanctuaryBlocksCombat.call(input.context,...args),
      isPrey:(...args)=>nativeIsPrey(input.sources.hostility,...args),hostileTo:(...args)=>area.hostileTo(...args)};
    this.factory={get relayStatus(){return area.relay;},
      get bombardMintRev(){return state.bombardMintRev;},set bombardMintRev(v){state.bombardMintRev=v;},
      stampMonsterLevel:(...args)=>stampNativeMonsterLevel(...args,input.sources.factory),
      applyPartyScale:(...args)=>callbacks.applyPartyScale.call(input.context,...args),get zoneGenTagging(){return state.zoneGenTagging;},
      get npcDialogues(){return input.context.npcDialogues;},armAmbush:(...args)=>armNativeMonsterAmbush(...args,input.sources.factory),
      get time(){return input.context.time;}};
    this.promotion={get actors(){return scene.actors;},
      get magicPackResolving(){return state.magicPackResolving;},set magicPackResolving(v){state.magicPackResolving=v;},
      get magicPackRefreshPending(){return state.magicPackRefreshPending;},set magicPackRefreshPending(v){state.magicPackRefreshPending=v;},
      get magicPackEffects(){return state.magicPackEffects;},set magicPackEffects(v){state.magicPackEffects=v;},
      nextSquadId:()=>area.nextSquadId(),promoteRarity:(...a)=>area.promoteRarity(...a),refreshMagicPacks:(...a)=>area.refreshMagicPacks(...a),
      enemiesOf:(...a)=>area.enemiesOf(...a),lineOfSight:(...a)=>geometry.lineOfSight(...a),clipShot:(...a)=>geometry.clipShot(...a),
      resolveHit:(...a)=>callbacks.resolveHit.call(input.context,...a)};
    const ambient={get arena(){return geometry.arena;},get walk(){return geometry.walk;},get tierViews(){return geometry.tierViews;},
      get doodads(){return geometry.doodads;},get actors(){return scene.actors;},get player(){return scene.player;},
      get config(){return input.sources.ambient.config;},get random(){return input.sources.ambient.random;},
      farPoint:(min:number)=>geometry.farPoint(min),nextSquadId:()=>area.nextSquadId(),
      createMonster:(...a:Parameters<NativeAmbientHost['createMonster']>)=>area.createMonster(...a),
      promoteRarity:(...a:Parameters<NativeAmbientHost['promoteRarity']>)=>area.promoteRarity(...a),
      promoteMagicPack:(...a:Parameters<NativeAmbientHost['promoteMagicPack']>)=>area.promoteMagicPack(...a),
      placeInHabitat:(a:Actor)=>placeNativeInHabitat(area.ambient,a),
      spawnEncounterGroup:(...a:Parameters<NativeAmbientHost['spawnEncounterGroup']>)=>spawnNativeEncounterGroup(area.groups,...a),
      wildlifeTableFor:(def:ZoneDef)=>nativeWildlifeTableFor(input.populationSources,def,d=>nativeCaveAirFor(input.populationSources,d)),
      verminPressure:()=>nativeVerminPressure(area.population),
    } as NativeAmbientHost;
    methods(ambient,()=>geometry,['isGridWalk','findFreeSpot']);
    methods(ambient,()=>input.sources.ambient,['rand','randInt','monster','packageActive','weightedPick','rollPackSize','rollRarity',
      'magicPackPool','magicPackSize','rollMagicPack','storyTable','tierFloorAt','encounterGroupContext','rollEncounterGroup','presenceMul','notice']);
    this.ambient=ambient;
    const groups={get zone(){return scene.zone;},get player(){return scene.player;},get actors(){return scene.actors;},
      get tierViews(){return geometry.tierViews;},get config(){return input.sources.groups.config;},
      createMonster:(...a:Parameters<NativeEncounterGroupHost['createMonster']>)=>area.createMonster(...a),
      nextSquadId:()=>area.nextSquadId(),placeInHabitat:(a:Actor)=>placeNativeInHabitat(area.ambient,a),
    } as unknown as NativeEncounterGroupHost;
    methods(groups,()=>input.sources.groups,['group','encounterGroupContext','planEncounterGroup','applyEncounterGroup']);
    methods(groups,()=>input.sources.ambient,['rand']);methods(groups,()=>geometry,['pathField','findFreeSpot','pointInSolid']);
    this.groups=groups;
    for(const key of ['ambient','groups','population','factory','promotion','hostility'] as const)Object.freeze(this[key]);
    for(const key of ['input','ambient','groups','population','factory','promotion','hostility','relayHost','relay'])
      Object.defineProperty(this,key,{writable:false,configurable:false});
    this.transferRelays(scene.actors);
  }
  /** Explicit detached handoff. Never invoke for borrowed live World bodies. */
  transferRelays(actors:readonly Actor[]):void {
    for(const a of actors){const d=Object.getOwnPropertyDescriptor(a,'statusRelay');
      if(d?(!Object.hasOwn(d,'value')||!d.writable):!Object.isExtensible(a))throw Error('Nontransferable scene actor relay');}
    for(const a of actors)a.statusRelay=this.relay;
  }
  get actors():Actor[]{return this.input.scene.actors;}
  set actors(v:Actor[]){this.input.scene.actors=v;}
  nextSquadId():number{return this.input.state.squadSequence++;}
  createMonster(...args:Parameters<NativeAreaBirthHost['createMonster']>):Actor{return createNativeMonster(this.factory,this.input.sources.factory,...args);}
  hostileTo(a:Actor,b:Actor):boolean{return nativeHostileTo(this.hostility,this.input.sources.hostility,a,b);}
  enemiesOf(a:Actor):Actor[]{return nativeEnemiesOf(this.hostility,a);}
  promoteRarity(...args:Parameters<NativeMonsterPromotionHost['promoteRarity']>):void{promoteNativeRarity(this.promotion,this.input.sources.promotion,...args);}
  promoteRarityStacked(a:Actor,rarity:Parameters<NativeAreaBirthHost['promoteRarityStacked']>[1],stacks=1,opts?:Parameters<NativeAreaBirthHost['promoteRarityStacked']>[3]):void{promoteNativeRarityStacked(this.promotion,this.input.sources.promotion,a,rarity,stacks,opts);}
  promoteMagicPack(members:Actor[],id:string):boolean{return promoteNativeMagicPack(this.promotion,this.input.sources.promotion,members,id);}
  refreshMagicPacks(dt=0):void{refreshNativeMagicPacks(this.promotion,this.input.sources.promotion,dt);}
  baseTable(def=this.input.scene.zone):PackTableEntry[]{return nativeBaseTable(this.population,this.input.populationSources,def);}
  effectiveSpawn(def:ZoneDef,base:PackTableEntry[]){return nativeEffectiveSpawn(this.population,this.input.populationSources,def,base);}
  spawnPacks(def:ZoneDef,factor=1,table?:readonly PackTableEntry[]):void{spawnNativePacks(this.ambient,def,factor,table);}
  spawnWildlife(def:ZoneDef):void{spawnNativeWildlife(this.ambient,def);}
  clampPos(...args:Parameters<NativeAreaBirthHost['clampPos']>){return this.input.geometry.clampPos(...args);}
  restoreZoneEnemies(memory:NativeAreaBirthMemory):void{restoreSceneEnemies(this,memory);}
  inhabitants(context:NativeAreaResidentContext):NativeInhabitantHost {
    const area=this,scene=this.input.scene, geometry=this.input.geometry;
    const host={get actors(){return scene.actors;},get doodads(){return geometry.doodads;},
      get account(){return context.account;},get ledger(){return context.ledger;},get massSettlementDay(){return context.massSettlementDay;},
      get time(){return area.input.context.time;},get speakerRows(){return context.speakerRows;},get speechMemory(){return context.speechMemory;},
      get speechFocus(){return context.speechFocus;},get speechFocusSpeaker(){return context.speechFocusSpeaker;},set speechFocusSpeaker(v:number|undefined){context.speechFocusSpeaker=v;},
      get dialogueScene(){return context.dialogueScene;},set dialogueScene(v:number){context.dialogueScene=v;},get npcDialogues(){return context.npcDialogues;},
      promoteMonster:(...args:Parameters<NativeInhabitantHost['promoteMonster']>)=>area.promoteRarityStacked(...args),
      armAmbush:(...args:Parameters<NativeInhabitantHost['armAmbush']>)=>armNativeMonsterAmbush(...args,area.input.sources.factory),
    } as NativeInhabitantHost;
    methods(host,()=>area,['createMonster','nextSquadId']);methods(host,()=>geometry,['clampPos','findFreeSpot']);
    methods(host,()=>area.input.sources.ambient,['weightedPick']);return host;
  }
}
