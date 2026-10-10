import { TILESETS } from '../data/tilesets';
import { STRUCTURES } from '../data/structures';
import { BIOMES, BIOME_FIELD } from '../world/biomes';
import { climateEnvelope } from '../world/climate';
import { presenceMul, type LevelEnvelope } from '../engine/presence';
import { compositionDefs, structureMaxFootprint } from '../engine/levelgen';
import { massKindOf } from '../engine/massif';
import { address, floorDiv, latticeAt, localOffset, moveAddress, type MassAddress } from './address';
import type { MassGenerator } from './generator';
import { canonical, freezeData, massDigest, massRandom, streamSeed } from './random';
import { nativeFeatureCatalogue, type NativeFeatureKind, type NativeFeatureSource } from './nativeFeatures';
import type { NativeFeaturePlacement } from './nativeResidency';

export interface NativeCountryRow {
  id:string; source:NativeFeatureSource; biome:string; size:{w:number;h:number}; rockMouth?:boolean;
}
export interface NativeCountryPolicy {
  source:string; version:number; spacing:number; jitter:number; chance:number;
  weights:Record<NativeFeatureKind,number>;
  /** Native feature bounds, not a rectangle of owned terrain. */
  featureSize:number; maxSize:number; clearance:number; queryHalo:number;
  cacheSize:number; rockEntranceChance:number; regionSpan:number;
}
export interface NativeCountrySpec extends NativeCountryPolicy {
  schema:1; compiler:'native-feature-v1'; alignment:number;
  catalogue:NativeCountryRow[];
  /** Authored source snapshot pins compatibility; geometry is born lazily. */
  sources:unknown; sourceHash:string; climate:NativeCountryClimate;
  excluded:{id:string;reason:string}[];
}
export interface NativeCountryClimate {
  axes:{axis:string;field?:string;min:number;max:number;fallback:number}[];
  palette:{biome:string;weight:number;envelopes:Record<string,LevelEnvelope>;tilesets:string[]}[];
}
export interface NativeCountryContext { tileset?:string; biome?:string; climate?:Record<string,number> }
export type NativeCountryReservation = (center:MassAddress,radius:number)=>boolean;
interface Candidate { placement:NativeFeaturePlacement; center:MassAddress; radius:number }
const copy=<T>(v:T):T=>JSON.parse(JSON.stringify(v)) as T;
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const quantize=(n:number,q:number)=>Math.ceil(n/q)*q;
export const NATIVE_COUNTRY_DEFAULTS:Readonly<NativeCountryPolicy>=freezeData({
  source:'native-country',version:1,spacing:5400,jitter:.3,chance:.85,
  weights:{massif:5,structure:3,composition:3},featureSize:1800,maxSize:2400,
  clearance:120,queryHalo:300,cacheSize:256,rockEntranceChance:.35,regionSpan:21600,
});
function climateSnapshot(rows:readonly NativeCountryRow[]):NativeCountryClimate {
  return copy({
    // Explicit adapters from this continuous generator's signed scalar fields.
    // Unavailable native civic/ocean axes stay declared constants; sea contexts
    // are excluded until their actual traversal and population owners exist.
    axes:[
      {axis:'temperature',field:'temperature',min:-1,max:1,fallback:.5},
      {axis:'moisture',field:'moisture',min:-1,max:1,fallback:.5},
      {axis:'elevation',field:'elevation',min:-1,max:1,fallback:.5},
      {axis:'wildness',field:'danger',min:-1,max:1,fallback:.5},
      {axis:'hearth',min:0,max:1,fallback:1},
      {axis:'civic',min:0,max:1,fallback:1},
      {axis:'maritime',min:0,max:1,fallback:0},
    ],
    palette:BIOME_FIELD.filter(r=>rows.some(s=>s.biome===r.biome)).map(r=>({
      biome:r.biome,weight:r.weight??1,
      envelopes:Object.fromEntries(Object.entries(BIOMES[r.biome].climate??{}).map(([axis,env])=>[axis,climateEnvelope(axis,env)])),
      tilesets:[...new Set(rows.filter(s=>s.biome===r.biome).map(s=>s.source.tileset))].sort(),
    })).sort((a,b)=>a.biome.localeCompare(b.biome)),
  });
}
function sourceSnapshot(rows:readonly NativeCountryRow[]):unknown {
  const tilesets=[...new Set(rows.map(r=>r.source.tileset))].sort();
  const biomes=[...new Set(rows.map(r=>r.biome))].sort();
  const structures=[...new Set(rows.filter(r=>r.source.kind==='structure').map(r=>r.source.id))].sort();
  const compositions=[...new Set(rows.filter(r=>r.source.kind==='composition').map(r=>r.source.id))].sort();
  const kinds=[...new Set(nativeFeatureCatalogue().filter(r=>tilesets.includes(r.tileset)).flatMap(r=>r.massKinds))].sort();
  return copy({
    tilesets:tilesets.map(id=>({id,definition:TILESETS[id]})),
    biomes:biomes.map(id=>({id,definition:BIOMES[id]??null})),
    structures:structures.map(id=>({id,definition:STRUCTURES[id]})),
    compositions:compositions.map(id=>({id,definition:compositionDefs().find(c=>c.id===id)})),
    massKinds:kinds.map(id=>({id,definition:massKindOf(id)})),
  });
}
/** Snapshot the real native surface registry, never a hand-maintained list of
 * substitute scenes. Unsupported extents are visible catalogue exclusions.
 * Native compiler/lifecycle admission still decides each resolved output. */
export function makeNativeCountrySpec(terrainCell=30,overrides:Partial<NativeCountryPolicy>={}):Readonly<NativeCountrySpec> {
  if(!Number.isSafeInteger(terrainCell)||terrainCell<1||terrainCell>30||30%terrainCell!==0)throw Error('Invalid native country terrain cell');
  const alignment=30/gcd(30,terrainCell)*terrainCell;
  const policy={...copy(NATIVE_COUNTRY_DEFAULTS),...copy(overrides)};
  const catalogue:NativeCountryRow[]=[],excluded:NativeCountrySpec['excluded']=[];
  for(const row of nativeFeatureCatalogue()){
    const ts=TILESETS[row.tileset];
    const biome=BIOMES[row.biome];
    const exclusion=ts.frontier===false||ts.realm||ts.boundless||ts.caveFace||ts.sky==='sheltered'?'native-interior-or-special-context'
      :biome?.marine||biome?.virtual?'native-marine-traversal'
      :!BIOME_FIELD.some(b=>b.biome===row.biome)?'native-biome-not-in-surface-field':undefined;
    if(exclusion){excluded.push({id:'tilesets/'+row.tileset,reason:exclusion});continue;}
    const add=(kind:NativeFeatureKind,id:string,scope?:'landform',variant?:string,poolIndex?:number)=>{
      const key=kind+'/'+row.tileset+'/'+id+(scope?'/'+scope:'')+(variant?'/'+variant:'')+(poolIndex===undefined?'':'/pool'+poolIndex);
      const foot=kind==='structure'?structureMaxFootprint(id):undefined;
      const size={w:quantize(Math.max(policy.featureSize,(foot?.w??0)+720),alignment),
        h:quantize(Math.max(policy.featureSize,(foot?.h??0)+720),alignment)};
      if(Math.max(size.w,size.h)>policy.maxSize){excluded.push({id:key,reason:'native-footprint-exceeds-policy'});return;}
      catalogue.push({id:key,source:{kind,id,tileset:row.tileset,...(scope?{scope}:{}),...(variant?{variant}:{}),...(poolIndex===undefined?{}:{poolIndex})},biome:row.biome,size,
        ...(kind==='massif'?{rockMouth:scope?row.rockMassKinds.includes(id):row.rockMassKinds.length>0}:{})});
    };
    if(row.massif)add('massif',row.tileset);
    for(const mass of row.massSources)add('massif',mass.kind,'landform',mass.variant,mass.poolIndex);
    for(const id of row.structures)add('structure',id);
    for(const id of row.compositions)add('composition',id);
  }
  catalogue.sort((a,b)=>a.id.localeCompare(b.id));
  const sources=sourceSnapshot(catalogue),climate=climateSnapshot(catalogue);
  const spec:NativeCountrySpec={...policy,schema:1,compiler:'native-feature-v1',alignment,catalogue,sources,climate,sourceHash:massDigest({sources,climate}),excluded};
  validateSpec(spec,terrainCell);
  return freezeData(spec);
}
function validateSpec(spec:NativeCountrySpec,terrainCell:number):void {
  if(spec.schema!==1||spec.compiler!=='native-feature-v1'||!spec.source||!Number.isSafeInteger(spec.version)||spec.version<1
    ||!Number.isSafeInteger(spec.alignment)||spec.alignment%30||spec.alignment%terrainCell
    ||!Number.isSafeInteger(spec.spacing)||spec.spacing%spec.alignment
    ||!Number.isSafeInteger(spec.regionSpan)||spec.regionSpan<spec.spacing||spec.regionSpan%spec.alignment
    ||!Number.isFinite(spec.jitter)||spec.jitter<0||spec.jitter>.6
    ||!Number.isFinite(spec.chance)||spec.chance<0||spec.chance>1
    ||!Number.isFinite(spec.rockEntranceChance)||spec.rockEntranceChance<0||spec.rockEntranceChance>1
    ||![spec.featureSize,spec.maxSize].every(n=>Number.isSafeInteger(n)&&n>=480&&n<=6000&&n%spec.alignment===0)
    ||spec.featureSize>spec.maxSize||!Number.isFinite(spec.clearance)||spec.clearance<0
    ||!Number.isFinite(spec.queryHalo)||spec.queryHalo<0||spec.queryHalo>spec.spacing/4
    ||!Number.isSafeInteger(spec.cacheSize)||spec.cacheSize<9||spec.cacheSize>4096
    ||Object.values(spec.weights).some(n=>!Number.isFinite(n)||n<0)||Object.values(spec.weights).every(n=>n===0)
    ||!spec.catalogue.length||spec.catalogue.length>4096||new Set(spec.catalogue.map(r=>r.id)).size!==spec.catalogue.length
    ||massDigest({sources:spec.sources,climate:spec.climate})!==spec.sourceHash)throw Error('Invalid native country source policy');
  if(!spec.climate?.palette.length||spec.climate.axes.some(a=>!a.axis||!Number.isFinite(a.min)||!Number.isFinite(a.max)||a.min>=a.max||a.fallback<0||a.fallback>1)
    ||spec.climate.palette.some(p=>p.weight<=0||!Number.isFinite(p.weight)||!p.tilesets.length||Object.keys(p.envelopes).some(axis=>!spec.climate.axes.some(a=>a.axis===axis))))throw Error('Invalid native climate snapshot');
  const maxRadius=Math.hypot(spec.maxSize,spec.maxSize)/2+spec.clearance;
  // The jittered placement cells are only candidate addresses, never map tiles.
  // Their minimum separation proves disjoint native bounds without recursive
  // overlap decisions or arrival-order-dependent suppression.
  if(spec.spacing*(1-spec.jitter)-2*spec.alignment<maxRadius*2
    ||maxRadius+spec.queryHalo>spec.spacing/2)throw Error('Native country spacing cannot guarantee disjoint physical features');
  for(const r of spec.catalogue)if(!r.id||!r.biome||!r.source.tileset||!r.source.id
    ||!['massif','structure','composition'].includes(r.source.kind)
    ||![r.size.w,r.size.h].every(n=>Number.isInteger(n)&&n>=480&&n<=spec.maxSize&&n%spec.alignment===0))
      throw Error('Invalid native country catalogue row');
}
/** Infinite deterministic placement addresses with bounded point queries.
 * The conservative rectangle is reservation/query bookkeeping ONLY: physical
 * ownership comes exclusively from nativeResidency's transparent support mask.
 * Reservations/context must be pure functions of saved geographic policy. */
export class MassNativeCountry {
  readonly spec:Readonly<NativeCountrySpec>;
  private cache=new Map<string,Candidate|null>();
  /** Point/path/scenery queries in one placement cell share the same nine pure
   * candidates. Keep their exact bounds; never quantize the queried point. */
  private neighborhoods=new Map<string,readonly Candidate[]>();
  private neighborhoodCounts={builds:0,hits:0};
  private refused=new Map<string,string>();
  private counts={considered:0,selected:0,chance:0,reserved:0,unmatched:0};
  constructor(readonly generator:MassGenerator,spec:NativeCountrySpec,
    private readonly reserves:NativeCountryReservation=()=>false,
    private readonly contextProvider?:(at:MassAddress)=>NativeCountryContext|undefined) {
    validateSpec(spec,generator.spec.terrainCell);
    if(generator.spec.addressSpan%spec.alignment)throw Error('Native grid and physical address cells must share alignment');
    if(massDigest({sources:sourceSnapshot(spec.catalogue),climate:climateSnapshot(spec.catalogue)})!==spec.sourceHash)
      throw Error('Native country source revision changed; this run requires an explicit compatibility reset');
    this.spec=freezeData(copy(spec));
  }
  /** Stable macro-region context from saved native climate envelopes. This is
   * a source-selection context, never a finite loadable overworld zone. */
  nativeContextAt(at:MassAddress):Readonly<NativeCountryContext> {
    const q=latticeAt(at,this.generator.spec.addressSpan,this.spec.regionSpan),span=BigInt(this.generator.spec.addressSpan);
    const axis=(g:bigint):[string,number]=>{const n=g*BigInt(this.spec.regionSpan),c=floorDiv(n,span);return[c.toString(),Number(n-c*span)];};
    const [cx,x]=axis(q.gx),[cy,y]=axis(q.gy);
    const center=address(at.dimension,cx,cy,x+this.spec.regionSpan/2,y+this.spec.regionSpan/2,this.generator.spec.addressSpan);
    const fields=this.generator.fieldsAt(center),climate:Record<string,number>={};
    for(const a of this.spec.climate.axes)climate[a.axis]=a.field&&fields[a.field]!==undefined
      ?Math.max(0,Math.min(1,(fields[a.field]-a.min)/(a.max-a.min))):a.fallback;
    const rows=this.spec.climate.palette.map(p=>({...p,weight:p.weight*Object.entries(p.envelopes)
      .reduce((mul,[axis,env])=>mul*presenceMul(env,climate[axis]),1)})).filter(r=>r.weight>0);
    if(!rows.length)return freezeData({climate});
    const rng=massRandom(this.generator.run.seed,[this.spec.source,this.spec.version,'native-climate',at.dimension,q.gx.toString(),q.gy.toString()]);
    const row=rng.weighted(rows);
    return freezeData({biome:row.biome,tileset:rng.pick(row.tilesets),climate});
  }
  private candidate(dimension:string,gx:bigint,gy:bigint):Candidate|null {
    const id=canonical([this.generator.run.runId,this.spec.source,this.spec.version,dimension,gx.toString(),gy.toString()]);
    if(this.cache.has(id)){const hit=this.cache.get(id)!;this.cache.delete(id);this.cache.set(id,hit);return hit;}
    this.counts.considered++;
    const result=this.makeCandidate(id,dimension,gx,gy);this.cache.set(id,result);
    if(this.cache.size>this.spec.cacheSize){const old=this.cache.keys().next().value!;this.cache.delete(old);this.refused.delete(old);}
    return result;
  }
  private makeCandidate(id:string,dimension:string,gx:bigint,gy:bigint):Candidate|null {
    const rng=massRandom(this.generator.run.seed,['native-country',id]),s=this.spec;
    if(!rng.chance(s.chance)){this.counts.chance++;return null;}
    const axis=(g:bigint):[string,number]=>{
      const n=g*BigInt(s.spacing),span=BigInt(this.generator.spec.addressSpan),cell=floorDiv(n,span);
      return [cell.toString(),Number(n-cell*span)];
    };
    const [cx,x]=axis(gx),[cy,y]=axis(gy);
    const center=address(dimension,cx,cy,x+Math.round((.5+rng.range(-.5,.5)*s.jitter)*s.spacing/s.alignment)*s.alignment,
      y+Math.round((.5+rng.range(-.5,.5)*s.jitter)*s.spacing/s.alignment)*s.alignment,this.generator.spec.addressSpan);
    const context=this.contextProvider?.(center)??this.nativeContextAt(center),biome=context.biome??this.generator.terrainAt(center).biome;
    const exact=context?.tileset?s.catalogue.filter(r=>r.source.tileset===context.tileset):[];
    const candidates=exact.length?exact:s.catalogue.filter(r=>r.biome===biome);
    const kinds=(['massif','structure','composition'] as const).filter(kind=>s.weights[kind]>0&&candidates.some(r=>r.source.kind===kind));
    if(!kinds.length){this.counts.unmatched++;this.refused.set(id,'no-native-source-for-context:'+biome);return null;}
    const kind=rng.weighted(kinds.map(kind=>({kind,weight:s.weights[kind]}))).kind;
    const row=rng.pick(candidates.filter(r=>r.source.kind===kind));
    const radius=Math.hypot(row.size.w,row.size.h)/2+s.clearance;
    if(this.reserves(center,radius)){this.counts.reserved++;this.refused.set(id,'reserved-native-footprint');return null;}
    const origin=moveAddress(center,{x:-row.size.w/2,y:-row.size.h/2},this.generator.spec.addressSpan);
    // An odd number of aligned cells has a half-cell centre. Snap ORIGIN, the
    // actual physical grid owner; centre is bookkeeping and moves with it.
    const shift={x:-((origin.x%s.alignment)+s.alignment)%s.alignment,y:-((origin.y%s.alignment)+s.alignment)%s.alignment};
    const alignedOrigin=moveAddress(origin,shift,this.generator.spec.addressSpan);
    const alignedCenter=moveAddress(center,shift,this.generator.spec.addressSpan);
    if((shift.x||shift.y)&&this.reserves(alignedCenter,radius)){this.counts.reserved++;this.refused.set(id,'reserved-aligned-native-footprint');return null;}
    this.counts.selected++;
    return freezeData({center:alignedCenter,radius,placement:{id,origin:alignedOrigin,priority:1,
      request:{id,seed:streamSeed(this.generator.run.seed,['native-feature',id,row.id]),source:copy(row.source),size:copy(row.size),
        ...(context.climate?{geo:{climate:copy(context.climate)}}:{}),
        ...(kind==='massif'&&row.rockMouth&&rng.chance(s.rockEntranceChance)?{rockEntrance:true}:{})}}});
  }
  at(at:MassAddress):readonly NativeFeaturePlacement[]{return this.near(at,0);}
  private neighborhood(dimension:string,gx:bigint,gy:bigint):readonly Candidate[]{
    const key=JSON.stringify([dimension,gx.toString(),gy.toString()]);
    const hit=this.neighborhoods.get(key);
    if(hit){this.neighborhoodCounts.hits++;this.neighborhoods.delete(key);this.neighborhoods.set(key,hit);return hit;}
    this.neighborhoodCounts.builds++;
    const rows:Candidate[]=[];
    for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++){
      const c=this.candidate(dimension,gx+BigInt(x),gy+BigInt(y));if(c)rows.push(c);
    }
    this.neighborhoods.set(key,rows);
    // Even disjoint neighborhoods retain no more candidates than the original
    // placement cache. Both stores are bounded independently of travel history.
    while(this.neighborhoods.size>Math.max(1,Math.floor(this.spec.cacheSize/9)))
      this.neighborhoods.delete(this.neighborhoods.keys().next().value!);
    return rows;
  }
  /** Also feeds live scenery admission; physical point queries use radius zero.
   * Radius is bounded independently of travel distance and explored history. */
  near(at:MassAddress,radius:number):readonly NativeFeaturePlacement[]{
    if(!Number.isFinite(radius)||radius<0||radius>this.spec.spacing/2)throw Error('Native country visibility query exceeds bounded neighborhood');
    const q=latticeAt(at,this.generator.spec.addressSpan,this.spec.spacing),out:NativeFeaturePlacement[]=[];
    for(const c of this.neighborhood(at.dimension,q.gx,q.gy)){
      const d=localOffset(at,c.placement.origin,this.generator.spec.addressSpan,64),size=c.placement.request.size!,pad=this.spec.queryHalo+radius;
      if(d.x>=-pad&&d.y>=-pad&&d.x<=size.w+pad&&d.y<=size.h+pad)out.push(c.placement);
    }
    return Object.freeze(out.sort((a,b)=>a.id.localeCompare(b.id)));
  }
  refusal(id:string):string|undefined{return this.refused.get(id);}
  get stats(){return {...this.counts,cached:this.cache.size,refused:this.refused.size,sources:this.spec.catalogue.length,
    neighborhoods:this.neighborhoods.size,neighborhoodBuilds:this.neighborhoodCounts.builds,neighborhoodHits:this.neighborhoodCounts.hits};}
}
