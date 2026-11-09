import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { CLASS_ART, getClassArtwork } from '../site/assets/class-art.js';

test('every game class has its own local, compact WebP painting', () => {
  const source = ts.createSourceFile('classes.ts', readFileSync(new URL('../src/data/classes.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true);
  let roster;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'CLASSES') roster = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(roster && ts.isArrayLiteralExpression(roster), 'find the authoritative class roster');
  const ids = roster.elements.map(entry => {
    const id = entry.properties.find(prop => prop.name?.getText(source) === 'id');
    assert.ok(id && ts.isStringLiteral(id.initializer));
    return id.initializer.text;
  });
  assert.deepEqual(Object.keys(CLASS_ART).sort(), ids.sort());
  const hashes = new Set();
  for (const id of ids) {
    const art = getClassArtwork(id);
    assert.match(art.src, /^assets\/art\/(?:classes\/)?[a-z]+\.webp$/);
    assert.ok(art.alt.length > 20, `${id}: descriptive alternative text`);
    const data = readFileSync(new URL('../site/' + art.src, import.meta.url));
    assert.equal(data.toString('ascii', 0, 4), 'RIFF', id);
    assert.equal(data.toString('ascii', 8, 12), 'WEBP', id);
    assert.ok(data.length < 600_000, `${id}: keep individual downloads small`);
    const hash = createHash('sha256').update(data).digest('hex');
    assert.ok(!hashes.has(hash), `${id}: do not reuse another class painting`);
    hashes.add(hash);
  }
});

test('an unknown future class uses world art, including inherited object names', () => {
  for (const id of ['future-class', 'constructor', '__proto__', undefined]) {
    assert.equal(getClassArtwork(id).src, 'assets/art/frontier.webp');
  }
});
