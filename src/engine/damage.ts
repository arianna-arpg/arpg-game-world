// ---------------------------------------------------------------------------
// The damage pipeline. One path for everyone — player, monsters, minions.
//
//   roll base damage (per type)  ->  add flat "added X damage" (tag-filtered)
//   ->  scale by the tag-filtered `damage` multiplier  ->  crit roll
//   ->  defender: evasion check (attacks), armor (physical), resistances,
//       damage-taken multiplier.
// ---------------------------------------------------------------------------

import { chance, clamp, rand } from '../core/math';
import {
  DAMAGE_TYPES, addedDamageStat, conversionStat,
  type DamageType, type Modifier, type SkillTag,
} from './stats';
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
}

const RES_STAT: Record<DamageType, string | null> = {
  physical: null,
  fire: 'fireRes',
  cold: 'coldRes',
  lightning: 'lightningRes',
  chaos: 'chaosRes',
};

/**
 * Defender-side mitigation for a typed damage bundle: armor (physical),
 * resistances (elements), the damage-taken multiplier, then the soak chain
 * (absorption / energy / mana shields). Returns the LIFE damage that lands —
 * the caller subtracts it from target.life. Shared by applyHit AND caster-less
 * area damage (death-bursts, environmental blasts) so EVERY source is mitigated
 * identically by the defender's resistances/armor — there is no "true damage".
 */
export function mitigateTyped(target: Actor, amounts: Partial<Record<DamageType, number>>): number {
  let total = 0;
  for (const type of Object.keys(amounts) as DamageType[]) {
    let dmg = amounts[type]!;
    if (dmg <= 0) continue;
    if (type === 'physical') {
      const armor = target.sheet.get('armor');
      const reduction = Math.min(0.9, armor / (armor + 6 * dmg));
      dmg *= 1 - reduction;
    } else {
      const res = RES_STAT[type];
      if (res) dmg *= 1 - target.sheet.get(res);
    }
    total += dmg;
  }
  total *= target.sheet.get('damageTaken');
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
  // Attacks can be evaded; spells always connect.
  if (packet.tags.has('attack')) {
    const acc = attacker.sheet.get('accuracy', packet.tags);
    const ev = target.sheet.get('evasion');
    const hitChance = clamp(acc / (acc + ev * 0.3), 0.2, 1);
    if (!chance(hitChance)) return { evaded: true, immune: false, blocked: false, total: 0, crit: false };
  }
  // Passive block: a flat chance to stop ANY hit cold. Independent of (and
  // checked after) evasion; nothing to do with the Guard stance.
  if (chance(target.sheet.get('blockChance'))) {
    return { evaded: false, immune: false, blocked: true, total: 0, crit: false };
  }

  const total = mitigateTyped(target, packet.amounts);
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
  }
  return { evaded: false, immune: false, blocked: false, total, crit: packet.crit };
}

/**
 * The layered-defense soak chain. Damage that reaches a defender chews
 * through, in order: WARD (the decaying pool — outermost because it is the
 * most transient), the ABSORPTION shield, the ENERGY shield, the MANA
 * shield split (a fraction paid from mana), and only then life — where the
 * staggerFrac stat may spread part of the wound over time instead. Any
 * damage taken — even fully absorbed — resets the energy shield's recharge
 * delay. Returns the life damage that lands NOW.
 */
function soakDamage(target: Actor, total: number): number {
  if (total <= 0) return total;
  if (target.sheet.get('energyShield') > 0) {
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
  // 2) Energy shield.
  if (total > 0 && target.es > 0) {
    const e = Math.min(target.es, total);
    target.es -= e;
    total -= e;
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

/** Untyped damage that bypasses the hit pipeline (DoT ticks). */
export function applyDot(target: Actor, amount: number): number {
  if (target.invulnerable) return 0;
  let total = amount * target.sheet.get('damageTaken');
  total = soakDamage(target, total);
  target.life -= total;
  return total;
}
