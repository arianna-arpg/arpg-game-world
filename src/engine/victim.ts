// ---------------------------------------------------------------------------
// THE VICTIM SCOPE — "against whom" as query context.
//
// The talent fabric's target axis (docs/engine/talents.md). A modifier's
// tags say what the action IS ('melee', 'fire'); a 'vs:<condition>' tag
// says who it is AGAINST. The hit site (World.resolveHit → rollSkillDamage)
// folds the struck body's live state into the roll's context — every
// registered victim condition that holds, plus one 'vs:<statusId>' per
// status the victim carries — so any attacker stat read through that
// context (damage, crit chance, crit multiplier, added damage, ailment
// chance, the whole apply_ family, proc chances) can be scoped to the
// victim with an ordinary tag filter on any surface: a passive node, a
// support gem, an affix, a buff. "Critical strikes against frozen enemies"
// is mod('critChance','flat',0.3,['vs:frozen']); "40% more damage against
// low-life enemies" is mod('damage','more',0.4,['vs:lowLife']).
//
// THE LAWS:
//  - NEVER AUTHORED ON A SKILL: vs: tags are context, not identity. A
//    SkillDef carrying one would claim every hit is against everyone.
//  - NULL-COST UNTIL NAMED: the fold runs only when the attacker's sheet
//    or the striking instance carries a vs: tag (victimScopeArmed) — an
//    uninvested body never pays for its victims' state.
//  - ONE READ, DRAWN == TESTED: a condition reads the same actor fields the
//    engine acts on (the low-life line the vignette draws, the hard-CC flag
//    the AI honors, the plant clock the stance reads) — never a shadow copy.
//  - OPEN: registerVictimCondition adds a predicate; status ids need no
//    registration at all (the fold derives them from the victim's list).
//  - THE PACKET CARRIES IT: the roll's tag set travels on the DamagePacket,
//    so everything downstream of the roll that queries with packet.tags
//    (the ailment sweep, hit procs) stays victim-scoped by construction.
// ---------------------------------------------------------------------------

import type { Actor } from './actor';
import type { Modifier, SkillTag, StatSheet } from './stats';
import { modReadsVictim } from './stats';
import { STANCE_MOVE_WINDOW, STANCE_PLANT_TIME } from './actor';
import { STATUS_DEFS, WET_STAND_STATUSES } from './status';
import { angleDiff, angleTo } from '../core/math';
import { SLAYER_CFG } from './damage';

export interface VictimCtx {
  /** World time — for the world-clock stamps a victim wears (alertUntil). */
  time: number;
}

export interface VictimConditionDef {
  /** Player-facing words ("against low-life enemies"). */
  label: string;
  test: (victim: Actor, attacker: Actor, ctx: VictimCtx) => boolean;
}

export const VICTIM_CONDITIONS: Record<string, VictimConditionDef> = {};

/** THE BOSS READ — bosses are a MonsterDef fact (data/monsters.ts), which
 *  this engine module must not import (the data layer imports the engine).
 *  The world installs the predicate once at load; until then no body is a
 *  boss, which is exactly what a bare sim with no bestiary should read. */
export const VICTIM_HOOKS = {
  isBoss: (_v: Actor): boolean => false,
};

export function registerVictimCondition(id: string, def: VictimConditionDef): void {
  if (VICTIM_CONDITIONS[id]) console.warn(`[victim] duplicate victim condition '${id}' — last wins`);
  VICTIM_CONDITIONS[id] = def;
}

/** The tag for a victim condition or status id. */
export function vsTag(id: string): SkillTag {
  return `vs:${id}`;
}

/** Is this 'vs:' id something the fold can ever produce — a registered
 *  condition or a status id? The validator's question. */
export function victimConditionKnown(id: string): boolean {
  return !!VICTIM_CONDITIONS[id] || !!STATUS_DEFS[id];
}

/** Words for a vs: tag (tooltips, the validator). */
export function victimConditionLabel(id: string): string {
  const def = VICTIM_CONDITIONS[id];
  if (def) return def.label;
  const s = STATUS_DEFS[id];
  return s ? `against ${s.label.toLowerCase()} enemies` : `against ${id}`;
}

/** THE ARMING READ: does anything the attacker brings to this hit name a
 *  vs: tag? The sheet's half is derived once per source generation; the
 *  striking instance's skill-local mods are scanned per call (a handful). */
export function victimScopeArmed(sheet: StatSheet, extra?: readonly Modifier[]): boolean {
  if (sheet.hasVsMods()) return true;
  if (extra) for (const m of extra) if (modReadsVictim(m)) return true;
  return false;
}

/** THE FOLD: every vs: tag that holds for this victim against this
 *  attacker right now — registered conditions plus one per carried
 *  status. Returns undefined when nothing holds (no allocation on the
 *  common path). */
export function victimTags(victim: Actor, attacker: Actor, ctx: VictimCtx): SkillTag[] | undefined {
  let out: SkillTag[] | undefined;
  for (const id in VICTIM_CONDITIONS) {
    if (VICTIM_CONDITIONS[id].test(victim, attacker, ctx)) (out ??= []).push(vsTag(id));
  }
  for (const s of victim.statuses) {
    if (s.stacks > 0) (out ??= []).push(vsTag(s.id));
  }
  return out;
}

// --- the core conditions -----------------------------------------------------
// Each reads the ONE field the engine itself acts on for that state.

registerVictimCondition('lowLife', {
  label: 'against low-life enemies',
  // The victim's OWN low-life line (the lowLifeLine stat, per body).
  test: v => v.life < v.maxLife() * v.lowLifeLine(),
});
registerVictimCondition('fullLife', {
  label: 'against full-life enemies',
  test: v => v.life >= v.maxLife() * 0.95,
});
registerVictimCondition('hardCC', {
  label: 'against stunned, frozen or otherwise held enemies',
  test: v => v.statuses.some(s => s.stacks > 0 && STATUS_DEFS[s.id]?.hardCC),
});
registerVictimCondition('afflicted', {
  label: 'against enemies suffering a damaging ailment',
  test: v => v.statuses.some(s => s.stacks > 0 && !!STATUS_DEFS[s.id]?.dotType),
});
registerVictimCondition('fleeing', {
  label: 'against fleeing enemies',
  test: v => v.statuses.some(s => s.stacks > 0 && STATUS_DEFS[s.id]?.panic),
});
registerVictimCondition('wet', {
  label: 'against wet enemies',
  test: v => v.statuses.some(s => s.stacks > 0 && WET_STAND_STATUSES.includes(s.id)),
});
registerVictimCondition('elite', {
  label: 'against empowered enemies',
  // The regicide axis's own rarity list, plus every boss.
  test: v => (!!v.rarity && SLAYER_CFG.regicideRarities.includes(v.rarity)) || VICTIM_HOOKS.isBoss(v),
});
registerVictimCondition('boss', {
  label: 'against bosses',
  test: v => VICTIM_HOOKS.isBoss(v),
});
registerVictimCondition('minion', {
  label: 'against summoned creatures',
  test: v => v.isMinion(),
});
registerVictimCondition('poised', {
  label: 'against enemies whose poise stands',
  test: v => v.poise > 0.5 && !v.poiseBroken,
});
registerVictimCondition('poiseBroken', {
  label: 'against enemies whose poise is broken',
  test: v => v.poiseBroken,
});
registerVictimCondition('stationary', {
  label: 'against planted or rooted enemies',
  test: v => !!v.stationary || v.plantFor > STANCE_PLANT_TIME,
});
registerVictimCondition('moving', {
  label: 'against moving enemies',
  test: v => !v.stationary && v.idleFor < STANCE_MOVE_WINDOW,
});
registerVictimCondition('casting', {
  label: 'against enemies mid-cast',
  test: v => !!v.casting,
});
registerVictimCondition('behind', {
  label: 'when striking from behind',
  // The backstab geometry the skill-side backstabMult already uses.
  test: (v, a) => Math.abs(angleDiff(v.facing, angleTo(v.pos, a.pos))) > 2.0,
});
registerVictimCondition('unaware', {
  label: 'against enemies that have not noticed you',
  test: (v, a, ctx) => v.team !== a.team && ctx.time >= v.alertUntil,
});
registerVictimCondition('higherLevel', {
  label: 'against higher-level enemies',
  test: (v, a) => v.level > a.level,
});
registerVictimCondition('lowerLevel', {
  label: 'against lower-level enemies',
  test: (v, a) => v.level < a.level,
});
registerVictimCondition('grabbed', {
  label: 'against seized enemies',
  test: v => v.heldBy !== undefined,
});
registerVictimCondition('airborne', {
  label: 'against airborne enemies',
  test: v => v.flying,
});
registerVictimCondition('guarding', {
  label: 'against guarding enemies',
  test: v => v.casting?.mode === 'guard',
});
