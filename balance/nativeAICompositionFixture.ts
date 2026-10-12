import assert from 'node:assert/strict';
import {nativeAICompositionArchive as archive} from './nativeAICompositionArchive';
/** Reverse only the declared non-AI integration hunks; unknown edits survive. */
export function beforeNativeAIComposition(file:string,source:string):string {
 const row=archive.find(r=>r.file===file);let result=source.replaceAll('\r\n','\n');if(!row)return result;
 for(const h of [...row.changes].reverse()){assert.equal(result.split(h.after).length,2,'Changed or duplicated native AI composition hunk: '+file);result=result.replace(h.after,h.before);}
 return result;
}
