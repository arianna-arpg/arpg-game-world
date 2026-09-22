import type { QuestDef } from './types';
import { BRANDT_CFG, BRANDT_HAMMER_QUEST, BRANDT_TROPHY_QUEST } from '../data/brandt';
import { questDoneKey } from '../meta/account';

/** Same quarry, different reason to return: the account remembers the first life. */
export function brandtQuestDefs(): QuestDef[] {
  return [false, true].map(repeat => ({
    id: repeat ? BRANDT_TROPHY_QUEST : BRANDT_HAMMER_QUEST,
    giver: 'townsfolk_smith', offerAtLevel: BRANDT_CFG.quest.offerLevels[0],
    offerLevelRange: BRANDT_CFG.quest.offerLevels,
    offerLabel: repeat ? 'Embers for the Anvil — bring Brandt Cindermaw’s iron fang'
      : 'The Weight of Honest Work — recover Brandt’s hammer from Cindermaw',
    gate: ctx => !!ctx.features?.has(BRANDT_CFG.magicWares.flag)
      && ((ctx.accountLedger[questDoneKey(BRANDT_HAMMER_QUEST)] ?? 0) > 0) === repeat
      && !ctx.runLedger[questDoneKey(BRANDT_HAMMER_QUEST)]
      && !ctx.runLedger[questDoneKey(BRANDT_TROPHY_QUEST)],
    zone: {
      name: 'The Cold Cinder Forge', tileset: 'crypt', direction: 'e',
      level: BRANDT_CFG.quest.level, bandPlacement: true, forceWaypoint: true,
      objective: { kind: 'boss', id: BRANDT_CFG.quest.monster },
      packsOverride: { count: [5, 7], size: [3, 4], table: [
        { id: 'zombie', weight: 3 }, { id: 'skeleton_warrior', weight: 3 },
        { id: 'crypt_warden', weight: 1 },
      ] },
    },
    collect: { baseId: repeat ? 'quest_trophy' : 'quest_hammer',
      name: repeat ? 'Cindermaw’s Iron Fang' : 'Brandt’s Hammer' },
    turnIn: { giver: 'townsfolk_smith', prompt: repeat
      ? 'Cindermaw falls. Collect its iron fang and return to Brandt.'
      : 'Cindermaw falls. Collect Brandt’s hammer and bring it home.' },
    reward: { xp: 600, ledger: { quests_completed: 1 },
      imbue: { level: BRANDT_CFG.quest.level, choices: BRANDT_CFG.quest.choices,
        prompt: '“Bring me a magic piece you mean to keep. I can give it one more honest strength.”' } },
  }));
}
