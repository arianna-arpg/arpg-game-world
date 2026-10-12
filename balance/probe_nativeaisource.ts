import {beforeNativeClientPublicationComposition as projectClientPublication} from './nativeClientPublicationCompositionFixture';
import {beforeNativeAreaViewQueries as originalBeforeNativeAreaViewQueries} from './nativeAreaViewQueryFixture';
function beforeNativeAreaViewQueries(file:string,source:string):string {return originalBeforeNativeAreaViewQueries(file,projectClientPublication('view',file,source));}
import {nativeAICompositionArchive as composition} from './nativeAICompositionArchive';
import {beforeNativeAIComposition} from './nativeAICompositionFixture';
import {beforeNativeAITargetContinuity} from './nativeAITargetContinuityFixture';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {nativeSceneAIArchive as archive} from './nativeSceneAIArchive';
import {beforeNativeAI} from './nativeAIExtractionFixture';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),read=(f:string)=>beforeNativeAITargetContinuity(f,beforeNativeAIComposition(f,beforeNativeAreaViewQueries(f,fs.readFileSync(new URL('../'+f,import.meta.url),'utf8')))),parse=(s:string)=>ts.createSourceFile('source.ts',s,ts.ScriptTarget.Latest,true),printer=ts.createPrinter({removeComments:true});
const print=(n:ts.Node,sf:ts.SourceFile)=>printer.printNode(ts.EmitHint.Unspecified,n,sf);
const emit=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,removeComments:true}}).outputText;
const world=execFileSync('git',['show',archive.pin+':src/engine/world.ts'],{maxBuffer:20*1024*1024}).toString().replaceAll('\r\n','\n');assert.equal(hash(world),archive.worldHash);const wsf=parse(world),klass=wsf.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;
const core=read('src/engine/nativeSceneAIPreparation.ts');let pure=core.replace("import {observeNativeCombatRetirement,finishNativeCombatRetirement,cancelNativeCombatRetirement} from './nativeCombatRecordObservation';\n",'');
const retirement=`    if (i >= 0) {
      let nativeRetirement:ReturnType<typeof observeNativeCombatRetirement>;
      const nativeSelect=(selected:Actor[])=>{nativeRetirement=observeNativeCombatRetirement(nativeHost,selected);return selected;};
      try { nativeSelect(nativeHost.actors).splice(i, 1); finishNativeCombatRetirement(nativeHost,nativeRetirement); }
      finally { cancelNativeCombatRetirement(nativeHost,nativeRetirement); }
    }`;
assert.equal(pure.split(retirement).length,3);pure=pure.replaceAll(retirement,'    if (i >= 0) nativeHost.actors.splice(i, 1);');const csf=parse(pure);
for(const row of archive.rows){const original=klass.members.find(n=>ts.isMethodDeclaration(n)&&n.name.getText(wsf)===row.name) as ts.MethodDeclaration;assert(original);assert.equal(original.getText(wsf),row.original);const actual=csf.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='scene'+row.name[0].toUpperCase()+row.name.slice(1)) as ts.FunctionDeclaration;assert(actual?.body);const transformed=ts.transform(original.body!,[context=>root=>{const visit:ts.Visitor=node=>{if(node.kind===ts.SyntaxKind.ThisKeyword)return ts.factory.createIdentifier('nativeHost');if(ts.isPropertyAccessExpression(node)&&node.expression.getText(wsf)==='World'&&['PATH_DEFAULT','PATH_UNIFORM','NO_SEATS'].includes(node.name.text))return ts.factory.createIdentifier('NATIVE_AI_'+node.name.text);return ts.visitEachChild(node,visit,context);};return ts.visitNode(root,visit) as ts.Block;}]);assert.equal(print(actual.body,csf),print(transformed.transformed[0],wsf),row.name+' exact executable body');transformed.dispose();}
for(const row of archive.constants){assert(world.includes(row.original));assert(core.includes(row.core));}
const losFrom=(sf:ts.SourceFile)=>{for(const row of sf.statements)if(ts.isVariableStatement(row)){const decl=row.declarationList.declarations.find(d=>d.name.getText(sf)==='LOS_PAIR_STRIDE');if(decl)return decl;}throw Error('Missing LOS stride');};assert.equal(print(losFrom(wsf),wsf),print(losFrom(csf),csf));
let mutations=0,duplicates=0;for(const row of archive.shared){const source=read(row.file);assert.equal(source,row.after);assert.equal(beforeNativeAI(row.file,source),row.before);for(const h of row.changes){assert.throws(()=>beforeNativeAI(row.file,source.replace(h.after,h.after+'\n/* mutation */')));mutations++;assert.throws(()=>beforeNativeAI(row.file,source.replace(h.after,h.after+'\n'+h.after)));duplicates++;}}
for(const row of archive.fresh)assert.equal(read(row.file),row.after);
for(const row of archive.typeOnlyChanges){assert.equal(emit(row.before),emit(row.after),row.file+' type-only emit');if(row.file.endsWith('/perception.ts'))assert.equal(read(row.file),row.after);else{const lifetime=archive.lifetime.find(r=>r.file===row.file)!;assert.equal(lifetime.before,row.after);assert.equal(read(row.file),lifetime.after);}}
const actions=archive.lifetime.find(r=>r.file.endsWith('/aiActions.ts'))!;assert.equal(read(actions.file),actions.after);for(const file of ['src/engine/ai.ts','src/engine/perception.ts','src/engine/aiActions.ts']){const original=execFileSync('git',['show',archive.pin+':'+file],{maxBuffer:10*1024*1024}).toString();const before=archive.shared.find(r=>r.file===file)!.before;assert.equal(emit(original),emit(before),'immutable runtime predecessor '+file);}
assert.equal(hash(fs.readFileSync(new URL('./nativeAICompositionArchive.ts',import.meta.url),'utf8')),'9d04f472dd7e89ced1738e1f964fafad814366f3f2971649692209731157b14f','immutable declared AI composition');
let compositionMutations=0,compositionDuplicates=0;
for(const row of composition){const raw=beforeNativeAreaViewQueries(row.file,fs.readFileSync(new URL('../'+row.file,import.meta.url),'utf8')).replaceAll('\r\n','\n');assert.equal(hash(raw),row.afterHash);const projected=beforeNativeAIComposition(row.file,raw);assert.equal(hash(projected),row.beforeHash);assert.equal(beforeNativeAIComposition(row.file,raw.replaceAll('\n','\r\n')),projected);
 const check=(source:string)=>beforeNativeAI(row.file,beforeNativeAITargetContinuity(row.file,beforeNativeAIComposition(row.file,source)));check(raw);
 for(const edit of row.changes){const at=Math.floor(edit.after.length/2),changed=edit.after.slice(0,at)+(edit.after[at]==='X'?'Y':'X')+edit.after.slice(at+1);assert.notEqual(changed,edit.after);assert.throws(()=>check(raw.replace(edit.after,changed)));compositionMutations++;assert.throws(()=>check(raw+'\n'+edit.after));compositionDuplicates++;}
 const mark='\n/* unknown outside composition edit */';assert.equal(beforeNativeAIComposition(row.file,raw+mark),projected+mark);assert.throws(()=>check(raw+mark));
}
const result={compositionMutations,compositionDuplicates,methods:archive.rows.length,constants:archive.constants.length+1,sharedFiles:archive.shared.length,newFiles:archive.fresh.length,mutations,duplicates,typeOnlyEmit:2,immutableRuntimeInputs:3};const receipt=hash(JSON.stringify(result));fs.mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('./reports/native-ai-source.json',import.meta.url),JSON.stringify({result,receipt},null,2)+'\n');console.log(JSON.stringify({result,receipt}));
