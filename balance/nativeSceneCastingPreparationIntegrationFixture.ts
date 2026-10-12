/** Reverse only exact casting preparation changes before older source guards. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {nativeSceneCastingPreparationIntegrationArchive as archive,nativeSceneCastingPreparationIntegrationArchiveHash} from './nativeSceneCastingPreparationIntegrationArchive';
assert.equal(createHash('sha256').update(JSON.stringify(archive)).digest('hex'),nativeSceneCastingPreparationIntegrationArchiveHash,'immutable casting preparation integration archive');
export function beforeNativeSceneCastingPreparation(source:string):string {
 let text=source.replaceAll('\r\n','\n');
 for(const row of [...archive.integration].reverse()){assert.equal(text.split(row.after).length,2,'unique exact native casting preparation integration: '+row.name);text=text.replace(row.after,row.before);}
 return text;
}
