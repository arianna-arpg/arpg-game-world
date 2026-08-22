# THE SCALD BASIN — the country of the kept beat

**Status: M2b THE CHAR'S TEETH + THE DOWNSTREAM BLEND + FAUNA WAVE 2 (built
2026-08-21 on the M1 pile; the M2b chapter is at the foot of this file —
M2a THE LAKE lands beside it).** Design
authority: `docs/design/scald-basin.md` (charter v5, walked four times) —
§2 staging, §3 the beat law, §5 the Char, §6 the pools, §7 distinctness,
§8/§8b fauna + demeanors, §10 the scorch bar, §11 weather, §13 movements.
Kit `src/data/scald.ts` · faces in `src/data/tilesets.ts` · biome row in
`src/world/biomes.ts` · kin in `src/data/monsters.ts` (faction `geyserkin`)
· looks in `src/data/looks.ts` · the geyser spine `src/engine/geysers.ts`
(`docs/engine/geysers.md`) · the scorch bar `docs/engine/scorch.md` · the
scald heat sweep `World.updateScaldHeat` · probe `balance/probe_scald.ts`.
Every number is a **DIAL** (unblessed — she blesses via playthroughs).

The thesis (charter §1): **the volcanic country is the fire's violence; the
Scald Basin is the fire's PATIENCE.** Volcanic ground threatens constantly
and randomly; basin ground is SAFE almost always and lethal on schedule —
the danger is a property of TIME, and the country's whole skill test is
reading it.

## Where the country grows

Biome `scald` (`BIOMES.scald`): patron `geyserkin`, label "The Scald Basin",
spacing 84, `meld: 'scald_meld'`, climate claim **warm ∧ damp ∧ LOW**
(`elevation {to:.5}` — the marsh's hollow-claim shape: a basin, where the
traced rivers die), `BIOME_FIELD` weight 1.5 (a discovery, not a belt).
Five faces, staged by `depthAffinity` (the garden/desert model):

- **sinter_terraces** — rim `{to:.35}`: the mineral gate — travertine
  shelves and prism pools in banded color; hiss-vents keep a fast harmless
  beat (the free tutorial). `terrace_stair` compositions.
- **geyser_fields** — broad middle `{from:.3,to:.72}` (fading in past the
  terraces' gate, so the rim reads as the terraces): M0's spike face PROMOTED
  (`biome: 'scald'` + staging; the `frontier:false`/`perfProbe` gate
  retired — frontier faces join the perf sweep by construction). The beat
  at full grammar on THE CURRENT BANDS.
- **char_reach** — flank band `{from:.30,to:.85}` (the glimmervale
  threading model): THE CHAR, ruled a REGION within the country — M1 =
  LOOK + PACKS ONLY (char-black ground, ember rents, regrowth green); its
  wildfire fronts, the ignition dial (#206), cinderwind and the regrowth
  cycle are M2's teeth; `data/creeps.ts`' wildfire row stands untouched.
- **sulphur_pools** — heart `{from:.65}`: the caustic yellow heart,
  pool-pocked ground as CONTAINED hazards (the `sulphur_pool` row), the
  great vents among them. THE LAKE zone type mints here at M2.
- **steam_galleries** — the cave face (`caveFace.biomes.scald: 8`, the
  magma_gallery model): the underside — hiss vents keeping time in the
  dark, the pools standing in the gallery floors.

Palette law (charter §7): MINERAL PRISMATICS — travertine white, pool
cyan-to-orange, sulphur yellow, steam white; never char/ember/basalt (the
Char alone wears its burn, as regrowth country). `theme.heat: 1` +
`heatHaze` everywhere. Each face carries a `BIOME_LORE` row.

## The kit (`src/data/scald.ts`)

All registry rows on existing fabrics (the garden.ts / merelake.ts
single-file doctrine); the region id IS the doodad kind id (`World.groundAt`
reads the registry by kind).

- **`sulphur_pool`** (charter §6 — the brine/lava family): wadeable,
  `severity: 30` (THE MIRE BAND — speaks over mud and standing water,
  defers to the melt), a fire DoT through RESISTANCE only
  (`standDamage` — the lava doctrine; below the lethal class), a scald
  STING on entry wearing its OWN id `sulphur_sting` (the brine_burn
  lesson: the screen-fx registry deliberately holds NO row for it),
  `survival: { resource: 'scorch', drain }` (the fill route feeds the
  scorch bar while a seat wades), **NO douse row** (the brine-sink law —
  hot caustic soup is not refuge; probe-pinned). No `registerLiquid` row yet
  — a liquid named by no recipe is an unreachable orphan to the content lint;
  THE LAKE recipe registers `'sulphur'` the day it pours (M2).
- **`prism_pool`** — the terraces' jewel: warm mineral water, wading,
  mirror-still, THE WET SEAT (20) — and **no douse**: no basin water is
  refuge (charter §7's inversion, taught at the gate).
- **`mudpot`** — mud's slog at the deposit band (10); `sinter_shelf`
  (flowstone's mound in travertine), `sulphur_crust` (ashfield's grammar
  in yellow), `sinter_cone` (the vent painter's crater in cold stone — the
  one solid), `steam_pocket` (mist_pool's wash in white), `prism_sheen`
  (the mineral rain's dress pock; weather-planted, never gen-stamped).
- Clusters `sinter_terrace` / `mudpot_field` / `sulphur_pocks`;
  compositions `terrace_stair` / `kettle_flat`; meld `scald_meld`
  (inert kinds only — the census law).
- Weather (registerWeather — the packages' lane): **`scald_mist`**
  (fog-family, radiance 0.75, born over warm∧damp∧LOW — the elevation
  axis is the basin gate; lingers over the wet heart; feeds the scorch bar
  NOTHING) and **`mineral_rain`** (light, pretty; dress row `prism_sheen`
  — the petalfall model). Looks in `render/vis/weatherFx.ts`.

## THE SCALD HEAT SWEEP (`World.updateScaldHeat`, `SCALD_CFG`)

The scorch bar's hazard sources (charter §10 — zero ambient; every source a
drawn point phenomenon; entities and players alike through the ONE seam
`World.scorchFeed`): every `sweepEvery` (0.1s), a grounded body standing
(1) an ERUPTING column's disc (`column` units/sec per class — × eruptSec ≈
0.9 / 2.4 / 4.6 units per eruption), (2) a BROILING/erupting vent's mouth
(`mouth.broilPerSec` — hot ground), or (3) within `pool.reach` of a
`sulphur_pool`'s rim (`pool.perSec` — her "being near") is fed; the sum is
capped at `maxPerSec`. The sweep reads the geyser fabric's pure resolver
(`ventReadAt`) — **drawn == tested: the broil you see is the heat you
take** — and touches nothing in the column's damage lane (M0's
`updateGeysers` stands byte-identical). Fliers are spared. The scorch
bar's own laws apply unchanged: the ease law prices the rise, THE HOLD LAW
stands the decay down while fed (loiter at a rim and the bar climbs slowly
but surely; step away and it breathes out at the row's regen), the band
sync wears `sunscorched` stacks = the bar (fire res −5%/unit) on everyone.

## THE BASKER (`MonsterDef.bask` → `BaskSpec`)

Her pitch (charter §8): a cold-blooded plated lounger whose temper IS the
scorch bar read entity-side. The sweep wears exactly ONE of two states off
the body's own meter with hysteresis: COOL (`basking_torpor` below
`coolAt` — slow, dull, damageTaken −40%: plates sealed, a placid lurker
with a commit range) / WARM (`basking_fury` at `warmAt` — faster, harder-
hitting, damageTaken +25%: plates open; the brain rule flips it to a direct
press). Statuses are set directly (the band-sync idiom — the world owns the
clock). Because the bar strips fire res on whoever wears it, **the warm
window is also the fire-vulnerable window by construction**. Cold's answer:
`onHitByType.cold → chill` (cold does NOT auto-chill) and `quench` bleeds
the bar while chilled — fight it cold, or bait the window. The tells read
`status:sunscorched` — the bar's own quantized band, the SAME map the sweep
reads (ember-flush tint + the hunker). It relishes the pools
(`pathCosts < 1`) and sits on the beat where it can.

## The kin (faction `geyserkin` — diplomacy-silent: the jotun/coven law)

Defs + tongue rows in BOTH mills (`KETTLE_TONGUE` / `KETTLE_KIN`), no war
roster, no traits row — every `FACTIONS[…]` read is guarded, so a
roster-less patron seeds influence silently and fields no war-host.
THE NO-TAG LAW binds every demeanor (no stand-off hovers at the engagement
boundary for ever — commit or quit by a clock): the **vent-shaman** (the
geyser-shepherd — `scald_vent_storm` plants a live vent under your feet
with an honest ring; `behavior.dodge` reads the broil through
`imminentThreatTo`, so it visibly steps off a real vent a breath before it
blows; `tempo.kite` authored FINITE), the **stilt-strider** (posted watch
`sweep` sentry, fan shown, wading immune; `stilt_spear`), the
**kettleback** (`drive:steam` fills the worn `fillSac` gauge on a back the
look leaves bare — the mire_leech law — and the `scald_jet` is a
drive-gated rule reserved OUT of the rotation: the full sac is the only
warning; heft 1.8 — the treader of skippers), the **mudpot skipper**
(worm FILES, `squish`, packSize — critter texture that bites, never gating
a clear), THE BASKER (above); garnish = `pool_newt` (sunning, slips under),
`spring_moth`, `scald_gull` (ruled KEPT as pure non-combat ambience — zero
chase; THE BROIL LAW carries the warning) — the `WILDLIFE.scald` roster.

## Verification

`balance/probe_scald.ts` (roster: green/fast) — rigs A–G per its header:
the biome row/field/meld/tongues/Ascent join, the staging envelopes over
`pickTilesetForBiome` + the cave pool, every face minting deterministically
through `generateLayout` + the four surface faces live through
`devMintTileset`, the sulphur-pool row law live (wade → sting + wound +
bar; near → bar, no wound), the heat sweep off a hand-planted vent (entity
seam, faction-blind, fliers spared), the basker's cool/warm/quench cycle,
the NO-TAG pins, tells/looks/wildlife nets, both weather kinds.
`probe_geysers.ts` §1 pins the promotion. Gates: `npm run check`,
`npm run probe`, `npm run genqa` (the faces auto-join), `npm run sim -- run
--suite smoke` + `baseline check`, `npm run perf` (frontier faces auto-join).

## THE LAKE (M2a — built; `docs/engine/lake.md`)

The heart face pins the lake recipe (`forceLayout: 'lakeshore'` — the id
`lake` belongs to the furniture landmark under THE UNIQUE-ID LAW): one vast
wobble-rimmed sulphur lake the zone conforms to — the walkable RING carries
the exits, the wadeable **`sulphur_shelf`** (the pool row's milder cousin:
wading + the sting + the scorch feed, no douse) rings the **`sulphur_deep`**
(refused as ground through an EJECT, drawn as water wearing THE BROIL
forever, shots and sight passing), isles and spits reach inward, the
waterline wears the kit's crusts + terrace stairs, and ONE authored `great`
vent stands offshore on its own isle — the lake's metronome
(`GenCtx.authoredVents` → `bootGeysers`). The two liquids `sulphur` /
`sulphur_deep` are registered HERE (this file's kit) the day the recipe
pours them. Probe `balance/probe_lake.ts`.

## M2b — THE CHAR'S TEETH + THE DOWNSTREAM BLEND + FAUNA WAVE 2 (2026-08-21)

Charter §4 (card 2 ratified), §5 (card 8 ratified), §8/§8b (the RATIFIED
demeanor shelf, THE NO-TAG LAW), §13 M2. Probe `balance/probe_char.ts`
(roster: green/fast). Every number a **DIAL**.

### THE CHAR'S TEETH (`char_reach` — `ZoneTheme.creep.fronts`)

The SHIPPED `wildfire` row (`data/creeps.ts` — quench 420 / feed 900 /
ashfield 0.4, **untouched**) given a HOME, two lanes on the Char's theme:

- **THE STANDING BURN** — a picket most visits (`delay [18,34]`,
  `waves [50,90]`, `bearing: 'roll'`, an arrival line), wearing **THE
  IGNITION DIAL** and **`heels`**.
- **THE CINDERWIND LANE** — `when: { weather: ['cinderwind'] }` (the
  cometfall's radiance-gate precedent keyed to the standing weather):
  under the Char's fire weather the fronts come sooner (`delay [6,14]`),
  wider (`line [3,4]`), return faster (`waves [22,40]`) and light easier
  (`ignition.power 160`) — the lean-up.

**THE IGNITION DIAL (backlog #206 — the reserved seam, opened; charter
card 8):** `FrontSpawnRow.ignition` (`IgnitionSpec`: `power`, `types`
default fire, `fuels` default = the def's own consume fuels, `near`, `max`,
`cooldown`, `reach`) — a PER-LANE opt-in. Sustained typed damage landing on
ground that holds the lane's FUEL (no fuel, no fire) fills a per-lane
kindling meter that DECAYS (`CREEP_CFG.front.ignition.decay` — a stray
splash never lights; a fire build must PRESS); at the row's power
`CreepField.igniteAt` births ONE section of the lane's kind at the blast
(bearing + reach on the field's private xorshift — a player's blows never
move the zone's own wave stream), under the lane's concurrent cap and
cooldown. The born section is an ordinary marching source of the SAME def
— the same affinity map, the same quench lever, the same starve gutter —
so it can never spread where its row would not. **THE GLOBAL DEFAULT STAYS
OFF BY CONSTRUCTION**: the tap (`World.frontSplash` + the ownerless blast
seam) early-outs on `CreepField.ignitable`, which only a lane row with the
dial arms — every other wildfire lane in the game (the forest lane
included) keeps "player casts never ignite fronts", probe-pinned. The
feed/stoke levers keep their deliberately-high thresholds (the "never a
fire build's bellows" clause survives). Arson is terrain-legal in the
Char and nowhere else.

**THE ESCAPE SEAM (the creep header's long-named chase, bound):**
`FrontSpawnRow.heels` — under an `'escape'` objective `World.loadZone` →
`bootEscapeChase` → `CreepField.fieldHeels(x, y, bearing)` fields every
pending heels lane's FIRST wave NOW as a picket `CREEP_CFG.front.heelsBack`
behind the party's landing, marching the way in (entry → the zone's
heart); later waves keep the rim law; other objectives never call it. The
Char already weights `escape` 2/6 — the ignition-CHASE face.

**CINDERWIND** (`registerWeather`, data/scald.ts): born over hot ∧ LOW ∧
the basin's DRY FLANK (`birthGeo` moisture band `[0.36, 0.58]` — never
the wet heart), storm-grade wind, a SPARSE strike row (`cinder_fall`
through the shared strike machinery — roofs + overhangs shelter), dress
rows of `ember_litter` (a ruled, visualed, NOT-fuel kind that evaps as the
front passes), a streak-particle look + a hot veil
(`render/vis/weatherFx.ts`).

**THE REGROWTH CYCLE** (`REGROWTH_CFG`, `World.updateCharRegrowth`,
`ZoneTheme.regrowth: true` — opt-in; elsewhere a wildfire's ash stays ash,
byte-identical): ASHFIELD relaxes to **THE GREEN FLUSH** (`regrowth_flush`
— the tint band) at `flushAfter` and to **THE MEADOW** (`regrowth_meadow`)
at `meadowAfter`, standing FIRE-FOLLOWER flora up around it
(`fireweed` — kindling FUEL, planted on the evap fabric so the meadow is
never a permanent repaint). Age reads ONE clock per piece: a runtime
stamp's `Doodad.laidAt` (the wildfire's wake — the creep stamp adapter
writes it) or the zone's authored clock `ZoneMemory.charBorn` (set at
load, persisted with the memory: a walked Char zone is visibly further
along when you return — world time keeps counting while you are away).
The Char AUTHORS its burn ground now (layout rows `ashfield` /
`regrowth_flush` / `fireweed` + the gen-time `ashfield` stamp), the
wildfire's ashfield affinity (0.4 — fresh burn starves the next fire)
closes the loop, and the fire eats the flora back to ash. Drawn ecology,
no text.

### THE DOWNSTREAM BLEND (charter §4, card 2)

`GeyserSpec.downstream` (`DownstreamSpec { show, rain, runoff }`) per
authored vent, per-class defaults in `GEYSER_CFG.downstream`, resolved at
seat time onto `PlacedVent.downstream` (`resolveDownstream` — **rain is the
GREAT vents' privilege**: a lesser class asking is refused with a warn;
hand-built vents resolve to their class: absent == identical). `show` is
documentary — spectacle is UNCONDITIONAL.

- **THE BURN RAIN** (`World.burnRain` at the burst edge, `GEYSER_CFG.rain`):
  the great vent's comets LAND as teeth — one telegraphed SKY-BORNE zone
  per droplet (`rainFanOf`: a pure per-cycle hash, `count [4,9]`, the
  annulus `[120,260]`, BIASED DOWNWIND off `World.windAt` at the burst —
  weather and rain agree; every seat deals the same drops; STRICT
  periodicity), fired BY THE FIXTURE through the weather strike's
  casterless posture (the 'Storm' body — nothing to silence, nothing to
  break; uncredited environment, faction-blind): `hitAll` /
  `spareDormant` / `spareRoofed`, landing `rainDelay` (0.8s) after the
  column, the lob comet drawn from the plume (`lobFrom`/`delay0` — the
  hashed render fan stands down on raining vents: one drawn word, one
  landing), honest landing rings, `scald_pock` on impact
  (`plantImpactDress` — the transience doctrine), the droplet skill
  `scald_rain_drop` (fire + `scalded`), and each landing FEEDS the scorch
  bar of the grounded, unroofed bodies under it (`rainScorch` — M-HEAT's
  "the burn rain's hits" source).
- **SHELTER** (`DoodadRule.shelter` → `World.underRoofAt`): the
  `sinter_overhang` (data/scald.ts — a travertine shelf whose LIP reaches
  past its small solid body) is a ROOF-GRADE dry seat: the rain passes
  over, the gale becalms, the heat-shade holds — drawn == tested at the
  full radius. Seated in the fields + pools faces' layouts.
- **THE RUNOFF** (`World.pourRunoff`, `GEYSER_CFG.runoff`,
  `scald_runoff` — data/scald.ts): a great vent's spent water poured from
  its SPILL SIDE (`spillBearing` — a pure hash of the seat: the same side
  every beat) as ONE marching section through `creepEnsure().addFront`:
  `travel [300,500]` (a finite run that disperses), `flow` (the vessel
  bore — channels, rebounds), `convert.fade` → `scald_sheen` (an
  evaporating film — the ground forgets), `quench` cold, `drag` a gentle
  carry, `grants: scalded` (the sulphur_sting family; its OWN fire row,
  no screen-fx). The scald heat sweep reads live runoff cover as its 4th
  source (`SCALD_CFG.runoff.perSec`) — the wash WARMS what it crosses.
  The safe side of a vent is uphill of its spill.
- **THE WARM HATCH** (`ConstructDelivery.hatch.onScorch`): a pod whose
  OWN scorch bar reaches the threshold hatches EARLY (`World.updateScaldHeat`
  → `hatchPod`; the shell retires on the expiry path) — the brood
  matron's clutches hatch under the rain, the runoff, a column, a pool's
  rim: every great eruption followed by something small and hungry
  downstream. One seam, four sources.
- THE WARM WAKE stands as M1 left it.

**A latent hole found + closed:** the creep leaf applied every grant at dps
0, so terrain DoTs (`flamewreathed`, `starfire`, the new `scalded`) wore
their label and never ticked. `CreepTerrain.statusDps(id)` — World answers
`baselineStatusDps(id, zone.level)` (the ground-effect lane's own law) —
now lands every granted DoT at its row's baseline. Bare harnesses keep
the old 0.

### FAUNA WAVE 2 (`data/monsters.ts` / `looks.ts`; all `beast`)

- **brood_matron** — the shallows brood matron: `lay_brood_clutch` (the
  formic matriarch's pod grammar, look `brood_clutch`, incubation 28s,
  `hatch.onScorch 1.6`) → `brood_clutch_hatch` → 2 **scald_spawn** (45s).
- **vent_lamprey** — the cling fabric: `gnaw` fire; **THE FLOP**
  (`ClingSpec.flop` — new: a shaken perched rider is tossed into the
  longer `CLING_CFG.flop.grace` re-latch wait wearing `lamprey_flop`, slow
  and soft — the vulnerable beat the host's shake earns; burrow wins where
  both are authored).
- **prism_snail** — the attunement fabric's first WILD wearer (`tune: {}`
  + a full exoskeleton shell): re-tunes to the last blow's tone and PULSES
  it back (`attuned_<tone>` on everyone near).
- **THE WALLOW — scald_wallower** (the shelf): `habitat: sulphur_pool`
  (hard-confined), `post`, `wallow_reach` (reach, never pursuit), and the
  DOOR: `distOver 150` → hold + `WALLOW_SETTLE_BUFF` (slow, hard to hurt)
  worn while you stand out of reach, read by its tells (lean + tint); step
  back in and it rises. It never runs — YOU choose to.
- **THE TIDE-LOCKED FRENZY — kettle_minnow** (the shelf; `WILDLIFE.scald`
  near the pools): placid critter texture with a DECAYING `frenzy` drive
  jumped by the downstream's `scalded` → a short direct feeding-frenzy
  window over the wake, then placid again.
- **THE OPPORTUNIST WITH A CEILING — cinder_jackal** (the shelf, THE
  NO-TAG LAW): `prowl` at a visible ring (the stand-off IS the tell),
  commits on your mistakes (`targetHasStatus` scalded / sunscorched /
  mired / wading, `targetCasting`) — and a LOCKED CEILING
  (`sinceEngaged 9` → direct, no hold) converges regardless; opportunity
  only pulls the commit earlier. Seated in the Char's packs.
- Tables: fields (matron, lamprey, wallower), pools (matron, snail,
  wallower, lamprey), terraces (snail), the Char (jackal), wildlife (minnow).

**Not built — the steam-wisp lite tide.** The beat-conditioned twin of
`LiteSwarmRow.when` is cheap, but the pour seats its pockets on the
leftover-POI stream, not at vents; a tide that "pours off the vents while
the eruption holds" needs a second lever (a vent-seat lane for pockets)
to be honest. Deferred with the den (M3) — one lever, one pass.

### Dials (all unblessed)

`CREEP_CFG.front.ignition` (decay / near / max / cooldown) + `heelsBack`;
the Char's lane rows (delays, waves, lines, `ignition.power` 220/160);
`GEYSER_CFG.rain` (count, range, downwind, spread, dropletR, scorchUnits,
pockDwell) + `GEYSER_CFG.runoff` (reach, offset) + `GEYSER_CFG.downstream`;
`REGROWTH_CFG` (cadence, stages, flora); `SCALD_CFG.runoff.perSec`;
cinderwind's whole row; `scald_runoff`'s front numbers; every wave-2 def
(stats, the clutch's incubation + `onScorch`, the flop grace, the
wallow's door distance, the jackal's ceiling, the minnow's decay).

## M3 — THE GREAT GEYSER den + THE GEYSERMAW (built 2026-08-21; `docs/engine/greatgeyser.md`)

The coda's first item, on the lair fabric: a `registerLair` seat on scald
SURFACE ground (level 8+, chance 0.14 — `GREAT_GEYSER_CFG`) resolving to the
`great_geyser_mouth_site` landmark — the `vent_den_mouth` builder's apron
(spoor in steam / sinter / crust) with THE LOUDEST VENT authored beside the
door (a great anchor through `GenCtx.authoredVents` — the den is FOUND by ear
and eye, never a map mark) — whose `geyser_maw` door mints **the Great
Geyser** (`great_geyser` tileset, the `ventcauldron` recipe — `engine/
ventcauldron.ts`: a wobble-rimmed basin sunk into rock, sinter terraces
ringing ONE great vent at the heart on a boss-tempo clock [32,44]s, shelter
overhangs on the middle ring, THE BOSS SEAT on the vent; open sky; noDeeper;
`great_geyser_entered` / `geysermaw_slain`). **THE GEYSERMAW** is THE VENT
DWELLER fabric's debut (`MonsterDef.ventDweller` — `engine/ventDweller.ts` +
`World.updateVentDwellers`): it lives IN the heart vent, SUBMERGED between
beats (`vent_submerged`: timeScale 0 + conceals, untargetable + invulnerable,
pinned), BREACHING as the column clears for a 14s window, ghosting
(`vent_sinking`) and sinking again — its presence a pure function of the
vent's clock (never a timer of its own; THE SEEN COLUMN witness keeps a
clock hand-off from raising it without a column; THE NO-TAG LAW clamps the
window so the fight never stalls). Kit: the column call, the scald spray,
the gulp, the wallow's reach. Probe `balance/probe_den.ts`.

## Deliberate deferrals (M3 — charter §13)

The steam-wisp lite tide (above); player-kit graduation of the §9 seeds; a
dev-tab readout for the downstream and for the dweller's seconds-to-window.

## THE CISTERN (M3 — built; `docs/engine/cistern.md`)

The lake's secret under-story and the lair of THE CISTERN CRONE: the
moonlit mere's grotto form under the lake's GREAT SHOAL (`engine/lake.ts`
mints one broad isle and holds it out; the lane `data/cistern.ts` carves
ONLY beneath it — one well + stair on the shoal, reached by wading the
shelf; the lake keeps every drop of its water), the sulphur_pools face
dialing `underTier: 'cistern'` (chance 0.3, DIAL). The crone: a scalded
naiad-crone, coven, ROOTED on her pool (THE GRID ROOT), whose BOIL is THE
GROUNDED STRIKE (`StormDelivery.onGround` — the pool broils for two breaths,
then the water itself turns lethal; the shore inside the ring stays dry;
drawn == tested through `render/vis/boilLayer.ts`). Probe
`balance/probe_cistern.ts`.

## THE TERRACE PILGRIMAGE (M3 coda — built as THEATER; `docs/engine/pilgrimage.md`)

The geyserkin reading the beat together: a lantern-bearing column (a
vent-shaman leading stilt-striders — existing defs, no new kit) sets out
from a terrace-side mouth and climbs to the zone's LOUDEST vent, TIMED by
ONE read of the surge hour (`engine/pilgrimage.ts pilgrimageCue` — the
surge stays sovereign on its pure clock; the line climbing the terraces is
the CUE by which you notice it coming — her timing law at the eighth walk),
stepping off every vent on its beat (the ONE threat resolver, the dodge
reflex's own dive), laying drying prism-crust offerings at the brim (the
`plantImpactDress→evap` path through `World.plantDressAt`; a small keyed gem
beat under the spoils law), keeping a capped vigil (THE NO-TAG LAW) and
dispersing — unannounced, budget-honest, arcless, raidable. The theater
kind `terrace_pilgrimage` (`data/pilgrimage.ts`) rides two generic seams the
fabric grew for it: THE FACE AXIS (`TheaterRow.tilesets` — the terraces
first, the fields second, never the heart) and THE LOCAL CLOCK GATE
(`TheaterKindDef.ready`). Probe `balance/probe_pilgrimage.ts`; the Geysers
dev tab's "Summon the pilgrimage ▶" stages it on demand for her walk.

## Dials (all unblessed)

`SCALD_CFG` (sweep cadence, column/mouth/pool rates, the cap, the bask TTL);
the `scald_basker` bask thresholds (warmAt 2.5 / coolAt 0.8 / quench 2.5/s)
and the two status rows; `sulphur_pool` (dps 4.5 + 0.8/level, sting 1.2 +
0.6/level, pathCost 6, scorch feed 0.5/s); every face's geysers row, packs,
sizes and palette; the biome weight/spacing/claim; both weather rows; the
eruption fire window (`GEYSER_CFG.classes.*.eruptSec`, eased ~12% at her
fourth-walk note — if she meant cadence, `bandPeriod` is the one-number
flip).

## M3 coda — THE SURGE HOUR → THE STEAM-WISP TIDE + THE METRONOME LEAN (2026-08-21)

Her cascade (charter §0 seventh walk): **surge → eruptions → steam →
wisps**. THE SURGE HOUR is the geyser fabric's own long clock
(`GEYSER_CFG.surge` — `docs/engine/geysers.md`): a pure, per-zone,
UNANNOUNCED window in which the vents ride THE ALIGNED TIDE (bands struck
together on a zone-wide beat, periods shortened, greats raining more) and
hand back to the base clock byte-identical. The steam thickens two ways:
the geyser layer's per-vent steam (`VentRead.surge`) and the
`scald_surge_steam` front (`data/scald.ts` — eventOnly, pinned by the
`scald_surge` event-front source while the hour holds, `steam_pocket`
dress rows rising and evaporating; none under shelter). THE STEAM-WISP
TIDE is the cascade's last link: `steam_wisp` (lite tier) poured off the
vents by every face's `ZoneTheme.lite` row (`seat: 'vents'`, `when: {
surge: true }` — `docs/engine/lite.md`), receding after. The dev Geysers
tab reads the long clock and FORCES a surge for her walk.

**THE METRONOME LEAN** (§8b, no new machinery beyond one tell source): the
**tempo-drummer** (geyserkin — one stamp drummed on a four-count: the
Kettle Tattoo grammar `data/combos.ts`, mods-granted, closes on the 4th
and casts a scalding vent burst at its feet) and the **clockcrab** (wild —
two ticks wind the spring, the third snaps: Tick-Snap). Their beat pips are
a TELL off the new `combo:<rule>` source — THE HONEST MEASURE (the pip that
reads lit IS the cast in the ring; `beatPips` reads `params.fill` as a
meter) — three lit and the next strike is the big one. Both commit on
their beat (approach, no kite — THE NO-TAG LAW). Seated across the faces'
packs (crabs thick on the terraces — the rim's rhythm tutor beside the
hiss vents).

Dials (all unblessed): everything in `GEYSER_CFG.surge` and
`SURGE_STEAM`, the wisp rows' pockets/size/regen rates, the wisp's
contact (damage 1 fire, countCap 3), both kin's stats + the rules'
`within`/`icd`. Probe: `balance/probe_surge.ts`.

## THE SCALD KIT — K1 (built 2026-08-21; `docs/engine/scaldkit.md`)

The compounding law's third layer (charter `docs/design/scald-kit.md`):
the basin's themes graduate into KIT — monsters first (THE MIRROR LAW),
the player's pieces after (K2), one spike pulled forward at her word
(GEYSER-STEP). Engine folds: THE SCALD BANK (`StatusDef.bank` on
`scalded` — authored applications ACCUMULATE, terrain stings untouched;
THE WET FOLD ×1.5 onto wading/swimming/soaked/rain-wet bodies —
`WeatherDef.wets` + `World.updateWetSky`), THE RUPTURE (`rupture`
SkillEffect → `World.ruptureBank`), THE VENT (`vent` SkillEffect plants a
registered fog bank; the `steam` kind OCCLUDES SIGHT — THE VAPOR RIDE,
`OccEnv.opaqueAt` on the `'sight'` ray), THE PRESSURE GAUGE read (tells
`rounds:<skill>`), THE VENT-RIDE (`LeapDelivery.vent` — the cast's broil,
the take-off column, the flight's jet). Existing kin gain kit (the shaman's
Steam Vent + Vent-Ride, the kettleback's Kettle Burst, the strider's
Scalding Lunge — its verb renamed SHELL BURST at K2, so the player's own
Kettle Burst stands alone in the book); wave 3 = scald lancer / vaporling /
kettle bladder / spout-hopper / terrace warden, each on one standing fabric
and wearing new painters (`render/vis/parts.ts`).
Probe: `balance/probe_scaldkit.ts`.

## THE SCALD KIT — K2 (built 2026-08-21; `docs/engine/scaldkit.md`)

The PLAYER's half: **Scalding Lash / Kettle Burst / Boil Over** (bank then
RUPTURE — the two-verb family), **Head of Steam / Blowhole** (hold ground
to bank pressure, vent the whole bank as columns), **Vent Hop** beside K1's
**Geyser-Step**, **Vent Veil**, the gems **Boiling Point / Pressure Seal /
Afterspray / Vaporize / Mineral Tuning**, and the mineral vestige register
(*Sinter · Travertine · Sulphur · Vitriol* + Scalding Grip / Terrace
Stair). Generic seams it added, none scald-shaped: `applyWet_<status>` (the
wet rider), `useCharges.still` (THE PATIENT BANK — builds standing, bleeds
running) and `.ventAll` (THE VENT PRESS), `DashDelivery.trailVent`,
`departSplash`, `tuneFavor`, a `vent` proc payload, and the `bankless`
socket mechanism. ACQUISITION (charter §4): THE GEM FLOOR drops the kit on
the country's own ground before the account owns anything
(`engine/loot.ts` GEM_FLOORS), and `gem_skills_scald` — an ANY-OF over the
den's and the cistern's ledgers — carries it into the account-wide drop +
vendor pools, geyser_step included. NO-LOCK throughout: every piece works
anywhere; the basin is where it shines.
