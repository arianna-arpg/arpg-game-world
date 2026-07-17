// DIMENSION SEAL PROBE — the parallel-worlds contract on the real engine.
//
// Dimensions are SEALED world-states: the marked gate edge is the one lawful
// road between them, a dimension grows ONLY its own palette, and a roadless
// gate hub (the Firmament) holds exactly its minted fan forever. This probe
// is REGISTRY-DRIVEN — it enters every registered dimension that declares an
// entry and runs the same battery, so a future limbo/mirror/depth joins the
// gate automatically. Pinned here because all three of its headline checks
// caught live defects on 2026-07-16:
//
//  · THE PALETTE SEAL: every zone minted inside a dimension wears a biome
//    from that dimension's own palette (∪ gate biome ∪ course biomes). The
//    perf-determinism pass realm-locked the aether tilesets out of the shared
//    biome index with membership nowhere else, and the WHOLE Aetherial minted
//    as wasteland/rift — heaven wearing hell's face (TilesetDef.realm +
//    pickTilesetForBiome's realm pool are the fix under test).
//  · THE HUB FAN: a roadless gate hub's edge set is exactly its GATE_FANOUT
//    minted frontiers — no weave/link/anchor path may forge an inbound road
//    (the "Firmament exit that leads back to the Firmament" loop; the weaver
//    was the one linker still missing the rule). Inbound must equal own.
//  · THE CROSS-DIM SEAL: zero unmarked cross-dimension edges anywhere, ever;
//    every crossDim-marked edge touches a registered gate zone.
//  · THE SHELF IS NOT A CAVE (ascent arc): sky shelves (ZoneDef.below) and
//    off-surface ground never host a Descent delver's hellward shaft.
//  · LOAD HEALS: synthetic accretion onto the hub and a synthetic unmarked
//    cross-dim edge both strip at the next loadZone (old saves self-heal).
//  · THE SELF-GATE SEAL: a realm-gate doodad standing in its own dimension's
//    GATE ZONE never arms (its destination is the ground underfoot — the
//    "Firmament inside the Firmament" loop, whose quick dwell also sealed
//    any fan portal it was planted on), while the launch shelf's arch — a
//    true crossing — always arms; and no armed gate's stand-on disc may
//    overlap a live exit portal's (the un-dwellable pair).
//  · DETERMINISM: the same seed grows the same realm web twice.
//
// Exit 1 on any failure.
//   npx tsx balance/probe_dimensions.ts [seeds]

import { bootSimEngine, classById } from '../src/sim/arena';
import { makeAccount } from '../src/meta/account';
import { buildManifest } from '../src/packages/manifest';
import { World } from '../src/engine/world';
import { HUB_ZONE } from '../src/data/zones';
import type { ZoneDef } from '../src/data/zones';
import { dimensionDef, dimensionIds, GATE_FANOUT, isRoadlessGateHub } from '../src/world/dimensions';
import { transitRadius } from '../src/data/transit';

bootSimEngine();

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

const SEEDS = Number(process.argv[2] ?? 5);

function makeWorld(seed: number): World {
  const account = makeAccount();
  const manifest = buildManifest(account, seed);
  const world = new World(account, Object.freeze(manifest));
  world.createPlayer(classById('warrior'));
  return world;
}

const dimOf = (z: ZoneDef | undefined): string => z?.dimension ?? 'surface';

/** Every unmarked cross-dimension edge in the whole graph. */
function illegalEdges(w: World): string[] {
  const bad: string[] = [];
  const zm = (w as any).zoneMap as Record<string, ZoneDef>;
  for (const z of Object.values(zm)) {
    for (const e of z.exits) {
      if (e.to === '?' || e.crossDim) continue;
      const dest = zm[e.to];
      if (dest && dimOf(dest) !== dimOf(z)) bad.push(`${z.id}(${dimOf(z)})→${e.to}(${dimOf(dest)})`);
    }
  }
  return bad;
}

/** BFS-visit `depth` rings of a dimension's web from its gate (visiting a
 *  zone eagerly charts its ring — the real growth path). */
function crawl(w: World, gateId: string, depth: number): string[] {
  const zm = (w as any).zoneMap as Record<string, ZoneDef>;
  const seen = new Set<string>([gateId]);
  let ring = [gateId];
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const id of ring) {
      if (!w.devTravelTo(id)) continue;
      for (const e of zm[id]?.exits ?? []) {
        if (e.to !== '?' && !e.crossDim && !seen.has(e.to) && zm[e.to] && dimOf(zm[e.to]) === dimOf(zm[gateId])) {
          seen.add(e.to); next.push(e.to);
        }
      }
    }
    ring = next;
  }
  return [...seen];
}

let sawRoadless = false, sawRoaded = false, sawShelf = false, sawArmedGate = false;

for (let s = 0; s < SEEDS; s++) {
  const seed = 1000 + s * 7919;
  const w = makeWorld(seed);
  const wa = w as any;
  const zm = wa.zoneMap as Record<string, ZoneDef>;

  // --- A. THE ASCENT ARC: geyser → shelf → gate (the aetherial's own door) —
  w.devTravelTo(HUB_ZONE);
  if (w.devSpawnGeyser()) {
    const mouth = wa.caveEntrances.find((c: any) => c.kind === 'sky_geyser');
    check(`[${seed}] geyser mouth stands`, !!mouth);
    if (mouth) {
      wa.enterSidezone(mouth);
      const shelf = w.zone;
      sawShelf = true;
      check(`[${seed}] shelf is aether ground`, shelf.biome === 'aether', `biome=${shelf.biome}`);
      check(`[${seed}] shelf wears the Crossing name`, /\bCrossing\b/.test(shelf.name), shelf.name);
      // THE ARCH ARMS WHERE IT MUST: the launch shelf's ascendant gate is a
      // true crossing (its destination is NOT this shelf) — the self-gate
      // disarm must never eat it, or the Ascent itself dies.
      const shelfGates = (wa.dimGates as { dimId: string }[]).filter(g => g.dimId === 'aetherial');
      check(`[${seed}] shelf raises an ARMED ascendant gate`, shelfGates.length >= 1, `${shelfGates.length} armed`);
      if (shelfGates.length) sawArmedGate = true;
      // THE DELVER RIG: force the roll wide open — the shape gate alone must
      // refuse a shaft through a floating shelf (ZoneDef.below).
      const df = wa.sim.descentField;
      if (df) {
        const savedA = df.delverAllowed?.bind(df), savedC = df.delverChanceNow?.bind(df);
        df.delverAllowed = () => true; df.delverChanceNow = () => 1;
        wa.descentSite = null;
        wa.placeDescentDelver(w.zone);
        check(`[${seed}] no delver shaft on a sky shelf`, wa.descentSite === null);
        wa.descentSite = null;
        df.delverAllowed = savedA; df.delverChanceNow = savedC;
      }
    }
  } else {
    check(`[${seed}] geyser vents beside the hero`, false, 'devSpawnGeyser refused');
  }

  // --- B. EVERY REGISTERED DIMENSION'S SEAL BATTERY -------------------------
  for (const dimId of dimensionIds()) {
    if (dimId === 'surface') continue;
    const dim = dimensionDef(dimId);
    const ent = dim.entry;
    if (!ent) continue;
    w.enterDimension(dimId);
    const gate = zm[ent.gate.id];
    check(`[${seed}] ${dimId}: gate zone minted`, !!gate && dimOf(gate) === dimId);
    if (!gate) continue;
    check(`[${seed}] ${dimId}: gate wears its declared biome`, gate.biome === ent.gate.biome,
      `biome=${gate.biome} (declared ${ent.gate.biome})`);

    // THE SELF-GATE SEAL: we now stand IN the gate zone (enterDimension ends
    // in loadZone). No armed realm gate may target the ground underfoot —
    // the arch is the arrival's monument, never a door back into this very
    // zone (the "Firmament inside the Firmament" loop).
    const dgHere = wa.dimGates as { pos: { x: number; y: number }; dimId: string }[];
    const selfGates = dgHere.filter(g => dimensionDef(g.dimId).entry?.gate.id === wa.zone.id);
    check(`[${seed}] ${dimId}: no armed self-gate inside the gate zone`, selfGates.length === 0,
      `${selfGates.length} armed`);
    // THE DWELL-HONESTY FLOOR, engine-side: no armed gate's stand-on disc
    // overlaps a live exit portal's — an overlapped pair leaves the portal
    // un-dwellable (the genqa gateDwell invariant's runtime twin).
    const liveExits = wa.exits as { pos: { x: number; y: number }; radius: number }[];
    const overlapped = dgHere.filter(g => liveExits.some(e =>
      Math.hypot(e.pos.x - g.pos.x, e.pos.y - g.pos.y) < transitRadius(`realm_gate:dim_${g.dimId}`, 32) + e.radius));
    check(`[${seed}] ${dimId}: no armed gate dwell overlapping an exit portal`, overlapped.length === 0,
      `${overlapped.length} overlapped`);

    const visited = crawl(w, gate.id, 3);
    const allowed = new Set<string>([
      ent.gate.biome,
      ...(dim.biomes ?? []).map(b => b.biome),
      ...(dim.courses ?? []).map(c => c.biome),
    ]);
    const zones = Object.values(zm).filter(z => dimOf(z) === dimId);
    const offPalette = zones.filter(z => !allowed.has(z.biome ?? ''));
    check(`[${seed}] ${dimId}: every zone wears the realm's own palette`, offPalette.length === 0,
      offPalette.slice(0, 4).map(z => `${z.id}=${z.biome}`).join(' '));
    check(`[${seed}] ${dimId}: crawl grew the web`, visited.length >= 1 + GATE_FANOUT,
      `${visited.length} zones`);

    if (ent.road === false) {
      sawRoadless = true;
      // THE HUB FAN: own exits exactly GATE_FANOUT; inbound exactly the fan's
      // reciprocals; no cross-edge in either direction.
      check(`[${seed}] ${dimId}: roadless hub holds exactly its fan`, gate.exits.length === GATE_FANOUT,
        `${gate.exits.length} exits`);
      const own = new Set(gate.exits.map(e => e.to));
      const inbound = zones.filter(z => z.id !== gate.id && z.exits.some(e => e.to === gate.id)).map(z => z.id);
      check(`[${seed}] ${dimId}: hub inbound = hub fan`, inbound.every(id => own.has(id)) && inbound.length <= GATE_FANOUT,
        `inbound=[${inbound.join(',')}]`);
      check(`[${seed}] ${dimId}: roadless gate carries no cross-edge`, gate.exits.every(e => !e.crossDim));
    } else {
      sawRoaded = true;
      // THE ROADED GATE: its one crossing is marked and points home.
      const cross = gate.exits.filter(e => e.crossDim);
      check(`[${seed}] ${dimId}: roaded gate carries its ONE marked crossing`, cross.length === 1
        && !!zm[cross[0]?.to ?? ''] && dimOf(zm[cross[0]!.to]) === 'surface',
        `crossings=${cross.length}`);
    }
  }

  // --- C. SYNTHETIC SAVE HEALS (old accretion strips at load) ---------------
  const aeGate = zm.ae_gate;
  if (aeGate && isRoadlessGateHub(aeGate)) {
    const ring1 = zm[aeGate.exits[0]?.to ?? ''];
    // The REAL accretion shape: the weave partner is a ring-2 zone the hub's
    // fan does NOT name (a fan member could never re-weave — dedupe rules).
    const fan = new Set(aeGate.exits.map(e => e.to));
    const other = Object.values(zm).find(z =>
      dimOf(z) === 'aetherial' && z.id !== aeGate.id && !fan.has(z.id) && z.caveDepth == null);
    if (ring1 && other) {
      // A fake weave pair (hub↔other beyond the fan) + a fake unmarked
      // cross-dim edge on a ring zone — exactly what a pre-fix save carries.
      aeGate.exits.push({ to: other.id, side: 'n', at: 0.5 });
      other.exits.push({ to: aeGate.id, side: 's', at: 0.5 });
      ring1.exits.push({ to: 'lastlight', side: 'w', at: 0.5 });
      w.devTravelTo(aeGate.id);
      check(`[${seed}] load heal trims hub accretion`, aeGate.exits.length === GATE_FANOUT,
        `${aeGate.exits.length} exits`);
      check(`[${seed}] load heal strips partner reciprocal`,
        other.exits.filter((e, i) => i > 0 && e.to === aeGate.id).length === 0);
      w.devTravelTo(ring1.id);
      check(`[${seed}] load heal strips unmarked cross-dim edge`,
        ring1.exits.every(e => e.to !== 'lastlight'));
    }
  }

  // --- D. THE GLOBAL SCAN ----------------------------------------------------
  const bad = illegalEdges(w);
  check(`[${seed}] zero unmarked cross-dimension edges world-wide`, bad.length === 0, bad.slice(0, 3).join(' '));
  const gateIds = new Set(dimensionIds().map(d => dimensionDef(d).entry?.gate.id).filter(Boolean));
  const strayCross = Object.values(zm).flatMap(z =>
    z.exits.filter(e => e.crossDim && !gateIds.has(z.id) && !gateIds.has(e.to)).map(e => `${z.id}→${e.to}`));
  check(`[${seed}] every marked crossing touches a gate zone`, strayCross.length === 0, strayCross.join(' '));
}

// --- E. DETERMINISM: what the fabric PROMISES is deterministic --------------
// Frontier mints deliberately fresh-roll per world (each run a new map); the
// cross-world promises are (1) the explicitly-seeded GATE ZONE (manifest.seed
// ^ seedSalt) and (2) the dimension PALETTE FIELD (pure per coord+fieldSeed) —
// co-op clients and resumes rebuild both identically.
{
  const prints: string[] = [];
  for (let run = 0; run < 2; run++) {
    const w = makeWorld(4242);
    w.devTravelTo(HUB_ZONE);
    w.enterDimension('aetherial');
    const g = (w as any).zoneMap.ae_gate as ZoneDef;
    const seed = (w as any).sim.biomeField.fieldSeed as number;
    const palette: string[] = [];
    for (let x = -400; x <= 400; x += 160) {
      for (let y = -400; y <= 400; y += 160) palette.push(w.dimensionBiomeAtMap('aetherial', { x, y }));
    }
    prints.push(`${g.id}|${g.biome}|${g.name}|${g.exits.length}|fs=${seed}|${palette.join(',')}`);
  }
  check('same seed → same gate zone + same realm palette field', prints[0] === prints[1]);
}

// The rig must have exercised all four shapes, or the sweep proved nothing.
check('rig saw a roadless hub, a roaded gate, a launch shelf, and an ARMED shelf arch',
  sawRoadless && sawRoaded && sawShelf && sawArmedGate);

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL CHECKS PASS');
process.exit(failed ? 1 : 0);
