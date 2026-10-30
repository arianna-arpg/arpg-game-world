import {townStationFeatures} from '../src/data/townBuild';
import '../src/engine/world';
import {World} from '../src/engine/world';
import {bootSimEngine} from '../src/sim/arena';
import {makeAccount,LEDGER_FLASK_LESSON} from '../src/meta/account';
import {buildManifest} from '../src/packages/manifest';
import {captureNativeGeographySource} from '../src/world/captureGeography';
import {createNativeGeographyReader} from '../src/world/geographySource';
import {MassNativeGeography,makeMassNativeGeographySpec} from '../src/worldmass/nativeGeography';
import {address} from '../src/worldmass/address';

export function freshClientSetup(seed:number,flasks:boolean,stations=false){bootSimEngine();const account=makeAccount();if(stations)for(const feature of townStationFeatures())account.features.add(feature);if(flasks)account.ledger[LEDGER_FLASK_LESSON]=1;const writer=new World(account,Object.freeze(buildManifest(account,seed)));writer.sim.bindGeographyPolicies();const reader=createNativeGeographyReader(captureNativeGeographySource(seed)),geography=new MassNativeGeography(makeMassNativeGeographySpec(reader.identity,{schema:1,algorithm:'bigint-relative-native-map-v1',addressSpan:960,physicalOrigin:address('surface','0','0',0,0,960),nativeOrigin:{x:0,y:0},physicalUnitsPerNativeUnit:{numerator:'20',denominator:'1'},nativeDimension:'surface',nativeBounds:{minX:-10000,minY:-10000,maxX:10000,maxY:10000},outsideDomain:'refuse',rounding:'nearest-binary64-ties-even-once'}));return {writer,geography};}
export function characterFacts(w:World){return {class:w.meta.classDef.id,attrs:w.meta.attrs,base:w.meta.baseAttrs,life:w.player.life,mana:w.player.mana,maxLife:w.player.maxLife(),skills:w.player.skills.map(i=>i&&{id:i.def.id,level:i.level}),known:[...w.meta.knownSkills].map(([id,i])=>({id,level:i.level})),companions:w.actors.filter(a=>a.owner===w.player&&a.companion).map(a=>({def:a.defId,level:a.level,life:a.life,maxLife:a.maxLife(),skills:a.skills.map(i=>i?.def.id??null)})),flasks:['mireille_flasks_given',LEDGER_FLASK_LESSON].map(k=>w.ledger[k]??0)};}

import assert from 'node:assert/strict';
import {refuseWorldCombat} from './probe_nativecombatcycle';
/** Additional original bootstrap bodies are trapped only in the retained lane. */
export function refuseWorldStartup<T>(writers:readonly World[],action:(calls:string[])=>T):T {
 const names=['makePlayerSeat','createPlayer','grantStartingCompanions','dealVeteranFlasks','dealLabArts','applySkillGraft','rescaleEnemies'];
 return refuseWorldCombat(writers,calls=>{const saved:{target:object;name:string;descriptor:PropertyDescriptor}[]=[];try{for(const target of [World.prototype,...writers])for(const name of names){const d=Object.getOwnPropertyDescriptor(target,name);if(target!==World.prototype&&!d)continue;assert(d&&typeof d.value==='function'&&d.configurable,'genuine original bootstrap '+name);saved.push({target,name,descriptor:d});Object.defineProperty(target,name,{...d,value:function(){calls.push(name);throw Error('Retained startup called original World driver: '+name);}});}return action(calls);}finally{for(const s of saved.reverse())Object.defineProperty(s.target,s.name,s.descriptor);}});
}
