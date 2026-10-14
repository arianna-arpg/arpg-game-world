import {beforeNativeBrowserHosted as projectBrowserHosted} from './nativeBrowserHostedCompositionFixture';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {readNativeShardsCaravan as readFileSync} from './nativeShardsCompositionFixture';
import {createHash} from 'node:crypto';
import {nativeShardEntryLifetimeArchive as archive} from './nativeShardEntryLifetimeArchive';
import {beforeNativeShardEntryLifetime as before} from './nativeShardEntryLifetimeFixture';
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
const source=projectBrowserHosted('entry',archive.file,readFileSync(archive.file,'utf8')).replaceAll('\r\n','\n');assert.equal(hash(source),archive.afterSha256);assert.equal(source,archive.after);assert.equal(before(archive.file,source),archive.before);assert.equal(hash(archive.before),archive.beforeSha256);assert.equal(before(archive.file,archive.before),archive.before);
let mutations=0,duplicates=0;for(const h of archive.hunks){assert.equal(source.split(h.after).length,2);const changed=h.after.replace(/[A-Za-z]/,c=>c==='Z'?'Q':'Z');assert.notEqual(changed,h.after);const mutated=source.replace(h.after,changed);assert.notEqual(mutated,source);assert.throws(()=>before(archive.file,mutated),/hunk refused/);mutations++;assert.throws(()=>before(archive.file,source.replace(h.after,h.after+h.after)),/hunk refused/);duplicates++;}
for(const candidate of [source,source.replaceAll('\n','\r\n'),source.split('\n').map((line,i)=>line+(i%2?'\r':'')).join('\n')])assert.equal(before(archive.file,candidate),archive.before);const outside='\n// unrelated reviewer edit survives\n';assert.equal(before(archive.file,source+outside),archive.before+outside);assert.equal(before('unrelated.ts',source),source);
const report={scope:'Exact main entry-generation successor to frozen55; runtime behavior is proved separately with actual browser transport.',hunks:archive.hunks.length,mutations,duplicates,newlines:3,outside:1,beforeSha256:archive.beforeSha256,afterSha256:archive.afterSha256};mkdirSync('balance/reports',{recursive:true});writeFileSync('balance/reports/native-shard-entry-lifetime-source.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
