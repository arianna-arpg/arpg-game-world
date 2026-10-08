import { doodadRuleOf, hasDoodadRule, type DoodadKind } from '../engine/levelgen';
import { regionKind } from '../world/regions';
import { localOffset, moveAddress, type MassAddress } from './address';
import type { MassEcologySpec } from './ecology';
import { landformCell, type MassLandformPlan } from './landforms';
import { canonical } from './random';

/** These are native inert props. They use the ordinary ecology identity and
 * persistence path; no parallel scenery/reward lifecycle is introduced. */
export function massLandformDressing(): NonNullable<MassEcologySpec['landformDressing']> {
  const kinds: DoodadKind[]=['rubble','bone_pile','verdure_litter','scree','marsh_wisp','snowdrift'];
  return { source:'worldmass/landform-dressing-v1',clearance:30,
    definitions:kinds.map(kind=>({kind,rule:JSON.parse(canonical(doodadRuleOf(kind)))})),rules:[
    {id:'country-debris',biomes:['downs'],regions:['ground'],chance:.8,cluster:{count:[1,3],spread:46},pieces:[
      {kind:'rubble',weight:3,radius:[12,24]},{kind:'bone_pile',weight:1,radius:[12,18]},
      {kind:'verdure_litter',weight:2,radius:[20,34]},
    ]},
    {id:'forest-floor',biomes:['forest'],regions:['ground'],chance:.85,cluster:{count:[2,4],spread:46},pieces:[
      {kind:'verdure_litter',weight:5,radius:[24,42]},{kind:'scree',weight:1,radius:[14,24]},
    ]},
    {id:'wetland-remains',biomes:['marsh'],regions:['ground'],chance:.75,cluster:{count:[1,3],spread:46},pieces:[
      {kind:'verdure_litter',weight:3,radius:[22,36]},{kind:'marsh_wisp',weight:1,radius:[14,20]},
      {kind:'bone_pile',weight:1,radius:[12,20]},
    ]},
    {id:'frozen-debris',biomes:['tundra'],regions:['ground','ice'],chance:.75,cluster:{count:[1,3],spread:46},pieces:[
      {kind:'snowdrift',weight:4,radius:[22,40]},{kind:'scree',weight:2,radius:[14,24]},
      {kind:'bone_pile',weight:1,radius:[12,20]},
    ]},
    {id:'desert-remains',biomes:['desert'],regions:['ground','sand'],chance:.7,cluster:{count:[1,3],spread:46},pieces:[
      {kind:'scree',weight:3,radius:[18,30]},{kind:'bone_pile',weight:2,radius:[12,22]},
      {kind:'rubble',weight:2,radius:[16,26]},
    ]},
  ]};
}

/** Explicit opt-in is restricted to inert, round native ground dressing. The
 * blanket physical reservation remains authoritative for all other ecology. */
export function validateLandformDressing(value: NonNullable<MassEcologySpec['landformDressing']>): void {
  if(!value || typeof value.source!=='string' || !value.source || !Array.isArray(value.rules)
    || !value.rules.length || value.rules.length>16 || new Set(value.rules.map(r=>r.id)).size!==value.rules.length
    || !Number.isFinite(value.clearance) || value.clearance<0 || value.clearance>64
    || !Array.isArray(value.definitions) || !value.definitions.length || value.definitions.length>32
    || new Set(value.definitions.map(d=>d.kind)).size!==value.definitions.length)
    throw Error('Invalid landform dressing policy');
  const kinds=new Set(value.rules.flatMap(row=>row.pieces.map(p=>p.kind)));
  if(kinds.size!==value.definitions.length || value.definitions.some(d=>!kinds.has(d.kind)
    || !hasDoodadRule(d.kind) || canonical(d.rule)!==canonical(doodadRuleOf(d.kind))))
    throw Error('Landform dressing source definitions changed');
  for(const row of value.rules) for(const piece of row.pieces) {
    if(!hasDoodadRule(piece.kind))throw Error('Unknown landform dressing kind');
    const r=doodadRuleOf(piece.kind);
    // A registered region can alter native groundAt even when the prop has no
    // blocking flag. Keep these palettes decorative at admission, not hazards,
    // interactive triggers, harvestables, fuel or independent geometry owners.
    if(!['ground','inert'].includes(r.overlap) || r.blocksMove || r.blocksShot || r.blocksSight || r.brittle || r.effect || r.contact
      || r.hazardGround || r.fall || r.seedPaired || r.spans || r.fuel || r.veil || r.surface || r.rockForm
      || r.clearway || r.shelter || r.warms || r.resonance || r.mutable || r.fell || r.sightCover || regionKind(piece.kind))
      throw Error('Landform dressing must be inert native ground decoration');
  }
}

/** Decoration circles plus their saved feather margin stay on dry source cells, away from crossings and
 * walls. The final terrain reader respects edits and native layers present at admission.
 * No resident prop can change admission or carve a new route. */
export function landformDressingClear(plan: Readonly<MassLandformPlan>, at: MassAddress, radius:number,
  span:number, cell:number, regionAt:(at:MassAddress)=>string, allowedRegions:readonly string[]=['ground']):boolean {
  const size=plan.shape.rows.length*cell;
  const q=localOffset(at,plan.origin,span,Math.ceil(size/span)+2);
  if(q.x-radius<0 || q.y-radius<0 || q.x+radius>size || q.y+radius>size)return false;
  for(let y=Math.floor((q.y-radius)/cell);y<=Math.floor((q.y+radius)/cell);y++)
    for(let x=Math.floor((q.x-radius)/cell);x<=Math.floor((q.x+radius)/cell);x++) {
      const dx=Math.max(x*cell-q.x,0,q.x-(x+1)*cell),dy=Math.max(y*cell-q.y,0,q.y-(y+1)*cell);
      if(dx*dx+dy*dy>=radius*radius)continue;
      if(!'.g'.includes(landformCell(plan,x,y)))return false;
      const region=regionAt(moveAddress(plan.origin,{x:(x+.5)*cell,y:(y+.5)*cell},span));
      if(!allowedRegions.includes(region))return false;
      const kind=regionKind(region);
      if(!kind?.walkable || kind.blocks || kind.standStatusDeep || kind.enterStatus || kind.onEnter || kind.onStand
        || kind.standDamage || kind.survival) return false;
    }
  return true;
}
