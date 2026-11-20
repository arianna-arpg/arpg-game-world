import type { PassiveNode } from '../data/passives';
import { passiveTreeNodeRadius } from '../data/passiveTreePresentation';
import { PASSIVE_TREE_ROUTE_CFG as CFG } from '../data/passiveTreeLayoutConfig';
import { esc } from './dom';

export interface RoutePoint { x:number; y:number }
export interface PassiveTreeRoute { a:string; b:string; points:RoutePoint[] }
export const passiveRouteKey = (a:string,b:string):string => a<b ? a+'|'+b : b+'|'+a;
export function routePointDistance(p:RoutePoint,a:RoutePoint,b:RoutePoint):number {
  const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
/** Near-parallel tracks must stay separate; their long shared-looking runs
 * cannot be explained by a bridge at a single crossing. */
export function passiveRoutesOverlap(a:RoutePoint,b:RoutePoint,c:RoutePoint,d:RoutePoint):boolean {
  const dx=b.x-a.x,dy=b.y-a.y,ex=d.x-c.x,ey=d.y-c.y,len=Math.hypot(dx,dy),other=Math.hypot(ex,ey);
  if(!len||!other||Math.abs(dx*ey-dy*ex)/len/other>CFG.parallelAngleSin)return false;
  const project=(p:RoutePoint):number=>((p.x-a.x)*dx+(p.y-a.y)*dy)/len;
  const overlap=Math.min(len,Math.max(project(c),project(d)))-Math.max(0,Math.min(project(c),project(d)));
  return overlap>CFG.parallelMinLength && Math.min(routePointDistance(c,a,b),routePointDistance(d,a,b),routePointDistance(a,c,d),routePointDistance(b,c,d))<CFG.parallelClearance;
}
/** A compact spatial index serves both direct visibility and the occasional
 * obstacle detour. Connections may cross; an unrelated node is never a junction. */
export function buildPassiveTreeRoutes(nodes:readonly PassiveNode[],edges:readonly (readonly [string,string])[]):Map<string,PassiveTreeRoute> {
  const byId=new Map(nodes.map(n=>[n.id,n]));
  const cells=new Map<string,PassiveNode[]>();
  const cellKeys=(a:RoutePoint,b=a,pad=0):string[]=>{
    const keys:string[]=[];
    for(let x=Math.floor((Math.min(a.x,b.x)-pad)/100);x<=Math.floor((Math.max(a.x,b.x)+pad)/100);x++)
      for(let y=Math.floor((Math.min(a.y,b.y)-pad)/100);y<=Math.floor((Math.max(a.y,b.y)+pad)/100);y++)keys.push(x+','+y);
    return keys;
  };
  for(const n of nodes)for(const key of cellKeys(n,n,passiveTreeNodeRadius(n)+CFG.nodeClearance)){
    if(!cells.has(key))cells.set(key,[]);cells.get(key)!.push(n);
  }
  const result=new Map<string,PassiveTreeRoute>();
  const tracks=new Map<string,[RoutePoint,RoutePoint][]>();
  // Canonical ordering makes both routing and bridge ownership independent of
  // the direction/order in which source data happened to declare its links.
  const ordered=[...new Map(edges.map(([a,b])=>[passiveRouteKey(a,b),a<b?[a,b]:[b,a]])).entries()].sort(([a],[b])=>a.localeCompare(b));
  for(const [, [aid,bid]] of ordered){
    const a=byId.get(aid),b=byId.get(bid);if(!a||!b)continue;
    const clear=(p:RoutePoint,q:RoutePoint):boolean=>{
      const visited=new Set<string>();
      for(const key of cellKeys(p,q))for(const n of cells.get(key)??[]){
        if(n.id===aid||n.id===bid||visited.has(n.id))continue;visited.add(n.id);
        if(routePointDistance(n,p,q)<passiveTreeNodeRadius(n)+CFG.nodeClearance-1e-6)return false;
      }
      const checked=new Set<[RoutePoint,RoutePoint]>();
      for(const key of cellKeys(p,q,CFG.parallelClearance))for(const track of tracks.get(key)??[]){
        if(checked.has(track))continue;checked.add(track);
        if(passiveRoutesOverlap(p,q,...track))return false;
      }
      return true;
    };
    let points:RoutePoint[]=[a,b];
    if(!clear(a,b)){
      // A* on a local reading grid, followed by line-of-sight simplification.
      // Per-edge phase prevents separate detours from sharing a grid track.
      const key=passiveRouteKey(aid,bid);let hash=0;for(const c of key)hash=(hash*31+c.charCodeAt(0))>>>0;
      const step=CFG.gridStep,phase=(hash%997)/997;
      let solved:RoutePoint[]|undefined;
      for(const margin of [CFG.searchMargin,CFG.searchMargin*3,CFG.searchMargin*8]){
        const minX=Math.max(2,Math.min(a.x,b.x)-margin)+phase*step,minY=Math.max(2,Math.min(a.y,b.y)-margin)+phase*step;
        const maxX=Math.min(5998,Math.max(a.x,b.x)+margin),maxY=Math.min(5998,Math.max(a.y,b.y)+margin);
        type Cell={x:number;y:number;g:number;f:number;parent?:Cell};
        const heap:Cell[]=[],cost=new Map<string,number>();
        const push=(n:Cell):void=>{let i=heap.length;heap.push(n);while(i>0){const p=(i-1)>>1;if(heap[p].f<=n.f)break;heap[i]=heap[p];i=p;}heap[i]=n;};
        const pop=():Cell=>{const first=heap[0],last=heap.pop()!;if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].f<heap[c].f)c++;if(heap[c].f>=last.f)break;heap[i]=heap[c];i=c;}heap[i]=last;}return first;};
        const at=(c:{x:number;y:number}):RoutePoint=>({x:minX+c.x*step,y:minY+c.y*step});
        const sx=Math.round((a.x-minX)/step),sy=Math.round((a.y-minY)/step);
        for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++){
          const c={x:sx+dx,y:sy+dy},p=at(c);if(!clear(a,p))continue;
          const g=Math.hypot(p.x-a.x,p.y-a.y);cost.set(c.x+','+c.y,g);push({...c,g,f:g+Math.hypot(p.x-b.x,p.y-b.y)});
        }
        let explored=0;
        while(heap.length&&explored++<100000){
          const c=pop(),p=at(c);if(c.g!==cost.get(c.x+','+c.y))continue;
          if(clear(p,b)){
            const walk:RoutePoint[]=[b];let cursor:Cell|undefined=c;while(cursor){walk.push(at(cursor));cursor=cursor.parent;}walk.push(a);walk.reverse();
            solved=[walk[0]];let i=0;while(i<walk.length-1){let j=walk.length-1;while(j>i+1&&!clear(walk[i],walk[j]))j--;solved.push(walk[j]);i=j;}break;
          }
          for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
            if(!dx&&!dy)continue;const next={x:c.x+dx,y:c.y+dy},q=at(next),k=next.x+','+next.y;
            if(q.x<minX||q.y<minY||q.x>maxX||q.y>maxY)continue;
            const g=c.g+step*Math.hypot(dx,dy);if(g>=(cost.get(k)??Infinity)||!clear(p,q))continue;
            cost.set(k,g);push({...next,g,f:g+Math.hypot(q.x-b.x,q.y-b.y),parent:c});
          }
        }
        if(solved)break;
      }
      if(!solved)throw new Error('No clear passive connection: '+key);
      points=solved;
    }
    // Trim along the polyline, not only its first segment (a close obstacle
    // can put a waypoint inside an endpoint's own backing disc).
    const trim=(p:RoutePoint[],distance:number):RoutePoint[]=>{
      while(p.length>1){const length=Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y);if(length>distance){p[0]={x:p[0].x+(p[1].x-p[0].x)*distance/length,y:p[0].y+(p[1].y-p[0].y)*distance/length};break;}distance-=length;p.shift();}return p;
    };
    points=trim(trim(points.map(p=>({x:p.x,y:p.y})),passiveTreeNodeRadius(a)+CFG.endpointGap).reverse(),passiveTreeNodeRadius(b)+CFG.endpointGap).reverse();
    result.set(passiveRouteKey(aid,bid),{a:aid,b:bid,points});
    for(let i=1;i<points.length;i++){
      const track:[RoutePoint,RoutePoint]=[points[i-1],points[i]];
      for(const key of cellKeys(...track,CFG.parallelClearance)){if(!tracks.has(key))tracks.set(key,[]);tracks.get(key)!.push(track);}
    }
  }
  return result;
}

let cacheKey='',cache=new Map<string,PassiveTreeRoute>();
export function passiveTreeRoutes(nodes:readonly PassiveNode[],edges:readonly (readonly [string,string])[]):Map<string,PassiveTreeRoute>{
  const key=nodes.map(n=>`${n.id}:${n.x},${n.y},${passiveTreeNodeRadius(n)}`).join(';')+'#'+edges.map(e=>e.join('|')).join(';');
  if(key!==cacheKey){cache=buildPassiveTreeRoutes(nodes,edges);cacheKey=key;}return cache;
}
/** Later routes bridge earlier ones: the opaque backing cuts a visible gap
 * across the lower stroke. Both layers share one path and are pointer transparent. */
export function passiveTreeRouteArt(route:PassiveTreeRoute,active:boolean):string{
  const d=route.points.map((p,i)=>(i?'L':'M')+p.x.toFixed(2)+' '+p.y.toFixed(2)).join(' '),width=active?CFG.activeWidth:CFG.width;
  return `<g class="passive-tree-route" data-a="${esc(route.a)}" data-b="${esc(route.b)}" pointer-events="none" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path class="passive-route-backing" d="${d}" stroke="${CFG.backing}" stroke-width="${width+CFG.bridgeClearance*2}"/>
    <path class="passive-route-face" d="${d}" stroke="${active?CFG.active:CFG.inactive}" stroke-width="${width}"/>
  </g>`;
}

/** Tooltip ownership includes native pointer, proximity and controller hover. */
export function highlightPassiveRoutes(root:Element,id?:string):void{
  const svg=root.querySelector('#tree-svg');if(!svg)return;
  svg.classList.toggle('tree-tracing',!!id);
  for(const el of svg.querySelectorAll<SVGElement>('.passive-tree-route,.vocation-tree-edge[data-a]'))el.classList.toggle('route-neighbor',!!id&&(el.dataset.a===id||el.dataset.b===id));
  for(const el of svg.querySelectorAll('.tree-node'))el.classList.toggle('route-origin',!!id&&el.getAttribute('data-node')===id);
}
