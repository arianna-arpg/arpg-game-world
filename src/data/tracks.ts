// ---------------------------------------------------------------------------
// TRACK RIDERS + CONTACT DOODADS — the moving-hazard kit, as data.
//
// A rider row = a body that travels authored lanes (engine/tracks.ts): its
// honest hit surface, its payload (typed mitigated damage / status / shove),
// its look (a DOODAD_VISUALS painter row keyed by `kind`), its warn arc. A
// contact rule = the SAME payload grammar on a doodad that never moves (the
// bumper). Debut kit is the Deepwinter set — the Winter King's frozen-lake
// court — but the grammar is open: a sawmill's log blade, a clockwork
// vault's sweep arm are one row each, zero engine edits.
//
// AGREEMENT CONTRACT (validation-pinned, the DoodadRule.surface doctrine):
// a rect rider's beam params on its visual row must equal its surface
// half-extents — the drawn beam IS the tested rect.
// ---------------------------------------------------------------------------

import { registerDoodadRule } from '../engine/levelgen';
import { registerTrackRider } from '../engine/tracks';

// --- THE SHEAR DISC — the buzzsaw ------------------------------------------
// A grinding wheel of ice-shard teeth riding carved grooves. Physical bite +
// bleed + a soft shove (on glare ice, even the soft shove travels). The
// Rimebound are HOME among their blades — the court skates between them.
registerTrackRider({
  id: 'shear_disc',
  kind: 'shear_disc',
  surface: { kind: 'circle', r: 30 },
  spin: 9,
  payload: {
    hit: { base: 24, perLevel: 7, type: 'physical' },
    status: { id: 'bleed', chance: 0.6 },
    impulse: 120,
    icdSec: 0.9,
    notFactions: ['rimebound'],
  },
  warnAhead: 140,
  color: '#cfeefc',
});

// --- THE RIME FLAIL — the revolving blade arm ------------------------------
// A crystalline beam sweeping a hub (fan-blade energy): the lane is a tight
// ring, the arm points radially, and the whole spoke wheels forever. Cold
// bite + chill + a real shove — the arm that sweeps you toward the rim.
registerTrackRider({
  id: 'rime_flail',
  kind: 'rime_flail',
  surface: { kind: 'rect', hw: 56, hh: 9 },
  orient: 'radial',
  payload: {
    hit: { base: 18, perLevel: 6, type: 'cold' },
    status: { id: 'chill', chance: 1 },
    impulse: 240,
    icdSec: 0.8,
    notFactions: ['rimebound'],
  },
  warnAhead: 150,
  color: '#bfe8ff',
});

// --- THE PALE FERRY — the River of Souls' carrier ---------------------------
// The first CARRY rider (TrackRiderDef.carry — THE DECK LAW): its rect
// surface is moving FOOTING, not a hazard — an empty payload is the whole
// point (the platform validator waiver). Bodies standing on the boards ride
// the deck; the hull frays over the last stretch of every journey
// (fadeTail) and dissolves at the terminus strand, reborn at the head on
// the pure clock (the lane's once+rearm cycle — world/soulriver.ts). No
// warn arc: a harmless surface telegraphs nothing. Deck half-extents are
// pinned to the soulFerry painter's deckHw/deckHh (the flail's agreement
// contract) AND to SOULRIVER_CFG.ferry.deck (the lane the plan builds).
registerTrackRider({
  id: 'pale_ferry',
  kind: 'pale_ferry',
  surface: { kind: 'rect', hw: 88, hh: 42 },
  orient: 'lane',
  payload: {},
  carry: true,
  fadeTail: 0.14,
  warnAhead: 0,
  color: '#9fd4e8',
});

// --- THE CARVED GROOVE — the lane made legible ------------------------------
// Ground way discs laid under every gen-authored lane (layTraveledWay kind
// 'track_groove'): walkable, never blocking, CLEARWAY-protected so scatter
// can never squat on a blade's path — the lane the player learns is a lane
// the generator promised to keep clear.
registerDoodadRule('track_groove', { overlap: 'ground', clearway: {} });

// --- THE RIME BUMPER — the pinball dome ------------------------------------
// A squat glazed dome that answers a touch with a WEIGHT-SCALED radial fling
// (pushActor — impulse-additive, pit-aware: near an abyss lip, the bounce is
// the whole conversation) plus a lick of slip. No damage of its own — a
// bumper is a movement argument, and the arena's edge does the arithmetic.
// Walk-through on purpose (overlap 'trigger'): you don't lean on a bumper,
// you get thrown by it. The Court is spared — they know their own furniture.
registerDoodadRule('rime_bumper', {
  overlap: 'trigger',
  spacing: 96,
  contact: {
    impulse: 430,
    status: { id: 'slippery', chance: 1 },
    icdSec: 0.4,
    notFactions: ['rimebound'],
  },
});

// --- THE SARSEN BUMPER — the quarry's standing argument ---------------------
// The rime bumper's grammar in old stone (the mass fabric's terrain voice):
// a leaning sarsen knob that answers a touch with a weight-scaled radial
// fling — no slip, no damage of its own; MASS does the arithmetic (a scree
// flake flies a screen, the sarsen ram barely notices, and near a gulf lip
// the bounce is the whole conversation). The stonekin are spared — they
// know their own furniture.
registerDoodadRule('sarsen_bumper', {
  overlap: 'trigger',
  spacing: 110,
  forbidOn: ['water', 'lava', 'chasm'],
  contact: {
    impulse: 400,
    icdSec: 0.45,
    notFactions: ['elemental'],
  },
});

// --- THE MADDERCAP — the confusion family's terrain voice -------------------
// Spiral-capped toadstools that PUFF when brushed: a chime of addling dust,
// and the walker loses a cardinal (disoriented — five brushes and they turn
// widdershins). Walk-through by design (overlap 'trigger'): feet decide, and
// a careful route simply goes around — the clump is a PRICE on the straight
// line, never a wall. Faction-blind like every touch-rule: the dust addles
// wolf and hero alike, and herding a pack THROUGH the caps with a Turnwise
// Hex is exactly the emergent play the family exists for.
registerDoodadRule('maddercap', {
  overlap: 'trigger',
  spacing: 70,
  forbidOn: ['water', 'lava', 'chasm'],
  contact: {
    icdSec: 1.2,
    status: { id: 'disoriented', chance: 1 },
  },
});

// --- THE GORE STAKES — the grab fabric's terrain payoff ---------------------
// Sharpened rows in the grip kin's grounds (engine/grab.ts). SPEED-GATED
// (TrackPayload.minSpeed): careful feet pick through free, but any body
// ARRIVING at push-speed — a Heave, a mauler's toss, a bowling-lane plow,
// a bumper fling — is shredded and left bleeding. Mass and authority do
// the launch arithmetic; the stakes just collect what arrives. Walkable
// on purpose: the lane between the stakes is the duel's geometry.
registerDoodadRule('gore_stakes', {
  overlap: 'trigger',
  spacing: 90,
  forbidOn: ['lava', 'chasm'],
  contact: {
    // 520: above every ordinary combat knockback's brief peak (impulse
    // speed = strength × damping ÷ weight) — only REAL launches qualify:
    // a Heave, a mauler's toss, a bumper fling, a bowling-lane plow.
    minSpeed: 520,
    hit: { base: 9, perLevel: 1.1, type: 'physical' },
    status: { id: 'bleed', chance: 0.8 },
    icdSec: 0.5,
  },
});
