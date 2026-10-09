import type { MassLandformShape } from './landforms';

export interface RegionalLandformSite { id:string; x:number; y:number; radius:number }
const dry=(c:string)=>c==='g'||c==='c';
const neighbors=(k:number,n:number,visit:(j:number)=>void)=>{
  const x=k%n,y=Math.floor(k/n);
  if(x)visit(k-1);if(x+1<n)visit(k+1);if(y)visit(k-n);if(y+1<n)visit(k+n);
};
function flood(cells:readonly string[],n:number,start:number):Int32Array {
  const distance=new Int32Array(n*n);distance.fill(-1);
  if(!dry(cells[start]))return distance;
  const queue=new Int32Array(n*n);let head=0,tail=1;queue[0]=start;distance[start]=0;
  while(head<tail) {const k=queue[head++];neighbors(k,n,j=>{if(distance[j]<0&&dry(cells[j])){distance[j]=distance[k]+1;queue[tail++]=j;}});}
  return distance;
}
/** A finite, source-local composition. Protected circles remain transparent;
 * their owned exterior collars and spurs join the original dry route. No live
 * site, chunk, discovery or terrain mutation participates in this decision. */
export function composeRegionalSites(shape:MassLandformShape,sites:readonly RegionalLandformSite[],cell:number,apron:number,maxAlteredFraction:number,rejected?:(reason:string)=>void,regionalTerrainExpansion=false):MassLandformShape|null {
  const refuse=(reason:string)=>{rejected?.(reason);return null;};
  const n=shape.rows.length,original=shape.rows.join('').split(''),cells=[...original];
  let anchors=shape.navigation??[];
  if(anchors.length<4||sites.length>32)return refuse('budget');
  // Grammar silhouettes may grow a LOCAL dry collar around a site that cuts an
  // arm. Every supplied protected circle remains forbidden, including circles
  // belonging to otherwise unrelated sites. Omission retains historical rows.
  const regionalTerrainExpansionProtected=regionalTerrainExpansion?new Uint8Array(n*n):null;
  const regionalTerrainExpansionContacts=regionalTerrainExpansion?new Uint8Array(n*n):null;
  const regionalTerrainExpansionSites=new Set<RegionalLandformSite>();
  if(regionalTerrainExpansion) {
    for(const port of shape.ports??[])for(const side of [-1,0,1]) {
      const x=port.x+port.dx-port.dy*side,y=port.y+port.dy+port.dx*side;
      if(x>=0&&y>=0&&x<n&&y<n)regionalTerrainExpansionContacts![y*n+x]=1;
    }
    for(const site of sites) {
      for(let y=Math.max(0,Math.floor((site.y-site.radius-apron)/cell));y<Math.min(n,Math.ceil((site.y+site.radius+apron)/cell));y++)
        for(let x=Math.max(0,Math.floor((site.x-site.radius-apron)/cell));x<Math.min(n,Math.ceil((site.x+site.radius+apron)/cell));x++) {
          const k=y*n+x,dx=Math.max(x*cell-site.x,0,site.x-(x+1)*cell),dy=Math.max(y*cell-site.y,0,site.y-(y+1)*cell),d=dx*dx+dy*dy;
          if(d<=site.radius**2)regionalTerrainExpansionProtected![k]=1;
          if(original[k]!=='.'&&d<=(site.radius+apron)**2)regionalTerrainExpansionSites.add(site);
        }
    }
    for(let k=0;k<cells.length;k++)if(regionalTerrainExpansionProtected![k])cells[k]='.';
  }
  for(const site of sites) {
    // Children are complete motifs. A site cannot silently erase part of one.
    for(const child of shape.components??[]) {
      const dx=Math.max(child.x*cell-site.x,0,site.x-(child.x+child.size)*cell);
      const dy=Math.max(child.y*cell-site.y,0,site.y-(child.y+child.size)*cell);
      if(dx*dx+dy*dy<(site.radius+apron)**2)return refuse('child');
    }
    for(let y=Math.max(0,Math.floor((site.y-site.radius-apron)/cell));y<Math.min(n,Math.ceil((site.y+site.radius+apron)/cell));y++)
      for(let x=Math.max(0,Math.floor((site.x-site.radius-apron)/cell));x<Math.min(n,Math.ceil((site.x+site.radius+apron)/cell));x++) {
        const k=y*n+x;
        if(regionalTerrainExpansion&&regionalTerrainExpansionProtected![k])continue;
        if(original[k]==='.'&&!(regionalTerrainExpansion&&regionalTerrainExpansionSites.has(site)
          &&x>0&&y>0&&x<n-1&&y<n-1&&!regionalTerrainExpansionContacts![k]))continue;
        const dx=Math.max(x*cell-site.x,0,site.x-(x+1)*cell),dy=Math.max(y*cell-site.y,0,site.y-(y+1)*cell);
        if(dx*dx+dy*dy<=site.radius**2)cells[k]='.';
        else if(dx*dx+dy*dy<=(site.radius+apron)**2 && (cells[k]!=='.'||regionalTerrainExpansion))cells[k]='g';
      }
  }
  // Terminals are proof samples, not gameplay sites. If a protected site
  // occupies one, move the comparison point along its ORIGINAL dry route to
  // the nearest surviving body-clear stand, within a bounded local distance.
  const shifted: {x:number;y:number}[]=[];
  for(const anchor of anchors) {
    const k=anchor.y*n+anchor.x;
    if(dry(cells[k])){shifted.push(anchor);continue;}
    const distances=flood(original,n,k);let best=-1,score=Infinity;
    for(let j=0;j<cells.length;j++) {
      if(distances[j]<0||distances[j]>Math.ceil(1200/cell)||distances[j]>=score||!dry(cells[j]))continue;
      const x=j%n,y=Math.floor(j/n);let safe=x>0&&y>0&&x<n-1&&y<n-1;
      for(let dy=-1;dy<=1&&safe;dy++)for(let dx=-1;dx<=1;dx++)if(!dry(cells[(y+dy)*n+x+dx])){safe=false;break;}
      if(safe){best=j;score=distances[j];}
    }
    if(best<0)return refuse('terminal');
    shifted.push({x:best%n,y:Math.floor(best/n)});
  }
  anchors=shifted;
  const root=anchors[0].y*n+anchors[0].x;
  // Connect a bounded number of isolated collars. Breadth first search finds
  // the shortest new spur, seeded by every already connected dry cell. Width
  // remains 90 units; unknown substrate and protected sites are impassable.
  for(let pass=0;pass<=32;pass++) {
    const connected=flood(cells,n,root);
    if(!cells.some((c,k)=>dry(c)&&connected[k]<0))break;
    if(pass===32)return refuse('repairs');
    const previous=new Int32Array(n*n);previous.fill(-2);
    const queue=new Int32Array(n*n);let head=0,tail=0,target=-1;
    for(let k=0;k<cells.length;k++)if(connected[k]>=0){previous[k]=-1;queue[tail++]=k;}
    while(head<tail&&target<0) {
      const k=queue[head++];neighbors(k,n,j=>{
        if(previous[j]!==-2||cells[j]==='.'||target>=0)return;
        const x=j%n,y=Math.floor(j/n);
        // Do not squeeze a repaired passage between a site and a barrier.
        if(!dry(cells[j]))for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)
          if(x+dx<0||y+dy<0||x+dx>=n||y+dy>=n||cells[(y+dy)*n+x+dx]==='.')return;
        previous[j]=k;queue[tail++]=j;if(dry(cells[j]))target=j;
      });
    }
    if(target<0)return refuse('unconnected');
    let length=0;
    for(let k=target;previous[k]>=0;k=previous[k]) {
      if(++length>Math.ceil(1800/cell))return refuse('spur-length');
      const x=k%n,y=Math.floor(k/n);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++) {
        if(x+dx<0||y+dy<0||x+dx>=n||y+dy>=n)continue;
        const j=(y+dy)*n+x+dx;
        if(cells[j]==='b')cells[j]='g';else if(cells[j]==='w')cells[j]='c';
      }
    }
  }
  for(const child of shape.components??[])for(let y=child.y;y<child.y+child.size;y++)for(let x=child.x;x<child.x+child.size;x++)
    if(cells[y*n+x]!==original[y*n+x])return refuse('child-repair');
  if(shape.ports?.some(port=>!dry(cells[port.y*n+port.x])))return refuse('port');
  let obstacles=0,altered=0;
  for(let k=0;k<cells.length;k++)if(original[k]==='b'||original[k]==='w'){obstacles++;if(cells[k]!==original[k])altered++;}
  if(altered>obstacles*maxAlteredFraction)return refuse('altered');
  if(regionalTerrainExpansion) {
    // Newly owned exterior ground has a separate finite area budget. Neither
    // obstacle retention nor route-distance limits can substitute for this cap.
    let regionalTerrainExpansionArea=0;
    for(let k=0;k<cells.length;k++) {
      if(original[k]==='.'&&cells[k]!=='.')regionalTerrainExpansionArea++;
      if(regionalTerrainExpansionProtected![k]&&cells[k]!=='.')return refuse('expansion-protection');
      if(regionalTerrainExpansionContacts![k]&&cells[k]!=='.')return refuse('expansion-contact');
    }
    if(regionalTerrainExpansionArea>Math.floor(maxAlteredFraction*n*n))return refuse('expansion-area');
  }
  if(!regionalRouteProof(original,cells,n,anchors,cell,rejected))return null;
  return {...shape,navigation:anchors,rows:Array.from({length:n},(_,y)=>cells.slice(y*n,(y+1)*n).join(''))};
}

export function regionalDryConnected(shape:MassLandformShape):boolean {
  const cells=shape.rows.join('').split(''),start=cells.findIndex(dry);
  if(start<0)return false;
  const seen=flood(cells,shape.rows.length,start);
  return cells.every((c,k)=>!dry(c)||seen[k]>=0);
}

/** Final route proof also runs after child fitting, over the same terminals. */
export function regionalRoutesPreserved(before:MassLandformShape,after:MassLandformShape,cell:number,rejected?:(reason:string)=>void):boolean {
  return regionalRouteProof(before.rows.join('').split(''),after.rows.join('').split(''),before.rows.length,after.navigation??[],cell,rejected);
}
function regionalRouteProof(original:readonly string[],cells:readonly string[],n:number,anchors:readonly {x:number;y:number}[],cell:number,rejected?:(reason:string)=>void):boolean {
  // A tiny cut can destroy a large branching route. Compare actual distances
  // between preserved terminals rather than just counting obstacle area.
  for(let i=0;i<anchors.length-1;i++) {
    const start=anchors[i].y*n+anchors[i].x,before=flood(original,n,start),after=flood(cells,n,start);
    for(let j=i+1;j<anchors.length;j++) {
      const k=anchors[j].y*n+anchors[j].x,a=before[k],b=after[k];
      const reason=a<0||b<0?'route':b<a*.72-180/cell?'shortcut':b>a*1.35+180/cell?'detour':undefined;
      if(reason){rejected?.(reason);return false;}
    }
  }
  return true;
}
