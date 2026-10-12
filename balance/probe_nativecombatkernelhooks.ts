import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import ts from 'typescript';
import {nativeSceneCombatKernelArchive as pure} from './nativeSceneCombatKernelArchive';
import {nativeSceneCombatHooksArchive as hooks} from './nativeSceneCombatHooksArchive';
import {reverseNativeCombatHookStage,beforeNativeCombatKernelHooks,assertNativeCombatHookHost} from './nativeCombatKernelHooksFixture';
const sha=(s:string)=>crypto.createHash('sha256').update(s).digest('hex');
const must=(v:unknown,why:string)=>{if(!v)throw new Error(why);};
const refused=(run:()=>unknown,why:string)=>{let caught=false;try{run();}catch{caught=true;}must(caught,why);};
const emit=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const states=new Map(pure.methods.map(r=>[r.fn as string,r.output as string]));let mutation=0,duplicate=0,erased=0;
for(const stage of hooks.stages){
 const before=states.get(stage.fn)!;must(sha(before)===stage.beforeSha256,'Forward native preimage '+stage.fn);
 let after=before;
 for(const e of [...stage.edits].sort((a,b)=>b.start-a.start)){must(after.slice(e.start,e.start+e.before.length)===e.before,'Forward native hunk '+stage.fn);after=after.slice(0,e.start)+e.after+after.slice(e.start+e.before.length);}
 must(sha(after)===stage.afterSha256,'Forward hook afterhash '+stage.fn);must(reverseNativeCombatHookStage(after,stage)===before,'Exact reverse '+stage.fn);
 for(const e of stage.edits){
  const at=e.start+stage.edits.filter(p=>p.start<e.start).reduce((n,p)=>n+p.after.length-p.before.length,0);
  refused(()=>reverseNativeCombatHookStage(after.slice(0,at)+'/* mutation */'+after.slice(at),stage),'Hook mutation '+stage.fn);mutation++;
  refused(()=>reverseNativeCombatHookStage(after.slice(0,at)+e.after+after.slice(at),stage),'Hook duplicate '+stage.fn);duplicate++;
 }
 if(stage.stage==='erased narrowing across private status and cast scopes'){must(emit(before)===emit(after),'Type narrowing emits identical execution '+stage.fn);erased+=stage.edits.length;}
 states.set(stage.fn,after);
}
for(const row of hooks.files){const current=fs.readFileSync(row.file,'utf8');beforeNativeCombatKernelHooks(row.group,current);refused(()=>beforeNativeCombatKernelHooks(row.group,current+'\n/* unrelated edit */'),'Module tail drift');}
assertNativeCombatHookHost(fs.readFileSync('src/engine/nativeSceneCombatHost.ts','utf8'));
const report={status:'pass',pin:hooks.pin,pureManifest:hooks.pureManifest,methods:pure.methods.length,hookFunctions:new Set(hooks.stages.map(r=>r.fn)).size,stages:hooks.stages.length,hookMutationRefusals:mutation,hookDuplicateRefusals:duplicate,erasedTypeOnlyAssertions:erased,scope:'Exact lifecycle source successor, complete four-module/Host reconstruction, mutation guards and erased-type emit equality. Actual area ownership, record lifetime and native behavior are separate aggregate proof obligations.'};
fs.mkdirSync('balance/reports',{recursive:true});fs.writeFileSync('balance/reports/nativecombatkernelhooks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
