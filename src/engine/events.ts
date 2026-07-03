// ---------------------------------------------------------------------------
// ZONE EVENTS — the on-entry decision (pure).
//
// When you walk into held ground, the world may be in the middle of something:
// a faction PATROL marching its beat, a CARAVAN moving goods (which a rival may
// ambush), or a SIEGE — an invader storming a camp the owner holds. This module
// is just the data + the choice; the engine (zoneEvent.ts) does the spawning.
// No `World` import — it reads a snapshot the engine assembles from sim state.
// ---------------------------------------------------------------------------

import { factionStance } from '../data/monsters';

export type ZoneEventKind = 'patrol' | 'caravan' | 'siege';

export interface EventContext {
  /** The faction that holds this zone (faction.owner). */
  owner: string | null;
  ownerPower: number;
  /** Hostile factions staking the zone, dominant first (faction.contestants). */
  contestants: string[];
  /** A faction whose war host is pressing this zone right now, if any. */
  invader: string | null;
  isNight: boolean;
  hasCamps: boolean;
  /** Enough camps/POIs to walk a patrol route. */
  hasRoute: boolean;
  /** Owner is near its home (roamers always true; rooted only within eventRange). */
  nearHome: boolean;
}

export interface EventReward { rep: number; xpMul: number; gems: number; }

export const EVENT_REWARD: Record<ZoneEventKind, EventReward> = {
  patrol: { rep: 6, xpMul: 0.5, gems: 0 },
  caravan: { rep: 12, xpMul: 1.0, gems: 2 },
  siege: { rep: 10, xpMul: 1.0, gems: 1 },
};

export interface EventChoice {
  kind: ZoneEventKind;
  /** patrol: the patrolling faction. caravan: the owner. siege: the attacker. */
  primary: string;
  /** caravan: the ambusher (or null). siege: the defender. patrol: null. */
  secondary: string | null;
}

/** Decide what (if anything) is happening here. `roll` is a 0..1 chance draw. */
export function chooseEvent(ctx: EventContext, roll: number): EventChoice | null {
  // SIEGE — an invader bearing down on a camp-holding owner it hates.
  if (ctx.invader && ctx.owner && ctx.invader !== ctx.owner && ctx.hasCamps
    && factionStance(ctx.invader, ctx.owner) === 'hostile'
    && roll < (ctx.isNight ? 0.7 : 0.55)) {
    return { kind: 'siege', primary: ctx.invader, secondary: ctx.owner };
  }
  // CARAVAN — a settled owner moves goods NEAR HOME; a hostile rival may waylay.
  if (ctx.owner && ctx.nearHome && ctx.ownerPower >= 45 && !ctx.invader
    && roll < (ctx.isNight ? 0.15 : 0.4)) {
    const rival = ctx.contestants[1];
    const ambusher = rival && factionStance(ctx.owner, rival) === 'hostile' ? rival : null;
    return { kind: 'caravan', primary: ctx.owner, secondary: ambusher };
  }
  // PATROL — held HOME ground with a route; commoner in the dark.
  if (ctx.owner && ctx.nearHome && ctx.hasRoute && roll < (ctx.isNight ? 0.6 : 0.4)) {
    return { kind: 'patrol', primary: ctx.owner, secondary: null };
  }
  return null;
}
