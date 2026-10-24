/** Mutation, byte identity and filesystem controls for the verminfall arrival source boundary. */
import assert from 'node:assert/strict';
import * as fs from './nativeCrusadeArrivalSourceFS';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {nativeVerminfallArrivalSourceArchive as archive} from './nativeVerminfallArrivalSourceArchive';
import {beforeNativeVerminfallArrivalSource as before} from './nativeVerminfallArrivalSourceFixture';
import * as boundary from './nativeVerminfallArrivalSourceFS';
const normal=(s:string)=>s.replace(/\r\n?/g,'\n'),hash=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');
let mutations=0,variants=0,reads=0;
for(const row of archive.rows){
 assert.equal(row.predecessor,archive.parent,'exact selected predecessor commit');
 const url=new URL('../'+row.file,import.meta.url),source=fs.readFileSync(url,'utf8'),prior=before(row.file,source);
 const expected=execFileSync('git',['show',row.predecessor+':'+row.file],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8',maxBuffer:32*1024*1024});
 assert.equal(prior,expected,'complete raw committed predecessor');assert.equal(hash(normal(source)),row.afterHash);assert.equal(hash(normal(prior)),row.beforeHash);
 for(const value of [normal(source),normal(source).replace(/\n/g,'\r\n'),prior,prior.replace(/\n/g,'\r\n')]){assert.equal(before(row.file,value),prior);variants++;}
 for(const value of [source,prior])for(const at of [0,Math.floor(value.length/2),value.length]){assert.throws(()=>before(row.file,value.slice(0,at)+' unexplained '+value.slice(at)),/Unknown exact/);mutations++;}
 for(const hunk of row.hunks)for(const edit of [hunk.after+' unexplained ',hunk.after+hunk.after]){assert.throws(()=>before(row.file,normal(source).replace(hunk.after,()=>edit)),/Unknown exact/);mutations++;}
 assert.throws(()=>before(row.file,source+source),/Unknown exact/);assert.equal(before('outside/'+row.file,source),source);
 for(const file of [url,fileURLToPath(url),Buffer.from(fileURLToPath(url))])for(const encoding of ['utf8','utf-8',{encoding:'utf8'},null] as const){const expected=encoding?prior:Buffer.from(prior);assert.deepEqual(boundary.readFileSync(file,encoding),expected);reads++;const fd=boundary.openSync(file,'r');try{assert.deepEqual(boundary.readFileSync(fd,encoding),expected);assert.throws(()=>boundary.readFileSync(fd,'utf8'),/Unknown exact/);reads++;}finally{boundary.closeSync(fd);}}
 const native=fs.openSync(url,'r');try{assert.equal(boundary.readFileSync(native,'utf8'),source);}finally{fs.closeSync(native);}
 const partial=boundary.openSync(url,'r');try{fs.readSync(partial,Buffer.alloc(1),0,1,null);assert.throws(()=>boundary.readFileSync(partial,'utf8'),/Unknown exact/);assert.equal(fs.readSync(partial,Buffer.alloc(1),0,1,null),0);}finally{boundary.closeSync(partial);}
}
for(const row of archive.archives)assert.equal(hash(normal(fs.readFileSync(new URL('../'+row.file,import.meta.url),'utf8'))),row.normalSha256,'original archive unchanged: '+row.file);
for(const row of archive.current)assert.equal(hash(normal(fs.readFileSync(new URL('../'+row.file,import.meta.url),'utf8'))),row.normalSha256,'exact verminfall arrival implementation: '+row.file);
for(const key of Object.keys(fs))if(!['default','readFileSync','openSync','closeSync'].includes(key))assert.equal(Reflect.get(boundary,key),Reflect.get(fs,key));
console.log('PASS native verminfall arrival source',JSON.stringify({rows:archive.rows.length,mutations,variants,reads,originalArchives:archive.archives.length,currentFiles:archive.current.length}));
