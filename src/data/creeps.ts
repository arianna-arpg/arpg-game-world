// ---------------------------------------------------------------------------
// CREEP KINDS — the living-membrane library (engine/creep.ts).
//
// Each row is one organism's skin: its palette (membrane body, rim welt,
// vein filaments, glow freckles), its spread grammar, and what standing on
// it does to whom. A biome grows pockets via ZoneTheme.creep; packages and
// creep-heart monsters plant sources at runtime (World.creepEnsure). A new
// creep anywhere = one registerCreep row + one spec line.
// ---------------------------------------------------------------------------

import { registerCreep } from '../engine/creep';

/** CAULFLESH — the Caul's own skin: near-black membrane shot with bruise-
 *  violet veins, a pale lip where it grips the stone, freckles of dim light
 *  that are probably not eyes. Feeds the caulborn; mires everyone else with
 *  a wet, sucking drag. The biome's sub-pockets ARE this kind — walk out of
 *  a pocket and hell's honest rock feels like relief, which is the point. */
registerCreep({
  id: 'caulflesh',
  color: '#221828', rim: '#6a5478', vein: '#48305c', glow: '#9a72c8',
  alpha: 0.82,
  reach: [130, 240],
  lobing: 0.34,
  spread: 22,
  pulse: 0.9,
  veins: [6, 10],
  nodes: 0.35,
  grants: [
    { status: 'caulfed', factions: ['caulborn'] },
    { status: 'caulmired', notFactions: ['caulborn'] },
  ],
});

/** BLIGHTGROWTH — the Eldritch incursion's footprint made flesh: the same
 *  membrane grammar in the Blight's sickly key. Runtime-planted by the
 *  incursion's in-zone events (spreading from event sites while influence
 *  holds; cleansed as the epicenter falls) and grown ambiently by the
 *  epicenter tileset itself — the corruption finally OWNS ground you can
 *  see, stand on, and take back. */
registerCreep({
  id: 'blightgrowth',
  color: '#1c2618', rim: '#587a52', vein: '#3c5c38', glow: '#7fce6a',
  alpha: 0.78,
  reach: [110, 200],
  lobing: 0.4,
  spread: 30,
  recede: 70,
  pulse: 1.15,
  veins: [5, 8],
  nodes: 0.45,
  grants: [
    { status: 'blightfed', factions: ['eldritch'] },
    { status: 'blightmired', notFactions: ['eldritch'] },
  ],
});
