import type { QuestDef, QuestZoneSpec } from './types';
import { ORACLE_RESCUED } from '../data/oracle';
import { Rng } from '../core/rng';

export const RELIQUARY_QUEST_ID = 'relic_east_l8';
export const RELIQUARY_LESSON = 'reliquary_lesson';
export const RELIQUARY_CHOICES: NonNullable<QuestDef['reward']['choices']> = [
  { id: 'hearth', name: 'Hearthkeeper’s Charm', baseId: 'relic_charm',
    affixes: ['relic_life'], description: 'Maximum life. A little warmth kept for the living.' },
  { id: 'well', name: 'Stillwell Charm', baseId: 'relic_charm',
    affixes: ['relic_mana'], description: 'Maximum mana. The last clear drop in a sealed well.' },
  { id: 'veil', name: 'Vigilkeeper’s Charm', baseId: 'relic_charm',
    affixes: ['relic_es'], description: 'Energy shield. The keeper’s watch passes into your hands.' },
];

/** A separate stream: accepting other quests or fighting never changes the site. */
export function resolveQuestZone(q: QuestDef, questSeed: number): QuestZoneSpec {
  return q.zoneVariants?.length ? new Rng(questSeed).pick(q.zoneVariants) : q.zone;
}

const burialSite = (name: string, tileset: string, direction: QuestZoneSpec['direction'],
  boss: string): QuestZoneSpec => ({
  name, tileset, direction, distance: 2, level: 8, bandPlacement: true,
  objective: { kind: 'boss', id: boss },
  packsOverride: { count: [5, 7], size: [3, 4], table: [
    { id: 'skeleton_warrior', weight: 3 }, { id: 'skeleton_archer', weight: 2 },
    { id: 'zombie', weight: 2 }, { id: 'crypt_warden', weight: 1 },
  ] },
  forceWaypoint: true,
});

const sites = [
  burialSite('The Unremembered Chapel', 'crypt', 's', 'gravecaller'),
  burialSite('The Bonekeeper’s Vigil', 'ossuary', 'w', 'gravecaller'),
  { ...burialSite('The Silent Keeping', 'crypt', 'e', 'gravecaller'),
    objective: { kind: 'clear', frac: 0.75 } as const },
];

/** The old lost-relic quest now pays the relic it promises. Repeats on a new
 * character, so losing the first charm before the lesson never seals an account. */
export const Q_RELIQUARY: QuestDef = {
  id: RELIQUARY_QUEST_ID,
  giver: 'townsfolk_oracle', offerAtLevel: 8, requiresLedger: ORACLE_RESCUED,
  offerLabel: 'A Place for the Unremembered — recover a forgotten shrine’s keepsakes',
  zone: sites[0], zoneVariants: sites,
  turnIn: {
    giver: 'townsfolk_oracle',
    prompt: 'The shrine is quiet. Return to the Oracle to choose a recovered charm for your Reliquary.',
  },
  reward: {
    xp: 500,
    choicePrompt: '“We keep their names. You carry their courage.” Choose one recovered charm for the Reliquary. Every charm fits its first seat and can be used immediately.',
    ledger: { quests_completed: 1, relic_recovered: 1 },
    choices: RELIQUARY_CHOICES,
  },
  next: 'relic_depths_l8',
};
