// ---------------------------------------------------------------------------
// LINE OF SIGHT / LINE OF FIRE — the one occlusion raycast.
//
// Two CHANNELS ride one ray, resolved entirely from data the terrain already
// declares (nothing here hardcodes a kind):
//
//   'sight' — what EYES cross. Doodads gate via blocksSightOf (full crown
//             radius: the canopy is real to eyes) and grid cells via
//             RegionKind.blocksSight. This is the AI-perception channel.
//   'shot'  — what EFFECTS cross: projectiles, rays, placements, chain hops.
//             Doodads gate via blocksProjectiles at bodyRadiusOf (the TRUNK —
//             arrows fly under leaves and stop on the bole) and grid cells via
//             RegionKind.blocksShot.
//
// The semantics the terrain data promises hold everywhere this ray is asked:
// true walls (wall/rampart/flesh_wall/…, rock/cliff doodads) stop both
// channels; chasm-likes (void, chasm/void_chasm discs, water, ledges) stop
// NEITHER — bodies can't cross but shots and eyes sail over; the partial rows
// keep their character (window/parapet: see + shoot through, never walk;
// giant_kelp: walk-through fronds that break sight only).
//
// Geometry notes:
//   - Doodad candidates come from the spatial index (env.doodadsAt), sampled
//     along the segment at queryPad cadence — coverage insertion guarantees
//     every disc that could touch the segment shows up in a sampled bucket.
//     The hit is the exact ray/circle ENTRY point (ordered, so clipping works).
//     A ray STARTING inside a blocking disc counts as blocked at t=0 — the
//     veil rule (under an unbroken crown you are blind both ways) preserved
//     from the original lineOfSight sweep.
//   - Grid cells are ray-marched at half-cell steps from the FIRST step (the
//     start cell never self-blocks), matching the projectile masonry sweep.
//
// World wraps this as lineOfSight / lineOfFire / clipShot; every consumer
// (deliveries, AI perception, aim assist, channel grips) goes through those.
// ---------------------------------------------------------------------------

import type { Doodad } from './levelgen';
import { blocksProjectiles, blocksSightOf, hitSurfaceOf } from './levelgen';
import { rayShapeT } from './shapes';
import { regionKind } from '../world/regions';
import { GridWalkField } from '../world/gridWalk';
import type { WalkField } from '../world/walk';
import { SPATIAL_CFG } from './spatial';
import { tierElevOf } from './tiers';

export type OccChannel = 'shot' | 'sight';

/** THE ELEVATION LAW (the tier fabric, engine/tiers.ts): the heights a ray
 *  travels between, in STORY units — lerped along the segment. A blocking
 *  region cell that is tier FLOOR (tierElevOf k) stops the ray only while
 *  the lerped height is BELOW its deck; a true wall (elev null) stops every
 *  height. A blocking doodad fills `LOS_CFG.elev.doodadBand` stories of air
 *  above its own story (Doodad.tier). Omitted = the legacy flat read (every
 *  blocker blocks) — untiered zones pay nothing and change nothing. */
export interface RayElev { from: number; to: number }

/** What castRay needs from the world — the doodad spatial index and the
 *  (optional) walk grid. World satisfies it structurally. */
export interface OccEnv {
  doodadsAt(x: number, y: number): readonly Doodad[];
  walk: WalkField | null;
  /** THE VAPOR RIDE (optional): an OPAQUE MEDIUM sample for the 'sight'
   *  channel — true where eyes cannot pass (a planted steam bank's live
   *  lobes: engine/fog.ts FogBankDef.occludesSight → FogField.occludesAt).
   *  Sampled along the segment at the doodad cadence, START INCLUDED (the
   *  veil rule: inside the white you are blind both ways); the first opaque
   *  sample stops the ray as kind 'medium'. Shots never consult it (steam
   *  is not a wall). Absent or always-false == the legacy ray, byte for
   *  byte. */
  opaqueAt?(x: number, y: number): boolean;
}

export interface RayHit {
  x: number;
  y: number;
  /** Distance from the ray origin to the hit, px. */
  d: number;
  /** What stopped it ('medium' = an opaque vapor sample — eyes only). */
  kind: 'doodad' | 'region' | 'medium';
}

/** The occlusion fabric's modular thresholds + delivery defaults (the
 *  avoid-hardcoding registry: tune HERE, never inline). */
export const LOS_CFG = {
  /** Pull a clipped placement back from the wall face by this much (px), so
   *  a clamped cast point lands on the castable side of the blocking cell. */
  clipBackoff: 12,
  /** Per-delivery-type DEFAULT occlusion attitude. 'blocked' = walls eat it
   *  AND the refusal lanes engage (hostile targeting skips occluded victims,
   *  the AI holds fire per aiHoldFire); 'travel' = THE AFFORDANCE DOCTRINE
   *  (2026-08-10): the use is gated as a TRAVEL LINE — the cast is NEVER
   *  REFUSED and never stuck, it resolves to the last afforded point along
   *  its line (a leap straight into a wall is a leap that lands where it
   *  began), with CORNER FORGIVENESS via affordTravel below — while every
   *  refusal lane stays disengaged (they key on 'blocked': a Shadow Step
   *  still FINDS its walled foe, then lands honestly short of the wall).
   *  Types absent here are 'free' (melee reach, self buffs — no remote
   *  firing line to cut). DASH is absent BY CONSTRUCTION, not oversight:
   *  its travel is stepped through the mover's own ground clamp every
   *  frame (steppedClamp — a body sweep, not a remote line), so walls
   *  already arrest it and a second gate here would double-judge it.
   *  A skill's own `occlusion` field overrides; a positive `phasing` stat
   *  (support-graftable — Wraith Passage) frees the whole use, so the
   *  through-wall blink stays a BUILD CHOICE, never an accident. */
  delivery: {
    projectile: 'blocked', cone: 'blocked', nova: 'blocked',
    target: 'blocked', ground: 'blocked', storm: 'blocked',
    blink: 'travel', leap: 'travel',
  } as Record<string, 'blocked' | 'free' | 'travel' | undefined>,
  /** THE AFFORDANCE DOCTRINE's forgiveness margin (px): how far sideways a
   *  travel line may be nudged to find a clear lane. Grazing a corner or a
   *  slim trunk by up to this much never truncates the travel; geometry
   *  thick enough to bar the center AND both nudged lanes is a genuine
   *  wall. [FLAGGED dial — awaiting blessing.] */
  afford: { nudge: 10 },
  /** Which delivery types' ZONES occlude per-victim while they tick/pulse.
   *  Ground placements do (a wall shields you from the burning field's far
   *  side); storm strikes fall from the SKY and melee sweeps are traveling
   *  body-momentum — neither consults walls. */
  zoneTickTypes: { ground: true } as Record<string, boolean | undefined>,
  /** THE BAND LAW: which TETHER band lanes occlude per-victim while they
   *  burn. A band is not a placement but a line STRUNG between two anchors,
   *  so the arc has to run from BOTH of them to the ground it burns —
   *  masonry laid anywhere across that run eats the bite (and the ally
   *  mend), exactly as a wall shields you from a burning field's far side
   *  (zoneTickTypes). Keyed by the band's LINK lane rather than by the
   *  laying skill's delivery type, because a band is a lane of its own
   *  however it was strung (a summon's caster-link is not its summon
   *  skill's delivery): TetherSpec.link's three kinds, plus 'pack'
   *  (MonsterDef.tether kin arcs) and 'zap' (the momentary, payload-less
   *  visual arcs — a drawn beam is not a hit surface). Lanes absent here
   *  are 'free', exactly as unlisted delivery types are. The laying skill's
   *  own `occlusion` word overrides, and a positive `phasing` frees the
   *  whole band. */
  tetherLinks: {
    caster: 'blocked', network: 'blocked', target: 'blocked', pack: 'blocked',
  } as Record<string, 'blocked' | 'free' | undefined>,
  /** Delivery types an AI HOLDS FIRE on without a clear firing line (it
   *  repositions instead — pathing does the rest). Free/phasing skills are
   *  never held: the meteor caster keeps bombarding from behind its wall. */
  aiHoldFire: {
    projectile: true, cone: true, target: true, ground: true, storm: true,
  } as Record<string, boolean | undefined>,
  /** Master switch: AI perception is LoS-gated (PerceptionSpec.xray opts a
   *  monster out — tremor-sense reads through stone). */
  perception: true,
  /** Seconds a HELD lock survives without sight before the thread snaps —
   *  the hunter rounds the corner after you instead of shrugging the moment
   *  you break the line. PerceptionSpec.memory extends it per-monster. */
  chaseMemory: 5,
  /** Perception-ray memo TTL (seconds): acquireTarget probes candidates
   *  every tick; the memo keeps the rays at event rate. */
  memoTtl: 0.25,
  /** TTL spread (fraction of memoTtl): each PAIR wears its own deterministic
   *  offset inside ±memoJitter/2. Without it every ray cached in the same
   *  moment (a zone load seeds hundreds at once) expires in the same tick,
   *  re-marches together, and re-stamps the same deadline — a self-
   *  resynchronizing raycast stampede every TTL, measured as the crowded-
   *  zone frame spike. Keyed off the pair (never the rng stream), so seeded
   *  sim runs stay byte-deterministic. 0 restores the shared clock. */
  memoJitter: 0.7,
  /** Seconds an AI channel keeps gnawing a wall before it lets the grip go
   *  (the ray caster gives up and repositions). */
  channelGrace: 0.9,
  /** Controller aim assist skips wall-occluded targets (the veil rule,
   *  extended to stone). */
  aimAssist: true,
  /** THE ELEVATION LAW's dials (the tier fabric — see RayElev). `eye` lifts
   *  a SIGHT ray's endpoints above their floors (a butte pair duels over
   *  open air; a valley eye clears a rim-stander over the lip once the
   *  lerped line tops the cliff — and only then). Shot rays ride FLAT at
   *  the caster's story + eye, which reduces to the projectile sweep's own
   *  law (block iff elev > story) — decision and flight can never disagree.
   *  `doodadBand` is the stories of air a solid body fills above its own
   *  floor: a valley trunk stops valley rays; a deck-height flight sails
   *  over it (and a deck rock never shades the street below). */
  elev: { eye: 0.62, doodadBand: 1 },
};

/** First blocker along from→to on the given channel, or null when clear.
 *  Doodad hits are exact ray/circle entries; grid hits are half-cell samples. */
export function castRay(
  env: OccEnv,
  from: { x: number; y: number }, to: { x: number; y: number },
  channel: OccChannel,
  elev?: RayElev,
): RayHit | null {
  const dx = to.x - from.x, dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len <= 1e-6) return null;
  let bestT = Infinity;
  let kind: RayHit['kind'] = 'doodad';
  const band = LOS_CFG.elev.doodadBand;

  // --- doodad surfaces (spatial-index buckets sampled along the segment) ----
  // Geometry rides the hit-surface fabric (engine/shapes.ts): discs keep the
  // exact classic ray/circle entry math; oblong surfaces (door slabs) resolve
  // by the slab test — so an arrow-slit beside a closed door's slab line
  // reads exactly as the pixels promise. Start-inside blocks at t=0 (the
  // veil rule) on every shape.
  const steps = Math.ceil(len / SPATIAL_CFG.queryPad);
  // THE VAPOR RIDE: the 'sight' channel samples the env's opaque medium at
  // the same cadence — the first swallowed sample stops the eye (start
  // included: the veil rule). Shots never ask; an env without the hook or
  // with no medium standing pays one optional-call check per sample.
  const opaque = channel === 'sight' && env.opaqueAt !== undefined;
  for (let i = 0; i <= steps; i++) {
    const ts = steps > 0 ? i / steps : 0;
    if (opaque && ts < bestT && env.opaqueAt!(from.x + dx * ts, from.y + dy * ts)) {
      bestT = ts; kind = 'medium';
    }
    for (const o of env.doodadsAt(from.x + dx * ts, from.y + dy * ts)) {
      if (channel === 'shot' ? !blocksProjectiles(o) : !blocksSightOf(o)) continue;
      const t = rayShapeT(hitSurfaceOf(o, channel), o.pos.x, o.pos.y, from.x, from.y, dx, dy);
      if (t === null || t >= bestT) continue;
      if (elev) {
        // THE ELEVATION LAW: a body fills [tier, tier+band) stories of air —
        // it stops the ray only where the lerped height crosses that band.
        const dT = o.tier ?? 0;
        const h = elev.from + (elev.to - elev.from) * t;
        if (h < dT || h >= dT + band) continue;
      }
      bestT = t; kind = 'doodad';
    }
  }

  // --- grid cells (half-cell ray-march; start cell never self-blocks) -------
  if (env.walk instanceof GridWalkField) {
    const step = (env.walk.cellSize ?? 30) / 2;
    const limit = Math.min(len, bestT === Infinity ? len : bestT * len);
    for (let s = step; s < limit; s += step) {
      const kId = env.walk.regionAt(from.x + dx * (s / len), from.y + dy * (s / len));
      const k = regionKind(kId);
      if (channel === 'shot' ? k?.blocksShot : k?.blocksSight) {
        // THE ELEVATION LAW: a blocking cell that is tier FLOOR stops only
        // rays below its deck (a butte top is open ground to its own story
        // and to any line that clears the lip); true walls stop everything.
        if (elev) {
          const e = tierElevOf(kId);
          if (e !== null && elev.from + (elev.to - elev.from) * (s / len) >= e) continue;
        }
        const t = s / len;
        if (t < bestT) { bestT = t; kind = 'region'; }
        break;
      }
    }
  }

  if (bestT === Infinity) return null;
  return { x: from.x + dx * bestT, y: from.y + dy * bestT, d: bestT * len, kind };
}

/** THE AFFORDANCE READ (the 'travel' attitude's corner forgiveness): judge
 *  from→to as a TRAVEL LINE rather than a firing line. The center ray is
 *  asked first; when it is barred, two parallel lanes nudged ±afford.nudge
 *  sideways are tried, and ANY clear lane AFFORDS the whole travel — a
 *  clipped corner or a grazed slim trunk never truncates the verb (the
 *  traveler is allowed a sidestep's imprecision; lightly tapping a rock
 *  must not stop the player). Geometry that bars every lane is a genuine
 *  wall: the travel clips at the CENTER ray's hit. Lanes are judged whole
 *  (start included — hugging a blocker grants no passage through it, the
 *  veil rule per lane). Returns null when the travel is afforded, else the
 *  center hit to clip at. Pure and rng-free: a clear line costs one ray
 *  and answers byte-identically to castRay alone. */
export function affordTravel(
  env: OccEnv,
  from: { x: number; y: number }, to: { x: number; y: number },
  elev?: RayElev,
): RayHit | null {
  const hit = castRay(env, from, to, 'shot', elev);
  if (!hit) return null;
  const dx = to.x - from.x, dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len <= 1e-6) return hit;
  const px = -dy / len, py = dx / len;
  for (const side of [1, -1]) {
    const off = LOS_CFG.afford.nudge * side;
    if (!castRay(env,
      { x: from.x + px * off, y: from.y + py * off },
      { x: to.x + px * off, y: to.y + py * off }, 'shot', elev)) return null;
  }
  return hit;
}
