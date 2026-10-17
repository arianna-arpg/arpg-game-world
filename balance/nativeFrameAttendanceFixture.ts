import {beforeNativeFramePhysicalSeats} from './nativeFramePhysicalSeatsFixture';
import {beforeNativeFrameContactSource} from './nativeFrameContactSourceFixture';
import * as crypto from 'node:crypto';
import ts from 'typescript';
import {nativeSceneFrameAttendanceArchive as archive} from './nativeSceneFrameAttendanceArchive';
const sha=(s:string)=>crypto.createHash('sha256').update(s).digest('hex');
function must(ok:unknown,why:string):asserts ok {if(!ok)throw Error(why);}
export function beforeNativeFrameAttendance(file:string,source:string):string {
 source=beforeNativeFramePhysicalSeats(file,beforeNativeFrameContactSource(file,source));
 const host=archive.hosts.find(r=>r.file===file);if(host){must(source===host.after&&sha(source)===host.afterSha256,'Exact attendance Host successor');must(sha(host.before)===host.beforeSha256,'Exact attendance Host predecessor');return host.before;}
 const fileRow=archive.files.find(r=>r.file===file);if(!fileRow)return source;
 must(sha(source)===fileRow.afterSha256,'Exact attendance file '+file);const sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true),edits:{start:number;end:number;text:string}[]=[];
 for(const row of archive.changes.filter(r=>r.file===file)){const nodes=sf.statements.filter((n):n is ts.FunctionDeclaration=>ts.isFunctionDeclaration(n)&&n.name?.text===row.name);must(nodes.length===1,'Unique attendance method '+row.name);const n=nodes[0],actual=n.getText(sf);must(actual===row.after&&sha(actual)===row.afterSha256,'Exact attendance method '+row.name);must(sha(row.before)===row.beforeSha256,'Exact attendance predecessor '+row.name);edits.push({start:n.getStart(sf),end:n.end,text:row.before});}
 for(const e of edits.sort((a,b)=>b.start-a.start))source=source.slice(0,e.start)+e.text+source.slice(e.end);
 must(sha(source)===fileRow.beforeSha256,'Exact complete prior hook file '+file);return source;
}
