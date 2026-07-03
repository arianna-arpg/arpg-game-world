// ---------------------------------------------------------------------------
// PROC REGISTRY — triggered on-hit effects.
//
// A proc is a chance-based extra that fires when a skill hit deals damage.
// The CHANCE is an ordinary stat named `proc_<id>` (base 0), which means any
// support gem, passive node, buff, or class innate can grant or scale a proc
// with a normal tag-filtered modifier:
//
//     mod('proc_brutal_strike', 'flat', 0.25, ['melee'])
//
// ...is "melee skills have 25% chance to trigger Brutal Strike". The engine
// rolls each registered proc after a damaging hit and executes its effect.
// Procs cannot trigger from other procs (depth-capped), so they can't loop.
//
// To add a proc: register it here, then grant `proc_<id>` chance from any
// modifier source. No engine changes needed.
// ---------------------------------------------------------------------------

import { mod } from '../engine/stats';
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
  /** Banks a combo charge on the CASTER (Frenzy on bleed). */
  | { type: 'gainCharge'; charge: string; amount: number; max: number }
  /** Grants the CASTER a buff (Tempo stacks on hit). */
  | { type: 'buff'; buff: BuffEffect }
  /** SUMMONS a minion beside the struck target (Forgebound's animated
   *  weapon — the hit itself does the conscripting). Capped per caster. */
  | { type: 'summon'; monsterId: string; duration: number; max: number };

export interface ProcDef {
  id: string;
  name: string;
  /** Shown as floating text + flash color when the proc fires. */
  color: string;
  /** When the proc rolls:
   *   'hit'          any damaging hit
   *   'kill'         a hit that slays
   *   'collision'    a knockback/displacement arrested by a wall or void
   *   'statusApply'  the caster applies a status (see `status` filter) */
  trigger: 'hit' | 'kill' | 'collision' | 'statusApply';
  /** statusApply only: fires when one of THESE statuses lands (omit = any). */
  status?: string | string[];
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
};

export const PROC_LIST: ProcDef[] = Object.values(PROCS);

/** The stat id whose value is this proc's trigger chance. */
export function procStat(id: string): string {
  return 'proc_' + id;
}
