import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {nativeBirthLifetimeSourceArchive as archive,nativeBirthLifetimeSourceArchiveHash} from './nativeBirthLifetimeSourceArchive';
import {beforeNativeBirthLifetimeSource as project} from './nativeBirthLifetimeSourceFixture';
import {nativeBirthLifetimeArchive as lifetime,nativeBirthLifetimeArchiveHash,nativeBirthLifetimeWorldPin} from './nativeBirthLifetimeArchive';
import {beforeNativeBirthLifetime} from './nativeBirthLifetimeFixture';
import {beforeNativeMainVisualSource} from './nativeMainVisualSourceFixture';
import {beforeNativeSceneKillAftermath} from './nativeSceneKillAftermathIntegrationFixture';
const lf=(source:string)=>source.replace(/\r\n?/g,'\n'),hash=(source:string)=>createHash('sha256').update(source).digest('hex');
const git=(commit:string,file:string)=>lf(execFileSync('git',['show',commit+':'+file],{encoding:'utf8',maxBuffer:30e6,windowsHide:true}));
assert.equal(hash(JSON.stringify(archive)),nativeBirthLifetimeSourceArchiveHash);
assert.equal(hash(JSON.stringify(lifetime)),nativeBirthLifetimeArchiveHash);
assert.equal(archive.files.length,8);assert.equal(new Set(archive.files.map(row=>row.file)).size,8);
let portable=0,mutations=0,duplicates=0,outside=0,legacyMutations=0,hooks=0;
for(const row of archive.files){
 const raw=readFileSync(new URL('../'+row.file,import.meta.url),'utf8'),current=lf(raw),run=(source:string)=>project(row.file,source);
 assert.equal(row.afterSource,git(archive.baseCommit,row.file));assert.equal(row.beforeSource,git(row.beforeCommit,row.file));
 assert.equal(hash(row.afterSource),row.afterHash);assert.equal(hash(row.beforeSource),row.beforeHash);assert.equal(current,row.afterSource);
 assert.equal(run(raw),row.beforeSource);assert.equal(run(row.beforeSource),row.beforeSource);assert.equal(run(run(raw)),row.beforeSource);
 let line=0;for(const source of [current,current.replace(/\n/g,'\r\n'),current.replace(/\n/g,()=>++line%2?'\r\n':'\n'),row.beforeSource,row.beforeSource.replace(/\n/g,'\r\n')]){assert.equal(run(source),row.beforeSource);portable++;}
 for(const source of [current,row.beforeSource]){
  for(const index of [0,Math.floor(source.length/2),source.length-1]){const replacement=source[index]==='!'?'?':'!';assert.throws(()=>run(source.slice(0,index)+replacement+source.slice(index+1)),/Exact native birth lifetime predecessor source refused/);mutations++;}
  assert.throws(()=>run(source+source),/Exact native birth lifetime predecessor source refused/);duplicates++;
  assert.throws(()=>run(source+'\n// unexplained source edit\n'),/Exact native birth lifetime predecessor source refused/);outside++;
 }
 const old=lifetime.files.find(entry=>entry.file===row.file);
 if(old){assert.equal(row.beforeHash,old.afterHash);assert.equal(beforeNativeBirthLifetime(row.file,row.beforeSource),old.beforeSource);assert.equal(git(lifetime.originalCommit,row.file),old.beforeSource);hooks+=(row.beforeSource.match(/\.admitBirth\?\./g)||[]).length;
  for(const edit of old.edits){assert.equal(row.beforeSource.split(edit.after).length,2);assert.throws(()=>run(row.beforeSource.replace(edit.after,edit.after+edit.after)),/Exact native birth lifetime predecessor source refused/);duplicates++;assert.throws(()=>run(row.beforeSource.replace(edit.after,edit.after.replace(/\S/,'~'))),/Exact native birth lifetime predecessor source refused/);legacyMutations++;}
 }else{assert.equal(row.file,'src/engine/world.ts');assert.equal(beforeNativeSceneKillAftermath(beforeNativeMainVisualSource(row.file,run(raw))),git(nativeBirthLifetimeWorldPin,row.file));}
}
assert.equal(hooks,8);assert.throws(()=>project('src/not-captured.ts','anything'),/Unknown native birth lifetime predecessor source/);
const file='balance/probe_nativebirthlifetime.ts',original=git(archive.baseCommit,file),current=lf(readFileSync(new URL('../'+file,import.meta.url),'utf8'));
const prefix="import '../src/engine/world';\nimport {beforeNativeBirthLifetimeSource} from './nativeBirthLifetimeSourceFixture';\n",read="fs.readFileSync(new URL('../'+file,import.meta.url),'utf8').replaceAll('\\r\\n','\\n')",wrapped='beforeNativeBirthLifetimeSource(file,'+read+')';
assert.ok(current.startsWith(prefix));let recovered=current.slice(prefix.length);assert.equal(recovered.split(wrapped).length,2);recovered=recovered.replace(wrapped,read);assert.equal(recovered,original);assert.equal(hash(recovered),archive.originalProbeHash);
for(const preserved of ['balance/nativeBirthLifetimeArchive.ts','balance/nativeBirthLifetimeFixture.ts'])assert.equal(lf(readFileSync(new URL('../'+preserved,import.meta.url),'utf8')),git(archive.baseCommit,preserved));
const tree=ts.createSourceFile(file,recovered,ts.ScriptTarget.Latest,true);let assertions=0;function visit(node:ts.Node):void{if(ts.isCallExpression(node)&&node.expression.getText(tree).startsWith('assert.'))assertions++;node.forEachChild(visit);}visit(tree);
const result={base:archive.baseCommit,archiveHash:nativeBirthLifetimeSourceArchiveHash,files:archive.files.length,portable,mutations,duplicates,outside,legacyMutations,hooks,originalProbeHash:archive.originalProbeHash,originalAssertionCalls:assertions},receipt=hash(JSON.stringify(result));
mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});writeFileSync(new URL('./reports/native-birth-lifetime-source.json',import.meta.url),JSON.stringify({scope:'Exact accepted source predecessors and unchanged original probe body/assertions. Runtime behavior is proved by the separately executed original lifetime course.',result,receipt},null,2)+'\n');console.log(JSON.stringify({...result,receipt}));
