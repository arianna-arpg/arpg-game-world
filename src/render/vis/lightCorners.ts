import type { GridWalkField } from '../../world/gridWalk';
import { regionKind } from '../../world/regions';
import { tierElevOf } from '../../engine/tiers';
import { LOS_CFG } from '../../engine/los';

type Grid = Pick<GridWalkField, 'cellSize' | 'version' | 'regionAt'>;
type Point = { x:number; y:number };
const BLOCK = 16, CACHE_BLOCKS = 256, MAX_QUERY_BLOCKS = 64;
const caches = new WeakMap<Grid, { version:number; blocks:Map<string,Point[]> }>();

/** Cache exposed terrain corners in bounded world blocks. Rays on both sides
 * of these exact bearings stop the fixed radial fan from snapping when a
 * moving light grazes a corner. Flat faces need no extra rays. */
export function lightCorners(grid:Grid,x:number,y:number,r:number,tier:number): readonly Point[] {
  const span=grid.cellSize*BLOCK;
  const x0=Math.floor((x-r)/span),x1=Math.floor((x+r)/span);
  const y0=Math.floor((y-r)/span),y1=Math.floor((y+r)/span);
  // Extremely fine grids / authoring-only giant lights retain the bounded
  // radial path. Never turn a light query into an unbounded terrain scan.
  if((Math.ceil(2*r/span)+1)**2>MAX_QUERY_BLOCKS)return [];
  let cache=caches.get(grid);
  if(!cache||cache.version!==grid.version){
    cache={version:grid.version,blocks:new Map()};caches.set(grid,cache);
  }
  const points:Point[]=[],cs=grid.cellSize,eye=tier+LOS_CFG.elev.eye;
  for(let by=y0;by<=y1;by++)for(let bx=x0;bx<=x1;bx++){
    const key=bx+','+by+','+tier;
    let corners=cache.blocks.get(key);
    if(!corners){
      corners=[];
      const cells=new Uint8Array((BLOCK+1)*(BLOCK+1));
      for(let j=0;j<=BLOCK;j++)for(let i=0;i<=BLOCK;i++){
        const id=grid.regionAt((bx*BLOCK+i-.5)*cs,(by*BLOCK+j-.5)*cs);
        const kind=regionKind(id),deck=tierElevOf(id);
        cells[j*(BLOCK+1)+i]=Number(!!kind?.blocksSight&&(deck===null||eye<deck)
          ||kind?.hangingFrom!==undefined&&eye>=kind.hangingFrom);
      }
      for(let j=0;j<BLOCK;j++)for(let i=0;i<BLOCK;i++){
        const a=j*(BLOCK+1)+i;
        const mask=cells[a]|cells[a+1]<<1|cells[a+BLOCK+1]<<2|cells[a+BLOCK+2]<<3;
        if(mask===0||mask===15||mask===3||mask===12||mask===5||mask===10)continue;
        corners.push({x:(bx*BLOCK+i)*cs,y:(by*BLOCK+j)*cs});
      }
      cache.blocks.set(key,corners);
      while(cache.blocks.size>CACHE_BLOCKS)cache.blocks.delete(cache.blocks.keys().next().value!);
    } else { cache.blocks.delete(key);cache.blocks.set(key,corners); }
    for(const p of corners)if((p.x-x)**2+(p.y-y)**2<r*r)points.push(p);
  }
  return points;
}
