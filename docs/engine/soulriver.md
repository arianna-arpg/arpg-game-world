# The River of Souls (`world/soulriver.ts` + the `soulriver` recipe)

The underworld's ferry hub: ONE mint-once MEGAZONE (`soul_river`, the
`uw_gate` stable-id idiom) seated a hashed reach off the Hellgate, carved
whole by the `soulriver` layout recipe — a serpentine channel of SOUL-WATER
crossing the arena west → east, a DOCK at every meander apex, worn towpaths
down both banks — and THE PALE FERRY: a carrier rider on the track fabric
that puts out from the headwaters, pauses at every pier, frays over the last
reach, and dissolves at the far strand, reborn at the head on the pure clock.
Every dock is an ordinary zone EXIT whose frontier PROMISES a different
country of the realm, so the river is the deep's own index — the Fields hub
law, below ground.

## The Foreordained Tenet, again

Everything is a pure function of the seed, computed whole at first touch,
never persisted (the seas doctrine):

- **The seat** — `riverSeat(gate, fieldSeed)`: a hashed heading + reach off
  the dimension gate (`SOULRIVER_CFG.seat`). `chartFrontier` funnels any
  underworld frontier landing in the catch basin to the same shore
  (mint-once; later finds `linkBackTo` — the field-region law dimensioned).
- **The plan** — `soulriverPlan(seed, w, h, biomes)`: channel polyline
  (half-integer serpentine, so head and terminus meet their edges square),
  half-width, and the DOCK stations — headwater (west), one per apex
  (alternating south/north), terminus (east) — each with its apron, pier,
  exit side/`at`, and dealt COUNTRY. The mint hook (`soulriverifyZone`),
  the layout recipe, and the probes all call the same function; nothing is
  stored, so nothing can disagree. The country deal is stamped onto
  `layoutParams.dockBiomes` so a saved river keeps its promised shores.
- **The lane** — `ferryLaneFor(plan)`: a `once`+`rearm` TrackSpec down the
  whole channel — boarding hold at the head, a pause at every pier, an
  alighting pause at the terminus, then the cradle rest (the dissolved
  window). `SOULRIVER_CFG.ferry.count` ferries ride a phase apart, so a
  missed boat is never a full cycle's wait.

## THE DECK LAW (`TrackRiderDef.carry`)

The first CARRIER rider: a track rider whose rect surface is moving FOOTING,
not a hazard. `World.updateCarriers` (just before the latch/grab seat
slaves) moves every grounded body standing on the boards by the rider's own
rigid step — `pose(t) ∘ pose(t−dt)⁻¹` applied to the body, so a turning
deck swings its passengers with the bow, and the summed steps telescope to
the pose difference regardless of frame slicing (stateless, clock-pure:
seats, resumes and replays agree by construction). Each step lands through
the swept `clampPos` (the undertow idiom) — carried bodies stay physical.
Spares: dead, `flying`/`leap` (you cannot ride boards you float above),
`clingTo`/`heldBy` (their seats are slaved elsewhere and win the frame).

A carry rider with an empty payload is a pure platform (the validator
waiver); payload rows still land as usual for a deck that also bites. The
harmless lane telegraphs nothing (warn arcs and the rake already gate on
harmful payloads). `TrackRiderDef.fadeTail` frays the DRAWN hull over the
last fraction of the ARC (`trackArcFrac` — distance-measured, so dock
pauses never advance it); the surface stays honest to the last pixel, and
the rest-edge burst fires at the strand: the implicit "end of the route"
read. The ferry cannot be destroyed because there is nothing to destroy —
a rider is a pose, not a body.

## The water, the current, the mist

- **`soul_water`** (region + liquid + visuals row): true water in every
  mechanical respect — wade, swim, douse — but it MIRRORS, glows from
  beneath (heart wells), and the AI prices it steeply (`pathCost 2.3`), so
  the living keep to banks, piers, and the boards.
- **`soul_current`** (`data/creeps.ts`): the vessel bore with the NEW
  `FrontFlowSpec.channel` window — steering, confinement and spawn snap-in
  read `groundKindAt ∈ channel` instead of `openAt`, so the surge follows
  its own WATER between fully open banks (no walls needed) and its grip
  stops at the waterline. Drag asks every living body DOWNSTREAM
  (weight-scaled); the riverbound are waived and SURF the crests
  (`lorn_shade` riders). Legacy rows without `channel` are byte-identical
  (probe_front's fingerprint pins it).
- **`soul_mist`** (`data/fog.ts`): pools on the funerary furniture
  (spirit gates, piers, cairns, rafts, statues) and feeds the riverbound —
  and because the terminus strand stands the DENSEST dress (the recipe's
  gradient), the fog thickens exactly where the ferry frays.

## THE HUNGER (`World.updateSoulriver`)

While any living player rides mid-journey, souls conjure from the pale
water around the boards — pre-roused, capped live, the cap breathing with
`trackArcFrac` (deeper water, hungrier dead: `assault.escalate`), heavier
company past the midway (haulers, then banshees), and a lull at every pier
(dock pauses are breathers). Spawns are ordinary actors: xp, loot,
bestiary, nemesis names, the current's crest seats all treat them as
citizens. The drowned hauler's `gaff_cast` DRAGS a passenger off the
boards into the water — the grab fabric's drag verb, drowned.

## The Riverbound (faction `riverbound`)

Coin-eyed and gauze-hung — the family grammar at a glance is two NEW part
painters: **obolEyes** (currency for a face; deliberately the anti-`eyes`:
no glow, one metal glint) and **soulGauze** (one loose whole-body veil that
never settles — distinct from veilSashes' ribbons and shroudWrap's bands).
`lorn_shade` (bread kin, drinks with `essence_drain`, surfs the current),
`drowned_hauler` (the gaff over the gunwale), `soul_wellspring` (a colony
anchor breathing `soul_mote`s back to cap — extinguish the spring and that
bank stays quiet; its `vent_souls` pours the pool mid-fight), `soul_mote`
(the lite tier's wading-through shimmer, one ply), `farshore_warden` (the
terminus keeper: shriek, soul volley, and the water's own passengers).
Graveyard guests (gloomling, poltergeist, banshee, barrow wight) fill the
banks — leverage before invention.

## Dials

`SOULRIVER_CFG` (seat / plan / ferry / assault) in `world/soulriver.ts`;
the tileset (`river_of_souls`, biome `soulway`, `frontier:false`,
`realm:'underworld'`, `perfProbe`) owns dress, packs, fog, current lanes
and the lite pours; `TRACK_CFG` unchanged. The Stygian Verdigris variant
turns the palette green (the variant `theme` lever) — the well of souls'
other face.

## Probes

`balance/probe_soulriver.ts` (52 checks): plan purity + station laws +
the deal, seat laws, lane schedule + the rearm cycle + arc-frac, THE DECK
LAW live (rigid seats through bends, paused-deck stillness, off-board
release, the aloft spare, byte-determinism of carried positions), dockify
(exits rewritten, real edges kept, promised tilesets resolving), and the
channel window (turns with the water across open banks; confined undertow;
the riverbound waived). `probe_front` pins legacy creep byte-identity;
`probe_tracks`, `probe_bore`, `probe_anatomy`, `probe_lite`, `probe_swarm`
stand unregressed beside it; genqa sweeps both river faces.
