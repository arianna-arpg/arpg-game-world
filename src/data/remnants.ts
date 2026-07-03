// ---------------------------------------------------------------------------
// REMNANT KINDS — physical pickups as data (the fragment ecosystem).
//
// The elemental remnants (fire/cold/lightning: empower your NEXT cast of
// that school) predate this registry and keep their bespoke payload. Every
// OTHER remnant kind lives here: a kind is a ground pickup whose payload is
// a BUFF, banked CHARGES, or both — offensive fragments, defensive shards,
// rage motes, whatever a build wants to scatter and scoop.
//
// Minting rides a GENERATED stat family: every kind registers a
// `remnantDrop_<id>` chance stat (rolled on kills by the slaying skill, so
// tag-filtered grants work: "melee kills shed rage" is a support mod, not
// code). New kinds are added here and are immediately grantable.
// ---------------------------------------------------------------------------

import { mod, STAT_DEFS } from '../engine/stats';
import type { BuffEffect } from '../engine/skills';

export interface RemnantKindDef {
  id: string;
  label: string;
  color: string;
  /** Pickup grants this buff (stacks per pickup when maxStacks > 1). */
  buff?: BuffEffect;
  /** Pickup banks these charges (registry personalities apply). */
  charge?: { charge: string; amount: number; max: number };
}

export const REMNANT_KINDS: Record<string, RemnantKindDef> = {
  // The OFFENSIVE fragment: each one scooped stokes the next few seconds.
  ferocity: {
    id: 'ferocity', label: 'Ferocity', color: '#e8784a',
    buff: {
      type: 'buff', id: 'frag_ferocity', duration: 12, maxStacks: 5,
      mods: [mod('damage', 'increased', 0.08)],
    },
  },
  // The DEFENSIVE shard: armor plating you pick up off the floor.
  bulwark: {
    id: 'bulwark', label: 'Bulwark', color: '#8aa8c8',
    buff: {
      type: 'buff', id: 'frag_bulwark', duration: 12, maxStacks: 5,
      mods: [mod('armor', 'flat', 30), mod('damageTaken', 'more', -0.03)],
    },
  },
  // The RAGE mote: raw fuel for the Berserk economy (see CHARGE_DEFS.rage).
  rage: {
    id: 'rage', label: 'Rage', color: '#e04030',
    charge: { charge: 'rage', amount: 2, max: 10 },
  },
};

// Register a generated `remnantDrop_<id>` CHANCE stat per kind, mirroring
// the apply_<status> family: any modifier source — support gem, passive
// node, future affix — can make kills shed a kind through the ordinary
// stat engine, tag-filtered by the slaying skill.
for (const [id, def] of Object.entries(REMNANT_KINDS)) {
  STAT_DEFS['remnantDrop_' + id] = {
    label: `${def.label} Fragment Drop Chance`, base: 0, min: 0, max: 1, percent: true,
  };
}

/** The stat id whose value is this kind's on-kill drop chance. */
export function remnantDropStat(id: string): string {
  return 'remnantDrop_' + id;
}
