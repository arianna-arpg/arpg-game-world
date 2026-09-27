import type { Actor } from './actor';
import type { World } from './world';
import { grantedTags, instanceDelivery, instanceMods, instanceUseCharges, skillContextTags, type SkillInstance } from './skills';
import { combatCueFlash } from './combatCues';
import { PAYLOAD_CUE_CFG, PAYLOAD_CUE_DEFAULTS, PAYLOAD_CUE_STYLES, type PayloadCueKind } from '../data/payloadCues';

export interface PayloadCueRow {
  skillId: string; kind: PayloadCueKind; profile: string | false; color: string;
  count: number; cap: number; timer: number;
  ready?: boolean; window?: number;
  points?: { x: number; y: number; tier: number; radius: number }[];
}
export function payloadCueProfile(inst: SkillInstance, kind: PayloadCueKind): string | false {
  const key = inst.def.payloadCues?.[kind];
  if (key === false) return false;
  const d = instanceDelivery(inst);
  if (key === undefined && kind === 'carom' && d.type === 'projectile' && d.caroms?.hang) return 'arrow';
  return key && Object.hasOwn(PAYLOAD_CUE_STYLES, key) ? key : PAYLOAD_CUE_DEFAULTS[kind];
}
export function payloadCueStyle(row: Pick<PayloadCueRow, 'profile' | 'kind'>) {
  if (row.profile === false) return undefined;
  return PAYLOAD_CUE_STYLES[Object.hasOwn(PAYLOAD_CUE_STYLES, row.profile) ? row.profile : PAYLOAD_CUE_DEFAULTS[row.kind]];
}
/** Shared with the real placement gate, including instance-local bounce mods. */
export function caromCapacity(a: Actor, inst: SkillInstance): number {
  const d = instanceDelivery(inst);
  return d.type === 'projectile' && d.caroms
    ? d.caroms.anchors + Math.max(0, Math.round(a.sheet.get('projBounce', skillContextTags(inst, grantedTags(inst)), instanceMods(inst)))) : 0;
}
export function payloadTransition(a: Actor, inst: SkillInstance, kind: PayloadCueKind, release = false) {
  const style = payloadCueStyle({ profile: payloadCueProfile(inst, kind), kind });
  return style ? combatCueFlash(a.pos, release ? style.release : style.load,
    a.radius + PAYLOAD_CUE_CFG.transitionPad, a.facing, inst.def.color) : undefined;
}
/** Pure read: never lazily creates a charge bank or advances a timer. The host
 * sends the same derived rows for all actor kinds, including lingering ambushes. */
export function payloadCueRows(a: Actor, w: Pick<World, 'time' | 'pendingAmbushes' | 'minionsOfSkill' | 'actorById'>): PayloadCueRow[] {
  if (a.dead) return [];
  if (a.payloadCues !== undefined) return a.payloadCues;
  const rows: PayloadCueRow[] = [], seen = new Set<string>();
  const ambushes = w.pendingAmbushes.filter(am => am.caster === a);
  const skills = [...a.skills, ...ambushes.map(am => am.inst)];
  for (const inst of skills) {
    if (!inst || seen.has(inst.def.id)) continue;
    seen.add(inst.def.id);
    const base = { skillId: inst.def.id, color: inst.def.color, timer: 0 };
    const count = a.primedPours.filter(p => p.skillId === inst.def.id).length;
    if (count) rows.push({ ...base, kind: 'prime', profile: payloadCueProfile(inst, 'prime'), count, cap: count });
    const uc = instanceUseCharges(inst);
    if (uc) {
      const cap = a.skillChargeCap(inst), bank = a.skillChargeState.get(inst.def.id);
      const body = inst.def.payloadCues?.ammo !== undefined || (!uc.still && uc.empower === undefined && !uc.ventAll && (!!uc.magazine || !uc.recharge));
      rows.push({ ...base, kind: 'ammo', profile: body ? payloadCueProfile(inst, 'ammo') : false,
        cap, count: bank?.count ?? cap, timer: bank?.timer ?? 0 });
    }
    const d = instanceDelivery(inst);
    const am = ambushes.find(am => am.inst.def.id === inst.def.id);
    if (!am && (d.type !== 'projectile' || !d.caroms)) continue;
    const cap = am?.arrowIds.length ?? caromCapacity(a, inst), profile = payloadCueProfile(inst, 'carom');
    if (am || (d.type === 'projectile' && d.caroms?.hang)) {
      const arrows = am ? am.arrowIds.map(id => w.actorById(id)).filter((b): b is Actor => !!b && !b.dead)
        : w.minionsOfSkill(a, inst.def.id).filter(b => b.construct?.kind === 'embed');
      // A broken/expired armed set is already doomed; do not pretend it can spring.
      if (am && (w.time >= am.deadline || arrows.length !== am.arrowIds.length)) continue;
      rows.push({ ...base, kind: 'carom', profile: am ? payloadCueProfile(am.inst, 'carom') : profile,
        color: am?.inst.def.color ?? base.color, count: arrows.length, cap: am?.arrowIds.length ?? cap, ready: !!am,
        points: arrows.map(b => ({ ...b.pos, tier: b.tier ?? 0, radius: am?.triggerRadius ?? 0 })) });
    } else if (d.type === 'projectile' && d.caroms) {
      const age = w.time - (inst.state?.anchorsAt ?? -Infinity);
      const points = age <= d.caroms.window ? inst.state?.anchors ?? [] : [];
      rows.push({ ...base, kind: 'carom', profile, count: points.length, cap, ready: false,
        window: Math.max(0, Math.min(1, 1 - age / Math.max(0.001, d.caroms.window))),
        points: points.map(p => ({ ...p, tier: a.tier ?? 0, radius: 0 })) });
    }
  }
  return rows;
}
