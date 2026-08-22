# THE GEYSER FABRIC — terrain that keeps a beat

**Status: M0 (the spike face).** Design authority:
`docs/design/scald-basin.md` (charter v3, twice-walked 2026-08-20) — §3 THE
BEAT LAW + THE CURRENT BANDS + THE BROIL LAW, §4 downstream, §13 M0 scope.
Every number is a **DIAL** (unblessed — she blesses via playthroughs).
Engine leaf `src/engine/geysers.ts`; world half in `World.bootGeysers` /
`updateGeysers` / the `imminentThreatTo` read; drawn half
`src/render/vis/geyserLayer.ts`; probe `balance/probe_geysers.ts`; dev kit
in the Dev panel's **Geysers** tab.

## The law

A geyser is a stationary timed emitter: ground that is SAFE almost always
and lethal on schedule. The whole clock law is borrowed from the track
fabric (`trackPose`):

```
read = ventReadAt(field, vent, world.time, world.geyserMode)
```

Eruption state is a **pure function** of the synced clock and mint-rolled
parameters — no integration, no runtime re-rolls, no rng stream. Host,
every co-op seat, and a resumed save read the same broil at the same
millimetre. This is deliberately the **anti-bombard**: `BombardSpec.cadence`
re-rolls per shot to feel arrhythmic; a geyser clock NEVER re-rolls. The
looseness comes from GENERATION (the band layout and clock rolls), so the
field stays learnable by construction.

The cycle opens with the burst: `local ∈ [0, eruptSec)` = **erupt** (the
column is live), the last `telegraph` seconds (~2s) = **broil**, the rest
quiet. `VentRead` carries phase / sinceBurst / toBurst / broil ramp / cycle
ordinal `k` — one truth for the sweep, the renderer, the dodge-AI, and the
probes.

## THE CURRENT BANDS (her second-walk shape)

`bootGeysers` partitions the zone into literal in-zone bands — wobbled
stripes across a mint-rolled bearing (`bandIndexAt`: projection + seeded
1D value noise, pure) — and every vent in a band erupts **together on the
band's clock** (period + phase rolled at mint from the zone's salted
stream). Cross-band stagger is EMERGENT from the independent rolls. Great
vents are each their **own private anchor band** (the metronomes; band
index ≥ `banding.n`, sole member — probe-pinned). Authored bandless vents
(`GeyserSpec.period/phase`) get a private band carrying their own clock.

**THE A/B DEV LEVER** (`World.geyserMode`, default `'bands'`): the dev
Geysers tab flips the live zone to `'solo'` — the per-vent polyrhythm the
bands replaced. BOTH clock sets are rolled at mint (`PlacedVent.period/
phase` beside the band's), so the flip re-rolls **nothing** and stays pure.
Her M0 walk compares the two feels live; the dials lock after.

## THE BROIL LAW (drawn == tested)

The warning is the water itself: the vent's pool visibly BROILS over the
telegraph window — roil rings rising, the wash brightening, steam
thickening (`drawGeyserBroil`, under actors) — **no countdown rings, no
floaters** (the show-don't-tell law). `imminentThreatTo` speaks the same
resolver (the vent object is the stable ref; eta = the honest `toBurst`),
so dodge-AI and the reticle agree with the eyes; the dodge horizon clips
the 2s broil to its last stretch — the locals step off a breath before.

## THE COLUMN

At the beat, a strike at the vent's own seat through the ONE hazard-payload
grammar (`sweepHazardSurface`): mitigated typed **fire** + an **authorless
radial shove** (`engine/mass.ts` reserved "wind, geysers" for exactly
this). No owner is ever passed — uncredited environment, faction-blind
(the trapworks doctrine: the dead build no allegiance); dormant sleepers
and airborne bodies spared by the grammar's defaults; a death to the
column names no killer and still pays the watcher (the standing
killerless-kills ruling). The ICD outlasts the live window: one eruption =
one hit per body. The drawn splash ring IS the tested disc (`columnR`).

## Downstream (M2b: the blend — charter §4, card 2)

`GeyserSpec.downstream` / `DownstreamSpec { show?, rain?, runoff? }` per
authored vent; per-class defaults in `GEYSER_CFG.downstream` (hiss/geyser:
show; great: show + rain + runoff); resolved ONCE at seat time onto
`PlacedVent.downstream` by `resolveDownstream` (read through
`ventDownstream` — a hand-built vent resolves to its class: absent ==
identical). **Rain is the GREAT vents' privilege**: a lesser class asking
is refused with a warn. `show` is documentary — spectacle is UNCONDITIONAL.

- **The column + plume** — `drawGeyserColumns`, over actors, under the
  sight veil (a column behind a wall hides whole).
- **Lob comets (spectacle)** — render-only arcs out of the plume
  (`cometFanOf`: a pure per-cycle integer hash, the rideCapOf family —
  every seat deals the same fan), landing `rainDelay` after the burst,
  planting `scald_pock` dress through `plantImpactDress` (the transience
  doctrine). On vents that RAIN the hashed fan stands down — the rain's
  own lob zones draw the comets (one drawn word, one landing).
- **THE BURN RAIN** (`World.burnRain`, `GEYSER_CFG.rain`, `rainFanOf`): the
  great vent's comets LAND as teeth — one telegraphed SKY-BORNE zone per
  droplet (`count [4,9]`, the annulus `[120,260]`, biased DOWNWIND off
  `World.windAt` at the burst; a pure per-cycle hash — strict
  periodicity), fired BY THE FIXTURE through the weather strike's
  casterless posture (`hitAll` / `spareDormant` / `spareRoofed` —
  uncredited environment, faction-blind, nothing to silence), landing
  `rainDelay` (0.8s) after the column with honest landing rings + the lob
  comet from the plume (`lobFrom`/`delay0`), `scald_pock` on impact, the
  droplet skill `scald_rain_drop` (fire + `scalded`), and each landing
  feeding the scorch bar of the grounded, unroofed bodies under it
  (`rainScorch`). **Shelter is the counterplay**: `DoodadRule.shelter`
  (the scald basin's `sinter_overhang`) reads as a roof in
  `World.underRoofAt`.
- **THE RUNOFF** (`World.pourRunoff`, `GEYSER_CFG.runoff`): a great vent's
  spent water poured from its SPILL SIDE (`spillBearing` — a pure hash of
  the seat; `ventSpill`) as one marching `scald_runoff` section through
  the creep fabric's runtime seam (`addFront`): a finite, flowing, fading
  scald run that stings and warms what it crosses (docs/engine/scald.md).
- **THE WARM HATCH**: the rain's landings + the runoff's wash feed the scorch
  bar of any body under them — pods wearing `hatch.onScorch` hatch early.

Burst-edge side effects (splash flash, shake, comet scheduling, the rain
zones, the runoff section) ride the tracks fabric's cosmetic-state idiom
(`PlacedVent.lastK` — never persisted; a resume inits to the current
ordinal, so no retroactive bursts, rain or runs).

## Namespace law

The fixture kind is **`beat_vent`** (non-blocking `ground` overlap — the
throat is standable on purpose; may stand in shallows). The static marsh
`geyser` doodad (solid, forbidOn water/chasm) and the Ascent's
`sky_geyser` trigger are unrelated citizens, untouched and probe-pinned.
`scald_pock` is a visuals-only dress kind (the shell_crater precedent).

## Authoring

- `ZoneTheme.geysers` (`ZoneGeyserSpec`): per-class count ranges + the
  band deal — the M0 `geyser_fields` tileset carries the debut row.
- Authored one-offs: `GeyserSpec` rows via `anchorVent` (a future landmark
  builder / lair set-piece lane — M1+). **M2a opened the generation seam**:
  a recipe/builder pushes rows onto `GenCtx.authoredVents` (the
  `ctx.tracks` idiom) → `GeneratedLayout.authoredVents` →
  `World.bootGeysers(def, pois, authored)` seats them FIRST on the salted
  stream: a row with its own clock, or any unshared row, is an ANCHOR (its
  own private band — the metronome law); a `shared` row without a clock
  seats on the current-band partition like a count-rolled vent. The seat is
  the recipe's promise — it must still be clear (walkable, no solid on the
  mouth, spaced) or the row is dropped loudly. THE LAKE's offshore great
  vent is the debut (`docs/engine/lake.md`); a theme-less zone with
  authored rows still stands a field (the spec-less guard).
- **M3 — two more authored seats on the same seam**: the great geyser den's
  `vent_den_mouth` landmark builder (data/greatgeyser.ts) pushes THE LOUDEST
  VENT (a great anchor with its own clock) beside the den door, and the
  `ventcauldron` recipe (engine/ventcauldron.ts) authors the den's HEART vent
  on a boss-tempo clock — the home of THE VENT DWELLER (`engine/ventDweller.ts`:
  a body whose presence is a pure function of `ventReadAt`; the Geysermaw).
  `docs/engine/greatgeyser.md`.
- The M0 face shipped **off the frontier field** (`frontier: false` +
  `perfProbe: true`) and minted by NAME only (the dev Geysers tab's Mint
  button, `devMintTileset`). **M1 PROMOTED it**: `biome: 'scald'` +
  `depthAffinity {from:.3,to:.72}` — the broad middle of THE SCALD BASIN country
  (biome row, BIOME_FIELD, meld, the other faces, kin and the scald heat
  sweep — `docs/engine/scald.md`). The tab's Mint button still works.
- M1 eased THE FIRE WINDOW at her fourth-walk trim note: `eruptSec`
  0.7/0.9/1.3 → 0.6/0.8/1.15 (the column-live duration — drawn, tested and
  probed from the one number). If she meant cadence, the number is
  `bandPeriod` / the class `period` bands — a one-number flip either way.

## THE TERRACE PILGRIMAGE reads the beat (M3 coda — `docs/engine/pilgrimage.md`)

The geyserkin procession is a READER of this fabric, never a writer: ONE
hook (`engine/pilgrimage.ts pilgrimageCue`) resolves the surge hour's next
window (`fieldSurgeWindow` / `nextSurgeAfter` on a keyed field; a dev-forced
future window at its t0) — and, on a key-less field, THE PROVISIONAL CUE,
the loudest vent's next burst off `ventReadAt` — so the lantern line climbs
to the loudest vent and stands the brim AS the hour opens (her cue law: the
surge happens with or without the procession; the line is how you notice
it). Its step-off rides `World.imminentThreatTo`'s vent read (the same
resolver the drawn broil rises from). Nothing here changed for it.

## Her walk (the M0 gate)

1. Launch row `arpg-dev-qa62` (port 5172) → open
   `http://localhost:5172/?dev`.
2. Start/continue a run → **🔧 Dev** button (bottom-left) → **Geysers**
   tab → **Mint geyser_fields ▶**.
3. Walk the field. The tab's readout lists the dealt bands + next-burst
   countdowns; **Clock: CURRENT BANDS / PER-VENT POLYRHYTHM** flips the
   A/B lever live on the standing field.
4. The question the walk answers (charter §13): does the beat FEEL like
   terrain keeping time — and which timing face locks.

## Dials

Everything in `GEYSER_CFG`: telegraph 2.0s; class clocks hiss [12,18] /
geyser [25,50] / great [70,110]; band tempo [25,50]; column radius 24/44/62
+ hit + shove per class; comet fans (hiss none — "small vents are ONLY
spectacle" is enforced as zero comets AND a small column); stripe width
560u + wobble; pock dwell. All unblessed.

## THE SURGE HOUR (M3 coda — her cascade: surge → eruptions → steam → wisps)

A window in which the basin's vents RUN HOT — ruled at the seventh walk
(charter §0): the bands ALIGN (the zone-wide surge the bands law named as
emergent becomes SCHEDULED for the window), periods shorten, great vents
rain more — and it is **UNANNOUNCED** by construction: no omen, no map
mark, no bulletin, no floater (this fabric, its layer and the scald kit
import none of those surfaces — probe-scanned). The broils quicken, the
steam thickens, the mineral mist rises; the air itself is the whole word.

**The seam — the fabric's own long clock, not the theater's cadence.** The
theater fabric's draws are keyed per VISIT and run host-side; a co-op client
could not predict the read and a re-entry would re-deal the hour. The surge
instead rides THE PURE-CLOCK LAW verbatim: `GEYSER_CFG.surge { every,
dwell, jitter }` and windows = `f(world clock, zone key)` — the zone seed
(`rollGeyserField`'s third argument, stamped `GeyserField.surgeKey`;
`surgeWindowOf(key, c)` / `surgeWindowNear(key, t)` / `nextSurgeAfter`) —
so every seat and every resume agree whether the hour holds exactly as they
agree on the bands. Nothing is wired, nothing persisted. (The theater
fabric may later CONSUME the surge — the terrace pilgrimage pitched in §8c
would gate a row on it; that is its hook, not its seat.)

**THE ALIGNED TIDE (`surgeTideRead`).** Inside a window the field reads ONE
zone-wide beat schedule, `T_j = t0 + lead + j · surgePeriod`
(`surgePeriod` = `periodMul` × the mean shared-band period, floored at
`minPeriod`, derived at roll — no draw of its own), and every vent strikes
on it: hiss + geyser every beat, greats every `greatEvery`-th (the
metronome law under the tide). A vent JOINS at the first beat it can broil
in full after its own clock's next quiet moment, and LEAVES after its last
whole beat inside the window at its clock's next quiet moment — so no broil
is ever cut, no burst ever un-broiled, no column ever shortened, and after
the hand-back the read is the base clock **byte-identical** (the field
stays learnable; the surge borrows the beat, never bends it — probe-pinned
before and after). `VentRead.surge` flags a tide read (the layer thickens
its steam); `VentRead.burstAt` is the burst's clock time.

**THE K LAW.** `k` stays unique per burst and monotone WITHIN a regime, but
a join/leave hand-off STEPS it (tide ordinals live at `SURGE_K_BASE`
+ window + beat). Burst EDGES therefore key on `burstAt`
(`PlacedVent.lastBurstAt`, `World.updateGeysers`) — a burst is a burst
whatever regime struck it; fan hashes still take `k` (every seat agrees).

**Downstream under the tide.** A great vent's tide burst rains MORE —
`World.burnRain(…, countMul = surge.rainMul)` → `rainFanOf(…, countMul)`
(same hashed seats, a scaled count); base bursts rain ×1.

**The cascade.** `World.geyserSurge()` is the ONE zone-level read
({ held, t0, t1, forced, next }). Three consumers ride it: the steam-wisp
tide (`ZoneTheme.lite` rows with `when: { surge: true }` + `seat: 'vents'`
— `docs/engine/lite.md`), the surge steam front (`data/scald.ts`
`scald_surge_steam`, an eventOnly weather row pinned by a
`registerEventFront` source while the hour holds — ramped in/out over
`SURGE_STEAM.ramp`, transient `steam_pocket` dress rows, no sky front under
shelter by the skyFront law), and the dev tab's readout + **FORCE lever**
(`World.geyserSurgeForce` → `GeyserField.surgeForce` — dev-only, the A/B
lever's sibling; release hands back at once).

Dials (all unblessed): `surge.every` 600 / `dwell` 90 / `jitter` 120 /
`lead` 6 / `periodMul` 0.6 / `minPeriod` 8 / `greatEvery` 2 / `rainMul`
1.5; `SURGE_STEAM.ramp` 18 / `floor` 0.2. Probe: `balance/probe_surge.ts`.
