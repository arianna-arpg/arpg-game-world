import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {NativeShardHost} from '../server/nativeShardHost';
import {ShardTransport} from '../server/shardTransport';
import {NativeAreaSceneCombat} from '../src/worldmass/nativeAreaSceneCombat';
import {SHARD_CFG} from '../server/shardHost';
import {COOP_SCALING} from '../src/data/coop';
import {FEATURE} from '../src/meta/account';
import {CLASSES} from '../src/data/classes';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
const dir=fs.mkdtempSync(path.resolve('balance/reports/native-host-lifecycle-')),hosts:NativeShardHost[]=[],subscribe=ShardTransport.prototype.onSession,resumeSubscribe=ShardTransport.prototype.onPeerResume,scale=NativeAreaSceneCombat.prototype.settleNearScale,limit=SHARD_CFG.faultBreakerTicks,beat=SHARD_CFG.worldSaveSec,radius=COOP_SCALING.shareRadius,initializationError=new Error('selected server subscription failed'),scaleError=new Error('actual retained scale phase failed');
try {
 let failedNet:ShardTransport|undefined,priorRegistrations=0,sessionCalls=0;
 ShardTransport.prototype.onSession=function(...args){sessionCalls++;if(sessionCalls===1)return Reflect.apply(subscribe,this,args);failedNet=this;for(const key of ['joinCbs','leaveCbs','dormantCbs','resumeCbs','unloadCbs'])priorRegistrations+=((this as unknown as Record<string,Set<unknown>>)[key]).size;throw initializationError;};
 assert.throws(()=>new NativeShardHost({seed:1231,saveDir:dir,log:()=>{}}),e=>e===initializationError);assert.equal(COOP_SCALING.shareRadius,radius);
 assert(failedNet);assert(priorRegistrations>=5,'host registered actual earlier callbacks');for(const key of ['joinCbs','leaveCbs','dormantCbs','resumeCbs','unloadCbs','sessionCbs'])assert.equal((failedNet as unknown as Record<string,Set<unknown>>)[key].size,0,'startup removed '+key);
 ShardTransport.prototype.onSession=subscribe;
 let partialNet:ShardTransport|undefined;
 ShardTransport.prototype.onPeerResume=function(){partialNet=this;throw initializationError;};
 assert.throws(()=>new NativeShardHost({seed:1231,saveDir:dir,log:()=>{}}),e=>e===initializationError);assert(partialNet);assert.equal((partialNet as unknown as {sessionCbs:Set<unknown>}).sessionCbs.size,0,'failed frame initialization removes its earlier session handler');ShardTransport.prototype.onPeerResume=resumeSubscribe;
 const retry=new NativeShardHost({seed:1231,saveDir:dir,log:()=>{}});hosts.push(retry);assert(retry.runtime.ready,'failed constructor released its exact store owner');retry.persist();await retry.stop();
 SHARD_CFG.faultBreakerTicks=1;SHARD_CFG.worldSaveSec=.001;
 const h=new NativeShardHost({seed:1231,saveDir:dir,open:true,log:()=>{}});hosts.push(h);for(const feature of Object.values(FEATURE)){assert(h.account.features.has(feature));assert(h.net.features.includes(feature));}for(const c of CLASSES)assert(h.account.unlockedClasses.has(c.id));h.persist();const baseline=fs.readFileSync(h.savePath!);h.world.ledger.host_scale_fault=9;let calls=0,notified=0,closing:Promise<void>|undefined;
 NativeAreaSceneCombat.prototype.settleNearScale=function(){calls++;throw scaleError;};h.onBroken=()=>{notified++;closing=h.stop({persist:false});};
 const tick=h.tick(.02);assert(tick.frame?.ready,'actual simulation reached its near-scale phase');assert(tick.faults.some(row=>row.phase==='party scale'&&row.error===scaleError));assert.equal(calls,1);assert(h.broken);assert.equal(notified,1);await closing;assert(fs.readFileSync(h.savePath!).equals(baseline));assert.equal(COOP_SCALING.shareRadius,radius);assert.equal(h.runtime.ready,false);
 const result={failedConstructorReleasesOwner:true,partialFrameSubscriptionRemoved:true,allPriorHostSubscriptionsRemoved:true,exactOriginalInitializationError:true,retryInstalls:true,openAccountAppliedOnResume:true,actualScaleFailureTripsBreaker:true,scaleCalls:calls,notified,scaleFaultReturned:true,checkpointUntouched:true,stopOutsideFrameBusy:true,globalRadiusRestored:true};writeCombatProof('native-shard-host-lifecycle.json',{result,receipt:combatHash(JSON.stringify(result))});console.log(JSON.stringify(result));
}finally {ShardTransport.prototype.onSession=subscribe;ShardTransport.prototype.onPeerResume=resumeSubscribe;NativeAreaSceneCombat.prototype.settleNearScale=scale;SHARD_CFG.faultBreakerTicks=limit;SHARD_CFG.worldSaveSec=beat;for(const h of hosts.reverse())await h.stop({persist:false});}
