import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {assertHistoricalConcealmentSource as assertGrounds,beforeHistoricalArrivalGrounds as beforeGrounds} from './nativeHistoricalArrivalGrounds';
export const nativeArrivalUnusedActorSlots=[
 {name:'resourceFlows',before:'restoreGains',after:'anatomyCues',source:"resourceFlows: import('./feedingCues').ResourceFlowCue[] = [];",array:true},
 {name:'relicEffectsSuppressed',before:'cosmeticKind',after:'aiCooldown',source:'relicEffectsSuppressed?: boolean;',array:false},
 {name:'selfBankCues',before:'ironWard',after:'presenceBadge',source:"selfBankCues?: import('./skillSelfVisual').SelfBankCue[];",array:false},
 {name:'presenceBadge',before:'selfBankCues',after:'chargeState',source:"presenceBadge?: import('../data/skillPresenceVisuals').PresenceBadge;",array:false},
 {name:'companionReturnTo',before:'decay',after:'recallTimer',source:'companionReturnTo?: number;',array:false},
] as const;
export function assertNativeArrivalActorSlots(source:string):void {
 const sf=ts.createSourceFile('actor.ts',source,ts.ScriptTarget.Latest,true),classes=sf.statements.filter((node):node is ts.ClassDeclaration=>ts.isClassDeclaration(node)&&node.name?.text==='Actor');assert.equal(classes.length,1);
 const members=classes[0].members;for(const slot of nativeArrivalUnusedActorSlots){const found=members.filter(member=>member.name?.getText(sf)===slot.name);assert.equal(found.length,1,'One actual Actor slot '+slot.name);assert(ts.isPropertyDeclaration(found[0]));assert.equal(found[0].getText(sf).replace(/\r\n?/g,'\n'),slot.source,'Exact added Actor slot '+slot.name);const index=members.indexOf(found[0]);assert.equal(members[index-1]?.name?.getText(sf),slot.before);assert.equal(members[index+1]?.name?.getText(sf),slot.after);}
}
export function assertHistoricalConcealmentSource(source:string):void {
 assertGrounds(source);assertNativeArrivalActorSlots(fs.readFileSync(new URL('../src/engine/actor.ts',import.meta.url),'utf8'));
}
const marker=(value:any)=>value&&typeof value==='object'&&['$ref','$undefined','$function','$number'].some(key=>Object.hasOwn(value,key));
/** Operates only on actual top-level Actor snapshots in each arrival state.
 * Every other field/value survives. Canonical graph reconstruction rejects
 * references to a removed empty array rather than dropping their meaning. */
export function beforeNativeArrivalActorSlots<T extends {before:any;after:any}[]>(rows:T):T {
 const state=(input:any):any=>{
  assert(input&&typeof input==='object'&&!Array.isArray(input));assert(Array.isArray(input.actors)&&input.actors.length>0);
  const actors=new Set<object>(input.actors);assert.equal(actors.size,input.actors.length,'Actual actor entries are distinct');
  const omitted=new Set(nativeArrivalUnusedActorSlots.map(slot=>slot.name));
  for(const actor of actors){assert(actor&&typeof actor==='object'&&!Array.isArray(actor)&&!marker(actor));const keys=Object.keys(actor);assert(typeof Reflect.get(actor,'id')==='number');
   for(const slot of nativeArrivalUnusedActorSlots){const index=keys.indexOf(slot.name);assert(index>=0,'Current Actor slot '+slot.name);assert.equal(keys[index-1],slot.before);assert.equal(keys[index+1],slot.after);const value=Reflect.get(actor,slot.name);if(slot.array){assert(Array.isArray(value));assert.equal(value.length,0,'Unused resource flow array');}else assert.deepEqual(value,{$undefined:true},'Unused Actor slot '+slot.name);}
  }
  const ids=new Map<object,number>();
  const scan=(value:any):void=>{
   if(!value||typeof value!=='object')return;
   if(marker(value)){const keys=Object.keys(value);assert.equal(keys.length,1,'Exact serialized marker');if(keys[0]==='$ref')assert(Number.isSafeInteger(value.$ref)&&value.$ref>=0&&value.$ref<ids.size,'Canonical backward reference');else if(keys[0]==='$number')assert(['NaN','Infinity','-Infinity'].includes(value.$number));else assert.equal(value[keys[0]],true);return;}
   assert(!ids.has(value),'Canonical serialized object identity');ids.set(value,ids.size);
   if(Object.hasOwn(value,'$map')){assert.deepEqual(Object.keys(value),['$map']);assert(Array.isArray(value.$map));for(const pair of value.$map){assert(Array.isArray(pair)&&pair.length===2);scan(pair[0]);scan(pair[1]);}}
   else if(Object.hasOwn(value,'$set')){assert.deepEqual(Object.keys(value),['$set']);assert(Array.isArray(value.$set));value.$set.forEach(scan);}
   else if(Array.isArray(value))value.forEach(scan);else Object.values(value).forEach(scan);
  };scan(input);
  const removed=new Set<number>();for(const actor of actors){const id=ids.get(Reflect.get(actor,'resourceFlows'));assert(id!==undefined);removed.add(id);}assert.equal(removed.size,actors.size,'Distinct unused actor arrays');
  const encode=(drop:boolean):any=>{const mapped=new Map<number,number>();const visit=(value:any):any=>{
   if(!value||typeof value!=='object')return value;
   if(Object.hasOwn(value,'$ref')){if(drop)assert(!removed.has(value.$ref),'Removed unused array must not be aliased');assert(mapped.has(value.$ref),'Canonical retained reference');return{$ref:mapped.get(value.$ref)};}
   if(marker(value))return value;
   const id=ids.get(value);assert(id!==undefined);mapped.set(id,mapped.size);
   if(Object.hasOwn(value,'$map'))return{$map:value.$map.map(([key,x]:any[])=>[visit(key),visit(x)])};if(Object.hasOwn(value,'$set'))return{$set:value.$set.map(visit)};if(Array.isArray(value))return value.map(visit);
   return Object.fromEntries(Object.entries(value).filter(([key])=>!(drop&&actors.has(value)&&omitted.has(key as typeof nativeArrivalUnusedActorSlots[number]['name']))).map(([key,x])=>[key,visit(x)]));
  };const result=visit(input);assert.equal(mapped.size,ids.size-(drop?removed.size:0),'Only unused empty array nodes are removed');return result;};
  assert.deepEqual(encode(false),input,'Complete untouched arrival serialization');return encode(true);
 };
 assert(Array.isArray(rows));return rows.map(row=>({...row,before:state(row.before),after:state(row.after)})) as T;
}
export function beforeHistoricalArrivalGrounds<T extends {before:any;after:any}[]>(rows:T):T {
 return beforeGrounds(beforeNativeArrivalActorSlots(rows));
}