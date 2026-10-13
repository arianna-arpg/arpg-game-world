import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {nativeMainCastSourceArchive as archive} from './nativeMainCastSourceArchive';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const rows=new Map(archive.rows.map(r=>[r.file,r]));
/** Accept only this reviewed visual successor or its exact prior source. */
export function beforeNativeMainCastSource(file:string,input:string):string {
 const row=rows.get(file);if(!row)return input;
 let source=input.replace(/\r\n?/g,'\n');
 if(hash(source)!==row.beforeHash){
  if(hash(source)!==row.afterHash)throw Error('Unknown native main cast source: '+file);
  for(const h of row.hunks){if(source.split(h.after).length!==2)throw Error('Nonunique native main cast hunk: '+file);source=source.replace(h.after,h.before);}
  if(hash(source)!==row.beforeHash)throw Error('Incomplete native main cast reconstruction: '+file);
 }
 let line=0;return source.replace(/\n/g,()=>row.crlfLines.includes(line++)?'\r\n':'\n');
}
export function readNativeMainCastSource(file:string|URL,encoding:'utf8'):string {
 const absolute=file instanceof URL?fileURLToPath(file):path.resolve(file);
 const root=fileURLToPath(new URL('../',import.meta.url));
 const key=path.relative(root,absolute).replaceAll('\\','/');
 return beforeNativeMainCastSource(key,readFileSync(file,encoding));
}
