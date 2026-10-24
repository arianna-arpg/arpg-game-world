import type { MassLandformPlan, MassLandformShape } from './landforms';
import type { MassPatchBox } from './terrainPatches';

/** Capture original ownership plus locally expanded collars. Site holes remain protected;
 * the unrelated exterior between arms is available to other terrain owners. */
export function regionalTerrainFootprint(shape:MassLandformShape,realized:MassLandformShape=shape):readonly string[] {
  return shape.rows.map((row,y)=>[...row].map((c,x)=>c==='.'&&realized.rows[y][x]==='.'?'.':'#').join(''));
}
/** Only painted cells select this source. Exterior pockets and protected site
 * holes inherit their existing terrain/content, even inside a bounding square. */
export function regionalTerrainAt(plan:Readonly<MassLandformPlan>,x:number,y:number,cell:number):boolean {
  const c=plan.shape.rows[Math.floor(y/cell)]?.[Math.floor(x/cell)];
  return c!==undefined&&c!=='.';
}

/** Padding protects the four exterior throat contacts as well as narrow route
 * margins. These tests use the saved realized mask, not resident scenery. */
export function regionalTerrainCircle(plan:Readonly<MassLandformPlan>,x:number,y:number,radius:number,cell:number,padding=120):boolean {
  const rows=plan.regionalTerrainFootprint!;const n=rows.length,r=radius+padding;
  for(let yy=Math.max(0,Math.ceil((y-r)/cell)-1);yy<Math.min(n,Math.floor((y+r)/cell)+1);yy++)
    for(let xx=Math.max(0,Math.ceil((x-r)/cell)-1);xx<Math.min(n,Math.floor((x+r)/cell)+1);xx++) {
      if(rows[yy][xx]!== '#')continue;
      const dx=Math.max(xx*cell-x,0,x-(xx+1)*cell),dy=Math.max(yy*cell-y,0,y-(yy+1)*cell);
      if(dx*dx+dy*dy<=r*r)return true;
    }
  return false;
}
export function regionalTerrainBox(plan:Readonly<MassLandformPlan>,box:MassPatchBox,cell:number,padding=120):boolean {
  const rows=plan.regionalTerrainFootprint!,n=rows.length;
  const loX=Math.max(0,Math.ceil((box.minX-padding)/cell)-1),hiX=Math.min(n-1,Math.floor((box.maxX+padding)/cell));
  const loY=Math.max(0,Math.ceil((box.minY-padding)/cell)-1),hiY=Math.min(n-1,Math.floor((box.maxY+padding)/cell));
  for(let y=loY;y<=hiY;y++)for(let x=loX;x<=hiX;x++)if(rows[y][x]==='#')return true;
  return false;
}
