// ---------------------------------------------------------------------------
// PROCESSIONS — the 'procession' zone objective, every number as data.
//
// A caravan cart waits DORMANT beside the gate you entered through — immobile,
// immune, just cargo under canvas — until you LINGER beside it (the
// 'procession' transit row below: dwell seconds, stand-in radius, ring style).
// Then it sets out: down the carved gravel way (the exitRoads seam stamps a
// worn road from your entry to the far exit at generation time, so the land
// itself tells you where the caravan is headed) toward the crossing, steering
// on the zone's own path field.
//
// The defense is emergent, not scripted: the rolling cart holds a LURE (the
// monster-attention fabric), so the zone's own population drifts in after the
// goods and turns on the cart the moment it perceives one — and BANDIT
// AMBUSHES puff from smoke along the way (the only spawns the objective adds).
// Robbers ADJACENT to the cart stop it dead — a mobbed caravan goes nowhere
// until you clear the wheels.
//
// The objective can be WON (the cart reaches the crossing — completeObjective
// pays the bounty and unseals the chest) or LOST (the cart dies —
// World.objectiveLost: the bounty is forfeit, nothing locks, and the zone's
// TTL refresh deals a fresh caravan). Losing costs you the reward, never the
// road.
// ---------------------------------------------------------------------------

import type { PackTableEntry } from './zones';
import type { ExitRoadSpec } from './zones';
import type { World } from '../engine/world';
import { registerAttentionSource, type AttentionPoint } from '../world/attention';
import { registerTransit } from './transit';

export const PROCESSION_CFG = {
  /** The cart's monster def (driven: no brain — the objective runtime steers). */
  cartId: 'caravan_cart',
  /** Cart life = base + zone level × perLevel (stamped over the def's nominal
   *  pool, the extraction-node idiom — the def stays a display shell). */
  lifeBase: 220,
  lifePerLevel: 46,
  /** March speed as a fraction of the cart's own move rate. */
  speedMul: 0.62,
  /** Within this of the destination portal, the caravan has ARRIVED. */
  arriveDist: 84,
  /** Seconds after zone entry before the rally dwell can BUILD — the cart
   *  waits by your entrance, and arriving must never accidentally rally it
   *  while you read the ground. */
  entryGraceSec: 2.5,
  /** A live robber within this of the cart stops it (clear the wheels). */
  robRadius: 110,
  /** The rolling cart's lure: idle locals within this drift after the goods. */
  lureRadius: 520,
  lurePace: 0.6,
  lureStandoff: 60,
  /** Bandit ambushes: every [min,max] seconds of ACTIVE march, [countMin,max]
   *  robbers puff from smoke near the road ahead — capped while `cap` of this
   *  objective's robbers still stand (no infinite pile-up). */
  puffEvery: [7, 12] as [number, number],
  puffCount: [2, 3] as [number, number],
  puffCap: 9,
  /** Puff placement: this far ahead of the cart along its heading, jittered. */
  puffLead: 230,
  puffJitter: 90,
  /** The FIXATION GRAFT the robbers wear (the extraction-swarm idiom): the
   *  goods are the enemy until you out-shout them on the threat chart. */
  fixation: { stickiness: 0.6, decay: 0.05, seedThreat: 40 },
  /** The default robber roster (spec.robbers overrides; folded at zone level
   *  through the same weightedPick presence fold as every spawn table). */
  robbers: [
    { id: 'bandit_cutthroat', weight: 4 },
    { id: 'bandit_bruiser', weight: 3 },
    { id: 'bandit_fusilier', weight: 2 },
    { id: 'bandit_grenadier', weight: 1 },
    { id: 'bandit_matchlock', weight: 1 },
  ] as PackTableEntry[],
  /** The carved TRAVELED WAY from your entry to the caravan's crossing (the
   *  exitRoads seam — same fabric as the Holdfast's kept road). */
  road: { from: 'entry' } as ExitRoadSpec,
  /** Palette: canvas-and-brass for texts/rings, smoke for the ambush puffs. */
  accent: '#d8b46a',
  smoke: '#8a8478',
} as const;

// The rally dwell: linger beside the dormant cart to set the procession
// moving. Ring styled here like every dwell family; reach 'radius' — you
// rally a cart by standing at its wheel, walls irrelevant at that range.
registerTransit({
  kind: 'procession', dwell: 0.9, radius: 96, reach: 'radius',
  ring: { radius: 40, width: 4, color: PROCESSION_CFG.accent },
});

// The off-screen pointer: dormant = "a caravan waits", rolling = follow the
// goods. Rides the shared attention fabric — no renderer edits.
registerAttentionSource((world: World): AttentionPoint[] => {
  const v = world.processionView();
  if (!v || v.done || v.lost) return [];
  return [{
    id: 'procession_cart', pos: v.pos, color: PROCESSION_CFG.accent, glyph: '⚑',
    label: v.started ? 'the caravan rolls' : 'a caravan waits', z: 2,
  }];
});
