import { FONT_CFG } from '../data/essences';
import { SKILL_EMPOWERMENT } from '../data/skillEmpowerment';
import { SKILLS } from '../data/skills';
import { skillGemPayloadOf, skillOfGemItem } from './gemitems';
import type { ItemInstance, SkillGemPayload } from './items';
import { empowermentRank } from './skillEmpowerment';
import { makeSkillGem, SKILL_RARITIES, type SkillInstance, type SkillRarity } from './skills';

export interface SkillMergePlan {
  need: number;
  available: number;
  barred: number;
  taken: ItemInstance[];
  result?: SkillInstance;
  /** Supports on these inputs return intact; the legendary keeper retains its own. */
  returnSockets: ItemInstance[];
  refusal: string | null;
}

/** One read for the Font preview and mutation. Everything is resolved before
 * anything is consumed; sort by rank, then level, then stable bag order. */
export function skillMergePlan(items: readonly ItemInstance[], skillId: string, rarity: SkillRarity): SkillMergePlan {
  const legendary = rarity === 'legendary';
  const need = legendary ? SKILL_EMPOWERMENT.copiesPerMerge : FONT_CFG.merge[rarity] ?? 0;
  const all = items.map(item => ({ item, p: skillGemPayloadOf(item) }))
    .filter((r): r is { item: ItemInstance; p: SkillGemPayload } => !!r.p && r.p.skillId === skillId && r.p.rarity === rarity);
  const eligible = all.filter(r => !r.item.locked && !r.p.granted);
  const plan: SkillMergePlan = { need, available: eligible.length, barred: all.length - eligible.length,
    taken: [], returnSockets: [], refusal: null };
  const refuse = (why: string): SkillMergePlan => ({ ...plan, refusal: why });
  const def = SKILLS[skillId];
  if (!def || !Number.isSafeInteger(need) || need < 2 || (legendary && !SKILL_EMPOWERMENT.enabled)) return refuse('Merging is unavailable.');
  if (eligible.length < need) return refuse(`the font asks ${need} alike`);
  eligible.sort((a, b) => (legendary ? empowermentRank(b.p) - empowermentRank(a.p) : 0) || b.p.level - a.p.level);
  const taken = eligible.slice(0, need);
  const level = Math.max(...taken.map(r => r.p.level));
  if (!Number.isFinite(level) || level < 1) return refuse('Invalid skill investment.');
  let result: SkillInstance;
  if (legendary) {
    const keeper = skillOfGemItem(taken[0].item);
    if (!keeper) return refuse('This skill is unavailable.');
    const gain = SKILL_EMPOWERMENT.ranksPerMerge;
    const rank = empowermentRank(keeper) + gain + (SKILL_EMPOWERMENT.preserveDonorRanks
      ? taken.slice(1).reduce((sum, r) => sum + empowermentRank(r.p), 0) : 0);
    if (!Number.isSafeInteger(gain) || gain < 1 || !Number.isSafeInteger(rank)) return refuse('Invalid empowerment policy.');
    if (SKILL_EMPOWERMENT.maxRank !== null && rank > SKILL_EMPOWERMENT.maxRank) return refuse('Empowerment limit reached.');
    result = { ...keeper, level, empowermentRank: rank };
  } else {
    const ladder = Object.keys(SKILL_RARITIES) as SkillRarity[];
    const next = ladder[ladder.indexOf(rarity) + 1];
    if (!next) return refuse('No higher rarity.');
    result = makeSkillGem(def, level, next);
  }
  return { ...plan, taken: taken.map(r => r.item), result,
    returnSockets: (legendary ? taken.slice(1) : taken).map(r => r.item) };
}
