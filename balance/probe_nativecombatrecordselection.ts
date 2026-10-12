import fs from 'node:fs';
import assert from 'node:assert/strict';
import {nativeSceneCombatRecordSelectionArchive as a} from './nativeSceneCombatRecordSelectionArchive';
import {beforeNativeCombatRecordSelection as reverse} from './nativeCombatRecordSelectionFixture';
const current=fs.readFileSync(a.file,'utf8');assert.equal(current,a.afterSource);assert.equal(reverse(current),a.beforeSource);
for(const e of a.edits){assert.throws(()=>reverse(current.replace(e.after,'/*mutation*/'+e.after)));assert.throws(()=>reverse(current.replace(e.after,e.after+e.after)));}
console.log(JSON.stringify({status:'pass',seams:a.edits.length,mutationRefusals:a.edits.length,duplicateRefusals:a.edits.length,scope:'Exact selected-row source successor; actual record entry refusal and native retained behavior remain aggregate acceptance.'},null,2));
