import type { Vec2 } from '../core/math';
import { address, localOffset, moveAddress, type MassAddress } from './address';
import { canonical, freezeData, massDigest } from './random';

export const MASS_ACCESS_POLICY=Object.freeze({step:30,halfSpan:1260,bodyRadius:12,corridorRadius:42,maxExpanded:8192,maxTargets:33});
export interface MassAccessTarget {at:MassAddress;radius:number}
export interface MassAccessProof {
  version:1;center:MassAddress;halfSpan:number;targets:MassAccessTarget[];anchors:number[];paths:number[][];hash:string;
}
export interface MassAccessEnvironment {regionAt(at:MassAddress):string;reserved?(at:MassAddress,radius:number):boolean;terrainCell:number;isDry(region:string):boolean}
const canonicalAddress=(at:MassAddress,span:number)=>canonical(at)===canonical(address(at.dimension,at.cx,at.cy,at.x,at.y,span));
/** Exact touched-cell coverage for a body disc on an aligned region grid.
 * Cardinal samples miss the diagonal tile when the body overlaps a corner. */
export function discTerrainClear(p:Vec2,radius:number,cell:number,accept:(center:Vec2)=>boolean):boolean{
  for(let y=Math.floor((p.y-radius)/cell);y<=Math.floor((p.y+radius)/cell);y++)for(let x=Math.floor((p.x-radius)/cell);x<=Math.floor((p.x+radius)/cell);x++){
    const dx=Math.max(x*cell-p.x,0,p.x-(x+1)*cell),dy=Math.max(y*cell-p.y,0,p.y-(y+1)*cell);
    if(dx*dx+dy*dy<radius*radius&&!accept({x:(x+.5)*cell,y:(y+.5)*cell}))return false;
  }
  return true;
}
const grid=(halfSpan:number)=>{
  if(!Number.isInteger(halfSpan)||halfSpan<300||halfSpan>1890||halfSpan%30)throw Error('Invalid geographic access bounds');
  const side=halfSpan/30*2+1;
  return{side,total:side*side,point:(i:number)=>({x:(i%side)*30-halfSpan,y:Math.floor(i/side)*30-halfSpan}),
    index:(p:Vec2)=>(Math.round(p.y/30)+halfSpan/30)*side+Math.round(p.x/30)+halfSpan/30};
};
export function geographicAccessPoints(proof:MassAccessProof):Vec2[]{
  const g=grid(proof.halfSpan);return [...new Set(proof.paths.flat())].map(g.point);
}
export function validateGeographicAccess(proof:MassAccessProof,span:number):void{
  const {hash,...data}=proof,g=grid(proof.halfSpan);
  if(!canonicalAddress(proof.center,span)||proof.targets?.some(t=>!canonicalAddress(t.at,span))||proof.version!==1||hash!==massDigest(data)||!Array.isArray(proof.targets)||!proof.targets.length||proof.targets.length>MASS_ACCESS_POLICY.maxTargets
    ||!Array.isArray(proof.anchors)||proof.anchors.length!==proof.targets.length||!Array.isArray(proof.paths)||proof.paths.length!==proof.targets.length
    ||proof.paths.reduce((n,p)=>n+p.length,0)>MASS_ACCESS_POLICY.maxExpanded+proof.targets.length
    ||proof.targets.some(t=>!Number.isFinite(t.radius)||t.radius<0||t.radius>36||t.at.dimension!==proof.center.dimension))throw Error('Invalid geographic access proof');
  const targets=proof.targets.map(t=>({...localOffset(t.at,proof.center,span,16),radius:t.radius})),root=proof.anchors[0];
  const valid=(i:number)=>Number.isInteger(i)&&i>=0&&i<g.total;
  if(proof.anchors.some((a,i)=>!valid(a)||Math.abs(Math.hypot(g.point(a).x-targets[i].x,g.point(a).y-targets[i].y)-60)>.001))
    throw Error('Invalid geographic interaction anchor');
  for(const[pathIndex,path]of proof.paths.entries()){
    if(!path.length||path[0]!==root||new Set(path).size!==path.length||path.some(i=>!valid(i))
      ||path.some((n,i)=>i>0&&Math.abs(n%g.side-path[i-1]%g.side)+Math.abs(Math.floor(n/g.side)-Math.floor(path[i-1]/g.side))!==1))throw Error('Disconnected geographic access proof');
    const last=path.at(-1)!;
    if(pathIndex<proof.targets.length-1?last!==proof.anchors[pathIndex+1]:!(last%g.side===0||last%g.side===g.side-1||Math.floor(last/g.side)===0||Math.floor(last/g.side)===g.side-1))
      throw Error('Geographic access misses a fixture or exterior');
  }
  if(geographicAccessPoints(proof).some(p=>targets.some(t=>Math.hypot(p.x-t.x,p.y-t.y)<t.radius+MASS_ACCESS_POLICY.bodyRadius)))
    throw Error('Geographic access crosses its future fixture body');
}

/** Bounded A* paths form one physical network from every interaction stand to
 * dry surrounding country. The callback must be immutable base terrain and
 * independent reservations, never nativeCountry/stream (which would recurse).
 * No terrain edits, resident actors or query order participate in planning. */
export function planGeographicAccess(center:MassAddress,targets:readonly MassAccessTarget[],span:number,environment:MassAccessEnvironment,
  halfSpan:number=MASS_ACCESS_POLICY.halfSpan):{ok:true;proof:Readonly<MassAccessProof>;expanded:number;samples:number}|{ok:false;reason:string;expanded:number;samples:number}{
  const g=grid(halfSpan),cell=environment.terrainCell;
  if(!canonicalAddress(center,span)||targets.some(t=>!canonicalAddress(t.at,span))||!targets.length||targets.length>MASS_ACCESS_POLICY.maxTargets||!Number.isSafeInteger(cell)||cell<1||cell>120||span%cell
    ||targets.some(t=>!Number.isFinite(t.radius)||t.radius<0||t.radius>36||t.at.dimension!==center.dimension))throw Error('Invalid geographic access request');
  const bodies=targets.map(t=>({...localOffset(t.at,center,span,16),radius:t.radius})),terrain=new Map<string,boolean>(),clearance=new Map<string,boolean>();
  let expanded=0,samples=0;
  const fail=(reason:string)=>({ok:false as const,reason,expanded,samples});
  const clear=(p:Vec2):boolean=>{
    const key=p.x+','+p.y,hit=clearance.get(key);if(hit!==undefined)return hit;
    let okay=!bodies.some(t=>Math.hypot(p.x-t.x,p.y-t.y)<t.radius+MASS_ACCESS_POLICY.bodyRadius);
    if(okay&&environment.reserved?.(moveAddress(center,p,span),MASS_ACCESS_POLICY.corridorRadius))okay=false;
    if(okay)okay=discTerrainClear({x:p.x+center.x%cell,y:p.y+center.y%cell},MASS_ACCESS_POLICY.bodyRadius,cell,q=>{
      const x=Math.floor(q.x/cell),y=Math.floor(q.y/cell),k=x+','+y;let value=terrain.get(k);
      if(value===undefined){samples++;value=environment.isDry(environment.regionAt(moveAddress(center,{x:q.x-center.x%cell,y:q.y-center.y%cell},span)));terrain.set(k,value);}
      return value;
    });
    clearance.set(key,okay);return okay;
  };
  const choices=bodies.map(t=>[[0,-60],[-60,0],[60,0],[0,60]].map(([dx,dy])=>({x:t.x+dx,y:t.y+dy}))
    .filter(p=>p.x>=-halfSpan&&p.y>=-halfSpan&&p.x<=halfSpan&&p.y<=halfSpan&&p.x%30===0&&p.y%30===0&&clear(p)).map(g.index));
  if(choices.some(c=>!c.length))return fail('geographic-access-no-interaction-stand');
  const root=choices[0][0],anchors=[root],paths:number[][]=[];
  type Node={i:number;cost:number;score:number;h:number};
  const search=(goal:(i:number)=>boolean,h:(i:number)=>number):number[]|undefined=>{
    const heap:Node[]=[],distance=new Uint16Array(g.total),parent=new Int32Array(g.total);distance.fill(65535);parent.fill(-1);
    const before=(a:Node,b:Node)=>a.score<b.score||a.score===b.score&&(a.h<b.h||a.h===b.h&&a.i<b.i);
    const push=(n:Node)=>{let i=heap.length;heap.push(n);while(i>0){const p=(i-1)>>1;if(!before(n,heap[p]))break;heap[i]=heap[p];i=p;}heap[i]=n;};
    const pop=()=>{const top=heap[0],last=heap.pop()!;if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&before(heap[c+1],heap[c]))c++;if(!before(heap[c],last))break;heap[i]=heap[c];i=c;}heap[i]=last;}return top;};
    distance[root]=0;push({i:root,cost:0,score:h(root),h:h(root)});
    while(heap.length&&expanded<MASS_ACCESS_POLICY.maxExpanded){
      const n=pop();if(n.cost!==distance[n.i])continue;expanded++;
      if(goal(n.i)){const route:number[]=[];for(let i=n.i;i!==-1;i=parent[i])route.push(i);return route.reverse();}
      const x=n.i%g.side,y=Math.floor(n.i/g.side),a=g.point(n.i);
      for(const[dx,dy]of[[0,-1],[-1,0],[1,0],[0,1]]){
        const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=g.side||ny>=g.side)continue;
        const i=ny*g.side+nx,cost=n.cost+1;if(cost>=distance[i])continue;
        const b=g.point(i);if(![.25,.5,.75,1].every(t=>clear({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t})))continue;
        distance[i]=cost;parent[i]=n.i;const estimate=h(i);push({i,cost,score:cost+estimate,h:estimate});
      }
    }
  };
  for(let t=1;t<choices.length;t++){
    const goals=new Set(choices[t]),route=search(i=>goals.has(i),i=>Math.min(...choices[t].map(j=>Math.abs(i%g.side-j%g.side)+Math.abs(Math.floor(i/g.side)-Math.floor(j/g.side)))));
    if(!route)return fail(expanded>=MASS_ACCESS_POLICY.maxExpanded?'geographic-access-budget':'geographic-access-disconnected-fixture');
    anchors.push(route.at(-1)!);paths.push(route);
  }
  const edge=(i:number)=>Math.min(i%g.side,Math.floor(i/g.side),g.side-1-i%g.side,g.side-1-Math.floor(i/g.side));
  const exit=search(i=>edge(i)===0,edge);if(!exit)return fail(expanded>=MASS_ACCESS_POLICY.maxExpanded?'geographic-access-budget':'geographic-access-enclosed');
  paths.push(exit);
  const body={version:1 as const,center,halfSpan,targets:targets.map(t=>({...t})),anchors,paths};
  const proof=freezeData({...body,hash:massDigest(body)});validateGeographicAccess(proof,span);
  return{ok:true,proof,expanded,samples};
}

/** Small spatial index for repeated ecology/native-feature reservation queries.
 * Persist the proof; this derived index is bounded and freely disposable. */
export class GeographicAccessIndex{
  readonly points:readonly Vec2[];
  private bins=new Map<string,Vec2[]>();
  constructor(readonly proof:Readonly<MassAccessProof>,readonly span:number){
    validateGeographicAccess(proof,span);this.points=geographicAccessPoints(proof);
    for(const p of this.points){const k=Math.floor(p.x/120)+','+Math.floor(p.y/120),list=this.bins.get(k);if(list)list.push(p);else this.bins.set(k,[p]);}
  }
  intersects(at:MassAddress,radius:number):boolean{
    if(!Number.isFinite(radius)||radius<0||radius>6000)throw Error('Invalid geographic corridor query');
    if(at.dimension!==this.proof.center.dimension)return false;
    const p=localOffset(at,this.proof.center,this.span,64),r=radius+MASS_ACCESS_POLICY.corridorRadius;
    if(Math.abs(p.x)>this.proof.halfSpan+r||Math.abs(p.y)>this.proof.halfSpan+r)return false;
    const near=(q:Vec2)=>(q.x-p.x)**2+(q.y-p.y)**2<=r*r;
    if(r>240)return this.points.some(near);
    for(let y=Math.floor((p.y-r)/120);y<=Math.floor((p.y+r)/120);y++)for(let x=Math.floor((p.x-r)/120);x<=Math.floor((p.x+r)/120);x++)
      if(this.bins.get(x+','+y)?.some(near))return true;
    return false;
  }
}
