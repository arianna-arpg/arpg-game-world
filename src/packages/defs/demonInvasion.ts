// ---------------------------------------------------------------------------
// DEMON INVASIONS — a spatial, escalating world EVENT (not just marching hosts).
//
// When a Demon Invasion ignites it seizes a nearby map COORDINATE (charted or
// not — to pull the player to explore toward it), crowns it with the BALOR, and
// grows a storm RADIUS over time. Zones it covers take a "Demon Storm" — meteors
// rain, craters spit demons — and the longer it festers the stronger + wider it
// grows, until it tears a PORTAL to the demon realm. All of that escalation is
// DATA on the surge below: a TYPE rolled at ignition (Imp Incursion / Hell-Host /
// Balor's Rite) and a STAGE ladder walked by elapsed age. The Vault TUNES the
// event purely through pressure (the two real modifier kinds) — no constants.
//
// Reuses, never reinvents: the pure DemonInvasionField overlay owns node-space;
// the existing Encounter engine fields the epicenter pack; the storm pipeline
// rains the meteors; the Balor rides the per-faction Crowned gate. Adding a new
// invasion TYPE (or a bespoke sub-faction) is one more entry here — pure data.
// ---------------------------------------------------------------------------

import { vec } from '../../core/math';
import { registerKillHandler } from '../../engine/killHandlers';
import type { DemonSurge, InvasionStage, InvasionType } from '../encounters';
import { DemonInvasionField } from '../overlays/demonInvasion';
import type { ContentPackage } from '../types';

/** The three flavors a Demon Invasion ignites as (extensible: add an entry). */
const INVASION_TYPES: InvasionType[] = [
  // Cheap swarm — frequent, weaker, rains the most meteors; a slow creep.
  { id: 'imp_incursion', label: 'Imp Incursion', weight: 5, ageScale: 0.85, strengthMul: 0.85, meteorMul: 1.3, color: '#ff7a4a' },
  // Heavy demons — the balanced siege, hard-hitting packs, measured cadence.
  { id: 'hell_host', label: 'Hell-Host', weight: 3, ageScale: 1.0, strengthMul: 1.2, meteorMul: 0.9, color: '#e8503c' },
  // Elite rite — rare, brutal, and ramps to the portal FASTEST (ageScale 1.5).
  { id: 'balor_rite', label: "Balor's Rite", weight: 1, ageScale: 1.5, strengthMul: 1.4, meteorMul: 1.0, color: '#c81e3a' },
];

/** The escalation ladder — a step function over elapsed age. Each row is a
 *  THRESHOLD; the overlay walks to the last one crossed and scales it by live
 *  pressure. "The longer it festers, the worse it gets" is this table. */
const INVASION_STAGES: InvasionStage[] = [
  { atSeconds: 0,   label: 'Demon Incursion', strengthBonus: 0, radiusBonus: 0,   meteorRatePerSec: 0.16, meteorSpawnChance: 0.25, rewardMul: 1.0 },
  { atSeconds: 90,  label: 'Demon Siege',     strengthBonus: 2, radiusBonus: 90,  meteorRatePerSec: 0.28, meteorSpawnChance: 0.35, rewardMul: 1.6 },
  { atSeconds: 210, label: 'Hellstorm',       strengthBonus: 4, radiusBonus: 190, meteorRatePerSec: 0.45, meteorSpawnChance: 0.45, rewardMul: 2.4, opensPortal: true },
  { atSeconds: 360, label: 'Cataclysm',       strengthBonus: 7, radiusBonus: 320, meteorRatePerSec: 0.66, meteorSpawnChance: 0.55, rewardMul: 3.5, opensPortal: true },
];

/** The spatial / storm / portal config carried by the epicenter encounter. */
const BALOR_SURGE: DemonSurge = {
  meteorSkillId: 'meteor',
  meteorRadius: 96,
  meteorTelegraph: 0.9,
  // Roll a coordinate within the visible map's bounding box (+ this spread, ~one
  // node step) — so an invasion erupts WITHIN what the player can see, binding to
  // a node if one's there, else simulating a floating epicenter (no forced trail).
  // bias -0.4 ⇒ leans AWAY from the player's current zone (a short trek to the
  // rift); raise toward +1 for "on top of you", lower toward -1 for "far frontier".
  epicenter: { spread: 85, bias: -0.4 },
  epicenterTileset: 'cinderlands', // a molten rift biome — the demons' beachhead
  startRadius: 120,
  maxRadius: 460,
  radiusGrowthPerSec: 7,
  inRadiusSlack: 30,
  maxLifeSec: 600,
  triggerChance: 0.008,
  maxConcurrent: 1,
  types: INVASION_TYPES,
  stages: INVASION_STAGES,
  portal: {
    atSeconds: 210, // opens at the "Hellstorm" stage — the risk/reward fork
    tileset: 'wasteland', // the demons' molten home turf (a desolate infernal waste)
    champion: { monsterId: 'balor_warlord', levelBonus: 4, ledgerKill: 'balor_slain' },
    rewardMulPerStage: 0.5, // realm reward = stage reward × (1 + 0.5 × stageIdx)
  },
};

// NOTE: the demon epicenter is DIRECT-spawned by the engine (spawnEpicenter),
// not driven by an in-zone Encounter — so this package registers no EncounterDef.
// The DemonSurge config (BALOR_SURGE) is handed straight to the overlay below.
// (EncounterDef.surge remains a dormant seam: a future world event could instead
// be encounter-driven, carrying its surge on the encounter — see encounters.ts.)

export const DEMON_INVASION: ContentPackage = {
  id: 'demon_invasion',
  label: 'Demon Invasions',
  blurb: 'A rift-born host seizes a nearby coordinate, raises a growing Demon Storm of meteors, and festers toward a portal to the Balor\'s realm.',
  color: '#c0392b',
  cost: 140,
  // DISCOVERED in play (it runs at defaults from level 15); the Vault unlock
  // gates TUNING. Becomes buyable once any faction warlord falls.
  unlock: {
    id: 'demon_invasion_unlock',
    label: 'Slay any faction warlord',
    test: (ctx) => (ctx.ledger.warlords_killed ?? 0) >= 1,
  },
  // INVESTMENT LADDER — each owned tier WIDENS a slider so pressure can climb
  // higher, scaling the whole stage table harder/faster (no table edits). Earned
  // through ledger milestones the player accrues in play.
  tiers: [
    { id: 'demon_siege', label: 'Demon Siege', requirement: 'Repel 3 Demon Invasions', cost: 180,
      test: (ctx) => (ctx.ledger.demon_invasions_repelled ?? 0) >= 3,
      grants: { weight: { min: 0, max: 80 } } },
    { id: 'demon_warlord', label: "Warlord's Bane", requirement: 'Slay the Balor', cost: 320,
      test: (ctx) => (ctx.ledger.balor_slain ?? 0) >= 1,
      grants: { weight: { min: 0, max: 100 } } },
    { id: 'demon_dominion', label: 'Infernal Dominion', requirement: 'Open a demon portal', cost: 260,
      // Reachable now via a deep repel count; the Phase-4 portal chain (bumping
      // demon_portals_opened) is the faster path once it ships.
      test: (ctx) => (ctx.ledger.demon_portals_opened ?? 0) >= 1 || (ctx.ledger.demon_invasions_repelled ?? 0) >= 10,
      grants: { startLevel: { min: 0, max: 101 } } }, // dictate when invasions begin / off
  ],
  modifiers: [
    // Base bands are NARROW (discovery gating): start is locked at 15 until
    // Dominion frees it; frequency widens with Siege → Warlord's Bane.
    { id: 'demon_start', kind: 'startLevel', label: 'Demon invasions begin at level', min: 15, max: 15, step: 1, defaultValue: 15 },
    { id: 'demon_weight', kind: 'weight', label: 'Demon invasion frequency', min: 20, max: 60, step: 5, defaultValue: 40 },
  ],
  defaultWeight: 40,
  defaultStartLevel: 15,
  defaultEnabled: true,
  // invasionFactions kept so demon WAR-HOSTS still march (Warband materialization);
  // the overlay adds the spatial epicenter/storm/portal layer on top.
  world: {
    invasionFactions: ['demon'],
    overlay: (ctx) => new DemonInvasionField(ctx, BALOR_SURGE),
  },
};

// The Balor at a Demon Invasion's epicenter — felling it REPELS the whole
// invasion (the storm stops, the radius lifts). Reward scales with the
// stage it reached, so daring to let it fester pays off (whoever lands it).
// (The realm-side Balor consumes World.realmContext, so its row lives on
// World.worldKillRules.)
registerKillHandler({
  id: 'balor_epicenter',
  tag: 'balor_epicenter',
  run: ctx => {
    const mul = ctx.sim.demonField?.resolveInvasion(ctx.zone.id) ?? 1;
    ctx.bumpLedger('demon_invasions_repelled');
    ctx.bumpLedger('balor_slain');
    ctx.grantXp(Math.round((220 + ctx.zone.level * 44) * mul));
    const gems = 2 + Math.floor(mul);
    for (let i = 0; i < gems; i++) ctx.dropGemAt(ctx.actor.pos);
    ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 56),
      `The invasion is broken! (×${mul.toFixed(1)} spoils)`, '#ffd700', 18);
  },
});
