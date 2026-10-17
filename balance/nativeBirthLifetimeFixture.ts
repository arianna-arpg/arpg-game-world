/** Reverse only the exact declared lifetime additions before older native guards. */
import assert from 'node:assert/strict';
import {nativeBirthLifetimeArchive} from './nativeBirthLifetimeArchive';
export function beforeNativeBirthLifetime(file:string,source:string):string {
 source=source.replaceAll('\r\n','\n');
 const row=nativeBirthLifetimeArchive.files.find(row=>row.file===file);assert.ok(row,'Unknown native birth lifetime source '+file);
 for(const edit of row.edits){assert.equal(source.split(edit.after).length,2,'Exact unique native birth lifetime delta '+file+' '+edit.key);source=source.replace(edit.after,edit.before);}
 return source;
}
