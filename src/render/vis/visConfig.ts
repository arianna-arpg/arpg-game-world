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

  /** GROUND DROPS (renderer drawDrops) — gem/gear diamond half-sizes, glow
   *  reach, and the gear name-label type. Sized SMALL on purpose: a kill
   *  burst should read as pickings on the floor, not a curtain over it —
   *  the rarity color and glow carry the across-the-room read, not bulk.
   *  Touch hitboxes are the engine's ITEM_CFG.pickupTouch; keep the two
   *  roughly in step so what looks grabbable is grabbable. */
  drops: {
    /** Gear diamond half-size (uniques run a step bigger — the shout). */
    gearHalf: 6.5,
    gearUniqueHalf: 8.5,
    /** Skill/support gem diamond half-sizes. */
    skillHalf: 6.5,
    supportHalf: 5,
    /** Skill-gem rarity ring: pad beyond the diamond + its stroke width. */
    ringPad: 2.5,
    ringWidth: 2,
    /** Gem white inner edge + gear rarity outline strokes. */
    edgeWidth: 1.2,
    outlineWidth: 2,
    /** Glow (shadowBlur) reach: gems/gear, and the unique flare. */
    glow: 9,
    glowUnique: 14,
    /** Bob amplitude (px) of the idle float. */
    bobAmp: 2.5,
    /** The floating gear label: font px, pill pad/height, lift above the item. */
    labelFont: 10,
    labelPadX: 4,
    labelPillH: 14,
    labelLift: 30,
    /** Currency glyph type sizes (vestige sigils, essence trail). */
    vestigeFont: 13,
    essenceFont: 11,
    essenceCountFont: 8,
  },

  /** THE ROOM VEIL (vis/roomVeil.ts) — interior vision confinement. While
   *  the local hero stands under a confining structure's roof (StructureDef.
   *  confineVision → PlacedStructure), everything beyond the room veils dark:
   *  the Cellar's smallness made local. Render-only — gameplay LoS keeps its
   *  own honest occlusion. Extensible: the pass draws VISION VOLUMES (rects +
   *  spill discs); today's one source is the roofed room, tomorrow's may be
   *  a cave throat or a curse's closing walls. */
  roomVeil: {
    enabled: true,
    /** Peak darkness of the veil sheet (1 = pitch). */
    alpha: 0.88,
    /** The dark's color — night-family, a shade deeper (it must read as
     *  "unseen", not "unlit": the light layer owns unlit). */
    tint: { r: 5, g: 6, b: 12 },
    /** Veil buffer resolution as a fraction of the screen (soft edges for
     *  free; the lights buffer idiom). */
    scale: 0.33,
    /** How fast the veil chases confinement per second (enter/leave fades). */
    fadeRate: 6,
    /** World-unit pad past the room rects before the dark begins — the walls
     *  themselves stay readable inside the punch. */
    pad: 10,
    /** Blur radius (px, buffer space) feathering every punched edge. 0 = off. */
    featherPx: 7,
    /** OPEN doorways spill a disc of sight this far past the aperture —
     *  the world glimpsed through the frame you must dwell in. */
    doorSpill: 46,
    /** How strongly full confinement damps the atmosphere pass's weather
     *  wash, particles and wind streaks (0 = storms rage over the veil,
     *  1 = a roof fully owns its sky). The psychological shelter lever. */
    dampAtmosphere: 0.9,
    /** WINDOW SPILL: a see-through aperture on an enclosed room's rim (an
     *  arrow-slit, a parapet line) spills a disc of sight this far past
     *  itself — the street, glimpsed through the slit. Rooms-mode only. */
    windowSpill: 34,
  },

  /** THE SIGHT VEIL (vis/sightVeil.ts) — positional occlusion shadows: the
   *  drawn expression of the LoS fabric's honest ray. From the local hero's
   *  eye, every sight-blocking body throws unseen-dark behind itself — grid
   *  wall cells (rampart lines, cave walls, verdure; closed doors seal into
   *  the grid and reopen with it) and solid doodads at their TRUNK surface
   *  (hitSurfaceOf 'shot': you fight under the leaves, you hide behind the
   *  bole). The waking house's beloved "world ends at the wall" feel,
   *  propagated to every structure, forest and warren as ONE mechanism.
   *  Render-only by doctrine — engine LoS keeps its own ray (crowns still
   *  blind the AI wider than the veil draws; the asymmetry favors the
   *  player). Composited AFTER the actor pass, BEFORE canopies and roofs:
   *  what stands in shadow is unseen with its ground, while the building
   *  itself (its roof, its crown-line) stays lit. Zone art direction rides
   *  ZoneTheme.sightVeil multipliers; per-kind opt-outs ride
   *  DoodadRule.sightShadow. Ablate pass name: 'sightveil'. */
  sightVeil: {
    enabled: true,
    /** Peak darkness of a full occlusion shadow (the roomVeil's sibling —
     *  slightly shy of it: a shadow is a horizon, not a wall of pitch). */
    alpha: 0.8,
    /** The dark's color — the roomVeil's unseen family, ONE dark everywhere
     *  (it must read as "unseen", not "unlit": the light layer owns unlit). */
    tint: { r: 5, g: 6, b: 12 },
    /** Family strengths (× alpha): true-wall cells vs solid bodies. Trunks
     *  sit a touch softer — gloom behind a bole, night behind masonry. */
    regionStrength: 1.0,
    doodadStrength: 0.85,
    /** Shadow-sheet resolution as a fraction of the screen (the lights/
     *  roomVeil buffer idiom — soft edges nearly free at low res). */
    scale: 0.25,
    /** Blur (px, buffer space) feathering every shadow edge. */
    featherPx: 3,
    /** How fast a body's hide-fade chases its occlusion state per second
     *  (cover-slips read as slipping, never popping). */
    fadeRate: 9,
    /** How fully occlusion hides actor SPRITES over the sheet's own dark
     *  (1 = a body behind a wall is gone; 0 = sheet dark only). Labels
     *  always gate fully — text never leaks what pixels conceal. */
    actorHide: 1,
    /** Veil reach cap (world px) past which shadows aren't computed — the
     *  view rect plus slack always fits at default zooms. */
    maxRadius: 1600,
    /** Shadow quad length as a fraction of the veil reach (past the screen
     *  edge, so no shadow ever ends visibly short). */
    farSlack: 1.35,
    /** Occluder-count ceiling per family per frame (a pathological grove
     *  degrades gracefully: nearest buckets win by construction). */
    maxOccluders: 288,
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
    /** COMPOSITE static veil crowns into world-space chunk slices
     *  (vis/canopy.ts): a sealed roof draws as ~a dozen chunk blits at the
     *  patch's shared alpha instead of hundreds of per-crown sprites — the
     *  forest/jungle steady-state fix. Off = the per-crown bake path above. */
    composite: true,
    /** Slice edge in world units (one baked canvas per chunk per group). */
    compositeChunk: 448,
    /** Per-frame slice bake budget: missing slices bake under this ms cap
     *  and count cap; pending chunks stand in with per-crown draws (clipped),
     *  so entering a sealed forest converges over a few frames, burst-free. */
    bakeBudgetMs: 2.5,
    maxBakesPerFrame: 4,
    /** Global LRU cap on live slices (~0.8 MB each at 448²) — MUST exceed
     *  the worst-case visible chunk count (~24 at 1440p zoom 1.3) times the
     *  groups in view, or walking evicts and rebakes every frame (the
     *  snow-tile cap lesson). Bounds boundless-zone walks near 75 MB. */
    maxSlices: 96,
    /** Patches with fewer composite-eligible crowns than this stay on the
     *  per-crown path: a lone tree is cheap to blit but costs a whole slice
     *  per chunk its crown touches — strangler court's 28 singleton patches
     *  alone pushed slice demand past the LRU cap (walk-evict-rebake churn,
     *  the 1000ms-frame GPU stall). The composite is for ROOFS. */
    minPatchMembers: 8,
    /** Divergence hysteresis (fractions of alpha): a crown leaves the
     *  composite when its own fade strays past divergeIn from the group's
     *  (the eave peek — near-fade under a covered patch edge) and rejoins
     *  under divergeOut. The gap keeps boundary grazes from flapping
     *  bake-drop-bake (the snow-bucket lesson). */
    divergeIn: 0.05,
    divergeOut: 0.015,
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
    /** THE ASYNC UPLOAD SWAP: (re)baked chunks raster into a shared scratch
     *  and swap in as ImageBitmaps when createImageBitmap resolves — the
     *  chunk's live image is never mutated, so blitting it never pays the
     *  synchronous texture re-upload inside drawImage (the flood-wake /
     *  temp-ground / brittle-carve hitch class: raster was ~2-4ms, the
     *  upload-in-drawImage was the 40ms). false = the legacy sync path. */
    asyncUpload: true,
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
    /** Dirty-rect ring for baked-bed/body doodad CHANGES (brittle pops, temp
     *  grounds appearing/melting): each add/remove stales ONLY the chunks its
     *  blend reach touches. Overflow degrades to whole-cache staleness (the
     *  flood rev) — the old behavior, which re-staled EVERY visible chunk on
     *  every doodad count change and, under churn (an ice-patch build, a
     *  melting shelf), starved the rebake budget on the same few chunks
     *  while the rest never repainted. */
    bedsDirtyMax: 96,
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

  /** THE LOW-LIFE VIGNETTE (renderer.drawLowLifeGlow): blood seeps in from
   *  the screen edge once life crosses the lowLife line, and at the last
   *  sliver a slow LUB-DUB heartbeat presses the vignette inward and flushes
   *  it redder for a moment — a wound you inhabit, not an alarm strobing at
   *  you. Every rate here sits far below flash territory by design.
   *  Settings.lowLifePulse gates the continuous part; the hit-while-low
   *  surge (world.lowLifeHitFlash) always draws. */
  lowLife: {
    // (No start threshold here on purpose: the seep begins at the PLAYER'S
    // OWN lowLife line — Actor.lowLifeLine(), the per-actor stat with base
    // stats.LOW_LIFE_FRAC — so the screen always agrees with the sheet,
    // pact belts included.)
    /** Below this life fraction the heartbeat joins the steady seep.
     *  ABSOLUTE, unlike the seep's start: the heartbeat marks nearness to
     *  DEATH itself, not the (shiftable) condition line — a build that
     *  counts as low at 55% is wounded there, not dying there. */
    beatFrac: 0.15,
    /** Steady vignette alpha: a whisper at startFrac → this deep at 0 life. */
    alphaFloor: 0.05,
    alphaCeil: 0.32,
    /** Clear-center radius (× the screen's short side): where the seep sits
     *  at startFrac (kissing the corners) → at 0 life (crept well in). */
    innerFrom: 0.46,
    innerTo: 0.24,
    /** The bright band's position along the gradient run (0 = clear-center
     *  edge … 1 = screen corner) and its alpha share of the rim's. */
    midStop: 0.55,
    midAlpha: 0.6,
    /** The blood: bright leading band, dark pooled rim, and the arterial
     *  flush a heartbeat (or a fresh wound) briefly lends them. */
    mid: '#c01212',
    edge: '#5c0008',
    flush: '#ff2a1c',
    /** The heartbeat: two smooth gaussian swells per cycle (positions/widths
     *  in cycle-phase units), then a long quiet diastole. Slow by design —
     *  periodFrom at the beatFrac line easing to periodTo at 0 life
     *  (≈37→67 bpm): dread, never strobe. */
    beat: {
      periodFrom: 1.6,
      periodTo: 0.9,
      lub: { at: 0.10, width: 0.045, amp: 1.0 },
      dub: { at: 0.30, width: 0.06, amp: 0.55 },
      /** At a full swell: extra alpha (× the steady level), inward press
       *  (× the screen's short side), and colour lerp toward `flush`. */
      alphaBoost: 0.5,
      reach: 0.07,
      flushMix: 0.75,
    },
    /** Struck while low: ONE smoothstep bloom that decays over the world
     *  timer (LOW_LIFE_FLASH_SEC) — an impact, never a blink. Absolute peak
     *  alpha, inward press, and flush lerp at the moment of the hit. */
    hit: {
      alpha: 0.38,
      reach: 0.05,
      flushMix: 0.5,
    },
  },

  /** Screen-space weather + ambient particles. */
  weather: {
    maxParticles: 150,
    /** Default crossfade seconds for a full 0→1 weather swing — each kind
     *  may override via WEATHER_FX.fadeIn (a storm can SLAM by design). */
    fadeSec: 5,
  },

  /** THE FOG LAYER (vis/fogLayer.ts — the render half of engine/fog.ts).
   *  Lobe alphas/motion come from the sim (one truth with the hit test);
   *  these knobs only shape presentation. Ablate pass name: 'fog'. */
  fog: {
    /** Baked billow sprite size (one per fog color, cached). */
    sprite: 128,
    /** Density multipliers per pass (art-direction trims, not gameplay). */
    underMul: 1,
    overMul: 1,
    /** View-cull pad beyond each bank's live bound. */
    cullPad: 240,
    /** Extra drawn density at full 'fog' weather-front strength. */
    weatherAlphaBoost: 0.3,
  },

  /** THE CREEP LAYER (vis/creepLayer.ts — the render half of engine/creep.ts).
   *  Membrane geometry/cover come from the sim (one rim function with the
   *  hit test); these knobs only shape presentation. Ablate pass: 'creep'. */
  creep: {
    /** Baked membrane sprites kept before the oldest drops (one per source
     *  personality; a zone holds ≤ CREEP_CFG.maxSources). */
    maxBakes: 96,
    /** Bake canvas pad past the rim ceiling (room for the lip glow). */
    bakePad: 10,
    /** View-cull pad beyond each source's live bound. */
    cullPad: 160,
    /** Breathing amplitude (scale sway on the shared warren heartbeat). */
    breathe: 0.018,
    /** The live pulse front riding heart→rim: alpha, stroke width, and
     *  rim-crossings per heartbeat cycle. */
    pulseAlpha: 0.14,
    pulseWidth: 9,
    pulseSpeed: 0.55,
    /** Vein glow: the wide soft under-stroke's alpha share of the core. */
    veinGlow: 0.35,
    /** THE LEADING EDGE (advancing fronts, CreepDef.edge): the telegraph's
     *  arc half-width (radians around the bearing), stroke alpha/width,
     *  and the direction streaks breaking ahead of the rim. */
    edge: {
      arc: 1.15,
      alpha: 0.6,
      width: 6,
      streaks: 6,
      streakLen: 34,
      streakSpeed: 0.9,
    },
  },

  /** THE UNDERSTORY (vis/understory.ts) — the world seen far below through
   *  `window` region cells (cloud shelves). Ablate pass name: 'understory'. */
  understory: {
    /** Snapshot resolution: canvas px per world unit (capped by maxDim). */
    scale: 0.22,
    maxDim: 2048,
    /** Parallax factor for the captured land (1 = glued to the shelf;
     *  smaller = deeper). Anchored at the camera center. */
    parallax: 0.9,
    /** Parallax for the procedural cloud sea (reads deeper than land). */
    seaParallax: 0.82,
    /** The open sky behind everything below. */
    sky: '#222b42',
    /** Altitude haze baked over every capture. */
    haze: '#a9b8da',
    hazeAlpha: 0.42,
    /** How much color the height drinks from the land (0..1). */
    desat: 0.45,
    /** Cloud-sea billow tones. */
    seaDark: '#5e6d92',
    seaLight: '#c8d4ea',
    /** Drifting cloud shadows over the floor below. */
    shadows: 3,
    shadowAlpha: 0.09,
    /** Snapshot LRU (each up to maxDim² px — release eagerly on evict). */
    maxSnaps: 3,
  },

  /** COLLAPSE FX (the render half of engine/collapse.ts): how crumbling
   *  cells shiver and crack before they fall. Ablate pass name: 'collapse'. */
  collapseFx: {
    /** Peak wobble offset (px) at full crumble. */
    wobble: 2.6,
    /** Crack line color/alpha over a crumbling cell. */
    crack: '#f4f7ff',
    crackAlpha: 0.5,
    /** Sinking darken toward the void (0..1 at full crumble). */
    sink: 0.34,
    /** Dust motes per voiding cell (world flashes ride the rest). */
    dust: 3,
  },

  /** THE FLUX LAYER (vis/fluxLayer.ts — the render half of engine/flux.ts).
   *  Pad phases / carrier positions come from the sim (one truth with the
   *  walkable grid); these knobs shape presentation only. Default cloud
   *  tints — a theme's FluxSpec.look overrides per zone. Ablate: 'flux'. */
  flux: {
    /** Baked cloud sprite size (one per tint, cached). */
    sprite: 128,
    /** View-cull pad beyond each pad/carrier bound. */
    cullPad: 200,
    /** How far the drawn cloud overhangs the walkable truth. Kept TIGHT:
     *  cloud edges are now honest falls (the skyfall boundary — stepping
     *  past the edge IS the drop), so a generous painted overhang would be
     *  a lie in the dangerous direction. */
    lobeOver: 1.06,
    /** Default tints (FluxSpec.look wins): the standing body, the sunlit
     *  crest, the dusking tatter, the player-called cloud. */
    body: '#e9eef9',
    crest: '#ffffff',
    fray: '#98a2c2',
    conjure: '#cfeaff',
    /** Fraying flicker rate (Hz-ish) + how hard lobes scatter outward. */
    flicker: 13,
    scatterFrac: 0.55,
    /** Gust streaks: count across the view + streak length (world units). */
    streaks: 44,
    streakLen: 92,
    /** Conjured PRESENCES (the puff standing over any ground): body alpha —
     *  soft enough to fight through, present enough to read as a domain —
     *  and the idle hover bob (world units). */
    puffAlpha: 0.5,
    puffBob: 2.5,
  },

  /** CANOPY EYES (vis/canopyEyes.ts): pinprick regard blinking in sealed
   *  crowns — present only where nobody is near enough to check. Kinds opt
   *  in via DoodadVisualDef.canopy.eyes; these are the spec defaults. */
  canopyEyes: {
    /** Hero distance inside which the eyes are NEVER there. */
    reach: 240,
    /** Presence fade toward shown/denied (per second). */
    fadeRate: 3.2,
    /** Eye-pairs per AWAKE crown / pupil radius / overlay alpha ceiling. */
    count: 2, size: 1.6, alpha: 0.5,
    /** Blink cycles per second-ish (pairs phase-offset). */
    blinkRate: 0.11,
    color: '#c8d8a8',
    /** Share of crowns AWAKE, scaled by the zone's biomeDepth (fringe →
     *  sealed heart): the deeper in, the more of the roof is watching. */
    shareEdge: 0.12, shareDeep: 0.5,
    /** Per-zone MOOD roll: this fraction of zones cluster their watchers
     *  into noise PATCHES (world units per noise cell below); the rest
     *  sift them thin and even. */
    patchyChance: 0.65, patchScale: 380,
  },

  /** WALL EYES (vis/wallEyes.ts + ground.ts bakeWallEyes): the flesh
   *  country's watching shell — baked sockets, live seeking pupils. */
  wallEyes: {
    /** Pupil/iris inks + overlay alpha ceiling. */
    iris: '#b8863a', pupil: '#140a0c', alpha: 0.85,
    /** Blink cycles per second-ish (cells phase-offset). */
    blinkRate: 0.14,
  },

  /** STATUS SCREEN-FX tunables (render/screenFx.ts registry + the renderer's
   *  drawStatusFx branches): the PALL (the flesh country's vasovagal read —
   *  desaturation + a pale edge wash, beatless on purpose) and the DARKEN
   *  (blind — the room closing in). */
  statusFx: {
    pallDesat: 0.5, pallWash: '#e8e0ec', pallAlpha: 0.34,
    darkenFloor: 0.78,
  },

  /** THE VOID FRAME (vis/voidFrame.ts) — what the world ends into. The
   *  hero-locked camera (render/camera.ts) shows the beyond-edge dark
   *  whenever the hero presses the rim; the classic frame sees it at the
   *  ±overshoot and around letterboxed interiors. Ablate pass name:
   *  'voidframe' (restores flat black + the plain border line). */
  voidFrame: {
    /** The abyss's base ink — the screen clear and everything past the rim.
     *  tintMix leans it toward the zone's floor color so each biome owns its
     *  own dark (0 = every zone ends in the same flat night). */
    color: '#0a0a0e',
    tintMix: 0.1,
    /** The falling-away skirt just past the rim: the zone's earth catching
     *  the last light as it drops. width in world px; floorMix blends the
     *  earth tone floor→border. */
    skirt: { width: 150, alpha: 0.45, floorMix: 0.45 },
    /** The rim lip at the boundary: a dark seat stroked UNDER the classic
     *  border line, the line itself, and a lit crest hairline over it —
     *  ground ending, not a drawn rectangle. Widths in world px. */
    rim: { seatWidth: 9, seatAlpha: 0.55, lineWidth: 4, crestWidth: 1.5, crestAlpha: 0.35 },
    /** Drifting void motes — sparse parallax dust that gives the dark its
     *  depth. One mote per `cell` px of parallax space; sway is the slow
     *  in-place drift as a fraction of the cell (never a net motion, so
     *  nothing pops at cell seams); parallax < 1 reads as far below. */
    motes: {
      cell: 210, alpha: 0.38, parallax: 0.55, sway: 0.15,
      color: '#cfd6ff', colorMix: 0.6, rMin: 0.8, rMax: 2.1,
    },
  },
} as const;

// --- DEV FORENSICS (perf-harness levers — src/dev/perf.ts) ------------------
// Not part of the visual fabric: normal play never touches either.

/** Render passes to SKIP (perfSweep --ablate=…): the renderer checks pass
 *  names at its pass boundaries, so a GPU-side cost invisible to the JS
 *  timers can be attributed by turning passes off one run at a time at real
 *  resolution. Empty = draw everything (the only state normal play sees). */
export const VIS_ABLATE = new Set<string>();

export function setVisAblate(passes: readonly string[]): void {
  VIS_ABLATE.clear();
  for (const p of passes) VIS_ABLATE.add(p);
}

/** Bake-churn counters (reset + read by the perf harness per sample window).
 *  Every ground-chunk / snow-tile bake is a fresh chunk-sized canvas
 *  allocation + GPU upload that the JS frame timers barely see — the counts
 *  make that churn a first-class, reportable number. */
export const VIS_TELEMETRY = { groundBakes: 0, snowBakes: 0 };
