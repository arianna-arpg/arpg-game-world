// ---------------------------------------------------------------------------
// DEEPWINTER — the creeping frost: a winter FRONT that ignites at the coldest
// charted node and marches zone-to-zone, converting the land as it takes it
// (a net-new package).
//
// The map's climate geography becomes gameplay: worldgen bakes every node's
// temperature (geo.climate), the front is born where the world runs coldest,
// and every march step takes the coldest frontier zone next — so the frost
// visibly advances from the cold end of the map like an army, a hard RIME
// EDGE crawling the road graph (the overlay draws the front line; converted
// zones wear a frosted map treatment). Converted ground plays converted:
// standing snow at the frozen floor, WHITEOUT banks, Rimebound court packs —
// and the WINTER KING (Crowned) holding the glacial heart, whose zone is
// guaranteed its frozen_lake landmark. Clearing zones changes nothing; only
// felling the King does — the front stops and the thaw retreats it
// outermost-ring-first back to the heart.
//
// It fields the BUILT-IN 'rimebound' faction (the Winter Court — tundra/taiga
// patron, data/monsters.ts): the event swells a real people, it doesn't mint a
// bespoke one. CONSERVATIVE BY DESIGN (the user's balance ask): one front at a
// time, a rare ignition, a slow telegraphed early creep painted on the map
// from day one — the response window is the point. Discovered in play (runs
// at defaults; the Vault unlock gates TUNING), like Contagion / Migration.
// Every number is a knob on the surge below.
// ---------------------------------------------------------------------------

import { vec } from '../../core/math';
import { FOG_BANKS } from '../../engine/fog';
import { registerKillHandler } from '../../engine/killHandlers';
import { WEATHER_DEFS } from '../../world/weather';
import { DEEPWINTER_COLORS } from '../../world/palette';
import { DeepwinterField, type DeepwinterSurge } from '../overlays/deepwinter';
import type { ContentPackage } from '../types';

/** THE glacial blue — one hue for the entry bulletins and the surge, matching
 *  the overlay's DEEPWINTER_COLORS gradient so the frost reads as one thing
 *  everywhere it appears (FACTION_COLORS['rimebound'] washes the territory). */
const FROST_COLOR = DEEPWINTER_COLORS.strong;

/** The whole Deepwinter mechanic as data — every number is a knob. */
const DEEPWINTER_SURGE: DeepwinterSurge = {
  igniteChance: 0.006,   // per 0.5s step — a RARE season (rarer than Contagion's 0.012)
  spreadInterval: 30,    // seconds (×severity) per zone taken — a slow, watchable march
  initialHops: 1,        // born as the heart + ONE taken neighbour: present, not yet a crisis
  maxHops: 7,            // the winter's reach from the heart — a region, never the world
  minIntensity: 0.25,    // the front's thin edge still reads (and still fields a patrol)
  thawInterval: 6,       // after the King falls, one ring melts every 6s — a visible retreat
  igniteMaxTemp: 0.34,   // only genuinely COLD charted ground can birth a winter (cold band)
  seedMinDist: 260,      // the heart seats a real trek out — the march is watched, not worn
  warpBiome: 'tundra',   // converted ground warps cold: frontier zones minted inside the
  warp: { radius: 70, strength: 0.9 }, // front mint AS winter country (freezeAt rivers and all)
  faction: 'rimebound',
  bossDefId: 'winter_king',
  bossPromote: 'crowned',
  packCount: [1, 3],     // court packs per converted zone (lerped by intensity)
  packSize: [2, 4],
  whiteout: { kind: 'whiteout', banks: [2, 3] }, // planted via World.fogEnsure on entry
  snow: { cover: 0.9, floor: 0.55 },             // wakes blanketed; never melts below the frozen floor
  reward: { xpBase: 320, xpPerLevel: 52, gems: 5 },
  color: FROST_COLOR,
};

export const DEEPWINTER: ContentPackage = {
  id: 'deepwinter',
  label: 'Deepwinter',
  color: FROST_COLOR,
  blurb: 'Somewhere at the cold end of the map, a winter refuses to end. It crowns a King on a frozen lake and then it MARCHES — zone by zone along the roads, a hard rime edge you can watch crawl the world map, each land it takes waking blanketed, whited out, and garrisoned by the Winter Court. Clearing the ground does nothing; the frost holds until you walk the front back to its glacial heart and fell the Winter King on his own ice — and even then the winter does not vanish, but retreats the way it came, ring by ring, home to bury its crown.',
  cost: 140,
  // DISCOVERED in play (runs at defaults); the Vault unlock gates TUNING,
  // surfacing once the player has walked frost-held ground.
  unlock: {
    id: 'deepwinter_unlock',
    label: 'Walk ground the frost has taken (the winter marches on its own)',
    test: (ctx) => (ctx.ledger.deepwinter_seen ?? 0) >= 1,
  },
  // INVESTMENT LADDER — each owned tier widens the frequency slider (and the
  // first frees the start-level lock) as the player proves they can break winters.
  tiers: [
    { id: 'deepwinter_warden', label: 'Winterwarden', requirement: 'Break 1 winter', cost: 180,
      test: (ctx) => (ctx.ledger.deepwinter_broken ?? 0) >= 1,
      grants: { weight: { min: 0, max: 70 }, startLevel: { min: 8 } } },
    { id: 'deepwinter_thawbringer', label: 'Thawbringer', requirement: 'Break 3 winters', cost: 260,
      test: (ctx) => (ctx.ledger.deepwinter_broken ?? 0) >= 3,
      grants: { weight: { min: 0, max: 95 } } },
  ],
  modifiers: [
    { id: 'deepwinter_start', kind: 'startLevel', label: 'Deepwinter begins at level', min: 12, max: 12, step: 1, defaultValue: 12 },
    { id: 'deepwinter_weight', kind: 'weight', label: 'Deepwinter frequency', min: 10, max: 35, step: 5, defaultValue: 20 },
  ],
  defaultWeight: 20,      // LOW: one rare season among the world's pressures
  defaultStartLevel: 12,  // a mid-game campaign, never a level-3 ambush
  defaultEnabled: true,
  // THE MATRIX'S FIRST suppresses EDGES (folded by weighting.ts): a world
  // under deep winter starves the plague and stills the herds — and the long
  // dark feeds the grieving dead.
  relationships: [
    { a: 'deepwinter', b: 'contagion', kind: 'suppresses', strength: 1.6 },
    { a: 'deepwinter', b: 'migration', kind: 'suppresses', strength: 1.5 },
    { a: 'deepwinter', b: 'haunting', kind: 'amplifies', strength: 1.25 },
  ],
  world: { overlay: (ctx) => new DeepwinterField(ctx, DEEPWINTER_SURGE) },
  // Private-surge id checks (rosters/relationships sweep generically):
  // the court, the King, the whiteout bank, and the blizzard front must all
  // resolve — a rename would otherwise fail silently at materialize time.
  validate: (look) => [
    ...(look.faction(DEEPWINTER_SURGE.faction) ? [] : [`rimebound faction '${DEEPWINTER_SURGE.faction}' unknown`]),
    ...(look.monster(DEEPWINTER_SURGE.bossDefId) ? [] : [`Winter King '${DEEPWINTER_SURGE.bossDefId}' unknown`]),
    ...(FOG_BANKS[DEEPWINTER_SURGE.whiteout.kind] ? [] : [`whiteout fog bank '${DEEPWINTER_SURGE.whiteout.kind}' unregistered`]),
    ...(WEATHER_DEFS['blizzard'] ? [] : [`blizzard weather kind unregistered (world/weather.ts)`]),
  ],
};

// THE WINTER KING — felling the crown at the glacial heart does NOT clear the
// converted zones at once: it breaks the WINTER, and the front then retreats
// outermost-ring-first back to the heart (the visible thaw). Level-scaled
// spoils; the broken ledger gates the Vault tiers. (Counts whoever lands the
// blow.) Politics-crowned Winter Kings (the warlord machinery) carry the
// warlord tag instead and never route here — one body, two thrones.
registerKillHandler({
  id: 'winter_king',
  tag: 'winter_king',
  run: ctx => {
    const broken = ctx.sim.deepwinterField?.onWinterKingSlain() ?? false;
    if (broken) ctx.bumpLedger('deepwinter_broken');
    ctx.bumpLedger('winter_king_slain');
    const dw = ctx.sim.deepwinterField?.surge();
    if (broken && dw?.reward) {
      ctx.grantXp(Math.round(dw.reward.xpBase + ctx.zone.level * dw.reward.xpPerLevel));
      for (let i = 0; i < dw.reward.gems; i++) ctx.dropGemAt(ctx.actor.pos);
    }
    ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 56),
      broken ? 'The Winter King falls — the frost begins its retreat!' : 'The Winter King falls!',
      dw?.color ?? FROST_COLOR, 18);
  },
});
