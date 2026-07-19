// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE SEA FABRIC end to end (world/seas.ts + the voyage's
// landing law; docs/engine/seas.md). Pins:
//   - THE FOREORDAINED TENET: a sea is a PURE, ENTRY-INVARIANT function of
//     the seed — filled from ANY member cell (memo cleared between fills),
//     the same id, name, class, size, and port spots come back,
//   - the CLASS LADDER is monotone over component size; no sampled sea ever
//     hits the fill cap at the shipped ocean fraction,
//   - PORT SPOTS: within the class budget, pairwise ≥ SEA_CFG.portMinSep,
//     every land anchor on LAND, every shore point on the sea's OWN water,
//     at most one HAVEN and only where the class rates one,
//   - THE ISLAND LEVER: islandMulAt reads the hosting class's multiplier and
//     islandAtCell's existence roll honors chance × mul exactly,
//   - THE LANDING LAW's pure half: a shore point resolves through
//     seaSpotsNear within landingSlack; open coast far from every spot
//     resolves to nothing (breakers),
//   - LIVE (real World): devEnsureSea mints the whole system VEILED with
//     seaId/portTier baked + the haven's name suffix; lanes ring the coast
//     and spoke to the haven; entering a spot unveils it, stamps
//     first_port_found + seas_found, and the sail menu groups this water's
//     harbors (veiled lane-known included); chartCourse crosses to the far
//     harbor; worldstate round-trips the system intact.
// Run: npx tsx balance/probe_seas.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SEA_CFG } from '../src/data/seas';
import { ISLAND_FIELD, islandAtCell } from '../src/world/voyage';
import { cellKind, continentAt, continentSeedFrom } from '../src/world/continents';
import { clearSeaMemo, islandMulAt, seaOfCell, seaSpotsNear, type Sea } from '../src/world/seas';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x5ea50);

// ------------------------------------------------ A. the pure fabric
{
  const seeds = [0x5ea1, 0x5ea2, 0x5ea3, 0xbeef, 0x1234];
  let seas = 0, capped = 0, sizes: number[] = [];
  let portOk = true, sepOk = true, landOk = true, waterOk = true, havenOk = true, classOk = true;
  const seen = new Set<string>();
  for (const fs of seeds) {
    const contSeed = continentSeedFrom(fs);
    clearSeaMemo();
    for (let gy = -6; gy <= 6; gy++) {
      for (let gx = -6; gx <= 6; gx++) {
        if (cellKind(gx, gy, contSeed) !== 'ocean') continue;
        const sea = seaOfCell(gx, gy, contSeed);
        const k = `${fs}:${sea.id}`;
        if (seen.has(k)) continue;
        seen.add(k);
        seas++;
        sizes.push(sea.cellCount);
        if (sea.capped) capped++;
        // class monotone over the ladder: re-derive by size and compare.
        const expect = sea.cellCount >= 19 ? 'ocean' : sea.cellCount >= 9 ? 'great_sea'
          : sea.cellCount >= 4 ? 'sea' : sea.cellCount >= 2 ? 'lagoon' : 'pond';
        if (!sea.capped && sea.cls.id !== expect) classOk = false;
        // ports: budget, spacing, ground truth, haven law.
        if (sea.ports.length > sea.cls.ports[1]) portOk = false;
        for (let i = 0; i < sea.ports.length; i++) {
          const a = sea.ports[i];
          if (continentAt(a.coord, contSeed).kind === 'ocean') landOk = false;
          const win = continentAt(a.shore, contSeed);
          if (win.kind !== 'ocean') waterOk = false;
          for (let j = i + 1; j < sea.ports.length; j++) {
            const b = sea.ports[j];
            const d = Math.hypot(a.shore.x - b.shore.x, a.shore.y - b.shore.y);
            if (d < SEA_CFG.portMinSep * 0.999) sepOk = false;
          }
        }
        const havens = sea.ports.filter(p => p.tier === 'haven').length;
        if (havens > 1) havenOk = false;
        if (!sea.cls.haven && havens > 0) havenOk = false;
        if (sea.cls.haven && sea.ports.length > 0 && havens !== 1) havenOk = false;
      }
    }
  }
  check('A: seas fill across seeds', seas >= 8, `${seas} distinct seas sampled`);
  check('A: no sampled sea hits the fill cap', capped === 0, `${capped} capped`);
  check('A: sizes sit in the subcritical band', Math.max(...sizes) <= 60,
    `max component ${Math.max(...sizes)} cells`);
  check('A: the class ladder is monotone over size', classOk);
  check('A: port budgets hold', portOk);
  check('A: port spots keep their deliberate spacing', sepOk, `≥ ${SEA_CFG.portMinSep}u apart`);
  check('A: every land anchor is LAND', landOk);
  check('A: every shore point is WATER', waterOk);
  check('A: the haven law holds (≤1, class-gated)', havenOk);
}

// ------------------------------------------------ B. entry-invariance
{
  const fs = 0x5ea2;
  const contSeed = continentSeedFrom(fs);
  clearSeaMemo();
  let target: Sea | null = null;
  outer: for (let gy = -8; gy <= 8; gy++) {
    for (let gx = -8; gx <= 8; gx++) {
      if (cellKind(gx, gy, contSeed) !== 'ocean') continue;
      const s = seaOfCell(gx, gy, contSeed);
      if (s.cellCount >= 3) { target = s; break outer; }
    }
  }
  check('B: a multi-cell sea stands for the rig', !!target, `${target?.cellCount ?? 0} cells`);
  if (target) {
    const snap = JSON.stringify({
      id: target.id, name: target.name, cls: target.cls.id, n: target.cellCount,
      ports: target.ports.map(p => ({ id: p.id, t: p.tier, x: Math.round(p.coord.x), y: Math.round(p.coord.y) })),
    });
    let invariant = true;
    for (const k of target.cells) {
      clearSeaMemo(); // force an INDEPENDENT fill from this entry cell
      const [gx, gy] = k.split(',').map(Number);
      const s2 = seaOfCell(gx, gy, contSeed);
      const snap2 = JSON.stringify({
        id: s2.id, name: s2.name, cls: s2.cls.id, n: s2.cellCount,
        ports: s2.ports.map(p => ({ id: p.id, t: p.tier, x: Math.round(p.coord.x), y: Math.round(p.coord.y) })),
      });
      if (snap2 !== snap) { invariant = false; break; }
    }
    check('B: THE FOREORDAINED TENET — every entry cell fills the SAME sea',
      invariant, `${target.cells.size} independent fills, identical id/name/class/ports`);
  }
}

// ------------------------------------------------ C. the island lever
{
  const fs = 0x5ea3;
  const contSeed = continentSeedFrom(fs);
  clearSeaMemo();
  let checked = 0, honored = true, mulSeen = new Set<number>();
  for (let gy = -14; gy <= 14 && checked < 400; gy++) {
    for (let gx = -14; gx <= 14 && checked < 400; gx++) {
      const spot = islandAtCell(gx, gy, fs);
      // Re-derive the roll by hand: hash + coord + sea class → the exact gate.
      const span = ISLAND_FIELD.cellSpan;
      const h = hash2(gx, gy, (contSeed ^ 0x15a4d) >>> 0);
      const jit = ISLAND_FIELD.jitter;
      const coord = {
        x: (gx + 0.5 + (((h & 0xffff) / 0xffff) - 0.5) * 2 * jit) * span,
        y: (gy + 0.5 + ((((h >>> 16) & 0xffff) / 0xffff) - 0.5) * 2 * jit) * span,
      };
      if (continentAt(coord, contSeed).kind !== 'ocean') continue;
      checked++;
      const mul = islandMulAt(coord, contSeed);
      mulSeen.add(mul);
      const expect = (h / 0x100000000) < ISLAND_FIELD.chance * mul;
      if (!!spot !== expect) honored = false;
    }
  }
  check('C: the existence roll honors chance × class multiplier exactly',
    honored, `${checked} water cells re-derived`);
  check('C: multiple class multipliers exercised', mulSeen.size >= 2,
    [...mulSeen].join(','));
}

// ------------------------------------------------ D. the landing law (pure)
{
  const fs = 0x5ea2;
  clearSeaMemo();
  const sea = firstSeaWithPorts(fs);
  check('D: a ported sea stands for the rig', !!sea);
  if (sea) {
    const spot = sea.ports[0];
    const atSpot = seaSpotsNear(spot.shore, SEA_CFG.landingSlack, fs);
    check('D: a boat AT a spot resolves its landing', atSpot.some(s => s.id === spot.id));
    // March along the coast away from every spot: breakers.
    let breakers: { x: number; y: number } | null = null;
    for (const k of sea.cells) {
      const [gx, gy] = k.split(',').map(Number);
      for (let t = 0; t < 12 && !breakers; t++) {
        const pt = { x: (gx + 0.08 * t + 0.04) * 1150, y: (gy + 0.5) * 1150 };
        if (continentAt(pt, continentSeedFrom(fs)).kind !== 'ocean') continue;
        const near = seaSpotsNear(pt, SEA_CFG.landingSlack, fs);
        if (!near.length) breakers = pt;
      }
      if (breakers) break;
    }
    check('D: open coast far from every spot is BREAKERS', !!breakers,
      breakers ? `e.g. (${Math.round(breakers.x)},${Math.round(breakers.y)})` : 'no breaker water found');
  }
}

// ------------------------------------------------ E. the live world
{
  // Hunt a world whose field keeps a MULTI-PORT sea in reach — the live rig
  // must exercise lanes, the haven, and the crossing, not a pond's one jetty.
  let w = makeSimWorld('warrior', 0x5ea701);
  let sea: Sea | null = null;
  for (const ws of [0x5ea701, 0x5ea702, 0x5ea703, 0x5ea704, 0x5ea705]) {
    const cand = makeSimWorld('warrior', ws);
    clearSeaMemo();
    const s = firstSeaWithPorts(cand.sim.biomeField.fieldSeed, 2);
    if (s) { w = cand; sea = s; break; }
  }
  const fs = w.sim.biomeField.fieldSeed;
  clearSeaMemo();
  sea = sea ?? firstSeaWithPorts(fs);
  check("E: a MULTI-PORT sea stands for the live rig", !!sea && sea.ports.length >= 2,
    sea ? `${sea.ports.length} ports (${sea.cls.id})` : 'none');
  if (sea) {
    const info = w.devEnsureSea(sea.ports[0].shore);
    check('E: devEnsureSea mints the WHOLE system', !!info && info.ports.length === sea.ports.length,
      info ? `${info.name} (${info.cls}) — ${info.ports.length} ports` : 'null');
    if (info) {
      const zones = info.ports.map(p => w.zoneMap[p.id]);
      check('E: every port zone stands, VEILED, identity baked',
        zones.every(z => !!z && z.veiled && z.seaId === info.id && !!z.portTier));
      const haven = zones.find(z => z?.portTier === 'haven');
      if (haven) {
        check('E: the haven wears its name', haven.name.endsWith(' Haven'), haven.name);
        check('E: the lane law — spokes reach the haven',
          zones.filter(z => z && z.id !== haven.id).every(z => z!.searoutes?.includes(haven.id)));
      }
      if (zones.length > 1) {
        check('E: the lane law — every port is rung (≥1 route)',
          zones.every(z => (z!.searoutes?.length ?? 0) >= 1));
      }
      // ENTER a spot: unveil + the first-port beat + the sail menu's seas.
      const first = zones[0]!;
      w.loadZone(first.id);
      check('E: entering a spot unveils it', !first.veiled);
      check('E: first_port_found + seas_found stamp', (w.ledger.first_port_found ?? 0) >= 1 && (w.ledger.seas_found ?? 0) >= 1,
        `first=${w.ledger.first_port_found} seas=${w.ledger.seas_found}`);
      const menu = w.sailMenuPorts();
      check('E: the sail menu knows this WATER (same-sea harbors listed, veiled lane-known included)',
        zones.length < 2 || menu.some(p => p.sameSea),
        `${menu.length} rows`);
      // CHART A COURSE: cross to the far harbor without sailing by hand.
      if (zones.length > 1) {
        const dock = w.doodads.find(d => d.kind === 'dock');
        if (dock) { w.player.pos.x = dock.pos.x; w.player.pos.y = dock.pos.y; }
        const farId = w.chartCourse();
        check('E: chartCourse crosses to the far harbor', !!farId && w.zone.id === farId,
          `→ ${farId}`);
      }
      // WORLDSTATE: the system rides the save whole.
      const state = w.serializeWorldState();
      const w2 = makeSimWorld('warrior', 0x5ea702);
      const ok = w2.adoptWorldState(state);
      check('E: the system survives the save', ok === true
        && info.ports.every(p => !!w2.zoneMap[p.id] && w2.zoneMap[p.id].seaId === info.id));
    }
  }
}

function firstSeaWithPorts(fs: number, min = 1): Sea | null {
  const contSeed = continentSeedFrom(fs);
  for (let r = 0; r <= 12; r++) {
    for (let gy = -r; gy <= r; gy++) {
      for (let gx = -r; gx <= r; gx++) {
        if (Math.max(Math.abs(gx), Math.abs(gy)) !== r) continue;
        if (cellKind(gx, gy, contSeed) !== 'ocean') continue;
        const s = seaOfCell(gx, gy, contSeed);
        if (s.ports.length >= min) return s;
      }
    }
  }
  return null;
}

/** Local copy of the field hash (probe re-derives rolls by hand). */
function hash2(a: number, b: number, seed: number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (a | 0), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (b | 0), 0xc2b2ae35) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f) >>> 0; h ^= h >>> 15;
  return h >>> 0;
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 2 : 0);
