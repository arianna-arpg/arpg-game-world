import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {nativeCombatLeafVisualArchive as archive,nativeCombatLeafVisualArchiveHash} from './nativeCombatLeafVisualArchive';
assert.equal(createHash('sha256').update(JSON.stringify(archive)).digest('hex'),nativeCombatLeafVisualArchiveHash,'Immutable reviewed native leaf layer');
/** Reverses only exact declared current hunks; leaves unrelated text for historical guards. */
export function beforeNativeCombatLeafVisual(file:string,source:string):string {let text=source.replaceAll('\r\n','\n');const row=archive.files.find(row=>row.file===file);if(!row)return text;for(const edit of [...row.edits].reverse()){assert.equal(text.split(edit.after).length,2,'Unique exact native leaf visual layer '+file);text=text.replace(edit.after,edit.before);}return text;}
