import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readNativeArrivalSummonBoundary} from './nativeArrivalCompositionFixture';
import {nativeCaravanExtractedReadArchive as archive} from './nativeCaravanExtractedReadArchive';
const hash=(source:string)=>createHash('sha256').update(source).digest('hex');
/** Only these four exact, committed source modules have a predecessor here.
 * This read-only projection never replaces an imported runtime module. */
export function beforeNativeCaravanExtractedRead(file:string,input:string):string {
 const row=archive.rows.find(row=>row.file===file);if(!row)return input;
 let source=input.replace(/\r\n?/g,'\n');if(hash(source)===row.prior)return source;
 assert.equal(hash(source),row.current,'Exact current extracted source '+file);
 for(const hunk of row.hunks){assert.equal(source.split(hunk.after).length,2,'Unique extracted observation hunk '+file);source=source.replace(hunk.after,hunk.before);}
 assert.equal(hash(source),row.prior,'Complete original extracted source '+file);return source;
}
export function readNativeCaravanExtracted(file:string|URL,encoding:'utf8'):string {
 const absolute=file instanceof URL?fileURLToPath(file):path.resolve(file),key=path.relative(fileURLToPath(new URL('../',import.meta.url)),absolute).replaceAll('\\','/');
 return beforeNativeCaravanExtractedRead(key,readNativeArrivalSummonBoundary(file,encoding));
}
export const nativeCaravanExtractedFS={...fs,readFileSync:readNativeCaravanExtracted};
