import {beforeNativeSceneTethers} from './nativeSceneTetherFixture';
/** Restore only exact reviewed quest interaction changes before older source guards. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {nativeSceneQuestInteractionArchive as archive,nativeSceneQuestInteractionArchiveHash} from './nativeSceneQuestInteractionArchive';
const sha=(text:string)=>createHash('sha256').update(text).digest('hex');
assert.equal(sha(JSON.stringify(archive)),nativeSceneQuestInteractionArchiveHash,'immutable quest interaction archive');
function restore(source:string,changes:readonly {before:string;after:string}[]):string {
 let text=source.replaceAll('\r\n','\n');
 for(const row of [...changes].reverse()){assert.equal(text.split(row.after).length,2,'unique exact native quest interaction integration');text=text.replace(row.after,row.before);}
 return text;
}
export function beforeNativeSceneQuestInteraction(source:string):string{return restore(beforeNativeSceneTethers(source),archive.integration);}
export function beforeNativeQuestInteractionOdyssey(source:string):string{return restore(source,archive.odysseyIntegration);}
