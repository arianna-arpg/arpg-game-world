# THE GREAT GEYSER — the Scald Basin's den, and THE GEYSERMAW

**Status: M3 — the coda's first item (built 2026-08-21 on the unstaged
country pile; charter card 4 RATIFIED: "THE GREAT GEYSER den with THE
GEYSERMAW — beat-as-boss").** Design authority: `docs/design/scald-basin.md`
— §0 card 4, §2 the den row, §3 THE BEAT LAW + THE BROIL LAW, §4 downstream,
§8 the Geysermaw line ("lives IN the great geyser and is only ABOVE ground
around eruptions — the beat as a boss mechanic: the window is the fight"),
§8b THE NO-TAG LAW, §13 M3. Den lane `src/data/greatgeyser.ts`; recipe leaf
`src/engine/ventcauldron.ts` (registered `ventcauldron`); the dweller leaf
`src/engine/ventDweller.ts` + `World.updateVentDwellers`; THE BOSS SEAT
`GenCtx.bossSeat` → `GeneratedLayout.bossSeat` (engine/levelgen.ts) →
World.loadZone's boss branch; tileset `great_geyser` (`src/data/tilesets.ts`);
the maw in `src/data/monsters.ts` / `looks.ts` / `skills.ts`; statuses
`vent_submerged` / `vent_sinking` (`src/engine/status.ts`); probe
`balance/probe_den.ts` (roster: green/fast); QA launch row `arpg-dev-qa67`
(port 5162). Every number is a **DIAL** (unblessed — she blesses via
playthroughs).

## The den lane (the lair fabric, as data)

On the standing grammar (`docs/engine/lairs.md` "Authoring a new lair"):

- **THE SEAT** — `registerLair({ id: 'great_geyser', landmark:
  'great_geyser_mouth_site', seat: { biomes: ['scald'], place: 'surface',
  level: { from: 8, fadeIn: 3 }, chance: 0.14 } })` (`GREAT_GEYSER_CFG.seat`):
  scald SURFACE ground only, any face, once the world is ready to feed what
  lives there; a discovery chance, never a belt. The fold refuses every
  other biome and the cave ladder (absent == identical; probe A).
- **THE MOUTH** — the `vent_den_mouth` builder (this file's — the den_mouth
  grammar: a trodden apron, the spoor ring on its outer band, the `geyser_maw`
  door centered) PLUS **THE LOUDEST VENT**: one authored GREAT vent
  `mouth.ventClear` (124) beside the door through the geyser fabric's
  authoring seam (`GenCtx.authoredVents` → `World.bootGeysers` anchors it on
  its OWN band — the metronome law), with its own clock (`vent.period`
  [70,90]) — so the den is FOUND by ear and eye: the broil and the plume,
  the great column, its burn rain ringing the apron (entering the den means
  reading the beat). Spoor = steam pockets, sinter cones, sinter shelves,
  sulphur crust (standing kinds only; never on the vent's seat). No map mark.
- **THE DOOR** — `registerSidezone('geyser_maw')`: `mintCave(parent, seed,
  id, 'great_geyser', { rollVariant, name: 'the Great Geyser', objective:
  { kind: 'boss', id: 'geysermaw' }, noDeeper })`, `def.sky = 'open'` (the
  roost's idiom — the cauldron is a sunken bowl, not a cave; steam rises to
  real weather), authored fauna (kettle minnows in the pools, newts at the
  prism rims — the NEST_FAUNA lesson), gateway ledger `great_geyser_entered`
  (run; merged to the account by the standing law — the gleam_entered
  precedent).
- **THE KILL** — `registerKillHandler('geysermaw_fall')`: `geysermaw_slain`
  on the RUN ledger AND the ACCOUNT ledger (`bumpAccountLedger` — knowledge
  that outlives the run). The maw pays the lean repeatable `lair_hoard`.
- **THE OMINOUS LINE** — `registerZoneInfoSource`: charted scald ground whose
  baked mint SEATED the den roll murmurs one mechanics-quiet condition row
  ("the ground here keeps a louder beat") — never whether the chance landed
  the door, never a map mark (the colossal-lair doctrine).

## THE VENT CAULDRON (the recipe — `engine/ventcauldron.ts`)

The den interior: a steam-choked CAULDRON. `ventcauldronLayout`:

1. **Rolls first** (the draw-order contract): the rim seed, the heart vent's
   period (`cauldronVentPeriod` [32,44] — THE BOSS TEMPO, DIAL) and phase.
2. **The carve**: rock everywhere (`grid.fillRect(..., false)`), then THE
   BASIN — a wobble-rimmed disc (`cauldronRing` × the short axis, clamped;
   `bearingNoise` — never a ruler) painted `ground`; a clear apron at every
   portal and a corridor from each door to the heart, so exits, POIs and
   reachability live on the floor (genqa's standing invariants gate it).
3. **THE HEART**: the vent seat at the center — `ctx.authoredVents` (class
   `cauldronVent` 'great', the rolled clock — its own band), **THE BOSS SEAT**
   `ctx.bossSeat` (the 'boss' objective spawns its ask HERE — the unmade
   vault's dais, generalized), a reservation so later rolls route around,
   and `cauldronHeartClear` (150) kept free of every piece (the maw needs the
   floor; bootGeysers' clearSeat needs a solid-free mouth).
4. **The dress**: terrace rings of `sinter_shelf` (inner → outer at
   `terraces.at`), prism pools on the innermost, sulphur pools through the
   bowl, **SHELTER** overhangs (`sinter_overhang` — `DoodadRule.shelter`) on
   the middle ring — past the great column, inside the burn rain's annulus:
   the heart vent's downstream teeth (rain + runoff on that vent, standing
   law) teach shelter INSIDE the fight; steam pockets + crusts; solids never
   on a door apron or a corridor.
5. **THE POCKETS**: terrace POIs on the middle ring (spawners/caches/scenery
   nest there; the heart is NEVER a POI — a landmark-grade seat is not a free
   POI, the lake's law).
6. The tileset's own furniture (`scatterDecoration`), then the purge of
   whatever landed in the rock or on the heart (the lake's drowned-purge
   idiom). `VENTCAULDRON_PLANS` keeps the last plans for probes/dev.

Every knob is a layoutParam (`cauldronVent`, `cauldronVentPeriod`,
`cauldronRing`, `cauldronWobble`, `cauldronTerraces`, `cauldronPools`,
`cauldronPrism`, `cauldronShelters`, `cauldronPockets`, `cauldronHeartClear`)
with `VENTCAULDRON_CFG` defaults; the bare recipe stands a basin on genqa's
own case shape (probe C10).

The tileset `great_geyser` (frontier:false — minted only by the door;
perfProbe:true — joins `npm run perf`; `sky: 'open'`; `forceLayout:
'ventcauldron'`) carries the floor's OWN beat (`theme.geysers` hiss +
geysers on the current bands — the floor is never quiet between the maw's
windows), thick mist banks + haze, the mineral palette, two variants (the
prism gallery / the sulphur throat), and packs of geyserkin + wave-1/2 kin
(shaman, strider, kettleback, matron, lamprey, basker).

## THE VENT DWELLER (`engine/ventDweller.ts` + `World.updateVentDwellers`)

`MonsterDef.ventDweller: VentDwellerSpec { upSec, sinkSec?, breachText?,
sinkText?, reach? }` — a body that lives IN its home beat_vent. THE LAW: its
presence is a PURE FUNCTION of the vent's clock:

```
read  = ventReadAt(field, homeVent, world.time, mode)   // the geyser fabric's one resolver
phase = dwellerPhaseAt(read, spec, openSec, seen)       // 'under' | 'up' | 'sinking'
```

- **The window** opens `openSec` after the burst (the class's `eruptSec` —
  the column CLEARS first: the column bursts, and as the water falls the
  maw is there; it never rides its own live column) and runs the effective
  `upSec`; its last `sinkSec` is THE SINKING TELL; everything else — the
  quiet stretch AND the broil — is UNDER. **THE BROIL LAW is the breach
  tell**: the water roils two seconds before the burst, then the column,
  then the maw. No rings, no floaters.
- **UNDER** the World sweep wears `vent_submerged` (`timeScale: 0` — no
  thinking, no casting, no cooldowns burning, no DoTs; `conceals` — not
  drawn: the mouth stands quiet or broiling), stamps `untargetable` +
  `invulnerable`, pins the body to the mouth every sweep (a shove moves
  nothing; the body is `anchored` from first sight — its own column's
  authorless shove included), cancels its cast, deletes its unfired
  telegraphs (the pending columns die with the dive) and releases any held
  catch (`grabRelease`). **UP** strips the states and re-stamps `spawnedAt`
  so the renderer's spawn-in GROWS the body out of the water (the rise),
  flashes, shakes, and floats `breachText`. **SINKING** wears `vent_sinking`
  (`ghostAlpha` 0.5 — the tells fabric reads `status:vent_sinking`: the
  maw's lean + the cooling tint); hittable to the end.
- **THE SEEN COLUMN** (the breach law's witness): a clock HAND-OFF — the
  surge hour's aligned tide joining/leaving a vent (`engine/geysers.ts
  surgeTideRead`) — resets a vent's count WITHOUT a burst; on a count alone
  the maw would rise from a quiet mouth with no column. So the resolver
  takes an optional witness `{ columnSeenAt, now }` and keeps the body under
  until a column of THIS cycle was seen (`columnSeenThisCycle`); the sweep
  tracks the witness (every sampled 'erupt' read), trusting a BASE read's
  burst at first sight (a resume mid-window rises at once) and a tide read
  only once a beat is seen. Pure given the pair — the probe tracks the same
  witness (drawn == tested).
- **THE NO-TAG LAW** (structural): `windowOf(period, spec, openSec)` clamps
  the authored window so the UNDER stretch never exceeds
  `VENT_DWELLER_CFG.maxUnderSec` (40 — a slow vent stretches the WINDOW,
  never the silence: the vent keeps its clock), the window always CLOSES
  (`minUnderSec` 4 — the broil needs its stage), and is always a fight
  (`minUpSec` 5); `lintVentDweller` names every clamp loudly (the World
  warns at first sight). The den's authored band [32,44] × upSec 14 keeps
  the maw under ≤ 30s as authored — no stretch needed.
- A body's FIRST read (a fresh spawn, a resume) wears its state silently —
  no retroactive breach (the updateGeysers lastK idiom); the home vent is
  the nearest vent within `homeReach` (260) of the seat it was placed on —
  the recipe's boss seat IS the heart vent; a dweller with no vent in reach
  stands as an ordinary body (loud, once). Memory rides a WeakMap — nothing
  persists, nothing leaks across zones. Co-op: host-authoritative; the
  worn statuses ship on the ordinary status wire (conceals/ghost draw on
  clients); the A/B lever moves nothing on an authored anchor.

## THE GEYSERMAW (`data/monsters.ts geysermaw`)

The den's apex: a vast sinter-crusted maw ROOTED in the heart vent
(`moveSpeed 0` — `stationary`; the sweep anchors it), boss tier (the
false_sovereign model — a den boss, never a world boss), `loot: 'lair_hoard'`,
faction `geyserkin` (the tribe's god-in-the-vent — diplomacy-silent, the
charter's debut law), `tags: ['beast']`, fire res 0.75 / cold res −0.3,
`grabbable: false`, `possessable: false`, `ventDweller: { upSec: 14, sinkSec:
1.4, breachText, sinkText }`. Kit = the country's grammar at boss scale:

- **`geysermaw_column`** (Column Call) — the shaman's vent-call, wider and
  harder: an `atEnemies` storm (areaRadius 900, hitRadius 62, telegraph 1.6
  — an honest ring, then the column), fire + `scalded` + a 300 throw.
- **`geysermaw_spray`** (Scald Spray) — the burn rain's grammar thrown by a
  body: a storm of 6–9 droplets (hitRadius 40, scatter 150, telegraph 0.9),
  fire + `scalded` each — step between them.
- **`gulp`** (the gorge gulper's own row) — swallowed, digested, spat at your
  friends; **`wallow_reach`** — the long sweeping blow (reach, never
  pursuit).
- Brain: basic, a wrath drive (`onHurt`) whose rule quickens the cadence and
  announces — "the throat ROARS".
- Tells: `status:vent_sinking` → lean + tint (the window is closing — read,
  never told). Look `geysermaw` (blob + scutes + crystal growths + gill
  frill + the maw ring + fangs + eyes; live breath + the working gullet).

THE NO-TAG LAW on a submerging boss: the submerge is a WINDOW, never a flee
— it recurs on the vent's readable beat (under ≤ the ceiling), and the floor
stays busy between beats (the den's packs, the shoal's frenzy on the rain,
the matron's clutches hatching on the warm wake).

## Gates + verification

`balance/probe_den.ts` — rigs A–H per its header: the seat fold (scald
surface only, the envelope, absent == identical elsewhere), the mouth mint
(the door + spoor + THE LOUDEST VENT beside it, determinism), the recipe
invariants (basin, portals, heart clear + boss seat + the heart vent in band,
shelters, pockets, determinism, the bare case), the live den round trip
(id/name/noDeeper/boss ask/open sky/tileset/recipe, the entry ledger, the
heart vent first on a private band, the maw ON the boss seat, packs, fauna),
THE WINDOW LAW (every live sample's worn state == the pure resolver; the
cycle seen whole; pinned under; never in the live column; whole windows last
their spec; a DoT refused under and landing up; the jumped clock re-deriving;
the A/B lever inert on the anchor), THE NO-TAG LAW (windowOf's ceiling /
close / lint; the den's band), the kill ledger (run + account) + the ask,
and the nets. `npm run genqa` (the den face + the bare recipe auto-join),
`npm run sim -- run --suite smoke` + `baseline check`, `npm run perf --
--allow-dirty --filter=great_geyser` (perfProbe joins the sweep).

## Her walk (qa67, port 5162)

`?dev` → start a run → the Dev panel's Geysers tab mints scald faces by
name; the den is found on scald surface ground at level 8+ (chance 0.14 per
zone — `GREAT_GEYSER_CFG.seat`) by the LOUDEST vent beside a sinter-throat
door: dwell on the door. Inside: the floor keeps its own beat; the heart
vent broils, bursts — and the Geysermaw breaches as the water falls, fights
for ~14s, ghosts, sinks. Dials: everything in `GREAT_GEYSER_CFG`,
`VENTCAULDRON_CFG` + the tileset's layoutParams, `VENT_DWELLER_CFG`, the
maw's def/kit numbers, the two status rows.

## Deliberate deferrals

The Cistern Crone lair; the steam-wisp tide on a vent-seated pour; a dev-tab
readout for the dweller's seconds-to-window (`dwellerToWindow` exists for
it); a maw PART (anatomy gamut) — the kit carries the identity without one.
