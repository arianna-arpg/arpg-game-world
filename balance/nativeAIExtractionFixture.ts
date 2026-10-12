import assert from 'node:assert/strict';
import {nativeSceneAIArchive as archive} from './nativeSceneAIArchive';
/** Strict reconstruction of the reviewed predecessor, including every adapter seam. */
export function beforeNativeAI(file:string,source:string):string {
 const row=archive.shared.find(r=>r.file===file);assert(row,'unknown native AI source');let result=source.replaceAll('\r\n','\n');
 for(const h of [...row.changes].reverse()){assert.equal(result.split(h.after).length,2,`native AI changed or duplicated hunk: ${file}`);result=result.replace(h.after,h.before);}
 assert.equal(result,row.before,`native AI complete predecessor: ${file}`);return result;
}
