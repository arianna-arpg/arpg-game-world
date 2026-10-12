import {nativeCombatPresentationArchive as presentation} from './nativeCombatPresentationArchive';
import {beforeNativeCombatPresentation} from './nativeCombatPresentationFixture';
import {beforeNativeFrameAttendance} from './nativeFrameAttendanceFixture';
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import ts from 'typescript';
import {nativeSceneFrameHooksArchive as archive} from './nativeSceneFrameHooksArchive';
import {beforeNativeFrameHooks as originalFrameHooks,reverseNativeFrameHookStage} from './nativeFrameHooksFixture';
function beforeNativeFrameHooks(file:string,source:string):string {return originalFrameHooks(file,beforeNativeCombatPresentation(file,source));}
const sha=(s:string)=>crypto.createHash('sha256').update(s).digest('hex');
function must(ok:unknown,why:string):asserts ok {if(!ok)throw Error(why);}
function refusal(fn:()=>unknown,label:string):void {let refused=false;try{fn();}catch{refused=true;}must(refused,'Must refuse '+label);}
const parse=(s:string)=>ts.createSourceFile('hook.ts',s,ts.ScriptTarget.Latest,true);
let mutations=0,duplicates=0,hunkMutations=0,hunkDuplicates=0,functions=0;
for(const row of archive.files){
 const actual=fs.readFileSync(row.file,'utf8');must(sha(beforeNativeFrameHooks(row.file,actual))===row.pureSha256,'Full pure file '+row.file);
 const sf=parse(beforeNativeFrameAttendance(row.file,actual)),rawSf=parse(actual);
 for(const name of new Set(archive.stages.filter(r=>r.file===row.file).map(r=>r.name))){
  const n=sf.statements.find((n):n is ts.FunctionDeclaration=>ts.isFunctionDeclaration(n)&&n.name?.text===name)!;let text=n.getText(sf);const rawNode=rawSf.statements.find((r):r is ts.FunctionDeclaration=>ts.isFunctionDeclaration(r)&&r.name?.text===name)!;const rawText=rawNode.getText(rawSf);functions++;
  refusal(()=>beforeNativeFrameHooks(row.file,actual.slice(0,rawNode.getStart(rawSf))+rawText.replace('{','{/* mutation */')+actual.slice(rawNode.end)),name+' final mutation');mutations++;
  refusal(()=>beforeNativeFrameHooks(row.file,actual+'\n'+rawText),name+' final duplicate');duplicates++;
  for(const stage of archive.stages.filter(r=>r.file===row.file&&r.name===name).reverse()){
   for(const edit of stage.edits){const at=edit.start+stage.edits.filter(e=>e.start<edit.start).reduce((v,e)=>v+e.after.length-e.before.length,0);must(text.slice(at,at+edit.after.length)===edit.after,'Exact selected stage hunk');
    refusal(()=>reverseNativeFrameHookStage(text.slice(0,at)+'/* mutation */'+text.slice(at),stage),name+' hook mutation');hunkMutations++;
    refusal(()=>reverseNativeFrameHookStage(text.slice(0,at)+edit.after+text.slice(at),stage),name+' hook duplicate');hunkDuplicates++;
   }
   text=reverseNativeFrameHookStage(text,stage);
  }
 }
}
for(const row of archive.hosts){const text=fs.readFileSync(row.file,'utf8');must(beforeNativeFrameHooks(row.file,text)===row.before,'Host exact reverse');refusal(()=>beforeNativeFrameHooks(row.file,text+'\n// changed'),row.file+' mutation');mutations++;refusal(()=>beforeNativeFrameHooks(row.file,text+text),row.file+' duplicate');duplicates++;}
let presentationMutations=0,presentationDuplicates=0;for(const row of presentation.filter(row=>archive.hosts.some(host=>host.file===row.file))){const raw=fs.readFileSync(row.file,'utf8');for(const edit of row.edits){must(raw.split(edit.after).length===2,'Unique current presentation hunk '+row.file);const mutated=raw.replace(edit.after,edit.after+'/* mutation */');must(mutated!==raw,'Nontrivial current presentation mutation');refusal(()=>beforeNativeFrameHooks(row.file,mutated),'current presentation mutation');presentationMutations++;refusal(()=>beforeNativeFrameHooks(row.file,raw+'\n'+edit.after),'current presentation duplicate');presentationDuplicates++;}}
const report={presentationMutations,presentationDuplicates,status:'pass',predecessorManifest:archive.predecessorManifest,archivePayloadSha256:sha(JSON.stringify(archive)),files:archive.files.length,hosts:archive.hosts.length,functions,stages:archive.stages.length,hooks:archive.stages.reduce((n,s)=>n+s.edits.length,0),mutationsRefused:mutations,duplicatesRefused:duplicates,hunkMutationsRefused:hunkMutations,hunkDuplicatesRefused:hunkDuplicates,scope:'Exact source-seam reversal and refusal proof; real operation binding and full-frame execution remain required.'};
fs.mkdirSync('balance/reports',{recursive:true});fs.writeFileSync('balance/reports/nativeframehooks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
