import assert from 'node:assert/strict';
import {nativeShardsCaravanFS as fs} from './nativeShardsCompositionFixture';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {nativeCaravanCompositionArchive as archive} from './nativeCaravanCompositionArchive';
import {beforeNativeCaravanNews} from './nativeCaravanNewsFixture';
const hash=(source:string)=>createHash('sha256').update(source).digest('hex'),rows=new Map(archive.rows.map(row=>[row.file,row]));
/** Finite exact predecessor selection before the existing historical readers. */
export function beforeNativeCaravanPrior(file:string,input:string):string {
 const row=rows.get(file);if(!row)return input;
 let source=input.replace(/\r\n?/g,'\n');
 if(row.kind==='runtime')source=beforeNativeCaravanNews(file,source);
 else if(hash(source)!==row.beforeHash){
  assert.equal(hash(source),row.afterHash,'Exact caravan composition source '+file);
  for(const edit of row.edits){assert.equal(source.split(edit.after).length,2,'Unique caravan composition edit '+file);source=source.replace(edit.after,edit.before);}
 }
 assert.equal(hash(source),row.beforeHash,'Complete caravan composition predecessor '+file);
 let line=0;return source.replace(/\n/g,()=>row.crlfLines.includes(line++)?'\r\n':'\n');
}
function keyFor(file:string|URL):string {const absolute=file instanceof URL?fileURLToPath(file):path.resolve(file);return path.relative(fileURLToPath(new URL('../',import.meta.url)),absolute).replaceAll('\\','/');}
export function readNativeCaravanPrior(file:string|URL,encoding:'utf8'|'utf-8'):string;
export function readNativeCaravanPrior(file:string|URL):Buffer;
export function readNativeCaravanPrior(file:string|URL,encoding?:'utf8'|'utf-8'):string|Buffer {
 const raw=fs.readFileSync(file),key=keyFor(file);if(!rows.has(key))return encoding!==undefined?raw.toString('utf8'):raw;
 const restored=beforeNativeCaravanPrior(key,raw.toString('utf8'));return encoding!==undefined?restored:Buffer.from(restored,'utf8');
}
export const nativeCaravanPriorFS={...fs,readFileSync:readNativeCaravanPrior};
