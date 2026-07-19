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

/** Tags describe what a skill / damage context *is*. Add freely. */
export type SkillTag =
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
  | 'physical' | 'fire' | 'cold' | 'lightning' | 'chaos';

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
  | 'hasEs' | 'fullEs' | 'lowEs' | 'guarding'
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
  | 'comboVaried' | 'comboRepeated';

export interface Modifier {
  stat: string;
  kind: ModKind;
  value: number;
  /** kind 'link' only: the SOURCE stat siphoned from — the grant is
   *  value × the source's links-disabled baseline. */
  fromStat?: string;
  /** Scale `value` by a live GAUGE — a numeric quantity the actor samples
   *  each frame ('status:poison' = own stacks, 'charge:fury' = banked
   *  count). "2% increased damage per poison stack on you" is
   *  gaugeMod('damage','increased',0.02,'status:poison'). GOLDEN RULES:
   *  gauges are integer, event-driven quantities (stacks, charges) — never
   *  per-frame floats (cache health) and never stat queries (no loops);
   *  every gauge is bounded by its own cap (maxStacks, chargeCap). */
  gauge?: string;
  /** If present, the modifier only applies when the query context contains ALL of these tags. */
  tags?: SkillTag[];
  /** If present, the modifier only applies while the actor satisfies this condition. */
  when?: ConditionId;
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

/** GAUGE-SCALED modifier: `value` multiplies by the live gauge each query —
 *  gaugeMod('damageTaken','increased',0.02,'status:poison') is "2%
 *  increased damage taken per stack of poison on you". */
export function gaugeMod(stat: string, kind: ModKind, value: number, gauge: string, tags?: SkillTag[], when?: ConditionId): Modifier {
  return { stat, kind, value, gauge, tags, when };
}

// ---------------------------------------------------------------------------
// Stat registry. Defines defaults + display metadata. New stats are added
// here and immediately usable by any modifier in any data file.
// ---------------------------------------------------------------------------

export interface StatDef {
  label: string;
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
  /** Generic damage multiplier bucket — always queried with context tags. */
  damage:         { label: 'Damage', base: 1, min: 0 },
  // Flat added damage buckets (also tag-filtered, e.g. "adds fire damage to attacks").
  addedPhysical:  { label: 'Added Physical Damage', base: 0 },
  addedFire:      { label: 'Added Fire Damage', base: 0 },
  addedCold:      { label: 'Added Cold Damage', base: 0 },
  addedLightning: { label: 'Added Lightning Damage', base: 0 },
  addedChaos:     { label: 'Added Chaos Damage', base: 0 },

  // Defense
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
  /** Fraction of a blocked hit actually STOPPED (base 1 = the classic full
   *  block; below 1 the remainder lands as chip damage — bosses can carry
   *  high block chance with low power and stay pressureable). */
  blockPower:     { label: 'Block Power', base: 1, min: 0, max: 1, percent: true },
  /** FLAT damage a block eats before blockPower's fraction (the WoW-style
   *  block VALUE) — the two lanes scale independently: flat mitigation on
   *  a chance, and percentage mitigation on a chance. */
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
  /** Multiplier on healing the actor GIVES (heal effects, siphons, tree
   *  bursts) — the healer's damage stat. Tag-filtered like damage, so
   *  "increased healing with channelled skills" is a modifier away. */
  healPower:      { label: 'Healing Power', base: 1, min: 0 },
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
  lifeRegenToEs:  { label: 'Life Regen to Energy Shield', base: 0, min: 0, max: 1, percent: true },
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

  // Stat-granted parry (Perfect Timing support — any guard skill)
  /** Parry window in seconds granted to guard skills lacking their own. */
  guardParry:     { label: 'Parry Window', base: 0 },
  /** Riposte multiplier on parried damage. */
  guardParryPower:{ label: 'Parry Power', base: 1.5 },

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
  /** Flat cost adders — a support's teeth on cheap skills (Mana Feeder). */
  addedManaCost:  { label: 'Added Mana Cost', base: 0, min: 0 },
  addedLifeCost:  { label: 'Added Life Cost', base: 0, min: 0 },
  // RESOURCE-AS-DAMAGE: flat damage per point of resource ACTUALLY PAID on
  // the use (the paid cost travels with the cast — echoes/totems pay nothing
  // and earn nothing). Typed pro-rata over the skill's own base damage, so
  // it converts like everything else. One stat per payable lane.
  costDamage_mana:{ label: 'Damage per Mana Spent', base: 0, min: 0 },
  costDamage_life:{ label: 'Damage per Life Spent', base: 0, min: 0 },

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
  /** Multiplier on the THREAT this actor's damage books on the victim's
   *  chart (world.resolveHit): loud styles goad monsters onto themselves,
   *  quiet hands slip down the ledger. Only `prefer: 'highestThreat'`
   *  brains — and grafted event swarms — read the chart, so this is an
   *  attention lever, never a damage one. */
  threatGen:      { label: 'Threat Generation', base: 1, min: 0 },
  /** > 0: constructs this actor spawns TAUNT (Actor.taunt decoys) — the
   *  Beckoning gem's lane (spawnConstruct reads it per-skill). */
  constructTaunt: { label: 'Constructs Taunt', base: 0 },
  /** > 0: enemies will not see or deliberately target this actor at all
   *  (area effects and projectiles still connect geometrically). */
  invisible:      { label: 'Invisible', base: 0 },
  /** Range at which THIS actor notices enemies (per-monster `detection`
   *  multiplier varies it: zombies shamble, blood mites sense you afar). */
  detectionRange: { label: 'Detection Range', base: 520, min: 50 },
  // AI COGNITION (BehaviorSpec, brain.ts): the aim knobs read through the
  // sheet with the brain's spec value as the innate base, so curses, auras
  // and ground can bend an enemy's MIND the way they bend its body.
  /** Intercept fraction a casting mind leads its shots by (negative trails). */
  aiAimLead:      { label: 'Aim Leading', base: 0, min: -2, max: 2 },
  /** Aim scatter (radians) rolled onto every cast's bearing. */
  aiAimJitter:    { label: 'Aim Scatter', base: 0, min: 0 },

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
  /** THE PLY FABRIC (engine/plies.ts): flat extra plies on plied minions.
   *  Quanta — rounded at the bake, never batch-scaled. */
  minionPlies:    { label: 'Minion Plies', base: 0, min: 0 },
  /** Seconds a slain minion clings to unlife after death effects fire. */
  minionUndying:  { label: 'Minion Undying Duration', base: 0 },
};

// Damage conversion stats: convert_<from>_<to> = fraction of <from> damage
// dealt as <to> instead. Total conversion per source type caps at 100%.
// Usable by supports, passives, or skill leveling alike.
for (const from of DAMAGE_TYPES) {
  for (const to of DAMAGE_TYPES) {
    if (from === to) continue;
    STAT_DEFS[`convert_${from}_${to}`] = {
      label: `${from[0].toUpperCase()}${from.slice(1)} Converted to ${to[0].toUpperCase()}${to.slice(1)}`,
      base: 0, min: 0, max: 1, percent: true,
    };
  }
}

export function conversionStat(from: DamageType, to: DamageType): string {
  return `convert_${from}_${to}`;
}

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

export class StatSheet {
  private sources = new Map<string, Modifier[]>();
  private baseOverrides = new Map<string, number>();
  private cache = new Map<string, number>();
  /** Active actor-state conditions (lowLife, fullEs...). */
  private conditions = new Set<ConditionId>();
  private conditionKey = '';
  /** Live GAUGES (status stacks, charge counts) gauge-scaled mods read.
   *  Integer, event-driven quantities only — see Modifier.gauge. */
  private gauges = new Map<string, number>();
  private gaugeKey = '';

  /** Which ConditionIds any registered modifier DEMANDS (`when:`), cached
   *  lazily and invalidated on source change. Lets systems whose upkeep
   *  should be null-cost until referenced (the combo grammar's cast ring)
   *  ask "does anything on this sheet even care?" without scanning mods
   *  per frame. Skill-local `extra` mods are NOT visible here — callers
   *  with instance-level consumers scan those themselves. */
  private whenRefs: Set<ConditionId> | null = null;

  /** Replace the active condition set (cache clears only on real change). */
  setConditions(active: ConditionId[]): void {
    const key = active.slice().sort().join(',');
    if (key === this.conditionKey) return;
    this.conditionKey = key;
    this.conditions = new Set(active);
    this.cache.clear();
  }

  hasCondition(id: ConditionId): boolean { return this.conditions.has(id); }

  /** Does any registered (sheet-level) modifier condition on `id`? */
  usesCondition(id: ConditionId): boolean {
    if (!this.whenRefs) {
      const refs = new Set<ConditionId>();
      for (const mods of this.sources.values()) {
        for (const m of mods) if (m.when) refs.add(m.when);
      }
      this.whenRefs = refs;
    }
    return this.whenRefs.has(id);
  }

  /** Replace the live gauge set (cache clears only on real change — keep
   *  gauges INTEGER and event-driven or the cache churns every frame). */
  setGauges(entries: [string, number][]): void {
    const key = entries.map(([k, v]) => k + ':' + v).sort().join('|');
    if (key === this.gaugeKey) return;
    this.gaugeKey = key;
    this.gauges = new Map(entries);
    this.cache.clear();
  }

  gauge(id: string): number { return this.gauges.get(id) ?? 0; }

  /** Add or replace a named bundle of modifiers (e.g. 'class', 'buff:warcry'). */
  setSource(name: string, mods: Modifier[]): void {
    this.sources.set(name, mods);
    this.cache.clear();
    this.whenRefs = null;
  }

  removeSource(name: string): void {
    if (this.sources.delete(name)) {
      this.cache.clear();
      this.whenRefs = null;
    }
  }

  hasSource(name: string): boolean { return this.sources.has(name); }

  sourceNames(): string[] { return [...this.sources.keys()]; }

  getSourceMods(name: string): Modifier[] | undefined { return this.sources.get(name); }

  /** Override a stat's base value (used by monster definitions). */
  setBase(stat: string, value: number): void {
    this.baseOverrides.set(stat, value);
    this.cache.clear();
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
    extra?: readonly Modifier[], baseValue?: number, noLinks = false,
  ): number {
    const key = (noLinks ? '§' : '') + (contextTags && contextTags.size
      ? stat + '|' + [...contextTags].sort().join(',')
      : stat);
    const cacheable = (!extra || !extra.length) && baseValue === undefined;
    if (cacheable) {
      const cached = this.cache.get(key);
      if (cached !== undefined) return cached;
    }

    const def = STAT_DEFS[stat];
    let base = baseValue ?? this.baseOverrides.get(stat) ?? def?.base ?? 0;
    let flat = 0, increased = 0, moreMult = 1;
    let override: number | undefined;
    let links: Modifier[] | undefined;

    const apply = (m: Modifier): void => {
      if (m.stat !== stat) return;
      if (m.when && !this.conditions.has(m.when)) return;
      if (m.tags && m.tags.length) {
        if (!contextTags) return;
        for (const t of m.tags) if (!contextTags.has(t)) return;
      }
      // Gauge-scaled modifiers ride a live quantity (status stacks, charge
      // counts) — a zero gauge is an inert modifier.
      let v = m.value;
      if (m.gauge) {
        const g = this.gauges.get(m.gauge) ?? 0;
        if (g === 0) return;
        v *= g;
      }
      switch (m.kind) {
        case 'flat': flat += v; break;
        case 'increased': increased += v; break;
        case 'more': moreMult *= 1 + v; break;
        case 'override': override = v; break;
        case 'link':
          if (!noLinks && m.fromStat) (links ??= []).push({ ...m, value: v });
          break;
      }
    };
    for (const mods of this.sources.values()) for (const m of mods) apply(m);
    if (extra) for (const m of extra) apply(m);

    // STAT LINKS: each siphon adds ratio × the source's baseline into the
    // BASE layer (before increased/more), read with the same context and
    // skill-local extras so a skill-scoped link sees its skill's world.
    if (links) {
      for (const l of links) {
        flat += l.value * this.compute(l.fromStat!, contextTags, extra, undefined, true);
      }
    }

    // STAT TRADES, the GAIN side (see STAT_TRADES): grants mirror links —
    // base-layer join, baseline source read. The baseline is PRE-FORGO
    // (noLinks disables the forgo below too), so a full forgo still
    // converts the whole pool: Iron-Reflexes math, by construction.
    if (!noLinks) {
      for (const t of STAT_TRADES) {
        if (t.to !== stat) continue;
        const rate = this.compute(t.rateStat, contextTags, extra);
        if (rate <= 0) continue;
        flat += rate * this.compute(t.from, contextTags, extra, undefined, true);
      }
    }

    let value = override !== undefined ? override : (base + flat) * (1 + increased) * moreMult;
    // STAT TRADES, the FORGO side: the source keeps 1 − forgone. Applied to
    // the FINAL fold (after increased/more — renouncing means renouncing
    // the investments too), before the registry clamps.
    if (!noLinks) {
      for (const t of STAT_TRADES) {
        if (t.from !== stat) continue;
        const forgone = this.compute(t.forgoStat, contextTags, extra);
        if (forgone > 0) value *= Math.max(0, 1 - Math.min(1, forgone));
      }
    }
    if (def) {
      if (def.min !== undefined) value = Math.max(def.min, value);
      if (def.max !== undefined) value = Math.min(def.max, value);
    }
    if (cacheable) this.cache.set(key, value);
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
