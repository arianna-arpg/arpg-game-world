// ---------------------------------------------------------------------------
// THE SEAMLESS CONTRACTS — the branch keel's shared vocabulary (M0).
//
// Pure leaf (no engine imports), beside coords.ts on purpose: these are the
// types the M0 lanes build against CONCURRENTLY — the tissue lane implements
// the sampler, the placement lane fills the resident set, the render lane
// consumes both — so the contract lives here, owned by nobody's chip.
// The charter is docs/design/seamless-world.md; the laws in one breath:
// seamless is a MODE (World.seamless, off = byte-identical discrete play),
// zones stay authored PLACES embedded in tissue poured from the global
// fields, and every authority converts through coords.ts's PX_PER_UNIT.
// ---------------------------------------------------------------------------

/** A resident zone's seat in the worldmass: its layout's local (0,0) placed
 *  at `originPx` in world pixels. Local geometry (grids, doodads, bounds
 *  pieces) translates by exactly this offset and nothing else — one affine,
 *  no scaling, so drawn == tested survives the transform trivially. */
export interface RegionSeat {
  zoneId: string;
  originPx: { x: number; y: number };
}

/** One sample of the connective tissue at a world-pixel position — the
 *  between-zones country synthesized from the global fields (biome, relief,
 *  continents, the road polylines). MUST be pure f(worldSeed, x, y): the
 *  tissue lane may cache chunks internally, but two samplers on the same
 *  seed answer identically forever (the far-field-dress law at gameplay
 *  grain — collision-honest, deterministic, horizon-free). */
export interface TissueSample {
  /** Walkable ground? Water, void, and steep relief say no. */
  walkable: boolean;
  /** Flat ground tone for the M0 render lane (a biome-derived hex). M2
   *  replaces this with real theme dress; M0 draws honest flat country. */
  tone: string;
  /** On (or within half-width of) a literal road ribbon — the web's own
   *  polylines made ground. Roads are always walkable. */
  road: boolean;
}

/** The tissue sampler seam: the tissue lane installs, consumers read.
 *  Null = no tissue lane loaded (discrete mode, sim rigs, early boot) —
 *  every consumer must treat null as "no tissue exists" and stand down;
 *  none may throw. The install-once registry idiom (registerCourseTracer's
 *  shape): last writer wins, deliberately, so a dev rig can swap a stub. */
export type TissueSampler = (x: number, y: number, worldSeed: number) => TissueSample;
let tissueSampler: TissueSampler | null = null;
export function setTissueSampler(fn: TissueSampler | null): void { tissueSampler = fn; }
export function getTissueSampler(): TissueSampler | null { return tissueSampler; }

/** M0 dials — the keel states them; the lanes read them; her word moves
 *  them. Chunking mirrors the scene far-field dress (720px pure-seed
 *  chunks, seed-ahead/cull) because that streamer is the proven shape. */
export const SEAMLESS_CFG = {
  /** Tissue chunk span in world px (the far-field dress's own grain). */
  chunkPx: 720,
  /** Mint tissue chunks this far beyond the view (px). */
  seedAhead: 760,
  /** Drop tissue chunks this far behind the walker (px). */
  cull: 2600,
  /** Road ribbon half-width in px (the literal way's walkable spine). */
  roadHalfPx: 52,
  // --- M1 THE RING (the resident pair generalized) — ALL THREE FLAGGED
  // (unblessed; her word moves them). Membership is seat-center distance from
  // the ACTIVE zone's seat: admit within ringInPx, keep until past ringOutPx
  // — in < out BY LAW, so a seat straddling the boundary never flaps between
  // two evaluations (hysteresis). Calibrated 2026-08-12 on the probe seed's
  // SETTLED web: linked-edge spacing clusters at ~2200-3300px (p50 2791,
  // the walk pair 3193) with a long-link tail past 7800px (p90) that is a
  // different class (frontier/expanse spans) — 3600 covers the adjacent
  // cluster without reaching the tail or two-hop country (~4800+); 4800
  // keeps the walked-from zone resident across every rebase BY
  // CONSTRUCTION (members sit within ringOutPx of the old center, so the
  // back-way survives recentering). A link stretched past ringInPx simply
  // keeps its door — degradation, never a strand.
  /** Admit an eligible zone as resident within this seat distance (px). */
  ringInPx: 3600,
  /** Demote a resident once its seat passes this distance (px); > ringInPx. */
  ringOutPx: 4800,
  /** Resident mints per evaluation beat (the forechart's budget doctrine —
   *  a walker never pays two synchronous layout mints in one frame). */
  mintBudgetPerBeat: 1,
} as const;
