import {beforeNativeClientStartActions as projectActions} from './nativeClientStartActionsCompositionFixture';
import {beforeNativeFrameHooks as originalFrameHooks} from './nativeFrameHooksFixture';
import {nativeCombatPresentationArchive as presentation} from './nativeCombatPresentationArchive';
import {beforeNativeCombatPresentation} from './nativeCombatPresentationFixture';
function beforeNativeFrameHooks(file:string,source:string):string {return originalFrameHooks(file,beforeNativeCombatPresentation(file,source));}
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import * as cp from 'node:child_process';
import ts from 'typescript';
import {nativeSceneFrameArchive as frame} from './nativeSceneFrameArchive';
import {nativeSceneFrameClosureArchive as closure} from './nativeSceneFrameClosureArchive';
import {nativeSceneFrameCallbacksArchive as callbacks} from './nativeSceneFrameCallbacksArchive';
import {nativeSceneFrameInterfacesArchive as interfaces} from './nativeSceneFrameInterfacesArchive';
const sha=(s:string|Buffer)=>crypto.createHash('sha256').update(s).digest('hex');
function must(value:unknown,why:string):asserts value {if(!value)throw Error(why);}
const parse=(text:string)=>ts.createSourceFile('source.ts',text,ts.ScriptTarget.Latest,true);
const read=(file:string)=>beforeNativeFrameHooks(file,projectActions('startMenus',file,fs.readFileSync(path.join(process.cwd(),file),'utf8')));
const git=cp.execFileSync('git',['show',frame.pin+':src/engine/world.ts'],{encoding:'utf8',maxBuffer:20*1024*1024});
must(sha(git)===frame.worldSha256&&frame.worldSha256===closure.worldSha256,'Exact immutable complete World');
const gitAst=parse(git),world=gitAst.statements.find((n):n is ts.ClassDeclaration=>ts.isClassDeclaration(n)&&n.name?.text==='World')!;
const update=world.members.find((n):n is ts.MethodDeclaration=>ts.isMethodDeclaration(n)&&n.name.getText(gitAst)==='update')!;
must(sha(update.getText(gitAst))===frame.updateSha256,'Immutable complete update');
const cores=new Map(['LocalControllers','ActorTick','EffectsTick','FrameCallbacks'].map(g=>[g,read('src/engine/nativeScene'+g+'.ts')]));
const frameText=read('src/engine/nativeSceneFrame.ts');
function receiver(source:string,method:boolean):string {
 const prefix=method?'class Original {\n':'function original(){\n',sf=parse(prefix+source+'\n}'),edits:{a:number;b:number}[]=[];
 function walk(n:ts.Node):void {if(n.kind===ts.SyntaxKind.ThisKeyword)edits.push({a:n.getStart(sf)-prefix.length,b:n.end-prefix.length});ts.forEachChild(n,walk);}walk(sf);
 for(const e of edits.sort((a,b)=>b.a-a.a))source=source.slice(0,e.a)+'nativeHost'+source.slice(e.b);
 return source;
}
function functions(text:string,name:string):string[]{const sf=parse(text);return sf.statements.filter((n):n is ts.FunctionDeclaration=>ts.isFunctionDeclaration(n)&&n.name?.text===name).map(n=>n.getText(sf));}
function named(text:string,name:string):string[]{const sf=parse(text);return sf.statements.filter(n=>((ts.isFunctionDeclaration(n)||ts.isInterfaceDeclaration(n)||ts.isTypeAliasDeclaration(n)||ts.isClassDeclaration(n))&&n.name?.getText(sf)===name)||ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(sf)===name)).map(n=>n.getText(sf));}
function verifyFunction(text:string,name:string,expected:string):void {const rows=functions(text,name);must(rows.length===1,'Unique '+name);must(rows[0]===expected.trimEnd(),'Exact native body '+name);}
let mutations=0,duplicates=0;
function negatives(text:string,name:string,expected:string):void {
 for(const [kind,bad]of [['mutation',text.replace(expected.trimEnd(),expected.trimEnd().replace('{','{/* deliberate source change */'))],['duplicate',text+'\n'+expected]] as const){let refused=false;try{verifyFunction(bad,name,expected);}catch{refused=true;}must(refused,'Refuse '+kind+' '+name);if(kind==='mutation')mutations++;else duplicates++;}
}
for(const row of frame.groups){
 must(git.slice(row.start,row.end)===row.source&&sha(row.source)===row.sourceSha256,'Original section '+row.name);
 const nodes=row.statementIndices.map(i=>update.body!.statements[i]);must(nodes[0].getStart(gitAst)===row.start&&nodes.at(-1)!.end===row.end,'Exact statement cut '+row.name);
 const expected=`export function ${row.fn}(nativeHost:NativeSceneFrameHost,dt:number${row.name==='actors'?',rawDt:number':''}):void {\n${receiver(row.source,false)}\n}\n`;
 must(expected===row.output&&sha(expected)===row.outputSha256,'Archived exact statement transform '+row.name);
 verifyFunction(frameText,row.fn,expected);negatives(frameText,row.fn,expected);
}
const indices=frame.groups.flatMap(g=>[...g.statementIndices]);must(indices.length===122&&indices.every((x,i)=>x===111+i),'Every original local statement111..232 in exact order');
const methodRows=[...closure.methods,...callbacks.methods.map(row=>({...row,group:'FrameCallbacks'}))];
for(const row of methodRows){
 const original=world.members.filter(n=>ts.isMethodDeclaration(n)&&n.name.getText(gitAst)===row.name);must(original.length===1&&original[0].getText(gitAst)===row.source,'Immutable original '+row.name);must(sha(row.source)===row.sourceSha256,'Original method hash '+row.name);
 const shifted=receiver(row.source,true),sf=parse('class Original {\n'+shifted+'\n}'),cls=sf.statements.find(ts.isClassDeclaration)!,method=cls.members.find(ts.isMethodDeclaration)!;
 let expected='export function '+row.fn+shifted.slice(method.name.end-method.getStart(sf));const at=expected.indexOf('(')+1;expected=expected.slice(0,at)+'nativeHost:NativeSceneFrameHost'+(method.parameters.length?', ':'')+expected.slice(at);
 must(expected===row.output&&sha(expected)===row.outputSha256,'Only receiver+signature transform '+row.name);
 if(row.name==='updateEvaporation'){must(expected.split('World.EVAP').length===2,'One deliberate static mapping');expected=expected.replace('World.EVAP','NATIVE_FRAME_EVAP');}
 const text=cores.get(row.group)!;verifyFunction(text,row.fn,expected);negatives(text,row.fn,expected);
}
for(const row of [...closure.helpers,...callbacks.helpers.map(row=>({...row,group:'FrameCallbacks'}))]){must(named(git,row.name)[0]===row.source&&sha(row.source)===row.sourceSha256,'Original helper '+row.name);must(row.output===(row.source.startsWith('export ')?row.source:'export '+row.source),'Export-only helper '+row.name);const rows=named(cores.get(row.group)!,row.name);must(rows.length===1&&rows[0]===row.output,'Exact shared helper '+row.name);}
for(const group of closure.groups)for(const helper of group.externalHelpers){const rows=named(read('src/engine/'+helper.file),helper.name);must(rows.length===1&&rows[0].replace(/^export\s+/,'')===helper.source,'Exact reused helper '+helper.name);must(named(git,helper.name)[0]===helper.source,'Original reused helper '+helper.name);}
for(const helper of interfaces.sharedFrameHelpers){const original=frame.helpers.find(r=>r.name===helper.name)!;const rows=named(read('src/engine/'+helper.provider),helper.name);must(rows.length===1&&rows[0].replace(/^export\s+/,'')===original.source,'Frame reused helper '+helper.name);must(named(git,helper.name)[0]===original.source,'Original frame helper '+helper.name);}
for(const row of callbacks.factories){
 const original=world.members.find(n=>ts.isPropertyDeclaration(n)&&n.name.getText(gitAst)===row.name)!;
 must(original.getText(gitAst)===row.source&&sha(row.source)===row.sourceSha256,'Original callback field '+row.name);
 const prefix='const field = ',sf=parse(prefix+row.initializer+';'),edits:{a:number;b:number}[]=[];
 function visit(n:ts.Node):void {if(n.kind===ts.SyntaxKind.ThisKeyword)edits.push({a:n.getStart(sf)-prefix.length,b:n.end-prefix.length});ts.forEachChild(n,visit);}visit(sf);
 let expression:string=row.initializer;for(const e of edits.sort((a,b)=>b.a-a.a))expression=expression.slice(0,e.a)+'nativeHost'+expression.slice(e.b);
 const expected='export function '+row.fn+'(nativeHost:NativeSceneFrameHost):NativeSceneFrameHost["'+row.name+'"] {\n return '+expression+';\n}';
 must(expected===row.output&&sha(expected)===row.outputSha256,'Only callback receiver transform '+row.name);
 const text=cores.get('FrameCallbacks')!;verifyFunction(text,row.fn,expected);negatives(text,row.fn,expected);
}
const evap=world.members.find(n=>n.name?.getText(gitAst)==='EVAP')!;must(evap.getText(gitAst)===interfaces.constant.original,'Immutable EVAP source');const constant=named(cores.get('EffectsTick')!,'NATIVE_FRAME_EVAP');must(constant.length===1&&constant[0]===interfaces.constant.export,'Shared exact EVAP initializer');
const emit=(s:string)=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
for(const module of interfaces.modules){must(sha(module.before)===module.beforeSha256&&sha(module.after)===module.afterSha256,'Type adapter source pins '+module.file);must(read(module.file)===module.after,'Actual type-only adapter '+module.file);must(emit(module.before)===emit(module.after)&&sha(emit(module.before))===module.executableSha256,'Byte-identical executable '+module.file);}
for(const target of interfaces.targets)must(sha(read(target.file))===target.sha256,'Complete runtime source/import binding '+target.file);
const allNames=[...frame.groups.map(x=>x.fn),...methodRows.map(x=>x.fn),...callbacks.factories.map(x=>x.fn)];must(new Set(allNames).size===allNames.length,'No duplicate extracted body');
let currentMutations=0,currentDuplicates=0;
for(const row of presentation.filter(row=>row.file==='src/engine/nativeSceneCombatHost.ts')){
 const raw=projectActions('startMenus',row.file,fs.readFileSync(row.file,'utf8'));
 for(const edit of row.edits){
  must(raw.split(edit.after).length===2,'Unique current presentation hunk');
  const mutated=raw.replace(edit.after,edit.after+'/* changed presentation */');must(mutated!==raw,'Nontrivial current mutation');
  for(const [kind,bad] of [['mutation',mutated],['duplicate',raw+'\n'+edit.after]] as const){let refused=false;try{beforeNativeFrameHooks(row.file,bad);}catch{refused=true;}must(refused,'Refuse current '+kind);if(kind==='mutation')currentMutations++;else currentDuplicates++;}
 }
 const outside=raw+'\n/* unknown outside change */';must(beforeNativeCombatPresentation(row.file,outside).endsWith('/* unknown outside change */'),'Current reversal preserves outside changes');let refused=false;try{beforeNativeFrameHooks(row.file,outside);}catch{refused=true;}must(refused,'Original full source guard still refuses outside change');
}
const report={currentMutations,currentDuplicates,status:'pass',pin:frame.pin,worldSha256:frame.worldSha256,sections:frame.groups.length,orderedStatements:indices.length,methods:methodRows.length,callbackFactories:callbacks.factories.length,helpers:closure.helpers.length+callbacks.helpers.length,externalTypeOnlyModules:interfaces.modules.length,mutationsRefused:mutations,duplicatesRefused:duplicates,staticMappings:1,hostProperties:closure.properties.length+1+callbacks.hostAdded.length,originalFieldDeclarations:closure.fields.length+callbacks.fields.length,scope:'Exact source extraction and external type-only executable proof. Concrete owner/provider bindings, new frame lifetime seams and real scheduler acceptance remain separate required work.'};
fs.mkdirSync('balance/reports',{recursive:true});fs.writeFileSync('balance/reports/nativeframesource.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
