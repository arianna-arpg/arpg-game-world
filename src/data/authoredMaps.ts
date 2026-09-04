// ---------------------------------------------------------------------------
// AUTHORED MAPS — the shipped hand-made zones (engine/authoredMaps.ts).
//
// Each row is an AuthoredMapDef: a char-grid of registered region kinds on
// the 30px lattice ('.' ground, '#' wall, '~' water, ' ' the pad; a map's
// own legend adds more), plus doodads / spawn seats / markers / fixtures /
// exits in MAP pixels, under a zone sheet. The Map Forge (dev/mapForge.ts)
// authors these in-game and exports them here as promotion literals — the
// 'custom_' prefix comes off as part of the deliberate promotion act.
//
// Minted through World.mintAuthoredZone: a quest names one
// (QuestZoneSpec.map), the bounty board posts the ones carrying a `bounty`
// block as EXPEDITIONS, the dev lanes mint any of them beside the hero.
// ---------------------------------------------------------------------------

import { registerAuthoredMap, type AuthoredMapDef } from '../engine/authoredMaps';

/** THE PROVING YARD — a walled bandit yard around a flooded cistern: four
 *  gated chambers, a north gate onward, the garrison spread so a clear is
 *  a sweep, not a brawl. The fabric's smallest honest debut (1200×840). */
export const PROVING_YARD: AuthoredMapDef = {
  id: 'proving_yard',
  name: 'the Proving Yard',
  tileset: 'grand_arena',
  cols: 40, rows: 28,
  grid: [
    '########################################',
    '#......................................#',
    '#..oo............................oo....#',
    '#......................................#',
    '#....##########..........##########....#',
    '#....#........#..........#........#....#',
    '#....#........#..........#........#....#',
    '#....#........#..........#........#....#',
    '#....#........#..........#........#....#',
    '#....####..####..........####..####....#',
    '#......................................#',
    '#......................................#',
    '#.............~~~~~~~~~~~~.............#',
    '#.............~~~~~~~~~~~~.............#',
    '#.............~~~~~~~~~~~~.............#',
    '#.............~~~~~~~~~~~~.............#',
    '#......................................#',
    '#......................................#',
    '#....####..####..........####..####....#',
    '#....#........#..........#........#....#',
    '#....#........#..........#........#....#',
    '#....#........#..........#........#....#',
    '#....#........#..........#........#....#',
    '#....##########..........##########....#',
    '#......................................#',
    '#..oo............................oo....#',
    '#......................................#',
    '########################################',
  ],
  legend: {
    o: { doodad: { kind: 'rock', radius: 13 }, label: 'rock' },
  },
  doodads: [
    { kind: 'brazier', x: 450, y: 330, r: 14 },
    { kind: 'brazier', x: 750, y: 330, r: 14 },
    { kind: 'brazier', x: 450, y: 510, r: 14 },
    { kind: 'brazier', x: 750, y: 510, r: 14 },
    // Flanking the north gate OUTSIDE its portal clear (95px — a closer post
    // is spliced away at load; the forge's gen layer shows exactly that).
    { kind: 'banner_post', x: 480, y: 60, r: 10 },
    { kind: 'banner_post', x: 720, y: 60, r: 10 },
  ],
  spawns: [
    { id: 'bandit_cutthroat', x: 300, y: 210, count: 3, spread: 50 },
    { id: 'bandit_bruiser', x: 900, y: 210, count: 2, spread: 40 },
    { id: 'bandit_keeper', x: 900, y: 630, rarity: 'rare', label: 'the yard-keeper' },
    { id: 'bandit_cutthroat', x: 300, y: 630, count: 3, spread: 50 },
    { id: 'bandit_bruiser', x: 600, y: 315, count: 2, spread: 60 },
    { id: 'bandit_cutthroat', x: 330, y: 300, post: true, facing: Math.PI / 2, label: 'the west watch' },
    { id: 'bandit_cutthroat', x: 870, y: 300, post: true, facing: Math.PI / 2, label: 'the east watch' },
  ],
  markers: [
    { kind: 'entry', x: 600, y: 765 },
    { kind: 'poi', x: 600, y: 420 },
    { kind: 'poi', x: 300, y: 210 },
    { kind: 'poi', x: 900, y: 630 },
    // Destructible clutter is a BREAKABLE (a monster row), never a doodad.
    { kind: 'breakable', id: 'barrel', x: 210, y: 180 },
    { kind: 'breakable', id: 'crate', x: 240, y: 240 },
    { kind: 'breakable', id: 'crate', x: 990, y: 180 },
    { kind: 'breakable', id: 'barrel', x: 960, y: 660 },
    { kind: 'breakable', id: 'barrel', x: 210, y: 660 },
  ],
  exits: [{ side: 'n', at: 0.5, label: 'the north gate' }],
  objective: { kind: 'clear', all: true },
  bounty: {
    level: [2, 12],
    title: 'The Proving Yard',
    ask: 'Sweep the walled yard of its bandit garrison — every chamber, and the keeper who holds the east hall.',
  },
  notes: 'The fabric\'s debut: a compact walled arena. Every wall is a region cell, every prop a doodad row, every body a spawn seat.',
  tags: ['debut', 'bandit', 'arena'],
};

/** THE SUNKEN RELIQUARY — a flooded crypt nave between two rows of vaults,
 *  causeways over the water to two island shrines, the gravecaller at the
 *  reliquary door in the north. Ramparts (the built masonry region), water
 *  wading, a boss objective and a frontier east (1320×960). */
export const SUNKEN_RELIQUARY: AuthoredMapDef = {
  id: 'sunken_reliquary',
  name: 'the Sunken Reliquary',
  tileset: 'crypt',
  cols: 44, rows: 32,
  grid: [
    'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR',
    'R..........................................R',
    'R..RRRRRRRRRRRRRRRR......RRRRRRRRRRRRRRRR..R',
    'R..R..............R......R..............R..R',
    'R..R..b........b..R......R..b........b..R..R',
    'R..R..............R......R..............R..R',
    'R..R..............R......R..............R..R',
    'R..RRRRRRR..RRRRRRR......RRRRRRR..RRRRRRR..R',
    'R..........................................R',
    'R..........................................R',
    'R.....~~~~~~~~~~~~~~..~~~~~~~~~~~~~~~......R',
    'R.....~~~~~~~~~~~~~~..~~~~~~~~~~~~~~~......R',
    'R.....~~~~~~~~~~~~~~..~~~~~~~~~~~~~~~......R',
    'R.....~~~~~~........~~........~~~~~~~......R',
    'R.....~~~~~~........~~........~~~~~~~......R',
    'R.....~~~~~~..RRRR..~~..RRRR..~~~~~~~......R',
    'R.....~~~~~~..R..R..~~..R..R..~~~~~~~......R',
    'R.....~~~~~~..R..R..~~..R..R..~~~~~~~......R',
    'R.....~~~~~~..R..R..~~..R..R..~~~~~~~......R',
    'R.....~~~~~~........~~........~~~~~~~......R',
    'R.....~~~~~~........~~........~~~~~~~......R',
    'R.....~~~~~~~~~~~~~~..~~~~~~~~~~~~~~~......R',
    'R.....~~~~~~~~~~~~~~..~~~~~~~~~~~~~~~......R',
    'R..........................................R',
    'R..........................................R',
    'R..RRRRRRRRR..RRRRRRRRRRRRRRRR..RRRRRRRRR..R',
    'R..R.......R..R..............R..R.......R..R',
    'R..R..b....R..R.....bbb......R..R....b..R..R',
    'R..R.......R..R..............R..R.......R..R',
    'R..RRRRRRRRR..RRRRRRRRRRRRRRRR..RRRRRRRRR..R',
    'R..........................................R',
    'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR',
  ],
  legend: {
    R: { region: 'rampart', label: 'rampart' },
    b: { doodad: { kind: 'bone_pile', radius: 12 }, label: 'bone pile' },
  },
  doodads: [
    { kind: 'brazier', x: 570, y: 210, r: 14 },
    { kind: 'brazier', x: 750, y: 210, r: 14 },
    { kind: 'bone', x: 480, y: 420, r: 9, rot: 0.7 },
    { kind: 'bone', x: 840, y: 480, r: 9, rot: 2.1 },
    { kind: 'rubble', x: 150, y: 270, r: 18 },
    { kind: 'rubble', x: 1170, y: 690, r: 18 },
    { kind: 'lantern_post', x: 660, y: 720, r: 10 },
  ],
  spawns: [
    { id: 'skeleton_warrior', x: 660, y: 300, count: 3, spread: 60 },
    { id: 'zombie', x: 300, y: 720, count: 3, spread: 50 },
    { id: 'zombie', x: 1020, y: 720, count: 3, spread: 50 },
    { id: 'skeleton_archer', x: 465, y: 495, post: true, facing: 0, label: 'the west shrine' },
    { id: 'skeleton_archer', x: 765, y: 495, post: true, facing: Math.PI, label: 'the east shrine' },
    { id: 'skeleton_warrior', x: 210, y: 150, count: 2, spread: 40 },
    { id: 'skeleton_warrior', x: 1110, y: 150, count: 2, spread: 40 },
    { id: 'zombie', x: 660, y: 810, count: 4, spread: 70 },
  ],
  markers: [
    { kind: 'entry', x: 660, y: 900 },
    { kind: 'boss', x: 660, y: 135 },
    { kind: 'poi', x: 660, y: 480 },
    { kind: 'poi', x: 300, y: 720 },
  ],
  exits: [{ side: 'e', at: 0.5, label: 'the drowned stair' }],
  objective: { kind: 'boss', id: 'gravecaller', levelBonus: 1 },
  bounty: {
    level: [6, 20],
    title: 'The Sunken Reliquary',
    ask: 'Wade the drowned nave, break the shrine watch, and fell the gravecaller at the reliquary door.',
  },
  notes: 'Ramparts + water + a boss seat: the built-masonry region, wading, and the landmark-spawn lane\'s duty posts.',
  tags: ['debut', 'undead', 'crypt', 'boss'],
};

/** The shipped roster — registration order is not meaning (ids sort). */
export const AUTHORED_MAP_LIST: readonly AuthoredMapDef[] = [PROVING_YARD, SUNKEN_RELIQUARY];

for (const m of AUTHORED_MAP_LIST) registerAuthoredMap(m);
