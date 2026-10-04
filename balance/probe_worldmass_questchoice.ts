import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import type { World } from '../src/engine/world';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { Q_FRONTIER_WATCH as q, Q_FRONTIER_STONEWARD as next } from '../src/quests/frontier';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { validateMassQuests, massQuestDestination, massQuestPins } from '../src/worldmass/quests';
import { canonical } from '../src/worldmass/random';
import { questOfferHtml } from '../src/ui/questOffers';

type Hooks={updateQuestGiver(dt:number):void;questGiverDwell:number};
const dwell=(w:World)=>(w as unknown as Hooks).updateQuestGiver(4);
const stand=(w:World,id='townsfolk_innkeep')=>{
 const a=w.actors.find(a=>a.defId===id&&!a.dead)!;assert.ok(a);w.player.pos={...a.pos};w.player.tier=a.tier;return a;
};
const fresh=(legacy=false)=>{
 const w=makeSimWorld('magician',42),config=structuredClone(massAdventure()) as MassAdventure;
 delete config.journey!.reservePopulation;delete config.settlement!.structurePlans;delete config.rewards!.earnFrom; // isolate the schema-five acceptance owner
 if(legacy)delete config.settlement!.quests!.acceptance;
 new WorldMassRuntime(42,'choice-test',config).attach(w);stand(w);w.player.invulnerable=true;return w;
};
const resume=(w:World)=>{
 const s=serializeCharacter(w),r=makeSimWorld('magician',43);
 assert.ok(applySavedCharacter(r,s));assert.ok(r.adoptWorldState(s.world));
 r.startWorldMass(s.world!.worldmass!.state.run.seed,s.world!.worldmass);return r;
};
const state=(w:World)=>canonical({world:w.massRuntime!.state.snapshot(),quests:w.activeQuests,ledger:w.ledger,
 xp:w.meta.xp,items:w.meta.items,zones:Object.keys(w.zoneMap),bodies:w.actors.map(a=>a.id)});
const restore=seedGlobalRandom(96042);
try{
 const w=fresh(),before=state(w);
 for(let i=0;i<6;i++)dwell(w);
 assert.equal(w.activeQuests.length,0);assert.equal((w as unknown as Hooks).questGiverDwell,0);
 const offers=w.questOfferChoices();assert.equal(offers.length,1);
 assert.equal(offers[0].questId,q.id);assert.match(offers[0].target,/Cinderwatch Camp.*west/);
 assert.equal(offers[0].xp,q.reward.xp);assert.equal(offers[0].rewards.length,3);
 assert.match(w.questGiverPrompt()!,/Journal/);assert.equal(massQuestPins(w).length,0);
 assert.match(questOfferHtml(w),/Accept contract/);assert.equal(state(w),before);
 const waiting=resume(w);assert.deepEqual(waiting.questOfferChoices(),offers);dwell(waiting);
 assert.equal(waiting.activeQuests.length,0,'an unaccepted offer stays optional on Continue');
 assert.equal(waiting.massRuntime!.snapshot(waiting).schema,5);
 console.log('PASS six native dwells and repeated pure reads never enroll work, reveal map ground or pay rewards; pending choice survives Continue');

 assert.equal(w.acceptQuestOffer(next.id),false,'gates are native');
 assert.equal(w.acceptQuestOffer('unknown'),false);
 assert.equal(w.acceptQuestOffer(q.id,{...w.localSeat,id:'guest'}),false);
 stand(w,'townsfolk_smith');assert.equal(w.questOfferChoices().length,0);assert.equal(w.acceptQuestOffer(q.id),false);
 stand(w);w.player.dead=true;assert.equal(w.acceptQuestOffer(q.id),false);w.player.dead=false;
 w.player.downed=true;assert.equal(w.acceptQuestOffer(q.id),false);w.player.downed=false;
 let forwarded=0;w.clientActionHook=()=>{forwarded++;};
 assert.deepEqual(w.questOfferChoices(),[]);w.requestMeta({t:'questAccept',questId:q.id});
 assert.equal(forwarded,1);assert.equal(w.activeQuests.length,0);w.clientActionHook=undefined;
 w.applyAction(w.localSeat,{t:'questAccept',questId:3} as never);assert.equal(w.activeQuests.length,0);
 w.applyAction({...w.localSeat,id:'guest'},{t:'questAccept',questId:q.id});assert.equal(w.activeQuests.length,0);
 // The native reach test must reject an intervening solid, even inside the radius.
 const keeper=stand(w),pos={...keeper.pos};
 w.player.pos={x:pos.x-90,y:pos.y};
 const doodad={kind:'rock' as const,pos:{x:pos.x-45,y:pos.y},radius:40,rot:0};
 w.doodads.push(doodad);w.markDoodadsChanged();
 assert.equal(w.acceptQuestOffer(q.id),false,'wall-separated journal cannot authorize a contract');
 w.doodads.pop();w.markDoodadsChanged();stand(w);
 const terms=q.offerLabel;q.offerLabel='<img src=x onerror=alert(1)>';
 assert.ok(questOfferHtml(w).includes('&lt;img'));assert.ok(!questOfferHtml(w).includes('<img'));q.offerLabel=terms;
 w.requestMeta({t:'questAccept',questId:q.id});assert.equal(w.activeQuests.length,1);
 assert.equal(w.activeQuests[0].placeId,massQuestDestination(w.massRuntime!,q.id)!.id);
 assert.equal(w.ledger.quests_accepted,1);assert.equal(w.acceptQuestOffer(q.id),false);
 assert.deepEqual(w.questOfferChoices(),[]);assert.equal(massQuestPins(w).length,1);
 const accepted=resume(w);assert.deepEqual(accepted.activeQuests,w.activeQuests);
 console.log('PASS native eligibility/reach, wall, life, seat, client and payload gates; actual intent enrolls once, pins the exact place and survives Continue; mod text is escaped');

 const old=fresh(true);assert.equal(old.massRuntime!.snapshot(old).schema,4);
 assert.equal(old.questOfferChoices().length,0);assert.equal(old.acceptQuestOffer(q.id),false);
 const oldAgain=resume(old);dwell(oldAgain);assert.equal(oldAgain.activeQuests.length,1,'legacy dwell semantics remain');
 const saved=waiting.massRuntime!.snapshot(waiting);
 assert.throws(()=>new WorldMassRuntime(42,'downgrade',saved.config,{...saved,schema:4}),/checkpoint/);
 const bad=structuredClone(massAdventure()) as MassAdventure;
 (bad.settlement!.quests! as unknown as {acceptance:string}).acceptance='anything';
 assert.throws(()=>validateMassQuests(bad),/acceptance/);
 const ordinary=makeSimWorld('magician',44);ordinary.loadZone('lastlight');stand(ordinary);
 assert.deepEqual(ordinary.questOfferChoices(),[]);assert.equal(ordinary.acceptQuestOffer(q.id),false);
 assert.equal(questOfferHtml(ordinary),'');
 console.log('PASS prior policy remains native dwell on Continue, unknown/downgraded policies refuse, ordinary zones gain no experimental offer');

 // Completing an optional destination before taking its contract remains valid.
 const prior=fresh(),mass=prior.massRuntime!,place=massQuestDestination(mass,q.id)!;
 prior.landPartyAt(mass.journey!.local(place));mass.update(prior,true);
 const bodies=(mass as unknown as {natives:Map<string,typeof prior.player>}).natives;
 const ids=Array.from({length:mass.config.content.find(c=>c.id===place.content)!.count},(_,i)=>canonical([place.id,i]));
 for(const id of ids)prior.kill(bodies.get(id)!,false,prior.player);
 mass.update(prior,true);assert.equal(mass.siteCleared(place.id),true);assert.equal(prior.activeQuests.length,0);
 stand(prior);assert.ok(prior.acceptQuestOffer(q.id));mass.update(prior,true);
 assert.equal(prior.questStanding(prior.activeQuests[0]),'ready');
 assert.equal(prior.questRewardOffers().length,1);assert.ok(prior.claimQuestReward(q.id,'spring'));
 assert.ok(prior.completedQuests.has(q.id));assert.equal(prior.acceptQuestOffer(q.id),false);
 console.log('PASS free exploration before enrollment earns native retrospective completion and exactly one original return reward');
}finally{restore();}
