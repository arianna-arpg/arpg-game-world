// ---------------------------------------------------------------------------
// CREEP KINDS — the living-membrane library (engine/creep.ts).
//
// Each row is one organism's skin: its palette (membrane body, rim welt,
// vein filaments, glow freckles), its spread grammar, and what standing on
// it does to whom. A biome grows pockets via ZoneTheme.creep; packages and
// creep-heart monsters plant sources at runtime (World.creepEnsure). A new
// creep anywhere = one registerCreep row + one spec line.
//
// ADVANCING FRONTS live here too (CreepDef.front — every lever optional):
// the floodcrest and the wildfire are the debut rows. Their remnant doodad
// vocabulary registers alongside (the attunements registerDoodadRule
// idiom), so the whole front reads from one file.
// ---------------------------------------------------------------------------

import { registerCreep } from '../engine/creep';
import { registerDoodadRule } from '../engine/levelgen';

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

// --- THE ADVANCING FRONTS — the debut marching rows ------------------------

/** THE FLOODCREST — a directional wall of water that breaks in from the
 *  land's edge and rolls downstream across the whole ground. Wet country
 *  hastens it, dry land barely slows it; it HONORS the causeway fabric
 *  (yieldWays: live decks stay dry in the drawn skin AND the hit test —
 *  the road the wayroller decked over the marsh is the survival route,
 *  exactly as the coherence pass promised). Inside the crest you are
 *  SWIMMING (the marine pass's own slow) while the undertow carries you
 *  along the bearing and your breath drains on the deep-water ramp —
 *  monsters never drown, and the deep's own kin ride the tow for free.
 *  Behind it the land is left a wadeable shallow wake (the ford contract:
 *  stamped water is `shallow`, never a new drowning pool). Cold congeals
 *  the surge — quench, one lever. (The attunement fabric's cold-jackpot —
 *  tuning a section briefly SOLID into standable ice — is this row's
 *  reserved seam; it lands with that fabric, not here.) */
registerCreep({
  id: 'floodcrest',
  color: '#1c4a5e', rim: '#bfe8ef', glow: '#7fd4e8',
  alpha: 0.62,
  reach: [95, 150],
  lobing: 0.3,
  spread: 34,
  recede: 95,
  pulse: 1.3,
  skin: 'water',
  edge: { color: '#dff6ff', style: 'foam' },
  front: {
    speed: 34,
    affinity: {
      // The crest surges through standing wet, wallows a little on dry
      // land — and crosses roads freely (no clearway row: the deck is
      // yielded in the SKIN, not refused in the march).
      ground: { water: 1.6, tide_pool: 1.5, bog: 1.3, swamp: 1.3, mud: 1.15 },
      default: 0.85,
    },
    yieldWays: true,
    // The lasting wake is a CHAIN OF SEPARATE POOLS — spacing (2.0 × band)
    // strictly beats the largest diameter (1.5 × band), because overlapping
    // shallow discs STACK their per-disc ford-lightening sprites into a
    // flat pale wash that erases the mottle under the crossed band (the
    // "shaders look broken / ground goes flat past a line" playtest read —
    // measured: 4-deep stack ≈ 0.96 wash, ground contrast 0.95 → 0.35).
    // The stamp adapter enforces it structurally too (no shallow stamp may
    // land on an existing shallow pool), refuses to re-wet ground that
    // already reads wet, and sections stagger their stamp clocks so a wave
    // never stales several chunks in the same frame.
    convert: { ground: 'water', shallow: true, every: 2.0, r: [0.55, 0.75] },
    drag: { accel: 95, notFactions: ['deep'] },
    drown: { drain: 1.4 },
    quench: { types: ['cold'], power: 520 },
  },
  grants: [
    { status: 'swimming', notFactions: ['deep'] },
  ],
});

/** THE WILDFIRE — the fuel-weighted fire front. It RACES through brush
 *  country and starves on bare stone (affinity + the starve gutter), EATS
 *  what it passes (DoodadRule.fuel rows: kindling is erased, timber is
 *  left a charred snag — and sometimes what burned crawls OUT: cinderling
 *  from the brush, an emberwisp off a burning crown), lays dead ASHFIELD
 *  behind its trailing rim, and treats every live traveled way as a
 *  FIREBREAK (clearway 0 is a wall to the march, yieldWays keeps flame
 *  off the gravel — the coherence fabric paying off twice). Cold gutters
 *  a section; fire STOKES one, but at a deliberately high power — an
 *  authored danger must never turn a passing fire build into its bellows
 *  (and player casts never ignite fresh fronts at all: ignition-by-damage
 *  stays a reserved, default-OFF seam). */
registerCreep({
  id: 'wildfire',
  color: '#421c10', rim: '#ff7f2e', glow: '#ffb547',
  alpha: 0.72,
  reach: [80, 130],
  lobing: 0.34,
  spread: 30,
  recede: 70,
  pulse: 1.6,
  skin: 'blaze',
  edge: { color: '#ffd98a', style: 'flame' },
  front: {
    speed: 30,
    affinity: {
      ground: { brush: 1.5, ashfield: 0.4, sand: 0.55, mud: 0.35, bog: 0.25, swamp: 0.15, water: 0, tide_pool: 0, ice: 0 },
      default: 1,
      clearway: 0, // roads are FIREBREAKS — the march refuses the crossing
    },
    yieldWays: true,
    starve: { below: 0.25, after: 5 },
    consume: [
      { fuel: 'kindling', feed: 0.12, spawn: { monster: 'cinderling', chance: 0.14 }, fx: '#ff9a3c' },
      { fuel: 'timber', leave: 'charred_snag', feed: 0.2, spawn: { monster: 'emberwisp', chance: 0.1 }, fx: '#ffb547' },
    ],
    convert: { ground: 'ashfield' },
    quench: { types: ['cold'], power: 420 },
    feed: { types: ['fire'], power: 900 },
  },
  grants: [
    { status: 'flamewreathed', notFactions: ['emberkin', 'demon'] },
  ],
});

// --- The fronts' remnant vocabulary (runtime-ruled kinds, the attunements
// registerDoodadRule idiom — no KnownDoodadKind union edit needed) ----------

// CHARRED SNAG — what the wildfire leaves of timber: the dead_tree row's
// exact physics in blackened wood. Deliberately NOT fuel — burnt is burnt.
registerDoodadRule('charred_snag', {
  overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 24, bodyScale: 0.35,
});

// ASHFIELD — the wildfire's wake as GROUND (region row in world/regions.ts;
// visual in doodadVisuals). Plain dead walkable ash: no pour (runtime stamps
// don't pour), no hazard, and pointedly not in any causeway yieldsTo list —
// a road through old burn country is just a road.
registerDoodadRule('ashfield', { overlap: 'ground', walkOnly: true });
