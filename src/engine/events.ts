// ---------------------------------------------------------------------------
// ZONE EVENTS — the on-entry event REGISTRY (the choice as pure data + fns).
//
// When you walk into held ground, the world may be in the middle of something:
// a faction PATROL marching its beat, a CARAVAN moving goods (which a rival may
// ambush), or a SIEGE — an invader storming a camp the owner holds. Each kind
// is ONE ZoneEventDef in the registry below: its trigger predicate (choose),
// its tunables (cfg — no literals in the logic), its reward row, and its
// engine-side spawn/tick handlers (which run through the generic
// ActiveZoneEvent runner in zoneEvent.ts). Adding a fourth kind — a funeral
// procession, a prisoner transfer, a tax collector — is ONE registerZoneEvent
// call, no engine edits: the runner, the entry roll, the reward path, and the
// zone-policy gate all read the registry.
//
// Priority = registration order: the FIRST def whose choose() bites wins the
// entry (sieges before caravans before patrols, as ever). Each def's choose is
// gated per-biome through zonePolicy (eventAllowed by def id), so "no caravans
// in the deep sea" is a biome data line.
//
// These are the FACTION-POLITICS SUBSTRATE's events (the alwaysOn package):
// deliberately NOT scaled by the frequency crank — they are the world's
// baseline breathing, not an "event" the Vault dials. The mycelia suppression
// still smothers them (the engine gates the attempt roll).
//
// No `World` import at runtime — defs receive it as a TYPE through the runner.
// ---------------------------------------------------------------------------

import { dist, vec, type Vec2 } from '../core/math';
import { FACTIONS, factionStance } from '../data/monsters';
import { eventAllowed, type TargetableZone } from '../world/zonePolicy';
import type { Actor } from './actor';
import type { World } from './world';

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

export interface EventChoice {
  /** The winning ZoneEventDef's id. */
  kind: string;
  /** patrol: the patrolling faction. caravan: the owner. siege: the attacker. */
  primary: string;
  /** caravan: the ambusher (or null). siege: the defender. patrol: null. */
  secondary: string | null;
}

/** The live runner state a def's spawn/tick receives (see zoneEvent.ts). The
 *  `data` bag is the def's own scratch (a caravan stashes its cart + goal);
 *  `done` ends the event. */
export interface ZoneEventRun {
  readonly kind: string;
  readonly primary: string;
  readonly secondary: string | null;
  done: boolean;
  data: Record<string, unknown>;
  /** Pay the def's reward row and end (msg toasts at the player). */
  reward(faction: string, msg: string): void;
  /** End without reward (msg toasts at the player, tinted). */
  end(msg: string, color: string): void;
}

/** The zone furniture spawn() may anchor to (camps first, then points of
 *  interest — both in zone space). */
export interface ZoneEventSpots { camps: Vec2[]; pois: Vec2[]; }

/** One on-entry zone-event kind — the extensible unit. */
export interface ZoneEventDef {
  id: string;
  /** The payout row this kind's reward() pays (xp scales via ZONE_EVENT_CFG). */
  reward: EventReward;
  /** Decide whether THIS kind fires for the entry (roll is one shared 0..1
   *  draw). First registered def to bite wins; return the cast list. */
  choose(ctx: EventContext, roll: number): EventChoice | null;
  /** Lay the event onto the zone (set run.done if it can't form). */
  spawn(world: World, run: ZoneEventRun, spots: ZoneEventSpots): void;
  /** Advance it each frame; decide when it's over and pay out. */
  tick(world: World, run: ZoneEventRun, dt: number): void;
}

/** Shared zone-event framework knobs (per-kind numbers live on each def). */
export const ZONE_EVENT_CFG = {
  /** Reward xp = (xpBase + zone.level × xpPerLevel) × reward.xpMul. */
  reward: { xpBase: 40, xpPerLevel: 30 },
  /** Toast offsets/sizes for the entry announcement + endings. */
  announceDy: -70,
  endDy: -60,
} as const;

const DEFS: ZoneEventDef[] = [];

/** Register an on-entry zone-event kind (priority = registration order).
 *  Re-registering an id replaces that row in place (HMR-safe, the
 *  registerKillHandler idiom). */
export function registerZoneEvent(def: ZoneEventDef): void {
  const i = DEFS.findIndex(d => d.id === def.id);
  if (i >= 0) { DEFS[i] = def; return; }
  DEFS.push(def);
}

export function zoneEventDef(id: string): ZoneEventDef | undefined {
  return DEFS.find(d => d.id === id);
}

/** Every registered kind (QA + the ledger-contract sweep read this). */
export function zoneEventDefs(): readonly ZoneEventDef[] { return DEFS; }

/** Decide what (if anything) is happening here: the first registered kind
 *  whose biome policy admits it AND whose choose() bites. One shared roll —
 *  the registry preserves the old cascade exactly. */
export function chooseEvent(ctx: EventContext, zone: TargetableZone, roll: number): EventChoice | null {
  for (const def of DEFS) {
    if (!eventAllowed(def.id, zone)) continue;
    const c = def.choose(ctx, roll);
    if (c) return c;
  }
  return null;
}

function shortName(f: string): string {
  return (FACTIONS[f]?.name ?? f).replace(/^the /, '');
}

// ---------------------------------------------------------------------------
// The three substrate kinds. Each carries its OWN tunables as a local cfg —
// every count, radius, speed and chance a designer might retune, named.
// ---------------------------------------------------------------------------

// --- SIEGE — an invader bearing down on a camp-holding owner it hates. -------
const SIEGE_CFG = {
  chanceNight: 0.7, chanceDay: 0.55,
  attackers: 5, attackerRing: 220, attackerJitter: 30,
  defenders: 4, defenderJitter: 60,
} as const;

registerZoneEvent({
  id: 'siege',
  reward: { rep: 10, xpMul: 1.0, gems: 1 },
  choose: (ctx, roll) => {
    if (ctx.invader && ctx.owner && ctx.invader !== ctx.owner && ctx.hasCamps
      && factionStance(ctx.invader, ctx.owner) === 'hostile'
      && roll < (ctx.isNight ? SIEGE_CFG.chanceNight : SIEGE_CFG.chanceDay)) {
      return { kind: 'siege', primary: ctx.invader, secondary: ctx.owner };
    }
    return null;
  },
  spawn: (w, run, spots) => {
    const camp = spots.camps[0];
    const atkRoster = FACTIONS[run.primary];
    const defRoster = run.secondary ? FACTIONS[run.secondary] : undefined;
    if (!camp || !atkRoster || !defRoster) { run.done = true; return; }
    const level = Math.max(1, w.zone.level);
    for (let i = 0; i < SIEGE_CFG.attackers; i++) {
      const ang = (i / SIEGE_CFG.attackers) * Math.PI * 2;
      const a = w.spawnEventActor(atkRoster.table, level, 'enemy', run.primary, 'siege_atk');
      a.pos = w.clampNear(vec(camp.x + Math.cos(ang) * SIEGE_CFG.attackerRing,
        camp.y + Math.sin(ang) * SIEGE_CFG.attackerRing), SIEGE_CFG.attackerJitter);
    }
    for (let i = 0; i < SIEGE_CFG.defenders; i++) {
      const d = w.spawnEventActor(defRoster.table, level, 'enemy', run.secondary!, 'siege_def');
      d.pos = w.clampNear(camp, SIEGE_CFG.defenderJitter);
    }
    w.text(vec(w.player.pos.x, w.player.pos.y + ZONE_EVENT_CFG.announceDy),
      `${shortName(run.primary)} besiege ${shortName(run.secondary!)}!`, '#e85050', 15);
  },
  tick: (w, run) => {
    const attackersLeft = w.anyAliveWithTag('siege_atk', run.primary);
    const defendersLeft = w.anyAliveWithTag('siege_def', run.secondary ?? '');
    if (!attackersLeft && defendersLeft) {
      run.reward(run.secondary!, `Siege broken — ${shortName(run.secondary!)} hold the camp!`);
    } else if (!attackersLeft || !defendersLeft) {
      run.done = true; // the camp fell, or both spent
    }
  },
});

// --- CARAVAN — a settled owner moves goods near home; a rival may waylay. ----
const CARAVAN_CFG = {
  chanceNight: 0.15, chanceDay: 0.4,
  /** The owner must be settled at least this strong to risk the roads. */
  minOwnerPower: 45,
  guards: 2, guardJitter: 50,
  ambushers: 4, ambushJitter: 150,
  /** Cart speed as a fraction of the shared actor move rate. */
  cartSpeedMul: 0.6,
  /** Within this of its exit, the cart departs (delivered). */
  arriveDist: 90,
} as const;

registerZoneEvent({
  id: 'caravan',
  reward: { rep: 12, xpMul: 1.0, gems: 2 },
  choose: (ctx, roll) => {
    if (ctx.owner && ctx.nearHome && ctx.ownerPower >= CARAVAN_CFG.minOwnerPower && !ctx.invader
      && roll < (ctx.isNight ? CARAVAN_CFG.chanceNight : CARAVAN_CFG.chanceDay)) {
      const rival = ctx.contestants[1];
      const ambusher = rival && factionStance(ctx.owner, rival) === 'hostile' ? rival : null;
      return { kind: 'caravan', primary: ctx.owner, secondary: ambusher };
    }
    return null;
  },
  spawn: (w, run) => {
    const roster = FACTIONS[run.primary];
    if (!roster) { run.done = true; return; }
    const level = Math.max(1, w.zone.level);
    const cart = w.spawnEventActor([{ id: 'caravan_cart', weight: 1 }], level, 'player', run.primary, 'caravan');
    cart.pos = w.farFromExit();
    const goal = w.nearestExitPos(cart.pos);
    if (!goal) { run.done = true; return; }
    run.data.cart = cart;
    run.data.goal = goal;
    for (let i = 0; i < CARAVAN_CFG.guards; i++) {
      const g = w.spawnEventActor(roster.table, level, 'player', run.primary, 'caravan');
      g.pos = w.clampNear(cart.pos, CARAVAN_CFG.guardJitter);
      g.owner = cart; // heel to the cart when nothing's attacking
    }
    if (run.secondary) {
      const amb = FACTIONS[run.secondary];
      if (amb) for (let i = 0; i < CARAVAN_CFG.ambushers; i++) {
        const a = w.spawnEventActor(amb.table, level, 'enemy', run.secondary, 'ambush');
        a.pos = w.clampNear(goal, CARAVAN_CFG.ambushJitter);
      }
    }
    w.text(vec(w.player.pos.x, w.player.pos.y + ZONE_EVENT_CFG.announceDy),
      `a ${shortName(run.primary)} caravan — see it through`, '#7ec8a0', 15);
  },
  tick: (w, run, dt) => {
    const cart = run.data.cart as Actor | undefined;
    const goal = run.data.goal as Vec2 | undefined;
    if (!cart || cart.dead) {
      if (cart) w.dropGemAt(cart.pos);           // scavenge the wreck
      run.data.cart = undefined;
      run.end('The caravan was lost.', '#d05050');
      return;
    }
    if (goal) {
      w.moveActor(cart, goal.x - cart.pos.x, goal.y - cart.pos.y, dt * CARAVAN_CFG.cartSpeedMul);
      if (dist(cart.pos, goal) < CARAVAN_CFG.arriveDist) {
        cart.dead = true;                         // it reaches the road and departs
        run.data.cart = undefined;
        run.reward(run.primary, 'Caravan delivered!');
      }
    }
  },
});

// --- PATROL — held home ground with a route; commoner in the dark. -----------
const PATROL_CFG = {
  chanceNight: 0.6, chanceDay: 0.4,
  /** Route waypoints drawn from camps + POIs (needs at least 2 to walk). */
  maxWaypoints: 5,
  followers: 3, leadJitter: 30, followJitter: 60,
} as const;

registerZoneEvent({
  id: 'patrol',
  reward: { rep: 6, xpMul: 0.5, gems: 0 },
  choose: (ctx, roll) => {
    if (ctx.owner && ctx.nearHome && ctx.hasRoute
      && roll < (ctx.isNight ? PATROL_CFG.chanceNight : PATROL_CFG.chanceDay)) {
      return { kind: 'patrol', primary: ctx.owner, secondary: null };
    }
    return null;
  },
  spawn: (w, run, spots) => {
    const roster = FACTIONS[run.primary];
    const route = [...spots.camps, ...spots.pois].slice(0, PATROL_CFG.maxWaypoints);
    if (!roster || route.length < 2) { run.done = true; return; }
    const level = Math.max(1, w.zone.level);
    const lead = w.spawnEventActor(roster.table, level, 'enemy', run.primary, 'patrol');
    lead.pos = w.clampNear(route[0], PATROL_CFG.leadJitter);
    lead.patrolRoute = route;
    lead.patrolIdx = 0;
    for (let i = 0; i < PATROL_CFG.followers; i++) {
      const f = w.spawnEventActor(roster.table, level, 'enemy', run.primary, 'patrol');
      f.pos = w.clampNear(route[0], PATROL_CFG.followJitter);
      f.patrolFollow = lead.id;
    }
    w.text(vec(w.player.pos.x, w.player.pos.y + ZONE_EVENT_CFG.announceDy),
      `a ${shortName(run.primary)} patrol`, '#c8b06b', 14);
  },
  tick: (w, run) => {
    // The patrol was simply faction troops; clearing them ends it quietly.
    if (!w.anyAliveWithTag('patrol', run.primary)) run.done = true;
  },
});
