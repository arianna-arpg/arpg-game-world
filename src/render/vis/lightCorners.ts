import type { CellWalkField } from '../../world/tiledWalk';
import { regionKind } from '../../world/regions';
import { tierElevOf } from '../../engine/tiers';
import { LOS_CFG } from '../../engine/los';

type Grid = Pick<CellWalkField, 'cellSize' | 'version' | 'regionAt'>;
type Point = { x:number; y:number };
interface CachedBlock { readonly points: readonly Point[]; readonly hasBlocker: boolean }
export interface LightCornerQuery { readonly corners: readonly Point[]; readonly anyBlocker: boolean }

const BLOCK = 16, CACHE_BLOCKS = 384, MAX_QUERY_BLOCKS = 64;
const LRU_TOUCH_THRESHOLD = (CACHE_BLOCKS * 3) >> 2;
const EMPTY_POINTS: readonly Point[] = [];
const OPEN_QUERY: LightCornerQuery = { corners: EMPTY_POINTS, anyBlocker: false };
const FALLBACK_QUERY: LightCornerQuery = { corners: EMPTY_POINTS, anyBlocker: true };
const scratchCells = new Uint8Array((BLOCK + 1) * (BLOCK + 1));

const regionSightCache = new Map<string, { b: boolean; deck: number | null; hf?: number }>();
function regionSightOf(id: string): { b: boolean; deck: number | null; hf?: number } {
  let v = regionSightCache.get(id);
  if (v === undefined) {
    const kind = regionKind(id);
    v = {
      b: !!kind?.blocksSight,
      deck: tierElevOf(id),
      ...(kind?.hangingFrom !== undefined ? { hf: kind.hangingFrom } : {}),
    };
    regionSightCache.set(id, v);
  }
  return v;
}

const caches = new WeakMap<Grid, { version:number; blocks:Map<string,CachedBlock> }>();

/** Query exposed terrain corners AND whether any sight-blocking cell exists in
 *  the queried blocks, allowing open-ground lights to exit in O(1). */
export function lightCornerQuery(grid:Grid,x:number,y:number,r:number,tier:number): LightCornerQuery {
  const span=grid.cellSize*BLOCK;
  const x0=Math.floor((x-r)/span),x1=Math.floor((x+r)/span);
  const y0=Math.floor((y-r)/span),y1=Math.floor((y+r)/span);
  // Extremely fine grids / authoring-only giant lights retain the bounded
  // radial path. Never turn a light query into an unbounded terrain scan.
  if((Math.ceil(2*r/span)+1)**2>MAX_QUERY_BLOCKS)return FALLBACK_QUERY;
  let cache=caches.get(grid);
  if(!cache||cache.version!==grid.version){
    cache={version:grid.version,blocks:new Map()};caches.set(grid,cache);
  }
  const cs=grid.cellSize,eye=tier+LOS_CFG.elev.eye,r2=r*r;
  let points:Point[]|null=null;
  let anyBlocker=false;
  for(let by=y0;by<=y1;by++)for(let bx=x0;bx<=x1;bx++){
    const key=bx+','+by+','+tier;
    let block=cache.blocks.get(key);
    if(!block){
      let corners:Point[]|null=null;
      let hasBlocker=false;
      for(let j=0;j<=BLOCK;j++)for(let i=0;i<=BLOCK;i++){
        const id=grid.regionAt((bx*BLOCK+i-.5)*cs,(by*BLOCK+j-.5)*cs);
        const rs=regionSightOf(id);
        const solid=(rs.b&&(rs.deck===null||eye<rs.deck))||(rs.hf!==undefined&&eye>=rs.hf)?1:0;
        scratchCells[j*(BLOCK+1)+i]=solid;
        if(solid)hasBlocker=true;
      }
      if(hasBlocker){
        for(let j=0;j<BLOCK;j++)for(let i=0;i<BLOCK;i++){
          const a=j*(BLOCK+1)+i;
          const mask=scratchCells[a]|scratchCells[a+1]<<1|scratchCells[a+BLOCK+1]<<2|scratchCells[a+BLOCK+2]<<3;
          if(mask===0||mask===15||mask===3||mask===12||mask===5||mask===10)continue;
          (corners??=[]).push({x:(bx*BLOCK+i)*cs,y:(by*BLOCK+j)*cs});
        }
      }
      block={points:corners??EMPTY_POINTS,hasBlocker};
      cache.blocks.set(key,block);
      while(cache.blocks.size>CACHE_BLOCKS)cache.blocks.delete(cache.blocks.keys().next().value!);
    } else if(cache.blocks.size>LRU_TOUCH_THRESHOLD){
      cache.blocks.delete(key);cache.blocks.set(key,block);
    }
    if(block.hasBlocker){
      anyBlocker=true;
      for(const p of block.points){
        const dx=p.x-x,dy=p.y-y;
        if(dx*dx+dy*dy<r2)(points??=[]).push(p);
      }
    }
  }
  if(!anyBlocker)return OPEN_QUERY;
  return {corners:points??EMPTY_POINTS,anyBlocker:true};
}

/** Cache exposed terrain corners in bounded world blocks. Rays on both sides
 * of these exact bearings stop the fixed radial fan from snapping when a
 * moving light grazes a corner. Flat faces need no extra rays. */
export function lightCorners(grid:Grid,x:number,y:number,r:number,tier:number): readonly Point[] {
  return lightCornerQuery(grid,x,y,r,tier).corners;
}
