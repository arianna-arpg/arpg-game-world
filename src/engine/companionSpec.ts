import type { Modifier } from './stats';
import type { MonsterRarity } from './rarity';
import { treeNodeOf, type SkillInstance } from './skills';

/** Additive tree vocabulary for a persistent, downable companion bond.
 * Scalars are maxima except explicitly additive cap terms and modifier arrays. */
export interface CompanionBondSpec {
  normalSure?: number;
  rareSure?: number;
  bossSure?: number;
  slotsAdd?: number;
  reviveSeconds?: number;
  beastMods?: Modifier[];
  beastSkills?: string[];
  familyArt?: boolean;
  attackOrb?: { chance: number; cooldown: number; kind: string };
  attackCharge?: { chance: number; cooldown: number; id: string };
  rally?: { maxStacks: number; damagePerStack: number; duration: number };
  rallyCapAdd?: number;
  frenzy?: { duration: number; attackSpeed: number; gapCloser: string };
  mimicMelee?: { cooldown: number; power: number };
  dread?: { radius: number; interval: number; damage: number; ramp: number; maxStacks: number };
  whistle?: { skillId: string; pulseSkill: string; duration: number; interval: number };
}

/** Remaining revival time survives save/zone changes; it never advances offline. */
export interface CompanionSaved {
  defId: string;
  level: number;
  skillId: string;
  downed?: boolean;
  reviveRemaining?: number;
  rarity?: MonsterRarity;
  name?: string;
  radius?: number;
  raritySources?: [string, Modifier[]][];
}

export function companionBondOf(inst: SkillInstance): CompanionBondSpec {
  const out: CompanionBondSpec = {};
  for (const id of [...(inst.treeNodes ?? [])].sort()) {
    const patch = treeNodeOf(inst.def, id)?.companionBond;
    if (!patch) continue;
    for (const field of ['normalSure', 'rareSure', 'bossSure', 'reviveSeconds'] as const) {
      if (patch[field] !== undefined) out[field] = Math.max(out[field] ?? 0, patch[field]!);
    }
    out.slotsAdd = (out.slotsAdd ?? 0) + (patch.slotsAdd ?? 0);
    out.rallyCapAdd = (out.rallyCapAdd ?? 0) + (patch.rallyCapAdd ?? 0);
    if (patch.beastMods) (out.beastMods ??= []).push(...patch.beastMods);
    if (patch.beastSkills) out.beastSkills = [...new Set([...(out.beastSkills ?? []), ...patch.beastSkills])];
    if (patch.familyArt) out.familyArt = true;
    for (const field of ['attackOrb', 'attackCharge', 'rally', 'frenzy', 'mimicMelee', 'dread', 'whistle'] as const) {
      if (patch[field]) Object.assign(out, { [field]: patch[field] });
    }
  }
  return out;
}
