import assert from 'node:assert/strict';
import * as fs from './nativeHostClosureFS';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {nativeMainHostCompositionArchive as archive,type NativeMainHostSourceRow,type NativeMainHostSourceLane} from './nativeMainHostCompositionArchive';
export type {NativeMainHostSourceLane} from './nativeMainHostCompositionArchive';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),normal=(s:string)=>s.replace(/\r\n?/g,'\n');
type Row=NativeMainHostSourceRow;
const lanes=new Map<string,Map<string,Row>>(Object.entries(archive.lanes).map(([lane,rows])=>[lane,new Map(rows.map(row=>[row.file,row]))]));
/** Exact raw predecessor selection before the unchanged package source readers. */
export function beforeNativeMainHostComposition(lane:NativeMainHostSourceLane,file:string,input:string):string {
 const rows=lanes.get(lane);assert(rows,'Unknown native main/host source lane');const row=rows.get(file);if(!row)return input;
 let source=normal(input);if(hash(source)!==row.beforeHash){
  assert.equal(hash(source),row.afterHash,'Native main/host source differs from its exact reviewed predecessor or combined source: '+lane+'/'+file);
  for(const h of row.hunks){assert.equal(source.split(h.after).length,2,'Unique native main/host source hunk: '+lane+'/'+file);source=source.replace(h.after,h.before);}
  assert.equal(hash(source),row.beforeHash,'Complete native main/host source predecessor: '+lane+'/'+file);
 }
 let line=0;return source.replace(/\n/g,()=>row.crlfLines.includes(line++)?'\r\n':'\n');
}
function sourceKey(file:fs.PathOrFileDescriptor):string|undefined {
 if(typeof file==='number')return undefined;
 const value=typeof file==='string'?file:Buffer.isBuffer(file)?file.toString():fileURLToPath(file);
 return path.relative(fileURLToPath(new URL('../',import.meta.url)),path.resolve(value)).replaceAll('\\','/');
}
function reader(lane:NativeMainHostSourceLane):typeof fs.readFileSync {
 const read=(file:fs.PathOrFileDescriptor,options?:BufferEncoding|{encoding?:BufferEncoding|null;flag?:string}|null):string|Buffer=>{
  const raw=fs.readFileSync(file,options),key=sourceKey(file);
  if(key===undefined||!lanes.get(lane)!.has(key))return raw;
  const encoding=typeof options==='string'?options:options?.encoding;
  assert(encoding==null||encoding==='utf8'||encoding==='utf-8','Native main/host source projection requires UTF-8 or raw bytes');
  const before=beforeNativeMainHostComposition(lane,key,Buffer.isBuffer(raw)?raw.toString('utf8'):raw);
  return Buffer.isBuffer(raw)?Buffer.from(before,'utf8'):before;
 };
 return read as typeof fs.readFileSync;
}
export const readNativeMainHostHost94=reader('host94');
export const readNativeMainHostMain99=reader('main99');
