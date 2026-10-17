import { nativeMassSite, MASS_CACHE_OPENING, type MassSiteSpec } from './sites';
import { OBJECTIVE_REWARD } from '../data/objectiveRewards';

interface CountryOutpost {
  id: string; roster: 'downs' | 'undead'; count: number; levelOffset?: number; site: MassSiteSpec;
}
/** Repeated settlements share the native landmark clearance/cache contract.
 * Their existing geography and original guard identities remain authoritative. */
export function countryOutposts(): CountryOutpost[] {
  const make=(id:string,native:string,name:string,roster:CountryOutpost['roster'],count:number,
    cache:NonNullable<MassSiteSpec['cache']>,levelOffset?:number):CountryOutpost=>{
    const site=nativeMassSite(native,name,{...cache,...MASS_CACHE_OPENING});
    site.completion={source:'objectives/clear',...OBJECTIVE_REWARD};
    return {id,roster,count,site,...(levelOffset===undefined?{}:{levelOffset})};
  };
  return [
    make('wayside-camp','wayside_camp','Wayside Camp','downs',2,{x:0,y:66,holdSeconds:4}),
    make('pillaged-ruin','pillaged_township','Pillaged Ruin','undead',4,{x:60,y:80,holdSeconds:5},1),
  ];
}
