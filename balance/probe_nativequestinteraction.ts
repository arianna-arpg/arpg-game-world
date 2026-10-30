import {nativeMergeQuestHistory} from './nativeMergeQuestHistoryFixture';
import {beforeNativeCampaignRaw as rawCampaign} from './nativeCampaignCompositionFixture';
import {beforeNativeContinuity as projectContinuity} from './nativeContinuityCompositionFixture';
import {beforeNativeOdysseyPressure as projectOdysseyPressure} from './nativeOdysseyPressureFixtureSource';
import {World} from '../src/engine/world';
import {makeSimWorld} from '../src/sim/arena';
import {execFileSync} from 'node:child_process';
import {beforeNativeSceneQuestInteraction,beforeNativeQuestInteractionOdyssey} from './nativeSceneQuestInteractionFixture';
import {nativeSceneQuestInteractionArchiveHash} from './nativeSceneQuestInteractionArchive';
import {Q_FRONTIER_WATCH} from '../src/quests/frontier';
import {canonical} from '../src/worldmass/random';
import {PROGRESSION} from '../src/data/classes';
import {nativeSceneQuestInteractionArchive as archive} from './nativeSceneQuestInteractionArchive';
import assert from 'node:assert/strict';
import {nativeCaravanPriorFS as fs} from './nativeCaravanCompositionFixture';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {fixture} from './questInteractionFixture';
import {freshAssemblyInput,NativeAreaSceneAssembly} from './nativeFreshAssemblyFixture';
import {NativeAreaSceneQuests,freshSceneQuestState} from '../src/worldmass/nativeAreaSceneQuests';
import {NativeAreaSceneQuestInteraction,freshSceneQuestInteractionState} from '../src/worldmass/nativeAreaSceneQuestInteraction';
import * as core from '../src/engine/nativeSceneQuestInteraction';
import {QUESTS} from '../src/quests/defs';
import {mintQuestImbue} from '../src/engine/questImbue';
import {forgeItem} from '../src/engine/itemgen';
import {charKeyFor,CHAR_SLOT} from '../src/meta/character';
import {newOdyssey} from '../src/world/odyssey';
import {Actor} from '../src/engine/actor';
import {dist,randInt} from '../src/core/math';
import {MASS_ZONE} from '../src/worldmass/preset';
import {describeItem,itemGridSize} from '../src/engine/itemgen';
import {ITEM_RARITIES} from '../src/engine/items';
import {MONSTERS} from '../src/data/monsters';
import {CLASSES} from '../src/data/classes';
import {VOCATIONS,vocationStepKey} from '../src/data/vocations';
import {npcDwellReach} from '../src/data/transit';
import {expertiseRank} from '../src/engine/crafting';
import {ITEM_AFFIXES} from '../src/data/itemaffixes';
import {QUEST_GIVER_IDS,ZONE_QUEST_GIVER_IDS} from '../src/quests/defs';
import {massQuestDestination,massQuestTarget} from '../src/worldmass/quests';
import {RELIQUARY_LESSON} from '../src/quests/reliquary';
import {imbuedItem,imbueOptions} from '../src/engine/questImbue';
import {questRewardChoices} from '../src/engine/questRewardChoices';
import {QUEST_CATEGORY_CAPS,DEFAULT_QUEST_CATEGORY} from '../src/quests/types';
import {Rng} from '../src/core/rng';
import {FEATURE} from '../src/meta/account';
import {saveCharacter} from '../src/meta/character';
import {hashStr} from '../src/engine/nativeSceneConfig';
const QUESTGIVER_RADIUS=150,QUESTGIVER_DWELL=.9,DWELL_IDLE_GRACE=.15;
const receipts:{label:string}[]=[];
function test(label:string,fn:()=>void){fn();receipts.push({label});console.log('PASS '+label);}
const inventory:{methods:string[]}={methods:archive.rows.map(r=>r.name)};
const originalMethods=archive.rows.map(r=>r.before);
const bindings={dist,randInt,MASS_ZONE,describeItem,itemGridSize,ITEM_RARITIES,MONSTERS,CLASSES,VOCATIONS,vocationStepKey,npcDwellReach,expertiseRank,ITEM_AFFIXES,QUEST_GIVER_IDS,ZONE_QUEST_GIVER_IDS,massQuestDestination,massQuestTarget,RELIQUARY_LESSON,imbuedItem,imbueOptions,questRewardChoices,QUEST_CATEGORY_CAPS,DEFAULT_QUEST_CATEGORY,Rng,FEATURE,saveCharacter,hashStr,QUESTS,QUESTGIVER_RADIUS,QUESTGIVER_DWELL,DWELL_IDLE_GRACE};
const readCourseCore=nativeMergeQuestHistory(core,bindings);
const original=new Function(...Object.keys(bindings),ts.transpileModule('class Archive{'+originalMethods.join('\n')+'}\nreturn Archive.prototype;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText)(...Object.values(bindings));
const cap=(s:string)=>s[0].toUpperCase()+s.slice(1);
function readCourse(kind:'archive'|'core',name:string){
 const log:string[]=[],seat:any={id:'hero',lastActedAt:0,actor:{dead:false,downed:false,level:1,isQuiescent:()=>true},meta:{items:[],classDef:{id:'warrior'},vocations:[]}};
 const state:any={time:0,localSeat:seat,player:seat.actor,account:{features:new Set(),ledger:{},craftLore:{}},meta:seat.meta,activeQuests:[],completedQuests:new Set(),actors:[],massRuntime:null,manifest:{seed:443},questImbues:[],questRewardShown:null,clientActionHook:null,netJournal:null,questGiverDwell:0,questGiverDwells:new WeakMap(),vocationOfferDeclined:false,vocationOfferRequested:false,journalDirty:new Set(),odyssey:{hasLocalLeads:()=>false,localLeads:()=>{throw Error('no leads');}},actingSeat:null};
 const methods:any={questHand:()=>seat,getQuestGiver:()=>null,giverPresent:()=>null,questRunLedger:()=>({}),questDefOf:(id:string)=>QUESTS[id],pendingTurnIns:()=>[],graphWorkAvailable:()=>false,heroKnown:()=>false,playerIdle:()=>false,seatIdle:()=>false,handSeats:()=>[],ensureQuestCargo:()=>{},questLedgerOf:()=>({imbues:[]}),withQuestHand:(_s:any,fn:()=>unknown)=>fn(),acceptOdysseyCompatibleQuest:()=>{},notice:()=>{}};
 let host:any;host=new Proxy(state,{get(t,k){if(typeof k==='symbol')return t[k];log.push('read:'+k);if(inventory.methods.includes(k))return (...a:any[])=>{log.push('call:'+k);return kind==='archive'?original[k].apply(host,a):(readCourseCore as any)['scene'+cap(k)](host,...a);};if(k in methods)return (...a:any[])=>{log.push('call:'+k);return methods[k](...a);};return t[k];},set(t,k,v){log.push('write:'+String(k));t[k]=v;return true;}});
 const args:any={questOfferLevel:[Object.values(QUESTS)[0]],vocationEngaged:['missing'],isVocationChoice:[Object.values(QUESTS)[0]],updateQuestGiver:[.2],questGiverStep:[seat,.2],seatIdle:[seat],acceptQuestOffer:['missing'],acceptVocationQuest:['missing'],acceptQuest:[{id:'test',geographies:['continuous']}],claimQuestImbue:['missing',5,'missing']};
 const result=kind==='archive'?original[name].apply(host,args[name]??[]):(readCourseCore as any)['scene'+cap(name)](host,...(args[name]??[]));
 return {result,log,flags:{dwell:state.questGiverDwell,declined:state.vocationOfferDeclined,requested:state.vocationOfferRequested,shown:state.questRewardShown}};
}
for(const name of inventory.methods)test('archived/core reads and defaults '+name,()=>assert.deepEqual(readCourse('core',name),readCourse('archive',name)));
type F=ReturnType<typeof fixture>;
function interaction(f:F,quests=f.owner){
 const campaign:any=f.campaign;
 for(const key of ['journalDirty','netJournal'])Object.defineProperty(campaign,key,{configurable:true,get:()=>f.w[key],set:v=>{f.w[key]=v;}});
 for(const key of ['heroKnown','bagItem'])campaign[key]=(...a:any[])=>f.w[key](...a);

 return new NativeAreaSceneQuestInteraction({quests,campaign,state:freshSceneQuestInteractionState()});
}
function neighboring(f:F){
 const area=new NativeAreaSceneAssembly(freshAssemblyInput(f.w,f.w.zone,f.campaign)),scene=area.input.scene;
 scene.actors.splice(0);const binding=f.authority.register(scene,{loot:area.lootController,objective:area.objectiveController});f.authority.claim(binding,[]);area.scenePresence.activate(f.authority);
 const q=new NativeAreaSceneQuests({...f.owner.input,scene,geometry:area.input.geometry,population:area.input.population,physical:area.input.physical,loot:area.lootController,bounty:area.input.bounty,graph:area.graph,coast:area.input.coast,runtimeBirth:area.input.registry.input.birth,state:freshSceneQuestState(),scenePresence:area.scenePresence,objective:area.objectiveController,interaction:area.input.geometry});
 return {area,scene,binding,q,interaction:interaction(f,q)};
}
function transfer(f:F,actor:Actor,from:any,to:any){to.scene.actors.push(actor);f.authority.transfer(actor,from,to);const i=from.scene.actors.indexOf(actor);assert(i>=0);from.scene.actors.splice(i,1);}
function ready(f:F){f.w.time=20;f.w.localSeat.lastActedAt=0;f.w.odyssey.state=newOdyssey(f.w.manifest.seed,f.w.account.ledger);f.giver({giver:'townsfolk_questgiver'});}
const f=fixture(),i=interaction(f),b=neighboring(f);ready(f);
test('real retained giver lookup and query',()=>{assert(i.nearQuestGiver());assert(i.nearAnyQuestGiver());assert.equal(i.questGiverPrompt(),f.w.questGiverPrompt());});
test('idempotent claims and same binding preserve revision',()=>{const rev=f.authority.attendanceRevision(f.w.player);f.authority.claim(f.binding,[f.w.player]);f.authority.transfer(f.w.player,f.binding,f.binding);assert.equal(f.authority.attendanceRevision(f.w.player),rev);});
test('failed claim and transfer preflights preserve revision',()=>{const rev=f.authority.attendanceRevision(f.w.player);assert.throws(()=>f.authority.claim(b.binding,[f.w.player]));assert.throws(()=>f.authority.transfer(f.w.player,f.binding,b.binding));assert.equal(f.authority.attendanceRevision(f.w.player),rev);});
test('solo native dwell accumulates using actual local hand',()=>{i.updateQuestGiver(.35);assert.equal(i.input.state.questGiverDwell,.35);});
test('unobserved A B A round trip resets dwell without moving body',()=>{const pos={...f.w.player.pos},rev=f.authority.attendanceRevision(f.w.player);transfer(f,f.w.player,f.binding,b.binding);transfer(f,f.w.player,b.binding,f.binding);assert.deepEqual(f.w.player.pos,pos);assert(f.authority.attendanceRevision(f.w.player)>rev);i.updateQuestGiver(.2);assert.equal(i.input.state.questGiverDwell,.2);});
test('foreign solo area cannot interact at matching coordinates',()=>{const giver=b.area.input.population.createMonster('townsfolk_questgiver',1,'player');giver.pos={...f.w.player.pos};b.scene.actors.push(giver);f.authority.claim(b.binding,[giver]);assert.equal(b.interaction.nearQuestGiver(),false);assert.equal(b.interaction.nearAnyQuestGiver(),false);assert.equal(b.interaction.questGiverPrompt(),null);assert.equal(b.interaction.claimQuestImbue('missing',1,'missing'),false);});
test('absent solo local hero with present peer cannot dwell',()=>{const peer=f.seat('neighbor',0);transfer(f,peer.actor,f.binding,b.binding);b.scene.player=peer.actor;b.interaction.input.state.questGiverDwell=.6;b.interaction.input.state.vocationOfferDeclined=true;const before=f.w.ownQuestLedger.active.length;b.interaction.updateQuestGiver(.5);assert.equal(b.interaction.input.state.questGiverDwell,0);assert.equal(b.interaction.input.state.vocationOfferDeclined,false);assert.equal(f.w.ownQuestLedger.active.length,before);});
test('actual movement still breaks dwell by native idle law',()=>{f.w.localSeat.lastActedAt=f.w.time;i.updateQuestGiver(.3);assert.equal(i.input.state.questGiverDwell,0);f.w.localSeat.lastActedAt=0;});
test('carried hero revision follows actual controlled body',()=>{const hero=f.w.player,seat=f.w.localSeat,shell=f.area.input.population.createMonster('townsfolk_questgiver',1,'player');shell.pos={...hero.pos};shell.possession={seatId:seat.id,huskMode:'carried'} as any;f.scene.actors.push(shell);f.authority.claim(f.binding,[shell]);f.scene.actors.splice(f.scene.actors.indexOf(hero),1);seat.home=hero;seat.actor=shell;assert.equal(f.authority.attendanceRevision(hero),f.authority.attendanceRevision(shell));assert(i.nearAnyQuestGiver());i.updateQuestGiver(.15);assert.equal(i.input.state.questGiverDwell,.15);seat.actor=hero;seat.home=undefined;f.scene.actors.push(hero);f.authority.release(f.binding,[shell]);f.scene.actors.splice(f.scene.actors.indexOf(shell),1);i.updateQuestGiver(.1);assert.equal(i.input.state.questGiverDwell,.1);});
const h=fixture(true),hi=interaction(h),hb=neighboring(h);ready(h);const visitor=h.seat('visitor',0);visitor.lastActedAt=0;transfer(h,h.w.localSeat.actor,h.binding,hb.binding);
test('hosted local hands dwell while keeper is absent',()=>{hi.updateQuestGiver(.25);assert.equal(hi.input.state.questGiverDwells.get(visitor),.25);assert.equal(hi.input.state.questGiverDwell,0);});
test('hosted unobserved return resets only transferred hand',()=>{const other=h.seat('other',0);other.lastActedAt=0;hi.updateQuestGiver(.1);assert.equal(hi.input.state.questGiverDwells.get(visitor),.35);transfer(h,visitor.actor,h.binding,hb.binding);transfer(h,visitor.actor,hb.binding,h.binding);hi.updateQuestGiver(.1);assert.equal(hi.input.state.questGiverDwells.get(visitor),.1);assert.equal(hi.input.state.questGiverDwells.get(other),.2);});

function imbueFixture(){
 const f=fixture(),i=interaction(f),q=Object.values(QUESTS).find(q=>q.reward.imbue)!;
 assert(q);f.giver(q);const reward=mintQuestImbue(q.id,722,50,4);f.journal().imbues.push(reward);
 const base=Object.keys(reward.offers).find(id=>reward.offers[id].length)!;
 const item=forgeItem({baseId:base,ilvl:50,rarity:'magic',quality:.5,sockets:0})!;assert(item);f.w.meta.items.push(item);
 const affix=imbueOptions(reward,item)[0];assert(affix);return {f,i,q,reward,item,affix};
}
test('actual imbue preview matches native archive and World',()=>{
 const {f,i}=imbueFixture();const before=JSON.stringify({book:f.journal().imbues,items:f.w.meta.items});
 assert.deepEqual(i.questImbueOffers(),original.questImbueOffers.call(f.w));assert.deepEqual(i.questImbueOffers(),f.w.questImbueOffers());
 assert.equal(JSON.stringify({book:f.journal().imbues,items:f.w.meta.items}),before);
});
test('actual native imbue payout and writer agree in all three lanes',()=>{
 const run=(lane:'archive'|'core'|'owner')=>{const {f,i,q,item,affix}=imbueFixture();const args=[q.id,item.uid,affix.id] as const;
  const ok=lane==='archive'?original.claimQuestImbue.apply(f.w,args):lane==='core'?core.sceneClaimQuestImbue(f.w,...args):i.claimQuestImbue(...args);
  const got=f.w.meta.items.find((x:any)=>x.uid===item.uid);assert.equal(ok,true);assert.equal(got.rarity,'rare');assert.equal(f.journal().imbues.length,0);
  assert(window.localStorage.getItem(charKeyFor(CHAR_SLOT)),'actual campaign writer persisted');
  return {ok,name:got.name,rarity:got.rarity,affixes:got.affixes,book:f.journal().imbues,notice:f.notices.at(-1)};};
 const archived=run('archive');assert.deepEqual(run('core'),archived);assert.deepEqual(run('owner'),archived);
});
test('imbue failure preserves native partial writes and prevents later save',()=>{
 const {f,i,q,item,affix}=imbueFixture();const saved=window.localStorage.getItem(charKeyFor(CHAR_SLOT)),notices=f.notices.length;
 f.w.markMetaDirty=()=>{throw Error('mark-meta-fault');};
 assert.throws(()=>i.claimQuestImbue(q.id,item.uid,affix.id),/mark-meta-fault/);
 assert.equal(f.w.meta.items.find((x:any)=>x.uid===item.uid).rarity,'rare');assert.equal(f.journal().imbues.length,0);
 assert.equal(f.notices.length,notices);assert.equal(window.localStorage.getItem(charKeyFor(CHAR_SLOT)),saved);
});
test('foreign matching giver cannot consume earned imbue until physical transfer',()=>{
 const {f,i,q,item,affix}=imbueFixture(),b=neighboring(f);const giver=b.area.input.population.createMonster(Array.isArray(q.giver)?q.giver[0]:q.giver,1,'player');giver.pos={...f.w.player.pos};b.scene.actors.push(giver);f.authority.claim(b.binding,[giver]);
 const before=JSON.stringify({book:f.journal().imbues,items:f.w.meta.items,notices:f.notices});assert.equal(b.interaction.claimQuestImbue(q.id,item.uid,affix.id),false);
 assert.equal(JSON.stringify({book:f.journal().imbues,items:f.w.meta.items,notices:f.notices}),before);
 transfer(f,f.w.player,f.binding,b.binding);assert.equal(i.nearAnyQuestGiver(),false);assert.equal(b.interaction.claimQuestImbue(q.id,item.uid,affix.id),true);
});
test('actual choice reward previews preserve authored cards and fixed items',()=>{
 const f=fixture(),i=interaction(f),q=Object.values(QUESTS).find(q=>q.turnIn&&!q.collect&&q.reward.choices?.length)!;assert(q);f.giver(q);f.add(q).fieldDone=true;
 const first=i.questRewardOffers();assert(first.length);assert.deepEqual(first,f.w.questRewardOffers());assert.deepEqual(first,original.questRewardOffers.call(f.w));assert.deepEqual(i.questRewardOffers(),first);
});
test('actual vocation offers and acceptance preserve native gates',()=>{
 const f=fixture(),i=interaction(f);ready(f);assert.deepEqual(i.vocationMenuOffers(),[]);f.w.account.ledger.odyssey_stage_1=1;const choices=i.vocationMenuOffers();assert.deepEqual(choices,f.w.vocationMenuOffers());assert(choices.length);
 const q=choices[0];assert.equal(i.acceptVocationQuest(q.questId),true);assert(f.journal().active.some((x:any)=>x.questId===q.questId));assert.equal(i.acceptVocationQuest(q.questId),false);
});
test('live effect receiver replacement is honored',()=>{
 const {f,i,q,item,affix}=imbueFixture();let invoked=false;const old=f.campaign.bagItem;
 f.campaign.bagItem=function(...args:any[]){assert.equal(this,f.campaign);invoked=true;return old(...args);};assert(i.claimQuestImbue(q.id,item.uid,affix.id));assert(invoked);
});


test('multi-body failed claim and release have no partial authority or revision writes',()=>{
 const fresh=f.area.input.population.createMonster('townsfolk_questgiver',1,'player'),foreign=b.scene.actors.find(a=>a.defId==='townsfolk_questgiver')!;assert(foreign);
 f.scene.actors.push(fresh,foreign);const heroRevision=f.authority.attendanceRevision(f.w.localSeat.actor),foreignRevision=f.authority.attendanceRevision(foreign);
 assert.throws(()=>f.authority.claim(f.binding,[fresh,foreign]),/already belongs/);assert.throws(()=>f.authority.require(fresh),/Missing/);
 assert.equal(f.authority.attendanceRevision(foreign),foreignRevision);assert.equal(f.authority.attendanceRevision(f.w.localSeat.actor),heroRevision);
 f.scene.actors.splice(f.scene.actors.indexOf(foreign),1);f.authority.claim(f.binding,[fresh]);const first=f.authority.attendanceRevision(fresh);
 assert.throws(()=>f.authority.release(f.binding,[fresh,foreign]),/another/);assert.equal(f.authority.attendanceRevision(fresh),first);
 f.authority.release(f.binding,[fresh]);assert.throws(()=>f.authority.require(fresh),/Missing/);f.authority.claim(f.binding,[fresh]);assert(f.authority.attendanceRevision(fresh)>first);
});
test('nested failed transfer does not invalidate unrelated dwelling hand',()=>{
 const revision=h.authority.attendanceRevision(visitor.actor),dwell=hi.input.state.questGiverDwells.get(visitor);
 h.owner.withQuestHand(visitor,()=>{assert.throws(()=>h.authority.transfer(visitor.actor,h.binding,hb.binding),/destination membership/);assert.equal(h.authority.attendanceRevision(visitor.actor),revision);});
 hi.updateQuestGiver(.1);assert.equal(hi.input.state.questGiverDwells.get(visitor),(dwell??0)+.1);assert.equal(h.w.questSeat,null);
});


test('native idle reads use live action clock and real quiescence',()=>{
 const f=fixture(),i=interaction(f),seat=f.w.localSeat,a=seat.actor;f.w.time=.15;seat.lastActedAt=0;assert.equal(i.seatIdle(seat),true);assert.equal(i.playerIdle(),true);
 f.w.time=.149;assert.equal(i.seatIdle(seat),false);f.w.time=5;seat.lastActedAt=0;a.useLock=1;assert.equal(i.playerIdle(),false);a.useLock=0;assert(i.playerIdle());
 const previous=a.casting;a.casting={} as any;assert.equal(i.playerIdle(),false);a.casting=previous;assert(i.playerIdle());
});
test('away hosted hand cannot use matching givers through direct menu or internal accept entry',()=>{
 const f=fixture(true),i=interaction(f),b=neighboring(f),seat=f.seat('away',0);f.w.account.ledger.odyssey_stage_1=1;ready(f);
 const vocation=f.owner.withQuestHand(seat,()=>i.vocationMenuOffers())[0];assert(vocation);transfer(f,seat.actor,f.binding,b.binding);
 const book=f.journal(seat),before=JSON.stringify({book,bag:seat.meta.items,map:f.w.zoneMap,scope:f.w.questSeat,notices:f.notices});
 assert.equal(i.acceptVocationQuest(vocation.questId,seat),false);assert.equal(i.acceptQuestOffer(vocation.questId,seat),false);
 f.owner.withQuestHand(seat,()=>i.acceptQuest(QUESTS[vocation.questId]));
 assert.equal(JSON.stringify({book,bag:seat.meta.items,map:f.w.zoneMap,scope:f.w.questSeat,notices:f.notices}),before);
 transfer(f,seat.actor,b.binding,f.binding);assert.equal(i.acceptVocationQuest(vocation.questId,seat),true);
});
test('away hosted choice reward menu refuses before any payout',()=>{
 const f=fixture(true),i=interaction(f),b=neighboring(f),seat=f.seat('away-reward',0),q=Object.values(QUESTS).find(q=>q.turnIn&&!q.collect&&q.reward.choices?.length)!;
 f.giver(q);const row=f.add(q,seat);row.fieldDone=true;const choices=f.owner.withQuestHand(seat,()=>i.questRewardOffers());assert(choices.length);
 transfer(f,seat.actor,f.binding,b.binding);const before=JSON.stringify({book:f.journal(seat),bag:seat.meta.items,notices:f.notices,drops:f.physical.input.state.drops});
 assert.equal(f.owner.claimQuestReward(q.id,choices[0].choices[0].id,seat),false);assert.deepEqual(f.owner.withQuestHand(seat,()=>i.questRewardOffers()),[]);
 assert.equal(JSON.stringify({book:f.journal(seat),bag:seat.meta.items,notices:f.notices,drops:f.physical.input.state.drops}),before);
});

const result={count:receipts.length,receipt:createHash('sha256').update(JSON.stringify(receipts)).digest('hex'),receipts,boundaries:['existing test World publication retained only for actual save identity','exact native idle reads use real actor quiescence and campaign action clocks; input and movement writers remain external','no client publication or scheduling activation'],retainedActivation:false};
fs.mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('./reports/nativequestinteraction.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({count:result.count,receipt:result.receipt}));

// Additional World/integration evidence has a separate receipt, so the original
// 49-course proof above remains immutable and independently comparable.
const integrationChecks:string[]=[];
function integrated(name:string,fn:()=>void){fn();integrationChecks.push(name);console.log('PASS '+name);}
const sha=(s:string)=>createHash('sha256').update(s).digest('hex'),read=(p:string)=>((source:string)=>p==='src/engine/world.ts'?projectContinuity('production',p,source):source)(projectOdysseyPressure(p,rawCampaign("pressure59",p,fs.readFileSync(new URL('../'+p,import.meta.url),'utf8')))).replaceAll('\r\n','\n');
integrated('exact archived whole World and Odyssey restoration',()=>{
 assert.equal(sha(JSON.stringify(archive)),nativeSceneQuestInteractionArchiveHash);
 const current=read('src/engine/world.ts'),restored=beforeNativeSceneQuestInteraction(current);
 assert.equal(sha(restored),archive.integrationSourceHash);assert.ok(current.startsWith("import './nativeSceneBootstrap';\n"));
 const old=execFileSync('git',['show',archive.originalCommit+':src/engine/world.ts'],{encoding:'utf8',maxBuffer:20e6}).replaceAll('\r\n','\n'),ast=ts.createSourceFile('old.ts',old,99,true),wc=ast.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;
 for(const row of archive.rows){const m=wc.members.find(m=>m.name?.getText(ast)===row.name) as ts.MethodDeclaration;assert.equal(m.getText(ast),row.before);assert.equal(sha(row.before),row.memberHash);}
 const cs=ts.createSourceFile('core.ts',read('src/engine/nativeSceneQuestInteraction.ts'),99,true);
 for(const row of archive.rows){const parsed=ts.createSourceFile('m.ts','class A{'+row.before+'}',99,true),old=((parsed.statements[0] as ts.ClassDeclaration).members[0] as ts.MethodDeclaration),fn=cs.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='scene'+cap(row.name)) as ts.FunctionDeclaration;
  assert.equal(fn.body!.getText(cs),old.body!.getText(parsed).replaceAll('this.','host.').replace('saveCharacter(this)','saveCharacter(host.characterWriter)'));
  assert.deepEqual(fn.parameters.slice(1).map(p=>p.getText(cs)),old.parameters.map(p=>p.getText(parsed).replaceAll('this.','host.')));assert.equal(fn.type?.getText(cs),old.type?.getText(parsed));
 }
 assert.equal(core.QUESTGIVER_RADIUS,150);assert.equal(core.QUESTGIVER_DWELL,.9);assert.equal(core.DWELL_IDLE_GRACE,.15);
 const od=beforeNativeQuestInteractionOdyssey(read('src/engine/odyssey.ts'));assert.equal(sha(od),archive.integrationOdysseyHash);
 const gitOd=execFileSync('git',['show',archive.originalCommit+':src/engine/odyssey.ts'],{encoding:'utf8'}).replaceAll('\r\n','\n'),gitAst=ts.createSourceFile('od.ts',gitOd,99,true),gitClass=gitAst.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='OdysseyRuntime') as ts.ClassDeclaration;
 const nativeAst=ts.createSourceFile('nativeOd.ts',read('src/engine/nativeQuestOdyssey.ts'),99,true),nativeClass=nativeAst.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='NativeQuestOdyssey') as ts.ClassDeclaration;
 for(const row of archive.auxiliary){assert.equal(gitClass.members.find(m=>m.name?.getText(gitAst)===row.name)?.getText(gitAst),row.before);assert.equal(nativeClass.members.find(m=>m.name?.getText(nativeAst)===row.name)?.getText(nativeAst),row.before);}
 const integrationCommit:string|null=archive.integrationCommit;
 if(integrationCommit){assert.equal(restored,execFileSync('git',['show',integrationCommit+':src/engine/world.ts'],{encoding:'utf8',maxBuffer:20e6}).replaceAll('\r\n','\n'));assert.equal(od,execFileSync('git',['show',integrationCommit+':src/engine/odyssey.ts'],{encoding:'utf8'}).replaceAll('\r\n','\n'));}
 const damaged=current.replace('get characterWriter(){return world;}','get characterWriter(){return undefined;}');assert.notEqual(damaged,current);assert.throws(()=>beforeNativeSceneQuestInteraction(damaged),/unique exact/);
 const bodyDamage=current.replace('return sceneSeatIdle(this.nativeSceneQuestInteractionHost(),seat);','return true;');assert.notEqual(bodyDamage,current);assert.throws(()=>beforeNativeSceneQuestInteraction(bodyDamage),/unique exact/);
 assert.throws(()=>beforeNativeQuestInteractionOdyssey(read('src/engine/odyssey.ts').replace('return this.nativeQuestCore().hasLocalLeads();','return false;')),/unique exact/);
 assert.notEqual(sha(beforeNativeSceneQuestInteraction(current+'\n// unrelated source drift')),archive.integrationSourceHash,'unrelated source drift is preserved for downstream/full-source guards');
 const importDamage=current.replace('QUESTGIVER_DWELL,type NativeSceneQuestInteractionHost','QUESTGIVER_DWELL as wrong,type NativeSceneQuestInteractionHost');assert.notEqual(importDamage,current);assert.throws(()=>beforeNativeSceneQuestInteraction(importDamage),/unique exact/);
 const constantImportDamage=current.replace('import {QUESTGIVER_RADIUS,','import {QUESTGIVER_RADIUS as wrong,');assert.notEqual(constantImportDamage,current);assert.throws(()=>beforeNativeSceneQuestInteraction(constantImportDamage),/unique exact/);
 const nativeText=read('src/engine/nativeSceneQuestInteraction.ts');const constantGuard=(text:string)=>{assert.ok(text.includes('export const QUESTGIVER_DWELL = 0.9;'));assert.ok(text.includes('export const DWELL_IDLE_GRACE = 0.15;'));assert.ok(text.includes("import {QUESTGIVER_RADIUS} from './nativeSceneQuests';"));};constantGuard(nativeText);assert.throws(()=>constantGuard(nativeText.replace('QUESTGIVER_DWELL = 0.9','QUESTGIVER_DWELL = 0.8')));assert.throws(()=>constantGuard(nativeText.replace('DWELL_IDLE_GRACE = 0.15','DWELL_IDLE_GRACE = 0.16')));
 const exactRows=archive.rows.map(row=>{const ast=ts.createSourceFile('one.ts','class A{'+row.before+'}',99,true),m=(ast.statements[0] as ts.ClassDeclaration).members[0] as ts.MethodDeclaration;return {name:row.name,body:sha(m.body!.getText(ast)),signature:sha(m.parameters.map(p=>p.getText(ast)).join(',')),projection:row.name==='claimQuestImbue'?'receiver + actual writer identity':'receiver only'};});
 const exact=[...exactRows,...archive.auxiliary.map(row=>({name:'Odyssey.'+row.name,member:sha(row.before),projection:'none'}))];assert.equal(sha(JSON.stringify(exact)),archive.originalExactReceipt,'unchanged original 28-member receipt');
});
function actualWorldReadCourse(lane:'archive'|'core'|'world',name:string){
 const w:any=makeSimWorld('warrior',7331),seat=w.localSeat,log:string[]=[];seat.lastActedAt=0;seat.actor.dead=false;seat.actor.downed=false;seat.actor.useLock=0;seat.actor.level=1;
 const state:any={time:0,localSeat:seat,player:seat.actor,account:{features:new Set(),ledger:{},craftLore:{}},meta:seat.meta,activeQuests:[],completedQuests:new Set(),actors:[],massRuntime:null,manifest:{seed:443},questImbues:[],questRewardShown:null,clientActionHook:null,netJournal:null,questGiverDwell:0,questGiverDwells:new WeakMap(),vocationOfferDeclined:false,vocationOfferRequested:false,journalDirty:new Set(),odyssey:{hasLocalLeads:()=>false,localLeads:()=>{throw Error('no leads');}},actingSeat:null};
 // Explicit recording capabilities isolate read order on an actual constructed
 // World. The retained owner and actual content paths are tested independently.
 const methods:any={questHand:()=>seat,getQuestGiver:()=>null,giverPresent:()=>null,questRunLedger:()=>({}),questDefOf:(id:string)=>QUESTS[id],pendingTurnIns:()=>[],graphWorkAvailable:()=>false,heroKnown:()=>false,handSeats:()=>[],ensureQuestCargo:()=>{},questLedgerOf:()=>({imbues:[]}),withQuestHand:(_s:any,fn:()=>unknown)=>fn(),acceptOdysseyCompatibleQuest:()=>{},notice:()=>{}};
 for(const key of Object.keys(state))Object.defineProperty(w,key,{configurable:true,get(){log.push('read:'+key);return state[key];},set(value){log.push('write:'+key);state[key]=value;}});
 for(const key of [...new Set([...Object.keys(methods),...inventory.methods])])Object.defineProperty(w,key,{configurable:true,get(){log.push('read:'+key);return function(this:unknown,...a:any[]){assert.equal(this,w,'native World callback receiver '+key);log.push('call:'+key);if(inventory.methods.includes(key as any)){if(lane==='archive')return original[key].apply(w,a);if(lane==='core')return (readCourseCore as any)['scene'+cap(key)](w,...a);return (['questGiverStep','vocationMenuOffers'].includes(key)?(readCourseCore as any)['scene'+cap(key)](w.nativeSceneQuestInteractionHost(),...a):(World.prototype as any)[key].apply(w,a));}return methods[key](...a);};}});
 const args:any={questOfferLevel:[Object.values(QUESTS)[0]],vocationEngaged:['missing'],isVocationChoice:[Object.values(QUESTS)[0]],updateQuestGiver:[.2],questGiverStep:[seat,.2],seatIdle:[seat],acceptQuestOffer:['missing'],acceptVocationQuest:['missing'],acceptQuest:[{id:'test',geographies:['continuous']}],claimQuestImbue:['missing',5,'missing']};
 const result=lane==='archive'?original[name].apply(w,args[name]??[]):lane==='core'?(readCourseCore as any)['scene'+cap(name)](w,...(args[name]??[])):(['questGiverStep','vocationMenuOffers'].includes(name)?(readCourseCore as any)['scene'+cap(name)](w.nativeSceneQuestInteractionHost(),...(args[name]??[])):(World.prototype as any)[name].apply(w,args[name]??[]));
 return {result,log,flags:{dwell:state.questGiverDwell,declined:state.vocationOfferDeclined,requested:state.vocationOfferRequested,shown:state.questRewardShown}};
}
for(const name of inventory.methods)integrated('actual World lazy reads/defaults/receivers '+name,()=>{const archived=actualWorldReadCourse('archive',name);assert.deepEqual(actualWorldReadCourse('core',name),archived);assert.deepEqual(actualWorldReadCourse('world',name),archived);});
integrated('cached World host retains actual writer and live method lookup timing',()=>{
 const w:any=makeSimWorld('warrior',7332),host=w.nativeSceneQuestInteractionHost();assert.equal(host,w.nativeSceneQuestInteractionHost());assert.equal(host.characterWriter,w);assert.equal(Object.keys(w).includes('nativeSceneQuestInteractionView'),false);
 const seat=w.localSeat,calls:string[]=[];let version='first';Object.defineProperty(w,'questHand',{configurable:true,get(){const held=version;calls.push('lookup:'+held);return function(this:unknown){assert.equal(this,w);calls.push('call:'+held);return seat;};}});
 const held=host.questHand;version='second';assert.equal(held(),seat);assert.equal(host.questHand(),seat);assert.deepEqual(calls,['lookup:first','call:first','lookup:second','call:second']);
 w.time=10;seat.lastActedAt=9.9;assert.equal(w.seatIdle(seat),false);w.time=10.2;assert.equal(w.seatIdle(seat),true);seat.actor.useLock=1;assert.equal(w.playerIdle(),false);
});
integrated('continuous country journal offers/acceptance/dwell payout match original core and World',()=>{
 const lanes=['archive','core','world'] as const,results:any[]=[];
 for(const lane of lanes){const w:any=makeSimWorld('warrior',7342);w.startWorldMass(42);const mass=w.massRuntime!,giver=w.actors.find((a:Actor)=>a.defId==='townsfolk_innkeep'&&!a.dead);assert(giver);w.player.pos={...giver.pos};w.player.tier=giver.tier;w.player.useLock=0;w.time=20;w.localSeat.lastActedAt=0;
  const host=w.nativeSceneQuestInteractionHost(),call=(name:string,...args:any[])=>lane==='archive'?original[name].apply(w,args):lane==='core'?(core as any)['scene'+cap(name)](host,...args):w[name](...args);
  const place=massQuestDestination(mass,Q_FRONTIER_WATCH.id)!;assert(place);const knowledge=canonical(mass.state.snapshot()),graph=Object.keys(w.zoneMap),earned=()=>w.meta.xp+Array.from({length:w.player.level-1},(_,i)=>PROGRESSION.xpForLevel(i+1)).reduce((a,b)=>a+b,0),beforeXp=earned();
  const offers=call('questOfferChoices');assert.deepEqual(offers.map((x:any)=>x.questId),[Q_FRONTIER_WATCH.id]);assert.equal(call('nextAcceptableQuest'),null);call('updateQuestGiver',4);assert.equal(w.activeQuests.length,0,'journal acceptance stays deliberate');assert(call('acceptQuestOffer',Q_FRONTIER_WATCH.id));assert.equal(w.activeQuests[0].placeId,place.id);assert.equal(earned(),beforeXp);assert.deepEqual(Object.keys(w.zoneMap),graph);assert.equal(canonical(mass.state.snapshot()),knowledge);
  // The existing worldmass_quests course proves combat/Continue. This bounded
  // branch course supplies authored readiness and exercises actual native dwell.
  w.activeQuests[0].fieldDone=true;call('updateQuestGiver',4);assert.equal(earned()-beforeXp,Q_FRONTIER_WATCH.reward.xp);assert.equal(w.activeQuests.length,0);assert(w.completedQuests.has(Q_FRONTIER_WATCH.id));const paid=earned();call('updateQuestGiver',4);assert.equal(earned(),paid);
  results.push({offers:offers.map((x:any)=>({questId:x.questId,label:x.label,xp:x.xp})),xp:paid-beforeXp,done:w.completedQuests.has(Q_FRONTIER_WATCH.id),journalChoice:true});
 }
 assert.deepEqual(results[1],results[0]);assert.deepEqual(results[2],results[0]);
});
integrated('actual World imbue payout and partial failure use the original real writer',()=>{
 const run=(lane:'archive'|'core'|'world'|'owner',fault=false)=>{const {f,i,q,item,affix}=imbueFixture(),beforeSave=window.localStorage.getItem(charKeyFor(CHAR_SLOT)),beforeNotice=f.notices.length;
  if(fault)f.w.markMetaDirty=()=>{throw Error('integrated-mark-fault');};
  const act=()=>lane==='archive'?original.claimQuestImbue.call(f.w,q.id,item.uid,affix.id):lane==='core'?core.sceneClaimQuestImbue(f.w.nativeSceneQuestInteractionHost(),q.id,item.uid,affix.id):lane==='world'?f.w.claimQuestImbue(q.id,item.uid,affix.id):i.claimQuestImbue(q.id,item.uid,affix.id);
  if(fault){assert.throws(act,/integrated-mark-fault/);assert.equal(window.localStorage.getItem(charKeyFor(CHAR_SLOT)),beforeSave);assert.equal(f.notices.length,beforeNotice);}else {assert.equal(act(),true);assert(window.localStorage.getItem(charKeyFor(CHAR_SLOT)));}
  const got=f.w.meta.items.find((x:any)=>x.uid===item.uid);assert.equal(got.rarity,'rare');assert.equal(f.journal().imbues.length,0);
  return {name:got.name,rarity:got.rarity,affixes:got.affixes,book:f.journal().imbues,notices:f.notices.slice(beforeNotice)};
 };
 for(const fault of [false,true]){const old=run('archive',fault);for(const lane of ['core','world','owner'] as const)assert.deepEqual(run(lane,fault),old);}
});
integrated('present-hand refusal preserves existing dwell and completes on valid retry',()=>{
 const f=fixture(),i=interaction(f),seat=f.w.localSeat;ready(f);
 const q=Object.values(QUESTS).find(q=>q.turnIn&&!q.collect&&!q.reward.choices?.length&&!q.reward.imbue)!;assert(q);f.giver(q);f.add(q).fieldDone=true;
 i.questGiverStep(seat,.2);assert.equal(i.input.state.questGiverDwells.get(seat),.2,'successful native step seeds real attendance');
 const state=i.input.state;state.questGiverDwell=.5;state.questGiverDwells.set(seat,.5);state.vocationOfferRequested=true;state.vocationOfferDeclined=true;
 const rogue=f.area.input.population.createMonster('townsfolk_questgiver',1,'player');f.scene.actors.push(rogue);
 const before={solo:state.questGiverDwell,seat:state.questGiverDwells.get(seat),requested:state.vocationOfferRequested,declined:state.vocationOfferDeclined,book:JSON.stringify(f.journal()),revision:f.authority.attendanceRevision(seat.actor)};
 assert.throws(()=>i.questGiverStep(seat,.4),/admission|claim|census|authority/i);
 assert.deepEqual({solo:state.questGiverDwell,seat:state.questGiverDwells.get(seat),requested:state.vocationOfferRequested,declined:state.vocationOfferDeclined,book:JSON.stringify(f.journal()),revision:f.authority.attendanceRevision(seat.actor)},before);
 f.scene.actors.splice(f.scene.actors.indexOf(rogue),1);const xp=seat.meta.xp;i.questGiverStep(seat,.4);
 assert.equal(state.questGiverDwells.has(seat),false);assert(f.journal().completed.has(q.id));assert.equal(seat.meta.xp-xp,q.reward.xp);
 assert.equal(state.questGiverDwell,.5);assert.equal(state.vocationOfferRequested,true);assert.equal(state.vocationOfferDeclined,true);
});
integrated('first-observation refusal cannot install attendance or suppress retry reset',()=>{
 const f=fixture(),i=interaction(f),seat=f.w.localSeat;ready(f);const state=i.input.state;
 state.questGiverDwell=.5;state.questGiverDwells.set(seat,.5);state.vocationOfferRequested=true;state.vocationOfferDeclined=true;
 const rogue=f.area.input.population.createMonster('townsfolk_questgiver',1,'player');f.scene.actors.push(rogue);
 const before={solo:state.questGiverDwell,seat:state.questGiverDwells.get(seat),requested:state.vocationOfferRequested,declined:state.vocationOfferDeclined,revision:f.authority.attendanceRevision(seat.actor)};
 assert.throws(()=>i.questGiverStep(seat,.1),/admission|claim|census|authority/i);
 assert.deepEqual({solo:state.questGiverDwell,seat:state.questGiverDwells.get(seat),requested:state.vocationOfferRequested,declined:state.vocationOfferDeclined,revision:f.authority.attendanceRevision(seat.actor)},before);
 f.scene.actors.splice(f.scene.actors.indexOf(rogue),1);i.questGiverStep(seat,.1);
 assert.equal(state.questGiverDwell,0);assert.equal(state.questGiverDwells.get(seat),.1);assert.equal(state.vocationOfferRequested,false);assert.equal(state.vocationOfferDeclined,false);
 i.questGiverStep(seat,.1);assert.equal(state.questGiverDwells.get(seat),.2,'valid attendance now preserves native accumulation');
});
integrated('absent-hand step preserves local reset policy even while census rejects admission',()=>{
 const f=fixture(),i=interaction(f),seat=f.w.localSeat,b=neighboring(f);ready(f);i.questGiverStep(seat,.2);transfer(f,seat.actor,f.binding,b.binding);
 const state=i.input.state;state.questGiverDwell=.5;state.questGiverDwells.set(seat,.5);state.vocationOfferRequested=true;state.vocationOfferDeclined=true;
 const rogue=f.area.input.population.createMonster('townsfolk_questgiver',1,'player');f.scene.actors.push(rogue);assert.throws(()=>f.authority.assertAdmitted(f.scene));
 i.questGiverStep(seat,.4);assert.equal(state.questGiverDwell,0);assert.equal(state.questGiverDwells.has(seat),false);assert.equal(state.vocationOfferRequested,false);assert.equal(state.vocationOfferDeclined,false);
});
const integrationResult={count:integrationChecks.length,receipt:sha(JSON.stringify(integrationChecks)),checks:integrationChecks,originalBehaviorReceipt:result.receipt,sourceHash:archive.integrationSourceHash,originalCommit:archive.originalCommit,integrationCommit:archive.integrationCommit,boundaries:['actual constructed World read-order courses use explicit recording capabilities','continuous branch readiness is authored fixture setup; existing worldmass_quests separately covers native combat and Continue','retained scheduler/menu/client activation remains outside this integration']};
fs.writeFileSync(new URL('./reports/nativequestinteractionintegration.json',import.meta.url),JSON.stringify(integrationResult,null,2)+'\n');console.log(JSON.stringify(integrationResult));
