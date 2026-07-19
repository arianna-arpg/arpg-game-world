# The Quickening — spent ground runs quick again

The Terror-Zone thesis in Hollow Wake's own myth: the world is a corpse being
waked, and now and then a surge of what it USED to be finds an old limb — a
zone the player has already walked, cleared, and outgrown — and for one fixed
window that ground **quickens**: its level leaps to a band around the hero's
own, its contents re-mint fresh at the new measure, its in-zone event chance
and loot bounty climb, every enemy on it wears the `quickborn` mark, and its
air reads gilt. When the window closes — on the world's clock, wherever the
player happens to be — the zone reverts to **exactly what it was**.

Everything is data on one `QuickeningSurge` config
(`src/packages/defs/quickening.ts`); the field is a pure overlay
(`src/packages/overlays/quickening.ts`); the engine's reconcile sweep
(`world.ts updateQuickening`) is the one hand that touches world state.

## The laws (identities, not accidents)

- **Known ground only.** A quickening lands exclusively on zones the player
  has *walked* (`view.visited` — stricter than the seat fabric's known =
  visited ∪ surveyed). Enforced as a hard filter in the field itself, so no
  tuning can quietly break the re-explore thesis. `devIgnite` may waive it —
  force waives TUNING, never ELIGIBILITY (zonePolicy + not-already-quick
  always hold; sanctuaries always refuse).
- **Outgrown ground first.** Only zones at least `minOutlevel` below the hero
  qualify, and the seat's weigh curve (`outlevelWeighPer`/`Cap`) leans toward
  the most outgrown — "previously useless" is the point.
- **The surge only ever raises.** Surge level = hero level + a roll in
  `levelBand` (default −1..+3), floored above the ground's own level.
- **The set window.** Duration (`holdSec`) is rolled once at ignition and runs
  on the world clock, indifferent to the player (the world-boss apparition's
  stay, worn by ground). Nothing extends it; only the clock (or `devFade`)
  ends it. Note the world clock is GAME time — a mid-window save resumes
  mid-window; offline wall time never spends it.
- **The pointer, not the hand.** The overlay never touches a ZoneDef. The
  engine reconciles stamps off the field's arcs in BOTH directions each beat,
  so the pair is self-healing against restores, prunes, and stale saves:
  - *arc without stamp* → APPLY: remember the true level in
    `ZoneDef.quickened { key, baseLevel, until }`, stamp the surged level
    (every consumer of `zone.level` — spawn mints, xp math, quests, the chip —
    follows for free), drop the zone's memory (`refresh.onSurge`) so the next
    entry re-mints fresh;
  - *stamp without arc* → REVERT: restore `baseLevel` exactly, delete the
    stamp, drop the memory again (`refresh.onFade`) — "exactly as it had
    been" on the next load.
  A live zone is never re-populated under the player's feet (memory shapes
  the NEXT load; live actors keep the level they were honestly minted at),
  and survivors of a surge window persist under the ordinary zone-memory TTL
  like anything else the player walked away from.

## The folds (live, never stamped)

- `World.eventDensityFor` × `eventMulAt(zone)` — in-zone events fire far more
  readily on quick ground (beside the mycelia suppression, same chokepoint).
- `World.rollDrops` bounty × `bountyMulAt(zone)` — the kill-path rich-ground
  lever (`ZoneDef.bounty` itself stays untouched underneath).

## The presence (engine sweep, in-zone)

- **The materialize beat** — first entry per arc: `quickenings_seen` ledger
  (the Vault card's unlock) + the discovery line. The flag rides the overlay
  arc, so it is once-per-window even across saves.
- **The kin pulse** — every living enemy wears `quickborn` (beneficial,
  gilt-tinted, re-pulsed every `kin.pulseSec`; the status outlives the pulse
  by a breath and dies with the window).
- **The Surge Echo** — once per arc, gated on the stamp being down: the
  window's one named face, champion-promoted at the surged level + its bonus.
  Its kill row pays (`surge_echoes_slain` + xp/gems) and the arc remembers
  (`echoDown` — the chip stops promising it). Optional (`echo?` on the surge).

## The sky

One `eventOnly` weather row (`quickened_air`, registered by the def): gilt
wash, radiance leaning gold, and the surge's own DRESS kit — `surge_stone` /
`quick_spring` / `risen_bloom` (data/doodadVisuals.ts, all reused painters) —
planted while the front holds, evaporated as it lifts (the transience
doctrine: the event flavors the land it borrows, never repaints it). Pinned
by the overlay's `registerEventFront` source, easing off through the window's
last breath.

## The Slayer lane (the event's own support family — general everywhere)

Three orthogonal punch-UP axes as plain stats (`engine/stats.ts`, all base 0),
folded once at the mitigation chokepoint (`damage.ts mitigateTyped`,
`SLAYER_CFG`) so every source is treated identically:

- `overmatch` — MORE damage vs strictly higher-LEVEL victims (the quickened
  diet, and every +level boss).
- `giantsbane` — MORE damage vs victims ≥ `giantsbaneRatio` × your effective
  weight (the mass fabric read as a blade).
- `regicide` — MORE damage vs empowered rarities (magic/rare/champion/crowned).

Support gems `overmatch` / `giantsbane` / `regicide` grant them today;
affixes, passives and monster mods can grant the same stats whenever they
want the lane — registries, never special cases.

## Findability

The surge is LOUD by design (the D2 cadence): a world bulletin at ignition
and fade, a breathing gilt map ring with an mm:ss clock, the ✦ marker, and
the zone-info chip (level, time left, echo state). No omen on purpose — the
omen fabric is for the *unfound*; a quickening only ever lands on ground the
player already knows.

## Dev + QA

- Events tab: `Quickening (surge here)` / `Quickening (end here)` — the full
  stamp → refresh → revert loop QAs in one sitting.
- `balance/probe_quickening.ts` (48 checks): the known-ground law
  statistically, the level band + raise law, the set window/cooldown/cap,
  accessors + dev seams, snapshot/restore/prune/determinism, def + registry
  integrity, and a LIVE rig — stamp, refresh, materialize, kin pulse, echo,
  ledgers, revert, and the three slayer folds at exact ratios.
- eventqa: the package auto-joins (registry validation, pledge, dev seams,
  ledger reads ⊆ bumps).
- Browser QA note: `__game.step(frames, dtMs)` clamps to a fixed ~50ms sim
  step per frame regardless of dtMs — pace rigs in frames (20 ≈ 1s), or every
  clocked beat (reconcile, kin pulse) reads starved.

## Tuning notes

- `maxConcurrent` > 1 turns the lone window into rolling coverage; the
  frequency crank's `concurrencyMul` lifts it live.
- The package is `dimensions`-ready: every engine consumer resolves fields
  per dimension (`quickeningFieldsAll`, `overlayFor`), so "the underworld
  quickens too" is one `dimensions: ['surface','underworld']` line.
- A pure farming tuning deletes `echo`; a crueler one widens `levelBand`.
