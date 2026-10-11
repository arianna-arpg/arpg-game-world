/** Exact reversal of the checked native progression extraction for historical receipts. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {nativeSceneProgressionArchive as archive,nativeSceneProgressionArchiveHash} from './nativeSceneProgressionArchive';
assert.equal(createHash('sha256').update(JSON.stringify(archive)).digest('hex'),nativeSceneProgressionArchiveHash,'immutable native progression archive');
function replaceOnce(text:string,after:string,before:string,label:string):string {
 const at=text.indexOf(after);assert.ok(at>=0,'checked progression declaration '+label);assert.equal(text.indexOf(after,at+after.length),-1,'single progression declaration '+label);
 return text.slice(0,at)+before+text.slice(at+after.length);
}
/** Imports/reexports and pure functions retain their original public surfaces. */
export function beforeNativeProgressionDeclarations(text:string,file:'src/engine/world.ts'|'src/meta/character.ts'):string {
 text=text.replaceAll('\r\n','\n');for(const row of archive.topLevel)if(row.file===file)text=replaceOnce(text,row.after,row.before,file);return text;
}
export function beforeNativeProgressionController(text:string,file:string):string {
 const row=archive.controllerRows.find(r=>r.file===file);assert.ok(row,'known progression controller');assert.equal(text.replaceAll('\r\n','\n'),row.after,'checked complete progression controller '+file);return row.original;
}
export function beforeNativeSceneProgression(text:string):string {
 text=text.replaceAll('\r\n','\n');const sf=ts.createSourceFile('world.ts',text,99,true),cl=sf.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;
 assert.ok(cl);const edits:{start:number;end:number;text:string}[]=[];
 for(const row of archive.rows){const matches=cl.members.filter(m=>m.name?.getText(sf)===row.name);assert.equal(matches.length,1,'single progression delegate '+row.name);const node=matches[0];assert.equal(node.getText(sf),row.after,'checked progression delegate '+row.name);edits.push({start:node.getStart(sf),end:node.end,text:row.before});}
 for(const row of archive.added){const matches=cl.members.filter(m=>m.name?.getText(sf)===row.name);assert.equal(matches.length,1,'single progression host '+row.name);const node=matches[0];assert.equal(node.getText(sf),row.text,'checked progression host '+row.name);edits.push({start:node.getStart(sf),end:node.end,text:''});}
 for(const e of edits.sort((a,b)=>b.start-a.start))text=text.slice(0,e.start)+e.text+text.slice(e.end);
 return beforeNativeProgressionDeclarations(text,'src/engine/world.ts');
}
