// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE DRESS BUDGET + the pale garden (density census D1/D2).
//
// The two dress defects the batch-21.5 census routed, pinned at their healed
// state so they cannot silently regress:
//
//   A. THE WIND COUNTRIES (D1): galestream + aether_drift are ~10% standing
//      ground in open sky — at the legacy 26-try siting budget their authored
//      rows delivered 0-2 pieces each (10-25% of authored expectation). The
//      heal: layoutParams.dressTryMul (read by plainsLayout, THE one authored-
//      rows seam) widens findSpot's try count; isle-grain spacing overrides on
//      the tall kinds; crossing reservations clipped to the void-spanning run
//      (isle interiors are walk-around ground, not a passage). Pinned: every
//      authored row lands, and the dress total reaches the authored band.
//
//   B. THE PALE GARDEN (D2): the leviathan_trench variant authored kelp/coral
//      BEFORE its water rows — the habitat gate (nearHabitatGround reads
//      DOODADS, the ground-before convention) starved the garden to ZERO on
//      EVERY layout roll (the census's "plains fine" read was the BASE
//      layout's numbers, a variant-attribution artifact). The heal: water
//      pours first; the water row opts into walkOnly siting + ignore:
//      ['reserved'] so pools seat IN the winding gut (non-blocking ground may
//      lap a reservation — it plugs nothing); kelp beds ride them. Pinned:
//      winding AND plains rolls both grow the garden, and the winding pools
//      stand wholly on carved cells (drawn == poured).
//
//   C. ABSENT == IDENTICAL: dressTryMul absent vs an explicit 1 generates
//      byte-identical doodads — the dial's default IS the legacy budget, so
//      every zone that never authors it keeps its exact draws.
//
// Run: npx tsx balance/probe_dressbudget.ts
// ---------------------------------------------------------------------------

import { makeSimWorld } from '../src/sim/arena';
import { mintCave } from '../src/engine/worldgen';
import { TILESETS } from '../src/data/tilesets';
import type { StampSpec, ZoneDef } from '../src/data/zones';

/* eslint-disable @typescript-eslint/no-explicit-any */

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

const counts = (w: any): Record<string, number> => {
  const m: Record<string, number> = {};
  for (const d of w.doodads) m[d.kind] = (m[d.kind] ?? 0) + 1;
  return m;
};

/** Mint a tileset pocket through the REAL cave path and load it live. */
const mint = (w: any, tsId: string, seed: number,
  opts?: { variant?: string; layoutType?: string }): ZoneDef => {
  const id = `probe_dress_${tsId}_${seed}_${opts?.layoutType ?? 'roll'}`;
  const def = mintCave(w.zone, seed, id, tsId, { noDeeper: true, ...opts });
  w.caveMap[id] = def;
  w.loadZone(id);
  return def;
};

const world = makeSimWorld('warrior', 424242) as any;

// --- RIG A: the wind countries reach their authored band ---------------------
// (Floors are deliberately WIDE of the measured medians — rowfill measured
// 60-108% across seeds; the pre-fix state was 10-35% with whole rows at zero,
// so a 50% floor + every-row-lands separates defect from variance cleanly.)
for (const tsId of ['galestream', 'aether_drift']) {
  const rows = (TILESETS[tsId].layout as StampSpec[])
    .filter(r => r.kind !== 'storm_funnel' && r.kind !== 'sky_lantern');
  const zeroSets: Set<string>[] = [];
  for (const seed of [910711, 910712, 910713]) {
    mint(world, tsId, seed);
    const c = counts(world);
    let mids = 0, got = 0;
    const zeros = new Set<string>();
    for (const r of rows) {
      mids += (r.count[0] + r.count[1]) / 2;
      got += Math.min(c[r.kind as string] ?? 0, r.count[1]);
      if (!(c[r.kind as string] ?? 0)) zeros.add(r.kind as string);
    }
    zeroSets.push(zeros);
    check(`A ${tsId} s${seed}: dress reaches the band`, got / mids >= 0.5,
      `rowfill ${(got / mids * 100).toFixed(0)}% (floor 50%)`);
  }
  // STARVATION uses the census's all-cases-per-face semantics: a one-seed
  // zero on a chancey row is routine variance — a kind at zero on EVERY
  // seed is an eating branch.
  const everywhere = [...zeroSets[0]].filter(k => zeroSets.every(s => s.has(k)));
  check(`A ${tsId}: no authored row starves across all seeds`, everywhere.length === 0,
    everywhere.join(',') || 'every row lands somewhere');
}

// --- RIG B: the pale garden grows on BOTH layout rolls -----------------------
for (const lt of ['winding', 'plains']) {
  for (const seed of [777101, 777102]) {
    mint(world, 'leviathan_trench', seed, { variant: 'the pale garden', layoutType: lt });
    const c = counts(world);
    check(`B garden × ${lt} s${seed}: water pours`, (c['water'] ?? 0) >= 6, `water=${c['water'] ?? 0}`);
    check(`B garden × ${lt} s${seed}: kelp grows`, (c['kelp'] ?? 0) >= 10, `kelp=${c['kelp'] ?? 0}`);
    check(`B garden × ${lt} s${seed}: coral lands`, (c['coral'] ?? 0) >= 1, `coral=${c['coral'] ?? 0}`);
    // Drawn == poured (winding): the walkOnly water row keeps its whole BODY
    // in the carved channels — no pool cell inside solid rock.
    if (lt === 'winding' && world.walk) {
      const dry = (world.doodads as any[])
        .filter(d => d.kind === 'water' && !world.walk.isWalkable(d.pos.x, d.pos.y)).length;
      check(`B garden × ${lt} s${seed}: pools keep to the channels`, dry === 0, `${dry} cell(s) in rock`);
    }
  }
}

// --- RIG C: absent == identical (the dial's default is the legacy budget) ----
{
  // Two mints, same entrance seed, distinct ids (doodad generation reads the
  // SEED, never the id — distinct ids keep zone memory out of the compare):
  // one bare, one wearing an explicit dressTryMul 1.
  const fp = (): string => (world.doodads as any[]).map(d =>
    `${d.kind}:${d.pos.x.toFixed(2)},${d.pos.y.toFixed(2)},${d.radius.toFixed(2)}`).join('|');
  const base = mintCave(world.zone, 424299, 'probe_dress_ident_a', 'leviathan_trench',
    { noDeeper: true, layoutType: 'winding' });
  world.caveMap[base.id] = base;
  world.loadZone(base.id);
  const bare = fp();
  const dial = mintCave(world.zone, 424299, 'probe_dress_ident_b', 'leviathan_trench',
    { noDeeper: true, layoutType: 'winding' });
  dial.layoutParams = { ...dial.layoutParams, dressTryMul: 1 };
  world.caveMap[dial.id] = dial;
  world.loadZone(dial.id);
  check('C dressTryMul absent == explicit 1 (byte-identical doodads)',
    bare.length > 0 && bare === fp());
}

console.log(failed ? `\nprobe_dressbudget: ${failed} FAIL(s)` : '\nprobe_dressbudget: all PASS');
process.exit(failed ? 1 : 0);
