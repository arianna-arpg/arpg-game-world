// ---------------------------------------------------------------------------
// THE FORESIGHT ON THE WIRE (W11, docs/engine/shard.md): an enemy wind-up's
// drawn geometry rides its cast row (`CastW.fg`), host resolved, because a
// render shell holds no instance to resolve it from: the client's cast stub
// carried a def with a color and no delivery, and the foresight painter threw
// on it the first time an enemy cast in view, killing every hosted and co-op
// client's loop. The host writes the row from the one resolve
// (engine/foresight.ts foresightOf), the client's stub carries it as
// `CastingState.foresight`, and the painter draws it with the host's strokes.
//
//   THE ROW      [kind, aim x, aim y, reach] for a ground ring, and for a
//                wedge also [inner, arc, bearing], and for a banded swing
//                also [band standoff, band half-width]. Lengths at 2 decimals
//                (the position rows' own), angles at 3 (the watch fan's own),
//                a full ring stated as a whole turn. Absent = the host draws
//                nothing for this cast. A cast is per-frame state: THE
//                IDENTITY ONCE never strikes it and no skipped beat carries it.
//   THE GRID     on a hosted world's frames the codec (net/wireDiet.ts,
//                `dietForesight`) lays the row on the frame's own grid
//                (lengths on 1/posSteps px, the arc and bearing slots on
//                1/turnSteps of a turn) and the client lays it back.
//
// Browser-safe. Both lanes ship the same row: the co-op broadcast (the WebRTC
// host's serializeSnapshot) and the shard's per-socket frames.
// ---------------------------------------------------------------------------

import type { Actor, CastingState } from '../engine/actor';
import { FORESIGHT_FULL_RING, foresightOf, type ForesightGeo } from '../engine/foresight';

/** THE ROW: the kind byte, the aim, the reach; a wedge's inner rim, arc and bearing; a banded
 *  swing's strip. */
export type ForesightW = [kind: number, ax: number, ay: number, reach: number,
  inner?: number, arc?: number, ang?: number, standoff?: number, halfWidth?: number];

/** The row's kind byte: a ground ring, a wedge on its own bearing, a wedge riding the caster's
 *  live facing (a channel's). */
export const FORESIGHT_W_KIND = { ground: 0, wedge: 1, track: 2 } as const;

const TAU = Math.PI * 2;
const r2 = (n: number): number => Math.round(n * 100) / 100;
const r3 = (n: number): number => Math.round(n * 1000) / 1000;

/** THE FORESIGHT ON THE WIRE, the host's half: the row an enemy's cast ships (the painter's
 *  own gate: only an enemy's wind-up draws), or undefined when it draws nothing. */
export function foresightRowOf(a: Actor, cs: CastingState): ForesightW | undefined {
  if (a.team !== 'enemy') return undefined;
  const g = foresightOf(a, cs);
  if (!g) return undefined;
  const kind = g.kind === 'ground' ? FORESIGHT_W_KIND.ground : g.track ? FORESIGHT_W_KIND.track : FORESIGHT_W_KIND.wedge;
  const row: ForesightW = [kind, r2(g.aim.x), r2(g.aim.y), r2(g.reach)];
  if (g.kind === 'ground') return row;
  // A full ring rides as a whole turn, so the client's full-ring test reads as the host's.
  row.push(r2(g.inner), r3(g.arcRad >= FORESIGHT_FULL_RING ? TAU : g.arcRad), r3(g.ang));
  if (g.band) row.push(r2(g.band.standoff), r2(g.band.halfWidth));
  return row;
}

/** THE FORESIGHT ON THE WIRE, the client's half: a row as the painter's geometry (`color`:
 *  the cast row's own, the skill's). A row of the wrong shape reads as none. */
export function foresightOfRow(fg: ForesightW | undefined, color: string): ForesightGeo | null {
  if (!Array.isArray(fg) || fg.length < 4) return null;
  const [kind, ax, ay, reach, inner = 0, arcRad = TAU, ang = 0, standoff, halfWidth] = fg;
  return {
    kind: kind === FORESIGHT_W_KIND.ground ? 'ground' : 'wedge', aim: { x: ax, y: ay }, reach, inner, arcRad, ang,
    ...(standoff !== undefined && halfWidth !== undefined ? { band: { standoff, halfWidth } } : {}),
    ...(kind === FORESIGHT_W_KIND.track ? { track: true as const } : {}),
    color,
  };
}

