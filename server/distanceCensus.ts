// ---------------------------------------------------------------------------
// THE DISTANCE CENSUS (docs/design/performance-lane.md §5 step 1; the M6 plan
// §1.3 item 4): what the bodies on a hosted world are doing, and how far each
// stands from the nearest player. It sizes THE THINKING EDGE before the edge
// is built and reads it once it stands: a body is IDLE when nothing about it
// is mid-anything — not a seat's, not scenery, not held by a state machine,
// not engaged, casting, alerted, recently struck or in a squad that is — and
// every other class names the reason it is not.
//
// One class per body, judged in this order (the first that holds wins):
//   seat      a player's body (World.applyInputs drives it; the brain never does)
//   owned     a seat's minion, companion or construct (the owner chain ends at a seat)
//   dead      a corpse still on the roster
//   passive   scenery (barrels, caches, townsfolk)
//   dormant   neutral until roused (isDormant)
//   held      a state machine owns it: emerging, ambush-armed, burrowed, airborne, a fuse,
//             reforming, tethered, latched, gripped, mounted, vacated, throng-driven,
//             a construct, under a command, wheeled (driven)
//   engaged   aggroed, holding a target, or carrying threat
//   casting   a cast bar or a channel stands
//   alerted   world.time < alertUntil
//   fighting  struck or striking within CENSUS_CFG.idleSec
//   squad     a squad mate is engaged, casting, alerted or fighting
//   idle      none of the above
// The distance read is the body's distance to the nearest STANDING non-keeper
// seat in its own World (not dead, not downed), banded by CENSUS_CFG.bands.
// Pure reads: nothing here writes an actor.
// ---------------------------------------------------------------------------
import type { Actor } from '../src/engine/actor';
import type { World } from '../src/engine/world';
import { isDormant } from '../src/engine/ai';
import { MONSTERS } from '../src/data/monsters';

export const CENSUS_CFG = {
  /** A body struck or striking within this many world seconds is still fighting. */
  idleSec: 3,
  /** Within this many px of a standing seat a body stands in the player's close quarters, whatever its mind is doing. */
  nearPx: 600,
  /** THE DISTANCE BANDS (px) to the nearest standing seat: each entry an upper edge; a last band holds the rest. */
  bands: [600, 1000, 1300, 1600] as readonly number[],
  /** The owner chain is walked this far looking for a seat (a minion's minion). */
  ownerDepth: 4,
};

export type BodyState = 'seat' | 'owned' | 'dead' | 'passive' | 'dormant' | 'held' | 'engaged' | 'casting' | 'alerted' | 'fighting' | 'squad' | 'idle';
export const BODY_STATES: readonly BodyState[] = ['seat', 'owned', 'dead', 'passive', 'dormant', 'held', 'engaged', 'casting', 'alerted', 'fighting', 'squad', 'idle'];

/** One tick's context for a World: the standing seats and the squads with a member mid-fight. */
export interface CensusContext {
  time: number;
  seats: { x: number; y: number }[];
  engagedSquads: Set<number>;
}

const seatOwned = (a: Actor, w: World): boolean => {
  let o = a.owner, depth = 0;
  while (o && depth++ < CENSUS_CFG.ownerDepth) {
    if (w.seatOf(o)) return true;
    o = o.owner;
  }
  return false;
};

const held = (a: Actor, time: number): boolean =>
  !!a.summonReform || a.ambushArmed || (a.emergeUntil !== undefined && a.emergeUntil > time) || !!a.burrow || !!a.leap
  || a.fuse !== undefined || !!a.movementTether || !!a.clingTo || !!a.gripping || a.heldBy !== undefined
  || a.mountId !== undefined || !!a.riderIds?.length || !!a.vacated || !!a.throngDriven || !!a.throngCarried || !!a.throngDive
  || !!a.construct || !!a.aiCommand || (a.defId !== undefined && !!MONSTERS[a.defId]?.driven);

const engaged = (a: Actor): boolean => a.aggroed || a.aiTargetId !== undefined || a.threat.size > 0;
const fighting = (a: Actor, time: number): boolean =>
  (a.aiHitAt >= 0 && time - a.aiHitAt < CENSUS_CFG.idleSec) || (a.lastCombatAt >= 0 && time - a.lastCombatAt < CENSUS_CFG.idleSec);
/** A member in any of these states makes its whole squad busy. */
const busy = (a: Actor, time: number): boolean => engaged(a) || !!a.casting || time < a.alertUntil || fighting(a, time);

/** The standing seats and the busy squads of a World, read once per tick. */
export function censusContext(w: World): CensusContext {
  const seats: { x: number; y: number }[] = [];
  for (const s of w.seats) if (!s.keeper && !s.actor.dead && !s.actor.downed) seats.push({ x: s.actor.pos.x, y: s.actor.pos.y });
  const engagedSquads = new Set<number>();
  const time = w.time;
  for (const a of w.actors) if (a.squadId !== undefined && !a.dead && busy(a, time)) engagedSquads.add(a.squadId);
  return { time, seats, engagedSquads };
}

/** The body's distance to the nearest standing seat in its World (Infinity with none). */
export function nearestSeatPx(a: Actor, ctx: CensusContext): number {
  let best = Infinity;
  for (const s of ctx.seats) {
    const dx = a.pos.x - s.x, dy = a.pos.y - s.y, d2 = dx * dx + dy * dy;
    if (d2 < best) best = d2;
  }
  return best === Infinity ? Infinity : Math.sqrt(best);
}

/** One body's class this tick (the order in the header). */
export function classifyBody(a: Actor, w: World, ctx: CensusContext): BodyState {
  if (w.seatOf(a)) return 'seat';
  if (seatOwned(a, w)) return 'owned';
  if (a.dead) return 'dead';
  if (a.passive) return 'passive';
  if (isDormant(a)) return 'dormant';
  if (held(a, ctx.time)) return 'held';
  if (engaged(a)) return 'engaged';
  if (a.casting) return 'casting';
  if (ctx.time < a.alertUntil) return 'alerted';
  if (fighting(a, ctx.time)) return 'fighting';
  if (a.squadId !== undefined && ctx.engagedSquads.has(a.squadId)) return 'squad';
  return 'idle';
}

export interface DistanceCensus {
  /** Bodies on the roster (the dead included under `states.dead`). */
  actors: number;
  states: Record<BodyState, number>;
  /** Bodies per distance band (CENSUS_CFG.bands' edges, then beyond), the dead excluded. */
  bands: number[];
  /** Idle bodies per distance band. */
  idleBands: number[];
  /** Idle bodies within CENSUS_CFG.nearPx of a seat. */
  idleNear: number;
  /** Idle bodies beyond CENSUS_CFG.nearPx of every seat: THE THINKING EDGE's candidates. */
  edgeable: number;
  /** Bodies with no standing seat in their World (banded as beyond). */
  unseated: number;
}

/** THE DISTANCE CENSUS over every World of a host (each body judged against its own World's seats). */
export function distanceCensus(worlds: readonly World[]): DistanceCensus {
  const states = Object.fromEntries(BODY_STATES.map(s => [s, 0])) as Record<BodyState, number>;
  const bands = new Array<number>(CENSUS_CFG.bands.length + 1).fill(0);
  const idleBands = new Array<number>(CENSUS_CFG.bands.length + 1).fill(0);
  let actors = 0, idleNear = 0, edgeable = 0, unseated = 0;
  for (const w of worlds) {
    const ctx = censusContext(w);
    for (const a of w.actors) {
      actors++;
      const state = classifyBody(a, w, ctx);
      states[state]++;
      if (state === 'dead') continue;
      const d = nearestSeatPx(a, ctx);
      if (d === Infinity) unseated++;
      let band = CENSUS_CFG.bands.length;
      for (let i = 0; i < CENSUS_CFG.bands.length; i++) if (d < CENSUS_CFG.bands[i]) { band = i; break; }
      bands[band]++;
      if (state === 'idle') {
        idleBands[band]++;
        if (d < CENSUS_CFG.nearPx) idleNear++; else edgeable++;
      }
    }
  }
  return { actors, states, bands, idleBands, idleNear, edgeable, unseated };
}
