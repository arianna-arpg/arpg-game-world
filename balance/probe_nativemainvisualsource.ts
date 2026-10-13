import {beforeNativeMainProofSource} from './nativeMainProofSourceFixture';
import {nativeCombatLeafVisualArchive as leafArchive} from './nativeCombatLeafVisualArchive';
import {beforeNativeCombatLeafVisual} from './nativeCombatLeafVisualFixture';
import {execFileSync} from 'node:child_process';
import {beforeNativeSceneGroundFollowUps} from './nativeSceneGroundFollowUpsIntegrationFixture';
import assert from 'node:assert/strict';
import {nativeArrivalMainproofFS as fs} from './nativeArrivalCompositionFixture';
import { createHash } from 'node:crypto';
import { nativeMainVisualSourceArchive as archive } from './nativeMainVisualSourceArchive';
import { beforeNativeMainVisualSourceOnly as beforeNativeMainVisualSource } from './nativeMainVisualSourceFixture';
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
let mutations = 0, duplicates = 0, reconstructions = 0;
let currentMutations=0,currentDuplicates=0;for(const row of leafArchive.files){const raw=beforeNativeMainProofSource('visual-source',row.file,fs.readFileSync(row.file,'utf8')).replaceAll('\r\n','\n');assert.equal(hash(raw),row.afterHash,'Reviewed current leaf source');assert.equal(hash(execFileSync('git',['show',leafArchive.pin+':'+row.file],{encoding:'utf8',maxBuffer:20*1024*1024}).replaceAll('\r\n','\n')),row.beforeHash,'Immutable prior visual source');assert.equal(hash(beforeNativeCombatLeafVisual(row.file,raw)),row.beforeHash);let line=0;for(const formatted of [raw.replaceAll('\n','\r\n'),raw.replace(/\n/g,()=>line++%2?'\r\n':'\n')])assert.equal(hash(beforeNativeCombatLeafVisual(row.file,formatted)),row.beforeHash);for(const edit of row.edits){assert.equal(raw.split(edit.after).length,2,'Actual current hunk is unique');const mid=Math.floor(edit.after.length/2),changed=raw.replace(edit.after,edit.after.slice(0,mid)+'/* current mutation */'+edit.after.slice(mid));assert.notEqual(changed,raw);assert.throws(()=>beforeNativeCombatLeafVisual(row.file,changed),/Unique exact native leaf visual layer/);currentMutations++;assert.throws(()=>beforeNativeCombatLeafVisual(row.file,raw+'\n'+edit.after),/Unique exact native leaf visual layer/);currentDuplicates++;}const outside='\n/* unknown later outside change */\n',restored=beforeNativeCombatLeafVisual(row.file,raw+outside);assert(restored.endsWith(outside));assert.notEqual(hash(restored),row.beforeHash);}
for (const row of archive.files) {
  const raw = beforeNativeMainProofSource('visual-source',row.file,fs.readFileSync(row.file, 'utf8'));
  const current = beforeNativeCombatLeafVisual(row.file,row.file==='src/engine/world.ts'?beforeNativeSceneGroundFollowUps(raw):raw).replaceAll('\r\n', '\n');
  assert.equal(hash(current), row.afterHash, row.file + ' selected current source');
  let lineIndex = 0;
  const sources = [current, current.replaceAll('\n', '\r\n'), current.replace(/\n/g, () => lineIndex++ % 2 ? '\r\n' : '\n')];
  for (const source of sources) {
    assert.equal(hash(beforeNativeMainVisualSource(row.file, source)), row.beforeHash, row.file + ' complete historical reconstruction');
    reconstructions++;
  }
  for (const edit of row.edits) {
    assert.equal(current.split(edit.after).length,2,'Each original visual mutation targets its exact source hunk');
    const midpoint = Math.floor(edit.after.length / 2);
    const changed = edit.after.slice(0, midpoint) + '/* undeclared main visual edit */' + edit.after.slice(midpoint);
    assert.throws(() => beforeNativeMainVisualSource(row.file, current.replace(edit.after, changed)), /unique exact native main visual source/);
    mutations++;
    assert.throws(() => beforeNativeMainVisualSource(row.file, current + '\n' + edit.after), /unique exact native main visual source/);
    duplicates++;
  }
  // Reversing known changes must not erase an unrelated edit before older guards.
  const outside = '\n/* separate historical guard must see this edit */\n';
  const reversed = beforeNativeMainVisualSource(row.file, current + outside);
  assert(reversed.endsWith(outside));
  assert.notEqual(hash(reversed), row.beforeHash);
}
assert.throws(() => beforeNativeMainVisualSource('unregistered.ts', ''), /Known main visual source/);
console.log(JSON.stringify({ currentFiles:leafArchive.files.length,currentMutations,currentDuplicates,files: archive.files.length, reconstructions, mutations, duplicates, pin: archive.pin, main: archive.main, scope: 'Exact declared-source reversal; LF/CRLF/mixed whole sources and each LF hunk mutation/duplicate; unrelated changes preserved for original guards.' }));
