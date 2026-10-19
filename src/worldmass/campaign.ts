import { QUESTS, Q_UNDEAD_SOUTH, Q_RELIC_DEPTHS } from '../quests/defs';
import { Q_RELIQUARY } from '../quests/reliquary';
import { revengeCullId, revengeCommanderId, oracleCommanderId } from '../quests/revenge';
import { TUTORIAL_FACTIONS } from '../data/commanders';
import { BRANDT_HAMMER_QUEST, BRANDT_TROPHY_QUEST } from '../data/brandt';
import { OBJECTIVE_REWARD } from '../data/objectiveRewards';
import { nativeMassSite, MASS_CACHE_OPENING } from './sites';
import type { MassContent } from './preset';
import type { MassJourneyExtension } from './journey';
import type { MassQuestBinding } from './quests';

/** Native campaign deeds on continuous ground. The original quest owns its
 * gates, inventory and rewards; original defenders own the place's completion. */
export function campaignPlaces(): { content: MassContent[]; extensions: MassJourneyExtension[]; bindings: MassQuestBinding[] } {
  const content: MassContent[]=[], extensions: MassJourneyExtension[]=[], bindings: MassQuestBinding[]=[];
  const add=(id:string, quests:string[], from:string, x:number, y:number, name:string, native='pillaged_township')=>{
    const q=QUESTS[quests[0]], zone=q.zone, objective=zone.objective;
    if(objective.kind!=='boss' && objective.kind!=='clear')throw Error('Unsupported campaign ground: '+q.id);
    const level=typeof zone.level==='number'?zone.level:q.offerAtLevel;
    const site=nativeMassSite(native,name,{x:0,y:130,holdSeconds:5,...MASS_CACHE_OPENING});
    site.source='quests/'+q.id; site.completion={source:'objectives/clear',...OBJECTIVE_REWARD};
    for(const side of [-1,1])for(const at of [-240,0,240])site.doodads.push({
      kind:native==='wayside_camp'?'brazier':'tombstone',pos:{x:side*290,y:at},radius:22,rot:0});
    const boss=objective.kind==='boss'?site.fixtures.length:undefined;
    if(objective.kind==='boss')site.fixtures.push({monster:objective.id,x:0,y:-120,garrison:true,level:level+(objective.levelBonus??0)});
    const packs=zone.packsOverride;
    const count=packs?Math.round((packs.count[0]+packs.count[1])*(packs.size[0]+packs.size[1])/4):8;
    content.push({id,source:site.source,level,count,table:packs?.table??[{id:'skeleton_warrior',weight:1}],site});
    extensions.push({id,from,content:id,offset:{x,y},radius:460,jitter:.03});
    for(const quest of quests)bindings.push({quest,destination:id,...(boss===undefined?{}:{defeat:{kind:'fixture' as const,index:boss}})});
  };
  add('campaign-graveyard',[Q_UNDEAD_SOUTH.id],'south-ruin',-600,1800,'The Rising Dead');
  add('campaign-forge',[BRANDT_HAMMER_QUEST,BRANDT_TROPHY_QUEST],'east-paired-stones',2600,-1800,'The Cold Cinder Forge','wayside_camp');
  add('campaign-chapel',[Q_RELIQUARY.id],'campaign-graveyard',1800,1800,'The Unremembered Chapel');
  add('campaign-depths',[Q_RELIC_DEPTHS.id],'campaign-chapel',1800,1800,'The Guarded Reliquary');
  const roads: Record<string,[string,number,number,number,number]>={
    goblin:['east-paired-stones',4400,-500,4000,0], undead:['campaign-graveyard',-900,4000,0,4000],
    beastkin:['west-camp',-4200,-2000,-4000,0], demon:['north-stoneward',2000,-4000,0,-4000],
    carven:['east-paired-stones',4000,2500,4000,0], chitin:['south-ruin',4000,4000,0,4000],
    gnoll:['west-camp',-4200,2500,-4000,0],
  };
  for(const faction of TUTORIAL_FACTIONS){
    const [from,x,y,dx,dy]=roads[faction.id], cull='campaign-road-'+faction.id;
    add(cull,[revengeCullId(faction.id)],from,x,y,faction.banner+' — The Old Road','wayside_camp');
    add('campaign-command-'+faction.id,[revengeCommanderId(faction.id),oracleCommanderId(faction.id)],
      cull,dx,dy,faction.banner+' — Command Camp','wayside_camp');
  }
  return {content,extensions,bindings};
}
