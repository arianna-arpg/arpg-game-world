import type { Vec2 } from '../core/math';
import type { Doodad, DoodadDoor, GeneratedLayout, PlacedDoor, PlacedRoom } from '../engine/levelgen';
import { blocksMovement, blocksProjectiles, blocksSightOf, hitSurfaceOf } from '../engine/levelgen';
import { shapeContains } from '../engine/shapes';
import { GridWalkField } from '../world/gridWalk';
import { regionKind } from '../world/regions';
import { address, cellKey, localOffset, moveAddress, type MassAddress, type MassCell } from './address';
import type { MassTerrain } from './contracts';
import { canonical, freezeData } from './random';
import { validateNativePreparation, type NativeFeaturePreparation } from './nativePreparation';
import { compileNativeFeature, nativeFeatureAdmission, resolveNativeFeature,
  type NativeFeatureBlueprint, type NativeFeatureDescriptor, type NativeFeatureEntrance,
  verifyNativeIngress, validateNativeIngress, nativeIngressPoints, NATIVE_INGRESS_DEFAULTS,
  type NativeFeatureIngressProof, type NativeFeatureIngressOptions, type NativeFeatureRequest } from './nativeFeatures';

export interface NativeFeaturePlacement {
  id: string;
  /** Durable address of native feature-local (0,0), never a camera origin. */
  origin: MassAddress;
  request: NativeFeatureRequest;
  priority?: number;
}
/** Exact-point broad-phase memo only; never stores solidity or native bodies.
 * Its bound is independent of explored history and hydrated blueprint count. */
export const NATIVE_OBSTACLE_CANDIDATE_CACHE=32768;
export interface NativeResidencyConfig {
  run: string; addressSpan: number; maxBlueprints: number; maxResidents: number; maxCandidates: number;
}
export interface NativeFeatureGrid { id: string; grid: GridWalkField; offset: Vec2 }
export interface NativeFeatureInstance {
  id: string; placement: Readonly<NativeFeaturePlacement>; blueprint: NativeFeatureBlueprint;
  offset: Vec2; grid: NativeFeatureGrid;
  /** All supported native records are in the current physics frame. */
  layout: GeneratedLayout; entrances: NativeFeatureEntrance[];
  /** Context remains feature-local; the host owns native context selection. */
  zone: NativeFeatureDescriptor['zone'];
}
export interface NativeFeatureBinding {
  /** Real actors, active mechanisms and transient effects may pin an owner.
   * False prevents eviction; the residency budget never discards a dependency. */
  canRetire(): boolean;
  /** Save every native lifecycle admitted by this host's capability promises. */
  capture(): unknown;
  detach(): void;
  /** Needed when native destruction physically splices scenery from its list. */
  hasDoodad?(doodad: Doodad): boolean;
}
export interface NativeFeatureHost {
  clock: number;
  canInstall?(instance: NativeFeatureInstance, savedNativeState?: unknown): boolean;
  install(instance: NativeFeatureInstance, savedNativeState?: unknown): NativeFeatureBinding;
}
interface Changes { clock: number; grid: [number,string][]; doodads: [number,Doodad|null][]; native?: unknown }
interface Born { placement: NativeFeaturePlacement; descriptor: NativeFeatureDescriptor; changes: Changes; ingress?:NativeFeatureIngressProof; accessStatus?:'legacy-unverified-access'|'legacy-unverified-reservation'; metadataStatus?:'legacy-unverified-sidechannels' }
/** Provider candidates must include the ingress halo plus its42px protected rim. */
export interface NativeResidencyIngress extends NativeFeatureIngressOptions { regionAt(at:MassAddress):string }
export interface NativeResidencySave { schema: 1; run: string; born: Born[] }
interface Cached {
  born: Born; blueprint: NativeFeatureBlueprint; gridVersion: number;
  instance?: NativeFeatureInstance; binding?: NativeFeatureBinding;
}
const clone = <T>(v:T):T => JSON.parse(JSON.stringify(v)) as T;
const translationRefusals = (b:NativeFeatureBlueprint):string[] =>
  ['tracks','trapworks','annexes'].filter(key => (b.layout[key as keyof GeneratedLayout] as unknown[]|undefined)?.length)
    .map(key=>'native-translation:'+key);
function scope(owner:string,id:string):string { return owner+'::'+id; }

/** Coordinates are translated by their native type, not a recursive x/y
 * heuristic (which would corrupt normals, dimensions and effect vectors).
 * Shared native door identities are rejoined after JSON checkpoint hydration. */
export function translateNativeFeature(blueprint:NativeFeatureBlueprint, owner:string, offset:Vec2):GeneratedLayout {
  const unsupported=translationRefusals(blueprint);
  if(unsupported.length)throw Error(unsupported.join(', '));
  const {walk:_walk,...raw}=blueprint.layout;
  const layout=clone(raw) as GeneratedLayout;
  const point=<T extends Vec2>(p:T):T=>({...p,x:p.x+offset.x,y:p.y+offset.y});
  const doors=new Map<string,DoodadDoor>();
  const door=(d:DoodadDoor):DoodadDoor=>{
    const id=scope(owner,d.id),existing=doors.get(id);if(existing)return existing;
    const next={...d,id,...(d.cells?{cells:point(d.cells)}:{})};doors.set(id,next);return next;
  };
  const placedDoor=(d:PlacedDoor):PlacedDoor=>({...d,pos:point(d.pos),door:door(d.door)});
  const room=(r:PlacedRoom):PlacedRoom=>({...r,rects:r.rects.map(point),windows:r.windows.map(point)});
  layout.doodads=layout.doodads.map(d=>({...d,pos:point(d.pos),
    ...(d.door?{door:door(d.door)}:{}),...(d.anchor?{anchor:scope(owner,d.anchor)}:{}),
    ...(d.hollow?{hollow:scope(owner,d.hollow)}:{}),...(d.annex?{annex:scope(owner,d.annex)}:{})}));
  layout.pois=layout.pois.map(point);layout.camps=layout.camps.map(point);
  layout.breakables=layout.breakables.map(r=>({...r,pos:point(r.pos)}));
  layout.npcs=layout.npcs.map(r=>({...r,pos:point(r.pos),...(r.sid?{sid:scope(owner,r.sid)}:{})}));
  layout.garrisons=layout.garrisons.map(r=>({...r,pos:point(r.pos)}));
  if(layout.folk)layout.folk=layout.folk.map(r=>({...r,key:scope(owner,r.key),pos:point(r.pos),...(r.sid?{sid:scope(owner,r.sid)}:{})}));
  if(layout.structures)layout.structures=layout.structures.map(s=>({...s,id:scope(owner,s.id),rect:point(s.rect),
    roofs:s.roofs.map(point),floors:s.floors.map(point),courtyards:s.courtyards.map(point),
    doors:s.doors.map(placedDoor),slots:s.slots.map(r=>({...r,id:scope(owner,r.id),pos:point(r.pos)})),
    ...(s.spawn?{spawn:point(s.spawn)}:{}),...(s.rooms?{rooms:s.rooms.map(room)}:{}),
    ...(s.storeys?{storeys:s.storeys.map(r=>({...r,floors:r.floors.map(point),walls:r.walls.map(point),
      doors:r.doors.map(placedDoor),...(r.rooms?{rooms:r.rooms.map(room)}:{})}))}:{})}));
  if(layout.spawnAt)layout.spawnAt=point(layout.spawnAt);
  if(layout.bossSeat)layout.bossSeat=point(layout.bossSeat);
  if(layout.pockets)layout.pockets=layout.pockets.map(point);
  if(layout.airPockets)layout.airPockets=layout.airPockets.map(point);
  if(layout.landmarkSpawns)layout.landmarkSpawns=layout.landmarkSpawns.map(r=>({...r,pos:point(r.pos)}));
  if(layout.hollows)layout.hollows=layout.hollows.map(r=>({...r,id:scope(owner,r.id),rect:point(r.rect),seams:r.seams.map(point)}));
  if(layout.authoredVents)layout.authoredVents=layout.authoredVents.map(r=>({...r,pos:point(r.pos)}));
  return layout;
}
function localPiece(d:Doodad,owner:string,offset:Vec2):Doodad {
  const {contactSource:_source,...plain}=d;
  const result=clone(plain),prefix=owner+'::';
  const un=(s:string)=>s.startsWith(prefix)?s.slice(prefix.length):s;
  result.pos={x:result.pos.x-offset.x,y:result.pos.y-offset.y};
  if(result.door){result.door.id=un(result.door.id);if(result.door.cells){
    result.door.cells.x-=offset.x;result.door.cells.y-=offset.y;
  }}
  if(result.anchor)result.anchor=un(result.anchor);
  if(result.hollow)result.hollow=un(result.hollow);
  if(result.annex)result.annex=un(result.annex);
  return result;
}

/** Physical truth is queryable before any live scenery admission. Hydrated
 * native grids are bounded; born source/geometry and sparse consequences are
 * durable geography. A provider must return the same overlapping candidates
 * for every point, independent of arrival order and page residency. */
export class MassNativeResidency {
  readonly config:Readonly<NativeResidencyConfig>;
  private readonly caps:ReadonlySet<string>;
  private born=new Map<string,Born>();
  private legacySidechannels=0;
  private legacyAccess=0;
  private legacyReservation=0;
  private bornCells=new Map<string,Set<string>>();
  private cache=new Map<string,Cached>();
  private refused=new Map<string,readonly string[]>();
  private revisions=new Map<string,number>();
  private obstacleCandidates=new Map<string,readonly NativeFeaturePlacement[]>();
  private obstacleLookupStats={hits:0,misses:0,invalidations:0};
  /** Only privately cloned/deep-frozen placements enter this identity memo. */
  private placementIdentities=new WeakMap<NativeFeaturePlacement,string>();
  private revision=0;
  private preparationStats={adopted:0,late:0,synchronous:0};
  constructor(config:NativeResidencyConfig,
    private readonly provider:(at:MassAddress)=>readonly NativeFeaturePlacement[],
    capabilities:ReadonlySet<string>,
    private readonly frameOrigin:()=>MassAddress,
    save?:NativeResidencySave,
    private readonly ingress?:NativeResidencyIngress) {
    if(!config.run||!Number.isSafeInteger(config.addressSpan)||config.addressSpan<30
      ||!Number.isInteger(config.maxResidents)||config.maxResidents<1||config.maxResidents>64
      ||!Number.isInteger(config.maxCandidates)||config.maxCandidates<1||config.maxCandidates>32
      ||!Number.isInteger(config.maxBlueprints)||config.maxBlueprints<config.maxResidents+config.maxCandidates
      ||config.maxBlueprints>128)throw Error('Invalid native feature residency budget');
    this.config=freezeData(clone(config));this.caps=new Set(capabilities);
    if(ingress){
      const halo=ingress.halo??NATIVE_INGRESS_DEFAULTS.halo,maxCells=ingress.maxCells??NATIVE_INGRESS_DEFAULTS.maxCells,cell=ingress.cellSize??30;
      if(typeof ingress.regionAt!=='function'||!Number.isInteger(halo)||halo<60||halo>480||halo%30
        ||!Number.isSafeInteger(maxCells)||maxCells<1024||maxCells>65536||!Number.isInteger(cell)||cell<1||30%cell
        ||ingress.reservePadding!==undefined&&(!Number.isFinite(ingress.reservePadding)||ingress.reservePadding<0))
        throw Error('Invalid native exterior ingress policy');
      this.ingress=Object.freeze({...ingress,halo,maxCells,cellSize:cell});
    }
    if(save){
      if(save.schema!==1||save.run!==config.run||!Array.isArray(save.born))throw Error('Native feature save belongs to another world');
      for(const raw of save.born){
        const row=clone(raw);this.validatePlacement(row.placement);
        if(this.born.has(row.placement.id)||row.descriptor.id!==row.placement.id)throw Error('Duplicate native feature ownership');
        const compiled=compileNativeFeature(row.descriptor);
        if(!nativeFeatureAdmission(compiled,this.caps).ok||translationRefusals(compiled).length)
          throw Error('Saved native feature lost a lifecycle capability');
        this.validateChanges(row.changes,compiled);
        if(!row.descriptor.sidechannels)row.metadataStatus='legacy-unverified-sidechannels';
        if(row.metadataStatus!==undefined&&row.metadataStatus!=='legacy-unverified-sidechannels')throw Error('Invalid saved native metadata status');
        if(row.accessStatus!==undefined&&!['legacy-unverified-access','legacy-unverified-reservation'].includes(row.accessStatus))throw Error('Invalid saved native access status');
        if(!row.ingress)row.accessStatus='legacy-unverified-access';
        else if(ingress?.reservePadding!==undefined&&row.ingress.reservePadding!==ingress.reservePadding)row.accessStatus='legacy-unverified-reservation';
        if(row.ingress)validateNativeIngress(compiled,row.ingress);
        this.born.set(row.placement.id,row);this.indexBorn(row,compiled);
      }
    }
  }
  private indexBorn(row:Born,b:NativeFeatureBlueprint):void {
    row.placement=this.freezePlacement(row.placement);
    // A saved/prepared birth can become authoritative where a prior provider
    // lookup returned nothing. No cached negative may hide that ownership.
    this.obstacleCandidates.clear();this.obstacleLookupStats.invalidations++;
    if(row.metadataStatus)this.legacySidechannels++;
    if(row.accessStatus==='legacy-unverified-access')this.legacyAccess++;
    if(row.accessStatus==='legacy-unverified-reservation')this.legacyReservation++;
    const span=this.config.addressSpan,pad=(row.ingress?.halo??0)+NATIVE_INGRESS_DEFAULTS.reserveRadius;
    const lo=moveAddress(row.placement.origin,{x:-pad,y:-pad},span),hi=moveAddress(row.placement.origin,{x:b.grid!.cols*b.grid!.cell+pad,y:b.grid!.rows*b.grid!.cell+pad},span);
    if((BigInt(hi.cx)-BigInt(lo.cx)+1n)*(BigInt(hi.cy)-BigInt(lo.cy)+1n)>4096n)throw Error('Native durable spatial index exceeds footprint budget');
    for(let y=BigInt(lo.cy);y<=BigInt(hi.cy);y++)for(let x=BigInt(lo.cx);x<=BigInt(hi.cx);x++){
      const key=cellKey({dimension:lo.dimension,cx:x.toString(),cy:y.toString()}),set=this.bornCells.get(key)??new Set<string>();
      set.add(row.placement.id);this.bornCells.set(key,set);
    }
  }
  /** Frozen births stay queryable even if newer planning reservations no longer
   * return their source candidate. The local index avoids scanning all history. */
  bornNear(at:MassAddress,radius:number):NativeFeaturePlacement[]{
    if(!Number.isFinite(radius)||radius<0||radius>2400)throw Error('Native durable lookup exceeds radius');
    const lo=moveAddress(at,{x:-radius,y:-radius},this.config.addressSpan),hi=moveAddress(at,{x:radius,y:radius},this.config.addressSpan);
    if((BigInt(hi.cx)-BigInt(lo.cx)+1n)*(BigInt(hi.cy)-BigInt(lo.cy)+1n)>4096n)throw Error('Native durable lookup exceeds cell budget');
    const ids=new Set<string>();
    for(let y=BigInt(lo.cy);y<=BigInt(hi.cy);y++)for(let x=BigInt(lo.cx);x<=BigInt(hi.cx);x++)
      for(const id of this.bornCells.get(cellKey({dimension:at.dimension,cx:x.toString(),cy:y.toString()}))??[])ids.add(id);
    return [...ids].map(id=>this.born.get(id)!.placement).sort((a,b)=>a.id.localeCompare(b.id));
  }
  private freezePlacement(p:NativeFeaturePlacement):NativeFeaturePlacement {
    this.validatePlacement(p);const identity=canonical([p.origin,p.request]);
    const frozen=freezeData(clone(p));this.placementIdentities.set(frozen,identity);return frozen;
  }
  private validatePlacement(p:NativeFeaturePlacement):void {
    if(this.placementIdentities.has(p))return;
    if(!p.id||p.id!==p.request.id||p.priority!==undefined&&!Number.isFinite(p.priority)
      ||canonical(p.origin)!==canonical(address(p.origin.dimension,p.origin.cx,p.origin.cy,p.origin.x,p.origin.y,this.config.addressSpan)))
      throw Error('Invalid native physical feature placement');
  }
  private validateChanges(c:Changes,b:NativeFeatureBlueprint):void {
    if(!c||!Number.isFinite(c.clock)||!Array.isArray(c.grid)||!Array.isArray(c.doodads))throw Error('Invalid native feature changes');
    const cells=new Set<number>(),pieces=new Set<number>();
    for(const[i,k]of c.grid)if(!Number.isInteger(i)||i<0||i>=b.supportMask.length||!b.supportMask[i]||!regionKind(k)||cells.has(i))
      throw Error('Invalid native feature grid edit');else cells.add(i);
    for(const[i,d]of c.doodads)if(!Number.isInteger(i)||i<0||i>=b.layout.doodads.length||pieces.has(i)
      ||d&&(!Number.isFinite(d.pos.x)||!Number.isFinite(d.pos.y)||!Number.isFinite(d.radius)||d.radius<=0||d.contactSource))
      throw Error('Invalid native feature scenery edit');else pieces.add(i);
  }
  private dirty(entry:Cached):void {
    const at=entry.born.placement.origin,b=entry.blueprint,g=b.grid!;
    const lo=address(at.dimension,at.cx,at.cy,at.x,at.y,this.config.addressSpan);
    const hi=moveAddress(at,{x:g.cols*g.cell,y:g.rows*g.cell},this.config.addressSpan);
    const next=++this.revision;
    for(let y=BigInt(lo.cy);y<=BigInt(hi.cy);y++)for(let x=BigInt(lo.cx);x<=BigInt(hi.cx);x++)
      this.revisions.set(cellKey({dimension:at.dimension,cx:x.toString(),cy:y.toString()}),next);
  }
  private observe(entry:Cached):void {
    if(entry.blueprint.grid!.version!==entry.gridVersion){entry.gridVersion=entry.blueprint.grid!.version;this.dirty(entry);}
  }
  private remember(entry:Cached,clock:number):void {
    const original=GridWalkField.unpack(entry.born.descriptor.geometry.grid!),grid=entry.blueprint.grid!;
    const edits:[number,string][]=[];
    for(let i=0;i<grid.kind.length;i++){
      const x=(i%grid.cols+.5)*grid.cell,y=(Math.floor(i/grid.cols)+.5)*grid.cell,k=grid.regionAt(x,y);
      if(k!==original.regionAt(x,y)){
        if(!entry.blueprint.supportMask[i])throw Error('Native terrain mutation escaped its owned support mask');
        edits.push([i,k]);
      }
    }
    entry.born.changes.grid=edits;
    if(entry.instance){
      const pieces:[number,Doodad|null][]=[];
      entry.instance.layout.doodads.forEach((d,i)=>{
        const local=d.gone||entry.binding?.hasDoodad?.(d)===false?null:localPiece(d,entry.instance!.id,entry.instance!.offset);
        if(local===null||canonical(local)!==canonical(entry.born.descriptor.geometry.layout.doodads[i]))
          pieces.push([i,local]);
      });
      entry.born.changes.doodads=pieces;
      entry.born.changes.native=entry.binding?.capture();
      entry.born.changes.clock=clock;
    }
    this.observe(entry);
  }
  private makeRoom():void {
    while(this.cache.size>=this.config.maxBlueprints){
      const entry=[...this.cache].find(([,e])=>!e.instance);
      if(!entry)throw Error('Pinned native feature cache exceeds budget');
      this.remember(entry[1],entry[1].born.changes.clock);this.cache.delete(entry[0]);
    }
  }
  private refuse(id:string,reasons:string[]):null {
    this.refused.set(id,Object.freeze(reasons));
    if(this.refused.size>this.config.maxBlueprints)this.refused.delete(this.refused.keys().next().value!);
    return null;
  }
  /** Cheap shortlist predicate; never generates or changes collision truth. */
  preparationNeeded(p:NativeFeaturePlacement):boolean {
    this.validatePlacement(p);return !this.born.has(p.id)&&!this.refused.has(p.id)&&!this.cache.has(p.id);
  }
  /** Validated warm adoption can create a birth receipt, but never installs
   * scenery/actors. Live host admission still belongs exclusively to sync(). */
  adoptPrepared(p:NativeFeaturePlacement,prepared:NativeFeaturePreparation):'adopted'|'refused'|'existing'|'ignored' {
    this.validatePlacement(p);
    const existing=this.born.get(p.id);
    if(existing){
      if(canonical(existing.placement)!==canonical(p))throw Error('Prepared physical native feature changed identity');
      this.preparationStats.late++;return 'existing';
    }
    if(this.refused.has(p.id)){this.preparationStats.late++;return 'refused';}
    const blueprint=validateNativePreparation(p.request,prepared);
    if(!blueprint){
      if(prepared.failure!.kind!=='generation')return 'ignored';
      this.refuse(p.id,['generation:'+p.request.source.kind+'/'+p.request.source.tileset+'/'+p.request.source.id+': '+prepared.failure!.message]);return 'refused';
    }
    const result=this.ensure(p,blueprint);if(result)this.preparationStats.adopted++;
    return result?'adopted':'refused';
  }
  private ensure(p:NativeFeaturePlacement,prepared?:NativeFeatureBlueprint):Cached|null {
    this.validatePlacement(p);
    const identity=this.placementIdentities.get(p)??canonical([p.origin,p.request]);
    const hit=this.cache.get(p.id);
    if(hit&&this.placementIdentities.get(hit.born.placement)!==identity)
      throw Error('A physical native feature cannot move or reseed');
    if(hit){this.cache.delete(p.id);this.cache.set(p.id,hit);this.observe(hit);return hit;}
    let born=this.born.get(p.id);
    if(born&&this.placementIdentities.get(born.placement)!==identity)
      throw Error('A physical native feature cannot move or reseed');
    if(this.refused.has(p.id))return null;
    let descriptor:NativeFeatureDescriptor,blueprint:NativeFeatureBlueprint;
    // Invalid durable saves are fatal. New sources can fail native generation
    // bounds; remember their attributable refusal without ending exploration.
    if(born){descriptor=born.descriptor;blueprint=compileNativeFeature(descriptor);}
    else if(prepared){descriptor=clone(prepared.descriptor);blueprint=prepared;}
    else try {this.preparationStats.synchronous++;descriptor=clone(resolveNativeFeature(p.request));blueprint=compileNativeFeature(descriptor);}
    catch(error){return this.refuse(p.id,['generation:'+p.request.source.kind+'/'+p.request.source.tileset+'/'+p.request.source.id+': '+String(error instanceof Error?error.message:error)]);}
    const admission=nativeFeatureAdmission(blueprint,this.caps);
    const reasons=[...admission.missing.map(c=>'capability:'+c),...admission.unsupported,...translationRefusals(blueprint)];
    if(reasons.length)return this.refuse(p.id,reasons);
    if(!born){
      const proof=this.ingress?verifyNativeIngress(blueprint,q=>this.ingress!.regionAt(moveAddress(p.origin,q,this.config.addressSpan)),this.ingress):undefined;
      if(proof&&!proof.ok)return this.refuse(p.id,[proof.reason]);
      born={placement:clone(p),descriptor,changes:{clock:0,grid:[],doodads:[]},...(proof?.ok?{ingress:proof.proof}:{})};this.born.set(p.id,born);this.indexBorn(born,blueprint);
    }
    for(const[i,k]of born.changes.grid){
      const g=blueprint.grid!,x=(i%g.cols+.5)*g.cell,y=(Math.floor(i/g.cols)+.5)*g.cell;g.fillRegion(x,y,x,y,k);
    }
    for(const[i,d]of born.changes.doodads)blueprint.layout.doodads[i]=d?clone(d):{...blueprint.layout.doodads[i],gone:true};
    this.makeRoom();
    const entry:Cached={born,blueprint,gridVersion:blueprint.grid!.version};this.cache.set(p.id,entry);
    return entry;
  }
  private candidates(at:MassAddress):NativeFeaturePlacement[] {
    const proposed=this.provider(at);
    if(proposed.length>this.config.maxCandidates||new Set(proposed.map(p=>p.id)).size!==proposed.length)throw Error('Native provider exceeds bounded candidates');
    const rows=[...new Map([...proposed,...this.bornNear(at,0)].map(p=>[p.id,p])).values()];
    if(rows.length>this.config.maxCandidates||new Set(rows.map(p=>p.id)).size!==rows.length)throw Error('Native feature query exceeds bounded candidates');
    return [...rows].sort((a,b)=>(b.priority??0)-(a.priority??0)||a.id.localeCompare(b.id));
  }
  private containing(at:MassAddress):{entry:Cached;local:Vec2}|null {
    for(const p of this.candidates(at)){
      if(p.origin.dimension!==at.dimension)continue;
      const local=localOffset(at,p.origin,this.config.addressSpan,32);
      const entry=this.ensure(p);
      if(entry&&entry.blueprint.regionAt(local.x,local.y)!==undefined)return {entry,local};
    }
    return null;
  }
  regionAt(at:MassAddress):string|undefined {
    const hit=this.containing(at);return hit?.entry.blueprint.regionAt(hit.local.x,hit.local.y);
  }
  contextAt(at:MassAddress):Readonly<NativeFeatureDescriptor['zone']>|undefined {
    const source=this.containing(at)?.entry.blueprint.descriptor;
    return source?.environment.owner==='source'?source.zone:undefined;
  }
  get version():number {for(const e of this.cache.values())this.observe(e);return this.revision;}
  sample(at:MassAddress,base:MassTerrain):MassTerrain {
    const hit=this.containing(at);if(!hit)return base;
    const {entry,local}=hit,b=entry.blueprint,region=b.regionAt(local.x,local.y)!;
    const z=b.descriptor.zone,k=regionKind(region),fill=k?.visual?.fill;
    const color=typeof fill==='string'&&/^#[0-9a-f]{6}$/i.test(fill)?fill:!k?.walkable?z.theme.wall??z.theme.obstacle:z.theme.ground?.palette?.[2]??z.theme.floor;
    return {...base,region,color,biome:z.biome??base.biome,source:{generator:'native-feature',version:1,
      rule:b.descriptor.source.kind+'/'+b.descriptor.source.id,source:'tilesets/'+b.descriptor.source.tileset,stream:b.descriptor.hash}};
  }
  private cachedObstacleCandidates(at:MassAddress):readonly NativeFeaturePlacement[] {
    // Exact canonical address components: no bucket rounding, lossy global
    // number conversion, radius approximation, or cross-dimension aliasing.
    const key=JSON.stringify([at.dimension,at.cx,at.cy,at.x,at.y]);
    const hit=this.obstacleCandidates.get(key);
    if(hit){this.obstacleLookupStats.hits++;this.obstacleCandidates.delete(key);this.obstacleCandidates.set(key,hit);return hit;}
    this.obstacleLookupStats.misses++;
    const rows=Object.freeze(this.candidates(at).map(p=>this.placementIdentities.has(p)?p:this.freezePlacement(p)));
    this.obstacleCandidates.set(key,rows);
    if(this.obstacleCandidates.size>NATIVE_OBSTACLE_CANDIDATE_CACHE)this.obstacleCandidates.delete(this.obstacleCandidates.keys().next().value!);
    return rows;
  }
  /** Same native shape solver used by World.pointInSolid, available cold.
   * Only the immutable provider shortlist is memoized. Door state, gone flags,
   * current native geometry, channels and margins are read on EVERY query;
   * eviction/Continue rehydrates sparse edits through the ordinary ensure(). */
  obstacleAt(at:MassAddress,radius:number,channel:'move'|'shot'|'sight'='move'):{owner:string;doodad:Doodad}|null {
    for(const p of this.cachedObstacleCandidates(at)){
      if(p.origin.dimension!==at.dimension)continue;
      const entry=this.ensure(p);if(!entry)continue;
      const local=localOffset(at,p.origin,this.config.addressSpan,32);
      const list=entry.instance?entry.instance.layout.doodads:entry.blueprint.layout.doodads;
      const q=entry.instance?localOffset(at,this.frameOrigin(),this.config.addressSpan):local;
      const blocks=channel==='move'?blocksMovement:channel==='shot'?blocksProjectiles:blocksSightOf;
      const d=list.find(d=>(d.tier??0)===0&&!d.gone&&blocks(d)
        &&shapeContains(hitSurfaceOf(d,channel),d.pos.x,d.pos.y,q.x,q.y,radius)
        &&(!entry.instance||entry.binding?.hasDoodad?.(d)!==false));
      if(d){
        if(entry.instance)return {owner:p.id,doodad:d};
        const offset=localOffset(p.origin,this.frameOrigin(),this.config.addressSpan);
        const piece=clone(d);piece.pos={x:piece.pos.x+offset.x,y:piece.pos.y+offset.y};
        if(piece.door){piece.door.id=scope(p.id,piece.door.id);if(piece.door.cells){piece.door.cells.x+=offset.x;piece.door.cells.y+=offset.y;}}
        if(piece.anchor)piece.anchor=scope(p.id,piece.anchor);if(piece.hollow)piece.hollow=scope(p.id,piece.hollow);
        if(piece.annex)piece.annex=scope(p.id,piece.annex);
        return {owner:p.id,doodad:freezeData(piece)};
      }
    }
    return null;
  }
  /** Conservative accepted native bounds; unsupported candidates never reserve
   * empty space. A bounded sampling cover finds features anywhere inside the
   * disc, including features whose centre lies far from the query centre. */
  intersects(at:MassAddress,radius:number):boolean {
    if(!Number.isFinite(radius)||radius<0||radius>2400)throw Error('Native footprint query exceeds bounded radius');
    const n=Math.max(1,Math.ceil(radius*2/480)),seen=new Set<string>();
    for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){
      const q=moveAddress(at,{x:radius?(x/n*2-1)*radius:0,y:radius?(y/n*2-1)*radius:0},this.config.addressSpan);
      for(const p of this.candidates(q)){
        if(seen.has(p.id)||p.origin.dimension!==at.dimension)continue;seen.add(p.id);
        const e=this.ensure(p);if(!e)continue;
        const d=localOffset(at,p.origin,this.config.addressSpan,64),g=e.blueprint.grid!;
        const dx=Math.max(0,-d.x,d.x-g.cols*g.cell),dy=Math.max(0,-d.y,d.y-g.rows*g.cell);
        if(dx*dx+dy*dy<=radius*radius)return true;
        if(e.born.ingress&&nativeIngressPoints(e.blueprint,e.born.ingress).some(p=>Math.hypot(p.x-d.x,p.y-d.y)<=radius+NATIVE_INGRESS_DEFAULTS.reserveRadius))return true;
      }
    }
    return false;
  }
  gridAt(localPosition:Vec2):NativeFeatureGrid|null {
    const at=moveAddress(this.frameOrigin(),localPosition,this.config.addressSpan),hit=this.containing(at);
    if(!hit)return null;
    return {id:hit.entry.born.placement.id,grid:hit.entry.blueprint.grid!,
      offset:localOffset(hit.entry.born.placement.origin,this.frameOrigin(),this.config.addressSpan)};
  }
  sync(wanted:readonly NativeFeaturePlacement[],host:NativeFeatureHost):{admitted:string[];deferred:string[];retired:string[]} {
    if(wanted.length>this.config.maxResidents)throw Error('Wanted native scenery exceeds residency budget');
    const ids=new Set(wanted.map(p=>p.id)),retired:string[]=[],admitted:string[]=[],deferred:string[]=[];
    for(const [id,e]of this.cache)if(e.instance&&!ids.has(id)){
      if(!e.binding!.canRetire()||e.instance.layout.doodads.some(d=>d.contactSource||d.felled||d.evap)){deferred.push(id);continue;}
      this.remember(e,host.clock);e.binding!.detach();e.binding=undefined;e.instance=undefined;retired.push(id);
      // Rehydrate local scenery from remembered changes after detaching.
      this.cache.delete(id);
    }
    for(const p of wanted){
      const e=this.ensure(p);if(!e){deferred.push(p.id);continue;}if(e.instance)continue;
      if(this.stats.resident>=this.config.maxResidents){deferred.push(p.id);continue;}
      const offset=localOffset(p.origin,this.frameOrigin(),this.config.addressSpan);
      const layout=translateNativeFeature(e.blueprint,p.id,offset);
      for(const d of layout.doodads)if(d.felled){const delta=host.clock-e.born.changes.clock;d.felled.at+=delta;d.felled.wake+=delta;}
      const entrances=e.blueprint.entrances.map(r=>({...clone(r),pos:{x:r.pos.x+offset.x,y:r.pos.y+offset.y}}));
      const instance:NativeFeatureInstance={id:p.id,placement:freezeData(clone(e.born.placement)),blueprint:e.blueprint,offset,
        grid:{id:p.id,grid:e.blueprint.grid!,offset},layout,entrances,zone:clone(e.blueprint.descriptor.zone)};
      if(host.canInstall?.(instance,e.born.changes.native)===false){deferred.push(p.id);continue;}
      const binding=host.install(instance,e.born.changes.native);
      if(!binding||typeof binding.capture!=='function'||typeof binding.detach!=='function'||typeof binding.canRetire!=='function')
        throw Error('Native feature host failed its lifecycle binding');
      e.instance=instance;e.binding=binding;admitted.push(p.id);
    }
    return {admitted,deferred,retired};
  }
  snapshot(clock:number):NativeResidencySave {
    for(const e of this.cache.values())this.remember(e,clock);
    return clone({schema:1,run:this.config.run,born:[...this.born.values()].sort((a,b)=>a.placement.id.localeCompare(b.placement.id))});
  }
  revisionAt(cell:MassCell):number {
    for(const e of this.cache.values())this.observe(e);
    return this.revisions.get(cellKey(cell))??0;
  }
  refusals(id:string):readonly string[]{return this.refused.get(id)??[];}
  get stats(){return {resident:[...this.cache.values()].filter(e=>e.instance).length,
    blueprints:this.cache.size,born:this.born.size,legacyUnverifiedSidechannels:this.legacySidechannels,legacyUnverifiedAccess:this.legacyAccess,legacyUnverifiedReservation:this.legacyReservation,refused:this.refused.size,revision:this.revision,preparation:{...this.preparationStats},obstacleLookup:{...this.obstacleLookupStats,cached:this.obstacleCandidates.size,limit:NATIVE_OBSTACLE_CANDIDATE_CACHE}};}
}
