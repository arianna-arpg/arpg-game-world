import assert from 'node:assert/strict';
import { makeSettings, serializeSettings, deserializeSettings } from '../src/meta/settings';
import { destinationLabelVisible } from '../src/render/vis/destinationLabels';

const fresh = makeSettings();
assert.equal(fresh.destinationLabels, 'near');
const saved = serializeSettings(fresh);
delete saved.destinationLabels;
assert.equal(deserializeSettings(saved)?.destinationLabels, 'near');
fresh.destinationLabels = 'always';
assert.equal(deserializeSettings(serializeSettings(fresh))?.destinationLabels, 'always');
assert.equal(deserializeSettings({ ...saved, destinationLabels: 'invalid' } as never)?.destinationLabels, 'near');
const anchor = { x: 300, y: 300 }, caption = { x: 300, y: 230 };
assert(!destinationLabelVisible('near', null, anchor, caption, 22));
assert(!destinationLabelVisible('near', { x: 800, y: 300 }, anchor, caption, 22));
assert(destinationLabelVisible('near', { x: 350, y: 300 }, anchor, caption, 22));
assert(destinationLabelVisible('near', { x: 320, y: 210 }, anchor, caption, 22));
assert(destinationLabelVisible('always', null, anchor, caption, 22));
console.log('PASS destination reveal, generous caption reach, fresh/old/invalid settings and persistence');
