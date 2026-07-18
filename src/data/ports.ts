// ---------------------------------------------------------------------------
// THE HARBOR FABRIC — ports as KNOWLEDGE HUBS, all dials.
//
// A port used to be a coastal zone with a dock. This file makes the harbor a
// place the WORLD flows through:
//
//   LANES    — coastal shipping routes (ZoneDef.searoutes) routed at port
//              MINT, so the sea network pre-exists the sailing of it. The
//              forechart mints veiled harbors down every coast it reaches;
//              by the time the player docks anywhere, the lanes are waiting,
//              and the Sail menu's port-hopping has real destinations. The
//              player's own crossings still append routes as always.
//   HEARSAY  — the harbor board (the revived Sail panel): every dock surfaces
//              the FAR omens (world/omens.ts) — rumor rows with a bearing and
//              a distance band, each an event seated out in country the
//              player has never seen. Sailors talk; harbors listen.
//   CHARTS   — a hearsay row can be bought as a CHART: gold, priced by
//              distance, that SURVEYS a pulse around the rumored seat (the
//              spire's own reveal machinery) — the paid shortcut between
//              "somewhere north" and a mark on the map. The exploration is
//              still yours to walk (or sail).
//
// Engine seams: World.routePortLanes (mint-time lanes), World.updateOmens +
// world/omens.ts (the rumor substrate), ui/panels harbor board (the surface).
// Docs: docs/engine/forechart.md (the fabric family's shared doc).
// ---------------------------------------------------------------------------

export const PORT_CFG = {
  lanes: {
    /** Node-unit reach of automatic coastal shipping lanes at port mint. */
    range: 900,
    /** Most lanes a fresh port routes at mint (nearest ports first). */
    perPort: 2,
    /** Route cap per port — a hub harbor eventually stops accepting lanes. */
    maxPerPort: 4,
    /** Lanes SHORTER than this skip the wet-chord test: adjacent harbors on
     *  one shore sit INLAND of the shoreline (every mint is pulled ashore),
     *  so their straight chords read land even though the run between them
     *  is an honest coastal hop — ships follow the coast. Only lanes LONGER
     *  than this must show open water on the chord (no lane straight across
     *  a continent's interior). */
    wetTestBeyond: 260,
  },
  hearsay: {
    /** Omens at least this far (node units) from the harbor make the board —
     *  nearer ones are the land's own whisper business (world/omens.ts). */
    farBeyond: 260,
    /** Most hearsay rows a board shows at once (freshest + farthest first). */
    max: 6,
    /** CHART pricing: gold per node-unit of distance to the rumored seat… */
    chartPricePerDist: 0.35,
    /** …with a floor (no chart is pocket change). */
    chartPriceMin: 60,
    /** The survey pulse a purchased chart stamps around the seat (node
     *  units) — the spire's reveal machinery, bought at the dock. */
    chartReveal: 150,
  },
};
