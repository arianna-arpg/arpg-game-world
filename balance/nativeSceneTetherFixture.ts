/** Reverse only the exact checked native tether construction integration. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {nativeSceneTetherArchive as archive,nativeSceneTetherArchiveHash} from './nativeSceneTetherArchive';
assert.equal(createHash('sha256').update(JSON.stringify(archive)).digest('hex'),nativeSceneTetherArchiveHash,'immutable tether integration archive');
export function beforeNativeSceneTethers(source:string):string {
 let text=source.replaceAll('\r\n','\n');
 for(const row of [...archive.integration].reverse()){assert.equal(text.split(row.after).length,2,'unique exact native tether integration');text=text.replace(row.after,row.before);}
 return text;
}
