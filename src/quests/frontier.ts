import type { QuestDef } from './types';

/** The native quest/reward pipeline supplies the whole return leg. Geography
 * adapters decide whether this contract has a real destination in this run. */
export const Q_FRONTIER_WATCH: QuestDef = {
  id: 'frontier_western_watch',
  geographies: ['continuous'],
  giver: 'townsfolk_innkeep',
  offerAtLevel: 1,
  offerLabel: 'The Western Watch — clear Cinderwatch Camp',
  zone: { name: 'Cinderwatch Camp', tileset: 'downs', direction: 'w', level: 1,
    objective: { kind: 'clear', frac: 1 }, forceWaypoint: false },
  turnIn: { giver: 'townsfolk_innkeep',
    prompt: 'Cinderwatch is cleared. Return to Mireille at the Lastlight inn and choose your reward.' },
  reward: {
    xp: 80, ledger: { quests_completed: 1 },
    choicePrompt: '“A road we can trust again. Take something to help you on the next one.” Choose one ring.',
    choices: [
      { id: 'hearth', name: 'Hearthward Ring', baseId: 'ring_coral', affixes: ['life_regen'],
        description: 'More life and steady life recovery for long expeditions.' },
      { id: 'spring', name: 'Wellspring Ring', baseId: 'ring_lapis', affixes: ['mana_regen'],
        description: 'More mana and steady mana recovery for repeated skills.' },
      { id: 'iron', name: 'Watchkeeper’s Ring', baseId: 'ring_iron', affixes: ['life'],
        description: 'Physical attack damage and additional life for the next close fight.' },
    ],
  },
};

/** A paid current-run contract leads to a specific original guardian.
 * Escort clearance and cache searches remain separate optional work. */
export const Q_FRONTIER_STONEWARD: QuestDef = {
  id: 'frontier_northern_watch',
  geographies: ['continuous'],
  giver: 'townsfolk_innkeep',
  offerAtLevel: 3,
  requiresQuests: [Q_FRONTIER_WATCH.id],
  offerLabel: 'The Northern Watch — defeat the Stone Sentinel at the Stoneward',
  zone: { name: 'The Stoneward', tileset: 'downs', direction: 'n', level: 4,
    objective: { kind: 'boss', id: 'stone_sentinel' }, forceWaypoint: false },
  turnIn: { giver: 'townsfolk_innkeep',
    prompt: 'The Stone Sentinel has fallen. Return to Mireille at the Lastlight inn for a passive point and experience.' },
  reward: { xp: 160, passivePoints: 1, ledger: { quests_completed: 1 } },
};
