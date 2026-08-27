// ---------------------------------------------------------------------------
// HOLDFAST — fortified, LOCKED bonus exits raised in the wilds (a net-new package).
//
// On entering an uncharted zone there's a chance a guardian faction raises a sealed
// bonus exit — a purchased side-pocket you must EARN. The toll is CARRIED ESSENCE
// (the run currency, mixed tints at the mortal exchange's strict rates — never
// Mortal Essence, which exists only between a run's end and its reckoning's
// seal): pay the wardens and the gate opens onto a rich
// dead-end pocket (boosted drops, a guaranteed cave under the camp) whose only
// road leads back through the gate; or cut the wardens down and gamble on the gate
// bursting (it usually won't). Discovered in play (runs at defaults from a low
// level, like Deadwake/Migration); the Vault unlock gates TUNING. Every guardian,
// unlock condition, and reward is a HoldfastDef literal (holdfast.ts) with a
// DIMENSION band — the Bandit toll on the surface, the Durance tithe-gate in the
// underworld — so a Goblin camp on a cave or a seraphic vigil is PURE DATA.
//
// It fields three guardian-facing factions — the 'bandit' host (the surface
// crew's TRUE colors, and the baseline road-gangs), the 'roadwarden_toll'
// toll-stand (the surface crew's CALM stamp), and the 'durance_toll' fiend
// crew (underworld). placeHoldfast stamps the guardian faction onto the
// mustered crew (over each body's own def faction), so a fiend crew of
// Legion stock never inherits the Legion's wars. Bandits are wired into
// WARBAND_FACTIONS as a FORWARD HOOK so they can march in Warbands the day
// they hold ground.
//
// WHAT KEEPS A SLEEPING GATE SAFE (2026-08-01 — THE BANDIT RULING'S THIRD
// ACT; the 2026-07-28 survey below it stands as history): BOTH gates now
// rest on a relation-less stamp, structurally.
//   - 'durance_toll' always was — see its spec.
//   - 'roadwarden_toll' is its surface twin (user-ratified): while the toll
//     stands the crew wears a faction with NO diplomacy rows at all, so
//     every hostileTo read between the camp and a zone's natives — the
//     freehold watch included — is false in BOTH directions by construction.
//     ON PROVOCATION the crew SWAPS to true 'bandit' colors through THE
//     TRUE-COLORS LAW (GuardianSpec.rousedFactionId → engine/ai.ts
//     registerDormantColors, wired by the registry loop below): the rouse
//     latch (a wound past woundFrac) turns the whole gang out in its real
//     allegiance, freehold|bandit is LIVE again, and a warden in sight
//     honestly joins that fight — the feature, not a bug. NEUTRAL_RESET
//     cools the crew back to the calm stamp and the parley re-opens.
//   The 2026-07-28 survey (kept because it is why this shape exists): the
//   old protection was three-legged — DORMANCY (planted vs weather/pulls,
//   but NOT vs AI targeting: acquireTarget filters dead/untargetable/
//   downed/passive, never dormant), THE RESERVE GATE on WAR_PAIRS (the
//   doorless Compact was the ONE measured road to an unprovoked wipe), and
//   THE FREEHOLD ROSTER fielding no unprovoked aggressor. That last leg was
//   "a roster accident, not a law" — and the croft warden (batch 17, the
//   first awake armed freehold body) ended it: a posted warden whose reach
//   covered a sleeping camp climbed its ladder and clubbed the crew. The
//   header's own prescription — this gate's own relation-less guardian
//   faction, the tithe-gate's way — is now the shipped shape.
// ---------------------------------------------------------------------------

import { registerDormantColors, registerDormantTag } from '../../engine/ai';
import { HoldfastField } from '../overlays/holdfast';
import { HOLDFAST_DEFS, HOLDFAST_SURGE } from '../holdfast';
import { allHoldfastDefs } from '../registry';
import type { ContentPackage, FactionSpec } from '../types';

/** THE BANDITS — an opportunist human faction. contexts:['baseline','holdfast'] makes
 *  them eligible for baseline gen + holding a toll-gate. They are a WARRING faction,
 *  not a neutral one: the freeholds and the Gilded Compact both hold permanent
 *  grudges (data/monsters.ts RELATIONS) — which is exactly why the toll-CREW no
 *  longer wears these colors while it sleeps: the camp stands under the
 *  relation-less 'roadwarden_toll' stamp and swaps HERE on the rouse (the
 *  header's "what keeps a sleeping gate safe"). Baseline road-gangs, brigand
 *  raids and warband musters field 'bandit' directly, wars and all. The
 *  warlord + WARBAND_FACTIONS entry are the forward hook for warband marching once
 *  bandits gain territory (see the header note). */
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
    { id: 'bandit_powder_witch', weight: 1, presence: { from: 6, fadeIn: 4 } },
    // The camp's full company musters for wars and vendettas too (the
    // muster rolls) — the holdfast crews were always this same warband
    // under canvas; the ronin rides down from the passes he already walks.
    { id: 'bandit_trapsmith', weight: 1, presence: { from: 5, fadeIn: 3 } },
    { id: 'warband_skald', weight: 1, presence: { from: 6, fadeIn: 3 } },
    { id: 'camp_bannerman', weight: 1, presence: { from: 7, fadeIn: 4 } },
    { id: 'bandit_wardcaster', weight: 1, presence: { from: 7, fadeIn: 4 } },
    { id: 'bulwark_thane', weight: 1, presence: { from: 8, fadeIn: 4 } },
    { id: 'steppe_ronin', weight: 1, presence: { from: 9, fadeIn: 4 } },
    // The high court pass: the rolling magazine — shoot the gunner off,
    // or gamble the kegs (the INVERTED anatomy lesson).
    { id: 'powder_wagon', weight: 1, presence: { from: 11, fadeIn: 5 } },
  ],
};

/** THE TOLL-WARDENS — the surface gate's CALM stamp (the bandit ruling's
 *  third act, 2026-08-01): a DEDICATED relation-less faction the toll crew
 *  wears while the parley stands (contexts:['holdfast'] only — it exists to
 *  hold gates, never baseline gen; the bodies are ordinary bandit stock).
 *  NO relations rows, deliberately: absent from the war ledger means every
 *  hostileTo read is 'neutral' in both directions by construction, so the
 *  freeholds' awake armed watch (the croft warden) finds no verdict to lock
 *  on while the camp sleeps. The crew's TRUE colors are 'bandit'
 *  (GuardianSpec.rousedFactionId — the rouse swaps them in, NEUTRAL_RESET
 *  swaps them back). Same gold as the bandits: the map and the eye read one
 *  outfit, because it IS one outfit — the ledger is what changes hands. */
const ROADWARDEN_TOLL_FACTION: FactionSpec = {
  id: 'roadwarden_toll',
  name: 'the Toll-Wardens',
  color: '#c8a04a',
  traits: { roaming: 0.2, aggression: 0.9, warlordHome: 'capital', contexts: ['holdfast'] },
  roster: [
    { id: 'bandit_keeper', weight: 1 },
    { id: 'bandit_cutthroat', weight: 3 },
    { id: 'bandit_bruiser', weight: 2 },
  ],
};

/** THE TITHE CREW — the underworld gate's fiends, a DEDICATED neutral faction
 *  (contexts:['holdfast'] only: they exist to hold tithe-gates, never baseline
 *  gen). Deliberately WITHOUT relations even though its bodies are Legion
 *  stock — the crew must never inherit the demon faction's wars, or a zone's
 *  natives could cut down a sleeping gate. This was the PATTERN the surface
 *  gate did not follow until the bandit ruling's third act; both gates now
 *  share it (ROADWARDEN_TOLL_FACTION above is this crew's surface twin).
 *  The tithe crew carries no rousedFactionId: this relation-less stamp IS
 *  its only allegiance, roused or calm. */
const DURANCE_TOLL_FACTION: FactionSpec = {
  id: 'durance_toll',
  name: 'the Tithe Crew',
  color: '#7de84a',
  traits: { roaming: 0.2, aggression: 0.9, warlordHome: 'capital', contexts: ['holdfast'] },
  roster: [
    { id: 'brimstone_cantor', weight: 1 },
    { id: 'hellhound', weight: 3 },
    { id: 'dread_fiend', weight: 2 },
  ],
};

// DORMANCY, data-driven: every declared guardian's neutralTag joins the AI
// dormancy registry with the shared toll temperament — wardens settle back to
// the gate once you break off (their aim is profit, not slaughter). A future
// def in THIS registry is dormant + forgiving for free; a def in another
// package registers its own tag the same one-line way (the ai.ts contract).
// THE TRUE-COLORS wiring rides the same loop: a guardian that names its
// roused allegiance (rousedFactionId) gets the calm↔true faction swap on
// its rouse latch for free — pure data in, standing law out.
for (const d of HOLDFAST_DEFS) {
  registerDormantTag(d.guardian.neutralTag, { coolDownSecs: 8, disengageDist: 360 });
  const g = d.guardian;
  if (g.rousedFactionId) {
    registerDormantColors(g.neutralTag, { calm: g.factionId, roused: g.rousedFactionId });
  }
}

export const HOLDFAST: ContentPackage = {
  id: 'holdfast',
  label: 'Holdfast',
  color: '#c8a04a',
  blurb: 'The wilds are not empty. Press into uncharted ground and you may find a fortified gate barring a hidden side-pocket, raised by guardians who hold the road and ask a toll of carried Essence. Pay, and the gate opens onto rich ground: fatter spoils, and always something under the camp worth the digging. Cut the wardens down instead and the gate will likely stay shut, the pocket lost. Pay, fight, or walk on; the toll is yours to weigh.',
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
  factions: [BANDIT_FACTION, ROADWARDEN_TOLL_FACTION, DURANCE_TOLL_FACTION],
  holdfasts: HOLDFAST_DEFS,
};
