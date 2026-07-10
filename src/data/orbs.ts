// ---------------------------------------------------------------------------
// ORB KINDS — resource orbs as data (the pour-and-bank pickup ecosystem).
//
// An orb is a glowing ground pickup that POURS into whoever scoops it: a
// resource restore (the classic life/mana/es trio), banked CHARGES
// (CHARGE_DEFS personalities apply — per-charge gauge mods, decay, drains),
// or both. Scooping also fires every 'orbPickup' seam: flask FOUNT taps
// (ChargeGainSpec), orbPickup procs, and per-skill cooldown REFUNDS (the
// orbRefund_<id> family) — a kind is a whole economy, not just a heal.
// Sibling registry: REMNANT_KINDS (data/remnants.ts) are kill-shed spinning
// fragments whose payload is a buff; orbs are the resource lane.
//
// SHEDDING rides GENERATED stat families, one per kind and trigger:
//   orbOnHit_<id>   chance per landed top-level hit (the Harvest lane)
//   orbOnKill_<id>  chance per credited kill (noBounty prey sheds nothing)
//   orbOnHurt_<id>  chance per landed hit TAKEN (the bruised-loose valve)
// each rolled with the acting skill's tags + instance mods, so "melee kills
// shed wakeflames" is a support mod, not code — and `orbShedRate` scales
// every roll. New kinds are added here and are immediately grantable.
// ---------------------------------------------------------------------------

import { STAT_DEFS } from '../engine/stats';

export interface OrbDef {
  id: string;
  label: string;
  color: string;
  /** Instant pour: restore this pool by the orb's rolled amount. */
  restore?: 'life' | 'mana' | 'es';
  /** Pickup banks charges (fixed per scoop — level scaling belongs to
   *  restores; a charge is a charge). CHARGE_DEFS personalities apply. */
  charge?: { charge: string; amount: number; max: number };
  /** Restore amount by zone level: base + perLevel × level. */
  amount: { base: number; perLevel?: number };
  /** Seconds it lies on the ground (default 12). */
  life?: number;
  /** Visual: disc radius (default 5.5) and glow blur (default 9). */
  size?: number;
  glow?: number;
  /** Orbs DRIFT to the nearest living seat within this range before the
   *  walk-over scoop (0/unset = walk-over only, the classic trio). */
  magnet?: number;
  /** Cast into the DYNAMIC LIGHT LAYER at this radius (unset = self-glow
   *  only). Reserve it for kinds worth a candle — the light cap is shared. */
  light?: number;
}

export const ORB_DEFS: Record<string, OrbDef> = {
  // The classic sustain trio — knocked loose by Harvest supports, flask
  // founts drink them, chests and breakables spill them.
  life: {
    id: 'life', label: 'life', color: '#d04848',
    restore: 'life', amount: { base: 12, perLevel: 2 },
  },
  mana: {
    id: 'mana', label: 'mana', color: '#4a78d8',
    restore: 'mana', amount: { base: 9, perLevel: 1 },
  },
  es: {
    id: 'es', label: 'shield', color: '#5ad8d8',
    restore: 'es', amount: { base: 12, perLevel: 2 },
  },

  // WAKEFLAME — the funeral-vigil flame, banked as a charge. The votive
  // economy: skills shed them, scooping banks the flame AND refunds the
  // cooldowns that subscribe (orbRefund_wakeflame), passives turn the held
  // bank into a build-your-own-buff (gaugeMod on 'charge:wakeflame'), and
  // the Deathwatch vigil burns the bank as upkeep. Drawn to the living.
  wakeflame: {
    id: 'wakeflame', label: 'Wakeflame', color: '#ffd98a',
    charge: { charge: 'wakeflame', amount: 1, max: 5 },
    amount: { base: 0 }, life: 10, size: 4.5, glow: 14, magnet: 90,
    light: 46,
  },
};

/** Hard ceiling on live orbs in a zone — every shed path respects it. */
export const ORB_CAP = 40;

/** An orb's rolled restore amount at a zone level. */
export function orbAmount(def: OrbDef, level: number): number {
  return Math.round(def.amount.base + (def.amount.perLevel ?? 0) * level);
}

// Register the generated shed-chance + refund families, mirroring the
// remnantDrop_<id> pattern: any modifier source — support gem, passive
// node, skill equipMods, future affix — grants them through the ordinary
// stat engine, tag-filtered by the acting skill.
for (const [id, def] of Object.entries(ORB_DEFS)) {
  STAT_DEFS['orbOnHit_' + id] = {
    label: `${def.label} Orb on Hit`, base: 0, min: 0, max: 1, percent: true,
  };
  STAT_DEFS['orbOnKill_' + id] = {
    label: `${def.label} Orb on Kill`, base: 0, min: 0, max: 1, percent: true,
  };
  STAT_DEFS['orbOnHurt_' + id] = {
    label: `${def.label} Orb when Struck`, base: 0, min: 0, max: 1, percent: true,
  };
  STAT_DEFS['orbRefund_' + id] = {
    label: `Cooldown Refund per ${def.label} Orb`, base: 0, min: 0,
  };
}

/** Stat ids for a kind's shed chances and pickup refund. */
export function orbOnHitStat(id: string): string { return 'orbOnHit_' + id; }
export function orbOnKillStat(id: string): string { return 'orbOnKill_' + id; }
export function orbOnHurtStat(id: string): string { return 'orbOnHurt_' + id; }
export function orbRefundStat(id: string): string { return 'orbRefund_' + id; }
