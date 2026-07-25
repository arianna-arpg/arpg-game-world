# The Spent and the Rooted — finite fuel and ground-worn power

`src/engine/reserves.ts` (THE SPENT — pure leaf) · `src/engine/rooted.ts`
(THE ROOTED — pure leaf) · sweeps + gates in `src/engine/world.ts` · tells in
`src/engine/tells.ts` · probe `balance/probe_spent.ts`

Two halves of one inversion. The roster's every fight asked the same
question — can you kill it before it kills you — because every limit an
enemy had was invisible. These fabrics make the limits **wearable**, so two
new answers open bestiary-wide:

- **THE SPENT** — enemies that visibly run OUT of something. The answer
  becomes PATIENCE: outlast the burn, bait the expensive move, deny the
  recovery, punish the empty.
- **THE ROOTED** — enemies whose power visibly depends on WHERE THEY STAND.
  The answer becomes POSITION: shove them off it, or kill the heart that
  grows it and take the floor out from under the whole court.

## THE RESERVE FABRIC (`MonsterDef.reserves: ReserveSpec[]`)

A RESERVE is a named, finite, per-body pool. Every dial is data; the three
debut bodies are the same rows tuned apart:

| Dial | What it says | Debut |
| --- | --- | --- |
| `pool` / `start` | capacity in UNITS (author small — 2..8: these are the pips a gauge counts) and the spawn fill | all |
| `costs` / `perCast` | what each named skill costs; a cast the pool cannot pay is **REFUSED at useSkill** (after canUse, before commitment — the brain falls through to its next rule exactly as on short mana). COSTS REFUSE, THEY NEVER DEBT. | `fumelung` (THE BELLOWS: 3 lungs, one gout each) |
| `drain` + `drainWhile` | units/sec burned passively — `always` / `aggroed` (the fight's clock) / `moving` | `taperwight` (THE WICK: burns from first aggro, never back) |
| `drainPerUnit` | units per unit of TRAVEL — the odometer BANKS every frame's displacement and charges at the sweep (walks, dashes, shoves alike: the body-wake law) | `sapbleeder` (THE LEAKING) |
| `regen` / `regenDelay` / `regenWhile` | recovery, gated by the quiet clock (`lastSpendAt`) and optionally by `'calm'` — **staying engaged IS the starvation** | bellows (`3.2s` delay), sapbleeder (`calm`) |
| `spentAt` | fill fraction at/below which the body reads SPENT | all |
| `stages` | statuses worn by fill band — the discrete power curve as ordinary status data (`guttered`, `sap_starved`) | wick, leaker |
| `vent` | what EMPTY does: a window (`forSec` + status — `winded_gasp`, `wilted`), a free-cast telegraph (`fume_vent`'s pall), and the refill share at close | bellows, leaker |

The **continuous** power curve is one `gaugeMod` on the pool's own pips:
`gaugeMod('damage', 'more', 0.09, reserveGauge('wick'))` — the taperwight
hits ~54% harder fresh than guttered, and the number the sheet folds is the
number the taper draws (`reserve:<id>` publishes as INTEGER pips through the
actor's gauge fold — the brim precedent; THE QUANTA LAW keeps the sheet
cache from churning on floats).

**THE HONESTY LAW** (`validateReserves`, boot-wired in `data/validate.ts`):
a row that gates casts, burns or vents with no matching `reserve:<id>` (or
`spent`) tell row is a HIDDEN TIMER and the boot names it. Inert bookkeeping
rows are exempt.

### Runtime shape

`Actor.reserves` (live rows, minted at every spawn path), `Actor.spent` —
the ONE boolean three consumers read so they can never disagree:

- the `spentbane` slayer axis (`damage.ts` mitigateTyped fold — the lane's
  sixth axis, the first keyed off a state the victim ENTERS AND LEAVES:
  it prices patience, not a matchup),
- the `spent` tell source (the punish window advertises itself),
- `AICondition.spent` (the mind knows it is empty).

`World.updateReserves` sweeps beside the watch/tell sweeps (cadence
`RESERVE_CFG.sweepSec`, rates scaled by real elapsed time so the cadence
changes arithmetic by nothing). ENGAGED, for the `drainWhile: 'aggroed'` /
`regenWhile: 'calm'` gates, means a held target OR hard aggro — ordinary
locks deliberately never set `Actor.aggroed` (the watch/taunt lane owns
that word), so the fight's clock starts when the mind holds a quarry.

The AFFORDABILITY read lives in `Actor.canUse` beside the dry-magazine
refusal (`useCharges`), so an AI rotation — priority and weighted alike —
falls through to its next art the moment a pool cannot pay: the fumelung's
gout LEADS its rotation and the bladder is the pacing (three gouts, then
teeth, then the vent — no cooldown does that work). The SPEND stays in
`World.useSkill` after every redirect. `AICondition.reserve` /
`.spent` / `.rooted` band the same maps for authored conduct (the wick's
guttered pace-down, the leaker's dry stumble, the matron's off-claim
urgency).

## THE ROOTED FABRIC (`MonsterDef.rooted: RootedSpec`)

The conditional-mod family's third axis — same shape as its siblings, all
three now visible (tell sources `bonded` / `nocturne` / `rooted` read the
exact held flags the sheet keys on):

| Field | Who is asked |
| --- | --- |
| `bond` | WHO IS NEAR — burst the holder |
| `nocturne` | WHAT HOUR IT IS — fight it in its off-hours (`NOCTURNE_UNFURL` now worn by every phase-shifted body; the probe census names shirkers) |
| `rooted` | WHERE IT STANDS — take the ground |

`rooted.creep` names living membranes (the creep fabric's own
`hitFloor`-honest cover — `CreepField.coverOf(kind, x, y)`, the ONE seam the
claim test, the `creep:<kind>` tell source and `World.creepCoverAt` all
read: drawn == tested == buffed). `rooted.ground` names region kinds (the
static half). `mods` worn on the claim, `off` worn adrift, `grace`
(default `ROOTED_CFG.grace`) debounces the way OUT only — a breathing creep
rim never flickers the sheet, stepping back ON is instant.

**THE LOOP**: `bloom_matron` plants `sporebed` (`creepSource` — the heart is
bound to her life) and the whole fungal court wears `SPOREBED_COURT` (same
kind). Kill her and the membrane RECOILS — every body on it softens at
once. Kill order becomes a question about TERRAIN. The mass fabric is the
other answer: shove a body off its claim and `uprooter` (the lane's seventh
axis) arms — gated on `Actor.rootedSpec && !rootedHeld`, so claimless bodies
can never read as uprooted.

**THE TWO-LEVER SPLIT** (load-bearing): the SKIN taxes intruders
(`sporebed` grants `sporemired` to non-fungal only), the natives' strength
comes from `rooted` — never both on one body, because a creep grant is
invisible bookkeeping and a rooted claim is a visible held flag. **THE
COURT ASYMMETRY**: the matron pays a wilt off her floor (`off` mods +
`ROOTED_THRIVE`'s drained tint); her far-ranging kin merely stop gaining
(`SPOREBED_COURT` has no `off`, `ROOTED_FAVOR` shows the gain only — the
tell layer may never imply a penalty the sheet is not paying).

## The depletion tell sources (`engine/tells.ts`)

All pure reads of maps that already existed: `reserve:<id>` (bounded by
construction — no band needed; band `[1,0]` reads as a drain), `spent`,
`wind` (the kite budget `BEHAVIOR_CFG.defaultKite` / `TempoSpec.kite` —
every breathing kiter already carried it; `WIND_PUFF` makes the chase a
readable rhythm), `winded` (the legs-out beat), `rooted` / `nocturne` /
`bonded` (the held flags), `creep` / `creep:<kind>` (live cover underfoot).

## Gauge-limbs (`render/vis/parts.ts`)

Two genuinely new painters, both `params.fill`-driven like `fillSac`:
`bellowsLung` (pleated bladder — pleats bunch and the vent slit GAPES as it
empties) and `wickTaper` (a taper whose length, flame and pooled ash are the
clock). Every debut look keeps THE GAUGE'S SEAT BARE (the accumulator law).

## Player-side levers

`spentbane` / `uprooter` support gems (`data/supports.ts`, the slayer-lane
idiom: conditional MORE, dead weight against everything else ON PURPOSE) —
plain stats, so affixes/passives/monster mods can feed the same lanes.

## Extension seams

- A new spent body = one `reserves` row + one tell row (+ a vent status if
  it vents). A new rooted body = one `rooted` row + `...ROOTED_FAVOR`.
- `reserveGauge(id)` makes any stat curve ride any pool (`gaugeMod`).
- `drainWhile: 'moving'` + `vent` is an unbuilt sprinter archetype ("it
  must stop to breathe"); the dials already carry it.
- Player-side reserves are deliberately NOT built here — the player's
  economy is mana/life/charges; if a vocation ever wants a wind meter it
  should ride THIS fabric, not a new one.
- `x_seek_creep` (an AI action steering to `nearestSource`) remains the
  creep fabric's named open seam — the matron's off-claim urgency rule
  would upgrade to it the day it lands.
