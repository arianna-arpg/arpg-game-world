/** Arrival-only retained town reconciliation. The native fold/layout own geometry; exact born bodies and gameplay owners survive. */
import type {World} from '../engine/world';
import type {Actor} from '../engine/actor';
import type {NativeAreaSceneAssembly} from './nativeAreaSceneAssembly';
import {NativeAreaActorAuthority} from './nativeAreaActorAuthority';
import type {NativeAreaOngoingRuntime} from './nativeAreaSceneOngoing';
import {foldNativeTownStations} from './nativeAreaTownStations';
import {START_ZONE} from '../data/zones';
import {FEATURE,featureEnabled} from '../meta/account';
import {FIXTURE_IDS,MONSTERS} from '../data/monsters';
import {townResidentsHere} from '../data/boroughs';
import {allUnlockables,isUnlockOwned} from '../meta/unlocks';
import {makeSpeakerRow} from '../engine/speechGrammar';
import {spawnNativeFurniture,spawnNativeDoorGuards,spawnNativePlanResidents,spawnNativeFolkResidents,type NativeInhabitantHost} from '../engine/nativeInhabitants';
import {syncTrainingYard} from '../engine/trainingYard';
import {TRAINING_YARD} from '../data/trainingYard';
import type {GeneratedLayout,Doodad} from '../engine/levelgen';
const physicalSeats=NativeAreaActorAuthority.prototype.physicalSeats;
export interface NativeTownRefreshEffects {readonly createMonster:World['createMonster'];admit(body:Actor):void;retire(body:Actor):void;layoutChanged(value:boolean):void}
export function refreshNativeTownStations(assembly:NativeAreaSceneAssembly,writer:World,authority:NativeAreaActorAuthority<NativeAreaOngoingRuntime>,effects:NativeTownRefreshEffects,representative:Actor):boolean {
 const {scene,geometry,population,residents,settlement,physical,sources,campaign}=assembly.input;
 if(scene.zone.id!==START_ZONE)return false;
 // Multiplayer retention has no native single-World counterpart: never move an already admitted player's town underneath them.
 if(Reflect.apply(physicalSeats,authority,[scene]).length)return false;
 foldNativeTownStations(writer);
 if(Reflect.apply(physicalSeats,authority,[scene]).length)throw Error('Native town acquired physical occupants during account fold');
 const ledger=assembly.townBodies,changed=assembly.townLayoutSignature!==assembly.townSignature();
 ledger.pendingSafeEntry ||= writer['townLayoutChangedOnLoad']||geometry.arena.w!==scene.zone.size.w||geometry.arena.h!==scene.zone.size.h;
 effects.layoutChanged(ledger.pendingSafeEntry);
 settlement.input.state.townTierIdx=writer['townTierIdx'];
 const previousSeats=new Map(ledger.seats);
 const retire=(key:string)=>{const actor=ledger.bodies.get(key);if(actor){const index=scene.actors.indexOf(actor);if(index>=0){scene.actors.splice(index,1);effects.retire(actor);}ledger.bodies.delete(key);}};
 const previousDoors=new Map<string,{open:boolean;broken:boolean}>();
 for(const [key,seat]of ledger.seats)if(seat.kind==='door'){const d=seat.row as Doodad;if(d.door)previousDoors.set(key,{open:!!d.door.open,broken:!!d.door.broken});}
 let layout:GeneratedLayout|undefined=ledger.layout;
 if(changed){
  layout=assembly.refreshTownGeometry().layout;
  for(const key of previousSeats.keys())if(!ledger.seats.has(key))retire(key);
  // The same body retains life/status/deck state; only its authored stand follows the native newly generated seat.
  for(const [key,seat]of ledger.seats){const actor=ledger.bodies.get(key);if(!actor||!scene.actors.includes(actor))continue;actor.tier=seat.tier;actor.pos=seat.kind==='door'?{...seat.pos}:seat.tier>=1?geometry.findFreeSpot({...seat.pos},actor.radius,seat.tier):geometry.clampPos({...seat.pos},actor.radius);if(seat.kind==='door')actor.doorId=(seat.row as Doodad).door!.id;
   if(seat.kind==='plan'||seat.kind==='folk'){const row=seat.row as GeneratedLayout['npcs'][number],speech=residents.speakerRows.get(actor.id);if(speech)speech.speaker.company=row.sid??`zone:${scene.zone.id}`;}}
  for(const [key,state]of previousDoors){const seat=ledger.seats.get(key);if(seat&&seat.kind==='door'&&(state.open||state.broken)){const door=(seat.row as Doodad).door!;geometry.setDoorState(door.id,state.broken?'broken':'open',{silent:true});}}
 }
 if(layout){
  const original=residents.inhabitants(population),host=Object.create(original) as NativeInhabitantHost;
  Object.defineProperties(host,{createMonster:{get:()=>effects.createMonster},townBody:{value:(kind:Parameters<typeof ledger.record>[0],row:object|string,body:Actor)=>{effects.admit(body);ledger.record(kind,row,body);}}});
  const delta={...layout,breakables:ledger.missing(layout.breakables),npcs:ledger.missing(layout.npcs),folk:ledger.missing(layout.folk??[])};
  const doors=ledger.missing(layout.doodads.filter(d=>!!d.door));Object.defineProperty(host,'doodads',{get:()=>doors});
  spawnNativeDoorGuards(host,sources.nativeInhabitantSources,scene.zone,delta);
  spawnNativeFurniture(host,sources.nativeInhabitantSources,scene.zone,delta);
  const seatIndex=new Map<GeneratedLayout['npcs'][number],number>();let index=0;
  for(const row of layout.npcs){const arrival=MONSTERS[row.id]?.npcRequiresLedger;if(arrival&&!host.account.ledger[arrival]&&!host.ledger[arrival])continue;seatIndex.set(row,index++);}
  const company=new Set<string>();for(const [key,body]of ledger.bodies)if(key.startsWith('folk:')&&scene.actors.includes(body))company.add(body.name);
  spawnNativePlanResidents(host,sources.nativeInhabitantSources,scene.zone,delta,seatIndex);
  spawnNativeFolkResidents(host,sources.nativeInhabitantSources,scene.zone,delta,company);
 }
 const insert=(kind:'tracker'|'recruiter'|'ward',key:string,defId:string,at:{x:number;y:number},name?:string):Actor|undefined=>{
  const id=kind+':'+key,existing=ledger.bodies.get(id);if(existing){if(scene.actors.includes(existing))existing.pos=geometry.clampPos({...at},existing.radius);return existing;}
  const body=effects.createMonster(defId,1,'player');if(name!==undefined)body.name=name;body.pos=geometry.clampPos({...at},body.radius);scene.actors.push(body);effects.admit(body);ledger.record(kind,key,body);return body;
 };
 if(!featureEnabled(campaign.account,FEATURE.TRACKER))retire('tracker:tracker');
 if(!featureEnabled(campaign.account,FEATURE.MERC_RECRUITER))retire('recruiter:recruiter');
 if(featureEnabled(campaign.account,FEATURE.TRACKER))insert('tracker','tracker',FIXTURE_IDS.townsfolk_tracker,settlement.townSeat('tracker',0,34));
 if(featureEnabled(campaign.account,FEATURE.MERC_RECRUITER)){
  const prior=ledger.bodies.get('recruiter:recruiter'),officer=insert('recruiter','recruiter',FIXTURE_IDS.merc_captain,settlement.townSeat('recruiter',24,-18),'the Recruiting Officer');
  if(changed||!prior)geometry.doodads.push({pos:geometry.clampPos(settlement.townSeat('recruiter',-20,14),10),radius:9,kind:'merc_banner',rot:0});
  if(!prior&&officer)settlement.armLastlightRecruiter(officer,scene.zone.id);
 }
 const owned=(id:string)=>{const u=allUnlockables().find(x=>x.id===id);return !!u&&isUnlockOwned(campaign.account,u);};
 for(const {row,pos}of townResidentsHere(campaign.account,settlement.input.state.townTierIdx,owned)){
  const prior=ledger.bodies.get('ward:'+row.id),body=insert('ward',row.id,row.def,pos,row.name);
  if(!prior&&body)residents.speakerRows.set(body.id,makeSpeakerRow(body.id,row.line,'resident',{key:`ward:${row.id}`,company:'ward',name:row.name,roles:row.roles??['resident'],own:[row.line]}));
 }
 for(const row of TRAINING_YARD.targets){const body=ledger.bodies.get('training:'+row.id);if(body&&scene.actors.includes(body))body.pos=geometry.clampPos(settlement.townSeat(TRAINING_YARD.site,row.x,row.y),body.radius);}
 ledger.representative=representative;
 const training=ledger.trainingHost??(Object.create(physical.host) as typeof physical.host);
 if(!ledger.trainingHost)Object.defineProperties(training,{player:{get:()=>ledger.representative!},createMonster:{get:()=>effects.createMonster},townBody:{value:(kind:Parameters<typeof ledger.record>[0],row:object|string,body:Actor)=>{effects.admit(body);ledger.record(kind,row,body);}}});
 ledger.trainingHost=training;
 if(!featureEnabled(campaign.account,TRAINING_YARD.feature))for(const row of TRAINING_YARD.targets)retire('training:'+row.id);
 syncTrainingYard(training,physical.host);
 if(changed){
  const fontAt=geometry.clampPos(settlement.townSeat('font'),18),fonts=assembly.input.state.fonts;if(fonts[0])fonts[0].pos=fontAt;else fonts.push({pos:fontAt});
  geometry.waypointPos=geometry.clampPos(settlement.townSeat('waypoint'),18);campaign.discoveredWaypoints.add(scene.zone.id);
  campaign.stationArmed.clear();geometry.markDoodadsChanged();
  assembly.townLayoutSignature=assembly.townSignature();
 }
 ledger.pendingSafeEntry=false;
 return changed;
}
