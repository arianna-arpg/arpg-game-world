// ---------------------------------------------------------------------------
// THE QUICKENING — spent ground runs quick again (a net-new package).
//
// The Terror-Zone answer in Hollow Wake's own myth: the waked world is mostly
// dead, but now and then a surge of what it USED to be finds an old limb — a
// zone the player has already walked, cleared, and outgrown — and for one
// fixed window that ground QUICKENS: its level leaps to a band around the
// hero's own, its contents re-mint fresh, its event chance and loot bounty
// climb, its kin wear the `quickborn` mark, and its air reads gilt (the
// 'quickened_air' event-weather row below, dress and all). The window runs
// on the world clock — it opened without you and it will close without you —
// and when it closes the zone reverts to EXACTLY what it was.
//
// Everything is one QuickeningSurge config: the field (overlays/quickening.ts)
// owns the clock + the seat; the engine's reconcile sweep stamps/reverts
// ZoneDef.level off the field's truth; the kill rows below pay the ground's
// own ledgers. Discovered in play; the Vault unlock gates TUNING, like
// Worldboss/Wisplight/Haunting.
// ---------------------------------------------------------------------------

import { DOODAD_VISUALS } from '../../data/doodadVisuals';
import { registerKillHandler } from '../../engine/killHandlers';
import { STATUS_DEFS } from '../../engine/status';
import { registerWeather, WEATHER_DEFS } from '../../world/weather';
import { QuickeningField, type QuickeningSurge } from '../overlays/quickening';
import type { ContentPackage } from '../types';

/** THE surge gilt — the marker ring, the chip, the sky wash, the kin mark
 *  (STATUS_DEFS.quickborn wears the same tone), so the event reads as ONE
 *  thing everywhere it shows. */
const SURGE_GILT = '#e8c86a';

export const QUICKENING_SURGE: QuickeningSurge = {
  igniteChance: 0.004,     // per 0.5s step, × pressure — patient, then loud
  maxConcurrent: 1,        // one quickened zone at a time (the crank lifts it)
  minCharted: 10,          // it needs a past worth returning to
  firstDelaySec: 300,      // no surge at minute zero — there is nothing to re-walk
  cooldown: [420, 780],    // the world breathes between windows
  // THE WINDOW: rolled once at ignition, run on the world clock, indifferent
  // to the player — the world-boss apparition's stay, worn by ground.
  holdSec: [420, 660],
  // Surge level = hero level + [-1 .. +3]: your level, a level under you, or
  // a genuine reach — the band the ask named, every bound a dial.
  levelBand: [-1, 3],
  minOutlevel: 3,          // only genuinely outgrown ground qualifies
  outlevelWeighPer: 0.15,  // the FURTHER outgrown, the louder it calls…
  outlevelWeighCap: 3,     // …capped, so ancient ground doesn't own the roll
  // WHERE (the seat fabric): anywhere on the walked web outside arm's reach —
  // retracing far steps is the point, so no near tilt. Known-ground-only is
  // the FIELD's own hard law (visited filter), not a tuning choice.
  seat: { range: { min: 60, max: 900 }, prefer: 'flat' },
  eventMul: 2.5,           // in-zone events fire far more readily on quick ground
  bountyMul: 1.35,         // the kill-path rich-ground lever (lean-loot honest)
  refresh: { onSurge: true, onFade: true }, // re-mint at both edges of the window
  kin: { status: 'quickborn', pulseSec: 5 },
  echo: {
    monster: 'surge_echo', levelBonus: 1,
    announce: 'The surge gathers itself — an echo walks {zone}!',
    reward: { xp: 320, gems: 2 },
  },
  announce: {
    surge: 'The ground QUICKENS at {zone} — old country runs at level {level} for {mins}m!',
    fade: 'The surge over {zone} spends itself — the ground settles back to sleep.',
  },
  weatherKind: 'quickened_air',
  color: SURGE_GILT,
};

export const QUICKENING: ContentPackage = {
  id: 'quickening',
  label: 'The Quickening',
  color: SURGE_GILT,
  blurb: 'The world is a corpse being waked — but a corpse remembers. Now and then a surge of what it used to be finds an old limb: some zone you walked, stripped, and outgrew runs QUICK again. For one window on the world\'s own clock the ground leaps to your measure and past it, everything on it stands up new and gilt-marked, trouble comes looking for trouble, and the dirt itself pays better. Then the window closes, wherever you are, and the country lies back down exactly as you left it. The map will tell you where. The clock will not wait for you.',
  cost: 130,
  // DISCOVERED in play (runs at defaults); the Vault unlock gates TUNING,
  // surfacing once the player has stood on quickened ground.
  unlock: {
    id: 'quickening_unlock',
    label: 'Stand on quickened ground (old zones surge on their own)',
    test: (ctx) => (ctx.ledger.quickenings_seen ?? 0) >= 1,
  },
  tiers: [
    { id: 'quickening_chaser', label: 'Surgechaser', requirement: 'Stand in 4 quickenings', cost: 150,
      test: (ctx) => (ctx.ledger.quickenings_seen ?? 0) >= 4,
      grants: { weight: { min: 0, max: 80 } } },
    { id: 'quickening_echobreaker', label: 'Echobreaker', requirement: 'Break 3 Surge Echoes', cost: 240,
      test: (ctx) => (ctx.ledger.surge_echoes_slain ?? 0) >= 3,
      grants: { weight: { min: 0, max: 100 }, startLevel: { min: 0, max: 101 } } },
  ],
  modifiers: [
    { id: 'quickening_start', kind: 'startLevel', label: 'Surges begin at level', min: 8, max: 8, step: 1, defaultValue: 8 },
    { id: 'quickening_weight', kind: 'weight', label: 'Quickening frequency', min: 15, max: 50, step: 5, defaultValue: 30 },
  ],
  defaultWeight: 30,
  defaultStartLevel: 8,
  defaultEnabled: true,
  world: { overlay: (ctx) => new QuickeningField(ctx, QUICKENING_SURGE) },
  validate: (look) => [
    ...(QUICKENING_SURGE.echo && !look.monster(QUICKENING_SURGE.echo.monster)
      ? [`echo body '${QUICKENING_SURGE.echo.monster}' unknown`] : []),
    ...(STATUS_DEFS[QUICKENING_SURGE.kin.status] ? [] : [`kin status '${QUICKENING_SURGE.kin.status}' unknown`]),
    ...(QUICKENING_SURGE.weatherKind && !WEATHER_DEFS[QUICKENING_SURGE.weatherKind]
      ? [`weather kind '${QUICKENING_SURGE.weatherKind}' unknown`] : []),
    ...(WEATHER_DEFS[QUICKENING_SURGE.weatherKind ?? '']?.dress?.rows ?? [])
      .filter(r => !DOODAD_VISUALS[r.doodad])
      .map(r => `quickened dress doodad '${r.doodad}' unknown`),
    ...(QUICKENING_SURGE.levelBand[0] > QUICKENING_SURGE.levelBand[1]
      ? ['levelBand inverted'] : []),
    ...(QUICKENING_SURGE.holdSec[0] > 0 ? [] : ['holdSec must be positive']),
  ],
};

// --- the quickened sky (one weather row — wash, radiance, wind, DRESS) --------
//
// The event AS weather (the transience doctrine's presentation lane): pinned
// by the overlay's event-front source while a zone runs quick, gone the
// breath the window closes. The dress rows are the surge's own kit
// (data/doodadVisuals.ts — the QUICKENING kit): planted while the front
// holds, dissolved via Doodad.evap as it lifts. The land was never touched.
registerWeather('quickened_air', {
  radiance: { mul: 1.08 },  // the light leans GOLD, a shade past day
  label: 'Quickened Air', color: SURGE_GILT, countMul: 1.0, factionMul: {},
  wind: 0.08, rampFrac: 0.3,
  eventOnly: true,
  dress: {
    rows: [
      { doodad: 'surge_stone', count: [1, 2], radius: [10, 14], minGap: 320, solid: true },
      { doodad: 'quick_spring', count: [3, 6], radius: [7, 10], minGap: 150 },
      { doodad: 'risen_bloom', count: [2, 4], radius: [9, 13], minGap: 200 },
    ],
  },
});

// --- the ground's own ledgers (kill rows — no engine edits) -------------------
//
// EVERY credited kill on quickened ground counts (the farming tally future
// rungs and epitaphs may read; already honest). Reads the engine's ZoneDef
// stamp — the same truth the level and the chip wear.
registerKillHandler({
  id: 'quickened_ground_kill',
  when: ctx => ctx.credit && !!ctx.zone.quickened,
  run: ctx => { ctx.bumpLedger('quickened_kills'); },
});

// THE SURGE ECHO breaks: the window's one named face pays its bounty and the
// arc remembers (the chip stops promising it). Counts whoever lands the blow
// for the arc note; the SPOILS are credit-gated like every bounty.
registerKillHandler({
  id: 'surge_echo_down',
  tag: 'surge_echo',
  run: ctx => {
    ctx.bumpLedger('surge_echoes_slain');
    const f = ctx.sim.overlayFor<QuickeningField>('quickening', ctx.zone.dimension);
    f?.noteEchoDown(ctx.zone.id);
    const reward = QUICKENING_SURGE.echo?.reward;
    if (ctx.credit && reward) {
      ctx.grantXp(reward.xp);
      for (let i = 0; i < reward.gems; i++) ctx.dropGemAt(ctx.actor.pos);
    }
    ctx.flash(ctx.actor.pos, 180, SURGE_GILT, 0.9);
    ctx.text({ x: ctx.actor.pos.x, y: ctx.actor.pos.y - 48 },
      'The echo breaks — the surge howls on without it.', SURGE_GILT, 17);
  },
});
