import type { Actor } from './actor';
import { STATUS_DEFS, statusRuptureRadius, type StatusDef } from './status';
import { ARMED_CUE_STYLES } from '../data/armedCues';

/** Derived view only: no damage, caster authority or simulation clocks on wire. */
export interface ArmedCue { profile: string; color: string; charge: number; fuse: number; radius: number; }
const EMPTY: ArmedCue[] = [];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export function armedCueProfile(def: StatusDef | undefined): string | undefined {
  if (!def?.cullsAtLethal || def.armedCue === false) return;
  return def.armedCue ?? 'doom';
}
export function armedCueStyle(id: string) {
  return Object.hasOwn(ARMED_CUE_STYLES, id) ? ARMED_CUE_STYLES[id] : ARMED_CUE_STYLES.doom;
}

/** Cull banks share one threshold against current life. Healing loosens the
 * iris; spending life or adding payload tightens it. Fuse progress is separate,
 * using the fixed original duration, never a prediction of future damage. */
export function armedStatusCues(a: Pick<Actor, 'statuses' | 'dead' | 'downed' | 'life' | 'armedCues'>): ArmedCue[] {
  if (a.dead || a.downed || a.life <= 0 || !a.statuses.length) return EMPTY;
  if (a.armedCues !== undefined) return a.armedCues;
  let bank = 0;
  for (const s of a.statuses) if (s.remaining > 0 && s.rupture! > 0 && STATUS_DEFS[s.id]?.cullsAtLethal) bank += s.rupture!;
  if (bank <= 0) return EMPTY;
  const charge = clamp01(bank / Math.max(0.001, a.life)), groups = new Map<string, ArmedCue>();
  for (const s of a.statuses) {
    const def = STATUS_DEFS[s.id], profile = armedCueProfile(def);
    if (!profile || s.remaining <= 0 || !(s.rupture! > 0)) continue;
    const radius = statusRuptureRadius(s), color = def.color;
    const key = `${profile}|${color}|${radius}`;
    const fuse = clamp01(1 - s.remaining / Math.max(0.001, s.total ?? def.duration));
    const old = groups.get(key);
    if (old) old.fuse = Math.max(old.fuse, fuse);
    else groups.set(key, { profile, color, charge, fuse, radius });
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, cue]) => cue);
}
