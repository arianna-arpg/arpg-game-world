// ---------------------------------------------------------------------------
// DEADWAKE — a death-fed undead TIDE (a net-new package).
//
// The world keeps a hidden CORPSE ACCUMULATION counter. Slaying an undead foe has
// a very low chance to ARM it; once armed it climbs both on its OWN (a simulated
// drip, heavier at night) AND on the mayhem the player makes — every death, every
// summoned minion, every consumed corpse feeds it, with a heavier tick when the
// dead themselves fall. Cross the threshold and a DEADWAKE breaks loose: a TIGHT,
// travelling mass (≈ one zone wide) that drifts across the map (a day-crawl that
// quickens to a night-march), colliding with one zone at a time. On collision it
// has a CHANCE to CONSUME that zone's active event (a demon rift, a crusade hold) —
// but never the weather. When it catches the zone the player is in, it HOLDS
// POSITION and pours its host in as a relentless STREAM (a horde that overwhelms
// by sheer number) that SWELLS with every casualty it takes — death is everlasting.
// Flee and it rolls on; it dissipates only when its host-leader is cut down (ROUT).
//
// It fields a DEDICATED roster — common dead plus Deadwake-EXCLUSIVE undead +
// unique boss leaders (referenced ONLY by floodRoster/leaderPool, never baseline
// generation). Discovered in play (runs at defaults; the Vault unlock gates TUNING
// + the investment ladder), like Crusade / Conclave / Hunt. The whole mechanic —
// arm chance, accrual weights, threshold, drift speeds, radius, the strength/stream
// model, the rosters, and what it consumes — is DATA on the surge below, so the
// planned expansion pass (incl. the broad storm-front feel) tunes + extends it
// without touching the engine.
// ---------------------------------------------------------------------------

import { vec } from '../../core/math';
import { registerKillHandler } from '../../engine/killHandlers';
import { DeadwakeField, type DeadwakeSurge } from '../overlays/deadwake';
import type { ContentPackage } from '../types';

/** The whole Deadwake mechanic as data — every number a knob. */
const DEADWAKE_SURGE: DeadwakeSurge = {
  armChance: 0.02,        // ~1-in-50 undead kills SEEDS the counter ("very low chance")
  threshold: 120,         // counter units before a Deadwake breaks loose
  accrual: {
    death: 1,             // any passing feeds the grief…
    summon: 0.6,          // …a raised minion a little…
    corpse: 1.5,          // …a consumed corpse more…
    undeadMul: 4,         // …and the undead's own falling MOST (the brief's heavier tick)
    simDripPerSec: 0.45,  // the player-independent crawl (≈4-5 min from empty by day…)
    simDripDayMul: 0.6,   // …a calmer climb under the sun…
    simDripNightMul: 2.2, // …racing once the dead stir at night
  },
  maxConcurrent: 2,       // up to TWO tides at once (the normal cap); each persists
                          // until ROUTED — and two colliding fuse into the Necropolis
  radius: 46,             // TIGHT (node-units; zones sit ~80u apart) → a travelling
                          // ZONE that collides with one node at a time, not a broad cloud
  daySpeed: 3,            // a slow crawl by day (node-units/sec)
  nightSpeed: 9,          // a quickened march by night (3× — "picks up speed at Night")
  turnChance: 0.18,       // per 0.5s step — an occasional wander…
  turnAmount: 0.7,        // …up to ±0.7rad, so it meanders rather than tracking a line
  faction: 'undead',
  // The STREAM roster — a curated mix of common dead + Deadwake-exclusive undead
  // (the exclusive ids appear ONLY here, never in baseline generation).
  floodRoster: [
    { id: 'deadwake_gravewretch', weight: 5 },   // the bulk: cheap swarming fodder
    { id: 'zombie', weight: 3 },
    { id: 'deadwake_ghoul', weight: 3 },          // fast lungers
    { id: 'skeleton_warrior', weight: 3 },
    { id: 'skeleton_archer', weight: 2 },
    { id: 'deadwake_grave_wight', weight: 2 },    // chilling debuffers
    { id: 'deadwake_bonecaller', weight: 2 },     // raise still more dead
    { id: 'deadwake_plague_bearer', weight: 2 },  // burst on death
    { id: 'deadwake_revenant_knight', weight: 1 },// armored walls
  ],
  // The host-LEADER pool — felling the rolled leader ROUTS the whole tide.
  leaderPool: [
    { id: 'deadwake_pale_shepherd', weight: 2 },  // necromancer-commander
    { id: 'deadwake_gravemaw', weight: 2 },        // hulking brute
    { id: 'deadwake_hollow_choir', weight: 2 },    // wailing artillery wraith
  ],
  floodLevelBonus: 0,     // at the zone's own level (the radial difficulty field stands)
  leaderLevelBonus: 2,    // the host-leader outclasses its host…
  leaderXpFloor: 120,     // …with a worthwhile xp floor
  routReward: { xpBase: 260, xpPerLevel: 46, gems: 3 }, // bounty for routing a wake
  // The FLAVOURS a fresh tide rolls. STRENGTH = the carried horde, which sets the
  // live pour-cap (max(minStreamCap, round(strength))). It swells as the tide roams
  // and — for the FLOOD variant — ramps hard while it pours into the player's zone,
  // turning a 9-strong wake into a ~20-strong flood the player must juggle.
  variants: [
    { id: 'steady', name: 'Risen Host', weight: 4,
      startStrength: 11, maxStrength: 16, roamGrowthPerSec: 0.10, engagedGrowthPerSec: 0.18, color: '#7a5aa6' },
    { id: 'flood', name: 'Swelling Flood', weight: 3,
      startStrength: 9, maxStrength: 20, roamGrowthPerSec: 0.10, engagedGrowthPerSec: 0.55, color: '#6a4a86' },
    { id: 'vanguard', name: 'Grave Vanguard', weight: 2,
      startStrength: 7, maxStrength: 12, roamGrowthPerSec: 0.16, engagedGrowthPerSec: 0.22, color: '#9a86c4' },
  ],
  strengthPerKill: 0.5,      // each casualty it takes swells the next wave (the futility)
  minStreamCap: 6,           // the floor on how many it keeps pouring
  streamInterval: 0.7,       // a relentless trickle…
  streamBatch: [1, 2],       // …1-2 dead per pour
  ambientAmp: 1.8,        // the tide swells the zone's native undead…
  ambientCountMul: 1.12,  // …and brings a few more packs with it
  consumeChance: 0.5,     // a coin-flip to CONSUME a zone's active event on collision…
  consume: { demonInvasion: true, crusade: true }, // …but NEVER the weather (the sky stands)
  // THE NECROPOLIS — two tides colliding fuse into this travelling seat, the uber
  // of the cycle: it generates new tides on its own and must be chased + purged.
  necropolis: {
    collideDist: 40,        // two tide-centres within this fuse
    driftSpeed: 1.5,        // a SLOW, ponderous crawl (no fixed anchor) — the player has
                            // time to reach a zone it touches and take the gate in
    accessRadius: 100,      // a charted zone within this of the seat opens a gate in
    // The seat's interior is the OSSUARY — its own bone-true tileset
    // (data/tilesets.ts), not the graveland's purple gloom. Each fused seat
    // rolls a FACE (bonefields dunes / reliquary rows), named at the door:
    // "The Necropolis (reliquary)".
    tileset: 'ossuary',
    arena: { name: 'The Necropolis', rollVariant: true },
    levelBonus: 4,          // the arena's dead outclass the open world
    bossPool: [
      { id: 'deadwake_bonelord', weight: 1 }, // the uber boss (Crowned on spawn)
    ],
    garrison: [8, 12],
    bossBump: 2,        // the Bonelord out-levels its own garrison
    bossXpFloor: 400,   // an uber pays like one
    reward: { xpBase: 600, xpPerLevel: 80, gems: 8 },
  },
  color: '#7a5aa6',
};

export const DEADWAKE: ContentPackage = {
  id: 'deadwake',
  label: 'Deadwake',
  blurb: 'Slaughter feeds a hidden tide of the dead. When it crests, a Deadwake breaks loose — a tight, travelling mass of undead that rolls zone to zone, consuming the events it collides with and pouring a relentless, swelling stream into any ground you are caught on, routed only by cutting down its host-leader. Let two tides collide and they fuse into a travelling NECROPOLIS that spawns its own — chase it down and purge it to break the cycle.',
  cost: 130,
  // DISCOVERED in play (runs at defaults from level 14); the Vault unlock gates
  // TUNING, surfacing once a Deadwake has caught the player in the world.
  unlock: {
    id: 'deadwake_unlock',
    label: 'Be caught in a Deadwake (they break loose from level 14)',
    test: (ctx) => (ctx.ledger.deadwake_seen ?? 0) >= 1,
  },
  // INVESTMENT LADDER — each owned tier widens a slider so pressure climbs higher,
  // breaking Deadwakes loose more often / earlier (no surge edits).
  tiers: [
    { id: 'deadwake_gravecaller', label: 'Gravecaller', requirement: 'Rout a Deadwake', cost: 180,
      test: (ctx) => (ctx.ledger.deadwake_routed ?? 0) >= 1,
      grants: { weight: { min: 0, max: 80 } } },
    { id: 'deadwake_tidebreaker', label: 'Tidebreaker', requirement: 'Rout 3 Deadwakes', cost: 280,
      test: (ctx) => (ctx.ledger.deadwake_routed ?? 0) >= 3,
      grants: { weight: { min: 0, max: 100 }, startLevel: { min: 0, max: 101 } } },
    { id: 'deadwake_necropolis', label: 'Necropolis', requirement: 'Rout 6 Deadwakes', cost: 320,
      test: (ctx) => (ctx.ledger.deadwake_routed ?? 0) >= 6,
      grants: { weight: { min: 0, max: 100 } } },
  ],
  modifiers: [
    // Base bands NARROW (discovery gating): start locked at 14 until Tidebreaker
    // frees it; frequency widens with Gravecaller.
    { id: 'deadwake_start', kind: 'startLevel', label: 'Deadwakes begin at level', min: 14, max: 14, step: 1, defaultValue: 14 },
    { id: 'deadwake_weight', kind: 'weight', label: 'Deadwake frequency', min: 25, max: 55, step: 5, defaultValue: 35 },
  ],
  defaultWeight: 35,
  defaultStartLevel: 14,
  defaultEnabled: true,
  world: { overlay: (ctx) => new DeadwakeField(ctx, DEADWAKE_SURGE) },
  relationships: [
    // A world thick with marching war-hosts dies more, feeding the tide.
    { a: 'warbands', b: 'deadwake', kind: 'amplifies', strength: 1.1 },
  ],
};

// A streamed Deadwake undead fell — the tide SWELLS (death is everlasting;
// each casualty feeds the next pour). Only ROUTING (the leader) ends it.
registerKillHandler({
  id: 'deadwake_spawn',
  tag: 'deadwake_spawn',
  run: ctx => {
    ctx.sim.deadwakeField?.bolster(ctx.zone.map);
  },
});

// THE DEADWAKE HOST-LEADER — felling it ROUTS the roaming tide (the wake
// covering this ground recedes) for a bounty. The wake is resolved by the
// player's node coordinate (it isn't bound to a zone — it drifts). Counts
// whoever lands the blow; the routed ledger gates the package's Vault tiers.
// (The fused-tide NECROPOLIS boss consumes World.necropolisRealmContext, so
// its row lives on World.worldKillRules.)
registerKillHandler({
  id: 'deadwake_leader',
  tag: 'deadwake_leader',
  run: ctx => {
    const routed = ctx.sim.deadwakeField?.routeWakeAt(ctx.zone.map) ?? false;
    // Only credit a rout that ACTUALLY happened — the tide may have drifted on,
    // leaving its leader behind (the ledger gates the package's Vault tiers).
    if (routed) ctx.bumpLedger('deadwake_routed');
    const rr = ctx.sim.deadwakeField?.surge().routReward;
    if (rr) {
      ctx.grantXp(Math.round(rr.xpBase + ctx.zone.level * rr.xpPerLevel));
      for (let i = 0; i < rr.gems; i++) ctx.dropGemAt(ctx.actor.pos);
    }
    ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 56),
      routed ? 'The Deadwake breaks — its tide recedes!' : 'The undead host-leader falls!',
      '#c8a8e8', 18);
  },
});
