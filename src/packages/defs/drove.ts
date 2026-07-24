// ---------------------------------------------------------------------------
// THE DROVE — the farmland's honest accident: a pen gives way, and the fold
// runs loose.
//
// No bell, no court, no curse — the plainest trouble a farm knows. The stock
// scatters spooked across the shires; the reeve stands at the wreck of his
// pen and wants every head back ALIVE. Panicked heads run FROM you (the drive
// wheel in world.ts: walk them down from the far side and they run home), the
// grab fabric already lets you carry a seized ewe bodily through the gap, and
// the land itself is the clock — the fox and the wolves hunt loose critters
// through their own hunger drives, so every minute a head stands out there is
// a minute it might not. The pay is the PASTORAL REGISTER: honest low-rarity
// gear forced to carry the drover's own words (loot 'drove_purse'), a thin
// gem chance from the drover's chest, and a flawless bonus when every single
// head came home breathing.
//
// Reuses the pasture (wool_sheep/dooryard_hen/greylag_goose/plow_ox — posted
// critters the whole predator economy already hunts), the freehold folk (the
// crofters press strays toward home inside assistDriveRadius), the seat/omen
// fabrics, and the runtime event-dress lane for the collapsed pen itself.
// The overlay owns the settle/gather/absent lifecycle. Discovered in play;
// the Vault unlock gates TUNING, like Straying/Haunting/Verminfall.
// ---------------------------------------------------------------------------

import { LOOT_TABLES } from '../../data/loottables';
import { ITEM_AFFIXES } from '../../data/itemaffixes';
import { DroveField, type DroveSurge } from '../overlays/drove';
import type { ContentPackage } from '../types';

/** Drover's leather — the drove's one hue on the map ring, the marker, and
 *  the scene's own flashes. */
const SADDLE_TAN = '#c9964b';

export const DROVE_SURGE: DroveSurge = {
  igniteChance: 0.012,     // per 0.5s step, × pressure — pens are old and rails rot
  maxConcurrent: 1,        // one broken pen at a time (the belt has other troubles)
  // WHERE pens give way (the seat fabric): the near worked country, leaning
  // gently toward ground the player KNOWS — lending the reeve a hand is the
  // point — while an unknown seat settles LATENT and murmurs (the omen
  // below). The min keeps it off the player's own boots: a drove is ARRIVED
  // AT (walk in and find the fold already loose), never an ambush around them.
  seat: { range: { min: 40, max: 520 }, knownMul: 1.25, unknownMul: 1, prefer: 'near' },
  // THE BELT LAW: a biome list, never a hardcode — a harsher tuning could add
  // the downs' sheep country or the open shires.
  biomes: ['farmland'],
  levelMax: 15,            // the pastoral band; deep-country farmland is spared
  latentOnUnknown: true,
  omen: {
    whisper: 150, reveal: 55, widenPerMin: 12,
    lines: [
      'a pen gave way {bearing} of here — a whole fold running loose, {dist}',
      'scattered bleating on the wind, {bearing} — and a reeve cursing after it',
      'the drovers ask every passing hand: a fold is loose {bearing}, wanted back ALIVE',
    ],
  },

  // --- the concrete scene ----------------------------------------------------
  heads: [6, 9],
  headTable: [
    { id: 'wool_sheep', weight: 5 },
    { id: 'dooryard_hen', weight: 3 },
    { id: 'greylag_goose', weight: 1.5 }, // drive the goose and the goose drives back
    { id: 'plow_ox', weight: 1 },         // the heavy save — an ox lost is a season lost
  ],
  scatter: [170, 380],
  penRadius: 96,
  penRingR: 60,
  // THE DRIVE, tuned to live pace (the straying's lesson: a working farm acts
  // in seconds, not minutes) — pressure reads generously so herding feels
  // like positioning, not pixel-chasing; the calm window keeps a flushed head
  // from jittering between driven and milling at the radius edge.
  driveRadius: 130,
  assistDriveRadius: 70,
  drivePace: 1.15,         // spooked stock RUNS — faster than it grazes
  calmSec: 2.5,

  // --- the abstract clock ----------------------------------------------------
  absentResolveSec: [140, 240],
  reeveWinChance: 0.5,     // crofters are not helpless — the belt copes, mostly
  scatterHoldSec: 240,
  scatterFactionMul: 1.8,
  resolveCooldownSeconds: [240, 420],

  reward: {
    xpPerHead: 7, xpPerHeadPerLevel: 2,
    gatherXpBase: 80, gatherXpPerLevel: 20,
    gemChance: 0.35,       // the drover's chest — a LOW chance on purpose
    purseTable: 'drove_purse',
    flawlessTable: 'pastoral_register_pick',
  },
  color: SADDLE_TAN,
};

export const DROVE: ContentPackage = {
  id: 'drove',
  label: 'The Drove',
  color: SADDLE_TAN,
  blurb: 'Rails rot. Posts lean. Some morning out in the worked country a pen gives way all at once, and a whole fold pours through the gap and scatters across the shires — not called, not cursed, just LOOSE, which on ground this full of teeth is its own kind of doomed. The reeve stands at the wreck and asks the only thing a farmer ever asks: bring them back ALIVE. Spooked stock runs from whatever presses it — so press it HOME: circle wide, come in from the far side, walk the bleating knot down toward the broken ring while the crofters flank what you flush. Or pick a ewe bodily off the ground and carry her, if your hands are strong enough. Every head that stands the pen is counted and paid; every head the fox finds first is just gone. Gather the fold whole — every last head breathing — and the reeve digs to the bottom of the drover\'s chest: farm-made gear cut in the register the drovers swear by, words you will not find priced anywhere else. The land always settles. A good reeve remembers who settled it.',
  cost: 110,
  unlock: {
    id: 'drove_unlock',
    label: 'Witness a drove (a pen gives way in the worked country)',
    test: (ctx) => (ctx.ledger.drove_seen ?? 0) >= 1,
  },
  tiers: [
    { id: 'drove_grazier', label: 'Grazier', requirement: 'Pen 12 heads alive', cost: 140,
      test: (ctx) => (ctx.ledger.drove_heads_penned ?? 0) >= 12,
      grants: { weight: { min: 0, max: 80 } } },
    { id: 'drove_reeves_hand', label: 'Reeve’s Right Hand', requirement: 'Gather 4 droves', cost: 220,
      test: (ctx) => (ctx.ledger.droves_gathered ?? 0) >= 4,
      grants: { weight: { min: 0, max: 100 } } },
  ],
  modifiers: [
    { id: 'drove_start', kind: 'startLevel', label: 'Droves begin at level', min: 2, max: 2, step: 1, defaultValue: 2 },
    { id: 'drove_weight', kind: 'weight', label: 'Drove frequency', min: 15, max: 50, step: 5, defaultValue: 30 },
  ],
  defaultWeight: 30,
  defaultStartLevel: 2,
  defaultEnabled: true,
  world: { overlay: (ctx) => new DroveField(ctx, DROVE_SURGE) },
  validate: (look) => [
    ...DROVE_SURGE.headTable.filter(e => !look.monster(e.id)).map(e => `head '${e.id}' unknown`),
    ...(look.monster('drove_reeve') ? [] : ['the reeve (drove_reeve) is unknown']),
    ...DROVE_SURGE.biomes.filter(b => !look.biome(b)).map(b => `biome '${b}' unknown`),
    // The purse's whole chain must stand: tables minted, register families
    // registered (forceFamilyAffix skips unknown families SILENTLY — this is
    // the net that keeps the reeve's pay from quietly paying nothing).
    ...[DROVE_SURGE.reward.purseTable, DROVE_SURGE.reward.flawlessTable]
      .filter(t => !LOOT_TABLES[t]).map(t => `purse table '${t}' unknown`),
    ...['oxdrawn', 'fleecebound', 'foldkept']
      .filter(f => !ITEM_AFFIXES[f]).map(f => `register family '${f}' unregistered`),
  ],
};
