// ---------------------------------------------------------------------------
// THE SEAS — every dial of the sea fabric (world/seas.ts), as data.
//
// A SEA is a first-class entity now: the moment generation touches any of a
// contiguous ocean body's water, the whole body is filled, classed by size,
// NAMED, and given its deliberate PORT SYSTEM — one haven and its coves at
// explicit, seed-fixed points around the coastline, lanes rung between them.
// The player still discovers all of it the ordinary way; the world simply
// already knows. (THE FOREORDAINED TENET — see docs/engine/seas.md: the
// world's texture is a pure function of the seed, computed whole the moment
// any part is touched, revealed only as found. "Randomly deterministic":
// hand-tailored feel, zero hand-tailoring.)
//
// Class rows are an ASCENDING ladder over component size (macro-cells of the
// continent field, cellSpan ~1150 node units each): the biggest row whose
// `atCells` the sea meets wins. Add a row, get a new kind of water — no
// engine edits.
// ---------------------------------------------------------------------------

export interface SeaClassDef {
  id: string;
  /** The class word used in surfaces ("a lagoon", "a great sea"). */
  label: string;
  /** Minimum component size (macro-cells) for this class — ascending ladder. */
  atCells: number;
  /** PORT BUDGET rolled per sea (total spots, the haven included). */
  ports: [number, number];
  /** Does this water rate a HAVEN (the hub harbor — lane spokes, quay
   *  dressing)? Small waters are all coves. */
  haven: boolean;
  /** Island-field chance multiplier over ISLAND_FIELD.chance inside this
   *  sea's waters (the per-class island lever). */
  islandMul: number;
  /** Name pool halves — "the {first} {second}" ("the Glass Mere"). */
  nameFirst: string[];
  nameSecond: string[];
}

/** The ascending class ladder (data — resolved by world/seas.ts seaClassOf). */
export const SEA_CLASSES: SeaClassDef[] = [
  {
    id: 'pond', label: 'pond', atCells: 1, ports: [1, 1], haven: false, islandMul: 0.5,
    nameFirst: ['Glass', 'Still', 'Reed', 'Moon', 'Cold', 'Heron'],
    nameSecond: ['Mere', 'Tarn', 'Pond', 'Water'],
  },
  {
    id: 'lagoon', label: 'lagoon', atCells: 2, ports: [2, 2], haven: false, islandMul: 0.8,
    nameFirst: ['Pearl', 'Salt', 'Gull', 'Amber', 'Half', 'Quiet'],
    nameSecond: ['Lagoon', 'Sound', 'Bight', 'Shallows'],
  },
  {
    id: 'sea', label: 'sea', atCells: 4, ports: [2, 3], haven: true, islandMul: 1,
    nameFirst: ['Herring', 'Mourning', 'Iron', 'Whale', 'Storm', 'Pale', 'Winter', 'Copper'],
    nameSecond: ['Sea', 'Gulf', 'Deep', 'Reach'],
  },
  {
    id: 'great_sea', label: 'great sea', atCells: 9, ports: [3, 4], haven: true, islandMul: 1.25,
    nameFirst: ['Sunless', 'Widow', 'Leviathan', 'Thunder', 'Mirror', 'Wrack'],
    nameSecond: ['Sea', 'Main', 'Expanse', 'Gulf'],
  },
  {
    id: 'ocean', label: 'ocean', atCells: 19, ports: [5, 6], haven: true, islandMul: 1.5,
    nameFirst: ['Worldrim', 'Drowned', 'Endless', 'Starfall', 'Old'],
    nameSecond: ['Ocean', 'Vast', 'Main'],
  },
];

export const SEA_CFG = {
  /** Flood-fill safety cap (macro-cells). The ocean fraction sits well under
   *  the 4-neighbour percolation threshold, so real components are small —
   *  this is the theoretical backstop, not a working limit. A capped fill
   *  classes as the top row and plans ports on the filled reach (documented:
   *  the astronomically-rare capped case may vary by entry side). */
  fillCap: 360,
  /** Coastline candidate sampling step (node units) — nearshore water points
   *  the port picker chooses among. */
  coastStep: 90,
  /** A nearshore candidate must have LAND within this probe (node units). */
  coastProbe: 64,
  /** Minimum spacing between chosen port spots (node units along the water)
   *  — the deliberate-placement guarantee. Tiny waters honestly get fewer
   *  spots than their budget rather than crowded ones. */
  portMinSep: 400,
  /** How far inland a spot's LAND anchor steps past the shoreline sample. */
  shoreInset: 34,
  /** LANDING SLACK while sailing (node units): a landing dwell engages only
   *  within this of a port spot (or an island, or a grandfathered port
   *  zone). Everywhere else the shore is BREAKERS — no landing, no
   *  infinite shore-zone minting. */
  landingSlack: 96,
  /** The lane law rung between a sea's ports at mint: the coastal RING
   *  (each spot to its angular neighbours) + SPOKES from every cove to the
   *  haven. Islands lane to the haven on sighting. */
  lanes: { ring: true, havenSpokes: true, islandToHaven: true },
  /** The breakers refusal hint's cooldown (seconds) — said once per attempt
   *  spell, never spammed. */
  breakerHintCooldown: 6,
};
