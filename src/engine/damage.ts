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

import { chance, clamp, rand } from '../core/math';
import {
  DAMAGE_TYPES, addedDamageStat, conversionStat,
  type DamageType, type Modifier, type SkillTag,
} from './stats';
import { DEFENSE_CFG } from './defense';
import type { Actor } from './actor';
import { instanceMods, skillContextTags, type SkillInstance } from './skills';
import { STATUS_DEFS } from './status';

export interface DamagePacket {
  amounts: Partial<Record<DamageType, number>>;
  crit: boolean;
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
 * Roll a skill's outgoing damage from the caster's stats plus the skill
 * instance's local modifiers (skill level growth + socketed supports).
 * `flatBonus` injects situational base damage (corpse life fractions,
 * consumed bleed payloads) that still scales with damage modifiers.
 */
export function rollSkillDamage(
  caster: Actor, inst: SkillInstance,
  flatBonus?: Partial<Record<DamageType, number>>,
): DamagePacket {
  const def = inst.def;
  const extra = instanceMods(inst);
  const baseTags = skillContextTags(def);
  const effectiveness = def.addedEffectiveness ?? 1;
  const amounts: Partial<Record<DamageType, number>> = {};

  for (const type of DAMAGE_TYPES) {
    // Context for this damage type = skill tags + the type itself,
    // so "increased fire damage" applies to the fire portion only.
    const tags = skillContextTags(def, [type]);
    let base = flatBonus?.[type] ?? 0;
    const range = def.baseDamage?.[type];
    if (range) base += rand(range[0], range[1]);
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

  applyConversion(caster, amounts, baseTags, extra);

  let crit = false;
  if (Object.keys(amounts).length) {
    crit = chance(caster.sheet.get('critChance', baseTags, extra));
    if (crit) {
      const multi = caster.sheet.get('critMulti', baseTags, extra);
      for (const t of Object.keys(amounts) as DamageType[]) amounts[t]! *= multi;
    }
  }
  return { amounts, crit, tags: baseTags, sourceName: def.name, extra };
}

export interface HitResult {
  evaded: boolean;
  immune: boolean;
  /** Stopped flat by the passive blockChance stat. */
  blocked: boolean;
  total: number;
  crit: boolean;
  /** This hit SHATTERED the target's poise bar (the world prints it). */
  poiseBroke?: boolean;
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
  /** Out-param: set when this bundle broke the victim's poise. */
  out?: { poiseBroke?: boolean };
}

/**
 * Defender-side mitigation for a typed damage bundle: armor (physical),
 * capped resistances (elements), the damage-taken multiplier, then INSIGHT
 * (the momentum-fed avoidance pool), POISE (the break-bar), the ledger skim,
 * and the soak chain (ward / absorption / energy / mana shields). Returns the
 * LIFE damage that lands — the caller subtracts it from target.life. Shared
 * by applyHit AND caster-less area damage (death-bursts, environmental
 * blasts) so EVERY source is mitigated identically — there is no "true damage".
 */
export function mitigateTyped(
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
  total *= target.sheet.get('damageTaken');
  // INSIGHT (the Charisma pool): read the blow coming and slip the brunt —
  // up to insightDR × momentum of the damage is avoided by SPENDING the
  // pool (insightEfficiency damage per point). Momentum is 1 on the move
  // and tapers after stopping, so the protection is a rhythm, not a wall.
  if (total > 0 && target.insight > 0) {
    const momentum = target.insightMomentum();
    if (momentum > 0) {
      const eff = target.sheet.get('insightEfficiency');
      const want = total * target.sheet.get('insightDR') * momentum;
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
  return soakDamage(target, total);
}

/** Apply a rolled packet to a defender. Returns what actually landed. */
export function applyHit(attacker: Actor, target: Actor, packet: DamagePacket): HitResult {
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
  // Passive block: a flat chance to intercept ANY hit. blockPower is the
  // FRACTION actually stopped (base 1 = the classic full stop); anything
  // under 1 leaks through as mitigated CHIP damage — but a block always
  // stops the hit's effects (statuses, knockback), full or not.
  if (chance(target.sheet.get('blockChance'))) {
    const stop = target.sheet.get('blockPower');
    let leaked = 0;
    if (stop < 0.999) {
      const chip: Partial<Record<DamageType, number>> = {};
      for (const t of Object.keys(packet.amounts) as DamageType[]) {
        chip[t] = packet.amounts[t]! * (1 - stop);
      }
      leaked = mitigateTyped(target, chip,
        { attacker, tags: packet.tags, extra: packet.extra });
      target.life -= leaked;
      target.hitFlash = 0.1;
    }
    return { evaded: false, immune: false, blocked: true, total: leaked, crit: false };
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
  if (vsMult !== 1) {
    for (const t of Object.keys(packet.amounts) as DamageType[]) {
      packet.amounts[t]! *= vsMult;
    }
  }

  const out: { poiseBroke?: boolean } = {};
  const total = mitigateTyped(target, packet.amounts,
    { attacker, tags: packet.tags, extra: packet.extra, out });
  target.life -= total;
  target.hitFlash = 0.15;

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
    if (esGain > 0) attacker.es = Math.min(attacker.maxEs(), attacker.es + esGain);
    const mLeech = attacker.sheet.get('manaLeech', packet.tags, packet.extra) * total;
    if (mLeech > 0) {
      attacker.mana = Math.min(attacker.availableMaxMana(), attacker.mana + mLeech);
    }
  }
  return {
    evaded: false, immune: false, blocked: false, total, crit: packet.crit,
    poiseBroke: out.poiseBroke,
  };
}

/**
 * The layered-defense soak chain. Damage that reaches a defender chews
 * through, in order: WARD (the decaying pool — outermost because it is the
 * most transient), the ABSORPTION shield, the ENERGY shield, the MANA
 * shield split (a fraction paid from mana), and only then life — where the
 * staggerFrac stat may spread part of the wound over time instead. Any
 * damage taken — even fully absorbed — resets the energy shield's recharge
 * delay. Returns the life damage that lands NOW.
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
  opts?: { esBypass?: number; delayOnDrainOnly?: boolean },
): number {
  if (total <= 0) return total;
  if (!opts?.delayOnDrainOnly && target.sheet.get('energyShield') > 0) {
    target.esDelay = target.sheet.get('esRechargeDelay');
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
    const e = Math.min(target.es, total * (1 - bypass));
    if (e > 0) {
      const hadShield = target.es > 0.5;
      target.es -= e;
      total -= e;
      if (opts?.delayOnDrainOnly) {
        target.esDelay = target.sheet.get('esRechargeDelay');
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
  target.life -= total;
  return total;
}
