// ---------------------------------------------------------------------------
// The layered stat & modifier engine.
//
// Every number in the game flows through this file. A StatSheet owns a set of
// base values plus any number of named *modifier sources* (attributes, class
// bonuses, level, buffs, statuses, items...). A stat is computed as:
//
//     value = (base + sum of FLAT) * (1 + sum of INCREASED) * product(1 + MORE)
//
// Modifiers may carry tag filters: a modifier with tags ['fire'] only applies
// when the stat is queried in a context containing the 'fire' tag (e.g. while
// computing damage of a fire-tagged skill). This is the single mechanism that
// makes "40% increased fire damage", "20% increased melee attack speed", etc.
// possible without any special-case code.
// ---------------------------------------------------------------------------

import { DEFENSE_CFG } from './defense';
import { PERF_SLABS } from './perfSlabs';

/** Tags describe what a skill / damage context *is*. Add freely. */
export type SkillTag =
  | 'satellite' | `satellite:${string}`
  | 'aurora' | `aurora:${string}`
  | 'guardian' | `guardian:${string}`
  | 'creeper' | `creeper:${string}`
  | 'cast:timed' | 'cast:instant' | 'cast:channel' | 'cast:held'
  | `minion:${string}` | `body:${string}`
  | 'attack' | 'spell' | 'melee' | 'projectile' | 'aoe' | 'duration'
  | 'movement' | 'summon' | 'minion' | 'warcry' | 'buff' | 'storm'
  | 'aura' | 'totem' | 'trap' | 'mine' | 'corpse'
  // 'construct' marks EVERY construct-delivery skill (totems, traps, mines,
  // barriers, pods, echoes) — FOLDED ON at registry load (data/skills.ts),
  // never hand-authored. Construct-generic supports (constructFx,
  // breakableGraft) gate on it; family-scoped gems keep totem/trap/mine.
  | 'construct'
  // 'conjure' marks every skill that CALLS CLOUD (a conjure effect, a
  // conjuring trail on its delivery) — folded on at registry load beside
  // 'construct', never hand-authored. Cloud-generic supports (Thunderhead,
  // Silver Lining, Slow Weather) gate on it; Cloudborne grantsTags it.
  | 'conjure'
  | 'channel' | 'instant' | 'curse' | 'guard' | 'targeted'
  | 'mirage' | 'clone' | 'sweep' | 'overdrive' | 'overcharge' | 'heal'
  // 'persistent' marks contract summons that REVIVE on a timer (golems) —
  // the gate that keeps hard-resummonable-only supports (Self-Destruct)
  // out of skills whose bodies were never meant to be spent.
  | 'persistent'
  // 'javelin' marks the Impaler family (spears, lances, volleys) so
  // family-wide supports and tag-filtered investment can find them.
  | 'javelin'
  // 'chrono' marks time-bending skills (SkillDef.chrono holds, stasis
  // appliers) — the gate for chronomancy-scoped supports and investment.
  | 'chrono'
  // 'ultimate' marks the super arts (SkillDef.ultimate — engine/ultimates.ts)
  // AND their payload kin (a follow-up collapse wears the tag so scaling
  // reaches the whole art): the scope for ultimate-tuned supports and
  // tag-filtered investment. THE SPEC IS THE MARK, THE TAG IS THE SCOPE —
  // the census probe pins spec ⇒ tag; the tag alone is membership and pays
  // no price floor.
  | 'ultimate'
  // 'fissure' marks skills that TEAR CRACKS (GroundDelivery.fissure /
  // fissureTrail) — the gate for fissure-fanning supports, so they can
  // never socket into a skill with no crack to fan.
  | 'fissure'
  // 'pulse' marks skills whose placements DETONATE AGAIN after a dormant
  // beat (GroundDelivery.pulse) — the gate for pulse-extending supports,
  // so they never socket into ground that only ever blows once. Granted
  // by the pulse-grafting gem the way Faultfinder grants 'fissure'.
  | 'pulse'
  // 'flask' marks the fount family (orb-fed drinks) so tag-filtered
  // investment reaches ONLY the drinks — "20% increased Restoration with
  // flasks" is an ordinary modifier, never a bespoke hook.
  | 'flask'
  // 'munition' marks the ammunition family (use-charge banks fired dry and
  // RELOADED — magazine cooldowns or reload conversions) so family-wide
  // supports and tag-filtered investment can find the guns.
  | 'munition'
  // 'reload' marks the reload actions themselves (the racking hand between
  // magazines): their cast/channel time divides by the reloadSpeed stat,
  // and reload-scoped modifiers reach ONLY the rack, never the shot.
  | 'reload'
  // 'song' marks the skald's battle-music (worn verse-banking fields and
  // their crescendo spenders) so song-scoped supports and tag-filtered
  // investment can find the whole hymnal, never one note.
  | 'song'
  // 'companion' marks the TAMED-BOND family (taming claims, whistles, kennel
  // verbs) — the gate for keeper supports (bond sympathy, claim grafts), so
  // they distinguish the Tamer's few named beasts from a summoner's swarms
  // and never socket into a skill with no bond to deepen.
  | 'companion'
  // 'grab' marks skills that SEIZE (a grabSeize effect — the grab fabric,
  // engine/grab.ts): the gate for grip supports and tag-filtered
  // investment, and a combo-grammar symbol (seize-then-heave measures
  // read through the one sequence matcher with no matcher edits).
  | 'grab'
  // 'throw' marks skills that RELEASE a held body as an impulse
  // (grabThrow) — the other half of the grapple alphabet, so throw-scoped
  // supports (authority, impact) never socket into a skill with no
  // catch to send.
  | 'throw'
  // 'mimic' marks the mimicry slots themselves (SkillDef.mimic — the
  // blue-mage lane, engine/mimic.ts) so mimic-scoped supports (witness
  // levers, bank wideners, +levels to stolen arts) find the slot and
  // never socket into a skill with nothing to steal. The CAPTURED cast
  // keeps its own real tags — the grammar reads the art, not the theft.
  | 'mimic'
  // 'possession' marks the seat-to-body verbs (the possession seam,
  // engine/possess.ts — the entry blow, the form gems, the return
  // presses) so seam-scoped supports (duration, husk ward, possessed
  // might) find their gem and never socket into a skill with no body
  // to borrow. The BORROWED kit keeps its own real tags — the grammar
  // reads the art, not the rider.
  | 'possession'
  // 'throng' marks the gather-anchor skills themselves (SkillDef.throng —
  // the throng fabric, engine/throng.ts) — FOLDED ON at registry load
  // (data/skills.ts, the construct fold's sibling), never hand-authored,
  // so throng-scoped supports (source grafts, find levers) and
  // tag-filtered investment find every anchor and never socket into a
  // skill with no roster to grow.
  | 'throng'
  | 'physical' | 'fire' | 'cold' | 'lightning' | 'chaos'
  // THE VICTIM SCOPE (engine/victim.ts — the talent fabric, docs in
  // docs/engine/talents.md): 'vs:<condition>' tags describe WHO a hit is
  // against, the way the tags above describe what the action IS. They are
  // never authored on a skill — the hit site folds the struck body's live
  // state (registered victim conditions + every status it carries) into
  // the query context, so "40% more damage against frozen enemies" or
  // "+30% critical chance against low-life enemies" is an ordinary
  // tag-filtered modifier on any surface: passive, gem, affix, buff.
  // Null-cost by construction: the fold runs only when the attacker's
  // sheet (or the striking instance) names a vs: tag at all.
  | `vs:${string}`;

export type DamageType = 'physical' | 'fire' | 'cold' | 'lightning' | 'chaos';
export const DAMAGE_TYPES: readonly DamageType[] = ['physical', 'fire', 'cold', 'lightning', 'chaos'];

/** The three ELEMENTS — the canonical subset element-keyed mechanics iterate
 *  (remnants, runes, conduction). For MEMBERSHIP and iteration only: sites
 *  that PRIORITIZE among elements (ordered .find with a per-site fallback)
 *  keep their own ordered literals — the order there is a local design
 *  decision, not this list's business. */
export const ELEMENTAL_TYPES = ['fire', 'cold', 'lightning'] as const;
export type ElementalType = typeof ELEMENTAL_TYPES[number];

/** Canonical per-element tint — the single source of truth for damage-flavored
 *  FX (death-burst orbs/implosions, martyrdom blasts, …) so a re-theme touches
 *  one place and every element (incl. `physical`) renders distinctly. */
export const DAMAGE_COLOR: Record<DamageType, string> = {
  // One distinct hue per element so colour alone tells the player what to mitigate.
  // chaos is PURPLE (the genre convention for chaos/poison) rather than green — green
  // collided with the Mycelia spore haze, muddying the read inside fungal zones.
  physical: '#cfd2d6', fire: '#ff8a4a', cold: '#7ab8d8', lightning: '#ffe14a', chaos: '#c45ae0',
};

/** 'link' is the STAT SIPHON: "gain `value` × <fromStat> as <stat>". The
 *  granted amount joins the target's BASE layer (so its own increased/more
 *  modifiers scale it), and the source is read at its links-disabled
 *  BASELINE — the single-hop golden rule (see StatSheet.compute). */
export type ModKind = 'flat' | 'increased' | 'more' | 'override' | 'link';

/** STAT TRADES — the swap fabric: `to` GAINS rate × the source's baseline
 *  while `from` is FORGONE by a fraction — and BOTH dials are ordinary
 *  registered stats (rateStat / forgoStat), so a keystone is two plain
 *  mods, a partial conversion is an affix-sized value, and the dials
 *  themselves can be modified by anything that writes a modifier ("20%
 *  increased Evasion Read as Armor" genuinely works). No flags anywhere.
 *  Reads follow the link golden rules (StatSheet.compute): the grant reads
 *  the source at its links-and-trades-disabled, PRE-FORGO baseline
 *  (single-hop — no chains, no cycles), joins the target's BASE layer (its
 *  own increased/more scale it), and the forgo scales the source's FINAL
 *  value (registry clamps still apply after). A new swap is ONE row here
 *  plus its two dial stats in STAT_DEFS — nothing else. Dial stats must
 *  never themselves be a trade's from/to (validate.ts enforces). */
export interface StatTrade {
  from: string;
  to: string;
  /** The GAIN dial: `to` += (this stat's value) × from's baseline. */
  rateStat: string;
  /** The FORGO dial: `from` ×= 1 − clamp01(this stat's value). */
  forgoStat: string;
}
export const STAT_TRADES: StatTrade[] = [
  // The iron-reflexes lane: the dodger's training re-read as plate.
  { from: 'evasion', to: 'armor', rateStat: 'evasionToArmor', forgoStat: 'evasionForgone' },
  // The bonewright lane: the mage-shield renounced for footing.
  { from: 'energyShield', to: 'poise', rateStat: 'esToPoise', forgoStat: 'esForgone' },
  // The duelist's-read lane: footwork re-read as the fencer's insight pool
  // (the defense-texture doctrine kept: insight ships EMPTY — a trade IS
  // deliberate authored investment). NOTE the row-scoped forgo dial: forgo
  // dials are per-ROW, never shared — the forgo loop applies every row
  // whose `from` matches, so a shared dial would compound (squared
  // renunciation). Each new lane mints its own pair.
  { from: 'evasion', to: 'insight', rateStat: 'evasionToInsight', forgoStat: 'evasionToInsightForgo' },
  // The ashen-vessel lane: renouncing mortal life to feed the arcane lattice.
  { from: 'life', to: 'energyShield', rateStat: 'lifeToEs', forgoStat: 'lifeForgone' },
];

// --- THE CONDITION LINES — the fractions of max at which the pool-state
// conditions below flip. One constant per line, shared by every system that
// tests it, so "low" and "full" can never drift apart between the character
// sheet, the engine, and the screen.

/** THE 'lowLife' LINE — the BASE of the per-actor `lowLifeLine` STAT
 *  (STAT_DEFS below). Every lowLife test asks the actor it concerns
 *  (Actor.lowLifeLine()): the condition mask, the world's hit-while-low
 *  surge gate, Unstable Flesh's minion detonation, and the renderer's
 *  blood vignette all read the same per-body line — so gear can move YOUR
 *  line, minion-lane mods can move a MINION's, and no system ever drifts
 *  from another on the same actor. */
export const LOW_LIFE_FRAC = 0.35;
/** 'fullLife' tolerates a scratch: chip damage must not flicker full-life
 *  mods off every incidental tick. */
export const FULL_LIFE_FRAC = 0.95;
/** 'lowMana' sits deeper than the life line — spenders LIVE near the bottom
 *  of the bar, so "low" only speaks when the tank is truly running dry. */
export const LOW_MANA_FRAC = 0.25;
/** 'fullMana' mirrors fullLife's tolerance (a single cast's tithe shouldn't
 *  strip the state). */
export const FULL_MANA_FRAC = 0.95;
/** 'fullEs' is strict: the shield trickles while recharging, so anything
 *  short of truly topped is still "filling", not full. */
export const FULL_ES_FRAC = 0.99;
/** 'lowEs' mirrors the life line. */
export const LOW_ES_FRAC = 0.35;

/**
 * Actor-state conditions a modifier can demand ("40% more damage while on
 * low life"). The actor recomputes its active set each frame and pushes it
 * into its StatSheet; conditional modifiers apply only while theirs holds.
 */
export type ConditionId =
  | 'lowLife' | 'fullLife' | 'lowMana' | 'fullMana'
  | 'hasEs' | 'fullEs' | 'lowEs' | 'guarding' | 'channeling' | 'hasWard' | 'hasEndurance'
  // Planted vs on the move (Actor.idleFor: >0.6s still / <0.15s since a step)
  | 'stationary' | 'moving'
  // The poise break-bar stands unbroken (Actor.poise > 0 and not broken) —
  // "while poised" mods are the fortress-stance investment hook.
  | 'poised'
  // The bar is BROKEN and recovering — the berserker's inverse hook
  // ("while your poise is broken, 30% more damage" is one conditional mod).
  | 'poiseBroken'
  // The energy shield's recharge is actively FLOWING (delay elapsed, pool
  // climbing) — "while recharging" mods make the stream itself a stance.
  | 'esRecharging'
  // THE COMBO GRAMMAR's starter conditions (engine/sequence.ts): the last
  // COMBO_CFG.conditionRun real casts were all DIFFERENT skills / all the
  // SAME skill, fresh within the condition window. Derived from the
  // actor's recent-cast ring — recording (and these bits) wake only while
  // something on the actor references combos (Actor.comboWatch), so
  // non-combo builds never churn the mask.
  | 'comboVaried' | 'comboRepeated'
  // THE RECENCY LEDGER (engine/recency.ts — the talent fabric): "if you
  // have X recently" as actor state. Each reads a per-actor seconds-since
  // counter (Actor.since, stamped at the engine's own event seams) against
  // RECENT_CFG's window, so the conditions expire on their own with no
  // proc, no buff and no per-mod bookkeeping — the same bit-mask fold as
  // every condition above. 'recentlyHit'/'recentlyCrit'/'recentlyKilled'
  // are blows the actor LANDED; 'recentlyHurt' is a landed hit TAKEN
  // (DoT ticks never count — a burn is not a blow); 'notHurtRecently' is
  // its inverse (true from the first frame, the way "haven't been hit"
  // reads in any fight you have not yet joined); 'recentlyBlocked' /
  // 'recentlyEvaded' are the actor's own made block / evade;
  // 'recentlyMoved' = a movement-tagged skill completed; 'recentlyHealed'
  // = any heal landed on the actor.
  | 'recentlyHit' | 'recentlyCrit' | 'recentlyKilled'
  | 'recentlyHurt' | 'notHurtRecently'
  | 'recentlyBlocked' | 'recentlyEvaded'
  | 'recentlyMoved' | 'recentlyHealed'
  // THE STRIDE (THE LEGEND FABRIC — docs/engine/legends.md): the willed
  // distance walked since the last striding blow (Actor.strideDist, fed by
  // moveActor) has reached the sheet's `strideReach` (0 = the lane is off).
  // A landed damaging blow while it holds SPENDS the stride at the end of
  // its frame — "after walking N units, your next blow…" as a condition
  // ordinary modifiers read with `when`.
  | 'strided';

/** EVERY ConditionId, in the actor's BIT ORDER (Actor.refreshConditions
 *  folds bit i ⇔ CONDITION_IDS[i]). One list, declared beside the union,
 *  so the mask, the validator and the tooltips can never disagree on what
 *  a condition is called — and a new condition is one union member plus
 *  one row here, never a hand-numbered bit. */
export const CONDITION_IDS: readonly ConditionId[] = [
  'lowLife', 'fullLife', 'lowMana', 'fullMana',
  'hasEs', 'fullEs', 'lowEs', 'guarding', 'channeling', 'hasWard', 'hasEndurance',
  'poised', 'poiseBroken', 'esRecharging',
  'stationary', 'moving',
  'comboVaried', 'comboRepeated',
  'recentlyHit', 'recentlyCrit', 'recentlyKilled',
  'recentlyHurt', 'notHurtRecently',
  'recentlyBlocked', 'recentlyEvaded',
  'recentlyMoved', 'recentlyHealed',
  'strided',
];

/** Bit i ⇔ CONDITION_IDS[i] (shared by Actor.refreshConditions and StatSheet). */
export const COND_BIT: Record<ConditionId, number> = Object.fromEntries(
  CONDITION_IDS.map((id, i) => [id, 1 << i]),
) as Record<ConditionId, number>;

export function isConditionId(id: string): id is ConditionId {
  return (CONDITION_IDS as readonly string[]).includes(id);
}

export interface Modifier {
  stat: string;
  kind: ModKind;
  value: number;
  /** kind 'link' only: the SOURCE stat siphoned from — the grant is
   *  value × the source's links-disabled baseline. */
  fromStat?: string;
  /** kind 'link' only: 'flat' (default) joins the base layer; 'increased'
   *  joins the additive increased% pool (honest scaling for multiplier stats). */
  linkTarget?: 'flat' | 'increased';
  /** kind 'link' only: optional floor on the read fromStat (prevents negative
   *  shredded resistances from turning a positive link into a penalty). */
  minFrom?: number;
  /** kind 'link' only: optional baseline subtracted from fromStat before
   *  clamping/scaling (e.g. 1 for base-1 multiplier stats like minionDamage or
   *  healPower, or 200 for moveSpeed). */
  fromOffset?: number;
  /** Scale `value` by a live GAUGE — a numeric quantity the actor samples
   *  each frame ('status:poison' = own stacks, 'charge:fury' = banked
   *  count). "2% increased damage per poison stack on you" is
   *  gaugeMod('damage','increased',0.02,'status:poison'). GOLDEN RULES:
   *  gauges are integer, event-driven quantities (stacks, charges) — never
   *  per-frame floats (cache health) and never stat queries (no loops);
   *  every gauge is bounded by its own cap (maxStacks, chargeCap). */
  gauge?: string;
  /** THE GAUGE GATE (with `gauge`): instead of SCALING by the live gauge,
   *  the modifier applies at its full `value` only while the gauge stands
   *  at or above this count — "at 5 fury charges, +30% critical multiplier"
   *  is gaugeGateMod('critMulti','flat',0.3,'charge:fury',5). Below the
   *  line the modifier is inert; the gauge's own cap bounds the ask. */
  gaugeAt?: number;
  /** If present, the modifier only applies when the query context contains ALL of these tags. */
  tags?: SkillTag[];
  /** If present, the modifier only applies while the actor satisfies this condition. */
  when?: ConditionId;
  /** If present, the modifier only applies while the actor does NOT satisfy this condition. */
  unless?: ConditionId;
}

/** Convenience constructor so data files read nicely. */
export function mod(stat: string, kind: ModKind, value: number, tags?: SkillTag[], when?: ConditionId): Modifier {
  return { stat, kind, value, tags, when };
}

/** STAT LINK constructor: "gain `ratio` of <fromStat> as <stat>" —
 *  linkMod('thorns', 'lifeRegen', 0.4) is "gain 40% of life regeneration
 *  as thorns". Single-hop by engine rule: the granted amount can never
 *  feed another link, so A→B and B→A coexist without compounding. */
export function linkMod(stat: string, fromStat: string, ratio: number, tags?: SkillTag[], when?: ConditionId): Modifier {
  return { stat, kind: 'link', value: ratio, fromStat, tags, when };
}

/** INCREASED-POOL STAT LINK: adds `ratio × max(0, fromStat - fromOffset)` into
 *  the target stat's additive `increased` layer rather than `flat` — the honest
 *  lane for multiplier stats like damage, attackSpeed, castSpeed, or aoeRadius. */
export function linkIncMod(
  stat: string, fromStat: string, ratio: number,
  tags?: SkillTag[], when?: ConditionId, fromOffset?: number,
): Modifier {
  return {
    stat, kind: 'link', linkTarget: 'increased', minFrom: 0, value: ratio, fromStat,
    ...(fromOffset !== undefined ? { fromOffset } : {}),
    tags, when,
  };
}

/** GAUGE-SCALED modifier: `value` multiplies by the live gauge each query —
 *  gaugeMod('damageTaken','increased',0.02,'status:poison') is "2%
 *  increased damage taken per stack of poison on you". */
export function gaugeMod(stat: string, kind: ModKind, value: number, gauge: string, tags?: SkillTag[], when?: ConditionId): Modifier {
  return { stat, kind, value, gauge, tags, when };
}

/** GAUGE-GATED modifier: the full `value` applies only while the live gauge
 *  reads at least `at` — gaugeGateMod('critMulti','flat',0.3,'charge:fury',5)
 *  is "+30% critical strike multiplier while you have 5 or more fury
 *  charges". The threshold twin of gaugeMod (which scales per unit). */
export function gaugeGateMod(stat: string, kind: ModKind, value: number, gauge: string, at: number, tags?: SkillTag[], when?: ConditionId): Modifier {
  return { stat, kind, value, gauge, gaugeAt: at, tags, when };
}

/** Does this modifier read the VICTIM SCOPE (any 'vs:' tag)? The one
 *  predicate the hit site and the sheet's arming derivation share. */
export function modReadsVictim(m: { tags?: readonly SkillTag[] }): boolean {
  if (!m.tags) return false;
  for (const t of m.tags) if (t.startsWith('vs:')) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Stat registry. Defines defaults + display metadata. New stats are added
// here and immediately usable by any modifier in any data file.
// ---------------------------------------------------------------------------

export interface StatDef {
  label: string;
  /** A flat grant can name the mechanic it enables on equipment. */
  grant?: { kind: 'proc' | 'combo'; name: string; ppm?: number };
  base: number;
  min?: number;
  max?: number;
  /** Display as percentage in the character sheet. */
  percent?: boolean;
  /** One sheet-tooltip line on what the stat DOES (assigned from
   *  data/sheet.ts's STAT_BLURBS — the mechanics live in defense.ts/
   *  damage.ts; this is the player-facing why). */
  desc?: string;
}

export const STAT_DEFS: Record<string, StatDef> = {
  // Resources
  life:           { label: 'Maximum Life', base: 20, min: 1 },
  lifeRegen:      { label: 'Life Regeneration /s', base: 0.6 },
  /** Fraction of MAXIMUM life regenerated per second (adds to flat lifeRegen). */
  lifeRegenPct:   { label: 'Life Regeneration %', base: 0, min: 0, percent: true },
  mana:           { label: 'Maximum Mana', base: 30, min: 0 },
  manaRegen:      { label: 'Mana Regeneration /s', base: 2 },
  /** Fraction of MAXIMUM mana regenerated per second (adds to flat manaRegen). */
  manaRegenPct:   { label: 'Mana Regeneration %', base: 0, min: 0, percent: true },
  /** THE ACTOR'S OWN 'lowLife' line as a stat (base LOW_LIFE_FRAC): where
   *  "on low life" begins for THIS body. Flat mods shift the wearer's line
   *  (a pact belt that counts you low at half); minion-lane mods shift a
   *  minion's (Unstable Flesh reads the minion's own line). Read
   *  UNCONDITIONED by the condition mask — it IS the mask's input — so
   *  keep line mods unconditional. */
  lowLifeLine:    { label: 'Low-Life Threshold', base: LOW_LIFE_FRAC, min: 0, max: 0.9, percent: true },
  /** THE STRIDE (THE LEGEND FABRIC): world units of willed walking that
   *  arm the 'strided' condition; 0 = off. A grantor sets the reach, the
   *  condition reads it, the next landed blow spends it. */
  strideReach:    { label: 'Stride Reach', base: 0, min: 0 },

  // Mobility & action speed
  moveSpeed:      { label: 'Movement Speed', base: 200, min: 30 },
  /** Grip on the ground: below 1, movement becomes momentum that carries
   *  and slides (ice). A STAT, so anything — terrain status, curse, gear —
   *  can make anyone slip. */
  traction:       { label: 'Traction', base: 1, min: 0.05, max: 1, percent: true },
  attackSpeed:    { label: 'Attack Speed', base: 1, min: 0.1 },
  castSpeed:      { label: 'Cast Speed', base: 1, min: 0.1 },
  cooldownRecovery: { label: 'Cooldown Recovery', base: 1, min: 0.1 },
  // USE-CHARGES (SkillDef.useCharges): skills that bank N uses and recover
  // them one at a time on their own clock instead of a cooldown. Both are
  // queried with the skill's tags, so "+1 melee skill charge" is a filter.
  /** Flat bonus to a skill's use-charge maximum. */
  skillCharges:   { label: 'Additional Skill Charges', base: 0 },
  /** Multiplier on use-charge recovery speed. */
  skillChargeRate:{ label: 'Skill Charge Recovery', base: 1, min: 0.1 },
  // THE AMMUNITION LANES (SkillDef.useCharges beyond the trickle):
  /** Multiplier on 'reload'-tagged cast/channel speed — the racking hand
   *  (folds into speedFactor beside attack/cast speed, so investment
   *  shortens the bar AND quickens reload-channel beats alike). */
  reloadSpeed:    { label: 'Reload Speed', base: 1, min: 0.1 },
  /** MORE damage on the press that spends a bank's LAST round (base ×1 —
   *  a pure opt-in lever for "the final shell hits hardest" supports). */
  finalRoundDamage: { label: 'Final Round Damage', base: 1, min: 0 },

  // Offense
  accuracy:       { label: 'Accuracy Rating', base: 80, min: 1 },
  critChance:     { label: 'Critical Strike Chance', base: 0.03, min: 0, max: 0.95, percent: true },
  critMulti:      { label: 'Critical Strike Multiplier', base: 1.3, min: 1 },
  /** THE MALIGNANT LANE (DoTs can crit, 2026-07-21): the fraction of your
   *  critical chance that applies when a DAMAGING AILMENT lands — rolled
   *  ONCE at application, and a critical burn ticks at the full critical
   *  multiplier for its whole life (the armed keg scales with it, deriving
   *  from the same dps). Base 0: an UNLOCK (passive node / gem grant),
   *  never ambience — the crit-dot build is a deliberate investment. */
  dotCrit:        { label: 'Ailment Critical Rate', base: 0, min: 0, max: 1, percent: true },
  /** THE SEPTIC BARGAIN (hit-to-DoT conversion, 2026-07-21): this fraction
   *  of every hit's BITE is FORGONE — carved off the packet before it
   *  lands — and returns through the damaging afflictions the hit
   *  produces, as if the blow had landed (forgone × afflictionYield)
   *  harder. Build to 1 and hits become pure carriers: the wound is the
   *  weapon. Base 0: an unlock, never ambience. */
  hitToAffliction: { label: 'Hit Damage Forgone to Afflictions', base: 0, min: 0, max: 1, percent: true },
  /** The forgone chunk's return rate through the affliction (the septic
   *  bargain's premium — base 1 = even trade; the gem's +0.5 pays half
   *  again). */
  afflictionYield: { label: 'Affliction Yield', base: 1, min: 0 },
  /** Generic damage multiplier bucket — always queried with context tags. */
  damage:         { label: 'Damage', base: 1, min: 0 },
  // Flat added damage buckets (also tag-filtered, e.g. "adds fire damage to attacks").
  addedPhysical:  { label: 'Added Physical Damage', base: 0 },
  addedFire:      { label: 'Added Fire Damage', base: 0 },
  addedCold:      { label: 'Added Cold Damage', base: 0 },
  addedLightning: { label: 'Added Lightning Damage', base: 0 },
  addedChaos:     { label: 'Added Chaos Damage', base: 0 },

  // Defense
  damageImmunity: { label: 'Damage Immunity', base: 0, min: 0 },
  debuffImmunity: { label: 'Debuff Immunity', base: 0, min: 0 },
  armor:          { label: 'Armor', base: 0, min: 0 },
  evasion:        { label: 'Evasion Rating', base: 40, min: 0 },
  // Resistances are UNCAPPED raw values — overcap buffers against shred.
  // The EFFECTIVE value is clamped at query time (damage.ts resistValue) by
  // the per-element SOFT-CAP stat below, itself ceilinged by the absolute
  // hard cap (DEFENSE_CFG.resistance.hardCap) so immunity is unreachable.
  fireRes:        { label: 'Fire Resistance', base: 0, percent: true },
  coldRes:        { label: 'Cold Resistance', base: 0, percent: true },
  lightningRes:   { label: 'Lightning Resistance', base: 0, percent: true },
  chaosRes:       { label: 'Chaos Resistance', base: 0, percent: true },
  // The investable soft caps ("+5% to maximum fire resistance" is a flat mod).
  fireResMax:      { label: 'Maximum Fire Resistance', base: 0.75, min: 0, max: DEFENSE_CFG.resistance.hardCap, percent: true },
  coldResMax:      { label: 'Maximum Cold Resistance', base: 0.75, min: 0, max: DEFENSE_CFG.resistance.hardCap, percent: true },
  lightningResMax: { label: 'Maximum Lightning Resistance', base: 0.75, min: 0, max: DEFENSE_CFG.resistance.hardCap, percent: true },
  chaosResMax:     { label: 'Maximum Chaos Resistance', base: 0.75, min: 0, max: DEFENSE_CFG.resistance.hardCap, percent: true },

  // POISE — the break-bar (Fortitude's lane; see DEFENSE_CFG.poise for the
  // state-machine rules). ARMED, the bearer takes poiseDR less HIT damage
  // and shrugs hard CC at poiseCcAvoid; every hit drains the bar. At zero
  // it BREAKS: benefits lapse, and after poiseRegenDelay the bar recovers
  // UNINTERRUPTIBLY (an inert, broken bar can't be drained or delayed) to
  // the poiseRearmAt line, where it re-arms. Armed-but-dented bars refill
  // only after poiseCalmDelay seconds without a drain.
  // The pool ships EMPTY: poise is an IDENTITY, not ambience — a rabbit has
  // none, a knight authors his, and a hero BUYS a base (gear lanes,
  // passives, stance grants) that attributes then only SCALE. A zero-max
  // bar is fully inert: no DR, no CC shrug, no break fanfare, no weight
  // anchor (every consumer already gates on max > 0).
  poise:          { label: 'Maximum Poise', base: 0, min: 0 },
  /** Fraction of max poise recovered per second — the rate of both the
   *  broken-bar recovery climb and the out-of-combat calm refill. */
  poiseRegenPct:  { label: 'Poise Recovery %', base: 0.25, min: 0, percent: true },
  /** Seconds after the BREAK before the recovery climb begins (stamped
   *  once, at the break — never reset by further hits). 0 is legal:
   *  "recovery begins the instant your poise breaks" is an investment. */
  poiseRegenDelay:{ label: 'Poise Recovery Delay', base: 1.5, min: 0 },
  /** The RE-ARM line: fraction of max poise a broken bar must climb back
   *  to before it re-arms and the benefits return. Base 1 = the full bar;
   *  passives can pull it down ("re-arm at 60%") for faster cycling. */
  poiseRearmAt:   { label: 'Poise Re-arm Threshold', base: 1, min: 0.05, max: 1, percent: true },
  /** Seconds without a poise drain before an armed-but-dented bar begins
   *  refilling — the out-of-combat gate. Mid-fight, an unbroken bar is a
   *  wearing resource, not a regenerating one. */
  poiseCalmDelay: { label: 'Poise Calm Refill Delay', base: 4, min: 0 },
  /** Hit-damage reduction while the bar is unbroken. */
  poiseDR:        { label: 'Poise Damage Reduction', base: 0.15, min: 0, max: 0.75, percent: true },
  /** Chance to ignore hard crowd control while the bar is unbroken. */
  poiseCcAvoid:   { label: 'Poise Stun Avoidance', base: 0.35, min: 0, max: 1, percent: true },
  /** ATTACKER-side multiplier on the poise damage your hits inflict —
   *  tag-queried, so "40% more poise damage with maces" is a filter. */
  poiseDamage:    { label: 'Poise Damage Dealt', base: 1, min: 0 },
  /** Flat poise restored to YOU per hit you land (tag-queried like
   *  lifeOnHit) — the fight-to-stay-armed sustain lane. Flows through
   *  gainPoise, so it feeds a broken bar's climb and can OVERCHARGE. */
  poiseOnHit:     { label: 'Poise Gained on Hit', base: 0, min: 0 },
  /** OVERCHARGE headroom: explicit gains (poiseOnHit, restores, procs) may
   *  crest the bar this fraction PAST max — a temporary larger buffer for
   *  eating a telegraphed haymaker; the overage decays back toward max
   *  (DEFENSE_CFG.poise.overDecay). Natural recovery never overcharges. */
  poiseOvercharge:{ label: 'Maximum Poise Overcharge', base: 0, min: 0, percent: true },

  // THE SLAYER LANE — attacker-side MORE multipliers that key off what the
  // VICTIM is relative to YOU, folded once at the mitigation chokepoint
  // (damage.ts mitigateTyped — every source, no side path). Four orthogonal
  // axes, each a plain stat any granter can feed (support gems today;
  // affixes, passives, monster mods tomorrow): LEVEL (the quickened-ground /
  // outleveled-boss diet), WEIGHT (the mass fabric's heft read), RARITY (the
  // named and the crowned). All ship at 0 — the lane is built, never ambient.
  /** MORE damage vs enemies of HIGHER LEVEL than you (strictly above). */
  overmatch:      { label: 'Damage vs Higher-Level Enemies', base: 0, min: 0, percent: true },
  /** MORE damage vs enemies at least SLAYER_CFG.giantsbaneRatio × your
   *  effective weight — the giant-feller's axis (POISE IS MASS, and so is this). */
  giantsbane:     { label: 'Damage vs Far Heavier Enemies', base: 0, min: 0, percent: true },
  /** MORE damage vs magic/rare/champion/crowned bodies — the headhunter's axis. */
  regicide:       { label: 'Damage vs Empowered Enemies', base: 0, min: 0, percent: true },
  /** MORE damage vs a composite monster's ANCHORED PARTS (Actor.partLink) —
   *  the limb-hunter's axis: the pavise, the censer, the mounted archer, the
   *  bell. Structure, not a defense layer (that's the breaker suite) and not
   *  what the victim is relative to you (the three above) — WHERE on the
   *  creature you chose to spend the blow. */
  limbreaver:     { label: 'Damage vs Monster Parts', base: 0, min: 0, percent: true },
  /** MORE damage vs ROOTED bodies (Actor.stationary — defs whose base
   *  moveSpeed is 0: siege engines, spawner objects, idols, planted totems).
   *  The lane's fifth axis: not what the victim is relative to you, not
   *  where on the creature — whether it can WALK AWAY. Structural stamp at
   *  mint, never a CC read (chill is the ailment suite's business). */
  siegebreaker:   { label: 'Damage vs Immobile Bodies', base: 0, min: 0, percent: true },
  /** MORE damage vs SPENT bodies (Actor.spent — engine/reserves.ts: any
   *  reserve at/below its threshold, or a vent window standing open). The
   *  lane's sixth axis, and the first one keyed off a state the victim
   *  ENTERS AND LEAVES rather than a fact about what it is: the whole
   *  point is that it rewards WAITING. Bait the expensive move, then
   *  spend your own burst into the window it opened. */
  spentbane:      { label: 'Damage vs Spent Enemies', base: 0, min: 0, percent: true },
  /** MORE damage vs a body wearing MonsterDef.rooted that is standing OFF
   *  its claimed ground (Actor.rootedHeld false). The lane's seventh axis
   *  and its most positional: the mass fabric (shoveAuthority, knockback,
   *  a grab-and-throw) is how you ARM it, and killing the heart that
   *  grows the floor is how you arm it for the whole court at once. */
  uprooter:       { label: 'Damage vs Uprooted Enemies', base: 0, min: 0, percent: true },
  /** MORE damage vs a body standing in a WARDEN'S FAVOR (Actor.bondHeld —
   *  engine/pack.ts). The lane's eighth axis, and the first keyed off a
   *  SOCIAL fact rather than a physical one. It exists to give the pack
   *  layer a second honest answer: the drawn link says "kill the holder
   *  and they all soften", and this says "or don't — cut straight through
   *  the favored instead". Two live strategies against one visible
   *  structure is the whole reason to draw the structure at all. */
  bondbreaker:    { label: 'Damage vs Warded Enemies', base: 0, min: 0, percent: true },
  /** MORE damage vs a body whose NERVE has frayed past SLAYER_CFG.quailAt
   *  (Actor.aiNerve — engine/pack.ts). The lane's ninth axis and the
   *  sharpest reward for reading rather than swinging: nerve is driven by
   *  wounds, by odds, and by whether its captain still stands, so this
   *  pays for pressure you APPLIED — flank it, drop its leader, thin its
   *  line — and the craven's collapsing posture is the tell that says the
   *  bonus is live. Spentbane's social twin: a state the victim enters
   *  and leaves, and one you can deliberately cause. */
  quailbane:      { label: 'Damage vs Faltering Enemies', base: 0, min: 0, percent: true },

  // THE EASE LANE — per-meter survival-drain relief (world/regions.ts
  // survivalEaseStat: the `survivalEase_<resource>` family): a fraction of
  // slower DRAIN for one named meter, folded ONCE at World.drainSurvival and
  // capped by the meter's own row (easeCap — slowed, never stopped). One row
  // per REGISTERED resource so gear lines describe themselves; a new meter's
  // row joins here beside its SURVIVAL_RESOURCES entry. Debut: 'of the
  // Lampkeeper' (THE ABYSSAL REGISTER) eases light in the Descent's abyss
  // and under the Gloaming alike — one stat, every dark.
  survivalEase_light:  { label: 'Slower Light Drain', base: 0, min: 0, percent: true },
  survivalEase_breath: { label: 'Slower Breath Drain', base: 0, min: 0, percent: true },
  survivalEase_soul:   { label: 'Slower Soul Drain', base: 0, min: 0, percent: true },

  // INSIGHT — the momentum-fed avoidance pool (Charisma's lane): reading the
  // opponent's body language and slipping the brunt. Reduction scales with
  // MOMENTUM (1 while moving, tapering to 0 over insightTaper seconds after
  // stopping) and SPENDS the pool; it only refills while moving.
  // Ships EMPTY like poise: the duelist's read is TRAINED, not ambient —
  // monsters author it as their texture (the stalker, the ronin), heroes
  // buy a base from gear/passives that attributes only scale.
  insight:        { label: 'Maximum Insight', base: 0, min: 0 },
  /** Damage reduction at FULL momentum (tapers with it). */
  insightDR:      { label: 'Insight Damage Reduction', base: 0.5, min: 0, max: 0.9, percent: true },
  /** THE INVERSION DIAL (0..1): blends insight's momentum source from
   *  MOTION (0, the default) to STILLNESS (1) — at 1, planting your feet
   *  ramps momentum in over insightStillTaper seconds and walking bleeds
   *  it; between, both flows blend. A dial, not a flag: half-inverted
   *  hybrids are a real allocation. */
  insightInversion: { label: 'Insight Inversion', base: 0, min: 0, max: 1, percent: true },
  /** Seconds of unbroken STILLNESS to reach full inverted momentum —
   *  deliberately LONGER than insightTaper's wear-off (the rooted stance
   *  is EARNED slowly, lost fast; both ends are investable stats). */
  insightStillTaper: { label: 'Rooted Insight Ramp', base: 6, min: 0.5 },
  /** Fraction of max insight recovered per second of MOVEMENT. Deliberately
   *  lean at base: an uninvested pool runs dry in the first exchange and
   *  stays functionally dry — investment in the pool raises the ABSOLUTE
   *  refill with it, which is what buys sustained weaving. */
  insightRegenPct:{ label: 'Insight Recovery %', base: 0.12, min: 0, percent: true },
  /** Seconds the reduction takes to taper to zero after stopping. */
  insightTaper:   { label: 'Insight Taper Time', base: 2.5, min: 0.1 },
  /** Damage avoided per point of insight spent. */
  insightEfficiency: { label: 'Insight Efficiency', base: 1, min: 0.1 },
  /** Fraction of insight's momentum SAPPED outright (0..1) — the hobbled-
   *  footwork lever. Statuses that bind the body wear it as an ordinary
   *  mod (chill 0.4, frozen/stunned/petrified 1), so COLD is the answer
   *  to the duelist you cannot pin: multiplies the FINAL momentum blend
   *  (motion and rooted stillness alike read as nothing through a frozen
   *  nerve), which also stalls the refill — momentum feeds both. Any
   *  status, ground, or curse can carry it; it is a stat, not a flag. */
  insightSap:     { label: 'Insight Sapped', base: 0, min: 0, max: 1, percent: true },

  // ENDURANCE — the break-less third pool (the D4-Fortify / LE-Endurance
  // shape): while the bar holds, hits are reduced by enduranceDR, FLAT —
  // no wear curve, no break status, no re-arm; pool present = protected,
  // pool empty = nothing (the deliberate contrast with poise). The pool
  // SPENDS what it prevents (banked prevention), trickles back slowly on
  // its own (delay-gated), and is really refilled by FORTIFY effects
  // (the 'fortify' proc payload and future skill effects). Base 0 = a
  // fully opt-in archetype.
  endurance:      { label: 'Maximum Endurance', base: 0, min: 0 },
  /** Hit-damage reduction while ANY endurance holds (flat, binary-on). */
  enduranceDR:    { label: 'Endurance Damage Reduction', base: 0.2, min: 0, max: 0.6, percent: true },
  /** Fraction of max endurance recovered per second (after the delay) —
   *  deliberately lean: fortify effects are the real refill. */
  enduranceRegenPct: { label: 'Endurance Recovery %', base: 0.08, min: 0, percent: true },
  /** Seconds after spending endurance before recovery begins. */
  enduranceRegenDelay: { label: 'Endurance Recovery Delay', base: 2.5, min: 0.2 },

  // On-kill sustain (the classic "+X per kill" trio) — tag-queried with
  // the slaying skill's context, so "life per kill with melee" is a filter.
  lifeOnKill:     { label: 'Life Gained on Kill', base: 0, min: 0 },
  manaOnKill:     { label: 'Mana Gained on Kill', base: 0, min: 0 },
  esOnKill:       { label: 'Energy Shield Gained on Kill', base: 0, min: 0 },

  /** CULLING: your hits EXECUTE enemies at or below this fraction of max
   *  life (the classic culling strike). Hard-capped well short of half. */
  cullThreshold:  { label: 'Culling Threshold', base: 0, min: 0, max: 0.3, percent: true },

  /** PULSATING projectiles: flight-time size oscillation amplitude (±this
   *  fraction of base radius, on a fixed breath — the living missile). */
  projPulse:      { label: 'Projectile Pulsation', base: 0, min: 0, max: 1, percent: true },
  /** ECHOING MIGHT: after a landed hit, gain added physical damage equal
   *  to this fraction of what it dealt, for a few seconds — the previous
   *  blow feeds the next (the inverse-ignite buff). */
  echoMight:      { label: 'Echoing Might', base: 0, min: 0, percent: true },
  /** PROXIMITY damage: up to this much MORE damage at touch range,
   *  tapering to nothing at DEFENSE_CFG.proximity.radius. */
  proximityDamage:{ label: 'Proximity Damage', base: 0, min: 0, percent: true },
  /** Flat damage per point of RESERVED mana, pro-rata over the skill's
   *  rolled types (the dominion artery — locked power IS power). */
  reservedDamage: { label: 'Damage per Reserved Mana', base: 0, min: 0 },
  /** Flat damage per point of MAXIMUM mana, pro-rata (the archmage base). */
  maxManaDamage:  { label: 'Damage per Maximum Mana', base: 0, min: 0 },
  /** DOOM also TICKS: chaos dps equal to this fraction of the armed
   *  payload while the fuse runs (it still culls at lethal). */
  doomDot:        { label: 'Doom Damage over Time', base: 0, min: 0, percent: true },
  /** How many DURATION-mode auras (the auraDuration graft) may burn at
   *  once — the oldest gives way past the cap. */
  durationAuraCap:{ label: 'Duration Aura Limit', base: 2, min: 1 },

  /** PROC CHAIN DEPTH: how many LAYERS of proc-in-proc your triggers may
   *  run (0 = procs fire from real actions only — the classic rule). Each
   *  extra layer rolls at DEFENSE_CFG.procs.depthFalloff of its chance,
   *  and the hard ceiling (maxExtraDepth) is absolute — the proc-combat
   *  archetype's investment lane, exploit-proof by geometry. Governs hit
   *  chains AND gain chains (charge/buff procs granting charges/buffs)
   *  with the same numbers — one rule, no bespoke variants. */
  procDepth:      { label: 'Proc Chain Depth', base: 0, min: 0, max: DEFENSE_CFG.procs.maxExtraDepth },
  /** LUCK — the proc-rate multiplier (deliberately NOT drop rates): every
   *  proc roll's chance is × (1 + luck), on top of its rate discipline.
   *  Tag-queried where a skill context exists, so "lucky with melee
   *  skills" is a filter. Negative luck is a real curse lever. */
  luck:           { label: 'Luck', base: 0, min: -0.9, max: 1, percent: true },

  // BODY MASS & SUBSTANCE
  /** How shovable this body is: knockback and crowd separation divide by
   *  it. Monsters default it from body radius × material density
   *  (DEFENSE_CFG.weight, MATERIAL_NATURE) — and the mass fabric
   *  (engine/mass.ts) reads the same number as shove AUTHORITY: the heavy
   *  both resist shoves and shove harder. */
  weight:         { label: 'Weight', base: 1, min: 0.05 },
  /** Multiplies your shove AUTHORITY (engine/mass.ts) — the pusher-side
   *  term every owned push carries, applied AFTER the body-size clamp so
   *  investment scales openly. Tag-filtered through the live skill, so
   *  "authority on melee skills" is one passive away. */
  shoveAuthority: { label: 'Shove Authority', base: 0, percent: true },
  /** Scales the impact wounds your shoves inflict on arrest (wall slams
   *  and the bowling lane both — engine/mass.ts). Tag-filtered. */
  impactDamage:   { label: 'Impact Damage', base: 0, percent: true },
  /** THE TRAMPLE LANE (engine/lite.ts): flat weight added to your
   *  effectiveWeight FOR TRAMPLE CHECKS ONLY — moving through a swarm's
   *  pool bodies disperses any kind whose trample gate your speed + mass
   *  meet. Offense-only mass: it never changes how shovable YOU are (that
   *  is `weight`), only what the small underfoot can survive. Monsters
   *  wear it too (base.trample — the stampeding kinds scatter YOUR veil). */
  trample:        { label: 'Trample Mass', base: 0, min: 0 },
  /** THE EXTERMINATOR'S EDGE (engine/plies.ts + the lite carve): each
   *  landed blow vs a PLIED body tears this many EXTRA plies (floored —
   *  quanta, like the fabric it cuts). Tag-queried at the real ply gate;
   *  the pool's carve reads the untagged lane. */
  plyRend:        { label: 'Ply Rend', base: 0, min: 0 },
  /** THE WITNESS LEVER (engine/mimic.ts): > 0 opens witnessed capture —
   *  studied arts CAST within value × MIMIC_CFG.witnessRadius of you are
   *  banked without the blow. Read off the mimic slot (supports socketed
   *  there count), so the lane is an earned identity, never a freebie. */
  mimicWitness:   { label: 'Witnessed Capture', base: 0 },
  /** Extra captured arts the mimic bank holds beyond MIMIC_CFG.bankSize
   *  (engine/mimic.ts) — the repertoire widener. */
  mimicBank:      { label: 'Mimic Repertoire', base: 0 },
  /** THE POSSESSION SEAM (engine/possess.ts): scales how long a possession
   *  holds (× the spec/POSSESS_CFG duration). Read off the pressing gem at
   *  embark (supports socketed there count), stamped onto the ride. */
  possessDuration: { label: 'Possession Duration', base: 1, min: 0.25, percent: true },
  /** ADDS to the borrowed body's power factor (the MORE-damage haircut a
   *  ridden kit casts at) — +0.1 turns 0.8 into 0.9. Read off the gem. */
  possessPower:   { label: 'Possessed Might', base: 0, percent: true },
  /** LESS damage the vacated HUSK takes while its seat is away — the
   *  trance-warding lever (fraction, 0.4 = 40% less). Read off the gem
   *  at embark; the husk interrupt ladder gets honestly longer with it. */
  huskGuard:      { label: 'Husk Ward', base: 0, min: 0, max: 0.9, percent: true },
  /** THE GRAB FABRIC's holder-side lever (engine/grab.ts): opens the mass
   *  gate (holder weight × (1+gripPower) vs victim weight) and slows the
   *  held body's struggle. Tag-filtered through the seizing skill, so
   *  "grip on grab skills" is one gem away. */
  gripPower:      { label: 'Grip Power', base: 0, percent: true },
  /** THE GRAB FABRIC's victim-side lever: struggle out of holds this much
   *  faster (the eel's answer to the ogre's palm). */
  wriggle:        { label: 'Wriggle', base: 0, percent: true },
  /** THE WRING (the grab support lane's third lever, beside gripPower and
   *  the throw stats): while a hold this skill established lives, the held
   *  body takes this fraction of ITS max life per second as physical —
   *  mitigated, holder-credited, read at the grab sweep through the
   *  seizing skill's context (the gripPower idiom). The swallow's own
   *  digestion stacks on top: the gulp is the verb, the wring is the
   *  investment. */
  gripCrush:      { label: 'Crushing Grip', base: 0, min: 0, percent: true },
  /** > 0: no body collision at all — walks THROUGH actors (and they through
   *  it). Hits and targeting are unaffected; this is substance, not stealth. */
  phasing:        { label: 'Phasing', base: 0, min: 0 },

  /** While holding energy shield (es > 0), damage over time is reduced by
   *  this fraction — the INVESTABLE lever toward "ES shrugs DoT" at 100%. */
  esDotResist:    { label: 'DoT Resistance while on Energy Shield', base: 0, min: 0, max: 1, percent: true },
  /** Fraction of damage over time that SEEPS PAST the energy shield straight
   *  to what's beneath (base 0: ES is a true second life pool and DoT drains
   *  it). Tag-filtered like everything — "chaos DoT fully bypasses energy
   *  shield" is linkable to one element; victim-side curses can grant it too. */
  esDotBypass:    { label: 'DoT Bypasses Energy Shield', base: 0, min: 0, max: 1, percent: true },

  // PENETRATION — attacker-side, tag-filtered. Applied AFTER the victim's
  // resistance caps (the classic model: pen digs below the cap, down to the
  // DEFENSE_CFG.resistance.floor), so it is the counter to res stacking
  // without ever re-opening the immunity door on the defender's side.
  firePen:        { label: 'Fire Penetration', base: 0, min: 0, percent: true },
  coldPen:        { label: 'Cold Penetration', base: 0, min: 0, percent: true },
  lightningPen:   { label: 'Lightning Penetration', base: 0, min: 0, percent: true },
  chaosPen:       { label: 'Chaos Penetration', base: 0, min: 0, percent: true },
  /** Fraction of the victim's armor ignored by your physical hits. */
  armorDamageFloor: { label: 'Physical Damage Retained Against Armor', base: 0, min: 0, max: 1, percent: true },
  armorPen:       { label: 'Armor Penetration', base: 0, min: 0, max: 1, percent: true },
  /** Fraction of the victim's INSIGHT slip your hits DENY (armorPen's
   *  rhythm-sibling, the anti-dodge lever): the blow lands too true to
   *  read. The pool only spends what it actually avoided, so piercing
   *  also spares the victim's meter — you beat the read, not the bank. */
  insightPen:     { label: 'Insight Penetration', base: 0, min: 0, max: 1, percent: true },
  /** ATTACKER multiplier on ENERGY SHIELD drained per point of damage the
   *  shield soaks (hits only — DoTs seep past shields, they don't shred).
   *  Above 1 strips the pool faster AND spends less of the blow per point
   *  stripped; below 1 is the gentle hand that leaves wards standing. */
  esShred:        { label: 'Energy Shield Shred', base: 1, min: 0.25 },

  // Sustain for the OTHER pools (life has lifeOnHit/lifeLeech; ward has
  // wardLeech — these complete the family).
  esOnHit:        { label: 'Energy Shield Gained on Hit', base: 0, min: 0 },
  esLeech:        { label: 'Damage Leeched as Energy Shield', base: 0, min: 0, max: 0.2, percent: true },
  manaLeech:      { label: 'Damage Leeched as Mana', base: 0, min: 0, max: 0.15, percent: true },

  // Block & evade texture
  /** CAP on the fraction of a blocked wound the guard may stop (base 1 —
   *  a wide-enough guard stops everything; below 1 that fraction leaks
   *  however strong the guard — bosses can carry high block chance with
   *  low power and stay pressureable). */
  blockPower:     { label: 'Block Power', base: 1, min: 0, max: 1, percent: true },
  /** FLAT investment lane on the block's GUARD (the WoW-style block
   *  VALUE): adds to the level floor DEFENSE_CFG.block grants every
   *  blocker, × guardStrength — the guard eats the wound up to that
   *  total and only the excess seeps (damage.ts, the guard law). */
  blockValue:     { label: 'Block Value', base: 0, min: 0 },
  /** RECUPERATION (the stagger-heal): this fraction of every hit that
   *  lands on LIFE flows back as healing over recuperateTime seconds —
   *  wounds that half-close if you survive them. */
  recuperate:     { label: 'Recuperation', base: 0, min: 0, max: 0.75, percent: true },
  recuperateTime: { label: 'Recuperation Time', base: 6, min: 1 },
  /** LUCKY HITS: chance to roll damage twice and keep the HIGHER —
   *  texture for wide-variance builds (its dark twin below can be
   *  inflicted: the jinxed roll twice and keep the LOWER). */
  luckyChance:    { label: 'Lucky Hit Chance', base: 0, min: 0, max: 1, percent: true },
  unluckyChance:  { label: 'Unlucky Hit Chance', base: 0, min: 0, max: 1, percent: true },
  /** DICE WIDTH: widens (negative: narrows) every damage roll's range
   *  around its midpoint — +50% turns [60..100] into [50..110]. Same mean,
   *  fatter tails: the high-roller's fuel, tag-filterable per element. */
  damageSpread:   { label: 'Damage Roll Spread', base: 0, min: -1, percent: true },
  /** HIGH-ROLL WINDOW: additively widens every rollTop gate (procs,
   *  cast-on-high-roll triggers) — a def's rollTop 0.15 plus 0.05 here
   *  fires on the top 20% of the dice. Capped: jackpots stay jackpots. */
  highRollWindow: { label: 'High Roll Window', base: 0, min: 0, max: 0.5, percent: true },
  /** GUARD MEND: allies near you heal this much per second WHILE you hold
   *  a guard stance — the aegis that shelters, not just blocks. */
  guardMend:      { label: 'Guard Mending', base: 0, min: 0 },
  /** Flat life gained when you block a hit (the deterministic floor under
   *  the chance-based on-block procs). */
  lifeOnBlock:    { label: 'Life Gained on Block', base: 0, min: 0 },
  /** Flat life gained when you evade an attack. */
  lifeOnEvade:    { label: 'Life Gained on Evade', base: 0, min: 0 },
  /** Victim-side chance an incoming CRIT lands as a normal hit instead. */
  critAvoid:      { label: 'Critical Strike Avoidance', base: 0, min: 0, max: 1, percent: true },
  /** Afflictions (non-beneficial statuses) applied to you run out this much
   *  faster (duration ÷ this) — the victim-side twin of effectDuration. */
  afflictionExpiry: { label: 'Affliction Recovery', base: 1, min: 0.2 },
  /** ATTACKER-side multiplier on the duration of the Sundered you inflict
   *  when YOUR hit breaks a poise bar — the breaker's specialization dial. */
  sunderDuration: { label: 'Sunder Duration', base: 1, min: 0.1 },
  /** Multiplier on damage received (shock raises it, fortification lowers it). */
  damageTaken:    { label: 'Damage Taken', base: 1, min: 0.1 },
  /** Multiplier on LIFE HEALING received — regen, leech, restores, pulses,
   *  bond heals, everything through Actor.healBy (the damageTaken mirror:
   *  a "seared wounds" debuff is pure status data). */
  healTaken:      { label: 'Healing Received', base: 1, min: 0 },
  bodyMass:       { label: 'Body Mass', base: 1, min: 0 },
  /** Multiplier on healing the actor GIVES (heal effects, siphons, tree
   *  bursts) — the healer's damage stat. Tag-filtered like damage, so
   *  "increased healing with channelled skills" is a modifier away. */
  healPower:      { label: 'Healing Power', base: 1, min: 0 },
  /** Scales explicit absorb effects at their granting skill, not resource-payment rewards. */
  absorbPower:    { label: 'Absorb Power', base: 1, min: 0 },
  /** Fraction of OVERHEAL (healing past full) hardened into an absorption
   *  shield on the target — the support player's answer to topped bars. */
  overheal:       { label: 'Overheal to Ward', base: 0, min: 0 },
  /** Multiplier on restore-over-time STREAM totals (the fount pours) —
   *  the drink's own potency stat, tag-filtered like damage so "flask"
   *  investment stays a modifier. Deliberately separate from healPower:
   *  the healer's output stat must not double-dip their own sustain. */
  restorePower:   { label: 'Restoration', base: 1, min: 0 },
  /** Fraction of the RESTORED POOL'S MAXIMUM added to every restore
   *  stream's total (0.03 = +3% of max per drink) — the percent lever
   *  passives/affixes grant so flat founts keep pace with big pools. */
  restorePctMax:  { label: 'Restored % of Maximum', base: 0, min: 0, percent: true },
  /** > 0: the skill is a REFLEX — its instant press PIERCES the user's own
   *  commitment (cast bars, channels, dashes, recovery) and resolves
   *  alongside it (REFLEX_CFG.during picks the open states). The
   *  from-outside twin of SkillDef.reflex: tag-scope it and any instant
   *  skill joins the wrist ("flask skills are Reflexes" is one modifier). */
  reflex:         { label: 'Reflex', base: 0, min: 0 },
  /** > 0: THIRST gates (GateSpec.missing) are waived for this skill — a
   *  brimming pool no longer refuses the drink. The rider-chaser's lever:
   *  drink for the on-drink effects and let the pour spill. */
  thirstless:     { label: 'Thirstless', base: 0, min: 0 },
  /** POUR LANES (2026-08-08, the two-stream sip — RestoreOverTimeEffect
   *  .lane): per-lane multipliers on labeled restore streams, beside the
   *  whole-pour restorePower — the trade gems' dials ("50% less settle,
   *  richer surge" is two ordinary modifiers). */
  pourPower_surge:  { label: 'Surge Pour', base: 1, min: 0 },
  pourPower_settle: { label: 'Settle Pour', base: 1, min: 0 },
  /** Flat percent-of-maximum added to a labeled lane's total. The surge's
   *  ONE investment road (its authored % is a fixed floor: no gem-level
   *  growth ever, and restorePctMax folds into the settle alone — THE
   *  ONCE-PER-DRINK LAW). */
  pourPct_surge:  { label: 'Surge % of Maximum', base: 0, min: 0, percent: true },
  pourPct_settle: { label: 'Settle % of Maximum', base: 0, min: 0, percent: true },
  /** THE PRIMED POUR (count): full-pool drinks BANK instead of refusing —
   *  every cost paid at press, the payload held, released whole by the
   *  first life-damage event. The value is how many sips may wait. */
  pourPrime:      { label: 'Primed Pours', base: 0, min: 0 },
  /** Victim-side chance to SHRUG an incoming ailment outright — queried
   *  with the status's element tag, so Purity of Fire resists ignites
   *  specifically while Purity of Elements resists the lot. */
  ailmentResist:  { label: 'Ailment Resistance', base: 0, min: 0, max: 0.9, percent: true },
  /** PASSIVE block: chance any hit is flatly stopped. Independent of Guard. */
  blockChance:    { label: 'Block Chance', base: 0, min: 0, max: 0.6, percent: true },
  /** Multiplier on guard-skill shield health. */
  guardStrength:  { label: 'Guard Strength', base: 1, min: 0.1 },
  /** Throughput multiplier on every CONDUIT the actor runs (see ConduitSpec):
   *  scales the DRAIN side; what's drawn still converts at the ratio. */
  conduitRate:     { label: 'Conduit Rate', base: 1, min: 0 },
  /** Exchange-rate multiplier on every conduit — more delivered per point
   *  drained. The efficiency lever gems, gear and passives invest in. */
  conduitEfficiency: { label: 'Conduit Efficiency', base: 1, min: 0 },

  // STAT-TRADE DIALS (see STAT_TRADES): both sides of every swap are plain
  // stats — a keystone writes them flat, gear scales them, and conditional
  // or tag-filtered versions work like any other modifier.
  /** Fraction of evasion's baseline READ AS armor (the gain dial). */
  evasionToArmor: { label: 'Evasion Read as Armor', base: 0, min: 0 },
  /** Fraction of evasion RENOUNCED (the forgo dial; 1 = all of it). */
  evasionForgone: { label: 'Evasion Forgone', base: 0, min: 0, max: 1, percent: true },
  /** Fraction of energy shield's baseline READ AS maximum poise. */
  esToPoise:      { label: 'Energy Shield Read as Poise', base: 0, min: 0 },
  /** Fraction of energy shield RENOUNCED (1 = the whole lattice). */
  esForgone:      { label: 'Energy Shield Forgone', base: 0, min: 0, max: 1, percent: true },
  /** Fraction of evasion's baseline READ AS maximum insight (the
   *  duelist's-read lane). Grant it ALONE for a pure additive echo —
   *  evasion kept whole — or beside its forgo dial for a true trade;
   *  the split IS the balance lever, authored per grantor. */
  evasionToInsight: { label: 'Evasion Read as Insight', base: 0, min: 0 },
  /** Fraction of evasion RENOUNCED by the insight read (this lane's own
   *  dial — row-scoped, never shared across trades). */
  evasionToInsightForgo: { label: 'Evasion Forgone (Insight Read)', base: 0, min: 0, max: 1, percent: true },
  /** Fraction of maximum life's baseline READ AS maximum energy shield. */
  lifeToEs:       { label: 'Life Read as Energy Shield', base: 0, min: 0 },
  /** Fraction of maximum life RENOUNCED by the energy-shield read (floors at 1). */
  lifeForgone:    { label: 'Life Forgone (Energy Shield Read)', base: 0, min: 0, max: 0.95, percent: true },

  // Thorns — the retaliation suite (#14). All victim-side.
  /** Flat damage returned to ANY attacker whose hit lands on you —
   *  always-on thorns (auras, buffs, passives grant it). */
  thorns:         { label: 'Thorns', base: 0, min: 0 },
  /** Fraction of the LANDED damage you take returned to the attacker —
   *  reflect scales with the wound where flat thorns scale with count. */
  thornsReflect:  { label: 'Thorns Reflection', base: 0, min: 0 },
  /** CASTER-side conversion: this fraction of your total flat thorns rides
   *  your hits as added physical damage (Bristling Riposte — the spikes
   *  swing with you). Queried with the skill's context, so it's a support. */
  thornsToHit:    { label: 'Thorns to On-Hit', base: 0, min: 0 },
  /** Fraction of incoming LANDED damage redirected onto your minions,
   *  split evenly among the living (Soul Link — the wall of bones is a
   *  defensive layer, if you keep it fed). */
  minionShare:    { label: 'Minion Damage Sharing', base: 0, min: 0, max: 0.8, percent: true },

  // Channeling supports (apply while a channel or guard is held)
  /** Flat damage returned to attackers who strike you while channeling. */
  channelThorns:  { label: 'Channelled Thorns', base: 0 },
  /** > 0: periodic nova while channeling, at this damage multiplier.
   *  The interval scales with attack/cast speed. */
  channelBurst:   { label: 'Channelled Eruption', base: 0 },
  /** > 0: periodic strikes land around you while channeling. */
  channelStorm:   { label: 'Channelled Tempest', base: 0 },
  /** Channel pulse damage grows by this much per second held (cap +150%). */
  channelRamp:    { label: 'Channel Ramping', base: 0 },
  /** Channeled projectile skills gain this many projectiles per second held. */
  channelSpool:   { label: 'Channel Spooling', base: 0 },
  /** CAP on spooled bonus projectiles (time-fed and hit-fed alike) — the
   *  self-stacking ceiling, investable like everything else. */
  channelSpoolCap: { label: 'Channel Spool Limit', base: 3, min: 0 },
  /** Channeled projectile skills gain this many projectiles per LANDED HIT
   *  during the unbroken channel — the inverse of time-based spooling:
   *  connection feeds the barrage, whiffing feeds nothing. */
  channelHitSpool: { label: 'Channel Blood-Spooling', base: 0, min: 0 },
  /** Overcharge stage count (each OverchargeSpec's `stages` is this
   *  query's BASE — gems and passives add stages). */
  overchargeStages: { label: 'Overcharge Stages', base: 0, min: 0 },
  /** SPARK RELEASE window, seconds: >0 lets an overcharge release land
   *  empowered when it comes within this long of a stage BANKING (the
   *  after-spark discipline — Spark Discipline grants it; an innate
   *  OverchargeSpec.window seeds the query base). */
  sparkWindow:     { label: 'Spark Release Window', base: 0, min: 0 },
  /** MORE multiplier a spark release earns (spec windowBonus seeds it). */
  sparkBonus:      { label: 'Spark Release Power', base: 0.35, min: 0 },
  /** > 0: your guard also absorbs hits against nearby minions. */
  guardAegis:     { label: 'Guardian\'s Aegis', base: 0 },
  /** > 0: your protection domes DEFLECT projectiles instead of dissolving
   *  them — they fly back wearing your colors. */
  domeDeflects:   { label: 'Domes Deflect', base: 0 },

  // WARD — the decaying shield (LE-style): a pool soaked before EVERYTHING
  // (even absorb), with no ceiling — only its own decay holds it down. The
  // whole game is accumulation vs depletion; both knobs are investable.
  /** Fraction of current ward lost per second (retention investment LOWERS it). */
  wardDecay:      { label: 'Ward Decay Rate', base: 0.35, min: 0.02, percent: true },
  /** Multiplier on all ward GAINED (the ward-build damage stat). */
  wardGain:       { label: 'Ward Gained', base: 1, min: 0 },
  /** Fraction of post-mitigation LIFE damage staggered into a pool that
   *  drains over ~3s instead of landing at once (Mortis Seal's mercy —
   *  the blood-mage stagger; a status or seal is all it takes). */
  staggerFrac:    { label: 'Damage Staggering', base: 0, min: 0, max: 0.85, percent: true },
  /** >0: incoming HITS are dodged outright — attacks, spells, projectiles
   *  alike (DoTs still tick; costs still bleed). Cerement's shroud. */
  hitImmune:      { label: 'Hit Immunity', base: 0, min: 0 },
  /** >0: a CEILING on the life damage any single mitigated HIT may land
   *  (hitImmune's graded cousin — the unburstable defense texture). Every
   *  hit still connects and still drains poise/pools in full; only the
   *  life cut flattens to the cap, and the clamp READS as 'capped' where
   *  the number prints. DoT ticks never pass this gate (applyDot soaks
   *  directly) — attrition does full work ON PURPOSE: a body wearing this
   *  is sold to ailment builds, not walled off from everyone. 0 = uncapped. */
  hitCap:         { label: 'Per-Hit Damage Cap', base: 0, min: 0 },
  // THE LAST GASP (engine/damage.ts landLifeDamage — the talent fabric's
  // cheat-death lane, docs/engine/talents.md): a blow that would EMPTY the
  // life pool instead leaves the bearer standing at lastGaspLife of max,
  // at lastGasp chance, no more than once per lastGaspCooldown seconds.
  // Three ordinary stats, so a keystone guarantees it, an affix rolls a
  // chance at it, and any modifier can lengthen or shorten the clock. The
  // gasp is an EVENT (ProcDef trigger 'lastGasp'): whatever should answer
  // it — a ward, a burst, a flight — is data on the sheet. Only life-pool
  // wounds through the two damage seams (hits, DoT ticks) can gasp; costs,
  // sacrifices and scripted falls never do. Base 0: an unlock, never
  // ambience.
  lastGasp:       { label: 'Last Gasp Chance', base: 0, min: 0, max: 1, percent: true },
  lastGaspLife:   { label: 'Last Gasp Life', base: 0.3, min: 0.01, max: 1, percent: true },
  lastGaspCooldown: { label: 'Last Gasp Cooldown', base: 60, min: 1 },

  // Layered defenses
  /** Fraction of incoming damage paid from mana before life (capped 90%). */
  manaShield:     { label: 'Mana Shield', base: 0, min: 0, max: 0.9, percent: true },
  /** Maximum energy shield: a pool soaked before mana shield and life.
   *  Recharges fast — but only after esRechargeDelay seconds untouched,
   *  and the recharge is a RUNNING STATE, not a promise: damage taken
   *  while it flows interrupts it and the wait starts over (unless
   *  esRechargeSteadfast holds). Every lever below is a stat on purpose:
   *  rate, delay, and interruption are all investable, both ways. */
  energyShield:   { label: 'Maximum Energy Shield', base: 0, min: 0 },
  /** Fraction of max energy shield recharged per second (once recharging). */
  esRechargeRate: { label: 'Energy Shield Recharge Rate', base: 0.33, min: 0.01, percent: true },
  /** Seconds without taking damage before energy shield begins recharging.
   *  0 is legal — "recharge is always running" is a reachable keystone. */
  esRechargeDelay:{ label: 'Energy Shield Recharge Delay', base: 2.5, min: 0 },
  /** Chance a wound does NOT interrupt an ACTIVE recharge — at 1 the flow,
   *  once started, runs to full through anything. Guards only the running
   *  stream: damage during the waiting period still restarts the wait. */
  esRechargeSteadfast: { label: 'Recharge Interruption Avoidance', base: 0, min: 0, max: 1, percent: true },
  /** Fraction of life regeneration converted to flat ES regeneration —
   *  which trickles even during the recharge delay, and stacks with the
   *  recharge once it starts. */
  lifeRegenToEs:  { label: 'Life Regen to Energy Shield', base: 0, min: 0, max: 2.5, percent: true },
  /** FRACTION of the energy shield usable as a mana battery when mana runs
   *  dry (0.5 = half the shield may be spent on costs; 1 = the whole pool —
   *  the old Thought Siphon). A dial, not a flag. */
  esToMana:       { label: 'Energy Shield Usable as Mana', base: 0, min: 0, max: 1, percent: true },

  // OVERDRIVE — the debt economy (all base 0; each toggle's OverdriveSpec
  // feeds the query's base, trajectory-axis style). Unaffordable casts
  // OVERDRAFT their cost into reservation; repayment flows after a breather.
  overdriveCap:          { label: 'Overdrive Debt Limit', base: 0, min: 0, max: 0.9, percent: true },
  overdriveIdleDelay:    { label: 'Overdrive Repayment Delay', base: 0, min: 0.5, max: 8 },
  overdriveRecovery:     { label: 'Overdrive Repayment %/s', base: 0, min: 0.05, percent: true },
  overdriveRecoveryFlat: { label: 'Overdrive Repayment /s', base: 0, min: 0 },
  /** > 0: repayment trickles EVEN WHILE casting, at this fraction of rate. */
  overdriveFlow:         { label: 'Overdrive Flow', base: 0, min: 0, max: 1, percent: true },
  /** Life lane: repayment = total life regen × this × attack speed. */
  overdriveLifeFactor:   { label: 'Blood Debt Metabolism', base: 0, min: 0 },

  // Resource orbs: per-kind shed chances are a GENERATED family registered
  // by the ORB_DEFS registry (data/orbs.ts — orbOnHit_<id> / orbOnKill_<id>
  // / orbOnHurt_<id>, plus orbRefund_<id> pickup refunds). This is the one
  // shared scalar: a rate multiplier over every shed roll.
  orbShedRate:    { label: 'Orb Shed Rate', base: 1, min: 0 },
  /** Hits may shed an elemental remnant; picking it up empowers the next
   *  cast of that element (Elemental Remnants support). */
  remnantChance:  { label: 'Remnant Drop Chance', base: 0, percent: true },

  // Fire-archetype mechanics (usable by anything, as ever)
  /** > 0: projectiles passing through elemental fields and hazardous
   *  ground INHERIT the element — added damage + a status chance. */
  conduction:     { label: 'Elemental Conduction', base: 0 },
  /** > 0: projectiles crossing YOUR ground effects CARRY them onward —
   *  the field re-blooms where the flight ends (Suffusion: the inverse
   *  of the field-dropping trail supports). */
  suffusion:      { label: 'Suffusion', base: 0, min: 0 },
  /** Extra targets resolved by targeted (single-target) skills. */
  multiTarget:    { label: 'Additional Targets', base: 0 },
  /** FRACTION of an ignite's payload converted from ticking burn into a
   *  detonation when it expires (1 = the classic Powderkeg: no ticks, all
   *  blast; 0.5 = half burns, half banks). A dial, not a flag. */
  igniteToBomb:   { label: 'Ignites Detonate', base: 0, min: 0, max: 1, percent: true },
  /** Extra projectiles, fired in a full NOVA around the caster instead of
   *  toward the aim (Nova Release support). */
  projNova:       { label: 'Nova Projectiles', base: 0 },
  /** > 0: movement skills EXPLODE at their start and end points, dealing
   *  this fraction of the skill's damage (Dive Bomb support). */
  moveExplode:    { label: 'Movement Explosions', base: 0 },
  /** > 0: dashes leave a burning trail dealing this damage fraction
   *  (Fire Walker support — Trailblaze as a graft). */
  moveTrail:      { label: 'Movement Trail', base: 0 },
  cloudTrail:     { label: 'Cloud Trail', base: 0 },
  cloudCharge:    { label: 'Charged Clouds', base: 0 },
  cloudSalve:     { label: 'Healing Clouds', base: 0 },
  /** > 0: movement skills ERUPT at their DEPARTURE point only, dealing this
   *  fraction of the skill's damage (THE DEPARTURE SPLASH — the Afterspray
   *  support, THE SCALD KIT K2; moveExplode's one-ended cousin, read at the
   *  same World.moveBlast site with phase 'depart'). */
  departSplash:   { label: 'Departure Splash', base: 0 },
  /** > 0: THE FAVORED PULSE (Mineral Tuning, THE SCALD KIT K2): a tunable
   *  body YOU re-tune pulses its attunement onto your side only — your
   *  enemies are spared the wash — and the wash your side receives lasts
   *  ×(1 + this). Read at World.attuneCrystal off the striker's sheet. */
  tuneFavor:      { label: 'Favored Attunement', base: 0 },

  // Stat-granted parry (Perfect Timing support — any guard skill)
  /** Parry window in seconds granted to guard skills lacking their own. */
  guardParry:     { label: 'Parry Window', base: 0 },
  /** Riposte multiplier on parried damage. */
  guardParryPower:{ label: 'Parry Power', base: 1.5 },
  /** Added incoming-damage multiple, including guards with a native counter. */
  parryCounterBonus: { label: 'Additional Counter Power', base: 0, min: 0 },
  /** Seconds between received parry wounds; zero opts out of protection. */
  parryDamageCooldown: { label: 'Parry Damage Cooldown', base: DEFENSE_CFG.parry.damageCooldown, min: 0 },
  /** Added seconds for guards with an authored maximum duration. */
  guardHoldTime: { label: 'Timed Guard Duration', base: 0 },

  // Aura-channelled energy shield tuning (Capacitor / Insulation supports
  // socketed into aura skills inject these into the aura's ally modifiers)
  auraEsRecharge: { label: 'Aura: ES Recharge Bonus', base: 0 },
  auraEsDelay:    { label: 'Aura: ES Delay Reduction', base: 0, max: 0.7 },

  // Skill shaping
  aoeRadius:      { label: 'Area of Effect', base: 1, min: 0.2 },
  projectileCount:{ label: 'Additional Projectiles', base: 0 },
  /** Chance (0..1) to fire ONE additional projectile, rolled at fire time —
   *  the random counterpart to the deterministic projectileCount. */
  projectileCountChance: { label: 'Additional Projectile Chance', base: 0, min: 0, max: 1, percent: true },
  /** Impulse applied to a target struck by a MELEE hit — shoves it away. */
  knockback:      { label: 'Knockback Strength', base: 0, min: 0 },
  /** Signed on-hit displacement impulse: + pushes the target away, − pulls in. */
  displaceForce:  { label: 'Displace Force', base: 0 },
  projectileSpeed:{ label: 'Projectile Speed', base: 1, min: 0.2 },
  pierceCount:    { label: 'Additional Pierces', base: 0 },
  projectileSize: { label: 'Projectile Size', base: 1, min: 0.2, max: 5 },
  // Trajectory ATTRIBUTES — composable flight axes (see TrajectorySpec in
  // skills.ts and World.advanceProjectile). A skill's innate trajectory is
  // fed to each query as its BASE, so flat mods create an axis from nothing
  // and increased/more mods scale or dampen an innate one. All floor at 0.
  /** Homing turn rate in radians/second — low = loose drift, high = surefire. */
  homingPower:    { label: 'Homing Power', base: 0, min: 0 },
  /** Erratic jitter strength in radians/second of random steering. */
  erraticPower:   { label: 'Erratic Flight', base: 0, min: 0 },
  /** Revolve around the cast point, radius growing — rad/s (and growth scales
   *  with projectile speed). With orbit active, contributes only the growth. */
  spiralPower:    { label: 'Spiral Flight', base: 0, min: 0 },
  /** Revolve TETHERED to the caster at held radius; 1 ≈ tangential speed
   *  equal to projectile speed. */
  orbitPower:     { label: 'Orbiting Flight', base: 0, min: 0 },
  /** Spin around the flight axis (a tight epicycle) — rad/s. */
  spinPower:      { label: 'Spinning Flight', base: 0, min: 0 },
  /** Weave a figure-eight along the travel line — rad/s. */
  weavePower:     { label: 'Weaving Flight', base: 0, min: 0 },
  /** Impact SHARDS: shatter this many shard projectiles past the first
   *  victim (adds to a skill's innate shatter count — Shrapnel support). */
  projShrapnel:   { label: 'Impact Shards', base: 0, min: 0 },
  /** >0: an explosive payload detonates on EVERY hit the projectile
   *  survives, not just where it dies (Fulminate support). */
  projHitDetonate:{ label: 'Detonate on Hit', base: 0, min: 0 },
  /** Fraction of the parent's RESOLVED flight axes that spawned children
   *  (shatter shards, emitted projectiles) inherit (Lineage support). Skill
   *  data can add its own via shatter.inherit / emit.inherit. */
  projInherit:    { label: 'Child Flight Inheritance', base: 0, min: 0, max: 1, percent: true },
  /** >0: a projectile's spent shatter RE-ARMS on every chain leg, and fork
   *  children split with theirs unspent (Cascade of Knives). */
  projReShatter:  { label: 'Shatter Cascade', base: 0, min: 0 },
  /** Fractional projectile speed change per second of FLIGHT (+ gathers,
   *  − bleeds; innate TrajectorySpec.accel seeds the query — Momentum). */
  projAccel:      { label: 'Projectile Acceleration', base: 0 },
  /** TERRAIN RICOCHETS: bounces off rocks/walls/masonry before dying
   *  (innate TrajectorySpec.bounce seeds the query — Ricochet). */
  projBounce:     { label: 'Projectile Ricochets', base: 0, min: 0 },
  /** FRAME REBOUNDS (the fourth wall — engine/fourthwall.ts): banks off
   *  the edge of the caster's governing view frame, range re-armed per
   *  rebound (innate TrajectorySpec.frameBounce seeds the query —
   *  Mirrored Bounds). */
  projFrameBounce: { label: 'Frame Rebounds', base: 0, min: 0 },
  /** RECURVE chance: on a survived hit, whip around and strike the SAME
   *  victim again (× the spec's decay per miracle; innate recurve.chance
   *  seeds the query — Heartchaser, the Recurve gem). */
  projRecurve:    { label: 'Recurve Chance', base: 0, min: 0, max: 0.95, percent: true },
  /** Shards shed OUTWARD when a returning projectile arrives home — the
   *  caught blade splinters in the hand (Shredding Return). */
  returnShrapnel: { label: 'Return Shrapnel', base: 0, min: 0 },
  /** Additional maximum CONSTRUCTS (totems, sentries, traps, mines) — the
   *  construct family's own cap stat, deliberately DISTINCT from
   *  minionMaxCount so "+1 maximum minions" never mints free totems (#53). */
  constructMaxCount: { label: 'Additional Maximum Constructs', base: 0 },
  /** Multiplier on the strength (DoT dps) of every ailment the actor
   *  APPLIES — hit-derived and baseline alike. The potency crank. Queried
   *  with the status's damage-type tag in context, so tag-filtered mods
   *  ("more fire ailment magnitude") invest in ONE ailment family. */
  statusMagnitude:{ label: 'Ailment Magnitude', base: 1, min: 0 },
  /** Flat bonus to the stacking CAP of ailments the actor APPLIES (poison
   *  past 8, bleed past 5...). Queried with the status's damage-type tag,
   *  so it tag-filters per family like statusMagnitude. */
  ailmentStacks:  { label: 'Ailment Stack Limit', base: 0, min: 0 },
  /** Damage-taken multiplier mapped onto minions at summon (Meat Shield:
   *  a negative-more makes the wall of bones an actual wall). */
  minionDamageTaken: { label: 'Minion Damage Taken', base: 1, min: 0 },
  /** >0: minions fight DEFENSIVELY — a short leash around their owner
   *  instead of chasing across the field (Meat Shield). */
  minionGuard:    { label: 'Minion Guard Stance', base: 0, min: 0 },
  /** Multiplier on tether-beam dps (Taut Wire; on top of `damage`). */
  tetherDamage:   { label: 'Tether Damage', base: 1, min: 0 },
  /** Multiplier on tether-band width (on top of aoeRadius). */
  tetherWidth:    { label: 'Tether Width', base: 1, min: 0.2 },
  /** Flat ADD to a channel's movement factor: immobile starts at 0, so
   *  enough investment strolls through any maelstrom (Walking Meditation). */
  channelMobility:{ label: 'Channel Mobility', base: 0, min: 0 },
  /** Multiplier on a channel's facing turn-rate cap (Weathervane). */
  channelTurnRate:{ label: 'Channel Turn Rate', base: 1, min: 0.1 },
  /** >0: knockbacks the actor deals BUFFET — random direction, battering
   *  targets around instead of shoving them away (Turbulence). */
  knockBuffet:    { label: 'Buffeting Knockback', base: 0, min: 0 },
  /** Multiplier on a random-aim sector's spread (AimSpec.random — Wild
   *  Abandon doubles the flurry's arc; a negative-more focuses it). */
  randomArc:      { label: 'Random-Strike Arc', base: 1, min: 0 },
  /** Multiplier on a swing's ARC WIDTH — melee arcs, cone wedges, and
   *  crescent zones all ride this one width lever (the geometry twin of
   *  randomArc: that stat bends WHERE a strike lands, this one how WIDE
   *  it lands). Composes with channel rampArc convergence. */
  swingArc:       { label: 'Swing Arc', base: 1, min: 0.1 },
  /** Multiplier on melee REACH and cone RANGE — the strike-distance lever
   *  swingArc trades against (Reckless Breadth: wider, shorter). */
  meleeReach:     { label: 'Melee Reach', base: 1, min: 0.3 },
  /** >0: the channel's aim LOCKS at press — pulses and release land at the
   *  original mark, wherever the cursor wanders (Anchored Focus; the
   *  Event-Horizon-style Flame Blast is this stat on that skill). */
  channelLockAim: { label: 'Channel Locked Aim', base: 0, min: 0 },
  /** CURSOR-steering turn rate, rad/s: projectiles bend toward the caster's
   *  LIVE aim point — marionettes on the cursor's string (Puppet Strings;
   *  construct-fired missiles follow their owner's cursor). */
  guidePower:     { label: 'Guided Flight', base: 0, min: 0 },
  /** >0: the volley MATERIALIZES at the aim point instead of leaving the
   *  caster's hands (Displaced Conjuring; Cold Spot has it innately). */
  castAtCursor:   { label: 'Cast at Cursor', base: 0, min: 0 },
  /** >0: the volley converts to a SALVO — one shot per beat after the cast,
   *  each re-aimed at the live cursor (Rattling Salvo; Barrage innately). */
  fireSalvo:      { label: 'Salvo Fire', base: 0, min: 0 },
  /** >0: the volley converts to a VOLLEY — a firing squad of side-by-side
   *  parallel shots (Firing Line). Salvo wins when both are granted. */
  fireVolley:     { label: 'Volley Fire', base: 0, min: 0 },
  /** Multiplier on the volley's rank spacing (Close Order tightens the wall). */
  volleySpacing:  { label: 'Volley Spacing', base: 1, min: 0.2 },
  /** Multiplier on the fan's spread cone (Choked Spread concentrates it;
   *  a positive-increased splays it wide). */
  spreadAngle:    { label: 'Fan Spread', base: 1, min: 0.1 },
  /** MORE multiplier on UNSEEN strikes — the attacker is stealthed and the
   *  victim not yet alerted (the ambush reward; stacks with backstabMult
   *  for the positional art). Base 30% for everyone; investable. */
  ambushBonus:    { label: 'Ambush Damage', base: 0.3, min: 0 },
  /** Multiplier on the CAST TIME a Spirit-Totem placement inherits (base 2 —
   *  planting the totem costs DOUBLE the spell's bar; investable down). */
  totemPlaceTime: { label: 'Totem Placement Time', base: 2, min: 0.25 },
  /** Rate multiplier on a construct's own casting interval (totems, pylons,
   *  eruptors cast this much faster). */
  constructCastRate: { label: 'Construct Cast Rate', base: 1, min: 0.2 },
  // THE SWEEP (Sweeping Blow): >0 converts melee arcs into forward-traveling
  // crescent waves built from the cone's own geometry; the two knobs scale
  // the conversion's travel distance and wave speed.
  meleeSweep:     { label: 'Sweeping Blow', base: 0, min: 0 },
  sweepRange:     { label: 'Sweep Travel', base: 1, min: 0.2 },
  sweepSpeed:     { label: 'Sweep Speed', base: 1, min: 0.2 },
  /** Multiplier on damage-pool CAPS (DamagePoolSpec — bank more venom
   *  before the aura overflows). */
  poolCap:        { label: 'Damage Pool Capacity', base: 1, min: 0.1 },
  /** Flat bonus to CHARGE maximums the actor banks (gainCharge effects,
   *  chargeGain triggers, procs — queried with the granting skill's tags,
   *  so "+2 maximum Rage on melee skills" is a tag filter, not code). */
  chargeCap:      { label: 'Charge Capacity', base: 0 },
  /** RUNE capacity (the Invocation sequence's length ceiling) — queried
   *  with the invoking skill's tags; base 5, investable like any cap. */
  runeCap:        { label: 'Rune Capacity', base: 5, min: 1, max: 10 },
  /** COMBO GRAMMAR timing: a multiplier on every equipped combo rule's
   *  `within` window (engine/sequence.ts) — "your patterns stay open 50%
   *  longer" is one 'more' modifier. Floored so windows never collapse. */
  comboWindow:    { label: 'Combo Window', base: 1, min: 0.25, percent: true },
  /** Extra CASCADE placements for ground skills — displaced repeats rippling
   *  from the impact (adds to any innate/grafted GroundCascadeSpec). */
  aoeCascade:     { label: 'Cascade Placements', base: 0, min: 0 },
  // --- THE COMPANY LANE (meta/mercs.ts — the Harborwarden vocation's levers;
  // grantable by anything: vocation nodes today, gear/passives tomorrow) -----
  /** Extra retainers fielded at once, over MERC_CFG.maxHired (the hire gate
   *  reads floor(maxHired + mercRetinue) — the quanta law: whole blades). */
  mercRetinue:    { label: 'Retinue', base: 0, min: 0 },
  /** How much of a hired blade's party-scale weight is FORGIVEN (0..1):
   *  world.partyScaleCount folds partyScaleWeight × (1 − mercEase), so 1 =
   *  your company never hardens the world — the true solo curve with the
   *  blades beside you. Clamped at the read. */
  mercEase:       { label: 'Company Ease', base: 0, min: 0, percent: true },
  /** Hire-price forgiveness (0..0.9 at the read): the captain knows you. */
  mercHireDiscount: { label: 'Hire Discount', base: 0, min: 0, percent: true },
  /** Increased life + damage granted to your hired blades (the 'patron'
   *  source applyMercNormalization stamps on the merc's own sheet). */
  mercVigor:      { label: 'Company Vigor', base: 0, min: 0, percent: true },
  /** ZONE REVOLUTION, rad/s: faced zones (crescents, triangles) SPIN
   *  (innate GroundDelivery.rotate seeds the query — Whirling Sigil). */
  aoeSpin:        { label: 'Area Revolution', base: 0 },
  /** Extra whole FISSURES fanned out per cast (Splintered Earth). */
  fissureCount:   { label: 'Additional Fissures', base: 0, min: 0 },
  /** Extra BRANCHES forked off each fissure (innate branches seed it). */
  fissureBranches:{ label: 'Fissure Branches', base: 0, min: 0 },
  /** TRIGGER GEMS: chance per event that an armed trigger fires (the gem's
   *  spec chance seeds the query; TRIGGER_CFG.chanceCap lids it). */
  triggerChance:  { label: 'Trigger Chance', base: 0, min: 0, percent: true },
  /** TRIGGER GEMS (damageTaken): max-life fraction that must accumulate
   *  per firing — LOWER fires quicker (the spec's lifeFrac seeds it). */
  triggerThreshold:{ label: 'Trigger Damage Threshold', base: 0, min: 0.05, percent: true },
  /** TRIGGER GEMS (statusApply): applications banked per firing — LOWER
   *  fires quicker (the spec's power seeds it; floor one). */
  triggerPower:   { label: 'Trigger Power Threshold', base: 0, min: 1 },
  /** SHIELD-BASH payload multiplier (base 1) — Reckless Rampart's crank,
   *  investable by anything that can grant a modifier. */
  bashPower:      { label: 'Shield Bash Power', base: 1, min: 0 },
  /** SHIELD-BASH arming line scalar (base 1): × the spec's threshold
   *  (default BASH_CFG.releaseFloor) = the live bar fraction at which a
   *  release converts. Lower = the answer comes easier; the guard bar's
   *  tic follows this stat the frame it changes (refreshGuardBash). */
  bashFloor:      { label: 'Shield Bash Arming Line', base: 1, min: 0 },
  /** THE ARM CLOCK scalar (base 1): × the spec's armTime (default
   *  BASH_CFG.armTime) = the held seconds before a bash may convert.
   *  Lower readies sooner; the guard bar's arm meter follows the stat the
   *  frame it changes (refreshGuardBash → guardBashReady). */
  bashArmTime:    { label: 'Shield Bash Arming Time', base: 1, min: 0 },
  /** >0: the bash contract MIRRORS (Hollow Answer) — armed at-or-below
   *  1 − the arming line, payload = the shield health the wall has LOST
   *  rather than what it kept. A full wall says nothing; ride it low and
   *  cash the damage taken. Binary read; any modifier source can set it. */
  bashInvert:     { label: 'Inverted Shield Bash', base: 0, min: 0 },
  /** IMPALE: fraction of a hit's PHYSICAL damage DRIVEN IN as the lodged
   *  spear's bank (the impaled status) — discharged by the next hit. */
  impalePower:    { label: 'Impale Effect', base: 0, min: 0, percent: true },
  /** >0: a held channel's facing REVOLVES at this rate (rad/s) instead of
   *  tracking the aim — the beam becomes a lighthouse (Orbital Sweep). */
  channelAutoSpin:{ label: 'Channel Revolution', base: 0 },
  /** >0: run-over embeds RE-ARM on this per-object internal cooldown
   *  instead of being consumed (Enduring Snares; innate EmbedSpec.icd
   *  seeds the query) — the internal-cooldown lever, investable. */
  embedIcd:       { label: 'Embed Re-arm Time', base: 0, min: 0 },
  /** Multiplier on the cascade's step distance (tighter or farther ripples). */
  cascadeStep:    { label: 'Cascade Reach', base: 1, min: 0.2 },
  /** Flat ADD to a skill's cast-bar movement factor (SkillDef.castMove
   *  starts rooted at 0) — walking casters by investment (Fleetfoot). */
  castMobility:   { label: 'Cast Mobility', base: 0, min: 0 },
  effectDuration: { label: 'Skill Effect Duration', base: 1, min: 0.1 },
  // The GATHER family (ChannelSpec.brim + FuseSpec) — multiplicative axes
  // so supports, passives and affixes all reach them by ordinary mods.
  brimFill:       { label: 'Gauge Fill Rate', base: 1, min: 0.1 },
  brimDecay:      { label: 'Gauge Drain Rate', base: 1, min: 0 },
  brimPower:      { label: 'Gauge Payoff', base: 1, min: 0.1 },
  fuseDelay:      { label: 'Fuse Length', base: 1, min: 0.15 },
  fusePower:      { label: 'Fused Resolution Power', base: 1, min: 0.1 },
  statusChance:   { label: 'Ailment Chance', base: 0, percent: true },
  manaCost:       { label: 'Mana Cost Multiplier', base: 1, min: 0 },
  /** Mana actually spent on use, after cost conversion; never reservation or life. */
  manaUseCost:    { label: 'Mana Use Cost Multiplier', base: 1, min: 0 },
  /** Flat cost adders — a support's teeth on cheap skills (Mana Feeder). */
  addedManaCost:  { label: 'Added Mana Cost', base: 0, min: 0 },
  addedLifeCost:  { label: 'Added Life Cost', base: 0, min: 0 },
  // RESOURCE-AS-DAMAGE: flat damage per point of resource ACTUALLY PAID on
  // the use (the paid cost travels with the cast — echoes/totems pay nothing
  // and earn nothing). Typed pro-rata over the skill's own base damage, so
  // it converts like everything else. One stat per payable lane.
  costDamage_mana:{ label: 'Damage per Mana Spent', base: 0, min: 0 },
  costDamage_life:{ label: 'Damage per Life Spent', base: 0, min: 0 },
  // Payment wards: strongest absorb pool wins; no additive stockpiling.
  costWard_mana:  { label: 'Absorb per Mana Paid', base: 0, min: 0 },
  costWard_life:  { label: 'Absorb per Life Paid', base: 0, min: 0 },
  costWardDuration: { label: 'Payment Ward Duration', base: 3, min: 0 },
  costWardCap:    { label: 'Payment Ward Maximum Life Cap', base: 0.3, min: 0, max: 1, percent: true },

  // Sustain
  /** VAMPIRIC EMBRACE (transferred leech): this fraction of your landed
   *  damage heals ALLIES near you (DEFENSE_CFG.sustain.vampiricRadius) —
   *  not you; siphon/leech stay the selfish lanes. Tag-filterable, buff-
   *  grantable (the WoW-VE shape is a buff whose mods carry this stat). */
  vampiricShare:  { label: 'Vampiric Share', base: 0, min: 0, max: 0.5, percent: true },
  /** LIFE BOND (the Chloromancer shape): while your bond stands
   *  (BuffEffect.bond on an ally), this fraction of your damage dealt
   *  heals the BONDED — × the striking skill's bondFeed, × healPower. */
  bondShare:      { label: 'Life Bond Share', base: 0, min: 0, max: 1, percent: true },
  lifeOnHit:      { label: 'Life Gained on Hit', base: 0 },
  lifeLeech:      { label: 'Damage Leeched as Life', base: 0, max: 0.2, percent: true },
  /** Fraction of hit damage gained as WARD (the decaying shell — Soulflay's
   *  tithe). Feeds gainWard, so wardGain investment multiplies it. */
  wardLeech:      { label: 'Damage Leeched as Ward', base: 0, max: 0.3, percent: true },
  /** FLAT seconds added to a skill's cooldown — the trade-off levy
   *  (Austerity / Apotheosis buy power with a long clock). Still divided
   *  by cooldownRecovery: an imposed cooldown stays a reducible one. */
  addedCooldown:  { label: 'Added Cooldown', base: 0, min: 0 },
  /** Seconds a STAGGERED wound takes to finish landing (base = the classic
   *  3s window) — investable: the monk-stagger toggle stretches it. */
  staggerWindow:  { label: 'Stagger Window', base: 3, min: 1 },
  /** ON-KILL procs also roll on plain HITS against ELITE prey (rare+,
   *  bosses) at proc-chance × this — so Corpsefire and kin still matter
   *  in long single-target fights. Investable like everything else. */
  killProcOnHit:  { label: 'Kill-Proc Chance vs Elites', base: 0.12, min: 0, percent: true },

  // Echoes (mirage riders / ancestral ghosts / shadow clones — ghosts that
  // cast YOUR skills with YOUR scaling; deliberately NOT the minion family)
  /** Rider count per echo family — each EchoRiderSpec's `count` is this
   *  query's BASE, so gems/thresholds/passives add archers and ghosts. */
  mirageCount:    { label: 'Additional Mirages', base: 0, min: 0 },
  /** Multiplier on every echo's damageFactor (and its status potency) —
   *  THE investable crank for the whole echo economy. */
  mirageDamage:   { label: 'Echo Damage', base: 1, min: 0.1 },

  // Minions (queried on the OWNER; minions inherit these as multipliers)
  /** ISSUER-side pressure added to every command recipient's obedience roll
   *  (the command fabric — CommandMinionsEffect). Only matters against
   *  unruly recipients: obedience defaults to 1, so a loyal court never
   *  needs it and a warcaller build invests in it. */
  commandDiscipline: { label: 'Command Discipline', base: 0 },
  minionDamage:   { label: 'Minion Damage', base: 1, min: 0 },
  minionLife:     { label: 'Minion Life', base: 1, min: 0.1 },
  minionMaxCount: { label: 'Additional Maximum Minions', base: 0 },
  minionSize:     { label: 'Minion Size', base: 1, min: 0.3, max: 3 },
  minionMoveSpeed:{ label: 'Minion Movement Speed', base: 1, min: 0.2 },
  /** Multiplier on decay-minion drain (Enduring Bond slows the rot). */
  minionDecayRate:{ label: 'Minion Decay Rate', base: 1, min: 0.25 },
  // Minion regeneration (owner-queried with the SUMMON skill's tags — the
  // minionDamage pattern, so gems/passives split by skill or tag freely:
  // "skeletons heal, Revive minions don't" is a tag filter, not code).
  minionRegen:    { label: 'Minion Life Regeneration', base: 0 },
  minionRegenPct: { label: 'Minion Life Regeneration %', base: 0, min: 0, percent: true },
  /** THE REGEN RATE (the third minion-regen lane): a multiplier on the crew's
   *  WHOLE regeneration — the bake forwards (value − 1) as an 'increased'
   *  modifier on BOTH minion lanes (flat lifeRegen and lifeRegenPct), so base
   *  regen and forwarded investment quicken together. Deliberately NOT
   *  batch-scaled at the fold: a rate is dimensionless, and the lanes it
   *  multiplies already paid the batch divisor once. */
  minionRegenRate:{ label: 'Minion Regeneration Rate', base: 1, min: 0 },
  /** Chance to drop an elemental REMNANT on a real cast of that school. */
  remnantOnCast:  { label: 'Remnant on Cast Chance', base: 0, min: 0, percent: true },
  // Minion life-cycle rites (queried at SUMMON time with the skill's tags,
  // so a support socketed into ONE summon blesses only its own).
  /** On a minion's DEATH: your other minions heal this fraction of the
   *  deceased's maximum life (the flock closes over the wound). */
  minionDeathHeal: { label: 'Minion Death Heal %', base: 0, min: 0, percent: true },
  /** Flat companion to minionDeathHeal. */
  minionDeathHealFlat: { label: 'Minion Death Heal', base: 0, min: 0 },
  /** > 0: a minion's DURATION LAPSE counts as a DEATH — expiry fires every
   *  on-death effect (explosions, death heals, allyDeath taps). The
   *  raging-spirits lever: the swarm's whole point is dying on schedule. */
  minionExpiryIsDeath: { label: 'Minion Expiry Counts as Death', base: 0, min: 0 },
  /** On EMERGENCE: allies within the arrival's reach heal this flat amount
   *  (the mirror of summonImpact — arrival as balm instead of blast). */
  summonMend:     { label: 'Summoning Mend', base: 0, min: 0 },
  /** Fraction of minion max life dealt as fire damage on death (0 = off). */
  minionExplodeDeath:   { label: 'Minion Death Explosion', base: 0, percent: true },
  /** Same, but the minion detonates itself upon reaching low life (0 = off). */
  minionExplodeLowLife: { label: 'Minion Low-Life Detonation', base: 0, percent: true },
  /** THE BLOOM (THE LEGEND FABRIC — Gravebloom): seconds after a minion
   *  EMERGES at which it detonates and dies (0 = never). Stamped at the
   *  summon from the owner's sheet (Actor.bloomIn), worn as the 'blooming'
   *  marker so the ripening reads; the burst is minionBloomPower. */
  minionBloom:      { label: 'Minion Bloom Timer', base: 0, min: 0 },
  /** Fraction of the blooming minion's max life dealt as the bloom's
   *  damage (MINION_BLOOM_CFG.type) around it — life investment IS the
   *  bomb. 0 = a bloom that only ends the body. */
  minionBloomPower: { label: 'Minion Bloom Power', base: 0, min: 0, percent: true },
  /** Extra summons per cast. */
  summonCount:    { label: 'Additional Summons per Cast', base: 0 },
  /** >0: minions EMERGE AT THE CURSOR instead of beside their summoner
   *  (Beckon from Beyond — Bombardment's portal as a graft). */
  summonAtCursor: { label: 'Summon at Cursor', base: 0, min: 0 },
  /** Fraction of a minion's max life dealt as damage around it AS IT
   *  EMERGES (Violent Arrival — the inverse Martyrdom). */
  summonImpact:   { label: 'Summoning Impact', base: 0, min: 0, percent: true },
  /** >0: the CHANNEL converts to a cast that PLANTS a channeler at the
   *  mark — the held beam persists at the location for this many seconds,
   *  independent of the caster (Ritual Ground: an unchanneled channel). */
  channelPersist: { label: 'Channel Persistence', base: 0, min: 0 },
  /** > 0: extra summons emerge in sequence instead of all at once. */
  summonSequence: { label: 'Sequential Summoning', base: 0 },
  /** Multiplier on persistent minions' respawn timers (lower = faster). */
  minionRespawnTime: { label: 'Minion Respawn Time', base: 1, min: 0.1 },
  /** Fraction of a minion-buff's effect (BuffEffect.affects 'minions') ALSO
   *  granted to the caster — offerings shared with the officiant
   *  (Communal Rites; PoE's Mistress of Sacrifice shape). */
  offeringShare:  { label: 'Offering Share', base: 0, min: 0, max: 1, percent: true },

  // Cost conversion (0..1 fractions of one resource paid as the other)
  costToLife:     { label: 'Mana Cost Paid as Life', base: 0, min: 0, max: 1, percent: true },
  costToMana:     { label: 'Life Cost Paid as Mana', base: 0, min: 0, max: 1, percent: true },

  // Mechanic-warping flags & counters (set by supports / passives)
  chainCount:     { label: 'Projectile Chains', base: 0 },
  /** 0 = circle, 1 = square, 2 = triangle (override-style flag). */
  aoeShape:       { label: 'Area Shape', base: 0 },
  /** Number of secondary explosions an area skill scatters into. */
  aoeScatter:     { label: 'Area Aftershocks', base: 0 },
  /** Extra dormant-ground PULSES (GroundDelivery.pulse): adds beats to an
   *  innate or grafted pulse spec — or, alone, conjures a one-beat pulse
   *  from nothing (the aoeCascade "adds to either" rule, for pulses). */
  pulseCount:     { label: 'Additional Pulses', base: 0 },
  /** Extra strikes for storm skills (applies to min and max of the range). */
  stormCount:     { label: 'Additional Storm Strikes', base: 0 },
  /** FRACTION of a storm's strikes released at once, up front; the rest
   *  keep the cadence (1 = the whole storm lands immediately — the old
   *  flag; 0.5 = an opening crash, then the drumming). */
  stormImmediate: { label: 'Immediate Storm', base: 0, min: 0, max: 1, percent: true },
  /** > 0: the skill is cast by a spawned totem instead of its user. */
  castAsTotem:    { label: 'Cast as Totem', base: 0 },
  /** > 0: corpse-targeting skills may kill your own minion for a corpse. */
  sacrificeMinions: { label: 'Sacrifice Minions', base: 0 },
  /** > 0: corpse-targeting skills may target a minion when no corpse exists
   *  (without harming it) — e.g. Corpse Shift teleporting to a minion. */
  targetMinionFallback: { label: 'Target Minions as Fallback', base: 0 },
  /** ADDITIONAL corpses a corpse-handling cast reaches for (the wagon
   *  fabric): plural corpse skills (TargetingSpec.plural) consume or raise
   *  up to 1+N bodies per cast, and producer skills (Exhume's spawnCorpse)
   *  mint N MORE per dig — one stat, both directions of the economy. */
  corpseBatch:    { label: 'Corpse Batch', base: 0 },

  // Stealth & perception
  /** Multiplier on the range at which enemies detect this actor. */
  detectability:  { label: 'Detectability', base: 1, min: 0 },
  concealment:    { label: 'Concealment', base: 0, min: 0, max: 1 },
  /** Multiplier on the THREAT this actor's damage books on the victim's
   *  chart (world.resolveHit): loud styles goad monsters onto themselves,
   *  quiet hands slip down the ledger. Only `prefer: 'highestThreat'`
   *  brains — and grafted event swarms — read the chart, so this is an
   *  attention lever, never a damage one. */
  threatGen:      { label: 'Threat Generation', base: 1, min: 0 },
  /** Weight in spatial target preferences; a low priority still permits targeting. */
  targetPriority: { label: 'Enemy Target Priority', base: 1, min: 0.01 },
  /** Area HIT avoidance protects plies and on-hit effects too; DoTs remain live. */
  areaAvoidance: { label: 'Area Hit Avoidance', base: 0, min: 0, max: 0.85, percent: true },
  minionThreat: { label: 'Minion Threat', base: 1, min: 0.01 },
  minionAreaAvoidance: { label: 'Minion Area Hit Avoidance', base: 0, min: 0, max: 0.85, percent: true },
  /** > 0: constructs this actor spawns TAUNT (Actor.taunt decoys) — the
   *  Beckoning gem's lane (spawnConstruct reads it per-skill). */
  constructTaunt: { label: 'Constructs Taunt', base: 0 },
  /** > 0: enemies will not see or deliberately target this actor at all
   *  (area effects and projectiles still connect geometrically). */
  invisible:      { label: 'Invisible', base: 0 },
  /** Range at which THIS actor notices enemies (per-monster `detection`
   *  multiplier varies it: zombies shamble, blood mites sense you afar). */
  detectionRange: { label: 'Detection Range', base: 520, min: 50 },
  /** THE DIN (the watch fabric, engine/watch.ts): this actor's blows — and
   *  its spent flights, wherever they end — RING. The value is a RADIUS
   *  (px): every hostile watcher inside hears the bang and investigates
   *  the spot (World.noiseAt, capped at the search rung — a sound names a
   *  place, never a prey). The Ringing Report support grafts it per-skill;
   *  any modifier source may grant it. */
  noiseOnHit:     { label: 'Din on Strike', base: 0, min: 0 },
  // AI COGNITION (BehaviorSpec, brain.ts): the aim knobs read through the
  // sheet with the brain's spec value as the innate base, so curses, auras
  // and ground can bend an enemy's MIND the way they bend its body.
  /** Intercept fraction a casting mind leads its shots by (negative trails). */
  aiAimLead:      { label: 'Aim Leading', base: 0, min: -2, max: 2 },
  /** Aim scatter (radians) rolled onto every cast's bearing. */
  aiAimJitter:    { label: 'Aim Scatter', base: 0, min: 0 },
  /** Facing swing cap, radians/sec (Actor.turnSpeed — the def stamp — is the
   *  innate base at the world's turn clamp; 0 = pivots freely, every player
   *  body's resting read). */
  aiTurnSpeed:    { label: 'Pivot Rate', base: 0, min: 0 },

  // DoT & curse mechanics
  /** CHANCE that a DoT applied by the skill spreads on the victim's death
   *  (rolled once at application; 1 = always — the old flag value). */
  dotPropagates:  { label: 'Damage over Time Propagation Chance', base: 0, min: 0, max: 1, percent: true },
  /** Curse statuses rupture at expiry for this multiple of the skill's roll. */
  curseRupture:   { label: 'Curse Rupture', base: 0 },
  /** DoT statuses rupture at expiry for this fraction of their total damage. */
  dotRupture:     { label: 'DoT Rupture', base: 0 },
  /** > 0: cursed areas detonate shortly after cast (Hex Blast). */
  hexBlast:       { label: 'Hex Blast', base: 0 },
  /** Seconds of lingering damage field left behind by the skill's area. */
  lingerField:    { label: 'Lingering Field', base: 0 },
  /** > 0: curses also grant Hedonism haste, but may afflict your allies. */
  hedonism:       { label: 'Hedonism', base: 0 },

  // Projectile impact behaviors
  /** Forks on impact into this many extra split-pairs. */
  forkCount:      { label: 'Projectile Forks', base: 0 },
  /** 0 none / 1 return to cast point / 2 return to the (moving) caster. */
  projReturn:     { label: 'Projectile Return', base: 0 },

  // Repeats & salvos
  /** Extra executions after the real one (Multistrike, Spell Echo, Cascade). */
  repeatCount:    { label: 'Skill Repeats', base: 0 },
  /** Per-repeat size & damage growth (+0.25 = each repeat 25% bigger). */
  repeatScale:    { label: 'Repeat Scaling', base: 0 },
  /** > 0: repeats re-aim at the nearest enemy (Multistrike). */
  repeatRetarget: { label: 'Repeats Retarget', base: 0 },
  /** > 0: the user is locked in place while the repeats play out. */
  repeatLock:     { label: 'Repeats Lock User', base: 0 },
  /** Unleash: max seals banked while the skill rests (1 salvo shot each). */
  unleashMax:     { label: 'Maximum Unleash Seals', base: 0 },

  // Melee impact behaviors
  /** Melee hits chain to this many extra nearby enemies. */
  meleeReverb:    { label: 'Melee Reverberation', base: 0 },
  /** Hits splash to enemies within this radius at half damage. */
  splashRadius:   { label: 'Damage Splash Radius', base: 0 },

  // More minion shaping (baked at summon time)
  minionDetectionRange: { label: 'Minion Detection Range', base: 1, min: 0.2 },
  minionHaste:    { label: 'Minion Action Speed', base: 1, min: 0.2 },
  /** THE PLY FABRIC (engine/plies.ts): flat extra plies on plied minions —
   *  and on plied-LESS ones, where any grant STANDS THE FABRIC UP (a
   *  default spec at the bake): hit-counted armor is a build choice on any
   *  summon, not a birthright of the throng kinds. Quanta — rounded at
   *  the bake, never batch-scaled. */
  minionPlies:    { label: 'Minion Plies', base: 0, min: 0 },
  /** THE CALCIFIED TRADE (bakeMinionOwnerStats): every this-much of the
   *  body's GRANTED life increase (post batch-scale) converts into +1 ply
   *  instead, CONSUMING the increase — life investment become hit-counted
   *  shell. 0 = no trade. Threshold semantics: two sources SUM thresholds
   *  (a weaker trade), so stacking is self-limiting by construction. */
  minionLifePlyTrade: { label: 'Minion Life-to-Ply Threshold', base: 0, min: 0 },
  /** THE MARROWBOUND ECHO (the trade's additive sibling): every this-much
   *  of the owner's minion-life increase grants +1 ply IN ADDITION — the
   *  life is KEPT whole. Both threshold lanes read the SAME single
   *  pre-trade baseline in one bake pass (the stat-link golden rule's
   *  shape: granted plies can never feed back into the life that grants
   *  them — loop-free by construction, not by tuning). Priced above the
   *  trade's threshold precisely because it renounces nothing. */
  minionLifePlyEcho: { label: 'Minion Life-per-Ply Echo', base: 0, min: 0 },
  /** Seconds a slain minion clings to unlife after death effects fire. */
  minionUndying:  { label: 'Minion Undying Duration', base: 0 },
  // THE THRONG FIND LEVERS (engine/throng.ts — read on the KEEPER with the
  // anchor skill's context, so gems and tag-filtered passives split freely).
  /** Flat extra husk POCKETS rolled per zone (appended after the authored
   *  rolls — authored spots never shift; the zone's own scarcity chance
   *  still gates). */
  throngPockets:  { label: 'Additional Throng Pockets', base: 0, min: 0 },
  /** Multiplies the BODY COUNT of every throng mint event — pocket
   *  clusters, gauge yields, mote condensations, trickle drops, crit/kill
   *  raisings. Quanta: rounded per event, never below 1. */
  throngYield:    { label: 'Throng Find Size', base: 1, min: 0.1 },
  /** Keystone flag (>= 0.5): attack hits bypass the evasion entropy check. */
  cannotMiss:     { label: 'Attacks Cannot Be Evaded', base: 0, min: 0, max: 1 },
  /** Keystone flag (>= 0.5): critical strikes ignore positive elemental resistances. */
  critIgnoreRes:  { label: 'Critical Strikes Ignore Elemental Resistances', base: 0, min: 0, max: 1 },
  /** Chance for a damaging skill roll to deal double damage (capped at 50%). */
  doubleDamageChance: { label: 'Chance to Deal Double Damage', base: 0, min: 0, max: 0.5, percent: true },
  /** Fraction of armor that also mitigates incoming elemental hits (hyperbolic). */
  armorAppliesToElemental: { label: 'Armor Applies to Elemental Hits', base: 0, min: 0, max: 1, percent: true },
  /** Chance for a damaging skill roll to add a share of current Life + Endurance + ES as bonus damage. */
  heftBlowChance: { label: 'Crushing Heft Chance', base: 0, min: 0, max: 0.4, percent: true },
  /** Share of current Life + Endurance + ES added when Crushing Heft triggers. */
  heftBlowScale:  { label: 'Crushing Heft Ratio', base: 0.25, min: 0, percent: true },
  /** Chance on landed attack hits to shear a fraction of the victim's current life. */
  fellingChance:  { label: 'Felling Strike Chance', base: 0, min: 0, max: 0.5, percent: true },
  /** Flat integer damage subtracted from every incoming hit after mitigation (tag-filterable). */
  flatHitReduction: { label: 'Flat Hit Damage Reduction', base: 0, min: 0 },
  /** Up to this much MORE hit damage at long range (ramps smoothly from 140px to 460px). */
  farShotDamage:  { label: 'Long-Range Damage', base: 0, min: 0, percent: true },
  /** Fraction of Life Leech redirected into Energy Shield instead of Life. */
  lifeLeechToEs:  { label: 'Life Leech Applied to Energy Shield', base: 0, min: 0, max: 1, percent: true },
  /** Chance on a critical strike to escalate into an Apex Strike (super-crit, capped at 50%). */
  overcritChance: { label: 'Apex Strike Chance', base: 0, min: 0, max: 0.5, percent: true },
  /** Extra damage multiplier applied when a critical strike escalates into an Apex Strike. */
  overcritMulti:  { label: 'Apex Strike Multiplier', base: 1.5, min: 1 },
  /** Fraction of minion damage scaling (above 100%) renounced by minions (Usurped Host lane). */
  minionDamageForgone: { label: 'Minion Damage Scaling Forgone', base: 0, min: 0, max: 1, percent: true },
  /** Fraction of overkill damage on a killing blow that cascades to nearby enemies. */
  overkillCarry:  { label: 'Overkill Cascade Fraction', base: 0, min: 0, max: 1, percent: true },
  /** Blast radius (world units, scaled by aoeRadius) for Overkill Cascade shocks. */
  overkillRadius: { label: 'Overkill Cascade Radius', base: 140, min: 0 },
  /** Chance for incoming landed hits (attacks, spells, areas) to be Grazes. */
  grazeChance:    { label: 'Graze Chance', base: 0, min: 0, max: 1, percent: true },
  /** Fraction of hit damage prevented when an incoming hit is Grazed (capped at 65%). */
  grazeMitigation: { label: 'Graze Damage Reduction', base: 0.35, min: 0, max: 0.65, percent: true },
  /** Fraction of damage prevented by a Graze granted to you as Ward. */
  grazeWard:      { label: 'Ward Gained from Grazes', base: 0, min: 0, max: 0.5, percent: true },
  /** More hit damage granted per second of a skill's effective cooldown (up to 12s). */
  cooldownPower:  { label: 'More Damage per Second of Cooldown', base: 0, min: 0, percent: true },
  /** Fraction of landed hit damage banked into a delayed Temporal Debt detonation. */
  hitEchoFrac:    { label: 'Temporal Debt Banked on Hit', base: 0, min: 0, percent: true },
  /** Delay in seconds before a target's banked Temporal Debt detonates. */
  hitEchoDelay:   { label: 'Temporal Debt Window', base: 2.5, min: 0.6, max: 6 },
  /** Splash radius (world units, scaled by aoeRadius) when Temporal Debt detonates. */
  hitEchoAoe:     { label: 'Temporal Debt Splash Radius', base: 0, min: 0 },
  /** Fraction of maximum life paid as voluntary self-wound trauma per skill cast. */
  traumaCost:     { label: 'Voluntary Life Trauma per Cast', base: 0, min: 0, max: 0.25, percent: true },
  /** Extra fire damage fraction minions gain scaled by their missing life percentage (Ashen Flock). */
  minionMissingLifeFire: { label: 'Minion Missing-Life Extra Fire', base: 0, min: 0, max: 0.8, percent: true },
  /** Enables quadratic self-damage over minion decay/duration progress without early expiry (Ashen Flock). */
  minionDecayQuad: { label: 'Quadratic Minion Decay Burn', base: 0, min: 0, max: 1, percent: true },
  /** Flat fire self-burn DPS suffered by recently summoned minions for 4 seconds (Kindled Bones). */
  minionKindleBurn: { label: 'Kindled Minion Self-Burn DPS', base: 0, min: 0 },
  /** Extra fire damage fraction dealt by minions while burning from Kindled Bones. */
  minionKindleFire: { label: 'Kindled Minion Extra Fire', base: 0, min: 0, max: 1, percent: true },
  /** Flat level-scaled minion fire DPS burned onto enemies caught between tethered recently summoned minions (Funeral Pyre Bridge). */
  minionPyreTether: { label: 'Minion Pyre-Tether Fire DPS', base: 0, min: 0 },
  /** Flat level-scaled minion fire burst emitted when a minion is struck, gated by a shared 0.6s cooldown across all minions (Ember-Fed Rupture). */
  minionStruckFirePulse: { label: 'Minion Struck Fire Pulse', base: 0, min: 0 },
  /** Multiplier applied to all minion death effects (Martyrdom, death bursts, death heals). */
  minionDeathEffectPower: { label: 'Minion Death-Effect Power', base: 1, min: 0.1, percent: true },
  /** Accelerates Kinetic Inertia stack gain while moving ('inertia' gauge, up to 20). */
  inertiaGain:    { label: 'Kinetic Inertia Build Rate', base: 0, min: 0, max: 3, percent: true },
  /** More hit damage per banked Kinetic Inertia stack discharged on hit (consumes all stacks). */
  inertiaDischarge: { label: 'Kinetic Inertia Discharge per Stack', base: 0, min: 0, max: 0.20, percent: true },
  /** Chance on hit to carve a Riven fracture stack onto enemies (up to 12, stripping 4% armor/stack). */
  rivenChance:    { label: 'Riven Fracture Chance', base: 0, min: 0, max: 3, percent: true },
  /** Elemental and chaos resistance shredded per Riven fracture stack on the target. */
  rivenPower:     { label: 'Riven Resistance Shred per Stack', base: 0, min: 0, max: 0.04, percent: true },
  /** More damage granted per Harmonic Pitch stack built by alternating skill types ('harmony' gauge). */
  harmonyPower:   { label: 'Harmonic Pitch More Damage per Stack', base: 0, min: 0, max: 0.18, percent: true },
  /** Fraction of excess life leech past full life converted into Ward. */
  overleechWard:  { label: 'Over-Leech Converted to Ward', base: 0, min: 0, max: 0.75, percent: true },
  /** Fraction of excess life leech past full life banked as a 3-second lingering recovery stream. */
  overleechPersist: { label: 'Over-Leech Lingering Recovery', base: 0, min: 0, max: 1.8, percent: true },
  /** Fraction of remaining damaging-ailment total damage reaped instantaneously on crits or cooldown hits. */
  ailmentReap:    { label: 'Affliction Reap Ratio', base: 0, min: 0, max: 2.5, percent: true },
  /** Fraction of a victim's maximum poise unleashed as a physical shockwave on poise break. */
  poiseOverflow:  { label: 'Poise-Break Implosion Ratio', base: 0, min: 0, max: 2.0, percent: true },
  /** Fraction of remaining deferred Stagger damage purged when slaying an enemy or casting a cooldown skill. */
  staggerPurge:   { label: 'Stagger Purged on Kill / Cooldown', base: 0, min: 0, max: 0.85, percent: true },
  /** Fraction of purged Stagger damage converted into Ward. */
  staggerToWard:  { label: 'Purged Stagger Converted to Ward', base: 0, min: 0, max: 1.25, percent: true },
  // PASS 10 — SPLICED GRAFTS & MUTATIONAL TRAITS (Voidling Bound inspired)
  /** Bleeding enemies at or below this life fraction are culled on hit (45% as effective vs bosses/rares). */
  bleedCullThreshold: { label: 'Bleeding Cull Threshold', base: 0, min: 0, max: 0.45, percent: true },
  /** Keystone trade-off: deal this fraction less hit damage to enemies that are not bleeding. */
  bleedNonBleedLess:  { label: 'Less Hit Damage vs Non-Bleeding', base: 0, min: 0, max: 0.50, percent: true },
  /** Taking or blocking hits hardens Chitin stacks ('molt' gauge, 0..10); reaching 10 triggers Molt Shrapnel. */
  carapaceHitGain:    { label: 'Chitin Hardening on Hit/Block', base: 0, min: 0, max: 3 },
  /** Base physical shrapnel burst dealt around you when Molting at 10 Chitin stacks. */
  moltShrapnel:       { label: 'Molt Shrapnel Damage', base: 0, min: 0 },
  /** Chance on inflicting Bleed/Burn/Poison/Shock to cross-splice a paired ailment (0.35s per-target ICD; >100% can apply a 2nd stack). */
  ailmentCrossSplice: { label: 'Cross-Spliced Ailment Chance', base: 0, min: 0, max: 2.2, percent: true },
  /** More hit damage dealt per distinct active ailment currently on the victim (capped at 5). */
  multiAilmentMore:   { label: 'More Damage per Distinct Ailment', base: 0, min: 0, max: 0.15, percent: true },
  /** Landed hits tag foes into a Synaptic Lattice (up to 4); hitting one relays this fraction to others within 280px. */
  synapticLinkDmg:    { label: 'Synaptic Lattice Relay Fraction', base: 0, min: 0, max: 0.60, percent: true },
  /** Critical strikes amplify active damaging ailments on the victim by this fraction (capped at 2x baseline) and extend duration. */
  statusAmplifyOnCrit: { label: 'Ailment Mutation on Critical Strike', base: 0, min: 0, max: 0.50, percent: true },
  /** Keystone trade-off: deal this fraction less hit damage while having dealt <= 1 damage type recently ('prism' <= 1). */
  prismSinglePenalty: { label: 'Less Damage with Single Damage Type', base: 0, min: 0, max: 0.40, percent: true },
  /** Consecutive hits on the same target grant this much more hit damage per Adaptation stack (up to 15, 5s decay). */
  attritionRamp:      { label: 'Adaptation More Damage per Hit', base: 0, min: 0, max: 0.10, percent: true },
  /** Keystone trade-off: opening hit against an un-adapted foe deals this fraction less damage. */
  attritionFirstPenalty: { label: 'Opening Hit Adaptation Penalty', base: 0, min: 0, max: 0.35, percent: true },
  /** Fraction of your own ailment chances and critical strike bonuses inherited by summoned minions. */
  minionInheritStatus: { label: 'Minion Genetic Inheritance', base: 0, min: 0, max: 1, percent: true },
  /** Chance when a non-persistent minion drops below 35% life to shed a temporary Fission Husk (cap 2 active). */
  minionSplitOnLowLife: { label: 'Minion Low-Life Fission Chance', base: 0, min: 0, max: 1, percent: true },
  /** When any passive or item proc fires (1.5s ICD), empowers your next cast by this fraction and pulses ward/haste to allies. */
  goldenProcAmplify:  { label: 'Gilded Proc Cast Amplification', base: 0, min: 0, max: 0.45, percent: true },
  // PASS 11 — ELEMENTAL ARSENAL & KINETIC CONTRAPTIONS (Skylanders inspired)
  /** While continuously moving, crush enemies within contact reach (0.35s per-target ICD) for flat physical + knockback. */
  trampleContactDps:  { label: 'Rolling Contact Trample Damage', base: 0, min: 0 },
  /** Blocking or parrying banks Bone-Shield Charges (0..5); your next attack spends them for a vampiric blade cleave. */
  blockBladeSlash:    { label: 'Bone-Shield Cleave Damage per Charge', base: 0, min: 0 },
  /** Drinking a Flask triggers 6s of Feral Draught melee/speed transformation (3 kills clears the brief hangover). */
  flaskBeastMode:     { label: 'Feral Draught Transformation Power', base: 0, min: 0, max: 2.2, percent: true },
  /** Projectiles deal this much more hit damage per wall bounce, chain, or fork completed (capped at 6). */
  bounceDamageScale:  { label: 'More Projectile Damage per Carom', base: 0, min: 0, max: 0.50, percent: true },
  /** Keystone trade-off: projectiles deal this fraction less damage before their first bounce, chain, or fork. */
  bounceFirstPenalty: { label: 'Pre-Carom Projectile Penalty', base: 0, min: 0, max: 0.35, percent: true },
  /** Evading or using a movement skill (3.5s ICD) leaves a taunting Wicker Decoy that detonates in spinning blades. */
  evadeDecoyBurst:    { label: 'Wicker Decoy Blade Detonation', base: 0, min: 0 },
  /** Projectiles passing near your own Constructs or Totems refract once per construct into this many angled prism bolts. */
  constructRefract:   { label: 'Construct Prism Refraction Bolts', base: 0, min: 0, max: 5 },
  /** Movement skills erupt in fire novas at both departure and arrival plus an ignited wake (hitting both refunds 25% CD). */
  phoenixBlinkNova:   { label: 'Phoenix Departure & Arrival Fire Nova', base: 0, min: 0 },
  /** While channeling, periodically births homing Volatile Effigies that sprint at foes and detonate with minion scaling. */
  channelEffigyRate:  { label: 'Channel-Born Volatile Effigy Rate', base: 0, min: 0, max: 3.2 },
  /** Cold, Lightning, Song, or Storm casts (4s ICD) conjure a 4s Squall Cloud zapping foes and mending allies inside. */
  tempestMendPulse:   { label: 'Squall Cloud Zap & Mend Power', base: 0, min: 0 },
  // PASS 12 — CLASS MASTERIES & PARADIGM ENGINES (WoW inspired)
  /** Melee, guard, or cooldown hits (2.5s ICD) heal you for this fraction of damage suffered in the last 5 seconds (excess to Ward). */
  recentDmgHeal:      { label: 'Reactive 5s Damage-Taken Recovery', base: 0, min: 0, max: 0.75, percent: true },
  /** Guarding, warcrying, or striking marks a foe for 5s; this fraction of mitigated hit damage you take redirects onto them. */
  karmaReflect:       { label: 'Penance Vow Damage Redirection', base: 0, min: 0, max: 1.25, percent: true },
  /** Chance on melee/attack hits (1.0s ICD) to unleash 2 instantaneous follow-up flurry strikes at 45% hit damage each. */
  windfuryChance:     { label: 'Gale-Flurry Twin Strike Chance', base: 0, min: 0, max: 0.75, percent: true },
  /** Multiplies your effective critical strike chance by (1 + value) against Chilled enemies. */
  shatterCritMult:    { label: 'Crit Chance Multiplier vs Chilled', base: 0, min: 0, max: 2.0, percent: true },
  /** Critical strikes against Chilled enemies splinter cold shards to nearby foes for this fraction of hit damage. */
  shatterSplinter:    { label: 'Shatter Cold Splinter Fraction', base: 0, min: 0, max: 0.75, percent: true },
  /** Casting a cooldown or movement skill (4.5s ICD) casts Fate\'s Lots for 6s tactical boons (scales with Luck). */
  fateDiceBonus:      { label: 'Fate\'s Lots Boon Tier', base: 0, min: 0, max: 4 },
  /** Casting spells stacks Overload Runes (0..4) for more spell damage per stack; non-spells discharge runes to restore mana. */
  overloadPower:      { label: 'Overload Rune More Spell Damage', base: 0, min: 0, max: 0.35, percent: true },
  /** Chaos/curse casts enter Abyssal Trance (0..15 stacks, +1/s) ramping chaos/DoT damage & cast speed while draining mana/ES. */
  tranceRamp:         { label: 'Abyssal Trance Scaling per Stack', base: 0, min: 0, max: 0.09, percent: true },
  /** Applying a curse or damaging ailment plants a 3.5s Rupture Seed that explodes on death or 25% life lost and spreads DoTs. */
  ruptureSeed:        { label: 'Rupture Seed Detonation Damage', base: 0, min: 0 },
  /** This fraction of direct spell and song hit damage heals your living minions, companions, and nearby allies. */
  atonementHeal:      { label: 'Atonement Damage-to-Ally Healing', base: 0, min: 0, max: 0.65, percent: true },
  /** Alternating 3 Fire/Physical vs 3 Cold/Lightning casts triggers 6s opposing Solstice Zenith for this much more damage. */
  solsticePower:      { label: 'Solstice Zenith More Damage', base: 0, min: 0, max: 0.85, percent: true },
  /** Fraction of hit damage dealt by your minions that leeches life directly to you. */
  minionLeechToOwner: { label: 'Minion Damage Leeched to Owner', base: 0, min: 0, max: 0.15, percent: true },
  /** More hit damage dealt by your minions per recent Wound stack on you. */
  ownerWoundsToMinion: { label: 'Minion More Damage per Owner Wound', base: 0, min: 0, max: 0.06, percent: true },
  // PASS 13 & 14 — ASTROLABE ENGINES & OUTER CONSTELLATIONS (Wolcen Gate of Fates inspired)
  /** Oath of Bare Iron: multiplies physical hit damage by (1 + val) and prevents dealing fire/cold/lightning/chaos damage. */
  materialOnlyMore:    { label: 'Pure Material More Physical Damage', base: 0, min: 0, max: 0.70, percent: true },
  /** Aegis of Tyranny: gain MORE hit damage equal to (blockChance * blockToDamage). */
  blockToDamage:       { label: 'Block Chance to More Damage Ratio', base: 0, min: 0, max: 1.5, percent: true },
  /** Brimming Frenzy: MORE hit damage dealt while current Mana is at or above 75% of maximum. */
  surplusHitMore:      { label: 'High-Mana Surplus More Damage', base: 0, min: 0, max: 0.45, percent: true },
  /** Brimming Frenzy trade-off: LESS hit damage dealt while current Mana is below 50% of maximum. */
  lowManaHitLess:      { label: 'Low-Mana Hit Damage Penalty', base: 0, min: 0, max: 0.40, percent: true },
  /** Through-and-Through: each pierced target reduces subsequent hit damage of that projectile by this fraction (floor 35%). */
  pierceDecay:         { label: 'Projectile Damage Falloff per Pierce', base: 0, min: 0, max: 0.35, percent: true },
  /** Wraith's Reflex: taking hit damage grants 3s Slipstream (+val MORE evasion + guaranteed dodge on next attack within 1.5s, 4s ICD). */
  evadeSurgeOnHurt:    { label: 'Slipstream Evasion Surge on Hit Taken', base: 0, min: 0, max: 1.5, percent: true },
  /** Merciless Execution trade-off: non-critical hits deal this fraction less damage. */
  nonCritLess:         { label: 'Non-Critical Hit Damage Penalty', base: 0, min: 0, max: 0.40, percent: true },
  /** Crystalline Bastion: take this fraction LESS hit damage while Energy Shield is at or above 75% of maximum. */
  fullEsDR:            { label: 'High Energy Shield Damage Reduction', base: 0, min: 0, max: 0.35, percent: true },
  /** Twin-Blight Doctrine (>=0.5): direct hits deal 22% less damage, inflict a second distinct ailment simultaneously, and raise stack caps by +2. */
  dualAilmentApply:    { label: 'Twin-Blight Dual Ailment Application', base: 0, min: 0, max: 1 },
  /** Terminal Virulence: enemies carrying 3 or more distinct active ailments take this much MORE damage over time. */
  ailmentMultiDot:     { label: 'More DoT Taken per 3+ Ailments', base: 0, min: 0, max: 0.35, percent: true },
  /** Undying Offering: slaying afflicted foes (or every 3rd hit vs afflicted elites/bosses) stacks Offering (0..12), granting MORE damage per stack to you and minions. */
  offeringPower:       { label: 'Undying Offering More Damage per Stack', base: 0, min: 0, max: 0.08, percent: true },
  /** Covenant of Dawn: excess healing past full Life converts into Ward at this ratio, and hits add 12% of current Ward as flat fire damage (level-capped). */
  overhealToWard:      { label: 'Overhealing Converted to Ward', base: 0, min: 0, max: 0.80, percent: true },
  /** Fractured Hourglass: defers this fraction of incoming post-mitigation hit damage into Stagger with a 12% surcharge. */
  direDeferral:        { label: 'Fractured Hourglass Hit Deferral', base: 0, min: 0, max: 0.75, percent: true },
  /** Bastion's Reprisal: blocking or taking a melee hit unleashes a physical area shockwave dealing (armor * val) damage (0.8s ICD). */
  armorThornsScale:    { label: 'Armor Retaliation Shockwave Ratio', base: 0, min: 0, max: 0.40, percent: true },
  /** Static Transferral: non-cooldown attacks bank Static Charges (0..5); spenders/cooldown skills discharge them for MORE hit damage per stack. */
  staticDischargeMore: { label: 'Static Transferral More Damage per Charge', base: 0, min: 0, max: 0.22, percent: true },
  /** Overclocked Capacitor trade-off: non-cooldown attacks deal this fraction less hit damage. */
  staticBasicLess:     { label: 'Non-Cooldown Attack Damage Penalty', base: 0, min: 0, max: 0.40, percent: true },
  /** Captured Velocity: deal MORE hit damage against Chilled, Slowed, Frozen, Stunned, or Temporal-Debt enemies. */
  chronoVsSlowMore:    { label: 'More Damage vs Slowed or Stasis Foes', base: 0, min: 0, max: 0.45, percent: true },
  /** Opening Gambit: hits against enemies at >= 85% life deal MORE damage and gain +25% flat critical strike chance. */
  ambushBurstMore:     { label: 'Opening Gambit More Damage (>=85% Life)', base: 0, min: 0, max: 0.60, percent: true },
  /** Opening Gambit trade-off: hits against enemies below 50% life deal this fraction less damage. */
  ambushLowLifeLess:   { label: 'Opening Gambit Low-Life Penalty', base: 0, min: 0, max: 0.40, percent: true },
  /** Triune Tempest: Fire/Cold/Lightning hit damage unleashes a cascading area burst of the next element in cycle (1.4s ICD). */
  omniElemCascade:     { label: 'Triune Tempest Elemental Cascade Damage', base: 0, min: 0 },
  /** Pact of the Scourged: ailment hits mirror a mild copy onto self; gain MORE damage per active self-ailment and purge 3+ into a chaos nova (4s ICD). */
  fatalPactPower:      { label: 'Pact of the Scourged Self-Ailment Power', base: 0, min: 0, max: 0.20, percent: true },
  /** Undying Miasma: moving or minion deaths pulse toxic chaos miasma poisoning nearby foes and empowering nearby minions with extra chaos damage. */
  plagueWakeDps:       { label: 'Undying Miasma Chaos Pulse Damage', base: 0, min: 0 },
  /** Astral Canticle: casting a Song, Warcry, or Aura extends active buffs and pulses Ward + Haste to nearby allies (3.5s ICD). */
  astralEchoBuff:      { label: 'Astral Canticle Buff Extension Ratio', base: 0, min: 0, max: 0.75, percent: true },
  // PASS 15 — COMPOSABLE RECENCY, SQUAD TACTICS & ANTI-OVERLAP ENGINES
  /** Modifiable "Recently" window (seconds, base 4.0s, clamped 1..12s). Scales all recency conditions, recent minion death stacks, recently-summoned minion windows, and recent damage windows. */
  recentlyWindow:       { label: '"Recently" Window (s)', base: 4, min: 1, max: 12 },
  /** Volatile Offering (>0): temporary minions summoned are stationary & immobile for their full duration, but invulnerable while summoned recently (owner.recentWindowFor()). */
  minionAnchoredInvuln: { label: 'Anchored Temporary Minions', base: 0, min: 0 },
  /** Defensive Phalanx (>0): minions organize into coordinated tactical squads (composes cleanly with minionGuard Close Formation) and gain +6% Armor & +3% hit DR per nearby squadmate (up to 4). */
  minionSquad:          { label: 'Minion Squad Tactics', base: 0, min: 0 },
  /** Sanctified Arrival: newly summoned minions grant this flat Ward to you, nearby allies, and themselves on arrival. */
  summonWard:           { label: 'Summoning Ward', base: 0, min: 0 },
  /** Living Current: projectiles that pass through one of your ground effects/fields deal MORE damage and gain +15% area of effect. */
  fieldCarryMore:       { label: 'Field-Crossing Projectile More Damage', base: 0, min: 0, max: 0.60, percent: true },
  /** Stone Threshold: whenever a single hit exceeds 30% of max life, divert this fraction of the excess into Stagger (composes cleanly with hitCap). */
  burstStaggerPct:      { label: 'Excess Burst Staggered (>30% Life)', base: 0, min: 0, max: 0.85, percent: true },
  /** Loaded Tempest (>0): high-roll hits guarantee Shock and arc a chained lightning bolt to a nearby foe (0.4s ICD). */
  highRollShockChain:   { label: 'High-Roll Storm Overload', base: 0, min: 0 },
  /** Wrist-Bound Fount: chance on blocking a hit (1s ICD) to restore +1 charge to a non-full flask. */
  flaskBlockCharge:     { label: 'Flask Charge Chance on Block', base: 0, min: 0, max: 1, percent: true },
  // PASS 16-17 — WOLCEN GATE OF FATES DEEP-DIVE ENGINES
  /** Virtuose Stance: movement skills toggle between Probing Weakness (double damage & pen, -res) and Stalwart Resolve (block, guard, poise, -speed). */
  virtuoseStance:       { label: 'Virtuose Stance Power', base: 0, min: 0, max: 2.0, percent: true },
  /** Pugilist's Cadence: every 4th landed hit ('cadence' gauge 0..3) triggers a tag-specialized finisher (melee shockwave, projectile splinter fan, or spell nova + mana). */
  cadenceFinisher:      { label: 'Pugilist Cadence Finisher Power', base: 0, min: 0, max: 1.8, percent: true },
  /** Salvatory Counter: blocking or parrying launches an immediate weapon-scaled physical counter-strike (can crit, inflicts bleed, grants Endurance/Ward; 0.5s ICD). */
  salvatoryCounter:     { label: 'Salvatory Block Counter-Strike', base: 0, min: 0, max: 1.8, percent: true },
  /** Blessed Silver: holds 5 Anointed Rounds ('silverAmmo' 0..5, reloads on movement or +1/2s): loaded rounds grant MORE projectile damage; spent rounds grant MORE melee damage. */
  silverQuiverPower:    { label: 'Anointed Silver Quiver Scaling', base: 0, min: 0, max: 0.16, percent: true },
  /** Waltzing Smoke: movement skills (4s ICD) grant 2.5s Phantom Invisibility; your next hit breaks veil for MORE damage, heavy crit chance, and guaranteed bleed + poison. */
  smokeVeilPower:       { label: 'Phantom Smoke Ambush Power', base: 0, min: 0, max: 0.75, percent: true },
  /** Elementary Destabilization: casting below 35% Mana (3.5s ICD) unleashes a Fire/Cold/Lightning cataclysm scaled by Life + ES and rebounds 18% max Mana. */
  elemDestabPower:      { label: 'Elementary Destabilization Blast', base: 0, min: 0, max: 1.8, percent: true },
  /** Occult Escalation: deal MORE hit and DoT damage per total active ailment stack on the victim (capped at 20 stacks). */
  occultStackMore:      { label: 'Occult More Damage per Ailment Stack', base: 0, min: 0, max: 0.04, percent: true },
  /** Undertaker's Harvest: deaths (or every 5th hit vs elites/bosses) drop Bile Globes harvested by you or minions for healing + 'harvest' stacks (0..8) granting MORE damage. */
  undertakerPower:      { label: 'Undertaker Harvest Power per Stack', base: 0, min: 0, max: 0.12, percent: true },
  /** Beacon for the Lost: >=50% ES or Ward empowers Spells/Songs/Heals; <50% ES without Ward empowers Attacks/Melee with speed and ES leech. */
  beaconPolarity:       { label: 'Beacon Split-Shield Polarity Power', base: 0, min: 0, max: 0.55, percent: true },
  /** Blistering Embrace: hitting enemies with >=4 Burn stacks (0.8s per-target ICD) consumes half to detonate a Fire Nova and ignite nearby foes. */
  burnDetonatePower:    { label: 'Blistering Burn Detonation Power', base: 0, min: 0, max: 1.5, percent: true },
  /** Life's First Movement: Attacks bank Lure of Darkness (0..3) empowering Spells; Spells bank Lure of Light (0..3) empowering Attacks with cross-pollinated scaling and speed. */
  equilibriumPower:     { label: 'Equilibrium Cross-Weave Power', base: 0, min: 0, max: 0.45, percent: true },
  /** Academic Fieldwork: slaying rares/bosses (or every 8th hit vs elites/bosses) stacks Trophy (0..5, 20s) for MORE damage, armor, speed, and resistances. */
  trophyPower:          { label: 'Academic Trophy Power per Stack', base: 0, min: 0, max: 0.16, percent: true },
  /** Wintry Hail: projectiles hitting Chilled or Frozen enemies (0.35s ICD) ricochet freezing shards to nearby foes with Cold Penetration. */
  frostRicochet:        { label: 'Wintry Hail Frost Ricochet Power', base: 0, min: 0, max: 1.5, percent: true },
  /** Intravenous Spark: crits stack Neural Surge (0..5, 0.2s ICD) boosting attack/cast speed; reaching 5 discharges a chained Lightning Arc and resets. */
  neuralSparkPower:     { label: 'Intravenous Neural Surge Power', base: 0, min: 0, max: 1.5, percent: true },
  /** Residual Energy: casting a Spell imprints its element onto your next 2 Attacks as extra damage; casting an Attack imprints physical force onto your next Spell. */
  residualImprint:      { label: 'Residual Spell-Attack Imprint Ratio', base: 0, min: 0, max: 0.65, percent: true },
  /** Essential Measure: applying a damaging ailment (1.2s per-target ICD) pulses corrosive chaos around the victim, refreshing nearby DoTs and empowering minions. */
  plagueDiffPower:      { label: 'Essential Measure Contagion Pulse', base: 0, min: 0, max: 1.5, percent: true },
  /** Dawn Consecration: healing or gaining Ward (3.5s ICD) lays 4s Consecrated Ground scorching foes (harder below 40% life) and hasting/mending allies & minions. */
  dawnConsecrate:       { label: 'Dawn Consecrated Ground Power', base: 0, min: 0, max: 1.5, percent: true },
  /** Chrono-Siphon: hitting Chilled, Slowed, Stunned, Cursed, or Temporal-Debt foes (0.75s ICD) shaves active skill cooldowns and extends active buffs. */
  chronoSiphon:         { label: 'Temporal Siphon Cooldown Shave', base: 0, min: 0, max: 1.5, percent: true },
  // PASS 18-19 — VOIDLING BOUND PERKS DEEP-DIVE ENGINES
  /** Rime Cocoon (Frostbite Detonation): dropping below 35% life (25s ICD) encases you in 2s invulnerable ice healing per second, then shatters in a huge Cold/Stun nova. */
  cryoCocoonPower:      { label: 'Rime Cocoon Cryo-Stasis Power', base: 0, min: 0, max: 1.8, percent: true },
  /** Lithic Shellburst (Stone Skin Fissure): dropping below 40% life (12s ICD) erupts a physical/armor shockwave, refills 30% Endurance, and hardens a 6s Stone Skin shell. */
  lithicFissurePower:   { label: 'Lithic Shellburst Eruption Power', base: 0, min: 0, max: 1.8, percent: true },
  /** Fueled Momentum (Fueled Up + Frenzied): kills or every 4th elite/boss hit stack Fueled ('fueled' 0..10, 7s) for attack/cast speed and moving-cast haste. */
  fueledRatePower:      { label: 'Fueled Momentum Speed per Stack', base: 0, min: 0, max: 0.12, percent: true },
  /** Windburn Slipstream (Windburn + Overflow): moving launches Fire+Cold bolts applying Burn & Chill; reload or movement skills emit a chilling knockback whirlpool. */
  windburnPower:        { label: 'Windburn Slipstream Bolt Power', base: 0, min: 0, max: 1.8, percent: true },
  /** Phase Stasis (Plane Shift + Night Bite): invisibility, high concealment, or evading (3.5s ICD) dilates nearby foes; hitting stunned/frozen/dilated foes bleeds & heals. */
  phaseStasisPower:     { label: 'Phase Stasis Dilation & Night Bite', base: 0, min: 0, max: 1.8, percent: true },
  /** Tractor Tethers (Tractor Beams): links up to 3 foes within 250px every 0.6s, dealing Lightning damage, pulling non-bosses, shocking, and siphoning Mana & ES. */
  tractorTetherPower:   { label: 'Tractor Tether Siphon Power', base: 0, min: 0, max: 1.8, percent: true },
  /** Plasma Disintegration (Disintegrate / Plasma Overflow + Deadly Weakness): hits stack Disintegration (0..5); >=4 stacks amplify damage; 6th detonates a Plasma Overflow blast & shreds defenses. */
  plasmaDisintPower:    { label: 'Plasma Disintegration Overflow', base: 0, min: 0, max: 1.8, percent: true },
  /** Spring Bloom (Spring Bloom + Ripe Harvest): Ultimate, Cooldown (>=3s), or Summon casts (5s ICD) or elite kills scatter 8s Bloom Flowers buffing damage, speed, and regen to allies & minions. */
  springBloomPower:     { label: 'Spring Bloom Flower Potency', base: 0, min: 0, max: 1.8, percent: true },
  /** Living Tides (Healing Roots + Soothing Voyage): standing still 2s blooms a sanctuary healing zone; moving untouched ramps healing & speed until stopped or hurt. */
  livingTidesPower:     { label: 'Living Tides Root & Voyage Heal', base: 0, min: 0, max: 1.8, percent: true },
  /** Pyroclastic Feast (Lava Puddle + Watch Them Burn): hits (30%, 3s ICD) spawn burning Lava Puddles; Burn damage dealt heals you (capped at 15% max life/s). */
  burnFeastPower:       { label: 'Pyroclastic Feast Lava & Burn Heal', base: 0, min: 0, max: 1.8, percent: true },
  /** Carapace Integration (Block Integration): cooldown, guard, or warcry casts (2s ICD) bank Block Charges ('blockCharges' 0..4) that automatically blunt hits, grant Ward, and reflect damage. */
  blockIntegratePower:  { label: 'Carapace Integrated Block Power', base: 0, min: 0, max: 1.8, percent: true },
  /** Critical Detonator (Critical Blast): crits stack Blast Charges ('critCharge' 0..3, 0.25s ICD); 3rd crit detonates a physical+fire blast stunning foes and shredding boss poise. */
  critBlastPower:       { label: 'Critical Blast Stun Detonation', base: 0, min: 0, max: 1.8, percent: true },
  /** Bio-Recycling (Recycling + Heat Absorption): kills or every 5th elite hit (1.5s ICD) restore +1 skill charge & shave cooldown; reload/munition/flask casts unleash a chilling frost burst. */
  recyclePower:         { label: 'Bio-Recycling Charge & Frost Power', base: 0, min: 0, max: 1.8, percent: true },
  /** Hematic Transfusion (Transfusion + Low-Life Hyperdrive): hits vs Bleeding foes heal for hit damage dealt (excess overflows to Ward); Low Life activates Adrenal Hyperdrive speed & crit surge. */
  bleedTransfusePower:  { label: 'Hematic Transfusion & Hyperdrive', base: 0, min: 0, max: 1.8, percent: true },
  /** Cryo-Execution (Hypothermia): massive MORE hit damage against Frozen, Stunned, or Poise-Broken enemies, plus +40% increased Cold Poise Damage against Chilled foes. */
  hypothermiaPower:     { label: 'Hypothermia Execution More Damage', base: 0, min: 0, max: 1.5, percent: true },
  /** Corrosive Dissolution (Poison Armor-Shredder): each active Poison stack on foes you poison shreds their Armor and Chaos/Physical defenses (up to 15 stacks) for you and minions. */
  poisonMeltPower:      { label: 'Corrosive Poison Armor Melt/Stack', base: 0, min: 0, max: 0.12, percent: true },
  /** Pylon Resonance (Nimiod Turret Resonance): standing near your Constructs or Minions restores Mana & ES and hastes them; movement skills (3s ICD) overcharge them into area bursts. */
  pylonResonancePower:  { label: 'Pylon Resonance Aura & Overcharge', base: 0, min: 0, max: 1.8, percent: true },
  /** Power Extractor (Energy Extractor): kills or every 6th elite hit (2s ICD) drop Power Blobs that restore Mana, shave cooldowns, feed Ultimate gauge, and grant haste on pickup. */
  energyExtractPower:   { label: 'Power Extractor Blob Potency', base: 0, min: 0, max: 1.8, percent: true },
};

// Source-typed extra damage: gainAs_<from>_<to> = fraction of pre-conversion
// <from> damage gained as extra <to> damage (additive beside conversion).
for (const from of DAMAGE_TYPES) {
  for (const to of DAMAGE_TYPES) {
    if (from === to) continue;
    STAT_DEFS[`gainAs_${from}_${to}`] = {
      label: `${from[0].toUpperCase()}${from.slice(1)} Gained as Extra ${to[0].toUpperCase()}${to.slice(1)}`,
      base: 0, min: 0, percent: true,
    };
  }
}

const GAIN_AS_STAT_MAP: Record<DamageType, Partial<Record<DamageType, string>>> = {
  physical: {}, fire: {}, cold: {}, lightning: {}, chaos: {},
};
for (const from of DAMAGE_TYPES) {
  for (const to of DAMAGE_TYPES) {
    if (from === to) continue;
    GAIN_AS_STAT_MAP[from][to] = `gainAs_${from}_${to}`;
  }
}

export function gainAsStat(from: DamageType, to: DamageType): string {
  return GAIN_AS_STAT_MAP[from][to] ?? `gainAs_${from}_${to}`;
}

// Damage conversion stats: convert_<from>_<to> = fraction of <from> damage
// dealt as <to> instead. Total conversion per source type caps at 100%.
// Usable by supports, passives, or skill leveling alike.
const CONVERSION_STAT_MAP: Record<DamageType, Partial<Record<DamageType, string>>> = {
  physical: {}, fire: {}, cold: {}, lightning: {}, chaos: {},
};
for (const from of DAMAGE_TYPES) {
  for (const to of DAMAGE_TYPES) {
    if (from === to) continue;
    const id = `convert_${from}_${to}`;
    CONVERSION_STAT_MAP[from][to] = id;
    STAT_DEFS[id] = {
      label: `${from[0].toUpperCase()}${from.slice(1)} Converted to ${to[0].toUpperCase()}${to.slice(1)}`,
      base: 0, min: 0, max: 1, percent: true,
    };
  }
}

export function conversionStat(from: DamageType, to: DamageType): string {
  return CONVERSION_STAT_MAP[from][to] ?? `convert_${from}_${to}`;
}

// THE EXTRA LANE (THE LEGEND FABRIC — docs/engine/legends.md): extraAs_<type>
// = a fraction of ALL damage dealt GAINED as extra <type> — ADDITIVE beside
// conversion (no source loses anything), folded once at applyConversion off
// the post-conversion total so several extras never compound on each
// other. "Gain 30% of damage as extra fire damage" is one flat line.
const EXTRA_AS_STAT_MAP: Record<DamageType, string> = {
  physical: 'extraAs_physical',
  fire: 'extraAs_fire',
  cold: 'extraAs_cold',
  lightning: 'extraAs_lightning',
  chaos: 'extraAs_chaos',
};
for (const t of DAMAGE_TYPES) {
  const cap = t[0].toUpperCase() + t.slice(1);
  STAT_DEFS[EXTRA_AS_STAT_MAP[t]] = { label: `Damage Gained as Extra ${cap}`, base: 0, min: 0, percent: true };
}
export function extraAsStat(to: DamageType): string { return EXTRA_AS_STAT_MAP[to]; }

// MIN/MAX added damage (the D2 lane): addedMin_<type> raises only the
// bottom of the roll, addedMax_<type> only the top — so "+30 to maximum
// lightning damage" builds the huge-variance thunder D2 promised, while
// min-investment steadies the floor. Flat added<Type> still moves both.
for (const t of DAMAGE_TYPES) {
  const cap = t[0].toUpperCase() + t.slice(1);
  STAT_DEFS[`addedMin_${t}`] = { label: `Minimum ${cap} Damage`, base: 0, min: 0 };
  STAT_DEFS[`addedMax_${t}`] = { label: `Maximum ${cap} Damage`, base: 0, min: 0 };
}

const ADDED_DAMAGE_STAT: Record<DamageType, string> = {
  physical: 'addedPhysical',
  fire: 'addedFire',
  cold: 'addedCold',
  lightning: 'addedLightning',
  chaos: 'addedChaos',
};
export function addedDamageStat(type: DamageType): string { return ADDED_DAMAGE_STAT[type]; }

// ---------------------------------------------------------------------------
// StatSheet
// ---------------------------------------------------------------------------

/** Canonical bit-slot registry for SkillTag strings so tagged StatSheet cache
 *  lookups fold live Set<SkillTag> contents into integer bitmasks with zero
 *  array/string/sort allocations while immediately reflecting Set mutations. */
const TAG_SLOTS: Record<string, number | undefined> = Object.create(null);
let nextTagSlot = 0;

// Pre-seed core non-dynamic SkillTag literals into slots 0..52 so common skill
// queries always hit the single-integer (<= Number.MAX_SAFE_INTEGER) fast path.
for (const coreTag of [
  'physical', 'fire', 'cold', 'lightning', 'chaos',
  'attack', 'spell', 'melee', 'projectile', 'aoe', 'duration',
  'movement', 'summon', 'minion', 'warcry', 'buff', 'storm',
  'aura', 'totem', 'trap', 'mine', 'corpse', 'construct', 'conjure',
  'channel', 'instant', 'curse', 'guard', 'targeted',
  'cast:timed', 'cast:instant', 'cast:channel', 'cast:held',
  'mirage', 'clone', 'sweep', 'overdrive', 'overcharge', 'heal',
  'persistent', 'javelin', 'chrono', 'ultimate', 'fissure', 'pulse',
  'flask', 'munition', 'reload', 'song', 'companion', 'grab', 'throw',
  'mimic',
] as const) {
  TAG_SLOTS[coreTag] = nextTagSlot++;
}

interface TaggedStatCache {
  /** Single 53-bit safe integer mask for tag slots 0..52 (tagM2 === 0 && tagBig === undefined). */
  m1: Map<number, number>;
  /** Two-word 106-bit mask for tag slots 0..105 when any tag lands in 53..105 (tagBig === undefined). */
  m2?: Map<number, Map<number, number>>;
  /** Exact arbitrary-width bitset fallback when any dynamic tag lands at slot >= 106. */
  big?: Map<bigint, number>;
}

interface EncodedTagSet {
  readonly size: number;
  readonly m1: number;
  readonly m2: number;
  readonly big: bigint | undefined;
}

const TAG_BITSET = Symbol('tagBitset');
type StampedTagSet = ReadonlySet<SkillTag> & { [TAG_BITSET]?: EncodedTagSet };

/** Pre-encode an immutable Set<SkillTag> into its canonical TAG_SLOTS bitset so
 *  StatSheet.compute reads (tagM1, tagM2, tagBig) in O(1) without iterating the Set.
 *  Never pass a Set that callers may subsequently mutate. */
export function markImmutableTagSet(set: Set<SkillTag>): Set<SkillTag> {
  if (set.size === 0 || (set as StampedTagSet)[TAG_BITSET] !== undefined) return set;
  let lo1 = 0, hi1 = 0, lo2 = 0, hi2 = 0;
  let big: bigint | undefined;
  for (const t of set) {
    let slot = TAG_SLOTS[t];
    if (slot === undefined) {
      slot = nextTagSlot++;
      TAG_SLOTS[t] = slot;
    }
    if (slot < 31) lo1 |= 1 << slot;
    else if (slot < 53) hi1 |= 1 << (slot - 31);
    else if (slot < 84) lo2 |= 1 << (slot - 53);
    else if (slot < 106) hi2 |= 1 << (slot - 84);
    else big = (big ?? 0n) | (1n << BigInt(slot - 106));
  }
  const m1 = hi1 * 0x80000000 + lo1;
  const m2 = hi2 * 0x80000000 + lo2;
  if (big !== undefined) {
    big = (big << 106n) | (BigInt(m2) << 53n) | BigInt(m1);
  }
  (set as StampedTagSet)[TAG_BITSET] = { size: set.size, m1, m2, big };
  return set;
}

/** Pre-indexed STAT_TRADES lookup validated against live array length and element
 *  references so non-traded stats skip both trade loops in O(1) while dynamic
 *  STAT_TRADES edits (probes pushing/popping rows) take effect immediately. */
interface TradeIndex {
  epoch: number;
  byTo: Map<string, StatTrade[]>;
  byFrom: Map<string, StatTrade[]>;
}

let tradeIdx: TradeIndex | null = null;
let tradeSnap: StatTrade[] = [];
let tradeEpochCounter = 0;

function tradesMatchSnap(len: number): boolean {
  for (let i = 0; i < len; i++) {
    if (STAT_TRADES[i] !== tradeSnap[i]) return false;
  }
  return true;
}

function getTradeIndex(): TradeIndex {
  const len = STAT_TRADES.length;
  if (
    tradeIdx !== null &&
    tradeSnap.length === len &&
    (len === 4
      ? STAT_TRADES[0] === tradeSnap[0] &&
        STAT_TRADES[1] === tradeSnap[1] &&
        STAT_TRADES[2] === tradeSnap[2] &&
        STAT_TRADES[3] === tradeSnap[3]
      : tradesMatchSnap(len))
  ) {
    return tradeIdx;
  }
  const byTo = new Map<string, StatTrade[]>();
  const byFrom = new Map<string, StatTrade[]>();
  tradeSnap = STAT_TRADES.slice();
  for (let i = 0; i < len; i++) {
    const t = STAT_TRADES[i];
    let toBucket = byTo.get(t.to);
    if (!toBucket) byTo.set(t.to, toBucket = []);
    toBucket.push(t);
    let fromBucket = byFrom.get(t.from);
    if (!fromBucket) byFrom.set(t.from, fromBucket = []);
    fromBucket.push(t);
  }
  tradeIdx = { epoch: ++tradeEpochCounter, byTo, byFrom };
  return tradeIdx;
}

/** Optional per-stat index attached ONLY to immutable memoized `instanceMods`
 *  arrays so StatSheet.compute and armedFamily skip linear scans over 15-30
 *  skill-local modifiers on every uncached stat query. Ad-hoc caller arrays
 *  are never registered here and keep the standing linear scan. */
interface ExtraModIndex {
  len: number;
  byStat: Map<string, Modifier[]>;
  byPrefix: Map<string, readonly string[]>;
  hasWhen: boolean;
  hasGauge: boolean;
}
const EXTRA_MOD_INDEX = new WeakMap<readonly Modifier[], ExtraModIndex>();
const EMPTY_STRINGS: readonly string[] = [];

export function indexExtraMods(mods: Modifier[]): Modifier[] {
  if (mods.length > 0 && !EXTRA_MOD_INDEX.has(mods)) {
    const byStat = new Map<string, Modifier[]>();
    let hasWhen = false;
    let hasGauge = false;
    for (let i = 0; i < mods.length; i++) {
      const m = mods[i];
      if (m.when !== undefined || m.unless !== undefined) hasWhen = true;
      if (m.gauge !== undefined) hasGauge = true;
      let bucket = byStat.get(m.stat);
      if (!bucket) byStat.set(m.stat, bucket = []);
      bucket.push(m);
    }
    EXTRA_MOD_INDEX.set(mods, { len: mods.length, byStat, byPrefix: new Map(), hasWhen, hasGauge });
  }
  return mods;
}

/** Can this stat stand non-zero with no modifier naming it? A registered
 *  non-zero base, a positive min clamp (compute's floor lifts an untouched
 *  stat), or a trade's gain side. Read at CALL time — generated families
 *  (apply_<status>, …) register long after this module loads. */
function staticallyArmed(stat: string): boolean {
  const def = STAT_DEFS[stat];
  if (def && (def.base > 0 || (def.min ?? 0) > 0)) return true;
  return getTradeIndex().byTo.has(stat);
}

/** One family's derived ARMED LIST (see StatSheet.armedFamily) — the ordered
 *  ids and the same set for O(1) membership during the `extra` union. */
interface ArmedFamily {
  registry: readonly string[];
  registryLength: number;
  ids: readonly string[];
  set: ReadonlySet<string>;
  registrySet: ReadonlySet<string>;
}

/** Per-prefix cache: `named` is collected once per source generation, and
 *  multiple trigger-partitioned `ids` sub-registries sharing one prefix (e.g.
 *  `'proc_'` across hit/kill, statusApply, collision, pulse, own triggers)
 *  coexist without evicting each other. */
interface ArmedPrefixCache {
  tradeEpoch: number;
  named: ReadonlySet<string>;
  primary?: ArmedFamily;
  byRegistry?: Map<readonly string[], ArmedFamily>;
}

/** Per-sheet value caches scoped to an immutable memoized `instanceMods` array
 *  (identified via `EXTRA_MOD_INDEX`). Dropped alongside the sheet-level value
 *  caches whenever `invalidate()` runs. */
interface ExtraStatCacheSet {
  untagged: Map<string, number>;
  untaggedNoLinks: Map<string, number>;
  tagged: Map<string, TaggedStatCache>;
  taggedNoLinks: Map<string, TaggedStatCache>;
}

function tagsArrayEqual(a: readonly SkillTag[] | undefined, b: readonly SkillTag[] | undefined): boolean {
  if (a === b) return true;
  const al = a?.length ?? 0, bl = b?.length ?? 0;
  if (al !== bl) return false;
  for (let i = 0; i < al; i++) {
    if (a![i] !== b![i]) return false;
  }
  return true;
}

function modStructEqual(a: Modifier, b: Modifier): boolean {
  return (
    a.stat === b.stat &&
    a.kind === b.kind &&
    Object.is(a.value, b.value) &&
    a.fromStat === b.fromStat &&
    a.linkTarget === b.linkTarget &&
    a.fromOffset === b.fromOffset &&
    a.minFrom === b.minFrom &&
    a.when === b.when &&
    a.unless === b.unless &&
    a.gauge === b.gauge &&
    a.gaugeAt === b.gaugeAt &&
    tagsArrayEqual(a.tags, b.tags)
  );
}

function snapshotSmallMods(mods: readonly Modifier[]): Modifier[] | null {
  if (mods.length > 8) return null;
  const snap = new Array<Modifier>(mods.length);
  for (let i = 0; i < mods.length; i++) {
    const m = mods[i];
    snap[i] = m.tags ? { ...m, tags: m.tags.slice() } : { ...m };
  }
  return snap;
}

function modsMatchSnap(mods: readonly Modifier[], snap: readonly Modifier[]): boolean {
  if (mods.length !== snap.length) return false;
  for (let i = 0; i < mods.length; i++) {
    if (!modStructEqual(mods[i], snap[i])) return false;
  }
  return true;
}

export class StatSheet {
  private sources = new Map<string, Modifier[]>();
  private sourceSnaps = new Map<string, Modifier[]>();
  /** Source-order buckets. State changes alter eligibility, not membership;
   *  only source replacement/removal rebuilds this index. */
  private modsByStat: Map<string, Modifier[]> | null = null;
  private baseOverrides = new Map<string, number>();
  private untaggedCache = new Map<string, number>();
  private untaggedNoLinksCache = new Map<string, number>();
  private taggedCache = new Map<string, TaggedStatCache>();
  private taggedNoLinksCache = new Map<string, TaggedStatCache>();
  private extraCaches: WeakMap<readonly Modifier[], ExtraStatCacheSet> | null = null;
  private extraHasWhen = false;
  private extraHasGauge = false;
  private cacheTradeEpoch = -1;
  /** Active actor-state conditions as a bitmask (bit i ⇔ CONDITION_IDS[i]). */
  private conditionMask = 0;
  /** Live GAUGES (status stacks, charge counts) gauge-scaled mods read.
   *  Integer, event-driven quantities only — see Modifier.gauge. */
  private gauges = new Map<string, number>();
  private gaugeKey = '';
  private gaugesDeferred = false;
  /** Optional lazy pull hook set by Actor so uninvested bodies skip per-frame
   *  gauge hashing while on-demand reads (e.g. mid-frame setSource/gem socket)
   *  still see live actor gauges immediately. */
  syncGaugesHook?: () => void;

  /** Which ConditionIds any registered modifier DEMANDS (`when:`), cached
   *  lazily and invalidated on source change. Lets systems whose upkeep
   *  should be null-cost until referenced (the combo grammar's cast ring)
   *  ask "does anything on this sheet even care?" without scanning mods
   *  per frame. Skill-local `extra` mods are NOT visible here — callers
   *  with instance-level consumers scan those themselves. */
  private whenRefs: Set<ConditionId> | null = null;

  /** Which stats any registered modifier TAG-FILTERS (Modifier.tags) —
   *  the whenRefs idiom, for tag scope: per-frame consumers whose read is
   *  normally untagged (the cooldown map's one cooldownRecovery read) ask
   *  this before paying for per-item context reads, so a tag-scoped grant
   *  ("flask cooldown recovery") stops being invisible to them the moment
   *  it exists and costs nothing while it doesn't. Skill-local `extra`
   *  mods are NOT visible here, exactly like whenRefs. */
  private taggedStats: Set<string> | null = null;

  /** Whether any registered modifier reads the VICTIM SCOPE ('vs:' tags)
   *  — see hasVsMods. Derived per source generation like taggedStats. */
  private vsMods: boolean | null = null;

  /** Which GAUGE ids any registered modifier reads (Modifier.gauge) — see
   *  usesGauge. Derived per source generation like whenRefs. */
  private gaugeRefs: Set<string> | null = null;

  /** THE ARMED LISTS — per generated stat FAMILY (see armedFamily), keyed by
   *  the family's prefix and derived lazily. Dropped by invalidate() beside
   *  the value cache: a derived list that outlived a departed source would
   *  be a stale-arm bug, so both hang off the ONE seam. */
  private armedFams: Map<string, ArmedPrefixCache> | null = null;

  /** Superset of stat ids whose untagged get(id) could differ from
   *  statRestingValue(id). Derived lazily per source/base/trade generation so
   *  character-sheet scans test ~40 touched stats instead of all ~6,300 defs. */
  private nonRestingCandidates: Set<string> | null = null;
  private nonRestingTradeEpoch = -1;

  /** Drop every DERIVED read — the value cache and the armed lists. Every
   *  mutation below funnels through this one seam so a future mutation can
   *  never clear half the derivations. */
  private invalidate(): void {
    if (this.untaggedCache.size > 0) this.untaggedCache.clear();
    if (this.untaggedNoLinksCache.size > 0) this.untaggedNoLinksCache.clear();
    if (this.taggedCache.size > 0) this.taggedCache.clear();
    if (this.taggedNoLinksCache.size > 0) this.taggedNoLinksCache.clear();
    this.extraCaches = null;
    this.extraHasWhen = false;
    this.extraHasGauge = false;
    this.armedFams = null;
  }

  /** Replace the active condition bitmask (invalidates only caches that read a changed condition). */
  setConditionMask(mask: number): void {
    const diff = mask ^ this.conditionMask;
    if (diff === 0) return;
    let sheetRel = false;
    if (this.hasConditionalMods()) {
      for (const c of this.ensureWhenRefs()) {
        if ((diff & (COND_BIT[c] ?? 0)) !== 0) { sheetRel = true; break; }
      }
    }
    this.conditionMask = mask;
    if (sheetRel) {
      this.invalidate();
    } else {
      this.armedFams = null;
      if (this.extraHasWhen) {
        this.extraCaches = null;
        this.extraHasWhen = false;
        this.extraHasGauge = false;
      }
    }
  }

  /** Replace the active condition set (cache clears only on real change). */
  setConditions(active: ConditionId[]): void {
    let mask = 0;
    for (let i = 0; i < active.length; i++) {
      mask |= COND_BIT[active[i]] ?? 0;
    }
    this.setConditionMask(mask);
  }

  hasCondition(id: ConditionId): boolean { return (this.conditionMask & COND_BIT[id]) !== 0; }

  private ensureWhenRefs(): Set<ConditionId> {
    if (!this.whenRefs) {
      const refs = new Set<ConditionId>();
      for (const mods of this.sources.values()) {
        for (const m of mods) {
          if (m.when) refs.add(m.when);
          if (m.unless) refs.add(m.unless);
        }
      }
      this.whenRefs = refs;
    }
    return this.whenRefs;
  }

  /** Does any registered (sheet-level) modifier condition on `id`? */
  usesCondition(id: ConditionId): boolean {
    return this.ensureWhenRefs().has(id);
  }

  /** Does any registered (sheet-level) modifier carry `when` or `unless`? */
  hasConditionalMods(): boolean {
    return this.ensureWhenRefs().size > 0;
  }

  /** Does any registered (sheet-level) modifier carry `gauge`? */
  hasGaugeMods(): boolean {
    return this.ensureGaugeRefs().size > 0;
  }

  /** True if any registered modifier uses `when`/`unless`, `gauge`, or `vs:` tags. */
  hasAnyConditionalOrGauge(): boolean {
    return this.hasConditionalMods() || this.hasGaugeMods() || this.hasVsMods();
  }

  markGaugesDeferred(): void {
    this.gaugesDeferred = true;
    this.armedFams = null;
    if (this.extraHasGauge) {
      this.extraCaches = null;
      this.extraHasWhen = false;
      this.extraHasGauge = false;
    }
  }

  /** Replace the live gauge set (invalidates only caches that read a changed gauge). */
  setGauges(entries: [string, number][], fromDeferredPull = false): void {
    if (this.gaugesDeferred) {
      this.gaugesDeferred = false;
    }
    const key = entries.length === 0 ? ''
      : entries.length === 1 ? entries[0][0] + ':' + entries[0][1]
      : entries.map(([k, v]) => k + ':' + v).sort().join('|');
    if (key === this.gaugeKey) return;
    let sheetRel = false;
    if (!fromDeferredPull && this.hasGaugeMods()) {
      const next = new Map<string, number>();
      for (let i = 0; i < entries.length; i++) next.set(entries[i][0], entries[i][1]);
      for (const [k, v] of next) {
        const prev = this.gauges.get(k);
        if ((prev ?? 0) !== v && this.usesGauge(k)) { sheetRel = true; break; }
      }
      if (!sheetRel) {
        for (const [k, prev] of this.gauges) {
          if (!next.has(k) && prev !== 0 && this.usesGauge(k)) { sheetRel = true; break; }
        }
      }
    }
    this.gaugeKey = key;
    this.gauges.clear();
    for (let i = 0; i < entries.length; i++) {
      this.gauges.set(entries[i][0], entries[i][1]);
    }
    if (!fromDeferredPull) {
      if (sheetRel) {
        this.invalidate();
      } else {
        this.armedFams = null;
        if (this.extraHasGauge) {
          this.extraCaches = null;
          this.extraHasWhen = false;
          this.extraHasGauge = false;
        }
      }
    }
  }

  gauge(id: string): number {
    if (this.gaugesDeferred) {
      this.gaugesDeferred = false;
      this.syncGaugesHook?.();
    }
    return this.gauges.get(id) ?? 0;
  }

  /** Add or replace a named bundle of modifiers (e.g. 'class', 'buff:warcry'). */
  setSource(name: string, mods: Modifier[]): void {
    const prevSnap = this.sourceSnaps.get(name);
    if (prevSnap !== undefined && modsMatchSnap(mods, prevSnap)) {
      this.sources.set(name, mods);
      return;
    }
    const nextSnap = snapshotSmallMods(mods);
    if (nextSnap !== null) this.sourceSnaps.set(name, nextSnap);
    else this.sourceSnaps.delete(name);
    this.sources.set(name, mods);
    this.modsByStat = null;
    this.nonRestingCandidates = null;
    this.invalidate();
    this.whenRefs = null;
    this.taggedStats = null;
    this.vsMods = null;
    this.gaugeRefs = null;
  }

  removeSource(name: string): void {
    const prev = this.sources.get(name);
    if (prev !== undefined) {
      this.sources.delete(name);
      this.sourceSnaps.delete(name);
      if (prev.length === 0) return;
      this.modsByStat = null;
      this.nonRestingCandidates = null;
      this.invalidate();
      this.whenRefs = null;
      this.taggedStats = null;
      this.vsMods = null;
      this.gaugeRefs = null;
    }
  }

  /** Does any registered (sheet-level) modifier tag-filter `stat`? See
   *  taggedStats above — derived once per source generation. */
  /** THE VICTIM SCOPE's arming read: does any registered modifier carry a
   *  'vs:' tag? Derived once per source generation (the taggedStats idiom),
   *  so the hit site pays nothing to ask on every uninvested body. Skill-
   *  local `extra` mods are NOT visible here — the hit site scans those
   *  itself (victimScopeArmed in engine/victim.ts). */
  hasVsMods(): boolean {
    if (this.vsMods === null) {
      let any = false;
      for (const mods of this.sources.values()) {
        for (const m of mods) if (modReadsVictim(m)) { any = true; break; }
        if (any) break;
      }
      this.vsMods = any;
    }
    return this.vsMods;
  }

  /** Does any registered modifier read this GAUGE (Modifier.gauge)? The
   *  whenRefs idiom for the gauge axis — the world's derived-gauge sampler
   *  (engine/gauges.ts) asks before paying for a spatial or pool read that
   *  nothing on the sheet would consume. Skill-local `extra` mods are NOT
   *  visible here (Actor.gaugeReferenced folds those in). */
  private ensureGaugeRefs(): Set<string> {
    if (!this.gaugeRefs) {
      const refs = new Set<string>();
      for (const mods of this.sources.values()) {
        for (const m of mods) if (m.gauge) refs.add(m.gauge);
      }
      this.gaugeRefs = refs;
    }
    return this.gaugeRefs;
  }

  usesGauge(id: string): boolean {
    return this.ensureGaugeRefs().has(id);
  }

  hasTaggedMods(stat: string): boolean {
    if (!this.taggedStats) {
      const s = new Set<string>();
      for (const mods of this.sources.values()) {
        for (const m of mods) if (m.tags?.length) s.add(m.stat);
      }
      this.taggedStats = s;
    }
    return this.taggedStats.has(stat);
  }

  hasSource(name: string): boolean { return this.sources.has(name); }

  sourceNames(): string[] { return [...this.sources.keys()]; }

  getSourceMods(name: string): Modifier[] | undefined { return this.sources.get(name); }

  /** Keep the exact Map/source-array order, including last-override wins.
   *  Call setSource after editing a source, as required by the value cache. */
  private sourceModsFor(stat: string): readonly Modifier[] | undefined {
    if (!this.modsByStat) {
      const index = new Map<string, Modifier[]>();
      for (const mods of this.sources.values()) for (const m of mods) {
        const id = m.stat;
        let bucket = index.get(id);
        if (!bucket) index.set(id, bucket = []);
        bucket.push(m);
      }
      this.modsByStat = index;
    }
    return this.modsByStat.get(stat);
  }

  /** Override a stat's base value (used by monster definitions). */
  setBase(stat: string, value: number): void {
    if (Object.is(this.baseOverrides.get(stat), value)) return;
    this.baseOverrides.set(stat, value);
    this.nonRestingCandidates = null;
    this.invalidate();
  }

  /** Superset of stat ids whose untagged `get(id)` could differ from
   *  `statRestingValue(id)`. Used by `sheetTabs` to avoid sweeping all ~6,300
   *  `STAT_DEFS` on every character-sheet poll. */
  candidateNonRestingStatIds(): ReadonlySet<string> {
    const tradeEpoch = getTradeIndex().epoch;
    if (!this.nonRestingCandidates || this.nonRestingTradeEpoch !== tradeEpoch) {
      this.sourceModsFor('');
      const out = new Set<string>(this.modsByStat!.keys());
      for (const k of this.baseOverrides.keys()) out.add(k);
      for (const t of STAT_TRADES) {
        out.add(t.to);
        out.add(t.from);
      }
      out.add('minionDamage');
      this.nonRestingCandidates = out;
      this.nonRestingTradeEpoch = tradeEpoch;
    }
    return this.nonRestingCandidates;
  }

  /**
   * THE ARMED LIST — which ids of a GENERATED stat family (`apply_<status>`,
   * `minionApply_<status>`, …) this sheet plus the caller's skill-local
   * `extra` could carry a non-zero value for. Per-hit sweeps over families
   * that have grown to ~130 ids ask this instead of computing every one; an
   * uninvested sheet on a gemless skill answers with an EMPTY list.
   *
   * The saving is not the memo — it is the FULL RESOLUTION: any gemmed skill
   * passes instance mods as `extra`, which makes every get() uncacheable
   * (compute's `cacheable`), and a single compute walks every modifier of
   * every source. One derivation per cache generation replaces ~130 of those
   * walks per hit.
   *
   * THE SUPERSET LAW: the answer is derived from what the layers NAME, never
   * from what they currently resolve to — a condition-gated, tag-filtered,
   * gauge-zeroed or outright negative grant stays armed. That keeps the
   * derivation O(mods) and independent of the query context (tags), and it
   * costs the caller nothing: a visited id that resolves to zero takes the
   * caller's own `<= 0` branch exactly as it always did. Names cannot be the
   * whole story, so the three NAMELESS arming roads fold in structurally
   * (staticallyArmed): a non-zero registered base, a positive min clamp, and
   * a trade's gain side.
   *
   * THE ORDER LAW: the result is a subset of `ids` IN `ids` ORDER. Callers
   * that roll per id (the apply_ sweep's `chance()`, rolled only where the
   * chance is positive) walk the RNG stream in exactly the order the full
   * sweep walked it — an armed list that reordered would silently reshuffle
   * every seeded run.
   *
   * `extra` is scanned per call (O(instance mods) — a handful, against ~130
   * full resolutions) because a socketed gem can arm a status the sheet
   * itself never mentions; the sheet's own half derives once per generation.
   * Treat `ids` as immutable: replace the array when changing membership or
   * order. A length key also catches registries that grow/shrink in place.
   */
  armedFamily(
    prefix: string, ids: readonly string[], extra?: readonly Modifier[],
  ): readonly string[] {
    const trades = getTradeIndex();
    if (this.cacheTradeEpoch !== trades.epoch) {
      if (this.cacheTradeEpoch !== -1) this.invalidate();
      this.cacheTradeEpoch = trades.epoch;
    }
    const fams = (this.armedFams ??= new Map());
    let pref = fams.get(prefix);
    if (!pref || pref.tradeEpoch !== trades.epoch) {
      const named = new Set<string>();
      for (const mods of this.sources.values()) {
        for (const m of mods) if (m.stat.startsWith(prefix)) named.add(m.stat);
      }
      // A base override arms only where it is POSITIVE: a zeroed or negative
      // base still needs a named mod (or a structural road) to stand positive,
      // and setBase(stat, 0) is an ordinary way to retire a grant.
      for (const [stat, v] of this.baseOverrides) {
        if (v > 0 && stat.startsWith(prefix)) named.add(stat);
      }
      pref = { tradeEpoch: trades.epoch, named };
      fams.set(prefix, pref);
    }
    let fam: ArmedFamily | undefined;
    if (pref.primary && pref.primary.registry === ids && pref.primary.registryLength === ids.length) {
      fam = pref.primary;
    } else if (pref.byRegistry) {
      const hit = pref.byRegistry.get(ids);
      if (hit && hit.registryLength === ids.length) fam = hit;
    }
    if (!fam) {
      const named = pref.named;
      let list: string[] | undefined;
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const st = prefix + id;
        if (named.has(st) || staticallyArmed(st)) (list ??= []).push(id);
      }
      const resolved = list ?? (EMPTY_STRINGS as string[]);
      fam = {
        registry: ids,
        registryLength: ids.length,
        ids: resolved,
        set: new Set(resolved),
        registrySet: new Set(ids),
      };
      if (!pref.primary) pref.primary = fam;
      else (pref.byRegistry ??= new Map()).set(ids, fam);
    }
    if (!extra || extra.length === 0) return fam.ids;
    // A socketed gem may arm what the sheet never mentions. Ids the sheet
    // already carries (or outside this sub-registry) change nothing — the
    // common gemmed case allocates nothing and hands back the derived list.
    const sheetArmed = fam.set;
    const regSet = fam.registrySet;
    let added: Set<string> | undefined;
    const rawExIdx = EXTRA_MOD_INDEX.get(extra);
    const exIdx = rawExIdx !== undefined && rawExIdx.len === extra.length ? rawExIdx : undefined;
    if (exIdx !== undefined) {
      let suffixes = exIdx.byPrefix.get(prefix);
      if (suffixes === undefined) {
        let found: string[] | undefined;
        for (const st of exIdx.byStat.keys()) {
          if (st.startsWith(prefix)) (found ??= []).push(st.slice(prefix.length));
        }
        suffixes = found ?? EMPTY_STRINGS;
        exIdx.byPrefix.set(prefix, suffixes);
      }
      if (suffixes.length === 0) return fam.ids;
      for (let i = 0; i < suffixes.length; i++) {
        const id = suffixes[i];
        if (!sheetArmed.has(id) && regSet.has(id)) (added ??= new Set()).add(id);
      }
    } else {
      for (let i = 0; i < extra.length; i++) {
        const st = extra[i].stat;
        if (!st.startsWith(prefix)) continue;
        const id = st.slice(prefix.length);
        if (!sheetArmed.has(id) && regSet.has(id)) (added ??= new Set()).add(id);
      }
    }
    if (!added) return fam.ids;
    const fresh = added;
    // Filtering `ids` (never concatenating) is what keeps THE ORDER LAW, and
    // it drops any prefixed stat that is not a member of this family.
    return ids.filter(id => sheetArmed.has(id) || fresh.has(id));
  }

  /**
   * Compute a stat. `contextTags` describes the action being evaluated
   * (skill tags + damage type); tag-filtered modifiers apply only when all
   * their tags are present in the context.
   *
   * `extra` carries skill-local modifiers (skill levels, socketed support
   * gems) that participate in the same layered formula but exist only for
   * this one query — the mechanism behind per-skill customization.
   *
   * `baseValue` overrides the stat's base for this query — used when a
   * skill brings its own base (e.g. a summon's maxActive) and modifiers
   * like "50% fewer maximum minions" should multiply it.
   */
  get(stat: string, contextTags?: ReadonlySet<SkillTag>, extra?: readonly Modifier[], baseValue?: number): number {
    return this.compute(stat, contextTags, extra, baseValue, false);
  }

  /** Ignore a stat's baseline and positive grants while retaining reductions.
   * Used by resistance-neutral ailments before debuffs and penetration. */
  reductionsFromZero(stat: string, contextTags?: ReadonlySet<SkillTag>): number {
    return this.compute(stat, contextTags, undefined, 0, true, true);
  }

  /**
   * The real computation behind get(). `noLinks` is the STAT-LINK golden
   * rule: a link ("gain 40% of life regen as thorns") reads its source at
   * the links-disabled BASELINE, so granted amounts can never feed further
   * grants — no chains (A→B→C), no cycles (A→B→A compounding), no
   * quadratic loops; every siphon is strictly single-hop. Linked amounts
   * join the target's BASE layer, so the target's own increased/more
   * modifiers scale them, and min/max clamps apply after everything.
   */
  private compute(
    stat: string, contextTags?: ReadonlySet<SkillTag>,
    extra?: readonly Modifier[], baseValue?: number, noLinks = false, reductionsOnly = false,
  ): number {
    if (PERF_SLABS.active) PERF_SLABS.statGets++;
    const trades = getTradeIndex();
    if (this.cacheTradeEpoch !== trades.epoch) {
      if (this.cacheTradeEpoch !== -1) this.invalidate();
      this.cacheTradeEpoch = trades.epoch;
    }

    const hasExtra = extra !== undefined && extra.length > 0;
    const rawExtraIdx = hasExtra ? EXTRA_MOD_INDEX.get(extra) : undefined;
    const extraIdx = hasExtra && rawExtraIdx !== undefined && rawExtraIdx.len === extra.length ? rawExtraIdx : undefined;
    const cacheable = (!hasExtra || extraIdx !== undefined) && baseValue === undefined && !reductionsOnly;
    // Ad-hoc (unindexed) skill-local modifiers and base overrides bypass the value cache.
    // Do not enumerate/allocate their tag sets for a key that is never read.
    let uCache: Map<string, number> | undefined;
    let tMap: Map<string, TaggedStatCache> | undefined;
    let tBucket: TaggedStatCache | undefined;
    let tagM1 = 0;
    let tagM2 = 0;
    let tagBig: bigint | undefined;
    if (cacheable) {
      let extraCacheSet: ExtraStatCacheSet | undefined;
      if (hasExtra) {
        let ec = this.extraCaches;
        if (ec === null) this.extraCaches = ec = new WeakMap();
        extraCacheSet = ec.get(extra);
        if (extraCacheSet === undefined) {
          extraCacheSet = {
            untagged: new Map(),
            untaggedNoLinks: new Map(),
            tagged: new Map(),
            taggedNoLinks: new Map(),
          };
          ec.set(extra, extraCacheSet);
          if (extraIdx!.hasWhen) this.extraHasWhen = true;
          if (extraIdx!.hasGauge) this.extraHasGauge = true;
        }
      }
      if (!contextTags || contextTags.size === 0) {
        uCache = extraCacheSet !== undefined
          ? (noLinks ? extraCacheSet.untaggedNoLinks : extraCacheSet.untagged)
          : (noLinks ? this.untaggedNoLinksCache : this.untaggedCache);
        const cached = uCache.get(stat);
        if (cached !== undefined) {
          if (PERF_SLABS.active) PERF_SLABS.statCacheHits++;
          return cached;
        }
      } else {
        const stamped = (contextTags as StampedTagSet)[TAG_BITSET];
        if (stamped !== undefined && stamped.size === contextTags.size) {
          tagM1 = stamped.m1;
          tagM2 = stamped.m2;
          tagBig = stamped.big;
        } else {
          let lo1 = 0, hi1 = 0, lo2 = 0, hi2 = 0;
          for (const t of contextTags) {
            let slot = TAG_SLOTS[t];
            if (slot === undefined) {
              slot = nextTagSlot++;
              TAG_SLOTS[t] = slot;
            }
            if (slot < 31) lo1 |= 1 << slot;
            else if (slot < 53) hi1 |= 1 << (slot - 31);
            else if (slot < 84) lo2 |= 1 << (slot - 53);
            else if (slot < 106) hi2 |= 1 << (slot - 84);
            else tagBig = (tagBig ?? 0n) | (1n << BigInt(slot - 106));
          }
          tagM1 = hi1 * 0x80000000 + lo1;
          tagM2 = hi2 * 0x80000000 + lo2;
          if (tagBig !== undefined) {
            tagBig = (tagBig << 106n) | (BigInt(tagM2) << 53n) | BigInt(tagM1);
          }
        }
        tMap = extraCacheSet !== undefined
          ? (noLinks ? extraCacheSet.taggedNoLinks : extraCacheSet.tagged)
          : (noLinks ? this.taggedNoLinksCache : this.taggedCache);
        tBucket = tMap.get(stat);
        if (tBucket !== undefined) {
          if (tagBig === undefined) {
            if (tagM2 === 0) {
              const cached = tBucket.m1.get(tagM1);
              if (cached !== undefined) {
                if (PERF_SLABS.active) PERF_SLABS.statCacheHits++;
                return cached;
              }
            } else if (tBucket.m2 !== undefined) {
              const cached = tBucket.m2.get(tagM2)?.get(tagM1);
              if (cached !== undefined) {
                if (PERF_SLABS.active) PERF_SLABS.statCacheHits++;
                return cached;
              }
            }
          } else if (tBucket.big !== undefined) {
            const cached = tBucket.big.get(tagBig);
            if (cached !== undefined) {
              if (PERF_SLABS.active) PERF_SLABS.statCacheHits++;
              return cached;
            }
          }
        }
      }
    }

    if (PERF_SLABS.active) PERF_SLABS.statUncachedWalks++;
    const def = STAT_DEFS[stat];
    const base = baseValue ?? this.baseOverrides.get(stat) ?? def?.base ?? 0;
    let flat = 0, increased = 0, moreMult = 1;
    let override: number | undefined;
    let link0: Modifier | undefined;
    let link0Val = 0;
    let moreLinks: { m: Modifier; v: number }[] | undefined;

    // Fold sources, then skill-local extras in the original order, without
    // allocating an apply closure on every uncached stat read.
    const sourceMods = this.sourceModsFor(stat);
    const extraMods = extraIdx !== undefined ? extraIdx.byStat.get(stat) : extra;
    for (let phase = 0; phase < 2; phase++) {
      const mods = phase === 0 ? sourceMods : extraMods;
      if (!mods || mods.length === 0) continue;
      const prefiltered = phase === 0 || extraIdx !== undefined;
      const condMask = this.conditionMask;
      modifier: for (let mi = 0; mi < mods.length; mi++) {
        const m = mods[mi];
        if (!prefiltered && m.stat !== stat) continue;
        if (m.when !== undefined && (condMask & COND_BIT[m.when]) === 0) continue;
        if (m.unless !== undefined && (condMask & COND_BIT[m.unless]) !== 0) continue;
        const mTags = m.tags;
        if (mTags !== undefined && mTags.length > 0) {
          if (!contextTags) continue;
          for (let ti = 0; ti < mTags.length; ti++) {
            if (!contextTags.has(mTags[ti])) continue modifier;
          }
        }
        // Gauge-scaled modifiers ride a live quantity (status stacks, charge
        // counts) — a zero gauge is an inert modifier.
        let v = m.value;
        if (m.gauge !== undefined) {
          if (this.gaugesDeferred) {
            this.gaugesDeferred = false;
            this.syncGaugesHook?.();
          }
          const g = this.gauges.get(m.gauge) ?? 0;
          // THE GAUGE GATE (Modifier.gaugeAt): a threshold, not a scale —
          // the full value at or above the line, nothing below it.
          if (m.gaugeAt !== undefined) {
            if (g < m.gaugeAt) continue;
          } else {
            if (g === 0) continue;
            v *= g;
          }
        }
        if (reductionsOnly && v >= 0) continue;
        switch (m.kind) {
          case 'flat': flat += v; break;
          case 'increased': increased += v; break;
          case 'more': moreMult *= 1 + v; break;
          case 'override': override = v; break;
          case 'link':
            if (!noLinks && m.fromStat) {
              if (link0 === undefined) {
                link0 = m;
                link0Val = v;
              } else {
                (moreLinks ??= []).push({ m, v });
              }
            }
            break;
        }
      }
    }

    // STAT LINKS: each siphon adds ratio × the source's baseline into the
    // BASE layer (before increased/more), read with the same context and
    // skill-local extras so a skill-scoped link sees its skill's world.
    if (link0 !== undefined) {
      let src0 = this.compute(link0.fromStat!, contextTags, extra, undefined, true);
      if (link0.fromOffset !== undefined) src0 -= link0.fromOffset;
      if (link0.minFrom !== undefined) src0 = Math.max(link0.minFrom, src0);
      if (link0.linkTarget === 'increased') increased += link0Val * src0;
      else flat += link0Val * src0;
      if (moreLinks !== undefined) {
        for (let li = 0; li < moreLinks.length; li++) {
          const { m: l, v: lv } = moreLinks[li];
          let src = this.compute(l.fromStat!, contextTags, extra, undefined, true);
          if (l.fromOffset !== undefined) src -= l.fromOffset;
          if (l.minFrom !== undefined) src = Math.max(l.minFrom, src);
          if (l.linkTarget === 'increased') increased += lv * src;
          else flat += lv * src;
        }
      }
    }

    // STAT TRADES, the GAIN side (see STAT_TRADES): grants mirror links —
    // base-layer join, baseline source read. The baseline is PRE-FORGO
    // (noLinks disables the forgo below too), so a full forgo still
    // converts the whole pool: Iron-Reflexes math, by construction.
    if (!noLinks) {
      const toTrades = trades.byTo.get(stat);
      if (toTrades !== undefined) {
        for (let i = 0; i < toTrades.length; i++) {
          const t = toTrades[i];
          const rate = this.compute(t.rateStat, contextTags, extra);
          if (rate <= 0) continue;
          flat += rate * this.compute(t.from, contextTags, extra, undefined, true);
        }
      }
    }

    let value = override !== undefined ? override : (base + flat) * (1 + increased) * moreMult;
    // STAT TRADES, the FORGO side: the source keeps 1 − forgone. Applied to
    // the FINAL fold (after increased/more — renouncing means renouncing
    // the investments too), before the registry clamps.
    if (!noLinks) {
      const fromTrades = trades.byFrom.get(stat);
      if (fromTrades !== undefined) {
        for (let i = 0; i < fromTrades.length; i++) {
          const t = fromTrades[i];
          const forgone = this.compute(t.forgoStat, contextTags, extra);
          if (forgone > 0) value *= Math.max(0, 1 - Math.min(1, forgone));
        }
      }
      // USURPED HOST lane: minionDamageForgone strips only the bonus scaling
      // above 1.0 from minions, while links read the pre-forgo baseline (noLinks=true).
      if (stat === 'minionDamage' && value > 1) {
        const mf = this.compute('minionDamageForgone', contextTags, extra);
        if (mf > 0) value = 1 + (value - 1) * Math.max(0, 1 - Math.min(1, mf));
      }
    }
    if (def) {
      if (def.min !== undefined) value = Math.max(def.min, value);
      if (def.max !== undefined) value = Math.min(def.max, value);
    }
    if (cacheable) {
      if (uCache !== undefined) {
        uCache.set(stat, value);
      } else if (tMap !== undefined) {
        if (tBucket === undefined) {
          tBucket = tMap.get(stat);
          if (tBucket === undefined) {
            tBucket = { m1: new Map() };
            tMap.set(stat, tBucket);
          }
        }
        if (tagBig === undefined) {
          if (tagM2 === 0) {
            tBucket.m1.set(tagM1, value);
          } else {
            let m2Map = tBucket.m2;
            if (m2Map === undefined) tBucket.m2 = m2Map = new Map();
            let inner = m2Map.get(tagM2);
            if (inner === undefined) m2Map.set(tagM2, inner = new Map());
            inner.set(tagM1, value);
          }
        } else {
          let bigMap = tBucket.big;
          if (bigMap === undefined) tBucket.big = bigMap = new Map();
          bigMap.set(tagBig, value);
        }
      }
    }
    return value;
  }
}

// ---------------------------------------------------------------------------
// Attributes — fully data-driven. Each point of an attribute grants the
// listed modifiers. Adding a new attribute (or changing what one does) is a
// pure data edit; the character sheet and allocation UI pick it up
// automatically.
//
// TEN attributes in three triads plus one universal:
//   RAW FORCE   — strength, dexterity, intelligence (how hard you swing)
//   EXECUTION   — prowess, finesse, wisdom (how well you wield it)
//   RESILIENCE  — fortitude, charisma, willpower (what you weather:
//                 armor/poise, evasion/insight, energy shield/resistance)
//   LIFE        — vitality (ubiquitous; deliberately NOT a tree start)
// Declaration order below IS the display order: each raw attribute is
// followed by its execution and resilience siblings.
// ---------------------------------------------------------------------------

export type AttributeId =
  | 'strength' | 'prowess' | 'fortitude'
  | 'dexterity' | 'finesse' | 'charisma'
  | 'intelligence' | 'wisdom' | 'willpower'
  | 'vitality';

/** The triad axes — UI grouping/theming only; mechanics live in perPoint. */
export type AttributeGroup = 'force' | 'execution' | 'resilience' | 'life';

// --- Sheet blurbs & layout ---------------------------------------------------
// The character sheet's ORGANIZATION lives in data/sheet.ts — tab categories,
// per-stat seats, vitals, generated-family seats, and the one-line blurb per
// stat (assigned into StatDef.desc there; UI reads STAT_DEFS[id].desc — one
// registry, any surface). ATTRIBUTES carry NO blurbs at all — their tooltips
// derive LIVE from perPoint modifiers, so what Strength grants is always
// exactly what Strength grants. balance/probe_sheet.ts audits the weave.

export interface AttributeDef {
  label: string;
  short: string;
  description: string;
  group: AttributeGroup;
  perPoint: Modifier[];
}

export const ATTRIBUTES: Record<AttributeId, AttributeDef> = {
  // --- The STRENGTH triad ---------------------------------------------------
  strength: {
    label: 'Strength', short: 'STR', group: 'force',
    description: '+2 life, +1 melee damage per 4 pts, 0.5% increased melee damage',
    perPoint: [
      mod('life', 'flat', 2),
      mod('addedPhysical', 'flat', 0.25, ['melee']),
      mod('damage', 'increased', 0.005, ['melee']),
    ],
  },
  prowess: {
    label: 'Prowess', short: 'PRW', group: 'execution',
    description: '0.4% increased attack speed, 0.6% increased poise damage, +0.2% crit multiplier',
    perPoint: [
      mod('attackSpeed', 'increased', 0.004, ['attack']),
      mod('poiseDamage', 'increased', 0.006),
      mod('critMulti', 'flat', 0.002),
    ],
  },
  fortitude: {
    label: 'Fortitude', short: 'FOR', group: 'resilience',
    // Attributes SCALE the signature pools, never seed them: the flat base
    // must come from gear, passives, or a stance — with none, 1% of zero
    // is honestly zero. (The everything-investable ladder, kept: the pool
    // itself is the investment; the attribute is the multiplier.)
    description: '+4 armor, 1% increased poise, 0.2% increased weight',
    perPoint: [
      mod('armor', 'flat', 4),
      mod('poise', 'increased', 0.01),
      mod('weight', 'increased', 0.002),
    ],
  },

  // --- The DEXTERITY triad --------------------------------------------------
  dexterity: {
    label: 'Dexterity', short: 'DEX', group: 'force',
    description: '+4 accuracy, +2 evasion, 0.4% increased attack & projectile damage',
    perPoint: [
      mod('accuracy', 'flat', 4),
      mod('evasion', 'flat', 2),
      mod('damage', 'increased', 0.004, ['projectile', 'attack']),
    ],
  },
  finesse: {
    label: 'Finesse', short: 'FIN', group: 'execution',
    description: '+0.05% crit chance, +0.3% ailment chance, 0.4% increased ailment magnitude',
    perPoint: [
      mod('critChance', 'flat', 0.0005),
      mod('statusChance', 'flat', 0.003),
      mod('statusMagnitude', 'increased', 0.004),
    ],
  },
  charisma: {
    label: 'Charisma', short: 'CHA', group: 'resilience',
    description: '+3 evasion, 1% increased insight',
    perPoint: [
      mod('evasion', 'flat', 3),
      mod('insight', 'increased', 0.01),
    ],
  },

  // --- The INTELLIGENCE triad -----------------------------------------------
  intelligence: {
    label: 'Intelligence', short: 'INT', group: 'force',
    description: '+3 mana, 0.6% increased spell damage, +0.08% spell crit chance',
    perPoint: [
      mod('mana', 'flat', 3),
      mod('damage', 'increased', 0.006, ['spell']),
      mod('critChance', 'flat', 0.0008, ['spell']),
    ],
  },
  wisdom: {
    label: 'Wisdom', short: 'WIS', group: 'execution',
    description: '+0.12 mana regen, 0.8% minion damage, 0.5% effect duration, 0.3% cast speed',
    perPoint: [
      mod('manaRegen', 'flat', 0.12),
      mod('minionDamage', 'increased', 0.008),
      mod('effectDuration', 'increased', 0.005),
      mod('castSpeed', 'increased', 0.003),
    ],
  },
  willpower: {
    label: 'Willpower', short: 'WIL', group: 'resilience',
    description: '1% increased energy shield, +1 mana, +0.15% all resistances',
    perPoint: [
      mod('energyShield', 'increased', 0.01),
      mod('mana', 'flat', 1),
      mod('fireRes', 'flat', 0.0015),
      mod('coldRes', 'flat', 0.0015),
      mod('lightningRes', 'flat', 0.0015),
      mod('chaosRes', 'flat', 0.0015),
    ],
  },

  // --- LIFE -------------------------------------------------------------------
  vitality: {
    label: 'Vitality', short: 'VIT', group: 'life',
    description: '+6 life, +0.15 life regen/s',
    perPoint: [
      mod('life', 'flat', 6),
      mod('lifeRegen', 'flat', 0.15),
    ],
  },
};

export const ATTRIBUTE_IDS = Object.keys(ATTRIBUTES) as AttributeId[];

/** One TRIAD of the attribute registry: the raw-force attribute that OPENS
 *  it plus its execution/resilience siblings, in declaration order. */
export interface AttributeTriad {
  /** The triad's raw attribute (group 'force') — its stable id. */
  lead: AttributeId;
  /** The triad whole, lead first (declaration order). */
  members: AttributeId[];
}

/** THE TRIADS, DERIVED (skill-items charter M3 — the Preformed Memory's
 *  facet grain, walk-2 ruled): the registry's own declaration order IS the
 *  grouping — each 'force' attribute opens a triad and its 'execution' /
 *  'resilience' siblings follow it; 'life' (vitality, universal) stands
 *  outside every triad. Derived live from ATTRIBUTES so an attribute edit
 *  flows through (THE LIVE-REGISTRY MANDATE) — never a hardcoded list. */
export const ATTRIBUTE_TRIADS: readonly AttributeTriad[] = (() => {
  const out: AttributeTriad[] = [];
  for (const id of Object.keys(ATTRIBUTES) as AttributeId[]) {
    const g = ATTRIBUTES[id].group;
    if (g === 'life') continue;
    if (g === 'force') out.push({ lead: id, members: [id] });
    else out[out.length - 1]?.members.push(id);
  }
  return out;
})();

/** Is this open stat name a registered ATTRIBUTE id? Gear/vestige mod lines
 *  may grant attributes (+12 Strength); those lines route through the one
 *  Actor.setAttributes artery, never the StatSheet — this guard is how the
 *  seams (recalcSeat, the item validator) tell the two apart. */
export function isAttributeId(stat: string): stat is AttributeId {
  return stat in ATTRIBUTES;
}

export type Attributes = Record<AttributeId, number>;

/** Expand an attribute spread into the flat modifier list it grants. */
export function attributeModifiers(attrs: Attributes): Modifier[] {
  const out: Modifier[] = [];
  for (const id of ATTRIBUTE_IDS) {
    const pts = attrs[id];
    if (!pts) continue;
    for (const m of ATTRIBUTES[id].perPoint) {
      out.push({ ...m, value: m.value * pts });
    }
  }
  return out;
}
