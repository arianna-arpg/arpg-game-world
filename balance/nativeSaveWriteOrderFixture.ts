import assert from 'node:assert/strict';
import {nativeSaveWriteOrderArchive as archive} from './nativeSaveWriteOrderArchive';
import {createHash} from 'node:crypto';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export function beforeNativeSaveWriteOrder(file:string,input:string):string {
 let text=input.replaceAll('\r\n','\n');const row=archive.files.find(r=>r.file===file);if(!row||hash(text)===row.beforeSha256)return text;
 for(const hunk of row.hunks){assert.equal(text.split(hunk.after).length,2,'exact save-order hunk refused: '+file);text=text.replace(hunk.after,hunk.before);}return text;
}
