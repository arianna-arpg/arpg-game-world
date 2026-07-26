// ---------------------------------------------------------------------------
// THE RAMPAGE FABRIC — temporary doodad destruction with a GUARANTEED return
// (docs/engine/rampage.md).
//
// A colossal body should not queue politely behind a pine tree. Any monster
// wearing `MonsterDef.rampage` PLOWS: fellable standing doodads its true
// surface touches are CRUSHED FLAT — collision, shots, AI sight and the drawn
// vision shadow all read the piece as DOWN through the one blocking trio in
// levelgen.ts (blocksMovement / blocksProjectiles / blocksSightOf consult
// `Doodad.felled` exactly where they already consult door state, so drawn ==
// tested by construction, present and future consumers alike).
//
// THE LAWS:
//   TEMPORARY BY CONSTRUCTION — a felled piece is never spliced, never
//     serialized, never remembered. Three independent roads all lead back to
//     the pristine zone: (1) the in-zone REGROWTH sweep stands every piece
//     back up on an absolute world clock; (2) zone memory carries NO doodads,
//     so any re-entry re-mints the layout from its seed, whole; (3) saves are
//     silent about felled state entirely. However thorough the obliteration
//     mid-fight, the land cannot stay barren — there is no code path that
//     makes the wreckage permanent.
//   THE HOLD — while the CAUSE of a piece's fall still stands in the zone
//     (matched by cause key: the sovereign's event instance, else the def),
//     its regrow clock is pushed forward, never pulled: the land waits out
//     the colossus, then heals staggered (per-piece deterministic jitter) so
//     the country stands back up piecewise, never in one frame.
//   THE ENTOMB LAW — a completing piece whose move surface would swallow a
//     standing body DEFERS (the wyrm-wall precedent): regrowth never buries
//     anyone. Until the stand-up completes, the swelling piece is a ghost —
//     drawn translucent, blocking nothing; the completion flash announces
//     the flip back to solid.
//   FELLABLE IS DERIVED, REFUSAL IS STRUCTURAL — a piece is crushable iff it
//     is a STANDING body (its rule blocks movement, shots, or sight) that
//     carries no live state the fabric cannot honestly suspend: doors,
//     hollow seals, pooled lightwells, landmass shore samples, labeled
//     markers, pits (a hole cannot be crushed), bridges (spans — crushing
//     the only causeway strands), index-paired kinds (cave mouths are
//     load-bearing portals) and brittle kinds (breakables BREAK, with their
//     own spoils law) all refuse by construction. `DoodadRule.fell` overrides
//     either way per kind — false for an authored refusal (the wyrm's own
//     coil walls), true to opt a non-blocking kind in (crushed brush, later).
//
// Deferred seams (documented, not stubbed): a player-side trample stat
// riding the same fellDoodad chokepoint; a toughness ladder (rule.fell as a
// weight floor vs the mass fabric's effectiveWeight); region/wall crushing
// (grid cells are a different fabric — this one speaks doodads only).
// ---------------------------------------------------------------------------

import { doodadRuleOf, pitRegionOf, type Doodad } from './levelgen';

/** The felled state carried ON the doodad (the `evap` idiom — runtime-only,
 *  never persisted, never authored). `wake` = absolute world time the
 *  stand-up swell begins; `k` = the cause key THE HOLD matches against;
 *  `p` = wire-stamped progress on co-op clients (the host never sets it —
 *  clients draw and test off the replicated fraction, self-healing at 20 Hz). */
export type Felled = NonNullable<Doodad['felled']>;

/** Worn by a MonsterDef (`rampage: true | RampageSpec`) — the whole opt-in. */
export interface RampageSpec {
  /** Crush margin beyond true-surface contact (default RAMPAGE_CFG.reach) —
   *  generous enough that the wall is down BEFORE the mover meets it, so the
   *  plow needs no bypass inside the shared collision path. */
  reach?: number;
  /** Worm bodies: the trailing segments crush too (default true — the whole
   *  animal is the plow, not just the face; the passing body's wake is the
   *  debut read). */
  segments?: boolean;
  /** Suppress the per-fell flash/shake (a subtle trampler). */
  quiet?: boolean;
}

export const RAMPAGE_CFG = {
  /** Default crush margin beyond surface contact (world units). */
  reach: 26,
  /** Seconds a crushed piece stays down before its stand-up may begin —
   *  the wake stays visibly ruined through the fight around it. */
  delaySec: 40,
  /** THE HOLD: while a piece's cause still stands in-zone, its wake is
   *  pushed to at least now + holdSec (never pulled) each sweep beat. */
  holdSec: 20,
  /** Per-piece deterministic scatter added to the wake at fell time, so the
   *  country re-stands piecewise, never in one frame. */
  jitterSec: 30,
  /** Seconds of the visible stand-up swell (ghost until complete). */
  regrowSec: 8,
  /** Regrow sweep cadence (the fell pass itself runs per frame, and only
   *  while a rampager actually stands — free otherwise). */
  sweepSec: 0.45,
  /** Crushed drawn face: squash + fade (the renderer's felled pass). */
  face: { sx: 1.12, sy: 0.30, alpha: 0.52, standAlpha: 0.96 },
  /** Per-fell FX (skipped by spec.quiet). */
  fxColor: '#a8916c',
  shake: 1.8,
};

/** Normalize the def-side field (`true` = all defaults). */
export function rampageSpecOf(def: { rampage?: true | RampageSpec } | null | undefined): RampageSpec | null {
  const r = def?.rampage;
  return r ? (r === true ? {} : r) : null;
}

/** May this piece be crushed? Pure derivation over the kind's rule + the
 *  instance's live state — see the fabric header for the whole law. */
export function fellableDoodad(d: Doodad): boolean {
  if (d.felled || d.gone) return false;                 // already down
  if (d.door || d.hollow || d.well) return false;       // live state the fabric can't suspend
  if (d.land || d.label) return false;                  // shore samples / named markers
  if (pitRegionOf(d)) return false;                     // a hole cannot be crushed
  const r = doodadRuleOf(d.kind);
  if (r.fell === false) return false;                   // authored refusal
  if (r.brittle) return false;                          // breakables BREAK (their own spoils law)
  if (r.spans) return false;                            // crushing the causeway strands
  if (r.seedPaired) return false;                       // cave mouths are load-bearing portals
  if (r.fell === true) return true;                     // authored opt-in (non-blocking kinds)
  return !!(r.blocksMove || r.blocksShot || (r.blocksSight ?? r.blocksShot)); // STANDING bodies only
}

/** Stand-up progress: -1 while down (pre-wake), else 0..1 across the swell.
 *  A wire-stamped `p` (co-op client) wins — the host's clock never reaches
 *  the guest, the replicated fraction does. */
export function fellProgress(f: Felled, now: number): number {
  if (f.p != null) return f.p;
  if (now < f.wake) return -1;
  const p = (now - f.wake) / Math.max(0.01, RAMPAGE_CFG.regrowSec);
  return p < 0 ? 0 : p > 1 ? 1 : p;
}

/** The drawn face of a felled piece — one pure resolver shared by the host
 *  renderer and co-op clients, so what either draws IS the replicated truth.
 *  Crushed: squashed flat + faded. Regrowing: the sapling swell back toward
 *  full stature, still a ghost (the entomb law keeps it passable) until the
 *  completion flash pops it solid. */
export function fellFace(f: Felled, now: number): { sx: number; sy: number; alpha: number } {
  const c = RAMPAGE_CFG.face;
  const p = fellProgress(f, now);
  if (p < 0) return { sx: c.sx, sy: c.sy, alpha: c.alpha };
  const t = p > 1 ? 1 : p;
  return {
    sx: c.sx + (1 - c.sx) * t,
    sy: c.sy + (1 - c.sy) * t,
    alpha: c.alpha + (c.standAlpha - c.alpha) * t,
  };
}

/** Per-piece deterministic wake scatter — hashed off the piece's own seat so
 *  the stagger is stable across frames (and identical on every peer). */
export function fellJitter(d: Doodad): number {
  const xi = Math.round(d.pos.x * 8), yi = Math.round(d.pos.y * 8);
  let h = (xi * 73856093) ^ (yi * 19349663);
  h = (h ^ (h >>> 13)) >>> 0;
  return (h % 1000) / 1000 * RAMPAGE_CFG.jitterSec;
}
