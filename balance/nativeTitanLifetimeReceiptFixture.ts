import assert from 'node:assert/strict';
import {nativeArrivalUnusedActorSlots} from './nativeCaravanArrivalReceiptFixture';
export {beforeHistoricalCleaveReceipt as beforeLifetimeCleaveReceipt} from './nativeHistoricalCleaveReceipt';
/** Exact e0600ae8 input boundary: its four earlier Actor slots remain present.
 * Only the later unused companionReturnTo scalar is removed; the complete
 * native census, graph references, body state, and random stream remain. */
const marker=(value:any)=>value&&typeof value==='object'&&['$ref','$undefined','$function','$number'].some(key=>Object.hasOwn(value,key));
/** Exact unused Actor-slot reversal for the original Titan inline graph envelope.
 * Actor membership comes only from the recorder's native census and controller
 * maps/doodad contact sources. Every other field and graph edge is retained. */
export function beforeNativeTitanLifetimeActorSlots<T>(row:T):T {
 const state=(input:any):any=>{
  assert(input&&typeof input==='object'&&!Array.isArray(input));
  assert.deepEqual(Object.keys(input),['runtime','actors','doodads','bridges','grounds','regrowing','flashes','shake','hazards','field','ledger','messages'],'Original complete Titan state envelope');
  const ids=new Map<object,number>(),nodes:any[]=[];
  const scan=(value:any):void=>{
   if(!value||typeof value!=='object')return;
   if(marker(value)){const keys=Object.keys(value);assert.equal(keys.length,1,'Exact serialized marker');if(keys[0]==='$ref')assert(Number.isSafeInteger(value.$ref)&&value.$ref>=0&&value.$ref<ids.size,'Canonical backward reference');else if(keys[0]==='$number')assert(['NaN','Infinity','-Infinity'].includes(value.$number));else assert.equal(value[keys[0]],true);return;}
   assert(!ids.has(value),'Canonical serialized object identity');ids.set(value,ids.size);nodes.push(value);
   if(Object.hasOwn(value,'$map')){assert.deepEqual(Object.keys(value),['$map']);assert(Array.isArray(value.$map));for(const pair of value.$map){assert(Array.isArray(pair)&&pair.length===2);scan(pair[0]);scan(pair[1]);}}
   else if(Object.hasOwn(value,'$set')){assert.deepEqual(Object.keys(value),['$set']);assert(Array.isArray(value.$set));value.$set.forEach(scan);}
   else if(Array.isArray(value))value.forEach(scan);else Object.values(value).forEach(scan);
  };scan(input);
  const resolve=(value:any):any=>value&&typeof value==='object'&&Object.hasOwn(value,'$ref')?nodes[value.$ref]:value;
  const object=(value:any):any=>{const result=resolve(value);assert(result&&typeof result==='object'&&!Array.isArray(result)&&!marker(result),'Actual serialized owner');return result;};
  const array=(value:any):any[]=>{const result=resolve(value);assert(Array.isArray(result));return result;};
  const pairs=(value:any):any[][]=>{const result=object(value);assert.deepEqual(Object.keys(result),['$map']);return result.$map;};
  const actors=new Set<object>(),add=(value:any):void=>{const actor=object(value);assert(Number.isSafeInteger(actor.id)&&typeof actor.name==='string'&&typeof actor.team==='string','Actual recorded Actor');actors.add(actor);};
  const runtime=object(input.runtime);
  for(const actor of array(input.actors))add(actor);
  for(const key of ['sources','heads'])for(const [,actor]of pairs(runtime[key]))add(actor);
  const contact=(value:any):void=>{const doodad=object(value);if(Object.hasOwn(doodad,'contactSource')){const source=resolve(doodad.contactSource);if(source!==undefined&&!marker(source))add(source);else assert(source===undefined||Object.keys(source).length===1&&source.$undefined===true,'Only absent or actual contact source');}};
  for(const [,piece]of pairs(runtime.pieces))contact(object(piece).d);
  for(const doodad of array(input.doodads))contact(doodad);
  assert(actors.size>0,'Original Titan census includes its player');
  const omitted=new Set<string>(['companionReturnTo']);
  for(const actor of actors){const keys=Object.keys(actor);for(const slot of nativeArrivalUnusedActorSlots){const index=keys.indexOf(slot.name);assert(index>=0,'Current Actor slot '+slot.name);assert.equal(keys[index-1],slot.before);assert.equal(keys[index+1],slot.after);const value=Reflect.get(actor,slot.name);if(slot.array){assert(Array.isArray(value));assert.equal(value.length,0,'Unused resource flow array');}else assert.deepEqual(value,{$undefined:true},'Unused Actor slot '+slot.name);}}
  const removed=new Set<number>(); // Undefined scalar removal never renumbers graph nodes.
  const encode=(drop:boolean):any=>{const mapped=new Map<number,number>();const visit=(value:any):any=>{
   if(!value||typeof value!=='object')return value;
   if(Object.hasOwn(value,'$ref')){if(drop)assert(!removed.has(value.$ref),'Removed unused array must not be aliased');assert(mapped.has(value.$ref),'Canonical retained reference');return{$ref:mapped.get(value.$ref)};}
   if(marker(value))return value;
   const id=ids.get(value);assert(id!==undefined);mapped.set(id,mapped.size);
   if(Object.hasOwn(value,'$map'))return{$map:value.$map.map(([key,x]:any[])=>[visit(key),visit(x)])};if(Object.hasOwn(value,'$set'))return{$set:value.$set.map(visit)};if(Array.isArray(value))return value.map(visit);
   return Object.fromEntries(Object.entries(value).filter(([key])=>!(drop&&actors.has(value)&&omitted.has(key as typeof nativeArrivalUnusedActorSlots[number]['name']))).map(([key,x])=>[key,visit(x)]));
  };const result=visit(input);assert.equal(mapped.size,ids.size-(drop?removed.size:0),'Only unused empty array nodes are removed');return result;};
  assert.deepEqual(encode(false),input,'Complete untouched Titan serialization');return encode(true);
 };
 const input=row as any;assert(input&&typeof input==='object'&&Array.isArray(input.stages));
 return {...input,stages:input.stages.map((stage:any)=>({...stage,state:state(stage.state)}))};
}

