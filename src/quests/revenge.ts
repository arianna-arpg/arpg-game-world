// ---------------------------------------------------------------------------
// THE REVENGE CHAIN — generated per tutorial faction (data/commanders.ts).
//
// The tutorial's death is a debt: Odyssey gives the personal lead immediately,
// with a level-10 cull and a commander ready around level 14. The old-road cull
// reveals the camp, which can also be found independently. Its LEGION COMMANDER
// is the very Father whose reckoning
// killed you — to ground in his own war-camp. A young account's target is
// never random: the gate reads the `tutorial_faction:` stamp the prologue's
// roll left on the account, so the revenge aims at the legion that earned
// it. Accounts predating the stamp (grandfathered veterans) get the goblin
// chain — Ghorvane was always their canon opening.
//
// THE FIGHT IS THE LESSON PAID FORWARD: the commander keeps his tutorial kit
// whole — the ten-breath reckoning included — but out here there is no mercy
// floor and no director: the VOICE part he carries still silences the verb
// when broken (breakDisables), and this time you are finally strong enough
// to break it. Crack the voice or clear the blast; the tutorial taught you
// which part matters.
//
// The vocationQuestDefs() pattern: N pre-generated defs, exactly one chain
// live per account via gate(ctx.accountLedger). Spread into QUESTS at
// quests/defs.ts. Content references (tilesets, rosters, commander defs)
// are registry rows verified by balance/probe_mu.ts section H.
// ---------------------------------------------------------------------------

import type { QuestDef } from './types';
import { TUTORIAL_FACTIONS, tutorialFactionOf, type TutorialFactionRow } from '../data/commanders';
import { FACTIONS } from '../data/monsters';
import { ORACLE_RESCUE, ORACLE_RESCUED } from '../data/oracle';
import { RELIQUARY_CHOICES } from './reliquary';

/** Where each legion's war-camp country lies (tileset + compass off town). */
const REVENGE_GROUND: Record<string, { tileset: string; direction: 'n' | 'e' | 's' | 'w' }> = {
  goblin: { tileset: 'meadow', direction: 'e' },
  undead: { tileset: 'crypt', direction: 's' },
  beastkin: { tileset: 'foothills', direction: 'w' },
  demon: { tileset: 'wasteland', direction: 'n' },
  carven: { tileset: 'tendersrows', direction: 'e' },
  chitin: { tileset: 'marsh', direction: 's' },
  gnoll: { tileset: 'stonecrown', direction: 'w' },
};

export const revengeCullId = (f: string): string => `revenge_cull_${f}`;
export const revengeCommanderId = (f: string): string => `revenge_commander_${f}`;
/** The cull's payout key — the chain mechanism (Q2's requiresLedger). */
export const revengeTrailKey = (f: string): string => `revenge_trail:${f}`;

/** Which legion this account's revenge aims at: the tutorial stamp, else the
 *  goblin canon (grandfathered veterans predate the roll). */
export const revengeFactionOf = (accountLedger: Record<string, number>): string =>
  tutorialFactionOf(accountLedger) ?? 'goblin';

const cullQuest = (row: TutorialFactionRow): QuestDef => {
  const ground = REVENGE_GROUND[row.id] ?? REVENGE_GROUND.goblin;
  const packs = FACTIONS[row.id]?.table ?? [];
  return {
    id: revengeCullId(row.id),
    giver: 'townsfolk_questgiver',
    offerLabel: `Cull ${row.banner} on the old road`,
    offerAtLevel: 2, // Odyssey's personal lead arrives before the readiness band.
    // Exactly ONE legion's chain is live per account — the stamp decides.
    gate: (ctx) => !ctx.accountLedger[ORACLE_RESCUED] && revengeFactionOf(ctx.accountLedger) === row.id,
    zone: {
      tileset: ground.tileset, direction: ground.direction, level: 10,
      bandPlacement: true, // revenge ground sits in its own readiness band
      objective: { kind: 'clear', frac: 0.75 },
      packsOverride: { count: [7, 9], size: [3, 5], table: packs },
      forceWaypoint: true,
    },
    // Pays ON CLEAR (no turn-in): the trail key lands in the field, so the
    // commander's whereabouts are offered the moment you come home.
    reward: { xp: 1500, gems: 5, ledger: { quests_completed: 1, [revengeTrailKey(row.id)]: 1 } },
    next: revengeCommanderId(row.id),
  };
};

const commanderQuest = (row: TutorialFactionRow): QuestDef => {
  const ground = REVENGE_GROUND[row.id] ?? REVENGE_GROUND.goblin;
  const packs = FACTIONS[row.id]?.table ?? [];
  return {
    id: revengeCommanderId(row.id),
    giver: 'townsfolk_questgiver',
    offerLabel: `Run the legion commander to ground — free the captive Oracle`,
    rescue: ORACLE_RESCUE,
    offerAtLevel: 2, // the revenge trail opens the pursuit
    requiresLedger: revengeTrailKey(row.id), // giver fallback; Odyssey already seats the discoverable camp
    gate: (ctx) => !ctx.accountLedger[ORACLE_RESCUED] && revengeFactionOf(ctx.accountLedger) === row.id,
    zone: {
      tileset: ground.tileset, direction: ground.direction, level: 13,
      bandPlacement: true,
      objective: { kind: 'boss', id: row.commander, levelBonus: 1 },
      packsOverride: { count: [6, 8], size: [3, 5], table: packs },
      forceWaypoint: true,
    },
    reward: { xp: 2200, gems: 7, passivePoints: 1, ledger: { quests_completed: 1, revenge_taken: 1 },
      choices: RELIQUARY_CHOICES,
      choicePrompt: '“They wanted me to bind the dead to their war. You gave me another road.” Choose a charm for your newly opened Reliquary. Seat it in the case to awaken its strength.' },
    turnIn: {
      giver: 'townsfolk_oracle',
      prompt: 'The Father is felled and the Oracle is free. Meet him at Lastlight’s standing stones and choose a charm for your Reliquary.',
    },
  };
};

/** One cull + one commander hunt per tutorial faction — spread into QUESTS
 *  beside the vocation chains. */
export function revengeQuestDefs(): QuestDef[] {
  return TUTORIAL_FACTIONS.flatMap(row => [cullQuest(row), commanderQuest(row)]);
}
