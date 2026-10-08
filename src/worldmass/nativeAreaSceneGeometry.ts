import {nativeFellDoodad,nativeRebuildClientTerrain} from '../engine/nativeSceneTerrain';
import { refreshMovementTether } from '../engine/movementTether';
import { nativeFloorElevAt, nativeRayElev, nativeShotElev, nativeLineOfSight, nativeSightClipD, nativeLineOfFire, nativeClipShot, type NativeSightSources } from '../engine/nativeSight';
import { castRay, LOS_CFG } from '../engine/los';
import { tierElevOf } from '../engine/tiers';
import { dist } from '../core/math';
const sightSources:NativeSightSources={get castRay(){return castRay;},get LOS_CFG(){return LOS_CFG;},get tierElevOf(){return tierElevOf;},get dist(){return dist;},get vec(){return vec;}};
import { WEATHER_DRESS_CFG } from '../engine/weatherDress';
import type { World } from '../engine/world';
import type { Actor } from '../engine/actor';
import type { Vec2 } from '../core/math';
import { vec } from '../core/math';
import { GridWalkField } from '../world/gridWalk';
import { DiscIndex } from '../engine/spatial';
import type { Doodad, GeneratedLayout } from '../engine/levelgen';
import { hullOf, type Bounds } from '../world/shape';
import * as native from '../engine/nativeSceneGeometry';
import { adoptNativeAreaLayout, type NativeAreaLayoutHost } from '../engine/nativeAreaLayout';
export interface NativeSceneActorContext { zone:World['zone']; actors:Actor[]; player:Actor }
export interface NativeSceneCampaignContext { ledger:World['ledger']; seasSeen:World['seasSeen'];
 oceanBearing:World['oceanBearing']; seaNameOf:World['seaNameOf']; notice:World['notice']; text:World['text'];
 readonly time:number; readonly seats:World['seats'];
 seatOf:World['seatOf']; drainSurvival:World['drainSurvival']; radianceCondHeld:World['radianceCondHeld']; createMonster:World['createMonster'];
}
/** Genuine mutable geometry owner. Its roots are the real native working data,
 * shared with later birth and controller owners. It never borrows a World. */
export class NativeAreaSceneGeometry implements native.NativeSceneGeometryHost, NativeAreaLayoutHost {
 frontSpawned=0; frontRiders=0;
 get time(){return this.campaign.time;} get seats(){return this.campaign.seats;}
 get seatOf(){const c=this.campaign,f=c.seatOf;return (...args:Parameters<World['seatOf']>)=>f.apply(c,args);}
 get drainSurvival(){const c=this.campaign,f=c.drainSurvival;return (...args:Parameters<World['drainSurvival']>)=>f.apply(c,args);}
 get radianceCondHeld(){const c=this.campaign,f=c.radianceCondHeld;return (...args:Parameters<World['radianceCondHeld']>)=>f.apply(c,args);}
 get createMonster(){const c=this.campaign,f=c.createMonster;return (...args:Parameters<World['createMonster']>)=>f.apply(c,args);}
 readonly arena:Bounds; arenaHull:{w:number;h:number};
 readonly navigationPad:number; readonly eventSpacing:number; readonly minPortalSeparation:number;
 get zone(){return this.state.zone;} get player(){return this.state.player;}
 get actors(){return this.state.actors;} set actors(v:Actor[]){this.state.actors=v;}
 get ledger(){return this.campaign.ledger;} get seasSeen(){return this.campaign.seasSeen;}
 constructor(readonly state:NativeSceneActorContext,arena:Bounds,readonly campaign:NativeSceneCampaignContext,
 config:{navigationPad:number;eventSpacing:number;minPortalSeparation:number}) {
  this.arena=arena;this.arenaHull=hullOf(arena);this.navigationPad=config.navigationPad;this.eventSpacing=config.eventSpacing;this.minPortalSeparation=config.minPortalSeparation;
 }
  demonPortals:World['demonPortals'] = [];
  crusadePortals:World['crusadePortals'] = [];
  necropolisPortals:World['necropolisPortals'] = [];
  fractureRifts:World['fractureRifts'] = [];
  descentSite:World['descentSite'] = null;
  doodads:World['doodads'] = [];
  bridges:World['bridges'] = [];
  grounds:World['grounds'] = [];
  walk:World['walk'] = null;
  tierViews:World['tierViews'] = null;
  tierCrossings:World['tierCrossings'] = [];
  tierNavs:World['tierNavs'] = new Map<number, { g: GridWalkField; walk: GridWalkField; v: number }>();
  tierSeats:World['tierSeats'] = null;
  airPockets:World['airPockets'] = [];
  grantedPocketCache:World['grantedPocketCache'] = new Map();
  grantedTrailMemory:World['grantedTrailMemory'] = new Map();
  syncedGrantedPockets:World['syncedGrantedPockets'] = undefined;
  structures:World['structures'] = [];
  breachPos:World['breachPos'] = null;
  dimGates:World['dimGates'] = [];
  bossRun:World['bossRun'] = null;
  arenaSinks:World['arenaSinks'] = new Map<number, {
    anchor: Vec2; rect: { x0: number; y0: number; x1: number; y1: number };
    dais: number; mode: 'ground' | 'deep_water'; radius: number;
    cracks: { x: number; y: number; r: number }[];
  }>();
  migrantSquadId:World['migrantSquadId'] = undefined;
  arenaWash:World['arenaWash'] = null;
  shake:World['shake'] = 0;
  snowCover:World['snowCover'] = 0;
  snowFloor:World['snowFloor'] = 0;
  weatherDressAcc:World['weatherDressAcc'] = WEATHER_DRESS_CFG.cadenceSec;
  tempGrounds:World['tempGrounds'] = [];
  evaporating:World['evaporating'] = [];
  regrowing:World['regrowing'] = [];
  rampageTimer:World['rampageTimer'] = 0;
  fog:World['fog'] = null;
  currentZoneSeed:World['currentZoneSeed'] = 0;
  creep:World['creep'] = null;
  tracks:World['tracks'] = [];
  trackSweepAcc:World['trackSweepAcc'] = 0;
  trapworks:World['trapworks'] = [];
  trapSweepAcc:World['trapSweepAcc'] = 0;
  trapDeferred:World['trapDeferred'] = [];
  caveEntrances:World['caveEntrances'] = [];
  zoneHollows:World['zoneHollows'] = [];
  openedHollows:World['openedHollows'] = new Set<string>();
  zoneAnnexSpecs:World['zoneAnnexSpecs'] = [];
  caveExitGrace:World['caveExitGrace'] = false;
  zoneEntry:World['zoneEntry'] = vec(0, 0);
  exits:World['exits'] = [];
  waypointPos:World['waypointPos'] = null;
  farPointDraws:World['farPointDraws'] = 0;
  doodadIdx:World['doodadIdx'] = new DiscIndex<Doodad>();
  doodadIdxArr:World['doodadIdxArr'] = null;
  doodadIdxLen:World['doodadIdxLen'] = -1;
  doodadIdxRev:World['doodadIdxRev'] = -1;
  doodadsRev:World['doodadsRev'] = 0;
  famEpoch:World['famEpoch'] = -1;
  famRevs:World['famRevs'] = [];
  convexNav:World['convexNav'] = null;
  convexNavKey:World['convexNavKey'] = '';
  pitsCache:World['pitsCache'] = { arr: null, len: -1, rev: -1, list: [] };
  collapse:World['collapse'] = null;
  flux:World['flux'] = null;
  conjured:World['conjured'] = null;
  massRuntime:World['massRuntime'] = null;
  flashes:World['flashes'] = [];
  contactHazards:World['contactHazards'] = [];
  eventAnchors:World['eventAnchors'] = [];
 fellDoodad(...args:Parameters<World['fellDoodad']>){return nativeFellDoodad(this,...args);}
 rebuildClientTerrain(){return nativeRebuildClientTerrain(this);}
 nativeSettlementGrid(){return this.walk instanceof GridWalkField?this.walk:null;}
 nativeGridAt(_pos:Vec2){return this.nativeSettlementGrid();}
 text(...args:Parameters<World['text']>){return this.campaign.text(...args);}
 notice(...args:Parameters<World['notice']>){return this.campaign.notice(...args);}
 oceanBearing(...args:Parameters<World['oceanBearing']>){return this.campaign.oceanBearing(...args);}
 seaNameOf(...args:Parameters<World['seaNameOf']>){return this.campaign.seaNameOf(...args);}
 installCreepFront(...args:Parameters<World['installCreepFront']>){return native.nativeSceneInstallCreepFront(this,...args);}
 frontConsume(...args:Parameters<World['frontConsume']>){return native.nativeSceneFrontConsume(this,...args);}
 refreshMovementTether(a:Actor){return refreshMovementTether(a,{actorById:id=>this.actors.find(a=>a.id===id)});}
 isGridWalk(walk:World['walk']):walk is GridWalkField{return walk instanceof GridWalkField;}
 floorElevAt(...args:Parameters<World['floorElevAt']>):ReturnType<World['floorElevAt']>{return nativeFloorElevAt(this,sightSources,...args);}
 rayElev(...args:Parameters<World['rayElev']>):ReturnType<World['rayElev']>{return nativeRayElev(this,sightSources,...args);}
 shotElev(...args:Parameters<World['shotElev']>):ReturnType<World['shotElev']>{return nativeShotElev(this,sightSources,...args);}
 lineOfSight(...args:Parameters<World['lineOfSight']>):ReturnType<World['lineOfSight']>{return nativeLineOfSight(this,sightSources,...args);}
 sightClipD(...args:Parameters<World['sightClipD']>):ReturnType<World['sightClipD']>{return nativeSightClipD(this,sightSources,...args);}
 lineOfFire(...args:Parameters<World['lineOfFire']>):ReturnType<World['lineOfFire']>{return nativeLineOfFire(this,sightSources,...args);}
 clipShot(...args:Parameters<World['clipShot']>):ReturnType<World['clipShot']>{return nativeClipShot(this,sightSources,...args);}
 adopt(layout:GeneratedLayout,entry:Vec2){adoptNativeAreaLayout(this,this.zone,layout,entry,this.zone.id);}
 doodadsAt(...args:Parameters<World['doodadsAt']>):ReturnType<World['doodadsAt']>{return native.nativeSceneDoodadsAt(this,...args);}
 doodadsNear(...args:Parameters<World['doodadsNear']>):ReturnType<World['doodadsNear']>{return native.nativeSceneDoodadsNear(this,...args);}
 ensureDoodadIdx(...args:Parameters<World['ensureDoodadIdx']>):ReturnType<World['ensureDoodadIdx']>{return native.nativeSceneEnsureDoodadIdx(this,...args);}
 syncFamRevs(...args:Parameters<World['syncFamRevs']>):ReturnType<World['syncFamRevs']>{return native.nativeSceneSyncFamRevs(this,...args);}
 markDoodadsChanged(...args:Parameters<World['markDoodadsChanged']>):ReturnType<World['markDoodadsChanged']>{return native.nativeSceneMarkDoodadsChanged(this,...args);}
 doodadFamilyRev(...args:Parameters<World['doodadFamilyRev']>):ReturnType<World['doodadFamilyRev']>{return native.nativeSceneDoodadFamilyRev(this,...args);}
 pathField(...args:Parameters<World['pathField']>):ReturnType<World['pathField']>{return native.nativeScenePathField(this,...args);}
 tierPathField(...args:Parameters<World['tierPathField']>):ReturnType<World['tierPathField']>{return native.nativeSceneTierPathField(this,...args);}
 zonePits(...args:Parameters<World['zonePits']>):ReturnType<World['zonePits']>{return native.nativeSceneZonePits(this,...args);}
 pitHomeKinds(...args:Parameters<World['pitHomeKinds']>):ReturnType<World['pitHomeKinds']>{return native.nativeScenePitHomeKinds(this,...args);}
 groundInsured(...args:Parameters<World['groundInsured']>):ReturnType<World['groundInsured']>{return native.nativeSceneGroundInsured(this,...args);}
 walkResolve(...args:Parameters<World['walkResolve']>):ReturnType<World['walkResolve']>{return native.nativeSceneWalkResolve(this,...args);}
 walkSweep(...args:Parameters<World['walkSweep']>):ReturnType<World['walkSweep']>{return native.nativeSceneWalkSweep(this,...args);}
 pitResolve(...args:Parameters<World['pitResolve']>):ReturnType<World['pitResolve']>{return native.nativeScenePitResolve(this,...args);}
 pitSweep(...args:Parameters<World['pitSweep']>):ReturnType<World['pitSweep']>{return native.nativeScenePitSweep(this,...args);}
 clampPos(...args:Parameters<World['clampPos']>):ReturnType<World['clampPos']>{return native.nativeSceneClampPos(this,...args);}
 pointInSolid(...args:Parameters<World['pointInSolid']>):ReturnType<World['pointInSolid']>{return native.nativeScenePointInSolid(this,...args);}
 groundAt(...args:Parameters<World['groundAt']>):ReturnType<World['groundAt']>{return native.nativeSceneGroundAt(this,...args);}
 roofedStructureAt(...args:Parameters<World['roofedStructureAt']>):ReturnType<World['roofedStructureAt']>{return native.nativeSceneRoofedStructureAt(this,...args);}
 setDoorState(...args:Parameters<World['setDoorState']>):ReturnType<World['setDoorState']>{return native.nativeSceneSetDoorState(this,...args);}
 addTrack(...args:Parameters<World['addTrack']>):ReturnType<World['addTrack']>{return native.nativeSceneAddTrack(this,...args);}
 collectContactHazards(...args:Parameters<World['collectContactHazards']>):ReturnType<World['collectContactHazards']>{return native.nativeSceneCollectContactHazards(this,...args);}
 addTrapwork(...args:Parameters<World['addTrapwork']>):ReturnType<World['addTrapwork']>{return native.nativeSceneAddTrapwork(this,...args);}
 nativeNavigationHost(...args:Parameters<World['nativeNavigationHost']>):ReturnType<World['nativeNavigationHost']>{return native.nativeSceneNativeNavigationHost(this,...args);}
 buildConvexNav(...args:Parameters<World['buildConvexNav']>):ReturnType<World['buildConvexNav']>{return native.nativeSceneBuildConvexNav(this,...args);}
 paintNavGrounds(...args:Parameters<World['paintNavGrounds']>):ReturnType<World['paintNavGrounds']>{return native.nativeScenePaintNavGrounds(this,...args);}
 stampNavSurface(...args:Parameters<World['stampNavSurface']>):ReturnType<World['stampNavSurface']>{return native.nativeSceneStampNavSurface(this,...args);}
 nativePlacementHost(...args:Parameters<World['nativePlacementHost']>):ReturnType<World['nativePlacementHost']>{return native.nativeSceneNativePlacementHost(this,...args);}
 farPoint(...args:Parameters<World['farPoint']>):ReturnType<World['farPoint']>{return native.nativeSceneFarPoint(this,...args);}
 farthestStand(...args:Parameters<World['farthestStand']>):ReturnType<World['farthestStand']>{return native.nativeSceneFarthestStand(this,...args);}
 findFreeSpot(...args:Parameters<World['findFreeSpot']>):ReturnType<World['findFreeSpot']>{return native.nativeSceneFindFreeSpot(this,...args);}
 doorSpots(...args:Parameters<World['doorSpots']>):ReturnType<World['doorSpots']>{return native.nativeSceneDoorSpots(this,...args);}
 clearOfDoors(...args:Parameters<World['clearOfDoors']>):ReturnType<World['clearOfDoors']>{return native.nativeSceneClearOfDoors(this,...args);}
 clearTransitSpot(...args:Parameters<World['clearTransitSpot']>):ReturnType<World['clearTransitSpot']>{return native.nativeSceneClearTransitSpot(this,...args);}
 interactSpot(...args:Parameters<World['interactSpot']>):ReturnType<World['interactSpot']>{return native.nativeSceneInteractSpot(this,...args);}
 seededDraw(...args:Parameters<World['seededDraw']>):ReturnType<World['seededDraw']>{return native.nativeSceneSeededDraw(this,...args);}
 opaqueAt(...args:Parameters<World['opaqueAt']>):ReturnType<World['opaqueAt']>{return native.nativeSceneOpaqueAt(this,...args);}
}
