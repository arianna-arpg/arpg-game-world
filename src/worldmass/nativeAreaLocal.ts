import { castRay, LOS_CFG } from '../engine/los';
import { nativeFloorElevAt, nativeRayElev, nativeShotElev, nativeLineOfSight, nativeSightClipD, nativeLineOfFire, nativeClipShot, type NativeSightHost, type NativeSightSources } from '../engine/nativeSight';
import { dist, vec, type Vec2 } from '../core/math';
import type { ZoneDef } from '../data/zones';
import { GridWalkField, DEFAULT_CELL } from '../world/gridWalk';
import { hullOf } from '../world/shape';
import { isDoodadGround, regionKind } from '../world/regions';
import type { WalkField } from '../world/walk';
import { blocksMovement, doodadRuleOf, hitSurfaceOf, normalizeDoodadBound, pitRegionOf, type Doodad } from '../engine/levelgen';
import { makeTierNav, makeTierView, tierElevOf, MAX_TIER } from '../engine/tiers';
import { DiscIndex, SPATIAL_CFG } from '../engine/spatial';
import { pushOutOfShape, shapeContains, shapeAabbHalf } from '../engine/shapes';
import { pitAt, pitSupportedAt, type PitSurface } from '../engine/pitfall';
import { nativePlacementClamp, nativeFindFreeSpot, nativeFarthestStand, nativeFarPoint, type NativePlacementHost } from '../engine/nativePlacement';
import { buildNativeConvexNav, paintNativeNavGrounds, stampNativeNavSurface, type NativeNavigationHost } from '../engine/nativeNavigation';
import { placeNativeInHabitat, type NativeAmbientHost } from '../engine/nativeAmbient';
import { spawnNativeEncounterGroup, type NativeEncounterGroupHost } from '../engine/nativeEncounterGroup';
import { copyNativeAreaData, createNativeAreaGeometry, NATIVE_AREA_GEOMETRY_LIMITS, type NativeAreaGeometrySource } from './nativeAreaGeometry';

/** Local preparation frame, never a live World or a runtime area owner.
 * Inputs must be the complete generated geometry at the relevant native stage;
 * installed native source and controller binding remain the caller's obligation.
 * Terrain/doors are fixed during this preparation. Rebuild for a changed stage.
 * No actor, scene, reward, save claim or current World field is published here. */
export interface NativeAreaLocalInput {
  zone: ZoneDef; geometry: NativeAreaGeometrySource; entry: Vec2; playerPosition: Vec2;
  config: { navigationPad: number; eventSpacing: number; ledgeGrasp: number; pitSweepGran: number };
}
type AmbientLocalKeys = 'arena'|'walk'|'tierViews'|'player'|'actors'|'doodads'|'isGridWalk'|'farPoint'|'findFreeSpot'|'placeInHabitat'|'spawnEncounterGroup';
export interface NativeAreaAmbientServices {
  /** Actual stage-local factory/resolution/promotion/RNG owners. In particular,
   * promotion must use this staged population, not a running World's actors. */
  ambient: Omit<NativeAmbientHost, AmbientLocalKeys>;
  groups: Pick<NativeEncounterGroupHost, 'group'|'config'|'encounterGroupContext'|'planEncounterGroup'|'applyEncounterGroup'>;
  player: NonNullable<NativeAmbientHost['player']>;
  actors: NativeAmbientHost['actors'];
}
/** Explicit local optical-medium owner; omission must not silently remove fog. */
export interface NativeAreaSightServices { opaqueAt(x:number,y:number):boolean }
export interface NativeAreaSight {
  lineOfSight(from:Vec2,to:Vec2,fromTier?:number,toTier?:number):boolean;
  sightClipD(from:Vec2,to:Vec2,fromTier?:number,toTier?:number):number;
  lineOfFire(from:Vec2,to:Vec2,story?:number):boolean;
  clipShot(from:Vec2,to:Vec2,story?:number):Vec2;
}
const nativeSightSources:NativeSightSources={
  get castRay(){return castRay;},get LOS_CFG(){return LOS_CFG;},
  get tierElevOf(){return tierElevOf;},get dist(){return dist;},get vec(){return vec;},
};
// Preserve exact public source records; private execution never inherits
// mutable process defaults for optional native fields.
function localData<T>(value:T,freeze=true):T {
  if(!value || typeof value!=='object')return value;
  if(Array.isArray(value)){const out=value.map(v=>localData(v,freeze));return (freeze?Object.freeze(out):out) as T;}
  const out=Object.create(null) as Record<string,unknown>;
  for(const key of Object.keys(value))out[key]=localData((value as Record<string,unknown>)[key],freeze);
  return (freeze?Object.freeze(out):out) as T;
}
export const NATIVE_AREA_LOCAL_LIMITS=Object.freeze({navigationVisits:8_388_608,gridAxis:Math.ceil(16384/DEFAULT_CELL)});
const localOwn=(v:unknown,keys:readonly string[])=>!!v&&typeof v==='object'&&keys.every(k=>Object.hasOwn(v,k));
export class NativeAreaLocal {
  readonly input: NativeAreaLocalInput;
  private readonly context: NativeAreaLocalInput;
  readonly doodads: readonly Doodad[];
  readonly walk: GridWalkField | null;
  readonly tierViews: readonly (WalkField | undefined)[] | null;
  private readonly geometry: ReturnType<typeof createNativeAreaGeometry>;
  private readonly index = new DiscIndex<Doodad>();
  private readonly bridges: Doodad[];
  private readonly pits: PitSurface[];
  private readonly grounds: Doodad[];
  private readonly tierNavs = new Map<number, GridWalkField>();
  private convexNav: GridWalkField | undefined;
  private readonly nav: NativeNavigationHost;
  constructor(input: NativeAreaLocalInput) {
    this.input = copyNativeAreaData(input);
    if(!localOwn(this.input,['zone','geometry','entry','playerPosition','config'])
      || !localOwn(this.input.entry,['x','y']) || !localOwn(this.input.playerPosition,['x','y'])
      || !localOwn(this.input.config,['navigationPad','eventSpacing','ledgeGrasp','pitSweepGran'])
      || !localOwn(this.input.zone,['id','size','shape','level']))throw Error('Incomplete native local preparation context');
    this.geometry = createNativeAreaGeometry(this.input.geometry);
    this.context=localData(this.input);input=this.context;
    const levels=input.zone.tiers?.levels??1;
    if(!Number.isSafeInteger(levels)||levels<1||levels>MAX_TIER)throw Error('Native local preparation exceeds supported tier stack');
    if (input.geometry.bounds.boundless || input.zone.size.w !== input.geometry.bounds.w || input.zone.size.h !== input.geometry.bounds.h
      || input.zone.shape !== input.geometry.bounds.shape) throw Error('Local native preparation requires matching complete finite bounds');
    if (![input.entry.x,input.entry.y,input.playerPosition.x,input.playerPosition.y,...Object.values(input.config)].every(Number.isFinite)
      || input.config.navigationPad < 0 || input.config.eventSpacing < 0 || input.config.ledgeGrasp < 0 || input.config.pitSweepGran <= 0)
      throw Error('Invalid native local preparation context');
    // Geometry source remains unchanged. Native broad-phase normalization owns
    // only this separate working copy, just as the original World index does.
    const arenaHull=hullOf(input.geometry.bounds);
    if(input.geometry.walk.kind==='analytic' && Math.ceil(arenaHull.w/DEFAULT_CELL)*Math.ceil(arenaHull.h/DEFAULT_CELL)>NATIVE_AREA_GEOMETRY_LIMITS.cells)
      throw Error('Native local navigation exceeds cell budget');
    // structuredClone would restore ordinary prototypes before native bound
    // normalization. Keep these mutable working records own-only from birth.
    const doodads = localData(input.geometry.layout.doodads,false);
    for (const d of doodads) normalizeDoodadBound(d);
    if(input.geometry.walk.kind==='analytic') {
      // The original non-circular stamp traverses an un-clipped padded window.
      // Bound its real lattice before allocation; a huge finite pad can stop a
      // floating-point loop from advancing at all. Include repeated paint work.
      let visits=Math.ceil(arenaHull.w/DEFAULT_CELL)*Math.ceil(arenaHull.h/DEFAULT_CELL);
      const charge=(w:number,h:number)=>{
        const nx=Math.ceil(w/DEFAULT_CELL)+3,ny=Math.ceil(h/DEFAULT_CELL)+3;
        visits+=nx*ny;
        if(!Number.isSafeInteger(nx)||!Number.isSafeInteger(ny)||nx<0||ny<0||visits>NATIVE_AREA_LOCAL_LIMITS.navigationVisits)
          throw Error('Native local navigation exceeds stamp work budget');
      };
      for(const piece of input.geometry.bounds.pieces??[])if(piece.active)charge(piece.w,piece.h);
      for(const d of doodads){
        const rule=doodadRuleOf(d.kind);
        if(rule.spans || isDoodadGround(d.kind))charge(2*d.radius,2*d.radius);
        if(!rule.spans && blocksMovement(d)){
          const {ex,ey}=shapeAabbHalf(hitSurfaceOf(d,'move'));
          charge(2*(ex+input.config.navigationPad),2*(ey+input.config.navigationPad));
        }
      }
    }
    const {cell,pad}={cell:SPATIAL_CFG.cell,pad:SPATIAL_CFG.queryPad};
    if(!Number.isFinite(cell)||cell<=0||!Number.isFinite(pad)||pad<0)throw Error('Invalid native local index policy');
    let entries=0;
    for(const d of doodads){
      const radius=Math.max(d.radius,d.boundR??d.radius)+pad;
      const x0=Math.floor((d.pos.x-radius)/cell),x1=Math.floor((d.pos.x+radius)/cell);
      const y0=Math.floor((d.pos.y-radius)/cell),y1=Math.floor((d.pos.y+radius)/cell);
      entries+=(x1-x0+1)*(y1-y0+1);
      if(!Number.isFinite(radius)||radius<0||Math.min(x0,y0)<-32768||Math.max(x1,y1)>32767||entries>NATIVE_AREA_GEOMETRY_LIMITS.indexEntries)
        throw Error('Native local spatial index exceeds supported work or coordinate range');
    }
    this.doodads = localData(doodads); this.index.build(this.doodads);
    this.bridges = this.doodads.filter(d => doodadRuleOf(d.kind).spans);
    this.grounds = this.doodads.filter(d => isDoodadGround(d.kind));
    this.pits = this.doodads.flatMap(d => { const region = d.gone ? undefined : pitRegionOf(d);
      return region ? [{ x:d.pos.x,y:d.pos.y,r:d.radius,kind:d.kind,region }] : []; });
    // Match the native compiler's finite 16,384px / 30px-cell envelope per
    // axis. Cell count alone permits extremely thin grids whose original
    // nearest-floor square-ring search has cubic worst-case work.
    if(input.geometry.walk.kind==='grid' && Math.max(input.geometry.walk.packed.cols,input.geometry.walk.packed.rows)>NATIVE_AREA_LOCAL_LIMITS.gridAxis)
      throw Error('Native local placement exceeds grid axis budget');
    this.walk = input.geometry.walk.kind === 'grid' ? GridWalkField.unpack(input.geometry.walk.packed) : null;
    if (this.walk) {
      const views: (WalkField | undefined)[] = [];
      for (let t=1;t<=Math.max(1,input.zone.tiers?.levels??1);t++) views[t]=makeTierView(this.walk,t);
      this.tierViews=views;
    } else this.tierViews=null;
    const nav: NativeNavigationHost = { arena:input.geometry.bounds,arenaHull,doodads:this.doodads,grounds:this.grounds,
      pad:input.config.navigationPad,doodadRuleOf,blocksMovement,hitSurfaceOf,groundAt:p=>this.geometry.groundAt(p),
      paintNavGrounds:g=>paintNativeNavGrounds(nav,g),stampNavSurface:(g,d)=>stampNativeNavSurface(nav,g,d) };
    this.nav=nav;
  }
  /** Fixed-stage native sight/shot channels over retained geometry. The optical
   * medium remains an explicit local capability, not captured source authority. */
  sight(services:NativeAreaSightServices):NativeAreaSight {
    const optical=services&&Object.getOwnPropertyDescriptor(services,'opaqueAt');
    if(!optical||!Object.hasOwn(optical,'value')||typeof optical.value!=='function')throw Error('Native area sight requires its own optical-medium service');
    const local=this,opaqueAt=optical.value as NativeAreaSightServices['opaqueAt'];
    const host:NativeSightHost={
      get zone(){return local.context.zone;},get walk(){return local.walk;},
      doodadsAt:(x,y)=>local.index.at(x,y),opaqueAt:(...args)=>opaqueAt.call(services,...args),
      floorElevAt:p=>nativeFloorElevAt(host,nativeSightSources,p),
      rayElev:(...args)=>nativeRayElev(host,nativeSightSources,...args),
      shotElev:(...args)=>nativeShotElev(host,nativeSightSources,...args),
    };
    return Object.freeze({
      lineOfSight:(...args:Parameters<NativeAreaSight['lineOfSight']>)=>nativeLineOfSight(host,nativeSightSources,...args),
      sightClipD:(...args:Parameters<NativeAreaSight['sightClipD']>)=>nativeSightClipD(host,nativeSightSources,...args),
      lineOfFire:(...args:Parameters<NativeAreaSight['lineOfFire']>)=>nativeLineOfFire(host,nativeSightSources,...args),
      clipShot:(...args:Parameters<NativeAreaSight['clipShot']>)=>nativeClipShot(host,nativeSightSources,...args),
    });
  }
  pointInSolid(x:number,y:number,margin=0,tier=0):Doodad|null {
    for(const d of this.index.at(x,y)) {
      if((d.tier??0)!==tier || !blocksMovement(d) || !shapeContains(hitSurfaceOf(d,'move'),d.pos.x,d.pos.y,x,y,margin))continue;
      if(d.kind==='chasm' && this.bridges.some(b=>dist({x,y},b.pos)<=b.radius))continue;
      return d;
    }
    return null;
  }
  pathField(story=0):WalkField|null {
    if(this.walk) {
      if(!this.walk.pathStep)return null;
      if(story>=1 && this.context.zone.tiers && this.tierViews) {
        const t=Math.max(1,Math.min(story,this.tierViews.length-1));
        let field=this.tierNavs.get(t);if(!field){field=makeTierNav(this.walk,t);this.tierNavs.set(t,field);}return field;
      }
      return this.walk;
    }
    return this.convexNav ??= buildNativeConvexNav(this.nav);
  }
  /** Own synchronous tier scope; never writes a live World's walk/zone. Each
   * stage host gets its own event anchors and original supplied random stream. */
  placement(rand:NativePlacementHost['rand']):NativePlacementHost {
    const host:NativePlacementHost={arena:this.context.geometry.bounds,walk:this.walk,tierViews:this.tierViews,zoneTiers:this.context.zone.tiers,
      playerPosition:this.context.playerPosition,zoneEntry:this.context.entry,eventAnchors:[],bridges:this.bridges,
      config:{eventSpacing:this.context.config.eventSpacing,ledgeGrasp:this.context.config.ledgeGrasp,pitSweepGran:this.context.config.pitSweepGran},
      rand,isGridWalk:(w):w is GridWalkField=>w instanceof GridWalkField,doodadsAt:(x,y)=>this.index.at(x,y),pointInSolid:(...args)=>this.pointInSolid(...args),
      clampPos:(p,r,_from,opts)=>nativePlacementClamp(host,p,r,opts?.tier),farthestStand:(r,reachable)=>nativeFarthestStand(host,r,reachable),
      blocksMovement,hitSurfaceOf,pushOutOfShape,pitRegionOf,regionKind,zonePits:()=>this.pits,pitHomeKinds:()=>null,pitAt,pitSupportedAt};
    return host;
  }
  /** Wires the actual shared pack/wildlife/group operations to this area's
   * local geometry. This binds placement only; it does not resolve world-sim
   * inputs, change native load ordering, own RNG continuation or admit bodies. */
  ambient(services:NativeAreaAmbientServices):NativeAmbientHost {
    // Read source providers when each native operation does. In particular,
    // binding this frame before a seeded scope must not retain Math.random.
    const local=this.placement((...args)=>services.ambient.rand(...args));
    const host:NativeAmbientHost={arena:this.context.geometry.bounds,walk:this.walk,tierViews:this.tierViews,
      player:services.player,actors:services.actors,doodads:this.doodads,isGridWalk:local.isGridWalk,
      get config(){return services.ambient.config;},get random(){return services.ambient.random;},
      rand:(...a)=>services.ambient.rand(...a),randInt:(...a)=>services.ambient.randInt(...a),
      monster:(...a)=>services.ambient.monster(...a),packageActive:(...a)=>services.ambient.packageActive(...a),
      weightedPick:(...a)=>services.ambient.weightedPick(...a),rollPackSize:(...a)=>services.ambient.rollPackSize(...a),
      rollRarity:(...a)=>services.ambient.rollRarity(...a),magicPackPool:(...a)=>services.ambient.magicPackPool(...a),
      magicPackSize:(...a)=>services.ambient.magicPackSize(...a),rollMagicPack:(...a)=>services.ambient.rollMagicPack(...a),
      storyTable:(...a)=>services.ambient.storyTable(...a),tierFloorAt:(...a)=>services.ambient.tierFloorAt(...a),
      encounterGroupContext:(...a)=>services.ambient.encounterGroupContext(...a),rollEncounterGroup:(...a)=>services.ambient.rollEncounterGroup(...a),
      nextSquadId:(...a)=>services.ambient.nextSquadId(...a),createMonster:(...a)=>services.ambient.createMonster(...a),
      promoteRarity:(...a)=>services.ambient.promoteRarity(...a),promoteMagicPack:(...a)=>services.ambient.promoteMagicPack(...a),
      wildlifeTableFor:(...a)=>services.ambient.wildlifeTableFor(...a),verminPressure:(...a)=>services.ambient.verminPressure(...a),
      presenceMul:(...a)=>services.ambient.presenceMul(...a),notice:(...a)=>services.ambient.notice(...a),
      farPoint:min=>nativeFarPoint(local,min),findFreeSpot:(p,r,t)=>nativeFindFreeSpot(local,p,r,t),
      placeInHabitat:a=>placeNativeInHabitat(host,a),spawnEncounterGroup:(recipe,level,at,options)=>spawnNativeEncounterGroup(groups,recipe,level,at,options)};
    const groups:NativeEncounterGroupHost={zone:this.context.zone,player:{pos:this.context.playerPosition},tierViews:this.tierViews,actors:services.actors,
      get config(){return services.groups.config;},group:(...a)=>services.groups.group(...a),
      encounterGroupContext:(...a)=>services.groups.encounterGroupContext(...a),planEncounterGroup:(...a)=>services.groups.planEncounterGroup(...a),
      applyEncounterGroup:(...a)=>services.groups.applyEncounterGroup(...a),
      rand:(...a)=>host.rand(...a),pathField:t=>this.pathField(t),createMonster:(...a)=>host.createMonster(...a),
      findFreeSpot:(p,r,t)=>host.findFreeSpot(p,r,t),placeInHabitat:a=>host.placeInHabitat(a),pointInSolid:(...args)=>this.pointInSolid(...args),nextSquadId:()=>host.nextSquadId()};
    return host;
  }
}
