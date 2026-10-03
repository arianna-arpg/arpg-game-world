import type { Doodad } from '../engine/levelgen';
import { DOODAD_VISUALS } from '../data/doodadVisuals';
import type { WorldMassRuntime } from './runtime';
import { cellKey } from './address';

/** Presentation of actual native signs, never a second service registry. */
export const MASS_MAP_SIGNS = { enabled: true, maxGrain: 48, radius: 8 };
export interface MassMapSign {
  x: number; y: number; name: string; glyph: string; color: string;
}
export function massMapSigns(mass: WorldMassRuntime, scenery: readonly Doodad[]): MassMapSign[] {
  const town=mass.settlement;
  if(!MASS_MAP_SIGNS.enabled || !town)return [];
  return scenery.flatMap(d=>{
    if(d.gone || d.felled || !town.contains(d.pos.x,d.pos.y))return [];
    const def=DOODAD_VISUALS[d.kind],p=def?.params;
    if(def?.painter!=='serviceSign' || !p || typeof p.name!=='string' || !p.name)return [];
    if(!town.spec.cartography?.publicSigns && !mass.state.claimed('explored',cellKey(mass.walk.at(d.pos.x,d.pos.y))))return [];
    return [{x:d.pos.x,y:d.pos.y,name:p.name,glyph:String(p.glyph??'◆'),color:String(p.color??'#dbc59a')}];
  });
}
