# THE SCORCH BAR — heat as a fill-polarity survival meter

**Design authority:** `docs/design/scald-basin.md` §10 (her ruled shape,
2026-08-20; **re-shaped at the fourth walk and sealed at the fifth,
2026-08-21**). The desert's standing heat mechanic — the sunscorch bake —
converted into ONE standardized survival BAR with the polarity inverted:
**the higher the bar, the more scorched the body.** Ambient-fed in the
desert (existence-priced under bare sun), hazard-fed in the scald country
(fully avoidable by play), worn by entities as well as players. No new
bespoke row grammar: the survival fabric grew one axis (`polarity`), one
derived-status law (`bands`) and one caption (`readout`), and every older
meter is byte-identical.

**The bar is a PROGRESSIVE debuff, never a cook.** Her ruling, verbatim-near:
"I actually don't think we need it to cook the player. Instead... a
progressive increase in the actual scorched debuff, where the debuff grants
an increasing amount of fire resistance reduction; the higher the bar is,
the more severe the scorch is and the more severe the scorch is, the more
fire resistance has been reduced rather than hitting a threshold and then
simply being cooked... quite distinct from the light or breath bars that
really trigger when the bar has been depleted as a timer rather than an
accumulating effect over time."

All numbers are **DIAL** (unblessed — she blesses via playthroughs; the
per-unit erosion carries her fifth-walk word "−5% each, up to −40% at eight
being fine").

## The row (world/regions.ts)

`SURVIVAL_RESOURCES.scorch` — the fabric's first `polarity: 'fill'` row:

- **ONE UNIT == ONE legacy sunscorch stack** (`max: 8` = the old stack
  cap). This is the refit's whole parity trick: every old per-stack cadence
  IS the bar's per-unit rate, so onset and relief timings survive exactly.
  **THE EIGHTHS** (sealed at the fifth walk): the bar splits into eighths —
  a stack lands every 12.5% of progress, eight at 100%.
- **`regen` = the out-of-source decay** (units/sec toward EMPTY — the
  mirror of a drain row's regen toward full). Slower than shade's bleed on
  purpose: shade, night and the water douse remain the true reliefs; the
  decay is the charter's "the scald empties between mistakes."
- **THE NO-COOK LAW**: the row carries NO underflow damage
  (`underflowPctLifePerSec: 0`, no ramp, no doom text). A full bar drains no
  life by itself — not by any dial, but by construction: `World.feedSurvival`
  has no ramp path at all (the mirrored overflow ramp that once lived there
  is DELETED), and `data/validate.ts` warns if any fill row ever authors
  underflow damage (the underflow* family is DRAIN-row grammar — a timer
  into drowning). `Actor.underflowSince` / `lastGaspAt` are never stamped
  for the bar.
- **`bands`** — the worn statuses as derived windows of the bar, and THE
  PROGRESSIVE SPINE is the first of them:
  - `sunscorched` (`stacksPerUnit`) is the meter's quantized read — stacks =
    floor(bar) — and each stack strips **`SCORCH_EROSION.fireResPerUnit`**
    fire resistance (engine/status.ts — the named DIAL; the sunscorched
    def authors its mod FROM it): −5%/unit → **−40% at the full eight**.
    This erosion IS the bar's whole effect; `scorchErosionAt(units)` reads
    it back off the def itself (drawn == tested).
  - `heatstroke` (`from == max`) is the full-state band: the legacy
    desert-cap SLOW (move −18%, attack/cast −12%), worn while the bar sits
    at max, lifting the moment relief pulls it off the ceiling. KEPT by her
    fifth-walk word; **retired with ONE line — delete the heatstroke row
    from `SURVIVAL_RESOURCES.scorch.bands`** (the combat lane's buildup pop
    on bar-less bodies is untouched either way).
  Every standing consumer — douse lists, `apply_sunscorched` /
  `damageVs_sunscorched`, overlays — keeps its meaning.
- **`readout`** — THE SEVERITY READOUT (show-don't-tell's one permitted
  number): the HUD bar's caption prints the erosion the bar wears right now
  (`Scorch · −20% fire res`), read through `scorchErosionAt`, so the caption
  and the sheet can never disagree.
- **`vignette`** — the warm-red SEVERITY WASH (the reserved "future warmth
  meter" seat, spent): for a fill row `startFrac` is the fraction the veil
  engages ABOVE; alpha and reach deepen by bar fraction alone toward FULL.
  No last-gasp squeeze, no ramp flush — those are the DYING grammar of a
  drain row (`renderer.drawSurvivalVignette` keys it on polarity; the
  spec's `flush` is optional and the scorch row omits it). The HUD survival
  readout draws the bar for free (registry loop, polarity-aware hide/warn).

## The lanes (engine/world.ts)

**`World.updateScorch`** (the old updateHeat, refit):

- **Ambient feeds, player seats only** (monsters live in the desert): the
  swelter sun lane at `(swelter × (tempBase + tempGain × bakedT)) /
  sunStackEvery` units/sec, the `heat_shimmer` fast lane at `1/stackEvery`.
  All cadences in `HEAT_CFG`, unchanged numbers.
- **Shade bleeds** at `1/dwindleEvery` (canopy, roof, night). **Water
  douses**: a douse row underfoot suppresses both feed lanes and the douse
  beat bleeds ONE UNIT per beat (the old stack-per-beat, verbatim); the
  final quench floats the row's text as the bar retires.
- **THE ONE HOLD LAW**: every lane that moves the meter (feed, shade, the
  douse) stamps `Actor.survivalHeldAt.scorch`; the CARRIERS SWEEP runs the
  row's decay only where no lane held it this frame — nothing ever
  double-moves the bar, and the decay runs in every zone (the terrain
  sweep's grounds early-out cannot freeze a carried bar).
- **THE BAND SYNC** (every carrier, player or monster): stacks are SET
  directly — never via applyStatus — so the def's buildup ladder stays the
  law for combat-earned stacks, and `ActiveStatus.bandStacks` (THE BAND
  WATERMARK) marks what the sync itself wrote. **THE ABSORB LAW**: stacks
  above the watermark (a combat scorch landed on a scald-warmed body) climb
  the bar instead of being stomped — heat is heat. (Never re-absorb your
  own decaying stacks: the watermark is the whole fix.)
- **THE EASE LAW**: `survivalEase_scorch` (survivalEaseStat) slows the RISE
  through the one `survivalDrainRate` fold, capped by the row — slowed,
  never stopped. An 'of the Lampkeeper'-style affix is one data line.
- **`feedSurvival`** (the fill drive) moves the meter toward max, eased,
  and stamps the hold. THAT IS ALL: it has no ramp path, is not seat-gated
  (nothing in it can hurt), and bills no life to anyone.

## The seams (the scald country plugs in here)

- **`World.scorchFeed(actor, units)`** — the hazard-source seam: instant
  chunks (an eruption column's flash, burn-rain hits) and continuous
  trickles (sulphur-pool proximity, rate × dt per frame) both land here,
  eased, entities and players alike. The sibling geyser fixture (M0) and
  the M2 pool rows call this; nothing in the desert routes through it.
  **THE FACTION-BLIND PRICE**: the band strips fire res on WHOEVER carries
  the bar, so a basking kin's warm window is ALSO its fire-vulnerable window
  by construction (the charter's basker — its consumer is M1's, reading
  `scorchOf`; plates open + res down is the compounding law, free).
- **`World.scorchOf(actor)`** — the read seam: THE BASKER's enrage bands,
  tells-fabric gauges, any consumer. Drawn == tested by reading this one
  value; the worn price at any read is `scorchErosionAt(value)`. Signature
  stable.
- **Region rows**: a `survival: { resource: 'scorch', drain }` row FEEDS
  (applyRegionEffects routes by polarity) — the seat a sulphur-shallows
  row will wear. Scald mist deliberately does NOT feed the bar (the
  charter's leaning: concealment stays pure; sources are drawn point
  phenomena).

## The laws, named

- **THE REFIT LAW (hers, hard — amended at the fourth walk)**: the desert
  feels identical — same onset cadences, same reliefs (shade / night /
  water douse), same fire-res erosion and combat economy — only VISIBLE
  now; the EFFECT follows her ruling (the erosion spine kept, the cook never
  ported). `balance/probe_scorch.ts` pins every timing against HEAT_CFG's
  own formulas (the config-derived oracle), plus the bands, the absorb, the
  entity seam, the ease cap, the untouched combat ladder, and now the
  no-cook law (a full bar held 30s alone loses no life; no ramp clock
  exists) and the progressive spine (erosion monotone in bar units, exact at
  full, sheet == `scorchErosionAt` == readout every frame). The one
  deliberately retired behavior: the old hold-forever neutral case (stacks
  frozen outside any lane) is now the ruled out-of-source decay —
  `probe_douse.ts` rig 4 pins insurance (the douse never acts on a flier)
  under the new law.
- **THE FULL STATE is a worn state, never a cliff**: heatstroke's slow
  while the bar sits at max, beside the full erosion — relief lifts both.
  Ignoring the sun indefinitely is a −40% fire-res, slowed walker, not a
  corpse; the desert's burns do the killing.
- **THE COMPOSITION LAW (hers, fifth walk)**: the survival bars COMPOSE —
  scorch governs the day, the light bar the night under an active Gloaming —
  so one walker can be scorched, heatstruck AND gnawed by the dark at once.
  Each bar keeps a DISTINCT texture (breath: a timer into drowning; light:
  a timer into the dark's gnaw; scorch: an accumulator into erosion + a
  slow, never life); a future fill row (the deepwinter COLD bar, this row's
  mirrored sibling) brings its OWN consequence texture, never a clone.
- **The combat lane is untouched**: player skills scorching monsters
  (glass_lance, sirocco_ring, the Sun & Sand gems) ride the plain status —
  stacking, TTL, buildup pop — byte-identical on bar-less bodies.

## Probe

`balance/probe_scorch.ts` (roster: green/fast) — rigs A–K per the header.
