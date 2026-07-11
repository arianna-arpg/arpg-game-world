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
// RATE DISCIPLINES — three ways a proc can be paced, chosen per def:
//  - CHANCE (default): the proc_<id> stat IS the roll chance. Fast skills
//    proc more often in absolute terms — the classic slot machine.
//  - 100% + ICD: grant chance 1 and set `icd` — a metronome: fires every
//    hit until the internal cooldown gates it. Reliable, rhythm-driven.
//  - PPM (`ppm` field): the def names a procs-per-MINUTE rate; the stat
//    becomes a MULTIPLIER on it (grant 1 = listed rate, 2 = double). Each
//    attempt's chance scales with time since the last attempt, so Barrage
//    and a slow two-hander CONVERGE on the same procs/minute — the feel
//    differs (many small rolls vs few fat ones), the budget doesn't.
//
// GOLDEN RULES (the anti-exploit constitution — engine-enforced):
//  1. Proc'd actions execute at depth+1, and rolls are DEPTH-GATED: layer
//     0 (real actions) always rolls; deeper layers require the owner's
//     procDepth stat (the Chain Reaction archetype), each layer rolls at
//     DEFENSE_CFG.procs.depthFalloff of its chance (geometric damping),
//     and maxExtraDepth is an absolute lid. No infinite cascades — but
//     "built entirely around procs" is now a real, investable build.
//  2. Chance is capped at 95% per roll; `icd` (internal cooldown, seconds)
//     hard-limits frequency however many sources stack the chance; PPM
//     catch-up is bounded (no banked guaranteed openers).
//  3. DEFENSIVE triggers (block / evade / esBreak / poiseBroken) roll on the
//     DEFENDER's GLOBAL sheet — passives, buffs, worn equipMods — never on
//     the attacker's skill context.
//  4. 'burst'/'delayedBurst' payloads scale from a caster-less BASELINE
//     (flat + perLevel), never from a skill's rolled damage — a proc can't
//     double-dip a crit.
//  5. Heals flow through Actor.healBy (healTaken gates them like any heal);
//     restores respect their pool maxima.
//  6. MINION CARRY (`minionCarry`): a flagged proc rolls on the OWNER when
//     their minion lands a hit, read through the SUMMONING skill's context
//     (its sockets and tags — Summon Phantasm socketed in Summon Skeleton
//     makes the skeleton's blows conjure phantasms FOR THE PLAYER, up to
//     the player's caps). Unflagged procs never ride minion hits — the
//     seam for the full minion-support pass later.
//
// To add a proc: register it here, then grant `proc_<id>` chance from any
// modifier source — passive node, SUPPORT GEM (skill-local), buff, affix.
// No engine changes needed.
// ---------------------------------------------------------------------------

import { mod, STAT_DEFS } from '../engine/stats';
import type { DamageType } from '../engine/stats';
import type { BuffEffect } from '../engine/skills';

export type ProcEffect =
  /** Repeats the hit on the same target at a damage scale. */
  | { type: 'extraHit'; damageScale: number }
  /** The hit echoes as an explosion around the target, re-rolling the
   *  skill's damage at a scale against everything in the radius. */
  | { type: 'explosion'; damageScale: number; radius: number }
  /** The hit ARCS: leaps from the struck target to the nearest fresh
   *  enemy within `range`, then onward, up to `hops` times — each leap
   *  re-rolling the skill's damage at the scale, one depth deeper. Struck
   *  bodies never repeat, so the jolt always travels OUTWARD. */
  | { type: 'arc'; damageScale: number; range: number; hops: number }
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
  /** Applies a STATUS to the struck target. DoT power is the status's
   *  caster-less baseline × `magnitude` (golden rule 4: never the hit's own
   *  roll) — potency/pop investment still applies at the application site. */
  | { type: 'status'; status: string; magnitude?: number }
  /** HEALS the proc's OWNER — flat and/or a fraction of max life (through
   *  healBy, so healTaken gates it like every heal). */
  | { type: 'heal'; flat?: number; pctMax?: number }
  /** Restores mana, energy shield, or poise on the proc's OWNER (ES flows
   *  through gainEs, poise through gainPoise — so poise restores can crest
   *  into overcharge headroom). `resetEsDelay` also kicks the ES recharge
   *  off IMMEDIATELY — the autonomous-recharge seam in proc form. */
  | { type: 'restore'; resource: 'mana' | 'es' | 'poise'; flat?: number; pctMax?: number; resetEsDelay?: boolean }
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
   *   'esRechargeStart' your energy shield's recharge begins to flow
   *   'esFilled'        your energy shield fills back to full
   *   'poiseBreakDealt' your hit breaks an enemy's poise bar
   *   'poiseBroken'     your own poise bar breaks
   *   'poiseBracket'    your poise is drained through a bracket rung
   *                     (DEFENSE_CFG.poise.brackets; see `bracket` filter)
   *   'poiseRearmed'    your broken poise bar recovers and re-arms
   *   'chargeGain'      you actually gain a charge (see `charge` filter)
   *   'buffGain'        a buff is applied to you (see `buff` filter)
   *   'orbPickup'       you scoop a resource orb (see `orb` filter) */
  trigger: 'hit' | 'kill' | 'collision' | 'statusApply'
    | 'block' | 'evade' | 'esBreak' | 'esRechargeStart' | 'esFilled'
    | 'poiseBreakDealt' | 'poiseBroken' | 'poiseBracket' | 'poiseRearmed'
    | 'chargeGain' | 'buffGain' | 'orbPickup';
  /** statusApply only: fires when one of THESE statuses lands (omit = any). */
  status?: string | string[];
  /** chargeGain only: fires for THESE charge ids (omit = any charge). */
  charge?: string | string[];
  /** buffGain only: fires for THESE buff ids (omit = any buff). */
  buff?: string | string[];
  /** orbPickup only: fires for THESE orb kinds (omit = any orb). */
  orb?: string | string[];
  /** poiseBracket only: fires for THESE rungs — fractions of max poise,
   *  matching DEFENSE_CFG.poise.brackets entries (omit = every rung). */
  bracket?: number | number[];
  /** SKILL GATE: the proc only rolls for these skill ids — "Sanctified
   *  Strike has a chance to..." lives on the proc, so ANY grantor (passive,
   *  gem, affix) is automatically skill-scoped. Omit = every skill. */
  skills?: string[];
  /** CRIT GATE (hit/kill triggers): only CRITICAL hits roll this proc —
   *  "gain Rage when this skill crits" is a def flag + a chance grant.
   *  Distinct proc ids roll independently, so a gem's crit-rage and a
   *  passive's crit-fury stack as separate dice by construction. */
  crit?: true;
  /** ROLL-TOP GATE (hit/kill triggers): only hits whose damage dice landed
   *  in the top `rollTop` fraction of their range roll this proc (0.15 =
   *  the top 15% — the jackpot line). The owner's highRollWindow stat
   *  widens the window; damageSpread widens the dice themselves so the
   *  jackpots that do land hit HARDER. Hits that rolled no live range
   *  never pass (no dice, no jackpot); stacks with `crit` — both gates
   *  must open — and the chance stat still rolls after it. */
  rollTop?: number;
  /** ONCE PER CAST: at most one firing per world tick per owner — a
   *  multi-target swing's simultaneous contacts count as ONE trigger
   *  (hits that resolve on later frames, like a piercing arrow's second
   *  victim, are distinct contacts). Omit = rolls per target struck. */
  oncePerCast?: true;
  /** INTERNAL COOLDOWN, seconds — the hard frequency limit no amount of
   *  stacked chance can beat (golden rule 2). */
  icd?: number;
  /** PROCS PER MINUTE: per-attempt chance = stat × ppm × (time since last
   *  attempt)/60, catch-up bounded — fast and slow skills converge on the
   *  same rate (see RATE DISCIPLINES above). The stat is a multiplier. */
  ppm?: number;
  /** This proc RIDES MINION HITS: it rolls on the minion's OWNER, read
   *  through the summoning skill's sockets/tags (golden rule 6). */
  minionCarry?: true;
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

  // --- THE JACKPOT LINE (rollTop procs): the dice themselves pull the ---------
  // trigger. These roll ONLY when the hit's damage landed in the top of its
  // range (ProcDef.rollTop) — damageSpread widens the dice so the jackpots
  // that land hit harder, highRollWindow widens the window so they come up
  // more often, and luckyChance re-rolls toward them. The high-roller's kit:
  // grant chance 1 and let the dice do the pacing.

  // SHORT CIRCUIT: a peak roll can't be contained — it DETONATES around the
  // struck target. Top 15% of the dice ≈ a 15% rate, every one a huge hit
  // by construction (the gate and the payoff are the same event).
  short_circuit: {
    id: 'short_circuit', name: 'Short Circuit',
    color: '#9ae8ff', trigger: 'hit', rollTop: 0.15,
    effect: { type: 'explosion', damageScale: 0.6, radius: 90 },
  },

  // OVERLOAD ARC: the peak roll LEAPS — struck target to nearest fresh
  // enemy to onward, up to three links. Separate die on a separate gate
  // from Short Circuit: a truly towering roll does BOTH at once.
  overload_arc: {
    id: 'overload_arc', name: 'Overload Arc',
    color: '#7af0ff', trigger: 'hit', rollTop: 0.12,
    effect: { type: 'arc', damageScale: 0.5, range: 240, hops: 3 },
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

  // SHATTERPLATE: the break IS the weapon — the bar's shards fly off as
  // physical shrapnel around you (baseline-scaled, golden rule 4). The
  // poise cycle becomes a detonation rhythm: wear it, break it, wear it.
  shatterplate: {
    id: 'shatterplate', name: 'Shatterplate',
    color: '#d8b06a', trigger: 'poiseBroken', icd: 4,
    effect: { type: 'burst', damage: 'physical', base: 16, perLevel: 4, radius: 120 },
  },

  // UNBROKEN WRATH: the berserker reading of the broken window — while the
  // bar lies inert and re-forging, you hit HARDER. Duration sized to the
  // base recovery cycle, so investment in faster recovery trades fury for
  // safety on its own.
  unbroken_wrath: {
    id: 'unbroken_wrath', name: 'Unbroken Wrath',
    color: '#ff8a4a', trigger: 'poiseBroken', icd: 6,
    effect: {
      type: 'buff', buff: {
        type: 'buff', id: 'unbroken_wrath', duration: 5,
        mods: [mod('damage', 'more', 0.2), mod('attackSpeed', 'increased', 0.1)],
      },
    },
  },

  // TEMPERED RE-ARM: steel quenched twice comes back harder — the freshly
  // re-armed bar opens with a window of deeper reduction and surer footing.
  tempered_rearm: {
    id: 'tempered_rearm', name: 'Tempered Re-arm',
    color: '#e8d44a', trigger: 'poiseRearmed', icd: 6,
    effect: {
      type: 'buff', buff: {
        type: 'buff', id: 'tempered_rearm', duration: 4,
        mods: [mod('poiseDR', 'flat', 0.1), mod('poiseCcAvoid', 'flat', 0.25)],
      },
    },
  },

  // SHEDDING PLATES: each bracket rung the bar is drained through shears
  // off as ENDURANCE — the wearing bar banks a break-less wall beneath
  // itself (omit `bracket` = every rung; a def could pin one instead).
  shedding_plates: {
    id: 'shedding_plates', name: 'Shedding Plates',
    color: '#a8c86a', trigger: 'poiseBracket',
    effect: { type: 'fortify', pctMaxLife: 0.04, flat: 4 },
  },

  // CREST DISCHARGE: a shield that fills back to the brim throws the spare
  // charge OUT — topping off becomes an offensive beat, which makes
  // recharge-rate investment read on the damage side too.
  crest_discharge: {
    id: 'crest_discharge', name: 'Crest Discharge',
    color: '#5ad8d8', trigger: 'esFilled', icd: 5,
    effect: { type: 'burst', damage: 'lightning', base: 12, perLevel: 3, radius: 130 },
  },

  // MIND LIKE WATER: a clean slip settles the mind — a sliver of shield
  // returns AND the recharge starts flowing at once (the autonomous-
  // recharge seam: resetEsDelay skips the wait entirely).
  mind_like_water: {
    id: 'mind_like_water', name: 'Mind Like Water',
    color: '#9ad8e8', trigger: 'evade', icd: 4,
    effect: { type: 'restore', resource: 'es', flat: 6, pctMax: 0.03, resetEsDelay: true },
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

  // STALWART RHYTHM: the wall keeps time — every made block winds the
  // rest of the kit forward (the greatshield-and-poke tempo: block,
  // answer, block, answer).
  stalwart_rhythm: {
    id: 'stalwart_rhythm', name: 'Stalwart Rhythm',
    color: '#8ab8d8', trigger: 'block', icd: 1.5,
    effect: { type: 'cooldown', seconds: 1 },
  },

  // --- GAIN CHAINS (chargeGain / buffGain): resources begetting resources.
  // Each link's grant lands ONE CHAIN-DEPTH deeper, so the ladder below is
  // procDepth-governed exactly like hit chains: base allowance runs one
  // link; Chain Reaction and Perpetual Motion buy the deeper rungs; and
  // Surging Frenzy closing the loop back into Fury DIES at the lid — the
  // perpetual-motion machine is structurally impossible.

  // Fury → Rage ("10% chance to gain a Rage stack when gaining Frenzy" —
  // the chance lives on the grantor, e.g. Kindled Rage's 0.1).
  kindled_rage: {
    id: 'kindled_rage', name: 'Kindled Rage',
    color: '#e04030', trigger: 'chargeGain', charge: 'fury',
    effect: { type: 'gainCharge', charge: 'rage', amount: 1, max: 8 },
  },
  // Rage → Bloodlust (the second rung).
  crimson_thirst: {
    id: 'crimson_thirst', name: 'Crimson Thirst',
    color: '#c02848', trigger: 'chargeGain', charge: 'rage',
    effect: { type: 'gainCharge', charge: 'bloodlust', amount: 2, max: 10 },
  },
  // Bloodlust → Fury — the deliberate LOOP CLOSER, included to prove the
  // rule: at the depth lid the wheel stops turning on its own.
  surging_frenzy: {
    id: 'surging_frenzy', name: 'Surging Frenzy',
    color: '#e87838', trigger: 'chargeGain', charge: 'bloodlust',
    effect: { type: 'gainCharge', charge: 'fury', amount: 1, max: 5 },
  },
  // ANY buff gained → a beat of Fury (the omit-filter showcase; the ICD is
  // the metronome so buff-spam can't machine-gun it).
  battle_chorus: {
    id: 'battle_chorus', name: 'Battle Chorus',
    color: '#e8a040', trigger: 'buffGain', icd: 6,
    effect: { type: 'gainCharge', charge: 'fury', amount: 1, max: 5 },
  },

  // --- Rate-discipline & minion-carry showcases -------------------------------

  // SUMMON PHANTASM — the PPM discipline made visible: ~10 phantasms a
  // minute whether the socketed skill is a strobing Barrage or a glacial
  // two-hander (per-attempt chance scales with the gap between attempts).
  // minionCarry: socketed into a SUMMON skill, the minions' own blows
  // conjure phantasms FOR THEIR OWNER — the first stone of the wider
  // minion-support pass.
  summon_phantasm: {
    id: 'summon_phantasm', name: 'Phantasm',
    color: '#9ad8e8', trigger: 'hit', ppm: 10, minionCarry: true,
    effect: { type: 'summon', monsterId: 'phantasm', duration: 8, max: 5 },
  },

  // RUPTURED VEINS — the Hemorrhage loader (see engine/status.ts): steady
  // hits keep re-opening the deep wound, and every re-application POPS a
  // fraction of the damage still owed. The proc is the rhythm; popPower_
  // investment is the amplitude. The Exsanguinator's signature grant.
  ruptured_veins: {
    id: 'ruptured_veins', name: 'Ruptured Veins',
    color: '#e04858', trigger: 'hit', ppm: 9,
    effect: { type: 'status', status: 'hemorrhage', magnitude: 1.4 },
  },

  // CRIT-GATED gains: two ids, two grantors, two independent dice — a
  // gem's crit-rage and a passive's crit-fury stack by construction.
  crimson_edge: {
    id: 'crimson_edge', name: 'Crimson Edge',
    color: '#e04030', trigger: 'hit', crit: true,
    effect: { type: 'gainCharge', charge: 'rage', amount: 1, max: 8 },
  },
  battle_insight: {
    id: 'battle_insight', name: 'Battle Insight',
    color: '#8ae06a', trigger: 'hit', crit: true,
    effect: { type: 'gainCharge', charge: 'fury', amount: 1, max: 5 },
  },

  // COMMUNION TITHE (the ebb-and-flow summoner): your minions' blows bank
  // COMMUNION on YOU (minionCarry reads the summon skill's sockets) — the
  // flock empowers the shepherd; spend it back into them, or into anything
  // (a spender graft away). The front-line summoner's loop.
  communion_tithe: {
    id: 'communion_tithe', name: 'Communion',
    color: '#b06bd4', trigger: 'hit', minionCarry: true,
    effect: { type: 'gainCharge', charge: 'communion', amount: 1, max: 8 },
  },

  // SAINTED ASH — the boss-viable on-kill shape: kills bloom into a
  // consecrated burst (heals allies, burns enemies). Against ELITE prey
  // (rare+, bosses) the engine's killProcOnHit rule already lets on-kill
  // procs roll on plain HITS — so the gem stays alive in the one fight
  // where nothing dies until the end.
  sainted_ash: {
    id: 'sainted_ash', name: 'Sainted Ash',
    color: '#ffe8b0', trigger: 'kill',
    effect: {
      type: 'delayedBurst', delay: 0.35, radius: 110, at: 'target',
      damage: { type: 'fire', base: 10, perLevel: 2 },
      healAllies: { base: 6, perLevel: 1.2 },
    },
  },

  // VOTIVE SPARK — the orbPickup trigger's demo row: scooping a Wakeflame
  // also splashes a sip of mana. Kind-filtered (`orb`), ICD-paced; the
  // chance stat is granted by the Long Wake's Candle Beads node.
  votive_spark: {
    id: 'votive_spark', name: 'Votive Spark',
    color: '#ffd98a', trigger: 'orbPickup', orb: 'wakeflame', icd: 0.5,
    effect: { type: 'restore', resource: 'mana', flat: 6 },
  },
};

export const PROC_LIST: ProcDef[] = Object.values(PROCS);

/** The stat id whose value is this proc's trigger chance. */
export function procStat(id: string): string {
  return 'proc_' + id;
}

// ---------------------------------------------------------------------------
// PROC RIDERS — payloads bolted onto EXISTING procs from outside.
//
// A rider fires WHEN its host proc fires, enabled by the `procRider_<id>`
// stat exactly as procs are enabled by `proc_<id>`: the stat's value is
// the rider's chance, so any passive node, support gem, buff, or affix can
// hang new consequences off a proc some OTHER source granted
// ("Thunderstruck also sheds sparks") without touching the proc's own def
// — the locked-behind-the-notable passive shape, and the seam that makes
// procs COMPOSE instead of merely stack. Riders execute one depth deeper
// than their host proc, so the golden rules above keep governing: depth
// gates, the 95% cap, luck's multiplier — all of it.
//
// To add a rider: register it here, then grant `procRider_<id>` chance
// from any modifier source. No engine changes needed.
// ---------------------------------------------------------------------------

export interface ProcRiderDef {
  id: string;
  name: string;
  /** Floating-text color when the rider fires. */
  color: string;
  /** The host proc(s) whose firings this rider follows. */
  proc: string | string[];
  /** The payload: CAST a catalog skill from the proc's site.
   *  - count: casts per firing, rolled uniformly ([1,4] = one to four —
   *    the random-assortment die).
   *  - PROJECTILE payloads SPRAY from the site: 'ring' (default) spaces
   *    the count evenly around the circle at a random phase; a number
   *    fans them across that many degrees around the strike bearing.
   *  - at: 'target' (default) anchors at the struck body, 'self' at the
   *    rider's owner.
   *  - mult: damage multiplier on the payload (default 1). */
  cast: {
    skillId: string;
    count: [number, number];
    spread?: 'ring' | number;
    at?: 'target' | 'self';
    mult?: number;
  };
}

export const PROC_RIDERS: Record<string, ProcRiderDef> = {

  // STATIC SHRAPNEL: Thunderstruck's burst sheds LIVE SPARKS — one to four
  // darts flung outward from the strike point, each a real spark_bolt cast
  // (they shock, they carry the caster's lightning investment, they can
  // even jackpot their own wide dice). Granted by the Static Shrapnel
  // notable locked behind the Thunderstruck notable — the proof shape for
  // "a passive that extends a proc another passive granted".
  static_shrapnel: {
    id: 'static_shrapnel', name: 'Static Shrapnel',
    color: '#ffe97a', proc: 'thunderstruck',
    cast: { skillId: 'spark_bolt', count: [1, 4], spread: 'ring' },
  },

};

export const PROC_RIDER_LIST: ProcRiderDef[] = Object.values(PROC_RIDERS);

/** The stat id whose value is this rider's chance to follow its host. */
export function procRiderStat(id: string): string {
  return 'procRider_' + id;
}

// Register every proc's chance stat with a DISPLAY identity (label +
// percent), so any surface that prints a Modifier — item affixes, the
// sheet, tooltips — renders "28% Chance to trigger Brutal Strike" instead
// of a raw stat id and a naked fraction. New procs join automatically.
for (const def of PROC_LIST) {
  STAT_DEFS[procStat(def.id)] = {
    label: `Chance to trigger ${def.name}`, base: 0, min: 0, percent: true,
  };
}
