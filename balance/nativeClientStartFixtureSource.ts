import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {nativeClientStartArchive as archive} from './nativeClientStartArchive';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Only the declared current startup layer reverses; unrelated source survives. */
export function beforeNativeClientStart(file:string,input:string):string {
 let source=input.replaceAll('\r\n','\n');const row=archive.files.find(r=>r.file===file);if(!row||hash(source)===row.beforeSha256)return source;
 for(const h of row.hunks){assert.equal(source.split(h.after).length,2,'exact startup hunk refused: '+file);source=source.replace(h.after,h.before);}return source;
}
