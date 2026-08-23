// ---------------------------------------------------------------------------
// THE SOFT DRY — render-side easing for COSMETIC evaporating dress doodads,
// so a drying blast pock fades out of the world instead of stepping and
// popping.
//
// The engine's evaporation sweep (World.updateEvaporation + World.EVAP) is a
// DELIBERATE perf law: radius is the one tested truth, it contracts in
// QUANTIZED steps (stepFrac floored at stepMin) so the ground-chunk baker
// pays a bounded stale trickle instead of per-frame churn, and at minRadius
// the doodad retires outright in one frame. For gameplay-surface wearers
// (drying pools, creep wakes) that is the whole point — drawn == tested at
// every step. But for PURE SET-DRESSING (blast pocks, non-solid weather
// dress) the stepwise shrink plus the end-of-life splice read as pops. This
// module is the DRAWN ease over the same engine clock — the sweep's timing,
// step math and tested radius are untouched:
//
//   - THE ROUTER (dressFading): only COSMETIC dress qualifies — a piece
//     wearing one of the transience tags (Doodad.blastDress /
//     Doodad.weatherDress — never kind-string guessing) whose KIND carries
//     no registered DoodadRule collision (blocksMove/blocksShot/blocksSight),
//     no rule-borne gameplay (effect/contact/brittle/warms) and no ground
//     region (doodadGroundIds — wading/traction/path truth). Drawn == tested
//     holds at this seam BY CONSTRUCTION: an admitted piece has no tested
//     surface at all, so the eased pixels have nothing to disagree with. A
//     drying pool or a solid hell fin refuses here and keeps the engine's
//     honest stepped face. (The dress kin — eventDress, holdDress, squish's
//     deferred squishesInto stains — can join later by extending this ONE
//     predicate, never by naming kinds.)
//   - THE FACE (softDryFace): a continuous alpha + drawn-scale ramp derived
//     from the piece's own evap clock. The drawn radius interpolates the
//     sweep's NEXT step across its wait, so the quantized shrink reads as
//     one glide; alpha dissolves over the last easeSec seconds of the
//     piece's remaining life (replaying the sweep's own quantized walk to
//     the retiring commit), reaching ~0 BEFORE the minRadius splice so the
//     removal lands invisible. A rate-limited glide (the canopyEyes fade
//     WeakMap idiom) smooths the one discontinuity the clock allows — the
//     per-zone cap forcing the oldest pock dry NOW (evap.t = 0) — while the
//     deadline-honest floor keeps even that glide at ~0 by splice time.
//
// Dials in VIS_CFG.dressFade. Canvas-free by design (pure predicates + math)
// so the headless probe (balance/probe_dressfade.ts) pins the same numbers
// the renderer draws.
// ---------------------------------------------------------------------------

import { doodadRuleOf, type Doodad, type DoodadKind } from '../../engine/levelgen';
import { doodadGroundIds } from '../../world/regions';
import { World } from '../../engine/world';
import { VIS_CFG } from './visConfig';

/** Per-kind cosmetic verdict cache. Kind rules register at boot and hold for
 *  the session (the workshop's live re-registration is a dev tool; a stale
 *  verdict there is cosmetic-only and clears on reload). */
const kindVerdict = new Map<string, boolean>();

function cosmeticKind(kind: string): boolean {
  let v = kindVerdict.get(kind);
  if (v === undefined) {
    const r = doodadRuleOf(kind as DoodadKind);
    v = !r.blocksMove && !r.blocksShot && !(r.blocksSight ?? !!r.blocksShot)
      && !r.effect && !r.contact && !r.brittle && !r.warms
      && !doodadGroundIds().includes(kind);
    kindVerdict.set(kind, v);
  }
  return v;
}

/** THE ROUTER: is this doodad a cosmetic dress piece mid-evaporation — one
 *  the soft-dry pass should draw eased instead of the normal lane? */
export function dressFading(d: Doodad): boolean {
  if (!d.evap || d.gone) return false;
  // Route by the transience tags only (blast pocks, weather dress, and THE
  // DISSOLUTION GRAMMAR's settled debris — engine/dissolve.ts: the pile a
  // break left, non-blocking by rule, fading through this same ease).
  if (!d.blastDress && !d.weatherDress && !d.dissolveDebris) return false;
  return cosmeticKind(d.kind);
}

export interface DryFace {
  /** Draw alpha multiplier, 1 standing → ~0 at the retirement splice. */
  alpha: number;
  /** Drawn-scale multiplier about the piece's own center — carries the
   *  engine's stepped radius as one continuous shrink. */
  scale: number;
}

/** Per-piece glided face (the canopyEyes fade WeakMap idiom: state is gone
 *  when the doodad is). Mutated in place — no per-frame allocation. */
const glided = new WeakMap<Doodad, { a: number; s: number }>();

/** THE FACE: the eased draw for one drying cosmetic piece. Pure function of
 *  the piece's evap clock plus the glide state; `dt` is the render frame's
 *  own delta (0 holds the face still). */
export function softDryFace(d: Doodad, dt: number): DryFace {
  const ev = d.evap;
  const cfg = VIS_CFG.dressFade;
  const E = World.EVAP;
  if (!ev || !(ev.rate > 0)) return { alpha: 1, scale: 1 };
  // Seconds until the retiring commit — replays the sweep's own quantized
  // walk (bounded: radius sheds ≥ stepMin per commit).
  let remaining = Math.max(0, ev.t);
  let r = d.radius;
  for (let i = 0; i < 64 && r > E.minRadius; i++) {
    const step = Math.max(E.stepMin, r * E.stepFrac);
    r -= step;
    if (r <= E.minRadius) break; // this commit retires — the clock ends here
    remaining += step / ev.rate;
  }
  // The continuous drawn radius: the sweep's NEXT step, interpolated across
  // its wait (flat through the dwell while t >> one step's pace).
  const step = Math.max(E.stepMin, d.radius * E.stepFrac);
  const frac = Math.min(1, Math.max(0, 1 - ev.t / (step / ev.rate)));
  const eff = d.radius - step * frac;
  const targetS = Math.max(0.2, eff / Math.max(1e-3, d.radius));
  const targetA = Math.min(1, remaining / cfg.easeSec);
  let g = glided.get(d);
  if (!g) {
    // First sight seeds AT the target — a piece met mid-dry never fades IN.
    g = { a: targetA, s: targetS };
    glided.set(d, g);
    return { alpha: g.a, scale: g.s };
  }
  if (targetA >= g.a) g.a = targetA;
  else {
    // Fall rate-limited (softens the cap's evap.t = 0 stamp) but DEADLINE-
    // HONEST: never slower than what still reaches 0 by the splice (the
    // floor is a divide guard only — near the deadline the clamp below
    // simply snaps to the ~0 target).
    const fall = Math.max(cfg.fadeRate, g.a / Math.max(remaining, 1e-3));
    g.a = Math.max(targetA, g.a - fall * dt);
  }
  g.s = targetS >= g.s ? targetS : Math.max(targetS, g.s - cfg.scaleRate * dt);
  return { alpha: g.a, scale: g.s };
}
