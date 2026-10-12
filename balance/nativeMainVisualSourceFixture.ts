import {beforeNativeSceneGroundFollowUps} from './nativeSceneGroundFollowUpsIntegrationFixture';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {nativeMainVisualSourceArchive as archive,nativeMainVisualSourceArchiveHash} from './nativeMainVisualSourceArchive';
assert.equal(createHash('sha256').update(JSON.stringify(archive)).digest('hex'),nativeMainVisualSourceArchiveHash,'immutable main visual source archive');
/** Reverse only the uniquely matching declared main visual changes. */
export function beforeNativeMainVisualSourceOnly(file:string,source:string):string {
 let text=source.replaceAll('\r\n','\n');const row=archive.files.find(r=>r.file===file);assert.ok(row,'Known main visual source '+file);
 for(const edit of row.edits){assert.equal(text.split(edit.after).length,2,'unique exact native main visual source '+file);text=text.replace(edit.after,edit.before);}
 return text;
}

/** Compose the exact current layer before unchanged visual source guards. */
export function beforeNativeMainVisualSource(file:string,source:string):string {
 return beforeNativeMainVisualSourceOnly(file,file==='src/engine/world.ts'?beforeNativeSceneGroundFollowUps(source):source);
}
