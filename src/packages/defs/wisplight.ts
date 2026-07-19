// ---------------------------------------------------------------------------
// THE WISPLIGHT — the marsh's own trouble: lights that bless what they pass,
// and pour themselves into the strongest thing they can find.
//
// A handful of still, neutral lamps gathers in some stretch of fen. Touch one
// and it KINDLES: it wanders a pre-drawn route, budding little lights along
// the walked path, and everything near its glow FLOURISHES (the emboldened
// blessing — the mire's own kin fight harder under the light). At the route's
// end the light turns purposeful: it drawls toward the strongest body in
// reach and pours itself IN — the possession seam's third consumer
// (riderRefusal: one law for what can be entered; the wisp's own policy for
// what it prefers). The ridden host is transformed by its light's KIND — a
// shield of cold fire, a wreath of flame, a grave-blessing — each kind one
// data row: ride status, level-computed gifts, grafted real skills, an
// epithet. Break the host and the light's hoard pays.
//
// Reuses the marsh (the one biome with no seated event of its own — and the
// folklore's home ground), the possession seam (engine/possess.ts), the
// status fabric (the flourish and the ride marks are ordinary StatusDefs),
// the evap fabric (the bloom trail dries on its own), and the wheel (the
// scene walks its own treks). The overlay owns the settle/slot/absent
// lifecycle. Discovered in play; the Vault unlock gates TUNING, like
// Haunting/Verminfall/Straying.
// ---------------------------------------------------------------------------

import { STATUS_DEFS } from '../../engine/status';
import { WisplightField, type WisplightSurge } from '../overlays/wisplight';
import type { ContentPackage } from '../types';

/** THE bog-light green — the marsh_wisp doodad's own glow, so the event reads
 *  as one thing on the map ring, the marker, and the chip. */
const BOG_LIGHT = '#b8f0a0';

export const WISPLIGHT_SURGE: WisplightSurge = {
  igniteChance: 0.012,     // per 0.5s step, × pressure — the fen's patient trouble
  maxConcurrent: 1,        // one gathering at a time
  // WHERE the lights gather (the seat fabric): the near fen, leaning gently
  // toward ground the player KNOWS — stumbling across one is the point —
  // while an unknown seat settles LATENT and murmurs (the omen below). The
  // min keeps it off the player's own boots: a gathering is ARRIVED AT.
  seat: { range: { min: 40, max: 560 }, knownMul: 1.2, unknownMul: 1, prefer: 'near' },
  // THE FEN LAW: a biome list, never a hardcode — a harsher tuning could add
  // the gloamwood's hollows or the caul's shallows.
  biomes: ['marsh'],
  // No levelMax on purpose: the whole fen, every band — the ride scales with
  // the host it takes, so the event is level-honest by construction.
  latentOnUnknown: true,
  omen: {
    whisper: 160, reveal: 60, widenPerMin: 12,
    lines: [
      'pale lights over the water, {bearing} of here — standing still, and {dist}',
      'the fowlers speak of lamps in the reeds {bearing} — lamps nobody lit',
      'something glimmers {bearing}, low over the fen, patient as a fisherman',
    ],
  },

  // --- the concrete scene ----------------------------------------------------
  wisps: [2, 4],
  // THE KINDS — the event's whole variety table. Each row is a complete ride:
  // add a row (+ its status in STATUS_DEFS) and a new color of light walks
  // the fen with its own gift. Presence-banded like any spawn table.
  kinds: [
    {
      id: 'pale_light', weight: 3, monster: 'pale_light',
      rideStatus: 'wisp_ridden_pale', epithet: 'Palelit',
      line: 'the pale light pours in — a shield of cold fire!',
      // THE WARDEN'S GIFT: a real energy-shield bubble, computed at the
      // host's level (the defense-texture doctrine — an authored ES
      // identity on a body that never had one).
      grant: { es: [30, 9], armor: [8, 2] },
    },
    {
      id: 'fen_flame', weight: 2, presence: { from: 3, fadeIn: 2 }, monster: 'fen_flame',
      rideStatus: 'wisp_ridden_flame', epithet: 'Flamewreathed',
      line: 'the fen-flame takes it — it burns to move!',
      // THE ARSON'S GIFT: speed and fury (the ride status carries the MORE
      // damage), plus a real firing skill grafted onto the kit.
      grant: { armor: [4, 1] },
      grantSkills: ['ember_dart'],
    },
    {
      id: 'grave_light', weight: 2, presence: { from: 6, fadeIn: 3 }, monster: 'grave_light',
      rideStatus: 'wisp_ridden_grave', epithet: 'Gravelit',
      line: 'the grave-light settles in — it remembers older debts.',
      // THE MOURNER'S GIFT: a thin cold shield and a real curse in the kit.
      grant: { es: [16, 5] },
      grantSkills: ['despair'],
    },
  ],
  standMinDist: 260,       // a light is stumbled ACROSS, never spawned underfoot
  kindleRadius: 30,        // the touch
  route: { points: [4, 7], segLen: [140, 260], jitterDeg: 70, edgeMargin: 140, stallSec: 1.6 },
  wanderSec: [22, 34],
  wanderPace: 0.8,
  seekPace: 0.5,           // the drawl — slow enough to watch, and to dread
  seekSec: 26,
  seekRadius: 900,
  rideRadius: 14,
  aura: { radius: 150, status: 'emboldened', pulseSec: 0.5 },
  // THE BLOOM TRAIL: tiny marsh_wisp lights (inert — no body to bar the way)
  // budded along the walk, drying on their own via Doodad.evap.
  bloom: { kind: 'marsh_wisp', every: 34, radius: [3, 5], dwell: [10, 18], rate: 3, max: 26 },
  // THE STRONGEST-HOST SCORE: the wisp's OWN policy over the seam's one
  // enterable-body law. Rarity weights (0 refuses — the crowned keep their
  // own seats, same word the player's possession policy uses), a level lean,
  // a preference for bodies its own glow already touched, and no interest in
  // critters (a Palelit Hen is a joke, not a fight).
  seek: {
    rarity: { normal: 1, magic: 1.35, rare: 1.8, champion: 2.4, crowned: 0 },
    levelWeight: 0.06,
    emboldenedMul: 1.5,
    denyTags: ['critter'],
  },
  grantSkillLevelDiv: 4,

  // --- the abstract clock ----------------------------------------------------
  absentResolveSec: [150, 260],
  absentRideChance: 0.55,  // an unwatched walking light usually finds SOMETHING
  hostHoldSec: 600,        // a champion waits ten minutes for someone to come
  resolveCooldownSeconds: [260, 440],

  reward: {
    kindleXp: 10,
    xpBase: 120, xpPerLevel: 26, gems: 1,
  },
  color: BOG_LIGHT,
};

export const WISPLIGHT: ContentPackage = {
  id: 'wisplight',
  label: 'The Wisplight',
  color: BOG_LIGHT,
  blurb: 'The fen keeps lamps nobody lit. Most of the marsh-lights are just lights — swamp breath and old phosphor, hanging over the water. But some of them WAIT, and if you walk into one of those it wakes: it rises off the reeds and wanders, and the mire flourishes wherever its glow falls — little lights budding in its wake, and every creeping thing under the blessing fighting like it finally remembered why. Follow the light long enough and it stops wandering. It looks for the strongest thing in the fen — the thing you least want blessed — and pours itself in. What stands up wears the light\'s own gift: a shield of cold fire, a wreath of flame, a grave-debt remembered, new tricks in an old body. Break the ridden thing and the light\'s hoard spills. Or touch nothing, and let the lamps keep waiting. They\'re patient. They were here before the causeway, and they\'ll be here after.',
  cost: 110,
  unlock: {
    id: 'wisplight_unlock',
    label: 'Witness a wisplight (lights gather in the fen)',
    test: (ctx) => (ctx.ledger.wisplights_seen ?? 0) >= 1,
  },
  tiers: [
    { id: 'wisplight_follower', label: 'Lightfollower', requirement: 'Kindle 8 wisplights', cost: 140,
      test: (ctx) => (ctx.ledger.wisplights_kindled ?? 0) >= 8,
      grants: { weight: { min: 0, max: 80 } } },
    { id: 'wisplight_lampbreaker', label: 'Lampbreaker', requirement: 'Break 5 ridden hosts', cost: 220,
      test: (ctx) => (ctx.ledger.wisplight_hosts_slain ?? 0) >= 5,
      grants: { weight: { min: 0, max: 100 } } },
  ],
  modifiers: [
    { id: 'wisplight_start', kind: 'startLevel', label: 'Wisplights begin at level', min: 2, max: 2, step: 1, defaultValue: 2 },
    { id: 'wisplight_weight', kind: 'weight', label: 'Wisplight frequency', min: 15, max: 50, step: 5, defaultValue: 30 },
  ],
  defaultWeight: 30,
  defaultStartLevel: 2,
  defaultEnabled: true,
  world: { overlay: (ctx) => new WisplightField(ctx, WISPLIGHT_SURGE) },
  validate: (look) => [
    ...WISPLIGHT_SURGE.kinds.filter(k => !look.monster(k.monster)).map(k => `wisp body '${k.monster}' unknown`),
    ...WISPLIGHT_SURGE.kinds.filter(k => !STATUS_DEFS[k.rideStatus]).map(k => `ride status '${k.rideStatus}' unknown`),
    ...WISPLIGHT_SURGE.kinds.flatMap(k => (k.grantSkills ?? []).filter(s => !look.skill(s)).map(s => `graft skill '${s}' unknown (kind '${k.id}')`)),
    ...(STATUS_DEFS[WISPLIGHT_SURGE.aura.status] ? [] : [`aura status '${WISPLIGHT_SURGE.aura.status}' unknown`]),
    ...WISPLIGHT_SURGE.biomes.filter(b => !look.biome(b)).map(b => `biome '${b}' unknown`),
  ],
};
