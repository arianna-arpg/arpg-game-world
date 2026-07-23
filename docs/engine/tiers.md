# THE TIER FABRIC — extra walkable layers in the same zone

True verticality without a second zone: the REGION MAP declares the layers.
`RegionKind.tier: k` = floor on the k-th story (composes with `walkable`,
the tier-0 truth): `{walkable:false, tier:1}` is a butte top or a duct under
a building — wall to one layer, ground to the other; `{walkable:true,
tier:1}` is a bridge deck or a duct under a street — ONE CELL, TWO FLOORS;
`{walkable:false, tier:3}` is a switchback terrace three stories up — a
TRUE WALL to every story beneath it. `tierLink` rows (ramps, culvert wells,
the stepped switchbacks) are the crossings — floor on BOTH tiers of their
SPAN. The span DERIVES (`linkSpanOf`): a walkable link touches the ground
floor ([0, tier]), an elevated one joins the story below ([tier-1, tier]);
only exotic crossings ever need the explicit `linkTiers` override.
`tierVisual` is the covered layer's own face. Everything derives from the
live region map — no second grid to build, dirty-track or persist (carves
self-heal on every layer by construction; `makeTierView(grid, t)` is a
stateless adapter, one per story, built at zone load from
`ZoneTiers.levels`).

## The law (engine/tiers.ts + the seams in world.ts)
- **Movement**: a body confines against ITS story's floor (the tier swap
  scoped inside `clampPos`, keyed on `opts.mover.tier` — any story picks
  its own view). Crossing rules: the EXIT rule (standing on a link,
  stepping toward ground only the other end of the span owns, flips —
  ramps), and the LADDER TOGGLE (entering a link flips outright to the
  span's other end, latched once per visit — culverts among both-tier
  ducts). Walking never drops off a rim; a SHOVE past one is the RIM
  FALL — land on the HIGHEST floor standing beneath the overshoot,
  staggered ('over the edge!'): knock them off the butte, or send them
  down the mountain one terrace at a time.
- **Combat**: same-tier ONLY, enforced at the ONE hostility gate
  (targeting, swings, threat, projectiles all agree) — except under RIM
  DUELS (below). Flights carry their caster's story and sail over any
  floor AT OR BELOW it (`tierElevOf`: a tier-2 arrow crosses butte tops
  and first benches alike; the next terrace's cliff — and true earth —
  still stop it). World-authored hitAll hazards (sky strikes) stay
  tier-agnostic by design.
- **Sight — THE ELEVATION LAW** (`engine/los.ts` `RayElev`, dials
  `LOS_CFG.elev`): the one occlusion ray travels at a HEIGHT. Sight rays
  lerp eye→eye (`elev.eye` above each endpoint's story); shot rays fly
  FLAT at the caster's story (the flight law, so hold-fire and the arrow
  agree). A blocking cell that is tier FLOOR stops only rays below its
  deck; true walls stop everything; a blocking doodad fills
  `elev.doodadBand` stories above its own `tier`. So a same-deck duel is
  open air (AI perception included — `losCached` passes both tiers), the
  valley sees a rim-stander only once the lerped line clears the lip, and
  deck furniture never shades the street below. Full write-up:
  `docs/engine/los-pathing.md`.
- **Flight — THE TOUCH-DOWN LAW** (`landingTier`): an aloft body keeps its
  last grounded story (a per-wingbeat re-derive would thrash hostility as
  the flock crossed rims); when its wings FOLD (`Actor.touchdown`, stamped
  at the one flying re-derive in actor.ts) the story re-seats from the
  floor under it — kept while it still stands, else the floor's own
  answers (`tierElevOf`; a true wall keeps the story for the mover snap to
  resolve). The latch HOLDS through leap/dash flight — a stoop's wings
  fold mid-dive, but touch-down means feet on ground, so World consumes it
  at the first genuinely grounded tick beside its walk grid. A bench
  condor that stoops onto a valley player LANDS on the valley — the
  grounded punish window plays on its victim's story.
- **Population**: tiered zones seed `packSplit` of their packs on the
  elevated stories, dealt uniformly across the levels (rolled per pack —
  squads never straddle a rim). The BENCH picks the anchor: an elevated
  pack samples its own seat on the layer (the wildlife rig's law — valley
  anchors sit beyond any honest snap radius). Zone memory remembers a
  body's story; the co-op wire carries it (`tr`); monsters stay on their
  layer (the chase ledger walks pursuers through stairs their quarry
  took).
- **Render**: `exposure:'open'` draws every layer (buttes, summits — the
  region visuals + the cliff read carry the height). `'covered'` hides the
  other layer's bodies and, while the local hero is below, dims the scene
  and paints the duct web live from `tierVisual` (renderer.drawTierVeil —
  viewport cells, no bake). The SIGHT VEIL rides the elevation law: the
  hero's story keys its occluder caches (your own deck is clear ground the
  moment you stand on it; the tops stay dark from the valley), and
  per-ACTOR reveals ride the exact ray lerp (`actorShade` passes the
  body's tier) — a rim archer reads as a lit body over conservative
  ground-dark. Pixels under-promise the ray, never over-promise.

## The drawn reads (RegionVisualSpec, baked in render/vis/ground.ts)
- **`steps`** — THE STEPPED WAY: carved stair treads across a link/deck
  cell, world-aligned (the stair climbs unbroken over cell and chunk
  seams), laid PERPENDICULAR to the ascent — the baker derives uphill from
  the neighboring floors' tier elevations. A flat run (a rope span) falls
  back to its own long axis, so the same flag lays bridge PLANKS. Flank
  rails shade the sides the way is cut through (higher rock) and lip the
  sides it hangs over (open drops). Colors ramp from the row's own fill —
  the stair is the ground's stone, worked. Wearers: `tier_ramp`,
  `butte_span`, `tor_mouth`, every `peak_ramp_k`.
- **`cliff`** — THE CLIFF READ (opt-in): rims facing LOWER floors cast an
  elevation shadow onto the ground below (deeper for taller drops, the
  south throw longest) plus a crevice seam, and the boundary `edge` learns
  TIER HONESTY: sides meeting a floor of the row's own story (a ramp, a
  span, the same bench) sit FLUSH — the way up reads hewn from the rock,
  never pasted on it. Opt-in because covered layers (tor galleries, ducts)
  must keep their surface faces unbroken — a shadow would leak the secret.
  Wearers: `butte_top`, every `peak_terrace_k`.

## The debuts
- **'needles'** (engine/tiers.ts recipe; tileset `needles`, biome
  butteland): butte masses (kind `butte` → region `butte_top`), one ramp
  cut per rim, rope spans strung between neighboring summits
  (`butte_span` — the valley walks under, the deck walks over), open
  exposure, rim duels. Thousand Needles / Devil's Tower.
- **'switchback'** (the multi-story debut; tileset `pinnacle`, biome
  highland above the crowns): the whole zone is ONE mountain — concentric
  terrace rings (`peak_terrace_1..k`, full cones mid-zone or half-cones
  set against an arena edge) climbing to a summit plateau, every rim cut
  by ONE stepped way (`peak_ramp_k`) swung a switchback's walk around the
  face from the last. Wobbled rims keep the cones honest country; the
  seat and radius are BUDGETED against every portal (margin scales with
  the arena; a rolled arc that can't stand tries the other before giving
  up honestly — `def.tiers` cleared, attempt-honest). Benches grow their
  own kit and the crown keeps a visible cache (`layTierKit` stamps each
  piece to its story); packs and wildlife seat per story. Dials:
  `TIER_CFG.switchback` — every one a layoutParam (`peakLevels`,
  `peakArc: 'full'|'half'|'auto'`, `peakBandW`, `peakRadius`, `peakSwing`,
  `peakPortalMargin`, `peakRampHalfW`, `tierKit`, `peakKit`,
  `tierPackSplit`, `rimDuels`).
- **The warrens' drains** (`carveSewerTier`, dialed by `sewerTier` on the
  district recipe): culvert wells on the lanes, duct legs under streets
  (`sewer_duct`) and under blocks (`sewer_under_wall`), covered exposure.
  Orphan-proof: a leg lays only where every cell is duct-able. The street
  grates still mint the DEEP sewerworks below both layers.

## Rim duels (ZoneTiers.rimDuels)
Open-exposure zones may allow cross-tier hostility — SIGHT mediates
instead (cliff rows' blocksSight confines the fights to rims, stairs and
spans, which is the fantasy: arrows traded across the benches while the
shove settles arguments the long way down). Covered zones must never set
it (a ceiling is not a vantage). THE ELEVATION LAW is the referee's
honesty: same-deck fights are open air, a rim-stander is seen from the
valley exactly when the lerped eye line clears the lip, and the deck
archer's story-1 arrows rain down while story-0 answers die on the cliff
— climb, span, or shove.

## The seam this opens (deliberate future work)
Townhouse floors as covered tiers in one zone; tier-aware minimap tint; AI
that climbs links; a boulder-chute lane rolling DOWN the switchbacks;
per-story spawn tables (harder kin near the crown); avalanche fronts that
respect the benches (creep is tier-blind today — the one reason the
pinnacle ships without landslide lanes).

Probe: `balance/probe_tiers.ts` (family rows + span derivation, the
crossing law across arbitrary spans, all three carves, per-story orphan
BFS, THE ASCENT LAW — entry → summit on foot — and determinism). genqa
sweeps needles + tiered warrens + the pinnacle automatically.
