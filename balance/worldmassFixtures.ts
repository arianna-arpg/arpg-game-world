import { openingPopulation } from '../src/worldmass/population';
import type { MassAdventure } from '../src/worldmass/preset';

/** Build the historical finite-owner policy deliberately, without deleting
 * assertions or letting today's repeated activity recipes leak into old saves.
 * Call only on mutable fixture clones whose schema predates streaming owners. */
/** Historical fixtures keep the old mixed slots and spacing explicitly. */
export function beforeWildernessPaths(config:MassAdventure):MassAdventure {
 delete config.wildernessPaths;if(config.journey)delete config.journey.nearbyReservations;
 if(config.dormancy?.source==='worldmass/native-dormancy-v2')config.dormancy={source:'worldmass/native-dormancy-v1',wakeRadius:1600,sleepRadius:2400,quietSeconds:12};
 const ambientIds=new Set(config.content.filter(c=>c.ambientPack).map(c=>c.id));
 for(const c of config.content)if(c.ambientPack){
   delete c.ambientPack;if(c.levels)c.levels=c.levels.map(row=>({...row,...openingPopulation(row.level,row.table)}));
 }
 config.terrain.places=config.terrain.places.map(p=>ambientIds.has(p.content)?{...p,period:1100,chance:.7,radius:180,jitter:.7}:p);
 return config;
}
export function beforeMassStreaming(config:MassAdventure):MassAdventure {
 beforeWildernessPaths(config);
 const nativeRegionalContent=new Set(config.terrain.nativeRegional?.sources.map(s=>'nativeRegional/'+s.id)??[]);
 config.content=config.content.filter(c=>!nativeRegionalContent.has(c.id));
 const regionalDiscoveries=new Set(config.terrain.regionalDiscoveries?.choices.map(c=>c.content)??[]);
 config.content=config.content.filter(c=>!regionalDiscoveries.has(c.id));
 delete config.terrain.regionalDiscoveries;delete config.terrain.nativeRegional;
 delete config.terrain.landforms; // landform composition did not exist in these historical schemas
 const finite=new Set([...(config.journey?.destinations??[]),...(config.journey?.extensions??[]),
  ...(config.journey?.stops??[])].map(p=>p.content));
 const repeated=new Set(config.terrain.places.filter(p=>{
  const site=config.content.find(c=>c.id===p.content)?.site;
  return !!(site?.shrines?.length||site?.puzzles?.length);
 }).map(p=>p.content));
 config.terrain.places=config.terrain.places.filter(p=>!repeated.has(p.content));
 config.content=config.content.filter(c=>!repeated.has(c.id)||finite.has(c.id));
 delete config.nativeCountry;delete config.geography;delete config.dormancy;delete config.shrineResidency;delete config.puzzleResidency;
 return config;
}
