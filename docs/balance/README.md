# The Balance Harness

Hollow Wake's systems multiply: skills × supports × passives × gear × monsters
× levels is a space no single developer can hand-test for breadth *and* depth.
This harness turns balance from opinion into **measurement**: the real engine,
run headless and deterministic, over scenario libraries that are themselves
open data — so balance passes can be run at machine scale (including by an LLM
agent, see [AGENT_PLAYBOOK.md](AGENT_PLAYBOOK.md)) and their claims re-checked
by anyone with one command.

Balance will still be hilarious sometimes. That's fine — the goal is that it's
hilarious **on purpose**, with the outliers known, chosen, and revisitable.

## One command

```
npm run sim -- run --suite smoke          # the confidence check (run after ANY data change)
npm run sim -- run --suite starters --seeds 10
npm run sim -- run --suite starters --as save:1        # the same questions, YOUR character
npm run sim -- sweep skills --level 5     # every attack/spell skill, solo, ranked
npm run sim -- sweep skills --level 5 --vs panel:textures_l8   # skill × enemy-texture matrix
npm run sim -- sweep matchups --build player_my_char --panel textures_l8  # one build across the poles
npm run sim -- sweep supports --support splitting      # skill × support no-op matrix (see below)
npm run sim -- sweep progression --geared # the power curve + gear-value column per class
npm run sim -- run --suite gearvalue --seeds 10        # bare↔geared twins at the bands
npm run sim -- audit monsters             # stat curves per level band
npm run sim -- audit textures --check-panels  # the defense-texture ledger + panel drift gate
npm run sim -- audit affixes              # item-gen distributions + dead-affix/dead-stat detectors
npm run sim -- audit drops                # loot-table yields + DROP_CFG per-kill expectations
npm run sim -- manifest                   # machine-readable catalog of everything runnable
npm run sim -- baseline check --suite smoke   # regression gate (exit 2 on breach)
```

Reports land in `balance/reports/<name>_<stamp>/` (gitignored): `report.json`
(aggregates + grades), `episodes.json` (every episode), `report.md` (the
human table). Baselines live in `balance/baselines/` and are **committed**.

## How it works — and why you can trust it

- **The real machine.** A sim boots the actual `World` (same side-effect
  registrations and `validateContent()` as `main.ts`), injects a build through
  `world.adoptSavedMeta` — the *same seam a saved character loads through* —
  and ticks the exact host frame order: poll seat inputs → `applyInputs` →
  `updateAI` → `world.update(dt)` at 60 Hz. There is no parallel combat math
  to drift out of sync with the game.
- **Observed, not re-derived.** Engine chokepoints carry an optional tap
  (`src/engine/tap.ts`, wired in `damage.ts` `applyHit`/`applyDot` and
  `world.ts` `kill`/`executeSkill`). A tap observes; it never mutates. Cost
  when uninstalled: one nullable read per event.
- **Deterministic.** `Math.random` is swapped for a seeded mulberry32 stream
  per episode and restored after. Same seed ⇒ byte-identical episode (this is
  checked in anger: the determinism probe hashes `episodes.json`). N seeds ⇒
  an honest distribution with mean/median/p10/p90/sd.
- **Quiet by construction.** Sim worlds run a fresh account with every
  expedition package disabled and park in `sim_arena` — a flat, exit-less,
  `objective: 'safe'` zone registered like any authored zone. Nothing ambient
  lands on the experiment.

### What is synthetic (know your instrument)

- **Pilots are policies, not players.** `turret` / `brawler` / `caster` are
  one-sentence behaviors (close/hold band; cooldowns first, primary as held
  filler; openers edged once). They under-play mechanics-heavy kits — compare
  kits under the *same* pilot, and treat cross-pilot comparisons as suspect.
- **XP is frozen** during an episode (default) so mid-fight level-ups don't
  move the thing being measured.
- **Reference builds are floors, not ceilings.** Starter builds carry the live
  class bar, gem levels via `gemLevelAt()`, and a *greedy* passive tree
  (breadth-first from the class start — "average play", derived from the live
  graph). They wear **no gear yet**; a geared tier is the next calibration
  step, and target bands stay `provisional` until then.
- **Known attribution gaps.** DoTs credit a *side*, not a caster (the engine
  itself doesn't know who lit the fire); DoT absorbed by energy shield isn't
  split out; wave `rarity` promotions use the real `promoteMonster` path but
  no elite-affix scenarios exist yet.
- **Texture classification is derived, and shells fade.** `audit textures`
  reads live specimens (deterministically seeded) and judges poles against
  cohort medians (`TEXTURE_CFG`). Monster shell plates are flat def constants
  while life scales with level, so a shell's LIVE fraction shrinks as levels
  rise — the classifier uses the AUTHORED ratio (plate ÷ level-1 body) for
  identity and reports both (`shell.fracAuthored` / `fracLive`). Whether
  shells *should* fade with level is an open design question the audit now
  makes visible.
- **Matchup pools count life+ES only.** `cycle_pool_mean` excludes shell
  plates (directional coverage — a rear plate costs a brawler nothing), so
  `edps_cycle_mean` into a shelled monster honestly reads lower when the
  build actually had to chew the plate.

## The measurement tiers

| Tier | Command | Question it answers | Cost |
|---|---|---|---|
| L0 static | `manifest`, `audit monsters`, `audit textures`, `sweep supports --static-only` | What exists? Stat curves? Which defensive poles are populated? Which skill × support pairs socket at all? | ms |
| L1 dummy | `run --scenario dummy_dps_*`, `sweep skills` | Sustained output at equal investment | ~0.1s/episode |
| L2 arena | `ttk_parity_*`, `pressure_*`, `duel_*`, `matchup_*`, `gearvalue` suites | Clear feel, survival, per-monster threat, gear value | ~0.2s/episode |
| L2 matrix | `sweep matchups`, `sweep skills --vs panel:…` | Build/skill × enemy-texture interaction grid | rows × cols × seeds episodes |
| L2 matrix | `sweep supports` | Skill × support FUNCTION matrix (works / inert / cost-only) | ~0.1–0.3s/pair |
| L2 curve | `sweep progression [--geared]` | Player power per level band; the gear-value multiplier | classes × levels × 4 × seeds |
| L3 economy | `audit affixes`, `audit drops` | Item-gen distributions, dead affixes/stats, loot yields per kill | ~ms/item |
| L3 (future) | zone/XP sims | XP tempo, event pressure, travel economy | seconds |

Speed is the design constraint that matters: a full smoke suite is ~3s, a
9-skill sweep ~1.5s. Mass passes (hundreds of scenarios × tens of seeds) are
minutes, not hours.

## Metrics glossary

Per-episode scalars (aggregated across seeds in `report.json`):

- `dps_out` — all player-side damage (hero + minions + DoT) per sim-second.
  `dps_hero` / `dps_minions` / `dps_dot_out` split it.
- `dps_dummy` — subset landing on the training dummy (the immortal target;
  `kill()` resets it, so regen never pollutes the reading — damage is measured
  at the tap, not by HP delta).
- `dps_in` — hits + DoT landing on the hero.
- `hits_out`, `crit_rate`, `hit_attempts_in`, `evade_rate_in`, `block_rate_in`.
- `kills`, `kill_rate`, `time_to_first_kill`.
- `ttk_wave_mean` / `ttk_wave_max` — spawn→last-death per wave (the clear-feel
  number).
- `player_deaths`, `died_at`.
- `life_floor_pct` / `mana_floor_pct` / `life_end_pct` — how scary and how
  starved the episode got.
- `casts_per_sec` — hero presses only; `casts` in `episodes.json` splits
  presses from mechanical repeats per skill.
- `hero_level`, `hero_max_life`, `hero_max_mana` — the injected sheet, so a
  report explains its own survivability numbers.
- `cycles_cleared` / `cycle_pool_mean` / `edps_cycle_mean` — kill-cycle
  metrics from `respawnOnClear` waves (matchup duels): how many fresh bodies
  died, how big each was (life+ES, post-promotion), and pool÷TTK per cycle —
  **effective DPS into that defense texture**, comparable across textures
  where raw TTK misleads. A matchup row with `cycles_cleared` absent is a
  WALL: the build never finished one kill in the window (that's the finding).
- `warning_count` — anything irregular (over-budget tree, misfit support,
  unknown ids, non-finite vitals). **A warned row is not a balance datum.**

## Target bands — design intent as data

`src/sim/data/targets.ts` holds claims about how the game should *feel*
("a parity pack dies in 2–14s", "parity trash never kills a straightforwardly
played starter"), each with a written rationale. Reports **grade** against
bands (`ok`/`low`/`high` flags); only the **baseline gate** fails runs. Every
band starts `provisional: true` — removing that flag is a deliberate design
sign-off after calibration, never a default.

Grading vs gating, deliberately separate: bands express intent and may be
wrong; baselines express "don't move things by accident" and are exact.

## Workflows

**The dev loop** (after any `src/data/` change):
1. `npm run sim -- run --suite smoke` — anything obviously broken?
2. Run the suites nearest the change (`starters`, `duels`, a `sweep --filter`).
3. `npm run sim -- baseline check --suite smoke` — did anything move that
   shouldn't have? (Exit 2 = yes.)
4. If a move was intended: re-run `baseline write` **in the same commit as the
   change** so history pairs cause with recalibration.

**The calibration loop** (maturing the instrument):
1. Improve reference builds / pilots / scenarios.
2. Watch the shakedown findings move; when a band's number survives a few
   passes and matches play-feel, strip `provisional` in a dedicated commit.

**The sweep triage** (`sweep skills`):
- The output is an *ordering* plus a zero-DPS cohort. Spread within the ranked
  cohort is the balance conversation (11× between same-cost skills is a
  finding, not a rounding error).
- Zero-DPS rows are **triage, not nerf/buff targets**: auras and toggles
  measure 0 alone by design; summons don't engage a *passive* dummy; mines
  need a trigger. Each needs a richer scenario before its number means
  anything. Broken kits also land here — that's the point of the list.

**The matchup matrix** (`sweep matchups`, `sweep skills --vs`):
- Targets come from **panels** (`src/sim/data/panels.ts`): rosters mixing
  literal monster ids with texture QUERIES resolved through the live
  classifier (`src/sim/textures.ts`) — so `panel:textures_l8` always means
  "one representative per populated defensive pole, as of this content".
- Matchup duels use `respawnOnClear` waves: every kill cycle fights a FRESH
  body, so poise bars, shells, and ES re-arm and `edps_cycle_mean` reads the
  full texture, not a broken remnant.
- The reading is the SPREAD: a skill at 1.2× across textures is
  texture-blind; 4× is an identity; `∞ WALL` (zero cycles beside living
  columns) is either a designed hard-counter or a broken interaction — decide
  which on purpose.
- Cost math is printed before running: `skills × targets × seeds` episodes.
  A full sweep against a 6-seat panel is ~6× the dummy sweep — filter first,
  matrix second.

**The support matrix** (`sweep supports`) — the skill × support no-op hunt:
- THE CENSUS is free and total: every droppable skill × every support through
  the REAL socket gate (`supportFitsInst` / crew boarding). It also flags
  REFUSED-SUSPECT pairs — the skill's delivery provably has a mechanic the
  support demands (`MECHANIC_EVIDENCE` in `src/sim/compat.ts`), but the tag
  list refuses the socket. Those are tag-hygiene candidates.
- THE PROBES are A/B episodes at the SAME seed: bare vs socketed. The engine
  is deterministic, so a byte-identical behavioral fingerprint is a
  DEFINITIVE **inert** verdict (the gem changed nothing — not damage, not
  statuses, not minions, not even a mana float). No statistics needed at one
  seed; that's what makes 50k-pair coverage affordable.
- Divergent pairs classify by which channel lanes moved (`CHANNEL_LANES`):
  output/defense beyond noise = **effective** (the Δoutput column doubles as
  a support-power table); cost alone = **cost_only** (a tax with no observed
  function — the partial-no-op bucket); nothing beyond noise =
  **negligible** (indeterminate — escalate seeds/duration, never cite as-is).
- Crew-fit pairs probe KEYED: the resonance gem rides both runs, so the
  verdict is about the boarded behavior, not the (by-design) dormant
  keyless socket.
- Probe shapes are data: dummy vs live targets (`LIVE_PROBE_*` rules — kills,
  corpses, incoming damage), solo vs escort rigs (`ESCORT_HOST_RULES` — a
  curse shows its worth through the escort's hits; trigger gems fire off its
  events). A pair's report row names the shape that measured it.
- Reading INERT rows: the row often carries a static annotation
  (`data/graftReadSites.ts` — "'trail' is read only at spawnProjectile"),
  which is the fix-it trail. An inert pair resolves ONE of two ways, both
  legitimate: make it WORK (engine read-site or data payload) or make it
  REFUSE honestly (tags/excludeTags) — a socket that takes the gem and does
  nothing is the only wrong answer.
- Cost: full coverage is ~55k episodes (hours). Slice with `--support`
  (one gem catalog-wide) or `--filter` (one skill family), and use
  `--budget N` for breadth-first coverage that states what it skipped.

**Actual player builds** — two refs, one seam (`applySavedCharacter`, the
game's own resume path — exact rolled gear, gem levels, companions):
- `--as save:<slot|path>` reads a LIVE save right now ("how does my character
  do on the standard questions" — scenario ids get an `as_…__` prefix and
  target bands deliberately don't grade them).
- `balance/players/*.json` are COMMITTED fixtures auto-registered as
  `player_<file>` build ids — the standing real-build library every sweep and
  suite can name (see `balance/players/README.md`). Content drift on load
  (a removed skill/affix) lands in warnings, never silently.

**The economy audits** (`audit affixes`, `audit drops`) — L3's first tier:
- `audit affixes` mints N items per ilvl band through the real `rollItem`:
  rarity/base/affix distributions, tier usage, plus two dead-content
  detectors — ELIGIBLE-BUT-NEVER-ROLLED affixes (in a pool, never came out)
  and DEAD STAT LINES (compiled mods naming stats the engine doesn't
  define — the `attr_*` bug's class, permanently instrumented). Share flags
  are base-mix-weighted APPROXIMATIONS (family exclusion skews them) —
  triage, not proof; raise `--n` before believing a ratio.
- `unreachableAffixes` runs sample-free: an affix whose tags match no base's
  pool is dead data at any ilvl and any luck.
- `audit drops` resolves a loot table N times per band and prints the
  DROP_CFG-derived per-kill expectations beside it — drop-rate questions
  ("what does a rare kill actually pay?") become one command.

**The power curve** (`sweep progression [--geared]`, `run --suite gearvalue`):
- Progression asks the standard questions (dummy DPS, parity TTK) at every
  level band per class; `--geared` adds the wardrobe twins (`GEARED_CFG` in
  `src/sim/data/builds.ts`) and prints the geared÷bare multiplier — the
  measured value of found gear, and the tier where gear-affecting fixes
  stop being invisible to suites.
- The `gearvalue` suite is the standing regression form of the same
  question at the canonical bands (baseline-able like any suite).

**Seeds guidance:** 3 for a quick look, 10 for a decision, 30 when two results
are within one standard deviation of each other. If `|Δ| < sd`, you don't have
a result — you have a coin flip; add seeds instead of arguing.

## Extending the harness (everything is a registry)

| To add… | Touch exactly |
|---|---|
| a scenario / suite | `src/sim/data/scenarios.ts` (factory or literal) |
| a reference build | `src/sim/data/builds.ts` |
| a REAL build fixture | drop a `CharacterSave` in `balance/players/` |
| a target panel | `src/sim/data/panels.ts` (literal ids + texture queries) |
| a defense texture / threshold | `src/sim/textures.ts` (`TEXTURE_CFG` + one classify clause) |
| a design band | `src/sim/data/targets.ts` |
| a pilot policy | `src/sim/pilots.ts` (`PilotSpec` union + one class) |
| a metric | `src/sim/metrics.ts` (collector field + `collectMetrics` key + glossary entry here) |
| a fingerprint channel | `src/sim/metrics.ts` (`fingerprint()` key) + its lane in `src/sim/compat.ts` `CHANNEL_LANES` |
| a support-payload read-site | `src/data/graftReadSites.ts` (one row — the validator and the matrix both read it) |
| a probe shape rule | `src/sim/compat.ts` (`LIVE_PROBE_*`, `ESCORT_HOST_RULES`, `MECHANIC_EVIDENCE`) |
| a geared-tier wardrobe | `src/sim/data/builds.ts` (`GEARED_CFG`, or a build with explicit `GearSpec`s) |
| an economy audit knob | `src/sim/economy.ts` (`ECONOMY_CFG`) |
| an observation point | `src/engine/tap.ts` (type) + one `SIM_TAP.current?.…` line at the chokepoint — keep the header list honest |
| a CLI verb | `balance/cli.ts` |

`src/sim/` stays browser-safe (no Node imports) so an in-game dev panel can
someday run the same scenarios; Node stops at `balance/cli.ts`.

## Shakedown findings (2026-07-06, the harness's first day)

Kept here as living examples of what reports look like as claims:

1. **Parity TTK is sloggy** — warrior L5 clears the 6-strong parity pack in
   ~26s mean (band says 2–14s). Either early damage is low, early monster life
   is high, or the band is wrong. Unresolved, on purpose — the point is it's
   now a number.
2. **The early caster is paper** — magician L5 (84 max life) dies in most
   parity episodes even kiting, with mana never below 83%. Life, not resource,
   is the binding constraint at L5.
3. **Same-cost fire skills span 11×** — hellfire_missile 88.8 dummy-DPS vs
   fire_siege 7.8 at identical investment (L5/gem 2, solo).
4. **Latent content bug caught by loot rolls**: every `attr_*` gear affix
   (and unique `titans_grasp`) references stat names the stat engine doesn't
   define — attribute gear may be silently dead in-game. Tracked separately.
5. **Pilot lesson baked in**: cooldowns-first rotation (the fix that let the
   magician actually use frost_nova) — a held primary starves the rest of the
   kit if it goes first.
