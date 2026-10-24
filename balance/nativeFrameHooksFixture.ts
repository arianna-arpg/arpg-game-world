import {beforeNativeFrameAttendance} from './nativeFrameAttendanceFixture';
import * as crypto from 'node:crypto';
import ts from 'typescript';
import {nativeSceneFrameHooksArchive as archive} from './nativeSceneFrameHooksArchive';
const sha=(s:string)=>crypto.createHash('sha256').update(s).digest('hex');
function must(ok:unknown,why:string):asserts ok {if(!ok)throw Error(why);}
type Stage=typeof archive.stages[number];
export function reverseNativeFrameHookStage(actual:string,row:Stage):string {
 must(sha(actual)===row.afterSha256,'Complete frame hook stage '+row.name+'/'+row.stage);
 const edits=row.edits.map(e=>({...e,at:e.start+row.edits.filter(p=>p.start<e.start).reduce((n,p)=>n+p.after.length-p.before.length,0)}));
 for(const e of edits.sort((a,b)=>b.at-a.at)){
  must(actual.slice(e.at,e.at+e.after.length)===e.after,'Exact frame hook hunk '+row.name+'/'+row.stage);
  actual=actual.slice(0,e.at)+e.before+actual.slice(e.at+e.after.length);
 }
 must(sha(actual)===row.beforeSha256,'Complete frame hook preimage '+row.name+'/'+row.stage);return actual;
}
export function beforeNativeFrameHooks(file:string,source:string):string {
 source=beforeNativeFrameAttendance(file,source);
 const host=archive.hosts.find(r=>r.file===file);
 if(host){must(sha(source)===host.afterSha256&&source===host.after,'Exact frame Host successor '+file);must(sha(host.before)===host.beforeSha256,'Frame Host original '+file);return host.before;}
 const row=archive.files.find(r=>r.file===file);if(!row)return source;
 must(sha(source)===row.hookedSha256,'Complete frame hook file '+file);
 const sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true),changes:{start:number;end:number;text:string}[]=[];
 for(const name of new Set(archive.stages.filter(r=>r.file===file).map(r=>r.name))){
  const nodes=sf.statements.filter((n):n is ts.FunctionDeclaration=>ts.isFunctionDeclaration(n)&&n.name?.text===name);must(nodes.length===1,'Unique hooked function '+name);
  const n=nodes[0];let text=n.getText(sf);for(const s of archive.stages.filter(r=>r.file===file&&r.name===name).reverse())text=reverseNativeFrameHookStage(text,s);
  changes.push({start:n.getStart(sf),end:n.end,text});
 }
 for(const c of changes.sort((a,b)=>b.start-a.start))source=source.slice(0,c.start)+c.text+source.slice(c.end);
 must(sha(source)===row.pureSha256,'Complete pure frame predecessor '+file);return source;
}
