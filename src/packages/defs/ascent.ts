// ---------------------------------------------------------------------------
// ASCENT — a NET-NEW package: ride a sky geyser up through the cloud deck.
//
// Rarely, an open-sky zone in geyser country vents an AETHERIAL GEYSER.
// Dwell into its spray and it TAKES you — the launch cinematic (the traversal
// fabric) hurls you through the whiteout onto a CLOUD SHELF hung directly
// over the land you left: a torn lattice whose gaps look DOWN on that very
// zone (the understory), and whose ground DOES NOT LAST (the collapse
// fabric). Cross the eroding causeway to the ASCENDANT GATE before the sky
// reclaims the shelf and you breach THE AETHERIAL — the Firmament mints, the
// realm's own web opens. Dawdle, and the floor drops you back on the land
// below, right where you fell. The Descent's structural mirror: hell is
// delved into; heaven must be survived into.
//
// Discovered in play (runs at defaults; the Vault unlock gates TUNING), like
// the other net-new packages. The whole mechanic is DATA on the surge below;
// the shelf's dissolution numbers live on the 'aether' tileset's theme
// (CollapseSpec), where variants retune them per face.
//
// One overlay-only faction is grafted at boot (contexts:['aetherial'] keeps
// it out of ordinary surface generation — it appears ONLY via the aether
// tilesets' pack tables):
//   • THE VIGILANT HOST — the realm's wardens; choirs of wisps, wheels of
//     eyes, lancers out of the light. No warlord, no relations.
// ---------------------------------------------------------------------------

import { registerSidezone } from '../../data/sidezones';
import { registerKillHandler } from '../../engine/killHandlers';
import { mintCave } from '../../engine/worldgen';
import { AscentField, type AscentSurge } from '../overlays/ascent';
import type { ContentPackage, FactionSpec } from '../types';

/** The whole Ascent mechanic as data — every number is a knob. */
const ASCENT_SURGE: AscentSurge = {
  geyserChance: 0.14,       // ~1-in-7 eligible zones vent (seeded per zone)
  geyserBiomes: [           // geothermal + open country — where the deep water boils
    'tundra', 'volcanic', 'marsh', 'highland', 'field', 'steppe', 'meadow',
  ],
  shelfLevelBonus: 2,       // the crossing runs hotter than the land below
  shelfTrickle: [10, 16],   // the Host keeps coming while the floor keeps going
  clearNeeded: 120,
};

/** THE VIGILANT HOST — the Aetherial's wardens. contexts:['aetherial'] keeps
 *  them out of ordinary surface generation; they appear ONLY via the aether
 *  tilesets' pack tables. No warlord, no relations — realm content. */
const SERAPHIC_FACTION: FactionSpec = {
  id: 'seraphic',
  name: 'the Vigilant Host',
  color: '#ffe9a8',
  traits: { roaming: 0.25, aggression: 0.9, warlordHome: 'capital', contexts: ['aetherial'] },
  roster: [
    { id: 'cherub_wisp', weight: 4 },
    { id: 'watcher_unblinking', weight: 3 },
    { id: 'virtue_lance', weight: 3 },
    { id: 'power_of_the_bastion', weight: 2.5 },
    { id: 'ophan_wheel', weight: 2 },
    { id: 'herald_of_the_choir', weight: 2 },
    { id: 'lampad_of_the_vigil', weight: 2 },
    { id: 'dominion_scales', weight: 1 },
    { id: 'throne_of_the_law', weight: 1 },
  ],
};

/** THE GALEKIN — the Driftways' weather-fauna (the realm's WILD kin beside
 *  the Host's wardens; the Host judges, the wind just LIVES here). Realm
 *  content like the seraphic: contexts:['aetherial'], no warlord, no
 *  relations — they meet the world only through the drift tilesets' packs. */
const GALEKIN_FACTION: FactionSpec = {
  id: 'galekin',
  name: 'the Galekin',
  color: '#bfe0f8',
  traits: { roaming: 0.6, aggression: 0.7, warlordHome: 'capital', contexts: ['aetherial'] },
  roster: [
    { id: 'cirrus_fingerling', weight: 4 },
    { id: 'drift_ray', weight: 3 },
    { id: 'zephyr_eel', weight: 2.5 },
    { id: 'gale_djinn', weight: 2 },
    { id: 'nimbus_shepherd', weight: 1.5 },
    { id: 'thunderhead_tyrant', weight: 0.6 },
  ],
};

/** THE ZEPHYRID KIN — the high sky's BEASTS (the shelf-and-spire country's
 *  wild layer; the drift keeps its weather-scraps). A food chain above the
 *  clouds: RELATIONS makes them and the Galekin tear into each other on
 *  shared ground. Realm content like both its neighbors: contexts
 *  ['aetherial'], no warlord, no surface generation. */
const ZEPHYRID_FACTION: FactionSpec = {
  id: 'zephyrid',
  name: 'the Zephyrid Kin',
  color: '#cfe0f4',
  traits: { roaming: 0.5, aggression: 1.0, warlordHome: 'capital', contexts: ['aetherial'] },
  roster: [
    { id: 'cloud_grazer', weight: 4 },
    { id: 'mistwing_shrike', weight: 3 },
    { id: 'skyglass_lurker', weight: 2 },
    { id: 'stormbrow_bull', weight: 1.5 },
    { id: 'zephyrid_matron', weight: 0.8 },
  ],
};

/** The launch shelves' reserved name pool ("<X> Crossing" — shelves alone
 *  wear 'Crossing'; the realm web's pools dropped it to keep the map honest). */
const CROSSING_NAMES = ['Skyshoal', 'Cloudreach', 'Dawnfield', 'Empyrean', 'Heavenspan', 'Zenith', 'Aurelian', 'Vesper'];

// THE SHELF MOUTH: any placed 'sky_geyser' doodad is a dwell-to-ride launch
// (SidezoneDef.traversal = the sky_launch cinematic; the engine captures the
// parent's aerial as the shelf's understory during the windup). The pocket
// mints from the 'aether' tileset — theme, CollapseSpec, variant face and
// dims all ride the tileset — then hangs itself over the geyser:
// ZoneDef.below anchors both the fall mapping and the understory window.
registerSidezone({
  kind: 'sky_geyser',
  traversal: 'sky_launch',
  ledgerOnEnter: 'ascents_run', // DISCOVERY ladder: every ride is a run
  mint: ({ parent, seed, id, pos, playerLevel }) => {
    const def = mintCave(parent, seed, id, 'aether', { rollVariant: true });
    // No deeper mouths on a cloud — the cave ladder is a cave thing.
    def.layout = def.layout.filter(r => r.kind !== 'cave');
    // The shelf hangs DIRECTLY over its geyser: the anchor maps falls back
    // onto the land 1:1 and frames the understory's captured window.
    def.below = { zoneId: parent.id, ax: pos.x, ay: pos.y };
    // The shelf is AETHER GROUND: the biome tag keeps the surface fauna
    // fallback out (an unset biome reads the 'plains' WILDLIFE table — the
    // hares-arming-the-clouds incident) and lets biome-keyed systems read
    // the shelf honestly.
    def.biome = 'aether';
    // The crossing runs hotter than the land below (floored by the hero —
    // a late return to an old geyser still puts up a fight).
    def.level = Math.max(parent.level + ASCENT_SURGE.shelfLevelBonus,
      Math.max(1, playerLevel - 1));
    // Crossing IS the objective: the shelf trickles wardens forever and pays
    // its bounty at the way out — never a sealed exit over a melting floor.
    def.objective = { kind: 'escape', interval: ASCENT_SURGE.shelfTrickle };
    // A RESERVED name shape: every launch shelf is "<X> Crossing" — and only
    // shelves are (the aether web pools dropped 'Crossing'), so the map can
    // never confuse a transient crossing with realm country. Deterministic
    // per shelf; the rolled variant face keeps its suffix.
    const first = CROSSING_NAMES[(seed >>> 3) % CROSSING_NAMES.length];
    def.name = `${first} Crossing${def.variantName ? ` (${def.variantName})` : ''}`;
    return def;
  },
});

// THE HOST'S TOLL: every warden slain feeds the discovery ladder (the tier
// unlock reads it; eventqa's ledger sweep demands a bump site in src/).
registerKillHandler({
  id: 'ascent_host_slain',
  when: ctx => ctx.actor.faction === 'seraphic' && ctx.credit,
  run: ctx => { ctx.bumpLedger('host_slain'); },
});

export const ASCENT: ContentPackage = {
  id: 'ascent',
  label: 'Ascent',
  blurb: 'Somewhere in geyser country the deep water boils toward the sky. Ride it up through the cloud deck onto a dissolving shelf hung over the very land you left — outrun the collapse to the Ascendant Gate, breach the Aetherial, and answer to the Vigilant Host. Fall, and the world below catches you.',
  cost: 140,
  // DISCOVERED in play (runs at defaults); the Vault unlock gates TUNING,
  // surfacing once you've found your first geyser.
  unlock: {
    id: 'ascent_unlock',
    label: 'Find a sky geyser (from level 10)',
    test: (ctx) => (ctx.ledger.geysers_seen ?? 0) >= 1,
  },
  tiers: [
    { id: 'ascent_pilgrim', label: 'Pilgrim of the Steps', requirement: 'Ride 3 geysers', cost: 200,
      test: (ctx) => (ctx.ledger.ascents_run ?? 0) >= 3,
      grants: { weight: { min: 0, max: 90 } } },
    { id: 'ascent_hostbane', label: 'Hostbane', requirement: 'Slay 100 of the Vigilant Host', cost: 300,
      test: (ctx) => (ctx.ledger.host_slain ?? 0) >= 100,
      grants: { weight: { min: 0, max: 100 }, startLevel: { min: 0, max: 101 } } },
  ],
  modifiers: [
    { id: 'ascent_start', kind: 'startLevel', label: 'Geysers vent at level', min: 10, max: 10, step: 1, defaultValue: 10 },
    { id: 'ascent_weight', kind: 'weight', label: 'Geyser frequency', min: 25, max: 60, step: 5, defaultValue: 40 },
  ],
  defaultWeight: 40,
  defaultStartLevel: 10,
  defaultEnabled: true,
  world: { overlay: (ctx) => new AscentField(ctx, ASCENT_SURGE) },
  factions: [SERAPHIC_FACTION, GALEKIN_FACTION, ZEPHYRID_FACTION],
  validate: (look) => [
    ...(look.faction('seraphic') ? [] : [`the 'seraphic' faction is unknown`]),
    // The shelf mints from the 'aether' tileset and the gate zone from
    // 'aether_sanctum' (the aetherial DimensionEntry) — keep both honest so
    // a rename can never fall back to a warned cavern.
    ...(look.tileset('aether') ? [] : [`the 'aether' tileset is unregistered`]),
    ...(look.tileset('aether_sanctum') ? [] : [`the 'aether_sanctum' tileset is unregistered`]),
    ...(look.monster('cherub_wisp') ? [] : [`the 'cherub_wisp' warden is unknown`]),
    ...(look.monster('principality_of_dawn') ? [] : [`the 'principality_of_dawn' warden is unknown`]),
  ],
};
