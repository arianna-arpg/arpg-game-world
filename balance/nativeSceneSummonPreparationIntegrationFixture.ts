/** Reverse only the exact summon preparation integration before older source guards. */
import assert from 'node:assert/strict';
import {beforeNativeSceneDisplacement} from './nativeSceneDisplacementIntegrationFixture';
import {createHash} from 'node:crypto';
import {nativeSceneSummonPreparationIntegrationArchive as archive,nativeSceneSummonPreparationIntegrationArchiveHash} from './nativeSceneSummonPreparationIntegrationArchive';
assert.equal(createHash('sha256').update(JSON.stringify(archive)).digest('hex'),nativeSceneSummonPreparationIntegrationArchiveHash,'immutable summon preparation integration archive');
export function beforeNativeSceneSummonPreparation(source:string):string {
 let text=beforeNativeSceneDisplacement(source);
 for(const row of [...archive.integration].reverse()){assert.equal(text.split(row.after).length,2,'unique exact native summon preparation integration: '+row.name);text=text.replace(row.after,row.before);}
 return text;
}
