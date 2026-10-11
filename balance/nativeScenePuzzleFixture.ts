import {beforeNativeSceneLoot} from './nativeSceneLootFixture';
/** Restore only explicitly checked puzzle delegates for pre-existing World source guards. */
import assert from 'node:assert/strict';
import ts from 'typescript';
import {nativeScenePuzzleArchive as archive} from './nativeScenePuzzleArchive';
export function beforeNativeScenePuzzles(text:string):string {
 text=beforeNativeSceneLoot(text);
 const sf=ts.createSourceFile('world.ts',text,99,true),cl=sf.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;
 const edits:{start:number;end:number;text:string}[]=[];
 for(const row of archive.rows){
  const member=cl.members.find(m=>m.name?.getText(sf)===row.name);assert.ok(member);
  assert.equal(member.getText(sf).replaceAll('\r\n','\n'),row.after,'checked native puzzle delegate '+row.name);
  edits.push({start:member.getStart(sf),end:member.end,text:row.before});
 }
 for(const row of archive.added){
  const member=cl.members.find(m=>m.name?.getText(sf)===row.name);assert.ok(member);
  assert.equal(member.getText(sf).replaceAll('\r\n','\n'),row.text,'checked native puzzle host '+row.name);
  edits.push({start:member.getStart(sf),end:member.end,text:''});
 }
 const sealed=cl.members.find(m=>m.name?.getText(sf)==='spoilsSealed');assert.ok(sealed);
 assert.equal(sealed.getText(sf).replaceAll('\r\n','\n'),archive.sealing,'original spoils law');
 for(const e of edits.sort((a,b)=>b.start-a.start))text=text.slice(0,e.start)+e.text+text.slice(e.end);
 return text;
}
