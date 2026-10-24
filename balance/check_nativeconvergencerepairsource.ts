import assert from 'node:assert/strict';
import * as fs from './nativeFullGateRepairFS';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import * as boundary from './nativeConvergenceRepairFS';
import {nativeConvergenceRepairArchive as archive} from './nativeConvergenceRepairArchive';
import {beforeNativeConvergenceRepair as before} from './nativeConvergenceRepairFixture';
const hash=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex'),normal=(s:string)=>s.replace(/\r\n?/g,'\n');
const read=(file:string)=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
let mutations=0,variants=0,reads=0,assertions=0;
for(const row of archive.rows){
 const source=read(row.file),parent=before(row.file,source),expected=execFileSync('git',['show',row.predecessor+':'+row.file],{encoding:'utf8',maxBuffer:32*1024*1024});
 assert.equal(normal(parent),normal(expected),'Whole committed predecessor; recorded raw line endings checked separately');assert.equal(hash(normal(source)),row.afterHash);assert.equal(hash(parent),row.rawBeforeHash);assert.equal(before(row.file,parent),parent);
 for(const value of [normal(source),normal(source).replace(/\n/g,'\r\n'),normal(parent),normal(parent).replace(/\n/g,'\r\n')]){assert.equal(before(row.file,value),parent);variants++;}
 for(const value of [source,parent])for(const at of [0,Math.floor(value.length/2),value.length]){assert.throws(()=>before(row.file,value.slice(0,at)+' unexplained '+value.slice(at)),/Unknown exact/);mutations++;}
 for(const hunk of row.hunks){assert.equal(normal(source).split(hunk.after).length,2);for(const edit of [hunk.after+' unexplained ',hunk.after+hunk.after]){assert.throws(()=>before(row.file,normal(source).replace(hunk.after,()=>edit)),/Unknown exact/);mutations++;}}
 assert.throws(()=>before(row.file,source+source),/Unknown exact/);assert.equal(before('outside/'+row.file,source),source);
 const url=new URL('../'+row.file,import.meta.url),path=fileURLToPath(url);
 for(const file of [url,path,Buffer.from(path)])for(const encoding of ['utf8','utf-8',{encoding:'utf8'},null] as const){
  const expected=encoding?parent:Buffer.from(parent);assert.deepEqual(boundary.readFileSync(file,encoding),expected);reads++;
  const fd=boundary.openSync(file,'r');try{assert.deepEqual(boundary.readFileSync(fd,encoding),expected);assert.throws(()=>boundary.readFileSync(fd,'utf8'),/Unknown exact/);reads++;}finally{boundary.closeSync(fd);}
 }
 const fd=fs.openSync(url,'r');try{assert.equal(boundary.readFileSync(fd,'utf8'),source,'Untracked descriptors stay native');}finally{fs.closeSync(fd);}
 const partial=boundary.openSync(url,'r');try{fs.readSync(partial,Buffer.alloc(1),0,1,null);assert.throws(()=>boundary.readFileSync(partial,'utf8'),/Unknown exact/);assert.equal(fs.readSync(partial,Buffer.alloc(1),0,1,null),0);}finally{boundary.closeSync(partial);}
}
for(const row of archive.readers){const source=read(row.file),tree=ts.createSourceFile(row.file,source,99,true),calls:string[]=[];function visit(n:ts.Node):void{if(ts.isCallExpression(n)&&/^(assert(?:\.|$)|must$|check$)/.test(n.expression.getText(tree)))calls.push(n.getText(tree));ts.forEachChild(n,visit);}visit(tree);assert.equal(calls.length,row.assertions);assert.equal(hash(JSON.stringify(calls)),row.assertionHash);assert.equal(hash(JSON.stringify(tree.statements.filter(n=>!ts.isImportDeclaration(n)).map(n=>n.getText(tree)))),row.nonImportHash);assertions+=calls.length;}
for(const row of archive.archives)assert.equal(hash(normal(read(row.file))),row.normalSha256,'Unchanged original archive: '+row.file);
for(const row of archive.runtime)assert.equal(hash(normal(read(row.file))),row.normalSha256,'Actual repair implementation: '+row.file);
for(const key of Object.keys(fs))if(!['default','readFileSync','openSync','closeSync'].includes(key))assert.equal(Reflect.get(boundary,key),Reflect.get(fs,key),'Unrelated native filesystem export '+key);
const roster=execFileSync('git',['show',archive.parent+':balance/proberoster.ts'],{encoding:'utf8'});assert.equal(normal(read('balance/proberoster.ts')),normal(roster),'Historical roster unchanged');
console.log('PASS native convergence repair source',JSON.stringify({rows:archive.rows.length,mutations,variants,reads,originalAssertions:assertions,unchangedArchives:archive.archives.length}));
