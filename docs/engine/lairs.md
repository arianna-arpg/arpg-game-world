# The Lair Fabric — apex natives claiming ground by predicate

`src/engine/lairs.ts` (the seat registry + fold), `src/data/lairs.ts` (the
lairs themselves), `den_mouth` in `src/engine/landmarkBuilders.ts`.
Probe: `balance/probe_lairs.ts`. Debuts: the Frostmaw (yeti), the Giant's
Cairn, the Hag's Hovel, the Riddle Vault.

## Why it exists

Before this fabric a den existed only where its home country's compositions
planted the door (the Wane's arch on Vesperlands ground, the gleamhollow's
bole in the grove). Nothing let a *creature* claim land by rule — "yetis
live under the mountains, one or two caves deep, and nowhere else." The lair
fabric is that sentence as one data row. It adds **no new placement
machinery**: a seat row resolves into an ordinary `LandmarkRoll` appended at
the two mint chokepoints, so siting, reachability, portal clearance, the
noDeeper strip, genqa's invariants and zone memory all arrive from standing
law.

## The seat (`LairSeat`)

```ts
registerLair({
  id: 'frostmaw',
  landmark: 'frostmaw_lair_mouth',
  seat: {
    biomes: ['highland'],          // surface biome / cave-ladder ANCHOR
    place: 'cave',                 // 'cave' | 'surface' | 'both'
    strata: { from: 1, to: 2, fadeOut: 2 },  // over ZoneDef.caveDepth
    level:  { from: 5, fadeIn: 3 },          // over the zone's level
    chance: 0.35,                  // scaled by both envelopes, clamped ≤ 1
  },
});
```

- **biomes** — underground this matches the ladder's **anchor** (the surface
  biome the whole ladder hangs beneath — provenance survives nesting), so
  "under the mountains" stays true whatever face the strata fabric rolled.
- **strata / level** — presence-fabric envelopes (`presenceMul`). One
  evaluation law: strata always reads `caveDepth ?? 0`, level reads the
  zone's level. Integer depths make a 1-wide fadeOut a hard cliff — author
  `fadeOut: 2` when you want the next rung to whisper before refusing.
- **chance** — rolled per qualifying zone *inside generateLayout's landmark
  loop* (the roll rides the baked row; the fold itself draws nothing).
  Scaled results under `LAIR_CFG.minChance` are dropped before the def
  bakes them — no ghost draws, and ground no lair claims stays
  byte-identical.
- `tilesets: [...]` — optional allowlist when a lair keeps to named faces.

**Chokepoints:** `placeZoneAt` (surface mints — beside the tileset + biome
landmark merge) and `mintCave` (the ladder — beside the face roll). Sealed
pockets (`noDeeper`) and harbors (`port`) refuse all lairs by rule, and the
levelgen entrance strip eats any stray door a variant smuggled in.

## The two lanes

**`kind` den — a mouth that mints a country.** The seat's landmark is a
`den_mouth` builder recipe: a trodden apron (optional `floorKind` wash), the
**spoor ring** (`dress` rows — bone piles before the door: the den reads
from thirty paces), and the mouth doodad centered. The mouth is an ordinary
registered **sidezone** (`registerSidezone`) minting the den country through
`mintCave` with a forced tileset: authored name, authored objective, its own
fauna (the NEST_FAUNA lesson — without authored rows a minted pocket grows
plains wildlife), `noDeeper: true` (the den is the bottom), and a gateway
ledger (`frostmaw_entered` — the ruin_entered pattern, ready for any future
unlock). Same mouth, same den, forever: position-hash seeds make every den
persistent geography.

**`landmark` lair — the lair IS the landmark.** No door: the seat places a
whole in-zone set-piece whose `spawns` carry the natives. The Giant's Cairn
rides the pit builder (which grew fence_ring's `inner` dressing rows — the
cookfire in the ring) and arms its giant through the **ambush fabric**
(`visible: true, pack` — the gnasher pen's law: a readable sleeping threat,
sprung as one event on proximity or a wound).

## The debut natives

| lair | where | behind the door | faction |
|---|---|---|---|
| **the Frostmaw** | highland caves, depth 1–2 (depth 3 whispers) | yeti packs, a snow-hare larder they hunt through hunger drives, the **Rimefather** (boss ask seals the arena; the chest banks) | `jotun` (new) |
| **the Giant's Cairn** | highland + downs surface | a sleeping `hill_giant` (marquee `bossBar`, never `boss`) in a stone ring with his cookfire and midden | `jotun` |
| **the Hag's Hovel** | marsh surface | the root-cellar hollow: wisp court, rats in the walls, the **Mire Hag** (confusion-family kit) | `coven` (new) |
| **the Riddle Vault** | desert surface AND caves 1–2 (`place: 'both'`) | a **puzzle** objective (the tileset's riddle repertoire), the hoard chest banking on the answer — and the **Vault Sphinx**, a dormant `vault_warden` planted at her plinth | `carven` |

The sphinx is the fabric's thesis statement: the den's ask is *exploration*
(answer the riddle; roads never seal; violence optional). She stands as
statuary through the sentry fabric (`registerDormantTag('vault_warden')` —
latched-once, no reset row: stone does not forgive) and wakes through
`registerRouseRule` — **the new open sibling of registerDormantTag**
(engine/ai.ts): static wound-rouse rules register from def files; only
world-state readers that must close over live overlay tuning stay in
`World.rouseRules`.

The yeti's kit is the grab fabric worn as identity: `yeti_snatch` (carry) +
`yeti_hurl` (throw at 700 impulse — walls, drops and the bowling lane all
pay out through the mass fabric with the yeti's name on the credit). Every
alpha pays `lair_hoard` (loottables.ts) — a repeatable faucet tuned a
half-step over `boss_gear`, never near the one-shot capstones.

Factions are deliberately **diplomacy-silent**: no RELATIONS rows, no
WAR_PAIRS seeds, no FACTION_TRAITS — natives claim ground, not wars, and the
default `neutral` stance means the world's armies leave the mountain alone.

## Authoring a new lair

1. A den tileset if the lane is a den (`frontier: false`, `perfProbe: true`,
   `sky: 'sheltered'`, its own `caveLayouts`/packs/variants — gleamhollow's
   template). Never a `caveFace` — the mouth is the only door in.
2. `registerDoodadRule(mouth, { overlap: 'trigger', spacing: 60 })` + a
   `DOODAD_VISUALS` row (the parameterized `caveMouth` painter reskins:
   fixed palette on purpose — a lair mouth reads as ITSELF anywhere).
3. `registerLandmark` — `den_mouth` + `mouthKind`/`dress`, or any builder
   for an in-zone lair (`mustReach: true, poi: true, clearSite: true`).
4. `registerSidezone` for den lanes — forced tileset, name, objective,
   fauna, `noDeeper: true`, `ledgerOnEnter`.
5. `registerLair` — the seat.
6. Natives in `data/monsters.ts` (kit-net rules apply: skills exist, carry
   `ai` hints, affordable from the def's mana — probe_anatomy pins all
   three), a look in `data/looks.ts`, `loot: 'lair_hoard'` on the alpha.

## Wave two — lairs of many laws

The second wave generalizes the gnasher-pen doctrine: **a lair is a place
where one mechanic gets to be the whole argument.** Each debut seats a
different landed fabric as its law, and the seat registry grew ONE axis:
`LairSeat.courses` — course claims (`world/courses.ts` CourseSpec.id), so a
native can stand on zones minted ALONG a traced course ("the rivers
themselves"), with `biomes` still gating the local ground the course is
crossing.

| lair | where | the law |
|---|---|---|
| **the Maze** | karst surface | THE SCENT HUNT (watch fabric): the bull reads your trail prints through the walls; the maze's standing water breaks the line — the tracker posture seated as terrain. |
| **the Emberwyrm Barrow** | volcanic surface + caves 1–2 | THE SLEEPER + THE EMBER: a genuine sleeper (hearing-ring watch — rob the gem-cache hoard floor on tiptoe) whose fire verbs are all PRICED from one finite reserve. Wake it and its opening minute is the worst minute; outlast the burn and it visibly gutters (`guttered`), re-kindling only in the quiet. |
| **the Spinney** | forest surface | THE COLONY + THE COURT: a pooled lite brood that regrows while the matron stands, and her own strength hung beneficiary-side on the weaver court — the silk bond rope IS the kill order. |
| **the Wellspring** | ON the rivers (`courses: ['rivers']`, six crossing biomes) | THE ROOTED GROUND: the naiad claims `water` — monstrous in her pool, drawn wilt off it, undertow reeling you IN because all her numbers live where the water is. The in-zone lane (lake landmark + spawns), no den. |

Authoring lessons the wave banked: the pack `bond` field is worn by the
BENEFICIARY (its `kin` names the holder it looks for), cast `useTime` +
recovery must clear before a re-press or `useSkill` refuses for the wrong
reason (probe pacing), and a reserve's post-refusal residue read must
tolerate the calm regen re-kindling — that residue is the law, not a leak.

## Wave three — THE LADDER (horizontal progression per biome)

Two more seat axes make a biome read as a **progression**, not a palette:

- `LairSeat.interior` — a weight envelope over `ZoneDef.geo.biomeDepth`
  (0 = the country's border, 1 = its deep heart; the marine shallow/deep
  sampler, hoisted above the roll merge so the fold can read it). Caves
  inherit their parent's depth — a cave under the deep mountains is still
  deep-mountain ground.
- `LairSeat.climate` — inclusive `[min, max]` bands over the climate axes
  at the mint coordinate (`{ elevation: [0.55, 1] }` = high ground only —
  the relief fabric's vertical truth as a seat gate).

Rows that ask REFUSE unreadable ground (directed mints without samplers
never host deep-country content); rows that don't ask never mind the new
axes. Compose them with the level envelope and one biome becomes a ladder:

**The highland ladder** — the cairn at the border (level 6+), the Frostmaw
under the slopes (5+, caves 1–2), and at the high deep heart (14+,
interior ≥ 0.55, elevation ≥ 0.55) **THE DRAKE ROOST**: a crag mouth into
an OPEN-SKY shelf (`def.sky = 'open'` — `skyOf` honors an explicit sky
over the caveDepth derivation, so weather reaches the perch), floored
with gem caches, grazed by a live ibex larder, and held by **Old Scald**.
The roost's law is the ANATOMY GAMUT: the wings are a real composite part
whose break silences both wing verbs (`breakDisables: crushing_leap +
gust_burst` — the silenced instances leave the bar) and slows the walk —
BREAK THE WINGS and the sky stops helping him, while the breath (no
part's hostage) still answers. A low-level zone or a border zone
structurally cannot host the roost, so *finding one is the proof the
world has deepened* — exploration as horizontal progression, seat by
seat.

## Wave four — the crown lairs (and the conditioned door)

**`SidezoneDef.when`** — the radiance fabric as a DOOR GATE: the mouth
admits only while a `RadianceCond` holds in the parent zone (`{ phases:
['dusk','night'] }` = a barrow that opens after dark). A closed door never
starts the dwell, and standing on one floats its `refusal` (throttled) —
the schedule is readable, never a mystery. Author only on open-sky
parents: sheltered ground reads a flat twilight. Any future dawn shrine,
storm door, or moonwell gate is one field on its sidezone row.

| lair | where | held back: nothing |
|---|---|---|
| **the Leviathan Trench** | the deep sea's HEART (`interior ≥ 0.6` — the marine sampler), level 16+ | **the Fathomking** — the segment fabric at full reach: 14 REAL coils (hittable, drawn == tested), per-segment wound pools that TEAR permanently (drawn smaller, stacking slow on the root, a cold burst at the wound — spread your damage along the animal), fluke tail + dorsal sails by segment class, and a kit of gulp / undertow / breaching crushing-leap. |
| **the King's Barrow** | downs surface, level 12+, **after dusk only** | **the Unquiet King** — nocturne hours (honestly unfurled), an undead court with riderless bone-steed spares, and the phylactery bond at boss scale: while the jar stands ANYWHERE in the halls he is scarcely killable, and the bond's drawn beam crossing the dark is both the reason and the map. Break the jar, break the king. |

Rig lessons: worm segments UNSPOOL only as the body moves (march the head
before counting; winding ground pins straight marches — wander through
clampPos and read the running max), and dwell-entry rigs must step in
small beats then pull the hero OFF the arrival portal at once — lingering
ping-pongs the zones and double-mints the halls.

## Wave five — the drowned wallow (a seat for the exemplar)

**THE DROWNED WALLOW** — marsh surface, level 14+ (silent below 11), chance
0.18. The **Marsh Leviathan** was authored as the *proof* of
`MonsterDef.parts` — one creature, five hitboxes (body, head, two claws, tail;
each a full monster-actor in the root's facing frame, each breaking on its
own) — and then never placed: no pack row, no landmark, no den, no objective.
The framework's own exemplar was unreachable in ordinary play for years.

Its seat is this fabric's **cheapest lane, proven end to end**: two registry
rows in `data/lairs.ts` and nothing else. The `lake` builder already pours the
pool, `where: 'liquid'` (the wellspring's LIQUID SEAT) already seats a dweller
*in* it rather than on the shore, and the seat row's own level envelope means
the def needs no `presence` block. The other three routes all cost more — a
pack-table weight row rolls a boss-tier body as trash (and costs a tileset
edit), a den costs a whole new den tileset, an authored objective costs a
directed mint to hang it on.

Two authoring rules the wave restates:

- **The band is argued, never inherited.** ~1650 effective life (700 on the
  root, 1.35× of it again across the parts), 40 armor, 420 xp puts it between
  the Emberwyrm's barrow (9) and the Fathomking's trench (16) — so the fen
  reads as a ladder: the hag's hovel from 4, the leviathan from 14. Note
  `LevelEnvelope.from` is the first level at FULL weight and `fadeIn` the ramp
  *below* it (`{ from: 14, fadeIn: 3 }` = silent under 11).
- **A composite arms no ambush.** Parts attach as ordinary actors *after* the
  spawn, so arming only the root would leave its limbs awake beside a sleeping
  body — the cairn's `visible` sleep is a single-body word.

`probe_anatomy`'s **SEAT CENSUS** closes the hole generally: every `boss: true`
def carrying `parts` must resolve to a reachable seat (tileset/zone tables,
landmark spawns, sidezone mints, scene stages, faction rosters, world-boss
package defs), with `HIGH_COURT` zeniths and apexes exempt as *reserved* by
the registry's own reserves-and-remnants doctrine. The next composite that
loses its door is named at probe time, not by a grep years later.

## QA

`balance/probe_lairs.ts` — registry weave, the seat fold's pure law
(depth/level/biome/place gating by assertion), placement + spoor +
determinism + the noDeeper strip through real generateLayout, the live
Frostmaw round trip (boss ask → objectiveDone), snatch/hurl through the grab
fabric, the cairn's armed visible ambush, the vault's puzzle ask + dormant
warden rouse, den-mint byte-purity, and (RIG K) the drowned wallow's whole
lane — the seat's band by assertion, the fen's two rungs, one leviathan per
pool with its seat cell inside the DRAWN water, and the live hulk's four
limbs anchored in its facing frame. The den tilesets join `npm run
genqa` (interiors at cave scale) and `npm run perf` (perfProbe) by
registration, and probe_anatomy sweeps the natives' kits/looks with the
whole bestiary.
