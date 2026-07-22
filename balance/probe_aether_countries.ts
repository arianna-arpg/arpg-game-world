// ONE-OFF PROBE — THE AETHERIAL COUNTRY PASS: the Galestream course (the
// realm's artery — registration, gate anchor, course-only biome law, the
// terminus prize, tileset resolution through the realm pool) and the two
// country DENS (the Wane under the Vesperlands, the Storm-Throat inside the
// Driftways — doors on EVERY face, ledger seams, boss seats, live mints).
// Run: npx tsx balance/probe_aether_countries.ts
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { Rng } from '../src/core/rng';
import { TILESETS, pickTilesetForBiome } from '../src/data/tilesets';
import { BIOMES } from '../src/world/biomes';
import { dimensionDef } from '../src/world/dimensions';
import { MONSTERS } from '../src/data/monsters';
import { hasDoodadRule } from '../src/engine/levelgen';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import { SIDEZONES } from '../src/data/sidezones';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x9a1e);

// --- §1 THE GALESTREAM -------------------------------------------------------
const dim = dimensionDef('aetherial');
const course = dim?.courses?.find(c => c.id === 'galestream');
check('course: galestream registered on the aetherial', !!course);
check('course: springs at the Firmament (anchor gate)', course?.anchor === 'gate');
check('course: paints the course-only stream biome', course?.biome === 'aether_stream' && !!BIOMES.aether_stream);
check('course: a place, not patches — never in the frontier palette',
  !(dim?.biomes ?? []).some(b => b.biome === 'aether_stream'));
check('course: the Vault of Dawn stands at the wind\'s end',
  (course?.terminus?.compositions ?? []).some(c => c.composition === 'vault_of_dawn' && c.chance === 1));
check('course: label carried (map attribution law)', course?.label === 'The Galestream');

const gs = TILESETS.galestream;
check('tileset: galestream claims the stream biome in the realm pool',
  gs?.biome === 'aether_stream' && gs?.realm === 'aetherial' && gs?.frontier === false);
check('tileset: the stream rides the drift recipe with its own flux',
  gs?.forceLayout === 'aether_drift' && !!gs?.theme.flux?.gusts);
{
  let hit = 0;
  for (let s = 0; s < 40; s++) {
    if (pickTilesetForBiome('aether_stream', new Rng(0x51e + s * 17), 0.5, 'aetherial') === 'galestream') hit++;
  }
  check('resolution: the stream biome mints its own tileset', hit === 40, `${hit}/40`);
}

// --- §2 THE DENS -------------------------------------------------------------
const DENS: { mouth: string; tileset: string; ledger: string; boss: string; host: string }[] = [
  { mouth: 'wane_arch', tileset: 'wane_vault', ledger: 'wane_entered', boss: 'noctarch_of_the_wane', host: 'aether_vesper' },
  { mouth: 'storm_funnel', tileset: 'storm_throat', ledger: 'stormthroat_entered', boss: 'thunderhead_tyrant', host: 'aether_drift' },
];
for (const d of DENS) {
  check(`den ${d.tileset}: mouth carries rule + visual`, hasDoodadRule(d.mouth) && !!DOODAD_VISUALS[d.mouth]);
  check(`den ${d.tileset}: sidezone + gateway ledger`, SIDEZONES[d.mouth]?.ledgerOnEnter === d.ledger);
  check(`den ${d.tileset}: sheltered, never field-minted`,
    TILESETS[d.tileset]?.sky === 'sheltered' && TILESETS[d.tileset]?.frontier === false);
  check(`den ${d.tileset}: the boss exists`, !!MONSTERS[d.boss]);
  // THE EVERY-FACE LAW (variants replace base wholesale): the door's roll
  // must ride the base layout AND every variant's own list.
  const host = TILESETS[d.host];
  const inBase = (host?.layout ?? []).some(r => (r as { kind?: string }).kind === d.mouth);
  const inAllVariants = (host?.variants ?? []).every(v =>
    (v.layout ?? []).some(r => (r as { kind?: string }).kind === d.mouth));
  check(`den ${d.tileset}: the door rolls on EVERY ${d.host} face`, inBase && inAllVariants,
    `base:${inBase} variants:${inAllVariants}`);
}

// --- §3 THE LIVE MINTS -------------------------------------------------------
{
  const w = makeSimWorld('warrior', 31013);
  const hostId = w.devMintTileset('aether_vesper', 0, 14, { seed: 0x0e5 });
  check('live: a vesper host minted', !!hostId);
  if (hostId) {
    const parent = (w as unknown as { zoneMap: Record<string, unknown> }).zoneMap[hostId] as never;
    // The tileset is CONSUMED at mint (theme/layout/packs bake from it) —
    // the def's identity shows through name + the den contract fields.
    const den = SIDEZONES.wane_arch.mint({ parent, seed: 7, id: 'probe_wane' } as never) as
      { name?: string; noDeeper?: boolean; caveDepth?: number; objective?: { kind?: string; id?: string } };
    check('live: the Wane mints from its arch (named, one rung, no deeper)',
      den?.name === 'the Wane' && den?.noDeeper === true && den?.caveDepth === 1);
    check('live: the noctarch holds the seat',
      den?.objective?.kind === 'boss' && den?.objective?.id === 'noctarch_of_the_wane');
    const den2 = SIDEZONES.storm_funnel.mint({ parent, seed: 9, id: 'probe_throat' } as never) as
      { name?: string; noDeeper?: boolean; objective?: { id?: string } };
    check('live: the Storm-Throat mints from its funnel (tyrant seated)',
      den2?.name === 'the Storm-Throat' && den2?.noDeeper === true
      && den2?.objective?.id === 'thunderhead_tyrant');
  }
  const streamId = w.devMintTileset('galestream', 1, 13, { seed: 0x91e });
  check('live: a galestream zone minted (racing flux present)', !!streamId);
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
