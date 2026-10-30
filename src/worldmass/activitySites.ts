import { SHRINES } from '../data/shrines';
import { PUZZLES } from '../data/puzzles';
import { nativeMassShrine } from './shrines';
import { nativeMassPuzzle } from './puzzles';
import type { MassPlaceRecipe } from './contracts';
import type { MassSiteSpec } from './sites';

/** Native optional activities can recur throughout the country. Each physical
 * owner has independent native progress and a once-only reward/consumption. */
export function countryActivitySites(): {id:string;recipe:MassPlaceRecipe;site:MassSiteSpec}[] {
  const recipe=(id:string):MassPlaceRecipe=>({id,version:1,content:id,period:5400,chance:.42,
    radius:360,jitter:.65,priority:7,when:[{field:'elevation',min:0}],surface:{region:'ground',color:'#454536'}});
  const border=(kind:string)=>[-1,1].flatMap(side=>[
    {kind,pos:{x:side*260,y:-170},radius:35},{kind,pos:{x:side*260,y:170},radius:35},
  ]);
  const shrines=SHRINES.map(s=>{const id='country-shrine-'+s.id;return {id,recipe:recipe(id),site:{
    name:s.name,source:'shrines/'+s.id,fixtures:[],doodads:border('standing_stone'),
    shrines:[nativeMassShrine(s.id,0,0)]} satisfies MassSiteSpec};});
  const puzzleRows:[string,string,number|undefined][]=[
    ['charged_lattice','Strike toggles a crystal + neighbours. Kindle all nine.',undefined],
    ['ember_ring','Strike every coal before the flames gutter. Broad attacks can kindle several.',6],
    ['twin_accord','Ring both crystals of a matching colour before their light fades. Bound pairs stay lit.',4],
  ];
  const puzzles=puzzleRows.map(([key,instruction,count])=>{const id='country-puzzle-'+key;return {id,recipe:recipe(id),site:{
    name:PUZZLES[key].label ?? key,source:'puzzles/'+key,fixtures:[],doodads:border('weathered_statue'),
    puzzles:[nativeMassPuzzle(key,0,0,instruction,count)]} satisfies MassSiteSpec};});
  return [...shrines,...puzzles];
}
