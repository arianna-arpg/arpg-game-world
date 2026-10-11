/** Reverse only the byte-checked memory extraction and explicit writer changes. */
import assert from 'node:assert/strict';
import ts from 'typescript';
import {nativeSceneMemoryArchive as archive} from './nativeSceneMemoryArchive';
export function beforeNativeSceneMemory(source:string):string {
 let text=source;
 function replace(after:string,before:string){assert.equal(text.split(after).length,2,'unique exact native memory integration');text=text.replace(after,before);}
 replace(archive.imports,'');replace(archive.brand,'');
 for(const change of archive.integration)replace(change.after,change.before);
 for(const change of archive.importChanges)replace(change.after,change.before);
 const sf=ts.createSourceFile('world.ts',text,99,true),cl=sf.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;
 const edits:{start:number;end:number;text:string}[]=[];
 for(const row of archive.rows){const member=cl.members.find(m=>m.name?.getText(sf)===row.name);assert.ok(member);assert.equal(member.getText(sf).replaceAll('\r\n','\n'),row.after,'exact memory delegate '+row.name);edits.push({start:member.getStart(sf),end:member.end,text:row.before});}
 for(const e of edits.sort((a,b)=>b.start-a.start))text=text.slice(0,e.start)+e.text+text.slice(e.end);
 return text;
}
