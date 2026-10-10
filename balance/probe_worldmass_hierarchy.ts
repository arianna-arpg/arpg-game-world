import assert from 'node:assert/strict';
import { ZONES } from '../src/data/zones';
import { address, moveAddress } from '../src/worldmass/address';
import { canonical } from '../src/worldmass/random';
import { MassHierarchy, MASS_HIERARCHY_DEFAULT, massBoundsContains, massBoundsIntersect, massAddressBounds } from '../src/worldmass/hierarchy';

const source = { id: 'native/downs', source: 'data/zones', biomes: ['downs'], zone: structuredClone(ZONES.crossroads) };
const policy = { ...MASS_HIERARCHY_DEFAULT, cacheSize: 2 };
const h = new MassHierarchy('hierarchy-life', 51, 960, policy, [source]);
const zero = address('surface', '0', '0', 0, 0, 960), start = h.at(zero);
assert.equal(start.region.span, 21600); assert.equal(start.zone.span, 5400); assert.equal(start.chunk.span, 1350);
assert.equal(start.region.parent, start.world); assert.equal(start.zone.parent, start.region.id); assert.equal(start.chunk.parent, start.zone.id);
const west = h.at(moveAddress(zero, { x: -.001, y: -.001 }, 960));
assert.equal(west.region.ix, '-1'); assert.equal(west.zone.ix, '-1'); assert.equal(west.chunk.ix, '-1');
const boundary = moveAddress(zero, { x: 21600, y: 5400 }, 960), east = h.at(boundary);
assert.equal(east.region.ix, '1'); assert.equal(east.zone.ix, '4'); assert.equal(east.zone.iy, '1');
assert.ok(!massBoundsContains(start.region.bounds, boundary, 960));
assert.ok(massBoundsContains(east.region.bounds, boundary, 960));
assert.ok(!massBoundsIntersect(start.region.bounds, east.region.bounds));
assert.equal(h.intersections('zone', start.zone.bounds).length, 1, 'half-open exact extent has one owner');
assert.equal(h.intersections('zone', massAddressBounds(moveAddress(zero, { x: 5399, y: 5399 }, 960), 2, 2, 960)).length, 4);
assert.equal(h.intersections('chunk', start.zone.bounds).length, 16);
assert.throws(() => h.intersections('chunk', start.region.bounds), /budget/);
const far = address('surface', '9007199254741000', '-9007199254741000', .25, .75, 960), huge = h.at(far);
assert.ok(massBoundsContains(huge.chunk.bounds, far, 960));
assert.equal(huge.region.ix, '400319966877377');
assert.notEqual(h.at({ ...far, dimension: 'cave' }).world, huge.world);
assert.equal(canonical(h.at(zero)), canonical(start), 'query order and tiny geography cache never rewrite geography');
assert.throws(() => h.at({ ...zero, x: 960 }), /Noncanonical/);
// Keep the former canonical-JSON boundary as an independent acceptance oracle.
const addresses:unknown[]=[zero,far,{...zero,x:-0},{...zero,y:959.999},
  {...zero,x:960},{...zero,y:-.001},{...zero,cx:'01'},{...zero,cy:'-0'},
  {...zero,x:NaN},{...zero,y:Infinity},{...zero,cx:'9223372036854775808'},
  {...zero,extra:0},Object.assign(Object.create(null),zero),Object.assign(Object.create({}),zero),
  Object.defineProperty({...zero},'x',{value:0,enumerable:false}),
  Object.defineProperty({...zero},'extra',{value:1,enumerable:false})];
for(const value of addresses){const at=value as typeof zero;let accepted=false;
  try{accepted=canonical(address(at.dimension,at.cx,at.cy,at.x,at.y,960))===canonical(at);}catch{}
  if(accepted)assert.doesNotThrow(()=>h.at(at));else assert.throws(()=>h.at(at));
}
console.log('PASS exact World→Regions→Zones→Chunks, 21600/5400/1350 spans, huge and negative addresses, half-open bounds and bounded intersections');

source.zone.name = 'registry changed';
assert.notEqual(start.zone.native!.zone.name, source.zone.name);
assert.ok(Object.isFrozen(start.zone.native!.zone.theme));
const initial = h.enroll(start.zone, 'native-operation', 'native/fixtures', { count: 3 }, { charges: [1, 0, 0] }, 10);
assert.equal(h.at(zero).zone,h.owner(start.zone.id),'a new durable owner supersedes any cached location');
assert.equal(h.at(moveAddress(zero,{x:1,y:1},960)),h.at(zero),'points in one exact chunk share an immutable location');
assert.ok(h.update(start.zone.id, initial.id, initial.revision, 10, initial.state, 'active'));
let a = h.controller(start.zone.id, initial.id)!;
assert.ok(h.update(start.zone.id, a.id, a.revision, 12, { charges: [3, 0, 0] }));
const b = h.enroll(east.zone, 'native-operation', 'native/fixtures', { count: 3 }, { charges: [0, 2, 0] }, 12);
assert.ok(h.update(east.zone.id, b.id, b.revision, 12, b.state, 'active'));
const event = h.enroll(start.region, 'weather-front:17', 'native/weather', { duration: 40 }, { age: 4 }, 12);
assert.ok(h.update(start.region.id, event.id, event.revision, 12, event.state, 'active'));
a = h.controller(start.zone.id, initial.id)!;
assert.ok(h.update(start.zone.id, a.id, a.revision, 14, a.state, 'dormant'));
assert.equal(h.controller(start.zone.id, a.id)!.clock, 4);
assert.equal(h.controller(east.zone.id, b.id)!.clock, 0, 'one operation never advances its sibling clock');
assert.equal(h.controller(start.region.id, event.id)!.clock, 0, 'zone updates never advance regional events');
assert.equal(h.update(start.zone.id, a.id, a.revision, 15, a.state), false, 'stale writer refused');
const saved = h.snapshot();
const continued = new MassHierarchy(h.run, h.seed, h.addressSpan, policy, [], JSON.parse(JSON.stringify(saved)));
assert.deepEqual(continued.snapshot(), saved);
a = continued.controller(start.zone.id, a.id)!;
assert.ok(continued.update(start.zone.id, a.id, a.revision, 114, a.state, 'active'));
assert.equal(continued.controller(start.zone.id, a.id)!.clock, 4, 'dormant lifetime does not manufacture native work');
assert.throws(() => continued.update(start.zone.id, a.id, a.revision + 1, 113, a.state), /backwards/);
console.log('PASS source-frozen native definitions, independent zone/event clocks, sparse ownership through cache eviction and exact JSON Continue');

a = continued.controller(start.zone.id, a.id)!;
assert.ok(continued.update(start.zone.id, a.id, a.revision, 115, { charges: [5, 5, 5] }, 'complete'));
a = continued.controller(start.zone.id, a.id)!;
const receipt = { id: 'payout', source: 'native/objectiveRewards', subject: start.zone.id, kind: 'objective-complete', at: 115 };
assert.ok(continued.receipt(start.zone.id, a.id, a.revision, receipt));
a = continued.controller(start.zone.id, a.id)!;
assert.equal(continued.receipt(start.zone.id, a.id, a.revision, receipt), false);
assert.equal(continued.update(start.zone.id, a.id, a.revision, 116, a.state, 'active'), false);
assert.equal(continued.controller(east.zone.id, b.id)!.receipts.length, 0);
const malformed = continued.snapshot(); malformed.owners[0].controllers[0].definition = { changed: true };
assert.throws(() => new MassHierarchy(h.run, h.seed, h.addressSpan, policy, [], malformed), /checkpoint/);
assert.throws(() => new MassHierarchy('foreign-run', h.seed, h.addressSpan, policy, [], saved), /checkpoint/);
console.log('PASS once-only owner receipts, terminal lifecycle, independent simultaneous operations and corrupt/foreign checkpoint refusal');
