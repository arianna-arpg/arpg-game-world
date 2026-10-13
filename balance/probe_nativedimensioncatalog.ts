import '../src/engine/world';
import assert from 'node:assert/strict';
import {bootSimEngine} from '../src/sim/arena';
import {makeAccount} from '../src/meta/account';
import {buildManifest} from '../src/packages/manifest';
import {CLASSES} from '../src/data/classes';
import {NativeClientStart} from '../src/worldmass/nativeClientStart';
import {NativeGeographyCatalog} from '../src/worldmass/nativeGeographyCatalog';
import {readNativeRetainedSave} from '../src/worldmass/nativeRetainedSave';
import {serializeCharacter,type CharacterSave} from '../src/meta/character';
import {refuseWorldStartup,freshClientSetup} from './nativeClientStartFixture';
import {seedGlobalRandom} from '../src/sim/rng';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
bootSimEngine();const restoreRandom=seedGlobalRandom(451601);
try{
 const result=refuseWorldStartup([],worldDrivers=>{
  const account=makeAccount(),start=new NativeClientStart(account),made=start.begin({kind:'run',classDef:CLASSES[0],manifest:buildManifest(account,1601),prologue:'skip'});assert(made);const {runtime,writer}=made,town=runtime.current,coordinator=town.combat.input.coordinator,hero=writer.player;
  const first=JSON.parse(JSON.stringify(serializeCharacter(writer))) as CharacterSave,record=readNativeRetainedSave(first);assert.equal(first.world!.nativeRetained!.version,2);assert(record.catalog);const identity=record.catalog.identity;
  const trips=[];for(const dimension of ['underworld','aetherial']){
   runtime.current.combat.campaignFrame.enterDimension(dimension);const area=runtime.current,def=writer.zone;assert.equal(def.dimension,dimension);assert.notEqual(area,town);assert(!town.assembly.input.scene.actors.includes(hero));assert(area.assembly.input.scene.actors.includes(hero));
   const geography=record.catalog.select(dimension),anchor=geography.sourceAnchor(def.map);assert.deepEqual(geography.nativeSourcePoint(anchor),def.map);
   runtime.dispatch({dt:.01,wallSeconds:.01,inputs:new Map()});const saved=JSON.parse(JSON.stringify(serializeCharacter(writer))) as CharacterSave,re=readNativeRetainedSave(saved);assert.equal(re.catalog!.identity,identity);assert.equal(saved.world!.player!.zoneId,def.id);
   coordinator.runFrom(area,()=>coordinator.loadZone('lastlight',def.id));assert.equal(runtime.current,town);assert.equal(writer.player,hero);assert.equal(writer.zone.id,'lastlight');assert(!area.assembly.input.scene.actors.includes(hero));
   town.combat.campaignFrame.enterDimension(dimension);assert.equal(runtime.current,area);coordinator.runFrom(area,()=>coordinator.loadZone('lastlight',def.id));
   trips.push({dimension,zone:def.id,exactAnchor:true,sameRetainedArea:true,returnedSameTown:true,saveVersion:saved.world!.nativeRetained!.version});
  }
  const raw=record.catalog.spec,refuse=(change:(v:typeof raw)=>void)=>{const v=structuredClone(raw);change(v);assert.throws(()=>new NativeGeographyCatalog(v));};
  refuse(v=>{(v.entries as unknown[]).pop();});refuse(v=>{(v.entries as unknown[])[1]=v.entries[0];});refuse(v=>{Object.assign(v.entries[1],{dimension:'unrecorded'});});refuse(v=>{v.entries[1].geography.mapping.nativeDimension='surface';});refuse(v=>{v.entries[1].geography.mapping.physicalOrigin.dimension='surface';});refuse(v=>{v.entries[1].geography.mapping.nativeBounds.maxX=10000;});refuse(v=>{Object.assign(v.entries[1].geography,{sourceJson:'{}'});});
  assert.throws(()=>record.catalog!.select('uncaptured'));const g=record.catalog.initial,bound=g.spec.mapping.nativeBounds.maxX;assert.throws(()=>g.sourceAnchor({x:bound*2,y:0}),/envelope/);assert.deepEqual(g.nativeSourcePoint(g.sourceAnchor({x:14.917781548997901,y:0})),{x:14.917781548997901,y:0});
  const old=runtime.current;start.cancel();assert.equal(runtime.ready,false);assert.throws(()=>old.combat.campaignFrame.enterDimension('underworld'));
  return {productionPolicy:raw.coordinatePolicy,scale:raw.entries[0].geography.mapping.physicalUnitsPerNativeUnit,pageSpan:raw.entries[0].geography.mapping.addressSpan,sourceDimensions:raw.entries.map(e=>e.dimension),trips,strictNegatives:9,worldDrivers};
 });
 const original=[];for(const dimension of ['underworld','aetherial']){const {writer}=freshClientSetup(1601,false);writer.createPlayer(CLASSES[0]);writer.enterDimension(dimension);original.push({dimension:writer.zone.dimension,zone:writer.zone.id});}
 assert.deepEqual(result.trips.map(({dimension,zone})=>({dimension,zone})),original);
 const report={scope:'Production chart catalog: native actual dimension entry, exact source anchors, retained return/revisit, saved catalog and strict recorded identity. Browser activation is separate.',result,original,receipt:combatHash(JSON.stringify({result,original}))};writeCombatProof('native-dimension-catalog.json',report);console.log(JSON.stringify(report));
}finally{restoreRandom();}
