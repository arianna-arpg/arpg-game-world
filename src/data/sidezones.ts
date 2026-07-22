// ---------------------------------------------------------------------------
// SIDEZONES — dwell-to-enter subsections as an OPEN REGISTRY.
//
// A sidezone is a pocket zone living OFF the world graph (the cave machinery:
// caveMap / caveReturn / caveStack in world.ts — never charted, invisible to
// every overlay, event, and invasion), entered by dwelling on an ENTRANCE
// DOODAD. This registry makes the mechanism data: ANY doodad kind becomes an
// entrance by registering a SidezoneDef — the classic cave mouth, the town
// cellar's hatch, a package's arena maw. The engine consults the registry for
// the dwell time, the entry gate (indoorsOnly), discovery ledger keys, the
// level policy, and the mint itself; content packages can FURNISH a
// registered sidezone with extra fixtures at mint time (ContentPackage
// .furnish) — new rooms under old floors, with zero engine edits.
//
// Adding a sidezone kind = one registerSidezone call (+ a doodad rule/visual
// for its entrance kind). Nothing here is keyed to a zone id.
// ---------------------------------------------------------------------------

import { registerDoodadRule, registerSidezoneEntranceKind } from '../engine/levelgen';
import { mintCave } from '../engine/worldgen';
import { transitDwell } from './transit';
import { TILESETS } from './tilesets';
import type { ZoneDef } from './zones';

/** Everything a mint may read from the live world, passed by the engine. */
export interface SidezoneMintCtx {
  /** The zone the entrance stands in (the pocket's way home). */
  parent: ZoneDef;
  /** Stable per-entrance seed (classic caves: the stampCaveMouth zip; every
   *  other kind: hashed from the mouth's position — same mouth, same pocket). */
  seed: number;
  /** The pocket's zone id (already prefixed/keyed by the engine). */
  id: string;
  /** The MOUTH's world position in the parent — the anchor a vertical pocket
   *  hangs its ZoneDef.below on (the geyser the shelf floats above). */
  pos: { x: number; y: number };
  /** The entering hero's character level (arena scaling, level floors). */
  playerLevel: number;
  /** Is a content package live on this run (manifest-enabled + start gate)? */
  pkgActive: (pkgId: string) => boolean;
}

export interface SidezoneDef {
  /** The entrance DOODAD KIND (registry key) — any placed doodad of this kind
   *  becomes a dwell-to-enter mouth. */
  kind: string;
  /** Seconds of idle dwell to enter (default: the classic cave's 0.55). */
  dwell?: number;
  /** Entry only while the player stands under the SAME ROOF as the entrance —
   *  a hatch inside a house can never be dwelled through the wall. */
  indoorsOnly?: boolean;
  /** Run-ledger key bumped on each entry (discovery — surfaces Vault unlocks,
   *  exactly like the delvers_seen / breach_encountered pattern). */
  ledgerOnEnter?: string;
  /** 'character': the pocket's level re-stamps from the entering hero on EVERY
   *  visit — a scaling arena, not a fixed-level hole. */
  levelWith?: 'character';
  /** A TRAVERSAL id (engine/traversal.ts): entering this pocket is a vertical
   *  CROSSING, not a step — the dwell starts the registered cinematic (a
   *  geyser's launch) and the zone swap fires behind its veil. A pocket whose
   *  minted def carries `below` also asks the renderer to capture the parent
   *  as its understory during the windup. Absent = the classic instant step. */
  traversal?: string;
  /** Build the pocket's ZoneDef. Minted once per entrance (cached in caveMap);
   *  keep it pure — the same ctx must yield the same def. */
  mint: (ctx: SidezoneMintCtx) => ZoneDef;
}

export const SIDEZONES: Record<string, SidezoneDef> = {};

export function registerSidezone(def: SidezoneDef): void {
  if (SIDEZONES[def.kind]) console.warn(`[sidezones] re-registering '${def.kind}' — overriding`);
  SIDEZONES[def.kind] = def;
  // Generation learns the KIND (levelgen's entrance set): a ZoneDef.noDeeper
  // pocket strips every registered entrance at the layout chokepoint — new
  // sidezone kinds inherit the discipline by registering, zero extra wiring.
  registerSidezoneEntranceKind(def.kind);
}

export function sidezoneOf(kind: string): SidezoneDef | undefined {
  return SIDEZONES[kind];
}

/** Idle-dwell seconds to enter a mouth of this kind (ONE lookup for the
 *  engine's dwell loop and the renderer's progress ring alike). A SidezoneDef's
 *  own `dwell` wins; otherwise the TRANSIT registry answers ('sidezone:<kind>'
 *  chains to the 'sidezone' family row — the classic cave's 0.55). */
export function dwellOf(kind: string): number {
  return SIDEZONES[kind]?.dwell ?? transitDwell(`sidezone:${kind}`, 0.55);
}

// --- THE CLASSIC CAVE --------------------------------------------------------
// The reference sidezone: mintCave keeps its historical behavior wholesale
// (cavern tileset, the deeper-mouth ladder, breach depth) — the registry just
// makes it the FIRST entry instead of a hardcoded path.
registerSidezone({
  kind: 'cave_entrance',
  mint: ({ parent, seed, id }) => mintCave(parent, seed, id),
});

// --- THE SUNKEN RUIN -----------------------------------------------------------
// The jungle's swallowed halls: a ruin_gate doodad (composition-placed in the
// jungle's cleared courts) descends into a minted 'sunken_ruin' interior —
// the cave machinery wholesale: deterministic per-gate seed, clear-once,
// zone memory, the ladder home. Each gate ROLLS its own face (overgrown
// halls / flooded undercroft), so two ruins in one region read as two
// buildings of one city. The 'ruin_entered' ledger key is THE GATEWAY SEAM:
// a stable discovery hook any future content package, Vault unlockable or
// expedition can gate on (the Pit's cellar_entered pattern) — the door is
// already open; the package only has to name it.
registerSidezone({
  kind: 'ruin_gate',
  dwell: 0.7,
  ledgerOnEnter: 'ruin_entered',
  mint: ({ parent, seed, id }) => mintCave(parent, seed, id, 'sunken_ruin', { rollVariant: true }),
});

// --- THE BURIED VAULT --------------------------------------------------------
// The desert's descent (the buried_village composition plants the gate): a
// lost village's underworks, preserved by the same sands that erased its
// streets. Each gate rolls its own face — two vaults in one erg read as two
// cellars of one dead town. The 'vault_entered' ledger key is the desert's
// GATEWAY SEAM (the ruin_entered pattern): the Sun & Sand gem pools and any
// future expedition simply name it.
registerSidezone({
  kind: 'vault_gate',
  dwell: 0.7,
  ledgerOnEnter: 'vault_entered',
  mint: ({ parent, seed, id }) => mintCave(parent, seed, id, 'buried_vault', { rollVariant: true }),
});

// --- THE SEPULCHER SANDS -------------------------------------------------------
// The tomb-dynasty's descent (the sepulcher_site composition plants the
// stair): under the deep desert-band zones, dune-country washes into
// bone-country — the blend fabric's first consumer — with the Sand
// Sarcophate garrisoning the run between. Each stair rolls its own face
// (drifts / processional / sand-choked), so two descents in one erg read
// as two wings of one necropolis. The 'sepulcher_entered' ledger key is
// the dynasty's GATEWAY SEAM (the vault_entered pattern): the Unsealing
// and any future package or Vault unlock simply name it.
registerSidezone({
  kind: 'sepulcher_gate',
  dwell: 0.7,
  ledgerOnEnter: 'sepulcher_entered',
  mint: ({ parent, seed, id }) => mintCave(parent, seed, id, 'sepulcher_sands', { rollVariant: true }),
});

// --- THE CREVICE (the hollows fabric's way down) -------------------------------
// A hollow seam gives way and the wall confesses a SHAFT (the crevice_hollow
// reveal, data/hollows.ts): a registered mouth descending ONE STRATUM deeper —
// mintCave with no forced tileset, so the strata fabric face-rolls the deeper
// cave from the ladder's band and the ladder's anchor. Position-hash seeds
// (the non-classic-cave rule) make the revealed shaft deterministic: revisit
// the reopened hollow and the same deeper cave waits below. The ledger key is
// the fabric's GATEWAY SEAM (the ruin_entered pattern) for future unlocks.
registerSidezone({
  kind: 'crevice_shaft',
  dwell: 0.7,
  ledgerOnEnter: 'crevice_descended',
  mint: ({ parent, seed, id }) => mintCave(parent, seed, id),
});

// --- THE LASTLIGHT CELLAR ----------------------------------------------------
// Under the spare house's floorboards: a small, barren stone room — the
// blacksmith's flagstone underfoot (the cellar_room slab structure), a crate
// of somebody's stores, pots, firewood. It asks nothing (safe) and holds
// nothing more... until a package digs deeper (The Pit furnishes its maw
// here). Entered ONLY from inside the house: indoorsOnly gates the dwell to
// the same roof, so no one descends through a wall.

/** The cellar's look: home's warm lamplight over cellar-stone greys — a room
 *  under Lastlight, not a cave. */
const CELLAR_THEME: ZoneDef['theme'] = {
  floor: '#171511', grid: '#232019', border: '#4a4438',
  obstacle: '#3e3a30', obstacleEdge: '#5e574a', accent: '#f0cf82',
  wall: '#6a5f4a',
  dayLight: 0.82, nightDark: 0.55, // lantern dusk — down here the sky barely reaches
  ground: {
    palette: ['#242220', '#2c2a26', '#34312c', '#3b3833', '#454138'],
    bias: 0.5, alpha: 0.5, speckles: 0.8,
  },
};

registerDoodadRule('cellar_hatch', { overlap: 'trigger', spacing: 20 });

registerSidezone({
  kind: 'cellar_hatch',
  dwell: 0.6,
  indoorsOnly: true,
  ledgerOnEnter: 'cellar_entered',
  mint: ({ parent, seed, id }) => ({
    id, name: 'The Cellar',
    level: 0,
    size: { w: 640, h: 500 },
    theme: { ...CELLAR_THEME },
    seed,                        // fixed layout — the cellar keeps its shape
    layout: [],                  // barren by design: the room IS the slab
    fixtures: [{ structure: 'cellar_room', x: 320, y: 250 }],
    objective: { kind: 'safe' }, // the town's underside asks nothing
    // …except the roaches (the Verminfall): authored fauna past the sanctuary
    // gate — every cellar the world over knows this exact population.
    fauna: [
      { id: 'gutter_roach', chance: 0.8, count: [2, 5] },
      { id: 'gutter_rat', chance: 0.5, count: [1, 3] },
    ],
    exits: [{ to: parent.id, side: 's' }],
    map: { x: parent.map.x, y: parent.map.y }, // off-graph; type-required
    caveDepth: (parent.caveDepth ?? 0) + 1,
  }),
});

// --- THE GLOAM MANOR'S FLOORS ------------------------------------------------
// The haunted house is BIGGER INSIDE THAN THE MAP: the manor's ground floor
// is real in-zone space (the gloam_manor structure, walk in the front door),
// and its grand stair dwells UP into minted floor-zones — the cellar pattern
// turned vertical, the caveStack carrying the nesting (upstairs minted from
// the grounds, the attic minted from upstairs; climbing back down unwinds
// the ladder). Each floor is a hand-written mint furnishing ONE plan
// structure (manor_upper / manor_attic) on unlit boards, wearing the
// 'gloam_manor' interior tileset's theme and packs so the whole house reads
// from ONE source of truth. 'manor_entered' is the estate's GATEWAY SEAM
// (the vault_entered pattern): the Harrowing gem pools and any future
// package simply name it.

/** The manor floors borrow the interior tileset's face at MINT time (one
 *  source of truth: theme, packs, and the cave-scale genqa case all read
 *  the same def). */
const manorFace = () => TILESETS['gloam_manor'];

// (The stair/mausoleum doodad RULES live in data/formations.ts with the rest
// of the country kit — the generation graph needs the kinds; this file only
// needs the doors.)

registerSidezone({
  kind: 'manor_stair',
  dwell: 0.7,
  indoorsOnly: true, // the stair is dwelled from the hall, never through a wall
  ledgerOnEnter: 'manor_entered',
  mint: ({ parent, seed, id }) => ({
    id, name: 'Gloam Manor — Upstairs',
    level: Math.max(1, parent.level + 1),
    size: { w: 560, h: 430 },
    theme: { ...manorFace().theme },
    seed,                        // fixed floor — the house keeps its rooms
    // The plan is the content; the boards beyond it stay unlit and bare
    // but for what the spiders kept.
    layout: [{ kind: 'web', count: [1, 3] }],
    fixtures: [{ structure: 'manor_upper', x: 280, y: 200 }],
    objective: { kind: 'clear' },
    packs: manorFace().packs,
    exits: [{ to: parent.id, side: 's' }],
    map: { x: parent.map.x, y: parent.map.y }, // off-graph; type-required
    caveDepth: (parent.caveDepth ?? 0) + 1,
  }),
});

registerSidezone({
  kind: 'attic_stair',
  dwell: 0.7,
  indoorsOnly: true,
  mint: ({ parent, seed, id }) => ({
    id, name: 'Gloam Manor — the Attic',
    level: Math.max(1, parent.level + 1),
    size: { w: 480, h: 400 },
    theme: { ...manorFace().theme },
    seed,
    layout: [{ kind: 'web', count: [2, 4] }],
    fixtures: [{ structure: 'manor_attic', x: 240, y: 185 }],
    objective: { kind: 'clear' },
    packs: manorFace().packs,
    // The top of the house: whatever keeps it, keeps it HERE (the attic's
    // authored tenant rides fauna — the one lane a hand-written mint owns).
    fauna: [{ id: 'lady_of_the_house', chance: 1, count: [1, 1] }],
    exits: [{ to: parent.id, side: 's' }],
    map: { x: parent.map.x, y: parent.map.y },
    caveDepth: (parent.caveDepth ?? 0) + 1,
  }),
});

// --- THE MAUSOLEUM -------------------------------------------------------------
// The estate's family plot keeps a sealed pale door (the mausoleum_court
// cluster plants it): dwell through and the plot confesses an OSSUARY — the
// bone-true interior tileset wholesale, each door rolling its own face
// (bonefields / reliquary), so two plots in one parish read as two crypts
// of one family. The 'mausoleum_opened' ledger key is the plot's GATEWAY
// SEAM (the vault_entered pattern) for future packages and Vault unlocks.
registerSidezone({
  kind: 'mausoleum_door',
  dwell: 0.7,
  ledgerOnEnter: 'mausoleum_opened',
  mint: ({ parent, seed, id }) => mintCave(parent, seed, id, 'ossuary', { rollVariant: true }),
});

// --- THE FORMICARY (the Garden's nest) -----------------------------------------
// The colony's mound-gate spire (the formic_earthworks composition plants it)
// dwells DOWN into the formicary — the ruin_gate pattern in worked earth,
// each gate rolling its own face (galleries / deep combs / granary rows).
// The 'nest_entered' ledger key is the colony's GATEWAY SEAM (the
// ruin_entered pattern): the Scentcraft gem pools and any future package
// simply name it. Gallery floors lay a 'brood_stair' of their own (the
// formicary tileset's layout row — the garret_stair pattern pointed down),
// so the nest descends gate → galleries → the Brood Vault, where noDeeper
// closes the ladder and the Matriarch holds the bottom room.
// The nest keeps its OWN small lives (authored fauna — the cellar's lane):
// without it, minted pockets fall back to the plains wildlife table and the
// Brood Vault grows meadow hares (live-QA witnessed; the tilesets.ts:5210
// biome-tag lesson, answered at the mint).
const NEST_FAUNA = [
  { id: 'ant_trail', chance: 0.7, count: [1, 2] as [number, number] },
  { id: 'glow_moth', chance: 0.4, count: [2, 3] as [number, number] },
];

registerSidezone({
  kind: 'mound_gate',
  dwell: 0.7,
  ledgerOnEnter: 'nest_entered',
  mint: ({ parent, seed, id }) => {
    const def = mintCave(parent, seed, id, 'formicary', { rollVariant: true });
    def.fauna = [...NEST_FAUNA];
    return def;
  },
});

// The floor-to-vault rung the MINTED galleries lay themselves. Two rungs of
// worked earth is a NEST: the Vault seals the ladder (noDeeper strips any
// deeper mouths from its layout) and seats the queen as a true boss arena
// (OBJECTIVE_SEALS holds her doors until the brood is settled).
registerSidezone({
  kind: 'brood_stair',
  dwell: 0.7,
  mint: ({ parent, seed, id }: SidezoneMintCtx): ZoneDef => {
    const rungs = (parent.caveDepth ?? 0) + 1; // which rung this mint IS
    const vault = rungs >= 2;
    const def = mintCave(parent, seed, id, 'formicary', {
      rollVariant: true,
      ...(vault ? {
        name: 'the Brood Vault',
        objective: { kind: 'boss', id: 'formic_matriarch' },
        noDeeper: true,
      } : {}),
    });
    def.fauna = [...NEST_FAUNA];
    return def;
  },
});

// --- THE GLEAMHOLLOW (the Grove country's den) ---------------------------------
// A hollow bole (the glowworm_hollow composition plants it) dwells DOWN into
// the gleamhollow — the glowworm-lit root-den under the grove, ONE rung deep
// by design: fireflies dig no galleries, so the den IS the vault. The False
// Sovereign holds the bottom of the light (objective boss) and noDeeper
// seals the ladder. The 'gleam_entered' ledger key is the grove's GATEWAY
// SEAM (the nest_entered pattern): the Glimmercraft gem pool and any future
// package simply name it. The den keeps its OWN small lives (authored
// fauna — the cellar's lane): without it, minted pockets fall back to the
// plains wildlife table and the Sovereign's parlor grows meadow hares.
const GLEAM_FAUNA = [
  { id: 'glow_moth', chance: 0.6, count: [2, 4] as [number, number] },
  { id: 'ant_trail', chance: 0.3, count: [1, 1] as [number, number] },
];

registerSidezone({
  kind: 'hollow_bole',
  dwell: 0.7,
  ledgerOnEnter: 'gleam_entered',
  mint: ({ parent, seed, id }) => {
    const def = mintCave(parent, seed, id, 'gleamhollow', {
      rollVariant: true,
      name: 'the Gleamhollow',
      objective: { kind: 'boss', id: 'false_sovereign' },
      noDeeper: true,
    });
    def.fauna = [...GLEAM_FAUNA];
    return def;
  },
});

// --- THE AETHERIAL COUNTRY DENS (the checklist's den component) -------------
// THE WANE: the Vesperlands' vault under the meadows — the noctarch's seat,
// where the instruments went when the sky stopped answering. The crescent
// arch is the door; 'wane_entered' is the country's gateway seam.
registerSidezone({
  kind: 'wane_arch',
  dwell: 0.7,
  ledgerOnEnter: 'wane_entered',
  mint: ({ parent, seed, id }) => mintCave(parent, seed, id, 'wane_vault', {
    rollVariant: true,
    name: 'the Wane',
    objective: { kind: 'boss', id: 'noctarch_of_the_wane' },
    noDeeper: true,
  }),
});

// THE STORM-THROAT: the Driftways' den — the inside of a thunderhead, the
// tyrant nesting where the weather is made. 'stormthroat_entered' is the
// wind country's gateway seam.
registerSidezone({
  kind: 'storm_funnel',
  dwell: 0.7,
  ledgerOnEnter: 'stormthroat_entered',
  mint: ({ parent, seed, id }) => mintCave(parent, seed, id, 'storm_throat', {
    rollVariant: true,
    name: 'the Storm-Throat',
    objective: { kind: 'boss', id: 'thunderhead_tyrant' },
    noDeeper: true,
  }),
});

// --- THE TOWNHOUSE FLOORS (burgher ASCENSION) ----------------------------------
// The gloam manor's climb, generalized to the whole settled belt: the cave
// drop-in INVERTED. 'city_stair' (a townhouse structure's stair cell) dwells
// UP into a PROCEDURAL floor — mintCave with the 'townhouse' interior tileset
// (the ruin_gate pattern turned vertical: every house rolls its own rooms) —
// and the floors themselves lay 'garret_stair' mouths, so a house can climb
// ground → rooms → garret before noDeeper closes the ladder. caveStack
// carries the way back down; caveDepth keeps every floor weather-sheltered
// by derivation. Both stairs share ONE mint (the same house whichever rung
// you're on): floor names are authored (never the strata fabric's 'Deep'
// ladder — a second storey is not a cave, whatever the machinery says).
const townhouseFloor = ({ parent, seed, id }: SidezoneMintCtx): ZoneDef => {
  const flights = (parent.caveDepth ?? 0) + 1; // which rung this mint IS
  return mintCave(parent, seed, id, 'townhouse', {
    rollVariant: true,
    name: flights >= 2 ? 'the Garret' : 'the Rooms Above',
    objective: { kind: 'none', label: 'someone’s rooms' },
    // Two flights of stairs is a HOUSE; the garret lays no third — mintCave's
    // noDeeper strips every registered stair mouth from the top floor.
    noDeeper: flights >= 2,
  });
};

registerSidezone({
  kind: 'city_stair',
  dwell: 0.7,
  indoorsOnly: true, // dwelled from the hall, never through the street wall
  ledgerOnEnter: 'townhouse_climbed',
  mint: townhouseFloor,
});

// The floor-to-garret rung the MINTED floors lay themselves (a townhouse
// tileset layout row): indoors by construction — the whole floor is under
// the roof (sheltered by caveDepth), so no roof test gates the dwell.
registerSidezone({
  kind: 'garret_stair',
  dwell: 0.7,
  mint: townhouseFloor,
});

// --- THE SERAPH CITY'S GALLERIES (the townhouse lane vested in marble) ------
// The colossal angelic buildings are CLIMBABLE: the gallery_hollow cracks a
// basilica_stair out of a pantheon's mass (data/hollows.ts), and the stair
// dwells UP into minted GALLERY floors — three rungs (gallery → high gallery
// → belfry) before noDeeper closes the ladder, one more than any townhouse:
// the city of angels ascends into its own cloudbase, and the climb should
// feel it. Floors lay the next rung themselves (basilica_floor layout rows).
const basilicaFloor = ({ parent, seed, id }: SidezoneMintCtx): ZoneDef => {
  const flights = (parent.caveDepth ?? 0) + 1;
  return mintCave(parent, seed, id, 'basilica_floor', {
    rollVariant: true,
    name: flights >= 3 ? 'the Belfry' : flights === 2 ? 'the High Gallery' : 'the Gallery Above',
    objective: { kind: 'none', label: 'the galleries' },
    noDeeper: flights >= 3,
  });
};

registerSidezone({
  kind: 'basilica_stair',
  dwell: 0.7,
  ledgerOnEnter: 'basilica_climbed',
  mint: basilicaFloor,
});

// --- THE SEWERS (the city's underdark — the descend lane's civic door) ----------
// A street grate dwells DOWN into the minted SEWERWORKS: the ruin_gate
// pattern under the boulevards. Every grate keeps its own drains forever
// (position-hash seed), each mint rolls its own face, and 'sewers_entered'
// is the undercity's GATEWAY SEAM (the ruin_entered pattern) for future
// packages, unlock doors and bounty lines.
registerSidezone({
  kind: 'sewer_grate',
  dwell: 0.7,
  ledgerOnEnter: 'sewers_entered',
  mint: ({ parent, seed, id }) => mintCave(parent, seed, id, 'sewerworks', { rollVariant: true }),
});
