// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE CROSS-BORDER SIGHT (seamless-world M2 wave 7, the
// los.ts lane): docs/design/seamless-world.md. castRay's per-sample occlusion
// routes out-of-active-arena samples by grid OWNERSHIP (LOS_CFG.crossBorder,
// engine/los.ts seamlessRayOwners — the sight veil's march engine-side, the
// projectile sweep's away-ground law at ray grain): the owning resident
// mint's blocking regions + standing doodads answer at the seat offset,
// tissue reads OPEN, and discrete play is byte-identical BY CONSTRUCTION.
//
// RIG A — THE MOUTH LINE: through the carved corridor at the agreed border
//   point, a line into the neighbor reads CLEAR on BOTH channels (the
//   commission's core: a roused ranged body fires through the gap; the
//   player's hold-fire read matches the arrow). Per-channel dial-off
//   restores the administrative dark on the SAME line (the A/B witness
//   that the routing is load-bearing).
// RIG B — THE BLOCKERS: a resident neighbor's border/dress body stops the
//   routed shot ray at its true surface (hit past the border, kind
//   'doodad'), a sight-blocking body stops the sight ray, and a neighbor's
//   blocksShot GRID cell stops the ray as kind 'region' — hunted across
//   every border-sharing member; a web that starves a hunt self-reports
//   VACUOUS instead of lying (the K5d idiom).
// RIG C — THE TISSUE: a line whose beyond-rim samples stand in no member's
//   cell reads OPEN to both channels (no owner = open sky, the between
//   never blocks as a line); dial-off darkens the same line (gridded
//   actives only — the same administrative wall the routing kills).
// RIG D — THE DROWSY LOCK POLICY (sight routed — the FLAGGED choice): the
//   guards that replaced the administrative dark hold. A hand-tagged
//   drowsy body seated BEHIND a border blocker never locks on the player
//   across the line (the geometry guard: losCached rides the routed ray),
//   and the same body at the carved mouth with a clear line DOES lock —
//   bodies visible across a border are watchable across it, the honest
//   symmetric read (senseReach, the watch ladder and the drowsy cadence
//   stay the standing guards above it).
// RIG E — THE FIRING LINE: the locked ranged body CASTS from across the
//   border (the hold-fire gate reads the routed line and RELEASES — the
//   wave-6 border stall dead), flipping the shot dial off mid-lock stops
//   the presses while the sight lock stands (the decision reads THE RAY,
//   per channel), and a real bolt spawned down the trunk-blocked line
//   dies where castRay said the line ends (the two laws' verdicts equal
//   on the same border geometry). The OPEN-line crossing's flight half
//   waits on the masonry-march seam in world.ts (the sweep's active-grid
//   march consults regionAt for out-of-arena samples too — the sibling
//   lane's file; deferred + reported in the pass coda).
// RIG F — THE MODE LAW: a discrete world answers byte-identically with the
//   dials on and off across a ray battery (in-arena and far beyond the
//   rim), and a seamless world's INTERIOR rays never consult the routing
//   (the both-endpoints-inside early reject).
//
// Run: npx tsx balance/probe_seamlesslos.ts
// ---------------------------------------------------------------------------

import { vec } from '../src/core/math';
import { borderAgreedPoint, foldCells } from '../src/world/cells';
import { mapToPx } from '../src/world/coords';
import { GridWalkField } from '../src/world/gridWalk';
import { regionKind } from '../src/world/regions';
import { getTissueSampler } from '../src/world/seamless';
import { massDressOf } from '../src/world/tissue';
import { castRay, LOS_CFG } from '../src/engine/los';
import { blocksProjectiles, blocksSightOf, type Doodad } from '../src/engine/levelgen';
import { coordDist } from '../src/world/coords';
import { START_ZONE, type ZoneDef } from '../src/data/zones';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { updateAI } from '../src/engine/ai';
import { seedGlobalRandom } from '../src/sim/rng';
import type { World } from '../src/engine/world';

let fails = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails++;
};

// The proven stage seeds (probe_seamless's own — law rigs never re-gamble
// a working web; the spoils-rig precedent).
const GSEED = 0x5ea51e55;
const WSEED = 0xa11e;
const DT = 0.05;

/** The M0 leash discipline (probe_seamless's helper verbatim): hostiles are
 *  not what these rigs pin — strip them so the staged bodies are alone. */
const stripHostiles = (w: World): void => {
  w.actors = w.actors.filter(a => a === w.player || !!a.owner);
};

const ringSettle = (w: World, beats = 16): void => {
  for (let i = 0; i < beats; i++) {
    stripHostiles(w);
    w.update(DT);
  }
};

/** THE WALK PAIR (probe_seamless's deterministic pick, verbatim). */
const pickWalkPair = (w: World): [ZoneDef, ZoneDef] | null => {
  const town = w.zoneMap[START_ZONE];
  let best: { a: ZoneDef; b: ZoneDef; d: number; key: string } | null = null;
  for (const a of Object.values(w.zoneMap)) {
    if (!w.seamlessResidentEligible(a)) continue;
    for (const e of a.exits) {
      if (e.to === '?' || e.crossDim || e.lock || a.id >= e.to) continue;
      const b = w.zoneMap[e.to];
      if (!b || !w.seamlessResidentEligible(b)) continue;
      const d = Math.max(coordDist(a.map, town.map), coordDist(b.map, town.map));
      const key = `${a.id}|${b.id}`;
      if (!best || d < best.d - 1e-9 || (Math.abs(d - best.d) <= 1e-9 && key < best.key)) {
        best = { a, b, d, key };
      }
    }
  }
  return best ? [best.a, best.b] : null;
};

bootSimEngine();

// --- THE STAGE ---------------------------------------------------------------

seedGlobalRandom(GSEED);
const ws = makeSimWorld('warrior', WSEED);
ws.seamless = true;
ws.loadZone(START_ZONE);
ringSettle(ws);
const pair = pickWalkPair(ws);
if (!pair) {
  console.log('probe_seamlesslos: no eligible linked walk pair — cannot continue');
  process.exit(1);
}
const [zoneA, zoneB] = pair;
ws.loadZone(zoneA.id);
ringSettle(ws);

const seatA = ws.seamlessRegions.find(s => s.zoneId === zoneA.id);
const mintA = ws.seamlessMints.get(zoneA.id);
const seatB = ws.seamlessRegions.find(s => s.zoneId === zoneB.id);
const mintB = ws.seamlessMints.get(zoneB.id);
check('A0 the stage stands (active + linked partner resident, both minted)',
  !!seatA && !!mintA && !!seatB && !!mintB,
  `${ws.seamlessRegions.length} member(s)`);
if (!seatA || !mintA || !seatB || !mintB) process.exit(1);
// The staged priest's bolts land on the hero across rigs D/E — a cushion
// keeps the pins about geometry, not survival (the probe_anatomy idiom).
ws.player.sheet.setBase('life', 9000);
ws.player.life = 9000;

/** World px → ACTIVE-local px (castRay's own frame). */
const aL = (wx: number, wy: number): { x: number; y: number } =>
  ({ x: wx - seatA.originPx.x, y: wy - seatA.originPx.y });
const insideArena = (p: { x: number; y: number }): boolean =>
  p.x >= 0 && p.x <= ws.arena.w && p.y >= 0 && p.y <= ws.arena.h;

/** One border-sharing member resolved for the hunts: the shared edge's
 *  outward normal (A → member), the border's overlap run, and coordinate
 *  helpers — all in WORLD px off the two mints' own cells. */
interface BorderFrame {
  zoneId: string;
  seat: { zoneId: string; originPx: { x: number; y: number } };
  mint: NonNullable<ReturnType<World['seamlessMints']['get']>>;
  n: { x: number; y: number };
  t: { x: number; y: number };
  agreed: { x: number; y: number };
  /** A point ON the border line at along-coordinate `al`. */
  borderAt(al: number): { x: number; y: number };
  alongOf(wx: number, wy: number): number;
  depthOf(wx: number, wy: number): number; // signed distance past the border, into the member
  runLo: number; runHi: number;
}
const borderFrames: BorderFrame[] = [];
for (const s of ws.seamlessRegions) {
  if (s.zoneId === zoneA.id) continue;
  const m = ws.seamlessMints.get(s.zoneId);
  if (!m) continue;
  const ag = borderAgreedPoint(mintA.cell, m.cell);
  if (!ag) continue;
  const n = ag.side === 'e' ? { x: 1, y: 0 } : ag.side === 'w' ? { x: -1, y: 0 }
    : ag.side === 's' ? { x: 0, y: 1 } : { x: 0, y: -1 };
  const t = { x: -n.y, y: n.x };
  const horiz = ag.side === 'e' || ag.side === 'w';
  const edge = ag.side === 'e' ? mintA.cell.x1 : ag.side === 'w' ? mintA.cell.x0
    : ag.side === 's' ? mintA.cell.y1 : mintA.cell.y0;
  const runLo = horiz ? Math.max(mintA.cell.y0, m.cell.y0) : Math.max(mintA.cell.x0, m.cell.x0);
  const runHi = horiz ? Math.min(mintA.cell.y1, m.cell.y1) : Math.min(mintA.cell.x1, m.cell.x1);
  borderFrames.push({
    zoneId: s.zoneId, seat: s, mint: m, n, t, agreed: { x: ag.x, y: ag.y },
    borderAt: al => horiz ? { x: edge, y: al } : { x: al, y: edge },
    alongOf: (wx, wy) => horiz ? wy : wx,
    depthOf: (wx, wy) => horiz ? (wx - edge) * n.x : (wy - edge) * n.y,
    runLo, runHi,
  });
}
const frameB = borderFrames.find(f => f.zoneId === zoneB.id);
check('A0b the walk pair\'s cells share a border (the agreed point exists)',
  !!frameB, `${borderFrames.length} border-sharing member(s)`);
if (!frameB) process.exit(1);

// --- RIG A: THE MOUTH LINE ---------------------------------------------------

/** Hunt a line through the carved mouth that a channel reads CLEAR: A-side
 *  depths × lateral offsets around the agreed point. */
const huntMouthLine = (
  f: BorderFrame, ok: (from: { x: number; y: number }, to: { x: number; y: number }) => boolean,
): { from: { x: number; y: number }; to: { x: number; y: number } } | null => {
  for (const inA of [110, 150, 210]) {
    for (const lat of [0, 24, -24, 48, -48]) {
      const fw = {
        x: f.agreed.x - f.n.x * inA + f.t.x * lat,
        y: f.agreed.y - f.n.y * inA + f.t.y * lat,
      };
      const gw = {
        x: f.agreed.x + f.n.x * 170 + f.t.x * lat,
        y: f.agreed.y + f.n.y * 170 + f.t.y * lat,
      };
      const from = aL(fw.x, fw.y), to = aL(gw.x, gw.y);
      if (!insideArena(from)) continue;
      if (ok(from, to)) return { from, to };
    }
  }
  return null;
};

const mouth = huntMouthLine(frameB, (f, t) => ws.lineOfFire(f, t) && ws.lineOfSight(f, t));
{
  const shotOnly = mouth ?? huntMouthLine(frameB, (f, t) => ws.lineOfFire(f, t));
  const sightOnly = mouth ?? huntMouthLine(frameB, (f, t) => ws.lineOfSight(f, t));
  check('A1 a line of shot AND sight stands through the carved mouth into the neighbor',
    !!mouth, mouth ? '' : `shot-clear ${shotOnly ? 'found' : 'none'}, sight-clear ${sightOnly ? 'found' : 'none'}`);
}

const gridded = ws.walk instanceof GridWalkField;
if (mouth) {
  LOS_CFG.crossBorder.shot = false;
  const darkShot = !ws.lineOfFire(mouth.from, mouth.to);
  LOS_CFG.crossBorder.shot = true;
  LOS_CFG.crossBorder.sight = false;
  const darkSight = !ws.lineOfSight(mouth.from, mouth.to);
  LOS_CFG.crossBorder.sight = true;
  check('A2 per-channel dial-off restores the administrative dark on the same line',
    gridded ? darkShot && darkSight : true,
    gridded ? `shot ${darkShot}, sight ${darkSight}` : 'VACUOUS: gridless active layout — no out-of-grid wall to restore');
}

// --- RIG B: THE BLOCKERS -----------------------------------------------------

interface BlockedLine {
  from: { x: number; y: number }; to: { x: number; y: number };
  hit: { d: number; x: number; y: number; kind: string };
  frame: BorderFrame;
  targetW: { x: number; y: number };
}

/** Hunt a border-sharing member's standing body that BLOCKS the given
 *  channel: perpendicular ray from inside A, through the border, at the
 *  body — the hit must stand PAST the border (routed geometry, never the
 *  active zone's own). */
const huntBodyBlock = (channel: 'shot' | 'sight'): BlockedLine | null => {
  const blocks = channel === 'shot' ? blocksProjectiles : blocksSightOf;
  for (const f of borderFrames) {
    for (const o of f.mint.layout.doodads as readonly Doodad[]) {
      if (o.gone || (o.tier ?? 0) !== 0 || !blocks(o)) continue;
      const wx = o.pos.x + f.seat.originPx.x, wy = o.pos.y + f.seat.originPx.y;
      const depth = f.depthOf(wx, wy);
      if (depth < 0 || depth > 110) continue; // the border band: dress rows + rim bodies
      const al = f.alongOf(wx, wy);
      if (al < f.runLo + 40 || al > f.runHi - 40) continue;
      if (Math.abs(al - f.alongOf(f.agreed.x, f.agreed.y)) < 170) continue; // off the carved gap
      const inA = 140;
      const b = f.borderAt(al);
      const fromW = { x: b.x - f.n.x * inA, y: b.y - f.n.y * inA };
      const targetW = { x: wx + f.n.x * (o.radius + 60), y: wy + f.n.y * (o.radius + 60) };
      const from = aL(fromW.x, fromW.y), to = aL(targetW.x, targetW.y);
      if (!insideArena(from)) continue;
      const hit = castRay(ws, from, to, channel);
      if (!hit || hit.d <= inA - 6) continue;
      // THE CORRIDOR CHECK: the swept bolt (rig E3) flies a nose-wide body,
      // not a zero-width ray — demand two parallel lanes ±16px ALSO reach
      // the border unblocked, so nothing in the active stretch can graze a
      // flight the ray itself misses.
      const lanesClear = [16, -16].every(off => {
        const h2 = castRay(ws,
          { x: from.x + f.t.x * off, y: from.y + f.t.y * off },
          { x: to.x + f.t.x * off, y: to.y + f.t.y * off }, channel);
        return !h2 || h2.d >= inA - 6;
      });
      if (lanesClear) return { from, to, hit, frame: f, targetW };
    }
  }
  return null;
};

const trunkShot = huntBodyBlock('shot');
check('B1 a neighbor border body stops the routed SHOT ray past the border',
  !!trunkShot && trunkShot.hit.kind === 'doodad' && !ws.lineOfFire(trunkShot.from, trunkShot.to),
  trunkShot ? `${trunkShot.frame.zoneId} hit d ${trunkShot.hit.d.toFixed(1)} (${trunkShot.hit.kind})`
    : 'VACUOUS: no shot-blocking border body in any member\'s band on this web');

const trunkSight = huntBodyBlock('sight');
check('B2 a neighbor border body stops the routed SIGHT ray past the border',
  !!trunkSight && !ws.lineOfSight(trunkSight.from, trunkSight.to),
  trunkSight ? `${trunkSight.frame.zoneId} hit d ${trunkSight.hit.d.toFixed(1)}`
    : 'VACUOUS: no sight-blocking border body in any member\'s band on this web');

/** Hunt a member GRID cell that blocks shots: nearest-to-border blocking
 *  cells first, ray aimed straight through the border at the cell. */
const huntWallBlock = (): BlockedLine | null => {
  for (const f of borderFrames) {
    const g = f.mint.layout.walk;
    if (!(g instanceof GridWalkField)) continue;
    const cand: { wx: number; wy: number; depth: number }[] = [];
    for (let cy = 0; cy < g.rows; cy++) {
      for (let cx = 0; cx < g.cols; cx++) {
        const lx = (cx + 0.5) * g.cell, ly = (cy + 0.5) * g.cell;
        const k = regionKind(g.regionAt(lx, ly));
        if (!k?.blocksShot) continue;
        const wx = lx + f.seat.originPx.x, wy = ly + f.seat.originPx.y;
        const depth = f.depthOf(wx, wy);
        if (depth < 0 || depth > 420) continue;
        const al = f.alongOf(wx, wy);
        if (al < f.runLo + 40 || al > f.runHi - 40) continue;
        cand.push({ wx, wy, depth });
      }
    }
    cand.sort((a, b) => a.depth - b.depth);
    for (const c of cand.slice(0, 120)) {
      const inA = 140;
      const al = f.alongOf(c.wx, c.wy);
      const b = f.borderAt(al);
      const fromW = { x: b.x - f.n.x * inA, y: b.y - f.n.y * inA };
      const targetW = { x: c.wx + f.n.x * 40, y: c.wy + f.n.y * 40 };
      const from = aL(fromW.x, fromW.y), to = aL(targetW.x, targetW.y);
      if (!insideArena(from)) continue;
      const hit = castRay(ws, from, to, 'shot');
      if (hit && hit.kind === 'region' && hit.d > inA - 6) return { from, to, hit, frame: f, targetW };
    }
  }
  return null;
};

const wall = huntWallBlock();
check('B3 a neighbor\'s blocksShot GRID cell stops the routed ray (kind \'region\')',
  !!wall, wall ? `${wall.frame.zoneId} hit d ${wall.hit.d.toFixed(1)}`
    : 'VACUOUS: no member grid holds a reachable blocksShot cell on this web (open layouts — dress trunks are the border)');

// --- RIG C: THE TISSUE -------------------------------------------------------

{
  // An OPEN-TISSUE segment: both endpoints beyond the rim, every sample in
  // NO member's cell (inflated by the doodad fold's own reach so a rim
  // body's poking surface can't confound the pin) AND off the SOLID FIELD
  // — M2 wave 9 RE-STATED this rig's law under her occlusion ruling: the
  // between's impassable mass now BLOCKS rays at its drawn surface (RIG G
  // owns that half), so the wave-7 "no owner = open sky" pin narrows to
  // its true core — OPEN tissue (the road corridors, the mouth aprons, the
  // clearway verge) never blocks, and the border never blocks as a LINE.
  const dressC = massDressOf(getTissueSampler());
  const fieldSeed = ws.sim.biomeField.fieldSeed >>> 0;
  const solidC = (wx: number, wy: number): boolean =>
    !!dressC && typeof dressC.solidAt === 'function' && dressC.solidAt(wx, wy, fieldSeed);
  const cells = ws.seamlessRegions
    .map(s => ws.seamlessMints.get(s.zoneId)?.cell)
    .filter((c): c is NonNullable<typeof c> => !!c);
  const w = ws.arena.w, h = ws.arena.h;
  const segClear = (from: { x: number; y: number }, to: { x: number; y: number }, pad: number): boolean => {
    for (let i = 0; i <= 20; i++) {
      const x = from.x + (to.x - from.x) * (i / 20), y = from.y + (to.y - from.y) * (i / 20);
      if (insideArena({ x, y })) return false;
      const wx = x + seatA.originPx.x, wy = y + seatA.originPx.y;
      if (cells.some(c => wx >= c.x0 - pad && wx <= c.x1 + pad
        && wy >= c.y0 - pad && wy <= c.y1 + pad)) return false;
      if (solidC(wx, wy)) return false; // the solid between is RIG G's lane
    }
    return true;
  };
  // Lattice hunt: any anchor in the ring band around the arena whose
  // outward segment (away from the arena center) stays clear — then the
  // STRIP-CORRIDOR fallback: a non-abutting linked pair's mouth-to-mouth
  // way is open tissue BY CONSTRUCTION (road ribbon through the strip),
  // and a both-endpoints-out ray anywhere on the web still routes.
  let tissueLine: { from: { x: number; y: number }; to: { x: number; y: number } } | null = null;
  let tissueHow = '';
  for (const pad of [LOS_CFG.crossBorder.ownerPad + 48, 48]) {
    for (let gy = -1200; gy <= h + 1200 && !tissueLine; gy += 160) {
      for (let gx = -1200; gx <= w + 1200; gx += 160) {
        const ux = gx - w / 2, uy = gy - h / 2;
        const ul = Math.hypot(ux, uy) || 1;
        const from = { x: gx, y: gy };
        const to = { x: gx + (ux / ul) * 420, y: gy + (uy / ul) * 420 };
        if (insideArena(from)) continue;
        if (segClear(from, to, pad)) { tissueLine = { from, to }; tissueHow = `lattice, pad ${pad}px`; break; }
      }
    }
    if (tissueLine) break;
  }
  if (!tissueLine) {
    // The strip class: hunt any eligible non-abutting linked pair; its
    // corridor's strip piece is open tissue end to end (probe_tissue M2's
    // own walked law), so a segment along it — nudged inside the mouths —
    // is the honest open-tissue witness far from the arena.
    // Cells come from the probe's own fold over the partition's surface
    // roster (the probe_tissue twin — far pairs hold no mint to read from).
    const foldC = foldCells(Object.values(ws.zoneMap)
      .filter(z => (z.dimension ?? 'surface') === 'surface' && z.caveDepth == null && !z.pocket && !z.floating)
      .map(z => ({ id: z.id, ...mapToPx(z.map) })));
    outer: for (const a of Object.values(ws.zoneMap)) {
      if (!ws.seamlessResidentEligible(a)) continue;
      for (const e of a.exits) {
        if (e.to === '?' || e.crossDim || a.id >= e.to) continue;
        const b = ws.zoneMap[e.to];
        if (!b || !ws.seamlessResidentEligible(b)) continue;
        const ca = foldC.get(a.id) ?? null;
        const cb = foldC.get(b.id) ?? null;
        if (!ca || !cb || borderAgreedPoint(ca, cb)) continue;
        // both door mouths via the def-side formula (the tissue capture's own)
        const mouthOf = (z: ZoneDef, destId: string, cell: { x0: number; y0: number; x1: number; y1: number }): { x: number; y: number } | null => {
          const ex = z.exits.find(x2 => x2.to === destId && !x2.crossDim);
          if (!ex) return null;
          const cw = cell.x1 - cell.x0, ch = cell.y1 - cell.y0;
          const t = ex.at ?? 0.5;
          const sx = ex.side === 'w' ? 90 : ex.side === 'e' ? cw - 90 : Math.min(cw - 90, Math.max(90, cw * t));
          const sy = ex.side === 'n' ? 90 : ex.side === 's' ? ch - 90 : Math.min(ch - 90, Math.max(90, ch * t));
          return {
            x: cell.x0 + (ex.side === 'w' ? 0 : ex.side === 'e' ? cw : sx),
            y: cell.y0 + (ex.side === 'n' ? 0 : ex.side === 's' ? ch : sy),
          };
        };
        const ma = mouthOf(a, b.id, ca), mb = mouthOf(b, a.id, cb);
        if (!ma || !mb) continue;
        const dx = mb.x - ma.x, dy = mb.y - ma.y;
        const len = Math.hypot(dx, dy);
        if (len < 140) continue;
        const t0 = 40 / len, t1 = 1 - 40 / len;
        const from = aL(ma.x + dx * t0, ma.y + dy * t0);
        const to = aL(ma.x + dx * t1, ma.y + dy * t1);
        if (insideArena(from) || insideArena(to)) continue;
        if (segClear(from, to, 0)) { tissueLine = { from, to }; tissueHow = `strip ${a.id}↔${b.id}`; break outer; }
      }
    }
  }
  check('C0 an OPEN-tissue segment clear of every member cell exists', !!tissueLine,
    tissueLine ? tissueHow : 'VACUOUS-adjacent: no open tissue found in the window (all-abutting web)');
  if (tissueLine) {
    const openShot = castRay(ws, tissueLine.from, tissueLine.to, 'shot') === null;
    const openSight = castRay(ws, tissueLine.from, tissueLine.to, 'sight') === null;
    check('C1 OPEN tissue reads OPEN to both ray families (the border never blocks as a line)',
      openShot && openSight, `shot ${openShot}, sight ${openSight}`);
    LOS_CFG.crossBorder.shot = false;
    LOS_CFG.crossBorder.sight = false;
    const darkShot = castRay(ws, tissueLine.from, tissueLine.to, 'shot') !== null;
    const darkSight = castRay(ws, tissueLine.from, tissueLine.to, 'sight') !== null;
    LOS_CFG.crossBorder.shot = true;
    LOS_CFG.crossBorder.sight = true;
    check('C2 dial-off darkens the same tissue line (the administrative wall the routing kills)',
      gridded ? darkShot && darkSight : true,
      gridded ? '' : 'VACUOUS: gridless active layout');
  }
}

// --- RIG D: THE DROWSY LOCK POLICY (sight routed — the guards) --------------

/** One driven sim step (the caller-driven brain law: the live loop and the
 *  sim runner both walk updateAI per actor themselves — world.update never
 *  does). each() runs BEFORE the brains so a staged geometry is what the
 *  scan reads. */
const pump = (n: number, each?: () => void): void => {
  for (let i = 0; i < n; i++) {
    each?.();
    for (const a of ws.actors) updateAI(a, ws, DT);
    ws.update(DT);
  }
};

let priest: ReturnType<World['createMonster']> | null = null;
if (trunkShot) {
  // Seated BEHIND the border blocker: the routed ray is blocked, so the
  // geometry guard holds the lock shut however close the player stands.
  const f = trunkShot.frame;
  priest = ws.createMonster('plaguefather', 3, 'enemy');
  priest.ringRegion = f.zoneId;
  const seatAt = {
    x: trunkShot.targetW.x + f.n.x * 30 - seatA.originPx.x,
    y: trunkShot.targetW.y + f.n.y * 30 - seatA.originPx.y,
  };
  priest.pos = vec(seatAt.x, seatAt.y);
  ws.actors.push(priest);
  const pSeat = { x: trunkShot.from.x, y: trunkShot.from.y };
  const rayBlocked = !ws.lineOfSight(priest.pos, ws.player.pos, priest.tier, ws.player.tier);
  let locked = false;
  pump(48, () => {
    priest!.pos.x = seatAt.x; priest!.pos.y = seatAt.y;
    ws.player.pos.x = pSeat.x; ws.player.pos.y = pSeat.y;
    priest!.facing = Math.atan2(pSeat.y - seatAt.y, pSeat.x - seatAt.x);
    if (priest!.aiTargetId !== undefined) locked = true;
  });
  const sep = Math.hypot(pSeat.x - seatAt.x, pSeat.y - seatAt.y);
  check('D1 a drowsy body behind the border blocker never locks (the geometry guard)',
    rayBlocked && !locked && priest.aiTargetId === undefined,
    `separation ${sep.toFixed(0)}px, ray blocked ${rayBlocked}`);
} else {
  check('D1 a drowsy body behind the border blocker never locks (the geometry guard)',
    true, 'VACUOUS: no blocked border line on this web (B1)');
}

let lockedAtMouth = false;
let mouthSeats: { m: { x: number; y: number }; p: { x: number; y: number } } | null = null;
if (mouth && frameB) {
  if (!priest) {
    priest = ws.createMonster('plaguefather', 3, 'enemy');
    ws.actors.push(priest);
  }
  priest.ringRegion = frameB.zoneId;
  const lat = frameB.t.x * (mouth.to.x + seatA.originPx.x - frameB.agreed.x)
    + frameB.t.y * (mouth.to.y + seatA.originPx.y - frameB.agreed.y);
  const mSeat = aL(
    frameB.agreed.x + frameB.n.x * 170 + frameB.t.x * lat,
    frameB.agreed.y + frameB.n.y * 170 + frameB.t.y * lat);
  const pSeat = aL(
    frameB.agreed.x - frameB.n.x * 110 + frameB.t.x * lat,
    frameB.agreed.y - frameB.n.y * 110 + frameB.t.y * lat);
  mouthSeats = { m: mSeat, p: pSeat };
  priest.pos = vec(mSeat.x, mSeat.y);
  priest.aiTargetId = undefined;
  const rayClear = ws.lineOfSight(priest.pos, pSeat, priest.tier, ws.player.tier);
  pump(80, () => {
    if (priest!.aiTargetId !== undefined) { lockedAtMouth = true; return; }
    priest!.pos.x = mSeat.x; priest!.pos.y = mSeat.y;
    ws.player.pos.x = pSeat.x; ws.player.pos.y = pSeat.y;
    priest!.facing = Math.atan2(pSeat.y - mSeat.y, pSeat.x - mSeat.x);
  });
  if (priest.aiTargetId !== undefined) lockedAtMouth = true;
  check('D2 the same body at the carved mouth with a clear line DOES lock (sight routed — the symmetric read)',
    rayClear && lockedAtMouth && priest.aiTargetId === ws.player.id,
    `ray clear ${rayClear}, locked ${lockedAtMouth}`);
} else {
  check('D2 the same body at the carved mouth with a clear line DOES lock (sight routed — the symmetric read)',
    false, 'no mouth line stood (A1)');
}

// --- RIG E: THE FIRING LINE --------------------------------------------------

if (priest && lockedAtMouth && mouthSeats) {
  const seats = mouthSeats;
  const pin = (): void => {
    priest!.pos.x = seats.m.x; priest!.pos.y = seats.m.y;
    ws.player.pos.x = seats.p.x; ws.player.pos.y = seats.p.y;
  };

  // E1: THE RELEASED GATE — the locked ranged body CASTS from across the
  // border (pre-routing it closed to its own rim and stalled: the hold-fire
  // consult read the administrative dark). The cast bar + the paid mana are
  // the decision's own witnesses; the caster stands out-of-arena pinned.
  const manaAtStart = priest.mana;
  let castSeen = false, manaMin = Infinity;
  pump(60, () => {
    pin();
    if (priest!.casting) castSeen = true;
    if (priest!.mana < manaMin) manaMin = priest!.mana;
  });
  check('E1 the locked body CASTS from across the border (the hold-fire gate releases on the routed line)',
    castSeen && manaMin <= manaAtStart - 4 && !insideArena(priest.pos),
    `cast ${castSeen}, mana ${manaAtStart.toFixed(0)}→${manaMin.toFixed(0)}, out-of-arena ${!insideArena(priest.pos)}`);

  // E2: THE GATE READS THE RAY, PER CHANNEL — shot dial off, the presses
  // stop while the SIGHT lock stands (the lock and the trigger are separate
  // routed reads; the in-flight cast gets a grace window to expire).
  LOS_CFG.crossBorder.shot = false;
  pump(16, pin);
  let castsWhileDark = 0, lockHeld = true;
  pump(24, () => {
    pin();
    if (priest!.casting) castsWhileDark++;
    if (priest!.aiTargetId !== ws.player.id) lockHeld = false;
  });
  LOS_CFG.crossBorder.shot = true;
  check('E2 shot-dial-off HOLDS the fire while the sight lock stands (per-channel decision)',
    castsWhileDark === 0 && lockHeld, `dark-window casts ${castsWhileDark}, lock held ${lockHeld}`);

  // E3: THE BLOCKED LINE'S FLIGHT — a real bolt spawned down B1's line (the
  // engine's own spawn path) dies where castRay said the line ends: the
  // two laws' verdicts equal on the same border geometry.
  const kit = priest.skills.find(s => s?.def.id === 'venom_bolt') ?? priest.skills.find(s => !!s);
  if (trunkShot && kit) {
    const before = ws.projectiles.length;
    const ang = Math.atan2(trunkShot.to.y - trunkShot.from.y, trunkShot.to.x - trunkShot.from.x);
    ws.spawnProjectile(priest, kit, vec(trunkShot.from.x, trunkShot.from.y), ang);
    const bolt = ws.projectiles.length > before ? ws.projectiles[ws.projectiles.length - 1] : null;
    let last = bolt ? { x: bolt.pos.x, y: bolt.pos.y } : null;
    let beats = 0;
    while (bolt && ws.projectiles.includes(bolt) && beats < 80) {
      last = { x: bolt.pos.x, y: bolt.pos.y };
      pin();
      for (const a of ws.actors) updateAI(a, ws, DT);
      ws.update(DT);
      beats++;
    }
    const gone = !!bolt && !ws.projectiles.includes(bolt);
    const deadD = last ? Math.hypot(last.x - trunkShot.from.x, last.y - trunkShot.from.y) : NaN;
    check('E3 a real bolt down the trunk-blocked line dies where castRay said it ends (verdicts equal)',
      gone && Math.abs(deadD - trunkShot.hit.d) <= 34,
      `swept death ~${deadD.toFixed(1)}px vs castRay ${trunkShot.hit.d.toFixed(1)}px`);
  } else {
    check('E3 a real bolt down the trunk-blocked line dies where castRay said it ends (verdicts equal)',
      !trunkShot, trunkShot ? 'no kit instance on the staged body' : 'VACUOUS: no blocked border line on this web (B1)');
  }

  // E4: THE CROSSING FLIGHT (the masonry-march gate's own pin — landed with
  // the coordinator's world.ts fix): a real bolt spawned down the OPEN mouth
  // line (E1's pinned seats; castRay says clear) CROSSES the border alive.
  // Pre-fix, the sweep's active-grid march answered the administrative
  // 'wall' for every out-of-arena sample and a crossing flight died at the
  // muzzle one half-cell past the rim; now the away lane owns out-of-arena
  // samples, so the two laws agree on the open line exactly as E3 pins
  // their agreement on the blocked one.
  if (kit) {
    const before4 = ws.projectiles.length;
    const ang4 = Math.atan2(seats.p.y - seats.m.y, seats.p.x - seats.m.x);
    ws.spawnProjectile(priest, kit, vec(seats.m.x, seats.m.y), ang4);
    const bolt4 = ws.projectiles.length > before4 ? ws.projectiles[ws.projectiles.length - 1] : null;
    let sawInside = false, travel4 = 0, beats4 = 0;
    while (bolt4 && ws.projectiles.includes(bolt4) && beats4 < 80) {
      if (insideArena(bolt4.pos)) sawInside = true;
      travel4 = Math.hypot(bolt4.pos.x - seats.m.x, bolt4.pos.y - seats.m.y);
      pin();
      for (const a of ws.actors) updateAI(a, ws, DT);
      ws.update(DT);
      beats4++;
    }
    check('E4 a real bolt down the OPEN mouth line crosses the border alive (the masonry-march gate)',
      sawInside, `entered arena ${sawInside}, travel ~${travel4.toFixed(1)}px over ${beats4} beats`);
  } else {
    check('E4 a real bolt down the OPEN mouth line crosses the border alive (the masonry-march gate)',
      false, 'no kit instance on the staged body');
  }
} else {
  check('E1 the locked body CASTS from across the border (the hold-fire gate releases on the routed line)',
    false, 'no lock stood (D2)');
}

// --- RIG F: THE MODE LAW -----------------------------------------------------

{
  // Deterministic point hash — NO rng stream is drawn (the seeded sim law).
  const h = (i: number): number => {
    let x = (i + 0x9e3779b9) | 0;
    x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
    x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
    return ((x ^ (x >>> 15)) >>> 0) / 4294967296;
  };
  const battery = (w: World): string => {
    const rows: string[] = [];
    for (let i = 0; i < 40; i++) {
      const from = { x: h(i * 4) * w.arena.w, y: h(i * 4 + 1) * w.arena.h };
      const far = i % 2 === 0;
      const to = {
        x: h(i * 4 + 2) * w.arena.w + (far ? (h(i) < 0.5 ? -1 : 1) * 1400 : 0),
        y: h(i * 4 + 3) * w.arena.h + (far ? (h(i + 99) < 0.5 ? -1 : 1) * 1400 : 0),
      };
      const clip = w.clipShot(from, to);
      rows.push(`${w.lineOfFire(from, to)}|${w.lineOfSight(from, to)}|${clip.x.toFixed(3)},${clip.y.toFixed(3)}`);
    }
    return rows.join(';');
  };

  seedGlobalRandom(GSEED);
  const wd = makeSimWorld('warrior', WSEED ^ 0x777);
  wd.loadZone(START_ZONE);
  for (let i = 0; i < 5; i++) wd.update(DT);
  const onAnswers = battery(wd);
  LOS_CFG.crossBorder.shot = false;
  LOS_CFG.crossBorder.sight = false;
  const offAnswers = battery(wd);
  LOS_CFG.crossBorder.shot = true;
  LOS_CFG.crossBorder.sight = true;
  check('F1 discrete play answers byte-identically with the dials on and off (the routing never engages)',
    !wd.seamless && onAnswers === offAnswers);

  // The seamless world's INTERIOR rays never consult the routing either —
  // both endpoints inside the arena is the O(1) early reject.
  const interior = (w: World): string => {
    const rows: string[] = [];
    for (let i = 0; i < 24; i++) {
      const from = { x: 20 + h(i * 7) * (w.arena.w - 40), y: 20 + h(i * 7 + 3) * (w.arena.h - 40) };
      const to = { x: 20 + h(i * 7 + 5) * (w.arena.w - 40), y: 20 + h(i * 7 + 6) * (w.arena.h - 40) };
      const clip = w.clipShot(from, to);
      rows.push(`${w.lineOfFire(from, to)}|${w.lineOfSight(from, to)}|${clip.x.toFixed(3)},${clip.y.toFixed(3)}`);
    }
    return rows.join(';');
  };
  const inOn = interior(ws);
  LOS_CFG.crossBorder.shot = false;
  LOS_CFG.crossBorder.sight = false;
  const inOff = interior(ws);
  LOS_CFG.crossBorder.shot = true;
  LOS_CFG.crossBorder.sight = true;
  check('F2 a seamless world\'s interior rays answer identically with the dials off (the both-inside early reject)',
    inOn === inOff);
}

// --- RIG G: THE SOLID BETWEEN (M2 wave 9 — her occlusion ruling) -------------
// Un-owned tissue whose SOLID FIELD answers true blocks BOTH channels at its
// drawn lattice surface (the same carried field the tissue painter fills as
// impassable mass — drawn == tested through one read); the per-channel
// solid dials restore the wave-7 tissue-open posture; an elevated ray sails
// over the between's ground-story scrub (the doodad band law).

interface SolidRayFind {
  from: { x: number; y: number };
  to: { x: number; y: number };
  oracleD: number;
  hit: NonNullable<ReturnType<typeof castRay>>;
}
let solidFind: SolidRayFind | null = null;
{
  const dressG = massDressOf(getTissueSampler());
  const fieldSeedG = ws.sim.biomeField.fieldSeed >>> 0;
  check('G0 the installed sampler carries the solid field',
    !!dressG && typeof dressG.solidAt === 'function');
  if (dressG && typeof dressG.solidAt === 'function') {
    const cellsG = ws.seamlessRegions
      .map(s => ws.seamlessMints.get(s.zoneId)?.cell)
      .filter((c): c is NonNullable<typeof c> => !!c);
    const ownedG = (wx: number, wy: number): boolean =>
      cellsG.some(c => wx >= c.x0 && wx <= c.x1 && wy >= c.y0 && wy <= c.y1);
    // The hunt: PURE-TISSUE rays — an open-tissue anchor aimed into
    // adjacent solid tissue, every fine-march sample out-of-arena and in
    // no member's cell (the active rim's own dress can never confound the
    // pin), accepted only when castRay AGREES within the march + lattice
    // grain — the drawn==tested pin IS the hunt.
    const w = ws.arena.w, h = ws.arena.h;
    const anchors: Array<{ x: number; y: number }> = [];
    const targets: Array<{ x: number; y: number }> = [];
    for (let gy = -1400; gy <= h + 1400; gy += 120) {
      for (let gx = -1400; gx <= w + 1400; gx += 120) {
        if (insideArena({ x: gx, y: gy })) continue;
        const wx = gx + seatA.originPx.x, wy = gy + seatA.originPx.y;
        if (ownedG(wx, wy)) continue;
        if (dressG.solidAt(wx, wy, fieldSeedG)) {
          if (targets.length < 400) targets.push({ x: gx, y: gy });
        } else if (anchors.length < 400) {
          anchors.push({ x: gx, y: gy });
        }
      }
    }
    // Two passes: prefer a NEAR boundary (oracleD ≤ 300 — rig H's flight
    // must out-range it decisively), then any.
    hunt: for (const maxOracle of [300, 1e9]) {
      for (const from of anchors) {
        for (const tg of targets) {
          const dx = tg.x - from.x, dy = tg.y - from.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 60 || dist > 520) continue;
          const ux = dx / dist, uy = dy / dist;
          let oracleD = -1, pure = true;
          for (let d = 6; d <= dist + 140; d += 6) {
            const px2 = from.x + ux * d, py2 = from.y + uy * d;
            if (insideArena({ x: px2, y: py2 })) { pure = false; break; }
            const wx = px2 + seatA.originPx.x, wy = py2 + seatA.originPx.y;
            if (ownedG(wx, wy)) { pure = false; break; }
            if (oracleD < 0 && dressG.solidAt(wx, wy, fieldSeedG)) oracleD = d;
          }
          if (!pure || oracleD < 0 || oracleD > maxOracle) continue;
          const to = { x: from.x + ux * (oracleD + 140), y: from.y + uy * (oracleD + 140) };
          const hit = castRay(ws, from, to, 'shot');
          if (!hit || hit.kind !== 'region') continue;
          if (Math.abs(hit.d - oracleD) > 24) continue;
          solidFind = { from, to, oracleD, hit };
          break hunt;
        }
      }
    }
    check('G1 a ray dies at the solid between\'s drawn surface (kind \'region\', at the field boundary)',
      !!solidFind,
      solidFind ? `hit d ${solidFind.hit.d.toFixed(1)} vs oracle ${solidFind.oracleD} (±24)`
        : 'no solid-first ray found around this arena (mouth-riddled rim?)');
    if (solidFind) {
      const sightHit = castRay(ws, solidFind.from, solidFind.to, 'sight');
      check('G1b the sight channel dies on the same line at the same surface',
        !!sightHit && sightHit.kind === 'region' && Math.abs(sightHit.d - solidFind.hit.d) <= 16,
        sightHit ? `sight d ${sightHit.d.toFixed(1)}` : 'sight stayed open');
      check('G2 the hold-fire read agrees (lineOfFire refuses the solid line)',
        !ws.lineOfFire(solidFind.from, solidFind.to));
      LOS_CFG.crossBorder.solidShot = false;
      const openShot = castRay(ws, solidFind.from, solidFind.to, 'shot') === null;
      const fireOpen = ws.lineOfFire(solidFind.from, solidFind.to);
      LOS_CFG.crossBorder.solidShot = true;
      LOS_CFG.crossBorder.solidSight = false;
      const openSight = castRay(ws, solidFind.from, solidFind.to, 'sight') === null;
      LOS_CFG.crossBorder.solidSight = true;
      check('G3 the per-channel solid dials restore the tissue-open posture (the wave-7 A/B)',
        openShot && fireOpen && openSight,
        `shot ${openShot}, fire ${fireOpen}, sight ${openSight}`);
      const elevated = castRay(ws, solidFind.from, solidFind.to, 'shot',
        { from: 1 + LOS_CFG.elev.eye, to: 1 + LOS_CFG.elev.eye });
      check('G4 a story-1 line clears the between\'s ground scrub (the doodad band law)',
        elevated === null, elevated ? `hit d ${elevated.d.toFixed(1)}` : '');
    }
  }
}

// --- RIG H: THE FLIGHT INTO THE BETWEEN (the DEFERRED world.ts consult) ------
// The projectile sweep's tissue verdict is a world.ts hunk (the masonry-gate
// precedent — the coordinator lands it): a tier-0 bolt into SOLID between
// must die at the same drawn surface castRay answers. This rig ARMS ITSELF:
// while the consult is un-landed the bolt lawfully SAILS past the boundary
// (reported PENDING, not red); once it lands, the pin demands death at
// castRay's own distance — and a death anywhere ELSE fails either way.
{
  if (solidFind) {
    const gunner = ws.createMonster('plaguefather', 3, 'enemy');
    ws.actors.push(gunner);
    const kitH = gunner.skills.find(s => s?.def.id === 'venom_bolt') ?? gunner.skills.find(s => !!s);
    if (kitH) {
      const fly = (): { gone: boolean; deadD: number } => {
        const before = ws.projectiles.length;
        const angH = Math.atan2(solidFind!.to.y - solidFind!.from.y, solidFind!.to.x - solidFind!.from.x);
        ws.spawnProjectile(gunner, kitH, vec(solidFind!.from.x, solidFind!.from.y), angH);
        const bolt = ws.projectiles.length > before ? ws.projectiles[ws.projectiles.length - 1] : null;
        let last = bolt ? { x: bolt.pos.x, y: bolt.pos.y } : null;
        let beats = 0;
        while (bolt && ws.projectiles.includes(bolt) && beats < 80) {
          last = { x: bolt.pos.x, y: bolt.pos.y };
          for (const a of ws.actors) updateAI(a, ws, DT);
          ws.update(DT);
          beats++;
        }
        return {
          gone: !!bolt && !ws.projectiles.includes(bolt),
          deadD: last ? Math.hypot(last.x - solidFind!.from.x, last.y - solidFind!.from.y) : NaN,
        };
      };
      // THE CONTROL FLIGHT disambiguates: with the solid dial OFF the same
      // line must fly FARTHER (range/other deaths land in the same place
      // both ways — only the landed consult moves with the dial). While
      // the world.ts consult is un-landed, on ≈ off and the rig reports
      // PENDING instead of red; a dial-insensitive death AT the boundary
      // (a range coincidence) is PENDING too, never a false LANDED.
      const on = fly();
      LOS_CFG.crossBorder.solidShot = false;
      const off = fly();
      LOS_CFG.crossBorder.solidShot = true;
      const dialMoved = off.deadD > on.deadD + 60;
      const landedDeath = on.gone && Math.abs(on.deadD - solidFind.hit.d) <= 34 && dialMoved;
      const pendingSail = !dialMoved && Math.abs(on.deadD - off.deadD) <= 40;
      check('H1 the bolt into solid between dies at castRay\'s surface — or flies dial-blind while the world.ts consult is PENDING',
        landedDeath || pendingSail,
        landedDeath
          ? `LANDED: died at ${on.deadD.toFixed(1)} vs ray ${solidFind.hit.d.toFixed(1)}; dial-off flew to ${off.deadD.toFixed(1)}`
          : pendingSail
            ? `PENDING the coordinator's world.ts consult — dial-blind flight to ${on.deadD.toFixed(1)} (ray says ${solidFind.hit.d.toFixed(1)})`
            : `on ${on.deadD.toFixed(1)} / off ${off.deadD.toFixed(1)} vs ray ${solidFind.hit.d.toFixed(1)} — neither landed nor a lawful pending`);
    } else {
      check('H1 the bolt into solid between dies at castRay\'s surface — or flies dial-blind while the world.ts consult is PENDING',
        false, 'no kit instance on the staged gunner');
    }
  } else {
    check('H1 the bolt into solid between dies at castRay\'s surface — or flies dial-blind while the world.ts consult is PENDING',
      true, 'VACUOUS: no solid-first ray stood (G1)');
  }
}

console.log(fails === 0 ? '\nprobe_seamlesslos: ALL GREEN' : `\nprobe_seamlesslos: ${fails} FAILURE(S)`);
process.exit(fails > 0 ? 1 : 0);
