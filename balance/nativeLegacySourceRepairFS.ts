import assert from 'node:assert/strict';
import * as fs from './nativeFullGateRepairFS';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {nativeLegacySourceRepairArchive as rows} from './nativeLegacySourceRepairArchive';
export * from './nativeFullGateRepairFS';
const hash=(s:string)=>createHash('sha256').update(s.replace(/\r\n?/g,'\n')).digest('hex');
export function beforeNativeLegacySource(file:string,source:string):string {const row=rows.find(r=>r.file===file);if(!row)return source;assert([row.afterHash,row.beforeHash].includes(hash(source)),'Unknown exact native legacy source '+file);assert.equal(hash(row.before),row.beforeHash);return row.before;}
export const readFileSync=((file:fs.PathOrFileDescriptor,options?:BufferEncoding|{encoding?:BufferEncoding|null;flag?:string}|null):string|Buffer=>{const raw=fs.readFileSync(file,options);if(typeof file==='number')return raw;const target=typeof file==='string'?file:Buffer.isBuffer(file)?file.toString():fileURLToPath(file),key=path.relative(fileURLToPath(new URL('../',import.meta.url)),path.resolve(target)).replaceAll('\\','/');if(!rows.some(r=>r.file===key))return raw;const encoding=typeof options==='string'?options:options?.encoding;assert(encoding==null||encoding==='utf8'||encoding==='utf-8');const result=beforeNativeLegacySource(key,Buffer.isBuffer(raw)?raw.toString('utf8'):raw);return Buffer.isBuffer(raw)?Buffer.from(result):result;}) as typeof fs.readFileSync;
