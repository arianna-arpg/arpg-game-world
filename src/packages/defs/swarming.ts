// ---------------------------------------------------------------------------
// THE SWARMING — the Chitin's hive-cycle world event (a net-new package).
//
// The Seethe is QUEENLESS BY DOCTRINE: no WARLORD_OF crown, so the invasion
// gate never opens — no warbands, no crusades, no boss finale. This cycle is
// the faction's ONLY map-scale expression, and it is a CLOCK THE PLAYER CAN
// READ AND BREAK: brood grounds grow visible HIVE THROATS (extra hive_node
// bodies — the tally is on the map); stamp them early and the swarming
// shrinks or never rises; leave them and a fast, hostile, MIGRATION-SHAPED
// band takes wing — smaller and much quicker than a herd — that preys on
// migrating herds it crosses, salts its wake with ROYAL-JELLY CACHES (the
// royal register), and ends ECOLOGICALLY: an unbroken wing plants a NEW
// brood ground at its far pole and the roost's next cycle comes sooner. The
// wing's one soft throat is its WINGED ALATES — down enough and it breaks
// for home, spent.
//
// Discovered in play (runs at defaults; the Vault unlock gates TUNING), like
// Migration / Deadwake. The whole mechanic — the brood clock, quotas, the
// wing threshold, band speeds/radii, the flying roster, predation, the wake,
// the plant — is DATA on the surge below, so it tunes + extends without
// touching the engine.
// ---------------------------------------------------------------------------

import { vec } from '../../core/math';
import { registerKillHandler } from '../../engine/killHandlers';
import { SwarmingField, type SwarmingSurge } from '../overlays/swarming';
import type { ContentPackage } from '../types';

const SEETHE_AMBER = '#d89a3a';

/** The whole hive-cycle as data — every number is a knob. */
const SWARMING_SURGE: SwarmingSurge = {
  // BROODING — the visible clock.
  igniteChance: 0.035,      // per 0.5s step once rested (×ignitionMul) — cycles are events, not weather
  maxConcurrent: 1,         // ONE roost, ONE cycle (the frequency crank can lift it)
  broodZones: 3,            // a handful of brood grounds per cycle
  clusterRadius: 220,       // claims cluster on the densest hive ground (node-units)
  quotaStart: [1, 2],       // each ground starts with a throat or two…
  quotaCap: 4,              // …and builds toward this many
  growSeconds: 50,          // one new throat matures per ground per ~50s
  broodSeconds: [300, 420], // the clock: ~5-7 minutes of stampable buildup
  wingThreshold: 9,         // standing throats that take wing EARLY, full strength
  skipMin: 3,               // fewer than this at the clock = the cycle DISPERSES (stamped out)
  restSeconds: [180, 300],  // the roost rests between cycles
  cycleAccel: 0.88,         // a completed wing shortens the next brood clock…
  broodSecondsMin: 150,     // …floored (acceleration never degenerates)
  hiveNodeId: 'hive_node',  // the hivesands' own throat body, reused
  // THE WING — Migration's band made hostile: smaller, much quicker.
  reach: [280, 520],        // flight length (a spear across the near map, not a crossing)
  wingSpeed: 17,            // vs the herd's 7 — you chase it or meet it, never stroll after it
  homeSpeed: 22,            // it comes home quicker than it left…
  brokenHomeMul: 1.5,       // …and a BROKEN wing flees
  gorgeSeconds: 16,         // the dwell at the far pole
  radius: 34,               // band half-width (vs the herd's 44-80 — a corridor, not a front)
  faction: 'chitin',
  flightRoster: [
    { id: 'chitin_wingling', weight: 6 },              // the coin of the air
    { id: 'chitin_lancer', weight: 3 },                // the ground wasp flies escort (reused)
    { id: 'chitin_replete', weight: 2 },               // the fleeing larder (jelly on kill)
    { id: 'chitin_alate', weight: 1 },                 // the break-throat (def floor: HARD from 8)
    // THE MURMURATION rides the cycle: resident skimmers join the wing when
    // it streams — true fliers wheeling over the rush (dive-cycle brain,
    // reused whole from the baseline caste).
    { id: 'chitin_skimmer', weight: 3 },
  ],
  alateId: 'chitin_alate',
  levelBonus: 0,            // at the zone's own level (the radial field stands)
  streamInterval: 0.9,      // a hungrier pour than the herd's amble…
  streamBatch: [1, 3],      // …1-3 fliers at a time
  alateGuard: 5,            // alates downed in one flight to BREAK the wing
  // PREDATION — the event-eater lite (Deadwake's consume, aimed at herds).
  consumeChance: 0.6,       // per herd whose band the wing's crosses (once per herd per flight)
  gorgeCapBonus: 2,         // each eaten herd fattens the stream cap
  // THE WAKE — the royal register's delivery.
  cachesPerZone: [1, 2],
  wakeZoneCap: 12,
  cacheId: 'royal_cache',
  // THE PLANT — the ecological completion (queenless: no finale, the world turns).
  plant: {
    maxPlanted: 3,          // past this the cycle only ACCELERATES (the desert can't eat the map)
    biome: 'desert',        // the sand takes root at the far pole
    radius: 46,
    strength: 0.85,
  },
  variants: [
    { id: 'great', name: 'Great Swarming', weight: 2, streamCap: 12, radius: 42, color: '#e8a84a' },
    { id: 'swarm', name: 'Swarming', weight: 4, streamCap: 8, radius: 34, color: '#d89a3a' },
    { id: 'veil', name: 'Thin Veil', weight: 3, streamCap: 5, radius: 26, color: '#c08a3a' },
  ],
  color: SEETHE_AMBER,
};

// --- kill bounties (registered on import — the engine stays dumb) --------------

// A HIVE THROAT stamped in a brood ground: the ledger thins the coming wing
// (the counterplay loop), the toast reads the clock back. Tag-keyed, so the
// ordinary warrens' own hive_node bodies are untouched by this row.
registerKillHandler({
  id: 'swarm_brood_node',
  tag: 'swarm_brood_node',
  run: ctx => {
    const sf = ctx.sim.swarmingField;
    if (!sf) return;
    const r = sf.onBroodNodeBroken(ctx.zone.id);
    if (!r) return;
    ctx.bumpLedger('swarm_nodes_broken');
    ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 50),
      r.standing > 0
        ? `A hive throat is stamped — ${r.standing} still stand here`
        : r.tally > 0
          ? 'This brood ground falls silent — others still hum'
          : 'The brood grounds fall SILENT — the swarming is stamped out',
      SEETHE_AMBER, 14);
  },
});

// A WINGED ALATE cut from the stream: enough of them BREAK the wing — the
// queenless cycle's only soft throat (there is no crown to take).
registerKillHandler({
  id: 'swarm_alate',
  tag: 'swarm_alate',
  run: ctx => {
    const sf = ctx.sim.swarmingField;
    if (!sf) return;
    const r = sf.onAlateDown();
    if (!r) return;
    ctx.bumpLedger('swarm_alates_downed');
    if (r.brokeNow) {
      ctx.bumpLedger('swarming_broken');
      ctx.flash(vec(ctx.actor.pos.x, ctx.actor.pos.y), 160, SEETHE_AMBER, 0.8);
      ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 60),
        'The wing BREAKS — the Swarming turns for home, spent!', '#ffd890', 17);
    }
  },
});

// A ROYAL-JELLY CACHE broken in the wake: the claim thins (the LOOT rides the
// body's own MonsterDef.loot table — this row only keeps the ledger).
registerKillHandler({
  id: 'royal_cache',
  tag: 'royal_cache',
  run: ctx => {
    ctx.sim.swarmingField?.onCacheBroken(ctx.zone.id);
    ctx.bumpLedger('royal_caches_broken');
  },
});

export const SWARMING: ContentPackage = {
  id: 'swarming',
  label: 'The Swarming',
  color: SEETHE_AMBER,
  blurb: 'The Seethe never crowns — it CYCLES. Brood grounds in the deep sand grow hive throats you can watch climb on the map; stamp them early and the swarming shrinks or never rises. Left to build, the swarm takes wing: a fast hostile band that strips migrating herds it crosses, salts its wake with royal-jelly caches, and — unbroken — plants a new brood ground where it gorged. Cut down its winged alates mid-flight to break the wing. There is no queen. There is only the next cycle.',
  cost: 140,
  // DISCOVERED in play (runs at defaults); the Vault unlock gates TUNING,
  // surfacing once the player has met a brood ground or stood under the wing.
  unlock: {
    id: 'swarming_unlock',
    label: 'Meet the Swarming (walk a brood ground, or stand under the wing)',
    test: (ctx) => (ctx.ledger.swarming_seen ?? 0) >= 1,
  },
  // INVESTMENT LADDER — each owned tier widens the frequency slider.
  tiers: [
    { id: 'swarming_broodwatcher', label: 'Broodwatcher', requirement: 'Witness 3 Swarmings', cost: 180,
      test: (ctx) => (ctx.ledger.swarming_seen ?? 0) >= 3,
      grants: { weight: { min: 0, max: 60 } } },
    { id: 'swarming_broodbreaker', label: 'Broodbreaker', requirement: 'Stamp 20 hive throats', cost: 260,
      test: (ctx) => (ctx.ledger.swarm_nodes_broken ?? 0) >= 20,
      grants: { weight: { min: 0, max: 85 } } },
  ],
  modifiers: [
    { id: 'swarming_start', kind: 'startLevel', label: 'The cycle begins at level', min: 2, max: 2, step: 1, defaultValue: 2 },
    { id: 'swarming_weight', kind: 'weight', label: 'Swarming frequency', min: 10, max: 40, step: 5, defaultValue: 25 },
  ],
  defaultWeight: 25,
  defaultStartLevel: 2,
  defaultEnabled: true,
  // The cycle SUPPRESSES the herds while both run: fewer migrations cross a
  // world whose sky belongs to the Seethe (the in-flight predation is the
  // same claim made in person). The matrix's first suppresses edge — folded
  // in weighting.ts before shares normalize.
  relationships: [
    { a: 'swarming', b: 'migration', kind: 'suppresses', strength: 1.35 },
  ],
  world: { overlay: (ctx) => new SwarmingField(ctx, SWARMING_SURGE) },
  validate: (look) => [
    ...SWARMING_SURGE.flightRoster.filter(e => !look.monster(e.id)).map(e => `flight monster '${e.id}' unknown`),
    ...(look.monster(SWARMING_SURGE.hiveNodeId) ? [] : [`hive throat '${SWARMING_SURGE.hiveNodeId}' unknown`]),
    ...(look.monster(SWARMING_SURGE.cacheId) ? [] : [`wake cache '${SWARMING_SURGE.cacheId}' unknown`]),
    ...(look.monster(SWARMING_SURGE.alateId) ? [] : [`alate '${SWARMING_SURGE.alateId}' unknown`]),
    ...(look.faction(SWARMING_SURGE.faction) ? [] : [`faction '${SWARMING_SURGE.faction}' unknown`]),
    ...(look.biome(SWARMING_SURGE.plant.biome) ? [] : [`plant biome '${SWARMING_SURGE.plant.biome}' unknown`]),
  ],
};
