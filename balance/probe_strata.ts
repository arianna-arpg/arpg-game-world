// ---------------------------------------------------------------------------
// ONE-OFF PROBE — the STRATA FABRIC end to end on the real mint path
// (world/strata.ts + worldgen.mintCave + data/tilesets caveFace): the band
// registry tiles, the level curve climbs by band, the deeper-mouth appetite
// follows the band, faces distribute by depth × anchor provenance (a magma
// gallery under volcanic country at depth 1; under a meadow only when deep),
// the dark floor lifts with the ladder, naming wears the band's prefix, the
// breach lands at the Brink (the Underworld's minDepth), and every mint is
// deterministic per mouth seed. Run: npx tsx balance/probe_strata.ts
// ---------------------------------------------------------------------------

import { mintCave } from '../src/engine/worldgen';
import { TILESETS, CAVE_FACE_IDS, pickCaveFace } from '../src/data/tilesets';
import { levelBonusAt, stratumOf, namePrefixAt, strataDefs } from '../src/world/strata';
import { Rng } from '../src/core/rng';
import type { ZoneDef } from '../src/data/zones';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

// A minimal surface parent at the given biome/level (the mint only reads
// level/caveDepth/anchor/biome/dimension/map/id from it).
const surface = (biome: string | undefined, level = 10): ZoneDef => ({
  id: 'probe_surface', name: 'Probe Field', level,
  size: { w: 2000, h: 1500 }, theme: TILESETS['cavern'].theme,
  layout: [], objective: { kind: 'clear' }, packs: TILESETS['cavern'].packs,
  exits: [], map: { x: 0, y: 0 },
  ...(biome ? { biome } : {}),
} as ZoneDef);

// --- 1. The registry itself ---------------------------------------------------
const bands = strataDefs();
check('bands registered', bands.length >= 3, bands.map(b => `${b.id}[${b.from}..${b.to ?? '∞'}]`).join(' '));
check('ladder tiles from 1', bands[0]?.from === 1);
check('deepest band open-ended', bands[bands.length - 1]?.to === undefined);
check('band lookup: depth 1 → galleries', stratumOf(1).id === 'galleries');
check('band lookup: depth 3 → depths', stratumOf(3).id === 'depths');
check('band lookup: depth 9 → brink (open end)', stratumOf(9).id === 'brink');
check('level curve: classic at the galleries', levelBonusAt(1) === 0 && levelBonusAt(2) === 1,
  `d1 +${levelBonusAt(1)} d2 +${levelBonusAt(2)}`);
check('level curve climbs the depths', levelBonusAt(3) === 2 && levelBonusAt(4) === 3 && levelBonusAt(5) === 4,
  `d3 +${levelBonusAt(3)} d4 +${levelBonusAt(4)} d5 +${levelBonusAt(5)}`);
check('name prefix: none at d1, Deep at d2, Sunless at d3',
  namePrefixAt(1) === undefined && namePrefixAt(2) === 'Deep' && namePrefixAt(3) === 'Sunless');

// --- 2. The face pool ----------------------------------------------------------
check('cave-face pool populated', CAVE_FACE_IDS.length >= 5, CAVE_FACE_IDS.join(', '));
check('every face id resolves', CAVE_FACE_IDS.every(id => !!TILESETS[id]));

/** Mint a full ladder chain under one anchor and return the defs per depth. */
const chain = (biome: string | undefined, seed: number, depths: number): ZoneDef[] => {
  const out: ZoneDef[] = [];
  let parent = surface(biome);
  for (let d = 1; d <= depths; d++) {
    const def = mintCave(parent, (seed * 31 + d * 977) >>> 0, `probe_cave_${biome}_${seed}_${d}`);
    out.push(def);
    parent = def;
  }
  return out;
};

/** Face distribution over N seeds at one depth under one anchor. */
const tally = (biome: string | undefined, depth: number, n = 400): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    const rng = new Rng((0xca5e ^ (i * 2654435761)) >>> 0);
    const id = pickCaveFace(depth, biome, rng);
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
};

const show = (c: Record<string, number>): string =>
  Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(' ');

// Shallow under a meadow: the classic cavern dominates; magma is a rarity.
const grove1 = tally('grove', 1);
check('d1 under grove: cavern dominates', (grove1['cavern'] ?? 0) > 200, show(grove1));
check('d1 under grove: magma a rarity', (grove1['magma_gallery'] ?? 0) < 40, show(grove1));
// Shallow under volcanic country: the magma gallery is the neighbourhood.
const volc1 = tally('volcanic', 1);
check('d1 under volcanic: magma common', (volc1['magma_gallery'] ?? 0) > 80, show(volc1));
// Shallow under tundra: rime galleries run the cold.
const tund1 = tally('tundra', 1);
check('d1 under tundra: rime common', (tund1['rime_gallery'] ?? 0) > 100, show(tund1));
// Deep anywhere: the Depths band's own face arrives; cavern has faded out.
const grove4 = tally('grove', 4);
check('d4: depths face arrived', (grove4['depths'] ?? 0) > 60, show(grove4));
check('d4: the generalist has faded', (grove4['cavern'] ?? 0) === 0, show(grove4));
// Deep under a meadow the lava STILL comes — depth is the other answer.
check('d4 under grove: magma present (depth is why)', (grove4['magma_gallery'] ?? 0) > 60, show(grove4));

// --- 3. The mint itself ---------------------------------------------------------
const ladder = chain('volcanic', 7, 5);
check('ladder depths stamp 1..5', ladder.every((z, i) => z.caveDepth === i + 1));
check('anchor inherited to the bottom', ladder.every(z => z.anchor === 'volcanic'),
  ladder.map(z => z.anchor ?? '—').join(' '));
check('levels climb the strata curve', ladder.every((z, i) => z.level === 10 + levelBonusAt(i + 1)),
  ladder.map(z => z.level).join(' '));
check('breach at the Brink (d5)', ladder[4].breach === true && !ladder[3].breach && !ladder[2].breach);
check('breach cave named a Breach', / Breach/.test(ladder[4].name), ladder[4].name);
check('depth-3 dark floor lifted', (ladder[2].theme.ambientDark ?? 0) >= 0.58,
  `ambientDark ${ladder[2].theme.ambientDark}`);
check('sheltered by construction (caveDepth stamped)', ladder.every(z => z.caveDepth != null));

// Determinism: the same mouth mints the same cave, face and all.
const a = mintCave(surface('tundra'), 123456, 'probe_det');
const b = mintCave(surface('tundra'), 123456, 'probe_det');
check('mint deterministic per seed', JSON.stringify(a) === JSON.stringify(b));

// Authored gates stay authored: an explicit tileset never face-rolls.
const vault = mintCave(surface('desert'), 999, 'probe_vault', 'buried_vault', { rollVariant: true });
check('explicit tileset honored (vault gate)', vault.packs === TILESETS['buried_vault'].packs);

// The depths band's own face carries the Depthkin.
const deep = mintCave(chain('grove', 3, 3)[2], 424242, 'probe_depths_face');
check('a depth-4 mint exists and stamps its band', deep.caveDepth === 4
  && stratumOf(deep.caveDepth ?? 0).id === 'depths');

// Prefix check on a depth-2 mint (galleries band, prefixFrom 2).
const d2 = chain('grove', 11, 2)[1];
check('depth-2 name wears Deep (unless a variant renamed it)', /Deep /.test(d2.name), d2.name);

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL CHECKS PASSED');
process.exit(failed ? 1 : 0);
