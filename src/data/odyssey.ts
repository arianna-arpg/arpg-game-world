import { MONSTERS } from './monsters';

/** Content and pacing knobs for the first Odyssey campaign slice. */
export const ODYSSEY_CFG = {
  rosterSize: 4, readiness: [23, 45, 60, 75], operationLevel: 12,
  pointsPerLeader: 2, gemsPerLeader: 6, passivePointsPerLeader: 1,
  leadsFromKills: 4, escortPerAct: [2, 4, 6, 8],
  bandit: {
    startsAfter: 1, everySec: [240, 180, 120, 90], preparedInterval: 1.75,
    sightRange: 440, sightArc: Math.PI * 0.8, warningSec: 1.5,
    spawnDistance: 560, responseDelaySec: 12, hunters: [0, 4, 6, 8],
    orderSec: 180, turfPerAct: 2, turfInfluence: 30,
    huntRoster: ['bandit_cutthroat', 'bandit_bruiser', 'bandit_fusilier'],
  },
  goblin: {
    startsAfter: 2, everySec: [900, 900, 720, 480], warningSec: 90,
    defenseSec: 240, waveSize: 4, waves: [0, 0, 3, 4], waveGapSec: 8,
    preparedInterval: 1.5, preparedWaveReduction: 1, rewardGems: 3,
    roster: ['goblin_skirmisher', 'goblin_shaman'],
  },
};

export interface OdysseyFactionDef {
  id: string; name: string; leader: string; leaderName: string; kit: string;
  tileset: string; direction: 'n' | 's' | 'e' | 'w'; escort: string;
  operation: string; clue: string;
}

export const ODYSSEY_FACTIONS: OdysseyFactionDef[] = [
  { id: 'goblin', name: 'Goblins', leader: 'odyssey_goblin', leaderName: 'Grask, Keeper of the War Chest', kit: 'goblin_chief', tileset: 'meadow', direction: 'e', escort: 'goblin_shaman', operation: 'Burn the siege stores', clue: 'Their siege stores contain stones that pulse toward the same distant signal.' },
  { id: 'bandit', name: 'Bandits', leader: 'odyssey_bandit', leaderName: 'Veyra, the Road Sovereign', kit: 'toll_king', tileset: 'meadow', direction: 'w', escort: 'bandit_fusilier', operation: 'Seize the dispatch ledger', clue: 'The stolen dispatches price passage toward a signal no map names.' },
  { id: 'undead', name: 'Undead', leader: 'odyssey_undead', leaderName: 'Nhal, Marshal of the Last Procession', kit: 'lich_marshal', tileset: 'crypt', direction: 's', escort: 'skeleton_archer', operation: 'Silence the mustering crypt', clue: 'The dead march to a pulse older than their orders. Its bearing matches the signal.' },
  { id: 'beastkin', name: 'Beastkin', leader: 'odyssey_beastkin', leaderName: 'Orun, the Crown of Hooves', kit: 'beastlord_khan', tileset: 'foothills', direction: 'w', escort: 'beastkin_impaler', operation: 'Break the tribute convoy', clue: 'Their tribute marks a migration away from the distant pulse.' },
  { id: 'demon', name: 'Demons', leader: 'odyssey_demon', leaderName: 'Azrath, the Furnace Regent', kit: 'balor_warlord', tileset: 'wasteland', direction: 'n', escort: 'imp', operation: 'Quench the offering furnace', clue: 'Their furnace draws power from the signal, but its keepers fear the next beat.' },
  { id: 'carven', name: 'Carven', leader: 'odyssey_carven', leaderName: 'The Root-Crowned Sovereign', kit: 'carven_king', tileset: 'tendersrows', direction: 'e', escort: 'vine_marionette', operation: 'Break the root tithe', clue: 'Carved rings record attempts to contain the same distant pulse.' },
  { id: 'chitin', name: 'Chitin', leader: 'odyssey_chitin', leaderName: 'The Amber Matriarch', kit: 'brood_sovereign', tileset: 'marsh', direction: 's', escort: 'chitin_lancer', operation: 'Destroy the brood provisions', clue: 'Amber chambers echo the signal. The brood has been listening.' },
  { id: 'gnoll', name: 'Gnolls', leader: 'odyssey_gnoll', leaderName: 'Rakh, Voice of the Long Hunger', kit: 'gnoll_howler', tileset: 'stonecrown', direction: 'w', escort: 'gnoll_longshot', operation: 'Scatter the war feast', clue: 'The war chants answer the same pulse with a warning, not a prayer.' },
];

// Distinct identities keep ambient warlords and tutorial commanders from
// accidentally writing campaign milestones. Existing kits are prototype art/combat.
for (const f of ODYSSEY_FACTIONS) {
  const base = MONSTERS[f.kit];
  MONSTERS[f.leader] = { ...base, id: f.leader, name: f.leaderName, faction: f.id };
}
MONSTERS.odyssey_messenger = {
  ...MONSTERS.bandit_cutthroat, id: 'odyssey_messenger', name: 'Bandit Messenger',
  base: { ...MONSTERS.bandit_cutthroat.base, moveSpeed: 155 },
  brain: { type: 'skirmish' }, skills: ['claw'],
};

export const odysseyFaction = (id: string): OdysseyFactionDef => ODYSSEY_FACTIONS.find(f => f.id === id)!;
export const odysseyQuestId = (id: string, step: 'operation' | 'leader'): string => `odyssey_${step}_${id}`;
export const ODYSSEY_SURVEY = 'odyssey_signal_survey';
export const ODYSSEY_TUTORIAL_RELEASE = 'odyssey_tutorial_leader_defeated';
