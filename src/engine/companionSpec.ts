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
  /** THE STANCE ART (engine/companionStances.ts): a catalog skill every
   *  living beast of the bond casts at its own feet when the keeper SHIFTS
   *  the stance — the tree's hook on a behavioral change (the shift itself
   *  is an honest cast of companion_stance, so cast procs already see it). */
  stanceArt?: string;
}

/** Fabric-wide COMPANION dials. `level`: how a bonded body's LEVEL is derived
 *  each refresh — 'keeper' grows the bond with the keeper (the level-one
 *  hound is a level-twenty hound beside a level-twenty Tamer), keeping a
 *  beast claimed ABOVE the keeper at its wild level until the keeper catches
 *  up (`keepClaimed`); 'claimed' is the pre-2026-09-16 reading (a body
 *  stays the level it was claimed at, forever). `offset` shifts the tracked
 *  level (a future "beasts run two levels behind" lever). */
export const COMPANION_CFG = {
  level: { follow: 'keeper' as 'keeper' | 'claimed', keepClaimed: true, offset: 0 },
};

/** The level a bonded body should stand at beside its keeper. */
export function companionLevelOf(keeperLevel: number, claimedLevel: number): number {
  const c = COMPANION_CFG.level;
  const claimed = Math.max(1, Math.round(claimedLevel));
  if (c.follow !== 'keeper') return claimed;
  const tracked = Math.max(1, Math.round(keeperLevel + c.offset));
  return c.keepClaimed ? Math.max(claimed, tracked) : tracked;
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
    for (const field of ['attackOrb', 'attackCharge', 'rally', 'frenzy', 'mimicMelee', 'dread', 'whistle', 'stanceArt'] as const) {
      if (patch[field]) Object.assign(out, { [field]: patch[field] });
    }
  }
  return out;
}
