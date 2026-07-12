# Agent Playbook — machine-scale balance passes

This is the operating manual for an LLM agent (Claude, Sonnet-class or above)
running balance passes over Hollow Wake. The harness was built so that an
agent can run **hundreds of measured experiments per session** and hand back
claims a human can re-check with one command. Read
[README.md](README.md) first — it defines the instrument; this file defines
the contract.

## The contract

**You may freely change (the tunable surface):**
- `src/data/**` — skills, supports, monsters, affixes, uniques, loot tables,
  passives, zones, classes (numbers, tags, curves, tables). This includes
  `graftReadSites.ts` (add a row when a new delivery-scoped payload ships —
  the validator and the support matrix both read it; never delete a row to
  silence a finding).
- Named `*_CFG` objects (`ITEM_CFG`, `DROP_CFG`, `DEFENSE_CFG`, `CRAFT_CFG`,
  `GEM_DROP_CFG`, `MERC_CFG`, `TEXTURE_CFG`, `MATCHUP_CFG`, …) — they exist
  exactly for this.
- `src/sim/data/**` — scenarios, suites, reference builds, target PANELS,
  target bands (bands only as *hypotheses*: add/adjust with
  `provisional: true`).
- `balance/players/**` — committed real-build fixtures (CharacterSave JSONs);
  curate like reference builds, a few honest snapshots per band.

**You must not change without flagging for human sign-off:**
- Engine mechanics (`src/engine/**` beyond the tap seams), the damage ladder's
  order, AI brains' logic. If a finding implies an engine *bug*, report it —
  do not fix it inside a balance pass.
- Baselines, except via `baseline write` **in the same commit** as an intended,
  explained change.
- Removing a band's `provisional` flag, deleting warnings, or weakening the
  gate tolerances to make a run pass.

**Hard honesty rules:**
- A warned row (`warning_count > 0`) is not evidence. Fix the setup or say why
  the warning is benign.
- Zero-DPS sweep rows are triage, not nerf lists (aura/summon/mine kits need
  richer scenarios — see README).
- If `|Δ| < sd`, you have a coin flip, not a finding. Add seeds (10 → 30)
  before claiming anything.
- Never compare across different pilots and call it a skill delta.
- A matchup `∞ WALL` (zero kill cycles beside living columns) is a claim
  about an INTERACTION — check the target's level/panel seat and the episode
  window before calling it a counter, and never divide by it.
- An UNPOPULATED texture pole from `audit textures` is a content gap to
  report, not a reason to stretch a panel query until something matches.
- `--as` runs are ungraded by design (bands assume reference builds). Compare
  a real character to the reference build's numbers, not to the bands.
- Substituting saves mid-pass: `save:` refs read the LIVE slot — a player
  session running in parallel can rewrite it between runs. Pin fixtures into
  `balance/players/` for anything you'll cite.

## The loop

```
1. ORIENT      npm run sim -- manifest                 # what exists (JSON)
               npm run sim -- audit textures           # which defensive poles are populated
               npm run sim -- sweep supports --static-only   # the compatibility census (free)
2. HEALTH      npm run sim -- baseline check --suite smoke   # exit 2 = repo already moved; stop and report
3. MEASURE     npm run sim -- run --suite <nearest> --seeds 10
               npm run sim -- sweep skills --level <band> --seeds 5 [--filter x]
               npm run sim -- sweep skills --level <band> --vs panel:textures_l8 [--filter x]
               npm run sim -- sweep matchups --build <ref> --panel <id> --seeds 5
               npm run sim -- sweep supports --support <gem> | --filter <skill>
               npm run sim -- sweep progression --geared --seeds 5
               npm run sim -- audit monsters / affixes / drops
4. HYPOTHESIZE one sentence: "<knob> causes <metric> to be <off-band> because <mechanism>"
5. CHANGE      the smallest data diff that tests it (one knob family per pass)
6. RE-MEASURE  same commands, same seeds — plus the smoke suite, always
7. JUDGE       npm run sim -- compare <before>/report.json <after>/report.json
8. REPORT      the template below; propose the commit (change + baseline write
               together if the move was intended)
```

## The support-matrix pass (the no-op hunt, end to end)

The `sweep supports` matrix answers three questions at once — run it and
follow up on each bucket differently:

**How to run it.**
- Dev-loop slice: `sweep supports --support <gem>` (one gem × every skill,
  seconds) or `--filter <skill>` (one skill family × every gem).
- The full pass: `sweep supports --budget 70000 --out balance/reports/<name>`
  — ~55k episodes, HOURS; run it in the background (append `> log 2>&1 &`)
  and read `compat.json`/`report.md` when it lands. Budget-capped runs
  round-robin across supports and print exactly what they skipped: coverage
  claims must match the run, never the intention.
- Everything is deterministic: same seed ⇒ same verdicts. Re-run a single
  pair after a fix with `--support X --filter Y` and the verdict flip is
  the proof.

**How to follow up (per bucket, in priority order):**
1. **INERT** (socketed, byte-identical episodes) — a real defect, one of:
   - *Payload has no read-site on this delivery* (the static annotation
     names it). Either make it work (extend the engine read-site — flag for
     human sign-off) or make it refuse honestly (tighten `requiresTags` /
     `excludeTags` in `src/data/supports.ts` — yours to do). Never leave a
     socket that takes the gem and does nothing.
   - *Probe blindness* — the scenario can't exercise the payload (e.g. a
     kill-scoped gem against the immortal dummy). Check the pair's probe
     column first; if the shape is wrong, extend the probe rules in
     `src/sim/compat.ts` rather than "fixing" healthy data.
2. **COST_ONLY** (tax moved, function didn't) — usually a partially-dead
   payload: the mods bill, the graft never fires. Same two exits as INERT.
3. **REFUSED-SUSPECT** (mechanically affine, tags refuse) — tag hygiene:
   either the skill is missing an honest tag (add it — the gem then boards
   everywhere the tag promises), or the refusal is deliberate design
   (document it with an `excludeTags` so the census stops flagging it).
4. **NEGLIGIBLE** — not evidence. Escalate that pair alone with
   `--seeds 5 --duration 30` before saying anything about it.
5. **EFFECTIVE extremes** — the Δoutput table's top/bottom ARE the support
   balance pass: same-cost gems spanning 10× on the same host is a finding.
   Beware the stationary-dummy inflation for ground/trail payloads — parked
   targets eat every tick; confirm big AoE deltas against a live probe
   (`--filter` the pair and read the live column) before nerfing.

**Honesty rules specific to the matrix:**
- An INERT verdict is definitive FOR THAT PROBE — say "inert under the
  dummy/solo probe", not "broken everywhere", unless the static annotation
  proves delivery-scoped death.
- Crew-fit pairs are probed WITH the resonance key; a keyless dormant gem
  is the lever working as designed, never a finding.
- `raise_spectre`/`revive`-style UNKNOWABLE crews verdict per-episode-body
  (the zombie the probe raised) — a projectile gem inert on a raised zombie
  is per-body truth, not catalog truth.

## The economy pass (drops, affixes, gear value)

- `audit affixes` at the default bands after ANY `itemaffixes.ts` /
  `itembases.ts` / `uniques.ts` change. Follow up: NEVER-ROLLED rows with
  real weight = check tier `ilvl` windows and pool tags before touching
  weights; DEAD STAT LINES = fix the stat name (or add the stat) same-commit;
  UNREACHABLE affixes = add the tag to a base family or retire the affix.
- `audit drops --table <id>` after `loottables.ts` / `DROP_CFG` changes —
  the per-kill expectation table is the tuning surface (chances × yields),
  and unique frequency per band is printed beside it.
- `sweep progression --geared` after gear-affecting changes: the geared÷bare
  column moving is the point; bare columns moving means the change leaked
  outside gear.
- These audits are deterministic (`ECONOMY_CFG.seed`) — identical reruns are
  byte-stable, so diffs between runs are DATA changes, never dice.

Loop small: one hypothesis per pass beats ten entangled edits nobody can
attribute. The harness is fast (~0.2s/episode) — spend runs, not guesses.

## Commands & machine-readable surfaces

Everything prints deterministic JSON to files; parse those, not the console.

- `manifest` → stdout JSON: classes (live bars), skills (id+tags), supports,
  monsters (id/xp/boss/passive/spawner), builds, scenarios, suites, target
  bands. Enumerate from here — never hardcode content lists.
- `run --suite S | --scenario a,b [--seeds N] [--base-seed K] [--out dir]`
  → `report.json` (`SuiteResult`: per-scenario `metrics` as
  `{n,mean,median,min,max,p10,p90,sd}`, `grades`, `warnings`),
  `episodes.json` (every episode: flat `metrics`, `casts` per skill,
  `deaths` timeline, `warnings`), `report.md`.
- `sweep skills [--level N] [--gem-level N] [--class id] [--filter substr]`
  → same shapes + console ranking. The sweep rig pins all ten attributes to
  40 so requirement gates never confound the skill measurement — solo skill,
  no supports, no gear, same pilot.
- `sweep skills --vs panel:<id> | --vs id[:lvl],…` → the same rigs against
  killable respawn-duels instead of the dummy; emits `matrix.json`
  (rows=skills, cols=targets, cells: edps/ttk/kills/dps_in/floor/deaths) and
  a console matrix with a per-skill texture SPREAD. Cost = skills × targets ×
  seeds episodes, printed before running — `--filter` first.
- `sweep matchups --build <id|save:ref> (--panel <id> | --targets id[:lvl],…)
  [--level N] [--duration N]` → one build across a target roster; console
  table gives both directions (edps/ttk out, dps_in/floor/deaths back) plus
  the edps spread; same `matrix.json`.
- `run … --as <id|save:slot|save:path>` → the suite's scenarios with the
  build swapped for a registry build or a REAL character (pilot re-derived
  from its class; ids prefixed `as_…__` so bands don't grade them).
- `audit monsters [--levels csv]` → `monsters.json` / `monsters.csv` rows:
  `{id, level, life, armor, evasion, moveSpeed, xp, boss, passive}` through
  the real `createMonster` (scaling included).
- `audit textures [--level N] [--check-panels]` → `textures.json` /
  `textures.csv`: per-monster defensive profile + assigned texture poles
  (armor/evasion/es/poise/shell/apex/plain) with a census that names
  unpopulated poles. `--check-panels` re-derives every curated panel claim
  and exits 2 on drift — run it whenever monsters or `TEXTURE_CFG` move.
- `compare A B [--tolerance 0.15] [--abs-eps 0.5]` → exit 2 + listing when a
  gated metric's mean moved beyond both thresholds. Gated set:
  `dps_out, dps_dummy, dps_in, ttk_wave_mean, kills, kill_rate,
  player_deaths, life_floor_pct`.
- `baseline write|check --suite S [--seeds N]` → committed baseline at
  `balance/baselines/<suite>.json`; check = run + compare, exit 2 on breach.

Exit codes: `0` ok · `1` usage/internal error · `2` regression gate breached.

## Scaling a pass (breadth strategy)

For "audit everything"-shaped asks, layer coverage:
1. `manifest` + `audit monsters` + `audit textures` — free, full breadth.
2. `sweep skills` at 2–3 level bands — every attack/spell skill, ranked.
3. `run --suite starters --seeds 10` — archetype health at the bands.
4. The interaction layer: `sweep skills --vs panel:textures_l8` on the
   flagged band (filtered if wide), and `sweep matchups` for each reference
   AND `player_*` build that band owns — spreads and WALLs are the findings.
5. Targeted deep-dives only where 1–4 flagged something (a `--filter` sweep
   with supports via a custom build, a `duel_` matrix vs the outlier monster,
   a rarity-promoted panel seat for elite pressure).
6. For unknown-unknowns: propose new scenarios/panels (that's a
   `src/sim/data/` change — in your remit) rather than stretching conclusions
   past coverage.

State plainly what you did NOT cover. An honest coverage map beats implied
omniscience.

## Report template

```markdown
## Balance pass — <scope> (<date>)
**Coverage:** suites/sweeps run, seeds, what was NOT covered.
**Repo health:** baseline check result before changes.

### Findings (ranked)
1. <claim> — evidence: <scenario ids, metric means ± sd, seeds>.
   Repro: `npm run sim -- run --scenario … --seeds 10 --base-seed …`

### Changes proposed/applied
- <file>: <knob> <old> → <new> — rationale, hypothesis it tests.
- Post-change: smoke ✓, <suite> Δ table, baseline written: yes/no+why.

### Triage (not findings)
- zero-DPS/warned rows and what scenario work each needs.

### For human sign-off
- engine-bug suspicions, band edits worth de-provisionalizing, anything
  outside the tunable surface.
```

## Invariants to respect while editing data

- Registries stay open: new ids over special cases; no literal id lists in
  engine code; thresholds go in `*_CFG` objects or `src/sim/data/targets.ts`.
- `npx tsc --noEmit` and `npx tsc -p tsconfig.sim.json` must stay clean.
- `npm run sim -- run --suite smoke` after every change set, no exceptions.
- Reports you cite must exist under `balance/reports/` with the exact command
  that regenerates them (they're gitignored — the *command + seed* is the
  reproducible artifact, so always state both).
