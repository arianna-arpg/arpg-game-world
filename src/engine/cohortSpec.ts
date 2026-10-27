import type { Actor } from './actor';
import type { SkillInstance, SummonDelivery } from './skills';

/** Data-authored infantry tactics; no species or tree IDs participate in runtime decisions. */
export interface CohortSpec {
  primary: string;
  order: { skill: string; label: string; mode: 'rally' | 'assault'; duration: number; range: number; guardRadius: number };
  challenge?: string;
  reprisal?: { skill: string; cooldown: number; thorns: number; inheritThorns: number; range: number };
  links?: { radius: number; neighbors: number; block: number; poise: number; contact: string; interval: number; promote: number };
  banner?: { skill: string; charge: string; cooldown: number; spacing: number; gatherTime: number; gatherRadius: number; standoff: number };
  intercept?: { range: number; fraction: number; budget: number; recovery: number; select: 'lowestLifeFraction' | 'highestLifeFraction' };
  legacy?: { duration: number; life: number; damage: number; cap: number; color: string; alpha: number };
  relief?: { pulse: string; aura: string; ratio: number; bank: number; interval: number; recipientCap: number };
  cadence?: { every: number; skill: string };
  mark?: { skill: string; status: string; duration: number; more: number };
  assassin?: { backstab: string; cloak: string; rearAngle: number; reach: number; flank: number; flankRange: number; patience: number; repositionEvery: number; retreatAt: number; recoveryAt: number; retreatTime: number; retreatDistance: number };
  approach?: { lunge: string; ranged: string; minRange: number; range: number };
  pairs?: { skill: string; cooldown: number; delay: number; range: number; timeout: number };
}
export interface CohortCast { role: 'primary' | 'rending' | 'reprisal' | 'contact' | 'charge' | 'pincer' | 'utility'; origin: string; hit?: boolean; paired?: boolean; statusKey?: string; warrant?: { target: number; power: number }; }
export interface CohortState {
  kit: SkillInstance[]; primaryUses: number; reprisalReady: number; reprisalTarget?: number;
  interceptCredit: number; reliefBank: number; reliefAt: number; contactAt: number;
  charging?: boolean;
  pairReady: number; partner?: number; pending?: { at: number; target: number; until: number };
  flankTime: number; flankReady: number; retreatUntil: number;
}
export interface CohortMark { target: Actor; status: import('./status').ActiveStatus; remaining: number; power: number; inst: SkillInstance; }
export function cohortSkillIds(d: SummonDelivery): string[] {
  const c=d.cohort;if(!c)return [];
  return [...new Set([c.primary,c.challenge,c.reprisal?.skill,c.links?.contact,c.banner?.skill,c.banner?.charge,
    c.relief?.pulse,c.relief?.aura,c.cadence?.skill,c.mark?.skill,c.assassin?.backstab,c.assassin?.cloak,
    c.approach?.lunge,c.approach?.ranged,c.pairs?.skill].filter((v):v is string=>!!v))];
}
