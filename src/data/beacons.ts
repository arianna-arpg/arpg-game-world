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
import { registerTransit } from './transit';

export const BEACON_CFG = {
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
  /** The fixture's doodad kinds (dormant / lit) — looks in doodadVisuals.ts;
   *  the engine swaps dormant → lit at full charge (a pure kind swap, so the
   *  bake cache and the light layer both just follow the data). */
  kind: 'survey_spire',
  kindLit: 'survey_spire_lit',
  /** Fixture body radius (world units). */
  radius: 15,
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

// The objective's off-screen pointer: an un-charged spire is a needle in a
// large zone; the chevron rides the shared attention fabric (mapMarkers'
// in-zone sibling) so finding it never needs a wiki.
registerAttentionSource((world: World): AttentionPoint[] => {
  const v = world.spireView();
  if (!v || v.done) return [];
  return [{
    id: 'survey_spire', pos: v.pos, color: BEACON_CFG.accent, glyph: '▲',
    label: v.frac > 0 ? 'the spire charges' : 'a dormant spire', z: 2,
  }];
});
