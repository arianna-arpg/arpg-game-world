import type { Doodad, DoodadKind } from '../engine/levelgen';
import type { MassPlaceRecipe } from './contracts';
import type { MassSiteSpec } from './sites';
import { nativeMassAltar } from './fields';
import { OBJECTIVE_REWARD } from '../data/objectiveRewards';

interface FieldSite {
  id: string; roster: 'forest' | 'undead' | 'tundra'; count: number;
  recipe: MassPlaceRecipe; site: MassSiteSpec;
}
/** Geographic recipes and native altar rules become part of the run manifest.
 * All approaches remain open; the shared field changes where either side wants
 * to fight. These are destinations, not disposable player-only shrine buffs. */
export function countryFieldSites(): FieldSite[] {
  const prop=(kind:DoodadKind,x:number,y:number,radius:number,rot=0):Doodad=>
    ({kind,pos:{x,y},radius,rot});
  const make=(id:string,name:string,altar:string,roster:FieldSite['roster'],
    when:MassPlaceRecipe['when'],color:string,doodads:Doodad[]):FieldSite=>({
    id,roster,count:3,
    recipe:{id,version:1,content:id,period:2800,chance:.42,radius:330,jitter:.6,priority:6,
      when:[{field:'elevation',min:0},...when],surface:{region:'ground',color}},
    site:{name,source:'worldmass/country-fields/'+id,doodads,fixtures:[],
      completion:{source:'objectives/clear',...OBJECTIVE_REWARD},
      cache:{x:0,y:220,holdSeconds:4},altars:[nativeMassAltar(altar,0,0)]},
  });
  return [
    make('mending-hollow','Mending Hollow','mending_altar','forest',
      [{field:'temperature',min:-.35},{field:'moisture',min:.05}],'#3a4532',[
        ...[-1,1].flatMap(side=>[
          prop('forest_oak',side*235,-85,63),prop('forest_oak',side*235,110,58),
          prop('fern',side*180,20,35),prop('flowers',side*100,-130,35),
          prop('flowers',side*125,130,32),prop('sunken_log',side*175,-165,30,side*.5),
        ]),prop('ancient_tree',0,-245,70),prop('flowers',0,-170,30),
      ]),
    make('red-cairn','The Red Cairn','blood_altar','undead',
      [{field:'temperature',min:-.35},{field:'moisture',max:.2}],'#4c3c34',[
        prop('standing_stone',0,-230,63),prop('rock',-80,-215,32),prop('rock',85,-220,36),
        ...[-1,1].flatMap(side=>[
          prop('brazier',side*85,-145,24),prop('tombstone',side*210,-40,24,side*.3),
          prop('bone_pile',side*145,90,30),prop('dead_tree',side*250,100,48),
          prop('rubble',side*170,-165,28),
        ]),prop('bone_pile',0,125,24),
      ]),
    make('still-circle','Circle of Still Hours','still_altar','tundra',
      [{field:'temperature',max:.12}],'#535b58',[
        ...[-1,1].flatMap(side=>[
          prop('standing_stone',side*215,-115,40),prop('standing_stone',side*215,115,40),
          prop('rock',side*100,-240,32),prop('snowdrift',side*225,0,55),
          prop('icicle_cluster',side*120,-195,23),
        ]),prop('weathered_statue',0,-245,60),prop('snowdrift',0,-165,40),
      ]),
  ];
}
