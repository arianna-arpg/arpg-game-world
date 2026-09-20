import type { Actor, CastingState } from './actor';
import { instanceChannel, instanceMods, skillContextTags } from './skills';
import { castingCueStyle } from '../data/castingCues';
import { combatCueFlash } from './combatCues';

export interface CastingCue { fill: number; facing: number; style: string; color: string; }
const unit = (v: number) => Math.max(0, Math.min(1, v));

/** The actual completion clock, not the channel's repeating pulse bar.
 * Supports synthesized Gathered Casting and invested duration. The host
 * resolves it once for render-only clients whose skill stubs lack those data. */
export function castingCompletion(a: Actor): number | undefined {
  const cs = a.casting;
  if (!cs || a.dead || a.downed || a.isStunned()) return;
  if (cs.castingCompletion !== undefined) return cs.castingCompletion;
  if (cs.mode === 'charge') return cs.total > 0 ? unit(cs.elapsed / cs.total) : 1;
  if (cs.mode !== 'channel') return;
  const spec = cs.gather ?? instanceChannel(cs.inst);
  if (spec?.brim) return unit(a.brims?.get(cs.inst.def.id)?.fill ?? 0);
  if (spec?.maxHold !== undefined) {
    const cap = spec.maxHold * a.sheet.get('effectDuration', skillContextTags(cs.inst.def), instanceMods(cs.inst));
    return cap > 0 ? unit((cs.channelTime ?? 0) / cap) : undefined;
  }
}

/** Small held-work silhouette at the casting edge, never a fake AoE marker. */
export function castingCueOf(a: Actor): CastingCue | undefined {
  const cs = a.casting, fill = castingCompletion(a);
  if (!cs || fill === undefined || cs.inst.def.castingCue === false) return;
  if (cs.castingCompletion !== undefined) return cs.castingCue;
  return { fill, facing: Math.atan2(cs.aim.y - a.pos.y, cs.aim.x - a.pos.x),
    style: cs.inst.def.castingCue ?? 'standard', color: cs.inst.def.color };
}

/** Freeze the same preparation's seat/color at its true state transition.
 * The caller retains cs before clearing casting. No success event is inferred
 * from a missing bar or sent for an ordinary released attack. */
export function castingEventFlash(a: Actor, cs: CastingState, event: 'interrupt' | 'fizzle' | 'ready') {
  if (a.dead || a.downed || cs.inst.def.castingCue === false) return;
  const cfg = castingCueStyle(cs.inst.def.castingCue);
  const facing = Math.atan2(cs.aim.y - a.pos.y, cs.aim.x - a.pos.x);
  const reach = a.radius + cfg.frontPad;
  return combatCueFlash({ x: a.pos.x + Math.cos(facing) * reach, y: a.pos.y + Math.sin(facing) * reach },
    cfg[event], cfg.radius, facing, cs.inst.def.color);
}
