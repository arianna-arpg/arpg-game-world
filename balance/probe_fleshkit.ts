// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE FLESH KIT: the half-poppable gaze closed + the kit's
// first formations.
//
// RIG A — the mirror (static): eye_stalk wears its OWN brittle 'hit' row
//   beside ocular_knot's; the registry-wide gaze census (every DOODAD kind
//   any tileset's theme.gaze reads is hit-poppable — wallKinds are the
//   sanctioned unpoppable lane); the INTENDED side effect pinned: brittle
//   kinds leave the rampage fell lane (breakables BREAK, their own spoils
//   law) while the non-brittle sibling rib_arch still fells; the four flesh
//   formations registered; and THE POOL DOCTRINE (the flesh pools are
//   REGION liquids — none of the three ever rides a formation, since their
//   region truth rasterizes only at their own blob stamps; dry pour washes
//   like cinder/sand/snowdrift are the shipped counter-precedent).
// RIG B — the burst, live: one strikeSurfaces play (the seam every melee
//   arc / nova / splash rides) pops stalk and knot IDENTICALLY on a real
//   world — spliced from the doodad list, gone-flagged, pop flash shown.
// RIG C — the gaze drop, live: the real updateGaze builds 'beheld' from a
//   standing eye at watch range, and popping that eye STOPS the build
//   (stacks dwindle) — the stalk's cycle and the knot's cycle are asserted
//   EQUAL observable-for-observable (drawn == tested: the gaze filter and
//   the pop share one doodad list).
// RIG D — the formations, on-grammar: each new def forced through the real
//   generateLayout on a bare arena (registry-only until a tileset seats
//   them — this rig IS their geometry gate): landing rate, full piece-kind
//   mix, composed extent (one arrangement, never confetti), per-grammar
//   shape (braid/meander elongation, arc circle-fit, orbit ring band with
//   an open court), and same-seed determinism.
//
// Run: npx tsx balance/probe_fleshkit.ts
// ---------------------------------------------------------------------------

// Side-effect registries — the same set genqa loads (bootSimEngine pulls the
// full graph too; the explicit imports keep this probe honest if the sim
// boot's graph ever thins).
import '../src/data/clusters';
import '../src/data/formations';
import '../src/engine/landmarkBuilders';
import '../src/data/landmarks';
import '../src/engine/layoutRecipes';
import '../src/engine/interiorGen';
import '../src/data/compositions';

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { Rng } from '../src/core/rng';
import { vec } from '../src/core/math';
import { updateAI } from '../src/engine/ai';
import {
  generateLayout, doodadRuleOf, hasFormation, formationDefs,
  type Doodad, type GeneratedLayout,
} from '../src/engine/levelgen';
import { fellableDoodad } from '../src/engine/rampage';
import { GAZE_CFG, type World } from '../src/engine/world';
import { TILESETS } from '../src/data/tilesets';
import type { ZoneDef } from '../src/data/zones';
import type { Actor } from '../src/engine/actor';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x71e5f);

const step = (w: World, seconds: number): void => {
  const dt = 1 / 60;
  for (let t = 0; t < seconds - 1e-9; t += dt) {
    w.applyInputs(new Map(), dt);
    for (const a of [...w.actors]) updateAI(a, w, dt);
    w.update(dt);
  }
};

type WPriv = {
  strikeSurfaces(striker: Actor | null, at: { x: number; y: number }, reach: number): void;
  flashes: unknown[];
};
const mk = (kind: string, x = 0, y = 0): Doodad => ({ pos: vec(x, y), radius: 15, kind } as Doodad);

// --- RIG A: the mirror — the gaze pair, the census, the fell-lane move ------
{
  const stalk = doodadRuleOf('eye_stalk');
  const knot = doodadRuleOf('ocular_knot');
  // THE DISSOLUTION GRAMMAR (D1): the gaze pair BREAKS AS A DRAWING — each wears
  // a dissolve row (meat lobes in its own tone) and NO caption (the no-text law).
  check('A1 the stalk wears its own brittle row (hit-poppable) and a dissolve row, no caption',
    !!stalk.brittle && stalk.brittle.on.includes('hit') && !stalk.brittle.text && !!stalk.dissolve);
  check('A2 the stalk and the knot each wear their OWN debris face (meat tones of their own)',
    !!stalk.dissolve?.debrisLook?.color && !!knot.dissolve?.debrisLook?.color
    && stalk.dissolve.debrisLook.color !== knot.dissolve.debrisLook.color);
  check("A3 the knot's row stands hit-poppable and text-free (the crumbling-wall idiom under the no-text law)",
    knot.brittle?.on.includes('hit') === true && !knot.brittle?.text && !!knot.dissolve);

  // THE CENSUS: every doodad kind ANY gaze reads (base themes + variant theme
  // patches) is hit-poppable — the half-poppable gap can never reopen
  // silently. wallKinds stay exempt by design: region eyes never flinch shut
  // and cannot be burst; their counterplay is not lingering.
  const gazeKinds = new Set<string>();
  for (const t of Object.values(TILESETS)) {
    for (const k of t.theme.gaze?.kinds ?? []) gazeKinds.add(k);
    for (const v of t.variants ?? []) {
      const th = (v as { theme?: { gaze?: { kinds?: string[] } } }).theme;
      for (const k of th?.gaze?.kinds ?? []) gazeKinds.add(k);
    }
  }
  check('A4 the census found the standing gaze lanes (ocular pair + the weald\'s stone)',
    gazeKinds.has('eye_stalk') && gazeKinds.has('ocular_knot') && gazeKinds.has('watcher_stone'));
  const unpoppable = [...gazeKinds].filter(k => !doodadRuleOf(k).brittle?.on.includes('hit'));
  check('A5 every doodad eye in every gaze is poppable', unpoppable.length === 0, unpoppable.join(','));

  // The INTENDED side effect (state it, pin it): a brittle kind leaves the
  // rampage fell lane — engine/rampage refuses breakables (they BREAK, with
  // their own spoils). The non-brittle sibling proves the refusal is the
  // brittle field, not the family.
  check('A6 the stalk left the fell lane (breakables BREAK)', !fellableDoodad(mk('eye_stalk')));
  check('A7 the knot was never in it', !fellableDoodad(mk('ocular_knot')));
  check('A8 the non-brittle sibling still fells (rib_arch)', fellableDoodad(mk('rib_arch')));

  for (const id of ['vessel_braid', 'knuckle_march', 'watching_gallery', 'clot_bank']) {
    check(`A9 formation '${id}' is registered`, hasFormation(id));
  }

  // THE POOL DOCTRINE, measured and scoped: a registry-wide "no pour kinds in
  // formations" is FALSE at HEAD — six standing formations ride dry pour
  // WASHES (cinder / snowdrift / sand) and read fine, because their pour is
  // visual fusion. The line is the REGION CONTRACT: the flesh pools are
  // region liquids (regions.ts rows with stand-in gameplay — vasovagal blood,
  // digesting bile, welling tears) whose truth rasterizes only at their own
  // blob stamps; a formation-planted pool would wear the face over dry
  // ground. Those three never ride a formation.
  const POOL_KINDS = ['blood_pool', 'chyme_pool', 'weep_spring'];
  const poolRiders = formationDefs()
    .flatMap(f => f.pieces.filter(p => POOL_KINDS.includes(p.kind as string)).map(p => `${f.id}:${p.kind}`));
  check('A10 no formation rides a flesh pool kind (region liquids pour at their own stamps)',
    poolRiders.length === 0, poolRiders.join(','));
}

// --- RIG B: the burst, live — pop parity at the strike seam -----------------
{
  const w = makeSimWorld('warrior', 0xf1e51);
  const W = w as unknown as WPriv;
  const p = w.player;
  const stalk = { pos: vec(p.pos.x + 300, p.pos.y), radius: 14, kind: 'eye_stalk' } as Doodad;
  const knot = { pos: vec(p.pos.x - 300, p.pos.y), radius: 16, kind: 'ocular_knot' } as Doodad;
  w.doodads.push(stalk, knot);

  const f0 = W.flashes.length;
  W.strikeSurfaces(p, vec(stalk.pos.x, stalk.pos.y), 40);
  const stalkFlash = W.flashes.length - f0;
  check('B1 the stalk bursts on a landed strike (spliced + gone)',
    !w.doodads.includes(stalk) && stalk.gone === true);
  check('B2 the burst reads on screen (pop flash)', stalkFlash >= 1);

  const f1 = W.flashes.length;
  W.strikeSurfaces(p, vec(knot.pos.x, knot.pos.y), 40);
  const knotFlash = W.flashes.length - f1;
  check('B3 the knot bursts the same way (spliced + gone)',
    !w.doodads.includes(knot) && knot.gone === true);
  check('B4 pop parity: one flash each, both gone', knotFlash === stalkFlash);
}

// --- RIG C: the gaze drop, live — the burst eye stops building ---------------
// One cycle per kind on the SAME seed: plant one eye at watch range (inside
// reach, beyond closeReach), let the real updateGaze build 'beheld', pop the
// eye through the real strike seam, then confirm the build STOPS (stacks
// dwindle, never grow). The two cycles must read EQUAL — "an eye_stalk drops
// out of the gaze filter exactly the way an ocular_knot does".
{
  const gazeCycle = (kind: string): { built: number; gone: boolean; after: number } => {
    const w = makeSimWorld('warrior', 0xf1e52);
    const spec = TILESETS['ocular'].theme.gaze!; // the REAL ocular spec — drawn == tested
    const theme = w.zone.theme as { gaze?: typeof spec };
    theme.gaze = spec;
    const p = w.player;
    const eye = { pos: vec(p.pos.x + 120, p.pos.y), radius: 14, kind } as Doodad;
    w.doodads.push(eye);
    step(w, GAZE_CFG.stackEvery * 2 + 0.4);
    const built = p.statuses.find(s => s.id === 'beheld')?.stacks ?? 0;
    (w as unknown as WPriv).strikeSurfaces(p, vec(eye.pos.x, eye.pos.y), 40);
    const gone = !w.doodads.includes(eye);
    step(w, GAZE_CFG.stackEvery * 3);
    const after = p.statuses.find(s => s.id === 'beheld')?.stacks ?? 0;
    delete theme.gaze; // the arena def is process-shared — leave it as found
    return { built, gone, after };
  };
  const s = gazeCycle('eye_stalk');
  const k = gazeCycle('ocular_knot');
  check('C1 a standing stalk builds beheld at watch range', s.built >= 1, `built ${s.built}`);
  check('C2 the struck stalk is gone from the world', s.gone);
  check('C3 a burst stalk builds NOTHING further (stacks dwindle)', s.after < s.built,
    `${s.built} -> ${s.after}`);
  check('C4 the knot\'s cycle holds the same law', k.built >= 1 && k.gone && k.after < k.built,
    `${k.built} -> ${k.after}`);
  check('C5 pop-for-pop parity: the stalk drops out of the filter exactly as the knot does',
    s.built === k.built && s.after === k.after);
}

// --- RIG D: the formations, on-grammar — forced through generateLayout ------
{
  const SEEDS = 24;
  const seedAt = (s: number): number => 1000003 * (s + 1) + 17; // genqa's ladder
  const arena = { w: 2200, h: 1800 };
  const entry = vec(120, arena.h / 2);
  const exits = [vec(arena.w - 120, arena.h / 2)];
  const THEME = { floor: '#111', grid: '#222', border: '#555', obstacle: '#333', obstacleEdge: '#666', accent: '#999' };
  const gen = (id: string, seed: number): GeneratedLayout => {
    const def: ZoneDef = {
      id: `qa_fleshkit_${id}`, name: `QA ${id}`, level: 8, size: { ...arena },
      theme: THEME, layout: [{ kind: 'formation', count: [1, 1], formation: id }],
      objective: { kind: 'clear' }, exits: [], map: { x: 0, y: 0 }, seed,
    };
    return generateLayout(def, arena, new Rng(seed), entry, exits);
  };
  const kindsOf = (id: string): string[] => {
    const def = formationDefs().find(f => f.id === id)!;
    return def.pieces.map(p => p.kind as string);
  };
  const piecesOf = (layout: GeneratedLayout, kinds: string[]): Doodad[] =>
    layout.doodads.filter(d => kinds.includes(d.kind as string));

  const extentOf = (pts: Doodad[]): number => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const d of pts) {
      x0 = Math.min(x0, d.pos.x); y0 = Math.min(y0, d.pos.y);
      x1 = Math.max(x1, d.pos.x); y1 = Math.max(y1, d.pos.y);
    }
    return Math.hypot(x1 - x0, y1 - y0);
  };
  /** Principal-axis elongation: sqrt of the covariance eigenvalue ratio —
   *  a chain grammar reads LONG (≫1), confetti reads round (≈1). */
  const elongation = (pts: Doodad[]): number => {
    const n = pts.length;
    let mx = 0, my = 0;
    for (const d of pts) { mx += d.pos.x; my += d.pos.y; }
    mx /= n; my /= n;
    let sxx = 0, sxy = 0, syy = 0;
    for (const d of pts) {
      const dx = d.pos.x - mx, dy = d.pos.y - my;
      sxx += dx * dx; sxy += dx * dy; syy += dy * dy;
    }
    sxx /= n; sxy /= n; syy /= n;
    const tr = sxx + syy, det = sxx * syy - sxy * sxy;
    const disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
    const l1 = tr / 2 + disc, l2 = Math.max(1e-6, tr / 2 - disc);
    return Math.sqrt(l1 / l2);
  };
  /** Algebraic (Kasa) circle fit — the arc grammar's honest witness. */
  const circleFit = (pts: Doodad[]): { cx: number; cy: number; r: number } => {
    let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0, sz = 0;
    const n = pts.length;
    for (const d of pts) {
      const x = d.pos.x, y = d.pos.y, z = x * x + y * y;
      sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y;
      sxz += x * z; syz += y * z; sz += z;
    }
    // Solve [sxx sxy sx; sxy syy sy; sx sy n] · [a b c] = [sxz; syz; sz]
    const det3 = (m: number[]): number =>
      m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
    const M = [sxx, sxy, sx, sxy, syy, sy, sx, sy, n];
    const D = det3(M);
    if (Math.abs(D) < 1e-9) return { cx: 0, cy: 0, r: 0 };
    const Da = det3([sxz, sxy, sx, syz, syy, sy, sz, sy, n]);
    const Db = det3([sxx, sxz, sx, sxy, syz, sy, sx, sz, n]);
    const Dc = det3([sxx, sxy, sxz, sxy, syy, syz, sx, sy, sz]);
    const a = Da / D, b = Db / D, c = Dc / D;
    const cx = a / 2, cy = b / 2;
    return { cx, cy, r: Math.sqrt(Math.max(0, c + cx * cx + cy * cy)) };
  };

  interface Gate {
    min: number;              // pieces needed to count a seed as LANDED
    extentCap: number;        // composed, never confetti
    shape: (pts: Doodad[]) => boolean;
    shapeName: string;
  }
  const GATES: Record<string, Gate> = {
    vessel_braid: {
      min: 12, extentCap: 700, shapeName: 'braid elongation ≥ 1.7',
      shape: pts => elongation(pts) >= 1.7,
    },
    knuckle_march: {
      min: 8, extentCap: 780, shapeName: 'meander elongation ≥ 1.45',
      shape: pts => elongation(pts) >= 1.45,
    },
    watching_gallery: {
      // Extent caps bound the piece BBOX DIAGONAL — for round grammars that
      // is √2 × the worst diameter (radius + jitter), not the diameter.
      min: 8, extentCap: 600, shapeName: 'arc circle-fit R∈[80,260], 70% within 55',
      shape: pts => {
        const { cx, cy, r } = circleFit(pts);
        if (r < 80 || r > 260) return false;
        const near = pts.filter(d => Math.abs(Math.hypot(d.pos.x - cx, d.pos.y - cy) - r) <= 55).length;
        return near / pts.length >= 0.7;
      },
    },
    clot_bank: {
      min: 14, extentCap: 680, shapeName: 'orbit band: 75% radial ∈ [44, 300], open court',
      shape: pts => {
        let mx = 0, my = 0;
        for (const d of pts) { mx += d.pos.x; my += d.pos.y; }
        mx /= pts.length; my /= pts.length;
        const inBand = pts.filter(d => {
          const rr = Math.hypot(d.pos.x - mx, d.pos.y - my);
          return rr >= 44 && rr <= 300;
        }).length;
        return inBand / pts.length >= 0.75;
      },
    },
  };

  for (const id of Object.keys(GATES)) {
    const g = GATES[id];
    const kinds = kindsOf(id);
    const seen = new Set<string>();
    let landed = 0, shaped = 0, extentBad = 0;
    let worstExtent = 0;
    for (let s = 0; s < SEEDS; s++) {
      const layout = gen(id, seedAt(s));
      const pts = piecesOf(layout, kinds);
      for (const d of pts) seen.add(d.kind as string);
      if (pts.length < g.min) continue;
      landed++;
      const ext = extentOf(pts);
      worstExtent = Math.max(worstExtent, ext);
      if (ext > g.extentCap) extentBad++;
      if (g.shape(pts)) shaped++;
    }
    check(`D1 ${id}: lands (≥${g.min} pieces) on most seeds`,
      landed >= SEEDS * 0.55, `${landed}/${SEEDS}`);
    check(`D2 ${id}: every piece kind appears (${kinds.join(', ')})`,
      kinds.every(k => seen.has(k)), [...seen].join(','));
    check(`D3 ${id}: composed, never confetti (extent ≤ ${g.extentCap})`,
      extentBad === 0, `worst ${worstExtent.toFixed(0)}`);
    check(`D4 ${id}: on-grammar (${g.shapeName}) on ≥60% of landings`,
      landed > 0 && shaped / Math.max(1, landed) >= 0.6, `${shaped}/${landed}`);
  }

  // D5 determinism: the same seed lays the same formation, byte for byte.
  for (const id of Object.keys(GATES)) {
    const a = gen(id, seedAt(3)).doodads.map(d => `${d.kind}@${d.pos.x.toFixed(2)},${d.pos.y.toFixed(2)}r${d.radius.toFixed(2)}`).join('|');
    const b = gen(id, seedAt(3)).doodads.map(d => `${d.kind}@${d.pos.x.toFixed(2)},${d.pos.y.toFixed(2)}r${d.radius.toFixed(2)}`).join('|');
    check(`D5 ${id}: same seed, same lay`, a === b);
  }
}

console.log(failed ? `\nprobe_fleshkit: ${failed} FAILURE(S)` : '\nprobe_fleshkit: ALL PASS');
process.exit(failed ? 1 : 0);
