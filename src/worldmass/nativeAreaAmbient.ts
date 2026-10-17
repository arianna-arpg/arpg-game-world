import type { NativeInhabitantHost } from '../engine/nativeInhabitants';
import type { Actor, Team } from '../engine/actor';
import type { PackTableEntry, ZoneDef } from '../data/zones';
import type { MonsterRarity } from '../engine/rarity';
import { createNativeMonster, stampNativeMonsterLevel, armNativeMonsterAmbush, type NativeMonsterFactoryHost, type NativeMonsterFactorySources } from '../engine/nativeMonsterFactory';
import { promoteNativeRarity, promoteNativeRarityStacked, promoteNativeMagicPack, refreshNativeMagicPacks, type NativeMonsterPromotionHost, type NativeMonsterPromotionSources } from '../engine/nativeMonsterPromotion';
import { nativeHostileTo, nativeIsPrey, nativeEnemiesOf, type NativeHostilityHost, type NativeHostilitySources } from '../engine/nativeHostility';
import { nativeRelayStatus, type NativeStatusRelaySources } from '../engine/nativeStatusRelay';
import { spawnNativePacks, spawnNativeWildlife, type NativeAmbientHost } from '../engine/nativeAmbient';
import type { MagicPackVisual } from '../engine/magicPackMechanics';
import { NativeAreaLocal, type NativeAreaAmbientServices, type NativeAreaSight, type NativeAreaSightServices } from './nativeAreaLocal';
import { NativeAreaPopulation } from './nativeAreaPopulation';
import { serializeNativeAreaData } from './nativeAreaGeometry';

type OwnedAmbient = 'nextSquadId'|'createMonster'|'promoteRarity'|'promoteMagicPack'|'wildlifeTableFor'|'verminPressure';
export interface NativeAreaAmbientSources {
  ambient: Omit<NativeAreaAmbientServices['ambient'],OwnedAmbient>;
  groups: NativeAreaAmbientServices['groups'];
  factory: NativeMonsterFactorySources;
  promotion: NativeMonsterPromotionSources;
  hostility: NativeHostilitySources;
  relay: NativeStatusRelaySources;
}
/** Explicit trusted services for this prepared population. They must own the
 * same local coordinate frame and campaign/party context; no ambient World fallback. */
export interface NativeAreaAmbientContext extends NativeAreaSightServices {
  readonly time: number;
  readonly npcDialogues: NativeMonsterFactoryHost['npcDialogues'];
  applyPartyScale: NativeMonsterFactoryHost['applyPartyScale'];
  sanctuaryBlocksCombat: NativeHostilityHost['sanctuaryBlocksCombat'];
  resolveHit: NativeMonsterPromotionHost['resolveHit'];
}
/** Original resident-state owner for the prepared area. Its dialogue director
 * must also supply this area's factory appearance service. These are live
 * trusted controllers, not a new dialogue implementation or source certificate. */
export type NativeAreaResidentContext = Pick<NativeInhabitantHost,
  'account'|'ledger'|'massSettlementDay'|'speakerRows'|'speechMemory'|'speechFocus'|'speechFocusSpeaker'|'dialogueScene'|'npcDialogues'>;
export interface NativeAreaAmbientInput {
  local: NativeAreaLocal;
  population: NativeAreaPopulation;
  player: Actor;
  sources: NativeAreaAmbientSources;
  context: NativeAreaAmbientContext;
  state: {
    squadSequence: number; bombardMintRev: number; zoneGenTagging: boolean;
    magicPackEffects: MagicPackVisual[]; magicPackResolving: boolean; magicPackRefreshPending: boolean;
  };
}
function binding<T>(raw:NativeAreaAmbientInput,key:keyof NativeAreaAmbientInput):T {
  const d=Object.getOwnPropertyDescriptor(raw,key);
  if(!d||!Object.hasOwn(d,'value'))throw Error('Native area ambient requires own binding: '+key);
  return d.value as T;
}
/** Complete pack/wildlife stage host, including real factories, local hostility,
 * status relays, rarity and immediate native magic refresh. The caller supplies
 * detached original pre-stage actors and all live magic state, transferring their
 * status-relay ownership on successful construction. Never borrow a published
 * World's actors. The caller invokes stages in the original load order.
 * This is neither a full birth driver nor a publication/rollback transaction.
 * Native Actor/item allocation and failed-attempt consumption remain native. */
export class NativeAreaAmbient {
  readonly population: NativeAreaPopulation;
  readonly zone: ZoneDef;
  readonly actors: Actor[];
  readonly player: Actor;
  readonly sight: NativeAreaSight;
  readonly host: NativeAmbientHost;
  squadSequence: number;
  bombardMintRev: number;
  zoneGenTagging: boolean;
  magicPackResolving: boolean;
  magicPackRefreshPending: boolean;
  magicPackEffects: MagicPackVisual[];
  private readonly local: NativeAreaLocal;
  private readonly sources: NativeAreaAmbientSources;
  private readonly factory: NativeMonsterFactoryHost;
  private readonly promotion: NativeMonsterPromotionHost;
  private readonly hostility: NativeHostilityHost;
  private readonly relayHost = { enemiesOf:(a:Actor)=>this.enemiesOf(a) };
  private readonly relay: NonNullable<Actor['statusRelay']> = (a,args)=>nativeRelayStatus(this.relayHost,this.sources.relay,a,args);
  constructor(raw:NativeAreaAmbientInput) {
    const local=binding<NativeAreaLocal>(raw,'local'),context=binding<NativeAreaAmbientContext>(raw,'context');
    this.local=local;
    this.population=binding(raw,'population');this.player=binding(raw,'player');this.sources=binding(raw,'sources');
    const initial=binding<NativeAreaAmbientInput['state']>(raw,'state');
    const state=Object.create(null) as NativeAreaAmbientInput['state'];
    for(const key of ['squadSequence','bombardMintRev','zoneGenTagging','magicPackEffects','magicPackResolving','magicPackRefreshPending'] as const){
      const d=initial&&Object.getOwnPropertyDescriptor(initial,key);
      if(!d||!Object.hasOwn(d,'value'))throw Error('Native area ambient initial state must be own data');
      Object.defineProperty(state,key,{value:d.value,enumerable:true});
    }
    const callbacks={} as Pick<NativeAreaAmbientContext,'opaqueAt'|'applyPartyScale'|'sanctuaryBlocksCombat'|'resolveHit'>;
    for(const key of ['opaqueAt','applyPartyScale','sanctuaryBlocksCombat','resolveHit'] as const){
      const d=context&&Object.getOwnPropertyDescriptor(context,key);
      if(!d||!Object.hasOwn(d,'value')||typeof d.value!=='function')throw Error('Native area ambient requires explicit service: '+key);
      Object.defineProperty(callbacks,key,{value:d.value});
    }
    if(!Object.hasOwn(context,'time')||!Object.hasOwn(context,'npcDialogues'))throw Error('Native area ambient requires explicit clock and appearance services');
    if(!(local instanceof NativeAreaLocal)||!(this.population instanceof NativeAreaPopulation)
      ||this.player!==this.population.player||!this.population.actors.includes(this.player)
      ||serializeNativeAreaData(this.population.zone)!==serializeNativeAreaData(local.input.zone)
      ||this.player.pos.x!==local.input.playerPosition.x||this.player.pos.y!==local.input.playerPosition.y)
      throw Error('Native area ambient geometry, source zone and staged population differ');
    if(!state||!['squadSequence','bombardMintRev','zoneGenTagging'].every(k=>Object.hasOwn(state,k))
      ||!Number.isSafeInteger(state.squadSequence)||state.squadSequence<0||!Number.isSafeInteger(state.bombardMintRev)||state.bombardMintRev<0
      ||typeof state.zoneGenTagging!=='boolean'||typeof state.magicPackResolving!=='boolean'
      ||typeof state.magicPackRefreshPending!=='boolean'||!Array.isArray(state.magicPackEffects))throw Error('Invalid native area ambient initial state');
    this.squadSequence=state.squadSequence;this.bombardMintRev=state.bombardMintRev;this.zoneGenTagging=state.zoneGenTagging;
    this.zone=this.population.zone;this.actors=this.population.actors;
    this.magicPackEffects=state.magicPackEffects;this.magicPackResolving=state.magicPackResolving;this.magicPackRefreshPending=state.magicPackRefreshPending;
    // Validate the whole detached cohort before replacing any relay capability.
    const validateRelays=()=>{
      for(const actor of this.actors){
        const d=Object.getOwnPropertyDescriptor(actor,'statusRelay');
        if(d?(!Object.hasOwn(d,'value')||!d.writable):!Object.isExtensible(actor))
          throw Error('Native area ambient requires transferable actor relays');
      }
    };
    validateRelays();
    // Explicit optical forwarding keeps source reads lazy and preserves context receiver.
    this.sight=local.sight({opaqueAt:(...args)=>callbacks.opaqueAt.call(context,...args)});
    const area=this;
    this.hostility={get zone(){return area.zone;},get actors(){return area.actors;},
      sanctuaryBlocksCombat:(...args)=>callbacks.sanctuaryBlocksCombat.call(context,...args),
      isPrey:(...args)=>nativeIsPrey(area.sources.hostility,...args),hostileTo:(...args)=>area.hostileTo(...args)};
    this.factory={get relayStatus(){return area.relay;},
      get bombardMintRev(){return area.bombardMintRev;},set bombardMintRev(v){area.bombardMintRev=v;},
      stampMonsterLevel:(...args)=>stampNativeMonsterLevel(...args,area.sources.factory),
      applyPartyScale:(...args)=>callbacks.applyPartyScale.call(context,...args),get zoneGenTagging(){return area.zoneGenTagging;},
      get npcDialogues(){return context.npcDialogues;},armAmbush:(...args)=>armNativeMonsterAmbush(...args,area.sources.factory),
      get time(){return context.time;}};
    this.promotion={get actors(){return area.actors;},
      get magicPackResolving(){return area.magicPackResolving;},set magicPackResolving(v){area.magicPackResolving=v;},
      get magicPackRefreshPending(){return area.magicPackRefreshPending;},set magicPackRefreshPending(v){area.magicPackRefreshPending=v;},
      get magicPackEffects(){return area.magicPackEffects;},set magicPackEffects(v){area.magicPackEffects=v;},
      nextSquadId:()=>area.nextSquadId(),promoteRarity:(...args)=>area.promoteRarity(...args),refreshMagicPacks:(...args)=>area.refreshMagicPacks(...args),
      enemiesOf:(...args)=>area.enemiesOf(...args),lineOfSight:(...args)=>area.sight.lineOfSight(...args),clipShot:(...args)=>area.sight.clipShot(...args),
      resolveHit:(...args)=>callbacks.resolveHit.call(context,...args)};
    const ambient:NativeAreaAmbientServices['ambient']={
      get config(){return area.sources.ambient.config;},get random(){return area.sources.ambient.random;},
      rand:(...a)=>area.sources.ambient.rand(...a),randInt:(...a)=>area.sources.ambient.randInt(...a),
      monster:(...a)=>area.sources.ambient.monster(...a),packageActive:(...a)=>area.sources.ambient.packageActive(...a),
      weightedPick:(...a)=>area.sources.ambient.weightedPick(...a),rollPackSize:(...a)=>area.sources.ambient.rollPackSize(...a),
      rollRarity:(...a)=>area.sources.ambient.rollRarity(...a),magicPackPool:(...a)=>area.sources.ambient.magicPackPool(...a),
      magicPackSize:(...a)=>area.sources.ambient.magicPackSize(...a),rollMagicPack:(...a)=>area.sources.ambient.rollMagicPack(...a),
      storyTable:(...a)=>area.sources.ambient.storyTable(...a),tierFloorAt:(...a)=>area.sources.ambient.tierFloorAt(...a),
      encounterGroupContext:(...a)=>area.sources.ambient.encounterGroupContext(...a),rollEncounterGroup:(...a)=>area.sources.ambient.rollEncounterGroup(...a),
      presenceMul:(...a)=>area.sources.ambient.presenceMul(...a),notice:(...a)=>area.sources.ambient.notice(...a),
      nextSquadId:()=>area.nextSquadId(),createMonster:(...a)=>area.createMonster(...a),
      promoteRarity:(...a)=>area.promoteRarity(...a),promoteMagicPack:(...a)=>area.promoteMagicPack(...a),
      wildlifeTableFor:(...a)=>area.population.wildlifeTableFor(...a),verminPressure:()=>area.population.verminPressure(),
    };
    this.host=Object.freeze(local.ambient({ambient,groups:this.sources.groups,player:this.player,actors:this.actors}));
    for(const key of ['local','population','zone','actors','player','sight','host','sources','factory','promotion','hostility','relayHost','relay'])
      Object.defineProperty(this,key,{writable:false,configurable:false});
    // A trusted live provider may have changed the cohort while building the host.
    // Revalidate after its last read, before transferring even the first relay.
    validateRelays();
    for(const actor of this.actors){
      const d=Object.getOwnPropertyDescriptor(actor,'statusRelay');
      Object.defineProperty(actor,'statusRelay',d?{...d,value:this.relay}:{value:this.relay,writable:true,enumerable:true,configurable:true});
    }
  }
  /** Bind the original inhabitants stages to this same census, factory and
   * fixed local geometry. Caller retains native reset/replay/load ordering. */
  inhabitants(context:NativeAreaResidentContext):NativeInhabitantHost {
    for(const key of ['account','ledger','massSettlementDay','speakerRows','speechMemory','speechFocus','speechFocusSpeaker','dialogueScene','npcDialogues'])
      if(!context||!Object.hasOwn(context,key))throw Error('Native area inhabitants require explicit resident state: '+key);
    const area=this,placement=this.local.placement((...args)=>area.sources.ambient.rand(...args));
    return Object.freeze({
      get actors(){return area.actors;},get doodads(){return area.local.doodads;},
      get account(){return context.account;},get ledger(){return context.ledger;},
      get massSettlementDay(){return context.massSettlementDay;},get time(){return area.factory.time;},
      get speakerRows(){return context.speakerRows;},get speechMemory(){return context.speechMemory;},get speechFocus(){return context.speechFocus;},
      get speechFocusSpeaker(){return context.speechFocusSpeaker;},set speechFocusSpeaker(v:number|undefined){context.speechFocusSpeaker=v;},
      get dialogueScene(){return context.dialogueScene;},set dialogueScene(v:number){context.dialogueScene=v;},
      get npcDialogues(){return context.npcDialogues;},
      get createMonster(){const method=area.createMonster;return (...args:Parameters<NativeInhabitantHost['createMonster']>)=>method.apply(area,args);},
      clampPos:(...args:Parameters<NativeInhabitantHost['clampPos']>)=>placement.clampPos(...args),
      get findFreeSpot(){const owner=area.host,method=owner.findFreeSpot;return (...args:Parameters<NativeInhabitantHost['findFreeSpot']>)=>method.apply(owner,args);},
      get nextSquadId(){const method=area.nextSquadId;return ()=>method.call(area);},
      get weightedPick(){const owner=area.sources.ambient,method=owner.weightedPick;return (...args:Parameters<NativeInhabitantHost['weightedPick']>)=>method.apply(owner,args);},
      armAmbush:(...args:Parameters<NativeInhabitantHost['armAmbush']>)=>armNativeMonsterAmbush(...args,area.sources.factory),
      get promoteMonster(){const method=area.promoteMonster;return (...args:Parameters<NativeInhabitantHost['promoteMonster']>)=>method.apply(area,args);},
    });
  }
  nextSquadId():number {return this.squadSequence++;}
  createMonster(id:string,level:number,team:Team,owner?:Actor,spawn?:{scale?:number}):Actor {
    return createNativeMonster(this.factory,this.sources.factory,id,level,team,owner,spawn);
  }
  hostileTo(a:Actor,b:Actor):boolean {return nativeHostileTo(this.hostility,this.sources.hostility,a,b);}
  enemiesOf(a:Actor):Actor[] {return nativeEnemiesOf(this.hostility,a);}
  promoteRarity(a:Actor,rarity:MonsterRarity,opts?:{distinctName?:string|boolean}):void {
    promoteNativeRarity(this.promotion,this.sources.promotion,a,rarity,opts);
  }
  promoteMonster(a:Actor,rarity:MonsterRarity,stacks=1,opts?:{distinctName?:string|boolean}):void {
    promoteNativeRarityStacked(this.promotion,this.sources.promotion,a,rarity,stacks,opts);
  }
  promoteMagicPack(members:Actor[],mechanic:string):boolean {return promoteNativeMagicPack(this.promotion,this.sources.promotion,members,mechanic);}
  refreshMagicPacks(dt=0):void {refreshNativeMagicPacks(this.promotion,this.sources.promotion,dt);}
  /** Resolution remains explicit: its inject list belongs to a separate native stage. */
  resolvePacks() {return this.population.packs();}
  spawnPacks(factor=1,table?:readonly PackTableEntry[]):void {spawnNativePacks(this.host,this.zone,factor,table);}
  /** Invoke only at the later native wildlife boundary. */
  spawnWildlife():void {spawnNativeWildlife(this.host,this.zone);}
}
