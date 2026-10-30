import {readNativeArrivalMainCast as readNativeMainCastSource} from './nativeArrivalCompositionFixture';
import {beforeNativeClientPublicationComposition as projectClientPublication} from './nativeClientPublicationCompositionFixture';
import {beforeNativeAreaViewQueries as originalBeforeNativeAreaViewQueries} from './nativeAreaViewQueryFixture';
function beforeNativeAreaViewQueries(file:string,source:string):string {return originalBeforeNativeAreaViewQueries(file,projectClientPublication('view',file,source));}
import {beforeNativeAIComposition} from './nativeAICompositionFixture';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {nativeAITargetContinuityArchive as archive} from './nativeAITargetContinuityArchive';
import {beforeNativeAITargetContinuity} from './nativeAITargetContinuityFixture';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');let mutations=0,duplicates=0;
for(const row of archive.files){const source=beforeNativeAIComposition(row.file,beforeNativeAreaViewQueries(row.file,readNativeMainCastSource(new URL('../'+row.file,import.meta.url),'utf8')));assert.equal(source,row.after);assert.equal(beforeNativeAITargetContinuity(row.file,source),row.before);for(const h of row.changes){assert.throws(()=>beforeNativeAITargetContinuity(row.file,source.replace(h.after,h.after+'\n/* mutation */')));mutations++;assert.throws(()=>beforeNativeAITargetContinuity(row.file,source.replace(h.after,h.after+'\n'+h.after)));duplicates++;}}
const result={files:archive.files.length,hunks:archive.files.reduce((n,r)=>n+r.changes.length,0),mutations,duplicates,originalArchiveUntouched:true};const report={result,receipt:hash(JSON.stringify(result))};fs.mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('./reports/native-ai-target-continuity-source.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
