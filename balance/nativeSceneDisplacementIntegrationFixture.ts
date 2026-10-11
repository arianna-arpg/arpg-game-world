/** Restore only exact displacement changes, then let older guards validate their source. */
import assert from 'node:assert/strict';
import {beforeNativeSceneRestoration} from './nativeSceneRestorationIntegrationFixture';
import {createHash} from 'node:crypto';
import {nativeSceneDisplacementIntegrationArchive as archive,nativeSceneDisplacementIntegrationArchiveHash} from './nativeSceneDisplacementIntegrationArchive';
assert.equal(createHash('sha256').update(JSON.stringify(archive)).digest('hex'),nativeSceneDisplacementIntegrationArchiveHash,'immutable displacement integration archive');
export function beforeNativeSceneDisplacement(source:string):string {
 let text=beforeNativeSceneRestoration(source);
 for(const row of [...archive.integration].reverse()){assert.equal(text.split(row.after).length,2,'unique exact native displacement integration: '+row.name);text=text.replace(row.after,row.before);}
 return text;
}
