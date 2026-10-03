import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { townStationFeatures } from '../src/data/townBuild';
import { FEATURE } from '../src/meta/account';
import { QUESTS, Q_UNDEAD_SOUTH } from '../src/quests/defs';
import { MONSTERS } from '../src/data/monsters';
import { ODYSSEY_CFG } from '../src/data/odyssey';
import { BRANDT_HAMMER_QUEST } from '../src/data/brandt';
import type { QuestDef } from '../src/quests/types';
import type { World } from '../src/engine/world';
import { serializeCharacter } from '../src/meta/character';
import { canonical } from '../src/worldmass/random';
import { massAdventure } from '../src/worldmass/preset';
import { WorldMassRuntime } from '../src/worldmass/runtime';

type Hooks={acceptableQuests():QuestDef[];updateQuestGiver(dt:number):void;acceptQuest(q:QuestDef):void};
const hooks=(w:World)=>w as unknown as Hooks;
const prepare=(mass:boolean)=>{
 const w=makeSimWorld('warrior',73912);
 for(const flag of townStationFeatures())w.account.features.add(flag);
 w.account.features.add(FEATURE.BRANDT_MAGIC_WARES);
 if(mass){
  const config=JSON.parse(canonical(massAdventure()));delete config.settlement.quests;
  new WorldMassRuntime(941,'legacy-unbound-work',config).attach(w);
 }else w.loadZone('lastlight');
 w.player.level=100;w.player.invulnerable=true;
 return w;
};
const stand=(w:World,id:string)=>{
 const actor=w.actors.find(a=>a.defId===id&&!a.dead);assert.ok(actor,id);
 w.player.pos={...actor.pos};w.player.tier=actor.tier;
};
const factionKills=(w:World)=>{
 const state=w.odyssey.state!;
 const def=Object.values(MONSTERS).find(d=>d.faction&&state.roster.includes(d.faction));assert.ok(def);
 for(let i=0;i<ODYSSEY_CFG.leadsFromKills;i++){
  const a=w.createMonster(def.id,1,'enemy');a.pos={...w.player.pos};w.actors.push(a);
  w.kill(a,false,w.player);assert.ok(a.dead,'ordinary native kill still resolves');
 }
 return def.faction!;
};
const restore=seedGlobalRandom(73912);
try{
 const native=prepare(false);
 assert.ok(native.graphWorkAvailable());stand(native,'townsfolk_smith');
 assert.ok(hooks(native).acceptableQuests().some(q=>q.id===BRANDT_HAMMER_QUEST));
 hooks(native).updateQuestGiver(4);
 assert.ok(native.activeQuests.some(q=>q.questId===BRANDT_HAMMER_QUEST));
 native.armBountyBoard();assert.ok(native.bountyOffers.length,'ordinary board still deals real work');
 const offers=structuredClone(native.bountyOffers);
 native.odyssey.restore(undefined);
 const faction=factionKills(native);
 assert.equal(native.odyssey.state!.kills[faction],ODYSSEY_CFG.leadsFromKills);
 assert.ok(native.odyssey.state!.leads.includes(faction));
 assert.ok(native.notices.some(n=>n.text.includes('Bearings on your map')));
 console.log('PASS ordinary native faction kills still discover campaign leads');
 console.log('PASS ordinary Brandt offer, dwell acceptance, destination and bounty slate');

 const w=prepare(true);assert.equal(w.graphWorkAvailable(),false);
 const zones=Object.keys(w.zoneMap),ledger=canonical(w.ledger);
 for(const id of new Set(Object.values(QUESTS).flatMap(q=>Array.isArray(q.giver)?q.giver:[q.giver]))){
  if(!w.actors.some(a=>a.defId===id&&!a.dead))continue;
  stand(w,id);assert.deepEqual(hooks(w).acceptableQuests(),[]);
  hooks(w).updateQuestGiver(4);
 }
 hooks(w).acceptQuest(Q_UNDEAD_SOUTH);
 w.enrollOdysseyQuest(QUESTS[BRANDT_HAMMER_QUEST],true);
 assert.equal(w.activeQuests.length,0);assert.deepEqual(Object.keys(w.zoneMap),zones);
 assert.equal(canonical(w.ledger),ledger);
 stand(w,'townsfolk_smith');assert.equal(w.questGiverPrompt(),'No hunts are posted for this country yet.');
 w.odyssey.restore(undefined);const oldLeads=canonical(w.odyssey.snapshot());
 stand(w,'townsfolk_questgiver');hooks(w).updateQuestGiver(4);
 assert.equal(canonical(w.odyssey.snapshot()),oldLeads,'dwell cannot reveal unreachable campaign leads');
 const notices=w.notices.length;
 factionKills(w);w.odyssey.reveal(w.odyssey.state!.roster[0]);w.odyssey.localLeads();w.odyssey.update();
 assert.equal(w.odyssey.hasLocalLeads(),false);
 assert.equal(canonical(w.odyssey.snapshot()),oldLeads,'all campaign admission paths retain dormant state');
 assert.ok(!w.notices.slice(notices).some(n=>n.text.includes('Bearings on your map')));
 console.log('PASS native country deaths resolve without advancing dormant graph campaigns or advertising absent destinations');
 console.log('PASS all present givers, stale direct acceptance, enrollment and leads cannot mint unreachable graph quests');

 w.bountyOffers=structuredClone(offers);
 const oldSlate=canonical(w.bountyOffers),beforeZones=Object.keys(w.zoneMap);
 w.armBountyBoard();assert.equal(canonical(w.bountyOffers),oldSlate);
 assert.equal(w.acceptBounty(offers[0].id),false);
 assert.deepEqual(w.bountyHands,[]);assert.equal(w.activeQuests.length,0);
 assert.deepEqual(Object.keys(w.zoneMap),beforeZones);
 assert.deepEqual(w.bountyBoardView().offers,[]);
 assert.equal(w.bountyBoardView().unavailable,'No hunts are posted for this country yet.');
 console.log('PASS stale saved bounty offers stay intact but cannot be advertised or accepted');

 // Historical unfinished work is retained honestly; completed deeds can still pay.
 const target='quest_'+Q_UNDEAD_SOUTH.id;
 w.zoneMap[target]={...native.zoneMap['quest_'+BRANDT_HAMMER_QUEST],id:target,name:'Old crypt'};
 const row={questId:Q_UNDEAD_SOUTH.id,zoneId:target,fieldDone:false};
 w.activeQuests.push(row);
 assert.equal(w.questLog().active[0].target,'Destination unavailable in this expedition');
 row.fieldDone=true;
 stand(w,'townsfolk_questgiver');
 assert.match(w.questGiverPrompt()!,/yours to claim/);
 hooks(w).updateQuestGiver(4);
 assert.ok(w.completedQuests.has(row.questId));assert.equal(w.ledger.undead_south_cleared,1);
 hooks(w).updateQuestGiver(4);assert.equal(w.ledger.undead_south_cleared,1);
 assert.equal(w.activeQuests.length,0);
 console.log('PASS old journal entries explain absent geography; already earned turn-in pays exactly once');

 const save=serializeCharacter(w),resumed=prepare(false);
 Object.assign(resumed.account,w.account);
 assert.ok(resumed.adoptWorldState(save.world));
 resumed.startWorldMass(941,save.world!.worldmass!);
 assert.equal(resumed.graphWorkAvailable(),false);
 assert.equal(canonical(resumed.bountyOffers),oldSlate);
 assert.equal(resumed.acceptBounty(offers[0].id),false);
 assert.deepEqual(hooks(resumed).acceptableQuests(),[]);
 assert.ok(resumed.completedQuests.has(Q_UNDEAD_SOUTH.id));
 const continuedCampaign=canonical(resumed.odyssey.snapshot());factionKills(resumed);
 assert.equal(canonical(resumed.odyssey.snapshot()),continuedCampaign);
 assert.equal(continuedCampaign,canonical(w.odyssey.snapshot()));
 console.log('PASS browser-state adoption retains work and rewards without reopening inaccessible travel');
}finally{restore();}
