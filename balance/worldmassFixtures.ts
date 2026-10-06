import type { MassAdventure } from '../src/worldmass/preset';

/** Build the historical finite-owner policy deliberately, without deleting
 * assertions or letting today's repeated activity recipes leak into old saves.
 * Call only on mutable fixture clones whose schema predates streaming owners. */
export function beforeMassStreaming(config:MassAdventure):MassAdventure {
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
