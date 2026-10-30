import {beforeNativeSceneObjectiveCompletion} from './nativeSceneObjectiveCompletionFixture';
/** Restore only explicitly checked native loot changes for historical source guards. */
import assert from 'node:assert/strict';
import ts from 'typescript';
import {nativeSceneLootArchive as archive} from './nativeSceneLootArchive';
export function beforeNativeSceneLoot(text:string):string {
 text=beforeNativeSceneObjectiveCompletion(text);
 const sf=ts.createSourceFile('world.ts',text,99,true),cl=sf.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;
 const edits:{start:number;end:number;text:string}[]=[];
 for(const row of archive.rows){
  const member=cl.members.find(m=>m.name?.getText(sf)===row.name);assert.ok(member);
  assert.equal(member.getText(sf).replaceAll('\r\n','\n'),row.after,'checked native loot delegate '+row.name);
  edits.push({start:member.getStart(sf),end:member.end,text:row.before});
 }
 for(const row of archive.added){
  const member=cl.members.find(m=>m.name?.getText(sf)===row.name);assert.ok(member);
  assert.equal(member.getText(sf).replaceAll('\r\n','\n'),row.text,'checked native loot host '+row.name);
  edits.push({start:member.getStart(sf),end:member.end,text:''});
 }
 for(const row of archive.leaves){const member=cl.members.find(m=>m.name?.getText(sf)===row.name);assert.ok(member);
  assert.equal(member.getText(sf).replaceAll('\r\n','\n'),row.text,'unchanged native loot context '+row.name);}
 for(const e of edits.sort((a,b)=>b.start-a.start))text=text.slice(0,e.start)+e.text+text.slice(e.end);
 return text;
}
