import {beforeNativeCampaignRaw as rawCampaign} from './nativeCampaignCompositionFixture';
import {beforeNativeContinuity as projectContinuity} from './nativeContinuityCompositionFixture';
import {beforeNativeOdysseyPressure as projectOdysseyPressure,beforeNativeOdysseyHistoricalRescue} from './nativeOdysseyPressureFixtureSource';
import {beforeNativeBirthLifetime} from './nativeBirthLifetimeFixture';
import {beforeNativeQuestInteractionOdyssey} from './nativeSceneQuestInteractionFixture';
import {NativeAreaActorAuthority} from '../src/worldmass/nativeAreaActorAuthority';
import {beforeNativeMainContent} from './nativeMainContentFixture';
/** Independent original/current/core/retained quest parity.
 * Native campaign writer and item/XP/rescue/quest algorithms run; compact scene
 * publication and progress rebuild are explicitly controlled test boundaries. */
import assert from 'node:assert/strict';
import {nativeCaravanPriorFS as fs} from './nativeCaravanCompositionFixture';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
import {makeSimWorld} from '../src/sim/arena';
import {nativeSceneQuestArchive as archive,nativeSceneQuestArchiveHash} from './nativeSceneQuestArchive';
import * as core from '../src/engine/nativeSceneQuests';
import {NativeAreaSceneQuests,freshSceneQuestState,type NativeSceneQuestRewardRuntime} from '../src/worldmass/nativeAreaSceneQuests';
import {freshAssemblyInput,NativeAreaSceneAssembly} from './nativeFreshAssemblyFixture';
import {nativeSceneQuestAuxArchive as aux,nativeSceneQuestAuxArchiveHash} from './nativeSceneQuestAuxArchive';
import {odysseyMilestoneKey} from '../src/data/powerProgression';
import {revengeFactionOf,revengeCullId,revengeCommanderId} from '../src/quests/revenge';
import {ODYSSEY_CFG as C,ODYSSEY_SURVEY,ODYSSEY_TUTORIAL_RELEASE} from '../src/data/odyssey';
import {odysseyPressureTier} from '../src/world/odysseyPressure';
import {defeatOdysseyLeader,odysseyAct,odysseyReadiness,odysseySurvives} from '../src/world/odyssey';
import {newQuestLedger} from '../src/engine/questLedger';
import {CLASSES} from '../src/data/classes';
import {NullInput} from '../src/net/intent';
import {newOdyssey} from '../src/world/odyssey';
import {captureNativeActorState} from '../src/worldmass/dormancy';
import {ODYSSEY_CFG,odysseyFaction,odysseyQuestId} from "../src/data/odyssey";
import {dist,vec} from "../src/core/math";
import {Actor} from "../src/engine/actor";
import {makeSkillGem,makeSkillInstance} from "../src/engine/skills";
import {autoPlace,removeFromBag,bagWidth,bagHeight} from "../src/engine/inventory";
import {makeSkillGemItem} from "../src/engine/gemitems";
import {nextItemUid,forgeItem} from "../src/engine/itemgen";
import {SKILLS} from "../src/data/skills";
import {COOP_SCALING} from "../src/data/coop";
import {VOCATIONS,VOCATION_CFG,vocationLedgerKey,vocationRootId} from "../src/data/vocations";
import {START_ZONE} from "../src/data/zones";
import {npcDwellReach} from "../src/data/transit";
import {countRoads,placeZoneAt,projectCoord,nearestNode,roadBudgetOf} from "../src/engine/worldgen";
import {BOUNTY_BOARD_CFG,describeBountyPay} from "../src/data/bountyboard";
import {QUESTS} from "../src/quests/defs";
import {resolveQuestZone} from "../src/quests/reliquary";
import {mintQuestImbue} from "../src/engine/questImbue";
import {questRewardChoices} from "../src/engine/questRewardChoices";
import {Rng,withSeededRandom} from "../src/core/rng";
import {coordDist} from "../src/world/coords";
import {isRoadlessGateHub} from "../src/world/dimensions";
import {authoredMapOf,authoredZoneSpec,definedSpec,sealAuthoredZone} from "../src/engine/authoredMaps";
import {bumpLedger} from "../src/packages/ledger";
import {questDoneKey,LEDGER_BOUNTY_DONE,bountyDoneKindKey} from "../src/meta/account";
import {saveCharacter,charKeyFor,CHAR_SLOT,applySavedCharacter} from "../src/meta/character";
import {saveAccount} from "../src/meta/persistence";
import {hashStr} from "../src/engine/nativeSceneConfig";
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),read=(p:string)=>((source:string)=>p==='src/engine/world.ts'?projectContinuity('production',p,source):beforeNativeOdysseyHistoricalRescue(p,source))(projectOdysseyPressure(p,rawCampaign("pressure59",p,fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'))));
const parse=(s:string)=>ts.createSourceFile('p.ts',s,99,true),emit=(s:string)=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,removeComments:true}}).outputText;
assert.equal(hash(JSON.stringify(archive)),nativeSceneQuestArchiveHash);
const source=read('src/engine/world.ts'),sf=parse(source),cl=sf.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;
for(const row of archive.rows)assert.equal(cl.members.find(m=>m.name?.getText(sf)===row.name)?.getText(sf).replaceAll('\r\n','\n'),row.after,'checked quest delegate '+row.name);
{ const restored=parse(beforeNativeMainContent(read('src/engine/world.ts'))),world=restored.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration; assert.equal(hash(JSON.stringify(world.members.map(m=>m.getText(restored).replaceAll('\r\n','\n')))),archive.worldHash,'complete pre-quest World'); }
if(process.argv.includes('--provenance')){
 const git=execFileSync('git',['show',archive.commit+':src/engine/world.ts'],{encoding:'utf8',maxBuffer:8*1024*1024}),gs=parse(git),gc=gs.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;
 assert.equal(hash(JSON.stringify(gc.members.map(m=>m.getText(gs).replaceAll('\r\n','\n')))),archive.worldHash);
}
const cs=parse(read('src/engine/nativeSceneQuests.ts')),cap=(s:string)=>s[0].toUpperCase()+s.slice(1);
for(const row of archive.rows){const old=parse('class A{'+row.before+'}'),m=(old.statements[0] as ts.ClassDeclaration).members[0] as ts.MethodDeclaration,
 next=cs.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='scene'+cap(row.name)) as ts.FunctionDeclaration;
 const expected=m.body!.getText(old).replace(/\bthis\b/g,'host').replace('saveCharacter(host);','saveCharacter(host.characterWriter);');
 assert.equal(emit('function proof()'+next.body!.getText(cs)),emit('function proof()'+expected),'native executable body '+row.name);}
const QUESTGIVER_RADIUS=150,APPROACH_RADIUS=150;
const bindings={ODYSSEY_CFG,odysseyFaction,odysseyQuestId,dist,vec,Actor,makeSkillGem,autoPlace,removeFromBag,makeSkillGemItem,nextItemUid,forgeItem,SKILLS,COOP_SCALING,VOCATIONS,VOCATION_CFG,vocationLedgerKey,vocationRootId,START_ZONE,npcDwellReach,countRoads,placeZoneAt,projectCoord,nearestNode,roadBudgetOf,BOUNTY_BOARD_CFG,describeBountyPay,QUESTS,resolveQuestZone,mintQuestImbue,questRewardChoices,Rng,withSeededRandom,coordDist,isRoadlessGateHub,authoredMapOf,authoredZoneSpec,definedSpec,sealAuthoredZone,bumpLedger,questDoneKey,LEDGER_BOUNTY_DONE,bountyDoneKindKey,saveCharacter,saveAccount,hashStr,QUESTGIVER_RADIUS,APPROACH_RADIUS};
const original=new Function(...Object.keys(bindings),emit('class Archive{'+archive.rows.map(r=>r.before).join('\n')+'}\nreturn Archive.prototype;'))(...Object.values(bindings)) as Record<string,Function>;

assert.equal(hash(JSON.stringify(aux)),nativeSceneQuestAuxArchiveHash);
for(const [file,cls,rows] of [['src/engine/odyssey.ts','OdysseyRuntime',aux.odyssey.rows],['src/engine/questRescues.ts','QuestRescues',aux.rescues.rows]] as const){
 const src=file==='src/engine/odyssey.ts'?beforeNativeQuestInteractionOdyssey(read(file)):beforeNativeBirthLifetime(file,read(file)),ast=parse(src),c=ast.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text===cls) as ts.ClassDeclaration;
 for(const row of rows){const m=c.members.find(m=>m.name?.getText(ast)===row.name);assert.equal(m?.getText(ast).replaceAll('\r\n','\n'),'after' in row?row.after:row.before,'auxiliary original/delegate '+row.name);}
 if(process.argv.includes('--provenance'))assert.equal(hash(execFileSync('git',['show',aux.commit+':'+file],{encoding:'utf8'}).replaceAll('\r\n','\n')),file.includes('odyssey')?aux.odyssey.sourceHash:aux.rescues.sourceHash);
}
const os=parse(read('src/engine/nativeQuestOdyssey.ts')),oc=os.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='NativeQuestOdyssey') as ts.ClassDeclaration;
for(const row of aux.odyssey.rows){const prior=parse('class A{'+row.before+'}'),pm=(prior.statements[0] as ts.ClassDeclaration).members[0] as ts.MethodDeclaration,nm=oc.members.find(m=>m.name?.getText(os)===row.name) as ts.MethodDeclaration;assert.equal(emit('function p()'+nm.body!.getText(os)),emit('function p()'+pm.body!.getText(prior)),'shared Odyssey native body '+row.name);}
const odysseyBindings={...bindings,odysseyMilestoneKey,revengeFactionOf,revengeCullId,revengeCommanderId,C,ODYSSEY_SURVEY,ODYSSEY_TUTORIAL_RELEASE,odysseyPressureTier,defeatOdysseyLeader,odysseyAct,odysseyReadiness,odysseySurvives};
const originalOdyssey=new Function(...Object.keys(odysseyBindings),emit('class Archive{'+aux.odyssey.rows.map(r=>r.before).join('\n')+'}\nreturn Archive.prototype;'))(...Object.values(odysseyBindings));
type Lane='archive'|'world'|'core'|'owner';let uidBase=0;
function normalized(v:any,seen=new Map<object,number>()):any{
 if(v instanceof Actor)return {actor:v.id};if(v===null||typeof v!=='object')return typeof v==='function'?'[fn]':v;
 if(seen.has(v))return {ref:seen.get(v)};seen.set(v,seen.size);
 if(v instanceof Set)return [...v].map(x=>normalized(x,seen));if(v instanceof Map)return [...v].map(([k,x])=>[normalized(k,seen),normalized(x,seen)]);
 return Object.fromEntries(Object.keys(v).filter(k=>k!=='accountId').map(k=>[k,k==='uid'&&typeof v[k]==='number'?v[k]-uidBase:normalized(v[k],seen)]));
}
function fixture(lane:Lane,hosted=false){
 uidBase=nextItemUid();const w:any=makeSimWorld('warrior',5513);window.localStorage.clear();w.questSeat=null;w.ownQuestLedger=newQuestLedger();w.ledger={};w.account.ledger={};w.accountDirty=false;w.player.level=80;w.meta.xp=0;w.meta.xpNeeded=1e12;
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
 if(lane==='archive')for(const row of aux.odyssey.rows)w.odyssey[row.name]=originalOdyssey[row.name];
 if(lane==='owner')quest=owner;
 else{quest=w;if(lane==='archive')for(const row of archive.rows)w[row.name]=original[row.name];if(lane==='core')for(const row of archive.rows)w[row.name]=(...a:any[])=>(core as any)['scene'+cap(row.name)](w,...a);}
 if(hosted){w.localSeat.keeper={reviveSec:3};}
 const host=lane==='owner'?owner.host:w;
 const journal=(s=w.localSeat)=>w.questLedgerOf(s);
 return {lane,w,area,scene,geometry,physical,campaign,owner,quest,host,authority,binding,rebuilds,notices,journal,
  seat(id:string,x=0,y=0){const s=w.addSeat(id,CLASSES.find(c=>c.id==='warrior')!,new NullInput(),{startingCompanions:false,startingFlasks:false});s.actor.pos={x:w.player.pos.x+x,y:w.player.pos.y+y};s.actor.level=80;s.meta.xp=0;s.meta.xpNeeded=1e12;authority.claim(binding,[s.actor]);return s;},
  giver(q:any){for(const id of new Set<string>((Array.isArray(q.turnIn?.giver??q.giver)?q.turnIn?.giver??q.giver:[q.turnIn?.giver??q.giver]).filter(Boolean))){const a=area.input.population.createMonster(id,1,'player');a.pos={x:w.player.pos.x+20,y:w.player.pos.y};scene.actors.push(a);authority.claim(binding,[a]);}},
  add(q:any,seat=w.localSeat){const row={questId:q.id,zoneId:scene.zone.id,fieldDone:false};journal(seat).active.push(row);return row;},
  snapshot(){return normalized({book:w.ownQuestLedger,seatBooks:w.seatQuests,ledger:w.ledger,accountLedger:w.account.ledger,features:w.account.features,dirty:w.accountDirty,charDirty:w.charDirty,
   meta:{xp:w.meta.xp,passive:w.meta.passivePoints,vocation:w.meta.vocationPoints,vocations:w.meta.vocations,allocated:w.meta.allocated,items:w.meta.items},
   drops:physical.input.state.drops,texts:area.objectiveController.input.state.texts,flashes:geometry.flashes,requested:host.questRewardRequested,shown:host.questRewardShown,
   actors:scene.actors.map(a=>({id:a.id,state:captureNativeActorState(a)})),odyssey:w.odyssey.state,graph:w.zoneMap,surveyed:w.surveyed,visited:w.visited,zoneMemory:w.zoneMemory,saved:(()=>{const raw=window.localStorage.getItem(charKeyFor(CHAR_SLOT));if(!raw)return null;const save=JSON.parse(raw);return {quests:save.world?.quests,items:save.items,ledger:save.ledger,level:save.level,xp:save.xp,vocations:save.vocations,passivePoints:save.passivePoints};})(),rebuilds,notices,scope:w.questSeat?.id??null});}};
}
type F=ReturnType<typeof fixture>;const receipts:any[]=[];
function compare(label:string,run:(f:F)=>unknown,hosted=false){
 const lane=(mode:Lane)=>{const rng=new Rng(4721),draws:number[]=[],prior=Math.random,priorNow=Date.now,radius=COOP_SCALING.shareRadius;Date.now=()=>1720000000000;Math.random=()=>{const n=rng.next();draws.push(n);return n;};try{const f=fixture(mode,hosted);let result,error;try{result=run(f);}catch(e){error=(e as Error).message;}return {result:normalized(result),error,state:f.snapshot(),rng:rng.snapshot(),draws,uid:nextItemUid()-uidBase};}finally{Math.random=prior;Date.now=priorNow;COOP_SCALING.shareRadius=radius;}};
 const before=lane('archive');for(const l of ['world','core','owner'] as const)assert.deepEqual(lane(l),before,label+' '+l);assert.equal(before.error,undefined,label);receipts.push({label,hash:hash(JSON.stringify(before))});
}
const rows=Object.values(QUESTS),representatives=new Map<string,typeof rows[number]>();
for(const q of rows){for(const [feature,value] of Object.entries(q.reward))if(value!==undefined&&!representatives.has('reward:'+feature))representatives.set('reward:'+feature,q);if(q.collect)representatives.set('collect:'+q.id,q);if(q.rescue)representatives.set('rescue:'+q.id,q);if(q.reward.grantVocation)representatives.set('vocation:'+q.reward.grantVocation,q);}
for(const [family,q] of representatives)compare('registered '+family+' '+q.id,f=>{
 const row=f.add(q);f.giver(q);f.w.completedObjectives.add(f.scene.zone.id);f.quest.onQuestZoneFieldCleared(f.scene.zone.id);
 if(q.turnIn){assert.equal(row.fieldDone,true);if(q.collect){const d=f.physical.input.state.drops.find(d=>d.item.kind==='gear'&&d.item.item.questId===q.id);assert.ok(d);if(d.item.kind==='gear')assert.equal(autoPlace(f.w.meta.items,d.item.item),true);f.physical.input.state.drops.splice(f.physical.input.state.drops.indexOf(d),1);}
  const choice=questRewardChoices(f.w.account,q)[0];if(choice)assert.equal(f.quest.claimQuestReward(q.id,choice.id),true);else f.quest.onQuestZoneCleared(row);
 }
 assert.equal(f.journal().active.includes(row),false);const before=f.physical.input.state.drops.length;f.quest.onQuestZoneCleared(row);assert.equal(f.physical.input.state.drops.length,before);
});
compare('nested throwing hand scope restores both levels',f=>{const first={...f.w.localSeat,id:'first'},second={...f.w.localSeat,id:'second'};f.quest.withQuestHand(first,()=>{assert.equal(f.owner.questHand(),first);assert.throws(()=>f.quest.withQuestHand(second,()=>{assert.equal(f.owner.questHand(),second);throw Error('nested');}),/nested/);assert.equal(f.owner.questHand(),first);});assert.equal(f.w.questSeat,null);});
compare('unknown quest keeps native consume behavior',f=>{const row=f.add({id:'missing-native-row'});f.quest.onQuestZoneCleared(row);assert.equal(f.journal().active.length,0);});
compare('authored rescue cargo restore does not repay',f=>{const q=rows.find(q=>q.collect)!,row=f.add(q);row.fieldDone=true;f.quest.ensureQuestCargo();const saved=f.physical.captureZoneContents();f.physical.restoreZoneContents(saved);f.quest.ensureQuestCargo();assert.equal(f.physical.input.state.drops.filter(d=>d.item.kind==='gear'&&d.item.item.questId===q.id).length,1);});
compare('real Odyssey operation callback',f=>{const state=f.w.odyssey.state=newOdyssey(f.w.manifest.seed,f.w.account.ledger),id=state.roster[0],q=QUESTS[odysseyQuestId(id,'operation')],row=f.add(q);f.quest.onQuestZoneCleared(row);assert.ok(state.prepared.includes(id));});

compare('hosted field credits nearby party and explicit distant author only',f=>{
 COOP_SCALING.shareRadius=100;const a=f.seat('author',1200),b=f.seat('party',10),c=f.seat('outsider',15),dead=f.seat('dead',5),down=f.seat('down',8),merc=f.seat('merc',9);
 f.w.sameSeatParty=(x:string,y:string)=>['author','party'].includes(x)&&['author','party'].includes(y);dead.actor.dead=true;down.actor.downed=true;merc.merc={};
 const q=rows.find(q=>q.turnIn&&!q.collect&&!q.rescue)!,rs=[a,b,c,dead,down,merc].map(s=>f.add(q,s));
 const given=f.quest.creditedHands([f.w.player.pos],a).map((s:any)=>s.id);assert.deepEqual(given,['author','party']);
 f.quest.onQuestZoneFieldCleared(f.scene.zone.id,[f.w.player.pos],a);assert.deepEqual(rs.map(r=>r.fieldDone),[true,true,false,false,false,false]);
 assert.equal(f.w.questSeat,null);assert.equal(f.quest.nearestHand([b.actor.pos]),b);
},true);
compare('hosted cargo allocates one per owing hand and respects restored physical drops',f=>{
 const a=f.seat('first',10),b=f.seat('second',20),q=rows.find(q=>q.collect)!;f.add(q,a).fieldDone=true;f.add(q,b).fieldDone=true;
 f.quest.ensureQuestCargo();assert.equal(f.physical.input.state.drops.length,2);
 const save=f.physical.captureZoneContents();f.physical.restoreZoneContents(save);f.quest.ensureQuestCargo();assert.equal(f.physical.input.state.drops.length,2);
 const drop=f.physical.input.state.drops.shift()!;assert.equal(drop.item.kind,'gear');if(drop.item.kind==='gear')autoPlace(a.meta.items,drop.item.item);
 f.quest.ensureQuestCargo();assert.equal(f.physical.input.state.drops.length,1);
},true);
compare('scoped hosted payout consumes only the selected hand ledger',f=>{
 const a=f.seat('first',10),b=f.seat('second',20),q=rows.find(q=>q.reward.passivePoints&&!q.collect)!,ra=f.add(q,a),rb=f.add(q,b);
 f.quest.withQuestHand(b,()=>f.quest.onQuestZoneCleared(rb));assert.ok(f.journal(a).active.includes(ra));assert.ok(!f.journal(b).active.includes(rb));assert.ok(f.journal(b).keys[questDoneKey(q.id)]);assert.ok(!f.journal(a).keys[questDoneKey(q.id)]);
},true);
for(const state of ['dead','downed','client','guest','bad-choice','giver-away'])compare('claim refusal '+state,f=>{
 const q=rows.find(q=>q.turnIn&&(q.reward.choices?.length||q.reward.skillChoice))!,r=f.add(q);r.fieldDone=true;f.giver(q);const choice=questRewardChoices(f.w.account,q)[0];
 if(state==='dead')f.w.player.dead=true;if(state==='downed')f.w.player.downed=true;if(state==='client')f.w.clientActionHook=()=>{};
 if(state==='giver-away')for(const a of f.scene.actors)if(a!==f.w.player)a.pos={x:5000,y:5000};
 const claimant=state==='guest'?f.seat('guest',0):f.w.localSeat;
 assert.equal(f.quest.claimQuestReward(q.id,state==='bad-choice'?'no-choice':choice.id,claimant),false);assert.ok(f.journal().active.includes(r));
});
compare('choice save uses actual campaign writer and includes consumed row',f=>{
 const q=rows.find(q=>q.turnIn&&!q.collect&&(q.reward.choices?.length||q.reward.skillChoice))!,r=f.add(q);r.fieldDone=true;f.giver(q);assert.equal(f.quest.claimQuestReward(q.id,questRewardChoices(f.w.account,q)[0].id),true);
 const body=window.localStorage.getItem(charKeyFor(CHAR_SLOT));assert.ok(body,'actual native character mirror must be written');assert.ok(!f.journal().active.includes(r));const save=JSON.parse(body!);assert.ok(JSON.stringify(save).includes(q.id),'serialized completion receipt');
});
compare('real Odyssey leader callback and graph progression',f=>{
 const state=f.w.odyssey.state=newOdyssey(f.w.manifest.seed,f.w.account.ledger),id=state.roster[0],q=QUESTS[odysseyQuestId(id,'leader')],row=f.add(q);f.quest.onQuestZoneCleared(row);assert.ok(state.defeated.includes(id));
});
compare('actual Odyssey enrollment creates native graph and later reuses it',f=>{
 const q=QUESTS[odysseyQuestId('bandit','operation')];f.quest.enrollOdysseyQuest(q,true);const zone=f.w.zoneMap['quest_'+q.id];assert.ok(zone);const count=Object.keys(f.w.zoneMap).length;f.quest.enrollOdysseyQuest(q,true);assert.equal(Object.keys(f.w.zoneMap).length,count);assert.equal(f.journal().active.filter((r:any)=>r.questId===q.id).length,1);
});

compare('cold native restore retains choice completion and exact item',f=>{
 const q=rows.find(q=>q.turnIn&&!q.collect&&(q.reward.choices?.length||q.reward.skillChoice))!,r=f.add(q);r.fieldDone=true;f.giver(q);assert.equal(f.quest.claimQuestReward(q.id,questRewardChoices(f.w.account,q)[0].id),true);
 const save=JSON.parse(window.localStorage.getItem(charKeyFor(CHAR_SLOT))!);const cold=makeSimWorld('warrior',5513);assert.equal(applySavedCharacter(cold,save),true);assert.equal(cold.adoptWorldState(save.world),true);cold.resumeSpawn('exact',save.world.player);
 assert.ok(cold.completedQuests.has(q.id));assert.ok(!cold.activeQuests.some(a=>a.questId===q.id));assert.equal(cold.meta.items.length,f.w.meta.items.length);assert.deepEqual(cold.meta.items.map(i=>i.uid),f.w.meta.items.map((i:any)=>i.uid));
 return {book:cold.ownQuestLedger,items:cold.meta.items,ledger:cold.ledger};
});
compare('full real bag caches choice but pays no reward until capacity opens',f=>{
 const q=rows.find(q=>q.turnIn&&!q.collect&&q.reward.choices?.length)!,r=f.add(q);r.fieldDone=true;f.giver(q);const choice=questRewardChoices(f.w.account,q)[0];
 f.w.meta.items=[];for(let y=0;y<bagHeight();y++)for(let x=0;x<bagWidth();x++)f.w.meta.items.push({uid:nextItemUid(),baseId:'ring_iron',name:'space',rarity:'common',ilvl:1,tier:1,baseRoll:0,affixes:[],implicitRolls:[],x,y});
 const xp=f.w.meta.xp;assert.equal(f.quest.claimQuestReward(q.id,choice.id),false);assert.equal(f.w.meta.xp,xp);assert.ok(f.journal().active.includes(r));const cached=f.journal().rewardItems.get(q.id+':'+choice.id);assert.ok(cached);assert.equal(window.localStorage.getItem(charKeyFor(CHAR_SLOT)),null);
 f.w.meta.items=[];assert.equal(f.quest.claimQuestReward(q.id,choice.id),true);assert.equal(f.w.meta.items[0],cached);
});
compare('rebuild failure preserves native partial vocation mutation and restores hand',f=>{
 const q=rows.find(q=>q.reward.grantVocation)!,seat=f.w.localSeat;f.w.recalcSeat=()=>{throw Error('rebuild-fault');};
 assert.throws(()=>f.quest.withQuestHand(seat,()=>f.quest.grantVocation(q.reward.grantVocation)),/rebuild-fault/);assert.equal(f.w.questSeat,null);assert.ok(seat.meta.vocations.includes(q.reward.grantVocation));assert.ok(f.w.account.ledger[vocationLedgerKey(q.reward.grantVocation!)]);
});
compare('Odyssey state reassignment remains live',f=>{
 const initial=f.w.odyssey.state=newOdyssey(f.w.manifest.seed,f.w.account.ledger),replacement=newOdyssey(f.w.manifest.seed,f.w.account.ledger);f.w.odyssey.state=replacement;
 const id=replacement.roster[0],q=QUESTS[odysseyQuestId(id,'operation')];f.quest.onQuestZoneCleared(f.add(q));assert.deepEqual(initial.prepared,[]);assert.ok(replacement.prepared.includes(id));
});

withSeededRandom(4721,()=>{
 const f=fixture('owner',true),a=f.seat('area-a'),b=f.seat('area-b');
 const definition=structuredClone(f.scene.zone);definition.id='retained_quest_peer';f.w.zoneMap[definition.id]=definition;
 const nextInput:any=freshAssemblyInput(f.w,definition,f.campaign);nextInput.initialActors=[f.w.player];nextInput.services.objectiveProgression=f.owner.input.progression;
 let peerQuest:NativeAreaSceneQuests;nextInput.services.objectiveQuests={questLedgerOf:f.campaign.questLedgerOf,onQuestZoneFieldCleared:(...args:any[])=>(peerQuest.onQuestZoneFieldCleared as Function)(...args)};
 const peer=new NativeAreaSceneAssembly(nextInput),scene=peer.input.scene;scene.actors=[b.actor];scene.player=b.actor;f.scene.actors=[a.actor];f.scene.player=a.actor;
 const peerBinding=f.authority.register(scene,{loot:peer.lootController,objective:peer.objectiveController});f.authority.transfer(b.actor,f.binding,peerBinding);peer.scenePresence.activate(f.authority);
 const presenceA=f.area.scenePresence,presenceB=peer.scenePresence;
 const first=new NativeAreaSceneQuests({...f.owner.input,scenePresence:presenceA});
 peerQuest=new NativeAreaSceneQuests({...f.owner.input,scene,geometry:peer.input.geometry,population:peer.input.population,physical:peer.input.physical,loot:peer.lootController,bounty:peer.input.bounty,graph:peer.graph,coast:peer.input.coast,runtimeBirth:peer.input.registry.input.birth,state:freshSceneQuestState(),scenePresence:presenceB,objective:peer.objectiveController,interaction:peer.input.geometry});
 const q=rows.find(q=>q.collect)!,ra=f.add(q,a),rb=f.add(q,b);ra.fieldDone=true;rb.fieldDone=true;rb.zoneId=scene.zone.id;
 first.ensureQuestCargo();peerQuest.ensureQuestCargo();assert.equal(f.physical.input.state.drops.length,1);assert.equal(peer.input.physical.input.state.drops.length,1);
 assert.deepEqual(first.handSeats(),[a]);assert.deepEqual(peerQuest.handSeats(),[b]);assert.equal(f.campaign.questLedgerOf(b),f.journal(b));
 const saved=f.physical.captureZoneContents();f.physical.restoreZoneContents(saved);first.ensureQuestCargo();peerQuest.ensureQuestCargo();assert.equal(f.physical.input.state.drops.length,1);assert.equal(peer.input.physical.input.state.drops.length,1);
 first.withQuestHand(a,()=>{assert.equal(peerQuest.questHand(),a);assert.throws(()=>peerQuest.withQuestHand(b,()=>{assert.equal(first.questHand(),b);throw Error('shared-scope');}),/shared-scope/);assert.equal(first.questHand(),a);});assert.equal(f.w.questSeat,null);
 const empty=new NativeAreaSceneQuests({...f.owner.input,scenePresence:{scene:f.scene,seats:[]}});assert.deepEqual(empty.handSeats(),[]);assert.equal(empty.host.questLedgerOf(b),f.journal(b));
 receipts.push({label:'two actual retained areas with the same cargo quest and shared ledger scope',hash:hash(JSON.stringify(normalized({a:f.physical.input.state.drops,b:peer.input.physical.input.state.drops,books:f.w.seatQuests})))});
});

compare('personal generated posting resolves its scoped readiness and prompt',f=>{
 const b=f.seat('posting-owner',10),p={id:'scoped-cull',kind:'cull',boardId:'lastlight',zoneId:f.scene.zone.id,beat:0,pay:{xp:50},cull:{count:3,claimed:3},holder:b.id};
 f.w.ownQuestLedger.hands.push({...p,id:'keeper-other'});Object.defineProperty(f.campaign,'bountyHands',{configurable:true,value:f.w.ownQuestLedger.hands});Object.defineProperty(f.campaign,'activeQuests',{configurable:true,value:f.w.ownQuestLedger.active});
 f.journal(b).hands.push(p);const row=f.add({id:p.id},b);f.quest.withQuestHand(b,()=>f.quest.completeQuestField(row));assert.equal(row.fieldDone,true);assert.ok(f.notices.some(n=>n[0]==='Bounty complete. Return to the board.'));assert.equal(f.w.actingSeat,null);
 f.quest.withQuestHand(b,()=>f.quest.onQuestZoneCleared(row));assert.ok(!f.journal(b).active.includes(row));assert.equal(f.journal(b).keys[LEDGER_BOUNTY_DONE],1);assert.ok(!f.journal(b).keys[questDoneKey(p.id)]);assert.ok(!f.journal(b).completed.has(p.id));
},true);
for(const missing of ['cargo','giver'])compare('native collect refuses missing '+missing,f=>{
 const q=rows.find(q=>q.collect)!,r=f.add(q);r.fieldDone=true;f.giver(q);
 if(missing==='giver'){f.quest.ensureQuestCargo();const d=f.physical.input.state.drops[0];assert.equal(d.item.kind,'gear');if(d.item.kind==='gear')autoPlace(f.w.meta.items,d.item.item);for(const a of f.scene.actors)if(a!==f.w.player)a.pos={x:5000,y:5000};}
 f.quest.onQuestZoneCleared(r);assert.ok(f.journal().active.includes(r));assert.equal(f.w.meta.xp,0);
});

compare('quest drop failure preserves native XP and unpaid row while restoring scope',f=>{
 const q=rows.find(q=>q.reward.gems&&!q.collect&&!q.reward.choices?.length&&!q.reward.skillChoice)!,r=f.add(q);
 const fail=()=>{throw Error('native-drop-fault');};f.w.dropGemAt=fail;f.area.lootController.dropGemAt=fail;
 assert.throws(()=>f.quest.withQuestHand(f.w.localSeat,()=>f.quest.onQuestZoneCleared(r)),/native-drop-fault/);assert.equal(f.w.questSeat,null);assert.ok(f.journal().active.includes(r));assert.ok(!f.journal().completed.has(q.id));assert.equal(f.w.meta.xp,q.reward.xp??0);
});
compare('local text provider stays live and preserves its native receiver',f=>{
 let calls=0;const local=f.area.objectiveController,nativeText=local.text,nativeWorldText=f.w.text;
 local.text=function(...args){assert.equal(this,local);calls++;return nativeText.apply(this,args);};f.w.text=function(...args:any[]){assert.equal(this,f.w);calls++;return nativeWorldText.apply(this,args);};
 f.quest.failNote(f.scene.player,'live-text','native refusal');assert.equal(calls,1);
});
{
 const f=fixture('owner');assert.throws(()=>new NativeAreaSceneQuests({...f.owner.input,scene:{...f.scene}}),/identical retained area/);assert.throws(()=>new NativeAreaSceneQuests({...f.owner.input,campaign:{...f.campaign}}),/identical campaign/);assert.throws(()=>new NativeAreaSceneQuests({...f.owner.input,characterWriter:makeSimWorld('warrior',972)}),/actual campaign character writer/);
 receipts.push({label:'foreign census, campaign and character writer refuse',hash:'constructor-identity'});
}
console.log('PASS draft native quest parity',receipts.length,hash(JSON.stringify(receipts)));

/** These courses use the same explicit publication/progression test boundary as
 * fixture above, with actual distinct geometry/physical/reward owners. Native
 * combat scheduling is not claimed; the carried-body course executes the real
 * native shapeshift first, then admits its exact resulting body. */
let recipientCourses=0;
function separatedRewards(hosted=false){
 const f=fixture('owner',hosted),a=hosted?f.seat('recipient'):f.w.localSeat,b=f.seat('deed');
 a.actor.pos={x:900,y:650};b.actor.pos={x:300,y:300};f.w.sameSeatParty=()=>true;
 const def=structuredClone(f.scene.zone);def.id='recipient_quest_peer';f.w.zoneMap[def.id]=def;
 const input:any=freshAssemblyInput(f.w,def,f.campaign);input.services.objectiveProgression=f.owner.input.progression;
 let quests:NativeAreaSceneQuests;input.services.objectiveQuests={questLedgerOf:f.campaign.questLedgerOf,onQuestZoneFieldCleared:(...args:any[])=>(quests.onQuestZoneFieldCleared as Function)(...args)};
 const area=new NativeAreaSceneAssembly(input),scene=area.input.scene;scene.actors=[b.actor];scene.player=b.actor;f.scene.actors=[a.actor];f.scene.player=a.actor;
 const binding=f.authority.register(scene,{loot:area.lootController,objective:area.objectiveController});f.authority.transfer(b.actor,f.binding,binding);area.scenePresence.activate(f.authority);
 quests=new NativeAreaSceneQuests({...f.owner.input,scene,geometry:area.input.geometry,population:area.input.population,physical:area.input.physical,loot:area.lootController,bounty:area.input.bounty,graph:area.graph,coast:area.input.coast,runtimeBirth:area.input.registry.input.birth,state:freshSceneQuestState(),scenePresence:area.scenePresence,objective:area.objectiveController,interaction:area.input.geometry});
 const q=rows.find(q=>!q.turnIn&&!q.collect&&!q.reward.choices?.length&&!q.reward.skillChoice&&q.reward.gems&&q.reward.xp)!;
 const add=(quest=q,seat=a)=>{const row=f.add(quest,seat);row.zoneId=scene.zone.id;return row;};
 return {f,a,b,area,scene,binding,quests,q,add};
}
function recipientCourse(name:string,run:(p:ReturnType<typeof separatedRewards>)=>void,hosted=false){
 const previous=COOP_SCALING.shareRadius;try{withSeededRandom(99127,()=>run(separatedRewards(hosted)));}finally{COOP_SCALING.shareRadius=previous;}
 recipientCourses++;console.log('PASS quest recipient: '+name);
}
for(const radius of [0,100])for(const sameSpot of [false,true])recipientCourse('shared quest, separate owners, radius '+radius+', same coordinates '+sameSpot,p=>{
 const {f,a,b,area,scene,quests,q,add}=p;COOP_SCALING.shareRadius=radius;if(sameSpot)b.actor.pos={...a.actor.pos};const row=add();
 assert.equal(f.journal(a),f.journal(b),'native co-op campaign keeps one ledger');assert.equal(quests.questHand(),a);
 area.objectiveController.completeObjective('Recipient field');
 assert.equal(a.meta.xp,q.reward.xp);assert.ok(b.meta.xp>0&&b.meta.xp<q.reward.xp!,'only local generic objective XP goes to B');
 assert.equal(f.physical.input.state.drops.length,q.reward.gems);assert.equal(area.input.physical.input.state.drops.length,0);
 for(const drop of f.physical.input.state.drops)assert.ok(dist(drop.pos,a.actor.pos)<32,'Memories land at A in A geometry');
 assert.equal(f.area.objectiveController.input.state.texts.length,0);assert.ok(area.objectiveController.input.state.texts.some(t=>t.text.startsWith('Recipient field')));
 assert.ok(f.w.completedObjectives.has(scene.zone.id));assert.ok(!f.journal(a).active.includes(row));
 const drops=f.physical.input.state.drops.length,xp=a.meta.xp;quests.onQuestZoneCleared(row);assert.equal(f.physical.input.state.drops.length,drops);assert.equal(a.meta.xp,xp);
});
recipientCourse('replaced recipient physical store remains live',p=>{
 const {f,area,quests,q,add}=p;COOP_SCALING.shareRadius=0;const old=f.physical.input.state.drops;
 f.physical.restoreZoneContents(f.physical.captureZoneContents());assert.notEqual(f.physical.input.state.drops,old);
 quests.onQuestZoneCleared(add());assert.equal(old.length,0);assert.equal(f.physical.input.state.drops.length,q.reward.gems);assert.equal(area.input.physical.input.state.drops.length,0);
});
recipientCourse('quest cargo stays on the deed ground',p=>{
 const {f,a,b,area,scene,quests,add}=p,q=rows.find(q=>q.collect)!;const row=add(q);quests.onQuestZoneFieldCleared(scene.zone.id);
 assert.equal(row.fieldDone,true);assert.equal(f.physical.input.state.drops.length,0);assert.equal(area.input.physical.input.state.drops.length,1);
 const drop=area.input.physical.input.state.drops[0];assert.equal(drop.item.kind,'gear');if(drop.item.kind==='gear')assert.equal(drop.item.item.questId,q.id);assert.ok(dist(drop.pos,b.actor.pos)<32);assert.equal(a.meta.items.some((i:any)=>i.questId===q.id),false);
});
recipientCourse('hosted distant author and near party each receive their actual area pay',p=>{
 const {f,a,b,area,scene,quests,q,add}=p;COOP_SCALING.shareRadius=100;const ra=add(q,a),rb=add(q,b);
 quests.onQuestZoneFieldCleared(scene.zone.id,[b.actor.pos],a);
 assert.equal(a.meta.xp,q.reward.xp);assert.equal(b.meta.xp,q.reward.xp);assert.equal(f.physical.input.state.drops.length,q.reward.gems);assert.equal(area.input.physical.input.state.drops.length,q.reward.gems);
 assert.ok(!f.journal(a).active.includes(ra));assert.ok(!f.journal(b).active.includes(rb));assert.equal(f.w.questSeat,null);
},true);
recipientCourse('actual carried shapeshift owns recipient pay while flesh is absent',p=>{
 const {f,a,area,quests,q,add}=p;const flesh=a.actor;f.w.executeSkill(flesh,makeSkillInstance(SKILLS.form_of_the_dire_wolf,1),flesh.pos);
 const body=a.actor;assert.notEqual(body,flesh);assert.equal(a.home,flesh);assert.equal(body.possession?.huskMode,'carried');
 f.scene.actors=[body];f.scene.player=body;f.authority.release(f.binding,[flesh]);f.authority.claim(f.binding,[body]);
 assert.equal(f.authority.require(flesh).scene,f.scene);COOP_SCALING.shareRadius=100;quests.onQuestZoneCleared(add());
 assert.equal(a.meta.xp,q.reward.xp);assert.equal(f.physical.input.state.drops.length,q.reward.gems);assert.equal(area.input.physical.input.state.drops.length,0);
 for(const drop of f.physical.input.state.drops)assert.ok(dist(drop.pos,body.pos)<32);
});
recipientCourse('native Odyssey leader bonus follows campaign hero rather than deed representative',p=>{
 const {f,a,b,area,quests,add}=p;COOP_SCALING.shareRadius=100;
 const state=f.w.odyssey.state=newOdyssey(f.w.manifest.seed,f.w.account.ledger),id=state.roster[0],q=QUESTS[odysseyQuestId(id,'leader')];
 const passive=a.meta.passivePoints,vocation=a.meta.vocationPoints,row=add(q);quests.onQuestZoneCleared(row);
 assert.ok(state.defeated.includes(id));assert.equal(a.meta.passivePoints,passive+C.passivePointsPerLeader+(q.reward.passivePoints??0));assert.equal(a.meta.vocationPoints,vocation+C.pointsPerLeader+(q.reward.vocationPoints??0));
 assert.equal(a.meta.xp,2000*odysseyAct(state)+(q.reward.xp??0));assert.equal(b.meta.xp,0);
 assert.equal(f.physical.input.state.drops.length,C.gemsPerLeader+(q.reward.gems??0));assert.equal(area.input.physical.input.state.drops.length,0);
 for(const drop of f.physical.input.state.drops)assert.ok(dist(drop.pos,a.actor.pos)<32);assert.ok(!f.journal(a).active.includes(row));
});
recipientCourse('actor-explicit vocation and hero/couch failure text use recipient stores',p=>{
 const {f,a,b,area,quests}=p,voc=Object.keys(VOCATIONS).find(id=>!a.meta.vocations.includes(id))!;
 assert.equal(quests.grantVocation(voc,a),true);assert.equal(f.area.objectiveController.input.state.texts.length,2);assert.equal(area.objectiveController.input.state.texts.length,0);
 quests.failNote(a.actor,'recipient-hero','hero refusal');assert.equal(f.area.objectiveController.input.state.texts.at(-1)?.text,'hero refusal');assert.equal(area.objectiveController.input.state.texts.length,0);
 b.couch={pad:0,side:'right'};f.owner.failNote(b.actor,'recipient-couch','couch refusal');assert.equal(area.objectiveController.input.state.texts.at(-1)?.text,'couch refusal');
});
recipientCourse('nested payout restores outer hand and live native receiver',p=>{
 const {f,a,b,area,quests,q,add}=p;COOP_SCALING.shareRadius=0;
 const inner=rows.find(r=>r.id!==q.id&&!r.turnIn&&!r.collect&&!r.reward.choices?.length&&!r.reward.skillChoice&&r.reward.gems&&r.reward.xp)!,outerRow=add(),innerRow=add(inner);
 const drop=f.area.lootController.dropGemAt;let entered=false;
 f.area.lootController.dropGemAt=function(...args){assert.equal(this,f.area.lootController);if(!entered){entered=true;quests.withQuestHand(b,()=>quests.onQuestZoneCleared(innerRow));assert.equal(quests.questHand(),a);}return drop.apply(this,args);};
 quests.onQuestZoneCleared(outerRow);assert.equal(a.meta.xp,q.reward.xp);assert.equal(b.meta.xp,inner.reward.xp);
 assert.equal(f.physical.input.state.drops.length,q.reward.gems);assert.equal(area.input.physical.input.state.drops.length,inner.reward.gems);assert.equal(f.w.questSeat,null);
});
recipientCourse('nested payout error preserves partial effects and clears both scopes',p=>{
 const {f,a,b,area,quests,q,add}=p;COOP_SCALING.shareRadius=0;
 const inner=rows.find(r=>r.id!==q.id&&!r.turnIn&&!r.collect&&!r.reward.choices?.length&&!r.reward.skillChoice&&r.reward.gems&&r.reward.xp)!,outerRow=add(),innerRow=add(inner);
 const outerDrop=f.area.lootController.dropGemAt,innerDrop=area.lootController.dropGemAt;
 area.lootController.dropGemAt=()=>{throw Error('recipient nested drop fault');};
 f.area.lootController.dropGemAt=function(...args){assert.equal(this,f.area.lootController);quests.withQuestHand(b,()=>quests.onQuestZoneCleared(innerRow));return outerDrop.apply(this,args);};
 assert.throws(()=>quests.onQuestZoneCleared(outerRow),/recipient nested drop fault/);assert.equal(f.w.questSeat,null);
 assert.equal(a.meta.xp,q.reward.xp);assert.equal(b.meta.xp,inner.reward.xp);assert.ok(f.journal().active.includes(outerRow));assert.ok(f.journal().active.includes(innerRow));assert.equal(f.physical.input.state.drops.length,0);
 f.area.lootController.dropGemAt=outerDrop;area.lootController.dropGemAt=innerDrop;
 quests.host.dropGemAt(b.actor.pos,undefined,true,'quest');assert.equal(area.input.physical.input.state.drops.length,1);assert.equal(f.physical.input.state.drops.length,0,'outside payout remains source-local after throw');
});
for(const fault of ['foreign','unadmitted','wrong-services'] as const)recipientCourse('recipient refusal '+fault+' keeps native first-effect order',p=>{
 const {f,a,area,quests,add}=p,row=add();let seat=a;
 if(fault==='foreign')seat={...a,id:'foreign',actor:new Actor('foreign','player',{x:900,y:650})};
 if(fault==='unadmitted')f.scene.actors.push(new Actor('unowned','enemy',{x:950,y:650}));
 if(fault==='wrong-services'){f.authority.release(f.binding,[a.actor]);f.authority.unregister(f.binding);const bad=f.authority.register(f.scene,{loot:area.lootController,objective:f.area.objectiveController});f.authority.claim(bad,[a.actor]);}
 quests.withQuestHand(seat,()=>{
  quests.onQuestZoneCleared({questId:'not-held',zoneId:p.scene.zone.id,fieldDone:false}); // no eager authority lookup before native row guard
  assert.throws(()=>quests.onQuestZoneCleared(row),fault==='foreign'?/Missing native actor/:fault==='unadmitted'?/unowned or borrowed/:/actual recipient reward owners/);
 });
 assert.equal(a.meta.xp,0);assert.equal(f.physical.input.state.drops.length,0);assert.equal(area.input.physical.input.state.drops.length,0);assert.ok(f.journal().active.includes(row));assert.equal(f.w.questSeat,null);
});
recipientCourse('native hand lookup is retained across later scope changes',p=>{
 const {f,a,b,area,quests,q,add}=p;COOP_SCALING.shareRadius=0;
 const grant=f.area.objectiveController.grantXp,hand=quests.questHand;let reads=0;
 quests.questHand=(...args)=>{reads++;return hand.apply(quests,args);};
 f.area.objectiveController.grantXp=function(...args){assert.equal(this,f.area.objectiveController);const result=grant.apply(this,args);f.w.questSeat=b;f.w.actingSeat=b;return result;};
 quests.withQuestHand(a,()=>quests.onQuestZoneCleared(add()));
 assert.equal(reads,1,'native payout selects its hand once');assert.equal(a.meta.xp,q.reward.xp);assert.equal(b.meta.xp,0);
 assert.equal(f.physical.input.state.drops.length,q.reward.gems);assert.equal(area.input.physical.input.state.drops.length,0);assert.equal(f.w.questSeat,null);
});
recipientCourse('selected hand follows its actual controlled body after an XP callback shapeshift',p=>{
 const {f,a,b,area,quests,q,add}=p;COOP_SCALING.shareRadius=0;const flesh=a.actor,grant=f.area.objectiveController.grantXp;
 f.area.objectiveController.grantXp=function(...args){
  const result=grant.apply(this,args);f.w.executeSkill(flesh,makeSkillInstance(SKILLS.form_of_the_dire_wolf,1),flesh.pos);
  const body=a.actor;assert.notEqual(body,flesh);f.scene.actors=[body];f.scene.player=body;f.authority.release(f.binding,[flesh]);f.authority.claim(f.binding,[body]);
  f.w.questSeat=b;return result;
 };
 quests.withQuestHand(a,()=>quests.onQuestZoneCleared(add()));assert.equal(f.authority.require(flesh).scene,f.scene);
 assert.equal(a.meta.xp,q.reward.xp);assert.equal(b.meta.xp,0);assert.equal(f.physical.input.state.drops.length,q.reward.gems);assert.equal(area.input.physical.input.state.drops.length,0);assert.equal(f.w.questSeat,null);
});
for(const hosted of [false,true])recipientCourse('Odyssey original recipient survives XP callback hand change, hosted '+hosted,p=>{
 const {f,a,b,area,quests}=p;COOP_SCALING.shareRadius=0;
 const state=f.w.odyssey.state=newOdyssey(f.w.manifest.seed,f.w.account.ledger),id=state.roster[0],grant=f.area.objectiveController.grantXp;
 f.area.objectiveController.grantXp=function(...args){const result=grant.apply(this,args);f.w.questSeat=b;f.w.actingSeat=b;return result;};
 quests.withQuestHand(a,()=>quests.odyssey.questCompleted(odysseyQuestId(id,'leader')));
 assert.ok(state.defeated.includes(id));assert.equal(a.meta.xp,2000*odysseyAct(state));assert.equal(b.meta.xp,0);
 assert.equal(f.physical.input.state.drops.length,C.gemsPerLeader);assert.equal(area.input.physical.input.state.drops.length,0);assert.equal(f.w.questSeat,null);
},hosted);
for(const kind of ['choice','collect'] as const)recipientCourse('equal-coordinate foreign '+kind+' giver refuses until actual body transfer',p=>{
 const {f,a,b,area,scene,binding,quests,add}=p;COOP_SCALING.shareRadius=0;a.actor.pos={...b.actor.pos};
 const q=kind==='choice'?rows.find(q=>q.turnIn&&!q.collect&&(q.reward.choices?.length||q.reward.skillChoice))!:rows.find(q=>q.collect)!;
 const row=add(q);row.fieldDone=true;
 if(q.collect){quests.ensureQuestCargo();const drop=area.input.physical.input.state.drops.shift()!;assert.equal(drop.item.kind,'gear');if(drop.item.kind==='gear')assert.equal(autoPlace(a.meta.items,drop.item.item),true);}
 const givers=(Array.isArray(q.turnIn!.giver)?q.turnIn!.giver:[q.turnIn!.giver]).map(id=>{const actor=area.input.population.createMonster(id,1,'player');actor.pos={x:b.actor.pos.x+20,y:b.actor.pos.y};scene.actors.push(actor);f.authority.claim(binding,[actor]);return actor;});
 const choice=questRewardChoices(f.w.account,q)[0];
 const claim=()=>kind==='choice'?quests.claimQuestReward(q.id,choice.id,a):quests.onQuestZoneCleared(row);
 const before=JSON.stringify({items:a.meta.items,xp:a.meta.xp,passive:a.meta.passivePoints,vocation:a.meta.vocationPoints,shown:quests.input.state.questRewardShown,requested:quests.input.state.questRewardRequested,save:window.localStorage.getItem(charKeyFor(CHAR_SLOT)),aDrops:f.physical.input.state.drops,bDrops:area.input.physical.input.state.drops});
 assert.equal(quests.giverPresent(q.turnIn!.giver),null);if(kind==='choice')assert.equal(claim(),false);else claim();
 assert.ok(f.journal(a).active.includes(row));assert.equal(JSON.stringify({items:a.meta.items,xp:a.meta.xp,passive:a.meta.passivePoints,vocation:a.meta.vocationPoints,shown:quests.input.state.questRewardShown,requested:quests.input.state.questRewardRequested,save:window.localStorage.getItem(charKeyFor(CHAR_SLOT)),aDrops:f.physical.input.state.drops,bDrops:area.input.physical.input.state.drops}),before,'foreign giver cannot consume cargo, pay, request UI or save');
 f.scene.actors=f.scene.actors.filter(actor=>actor!==a.actor);scene.actors.push(a.actor);f.authority.transfer(a.actor,f.binding,binding);
 for(const giver of givers)giver.dead=true;assert.equal(quests.giverPresent(q.turnIn!.giver),null);for(const giver of givers)giver.dead=false;
 assert.ok(quests.giverPresent(q.turnIn!.giver));
 if(kind==='choice'){a.actor.dead=true;assert.equal(claim(),false);a.actor.dead=false;assert.equal(claim(),true);}else{
  const flesh=a.actor;f.w.executeSkill(flesh,makeSkillInstance(SKILLS.form_of_the_dire_wolf,1),flesh.pos);const body=a.actor;assert.notEqual(body,flesh);
  scene.actors=scene.actors.filter(actor=>actor!==flesh);scene.actors.push(body);f.authority.release(binding,[flesh]);f.authority.claim(binding,[body]);
  assert.ok(quests.giverPresent(q.turnIn!.giver),'actual carried control, not absent flesh, reaches the giver');claim();
 }
 assert.ok(!f.journal(a).active.includes(row));assert.equal(f.w.questSeat,null);
});
console.log('PASS native quest recipient routing',recipientCourses);
