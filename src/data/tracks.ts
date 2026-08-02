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
import { DOODAD_VISUALS } from './doodadVisuals';

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
  // THE SOUL-SHIP: a traversible near-landmass — the whole deck a fighting
  // ground (a melee line can flank, kite, and hold lanes ON the boards).
  surface: { kind: 'rect', hw: 210, hh: 96 },
  orient: 'lane',
  payload: {},
  carry: true,
  fadeTail: 0.12,
  warnAhead: 0,
  color: '#9fd4e8',
});

// --- THE PALE PROW — the rundown --------------------------------------------
// The Soul-Ship's bow pressure: a same-phase ESCORT on the ferry's own lane
// (TrackRiderDef.headway — same release, same coin, same schedule seat; a
// phase-lead rider would deal its OWN journey direction at every cradle,
// releaseReversed folds phase into the coin, and would collapse onto the
// boards through every dwell). Bodies the ship runs down are wounded by the
// keel and batted ALONG the lane (the sweeper-arm grain — dribbled ahead of
// the ship, not flung wide), while the deck astern stays pure moving FOOTING:
// the gap between prow tail and deck bow spares every legal deck-stander
// (headway 280 − hh 26 − deck hw 210 = 44px of water — THE CLEARANCE LAW,
// probe-pinned). Past either strand the prow FURLS (the berth law), so no
// boarding queue is ever shoved at a pier head, and it frays with its hull
// (the ferry's own fadeTail). Faction-blind on purpose: the river parts for
// nobody — souls, strays and swimmers alike are cleared from her way.
registerTrackRider({
  id: 'pale_prow',
  kind: 'pale_prow',
  // The crest spans the hull's full beam (surface hw == deck hh): anything
  // the deck would sweep, the prow bats first. 'radial' lays it across.
  surface: { kind: 'rect', hw: 96, hh: 26 },
  orient: 'radial',
  headway: 280,
  payload: {
    hit: { base: 16, perLevel: 5, type: 'physical' },
    impulse: 280,
    push: 'along',
    icdSec: 0.8,
  },
  warnAhead: 160,
  fadeTail: 0.12,
  color: '#bfe6f6',
});

// The prow's look: the parametric beam painter as a pale surge crest (the
// trapworks' reuse precedent — one painter, another bed of colors), its
// beamHw/beamHh mirroring the surface (the agreement contract, validation-
// pinned). Registered here beside its rider so the pair can never drift
// (the open-registry assignment idiom — meta/workshop.ts does the same).
DOODAD_VISUALS['pale_prow'] = {
  painter: 'rimeFlail', order: 46,
  params: { beamHw: 96, beamHh: 26, body: '#7fb6cf', edge: '#eafaff' },
};

// --- THE FIELD WAIN — the settled belt's traffic -----------------------------
// The farmland's carriage lane (engine/settled.ts layRoadTraffic): a laden
// wain shuttling the carved portal roads on the track fabric's clock.
// TRAFFIC, not a saw — a token knock the mitigation ladder mostly eats, no
// speed gate, and the 'along' grain: a body in the road is CARRIED ahead of
// the axle down the lane (the sweeper-arm physics) rather than wounded.
// Faction-blind like every wheel: the road parts for nobody — crofter, wolf
// and hero alike get dribbled to the verge. Circle surface on purpose: the
// painter's yoke poles overhang the tested disc a touch (drawn a hair
// LARGER than tested — near-misses land in the walker's favor; the rect
// dialect's beam contract stays the blades' law). warnStyle 'traffic' (THE
// WARN VOICE): the wain's approach band wears the soft costume — faint,
// thin, never pulsing — so the cart's traveling path can never be mistaken
// for the ruin boulder's "get out of the way" (the two rode near-twin
// hay-tan bands before the voice split them). Costume only: the arc's
// geometry, the dodge-AI's read, and the axle's knock are untouched.
registerTrackRider({
  id: 'field_wain',
  kind: 'field_wain',
  surface: { kind: 'circle', r: 24 },
  payload: {
    hit: { base: 5, perLevel: 0.8, type: 'physical' },
    impulse: 260,
    push: 'along',
    icdSec: 0.7,
  },
  warnAhead: 90,
  color: '#c8a865',
  warnStyle: 'traffic',
});

// The wain's look: the plagueCart painter re-paletted as a WORKING cart —
// warm timber bed, a hay-gold lashed load, and the trailing 'flesh' stroke
// re-toned to harness leather (a loose strap off the sideboard, not an
// arm). Registered beside its rider so the pair can never drift (the
// pale_prow idiom).
DOODAD_VISUALS['field_wain'] = {
  painter: 'plagueCart', order: 54,
  params: { wood: '#6a5434', cloth: '#b89a4e', flesh: '#7a6242' },
};

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
