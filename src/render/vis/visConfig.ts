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

  /** THE SURFACE DARK's screen veil (renderer drawDarknessHud): a biting
   *  gloaming wears the descent's encroaching vignette at strength =
   *  gloom × (base + perMeterLost × (1 − lightFrac)) — present enough to
   *  announce itself while the lamp is full, closing to the abyss's own
   *  dread as the meter empties. The METER is the message: the gloom's
   *  ambience already darkens the world; this veil tracks the bill. */
  gloamVignette: { base: 0.35, perMeterLost: 0.65 },

  /** THE TIER TINT (ui/panels.ts tierMapTint — the world map's stacked-ground
   *  SHADE, the tier tell's color half): a revealed tiered zone's node disc
   *  mixes toward a pole by its story count — 'over' stacks climb toward the
   *  terrace convention's own pale crown (world/regions.ts TERRACE_FILL's
   *  ascent: higher = lighter), 'under' stacks sink toward the dark (the
   *  tell's own under-disc mix target). Strength = stories × perStory,
   *  capped at max; 0 kills the read whole (flat and fogged ground never
   *  reaches the mix — byte-identical fills by construction). Pinned by
   *  balance/probe_tiers.ts RIG M′. */
  mapTierTint: {
    /** Mix strength per story (my number, flagged 2026-08-06). */
    perStory: 0.10,
    /** Cap on the folded mix — a six-story summit must still read as its
     *  biome's color (my number, flagged 2026-08-06). */
    max: 0.28,
    /** The OVER pole: TERRACE_FILL's crown pale (convention-derived,
     *  flagged 2026-08-06). */
    overTo: '#b6c2ba',
    /** The UNDER pole: the tell's darken target (convention-derived,
     *  flagged 2026-08-06). */
    underTo: '#000000',
  },

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

  /** THE HIT FLASH (vis/hitFlash.ts) — the landed blow's read on the struck
   *  body. The damage funnel stamps Actor.hitFlash in seconds, GRADED by
   *  what landed (0.10 block-chip / 0.12 ply chip / 0.15 wound); DoT ticks
   *  never stamp (the knock law's discrimination). Duration therefore lives
   *  in the ENGINE stamps — these dials shape how the remainder draws. */
  hitFlash: {
    /** 'fill' washes the body silhouette white over its normal look;
     *  'outline' draws a white rim where the dark outline usually sits. */
    mode: 'fill' as 'fill' | 'outline',
    /** Peak overlay alpha at a full wound stamp (1 would be the retired
     *  hard white swap; composition wants the body still readable). */
    alpha: 0.62,
    /** Ramp reference, ms: drawn alpha = alpha × min(1, stampSec/(ms/1000)).
     *  Shorter chip/ply stamps enter the ramp lower — grazes read dimmer
     *  than wounds by construction. */
    ms: 120,
    /** 'outline' rim thickness (world px — the body.outlineWidth register). */
    outlinePx: 1.7,
    /** Fill implementation. 'bake' = the cached white-silhouette sprite
     *  (the tell fabric's pre-bake idiom; the measured winner on a crowded
     *  zone). 'composite' = per-draw source-in whiten through ONE reused
     *  scratch canvas — the measured alternative, kept as a lever. Neither
     *  path allocates per frame. */
    impl: 'bake' as 'bake' | 'composite',
    /** The LOCAL pain read: heroes (kind 'player') flash a touch dimmer
     *  with a longer tail, so your own body never strobes you in a crowd
     *  while still landing the "I was struck" beat. */
    player: { alpha: 0.5, ms: 150 },
  },

  /** THE COLOR DRIFT (colorDrift.ts): drift-bound looks morph their base
   *  color through a registered palette. */
  colorDrift: {
    /** Quantized ticks per palette leg — bounds the bake-cache working set
     *  at (stops × steps) sprites per drifting look, while keeping each
     *  color hop small enough to read as continuous weather. */
    steps: 9,
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

  /** THE PORTRAIT FABRIC (vis/portrait.ts) — defs drawn as themselves in the
   *  bestiary, dev tools and the website database. Per-def dials ride
   *  MonsterDef.portrait; these are the fabric-wide physics. */
  portrait: {
    /** Measured content half-extent → this fraction of the tile half. */
    fill: 0.86,
    /** Display facing (radians): π/2 faces the reader, the book's gaze. */
    facing: Math.PI / 2,
    /** Frozen pose clock for live parts (wisps, flames) in static tiles. */
    poseT: 0.35,
    /** Backing px per CSS px — crisp under ui-scale zoom + retina. */
    oversample: 2,
    /** Radius the fit probe composes at before measuring opaque bounds. */
    probeR: 20,
    /** Largest body radius a tile bakes at (bounds the bake canvases). */
    maxRenderR: 120,
    /** Trailing segments a worm's portrait shows (0 = head only). */
    wormTrail: 4,
    /** Ground the figure with the world's contact shadow. */
    shadow: true,
    /** The undiscovered tease: true geometry flooded to this one tone
     *  (matches the book's dark-glyph ink). */
    silhouette: '#3a384c',
    /** Finished-tile LRU cap + the post-zone-swap floor (cache steward). */
    maxTiles: 192,
    floorOnSwap: 64,
    /** Animated detail portraits breathe (VIS_CFG.body.breatheAmp/Rate). */
    breathe: true,
    /** NON-BOOK SEATS (px tile sizes; 0 disables a seat). The book's own
     *  leaves size themselves via BESTIARY_CFG.portrait. */
    seats: {
      /** Boss marquee bar: the boss itself beside its name. */
      marquee: 44,
      /** Build-flap Spectre chip (the attuned form, inline). */
      spectreChip: 20,
      /** Mercenary outpost offer rows (class-look blades). */
      merc: 30,
      /** Body radius a CLASS-look portrait assumes (heroes all stand 14). */
      classRadius: 14,
    },
  },

  /** Actor-anchored text labels (NPC names, overhead prompts, nameplates) —
   *  drawn ABOVE the canopy/roof fades for clarity, but gated on the SAME
   *  smoothed fade the player's eyes get so a concealed actor leaks no text.
   *  A label fades out as the crown/roof over its anchor climbs from showAt
   *  toward hideAt opacity (fully hidden at hideAt and beyond). */
  labels: {
    hideAt: 0.55,
    showAt: 0.35,
    /** THE LEGIBILITY KNEE — the POSITIONAL veils (sight veil, room veil)
     *  gate text as a STEP with one narrow fade band, never a linear dimmer:
     *  anchor concealment below `veilLegible` draws the line WHOLE (the
     *  black stroke keeps bright ink readable over any dark), past
     *  `veilConceal` not a glyph survives (the no-leak contract), and the
     *  smoothstep between them keeps a walking eye from strobing the words.
     *  The canopy/roof fades above keep their smooth ramps — those animate
     *  open in under a second, while a wall's half-shadow STANDS, and text
     *  held at half alpha is illegible clutter that still leaks. */
    veilLegible: 0.45,
    veilConceal: 0.7,
  },

  /** THE SPEECH FABRIC (renderer queueSpeech/drawSpeeches + vis/speech.ts) —
   *  NPC talk as wrapped BUBBLES with a typewriter reveal, drawn in the WORD
   *  LAYER above the room/sight veils (a room never drowns words its own
   *  gate chose to reveal; labelRevealAt still decides WHETHER they show).
   *  These are the fabric's base dials; MonsterDef.speech overrides per
   *  kind, the queueSpeech call per line, and Settings.speechTyping is the
   *  player's master switch on the reveal. */
  speech: {
    /** Wrap width for bubble text (world px) — lines break to fit. */
    maxWidth: 168,
    font: '11px Verdana',
    lineHeight: 14,
    /** Box padding, corner rounding, and the tail wedge at the speaker. */
    padX: 8,
    padY: 6,
    cornerR: 7,
    tailW: 12,
    tailH: 8,
    /** Tail-tip lift above the speaker's scalp (clears name + bar stack). */
    lift: 26,
    /** Box fill — the veil family's neutral dark; the INK keeps each
     *  speaker's own accent color (who talks stays attributable). */
    bg: 'rgba(10,10,16,0.86)',
    /** Accent-colored border strength (× the ink color). */
    edgeAlpha: 0.45,
    /** THE TYPEWRITER: per-character reveal pace, held beats at sentence
     *  stops / clause breaks (only at true breaks — "1.5" never stutters),
     *  and the blinking caret on the arriving glyph. */
    typing: {
      cps: 26,
      pausePunct: 0.22,
      pauseComma: 0.09,
      caret: true,
    },
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
    /** Occluder-count ceiling (a pathological grove degrades gracefully:
     *  nearest bodies win by construction). MUST comfortably exceed the
     *  densest biome's on-screen caster count — when the cap bites inside
     *  the visible field, every 96px gather re-sort swaps a churn of
     *  ON-SCREEN wedges in one frame (dense jungle at 288 measured 17–40
     *  visible shadows popping per bucket crossing — the "veil bouncing
     *  darker/lighter while walking" flicker; a denser mint saturated 512
     *  with the cutoff a mere 21px past the visible rim). The per-frame far
     *  cull keeps the DRAWN cost bounded by what's actually near the screen
     *  regardless of this cache size, so the cap is a true pathological
     *  backstop, not a perf dial. */
    maxOccluders: 768,
    /** THE SETTLE DEBOUNCE (THE ELEVATION LAW's cost guard): a hero STORY
     *  change re-gathers doodads AND re-extracts wall faces — but on ramp
     *  lips and leap/dash landings the tier can flicker frame-to-frame,
     *  each flip paying both full rebuilds. A CHANGED story must hold this
     *  many consecutive frames before the veil adopts it (a flicker back
     *  home costs zero rebuilds); the first-ever story adopts instantly.
     *  Render-only latency — the engine's own LoS ray never waits. 1 =
     *  adopt on sight (the old behavior). */
    tierSettleFrames: 2,
    /** INTERACTABLE REVEALS (DoodadRule.veilPierce — doors first): default
     *  radius (world px) and strength of the feathered visibility disc
     *  punched over a pierce doodad after every shadow layer, so the object
     *  stays discernible from the wall plane it shares. A rule may override
     *  both per kind ({ radius, strength }); occludedAt thins by the same
     *  falloff, so a nameplate at a door never argues with the pixels. */
    pierceRadius: 44,
    pierceStrength: 0.85,
    /** THE HULL LAW: what a STANDING roof covers, the outside veil treats
     *  as solid — an open doorway or arrow-slit must not lance a bright
     *  wedge across a concealed interior (and across the roof drawn over
     *  it: the campfire sighting — the cellar house's south door cut the
     *  two joined houses' dark into ribbons). The renderer feeds the veil
     *  every roof rect whose smoothed fade stands above this gate; as the
     *  hero steps to the threshold the roof yields and the doorway spills
     *  honestly. 0-gate = every roof conceals even mid-fade. */
    hullGate: 0.5,
    /** ROOFS WEAR THE VEIL: how fully a standing roof composites the
     *  shadow sheet over its own pixels (× the roof's fade). 1 = a fully
     *  occluded structure reads as ONE contiguous dark mass, roof included
     *  (the "one big blackened section" expectation); 0 = the old
     *  skyline-stays-lit doctrine (roofs float bright over the dark). */
    roofMul: 1,
  },

  /** THE WATCH FABRIC's drawn read (render/vis/watchLayer.ts): a watcher's
   *  sense field as a filled fan — the front cone at tested reach, the
   *  rear-hearing ring behind it, every ray clipped by the SAME sight
   *  raycast perception marches (drawn == tested; engine/watch.ts). Color
   *  climbs the ladder with the suspicion meter; a sleeper's collapsed
   *  cone reads as its bare hearing ring; a locked watcher draws nothing
   *  (the fight is the read). Reach folds vs the LOCAL hero (seat 0) —
   *  detectability and stealth included, so your shroud visibly SHRINKS
   *  their cones. */
  watch: {
    enabled: true,
    /** Fan rays over the full circle (exact cone-edge rays are added on
     *  top, so the arc boundary stays crisp at any ray budget). */
    rays: 36,
    /** Most cones drawn per frame (roster order; a backstop, not a dial). */
    maxCones: 6,
    /** Draw cull: watchers farther than this from the hero skip (px). */
    cullDist: 1500,
    /** Fill / outline alphas (× the rung color); a rising meter brightens
     *  both — at value 1 they read alpha × (1 + valueBoost). */
    fillAlpha: 0.05,
    lineAlpha: 0.26,
    valueBoost: 0.9,
    /** Rung colors: unaware / stirring / searching (alerted reads search). */
    colors: { calm: '#7a92b8', stir: '#e8d080', search: '#f0a050' },
    /** The tracker's read: its quarry's yet-unconsumed prints (count cap,
     *  dot px, alpha) and a dashed nose-line to the print it walks. */
    trail: { max: 7, size: 3.4, alpha: 0.55, color: '#b8d4a0', noseLine: true },
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
    /** THE RATE-CONDITIONAL LANE (snapLane — the gloamwood off40 fix,
     *  2026-08-02). The async snapshot above pays its own toll: every
     *  createImageBitmap emits a ~25-36ms MAIN-THREAD task BETWEEN frames
     *  (the phase ledger's 'slab pre:' rows), and at walking's chunk-fault
     *  rate those tasks ARE the >40ms rAF-gap stall class the sweep flags
     *  on heavy-bake forests (gloamwood forensics 2026-08-02: stalls ∝
     *  bake count, {0,0,0} under ablate=ground, and the SAME bake count on
     *  the sync path crossed 40 once in eight bakes vs three-to-five
     *  stalls async). So each bake picks its lane by recent demand ON ITS
     *  OWN CAUSE — two ledgers, because the demand shapes differ:
     *  MISSING bakes (never-baked chunks: walking's column faults +
     *  prefetch, and zone-entry screenfuls) arrive as short bounded
     *  bursts — a column event is ~4 visible chunks + the prefetch ring
     *  inside one window — so the first `missingSyncMax` per `windowMs`
     *  ride the SYNC lane (raster into the chunk's own canvas; its one
     *  texture upload lands inside the next drawImage, IN-frame — the
     *  regime the sync-path A/B measured clean) and walking NEVER
     *  snapshots; only an entry-scale screenful spills its tail onto the
     *  async lane (the shipped entry profile: serialized snapshots behind
     *  flat stand-ins). Missing demand cannot sustain — only camera travel
     *  mints it — so the generous allowance is storm-proof by nature.
     *  STALE bakes (repaint rebakes: walk-grid changes, bed churn) are the
     *  STORM signal — flood-front wakes, melting shelves, creep drying
     *  sustain them every frame, and sustained mutate+blit re-uploads are
     *  the exact hitch class the async swap was built for — so only
     *  `staleSyncMax` per window ride sync (an isolated door-break still
     *  repaints in-frame with no snapshot task and no old-face wait) and a
     *  storm spills async after that bounded opening leak.
     *  Both maxes 0 = pure-async (the pre-fix behavior, the A/B forensics
     *  arm); asyncUpload false still = pure-sync everywhere. */
    snapLane: { windowMs: 1500, missingSyncMax: 8, staleSyncMax: 2 },
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

  /** DOODAD SHADOWS (the long directional casts + the soft contact blobs).
   *  Both draw per visible doodad per frame — in a 4-5k-doodad gloam forest,
   *  or over tundra's snow wash, the alpha-ellipse fill alone crossed the
   *  GPU knee (2026-07-19: tundra 37.6ms p50 / 82 hitches bare, 16.8 with
   *  shadows ablated). The governor bounds the bill: at most `budget`
   *  shadow draws per frame (painter z-order spends it, so the large
   *  standing kinds that read as grounded keep theirs) and bodies whose
   *  cast would land under `minRadiusPx` on screen skip — a subpixel
   *  shadow is noise. Ablate pass name: 'shadows'. */
  shadows: { budget: 500, minRadiusPx: 4 },

  /** Dynamic light layer. */
  lights: {
    /** Lightmap resolution as a fraction of the screen. */
    scale: 0.28,
    /** Total light budget per frame. The punch pass is one small blit per
     *  light on the scale-reduced buffer — the cap protects the collect and
     *  bloom passes, not fill rate, so it can afford to be generous. (72
     *  re-starved dense fields once cinder beds + vent formations joined the
     *  caldera: in-view static demand alone neared the cap and eruption
     *  movers evicted the terrain glow — the original 'strange lights' bug
     *  reborn as a class war.) */
    maxLights: 128,
    /** THE SHARE LAW: per-class caps on the MOVER classes so no burst can
     *  flood the budget and starve everything after it in collect order —
     *  an eruption's orb volley keeps its own lane, the lava sea keeps its
     *  glow. Unshared classes (the hero's lantern, lightwells, exits,
     *  encounter fields) are few by construction. Flashes fill newest-first
     *  (the fresh explosion wins its lane, not the dying ember). */
    share: { flashes: 14, projectiles: 18, bodies: 26, orbs: 10 },
    /** Static doodad emissives collapse into per-zone cluster aggregates
     *  (bin size below, world units) — dense lava fields stop fighting the
     *  cap and the lit set stops reshuffling as the camera pans. Should the
     *  in-view cluster set STILL outgrow the room left after movers, the
     *  drop is deterministic and stable: farthest from the bin-quantized
     *  view centre first (the kept set changes only at bin crossings —
     *  never a per-frame reshuffle). */
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
    /** OPEN ENCOUNTER FIELDS (breach rings): the tear's own unlight — one
     *  center glow per open/collapsing field (lord-tinted) and a stronger
     *  candle on a standing court door. Radius caps keep a 600px cataclysm
     *  from becoming a searchlight. */
    encounter: { radiusCap: 250, intensity: 0.3, doorRadius: 130, doorIntensity: 0.5 },
  },

  /** Projectiles + impact flashes. */
  fx: {
    glowScale: 2.6,
    glowAlpha: 0.55,
    streakLen: 3.6,
    streakAlpha: 0.4,
    coreAlpha: 0.85,
    flashRimAlpha: 0.7,
    /** FEAR GLYPH (the harrowing ladder): quiver ticks over a harrowed
     *  body's crown (count = stacks) and the trembling ring on a broken
     *  nerve (horrified) — dread reads at a glance, before the rout. */
    fearQuiverColor: '#b8a4d8',
    fearPanicColor: '#d8c8f0',
    fearGlyphAlpha: 0.75,
    /** EVENT ZONE WASH (world/zoneWash.ts): seconds for a full 0→1 swing of
     *  the displayed wash — settles / lifts / zone hops seep, never pop. */
    zoneWashFadeSec: 2.5,
    /** Safety ceiling on any zone wash's alpha — no event whites out the field. */
    zoneWashMaxAlpha: 0.3,
  },

  /** THE SPARED-BURST CUE (renderer.drawDeathBursts): a death-burst spares its
   *  own team (world.isBurstTarget), so a burst that cannot touch ANY hero this
   *  screen draws for (the couchHeroes roster — controlled bodies, so the
   *  possession seam reads honestly) softens its danger ring + arming blink:
   *  dashed, at a fraction of the hostile alpha/width. COLOUR never changes —
   *  the hue is the damage-type read — and the body cues (motes, core, orb)
   *  stay full, so the burst remains legible as a thing in the world; only the
   *  "leave this circle" command stands down. A hostile-or-unknown team draws
   *  byte-identical to the classic ring (snapshot-fed co-op client rows carry
   *  no team on the wire — full strength, the conservative read). */
  deathBurst: {
    /** Alpha multiplier on the spared ring + blink strokes. */
    sparedAlpha: 0.45,
    /** LineWidth multiplier on the spared ring + blink strokes. */
    sparedWidth: 0.65,
    /** Dash pattern (px on/off, world units) of the spared strokes — the
     *  at-a-glance "not for you" read that survives any ring colour. */
    sparedDash: [5, 6],
  },

  /** ENCOUNTER FIELDS (renderer.drawEncounters) — the breach ring's whole
   *  look grammar: the veiled-knot shimmer beyond the rim, the rim's crackle
   *  ticks and orbiting edge motes, and the collapse styling. Colors come
   *  from the DEF + the rolled court lord ('@event' doctrine); these are the
   *  global shape/budget dials. */
  encounterField: {
    /** How far past the rim veiled knots shimmer (px) — the parallel shore
     *  glimpsed, never mapped. */
    previewBand: 150,
    /** Shimmer ghost: peak alpha + half-size (px) of the flickering mote. */
    shimmerAlpha: 0.5,
    shimmerSize: 3.2,
    /** Rim motes: one per this many px of circumference, capped; px size. */
    edgeMoteSpacing: 68,
    edgeMoteMax: 26,
    edgeMoteSize: 2.4,
    /** Rim crackle: one radial tick per this many px of circumference,
     *  capped; tick length px. */
    crackleSpacing: 130,
    crackleMax: 16,
    crackleLen: 11,
    /** The soft outer glow stroke under the crisp rim (px width, alpha). */
    glowWidth: 10,
    glowAlpha: 0.2,
    /** Collapse: interior wash climbs to this alpha as the rim comes home,
     *  and rim motes orbit this much faster. */
    collapseWashAlpha: 0.22,
    collapseMoteHzMul: 2.6,
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

  /** Weather particles + THE ANCHORED SKY (vis/weatherFx.ts). */
  weather: {
    maxParticles: 150,
    /** Default crossfade seconds for a full 0→1 weather swing — each kind
     *  may override via WEATHER_FX.fadeIn (a storm can SLAM by design). */
    fadeSec: 5,
    /** THE ANCHORED SKY: the front's node-space footprint (the SAME pos +
     *  radius the engine's rim-falloff sample scores — event pins carry
     *  their own via EventFrontPin.pos/radius) projected into the zone, so
     *  the wash + veil hang over the WORLD and the particle sheets counter-
     *  ride the camera. Status overlays stay screen-anchored by law — they
     *  happen TO the player. */
    anchor: {
      /** World px per node-space unit for point-node zones (FIELD mega-zones
       *  project through their own authored ZoneDef.field mapping instead).
       *  Sets how fast a front's drift SWEEPS the in-zone gradient and how
       *  much of its rim one screen shows. */
      nodeScale: 44,
      /** Ease seconds (exp time-constant) for the projected focus/rim — a
       *  front handoff (two storms trading "strongest") sweeps the drawn
       *  field across, never snaps it. */
      easeSec: 2.5,
      /** Projected footprint floor (world px): a degenerate pin still reads
       *  as standing air, never a spotlight. */
      minR: 1200,
      /** Default particle-sheet parallax (per-kind override on
       *  WeatherFxDef.parallax): 1 = fixed in the world — the rain is air
       *  you move through; 0 = the legacy view-glued sheet. */
      parallax: 1,
    },
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
    /** THE ENTRY SLICE (2026-08-02): per-frame ms budget for the headless
     *  aerial PaintJob (mint + paint used to land whole on the entry frame
     *  of every below-tied zone). At least one step always advances (the
     *  ground bakeBudgetMs law); the indivisible generateLayout mint rides
     *  that allowance on its own non-entry frame. The cloud sea stands in
     *  until the finished aerial swaps in whole. */
    paintBudgetMs: 3,
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
   *  desaturation + a pale edge wash, beatless on purpose), the DARKEN
   *  (blind — the room closing in), and THE FALTER (below). */
  statusFx: {
    pallDesat: 0.5, pallWash: '#e8e0ec', pallAlpha: 0.34,
    darkenFloor: 0.78,
    /** The pall's DESATURATE half rides a non-separable blend ('saturation')
     *  — GPU-free on some engines, a full-surface software fallback on
     *  others (the Firefox cliff). 'auto' asks the canvasCaps probe (both
     *  the relative verdict AND the per-frame budget at the live canvas
     *  size) and keeps the grey-out only where it measures cheap; the baked
     *  pale wash (always drawn) carries the read where it doesn't.
     *  'on'/'off' pin it. */
    desatMode: 'auto' as 'auto' | 'on' | 'off',
    /** THE FALTER — the DELIBERATE stutter (see docs/render/falter.md).
     *  While a falter-bearing status (ScreenFxDef.falter — faintness, the
     *  swoon) rides the local hero, the renderer HOLDS the presented frame
     *  on a jittered cadence: a fake, bounded lag spike, the vasovagal
     *  skip. INTENDED BEHAVIOR, not a defect — players are MEANT to worry
     *  their game is stuttering while light-headed. Presentation-only by
     *  construction: the sim, inputs and the co-op wire never falter, and
     *  settings.statusFalter is the player's off switch.
     *  periodSec/holdMs lerp [at-strength-0 → at-strength-1]; jitter is a
     *  ± fraction on each period roll; firstDelaySec lands the first hitch
     *  just after the status blooms (the "did my game just—?" beat). */
    falter: {
      periodSec: [2.4, 0.8] as [number, number],
      holdMs: [70, 240] as [number, number],
      jitter: 0.4,
      firstDelaySec: 0.3,
    },
  },

  /** CANVAS CAPABILITY PROBE (vis/canvasCaps.ts): one-time micro-timings of
   *  the canvas features that differ WILDLY between engines. A feature is
   *  "slow here" when its per-op time exceeds baseline × slowFactor
   *  (RELATIVE — the software-fallback detector), or when its extra cost
   *  over a plain fill, scaled to the caller's declared per-frame surface,
   *  exceeds budgetMs (ABSOLUTE — a "merely 2×" blend is still refused
   *  once the canvas is big enough to turn it into a real frame tax). */
  caps: {
    /** Probe surface + reps are sized so the FEATURE's work dominates the
     *  one forced flush: a GPU-class readback costs ~1ms of fixed sync
     *  regardless of what was drawn, so at a small surface × few reps both
     *  probes read as pure sync and every verdict flattens to "fast"
     *  (measured: 192²×6 hid a 15× blend behind identical 0.167ms reads).
     *  256²×24 puts a genuinely slow blend at ~8ms of real work against
     *  ~1ms of sync — the ratio survives the noise — while the whole
     *  lazy probe stays a once-per-session ~12ms. */
    probeSize: 256,
    probeReps: 24,
    slowFactorDefault: 6,
    /** Per-probe overrides ({ blendSaturation: 4 } tightens that verdict). */
    slowFactor: {} as Record<string, number>,
    /** Per-frame ms a full-surface decorative feature may cost before the
     *  verdict refuses it (the pall's desat asks with the canvas area). */
    budgetMsDefault: 2,
    /** Per-probe budget overrides, same shape as slowFactor. */
    budgetMs: {} as Record<string, number>,
  },

  /** EDGE OVERLAYS (vis/overlays.ts): the baked full-screen wash family
   *  (status vignettes, pall wash, blind iris, frost rim, low-life seep,
   *  spore bloom). bakeH: bake sprite height (radial falloffs are
   *  resolution-free — the stretch is pixel-equivalent to a direct fill);
   *  aspectQ: frame-shape buckets per unit aspect; quantum / colorQuantum:
   *  key grain for MOVING shape params and blended colours (the LRU absorbs
   *  the steps a heartbeat or ladder sweeps through). */
  overlays: {
    bakeH: 180,
    aspectQ: 8,
    quantum: 0.02,
    colorQuantum: 12,
  },

  /** THE CACHE STEWARD's dials (vis/caches.ts — policy sits with each
   *  cache; these are the shared levers). spriteFloorOnSwap: entries the
   *  shared bake LRU keeps across a zone swap (the biome-agnostic working
   *  set: primitives, HUD, the party — everything else re-bakes on sight);
   *  membranes/billows are zone-flavoured and clear wholesale. */
  memory: {
    spriteFloorOnSwap: 512,
    creepClearOnSwap: true,
    billowClearOnSwap: true,
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
    /** THE CONTRAST GUARD. Every tone below is DERIVED from theme.floor and
     *  theme.border by a DIFFERENT recipe, so what collapses a rim is not
     *  the two theme colors sitting close (they never do — the tightest
     *  floor/border gap shipping is 0.110) but WHERE the pair sits: near the
     *  ink the skirt and its seat drop into the dark they were drawn to
     *  describe, and on a pale floor the lit crest vanishes into its own
     *  ground. The Aetherial's cloud country was the witness — on
     *  aether_cathedral the crest and the skirt earth differed by 0.0006
     *  luminance, an invisible hairline. minGap is the
     *  luminance distance a derived tone must clear from what it sits on;
     *  margin overshoots it by that fraction so a guarded tone reads past
     *  the line, not on it. A tone already clear is returned UNTOUCHED —
     *  themes that read fine today are byte-identical. MEASURED over the 104
     *  themes carrying one (balance/probe_voidframe.ts): 0.06 moves 15 — the
     *  twelve pale Aetherial crests, two invisible skirts (descent 0.037,
     *  abyssal_rift 0.054) and one seat. This is a SAFETY NET for reads that
     *  have collapsed, not a restyle: ground.ts's 0.09 (tuned for midtone
     *  walls on midtone floors) moves 49 of 104 here, because the void
     *  frame's whole palette lives near black where an absolute linear gap
     *  bites everything. Raising it past ~0.148 is the real ceiling — beyond
     *  that the seat's dark direction runs out of room and flips light,
     *  brightening the one tone that exists to be dark. */
    contrast: { minGap: 0.06, margin: 0.25 },
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

  /** THE INFO FEEDS (world/bulletins.ts owns the model laws + the player's
   *  dials; these are the PIXELS). Both draw inside the ui-scale pass, on
   *  the canvas — which composites BELOW every DOM panel by construction,
   *  so an open inventory always covers the pickup ledger, never the
   *  reverse (the layering law the feature was asked with). */
  infoFeeds: {
    /** The world-news stack: edge pads per anchor + the line gap. maxRows
     *  bounds a bulletin storm to a readable column. */
    notice: { topPad: 64, bottomPad: 96, sidePad: 18, rowGap: 4, maxRows: 8 },
    /** The right-flank pickup ledger ("Warcry (Common) x1") — seated over
     *  the ground the inventory panel opens onto. */
    pickup: { rightPad: 14, topFrac: 0.34, rowH: 17, font: 12, maxRows: 10 },
  },

  /** THE WARN VOICE (engine/tracks.ts TrackRiderDef.warnStyle — the track
   *  telegraph's 'traffic' costume, worn by riders that share the road
   *  rather than sweep it: the field wain). Scales on the threat arc's own
   *  surface-derived width and distance-fade curve, so a bigger cart still
   *  posts a proportionally wider path and the stroke still fades with
   *  distance (direction stays readable) — it just stops SHOUTING. The
   *  'threat' voice has no dials on purpose: it is today's bytes, and
   *  tuning it lives where it always did (the arc literals + rider color).
   *  The rake pulse is structural, not a dial — a traffic rake never
   *  pulses (trackLayer.ts). */
  trackWarnVoice: {
    traffic: {
      /** Multiplier on each arc step's fade alpha (threat peak 0.34 →
       *  traffic peak ≈ 0.12 — "far more transparent", the ruling's word). */
      alphaScale: 0.35,
      /** Multiplier on the surface-derived band width (the wain's 38px
       *  kill-zone band thins to a ~17px wheel-line under its 48px body). */
      widthScale: 0.45,
    },
  },

  /** THE SURVIVAL VEIL (renderer.drawSurvivalVignette): the generic screen
   *  wash any SURVIVAL_RESOURCES row may wear as its meter drains. The ROW
   *  carries identity (colours, engagement line, peak depth —
   *  SurvivalVignetteSpec in world/regions.ts); THIS block is the grammar
   *  every row shares — the closing-in geometry, the last-gasp squeeze, the
   *  underflow deepening. Breath debuts it: the screen turns blue as air
   *  runs out. Screen-anchored BY LAW like every status overlay (the
   *  anchored sky's explicit exemption, `veil.anchor: 'view'` — asphyxiation
   *  happens TO the player, not to a place); rides the baked edge-overlay
   *  fabric like the low-life seep, and draws UNDER the HUD for the same
   *  reason — the meters must stay readable through the state they warn of.
   *  (The Gloaming/descent's closing eye — gloamVignette,
   *  drawDarknessVignette — is a separate hero-centred fabric describing the
   *  WORLD's darkness; unifying the two is a deliberate future pass.) */
  survivalVignette: {
    /** Clear-centre radius (× the screen's short side): where the wash sits
     *  at the row's startFrac (kissing the corners) → at an empty meter
     *  (crept well in — the closing-in grammar). */
    innerFrom: 0.55,
    innerTo: 0.2,
    /** Severity exponent over the sub-start range: >1 keeps the first
     *  stretch a hint and the last third urgent. */
    curve: 1.25,
    /** Steady alpha at the engagement line (ramps to the row's maxAlpha). */
    alphaFloor: 0.05,
    /** The bright band's position along the gradient run (0 = clear-centre
     *  edge … 1 = screen corner) and its alpha share of the rim's — HIGH on
     *  purpose: the band is what makes the screen read as TURNING the row's
     *  colour (eyeballed against deepsea's own blue-dark water, where a
     *  timid band vanishes into the biome). */
    midStop: 0.5,
    midAlpha: 0.75,
    /** THE LAST-GASP SQUEEZE: below this meter fraction a slow smooth swell
     *  presses the veil inward and flushes it (drowning CLENCHES — only
     *  hearts lub-dub), quickening periodFrom → periodTo as the meter runs
     *  out. At a full swell: extra alpha (× the steady level), inward press
     *  (× the screen's short side), colour lerp toward the row's flush.
     *  Settings.lowLifePulse gates it (the one screen-pulse switch); the
     *  steady veil is INFORMATION and always draws. */
    pulse: { startFrac: 0.25, periodFrom: 2.4, periodTo: 1.1, alphaBoost: 0.35, reach: 0.06, flushMix: 0.35 },
    /** THE DROWNING RAMP MADE VISIBLE: while the meter runs EMPTY the veil
     *  keeps deepening on the row's OWN underflow-ramp clock
     *  (Actor.underflowSince → underflowRampSecs — the same ramp the damage
     *  rides, so drawn == suffered): extra inward press + a rising flush
     *  lean over the ramp's seconds. Both flushMixes are LEANS by design —
     *  measured 0.5+ turns the terminal seconds into a pale whiteout that
     *  reads as fog and drowns the HUD's own words; the dread must stay
     *  BLUE to the end. */
    underflow: { reach: 0.1, flushMix: 0.22 },
  },

  /** THE EFFECT VOICE (render/vis/effectVoice.ts — the kind→painter registry
   *  for flash moments; `fx` keys on data rows pick a voice, unkeyed rows
   *  keep the generic ring, 'bolt' stays the lightning flags' own). Each
   *  debut voice's dials live here so the whole vocabulary retunes without
   *  touching draw code. */
  effectVoice: {
    /** 'blast' — the mortar landing: core-flash + smoke ring + debris. */
    blast: {
      /** Painter reach as a fraction of the flash's stamped radius. */
      scale: 1.15,
      /** Debris chips per burst (seeded — same chips every frame). */
      debris: 7,
      /** Peak alpha of the sooty smoke ring (rises as the flash dies). */
      smokeAlpha: 0.5,
    },
    /** 'sporeburst' — the pod's soft pop: tinted veil + drifting motes. */
    sporeburst: {
      scale: 0.85,
      /** Drifting spore motes per pop. */
      motes: 9,
      /** Peak alpha of the central veil (a breath, not a blast). */
      veilAlpha: 0.34,
      /** How far motes rise (px) across the drift — spores are light. */
      lift: 9,
    },
    /** 'scramble' — the treed critter's exit: leaf/dust flecks, tiny. */
    scramble: {
      /** Hard cap on the painter's reach (px) — slipAway stamps a 60px
       *  flash; the climb's weight is a squirrel's, so the voice stays
       *  small no matter what radius the flash arrives wearing. */
      maxRadius: 26,
      /** Flicked flecks per exit. */
      flecks: 6,
    },
    /** 'comet' — a falling body's landing (icy comet, starfall shard):
     *  trail + cold bloom + glints, all off the flash's own tint. */
    comet: {
      scale: 1.0,
      /** Sky height (px) the trail plunges from. */
      height: 460,
      /** Max sideways lean of the fall line (fraction of height; seeded
       *  per strike so a shower never rains identical copies). */
      lean: 0.28,
      /** Flecks shed along the dissolving trail. */
      sparks: 6,
      /** Crystalline ticks radiating from the impact. */
      glints: 7,
    },
    /** 'shatter' — stone breaking (the petrified tree): crack star +
     *  spinning facet chips + settling dust; no gas, no hot core. */
    shatter: {
      scale: 1.0,
      /** Facet chips per break (seeded — same flight every frame). */
      chips: 8,
      /** How far chips sag under gravity (px) across their flight. */
      droop: 9,
      /** Peak alpha of the low settling dust breath. */
      dustAlpha: 0.3,
    },
    /** 'plunge' — a small body entering water (the reed frog's dive):
     *  ripples + thrown droplets, pond-toned, capped tiny. */
    plunge: {
      /** Hard cap on the painter's reach (px) — the scramble law: the
       *  moment's weight is a frog's, whatever the flash stamps. */
      maxRadius: 22,
      /** Droplets thrown up by the entry. */
      drops: 5,
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
