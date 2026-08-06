// ---------------------------------------------------------------------------
// MYCELIA — a fungal BIOME + an ANCHORED spore NETWORK (a biome-hybrid package).
// The mycelia biome (data in biomes/tilesets/levelgen) is the FOUNDATION of a
// living web: it feeds on EVENTS nearby, FLARES, and claims zones outward from
// its home along the zone-graph's own edges — nodes and edges on the map, the
// crusade's territory grammar rooted in a place. The biome never changes or
// shifts; instead claimed ground occasionally EXPRESSES — SPOREFALL stands
// over the zone (eventOnly weather + temporary fungal dress dissolving as it
// passes — the transience doctrine verbatim) while the fungal season its
// spawns and the sporebed membrane walks in on the Bloom-Matron's own body.
// Cut a claim bare and everything grown through it withers (fragmentation);
// cut the web back to its foundation and the bloom falls dormant; fell the
// Heartbloom at the root to collapse it outright. It is anchored BY LAW —
// that foundation is exactly why it can be eaten from (the containment
// asymmetry vs the mobile Contagion, packages/groundClaims.ts).
//
// It fields a DEDICATED 'fungal' faction (contexts:['mycelia']) — the biome
// patron + the network's spawn. The whole mechanic is DATA on MYCELIA_SURGE.
// ---------------------------------------------------------------------------

import { vec } from '../../core/math';
import { DOODAD_VISUALS } from '../../data/doodadVisuals';
import { CREEPS } from '../../engine/creep';
import { registerKillHandler } from '../../engine/killHandlers';
import { registerWeather, WEATHER_DEFS } from '../../world/weather';
import { MyceliaField, type MyceliaSurge } from '../overlays/mycelia';
import type { ContentPackage, FactionSpec } from '../types';

/** The Bloom's own violet — the spore front reads as the sporebed membrane's
 *  family (rim '#c8b8d8' / glow '#d8c8e8' / the Matron '#a898c0'), splitting
 *  it unmistakably from the Contagion's sick green on every surface. [FLAGGED:
 *  the re-hue is the coordinator's look choice — palette.ts' SPORE_COLORS
 *  fallback still carries the old near-twin green until the user blesses it.] */
const BLOOM_VIOLET = {
  color: '#a890cc',
  glow: { strong: '#b8a0d8', weak: '#4a3e5c', accent: '#e8d8f8' },
};

/** The whole Mycelia mechanic as data — every number a knob. Numbers marked
 *  [FLAGGED] are the coordinator's, awaiting the user's word (mycelia-front
 *  pass); everything else is carried from the pre-front bloom unchanged. */
const MYCELIA_SURGE: MyceliaSurge = {
  igniteChance: 0.02,     // per 0.5s step, once a mycelia home region is charted
  flareThreshold: 6,      // ~6 activity-seconds of nearby events to flare out
  flareFeed: 1,
  flareDecay: 0.5,        // a starved network stops grasping
  spreadInterval: 12,     // claims one more zone per ~12s (slow, grasping)
  maxHops: 6,
  minIntensity: 0.15,
  densityDecay: 0.02,     // grip fades without feeding
  seedDensity: 0.45,      // the faint dormant foundation patch
  claimCap: 7,            // [FLAGGED] home + 6 — the web's whole reach (the old ~5-zone mass, anchored)
  cullDensity: 0.12,      // grip lost per fungal kill (the player eating it back)
  recedeInterval: 4,      // a ring retracts every 4s during the collapse
  suppressPerDensity: 0.7, // grip 1 → that zone's events drop to 0.3×
  suppressFloor: 0.2,
  homeBiome: 'mycelia',
  faction: 'fungal',
  // The crown is EARNED at zone level 6 (the repo's earliest crowned floor —
  // contagion's) — a bloom met at the level-4 start stands champion until the
  // ground reaches promoteAt.
  heartbloom: { enabled: true, defId: 'fungal_heartbloom', promote: 'crowned', promoteAt: 6 },
  // THE EXPRESSION — all numbers [FLAGGED] (coordinator's, awaiting her word).
  express: {
    chance: 0.02,          // per 0.5s step while spreading + cooled (~1 window per ~25s of standing spread)
    holdSec: [90, 150],    // the sporefall window
    cooldownSec: [180, 300],
    easeSec: 20,           // the sky gathers and clears over ~20s
    floor: 0.35,           // the front always reads while it stands
    minClaims: 2,          // the web must actually reach somewhere first
    amp: 2.5,              // fungal weight amp on the expressed zone's own rolls
    weatherKind: 'spored_air',
  },
  reward: { xpBase: 300, xpPerLevel: 50, gems: 4 },
  color: BLOOM_VIOLET.color,
  glow: BLOOM_VIOLET.glow,
};

/** THE BLOOM — the fungal 'fungal' faction. contexts:['mycelia'] keeps it to
 *  fungal ground + the network's claims (never baseline war). The biome patron.
 *  Its roster fields the drifting SPORE side (clouds, bursts, exhalations), the
 *  solid CAP-FOLK (myconid infantry under one great dome) — presence-banded so
 *  young ground is sporelings and caplings, and the Sovereign walks only old
 *  mycelium (WARLORD_OF.fungal) — and now THE CLAIMER: the Bloom-Matron whose
 *  own body lays the sporebed membrane (MonsterDef.creepSource — the physical
 *  presence through the creep fabric; kill her and the floor recoils). */
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
    // THE CLAIMER walks with the web from mid-presence: her sporebed mat is
    // the network's membrane made ground (probe_spent pins the court's claim).
    { id: 'bloom_matron', weight: 1, presence: { from: 7, fadeIn: 3 } },
    // The high court pass: the orchard that walks — prune the caps or
    // weather both seasons (the anatomy lesson in Bloom dress).
    { id: 'fruiting_titan', weight: 1, presence: { from: 11, fadeIn: 5 } },
    { id: 'bolete_brute', weight: 2, presence: { from: 13, fadeIn: 5 } },
    { id: 'amanita_sovereign', weight: 1, presence: { from: 22, fadeIn: 8, mul: 2 } },
  ],
};

export const MYCELIA: ContentPackage = {
  id: 'mycelia',
  label: 'Mycelia',
  color: BLOOM_VIOLET.color,
  blurb: 'Somewhere in the wilds, a fungal bloom has taken root, and it is patient. From its home ground it grows a web — node by node, along the very roads of the world — feeding on whatever turmoil festers nearby. Where the web holds, spores smother the land\'s own troubles; now and then a claimed zone goes loud with SPOREFALL, mushrooms standing up out of the ground as if the fungus biome itself were spreading, the Bloom\'s kin overrunning whatever else lives there. But the web is anchored, and that is its weakness: every filament is attackable ground. Cull a zone bare and everything grown through it withers at once. Cut the web back to its foundation, or strike the Heartbloom at the root, and the whole network collapses — until it flares again.',
  cost: 140,
  unlock: {
    id: 'mycelia_unlock',
    label: 'Stumble into a spore-laced zone (the web grows on its own)',
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
    if (!WEATHER_DEFS[MYCELIA_SURGE.express.weatherKind]) out.push(`express weather '${MYCELIA_SURGE.express.weatherKind}' unknown`);
    for (const r of WEATHER_DEFS[MYCELIA_SURGE.express.weatherKind]?.dress?.rows ?? []) {
      if (!DOODAD_VISUALS[r.doodad]) out.push(`sporefall dress doodad '${r.doodad}' unknown`);
    }
    if (!look.monster('bloom_matron')) out.push(`claimer 'bloom_matron' unknown`);
    if (!CREEPS.sporebed) out.push(`membrane creep 'sporebed' unknown`);
    return out;
  },
};

// --- the sporefall sky (one weather row — wash, radiance, wind, DRESS) --------
//
// THE EXPRESSION AS WEATHER (the transience doctrine's presentation lane, the
// quickened_air idiom): pinned by the overlay's event-front source while a
// claim expresses, gone the breath the window closes. The dress rows are the
// fungal kit already in the registries (mycelia-biome kinds — a new look
// would be one doodadVisuals entry): planted while the front holds, dissolved
// via Doodad.evap as it lifts. The land was never touched — the biome does
// not change or shift, it only reads as if the fungus were spreading.
// Spawn muls stay NEUTRAL: the overlay's own affectSpawns seasons the
// expressed zone (the demonstorm precedent — the weather row is presentation).
// Dress counts/radii [FLAGGED].
registerWeather('spored_air', {
  radiance: { mul: 0.82 },  // spore-dimmed light — a bruised violet noon
  label: 'Sporefall', color: BLOOM_VIOLET.glow.strong, countMul: 1.0, factionMul: {},
  wind: 0.12, rampFrac: 0.35,
  eventOnly: true,
  dress: {
    rows: [
      { doodad: 'spore_pod', count: [3, 6], radius: [10, 16], minGap: 150 },
      { doodad: 'giant_mushroom', count: [1, 2], radius: [14, 20], minGap: 300, solid: true },
      { doodad: 'mycelial_mat', count: [2, 4], radius: [14, 22], minGap: 180 },
    ],
  },
});

// MYCELIA: a slain fungal on claimed ground EATS the web's grip there (grip
// drops; a zone eaten bare is CUT and its subtree withers — the fragmentation
// law; cut back to the foundation = pushed back). The fast path is the entry
// pour's 'mycelia' tag; the predicate widens the cull to EVERY fungal body on
// a claim — the expression's table-seasoned kin included — so all attackable
// presence is honest presence (the anchored network's whole point).
registerKillHandler({
  id: 'mycelia_cull',
  when: ctx => ctx.actor.tag === 'mycelia'
    || (ctx.actor.faction === MYCELIA_SURGE.faction && !!ctx.sim.myceliaField?.sporeOn(ctx.zone.id)),
  run: ctx => {
    ctx.sim.myceliaField?.cull(ctx.zone.id, 1);
  },
});

// THE HEARTBLOOM — felling the core FORCES the network's collapse (the
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
      'The Heartbloom bursts, and the web withers back into its root!', myc?.color ?? BLOOM_VIOLET.color, 18);
  },
});
