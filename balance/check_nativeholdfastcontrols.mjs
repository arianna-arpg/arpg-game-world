import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

// Current native Holdfast ownership, entry and barrier regression controls.
// The 34 control bodies are retained from the reviewed V3 control course.
// Only actual checkout sources are bundled; no historical source adapter is used.
const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i += 2) {
  assert(['--project', '--out'].includes(args[i]) && args[i + 1], 'expected --project/--out value');
  assert(!options[args[i]], 'duplicate option');
  options[args[i]] = args[i + 1];
}
const project = path.resolve(options['--project'] ?? path.join(here, '..'));
const contractBytes = fs.readFileSync(path.join(here, 'nativeHoldfastControlSources.json'));
const pins = JSON.parse(contractBytes.toString('utf8'));
assert.equal(pins.schema, 'native-holdfast-control-sources/1');
assert.equal(pins.controls, 39);
assert.equal(pins.files.length, 38);
assert.equal(new Set(pins.files.map(row => row.path)).size, 38);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const seenPins = pins.files.map(row => {
  const actual = sha(fs.readFileSync(path.join(project, row.path)));
  assert([row.rawSha256, row.checkoutRawSha256].includes(actual), 'current source pin: ' + row.path);
  return { path: row.path, sha256: actual };
});
const require = createRequire(path.join(project, 'package.json'));
const { build } = require('esbuild');
const additions = new Map([
  ['src/world/gridWalk.ts',
    '\nexport function __holdfastInitialClaim(grid: GridWalkField) { return nativeInteriorGroundClaims.get(grid); }\n'],
  ['src/engine/interiorGen.ts', '\nexport { interiorLayout as __holdfastInteriorLayout };\n'],
]);
const entry = [
  "import './src/sim/arena';",
  "import { installHeadlessShims } from './src/sim/shims'; installHeadlessShims();",
  "export { GridWalkField, createNativeInteriorGrid, __holdfastInitialClaim } from './src/world/gridWalk';",
  "export { Rng, withSeededRandom } from './src/core/rng';",
  "export { generateLayout, raiseStructure, registerLayout, blocksMovement, hitSurfaceOf, doorSurfaceOf } from './src/engine/levelgen';",
  "export { __holdfastInteriorLayout } from './src/engine/interiorGen';",
  "export { installInteriorRecipeGround, closeRecipeGround } from './src/engine/nativeRecipeGround';",
  "export { beginNativeRequiredStructureReceipt, verifyRequiredStructures, closeRequiredStructures, nativeStructureGeneration, nativeStructureReturned, RequiredStructureSeatError } from './src/engine/nativeStructureProof';",
  "export { shapeDistance, pushOutOfShape } from './src/engine/shapes';",
].join('\n');
// Same actual-source/in-memory private-export pattern as
// probe_nativestructureaccess. Only read-only initial-claim lookup and the
// existing interior function become visible; no predicate or callback is stubbed.
const result = await build({
  stdin: { contents: entry, resolveDir: project, sourcefile: 'holdfast-interior-controls-entry.ts', loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'cjs', logLevel: 'silent',
  plugins: [{
    name: 'read-only-native-control-exports',
    setup(builder) {
      builder.onLoad({ filter: /(?:gridWalk|interiorGen)\.ts$/ }, args => {
        const rel = path.relative(project, args.path).split(path.sep).join('/');
        const suffix = additions.get(rel);
        if (!suffix) return;
        const bytes = fs.readFileSync(args.path);
        const pin = pins.files.find(row => row.path === rel);
        assert(pin);
        assert([pin.rawSha256, pin.checkoutRawSha256].includes(sha(bytes)), 'source changed during bundle read');
        return { contents: bytes.toString('utf8') + suffix, loader: 'ts', resolveDir: path.dirname(args.path) };
      });
    },
  }],
});
const module = { exports: {} };
new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports);
const E = module.exports, G = E.GridWalkField;
const rows = [];
const report = { scope: 'Bounded actual native ownership/interior/placement controls; not original49 or whole-suite acceptance',
  sourceContractSha256: sha(contractBytes), controlSourceSha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))),
  origin: pins.origin, supplements: pins.supplements, sourcePins: seenPins, rows };
function test(name, run) {
  report.activeControl = name;
  const detail = E.withSeededRandom(0x53454154, run);
  rows.push({ name, result: 'pass', detail });
  delete report.activeControl;
  console.log('PASS ' + name);
}
function restoreProperty(object, name, descriptor) {
  if (descriptor) Object.defineProperty(object, name, descriptor);
  else Reflect.deleteProperty(object, name);
}
function ownShape(object) {
  return Reflect.ownKeys(object).map(key => {
    const d = Object.getOwnPropertyDescriptor(object, key);
    return [String(key), 'value' in d ? 'data' : 'accessor', d.enumerable, d.configurable,
      'value' in d ? d.writable : [typeof d.get, typeof d.set]];
  });
}
function closeContext(ctx) {
  E.closeRecipeGround(ctx);
  E.closeRequiredStructures(ctx);
}
function context(grid, seed = 71031) {
  return {
    arena: { w: 1200, h: 900, shape: 'rect' }, entry: { x: 195, y: 465 }, exits: [],
    rng: new E.Rng(seed), seed, zoneId: 'holdfast_constructor_control',
    doodads: [], pois: [], camps: [], garrisons: [], breakables: [], npcs: [],
    caveSeeds: [], reserved: [], structures: [], walk: grid, gridEnsured: false,
  };
}
function definition(layoutParams = {}) {
  return {
    id: 'holdfast_interior_callback_control', name: 'Native interior callback control',
    level: 9, seed: 48127, size: { w: 900, h: 900 }, shape: 'rect',
    theme: { floor: '#161616', grid: '#222', border: '#555', obstacle: '#333', obstacleEdge: '#666', accent: '#999' },
    layoutType: 'holdfast_controls_actual_interior', layout: [], layoutParams,
    objective: { kind: 'clear' }, exits: [], map: { x: 0, y: 0 },
  };
}
function captureConstruction(run) {
  const original = Object.defineProperties;
  const captured = [];
  Object.defineProperties = function(target, descriptors) {
    const value = Reflect.apply(original, this, [target, descriptors]);
    if (target instanceof G) captured.push({ grid: target, claim: E.__holdfastInitialClaim(target), packed: target.pack() });
    return value;
  };
  try { return run(captured); } finally { Object.defineProperties = original; }
}

try {
  test('constructor origin, ordinary/fake-token refusal and identical ordinary own shape', () => {
    const ordinary = new G(120, 120), fake = new G(120, 120, 30, Symbol('native interior initial ground'));
    const native = E.createNativeInteriorGrid(120, 120);
    assert(native.claim);
    try {
      assert.deepEqual(ownShape(native.grid), ownShape(ordinary));
      assert.deepEqual(native.grid.pack(), ordinary.pack());
      assert.deepEqual(fake.pack(), ordinary.pack());
      assert.equal(native.grid.version, 0);
      assert.equal(native.grid.dirty.length, 0);
      assert.equal(native.grid.dirtyFloodV, 0);
      assert.equal(G.length, 2);
      assert.equal(native.claim.snapshot().owned.length, 16);
      for (const grid of [ordinary, fake]) {
        assert.equal(E.__holdfastInitialClaim(grid), undefined);
        const claim = grid.beginNativeRecipeGround('wall').finish();
        try { assert.deepEqual(claim.snapshot().owned, []); } finally { claim.close(); }
      }
      return { freshCells: 16, version: 0, dirty: 0, ordinaryAndFakeOwned: 0 };
    } finally { native.claim.close(); }
  });

  test('same-kind repaint consumes rights despite public version rewind; owned neighbor still paints', () => {
    const { grid, claim } = E.createNativeInteriorGrid(120, 120);
    assert(claim);
    try {
      grid.fillRegion(0, 0, 29.99, 29.99, 'ground');
      const before = claim.snapshot(), version = grid.version;
      assert(before.owned.includes(5));
      grid.fillRegion(30, 30, 59.99, 59.99, 'wall');
      grid.version = version;
      assert.equal(claim.current(before), false, 'rewind cannot restore the earlier private epoch');
      const after = claim.snapshot();
      assert(!after.owned.includes(5));
      assert(after.owned.includes(6));
      const packed = grid.pack();
      assert.equal(claim.paintGround(after, [5], () => true), false);
      assert.deepEqual(grid.pack(), packed);
      assert.equal(claim.paintGround(after, [6], () => true), true);
      assert.equal(grid.kindAt(75, 45), 'ground');
      return { consumedSameKindCell: 5, paintedOwnedNeighbor: 6 };
    } finally { claim.close(); }
  });

  for (const field of ['mask', 'kind']) test('public ' + field + ' borrow keeps mutable array semantics and revokes rights', () => {
    const { grid, claim } = E.createNativeInteriorGrid(120, 120);
    assert(claim);
    try {
      const view = claim.snapshot(), version = grid.version;
      const array = grid[field];
      assert.equal(grid[field], array);
      const prior = array[3]; array[3] = prior ^ 1;
      assert.equal(grid[field][3], prior ^ 1);
      grid.version = version;
      assert.equal(claim.current(view), false);
      assert.equal(claim.snapshot(), undefined);
      assert.equal(grid.beginNativeRecipeGround('wall'), undefined);
      array[3] = prior;
      assert.equal(claim.snapshot(), undefined, 'restoring bytes cannot recreate private rights');
      return { field, identicalMutableArray: true, revoked: true };
    } finally { claim.close(); }
  });

  test('constructor descriptor callback preserves partial write and first error, then retires fresh rights', () => {
    const original = Object.defineProperties, sentinel = Error('constructor descriptor sentinel');
    let grid, claim, calls = 0;
    Object.defineProperties = function(target, descriptors) {
      const value = Reflect.apply(original, this, [target, descriptors]);
      if (target instanceof G) {
        calls++; grid = target; claim = E.__holdfastInitialClaim(target);
        assert(claim);
        target.fillRegion(0, 0, 29.99, 29.99, 'ground');
        throw sentinel;
      }
      return value;
    };
    try { assert.throws(() => E.createNativeInteriorGrid(120, 120), error => error === sentinel); }
    finally { Object.defineProperties = original; }
    assert.equal(calls, 1);
    assert.equal(grid.kindAt(15, 15), 'ground');
    assert.equal(grid.version, 1);
    assert.equal(claim.snapshot(), undefined);
    assert.equal(E.__holdfastInitialClaim(grid), undefined);
    return { selectedCalls: calls, completedWrite: 'ground', firstErrorPreserved: true };
  });

  let activeContext;
  E.registerLayout('holdfast_controls_actual_interior', (ctx, def) => {
    activeContext = ctx;
    E.__holdfastInteriorLayout(ctx, def);
  });
  test('actual interior selected pushDirty failure before ctx.walk publication', () => captureConstruction(captured => {
    const old = Object.getOwnPropertyDescriptor(G.prototype, 'pushDirty');
    const original = Reflect.get(G.prototype, 'pushDirty'), sentinel = Error('interior pre-publication paint sentinel');
    let calls = 0;
    Object.defineProperty(G.prototype, 'pushDirty', { configurable: true, writable: true,
      value: function(...args) { calls++; Reflect.apply(original, this, args); throw sentinel; } });
    activeContext = undefined;
    const def = definition({ rooms: [1, 1], roles: false, doorChance: 0 });
    try { assert.throws(() => E.generateLayout(def, def.size, new E.Rng(def.seed), { x: 195, y: 195 }, []),
      error => error === sentinel); }
    finally { restoreProperty(G.prototype, 'pushDirty', old); }
    assert.equal(calls, 1); assert.equal(captured.length, 1);
    assert(activeContext); assert.equal(activeContext.walk, undefined);
    assert.notDeepEqual(captured[0].grid.pack(), captured[0].packed);
    assert.equal(captured[0].grid.version, 1);
    assert.equal(captured[0].claim.snapshot(), undefined);
    return { selectedCalls: calls, publishedWalk: false, partialPaintRetained: true, claimClosed: true };
  }));

  for (const wall of ['wall', 'briarwall']) test('actual interior post-publication callback cleanup and selected ' + wall + ' initialization',
    () => captureConstruction(captured => {
      const old = Object.getOwnPropertyDescriptor(G.prototype, 'fillRegion'), original = G.prototype.fillRegion;
      const calls = [], sentinel = Error('interior post-publication sentinel ' + wall), marker = { kind: 'rock', radius: 3, pos: { x: 825, y: 825 } };
      Object.defineProperty(G.prototype, 'fillRegion', { configurable: true, writable: true,
        value: function(...args) { calls.push(args); return Reflect.apply(original, this, args); } });
      activeContext = undefined;
      let ownedAtPublication;
      const params = { rooms: [1, 1], doorChance: 0, interiorWall: wall };
      Object.defineProperty(params, 'roles', { enumerable: true, configurable: true, get() {
        assert(activeContext.walk === captured[0].grid);
        ownedAtPublication = captured[0].claim.snapshot().owned.length;
        activeContext.doodads.push(marker);
        activeContext.walk.fillRegion(0, 0, 29.99, 29.99, 'mud');
        throw sentinel;
      } });
      const def = definition(params);
      try { assert.throws(() => E.generateLayout(def, def.size, new E.Rng(def.seed), { x: 195, y: 195 }, []),
        error => error === sentinel); }
      finally { restoreProperty(G.prototype, 'fillRegion', old); }
      assert.equal(captured.length, 1);
      assert.equal(activeContext.walk, captured[0].grid);
      assert(activeContext.doodads.includes(marker));
      assert.equal(activeContext.walk.kindAt(15, 15), 'mud');
      assert.equal(captured[0].claim.snapshot(), undefined);
      if (wall === 'briarwall') {
        assert.deepEqual(calls[0], [0, 0, 899.99, 899.99, 'briarwall']);
        assert.equal(ownedAtPublication, 0);
      } else {
        assert(ownedAtPublication > 0);
        assert.notDeepEqual(calls[0], [0, 0, 899.99, 899.99, 'wall'], 'no default initialization repaint');
      }
      return { wall, selectedFillCalls: calls.length, ownedAtPublication, firstErrorPreserved: true, claimClosed: true };
    }));

  // Geometry is authored fixture data, not an alternate recovery implementation.
  // Only two grave origins remain owned: col26, rows7/8. The one-cell connector
  // row12 touches chamber B. With the alternate passage plugged, opening that
  // connector would bypass the original door/plug without deleting either.
  function mixedBarrierFixture(plugKind, state) {
    const initial = E.createNativeInteriorGrid(1200, 900), { grid, claim } = initial;
    assert(claim);
    const keep = (x, y) => x >= 26 && x < 33 && y >= 7 && y < 12
      || x >= 6 && x < 33 && y === 12;
    for (let y = 0; y < 30; y++) for (let x = 0; x < 40;) {
      if (keep(x, y)) { x++; continue; }
      const left = x; while (x < 40 && !keep(x, y)) x++;
      grid.fillRegion(left * 30, y * 30, x * 30 - .01, (y + 1) * 30 - .01, 'wall');
    }
    const floor = (x0, y0, x1, y1) => grid.fillRegion(x0 * 30, y0 * 30, x1 * 30 - .01, y1 * 30 - .01, 'ground');
    floor(4, 13, 9, 18); floor(28, 13, 33, 18);
    floor(6, 15, 31, 16);
    floor(6, 15, 7, 25); floor(6, 24, 31, 25); floor(30, 15, 31, 25);
    const door = { id: 'original-interior-door', mode: 'both', cells: { x: 540, y: 450, w: 30, h: 30 },
      ...(state === 'open' ? { open: true } : state === 'broken' ? { broken: true } : {}) };
    const pos = { x: 555, y: 465 }, normal = { x: 1, y: 0 };
    const doorDoodad = { kind: 'door', pos, radius: 15, door, hitbox: E.doorSurfaceOf(door.cells, normal) };
    const ctx = context(grid);
    ctx.doodads.push(doorDoodad);
    if (plugKind) ctx.doodads.push({ kind: plugKind, pos: { x: 555, y: 735 }, radius: 16 });
    ctx.structures.push({ id: 'interior#0', defId: 'interior', rect: { x: -1e5, y: -1e5, w: 0, h: 0 },
      cellSize: 30, roofs: [], roofStyle: 'stone', floors: [], courtyards: [], slots: [],
      doors: [{ door, pos, normal }] });
    E.installInteriorRecipeGround(ctx, grid, claim);
    return { ctx, grid, claim, target: { x: 915, y: 465 }, originalDoodads: ctx.doodads.slice() };
  }

  // Independent body-clear connectivity oracle. It uses actual GridWalkField
  // answers and native movement shapes at 5px segment samples, not the
  // candidate's AABB raster, component labels, entry filter or private helper.
  // This is a bounded geometry oracle, not a claim of World.moveActor coverage.
  function connectedWithDoorsShut(ctx, goal) {
    const grid = ctx.walk, cell = grid.cell, radius = 15;
    const blockers = ctx.doodads.filter(d => (d.tier ?? 0) === 0).map(d => d.door
      ? { ...d, door: { ...d.door, open: false, broken: false } } : d).filter(d => E.blocksMovement(d));
    const clear = p => {
      if (!grid.isWalkable(p.x, p.y)) return false;
      for (let y = Math.floor((p.y - radius) / cell); y <= Math.floor((p.y + radius) / cell); y++)
        for (let x = Math.floor((p.x - radius) / cell); x <= Math.floor((p.x + radius) / cell); x++) {
          const nx = Math.max(x * cell, Math.min(p.x, (x + 1) * cell));
          const ny = Math.max(y * cell, Math.min(p.y, (y + 1) * cell));
          if (Math.hypot(p.x - nx, p.y - ny) < radius - 1e-7
            && !grid.isWalkable((x + .5) * cell, (y + .5) * cell)) return false;
        }
      return blockers.every(d => E.shapeDistance(E.hitSurfaceOf(d, 'move'), d.pos.x, d.pos.y, p.x, p.y) >= radius - 1e-7);
    };
    const point = i => ({ x: (i % grid.cols + .5) * cell, y: (Math.floor(i / grid.cols) + .5) * cell });
    const index = p => Math.floor(p.y / cell) * grid.cols + Math.floor(p.x / cell);
    const start = index(ctx.entry), end = index(goal), seen = new Set([start]), queue = [start];
    assert(clear(point(start))); assert(clear(point(end)));
    for (let h = 0; h < queue.length; h++) {
      const i = queue[h]; if (i === end) return true;
      const x = i % grid.cols, y = Math.floor(i / grid.cols);
      for (const next of [x > 0 ? i - 1 : -1, x + 1 < grid.cols ? i + 1 : -1,
        y > 0 ? i - grid.cols : -1, y + 1 < grid.rows ? i + grid.cols : -1]) {
        if (next < 0 || seen.has(next)) continue;
        const a = point(i), b = point(next); let pass = true;
        for (let k = 1; k <= 6; k++) if (!clear({ x: a.x + (b.x - a.x) * k / 6, y: a.y + (b.y - a.y) * k / 6 })) { pass = false; break; }
        if (pass) { seen.add(next); queue.push(next); }
      }
    }
    return false;
  }
  function requiredAttempt(fixture, shouldPlace, checkConnectivity = true) {
    const { ctx, grid, target, originalDoodads } = fixture, before = grid.pack();
    const oldObjects = originalDoodads.map(d => JSON.stringify(d)), initialStructures = ctx.structures.slice();
    const initialStructureValues = initialStructures.map(s => JSON.stringify(s));
    const initialEntry = ctx.entry, initialEntryValue = JSON.stringify(ctx.entry);
    const initialEntryX = ctx.entry.x, initialEntryY = ctx.entry.y;
    const proof = E.beginNativeRequiredStructureReceipt();
    let records;
    try {
      E.nativeStructureGeneration(ctx);
      if (shouldPlace) {
        E.raiseStructure(ctx, 'sealed_grave');
        E.verifyRequiredStructures(ctx, { layout: [{ kind: 'structure', structure: 'sealed_grave', count: [1, 1] }] });
        E.nativeStructureReturned(ctx);
      } else {
        assert.throws(() => E.raiseStructure(ctx, 'sealed_grave'), error => error instanceof E.RequiredStructureSeatError);
        assert.deepEqual(grid.pack(), before, 'refusal must not paint');
        assert.deepEqual(ctx.structures, initialStructures);
        assert.deepEqual(ctx.doodads, originalDoodads);
      }
    } finally { records = proof.finish(); }
    const attempts = records.filter(row => row.phase === 'attempt');
    assert.equal(attempts.length, 1);
    const attempt = attempts[0];
    assert.equal(attempt.structureId, 'sealed_grave');
    assert.equal(attempt.nativeTerminal, 'finder-null');
    assert.equal(attempt.finder.tries, 18);
    assert.equal(attempt.finder.selected, null);
    const cursor = E.Rng.fromState(attempt.finder.before);
    for (let i = 0; i < 36; i++) cursor.next();
    assert.equal(attempt.finder.after, cursor.snapshot(), 'original finder retains 36 draws');
    for (let i = 0; i < originalDoodads.length; i++) {
      assert(ctx.doodads.includes(originalDoodads[i]));
      assert.equal(JSON.stringify(originalDoodads[i]), oldObjects[i]);
    }
    for (let i = 0; i < initialStructures.length; i++) {
      assert(ctx.structures.includes(initialStructures[i]), 'original structure identity survives');
      assert.equal(JSON.stringify(initialStructures[i]), initialStructureValues[i],
        'original nested structure values survive');
    }
    assert.equal(ctx.entry, initialEntry, 'original entry identity survives');
    assert.equal(ctx.entry.x, initialEntryX, 'original entry x survives');
    assert.equal(ctx.entry.y, initialEntryY, 'original entry y survives');
    assert.equal(JSON.stringify(ctx.entry), initialEntryValue, 'original entry record survives');
    if (shouldPlace) {
      assert.equal(attempt.terminal, 'placed');
      assert.equal(attempt.recovery.terminal, 'applied');
      assert(attempt.recovery.paintedCells > 0);
      const graves = ctx.structures.filter(s => s.defId === 'sealed_grave');
      assert.equal(graves.length, 1);
      const r = graves[0].rect, mouths = ctx.doodads.filter(d => d.kind === 'lone_crypt_door');
      assert.equal(mouths.length, 1);
      assert(mouths[0].pos.x > r.x && mouths[0].pos.x < r.x + r.w
        && mouths[0].pos.y > r.y && mouths[0].pos.y < r.y + r.h);
      const returned = records.find(row => row.phase === 'returned');
      assert.equal(returned.graveCount, 1); assert.equal(returned.cryptMouthCount, 1);
      assert.deepEqual(returned.required, [{ defId: 'sealed_grave', placed: true, mouths: 1 }]);
    } else assert.equal(attempt.terminal, 'required-no-spot');
    if (checkConnectivity)
      assert.equal(connectedWithDoorsShut(ctx, target), shouldPlace, 'actual body connectivity preserves original partition');
    return { proof: records, graveCount: ctx.structures.filter(s => s.defId === 'sealed_grave').length };
  }
  for (const plug of ['secret_wall', 'crumbling_wall']) for (const state of ['closed', 'open', 'broken'])
    test('native required grave refuses mixed ' + plug + ' and ' + state + ' door bypass', () => {
      const fixture = mixedBarrierFixture(plug, state);
      try {
        assert.equal(connectedWithDoorsShut(fixture.ctx, fixture.target), false, 'fixture starts physically separated');
        return requiredAttempt(fixture, false);
      } finally { closeContext(fixture.ctx); }
    });
  for (const state of ['closed', 'open', 'broken']) test('native required grave+mouth succeeds through real alternate passage with ' + state + ' door', () => {
    const fixture = mixedBarrierFixture(null, state);
    try {
      assert.equal(connectedWithDoorsShut(fixture.ctx, fixture.target), true, 'removed plug opens the actual alternate passage');
      return requiredAttempt(fixture, true);
    } finally { closeContext(fixture.ctx); }
  });
  // Add the inherited-overlap stub to the real alternate-passage positive
  // fixture. The entry cell and all ground under the stub already exist;
  // every candidate grave still requires actual constructor-owned ground.
  function entryFixture(mode = 'outward', state = 'closed') {
    const fixture = mixedBarrierFixture(null, 'closed'), { ctx } = fixture;
    ctx.entry = { x: 190.5, y: 450 };
    let pos = { x: 195, y: 435 }, cells = { x: 150, y: 420, w: 90, h: 30 };
    if (mode === 'reversed' || mode === 'parallel' || mode === 'inside') {
      pos = { x: 195, y: 450 }; cells = { x: 150, y: 435, w: 90, h: 30 };
      ctx.entry = mode === 'reversed' ? { x: 190.5, y: 470 }
        : mode === 'parallel' ? { x: 180, y: 465 } : { x: 195, y: 450 };
    }
    const normal = { x: 0, y: 1 };
    const door = { id: 'inherited-entry-door', mode: 'both', cells,
      ...(state === 'open' ? { open: true } : state === 'broken' ? { broken: true } : {}) };
    let hitbox = E.doorSurfaceOf(cells, normal);
    if (mode === 'corner') {
      ctx.entry = { x: 180, y: 450 };
      hitbox = { kind: 'rect', hw: 8, hh: 8 };
    }
    if (mode === 'rotated') hitbox = { kind: 'rect', hw: 15, hh: 8, rot: .1 };
    if (mode === 'multi') hitbox = { kind: 'multi', parts: [{ dx: 0, dy: 0, r: 8 }] };
    if (mode === 'circle') hitbox = { kind: 'circle', r: 8 };
    if (mode === 'endpoint-short') hitbox = { kind: 'rect', hw: 45, hh: 14 };
    const inherited = { kind: 'door', pos, radius: 45, door, hitbox };
    ctx.doodads.push(inherited);
    ctx.structures[0].doors.push({ door, pos, normal });
    let extraBlocker;
    if (mode === 'extra-blocker') {
      extraBlocker = { kind: 'rock', pos: { x: 175.5, y: 450 }, radius: 1 };
      ctx.doodads.push(extraBlocker);
    }
    if (mode === 'reservation')
      ctx.reserved.push({ pos: { x: 175.5, y: 450 }, radius: 1 });
    if (mode === 'stand') ctx.pois.push({ x: 165, y: 450 });
    if (mode === 'multiple') {
      const otherPos = { x: 190, y: 435 };
      const otherDoor = { id: 'second-inherited-entry-door', mode: 'both', cells: { x: 145, y: 420, w: 90, h: 30 } };
      ctx.doodads.push({ kind: 'door', pos: otherPos, radius: 45, door: otherDoor,
        hitbox: E.doorSurfaceOf(otherDoor.cells, normal) });
      ctx.structures[0].doors.push({ door: otherDoor, pos: otherPos, normal });
    }
    fixture.originalDoodads = ctx.doodads.slice();
    return { ...fixture, inherited, extraBlocker, mode };
  }
  for (const state of ['closed', 'open', 'broken'])
    test('actual grave+mouth after one inherited outward door-face escape, door ' + state, () => {
      const fixture = entryFixture('outward', state), { ctx, inherited } = fixture;
      try {
        const shape = E.hitSurfaceOf(inherited, 'move');
        const push = E.pushOutOfShape(shape, inherited.pos.x, inherited.pos.y, ctx.entry.x, ctx.entry.y, 15);
        // Independent actual native collision output for the fixed fixture,
        // not an alternate version of the candidate face predicate.
        assert.deepEqual(push, { x: 190.5, y: 458, nx: 0, ny: 1 });
        assert(E.shapeDistance(shape, inherited.pos.x, inherited.pos.y, 195, 465) > 20);
        assert.equal(connectedWithDoorsShut(ctx, fixture.target), true);
        const detail = requiredAttempt(fixture, true, false);
        assert.equal(connectedWithDoorsShut(ctx, fixture.target), true);
        return { ...detail, state, nativePush: push, originalEntry: ctx.entry };
      } finally { closeContext(ctx); }
    });
  for (const mode of ['reversed', 'parallel', 'inside', 'corner', 'rotated', 'multi', 'circle',
    'extra-blocker', 'reservation', 'stand', 'endpoint-short', 'multiple'])
    test('actual required grave refuses unsafe inherited entry: ' + mode, () => {
      const fixture = entryFixture(mode), { ctx } = fixture;
      const entryBefore = JSON.stringify(ctx.entry), reservationsBefore = JSON.stringify(ctx.reserved),
        standsBefore = JSON.stringify(ctx.pois);
      try {
        const detail = requiredAttempt(fixture, false, false);
        assert.equal(JSON.stringify(ctx.entry), entryBefore);
        assert.equal(JSON.stringify(ctx.reserved), reservationsBefore);
        assert.equal(JSON.stringify(ctx.pois), standsBefore);
        // Some impossible starts are rejected by the earlier physical entry
        // component/start-cell gates. Do not claim every negative reached the
        // face helper; all exercise the actual unchanged placement API.
        return { ...detail, mode, unchangedEntryAndForeignGround: true };
      } finally { closeContext(ctx); }
    });

  test('reentrant extra context getter cannot drop a foreign stub blocker', () => {
    const fixture = entryFixture('extra-blocker'), { ctx, extraBlocker } = fixture;
    const originalPush = Array.prototype.push;
    let reads = 0, installs = 0, dropped = 0;
    Object.defineProperty(ctx, 'controlExtraGetter', { enumerable: true, configurable: true, get() {
      reads++;
      if (reads === 3) {
        installs++;
        Array.prototype.push = function(...items) {
          if (items.length === 1 && items[0] === extraBlocker) {
            dropped++; Array.prototype.push = originalPush; return this.length;
          }
          return Reflect.apply(originalPush, this, items);
        };
      }
      return 0;
    } });
    try {
      const detail = requiredAttempt(fixture, false, false);
      // V9 captures foreign/strict contexts once each. No raw spread occurs
      // between its entry-witness checks and the exact-identity obstacle copy.
      assert.equal(reads, 2);
      assert.equal(installs, 0); assert.equal(dropped, 0);
      assert.equal(Array.prototype.push, originalPush);
      assert(ctx.doodads.includes(extraBlocker));
      return { ...detail, rawContextReads: reads, maliciousPushInstalled: installs, foreignRecordsDropped: dropped };
    } finally { Array.prototype.push = originalPush; closeContext(ctx); }
  });

  test('selected recovery context getter preserves first error and completed partial effects', () => {
    const fixture = entryFixture('outward'), { ctx, grid } = fixture;
    const sentinel = Error('selected recovery context getter sentinel');
    const marker = { kind: 'mud', radius: 2, pos: { x: 15, y: 15 } };
    const proof = E.beginNativeRequiredStructureReceipt();
    let reads = 0, records;
    Object.defineProperty(ctx, 'controlExtraGetter', { enumerable: true, configurable: true, get() {
      if (++reads === 2) {
        ctx.doodads.push(marker);
        grid.fillRegion(0, 0, 29.99, 29.99, 'ground');
        throw sentinel;
      }
      return 0;
    } });
    try {
      E.nativeStructureGeneration(ctx);
      assert.throws(() => E.raiseStructure(ctx, 'sealed_grave'), error => error === sentinel);
      assert.equal(reads, 2);
      assert(ctx.doodads.includes(marker));
      assert.equal(grid.kindAt(15, 15), 'ground');
      assert.equal(ctx.structures.filter(s => s.defId === 'sealed_grave').length, 0);
    } finally { records = proof.finish(); closeContext(ctx); }
    const attempt = records.find(row => row.phase === 'attempt');
    assert(attempt); assert.equal(attempt.nativeTerminal, 'finder-null'); assert.equal(attempt.finder.tries, 18);
    const cursor = E.Rng.fromState(attempt.finder.before);
    for (let i = 0; i < 36; i++) cursor.next();
    assert.equal(attempt.finder.after, cursor.snapshot());
    return { rawContextReads: reads, firstErrorPreserved: true, partialDoodadAndPaintRetained: true, proof: records };
  });
  assert.equal(rows.length, 34, 'complete bounded control roster');

// SOURCE ONLY / UNRUN: separate provisional suffix for the existing control scope.
// Requires its existing assert, E, G and test bindings. No imports or substitutions.
// Keep all existing 34 bodies byte-identical. Apply only after reviewed repair/pins.
{
  const reflectionKeys = ['cellOcclusion', 'cols', 'rows', 'cell', 'mask', 'kind',
    'kindList', 'version', 'dirty', 'dirtyFloodV', 'region', 'regionV', 'distCache',
    'spareDist', 'profTables', 'profIdx', 'dialRing', 'scratchQ', 'tick', 'refreshesLeft'];
  function reflectionNoImportedRight(claim, oldView, cell) {
    assert.equal(claim.current(oldView), false, 'pre-import view is no longer authority');
    assert.equal(claim.paintGround(oldView, [cell], () => true), false);
    const current = claim.snapshot();
    if (current !== undefined) {
      assert.deepEqual(current.owned, [], 'no pre-import painted cell is inherited');
      assert.equal(claim.paintGround(current, [cell], () => true), false);
    }
  }

  test('reflection compatibility retains original ordered slots and mutable kind table identity', () => {
    const ordinary = new G(120, 120), native = E.createNativeInteriorGrid(120, 120);
    assert(native.claim);
    try {
      for (const grid of [ordinary, native.grid]) {
        assert.deepEqual(Object.keys(grid), reflectionKeys);
        for (const key of ['mask', 'kind', 'kindList']) {
          const descriptor = Object.getOwnPropertyDescriptor(grid, key);
          assert(descriptor && descriptor.enumerable && descriptor.configurable);
          assert.equal(typeof descriptor.get, 'function');
          assert.equal(descriptor.set, undefined);
          assert.equal('value' in descriptor, false);
        }
      }
      // This shape-only inspection does not call any borrow getter.
      assert(native.claim.snapshot());
      const table = ordinary.kindList;
      assert.equal(ordinary.kindList, table);
      assert(Array.isArray(table));
      assert.deepEqual(table, ['wall']);
      table[0] = 'briarwall';
      assert.equal(ordinary.kindAt(15, 15), 'briarwall');
      table[0] = 'wall';
      ordinary.fillRegion(0, 0, 29.99, 29.99, 'ground');
      assert.equal(ordinary.kindList, table, 'native kindByte uses the same exposed table');
      assert(table.includes('ground'));
      const packed = ordinary.pack();
      assert.notEqual(packed.kinds, table);
      assert.deepEqual(packed.kinds, table);
      return { orderedKeys: reflectionKeys, mutableTableIdentity: true, packedTableDetached: true };
    } finally { native.claim.close(); }
  });

  test('pre-install selected descriptor exposure has no backing data alias and genuine getter revokes', () => {
    const original = Object.defineProperties;
    let captured, initialClaim, borrowed, selectedGetter, calls = 0;
    Object.defineProperties = function(target, descriptors) {
      if (!(target instanceof G)) return Reflect.apply(original, this, [target, descriptors]);
      calls++; captured = target; initialClaim = E.__holdfastInitialClaim(target);
      assert(initialClaim);
      for (const key of ['mask', 'kind', 'kindList']) {
        const before = Object.getOwnPropertyDescriptor(target, key);
        assert(before && 'value' in before && before.enumerable && before.configurable);
        assert.equal(before.value, undefined, key + ' has no pre-install backing alias');
      }
      selectedGetter = descriptors.kindList.get;
      assert.equal(typeof selectedGetter, 'function');
      // Invoke the real selected closure before installing any descriptor.
      borrowed = Reflect.apply(selectedGetter, target, []);
      assert(Array.isArray(borrowed));
      const value = Reflect.apply(original, this, [target, descriptors]);
      assert.equal(Object.getOwnPropertyDescriptor(target, 'kindList').get, selectedGetter);
      assert.equal(target.kindList, borrowed);
      return value;
    };
    let made;
    try {
      try { made = E.createNativeInteriorGrid(120, 120); }
      finally { Object.defineProperties = original; }
      assert.equal(calls, 1); assert.equal(made.grid, captured);
      borrowed[0] = 'briarwall';
      assert.equal(captured.kindAt(15, 15), 'briarwall');
      assert.equal(initialClaim.snapshot(), undefined);
      assert.equal(captured.beginNativeRecipeGround('wall'), undefined);
      borrowed[0] = 'wall';
      assert.equal(initialClaim.snapshot(), undefined, 'equal restored values are not renewed authority');
      return { installerCalls: calls, undefinedDataSlots: 3, actualBorrowRevoked: true };
    } finally { initialClaim?.close(); made?.claim?.close(); }
  });

  test('kind table borrow permanently revokes every existing ground claim', () => {
    // Independent unborrowed grid: this must detect an omitted kindList
    // descriptor check, without relying on earlier array-borrow revocation.
    const descriptorCase = (() => {
      const selected = E.createNativeInteriorGrid(120, 120), grid = selected.grid;
      assert(selected.claim);
      const descriptor = Object.getOwnPropertyDescriptor(grid, 'kindList');
      assert(descriptor && typeof descriptor.get === 'function');
      let getterReads = 0, later;
      const sentinel = Error('replacement kindList getter must not execute');
      try {
        const view = selected.claim.snapshot(); assert(view);
        assert.equal(selected.claim.current(view), true);
        const replacement = function() { getterReads++; throw sentinel; };
        assert.notEqual(replacement, descriptor.get);
        Object.defineProperty(grid, 'kindList', { configurable: true, enumerable: true, get: replacement });
        assert.equal(selected.claim.current(view), false);
        assert.equal(getterReads, 0, 'current inspects descriptor identity without selecting its getter');
        assert.equal(selected.claim.snapshot(), undefined);
        assert.equal(getterReads, 0, 'snapshot refuses without selecting its getter');
        Object.defineProperty(grid, 'kindList', descriptor);
        assert.equal(selected.claim.current(view), false, 'snapshot closed this handle permanently');
        assert.equal(selected.claim.snapshot(), undefined);
        // No backing array was borrowed. Restoring the genuine descriptor may
        // admit a later real producer, while the closed old handle stays closed.
        later = grid.beginNativeRecipeGround('wall'); assert(later);
        later.paintRect(30, 30, 59.99, 59.99);
        const next = later.finish(), nextView = next.snapshot(); assert(nextView);
        assert.deepEqual(nextView.owned, [5]);
        assert.equal(getterReads, 0);
        return { replacementGetterReads: getterReads, oldHandleClosed: true, laterRealProducerAllowed: true };
      } finally {
        Object.defineProperty(grid, 'kindList', descriptor);
        selected.claim.close(); later?.finish().close();
      }
    })();
    const made = E.createNativeInteriorGrid(120, 120), grid = made.grid;
    assert(made.claim);
    let painted;
    try {
      const painter = grid.beginNativeRecipeGround('wall'); assert(painter);
      painter.paintRect(30, 30, 59.99, 59.99);
      painted = painter.finish();
      const initialView = made.claim.snapshot(), paintedView = painted.snapshot();
      assert(initialView && paintedView && paintedView.owned.includes(5));
      const version = grid.version, descriptor = Object.getOwnPropertyDescriptor(grid, 'kindList');
      const table = grid.kindList;
      assert.equal(grid.kindList, table);
      table[0] = 'briarwall'; assert.equal(grid.kindAt(15, 15), 'briarwall');
      table[0] = 'wall'; grid.version = version;
      Object.defineProperty(grid, 'kindList', { configurable: true, enumerable: true,
        writable: true, value: table.slice() });
      Object.defineProperty(grid, 'kindList', descriptor);
      assert.equal(grid.kindList, table);
      for (const [claim, view] of [[made.claim, initialView], [painted, paintedView]]) {
        assert.equal(claim.current(view), false);
        assert.equal(claim.snapshot(), undefined);
        assert.equal(claim.paintGround(view, [5], () => true), false);
      }
      assert.equal(grid.beginNativeRecipeGround('wall'), undefined);
      return { descriptorCase, revokedExistingClaims: 2, restoredBytesVersionDescriptorDoNotRenew: true };
    } finally { made.claim.close(); painted?.close(); }
  });

  test('partial selected descriptor installer preserves first error and native completed paint', () => {
    const original = Object.defineProperties, sentinel = Error('reflection partial installer sentinel');
    let grid, claim, installedMask, calls = 0;
    Object.defineProperties = function(target, descriptors) {
      if (!(target instanceof G)) return Reflect.apply(original, this, [target, descriptors]);
      calls++; grid = target; claim = E.__holdfastInitialClaim(target); assert(claim);
      // Genuine but incomplete native installation: do not install the later slots.
      Reflect.apply(original, this, [target, { mask: descriptors.mask }]);
      installedMask = descriptors.mask.get;
      target.fillRegion(0, 0, 29.99, 29.99, 'ground');
      throw sentinel;
    };
    try {
      try { assert.throws(() => E.createNativeInteriorGrid(120, 120), error => error === sentinel); }
      finally { Object.defineProperties = original; }
      assert.equal(calls, 1);
      assert.equal(Object.getOwnPropertyDescriptor(grid, 'mask').get, installedMask);
      for (const key of ['kind', 'kindList']) {
        const descriptor = Object.getOwnPropertyDescriptor(grid, key);
        assert(descriptor && 'value' in descriptor); assert.equal(descriptor.value, undefined);
      }
      assert.equal(grid.kindAt(15, 15), 'ground');
      assert.equal(grid.version, 1); assert.equal(grid.dirty.length, 1);
      assert.equal(claim.snapshot(), undefined);
      assert.equal(E.__holdfastInitialClaim(grid), undefined);
      return { exactSentinel: true, completedPaint: 'ground', partialDescriptorsRetained: true };
    } finally { claim?.close(); }
  });

  test('unpack consumes pre-import recipe authority and exposes its current detached table', () => {
    const base = new G(120, 120);
    base.fillRegion(0, 0, 29.99, 29.99, 'ground');
    base.fillRegion(0, 0, 29.99, 29.99, 'wall');
    const original = Object.defineProperties, rows = [];
    for (const mode of ['same-wall', 'remapped-wall', 'kinds-claim', 'kbits-claim',
      'kinds-claim-throw', 'kbits-claim-throw', 'installer-throw']) {
      base.kindList[0] = mode === 'remapped-wall' ? 'briarwall' : 'wall';
      const expected = base.pack(), packed = { ...expected }, sentinel = Error('reflection unpack input sentinel');
      const captured = [], attempts = [];
      let grid, calls = 0, selectedReads = 0, importing = false, imported, failurePrefix;
      const partialState = () => ({ packed: grid.pack(), version: grid.version,
        dirty: grid.dirty.map(row => ({ ...row })), dirtyFloodV: grid.dirtyFloodV });
      function attemptGround(phase, cell) {
        assert(importing && grid, 'actual import interval and constructor-exposed grid');
        const painter = grid.beginNativeRecipeGround('wall');
        const attempt = { phase, cell, refusedAtBegin: painter === undefined, hadOwnedView: false };
        attempts.push(attempt);
        if (painter === undefined) return; // Existing API's explicit unsupported/refused result.
        const item = { painter, claim: undefined, view: undefined, cell, attempt };
        captured.push(item);
        const x = (cell % 4) * 30, y = Math.floor(cell / 4) * 30;
        painter.paintRect(x, y, x + 29.99, y + 29.99);
        item.claim = painter.finish(); item.view = item.claim.snapshot();
        if (item.view) {
          assert(item.view.owned.length === 0 || item.view.owned.includes(cell));
          attempt.hadOwnedView = item.view.owned.includes(cell);
        }
      }
      const selectedKey = mode.startsWith('kinds-') ? 'kinds' : mode.startsWith('kbits-') ? 'kbits' : null;
      if (selectedKey) Object.defineProperty(packed, selectedKey, {
        enumerable: true, configurable: true, get() {
          selectedReads++;
          attemptGround('selected-' + selectedKey, 7);
          if (mode.endsWith('-throw')) { failurePrefix = partialState(); throw sentinel; }
          return expected[selectedKey];
        },
      });
      Object.defineProperties = function(target, descriptors) {
        const value = Reflect.apply(original, this, [target, descriptors]);
        if (target instanceof G) {
          calls++; grid = target;
          attemptGround('constructor-after-install', 5);
          if (mode === 'installer-throw') {
            target.fillRegion(0, 0, 29.99, 29.99, 'ground');
            failurePrefix = partialState();
            throw sentinel;
          }
        }
        return value;
      };
      let later;
      try {
        try {
          importing = true;
          if (mode.endsWith('-throw')) assert.throws(() => G.unpack(packed), error => error === sentinel);
          else imported = G.unpack(packed);
        } finally { importing = false; Object.defineProperties = original; }
        assert.equal(calls, 1); assert.equal(selectedReads, selectedKey ? 1 : 0);
        assert.deepEqual(attempts.map(a => a.phase), selectedKey
          ? ['constructor-after-install', 'selected-' + selectedKey] : ['constructor-after-install']);
        if (mode.endsWith('-throw')) {
          assert(failurePrefix);
          assert.deepEqual(partialState(), failurePrefix, 'failure cleanup preserves the exact selected throw prefix');
          if (mode === 'installer-throw') {
            assert.equal(grid.kindAt(15, 15), 'ground');
            assert.equal(grid.version, 1); assert.equal(grid.dirty.length, 1);
          }
        }
        const beforeRefusal = grid.pack();
        for (const item of captured) {
          if (item.attempt.hadOwnedView) reflectionNoImportedRight(item.claim, item.view, item.cell);
          else {
            const now = item.claim.snapshot();
            assert.deepEqual(now?.owned ?? [], [], 'an unattested import attempt cannot gain cells later');
            if (now) assert.equal(item.claim.paintGround(now, [item.cell], () => true), false);
          }
        }
        assert.deepEqual(grid.pack(), beforeRefusal, 'refused old claims have no imported-cell effect');
        if (!mode.endsWith('-throw')) {
          assert.equal(imported, grid);
          assert.deepEqual(grid.pack(), expected);
          assert.deepEqual(Object.keys(grid), reflectionKeys);
          // No public kind/mask/kindList getter has been read on this grid.
          // A permanent borrowed flag is not an acceptable successful-import fix.
          const painter = grid.beginNativeRecipeGround('wall');
          assert(painter, 'a later real native producer may paint after successful import');
          later = painter;
          painter.paintRect(60, 30, 89.99, 59.99);
          const claim = painter.finish(), view = claim.snapshot();
          assert(view); assert.deepEqual(view.owned, [6], 'later authority covers only its actual new paint');
          assert.equal(claim.paintGround(view, [6], () => true), true);
          assert.equal(grid.kindAt(75, 45), 'ground');
        } else {
          // After proving the original throw prefix, register ground through a
          // real native paint: a kinds failure can leave only the wall table.
          grid.fillRegion(0, 0, 29.99, 29.99, 'ground');
          const painter = grid.beginNativeRecipeGround('wall');
          assert(painter, 'a failed import does not leave its private acquisition flag stuck');
          later = painter;
          painter.paintRect(60, 30, 89.99, 59.99);
          const claim = painter.finish(), view = claim.snapshot();
          assert(view); assert.deepEqual(view.owned, [6]);
          assert.equal(claim.paintGround(view, [6], () => true), true);
          assert.equal(grid.kindAt(75, 45), 'ground');
        }
        rows.push({ mode, installerCalls: calls, selectedReads, attempts,
          oldImportedRightsRefused: true, laterNativePaintAllowed: true,
          failurePrefixPreserved: mode.endsWith('-throw') ? true : undefined });
      } finally {
        Object.defineProperties = original;
        for (const item of captured) (item.claim ?? item.painter.finish()).close();
        later?.finish().close();
      }
    }
    // Separate identity course: borrowing the constructor table must not mask
    // the preceding no-borrow authority cases.
    const packed = base.pack();
    let constructorTable, selected;
    Object.defineProperties = function(target, descriptors) {
      const value = Reflect.apply(original, this, [target, descriptors]);
      if (target instanceof G) { selected = target; constructorTable = target.kindList; }
      return value;
    };
    let restored;
    try { restored = G.unpack(packed); }
    finally { Object.defineProperties = original; }
    assert.equal(restored, selected);
    assert.notEqual(restored.kindList, constructorTable, 'getter follows the current private replacement');
    assert.notEqual(restored.kindList, packed.kinds);
    const currentTable = restored.kindList;
    assert.equal(restored.kindList, currentTable);
    assert.deepEqual(currentTable, packed.kinds);
    const emitted = restored.pack(); assert.notEqual(emitted.kinds, currentTable);
    assert.deepEqual(emitted, packed);
    return { imports: rows, currentBackingIdentity: true, packedInputAndOutputDetached: true };
  });
}
  assert.equal(rows.length, 39, 'complete bounded control roster plus five reflection/import groups');
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL';
  report.error = { name: error?.name, message: String(error?.message ?? error), stack: error?.stack };
  process.exitCode = 1;
} finally {
  report.receiptSha256 = sha(JSON.stringify(rows));
  if (options['--out']) fs.writeFileSync(path.resolve(options['--out']), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
