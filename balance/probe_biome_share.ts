// ---------------------------------------------------------------------------
// ONE-OFF PROBE — SURFACE BIOME SHARE: sample the biome field the way the
// overworld actually mints (biomeAt over map coords), and print each biome's
// share of LAND, split by distance band from the origin (the town). The
// far-wilds bands are where the wildness-gated biomes (rift/flesh/crystal)
// live — a rarity tune should read as a share drop THERE, not just globally.
// Run: npx tsx balance/probe_biome_share.ts [--seeds 8] [--step 40]
// ---------------------------------------------------------------------------

import { biomeAt, OCEAN_BIOME } from '../src/world/biomes';

const argv = process.argv.slice(2);
const num = (flag: string, dflt: number): number => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? Number(argv[i + 1]) : dflt;
};
const SEEDS = num('--seeds', 8);
const STEP = num('--step', 40);

// Distance bands (node units from the origin). The wildness axis saturates in
// the far wilds (climate.ts radial layer: innerRadius 100, span 520), so the
// outer bands are the gated biomes' home turf.
const BANDS: [number, number][] = [[0, 400], [400, 800], [800, 1400]];
const EXTENT = BANDS[BANDS.length - 1][1];

const perBand = BANDS.map(() => new Map<string, number>());
const landPerBand = BANDS.map(() => 0);

for (let s = 0; s < SEEDS; s++) {
  const seed = (0x9e3779b9 ^ (s * 0x85ebca6b)) >>> 0;
  for (let x = -EXTENT; x <= EXTENT; x += STEP) {
    for (let y = -EXTENT; y <= EXTENT; y += STEP) {
      const r = Math.hypot(x, y);
      const band = BANDS.findIndex(([a, b]) => r >= a && r < b);
      if (band < 0) continue;
      const b = biomeAt({ x, y }, seed);
      if (b === OCEAN_BIOME) continue;
      landPerBand[band]++;
      perBand[band].set(b, (perBand[band].get(b) ?? 0) + 1);
    }
  }
}

for (let i = 0; i < BANDS.length; i++) {
  const [a, b] = BANDS[i];
  const land = landPerBand[i] || 1;
  const rows = [...perBand[i].entries()].sort((x, y) => y[1] - x[1]);
  console.log(`\n— band ${a}..${b} (${land} land samples over ${SEEDS} seeds) —`);
  for (const [biome, n] of rows) {
    const pct = (100 * n / land).toFixed(2).padStart(6);
    console.log(`${pct}%  ${biome}`);
  }
}
