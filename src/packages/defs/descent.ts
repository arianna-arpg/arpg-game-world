// ---------------------------------------------------------------------------
// DESCENT — a NET-NEW package: delve a cave's mineshaft into a BOUNDLESS abyss.
//
// Inside caves there's a chance for a DELVER (a neutral, untargetable shaft-keeper)
// standing by a chasm platform. Dwell it for wares (spend Depth Echoes); dwell the
// platform to DESCEND into a perpetual, dynamically-streamed cavern with NO walls.
// DARKNESS encroaches (a Light countdown) — run over glowing crystalline LIGHT SPOTS
// to push it back; gaping VOID pits and cursed obelisks hazard the dark. Slaughter
// the DEPTHKIN for Echoes, deeper = deadlier + richer; when the dark consumes you or
// you fall, you RESURFACE to the Delver to spend your haul. Claustrophobia as a loop.
//
// Discovered in play (runs at defaults; the Vault unlock gates TUNING), like the
// other net-new packages. The whole mechanic is DATA on the surge below.
//
// One overlay-only faction is grafted at boot (contexts:['descent'] keeps it out of
// ordinary generation — it appears ONLY in the abyss, via the 'descent' tileset packs):
//   • DEPTHKIN — the pale things of the deep; a stealth LURKER (assassin brain), a
//     swarming crawler, a ranged seer, a heavy brute. No warlord, no relations.
// ---------------------------------------------------------------------------

import { DescentField, type DescentSurge } from '../overlays/descent';
import type { ContentPackage, FactionSpec } from '../types';

/** The whole Descent mechanic as data — every number is a knob. */
const DESCENT_SURGE: DescentSurge = {
  delverChance: 0.22,       // ~1-in-5 caves host a Delver (seeded per mouth)
  drainRate: 4.5,           // light lost / sec — ~22s of dark from full before consumed
  lightBurst: 45,           // light restored per light spot
  lightMax: 100,
  depthUnit: 900,           // node-units delved per +1 depth
  payoutPerKill: 6,         // base Echoes per Depthkin (× depth)
  payoutDepthBonus: 0.35,
  payoutKeptOnDeath: 1,     // keep all on resurface (lower for bank-or-bust risk)
  enemyLevelBonus: 1,
  faction: 'depthkin',
  spawnInterval: 2.6,
  spawnIntervalFloor: 0.6,
  spawnRampPerDepth: 0.2,
  spawnCap: 14,
  spawnDist: [560, 920],
  cullRadius: 1700,
  doodadTarget: 26,
};

/** The DEPTHKIN — the abyss's pale brood. contexts:['descent'] keeps them out of
 *  ordinary generation; they appear ONLY via the descent tileset's pack table. No
 *  warlord, no relations — pure event content. seedWar auto-suppressed (factionGen). */
const DEPTHKIN_FACTION: FactionSpec = {
  id: 'depthkin',
  name: 'the Depthkin',
  color: '#7f9ad8',
  traits: { roaming: 0.3, aggression: 1.1, warlordHome: 'capital', contexts: ['descent'] },
  roster: [
    { id: 'depthkin_crawler', weight: 4 },
    { id: 'depthkin_lurker', weight: 3 },
    { id: 'depthkin_seer', weight: 2 },
    { id: 'depthkin_brute', weight: 1 },
  ],
};

export const DESCENT: ContentPackage = {
  id: 'descent',
  label: 'Descent',
  color: '#7f9ad8',
  blurb: 'A Delver in the caves offers a mineshaft into a boundless, lightless abyss. Push back the encroaching dark, slaughter the Depthkin for Echoes, and resurface to spend before the deep takes you.',
  cost: 130,
  // DISCOVERED in play (runs at defaults); the Vault unlock gates TUNING, surfacing
  // once you've found your first Delver.
  unlock: {
    id: 'descent_unlock',
    label: 'Find a Delver in the caves (from level 8)',
    test: (ctx) => (ctx.ledger.delvers_seen ?? 0) >= 1,
  },
  tiers: [
    { id: 'descent_spelunker', label: 'Spelunker', requirement: 'Complete 3 descents', cost: 200,
      test: (ctx) => (ctx.ledger.descents_run ?? 0) >= 3,
      grants: { weight: { min: 0, max: 90 } } },
    { id: 'descent_abyssal', label: 'Abyssal Delver', requirement: 'Slay 100 Depthkin', cost: 300,
      test: (ctx) => (ctx.ledger.depthkin_slain ?? 0) >= 100,
      grants: { weight: { min: 0, max: 100 }, startLevel: { min: 0, max: 101 } } },
  ],
  modifiers: [
    { id: 'descent_start', kind: 'startLevel', label: 'Delvers appear at level', min: 8, max: 8, step: 1, defaultValue: 8 },
    { id: 'descent_weight', kind: 'weight', label: 'Delver frequency', min: 25, max: 60, step: 5, defaultValue: 40 },
  ],
  defaultWeight: 40,
  defaultStartLevel: 8,
  defaultEnabled: true,
  world: { overlay: (ctx) => new DescentField(ctx, DESCENT_SURGE) },
  factions: [DEPTHKIN_FACTION],
  validate: (look) => [
    ...(look.faction(DESCENT_SURGE.faction) ? [] : [`surge faction '${DESCENT_SURGE.faction}' unknown`]),
    // The abyss mints from the 'descent' tileset (World.enterDescent) — keep the
    // id honest here so a rename can never fall back to a warned cavern.
    ...(look.tileset('descent') ? [] : [`the 'descent' tileset is unregistered`]),
    ...(look.monster('descent_delver') ? [] : [`the 'descent_delver' shaft-keeper is unknown`]),
  ],
};
