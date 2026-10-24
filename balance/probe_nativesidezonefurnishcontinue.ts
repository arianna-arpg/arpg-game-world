import '../src/engine/world';
import assert from 'node:assert/strict';
import {bootSimEngine} from '../src/sim/arena';
import {makeAccount} from '../src/meta/account';
import {serializeCharacter,writeCharacterMirrorRaw,readCharacterResume,CHAR_SLOT} from '../src/meta/character';
import {CLASSES} from '../src/data/classes';
import {START_ZONE} from '../src/data/zones';
import {buildManifest} from '../src/packages/manifest';
import {NativeClientStart} from '../src/worldmass/nativeClientStart';
import type {NativeClientRuntime} from '../src/worldmass/nativeClientRuntime';
import {prepareNativeCharacterContinue} from '../src/worldmass/nativeClientContinue';
import {NativeAreaSceneGeneration} from '../src/worldmass/nativeAreaSceneGeneration';
import type {GeneratedLayout} from '../src/engine/levelgen';
import {refuseWorldContinue} from './nativeClientContinueFixture';
import {seedGlobalRandom} from '../src/sim/rng';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
bootSimEngine();const restoreRandom=seedGlobalRandom(548231),memory=new Map<string,string>();
Object.defineProperty(globalThis,'window',{configurable:true,value:{localStorage:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{memory.set(k,v);},removeItem:(k:string)=>{memory.delete(k);}}}});
Object.defineProperty(globalThis,'fetch',{configurable:true,value:async()=>new Response('',{status:404})});
const result=await refuseWorldContinue(async worldDrivers=>{
 const account=makeAccount();account.packageUnlocks.add('pit');account.packageDefaults.pit={enabled:true,weight:0,startLevel:10};
 const start=new NativeClientStart(account),made=start.begin({kind:'run',classDef:CLASSES.find(c=>c.id==='warrior')!,manifest:buildManifest(account,548231),prologue:'skip'});assert(made);
 function exit(r:NativeClientRuntime){const row=r.current,c=row.combat.input.coordinator,rung=c.roadsFor(row.combat).caveReturn,e=row.assembly.input.geometry.exits.find(e=>e.to===rung?.zoneId);assert(e);row.combat.campaignFrame.travelThrough(e);}
 function hatch(r:NativeClientRuntime){const m=r.current.assembly.input.geometry.caveEntrances.find(m=>m.kind==='cellar_hatch');assert(m);return m;}
 const r=made.runtime,w=made.writer,townHatch=hatch(r);r.current.combat.campaignFrame.enterSidezone(townHatch);const cellar=r.current,id=cellar.assembly.input.scene.zone.id;assert.equal(cellar.assembly.input.geometry.caveEntrances.filter(m=>m.kind==='pit_entrance').length,0);exit(r);w.player.level=10;w.sim.gatesFor(10);r.current.combat.campaignFrame.enterSidezone(townHatch);assert.equal(r.current,cellar);const originalMouth=cellar.assembly.input.geometry.caveEntrances.find(m=>m.kind==='pit_entrance');assert(originalMouth);assert.equal(cellar.assembly.input.scene.zone.fixtures?.filter(f=>f.structure==='pit_maw').length,1);
 const saved=serializeCharacter(w),bytes=JSON.stringify(saved);start.cancel();await writeCharacterMirrorRaw(CHAR_SLOT,bytes);const lease=await readCharacterResume();assert.equal(lease.status,'ready');if(lease.status!=='ready')throw Error('Actual cellar saved lease refused');
 const layouts=new Map<string,GeneratedLayout>(),generate=NativeAreaSceneGeneration.prototype.generate;NativeAreaSceneGeneration.prototype.generate=function(...args){const out=Reflect.apply(generate,this,args);layouts.set(this.input.scene.zone.id,out.layout);return out;};
 let prepared:Awaited<ReturnType<typeof prepareNativeCharacterContinue>>;
 try{prepared=await prepareNativeCharacterContinue(account,lease.resume,{spawn:'exact',isCurrent:()=>true});}finally{NativeAreaSceneGeneration.prototype.generate=generate;}
 const restored=prepared.publish(),rr=restored.runtime,field=rr.current,g=field.assembly.input.geometry;assert.equal(field.assembly.input.scene.zone.id,id);const mouths=g.caveEntrances.filter(m=>m.kind==='pit_entrance');assert.equal(mouths.length,1);assert.equal(field.assembly.input.scene.zone.fixtures?.filter(f=>f.structure==='pit_maw').length,1);assert.deepEqual(mouths[0],originalMouth);
 const layout=layouts.get(id);assert(layout);const pois=layout.pois,poiCount=pois.length,structures=g.structures,structureCount=structures.length,doodads=g.doodads,doodadCount=doodads.length,actors=field.assembly.input.scene.actors,mouth=mouths[0];
 for(let i=0;i<2;i++){exit(rr);assert.equal(rr.current.assembly.input.scene.zone.id,START_ZONE);rr.current.combat.campaignFrame.enterSidezone(hatch(rr));assert.equal(rr.current,field);assert.equal(field.assembly.input.scene.actors,actors);assert.equal(g.structures,structures);assert.equal(g.structures.length,structureCount);assert.equal(g.doodads,doodads);assert.equal(g.doodads.length,doodadCount);assert.equal(layout.pois,pois);assert.equal(pois.length,poiCount);assert.equal(g.caveEntrances.filter(m=>m.kind==='pit_entrance').length,1);assert.equal(g.caveEntrances.find(m=>m.kind==='pit_entrance'),mouth);assert.equal(field.assembly.input.scene.zone.fixtures?.filter(f=>f.structure==='pit_maw').length,1);}
 const facts={sameProcess:true,realMirrorLease:true,savedCellar:id,mouths:mouths.length,fixtureCount:1,repeatVisits:2,poiCount,mouth:{kind:mouth.kind,pos:mouth.pos,seed:mouth.seed,mouthTier:mouth.mouthTier,roof:mouth.roof},sameRestoredArea:true,sameRestoredCensus:true,worldDrivers};rr.retire();prepared.discard();return facts;
});
const report={scope:'Actual default-catalog fresh start, delayed Pit installation, serialize in cellar, genuine mirror/lease/exact Continue, then two returns to the same restored area without duplicate fixture/mouth/structure/doodad/POI. One process; cold transport remains separately covered.',result,receipt:combatHash(JSON.stringify(result))};writeCombatProof('native-sidezone-furnish-continue.json',report);console.log(JSON.stringify(report));restoreRandom();
