// ---------------------------------------------------------------------------
// THE STRAYING — the farmland's own trouble: the fold walks, and a bell calls.
//
// A call settles on some stretch of worked country. The fold's stock wanders
// loose; a still, wrong-eyed court of the Chattel stands at a rally point,
// waiting, FACING the farm. Every stray carries the bell in its ear: walk near
// it (or let a farmhand reach it) and it remembers the fold — the duty-post
// fabric walks it home. Leave it, and the bell takes it where it stands — the
// changed body rises and walks, still asleep, to join the court. Enough of
// them and THE BELL TURNS: the court rouses and marches the steading, and the
// freehold war does the rest. Break every caller — or save every head — and
// the call breaks: the strays remember themselves, and the drovers pay.
//
// Reuses the pasture (wool_sheep/plow_ox/dooryard_hen — near-blind posted
// critters), the Chattel (feral kin + the Bellwether presence), the sentry
// fabric (dormant tags + duty posts do ALL the herding movement), and the
// freehold rouse row. The overlay owns the settle/tug/absent lifecycle.
// Discovered in play; the Vault unlock gates TUNING, like Haunting/Verminfall.
// ---------------------------------------------------------------------------

import { registerDormantTag } from '../../engine/ai';
import { StrayField, type StrayingSurge } from '../overlays/straying';
import type { ContentPackage } from '../types';

/** THE bell-gold — the chattel palette hue, so the call reads as one thing on
 *  the map ring, the marker, and the faction wash. */
const BELL_GOLD = '#d8b86a';

export const STRAYING_SURGE: StrayingSurge = {
  igniteChance: 0.012,     // per 0.5s step, × pressure — the belt's steady trouble
  maxConcurrent: 1,        // one bell at a time (the warrens already gnaw nearby)
  // WHERE the bell calls (the seat fabric): the near worked country, leaning
  // gently toward ground the player KNOWS — helping the drovers is the point —
  // while an unknown seat settles LATENT and murmurs (the omen below). The
  // min keeps it off the player's own boots: a straying is ARRIVED AT (walk
  // in and find the fold already loose), never an ambush around them.
  seat: { range: { min: 40, max: 520 }, knownMul: 1.25, unknownMul: 1, prefer: 'near' },
  // THE BELT LAW: a biome list, never a hardcode — a harsher tuning could add
  // the downs' sheep country or the open shires.
  biomes: ['farmland'],
  levelMax: 15,            // the pastoral band; deep-country farmland is spared
  latentOnUnknown: true,
  omen: {
    whisper: 150, reveal: 55, widenPerMin: 12,
    lines: [
      'a bell tolls {bearing} of here — slow, and wrong, and {dist}',
      'bleating on the wind, {bearing} — a whole fold, and no dogs barking',
      'the drovers mutter of strays walking {bearing}, all of them one way',
    ],
  },

  // --- the concrete scene ----------------------------------------------------
  strays: [5, 8],
  strayTable: [
    { id: 'wool_sheep', weight: 5 },
    { id: 'dooryard_hen', weight: 3 },
    { id: 'plow_ox', weight: 1 }, // the heavy save — an ox gone to the bell HURTS
  ],
  // THE BELL'S WORK: what each head becomes if the call takes it. The ewe's
  // change is the poster child (the Bellwether's own kin, minted for this).
  convertTo: {
    wool_sheep: 'broken_ewe',
    dooryard_hen: 'feral_hen',
    plow_ox: 'feral_aurochs',
    greylag_goose: 'feral_hen',
  },
  convertFallback: 'broken_ewe',
  callers: [2, 3],
  callerTable: [
    { id: 'shepherds_hound', weight: 3 },
    { id: 'feral_aurochs', weight: 1 },
    // The bell itself walks out for the old folds (presence-gated as ever).
    { id: 'the_bellwether', weight: 1, presence: { from: 8, fadeIn: 4 } },
  ],
  callerLevelBonus: 1,
  rallyDist: 620,
  herdRadius: 84,
  assistRadius: 56,
  arriveRadius: 96,
  homePace: 0.85,          // a remembering head trots
  thrallPace: 0.5,         // the changed walk slow, and asleep
  marchPace: 1.0,          // the roused court does not amble
  // Staggered per-head bells. Tuned FAST on live evidence: a working farm
  // fights back hard (crofters fetch heads inside ~30s, packs butcher the
  // slow), so the bell must race them — the first head turns while you
  // triage, and an unattended fold genuinely feeds the court.
  bellPull: [16, 60],
  raidAt: 3,
  raidTtl: 80,

  // --- the abstract clock ----------------------------------------------------
  absentResolveSec: [140, 240],
  freeholdWinChance: 0.45, // the tug genuinely fluctuates without you
  overrunHoldSec: 260,
  overrunFactionMul: 2.2,
  resolveCooldownSeconds: [240, 420],

  reward: {
    xpPerHead: 6, xpPerHeadPerLevel: 2,
    reliefXpBase: 90, reliefXpPerLevel: 22, reliefGems: 1,
  },
  color: BELL_GOLD,
};

// --- Dormant rows (module scope — the sentry fabric's gate) -------------------
// The court and the changed stand PLANTED until roused — a wound wakes them
// (and the engine wakes the lot when the bell turns). No reset row on purpose:
// a roused caller does not forgive; the stillness, once broken, stays broken.
registerDormantTag('drove_call');
registerDormantTag('drove_thrall');

export const STRAYING: ContentPackage = {
  id: 'straying',
  label: 'The Straying',
  color: BELL_GOLD,
  blurb: 'The worked country keeps a fold, and the fold keeps a bell — and some evenings, out past the hedgerows, another bell answers. The stock walks. Not driven: CALLED, one head at a time, out toward a still circle of things that used to be livestock and stand there now facing the farm, waiting. Walk the strays home before the bell takes them — every head you touch remembers the fold and trots back on its own — or break the callers outright and the whole fold remembers itself at once. Dally, and the changed walk to the rally asleep, and when the bell has enough of them it TURNS: the court wakes as one and marches on the steading, and the drovers learn what their stock has been listening to. Lose that fight and the fields run feral for a while. The land always settles. The fold does not always come back.',
  cost: 110,
  unlock: {
    id: 'straying_unlock',
    label: 'Witness a straying (the bell calls in the worked country)',
    test: (ctx) => (ctx.ledger.straying_seen ?? 0) >= 1,
  },
  tiers: [
    { id: 'straying_drover', label: 'Drover', requirement: 'Walk 12 strays home', cost: 140,
      test: (ctx) => (ctx.ledger.strays_returned ?? 0) >= 12,
      grants: { weight: { min: 0, max: 80 } } },
    { id: 'straying_bellbreaker', label: 'Bell-Breaker', requirement: 'Relieve 4 strayings', cost: 220,
      test: (ctx) => (ctx.ledger.strayings_relieved ?? 0) >= 4,
      grants: { weight: { min: 0, max: 100 } } },
  ],
  modifiers: [
    { id: 'straying_start', kind: 'startLevel', label: 'Strayings begin at level', min: 2, max: 2, step: 1, defaultValue: 2 },
    { id: 'straying_weight', kind: 'weight', label: 'Straying frequency', min: 15, max: 50, step: 5, defaultValue: 30 },
  ],
  defaultWeight: 30,
  defaultStartLevel: 2,
  defaultEnabled: true,
  world: { overlay: (ctx) => new StrayField(ctx, STRAYING_SURGE) },
  validate: (look) => [
    ...STRAYING_SURGE.strayTable.filter(e => !look.monster(e.id)).map(e => `stray '${e.id}' unknown`),
    ...STRAYING_SURGE.callerTable.filter(e => !look.monster(e.id)).map(e => `caller '${e.id}' unknown`),
    ...Object.entries(STRAYING_SURGE.convertTo)
      .filter(([from, to]) => !look.monster(from) || !look.monster(to))
      .map(([from, to]) => `convert row '${from}' → '${to}' unresolved`),
    ...(look.monster(STRAYING_SURGE.convertFallback) ? [] : [`convert fallback '${STRAYING_SURGE.convertFallback}' unknown`]),
    ...STRAYING_SURGE.biomes.filter(b => !look.biome(b)).map(b => `biome '${b}' unknown`),
  ],
};
