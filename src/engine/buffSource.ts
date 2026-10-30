import type { BuffEffect, SkillDef, SkillInstance } from './skills';

/** Copied presentation identity, independent of hotbar membership or registries.
 * Runtime-authored skills can supply the same icon and semantic tag fallbacks. */
export type BuffSkillSource = Pick<SkillDef, 'id' | 'name' | 'color' | 'icon' | 'tags'>;

/** Attribute at the grant, never by guessing from a buff's id or display name.
 * Follow-up payloads retain their parent skill's face. Replays (e.g. sympathy)
 * carry this metadata with the buff without changing its mechanics. */
export function buffWithSource(buff: BuffEffect, inst?: SkillInstance | null): BuffEffect {
  if (!inst) return buff;
  let source: SkillInstance = inst;
  const seen = new Set<SkillInstance>();
  while (!seen.has(source)) {
    seen.add(source);
    const host: SkillInstance | undefined = source.followUpHost ?? source.invocationHost ?? source.challengeHost ?? source.guardArtsHost ?? source.sequenceHost;
    if (!host || seen.has(host)) break;
    source = host;
  }
  const { id, name, color, icon, tags } = source.def;
  return { ...buff, sourceSkill: { id, name, color, icon, tags: [...tags] } };
}
