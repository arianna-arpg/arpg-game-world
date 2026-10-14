import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {nativeMainRosterCancellationArchive as archive} from './nativeMainRosterCancellationArchive';
const hash=(text:string)=>createHash('sha256').update(text).digest('hex'),normal=(text:string)=>text.replace(/\r\n?/g,'\n');
const rows=new Map(archive.rows.map(row=>[row.file,row]));
// Only descriptors opened through this finite historical source view are
// projected. Untracked descriptors remain native. Close view-owned descriptors
// through this view: external close/reopen of the same file identity cannot be
// distinguished by native fd APIs. Reuse for a different file is detected.
// Reads consume the native descriptor position; partial/repeated source reads
// fail the whole-source guard. No seek, reread or replacement descriptor occurs.
const descriptors=new Map<number,{key:string;dev:bigint;ino:bigint}>();
export const openNativeMainRosterCancellation=((...args:Parameters<typeof fs.openSync>):number=>{
 const fd=fs.openSync(...args);descriptors.delete(fd);const key=sourceKey(args[0]);if(key&&rows.has(key)){const {dev,ino}=fs.fstatSync(fd,{bigint:true});descriptors.set(fd,{key,dev,ino});}return fd;
}) as typeof fs.openSync;
export const closeNativeMainRosterCancellation=((fd:number):void=>{
 try{fs.closeSync(fd);}finally{descriptors.delete(fd);}
}) as typeof fs.closeSync;
/** Exact accepted214 source view before all its unchanged historical checks. */
export function beforeNativeMainRosterCancellation(file:string,input:string):string {
 const row=rows.get(file);if(!row)return input;
 let source=normal(input);if(hash(source)!==row.beforeHash){
  assert.equal(hash(source),row.afterHash,'Unknown exact native main roster cancellation source: '+file);
  for(const hunk of row.hunks){assert.equal(source.split(hunk.after).length,2,'Unique native main roster cancellation hunk');source=source.replace(hunk.after,hunk.before);}
  assert.equal(hash(source),row.beforeHash,'Complete accepted214 predecessor: '+file);
 }
 let line=0;return source.replace(/\n/g,()=>row.crlfLines.includes(line++)?'\r\n':'\n');
}
function sourceKey(file:fs.PathOrFileDescriptor):string|undefined {
 if(typeof file==='number'){const row=descriptors.get(file);if(!row)return undefined;const {dev,ino}=fs.fstatSync(file,{bigint:true});if(dev!==row.dev||ino!==row.ino){descriptors.delete(file);return undefined;}return row.key;}
 const value=typeof file==='string'?file:Buffer.isBuffer(file)?file.toString():fileURLToPath(file);
 return path.relative(fileURLToPath(new URL('../',import.meta.url)),path.resolve(value)).replaceAll('\\','/');
}
export const readNativeMainRosterCancellation=((file:fs.PathOrFileDescriptor,options?:BufferEncoding|{encoding?:BufferEncoding|null;flag?:string}|null):string|Buffer=>{
 const raw=fs.readFileSync(file,options),key=sourceKey(file);if(key===undefined||!rows.has(key))return raw;
 const encoding=typeof options==='string'?options:options?.encoding;assert(encoding==null||encoding==='utf8'||encoding==='utf-8','main roster cancellation source requires UTF-8 or raw bytes');
 const before=beforeNativeMainRosterCancellation(key,Buffer.isBuffer(raw)?raw.toString('utf8'):raw);return Buffer.isBuffer(raw)?Buffer.from(before,'utf8'):before;
}) as typeof fs.readFileSync;
