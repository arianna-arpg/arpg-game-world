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
  notAquatic: true, // water within water — the crest breaks on land, never under the sea
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

/** THE COMETFALL — the night sky crossing the ground. A comet is a FAST,
 *  NARROW section streaking one bearing: born at the rim, across the whole
 *  zone in seconds, gone off the far edge — the lane's next streak already
 *  owed. The land means nothing to it (affinity default 1 everywhere, no
 *  clearway row — sky-fire ignores roads and voids alike), it eats nothing
 *  and converts nothing (the streak IS the event); its teeth are the
 *  star-sear on whoever it crosses and the along-bearing SHOVE (the
 *  undertow lever worn as a comet's wake). Lanes carry it only where a
 *  theme says so, and only under the sky the row names (FrontSpawnRow.when
 *  — the vesper country flies these at night). Enough cold can stall a
 *  streak mid-field — expensive, deliberate, and never required: stepping
 *  aside is always the cheaper answer. */
registerCreep({
  id: 'cometfall',
  color: '#2a2440', rim: '#9fd0ff', glow: '#ffe9c8',
  alpha: 0.66,
  reach: [30, 46],
  lobing: 0.22,
  spread: 60,
  recede: 160,
  pulse: 2.4,
  skin: 'blaze',
  edge: { color: '#cfe4ff', style: 'flame' },
  front: {
    speed: 235,
    affinity: { default: 1 },
    starve: { below: 0.05, after: 30 },
    drag: { accel: 210, notFactions: ['vesperkin'] },
    quench: { types: ['cold'], power: 700 },
  },
  grants: [
    { status: 'starfire', notFactions: ['vesperkin'] },
  ],
});

/** THE BRINESURGE — the drained seabed's own weather: a quick, shin-high
 *  briny wash that sweeps the pans and leaves a chain of TIDE POOLS drying
 *  behind it (convert.fade — the pools contract like evaporating puddles
 *  until the crust reads bare again; the tide's whole visit is written and
 *  then unwritten). Wet ground hastens it, the causeway decks stay dry
 *  (yieldWays), and it never drowns anyone — the pressure is the shove and
 *  the wading slog, not the lungs. The Coilborn and the Deep's own wade
 *  free: this is their water remembering them. */
registerCreep({
  id: 'brinesurge',
  color: '#1a4a44', rim: '#e8f6ee', glow: '#9fe8d8',
  notAquatic: true,
  alpha: 0.6,
  reach: [65, 105],
  lobing: 0.28,
  spread: 34,
  recede: 100,
  pulse: 1.4,
  skin: 'water',
  edge: { color: '#eafff4', style: 'foam' },
  front: {
    speed: 42,
    affinity: {
      ground: { water: 1.5, tide_pool: 1.5, brine_sink: 1.6, mud: 1.1, sand: 0.95 },
      default: 0.9,
    },
    yieldWays: true,
    convert: { ground: 'tide_pool', every: 1.9, r: [0.6, 0.85], fade: { after: [16, 28], rate: 8 } },
    drag: { accel: 70, notFactions: ['deep', 'coilborn'] },
    quench: { types: ['cold'], power: 380 },
  },
  grants: [
    { status: 'wading', notFactions: ['deep', 'coilborn'] },
  ],
});

/** THE TIDAL WALL — the sea itself deciding to take the land back for a
 *  minute. Meant for `line: 'span'` lanes: a wall of stretched crests
 *  crossing the zone's whole breadth, ALWAYS parted by at least one clear
 *  corridor (the spanning wave's structural guarantee — the player's
 *  weave-lane is a promise about rims, rolled fresh per wave), announced
 *  as it breaks. Inside it you are swimming with a serious undertow and a
 *  draining breath; behind it the land lies under a wadeable shallow wake
 *  that DRIES pool by pool until the shore is itself again. Freezing a
 *  tsunami is a feat, priced accordingly. */
registerCreep({
  id: 'tidalwall',
  color: '#0f3a52', rim: '#eaf8ff', glow: '#7fd4e8',
  notAquatic: true,
  alpha: 0.7,
  reach: [170, 240],
  lobing: 0.24,
  spread: 40,
  recede: 120,
  pulse: 1.1,
  skin: 'water',
  edge: { color: '#ffffff', style: 'foam', width: 6 },
  front: {
    speed: 30,
    stretch: 1.7,
    affinity: {
      ground: { water: 1.4, tide_pool: 1.4, brine_sink: 1.4, bog: 1.2, swamp: 1.2, mud: 1.1 },
      default: 0.95,
    },
    yieldWays: true,
    convert: { ground: 'water', shallow: true, every: 2.0, r: [0.55, 0.75], fade: { after: [22, 38], rate: 6 } },
    drag: { accel: 150, notFactions: ['deep', 'coilborn'] },
    drown: { drain: 2.2 },
    quench: { types: ['cold'], power: 950 },
  },
  grants: [
    { status: 'swimming', notFactions: ['deep', 'coilborn'] },
  ],
});

/** THE LANDSLIDE — the mountainside letting go. Meant for `line: 'span'`
 *  lanes rolled DOWNSLOPE (bearing 'cardinal' — one grain per zone, the
 *  slope's own): a wall of churning rubble crossing the zone's breadth,
 *  ALWAYS parted by at least one clear corridor (the spanning wave's
 *  structural guarantee — the lee between the big stones is the player's
 *  weave-lane), announced by the mountain's groan. Inside it you are
 *  stone-lashed and carried downhill; behind it the slope lies under loose
 *  slide-scree that settles pool by pool until the ground is itself again
 *  (convert.fade — the whole slide is written and then unwritten). It cares
 *  NOTHING for roads — a slide buries the path (no clearway row, no
 *  yieldWays; the corridor is the only mercy) — and it spares NO faction:
 *  the mountain builds no allegiance. Ice hastens it, open water bogs it
 *  down; enough raw FORCE can shatter a section early (quench physical,
 *  priced like freezing a tsunami — stepping into the corridor is always
 *  the cheaper answer). */
registerCreep({
  id: 'landslide',
  color: '#3a342a', rim: '#b8ab90', glow: '#8a7f68',
  alpha: 0.72,
  reach: [90, 140],
  lobing: 0.3,
  spread: 60,
  recede: 140,
  pulse: 1.8,
  skin: 'membrane',
  edge: { color: '#d8cdb4', style: 'foam', width: 5 },
  front: {
    speed: 120,
    stretch: 1.8,
    affinity: {
      ground: { ice: 1.2, snowdrift: 1.1, scree_wake: 1.1, water: 0.55, bog: 0.5, swamp: 0.5 },
      default: 1,
    },
    convert: { ground: 'scree_wake', every: 1.7, r: [0.5, 0.7], fade: { after: [12, 22], rate: 9 } },
    drag: { accel: 240 },
    quench: { types: ['physical'], power: 1100 },
  },
  grants: [
    { status: 'stonelashed' },
  ],
});

/** THE SANGUINE PULSE — the artery paying out on the heartbeat, made
 *  literal. A crest of blood STRETCHED wide across its march (front.stretch
 *  — the ellipse fills the gallery wall-to-wall) that sweeps the Sanguine's
 *  open rivers on a pump cadence (`waves` every dozen seconds), carries
 *  bodies downstream on the flow, and leaves pooled blood that DRAINS
 *  behind it — the halls flood and empty like a working vessel. The flesh's
 *  own ride the current unbothered; everyone else wades. Cold congeals a
 *  pulse mid-stroke. */
registerCreep({
  id: 'sanguine_pulse',
  color: '#4a0c16', rim: '#f08a96', glow: '#e03848',
  notAquatic: true,
  alpha: 0.66,
  reach: [110, 150],
  lobing: 0.18,
  spread: 50,
  recede: 130,
  pulse: 2.2,
  skin: 'water',
  edge: { color: '#ff6a76', style: 'foam' },
  front: {
    speed: 58,
    stretch: 2.6,
    affinity: {
      ground: { blood_pool: 1.5, water: 1.2 },
      default: 1,
    },
    convert: { ground: 'blood_pool', every: 1.9, r: [0.5, 0.7], fade: { after: [9, 15], rate: 10 } },
    drag: { accel: 120, notFactions: ['flesh'] },
    quench: { types: ['cold'], power: 620 },
  },
  grants: [
    { status: 'wading', notFactions: ['flesh'] },
  ],
});

/** THE SANGUINE BORE — blood PUMPED, not poured: one hard slug that rushes
 *  the vessel and FOLLOWS it (FrontSpec.flow — whisker steering reads the
 *  walk grid, so the bolus bends with the winding galleries like a current
 *  following its bank, deflects off struck walls, and REBOUNDS out of
 *  blind pockets), ELONGATING as the pump feeds it (swell — the slug
 *  visibly stretches down the tube) until the pressure dies and it
 *  DISPERSES mid-zone (travel — dwell rolled per pump; the taper is the
 *  surge audibly losing its push). The current is vessel-CONFINED
 *  (flow.confine): the wall between two galleries is a wall to the blood —
 *  no grant, no drag, no drown reaches through stone. Everyone the bore
 *  covers is swept hard downstream — except the flesh's own, who ride it
 *  like weather — and PALE CORPUSCLES surf the crest itself, spearing
 *  whatever the blood carries past: the artery cleaning itself. Cold
 *  congeals a slug mid-rush. */
registerCreep({
  id: 'sanguine_bore',
  color: '#560e1a', rim: '#ff9aa4', glow: '#ff4454',
  notAquatic: true,
  alpha: 0.7,
  // Sized to the TUBES, not the halls — the bolus fills the vessel it
  // follows; swell supplies the length, never the width.
  reach: [58, 84],
  lobing: 0.16,
  spread: 60,
  recede: 150,
  pulse: 2.6,
  skin: 'water',
  edge: { color: '#ff8090', style: 'foam', width: 5 },
  front: {
    speed: 165,
    stretch: 1.5,
    flow: { steer: 2.6, bounce: 0.45, confine: true },
    travel: { range: [1500, 2400], taper: 0.3 },
    swell: { max: 2.3, per: 1000 },
    affinity: {
      ground: { blood_pool: 1.25, water: 1.1 },
      default: 1,
    },
    convert: { ground: 'blood_pool', every: 1.6, r: [0.5, 0.7], fade: { after: [7, 12], rate: 11 } },
    drag: { accel: 300, notFactions: ['flesh'] },
    riders: [{ monster: 'pale_corpuscle', count: [1, 2], chance: 0.65 }],
    quench: { types: ['cold'], power: 700 },
  },
  grants: [
    { status: 'wading', notFactions: ['flesh'] },
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

// SCREE WAKE — the landslide's settling rubble as GROUND (region row in
// world/regions.ts carries the mild slog; visual in doodadVisuals). The
// convert.fade lane evaporates every pool, so the slope heals itself —
// runtime stamps only, never authored layouts.
registerDoodadRule('scree_wake', { overlap: 'ground', walkOnly: true });
