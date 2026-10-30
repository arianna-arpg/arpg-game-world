import '../src/engine/world';
import assert from 'node:assert/strict';
import {NativeClientRuntime} from '../src/worldmass/nativeClientRuntime';
import {CLASSES} from '../src/data/classes';
import {START_ZONE} from '../src/data/zones';
import {FEATURE} from '../src/meta/account';
import {withSeededRandom} from '../src/core/rng';
import {freshClientSetup,refuseWorldStartup} from './nativeClientStartFixture';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
function course(retained:boolean){return withSeededRandom(45101,()=>{const {writer,geography}=freshClientSetup(1241,false),before=writer.zoneMap[START_ZONE].size.w;writer.account.features.add(FEATURE.SALVAGE_STATION);writer.account.features.add(FEATURE.BOUNTY_BOARD);if(!retained){writer.createPlayer(CLASSES[0]);return{before,width:writer.arena.w,definition:writer.zoneMap[START_ZONE].size.w,salvage:!!writer.stationAnchor('salvage'),bounty:!!writer.stationAnchor('bounty_board'),drivers:[]};}return refuseWorldStartup([writer],drivers=>{const runtime=new NativeClientRuntime({writer,definition:writer.zoneMap[START_ZONE],geography:geography.spec,fresh:{classDef:CLASSES[0]}});runtime.install();const result={before,width:writer.arena.w,definition:writer.zoneMap[START_ZONE].size.w,salvage:!!writer.stationAnchor('salvage'),bounty:!!writer.stationAnchor('bounty_board'),drivers};runtime.retire();return result;});});}
const ordinary=course(false),retained=course(true),result={ordinary,retained};writeCombatProof('native-town-fresh-fold-review.json',{result,receipt:combatHash(JSON.stringify(result))});console.log(JSON.stringify({result,receipt:combatHash(JSON.stringify(result))}));assert.deepEqual(retained,ordinary,'Fresh actual load must fold account features acquired after writer construction');
