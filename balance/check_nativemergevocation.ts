/** W12 calling offers belong to one physically admitted traveller and area visit. */
import assert from 'node:assert/strict';
import {fixture} from './questInteractionFixture';
import {freshAssemblyInput,NativeAreaSceneAssembly} from './nativeFreshAssemblyFixture';
import {NativeAreaSceneQuests,freshSceneQuestState} from '../src/worldmass/nativeAreaSceneQuests';
import {NativeAreaSceneQuestInteraction,freshSceneQuestInteractionState} from '../src/worldmass/nativeAreaSceneQuestInteraction';
import {QUESTS} from '../src/quests/defs';
import {newOdyssey} from '../src/world/odyssey';
import type {Actor} from '../src/engine/actor';
type F=ReturnType<typeof fixture>;
function interaction(f:F,quests=f.owner){
 const campaign=f.campaign;
 for(const key of ['journalDirty','netJournal'])Object.defineProperty(campaign,key,{configurable:true,get:()=>f.w[key],set:v=>{f.w[key]=v;}});
 for(const key of ['heroKnown','bagItem'])campaign[key]=(...a:unknown[])=>f.w[key](...a);
 return new NativeAreaSceneQuestInteraction({quests,campaign,state:freshSceneQuestInteractionState()});
}
function neighboring(f:F){
 const area=new NativeAreaSceneAssembly(freshAssemblyInput(f.w,f.w.zone,f.campaign)),scene=area.input.scene;
 scene.actors.splice(0);const binding=f.authority.register(scene,{loot:area.lootController,objective:area.objectiveController});f.authority.claim(binding,[]);area.scenePresence.activate(f.authority);
 const q=new NativeAreaSceneQuests({...f.owner.input,scene,geometry:area.input.geometry,population:area.input.population,physical:area.input.physical,loot:area.lootController,bounty:area.input.bounty,graph:area.graph,coast:area.input.coast,runtimeBirth:area.input.registry.input.birth,state:freshSceneQuestState(),scenePresence:area.scenePresence,objective:area.objectiveController,interaction:area.input.geometry});
 return {area,scene,binding,q,interaction:interaction(f,q)};
}
function transfer(f:F,actor:Actor,from:F['binding'],to:F['binding']){to.scene.actors.push(actor);f.authority.transfer(actor,from,to);const index=from.scene.actors.indexOf(actor);assert(index>=0);from.scene.actors.splice(index,1);}
const f=fixture(true),i=interaction(f),other=neighboring(f);
f.w.time=20;f.w.localSeat.lastActedAt=0;f.w.account.ledger.odyssey_stage_1=1;f.w.odyssey.state=newOdyssey(f.w.manifest.seed,f.w.account.ledger);f.giver({giver:'townsfolk_questgiver'});
const a=f.seat('calling-a'),b=f.seat('calling-b');a.lastActedAt=b.lastActedAt=0;
for(const seat of [a,b])for(const quest of Object.values(QUESTS))if(!quest.vocation)f.journal(seat).completed.add(quest.id);
const offers=f.owner.withQuestHand(a,()=>i.vocationMenuOffers());assert(offers.length,'real native calling cards are available');
assert.equal(i.vocationAskOf(a),undefined);i.questGiverStep(a,.91);assert.equal(i.vocationAskOf(a),20,'the actual dwell asks this traveller');
assert.equal(i.vocationAskOf(b),undefined,'the neighboring traveller has no borrowed ask');assert.equal(other.interaction.vocationAskOf(a),undefined,'matching coordinates in another area grant no ask');
f.w.time=21;i.questGiverStep(b,.91);assert.equal(i.vocationAskOf(b),21);
i.questGiverStep(a,1);assert.equal(i.vocationAskOf(a),20,'a standing visit does not repeatedly ask');
a.lastActedAt=f.w.time;i.questGiverStep(a,.1);assert.equal(i.vocationAskOf(a),undefined,'movement breaks the real visit');assert.equal(i.vocationAskOf(b),21,'another traveller keeps its own ask');
a.lastActedAt=0;f.w.time=22;i.questGiverStep(a,.91);assert.equal(i.vocationAskOf(a),22);
transfer(f,a.actor,f.binding,other.binding);assert.equal(i.vocationAskOf(a),undefined,'departed body loses the old area ask immediately');
transfer(f,a.actor,other.binding,f.binding);assert.equal(i.vocationAskOf(a),undefined,'unobserved A-B-A return cannot reuse an old visit');
i.questGiverStep(a,.2);assert.equal(i.vocationAskOf(a),undefined);assert.equal(i.input.state.questGiverDwells.get(a),.2,'return starts a new actual dwell');
i.questGiverStep(a,.71);assert.equal(i.vocationAskOf(a),22);
const rogue=f.area.input.population.createMonster('townsfolk_questgiver',1,'player');f.scene.actors.push(rogue);
const prior=i.input.state.vocationAsks.get(a);assert.throws(()=>i.vocationAskOf(a),/admission|claim|census|authority/i);assert.throws(()=>i.questGiverStep(a,.1),/admission|claim|census|authority/i);assert.equal(i.input.state.vocationAsks.get(a),prior,'failed physical proof cannot mutate a standing ask');f.scene.actors.splice(f.scene.actors.indexOf(rogue),1);
const selected=offers[0].questId;assert.equal(i.acceptVocationQuest(selected,a),true);assert(f.journal(a).active.some((q:{questId:string})=>q.questId===selected));assert(!f.journal(b).active.some((q:{questId:string})=>q.questId===selected),'acceptance writes only the actual hand');
console.log('PASS retained calling offers: real dwell, independent hands, movement, area transfer/return, physical refusal and exact quest ownership');
