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
import { registerAIAction } from '../engine/aiActions';

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

/** BLOOD MIST — the Sanguine face's red haze: a low, clinging aerosol that
 *  pools over open blood (haunt hugs the pools and the gore) and turns heads
 *  LIGHT — faintness climbs its vasovagal ladder on the grant's own cadence
 *  (FogGrant.every — never the 4Hz sweep), sparing the country's own kin.
 *  You are veiled inside it, for whatever comfort that is. */
registerFogBank({
  id: 'blood_mist',
  color: '#b0424e',
  alpha: 0.3,
  radius: [95, 165],
  lobes: [5, 8],
  drift: [3, 8],
  meander: 0.26,
  breathe: 0.14,
  churn: 0.3,
  life: [48, 96],
  rampFrac: 0.3,
  overFrac: 0.24,
  haunt: { kinds: ['blood_pool', 'gore', 'clot_mound'], pull: 0.9 },
  grants: [
    { status: 'fogveiled' },
    { status: 'faintness', every: 1.6, notFactions: ['flesh'] },
  ],
});

/** GUT MIASMA — the Gutworks' sour breath: a green-brown vapor that hangs in
 *  the tract's low places and turns the stomach (queasy on its own cadence;
 *  the ladder ends in retching). The Glut digests comfortably inside it. */
registerFogBank({
  id: 'gut_miasma',
  color: '#8a9a52',
  alpha: 0.32,
  radius: [90, 160],
  lobes: [5, 8],
  drift: [2, 6],
  meander: 0.34,
  breathe: 0.22,
  churn: 0.36,
  life: [44, 88],
  rampFrac: 0.32,
  overFrac: 0.3,
  haunt: { kinds: ['chyme_pool', 'gas_polyp', 'villus_bed'], pull: 0.85 },
  grants: [
    { status: 'queasy', every: 1.8, notFactions: ['flesh'] },
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

/** AETHER VEIL — the cloud realm's own breath: tall, bright, slow-coiling
 *  drifts of sunlit vapor that wrap whole causeways. Everyone inside is
 *  veiled (the fog hides you from senses, not from physics — the standing
 *  rule); the Host drifts through it like it isn't there because to them
 *  it isn't: it is more of the same sky they wear. */
registerFogBank({
  id: 'aether_veil',
  color: '#e6ecf8',
  alpha: 0.3,
  radius: [130, 220],
  lobes: [6, 10],
  drift: [8, 16],
  meander: 0.2,
  swirl: 0.05,
  breathe: 0.22,
  churn: 0.28,
  life: [48, 96],
  rampFrac: 0.3,
  overFrac: 0.5,
  grants: [{ status: 'fogveiled' }],
});

/** CAUL MURK — the Caul's exhalation: a low black-oil haze that pools in
 *  the membrane country and barely lifts (overFrac 0.15 — it LIES on the
 *  floor like something breathed out and left). Slow, heavy, patient; the
 *  ordinary fogveiled inside. The biome signature kind, gloam_shroud's
 *  colder cousin. */
registerFogBank({
  id: 'caul_murk',
  color: '#1a1420',
  alpha: 0.42,
  radius: [140, 240],
  lobes: [6, 9],
  drift: [4, 9],
  meander: 0.16,
  swirl: 0.04,
  breathe: 0.14,
  churn: 0.24,
  life: [56, 104],
  rampFrac: 0.36,
  overFrac: 0.15,
  grants: [{ status: 'fogveiled' }],
});

/** DREAD PALL — the war-wound's exhalation (the surface rift): a thin
 *  hate-green smoulder that seeps from the rents and hangs low over what
 *  the war left standing. The ordinary veil inside; the Legion DRINKS it
 *  (their ground, their breath — bait them off it, or share the veil and
 *  take the fight in). Grave mist's grammar on demon ground. */
registerFogBank({
  id: 'dread_pall',
  color: '#22342a',
  alpha: 0.38,
  radius: [110, 200],
  lobes: [5, 9],
  drift: [5, 10],
  meander: 0.2,
  swirl: 0.05,
  breathe: 0.16,
  churn: 0.26,
  life: [50, 100],
  rampFrac: 0.3,
  overFrac: 0.2,
  haunt: { kinds: ['hate_rent', 'soul_cage', 'impaler_stake', 'bone_pile'], pull: 0.7 },
  grants: [
    { status: 'fogveiled' },
    { status: 'mistfed', factions: ['demon'] },
  ],
});

/** WHITEOUT — Deepwinter's signature murk: a vast, dense, fast-rolling wall
 *  of wind-driven snow. Everyone inside is VEILED (fights materialize at
 *  knife range — the court hunts by sound), and the cold GNAWS: a cadenced
 *  chill build (FogGrant.every — the stacking-grant lever) that climbs the
 *  freeze ladder if you stand in the white and argue with it. The court is
 *  spared the cold (notFactions) — the whiteout is their hunting weather.
 *  Not on any tileset's authored spec: the engine plants these in frost-
 *  CONVERTED zones via World.fogEnsure (the runtime twin creepEnsure
 *  pioneered), so the kind stays the event's own signature. */
registerFogBank({
  id: 'whiteout',
  color: '#e8f2fa',
  alpha: 0.5,
  radius: [200, 320],
  lobes: [7, 11],
  drift: [10, 22],
  meander: 0.18,
  breathe: 0.2,
  churn: 0.26,
  life: [60, 120],
  rampFrac: 0.3,
  overFrac: 0.55,
  grants: [
    { status: 'fogveiled' },
    { status: 'chill', every: 2.4, notFactions: ['rimebound'] },
  ],
});

// --- FOG-RIDING CHOREOGRAPHY -------------------------------------------------
// x_seek_fog: a gloaming BLINK toward the nearest living bank — not a march,
// a fade-and-reappear (the gloomling idiom, mechanically a clamped
// displacement). Monsters whose defs carry `{ do: 'x_seek_fog' }` beats slip
// back into the murk between volleys and drink it (their fog grants do the
// rest). A zone with no fog, or an actor already inside some, no-ops — the
// rule simply tries again next window.
registerAIAction('x_seek_fog', (world, actor) => {
  const fog = world.fog;
  if (!fog) return;
  if (fog.inFog(actor.pos.x, actor.pos.y, actor.radius * 0.5)) return;
  const bank = fog.nearestBank(actor.pos.x, actor.pos.y);
  if (!bank) return;
  const dx = bank.pos.x - actor.pos.x;
  const dy = bank.pos.y - actor.pos.y;
  const d = Math.hypot(dx, dy);
  if (d < 24) return;
  // A generous stride: banks DRIFT while the beat cools down, and a dense
  // roof steals part of every landing to the clamp's slide.
  const hop = Math.min(d, 340);
  actor.pos = world.clampPos(
    { x: actor.pos.x + (dx / d) * hop, y: actor.pos.y + (dy / d) * hop },
    actor.radius);
});
