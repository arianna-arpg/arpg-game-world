# THE SALT FLATS — design charter v3 (the country of the white blind — walked twice; M0 GO behind the groundwork)

**Status: WALKED TWICE (2026-08-22). THE SECOND WALK — M0 IS GO ("I definitely
want to go ahead with M0"), BUT THE GROUNDWORK LANDS FIRST: "before that I'd
actually like to set the groundwork for the animation-related items such as
nodes crumbling, secrets giving way, objects dissolving, shattering or
exploding (this would be a fantastic time to swap something like urns
shattering to this more animation-oriented framework rather than having it be
a text descriptor), etc; this way we can get a gauge as to exactly how well
those would all look, which might set precedent for something like the
illusion weather events." → THE DISSOLUTION GRAMMAR got its OWN charter
(`docs/design/dissolution.md` — card 10 (i) answered YES; (ii) text retires
per converted kind, urns first; (iii) the lane runs BEFORE M0, not beside it),
its D0 chip is FIRED, and M0's chip is FIRED with the groundwork as its
PREREQUISITE (its ghost herds vanish by the grammar's DISSOLVE motion — the
precedent she named for the illusion weather). §13's order is now M-DISSOLVE →
M0 → (her gauge + M0 walks) → M1 … THE FIRST WALK (same day): her verdicts in
§0's second table. THE FIRST WALK: MIRAGE AS WEATHER RATIFIED — "I love the
idea" — expressly FOR the sake of THE PHANTOM EVENTS (her shape, §5c: whole
events that appear, dissolve around the walker and re-form beyond, "nothing
but a shader layer that can't actually be interacted with; a true illusion" —
THE ILLUSION IDENTITY); the saltbloom's break RE-SHAPED (no descriptor — a
CRAFTED shatter animation → debris → fade, built FIRST as its own offshoot:
THE DISSOLUTION GRAMMAR, planned-passes #26 promoted, §7b); THE PRECISION
CLAUSE added to the law (§0b — "text can be genuinely used for precision
rather than mixing precision with fluff"); and card 1 HELD to a concrete bar —
"really different enough from the desert that it deserves its own country as a
promotion", the alternative being "countries-within-countries" (the desert's
salt face made far more robust) — §11 is now THE DISTINCTNESS REQUIREMENT
(ruled section) with the rubric her M0 walk judges. DESIGN ONLY: nothing under
`src/` is touched by this charter; the coordinator lands the doc. Commissioned 2026-08-20 off her
content-slate ruling (memory `her-content-philosophy` — THE COMPOUNDING LAW
and THE SHOW-DON'T-TELL LAW, both her words), re-spawned 08-22 after a
restart ate the first chip. Her settled rulings are §0; everything else is a
PROPOSAL — recommended freely, decided nowhere she has not already decided.
The DECISION CARDS are §12 (and the heart of the pass memory
`saltflats-design-pass`). Anything marked **DIAL** is a build-time lever; every
number is unblessed (her standing word: numbers bless through playthroughs).
Survey receipts are against HEAD `e1528ee` (the Scald Basin landing); anchors
name files + symbols, line numbers drift. The sibling Scald Basin charter
(`docs/design/scald-basin.md`) is the house shape this one follows — its laws
are inherited where named (THE NO-LOCK LAW, THE MIRROR LAW, THE NEW-PIECES
PREFERENCE, THE NO-TAG LAW, THE COMPOSITION LAW), never re-litigated.**

> **THE LEAD FINDING, before anything else.** The Salt Flats already EXIST as
> the desert country's deep face: tileset `saltflat` — title **"Glasspan"**,
> "a dead lake remembered as a floor: cracked white hardpan, lightning fused to
> glass, salt pillars for a forest, and no shade anywhere the sun can reach"
> (`src/data/tilesets.ts` ~2770; staged `depthAffinity {from .15, fadeIn .25,
> mul .7}` — "glasspan blisters through anywhere past the fringe", `world/
> biomes.ts` ~422). It carries THE GLASSPAN KIT (salt pillars, lightning glass,
> fulgurite, heat-shimmer fields), THE MIRAGE KIT (oasis / bastion / caravan —
> "light, not matter"), the Sirocco Court's salt_husk + glass_stalker on its
> table, the 'white blind' variant (`dayLight 1.9, swelter 1.35` — the
> brightest, hottest committed scene in the game), and the wet salt pan lives
> one country over as the littoral's `brine_flats` ("the drained seabed") with
> the `brine_sink` region ("a pan with no mercy"). **So this charter is not a
> green field: it is the PROMOTION + DEEPENING of authored ground.** That is
> why card 1 (country vs region) has real weight on both sides, why the
> distinctness section argues against TWO neighbours (the desert that owns the
> Glasspan, the littoral that owns the brine pans), and why the white identity
> she named is an OPEN SEAT — the Glasspan's floor is khaki, not white (§2).

---

## 0. Her rulings (settled — encoded as law, not options)

| # | ruling (2026-08-20) |
|---|---|
| 1 | The Salt Flats proceed as a **HIGHLY DISTINCT thematic environment** — a biome COUNTRY or a REGION; the charter PROPOSES which, with the case made either way, and a card carries it to her (§3, card 1) |
| 2 | **THE SHOW-DON'T-TELL LAW** — gameplay elements "truly more visually defined than text oriented; we want to play by visual rather than explicitly mentioning things like 'the salt breaks' by showing rather than telling." A NAMED charter law every element must pass (§0b below): crust fragility reads from spreading cracks, sheen changes and footprint wakes — never a floater or label; the mirage is a DRAWN phenomenon (heat-shimmer veil / weather FX), never a described one; drawn == told |
| 3 | **THE IDENTITY**: the only bright-white country in the roster (censused — §2); blinding open pans; massif-sparse (the watch fabric's longest honest sightlines — a sentry/sniper country); salt-crust BRITTLE ground; salt-PRESERVED kin; MIRAGE weather; salt as a HARVEST-node texture (the resource-harvest fabric, landed 08-19) |
| 4 | **THE COMPOUNDING LAW** (her philosophy, required content): biomes "set the landscape for further monsters, which then set the landscape for further abilities based around those monsters' themes... it begins to build upon itself" — §8 (fauna roster, one line each with the fabric it rides) and §9 (ability-theme seeds) are required sections, not appendix |

### The walk (2026-08-22, the same day — the first cards' verdicts)

| item | verdict |
|---|---|
| the charter | "This looks pretty good, with a few adjustments" — the shape stands; three adjustments below |
| card 6 · the saltbloom's break | **RE-SHAPED (her ruling)**: no text descriptor — "we want to avoid the text descriptors and SHOW rather than TELL"; the break is a CRAFTED ANIMATION of the saltbloom shattering and then fading, and because that animation "is basically already a want that can be applied across a plethora of instances; secrets, rubble, node collapses, etc", it is built FIRST as an OFFSHOOT BRANCH "prior to a saltbloom implementation" — THE DISSOLUTION GRAMMAR (planned-passes #26, promoted from record-don't-build; §7b, card 10). The "shatter shakes the pan" slogan is RETIRED (it named a mechanic, not a line — but a slogan reads as a floater, and the lesson stands) |
| the law · THE PRECISION CLAUSE | her words: "This way, text can be genuinely used for precision rather than mixing precision with fluff" — encoded in §0b: text is reserved for PRECISION (numbers, binds, readouts — the things a drawing cannot carry exactly); it never DESCRIBES drawn state |
| card 3 · the mirage | **MIRAGE AS WEATHER RATIFIED** — "I love the idea of 'Mirage as weather'" — expressly because of THE PHANTOM EVENTS (her shape, §5c): the ghost herds "could be a very interesting idea where an event itself could basically look as though it's beginning to play out... and then dissipate in front of the player, giving the entire salt flats' identity something illusion-based rather than something permanent" — e.g. a MIGRATION that appears out of nowhere; walk into it and "the entities simply dissolve around the player, only to re-appear on the far side of them, effectively becoming nothing but a shader layer that can't actually be interacted with; a true illusion." THE ILLUSION IDENTITY is now the country's second spine clause (§1, §5c) |
| card 1 · country vs region | **HELD to the bar** — "the same [caution] as with the scald; we want to ensure that this is really different enough from the desert that it deserves its own country as a promotion. The alternative is to effectively make the desert's version of the salt flats far more robust and basically expand the desert to be countries-within-countries; this will depend on the intensity and number of variants and how different the salt flats acts as its own actual region/country." → §11 rewritten as THE DISTINCTNESS REQUIREMENT (ruled section): the desert-vs-flats axis table, THE INTENSITY LEDGER, the probe pin, and THE SUB-COUNTRY alternative named as a mechanism; her M0 walk judges against it (M0 is country-neutral by construction) |

### 0b. THE SHOW-DON'T-TELL LAW — the charter's statement (every element below is tested against it)

**The law.** Environment gameplay state is carried by DRAWN phenomena —
cracks, sheen, shimmer, wakes, tint, posture, silhouette, the shape of the
ground — never by a floater, a label, a warn line, an announce, or an
instruction printed into the world. The player learns what the salt does by
WATCHING the salt, and by watching what lives on it survive it.

**The test (applied to every row of this charter):** *if the drawn frame were
the only channel — no text of any kind — would a first-time walker still learn
this element's state AND its consequence before it costs them?* If the honest
answer is "only once it has already hurt them", the element needs a better
drawn tell, not a word.

**The channels the law forbids for environment state** (named precisely, so a
builder never reaches for one by habit — survey receipts in §14): the
`World.text` floater spawner and the INFO STREAM float kinds; `BrittleSpec.text`
/ `.warn` (the rotten bridge's "the planks creak…" is exactly the habit this
country refuses); `AmbushSpec.announce` (the desert's glass_stalker says "the
light bends wrong…" — the flats' ambushers say nothing: the light bending IS
the tell); `FrontSpawnRow.announce`; `RegionKind.enterText` (brine_sink's "the
brine burns!"); brain-phase `announce` lines; the conditioned-door refusal
float; and — the live anti-pattern to cite — `drawFractures` printing
"run over it to crack it open" into world space (`render/renderer.ts` ~1573).
**These stay legal elsewhere**; this country's new kit simply does not wear
them (card 9 asks her whether the standing desert mirage kit, which the
flats' rim inherits, drops its three pop lines too).

**The channels the law permits:** (a) drawn phenomena on the world layer;
(b) the tells fabric's doctrine verbatim — "DRAWN == TESTED. A tell resolves
off the LIVE mechanic (the same map the AI rule reads); it may never be
decorative and never lie" (`engine/tells.ts` header); (c) player-STATE
surfaces that happen TO the player — the survival bars and their vignettes
(THE ANCHORED SKY's own exemption: `veil.anchor: 'view'`), with THE SEVERITY
READOUT as "show-don't-tell's one permitted number" (`docs/engine/scorch.md` —
a caption that is a pure function of a tested meter); (d) the bestiary book
(out of play); (e) the harvest RITE's own prompt (player-action UI during a
committed rite, not environment state — the harvest fabric's own split).

**THE PRECISION CLAUSE (her first walk, 2026-08-22 — the law's second
half).** "Text can be genuinely used for precision rather than mixing precision
with fluff." Text is RESERVED for what a drawing cannot carry exactly — a
number (the scorch readout's "−20% fire res"), a bind glyph, a window bar, a
quantity — and it never DESCRIBES drawn state ("the salt breaks", "the glass
sings apart", "the water was never there"). The test for any proposed line:
*is this a measurement, or a caption?* A measurement may stay; a caption is a
drawing that has not been made yet. Corollary for builders: when a moment
wants to be FELT (a break, a give, a vanish), craft the animation — THE
DISSOLUTION GRAMMAR (§7b) is the standing answer for breaks — and spend the
text budget only where precision needs it.

**The precedents this country stands on** (all verified at HEAD): the tells
doctrine above; the harvest fabric's SHATTER-NOT-TEXT ruling ("the node
SHATTERS (the brittle pop grammar: flash + husk face, never text)" —
`engine/harvest.ts` header; `World.harvestSettle` makes zero `world.text`
calls); THE UNTITLED CLAIM (her ruling 2026-08-07: lair titles left all
player-facing objective prose — "a claim's identity lives in its mouth's own
distinct visual", `data/objectives.ts` over `ADOPT_CFG.titles`; a lair is
announced by its apron + spoor ring + a distinct door, never a banner); THE
BROIL LAW (the scald's warn IS the water roiling — one drawn word, learned
once, read everywhere); the collapse fabric's `cloud_frail` ("the shimmer IS
the leaving telegraph"); and her own rejected-gradient ruling on the
courtlands — "player prediction is key" — which binds every drawn tell here to
be PREDICTABLE, not merely pretty.

**THE LIE CLAUSE (the one sanctioned exception, inherited from the Mirage
Promise).** The mirage is the single place the frame is allowed to lie — and
only as an OBJECT wearing truth's exact face, that vanishes at reach with a
drawn death-breath (`WATER_LOOK` shared by reference; the `flicker` tell; the
`Flash.haze` refraction ring — `docs/engine/douse.md`). A mirage may never
displace a TESTED body's drawn position; drawn == tested holds for everything
that can hurt you. The veteran tells stay honest and small ("the wobble IS the
tell for anyone who has been burned before").

Two standing laws govern everything below (inherited verbatim from the scald
charter): **THE COMPOUNDING LAW** (§8/§9 are required content) and **THE
SHOW-DON'T-TELL LAW** (above).

---

## 1. Thesis — the mirror country

The desert is the sun's WEIGHT: heat pressing down on sand, the trek as the
content, the erg swallowing the horizon. The Salt Flats are the sun's MIRROR: a
dead lake's floor thrown back at the sky, so bright the land itself becomes a
lie and the light becomes a weapon.

The one-sentence identity, and the axis every design choice hangs on:

> **The Salt Flats are the country of SEEING. Everything on the pan can see you
> from a mile off, and nothing you see on the pan is certainly true.**

Three inversions, all drawn, all structural:

- **Nowhere to hide.** The pan's furniture already "blocks feet only (the pan
  keeps its long sightlines)" (`engine/levelgen.ts` ~1951): salt pillars, glass
  shards and bone arches are sight- AND shot-transparent, so the sight veil
  draws nothing here and a watcher's reach is bounded only by its own
  `detectionRange`. The watch fabric's ladder (unaware → stirring → searching →
  locked) becomes the country's grammar — the sentry sees you before you see it,
  and the only cover is the light itself.
- **Nothing you see is certainly true.** Mirages are WEATHER here, not
  furniture (§5): the shimmer front brings the false pools and the far ghost
  bastions and takes them away again; under it, a watcher's lock is capped at
  SEARCH beyond the shimmer's clear radius (the side-channel law — it knows
  WHERE, never WHO), so the lie cuts both ways.
- **The ground is a memory of water.** Salt crust over brine — walk it and it
  spiders, stand on it and the brine seeps up dark through the cracks, break it
  and you are wading caustic soup while what slept under the crust wakes (§4).
  The crust is the one country where the FLOOR is the ambush fabric.

What earns the biome-type (§11) is the pairing of the two: a country you can
see across whole, standing on a floor you cannot trust. The scald's skill test
was reading TIME; the flats' skill test is reading SURFACE — the crack pattern
under your feet and the shimmer line at the horizon — and that is exactly the
test THE SHOW-DON'T-TELL LAW demands be taught by the eye alone.

---

## 2. THE SURVEY — what stands (verified at HEAD `e1528ee`)

### The Glasspan (the desert's third face) — `src/data/tilesets.ts` `saltflat`

- `biome: 'desert'`, `depthAffinity {from .15, fadeIn .25, mul .7}`, the
  `dunefield` recipe with the ridges all but retired (`duneGap [560,800]`,
  `dunePans [3,5]` — hardpan lanes), `sizeW [3600,4800] × sizeH [2400,3200]`
  (the second-largest surface arena after the erg), `sky` open.
- Theme: `dayLight 1.75`, `heat 1.1`, **`swelter 1.2`** (the game's highest
  ambient scorch rate), `ambientFx heatHaze 1.0 + sandDrift .6`, ground
  palette **`['#2e2818','#4a4028','#6a5c3a','#8a7a4e'] bias .62`** — "a pale
  cracked floor — pan polygons, not dunes" — **khaki-tan, not white** (the
  white audit below).
- Variants: *shattered pan* (glass/fulgurite), *bonepan* (bone arches,
  ribcage runs, salt pillars), **'white blind'** (`salt_pillar [5,9]`,
  `salt_procession`, `heat_shimmer [6,9]`, theme `dayLight 1.9, swelter 1.35`).
- Rows: `salt_pillar`, `glass_shard` (brittle — "the glass sings apart!"),
  `fulgurite`, `bone_pile`, `heat_shimmer` (a GAMEPLAY field: the scorch bar's
  fast lane, `World.updateScorch`), `mirage_oasis [1,2]`, `mirage_caravan`,
  formations `salt_procession` / `fulgurite_scar`; landmarks sinkhole / canyon
  / `tar_pool`; compositions caravan_graveyard / buried_village / sepulcher_site
  ("glass preserves better than sand: the pan keeps its tomb doors").
- Packs: bronze_scarab, sand_skitterer, bombardier_beetle, dune_stalker,
  gnoll_longshot, sand_wyrm, broodmother, **salt_husk** (w3), **glass_stalker**,
  mirage_dancer, sandmaw_burrower, sarcophate_legionary (hard floor). Meld
  `saltflat_meld` "salt and glass glitter ahead". Name mills: Saltcrack /
  Glasswaste / Suncracked / Bleachbone / Blinding / Dead-Lake / Whitefire ×
  Pan / Flats / Glass / Mirror / Bed / Blind / Table.
- **No `lite`, no `fog`, no `creep`, no `puzzles`, no `collapse` on the theme;
  no harvest row of its own (it inherits the desert's `sunstone`); no kit file
  (the desert's kit is distributed — `regions.ts` hardpan/softsand/duneface,
  `doodadVisuals.ts` THE GLASSPAN KIT + THE MIRAGE KIT, the `dunefield`
  recipe).** All open ground.

### The mirage kit (the desert's, inherited by the pan) — `docs/engine/douse.md`

Three INERT doodad kinds on brittle `on:['near']` (reach 110–130):
`mirage_oasis` wears REAL water's exact face (`WATER_LOOK` by reference, no
shadow, no wet shore, no palms, a rare seeded `flicker`), `mirage_bastion` /
`mirage_caravan` are `mirageGhost` silhouettes ("their lie is the horizon's,
not the waterline's" — breathing alpha + heat shear, drawn late). Every pop
wears THE DEATH BREATH (`BrittleSpec.pop {haze}` → `Flash.haze`, a refraction
ring style — "no fill, no wash, the light layer skips it") **and a text line
("the water was never there…", "the walls scatter into heat…", "it was never a
caravan—")**; the caravan's pop is a weighted spawn POOL (stalker nest /
mirage_dancer troupe / salt_husk crew). `ambientFx heatHaze` is "the heat you
can see — deliberately faint" (seven faint sine polylines, no pixel
displacement). **There is no refraction, distortion or brightness primitive in
the weather layer; every `WeatherDef.radiance.mul` DIMS; the only additive wash
is the renderer's SUN-LIFT (`0.055 × dayLight` at noon ≈ 0.10 alpha at 1.9).**
`DashDelivery.decoyDuration` ("a mirage of the caster at the launch point") is
the player-side decoy grammar; `mirage_step` / `mirage_archer` already live in
the desert's SUN & SAND pools (`meta/unlocks.ts`, `vault_entered`).

### The kin that already wear salt

- **THE SIROCCO COURT** (`faction 'sirocco'` — "the deep desert's own… past the
  shimmer line the sand answers to older tenants"): mirage_dancer /
  heat_double / **salt_husk** ("the cured dead of the dead lake — crusted,
  seamed, and packed with brine"; material STONE; `salt_burst`; `deathBurst
  implode` — "they do not bleed, they SHATTER") / glass_stalker (ambush +
  assassin, the announce line) / dust_djinn / sun_priest / sandmaw_burrower
  (worm + burrow) / mirage_khagan (warlord; heat doubles at life knees) /
  khamsin_dervish / glasschanter. The desert's patron is `gnoll`; the Court is
  its deep tenant.
- **THE SAND SARCOPHATE** owns preserved UNDEATH (linen, chaos-resist, "nothing
  embalmed fears venom or rot", `ushabti_sentinel` with `watch {sweep,
  fan:'show'}` + post). `salt_ibex` (critter, butteland/karst) is already a
  salt-named grazer. `brine_cantor` is the depthkin's.
- **`MATERIAL_NATURE` has no `salt` row**; salt_husk wears `stone`
  (`remains: false`) — **a stone body leaves NO corpse**, which matters for a
  preservation biome (§8, §9).

### The wet salt pan, one country over — `brine_flats` (littoral)

"The drained seabed: salt pans in cracked mud, bleached reef heads, desiccated
kelp, caustic sinks — the Deep's exposed floor." Palette to `#bcb496`
(near-white — the second-palest surface ground), `heatHaze .45`, names
Glarewhite / Brinemirror / Shimmerpan / Cracklepan, `brine_sink` discs
([4,7]), the BRINESURGE creep (a shin-high wash leaving drying tide pools —
`convert.fade`) and THE TIDAL WALL (`line:'span'`, announced); kin
tide_skitter / salt_husk / tidewrack_shambler / the Coilborn. **`brine_sink`**
(`world/regions.ts` ~750): walkable, wading→swimming, `brine_burn` (a bare
chaos terrain sting — deliberately NO screen-fx row, NO douse: "the saltflat's
design commitment is a pan with no mercy", probe-pinned), severity 30, pathCost
2.6.

### THE WHITE AUDIT (her "only bright-white country", censused honestly)

No surface country renders bright white today. The cold countries are DARK
floors under snow dress (tundra has no palette — floor `#0c1115`, drift tint
`#93b6c8`; snowcrown `→#76859a`); ossuary is "dark matte bone" (`→#7a6f58`);
the Glasspan is khaki (`→#8a7a4e`). The palest surface grounds are the scald's
`sinter_terraces` (`→#d8d0b8`, travertine), then `brine_flats` (`→#bcb496`).
True whites (`#f7fafe`–`#fffdf6`) exist only in the AETHERIAL realm, which is
not surface country. **Defensible claim once built: "the only bright-white
SURFACE country" — and only after the repaint (§13 M0 carries it); the two
pale neighbours to separate from by palette are named in §11.**

### The desert's standing channels that the law names (for card 9)

`mirage_*` pop text ×3; `glass_stalker` / `sandmaw_burrower` ambush
announces; `glass_shard` brittle text; `brine_sink` enterText; the
Khagan's phase announces. All are the DESERT's standing behaviour and stand
untouched by default — the flats' NEW kit is born without them.

---

## 3. CARD 1 — COUNTRY or REGION (the case either way; recommendation at the end)

### What a country IS at HEAD (the parity survey, the scald's list verbatim)

A biome row (`world/biomes.ts BIOMES`: patron faction, mapColor, label,
spacing, `meld`, a climate claim, `allowedLayouts`, layoutParams, landmark +
structure chances) · a `BIOME_FIELD` weight (staged countries 1.7–2.3 — "staged
faces need the acreage"; the desert is 2.3 with the WIDEST spacing, 124) ·
faces staged by `depthAffinity` (the garden/desert model; faces may pin
recipes via `forceLayout`) · a kit file (single-file doctrine: `data/scald.ts`,
`data/warfront.ts`) · a meld row, lore rows, a faction + BOTH name mills, boot
imports, a probe + roster row SAME commit, `docs/engine/<country>.md`.

### OPTION A — THE COUNTRY (promotion): the Glasspan leaves the desert and becomes the Salt Flats' rim

- **THE RE-HOMING PATH.** The `saltflat` tileset flips its `biome` tag to the
  new row and becomes the country's RIM face (nothing built is thrown away —
  the kit, the variants, the names, the compositions all travel). Two new
  staged faces mint inward (§3c), plus a cave face and a den. The desert
  keeps FOUR faces (waste / tableland / erg / hivesands) — still a country by
  the warfront's two-face standard — and the "glasspan blisters" staging idea
  survives as the BORDER between the two countries (the meld carries it: salt
  glitters at the desert's edge, the pan begins past it).
- **THE CLIMATE CLAIM arrives free, and it is the separator the desert does
  not use.** Desert claims `warm ∧ dry` with NO elevation gate; butteland is
  the warm-dry HIGH; scald is the warm-damp LOW. The flats claim **`hot ∧
  arid ∧ elevation {to ~.42}`** (DIAL) — the pan floor, strictly inside the
  desert's bands on temperature/moisture and disjoint from it on elevation
  (the exact lever the scald used against the volcanic). Caveat from the
  desert's own comment ("hot∧arid starved deserts to <1% of land in sweep
  tests"): a triple conjunction needs a HIGH seed weight (≥2.0, DIAL) or a
  field band / existence floor (`BIOME_FLOORS` — farmland's precedent); the
  `desert_verge` tilt band (moisture .34–.5 × desert 1.6) sits above an arid
  claim and will not fight it.
- **THE FOREORDAINED GEOGRAPHY.** The relief fabric ends every downhill river
  "in a basin (the lake law)"; a basin terminal in HOT-ARID LOW country is a
  lake that EVAPORATED — a salt pan. The scald charter deferred the generic
  river-basin lake join as charted-not-built; the Salt Flats are its arid
  sibling: when that join is built, rivers that die in hot lows can hand the
  zone a `panAt` hint the way courses hand `riverSides` — and the map will
  already LOOK like that story the day the country ships (arid lows beside
  deserts, the white pan where the rivers stop). Recorded, not built.
- **What only a country can carry**: its own mapColor (white — nothing else on
  the map wears it; "the only bright-white surface country" is a sentence about
  the MAP as much as the ground); a `caveFace` (THE BRINE GALLERIES — the pan's
  only shade, §3c) — cave faces are per-biome; a den seat (`registerLair`
  keys on biome); harvest / lite / fog / weather / lair rows that key on the
  biome id (one row each — the harvest fabric's "a country joins by one row");
  a banner faction with its tongue; a kit file; its own docs + probe. And the
  show-don't-tell law holds cleanly on a clean slate: the country's kit is born
  text-free while the desert's standing lines stay the desert's.
- **Honest costs**: a new biome row REDEALS every seeded world
  (★NEW-BIOME-REDEALS-SEEDED-WORLDS — the scald paid it; saves carry zone
  memory by id so walked ground survives, but the field shifts); the desert
  loses a face it was landed with (her desert overhaul asked for "sub-biomes"
  — taking one away is her call, flagged); the `saltflat` biome-tag flip is a
  cross-country hunk (one line, but the desert's `depthAffinity` comment and
  the face-voice meld rows need a touch); the Sirocco Court's salt_husk must
  either stay a Court body that also walks the flats' rim table, or re-home to
  the flats' banner roster (card 5).

### OPTION B — THE REGION (deepen in place): the Glasspan stays the desert's deep face and grows the new grammar

- The crust (§4), the mirage front (§5), the glare/sentry kin (§6), the
  harvest row (§7, keyed `tilesets: ['saltflat']` on the provenance axis) and
  a second, deeper face (`brinepan`, staged `{from .5}`) all land INSIDE the
  desert country. No biome row, no redeal, no climate work, the desert keeps
  its "glasspan blisters" staging and the Sirocco Court stays whole; the
  desert's map stays gold and the salt reads as the desert's secret heart.
- **Cheaper by roughly a session** and zero world churn.
- **What it cannot carry**: a white map identity (the desert's gold wins the
  map); a cave face of its own (caveFace is per biome — the desert has none,
  and a brine gallery under the erg reads wrong); a den keyed on biome; the
  climate geography (no low-basin claim — pans blister at any depth, any
  height, which is the generative idea the desert was built on but the wrong
  geography for a dead lake); the "only bright-white COUNTRY" sentence (a face
  is not a country); and distinctness by construction — the Court's mirage/
  heat identity and the flats' preserved/crust identity share one pack table
  and one roster forever.

### OPTION C (named to be declined) — TWO SALTS

Keep the desert's Glasspan AND mint a new Salt Flats country beside it. Two
places wearing salt pillars and heat-shimmer fields is the distinctness
requirement failed at a glance, and the unique-id spirit violated in content.
Declined in the charter; listed so nobody re-litigates it.

### A SHAPE NOTE either way — THE GREAT PAN AS ONE EXPANSE (a sub-option, card 1b)

The FIELD mega-zone fabric ("the zone's silhouette IS the heat map", ~5.2k px,
boundary exits + BERTHS, the Shard Law chaining oversized blobs) is hardcoded
to one biome (`FIELD_BIOME = 'field'`, `world/fieldRegion.ts`) and its recipe
paints tallgrass + hedgerow. A dead lake bed IS one contiguous blob, and
`hardpan` already walks at 1.05 — the pan as an edge-to-edge expanse is "a
beautiful fit" structurally: one exported constant → a parameter, plus a
sibling of the field recipe (crust instead of tallgrass, a salt-rim instead of
hedge). Cost ~half a session; benefit: the country's HEART can be one great
white floor you cross like a sea, with the staged faces as its shores.
Recommended as an M2 option, not M0/M1 — the node country stands first.

### THE RECOMMENDATION (HELD at her first walk — the bar is §11; her M0 walk judges)

Her caution, verbatim-near: "the same as with the scald; we want to ensure
that this is really different enough from the desert that it deserves its own
country as a promotion" — else "expand the desert to be countries-within-
countries", and "this will depend on the intensity and number of variants and
how different the salt flats acts as its own actual region/country." So the
recommendation below is CONDITIONAL: it stands only if the flats clear THE
DISTINCTNESS REQUIREMENT (§11 — the desert axis table, THE INTENSITY LEDGER,
the probe pin), and the judging happens at her M0 walk, which is country-
neutral by construction (built in place on the standing face). THE SUB-COUNTRY
shape (§11) is written out as a real mechanism so the alternative is a choice,
not a retreat.

**A — THE COUNTRY, by the re-homing path (if the bar is met).** Her identity line is a country's
(the map, the white, the climate, the cave, the den, the banner kin); the
compounding law wants acreage for faces; the show-don't-tell law wants a clean
slate; and the foreordained-geography story (pans where arid rivers die) only a
biome row can tell. The region path is the honest fallback if she wants the
desert to keep its glasspan — everything in §4–§9 lands under either, only
the seats differ (card 1 names what changes). M0 (§13) is deliberately
country-NEUTRAL: the white spike face is built IN PLACE on the standing
`saltflat` tileset so her walk needs no redeal — the promotion lands in M1
only after her word.

### 3c. The proposed staging (rim → heart), three faces + a cave + a den

| face | band (DIAL) | the read |
|---|---|---|
| **THE GLASSPAN** (`saltflat`, kept — the rim) | `{to .45}` | the dead lake's SHORE: the promoted face REPAINTED white, lightning glass, salt pillars, the bonepan and shattered-pan variants kept; the crust begins here at LOW coverage (learnable pockets of brittle crust among solid hardpan — the tutorial the rim owes); the mirage front's first lies; the desert's Court still walks the rim table as neighbours |
| **THE BRINEPAN** (`brinepan`, new) | `{from .3, to .8}` | the signature face: crust over brine at full grammar — most of the floor is crust, the hardpan lanes are the safe roads (the dunefield's `dunePans` inverted: pans become the CRUST and the lanes become the causeways); brine sinks stand open where the crust already gave; the under-crust kin live here; the brine flood and the shrimp tide pour here; the shimmer front's home |
| **THE WHITE BLIND** (`whiteblind`, the variant promoted to a face) | `{from .6}` | the glare heart: `dayLight 1.9`, pillar forests in `salt_procession` lines (where the standers wait — §8), the GREAT SINK (the heart's landmark: an open brine lake ringed by the DEEP crust that drops to the galleries — §4's deep regime), the heliograph sentinels' posts, the den mouth |
| **THE BRINE GALLERIES** (`brine_galleries`, `caveFace`) | cave envelope | halite caverns under the pan — THE PAN'S ONLY SHADE (sky sheltered by derivation: no scorch, no glare, no shimmer — the country's relief is underground); brine pools, salt curtains, the lurkers' nursery; reached by the cave roll AND by falling through the heart's deep crust (the pitfall descend — `ZoneTheme.pitfall {kind:'descend'}` on the heart face) |
| **A DEN** (off-frontier) | den lane | THE CURING PIT — the brined's lair under the great sink (§8c) |

Biome row proposal: id **`saltflat`** (the desert precedent: biome id == rim
tileset id; label "The Salt Flats" — naming is card 8), climate **hot ∧ arid ∧
low**, `BIOME_FIELD` **~2.0** (DIAL; the triple conjunction's starvation
caveat), spacing **~110** (DIAL — wide like the desert's 124, a touch tighter:
the pan is crossed, not trekked), mapColor **bone-white** (`#efe9dc`-family,
DIAL — nothing else on the map wears it; the aether's whites are off-map
realm), patron faction **the brined** (§8, working name), `allowedLayouts`
the dunefield at pan dials (the recipe stands; `dunePans` high, `duneGap`
wide, ridges retired — the Glasspan's own settings) with `massif` at low
coverage (`massifCoverage [0.04,0.09]` — the worked shire's sparsest regime is
already authored; `healMassifWeave` guarantees the weave) for the massif-sparse
faces, and `forceLayout` reserved for the heart if the great sink wants a
conform recipe.

---

## 4. THE CRUST LAW — brittle ground under the show-don't-tell law

Her identity: salt-crust BRITTLE ground. Her law: fragility reads from
spreading cracks, sheen changes and footprint wakes — never a floater. The
survey's verdict is unusually clean: **the crust's mechanical home exists
whole, and its existing DRAW is already the exact read she asked for.**

### The home: THE COLLAPSE FABRIC, reused verbatim (`engine/collapse.ts`, `docs/engine/collapse.md`)

`ZoneTheme.collapse` already models ground that gives under contact:
`melts: [kinds]` names which walkable kinds may crumble (the High Spires'
`cloud_frail` doctrine — "on spire ground ONLY frail cells ever crumble: the
courts and the marble stand forever"), `contact {delay, radius}` arms cells
under feet, `crumble` seconds of visible shaking before the void write,
`region` is what a melted cell BECOMES, and the per-cell state machine
(`Solid → Arming → Crumbling → Void`) is a typed array the renderer already
overlays: `drawCollapseOverlay` iterates the active cells and, scaled by
`crumbleFrac`, shivers them, DARKENS them (a `#0c1220` sink fill rising with
the fraction) and strokes radial CRACKS from the cell heart — over the baked
floor, under doodads, view-culled, zero new render pass. **Read that as salt:
the crust spiders under your weight, goes dark and wet as the brine seeps up
through it, and gives.** The draw is the tell; the tell is the test; nothing
is written.

The adaptation is four data facts and one small gate (the builder's whole
list):

1. **A `salt_crust` region row** (walkable, laid 'ground', white with a dry
   sheen, `surfaceWake` for the drawn footprint ripple — "one data word") —
   named in `melts: ['salt_crust']`, so hardpan lanes, causeways and courts
   stand forever and only crust ever cracks. Palette is the country's white.
2. **`region: 'brine_sink'`** as the melt target — NOT a void kind. brine_sink
   is already walkable wading/swimming with the brine_burn sting, pathCost 2.6,
   severity 30, no douse. **Breaking through is a GROUND SWAP: you are in the
   brine — slowed, stung, swimming if it is deep — no fall, no teleport, no
   text.** With a walkable melt region the fabric's `fallTest` never fires;
   `fall` is simply not authored on the shallow faces.
3. **Contact-only** (no `ambient`): footfalls alone crack the crust — the
   Spires pattern; the rim-inward melt and spine machinery stay dormant.
4. **THE WEIGHT GATE** (the one engine touch): the fabric arms on any eligible
   foot today; the Salt Flats want the crust to read MASS. `World.updateCollapse`
   hands the field a `feet` list — filter it by `effectiveWeight()` (the squish
   fabric's one predicate, `canSquish`, is the precedent) and scale each body's
   arm delay by weight (DIAL: `delay / weight^k`). Consequences, all drawn ==
   tested: lite swarms and critters never crack it (they skate); the player
   cracks it at a walk's pace; a salt crab or a brute breaks through at a
   step and WADES — you watch the heavy kin make holes, which teaches the rule
   better than any line. THE LIGHT FOOT is then one stat (`softStep` — the
   squish fabric's own deferred seam, "a treader-side stat that waives the
   crunch for a careful build"): a support/passive that lets a build walk the
   crust unarmed (§9).

### THE CRACK LADDER (what the eye reads, in order)

- **Pristine**: white crust with a dry glitter sheen (the region's static
  visual; `animate: 'shimmer'` is the fabric's own "leaving telegraph" word —
  here NOT used at rest, so the pristine floor reads CALM and only the armed
  cells move).
- **Arming** (feet on it, the delay running): hairline cracks spread from the
  footfall — the overlay's first strokes at low fraction; `contact.radius`
  means the cracks grow a little PAST your body, so you see the ring widen
  around you while you stand.
- **Crumbling**: the cracks spider, the cell darkens and WETS — the sink fill
  is the brine rising through the crust; the shiver is the crust sagging.
  DIAL the overlay tint for salt (`VIS_CFG.collapseFx` or a per-spec `look`
  the way `FluxSpec.look` overrides cloud tints): crack colour brine-dark, the
  sink fill brine-teal instead of void-black.
- **Given**: the cell is brine — the floor chunk re-bakes through the grid's
  own dirty rects (the region row supplies wading, the sting, the pathCost,
  the AI's detour) and the crust's edge draws as a broken white rim around
  open water. No pop text, no flash by default (a small salt-spray flash is
  the honest punctuation — the fabric already adds cloud-bursts on void; skin
  it as spray; DIAL).
- **THE FOOTPRINT WAKE**: `surfaceWake: 'ripple'` on the crust row draws
  expanding rings behind a moving body (the renderer's one-word hook) — on
  salt, read as dust-and-crackle prints. Her "footprint wakes", one data word.

**THE TEST, applied:** a first-time walker stands still on crust, sees cracks
ring out around their feet and the ground go dark and wet under them, and
steps off — or does not, and is wading. The kin teach it faster: the standers
never stand on crust, the crabs break through it, the shrimp tide skates it.
No word is needed; no word is used.

### THE RE-KNIT (the crust heals — drawn as a film, never a pop)

The collapse field is zone-transient (rebuilt at `loadZone`), so the crust
re-knits BETWEEN visits for free. In-visit re-knit is the fabric's
`annexCell` / `releaseCell` seam ("the conjure/repair seam" — already named in
the file): a slow sweep re-crusts brine cells no body has stood on for N
seconds (DIAL, minutes-grade for the deep, tens of seconds for a footfall
hole), drawn as the white FILMING OVER from the rim inward — the evap fabric's
step grammar inverted, and under her fade-not-pop ruling it eases. Card 2
asks whether in-visit re-knit is wanted at all (it is: a country whose floor
only ever gets worse reads as a one-way trap, and the re-knit is what makes
the shrimp tide's skating and the crab's holes a LIVING surface).

### THE SURFACING (what rises when the crust gives — one small open seam)

The caravan's pop is already a weighted spawn POOL on a brittle break. The
crust wants the same grammar on the collapse event: `CollapseSpec.onVoid` — a
weighted pool rolled per void write (capped per visit, cooled per area) that
surfaces the brine's own: the brine lurker (§8) breaching where the crust
opens, a shrimp tide pouring from the new hole, or nothing. Drawn honest by
construction: the lurker was ALREADY visible under the crust as a ghosted
shape (`StatusDef.ghostAlpha` — "present-but-inside bodies draw faded rather
than vanishing", the burrowed parasite's own lever) — you broke the lid off
the thing you could see. The `{do:'burrow', kinds}` ground verb ships
(submerge, travel underground to the matching patch nearest the target, a
telegraphed emergence) and `PerceptionSpec.xray` is "the burrower's ear to the
ground"; the lurker's emergence VOIDS crust cells to brine through the same
annex seam — drawn == tested at the hole.

### THE DEEP REGIME (the heart face only — the galleries' door)

On the White Blind's deep crust around the great sink, the melt target is a
NON-walkable deep brine (`brine_deep`, an `eject`-class row like the lake's,
or a true pit door) and the theme carries `pitfall: {kind:'descend'}` — the
standing pitfall law then routes a swallowed walker through `beginPitDescent`
into a minted drop-cave: **fall through the deep crust and you land in THE
BRINE GALLERIES** (the collapse fabric's `beginSkyfall` already carries "the
pit-word override: if no fall spec and `pitPolicyFor` says descend →
`beginPitDescent`"). Zero new engine; the cave face and the fall are one
authored theme line apart. Drawn: the deep crust wears a darker under-tone
(the brine is far below — the `window`-visual understory grammar if the
builder wants the gallery lights showing through the deepest cells; optional,
DIAL). Hostiles are never walked off by steering (the pitfall law's `!forced`
return) — only a shove sends a body down with credit.

### THE FLOOD MIRROR (weather × crust — the show-don't-tell set piece, M2)

When RAIN crosses the pan (`WeatherDef.wets` → `Actor.rainWet`), the whole
floor goes to a thin sheet: the crust's `surfaceMirror` visual turns on (the
ice/tide-pool mirror — bodies draw a faded flipped ghost beneath them) and the
pan becomes the sky's mirror — the salar after rain, the single most
photographed thing a salt flat does. Mechanically the wet crust ARMS faster
(contact delay × a wet multiplier, DIAL — read off `World.skyFront()`), so the
sky TELLS you the floor is weak by painting itself on it. Spectacle and
mechanic in one drawn word; her "drawn == told" made literal. Weather dress
(`WeatherDef.dress`) plants the pooling sheen while the front holds and dries
it via `evap` as it passes (the transience doctrine — the pan forgets).

### Dials (all DIAL)

`contact.delay` ~1.6s at weight 1 (the Spires run 2.0), weight exponent
~0.6, `contact.radius` ~14, `crumble` ~1.1s, re-knit quiet ~25s (footfall) /
~180s (deep), crust coverage per face (rim ~25% / brinepan ~65% / heart ~45%
+ the deep ring), onVoid pool weights + cap, wet multiplier ~0.5, overlay tints.
Genqa: crust cells are WALKABLE at generation (the reachability invariant and
every portal clear hold as-is — the runtime swap makes the floor honest about
not lasting, the collapse fabric's own doctrine); a probe pins drawn == tested
(the overlay reads the same array the melt writes), the weight gate, the
ground swap (a walker ends WADING, never teleported), and the no-text law
(zero `world.text` calls on the crust's whole path).

---

## 5. THE MIRAGE — weather as the lie (pure look vs a perception interaction)

Her ruling: the mirage is a DRAWN phenomenon — a heat-shimmer veil / weather
FX — not a described one. The survey says the drawn vocabulary is thinner
than the desert's furniture suggests: mirages are DOODADS today (the kit), the
haze is a faint ambientFx, and **no refraction, distortion or glare primitive
exists in the weather layer**. So the country's one genuinely NEW drawn
primitive lives here — and it should be spent on exactly one thing.

### THE SHIMMER FRONT — `mirage` as a `WeatherDef` (the pan's own weather)

- A registered kind (`registerWeather`): `birthGeo hot ∧ arid` (+ low
  elevation), `skyWeight` day-heavy (a noon phenomenon — dawn/dusk are the
  caravan hours), **`radiance` NOT dimmed** (every shipped front dims; the
  shimmer is a clear-sky event — `mul 1.0`, or the starfall's `floor` arm if
  the glare hours want a lift, DIAL), `wets` absent, `wind` low. Like the
  scald's mist, the country's climate claim IS its weather gate — no
  per-tileset pool.
- **THE HEAT-LINE (the new primitive — the one render ask).** A `WeatherFxDef`
  form beside streak/flake/bank/mote: a WORLD-ANCHORED refraction band (the
  anchored-sky law: the front is a PLACE, dense at its heart, thinning to its
  rim, fixed as the camera pans) drawn as a horizon-ward shear of the DISTANT
  layer — the `mirageGhost` painter's breathing-alpha + sideways-shear law
  promoted from a doodad to a sky layer, plus the `Flash.haze` refraction-ring
  vocabulary for the wobble; ground and furniture beyond ~R from the camera's
  eye draw doubled/sheared into a pale lie-line, nearer ground stays honest.
  **THE LIE CLAUSE holds:** bodies are never displaced — only the ground and
  the sky's reflection shear; the pan's furniture is sight/shot-transparent
  anyway, so nothing tested ever moves. Perf-honest by budget (one sheared
  redraw of a downscaled far-band; `npm run perf` gates it — the sweep's
  frontier tilesets auto-join).
- **THE LIES ARE THE WEATHER'S (dress mirages).** `mirage_oasis` /
  `mirage_bastion` / `mirage_caravan` move from tileset rows to the front's
  `WeatherDef.dress` rows (the transience doctrine — planted while the front
  holds, dissolved via `evap` as it passes, deterministic per zone+kind): the
  shimmer brings the false pools and the far ghost towers and takes them away.
  Under the law their pops wear THE DEATH BREATH ONLY (the haze ring; no
  line) — card 9 for whether the desert's own rows lose their three lines too.
  A clear pan has no mirages; a pan under the shimmer is full of them. Learn
  the weather, learn the lie.
- **GHOST HERDS (cheap, text-free, honest).** Two new `mirageGhost` forms —
  `mirage_herd` (a far line of walking shapes) and `mirage_warband` (a
  silhouette column) — dress rows that draw LIGHT, not matter: no shadow, no
  collision, no targeting, the breathing wobble as the tell, the haze ring at
  reach. They make the horizon lie about THREAT, not just water — "is that a
  warband or the heat?" — without a single actor minted. (The ambitious
  sibling — MIRAGE KIN as real dormant bodies that exist only while the
  shimmer holds, on the vent-dweller fabric's pure-clock shape rebound to a
  shimmer read — is a coda item, §13 M3.)

### 5c. THE PHANTOM EVENTS — her shape at the first walk (why mirage-as-weather is ratified; THE ILLUSION IDENTITY)

Her words, verbatim-near: the ghost herds could be "a very interesting idea
where an event itself could basically look as though it's beginning to play
out... and then dissipate in front of the player, giving the entire salt flats'
identity something illusion-based rather than something permanent. For
example, something like a migration event that actually begins to appear out
of nowhere, and the player encroaching upon the migration would have the
entities simply dissolve around the player, only to re-appear on the far side
of them, effectively becoming nothing but a shader layer that can't actually be
interacted with; a true illusion."

**THE ILLUSION IDENTITY (the country's second spine clause).** The pan's
content is partly IMPERMANENT by design — four impermanences, one identity:
phantom EVENTS that were never there (this section); mirages as WEATHER
(furniture that comes and goes with the shimmer, §5); a FLOOR that gives and
re-knits (§4); and BREAKS that crumble and fade rather than vanish (§7b). Each
is drawn, each is honest about itself by its own tell, and together they make
the Salt Flats the one country where what you see is a question and what you
stand on is a promise the ground keeps only for a while.

**THE PHANTOM LAW (encoding her shape):**

- **A phantom is a DRAW LAYER, never an actor.** No `Actor`, no AI, no
  collision, no targeting, no threat, no XP, no objective count, no aggro —
  "nothing but a shader layer that can't actually be interacted with." It
  cannot be hit, lured, grabbed or counted; the light layer skips it
  (refraction, not emission — the haze doctrine); it casts NO shadow (the
  mirage kit's founding rule: "a shadow is exactly what a mirage cannot
  afford").
- **It DISSOLVES at reach and RE-FORMS beyond.** Each phantom body within
  `dissolveR` of a local hero fades out through the haze-ring vocabulary (the
  death breath, per body), and the column re-forms past `reformR` on the far
  side of the walker — the herd parts around you like heat and closes again
  behind. Per-VIEWER by construction (the dissolve is the viewer's own eye —
  render-only; in couch/co-op each seat sees its own parting).
- **THE PHANTOM CLOCK — pose is a pure function of (zone clock, seed).** The
  track fabric's `trackPose` law verbatim: every body's position along its
  path at time t is computed, never stored — so every co-op seat and every
  resume agree with ZERO wire, and a phantom column looks identical from two
  screens while each viewer parts it for themselves.
- **Drawn honest by its tells**: the breathing alpha + sideways heat-shear the
  `mirageGhost` painter already wears, no shadow, the dissolve itself.
  Veterans learn a phantom by the wobble before they walk into it; newcomers
  learn by walking into it once and losing nothing but certainty.
- **It is the WEATHER'S**: phantoms seed ONLY while the shimmer front holds
  over the zone (the reason mirage-as-weather is ratified — "So I love the
  idea of 'Mirage as weather' because of that!"): a clear pan shows nothing;
  a pan under the shimmer fills with things that are not there. Rows keyed
  `when: { weather: ['mirage'] }` (the conditioned-pour idiom), seeded per
  zone on a salted stream, capped per zone.

**The debut set (each one a real event's LOOK without its substance):**

| phantom | what appears | the real thing it borrows |
|---|---|---|
| **THE PHANTOM MIGRATION** (her example) | a herd band — aurochs / striders / the great tuskers — walking a long chord across the pan out of the shimmer, grazing-pace, dissolving around you and closing behind | the MIGRATION package (`packages/defs/migration.ts` — a living-world beast herd crossing the plains as a directional band; its roster's baked looks are the sprites) |
| **THE PHANTOM CARAVAN** | a laden train at rest or on the move — the `mirage_caravan` promise that WALKS, camels and carts and drivers — and is nothing when reached | the caravan grammar (the procession objective's column; the caravan_graveyard's carts) |
| **THE PHANTOM WARBAND** | the Sirocco Court — or a gnoll muster — marching the rim in silhouette: the desert's own threat as the flats' lie; is that column real? | the faction rosters' baked looks |
| **THE PHANTOM PILGRIMAGE** (far echo, optional) | a lantern-line climbing nothing at dusk — the scald's terrace column seen where no terrace is | the pilgrimage's carried-lamp look |

**Implementation seams (render work, not engine work):** a `render/vis/
mirageLayer.ts` beside the lite tier's `drawLite` (one composited sprite per
body — the cheapest blit path in the renderer; the portrait fabric proves any
def draws AS ITSELF from the same bakes), fed by `PhantomSpec` rows (`kind`,
`path` (a chord across the arena, rolled from the salted stream), `count`,
`looks[]` (real def ids — sprites from the bake cache), `speed`, `dissolveR`,
`reformR`, `life`) declared on the front (`WeatherDef.phantoms`) or the theme
(`ZoneTheme.phantoms` + `when`); THE PHANTOM CLOCK derives every pose; the
dissolve uses the `Flash.haze` ring per body; co-op ships nothing (pure
f(clock, seed)). Cost: ~half a session of render work — M1 after the heat-
line, with its CHEAPEST face already in M0 (static ghost herds as mirageGhost
dress that pop at reach — the brittle `near` grammar that ships today; §13).

**The compounding hook (a coda card, NOT assumed — her call):** the lie with
teeth. The Mirage Promise's own precedent is that the false oasis bites
because water is real refuge; a phantom column could hide REAL kin — the
standers walking INSIDE the phantom herd, a true warband two bodies deep in a
false one — so "which of these shapes is real?" becomes the country's question
at scale. Pure illusion is what she asked for first; the teeth are carded
(card 3d) for after she has walked the pure form.

### THE PERCEPTION INTERACTION — card 3's question, answered structurally

- **(A) Pure look**: the front + the heat-line + dress mirages + ghost herds.
  Recommended as the M0 face: the lie is complete without touching a single
  tested number.
- **(B) THE SHIMMER CAP (the one interaction recommended for M2)**: under the
  front, a watcher's climb toward LOCK is capped at the SEARCH rung beyond the
  shimmer's clear radius — exactly the watch fabric's existing law for side
  channels ("noise and scent say WHERE, never WHO") applied to far sight under
  heat. The sentry still sees you across the whole pan (stir → search, the
  head turns, the investigate walk plants — drawn by the fan in search
  colour), but it cannot LOCK until you are inside the clear radius, or until
  pain (pain needs no ladder) or a shout (a kin's lock jumps ladders) closes
  the gap. Structural, faction-blind, drawn == tested by construction (the fan
  reads the same stamps), and it turns the mirage into a tool the player can
  read from the fan's colour: search-orange at range means the shimmer is
  holding the lock off. Implementation is one clamp in `feedWatch`'s sight lane
  keyed on `skyFront` + distance (DIAL radius ~420).
- **(C) The player's own far sight**: deliberately NOT touched. The player's
  eye is the screen; the heat-line already shears what they see at range, and
  a second lie layered on tested bodies would break THE LIE CLAUSE.

### THE GLARE HOURS (weather and radiance, folded here because they share the sky)

Noon on the pan is the glare; the country's `dayLight` already runs 1.75–1.9
(the SUN-LIFT's brightest wash). The glare's PERCEPTION half is §6; its LOOK
half is: the sun-lift's warm additive breath (standing), a mild edge bloom on
the `pall` screen kind in a pale colour worn as a zone STATUS under open sky at
high radiance (the one wash-toward-white the game owns — "vision pales to a
white-out" is swoon's own doc line; `RadianceCond {radiance: {from .85}}` is
the gate, zero engine), and the shimmer front's own lift. NOT a damage tax (the
scorch bar already prices standing in the sun; THE COMPOSITION LAW says a
second ambient bar must bring a NEW texture — see card 5b).

### Night on the pan (the beauty pass)

A clear night pan under stars is THE STAR MIRROR: the `surfaceMirror` visual
at low alpha keyed on radiance (the flood mirror's dry sibling — the salt's
glitter throwing the sky back), the pillar forests as silhouettes, dust devils
(the `sandDrift` ambientFx already carries "a DUST DEVIL window") walking the
flats. No second hazard regime: the night is where the country is beautiful,
and where the watch fabric's ladders decay (the standers sleep — §8).

---

## 6. THE GLARE + THE WATCH COUNTRY (the sentry/sniper identity on ground with nowhere to hide)

### What is already true (and must be SAID in the charter, so nobody builds it twice)

- The pan is the most occlusion-free ground in the game: pillars/shards/arches
  are `blocksShot: false` with no `blocksSight`, `sightShadowFrac` returns 0 for
  them, the sight veil skips the sheet ("zones with nothing to occlude skip it
  entirely"). `heat_shimmer` is a ground decal.
- **There is no fog-of-war, no reveal radius, no vision radius.** What the
  player sees is the camera frame (classic zoom 1.3); what a watcher sees is
  `detectionRange` (base 520, `MonsterDef.detection` multiplies — the barrow
  watchman's 1.35 is the longest eye shipped, ×1.5 alerted) with **no global
  ceiling** (`relentless` → infinity) — and `bombard` guns are perception-free
  zone-wide by law ("the battery does not need to SEE you"). **So on the pan,
  the sentries already out-see the screen.** The charter's job is to make that
  READ, not to invent it.
- No radiance → perception coupling exists anywhere (`dayLight` is consumed
  once, by the sun-lift). A glare that feeds perception is a new seam — and
  the survey names its cheapest honest form.

### THE WIDE FRAME (card 4a — the country's camera)

A per-tileset camera pull-back (a `TilesetDef.camera` zoom lever beside the
existing mode pin, DIAL ~0.85× on the pan faces) so the player's eye and the
country's reach AGREE: you see farther on the pan because the pan is a place
you see farther. Show-don't-tell at the frame level — the openness is told by
the frame widening as you cross the border (the meld) and tightening again in
the galleries. Honest costs: more bodies drawn per frame (perf-gated; the pan's
furniture is sparse by design), couch-fit composes (`couchFit` floors at its
own stretch cap). Recommended; her walk decides the number.

### THE GLARE AS A PERCEPTION LEVER (card 4b — recommended shape)

Under open sky at high radiance on pan ground, everyone wears a zone-granted
status (`glarestruck`, working name — the structural twin of the Gloaming's
`gloomveiled`, which cuts BOTH `detectionRange` and `detectability` so "both
edges cut the same cloth"): the glare LIFTS `detectability` for every body
standing on the white (you are a dark mark on a white sheet — and so are they),
folded through `senseReach` so the watch fan widens by exactly the same
number (drawn == tested by construction, the survey's own recommendation), and
it is NOT a damage or accuracy tax. Shade (a pillar's thrown shadow — the
`occlude` rule that already feeds `isShaded`, the galleries' roof, night)
drops it. Sleeping watchers and the shimmer cap compose with it honestly: the
glare makes you seen from farther; the shimmer keeps the lock off until you
are close. Gates: `RadianceCond` + `ground:salt_crust|hardpan` + sky open —
zero engine; one status row + one grant sweep (the swelter/scorch grant idiom).

DAZZLE stays KIT (§9): the heliograph sentinel's flash and a player flash-gem
apply a short `dazzled` (the `blind` ladder is claimed by the harried cloud's
own comment — "never a blind (that ladder is claimed)" — so dazzle is its own
row: accuracy + detectionRange down, `durationOverride`-capped so a pack can
never chain you dark — ash_smother's own lesson), screen `pall` in pale
gold, on monsters a `fickleSpan`-style lock lapse (the attention-span daze).

### THE SENTRY KIN AND THE GUN LINE (the watch fabric's debut country)

The watch fabric's debut was the barrow (a downs lair); the pan is where it
becomes a COUNTRY's grammar. `WatchSpec` rows on the flats' kin: the
heliograph sentinel (`sweep` posture, `fan: 'show'`, `detection ~1.5`, `post:
true`, a long `alertShout` — the tallest thing on the pan, and it turns its
mirror-shell to scan; its cone is drawn, its reach is the horizon), the
standers (`sleep` posture by day — eyes shut until you are close; §8's statue
law), the brine lurkers (no cone — `PerceptionSpec.xray` tremor-sense, the
burrower's ear: they feel footfalls through the crust, which is the only
"sight" the floor has). The gun line: a `bombard` wearer on the pan (a salt
mortar / the brined's siege-shell — faction-agnostic by construction: "a
salt-pan mortar line… ride the same rows") makes the long-sight country a
long-REACH country; its impact dress dries on the crust (the transience
doctrine) and its shells CRACK the crust where they land (the collapse annex
seam again — a shell-hole is a brine hole). The watchtower already rolls in the
desert biome (0.3); `gnoll_longshot` already takes the high ground. **Sound is
the counter-currency** in a country where sight is cheap: `noiseOnHit` (the
Ringing Report) rings every watcher to SEARCH — on the pan that is a lure you
can see work, because the fans all turn.

---

## 7. THE HARVEST-NODE FACE — salt as a node texture

The harvest fabric (landed 08-19): themed node rows keyed `biomes[]` /
`tilesets[]` ("a country joins by one row, ZERO tilesets.ts edits"), a consent
press → a keyed rite under the `harvest` TimeHold, payout in essence through
the standing drop path, and THE SHATTER-NOT-TEXT ruling (flash + husk face).
Today a Salt Flats zone inherits the desert's `sunstone`; **there is no salt
row.**

- **THE SALTBLOOM** (`harvest_saltbloom`, working id `saltbloom`): a halite
  efflorescence — a white crystal bloom heaved up through the crust — keyed
  `biomes: ['saltflat']` (country) or `tilesets: ['saltflat','brinepan',…]`
  (region), weight 1, accent the country's brine-teal so its prompt chips,
  arming ring and shatter flash speak in the pan's colour. Painter: the
  `shard` painter in a NEW salt material (§9 — matte-white facet stipple), or a
  new `saltbloom` painter under THE NEW-PIECES PREFERENCE.
- **ITS OWN HUSK FACE.** The harvest pass banked "per-biome husk faces (one
  shared grey husk today)" as a coda — the Salt Flats fill it: a spent bloom is
  a white crust STUMP, not a grey husk. One field (`HarvestNodeDef.huskKind`,
  default the shared husk) generalizes the fabric; the law holds (the crumble
  SHOWS and the dust remains — the quiet reclass).
- **THE BREAK IS A CRAFTED SHOW (re-shaped at the first walk — her ruling;
  card 6).** The v1 text named a mechanic ("the shatter shakes the pan" — the
  settle arming the crust ring) and she read the slogan as a descriptor; the
  lesson stands either way: under THE PRECISION CLAUSE the node's break gets
  NO caption and NO slogan — it gets an ANIMATION. The saltbloom SHATTERS
  (crystal faces splitting along their facets), leaves a DEBRIS FIELD of salt
  shards on the crust, and the debris FADES over time (her fade-not-pop law) —
  the husk face is the debris, not a grey stump. Because "that animation is
  basically already a want that can be applied across a plethora of instances;
  secrets, rubble, node collapses, etc", it is NOT built as a saltbloom
  one-off: THE DISSOLUTION GRAMMAR (§7b) is built FIRST as its own offshoot,
  and the saltbloom is its harvest-side consumer. (The crust-ring arming is
  kept only as a subordinate dial for AFTER the animation exists — the debris
  landing on crust that then cracks, drawn by the same overlay, no word
  anywhere; default OFF, her call.)
- Consent mode stays the fabric's (`HARVEST_CFG.consent`, her standing flag —
  no per-biome fork); payout stays essence (the spoils law and the
  conservation pin untouched); placement stays the boot pass (POIs consumed
  last). Sealed/sanctuary ground stands no nodes — the galleries' den, if
  spoils-sealed, joins by law.

### 7b. THE DISSOLUTION GRAMMAR — the offshoot built FIRST (her word; planned-passes #26 promoted)

Her ruling at the first walk: the saltbloom's break should be a crafted
animation "and then fading eventually", and since that "is basically already a
want that can be applied across a plethora of instances; secrets, rubble, node
collapses, etc; we may want to create this as an offshoot branch prior to a
saltbloom implementation." This is THE CRUMBLE SEED she parked at the scald's
third walk (planned-passes #26: rocks "crumbling away into an animation,
leaving a debris field and then slowly fading (for something like the secrets),
as it sort of builds on top of itself") — now PROMOTED from record-don't-build
to a prerequisite offshoot. It deserves its own chip + short charter; the shape
as this charter sees it, so the saltbloom can name what it will consume:

- **THE GRAMMAR**: one open registry of BREAK VOCABULARIES — `DissolveSpec {
  break, debris, fade }` — composable onto any breakable by data: `break` = the
  animation (a staged crumble: the body's own painter drawn as pieces
  separating along its natural seams — facets for crystal, strata for rock,
  planks for wood — over N frames; the rampage fabric's `fellFace` already
  draws crushed pieces AS THEMSELVES squashed, the nearest kin), `debris` =
  the field it leaves (a ground-order doodad kind — salt shards, rubble,
  splinters — with the quiet-reclass law: the dust REMAINS), `fade` = the slow
  leaving through the standing evap lane (`Doodad.evap` + the soft-dry ease —
  her fade-not-pop ruling, already law).
- **THE CONSUMERS, in order of appetite**: the secrets framework's break-
  reveals (#17 — secret walls and cracked faces crumbling honestly into the
  thing they hid; the natural first consumer, her own example), rubble and
  brittle pops (the wave-2 hazard kinds: gas pods, urns, glass shards — the
  `BrittleSpec.text` line becomes unnecessary the moment the pop SHOWS),
  harvest nodes (the saltbloom's shatter; the per-biome husk face becomes the
  debris field — the harvest pass's banked coda closed by the grammar itself),
  node collapses (the crust's give-and-re-knit is the inverse motion and can
  wear the same vocabulary for its edge), and the rampage fabric's felled
  pieces (already half-there).
- **THE LAW IT SERVES**: THE PRECISION CLAUSE — every break that currently
  speaks ("the urn shatters!", "the glass sings apart!", "the span gives way!")
  is a drawing not yet made. The grammar is how those lines retire WITHOUT a
  loss of information: the crumble is the sentence.
- **Ordering**: M-DISSOLVE (§13) runs as its own lane BEFORE the saltbloom
  lands; the node's row waits on it. The crust (§4) does NOT wait — its
  break-through is a ground swap drawn by the collapse overlay, a different
  motion — but its re-knit edge may adopt the grammar later.

---

## 8. FAUNA ROSTER (required — all proposals, one line each, fabric named)

The compounding law's middle layer: what lives on salt. The banner faction is
**THE BRINED** (working name — natural preservation, NOT undeath: the pan keeps
what it kills, whole; the Sarcophate owns linen and chaos, the Sirocco Court
owns heat and mirage, the brined own the CRUST and the CURE). Diplomacy-silent
debut (the jotun/coven law); tongue rows in BOTH name mills at landing (the
merefolk lesson); `FactionSpec` via the package registrar if the roster grows a
warlord. **A new `salt` material row in both tables** (§9: `{remains: true,
breathes: false, density ~1.35}` — the cured leave BODIES, which stone denies
today; the look: matte-white, low saturation, facet stipple — halfway between
bone and ice, which no row is) — THE NEW-PIECES PREFERENCE says build it.

| kin | one line | fabric it rides |
|---|---|---|
| **the salt stander** (`salt_stander`, brined) | a preserved body standing among the pillar forests AS a pillar — the same silhouette, a shape inside the salt; dormant by day (eyes shut — the `sleep` watch posture), and it MOVES ONLY WHEN UNWATCHED: turn your back and it is closer; look, and it is a pillar again | `registerDormantTag` + `registerRouseRule` (THE TRUE-COLORS LAW: calm faction while un-roused, swaps on the latch) + **`BehaviorSpec.stalk` with `creep 0`** — "while the quarry's facing bears on this body AND LoS is open, every closing step × creep… a statue. Look away, and it comes" (ships today) + the tells fabric's `alert` step-tell as its one honest twitch; `salt` material (leaves a body) |
| **the brine lurker** (`brine_lurker`, brined/wild) | what sleeps under the crust: a long pale shape you can SEE through the salt (ghosted), feeling footfalls; where the crust gives it breaches, and where it travels the crust opens behind it | `{do:'burrow', kinds:['salt_crust','brine_sink']}` ground verb + `PerceptionSpec.xray` tremor-sense + `StatusDef.ghostAlpha` (present-but-inside) + the collapse annex seam at emergence; THE SURFACING pool's first face |
| **the halite crab** (`halite_crab`, wild) | a heavy armoured tank that WEARS the crust — its shell is the country's white; it breaks through wherever it walks (you watch it make holes) and re-crusts while it wades; squish-proof by heft, it tramples the shrimp | `shellGuard` (the crab grammar) + THE WEIGHT GATE made visible (heavy bodies arm the crust fast) + `lite` trample mass; regen while on `brine_sink` (a habitat read); `tune: {}` optional (a crab that takes the colour of the blow — the attunement fabric is open to "a living bearer wearing a mood ring") |
| **the brine shrimp tide** (`brine_shrimp`, lite) | a skating swarm that pours from open brine and never cracks the crust — the ambient proof that light things are safe on it; a harmless tide by day, a biting one at dusk | `ZoneTheme.lite` pour seated at brine pools (`seat 'pois'` today; a `'brine'` seat = the vents-seat idiom, one lane), `when {phases}` for the dusk bite, `MonsterDef.lite {contact small, trample{}}`; THE SURFACING's second face |
| **the heliograph sentinel** (`heliograph_sentinel`, brined) | the tallest thing on the pan: a stilt-legged watcher turning a mirror-shell to scan, its cone drawn across the white; its FLASH dazzles what it locks, and its shout wakes the standers | watch fabric (`sweep`, `fan:'show'`, `detection ~1.5`, `post: true`, long `alertShout`); a `dazzled` cone skill (§9) with `durationOverride`; NEW parts `mirrorShell` + `heliograph` (the new-pieces preference); its tell: the shell's tint reads `radiance` (the tells fabric's world source — bright at noon, dull at dusk: drawn == the hour) |
| **the pan vulture** (`pan_vulture`, wild) | a carrion flock murmurating over the pan and stooping on the wounded and the dead — the sky's only cover is a flock's shadow | `BehaviorSpec.flock` + `wingCycle` (aloft ⇄ stoop ⇄ grounded, the telegraphed dive ring) + `carrion {drive}` + `HUNGER_LEAN`; THE OPPORTUNIST demeanor with THE NO-TAG ceiling (commits by a clock, never hovers the boundary); `dune_vulture` is the template |
| **the salt ibex** (`salt_ibex`, exists) | the pan's grazer — the larder the lurkers and the vulture share; it crosses crust light-footed (a critter never arms it) | the prey/larder law (the snow-hare precedent); `WILDLIFE` rows; already named for salt |
| **the brinewright** (`brinewright`, brined — the crone seat) | the one who cures: a slow robed salter who RAISES the brined from the pan's dead — the corpse-mint gate is her whole economy (only bodies with `remains` feed her), and her encrusting kiss turns a living body to a standing pillar for a breath | corpse fabric (`spawnCorpse`/raise grammar) + the encrust→stasis status ladder (§9) monster-first; the den's court |
| **the salt mortar** (`salt_mortar`, brined) | the gun line: a crouched siege-shell lobbing brine globes across the pan on its own clock, perception-free — and every shell-hole is a brine hole | `MonsterDef.bombard` (the sniper law verbatim) + impact dress on the crust + the collapse annex at impact (drawn == tested: the crater IS open brine) |
| **the mirage herds** (dress, not kin) | far walking shapes and silhouette columns under the shimmer — light, not matter | `mirageGhost` forms on the front's dress rows (§5) |
| **THE BRINEMOTHER** (den apex) | the curing pit's matron under the great sink: a brood-bearer whose court is the lurkers and whose floor is deep crust over her own brine — the fight is standing where the floor still holds | den lane (gleamhollow/great-geyser model) + the recurring brood trickle + the deep regime (§4) as the arena mechanic |

Wildlife garnish: brine flies (lite, harmless, the dusk's haze over the
pools), salt skinks sunning on the pillars (dormant ambience, spared by the
sentry law), tumble-salt (weather dress under wind), circling vultures as
pure ambience when unfed (the scald's gull ruling generalized: circling birds
are flavour, never the warning system).

### 8b. THE DEMEANOR SHELF (the scald's shelf inherited; what the flats ADD)

- **THE STATUE (new)** — the stander's law above: a body that advances ONLY
  while unwatched. Generalizes anywhere a dormant kin wants dread without a
  chase; the tell is the absence of motion; `stalk.creep 0` is the whole
  machinery. Its honest limit, named: it must COMMIT by a clock like every
  stand-off demeanor (THE NO-TAG LAW — a stander that can never be caught
  moving but never arrives is a tease; when the watch ladder locks or pain
  lands, it walks openly).
- **THE UNDERCRUST AMBUSH (new posture of an old fabric)** — `AmbushSpec
  .visible` is "the only ambush posture that works on ground with no cover";
  the flats' twist is that the cover is the FLOOR: the lurker is visible
  THROUGH the crust (ghosted), not in the open, and springs where the crust
  gives. No announce (the shape under your feet is the announce).
- **THE OPPORTUNIST with the ceiling** (inherited, ratified for the scald's
  jackal) — the vulture and the stander both wear it.
- **THE WALLOW** (inherited) — the halite crab fights from its sink and
  disengages when you step off the brine (the door is drawn: the brine's
  rim).

### 8c. THE CURING PIT (the den) + THE PILLAR COURT (the in-zone lair)

Two lanes, the lair fabric's grammar: a DEN under the great sink (the
`den_mouth` builder — spoor ring of salt-cured bones and a halite-crusted
mouth; THE UNTITLED CLAIM: the mouth's own look is the whole announcement;
mintCave-forced `curing_pit` country with authored fauna — the brinewright's
court, the brinemother's brood, deep crust over brine as the arena; ledgers
`curing_pit_entered` / `brinemother_slain` for the kit's any-of unlock), and an
in-zone lair ON the White Blind (THE PILLAR COURT: a `salt_procession` ring
around a halite throne where the standers stand thickest — the weeping-angel
field at lair scale, the rouse latch its only bell). Seats via `registerLair`
(biome × place × level envelope × chance — one row each); both diplomacy-
silent.

---

## 9. ABILITY-THEME SEEDS (required — the compounding law's top layer)

All proposals; none built in any movement without her round. Inherited laws:
**THE NO-LOCK LAW** (a piece may be FOUND in the country, never EXCLUSIVE to it
— "would it earn a bar slot in the grove?"), **THE MIRROR LAW** (every player
piece has a monster wearer first; probe-asserted), **THE NEW-PIECES
PREFERENCE** (build the part the theme wants). **What the desert's SUN & SAND
already owns and the flats will NOT duplicate:** weaponized sunscorch, the
mirage-step / mirage-archer decoy lane, the scouring-grit supports. The flats
seed what is new:

- **DESICCATION (the dry body)** — a `parched` status family: mends shrink
  (flask pours, regen and leech down; the `healTaken` lever `sear` already
  uses), applied by brine contact, the lurker's bite, the brinewright's kiss;
  player-side a DRYING aura/cone that strips `isWet` (the scald's wet fold's
  EXACT counter — a scald build's amplifier is the salt build's target: the two
  countries' kits argue, which is the compounding law talking to itself). Note
  for the bank grammar: `bank.wetMul` only multiplies UP; a salt bank that
  favours DRY bodies needs the sibling field (`dryMul`) — one field, named.
  THE THIRST BAR — a `SURVIVAL_RESOURCES` fill row (one row + bands) whose
  consequence is MEND STARVATION (never a cook; a new texture under THE
  COMPOSITION LAW; relieved by TRUE water only, which gives the mirage oasis
  real teeth beside the douse) — is carded (5b), not recommended for M0/M1: it
  is a second ambient bar on the same walk, and bars are hers to bless.
- **ENCRUSTING → SALT STASIS (the pillar verb)** — an `encrusted` ladder
  (stacks: armour UP, move/cast DOWN — the petrifying ladder's shape with the
  crab's meaning) that builds up into `salt_stasis`: `StatusDef.timeScale 0`
  + a drawn white shell (the body becomes a pillar for N seconds — targetable
  statue, the stasis lever exists verbatim); monster first (the brinewright's
  kiss, the stander's embrace), player gem after (hold a body in salt; or
  ENCRUST YOURSELF — a guard stance that trades motion for a salt shell, the
  crab's own gimmick).
- **SALT BURST (the rupture family's mineral face)** — `salt_husk`'s
  `salt_burst` + `deathBurst implode` are already the monster seeds; a
  `brined` status with a `bank {}` block (the rupture law is "generic by
  construction: any status may declare a bank and any rupturer may spend it")
  and a `rupture` verb that shatters banked salt as a physical/chaos burst.
  Two verbs, BANK → RUPTURE, the scald's grammar in white.
- **DAZZLE (the glare as kit)** — a `dazzled` row (accuracy + detectionRange
  down; screen `pall` in pale gold — the only wash-toward-white the game owns;
  on monsters a lock lapse), `durationOverride`-capped; the heliograph's cone
  first, a player flash-gem ("Sunflare") after; supports on the `status:
  dazzled` mechanism for free.
- **THE LIGHT FOOT / THE TREMOR READ (crust-walking as a build axis)** — the
  `softStep` stat (the squish fabric's own deferred seam) as a support/passive
  that waives crust arming (walk the brinepan unarmed — the skater's build);
  its inverse, a vestige word that lets you SEE the under-crust shapes farther
  (a `detectionRange`-style lens on ghosted bodies). Both small, both honest.
- **PRESERVATION (the cured)** — a self-stasis escape (`salt_stasis` on
  yourself: invulnerable-immobile for a breath — the Decoy of time), and the
  salt material's corpse yield feeding the corpse economy.
- **THE SALT REGISTER (vestiges)** — four words in the mineral register the
  scald opened (sinter / travertine / sulphur / vitriol): **halite / gypsum /
  bittern / nitre** (names the country already speaks), plus one or two
  epitaph sequences; a `registerGemFloor` row over the flats' tilesets +
  an `unlocks.ts` any-of row keyed `curing_pit_entered | brinemother_slain` —
  "found in the country, owned everywhere" (the scald K2 precedent verbatim).
- **SOUND AS CURRENCY (a support line, not a new fabric)** — the Ringing
  Report / `noiseOnHit` lane is where a blind-country build goes: ring the
  watchers to SEARCH and watch the fans all turn; the pan is where that support
  finally SHOWS (no new machinery; noted so nobody builds a second lure).

---

## 10. WEATHER, RADIANCE, AND THE MAP

- **`mirage`** — the shimmer front (§5): hot ∧ arid ∧ low, day-heavy, not
  dimmed, the heat-line + the dress lies + the ghost herds; the shimmer cap
  rides it (M2).
- **Rain on the pan** — rare by climate (arid), and when it comes it is THE
  FLOOD MIRROR (§4): the sky painted on the floor, the crust weak under it.
- **Dust devils** — the `sandDrift` ambientFx's dust-devil window is the
  pan's idle animation; a `gale`-class front over the flats (the desert's
  sandstorm births hot ∧ dry — it will cross the pan's rim by birth geography;
  a salt-gale variant with a crust-dust veil is one row, DIAL).
- **Radiance**: the glare hours at noon (the `glarestruck` status gate); the
  night is the star mirror; the galleries are sheltered (radiance 0.45, no
  scorch, no glare — the country's only relief is underground, which is the
  point).
- **Map/meld**: mapColor bone-white (card 8); `saltflat_meld` stands ("salt
  and glass glitter ahead" — salt pillars + glass + fulgurite + bone, "not one
  grain of the waste's soft sand") and grows one crust piece (a patch of
  `salt_crust` at the hem so the border CRACKS underfoot before the ground
  turns white — the neighbours feel the pan before they see it).

---

## 11. THE DISTINCTNESS REQUIREMENT — the Salt Flats vs the Desert (ruled section: the bar card 1 must clear) + the four pale neighbours

Her ruling at the first walk (the scald's caution, re-applied): the flats must
be "really different enough from the desert that it deserves its own country as
a promotion" — else the desert expands into "countries-within-countries" — and
the verdict "will depend on the intensity and number of variants and how
different the salt flats acts as its own actual region/country." This section
is the rubric. Like the scald's §7 against the volcanic, every separation is
concrete enough to author from, and the ledger counts what the movements
actually put on the ground so intensity is a number, not an adjective.

### The desert at HEAD, surveyed (what the flats must be different FROM)

Five faces under one recipe (`dunefield` — crescent ridges on one prevailing
wind, breaches as passes, softsand lee, hardpan lanes): the SCOURED WASTE rim
(scrub, split rock, the gnoll warbands), the TABLELANDS (massif mesas), the
SAND-SEA erg (the biggest surface arenas, "the trek IS the content, the oasis
roll is the mercy"), the GLASSPAN (the salt face this charter promotes or
deepens), the HIVESANDS (the Seethe's warren-country). Heat as a TAX (swelter →
the scorch bar, ambient by existence; `heat_shimmer` fields as the fast lane;
shade as the relief); mirages as FURNITURE (three inert doodads that pop at
reach, placed deep-in-zone); sandstorm as the sky (wind as teeth, gnoll-
favoured); the SIROCCO COURT as the deep tenant (heat + mirage + glass:
dancers that split into heat doubles, a khagan "you have never once seen
first"), the gnolls on the rim, the Sarcophate's tomb doors under it; lost
places (oasis haven, buried village, caravan graveyard, sepulcher); SUN & SAND
as its kit (weaponized sunscorch, mirage step/archer); no cave face, no
puzzles row, no creep, no lite, no fog, no collapse.

### The separations, axis by axis — DESERT vs SALT FLATS

| axis | DESERT | SALT FLATS |
|---|---|---|
| **substance** | SAND: dunes you detour, soft lee you wade, hardpan lanes between ridges — a floor that SLOWS | SALT CRUST OVER BRINE: a floor that GIVES — cracks under mass, swaps to caustic brine, re-knits; white, flat, faster on the lanes (hardpan 1.05) and lethal off them |
| **hazard grammar** | heat as a standing tax; the ground's danger is what is ON it (stalkers under sand, the Court); the desert never changes under your feet | THE CRUST (the floor itself is the hazard and the ambush veil — the collapse fabric's contact law, drawn as cracks), THE GLARE (seen from farther), THE SHIMMER (the lock held off, the lies as weather) — danger is a property of SURFACE and SIGHT |
| **the sky** | sandstorm (wind, gnoll-favoured); mirages as three static doodads | THE MIRAGE FRONT — a weather kind that BRINGS the lies and takes them away; THE HEAT-LINE; THE PHANTOM EVENTS (whole events as illusion — §5c); rain = THE FLOOD MIRROR |
| **what is true** | everything you see is there (the three mirages excepted, and they stand still) | THE ILLUSION IDENTITY: phantoms that were never there, weather-borne mirages, a floor that keeps its promise only for a while, breaks that fade — impermanence as the country's texture |
| **sight** | dunes: shots and sight SAIL over ridges, feet detour — vistas with walls you can't cross | NOTHING occludes — the longest honest sightlines in the game; the watch fabric's ladder is the grammar (sentries out-see the screen); THE WIDE FRAME; THE SHIMMER CAP; the only cover is light and a flock's shadow |
| **palette / map** | gold-tan sand (`→#8f7840`), the khaki pan (`→#8a7a4e`); gold on the map | TRUE WHITE floor + brine-teal holes + glass; the only bright-white surface country; white on the map — nothing else wears it |
| **the kin** | gnolls (rim) + the SIROCCO COURT (heat/mirage/glass — ethereal doubles, cloth dancers, a glass assassin) + the Sarcophate (linen undeath) + the sand's vermin | THE BRINED (natural PRESERVATION — the cured leave bodies; standers that move only unwatched; brine lurkers felt through the crust; the halite crab that wears the floor; the heliograph that scans it; the brinewright who salts the dead) — crust, not sand; preservation, not heat |
| **vertical** | tombs DOWN (sepulcher sands, the buried vault — sheltered pockets) | THE BRINE GALLERIES — a cave FACE (the pan's only shade) reached by the cave roll AND by falling through the deep crust (the pitfall descend) |
| **water's meaning** | refuge (the douse law) and the lie (the oasis) | a memory: under your feet, caustic, no mercy (the no-douse pin); the sky's mirror after rain; never refuge |
| **objective texture** | clear / waves / spawners / unearth (the sand keeps what the caravans lost) | READ THE SURFACE: the crust as a traversal test, the phantoms as a perception test, puzzles as salt chords (the desert has no puzzles row — an open seat the flats can take), the galleries' dive, the curing pit |
| **the kit** | SUN & SAND (weaponized sunscorch; mirage step/archer) | desiccation / encrust→stasis / salt burst / dazzle / the light foot / the salt register (§9) — and the two kits ARGUE (the scald's wet fold vs the salt's drying aura) |
| **the ask on the build** | read the heat, take the shade, commit to the crossing | read the cracks and the shimmer; be seen, and choose where; trust nothing you have not walked up to |

**Shared seats, honestly named**: heat (the scorch bar — ambient on both, the
flats hotter: `swelter 1.2–1.35`) and heat-haze; `hardpan`; the Glasspan's
furniture (pillars, glass, fulgurite — promoted with it); the three mirage
doodads (which the flats SUBSUME into weather); `salt_husk` and `glass_stalker`
today on the Court's roster; the dunefield recipe at pan dials (the flats want
their own `saltpan` recipe — crust + causeways + sinks + pillar forests — to
cut this tie; see the ledger). These are the ties a promotion must be seen to
cut, and the ones the sub-country keeps.

### THE INTENSITY LEDGER (what each movement actually puts on the ground — her "intensity and number of variants")

| lever | the Glasspan today | after M0 | after M1 | after M2 | after M3 |
|---|---|---|---|---|---|
| faces / variants | 1 face, 3 variants | 1 face repainted, 3 variants (white blind carries the crust) | 3 staged faces (glasspan / brinepan / whiteblind) × 2–3 variants each + cave face | + the den, + the pillar-court lair | + the great-pan expanse if 1b |
| recipes | dunefield at pan dials | same | dunefield-at-pan + low-coverage massif; **`saltpan` recipe (new: crust + causeways + sinks + pillar forests) recommended here to cut the dunefield tie** | + the galleries' cave recipe; the deep regime | + the pan expanse |
| ground fabrics | none | THE CRUST (collapse) | + the crust on every face; the flood mirror | + the brine flood front; the shrimp tide (lite) | — |
| sky | heatHaze + sandDrift; 3 static mirages | THE MIRAGE FRONT + heat-line + dress mirages + static ghost herds | + THE PHANTOM EVENTS (walking migration / caravan / warband) | + THE SHIMMER CAP; the glare status; the wide frame | + mirage kin |
| kin | the Court's 3 + the desert's vermin on the table | standing kin re-dressed | THE BRINED wave 1 (stander / lurker / crab / shrimp / salt_husk re-homed) + the salt material | + heliograph / mortar / vulture / ibex / brinewright / brinemother | + the phantom-hidden kin if 3d |
| events / theater | none of its own | — | — | the white-blind hour; the salt-caravan theater | + the kit round |
| kit | SUN & SAND (the desert's) | — | — | — | the salt kit (six families) |
| cave / den / lair | none | — | THE BRINE GALLERIES (cave face) | THE CURING PIT (den) + THE PILLAR COURT (lair) | — |
| text channels | 5 lines (mirage ×3, glass, ambush ×2) inherited | 0 new; mirage lines dropped if card 9 | 0 | 0 | 0 |

Read honestly: **after M0 the flats are a robust FACE; after M1 they are a
COUNTRY by the scald's own parity list; after M2 they out-variant the desert's
deep half.** The bar, stated as a probe-shaped assert (the scald's "never
mistaken at a glance" pin): palette distance (white vs gold), a structural
assert no desert face authors `collapse.melts` on a brine target, no desert
front carries the shimmer cap or phantom rows, the flats' faces run a recipe
the desert does not (`saltpan`), and the banner roster shares no def with the
Court except by explicit re-home. If M1 cannot clear those five, the
sub-country is the honest shape.

### THE SUB-COUNTRY — "countries-within-countries" as a mechanism (the alternative, written so it is a choice)

What it would take for the desert's salt face to be "far more robust" INSIDE
the desert, as a nested country:

- **A SUB-FIELD lever (new generation work, ~1 session, generic)**: today a
  biome stages faces by ONE depth (`biomeDepth` — distance into the biome's
  region). A sub-country needs a SECOND axis: a salted noise field over the
  desert's cells (a `subField` on the biome row — "where the salt blisters") and
  a `subDepth` for faces staged INSIDE the blister (glasspan at its rim,
  brinepan, whiteblind at its heart) — the face-staging grammar applied twice.
  Generic by construction: the hivesands (the Seethe's warren-country) and the
  tablelands are the same shape and would take it for free; the blend fabric
  (`TilesetDef.blend` — a second face welling up through a zone as pockets or a
  tide-line, the littoral's own gradient) is the nearest shipped kin but works
  WITHIN a zone, not across a region.
- **What stays the desert's**: the biome row, the gold map, the climate claim
  (warm∧dry — no basin geography), the Court as the roster (the brined join as
  a sub-faction or the Court grows a salt wing), SUN & SAND as the kit (the salt
  families join its pools), no cave face (galleries would need a desert
  caveFace — which the erg would then also roll; acceptable if authored by
  sub-field), the den keyed on tileset not biome (the lair fabric's
  `place`/tileset axis).
- **What it saves**: no redeal; the desert keeps its landed face; the meld and
  the "blisters" staging idea survive; the salt becomes the desert's secret
  heart rather than a neighbour.
- **What it costs**: the white map sentence; the climate geography; a generic
  engine lever before any content; and the distinctness is by DEPTH (you find
  the salt by going deep into the desert) rather than by PLACE (you find the
  salt where the rivers died).

**The charter's honest read**: the content in §4–§9 is MORE distinct from the
desert than the scald was from the volcanic (the scald shared fire's element;
the flats share only heat's tax and a few furniture pieces, and invert the
desert's every other axis — sand/crust, furniture/weather, slow/give,
trek/see). But "different enough" is HER measurement, and the place to take it
is her M0 walk against the ledger above.

### The wider neighbourhood (the four pale neighbours — palette + grammar)

| axis | DESERT (the parent) | BRINE FLATS (littoral) | TUNDRA / DEEPWINTER | SINTER TERRACES (scald rim) | **SALT FLATS** |
|---|---|---|---|---|---|
| **what the ground IS** | sand: dunes you detour, soft lee you wade, hardpan lanes | the SEA's floor, drained: cracked mud, bleached reef, open caustic sinks; the tide returns (brinesurge, the tidal wall) | snow over dark ground; ice that slips and mirrors; the frozen river | travertine shelves in prism colour, water and steam | a dead LAKE's floor: white crust over brine — dry above, caustic below; the floor itself breaks |
| **hazard grammar** | heat as a tax (swelter → scorch), the trek as content, ambush from the sand | the tide as a wave (span walls, parted corridors), sinks as open pools | cold, whiteout fog, avalanche lanes | the kept beat (scald on schedule) | THE CRUST (a floor that gives under mass, drawn as cracks) + THE GLARE (seen from farther) + THE SHIMMER (the lock held off, the lies as weather) |
| **the sky** | sandstorm (wind as teeth), mirages as furniture | brinesurge washes, the storm tide | blizzard, whiteout | scald mist, mineral rain | the MIRAGE FRONT — mirages are weather; rain makes the floor a mirror |
| **palette** | gold-tan (`→#8f7840`), khaki pan (`→#8a7a4e`) | bone-grey (`→#bcb496`), brine-teal lows | dark floors under white drift; slate-blue rock | travertine (`→#d8d0b8`), cyan-to-orange pools | TRUE WHITE floor + brine-teal holes + glass; the only white surface country; white on the map |
| **the kin** | gnolls on the rim; the SIROCCO COURT past the shimmer line (heat + mirage + glass) | the Coilborn, tide skitters, the Deep ashore | rimebound, the Winter Court | geyserkin, the beat-readers | THE BRINED (the cured, the standers, the lurkers) — preservation, not heat; crust, not sand |
| **sight** | dunes: sight sails over ridges, feet detour | reef heads and whale arches occlude | drifts and whiteout occlude | steam occludes (the vapor ride) | NOTHING occludes — the longest honest sightlines, the sentry's country; the only cover is light and a flock's shadow |
| **water's meaning** | refuge (the douse law) and the lie (the oasis) | the enemy returning (the tide) | frozen | the weapon (scald on the wet) | a memory — under your feet, caustic, no mercy (the no-douse pin), and the sky's mirror after rain |
| **the ask on the build** | read the heat, take the shade, commit to the crossing | read the tide line, hold the corridor | read the cold, keep the fire | learn the beat, keep your feet dry | READ THE SURFACE — the cracks under you and the shimmer at the horizon; be seen, and choose where |

**Shared seats, honestly named**: desert and flats both wear heat (the scorch
bar — ambient on both, the flats hotter at `swelter 1.2–1.35`), heat-haze,
`hardpan`, the Glasspan's furniture, `brine_sink` (shared with the littoral),
`salt_husk` (today the Court's). The split that keeps them unmistakable at a
glance is SUBSTANCE (sand / seabed / snow / travertine vs crust-over-brine) +
PALETTE (the only white) + GRAMMAR (the floor that breaks; the lock held off by
weather) — pin it with a distinctness probe check as the scald did (palette
distance + the structural assert: no other surface country authors
`collapse.melts` on a brine target, and no other front carries the shimmer
cap).

---

## 12. THE DECISION CARDS (for her word — recommendation first, the case beside it)

Each card: what is being decided · the options · the recommendation · what
changes under each.

**CARD 1 · COUNTRY or REGION — HELD at the first walk (her bar: §11)** — (A)
THE COUNTRY by the re-homing path (the Glasspan becomes the rim; the desert
keeps four faces; new biome row hot ∧ arid ∧ low, ~2.0 weight, white map; a
`saltpan` recipe to cut the dunefield tie) · (B') THE SUB-COUNTRY — "countries-
within-countries": the desert's salt face made far more robust INSIDE the
desert via a generic SUB-FIELD staging lever (second depth axis; ~1 session of
generation work; the hivesands/tablelands would take it free), the desert
keeping the map, the climate, the Court and SUN & SAND · (B) THE REGION as v1
wrote it (the Glasspan deepens in place + a `brinepan` face; no lever, no
redeal) · (C) two salts — declined. **The charter's read: the content clears
the bar by the ledger (§11) — A if her M0 walk agrees; B' is the honest
alternative, written as a mechanism, not a retreat.** Her word decides after
M0, which is country-neutral by construction. Sub-card 1b: THE GREAT PAN AS ONE
EXPANSE (generalize `FIELD_BIOME` + a crust sibling of the field recipe) —
recommend as an M2 option, not the debut shape.

**CARD 2 · THE CRUST (show-don't-tell mechanics)** — (i) the consequence: WADE
(recommended — the melt target is walkable brine; you end up in it) vs FALL
(the deep regime: descend to the galleries — recommended ONLY for the heart's
deep ring) vs a slow-only crust (declined: a floor that never opens has no
teeth); (ii) the load law: WEIGHT-SCALED (recommended — the squish predicate;
light things skate, heavy things break through) vs flat per-tread; (iii) THE
RE-KNIT in-visit: YES (recommended — a living surface; drawn as the white
filming over) vs between visits only; (iv) THE SURFACING: an `onVoid` pool on
the collapse spec (recommended — the lurker breaches where the crust opens) vs
nothing rises. All four ride the collapse fabric verbatim; the weight gate is
the one engine touch.

**CARD 3 · THE MIRAGE — MIRAGE AS WEATHER RATIFIED at the first walk ("I love
the idea"); the rest stays open** — (A) pure look: the shimmer front + THE
HEAT-LINE primitive + dress mirages + ghost herds — RATIFIED in substance (M0)
· **(3p) THE PHANTOM EVENTS (her shape, §5c)** — whole events as illusion
(the phantom migration / caravan / warband): a draw layer, never actors;
dissolve at reach, re-form beyond; pure-clock poses; weather-seeded — in for
M1 (the walking columns) with the static ghost herds' pop-at-reach face in M0;
her stated excitement puts it first among the mirage work · (B) THE SHIMMER
CAP: watchers' locks capped at SEARCH beyond the clear radius under the front
(recommended M2 — the one tested interaction; drawn == tested via the fan) ·
(C) mirage KIN as real dormant bodies on the vent-dweller's pure-clock shape
(coda) · **(3d) THE LIE WITH TEETH** — real kin hidden inside a phantom column
(coda; pure illusion first, her call after she walks it). Sub-card 3b: THE
FLOOD MIRROR (rain → `surfaceMirror` + wet crust arms faster) — recommend M2.
Sub-card 3c: the heat-line is the country's ONE new render primitive — build
it (recommended) vs spend nothing new and let the mirageGhost doodads + the
faint haze carry the lie (the cheaper, lesser face).

**CARD 4 · THE GLARE + THE WATCH COUNTRY** — (4a) THE WIDE FRAME: a
per-tileset camera pull-back on the pan faces (recommended; number DIAL) vs the
classic frame · (4b) the glare's mechanic: a PERCEPTION lever — `glarestruck`
lifts `detectability` for every body on the white under open noon sky, shade
drops it, no damage (recommended) vs look-only vs a dazzle tax on the player ·
(4c) dazzle as KIT only (recommended) · (4d) the gun line (`bombard` wearer
whose shells crack the crust) — in for M2 (recommended).

**CARD 5 · FAUNA + SEEDS** — (5a) the roster as §8 (recommend the stander /
lurker / crab / shrimp / heliograph / vulture / ibex / brinewright / mortar /
brinemother; THE BRINED as the banner, diplomacy-silent; a `salt` material
row that LEAVES A BODY) — which bodies move from the Court: recommend
`salt_husk` re-homes to the brined (it IS "the dead lake's cured dead") and
the rest of the Court stays the desert's, walking the flats' rim table as
neighbours · (5b) THE THIRST BAR: no new bar for M0/M1 (recommended — the
`parched` status family carries desiccation) vs a fill row with the MEND-
STARVATION texture (her bar to bless; the composition law invites it, the
second-ambient-tax worry stands against it) · (5c) the seeds as §9 ratified AS
seeds (player-kit graduation stays her-round gated under the NO-LOCK / MIRROR
laws; the kit charter comes after her walk, the scald's rhythm).

**CARD 6 · THE HARVEST-NODE FACE — RE-SHAPED at the first walk (her ruling)**
— the SALTBLOOM row keyed on the country (stands) · the node's break is a
CRAFTED SHOW: shatter animation → debris field → fade, with NO caption and NO
slogan (the "shatter shakes the pan" name retired; its mechanic demoted to a
default-off dial for after the animation exists) · the debris field IS the
husk face (the `huskKind` seam stands as the fabric's per-biome hook) · THE
DISSOLUTION GRAMMAR is built FIRST as an offshoot (card 10) and the saltbloom
lands after it · consent/payout/placement untouched (the fabric's law).

**CARD 7 · MOVEMENTS** — §13 as written: M0 the white spike (country-neutral,
her feel gate) → M1 the country (after card 1) → M2 the teeth → M3 coda.
Recommend as written.

**CARD 8 · NAMING** — biome id `saltflat` (the desert precedent: biome id ==
rim tileset id; grep-honest — `salt` alone collides with every rng salt in the
repo) with label "The Salt Flats"; faces `saltflat` (kept, rim) / `brinepan` /
`whiteblind` / `brine_galleries`; den `curing_pit`; faction `brined`; status
ids `glarestruck` / `dazzled` / `parched` / `encrusted` / `salt_stasis` /
`brined`; node `saltbloom`. Collisions flagged no-action: `brine_flats`'s
name pool (Glarewhite / Brinemirror / Shimmerpan), `salt_husk` (a monster id —
never reuse for a doodad), `glasspan` (the rim's display title — kept).
Alternatives: `saltpan`, `whitepan`. Her word.

**CARD 9 · THE TEXT RETIREMENT (the law's cross-country touch)** — the flats'
NEW kit wears no text channels by construction (settled by her law). Open: do
the desert's three mirage pop lines (which the flats' rim inherits) and the
two ambush announces (glass_stalker, sandmaw) DROP their words so the death-
breath ring and the bending light stand alone? Recommend YES for the mirage
kit (the haze ring is the pop; the desert's mirages would otherwise be the
flats' only talking element) and HOLD on the ambush lines (the desert's own
standing behaviour — her call, one word each); `brine_sink`'s enterText is
shared with the littoral — hold.

**CARD 10 · THE DISSOLUTION GRAMMAR — the offshoot — ANSWERED at the second
walk: (i) its OWN charter, written (`docs/design/dissolution.md`); (ii) text
retires per converted kind, URNS FIRST (her example); (iii) the lane runs
BEFORE M0 as the groundwork, the gauge walk its purpose; D0 CHIPPED.** The v1
question, kept for the record — build planned-passes #26 as its OWN branch/chip
BEFORE the saltbloom:
`DissolveSpec { break, debris, fade }` as an open registry over the standing
kin (fellFace / evap + soft-dry / the brittle pops / harvest's husk), first
consumers the secrets' break-reveals + rubble + the saltbloom (§7b). Open for
her: (i) does it get its own short charter (recommended — the consumers cross
five fabrics and she has wanted it since the scald's third walk) or ride this
charter's §7b; (ii) do the standing brittle text lines retire AS the grammar
reaches each kind (recommended — THE PRECISION CLAUSE: the crumble is the
sentence) or stay until a separate text pass; (iii) ordering — M-DISSOLVE as a
parallel lane beside M0 (recommended; it blocks only the saltbloom).

---

## 13. MOVEMENTS (build order — each awaits her go; this charter lands first)

**M0 — THE WHITE SPIKE (the feel gate; country-NEUTRAL — GO at the second walk,
CHIPPED 2026-08-22 with M-DISSOLVE as its PREREQUISITE: the ghost herds' vanish
and every salt piece that breaks speak the grammar's motions; the chip verifies
the groundwork has landed before it starts).** Built IN PLACE on
the standing `saltflat` tileset (no biome row, no redeal): the REPAINT to true
white (palette + `hardpan`/crust visuals + the map tile untouched yet), a
`salt_crust` region + the collapse spec on the 'white blind' variant's pans
(contact-only, melt → brine_sink, the weight gate, the salt-tinted overlay,
in-visit re-knit), the `surfaceWake` prints, the shimmer front's first face
(the front row + dress mirages text-free + THE HEAT-LINE at its simplest
honest form) + STATIC GHOST HERDS (mirageGhost dress that pops at reach
with the haze ring — the brittle `near` grammar that ships today; the phantom
events' cheapest face, so she can judge the illusion feel before the walking
layer is built), a dev launch row (the geysers' precedent) and a QA line. Fauna:
standing kin re-dressed only (salt_husk, the Court on the table). Gate: HER
WALK — does the crust READ without a word (she sees cracks ring out, the floor
go dark, the brine take her — and steps off next time)? Does the shimmer read
as weather — and does a ghost herd dissolving at her approach read as ILLUSION
(the identity she named), never as a glitch? Does the whole face clear THE
DISTINCTNESS REQUIREMENT against the desert by her eye (§11 — the ledger is
the rubric; card 1's verdict comes from this walk)? Honest effort: **~1 session** (the crust is data on the collapse
fabric + one gate; the heat-line is the only new render work and it is budget-
capped; the repaint is palette work she must SEE). Probe: drawn == tested on
the overlay, the weight gate, the ground swap, the no-text law.

**M-DISSOLVE — THE DISSOLUTION GRAMMAR (the GROUNDWORK — her second-walk word:
built BEFORE M0, not beside it; own charter `docs/design/dissolution.md` is the
authority; D0 CHIPPED 2026-08-22; the gauge walk + the precedent for the
phantoms' dissolve are its purpose).** `DissolveSpec { break, debris, fade }` as an open registry + its first
consumers (the secrets' break-reveals, rubble, the brittle pops' visual half)
and the harvest fabric's `huskKind` seam so the saltbloom can name its debris;
the crumble animation vocabulary over the existing painters (fellFace's
squash-and-fade is the nearest kin; `Doodad.evap` + the soft-dry ease is the
fade); each brittle text line retires as its kind's crumble lands (card 10
ii). Its own chip + a short charter recommended (card 10 i). Cross-cutting by
nature (five fabrics) — it should land on its own, not inside a salt
movement. Honest effort: **~1 session** for the grammar + two consumers; the
saltbloom then costs one row.

**M1 — THE COUNTRY (after card 1 — or the SUB-COUNTRY build if her word is
B', in which case "biome row + re-home" becomes "sub-field lever + nested
faces" and the rest of this paragraph stands).** Biome row + climate claim + `BIOME_FIELD`
+ spacing + mapColor + meld growth; the `saltflat` re-home (the biome tag, the
desert's staging comment + face-voice rows); the `brinepan` and `whiteblind`
faces with names, palettes, packs, the dunefield-at-pan-dials and the
low-coverage massif; the kit file `data/saltflat.ts` (single-file doctrine:
regions, statuses, the front, the crust spec builders, the node row, the
material row); THE PHANTOM EVENTS layer (`mirageLayer` — the walking
phantom migration / caravan / warband on the phantom clock, weather-seeded;
§5c); the SALTBLOOM harvest row + its debris husk ONLY IF M-DISSOLVE has
landed (else it slides to M2 — the node waits on the grammar, her word); THE
BRINED wave 1
(stander / lurker / crab / shrimp tide / salt_husk re-homed) with the `salt`
material and the new parts; the glare status; tongue rows in both mills;
`docs/engine/saltflat.md`; `balance/probe_saltflat.ts` + roster row SAME
commit (the census law); the Ascent / lair / lite / weather joins that key on
the biome id. Honest effort: **1–2 sessions** (the grove and the scald each
landed a country in one hard session; this one carries fewer new fabrics —
the crust and the front are M0's — but the re-home touches the desert).

**M2 — THE TEETH.** The saltbloom (if it slid from M1 behind M-DISSOLVE) +
the phantom refinements (new phantom kinds; the lie-with-teeth only if card 3d
is her word) + the heliograph sentinel + the gun line (`bombard`, shells
crack the crust) + the vulture flock + the ibex larder; THE SHIMMER CAP; THE
FLOOD MIRROR; THE WIDE FRAME; the brine flood front (`line:'span'` + `gap` +
`travel` + `swell` + `convert.fade`, `when {weather}`) and the dusk shrimp
bite; THE BRINE GALLERIES cave face (halite caverns, sheltered, the deep
regime's door from the heart); THE CURING PIT den + THE PILLAR COURT lair
(`registerLair` rows) with the brinewright and the brinemother; the demeanor
shelf (the statue, the undercrust ambush, the opportunist ceiling); genqa +
probe extensions; the great-pan expanse if card 1b says so. Honest effort:
**~2 sessions** — the sentry/gun/flock kin are data on standing fabrics; the
galleries + den are the heavy half.

**M3 — CODA.** THE KIT ROUND under THE NO-LOCK LAW (a `docs/design/salt-kit.md`
sibling — desiccation / encrust→stasis / salt burst / dazzle / the light foot /
the salt register / the any-of unlock + gem floor; the thirst bar if card 5b
says so); mirage KIN on the pure-clock shape; events (a salt-caravan THEATER
crossing the pan under the shimmer — the pilgrimage grammar; the white-blind
HOUR as the country's surge); the generic river-basin → salt-pan join charted
with the scald's lake join; the blessing round. Effort: per-item, none large;
sequenced by her appetite.

Standing gates for every movement: `npm run check`, `npm run probe` (roster
row lands with its rig), `npm run genqa` (the matrix derives the new faces
automatically), `npm run sim -- run --suite smoke` + `baseline check` after
any `src/data/` touch, `npm run perf` after M0/M1 (new frontier tilesets join
the sweep by construction; the heat-line is the watched cost). The ownership
gate per the chip law — this charter's session touches docs only.

---

## 14. APPENDIX — survey receipts (all at HEAD `e1528ee`; five read-only sweeps + spot reads)

- **The standing face**: `data/tilesets.ts` `saltflat` (~2770–2880: variants,
  theme, rows, packs; `depthAffinity {from .15, fadeIn .25, mul .7}`), the
  desert staging comment in `world/biomes.ts` (~421 — "waste rim, erg heart,
  glasspan blisters"), `data/melds.ts` `saltflat_meld` (~553), THE GLASSPAN
  KIT + THE MIRAGE KIT in `data/doodadVisuals.ts` (~456, ~558–580), rules in
  `engine/levelgen.ts` (`salt_pillar`/`glass_shard` ~1954 — "the pan keeps
  its long sightlines"; `mirage_*` ~1987–2000 with their text lines and
  `pop {haze}`; `heat_shimmer` ~2271 — "the scorch bar's fast feed lane"),
  `layoutRecipes.ts` dunefield (`dunePans` → hardpan lanes), `brine_flats`
  (~7237) + `brine_sink` (`world/regions.ts` ~750 — the no-douse pin), the
  Sirocco Court (`data/monsters.ts` ~14758–14900, roster ~23514), the
  Sarcophate (~15196–15370), `salt_ibex` (~18908), SUN & SAND (`data/skills.ts`
  ~456, `meta/unlocks.ts` gem_skills_sunsand / sup_sunsand), memories
  `desert-country-overhaul` + `desert-douse-mirage-pass`.
- **The white audit**: ground palettes per tileset (tundra no palette / floor
  `#0c1115`; snowcrown `→#76859a`; ossuary `→#7a6f58`; sinter_terraces
  `→#d8d0b8`; brine_flats `→#bcb496`; saltflat `→#8a7a4e`; aether family
  `#f7fafe`–`#fffdf6`).
- **Climate**: `world/climate.ts` axes (temperature / moisture / wildness /
  maritime / hearth / elevation / civic; `CLIMATE_BANDS` — elevation has no
  named bands, claims are inline envelopes), `biomes.ts` desert `{warm, dry}`
  (no elevation gate; the "hot∧arid starved deserts" comment ~418), butteland
  (warm-dry high), scald (warm-damp low), `desert_verge` band, `BIOME_FLOORS`,
  `BIOME_FIELD` (~1045).
- **The crust**: `engine/collapse.ts` (`CollapseSpec` fields ~115–147 —
  `region`/`melts`/`crumble`/`contact`/`ambient`/`fall`/goal clears;
  `CollapseContactSpec` ~73; `CollapseFallSpec` ~100; the state machine +
  typed arrays ~186; `annexCell`/`releaseCell` ~350; `fallTest` ~466),
  `World.updateCollapse` (~43771 — the `feet` handoff), `beginSkyfall`'s
  pit-word override (~44027), `Renderer.drawCollapseOverlay` (~2559;
  `VIS_CFG.collapseFx`), `cloud_frail` (`regions.ts` ~957), the Spires spec
  (`tilesets.ts` ~11691), `WALK_CFG.ledgeGrasp`; `pitPolicyFor` (~54415) +
  `routePitFall` + `beginPitDescent`; `RegionKind.surfaceWake`/
  `surfaceMirror`; `effectiveWeight` (`actor.ts` ~1866) + `canSquish`
  (`squish.ts` ~82) + the `softStep` deferred seam (~33); `MATERIAL_NATURE`
  (`monsters.ts` ~1167); `Doodad.evap` / `plantDressAt` / `weatherDress.ts`;
  `Actor.trail` (drawn in `watchLayer.ts`).
- **The precedents**: `engine/tells.ts` header (~14–34), `engine/harvest.ts`
  header + `World.harvestSettle` (~51820), THE UNTITLED CLAIM
  (`data/objectives.ts` ~246; `docs/engine/objectives.md`), `LAIR_MOUTH_SPOOR`
  (`data/lairs.ts` ~877), `docs/engine/douse.md` (the Mirage Promise +
  `Flash.haze`), `docs/engine/scorch.md` (the one permitted number), the
  forbidden channels (`World.text` ~54995, `BrittleSpec.text/warn` ~1231,
  `AmbushSpec.announce` `actor.ts` ~375, `FrontSpawnRow.announce` ~358,
  `SidezoneDef.when.refusal`, `drawFractures` ~1573/1605).
- **Perception**: `engine/watch.ts` (`WatchSpec` ~151, `WATCH_CFG` ~83 rungs
  .25/.6, `SENSE_CFG` ~69, `senseReach` ~313, trail ~326), `stats.ts`
  `detectionRange` base 520 / `detectability` / `noiseOnHit` / `phasing` /
  `insightSap`, `ai.ts` acquireTarget (~1432–1471), `MonsterDef.detection`,
  `render/vis/watchLayer.ts`, `engine/los.ts` (`LOS_CFG`, the vapor ride),
  `render/vis/sightVeil.ts` (~47 the skip), `render/camera.ts` (modes, zoom
  1.3, couchFit), `brain.ts` (`BehaviorSpec.stalk` ~295 — "Look away, and it
  comes"; `PostSpec`; `FlockSpec`; `{do:'burrow'}` ~911; `PerceptionSpec.xray`
  ~594), `engine/bombard.ts` (the sniper law), `engine/ventDweller.ts`,
  `registerDormantTag`/`registerRouseRule` (`ai.ts` ~141/159), `gnoll_longshot`
  + `dune_vulture` + `wingCycle` (`monsters.ts` ~1991), `carrion` spec
  (~1136), `HUNGER_LEAN` (~64).
- **Weather + fog + lite + creep**: `world/weather.ts` (`WeatherDef` ~96 —
  birthGeo/lingerGeo/radiance/wets/dress/strike; `sandstorm` ~247, `gale`
  ~268, `starfall`'s `radiance.floor`), `render/vis/weatherFx.ts`
  (`WeatherFxDef` forms streak/flake/bank/mote, `veil.anchor`,
  `VIS_CFG.weather.anchor`), `render/vis/ambientFx.ts` `heatHaze` (~410),
  `render/renderer.ts` SUN-LIFT (~2044), `render/screenFx.ts` (`pall`,
  `darken`), `engine/fog.ts` (`FogBankDef`, `occludesSight` — `steam` the only
  wearer), `engine/lite.ts` (`LiteSwarmRow` `seat`/`when`, `LiteCond`,
  `MonsterDef.lite`), `engine/creep.ts` (`FrontSpec`/`FrontSpawnRow` —
  `line:'span'`, `gap`, `travel`, `swell`, `convert.fade`, `when`, `heels`),
  `world/fieldRegion.ts` (`FIELD_BIOME`, `FIELD_GEN`), `engine/massif.ts`
  (`MASSIF_CFG`, `healMassifWeave`; `massifCoverage [0.05,0.09]` precedent
  `tilesets.ts` ~855).
- **Kit seams**: `engine/status.ts` (`StatusDef` fields incl. `bank` ~243,
  `timeScale` ~186, `ghostAlpha` ~120, `conceals` ~112, `fickleSpan` ~202,
  `durationOverride` on effects; `blind` ~551, `petrifying`/`petrified`
  ~701, `brine_burn` ~1560 — terrain stings carry no screen-fx row by design,
  `scalded` ~1579 the bank exemplar, `soaked` ~1601, `gloomveiled` ~1257),
  `engine/skills.ts` (`SkillEffect` kinds incl. `vent` ~3569, `rupture`
  ~3590, `lure`, `litePour`, `terrain`; `DashDelivery.decoyDuration` ~1877;
  `SUPPORT_MECHANISMS` ~5505), `engine/tuning.ts` (`TuneSpec`), `stats.ts`
  `STAT_TRADES` (~156), `data/vestiges.ts` + `data/scaldkit.ts` (the mineral
  register, THE MIRROR LAW, THE NO-LOCK LAW, `registerGemFloor` + the any-of
  unlock), `render/vis/materials.ts` (no `salt` row; "nothing in the renderer
  enumerates material ids"), `world.ts` corpse-mint gate (~39879 —
  `defLeavesRemains`).
- **Her laws**: memory `her-content-philosophy` (THE COMPOUNDING LAW + THE
  SHOW-DON'T-TELL LAW, 2026-08-20), `design-rulings-backlog-triage` ("player
  prediction is key" — the rejected gradient lee), the scald charter's NO-TAG /
  NO-LOCK / MIRROR / NEW-PIECES / COMPOSITION laws, the harvest pass's
  consent-press flag and the per-biome-husk coda, the brittle wave-2 memory
  (the `warn` text line this country refuses).
