// ---------------------------------------------------------------------------
// SURVEY SPIRES — the 'beacon' zone objective, every number as data.
//
// A dormant stone spire stands somewhere in the zone. HOLD YOUR GROUND beside
// it (presence, not idleness — you will be fighting) and it charges; while any
// charge is banked, the glow LURES idle wanderers in earshot toward it (drawn,
// never enraged — the world's own population becomes the pressure, no waves,
// no bonus spawns). At full charge the spire flares and SURVEYS the overworld:
// every '?' frontier within its map radius charts into a real node (the
// eager-web mint path), concealed ground is unveiled, and everything in the
// pulse is marked as map INTEL (real names on ground you haven't walked).
//
// The pieces ride the existing fabrics, registered from here so a re-tune (or
// a package's re-registration) needs no engine edit:
//   - hold ring + charge ring style + reach   → the 'beacon' TRANSIT row
//   - fixture solidity / spacing              → registerDoodadRule
//   - looks (dormant + lit, one painter)      → data/doodadVisuals.ts
//   - off-screen "it's over there" chevron    → registerAttentionSource
//   - the lure                                → World.setLure (the generic
//                                               monster-attention fabric this
//                                               pass introduces — bait items
//                                               and noise-maker skills can
//                                               ride the same call)
// ---------------------------------------------------------------------------

import { registerDoodadRule } from '../engine/levelgen';
import type { World } from '../engine/world';
import { registerAttentionSource, type AttentionPoint } from '../world/attention';
import { CONTEST_CFG, type ContestSpec } from './objectives';
import { registerTransit } from './transit';

export const BEACON_CFG = {
  /** Door clearance (world units) a spire/waystone keeps from the zone's
   *  entry, exits, mouths and gates at placement — a spire atop a portal is
   *  a misclick machine (the shared INTERACT_PLACE_CFG idea, beacon-tuned:
   *  a little wider, the lure crowd needs the room). */
  portalClear: 130,
  /** Seconds of held ground to fully charge the spire. Precedence:
   *  ObjectiveSpec.chargeSec → the 'beacon' transit row's dwell → this. */
  chargeSec: 22,
  /** Presence ring (world units) within which the charge builds — lives on
   *  the transit row's `radius` so it tunes like every other dwell family. */
  holdRadius: 130,
  /** While charge is banked, idle enemies within this range drift toward the
   *  glow (ObjectiveSpec.lureRadius overrides). */
  lureRadius: 640,
  /** Lure walk pace (fraction of full speed — a drawn stroll, not a charge). */
  lurePace: 0.5,
  /** Drawn bodies stop pressing at this range and mill about the light —
   *  a crowd gathers around the spire, it doesn't stack onto it. */
  lureStandoff: 120,
  /** World-map radius the finished spire surveys (charts frontiers, lifts
   *  concealment, marks intel). ObjectiveSpec.revealRadius overrides. */
  revealRadius: 330,
  /** THE RECON CAP: how many NEW nodes (unvisited, unsurveyed) the finished
   *  survey actually reveals — a seeded RANDOM ASSORTMENT from inside the
   *  pulse, not the whole disc (the old whole-disc unfurl dumped ~80+ nodes
   *  of intel and flattened the map's mystery in one flare). The pick is
   *  deterministic per zone (seed × revealSalt): reload and the same spire
   *  names the same places. ObjectiveSpec.revealCount overrides; the
   *  harbor's PURCHASED charts keep their whole-disc pulse (a paid chart is
   *  a different promise). */
  revealCount: 10,
  /** Salt for the reveal pick's seeded stream (over the zone's own seed). */
  revealSalt: 0x53a9e1,
  /** THE CONTEST LAW at the stone (data/objectives.ts): any live counted
   *  enemy inside the ring stalls the charge; a crowd (`drainAt`+) drains
   *  banked seconds — attended or not, so the lure's own drawn moths smother
   *  an abandoned stone back down. The zone's ObjectiveTuning.contest
   *  overrides (or `false` waives). "Truly cleared" is the whole ask. */
  contest: { ...CONTEST_CFG, radius: 150 } as ContestSpec,
  /** THE OPERATION'S PRESSURE: while any stone holds banked, unfinished
   *  charge, the working of the leyline BLEEDS — small reinforcement groups
   *  arrive at the rim on a jittered clock and drift in on the standing
   *  lure. The body of each group is the zone's OWN population (the
   *  disturbed-locals thesis); `mixFactions` seasons it with essence-drawn
   *  opportunists through the extraction package's faction grammar (the
   *  Marrow-Drawn follow charged ley like they follow bleeding marrow).
   *  ObjectiveSpec.reinforce overrides any dial; `false` silences it. */
  reinforce: {
    /** Seconds between arrivals (jittered band) while the operation lives. */
    every: [9, 14] as [number, number],
    /** Bodies per arrival. */
    batch: [1, 2] as [number, number],
    /** Live drawn reinforcements at once (tag 'spire_drawn') — the trickle
     *  never becomes a wave. */
    cap: 7,
    /** Faction rosters folded into the arrival table (FACTIONS registry —
     *  absent rosters degrade silently to the native table). */
    mixFactions: ['marrowdrawn'] as readonly string[],
    /** Chance an arriving body draws from the mix rosters instead. */
    mixChance: 0.35,
    /** Arrival band (world units) around the pressed stone. */
    radius: [320, 460] as [number, number],
    /** Level bonus on arrivals over the zone's own level. */
    levelBonus: 0,
  },
  /** The fixture's doodad kinds (dormant / lit) — looks in doodadVisuals.ts;
   *  the engine swaps dormant → lit at full charge (a pure kind swap, so the
   *  bake cache and the light layer both just follow the data). */
  kind: 'survey_spire',
  kindLit: 'survey_spire_lit',
  /** Fixture body radius (world units). */
  radius: 15,
  /** ATTUNEMENT CIRCUIT dressing (ObjectiveSpec count 2+): the smaller
   *  WAYSTONE kinds each stone wears, and its body radius. Same painter,
   *  its own looks rows — the circuit reads as kin, not clones. */
  kindWay: 'waystone',
  kindWayLit: 'waystone_lit',
  wayRadius: 11,
  /** Accent used by the spire's texts / flashes / chevron (the gem's tint). */
  accent: '#8fd4ff',
  /** Flare tint at completion (the survey pulse). */
  flare: '#bfe8ff',
} as const;

// The hold ring: charge SECONDS live here (one row to retune), the stand-in
// radius rides the same row, and the renderer's single ring pass styles the
// charge ring off `ring` like every dwell family. Reach defaults to 'sight' —
// you cannot charge a spire a wall hides.
registerTransit({
  kind: 'beacon', dwell: BEACON_CFG.chargeSec, radius: BEACON_CFG.holdRadius,
  ring: { radius: 46, width: 4, color: BEACON_CFG.accent },
});

// The monument is TRUE STONE underfoot (bodies walk around it) but a slender
// needle overhead — shots sail past it, so the stand it hosts stays a fight,
// not a pillar-hump. Same siting discipline as the other monuments.
registerDoodadRule(BEACON_CFG.kind, {
  overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 300,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
});
registerDoodadRule(BEACON_CFG.kindLit, {
  overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 300,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
});
// Waystones: the circuit's smaller kin — same discipline, tighter spacing
// (several share one zone).
registerDoodadRule(BEACON_CFG.kindWay, {
  overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 220,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
});
registerDoodadRule(BEACON_CFG.kindWayLit, {
  overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 220,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
});

// The objective's off-screen pointer: an un-charged spire is a needle in a
// large zone; the chevron rides the shared attention fabric (mapMarkers'
// in-zone sibling) so finding it never needs a wiki. Points at the NEAREST
// unfinished stone, so a circuit walks you leg by leg.
registerAttentionSource((world: World): AttentionPoint[] => {
  const v = world.spireView();
  if (!v || v.done) return [];
  const stone = v.count > 1 ? 'waystone' : 'spire';
  const label = v.draining ? `the ${stone} is overrun — its charge drains!`
    : v.contested ? `the ${stone} is contested — clear the ground`
      : v.frac > 0 ? `the ${stone} charges` : `a dormant ${stone}`;
  return [{
    id: 'survey_spire', pos: v.pos, color: BEACON_CFG.accent, glyph: '▲',
    label, z: 2,
  }];
});
