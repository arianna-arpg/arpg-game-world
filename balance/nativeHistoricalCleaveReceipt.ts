/** exact serialized comparison reversal of Cleave restore
 * 5e869811. Gameplay values and raw cross-lane equality stay unchanged. */
import assert from 'node:assert/strict';
import ts from 'typescript';
import {historicalCleaveArchive} from './nativeHistoricalCleaveArchive';
const currentDescription='A wide melee swing that deals physical damage to every enemy in the arc in front of you.';
const originalDescription=currentDescription+' Move slowly and adjust your aim during the windup.';
export function assertHistoricalCleaveSource(text:string):void {
 const sf=ts.createSourceFile('skills.ts',text,99,true);const rows:ts.ObjectLiteralElementLike[]=[];
 const walk=(n:ts.Node):void=>{if(ts.isVariableDeclaration(n)&&n.name.getText(sf)==='SKILLS'&&n.initializer&&ts.isObjectLiteralExpression(n.initializer))rows.push(...n.initializer.properties.filter(p=>p.name?.getText(sf)==='cleave'));ts.forEachChild(n,walk);};walk(sf);
 assert.equal(rows.length,1,'one complete Cleave definition');assert.equal(rows[0].getText(sf).replaceAll('\r\n','\n'),historicalCleaveArchive.after,'exact immutable Cleave restore5e869811');
}
export function beforeHistoricalCleaveReceipt<T>(root:T):T {
 const visit=(v:any):any=>{
  if(!v||typeof v!=='object')return v;
  if(v.id==='cleave'&&v.delivery){
   assert.equal(v.description,currentDescription,'complete current Cleave description');assert.ok(!Object.hasOwn(v,'castMove')&&!Object.hasOwn(v,'castAim'),'current Cleave has no windup overrides');assert.ok(Object.hasOwn(v,'baseDamage'),'Cleave damage insertion point');
   const out:Record<string,unknown>={};for(const[k,x]of Object.entries(v)){if(k==='baseDamage'){out.castMove=.35;out.castAim='live';}out[k]=k==='description'?originalDescription:visit(x);}return out;
  }
  if(v.kind==='object'&&Array.isArray(v.entries)&&v.entries.some(([k,x]:any[])=>k==='id'&&x==='cleave')){
   assert.equal(v.entries.filter(([k]:any[])=>k==='id').length,1);assert.equal(v.entries.filter(([k]:any[])=>k==='description').length,1);assert.equal(v.entries.find(([k]:any[])=>k==='description')[1],currentDescription);assert.equal(v.entries.filter(([k]:any[])=>k==='baseDamage').length,1);assert.ok(!v.entries.some(([k]:any[])=>k==='castMove'||k==='castAim'));
   const entries=v.entries.flatMap(([k,x]:any[])=>k==='baseDamage'?[['castMove',.35],['castAim','live'],[k,x]]:[[k,k==='description'?originalDescription:x]]);
   return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,visit(k==='entries'?entries:x)]));
  }
  if(Array.isArray(v))return v.map(visit);return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,visit(x)]));
 };return visit(root);
}
