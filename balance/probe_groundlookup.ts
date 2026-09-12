import { strict as assert } from 'node:assert';
import { bootSimEngine } from '../src/sim/arena';
import { doodadGroundIds, isDoodadGround, regionIds, regionKind, registerRegion } from '../src/world/regions';

bootSimEngine();
const expected = regionIds().filter(id => {
  const r = regionKind(id)!;
  return r.walkable && !r.visualOnly && (r.standStatus || r.enterStatus || r.survival || r.moveScale !== undefined);
});
assert.deepEqual(doodadGroundIds(), expected);
for (const id of [...regionIds(), '__unknown']) assert.equal(isDoodadGround(id), expected.includes(id), id);
const id = '__probe_ground_membership';
registerRegion({ id, walkable: true, blocks: false, moveScale: 0 });
assert.equal(isDoodadGround(id), true, 'zero move scale is still authored ground');
regionKind(id)!.visualOnly = true;
assert.equal(isDoodadGround(id), false, 'in-place changes take effect immediately');
registerRegion({ id, walkable: true, blocks: false, standStatus: 'mired' });
assert.equal(isDoodadGround(id), true, 'late replacement is immediately visible');
registerRegion({ id, walkable: false, blocks: true, standStatus: 'mired' });
assert.equal(isDoodadGround(id), false, 'solid regions are excluded');

// The hot membership path must not enumerate the registry per query.
const keys = Object.keys;
let enumerations = 0;
Object.keys = ((value: object) => { enumerations++; return keys(value); }) as typeof Object.keys;
try {
  for (let i = 0; i < 10000; i++) isDoodadGround(i % 2 ? 'mud' : '__unknown');
} finally { Object.keys = keys; }
assert.equal(enumerations, 0, 'membership performs no repeated registry scans');
console.log('PASS direct ground membership: registry parity, live edits, late registration and no enumeration');
