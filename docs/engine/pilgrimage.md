# THE TERRACE PILGRIMAGE — the geyserkin reading the beat together

`src/engine/pilgrimage.ts` (the pure leaf: `PILGRIMAGE_CFG`, THE ONE CUE
HOOK, the resolvers) + `src/data/pilgrimage.ts` (the theater kind
`terrace_pilgrimage`, its rows, the offering kit, the dev lever). Probe:
`balance/probe_pilgrimage.ts`. Charter: `docs/design/scald-basin.md` §8c
(pitched at the seventh walk, **RATIFIED AS THEATER at the eighth; escort
OUT**). The Scald Basin's M3 coda — built on M0's geyser fabric
(`docs/engine/geysers.md`), M1's country (`docs/engine/scald.md`) and the
theater fabric (`docs/engine/theater.md`).

## What it is

A column of geyserkin — a vent-shaman leading stilt-striders and kin — sets
out from a terrace-side MOUTH (a zone edge) and climbs to the zone's
LOUDEST vent carrying PRISM-CRUST LANTERNS, stepping off every hiss-vent on
its beat, and arrives at the brim AS the eruption-surge hour begins. At the
brim the pilgrims leave OFFERINGS, keep a vigil while the hour runs, then
disperse back down the way they came and slip away. Raid the line and you
fight the tribe; let it pass and the vent's surge is the show.

## THE CUE LAW (her ruling, verbatim)

> "the surge would technically happen with or without the procession, but
> the procession could effectively be the cue for noticing the beginning of
> the surge"

So THE SURGE HOUR stays SOVEREIGN on its pure clock (`engine/geysers.ts` —
the long clock `surgeWindowNear` / `nextSurgeAfter`, THE ALIGNED TIDE), and
the pilgrimage only READS it, through ONE hook:

- **`pilgrimageCue(field, t, mode)`** → `{ at, end, source }` — the surge
  window's OPEN (`at = t0`) and close (`end = t1`) on a surge-keyed field
  (`GeyserField.surgeKey`; a dev-forced FUTURE window cues at its own t0 and
  a forced OPEN window cues nothing); **THE PROVISIONAL CUE** on a key-less
  field (hand-built probe fields, a package's literal): the loudest vent's
  own next burst, vigil = burst + `vigil.afterBurst`. The hook never writes
  the field. Re-pointing it is the one edit should the surge read move.
- The line is TIMED to the cue: `ready` (below) lets a beat set it out only
  when the cue lies inside the departure band for THIS walk, and THE PACE
  SOLVE (`paceToArrive`, re-run every `pace.solveEvery` s off the remaining
  way and the seconds left) keeps arrival at `cue.at − arrive.lead`, clamped
  to `[pace.min, pace.max]` of full stride. A watchful player sees the
  lanterns climbing and KNOWS the hour is coming — show-don't-tell; the
  column's lanterns and the steam thickening ahead of the surge (the surge
  fabric's own face) are the only announcement.

## THE RESIDENT LAW's four gates (how each holds)

- **LOCAL** — the rows claim the scald faces through **THE FACE AXIS**
  (`TheaterRow.tilesets` over `TheaterContext.tileset` — the zone's own
  tileset id, zone-standing truth; omitted abstains like every axis), and the
  kind's **`ready`** (**THE LOCAL CLOCK GATE**, `TheaterKindDef.ready(world,
  ctx)`) reads only the zone's own geyser field + the clock. Both are
  generic growth of the theater fabric: a row may now claim one face of a
  country, and a kind whose WHEN is a clock the zone itself keeps may
  decline a beat it could not honestly form on — BEFORE the draw, spending no
  seat and shifting no draw (every kind's stream is keyed per beat).
- **UNANNOUNCED** — no omen, no map mark, no bulletin (the two modules
  import none — probe-scanned). The in-zone floater at spawn is the
  discovery voice, the patrol's own idiom.
- **BUDGET-HONEST** — every body pours through `marchSpawn` → `theaterSpawn`
  (the replacement ledger): the entry beat pours the authored line whole
  (the parity floor), dwell beats TRIM it to the pour room and decline
  below `cast.minFollowers` — the column replaces ambient share, never
  spikes it. The offering gem is ONE keyed roll per pilgrimage (`gemChance`,
  DIAL small) through `dropGemAt`, which seals itself under the spoils law.
- **ARCLESS** — no objective, no ledger write, nothing resolves: offerings
  dry away (the ONE `plantImpactDress→evap` path — `World.plantDressAt`, the
  public dress seam), the line disperses and slips away (no corpse, no
  credit). The column wears an AMBIENT tag (`AMBIENT_TAGS`, the wax_vigil
  precedent): it passes through and never gates a clear.

**THE NO-TAG LAW** (§8b): pilgrims never hover. They WALK (the beat sets
them out only inside the departure band — never waiting at a mouth), FIGHT
if struck (ordinary enemies of the geyserkin, diplomacy-silent), or KEEP
WALKING; the vigil carries a hard ceiling (`vigil.max`); a fallen lead's
nearest follower takes the route (**THE LINE CLOSES RANKS**) so the column
never idles leaderless — it finishes the climb or it disperses.

## The anatomy of a run (`data/pilgrimage.ts`)

1. **THE PLAN** (`pilgrimagePlan(world)` — the same resolver `ready` and
   `spawn` both read, so they cannot disagree): the loudest vent
   (`loudestVent` — class rank great > geyser > hiss; the terraces deal no
   greats, so they climb to their biggest geyser; ties → first dealt), the
   cue, the MOUTH (the zone exit farthest from the vent that the walk grid
   can reach from — the longest, most readable climb; the arena rim through
   the middle where a zone has no exits), the BRIM (`brimSeat` — columnR +
   body + `brim.clear` from the centre on the approach side: a step outside
   the strike, never in the throat), and THE WAY (`pilgrimRoute` — chord
   waypoints every `route.stride`, each nudged clear of every vent disc by
   `route.ventPad`; walls are the flow field's business en route).
2. **THE STAND-UP**: `marchSpawn` (the pass-through march grammar — the
   boot-seat law advances the seat clear of the arrival's grace; the lead
   walks the route, followers heel), the march goal PARKED far off (the brim
   is a halt, not a departure — the kind owns its own halts and hands the
   mouth back to `marchTick` only at disperse), every member handed the
   lantern (`Actor.carriedLamp` = `PILGRIMAGE_CFG.lantern` — breathes on the
   sky's radiance, near dark at noon, full at dusk; + the held `lantern`
   part through `Actor.extraParts`, the tamed-collar tack).
3. **THE WALK**: the pace solve; **THE STEP-OFF** every `stepOff.every` s —
   each pilgrim reads `World.imminentThreatTo` (the ONE threat resolver the
   drawn broil and every dodge-mind ride; drawn == tested) and, with a
   broil inside `stepOff.horizon`, takes the dodge reflex's OWN dive state
   (`aiDodgeExit`/`aiDodgeUntil` — `updateDodge` runs the dive; no new AI
   lever, no def edit): the bodies step off the vents a breath before they
   blow — the show-don't-tell tutorial at scale. `stepOff.pad` is kept wider
   than the brim stand-off, so the line at the brim RECOILS on every tide
   beat.
4. **THE VIGIL**: the lead reaches the brim → posted there (`aiPost` +
   `postSpec {hold}` — the duty-post fabric walks it back after each
   step-off), the pace lifted, THE OFFERINGS laid (`offeringSeats` — a pure
   hash ring just outside the strike disc; `prism_offering` heaps with a
   small breathing light, planted through `World.plantDressAt`, drying after
   `offerings.dwell`; the one keyed gem roll). The surge opens on its own
   clock while the line stands there.
5. **DISPERSE**: the window closes (`cue.end`) or the ceiling lands → the
   lead turns down the way it came (the route reversed), `marchTick` slips
   the column away at the mouth. A dev-forced window the run owned is handed
   back on its closing tick.

## Authoring / dials

- Rows (`registerTheaterRow` in `data/pilgrimage.ts`): `pilgrimage_terraces`
  (sinter_terraces, chance 0.6) and `pilgrimage_fields` (geyser_fields,
  chance 0.35) — the terraces first; no hour gate (the rite follows the
  surge clock, not the sun — the lanterns simply matter more at dusk). A
  new face is one row; a new country's procession is one kind + rows.
- `PILGRIMAGE_CFG` (engine leaf — ALL DIAL, unblessed): the cast
  (`vent_shaman` lead; `stilt_strider` ×3 / `vent_shaman` ×1 escort;
  5 followers, floor 2), `depart` (min 25 s, slack 30 s), `arrive.lead` 3 s,
  `pace` [0.45, 1] re-solved every 0.5 s, `brim.clear` 12, `route` (stride
  160, ventPad 16, mouthInset 70), `offerings` (5 heaps r 18–22 → ~10–12 px
  after the dress clamp, ring pad 6–26, dwell 90–160 s, gem 6%), `vigil`
  (afterBurst 14, max 150, early 40), `stepOff` (every 0.1, horizon 1.25,
  pad 32, window 1.0), the lantern LightSpec (r −4.5×, warm mineral white,
  flicker 1.4, radiance at1 0.12) and the held part. `lintPilgrimageCfg()`
  gripes when the dials stop making sense.
- Dev: the Geysers dev tab's **"Summon the pilgrimage ▶"**
  (`devSummonPilgrimage`) stages the line on the current zone NOW — the run
  stood up directly (no beat, no row draw) carrying its OWN cue seated where
  the walk fits; the surge fabric's force face (`GeyserField.surgeForce`, a
  window "from now" — `World.geyserSurge().held` reads true from the moment
  it is installed, so it must never be installed early) is installed by the
  run's tick AT the cue and handed back when the run ends — so her walk
  meets the climb on a quiet field, then the brim, the offerings and the
  surge opening as the line arrives, without waiting out the long clock.

## Co-op posture

Host-authoritative like all theater: guests see the bodies and the held
lantern PART (`extraParts` replicates on the `ep` wire); the carried LAMP
(`carriedLamp`) is host-local — a guest's light layer does not glow the line
yet (a derived `lamp` bit on the wire is the obvious next seam, the
tell-wire idiom).

## QA

`balance/probe_pilgrimage.ts` (roster: green/fast): the registry + rows +
dials, THE FACE AXIS, THE LOCAL CLOCK GATE (declines without spending the
seat or moving the die), the pure resolvers (loudest vent, the cue hook's
three faces, brim, way, ring, pace, band), THE LIVE COLUMN on the real
terraces mint (ready in-band, edge mouth, lanterns, the way clear, arrival
inside the cue band, offerings drying, the posted vigil, the surge opening
on its own clock with the line at the brim, disperse + slip-away with no
corpse and the forced window handed back, the ledger byte-identical), the
step-off, budget honesty (trim + decline), the structural gates, and
absent == identical off the scald faces. `balance/eventqa.ts` §8 censuses
the rows' faces against `TILESETS` (a face must stand in the row's biomes).

## Owed her

The lantern LOOK at dusk (the carried lamp + held part — walk it with the
dev lever); a faceted prism-crust PAINTER for the offerings (THE NEW-PIECES
PREFERENCE — today they reuse `mound` in mineral white with a small light);
every number above.
