import type { Actor } from './actor';
import type { World, EmergeRecord } from './world';
import { instanceEffects } from './skills';
import { STATUS_DEFS } from './status';
import { COMPANION_STANCES } from '../data/companionStances';
import { MONSTERS } from '../data/monsters';
import { COMPANION_CUE_CFG as C, COMPANION_CUE_STYLES, type CompanionCueSpec } from '../data/companionCues';
import { combatCueFlash } from './combatCues';
import { stanceOfOrder } from './companionStances';

export type CompanionCueEvent = 'bind' | 'reject' | 'sever' | 'answer' | 'down' | 'unravel';
export interface CompanionCuePoint { id: number; x: number; y: number; tier: number; radius: number; }
export interface CompanionCueLink { kind: 'owner' | 'mend' | 'tame'; to: CompanionCuePoint; profile: string; color: string; progress?: number; broken?: boolean; }
export interface CompanionCueState {
  links: CompanionCueLink[];
  stance?: { profile: string; color: string };
  marks: { x: number; y: number; tier: number; color: string }[];
}
export interface CompanionCueFlash { event: CompanionCueEvent; tier: number; from?: CompanionCuePoint; }
export function companionCueStyle(profile: string) { return COMPANION_CUE_STYLES[Object.hasOwn(COMPANION_CUE_STYLES, profile) ? profile : 'bond']; }
export function companionMaterial(spec: CompanionCueSpec | undefined, fallback = 'bond') {
  const profile = spec?.profile && Object.hasOwn(COMPANION_CUE_STYLES, spec.profile) ? spec.profile : fallback;
  return { profile, color: spec?.color ?? companionCueStyle(profile).color };
}
export function companionCueVisible(a: Actor): boolean {
  return !a.dead && !a.burrow && !a.summonReform && !a.statuses.some(s => STATUS_DEFS[s.id]?.conceals);
}
const point = (a: Actor): CompanionCuePoint => ({ id: a.id, ...a.pos, tier: a.tier ?? 0, radius: a.radius });
export function companionCueFlash(a: Actor, event: CompanionCueEvent, from?: Actor, spec?: CompanionCueSpec | false) {
  if (spec === false) return;
  const color = spec ? companionMaterial(spec).color : event === 'bind' && a.sourceSkillId?.startsWith('__dominate:') ? companionCueStyle('thrall').color : undefined;
  return { ...combatCueFlash(a.pos, 'companion_' + event, a.radius + C.eventPad, a.facing, color),
    companionCue: { event, tier: a.tier ?? 0, from: from && companionCueVisible(from) ? point(from) : undefined } satisfies CompanionCueFlash };
}
export function companionCueSpec(a: Actor): CompanionCueSpec | false | undefined {
  return a.summonInst?.def.companionCue ?? a.owner?.skills.find(s => s?.def.id === a.sourceSkillId?.replace('__companion:', '').replace('__dominate:', ''))?.def.companionCue
    ?? (a.defId ? MONSTERS[a.defId]?.companionCue : undefined);
}
/** Authoritative relationships, never inferred from faction color or a caption. */
export function companionCueState(a: Actor, w: Pick<World, 'actorById'>): CompanionCueState {
  if (!companionCueVisible(a)) return { links: [], marks: [] };
  if (a.companionCues !== undefined) return { ...a.companionCues, links: a.companionCues.links.flatMap(l => {
    const to = w.actorById(l.to.id);
    return to && companionCueVisible(to) ? [{ ...l, to: point(to) }] : [];
  }) };
  const links: CompanionCueLink[] = [], marks: CompanionCueState['marks'] = [];
  const spec = companionCueSpec(a);
  if (spec !== false && a.owner && !a.construct && companionCueVisible(a.owner))
    links.push({ kind: 'owner', to: point(a.owner), ...companionMaterial(spec, a.sourceSkillId?.startsWith('__dominate:') ? 'thrall' : 'bond') });
  if (!a.downed && a.bond) {
    const b = w.actorById(a.bond.targetId);
    if (b && companionCueVisible(b) && b.buffs.has(a.bond.buffId)) links.push({ kind: 'mend', to: point(b), ...companionMaterial(undefined, 'mend') });
  }
  const cs = a.casting;
  if (!a.downed && cs && cs.inst.def.companionCue !== false && instanceEffects(cs.inst).some(f => f.type === 'tame')) {
    const b = (cs.targetInfo as { actor?: Actor } | undefined)?.actor ?? (cs.quarryId !== undefined ? w.actorById(cs.quarryId) : undefined);
    if (b && companionCueVisible(b) && !b.downed) links.push({ kind: 'tame', to: point(b), ...companionMaterial(cs.inst.def.companionCue),
      progress: Math.max(0, Math.min(1, cs.elapsed / Math.max(0.001, cs.total))), broken: cs.focusBroken || a.isStunned() });
  }
  for (const s of a.skills) if (s?.state?.markPos && s.def.companionCue !== false)
    marks.push({ ...s.state.markPos, tier: a.tier ?? 0, color: s.def.companionCue?.color ?? s.def.color });
  const stanceId = stanceOfOrder(a.standingOrder);
  const stance = stanceId ? COMPANION_STANCES[stanceId] : undefined;
  return { links, marks, stance: !a.downed && !a.companionDormant && stance && stance.cue !== false
    ? companionMaterial(stance.cue, 'bond') : undefined };
}
export function cloneCompanionCues(row: CompanionCueState): CompanionCueState {
  return { links: row.links.map(l => ({ ...l, to: { ...l.to } })), marks: row.marks.map(m => ({ ...m })), stance: row.stance && { ...row.stance } };
}
export function cloneRecoveryCue(row: EmergeRecord): EmergeRecord {
  return { ...row, pos: { ...row.pos }, spec: { ...row.spec, grains: [...row.spec.grains] } };
}
