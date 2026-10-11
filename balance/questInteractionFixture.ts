/** Explicit test publication and movement boundaries; production owners are actual instances. */
import {makeSimWorld} from '../src/sim/arena';
import {newQuestLedger} from '../src/engine/questLedger';
import {NativeAreaActorAuthority} from '../src/worldmass/nativeAreaActorAuthority';
import {NativeAreaSceneQuests,freshSceneQuestState,type NativeSceneQuestRewardRuntime} from '../src/worldmass/nativeAreaSceneQuests';
import {freshAssemblyInput,NativeAreaSceneAssembly} from './nativeFreshAssemblyFixture';
import {CLASSES} from '../src/data/classes';
import {NullInput} from '../src/net/intent';
export function fixture(hosted=false){
 const w:any=makeSimWorld('warrior',5513);window.localStorage.clear();w.questSeat=null;w.ownQuestLedger=newQuestLedger();w.ledger={};w.account.ledger={};w.accountDirty=false;w.player.level=80;w.meta.xp=0;w.meta.xpNeeded=1e12;
 const input:any=freshAssemblyInput(w,w.zone),campaign:any=input.campaign;
 for(const key of [...Object.keys(campaign),'ownQuestLedger','questLedgerOverride','questSeat','seatNoteAt','accountDirty','actingSeat','odyssey']){
  if(typeof w[key]==='function')continue;
  if(key==='massRuntime'||key==='nativeResidentHistory')continue;
  Object.defineProperty(campaign,key,{configurable:true,enumerable:true,get(){return w[key];},set(v){w[key]=v;}});
 }
 for(const key of ['notice','markMetaDirty','sameParty','seatHero','seatHudOf','seatOf','questLedgerOf','forechartSounding','invalidateZonesSaveMemo','presentWorlds','keeperCampaign','odysseyLeads'])campaign[key]=(...args:any[])=>w[key](...args);
 const rebuilds:any[]=[],notices:any[]=[];const nativeNotice=w.notice.bind(w);w.notice=(...args:any[])=>{notices.push(args);return nativeNotice(...args);};
 const recalc=w.recalcSeat.bind(w),resync=w.resyncMercenary.bind(w);w.recalcSeat=(seat:any)=>{rebuilds.push(['recalc',seat.id]);return recalc(seat);};w.resyncMercenary=(seat:any,hero:any)=>{rebuilds.push(['resync',seat.id,hero?.id]);return resync(seat,hero);};
 input.services.objectiveProgression={recalcSeat:(seat:any)=>w.recalcSeat(seat),resyncMercenary:(seat:any,hero:any)=>w.resyncMercenary(seat,hero)};
 let quest:any;input.services.objectiveQuests={questLedgerOf:campaign.questLedgerOf,onQuestZoneFieldCleared:(...a:any[])=>quest.onQuestZoneFieldCleared(...a)};
 const area=new NativeAreaSceneAssembly(input),scene=area.input.scene,geometry=area.input.geometry,physical=area.input.physical;
 // Publish the tested native area into the existing writer for this course;
 // this preserves native writer identity and actual serialization algorithms.
 w.actors=scene.actors;for(const [name,get,set] of [
  ['drops',()=>physical.input.state.drops,(v:any)=>physical.input.state.drops=v],
  ['flashes',()=>geometry.flashes,(v:any)=>geometry.flashes=v],
  ['texts',()=>area.objectiveController.input.state.texts,(v:any)=>area.objectiveController.input.state.texts=v]
 ] as const)Object.defineProperty(w,name,{configurable:true,get,set});
 w.clampPos=geometry.clampPos.bind(geometry);
 const interaction=geometry;
 const authority=new NativeAreaActorAuthority<NativeSceneQuestRewardRuntime>(campaign),binding=authority.register(scene,{loot:area.lootController,objective:area.objectiveController});authority.claim(binding,scene.actors);area.scenePresence.activate(authority);
 const args:any={authority,scene,geometry,population:area.input.population,physical,loot:area.lootController,bounty:area.input.bounty,graph:area.graph,coast:area.input.coast,
  runtimeBirth:area.input.registry.input.birth,campaign,state:freshSceneQuestState(),scenePresence:area.scenePresence,objective:area.objectiveController,
  progression:input.services.objectiveProgression,interaction,characterWriter:w};
 const owner=new NativeAreaSceneQuests(args);w.characterWriter=w;
 quest=owner;if(hosted)w.localSeat.keeper={reviveSec:3};const host=owner.host;
 const journal=(s=w.localSeat)=>w.questLedgerOf(s);
 return {w,area,scene,geometry,physical,campaign,owner,quest,host,authority,binding,rebuilds,notices,journal,
  seat(id:string,x=0,y=0){const s=w.addSeat(id,CLASSES.find(c=>c.id==='warrior')!,new NullInput(),{startingCompanions:false,startingFlasks:false});s.actor.pos={x:w.player.pos.x+x,y:w.player.pos.y+y};s.actor.level=80;s.meta.xp=0;s.meta.xpNeeded=1e12;authority.claim(binding,[s.actor]);return s;},
  giver(q:any){for(const id of new Set<string>((Array.isArray(q.turnIn?.giver??q.giver)?q.turnIn?.giver??q.giver:[q.turnIn?.giver??q.giver]).filter(Boolean))){const a=area.input.population.createMonster(id,1,'player');a.pos={x:w.player.pos.x+20,y:w.player.pos.y};scene.actors.push(a);authority.claim(binding,[a]);}},
  add(q:any,seat=w.localSeat){const row={questId:q.id,zoneId:scene.zone.id,fieldDone:false};journal(seat).active.push(row);return row;},
 };
}
