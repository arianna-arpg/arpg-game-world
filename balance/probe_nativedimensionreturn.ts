import '../src/engine/world';
import assert from 'node:assert/strict';
import {bootSimEngine} from '../src/sim/arena';
import {makeAccount} from '../src/meta/account';
import {buildManifest} from '../src/packages/manifest';
import {CLASSES} from '../src/data/classes';
import {NativeClientStart} from '../src/worldmass/nativeClientStart';
import {refuseWorldStartup} from './nativeClientStartFixture';
import {seedGlobalRandom} from '../src/sim/rng';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
bootSimEngine();const restore=seedGlobalRandom(451602);
try {const result=refuseWorldStartup([],worldDrivers=>{const account=makeAccount(),start=new NativeClientStart(account),made=start.begin({kind:'run',classDef:CLASSES[0],manifest:buildManifest(account,1601),prologue:'skip'});assert(made);const {runtime,writer}=made,town=runtime.current,hero=writer.player;assert(Object.isFrozen(runtime.geography));const trips=[];
for(const dimension of ['underworld','aetherial']){town.combat.campaignFrame.enterDimension(dimension);const area=runtime.current;assert.equal(writer.zone.dimension,dimension);const killed=[];for(const enemy of [...area.assembly.input.scene.actors].filter(a=>a.team==='enemy'))if(!enemy.dead){area.combat.kill(enemy,false,hero);killed.push(enemy.defId);}assert(writer.discoveredWaypoints.has('lastlight'));const returned=area.combat.campaignFrame.travelToWaypoint('lastlight');assert.equal(returned,true);assert.equal(runtime.current,town);assert.equal(writer.player,hero);assert(town.assembly.input.scene.actors.includes(hero));assert(!area.assembly.input.scene.actors.includes(hero));trips.push({dimension,returned,retainedTown:true,nativeThreatsResolved:killed.length});}
start.cancel();return {trips,worldDrivers};});const report={scope:'Actual native enterDimension then native waypoint return from both realms after resolving genuine native threats; same retained town and physical hero.',result,receipt:combatHash(JSON.stringify(result))};writeCombatProof('native-dimension-return.json',report);console.log(JSON.stringify(report));}finally{restore();}
