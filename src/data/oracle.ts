import { FEATURE } from '../meta/account';
import type { QuestRescue } from '../quests/types';

export const ORACLE_RESCUED = 'oracle_rescued';
/** Rescue grants services directly; it is never bought with crafting expertise. */
export const ORACLE_RESCUE: QuestRescue = {
  ledger: ORACLE_RESCUED, legacyLedger: 'revenge_taken', npc: 'townsfolk_oracle',
  captiveName: 'The Captive Oracle', captiveLook: 'npc_oracle_bound',
  freeLook: 'npc_scholar', offset: { x: 75, y: 30 },
  features: [FEATURE.ORACLE_STONE, FEATURE.RELIQUARY],
  message: 'The Oracle is free. Meet him among Lastlight’s standing stones. The Reliquary has opened.',
};
