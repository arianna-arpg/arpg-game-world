import type { Actor } from './actor';
import type { SkillDef } from './skills';

/** Shared summon/throng combat tuning. Omitted fields use neutral values;
 * gathered throngs inherit SMALL_ARMY_COMBAT unless explicitly overridden.
 * These are per-body survival/handling factors, never damage multipliers. */
export interface MinionCombatSpec {
  threat?: number;
  areaAvoidance?: number;
  commandSpeed?: number;
}

export const MINION_COMBAT = {
  maxAreaAvoidance: 0.85,
  minThreat: 0.01,
  maxCommandSpeed: 1.5,
  recallSec: 6,
  /** These grants require the actor's full life/ply state, not a pool row. */
  actorDurabilityStats: ['minionPlies', 'minionLifePlyTrade', 'minionLifePlyEcho'],
} as const;

export const SMALL_ARMY_COMBAT: Readonly<MinionCombatSpec> = {
  threat: 0.1, areaAvoidance: 0.75, commandSpeed: 1.3,
};
const NEUTRAL_COMBAT: Readonly<MinionCombatSpec> = {};

export function minionCombatOf(def: SkillDef): MinionCombatSpec {
  return def.minionCombat ?? (def.throng ? SMALL_ARMY_COMBAT : NEUTRAL_COMBAT);
}

/** Orders quicken feet only: cast rate, rooted casts and terrain stay live. */
export function minionCommandSpeed(a: Actor, time: number): number {
  if (!a.owner || !a.aiCommand || a.aiCommand.autonomous
    || a.aiCommand.until <= time || !a.summonInst) return 1;
  return Math.max(1, Math.min(MINION_COMBAT.maxCommandSpeed,
    minionCombatOf(a.summonInst.def).commandSpeed ?? 1));
}
