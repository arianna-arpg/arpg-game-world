// ---------------------------------------------------------------------------
// DESCENT — a NET-NEW package: delve a cave's mineshaft into a BOUNDLESS abyss.
//
// Inside caves there's a chance for a DELVER (a neutral, untargetable shaft-keeper)
// standing by a chasm platform. Dwell the platform to DESCEND into a perpetual,
// dynamically-streamed cavern with NO walls. DARKNESS encroaches (a Light countdown)
// — run over glowing crystalline LIGHT SPOTS to push it back; gaping VOID pits and
// cursed obelisks hazard the dark. Slaughter the DEPTHKIN for ESSENCE (THE DEEP
// LEDGER: the ONE economy, depth-tinted, salvage-grade); the deeper you delve the
// higher the abyss's own level, the heavier the brood, the thicker the stream (THE
// PRESSURE LADDER). Resurface — by climb, by darkness, by death — and the Delver's
// counter finally OPENS (THE PROVING LAW): a once-minted, essence-priced shelf whose
// entries unlock at the depths THIS dive reached, the deep rungs carrying THE
// ABYSSAL REGISTER's delver-only affix words. Claustrophobia as a loop.
//
// Discovered in play (runs at defaults; the Vault unlock gates TUNING), like the
// other net-new packages. The whole mechanic is DATA on the surge below.
//
// One overlay-only faction is grafted at boot (contexts:['descent'] keeps it out of
// ordinary generation — it appears ONLY in the abyss, via the 'descent' tileset packs):
//   • DEPTHKIN — the pale things of the deep; a stealth LURKER (assassin brain), a
//     swarming crawler, a ranged seer, a heavy brute. No warlord, no relations.
// ---------------------------------------------------------------------------

import { registerLightwell } from '../../engine/lightwells';
import type { World } from '../../engine/world';
import { registerAttentionSource, type AttentionPoint } from '../../world/attention';
import { DescentField, type DescentSurge } from '../overlays/descent';
import type { ContentPackage, FactionSpec } from '../types';

/** The whole Descent mechanic as data — every number is a knob. */
const DESCENT_SURGE: DescentSurge = {
  delverChance: 0.22,       // ~1-in-5 caves host a Delver (seeded per mouth)
  drainRate: 4.5,           // light lost / sec — ~22s of dark from full before consumed
  lightBurst: 45,           // light restored per light spot
  lightMax: 100,
  depthUnit: 900,           // node-units delved per +1 depth
  // THE DEEP LEDGER — the dive pays the ONE economy: ~a coarse essence every
  // four shallow kills, climbing with depth, packets tinting upward on the
  // rung ladder below. Salvage-grade wealth, deliberately modest — the
  // depth-locked SHELF is the prize, the essence merely pays for it.
  payoutPerKill: 0.25,
  payoutDepthBonus: 0.35,
  payoutKeptOnDeath: 1,     // keep all on resurface (lower for bank-or-bust risk)
  payoutTierRungs: [
    { atDepth: 3, chance: 0.3 },   // coarse → glimmering
    { atDepth: 6, chance: 0.22 },  // glimmering → brilliant
    { atDepth: 9, chance: 0.15 },  // brilliant → pristine
  ],
  // THE PRESSURE LADDER — the deep is a different country: the abyss's own
  // level climbs a floor-and-a-quarter per depth, the heavy kin arrive on
  // their depth rungs (roster presence below), and the stream thickens —
  // faster beats, fatter batches, a growing cap — until the far deep is a
  // constant tide shoving you back toward the shaft.
  enemyLevelBonus: 1,
  levelPerDepth: 1.25,
  faction: 'depthkin',
  spawnInterval: 2.6,
  spawnIntervalFloor: 0.55,
  spawnRampPerDepth: 0.2,
  spawnCap: 12,
  spawnCapPerDepth: 1.5,
  spawnCapMax: 34,
  spawnBatchPerDepth: 0.34, // depth 3 → 2/beat, depth 6 → 3, depth 9 → 4
  broodAnchor: 0,
  spawnDist: [560, 920],
  cullRadius: 1700,
  doodadTarget: 26,
  // THE DELVER'S SHELF — Brandt's grammar, minted once per shaft, essence-
  // priced, each entry depth-locked on the rung table; the deep rungs carry
  // the fat Abyssal-Register chances (≈10% at the door, >50% at depth ten).
  stock: {
    gear: 5,
    gems: 4,
    depthRungs: [
      { depth: 0, weight: 30 },
      { depth: 2, weight: 20 },
      { depth: 4, weight: 18 },
      { depth: 6, weight: 14 },
      { depth: 8, weight: 10 },
      { depth: 10, weight: 8 },
    ],
    affixChanceBase: 0.1,
    affixChancePerDepth: 0.045,
  },
};

// THE LIGHT SPOT joins the lightwell fabric as its burst-mode debut: the same
// one-gulp run-over refill it always was (grant = the surge's own dial, the
// 'touch' trigger = the crystal's body + the fabric's pad — byte-identical
// geometry), now served by the ONE updateLightwells sweep instead of a
// bespoke descent loop. Bursts are pickups, not shelter: a spot's glow never
// counts as light COVER, so the abyss's drain economy is untouched.
registerLightwell({
  kind: 'light_spot',
  burst: { grant: DESCENT_SURGE.lightBurst, on: 'touch', text: 'the light holds back the dark!', color: '#ffe08a' },
});

// --- in-zone attention pointer (world/attention.ts — the zero-edit contract) ---
//
// The Delver announces itself the moment its cave is entered ("A Delver
// lingers by a gaping shaft…") but stands at a FAR point of an unlit cave —
// an announced find the player can't locate reads as "it never spawned" (the
// fracture lesson, and the fabric header's own named rider: "a Descent
// shaft"). The chevron rides the announcement's truth: descentShaftView
// mirrors the platform dwell's own gate, so it speaks exactly while the way
// down still opens and falls silent forever once the one descent is spent
// (the counter that opens then stands beside the resurface point — nothing
// left to find).
/** The Delver's teal — the accent every descent text in world.ts already
 *  wears ('You descend into the dark…' et al.), worn here so the chevron
 *  reads as the same voice. */
const DESCENT_ACCENT = '#7fe0d8';
registerAttentionSource((world: World): AttentionPoint[] => {
  const v = world.descentShaftView();
  if (!v) return [];
  return [{
    id: 'descent_shaft', pos: v.pos, color: DESCENT_ACCENT, glyph: '⛏',
    label: "the Delver's shaft — dwell to descend", z: 2,
  }];
});

/** The DEPTHKIN — the abyss's pale brood. contexts:['descent'] keeps them out of
 *  ordinary generation; they appear ONLY via the descent tileset's pack table. No
 *  warlord, no relations — pure event content. seedWar auto-suppressed (factionGen). */
const DEPTHKIN_FACTION: FactionSpec = {
  id: 'depthkin',
  name: 'the Depthkin',
  color: '#7f9ad8',
  traits: { roaming: 0.3, aggression: 1.1, warlordHome: 'capital', contexts: ['descent'] },
  roster: [
    // PRESENCE HERE READS ON THE DEPTH AXIS (spawnDepthkin evaluates the
    // envelopes at surge.broodAnchor + the dive's depth, never zone level):
    // `from: 5` means DEPTH FIVE under any cave. The pale fodder swims every
    // stratum; the heavy kin do not rise this shallow — composition itself
    // is the depth gauge.
    { id: 'depthkin_crawler', weight: 4 },
    { id: 'depthkin_lurker', weight: 3, presence: { from: 2, fadeIn: 2 } },
    { id: 'depthkin_seer', weight: 2, presence: { from: 3, fadeIn: 2 } },
    { id: 'depthkin_brute', weight: 1, presence: { from: 5, fadeIn: 2 } },
    // The muster pass: the lantern that drinks your light (wellDrain —
    // the descent's own meter made a body), the hulk the pressure built,
    // and the cantor of the brine.
    { id: 'hadal_lantern', weight: 2, presence: { from: 4, fadeIn: 3 } },
    { id: 'brine_cantor', weight: 1, presence: { from: 6, fadeIn: 3 } },
    { id: 'pressure_hulk', weight: 1, presence: { from: 8, fadeIn: 4 } },
  ],
};

export const DESCENT: ContentPackage = {
  id: 'descent',
  label: 'Descent',
  color: '#7f9ad8',
  blurb: 'A Delver in the caves offers a mineshaft into a boundless, lightless abyss. Push back the encroaching dark, slaughter the Depthkin for essence, and resurface to a shelf whose finest wares only the deep unlocks.',
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
