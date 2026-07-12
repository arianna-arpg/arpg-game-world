// ---------------------------------------------------------------------------
// HOLDFAST — fortified, LOCKED bonus exits raised in the wilds (a net-new package).
//
// On entering an uncharted zone there's a chance a guardian faction raises a sealed
// bonus exit — a side path you must EARN. The Bandit toll-wardens are the first: pay
// a loose support gem (one taken at random, or one you choose — and your choice
// steers what lies beyond) and the gate opens; or cut the wardens down and gamble on
// the gate bursting (it usually won't). Discovered in play (runs at defaults from a
// low level, like Deadwake/Migration); the Vault unlock gates TUNING. Every guardian,
// unlock condition, and reward is a HoldfastDef literal (holdfast.ts), so a Goblin
// camp on a cave, a true coin toll, or a temple gate is PURE DATA.
//
// It fields a DEDICATED 'bandit' faction — an opportunist human host. It is wired into
// WARBAND_FACTIONS as a FORWARD HOOK so it can march in Warbands the day bandits hold
// ground; today, kept NEUTRAL (no faction grudges, so the toll-wardens are never
// attacked by natives), they appear as Holdfast guardians. Giving them a baseline
// foothold (a pack-table native or biome patron) is the future step that lights the
// warband path — without a hostile relation, which would rouse the neutral wardens.
// ---------------------------------------------------------------------------

import { HoldfastField } from '../overlays/holdfast';
import { HOLDFAST_DEFS, HOLDFAST_SURGE } from '../holdfast';
import { allHoldfastDefs } from '../registry';
import type { ContentPackage, FactionSpec } from '../types';

/** THE BANDITS — an opportunist human faction. contexts:['baseline','holdfast'] makes
 *  them eligible for baseline gen + holding a toll-gate. NEUTRAL by design: no hostile
 *  relations (so factionGen seeds no WAR_PAIRS and the dormant toll-wardens are never
 *  attacked by a zone's natives). The warlord + WARBAND_FACTIONS entry are the forward
 *  hook for warband marching once bandits gain territory (see the header note). */
const BANDIT_FACTION: FactionSpec = {
  id: 'bandit',
  name: 'the Roadwardens',
  color: '#c8a04a',
  traits: { roaming: 1.0, aggression: 0.9, warlordHome: 'capital', contexts: ['baseline', 'holdfast'] },
  warlord: 'bandit_bruiser',
  // Presence: the road-gangs are an EARLY-WORLD scourge — full variety through
  // the ~5-12 band, trailing off past 15 until only hardened bruisers still
  // dare hold a toll; deep-world holdfasts read as veteran crews, not mobs.
  roster: [
    { id: 'bandit_cutthroat', weight: 5, presence: { to: 15, fadeOut: 7 } },
    { id: 'bandit_bruiser', weight: 2 },
    { id: 'bandit_keeper', weight: 1, presence: { from: 5, fadeIn: 3, to: 18, fadeOut: 8 } },
    // The powder kin arrive once the roads harden — guns are a mid-world
    // habit, and the marksman's long rifle stays a deep-road terror.
    { id: 'bandit_fusilier', weight: 2, presence: { from: 4, fadeIn: 3 } },
    { id: 'bandit_grenadier', weight: 1, presence: { from: 7, fadeIn: 4 } },
    { id: 'bandit_matchlock', weight: 1, presence: { from: 10, fadeIn: 5 } },
  ],
};

export const HOLDFAST: ContentPackage = {
  id: 'holdfast',
  label: 'Holdfast',
  blurb: 'The wilds are not empty. Press into uncharted ground and you may find a fortified gate barring a hidden path — raised by opportunists who hold the road and ask a price. The bandit wardens take a gem for passage (one at random, or one you name — and what you give shapes what waits beyond). Cut them down instead and the gate will likely stay shut, the bonus road lost. Pay, fight, or find another way; the toll is yours to weigh.',
  cost: 110,
  // DISCOVERED in play (runs at defaults from a low level); the Vault unlock gates TUNING.
  unlock: {
    id: 'holdfast_unlock',
    label: 'Find a fortified bonus path (the wilds raise them from low levels)',
    test: (ctx) => (ctx.ledger.holdfast_seen ?? 0) >= 1,
  },
  // INVESTMENT LADDER — each owned tier widens the frequency slider as the player
  // proves they can find + open holdfasts.
  tiers: [
    { id: 'holdfast_wayfinder', label: 'Wayfinder', requirement: 'Open 3 holdfasts', cost: 150,
      test: (ctx) => (ctx.ledger.holdfasts_opened ?? 0) >= 3,
      grants: { weight: { min: 0, max: 80 } } },
    { id: 'holdfast_pathbreaker', label: 'Pathbreaker', requirement: 'Open 8 holdfasts', cost: 220,
      test: (ctx) => (ctx.ledger.holdfasts_opened ?? 0) >= 8,
      grants: { weight: { min: 0, max: 100 } } },
  ],
  modifiers: [
    { id: 'holdfast_start', kind: 'startLevel', label: 'Holdfasts begin at level', min: 2, max: 2, step: 1, defaultValue: 2 },
    { id: 'holdfast_weight', kind: 'weight', label: 'Holdfast frequency', min: 20, max: 60, step: 5, defaultValue: 40 },
  ],
  defaultWeight: 40,
  defaultStartLevel: 2,
  defaultEnabled: true,
  // The field guards EVERY package's declared holdfasts (allHoldfastDefs), not
  // just this one's — a second package declaring `holdfasts` needs no overlay of
  // its own. The registry⇄def import cycle is safe: the aggregate is CALLED at
  // overlay construction (WorldSim boot), long after both modules initialize.
  world: { overlay: (ctx) => new HoldfastField(ctx, { ...HOLDFAST_SURGE, defs: allHoldfastDefs() }) },
  factions: [BANDIT_FACTION],
  holdfasts: HOLDFAST_DEFS,
};
