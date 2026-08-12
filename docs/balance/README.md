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
npm run sim -- matrix check --support splitting        # the no-op UNIT-TEST gate (exit 2 on NEW no-ops)
npm run sim -- matrix explain fireball splitting       # one pair: why it works / doesn't / should it
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
| L2 gate | `matrix check [--deep]` | Did any pair REGRESS vs the adjudicated ledger? Do working gems hide dead payload lines? | as `sweep supports` (+units × seeds when deep) |
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
- THE ORDER LAW (2026-07-21): episodes are a pure function of the seed
  REGARDLESS of what ran earlier in the process — the runner re-zeroes the
  actor id counter per episode (`resetActorIdCounter`, sim-only), because
  id-derived per-body variety (attack-cadence jitter, weave phases) would
  otherwise make a session's Nth episode diverge from its 1st and flip
  marginal verdicts with probe ORDER. Pinned by probe_supportmatrix E10b.
  Verdicts minted before this law (ledger history ≤ 2026-07-21) carried
  order noise on marginal live pairs; re-probes self-correct them.
- Divergent pairs classify by which channel lanes moved (`CHANNEL_LANES`):
  output/defense beyond noise = **effective** (the Δoutput column doubles as
  a support-power table); cost alone = **cost_only** (a tax with no observed
  function — the partial-no-op bucket); nothing beyond noise =
  **negligible** (indeterminate — escalate seeds/duration, never cite as-is).
- THE COST-FUNCTION LAW: a gem whose ENTIRE payload lives on cost-function
  stats (`COST_FUNCTION_STATS` — manaCost, addedCooldown, cooldownRecovery…)
  is cost-SHAPED: moving the tax IS its function (Efficiency's cheaper cast,
  Austerity's long clock). The defect distiller (`observedDefects`) never
  mints a cost_only defect for a cost-shaped gem — its cost_only verdict
  means WORKING. A cost-shaped gem reading fully INERT (a free skill it
  cannot cheapen) is still a finding.
- **blind** = the standard probes cannot raise this pairing's condition
  (`BLINDNESS_RULES`, data): cursor-origin travel payloads, companion gems
  without their mechanism (fuse/tether riders, trigger-permits with no
  trigger gem beside them), death-dependent payloads vs the immortal dummy,
  leech at full vitals, stealth verbs and shift-metas no pilot performs,
  threat re-weighting on a one-name chart, conditions the rig cannot arm
  (fullEs on an ES-less rig, lowLife, combo-cadence on a one-skill diet),
  reservation reads with no toggle burning, positional movement payloads,
  spender grafts with no charge source (or on a single unbroken channel
  hold), slayer conditions the pack cannot wear (empowered/heavy/composite
  victims), remnant scoops no pilot walks, and orb-shed rates multiplying a
  bare rig's zero bases. Blind is UNMEASURED, never evidence of breakage —
  and teaching a probe the missing verb (then deleting the row) re-enters
  the whole class into measurement. Blindness only ever OVERRIDES an
  inert/negligible reading — a pair that measures effective keeps its
  verdict even when a rule matches.
- Crew-fit pairs probe KEYED: the resonance gem rides both runs, so the
  verdict is about the boarded behavior, not the (by-design) dormant
  keyless socket.
- Probe shapes are data: dummy vs live targets (`LIVE_PROBE_*` rules — kills,
  corpses, incoming damage), solo vs escort rigs (`ESCORT_HOST_RULES` — a
  curse shows its worth through the escort's hits; trigger gems fire off its
  events). A pair's report row names the shape that measured it.
  KILL-SCOPED payloads route LIVE by rule (`LIVE_PROBE_SUPPORT_RULES`):
  kill-trigger procs, on-kill/on-death charge taps, orb/remnant kill-sheds,
  'overmatch' (the pack's levelBonus stands above the rig), and area-geometry
  / knockback payloads that read only at edges or across displaced bodies —
  the immortal, centered dummy can arm none of those. Kill-scoped rules
  route to THE FODDER PACK (`COMPAT_CFG.fodderPack`, below-parity and
  fast-cycling): the wounding pack's levelBonus makes it too tanky for
  modest-dps hosts to kill inside an episode (measured: frost_nova, 0 kills
  in 20s), so kill payloads need kill THROUGHPUT, not tankiness — the bare
  baseline and the deep lane's masked variants ride the same pack flavor
  (`PairShape.pack` — shape-matched A/B, always).
- THE DEFENSIVE-STAT LANE: a gem whose mods touch mitigation, avoidance,
  pools, recovery, or sustain (`LIVE_PROBE_SUPPORT_STATS`) routes to the
  wounding LIVE probe — the dummy never swings back, so those payloads used
  to read false-INERT. Fraction-valued fingerprint channels (life/mana
  floors) carry their own noise floor (`CHANNEL_NOISE_ABS`: 2% of the bar)
  so pool/regen/leech effects register at all. Residuals, stated honestly:
  the pack leans physical (pure elemental-resist readings are guarded by a
  blindness rule), and weak sustain (a 2% leech) may read NEGLIGIBLE until
  escalated — that is a magnitude finding, not a probe gap.
- Reading INERT rows: the row often carries a static annotation
  (`data/graftReadSites.ts` — "'trail' is read only at spawnProjectile"),
  which is the fix-it trail. An inert pair resolves ONE of two ways, both
  legitimate: make it WORK (engine read-site or data payload) or make it
  REFUSE honestly (tags/excludeTags) — a socket that takes the gem and does
  nothing is the only wrong answer.
- Cost: full coverage is ~90k episodes (hours). Slice with `--support`
  (one gem catalog-wide) or `--filter` (one skill family), and use
  `--budget N` for breadth-first coverage that states what it skipped.
- EVERY RUN STREAMS `verdicts.jsonl` (one line per finished pair): a killed
  run resumes with `--resume <dir>` (same rig only — the flags that change
  episode content are signature-checked), and concurrent runners split the
  work with `--shard i/n` (deterministic stride over the shared probe order:
  disjoint, union-total, each shard still covering every support). `matrix
  merge <dirA> <dirB> …` unions shard runs into one self-contained coverage
  picture; verdict conflicts under one rig mean mixed code and exit 2.

**The matrix as a UNIT TEST** (`matrix check` + the committed ledger) — the
no-op hunt with a ratchet, so it can run like a regression suite:
- `balance/baselines/support_matrix.json` is THE LEDGER: every known defect
  pair (`inert` / `cost_only` / `partial`) and every known census suspect,
  each with a status — `open` (known backlog; presence expected) or
  `intended` (adjudicated deliberate, note required). It is committed, like
  the baselines, and rewritten only deliberately.
- `matrix check [slicing flags]` runs the matrix and diffs: a defect the
  ledger doesn't know is a NEW finding → exit 2. Known-open rows pass (they
  are the backlog, not a regression); rows measuring healthy print as
  RESOLVED; kind changes print as DRIFT. Coverage is honest by construction:
  a sliced/budgeted check judges only pairs it probed, `partial` rows verify
  only when the deep lane ran, and rows outside the slice ride through
  untouched.
- `matrix check --reconcile` rewrites the ledger from the run (the
  `baseline write` analog — same commit as the fix, always): new defects
  enter as `open` with an autonote, resolved rows retire, drifted kinds
  refresh with status/note/since preserved.
- `matrix adjudicate <skill> <support> --status intended --note "…"` attaches
  the DECISION to an observed row ("should this work?" answered in writing);
  `--status open` re-opens it. Rows are minted by reconcile, never by hand.
- `matrix ledger` prints the backlog at a glance (kind × status counts,
  oldest open rows, referential lint against the live registries).
- `matrix check --known-only` re-probes exactly the ledger's rows — the fast
  "did anything I know about move?" pass after a data change.

**The deep lane** (`--deep` on `sweep supports`/`matrix check`, always on in
`matrix explain`) — dead lines hiding inside WORKING gems:
- Every payload UNIT of a gem (each `mods`/`perLevel` row, each graft field —
  derived from the engine's compile-checked SupportDef field partition, so a
  new field is a unit the moment it ships) is masked one-out and re-probed
  under the full gem's exact probe shape. Masked ≡ full ⇒ that unit did
  NOTHING on this host: an `effective` pair with dead units is a `partial`
  defect — "flagged as working, partly doesn't".
- The blindness rules re-screen each unit IN ISOLATION: leech riding a
  damage gem reads `unmeasured (blind)`, never a false `dead`. Composition
  levers (`grantsTags`, `resonance`) are listed but never defect material —
  they act through other gems by design. `perLevel` rows are invisible at
  support level 1 (they scale by level−1) — re-run with `--support-level 2+`.
- Verdict per unit: `dead` / `contributing` / `sole_carrier` (masking it
  reduces the gem to nothing) / `unmeasured`.

**The forensics lane** (`matrix explain <skill> <support>`) — one pair, the
whole story, ~1s: the socket-gate trace clause by clause (cross-checked
against the real gate — `agrees: ✗` means the explainer drifted and the
probe fails), the crew-boarding picture, the static paper contract
(effective level, mod fold, threshold unlocks through the real instance
machinery), unread-payload annotations, blindness rules, the probe shape
and its reasons, the A/B verdict with moved channels, per-unit attribution,
and PRESCRIPTIONS — data rules (`PRESCRIPTION_RULES`) mapping each finding
shape to its legitimate exits. Writes `explain.json` for tooling.

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
| a matrix blindness rule | `src/sim/compat.ts` (`BLINDNESS_RULES` — pair AND per-unit screens read it) |
| a pair-forensics prescription | `src/sim/compat.ts` (`PRESCRIPTION_RULES`) |
| a matrix defect adjudication | `matrix adjudicate` → `balance/baselines/support_matrix.json` (rows minted by `matrix check --reconcile`, never by hand) |
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

## The powercurve sitting (2026-08-12) — full roster, full catalog

Backlog #148: the first FULL-SCOPE run of both curve instruments. Before this
section, `sweep progression` had been run once ever (warrior alone, 07-12)
and every `sweep skills` on record was a `--filter` slice — so the roster
had never been ranked as a roster, and eleven newer class skills had never
been seated in the catalog at all. This is a **measurement record**: numbers
and findings, no retunes. It is also the harness-coverage prerequisite that
**THE NUMBERS-CRUNCH RESCALE** (planned pass #12, user-named 2026-07-17,
"grow the harness's coverage first") names: the rescale must sweep class
bases, monster damage/life, affix magnitudes, regen and the sim baselines
together, and these tables are its "before" picture. The expressibility gaps
in F1–F3 below are the part of that coverage the rescale must NOT inherit
blind — a class the rig cannot express is a class the rescale cannot verify.

Provenance: HEAD `ce3773b`, 2026-08-12, seeds 5, default base-seed. The
shared working tree carried concurrent sessions' in-flight edits (33 files)
— reruns of the commands below reproduce the readings exactly on the same
tree (deterministic seeds), directionally on any nearby HEAD. No sweep
crashed; `warning_count` was 0 on every row — all 6,085 episodes are clean
data by the harness's own standard. Runtimes: progression 2,520 episodes in
~11.6 min wall across 6 sequential shards (89–156 s each; sharding keeps the
run-directory name under Windows MAX_PATH — a single `--classes` list of all
36 ids overflows it); skills 3,565 episodes in ~8 min. Per-shard logs:
`balance/reports/powercurve_shard{1..6}.log` + `powercurve_skills_l5.log`
(gitignored, like the report dirs — this section is the durable copy).

```
npm run sim -- sweep progression --geared --seeds 5 --levels 1,5,10,20 --classes <6-at-a-time>
npm run sim -- sweep skills --level 5 --seeds 5
```

### The roster curve (36 classes × L1/5/10/20 × bare+geared × 5 seeds)

Bare dummy DPS per band; L20 geared and the geared÷bare multiplier. `0` is
a reading, not a blank — see the expressibility split below the table.

| class | L1 | L5 | L10 | L20 | L20 geared | ×gear | note |
|---|---|---|---|---|---|---|---|
| sorcerer | 37.2 | 58.9 | 85.6 | 146.6 | 582.0 | 3.97× | head of the pack, every band |
| trapper | 27.9 | 37.4 | 56.1 | 101.6 | 224.4 | 2.21× | 2nd bare every band |
| warrior | 21.6 | 33.5 | 50.5 | 87.3 | 164.8 | 1.89× | lowest ×gear in the roster |
| summoner | 32.7 | 36.8 | 45.9 | 82.7 | 250.8 | 3.03× | |
| necromancer | 12.1 | 20.7 | 25.2 | 67.0 | 275.6 | 4.11× | geared #2; only bare L20 parity clear inside the band (12.4 s) |
| brawler | 15.8 | 20.5 | 32.7 | 65.1 | 199.6 | 3.07× | |
| blademaster | 19.6 | 25.3 | 38.4 | 64.6 | 177.8 | 2.75× | |
| pyromancer | 17.0 | 25.9 | 37.2 | 61.1 | 221.3 | 3.62× | |
| juggernaut | 12.9 | 18.1 | 25.8 | 54.4 | 107.4 | 1.98× | tank archetype, yet floors 2.4% / dies at bare L20 parity |
| ascetic | 22.7 | 27.4 | 32.4 | 48.8 | 117.3 | 2.40× | |
| breaker | 13.9 | 19.1 | 25.5 | 37.8 | 86.8 | 2.30× | durable (94.7% L1 floor) |
| magician | 11.3 | 17.2 | 23.7 | 36.7 | 102.3 | 2.79× | dummy under-reads its AoE: bare L20 parity dps_out 97.9 |
| cleric | 13.7 | 16.6 | 21.9 | 31.2 | 118.9 | 3.81× | floor collapses 14→5→2.1% from L5 on |
| sharper | 6.6 | 9.2 | 14.5 | 30.2 | 187.2 | 6.20× | highest real ×gear; 14th bare → 7th geared |
| ranger | 10.5 | 12.5 | 18.3 | 30.0 | 105.5 | 3.52× | glass: dies at parity from L5 on |
| vanguard | 8.8 | 12.2 | 18.6 | 29.0 | 80.8 | 2.79× | |
| rogue | 5.2 | 12.3 | 12.3 | 25.9 | 90.4 | 3.48× | glass tail |
| matador | 10.7 | 13.6 | 18.0 | 25.6 | 51.5 | 2.01× | carries 3 of the eleven; clears parity every band |
| resonator | 8.7 | 11.3 | 15.7 | 23.8 | 85.0 | 3.57× | carries 2 of the eleven |
| lancer | 9.1 | 11.3 | 15.2 | 22.8 | 95.5 | 4.19× | glass tail |
| skald | 8.9 | 11.0 | 13.9 | 21.8 | 93.8 | 4.30× | slow-but-immortal corner (99% floors early) |
| wallwright | 4.9 | 8.7 | 11.3 | 16.6 | 42.7 | 2.57× | tail every band; 96% floors |
| swashbuckler | 4.8 | 5.4 | 7.0 | 9.6 | 28.6 | 2.98× | tail every band, parity kills fall to 0 by L20 |
| guardian | 1.2 | 2.2 | 4.5 | 9.7 | **0.0** | — | near-mute; geared L20 dummy-mute (F3) |
| firebrand | 2.2 | 2.8 | 3.3 | 4.0 | 18.1 | 4.55×* | near-mute; L5 geared 0.90× (only sub-1 cell) |
| chronomancer | 1.5 | 1.9 | 2.5 | 2.5 | 10.7 | 4.25×* | near-mute, 0–0.2 parity kills |
| beguiler | 0.7 | 1.0 | 0.7 | 1.3 | 7.5 | 5.69×* | near-mute, 0 parity kills at every band |
| falconer | 0.6 | 0.6 | 0.6 | 0.6 | 6.5 | 11.12×* | dummy-mute, parity-LIVE (full clears, ~100% floor) |
| sentinel | 0 | 0 | 0 | 0 | 0 | — | dummy-mute, parity-LIVE (6/6 kills every band) |
| hivecaller | 0 | 0 | 0 | 0 | 0 | — | dummy-mute, parity-LIVE (2.4–4.8 kills) |
| berserker | 0 | 0 | 0 | 0 | 0 | — | full-mute (F2) |
| assassin | 0 | 0 | 0 | 0 | 0 | — | full-mute |
| tamer | 1.0 | 0 | 0 | 0 | 0 | — | full-mute (kit needs a wild beast; arena has none) |
| warlord | 0 | 0 | 0 | 0 | 0 | — | full-mute (support bar: standard/mark/shout) |
| flagellant | 0 | 0 | 0 | 0 | 0 | — | full-mute (bar has no direct attack) |
| runeweaver | 0 | 0 | 0 | 0 | 0 | — | full-mute (weave grammar the pilot can't drum) |

`*` = a near-zero bare denominator: the multiplier is an arithmetic
artifact, not a gear story. Expressible-cohort medians (bare, dps>3):
L1 12.1 / L5 17.2 / L10 21.9 / L20 31.2 — and the spread within that
cohort **widens 7.7× → 11.0× → 26.3× → 36.8×** from L1 to L20: the pack
diverges as it levels. Outside the pack at every band: **sorcerer and
trapper above** (sorcerer 1.7× the median at L1 growing to 4.7× at L20),
**swashbuckler and wallwright below** (plus the near-mutes). The geared
column reshuffles rather than amplifies: the bare head (warrior, trapper,
juggernaut, matador, breaker: 1.89–2.30×) gains least from the wardrobe
while sharper/skald/lancer/necromancer/cleric (3.8–6.2×) gain most —
except sorcerer, which keeps 3.97× on the highest base and lands geared
L20 at 2.1× the geared runner-up.

**The expressibility wall (the headline): 13 of 36 classes post no
meaningful bare dummy DPS at any band.** Three distinct shapes, and per
the shakedown/fire-gap doctrine zeros are TRIAGE, not nerf/buff targets:

- **Full-mute** (0 dummy DPS, 0 parity kills, dies to the pack) —
  berserker, assassin, tamer, warlord, flagellant, runeweaver.
- **Dummy-mute but parity-live** (the kit expresses only against bodies
  that fight back) — sentinel (retaliation: 6/6 parity kills at every
  band), hivecaller (throng), falconer (0.58 trickle vs dummy, full
  parity clears at ~100% life floor). Clean rig artifacts.
- **Near-mute** (<5 bare dummy DPS through L20, parity marginal-to-dead)
  — guardian, beguiler, chronomancer, firebrand (+ swashbuckler at the
  healthy tail's edge).

The dummy lane therefore ranks 23 of 36 classes; the parity lane rescues
three more; ten classes are effectively OUTSIDE the instrument today.
That is a harness-coverage number as much as a balance number — the
rescale's safety net has holes exactly where those ten stand.

The parity lane adds a band-wide reading: **bare L20 parity is a wall.**
Only 8 of 36 record a full bare clear at L20; 19 die in the attempt
(`player_deaths` ≈ 1.0); only necromancer clears inside the provisional
2–14 s band. Geared L20 clears are comfortable nearly roster-wide
(10–33 s). Shakedown finding 1 ("parity TTK is sloggy") at roster scale:
by L20 the parity band's expectations are calibrated to geared reality,
and bare builds have left the instrument's range.

### The catalog ranking (713 attack/spell rigs, solo vs dummy @ L5, gem 2, 5 seeds)

Cohorts: 549 droppable + 164 noDrop kit rows; 260 of 713 post zero (214
droppable) — the familiar triage cohort (auras, buffs, summons vs a
passive dummy, mines, plus genuinely broken kits). Droppable-live decile
medians (335 rows): 102.3 / 58.4 / 42.7 / 29.1 / 21.4 / 15.1 / 11.2 /
7.6 / 5.4 / 2.25 — a 45× spread between the top and bottom decile
medians. The noDrop lane re-confirms the fire-gap verdict: its top row
(`invoke_conflagration`, 1790.6) posts 5× the best droppable row on cast
economics alone — noDrop rows are never ranked against droppable ones.
Droppable head: shardrift 357.4, grasping_chasm 239.5, marshlight 233.5,
mirespume 211.6, blizzard_coil 177.0.

**The eleven newer class skills, seated at last** (percentile within the
335 live droppable rows, 0 = top):

| skill | dps | seat | reading |
|---|---|---|---|
| thrown_ace | 54.8 | top 18% (d1) | healthy — sharper's dealt card |
| tuning_strike | 54.4 | top 19% (d1) | healthy — resonator's anchor |
| perfect_strike | 47.8 | top 23% (d2) | healthy — matador's payoff |
| toppling_stroke | 11.9 | 61% (d6) | mid-low; cd-3 AoE, sustained lane under-rates it |
| shatterchord | 6.1 | 82% (d8) | low; cd-7 burst read on a sustained lane — re-read under `--vs` before judging |
| planted_banderilla | 2.2 | 96% (bottom decile) | the one live row seated as an outlier — see F8 |
| cape_feint | 0 | zero cohort | movement/counter grammar; no scenario can arm it yet |
| ashen_vow | 0 | zero cohort | aura — zero-alone by design |
| cast_falcon | 0 | zero cohort | summon vs passive dummy — known lane |
| stack_the_deck | 0 | zero cohort | buff — zero-alone by design |
| incite | 0 | zero cohort | needs a crowd to incite; dummy can't be |

Five of the eleven land in the zero cohort — but every one classifies
into a KNOWN zero lane (aura/buff/summon/crowd/counter), and their
carrier classes tell the fuller story: matador, sharper and resonator
(seven of the eleven between them) all express and clear parity in the
progression table, while flagellant, falconer and firebrand (the other
four skills' chassis) are mute or near-mute there. None of the eleven
reads as an outright balance defect on this evidence; one (banderilla)
earns a flag.

### Findings

- **F1 — the expressibility wall.** 13/36 classes unrankable on the dummy
  lane (shapes above). The fix lane is pilots/scenarios (a retaliation
  probe that hits back, a throng/tame source in the arena, a weave-capable
  pilot, richer bars), NOT class retunes. Repro: any shard command above.
- **F2 — berserker presses and never connects.** 0.43 casts/s (~13
  presses per 30 s episode), 0 hits landed, mana floor 91.7%, at every
  band, bare and geared — an ordinary melee bar (heavy_strike/whirlwind,
  mana 4/3) whiffing against a STATIONARY dummy under the same pilot that
  lands warrior's cleave 37 times. Genuine-defect smell, engine forensics
  owed. Repro: `npm run sim -- sweep progression --classes berserker --levels 5 --seeds 5`.
- **F3 — guardian's geared rig goes dummy-mute.** Bare L20 connects
  (8 hits, 9.65 dps); geared L20 presses 0.53/s and lands 0 hits on the
  dummy while the SAME geared build clears parity (6 kills, 35.6
  dps_out). The wardrobe changes something that unmakes the dummy lane
  for this class. Repro: `npm run sim -- sweep progression --classes guardian --levels 20 --geared --seeds 5`.
- **F4 — sorcerer sits above the pack at every band.** 1.7× the
  expressible median at L1 → 4.7× at L20 bare; geared L20 (582) is 2.1×
  the geared runner-up. The roster's top outlier both bare and geared.
- **F5 — the bare L20 parity wall.** 8/36 full clears, 19 deaths, one
  in-band clear (necromancer). Either late bare damage is low, late
  parity packs are hot, or the band is geared-only — decide on purpose.
- **F6 — the gear-value column spans 1.89×–6.20×** among expressible
  classes at L20 (warrior lowest, sharper highest), with firebrand's L5
  0.90× the only sub-1 cell (its geared twin posts LESS than bare) and
  falconer/beguiler/chronomancer/firebrand multipliers flagged `*` as
  near-zero-denominator artifacts.
- **F7 — shardrift and grasping_chasm top the droppable board FROM the
  cooldown-disadvantaged side.** The sustained dummy lane structurally
  under-rates cooldown skills (fire-gap law), yet these two cd-5 rows
  post 357/239 against the best cd-0 row's 233 — their per-cast payloads
  out-earn the entire cooldown tax. A burst-window or `--vs` read would
  only widen the gap. The catalog's clearest above-pack outliers.
- **F8 — planted_banderilla seats in the bottom decile of live droppable
  rows** (2.19 dps, 15th from the bottom, casts 0.20/s on cd-6). Its
  plant-then-payoff duration grammar is exactly what a solo-dummy
  sustained lane under-reads — and matador, which leads with it, is
  mid-pack and parity-clearing in progression — so this is flagged for a
  richer-lane re-measure (`--vs`, or a matador-chassis run), not a
  retune. If it still seats bottom-decile there, THEN it reads as a
  defect.
- **F9 — no crashes, no warned rows.** Both instruments completed full
  scope; every row is clean by the harness's own `warning_count`
  standard. The coverage gap is expressibility (F1), not stability.
