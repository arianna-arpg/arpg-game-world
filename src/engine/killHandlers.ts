// ---------------------------------------------------------------------------
// KILL HANDLERS — the per-kind bounty registry consumed by World.kill().
//
// When an enemy falls, every registered rule whose tag/predicate matches runs
// with a KillCtx: the kill-time window onto the world (credit, the zone, the
// sim's overlay fields) plus the bounty verbs (xp, gems, toasts, ledger bumps,
// flashes, spawns). Core rows (the warlord, the Crowned, the Eldritch cleanse)
// self-seed below; a content package contributes its own kill-bounty from its
// def file with ONE registerKillHandler call — no engine edits. Rows whose
// bodies must close over World RUN-STATE (realm contexts, the dive's haul, the
// hunt's beast ref, the built-boss site) live on World.worldKillRules instead —
// same KillRule shape, the rouseRules pattern — because module rows must stay
// STATELESS (one registry serves every World the process boots, sim arenas
// included).
//
// Rules are independent by contract: a multi-matching actor (a Crowned,
// corrupted miniboss...) runs every matching row, and no row may read another
// row's effects or rely on dispatch order.
// ---------------------------------------------------------------------------

import { vec, type Vec2 } from '../core/math';
import { WORLD_DRIVES } from '../world/drives';
import { FACTIONS, factionStance } from '../data/monsters';
import type { ZoneDef } from '../data/zones';
import type { OverlayView } from '../world/overlay';
import type { WorldSim } from '../world/sim';
import type { Actor } from './actor';

/** The kill-time window a bounty row acts through — a facade over World, so
 *  rows never touch engine internals beyond these verbs. */
export interface KillCtx {
  /** The slain enemy. */
  readonly actor: Actor;
  /** Whoever landed the killing blow (a hero, a minion, a rival monster), or
   *  null for environmental / decay deaths. */
  readonly killer: Actor | null;
  /** Player-side credit: no killer, or the killer fights for the player. Most
   *  bounties pay whoever lands the blow; credit-gated rows test this. */
  readonly credit: boolean;
  readonly zone: ZoneDef;
  /** The living-world sim — package overlay fields (typed caches), warlords,
   *  incursions, reputation. */
  readonly sim: WorldSim;
  readonly time: number;
  grantXp(amount: number): void;
  dropGemAt(at: Vec2): void;
  text(at: Vec2, msg: string, color: string, size?: number): void;
  /** Run-ledger bump. KEYS ARE CROSS-FILE CONTRACTS — unlock predicates read
   *  them verbatim (hunt tiers, Warbands' crowned_killed, the Conclave's
   *  eldritch_repelled...); never rename one. */
  bumpLedger(key: string, by?: number): void;
  /** LIFETIME-ledger bump: writes the ACCOUNT ledger directly (knowledge that
   *  outlives the run — the craft-lore stance), gated on the mode stage's
   *  metaProgression policy (returns the current count unchanged when meta is
   *  off). `flush` also marks the account save dirty — reserve it for the
   *  moments worth a durable write (first sighting, tier crossings, mastery);
   *  routine counts ride the next scheduled account save. */
  bumpAccountLedger(key: string, by?: number, flush?: boolean): number;
  flash(at: Vec2, radius: number, color: string, life?: number): void;
  /** Spawn a hostile at a clamped position (the cultist's blood-demon verb). */
  spawnHostileAt(defId: string, level: number, at: Vec2): Actor;
  /** The sim's overlay view (the warlord power-break feeds it). */
  simView(): OverlayView;
}

/** One per-kind kill bounty. `tag` is the fast path (actor.tag equality);
 *  `when` AND-composes for the non-tag facts (rarity, faction, credit gates).
 *  A tag may carry SEVERAL rows (the warlord's credited bounty + its
 *  always-fires power-break are two). */
export interface KillRule {
  /** Stable id — re-registering an id replaces that row in place (HMR-safe),
   *  mirroring registerStamp's override behavior. */
  id: string;
  /** Fires when actor.tag equals this (omit for predicate-only rows). */
  tag?: string;
  /** Extra predicate, AND-composed with `tag`. */
  when?(ctx: KillCtx): boolean;
  run(ctx: KillCtx): void;
}

const KILL_RULES: KillRule[] = [];

/** Register a per-kind kill bounty (see KillRule). Package def files call this
 *  at module scope; rows must be STATELESS — a package's run-state belongs on
 *  its overlay field, reached through ctx.sim. */
export function registerKillHandler(rule: KillRule): void {
  const i = KILL_RULES.findIndex(r => r.id === rule.id);
  if (i >= 0) {
    console.warn(`[kill] re-registering rule '${rule.id}' — overriding`);
    KILL_RULES[i] = rule;
    return;
  }
  KILL_RULES.push(rule);
}

export function killRules(): readonly KillRule[] { return KILL_RULES; }

/** Does a rule match this kill? (Shared by module rows and World.worldKillRules.) */
export function killRuleMatches(rule: KillRule, ctx: KillCtx): boolean {
  if (rule.tag && ctx.actor.tag !== rule.tag) return false;
  return rule.when ? rule.when(ctx) : true;
}

// --- Core rows (engine-owned kinds) -----------------------------------------

// FACTION DRIVES (world/drives.ts): a member's death feeds its faction's
// registered meters — dread climbs with the bodies, and any monster rule
// can read it (AICondition.drive, scope 'faction'). Meter-driven nerve,
// no script fires.
registerKillHandler({
  id: 'faction_drive_feed',
  when: ctx => !!ctx.actor.faction,
  run: ctx => {
    for (const spec of Object.values(WORLD_DRIVES)) {
      if (spec.scope === 'faction' && spec.onMemberDeath) {
        ctx.sim.drives.bump(spec.id, spec.onMemberDeath, ctx.actor.faction!);
      }
    }
  },
});

// THE GILDED HOARD: a hoard-bearer's death pays a gem burst on top of
// whatever its sack spills (the sack itself returns in World.kill — nothing
// a scamp snatched is ever lost; this is the chase's own prize). Tag-keyed
// like every sibling row: any def wearing 'gilded_hoard' joins the payout.
registerKillHandler({
  id: 'scamp_hoard',
  when: ctx => ctx.actor.tag === 'gilded_hoard' && ctx.credit,
  run: ctx => {
    for (let i = 0; i < 3; i++) ctx.dropGemAt(ctx.actor.pos);
    ctx.text(ctx.actor.pos, 'the hoard spills!', '#e8c84a', 16);
  },
});

// A slain warlord pays the player a bounty and a rival's gratitude.
// (Its faction's power breaks in the next row — credit or not, the body counts.)
registerKillHandler({
  id: 'warlord_bounty',
  tag: 'warlord',
  when: ctx => ctx.credit && !!ctx.actor.faction,
  run: ctx => {
    ctx.grantXp(200 + ctx.zone.level * 40);
    ctx.dropGemAt(ctx.actor.pos);
    ctx.dropGemAt(ctx.actor.pos);
    const rival = Object.keys(FACTIONS).find(o => factionStance(ctx.actor.faction!, o) === 'hostile');
    if (rival) ctx.sim.reputation.add(rival, 25);
  },
});

// Whoever lands the blow, a warlord's fall breaks its faction's power and
// stills its wars — the field state must track the body, credit or not.
registerKillHandler({
  id: 'warlord_break',
  tag: 'warlord',
  when: ctx => !!ctx.actor.faction,
  run: ctx => {
    ctx.sim.warlord.onWarlordKilled(ctx.actor.faction!, ctx.time, ctx.simView());
    ctx.bumpLedger('warlords_killed'); // → unlocks Demon Invasions
    const fname = (FACTIONS[ctx.actor.faction!]?.name ?? ctx.actor.faction!).replace(/^the /, '');
    ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 40),
      `${fname} warlord slain! Their power breaks.`, '#ffd700', 18);
  },
});

// A Crowned champion's fall drives the Warbands package unlock (counts
// whoever lands the blow, like a warlord).
registerKillHandler({
  id: 'crowned',
  when: ctx => ctx.actor.rarity === 'crowned',
  run: ctx => {
    ctx.bumpLedger('crowned_killed');
    ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 40), 'A Crowned champion falls!', '#e64db4', 16);
  },
});

// THE OBSERVER at an Eldritch Incursion's epicenter — felling it COLLAPSES that
// epicenter (and the whole incursion once its last falls), for festering-scaled
// spoils. The deep payoff for tracking the blight to its hidden source.
registerKillHandler({
  id: 'eldritch_observer',
  tag: 'eldritch_observer',
  run: ctx => {
    const mul = ctx.sim.incursionField.resolveEpicenter(ctx.zone.id);
    ctx.bumpLedger('eldritch_repelled');
    ctx.grantXp(Math.round((300 + ctx.zone.level * 52) * mul));
    const gems = 3 + Math.floor(mul);
    for (let i = 0; i < gems; i++) ctx.dropGemAt(ctx.actor.pos);
    ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 56),
      `The Eldritch presence recoils! (×${mul.toFixed(1)} spoils)`, '#7fce6a', 20);
  },
});

// CLEANSE: culling a corrupted foe or an Eldritch spawn RETRACTS the reach in
// this zone — fighting the blight pushes the tentacles back (the tug-of-war).
registerKillHandler({
  id: 'eldritch_cleanse',
  when: ctx => ctx.actor.corrupted || ctx.actor.tag === 'eldritch_spawn',
  run: ctx => {
    const ectx = ctx.sim.incursionField.eventContext(ctx.zone.id);
    if (ectx?.archetype.termination.cleanseRetract) {
      ctx.sim.incursionField.cleanse(ctx.zone.id, ectx.archetype.termination.cleanseRetract);
    }
  },
});
