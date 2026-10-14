import assert from 'node:assert/strict';
import * as fs from './nativeRepeatEventFS';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import * as oldFs from 'node:fs';
import * as boundaryFs from './nativeShardFoundationFS';
import {nativeShardFoundationArchive as archive} from './nativeShardFoundationArchive';
import {beforeNativeShardFoundation as before,readNativeShardFoundation as rawRead} from './nativeShardFoundationFixture';
const hash=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex'),normal=(text:string)=>text.replace(/\r\n?/g,'\n'),read=(file:string)=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
let mutations=0,hunkMutations=0,duplicates=0,wrongFiles=0,eol=0,rawReads=0,assertions=0,exports=0;
for(const row of archive.rows){const source=read(row.file),parent=before(row.file,source);assert.equal(hash(source),row.rawAfterHash);assert.equal(hash(parent),row.rawBeforeHash);assert.equal(before(row.file,parent),parent);
 for(const variant of[normal(source),normal(source).replace(/\n/g,'\r\n'),normal(parent),normal(parent).replace(/\n/g,'\r\n')]){assert.equal(before(row.file,variant),parent);eol++;}
 for(const version of[source,parent])for(const at of[0,Math.floor(version.length/2),version.length]){assert.throws(()=>before(row.file,version.slice(0,at)+' unauthorized '+version.slice(at)),/Unknown exact/);mutations++;}
 for(const hunk of row.hunks)for(const at of[0,Math.floor(hunk.after.length/2),hunk.after.length]){const modified=hunk.after.slice(0,at)+' unauthorized '+hunk.after.slice(at);assert.throws(()=>before(row.file,normal(source).replace(hunk.after,modified)),/Unknown exact/);hunkMutations++;}
 assert.throws(()=>before(row.file,source+source),/Unknown exact/);duplicates++;assert.equal(before('outside/'+row.file,source),source);
 const other=archive.rows.find(r=>r.file!==row.file&&r.afterHash!==row.afterHash&&r.beforeHash!==row.afterHash);assert(other);assert.throws(()=>before(other.file,source),/Unknown exact/);wrongFiles++;
 const url=new URL('../'+row.file,import.meta.url),file=fileURLToPath(url);for(const form of[url,file,Buffer.from(file)]){assert.equal(rawRead(form,'utf8'),parent);assert.equal(rawRead(form,'utf-8'),parent);assert.equal(rawRead(form,{encoding:'utf8'}),parent);assert.deepEqual(rawRead(form),Buffer.from(parent));rawReads+=4;}
 const fd=fs.openSync(file,'r');try{assert.equal(rawRead(fd,'utf8'),source);rawReads++;}finally{fs.closeSync(fd);}
}
for(const row of archive.readers){const source=read(row.file);assert.equal(hash(source),row.after);let prior=source;for(const edit of[...row.edits].reverse()){assert.equal(prior.split(edit.after).length,2);prior=prior.replace(edit.after,edit.before);}assert.equal(prior,row.original,'Complete original source reader');assert.equal(hash(prior),row.before);
 const tree=ts.createSourceFile(row.file,source,99,true),nonImports=tree.statements.filter(n=>!ts.isImportDeclaration(n)).map(n=>n.getText(tree)),calls:string[]=[];assert.equal(hash(JSON.stringify(nonImports)),row.nonImportHash);const visit=(node:ts.Node):void=>{if(ts.isCallExpression(node)&&/^(assert(?:\.|$)|must$|check$)/.test(node.expression.getText(tree)))calls.push(node.getText(tree));ts.forEachChild(node,visit);};visit(tree);assert.equal(hash(JSON.stringify(calls)),row.assertionHash);assert.equal(calls.length,row.assertions);assertions+=calls.length;
}
assert(read('balance/probe_nativehostperformancesource.ts').includes("import * as oldFs from 'node:fs';"),'Historical source proof keeps its native identity oracle');
for(const row of archive.archives)assert.equal(hash(read(row.file)),row.sha256,'Unchanged prior archive '+row.file);
for(const row of archive.runtime)assert.equal(hash(fs.readFileSync(new URL('../'+row.file,import.meta.url))),row.sha256,'Actual final runtime '+row.file);
for(const row of archive.accepted)assert.equal(hash(fs.readFileSync(new URL('../'+row.file,import.meta.url))),row.sha256,'Exact accepted incoming target '+row.file);
for(const row of archive.unchanged)assert.equal(hash(fs.readFileSync(new URL('../'+row.file,import.meta.url))),row.sha256,'Unchanged accepted123 file '+row.file);
const roster=read('balance/proberoster.ts');for(const probe of archive.probes)assert.equal(roster.split("probe: '"+probe+"'").length,2,'Single genuine probe enrollment');
for(const key of Object.keys(oldFs)){if(key==='default'||key==='readFileSync'||key==='openSync'||key==='closeSync')continue;assert.equal(Reflect.get(boundaryFs,key),Reflect.get(oldFs,key),'Unrelated native filesystem export '+key);exports++;}
// The inherited source proof opens through this view; its fd and path reads
// must observe the same exact parent, without changing its original assertion.
for(const row of archive.rows){const url=new URL('../'+row.file,import.meta.url),file=fileURLToPath(url),parent=before(row.file,read(row.file));
 for(const form of [url,file,Buffer.from(file)])for(const encoding of ['utf8','utf-8',{encoding:'utf8'},null] as const){
  const fd=boundaryFs.openSync(form,'r');try{const got=rawRead(fd,encoding);assert.deepEqual(got,encoding?parent:Buffer.from(parent));assert.throws(()=>rawRead(fd,'utf8'),/Unknown exact/,'consumed source fd refuses a repeated partial source');}finally{boundaryFs.closeSync(fd);}
 }
 const partial=boundaryFs.openSync(file,'r');try{const one=Buffer.alloc(1);assert.equal(fs.readSync(partial,one,0,1,null),1);assert.throws(()=>rawRead(partial,'utf8'),/Unknown exact/,'partially consumed source is refused');assert.equal(fs.readSync(partial,one,0,1,null),0,'failed validation does not reset native fd position');}finally{boundaryFs.closeSync(partial);}
}
const binary=new URL('./reports/native-shard-foundation.bin',import.meta.url),bytes=Buffer.from([0,255,128,254,13,10]);fs.mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});fs.writeFileSync(binary,bytes);assert.deepEqual(rawRead(binary),bytes);assert.equal(rawRead(binary,'latin1'),bytes.toString('latin1'));assert.equal(before('outside','unchanged'),'unchanged');
const nativeBinary=boundaryFs.openSync(binary,'r');try{assert.deepEqual(rawRead(nativeBinary),bytes);}finally{boundaryFs.closeSync(nativeBinary);}
const trackedPath=new URL('../'+archive.rows[0].file,import.meta.url),closed=boundaryFs.openSync(trackedPath,'r');boundaryFs.closeSync(closed);
assert.throws(()=>rawRead(closed),/EBADF/,'closed descriptor retains native failure');
const reused=fs.openSync(binary,'r');try{assert.deepEqual(rawRead(reused),bytes,'untracked descriptor after close is native');}finally{fs.closeSync(reused);}
const externallyClosed=boundaryFs.openSync(trackedPath,'r');fs.closeSync(externallyClosed);
assert.throws(()=>boundaryFs.closeSync(externallyClosed),/EBADF/,'failed close retains native error');
const reusedAfterFailure=fs.openSync(binary,'r');try{assert.deepEqual(rawRead(reusedAfterFailure),bytes,'failed close clears only source-view tracking');}finally{fs.closeSync(reusedAfterFailure);}
// Even when a caller bypasses the view's close, another file never inherits
// its source projection when the OS recycles the numeric descriptor.
let externalReuse=0;for(const open of [boundaryFs.openSync,fs.openSync]){
 const tracked=boundaryFs.openSync(trackedPath,'r');fs.closeSync(tracked);
 const actual=open(binary,'r');try{if(actual===tracked)externalReuse++;assert.deepEqual(rawRead(actual),bytes,'external close and non-source reopen cannot inherit a source view');}finally{boundaryFs.closeSync(actual);}
}
assert.equal(externalReuse,2,'both genuine descriptor-reuse paths exercised');
const result={rows:archive.rows.length,mutations,hunkMutations,duplicates,wrongFiles,eol,rawReads,readers:archive.readers.length,originalAssertions:assertions,oldArchives:archive.archives.length,actualRuntime:archive.runtime.length,exactIncomingTargets:archive.accepted.length,unchanged123Files:archive.unchanged.length,enrolled:archive.probes.length,unrelatedFsExports:exports,unrelatedBinaryPreserved:true};fs.writeFileSync(new URL('./reports/native-shard-foundation-source.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log('PASS native shard foundation source',JSON.stringify(result));
