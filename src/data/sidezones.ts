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

import { registerDoodadRule } from '../engine/levelgen';
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
