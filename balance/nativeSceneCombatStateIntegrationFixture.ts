/** Reverse only exact combat-state adapter changes before older source guards. */
import assert from 'node:assert/strict';
import {beforeNativeSceneCastingPreparation} from './nativeSceneCastingPreparationIntegrationFixture';
import {createHash} from 'node:crypto';
import {nativeSceneCombatStateIntegrationArchive as archive,nativeSceneCombatStateIntegrationArchiveHash} from './nativeSceneCombatStateIntegrationArchive';
assert.equal(createHash('sha256').update(JSON.stringify(archive)).digest('hex'),nativeSceneCombatStateIntegrationArchiveHash,'immutable combat-state integration archive');
export function beforeNativeSceneCombatState(source:string):string {
 let text=beforeNativeSceneCastingPreparation(source);
 for(const row of [...archive.integration].reverse()){assert.equal(text.split(row.after).length,2,'unique exact native combat-state integration: '+row.name);text=text.replace(row.after,row.before);}
 return text;
}
