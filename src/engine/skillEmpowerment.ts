import { SKILL_EMPOWERMENT } from '../data/skillEmpowerment';
import { bandPointsAt, type SkillDef, type SkillInstance } from './skills';
import { treeGraph, treeNodeRanks } from './skilltree';

type EmpoweredCopy = { rarity?: string; empowermentRank?: number };

/** Untrusted saves/wire rows cannot grant fractional, negative or non-finite ranks. */
export function empowermentRank(copy: EmpoweredCopy): number {
  const rank = copy.empowermentRank;
  return copy.rarity === 'legendary' && Number.isSafeInteger(rank) && rank! > 0 ? rank! : 0;
}

/** Parenthesized numerals multiply by 1,000, keeping even large ranks compact. */
export function empowermentNumeral(rank: number): string {
  if (!Number.isSafeInteger(rank) || rank <= 0) return '';
  if (rank >= 4000) return `(${empowermentNumeral(Math.floor(rank / 1000))})${empowermentNumeral(rank % 1000)}`;
  let out = '';
  for (const [value, glyph] of [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'],
    [5, 'V'], [4, 'IV'], [1, 'I']] as const) {
    while (rank >= value) { out += glyph; rank -= value; }
  }
  return out;
}

export function skillInstanceName(inst: Pick<SkillInstance, 'def' | 'rarity' | 'empowermentRank'>): string {
  const numeral = empowermentNumeral(empowermentRank(inst));
  return inst.def.name + (numeral ? ` ${numeral}` : '');
}

/** Explicit authoring opt-in, never a guess from a node's position or bonuses.
 * Legacy sugar's neutral node is its declared passive slot unless opted out. */
export function empowermentPassive(def: SkillDef, nodeId: string): boolean {
  const node = treeGraph(def)?.nodes.get(nodeId)?.node;
  return !!node && (node.empowermentPassive ?? def.tree?.neutral?.id === nodeId);
}

export function hasEmpowermentPassive(def: SkillDef): boolean {
  return treeGraph(def)?.order.some(id => empowermentPassive(def, id)) ?? false;
}

export function empowermentPoints(inst: EmpoweredCopy): number {
  const reward = SKILL_EMPOWERMENT.reward;
  const points = reward.kind === 'passivePoints' ? empowermentRank(inst) * reward.pointsPerRank : 0;
  return Number.isSafeInteger(points) && points > 0 ? points : 0;
}

/** Bonus points pay passive ranks first. This assignment is derived, so a
 * respec or policy change cannot leave stale currency tags on allocations. */
export function treeAbilityNodes(inst: SkillInstance): string[] {
  let bonus = empowermentPoints(inst);
  return (inst.treeNodes ?? []).filter(id => {
    if (bonus > 0 && empowermentPassive(inst.def, id)) { bonus--; return false; }
    return true;
  });
}

export function treePointBudget(inst: SkillInstance): {
  ability: number; passive: number; abilityFree: number; passiveFree: number; total: number; free: number;
} {
  const ability = bandPointsAt(inst.level), passive = empowermentPoints(inst);
  const abilitySpent = treeAbilityNodes(inst).length;
  const passiveSpent = (inst.treeNodes?.length ?? 0) - abilitySpent;
  const abilityFree = Math.max(0, ability - abilitySpent), passiveFree = Math.max(0, passive - passiveSpent);
  return { ability, passive, abilityFree, passiveFree, total: ability + passive, free: abilityFree + passiveFree };
}

/** Only the authored passive slots gain capacity. Ordinary branch ranks stay fixed. */
export function treeInstanceNodeRanks(inst: SkillInstance, nodeId: string): number {
  return treeNodeRanks(inst.def, nodeId) + (empowermentPassive(inst.def, nodeId) ? empowermentPoints(inst) : 0);
}
