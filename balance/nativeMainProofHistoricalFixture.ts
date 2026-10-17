/** Exact historical pure reversals used only by the original summon source reader. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {nativeSceneDisplacementIntegrationArchive,nativeSceneDisplacementIntegrationArchiveHash} from './nativeSceneDisplacementIntegrationArchive';
import {nativeSceneSummonPreparationIntegrationArchive,nativeSceneSummonPreparationIntegrationArchiveHash} from './nativeSceneSummonPreparationIntegrationArchive';
import {nativeSceneTetherArchive,nativeSceneTetherArchiveHash} from './nativeSceneTetherArchive';
export const beforeNativeSceneDisplacement = (() => {
 const archive=nativeSceneDisplacementIntegrationArchive;
 assert.equal(createHash('sha256').update(JSON.stringify(archive)).digest('hex'),nativeSceneDisplacementIntegrationArchiveHash,'Exact historical archive for beforeNativeSceneDisplacement');
 function beforeNativeSceneDisplacement(source:string):string {
 let text=source.replaceAll('\r\n','\n');
 for(const row of [...archive.integration].reverse()){assert.equal(text.split(row.after).length,2,'unique exact native displacement integration: '+row.name);text=text.replace(row.after,row.before);}
 return text;
}
 return beforeNativeSceneDisplacement;
})();
export const beforeNativeSceneSummonPreparation = (() => {
 const archive=nativeSceneSummonPreparationIntegrationArchive;
 assert.equal(createHash('sha256').update(JSON.stringify(archive)).digest('hex'),nativeSceneSummonPreparationIntegrationArchiveHash,'Exact historical archive for beforeNativeSceneSummonPreparation');
 function beforeNativeSceneSummonPreparation(source:string):string {
 let text=beforeNativeSceneDisplacement(source);
 for(const row of [...archive.integration].reverse()){assert.equal(text.split(row.after).length,2,'unique exact native summon preparation integration: '+row.name);text=text.replace(row.after,row.before);}
 return text;
}
 return beforeNativeSceneSummonPreparation;
})();
export const beforeNativeSceneTethers = (() => {
 const archive=nativeSceneTetherArchive;
 assert.equal(createHash('sha256').update(JSON.stringify(archive)).digest('hex'),nativeSceneTetherArchiveHash,'Exact historical archive for beforeNativeSceneTethers');
 function beforeNativeSceneTethers(source:string):string {
 let text=beforeNativeSceneSummonPreparation(source);
 for(const row of [...archive.integration].reverse()){assert.equal(text.split(row.after).length,2,'unique exact native tether integration');text=text.replace(row.after,row.before);}
 return text;
}
 return beforeNativeSceneTethers;
})();
