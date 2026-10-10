import type { Vec2 } from '../core/math';
import { address, floorDiv, localOffset, moveAddress, type MassAddress } from './address';
import type { MassPlace, MassTerrain } from './contracts';
import type { MassGenerator } from './generator';
import { segmentDistance } from './journey';
import { canonical, freezeData, massRandom } from './random';
import { siteOffset } from './sites';

export interface WildernessPathsSpec {
  source:string; district:number; width:number; color:string; chance:number;
  /** Source-authored, body-clear entries, in the site's original orientation. */
  destinations:{content:string; entry:Vec2}[];
}
export interface WildernessPath {
  id:string; origin:MassAddress; from:MassPlace; to:MassPlace; points:readonly Vec2[]; width:number;
}
export function validateWildernessPaths(spec:WildernessPathsSpec, generator:MassGenerator):void {
  if(!spec?.source||!Number.isSafeInteger(spec.district)||spec.district<3840||spec.district>9600
    ||spec.district%generator.spec.addressSpan||!Number.isFinite(spec.width)||spec.width<90||spec.width>150
    ||!/^#[0-9a-f]{6}$/i.test(spec.color)||!Number.isFinite(spec.chance)||spec.chance<0||spec.chance>1
    ||!Array.isArray(spec.destinations)||!spec.destinations.length||spec.destinations.length>16
    ||new Set(spec.destinations.map(d=>d.content)).size!==spec.destinations.length
    ||spec.destinations.some(d=>!generator.spec.places.some(p=>p.content===d.content&&p.surface&&p.radius>Math.hypot(d.entry.x,d.entry.y))
      ||!Number.isFinite(d.entry.x)||!Number.isFinite(d.entry.y)))throw Error('Invalid wildernessPaths');
}
/** Occasional complete links, not a mandatory world-spanning road grid. Each
 * district considers the same accepted sites before any are visited. A whole
 * ribbon must fit dry substrate and protected ownership or the edge is absent.
 * Derived plans are bounded and reproducible after eviction; nothing is painted
 * into saves, and player terrain edits remain authoritative. */
export class WildernessPaths {
  private cache=new Map<string,readonly WildernessPath[]>();
  constructor(readonly spec:WildernessPathsSpec,private generator:MassGenerator,
    private blocked:(at:MassAddress,radius:number)=>boolean,
    private admitted:(place:MassPlace)=>boolean=()=>true){validateWildernessPaths(spec,generator);}
  at(at:MassAddress):readonly WildernessPath[]{
    const span=this.generator.spec.addressSpan,n=BigInt(this.spec.district/span);
    const cx=floorDiv(BigInt(at.cx),n)*n,cy=floorDiv(BigInt(at.cy),n)*n;
    const origin=address(at.dimension,cx.toString(),cy.toString(),0,0,span),key=canonical([at.dimension,cx.toString(),cy.toString()]);
    const hit=this.cache.get(key);if(hit){this.cache.delete(key);this.cache.set(key,hit);return hit;}
    // At the signed-address rim the incomplete district intentionally has no links.
    let result:readonly WildernessPath[]=[];
    try{moveAddress(origin,{x:this.spec.district,y:this.spec.district},span);result=this.plan(origin,key);}
    catch(e){if(!(e instanceof RangeError))throw e;}
    this.cache.set(key,result);if(this.cache.size>32)this.cache.delete(this.cache.keys().next().value!);
    return result;
  }
  private plan(origin:MassAddress,key:string):readonly WildernessPath[]{
    const {district,width}=this.spec,span=this.generator.spec.addressSpan,rng=massRandom(this.generator.run.seed,[this.spec.source,key]);
    if(!rng.chance(this.spec.chance))return [];
    const found=new Map(this.generator.wildernessSites(origin,district).map(p=>[p.id,p]));
    const sites=[...found.values()].filter(p=>{
      if(!this.spec.destinations.some(d=>d.content===p.content)||!this.admitted(p))return false;
      const q=localOffset(p.center,origin,span);
      return q.x-p.radius>width&&q.y-p.radius>width&&q.x+p.radius<district-width&&q.y+p.radius<district-width;
    }).sort((a,b)=>a.id.localeCompare(b.id));
    const entry=(p:MassPlace)=>{const q=localOffset(p.center,origin,span),e=this.spec.destinations.find(d=>d.content===p.content)!.entry,o=siteOffset(p,e.x,e.y);return {x:q.x+o.x,y:q.y+o.y};};
    const pairs=sites.flatMap((a,i)=>sites.slice(i+1).map(b=>({a,b,d:Math.hypot(entry(a).x-entry(b).x,entry(a).y-entry(b).y)})))
      .filter(p=>p.d>=900&&p.d<=5200).sort((a,b)=>a.d-b.d||a.a.id.localeCompare(b.a.id)||a.b.id.localeCompare(b.b.id));
    const paths:WildernessPath[]=[],degree=new Map<string,number>();
    const cs=this.generator.spec.terrainCell,clearance=width/2+30+cs*Math.SQRT2/2;
    const dry=new Map<string,boolean>();
    const protectedSites=[...found.values()].filter(p=>!this.generator.spec.places.find(r=>r.id===p.recipe)?.landformHabitat).map(p=>({id:p.id,radius:p.radius,q:localOffset(p.center,origin,span)}));
    const clear=(x:number,y:number,a:MassPlace,b:MassPlace)=>{
      if(x<clearance||y<clearance||x>district-clearance||y>district-clearance)return false;
      const q={x,y};
      if(protectedSites.some(p=>p.id!==a.id&&p.id!==b.id&&Math.hypot(p.q.x-x,p.q.y-y)<p.radius+clearance))return false;
      const id=x+','+y,hit=dry.get(id);if(hit!==undefined)return hit;
      const at=moveAddress(origin,q,span);
      const good=!this.blocked(at,cs*Math.SQRT2/2)
        &&['ground','firm_sand','sand','mud','swamp'].includes(this.generator.terrainAt(at).region);
      dry.set(id,good);return good;
    };
    // Deterministic short detours are bounded even in impassable country. Failed
    // edges do not leave half-roads ending at a lake or a generated wall.
    for(const {a,b,d} of pairs.slice(0,12)){
      if(paths.length===2)break;
      if((degree.get(a.id)??0)>=2||(degree.get(b.id)??0)>=2)continue;
      const start=entry(a),end=entry(b);
      const outside=(p:MassPlace,e:Vec2)=>{const q=localOffset(p.center,origin,span),dx=e.x-q.x,dy=e.y-q.y,n=Math.hypot(dx,dy);return {x:q.x+dx/n*(p.radius+clearance+cs),y:q.y+dy/n*(p.radius+clearance+cs)};};
      const outA=outside(a,start),outB=outside(b,end),side={x:-(end.y-start.y)/d,y:(end.x-start.x)/d};
      const edgeClear=(u:Vec2,v:Vec2,peers:MassPlace[])=>{
        const centers=peers.map(p=>({q:localOffset(p.center,origin,span),r:p.radius}));
        for(let y=Math.floor((Math.min(u.y,v.y)-clearance)/cs)*cs+cs/2;y<=Math.max(u.y,v.y)+clearance;y+=cs)
          for(let x=Math.floor((Math.min(u.x,v.x)-clearance)/cs)*cs+cs/2;x<=Math.max(u.x,v.x)+clearance;x+=cs)
            if(segmentDistance({x,y},u,v)<=clearance&&(centers.some(p=>Math.hypot(p.q.x-x,p.q.y-y)<p.r)||!clear(x,y,a,b)))return false;
        return true;
      };
      if(!edgeClear(start,outA,[b])||!edgeClear(outB,end,[a]))continue;
      let link:Vec2[]|undefined;
      const candidates=[...([180,-420,780,-1200] as const).map(bend=>[outA,{x:(outA.x+outB.x)/2+side.x*bend,y:(outA.y+outB.y)/2+side.y*bend},outB]),
        [outA,{x:outA.x,y:outB.y},outB],[outA,{x:outB.x,y:outA.y},outB]];
      for(const candidate of candidates)if(candidate.slice(1).every((p,i)=>edgeClear(candidate[i],p,[a,b]))){link=candidate;break;}
      if(!link){
        // Bounded geographic detour search. Every accepted edge proves the full
        // raster ribbon, including diagonals; no corner cutting or water fill.
        const step=240,first={x:Math.round(outA.x/step)*step,y:Math.round(outA.y/step)*step};
        if(edgeClear(outA,first,[a,b])){
          type Node={p:Vec2;g:number;f:number;parent?:Node};
          const keyOf=(p:Vec2)=>p.x+','+p.y,dist=(p:Vec2)=>Math.hypot(p.x-outB.x,p.y-outB.y);
          const queue:Node[]=[{p:first,g:0,f:dist(first)}],best=new Map([[keyOf(first),0]]);
          for(let visits=0;queue.length&&visits<256;visits++){
            queue.sort((u,v)=>u.f-v.f||u.p.y-v.p.y||u.p.x-v.p.x);const node=queue.shift()!;
            if(node.g!==best.get(keyOf(node.p)))continue;
            if(dist(node.p)<=step*2&&edgeClear(node.p,outB,[a,b])){
              const reverse:Vec2[]=[];for(let n:Node|undefined=node;n;n=n.parent)reverse.push(n.p);
              link=[outA,...reverse.reverse(),outB];break;
            }
            for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
              const p={x:node.p.x+dx*step,y:node.p.y+dy*step},g=node.g+Math.hypot(dx,dy)*step;
              if(g>= (best.get(keyOf(p))??Infinity)||g+dist(p)>d*1.8+1200||!edgeClear(node.p,p,[a,b]))continue;
              best.set(keyOf(p),g);queue.push({p,g,f:g+dist(p),parent:node});
            }
          }
        }
      }
      if(!link)continue;
      // Remove grid stair-steps only after re-proving each shortcut's ribbon.
      const smooth=[link[0]];
      for(let i=0;i<link.length-1;){let next=link.length-1;while(next>i+1&&!edgeClear(link[i],link[next],[a,b]))next--;smooth.push(link[next]);i=next;}
      paths.push({id:canonical([this.generator.run.runId,this.spec.source,a.id,b.id]),origin,from:a,to:b,points:[start,...smooth,end],width});
      degree.set(a.id,(degree.get(a.id)??0)+1);degree.set(b.id,(degree.get(b.id)??0)+1);
    }
    return freezeData(paths);
  }
  reserves(at:MassAddress,radius=0):boolean{
    return this.at(at).some(path=>{
      const q=localOffset(at,path.origin,this.generator.spec.addressSpan);
      return path.points.slice(1).some((p,i)=>segmentDistance(q,path.points[i],p)<=path.width/2+radius+30);
    });
  }
  sample(at:MassAddress,base:MassTerrain):MassTerrain{
    const path=this.at(at).find(path=>{
      const q=localOffset(at,path.origin,this.generator.spec.addressSpan);
      return path.points.slice(1).some((p,i)=>segmentDistance(q,path.points[i],p)<=path.width/2);
    });
    return path?{...base,region:'ground',color:this.spec.color,source:{...base.source,rule:'wildernessPaths',source:this.spec.source,stream:path.id}}:base;
  }
  get stats(){return {cached:this.cache.size,paths:[...this.cache.values()].reduce((n,p)=>n+p.length,0)};}
}
