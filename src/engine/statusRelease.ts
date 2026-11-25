import type { Actor } from './actor';
import { armedCueProfile, armedCueStyle } from './armedCues';
import { combatCueFlash } from './combatCues';
import { STATUS_DEFS } from './status';
import { DAMAGE_COLOR, type DamageType } from './stats';
import { mechanicBurst } from '../data/mechanicVisuals';

export interface StatusRelease {
  status: string;
  trigger: 'hit' | 'recall' | 'reapply' | 'spend' | 'death' | 'expiry' | 'threshold';
  damageType: DamageType;
}

/** Built where damage is resolved. Spectators receive exactly the host's cause and material. */
export function statusReleaseFlash(bearer: Actor, status: string, trigger: StatusRelease['trigger'],
  damageType: DamageType, radius: number, facing = 0) {
  const def = STATUS_DEFS[status];
  const statusRelease: StatusRelease = { status, trigger, damageType };
  const origin = { statusRelease, recoveryCueTier: bearer.tier };
  const pos = { ...bearer.pos };
  if (trigger === 'hit' || trigger === 'recall') {
    return { ...origin, pos, radius, facing, color: def?.color ?? DAMAGE_COLOR[damageType],
      fx: def?.dischargeFx?.[trigger] ?? (trigger === 'hit' ? 'impaleDrive' : 'impaleRecall'), life: 0.22, maxLife: 0.22 };
  }
  const armed = trigger !== 'spend' && trigger !== 'reapply' && armedCueProfile(def);
  if (armed) return { ...origin, ...combatCueFlash(pos, armedCueStyle(armed).release, radius, 0, def.color) };
  return { ...origin, pos, radius, fx: def?.ruptureFx ?? mechanicBurst(def?.dischargeOnHit ? 'releaseFlechettes' : `burst_${damageType}`),
    color: def?.ruptureFx ? def.color : DAMAGE_COLOR[damageType], life: 0.32, maxLife: 0.32 };
}
