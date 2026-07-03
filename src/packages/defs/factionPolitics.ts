// ---------------------------------------------------------------------------
// FACTION POLITICS — the always-on substrate, surfaced as a package.
//
// Faction territory, contest, conquest and warlords are the ground every other
// package's wars are fought over. This is NEVER gated or weighted (alwaysOn) —
// the FactionField + WarlordField are constructed directly by the world sim
// regardless of the manifest. It appears as a package only for enumeration on
// the Expedition screen and as a relationship target; it has no purchasable
// sliders. (Future: faction-politics events/quests hang off this entry.)
// ---------------------------------------------------------------------------

import type { ContentPackage } from '../types';

export const FACTION_POLITICS: ContentPackage = {
  id: 'faction_politics',
  label: 'Faction Politics',
  blurb: 'Factions claim ground, crown warlords, contest borders and conquer the frontier.',
  color: '#888',
  cost: 0,
  // Never surfaced as a Vault purchase — it is the substrate, always present.
  unlock: { id: 'faction_politics_unlock', label: 'Always active', test: () => false },
  modifiers: [],
  defaultWeight: 0,
  defaultStartLevel: 0,
  defaultEnabled: true,
  alwaysOn: true,
};
