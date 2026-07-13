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
    exits: [{ to: parent.id, side: 's' }],
    map: { x: parent.map.x, y: parent.map.y }, // off-graph; type-required
    caveDepth: (parent.caveDepth ?? 0) + 1,
  }),
});
