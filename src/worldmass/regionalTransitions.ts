import { freezeData, massRandom } from './random';

/** Source-cell distances, independent of streamed chunk boundaries. */
export interface RegionalTransitionSpec {
  source: string; version: 1;
  width: readonly [number, number]; wavelength: readonly [number, number];
}
export function defaultRegionalTransitions(): RegionalTransitionSpec {
  return freezeData({source:'worldmass/regional-transitions-v1',version:1,width:[2,6],wavelength:[8,18]});
}
export function validateRegionalTransitions(p: RegionalTransitionSpec): void {
  const range=(a:readonly number[],lo:number,hi:number)=>Array.isArray(a)&&a.length===2
    &&a.every(v=>Number.isSafeInteger(v)&&v>=lo&&v<=hi)&&a[0]<=a[1];
  if(!p||p.version!==1||typeof p.source!=='string'||!p.source||p.source.length>256
    ||!range(p.width,0,8)||!range(p.wavelength,4,32))throw Error('Invalid regional transitions');
}
type Port={x:number;y:number;dx:number;dy:number};
function field(x:number,y:number,period:number,seed:number):number {
  const ix=Math.floor(x/period),iy=Math.floor(y/period),fx=x/period-ix,fy=y/period-iy;
  const hash=(a:number,b:number)=>{let n=(seed^Math.imul(a,0x9e3779b1)^Math.imul(b,0x85ebca6b))>>>0;
    n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return((n^(n>>>16))>>>0)/4294967296;};
  const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),a=hash(ix,iy),b=hash(ix+1,iy),c=hash(ix,iy+1),d=hash(ix+1,iy+1);
  return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;
}
/** Grow connected, coherent outer shoulders into source transparency. Original
 * floor, walls, water and all throat contacts are immutable. There is no
 * rectangle fill or independently scattered collision confetti. The caller
 * subsequently fills enclosed voids and applies protected native site holes. */
export function regionalFeatherTerrain(rows:readonly string[],ports:readonly Port[],policy:RegionalTransitionSpec,
  seed:number,attempt:number):readonly string[] {
  const n=rows.length,rng=massRandom(seed,[policy.source,policy.version,attempt,'fringe']),
    period=rng.int(...policy.wavelength),salt=rng.int(0,0xffffffff),cells=rows.join('').split('');
  const distance=new Int16Array(n*n),queue=new Int32Array(n*n);distance.fill(-1);
  let head=0,tail=0;
  for(let k=0;k<cells.length;k++)if(cells[k]==='b'||cells[k]==='w'){distance[k]=0;queue[tail++]=k;}
  while(head<tail){
    const k=queue[head++],x=k%n,y=Math.floor(k/n),next=distance[k]+1;
    if(next>policy.width[1])continue;
    for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
      const xx=x+dx,yy=y+dy,j=yy*n+xx;
      if(xx<1||yy<1||xx>=n-1||yy>=n-1||distance[j]>=0||cells[j]!=='.')continue;
      // Existing exits remain broad approaches, even when the surrounding
      // shoulder changes shape. Fade before the finite source edge as well.
      if(ports.some(p=>(xx-p.x)*p.dx+(yy-p.y)*p.dy>=-7&&Math.abs((xx-p.x)*p.dy-(yy-p.y)*p.dx)<=5))continue;
      const edge=Math.min(xx-1,yy-1,n-2-xx,n-2-yy),fade=Math.min(1,Math.max(0,edge/(policy.width[1]+1))),
        width=(policy.width[0]+(policy.width[1]-policy.width[0])*field(xx,yy,period,salt))*fade;
      if(next>width)continue;
      cells[j]=cells[k];distance[j]=next;queue[tail++]=j;
    }
  }
  return freezeData(Array.from({length:n},(_,y)=>cells.slice(y*n,(y+1)*n).join('')));
}
