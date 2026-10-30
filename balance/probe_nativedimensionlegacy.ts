import '../src/engine/world';
import assert from 'node:assert/strict';
import {NativeClientRuntime} from '../src/worldmass/nativeClientRuntime';
import {CLASSES} from '../src/data/classes';
import {START_ZONE} from '../src/data/zones';
import {withSeededRandom} from '../src/core/rng';
import {freshClientSetup,refuseWorldStartup} from './nativeClientStartFixture';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
function course(retained:boolean,dimension:string){return withSeededRandom(451601,()=>{const {writer,geography}=freshClientSetup(1601,false);if(!retained){writer.createPlayer(CLASSES[0]);writer.enterDimension(dimension);return{dimension:writer.zone.dimension,zone:writer.zone.id,error:null,discovered:[...writer.discoveredDimensions]};}return refuseWorldStartup([writer],worldDrivers=>{const runtime=new NativeClientRuntime({writer,definition:writer.zoneMap[START_ZONE],geography:geography.spec,fresh:{classDef:CLASSES[0]}});runtime.install();let error:string|null=null;try{runtime.current.combat.campaignFrame.enterDimension(dimension);}catch(e){error=String(e);}const result={dimension:writer.zone.dimension??'surface',zone:writer.zone.id,error,discovered:[...writer.discoveredDimensions]};assert.deepEqual(worldDrivers,[]);runtime.retire();return result;});});}
const results=[];for(const dimension of ['underworld','aetherial']){const original=course(false,dimension),retained=course(true,dimension);assert.equal(original.dimension,dimension);assert.match(retained.error??'',/Native source needs its own dimension mapping/);results.push({original,retained});}const report={scope:'Known unsupported actual native dimension transitions; failure retained for a recorded per-dimension mapping successor. No source guard relaxed.',results,receipt:combatHash(JSON.stringify(results))};writeCombatProof('native-dimension-entry-before.json',report);console.log(JSON.stringify(report));
