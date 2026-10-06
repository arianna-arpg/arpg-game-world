import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { MassSites, siteOffset, validateMassSite, pieceState } from '../src/worldmass/sites';
import { regionalCountrySites } from '../src/worldmass/regionalSites';
import { massAdventure } from '../src/worldmass/preset';
import { MassGenerator, makeMassRun } from '../src/worldmass/generator';
import { canonical } from '../src/worldmass/random';
import type { MassPlace } from '../src/worldmass/contracts';
const restore = seedGlobalRandom(34267);
try {
  const w = makeSimWorld('warrior', 12); w.doodads = []; w.actors = [];
  const rows = regionalCountrySites(), seen = new Set<string>();
  for (const row of rows) {
    validateMassSite(row.site, row.recipe.radius);
    const sites = new MassSites(id => id === row.id ? row.site : undefined, () => ({ x: 0, y: 0 }), 960);
    const turns = new Set<number>();
    for (let n = 0; n < 50 && turns.size < 4; n++) {
      const place: MassPlace = { id: row.id + n, content: row.id, recipe: row.id, radius: row.recipe.radius,
        center: { dimension: 'surface', cx: '0', cy: '0', x: 0, y: 0 },
        source: { generator: 'probe', version: 1, rule: row.id, source: row.id, stream: 'probe' } };
      const angle = siteOffset(place, 0, 0).angle; if (turns.has(angle)) continue; turns.add(angle);
      sites.sync(w, []); sites.sync(w, [place]);
      // Flood with an actual body radius, sampling each edge to avoid jumping a thin prop.
      const queue = [[0, 180]], visited = new Set(['0,180']), exits = new Set<string>();
      const clear = (x: number, y: number) => { const q = siteOffset(place, x, y); return !w.pointInSolid(q.x, q.y, 12); };
      for (let head = 0; head < queue.length; head++) {
        const [x, y] = queue[head];
        if (x === -340) exits.add('west'); if (x === 340) exits.add('east');
        if (y === -340) exits.add('north'); if (y === 340) exits.add('south');
        for (const [dx, dy] of [[20, 0], [-20, 0], [0, 20], [0, -20]]) {
          const nx = x + dx, ny = y + dy, key = nx + ',' + ny;
          if (Math.abs(nx) > 340 || Math.abs(ny) > 340 || visited.has(key)) continue;
          if (![.25, .5, .75, 1].every(t => clear(x + dx * t, y + dy * t))) continue;
          visited.add(key); queue.push([nx, ny]);
        }
      }
      assert.ok(exits.size >= 2, row.id + ' needs two independent body-clear approaches');
      const cache = siteOffset(place, row.site.cache!.x, row.site.cache!.y);
      assert.ok(!w.pointInSolid(cache.x, cache.y, 24), row.id + ' cache landing');
      const before = canonical(w.doodads.map(pieceState)); sites.sync(w, [place]); assert.equal(canonical(w.doodads.map(pieceState)), before);
      const saved = sites.snapshot(w); sites.sync(w, []);
      const resumed = new MassSites(id => id === row.id ? row.site : undefined, () => ({ x: 0, y: 0 }), 960);
      resumed.restore(saved, w.time); resumed.sync(w, [place]); assert.equal(canonical(w.doodads.map(pieceState)), before);
      resumed.sync(w, []);
    }
    assert.equal(turns.size, 4);
  }
  const spec = massAdventure().terrain;
  for (const seed of [42, 81, 142]) {
    const gen = new MassGenerator(makeMassRun(seed, 'coverage', spec), spec);
    for (let y = -16; y <= 16; y += 2) for (let x = -16; x <= 16; x += 2) {
      const cell = { dimension: 'surface', cx: String(x * 8), cy: String(y * 8) };
      const places = gen.placesInCell(cell);
      assert.equal(canonical(places), canonical(gen.placesInCell(cell)), 'repeat query determinism');
      for (const p of places) if (rows.some(r => r.id === p.content)) seen.add(p.content);
    }
  }
  assert.deepEqual([...seen].sort(), rows.map(r => r.id).sort(), 'all regional families actually occur across native climate seeds');
  console.log('PASS five native climate families, four orientations, physical cache approaches, duplicate-free residency and deterministic natural coverage');
} finally { restore(); }
