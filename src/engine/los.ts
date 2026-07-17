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

export type OccChannel = 'shot' | 'sight';

/** What castRay needs from the world — the doodad spatial index and the
 *  (optional) walk grid. World satisfies it structurally. */
export interface OccEnv {
  doodadsAt(x: number, y: number): readonly Doodad[];
  walk: WalkField | null;
}

export interface RayHit {
  x: number;
  y: number;
  /** Distance from the ray origin to the hit, px. */
  d: number;
  /** What stopped it. */
  kind: 'doodad' | 'region';
}

/** The occlusion fabric's modular thresholds + delivery defaults (the
 *  avoid-hardcoding registry: tune HERE, never inline). */
export const LOS_CFG = {
  /** Pull a clipped placement back from the wall face by this much (px), so
   *  a clamped cast point lands on the castable side of the blocking cell. */
  clipBackoff: 12,
  /** Per-delivery-type DEFAULT occlusion attitude. 'blocked' = walls eat it;
   *  types absent here are 'free' (melee reach, self buffs, movement — no
   *  remote firing line to cut). A skill's own `occlusion` field overrides;
   *  a positive `phasing` stat (support-graftable) frees the whole use. */
  delivery: {
    projectile: 'blocked', cone: 'blocked', nova: 'blocked',
    target: 'blocked', ground: 'blocked', storm: 'blocked',
  } as Record<string, 'blocked' | 'free' | undefined>,
  /** Which delivery types' ZONES occlude per-victim while they tick/pulse.
   *  Ground placements do (a wall shields you from the burning field's far
   *  side); storm strikes fall from the SKY and melee sweeps are traveling
   *  body-momentum — neither consults walls. */
  zoneTickTypes: { ground: true } as Record<string, boolean | undefined>,
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
};

/** First blocker along from→to on the given channel, or null when clear.
 *  Doodad hits are exact ray/circle entries; grid hits are half-cell samples. */
export function castRay(
  env: OccEnv,
  from: { x: number; y: number }, to: { x: number; y: number },
  channel: OccChannel,
): RayHit | null {
  const dx = to.x - from.x, dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len <= 1e-6) return null;
  let bestT = Infinity;
  let kind: RayHit['kind'] = 'doodad';

  // --- doodad surfaces (spatial-index buckets sampled along the segment) ----
  // Geometry rides the hit-surface fabric (engine/shapes.ts): discs keep the
  // exact classic ray/circle entry math; oblong surfaces (door slabs) resolve
  // by the slab test — so an arrow-slit beside a closed door's slab line
  // reads exactly as the pixels promise. Start-inside blocks at t=0 (the
  // veil rule) on every shape.
  const steps = Math.ceil(len / SPATIAL_CFG.queryPad);
  for (let i = 0; i <= steps; i++) {
    const ts = steps > 0 ? i / steps : 0;
    for (const o of env.doodadsAt(from.x + dx * ts, from.y + dy * ts)) {
      if (channel === 'shot' ? !blocksProjectiles(o) : !blocksSightOf(o)) continue;
      const t = rayShapeT(hitSurfaceOf(o, channel), o.pos.x, o.pos.y, from.x, from.y, dx, dy);
      if (t !== null && t < bestT) { bestT = t; kind = 'doodad'; }
    }
  }

  // --- grid cells (half-cell ray-march; start cell never self-blocks) -------
  if (env.walk instanceof GridWalkField) {
    const step = (env.walk.cellSize ?? 30) / 2;
    const limit = Math.min(len, bestT === Infinity ? len : bestT * len);
    for (let s = step; s < limit; s += step) {
      const k = regionKind(env.walk.regionAt(from.x + dx * (s / len), from.y + dy * (s / len)));
      if (channel === 'shot' ? k?.blocksShot : k?.blocksSight) {
        const t = s / len;
        if (t < bestT) { bestT = t; kind = 'region'; }
        break;
      }
    }
  }

  if (bestT === Infinity) return null;
  return { x: from.x + dx * bestT, y: from.y + dy * bestT, d: bestT * len, kind };
}
