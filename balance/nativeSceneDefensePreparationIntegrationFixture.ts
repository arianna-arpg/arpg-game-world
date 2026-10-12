import {beforeNativeSceneKillAftermath} from './nativeSceneKillAftermathIntegrationFixture';
/** Reverse only exact defense preparation edits before older source guards. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {nativeSceneDefensePreparationIntegrationArchive as archive,nativeSceneDefensePreparationIntegrationArchiveHash} from './nativeSceneDefensePreparationIntegrationArchive';
assert.equal(createHash('sha256').update(JSON.stringify(archive)).digest('hex'),nativeSceneDefensePreparationIntegrationArchiveHash,'immutable defense preparation integration archive');
export function beforeNativeSceneDefensePreparation(source:string):string {
 let text=beforeNativeSceneKillAftermath(source);
 for(const row of [...archive.integration].reverse()){assert.equal(text.split(row.after).length,2,'unique exact native defense preparation integration: '+row.name);text=text.replace(row.after,row.before);}
 return text;
}
