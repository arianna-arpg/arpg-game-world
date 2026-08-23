# THE DISSOLUTION GRAMMAR — a break is a sentence the drawing speaks

`src/engine/dissolve.ts` (the pure leaf: spec, registries, material + motion
defaults, the ONE resolver, the pure cuts + kinematics) · `World.dissolveBreak`
(the one engine entry) + the hooks in `popBrittle` / `harvestSettle` /
`brittleAccrue` · `src/render/vis/dissolveLayer.ts` (the fragment engine, the
`litter` debris painter, the dust/sparkle/wetpop voices) · dev tab
`src/dev/tabs/dissolve.ts` · probe `balance/probe_dissolve.ts` · design
authority `docs/design/dissolution.md` (her commission 2026-08-22 — urns first).

A breakable used to end the same way everywhere: a flash, an instant kind swap
(or a splice), and a line of text telling you what you did not see — "the urn
shatters!", "the glass sings apart!", "the span gives way!". The grammar makes
the end a MOTION: the body comes apart AS ITSELF — its own sprite, cut along
seams its material names — the pieces move by the motion's law, settle as
DEBRIS on the ground, and the debris fades eventually. One engine, five
motions, every breakable a consumer by one data row. The caption retires the
moment the motion lands (THE PRECISION CLAUSE: text is for measurements, never
captions — a break that SHOWS needs no line).

## The laws (probe-pinned — `balance/probe_dissolve.ts`)

1. **DRAWN == TESTED AT THE INSTANT.** The kind swap, the carve, the splice,
   the blocking trio, the pit/fall law and the spawn/fume/collapse payloads all
   fire at the break tick EXACTLY as before; the motion is after-image. The
   DEBRIS doodad exists from the instant (pushed — or adopted — inside the same
   call), non-blocking and non-occluding by rule. Nothing tested waits for an
   animation.
2. **NO TEXT.** A kind that adopts a motion drops its `brittle.text` and
   `brittle.warn` in the same commit. THE RETIREMENT CENSUS (rig B) fails the
   build on any rule carrying `dissolve` AND a text/warn line — and names the
   not-yet-converted text carriers (D1's tail) without failing on them.
3. **FADE, NEVER POP.** Debris leaves through `Doodad.evap` with THE SOFT DRY's
   ease (`render/vis/dressFade.ts` admits the `dissolveDebris` tag); per-kind
   `fade: false` for dust that must outlast the visit.
4. **DETERMINISM.** Every fragment path is a pure function of (seed = the
   position hash `dissolveSeedOf(x, y, kind)`, t since the break) — seats and
   resumes draw the same fall; nothing new on the wire.
5. **PERF-CAPPED.** `DISSOLVE_CFG.maxLive` caps live motions; past it a break
   lands its debris and its voice but stamps no record (THE HONEST DEGRADE —
   never a stall). Zero idle cost: every consumer gates on an empty list.
6. **ONE ACCENT CHANNEL.** The break's flash speaks through THE EFFECT VOICE
   (`render/vis/effectVoice.ts`); the grammar adds voices, never a second flash
   system. A haze flash (the mirage kit) keeps its ring — no voice over it.

## The data surface

```ts
// engine/levelgen.ts DOODAD_RULES (or registerDoodadRule)
burial_urn: { ..., brittle: { on: ['hit', 'touch'], orbChance: 0.55, ... },
  dissolve: { material: 'ceramic' } }                       // names only its material
secret_wall: { ..., dissolve: { motion: 'giveway', material: 'stone', preCrack: true } }
mirage_oasis: { ..., dissolve: { material: 'light' } }      // dissolve, no dust, haze kept
```

`DoodadRule.dissolve: DissolveSpec` — one row per consumer:

| field | meaning | default chain |
|---|---|---|
| `motion` | crumble · giveway · shatter · burst · dissolve (open) | the material's own motion |
| `material` | ceramic · glass · crystal · ice · stone · earth · wood · bone · salt · pod · light (open) | — |
| `cut` | shards · strata · facets · lobes · none (open) | material → motion |
| `pieces` | [lo, hi] fragment count, seeded inside | material → motion → base [6,10] |
| `life` | seconds the fragments move | motion → base 0.9 |
| `fling` / `gravity` / `spin` | outward radii/s · fake-2D px/s² · rad/s | motion → base |
| `debris` | the debris KIND pushed at the instant; `false` = none | material → motion |
| `debrisRadius` | fraction of the body radius | base 0.85 |
| `fade` | `{ after: [lo, hi], rate? }` dwell-then-dry; `false` = outlasts the visit | base `[45, 75]s @10` |
| `voice` | the effect voice the flash speaks; `false` = classic body (or haze) | material → motion |
| `haze` | a heat-haze ring on the flash (the dissolve's cue) | light/dissolve 1 |
| `preCrack` | a dwell-gated break draws a growing crack at the stand point | base false |
| `scope` | bitmap reach as a multiple of the radius (one-shot paints) | base 2.2 |

**Precedence at resolution:** the row > `DISSOLVE_MATERIALS[material]` > the
motion def (`registerDissolveMotion`) > `DISSOLVE_CFG.base`. `dissolveFor(kind)`
is the ONE read every consumer makes (`resolveDissolve(row)` the pure fold);
an absent or unknown row resolves `null` and the classic pop stands.

**The registries (open by design):** `registerDissolveMotion(id, def)` — a
`DissolveMotionDef` carries its default cut/pieces/life/fling/gravity/spin/
debris/voice and its `pose(k) → FragmentPose` kinematics law; `registerDissolveCut(id,
cutter)` — a `DissolveCutter(seed, n, strike, scope) → DissolveCell[]` in body
units (1 = the radius, screen axes). A future 'melt' or 'unravel' is one
registration.

**The material defaults (`DISSOLVE_MATERIALS`, the MATERIAL_NATURE idiom):**
ceramic → shatter/shards/debris_clay/dust · glass → shatter/shards/debris_glass/
sparkle · crystal → shatter/facets/debris_glass/sparkle · ice → shatter/shards/
debris_rime/sparkle · stone|earth|bone → crumble/strata/debris_rubble/dust ·
salt → crumble/facets · wood → giveway/strata/debris_splinters/dust · pod →
burst/lobes/debris_pulp/wetpop · light → dissolve/none/no debris/haze.

## The five motions (each a registered `DissolveMotionDef`)

| motion | cut | kinematics (pure f(seed, i, t)) | debris | voice |
|---|---|---|---|---|
| **crumble** | strata | pieces SLUMP down and a little outward, lower strata first, squashing as they settle | rubble | dust |
| **giveway** | strata (+ the PRE-CRACK over the dwell) | pieces DROP inward/down, top rows a beat behind | rubble | dust |
| **shatter** | shards | radial FLING from the strike + spin + a fake-2D sag; friction — the skitter dies out | rubble (clay/glass/rime by material) | dust / sparkle |
| **burst** | lobes | an outward PUFF: lobes fly a short way, swell, and are gone | pulp | wetpop |
| **dissolve** | none | alpha fade under a sideways heat-lean + a hair of lift (the `mirageGhost` law); the haze ring breathes | none | — (haze) |

## The engine's share (`World`)

- `World.dissolves: DissolveBreak[]` — live records (the flash idiom: `life`
  ages on the world beat, pruned at 0, cleared per zone load, never persisted,
  not on the wire). A record = the body's LOOK as it stood (kind/pos/radius/
  rot/dir/tier — read BEFORE any kind swap), the folded spec, the seed, the
  strike point, and the `debris` piece.
- `World.dissolveBreak(body, spec, strikeAt, adopt?)` — THE ONE ENTRY. Pushes
  the debris kind (or adopts an existing piece — the brittle `remains`, the
  harvest husk), tags it `dissolveDebris`, stamps `laidAt`, hands it to `evap`
  per the spec's fade with a SEEDED dwell (no global rng draw — the pop's own
  stream stays byte-identical), then stamps the record unless the cap is hit.
- `popBrittle(d, striker, strikeAt)` — the brittle kinds: after every tested
  consequence (splice, carve, remains, spawn/fume/collapse) the hook runs; the
  pop's own flash wears `fx: spec.voice` (unless it wears haze); the remains
  doodad IS the debris. `strikeAt` arrives from the strike seam (`at`), the
  projectile step (`p.pos`), the touch/near sweep (the body's seat) and the
  dwell ledger (the first press).
- `harvestSettle` — the node's pre-swap look crumbles INTO its husk (adopted
  as the debris; the husk fades minutes-grade on the nodes' row; payout
  untouched).
- THE PRE-CRACK ledger: `brittleAccrue(d, br, dt, from)` opens
  `dissolveCracks` (doodad → the stand point) on the FIRST press of a
  `preCrack` kind; `World.dissolveCrackView()` derives `{ d, frac, from, seed }`
  rows for the renderer (empty while nothing is pressed); the pop deletes the
  entry; zone load clears it.
- DEV levers (the gauge walk, `dev/tabs/dissolve.ts`): `devDissolveRing()`
  stands every brittle+dissolve kind in a ring; `devDissolveNearest(motion)`
  forces any motion on the nearest body (brittle kinds through the REAL pop
  via `dissolveOverride`; others spliced + dissolved directly);
  `devDissolveAllInView()`; `devDissolveInfo()`.

## The drawn share (`render/vis/dissolveLayer.ts`)

- **THE FRAGMENT SET** (per record, built once, released with it; the cache
  steward trims the lot at zone/run boundaries): the body's BITMAP — for
  `bakeWhole` kinds the sprite bake cache's own sprite at the exact variant
  `paintBakedWhole` blits (`wholeVariantOf`, `wholeSpriteSpins` — painters.ts);
  for live-painted kinds a one-shot paint of the kind's painter into an
  offscreen canvas at the break's clock (the fake-doodad-at-its-own-seat trick
  — every position-seeded detail matches what the player saw) — plus the
  seeded cells (`dissolveCells`) and the strike point in body units.
- `drawDissolves(ctx, world, cam…)` — after the doodad pass, under bodies:
  for each live record in view, each cell draws as a clipped `drawImage` of
  the bitmap under its pose (`dissolvePose`: offset, rotation, scale, alpha,
  shear about the cell's pivot) + a faint ground shadow (`VIS_CFG.dissolve.
  fragmentShadow`). N clipped blits per live break per frame; zero when none.
- `dissolveDebrisAlpha(d, world)` — THE SETTLE: the debris' drawn alpha fades
  IN over `DISSOLVE_CFG.settle` of the life (the renderer routes a settling
  piece through the soft-dry pass and multiplies its face).
- `drawDissolveCracks(ctx, world)` — THE PRE-CRACK: seeded crack arms
  (`dissolveCrackLines(seed, frac, from)`) growing from the stand point over
  the dwell — the creak made visible.
- The `litter` painter (registered into `PAINTERS`): one debris painter, a
  `shape` per material — clay SHERDS, glass/ice GLINTS, rock SCREE, wood
  SPLINTERS, wet PULP (`DOODAD_VISUALS.debris_*` rows).
- The voices (registered into THE EFFECT VOICE): `dust` (a low settling
  breath + grit flecks), `sparkle` (glints + a cold wink), `wetpop` (a wet
  ring + droplets). Dials in `VIS_CFG.dissolve`.

## Co-op · perf · gates

- **Wire:** nothing new. The motion is render-side off the break; a record
  never ships. D0's honest limit: a co-op CLIENT plays no fragment motion and
  no pre-crack for a host-side pop (the client's doodad list converges as
  ever; the pop's flash + voice reach it through the flash stream). Shipping
  derived `{k,x,y,r,rot,age}` rows is a one-row follow-up if her gauge wants
  guests to see the break.
- **Perf:** `world.dissolves.length` gates the draw; the pre-crack view is one
  Map-size read; the engine prune loop walks an empty array. `npm run perf`
  gates after the pass.
- **Gates:** `npm run probe -- dissolve` (and the full lane), `npm run check`,
  `npm run genqa` (the debris kinds carry rules + visual rows; nothing stamps
  them), `npm run sim -- run --suite smoke` + `baseline check`.

## D1 — THE TAIL (built): the grammar at full reach

- **Every text-carrying breakable converted** — the forty the D0 census named
  (the geode, the veins, the still, the lanterns and the totem, the stone tree
  and the watcher, the kit spill and the smugglers' cache, the flesh kit's
  stalk/seal/polyp/eyes, the sac, the caul, the soul cage, the coil, the brush,
  the snare, the sky/storm/mirror glass, the charge cell, the war camp's rack/
  dummy/drum, the plinth and the basin and the offering urns, the slumped
  shell, the molt husk, the garden's pod/bud/dew bead, the charnel kit's cart/
  grave/midden, the keg and the munitions) — each a `dissolve` row, its
  caption gone in the same commit. THE RETIREMENT CENSUS is now **THE SHOW
  LAW** (rig B4): ZERO brittle rules carry a text/warn line — a future
  breakable that wants to be felt gets a motion, never a caption. Spawn/
  corpse lines ("the dead wake!", "the load spills out!") are the wake's own
  announce, not the break's, and stand.
- **THE FLOOR PRE-CRACK** — the trapworks false floor's telegraph: `World.
  collapseFloor` opens a FLOOR LEDGER row per doomed cell (`dissolveFloorCracks`,
  expiring at the plant); `dissolveFloorCrackView()` derives the renderer's rows
  (cell heart, radius, the telegraph's fraction, a seat-hash seed) and
  `drawDissolveCracks` strokes both ledgers through the ONE arm law; the plant
  speaks the dust voice on the pop channel (clients too); "the floor gives
  way —" retired. The collapse/pit law fires at the clock exactly as before.
- **THE DEBRIS FACE** — `DissolveSpec.debrisLook { color?, shape? }` (a row > material
  field; resolved `debrisLook`) is stamped onto the debris doodad at the break as
  `Doodad.litterLook` (runtime-only); the `litter` painter reads it per piece, so
  ONE litter kind reads as what broke. **The per-family harvest husk faces**
  (the harvest pass's banked coda) close here: `HarvestNodeDef.husk` rides the
  nodes' row as the debris face (amber sherds, rime glints, marrow chips,
  wet caps…); `harvest_husk` paints through `litter` (grey scree bare), and the
  harvest boot's spent re-place stamps the look too. Also: the charred keg's
  staves, a grave's dark soil, each flesh kind's own meat tone.
- **New pieces**: materials `iron` (shatter → dark sherd scraps), `cloth` (burst →
  tatters), `verdure` (give way → the jungle face's own `verdure_litter`), and
  `bone` now leaves `debris_bone`; debris kinds `debris_bone` / `debris_scraps` (litter
  shapes `bone` / `scrap`); the `wisp` voice — THE PRECISION TEST applied: the soul
  cage's line carried information ("a soul slips free"), so the release is
  DRAWN (a pale mote slipping up and away over the pop's own longer flash,
  `brittle.pop.life`) before the line goes.
- Probe rigs L (the floor pre-crack over the real trap clock), M (the debris
  face on a live pop), N (the soul cage's wisp + shatter); probe_fleshkit's
  A1–A3 re-homed on the dissolve law; the dev ring scales its radius with the
  count (fifty-five kinds now stand).
- **THE ROW LAW (the coda)** — NO breakable pops the bare ring: the six brittle
  kinds that still did are rowed (`crumbling_wall` stone give-way; `fitted_face`
  / `draft_seam` / `hollow_seam` stone give-way + the pre-crack over their dwells,
  the hollow's own carve untouched, the rubble remains adopted; `verdure_face`
  verdure give-way into its litter; `comet_shard` warm crystal facets).
  probe_dissolve B5 pins it: every brittle kind carries a dissolve row. The
  wider SHOW/TELL census — every remaining floater, the generic ring's 265
  users, the AI announces, and the ladder of movements that follow this grammar
  (THE EMERGENCE GRAMMAR first) — is `docs/design/show-dont-tell.md`.

## The D0 set (converted, lines retired) and the tail

D0: `burial_urn` / `kiln_urn` / `clay_pots` (shatter — her urn ruling),
`glass_shard` / `crystal_cluster` / `icicle_cluster` (shatter), `secret_wall` /
`cracked_face` (give way + pre-crack), `rotten_bridge` (give way + pre-crack as
the creak; the collapse/pit law untouched), the harvest nodes (crumble into
the husk), `gas_pod` / `burst_sac` / `puffcap_cluster` (burst; fume fires as
ever), `mirage_oasis` / `mirage_bastion` / `mirage_caravan` (dissolve; haze
kept; spawn pool untouched). D1 (built — see above): the whole tail, the trapworks floor, the debris
face, the new materials/pieces/voice. The census now fails on ANY captioned
breakable (THE SHOW LAW).

## Dials (ALL unblessed — her gauge walk)

`DISSOLVE_CFG` (maxLive 12 · base pieces [6,10] life 0.9 fling 2.6 gravity 260
spin 5 debrisRadius 0.85 fade [45,75]s @10 scope 2.2 · strikeInset 0.62 ·
settle [0.55, 1] · crack reach 0.95 arms [3,5] segs 3), every motion def's
numbers, every material row, the harvest husk fade [150,240]s @6,
`VIS_CFG.dissolve` (skipBelow, bitmapRes 2, fragmentShadow 0.18, crack
color/alpha/width, litter density/size/glintAlpha, the three voices' dials).
