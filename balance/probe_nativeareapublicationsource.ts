import {beforeNativeClientPublicationComposition as projectClientPublication} from './nativeClientPublicationCompositionFixture';
import {beforeNativeAreaViewQueries as originalBeforeNativeAreaViewQueries} from './nativeAreaViewQueryFixture';
function beforeNativeAreaViewQueries(file:string,source:string):string {return originalBeforeNativeAreaViewQueries(file,projectClientPublication('view',file,source));}
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {nativeAreaPublicationArchive as archive} from './nativeAreaPublicationArchive';
const hash=(text:string)=>createHash('sha256').update(text).digest('hex'),normalize=(text:string)=>text.replaceAll('\r\n','\n');
function reverse(text:string):string{let out=normalize(text);for(const h of [...archive.coordinator.hunks].reverse()){assert.equal(out.split(h.after).length,2,'Exact unique publication hunk');out=out.replace(h.after,h.before);}return out;}
const raw=normalize(beforeNativeAreaViewQueries(archive.coordinator.file,readFileSync(new URL('../'+archive.coordinator.file,import.meta.url),'utf8')));assert.equal(hash(raw),archive.coordinator.afterHash);let reversal=0,mutations=0,duplicates=0,line=0;
for(const text of [raw,raw.replaceAll('\n','\r\n'),raw.replace(/\n/g,()=>++line%2?'\r\n':'\n')]){assert.equal(hash(reverse(text)),archive.coordinator.beforeHash);reversal++;}
const check=(text:string)=>assert.equal(hash(reverse(text)),archive.coordinator.beforeHash);
for(const h of archive.coordinator.hunks){const changed=h.after.replace(/[a-z]/,'!');assert.notEqual(changed,h.after);assert.throws(()=>check(raw.replace(h.after,changed)));mutations++;assert.throws(()=>check(raw+'\n'+h.after));duplicates++;}
const marker='\n/* unknown publication change */';assert.equal(reverse(raw+marker),reverse(raw)+marker);assert.throws(()=>check(raw+marker));
const module=normalize(beforeNativeAreaViewQueries(archive.publication.file,readFileSync(new URL('../'+archive.publication.file,import.meta.url),'utf8')));assert.equal(hash(module),archive.publication.sha256);let mappings=0;
for(const binding of archive.publication.mappingLines){assert.equal(module.split(binding).length,2);const mutated=module.replace(binding,binding.replace(/[a-z]/,'!'));assert.notEqual(mutated,module);assert.notEqual(hash(mutated),archive.publication.sha256);assert.notEqual(hash(module+'\n'+binding),archive.publication.sha256);mappings++;}
console.log(JSON.stringify({coordinatorReversals:reversal,coordinatorMutations:mutations,coordinatorDuplicates:duplicates,mappings,unknownOutsideVisible:true}));
