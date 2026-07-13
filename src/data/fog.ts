// ---------------------------------------------------------------------------
// FOG BANKS — the data half of the fog fabric (engine/fog.ts).
//
// Each row is a fog KIND: a look, a motion grammar, a lifecycle, gifts, and
// the ground it haunts. Tilesets breathe them via ZoneTheme.fog; the 'fog'
// WEATHER front breeds sky-born 'mist' over any open-sky zone. A new kind of
// fog anywhere in the game is one row here — no engine edits.
//
// Side-effect module: import it wherever content registries must exist
// (main.ts, sim/arena.ts, balance/genqa.ts, data/validate.ts).
// ---------------------------------------------------------------------------

import { registerFogBank } from '../engine/fog';

/** MIST — the common drifting murk. The generic veil the old static
 *  fog_bank doodads granted, now alive: it wanders the open ground, breathes,
 *  thins at the rim and gathers anew. Also the sky-born kind a fog FRONT
 *  breeds (FOG_CFG.weatherKind). */
registerFogBank({
  id: 'mist',
  color: '#aab6c2',
  alpha: 0.34,
  radius: [110, 190],
  lobes: [5, 8],
  drift: [6, 13],
  life: [46, 92],
  grants: [{ status: 'fogveiled' }],
});

/** RIVER MIST — rolls along the water. Anchors pull hard onto liquid bodies
 *  and the bank drifts DOWN the local chain of shoreline cells (haunt.along),
 *  coiling with a faster, showier breathe — the fog that pours down a river
 *  bank at dawn. Stand on the bank and walk with it to stay veiled. */
registerFogBank({
  id: 'river_mist',
  color: '#b8c8d2',
  alpha: 0.3,
  radius: [90, 170],
  lobes: [5, 9],
  drift: [10, 20],
  meander: 0.14,
  breathe: 0.2,
  churn: 0.4,
  life: [40, 76],
  rampFrac: 0.34,
  haunt: { kinds: ['water'], pull: 0.95, along: true },
  grants: [{ status: 'fogveiled' }],
});

/** GRAVE MIST — pools among the dead and FEEDS them. Slow, clinging, pale
 *  green; anchors gather over tombstones and urns, and undead standing in
 *  live grave-mist wear 'mistfed' (the fog is their territory — bait them
 *  out of it, or share the veil and take the fight inside). */
registerFogBank({
  id: 'grave_mist',
  color: '#a9c0ae',
  alpha: 0.36,
  radius: [100, 180],
  lobes: [6, 9],
  drift: [4, 9],
  meander: 0.3,
  swirl: 0.04,
  churn: 0.26,
  life: [56, 110],
  rampFrac: 0.26,
  haunt: { kinds: ['tombstone', 'burial_urn', 'bone_pile', 'black_obelisk'], pull: 0.9 },
  grants: [
    { status: 'fogveiled' },
    { status: 'mistfed', factions: ['undead'] },
  ],
});

/** GLOAM SHROUD — the Gloamwood's own weather: a big, tall, coiling mass
 *  that swallows whole clearings. Everyone inside is veiled; the wood's dead
 *  drink it. Taller over-layer share than common mist (it wraps you, not
 *  just your boots). */
registerFogBank({
  id: 'gloam_shroud',
  color: '#96a6b6',
  alpha: 0.42,
  radius: [130, 230],
  lobes: [6, 10],
  drift: [5, 11],
  meander: 0.3,
  swirl: 0.07,
  breathe: 0.18,
  churn: 0.3,
  life: [52, 104],
  rampFrac: 0.28,
  overFrac: 0.42,
  haunt: { kinds: ['tombstone', 'dead_tree', 'bone_pile'], pull: 0.6 },
  grants: [
    { status: 'fogveiled' },
    { status: 'mistfed', factions: ['undead'] },
  ],
});
