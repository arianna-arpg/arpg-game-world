import '../src/engine/world';
import assert from 'node:assert/strict';
import {withSeededRandom} from '../src/core/rng';
import {NativeClientRuntime} from '../src/worldmass/nativeClientRuntime';
import {NativeAreaMemoryRegistry,captureNativeAreaMemories,hasNativeAreaMemoryRegistry} from '../src/worldmass/nativeAreaMemoryRegistry';
import {assertNativeRetainedWriterLive} from '../src/worldmass/nativeAreaRetainedLifetime';
import {clientSetup} from './nativeClientRuntimeFixture';
import {refuseWorldCombat,combatHash,writeCombatProof} from './probe_nativecombatcycle';
const result=withSeededRandom(45933,()=>{const {writer,definition,geography}=clientSetup(1043),originalAccount=Object.getOwnPropertyDescriptor(writer,'account')!,captureDescriptor=Object.getOwnPropertyDescriptor(NativeAreaMemoryRegistry.prototype,'captureAll')!,capture=NativeAreaMemoryRegistry.prototype.captureAll,nativeError=new Error('genuine coordinator account read failed'),cleanupError=new Error('shadowed actual registry cleanup');let registry:NativeAreaMemoryRegistry|undefined,cleanupCalls=0,observed:unknown;
 return refuseWorldCombat([writer],worldDrivers=>{
  Object.defineProperty(NativeAreaMemoryRegistry.prototype,'captureAll',{...captureDescriptor,value:function(this:NativeAreaMemoryRegistry){registry=this;Object.defineProperty(this,'retire',{configurable:true,value(){cleanupCalls++;throw cleanupError;}});return Reflect.apply(capture,this,[]);}});
  Object.defineProperty(writer,'account',{configurable:true,enumerable:originalAccount?.enumerable??false,get(){assert(captureNativeAreaMemories(writer) instanceof Map);throw nativeError;}});
  try{new NativeClientRuntime({writer,definition,geography:geography.spec});}catch(e){observed=e;}finally{if(originalAccount)Object.defineProperty(writer,'account',originalAccount);else Reflect.deleteProperty(writer,'account');Object.defineProperty(NativeAreaMemoryRegistry.prototype,'captureAll',captureDescriptor);}
  assert(registry);assert.equal(cleanupCalls,0,'constructor cleanup must use genuine retirement');assert.equal(observed,nativeError,'original native constructor failure must survive cleanup');assert.throws(()=>assertNativeRetainedWriterLive(writer),/retired/);assert.equal(hasNativeAreaMemoryRegistry(writer),false);assert.throws(()=>registry!.captureAll(),/retired/,'partially constructed registry must be retired');assert.deepEqual(worldDrivers,[]);
  return {actualRegistryObserved:true,coordinatorNotAcquired:true,cleanupShadowCalled:cleanupCalls,nativeErrorPreserved:observed===nativeError,writerRetired:true,emptyRegistryUnregistered:!hasNativeAreaMemoryRegistry(writer),emptyRegistryCaptureRefuses:true,noBornAreaOrGameplayAuthorityClaim:true,worldDrivers};
 });});
const report={scope:'Actual failed constructor before coordinator assignment. Instrumentation observes the genuine existing registry through its original captureAll; only that actual registry own retire is shadowed. Requires genuine captured cleanup, original error identity and terminal registry revocation; no born area authority is asserted.',result,receipt:combatHash(JSON.stringify(result))};writeCombatProof('native-client-constructor-cleanup.json',report);console.log(JSON.stringify(report));
