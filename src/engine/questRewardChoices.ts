import type { Account } from '../meta/account';
import { isSkillUnlockedForSelection } from '../meta/unlocks';
import { memoryCatalog } from '../meta/memoryUnlocks';
import { SKILLS } from '../data/skills';
import type { QuestDef, QuestRewardChoice } from '../quests/types';

/** One live pool shared by previews and host-side claims. */
export function questRewardChoices(account: Account, q: QuestDef): readonly QuestRewardChoice[] {
  if (!q.reward.skillChoice) return q.reward.choices ?? [];
  return memoryCatalog().filter(c => c.kind === 'skill' && isSkillUnlockedForSelection(account, c.id))
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
    .map(c => ({ id: c.id, skillId: c.id, name: c.name, baseId: 'skill_gem', affixes: [],
      description: `${q.reward.skillChoice!.rarity} Memory · skill level ${q.reward.skillChoice!.level}. ${SKILLS[c.id].description ?? ''}` }));
}
