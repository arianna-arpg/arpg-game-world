// ---------------------------------------------------------------------------
// THE LONG NIGHT — the Night Court claims its estates, BY NIGHT.
//
// Feeding grounds establish on charted zones in the dark hours: a parked
// GLOOM COACH, a feeding party poured while you stand the ground, and a
// dawn ledger — every night a ground stands, it banks one (TWO under a
// covering BLOOD MOON), and at three the zone CONVERTS: spawns shift to the
// Court for good, the biome field warps toward the gloam, the air runs
// wine-dark. The whole counterplay is the CLOCK the Court itself lives on
// (the nocturne fabric): at night the coach is gloom-warded and rolling —
// BURN IT BY DAY, when the ward is off and the pallbearers stand alone, and
// the ground is reclaimed with every fed night refunded as spoils. Ignore
// the ledger and the finale seats itself: the COUNTESS takes court at her
// most-fed estate, crowned — and felling her there breaks every feeding
// ground at once. Reuses the Night Court roster, the gloamwood biome (its
// patron), the blood moon the sky already carries, and the kill-handler
// registry; the overlay owns the establish/feed/convert lifecycle, DURABLY
// (fed nights survive a relaunch — a promise counted in nights must).
// Discovered in play; the Vault unlock gates TUNING, like the Haunting.
// ---------------------------------------------------------------------------

import { vec } from '../../core/math';
import { registerKillHandler } from '../../engine/killHandlers';
import { inPhases } from '../../world/daynight';
import { LongNightField, type LongNightSurge } from '../overlays/longNight';
import type { ContentPackage } from '../types';

export const LONG_NIGHT_SURGE: LongNightSurge = {
  igniteChance: 0.012,      // per 0.5s NIGHT step, × pressure — a patient court
  maxPending: 2,
  maxConverted: 3,          // a handful of estates, never the map
  // WHERE the coach parks (world/seats.ts): the whole minted web in reach,
  // leaning into country nobody has walked — an unknown ground FEEDS UNSEEN
  // (no map pin until known), and the omen below is its widening voice.
  seat: { range: { max: 540 }, unknownMul: 1.7, veiledMul: 1.2 },
  omen: {
    whisper: 160, reveal: 55, widenPerMin: 10,
    lines: [
      'wheel-ruts of a heavy coach, rolling {bearing} — no drover runs at night',
      'the hamlets speak of pale callers {bearing} of here, {dist}',
      'a wine-dark hush lies over the {bearing} country',
    ],
  },
  beginPhases: ['night'],
  nightsToConvert: 3,       // the promise: three fed nights and it turns
  bloodmoonWorth: 2,        // the blood moon feeds double
  streamInterval: [5, 8],   // a court arrives in ones — dread, not a flood
  maxAlive: 7,
  levelBonus: 1,
  // The feeding party, banded: the larder and the bats throng any estate;
  // the knives, bearers and the church arrive where the world has teeth.
  roster: [
    { id: 'feeding_thrall', weight: 4 },
    { id: 'vampire_thrall', weight: 2 },
    { id: 'crimson_bat', weight: 2 },
    { id: 'night_hunter', weight: 2, presence: { from: 7, fadeIn: 3 } },
    { id: 'pallbearer', weight: 1, presence: { from: 8, fadeIn: 4 } },
    { id: 'blood_cardinal', weight: 1, presence: { from: 10, fadeIn: 4 } },
    { id: 'werewolf', weight: 1, presence: { from: 12, fadeIn: 5 } },
  ],
  coachId: 'gloom_coach',
  countess: { defId: 'vampire_countess', courtAt: 2, levelBonus: 3 },
  // Conversion's map face: the ground itself turns toward the gloam (the
  // heat-map pulses + attributes it; reclaiming lifts it).
  warp: { radius: 64, strength: 0.85, biome: 'gloamwood' },
  wash: { color: '#2a0d1a', alpha: 0.15 },
  brokenCooldownSeconds: [420, 600], // a broken court buys real quiet
  color: '#b83a5a',
};

// --- Kill rows (module scope — the open kill()-ladder registry) --------------

// THE COACH FALLS. By day — the ward burnt off with the dark — the ground is
// RECLAIMED: every fed night refunds as spoils and the estate is struck from
// the ledger. At night the gloom simply RE-KNITS the carriage: the kill is
// real, the lesson is the clock (the ward already made it a feat).
registerKillHandler({
  id: 'long_night_coach',
  tag: 'long_night_coach',
  run: ctx => {
    const lnf = ctx.sim.longNightField;
    const info = lnf?.groundOn(ctx.zone.id);
    if (!lnf || !info) return;
    const cfg = lnf.surge();
    if (inPhases(ctx.time, ['dawn', 'day'])) {
      if (!lnf.onCoachBurned(ctx.zone.id)) return;
      ctx.bumpLedger('long_night_reclaimed');
      if (ctx.credit) {
        // Spoils scale with how deep the feeding ran — a reclaimed estate
        // pays for every night it was allowed to stand.
        ctx.grantXp(Math.round((120 + ctx.zone.level * 24) * (1 + 0.5 * info.fedNights)));
        const gems = info.converted ? 3 : 1 + Math.min(1, info.fedNights);
        for (let i = 0; i < gems; i++) ctx.dropGemAt(ctx.actor.pos);
      }
      ctx.flash(ctx.actor.pos, 140, cfg.color, 0.7);
      ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 44),
        info.converted
          ? 'The coach burns in the daylight — the Court\'s hold on this ground breaks!'
          : 'The coach burns — the Court will not feed here again.',
        '#e8c8d0', 17);
    } else {
      lnf.onCoachReknits(ctx.zone.id);
      ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 44),
        'The gloom re-knits the carriage — break it by DAYLIGHT and it stays broken.',
        cfg.color, 16);
    }
  },
});

// THE COURT BREAKS: the Countess falls AT COURT and the whole Long Night
// collapses — every feeding ground releases at once, and the Court goes
// quiet for a long stretch. The finale's payoff, paid in kind.
registerKillHandler({
  id: 'long_night_court_broken',
  tag: 'long_night_court',
  run: ctx => {
    const lnf = ctx.sim.longNightField;
    if (!lnf) return;
    const cfg = lnf.surge();
    lnf.onCourtBroken();
    ctx.bumpLedger('long_night_court_broken');
    if (ctx.credit) {
      ctx.grantXp(420 + ctx.zone.level * 60);
      for (let i = 0; i < 4; i++) ctx.dropGemAt(ctx.actor.pos);
    }
    ctx.flash(ctx.actor.pos, 190, cfg.color, 0.9);
    ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 56),
      'The Countess falls — her court breaks, and every feeding ground with it!',
      '#f0d8e0', 19);
  },
});

export const LONG_NIGHT: ContentPackage = {
  id: 'long_night',
  label: 'The Long Night',
  color: '#b83a5a',
  blurb: 'The Night Court does not conquer. It DINES. By night its coaches park on charted ground and the fed-on shuffle out — and every dawn the ledger turns: one night, two nights, and on the third the land simply belongs to them, its people walking to the stakes on their own. A blood moon feeds the ledger double. The counterplay is the same clock the Court lives on: at night the coach is gloom-warded and rolling, its knives unpinnable in the dark — but at NOON the ward is ash, the masters sleep, and only the pallbearers stand between you and the lacquer. Burn the coach by day and the ground is reclaimed. Let the estates multiply instead, and the Countess herself takes court at the richest one — crowned, seated, and mortal exactly once: break her court and the whole Long Night breaks with it.',
  cost: 140,
  unlock: {
    id: 'long_night_unlock',
    label: 'Stand a feeding ground (the Court claims charted zones by night)',
    test: (ctx) => (ctx.ledger.long_night_seen ?? 0) >= 1,
  },
  tiers: [
    { id: 'long_night_reeve', label: 'Dawn Reeve', requirement: 'Reclaim 3 feeding grounds', cost: 160,
      test: (ctx) => (ctx.ledger.long_night_reclaimed ?? 0) >= 3,
      grants: { weight: { min: 0, max: 80 } } },
    { id: 'long_night_dawnkeeper', label: 'Dawnkeeper', requirement: 'Break the Countess\'s court', cost: 260,
      test: (ctx) => (ctx.ledger.long_night_court_broken ?? 0) >= 1,
      grants: { weight: { min: 0, max: 100 } } },
  ],
  modifiers: [
    { id: 'long_night_start', kind: 'startLevel', label: 'The Long Night begins at level', min: 5, max: 5, step: 1, defaultValue: 5 },
    { id: 'long_night_weight', kind: 'weight', label: 'Long Night frequency', min: 15, max: 50, step: 5, defaultValue: 30 },
  ],
  defaultWeight: 30,
  defaultStartLevel: 5,
  defaultEnabled: true,
  world: { overlay: (ctx) => new LongNightField(ctx, LONG_NIGHT_SURGE) },
  // The Court's nights braid into the world's other nights: fed ground
  // grieves harder (the Haunting swells where the Long Night is active),
  // and a stormy sky — the blood moon rides the weather field — hastens
  // the Court's whole calendar.
  relationships: [
    { a: 'long_night', b: 'haunting', kind: 'amplifies', strength: 1.15 },
    { a: 'storm_fronts', b: 'long_night', kind: 'amplifies', strength: 1.15 },
  ],
  validate: (look) => [
    ...LONG_NIGHT_SURGE.roster.filter(e => !look.monster(e.id)).map(e => `feeding-party '${e.id}' unknown`),
    ...(look.monster(LONG_NIGHT_SURGE.coachId) ? [] : [`coach '${LONG_NIGHT_SURGE.coachId}' unknown`]),
    ...(look.monster(LONG_NIGHT_SURGE.countess.defId) ? [] : [`countess '${LONG_NIGHT_SURGE.countess.defId}' unknown`]),
    ...(look.biome(LONG_NIGHT_SURGE.warp.biome) ? [] : [`warp biome '${LONG_NIGHT_SURGE.warp.biome}' unknown`]),
  ],
};
