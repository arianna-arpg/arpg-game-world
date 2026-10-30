import assert from 'node:assert/strict';
import * as fs from './nativeHostPerformanceFS';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import * as oldFs from 'node:fs';
import * as boundaryFs from './nativeHostClosureFS';
import {nativeHostClosureArchive as archive} from './nativeHostClosureArchive';
import {beforeNativeHostClosure as before,readNativeHostClosure as rawRead} from './nativeHostClosureFixture';
const hash=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex'),normal=(text:string)=>text.replace(/\r\n?/g,'\n'),read=(file:string)=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
let mutations=0,duplicates=0,wrongFiles=0,eol=0,rawReads=0,assertions=0,exports=0;
for(const row of archive.rows){const source=read(row.file),parent=before(row.file,source);assert.equal(hash(source),row.rawAfterHash);assert.equal(hash(parent),row.rawBeforeHash);assert.equal(before(row.file,parent),parent);
 for(const variant of[normal(source),normal(source).replace(/\n/g,'\r\n'),normal(parent),normal(parent).replace(/\n/g,'\r\n')]){assert.equal(before(row.file,variant),parent);eol++;}
 for(const version of[source,parent])for(const at of[0,Math.floor(version.length/2),version.length]){assert.throws(()=>before(row.file,version.slice(0,at)+' unauthorized '+version.slice(at)),/Unknown exact/);mutations++;}
 assert.throws(()=>before(row.file,source+source),/Unknown exact/);duplicates++;assert.equal(before('outside/'+row.file,source),source);
 const other=archive.rows.find(r=>r.file!==row.file&&r.afterHash!==row.afterHash&&r.beforeHash!==row.afterHash);assert(other);assert.throws(()=>before(other.file,source),/Unknown exact/);wrongFiles++;
 const file=new URL('../'+row.file,import.meta.url);assert.equal(rawRead(file,'utf8'),parent);assert.equal(rawRead(file,'utf-8'),parent);assert.deepEqual(rawRead(file),Buffer.from(parent));rawReads+=3;
}
for(const row of archive.readers){const source=read(row.file);assert.equal(hash(source),row.after);let prior=source;for(const edit of[...row.edits].reverse()){assert.equal(prior.split(edit.after).length,2);prior=prior.replace(edit.after,edit.before);}assert.equal(prior,row.original,'Complete original source reader');assert.equal(hash(prior),row.before);
 const tree=ts.createSourceFile(row.file,source,99,true),nonImports=tree.statements.filter(n=>!ts.isImportDeclaration(n)).map(n=>n.getText(tree)),calls:string[]=[];assert.equal(hash(JSON.stringify(nonImports)),row.nonImportHash);const visit=(node:ts.Node):void=>{if(ts.isCallExpression(node)&&/^(assert(?:\.|$)|must$|check$)/.test(node.expression.getText(tree)))calls.push(node.getText(tree));ts.forEachChild(node,visit);};visit(tree);assert.equal(hash(JSON.stringify(calls)),row.assertionHash);assert.equal(calls.length,row.assertions);assertions+=calls.length;
}
for(const row of archive.archives)assert.equal(hash(read(row.file)),row.sha256,'Unchanged prior archive '+row.file);
for(const row of archive.runtime)assert.equal(hash(read(row.file)),row.sha256,'Actual combined runtime '+row.file);
for(const row of archive.accepted)assert.equal(hash(read(row.file)),row.sha256,'Exact accepted repair '+row.lane+'/'+row.file);
for(const key of Object.keys(oldFs)){if(key==='default'||key==='readFileSync')continue;assert.equal(Reflect.get(boundaryFs,key),Reflect.get(oldFs,key),'Unrelated native filesystem export '+key);exports++;}
const binary=new URL('./reports/native-host-closure.bin',import.meta.url),bytes=Buffer.from([0,255,128,254,13,10]);fs.mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});fs.writeFileSync(binary,bytes);assert.deepEqual(rawRead(binary),bytes);assert.equal(rawRead(binary,'latin1'),bytes.toString('latin1'));assert.equal(before('outside','unchanged'),'unchanged');
const result={rows:archive.rows.length,mutations,duplicates,wrongFiles,eol,rawReads,readers:archive.readers.length,originalAssertions:assertions,oldArchives:archive.archives.length,actualRuntime:archive.runtime.length,exactAcceptedTargets:archive.accepted.length,unrelatedFsExports:exports,unrelatedBinaryPreserved:true};fs.writeFileSync(new URL('./reports/native-host-closure-source.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log('PASS native host closure source',JSON.stringify(result));
