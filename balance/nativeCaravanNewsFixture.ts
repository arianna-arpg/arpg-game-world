import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {nativeCaravanNewsArchive as archive,nativeCaravanNewsArchiveHash} from './nativeCaravanNewsArchive';
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
const normalize=(text:string)=>text.replace(/\r\n?/g,'\n');
assert.equal(hash(JSON.stringify(archive)),nativeCaravanNewsArchiveHash);
/** Only the exact reviewed delta may precede an unchanged historical reader. */
export function beforeNativeCaravanNews(file:string,input:string):string {
 const row=archive.runtime.find(row=>row.file===file);assert(row,'Unknown caravan-news source');let text=normalize(input);
 if(hash(text)===row.beforeHash)return text;
 assert.equal(hash(text),row.afterHash,'Exact caravan-news source '+file);
 for(const edit of row.edits){assert.equal(text.split(edit.after).length,2,'Unique caravan-news hunk');text=text.replace(edit.after,edit.before);}
 assert.equal(hash(text),row.beforeHash,'Complete caravan-news predecessor');return text;
}
const printer=ts.createPrinter({removeComments:true});
/** Count actual calls in current sources; no historical source is substituted.
 * Every original main call must still be a notice, including occupied audiences.
 * Only explicit relocated sites add to the original World-only regex census. */
export function countNativeNewsCarriers(world:string,read:(file:string)=>string):number {
 const parsed=new Map<string,Map<string,{owners:number;hash:string;calls:Map<string,number>}>>();
 for(const row of archive.lineage){const site=row.current;if(!parsed.has(site.file)){
  const sf=ts.createSourceFile(site.file,site.file==='src/engine/world.ts'?world:read(site.file),ts.ScriptTarget.Latest,true),owners=new Map<string,{owners:number;hash:string;calls:Map<string,number>}>();
  function visit(node:ts.Node,owner?:{owners:number;hash:string;calls:Map<string,number>}):void {
   if((ts.isFunctionDeclaration(node)||ts.isMethodDeclaration(node))&&node.name){const name=node.name.getText(sf);owner=owners.get(name)??{owners:0,hash:'',calls:new Map()};owner.owners++;owner.hash=hash(normalize(node.getText(sf)));owners.set(name,owner);}
   if(owner&&ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&['notice','noticeOccupied'].includes(node.expression.name.text)){const key=printer.printNode(ts.EmitHint.Unspecified,node,sf);owner.calls.set(key,(owner.calls.get(key)??0)+1);}
   ts.forEachChild(node,child=>visit(child,owner));
  }visit(sf);parsed.set(site.file,owners);
 }const owner=parsed.get(site.file)!.get(site.owner);assert.equal(owner?.owners,1,'Unique actual notice owner '+site.file+':'+site.owner);assert.equal(owner.hash,site.ownerHash,'Exact actual notice operation '+site.owner);assert.equal(owner.calls.get(site.call),1,'Original main notice remains at '+site.file+':'+site.owner+':'+row.original.line);
 }
 return (world.match(/this\.notice\(/g)??[]).length+archive.lineage.filter(row=>row.contributes).length;
}
