import type { QuestDef } from './types';
import { FACTIONS } from '../data/monsters';
import { ODYSSEY_CFG, ODYSSEY_FACTIONS, ODYSSEY_SURVEY, odysseyQuestId } from '../data/odyssey';

export function odysseyQuestDefs(): QuestDef[] {
  const quests = ODYSSEY_FACTIONS.flatMap(f => (['operation', 'leader'] as const).map(step => ({
    id: odysseyQuestId(f.id, step), category: 'odyssey' as const,
    giver: 'townsfolk_questgiver', offerAtLevel: 1,
    offerLabel: step === 'operation' ? `${f.name}: ${f.operation} (optional)` : `Odyssey: Defeat ${f.leaderName}`,
    // World opportunities are enrolled by Odyssey, never independently rolled by the giver.
    gate: () => false,
    zone: { tileset: f.tileset, direction: f.direction,
      level: step === 'operation' ? ODYSSEY_CFG.operationLevel : ODYSSEY_CFG.readiness[0],
      bandPlacement: true, forceWaypoint: true,
      objective: step === 'operation' ? { kind: 'clear' as const, frac: 0.75 } : { kind: 'boss' as const, id: f.leader },
      packsOverride: { count: [4, 5] as [number, number], size: [2, 3] as [number, number], table: FACTIONS[f.id]?.table ?? [{ id: f.escort, weight: 1 }] },
    },
    // Leader pay is handled by the once-per-world milestone, never a second quest receipt.
    reward: step === 'operation' ? { xp: 1200, gems: 3 } : {},
  })));
  return [...quests, {
    id: ODYSSEY_SURVEY, category: 'odyssey', giver: 'townsfolk_questgiver', offerAtLevel: 1,
    offerLabel: 'Trace the shared signal — secure the survey ground', gate: () => false,
    zone: { tileset: 'meadow', direction: 'n', level: 80, bandPlacement: true, forceWaypoint: true, objective: { kind: 'clear', frac: 0.75 } },
    reward: { xp: 10000, gems: 6 },
  }];
}
