import {checkNativeInhabitantMechanisms,checkNativeInhabitantAdapterOrder} from './nativeInhabitantControls';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import ts from 'typescript';
import {makeSimWorld} from '../src/sim/arena';
import {Rng,withSeededRandom} from '../src/core/rng';
import {vec,rand,randInt} from '../src/core/math';
import {MONSTERS,FIXTURE_IDS,FACTIONS} from '../src/data/monsters';
import {START_ZONE,type ZoneDef} from '../src/data/zones';
import {RARITY_DEFS} from '../src/engine/rarity';
import {rollFolk} from '../src/data/innfolk';
import {DAY_LENGTH} from '../src/world/daynight';
import {makeSpeakerRow} from '../src/engine/speechGrammar';
import {resetActorIdCounter,type Actor} from '../src/engine/actor';
import {generateLayout,type GeneratedLayout} from '../src/engine/levelgen';
import {captureNativeGeneration} from '../src/worldmass/nativeGeneration';
import {captureNativeActorState} from '../src/worldmass/dormancy';
import {World,NAV_CFG} from '../src/engine/world';
import {WALK_CFG} from '../src/world/gridWalk';
import {PIT_CFG} from '../src/engine/pitfall';
import {hullOf} from '../src/world/shape';
import {isDoodadGround} from '../src/world/regions';
import {doodadRuleOf} from '../src/engine/levelgen';
import {NativeAreaLocal} from '../src/worldmass/nativeAreaLocal';
import {NativeAreaPopulation} from '../src/worldmass/nativeAreaPopulation';
import {NativeAreaAmbient} from '../src/worldmass/nativeAreaAmbient';
import {captureNativeAreaGeometry} from '../src/worldmass/nativeAreaGeometryCapture';
import {serializeNativeAreaData,restoreNativeAreaData} from '../src/worldmass/nativeAreaGeometry';
import * as shared from '../src/engine/nativeInhabitants';
const hashStr=(s:string)=>{let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193);}return h>>>0;};
const names=['MONSTERS','FIXTURE_IDS','FACTIONS','RARITY_DEFS','DAY_LENGTH','vec','rand','randInt','hashStr','withSeededRandom','rollFolk','makeSpeakerRow'];
const values=[MONSTERS,FIXTURE_IDS,FACTIONS,RARITY_DEFS,DAY_LENGTH,vec,rand,randInt,hashStr,withSeededRandom,rollFolk,makeSpeakerRow];
const sources:shared.NativeInhabitantSources={MONSTERS,FIXTURE_IDS,FACTIONS,RARITY_DEFS,DAY_LENGTH,vec,rand,randInt,hashStr,withSeededRandom,rollFolk,makeSpeakerRow,get random(){return Math.random;}};
const archive=JSON.parse(gunzipSync(Buffer.from('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','base64')).toString('utf8')).blocks as Record<string,string>;
const originals=Object.fromEntries(Object.entries(archive).map(([name,body])=>[name,Function(...names,ts.transpileModule('return function(def,layout){'+body+'}',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(...values)]));
const w=withSeededRandom(713,()=>makeSimWorld('warrior',713)) as any;
withSeededRandom(713,()=>w.loadZone(START_ZONE));
const layout=captureNativeGeneration(w.zone,()=>generateLayout(w.zone,w.arena,new Rng(w.currentZoneSeed),w.zoneEntry,w.exits.map((e:any)=>e.pos),[])).value;
let pairs=0,totalBodies=0,totalDraws=0,localPairs=0;
const samples:unknown[]=[];
const originalTierViews=w.tierViews;
const nativeFactory=w.createMonster;
function run(mode:'archive'|'core'|'world'|'local'|'cold',def:ZoneDef,rows:GeneratedLayout,seed:number,day:number|null,failAt?:number){
 // Prepared local input carries the same explicit shape resolved by native load.
 def={...def,shape:def.shape??w.arena.shape};w.zone=def;
 w.walk=layout.walk??null;w.doodads=structuredClone(rows.doodads);w.grounds=w.doodads.filter((d:any)=>isDoodadGround(d.kind));w.bridges=w.doodads.filter((d:any)=>doodadRuleOf(d.kind).spans);w.structures=structuredClone(rows.structures??[]);w.doodadsRev++;w.convexNav=null;w.tierNavs.clear();w.arenaHull=hullOf(w.arena);w.fog=null;
 w.actors=[w.player];w.squadSeq=100;w.bombardMintRev=100;w.zoneGenTagging=false;w.massSettlementDay=day;w.time=DAY_LENGTH*2.4;
 w.speakerRows=new Map();w.speechMemory=new Map([[99,{old:true}]]);w.speechFocus=new Map([[0,{old:true}]]);w.speechFocusSpeaker=99;w.dialogueScene=0;
 const isolated=mode==='local'||mode==='cold',initialHeroRelay=Object.getOwnPropertyDescriptor(w.player,'statusRelay')!;
 const input={zone:def,geometry:captureNativeAreaGeometry({sourceIdentity:'native-inhabitants/'+def.id,bounds:w.arena,layout:rows}),entry:{...w.zoneEntry},playerPosition:{...w.player.pos},config:{navigationPad:NAV_CFG.pad,eventSpacing:240,ledgeGrasp:WALK_CFG.ledgeGrasp,pitSweepGran:PIT_CFG.sweepGran}};
 const bytes=serializeNativeAreaData(input),local=new NativeAreaLocal(mode==='cold'?restoreNativeAreaData(bytes):input);w.tierViews=originalTierViews;
 const ambientSources=w.nativeAmbientHost();
 const areaSources={ambient:ambientSources,groups:w.nativeEncounterGroupHost(),factory:w.nativeMonsterFactorySources(),promotion:w.nativeMonsterPromotionSources(),hostility:(World as any).nativeHostilitySources(),relay:(World as any).nativeStatusRelaySources()};
 const campaign={get zoneMap(){return w.zoneMap;},get time(){return w.time;},get visited(){return w.visited;},get surveyed(){return w.surveyed;},get sim(){return w.sim;},continentFor:(c:any)=>w.continentFor(c)};
 const resident={account:w.account,ledger:w.ledger,massSettlementDay:day,speakerRows:w.speakerRows,speechMemory:w.speechMemory,speechFocus:w.speechFocus,speechFocusSpeaker:w.speechFocusSpeaker,dialogueScene:w.dialogueScene,npcDialogues:w.npcDialogues};
 const population=new NativeAreaPopulation({zone:def,actors:[w.player],player:w.player,campaign,sources:(World as any).nativePopulationSources()});
 const area=isolated?new NativeAreaAmbient({local,population,player:w.player,sources:areaSources,context:{get time(){return w.time;},get npcDialogues(){return resident.npcDialogues;},applyPartyScale:a=>w.applyPartyScale(a),opaqueAt:()=>false,sanctuaryBlocksCombat:()=>false,resolveHit:()=>{throw Error('unbound preparation hit');}},state:{squadSequence:100,bombardMintRev:100,zoneGenTagging:false,magicPackEffects:[],magicPackResolving:false,magicPackRefreshPending:false}}):null;
 const host=area?area.inhabitants(resident):mode==='world'?w.nativeInhabitantHost():w;
 const roster:Actor[]=area?area.actors:w.actors,observed=area?resident:w;
 resetActorIdCounter(990000);const calls:any[]=[],draws:number[]=[],made:Actor[]=[],boundary:any[]=[];let error:string|undefined;
 w.createMonster=function(...args:any[]){calls.push(args);if(calls.length===failAt)throw Error('factory failure');const a=nativeFactory.apply(w,args);made.push(a);return a;};
 if(area){const factory=area.createMonster;area.createMonster=function(...args:Parameters<NativeAreaAmbient['createMonster']>){calls.push(args);if(calls.length===failAt)throw Error('factory failure');const a=factory.apply(area,args);made.push(a);return a;};}
 const blocked=new Map<string,PropertyDescriptor|undefined>();
 if(area){w.actors=[];for(const key of ['zone','actors','doodads','walk','structures','speakerRows','speechMemory','speechFocus','nativeInhabitantHost','createMonster','clampPos','findFreeSpot','armAmbush','promoteMonster','promoteMagicPack','refreshMagicPacks','enemiesOf','hostileTo','lineOfSight','clipShot']){blocked.set(key,Object.getOwnPropertyDescriptor(w,key));Object.defineProperty(w,key,{configurable:true,get(){throw Error('foreign inhabitant owner '+key);}});}}
 const next=Rng.prototype.next;Rng.prototype.next=function(){const v=next.call(this);draws.push(v);return v;};
 const state=(a:Actor)=>{const state=captureNativeActorState(a);assert.ok(state,'native actor codec must retain '+a.defId);return {id:a.id,state};};
 try{withSeededRandom(seed,()=>{
  for(const name of Object.keys(originals) as (keyof typeof shared)[]){
   if(name==='spawnNativeFieldInhabitants'){if(area)area.zoneGenTagging=true;else w.zoneGenTagging=true;}
   if(mode==='archive')originals[name].call(w,def,rows);
   else (shared[name] as Function)(host,mode==='world'?(World as any).nativeInhabitantSources:sources,def,area?local.input.geometry.layout:rows);
   boundary.push({name,bodies:roster.filter((a:Actor)=>a!==w.player).map(state),made:made.map(state),calls:structuredClone(calls),draws:[...draws],speakers:[...observed.speakerRows],scene:observed.dialogueScene,focus:observed.speechFocusSpeaker,squad:area?area.squadSequence:w.squadSeq,bombard:area?area.bombardMintRev:w.bombardMintRev});
  }
 });}catch(e){error=(e as Error).message; }finally{for(const [key,d]of blocked){if(d)Object.defineProperty(w,key,d);else delete w[key];}Rng.prototype.next=next;w.createMonster=nativeFactory;Object.defineProperty(w.player,'statusRelay',initialHeroRelay);assert.equal(serializeNativeAreaData(input),bytes,'complete source layout is unchanged');}
 return {error,boundary,bodies:roster.filter((a:Actor)=>a!==w.player).map(state),made:made.map(state),calls,draws,speakers:[...observed.speakerRows],speechMemory:[...observed.speechMemory],focus:[...observed.speechFocus],focusSpeaker:observed.speechFocusSpeaker,scene:observed.dialogueScene};
}
const composite={...structuredClone({...layout,walk:undefined}),walk:layout.walk} as GeneratedLayout;
const guardDoor=composite.doodads.find(d=>d.door);assert.ok(guardDoor?.door);guardDoor.door.mode='both';guardDoor.door.open=false;guardDoor.door.broken=false;guardDoor.door.life=23;
composite.camps=[{x:700,y:600}];composite.garrisons=[{pos:{x:900,y:600},faction:Object.keys(FACTIONS).find(k=>FACTIONS[k].table.length>0)!,size:[2,4]},{pos:{x:1,y:1},faction:'missing',size:[1,1]}];
composite.landmarkSpawns=[{id:'skeleton_warrior',pos:{x:800,y:700},rarity:'rare',post:true,facing:0},{id:'missing',pos:{x:1,y:1}}];
const fieldDef={...w.zone,packs:{table:[{id:'skeleton_warrior',weight:1}],count:[1,1],size:[1,1]}} as ZoneDef;
for(const [label,def,rows] of [['natural town',w.zone,layout],['explicit field mechanisms',fieldDef,composite]] as const){
 for(const seed of [713,991,0])for(const day of [null,0,2])for(const failAt of [undefined,1,6,14]){
  const a=run('archive',def,rows,seed,day,failAt),b=run('core',def,rows,seed,day,failAt),c=run('world',def,rows,seed,day,failAt);assert.deepEqual(c,a,'actual World adapter '+label);
  {const d=run('local',def,rows,seed,day,failAt),e=run('cold',def,rows,seed,day,failAt);assert.deepEqual(d,a,'complete detached native inhabitants '+label);assert.deepEqual(e,d,'cold source replay '+label);localPairs+=2;if(failAt===undefined&&seed===713&&day===null)samples.push({label,stages:a.boundary.map(b=>({name:b.name,bodies:b.bodies.length,speakers:b.speakers.length}))});}if(a.error)assert.equal(a.error,'factory failure','unexpected archived stage failure');assert.deepEqual(b,a,label+' seed'+seed+' day'+day+' fail'+failAt);pairs++;totalBodies+=a.bodies.length;totalDraws+=a.draws.length;
 }
}
assert.equal(Object.getOwnPropertyDescriptor(w,'nativeInhabitantView')?.enumerable,false,'census cache must not claim controller ownership');
console.log('PASS native inhabitant mechanism controls',checkNativeInhabitantMechanisms(archive));
console.log('PASS native inhabitant callback order',checkNativeInhabitantAdapterOrder((owner:any)=>(World.prototype as any).nativeInhabitantHost.call(owner)));
console.log('PASS native inhabitants',JSON.stringify({pairs,localPairs,totalBodies,totalDraws,samples,nativeTown:{doodads:layout.doodads.length,npcs:layout.npcs.length,folk:layout.folk?.length}}));
