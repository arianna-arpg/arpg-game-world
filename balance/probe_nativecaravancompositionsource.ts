import assert from 'node:assert/strict';
import {nativeShardsCaravanFS as fs} from './nativeShardsCompositionFixture';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {nativeCaravanCompositionArchive as archive} from './nativeCaravanCompositionArchive';
import {beforeNativeCaravanPrior as project,readNativeCaravanPrior} from './nativeCaravanCompositionFixture';
const hash=(text:string|Buffer)=>createHash('sha256').update(text).digest('hex'),read=(file:string)=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),lf=(text:string)=>text.replace(/\r\n?/g,'\n');
let mutations=0,duplicates=0,outside=0,variants=0;
for(const row of archive.rows){const source=read(row.file),old=project(row.file,source);assert.equal(hash(lf(source)),row.afterHash);assert.equal(hash(old),row.rawBeforeHash);assert.equal(hash(lf(old)),row.beforeHash);assert.equal(project(row.file,old),old);
 let line=0;for(const variant of [lf(source),lf(source).replace(/\n/g,'\r\n'),lf(source).replace(/\n/g,()=>++line%2?'\r\n':'\n'),lf(source).replace(/\n/g,'\r')]){assert.equal(project(row.file,variant),old);variants++;}
 for(const edit of row.edits){for(const bad of [edit.after.replace(/\S/,'!'),edit.after.slice(0,Math.floor(edit.after.length/2))+'!'+edit.after.slice(Math.floor(edit.after.length/2)),edit.after.replace(/\S(?![\s\S]*\S)/,'?')]){assert.notEqual(bad,edit.after);assert.throws(()=>project(row.file,lf(source).replace(edit.after,bad)));mutations++;}assert.throws(()=>project(row.file,lf(source).replace(edit.after,edit.after+edit.after)));duplicates++;}
 assert.throws(()=>project(row.file,source+'\n// outside admitted source\n'));outside++;
 const url=new URL('../'+row.file,import.meta.url);assert.equal(readNativeCaravanPrior(url,'utf8'),old);assert.equal(readNativeCaravanPrior(url,'utf-8'),old);assert.deepEqual(readNativeCaravanPrior(url),Buffer.from(old,'utf8'));
}
const assertions=(file:string,text:string)=>{const sf=ts.createSourceFile(file,text,99,true),calls:string[]=[];function visit(node:ts.Node):void{if(ts.isCallExpression(node)&&/^(assert(?:\.|$)|must$|check$)/.test(node.expression.getText(sf)))calls.push(node.getText(sf));node.forEachChild(visit);}visit(sf);return calls;};let assertionCount=0;
for(const row of archive.readers){const source=read(row.file);assert.equal(hash(source),row.afterHash);let old=source;for(const edit of row.edits){assert.equal(old.split(edit.after).length,2);old=old.replace(edit.after,edit.before);}assert.equal(hash(old),row.beforeHash,'Complete original reader by declared bounded edit inversion');assert.equal(old,project(row.file,source));const calls=assertions(row.file,source);assert.deepEqual(calls,assertions(row.file,old));assert.equal(calls.length,row.assertions);assert.equal(hash(JSON.stringify(calls)),row.assertionHash);assertionCount+=calls.length;}
for(const row of archive.priorArchives)assert.equal(hash(read(row.file)),row.sha256,'Unchanged prior archive '+row.file);
for(const row of archive.reviewedTargets)assert.equal(hash(read(row.file)),row.afterSha256,'Exact independently reviewed caravan target '+row.file);
const unknown='// no source row\r\n';assert.equal(project('unrelated.ts',unknown),unknown);assert.deepEqual(readNativeCaravanPrior(new URL('../package.json',import.meta.url)),fs.readFileSync(new URL('../package.json',import.meta.url)));
const result={parents:archive.parents,rows:archive.rows.length,readers:archive.readers.length,assertionCount,archives:archive.priorArchives.length,reviewedTargets:archive.reviewedTargets.length,mutations,duplicates,outside,variants,rawReads:archive.rows.length*3,noRowControls:2},receipt=hash(JSON.stringify(result));fs.mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('./reports/native-caravan-composition-source.json',import.meta.url),JSON.stringify({result,receipt},null,2)+'\n');console.log(JSON.stringify({result,receipt}));

// Expanded legacy coverage keeps all preceding assertions and controls intact.
import {beforeNativeCaravanGroundRead,nativeCaravanGroundReads,nativeStatusVoiceSources} from './nativeCaravanLegacySourceFixture';
let groundMutations=0,groundVariants=0;
for(const row of nativeCaravanGroundReads){const source=read(row.file),old=beforeNativeCaravanGroundRead(row.file,source);assert.equal(hash(old),row.prior);assert.equal(beforeNativeCaravanGroundRead(row.file,old),old);for(const variant of [source.replace(/\r\n?/g,'\n'),source.replace(/\r\n?/g,'\n').replaceAll('\n','\r\n'),source.replace(/\r\n?/g,'\n').replaceAll('\n','\r')]){assert.equal(beforeNativeCaravanGroundRead(row.file,variant),old);groundVariants++;}for(const at of [0,Math.floor(source.length/2),source.length-1]){assert.throws(()=>beforeNativeCaravanGroundRead(row.file,source.slice(0,at)+'!'+source.slice(at+1)));groundMutations++;}assert.throws(()=>beforeNativeCaravanGroundRead(row.file,source+'\n// outside\n'));assert.throws(()=>beforeNativeCaravanGroundRead(row.file,source+source));}
assert.equal(beforeNativeCaravanGroundRead('unlisted.ts','unchanged\r\n'),'unchanged\r\n');
const actualWorld=read('src/engine/world.ts'),actualRestoration=read('src/engine/nativeSceneRestoration.ts'),statusCensus=nativeStatusVoiceSources(actualWorld,actualRestoration),restorationTree=ts.createSourceFile('restoration.ts',actualRestoration,99,true);let cureMutations=0;
assert(statusCensus.startsWith(actualWorld+'\n'));
for(const name of ['sceneCleanseActor','sceneRingAfflictions']){const fn=restorationTree.statements.find((node):node is ts.FunctionDeclaration=>ts.isFunctionDeclaration(node)&&node.name?.text===name)!;const source=fn.getText(restorationTree);assert(statusCensus.includes(source));for(const bad of [source.replace("'combat'","'events'"),source.replace('target.pos','target.aim'),source.replace('return','throw')]){assert.notEqual(bad,source);assert.throws(()=>nativeStatusVoiceSources(actualWorld,actualRestoration.replace(source,bad)));cureMutations++;}assert.throws(()=>nativeStatusVoiceSources(actualWorld,actualRestoration+'\n'+source));assert.throws(()=>nativeStatusVoiceSources(actualWorld,actualRestoration.replace(source,"function unrelated(){ return ['cleansed','rung clean','combat']; }")));}
assert.equal(nativeStatusVoiceSources(actualWorld,actualRestoration+"\nfunction unrelatedCaption(){return 'addled!';}\n"),statusCensus,'Unrelated restoration strings cannot supply census coverage');
const legacyResult={groundFiles:nativeCaravanGroundReads.length,groundMutations,groundVariants,cureBodies:2,cureMutations,unknownCoverageRefused:true};fs.writeFileSync(new URL('./reports/native-caravan-legacy-read-source.json',import.meta.url),JSON.stringify({result:legacyResult,receipt:hash(JSON.stringify(legacyResult))},null,2)+'\n');console.log(JSON.stringify(legacyResult));
// The four extraction and registry read predecessors are the exact committed source files.
import {execFileSync as extractedGit} from 'node:child_process';
import {nativeCaravanExtractedReadArchive as extractedArchive} from './nativeCaravanExtractedReadArchive';
import {beforeNativeCaravanExtractedRead as extractedProject,readNativeCaravanExtracted} from './nativeCaravanExtractedReadFixture';
let extractedMutations=0,extractedDuplicates=0,extractedVariants=0;
for(const row of extractedArchive.rows){
 const source=read(row.file),prior=extractedProject(row.file,source),git=(commit:string)=>extractedGit('git',['show',commit+':'+row.file],{encoding:'utf8',maxBuffer:20e6});
 assert.equal(source,git(extractedArchive.commit),'Actual unchanged accepted observation module');assert.equal(prior,git(extractedArchive.predecessor),'Whole committed extracted predecessor');assert.equal(hash(prior),row.prior);assert.equal(extractedProject(row.file,prior),prior);
 assert.equal(readNativeCaravanExtracted(new URL('../'+row.file,import.meta.url),'utf8'),prior);
 for(const variant of [source.replaceAll('\n','\r\n'),source.replaceAll('\n','\r'),source]){assert.equal(extractedProject(row.file,variant),prior);extractedVariants++;}
 for(const hunk of row.hunks){for(const at of [0,Math.floor(hunk.after.length/2),hunk.after.length-1]){const bad=hunk.after.slice(0,at)+'!'+hunk.after.slice(at+1);assert.notEqual(bad,hunk.after);assert.throws(()=>extractedProject(row.file,source.replace(hunk.after,bad)));extractedMutations++;}assert.throws(()=>extractedProject(row.file,source.replace(hunk.after,hunk.after+hunk.after)));extractedDuplicates++;}
 for(const original of [source,prior]){assert.throws(()=>extractedProject(row.file,original+'\n// unreviewed outside edit\n'));assert.throws(()=>extractedProject(row.file,original+original));}
 for(const other of extractedArchive.rows.filter(other=>other.file!==row.file))assert.throws(()=>extractedProject(other.file,source));
}
assert.equal(extractedProject('unlisted.ts','untouched\r\n'),'untouched\r\n');
const extractedResult={files:extractedArchive.rows.length,commit:extractedArchive.commit,predecessor:extractedArchive.predecessor,mutations:extractedMutations,duplicates:extractedDuplicates,variants:extractedVariants,outside:extractedArchive.rows.length*2,wrongFile:extractedArchive.rows.length*(extractedArchive.rows.length-1)};fs.writeFileSync(new URL('./reports/native-caravan-extracted-source.json',import.meta.url),JSON.stringify({result:extractedResult,receipt:hash(JSON.stringify(extractedResult))},null,2)+'\n');console.log(JSON.stringify(extractedResult));
