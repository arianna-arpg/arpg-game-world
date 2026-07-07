// ---------------------------------------------------------------------------
// VIS_CFG — every tunable of the visual fabric in one place. The renderer and
// its painters read levers from here, never inline magic numbers, so the whole
// look can be re-balanced (or scaled down for weaker hardware) without touching
// draw code.
// ---------------------------------------------------------------------------

export const VIS_CFG = {
  /** Where the key light sits (radians, screen space). Volume shading, gloss
   *  bands and long doodad shadows all agree on this one sun. */
  lightAngle: -2.35, // up-left

  /** Baked-sprite cache (bodies, glows, shadows). */
  sprite: {
    maxEntries: 720,
    /** Canvas pad beyond the body radius (adorn reach: wings hit ~2.2r). */
    padFactor: 2.55,
  },

  /** Actor bodies. */
  body: {
    outlineWidth: 1.8,
    outlineAlpha: 0.62,
    /** Volume gradient strengths (0..1 of the material ramp). */
    lightAlpha: 0.5,
    shadeAlpha: 0.55,
    /** Idle breathing: scale amplitude + rate (Hz-ish). */
    breatheAmp: 0.03,
    breatheRate: 2.2,
    /** Ailment aura ring: alpha of the strongest status tint. */
    statusRingAlpha: 0.38,
    /** The hero's soft class-colored ground halo. */
    heroHaloAlpha: 0.16,
    heroHaloScale: 2.3,
  },

  /** Soft drop shadows (actors + standing doodads). */
  shadow: {
    alpha: 0.33,
    /** Vertical squash of the shadow ellipse. */
    squash: 0.44,
    /** Center offset below the body, in radii. */
    dropY: 0.5,
    /** Shadow width in radii. */
    scale: 1.12,
  },

  /** Ground texture chunks. */
  ground: {
    /** Chunk edge in world units (one baked canvas per chunk). */
    chunk: 512,
    /** Baked mottle cell size (world units) — the flat-shaded grain. */
    cell: 8,
    /** Base-noise frequency (world units → noise lattice). */
    noiseScale: 0.012,
    /** Mottle strength: how far cells swing between grid-dark & floor-light. */
    mottleAlpha: 0.5,
    /** Sparse speckle details per chunk (pebbles, tufts, grit). */
    speckles: 42,
    speckleAlpha: 0.30,
    /** Wall bevel + floor contact-occlusion strengths. */
    bevelAlpha: 0.34,
    aoAlpha: 0.4,
    /** The old reference grid, now whisper-faint (0 = off). */
    gridAlpha: 0.045,
    gridStep: 96,
    /** LRU cap on live chunks (boundless zones stream forever). */
    maxChunks: 110,
  },

  /** Dynamic light layer. */
  lights: {
    /** Lightmap resolution as a fraction of the screen. */
    scale: 0.28,
    maxLights: 72,
    /** How dark deep night gets (0 = untouched, 1 = pitch black). */
    nightDark: 0.66,
    /** Ambient darkness floor applied even at noon in lightless interiors. */
    duskDark: 0.22,
    /** Additive emissive bloom pass strength. */
    bloomAlpha: 0.5,
    /** The hero's own lantern-glow at night (world units). */
    heroRadius: 190,
  },

  /** Projectiles + impact flashes. */
  fx: {
    glowScale: 2.6,
    glowAlpha: 0.55,
    streakLen: 3.6,
    streakAlpha: 0.4,
    coreAlpha: 0.85,
    flashRimAlpha: 0.7,
  },

  /** Screen-space weather + ambient particles. */
  weather: {
    maxParticles: 150,
  },
} as const;
