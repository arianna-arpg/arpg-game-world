import { fitRegionalChildren } from './regionalLandformSources';
import { address, floorDiv, latticeAt, localOffset, moveAddress, type MassAddress } from './address';
import type { MassRun, MassSpec, MassTerrain, MassRange } from './contracts';
import { canonical, freezeData, massRandom } from './random';
import { landformCell, type MassLandformPlan, type MassLandformRecipe, type MassLandformShape } from './landforms';
import { patchBoxIntersects, type MassPatchBox } from './terrainPatches';
import { regionKind } from '../world/regions';
import { composeRegionalSites, regionalDryConnected, regionalRoutesPreserved, type RegionalLandformSite } from './regionalLandformComposition';

/** Large terrain is an explicit substrate owner. It replaces local noise
 * hydrology inside its outline; authored sites and opening foundations win. */
export interface MassRegionalLandformPolicy {
  source:string;version:1;spacing:number;chance:number;jitter:number;
  siteApron:number;maxAlteredFraction:number;
  shapes:readonly MassLandformShape[];recipes:readonly MassLandformRecipe[];
}
export type RegionalLandformSites=(origin:MassAddress,box:MassPatchBox)=>readonly RegionalLandformSite[]|null;
const integer=(v:number,lo:number,hi:number)=>Number.isSafeInteger(v)&&v>=lo&&v<=hi;
const dry=(c:string)=>c==='g'||c==='c';
export function validateRegionalLandforms(spec:MassSpec):void {
  const owner=spec.landforms;
  if(!owner||!Object.hasOwn(owner,'regional'))return;
  const p=owner.regional;
  if(!p||owner.cell!==30||p.version!==1||typeof p.source!=='string'||!p.source||spec.nativeSubstrate
    ||!integer(p.spacing,4800,15360)||p.spacing%owner.cell||!Number.isFinite(p.chance)||p.chance<0||p.chance>1
    ||!Number.isFinite(p.jitter)||p.jitter<0||p.jitter>.2||!integer(p.siteApron,90,240)||p.siteApron%owner.cell
    ||!Number.isFinite(p.maxAlteredFraction)||p.maxAlteredFraction<0||p.maxAlteredFraction>.2
    ||!Array.isArray(p.shapes)||p.shapes.length<1||p.shapes.length>24
    ||!Array.isArray(p.recipes)||p.recipes.length<1||p.recipes.length>16)throw Error('Invalid regional extent policy');
  const ids=new Set(p.shapes.map(s=>s.id));
  if(ids.size!==p.shapes.length)throw Error('Duplicate regional extent source');
  for(const s of p.shapes) {
    const n=s.rows?.length;
    if(typeof s.id!=='string'||!s.id||!s.source||!s.builder||!s.params||Object.values(s.params).some(v=>!Number.isFinite(v))
      ||!Array.isArray(s.rows)||!integer(n,80,240)||n%2||n*owner.cell+owner.cell>p.spacing*(1-p.jitter)
      ||s.rows.some((row:string)=>typeof row!=='string'||row.length!==n||/[^.gbwc]/.test(row))
      ||!s.rows.some((row:string)=>/[bw]/.test(row))||!regionalDryConnected(s)
      ||!Array.isArray(s.navigation)||s.navigation.length<4||s.navigation.length>12
      ||s.navigation.some((a:{x:number;y:number;dx:number;dy:number})=>!integer(a.x,1,n-2)||!integer(a.y,1,n-2)||!dry(s.rows[a.y][a.x]))
      ||!Array.isArray(s.ports)||s.ports.length!==4
      ||s.ports.some((a:{x:number;y:number;dx:number;dy:number})=>!integer(a.x,1,n-2)||!integer(a.y,1,n-2)||Math.abs(a.dx)+Math.abs(a.dy)!==1||!Number.isInteger(a.dx)||!Number.isInteger(a.dy)
        ||!dry(s.rows[a.y][a.x])||[-1,0,1].some(side=>s.rows[a.y+a.dy+a.dx*side]?.[a.x+a.dx-a.dy*side]!=='.'))
      ||new Set(s.ports.map((a:{dx:number;dy:number})=>a.dx+','+a.dy)).size!==4
      ||s.rows[0]!=='.'.repeat(n)||s.rows[n-1]!=='.'.repeat(n)||s.rows.some((row:string)=>row[0]!=='.'||row[n-1]!=='.'))throw Error('Invalid regional extent geometry');
    if(s.components!==undefined&&(!Array.isArray(s.components)||s.components.length>8||s.components.some((c:{shape:string;size:number;x:number;y:number})=>!c.shape||!integer(c.size,16,64)||!integer(c.x,1,n-c.size-1)||!integer(c.y,1,n-c.size-1))))throw Error('Invalid regional child motif');
    if(s.foundationRows!==undefined) {
      if(!Array.isArray(s.foundationRows)||s.foundationRows.length!==n||s.foundationRows.some((row:string)=>typeof row!=='string'||row.length!==n||/[^.gbwc]/.test(row))
        ||!regionalDryConnected({...s,rows:s.foundationRows}))throw Error('Invalid regional foundation');
      const expected:string[][]=s.foundationRows.map((row:string)=>[...row]);
      for(const child of s.components??[]) {
        const motif=owner.shapes.find(m=>m.id===child.shape);
        if(!motif||motif.rows.length!==child.size)throw Error('Invalid regional foundation child');
        for(let y=0;y<child.size;y++)for(let x=0;x<child.size;x++) {
          if(expected[child.y+y][child.x+x]!=='g')throw Error('Regional child requires broad dry parent floor');
          const c=motif.rows[y][x];if(c!=='.')expected[child.y+y][child.x+x]=c;
        }
      }
      if(expected.some((row,y)=>row.join('')!==s.rows[y]))throw Error('Regional foundation source mismatch');
    } else if(s.components?.length)throw Error('Missing regional parent foundation');
    for(const child of s.components??[]) {
      const motif=owner.shapes.find(m=>m.id===child.shape);
      if(!motif||motif.rows.length!==child.size||motif.rows.some((row,y)=>[...row].some((c,x)=>c!=='.'&&s.rows[child.y+y][child.x+x]!==c)))throw Error('Regional child source mismatch');
    }
  }
  const fields=new Set(spec.fields.map(f=>f.id));
  if(new Set(p.recipes.map(r=>r.id)).size!==p.recipes.length)throw Error('Duplicate regional extent recipe');
  for(const r of p.recipes)if(!r.id||!Array.isArray(r.biomes)||!r.biomes.length||r.biomes.some((b:string)=>typeof b!=='string'||!b)
    ||!Array.isArray(r.shapes)||!r.shapes.length||r.shapes.some((id:string)=>!ids.has(id))||!regionKind(r.barrier?.region)?.blocks||!/^#[0-9a-f]{6}$/i.test(r.barrier?.color)
    ||!Array.isArray(r.when)||r.when.some((w:MassRange)=>!fields.has(w.field)||w.min!==undefined&&!Number.isFinite(w.min)||w.max!==undefined&&!Number.isFinite(w.max)||(w.min??-Infinity)>=(w.max??Infinity)))throw Error('Invalid regional extent recipe');
}

function orientedRegionalShape(shape:MassLandformShape,turn:number,mirror:boolean):MassLandformShape {
  const n=shape.rows.length;
  const point=(x:number,y:number)=>{if(mirror)x=n-1-x;for(let i=0;i<turn;i++)[x,y]=[n-1-y,x];return {x,y};};
  const plan={shape,turn,mirror} as MassLandformPlan;
  const foundationPlan=shape.foundationRows?{...plan,shape:{...shape,rows:shape.foundationRows}}:null;
  return {...shape, ...(foundationPlan?{foundationRows:Array.from({length:n},(_,y)=>Array.from({length:n},(_,x)=>landformCell(foundationPlan,x,y)).join(''))}:{}),rows:Array.from({length:n},(_,y)=>Array.from({length:n},(_,x)=>landformCell(plan,x,y)).join('')),
    navigation:shape.navigation!.map(a=>point(a.x,a.y)),
    ports:shape.ports!.map(a=>{const q=point(a.x,a.y),r=point(a.x+a.dx,a.y+a.dy);return {...q,dx:r.x-q.x,dy:r.y-q.y};}),
    ...(shape.components?{components:shape.components.map(c=>{const a=point(c.x,c.y),b=point(c.x+c.size-1,c.y+c.size-1);return {...c,x:Math.min(a.x,b.x),y:Math.min(a.y,b.y)};})}:{})};
}

export class MassRegionalLandforms {
  private cache=new Map<string,Readonly<MassLandformPlan>|null>();
  private topologyReasons:Record<string,number>={};
  private counters={attempts:0,seats:0,accepted:0,opening:0,water:0,sites:0,ports:0,topology:0,baseReads:0};
  constructor(private readonly spec:Readonly<MassSpec>,private readonly run:Readonly<MassRun>,
    private readonly baseAt:(at:MassAddress)=>MassTerrain,private readonly sites:RegionalLandformSites) {}
  private get policy():MassRegionalLandformPolicy{return this.spec.landforms!.regional!;}
  private candidate(dimension:string,gx:bigint,gy:bigint):Readonly<MassLandformPlan>|null {
    const key=canonical([dimension,gx.toString(),gy.toString()]);
    if(this.cache.has(key))return this.cache.get(key)!;
    const plan=this.make(key,dimension,gx,gy);this.cache.set(key,plan);
    if(this.cache.size>16)this.cache.delete(this.cache.keys().next().value!);
    return plan;
  }
  private make(key:string,dimension:string,gx:bigint,gy:bigint):Readonly<MassLandformPlan>|null {
    const p=this.policy,rng=massRandom(this.run.seed,[this.spec.id,this.spec.version,p.source,p.version,key]);
    if(!rng.chance(p.chance))return null;
    this.counters.attempts++;
    for(let seat=0;seat<4;seat++){const plan=this.makeSeat(key,dimension,gx,gy,seat);if(plan)return plan;}
    return null;
  }
  private makeSeat(key:string,dimension:string,gx:bigint,gy:bigint,seat:number):Readonly<MassLandformPlan>|null {
    const p=this.policy,cell=this.spec.landforms!.cell,span=this.spec.addressSpan,period=BigInt(p.spacing),bigSpan=BigInt(span);
    // Place surfaces and inhibition inspect neighboring candidates. Refuse the
    // entire regional seat before any read if that finite dependency halo can
    // cross the signed address domain, even when the formation itself fits.
    const halo=BigInt(Math.ceil(span+Math.max(0,...this.spec.places.map(r=>r.period*8+r.radius*4))));
    if([gx,gy].some(g=>g*period-halo<-(1n<<63n)*bigSpan||(g+1n)*period+halo>(1n<<63n)*bigSpan))return null;
    const rng=massRandom(this.run.seed,[this.spec.id,this.spec.version,p.source,p.version,key,'seat',seat]);
    this.counters.seats++;
    const axis=(g:bigint):[string,number]=>{const q=floorDiv(g*period,bigSpan);return [q.toString(),Number(g*period-q*bigSpan)];};
    const [cx,x]=axis(gx),[cy,y]=axis(gy),cellOrigin=address(dimension,cx,cy,x,y,span);
    const center=moveAddress(cellOrigin,{x:Math.round((p.spacing/2+rng.range(-.5,.5)*p.spacing*p.jitter)/cell)*cell,y:Math.round((p.spacing/2+rng.range(-.5,.5)*p.spacing*p.jitter)/cell)*cell},span);
    const read=(q:MassAddress)=>{this.counters.baseReads++;return this.baseAt(q);};
    const base=read(center),recipe=p.recipes.find(r=>r.biomes.includes(base.biome)&&r.when.every(w=>base.fields[w.field]>=(w.min??-Infinity)&&base.fields[w.field]<(w.max??Infinity)));
    if(!recipe)return null;
    const count=BigInt(recipe.shapes.length),salt=massRandom(this.run.seed,[p.source,recipe.id,'extents']).int(0,recipe.shapes.length-1);
    const index=Number(((gx+gy+BigInt(salt))%count+count)%count),source=p.shapes.find(s=>s.id===recipe.shapes[index])!;
    const size=source.rows.length*cell,origin=moveAddress(center,{x:-size/2,y:-size/2},span),bounds={minX:0,minY:0,maxX:size,maxY:size};
    for(const e of this.spec.landforms!.exclusions??[]) {
      if(e.origin.dimension!==dimension)continue;
      const limit=BigInt(Math.ceil(2100000/span)+16),dx=BigInt(origin.cx)-BigInt(e.origin.cx),dy=BigInt(origin.cy)-BigInt(e.origin.cy);
      if(dx< -limit||dx>limit||dy< -limit||dy>limit)continue;
      const q=localOffset(origin,e.origin,span,Number(limit));
      if(q.x<=e.bounds.maxX&&q.x+size>=e.bounds.minX&&q.y<=e.bounds.maxY&&q.y+size>=e.bounds.minY){this.counters.opening++;return null;}
    }
    // A selection rule, not a claim that underlying lakes survive inside the
    // authored envelope. Avoid putting these inland formations in broad water.
    let wet=0;
    for(let y=0;y<5;y++)for(let x=0;x<5;x++) {
      const t=read(moveAddress(origin,{x:size*(x+1)/6,y:size*(y+1)/6},span));
      if(regionKind(t.region)?.standStatusDeep&&++wet>5){this.counters.water++;return null;}
    }
    const sites=this.sites(origin,bounds);
    if(!sites||sites.length>32){this.counters.sites++;return null;}
    const oriented=orientedRegionalShape(source,rng.int(0,3),rng.chance(.5));
    // Three-cell-wide real substrate contacts make each authored dry edge
    // join dry country; a transparent source apron is never assumed dry.
    for(const port of oriented.ports!)for(let side=-1;side<=1;side++) {
      const q=moveAddress(origin,{x:(port.x+.5+port.dx-port.dy*side)*cell,y:(port.y+.5+port.dy+port.dx*side)*cell},span);
      if(!this.spec.landforms!.bypassRegions.includes(read(q).region)){this.counters.ports++;return null;}
    }
    const foundation=oriented.foundationRows?{...oriented,rows:oriented.foundationRows,components:[]}:oriented;
    const composed=composeRegionalSites(foundation,[...sites].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0),cell,p.siteApron,p.maxAlteredFraction,reason=>{this.topologyReasons[reason]=(this.topologyReasons[reason]??0)+1;});
    if(!composed){this.counters.topology++;return null;}
    const shape=oriented.components?.length?fitRegionalChildren({...oriented,navigation:composed.navigation},composed.rows,this.spec.landforms!.shapes):composed;
    if(!shape){this.counters.topology++;this.topologyReasons['child-fit']=(this.topologyReasons['child-fit']??0)+1;return null;}
    if(oriented.components?.length&&!regionalRoutesPreserved(foundation,shape,cell,reason=>{this.topologyReasons['child-'+reason]=(this.topologyReasons['child-'+reason]??0)+1;})){this.counters.topology++;return null;}
    this.counters.accepted++;
    return freezeData({id:canonical([this.run.runId,p.source,p.version,key]),origin,recipe,shape,turn:0,mirror:false,bounds,regionalExtent:true});
  }
  at(at:MassAddress):Readonly<MassLandformPlan>|null {
    const q=latticeAt(at,this.spec.addressSpan,this.policy.spacing),plan=this.candidate(at.dimension,q.gx,q.gy);
    if(!plan)return null;
    const v=localOffset(at,plan.origin,this.spec.addressSpan,Math.ceil(this.policy.spacing/this.spec.addressSpan)+1);
    return v.x>=0&&v.y>=0&&v.x<plan.bounds.maxX&&v.y<plan.bounds.maxY?plan:null;
  }
  reserves(at:MassAddress,radius:number):boolean {
    const s=this.spec.addressSpan,p=this.policy,lo=latticeAt({...at,x:at.x-radius,y:at.y-radius},s,p.spacing),hi=latticeAt({...at,x:at.x+radius,y:at.y+radius},s,p.spacing);
    if(!Number.isFinite(radius)||radius<0||(hi.gx-lo.gx+1n)*(hi.gy-lo.gy+1n)>4096n)throw Error('Invalid regional extent reservation');
    for(let y=lo.gy;y<=hi.gy;y++)for(let x=lo.gx;x<=hi.gx;x++) {
      const plan=this.candidate(at.dimension,x,y);if(!plan)continue;
      const q=localOffset(at,plan.origin,s,100000);
      if(patchBoxIntersects(plan.bounds,q.x,q.y,radius))return true;
    }
    return false;
  }
  get stats(){return {...this.counters,cached:this.cache.size,topologyReasons:{...this.topologyReasons}};}
}
