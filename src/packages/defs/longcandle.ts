// ---------------------------------------------------------------------------
// THE LONG CANDLE — the Wax Court and the Umbral Parliament, at war over LIGHT.
//
// Two contexts-gated courts fielded by one night overlay (LongCandleField):
// after dark the WAX COURT processes onto charted ground and raises
// candle-shrines (waxlight: everything near a shrine is CANDLELIT — seen from
// much further, your stealth and the shadows' anatomy alike), while the
// UMBRAL PARLIAMENT convenes on ground of its own. The courts' RELATIONS are
// hostile — a zone both claim stages the war itself, three-sided the moment
// you walk in. Dawn ends every claim.
//
// The wax bodies debut MonsterDef.onHitByType — the reaction matrix worn as
// anatomy: fire makes them FASTER and drippier (melting + burning runoff),
// cold sets them BRITTLE (freeze, then crack); their dead stand as wax pools
// that RE-LIGHT if fire finds them. The umbral kind invert it: near-invisible
// by nature, and fire lights them up (waxlight). One vocabulary, two courts.
// ---------------------------------------------------------------------------

import { vec } from '../../core/math';
import { registerKillHandler } from '../../engine/killHandlers';
import { LongCandleField, type LongCandleSurge } from '../overlays/longcandle';
import type { ContentPackage, FactionSpec } from '../types';

const WAX_COLOR = '#e8c86a';
const UMBRAL_COLOR = '#8a7ab8';

/** The whole Long Candle mechanic as data — every number is a knob. */
const CANDLE_SURGE: LongCandleSurge = {
  igniteChance: 0.02,   // per 0.5s step, night only — most nights SOMETHING walks
  maxVigils: 1,
  maxConvenes: 1,
  // Tight + known-leaning (world/seats.ts): dawn clears every claim, so a
  // court beyond a night's reach would waste its own candle. The one-ring
  // beyond the walked map is fair ground; the deep veil is not.
  seat: { range: { max: 340 }, unknownMul: 0.6, veiledMul: 0.7 },
  shrines: [2, 3],
  packCount: [2, 3],
  packSize: [2, 4],
  waxFaction: 'wax',
  umbralFaction: 'umbral',
  levelMin: 3,
  levelMax: 40,
  waxColor: WAX_COLOR,
  umbralColor: UMBRAL_COLOR,
};

/** THE WAX COURT — candleflesh nobility. Contexts-gated: they exist only
 *  where the Vigil walks (no ordinary gen, no procedural war zones — their
 *  war with the Parliament happens WHERE THE OVERLAY STAGES IT). */
const WAX_FACTION: FactionSpec = {
  id: 'wax',
  name: 'the Wax Court',
  color: WAX_COLOR,
  traits: { roaming: 0.9, aggression: 1.1, warlordHome: 'origin', contexts: ['vigil'] },
  roster: [
    { id: 'wickling', weight: 4, presence: { to: 24, fadeOut: 12 } },
    { id: 'wax_footman', weight: 3 },
    { id: 'wax_chandler', weight: 2, presence: { from: 4, fadeIn: 3 } },
    // The muster pass: the court's standing orders — the knight in
    // armored tallow, the priest of the snuffer bell, and the walking
    // candelabrum (the new 'candles' painter carries the silhouette).
    { id: 'taper_knight', weight: 2, presence: { from: 5, fadeIn: 3 } },
    { id: 'snuffer_priest', weight: 1, presence: { from: 6, fadeIn: 3 } },
    { id: 'candelabrum_hulk', weight: 1, presence: { from: 9, fadeIn: 4 } },
    // The high court pass: the standing altar on procession feet — crack
    // the seal first, or the wax refuses to yield.
    { id: 'vigil_altarpiece', weight: 1, presence: { from: 11, fadeIn: 4 } },
    { id: 'chandler_queen', weight: 1, presence: { from: 10, fadeIn: 5 } },
  ],
  warlord: 'chandler_queen',
  relations: [
    // The war the whole package stages: wax against shadow, light against
    // dark. Contexts-gating keeps it off the procedural war-zone map — this
    // war happens by night, where the claims overlap.
    { a: 'wax', b: 'umbral', kind: 'hostile', strength: 1 },
  ],
};

/** THE UMBRAL PARLIAMENT — your shadow, seceded. */
const UMBRAL_FACTION: FactionSpec = {
  id: 'umbral',
  name: 'the Umbral Parliament',
  color: UMBRAL_COLOR,
  traits: { roaming: 1.0, aggression: 1.2, warlordHome: 'origin', contexts: ['vigil'] },
  roster: [
    { id: 'umbral_footpad', weight: 4 },
    { id: 'umbral_whisper', weight: 2, presence: { from: 5, fadeIn: 3 } },
    // The muster pass: the Parliament seats its officers — the advocate
    // files the case, the bailiff SEIZES the accused (the grab fabric
    // worn by the dark), the quorum votes you undone.
    { id: 'dusk_advocate', weight: 2, presence: { from: 4, fadeIn: 3 } },
    { id: 'shadow_bailiff', weight: 1, presence: { from: 6, fadeIn: 3 } },
    { id: 'murmur_quorum', weight: 1, presence: { from: 8, fadeIn: 4 } },
    { id: 'speaker_of_dusk', weight: 1, presence: { from: 10, fadeIn: 5 } },
  ],
  warlord: 'speaker_of_dusk',
};

// --- Kill rows (module scope — the open kill()-ladder registry) --------------

// A SHRINE SNUFFED: the vigil dims a little — and the ledger climbs toward
// the Vault tiers.
registerKillHandler({
  id: 'candle_shrine_snuffed',
  tag: 'candle_shrine',
  run: ctx => {
    ctx.bumpLedger('candle_shrines_snuffed');
    ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 32),
      'The candle gutters out. The dark leans in…', WAX_COLOR, 13);
  },
});

export const LONGCANDLE: ContentPackage = {
  id: 'longcandle',
  label: 'The Long Candle',
  color: WAX_COLOR,
  blurb: 'After dark, two courts walk. The Wax Court processes out of nowhere — candleflesh nobility raising shrines whose light picks EVERYTHING out of the night: you, your stealth, and the things that were already standing in the dark beside you. Because the dark has a parliament, and it convenes: living shadows that own every unlit hour. Fight the Court and learn what a body of wax does with your fire — it RUNS, faster and drippier, and its dead pool and re-light. Bring cold instead and it sets brittle. Fight the Parliament and learn why the shrines matter — a lit shadow is just a target; an unlit one is mostly a rumor. And some nights, on some ground, both courts claim the same field — then it is their war, and you are merely standing in it.',
  cost: 130,
  unlock: {
    id: 'longcandle_unlock',
    label: 'Walk a court-claimed ground by night (the courts claim charted zones after dark)',
    test: (ctx) => (ctx.ledger.vigil_seen ?? 0) >= 1,
  },
  tiers: [
    { id: 'longcandle_snuffer', label: 'Snuffer', requirement: 'Snuff 5 candle-shrines', cost: 160,
      test: (ctx) => (ctx.ledger.candle_shrines_snuffed ?? 0) >= 5,
      grants: { weight: { min: 0, max: 80 } } },
    { id: 'longcandle_lamplighter', label: 'Lamplighter', requirement: 'Snuff 15 candle-shrines', cost: 240,
      test: (ctx) => (ctx.ledger.candle_shrines_snuffed ?? 0) >= 15,
      grants: { weight: { min: 0, max: 100 } } },
  ],
  modifiers: [
    { id: 'longcandle_start', kind: 'startLevel', label: 'The courts walk from level', min: 5, max: 5, step: 1, defaultValue: 5 },
    { id: 'longcandle_weight', kind: 'weight', label: 'Court-night frequency', min: 15, max: 45, step: 5, defaultValue: 30 },
  ],
  defaultWeight: 30,
  defaultStartLevel: 5,
  defaultEnabled: true,
  world: { overlay: (ctx) => new LongCandleField(ctx, CANDLE_SURGE) },
  factions: [WAX_FACTION, UMBRAL_FACTION],
  validate: (look) => [
    ...(look.monster('candle_shrine') ? [] : [`candle shrine 'candle_shrine' unknown`]),
    ...(look.monster('wax_pool') ? [] : [`wax pool 'wax_pool' unknown`]),
  ],
};
