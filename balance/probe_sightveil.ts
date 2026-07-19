// SIGHT VEIL PROBE — the drawn veil's geometry + query contract, pinned
// headlessly against the EXACT path builders the sheet fills (they speak to
// a structural PathSink, so this rig collects the same polygons draw() does).
//
// The failure classes this rig recreates:
//   A. THE WALL-PRESS INVERSION (chord sag): the far side of a shadow used to
//      close with ONE straight chord between the pushed endpoints. Pressing
//      the eye against a long wall drives the silhouette span toward π, the
//      endpoint rays run nearly parallel to the face, and the chord sags to
//      a sliver hugging the wall — everything deep behind LIGHTS UP in an
//      inverted "overview" while occludedAt still reports hidden (live: the
//      sheet's buffer alpha read 0 where occ read 1.0, with grid collision
//      carrying the eye to 0.2px off the face). The arc fan must cover the
//      deep field at every press distance. The rig keeps the OLD chord
//      construction as its pressure control: it must demonstrably fail.
//   B. CAP CHURN: the maxOccluders backstop biting inside the visible field
//      swapped 17–40 ON-SCREEN wedges per 96px gather re-sort in dense
//      jungle (the "veil bouncing darker/lighter while walking" flicker).
//      The per-frame far cull must be mirrored drawn==tested, and the cap
//      must keep nearest-first order.
//   C. LOW-PROFILE PROPS: knee-high fire-ring rocks and headstones threw
//      160px full-dark wedges (southern Lastlight). The graded sightShadow
//      ladder must scale strength AND length, and occludedAt must report
//      the same graded number the sheet paints.
//
//   npx tsx balance/probe_sightveil.ts

import {
  SightVeil, SIGHT_VEIL_GEO, castLen,
  edgeShadowPath, edgeShadowForEye, discShadowPath, rectShadowPath,
  type OccEdge, type PathSink, type SightView,
} from '../src/render/vis/sightVeil';
import { VIS_CFG } from '../src/render/vis/visConfig';
import { sightShadowFrac, type Doodad } from '../src/engine/levelgen';
import { GridWalkField } from '../src/world/gridWalk';
import { regionKind } from '../src/world/regions';

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

// --- polygon collector: the SAME sink the sheet fills -----------------------
interface P { x: number; y: number }
class CollectSink implements PathSink {
  polys: P[][] = [];
  private cur: P[] | null = null;
  moveTo(x: number, y: number): void { this.cur = [{ x, y }]; this.polys.push(this.cur); }
  lineTo(x: number, y: number): void {
    if (!this.cur) this.moveTo(x, y); else this.cur.push({ x, y });
  }
  closePath(): void { this.cur = null; }
}
/** Nonzero-winding point test over every collected subpath — the fill rule
 *  Path2D uses, so "inside" here is "painted" there. */
function inside(polys: P[][], x: number, y: number): boolean {
  let wn = 0;
  for (const poly of polys) {
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const cross = (b.x - a.x) * (y - a.y) - (x - a.x) * (b.y - a.y);
      if (a.y <= y) { if (b.y > y && cross > 0) wn++; }
      else if (b.y <= y && cross < 0) wn--;
    }
  }
  return wn !== 0;
}

// --- the OLD chord construction (pressure control for class A) --------------
function chordEdgePoly(ax: number, ay: number, bx: number, by: number,
  px: number, py: number, far: number): P[][] {
  const dax = ax - px, day = ay - py;
  const dbx = bx - px, dby = by - py;
  const la = Math.hypot(dax, day), lb = Math.hypot(dbx, dby);
  if (la < 1 || lb < 1) return [];
  return [[
    { x: ax, y: ay }, { x: bx, y: by },
    { x: bx + (dbx / lb) * far, y: by + (dby / lb) * far },
    { x: ax + (dax / la) * far, y: ay + (day / la) * far },
  ]];
}

console.log('— A. wall-press: edge fan covers the deep field at every distance —');
{
  const FAR = 1600;
  // A 500px wall edge on y=0; deep-field grid strictly behind (+y).
  const deep: P[] = [];
  for (const y of [200, 500, 900]) for (const x of [-300, 0, 300]) deep.push({ x, y });
  const dists = [40, 25, 15, 8, 3, 1, 0.4, 0.2];
  let allCovered = true;
  let worst = '';
  for (const d of dists) {
    const sink = new CollectSink();
    edgeShadowPath(sink, -250, 0, 250, 0, 0, -d, FAR, 0, 0, 1);
    for (const p of deep) {
      if (!inside(sink.polys, p.x, p.y)) { allCovered = false; worst = `eye@${d}px missed (${p.x},${p.y})`; }
    }
    // The eye's own side must stay clear.
    if (inside(sink.polys, 0, -d - 30)) { allCovered = false; worst = `eye@${d}px covered its own side`; }
  }
  check('deep field covered at every press distance (incl. the live 0.2px)', allCovered, worst);

  // Pressure control: the OLD chord polygon must fail the same test at press.
  const old = chordEdgePoly(-250, 0, 250, 0, 0, -0.2, FAR);
  check('pressure: OLD chord construction leaves the deep field lit at 0.2px',
    !inside(old, 0, 500) && !inside(old, 0, 200));
  const oldFar = chordEdgePoly(-250, 0, 250, 0, 0, -300, FAR);
  check('control: OLD construction was fine when standing off (300px)',
    inside(oldFar, 0, 500));
}

console.log('— A1b. THE CORNER: the polygon never blinks; a free end peels honestly —');
{
  const FAR = 1600;
  // The durance repro: wall face y=0 spanning x −250..250, eye pressed to
  // 0.08px off the plane, SLIDING east across the endpoint at x=250. The
  // old `la<1||lb<1` skip dropped the WHOLE polygon within 1px of the
  // endpoint (a one-frame full-bright blink per corner passed, and a
  // standing hole while parked in the pocket). The fix: raw directions to
  // sub-px range — the polygon always exists; approaching the end keeps the
  // deep field, and stepping PAST a free end reveals it fast (the honest
  // corner peel — that part is real sight, not a bug).
  const deep: P[] = [];
  for (const y of [150, 400]) for (const x of [-150, 0, 150]) deep.push({ x, y });
  let ok = true, worst = '';
  for (const ex of [246, 248.6, 249.4, 249.96, 250.0]) {
    const sink = new CollectSink();
    const n = edgeShadowPath(sink, -250, 0, 250, 0, ex, -0.08, FAR, 0, 0, 1);
    if (n !== 1) { ok = false; worst = `eye@x=${ex} dropped the polygon`; continue; }
    for (const p of deep) {
      if (!inside(sink.polys, p.x, p.y)) { ok = false; worst = `eye@x=${ex} missed (${p.x},${p.y})`; }
    }
  }
  check('approaching/at the corner never drops coverage (incl. exact endpoint)', ok, worst);
  // Past the free end: the polygon still exists (never a blink) and the far
  // side has honestly peeled open.
  const past = new CollectSink();
  const n = edgeShadowPath(past, -250, 0, 250, 0, 250.5, -0.08, FAR, 0, 0, 1);
  check('past a free end: polygon persists, deep field honestly revealed',
    n === 1 && !inside(past.polys, 0, 400) && !inside(past.polys, -150, 150));
  // Both endpoints at once (a one-cell stub the eye stands beside) still casts.
  const stub = new CollectSink();
  check('a short stub with the eye at its end still casts',
    edgeShadowPath(stub, 0, 0, 26, 0, 0.3, -0.4, FAR, 0, 0, 1) === 1
    && inside(stub.polys, 8, 200));
}

console.log('— A1c. THE FACING SLACK: the on-plane knife-edge draws, a real behind skips —');
{
  const FAR = 1600;
  const E: OccEdge = { ax: -250, ay: 0, bx: 250, by: 0, nx: 0, ny: -1 };
  // Outward −y: the OPEN side is y<0. dot = −py. Sweep the pressed band the
  // collision actually produces (measured 0.00–0.7px, jitter both sides).
  let ok = true, worst = '';
  for (const py of [-0.7, -0.1, 0, 0.1, 1.0]) {
    const sink = new CollectSink();
    const n = edgeShadowForEye(sink, E, 0, py, FAR, 0, 0, 1);
    const covered = n === 1 && inside(sink.polys, 0, 300) && inside(sink.polys, -150, 200);
    const openSide = n === 1 && inside(sink.polys, 0, -40);
    if (!covered) { ok = false; worst = `dot=${-py} lost the behind field`; }
    if (openSide) { ok = false; worst = `dot=${-py} darkened the eye's own side`; }
  }
  check('the pressed band (dot −1.0..+0.7) always covers behind, never the open side', ok, worst);
  const behind = new CollectSink();
  check('a face the eye is honestly behind still skips (dot −2)',
    edgeShadowForEye(behind, E, 0, 2, FAR, 0, 0, 1) === 0);
  check('a thin wall\'s far face (a cell away) never draws (dot −26)',
    edgeShadowForEye(new CollectSink(), E, 0, 26, FAR, 0, 0, 1) === 0);
}

console.log('— A2. disc wedge: fan + melt —');
{
  const FAR = 1600;
  // Hugging a boulder r30 at ordinary collision distance (surface 15px).
  const sink = new CollectSink();
  const n = discShadowPath(sink, 0, 0, 30, 1, 0, 45, FAR, 0, 0, 1);
  const reach = Math.min(FAR, 45 + castLen(30)); // eye-relative shadow end
  check('press wedge exists', n === 1);
  check('straight-behind covered to ~castLen', inside(sink.polys, 0, -(reach - 60)));
  check('shadow ENDS at its body-scaled length (never the screen rim)',
    !inside(sink.polys, 0, -(reach + 40)));
  check('outside the tangent cone stays lit', !inside(sink.polys, 300, -100));

  // Displacement melt: at 2px surface distance the wedge is short, not gone,
  // and at 0 it is gone — a melt, never a pop. (reach is EYE-relative.)
  const s2 = new CollectSink();
  discShadowPath(s2, 0, 0, 30, 1, 0, 32, FAR, 0, 0, 1);
  const melted = Math.min(FAR, 32 + castLen(30)) * (2 / SIGHT_VEIL_GEO.surfaceFeather);
  check('melt @2px surface: near covered', inside(s2.polys, 0, 32 - (melted - 12)));
  check('melt @2px surface: deep released', !inside(s2.polys, 0, 32 - (melted + 40)));
  const s0 = new CollectSink();
  check('melt @0 surface: no wedge', discShadowPath(s0, 0, 0, 30, 1, 0, 30, FAR, 0, 0, 1) === 0);
}

console.log('— A3. slab: surface melt + fan (the long-face press) —');
{
  const FAR = 1600;
  const slab = { x: 0, y: 0, hw: 240, hh: 15, rot: 0, boundR: Math.hypot(240, 15), s: 1 };
  // Ordinary press: 15px off the long face — full shadow, deep field covered.
  const sink = new CollectSink();
  const n = rectShadowPath(sink, slab, 0, 30, FAR, 0, 0, 1);
  check('pressed slab still casts (old span-melt half-erased it at hw 240)', n === 1);
  check('deep behind the slab covered', inside(sink.polys, 0, -400) && inside(sink.polys, 150, -400));
  // Displacement through the face: melts by surface distance.
  const s2 = new CollectSink();
  rectShadowPath(s2, slab, 0, 15.5, FAR, 0, 0, 1);
  check('slab melt @0.5px surface: deep released', !inside(s2.polys, 0, -500));
  const sIn = new CollectSink();
  check('eye inside the slab: no shadow', rectShadowPath(sIn, slab, 0, 0, FAR, 0, 0, 1) === 0);
}

console.log('— C. the graded low-profile ladder (sightShadowFrac) —');
{
  const mk = (kind: string, radius: number, door = false): Doodad =>
    ({ kind, radius, pos: { x: 0, y: 0 }, door: door ? {} : undefined } as unknown as Doodad);
  const rock8 = sightShadowFrac(mk('rock', 8));
  const rock30 = sightShadowFrac(mk('rock', 30));
  const stone = sightShadowFrac(mk('tombstone', 10));
  check('fire-ring rock r8 breathes faint (≈0.31)', Math.abs(rock8 - 8 / 26) < 1e-9, `${rock8}`);
  check('boulder r30 keeps full dark', rock30 === 1);
  check('headstone wears its authored mul', Math.abs(stone - 0.35) < 1e-9, `${stone}`);
  check('tree trunk (boolean default) full', sightShadowFrac(mk('tree', 18)) === 1);
  check('bench (no blocksShot) never casts', sightShadowFrac(mk('bench', 13)) === 0);
  check('doors never cast', sightShadowFrac(mk('tree', 18, true)) === 0);
  check('graded length: soft shadow is a SHORT shadow',
    castLen(8, rock8) < castLen(8) * 0.35 && castLen(8, rock8) > 0);
}

console.log('— B + drawn==tested: the live veil (cap, cull, graded query) —');
{
  const veil = new SightVeil();
  const walk = new GridWalkField(2400, 1600, 30);
  walk.fillRect(0, 0, 2400, 1600, true);
  // One wall run across the middle: x 600..1200 at y 700..730.
  walk.fillRect(600, 700, 1200, 730, false);
  const doodads: Doodad[] = [];
  const mkD = (kind: string, x: number, y: number, radius: number): Doodad =>
    ({ kind, radius, pos: { x, y } } as unknown as Doodad);
  // A full-strength solid (cliff: circle surface, no rock-form variance), a
  // graded headstone, and a beyond-radius solid for the cull mirror.
  doodads.push(mkD('cliff', 1500, 1000, 30));
  doodads.push(mkD('tombstone', 1700, 1000, 10));
  doodads.push(mkD('cliff', 900 + 950, 1200, 30)); // 950px east of the eye
  const view: SightView = {
    player: { pos: { x: 900, y: 1200 } },
    walk,
    zone: {},
    doodads,
    doodadsNear: (x, y, reach) =>
      doodads.filter(d => Math.hypot(d.pos.x - x, d.pos.y - y) <= reach + d.radius),
    doodadRev: 1,
  };
  veil.update(view, 0, 1280, 800);
  const radius = Math.min(VIS_CFG.sightVeil.maxRadius, Math.hypot(1280, 800) / 2 + 120);
  const dF = VIS_CFG.sightVeil.doodadStrength, rF = VIS_CFG.sightVeil.regionStrength;

  // Region march: a point across the wall reads the full region strength.
  check('behind the wall: occludedAt = regionStrength',
    Math.abs(veil.occludedAt({ x: 900, y: 500 }) - rF) < 1e-9);
  check('open ground: clear', veil.occludedAt({ x: 700, y: 1200 }) === 0);

  // Full-strength body: behind the cliff (eye at 900,1200 → cliff 1500,1000).
  const behindCliff = { x: 1500 + 90 * (600 / 670), y: 1000 - 90 * (200 / 670) };
  check('behind a full solid: occludedAt = doodadStrength',
    Math.abs(veil.occludedAt(behindCliff) - dF) < 1e-9,
    `${veil.occludedAt(behindCliff)}`);

  // Graded body: behind the headstone the SAME 0.35 the sheet paints.
  const behindStone = { x: 1700 + 40 * (800 / 825), y: 1000 - 40 * (200 / 825) };
  const got = veil.occludedAt(behindStone);
  check('behind a headstone: occludedAt = doodadStrength × 0.35',
    Math.abs(got - dF * 0.35) < 1e-9, `${got}`);
  // …and past its SHORT graded length, clear again.
  const farStone = { x: 1700 + 200 * (800 / 825), y: 1000 - 200 * (200 / 825) };
  check('past the graded length: clear', veil.occludedAt(farStone) === 0);

  // THE PLAYER'S SHADE DIAL (Settings.veilDarkness → userMul): the whole
  // veil — sheet strengths and occludedAt alike — scales through one number,
  // and 0 deactivates the pass outright.
  veil.userMul = 0.5;
  veil.update(view, 0, 1280, 800);
  check('userMul 0.5 halves the query (drawn==tested through the dial)',
    Math.abs(veil.occludedAt({ x: 900, y: 500 }) - rF * 0.5) < 1e-9);
  veil.userMul = 0;
  veil.update(view, 0, 1280, 800);
  check('userMul 0 lifts the veil entirely', veil.occludedAt({ x: 900, y: 500 }) === 0);
  veil.userMul = 1;
  veil.update(view, 0, 1280, 800);

  // The far-cull mirror: the beyond-radius cliff hides nothing…
  const beyond = doodads[2];
  check('rig sanity: third solid sits beyond the veil radius',
    Math.hypot(beyond.pos.x - 900, beyond.pos.y - 1200) - 30 > radius);
  check('beyond-radius body culled from the query too',
    veil.occludedAt({ x: beyond.pos.x + 60, y: beyond.pos.y }) === 0);
  // …and a control inside radius with the same geometry does hide (the rig
  // would catch a cull that ate everything).
  check('control: the in-radius solid still hides its behind',
    veil.occludedAt(behindCliff) > 0);
}

console.log('— B2. the cap: real density never trips it; pathological trims nearest-first —');
{
  const mkView = (doodads: Doodad[], at: { x: number; y: number }): SightView => ({
    player: { pos: at },
    walk: null,
    zone: {},
    doodads,
    doodadsNear: (x, y, reach) =>
      doodads.filter(d => Math.hypot(d.pos.x - x, d.pos.y - y) <= reach + d.radius),
    doodadRev: 1,
  });
  const radius = Math.min(VIS_CFG.sightVeil.maxRadius, Math.hypot(1280, 800) / 2 + 120);

  // Jungle-density analog: 700 solids spread over the WHOLE gather disc —
  // the count that actually lands in reach must sit under the cap, so the
  // kept set is exactly "everything in reach" and a bucket re-sort can never
  // change membership (the flicker's mechanism was the cap trimming INSIDE
  // this set at 288).
  {
    const doodads: Doodad[] = [];
    for (let i = 0; i < 700; i++) {
      const ang = (i * 2.399963) % (Math.PI * 2);
      const dist = 60 + i * 2.2;
      doodads.push({ kind: 'cliff', radius: 12,
        pos: { x: 3000 + Math.cos(ang) * dist, y: 3000 + Math.sin(ang) * dist } } as unknown as Doodad);
    }
    const veil = new SightVeil();
    veil.update(mkView(doodads, { x: 3000, y: 3000 }), 0, 1280, 800);
    const discs = (veil as unknown as { discs: { x: number; y: number }[] }).discs;
    const inReach = doodads.filter(d =>
      Math.hypot(d.pos.x - 3000, d.pos.y - 3000) <= radius + 160).length;
    check('spread density stays under the cap (no trim, no churn)',
      discs.length < VIS_CFG.sightVeil.maxOccluders && discs.length >= inReach,
      `kept ${discs.length}, in-reach ${inReach}`);
  }

  // Pathological density: 900 packed INSIDE one screen — the backstop trims
  // to exactly the cap, nearest-first (max kept ≤ min dropped).
  {
    const doodads: Doodad[] = [];
    for (let i = 0; i < 900; i++) {
      const ang = (i * 2.399963) % (Math.PI * 2);
      const dist = 40 + i * 0.7;
      doodads.push({ kind: 'cliff', radius: 12,
        pos: { x: 3000 + Math.cos(ang) * dist, y: 3000 + Math.sin(ang) * dist } } as unknown as Doodad);
    }
    const veil = new SightVeil();
    veil.update(mkView(doodads, { x: 3000, y: 3000 }), 0, 1280, 800);
    const discs = (veil as unknown as { discs: { x: number; y: number }[] }).discs;
    check('pathological grove trims to exactly maxOccluders',
      discs.length === VIS_CFG.sightVeil.maxOccluders, `${discs.length}`);
    const kept = new Set(discs.map(c => `${Math.round(c.x)}:${Math.round(c.y)}`));
    let maxKept = 0, minDropped = Infinity;
    for (const d of doodads) {
      const dist = Math.hypot(d.pos.x - 3000, d.pos.y - 3000);
      if (kept.has(`${Math.round(d.pos.x)}:${Math.round(d.pos.y)}`)) maxKept = Math.max(maxKept, dist);
      else minDropped = Math.min(minDropped, dist);
    }
    check('the trim is nearest-first (max kept ≤ min dropped)',
      maxKept <= minDropped + 1e-6, `kept ${Math.round(maxKept)} vs dropped ${Math.round(minDropped)}`);
  }
}

console.log('— B3. interactable reveals (veilPierce) + the stands row —');
{
  const veil = new SightVeil();
  const walk = new GridWalkField(2400, 1600, 30);
  walk.fillRect(0, 0, 2400, 1600, true);
  walk.fillRect(600, 700, 1200, 730, false);   // the wall run
  const doorPos = { x: 900, y: 715 };           // a door ON the wall plane
  const doodads: Doodad[] = [
    { kind: 'door', radius: 15, pos: doorPos, door: {} } as unknown as Doodad,
  ];
  const view: SightView = {
    player: { pos: { x: 900, y: 1200 } },
    walk,
    zone: {},
    doodads,
    doodadsNear: (x, y, reach) =>
      doodads.filter(d => Math.hypot(d.pos.x - x, d.pos.y - y) <= reach + d.radius),
    doodadRev: 1,
  };
  veil.update(view, 0, 1280, 800);
  const rF = VIS_CFG.sightVeil.regionStrength;
  const atDoor = veil.occludedAt(doorPos);
  const offDoor = veil.occludedAt({ x: 900 + 120, y: 715 });
  check('the door\'s threshold pierces the wall dark',
    atDoor < rF * (1 - VIS_CFG.sightVeil.pierceStrength) + 0.02, `${atDoor}`);
  check('the wall away from the door keeps its full dark',
    Math.abs(offDoor - rF) < 1e-9, `${offDoor}`);
  check('doors still cast no shadow of their own (the grid owns it)',
    sightShadowFrac(doodads[0]) === 0);

  const stands = regionKind('arena_stands');
  check('arena_stands: feet and arrows stop, sight sails over',
    !!stands && stands.blocks === true && stands.blocksShot === true && !stands.blocksSight);
}

console.log('— B4. THE HULL LAW: a standing roof seals its doorways from outside —');
{
  const mkVeil = () => {
    const veil = new SightVeil();
    const walk = new GridWalkField(2400, 1600, 30);
    walk.fillRect(0, 0, 2400, 1600, true);
    // A "structure": wall ring 600..900 × 600..810 with an OPEN door gap in
    // the south wall (the campfire sighting's lance). The gap is located by
    // SCANNING the painted line — immune to fillRect boundary semantics.
    walk.fillRect(600, 600, 900, 630, false);   // north wall
    walk.fillRect(600, 780, 700, 810, false);   // south wall, west of door
    walk.fillRect(770, 780, 900, 810, false);   // south wall, east of door
    walk.fillRect(600, 600, 630, 810, false);   // west wall
    walk.fillRect(870, 600, 900, 810, false);   // east wall
    let gapLo = -1, gapHi = -1;
    for (let x = 630; x < 870; x += 30) {
      const open = walk.regionAt(x + 15, 795) !== 'wall';
      if (open && x + 15 > 660 && x + 15 < 840) { if (gapLo < 0) gapLo = x; gapHi = x + 30; }
    }
    const doorX = (gapLo + gapHi) / 2;
    const view = () => ({
      player: { pos: { x: doorX, y: 1100 } },   // outside, due south of the door
      walk, zone: {}, doodads: [] as Doodad[],
      doodadsNear: () => [] as Doodad[], doodadRev: 1,
    } as SightView);
    return { veil, view, doorX, gapW: gapHi - gapLo };
  };
  const rF = VIS_CFG.sightVeil.regionStrength;
  // Control: roof lifted (no hull) — the doorway honestly leaks a wedge.
  {
    const { veil, view, doorX, gapW } = mkVeil();
    check('rig sanity: the scanned door gap is real', gapW >= 30, `gap ${gapW}px @${doorX}`);
    veil.update(view(), 0, 1280, 800, []);
    const leak = veil.occludedAt({ x: doorX, y: 700 });   // straight through the gap
    const sealed = veil.occludedAt({ x: 655, y: 700 });   // behind the wall proper
    check('control: with the roof lifted the doorway leaks (pressure)', leak < 0.01, `${leak}`);
    check('control: the wall proper still hides', Math.abs(sealed - rF) < 1e-9, `${sealed}`);
  }
  // The law: roof standing — the hull swallows the doorway; nothing leaks.
  {
    const { veil, view, doorX } = mkVeil();
    veil.update(view(), 0, 1280, 800, [{ x: 600, y: 600, w: 300, h: 210 }]);
    const throughDoor = veil.occludedAt({ x: doorX, y: 700 });
    const beyond = veil.occludedAt({ x: doorX, y: 500 });  // past the far wall
    const outside = veil.occludedAt({ x: doorX, y: 900 }); // open street before the door
    check('standing roof: the doorway wedge is sealed', Math.abs(throughDoor - rF) < 1e-9, `${throughDoor}`);
    check('standing roof: the field beyond stays hidden', Math.abs(beyond - rF) < 1e-9);
    check('standing roof: the street before the door stays clear', outside < 0.01, `${outside}`);
  }
}

console.log(`\n${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
console.log('ALL PASS');
