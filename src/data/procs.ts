// ---------------------------------------------------------------------------
// PROC REGISTRY — triggered effects.
//
// A proc is a chance-based extra that fires on a trigger. The CHANCE is an
// ordinary stat named `proc_<id>` (base 0), which means any support gem,
// passive node, buff, or class innate can grant or scale a proc with a
// normal tag-filtered modifier:
//
//     mod('proc_brutal_strike', 'flat', 0.25, ['melee'])
//
// ...is "melee skills have 25% chance to trigger Brutal Strike".
//
// GOLDEN RULES (the anti-exploit constitution — engine-enforced):
//  1. Procs never trigger procs. Proc'd hits execute at depth 1, and every
//     roll site is depth-0-gated — no loops, no chains, no machine guns.
//  2. Chance is capped at 95% per roll; a per-proc `icd` (internal cooldown,
//     seconds) hard-limits frequency however many sources stack the chance.
//  3. DEFENSIVE triggers (block / evade / esBreak / poiseBroken) roll on the
//     DEFENDER's GLOBAL sheet — passives, buffs, worn equipMods — never on
//     the attacker's skill context.
//  4. 'burst' payloads scale from a caster-less BASELINE (flat + perLevel),
//     never from a skill's rolled damage — a proc can't double-dip a crit.
//  5. Heals flow through Actor.healBy (healTaken gates them like any heal);
//     restores respect their pool maxima.
//
// To add a proc: register it here, then grant `proc_<id>` chance from any
// modifier source. No engine changes needed.
// ---------------------------------------------------------------------------

import { mod } from '../engine/stats';
import type { DamageType } from '../engine/stats';
import type { BuffEffect } from '../engine/skills';

export type ProcEffect =
  /** Repeats the hit on the same target at a damage scale. */
  | { type: 'extraHit'; damageScale: number }
  /** The hit echoes as an explosion around the target, re-rolling the
   *  skill's damage at a scale against everything in the radius. */
  | { type: 'explosion'; damageScale: number; radius: number }
  /** Shoves the struck target. Signed force: + pushes it away from the
   *  caster, − pulls it toward the caster (a magnetic yank). */
  | { type: 'displace'; force: number }
  /** Deals damage to the entity whose displacement was arrested by a wall/void —
   *  the "knockback that hurts on impact" effect (Phase-3 collision trigger). */
  | { type: 'collisionDamage'; damageScale: number }
  /** Banks a combo charge on the proc's OWNER (Frenzy on bleed). */
  | { type: 'gainCharge'; charge: string; amount: number; max: number }
  /** Grants the proc's OWNER a buff (Tempo stacks on hit; a temporary
   *  life-regen surge on bleed — flat and increased mods both work). */
  | { type: 'buff'; buff: BuffEffect }
  /** SUMMONS a minion beside the struck target (Forgebound's animated
   *  weapon — the hit itself does the conscripting). Capped per caster. */
  | { type: 'summon'; monsterId: string; duration: number; max: number }
  /** HEALS the proc's OWNER — flat and/or a fraction of max life (through
   *  healBy, so healTaken gates it like every heal). */
  | { type: 'heal'; flat?: number; pctMax?: number }
  /** Restores mana or energy shield on the proc's OWNER. */
  | { type: 'restore'; resource: 'mana' | 'es'; flat?: number; pctMax?: number }
  /** A typed BURST around the proc's OWNER: baseline-scaled damage
   *  (flat + perLevel × owner level), mitigated per victim like any typed
   *  source — never derived from a skill roll (golden rule 4). */
  | { type: 'burst'; damage: DamageType; base: number; perLevel: number; radius: number }
  /** A TELEGRAPHED burst that lands after `delay` seconds at the struck
   *  point ('target') or the owner ('self') — optionally damaging enemies
   *  (baseline-scaled) AND healing allies in the same circle (through each
   *  ally's healBy). The "radiant explosion 0.5s after contact" shape. */
  | {
      type: 'delayedBurst'; delay: number; radius: number; at: 'target' | 'self';
      damage?: { type: DamageType; base: number; perLevel: number };
      healAllies?: { base: number; perLevel: number };
    }
  /** FORTIFY: bank endurance on the proc's OWNER (Actor.gainEndurance —
   *  a 0-max sheet banks nothing; the pool is the investment). */
  | { type: 'fortify'; flat?: number; pctMaxLife?: number }
  /** Tick every running cooldown on the proc's OWNER down by `seconds`
   *  (the on-kill rhythm classic). */
  | { type: 'cooldown'; seconds: number };

export interface ProcDef {
  id: string;
  name: string;
  /** Shown as floating text + flash color when the proc fires. */
  color: string;
  /** When the proc rolls:
   *   'hit'             any damaging hit you land
   *   'kill'            a hit of yours that slays
   *   'collision'       a knockback you dealt, arrested by a wall or void
   *   'statusApply'     you apply a status (see `status` filter)
   *   'block'           you block a hit (passive block)
   *   'evade'           you evade an attack
   *   'esBreak'         your energy shield is emptied
   *   'poiseBreakDealt' your hit breaks an enemy's poise bar
   *   'poiseBroken'     your own poise bar breaks */
  trigger: 'hit' | 'kill' | 'collision' | 'statusApply'
    | 'block' | 'evade' | 'esBreak' | 'poiseBreakDealt' | 'poiseBroken';
  /** statusApply only: fires when one of THESE statuses lands (omit = any). */
  status?: string | string[];
  /** SKILL GATE: the proc only rolls for these skill ids — "Sanctified
   *  Strike has a chance to..." lives on the proc, so ANY grantor (passive,
   *  gem, affix) is automatically skill-scoped. Omit = every skill. */
  skills?: string[];
  /** ONCE PER CAST: at most one firing per world tick per owner — a
   *  multi-target swing's simultaneous contacts count as ONE trigger
   *  (hits that resolve on later frames, like a piercing arrow's second
   *  victim, are distinct contacts). Omit = rolls per target struck. */
  oncePerCast?: true;
  /** INTERNAL COOLDOWN, seconds — the hard frequency limit no amount of
   *  stacked chance can beat (golden rule 2). */
  icd?: number;
  effect: ProcEffect;
}

export const PROCS: Record<string, ProcDef> = {

  brutal_strike: {
    id: 'brutal_strike', name: 'Brutal Strike',
    color: '#ff8a4a', trigger: 'hit',
    effect: { type: 'extraHit', damageScale: 0.6 },
  },

  thunderstruck: {
    id: 'thunderstruck', name: 'Thunderstruck',
    color: '#ffe14a', trigger: 'hit',
    effect: { type: 'explosion', damageScale: 0.5, radius: 80 },
  },

  corpsefire: {
    id: 'corpsefire', name: 'Corpsefire',
    color: '#ff5a2a', trigger: 'kill',
    effect: { type: 'explosion', damageScale: 0.8, radius: 90 },
  },

  displacement_field: {
    id: 'displacement_field', name: 'Displacement Field',
    color: '#6ac0f8', trigger: 'hit',
    effect: { type: 'displace', force: 120 },
  },

  magnetic_pull: {
    id: 'magnetic_pull', name: 'Magnetic Pull',
    color: '#a8a8ff', trigger: 'hit',
    effect: { type: 'displace', force: -140 },
  },

  // PHASE 3: the knockback-collision-damage proc — fires when a shove the caster
  // dealt is arrested by a wall or void. Granted by the Crushing Impact support.
  collision_crush: {
    id: 'collision_crush', name: 'Crushing Impact',
    color: '#ff7040', trigger: 'collision',
    effect: { type: 'collisionDamage', damageScale: 0.8 },
  },

  // Fury from wounds: applying a bleed banks a Frenzy charge (the
  // Bloodletter's Rhythm support grants the chance).
  bloodletters_rhythm: {
    id: 'bloodletters_rhythm', name: "Bloodletter's Rhythm",
    color: '#c03030', trigger: 'statusApply', status: 'bleed',
    effect: { type: 'gainCharge', charge: 'fury', amount: 1, max: 5 },
  },

  // FORGEBOUND: the blow itself does the conscripting — a struck line has
  // a chance to yield an ANIMATED WEAPON fighting at your side (inherits
  // your minion investment; the Forge Strike shape. NOTE: no item system
  // yet — when weapons exist, this should inherit the WEAPON's stats and
  // attack rate; today it scales off minion stats alone).
  forge_weapon: {
    id: 'forge_weapon', name: 'Forgebound',
    color: '#d8b06a', trigger: 'hit',
    effect: { type: 'summon', monsterId: 'blade_wraith', duration: 9, max: 3 },
  },

  // Glass tempo: every landed hit builds speed — and ONE hit taken wipes
  // the whole spin (BuffEffect.clearOnHit).
  tempo: {
    id: 'tempo', name: 'Tempo',
    color: '#7ae0c8', trigger: 'hit',
    effect: {
      type: 'buff', buff: {
        type: 'buff', id: 'tempo', duration: 5, maxStacks: 8, clearOnHit: true,
        mods: [mod('attackSpeed', 'increased', 0.04), mod('castSpeed', 'increased', 0.04)],
      },
    },
  },

  // --- The interaction fabric: defensive & threshold triggers -----------------

  // ADRENAL RUSH: opening a vein quickens your own blood — inflicting a
  // bleed surges your life regeneration (flat AND increased, stacking to 3).
  adrenal_rush: {
    id: 'adrenal_rush', name: 'Adrenal Rush',
    color: '#e06060', trigger: 'statusApply', status: 'bleed', icd: 1,
    effect: {
      type: 'buff', buff: {
        type: 'buff', id: 'adrenal_rush', duration: 4, maxStacks: 3,
        mods: [mod('lifeRegen', 'flat', 2), mod('lifeRegen', 'increased', 0.15)],
      },
    },
  },

  // BULWARK NOVA: the block ITSELF detonates — a small physical burst
  // around you (baseline-scaled; golden rule 4).
  bulwark_nova: {
    id: 'bulwark_nova', name: 'Bulwark Nova',
    color: '#d8c8a0', trigger: 'block', icd: 1.5,
    effect: { type: 'burst', damage: 'physical', base: 10, perLevel: 2.2, radius: 110 },
  },

  // GUARDED HEART: a made block closes a wound — flat plus a sliver of max.
  guarded_heart: {
    id: 'guarded_heart', name: 'Guarded Heart',
    color: '#8ae0a8', trigger: 'block', icd: 1,
    effect: { type: 'heal', flat: 6, pctMax: 0.02 },
  },

  // SECOND WIND: slipping a blow steadies the breath — a heal on evade.
  second_wind: {
    id: 'second_wind', name: 'Second Wind',
    color: '#9ad8e8', trigger: 'evade', icd: 2,
    effect: { type: 'heal', flat: 4, pctMax: 0.02 },
  },

  // QUICKENING: an evade rolls straight into momentum — brief haste that
  // feeds the insight loop (movement refills the pool; the weave sustains).
  quickening: {
    id: 'quickening', name: 'Quickening',
    color: '#6ad8b8', trigger: 'evade', icd: 3,
    effect: {
      type: 'buff', buff: {
        type: 'buff', id: 'quickening', duration: 2.5,
        mods: [mod('moveSpeed', 'increased', 0.12)],
      },
    },
  },

  // CAPACITOR BURST: the shield doesn't die quietly — its collapse arcs
  // out as a lightning nova (baseline-scaled).
  capacitor_burst: {
    id: 'capacitor_burst', name: 'Capacitor Burst',
    color: '#ffe14a', trigger: 'esBreak', icd: 4,
    effect: { type: 'burst', damage: 'lightning', base: 14, perLevel: 3, radius: 140 },
  },

  // PHASE SURGE: the popped shield leaves you briefly BODILESS — phasing
  // through the pack that broke it (the escape the moment begs for).
  phase_surge: {
    id: 'phase_surge', name: 'Phase Surge',
    color: '#9ad8e8', trigger: 'esBreak', icd: 6,
    effect: {
      type: 'buff', buff: {
        type: 'buff', id: 'phase_surge', duration: 2,
        mods: [mod('phasing', 'flat', 1), mod('moveSpeed', 'increased', 0.1)],
      },
    },
  },

  // BREAKER'S MOMENTUM: shattering a poise bar feeds the next shatter —
  // the poise-breaker specialization's payoff loop.
  breakers_momentum: {
    id: 'breakers_momentum', name: "Breaker's Momentum",
    color: '#d8b06a', trigger: 'poiseBreakDealt',
    effect: {
      type: 'buff', buff: {
        type: 'buff', id: 'breakers_momentum', duration: 6, maxStacks: 3,
        mods: [mod('poiseDamage', 'increased', 0.15), mod('damage', 'increased', 0.06)],
      },
    },
  },

  // LAST STAND: your own bar breaking steels you instead of sinking you —
  // a burst of resilience that softens the Sundered window (the smooth-
  // transition dial in proc form; grant it baseline-adjacent if breaks
  // ever feel too punishing).
  last_stand: {
    id: 'last_stand', name: 'Last Stand',
    color: '#e8d44a', trigger: 'poiseBroken', icd: 8,
    effect: {
      type: 'buff', buff: {
        type: 'buff', id: 'last_stand', duration: 2.5,
        mods: [mod('damageTaken', 'more', -0.15), mod('healTaken', 'increased', 0.2)],
      },
    },
  },

  // --- Skill-gated, cast-scoped, and delayed shapes ---------------------------

  // RADIANT REPRISAL — the SKILL-GATED, ONCE-PER-CAST shape: only
  // Sanctified Strike rolls it, and a whole arc's simultaneous contacts
  // count as one trigger. The blast is TELEGRAPHED (0.5s), then heals
  // allies and burns enemies in the same circle.
  radiant_reprisal: {
    id: 'radiant_reprisal', name: 'Radiant Reprisal',
    color: '#ffe8b0', trigger: 'hit',
    skills: ['sanctified_strike'], oncePerCast: true,
    effect: {
      type: 'delayedBurst', delay: 0.5, radius: 120, at: 'target',
      damage: { type: 'fire', base: 12, perLevel: 2.5 },
      healAllies: { base: 8, perLevel: 1.5 },
    },
  },

  // RADIANT CASCADE — the PER-CONTACT sibling: every struck target hosts
  // its own (smaller) delayed bloom. Same skill gate; the two variants are
  // one flag apart, which is the point.
  radiant_cascade: {
    id: 'radiant_cascade', name: 'Radiant Cascade',
    color: '#ffd890', trigger: 'hit',
    skills: ['sanctified_strike'],
    effect: {
      type: 'delayedBurst', delay: 0.5, radius: 70, at: 'target',
      damage: { type: 'fire', base: 6, perLevel: 1.2 },
      healAllies: { base: 4, perLevel: 0.8 },
    },
  },

  // EXECUTIONER'S RHYTHM: a kill hastens everything still cooling down.
  executioners_rhythm: {
    id: 'executioners_rhythm', name: "Executioner's Rhythm",
    color: '#e8a24a', trigger: 'kill',
    effect: { type: 'cooldown', seconds: 1.5 },
  },

  // BASTION FORTIFY: a made block banks ENDURANCE (the break-less pool's
  // real refill — worthless without investing in the pool, by design).
  bastion_fortify: {
    id: 'bastion_fortify', name: 'Bastion',
    color: '#a8c86a', trigger: 'block',
    effect: { type: 'fortify', flat: 6, pctMaxLife: 0.02 },
  },
};

export const PROC_LIST: ProcDef[] = Object.values(PROCS);

/** The stat id whose value is this proc's trigger chance. */
export function procStat(id: string): string {
  return 'proc_' + id;
}
