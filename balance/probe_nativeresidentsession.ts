import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import ts from 'typescript';
import * as dialogueData from '../src/data/npcDialogues';
import {MONSTERS} from '../src/data/monsters';
import {npcDwellRadius} from '../src/data/transit';
import {dist} from '../src/core/math';
import {dialoguePages} from '../src/engine/dialogue';
import {FOURTH_WALL_CFG,fallbackRect} from '../src/engine/fourthwall';
import {createHash} from 'node:crypto';
import {makeSimWorld} from '../src/sim/arena';
import {World,NAV_CFG} from '../src/engine/world';
import {Rng,withSeededRandom} from '../src/core/rng';
import {START_ZONE,HUB_ZONE} from '../src/data/zones';
import {townStationFeatures} from '../src/data/townBuild';
import {NPC_DIALOGUES,NPC_DIALOGUE_FACTS,NPC_APPEARANCES} from '../src/data/npcDialogues';
import {BRANDT_HAMMER_QUEST} from '../src/data/brandt';
import {questDoneKey,FEATURE} from '../src/meta/account';
import {RELIQUARY_CFG} from '../src/data/reliquary';
import {ORACLE_RESCUED} from '../src/data/oracle';
import {QUESTS} from '../src/quests/defs';
import {generateLayout} from '../src/engine/levelgen';
import {captureNativeGeneration} from '../src/worldmass/nativeGeneration';
import {NativeAreaSceneGeometry} from '../src/worldmass/nativeAreaSceneGeometry';
import {NativeAreaScenePopulation} from '../src/worldmass/nativeAreaScenePopulation';
import {spawnNativeResidents} from '../src/engine/nativeInhabitants';
import {applyScenePartyScale,scenePartyScaleCount} from '../src/engine/nativeScenePopulation';
import {resetActorIdCounter,type Actor} from '../src/engine/actor';
import {captureNativeActorState} from '../src/worldmass/dormancy';
import {NativeResidentSession} from '../src/worldmass/nativeResidentSession';
import * as candidate from '../src/engine/npcDialogues';

// Pinned complete original director/data plus exact World spatial test fixtures.
// This is a direct lexical oracle; no runtime Git or ignored-file dependency.
const archiveBytes=gunzipSync(Buffer.from('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','base64'));
assert.equal(createHash('sha256').update(archiveBytes).digest('hex'),'101472c8806e2c95ebcb9158fb7009db106fa43964aa72cf704cdbf511f612c9');
const archive=JSON.parse(archiveBytes.toString('utf8'));
const emit=(text:string)=>ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
assert.equal(emit(readFileSync(new URL('../src/engine/npcDialogues.ts',import.meta.url),'utf8')),emit(archive.director.source),'whole director runtime/import identity');
assert.equal(emit(readFileSync(new URL('../src/data/npcDialogues.ts',import.meta.url),'utf8')),emit(archive.data),'complete installed fact source runtime/import identity');
const lexical:Record<string,unknown>={'../data/npcDialogues':dialogueData,'../data/monsters':{MONSTERS},'../data/transit':{npcDwellRadius},'../core/math':{dist},'../core/rng':{Rng},'./dialogue':{dialoguePages}};
const original={} as typeof candidate;
Function('require','exports',emit(archive.director.source))((id:string)=>{assert(Object.hasOwn(lexical,id),'unmapped native import '+id);return lexical[id];},original);
// TEST ONLY: these archived reads are NOT duplicated production services.
// The scene still owes real spatial providers; actual sight is mutable geometry.
const residentSpatial=Function('FOURTH_WALL_CFG','fallbackRect',emit('return ({'+archive.spatial.methods.map((m:any)=>m.text).join(',')+'});'))(FOURTH_WALL_CFG,fallbackRect) as Pick<World,'localZoneAt'|'isSafeAt'|'viewRectFor'>;
function runLane(mode:'original'|'local'){

const local=mode==='local',modules=local?candidate:original;
function snap(v:any):any {const seen=new Map<object,number>();function rec(x:any):any{if(x===undefined)return{$undefined:true};if(typeof x==='function')return{$function:true};if(x===null||typeof x!=='object')return x;if(seen.has(x))return{$ref:seen.get(x)};seen.set(x,seen.size);if(x instanceof Map)return{$map:[...x].map(([k,v])=>[rec(k),rec(v)])};if(x instanceof Set)return{$set:[...x].map(rec)};if(Array.isArray(x))return x.map(rec);return Object.fromEntries(Object.keys(x).map(k=>[k,rec(x[k])]));}return rec(v);}
const hash=(v:any)=>createHash('sha256').update(JSON.stringify(snap(v))).digest('hex');
const world:any=withSeededRandom(5517,()=>makeSimWorld('warrior',991));
for(const flag of townStationFeatures())world.account.features.add(flag);
world.account.ledger[ORACLE_RESCUED]=1;
withSeededRandom(809,()=>world.loadZone(START_ZONE));
const zone=world.zone,arena=world.arena,entry={...world.zoneEntry},exits=world.exits.map((e:any)=>({...e,pos:{...e.pos}})),hero:Actor=world.player;
const layout=captureNativeGeneration(zone,()=>generateLayout(zone,arena,new Rng(world.currentZoneSeed),entry,exits.map((e:any)=>e.pos),[])).value;
assert(layout.npcs.some(n=>n.id==='townsfolk_smith'));assert(layout.npcs.some(n=>n.id==='townsfolk_innkeep'));
const census={zone,actors:[hero],player:hero};
const trace:any[]=[],calls:any[]=[],rng:any[]=[],logs:any[]=[];
const roots=archive.director.roots as string[];
const methodNames=archive.director.methods as string[];
let recording=false;
const record=(key:string)=>{if(recording)trace.push(['get',key]);};
const wrapMethod=(key:string,fn:Function,receiver:object)=>function(...args:any[]){if(recording)calls.push([key,hash(args)]);return fn.apply(receiver,args);};
const observed=(provider:any)=>new Proxy(provider,{get(target,key,receiver){if(typeof key==='string'&&roots.includes(key))record(key);const v=Reflect.get(target,key,receiver);return v;},set(target,key,value,receiver){if(recording&&typeof key==='string'&&roots.includes(key))trace.push(['set',key,hash(value)]);return Reflect.set(target,key,value,receiver);}});
const campaignFields=['account','ledger','activeQuests','manifest','accountDirty','charDirty','time','localSeat','questImbues','massSettlementDay'];
const campaignMethods=['questStanding','questDefOf','metaProgressionActive','reliquaryLesson','mireilleLessonLived','mireilleGiftOwed','mireilleGiftLesson'];
const campaign:any={};for(const key of campaignFields)Object.defineProperty(campaign,key,{enumerable:true,get(){return world[key];},set(v){world[key]=v;}});
for(const key of campaignMethods){const fn=world[key];campaign[key]=wrapMethod(key,fn,world);}
const seats=world.seats;
let population:NativeAreaScenePopulation|undefined;
const geometry=new NativeAreaSceneGeometry(census,arena,{ledger:world.ledger,seasSeen:world.seasSeen,
 oceanBearing:(...a:any[])=>world.oceanBearing(...a),seaNameOf:(...a:any[])=>world.seaNameOf(...a),notice:(...a:any[])=>world.notice(...a),text:(...a:any[])=>world.text(...a),get time(){return world.time;},get seats(){return seats;},seatOf:(a:Actor)=>world.seatOf(a),drainSurvival:(...a:any[])=>world.drainSurvival(...a),radianceCondHeld:(...a:any[])=>world.radianceCondHeld(...a),createMonster:(...args:Parameters<NativeAreaScenePopulation['createMonster']>)=>{if(!population)throw Error('population not bound');return population.createMonster(...args);}}, {navigationPad:NAV_CFG.pad,eventSpacing:240,minPortalSeparation:250});
geometry.currentZoneSeed=world.currentZoneSeed;geometry.exits=exits;geometry.zoneEntry=entry;geometry.adopt(layout,entry);
for(const key of ['walk','tierViews','doodads','grounds','bridges','structures','fog'])world[key]=(geometry as any)[key];world.doodadsRev++;world.convexNav=null;world.tierNavs.clear();world.actors=census.actors;
const spatial:any={massRuntime:world.massRuntime,zone,player:hero,time:world.time,viewFrame:world.viewFrame,viewFrameAt:world.viewFrameAt};
Object.defineProperty(spatial,'time',{get(){return world.time;}});
const localProvider:any={census,scene:world.scene,clientActionHook:world.clientActionHook,exits,massRuntime:world.massRuntime};
for(const key of ['localZoneAt','isSafeAt','viewRectFor'] as const)localProvider[key]=wrapMethod(key,residentSpatial[key],spatial);
localProvider.lineOfSight=wrapMethod('lineOfSight',geometry.lineOfSight,geometry);
const observedCensus=observed(census);localProvider.census=observedCensus;
const session=local?new NativeResidentSession({campaign:observed(campaign),area:{census:observedCensus,local:observed(localProvider)}}):undefined;
const observerWorld=new Proxy(world,{get(target,key){const v=target[key];if(typeof key==='string'&&roots.includes(key)){record(key);return methodNames.includes(key)?wrapMethod(key,v,target):v;}return v;},set(target,key,v){if(recording&&typeof key==='string'&&roots.includes(key))trace.push(['set',key,hash(v)]);target[key]=v;return true;}});
const director:any=session?.npcDialogues??new original.NpcDialogueDirector(observerWorld);
world.npcDialogues=director;
const sources={ambient:world.nativeAmbientHost(),groups:world.nativeEncounterGroupHost(),factory:world.nativeMonsterFactorySources(),promotion:world.nativeMonsterPromotionSources(),hostility:(World as any).nativeHostilitySources(),relay:(World as any).nativeStatusRelaySources()};
const populationCampaign={get zoneMap(){return world.zoneMap;},get time(){return world.time;},get visited(){return world.visited;},get surveyed(){return world.surveyed;},get sim(){return world.sim;},continentFor:(...a:any[])=>world.continentFor(...a)};
const context={get time(){return world.time;},npcDialogues:director,applyPartyScale:(a:Actor)=>applyScenePartyScale({partyScaleCount:()=>scenePartyScaleCount({player:hero,seats})},a),opaqueAt:(x:number,y:number)=>geometry.opaqueAt(x,y),sanctuaryBlocksCombat:world.sanctuaryBlocksCombat.bind(world),resolveHit:world.resolveHit.bind(world)};
if(local)population=new NativeAreaScenePopulation({scene:observedCensus,geometry,campaign:populationCampaign,sources,populationSources:(World as any).nativePopulationSources(),context,state:{squadSequence:900,bombardMintRev:100,zoneGenTagging:false,magicPackEffects:[],magicPackResolving:false,magicPackRefreshPending:false}});
world.squadSeq=900;world.bombardMintRev=100;world.zoneGenTagging=false;
world.speakerRows=new Map();world.speechMemory=new Map();world.speechFocus=new Map();world.speechFocusSpeaker=undefined;world.dialogueScene=0;
const speech:any=session??world;
const inhabitantHost=()=>session?session.inhabitants(population!):world.nativeInhabitantHost();
const poison=new Map<string,PropertyDescriptor|undefined>();
if(local)for(const key of ['npcDialogues','zone','actors','walk','doodads','structures','speakerRows','speechMemory','speechFocus','localZoneAt','isSafeAt','viewRectFor','lineOfSight','nativeInhabitantHost','createMonster','clampPos','findFreeSpot','nativeMonsterFactoryHost']){poison.set(key,Object.getOwnPropertyDescriptor(world,key));Object.defineProperty(world,key,{configurable:true,get(){throw Error('FOREIGN RESIDENT OWNER '+key);}});}
const state=()=>({choices:[...director.choices],visits:[...director.visits],armed:[...director.armed],admittedVisits:[...director.admittedVisits],calling:director.calling?{def:director.calling.def.id,line:{id:director.calling.line.a.id,text:director.calling.line.text,color:director.calling.line.color,seatId:director.calling.line.seatId,delivery:director.calling.line.delivery},until:director.calling.until}:undefined});
const bodies=()=>census.actors.filter(a=>a!==hero).map(a=>({id:a.id,state:captureNativeActorState(a)}));
const next=Rng.prototype.next,ids=new WeakMap<object,number>();let nextId=0;
Rng.prototype.next=function(){if(!ids.has(this))ids.set(this,++nextId);const before=this.snapshot(),v=next.call(this);rng.push([ids.get(this),before,v,this.snapshot()]);return v;};
const die=Math.random;
function course(name:string,fn:()=>any,reads=true){trace.length=0;calls.length=0;const n=rng.length;recording=reads;let out:any,error:any;try{out=fn();}catch(e){error=String(e);}finally{recording=false;}logs.push({name,out:snap(out),error,trace:[...trace],calls:[...calls],rng:rng.slice(n),state:state(),bodies:bodies(),speakers:snap(speech.speakerRows),speechMemory:snap(speech.speechMemory),speechFocus:snap(speech.speechFocus),speechFocusSpeaker:speech.speechFocusSpeaker,dialogueScene:speech.dialogueScene,ledger:snap(world.ledger),accountLedger:snap(world.account.ledger),dirty:[world.charDirty,world.accountDirty]});assert.equal(Math.random,die);if(error)assert(name.startsWith('failure-'),name+': '+error);}
function birth(){resetActorIdCounter(930000+census.actors.length);withSeededRandom(7221,()=>spawnNativeResidents(inhabitantHost(),(World as any).nativeInhabitantSources,zone,layout));}
try{
 course('natural-complete-town-residents',birth,false);assert(census.actors.length>3,'complete nonempty native NPC/folk roster');assert(speech.speakerRows.size>0);
 const smith=census.actors.find(a=>a.defId==='townsfolk_smith')!,inn=census.actors.find(a=>a.defId==='townsfolk_innkeep')!;assert(smith&&inn);
 course('all-installed-native-facts',()=>Object.keys(NPC_DIALOGUE_FACTS).map(fact=>[fact,(modules.dialogueConditionMet as Function)(session?.host??observerWorld,{fact})]));
 course('native-smith-initial-appearance',()=>{assert.equal(smith.look,director.appearanceFor(smith.defId));return smith.look;});
 hero.pos={...smith.pos};course('smith-dwell-visit-zero',()=>{const out=director.dwell(smith);assert(out?.text);return out;});
 course('same-visit-stable-text',()=>director.dwell(smith));course('admitted-then-reader-offer',()=>{director.admitted(smith);const d=director.dwell(smith)!;return director.readerOffer(smith,d.text,70,(text:string)=>text);});
 course('native-guidance',()=>{const guides=director.guidance();assert(guides.length>0);return guides;});
 world.ledger[questDoneKey(BRANDT_HAMMER_QUEST)]=1;course('ledger-switch-factory-shared-appearance',()=>{director.refreshAppearances();assert.equal(smith.look,'npc_smith');const a=local?population!.createMonster('townsfolk_smith',1,'player'):world.createMonster('townsfolk_smith',1,'player');assert.equal(a.look,smith.look);return{id:a.id,state:captureNativeActorState(a),dialogue:director.dwell(smith)};});
 delete world.ledger[questDoneKey(BRANDT_HAMMER_QUEST)];
 // Genuine native callout: move the fixture hero to the actual native HUB exit,
 // with the real geometry ray and native frame resolver. No fabricated clear LOS.
 const road=exits.find((e:any)=>e.to===HUB_ZONE);assert(road,'native Lastlight has its real Crossroads exit');
 hero.pos={x:road.pos.x+1500,y:road.pos.y+1500};course('road-callout-arms-out-of-range',()=>director.callout(false));
 hero.pos={...road.pos};course('road-callout-actual-geometry',()=>{const line=director.callout(true);assert(line&&line.a===inn,'actual visible native road callout');return line;});
 course('retained-callout-and-unadmitted-preview',()=>[director.callout(false),director.callout(true)]);
 course('finish-callout',()=>{director.finish(inn.id);assert.equal(director.calling,undefined);});
 const visitBefore=[...director.visits];const maps=[speech.speakerRows,speech.speechMemory,speech.speechFocus];speech.speechMemory.set(412,{source:'old-area'});speech.speechFocus.set(92,{source:'old-area'});speech.speechFocusSpeaker=412;
 census.actors=[hero];if(!local)world.actors=census.actors;
 course('bind-same-run-keeps-director-and-visits',()=>{if(session)session.bindArea({census:observedCensus,local:observed(localProvider)});assert.deepEqual([...director.visits],visitBefore);return visitBefore;},false);
 course('native-area-reentry-resets-only-transient-state',()=>{birth();assert.deepEqual([...director.visits],visitBefore);assert.equal(director.choices.size,0);assert.equal(director.armed.size,0);assert.equal(director.admittedVisits.size,0);assert.equal(director.calling,undefined);assert.equal(speech.speechMemory.size,0);assert.equal(speech.speechFocus.size,0);assert.equal(speech.speechFocusSpeaker,undefined);assert.deepEqual([speech.speakerRows,speech.speechMemory,speech.speechFocus],maps);},false);
 const smith2=census.actors.find(a=>a.defId==='townsfolk_smith')!;hero.pos={...smith2.pos};course('same-session-next-native-visit',()=>{const out=director.dwell(smith2);assert(out?.text);return out;});
 course('installed-facts-with-real-campaign-state',()=>{world.account.ledger[RELIQUARY_CFG.attunement]=1;world.account.features.add(FEATURE.RELIQUARY);world.activeQuests.push({questId:BRANDT_HAMMER_QUEST,fieldDone:false},{questId:'oracle_commander_review',fieldDone:false});world.questImbues.push({questId:BRANDT_HAMMER_QUEST});return Object.keys(NPC_DIALOGUE_FACTS).map(fact=>[fact,(modules.dialogueConditionMet as Function)(session?.host??observerWorld,{fact})]);});
 course('native-condition-forms-and-unknown-fact',()=>[{feature:FEATURE.RELIQUARY},{accountLevel:1},{accountLevel:999},{ledger:ORACLE_RESCUED,scope:'either'},{ledger:ORACLE_RESCUED,scope:'run'},{ledger:ORACLE_RESCUED,scope:'account'},{quest:BRANDT_HAMMER_QUEST,state:'active'},{quest:BRANDT_HAMMER_QUEST,state:'ready'},{fact:'review-not-installed'}].map(c=>(modules.dialogueConditionMet as Function)(session?.host??observerWorld,c)));
 const liveFact=NPC_DIALOGUE_FACTS.oracleAtHome;NPC_DIALOGUE_FACTS.oracleAtHome=()=>{throw Error('installed fact failure');};course('failure-live-installed-fact-remains-authoritative',()=>(modules.dialogueConditionMet as Function)(session?.host??observerWorld,{fact:'oracleAtHome'}));NPC_DIALOGUE_FACTS.oracleAtHome=liveFact;
 course('client-host-early-gates',()=>{if(local)localProvider.clientActionHook=()=>{throw Error('UI callback must not execute');};else world.clientActionHook=()=>{throw Error('UI callback must not execute');};director.refreshAppearances();return[director.guidance(),director.callout(true)];});if(local)localProvider.clientActionHook=undefined;else world.clientActionHook=undefined;
 // Reset failure keeps original sequential side effects; no fabricated rollback.
 const oldClear=speech.speechMemory.clear;speech.speakerRows.set(999,{old:true});speech.speechMemory.set(999,{old:true});speech.speechMemory.clear=()=>{throw Error('speech reset failure');};course('failure-original-reset-order',birth,false);assert.equal(speech.speakerRows.size,0);assert.equal(speech.speechMemory.size,1);speech.speechMemory.clear=oldClear;
 // Exact context rebinding only: this does not claim HUB geometry admission.
 const independent:any[]=[];
 if(session){
  const oldArea=(session as any).area,oldProvider=oldArea.local,oldHost=session.host,oldDirector=session.npcDialogues;
  const refs=[session.speakerRows,session.speechMemory,session.speechFocus],visits=[...(oldDirector as any).visits];
  const hub=world.zoneMap[HUB_ZONE];assert(hub,'actual installed HUB zone');
  const censusB={zone:hub,actors:[hero],player:hero},spatialB={...spatial,zone:hub};
  const hits:string[]=[];const providerB:any={census:censusB,scene:null,clientActionHook:undefined,exits:[],massRuntime:undefined};
  for(const key of ['localZoneAt','isSafeAt','viewRectFor'] as const)providerB[key]=function(...args:any[]){assert.equal(this,providerB);hits.push(key);return (residentSpatial[key] as Function).apply(spatialB,args);};
  providerB.lineOfSight=function(...args:any[]){assert.equal(this,providerB);hits.push('lineOfSight');return (geometry.lineOfSight as Function).apply(geometry,args);};
  session.bindArea({census:censusB,local:providerB});
  assert.equal(session.host,oldHost);assert.equal(session.npcDialogues,oldDirector);assert.deepEqual([...(oldDirector as any).visits],visits);assert.equal(session.host.actors,censusB.actors);assert.equal(session.host.localZoneAt(hero.pos),hub);assert.equal((modules.dialogueConditionMet as Function)(session.host,{fact:'oracleAtHome'}),false);
  const savedMethods=new Map<string,Function>();for(const key of ['localZoneAt','isSafeAt','viewRectFor','lineOfSight']){savedMethods.set(key,oldProvider[key]);oldProvider[key]=()=>{throw Error('retired area callback '+key);};}
  try{
   assert.equal(session.host.isSafeAt(hero.pos),residentSpatial.isSafeAt.call(spatialB,hero.pos));assert.deepEqual(session.host.viewRectFor(hero),residentSpatial.viewRectFor.call(spatialB,hero));assert.equal(session.host.lineOfSight(hero.pos,hero.pos,hero.tier,hero.tier),geometry.lineOfSight(hero.pos,hero.pos,hero.tier,hero.tier));
   censusB.actors=[...censusB.actors];assert.equal(session.host.actors,censusB.actors);
   assert.throws(()=>session.bindArea({census:oldArea.census,local:providerB}),/identity/);assert.equal(session.host.actors,censusB.actors,'failed bind retains current area');
   oldDirector.leaveZone();assert.deepEqual([...(oldDirector as any).visits],visits);assert.equal(session.factoryService.npcDialogues,oldDirector);assert.deepEqual([session.speakerRows,session.speechMemory,session.speechFocus],refs);
  }finally{for(const[key,fn]of savedMethods)oldProvider[key]=fn;session.bindArea(oldArea);}
  assert.equal((modules.dialogueConditionMet as Function)(session.host,{fact:'oracleAtHome'}),true);assert.equal(session.host.actors,oldArea.census.actors);assert.equal(session.npcDialogues,oldDirector);assert.deepEqual([...(oldDirector as any).visits],visits);
  independent.push({course:'A/B/A exact installed zone context, stable director, retained visits, retired callbacks poison, live census, failed bind atomic',hits});
  let factReceiver:unknown='unset',factArg:unknown;const oldFact=NPC_DIALOGUE_FACTS.oracleAtHome;NPC_DIALOGUE_FACTS.oracleAtHome=function(host:any){factReceiver=this;factArg=host;return true;};try{assert.equal((modules.dialogueConditionMet as Function)(session.host,{fact:'oracleAtHome'}),true);assert.equal(factReceiver,undefined);assert.equal(factArg,session.host);}finally{NPC_DIALOGUE_FACTS.oracleAtHome=oldFact;}
  independent.push({course:'live installed fact direct lexical receiver',receiver:'undefined'});
 }
 let bindingGuards=0,selectionGuards=0;
 if(session){
  const good={campaign:session.campaign,area:{census:observedCensus,local:(session as any).area.local}};
  for(const [path,key]of [['root','campaign'],['root','area'],['area','census'],['area','local']])for(const kind of ['missing','inherited','getter']){
   let touched=0;const raw:any={...good,area:{...good.area}},o=path==='root'?raw:raw.area,value=o[key];delete o[key];
   if(kind==='inherited')Object.setPrototypeOf(o,{[key]:value});if(kind==='getter')Object.defineProperty(o,key,{get(){touched++;return value;}});
   assert.throws(()=>new NativeResidentSession(raw),/own object/);assert.equal(touched,0);bindingGuards++;
  }
  assert.throws(()=>session.bindArea({census:{...census},local:good.area.local}),/identity/);bindingGuards++;
  const badCensus:any={...census,player:{...hero}},badLocal={...localProvider,census:badCensus};assert.throws(()=>session.bindArea({census:badCensus,local:badLocal}),/identity/);bindingGuards++;
  const savedDirector=context.npcDialogues;context.npcDialogues=new candidate.NpcDialogueDirector(session.host);assert.throws(()=>session.inhabitants(population!),/same local census/);context.npcDialogues=savedDirector;bindingGuards++;
  assert.equal(population!.factory.npcDialogues,session.npcDialogues);assert.equal(inhabitantHost().npcDialogues,session.npcDialogues);assert.equal(session.factoryService.npcDialogues,session.npcDialogues);bindingGuards++;
  const replacementCensus={...census,actors:[...census.actors]},replacementLocal={...localProvider,census:replacementCensus};
  const savedVisits=[...director.visits];session.bindArea({census:replacementCensus,local:replacementLocal});assert.equal(session.host.actors,replacementCensus.actors);assert.equal(session.host.player,replacementCensus.player);assert.deepEqual([...director.visits],savedVisits);assert.throws(()=>session.inhabitants(population!),/same local census/);session.bindArea(good.area);bindingGuards++;
  for(const key of [...campaignMethods,'localZoneAt','isSafeAt','viewRectFor','lineOfSight']){
   const provider:any=campaignMethods.includes(key)?session.campaign:(session as any).area.local,old=provider[key],token={key};let hit=0;
   provider[key]=function(arg:unknown){assert.equal(this,provider);assert.equal(arg,token);hit++;return token;};
   try{const out:unknown=(session.host as any)[key]((()=>{provider[key]=()=>{throw Error('late provider selection');};return token;})());assert.equal(out,token);assert.equal(hit,1);selectionGuards++;}finally{provider[key]=old;}
  }
 }
 const output={mode,independent,bindingGuards,selectionGuards,fixture:{seed:991,zone:zone.id,npcs:layout.npcs.length,folk:layout.folk?.length,grid:!!layout.walk,doodads:layout.doodads.length},logs,totals:{courses:logs.length,rng:rng.length,reads:logs.reduce((n,r)=>n+r.trace.length,0),calls:logs.reduce((n,r)=>n+r.calls.length,0),bodies:logs[0].bodies.length},installedFacts:Object.keys(NPC_DIALOGUE_FACTS),appearanceKeys:Object.keys(NPC_APPEARANCES),dialogueCount:NPC_DIALOGUES.length,sourceQuestCount:Object.keys(QUESTS).length};
 return output;
}finally{Rng.prototype.next=next;for(const [key,d]of poison)if(d)Object.defineProperty(world,key,d);else delete world[key];}
}
const child=process.argv.indexOf('--native-resident-child');
const marker='NATIVE_RESIDENT_RESULT:';
if(child>=0){const mode=process.argv[child+1];assert(mode==='original'||mode==='local');console.log(marker+JSON.stringify(runLane(mode)));}
else{
 const outputs=[];
 for(const mode of ['original','local'] as const){
  const result=spawnSync(process.execPath,[resolve('node_modules/tsx/dist/cli.mjs'),fileURLToPath(import.meta.url),'--native-resident-child',mode],{encoding:'utf8',maxBuffer:32*1024*1024});
  assert.equal(result.status,0,mode+' cold process: '+result.error+'\n'+result.stderr+'\n'+result.stdout.slice(-14000));
  const line=result.stdout.split(/\r?\n/).find(line=>line.startsWith(marker));assert(line,mode+' output');outputs.push(JSON.parse(line.slice(marker.length)));
 }
 const [a,b]=outputs;assert.deepEqual({...b,mode:undefined,independent:undefined,bindingGuards:undefined,selectionGuards:undefined},{...a,mode:undefined,independent:undefined,bindingGuards:undefined,selectionGuards:undefined},'complete cold original/local records');
 assert.equal(b.independent.length,2);assert.equal(b.bindingGuards,17);assert.equal(b.selectionGuards,11);
 console.log('PASS native resident session',JSON.stringify({pin:archive.director.pin,pairs:a.logs.length,...a.totals,bindingGuards:b.bindingGuards,selectionGuards:b.selectionGuards,lifecycleControls:b.independent.length,installedFacts:a.installedFacts.length,fixture:a.fixture}));
}
