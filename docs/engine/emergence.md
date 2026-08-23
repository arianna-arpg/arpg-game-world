# THE EMERGENCE GRAMMAR — a body arrives as a drawing

`src/engine/emerge.ts` (the pure leaf: spec, ground defaults, the open motion
registry with pure pose + grain laws, the ONE resolver, the ground derivation)
· `World.emergeBody` (the one engine entry) + its consumers · `src/render/vis/
emergeLayer.ts` (the slit + the grains; the arriving body's pose read) · dev
tab `src/dev/tabs/emerge.ts` · probe `balance/probe_emerge.ts` · design
authority `docs/design/show-dont-tell.md` §3b (M-EMERGE — the first rung of
the show-don't-tell ladder). The dissolution grammar's MIRROR: what that one
does for a body leaving, this does for a body arriving.

A body used to arrive the same way everywhere: it stood at its seat, a pale
ring flashed, a caption told you what you did not see — "the sand shifts…",
"the dead wake!", "something skitters out!", 'ambush!'. Now the arrival is a
MOTION chosen by the GROUND under the seat and the HOST it leaves: the body
RISES through the ground's own flung grains, BURSTS OUT of a breaking host,
CONDENSES from light, SURFACES through water, DROPS from above, or STIRS
where it already stood. The caption retires where the motion lands.

## The laws (probe-pinned — `balance/probe_emerge.ts`)

1. **DRAWN == TESTED.** A held body is `untargetable` and does not think
   (`Actor.emergeUntil`; the AI's early return) for exactly the motion's
   life; the renderer draws it through the pose for exactly that long
   (`emergePoseOf`); the release and the standing body coincide. A visible
   sleeper STIRS unheld (it was always there).
2. **NO TEXT.** An arrival that plays a motion speaks no caption —
   `AmbushSpec.announce` and `BrittleSpawn.text` are gone (the census pins
   that no MonsterDef ambush spec speaks).
3. **DETERMINISM.** Every pose and every grain is a pure function of
   (`emergeSeedOf(seat, actor id)`, age); nothing rides the wire.
4. **PERF-CAPPED.** `EMERGE_CFG.maxLive`; past it the body simply stands
   (the renderer's spawn-in grow still plays — THE HONEST DEGRADE), no hold.
5. **ONE ACCENT CHANNEL.** The arrival's flash speaks THE EFFECT VOICE (the
   ground's voice: dust · sparkle · wetpop) or wears the haze ring (light).

## The data surface

`MonsterDef.emerge?: EmergeSpec` (how THIS kind arrives whenever minted
mid-play in view) and `AmbushSpec.emerge?: EmergeSpec` (the ambush lane's
override — instance rows win). A row names only its `motion`, or only its
`ground`, and inherits the rest:

| field | meaning | default chain |
|---|---|---|
| `motion` | rise · burstout · condense · surface · drop · stir (open) | the ground's own |
| `ground` | earth · sand · snow · mire · ash · stone · verdure · flesh · water · lava · blood · light · canopy (open) | derived from the seat |
| `life` | seconds the arrival plays (the hold) | motion → base 0.55 |
| `grains` / `fling` / `grainColor` / `grainShape` | the flung ground bits | ground → motion → base |
| `voice` / `haze` | the flash's accent | ground → motion |
| `hold` | take the body for the life | motion (stir = false) |
| `lift` / `dropFrom` | rise/surface depth · drop height, in radii | motion → base |

**THE GROUND DERIVATION** (`emergeGroundFor(biome, region)` — pure): the
region kind under the seat first (water surfaces in ANY country; lava; blood;
bog/mud → mire; ice → snow; sand; ash; scree → stone; brush/reeds → verdure),
else the country (desert/beach/steppes → sand · tundra/taiga/highland → snow ·
marsh/mycelia → mire · flesh/caul → flesh · volcanic/flame/warfront/scald →
ash · cavern/crystal/karst/ruin/sepulcher/ossuary/metropolis → stone ·
jungle/grove/forest/gloamwood/garden → verdure · aether → light ·
deepsea/ocean/river → water), else earth. `World.emergeGroundAt(p, tier)`
reads the doodad ground (`groundAt`) then the grid region then the biome.

**THE FOLD** (`emergeFor(rows, ground, host)`): instance row > def row; a host
with no row BURSTS OUT; a bare seat RISES by its ground; a named motion still
takes the seat's grains. `resolveEmerge` is the pure precedence
(row > ground > motion > `EMERGE_CFG.base`).

## The six motions (each a registered `EmergeMotionDef`)

| motion | the body | the ground | hold |
|---|---|---|---|
| **rise** | climbs up through a clipped ground line (`clipBelow`), squashed wide then standing; the shadow grows | THE SLIT gapes at the feet (`emergeSlit`), the ground's grains arc out and settle | yes |
| **surface** | the rise through a liquid — shallower, a bob as it breaks the skin | the slit in the liquid's tone; droplets | yes |
| **burstout** | pops from small past full (1.2×) and settles; alpha in fast | none of its own (the host's burst is the scatter) | yes |
| **condense** | alpha in under a sideways heat-lean, motes drift INWARD | light motes; the haze ring on the flash | yes |
| **drop** | an ease-in fall from above, a landing squash; the shadow grows as it nears | a dust puff at the landing only | yes |
| **stir** | a shudder and a breath where it stood | a few specks | no |

## The engine's share (`World`)

- `emergences: EmergeRecord[]` (the flash idiom: aged on the world beat,
  pruned, zone-cleared, never persisted, not on the wire).
- **`emergeBody(a, { host?, spec?, ground? })`** — THE ONE ENTRY: folds the
  rows over the seat's ground, pushes the arrival's flash (voice or haze),
  stamps the record unless the cap is hit, and — when the spec holds — takes
  the body (`untargetable`, `emergeUntil`; the prior targetability
  remembered) until `updateEmergences` releases it.
- Consumers: `springAmbush` (the ambush row's override; a `visible` spec
  stirs; the pack chain arrives per kin), `popBrittle`'s WAKE (host lane —
  the urn's skeletons, the sac's ticks, the brush's stalker), `corpseSpawn`
  (hiveborn crawlers), the broodlings, the raised dead ('risen!' — RISE by
  ground), `spawnInRadius` (an encounter's pour). Zone-load population is
  exempt (pre-placed, no record).
- DEV: `devEmergeRing` (one armed ambusher per motion around the hero — the
  instance lane: the spec rides the body, then arms), `devEmergeNearest`,
  `devEmergeInfo`.

## The drawn share (`render/vis/emergeLayer.ts` + the renderer)

- `drawEmergences` after the doodads, under bodies: THE SLIT (a dark ellipse
  at the feet gaping then closing; a pale rim) and THE GRAINS (grit · clod ·
  flake · drop · ember · mote · leaf, each a pure seeded arc). Zero cost when
  no arrival is live.
- `drawActor`: `emergePoseOf(world, a)` — the ground line clips BEFORE the
  pose's own offset (a rising body climbs through a fixed line), then the
  climb/fall/overshoot/lean; the arrival owns its alpha (the hold's
  untargetable never ghosts it) and its shadow (grows with the rise); the
  SPAWN-IN grow yields to the emergence when one plays.
- Co-op: nothing new on the wire — a client sees the body appear as ever (the
  host's hold governs hits); shipping a derived `{id, motion, ground, at}` row
  is a one-row follow-up if her walk wants guests to see the arrival.

## Dials (ALL unblessed — her walk)

`EMERGE_CFG` (maxLive 16 · base life 0.55 grains [6,10] fling 1.6 lift 1.6
dropFrom 6 · slit width 1.15 height 0.38 peak 0.45) · per motion (rise 0.6s
[7,11] · surface 0.55s [6,10] fling 1.3 lift 1.2 · burstout 0.42s · condense
0.7s [8,12] fling 1.8 · drop 0.5s [5,8] · stir 0.45s [2,4]) · every ground
row's palette/shape/voice · `VIS_CFG.emerge` (slit color/alpha/rim, grain
size [1.4,3.6], rim alpha, mote glow). Her walk: Dev → Emerge → Stand the
ring (one motion per body, the ring's own ground) · re-play any motion on the
nearest body · the read.
