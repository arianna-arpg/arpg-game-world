import {beforeMuReliquary} from './muReliquarySourceFixture';
/** Independent native completion proof. Actual native seat XP/meta/level/ledger, actor resource
 * restoration, local texts/flashes and saves run; required progression rebuild
 * and quest payout boundaries are explicitly recording test providers only. */
import assert from 'node:assert/strict';
import {nativeArrivalSummonBoundaryFS as fs} from './nativeArrivalCompositionFixture';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
import * as core from '../src/engine/nativeSceneObjectiveCompletion';
import {NativeAreaSceneObjectiveCompletion,freshSceneObjectiveCompletionState} from '../src/worldmass/nativeAreaSceneObjectiveCompletion';
import {World,type Seat} from '../src/engine/world';
import {Actor,resetActorIdCounter} from '../src/engine/actor';
import {makeSimWorld} from '../src/sim/arena';
import {freshSceneObjectiveState} from '../src/worldmass/nativeSceneState';
import {newQuestLedger} from '../src/engine/questLedger';
import {Rng} from '../src/core/rng';
import {dist,rand,vec} from '../src/core/math';
import {COOP_SCALING} from '../src/data/coop';
import {PROGRESSION} from '../src/data/classes';
import {objectiveRewardXp} from '../src/data/objectiveRewards';
import {saveAccountDurable} from '../src/meta/persistence';
import {reliquaryExperience} from '../src/engine/accountReliquary';
import {bumpLedger} from '../src/packages/ledger';
import {CLASS_LEVEL_MILESTONES,classLevelLedgerKey,reachedLevelKey} from '../src/meta/account';
import {catalogClassLevelMilestones,catalogLevelMilestones} from '../src/meta/unlocks';
import {captureNativeActorState} from '../src/worldmass/dormancy';
import {ITEM_BASES} from '../src/data/itembases';

import {nativeSceneObjectiveCompletionArchive as archive,nativeSceneObjectiveCompletionArchiveHash} from './nativeSceneObjectiveCompletionArchive';
import {beforeNativeSceneLoot} from './nativeSceneLootFixture';
const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
const parse=(s:string)=>ts.createSourceFile('proof.ts',s,99,true);
const emit=(s:string)=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,removeComments:true}}).outputText;
const cap=(s:string)=>s[0].toUpperCase()+s.slice(1);
assert.equal(hash(JSON.stringify(archive)),nativeSceneObjectiveCompletionArchiveHash,'immutable original objective archive');
const read=(p:string)=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
// Loot normalization first restores its nested objective extraction too. Never
// apply objective normalization twice or quietly replace a historical guard.
const before=beforeNativeSceneLoot(read('src/engine/world.ts'));
const sf=parse(before),cl=sf.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;
assert.equal(hash(JSON.stringify(cl.members.map(m=>m.getText(sf).replaceAll('\r\n','\n')))),archive.worldHash,'complete pre-extraction class members');
if(process.argv.includes('--provenance')){
 const git=execFileSync('git',['show',archive.commit+':src/engine/world.ts'],{encoding:'utf8',maxBuffer:9e6}),prior=parse(git),old=prior.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;
 assert.equal(hash(JSON.stringify(old.members.map(m=>m.getText(prior).replaceAll('\r\n','\n')))),archive.worldHash,'original Git class receipt');
 for(const row of archive.rows)assert.equal(old.members.find(m=>m.name?.getText(prior)===row.name)?.getText(prior).replaceAll('\r\n','\n'),row.before,'Git original '+row.name);
 const constant=prior.statements.find(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(prior)==='MIREILLE_XP_BUFF_MULT'));
 assert.equal(constant?.getText(prior).replaceAll('\r\n','\n'),archive.constant,'Git original XP constant');
}
const source=parse(beforeMuReliquary(read('src/engine/nativeSceneObjectiveCompletion.ts'), 'xp'));
const constant=source.statements.find(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(source)==='MIREILLE_XP_BUFF_MULT'));assert.ok(constant);
assert.equal(emit(constant.getText(source)),emit(archive.constant),'unchanged native XP blessing constant');
for(const row of archive.rows){
 assert.equal(cl.members.find(m=>m.name?.getText(sf)===row.name)?.getText(sf).replaceAll('\r\n','\n'),row.before,'Git original '+row.name);
 const old=parse('class X{'+row.before+'}'),method=(old.statements[0] as ts.ClassDeclaration).members[0] as ts.MethodDeclaration;
 const current=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='scene'+cap(row.name)) as ts.FunctionDeclaration;
 assert.ok(current?.body);
 assert.equal(emit('function body(){'+current.body!.statements.map(s=>s.getText(source)).join('\n')+'}'),emit('function body(){'+method.body!.statements.map(s=>s.getText(old)).join('\n').replace(/\bthis\b/g,'owner')+'}'),'complete executable body '+row.name);
}
const bindings={dist,rand,vec,COOP_SCALING,PROGRESSION,objectiveRewardXp,saveAccountDurable,reliquaryExperience,bumpLedger,CLASS_LEVEL_MILESTONES,classLevelLedgerKey,reachedLevelKey,catalogClassLevelMilestones,catalogLevelMilestones};
const original=new Function(...Object.keys(bindings),emit(archive.constant+'\nclass Archive{'+archive.rows.map((r:any)=>r.before).join('\n')+'}\nreturn Archive.prototype;'))(...Object.values(bindings));
const base=makeSimWorld('warrior',71721),methods=archive.rows.map((r:any)=>r.name) as string[];
type Lane='original'|'world'|'core'|'owner';
function graph(v:any,memo=new Map<object,number>()):any{
 if(v instanceof Actor)return {actor:v.id};
 if(v===null||typeof v!=='object')return typeof v==='function'?'[function]':v;
 if(memo.has(v))return {ref:memo.get(v)};const id=memo.size;memo.set(v,id);
 if(v instanceof Map)return {id,map:[...v].map(([k,x])=>[graph(k,memo),graph(x,memo)])};
 if(v instanceof Set)return {id,set:[...v].map(x=>graph(x,memo))};
 return {id,type:v.constructor.name,values:Object.fromEntries(Object.keys(v).map(k=>[k,graph(v[k],memo)]))};
}
function fixture(lane:Lane,fault='',seed=731){
 resetActorIdCounter(870000);window.localStorage.clear();
 const tape:any[]=[],dirty=new Set<string>(),ledgers=new Map<Seat,ReturnType<typeof newQuestLedger>>();
 const seats:Seat[]=[];
 function seat(id:string,x:number){
  const actor=new Actor(id,'player',vec(x,500));actor.level=1;actor.life=20;actor.mana=4;
  const s:Seat={...base.localSeat,id,actor,meta:{...base.meta,xp:0,xpNeeded:PROGRESSION.xpForLevel(1),passivePoints:0,containers:{},relicEnabled:true},reviveDwellBy:new Map()};
  seats.push(s);ledgers.set(s,newQuestLedger());return s;
 }
 const local=seat('local',500),near=seat('near',530),other=seat('other',540),far=seat('far',7000),merc=seat('merc',500),dead=seat('dead',500),down=seat('down',500);
 merc.merc={name:'hired'};dead.actor.dead=true;down.actor.downed=true;down.actor.life=0;
 const campPrototype:any={
  seatHero(this:any,s:Seat){assert.equal(this,campaign);return s.home??s.actor;},
  sameParty(this:any,a:Seat,b:Seat){assert.equal(this,campaign);return a===b||[local,near,down].includes(a)&&[local,near,down].includes(b);},
  markMetaDirty(this:any,s:Seat){assert.equal(this,campaign);dirty.add(s.id);tape.push(['dirty',s.id]);if(fault==='markMetaDirty')throw Error('injected '+fault);},
  accountSeat(this:any,s:Seat){assert.equal(this,campaign);return s===campaign.localSeat||!!s.couch;},
 };
 const campaign:any=Object.assign(Object.create(campPrototype),{account:{...base.account,ledger:{},features:new Set(base.account.features)},completedObjectives:new Set<string>(),localSeat:local,actingSeat:null,seats,mireilleSeatBuff:new Map(),time:50,mireilleXpBuff:0,ledger:{}});
 const scene:any={zone:{...base.zone,id:'area-'+seed,level:3,objective:{kind:'clear'}},player:local.actor,actors:seats.map(s=>s.actor)};
 const geometry={state:scene,flashes:[] as World['flashes']},objectives=freshSceneObjectiveState(scene.zone.id,campaign.completedObjectives),state=freshSceneObjectiveCompletionState();
 let progressAllowed=true;
 const history={modeStageDef(){assert.equal(this,history);if(fault==='modeStageDef')throw Error('injected '+fault);return {...base.modeStageDef(),metaProgression:progressAllowed};}};
 const progressionProto:any={
  recalcSeat(this:any,s:Seat){assert.equal(this,progression);tape.push(['recalcSeat',s.id,s.actor.level,s.meta.xp,s.meta.passivePoints]);if(fault==='recalcSeat')throw Error('injected '+fault);},
  resyncMercenary(this:any){assert.equal(this,progression);tape.push(['resyncMercenary']);if(fault==='resyncMercenary')throw Error('injected '+fault);},
 };
 const progression=Object.create(progressionProto);
 const questProto:any={
  questLedgerOf(this:any,s:Seat){assert.equal(this,quests);return ledgers.get(s)!;},
  onQuestZoneFieldCleared(this:any,...args:any[]){assert.equal(this,quests);tape.push(['questField',graph(args)]);if(fault==='onQuestZoneFieldCleared')throw Error('injected '+fault);},
 };
 const quests=Object.assign(Object.create(questProto),{activeQuests:ledgers.get(local)!.active});
 const input={scene,scenePresence:{scene,get seats(){return campaign.seats;}},geometry,objectives,state,campaign,history,progression,quests};
 let controller:any;
 if(lane==='owner')controller=new NativeAreaSceneObjectiveCompletion(input);
 else {
  const h:any=Object.create(World.prototype);controller=h;
  for(const [provider,keys] of [[scene,['zone','player','actors']],[geometry,['flashes']],[objectives,['objectiveDone','spires','rifts','pyres','digs']],[state,['objectiveFallAt','texts']],[campaign,['account','completedObjectives','localSeat','actingSeat','seats','mireilleSeatBuff','time','mireilleXpBuff','ledger']],[quests,['activeQuests']]] as const)
   for(const key of keys)Object.defineProperty(h,key,{get(){return (provider as any)[key];},set(v){(provider as any)[key]=v;}});
  for(const [provider,keys] of [[campaign,['seatHero','sameParty','markMetaDirty','accountSeat']],[progression,['recalcSeat','resyncMercenary']],[quests,['questLedgerOf','onQuestZoneFieldCleared']]] as const)
   for(const key of keys)Object.defineProperty(h,key,{get(){const fn=provider[key];return (...args:any[])=>fn.apply(provider,args);}});
  h.metaProgressionActive=()=>history.modeStageDef().metaProgression;
  for(const name of methods)if(lane==='original')h[name]=original[name];else if(lane==='core')h[name]=function(...args:any[]){return (core as any)['scene'+cap(name)](h,...args);};
 }
 function snapshot(){return {
  actors:scene.actors.map((a:Actor)=>({id:a.id,state:captureNativeActorState(a)})),
  seats:seats.map(s=>({id:s.id,home:s.home?{id:s.home.id,state:captureNativeActorState(s.home)}:null,xp:s.meta.xp,xpNeeded:s.meta.xpNeeded,points:s.meta.passivePoints})),
  objectives:graph(objectives),state:graph(state),flashes:graph(geometry.flashes),ledger:{...campaign.ledger},account:{...campaign.account.ledger},completed:[...campaign.completedObjectives],dirty:[...dirty],tape:[...tape],
  saves:Array.from({length:window.localStorage.length},(_,i)=>{const k=window.localStorage.key(i)!;return [k,window.localStorage.getItem(k)];}),
 };}
 return {controller,input,scene,geometry,objectives,state,campaign,campPrototype,history,progression,progressionProto,quests,questProto,ledgers,seats,local,near,other,far,merc,dead,down,tape,dirty,snapshot,allowProgress(v:boolean){progressAllowed=v;}};
}
type Fixture=ReturnType<typeof fixture>;
const receipts:any[]=[];
function pair(label:string,course:(f:Fixture)=>unknown,fault='',seed=731){
 const run=(lane:Lane)=>{const rng=new Rng(seed),draws:any[]=[],prior=Math.random,radius=COOP_SCALING.shareRadius;Math.random=()=>{const pre=rng.snapshot(),n=rng.next();draws.push([pre,n,rng.snapshot()]);return n;};
  try{COOP_SCALING.shareRadius=0;const f=fixture(lane,fault,seed);let result,error;
   try{result=course(f);}catch(e){error=(e as Error).message;}
   return {result,error,snapshot:f.snapshot(),draws,sentinel:Math.random()};
  }finally{Math.random=prior;COOP_SCALING.shareRadius=radius;}
 };
 const expected=run('original');for(const lane of ['world','core','owner'] as const)assert.deepEqual(run(lane),expected,label+' '+lane);
 assert.equal(expected.error,fault?'injected '+fault:undefined,label+' expected completion');
 receipts.push({label,fault,seed,draws:expected.draws.length,receipt:hash(JSON.stringify(expected))});return expected;
}
function quest(f:Fixture,s=f.local){f.ledgers.get(s)!.active.push({questId:'real-ledger-entry',zoneId:f.scene.zone.id,fieldDone:false});}
for(const kind of ['clear','boss','puzzle','beacon','rifts','pyres','unearth','procession'])for(const prior of [false,true])pair('complete:'+kind+':'+prior,f=>{
 f.scene.zone.objective={kind,...(kind==='boss'?{id:'goblin_brute'}:{})};quest(f);
 if(prior)f.campaign.completedObjectives.add(f.scene.zone.id);
 f.controller.completeObjective('Native area complete');assert.equal(f.objectives.objectiveDone,true);assert.ok(f.campaign.completedObjectives.has(f.scene.zone.id));
 assert.equal(f.tape.filter(v=>v[0]==='questField').length,1);if(prior)assert.equal(f.local.meta.xp,0);
 const once=f.snapshot();f.controller.completeObjective('Must not pay twice');assert.deepEqual(f.snapshot(),once);
 return {kind,prior};
});
for(const mode of ['account','named-account','sealed-account','world'])pair('uber:'+mode,f=>{
 f.scene.zone.objective={kind:'boss',id:'goblin_brute',uber:{scope:mode==='world'?'world':'account',...(mode==='named-account'?{key:'native-uber-trophy'}:{})}};
 f.allowProgress(mode!=='sealed-account');f.controller.completeObjective('Uber');
 assert.equal(Object.keys(f.campaign.account.ledger).length,mode==='account'||mode==='named-account'?1:0);
 return {mode,saved:window.localStorage.length};
});
pair('actual-place-order-and-fallback',f=>{
 const places=[vec(100,101),vec(200,201),vec(300,301),vec(400,401)];
 [f.objectives.spires,f.objectives.rifts,f.objectives.pyres,f.objectives.digs].forEach((rows,i)=>rows.push({pos:places[i]} as any));
 f.state.objectiveFallAt={zone:f.scene.zone.id,pos:vec(900,901)};assert.deepEqual(f.controller.objectivePlaces(),places);
 f.scene.zone.objective={kind:'boss',id:'goblin_brute'};f.other.actor.defId='goblin_brute';f.dead.actor.defId='goblin_brute';
 assert.deepEqual(f.controller.objectivePlaces(),[...places,f.other.actor.pos,f.dead.actor.pos]);
 for(const rows of [f.objectives.spires,f.objectives.rifts,f.objectives.pyres,f.objectives.digs])rows.length=0;f.scene.zone.objective={kind:'clear'};
 assert.equal(f.controller.objectivePlaces()[0],f.state.objectiveFallAt.pos);f.state.objectiveFallAt.zone='neighbor';assert.deepEqual(f.controller.objectivePlaces(),[]);
 return {places:true};
});
// The Mu form is an intentional departure from the archived living actor:
// no equipped-cell penalty, through each current execution surface.
for (const lane of ['world', 'core', 'owner'] as Lane[]) {
  const f = fixture(lane), s = f.local;
  const baseId = Object.keys(ITEM_BASES).find(id => ITEM_BASES[id].category === 'relic')!;
  s.meta.containers.reliquary = [{uid:731, baseId, rarity:'common', ilvl:1, tier:1, baseRoll:0,
    affixes:[], implicitRolls:[], name:'Mu relic footprint'}];
  s.meta.relicEnabled = true; s.actor.relicEffectsSuppressed = true;
  f.controller.grantSeatXp(s, 1);
  assert.equal(s.meta.xp, 1, lane + ' Mu has no Reliquary XP penalty');
}
console.log('PASS Mu XP exclusion through World, shared core and retained objective owner');


for(const mode of ['small','multi-level','downed','possessed','cap','couch','remote','blessed','relic','relic-disabled'])pair('seat-xp:'+mode,f=>{
 const s=mode==='remote'||mode==='couch'?f.near:mode==='downed'?f.down:f.local;
 if(mode==='couch')s.couch={pad:1} as any;
 if(mode==='possessed'){const home=new Actor('true hero','player',vec(500,500));home.level=4;home.life=9;home.mana=1;s.home=home;s.actor.level=33;}
 if(mode==='cap'){s.actor.level=99;s.meta.xpNeeded=20;}
 if(mode==='blessed')f.campaign.mireilleXpBuff=1;
 if(mode.startsWith('relic')){const baseId=Object.keys(ITEM_BASES).find(id=>ITEM_BASES[id].category==='relic')!;assert.ok(baseId);s.meta.containers.reliquary=[{uid:731,baseId,rarity:'common',ilvl:1,tier:1,baseRoll:0,affixes:[],implicitRolls:[],name:'Actual relic footprint'}];s.meta.relicEnabled=mode!=='relic-disabled';}
 const amount=mode==='small'?3:mode==='cap'?30:PROGRESSION.xpForLevel(1)+PROGRESSION.xpForLevel(2)+73;
 f.controller.grantSeatXp(s,amount);
 assert.ok(f.dirty.has(s.id));if(mode==='downed')assert.equal(s.actor.life,0);if(mode==='possessed')assert.equal(s.actor.level,33);
 if(mode==='cap')assert.equal(f.campaign.ledger.reached_level_100,1);
 if(mode==='remote')assert.deepEqual(f.campaign.ledger,{});
 return {mode,amount};
});
for(const mode of ['all','place','places','empty-places','author','acting','remote-acting','possessed-distance','seat-buff-live'])pair('keeper-xp:'+mode,f=>{
 f.local.keeper={reviveSec:3};COOP_SCALING.shareRadius=250;
 if(mode==='author'||mode==='acting')f.campaign.actingSeat=f.near;
 if(mode==='remote-acting')f.campaign.actingSeat=f.far;
 if(mode==='possessed-distance'){const home=new Actor('near true hero','player',vec(520,500));home.level=1;f.far.home=home;}
 if(mode==='seat-buff-live'){f.campaign.mireilleSeatBuff.set(f.near,51);f.campaign.time=50;}
 const at=mode==='all'||mode==='acting'||mode==='remote-acting'?undefined:mode==='empty-places'?[]:mode==='places'?[vec(500,500),vec(7000,500)]:vec(500,500);
 f.controller.grantXp(11,at,mode==='author'?f.near:undefined);
 assert.equal(f.local.meta.xp,0);assert.equal(f.merc.meta.xp,0);assert.equal(f.dead.meta.xp,0);
 if(mode==='author'||mode==='acting')assert.equal(f.other.meta.xp,0);
 if(mode==='place')assert.equal(f.far.meta.xp,0);
 if(mode==='possessed-distance')assert.equal(f.far.meta.xp,11);
 if(mode==='seat-buff-live'){assert.equal(f.near.meta.xp,12);f.campaign.time=52;f.controller.grantXp(11,vec(500,500));assert.equal(f.near.meta.xp,23);}
 return {mode};
});
pair('native-quest-detection-live-ledgers',f=>{
 assert.equal(f.controller.questOnZone(f.scene.zone.id),false);quest(f,f.near);assert.equal(f.controller.questOnZone(f.scene.zone.id),false);
 f.local.keeper={reviveSec:3};assert.equal(f.controller.questOnZone(f.scene.zone.id),true);
 f.ledgers.get(f.near)!.active.length=0;quest(f,f.merc);quest(f,f.local);assert.equal(f.controller.questOnZone(f.scene.zone.id),false);
 quest(f,f.dead);assert.equal(f.controller.questOnZone(f.scene.zone.id),true,'detection sees dead seat ledger by native law');
 return {live:true};
});
for(const fault of ['markMetaDirty','recalcSeat','resyncMercenary','onQuestZoneFieldCleared','modeStageDef'])pair('partial:'+fault,f=>{
 quest(f);if(fault==='modeStageDef')f.scene.zone.objective={kind:'boss',id:'goblin_brute',uber:{scope:'account'}};
 f.controller.completeObjective('Fault course');
},fault);
pair('live-inherited-progression-replacement',f=>{
 f.controller.grantXp(1);f.progressionProto.recalcSeat=function(this:any,s:Seat){assert.equal(this,f.progression);f.tape.push(['replacementRecalc',s.id]);};
 f.controller.grantSeatXp(f.local,PROGRESSION.xpForLevel(1));assert.ok(f.tape.some(row=>row[0]==='replacementRecalc'));return {live:true};
});
{
 const a=fixture('owner'),b=fixture('owner');b.input.campaign=a.input.campaign;b.input.quests=a.input.quests;
 // This recording-boundary fixture explicitly borrows the same known cohort.
 // Physical area isolation is exercised by probe_nativeareapresence instead.
 b.scene.actors=a.scene.actors;b.scene.player=a.scene.player;
 b.input.scenePresence={scene:b.scene,get seats(){return a.input.scenePresence.seats;}};
 // Two actual retained objective owners share the one live campaign, while
 // their latch, fall places, texts and flashes remain separate native state.
 const neighbor=new NativeAreaSceneObjectiveCompletion(b.input),aOwner=a.controller as NativeAreaSceneObjectiveCompletion;
 b.scene.zone.id='neighbor';const beforeB=graph({objectives:b.objectives,state:b.state,flashes:b.geometry.flashes});
 aOwner.completeObjective('First area');assert.deepEqual(graph({objectives:b.objectives,state:b.state,flashes:b.geometry.flashes}),beforeB);
 const paid=a.local.meta.xp;neighbor.completeObjective('Neighbor');assert.equal(b.objectives.objectiveDone,true);assert.notEqual(a.local.meta.xp,paid);
 assert.deepEqual([...a.campaign.completedObjectives],[a.scene.zone.id,b.scene.zone.id]);assert.ok(a.state.texts.length&&b.state.texts.length);assert.ok(a.geometry.flashes.length);
 const raw:any={...aOwner.input},old=aOwner.input.campaign;const owner=new NativeAreaSceneObjectiveCompletion(raw);raw.campaign=b.campaign;assert.equal(owner.input.campaign,old);
 for(const key of Object.keys(raw)){const bad={...raw};Object.defineProperty(bad,key,{get(){throw Error('never read accessor');}});assert.throws(()=>new NativeAreaSceneObjectiveCompletion(bad),/own object binding/);}
 assert.throws(()=>new NativeAreaSceneObjectiveCompletion({...aOwner.input,geometry:b.geometry}),/identical geometry/);
 assert.throws(()=>new NativeAreaSceneObjectiveCompletion({...aOwner.input,state:{objectiveFallAt:null,texts:null as any}}),/retained text array/);
}
console.log('PASS independent native objective completion '+receipts.length+' courses '+hash(JSON.stringify(receipts)));
console.log('PASS exact Git source, actual XP/meta/ledger/text/flash/save and repeated bounty behavior; progression rebuild and quest payout remain labeled required boundaries');
