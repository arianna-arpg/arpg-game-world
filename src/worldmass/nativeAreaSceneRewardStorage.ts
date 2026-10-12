/** Exclusive raw queues for the native area's rewards and physical contents.
 * Replacement keeps the caller's array and its native methods unchanged. */
export type NativeRewardStorageSlot='orbs'|'chests'|'shrines'|'altars'|'drops'|'remnants'|'deathBursts';
const ownedStates=new WeakSet<object>(),ownedQueues=new WeakMap<object,object>();
function queue(value:unknown):unknown[]{
 if(!Array.isArray(value))throw Error('Native reward storage requires an actual array');
 return value;
}
/** Install only after the owning controller has validated its other bindings.
 * Ordinary configurable own data slots are checked together before any claim.
 * Arbitrary Proxy traps and replaced global intrinsics are outside this contract. */
export function ownNativeRewardStorage(state:object,keys:readonly NativeRewardStorageSlot[]):void{
 if(ownedStates.has(state))throw Error('Native reward storage requires fresh local state');
 const rows:{key:NativeRewardStorageSlot;value:unknown[];enumerable:boolean;token:object}[]=[],seen=new Set<object>();
 for(const key of keys){
  const d=Object.getOwnPropertyDescriptor(state,key);
  if(!d||!Object.hasOwn(d,'value')||!d.writable||!d.configurable)throw Error('Native reward storage requires an own configurable mutable slot: '+key);
  const value=queue(d.value);
  if(seen.has(value)||ownedQueues.has(value))throw Error('Native reward storage queue already belongs to another slot');
  seen.add(value);rows.push({key,value,enumerable:!!d.enumerable,token:{}});
 }
 const descriptors:PropertyDescriptorMap={};
 for(const row of rows){const {key,token}=row;let current=row.value;
  descriptors[key]={enumerable:row.enumerable,configurable:false,get:()=>current,set:(value:unknown)=>{
   const next=queue(value),prior=ownedQueues.get(next);
   if(prior&&prior!==token)throw Error('Native reward storage queue belongs to another slot');
   ownedQueues.set(next,token);current=next;
  }};
 }
 Object.defineProperties(state,descriptors);
 for(const row of rows)ownedQueues.set(row.value,row.token);
 ownedStates.add(state);
}
