// ---------------------------------------------------------------------------
// VENDETTA — Writs of Reprisal (a net-new package): the world answering the
// player's OWN violence.
//
// Every other event is the world acting on its own. This one closes the loop
// in reverse: each faction carries a GRUDGE meter (a WorldDrive registered
// below — the engine's faction_drive_feed kill row feeds it automatically on
// every member death; quiet days cool it). Cull a people hard enough while
// this package runs and they POST A WRIT on you: hunter squads spring from
// zone entries, escalating tier by tier — posse, then hunt, then a crusade of
// one purpose, allied factions lending blades at the top (the stance table
// made teeth) — until you fell the WARRANT-HOLDER (settling it for spoils and
// a rival's tribute) or outlast their patience. Being hunted survives quit +
// relaunch: a writ is the world's memory of what you did.
//
// The whole mechanic is DATA on the surge; the overlay owns the lifecycle;
// ONE zone-runtime row springs squads; ONE kill row settles writs. It leans
// on five existing fabrics at once — drives, stances, reputation, bulletins,
// zone policy — which is the point: reprisal is emergence, not scaffolding.
// ---------------------------------------------------------------------------

import { vec } from '../../core/math';
import { registerKillHandler } from '../../engine/killHandlers';
import { registerWorldDrive } from '../../world/drives';
import { VendettaField, type VendettaSurge } from '../overlays/vendetta';
import type { ContentPackage } from '../types';

/** THE GRUDGE — each people's memory of its dead at the player's hand. Fed by
 *  the engine's faction_drive_feed row on EVERY member death (like dread), and
 *  cooled by quiet days. Tuned far slower than dread: dread is nerve (seconds),
 *  grudge is politics (minutes) — ~25 deaths crest it, ~4 minutes of peace
 *  clear it. The vendetta overlay reads it; any monster rule could too. */
registerWorldDrive({
  id: 'grudge',
  scope: 'faction',
  rise: -0.004,
  onMemberDeath: 0.04,
});

/** The whole reprisal mechanic as data — every number a knob. */
const VENDETTA_SURGE: VendettaSurge = {
  driveId: 'grudge',
  grudgeThreshold: 0.85,   // ~22+ culls of one people while their anger holds
  igniteChance: 0.12,      // per 0.5s step once crested (×ignitionMul) — days of reckoning come fast
  maxConcurrent: 2,        // at most two peoples hunting at once (×concurrency crank)
  lifeSeconds: 420,        // they give up after ~7 minutes un-settled (×severity)
  escalateSeconds: 90,     // the bounty rises every ~90s ignored (÷severity)
  ambushCooldown: 50,      // breathing room between sprung squads
  tiers: [
    { label: 'a posted bounty', size: [3, 4], levelBonus: 0, ambushChance: 0.45, rewardMul: 1 },
    { label: 'a hunting party', size: [5, 6], levelBonus: 1, ambushChance: 0.6, rewardMul: 1.6 },
    { label: 'a war of one purpose', size: [7, 9], levelBonus: 2, ambushChance: 0.75, alliesJoin: true, rewardMul: 2.6 },
  ],
  // Any rostered faction may post (the mortal & beast peoples in practice —
  // event-context factions never crest: their members die in their own events'
  // ground, feeding their grudge, but they field writs like anyone if they do;
  // narrow this list if a specific people should never take the road).
  warrant: { promote: 'champion', levelBonus: 2, xpFloor: 130 },
  reward: { xpBase: 180, xpPerLevel: 34, gems: 2, rivalRep: 18 },
  settleGrudge: 0.15,      // a settled (or abandoned) writ breaks the people's anger
  color: undefined,        // wear each poster faction's own colour
};

export const VENDETTA: ContentPackage = {
  id: 'vendetta',
  label: 'Vendetta',
  blurb: 'The world keeps a ledger of its dead. Cull one people hard enough and they post a WRIT OF REPRISAL — hunter squads spring from the roads you walk, the bounty rising the longer you dodge it, allied banners joining the hunt at its height. Fell the warrant-holder to settle the matter (their rivals pay tribute for the insult), or outlast their patience. Quitting is not an escape.',
  cost: 120,
  // DISCOVERED in play (runs at defaults from level 6); the Vault unlock gates
  // TUNING, surfacing once the first writ has been posted against you.
  unlock: {
    id: 'vendetta_unlock',
    label: 'Have a writ posted against you (cull one people hard enough)',
    test: (ctx) => (ctx.ledger.writs_seen ?? 0) >= 1,
  },
  tiers: [
    { id: 'vendetta_marked', label: 'Marked', requirement: 'Settle 2 writs', cost: 160,
      test: (ctx) => (ctx.ledger.writs_settled ?? 0) >= 2,
      grants: { weight: { min: 0, max: 80 } } },
    { id: 'vendetta_outlaw', label: 'Outlaw', requirement: 'Settle 6 writs', cost: 240,
      test: (ctx) => (ctx.ledger.writs_settled ?? 0) >= 6,
      grants: { weight: { min: 0, max: 100 }, startLevel: { min: 0, max: 101 } } },
  ],
  modifiers: [
    { id: 'vendetta_start', kind: 'startLevel', label: 'Writs begin at level', min: 6, max: 6, step: 1, defaultValue: 6 },
    { id: 'vendetta_weight', kind: 'weight', label: 'Reprisal frequency', min: 15, max: 50, step: 5, defaultValue: 30 },
  ],
  defaultWeight: 30,
  defaultStartLevel: 6,
  defaultEnabled: true,
  world: { overlay: (ctx) => new VendettaField(ctx, VENDETTA_SURGE) },
  validate: (look) => {
    const out: string[] = [];
    for (const f of VENDETTA_SURGE.posters ?? []) {
      if (!look.faction(f)) out.push(`poster faction '${f}' unknown`);
    }
    for (const [f, roster] of Object.entries(VENDETTA_SURGE.hunterRosters ?? {})) {
      if (!look.faction(f)) out.push(`hunter roster faction '${f}' unknown`);
      for (const e of roster) if (!look.monster(e.id)) out.push(`hunter '${e.id}' unknown`);
    }
    if (!VENDETTA_SURGE.tiers.length) out.push('no escalation tiers declared');
    return out;
  },
};

// THE WARRANT-HOLDER — felling it SETTLES the writ: tier-scaled spoils, the
// poster's grudge breaks (the engine drains settledPending), and the poster's
// strongest rival pays tribute for the insult (the reputation weave). Counts
// whoever lands the blow; the settled ledger gates the package's Vault tiers.
registerKillHandler({
  id: 'vendetta_warrant',
  tag: 'vendetta_warrant',
  run: ctx => {
    const vf = ctx.sim.vendettaField;
    const writId = typeof ctx.actor.eventKey === 'string' ? ctx.actor.eventKey : '';
    const settled = vf?.settleWrit(writId);
    if (!settled) return; // a stale warrant (its writ expired mid-fight) pays nothing extra
    ctx.bumpLedger('writs_settled');
    const r = vf!.surge().reward;
    ctx.grantXp(Math.round((r.xpBase + ctx.zone.level * r.xpPerLevel) * settled.rewardMul));
    const gems = r.gems + Math.floor(settled.rewardMul - 1);
    for (let i = 0; i < gems; i++) ctx.dropGemAt(ctx.actor.pos);
    if (settled.rivalPaid) ctx.sim.reputation.add(settled.rivalPaid, r.rivalRep);
    ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 56),
      `The warrant-holder falls — the writ is settled!`, '#ffd700', 18);
  },
});
