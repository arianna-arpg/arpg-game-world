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
import { borderAgreedPoint } from '../src/world/cells';
import { GridWalkField } from '../src/world/gridWalk';
import { regionKind } from '../src/world/regions';
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
  // A PURE-TISSUE segment: both endpoints beyond the rim, every sample in
  // NO member's cell (inflated by the doodad fold's own reach so a rim
  // body's poking surface can't confound the pin) — the between itself is
  // what this rig reads, not the active zone's own rim dress.
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
    }
    return true;
  };
  // Lattice hunt: any anchor in the ring band around the arena whose
  // outward segment (away from the arena center) stays clear — the wedges
  // between cells are tissue even when the spokes all graze somebody.
  let tissueLine: { from: { x: number; y: number }; to: { x: number; y: number } } | null = null;
  let tissuePad = 0;
  for (const pad of [LOS_CFG.crossBorder.ownerPad + 48, 48]) {
    for (let gy = -1200; gy <= h + 1200 && !tissueLine; gy += 160) {
      for (let gx = -1200; gx <= w + 1200; gx += 160) {
        const ux = gx - w / 2, uy = gy - h / 2;
        const ul = Math.hypot(ux, uy) || 1;
        const from = { x: gx, y: gy };
        const to = { x: gx + (ux / ul) * 420, y: gy + (uy / ul) * 420 };
        if (insideArena(from)) continue;
        if (segClear(from, to, pad)) { tissueLine = { from, to }; tissuePad = pad; break; }
      }
    }
    if (tissueLine) break;
  }
  check('C0 a pure-tissue segment clear of every member cell exists', !!tissueLine,
    tissueLine ? `clearance pad ${tissuePad}px` : '');
  if (tissueLine) {
    const openShot = castRay(ws, tissueLine.from, tissueLine.to, 'shot') === null;
    const openSight = castRay(ws, tissueLine.from, tissueLine.to, 'sight') === null;
    check('C1 the tissue reads OPEN to both ray families (no owner = open sky)',
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

console.log(fails === 0 ? '\nprobe_seamlesslos: ALL GREEN' : `\nprobe_seamlesslos: ${fails} FAILURE(S)`);
process.exit(fails > 0 ? 1 : 0);
