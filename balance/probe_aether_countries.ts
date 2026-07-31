// ONE-OFF PROBE — THE AETHERIAL COUNTRY PASS: the Galestream course (the
// realm's artery — registration, gate anchor, course-only biome law, the
// terminus prize, tileset resolution through the realm pool) and the two
// country DENS (the Wane under the Vesperlands, the Storm-Throat inside the
// Driftways — doors on EVERY face, ledger seams, boss seats, live mints).
// Run: npx tsx balance/probe_aether_countries.ts
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { Rng } from '../src/core/rng';
import { placeZoneAt } from '../src/engine/worldgen';
import { GridWalkField } from '../src/world/gridWalk';
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

// --- §4 THE GATED PRIZES (the High Bastion's sky-held vaults) ----------------
// The bastion thesis stays whole: the BASE face carries no spans row and the
// recipe's default gates nothing. The 'sea of ramparts' face alone sky-gates
// its prize spurs (prizeSpans + its own theme.spans schedule) — satellites
// ride permanent gleam, exits ride permanent ground, and a star-held vault
// is GENUINELY unreachable while the sky withholds it.
{
  const DT = 1 / 60;
  const bastion = TILESETS.aether_bastion;
  check('prizes: the BASE face keeps the thesis (no spans row, no prize gating)',
    !bastion.theme.spans && !bastion.layoutParams?.prizeSpans);
  const face = bastion.variants?.find(v => v.name === 'sea of ramparts');
  const dial = (face?.layoutParams?.prizeSpans as string[] | undefined) ?? [];
  check('prizes: the ramparts face rolls sun + star spurs',
    dial.length === 2 && dial.includes('span_sun') && dial.includes('span_star'), dial.join(','));
  check('prizes: every rolled kind carries its schedule (dial and theme.spans AGREE)',
    dial.length > 0 && dial.every(k => (face?.theme?.spans ?? []).some(r => r.region === k)));

  // LIVE: a forced-star mint entered at midnight (star held), then noon
  // (spur void). The walkable flood tells the whole story: exits always
  // reachable, gleam never flinches, the vault cut off exactly while the
  // sky withholds its spur.
  const w = makeSimWorld('warrior', 31017);
  const wa = w as unknown as Record<string, any>;
  const NOON = 48, MIDNIGHT = 168;
  const anchor = wa.zoneMap[w.zone.id] ?? w.zone;
  const def = placeZoneAt({ x: anchor.map.x + 5, y: anchor.map.y + 2 }, anchor, wa.zoneMap, wa.nextGenId++, {
    id: 'probe_bastion_star', tileset: 'aether_bastion', variant: 'sea of ramparts',
    objective: { kind: 'clear' }, seed: 0xba57, noBackEdge: true,
    layoutParams: { prizeSpans: ['span_star'], prizeIsles: [2, 2], satellites: [3, 3] },
  });
  wa.zoneMap[def.id] = def;
  w.time = MIDNIGHT;
  const entered = w.devTravelTo(def.id);
  w.time = MIDNIGHT;
  check('prizes: the ramparts mint entered', entered);
  const gw = w.walk as GridWalkField;
  const states = (): Record<string, string> => (wa.spans ? wa.spans.states() : {});
  const starCells: { x: number; y: number }[] = [];
  let gleamCell: { x: number; y: number } | null = null;
  for (let gy = 0; gy < gw.rows; gy++) {
    for (let gx = 0; gx < gw.cols; gx++) {
      const x = (gx + 0.5) * gw.cell, y = (gy + 0.5) * gw.cell;
      const k = gw.regionAt(x, y);
      if (k === 'span_star') starCells.push({ x, y });
      else if (k === 'span_gleam' && !gleamCell) gleamCell = { x, y };
    }
  }
  w.update(DT);
  check('prizes: the fabric stood + midnight holds the star spur',
    !!wa.spans && states().span_star === 'held' && starCells.length > 0,
    `${starCells.length} star cells, ${JSON.stringify(states())}`);
  check('prizes: gleam is NO fabric row (the permanent road answers to no sky)',
    !!gleamCell && states().span_gleam === undefined);

  const flood = (): Uint8Array => {
    const idx = (gx: number, gy: number): number => gy * gw.cols + gx;
    const seen = new Uint8Array(gw.cols * gw.rows);
    const q: number[] = [];
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const gx = (wa.zoneEntry.x / gw.cell | 0) + dx, gy = (wa.zoneEntry.y / gw.cell | 0) + dy;
        if (gx < 0 || gy < 0 || gx >= gw.cols || gy >= gw.rows) continue;
        if (!gw.isWalkable((gx + 0.5) * gw.cell, (gy + 0.5) * gw.cell)) continue;
        if (!seen[idx(gx, gy)]) { seen[idx(gx, gy)] = 1; q.push(idx(gx, gy)); }
      }
    }
    while (q.length) {
      const i = q.pop()!;
      const gx = i % gw.cols, gy = (i / gw.cols) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = gx + dx, ny = gy + dy;
        if (nx < 0 || ny < 0 || nx >= gw.cols || ny >= gw.rows || seen[idx(nx, ny)]) continue;
        if (!gw.isWalkable((nx + 0.5) * gw.cell, (ny + 0.5) * gw.cell)) continue;
        seen[idx(nx, ny)] = 1; q.push(idx(nx, ny));
      }
    }
    return seen;
  };
  const reachedAt = (seen: Uint8Array, x: number, y: number): boolean => {
    const gx = x / gw.cell | 0, gy = y / gw.cell | 0;
    return gx >= 0 && gy >= 0 && gx < gw.cols && gy < gw.rows && !!seen[gy * gw.cols + gx];
  };
  // The vault's shores: walkable cells docked against the star spur.
  const shoresOf = (seen: Uint8Array): { open: number; gated: number; gatedAt: { x: number; y: number }[] } => {
    let open = 0, gated = 0;
    const gatedAt: { x: number; y: number }[] = [];
    for (const c of starCells) {
      for (const [dx, dy] of [[gw.cell, 0], [-gw.cell, 0], [0, gw.cell], [0, -gw.cell]] as const) {
        const nx = c.x + dx, ny = c.y + dy;
        if (!gw.isWalkable(nx, ny) || gw.regionAt(nx, ny) === 'span_star') continue;
        if (reachedAt(seen, nx, ny)) open++;
        else { gated++; gatedAt.push({ x: nx, y: ny }); }
      }
    }
    return { open, gated, gatedAt };
  };

  // NOON: the spur voids — the vault is cut off; exits + gleam stand.
  w.time = NOON;
  for (let t = 0; t < 6; t += DT) { w.update(DT); w.time = NOON + Math.min(6, t); }
  const c0 = starCells[0];
  check('prizes: noon voids the spur into the realm\'s OWN sky-hole (cloud_void)',
    starCells.length > 0 && states().span_star === 'gone'
    && !gw.isWalkable(c0.x, c0.y) && gw.regionAt(c0.x, c0.y) === 'cloud_void',
    starCells.length ? `deck reads '${gw.regionAt(c0.x, c0.y)}'` : 'no cells');
  check('prizes: the gleam never flinches (home lanes hold at noon)',
    !!gleamCell && gw.isWalkable(gleamCell.x, gleamCell.y)
    && gw.regionAt(gleamCell.x, gleamCell.y) === 'span_gleam');
  const dayFlood = flood();
  const exits = wa.exits as { pos: { x: number; y: number } }[];
  check('prizes: every exit reachable with the spur withheld (permanent-ground law)',
    exits.length > 0 && exits.every(e => reachedAt(dayFlood, e.pos.x, e.pos.y)
      || [[24, 0], [-24, 0], [0, 24], [0, -24]].some(([dx, dy]) => reachedAt(dayFlood, e.pos.x + dx, e.pos.y + dy))),
    `${exits.length} exits`);
  const dayShores = shoresOf(dayFlood);
  check('prizes: the vault is GENUINELY sky-gated (a far shore the noon flood cannot touch)',
    dayShores.gated > 0, `open ${dayShores.open} / gated ${dayShores.gated}`);
  check('prizes: …yet docked to the standing web on its near side', dayShores.open > 0);

  // MIDNIGHT AGAIN: the spur re-forms — the vault rejoins the world.
  w.time = MIDNIGHT;
  for (let t = 0; t < 1; t += DT) w.update(DT);
  const nightFlood = flood();
  check('prizes: the night re-opens the vault (held again, the flood crosses)',
    states().span_star === 'held' && dayShores.gatedAt.length > 0
    && dayShores.gatedAt.every(s => reachedAt(nightFlood, s.x, s.y)),
    JSON.stringify(states()));
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
