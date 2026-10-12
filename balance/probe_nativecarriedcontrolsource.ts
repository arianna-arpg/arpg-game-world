import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {nativeCarriedControlArchive as archive} from './nativeCarriedControlArchive';
import {beforeNativeCarriedControl} from './nativeCarriedControlFixture';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const source=fs.readFileSync(new URL('../'+archive.file,import.meta.url),'utf8'),restored=beforeNativeCarriedControl(archive.file,source);
assert.equal(hash(source),archive.afterHash);assert.equal(hash(restored),archive.beforeHash);
assert.equal(beforeNativeCarriedControl(archive.file,source.replaceAll('\n','\r\n')),restored);
let mutations=0,duplicates=0;for(const [,after]of archive.patches){const changed=source.replace(after,after+' /* unknown seam mutation */');assert.notEqual(changed,source);assert.throws(()=>{const reversed=beforeNativeCarriedControl(archive.file,changed);assert.equal(hash(reversed),archive.beforeHash);});mutations++;assert.throws(()=>beforeNativeCarriedControl(archive.file,source+'\n'+after));duplicates++;}
const outside=source+'\n// unknown outside change\n';assert.notEqual(hash(beforeNativeCarriedControl(archive.file,outside)),archive.beforeHash);
const report={files:1,mutations,duplicates,wholeBeforeHash:hash(restored),afterHash:hash(source),unknownOutsideVisible:true};fs.mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('./reports/nativecarriedcontrolsource.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
