import {beforeNativeContinuity as projectContinuity} from './nativeContinuityCompositionFixture';
import {beforeNativeClientStart} from './nativeClientStartFixtureSource';
import {beforeNativeClientPublicationComposition as projectClientPublication} from './nativeClientPublicationCompositionFixture';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
import {nativeClientRuntimeArchive as archive} from './nativeClientRuntimeArchive';
import {beforeNativeClientRuntime} from './nativeClientRuntimeFixtureSource';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),typeOnly=new Set(['src/engine/mercbrain.ts','src/net/scripted.ts','src/net/couch.ts','src/net/remote.ts','src/engine/aimassist.ts','src/net/intent.ts','src/net/snapshot.ts']);let mutations=0,duplicates=0,emits=0;
for(const row of archive.files){const raw=projectClientPublication('runtime',row.file,fs.readFileSync(path.join(root,row.file),'utf8')).replaceAll('\r\n','\n');assert.equal(combatHash(raw),row.afterSha256,row.file+' final source');const old=beforeNativeClientRuntime(row.file,raw);assert.equal(combatHash(old),row.beforeSha256,row.file+' entire original');assert.equal(beforeNativeClientRuntime(row.file,raw.replaceAll('\n','\r\n')),old);assert.equal(beforeNativeClientRuntime(row.file,raw+'\n// unknown outside delta\n'),old+'\n// unknown outside delta\n');assert.equal(beforeNativeClientRuntime(row.file,old),old);
 for(const h of row.hunks){assert.equal(raw.split(h.after).length-1,1,'actual unique hunk');const changed=raw.replace(h.after,'/*unknown*/'+h.after.slice(2));assert.notEqual(changed,raw);assert.throws(()=>beforeNativeClientRuntime(row.file,changed),/exact source hunk refused/);mutations++;assert.throws(()=>beforeNativeClientRuntime(row.file,raw+h.after),/exact source hunk refused/);duplicates++;}
 if(typeOnly.has(row.file)){const emit=(source:string)=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;assert.equal(emit(raw),emit(old),row.file+' type-only JS');emits++;}
 if(process.argv.includes('--provenance'))assert.equal(execFileSync('git',['show',archive.pin+':'+row.file],{encoding:'utf8',maxBuffer:20e6}).replaceAll('\r\n','\n'),old,row.file+' immutable commit');
}
for(const row of archive.newFiles)assert.equal(combatHash(beforeNativeClientStart(row.file,projectContinuity('production',row.file,fs.readFileSync(path.join(root,row.file),'utf8'))).replaceAll('\r\n','\n')),row.sha256,row.file+' new runtime');assert.equal(emits,7);const result={pin:archive.pin,files:archive.files.length,newRuntime:archive.newFiles.length,mutations,duplicates,typeOnlyEmits:emits,fullSource:true,CRLF:true,outsidePreserved:true};writeCombatProof('native-client-runtime-source.json',result);console.log(JSON.stringify(result));
