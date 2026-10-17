import {refuseWorldStartup as refuseWorldCombat} from './nativeClientStartFixture';
import '../src/engine/world';
import assert from 'node:assert/strict';
import {bootSimEngine} from '../src/sim/arena';
import {CLASSES} from '../src/data/classes';
import {START_ZONE} from '../src/data/zones';
import {NativeClientRuntime} from '../src/worldmass/nativeClientRuntime';
import {withSeededRandom} from '../src/core/rng';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
bootSimEngine();
import {freshClientSetup as setup,characterFacts as facts} from './nativeClientStartFixture';
const cases=[];
for(const [id,flasks,graft]of [['warrior',false,undefined],['tamer',false,undefined],['guardian',true,undefined],['magician',true,'fireball']] as const){const classDef=CLASSES.find(c=>c.id===id)!,seed=1103;
 const ordinary=withSeededRandom(45101,()=>{const {writer}=setup(seed,flasks);writer.account.skillGraft=!!graft;writer.createPlayer(classDef);writer.dealLabArts();if(graft&&writer.account.skillGraft&&writer.applySkillGraft(graft))writer.account.skillGraft=false;return facts(writer);});
 const retained=withSeededRandom(45101,()=>{const {writer,geography}=setup(seed,flasks);writer.account.skillGraft=!!graft;return refuseWorldCombat([writer],worldDrivers=>{const runtime=new NativeClientRuntime({writer,definition:writer.zoneMap[START_ZONE],geography:geography.spec,fresh:{classDef,graft}});runtime.install();assert(runtime.ready);assert.equal(runtime.current.assembly.phase,'born');const result=facts(writer);assert.deepEqual(worldDrivers,[]);runtime.retire();return result;});});assert.deepEqual(retained,ordinary,id+' actual native initial character parity');cases.push({id,flasks,graft,retained});}
const report={scope:'Independent ordinary World creation versus true retained creation/birth/admission and gifts; actor IDs and unrelated generated NPCs excluded from the character-owned comparison.',cases,receipt:combatHash(JSON.stringify(cases))};writeCombatProof('native-client-start.json',report);console.log(JSON.stringify(report));
