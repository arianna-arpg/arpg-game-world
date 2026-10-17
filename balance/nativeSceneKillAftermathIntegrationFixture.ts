/** Reverse only exact kill aftermath edits before older source guards. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {nativeSceneKillAftermathIntegrationArchive as archive,nativeSceneKillAftermathIntegrationArchiveHash} from './nativeSceneKillAftermathIntegrationArchive';
assert.equal(createHash('sha256').update(JSON.stringify(archive)).digest('hex'),nativeSceneKillAftermathIntegrationArchiveHash,'immutable kill aftermath integration archive');
export function beforeNativeSceneKillAftermath(source:string):string {
 let text=source.replaceAll('\r\n','\n');
 for(const row of [...archive.integration].reverse()){assert.equal(text.split(row.after).length,2,'unique exact native kill aftermath integration: '+row.name);text=text.replace(row.after,row.before);}
 return text;
}
