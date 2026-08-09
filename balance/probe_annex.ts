// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE COMPOSITE BOUND (the Secrets Charter's Movement I): zone
// bounds as a UNION of shape pieces behind the standing authorities, with base
// zones = exactly ONE piece and byte-identical behavior by construction
// (world/shape.ts BoundsPiece + the World activation seam).
//
// RIG A — the kernel, pure: clampToBounds/insideBounds against a re-derived
//   classic clamp (the rim law's idiom — the probe must not test through the
//   law it pins) over dense lattices on rect AND ellipse fixtures (incl. the
//   rim law's own 3582×4340 specimen dims); pieces-absent ≡ classic,
//   all-DORMANT ≡ pieces-absent (dormant admits nothing, attracts nothing),
//   active-union membership (base/annex/overlap admit unmoved; gap points
//   pull to the NEAREST rim), hullOf's active-only origin-pinned growth, and
//   unionArea's bit-exact base arithmetic.
// RIG B — the world seam, live: a registered QA zone (ellipse base, an
//   east-protruding rect annex, an embedded corner oval, a forever-dormant
//   south cell) booted through the real loadZone — pieces mint dormant,
//   clampPos refuses annex ground, the convex nav refuses its cells, the
//   hull stays the base box; devAnnexReveal joins a piece and the SAME seats
//   admit (clampPos unmoved, nav walkable on a fresh ask, hull grown,
//   unionArea grown); the dormant cell never grows the hull.
// RIG C — persistence: reveal → leave (capture) → return (revive) restores
//   the revealed set through the real zone-memory road; the unrevealed
//   sibling stays dormant; a fresh same-seed world reproduces the identical
//   post-reveal clamp lattice (determinism — the foreordained tenet's floor).
// RIG D — the wire: serializeZone ships pieces + open state; applyZone
//   rebuilds them on a second world (hull + revealed set follow); the 20 Hz
//   annexes row converges a client that missed the reveal via the idempotent
//   annexReveal (the hollows-row law, piece-grain).
//
// Run: npx tsx balance/probe_annex.ts
// ---------------------------------------------------------------------------

import { vec } from '../src/core/math';
import {
  activeAnnexKey, activePieces, clampToBounds, hullOf, insideBounds,
  unionArea, type Bounds, type BoundsPiece, type ZoneShape,
} from '../src/world/shape';
import { ZONES, type ZoneDef } from '../src/data/zones';
import { bootSimEngine, makeSimWorld, SIM_ARENA_ID } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { applyZone, serializeZone } from '../src/net/snapshot';

let fails = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails++;
};

// --- RIG A: the kernel, pure --------------------------------------------------

// The CLASSIC clamp, re-derived (never imported): rect border clamp / ellipse
// radial rim projection — the exact pre-composite law.
function classicClamp(px: number, py: number, radius: number,
  w: number, h: number, shape: ZoneShape): { x: number; y: number } {
  if (shape !== 'ellipse') {
    const cl = (v: number, lo: number, hi: number): number => v < lo ? lo : v > hi ? hi : v;
    return { x: cl(px, radius, w - radius), y: cl(py, radius, h - radius) };
  }
  const cx = w / 2, cy = h / 2;
  const rx = Math.max(8, w / 2 - radius), ry = Math.max(8, h / 2 - radius);
  const nx = (px - cx) / rx, ny = (py - cy) / ry;
  const k = nx * nx + ny * ny;
  if (k <= 1) return { x: px, y: py };
  const s = 1 / Math.sqrt(k);
  return { x: cx + (px - cx) * s, y: cy + (py - cy) * s };
}

/** A dense lattice over (and past) a w×h box — corners, rims and far void. */
function lattice(w: number, h: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = -2; i <= 18; i++) {
    for (let j = -2; j <= 18; j++) {
      pts.push({ x: (i / 16) * w, y: (j / 16) * h });
    }
  }
  return pts;
}

{
  const fixtures: { w: number; h: number; shape: ZoneShape }[] = [
    { w: 3000, h: 2000, shape: 'rect' },
    { w: 3582, h: 4340, shape: 'ellipse' }, // the rim law's own specimen dims
    { w: 1600, h: 1200, shape: 'rect' },
    { w: 2400, h: 1800, shape: 'ellipse' },
  ];
  const radii = [0, 16, 28];
  for (const f of fixtures) {
    const bare: Bounds = { w: f.w, h: f.h, shape: f.shape };
    const dormant: Bounds = {
      ...bare,
      pieces: [
        { id: 'a', x: f.w, y: f.h * 0.3, w: 500, h: 400 },
        { id: 'b', x: 40, y: 40, w: 300, h: 260, shape: 'ellipse' },
      ],
    };
    let absentOk = true, dormantOk = true, insideOk = true;
    for (const p of lattice(f.w, f.h)) {
      for (const r of radii) {
        const want = classicClamp(p.x, p.y, r, f.w, f.h, f.shape);
        const gotBare = clampToBounds(vec(p.x, p.y), r, bare);
        const gotDorm = clampToBounds(vec(p.x, p.y), r, dormant);
        if (gotBare.x !== want.x || gotBare.y !== want.y) absentOk = false;
        if (gotDorm.x !== want.x || gotDorm.y !== want.y) dormantOk = false;
        if (insideBounds(vec(p.x, p.y), r, dormant)
          !== (want.x === p.x && want.y === p.y)) insideOk = false;
      }
    }
    check(`A1 ${f.shape} ${f.w}×${f.h}: pieces-absent ≡ the classic clamp (bit-exact)`, absentOk);
    check(`A2 ${f.shape} ${f.w}×${f.h}: all-DORMANT ≡ pieces-absent (dormant admits nothing, attracts nothing)`, dormantOk);
    check(`A3 ${f.shape} ${f.w}×${f.h}: insideBounds ≡ clamp-unmoved under dormant pieces`, insideOk);
  }

  // Active-union membership on one composed fixture: ellipse base 2400×1800,
  // an east rect annex, an embedded corner oval that laps the base rim.
  const east: BoundsPiece = { id: 'east', x: 2400, y: 700, w: 600, h: 480, active: true };
  const oval: BoundsPiece = { id: 'oval', x: 30, y: 30, w: 300, h: 240, shape: 'ellipse', active: true };
  const uni: Bounds = { w: 2400, h: 1800, shape: 'ellipse', pieces: [east, oval] };
  const r = 16;
  check('A4 base heart admits unmoved', insideBounds(vec(1200, 900), r, uni));
  check('A5 east annex heart admits unmoved (beyond the base box entirely)',
    insideBounds(vec(2700, 940), r, uni));
  check('A6 corner oval heart admits unmoved (base-rim voidspace reclaimed)',
    insideBounds(vec(180, 150), r, uni));
  const gap = clampToBounds(vec(2380, 60), r, uni); // NE void: outside base rim, outside both annexes
  check('A7 gap void still clamps (union ≠ hull: the NE corner stays outside)',
    !(gap.x === 2380 && gap.y === 60));
  // Nearest-rim law: a point just past the east annex's east wall pulls to
  // THAT wall (x = 3000 - r), never all the way back to the base ellipse.
  const past = clampToBounds(vec(3080, 940), r, uni);
  check('A8 nearest-rim: past the annex east wall lands ON that wall',
    past.x === 3000 - r && past.y === 940, `got ${past.x},${past.y}`);
  // Dormant sibling among actives: flip east off — its ground refuses again.
  east.active = false;
  const refused = clampToBounds(vec(2700, 940), r, uni);
  check('A9 de-activated piece refuses its own heart again',
    !(refused.x === 2700 && refused.y === 940));
  east.active = true;

  // hullOf: active-only, origin-pinned growth.
  check('A10 hull grows east to the active annex edge', hullOf(uni).w === 3000 && hullOf(uni).h === 1800);
  const dormantSouth: Bounds = {
    w: 2400, h: 1800, shape: 'ellipse',
    pieces: [{ id: 's', x: 1000, y: 1900, w: 300, h: 300 }],
  };
  const hd = hullOf(dormantSouth);
  check('A11 a dormant piece never grows the hull', hd.w === 2400 && hd.h === 1800);
  check('A12 embedded active piece adds no hull', (() => {
    const b: Bounds = { w: 2400, h: 1800, shape: 'ellipse', pieces: [{ ...oval }] };
    const hh = hullOf(b);
    return hh.w === 2400 && hh.h === 1800;
  })());

  // unionArea: the base term is BIT-EXACT the classic inline arithmetic.
  check('A13 unionArea rect base ≡ w*h', unionArea({ w: 3000, h: 2000, shape: 'rect' }) === 3000 * 2000);
  check('A14 unionArea ellipse base ≡ bbox*(π/4)',
    unionArea({ w: 3582, h: 4340, shape: 'ellipse' }) === (3582 * 4340) * (Math.PI / 4));
  const areaBare = unionArea({ w: 2400, h: 1800, shape: 'ellipse' });
  const areaUni = unionArea(uni);
  check('A15 active pieces add their own area (oval at π/4)',
    areaUni === areaBare + 600 * 480 + (300 * 240) * (Math.PI / 4));

  // The cache fingerprint + active list helpers.
  check('A16 activeAnnexKey: \'\' with no pieces, ids when open',
    activeAnnexKey({ w: 10, h: 10, shape: 'rect' }) === ''
    && activeAnnexKey(uni) === 'east,oval'
    && activePieces(uni).length === 2
    && activePieces(dormantSouth).length === 0);
}

// --- RIG B: the world seam, live ------------------------------------------------

seedGlobalRandom(0x5ec7e75);
bootSimEngine();

const QA_ZONE = 'qa_annex_hall';
const qaDef = (): ZoneDef => ({
  id: QA_ZONE, name: 'Annex Hall (QA)',
  level: 1,
  size: { w: 2400, h: 1800 },
  shape: 'ellipse',
  theme: {
    floor: '#101010', grid: '#181818', border: '#3a3a3a',
    obstacle: '#2a2a2a', obstacleEdge: '#444444', accent: '#888888',
  },
  seed: 0x9a77e1,
  layout: [],
  objective: { kind: 'none' },
  exits: [],
  map: { x: 9400, y: 9280 }, // far off every real chart (the sim-arena law)
  annexes: [
    { id: 'qa_east_wing', x: 2400, y: 700, w: 600, h: 480, seed: 0x11a1 },
    { id: 'qa_corner_yard', x: 30, y: 30, w: 300, h: 240, shape: 'ellipse', seed: 0x22b2 },
    { id: 'qa_sealed_cell', x: 1000, y: 1900, w: 300, h: 300, seed: 0x33c3 },
  ],
});
ZONES[QA_ZONE] = qaDef();

const world = makeSimWorld('warrior', 0xa11e);
world.loadZone(QA_ZONE);

const EAST_HEART = vec(2700, 940);
const YARD_HEART = vec(180, 150);

{
  const pcs = world.arena.pieces ?? [];
  check('B1 pieces mint with the zone, ALL dormant (generation saw the classic base)',
    pcs.length === 3 && pcs.every(pc => !pc.active) && world.annexOpen.size === 0);
  check('B2 hull is the base box while everything sleeps',
    world.arenaHull.w === 2400 && world.arenaHull.h === 1800);
  const c0 = world.clampPos(vec(EAST_HEART.x, EAST_HEART.y), 14);
  check('B3 clampPos refuses dormant annex ground', !(c0.x === EAST_HEART.x && c0.y === EAST_HEART.y));
  const nav0 = world.pathField();
  check('B4 the convex nav refuses dormant annex cells',
    !!nav0 && !nav0.isWalkable(EAST_HEART.x, EAST_HEART.y) && !nav0.isWalkable(YARD_HEART.x, YARD_HEART.y));
  const area0 = unionArea(world.arena);

  check('B5 devAnnexReveal joins the east wing', world.devAnnexReveal('qa_east_wing') === 1);
  check('B6 reveal is idempotent (the openHollow law)',
    world.annexReveal('qa_east_wing') === true && world.annexOpen.size === 1);
  const c1 = world.clampPos(vec(EAST_HEART.x, EAST_HEART.y), 14);
  check('B7 the SAME seat admits after activation (clampPos unmoved)',
    c1.x === EAST_HEART.x && c1.y === EAST_HEART.y);
  const nav1 = world.pathField();
  check('B8 the nav re-rakes on its next ask: annex cells walkable, yard still refused',
    !!nav1 && nav1.isWalkable(EAST_HEART.x, EAST_HEART.y) && !nav1.isWalkable(YARD_HEART.x, YARD_HEART.y));
  check('B9 hull grew east, and only east', world.arenaHull.w === 3000 && world.arenaHull.h === 1800);
  check('B10 unionArea grew by the wing', unionArea(world.arena) === area0 + 600 * 480);

  check('B11 the corner yard joins too (embedded — no hull growth)',
    world.annexReveal('qa_corner_yard') && world.arenaHull.w === 3000 && world.arenaHull.h === 1800
    && insideBounds(vec(YARD_HEART.x, YARD_HEART.y), 14, world.arena));
  check('B12 the sealed cell stays dormant and buys no hull',
    world.arena.pieces?.find(pc => pc.id === 'qa_sealed_cell')?.active !== true
    && world.arenaHull.h === 1800);
  check('B13 an unknown piece id refuses honestly', world.annexReveal('qa_no_such') === false);
}

// --- RIG C: persistence + determinism ------------------------------------------

{
  world.loadZone(SIM_ARENA_ID);          // leave — the capture writes annexOpen
  world.loadZone(QA_ZONE);               // return — the revive re-opens it
  const pcs = world.arena.pieces ?? [];
  check('C1 revealed stays revealed across leave/return (zone memory road)',
    world.annexOpen.has('qa_east_wing') && world.annexOpen.has('qa_corner_yard')
    && pcs.find(pc => pc.id === 'qa_east_wing')?.active === true
    && pcs.find(pc => pc.id === 'qa_corner_yard')?.active === true);
  check('C2 the unrevealed sibling returns dormant',
    pcs.find(pc => pc.id === 'qa_sealed_cell')?.active !== true);
  check('C3 the hull re-derives from the revived set', world.arenaHull.w === 3000);
  const c = world.clampPos(vec(EAST_HEART.x, EAST_HEART.y), 14);
  check('C4 the revived union admits at the same seat', c.x === EAST_HEART.x && c.y === EAST_HEART.y);

  // Determinism: a FRESH same-seed world walking the same reveals lands on
  // the identical post-reveal clamp lattice (the composite adds no rng —
  // reveal order is the player's, geometry is the def's).
  seedGlobalRandom(0x5ec7e75);
  const w2 = makeSimWorld('warrior', 0xa11e);
  w2.loadZone(QA_ZONE);
  w2.devAnnexReveal('qa_east_wing');
  w2.devAnnexReveal('qa_corner_yard');
  let same = true;
  for (let i = 0; i <= 12; i++) {
    for (let j = 0; j <= 12; j++) {
      const p = vec((i / 10) * 3000, (j / 10) * 1800);
      const a = clampToBounds(vec(p.x, p.y), 14, world.arena);
      const b = clampToBounds(vec(p.x, p.y), 14, w2.arena);
      if (a.x !== b.x || a.y !== b.y) same = false;
    }
  }
  check('C5 fresh same-seed world + same reveals ≡ identical clamp lattice', same);
}

// --- RIG D: the wire -------------------------------------------------------------

{
  const msg = serializeZone(world);
  check('D1 the zone message ships the pieces with their open state',
    msg.arena.pieces?.length === 3
    && msg.arena.pieces.find(pc => pc.id === 'qa_east_wing')?.active === true
    && msg.arena.pieces.find(pc => pc.id === 'qa_sealed_cell')?.active !== true);

  seedGlobalRandom(0x5ec7e75);
  const client = makeSimWorld('warrior', 0xa11e);
  applyZone(client, msg);
  check('D2 applyZone rebuilds the union client-side (hull + revealed set follow)',
    client.arena.pieces?.length === 3
    && client.arenaHull.w === 3000
    && client.annexOpen.has('qa_east_wing')
    && insideBounds(vec(EAST_HEART.x, EAST_HEART.y), 14, client.arena));
  // The 20 Hz row's convergence IS annexReveal, idempotent per id: a client
  // that missed the reveal joins the piece the moment the row lands.
  check('D3 a late row converges the last piece on the client',
    client.annexReveal('qa_sealed_cell', { silent: true }) === true
    && client.arenaHull.h === 2200
    && insideBounds(vec(1150, 2050), 14, client.arena));
  // And a piece-less zone ships NO pieces field at all (absent == identical).
  const bare = serializeZone(client); // client stands in sim_arena's graph zone... the applied zone
  check('D4 the wire stays silent on classic zones (absent == identical)',
    (() => {
      // serializeZone reads the CLIENT world's live arena (patched above) —
      // ship a genuinely bare zone instead: a fresh world parked in the arena.
      seedGlobalRandom(0x5ec7e75);
      const w3 = makeSimWorld('warrior', 0xa11e);
      const m3 = serializeZone(w3);
      return m3.arena.pieces === undefined && bare.arena.pieces !== undefined;
    })());
}

console.log(fails === 0 ? '\nprobe_annex: ALL GREEN' : `\nprobe_annex: ${fails} FAILURE(S)`);
process.exit(fails > 0 ? 1 : 0);
