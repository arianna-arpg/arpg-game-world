import assert from 'node:assert/strict';
import {nativeShardsNear96FS as fs} from './nativeShardsCompositionFixture';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {nativeNearScaleSelectionArchive as row,nativeNearScaleSelectionArchiveHash} from './nativeNearScaleSelectionArchive';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
assert.equal(hash(JSON.stringify(row)),nativeNearScaleSelectionArchiveHash,'Immutable near-scale selection repair');
export function beforeNearScaleSelection(file:string,input:string):string {
 if(file!==row.file)return input;const source=input.replace(/\r\n?/g,'\n');
 if(hash(source)===row.beforeHash&&source===row.before)return row.before;
 assert.equal(hash(source),row.afterHash,'Exact near-scale selected-sheet repair');assert.equal(source,row.after);return row.before;
}
function read(file:string|URL,encoding:'utf8'):string {const absolute=file instanceof URL?fileURLToPath(file):path.resolve(file),key=path.relative(fileURLToPath(new URL('../',import.meta.url)),absolute).replaceAll('\\','/');return beforeNearScaleSelection(key,fs.readFileSync(file,encoding));}
export const nativeNearScaleSelectionFS={...fs,readFileSync:read};
