// ---------------------------------------------------------------------------
// WARBANDS — the exemplar package (the brief's driving example).
//
// War hosts march from the mortal & beast factions' strongholds. This feature
// is ON by default from character level 3 (defaultEnabled, startLevel 3). Once
// the player slays a CROWNED enemy, the Vault surfaces this package's sliders
// for purchase; buying them lets the player retune, on the Expedition screen,
// WHEN warbands begin (0..101) and HOW OFTEN they march relative to other
// enabled packages. It routes its resolved pressure into the SHARED invasion
// field per-faction, so it can be weighted independently of Demon Invasions.
// ---------------------------------------------------------------------------

import type { ContentPackage } from '../types';

/** The factions whose war hosts ARE "warbands" (demons are their own package). The
 *  'bandit' opportunists (raised by the Holdfast package) are wired in as a FORWARD HOOK:
 *  they'll march once they hold ground, but today — kept neutral so the toll-wardens
 *  aren't attacked — they have no territory + no warlord, so the entry is dormant. */
export const WARBAND_FACTIONS = ['goblin', 'gnoll', 'wild', 'elemental', 'sylvan', 'undead', 'bandit'];

export const WARBANDS: ContentPackage = {
  id: 'warbands',
  label: 'Warbands',
  blurb: 'Roving war-hosts marshal behind crowned champions and march the frontier.',
  color: '#c89b3c',
  cost: 90,
  unlock: {
    id: 'warbands_unlock',
    label: 'Slay a Crowned enemy',
    test: (ctx) => (ctx.ledger.crowned_killed ?? 0) >= 1,
  },
  modifiers: [
    { id: 'warbands_start', kind: 'startLevel', label: 'Warbands begin at level', min: 0, max: 101, step: 1, defaultValue: 3 },
    { id: 'warbands_weight', kind: 'weight', label: 'Warband frequency', min: 0, max: 100, step: 5, defaultValue: 50 },
  ],
  defaultWeight: 50,
  defaultStartLevel: 3,
  defaultEnabled: true,
  world: { invasionFactions: WARBAND_FACTIONS },
  rewards: {
    warlord_bounty: { rep: 25, gems: 2, ledger: { warlords_killed: 1 } },
  },
  quests: [
    { id: 'warbands_cull', label: 'Cull the war-hosts', steps: [{ id: 's1', label: 'Break 3 sieges', counter: 'sieges', need: 3 }], reward: { gems: 3 } },
  ],
  relationships: [
    { a: 'breach', b: 'warbands', kind: 'amplifies', strength: 1.15 },
  ],
};
