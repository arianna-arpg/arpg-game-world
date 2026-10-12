import assert from 'node:assert/strict';
import {nativeAdmissionCompositionArchive as archive,nativeAdmissionOriginalEndings} from './nativeAdmissionCompositionArchive';
/** Reconstruct exact declared source hunks, leaving all other source visible.
 * Optional original newline positions keep the frozen byte-hash checks portable. */
export function beforeNativeAdmissionComposition(file:string,source:string,originalEndings=false):string {
 let result=source.replaceAll('\r\n','\n');const row=archive.find(r=>r.file===file);
 if(row)for(const h of [...row.changes].reverse()){assert.equal(result.split(h.after).length,2,'Changed or duplicated final-admission composition hunk: '+file);result=result.replace(h.after,h.before);}
 if(originalEndings){const endings=nativeAdmissionOriginalEndings.find(r=>r.file===file);assert.ok(endings,'declared original newline positions');const lines=result.split('\n');for(const index of endings.lines){assert.ok(index<lines.length-1,'original newline position');lines[index]+='\r';}result=lines.join('\n');}return result;
}
