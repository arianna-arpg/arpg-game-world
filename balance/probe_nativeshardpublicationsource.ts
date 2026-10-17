import assert from 'node:assert/strict';
import {readNativeShardsWire as readFileSync} from './nativeShardsCompositionFixture';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {nativeShardPublicationArchive as archive} from './nativeShardPublicationArchive';
import {beforeNativeShardPublication as before,shardPublicationLF as lf} from './nativeShardPublicationSource';
import {writeCombatProof} from './probe_nativecombatcycle';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');let hostile=0,portable=0,readers=0;
for(const row of [...archive.rows,...archive.readers]){const current=readFileSync(new URL('../'+row.file,import.meta.url),'utf8');assert.equal(hash(lf(current)),row.afterHash);assert.equal(before(row.file,current),row.before);assert.equal(before(row.file,row.before),row.before);
 for(const raw of [current,lf(current).replaceAll('\n','\r\n'),lf(current).replace(/\n/g,(()=>{let n=0;return()=>++n%2?'\r\n':'\n';})())]){assert.equal(before(row.file,raw),row.before);portable++;}
 for(const accepted of [row.before,row.after]){for(let n=0;n<32;n++){const at=Math.floor((accepted.length-1)*n/31),mutation=accepted.slice(0,at)+'!'+accepted.slice(at);assert.throws(()=>before(row.file,mutation),/Unknown native shard/);hostile++;}assert.throws(()=>before(row.file,accepted+'\n// outside change'),/Unknown native shard/);hostile++;assert.throws(()=>before(row.file,accepted+accepted),/Unknown native shard/);hostile++;}
}
const statements=(s:string)=>{const f=ts.createSourceFile('proof.ts',lf(s),ts.ScriptTarget.Latest,true);return f.statements.filter(n=>!ts.isImportDeclaration(n)).map(n=>n.getText(f));};
for(const row of archive.readers){const current=readFileSync(new URL('../'+row.file,import.meta.url),'utf8');assert.deepEqual(statements(current),statements(row.before),'every original non-import statement and assertion is unchanged');readers++;}
const result={runtimeRows:archive.rows.length,hostileRefusals:hostile,lineEndingVariants:portable,wholeOriginalReaders:readers,parent:archive.parentInput};writeCombatProof('native-shard-publication-source.json',result);console.log(JSON.stringify(result));
