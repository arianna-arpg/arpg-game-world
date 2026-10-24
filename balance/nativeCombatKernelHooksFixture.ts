import {beforeNativeCombatPresentation} from './nativeCombatPresentationFixture';
import {beforeNativeFrameHooks} from './nativeFrameHooksFixture';
import {beforeNativeCombatRecordSelection} from './nativeCombatRecordSelectionFixture';
import * as crypto from 'node:crypto';
import ts from 'typescript';
import {nativeSceneCombatHooksArchive as archive} from './nativeSceneCombatHooksArchive';
const sha=(s:string)=>crypto.createHash('sha256').update(s).digest('hex');
const must=(ok:unknown,why:string)=>{if(!ok)throw new Error(why);};
type Stage=typeof archive.stages[number];
export function reverseNativeCombatHookStage(actual:string,row:Stage):string {
 must(sha(actual)===row.afterSha256,'Hook stage complete afterhash '+row.fn+'/'+row.stage);
 const edits=row.edits.map(e=>({...e,at:e.start+row.edits.filter(p=>p.start<e.start).reduce((n,p)=>n+p.after.length-p.before.length,0)}));
 for(const e of edits.sort((a,b)=>b.at-a.at)){
  must(actual.slice(e.at,e.at+e.after.length)===e.after,'Hook stage exact hunk '+row.fn+'/'+row.stage);
  actual=actual.slice(0,e.at)+e.before+actual.slice(e.at+e.after.length);
 }
 must(sha(actual)===row.beforeSha256,'Hook stage complete preimage '+row.fn+'/'+row.stage);
 return actual;
}
export function beforeNativeCombatKernelHooks(group:string,source:string):string {
 source=beforeNativeCombatPresentation('src/engine/nativeSceneCombat'+group+'.ts',source);
 if(group==='Casting')source=beforeNativeCombatRecordSelection(source);
 const row=archive.files.find(r=>r.group===group);must(row,'Known hook module '+group);
 must(sha(source)===row!.hookedSha256,'Complete hook module '+group);
 const sf=ts.createSourceFile('hooks.ts',source,ts.ScriptTarget.Latest,true);
 const changes:{start:number;end:number;text:string}[]=[];
 const names=new Set(archive.stages.filter(r=>r.group===group).map(r=>r.fn));
 for(const name of names){
  const nodes=sf.statements.filter((n):n is ts.FunctionDeclaration=>ts.isFunctionDeclaration(n)&&n.name?.text===name);must(nodes.length===1,'Exact hook function '+name);
  const node=nodes[0];let text=node.getText(sf);
  for(const stage of archive.stages.filter(r=>r.group===group&&r.fn===name).reverse())text=reverseNativeCombatHookStage(text,stage);
  changes.push({start:node.getStart(sf),end:node.end,text});
 }
 for(const c of changes.sort((a,b)=>b.start-a.start))source=source.slice(0,c.start)+c.text+source.slice(c.end);
 must(sha(source)===row!.pureSha256,'Complete pure preimage '+group);return source;
}
export function assertNativeCombatHookHost(source:string):void {
 source=beforeNativeCombatPresentation('src/engine/nativeSceneCombatHost.ts',source);
 source=beforeNativeFrameHooks('src/engine/nativeSceneCombatHost.ts',source);
 const row=archive.host;must(sha(source)===row.afterSha256,'Exact lifecycle Host contract');
 must(source.startsWith(row.declarations),'Exact lifecycle Host declarations');source=source.slice(row.declarations.length);
 const first=source.indexOf(row.methods);must(first>=0&&source.indexOf(row.methods,first+1)<0,'Exact lifecycle Host methods');source=source.slice(0,first)+source.slice(first+row.methods.length);
 must(sha(source)===row.beforeSha256,'Complete pure Host preimage');
}
