import assert from 'node:assert/strict';
import {nativeAreaViewQueryArchive as archive} from './nativeAreaViewQueryArchive';
/** Reverse only the exact declared view-query changes. Unknown edits remain visible. */
export function beforeNativeAreaViewQueries(file:string,source:string):string {
 let result=source.replaceAll('\r\n','\n');const row=archive.rows.find(r=>r.file===file);if(!row)return result;
 for(const h of [...row.hunks].reverse()){assert.equal(result.split(h.after).length,2,'Changed or duplicated native view-query hunk: '+file);result=result.replace(h.after,h.before);}return result;
}
