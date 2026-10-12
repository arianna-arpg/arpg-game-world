import assert from 'node:assert/strict';
import {nativeAITargetContinuityArchive as archive} from './nativeAITargetContinuityArchive';
/** Reverse only the exact reviewed held-reference attendance successor. */
export function beforeNativeAITargetContinuity(file:string,raw:string):string {
 let source=raw.replaceAll('\r\n','\n');const row=archive.files.find(row=>row.file===file);if(!row)return source;
 for(const h of [...row.changes].reverse()){assert.equal(source.split(h.after).length,2,'AI target continuity changed/duplicated hunk: '+file);source=source.replace(h.after,h.before);}
 assert.equal(source,row.before,'AI target continuity entire predecessor: '+file);return source;
}
