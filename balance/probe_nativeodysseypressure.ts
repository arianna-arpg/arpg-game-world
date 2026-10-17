import '../src/engine/world';
import assert from 'node:assert/strict';
import type {NativeAreaActorAuthority} from '../src/worldmass/nativeAreaActorAuthority';
import type {NativeAreaOngoingRuntime} from '../src/worldmass/nativeAreaSceneOngoing';
import {NativeClientRuntime} from '../src/worldmass/nativeClientRuntime';
import {START_ZONE} from '../src/data/zones';
import {newOdyssey,defeatOdysseyLeader} from '../src/world/odyssey';
import {clientSetup} from './nativeClientRuntimeFixture';
import {refuseWorldCombat,combatHash,writeCombatProof} from './probe_nativecombatcycle';
import {withSeededRandom} from '../src/core/rng';
const results=[];
for(const lane of ['native','retained-trap','retained-actual'] as const){results.push(withSeededRandom(58991,()=>{const setup=clientSetup(45927),{writer,geography}=setup;const state=newOdyssey(writer.manifest.seed,writer.account.ledger);state.roster=['goblin','bandit','undead','gnoll'];assert(defeatOdysseyLeader(state,'undead'));state.initialized=true;state.siege={phase:'active',deadline:10000,wave:1,waves:2,remaining:['odyssey_siege:1:0'],nextWaveAt:0,level:12};writer.odyssey.restore(state);let runtime:NativeClientRuntime|undefined,authority:NativeAreaActorAuthority<NativeAreaOngoingRuntime>|undefined,error:string|null=null,stack:string|null=null,calls:string[]=[],claimed=false;
const execute=()=>{runtime=new NativeClientRuntime({writer,definition:setup.definition,geography:geography.spec});runtime.install();const first=runtime.current;first.combat.input.coordinator.runFrom(first,()=>first.combat.input.coordinator.loadZone(START_ZONE));authority=runtime.current.authority;runtime.dispatch({dt:1/60,wallSeconds:1/60,inputs:new Map()});};
try{if(lane==='native'){writer.loadZone(START_ZONE);writer.update(1/60);}else if(lane==='retained-trap')refuseWorldCombat([writer],list=>{calls=list;execute();});else execute();}catch(e){error=String(e);stack=e instanceof Error?e.stack??null:null;}
const spawned=writer.actors.filter(a=>a.tag==='odyssey_siege:1:0');if(runtime&&spawned.length){try{claimed=authority!.require(spawned[0])!==undefined;}catch{claimed=false;}}
const row={lane,zone:writer.zone.id,error,stack,calls,spawned:spawned.map(a=>({kind:a.defId,tag:a.tag,team:a.team})),claimed,time:writer.time};assert.equal(error,null,stack??'');assert.equal(spawned.length,1);if(lane!=='native'){assert.equal(claimed,true);assert.deepEqual(calls,[]);assert.equal(writer.odyssey,runtime!.current.combat.input.campaign.odyssey);assert.equal(writer.odyssey.state,runtime!.current.combat.odyssey.state);}
return row;}));}
const report={scope:'Identical valid native restored tier1 siege state, then genuine native load/update versus actual retained install/dispatch. State fixture reaches existing content without a synthetic factory/authority/provider.',results,receipt:combatHash(JSON.stringify(results.map(({stack,...r})=>r)))};writeCombatProof('native-odyssey-pressure-first.json',report);console.log(JSON.stringify(report));
