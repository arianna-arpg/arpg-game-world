import {beforeNativeSceneQuestInteraction} from './nativeSceneQuestInteractionFixture';
/** Reverse only the exact reviewed native projectile launch integration. */
import assert from 'node:assert/strict';
import {nativeSceneProjectileArchive as archive} from './nativeSceneProjectileArchive';
export function beforeNativeSceneProjectiles(source:string):string {
 let text=beforeNativeSceneQuestInteraction(source);
 for(const row of [...archive.integration].reverse()){assert.equal(text.split(row.after).length,2,'unique exact native projectile integration');text=text.replace(row.after,row.before);}
 return text;
}
