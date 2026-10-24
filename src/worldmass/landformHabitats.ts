import type { Vec2 } from '../core/math';
import { regionKind } from '../world/regions';
import type { RegionGrid } from '../world/walk';

/** Generation-only body clearance. Native movement retains its own collision
 * semantics; an ordinary land pack starts on dry ground with its entire body. */
export function landformHabitatStand(walk: Pick<RegionGrid, 'regionAt' | 'cellSize'>, at: Vec2, radius: number): boolean {
  const cell=walk.cellSize!;
  if(!Number.isFinite(radius)||radius<=0||!Number.isFinite(cell)||cell<=0)return false;
  const loX=Math.floor((at.x-radius)/cell),hiX=Math.floor((at.x+radius)/cell);
  const loY=Math.floor((at.y-radius)/cell),hiY=Math.floor((at.y+radius)/cell);
  if((hiX-loX+1)*(hiY-loY+1)>4096)return false;
  for(let y=loY;y<=hiY;y++)for(let x=loX;x<=hiX;x++) {
    const dx=Math.max(x*cell-at.x,0,at.x-(x+1)*cell),dy=Math.max(y*cell-at.y,0,at.y-(y+1)*cell);
    if(dx*dx+dy*dy>=radius*radius-1e-8)continue;
    const region=regionKind(walk.regionAt((x+.5)*cell,(y+.5)*cell));
    if(!region?.walkable || region.blocks || region.standStatusDeep)return false;
  }
  return true;
}

/** Draw-free, finite repair within the SAME habitat/formation radius. A failed
 * repair defers birth; it never invents ground or changes the native roster. */
export function landformHabitatSeat(at: Vec2, center: Vec2, radius: number, cell: number,
  accepts:(at:Vec2)=>boolean):Vec2|null {
  if(accepts(at))return {...at};
  const step=cell/2,anchor=Math.hypot(at.x-center.x,at.y-center.y)<=radius?at:center;
  const x=Math.round(anchor.x/step)*step,y=Math.round(anchor.y/step)*step;
  const rings=Math.min(128,Math.ceil(radius*2/step)+1);
  let examined=0;
  for(let r=0;r<=rings;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++) {
    if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
    if(examined++>=4096)return null;
    const q={x:x+dx*step,y:y+dy*step};
    if(Math.hypot(q.x-center.x,q.y-center.y)<=radius&&accepts(q))return q;
  }
  return null;
}
