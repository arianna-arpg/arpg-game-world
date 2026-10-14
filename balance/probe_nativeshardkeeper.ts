import {NativeShardRuntime,nativeShardRuntimeFor,isNativeShardRuntime} from '../server/nativeShardRuntime';
import assert from 'node:assert/strict';
import {World} from '../src/engine/world';
import {bootShardEngine,SHARD_CFG} from '../server/shardHost';
import {makeAccount,LEDGER_FLASK_LESSON} from '../src/meta/account';
import {CLASSES} from '../src/data/classes';
import {buildManifest} from '../src/packages/manifest';
import {resetActorIdCounter} from '../src/engine/actor';
import {captureNativeGeographySource} from '../src/world/captureGeography';
import {createNativeGeographyReader} from '../src/world/geographySource';
import {characterFacts,refuseWorldStartup} from './nativeClientStartFixture';
import {countedCombatRandom,combatHash,writeCombatProof} from './probe_nativecombatcycle';
import {nativeClientRuntimeFor} from '../src/worldmass/nativeClientRuntime';
bootShardEngine();
const account=()=>{const a=makeAccount();a.ledger[LEDGER_FLASK_LESSON]=1;a.skillGraft=true;return a;};
const facts=(w:World)=>({character:characterFacts(w),name:w.player.name,keeper:w.localSeat.keeper,flags:[w.player.passive,w.player.untargetable,w.player.invulnerable],zone:w.zone.id,actors:w.actors.map(a=>({id:a.id,kind:a.kind,def:a.defId,name:a.name,level:a.level,tier:a.tier,pos:a.pos,life:a.life,mana:a.mana})),doodads:w.doodads.length,roster:w.account.roster.length,graft:w.account.skillGraft});
const cases=[];
for(const id of ['warrior','tamer','guardian']){
 const classDef=CLASSES.find(c=>c.id===id)!,seed=1231;resetActorIdCounter();
 const ordinary=countedCombatRandom(75011,()=>{const a=account(),w=new World(a,Object.freeze(buildManifest(a,seed)));w.timeflow.allowHold=()=>false;w.timeflow.chronoScope={radius:SHARD_CFG.chronoRadius};const order:unknown[]=[];w.events.on('party/join',({actor})=>order.push({actors:w.actors.length,seat:w.localSeat.actor===actor,tag:w.localSeat.keeper??null,passive:actor.passive}));w.createPlayer(classDef,{name:SHARD_CFG.keeper.name,startingCompanions:false,startingFlasks:false});w.localSeat.keeper={reviveSec:SHARD_CFG.keeper.reviveSec};w.player.untargetable=true;w.player.passive=true;w.player.invulnerable=true;return {facts:facts(w),order};});
 resetActorIdCounter();
 const retained=countedCombatRandom(75011,()=>refuseWorldStartup([],worldDrivers=>{const r=new NativeShardRuntime({account:account(),seed,keeperClass:classDef}),w=r.writer,order:unknown[]=[];assert.equal(r.ready,false);assert.equal(w.actors.length,0);assert.equal(w.seats.length,0);assert.equal(nativeClientRuntimeFor(w),undefined);assert.equal(nativeShardRuntimeFor(w),r);assert(isNativeShardRuntime(r));w.events.on('party/join',({actor})=>order.push({actors:w.actors.length,seat:w.localSeat.actor===actor,tag:w.localSeat.keeper??null,passive:actor.passive}));r.install();assert(r.ready);assert.equal(r.current.assembly.phase,'born');assert.equal(r.current.assembly.input.scene.player,r.keeper.actor);assert.equal(r.geography.spec.sourceJson,w.withGlobalPolicies(()=>createNativeGeographyReader(captureNativeGeographySource(seed)).identity));assert.equal(w.timeflow.holdSurface('menu:escape'),false);assert.deepEqual(w.timeflow.chronoScope,{radius:SHARD_CFG.chronoRadius});assert.equal(w.shardWorld,undefined);assert.equal(w.clientActionHook,undefined);const result={facts:facts(w),order};assert.deepEqual(worldDrivers,[]);r.retire();assert.equal(r.ready,false);assert.throws(()=>r.step(.05),/retired/);assert.throws(()=>r.install(),/retired/);return result;}));
 assert.deepEqual(retained,ordinary,id+' exact genuine keeper birth summaries and random cursor');assert.equal(retained.value.facts.character.companions.length,0);assert.equal(retained.value.facts.roster,0);assert.equal(retained.value.facts.graft,true);cases.push({id,draws:retained.draws,cursor:retained.cursor,actors:retained.value.facts.actors.length,initial:combatHash(JSON.stringify(retained.value)),party:retained.value.order});
}
const report={scope:'Genuine original server keeper creation versus retained private creation and birth, disabled gifts, native party timing, initial actor summaries and random cursor; no sockets or remote-seat policy claim.',cases,receipt:combatHash(JSON.stringify(cases))};writeCombatProof('native-shard-keeper.json',report);console.log(JSON.stringify(report));
