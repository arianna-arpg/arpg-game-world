import {nativeAdmissionCompositionArchive as composition} from './nativeAdmissionCompositionArchive';
import {beforeNativeAdmissionComposition as projectComposition} from './nativeAdmissionCompositionFixture';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {nativeCarriedAdmissionFinalArchive as archive} from './nativeCarriedAdmissionFinalArchive';
import {beforeNativeCarriedAdmissionFinal as before} from './nativeCarriedAdmissionFinalFixture';
import {writeCombatProof} from './probe_nativecombatcycle';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');let reversals=0,mutations=0,duplicates=0,outside=0;
for(const row of archive){let line=0;const raw=projectComposition(row.file,readFileSync(new URL('../'+row.file,import.meta.url),'utf8'),true),source=raw.replace(/\r\n?/g,'\n');assert.equal(hash(raw),row.afterHash);for(const text of [source,source.replace(/\n/g,'\r\n'),source.replace(/\n/g,()=>++line%2?'\r\n':'\n')]){assert.equal(hash(before(row.file,text)),row.beforeNormalizedHash);reversals++;}for(const h of row.hunks){const at=Math.floor(h.after.length/2),changed=h.after.slice(0,at)+(h.after[at]==='X'?'Y':'X')+h.after.slice(at+1);assert.notEqual(changed,h.after);assert.throws(()=>before(row.file,source.replace(h.after,changed)));mutations++;assert.throws(()=>before(row.file,source+'\n'+h.after));duplicates++;}const mark='\n// unrelated source delta remains visible\n';assert.equal(before(row.file,source+mark),before(row.file,source)+mark);outside++;}
assert.equal(hash(readFileSync(new URL('./nativeAdmissionCompositionArchive.ts',import.meta.url),'utf8')),'4aa3ecff37b3f7d888299701b65647c0ca2eb4b4a4f46d0999c7c898b57d3b1d','immutable admission composition');
let compositionMutations=0,compositionDuplicates=0;
for(const row of composition){
 const raw=readFileSync(new URL('../'+row.file,import.meta.url),'utf8').replaceAll('\r\n','\n');assert.equal(hash(raw),row.afterHash);const projected=projectComposition(row.file,raw);assert.equal(hash(projected),row.beforeHash);assert.equal(projectComposition(row.file,raw.replaceAll('\n','\r\n')),projected);
 const check=(s:string)=>{const result=projectComposition(row.file,s);assert.equal(hash(result),row.beforeHash);before(row.file,result);};check(raw);
 for(const h of row.changes){const at=Math.floor(h.after.length/2),mutated=h.after.slice(0,at)+(h.after[at]==='X'?'Y':'X')+h.after.slice(at+1);assert.notEqual(mutated,h.after);assert.throws(()=>check(raw.replace(h.after,mutated)));compositionMutations++;assert.throws(()=>check(raw+'\n'+h.after));compositionDuplicates++;}
 const mark='\n/* unknown admission composition change */';assert.equal(projectComposition(row.file,raw+mark),projected+mark);assert.throws(()=>check(raw+mark));
}
let portableOriginalChecks=0;
for(const row of archive){const raw=readFileSync(new URL('../'+row.file,import.meta.url),'utf8').replaceAll('\r\n','\n');let line=0;for(const source of [raw,raw.replaceAll('\n','\r\n'),raw.replaceAll('\n',()=>++line%2?'\r\n':'\n')]){assert.equal(hash(projectComposition(row.file,source,true)),row.afterHash,'portable exact original source');portableOriginalChecks++;}}
const report={portableOriginalChecks,compositionMutations,compositionDuplicates,files:archive.length,reversals,mutations,duplicates,outside};writeCombatProof('native-carried-admission-final-source.json',report);console.log(JSON.stringify(report));
