import {beforeNativeSceneProgression} from './nativeSceneProgressionFixture';
import {beforeNativeSceneQuest} from './nativeSceneQuestFixture';
import {beforeNativeSceneObjectiveWatching} from './nativeSceneObjectiveWatchingFixture';
/** Undo only exact checked main carry-forward members for older source receipts. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {nativeMainContentArchive as archive,nativeMainContentArchiveHash} from './nativeMainContentArchive';
assert.equal(createHash('sha256').update(JSON.stringify(archive)).digest('hex'),nativeMainContentArchiveHash,'immutable main-content source archive');
export function beforeNativeMainContent(text:string):string {
 return beforeNativeMainContentOnly(beforeNativeSceneObjectiveWatching(beforeNativeSceneQuest(beforeNativeSceneProgression(text))));
}
/** Immutable historical candidates predate subsequent owner extractions. */
export function beforeNativeMainContentOnly(text:string):string {
 const sf=ts.createSourceFile('world.ts',text,99,true),cl=sf.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;
 assert.ok(cl,'main-content World class');
 const edits:{start:number;end:number;text:string}[]=[];
 for(const row of archive.rows){
  const matches=cl.members.filter(m=>m.name?.getText(sf)===row.name);assert.equal(matches.length,1,'one checked main-content member '+row.name);
  const member=matches[0];assert.equal(member.getText(sf).replaceAll('\r\n','\n'),row.after,'checked main-content candidate '+row.name);
  edits.push({start:member.getStart(sf),end:member.end,text:row.before??''});
 }
 for(const row of archive.declarations){
  const matches=sf.statements.filter(n=>(ts.isInterfaceDeclaration(n)&&n.name.text===row.name)||ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(sf)===row.name));
  assert.equal(matches.length,1,'one checked main-content declaration '+row.name);const node=matches[0];
  assert.equal(node.getText(sf).replaceAll('\r\n','\n'),row.after,'checked main-content declaration '+row.name);
  edits.push({start:node.getStart(sf),end:node.end,text:row.before??''});
 }
 for(const edit of edits.sort((a,b)=>b.start-a.start))text=text.slice(0,edit.start)+edit.text+text.slice(edit.end);
 return text;
}
