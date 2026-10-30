import type { Doodad } from '../engine/levelgen';
import { blocksMovement } from '../engine/levelgen';

/** Complete native material grid; exterior unused wall is the only transparent
 * material. Nothing inside a source's authored floor/water is clipped. */
export interface NativeRegionalGeometry {
  cell: 30; rows: readonly string[]; materials: readonly string[];
  width: number; height: number;
}
export const nativeRegionalDry = (region: string | undefined): boolean =>
  region === 'ground' || region === 'locale_bridge';
export function nativeRegionalMaterial(g: NativeRegionalGeometry, x: number, y: number): string | undefined {
  const c = g.rows[Math.floor(y/30)]?.[Math.floor(x/30)];
  return c && c !== '.' ? g.materials[c.charCodeAt(0)-65] : undefined;
}
export function nativeRegionalCircle(g: NativeRegionalGeometry, x: number, y: number, radius: number): boolean {
  for (let iy=Math.max(0,Math.floor((y-radius)/30));iy<=Math.min(g.rows.length-1,Math.floor((y+radius)/30));iy++)
    for (let ix=Math.max(0,Math.floor((x-radius)/30));ix<=Math.min(g.rows[0].length-1,Math.floor((x+radius)/30));ix++) {
      const dx=Math.max(ix*30-x,0,x-(ix+1)*30),dy=Math.max(iy*30-y,0,y-(iy+1)*30);
      if (dx*dx+dy*dy<=radius*radius && g.rows[iy][ix]!=='.') return true;
    }
  return false;
}
/** Radius-15 player proof at cell centers, including the native scenery bodies.
 * Adjacent centers sweep a full diameter corridor inside their two cells. */
export function nativeRegionalRoutes(g: NativeRegionalGeometry, terminals: readonly {x:number;y:number}[], doodads: readonly Doodad[]=[]): boolean {
  const w=g.rows[0].length,h=g.rows.length,clear=new Uint8Array(w*h),seen=new Uint8Array(w*h),queue=new Int32Array(w*h);
  const blockers=doodads.filter(blocksMovement);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
    if(!nativeRegionalDry(nativeRegionalMaterial(g,(x+.5)*30,(y+.5)*30)))continue;
    if(blockers.some(d=>Math.hypot(d.pos.x-(x+.5)*30,d.pos.y-(y+.5)*30)<d.radius+15))continue;
    clear[y*w+x]=1;
  }
  const indices=terminals.map(p=>Math.floor(p.y/30)*w+Math.floor(p.x/30));
  if(!indices.length||indices.some(k=>!clear[k]))return false;
  let head=0,tail=1;queue[0]=indices[0];seen[indices[0]]=1;
  while(head<tail) {
    const k=queue[head++],x=k%w,y=Math.floor(k/w);
    for(const j of [x?k-1:-1,x+1<w?k+1:-1,y?k-w:-1,y+1<h?k+w:-1]) {
      if(j<0||!clear[j]||seen[j])continue;
      const ax=(x+.5)*30,ay=(y+.5)*30,bx=(j%w+.5)*30,by=(Math.floor(j/w)+.5)*30;
      if(blockers.some(d=>{const t=Math.max(0,Math.min(1,((d.pos.x-ax)*(bx-ax)+(d.pos.y-ay)*(by-ay))/900));
        return Math.hypot(d.pos.x-ax-(bx-ax)*t,d.pos.y-ay-(by-ay)*t)<d.radius+15;}))continue;
      seen[j]=1;queue[tail++]=j;
    }
  }
  return indices.every(k=>!!seen[k]);
}
/** Only boundary-connected unused wall is released. Enclosed walls stay solid,
 * so closed native courtyards cannot fill with unrelated noise terrain. */
export function nativeRegionalCapture(width:number,height:number,read:(x:number,y:number)=>string):NativeRegionalGeometry {
  const w=width/30,h=height/30,regions=Array.from({length:w*h},(_,k)=>read((k%w+.5)*30,(Math.floor(k/w)+.5)*30));
  const exterior=new Uint8Array(w*h),queue:number[]=[];
  for(let k=0;k<w*h;k++)if(regions[k]==='wall'&&(k<w||k>=w*(h-1)||k%w===0||k%w===w-1)){exterior[k]=1;queue.push(k);}
  for(let i=0;i<queue.length;i++){const k=queue[i],x=k%w,y=Math.floor(k/w);
    for(const j of [x?k-1:-1,x+1<w?k+1:-1,y?k-w:-1,y+1<h?k+w:-1])
      if(j>=0&&!exterior[j]&&regions[j]==='wall'){exterior[j]=1;queue.push(j);}
  }
  const materials=[...new Set(regions)].sort(),rows:string[]=[];
  for(let y=0;y<h;y++){let row='';for(let x=0;x<w;x++){
    let keep=!exterior[y*w+x];
    if(!keep)for(let yy=Math.max(0,y-4);yy<=Math.min(h-1,y+4)&&!keep;yy++)
      for(let xx=Math.max(0,x-4);xx<=Math.min(w-1,x+4);xx++)if(regions[yy*w+xx]!=='wall'&&Math.hypot(xx-x,yy-y)<=4){keep=true;break;}
    row+=keep?String.fromCharCode(65+materials.indexOf(regions[y*w+x])):'.';
  }rows.push(row);}
  return {cell:30,rows,materials,width,height};
}
