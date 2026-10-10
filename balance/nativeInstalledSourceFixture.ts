/** Preserve old whole-World pins while explicitly checking only the independently proven source extraction. */
import assert from 'node:assert/strict';
import ts from 'typescript';
import {nativeInstalledSourcesArchive as archive} from './nativeInstalledSourcesArchive';
export function beforeNativeInstalledSources(text:string):string {
 const sf=ts.createSourceFile('world.ts',text,99,true),cl=sf.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;
 const edits:{start:number;end:number;text:string}[]=[];
 for(const row of archive.rows){
  const m=cl.members.find(n=>n.name?.getText(sf)===row.name);
  assert.equal(m?.getText(sf).replace(/\r\n/g,'\n')??null,row.after,'checked installed-source delegate '+row.name);
  if(m)edits.push({start:m.getStart(sf),end:m.end,text:row.before});
  else {const next=cl.members.find(n=>n.name?.getText(sf)===row.next);assert.ok(next);edits.push({start:next.getStart(sf),end:next.getStart(sf),text:row.before+'\n'});}
 }
 for(const edit of edits.sort((a,b)=>b.start-a.start))text=text.slice(0,edit.start)+edit.text+text.slice(edit.end);
 return text;
}
