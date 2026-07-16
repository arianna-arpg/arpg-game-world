// ---------------------------------------------------------------------------
// ONE-OFF PROBE — the DEEPWINTER spatial core, headless: the field-born EYE
// (never retroactive: clear of every charted node, of town, of the player;
// cold ground + winter biome only; never at sea), the coldest-first lattice
// march (sanctuary + ocean walls, the province cap), zone conversion as
// DERIVED state (a node minted inside the territory converts on arrival),
// heart crystallization + the one-shot frozen_lake mark, the war-map render
// (territory rects + marching-ants frontline + the eye glyph), map-fit
// extents, the snapshot round-trip (+ old zone-hop-era snapshots dropped
// tolerantly), and the thaw walking the territory home.
// Run: npx tsx balance/probe_deepwinter.ts
// ---------------------------------------------------------------------------

import { bootSimEngine } from '../src/sim/arena';
import { DeepwinterField, type DeepwinterSurge } from '../src/packages/overlays/deepwinter';
import { climateAt } from '../src/world/climate';
import { biomeAt } from '../src/world/biomes';
import type { OverlayView } from '../src/world/overlay';
import type { PackageGate } from '../src/packages/types';
import type { ZoneDef } from '../src/data/zones';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();

// --- scaffolding ---------------------------------------------------------------

const SURGE: DeepwinterSurge = {
  igniteChance: 1, // deterministic for the probe: every step MAY ignite (placement rules still gate)
  igniteMaxTemp: 0.34,
  centerBiomes: ['tundra', 'taiga'],
  seedMinDist: 260,
  minClearFromCharted: 150,
  avoidPlayerDist: 300,
  igniteSearchMargin: 360,
  cellSpan: 64,
  maxCells: 40,
  initialRing: 1,
  marchInterval: 1,
  safeClear: 130,
  heartRadius: 130,
  minIntensity: 0.25,
  thawInterval: 0.5,
  thawCells: 3,
  warpBiome: 'tundra',
  warp: { radius: 70, strength: 0.9 },
  eyeWarpRadius: 150,
  faction: 'rimebound',
  bossDefId: 'winter_king',
  bossPromote: 'crowned',
  packCount: [1, 3],
  packSize: [2, 4],
  whiteout: { kind: 'whiteout', banks: [2, 3] },
  snow: { cover: 0.9, floor: 0.55 },
  reward: { xpBase: 320, xpPerLevel: 52, gems: 5 },
  color: '#bfe8ff',
};

// Mutable so phase G can close the gate: with the probe's igniteChance of 1 a
// finished thaw is INSTANTLY followed by a legitimate re-ignition (contagion's
// exact lifecycle — no cooldown by design), which would mask the death.
let gateActive = true;
const GATE = (): PackageGate => ({ active: gateActive, share: 1, pressure: 1, ignitionMul: 1, severityMul: 1, concurrencyMul: 1 });

const mkZone = (id: string, x: number, y: number, kind = 'clear'): ZoneDef => ({
  id, name: id, level: 6, size: { w: 1200, h: 900 }, map: { x, y },
  objective: { kind }, theme: {}, layout: [], exits: [],
} as unknown as ZoneDef);

const mkView = (nodes: ZoneDef[], currentZoneId: string,
  terrain: OverlayView['terrain'] = () => 'land'): OverlayView => ({
  nodes, byId: Object.fromEntries(nodes.map(n => [n.id, n])), allNodes: nodes,
  terrain, currentZoneId, time: 0, census: {}, charLevel: 20,
  gates: new Map(), visited: new Set(nodes.map(n => n.id)),
});

const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

// A small charted web: town at the origin (safe), a working ring around it.
// START_ZONE must exist for the town-distance rule — the probe names its
// town node 'lastlight' to match.
const NODES = [
  mkZone('lastlight', 0, 0, 'safe'),
  mkZone('za', 180, 40), mkZone('zb', 360, -60), mkZone('zc', 540, 90),
  mkZone('zd', 240, 260), mkZone('ze', -200, 160), mkZone('zf', 60, -240),
];

// --- A: production ignition placement (never retroactive, never at sea) --------

// The climate field is seed-dependent; scan a few field seeds until one
// yields eligible cold country in the search band (a real map always has a
// cold end somewhere; the tiny probe web may not for a given seed).
let field: DeepwinterField | null = null;
let usedSeed = -1;
for (let seed = 1; seed <= 24 && !field; seed++) {
  const f = new DeepwinterField(
    { seed: 0xdead ^ seed, gate: GATE, biomeSeed: seed },
    SURGE,
  );
  f.update(0.5, mkView(NODES, 'za'));
  if (f.activeCount() === 1) { field = f; usedSeed = seed; }
}
check('A1 ignition: a winter is born within the seed scan', !!field, `field seed ${usedSeed}`);

if (field) {
  const snap = field.snapshot() as { front: { center: { x: number; y: number } } | null; cells: [number, number, number][] };
  const center = snap.front!.center;
  const town = NODES[0].map;
  const player = NODES.find(n => n.id === 'za')!.map;
  check('A2 eye ≥ seedMinDist from town', dist(center, town) >= SURGE.seedMinDist, `${Math.round(dist(center, town))}`);
  check('A3 eye ≥ avoidPlayerDist from the player', dist(center, player) >= SURGE.avoidPlayerDist, `${Math.round(dist(center, player))}`);
  const minNode = Math.min(...NODES.map(n => dist(center, n.map)));
  check('A4 eye clear of EVERY charted node (never retroactive)', minNode >= SURGE.minClearFromCharted, `${Math.round(minNode)}`);
  const t = climateAt(center, usedSeed)['temperature'] ?? 1;
  check('A5 eye on cold ground', t <= SURGE.igniteMaxTemp, `temp ${t.toFixed(3)}`);
  check('A6 eye in winter country', SURGE.centerBiomes.includes(biomeAt(center, usedSeed)), biomeAt(center, usedSeed));
  check('A7 no zone converted at birth', field.convertedZones().length === 0);
  check('A8 ignition news drained once', field.consumeNews().length === 1 && field.consumeNews().length === 0);
  check('A9 eye warp stands', field.eyeWarp() !== null && field.eyeWarp()!.radius === SURGE.eyeWarpRadius);

  // --- B: the march — coldest-first, land-bound, sanctuary-parting, capped ----

  // An ocean band south of the eye: the front must never claim past it.
  const oceanY = center.y + 96;
  const seaView = mkView(NODES, 'za', c => (c.y > oceanY ? 'ocean' : 'land'));
  const before = (field.snapshot() as { cells: unknown[] }).cells.length;
  for (let i = 0; i < SURGE.maxCells + 20; i++) field.update(1, seaView);
  const cells = (field.snapshot() as { cells: [number, number, number][] }).cells;
  check('B1 march grew the territory', cells.length > before, `${before} → ${cells.length}`);
  check('B2 province cap holds', cells.length <= SURGE.maxCells, `${cells.length}/${SURGE.maxCells}`);
  const cellCenter = (gx: number, gy: number): { x: number; y: number } =>
    ({ x: (gx + 0.5) * SURGE.cellSpan, y: (gy + 0.5) * SURGE.cellSpan });
  check('B3 the frost parts around town (safeClear)',
    cells.every(([gx, gy]) => dist(cellCenter(gx, gy), town) >= SURGE.safeClear));
  check('B4 land-bound: no cell claimed at sea',
    cells.every(([gx, gy]) => cellCenter(gx, gy).y <= oceanY));

  // --- C+D: conversion is DERIVED + the heart crystallizes --------------------

  // A frontier zone MINTS inside the territory, right at the eye: the next
  // sync converts it and crystallizes it as the glacial heart.
  const heartZone = mkZone('gen_heart', center.x, center.y);
  const grown = [...NODES, heartZone];
  field.update(0.01, mkView(grown, 'za', seaView.terrain));
  check('C1 minted-inside zone converts on arrival', field.convertedZones().includes('gen_heart'));
  const frost = field.frostOn('gen_heart');
  check('C2 frost intensity in band', !!frost && frost.intensity >= SURGE.minIntensity && frost.intensity <= 1,
    frost ? frost.intensity.toFixed(2) : 'null');
  check('C3 discovery fires once', field.markDiscovered('gen_heart') && !field.markDiscovered('gen_heart'));
  check('D1 heart crystallized at the eye', !!frost && frost.isHeart);
  check('D2 heart mark consumed once', field.consumeHeartMark() === 'gen_heart' && field.consumeHeartMark() === null);
  const king = field.kingIn('gen_heart');
  check('D3 the King holds the heart', !!king && king.bossDefId === SURGE.bossDefId && king.promote === 'crowned');

  // --- E: the war map ---------------------------------------------------------

  const layer = field.renderMap([]);
  check('E1 territory wash painted', layer.under.includes('<rect'));
  check('E2 marching-ants frontline painted', layer.over.includes('stroke-dasharray') && layer.over.includes('stroke-dashoffset'));
  check('E3 the eye glyph painted', layer.over.includes('❄'));
  const ext = field.mapExtent();
  const inExt = (gx: number, gy: number): boolean =>
    cellCenter(gx, gy).x >= ext[0].x && cellCenter(gx, gy).x <= ext[1].x
    && cellCenter(gx, gy).y >= ext[0].y && cellCenter(gx, gy).y <= ext[1].y;
  check('E4 map-fit extent encloses the territory', ext.length === 2 && cells.every(([gx, gy]) => inExt(gx, gy)));

  // --- F: persistence ----------------------------------------------------------

  const json = JSON.parse(JSON.stringify(field.snapshot()));
  const twin = new DeepwinterField({ seed: 0x7777, gate: GATE, biomeSeed: usedSeed }, SURGE);
  twin.restore(json);
  twin.update(0.01, mkView(grown, 'za', seaView.terrain));
  check('F1 snapshot round-trip: same territory',
    JSON.stringify((twin.snapshot() as { cells: unknown[] }).cells) === JSON.stringify(cells));
  check('F2 snapshot round-trip: same conversions + heart',
    twin.convertedZones().sort().join('|') === field.convertedZones().sort().join('|')
    && twin.frostOn('gen_heart')?.isHeart === true);
  const legacy = new DeepwinterField({ seed: 1, gate: GATE, biomeSeed: usedSeed }, SURGE);
  legacy.restore({ front: { id: 'deepwinter_0', heartZoneId: 'za', spreadAcc: 0, thawAcc: 0 }, frozen: [{ zid: 'za', runId: 'deepwinter_0', hops: 0 }], seq: 1 });
  check('F3 zone-hop-era snapshot dropped tolerantly', legacy.activeCount() === 0);

  // --- G: the thaw walks it home ------------------------------------------------

  check('G1 the King falls once', field.onWinterKingSlain() && !field.onWinterKingSlain());
  gateActive = false; // no re-ignition while we watch the retreat (the thaw itself must run gate-closed)
  let guard = 0;
  while (field.activeCount() === 1 && guard++ < 200) field.update(0.5, mkView(grown, 'za', seaView.terrain));
  check('G2 the thaw empties the territory', field.activeCount() === 0, `${guard} ticks`);
  check('G3 released ground is free', field.frostOn('gen_heart') === null && field.convertedZones().length === 0);
  check('G4 the eye warp lifts', field.eyeWarp() === null);
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nprobe_deepwinter OK');
process.exit(failed ? 1 : 0);
