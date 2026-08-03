// ---------------------------------------------------------------------------
// ONE-OFF PROBE — the DEEPWINTER spatial core, headless: the field-born EYE
// (never retroactive: clear of every charted node, of town, of the player;
// cold ground + winter biome only; never at sea), the coldest-first lattice
// march (sanctuary + ocean walls, the province cap), zone conversion as
// DERIVED state (a node minted inside the territory converts on arrival),
// heart crystallization + the one-shot frozen_lake mark, the war-map render
// (territory rects + marching-ants frontline + the eye glyph), map-fit
// extents, the snapshot round-trip (+ old zone-hop-era snapshots dropped
// tolerantly), and the thaw walking the territory home — then conversion's
// ENGINE half on real minted ground: THE ENTRY FREEZE (standing water frozen
// over, scoped, idempotent, and borrowed — section H) and its MID-VISIT co-op
// wire (the snapshot's dwf bit freezing a guest already standing there —
// section I).
// Run: npx tsx balance/probe_deepwinter.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { liquidOf } from '../src/engine/genkit';
import { serializeZone, applyZone, serializeSnapshot, applySnapshot } from '../src/net/snapshot';
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
  gates: new Map(), visited: new Set(nodes.map(n => n.id)), surveyed: new Set<string>(),
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

// --- H: THE ENTRY FREEZE — conversion's ENGINE half ----------------------------
//
// C+D pinned conversion as DERIVED overlay state. THIS is what conversion does
// to the ground a player actually walks. The mint-time freeze (layoutRecipes'
// `freezeAt`) can only shape zones minted AFTER the front arrived, so an
// already-charted zone kept its open, flowing water under a whiteout blizzard —
// the one contradiction left. World.materializeDeepwinter now freezes the
// standing water on arrival; these rigs hold it to the fabric's four promises:
// it CONVERTS, it is SCOPED (water liquids only — doodads, never regions), it
// is IDEMPOTENT + family-scoped (the hook re-fires every frame), and it is
// BORROWED (the thaw restores ordinary water; nothing is written down).
{
  const w = makeSimWorld('warrior', 0xd1ce);
  // Resolve the kinds the way the engine does — through the liquid registry,
  // so this rig can never drift from the rows it is testing. ('water' and
  // 'shallows' are ONE doodad kind; the ford is the `shallow` mark on it.)
  const WATER = liquidOf('water').doodad as string;
  const ICE = liquidOf('ice').doodad as string;
  const count = (k: string): number => w.doodads.filter(d => d.kind === k).length;
  const fords = (): number => w.doodads.filter(d => d.kind === WATER && d.shallow).length;

  // A marsh through the REAL mint path: open water, fords, and bog/swamp
  // beside them as the scope control.
  const zid = w.devMintTileset('marsh', 0, 8, { seed: 909909 });
  const water0 = count(WATER), ice0 = count(ICE), fords0 = fords();
  const bog0 = count('bog'), swamp0 = count('swamp');
  check('H1 fixture: the marsh mints real open water (fords and all)',
    !!zid && water0 > 0 && fords0 > 0,
    `${water0} water (${fords0} fords), ${ice0} ice, ${bog0} bog, ${swamp0} swamp`);

  // A STANDING FRONT holding this zone. The engine reads exactly four
  // accessors off the field, so the rig installs a minimal one carrying the
  // probe's own SURGE verbatim: the half under test doesn't care WHY the
  // ground is held (the march's own zonePolicy is B/C's business), only THAT
  // it is — and a stub lets `held` flip to model the thaw.
  let held = true;
  (w.sim as unknown as { deepwinterField: unknown }).deepwinterField = {
    surge: () => SURGE,
    frostOn: (id: string) => (held && id === zid
      ? { intensity: 0.8, isHeart: false, thawing: false, color: SURGE.color, label: 'deep winter' }
      : null),
    kingIn: () => null,
    markDiscovered: () => false,
  };

  // THE LIVE PATH: a front that SPREADS onto the zone the player is already
  // standing in converts it where they stand (devRematerialize re-runs the
  // real zone-runtime registry, deepwinter row included — no private reach).
  const rev0 = w.doodadRev, nav0 = w.doodadFamilyRev('nav-block');
  w.devRematerialize();
  check('H2 the standing water freezes over', count(WATER) === 0 && count(ICE) === ice0 + water0,
    `${count(WATER)} water left, ice ${ice0} → ${count(ICE)}`);
  check('H3 no ford survives the freeze (the shallow mark went with the water)',
    fords() === 0 && !w.doodads.some(d => d.kind === ICE && d.shallow));
  // GAMEPLAY, NOT PAINT: the foot senses the new ground (ice reports itself
  // outright — wading is gone), so drawn and tested froze together.
  const iced = w.doodads.filter(d => d.kind === ICE);
  const sensed = iced.map(d => w.groundAt(d.pos)?.kind);
  check('H4 the ground underfoot is ice, and nowhere still water',
    sensed.some(k => k === ICE) && !sensed.some(k => k === WATER),
    `${sensed.filter(k => k === ICE).length}/${iced.length} sense ice`);
  check('H5 scope: only WATER liquids froze (bog + swamp keep their own rows)',
    count('bog') === bog0 && count('swamp') === swamp0);
  check('H6 the swap reported itself (the doodad rev moved)', w.doodadRev > rev0);
  check('H7 …scoped to the families it touched: nav-block never re-derived',
    w.doodadFamilyRev('nav-block') === nav0, 'neither water nor ice blocks a foot');

  // IDEMPOTENT BY THE SWEEP, not merely by its memo: invalidate the key (any
  // doodad change does) and prove the second pass finds nothing AND stays
  // silent — a re-entry must never thrash the caches.
  w.markDoodadsChanged();
  const rev1 = w.doodadRev;
  w.devRematerialize();
  check('H8 a second pass converts nothing and bumps nothing', w.doodadRev === rev1 && count(WATER) === 0);
  w.devRematerialize();
  check('H9 the per-frame re-invoke is free while the list is unchanged', w.doodadRev === rev1);

  // THE ENTRY PATH: leave and come back. Re-entry re-mints the zone's authored
  // water from its seed, and the standing front freezes it again on arrival —
  // no update tick, no re-materialize needed.
  w.loadZone(zid!);
  check('H10 re-entry: the re-minted water is frozen again at the door',
    count(WATER) === 0 && count(ICE) === ice0 + water0,
    `${count(WATER)} water, ${count(ICE)} ice`);

  // THE THAW (transience — events BORROW the world): the front lets the ground
  // go, frostOn() returns null, the hook early-returns. There is no unfreeze
  // pass because the ice was never written down — zone memory carries seed and
  // population, never doodads — so the zone simply re-mints ITS OWN water.
  held = false;
  w.loadZone(zid!);
  check('H11 the thaw restores the zone\'s ordinary water, ford for ford',
    count(WATER) === water0 && fords() === fords0 && count(ICE) === ice0,
    `${count(WATER)}/${water0} water, ${fords()}/${fords0} fords, ${count(ICE)}/${ice0} ice`);
}

// --- I: THE MID-VISIT WIRE — the freeze reaches a guest already standing there -
//
// H pinned the HOST's conversion. But co-op guests run no sim: a guest who
// APPLIED the zone while its water still flowed — then watched the front
// swallow the node mid-visit — kept wading a pond the host had already frozen,
// because no snapshot channel restates a standing doodad's KIND. The `dwf` bit
// closes it: while the front holds the host's zone, the guest runs the SAME
// registry swap (World.freezeStandingWater) over its own replicated list.
// These rigs hold the wire to its four promises: it SHIPS only while held, it
// CONVERTS the guest (drawn AND predicted ground), it is GUARDED (a stale
// other-zone snapshot freezes nothing) and free at the 20 Hz beat, and
// ABSENCE NEVER THAWS (the thaw is the next zone apply's ordinary re-mint —
// the host's own law, wire for wire).
{
  const host = makeSimWorld('warrior', 0xd1cf);
  const WATER = liquidOf('water').doodad as string;
  const ICE = liquidOf('ice').doodad as string;
  const zid = host.devMintTileset('marsh', 0, 8, { seed: 909909 });

  // The guest mirrors the zone BEFORE the front arrives — open water standing.
  const client = makeSimWorld('warrior', 0xc11e);
  applyZone(client, serializeZone(host));
  const cCount = (k: string): number => client.doodads.filter(d => d.kind === k).length;
  const cFords = (): number => client.doodads.filter(d => d.kind === WATER && d.shallow).length;
  const water0 = cCount(WATER), ice0 = cCount(ICE), fords0 = cFords();
  check('I1 fixture: the guest mirrors the host\'s OPEN water (the mid-visit premise)',
    !!zid && client.appliedZoneId === zid && water0 > 0 && fords0 > 0,
    `${water0} water (${fords0} fords), ${ice0} ice`);

  // The front swallows the node mid-visit; the HOST freezes live (H's path).
  let held = true;
  (host.sim as unknown as { deepwinterField: unknown }).deepwinterField = {
    surge: () => SURGE,
    frostOn: (id: string) => (held && id === zid
      ? { intensity: 0.8, isHeart: false, thawing: false, color: SURGE.color, label: 'deep winter' }
      : null),
    kingIn: () => null,
    markDiscovered: () => false,
  };
  host.devRematerialize();
  const snap = serializeSnapshot(host, 1);
  check('I2 the snapshot carries the frost bit while the front holds the zone',
    snap.dwf === 1 && snap.zoneId === zid);

  // THE GUARD: a stale snapshot claiming other ground must not freeze ours
  // (the door-state precedent — the same zone-identity gate).
  applySnapshot(client, { ...snap, zoneId: 'elsewhere' }, null, 1);
  check('I3 a stale other-zone snapshot freezes nothing',
    cCount(WATER) === water0 && cFords() === fords0);

  // THE BEAT: the guest's standing water freezes over, ford and all.
  applySnapshot(client, snap, null, 1);
  check('I4 the guest\'s water freezes over on the beat',
    cCount(WATER) === 0 && cCount(ICE) === ice0 + water0,
    `${cCount(WATER)} water left, ice ${ice0} → ${cCount(ICE)}`);
  check('I5 no guest ford survives (the shallow mark went with the water)',
    cFords() === 0 && !client.doodads.some(d => d.kind === ICE && d.shallow));
  // GAMEPLAY, NOT PAINT — on the guest too: the foot (prediction's own read)
  // senses the swapped ground.
  const icedC = client.doodads.filter(d => d.kind === ICE);
  const sensedC = icedC.map(d => client.groundAt(d.pos)?.kind);
  check('I6 the guest\'s foot senses ice, and nowhere still water',
    sensedC.some(k => k === ICE) && !sensedC.some(k => k === WATER),
    `${sensedC.filter(k => k === ICE).length}/${icedC.length} sense ice`);
  const revC = client.doodadRev;
  applySnapshot(client, snap, null, 1);
  check('I7 the 20 Hz repeat converts nothing and bumps nothing (the memo holds the beat free)',
    client.doodadRev === revC && cCount(WATER) === 0);

  // ABSENCE NEVER THAWS: a beat from a thawed host leaves the ice standing —
  // the host's own law (no unfreeze pass exists on either side of the wire).
  held = false;
  const snap2 = serializeSnapshot(host, 2);
  check('I8 an unheld host ships no frost bit', snap2.dwf === undefined);
  applySnapshot(client, snap2, null, 1);
  check('I9 absence reverts nothing — the guest\'s ice stands until the zone re-applies',
    cCount(ICE) === ice0 + water0 && cCount(WATER) === 0);

  // THE THAW ROAD: the next zone apply re-mints ordinary water (transience —
  // the guest thaws the way the host does: by meeting the ground anew).
  host.loadZone(zid!);
  applyZone(client, serializeZone(host));
  check('I10 the thaw arrives as the next zone apply — ordinary water, ford for ford',
    cCount(WATER) === water0 && cFords() === fords0 && cCount(ICE) === ice0,
    `${cCount(WATER)}/${water0} water, ${cFords()}/${fords0} fords`);
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nprobe_deepwinter OK');
process.exit(failed ? 1 : 0);
