# THE DISSOLUTION GRAMMAR — groundwork charter v1 (breaks that SHOW: crumble · give way · dissolve · shatter · burst)

**Status: COMMISSIONED TO BUILD (2026-08-22, her word at the Salt Flats'
second walk) — the animation-oriented break framework is the GROUNDWORK that
lands BEFORE Salt Flats M0: "I definitely want to go ahead with M0, but before
that I'd actually like to set the groundwork for the animation-related items
such as nodes crumbling, secrets giving way, objects dissolving, shattering or
exploding (this would be a fantastic time to swap something like urns
shattering to this more animation-oriented framework rather than having it be
a text descriptor), etc; this way we can get a gauge as to exactly how well
those would all look, which might set precedent for something like the
illusion weather events." This is planned-passes #26 (her crumble seed at the
Scald Basin's third walk: rocks "crumbling away into an animation, leaving a
debris field and then slowly fading (for something like the secrets), as it
sort of builds on top of itself"), promoted at the Salt Flats' first walk and
now commissioned. This charter is the build chip's AUTHORITY; the Salt Flats
charter (`docs/design/salt-flats.md` §7b, card 10, the M-DISSOLVE lane)
defers here. Every number is a DIAL (unblessed — the GAUGE WALK is where she
blesses); survey receipts are against HEAD `e1528ee`; anchors name symbols
(line numbers drift). Cross-cutting by nature — it lands on its own, never
inside a salt movement.**

---

## 0. Her rulings (settled — encoded as law)

| # | ruling |
|---|---|
| 1 | **THE SEED (2026-08-21, scald walk 3)**: the fading-crater notion generalizes — "the actual rocks crumbling away into an animation, leaving a debris field and then slowly fading (for something like the secrets), as it sort of builds on top of itself" |
| 2 | **THE PROMOTION (2026-08-22, salt walk 1)**: the saltbloom's break is a CRAFTED animation "and then fading eventually" — and because that "is basically already a want that can be applied across a plethora of instances; secrets, rubble, node collapses, etc", it is built as an OFFSHOOT "prior to a saltbloom implementation" |
| 3 | **THE PRECISION CLAUSE (same walk)**: "text can be genuinely used for precision rather than mixing precision with fluff" — text is for measurements, never captions; a break that SHOWS needs no line |
| 4 | **THE GO (2026-08-22, salt walk 2)**: build the groundwork BEFORE Salt Flats M0, covering "nodes crumbling, secrets giving way, objects dissolving, shattering or exploding"; **swap URNS first** ("rather than having it be a text descriptor"); the purpose is a GAUGE — "exactly how well those would all look" — and the precedent it sets for "the illusion weather events" (the Salt Flats' phantoms, whose per-body dissolve is this grammar's DISSOLVE motion) |

Inherited laws (never re-litigated here): THE SHOW-DON'T-TELL LAW; fade-not-
pop (the soft-dry ruling — removals ease, never snap); DRAWN == TESTED (the
tells doctrine); THE QUIET RECLASS (the brittle fabric's `remains` — "the
crumble SHOWS and the dust REMAINS"); THE TRANSIENCE DOCTRINE (the ground
forgets — debris dries through the evap lane, never a permanent repaint); THE
NEW-PIECES PREFERENCE (build the voice a motion wants).

---

## 1. Thesis — a break is a sentence the drawing speaks

Today a breakable ends the same way everywhere: a flash, an instant kind swap
(or a splice), and a line of text that tells you what you did not see — "the
urn shatters!", "the glass sings apart!", "the span gives way!". The flash is
honest but mute; the text is a caption standing in for a drawing that was never
made. The grammar makes the end a MOTION: the body comes apart AS ITSELF — its
own sprite, cut along its natural seams — the pieces move by the motion's own
law (slump, drop, fling, puff, fade), settle as DEBRIS on the ground, and the
debris fades eventually. One engine, five motions, every breakable a consumer
by one data row. The caption retires the moment the motion lands — not as a
loss of information but because the crumble IS the sentence.

---

## 2. What stands (verified at HEAD `e1528ee`)

- **THE BRITTLE FABRIC** (`engine/levelgen.ts` `BrittleSpec`; `World.popBrittle`
  = THE ONE chokepoint, reached from the hit path, the near/touch sweep and
  the dwell clocks; `World.updateBrittle`): `on` hit/near/touch, `reach`,
  `dwell`, `orbChance`/`gemChance`, `corpses`, **`carve`** (opens the walk
  grid), **`remains`** (THE QUIET RECLASS — the popped kind becomes
  `face_rubble` and the dust stays), `text`/`color` + `warn`/`warnEvery` (the
  caption and the pre-break caption), **`pop { haze, radius, life }`** (the
  mirage kit's refraction ring — `Flash.haze`), `fume`, `spawn` (single or a
  weighted pool), `collapse` (a span giving way under bodies → the pit law).
  ~30 kinds carry a `text` line today (the retirement ledger, §4); the hollows'
  annexes already give way TEXT-FREE ("the give-way speaks no text — the seam
  crumbles into…", `docs/engine/strata.md`; `cracked_face` is "the visual-first
  crumble", `data/annexes.ts`) — **the grammar's founding precedent**.
- **THE FLASH + THE EFFECT VOICE** (`World.flashes`, `Flash` in `world.ts`;
  `render/vis/effectVoice.ts`): flash styles bolt / meteor / beam / **haze**
  ("refraction, not emission — the light layer skips it"), plus THE EFFECT
  VOICE — a registered PAINTER kind a flash speaks in ('blast' for a mortar's
  landing, **'sporeburst' for a pod's pop**, 'scramble' for a critter's exit)
  with the generic ring as the structural fallback. This is the grammar's
  ACCENT channel, already open.
- **THE RENDER KIN**: the rampage fabric's `fellFace` (crushed pieces drawn AS
  THEMSELVES squashed/fading on an absolute clock; `Doodad.felled`) — the
  nearest kin; `Doodad.evap` (dwell → radius contraction → gone; `EVAP`
  dials) + THE SOFT DRY (render-side ease for cosmetic dress — her fade-not-pop
  ruling built); weather/impact dress (`plantDressAt`, `weatherDress.ts`); the
  SPRITE BAKE CACHE (`render/vis/sprites.ts` `baked`; `paintBakedWhole` for
  `bakeWhole` doodad kinds — most doodads bake; a minority are LIVE-painted:
  liquids with sheen, `mirageGhost`, canopy-live kinds) and the portrait
  fabric's proof that any def draws AS ITSELF from the same bakes; the
  `cracks` painter param on the stone family (fracture lines across a face);
  `markDoodadsChanged(d)` + the doodad-families registry (scoped
  invalidation — a debris doodad swap invalidates only its families).
- **THE HARVEST HUSK**: `World.harvestSettle` swaps the node to
  `HARVEST_HUSK_KIND` (painter `scree` — "the husk stays — the crumble SHOWS and
  the dust remains"), one accent flash + three shard sparks, ZERO text (the
  SHATTER-NOT-TEXT ruling); "per-biome husk faces (one shared grey husk today)"
  is the pass's banked coda.
- **THE MIRAGE VANISH**: `mirage_oasis` / `mirage_bastion` / `mirage_caravan`
  pop on `near` with `pop {haze}` AND a text line each ("the water was never
  there…", "the walls scatter into heat…", "it was never a caravan—"); the
  `mirageGhost` painter's breathing alpha + sideways heat-shear is the drawn
  vocabulary of a thing that is light, not matter.
- **OTHER GIVE-WAYS**: the trapworks `World.collapseFloor` (telegraph flashes +
  "the floor gives way —" + `ruin_floor_gap` doodads with `fall`), the brittle
  `collapse` on `rotten_bridge` (`warn` "the planks creak…" + `text` "the span
  gives way!" + the pit law), `crumbling_wall` / `secret_wall` / `fitted_face`
  / `draft_seam` / `face_rubble` (the wave-1 lifeless breakables — `carve` +
  `remains`, mostly text-free already).
- **CO-OP**: a brittle pop's kind swap / splice already reaches clients (the
  doodad wire); the evap lane ships `ev` rows; fell rows ship position-keyed.
  Nothing in this grammar needs a new wire lane (§3 — the motion is render-
  side off the swap frame).

---

## 3. THE GRAMMAR (the design — one engine, five motions, one data row per consumer)

### 3a. THE FRAGMENT ENGINE (render-side, painter-agnostic)

At the break instant the engine obtains the doodad's BITMAP — a bake-cache hit
for `bakeWhole` kinds, a one-shot paint of the kind's painter into an offscreen
canvas for live-painted kinds (the portrait fabric's seam) — and CUTS it by a
seeded FRAGMENT MASK chosen by the motion and the material:

| cut | pattern | for |
|---|---|---|
| `shards` | seeded wedge/voronoi cells radiating from the strike point | ceramic, glass, crystal, ice |
| `strata` | horizontal slabs with jittered seams | rock, earth, salt, masonry |
| `facets` | radial facets around the body's axis | crystal, geodes, the saltbloom |
| `lobes` | 2–4 soft rounded pieces | pods, sacs, blooms, caps |
| `none` | no cut — the whole body fades | dissolves (mirages, phantoms, conjured stuff) |

Each fragment then moves for `life` seconds by the motion's KINEMATICS PROFILE
(§3c) — its path a PURE FUNCTION of (seed = position hash, t since the break)
— so every seat and every resume draw the same fall (the phantom-clock / track-
pose law; no state, no wire). Per-break fragment count `pieces [lo,hi]` (DIAL,
5–14), a CONCURRENCY CAP on live breaks (DIAL; beyond it a break snaps straight
to its debris — the honest degrade, never a stall), draw cost = N clipped
`drawImage` calls per live break per frame (budget-checked by `npm run perf`;
idle cost zero). The engine lives in `render/vis/dissolveLayer.ts` (the draw)
+ `engine/dissolve.ts` (the pure spec/registry/resolver leaf — no World
import), the lite/flux/collapse layer idiom.

### 3b. THE DEBRIS (the quiet reclass, then the fade)

When the motion ends the fragments SETTLE into a DEBRIS doodad — the brittle
fabric's `remains` generalized: a ground-order, non-blocking piece (no
blocking trio, no sight shadow — the harvest husk's own contract) whose sprite
is either the fragments' resting composite (baked once at settle) or a
registered debris KIND per material (`debris_shards` / `debris_rubble` /
`debris_splinters` / `debris_pulp` / `debris_salt` — new `DOODAD_VISUALS` rows
on standing painters: `scree`, `bones`, the shard painter; THE NEW-PIECES
PREFERENCE says paint the ones that want their own face). `Doodad.evap` takes
the debris (dwell `fade.after [lo,hi]` → contract at `fade.rate` → gone) with
THE SOFT DRY's ease — "fading eventually", her word; per-kind `fade: false`
for dust that must outlast the visit (DIAL per kind; recommend husks fade too,
minutes-grade). Debris carries `laidAt` so a revisit inside the memory TTL
resumes its fade (the evap lane's own law).

### 3c. THE FIVE MOTIONS

| motion | cut | kinematics | debris | accent (effect voice) | consumers |
|---|---|---|---|---|---|
| **CRUMBLE** | strata / facets | pieces SLUMP down and outward a little, dust puff; a node crumbles in on itself | rubble / salt scree | a soft dust voice (NEW painter voice if none fits) | harvest nodes (the husk becomes debris — the per-biome husk coda closes), rock and earth breakables, the saltbloom later |
| **GIVE WAY** | strata (+ the pre-break CRACK) | the seam CRACKS FIRST at the strike/stand point (a drawn pre-break — the `cracks` grammar growing over the face; replaces every `warn` line), then the pieces DROP inward/down with dust; the carve / fall / pit law fires at the instant exactly as today | rubble at the foot | dust | secret walls, cracked faces, fitted faces, draft seams, crumbling walls, the rotten bridge's span, the trapworks false floor |
| **SHATTER** | shards | radial FLING + spin + fall (gravity-ish), pieces skitter and stop | shard litter | a glass/ceramic sparkle voice (NEW) | urns (her first swap), clay pots, glass/crystal/ice shards and clusters, geodes, lattices, stills, skyglass/stormglass/mirrorglass, the stone tree and the watcher |
| **BURST** | lobes | an outward PUFF — lobes fly a short way and fall, the existing `fume`/`spawn` payloads fire exactly as today | pulp / husk scraps | 'sporeburst' (exists) / a wet-pop voice | gas pods, burst sacs, puffcaps, blooms, seals, polyps, eyes, stalks |
| **DISSOLVE** | none | alpha fade under a sideways SHEAR (the `mirageGhost` law) + the haze ring; the body thins from the rim inward and is gone | none (light leaves no dust) | haze | the mirage trio (their three lines retire), conjured/cloud pieces, ghosts — **and THE PHANTOM EVENTS' per-body dissolve (the Salt Flats' illusion weather — the precedent she named)** |

### 3d. THE SPEC + THE REGISTRY (the data surface)

`DissolveSpec { motion, cut?, pieces?, life?, fling?, gravity?, spin?, debris?:
kind | false, fade?: { after: [lo,hi], rate? } | false, voice?, haze?, preCrack?
}` on **`DoodadRule.dissolve`** (the brittle fabric's own rule table — one row
per kind), with **MATERIAL DEFAULTS** (`DISSOLVE_DEFAULTS[material]` in
`engine/dissolve.ts`: ceramic → shatter/shards, stone → crumble/strata,
crystal → shatter/facets, pod → burst/lobes, light → dissolve/none…) so a kind
names only its motion and inherits the rest — the `MATERIAL_NATURE` idiom. An
open registry (`registerDissolveMotion`, `registerDissolveCut`) for motions
and cuts a future pass wants (a 'melt' for ice, an 'unravel' for cloth). The
resolver (`dissolveFor(kind)`) is the ONE read every consumer makes.

### 3e. THE CONSUMERS' HOOKS (where the engine is told a break happened)

- `World.popBrittle` — the brittle kinds (the whole wave-1 + wave-2 set, the
  glass kinds, the mirage trio): after the tested work (carve / splice /
  remains / spawn / fume / collapse) the engine is handed `(doodad, motion,
  strikePoint)`; the `remains` kind becomes the `debris` lane's input where a
  row names one.
- `World.harvestSettle` — the harvest nodes: the husk swap becomes a CRUMBLE
  whose debris IS the husk face (per-row `debris` = the per-biome husk coda).
- The annex/hollow give-way and `collapseFloor` — GIVE WAY with the pre-crack.
- THE PHANTOM LAYER (later, the Salt Flats) — DISSOLVE per body at reach.
- THE CRUST EDGE (later) — optional: the crust's broken rim may borrow CRUMBLE
  for its shards; not in scope here.

### 3f. THE LAWS (builder-facing, probe-pinned)

1. **DRAWN == TESTED AT THE INSTANT.** The kind swap, the carve, the splice,
   the blocking trio, the pit/fall law and the spawn/fume payloads all fire at
   the break tick EXACTLY as today; the motion is after-image; debris is
   non-blocking and non-occluding from the instant it exists. Nothing tested
   waits for an animation.
2. **NO TEXT.** Every kind that adopts a motion DROPS its `text` and `warn` in
   the SAME commit (her urn ruling + THE PRECISION CLAUSE). The `warn` channel
   (the creak) becomes the drawn PRE-CRACK. Lines that carried INFORMATION (the
   soul cage's "a soul slips free") must have that information DRAWN (a soul
   mote leaving) before the line goes — the precision test, applied per line.
3. **FADE, NEVER POP.** Debris leaves through the evap lane with the soft-dry
   ease; no splice of a visible piece.
4. **DETERMINISM.** Fragment paths are pure f(seed, t); clients run the same
   motion off the same swap frame; nothing new on the wire.
5. **PERF-CAPPED.** A concurrency cap with the honest degrade; zero idle cost;
   `npm run perf` gates.
6. **ONE ACCENT CHANNEL.** The flash speaks through THE EFFECT VOICE; the
   grammar adds voices (dust, sparkle, wet-pop), never a second flash system.

---

## 4. THE CONSUMER CENSUS + THE RETIREMENT LEDGER (every standing line, by motion)

**D0 — THE GAUGE SET (one strong example per motion; her urn first):**

| kind(s) | motion | the line retired |
|---|---|---|
| `burial_urn`, `kiln_urn`, `clay_pots` | SHATTER | "the urn shatters!" · "the urn cracks!" · "crash!" |
| `glass_shard`, `crystal_cluster`, `icicle_cluster` | SHATTER | "the glass sings apart!" · "the lattice shatters!" · "shatter!" |
| `secret_wall`, `cracked_face` (+ the hollows' seam, already silent) | GIVE WAY (+ pre-crack) | secret_wall's knock `warn` → the drawn crack |
| `rotten_bridge` | GIVE WAY (+ pre-crack as the sag) | "the planks creak…" · "the span gives way!" |
| the harvest nodes (`harvest_*` → debris) | CRUMBLE | (already silent — the husk becomes real debris; the per-biome face closes) |
| `gas_pod`, `burst_sac`, `puffcap_cluster` | BURST | "the pod ruptures!" · "the sac bursts!" · "puff!" |
| `mirage_oasis`, `mirage_bastion`, `mirage_caravan` | DISSOLVE (haze kept) | "the water was never there…" · "the walls scatter into heat…" · "it was never a caravan—" |

**D1 — THE TAIL (each is one row + one line):** `geode_shell` ("the geode
splits!"), `harvest_frostvein`-class veins ("the vein cracks loose!"), the
still ("the still shatters!"), the lantern ("the lantern gutters…" — a dimming
DISSOLVE), the stone tree / the watcher ("…shatters!" / "…cracks!"), the kit
spill ("someone's kit spills open…" — SHATTER + the spill drawn), the stalk /
seal / polyp / eyes bursts, the soul cage ("the cage splits — a soul slips
free" — SHATTER + a drawn mote), the coil ("the coil parts!"), "you hack
through!" (a brush GIVE WAY), the snare's "SNAP!", `skyglass` / `stormglass` /
`mirrorglass` shards, the trapworks `collapseFloor` ("the floor gives way —" →
the tiles sag + crack + drop), the brittle `collapse` text path. Each converts
with its line in the same commit; the probe census (§6) names any row that
carries both a motion and a line.

---

## 5. THE GAUGE WALK (her purpose — the dev lever ships with D0)

D0 ships a DEV LEVER in the dev panel: "Break one of each" (spawns the D0 set
in a ring around the hero on any open ground — sanctuary purges spawn-effect
monsters, so pods' spawns are expected to vanish there) + a per-motion trigger
("crumble / give way / shatter / burst / dissolve the nearest") + "Break all in
view". Her walk gauges, per motion: piece count, life, fling/gravity/spin,
the debris face and its fade, the voice — and answers the precedent question
the whole pass exists for: does DISSOLVE carry to the phantoms, and does
CRUMBLE/SHATTER carry to the saltbloom and the crust's edge? Her verdicts bless
the dials; nothing else blocks M0.

---

## 6. Co-op · perf · probes · gates

- **Wire**: nothing new — the swap ships today; clients key the motion off
  (kind, position, their own clock at the swap frame).
- **Perf**: the concurrency cap; no per-frame consumer when no break is live;
  `npm run perf` after D0.
- **`balance/probe_dissolve.ts`** (+ its roster row in the SAME commit — the
  census law): (a) drawn == tested at the instant (blocking trio / carve /
  remains flip at tick 0; debris non-blocking); (b) debris rides the evap lane
  and completes; (c) determinism (same seed → identical fragment paths); (d)
  **THE RETIREMENT CENSUS** — any `DoodadRule` carrying `dissolve` AND
  `brittle.text` / `brittle.warn` FAILS (the no-text law made executable); (e)
  the degrade under the cap; (f) the harvest path (payout unchanged, husk →
  debris); (g) the mirage parity (haze ring still fires; no text); (h) the
  material-default fold (a kind naming only `motion` resolves a full spec).
- **genqa**: no generation surface changes; new debris kinds need rules +
  visual rows for the registry stage.
- Standing gates: `npm run check`, `npm run probe`, `npm run genqa`, `npm run
  sim -- run --suite smoke` + `baseline check` after any `src/data/` touch,
  `npm run perf`. Ownership gate per the chip law.

---

## 7. MOVEMENTS

**D0 — THE GAUGE SET (the groundwork — BEFORE Salt Flats M0).** `engine/
dissolve.ts` (spec, registry, material defaults, resolver, `DoodadRule.
dissolve`) + `render/vis/dissolveLayer.ts` (the fragment engine: bitmap
acquisition, the five cuts, the kinematics, the settle → debris handoff) + the
debris kinds (rules + visuals) + the D0 consumers converted WITH their lines
retired + the pre-crack for the give-ways + the effect voices (dust, sparkle,
wet-pop) + the dev lever + `probe_dissolve` + roster row + `docs/engine/
dissolution.md`. Honest effort: **~1 session** (the engine is render work over
standing bakes; the consumers are data rows; the probe is the care point).

**D1 — THE TAIL.** Every remaining text-carrying breakable converted (§4 D1),
the trapworks floor, the pre-crack everywhere a `warn` lived, per-biome husk
faces as debris rows, any motion her gauge asked for (a 'melt', an 'unravel').
**~1 session.**

**D2 — THE SALT CONSUMERS.** The saltbloom's CRUMBLE (its row — one line, the
harvest fabric's `huskKind`/`debris` seam), the phantoms' DISSOLVE (the Salt
Flats' `mirageLayer` per-body vanish), the crust edge — all ride the Salt Flats
movements; named here so the engine is built with their seats open.

---

## 8. Cards (builder-level; no blocking fork — the gauge walk decides the rest)

- **(i) The fragmentation source — DECIDED: the baked-sprite cut** (painter-
  agnostic, one engine for every kind, today) over per-painter piece lists
  (better art, ten times the cost) — with a per-kind `pieces` override SEAM left
  open for later hand-cut art where a piece earns it.
- **(ii) Debris permanence — DECIDED by her word: fades eventually**; the
  dwell is a per-kind DIAL; `fade: false` exists for the rare dust that must
  outlast the visit.
- **(iii) Text retirement — DECIDED by her urn ruling: immediate, per
  converted kind, same commit**; lines carrying information get their
  information drawn first.
- **(iv) The D0 set** — as §4; her gauge may re-cut it.
- **(v) Own docs** — `docs/engine/dissolution.md` ships with D0 (this design
  charter stays the design authority).

---

## 9. Receipts (at `e1528ee`)

`engine/levelgen.ts` `BrittleSpec` (~1199–1278: on/reach/dwell/orb/gem/corpses/
carve/remains/text/color/pop/warn/fume/spawn/collapse) and the rule table
(~1810–1900: wave 1 + wave 2 + the text census; `glass_shard` ~1956; the mirage
trio ~1987–2000; further lines at ~2017/2050/2071/2086/2177/2441–2471/2533/
2597/2612/2628/2661) · `World.popBrittle` (~51970+) + `updateBrittle` (~51919)
+ `brittleAccrue`/warn throttle · `World.harvestSettle` (~51820 — zero text) +
`HARVEST_HUSK_KIND` · `Flash` (`world.ts` ~1263 — bolt/meteor/beam/haze + THE
EFFECT VOICE) + `render/vis/effectVoice.ts` · `render/vis/sprites.ts` `baked`
+ `paintBakedWhole` (`painters.ts`) + `DoodadVisualDef.bakeWhole` ·
`Doodad.evap` (~504) + `World.updateEvaporation` + THE SOFT DRY · `Doodad.
felled` / `fellFace` (`engine/rampage.ts`) · `data/annexes.ts` cracked_face
("the visual-first crumble") + `docs/engine/strata.md` HOLLOWS ("the give-way
speaks no text") · `World.collapseFloor` (~46784) · `markDoodadsChanged` +
`engine/doodadFamilies.ts` · her laws: `docs/design/salt-flats.md` §0b (THE
SHOW-DON'T-TELL LAW + THE PRECISION CLAUSE), memory `her-content-philosophy`,
`planned-passes` #26, `scaldbasin-design-pass` walk 3 (fade-not-pop + the
crumble seed).
