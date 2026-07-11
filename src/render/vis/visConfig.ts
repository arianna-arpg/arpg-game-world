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

  /** Baked-sprite cache (bodies, glows, shadows, crowns, whole-doodads). */
  sprite: {
    /** Crowns/whole-doodad bakes share this LRU with actor bodies — a deep
     *  forest's working set (≈300 crown variants × buckets + understory)
     *  must fit alongside the bestiary or the cache thrashes into rebakes. */
    maxEntries: 1600,
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
    /** SPAWN-IN: seconds a mid-play arrival (summon, construct, hatch,
     *  streamer) takes to GROW to full size. Zone-load population skips it. */
    spawnInSeconds: 0.35,
    /** The seed scale a spawn-in starts from. */
    spawnInFrom: 0.25,
    /** WANING PRESENCE (Actor.wane): the deepest transparency dip at full
     *  wane (0..1 of the body's alpha) — the pulse bottoms out at 1-this. */
    waneDepth: 0.8,
    /** Pulse speed of the waning shimmer (rad/s) — slow, a breath in the light. */
    waneRate: 2.4,
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
    /** DIRECTIONAL long shadows (sunCast): reach in radii at low sun / high
     *  noon, and the base alpha. The direction spins with the day. */
    longMax: 1.7,
    longMin: 0.25,
    longAlpha: 0.2,
  },

  /** Actor-anchored text labels (NPC names, overhead prompts, nameplates) —
   *  drawn ABOVE the canopy/roof fades for clarity, but gated on the SAME
   *  smoothed fade the player's eyes get so a concealed actor leaks no text.
   *  A label fades out as the crown/roof over its anchor climbs from showAt
   *  toward hideAt opacity (fully hidden at hideAt and beyond). */
  labels: {
    hideAt: 0.55,
    showAt: 0.35,
  },

  /** Canopy crowns (the occlude/veil pass). fadeRate = how fast a crown's
   *  alpha chases its target per second (patch reveals and the per-tree
   *  near-fade share it — one speed, coherent motion). */
  canopy: {
    fadeRate: 10,
    /** Static crown painters (CANOPY_STATIC) blit variant-baked sprites at
     *  the fade alpha instead of repainting lobed silhouettes live — the
     *  sealed deep-forest fix. Off = every crown paints procedurally. */
    bakeCrowns: true,
  },

  /** The player's POISE/INSIGHT pool arcs (Settings.poolBars gates how). */
  poolArcs: {
    /** Seconds an arc stays shown after ANY change to its pool (value moved,
     *  max moved, break-state flipped) — the 'recent' window. */
    recentSecs: 4,
    /** 'smart' standing-spot test: the pool's damage-worth, run through its
     *  own mechanic dial (poise: max/drainRatio × poiseDR — damage mitigated
     *  across the bar's life; insight: max × efficiency × insightDR — damage
     *  it can slip), as a fraction of maxLife+maxES. Below this, the arc
     *  only surfaces around changes. Calibration: a fresh Warrior sits at
     *  ~0.09 poise / ~0.13 insight (quiet buffers, hidden); real investment
     *  in pool size or its DR clears 0.2 and earns the standing spot. */
    relevantFrac: 0.2,
  },

  /** Ground texture chunks. */
  ground: {
    /** Chunk edge in world units (one baked canvas per chunk). */
    chunk: 448,
    /** Baked mottle cell size (world units) — the flat-shaded grain. */
    cell: 8,
    /** Base-noise frequency (world units → noise lattice). */
    noiseScale: 0.0085,
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
    /** LRU cap on live chunks (boundless zones stream forever) — ~0.8 MB
     *  each at 448², so the cap bounds the floor cache near 50 MB. */
    maxChunks: 60,
    /** Terrain-blend beds (DoodadVisualDef.blend) bake into the floor chunks
     *  instead of re-rasterizing the merged group silhouette 4× per frame
     *  (a kind opts back into the live pass via blend.live). */
    bakeBlend: true,
    /** Liquid BODIES (the liquid painter's rim/core/inner union fills) bake
     *  into the floor chunks too — the animated features (sheen, melt,
     *  crawl, bubbles…) stay live. A pool's merged path was rasterizing
     *  most of the screen twice per frame. Per-kind opt-out:
     *  params.liveBody on the DOODAD_VISUALS entry. */
    bakeLiquidBody: true,
    /** Max STALE-chunk rebakes per frame after a walk-grid repaint (door
     *  break, terraform, crawling fissure). Stale chunks keep drawing their
     *  old bake until their turn — a repaint must never rebake a whole
     *  screen of chunks in one frame (that was a visible hitch). */
    rebakesPerFrame: 3,
    /** TIME budget (ms) for ALL chunk baking in one frame — stale rebakes,
     *  never-baked visible chunks, and the prefetch ring all spend from it.
     *  One never-baked visible chunk is always allowed through (streaming
     *  must progress); the rest draw a flat floor stand-in for a frame or
     *  two. The count caps bound churn; THIS bounds the hitch — a teleport
     *  or a doodad-set change used to bake a whole screenful in one frame
     *  (the 100-200ms zone-entry stall the perf harness reports as `entry`). */
    bakeBudgetMs: 6,
    /** Ground kinds tagged DoodadVisualDef.bakeWhole render as variant-baked
     *  whole-doodad sprites (brush clumps, ferns) instead of live stroke
     *  storms — the understory half of the deep-forest fix. */
    bakeDoodads: true,
  },

  /** Dynamic light layer. */
  lights: {
    /** Lightmap resolution as a fraction of the screen. */
    scale: 0.28,
    maxLights: 72,
    /** Static doodad emissives collapse into per-zone cluster aggregates
     *  (bin size below, world units) — dense lava fields stop fighting the
     *  cap and the lit set stops reshuffling as the camera pans. */
    cluster: true,
    clusterBin: 176,
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
    /** EVENT ZONE WASH (world/zoneWash.ts): seconds for a full 0→1 swing of
     *  the displayed wash — settles / lifts / zone hops seep, never pop. */
    zoneWashFadeSec: 2.5,
    /** Safety ceiling on any zone wash's alpha — no event whites out the field. */
    zoneWashMaxAlpha: 0.3,
  },

  /** Screen-space weather + ambient particles. */
  weather: {
    maxParticles: 150,
    /** Default crossfade seconds for a full 0→1 weather swing — each kind
     *  may override via WEATHER_FX.fadeIn (a storm can SLAM by design). */
    fadeSec: 5,
  },
} as const;
