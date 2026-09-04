// ---------------------------------------------------------------------------
// The damage pipeline. One path for everyone — player, monsters, minions.
//
//   roll base damage (per type)  ->  add flat "added X damage" (tag-filtered)
//   ->  scale by the tag-filtered `damage` multiplier  ->  crit roll
//   ->  defender: evasion entropy (attacks), block, then the MITIGATION
//       LADDER: armor (physical) / capped resistances (elements)
//       -> damage-taken multiplier -> insight (momentum avoidance)
//       -> poise (break-bar reduction) -> ledger skim -> the soak chain
//       (ward / absorb / energy shield / mana shield / stagger) -> life.
//
// Every rung is a stat or a DEFENSE_CFG rule — the ladder itself is fixed
// order, but every number on it is investable, debuffable, and per-actor.
// ---------------------------------------------------------------------------

import { dominantTypeOf } from './bodyVoices'; // THE HIT TINT — the landing stamps the blow's type
import { chance, clamp, rand } from '../core/math';
import {
  DAMAGE_TYPES, addedDamageStat, conversionStat,
  type DamageType, type Modifier, type SkillTag,
} from './stats';
import { DEFENSE_CFG } from './defense';
import { plyFloorOf } from './plies';
import type { Actor } from './actor';
import { instanceInnateMods, instanceMods, skillContextTags, type SkillInstance } from './skills';
import { STATUS_DEFS, TAUNT_CFG } from './status';
import { feedWound, stampSegFlash } from './segments';
import { SIM_TAP } from './tap';

/** THE SLAYER LANE's fold rules (stats.ts: overmatch / giantsbane / regicide
 *  — attacker-side MORE multipliers keyed off what the victim is RELATIVE to
 *  you — plus limbreaver, keyed off WHERE the victim sits on its creature:
 *  anchored composite parts). One config, one fold site (mitigateTyped),
 *  every source mitigated identically — never a per-skill special case. */
export const SLAYER_CFG = {
  /** giantsbane arms when victim effectiveWeight ≥ this × the attacker's. */
  giantsbaneRatio: 1.5,
  /** regicide arms against these Actor.rarity classes. */
  regicideRarities: ['magic', 'rare', 'champion', 'crowned'] as readonly string[],
  /** quailbane arms below this NERVE (engine/pack.ts — 1 steady, 0
   *  breaking). Set at the band where the craven's collapse posture has
   *  become unmistakable, so the bonus is live exactly while the body is
   *  visibly showing it: the tell IS the tooltip. */
  quailAt: 0.5,
} as const;

export interface DamagePacket {
  amounts: Partial<Record<DamageType, number>>;
  crit: boolean;
  /** Where the damage dice landed, 0..1 from range floor to ceiling —
   *  averaged across the hit's live ranges, each weighted by its expected
   *  contribution (so a spark's wide die dominates a trinket's sliver).
   *  Undefined when nothing actually rolled (flat-only or degenerate
   *  ranges): no dice, no gambling. Read by the rollTop gates (procs /
   *  cast-on-high-roll triggers); visible to the sim tap via the packet. */
  rollT?: number;
  tags: Set<SkillTag>;
  sourceName: string;
  /** The rolling instance's SKILL-LOCAL mods, carried so attacker-side
   *  hit reactions (leech, ward-leech) see gems and skill levels — not
   *  just global sources. */
  extra?: Modifier[];
}

/**
 * Apply the caster's convert_<from>_<to> stats to a typed amounts map IN
 * PLACE (post-scaling; total conversion per source type caps at 100%).
 * The ONE conversion path — hit rolls, tether beams, aura auras: anything
 * typed honours the same schema, so a build's conversions apply everywhere
 * a player would expect them to.
 */
export function applyConversion(
  caster: Actor, amounts: Partial<Record<DamageType, number>>,
  tags: Set<SkillTag>, extra?: Modifier[],
): void {
  for (const from of DAMAGE_TYPES) {
    const amt = amounts[from];
    if (!amt) continue;
    let remaining = 1;
    for (const to of DAMAGE_TYPES) {
      if (to === from || remaining <= 0) continue;
      const frac = caster.sheet.get(conversionStat(from, to), tags, extra);
      if (frac <= 0) continue;
      const f = Math.min(remaining, frac);
      remaining -= f;
      amounts[to] = (amounts[to] ?? 0) + amt * f;
    }
    if (remaining < 1) {
      if (remaining <= 0.0001) delete amounts[from];
      else amounts[from] = amt * remaining;
    }
  }
}

/**
 * HOW A LIVE RANGE RESOLVES inside the damage pipeline. `rollSkillDamage`
 * passes a dice-rolling picker; the tooltip's `skillDamageBands` passes
 * "take the floor" and "take the ceiling". Everything downstream of the
 * pick — added damage, the tag-scoped multiplier, thorns, dominion,
 * conversion — is arithmetic both callers run IDENTICALLY, which is the
 * whole point: a displayed number cannot drift from the dealt one without
 * breaking the deal too. (Post-pick the pipeline is monotonic in the pick,
 * so feeding it lo and hi yields exactly the band the roll lands inside.)
 */
type RangePick = (lo: number, hi: number) => number;

/** Everything a hit needs that is NOT the roll: the shared reads both the
 *  roller and the preview fold over. */
interface DamageContext {
  extra: Modifier[];
  baseTags: Set<SkillTag>;
  /** The victim-scope tags folded into baseTags (and into every per-type
   *  context the fold builds), when the hit site supplied them. */
  vsTags?: readonly SkillTag[];
  effectiveness: number;
}

function damageContext(caster: Actor, inst: SkillInstance, vsTags?: readonly SkillTag[]): DamageContext {
  const extra = instanceMods(inst);
  // THE STANCE BROADCAST (the Guarded Casting lane): a cast fired through a
  // HELD GUARD folds the stance's own 'guarding'-scoped authored rows —
  // runeward's spell blessing lives on its instance, invisible to bare
  // reads. Scoped rows only: an unscoped innate stays the stance's own
  // (its bash carries it), and socket mods never cross instances (the
  // no-second-copy law). A stance rolling its OWN payload already carries
  // its mods once.
  const cs = caster.casting;
  if (cs?.mode === 'guard' && cs.inst !== inst) {
    for (const m of instanceInnateMods(cs.inst)) {
      if (m.when === 'guarding') extra.push(m);
    }
  }
  return {
    extra,
    // THE VICTIM SCOPE (engine/victim.ts): the struck body's live state
    // rides the roll's context as 'vs:' tags, so every read below — and
    // every downstream read through packet.tags — can be scoped to the
    // victim by an ordinary tag filter. Absent (previews, victim-blind
    // rolls) the context is exactly the skill's own.
    baseTags: skillContextTags(inst.def, vsTags as SkillTag[] | undefined),
    vsTags,
    effectiveness: inst.def.addedEffectiveness ?? 1,
  };
}

/**
 * THE ONE DAMAGE FOLD: base ranges resolved by `pick`, then added damage,
 * the tag-filtered multiplier, the thorns rider, dominion and conversion.
 * Crit is NOT applied here — the roller rolls it, the preview reports its
 * chance and multiplier as their own rows.
 */
function foldSkillDamage(
  caster: Actor, inst: SkillInstance, ctx: DamageContext,
  pick: RangePick, flatBonus?: Partial<Record<DamageType, number>>,
): Partial<Record<DamageType, number>> {
  const def = inst.def;
  const { extra, baseTags, effectiveness, vsTags } = ctx;
  const amounts: Partial<Record<DamageType, number>> = {};
  for (const type of DAMAGE_TYPES) {
    // Context for this damage type = skill tags + the type itself (+ the
    // victim scope when the hit site supplied it), so "increased fire
    // damage" applies to the fire portion only.
    const tags = skillContextTags(def, vsTags ? [type, ...vsTags] : [type]);
    let base = flatBonus?.[type] ?? 0;
    // MIN/MAX added (the D2 lane) stretches the roll's ends independently
    // — max-only investment is the wide-variance thunder, min-only the
    // steady floor. A skill with no base range grows one from them.
    const range = def.baseDamage?.[type];
    const minAdd = caster.sheet.get(`addedMin_${type}`, tags, extra) * effectiveness;
    const maxAdd = caster.sheet.get(`addedMax_${type}`, tags, extra) * effectiveness;
    if (range || minAdd > 0 || maxAdd > 0) {
      let lo = (range?.[0] ?? 0) + minAdd;
      let hi = Math.max(lo, (range?.[1] ?? 0) + maxAdd);
      // DICE WIDTH (damageSpread): stretch (or, negative, squeeze) the
      // range around its midpoint — same mean, fatter tails. The
      // high-roller's fuel; the floor never dips below zero.
      const spread = caster.sheet.get('damageSpread', tags, extra);
      if (spread !== 0 && hi > lo) {
        const mid = (lo + hi) / 2;
        const half = ((hi - lo) / 2) * Math.max(0, 1 + spread);
        lo = Math.max(0, mid - half);
        hi = mid + half;
      }
      base += pick(lo, hi);
    }
    const added = caster.sheet.get(addedDamageStat(type), tags, extra) * effectiveness;
    const total = (base + added) * caster.sheet.get('damage', tags, extra);
    if (total > 0) amounts[type] = total;
  }

  // Bristling Riposte (thornsToHit): a fraction of the wearer's flat
  // thorns rides the hit as added physical — the spikes swing with you.
  const spikes = caster.sheet.get('thornsToHit', baseTags, extra);
  if (spikes > 0) {
    const th = caster.sheet.get('thorns');
    if (th > 0) {
      amounts.physical = (amounts.physical ?? 0)
        + th * spikes * caster.sheet.get('damage', skillContextTags(def, ['physical']), extra);
    }
  }

  // DOMINION (reservedDamage / maxManaDamage): locked and maximum mana
  // feed the roll, pro-rata over the rolled types — a zero-damage utility
  // skill stays zero (the artery needs a vein).
  const dominion = caster.sheet.get('reservedDamage', baseTags, extra) * caster.reservedMana
    + caster.sheet.get('maxManaDamage', baseTags, extra) * caster.sheet.get('mana');
  if (dominion > 0) {
    const cur = (Object.values(amounts) as number[]).reduce((s, v) => s + v, 0);
    if (cur > 0) {
      const scale = (cur + dominion) / cur;
      for (const t of Object.keys(amounts) as DamageType[]) amounts[t]! *= scale;
    }
  }

  applyConversion(caster, amounts, baseTags, extra);
  return amounts;
}

/**
 * Roll a skill's outgoing damage from the caster's stats plus the skill
 * instance's local modifiers (skill level growth + socketed supports).
 * `flatBonus` injects situational base damage (corpse life fractions,
 * consumed bleed payloads) that still scales with damage modifiers.
 */
export function rollSkillDamage(
  caster: Actor, inst: SkillInstance,
  flatBonus?: Partial<Record<DamageType, number>>,
  vsTags?: readonly SkillTag[],
): DamagePacket {
  const def = inst.def;
  const ctx = damageContext(caster, inst, vsTags);
  const { extra, baseTags } = ctx;

  // LUCKY / UNLUCKY rolls: a made lucky roll doubles the dice and keeps
  // the HIGHER; unlucky (usually inflicted — the jinxed) keeps the LOWER.
  // Both at once cancel out. Rolled once per use, applied to every range.
  const lucky = chance(caster.sheet.get('luckyChance', baseTags, extra));
  const unlucky = chance(caster.sheet.get('unluckyChance', baseTags, extra));
  // ROLL FRACTION: track where each live range's roll landed. Weighted by
  // the range's MIDPOINT (its expected contribution), never by the roll
  // itself — weighting by the outcome would bias the fraction upward.
  let rollAcc = 0, rollWeight = 0;
  const rollRange: RangePick = (lo, hi) => {
    let r = rand(lo, hi);
    if (lucky !== unlucky) {
      const second = rand(lo, hi);
      r = lucky ? Math.max(r, second) : Math.min(r, second);
    }
    if (hi > lo) {
      const mid = (lo + hi) / 2;
      rollAcc += ((r - lo) / (hi - lo)) * mid;
      rollWeight += mid;
    }
    return r;
  };

  const amounts = foldSkillDamage(caster, inst, ctx, rollRange, flatBonus);

  let crit = false;
  if (Object.keys(amounts).length) {
    crit = chance(caster.sheet.get('critChance', baseTags, extra));
    if (crit) {
      const multi = caster.sheet.get('critMulti', baseTags, extra);
      for (const t of Object.keys(amounts) as DamageType[]) amounts[t]! *= multi;
    }
  }
  return {
    amounts, crit, tags: baseTags, sourceName: def.name, extra,
    rollT: rollWeight > 0 ? rollAcc / rollWeight : undefined,
  };
}

/** One damage type's resolved spread, before any target-side defense. */
export interface DamageBand { lo: number; hi: number }

/** What a skill hits for RIGHT NOW, read off the live sheet: the same fold
 *  the roller runs, resolved at each range's floor and ceiling instead of
 *  at the dice. Crit rides alongside as its own odds rather than baked in,
 *  because a tooltip that silently averages the crit in is the kind of
 *  number a player cannot reconcile with what they see on screen. */
export interface SkillDamagePreview {
  /** Per damage type, post-conversion, pre-mitigation. */
  bands: Partial<Record<DamageType, DamageBand>>;
  total: DamageBand;
  critChance: number;
  critMulti: number;
}

/**
 * THE PREVIEW READ (engine/skillPreview.ts's damage half; probe
 * balance/probe_skillpreview.ts pins every rolled hit inside this band).
 * Never rolls, never touches the rng — safe to call from a hover, a HUD
 * sweep, or the sim, as often as a panel likes.
 */
export function skillDamageBands(
  caster: Actor, inst: SkillInstance,
  flatBonus?: Partial<Record<DamageType, number>>,
): SkillDamagePreview {
  const ctx = damageContext(caster, inst);
  const loAmounts = foldSkillDamage(caster, inst, ctx, (lo) => lo, flatBonus);
  const hiAmounts = foldSkillDamage(caster, inst, ctx, (_lo, hi) => hi, flatBonus);
  const bands: Partial<Record<DamageType, DamageBand>> = {};
  const total: DamageBand = { lo: 0, hi: 0 };
  for (const type of DAMAGE_TYPES) {
    const lo = loAmounts[type] ?? 0;
    const hi = hiAmounts[type] ?? 0;
    if (lo <= 0 && hi <= 0) continue;
    bands[type] = { lo, hi };
    total.lo += lo;
    total.hi += hi;
  }
  return {
    bands, total,
    critChance: caster.sheet.get('critChance', ctx.baseTags, ctx.extra),
    critMulti: caster.sheet.get('critMulti', ctx.baseTags, ctx.extra),
  };
}

export interface HitResult {
  evaded: boolean;
  immune: boolean;
  /** Met by the passive blockChance stat — the guard ate the wound up to
   *  its VALUE; `total` carries whatever seeped past (0 = blocked cold). */
  blocked: boolean;
  total: number;
  crit: boolean;
  /** THE PLY FABRIC ate this hit whole — one ply tore, no life moved
   *  (engine/plies.ts; the world reads it for feedback, never for math). */
  plyEaten?: boolean;
  /** This hit SHATTERED the target's poise bar (the world prints it). */
  poiseBroke?: boolean;
  /** This hit EXECUTED via the attacker's cullThreshold (the world prints it). */
  culled?: boolean;
  /** This hit's life cut was FLATTENED by the victim's hitCap stat — the
   *  world prints it, so a capped blow never masquerades as full work. */
  clamped?: boolean;
}

const RES_STAT: Record<DamageType, string | null> = {
  physical: null,
  fire: 'fireRes',
  cold: 'coldRes',
  lightning: 'lightningRes',
  chaos: 'chaosRes',
};

/**
 * The EFFECTIVE resistance against a damage type: the raw (uncapped,
 * overcap-friendly) resistance stat, clamped by the per-element SOFT-CAP
 * stat (<elem>ResMax, base 75%, investable), itself ceilinged by the
 * absolute hard cap — so no entity ever becomes immune to a damage type.
 * THE one read every consumer goes through (mitigation, UI, world effects).
 *
 * With an attacker present, their tag-filtered PENETRATION applies AFTER
 * the caps (pen digs below the cap, floored at cfg.resistance.floor) —
 * the counter to resistance stacking that never re-opens immunity.
 */
export function resistValue(
  target: Actor, type: DamageType,
  pen?: { attacker: Actor; tags?: Set<SkillTag>; extra?: Modifier[] },
): number {
  const stat = RES_STAT[type];
  if (!stat) return 0;
  const cap = Math.min(target.sheet.get(stat + 'Max'), DEFENSE_CFG.resistance.hardCap);
  let res = Math.min(target.sheet.get(stat), cap);
  if (pen) {
    const p = pen.attacker.sheet.get(type + 'Pen', pen.tags, pen.extra);
    if (p > 0) res = Math.max(DEFENSE_CFG.resistance.floor, res - p);
  }
  return res;
}

/** Attacker context threaded into mitigation so victim pools can honour
 *  attacker-side stats (poiseDamage) — absent for caster-less sources. */
export interface MitigateOpts {
  attacker?: Actor;
  tags?: Set<SkillTag>;
  extra?: Modifier[];
  /** Out-params: poiseBroke when this bundle broke the victim's poise;
   *  clamped when the victim's hitCap flattened the life cut. */
  out?: { poiseBroke?: boolean; clamped?: boolean };
}

/**
 * Defender-side mitigation for a typed damage bundle: armor (physical),
 * capped resistances (elements), the damage-taken multiplier, then INSIGHT
 * (the momentum-fed avoidance pool), POISE (the break-bar), the ledger skim,
 * and the soak chain (ward / absorption / energy / mana shields). Returns the
 * LIFE damage that lands — the caller subtracts it from target.life. Shared
 * by applyHit AND caster-less area damage (death-bursts, environmental
 * blasts) so EVERY source is mitigated identically — there is no "true damage".
 *
 * Internally TWO halves composed in order: mitigateWound (pure — sizes the
 * wound) then mitigatePools (mutating — the pools pay). The passive block's
 * guard needs the halves separately: it prices the wound BEFORE any pool
 * spends, so a cold block stays a true refusal (see applyHitCore).
 */
export function mitigateTyped(
  target: Actor, amounts: Partial<Record<DamageType, number>>,
  opts?: MitigateOpts,
): number {
  return mitigatePools(target, mitigateWound(target, amounts, opts), opts);
}

/** The PURE half of mitigation: armor/resists per type, the slayer lane,
 *  and the damage-taken multiplier — everything that decides how big the
 *  WOUND is before any pool pays. No rng, no state writes: safe to call
 *  as a preview (the passive block prices its guard against exactly this
 *  number), then the pools half spends against what it returned. */
function mitigateWound(
  target: Actor, amounts: Partial<Record<DamageType, number>>,
  opts?: MitigateOpts,
): number {
  const pen = opts?.attacker
    ? { attacker: opts.attacker, tags: opts.tags, extra: opts.extra } : undefined;
  let total = 0;
  for (const type of Object.keys(amounts) as DamageType[]) {
    let dmg = amounts[type]!;
    if (dmg <= 0) continue;
    if (type === 'physical') {
      // PoE-shaped armor: hyperbolic, UNCAPPED — small hits bounce off high
      // armor, huge hits punch through proportionally. Self-limiting (< 100%),
      // so no clamp ever flattens investment (DEFENSE_CFG.armor). The
      // attacker's armorPen shears a fraction of the plate off first.
      let armor = target.sheet.get('armor');
      if (pen) armor *= 1 - pen.attacker.sheet.get('armorPen', pen.tags, pen.extra);
      dmg *= 1 - armor / (armor + DEFENSE_CFG.armor.k * dmg);
    } else {
      dmg *= 1 - resistValue(target, type, pen);
    }
    total += dmg;
  }
  // THE SLAYER LANE (stats.ts): attacker-side punch-up MORE multipliers,
  // armed by what the victim is relative to the attacker — level above,
  // far heavier (the mass fabric's own read), or empowered rarity. Read
  // tag-queried like every attacker stat here, so "overmatch with axes"
  // stays a filter; base 0 ⇒ the whole block is a no-op until invested.
  if (total > 0 && opts?.attacker) {
    const atk = opts.attacker;
    if (target.level > atk.level) {
      const v = atk.sheet.get('overmatch', opts.tags, opts.extra);
      if (v > 0) total *= 1 + v;
    }
    const gb = atk.sheet.get('giantsbane', opts.tags, opts.extra);
    if (gb > 0 && target.effectiveWeight() >= atk.effectiveWeight() * SLAYER_CFG.giantsbaneRatio) {
      total *= 1 + gb;
    }
    if (target.rarity && SLAYER_CFG.regicideRarities.includes(target.rarity)) {
      const v = atk.sheet.get('regicide', opts.tags, opts.extra);
      if (v > 0) total *= 1 + v;
    }
    // The limb-hunter's axis: the victim IS an anchored composite part
    // (Actor.partLink) — the pavise board, the censer, the mounted archer.
    // Same lane law as the three above: base 0, folded here and only here.
    if (target.partLink) {
      const v = atk.sheet.get('limbreaver', opts.tags, opts.extra);
      if (v > 0) total *= 1 + v;
    }
    // The siege axis: the victim is a ROOTED body (Actor.stationary —
    // minted from a def that cannot walk: engines, spawner objects, idols,
    // planted totems). Same lane law: base 0, folded here and only here.
    if (target.stationary) {
      const v = atk.sheet.get('siegebreaker', opts.tags, opts.extra);
      if (v > 0) total *= 1 + v;
    }
    // THE SPENT axis (engine/reserves.ts): the victim has run its own
    // reservoir dry — a bellows mid-vent, a wick burned down. The first
    // axis in the lane keyed off a state the victim ENTERS AND LEAVES, so
    // it prices PATIENCE rather than a matchup. Same lane law: base 0,
    // folded here and only here, read off the one `spent` boolean the
    // tell fabric also draws (punished == advertised).
    if (target.spent) {
      const v = atk.sheet.get('spentbane', opts.tags, opts.extra);
      if (v > 0) total *= 1 + v;
    }
    // THE UPROOTED axis (engine/rooted.ts): the victim's power depends on
    // ground it is not currently standing on. Armed by DISPLACEMENT (the
    // mass fabric's shoves) or by DENIAL (kill the heart, the membrane
    // recoils, the whole court steps off at once). Bodies that wear no
    // rooted spec never arm it — rootedHeld is false on all of them, so
    // the claim check, not the flag, is what gates.
    if (target.rootedSpec && !target.rootedHeld) {
      const v = atk.sheet.get('uprooter', opts.tags, opts.extra);
      if (v > 0) total *= 1 + v;
    }
    // THE WARDED axis (engine/pack.ts): the victim stands in a living
    // warden's favor — the exact bond the pack layer DRAWS a line for.
    // Punished == advertised, in the strongest sense the lane has: the
    // condition is not merely visible on the victim, it is visible as a
    // rope running to the body you could kill instead. Two answers, one
    // read. Same lane law: base 0, folded here and only here, off the one
    // flag the bond scan sets.
    if (target.bondHeld) {
      const v = atk.sheet.get('bondbreaker', opts.tags, opts.extra);
      if (v > 0) total *= 1 + v;
    }
    // THE FALTERING axis (engine/pack.ts): the victim's nerve has frayed
    // past the threshold — wounds, odds, or a captain you already dropped.
    // Read off the SAME aiNerve the craven's collapsing posture draws, so
    // the window is announced by the body wearing it and priced here.
    if (target.aiNerve < SLAYER_CFG.quailAt) {
      const v = atk.sheet.get('quailbane', opts.tags, opts.extra);
      if (v > 0) total *= 1 + v;
    }
  }
  total *= target.sheet.get('damageTaken');
  return total;
}

/** The MUTATING half of mitigation: insight, poise, endurance, the ledger
 *  skim, the soak chain, and the hit ceiling — the pools that PAY, spending
 *  victim state as they go. One call per wound that actually presses
 *  through a defense (the whole hit, or the block's seeping excess). */
function mitigatePools(
  target: Actor, total: number, opts?: MitigateOpts,
): number {
  // INSIGHT (the Charisma pool): read the blow coming and slip the brunt —
  // up to insightDR × momentum of the damage is avoided by SPENDING the
  // pool (insightEfficiency damage per point). Momentum is 1 on the move
  // and tapers after stopping, so the protection is a rhythm, not a wall.
  if (total > 0 && target.insight > 0) {
    const momentum = target.insightMomentum();
    if (momentum > 0) {
      // The attacker's insightPen DENIES a fraction of the slip — the blow
      // too true to read (armorPen's rhythm-sibling). Since the pool only
      // spends what it actually avoided, piercing also spares the meter:
      // you beat the read, not the bank.
      const pierce = opts?.attacker
        ? Math.min(1, opts.attacker.sheet.get('insightPen', opts.tags, opts.extra)) : 0;
      const eff = target.sheet.get('insightEfficiency');
      const want = total * target.sheet.get('insightDR') * momentum * (1 - pierce);
      const avoided = Math.min(want, target.insight * eff);
      if (avoided > 0) {
        target.insight = Math.max(0, target.insight - avoided / eff);
        total -= avoided;
      }
    }
  }
  // POISE (the Fortitude bar): while unbroken its reduction WEARS WITH THE
  // BAR — full at a full bar, easing toward drFloor × DR at a sliver
  // (DEFENSE_CFG.poise.drFloor), so the protection erodes readably instead
  // of vanishing in one cliff. Every hit CHIPS it (drain honours the
  // attacker's poiseDamage stat); the break is still the moment worth
  // building around, both ways.
  const maxPoise = target.maxPoise();
  if (total > 0 && maxPoise > 0) {
    if (target.poise > 0 && !target.poiseBroken) {
      const f = DEFENSE_CFG.poise.drFloor;
      const wear = f + (1 - f) * Math.min(1, target.poise / maxPoise);
      total *= 1 - target.sheet.get('poiseDR') * wear;
    }
    const mult = opts?.attacker
      ? opts.attacker.sheet.get('poiseDamage', opts.tags, opts.extra) : 1;
    const drain = (total * DEFENSE_CFG.poise.drainRatio + DEFENSE_CFG.poise.drainFlat) * mult;
    if (target.damagePoise(drain, opts?.attacker, opts?.tags, opts?.extra) && opts?.out) {
      opts.out.poiseBroke = true;
    }
  }
  // ENDURANCE (the break-less wall): while ANY of the pool holds, its flat
  // reduction applies and the pool SPENDS what it prevents — no wear curve,
  // no break status; present = protected, empty = nothing (the deliberate
  // contrast with poise). Innermost of the three pools: the deep reserve.
  if (total > 0 && target.endurance > 0) {
    const prevented = Math.min(
      total * target.sheet.get('enduranceDR'),
      target.endurance / DEFENSE_CFG.endurance.spendRatio);
    if (prevented > 0) {
      total -= prevented;
      target.endurance = Math.max(0, target.endurance - prevented * DEFENSE_CFG.endurance.spendRatio);
      target.enduranceDelay = target.sheet.get('enduranceRegenDelay');
    }
  }
  // THE LEDGER, damage lane (Arrears): a slice of every mitigated hit is
  // NOT taken now — it BANKS on the toggle's account (settled at the
  // lapse). Skimmed before the soak chain so ward/ES defer their share
  // too; DoT ticks never pass through here (already time-spread).
  for (const aura of target.activeAuras.values()) {
    const dv = aura.inst.def.delivery;
    const led = dv.type === 'aura' ? dv.ledger : undefined;
    if (!led || led.source !== 'damageTaken' || !aura.ledger || total <= 0) continue;
    const room = target.ledgerCap(led) - aura.ledger.balance;
    const skim = Math.max(0, Math.min(total * Math.min(1, led.rate), room));
    aura.ledger.balance += skim;
    total -= skim;
  }
  let landed = soakDamage(target, total, opts?.attacker
    ? { pen: { attacker: opts.attacker, tags: opts.tags, extra: opts.extra } }
    : undefined);
  // THE HIT CEILING (hitCap): a per-hit cap on the LIFE damage any single
  // mitigated packet may land — applied HERE, after the whole ladder, so
  // every hit that reaches life passes under it: applyHit swings and the
  // caster-less area lane (death-bursts, doodad lashes, minion beams)
  // alike. DoT ticks never enter mitigateTyped (applyDotCore soaks
  // directly), so attrition keeps full work by construction — the cap is
  // a defense TEXTURE with a counter-build, never an immunity. Poise and
  // the pools above still drained in full: only the life cut flattens.
  if (landed > 0) {
    const cap = target.sheet.get('hitCap');
    if (cap > 0 && landed > cap) {
      landed = cap;
      if (opts?.out) opts.out.clamped = true;
    }
  }
  return landed;
}

/** THE PLY GATE (engine/plies.ts), shared by the landed path and the block
 *  seep: a plied body EATS a landing wound whole — magnitude-blind, one ply
 *  (+ the attacker's plyRend, tag-queried) tears, NO life moves; sub-floor
 *  tickles thud (they tear nothing and wound nothing while plies remain).
 *  The last tear stamps the spec's 'worn open' status. Returns whether the
 *  plies ate the wound — the caller skips its life cut when they did. */
function plyEats(attacker: Actor, target: Actor, total: number, packet: DamagePacket): boolean {
  if (target.plies <= 0) return false;
  if (total >= plyFloorOf(target)) {
    const rend = Math.max(0, Math.floor(
      attacker.sheet.get('plyRend', packet.tags, packet.extra)));
    target.plies = Math.max(0, target.plies - 1 - rend);
    if (target.plies === 0 && target.plySpec?.spentStatus) {
      target.applyStatus(target.plySpec.spentStatus, 0, 1, 'plies');
    }
  }
  return true;
}

/**
 * THE LAST GASP (the talent fabric's cheat-death lane — stats lastGasp /
 * lastGaspLife / lastGaspCooldown, docs/engine/talents.md): the ONE seam a
 * life-pool wound passes through on its way to zero. A blow that would empty
 * the pool instead leaves the bearer at lastGaspLife of maximum, at lastGasp
 * chance, no more than once per lastGaspCooldown seconds (Actor.lastGaspCd,
 * ticked in updateTimers). The gasp raises a transient (Actor.gasped) the
 * world turns into the 'lastGasp' proc trigger — what answers the gasp is
 * data on the sheet. Both damage seams (hits, DoT ticks) land through here;
 * costs, sacrifices and scripted falls never do — those are not wounds.
 * Returns the life actually removed.
 */
export function landLifeDamage(target: Actor, total: number): number {
  if (total <= 0) return 0;
  if (total >= target.life && target.life > 0 && !target.dead && !target.invulnerable
    && target.lastGaspCd <= 0) {
    const gasp = target.sheet.get('lastGasp');
    if (gasp > 0 && chance(gasp)) {
      const stood = Math.max(1, target.maxLife() * target.sheet.get('lastGaspLife'));
      const removed = Math.max(0, target.life - stood);
      target.life = stood;
      target.lastGaspCd = target.sheet.get('lastGaspCooldown');
      target.gasped = true;
      return removed;
    }
  }
  target.life -= total;
  return total;
}

/** Apply a rolled packet to a defender. Returns what actually landed. */
export function applyHit(attacker: Actor, target: Actor, packet: DamagePacket): HitResult {
  const result = applyHitCore(attacker, target, packet);
  SIM_TAP.current?.onHit?.(attacker, target, result, packet);
  return result;
}

/** The actual hit pipeline. applyHit is its thin observed wrapper, so the sim
 *  tap sees EVERY exit — evade, immunity, block, and the landed wound alike. */
function applyHitCore(attacker: Actor, target: Actor, packet: DamagePacket): HitResult {
  // SEGMENT FABRIC: consume the collection-time contact latch up front —
  // whatever happens below (evade, block, land), the latch never goes
  // stale or misattributes a later, unrelated hit. Wound accounting and
  // the per-segment flash fire only where damage actually lands.
  const segHit = target.segHitPending;
  target.segHitPending = undefined;
  if (target.invulnerable) return { evaded: false, immune: true, blocked: false, total: 0, crit: false };
  // HIT IMMUNITY (Cerement's shroud): every incoming HIT — attack, spell,
  // projectile — is dodged outright while the stat holds. DoTs still tick
  // (applyDot never comes through here); the shroud's own price bleeds on.
  if (target.sheet.get('hitImmune') > 0) {
    return { evaded: true, immune: false, blocked: false, total: 0, crit: false };
  }
  // Attacks can be evaded; spells always connect. Evasion runs on ENTROPY,
  // not independent rolls: each attack adds its chance-to-hit to the
  // victim's accumulator and only a crossing of 1 lands (then pays 1 back).
  // A high-evasion victim slips the OPENING burst of a window in
  // succession, then hits begin to trickle through on schedule — and a
  // near-certain hit can still be "dodged" once early, never forever.
  // The accumulator re-seeds randomly after windowReset unattacked seconds
  // (Actor.updateTimers ticks the freshness clock down).
  if (packet.tags.has('attack')) {
    const acc = attacker.sheet.get('accuracy', packet.tags);
    const ev = target.sheet.get('evasion');
    const hitChance = clamp(acc / (acc + ev * DEFENSE_CFG.evasion.weight),
      DEFENSE_CFG.evasion.minHitChance, 1);
    if (target.evadeWindow <= 0) target.evadeEntropy = rand(0, 1);
    target.evadeWindow = DEFENSE_CFG.evasion.windowReset;
    target.evadeEntropy += hitChance;
    if (target.evadeEntropy < 1) {
      return { evaded: true, immune: false, blocked: false, total: 0, crit: false };
    }
    target.evadeEntropy -= 1;
  }
  // PASSIVE BLOCK — THE GUARD LAW (the WoW-style block VALUE): a made
  // block (blockChance) GUARDS a finite amount, it never voids the world.
  // The wound is sized first through the PURE half of mitigation (armor/
  // resists/slayer/damageTaken — no pool touched, no state spent), then
  // the guard eats up to its value:
  //   guard = (block.guardBase + block.guardPerLevel × level + blockValue)
  //           × guardStrength                      (DEFENSE_CFG.block)
  // A wound the guard covers is blocked COLD — no life, no pool spend, no
  // poise chip: byte-identical to the classic full stop, so the shield
  // identity survives for every small and middling hit. A HEAVIER wound
  // SEEPS the excess: the residue alone rides the pools half (insight /
  // poise / endurance / ledger / soak / hitCap) and then the ply gate, so
  // a blocked haymaker always accomplishes something. blockPower caps the
  // stoppable FRACTION of the wound (base 1; under it, that fraction
  // leaks however wide the guard); blockValue is the flat investment lane
  // on top of the level floor; guardStrength scales every guard the
  // wearer raises — passive block and the raised stance speak one
  // vocabulary, so a 'guarding'-scoped grant widens both while the wall
  // is up. A block always stops the hit's EFFECTS (statuses, knockback),
  // cold or seeping. A held stance's own kit joins the block reads
  // (Actor.stanceRead) — Shieldwall Doctrine's 'guarding'-scoped
  // chance/value live on the guard instance, never on the sheet.
  const bsc = target.stanceRead();
  if (chance(target.sheet.get('blockChance', bsc?.tags, bsc?.extra))) {
    const mo = { attacker, tags: packet.tags, extra: packet.extra };
    const wound = mitigateWound(target, packet.amounts, mo);
    const guard = (DEFENSE_CFG.block.guardBase
      + DEFENSE_CFG.block.guardPerLevel * target.level
      + target.sheet.get('blockValue', bsc?.tags, bsc?.extra))
      * target.sheet.get('guardStrength', bsc?.tags, bsc?.extra);
    const stopped = Math.min(
      wound * target.sheet.get('blockPower', bsc?.tags, bsc?.extra), guard);
    let leaked = Math.max(0, wound - stopped);
    if (leaked > 0) {
      const out: { poiseBroke?: boolean; clamped?: boolean } = {};
      leaked = mitigatePools(target, leaked, { ...mo, out });
      // The seep is a landing wound like any other: a plied body's ply
      // eats it whole — no life moves (the ply law holds through the
      // shield; the blow got past the rim, so the ply pays, not the bar).
      if (plyEats(attacker, target, leaked, packet)) {
        target.hitFlash = 0.12;
        target.hitFlashType = dominantTypeOf(packet.amounts);
        return { evaded: false, immune: false, blocked: true, total: 0,
          crit: false, poiseBroke: out.poiseBroke, plyEaten: true };
      }
      landLifeDamage(target, leaked);
      target.hitFlash = 0.1;
      target.hitFlashType = dominantTypeOf(packet.amounts);
      if (leaked > 0 && segHit !== undefined && segHit >= 0) {
        stampSegFlash(target, segHit);
        if (feedWound(target, segHit, leaked)) (target.segTears ??= []).push(segHit);
      }
      return { evaded: false, immune: false, blocked: true, total: leaked,
        crit: false, poiseBroke: out.poiseBroke, clamped: out.clamped };
    }
    return { evaded: false, immune: false, blocked: true, total: 0, crit: false };
  }

  // CRIT AVOIDANCE (victim-side): a made roll downgrades the crit to a
  // normal hit — the multiplier is unwound with the attacker's own query,
  // so what lands is exactly the uncritical roll.
  if (packet.crit && chance(target.sheet.get('critAvoid'))) {
    const multi = attacker.sheet.get('critMulti', packet.tags, packet.extra);
    if (multi > 1) {
      for (const t of Object.keys(packet.amounts) as DamageType[]) {
        packet.amounts[t]! /= multi;
      }
    }
    packet.crit = false;
  }

  // DAMAGE VS AFFLICTED (the generated damageVs_<status> family): the
  // attacker's per-stack multiplier against whatever already rides the
  // victim — "8% increased damage per poison stack on the target" is one
  // modifier. Bounded by each status's own stack cap (the golden rule).
  let vsMult = 1;
  for (const s of target.statuses) {
    const v = attacker.sheet.get('damageVs_' + s.id, packet.tags, packet.extra);
    if (v !== 0) vsMult *= 1 + v * s.stacks;
  }
  // TAUNTED ATTACKER (the challenge fabric): swinging at anyone who is NOT
  // your taunter lands weaker — the status's teeth on bearers whose
  // targeting can't be forced (the player's own hand) and on brains that
  // refuse to turn (ignoreTaunt bosses feel the pull even while they
  // shrug the retarget). Hits only, like the family it rides beside.
  const taunt = attacker.statuses.find(s => s.id === 'taunted');
  if (taunt?.casterId !== undefined && taunt.casterId !== target.id) {
    vsMult *= 1 - TAUNT_CFG.offTargetLess;
  }
  if (vsMult !== 1) {
    for (const t of Object.keys(packet.amounts) as DamageType[]) {
      packet.amounts[t]! *= vsMult;
    }
  }

  const out: { poiseBroke?: boolean; clamped?: boolean } = {};
  const total = mitigateTyped(target, packet.amounts,
    { attacker, tags: packet.tags, extra: packet.extra, out });
  // THE PLY GATE (plyEats above): runs AFTER mitigation so poise still
  // chips (poise-break stays honest counterplay) and AFTER evasion/block
  // (a dodge is a dodge; a cold block never reaches here, a seeping one
  // feeds the gate its residue inside the block branch).
  if (plyEats(attacker, target, total, packet)) {
    target.hitFlash = 0.12;
    target.hitFlashType = dominantTypeOf(packet.amounts); // THE HIT TINT
    return {
      evaded: false, immune: false, blocked: false, total: 0,
      crit: packet.crit, poiseBroke: out.poiseBroke, plyEaten: true,
    };
  }
  landLifeDamage(target, total);
  target.hitFlash = 0.15;
  target.hitFlashType = dominantTypeOf(packet.amounts); // THE HIT TINT (engine/bodyVoices.ts): the blow's type colors the body's flash
  // SEGMENT FABRIC: the landed blow marks the struck body — the coil that
  // took it flashes, and its wound pool drains by exactly what the shared
  // pool lost (one blow, one deduction, one attribution).
  if (total > 0 && segHit !== undefined && segHit >= 0) {
    stampSegFlash(target, segHit);
    if (feedWound(target, segHit, total)) (target.segTears ??= []).push(segHit);
  }

  // RECUPERATION (the stagger-heal): a fraction of what landed on LIFE
  // flows back over recuperateTime seconds — a restore stream, so
  // healTaken gates every sip and sear still bites it.
  if (total > 0) {
    const rec = target.sheet.get('recuperate');
    if (rec > 0) {
      const back = total * rec;
      target.restoreStreams.push({
        resource: 'life',
        perSec: back / target.sheet.get('recuperateTime'),
        remaining: back,
      });
    }
  }

  // CULLING STRIKE: a landed hit EXECUTES prey at or below the attacker's
  // cullThreshold fraction of max life — checked after the wound, so any
  // connecting hit that leaves them in the band finishes them.
  let culled = false;
  if (total > 0 && target.life > 0 && !target.invulnerable) {
    const cull = attacker.sheet.get('cullThreshold', packet.tags, packet.extra);
    if (cull > 0 && target.life <= target.maxLife() * cull) {
      target.life = 0;
      culled = true;
    }
  }

  // Sustain for the attacker — real HEALING, so healBy gates it (seared
  // attackers leech at half; the ceiling respects overdrive blood-debt).
  // packet.extra carries the SKILL-LOCAL mods, so a leech gem socketed in
  // the swinging skill counts — not just passives and global sources.
  if (total > 0 && !attacker.dead) {
    const onHit = attacker.sheet.get('lifeOnHit', packet.tags, packet.extra);
    const leech = attacker.sheet.get('lifeLeech', packet.tags, packet.extra) * total;
    attacker.healBy(onHit + leech);
    // WARD LEECH (Soulflay): a share of the hit crystallizes as the
    // decaying shell — gainWard is the one gate, so wardGain scales it.
    const wleech = attacker.sheet.get('wardLeech', packet.tags, packet.extra) * total;
    if (wleech > 0) attacker.gainWard(wleech);
    // The other pools' sustain lanes (completing the family): energy
    // shield on-hit/leech and mana leech, each capped by its own max.
    const esGain = attacker.sheet.get('esOnHit', packet.tags, packet.extra)
      + attacker.sheet.get('esLeech', packet.tags, packet.extra) * total;
    if (esGain > 0) attacker.gainEs(esGain);
    const mLeech = attacker.sheet.get('manaLeech', packet.tags, packet.extra) * total;
    if (mLeech > 0) {
      attacker.mana = Math.min(attacker.availableMaxMana(), attacker.mana + mLeech);
    }
    // POISE on hit (the fight-to-stay-armed lane): tag-queried like the
    // rest, flowing through gainPoise — it feeds a broken bar's climb and
    // may CREST past max when the striker carries poiseOvercharge.
    const pGain = attacker.sheet.get('poiseOnHit', packet.tags, packet.extra);
    if (pGain > 0) attacker.gainPoise(pGain);
  }
  return {
    evaded: false, immune: false, blocked: false, total, crit: packet.crit,
    poiseBroke: out.poiseBroke, culled, clamped: out.clamped,
  };
}

/** A wound contests the energy shield's recharge — THE one interruption
 *  gate. A recharge that is actively FLOWING may hold through it: the
 *  victim's esRechargeSteadfast stat is the chance the stream keeps
 *  running (the "recharge is not interrupted by damage" investment).
 *  Steadfastness guards only the stream — a wound during the WAITING
 *  period always restarts the wait; there is nothing to hold yet. */
function interruptEsRecharge(target: Actor): void {
  if (target.esRecharging && chance(target.sheet.get('esRechargeSteadfast'))) return;
  target.esDelay = target.sheet.get('esRechargeDelay');
}

/**
 * The layered-defense soak chain. Damage that reaches a defender chews
 * through, in order: WARD (the decaying pool — outermost because it is the
 * most transient), the ABSORPTION shield, the ENERGY shield, the MANA
 * shield split (a fraction paid from mana), and only then life — where the
 * staggerFrac stat may spread part of the wound over time instead. Any
 * damage taken — even fully absorbed — resets the energy shield's recharge
 * delay (unless a running recharge holds steadfast). Returns the life
 * damage that lands NOW.
 *
 * `esBypass` (DoT ticks): the fraction of what reaches the ES gate that
 * SEEPS PAST the shield to the layers beneath — 0 (baseline) treats ES as
 * a true second life pool that DoT drains; 1 is the full ghost-through
 * (grantable per element via the tag-filtered esDotBypass stat).
 * `delayOnDrainOnly` (DoT ticks): the recharge delay resets only when the
 * shield actually absorbs something — a fully-seeping DoT never wakes it.
 * The chain flags `target.esBroke` when it empties the shield (proc seam).
 */
function soakDamage(
  target: Actor, total: number,
  opts?: {
    esBypass?: number; delayOnDrainOnly?: boolean;
    /** Attacker context for the shred levers (HITS only — the DoT path
     *  deliberately passes none: afflictions seep, they don't shred). */
    pen?: { attacker: Actor; tags?: ReadonlySet<SkillTag>; extra?: readonly Modifier[] };
  },
): number {
  if (total <= 0) return total;
  if (!opts?.delayOnDrainOnly && target.sheet.get('energyShield') > 0) {
    interruptEsRecharge(target);
  }
  // 0) WARD — the decaying shield, spent before everything else.
  if (target.ward > 0) {
    const w = Math.min(target.ward, total);
    target.ward -= w;
    total -= w;
  }
  // 1) Absorption shield — the proactive buffer.
  if (target.absorb > 0) {
    const a = Math.min(target.absorb, total);
    target.absorb -= a;
    total -= a;
    if (target.absorb <= 0) {
      // Absorb-bound statuses shatter with the pool (Warded armor goes with it).
      for (let i = target.statuses.length - 1; i >= 0; i--) {
        const s = target.statuses[i];
        if (!STATUS_DEFS[s.id]?.boundToAbsorb) continue;
        target.statuses.splice(i, 1);
        target.sheet.removeSource('status:' + s.id);
      }
    }
  }
  // 2) Energy shield — a second life pool. A bypass fraction of what
  // arrives seeps past the gate (esDotBypass); the rest drains the shield.
  if (total > 0 && target.es > 0) {
    const bypass = Math.min(1, Math.max(0, opts?.esBypass ?? 0));
    // ES SHRED (the anti-ward lever): the attacker's esShred multiplies
    // shield drained per point of damage the shield soaks — above 1 the
    // pool strips faster AND each stripped point spends less of the blow.
    // At the base of 1 this is byte-identical to the classic drain.
    const shred = opts?.pen
      ? Math.max(0.25, opts.pen.attacker.sheet.get('esShred', opts.pen.tags, opts.pen.extra))
      : 1;
    const e = Math.min(target.es, total * (1 - bypass) * shred);
    if (e > 0) {
      const hadShield = target.es > 0.5;
      target.es -= e;
      total -= e / shred;
      if (opts?.delayOnDrainOnly) {
        interruptEsRecharge(target);
      }
      // The shield EMPTIED under this wound — the esBreak proc seam.
      if (hadShield && target.es <= 0.001) target.esBroke = true;
    }
  }
  // 3) Mana shield — a fraction of what remains is paid from mana.
  if (total > 0) {
    const frac = target.sheet.get('manaShield');
    if (frac > 0 && target.mana > 0) {
      const m = Math.min(target.mana, total * frac);
      target.mana -= m;
      total -= m;
    }
  }
  // 4) STAGGER (staggerFrac — Mortis Seal, blood-mage tech): a share of
  // what would land on LIFE spreads over the stagger window instead. The
  // banked pain drains in Actor.updateTimers — delayed, not forgiven.
  if (total > 0) {
    const sf = target.sheet.get('staggerFrac');
    if (sf > 0) {
      const spread = total * sf;
      target.staggerDamage(spread);
      total -= spread;
    }
  }
  return total;
}

/** Damage over time, bypassing the hit pipeline (no evasion, no block, no
 *  armor — the wound is already inside). Typed when the ticking status has
 *  a dotType, so element-tagged interactions apply:
 *
 *  - damageTaken is queried WITH the element tag ("10% reduced fire damage
 *    taken" slows burns too).
 *  - The energy shield is a true SECOND LIFE POOL: baseline, DoT drains it
 *    (waking its recharge delay only when it actually absorbs).
 *  - esDotResist: while any shield holds, DoT is reduced by that fraction —
 *    at 100% the shield shrugs DoT entirely (Still Mind's promise).
 *  - esDotBypass: that fraction SEEPS PAST the shield to what's beneath —
 *    tag-filterable, so "chaos DoT ghosts through energy shields" is one
 *    modifier, on an attacker's curse or a defender's keystone alike.
 *
 *  Insight and poise sit this out: they read attacks, not afflictions. */
export function applyDot(target: Actor, amount: number, type?: DamageType): number {
  const landed = applyDotCore(target, amount, type);
  SIM_TAP.current?.onDot?.(target, landed, type);
  return landed;
}

/** The actual DoT pipeline (applyDot is its thin observed wrapper). */
function applyDotCore(target: Actor, amount: number, type?: DamageType): number {
  if (target.invulnerable) return 0;
  const tags = type ? new Set<SkillTag>([type]) : undefined;
  let total = amount * target.sheet.get('damageTaken', tags);
  if (total <= 0) return 0;
  if (target.es > 0.5) {
    const resist = target.sheet.get('esDotResist', tags);
    if (resist > 0) total *= 1 - resist;
  }
  total = soakDamage(target, total, {
    esBypass: target.sheet.get('esDotBypass', tags),
    delayOnDrainOnly: true,
  });
  return landLifeDamage(target, total);
}
