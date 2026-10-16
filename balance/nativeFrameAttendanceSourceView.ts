/** A finite input view for the unchanged attendance probe's archived mutations.
 * The production readers and all original archives remain unchanged. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import type {PathOrFileDescriptor} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {nativeShardsCaravanFS} from './nativeShardsCompositionFixture';
import {beforeNativeFrameAttendance as originalAttendance} from './nativeFrameAttendanceFixture';
import {nativeSceneFrameAttendanceArchive as attendance} from './nativeSceneFrameAttendanceArchive';
import {nativeFramePhysicalSeatsArchive as physical} from './nativeFramePhysicalSeatsArchive';
import {nativeFrameContactSourceArchive as contact} from './nativeFrameContactSourceArchive';

const file='src/engine/nativeSceneEffectsTick.ts';
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const currentHash='ae3198896899a8d03740e9c7be809f12ef228a024bc6d66d9f083d02c84f67f6';
const intermediateHash='1eca945aefe6dfe34235da96e0dfd8dd0a4ee5d50caf7a39aa899085d0565fbb';
const exposedHash='e8547a1c52577aacdae5b2a06a3e39827988034aef634144108883f0502d31fd';
const seats=physical.rows.find(row=>row.file===file);
const target=attendance.files.find(row=>row.file===file);
assert(seats&&target,'Exact attendance input-view records');
assert.equal(contact.file,file);
assert.equal(hash(contact.after),currentHash);
assert.equal(contact.afterSha256,currentHash);
assert.equal(hash(contact.before),intermediateHash);
assert.equal(contact.beforeSha256,intermediateHash);
assert.equal(seats.after,contact.before);
assert.equal(seats.afterSha256,intermediateHash);
assert.equal(hash(seats.before),exposedHash);
assert.equal(seats.beforeSha256,exposedHash);
assert.equal(target.afterSha256,exposedHash);
const current=contact.after,exposed=seats.before;

/** Read-side projection is exact and raw: no line-ending normalization. */
export function nativeFrameAttendanceSource(fileName:string,input:string):string {
 if(fileName!==file)return input;
 assert.equal(hash(input),currentHash,'Exact current attendance input source');
 assert.equal(input,current,'Complete current attendance input source');
 return exposed;
}

/** The probe receives the precise stage whose archived function text it mutates.
 * Refuse every other full source, then exercise the unchanged reader on the
 * corresponding current source. This adapter is only for that explicit view;
 * existing callers of the original reader retain their existing contract. */
export function beforeNativeFrameAttendance(fileName:string,input:string):string {
 if(fileName!==file)return originalAttendance(fileName,input);
 assert.equal(hash(input),exposedHash,'Exact exposed attendance input source');
 assert.equal(input,exposed,'Complete exposed attendance input source');
 return originalAttendance(fileName,current);
}

function sourceKey(input:PathOrFileDescriptor):string|undefined {
 if(typeof input==='number')return undefined;
 const value=typeof input==='string'?input:Buffer.isBuffer(input)?input.toString():fileURLToPath(input);
 return path.relative(fileURLToPath(new URL('../',import.meta.url)),path.resolve(value)).replaceAll('\\','/');
}
const read=((input:PathOrFileDescriptor,options?:BufferEncoding|{encoding?:BufferEncoding|null;flag?:string}|null):string|Buffer=>{
 const raw=nativeShardsCaravanFS.readFileSync(input,options),key=sourceKey(input);
 if(key!==file)return raw;
 const encoding=typeof options==='string'?options:options?.encoding;
 assert(encoding==null||encoding==='utf8'||encoding==='utf-8','Attendance source input view requires UTF-8 or raw bytes');
 const result=nativeFrameAttendanceSource(key,Buffer.isBuffer(raw)?raw.toString('utf8'):raw);
 return Buffer.isBuffer(raw)?Buffer.from(result,'utf8'):result;
}) as typeof nativeShardsCaravanFS.readFileSync;
export const nativeFrameAttendanceSourceFS={...nativeShardsCaravanFS,readFileSync:read};
