/** keep every actual doodad/actor/terrain value and raw
 * lane comparison. Only reverse the reviewed concealment ground-index change. */
import assert from 'node:assert/strict';import ts from 'typescript';
import {isDoodadGround} from '../src/world/regions';
import {historicalConcealmentArchive} from './nativeHistoricalConcealmentArchive';
const changedKinds=new Set(['brush','reeds','berry_bush']);
export function assertHistoricalConcealmentSource(text:string):void {
 const sf=ts.createSourceFile('regions.ts',text,99,true),rows:Record<string,string[]>={};
 for(const st of sf.statements){let name:string|undefined;if(ts.isFunctionDeclaration(st)&&st.name?.text==='isDoodadGround')name='predicate';if(ts.isExpressionStatement(st)&&ts.isCallExpression(st.expression)&&st.expression.expression.getText(sf)==='registerRegion'){const arg=st.expression.arguments[0];if(ts.isObjectLiteralExpression(arg)){const prop=arg.properties.find(p=>p.name?.getText(sf)==='id');if(prop&&ts.isPropertyAssignment(prop)&&ts.isStringLiteral(prop.initializer)&&changedKinds.has(prop.initializer.text))name=prop.initializer.text;}}if(name)(rows[name]??=[]).push(st.getText(sf).replaceAll('\r\n','\n'));}
 for(const [name,source]of Object.entries(historicalConcealmentArchive.after))assert.deepEqual(rows[name],[source],'exact reviewed concealment source '+name);
 assert.equal(historicalConcealmentArchive.before.predicate,historicalConcealmentArchive.after.predicate,'native ground predicate was unchanged');
}
export function beforeHistoricalArrivalGrounds<T extends {before:any;after:any}[]>(rows:T):T {
 const state=(s:any)=>{const refs:any[]=[],ids=new Map<object,number>();
  const index=(v:any):void=>{if(!v||typeof v!=='object')return;if(['$ref','$undefined','$function','$number'].some(k=>Object.hasOwn(v,k)))return;ids.set(v,refs.length);refs.push(v);if(Object.hasOwn(v,'$map'))for(const[k,x]of v.$map){index(k);index(x);}else if(Object.hasOwn(v,'$set'))for(const x of v.$set)index(x);else if(Array.isArray(v))v.forEach(index);else Object.values(v).forEach(index);};index(s);
  assert.ok(Array.isArray(s.doodads)&&Array.isArray(s.grounds));const expected:any[]=[],owned=new Set<number>();
  for(const d of s.doodads){const id=Object.hasOwn(d,'$ref')?d.$ref:ids.get(d);assert.ok(Number.isSafeInteger(id));assert.ok(!owned.has(id),'doodad identities remain unique');owned.add(id);const def=refs[id];assert.ok(typeof def?.kind==='string');if(isDoodadGround(def.kind))expected.push({$ref:id});}
  assert.deepEqual(s.grounds,expected,'complete current ground index exactly follows actual doodads and native classifier');
  return {...s,grounds:s.grounds.filter((d:any)=>!changedKinds.has(refs[d.$ref].kind))};
 };return rows.map(row=>({...row,before:state(row.before),after:state(row.after)})) as T;
}
