// ---------------------------------------------------------------------------
// MYCELIA — a fungal BIOME + a mobile, event-fed SPORE-DENSITY influence (a net-new
// package; a biome-hybrid). The mycelia biome (data in biomes/tilesets/levelgen) is the
// dormant home of a living bloom: it feeds on EVENTS nearby, FLARES, and lashes spores
// toward the most event-rich adjacent zone (fungal hordes pour in, that zone's events
// are SUPPRESSED — a tug-of-war). A CAPPED mass that "eats its own tail" relocates when
// pushed (chaseable, Elder-influence style); culled far/long it WITHDRAWS to dormant; at
// high density it WARPS the biome it saturated. The toggleable Heartbloom core is a
// high-risk shortcut to collapse it. Discovered in play; the Vault unlock gates TUNING.
//
// It fields a DEDICATED 'fungal' faction (contexts:['mycelia']) — the biome patron + the
// bloom's spawn. The whole mechanic is DATA on MYCELIA_SURGE.
// ---------------------------------------------------------------------------

import { vec } from '../../core/math';
import { registerKillHandler } from '../../engine/killHandlers';
import { MyceliaField, type MyceliaSurge } from '../overlays/mycelia';
import type { ContentPackage, FactionSpec } from '../types';

/** The whole Mycelia mechanic as data — every number a knob. */
const MYCELIA_SURGE: MyceliaSurge = {
  igniteChance: 0.02,     // per 0.5s step, once a mycelia home region is charted
  flareThreshold: 6,      // ~6 activity-seconds of nearby events to lash out
  flareFeed: 1,
  flareDecay: 0.5,        // a starved bloom calms back to dormant
  spreadInterval: 12,     // creeps to one more zone per ~12s (slow, grasping)
  maxHops: 6,
  minIntensity: 0.15,
  densityDecay: 0.02,     // spores slowly fade without feeding
  seedDensity: 0.45,      // the faint dormant home patch a fresh/recycled bloom starts at
  massStart: 1.5,         // ≈ a couple of zones at first
  massPerFeed: 0.4,       // the mass grows as it feeds…
  massMax: 5,             // …up to a hard cap (then it must eat its tail to keep spreading)
  cullDensity: 0.12,      // density lost per fungal kill (the player culling it back)
  cullMass: 0.06,
  cullPush: 0.5,
  pushDecay: 0.15,
  pushThreshold: 3,       // sustained culling recoils the bloom (→ relocate/chase)
  withdrawMass: 0.5,      // mass this low → it withdraws to dormant
  chaseLimit: 5,          // …or chased this many nodes
  recedeInterval: 4,      // a ring recedes every 4s during withdraw
  suppressPerDensity: 0.7, // density 1 → that zone's events drop to 0.3×
  suppressFloor: 0.2,
  transformDensity: 0.85, // a zone this saturated warps to the mycelia biome
  warp: { radius: 70, strength: 0.85 }, // the biome-warp geometry stamped at a saturated zone
  homeBiome: 'mycelia',
  faction: 'fungal',
  heartbloom: { enabled: true, defId: 'fungal_heartbloom', promote: 'crowned' },
  reward: { xpBase: 300, xpPerLevel: 50, gems: 4 },
  color: '#8fd06f',
};

/** THE BLOOM — the fungal 'fungal' faction. contexts:['mycelia'] keeps it to fungal
 *  ground + the bloom's spread (never baseline war). The biome patron. Its roster now
 *  fields TWO kins: the drifting SPORE side (clouds, bursts, exhalations) and the
 *  solid CAP-FOLK (myconid infantry under one great dome) — presence-banded so young
 *  ground is sporelings and caplings, and the Sovereign walks only old mycelium
 *  (WARLORD_OF.fungal — the Bloom finally crowns). */
const FUNGAL_FACTION: FactionSpec = {
  id: 'fungal',
  name: 'the Bloom',
  color: '#8fd06f',
  traits: { roaming: 0.3, aggression: 1.0, warlordHome: 'origin', homeBiome: 'mycelia', contexts: ['mycelia'] },
  roster: [
    { id: 'fungal_sporeling', weight: 4 },
    { id: 'fungal_puffball', weight: 2 },
    { id: 'fungal_spitter', weight: 3 },
    { id: 'fungal_brute', weight: 2 },
    { id: 'fungal_tender', weight: 1 },
    { id: 'spore_drifter', weight: 2, presence: { from: 4, fadeIn: 2 } },
    { id: 'mushroomling', weight: 3, presence: { to: 14, fadeOut: 5 } },
    { id: 'myconid_warrior', weight: 3, presence: { from: 5, fadeIn: 3 } },
    { id: 'myconid_capcaller', weight: 2, presence: { from: 9, fadeIn: 4 } },
    { id: 'bolete_brute', weight: 2, presence: { from: 13, fadeIn: 5 } },
    { id: 'amanita_sovereign', weight: 1, presence: { from: 22, fadeIn: 8, mul: 2 } },
  ],
};

export const MYCELIA: ContentPackage = {
  id: 'mycelia',
  label: 'Mycelia',
  color: '#8fd06f',
  blurb: 'Somewhere in the wilds, a fungal bloom has taken root — and it is hungry. It feeds on turmoil: let war, ritual, or rift fester near it and it flares, hurling spores down the road toward the noise, smothering that land in mushrooms and choking out whatever else stirred there. Cut down its hordes and it recoils, drawing its mass back into itself and slinking off to thicker ground — you can chase it node to node, but harry it long enough and it folds back into its quiet grotto to wait. Strike the Heartbloom at its core to collapse it outright. It is never truly killed, only pushed back, forever creeping toward the next disturbance.',
  cost: 140,
  unlock: {
    id: 'mycelia_unlock',
    label: 'Stumble into a spore-laced zone (the bloom spreads on its own)',
    test: (ctx) => (ctx.ledger.mycelia_seen ?? 0) >= 1,
  },
  tiers: [
    { id: 'mycelia_warden', label: 'Spore Warden', requirement: 'Push back the bloom 3 times', cost: 180,
      test: (ctx) => (ctx.ledger.mycelia_pushed ?? 0) >= 3,
      grants: { weight: { min: 0, max: 80 } } },
    { id: 'mycelia_purger', label: 'Bloom Purger', requirement: 'Fell 2 Heartblooms', cost: 260,
      test: (ctx) => (ctx.ledger.heartblooms_slain ?? 0) >= 2,
      grants: { weight: { min: 0, max: 100 } } },
  ],
  modifiers: [
    { id: 'mycelia_start', kind: 'startLevel', label: 'Mycelia begins at level', min: 4, max: 4, step: 1, defaultValue: 4 },
    { id: 'mycelia_weight', kind: 'weight', label: 'Mycelia frequency', min: 20, max: 55, step: 5, defaultValue: 35 },
  ],
  defaultWeight: 35,
  defaultStartLevel: 4,
  defaultEnabled: true,
  world: { overlay: (ctx) => new MyceliaField(ctx, MYCELIA_SURGE) },
  factions: [FUNGAL_FACTION],
  validate: (look) => {
    const out: string[] = [];
    if (!look.faction(MYCELIA_SURGE.faction)) out.push(`surge faction '${MYCELIA_SURGE.faction}' unknown`);
    if (!look.monster(MYCELIA_SURGE.heartbloom.defId)) out.push(`heartbloom '${MYCELIA_SURGE.heartbloom.defId}' unknown`);
    if (!look.biome(MYCELIA_SURGE.homeBiome)) out.push(`homeBiome '${MYCELIA_SURGE.homeBiome}' unknown`);
    return out;
  },
};

// MYCELIA: a slain fungal CULLS the bloom's grip on this zone (density drops; sustained
// culling recoils + relocates the bloom — the player pushing it back).
registerKillHandler({
  id: 'mycelia_cull',
  tag: 'mycelia',
  run: ctx => {
    ctx.sim.myceliaField?.cull(ctx.zone.id, 1);
  },
});

// THE HEARTBLOOM — felling the core FORCES the bloom to collapse to dormant (the
// high-risk shortcut), for the bloom-scale spoils.
registerKillHandler({
  id: 'mycelia_heart',
  tag: 'mycelia_heart',
  run: ctx => {
    ctx.sim.myceliaField?.onHeartbloomSlain();
    ctx.bumpLedger('heartblooms_slain');
    const myc = ctx.sim.myceliaField?.surge();
    if (myc?.reward) {
      ctx.grantXp(Math.round(myc.reward.xpBase + ctx.zone.level * myc.reward.xpPerLevel));
      for (let i = 0; i < myc.reward.gems; i++) ctx.dropGemAt(ctx.actor.pos);
    }
    ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 56),
      'The Heartbloom bursts — the Bloom collapses back into itself!', myc?.color ?? '#8fd06f', 18);
  },
});
