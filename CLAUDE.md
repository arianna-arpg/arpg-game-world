# CLAUDE.md — Hollow Wake (ARPG)

Guidance for Claude Code working in this repository. This file is committed and
shared with everyone who clones the repo.

## What this is
A top-down action RPG prototype in TypeScript + Vite, rendered on HTML5 Canvas
2D. Design thesis: every system is open, modular **data** — skills, monsters,
statuses, passives, zones are plain data entries composed by one shared engine,
and the player, monsters, and minions all act through a single skill pipeline
(`World.useSkill()` in `src/engine/world.ts`).

## Commands
- `npm install` — first-time setup (also run automatically by the .bat launchers).
- `npm run dev` — Vite dev server at http://localhost:5173 (browser dev mode, `Play Game.bat`).
- `npm run game` — the DESKTOP APP: Electron launcher window (shows installed
  version, checks the GitHub remote for updates, one-click pull → install →
  build) then the game in its own window. `Launch Game.bat` is the double-click
  wrapper; `npm run game:play` skips the launcher.
- `npx tsc --noEmit` — fast type-check with no output. Primary correctness gate.
- `npm run check` — type-checks the game AND the launcher (`tsconfig.launcher.json`
  runs strict checkJs over `launcher/*.cjs`).
- `npm run build` — `tsc --noEmit && vite build` (type-check + production build to `dist/`).
- `npm run smoke` / `npm run smoke:launcher` — headless Electron self-checks:
  boot the real game window (or launcher), assert `__game` / start menu /
  `/__save` endpoint (or the IPC status round-trip), print `SMOKE … OK`, exit
  0/1. Run these after touching `launcher/` or anything boot-related.
- `npm run perf` — the PERFORMANCE HARNESS: boots the real desktop game
  (visible window — true compositor pacing), starts a run, mints one zone per
  frontier tileset through the real mint path — plus every non-frontier
  tileset opted in via `TilesetDef.perfProbe` (caves, minted interiors) — and
  walks each under real rAF while sampling frame telemetry (rAF-gap
  p50/p95/p99, hitch counts, sim-vs-render split, entry burst), gating
  against `balance/perf.config.json` — each zone judged RELATIVE to the same
  run's town control plus absolute hitch backstops. Exit 2 on breach; per-run
  reports in `balance/reports/`. Mints are seeded by FULL-matrix index, so
  `--filter` runs reproduce the full sweep's zones; `mintPins` can pin a
  tileset's variant/layout/seed to gate its committed worst case. Flags:
  `-- --filter=mire --seconds=8` (forensics: `--weather/--ablate/--variant/
  --layout/--seed` print the verdict but never exit 2). Run after
  render/engine perf work or when a biome feels stuttery — the sweep derives
  its matrix from the tileset registry, so new biomes join automatically.
- `npm run sim -- …` — the BALANCE HARNESS: the real engine headless and
  deterministic (seeded), running scenario suites over reference builds.
  `run --suite smoke` after any `src/data/` change; `sweep skills` ranks every
  attack/spell skill at equal investment; `sweep supports` is the SKILL ×
  SUPPORT NO-OP MATRIX (census through the real socket gate + same-seed A/B
  probes — byte-identical fingerprint = definitive INERT; run a
  `--support <gem>` slice after any supports.ts change); `sweep progression
  --geared` prints the per-class power curve with the gear-value column;
  `audit affixes` / `audit drops` are the ECONOMY AUDITS (dead-affix +
  dead-stat detectors, loot yields vs DROP_CFG); `baseline check --suite
  smoke` is the regression gate (exit 2 on breach). Docs:
  `docs/balance/README.md` (framework + metrics glossary) and
  `docs/balance/AGENT_PLAYBOOK.md` (the contract for agent-driven mass
  balance passes, incl. run/follow-up recipes for the matrix + economy
  passes). Type-checked by `tsconfig.sim.json` inside `npm run check`.
- `npm run genqa` — the GENERATION QA HARNESS: generateLayout headless over
  the whole authored matrix (every tileset + variant with its rolls, every
  registered layout generator — interiors also at cave scale — and every
  composition forced at chance 1) × several seeds, asserting the generation
  invariants (registry refs incl. composition sites/rolls, determinism,
  inverse forbidOn, portal clears, caveSeeds zip, grid reachability,
  door-sides sanity, fuse contiguity). Exit 2 on breach — run after any
  levelgen/tileset/formation/composition/landmark change.
  Flags: `-- --seeds 5 --filter mire --verbose`.
- `npm run preview` — serve the built `dist/`.

No unit-test runner is configured; `tsc --noEmit`, the smoke checks, the
balance harness's smoke suite, and the generation QA sweep are how we verify
changes.

## Layout
- `src/engine/` — systems: `world.ts` (core loop, `useSkill`), `stats.ts`
  (layered modifier engine), `damage.ts`, `status.ts`, `skills.ts` (skill
  schema), `actor.ts` (one entity model for player/monsters/minions),
  `ai.ts` + `brain.ts` (composable enemy AI; THE FLOCKING FABRIC —
  `BehaviorSpec.flock` murmuration steering at the steerMove gate,
  `StatusDef.flight` aloft states riding `Actor.flying`,
  `LeapDelivery.telegraph` honest dive rings, `MonsterDef.packSize`
  natural group sizing, `engine/flight.ts` = the ONE weave/erratic math
  shared with projectiles — docs in `docs/engine/flocking.md`),
  `los.ts` (THE occlusion
  raycast: one shot/sight ray over doodads + grid regions, `LOS_CFG`
  delivery defaults, the `phasing` stat lever; AI pathing rides
  `World.pathField()`; its DRAWN half is THE SIGHT VEIL —
  `render/vis/sightVeil.ts` positional occlusion shadows from wall cells
  + solid trunks, `VIS_CFG.sightVeil` + `ZoneTheme.sightVeil` +
  `DoodadRule.sightShadow` levers — docs in `docs/engine/los-pathing.md`),
  `shapes.ts` + `projForms.ts` (the HIT-SURFACE fabric: doodad collision
  shapes as data via `hitSurfaceOf`, projectile drawn-form hit tests via
  `PROJ_FORM_GEO` — docs in `docs/engine/hit-surfaces.md`),
  `presence.ts` (leveled-list
  spawn envelopes: weight-vs-level curves on any monster-table entry or
  MonsterDef, folded at `World.weightedPick(table, atLevel)`),
  `fog.ts` (THE FOG FABRIC: living, roaming fog banks as data —
  FogBankDef kinds + ZoneTheme.fog specs; the drawn lobes are the hit
  surface, statuses granted while inside — docs in `docs/engine/fog.md`),
  `creep.ts` (THE CREEP FABRIC: living ground membrane as data — CreepDef
  kinds + ZoneTheme.creep pockets, runtime sources via World.creepEnsure /
  MonsterDef.creepSource hearts that recoil on death; the drawn skin is
  the hit surface; WAVE SHAPES as per-lane data — `line: 'span'` tidal
  walls with a structurally guaranteed clear corridor, `FrontSpec.stretch`
  artery-wide crests, `convert.fade` evaporating wakes riding the generic
  `Doodad.evap` drying fabric, `chance`/`announce` intra-zone-event dials,
  `CreepDef.notAquatic` no-water-within-water; THE VESSEL BORE —
  `FrontSpec.flow` wall-following steering (whisker probes over
  `CreepTerrain.openAt` + dead-end rebounds; `confine` walls the current's
  whole gameplay surface to the vessel), `travel` finite runs that
  disperse, `swell` along-axis elongation (affine anisotropy: drawn ==
  tested through ONE transform, `crestPoint` THE seat resolver), and
  `riders` crest-borne kin (`World.updateCreepRiders` mounts real
  monsters, `crestborne` marker; debut `sanguine_bore` + the
  `pale_corpuscle` white-cell surfers on the Sanguine's lanes) — docs in
  `docs/engine/creep.md`),
  `collapse.ts` + `traversal.ts` + `render/vis/understory.ts` (THE VERTICAL
  FABRICS: dissolving ground as a `ZoneTheme.collapse` spec — contact
  crumble + seeded rim-inward melt, an eroding-but-guaranteed causeway to
  a never-melting goal; registered vertical-crossing cinematics
  (`data/traversals.ts`); the world far BELOW shown through `window`
  region cells — the Ascent/Aetherial ride all three; docs in
  `docs/engine/collapse.md`),
  `spans.ts` + `world/radiance.ts` (THE RADIANCE + SPAN FABRICS: the sky's
  light as ONE scalar — dayCycle × WeatherDef.radiance dials, flat under
  shelter — read through `World.radiance()`/`radianceCondHeld(cond)`;
  condition-held ground as `ZoneTheme.spans` rows — sunbridges by day,
  star-spans by night, prism-spans under rain, veiled leap-of-faith ways —
  and radiance-gated creep-front lanes (`FrontSpawnRow.when`, the night's
  cometfall); DIMENSION SEALS + realm tileset pools in
  `world/dimensions.ts` (`TilesetDef.realm`, `isRoadlessGateHub`,
  `DimensionDef.sky`) — docs in `docs/engine/spans.md` +
  `docs/engine/dimensions.md`; probes `balance/probe_dimensions.ts` +
  `balance/probe_radiance.ts`),
  `lightwells.ts` (THE LIGHTWELL + SURVIVAL-METER FABRICS: finite-power
  residence lights as data — `LightwellDef` rows in `data/lightwells.ts`
  (pool in resident-seconds, per-resident drain, dim curve), `lightReach()`
  THE resolver shared by render + residence test so drawn == tested
  through every stage of dimming, the generic `'kindle'` SkillEffect
  plants registered wells; survival meters are `SURVIVAL_RESOURCES` rows
  in `world/regions.ts` with per-row underflow ramps keyed per resource
  (`Actor.underflowSince`/`lastGaspAt`) — breath, light, a future warmth
  are rows, never fields; THE GLOAMING
  (`packages/defs+overlays/gloaming.ts`) rides both: a world-map darkness
  front seeded by Gloamwood's biome, breathing as one BFS-hop float, met
  in-zone by the LIGHT meter, spawned wells, `gloomveiled` stealth and
  the gloamborn — docs in `docs/engine/gloaming.md`; probe
  `balance/probe_gloaming.ts`),
  `tracks.ts` (THE TRACK FABRIC: moving hazards on authored ways as pure
  data — TrackSpec lanes (waypoints, loop/pingpong, speed, pauses, per-rider
  phase) whose rider poses are a PURE FUNCTION of the synced clock
  (`trackPose` — deterministic across seats/resumes by construction);
  payloads ride existing levers (mitigated typed hits, statuses,
  `pushActor` shoves — pit-aware with owner credit; `TrackPayload.push`
  picks the shove's GRAIN: radial fling or 'along' the lane — the sweeper
  arm that CARRIES bodies around its route), the same grammar on
  static doodads via `DoodadRule.contact` (bumpers); readability contract:
  carved `track_groove` ways, warn arcs + `imminentThreatTo` from the same
  resolver, drawn==tested rider surfaces, and THE SWEPT BEAT (the contact
  sweep sub-samples each beat at surface-honest steps — fast surfaces can
  never tunnel a body between samples); authoring via landmark builders /
  `ZoneTheme.tracks` / `World.tracksEnsure`; debut = the GLACIAL HEART
  (deepwinter's heart graft: ice disc over a chasm moat, shear-disc ring +
  rime-flail rotor + rime bumpers, the Winter King anchored at the wheel) —
  docs in `docs/engine/tracks.md`; probe `balance/probe_tracks.ts`),
  `trapworks.ts` (THE TRAPWORKS FABRIC — triggers wired to the world's own
  hazards, as data: plates/triplines (`TrapworkSpec`, feet-honest pure
  `trapTriggerHit`) driving an OPEN effect registry (`registerTrapEffect` —
  handlers speak only the narrow `TrapHost`) whose core four ride existing
  fabrics: `lanes` arm/disarm tagged track lanes, `boulder`/`volley` loose
  ONCE-lanes (`mode:'once'` + `bornAt` + presser `ownerId` credit; the
  pending lane's RAKE stroke is the telegraph), `collapse` drops false
  floors into the pitfall fabric's descend (the swallow = pushActor's
  tiniest owned nudge — credit intact). Generation-MESHED via the
  interiorGen trap pass (`layoutParams.trapworks` dials: saw halls, mincer
  rooms — every wheel rolling its own blade count/rim speed/free seating/
  spin direction, plus the ONE great blade and the push-along sweeparm —
  BLADE LATTICES (a grand hall tiled with small async wheels behind
  structural walkable seams), dart wards, boulder runs, false floors —
  geometry-honest off real corridors/rooms; sunken_ruin is the debut, its
  'toothed halls' variant the dense face; the SURFACE `rooms` recipe
  records its geometry as
  `ctx.trapGeo` and generateLayout's finished-grid tail runs the SAME pass
  via `registerTrapPass` — the mountain pass's sprung boulder runs are the
  surface debut, and rooms-rolled caves inherit a tileset's dials). The
  dead build no allegiance: trap payloads spare NO
  faction. Kit in `data/trapworks.ts`; hidden-plate close-up resolve in
  `render/vis/trapLayer.ts`; docs in `docs/engine/trapworks.md`; probe
  `balance/probe_trapworks.ts`),
  `timeflow.ts` (THE TIMEFLOW FABRIC: time itself as data — one TimeHold
  registry behind the pause menu's real pause, Ultimatum-style menu
  freezes (`TIME_CFG.surfaces`), `SkillDef.chrono` time-stop casts, and
  `StatusDef.timeScale` stasis/slow statuses; world- and per-actor scales,
  solo-only menu policy via `Timeflow.allowHold` — docs in
  `docs/engine/timeflow.md`),
  `throng.ts` + `cling.ts` (THE THRONG FABRIC — the swarm you GATHER, the
  Pikmin/Overlord playstyle as data: `SkillDef.throng` anchors a roster of
  sight-gated wild husks CLAIMED by walking through them, acquisition as
  open `ThrongSourceRow`s (finite pockets / timed motes / crit + kill
  triggers / a hit-fed gauge for add-less bosses), the held channel's
  `throngDirect` sweep riding assault orders, owner minion investment
  folded at 1/batch (`bakeMinionOwnerStats` — the ONE fold, quadratic-
  proof), nearest-1 meta delegation, unslot = disband-to-husks; THE LATCH
  (`MonsterDef.cling`): bodies that ride a victim's rim and whack through
  their own kit — size-scaled seats, shake clocks, `rideStatus`, knockback
  scrape; grapple is the shaped open seam — docs in
  `docs/engine/throng.md`; probe `balance/probe_throng.ts`),
  `sequence.ts` (THE COMBO GRAMMAR — ONE sequence matcher for every cast
  grammar: `matchSeqRule`/`resolveSeqRules` serve both the invocation
  rune-weave (`data/invocations.ts` delegates; parity fuzz-pinned) and
  `ComboRuleDef` cast-cadence rules (`data/combos.ts`) read off a null-
  cost-until-equipped recent-cast ring (`Actor.castRing`, gated by
  `comboWatch`); patterns over cast TAGS (ordered seq / counts / vary /
  repeat + `within` windows × the `comboWindow` stat), payoffs as owner-
  scoped ProcEffects through THE proc executor, granting via the ordinary
  `combo_<id>` stat family (passives, the Spellblade vocation, equipMods,
  `MonsterDef.mods` — the cadenced kin drum the SAME rules players earn,
  `beatPips` look part as the tell), starter `comboVaried`/`comboRepeated`
  ConditionIds + Polyphony/Ostinato gems; HUD pip rows + co-op `cb`/`rn`
  wire fields; vocabulary law: comboChain EXECUTES, castCycle COUNTS,
  invokes BANKS, the grammar READS — docs in `docs/engine/combo.md`;
  probe `balance/probe_combo.ts`),
  `grab.ts` (THE GRAB FABRIC — sustained bodily control as ONE state pair:
  `Actor.gripping`/`heldBy`, verbs carry/drag/pin/swallow as `GrabSpec`
  presets on the `grabSeize` skill effect, throw-release via `grabThrow` +
  the `holding` gate; the victim slaves to `grabSeatPos` (drawn == held,
  reeled in at `reelSpeed`), mass-law eligibility off `effectiveWeight` ×
  the `gripPower`/`wriggle` stats, and the counterplay LADDER — struggle
  (refused inputs feed the meter at moveActor/useSkill/pushActor; reflex
  flasks pierce), ally SEVER on holder damage, hard-CC/shove releases,
  finite holds (monster expiry spits via `spitAt`); throws ride pushActor
  so authority, wall wounds, the bowling lane and pit credit arrive from
  the mass fabric free; policy tiers by rarity + `MonsterDef.grabbable`;
  `seized`/`swallowed` markers (+ `StatusDef.conceals` renderer skip),
  struggle-meter HUD + co-op `gb` wire; THE GRIP KIN tutors (wrangler
  drag / yoke-mauler pin drumming the Takedown combo / gulper + planted
  maw_bloom swallow) with grapnel/yoke/gulletSac kit-part tells, and the
  `gore_stakes` speed-gated contact terrain (`TrackPayload.minSpeed`) —
  docs in `docs/engine/grab.md`; probe `balance/probe_grab.ts`).
  THE DEFENSE-TEXTURE DOCTRINE (signature pools ship EMPTY): poise /
  insight / energy shield are authored identities, never ambience —
  attributes only SCALE them (1%/pt), bases come from gear defense
  lanes, passives, stance grants, or `MonsterDef.base`;
  `MATERIAL_NATURE` (data/monsters.ts) gives every surface material a
  gameplay ontology (`remains` → the kill-path corpse-mint gate;
  `breathes` → the default kite budget `BEHAVIOR_CFG.defaultKite`, so
  living kiters always tire; `density` → the mass fabric's weight fold),
  and the `insightSap` stat lets
  chill/freeze/stun bind the duelist's read — docs in
  `docs/engine/defenses.md`, probe `balance/probe_defenses.ts`.
  THE MASS & AUTHORITY FABRIC (`engine/mass.ts` — who moves whom): the
  heavy both RESIST shoves and SHOVE HARDER — `pushActor` folds the
  pusher's `effectiveWeight^pow` (clamped, exactly 1 at weight 1 so every
  tuned strength and casterless push keeps its reach) over the existing
  target-weight divide; monster weight defaults from radius × material
  `density` × `MonsterDef.heft`; arrested momentum WOUNDS (wall impact =
  mitigated physical from speed × own weight, hostile-authored only,
  shover keeps kill credit like the pitfall lane) and THE BOWLING LANE
  slams bodies through bodies (arrest-vs-plow by mass ratio, momentum
  hand-offs with authority already spent); player levers are ordinary
  stats (`shoveAuthority`, `impactDamage` + the Battering Ram support +
  the mass passive cluster); bestiary prints a HEFT tier per def — dials
  in `MASS_CFG`, docs in `docs/engine/mass.md`, probe
  `balance/probe_mass.ts`.
  THE MASSIF FABRIC (`engine/massif.ts` — open country that also says NO):
  the MIXTURE layout archetype — wide-open zones studded with LARGE
  impassable interior bodies, all data three registries deep (mass SHAPES
  via `registerMassShape`, mass KINDS via `registerMassKind` → a
  registered region row carries collision/shot/sight/price/look, the
  'massif' recipe with every dial a layoutParam); `carveMassifs` is
  exported for composition and `healMassifWeave` guarantees one walkable
  weave — dials in `MASSIF_CFG`, docs in `docs/engine/massif.md`, probe
  `balance/probe_massif.ts`.
  THE SETTLED BELT (`engine/settled.ts` + `data/settled.ts` — farmland +
  metropolis): the worked country as two recipes over the massif fabric —
  'fields' (hedgerow bodies + REAL portal roads that punch field-gates
  through the hedges; road kind/width/count all layoutParams) and
  'district' (city faces under ONE generator: tenement/manor MASSING with
  lit paved boulevards + courtyard kits, or PLANNED BLOCKS raising plan
  structures from a weighted pool); crops are walk-through veil cover
  (sight-eating wheat — the crop law), livestock/folk are the prey +
  sentry fabrics composed (wolves raid the fold through hunger drives;
  the village watch is a dormant `freehold_watch` sentry), the metropolis
  is an ENCLAVE (every boundary crossing wears the `city_gate`), and
  ASCENSION inverts the drop-cave: `city_stair`/`garret_stair` sidezones
  mint procedural townhouse floors UP (chain capped by `noDeeper`, the
  strip law) — incl. via `stairwell_hollow` pockets INSIDE building mass.
  Dials in `SETTLED_CFG`, docs in `docs/engine/settled.md`, probe
  `balance/probe_settled.ts`.
  THE FORECHART (`world/forechart.ts` + the World sweep — the world charted
  AHEAD of the walker): a budgeted background sweep keeps a VEILED HALO of
  fully-minted zones around the player (the real chartFrontier path,
  nothing forked; mints stamped `ZoneDef.veiled`) — full graph citizens
  events seat on, factions contest, fronts march over, invisible at ONE
  fog seam (`World.visible`) until found (entry, the ring-1 unveil,
  surveys, omen reveals); far SOUNDINGS grow veiled clusters at requested
  coordinates (`WorldOverlay.requestSoundings` / `World.forechartSounding`).
  EVENT SEATS (`world/seats.ts` — `pickSeat` + per-def `SeatTuning`) are
  the one data-driven "where does this event land": range envelopes +
  known/unknown/veiled weights (hunt, haunting, longNight, longcandle,
  verminfall, brigands, crusade retrofitted; demon/migration/wraithsail/
  deepwinter bboxes widened; haunting's LATENT grief = the
  dormancy-until-found template). THE OMENS (`world/omens.ts`,
  `registerOmenSource`) are the findability guarantee: whisper/reveal
  radii that AGE WIDER (`widenPerMin`) — bearings murmured near, seats
  surveyed close, nothing lost forever; the crusade alone swears silence.
  THE HARBOR (`data/ports.ts`): ports as knowledge hubs — the HARBOR BOARD
  doodad (dwell → the revived Sail panel: passage incl. lane-known veiled
  harbors, hearsay rows, purchasable CHARTS = survey pulses via the
  `harborChart` intent). Dials in `FORECHART_CFG`/`OMEN_CFG`/`PORT_CFG`;
  docs in `docs/engine/forechart.md`; probe `balance/probe_forechart.ts`.
  THE SEA FABRIC (`world/seas.ts` + `data/seas.ts` — every water known
  WHOLE; THE FOREORDAINED TENET: pure function of the seed, computed whole
  at first touch, revealed only as found): any touched ocean water fills
  its whole contiguous component (4-neighbour macro-lattice — sailing-true:
  bridges split seas), classed by the `SEA_CLASSES` ascending ladder
  (pond→lagoon→sea→great sea→ocean: port budgets, haven rights, island
  muls, name pools), NAMED, and given explicit PORT SPOTS around its
  coastline (greedy max-min ≥ `portMinSep`; spot 0 = THE HAVEN).
  `World.ensureSeaPorts` mints the system veiled (`ZoneDef.seaId`/
  `portTier`, noBackEdge, haven name + quay dressing) + rings the LANE LAW
  (coastal ring + haven spokes; isles lane to the haven on sighting). THE
  LANDING LAW kills free docking: quay beacons stream + reveal on sight
  (the isles' mint-on-sight law); landings engage only at spots/isles/
  grandfathered ports — the rest is breakers; `chartCourse` = this sea's
  far harbor. First port found names the sea + stamps `first_port_found`/
  `seas_found`. Dials in `SEA_CFG`; docs `docs/engine/seas.md`; probe
  `balance/probe_seas.ts`.
  THE HARBORHOLD FABRIC (`data/harborholds.ts` + `world/harborholds.ts` —
  mainland ports as BESIEGED RESIDENCES): every sea spot wears a walled
  quay-town (`harborhold_*` compositions → plan structures with a SEALED
  gate) with a persisted lifecycle on `ZoneDef.harborhold` — found
  `besieged` (camp at the walls, muster horn on the apron), OPENED by THE
  MUSTER (discrete waves through the extraction swarm director's fixation
  grammar at the QUAY WARD; ward dead = the hold falls, waves broken = the
  town opens), FELLED into fires + a rebuild clock (or a Mortal Essence
  restoration), re-besieged by the sweep on `siegeEverySec` with an omened
  `fallAt` deadline. PROSPERITY (+1 per defense) gates `HoldServiceRow`s —
  harbormaster/board at 0, chandler at 1, the merc captain at 2
  (TEMPLATE-ONLY hires; veterans + RETIREMENT stay wilds-outpost exclusive,
  and wild outposts got scarcer). The board seats INSIDE the walls (the
  knowledge network is the town's reward); dock + cast-off never brick.
  Islands/legacy ports stay bare quays by construction. `HOLD_CLASSES`
  ladder + `HARBORHOLD_CFG.assign` decide everything; docs
  `docs/engine/harborholds.md`; probe `balance/probe_harborholds.ts`; dev
  tab 'Holds'.
  THE PLY FABRIC (`engine/plies.ts` — hit-counted durability, the
  Pikmin/Overlord damage model): `MonsterDef.plies` bodies EAT N landed
  hits magnitude-blind (one ply per blow, no life moves; thud floor,
  `spentStatus` bracket) over a DUAL live life pool — DoTs pierce to it
  and kill() never consults plies, so self-destruction and burn-the-swarm
  counterplay stay sovereign; `minionPlies` owner stat under the QUANTA
  LAW (never fractioned, never batch-scaled), pip-row read in place of a
  life bar, `pl`/`plm` wire; a 1-ply kind is the horde-tier substrate —
  dials in `PLY_CFG`, docs in `docs/engine/plies.md`, probe
  `balance/probe_plies.ts`.
  THE LITE TIER (`engine/lite.ts` — hundreds of bodies for the price of
  none): a DOTS-style packed pool (struct-of-arrays rows — no Actor, no
  StatSheet, no brain) for crowd bodies, batch-updated and batch-blitted
  (renderer drawLite: one composited sprite per body); `MonsterDef.lite`
  opts a kind in (the pooled contact band + steering texture; radius/
  speed/plies/cling/look all read off the def), `ThrongSpec.tier: 'lite'`
  seats a gathered roster in the pool, and `ZoneTheme.lite` pours ambient
  tides on a salted stream (the sewerworks' wade-through VERMIN TIDE is
  the debut). Damage IN rides TWO hooks — the `strikeSurfaces` seam
  (every area verb's exact drawn geometry carves the pool) and the
  projectile step (pierce-budget honest); a lite body IS its ply count
  (one carve, one tear, magnitude-blind). Damage OUT is THE POOLED BITE:
  one mitigated, ply-gated, count-capped hit per victim per staggered
  beat, keeper-credited. PROMOTION mints a real Actor at the interaction
  boundaries (the cling latch, the grab, the minionCast delegate);
  lite-tier throng bodies DEMOTE back when quiet — kind/owner/plies-spent
  survive the round trip losslessly. Co-op ships the `lt` draw list
  (host-authoritative, self-healing); `npm run perf -- --lite=N` is the
  horde-stress forensics lever. Dials in `LITE_CFG`, docs in
  `docs/engine/lite.md`, probe `balance/probe_lite.ts`.
  THE POSSESSION SEAM (`engine/possess.ts` — one seat-to-body indirection;
  possession and shapeshifting are its CONSUMERS): `Seat.actor` is
  re-pointable (`World.seatEmbody`/`seatEject`; `Seat.home` = the hero
  body, `World.seatHero` = the build/save/XP truth) — camera, HUD, the
  bar (a borrowed kit is ordinary `SkillInstance[]`), the AI seat-skip
  and the zone carry all follow the POINTER free, while recalc/XP/saves
  stay HOME. The 'possess' effect enters a WEAKENED enemy (lifeFrac ×
  `POSSESS_CFG.policy` rarity ladder, `MonsterDef.possessable`
  allow/deny, structural refusals; the husk stands `entranced` — the
  risk valve: pain/seizure snap you home, its death is YOUR death, seat
  home first, permadeath byte-honest); the 'shapeshift' effect mints the
  form at hero level (husk CARRIED, form death = staggered eject). THE
  GUISE: the ridden body's faction reads you as kin one-directionally in
  `hostileTo` until the first authored harm. The pressing gem rides the
  borrowed bar as the GUEST SLOT with a `'seatAway'` convert face
  (Relinquish / Return to Flesh); every ending funnels through
  `seatEject` (the kill() hook is the death law: a dying borrowed body
  ejects its rider then dies a monster; a dying husk pulls the seat home
  then wipes honestly). Stats `possessDuration`/`possessPower`/
  `huskGuard` read off the gem; THE VACANT kin (the open-door
  `vacant_shell` tutor + the refusing `seatless_usher`) + the
  `vacant_yard` set-piece teach it at a glance. Dials in `POSSESS_CFG`,
  docs in `docs/engine/possession.md`, probe
  `balance/probe_possession.ts`.
  THE REFLEX FABRIC (flasks are never locked out): `SkillDef.reflex` /
  the `reflex` stat + `REFLEX_CFG` open instant presses THROUGH the
  user's own casts/dashes/recovery without disturbing them; the THIRST
  gate (`GateSpec.missing`, waived by `thirstless`) refuses moot drinks
  before any cost — docs in `docs/engine/reflex.md`.
  THE SYMPATHY FABRIC (gains echo to kin): flask pours, orbs, charges,
  buffs and heals REPLAY on related actors as data (`engine/sympathy.ts`
  link registry + `data/sympathies.ts`, the `sympathy_<id>` stat family,
  `MonsterDef.sympathy`, `SupportDef.tameMod` claim grafts, the
  'companion' tag) — the tamed bond drinks when the keeper drinks, the
  den matron's swig waters her pack, one depth-disciplined echo per
  gain-event sweep; probe `balance/probe_sympathy.ts`, docs in
  `docs/engine/sympathy.md`.
  THE SENTRY FABRIC (inactive NPCs stay where authored): dormant
  un-roused neutrals (ai.ts `isDormant`) are PLANTED — wind drift,
  knockback/pull and environmental strikes (`Zone.spareDormant`) pass
  them by — and DUTY POSTS (`PostSpec`/`POST_CFG` in brain.ts;
  `MonsterDef.post`, `GuardianSpec.post`, or spawner stamps via
  `Actor.aiPost`) walk a displaced body back to its station, dormant or
  awake. SKY EXPOSURE (`skyOf` in data/zones.ts: `ZoneDef.sky` baked
  from `TilesetDef.sky`/`ZoneSpec.sky`, caves + off-surface dimensions
  sheltered by derivation) gates ALL in-zone weather through
  `World.skyFront()` — no storms inside cellars, caves, or interiors.
  THE TRANSIENCE DOCTRINE (events borrow the world, never own it — docs
  in `docs/engine/transience.md`): world events read as THEIR OWN WEATHER
  (`engine/eventWeather.ts` `registerEventFront` sources folded at
  `World.skyFront()` — `WeatherDef.eventOnly` rows: the Demon Storm per
  `InvasionStage.weather`, the Incursion's pall at max × influence, each
  wearing a `WEATHER_FX.veil` gradient), lay TEMPORARY ground dress
  (`engine/weatherDress.ts` + `WeatherDef.dress` — planted while the front
  holds, dissolved via `Doodad.evap` as it passes, deterministic per
  zone+kind), and tint the map wash only through KEYED, reconciled,
  DECAYING BiomeField warps (`setWarp`/`release` + the engine warp sweep;
  `BIOME_FIELD_CFG.warpFadePerSec`) — while THE MINT PATH samples the BASE
  field (`sampleBiome`), so no temporary event ever bakes its biome into
  newly-charted ground; permanent scars are registered, player-authored
  acts only. Probe `balance/probe_transience.ts`.
  THE INTERIOR FABRIC (rooms as data — docs in `docs/engine/interiors.md`):
  `StructureDef.confineVision` veils the world beyond the room while the
  local hero is under its roof (`render/vis/roomVeil.ts` VISION VOLUMES,
  `VIS_CFG.roomVeil` — render-only; LoS keeps its own occlusion; `true` =
  whole footprint, `'rooms'` = per-room via the derived `PlacedRoom`
  ledger — enclosed rooms confine, open lean-tos stay sky, window cells
  spill sight); roofs
  shelter per POSITION (windAt already; sky strikes via `Zone.spareRoofed`
  ← `WeatherStrike.throughRoofs` lever); LESSON DOORS
  (`CellSpec.door.lesson` = account-ledger key: first dwell-open stamps,
  graduated accounts mint it open); SPAWN CELLS (`CellSpec.spawn`, legend
  `S` → `GeneratedLayout.spawnAt`: no-back-portal arrivals wake there).
  The Waking House in Lastlight composes all four (bedside run start).
  `levelgen.ts`, `worldgen.ts`.
  THE COHERENCE FABRIC (generation composition stays intentional — docs in
  `docs/engine/coherence.md`): traveled ways hold right-of-way as data
  (`DoodadRule.clearway` + the one way-layer `layTraveledWay`/`wayRoller` —
  scatter routes around live stretches, roads deck/ford liquids and yield
  to molten ground, `layoutParams.overgrowth` lets deep country swallow
  runs of its own paths), ground affinity as data (`DoodadRule.habitat` —
  live kelp/coral keep to water; `ZoneDef.aquatic` arenas satisfy
  ambiently), both waivable per stamp row (`rules.ignore` 'clearway' /
  'habitat', pieces tagged) and both pinned by genqa invariants +
  `balance/probe_coherence.ts`.
  ZONE OBJECTIVES are a data vocabulary (ObjectiveSpec + per-kind
  `OBJECTIVE_SEALS` exit policy + `data/beacons.ts` survey spires and the
  monster-LURE fabric — docs in `docs/engine/objectives.md`).
  THE ATTUNEMENT FABRIC (crystals take the color of the blow):
  `MonsterDef.tune` bodies re-tune to a landed hit's dominant ROLLED type
  (conversions honored) and pulse `attuned_<tone>` onto friend and foe
  alike — engine/tuning.ts + the `attuned_*` status family; docs in
  `docs/engine/attunement.md`. THE PUZZLE FABRIC (activity riddles as
  data): lights-out lattices, singing refrains, attunement chords as open
  `PUZZLE_KINDS` + `PUZZLES` presets (engine/puzzles.ts +
  `data/puzzles.ts`), placed at zone LOAD on a salted stream, offered
  per-biome via `TilesetDef.puzzles`, askable as the `'puzzle'` objective;
  `ZoneDef.scenery` plants ambient object-actor rows the same way — docs
  in `docs/engine/puzzles.md`;
  items: `items.ts` (gear schema + every ITEM_CFG tunable), `itemgen.ts`
  (the one roller/compiler/describer), `inventory.ts` (tetris bag grid),
  `loot.ts` (nestable loot tables + DROP_CFG kill-path levers).
- `src/data/` — content as data: `skills.ts`, `supports.ts`, `monsters.ts`,
  `passives.ts`, `classes.ts`, `zones.ts`, `tilesets.ts`, `procs.ts`,
  `beacons.ts` (survey-spire objective tuning); items:
  `itembases.ts` (base families), `itemaffixes.ts` (the affix gamut via
  `fam()`), `uniques.ts`, `loottables.ts`, `vestiges.ts` (socketables +
  Epitaph words). Adding content here needs no engine changes.
- `src/packages/` — optional per-run world-event overlays (Warbands, Breach,
  Contagion, …). THE QUICKENING (defs+overlays/quickening.ts) is the
  Terror-Zone lane: a WALKED, outgrown zone's ZoneDef.level surges to a band
  around the hero's for one world-clock window — contents re-mint (zone-memory
  drop at BOTH edges), event density + kill-path bounty fold live, kin wear
  `quickborn`, a champion SURGE ECHO anchors it, the 'quickened_air'
  eventOnly weather dresses it — then reverts EXACTLY (engine reconcile
  stamps/reverts off the overlay's arcs; ZoneDef.quickened remembers home).
  Its SLAYER support lane (overmatch/giantsbane/regicide — vs higher-level /
  far-heavier / empowered victims — plus limbreaver, vs a composite's
  ANCHORED PARTS) folds once at mitigateTyped
  (`SLAYER_CFG`) as plain stats anything may grant. Docs
  `docs/engine/quickening.md`; probe `balance/probe_quickening.ts`.
  THE ANATOMY GAMUT (data/monsters.ts) fields `MonsterDef.parts` composites
  BELOW boss tier as ordinary spawn-table citizens — one break-lesson each
  (crack the wall / silence the blessing / pick the riders / break the gun /
  pop the sacs / choose the head / burst the idol) — beside trash-tier
  hittable worms (marrow whip; coil matriarch retrofit). Every part is a
  full MonsterDef (forge composables); probe `balance/probe_anatomy.ts`
  also pins the repo-wide kit nets: every monster skill exists + carries an
  ai hint + is affordable from the def's own mana pool, and every look part
  kind resolves to a painter.
- `src/sim/` — the browser-safe half of the balance harness: headless boot
  (`arena.ts`: shims + the quiet `sim_arena` zone), build injection through
  `world.adoptSavedMeta` (`builds.ts`), input-source pilots, the seeded
  episode runner, tap-fed metrics; scenario/build/target LIBRARIES as data
  in `src/sim/data/`. Observation flows through `src/engine/tap.ts` —
  optional chokepoint taps in `damage.ts`/`world.ts`, observe-only,
  null-cost when unset. Node stops at `balance/cli.ts`; per-run reports
  land in `balance/reports/` (gitignored), committed baselines in
  `balance/baselines/`.
- `src/render/` — Canvas 2D renderer + the VISUAL FABRIC (`render/vis/`):
  materials registry (one flat def color → full shaded look), sprite bake
  cache, baked actor bodies, ground texture chunks, the doodad painter
  library (kinds map to painters via `src/data/doodadVisuals.ts` — a new
  doodad kind needs ONE data entry, no renderer edits), the dynamic light
  layer (doodad `light` specs as data), and weather particles. Session
  hygiene rides THE CACHE STEWARD (`render/vis/caches.ts` — every render
  cache registers; zone/run boundaries trim + release), full-screen washes
  ride the baked EDGE-OVERLAY fabric (`render/vis/overlays.ts`), and
  engine-hostile canvas features gate on the measured CAPABILITY PROBE
  (`render/vis/canvasCaps.ts` — e.g. `VIS_CFG.statusFx.desatMode`).
  THE PORTRAIT FABRIC (`render/vis/portrait.ts`, vis-pure) draws any def AS
  ITSELF in a standalone tile via the same bakes the world blits — measured
  zoom-to-fit, worm trails, composite parts, silhouette mode, an animated
  clock path — feeding the bestiary book (`BESTIARY_CFG.portrait`), per-def
  dials on `MonsterDef.portrait`, and the WEBSITE database via the
  `npm run build:portraits` bundle (`site/assets/portraits.js`, CI-built +
  gitignored beside the `export-web-data` JSON — site pixels can no more
  drift from src/ than site facts can).
  Tunables in `render/vis/visConfig.ts`; docs in `docs/render/README.md`.
- `src/ui/`, `src/net/`, `src/meta/` — DOM panels, co-op transport, and the
  account / save / permadeath meta-layer.
- `launcher/` — the Electron desktop shell (plain CJS, type-checked via
  `tsconfig.launcher.json`): `main.cjs` (windows, git update flow, build
  stamping, IPC, smoke modes, and the full-reset wipe: `saves/` + Chromium
  storage behind a native confirm), `server.cjs` (loopback HTTP server for `dist/`
  that re-implements the Vite disk-save `/__save/:slot` endpoints — SAME
  `saves/` folder as dev; keep the two implementations in sync), `preload.cjs`
  + `launcher.html` (the launcher UI). Tunables live in `launcher.config.json`
  (committed defaults) deep-merged with `launcher.config.local.json`
  (gitignored, machine-local) — never hardcode window/port/repo values.
- Entry point: `index.html` → `src/main.ts`.

Some data files are very large (`src/data/skills.ts`, `src/engine/world.ts`).
Prefer targeted `grep` over reading whole files.

## Commit convention
- After a meaningful change, run `npx tsc --noEmit` (or `npm run build`) and make
  sure it is clean **before** committing.
- Commit with a clear, imperative message saying what changed and why, e.g.
  `Add Frost Nova skill with cold-shatter threshold`.
- Keep commits focused — one logical change each where practical.
- Push when the user asks.
- Never commit generated or personal files: `node_modules/`, `dist/`, `saves/`,
  and `.claude/settings.local.json` are gitignored on purpose. Machine-specific
  settings belong in `.claude/settings.local.json` (stays local, never pushed).
