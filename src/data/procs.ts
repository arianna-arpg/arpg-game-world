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
   *   'poiseBroken'     your own poise bar breaks
   *   'chargeGain'      you actually gain a charge (see `charge` filter)
   *   'buffGain'        a buff is applied to you (see `buff` filter) */
  trigger: 'hit' | 'kill' | 'collision' | 'statusApply'
    | 'block' | 'evade' | 'esBreak' | 'poiseBreakDealt' | 'poiseBroken'
    | 'chargeGain' | 'buffGain';
  /** statusApply only: fires when one of THESE statuses lands (omit = any). */
  status?: string | string[];
  /** chargeGain only: fires for THESE charge ids (omit = any charge). */
  charge?: string | string[];
  /** buffGain only: fires for THESE buff ids (omit = any buff). */
  buff?: string | string[];
  /** SKILL GATE: the proc only rolls for these skill ids — "Sanctified
   *  Strike has a chance to..." lives on the proc, so ANY grantor (passive,
   *  gem, affix) is automatically skill-scoped. Omit = every skill. */
  skills?: string[];
  /** CRIT GATE (hit/kill triggers): only CRITICAL hits roll this proc —
   *  "gain Rage when this skill crits" is a def flag + a chance grant.
   *  Distinct proc ids roll independently, so a gem's crit-rage and a
   *  passive's crit-fury stack as separate dice by construction. */
  crit?: true;
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
};

export const PROC_LIST: ProcDef[] = Object.values(PROCS);

/** The stat id whose value is this proc's trigger chance. */
export function procStat(id: string): string {
  return 'proc_' + id;
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
