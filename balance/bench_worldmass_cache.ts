/** Fixed-work terrain replay beside the wall-clock combat soak. Both engines
 * read the same cells in the same order, with no host pump or bot deaths. */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { ShardHost } from '../server/shardHost';
import { seedGlobalRandom, deriveSeed } from '../src/sim/rng';

async function main() {
  const seed = 0x00ddba11, restore = seedGlobalRandom(deriveSeed(seed, 0x50a4));
  const host = new ShardHost({ seed, saveDir: null, open: true, worldmass: true, log: () => {} });
  try {
    await host.ready();
    const mass = host.world.massRuntime!;
    mass.stream.setFocusCount(6);
    // Optional only to let this identical harness run against the old control.
    mass.walk.setFocusCount?.(6);
    const hearth = host.hearthSeat(), points: { x: number; y: number }[] = [];
    for (let focus = 0; focus < 6; focus++) {
      const angle = focus * Math.PI / 3;
      const x = Math.round((hearth.x + Math.cos(angle) * 3500) / 30) * 30;
      const y = Math.round((hearth.y + Math.sin(angle) * 3500) / 30) * 30;
      for (let dy = -1290; dy <= 1290; dy += 30) for (let dx = -1290; dx <= 1290; dx += 30)
        points.push({ x: x + dx + 15, y: y + dy + 15 });
    }
    let generated = 0;
    const terrainAt = mass.generator.terrainAt.bind(mass.generator);
    mass.generator.terrainAt = at => { generated++; return terrainAt(at); };
    const passes = [];
    for (let pass = 0; pass < 3; pass++) {
      const rows: string[] = [], before = generated, start = performance.now();
      for (const p of points) rows.push(mass.walk.regionAt(p.x, p.y));
      const ms = performance.now() - start;
      passes.push({ pass, queries: points.length, generated: generated - before, ms,
        digest: createHash('sha256').update(JSON.stringify(rows)).digest('hex') });
    }
    if (new Set(passes.map(p => p.digest)).size !== 1) throw Error('Terrain changed between identical replay passes');
    const result = { seed, foci: 6, radius: 3500, hostPump: false, passes, samples: mass.stream.stats.samples };
    const report = process.argv[2];
    if (report) { mkdirSync(dirname(report), { recursive: true }); writeFileSync(report, JSON.stringify(result, null, 2)); }
    console.log(JSON.stringify(result, null, 2));
  } finally { await host.stop({ persist: false }); restore(); }
}
main().then(() => process.exit(0), error => { console.error(error); process.exit(1); });
