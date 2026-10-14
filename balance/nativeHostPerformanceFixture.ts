import assert from 'node:assert/strict';
import * as fs from './nativeShardFoundationFS';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {nativeHostPerformanceArchive as archive} from './nativeHostPerformanceArchive';
const hash=(text:string)=>createHash('sha256').update(text).digest('hex'),normal=(text:string)=>text.replace(/\r\n?/g,'\n');
const rows=new Map(archive.rows.map(row=>[row.file,row]));
/** Exact accepted120 source view before all its unchanged historical checks. */
export function beforeNativeHostPerformance(file:string,input:string):string {
 const row=rows.get(file);if(!row)return input;
 let source=normal(input);if(hash(source)!==row.beforeHash){
  assert.equal(hash(source),row.afterHash,'Unknown exact native host performance source: '+file);
  for(const hunk of row.hunks){assert.equal(source.split(hunk.after).length,2,'Unique native host performance hunk');source=source.replace(hunk.after,hunk.before);}
  assert.equal(hash(source),row.beforeHash,'Complete accepted120 predecessor: '+file);
 }
 let line=0;return source.replace(/\n/g,()=>row.crlfLines.includes(line++)?'\r\n':'\n');
}
function sourceKey(file:fs.PathOrFileDescriptor):string|undefined {
 if(typeof file==='number')return undefined;
 const value=typeof file==='string'?file:Buffer.isBuffer(file)?file.toString():fileURLToPath(file);
 return path.relative(fileURLToPath(new URL('../',import.meta.url)),path.resolve(value)).replaceAll('\\','/');
}
export const readNativeHostPerformance=((file:fs.PathOrFileDescriptor,options?:BufferEncoding|{encoding?:BufferEncoding|null;flag?:string}|null):string|Buffer=>{
 const raw=fs.readFileSync(file,options),key=sourceKey(file);if(key===undefined||!rows.has(key))return raw;
 const encoding=typeof options==='string'?options:options?.encoding;assert(encoding==null||encoding==='utf8'||encoding==='utf-8','Host performance source requires UTF-8 or raw bytes');
 const before=beforeNativeHostPerformance(key,Buffer.isBuffer(raw)?raw.toString('utf8'):raw);return Buffer.isBuffer(raw)?Buffer.from(before,'utf8'):before;
}) as typeof fs.readFileSync;
