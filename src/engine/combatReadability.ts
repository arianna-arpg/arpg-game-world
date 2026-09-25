import type { Actor } from './actor';
import { SKILLS } from '../data/skills';
import { VOLATILE_CUE_STYLES, WARD_CUE_STYLES } from '../data/combatReadability';

export interface VolatileSpec { skillId: string; chance: number; icd?: number; dmgMult?: number; cue?: string | false; }
export interface ReactiveCue {
  cap?: boolean;
  gasp?: number; // 0 = spent, 1 = available for another CHANCE at rescue
  volatile?: { profile: string; ready: number; color: string };
}
const clamp = (n: number) => Math.max(0, Math.min(1, n));
export function volatileCueStyle(id: string) {
  return Object.hasOwn(VOLATILE_CUE_STYLES, id) ? VOLATILE_CUE_STYLES[id] : VOLATILE_CUE_STYLES.vents;
}
export function wardCueStyle(id?: string) {
  return id && Object.hasOwn(WARD_CUE_STYLES, id) ? WARD_CUE_STYLES[id] : WARD_CUE_STYLES.lattice;
}
/** Host-derived view; clients do not infer sheet stats or simulation timers. */
export function reactiveCueOf(a: Actor, time: number): ReactiveCue | undefined {
  if (a.dead || a.downed || a.life <= 0) return;
  if (a.reactiveCue !== undefined) return a.reactiveCue;
  const cue: ReactiveCue = {};
  if (a.sheet.get('hitCap') > 0) cue.cap = true;
  if (a.sheet.get('lastGasp') > 0) cue.gasp = a.lastGaspCd <= 0 ? 1
    : clamp(1 - a.lastGaspCd / Math.max(0.001, a.lastGaspSpan || a.sheet.get('lastGaspCooldown')));
  const v = a.volatile, skill = v && SKILLS[v.skillId];
  if (v && v.chance > 0 && v.cue !== false && skill && !a.untargetable) {
    cue.volatile = { profile: v.cue ?? 'vents', color: skill.color,
      ready: clamp(1 - Math.max(0, a.volatileReadyAt - time) / Math.max(0.001, v.icd ?? 1.5)) };
  }
  return cue.cap || cue.gasp !== undefined || cue.volatile ? cue : undefined;
}
/** EXACT ward watcher membership, shared by the gate and the visible links.
 * Team, distance and downing are deliberately not extra mechanical filters. */
export function wardGuardians(a: Actor, actors: readonly Actor[]): Actor[] {
  if (a.wardCueSources !== undefined) return a.wardCueSources.filter(x => !x.dead);
  return a.aiWardTag ? actors.filter(x => !x.dead && x.tag === a.aiWardTag) : [];
}
export function wardCueActive(a: Actor): boolean {
  return !a.dead && a.untargetable && (!!a.aiWardTag || a.wardCueSources !== undefined);
}
