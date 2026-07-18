// ---------------------------------------------------------------------------
// BOUNDARY GATES — the treatment an exit wears where it crosses an ENCLAVE
// biome's boundary, as pure data.
//
// An enclave biome (BiomeInfo.enclave) walls itself: every zone edge with
// exactly ONE end inside it carries the enclave's declared gate, seen from
// BOTH sides — approaching the Durance you face its gate; standing inside,
// the way back out wears the same stone. The World resolves the treatment at
// placeExit (the same coordinate-prediction seam the "Uncharted · Lv N"
// labels ride, so an unminted frontier already knows a gate looms behind
// it); the layout pipeline erects the TERRAIN half through the registered
// gate builder (layoutRecipes.carveBoundaryGate); the renderer + transit
// registry dress the portal itself.
//
// One def covers both halves so a new walled biome is ONE row here + an
// `enclave` tag on its biome — no engine edits. The future biome-MELDING
// pass rides the same edge-sampling seam with blend bands instead of gates.
// ---------------------------------------------------------------------------

/** One boundary-gate treatment (registered; ids referenced from
 *  BiomeInfo.enclave.gate). */
export interface BoundaryGateDef {
  id: string;
  // --- TERRAIN (consumed by carveBoundaryGate) ------------------------------
  /** Façade half-span across the portal axis (world units; default 230). */
  halfWidth?: number;
  /** Gatehouse throat depth into the zone (default 170). */
  depth?: number;
  /** Width of the mouth/passage through the façade (default 130). */
  mouthWidth?: number;
  /** Façade/flank wall region (a registered true-wall; default 'rampart'). */
  wallRegion?: string;
  /** Baked floor under the throat + apron (FLOOR_STYLES id; default 'flagstone'). */
  floorStyle?: string;
  /** Walk-under arch doodad spanning the mouth ('' skips; default 'gate_arch'). */
  archKind?: string;
  /** Flanking monoliths at the façade's ends ('' skips). */
  pylonKind?: string;
  /** Lights flanking the mouth ('' skips; default 'brazier'). */
  brazierKind?: string;
  /** Extra dressing scattered along the façade's outer face. */
  dress?: { kind: string; count: [number, number] }[];
  /** Dressing scattered along the INNER (zone-side) approach — the camp a
   *  kept gate lives around (a warden's fire, fodder, stacked wood), where
   *  travelers actually arrive. Same count-range grammar as `dress`. */
  dressInner?: { kind: string; count: [number, number] }[];
  // --- PORTAL LOOK (consumed by drawExits / transit) -------------------------
  /** Ring/glow tint override for the portal (default: zone accent). */
  accent?: string;
  /** Label flavor appended to the portal label ("the Durance gapes"). */
  label?: string;
}

const BOUNDARY_GATES: Record<string, BoundaryGateDef> = {};

/** Register a boundary-gate treatment (warns on collision — two enclaves may
 *  SHARE a gate id on purpose, but never silently fight over one). */
export function registerBoundaryGate(def: BoundaryGateDef): void {
  if (BOUNDARY_GATES[def.id]) console.warn(`[boundary] re-registering gate '${def.id}' — overriding`);
  BOUNDARY_GATES[def.id] = def;
}

/** The treatment for an id (undefined for unknown — callers degrade to a
 *  plain portal, never crash the load). */
export function boundaryGateOf(id: string | undefined): BoundaryGateDef | undefined {
  return id ? BOUNDARY_GATES[id] : undefined;
}

/** Every registered id (boot validation: enclave biomes must name real gates). */
export function boundaryGateIds(): string[] { return Object.keys(BOUNDARY_GATES); }

// --- STOCK ROWS ---------------------------------------------------------------

// THE DURANCE GATE: the hate-citadel's mouth — a black-masonry façade pierced
// by one arched throat, pylons like headstones for giants, cold green fire on
// the lip, the toll of the halls hung out front. Foreboding is the POINT:
// the player should read "I am about to enter something's house".
registerBoundaryGate({
  id: 'durance_gate',
  halfWidth: 240, depth: 180, mouthWidth: 130,
  wallRegion: 'durance_wall', floorStyle: 'tile',
  archKind: 'gate_arch', pylonKind: 'gate_pylon', brazierKind: 'hate_brazier',
  dress: [
    { kind: 'soul_cage', count: [1, 2] },
    { kind: 'bone_pile', count: [1, 3] },
    { kind: 'demon_banner', count: [0, 2] },
  ],
  accent: '#7de84a',
  label: 'the Durance gapes',
});

// THE ROADWARDEN TOLL-GATE: the Holdfast guardians' timber waypost — a staked
// palisade face pierced by one barred mouth, squared corner posts, iron
// fire-baskets either side of the lane, and the wardens' camp dressed on the
// zone-side approach where travelers are stopped. Lived-in is the POINT: a
// kept fire, fodder, stacked wood — somebody HOLDS this road. HoldfastDefs
// reference this row by id (HoldfastDef.gate); generation raises everything
// here, while the runtime adds only what must react to the lock (the sealed
// bar across the mouth, the wardens themselves).
registerBoundaryGate({
  id: 'toll_gate',
  halfWidth: 190, depth: 150, mouthWidth: 110,
  wallRegion: 'palisade', floorStyle: 'packed',
  archKind: 'toll_arch', pylonKind: 'toll_post', brazierKind: 'brazier',
  dress: [
    { kind: 'banner_post', count: [0, 2] },
    { kind: 'broken_cart', count: [0, 1] },
  ],
  dressInner: [
    { kind: 'campfire', count: [0, 1] },
    { kind: 'hay_bale', count: [0, 2] },
    { kind: 'firewood_pile', count: [0, 1] },
  ],
  accent: '#c8a04a',
  label: 'a warded toll',
});

// THE CITY GATE: the metropolis' walled mouth — a broad coursed-stone façade
// pierced by one high passage, lamps burning either side of the way, the
// traffic's leavings out front and the first lit street dressed inside.
// Civic majesty is the POINT: after the shires and the crop seas, THIS is
// where the player reads "I have arrived at the capital." Every zone edge
// crossing the metropolis boundary wears it (BiomeInfo.enclave), so the
// approach works from any road in.
registerBoundaryGate({
  id: 'city_gate',
  halfWidth: 260, depth: 190, mouthWidth: 150,
  wallRegion: 'rampart', floorStyle: 'cobble',
  archKind: 'gate_arch', pylonKind: 'gate_pylon', brazierKind: 'street_lamp',
  dress: [
    { kind: 'broken_cart', count: [0, 1] },
    { kind: 'hay_bale', count: [0, 2] },
    { kind: 'banner_post', count: [1, 2] },
  ],
  dressInner: [
    { kind: 'street_lamp', count: [1, 2] },
    { kind: 'market_stall', count: [0, 1] },
    { kind: 'rubble', count: [0, 1] },
  ],
  accent: '#d8c06a',
  label: 'the city gate stands open',
});
