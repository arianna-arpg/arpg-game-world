import '../data/localeMaterials';
import type { LocalePlan } from '../world/locales';
import type { LocaleReport } from '../engine/localeGen';
import { doodadRuleOf, type Doodad, type DoodadRule } from '../engine/levelgen';
import { regionKind } from '../world/regions';
import { address, floorDiv, latticeAt, localOffset, moveAddress, type MassAddress, type MassCell } from './address';
import type { MassPlace, MassRun, MassSpec, MassTerrain } from './contracts';
import type { RegionalLandformSite } from './regionalLandformComposition';
import type { MassPatchBox } from './terrainPatches';
import { canonical, freezeData, massDigest, massRandom } from './random';
import { nativeRegionalCircle, nativeRegionalMaterial, nativeRegionalRoutes, type NativeRegionalGeometry } from './nativeRegionalGeometry';

export interface NativeRegionalSource {
  id:string;program:string;variant:string;seed:number;hash:string;plan:LocalePlan;
  geometry:NativeRegionalGeometry;report:LocaleReport;
  ports:readonly {x:number;y:number}[];terminals:readonly {x:number;y:number}[];
  doodads:readonly Doodad[];sceneryRules:readonly {kind:string;rule:DoodadRule}[];caveSeeds:readonly number[];unsupported:readonly string[];
}
export interface NativeRegionalPolicy {
  source:string;version:1;spacing:number;chance:number;jitter:number;clearance:number; seats:number;
  exclusions?: import('./contracts').MassPatchPolicy['exclusions'];
  sources:readonly NativeRegionalSource[];
  coverage:readonly {program:string;variant:string;width:number;sourceHash:string;unsupported:readonly string[]}[];
  recipes:readonly {id:string;biomes:readonly string[];sources:readonly string[]}[];
}
export interface NativeRegionalPlan {id:string;origin:MassAddress;source:NativeRegionalSource;recipe:string}
const num=(n:number,lo:number,hi:number)=>Number.isFinite(n)&&n>=lo&&n<=hi;
const unique=(a:readonly string[])=>a.length>0&&new Set(a).size===a.length&&a.every(s=>typeof s==='string'&&!!s&&s.length<=256);
export function validateNativeRegional(spec:MassSpec):void {
  if(!Object.hasOwn(spec,'nativeRegional'))return;
  const p=spec.nativeRegional;
  if(!p||p.version!==1||!p.source||spec.nativeSubstrate||spec.terrainCell!==30
    ||!Number.isSafeInteger(p.spacing)||p.spacing%30||!num(p.spacing,7200,19200)
    ||!Number.isSafeInteger(p.seats)||!num(p.seats,1,16)
    ||!num(p.chance,0,1)||!num(p.jitter,0,.4)||!num(p.clearance,120,240)
    ||!Array.isArray(p.sources)||p.sources.length>135||!unique(p.sources.map(s=>s.id))
    ||!Array.isArray(p.recipes)||p.recipes.length>16||!unique(p.recipes.map(r=>r.id))
    ||!Array.isArray(p.coverage)||p.coverage.length>270)throw Error('Invalid nativeRegional policy');
  if(p.exclusions && (!Array.isArray(p.exclusions)||p.exclusions.length>32||p.exclusions.some(e=>
    !e.source||canonical(address(e.origin.dimension,e.origin.cx,e.origin.cy,e.origin.x,e.origin.y,spec.addressSpan))!==canonical(e.origin)
    ||!Object.values(e.bounds).every(Number.isFinite)||e.bounds.minX>e.bounds.maxX||e.bounds.minY>e.bounds.maxY
    ||Object.values(e.bounds).some(n=>typeof n!=='number'||Math.abs(n)>1000000))))throw Error('Invalid nativeRegional exclusions');
  for(const s of p.sources) {
    const g=s.geometry,{hash,...body}=s;
    if(!s.program||!s.variant||s.plan.program!==s.program||s.plan.id!==s.variant||s.report.program!==s.program
      ||!Number.isInteger(s.seed)||s.seed<0||s.seed>0xffffffff||s.plan.seed!==s.seed
      ||!g||g.cell!==30||![g.width,g.height].every(n=>Number.isSafeInteger(n)&&n%30===0&&num(n,1800,6000)&&n+2*p.clearance<=p.spacing*(1-p.jitter))
      ||!Array.isArray(g.rows)||g.rows.length!==g.height/30||g.rows.some((row:string)=>typeof row!=='string'||row.length!==g.width/30||/[^.A-Z]/.test(row))
      ||!Array.isArray(g.materials)||g.materials.length>26||!unique(g.materials)||g.materials.some((id:string)=>!regionKind(id))
      ||g.rows.some((row:string)=>[...row].some(c=>c!=='.'&&c.charCodeAt(0)-65>=g.materials.length))
      ||!Array.isArray(s.sceneryRules)||s.sceneryRules.some((r:{kind:string;rule:DoodadRule})=>r.rule.brittle||r.rule.effect||canonical(r.rule)!==canonical(doodadRuleOf(r.kind)))
      ||s.doodads.some((d:Doodad)=>!s.sceneryRules.some((r:{kind:string;rule:DoodadRule})=>r.kind===d.kind))
      ||s.unsupported.length||s.caveSeeds.length||!Array.isArray(s.doodads)||s.doodads.length>256
      ||Math.hypot(g.width,g.height)+2*p.clearance+60>p.spacing*(1-p.jitter)
      ||s.ports.length!==4||canonical(s.ports)!==canonical([{x:15,y:Math.floor(g.height/60)*30+15},{x:g.width-15,y:Math.floor(g.height/60)*30+15},{x:Math.floor(g.width/60)*30+15,y:15},{x:Math.floor(g.width/60)*30+15,y:g.height-15}])
      ||canonical(s.terminals.slice(0,4))!==canonical(s.ports)||s.terminals.length<6||s.terminals.length>16
      ||s.terminals.some((t:{x:number;y:number})=>!num(t.x,15,g.width-15)||!num(t.y,15,g.height-15))
      ||massDigest(body)!==hash||!nativeRegionalRoutes(g,s.terminals,s.doodads))
      throw Error('Invalid complete nativeRegional source: '+s.id);
  }
  for(const r of p.recipes)if(!unique(r.biomes)||!unique(r.sources)||r.sources.some((id:string)=>!p.sources.some(s=>s.id===id)))
    throw Error('Invalid nativeRegional recipe');
}
/** Independent finite admission BEFORE smaller terrain. Source cells and native
 * content never move/clip around protected sites. A failed seat is refused whole. */
export class MassNativeRegional {
  private cache=new Map<string,NativeRegionalPlan|null>();
  readonly counters={tried:0,accepted:0,opening:0,sites:0,water:0,ports:0};
  constructor(readonly spec:MassSpec,readonly run:MassRun,
    private read:(at:MassAddress)=>MassTerrain,
    private sites:(origin:MassAddress,box:MassPatchBox)=>readonly RegionalLandformSite[]|null) {}
  get policy():NativeRegionalPolicy{return this.spec.nativeRegional!;}
  candidate(dimension:string,gx:bigint,gy:bigint):NativeRegionalPlan|null {
    const key=canonical([dimension,gx.toString(),gy.toString()]);
    if(this.cache.has(key))return this.cache.get(key)!;
    const p=this.policy,rng=massRandom(this.run.seed,[p.source,p.version,key]),span=this.spec.addressSpan;
    let result:NativeRegionalPlan|null=null;
    if(rng.chance(p.chance))for(let seat=0;seat<p.seats&&!result;seat++) {
      this.counters.tried++;
      const axis=(g:bigint)=>{const n=g*BigInt(p.spacing),q=floorDiv(n,BigInt(span));return[q.toString(),Number(n-q*BigInt(span))] as const;};
      const [cx,x]=axis(gx),[cy,y]=axis(gy);
      const center=address(dimension,cx,cy,x+p.spacing*(.5+rng.range(-.5,.5)*p.jitter),y+p.spacing*(.5+rng.range(-.5,.5)*p.jitter),span);
      const base=this.read(center),recipe=p.recipes.find(r=>r.biomes.includes(base.biome));if(!recipe)continue;
      const sourceId=rng.pick(recipe.sources),source=p.sources.find(s=>s.id===sourceId)!,g=source.geometry;
      // Snap geometry to the same physical 30-unit lattice as streamed pages.
      const origin=moveAddress(center,{x:-g.width/2,y:-g.height/2},span);
      origin.x=Math.floor(origin.x/30)*30;origin.y=Math.floor(origin.y/30)*30;
      let rejected=false;
      for(const e of [...(p.exclusions??[]),...(this.spec.landforms?.exclusions??[]),...(this.spec.patches?.exclusions??[])]) {
        if(e.origin.dimension!==dimension)continue;
        const dx=BigInt(origin.cx)-BigInt(e.origin.cx),dy=BigInt(origin.cy)-BigInt(e.origin.cy),limit=BigInt(Math.ceil(2100000/span)+16);
        if(dx< -limit||dx>limit||dy< -limit||dy>limit)continue;
        const q=localOffset(origin,e.origin,span,Number(limit));
        if(q.x-p.clearance<=e.bounds.maxX&&q.x+g.width+p.clearance>=e.bounds.minX
          &&q.y-p.clearance<=e.bounds.maxY&&q.y+g.height+p.clearance>=e.bounds.minY){rejected=true;break;}
      }
      if(rejected){this.counters.opening++;continue;}
      const sites=this.sites(origin,{minX:-p.clearance,minY:-p.clearance,maxX:g.width+p.clearance,maxY:g.height+p.clearance});
      if(!sites||sites.some(s=>nativeRegionalCircle(g,s.x,s.y,s.radius+p.clearance))){this.counters.sites++;continue;}
      let wet=0;
      for(let yy=1;yy<=5;yy++)for(let xx=1;xx<=5;xx++)if(regionKind(this.read(moveAddress(origin,{x:g.width*xx/6,y:g.height*yy/6},span)).region)?.standStatusDeep)wet++;
      if(wet>5){this.counters.water++;continue;}
      for(const [i,port] of source.ports.entries())for(let side=-1;side<=1;side++) {
        const dx=i===0?-1:i===1?1:0,dy=i===2?-1:i===3?1:0;
        const t=this.read(moveAddress(origin,{x:port.x+dx*30-dy*side*30,y:port.y+dy*30+dx*side*30},span));
        if(!regionKind(t.region)?.walkable||regionKind(t.region)?.standStatusDeep)rejected=true;
      }
      if(rejected){this.counters.ports++;continue;}
      result=freezeData({id:canonical([this.run.runId,p.source,p.version,key]),origin,source,recipe:recipe.id});this.counters.accepted++;
    }
    this.cache.set(key,result);if(this.cache.size>32)this.cache.delete(this.cache.keys().next().value!);
    return result;
  }
  plans(origin:MassAddress,box:MassPatchBox):NativeRegionalPlan[] {
    const span=this.spec.addressSpan,p=this.policy;
    const lo=latticeAt(moveAddress(origin,{x:box.minX-p.clearance,y:box.minY-p.clearance},span),span,p.spacing);
    const hi=latticeAt(moveAddress(origin,{x:box.maxX+p.clearance,y:box.maxY+p.clearance},span),span,p.spacing);
    if((hi.gx-lo.gx+1n)*(hi.gy-lo.gy+1n)>4096n)throw Error('nativeRegional query exceeds finite budget');
    const found:NativeRegionalPlan[]=[];
    for(let y=lo.gy;y<=hi.gy;y++)for(let x=lo.gx;x<=hi.gx;x++){const p=this.candidate(origin.dimension,x,y);if(p)found.push(p);}
    return found;
  }
  formationAt(at:MassAddress):NativeRegionalPlan|null {
    const l=latticeAt(at,this.spec.addressSpan,this.policy.spacing),p=this.candidate(at.dimension,l.gx,l.gy);if(!p)return null;
    const q=localOffset(at,p.origin,this.spec.addressSpan,Math.ceil(this.policy.spacing/this.spec.addressSpan)+2),g=p.source.geometry;
    return q.x>=0&&q.y>=0&&q.x<g.width&&q.y<g.height?p:null;
  }
  sample(at:MassAddress,base:MassTerrain):MassTerrain|null {
    const p=this.formationAt(at);if(!p)return null;
    const q=localOffset(at,p.origin,this.spec.addressSpan,Math.ceil(this.policy.spacing/this.spec.addressSpan)+2),region=nativeRegionalMaterial(p.source.geometry,q.x,q.y);
    if(!region)return null;
    return {...base,region,color:region==='ground'?base.color:regionKind(region)?.visual?.fill??base.color,
      source:{generator:this.policy.source,version:1,source:'main/adventureLocales/'+p.source.program,rule:p.source.id+'/'+region,stream:p.id}};
  }
  reserves(at:MassAddress,radius:number):boolean {
    if(!Number.isFinite(radius)||radius<0)throw Error('Invalid nativeRegional reservation');
    for(const p of this.plans(at,{minX:-radius,minY:-radius,maxX:radius,maxY:radius})) {
      const q=localOffset(at,p.origin,this.spec.addressSpan,100000);
      if(nativeRegionalCircle(p.source.geometry,q.x,q.y,radius+this.policy.clearance))return true;
    }
    return false;
  }
  /** Conservative circles only for the older terrain composer; its site holes
   * must contain every native cell, never re-cut an already authored interior. */
  reservations(origin:MassAddress,box:MassPatchBox):RegionalLandformSite[] {
    return this.plans(origin,box).map(p=>{const g=p.source.geometry,q=localOffset(p.origin,origin,this.spec.addressSpan,100000);
      return {id:p.id,x:q.x+g.width/2,y:q.y+g.height/2,radius:Math.hypot(g.width,g.height)/2+this.policy.clearance};});
  }
  inCell(cell:MassCell):readonly MassPlace[] {
    const span=this.spec.addressSpan,origin=address(cell.dimension,cell.cx,cell.cy,0,0,span),result:MassPlace[]=[];
    // Content circles fit within their candidate lattice, just like the source.
    for(const p of this.plans(origin,{minX:0,minY:0,maxX:span,maxY:span})) {
      const g=p.source.geometry,center=moveAddress(p.origin,{x:g.width/2,y:g.height/2},span),q=localOffset(center,origin,span,100000);
      const radius=Math.hypot(g.width,g.height)/2+30,dx=Math.max(-q.x,0,q.x-span),dy=Math.max(-q.y,0,q.y-span);
      if(dx*dx+dy*dy>radius*radius)continue;
      result.push({id:p.id,recipe:this.policy.source,content:'nativeRegional/'+p.source.id,center,radius,nativeRegional:p.source.hash,
        source:{generator:this.policy.source,version:1,source:'main/adventureLocales/'+p.source.program,rule:p.source.id,stream:p.id}});
    }
    return freezeData(result.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0));
  }
  get stats():{cached:number}{return {cached:this.cache.size};}
}
