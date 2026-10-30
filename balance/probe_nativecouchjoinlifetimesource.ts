import {beforeNativeBrowserHosted as projectBrowserHosted} from './nativeBrowserHostedCompositionFixture';
import assert from 'node:assert/strict';
import {readNativeArrivalMainCast as readFileSync} from './nativeArrivalCompositionFixture';
import {createHash} from 'node:crypto';
import {nativeCouchJoinLifetimeArchive as archive,nativeCouchJoinProofAdapter as adapter} from './nativeCouchJoinLifetimeArchive';
import {beforeNativeCouchJoinLifetime as before} from './nativeCouchJoinLifetimeFixture';
import {writeCombatProof} from './probe_nativecombatcycle';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),source=projectBrowserHosted('couch','src/main.ts',readFileSync(new URL('../src/main.ts',import.meta.url),'utf8')).replaceAll('\r\n','\n');
assert.equal(hash(source),archive.afterHash,'whole current source');assert.equal(hash(before(source)),archive.beforeHash,'whole unchanged browser predecessor');
let portable=0,mutations=0,duplicates=0,line=0;
for(const s of [source,source.replaceAll('\n','\r\n'),source.replace(/\n/g,()=>++line%2?'\r\n':'\n')]){assert.equal(hash(before(s)),archive.beforeHash);portable++;}
for(const h of archive.hunks){const change=source.replace(h.after,h.after.replace(/\S/,'!'));assert.notEqual(change,source);assert.throws(()=>before(change),/exact lifetime hunk refused/);mutations++;const duplicate=source.replace(h.after,h.after+h.after);assert.throws(()=>before(duplicate),/exact lifetime hunk refused/);duplicates++;}
const marker='\n// unknown couch lifetime edit\n';assert.equal(before(source+marker),before(source)+marker);assert.notEqual(hash(before(source+marker)),archive.beforeHash);
const result={hunks:archive.hunks.length,portable,mutations,duplicates,unknownEditPreserved:true,before:archive.beforeHash,after:archive.afterHash};const report={scope:'Exact saved-couch asynchronous lifetime boundary; full predecessor source restored, native mint/graft and earlier browser repairs retained.',result,receipt:hash(JSON.stringify(result))};writeCombatProof('native-couch-join-lifetime-source.json',report);console.log(JSON.stringify(report));

const adapted=projectBrowserHosted('couch',adapter.file,readFileSync(new URL(adapter.file.replace('balance/','./'),import.meta.url),'utf8')).replaceAll('\r\n','\n');assert.equal(hash(adapted),adapter.afterHash);const reverse=(input:string)=>{let s=input;for(const h of [...adapter.hunks].reverse()){if(s.split(h.after).length!==2)throw Error('Exact couch proof reader hunk refused');s=s.replace(h.after,h.before);}return s;};assert.equal(hash(reverse(adapted)),adapter.beforeHash,'all historical source assertions retained');for(const h of adapter.hunks){assert.throws(()=>reverse(adapted.replace(h.after,h.after.replace(/\S/,'!'))),/reader hunk refused/);assert.throws(()=>reverse(adapted.replace(h.after,h.after+h.after)),/reader hunk refused/);}assert.equal(reverse(adapted+marker),reverse(adapted)+marker);console.log(JSON.stringify({historicalReaderHunks:adapter.hunks.length,mutationRefusals:adapter.hunks.length,duplicateRefusals:adapter.hunks.length,originalProofHash:adapter.beforeHash}));
