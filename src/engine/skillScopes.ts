import type { SkillTag } from './stats';

/** Content registers membership; combat never infers a family from an id. */
const families = new Map<string, readonly string[]>();
export function registerMinionFamily(family: string, bodies: readonly string[]): void {
  for (const body of bodies) families.set(body, [...new Set([...(families.get(body) ?? []), family])]);
}
export function minionBodyTags(body: string): SkillTag[] {
  return [`body:${body}`, ...(families.get(body) ?? []).map(f => `minion:${f}` as SkillTag)];
}
/** A mixed pool qualifies only for memberships shared by EVERY possible body.
 *  Exact-body investment is folded separately when each creature is baked. */
export function summonScopeTags(bodies: readonly string[]): SkillTag[] {
  if (!bodies.length) return [];
  const sets = bodies.map(b => new Set(minionBodyTags(b)));
  return [...sets[0]].filter(t => sets.every(s => s.has(t)));
}
export function minionBodyContext(tags: Set<SkillTag>, body?: string): Set<SkillTag> {
  const out = new Set([...tags].filter(t => !t.startsWith('minion:') && !t.startsWith('body:')));
  if (body) for (const tag of minionBodyTags(body)) out.add(tag);
  return out;
}
