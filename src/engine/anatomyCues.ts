import type { Actor, MonsterPartDef } from './actor';
import { ANATOMY_CUE_CFG, ANATOMY_CUE_STYLES } from '../data/anatomyCues';
import { anatomyMaterial, weakPointWindows, type WeakPointWindow } from './weakpoints';
import { combatCueFlash } from './combatCues';

export interface AnatomyPartCue {
  id: number; dx: number; dy: number; size: number; frac: number; broken: boolean;
  profile: string; color: string;
}
export interface AnatomySegmentCue { index: number; frac: number; broken: boolean; profile: string; color: string; }
export interface AnatomyCueState {
  weakpoints: WeakPointWindow[]; parts: AnatomyPartCue[]; segments: AnatomySegmentCue[];
  part?: AnatomyPartCue;
}
const fraction = (n: number) => Math.max(0, Math.min(1, n));
function partCue(part: Actor, root: Actor, def: MonsterPartDef): AnatomyPartCue {
  return { id: part.id, dx: def.dx, dy: def.dy, size: part.radius / Math.max(1, root.radius),
    frac: fraction(part.life / Math.max(1, part.maxLife())), broken: part.dead,
    ...anatomyMaterial(def.breakCue || undefined, 'armor') };
}
/** Only a real break records a stump. Quiet expiry/root death do not use this. */
export function notePartScar(part: Actor, root: Actor, def: MonsterPartDef): void {
  clearPartScar(root, def);
  if (def.breakCue === false) return;
  root.partScars.push({ ...partCue(part, root, def), frac: 0, broken: true });
  if (root.partScars.length > ANATOMY_CUE_CFG.scarLimit) root.partScars.shift();
}
/** A replacement at the same attachment covers its old stump. */
export function clearPartScar(root: Actor, def: MonsterPartDef): void {
  root.partScars = root.partScars.filter(s => Math.abs(s.dx - def.dx) > 0.001 || Math.abs(s.dy - def.dy) > 0.001);
}
export function anatomyFlash(at: { x: number; y: number }, radius: number, facing: number,
  cue: { profile: string; color: string }) {
  return combatCueFlash(at, ANATOMY_CUE_STYLES[cue.profile]?.breakFlash ?? 'anatomy_part_break',
    radius + ANATOMY_CUE_CFG.breakPad, facing, cue.color);
}
/** Host-derived for every actor, including custom runtime grafts and worms.
 * Independent pools stay separate from the root's real life interval. */
export function anatomyCueState(a: Actor): AnatomyCueState {
  if (a.dead) return { weakpoints: [], parts: [], segments: [] };
  if (a.anatomyCues !== undefined) return a.anatomyCues;
  const parts = (a.partActors ?? []).filter(p => !p.dead && p.partLink && p.partLink.def.breakCue !== false)
    .map(p => partCue(p, a, p.partLink!.def));
  const w = a.worm, spec = w?.wounds;
  const segments = w?.hittable && spec && spec.cue !== false ? w.segments.map((_, index) => ({
    index, frac: w.wounded?.[index] ? 0 : fraction((w.woundHp?.[index] ?? spec.frac * a.maxLife()) / Math.max(1, spec.frac * a.maxLife())),
    broken: !!w.wounded?.[index], ...anatomyMaterial(spec.cue || undefined, 'flesh'),
  })) : [];
  const link = a.partLink;
  return { weakpoints: weakPointWindows(a), parts: [...parts, ...a.partScars].sort((l, r) => l.dy - r.dy || l.dx - r.dx || l.id - r.id), segments,
    part: link && link.def.breakCue !== false ? partCue(a, link.root, link.def) : undefined };
}
export function cloneAnatomyCues(cue: AnatomyCueState): AnatomyCueState {
  return { weakpoints: cue.weakpoints.map(r => ({ ...r })), parts: cue.parts.map(r => ({ ...r })),
    segments: cue.segments.map(r => ({ ...r })), part: cue.part ? { ...cue.part } : undefined };
}
/** Clear the highest attachment and its own health bar; broken sockets retain
 * their place so the component row does not jump when a limb falls away. */
export function anatomyOverheadRise(cue: AnatomyCueState, radius: number, facing: number): number {
  const c = Math.cos(facing), s = Math.sin(facing);
  return cue.parts.reduce((height, p) => Math.max(height, (-p.dx * s - p.dy * c + p.size) * radius), radius);
}
