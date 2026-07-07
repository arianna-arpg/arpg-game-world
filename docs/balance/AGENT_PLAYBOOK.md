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
  passives, zones, classes (numbers, tags, curves, tables).
- Named `*_CFG` objects (`ITEM_CFG`, `DROP_CFG`, `DEFENSE_CFG`, `CRAFT_CFG`,
  `GEM_DROP_CFG`, `MERC_CFG`, …) — they exist exactly for this.
- `src/sim/data/**` — scenarios, suites, reference builds, target bands
  (bands only as *hypotheses*: add/adjust with `provisional: true`).

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

## The loop

```
1. ORIENT      npm run sim -- manifest                 # what exists (JSON)
2. HEALTH      npm run sim -- baseline check --suite smoke   # exit 2 = repo already moved; stop and report
3. MEASURE     npm run sim -- run --suite <nearest> --seeds 10
               npm run sim -- sweep skills --level <band> --seeds 5 [--filter x]
               npm run sim -- audit monsters
4. HYPOTHESIZE one sentence: "<knob> causes <metric> to be <off-band> because <mechanism>"
5. CHANGE      the smallest data diff that tests it (one knob family per pass)
6. RE-MEASURE  same commands, same seeds — plus the smoke suite, always
7. JUDGE       npm run sim -- compare <before>/report.json <after>/report.json
8. REPORT      the template below; propose the commit (change + baseline write
               together if the move was intended)
```

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
- `audit monsters [--levels csv]` → `monsters.json` / `monsters.csv` rows:
  `{id, level, life, armor, evasion, moveSpeed, xp, boss, passive}` through
  the real `createMonster` (scaling included).
- `compare A B [--tolerance 0.15] [--abs-eps 0.5]` → exit 2 + listing when a
  gated metric's mean moved beyond both thresholds. Gated set:
  `dps_out, dps_dummy, dps_in, ttk_wave_mean, kills, kill_rate,
  player_deaths, life_floor_pct`.
- `baseline write|check --suite S [--seeds N]` → committed baseline at
  `balance/baselines/<suite>.json`; check = run + compare, exit 2 on breach.

Exit codes: `0` ok · `1` usage/internal error · `2` regression gate breached.

## Scaling a pass (breadth strategy)

For "audit everything"-shaped asks, layer coverage:
1. `manifest` + `audit monsters` — free, full breadth.
2. `sweep skills` at 2–3 level bands — every attack/spell skill, ranked.
3. `run --suite starters --seeds 10` — archetype health at the bands.
4. Targeted deep-dives only where 1–3 flagged something (a `--filter` sweep
   with supports via a custom build, a `duel_` matrix vs the outlier monster).
5. For unknown-unknowns: propose new scenarios (that's a `src/sim/data/`
   change — in your remit) rather than stretching conclusions past coverage.

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
