import {beforeNativeContinuity as projectContinuity} from './nativeContinuityCompositionFixture';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {nativeClientContinueArchive as archive} from './nativeClientContinueArchive';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Reverse only the exact current Continue layer; retain every outside source byte. */
export function beforeNativeClientContinueOnly(file:string,input:string):string {
 let source=input.replaceAll('\r\n','\n');const row=archive.files.find(r=>r.file===file);if(!row||hash(source)===row.beforeSha256)return source;
 for(const h of row.hunks){assert.equal(source.split(h.after).length,2,'exact Continue hunk refused: '+file);source=source.replace(h.after,h.before);}return source;
}

export function beforeNativeClientContinue(file:string,input:string):string {return beforeNativeClientContinueOnly(file,projectContinuity('continue',file,input));}
