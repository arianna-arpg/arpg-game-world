import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validatePreviews } from './build-browser-previews.mjs';
const row = { id: 'test', ref: 'codex/test', storageScope: 'preview:test', worldmass: true };
test('committed preview configuration has isolated, unique destinations', () => {
  assert.ok(validatePreviews(JSON.parse(readFileSync(new URL('./browser-previews.json', import.meta.url), 'utf8'))).length);
});
test('preview destinations cannot escape the dev subtree', () => {
  for (const id of ['../play', '/play', '..', 'a/b', 'a\\b', '']) assert.throws(() => validatePreviews([{ ...row, id }]));
});
test('previews cannot share production or each other\'s save namespace', () => {
  for (const storageScope of ['', 'arpg_account_v1', null]) assert.throws(() => validatePreviews([{ ...row, storageScope }]));
  assert.throws(() => validatePreviews([row, { ...row, id: 'second' }]));
  assert.throws(() => validatePreviews([row, { ...row, storageScope: 'preview:second' }]));
});
test('branch arguments and mode flags are explicit configuration', () => {
  for (const ref of ['--upload-pack=x', '../main', 'main;echo', '', null]) assert.throws(() => validatePreviews([{ ...row, ref }]));
  assert.throws(() => validatePreviews([{ ...row, worldmass: 'false' }]));
  assert.deepEqual(validatePreviews([row]), [row]);
});
