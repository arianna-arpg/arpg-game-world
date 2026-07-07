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
npm run sim -- sweep skills --level 5     # every attack/spell skill, solo, ranked
npm run sim -- audit monsters             # stat curves per level band
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

## The measurement tiers

| Tier | Command | Question it answers | Cost |
|---|---|---|---|
| L0 static | `manifest`, `audit monsters` | What exists? What are the stat curves? | ms |
| L1 dummy | `run --scenario dummy_dps_*`, `sweep skills` | Sustained output at equal investment | ~0.1s/episode |
| L2 arena | `ttk_parity_*`, `pressure_*`, `duel_*` suites | Clear feel, survival, per-monster threat | ~0.2s/episode |
| L3 (future) | zone/economy sims | Loot rates, XP tempo, event pressure | seconds |

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

**Seeds guidance:** 3 for a quick look, 10 for a decision, 30 when two results
are within one standard deviation of each other. If `|Δ| < sd`, you don't have
a result — you have a coin flip; add seeds instead of arguing.

## Extending the harness (everything is a registry)

| To add… | Touch exactly |
|---|---|
| a scenario / suite | `src/sim/data/scenarios.ts` (factory or literal) |
| a reference build | `src/sim/data/builds.ts` |
| a design band | `src/sim/data/targets.ts` |
| a pilot policy | `src/sim/pilots.ts` (`PilotSpec` union + one class) |
| a metric | `src/sim/metrics.ts` (collector field + `collectMetrics` key + glossary entry here) |
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
