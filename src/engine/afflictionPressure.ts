import type { Actor } from './actor';
import { STATUS_DEFS, type ActiveStatus } from './status';
import type { SkillTag } from './stats';
import { throngTravelProtected } from './throngEvolution';
import { AFFLICTION_CUE_CFG as C } from '../data/afflictionCues';

/** Per-status share of near-term pressure on CURRENT life. Kept separate
 * from presentation so the host can send the same read to every owning seat. */
export type AfflictionPressure = Record<string, number>;
const EMPTY: AfflictionPressure = Object.freeze({});
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const TAG_SET_BY_TYPE = new Map<string, ReadonlySet<SkillTag>>([
  ['fire', new Set<SkillTag>(['fire'])],
  ['cold', new Set<SkillTag>(['cold'])],
  ['lightning', new Set<SkillTag>(['lightning'])],
  ['chaos', new Set<SkillTag>(['chaos'])],
  ['physical', new Set<SkillTag>(['physical'])],
]);

function tagSetForDotType(type: string): ReadonlySet<SkillTag> | undefined {
  if (type === 'untyped') return undefined;
  let s = TAG_SET_BY_TYPE.get(type);
  if (!s) {
    s = new Set<SkillTag>([type as SkillTag]);
    TAG_SET_BY_TYPE.set(type, s);
  }
  return s;
}

let scratchAmounts: number[] = [];

/** Integrate a status's authored linear DPS curve without mutating its clock.
 * Remaining duration caps the horizon; a banked reapply burst lands once. */
export function statusDamageOver(s: ActiveStatus, from: number, to: number): number {
  const span = Math.max(0, Math.min(to, s.remaining) - from);
  if (span <= 0) return 0;
  const curve = STATUS_DEFS[s.id]?.dpsCurve;
  const progress = s.total ? clamp01(1 - (s.remaining - from - span / 2) / s.total) : 0;
  const scale = curve && s.total ? (curve === 'ramp' ? 2 * progress : 2 * (1 - progress)) : 1;
  return Math.max(0, s.dps * s.stacks * span * scale) + (from === 0 ? Math.max(0, s.popAcc ?? 0) : 0);
}

/** Read-only pressure estimate, NOT a promised death forecast. Mirrors the
 * DoT soak order and tagged reductions, with shared temporary pools across
 * all ailments (no shield counted once per status). Eight short slices notice
 * shield depletion/resistance loss. No heals, future attacks, random last-gasp
 * rolls or side-effectful life interceptors are predicted; stagger is still
 * owed damage. All combat authority remains in damage.ts / World.
 * Doom uses the actual cull bank/life comparison, not tick DPS or ES. */
export function afflictionPressureOf(a: Actor): AfflictionPressure {
  if (a.dead || a.downed || a.life <= 0) return EMPTY;
  if (a.afflictionPressure !== undefined) return a.afflictionPressure;
  const statuses = a.statuses;
  if (!statuses.length || a.invulnerable || throngTravelProtected(a)) return EMPTY;
  let out: AfflictionPressure | undefined;
  let dots: ActiveStatus[] | undefined;
  const life = Math.max(0.001, a.life);
  for (let i = 0; i < statuses.length; i++) {
    const s = statuses[i];
    if (s.remaining <= 0) continue;
    const def = STATUS_DEFS[s.id];
    if (def?.beneficial) continue;
    if (def?.cullsAtLethal && s.rupture! > 0) {
      const span = s.total ?? def.duration;
      const urgency = C.armedUrgencyFloor + (1 - C.armedUrgencyFloor) * (1 - clamp01(s.remaining / Math.max(0.001, span)));
      out ??= {};
      out[s.id] = (out[s.id] ?? 0) + s.rupture! / life * urgency;
    }
    if (s.dps > 0 || (s.popAcc ?? 0) > 0) {
      dots ??= [];
      dots.push(s);
    }
  }
  if (!dots) return out ?? EMPTY;
  out ??= {};
  let ward = Math.max(0, a.ward), absorb = Math.max(0, a.absorbTotal);
  let es = Math.max(0, a.es), mana = Math.max(0, a.mana);
  const manaShare = clamp01(a.sheet.get('manaShield'));
  // Stable id order: the visual does not flicker when status arrays
  // reorder. Each type allocates the shared loss proportionally to its causes.
  if (dots.length > 1) dots.sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
  const groups = new Map<string, { statuses: ActiveStatus[]; taken: number; resist: number; bypass: number }>();
  for (let i = 0; i < dots.length; i++) {
    const s = dots[i];
    const type = STATUS_DEFS[s.id]?.dotType ?? 'untyped';
    let group = groups.get(type);
    if (!group) {
      const tags = tagSetForDotType(type);
      group = { statuses: [], taken: Math.max(0, a.sheet.get('damageTaken', tags)),
        resist: clamp01(a.sheet.get('esDotResist', tags)), bypass: clamp01(a.sheet.get('esDotBypass', tags)) };
      groups.set(type, group);
    }
    group.statuses.push(s);
  }
  const dt = C.horizon / C.forecastSteps;
  for (let i = 0; i < C.forecastSteps; i++) {
    const from = i * dt, to = (i + 1) * dt;
    for (const g of groups.values()) {
      const sts = g.statuses, n = sts.length;
      let raw = 0;
      for (let j = 0; j < n; j++) {
        const amt = statusDamageOver(sts[j], from, to);
        scratchAmounts[j] = amt;
        raw += amt;
      }
      if (raw <= 0) continue;
      let total = raw * g.taken * (es > 0.5 ? 1 - g.resist : 1);
      if (total <= 0) continue;
      let spent = Math.min(ward, total); ward -= spent; total -= spent;
      spent = Math.min(absorb, total); absorb -= spent; total -= spent;
      spent = Math.min(es, total * (1 - g.bypass)); es -= spent; total -= spent;
      spent = Math.min(mana, total * manaShare); mana -= spent; total -= spent;
      if (total <= 0) continue;
      const scale = (total / life) / raw;
      for (let j = 0; j < n; j++) {
        const amt = scratchAmounts[j];
        if (amt <= 0) continue;
        const id = sts[j].id;
        out[id] = (out[id] ?? 0) + amt * scale;
      }
    }
  }
  return out;
}
