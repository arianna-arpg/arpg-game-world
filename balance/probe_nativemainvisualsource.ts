import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { nativeMainVisualSourceArchive as archive } from './nativeMainVisualSourceArchive';
import { beforeNativeMainVisualSource } from './nativeMainVisualSourceFixture';
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
let mutations = 0, duplicates = 0, reconstructions = 0;
for (const row of archive.files) {
  const current = fs.readFileSync(row.file, 'utf8').replaceAll('\r\n', '\n');
  assert.equal(hash(current), row.afterHash, row.file + ' selected current source');
  let lineIndex = 0;
  const sources = [current, current.replaceAll('\n', '\r\n'), current.replace(/\n/g, () => lineIndex++ % 2 ? '\r\n' : '\n')];
  for (const source of sources) {
    assert.equal(hash(beforeNativeMainVisualSource(row.file, source)), row.beforeHash, row.file + ' complete historical reconstruction');
    reconstructions++;
  }
  for (const edit of row.edits) {
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
console.log(JSON.stringify({ files: archive.files.length, reconstructions, mutations, duplicates, pin: archive.pin, main: archive.main, scope: 'Exact declared-source reversal; LF/CRLF/mixed whole sources and each LF hunk mutation/duplicate; unrelated changes preserved for original guards.' }));
