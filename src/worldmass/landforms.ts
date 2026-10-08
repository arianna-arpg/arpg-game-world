import { MassRegionalLandforms, validateRegionalLandforms, type MassRegionalLandformPolicy, type RegionalLandformSites } from './regionalLandforms';
import { address, floorDiv, latticeAt, localOffset, moveAddress, type MassAddress } from './address';
import type { MassPatchPolicy, MassRange, MassRun, MassSpec, MassTerrain } from './contracts';
import { canonical, freezeData, massRandom } from './random';
import { regionKind } from '../world/regions';
import { patchBoxIntersects, type MassPatchBox } from './terrainPatches';

/** Realized regionalGrammar graph uses cell coordinates; it is a generation
 * trace, never a replacement for native zone/event ownership. */
export interface RegionalTerrainTrace {
  source:string;seed:number;childSeed:number;
  nodes:readonly {x:number;y:number;radius:number}[];
  edges:readonly {a:number;b:number;points:readonly {x:number;y:number}[]}[];
}
export interface MassLandformShape {
  grammar?: RegionalTerrainTrace;
  id: string; source: string; builder: string; params: Record<string, number>;
  /** Immutable native builder result: transparent, ground, barrier, water, crossing. */
  rows: readonly string[];
  /** Regional sources retain complete child placements and route terminals. */
  foundationRows?: readonly string[]; // regionalExtent parent before nested sources
  components?: readonly {shape:string;x:number;y:number;size:number}[];
  navigation?: readonly {x:number;y:number}[];
  ports?: readonly {x:number;y:number;dx:number;dy:number}[];
}
export interface MassLandformRecipe {
  id: string; biomes: readonly string[]; when: readonly MassRange[]; shapes: readonly string[];
  barrier: { region: string; color: string };
}
export interface MassLandformPolicy {
  source: string; version: 1; spacing: number; chance: number; jitter: number;
  cell: number; bypass: number;
  interiorRegions: readonly string[]; bypassRegions: readonly string[];
  shapes: readonly MassLandformShape[];
  recipes: readonly MassLandformRecipe[];
  exclusions?: MassPatchPolicy['exclusions'];
  regional?: MassRegionalLandformPolicy;
}
export interface MassLandformPlan {
  id: string; origin: MassAddress; recipe: MassLandformRecipe; shape: MassLandformShape;
  turn: number; mirror: boolean; bounds: MassPatchBox;
  regionalExtent?: true;
  /** Immutable regionalTerrainFootprint preserves site holes as reservations. */
  regionalTerrainFootprint?: readonly string[];
}
const owns = (v: object, k: string) => Object.hasOwn(v, k);
const finite = (n: number, lo: number, hi: number) => Number.isFinite(n) && n >= lo && n <= hi;
const ids = (rows: readonly string[]) => rows.length > 0 && rows.every(s => typeof s === 'string' && !!s) && new Set(rows).size === rows.length;
export function validateMassLandforms(spec: MassSpec): void {
  if (!owns(spec, 'landforms')) return;
  const p = spec.landforms;
  if (!p || !owns(p,'version') || p.version !== 1 || !owns(p,'source') || typeof p.source !== 'string' || !p.source
    || p.cell !== spec.terrainCell || !Number.isSafeInteger(p.spacing) || p.spacing % p.cell || !finite(p.spacing, 960, 7680)
    || !Array.isArray(p.interiorRegions) || !ids(p.interiorRegions) || !Array.isArray(p.bypassRegions) || !ids(p.bypassRegions)
    || !finite(p.chance,0,1) || !finite(p.jitter,0,.5) || !Number.isSafeInteger(p.bypass) || p.bypass % p.cell || p.bypass < 90
    || !Array.isArray(p.shapes) || p.shapes.length > 64 || !ids(p.shapes.map(s=>s.id))
    || !Array.isArray(p.recipes) || p.recipes.length > 32 || !ids(p.recipes.map(r=>r.id))) throw Error('Invalid regional landform policy');
  if (p.bypassRegions.some(r=>!regionKind(r)?.walkable || !!regionKind(r)?.standStatusDeep) || p.interiorRegions.some(r=>!regionKind(r))) throw Error('Invalid landform substrate materials');
  const names = new Set(p.shapes.map(s=>s.id)), fields = new Set(spec.fields.map(f=>f.id));
  for (const s of p.shapes) {
    const n = s.rows?.length;
    if (typeof s.source!=='string' || !s.source || typeof s.builder!=='string' || !s.builder || !s.params || Object.values(s.params).some(v=>!Number.isFinite(v))
      || !Array.isArray(s.rows) || n < 16 || n > 64 || n % 2 || s.rows.some((row:string)=>typeof row !== 'string' || row.length !== n || /[^.gbwc]/.test(row))
      || !s.rows.some((row:string)=>row.includes('b') || row.includes('w'))
      || s.rows.some((row:string,y:number)=>[...row].some((c,x)=>(x*p.cell<p.bypass || y*p.cell<p.bypass || (n-1-x)*p.cell<p.bypass || (n-1-y)*p.cell<p.bypass) && c!=='.'))
      || n*p.cell+p.cell > p.spacing*(1-p.jitter)) throw Error('Invalid regional landform shape or bypass');
    // Each source cell that can hold a player must reach the exterior. At this
    // 30-unit grain a center stand fits a radius-15 body; the finer swept proof
    // over the captured shipped corpus lives in the independent probe.
    const seen=new Uint8Array(n*n),queue=[0];seen[0]=1;
    for(let i=0;i<queue.length;i++) {
      const x=queue[i]%n,y=Math.floor(queue[i]/n);
      for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const xx=x+dx,yy=y+dy,k=yy*n+xx;
        if(xx<0 || yy<0 || xx>=n || yy>=n || seen[k] || 'bw'.includes(s.rows[yy][xx]))continue;
        seen[k]=1;queue.push(k);
      }
    }
    if(s.rows.some((row:string,y:number)=>[...row].some((c,x)=>!('bw'.includes(c))&&!seen[y*n+x]))) throw Error('Disconnected regional landform source');
  }
  for (const r of p.recipes) if (!ids(r.biomes) || !ids(r.shapes) || r.shapes.some((s:string)=>!names.has(s))
    || !r.barrier?.region || !regionKind(r.barrier.region)?.blocks || !/^#[0-9a-f]{6}$/i.test(r.barrier.color)
    || !Array.isArray(r.when) || r.when.some((w:MassRange)=>!fields.has(w.field) || w.min!==undefined&&!Number.isFinite(w.min)
      || w.max!==undefined&&!Number.isFinite(w.max) || (w.min??-Infinity)>=(w.max??Infinity))) throw Error('Invalid regional landform recipe');
  if (p.exclusions !== undefined) {
    if (!Array.isArray(p.exclusions) || p.exclusions.length>64) throw Error('Invalid regional exclusions');
    for (const e of p.exclusions) if (!e.source || !e.origin || !e.bounds
      || canonical(address(e.origin.dimension,e.origin.cx,e.origin.cy,e.origin.x,e.origin.y,spec.addressSpan))!==canonical(e.origin)
      || !Object.values(e.bounds).every(n=>finite(n as number,-1048576,1048576)) || Object.keys(e.bounds).length!==4
      || !(e.bounds.minX<e.bounds.maxX && e.bounds.minY<e.bounds.maxY)) throw Error('Invalid regional exclusion');
  }
  validateRegionalLandforms(spec);
}
export function landformCell(plan: MassLandformPlan, x: number, y: number): string {
  const n=plan.shape.rows.length;
  for(let i=0;i<plan.turn;i++) [x,y]=[y,n-1-x];
  if(plan.mirror)x=n-1-x;
  return plan.shape.rows[y]?.[x] ?? '.';
}

/** Geographic candidates, not regions/zones/chunks. A whole source is admitted
 * before publication. No query depends on discovery, page order or live props.
 * The complete footprint reserves passages and its dry outer bypass. */
export class MassLandforms {
  readonly regionalLandforms: MassRegionalLandforms | null;
  private cache = new Map<string, Readonly<MassLandformPlan>|null>();
  constructor(private readonly spec: Readonly<MassSpec>, private readonly run: Readonly<MassRun>,
    private readonly baseAt: (at:MassAddress)=>MassTerrain,
    private readonly sitesClear: (origin:MassAddress,box:MassPatchBox)=>boolean,
    private readonly domain?: (origin:MassAddress,size:number)=>boolean, regionalLandformSites?: RegionalLandformSites) {
    this.regionalLandforms=spec.landforms?.regional ? new MassRegionalLandforms(spec,run,baseAt,regionalLandformSites??(()=>null)) : null;
  }
  private get policy(): MassLandformPolicy { return this.spec.landforms!; }
  private get landformFrameCells(): number { return Math.ceil(Math.max(this.policy.spacing,this.policy.regional?.spacing??0)/this.spec.addressSpan)+1; }
  private candidate(dimension:string,gx:bigint,gy:bigint): Readonly<MassLandformPlan>|null {
    const key=canonical([dimension,gx.toString(),gy.toString()]);
    if(this.cache.has(key))return this.cache.get(key)!;
    const plan=this.make(key,dimension,gx,gy);
    this.cache.set(key,plan);if(this.cache.size>128)this.cache.delete(this.cache.keys().next().value!);
    return plan;
  }
  private make(key:string,dimension:string,gx:bigint,gy:bigint): Readonly<MassLandformPlan>|null {
    const p=this.policy, span=this.spec.addressSpan, period=BigInt(p.spacing), bigSpan=BigInt(span);
    if([gx,gy].some(g=>g*period<-(1n<<63n)*bigSpan || (g+1n)*period>(1n<<63n)*bigSpan))return null;
    const axis=(g:bigint):[string,number]=>{const q=floorDiv(g*period,bigSpan);return [q.toString(),Number(g*period-q*bigSpan)];};
    const [cx,x]=axis(gx),[cy,y]=axis(gy),cellOrigin=address(dimension,cx,cy,x,y,span);
    if(this.domain && !this.domain(cellOrigin,p.spacing))return null;
    // Seats overlap substantially. Cache pure substrate reads for this one
    // candidate, preserving draw order and releasing the cache with the plan.
    // At most four (64*64+1) addresses can be sampled by the validated source.
    const landformTerrainMemo=new Map<string,MassTerrain>();
    const landformBaseAt=(at:MassAddress):MassTerrain=>{
      const k=at.cx+'/'+at.cy+'/'+at.x+'/'+at.y,hit=landformTerrainMemo.get(k);
      if(hit)return hit;
      const value=this.baseAt(at);landformTerrainMemo.set(k,value);return value;
    };
    const rng=massRandom(this.run.seed,[this.spec.id,this.spec.version,p.source,p.version,key]);
    if(!rng.chance(p.chance))return null;
    // Finite, seeded reseating changes placement, never a rejected shape's
    // geometry. Each complete footprint stays inside its own candidate cell.
    const jitter={x:rng.range(-.5,.5)*p.spacing*p.jitter,y:rng.range(-.5,.5)*p.spacing*p.jitter};
    for (const [sx,sy] of [[1,1],[-1,-1],[1,-1],[-1,1]]) {
      const offset={x:Math.round((p.spacing/2+jitter.x*sx)/p.cell)*p.cell,y:Math.round((p.spacing/2+jitter.y*sy)/p.cell)*p.cell};
      const center=moveAddress(cellOrigin,offset,span),base=landformBaseAt(center);
      const recipe=p.recipes.find(r=>r.biomes.includes(base.biome) && r.when.every(w=>base.fields[w.field]>=(w.min??-Infinity) && base.fields[w.field]<(w.max??Infinity)));
      if(!recipe)continue;
      // Spatial coloring changes motifs in neighboring eligible cells. Random
      // rotation is extra presentation variety, never counted as a new shape.
      const n=BigInt(recipe.shapes.length),salt=massRandom(this.run.seed,[p.source,recipe.id,'motifs']).int(0,recipe.shapes.length-1);
      const index=Number(((gx+gy+BigInt(salt))%n+n)%n),shape=p.shapes.find(s=>s.id===recipe.shapes[index])!;
      const size=shape.rows.length*p.cell;
      const origin=moveAddress(cellOrigin,{x:offset.x-size/2,y:offset.y-size/2},span),bounds={minX:0,minY:0,maxX:size,maxY:size};
      let excluded=false;
      for(const e of p.exclusions??[]) {
        if(e.origin.dimension!==dimension)continue;
        const limit=BigInt(Math.ceil(2100000/span)+16),dx=BigInt(origin.cx)-BigInt(e.origin.cx),dy=BigInt(origin.cy)-BigInt(e.origin.cy);
        if(dx < -limit || dx>limit || dy < -limit || dy>limit)continue;
        const q=localOffset(origin,e.origin,span,Number(limit));
        if(q.x<=e.bounds.maxX && q.x+size>=e.bounds.minX && q.y<=e.bounds.maxY && q.y+size>=e.bounds.minY){excluded=true;break;}
      }
      if(excluded || this.regionalLandforms?.regionalTerrainIntersects(origin,bounds) || !this.sitesClear(origin,bounds))continue;
      const plan:MassLandformPlan={id:canonical([this.run.runId,p.source,p.version,key]),origin,recipe,shape,
        turn:rng.int(0,3),mirror:rng.chance(.5),bounds};
      // Explicit source policy can reshape micro outcrops inside a precinct.
      // Shores and the full dry bypass remain intact; native features/sites are
      // separate reserved owners and cannot be overwritten by this base layer.
      let clear=true;
      terrain: for(let y=0;y<size;y+=p.cell)for(let x=0;x<size;x+=p.cell) {
        const t=landformBaseAt(moveAddress(origin,{x:x+p.cell/2,y:y+p.cell/2},span));
        const c=landformCell(plan,x/p.cell,y/p.cell);
        if(!(c==='.'?p.bypassRegions:p.interiorRegions).includes(t.region)){clear=false;break terrain;}
      }
      if(clear)return freezeData(plan);
    }
    return null;
  }
  at(at:MassAddress): Readonly<MassLandformPlan>|null {
    const regionalExtent=this.regionalLandforms?.at(at);if(regionalExtent)return regionalExtent;
    const p=this.policy,q=latticeAt(at,this.spec.addressSpan,p.spacing),plan=this.candidate(at.dimension,q.gx,q.gy);
    if(!plan)return null;
    const v=localOffset(at,plan.origin,this.spec.addressSpan,this.landformFrameCells),size=plan.bounds.maxX;
    return v.x>=0 && v.y>=0 && v.x<size && v.y<size ? plan : null;
  }
  sample(at:MassAddress,base:MassTerrain): MassTerrain {
    const plan=this.at(at);if(!plan)return base;
    const v=localOffset(at,plan.origin,this.spec.addressSpan,this.landformFrameCells),c=landformCell(plan,Math.floor(v.x/this.policy.cell),Math.floor(v.y/this.policy.cell));
    if(c==='.')return base;
    const surface=c==='b'?plan.recipe.barrier:c==='w'?{region:'water',color:'#294850'}:c==='c'?{region:'locale_bridge',color:'#75694b'}:{region:'ground',color:base.color};
    return Object.freeze({...base,...surface,source:Object.freeze({generator:this.spec.id,version:this.spec.version,
      rule:plan.recipe.id+'/'+plan.shape.id,source:plan.shape.source,stream:plan.id})});
  }
  reserves(at:MassAddress,radius:number):boolean {
    if(!Number.isFinite(radius)||radius<0)throw Error('Invalid landform reservation query');
    if(this.regionalLandforms?.reserves(at,radius))return true;
    const p=this.policy,s=this.spec.addressSpan,lo=latticeAt({...at,x:at.x-radius,y:at.y-radius},s,p.spacing),hi=latticeAt({...at,x:at.x+radius,y:at.y+radius},s,p.spacing);
    if((hi.gx-lo.gx+1n)*(hi.gy-lo.gy+1n)>4096n)throw Error('Landform reservation query exceeds budget');
    for(let y=lo.gy;y<=hi.gy;y++)for(let x=lo.gx;x<=hi.gx;x++) {
      const plan=this.candidate(at.dimension,x,y);if(!plan)continue;
      const q=localOffset(at,plan.origin,s,100000);
      if(patchBoxIntersects(plan.bounds,q.x,q.y,radius))return true;
    }
    return false;
  }
  get stats():{cached:number} {return {cached:this.cache.size};}
}
