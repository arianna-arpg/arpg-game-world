// ---------------------------------------------------------------------------
// THE FORESIGHT (the skill-mode audit of 2026-08-19; W11 THE FORESIGHT ON THE
// WIRE, docs/engine/shard.md): an enemy wind-up marks where its blow will land.
// This module is the painter's RESOLVE as one pure function of the caster and
// its cast: the same stat reads, the same reach formulae and the same
// bandSwingGeo the strike seats, so the drawing is the truth (stat scaling and
// all). The renderer draws from the geometry alone (render/vis/foresightLayer.ts).
//
//   ground  a ground footprint rings its landing spot (the cast's stamped aim,
//           the delivery's own radius, unscaled).
//   wedge   a melee swing or a breath cone wedges out from the body along the
//           aim; a hostile nova rings the caster; an edge-only shape cuts its
//           rim alone; a banded swing draws its strip across the front.
//
// THE FORESIGHT ON THE WIRE: a render shell holds no instance to resolve (its
// cast stub's def carries a color and little else), so the host ships its own
// geometry on the cast row (`CastW.fg`, net/foresightWire.ts) and the stub
// carries it as `CastingState.foresight` (null: the host draws nothing). The
// painter reads `foresightView`: a stub's row, else this resolve. THE SOLO
// INVARIANT: a cast the World runs never carries the field, so solo and every
// host resolve exactly as the painter always did, pixel for pixel.
// ---------------------------------------------------------------------------

import type { Actor, CastingState } from './actor';
import type { Vec2 } from '../core/math';
import { dist } from '../core/math';
import { AOE_SHAPE, bandSwingGeo, instanceDelivery, instanceMods, skillContextTags } from './skills';

/** What one wind-up draws: a ground ring at `aim`, or a wedge out of the caster's body. */
export interface ForesightGeo {
  kind: 'ground' | 'wedge';
  /** Where the blow is aimed (the cast's stamped aim, else its live aim). */
  aim: Vec2;
  /** The ring's radius (ground) or the wedge's reach from the body (wedge). */
  reach: number;
  /** An edge-only shape's inner rim (0 = the whole figure). */
  inner: number;
  /** The wedge's arc in radians (a full ring at 2π; ground: 2π). */
  arcRad: number;
  /** The wedge's bearing (ground and nova: 0). */
  ang: number;
  /** A banded swing's strip (THE CROSSING STRIP): its centre `standoff` ahead of the body
   *  along `ang`, half as wide as `halfWidth` at the full reach. */
  band?: { standoff: number; halfWidth: number };
  /** A channel's wedge rides the body's live facing (its pulses do); `ang` is that facing
   *  when it was resolved. */
  track?: true;
  /** The skill's color. */
  color: string;
}

/** The painter's own full-ring test: an arc this close to a turn draws as a ring. */
export const FORESIGHT_FULL_RING = Math.PI * 2 - 0.01;

/** THE FORESIGHT's resolve: what this cast's wind-up draws, or null (a guard, a summon, an
 *  allied nova, a leap, a projectile: nothing). THE STRUCTURAL GUARD: a cast stub with no
 *  catalog def (a render shell's, whose def carries no id or no delivery) resolves nothing,
 *  so no stub can throw here. */
export function foresightOf(a: Actor, fc: CastingState): ForesightGeo | null {
  const def = fc.inst?.def;
  if (!def || typeof def.id !== 'string' || !def.delivery) return null;
  // THE RESOLVED VIEW (skill-mode audit, M1, the M0 find): the wedge reads what the resolve
  // will fire. A MonsterDef tree pin (or a possessed body's picked kit) draws its true arc:
  // the telegraph can never lie about a branch.
  const del = instanceDelivery(fc.inst);
  if (del.type === 'ground') {
    const aim = fc.lockedAim ?? fc.aim;
    return { kind: 'ground', aim: { x: aim.x, y: aim.y }, reach: del.radius, inner: 0, arcRad: Math.PI * 2, ang: 0, color: def.color };
  }
  if (!((del.type === 'melee' || del.type === 'cone'
    || (del.type === 'nova' && del.affects !== 'allies')) && fc.mode !== 'guard')) return null;
  // Mirror the resolve's TRUE geometry (world.ts melee/cone/nova cases): same stat
  // multipliers, same reach formulae, the wedge never lies. Channels track the live facing
  // (their pulses do); everything else aims down the stamp the resolve will fire at.
  const tags = skillContextTags(def);
  const extra = instanceMods(fc.inst);
  const aim = fc.lockedAim ?? fc.aim;
  const aoeScale = a.sheet.get('aoeRadius', tags, extra);
  const ang = del.type === 'nova' ? 0
    : fc.mode === 'channel' || dist(a.pos, aim) < 2
      ? a.facing
      : Math.atan2(aim.y - a.pos.y, aim.x - a.pos.x);
  const reach = del.type === 'melee'
    ? (a.radius + del.range) * a.sheet.get('meleeReach', tags, extra)
    : del.type === 'cone'
      ? del.range * aoeScale * a.sheet.get('meleeReach', tags, extra)
      : del.radius * aoeScale;
  const arcRad = del.type === 'nova' ? Math.PI * 2
    : Math.min(Math.PI * 2, (del.arcDeg * Math.PI / 180)
      * (del.type === 'melee' ? Math.sqrt(aoeScale) : 1)
      * a.sheet.get('swingArc', tags, extra));
  // Edge-band shapes (Surgical Strike, Shock Nova): only the rim cuts.
  const inner = del.type !== 'melee' && del.edgeOnly ? reach * del.edgeOnly : 0;
  // THE CROSSING STRIP's foresight: a banded swing (MeleeDelivery.shape 'band' as the
  // aoeShape query's base; a sigil override still wins, exactly as the resolve reads it)
  // foreshadows its STRIP through the same bandSwingGeo the strike seats.
  const swingShape = del.type === 'melee'
    ? a.sheet.get('aoeShape', tags, extra, AOE_SHAPE[del.shape ?? 'circle']) : 0;
  const band = swingShape === AOE_SHAPE.band ? bandSwingGeo(reach, arcRad) : null;
  return {
    kind: 'wedge', aim: { x: aim.x, y: aim.y }, reach, inner, arcRad, ang,
    ...(band ? { band: { standoff: band.standoff, halfWidth: band.halfWidth } } : {}),
    ...(del.type !== 'nova' && fc.mode === 'channel' ? { track: true as const } : {}),
    color: def.color,
  };
}

/** THE FORESIGHT ON THE WIRE, the painter's one read: a render shell's stub carries the
 *  host's own geometry (null: the host draws nothing) and never resolves; every cast the
 *  World runs resolves its own. */
export function foresightView(a: Actor, fc: CastingState): ForesightGeo | null {
  return fc.foresight !== undefined ? fc.foresight : foresightOf(a, fc);
}
