/** Reverse only byte-exact restoration changes before older source guards. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {nativeSceneRestorationIntegrationArchive as archive,nativeSceneRestorationIntegrationArchiveHash} from './nativeSceneRestorationIntegrationArchive';
assert.equal(createHash('sha256').update(JSON.stringify(archive)).digest('hex'),nativeSceneRestorationIntegrationArchiveHash,'immutable restoration integration archive');
export function beforeNativeSceneRestoration(source:string):string {
 let text=source.replaceAll('\r\n','\n');
 for(const row of [...archive.integration].reverse()){assert.equal(text.split(row.after).length,2,'unique exact native restoration integration: '+row.name);text=text.replace(row.after,row.before);}
 return text;
}
