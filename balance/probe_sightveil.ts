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
  SightVeil, SIGHT_VEIL_GEO, SIGHT_VEIL_SOLID, castLen,
  edgeShadowPath, edgeShadowForEye, discShadowPath, rectShadowPath,
  type OccEdge, type PathSink, type SightView,
} from '../src/render/vis/sightVeil';
import { VIS_CFG } from '../src/render/vis/visConfig';
import { sightShadowFrac, type Doodad } from '../src/engine/levelgen';
import { GridWalkField } from '../src/world/gridWalk';
import { regionKind } from '../src/world/regions';
import { setTissueSampler, type TissueSampler } from '../src/world/seamless';

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

console.log('— A4. THE EXACT OBB: an oriented slab\'s query tests the slab the wedge draws —');
{
  // The failure class: occludedAt's rect branch tested the BOUNDING CIRCLE
  // (segHitsCircle at boundR) while rectShadowPath walks the true oriented
  // corners — so a ray clipping the circle but missing the slab reported
  // "hidden" over ground nothing painted. Worst on long thin slabs at 45°.
  // The rig runs the REAL gather (an explicit hitbox rides hitSurfaceOf
  // verbatim) and judges query + drawn wedge against an INDEPENDENT
  // segment-vs-quad truth (edge crossings + containment — a different
  // formulation than the slab clip under test).
  const CX = 1200, CY = 1000, HW = 240, HH = 12, ROT = Math.PI / 4;
  const EYE = { x: 700, y: 500 };
  const cosR = Math.cos(ROT), sinR = Math.sin(ROT);
  const quad = (grow: number): P[] =>
    ([[+1, +1], [-1, +1], [-1, -1], [+1, -1]] as const).map(([su, sv]) => ({
      x: CX + su * (HW + grow) * cosR - sv * (HH + grow) * sinR,
      y: CY + su * (HW + grow) * sinR + sv * (HH + grow) * cosR,
    }));
  const cross = (ax: number, ay: number, bx: number, by: number, x: number, y: number): number =>
    (bx - ax) * (y - ay) - (by - ay) * (x - ax);
  const inQuad = (c: P[], p: P): boolean => {
    let sgn = 0;
    for (let i = 0; i < 4; i++) {
      const a = c[i], b = c[(i + 1) % 4];
      const s = cross(a.x, a.y, b.x, b.y, p.x, p.y);
      if (Math.abs(s) < 1e-6) continue;
      if (!sgn) sgn = s > 0 ? 1 : -1;
      else if ((s > 0 ? 1 : -1) !== sgn) return false;
    }
    return true;
  };
  const segSeg = (a: P, b: P, c: P, d: P): boolean => {
    const d1 = cross(c.x, c.y, d.x, d.y, a.x, a.y), d2 = cross(c.x, c.y, d.x, d.y, b.x, b.y);
    const d3 = cross(a.x, a.y, b.x, b.y, c.x, c.y), d4 = cross(a.x, a.y, b.x, b.y, d.x, d.y);
    return (d1 > 0) !== (d2 > 0) && (d3 > 0) !== (d4 > 0);
  };
  const truth = (grow: number, to: P): boolean => {
    const c = quad(grow);
    if (inQuad(c, EYE) || inQuad(c, to)) return true;
    for (let i = 0; i < 4; i++) if (segSeg(EYE, to, c[i], c[(i + 1) % 4])) return true;
    return false;
  };

  const veil = new SightVeil();
  const doodads: Doodad[] = [{
    kind: 'cliff', radius: 30, pos: { x: CX, y: CY },
    hitbox: { kind: 'rect', hw: HW, hh: HH, rot: ROT },
  } as unknown as Doodad];
  const view: SightView = {
    player: { pos: { x: EYE.x, y: EYE.y } },
    walk: null, zone: {}, doodads,
    doodadsNear: (x, y, reach) =>
      doodads.filter(d => Math.hypot(d.pos.x - x, d.pos.y - y) <= reach + d.radius),
    doodadRev: 1,
  };
  veil.update(view, 0, 1280, 800);
  const rects = (veil as unknown as { rects: { rot: number; boundR: number; s: number }[] }).rects;
  check('rig sanity: the hitbox slab gathered as ONE oriented rect (rot intact)',
    rects.length === 1 && rects[0].rot === ROT && rects[0].s === 1,
    `rects ${rects.length}`);
  const dF = VIS_CFG.sightVeil.doodadStrength;
  const radius = Math.min(VIS_CFG.sightVeil.maxRadius, Math.hypot(1280, 800) / 2 + 120);
  const far = radius * VIS_CFG.sightVeil.farSlack;
  const sink = new CollectSink();
  rectShadowPath(sink, { x: CX, y: CY, hw: HW, hh: HH, rot: ROT, boundR: Math.hypot(HW, HH), s: 1 },
    EYE.x, EYE.y, far, 0, 0, 1);

  // THE WITNESS PAIR. Beside the slab (perp offset off the long axis): the
  // ray clips the bounding circle yet misses the body — must read CLEAR and
  // draw nothing. Dead behind the thin end: must read the full graded dark
  // and be painted.
  const beside = { x: 1094, y: 1106 };
  const behind = { x: 1412, y: 1212 };
  check('witness sanity (independent truth): beside misses, behind crosses',
    !truth(0, beside) && truth(0, behind));
  // Pressure: the OLD bounding-circle verdict lied about `beside`.
  const oldVerdict = (to: P): boolean => {
    const qx = to.x - EYE.x, qy = to.y - EYE.y, len2 = qx * qx + qy * qy;
    const wx = CX - EYE.x, wy = CY - EYE.y;
    let t = (wx * qx + wy * qy) / len2;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    const ddx = wx - qx * t, ddy = wy - qy * t;
    return ddx * ddx + ddy * ddy < HW * HW + HH * HH;
  };
  check('pressure: the OLD circle test called the lit ground hidden', oldVerdict(beside));
  check('beside the slab: occludedAt reads CLEAR (the regression)',
    veil.occludedAt(beside) === 0, `${veil.occludedAt(beside)}`);
  check('beside the slab: the wedge paints nothing there (drawn agrees)',
    !inside(sink.polys, beside.x, beside.y));
  check('behind the slab: occludedAt = doodadStrength',
    Math.abs(veil.occludedAt(behind) - dF) < 1e-9, `${veil.occludedAt(behind)}`);
  check('behind the slab: the wedge paints it (drawn agrees)',
    inside(sink.polys, behind.x, behind.y));

  // THE SWEEP: a fan of query points around the slab — query, drawn wedge
  // and the independent truth must agree everywhere. Samples the truth
  // itself calls marginal (verdict flips within ±3px of slab surface) are
  // skipped — boundary fuzz, not law; distances stay inside the far fan's
  // chord sag; points inside the body are skipped (nothing queryable
  // stands inside a solid — the discs' standing asymmetry).
  let agree = true, worst = '', tested = 0;
  for (let deg = 20; deg <= 70; deg += 2.5) {
    for (const d of [350, 550, 750, 950, 1050]) {
      const th = deg * Math.PI / 180;
      const p = { x: EYE.x + Math.cos(th) * d, y: EYE.y + Math.sin(th) * d };
      if (truth(3, p) !== truth(-3, p)) continue;       // marginal: boundary fuzz
      if (inQuad(quad(0), p)) continue;                  // inside the solid body
      const want = truth(0, p);
      tested++;
      const q = veil.occludedAt(p) > 0;
      const drawn = inside(sink.polys, p.x, p.y);
      if (q !== want) { agree = false; worst = `query@${deg}°/${d}px: got ${String(q)}, truth ${String(want)}`; }
      if (drawn !== want) { agree = false; worst = `drawn@${deg}°/${d}px: got ${String(drawn)}, truth ${String(want)}`; }
    }
  }
  check(`sweep: query == drawn == independent truth (${tested} samples)`,
    agree && tested > 60, worst || `${tested} tested`);
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

console.log('— B5. THE VEIL ACROSS BORDERS: neighbor walls cast, tissue stays open —');
{
  // The seamless commission (docs/design/seamless-world.md, feel verdict 5):
  // "the veil acts as if the player has no visibility into bordering zones".
  // The mechanism: regionAt answers 'wall' for EVERY out-of-grid point, so
  // the query march read the whole beyond-rim country as one administrative
  // wall (actors faded, labels gated) while the gather never saw neighbor
  // mints (no drawn faces there — query and sheet even disagreed). This rig
  // pins the fix from both sides: phantom dark DIES over away open ground,
  // honest dark ARRIVES behind away walls — plus the away asymmetries
  // (open-outside rim faces, the always-standing roof hull) and the
  // mode-law controls.
  const rF = VIS_CFG.sightVeil.regionStrength, dF = VIS_CFG.sightVeil.doodadStrength;
  const radius = Math.min(VIS_CFG.sightVeil.maxRadius, Math.hypot(1280, 800) / 2 + 120);
  const far = radius * VIS_CFG.sightVeil.farSlack;
  const EYE = { x: 2200, y: 800 };

  // ACTIVE zone: 2400×1600, open, east rim walled ONLY south of y=900 (the
  // enclosure look: a wall with a gap — the y 0..900 border stands open).
  const mkActiveWalk = (): GridWalkField => {
    const w = new GridWalkField(2400, 1600, 30);
    w.fillRect(0, 0, 2400, 1600, true);
    w.fillRect(2370, 900, 2400, 1600, false);
    return w;
  };
  // NEIGHBOR mint (seated at dx=2400, dy=0): west rim wall over y 0..600,
  // an interior run, one cliff, one roofed structure.
  const nbWalk = new GridWalkField(1200, 1600, 30);
  nbWalk.fillRect(0, 0, 1200, 1600, true);
  nbWalk.fillRect(0, 0, 30, 600, false);      // west rim wall (rows 0..600)
  nbWalk.fillRect(300, 750, 600, 780, false); // interior run
  const nbDoodads: Doodad[] = [
    { kind: 'cliff', radius: 30, pos: { x: 500, y: 600 } } as unknown as Doodad,
  ];
  const nbMint = {
    layout: {
      walk: nbWalk,
      doodads: nbDoodads,
      structures: [{ roofs: [{ x: 350, y: 350, w: 200, h: 150 }] }],
    },
  };
  const mkView = (mode: 'seamless' | 'flagOff' | 'plain'): SightView => {
    const walk = mkActiveWalk();
    const base: SightView = {
      player: { pos: { x: EYE.x, y: EYE.y } },
      walk, zone: { id: 'act' }, doodads: [] as Doodad[],
      doodadsNear: () => [] as Doodad[], doodadRev: 1,
    };
    if (mode === 'plain') return base;
    base.seamless = mode === 'seamless';
    base.seamlessRegions = [
      { zoneId: 'act', originPx: { x: 10000, y: 20000 } },
      { zoneId: 'nb', originPx: { x: 12400, y: 20000 } },
    ];
    base.seamlessMints = new Map([['nb', nbMint]]);
    return base;
  };

  const veil = new SightVeil();
  veil.update(mkView('seamless'), 0, 1280, 800);
  const inner = veil as unknown as {
    edges: OccEdge[]; discs: { x: number }[]; nbMemo: Map<string, unknown>;
  };

  // The gather: the neighbor's cliff joined the live set translated; the
  // neighbor rim's BOUNDARY face exists at the border line (the
  // open-outside law — solid-outside would never emit it).
  check('the neighbor cliff joined the fold (translated)',
    inner.discs.length === 1 && Math.abs(inner.discs[0].x - 2900) < 1e-9,
    `discs ${inner.discs.length}`);
  const rimFace = inner.edges.some(e => e.nx === -1 && Math.abs(e.ax - 2400) < 1e-9
    && e.ay <= 0.1 && e.by >= 599.9);
  check('the neighbor rim wall casts its boundary face (open-outside law)', rimFace);

  // Witness rays, all crossing the border inside the OPEN y 0..900 band:
  const openNb = { x: 2900, y: 1100 };    // A: away open ground past the gap
  const behindRim = { x: 2600, y: 300 };  // C: behind the neighbor's own rim wall
  const behindRun = { x: 3050, y: 760 };  // B: behind its interior wall run
  const inRoof = { x: 2850, y: 430 };     // hull: inside its standing roof
  const tissue = { x: 2250, y: -300 };    // no grid owns this ground
  const behindCliff = { x: 2986.5, y: 575.3 }; // 90px past the cliff, on-ray
  check('away OPEN ground reads open (the administrative dark dies)',
    veil.occludedAt(openNb) === 0, `${veil.occludedAt(openNb)}`);
  check('behind the neighbor\'s rim wall: honest regionStrength',
    Math.abs(veil.occludedAt(behindRim) - rF) < 1e-9, `${veil.occludedAt(behindRim)}`);
  check('behind the neighbor\'s interior wall: regionStrength',
    Math.abs(veil.occludedAt(behindRun) - rF) < 1e-9, `${veil.occludedAt(behindRun)}`);
  check('inside the neighbor\'s standing roof: concealed (the away hull)',
    Math.abs(veil.occludedAt(inRoof) - rF) < 1e-9, `${veil.occludedAt(inRoof)}`);
  check('tissue (no grid owns it) occludes nothing',
    veil.occludedAt(tissue) === 0, `${veil.occludedAt(tissue)}`);
  check('behind the neighbor\'s cliff: the graded doodad dark crosses the border',
    Math.abs(veil.occludedAt(behindCliff) - dF) < 1e-9, `${veil.occludedAt(behindCliff)}`);

  // Drawn == tested at the wall family: the sheet's own edge geometry
  // paints the wall witnesses and leaves the open one lit.
  const sink = new CollectSink();
  for (const e of inner.edges) edgeShadowForEye(sink, e, EYE.x, EYE.y, far, 0, 0, 1);
  check('drawn agrees: wall witnesses painted, open ground not',
    inside(sink.polys, behindRim.x, behindRim.y)
    && inside(sink.polys, behindRun.x, behindRun.y)
    && !inside(sink.polys, openNb.x, openNb.y));

  // PRESSURE (the pre-wave law): a discrete-shaped veil over the same
  // active ground reads EVERY beyond-grid sample as 'wall' (regionAt's
  // out-of-bounds answer) — open neighbor ground, walled neighbor ground
  // and bare tissue all march to the same administrative dark. That IS the
  // "no visibility into bordering zones" sweep the lane kills.
  const ctrl = new SightVeil();
  ctrl.update(mkView('plain'), 0, 1280, 800);
  check('pressure: the discrete law darkened the open neighbor ground',
    Math.abs(ctrl.occludedAt(openNb) - rF) < 1e-9, `${ctrl.occludedAt(openNb)}`);
  check('pressure: …and the walled ground and the tissue alike (the sweep)',
    Math.abs(ctrl.occludedAt(behindRim) - rF) < 1e-9
    && Math.abs(ctrl.occludedAt(tissue) - rF) < 1e-9,
    `${ctrl.occludedAt(behindRim)} / ${ctrl.occludedAt(tissue)}`);

  // THE MODE LAW, both stands: flag off (seats present, seamless false) and
  // dial off (seamless true, crossBorder false) answer BYTE-IDENTICAL to
  // the plain discrete veil across every witness.
  const witnesses = [openNb, behindRim, behindRun, inRoof, behindCliff, tissue];
  const flagOff = new SightVeil();
  flagOff.update(mkView('flagOff'), 0, 1280, 800);
  const cbDial = VIS_CFG.sightVeil as unknown as { crossBorder: boolean };
  const dialOff = new SightVeil();
  cbDial.crossBorder = false;
  dialOff.update(mkView('seamless'), 0, 1280, 800);
  cbDial.crossBorder = true;
  let modeOk = true, modeWorst = '';
  for (const p of witnesses) {
    const want = ctrl.occludedAt(p);
    if (flagOff.occludedAt(p) !== want) { modeOk = false; modeWorst = `flagOff @(${p.x},${p.y})`; }
    if (dialOff.occludedAt(p) !== want) { modeOk = false; modeWorst = `dialOff @(${p.x},${p.y})`; }
  }
  const fEdges = (flagOff as unknown as { edges: OccEdge[]; discs: unknown[] });
  const dEdges = (dialOff as unknown as { edges: OccEdge[]; discs: unknown[] });
  const cEdges = (ctrl as unknown as { edges: OccEdge[]; discs: unknown[] });
  check('mode law: flag-off and dial-off answer as plain discrete', modeOk, modeWorst);
  check('mode law: their occluder sets are the discrete set',
    fEdges.edges.length === cEdges.edges.length && fEdges.discs.length === cEdges.discs.length
    && dEdges.edges.length === cEdges.edges.length && dEdges.discs.length === cEdges.discs.length,
    `edges ${cEdges.edges.length}/${fEdges.edges.length}/${dEdges.edges.length}`);

  // MINT IDENTITY invalidates: a re-minted neighbor (rim wall gone) swaps
  // in and the standing memo dies with the old record.
  const reWalk = new GridWalkField(1200, 1600, 30);
  reWalk.fillRect(0, 0, 1200, 1600, true);
  const view2 = mkView('seamless');
  view2.seamlessMints = new Map([['nb', { layout: { walk: reWalk, doodads: [] as Doodad[] } }]]);
  veil.update(view2, 0, 1280, 800);
  check('a re-minted neighbor re-extracts (the rim dark lifts with its wall)',
    veil.occludedAt(behindRim) === 0, `${veil.occludedAt(behindRim)}`);

  // DEMOTION prunes: the ring drops the neighbor, the memo store follows
  // (the working-set guard), and its ground honestly RETURNS to the
  // discrete read (unresident country is unknown country again).
  const view3 = mkView('seamless');
  view3.seamlessRegions = [{ zoneId: 'act', originPx: { x: 10000, y: 20000 } }];
  veil.update(view3, 0, 1280, 800);
  check('a demoted neighbor prunes its memo; its ground reads discrete again',
    inner.nbMemo.size === 0
    && Math.abs(veil.occludedAt(behindRun) - ctrl.occludedAt(behindRun)) < 1e-9,
    `memo ${inner.nbMemo.size}, occ ${veil.occludedAt(behindRun)}`);
}

console.log('— B6. THE SOLID BETWEEN: the mesh\'s field occludes, the corridor stays open —');
{
  // M2 wave 9 (her occlusion ruling): un-owned tissue whose SOLID FIELD
  // answers true occludes in the query march AND emits boundary faces into
  // the drawn sheet — standing in a carved corridor you SEE the walls of
  // country, not past them. The field arrives via the tissue sampler's
  // carried read (duck-typed off getTissueSampler); this rig installs a
  // STUB sampler carrying a half-plane field (solid north of world y
  // 19850 — active-local y < −150 at the B5 seat geometry), so every
  // verdict has an exact oracle. Probe literals WITHOUT the stub (all the
  // rigs above) stand down structurally — their pins are this rig's
  // control.
  const rF = VIS_CFG.sightVeil.regionStrength;
  const EYE = { x: 2200, y: 300 };
  const mkActiveWalk = (): GridWalkField => {
    const w = new GridWalkField(2400, 1600, 30);
    w.fillRect(0, 0, 2400, 1600, true);
    return w;
  };
  const nbWalk6 = new GridWalkField(1200, 1600, 30);
  nbWalk6.fillRect(0, 0, 1200, 1600, true);
  const nbMint6 = { layout: { walk: nbWalk6, doodads: [] as Doodad[] } };
  const mkView6 = (sim: boolean): SightView => {
    const v: SightView = {
      player: { pos: { x: EYE.x, y: EYE.y } },
      walk: mkActiveWalk(), zone: { id: 'act' }, doodads: [] as Doodad[],
      doodadsNear: () => [] as Doodad[], doodadRev: 1,
      seamless: true,
      seamlessRegions: [
        { zoneId: 'act', originPx: { x: 10000, y: 20000 } },
        { zoneId: 'nb', originPx: { x: 12400, y: 20000 } },
      ],
      seamlessMints: new Map([['nb', nbMint6]]),
    };
    if (sim) v.sim = { biomeField: { fieldSeed: 7 } };
    return v;
  };
  const stub = ((): TissueSampler => {
    const fn = (() => ({ walkable: true, tone: '#000000', road: false })) as unknown as TissueSampler;
    (fn as unknown as { massDress: { solidAt(x: number, y: number, s: number): boolean } }).massDress = {
      solidAt: (_x: number, y: number) => y < 19850,
    };
    return fn;
  })();
  setTissueSampler(stub);

  const veil = new SightVeil();
  veil.update(mkView6(true), 0, 1280, 800);
  const inner6 = veil as unknown as { edges: OccEdge[] };
  const solidT = { x: 2250, y: -400 };  // beyond the field boundary (solid country)
  const openT = { x: 2250, y: -80 };    // open tissue south of the boundary

  check('B6: solid tissue occludes in the march (the field is the one truth)',
    Math.abs(veil.occludedAt(solidT) - rF) < 1e-9, `${veil.occludedAt(solidT)}`);
  check('B6: open tissue still reads clear (the corridor law survives)',
    veil.occludedAt(openT) === 0, `${veil.occludedAt(openT)}`);
  check('B6: an elevated target clears the between\'s ground scrub (the band law)',
    veil.occludedAt(solidT, 1) === 0, `${veil.occludedAt(solidT, 1)}`);
  // THE FRINGE FACE: the field's lattice boundary (solid rows end at world
  // y 19860 → active-local −140) emits a merged bottom face spanning the
  // witness column.
  const fringe = inner6.edges.find(e => e.ny === 1 && Math.abs(e.ay + 140) < 0.5
    && Math.abs(e.ay - e.by) < 1e-9 && e.ax <= 2250 && e.bx >= 2250);
  check('B6: the drawn sheet grows a boundary face at the mass edge (−140, the lattice\'s own line)',
    !!fringe, fringe ? `face ${fringe.ax.toFixed(0)}..${fringe.bx.toFixed(0)} @ ${fringe.ay}` : `${inner6.edges.length} edges`);
  const sink6 = new CollectSink();
  for (const e of inner6.edges) edgeShadowForEye(sink6, e, EYE.x, EYE.y, 2000, 0, 0, 1);
  check('B6: drawn == tested (the sheet paints the solid witness, spares the open one)',
    inside(sink6.polys, solidT.x, solidT.y) && !inside(sink6.polys, openT.x, openT.y));

  // THE DIAL: off restores the wave-8 tissue-open posture (march + faces).
  SIGHT_VEIL_SOLID.enabled = false;
  veil.update(mkView6(true), 0, 1280, 800);
  check('B6: dial-off restores open tissue (march clear, fringe gone)',
    veil.occludedAt(solidT) === 0
    && !inner6.edges.some(e => e.ny === 1 && Math.abs(e.ay + 140) < 0.5),
    `${veil.occludedAt(solidT)}`);
  SIGHT_VEIL_SOLID.enabled = true;

  // STRUCTURAL STAND-DOWNS: a view without the seed lane, and a world
  // without an installed sampler, both read the wave-8 posture — the rigs
  // above (sampler-less literals) are safe BY CONSTRUCTION.
  const veilNoSim = new SightVeil();
  veilNoSim.update(mkView6(false), 0, 1280, 800);
  check('B6: a view without the seed lane stands the solid lane down (probe-literal safety)',
    veilNoSim.occludedAt(solidT) === 0, `${veilNoSim.occludedAt(solidT)}`);
  setTissueSampler(null);
  const veilNoSampler = new SightVeil();
  veilNoSampler.update(mkView6(true), 0, 1280, 800);
  check('B6: no installed sampler stands the solid lane down (the null-seam law)',
    veilNoSampler.occludedAt(solidT) === 0, `${veilNoSampler.occludedAt(solidT)}`);

  // THE GRIDLESS AMENDMENT (found live on a gridless deepwood active): the
  // between's occlusion is the TISSUE's truth, not the layout's — with no
  // active grid the march and the fringe still stand (the engine ray never
  // needed the active grid either; drawn == tested across the pair).
  setTissueSampler(stub);
  const veilNoGrid = new SightVeil();
  const vg = mkView6(true);
  vg.walk = null;
  veilNoGrid.update(vg, 0, 1280, 800);
  const gEdges = (veilNoGrid as unknown as { edges: OccEdge[] }).edges;
  check('B6: a GRIDLESS active still darkens solid between (march + fringe — the tissue\'s own truth)',
    Math.abs(veilNoGrid.occludedAt(solidT) - rF) < 1e-9
    && veilNoGrid.occludedAt(openT) === 0
    && gEdges.some(e => e.ny === 1 && Math.abs(e.ay + 140) < 0.5),
    `occ ${veilNoGrid.occludedAt(solidT)} / open ${veilNoGrid.occludedAt(openT)}, edges ${gEdges.length}`);
  setTissueSampler(null);
}

console.log(`\n${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
console.log('ALL PASS');
