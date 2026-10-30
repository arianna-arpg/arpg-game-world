import type { MassRange } from './contracts';
import type { MassEcologySpec } from './ecology';

/** Climate families are resolved into the run descriptor. Native tilesets own
 * their encounter rosters; these rules own continuous geographic placement. */
export interface MassBiomeFamily {
  id: string; when: MassRange[]; region: string; color?: string;
}
export const MASS_BIOME_FAMILIES: readonly MassBiomeFamily[] = [
  {id:'downs',region:'ground',when:[{field:'temperature',min:-.35},{field:'moisture',min:-.3,max:.35}]},
  {id:'forest',region:'ground',when:[{field:'temperature',min:-.35},{field:'moisture',min:.35},{field:'elevation',min:.22}]},
  {id:'desert',region:'firm_sand',when:[{field:'temperature',min:-.35},{field:'moisture',max:-.3}]},
  {id:'marsh',region:'ground',when:[{field:'temperature',min:-.35},{field:'moisture',min:.35},{field:'elevation',max:.22}]},
  {id:'tundra',region:'ground',color:'#68787c',when:[{field:'temperature',max:-.35}]},
];
/** Additional native scenery vocabulary; explicit regions make ecology usable
 * on authored soft/wet/frozen ground without broadening old recipes. */
export const MASS_CLIMATE_ECOLOGY: MassEcologySpec['rules'] = [
  {id:'marsh',biomes:['marsh'],regions:['ground','mud','swamp'],chance:.83,cluster:{count:[3,5],spread:46},pieces:[
    {kind:'reeds',weight:5,radius:[26,44]},{kind:'dead_tree',weight:2,radius:[34,52]},
    {kind:'fern',weight:2,radius:[22,34]},{kind:'peat_mound',weight:2,radius:[22,36]},
    {kind:'sunken_log',weight:1,radius:[25,40]},{kind:'marsh_wisp',weight:1,radius:[14,22]},
  ]},
  {id:'tundra',biomes:['tundra'],regions:['ground','ice'],chance:.66,cluster:{count:[2,4],spread:46},pieces:[
    {kind:'conifer',weight:3,radius:[36,58]},{kind:'rock',weight:3,radius:[24,42]},
    {kind:'snowdrift',weight:4,radius:[34,62]},{kind:'dead_tree',weight:1,radius:[28,44]},
    {kind:'icicle_cluster',weight:2,radius:[22,38]},
  ]},
];
