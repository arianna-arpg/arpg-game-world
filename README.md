# Balance farm results

Data branch: machine-written by `.github/workflows/balance-farm.yml`. Do not edit by hand.

- `latest/` the newest night: `summary.json`, `digest.md`
- `nights/<date>/` one small record per night
- `trend.jsonl` one line per night
- `state/` what the next night builds on: the search archive, measured lane costs, row snapshot

Page: https://arianna-arpg.github.io/arpg-game-world/balance/

---

# Balance farm, night of 2026-10-31

Commit [e771c59ccf](https://github.com/arianna-arpg/arpg-game-world/commit/e771c59ccf69c944c7b37ce9d9b267627aa82768), profile `full`. 577,406 episodes, 165.5 core-hours, 382 minutes end to end. [Run](https://github.com/arianna-arpg/arpg-game-world/actions/runs/41176449171).

## 🔴 Regressions

**Crash in `bestiary_7of35`** (killed, lane bestiary).
```
  matchup_bestiary_geared_warrior_l25_vs_ember_rift_l25: 2 episode(s) in 0.7s — dps_out 76.19, kills 1
  threat_starter_magician_l12_vs_ember_wisp_l12: 2 episode(s) in 0.6s — dps_out 0, kills 0
  matchup_bestiary_geared_magician_l12_vs_emberwisp_l12: 2 episode(s) in 1.0s — dps_out 10.55, kills 5
  threat_starter_warrior_l12_vs_emerald_prowler_l12: 2 episode(s) in 0.8s — dps_out 0, kills 0
  matchup_bestiary_geared_warrior_l12_vs_fallen_star_l12: 2 episode(s) in 1.2s — dps_out 28.42, kills 2

```
**Crash in `search_1of40`** (killed, lane search).
```
  … 1190 candidates
  … 1207 candidates
  … 1227 candidates
  … 1237 candidates
  … 1251 candidates

```
**Crash in `bestiary_15of35`** (killed, lane bestiary).
```
  matchup_bestiary_geared_warrior_l12_vs_ember_shepherd_l12: 2 episode(s) in 3.1s — dps_out 0, kills 0
  threat_starter_magician_l5_vs_emberkin_matriarch_l5: 2 episode(s) in 0.3s — dps_out 0, kills 0
  matchup_bestiary_geared_magician_l5_vs_emberwyrm_l5: 2 episode(s) in 2.8s — dps_out 14.41, kills 0
  threat_starter_warrior_l5_vs_eventide_whale_l5: 2 episode(s) in 1.7s — dps_out 0, kills 0
  matchup_bestiary_geared_warrior_l5_vs_false_sovereign_l5: 2 episode(s) in 1.6s — dps_out 0, kills 0

```
**Crash in `bestiary_6of35`** (killed, lane bestiary).
```
  threat_starter_magician_l12_vs_ember_rift_l12: 2 episode(s) in 0.4s — dps_out 0, kills 0
  matchup_bestiary_geared_magician_l12_vs_ember_wisp_l12: 2 episode(s) in 2.4s — dps_out 18.12, kills 10
  threat_starter_warrior_l12_vs_emberwisp_l12: 2 episode(s) in 1.8s — dps_out 0, kills 0
  matchup_bestiary_geared_warrior_l12_vs_emerald_prowler_l12: 2 episode(s) in 2.1s — dps_out 22.56, kills 2
  threat_starter_magician_l5_vs_fallen_star_l5: 2 episode(s) in 1.4s — dps_out 0, kills 0

```
**Crash in `bestiary_9of35`** (killed, lane bestiary).
```
  matchup_bestiary_geared_magician_l25_vs_ember_rift_l25: 2 episode(s) in 2.1s — dps_out 59.46, kills 3
  threat_starter_warrior_l25_vs_ember_wisp_l25: 2 episode(s) in 1.4s — dps_out 0, kills 0
  matchup_bestiary_geared_warrior_l25_vs_emberwisp_l25: 2 episode(s) in 2.2s — dps_out 3.28, kills 0.5
  threat_starter_magician_l12_vs_emerald_prowler_l12: 2 episode(s) in 0.6s — dps_out 0, kills 0
  matchup_bestiary_geared_magician_l12_vs_fallen_star_l12: 2 episode(s) in 2.2s — dps_out 44.84, kills 3

```
**Crash in `search_15of40`** (killed, lane search).
```
  … 244 candidates
  … 252 candidates
  … 260 candidates
  … 268 candidates
  … 281 candidates

```
**Crash in `bestiary_10of35`** (killed, lane bestiary).
```
  threat_starter_magician_l25_vs_ember_rift_l25: 2 episode(s) in 0.3s — dps_out 0, kills 0
  matchup_bestiary_geared_magician_l25_vs_ember_wisp_l25: 2 episode(s) in 1.8s — dps_out 30.08, kills 11
  threat_starter_warrior_l25_vs_emberwisp_l25: 2 episode(s) in 1.4s — dps_out 0, kills 0
  matchup_bestiary_geared_warrior_l25_vs_emerald_prowler_l25: 2 episode(s) in 2.0s — dps_out 53.82, kills 2.5
  threat_starter_magician_l12_vs_fallen_star_l12: 2 episode(s) in 1.1s — dps_out 0, kills 0

```
**Crash in `bestiary_11of35`** (killed, lane bestiary).
```
  matchup_bestiary_geared_warrior_l5_vs_ember_shepherd_l5: 2 episode(s) in 3.5s — dps_out 0, kills 0
  threat_starter_magician_l25_vs_ember_wisp_l25: 2 episode(s) in 1.2s — dps_out 0, kills 0
  matchup_bestiary_geared_magician_l25_vs_emberwisp_l25: 2 episode(s) in 2.1s — dps_out 29.06, kills 6.5
  threat_starter_warrior_l25_vs_emerald_prowler_l25: 2 episode(s) in 1.1s — dps_out 0, kills 0
  matchup_bestiary_geared_warrior_l25_vs_fallen_star_l25: 2 episode(s) in 2.1s — dps_out 53.03, kills 2

```

**⚠️ This night is incomplete: 25 planned unit(s) did not finish.** The sections below cover what ran, and the coverage table names the rest.

## What moved since last night

First recorded night: nothing to compare with yet.

## Top proposed numbers

Advisory. Nothing here has been applied, and each needs your sign-off. Each row re-measured the subject on dice the night had not seen, solved for a number through the real game, and verified it at common seeds. 6 outlier(s) did not confirm on fresh dice and were dropped.

| # | subject | change | metric: before → after | cohort target | verdict | guards |
|---:|---|---|---|---:|---|---|
| 1 | monster_threat `seatless_usher` | `skills.ushers_lull.baseDamage.chaos.0`: 4 → 9.2 (+1 lines, ×2.3) | dps_in: 0 → 6.4 | 6.6 | moved | none moved |
| 2 | monster_threat `discord_siren` | `skills.discord_wail.baseDamage.chaos.0`: 7 → 14 (+1 lines, ×2) | dps_in: 0.8 → 6.2 | 6.6 | moved | none moved |
| 3 | skill `shardrift` | `skills.rift_shard.baseDamage.cold.0`: 6 → 2.4 (+1 lines, ×0.4) | dps_dummy: 210.5 → 101.9 | 62.3 | coin_flip | none moved |
| 4 | skill `arclight_rain` | `skills.arclight_rain.baseDamage.physical.0`: 5 → 2 (+3 lines, ×0.4) | dps_dummy: 153.8 → 78.4 | 55.1 | moved | none moved |
| 5 | monster_durability `snow_owl` | `monsters.snow_owl.base.life`: 22 → 55 | ttk_wave_mean: 1.8 → 3.9 | 4.3 | moved | dps_in 0→0.2 |
| 6 | skill `earthrender` | `skills.earthrender.baseDamage.physical.0`: 12 → 4.8 (+1 lines, ×0.4) | dps_dummy: 126.3 → 64.7 | 55.1 | moved | none moved |
| 7 | class `wallwright` | `skills.toppling_stroke.baseDamage.physical.0`: 14 → 34 (+1 lines, ×2.4) | kill_rate: 0 → 0.1 | 0.1 | moved | none moved |
| 8 | skill `colonnade` | `skills.aureate_lash.baseDamage.lightning.0`: 7 → 4.1 (+3 lines, ×0.59) | dps_dummy: 249.5 → 161.2 | 160.2 | moved | none moved |
| 9 | affix `hadal_cold` | `affixes.hadal_cold.tiers.0.ranges.0.0`: 13 → 5.2 (+11 lines, ×0.4) | dps_out: 261.3 → 224.7 | 199.6 | coin_flip | none moved |
| 10 | skill `hell_rift` | `skills.hellfire_missile.baseDamage.fire.0`: 6 → 5.4 (+1 lines, ×0.9) | dps_dummy: 175.7 → 161 | 160.2 | moved | none moved |

<details><summary>Repro commands</summary>

1. `npm run sim -- whatif --knob 'skills.ushers_lull.baseDamage*2.3' --scenarios threat:starter_magician_l25:seatless_usher:25 --seeds 30 --base-seed 4017360034`. Other dials on this metric (elasticity): kit.ushers_lull 150.45
2. `npm run sim -- whatif --knob 'skills.discord_wail.baseDamage*2' --scenarios threat:starter_magician_l25:discord_siren:25 --seeds 30 --base-seed 4017360034`. Other dials on this metric (elasticity): kit.discord_wail 4.22
3. `npm run sim -- whatif --knob 'skills.rift_shard.baseDamage*0.4' --scenarios skill:shardrift:1 --seeds 30 --base-seed 4017360034`. Other dials on this metric (elasticity): cooldown -0.68, useTime -0.14
4. `npm run sim -- whatif --knob 'skills.arclight_rain.baseDamage*0.4' --scenarios skill:arclight_rain:1 --seeds 30 --base-seed 4017360034`. Other dials on this metric (elasticity): baseDamage 0.82, cooldown 0.14
5. `npm run sim -- whatif --knob 'monsters.snow_owl.base.life*2.5' --scenarios duel:geared_warrior_l5:snow_owl:5 --seeds 30 --base-seed 4017360034`. Other dials on this metric (elasticity): base.life 0.48, base.evasion 0.12
6. `npm run sim -- whatif --knob 'skills.earthrender.baseDamage*0.4' --scenarios skill:earthrender:1 --seeds 30 --base-seed 4017360034`. Other dials on this metric (elasticity): baseDamage 0.81, cooldown -0.29, useTime -0.26
7. `npm run sim -- whatif --knob 'skills.toppling_stroke.baseDamage*2.4' --scenarios parity:wallwright:20 --seeds 30 --base-seed 4017360034`
8. `npm run sim -- whatif --knob 'skills.aureate_lash.baseDamage*0.59' --scenarios skill:colonnade:40 --seeds 30 --base-seed 4017360034`. Other dials on this metric (elasticity): cooldown 0.17
9. `npm run sim -- whatif --knob 'affixes.hadal_cold.tiers.*.ranges*0.4' --scenarios affix:warrior:20:gloves:hadal_cold:10397677:spar --seeds 30 --base-seed 4017360034`
10. `npm run sim -- whatif --knob 'skills.hellfire_missile.baseDamage*0.9' --scenarios skill:hell_rift:40 --seeds 30 --base-seed 4017360034`. Other dials on this metric (elasticity): cooldown -0.6, useTime -0.06

Run from commit `e771c59ccf69c944c7b37ce9d9b267627aa82768`.
</details>

### Flagged for your decision

The numbers an author would reach for did not move these enough. They are not proposals: each needs a call on whether the mechanic is right, and none has been touched.

- skill `flame_blast`: The numbers an author would reach for barely move this: skills.flame_blast.baseDamage ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `falconer`: The numbers an author would reach for barely move this: skills.expose_weakness.baseDamage ×2.5 closes 7%; skills.cloudstep.baseDamage ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `chronomancer`: The numbers an author would reach for barely move this: skills.stasis_lock.baseDamage ×2.5 closes 10%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- skill `grasping_chasm`: The numbers an author would reach for barely move this: skills.grasping_chasm.baseDamage ×0.4 closes 23%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `blood_mite`: The numbers an author would reach for barely move this: monsters.blood_mite.base.life ×2.5 closes 41%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `feral_hen`: The numbers an author would reach for barely move this: monsters.feral_hen.base.life ×2.5 closes 25%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- affix `apply_poison`: The numbers an author would reach for barely move this: affixes.apply_poison.tiers.*.ranges ×0.4 closes 40%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `stygian_doll`: The numbers an author would reach for barely move this: monsters.stygian_doll.base.life ×2.5 closes 3%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- affix `apply_bleed`: The numbers an author would reach for barely move this: affixes.apply_bleed.tiers.*.ranges ×0.4 closes 33%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- affix `creeper_barrow`: The numbers an author would reach for barely move this: affixes.creeper_barrow.tiers.*.ranges ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.

## Outliers

327 rows sit far from their cohort (log-scale median and MAD, z ≥ 3 and a ratio past 1.8× or 0.55×). Warned rows and zero rows never enter a cohort.

| | kind | subject | metric | value | cohort median | ratio | z | cohort |
|---|---|---|---|---:|---:|---:|---:|---|
|  | support | `vortex` | output_multiplier | 0 | 1 | 0.01× | -65.2 | supports · effective hosts |
|  | support | `embargo` | output_multiplier | 0 | 1 | 0.01× | -65.2 | supports · effective hosts |
|  | support | `guarded_casting` | output_multiplier | 0 | 1 | 0.01× | -65.2 | supports · effective hosts |
|  | skill | `colonnade` | dps_dummy | 246.3 | 29.8 | 8.27× | 53 | L40 · construct · cdLong |
|  | skill | `shadow_clone` | dps_dummy | 3.9 | 29.8 | 0.13× | -50.8 | L1 · construct · cdLong |
|  | skill | `shadow_clone` | dps_dummy | 4.1 | 29.8 | 0.14× | -49.7 | L5 · construct · cdLong |
|  | skill | `shadow_clone` | dps_dummy | 4.5 | 29.8 | 0.15× | -47.7 | L10 · construct · cdLong |
|  | skill | `colonnade` | dps_dummy | 178.2 | 29.8 | 5.98× | 44.9 | L20 · construct · cdLong |
|  | skill | `hell_rift` | dps_dummy | 173.1 | 29.8 | 5.81× | 44.2 | L40 · construct · cdLong |
|  | skill | `colonnade` | dps_dummy | 139.9 | 29.8 | 4.7× | 38.8 | L10 · construct · cdLong |
|  | skill | `volcano` | dps_dummy | 130.1 | 29.8 | 4.37× | 37 | L40 · construct · cdLong |
|  | skill | `colonnade` | dps_dummy | 126.4 | 29.8 | 4.24× | 36.3 | L5 · construct · cdLong |
|  | skill | `colonnade` | dps_dummy | 119.6 | 29.8 | 4.02× | 34.9 | L1 · construct · cdLong |
|  | skill | `shadow_clone` | dps_dummy | 7.6 | 29.8 | 0.25× | -34.4 | L20 · construct · cdLong |
|  | support | `tethered_orbit` | output_multiplier | 0.1 | 1 | 0.1× | -32.7 | supports · effective hosts |
|  | skill | `summon_rubblekin` | dps_dummy | 338.5 | 28 | 12.08× | 31.3 | L40 · court · cd3 |
|  | skill | `hell_rift` | dps_dummy | 99.7 | 29.8 | 3.35× | 30.3 | L20 · construct · cdLong |
|  | skill | `volcano` | dps_dummy | 93.4 | 29.8 | 3.14× | 28.7 | L20 · construct · cdLong |
|  | skill | `tolling_bell` | dps_dummy | 84.2 | 29.8 | 2.83× | 26.1 | L40 · construct · cdLong |
|  | support | `gathered_casting` | output_multiplier | 0.2 | 1 | 0.18× | -24.4 | supports · effective hosts |
|  | skill | `volcano` | dps_dummy | 77.7 | 29.8 | 2.61× | 24.1 | L10 · construct · cdLong |
|  | skill | `shadow_clone` | dps_dummy | 11.6 | 29.8 | 0.39× | -23.7 | L40 · construct · cdLong |
|  | skill | `hell_rift` | dps_dummy | 76.2 | 29.8 | 2.56× | 23.6 | L10 · construct · cdLong |
|  | skill | `summon_rubblekin` | dps_dummy | 150.3 | 28 | 5.36× | 21.1 | L20 · court · cd3 |
|  | skill | `volcano` | dps_dummy | 67.2 | 29.8 | 2.26× | 20.4 | L5 · construct · cdLong |

<details><summary>Re-measure any of these</summary>

- colonnade: `npm run sim -- run --refs skill:colonnade:40 --seeds 10`
- shadow_clone: `npm run sim -- run --refs skill:shadow_clone:1 --seeds 10`
- shadow_clone: `npm run sim -- run --refs skill:shadow_clone:5 --seeds 10`
- shadow_clone: `npm run sim -- run --refs skill:shadow_clone:10 --seeds 10`
- colonnade: `npm run sim -- run --refs skill:colonnade:20 --seeds 10`
- hell_rift: `npm run sim -- run --refs skill:hell_rift:40 --seeds 10`
- colonnade: `npm run sim -- run --refs skill:colonnade:10 --seeds 10`
- volcano: `npm run sim -- run --refs skill:volcano:40 --seeds 10`
- colonnade: `npm run sim -- run --refs skill:colonnade:5 --seeds 10`
- colonnade: `npm run sim -- run --refs skill:colonnade:1 --seeds 10`
- shadow_clone: `npm run sim -- run --refs skill:shadow_clone:20 --seeds 10`
- summon_rubblekin: `npm run sim -- run --refs skill:summon_rubblekin:40 --seeds 10`
- hell_rift: `npm run sim -- run --refs skill:hell_rift:20 --seeds 10`
- volcano: `npm run sim -- run --refs skill:volcano:20 --seeds 10`
- tolling_bell: `npm run sim -- run --refs skill:tolling_bell:40 --seeds 10`
- volcano: `npm run sim -- run --refs skill:volcano:10 --seeds 10`
- shadow_clone: `npm run sim -- run --refs skill:shadow_clone:40 --seeds 10`
- hell_rift: `npm run sim -- run --refs skill:hell_rift:10 --seeds 10`
- summon_rubblekin: `npm run sim -- run --refs skill:summon_rubblekin:20 --seeds 10`
- volcano: `npm run sim -- run --refs skill:volcano:5 --seeds 10`

</details>

## Build search

**Legal builds crashed the engine.** These are engine bugs reachable in play, not balance findings, and each is one command to reproduce:

- 🆕 `TypeError: Cannot read properties of undefined (reading 'rupture') @ World.kill` (5 pairs): `npm run sim -- matrix explain poison_nova@plague_lineage withering_agony`
- 🆕 `TypeError: Cannot read properties of undefined (reading 'rupture') @ World.kill` (69 candidates). <details><summary>repro</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJyZXNvbmF0b3IiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJkb29tYnJhbmQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbIm1vbm9saXRoIiwic21vdGhlcmluZ19zcG9yZXMiXX0seyJpZCI6Im9ibGF0aW9uX29mX2ZsZXNoIiwicmFyaXR5IjoibWFnaWMiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJzZXJlbmVfcG93ZXIiLCJibG9vbWluZ19ncm91bmQiXX0seyJpZCI6ImJhbGxfbGlnaHRuaW5nIiwicmFyaXR5IjoibWFnaWMifSx7ImlkIjoic2FuZ3VpbmVfbGVlY2giLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImJvbmRicmVha2VyIiwic2xvd19tYXRjaCJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6MTY3MDM1NDY3MywidW5pcXVlcyI6eyJhbXVsZXQiOiJzdG9ybWNhbGwiLCJyaW5nMSI6Im1pc2Vyc19sb29wIn19 --seeds 3`</details>
- 🆕 `TypeError: Cannot read properties of undefined (reading 'holdDischarge') @ World.resolveHit` (1 candidate). <details><summary>repro</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJweXJvbWFuY2VyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6Imd1YXJkaWFuX2JvbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJndWFyZGVkX2Nhc3RpbmciLCJjdWxtaW5hdGlvbiIsImFsYWNyaXR5Iiwic3BlbGxfZWNobyJdfSx7ImlkIjoiYmFsbGlzdGFfc2VudHJ5IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZmlyaW5nX2xpbmUiLCJzdG9yZWRfdmVyZGljdCIsInB1bHNpbmdfcmFtcGFydHMiLCJibG9vZF9wcmljZSJdLCJsaW1iIjoxfSx7ImlkIjoiZXhwb3NlX3dlYWtuZXNzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiaGV4X2JsYXN0Il19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6NDUxMTc4OTMxLCJ1bmlxdWVzIjp7ImxlZ3MiOiJzcXVhbGxzdGVwIn19 --seeds 3`</details>
- 🆕 `TypeError: Cannot read properties of undefined (reading 'rupture') @ World.assaultDoomCull` (1 candidate). <details><summary>repro</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzZW50aW5lbCIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJwaGFudGFzbV9ib2x0IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsidW5zdGFibGVfZmxpZ2h0IiwiZGVlcF9yZXNlcnZlcyJdfSx7ImlkIjoiYmF0dGxlX3N0YW5kYXJkIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiYm9uZGJyZWFrZXIiLCJwcmVzc3VyZV9zZWFsIl0sImxpbWIiOjB9LHsiaWQiOiJ3b3JkX29mX2Rvb20iLCJyYXJpdHkiOiJtYWdpYyJ9XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjExMTU4ODUzNTYsInVuaXF1ZXMiOnsiYmVsdCI6InBhbGVfYmFyZ2FpbiJ9fQ --seeds 3`</details>

22,609 candidates tonight (4,838 refused by the real gates), 22,609 over 1 night(s). The archive holds 1256 elite rows; 1090 were re-measured on this commit and 8 no longer pass the gates. Tried so far in a legal build: 39 of 39 classes, 576 of 576 primarys, 604 of 604 skills, 440 of 455 supports, 41 of 41 uniques.

| band | objective | build (top factors) | value | × band median | repro |
|---|---|---|---:|---:|---|
| L5 | offense | `class:magician` `off:speed` `def:life` `gear:rare` `skill:rain_of_ash` | 1032.3 | 24.3× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6NSwic2tpbGxzIjpbeyJpZCI6InJhaW5fb2ZfYXNoIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJmaW5hbF9ibG9vbSIsInNwZWxsX2VjaG8iXX0seyJpZCI6ImdyYXNwaW5nX2NoYXNtIiwicmFyaXR5IjoibWFnaWMifV0sIm9mZiI6InNwZWVkIiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjU1MzA0MDkxNywidW5pcXVlcyI6eyJhbXVsZXQiOiJzdG9ybWNhbGwifX0 --seeds 8 --base-seed 4052476694`</details> |
| L5 | offense | `class:magician` `off:speed` `def:evasion` `gear:rare` `skill:healing_rain` | 551.9 | 13× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6NSwic2tpbGxzIjpbeyJpZCI6ImhlYWxpbmdfcmFpbiIsInJhcml0eSI6Im1hZ2ljIiwib3ZlciI6MSwic3VwcG9ydHMiOlsibWVhc3VyZWRfYmxhZGUiLCJzZXJlbmVfcG93ZXIiXX0seyJpZCI6ImdyYXNwaW5nX2NoYXNtIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJzcGVsbF9lY2hvIl19LHsiaWQiOiJzdG9ybWJyYW5kX2JlYWNvbiIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsidW5ibGlua2luZyJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjEzNDk5ODg1MjgsInVuaXF1ZXMiOnsiY2hlc3QiOiJhZWdpc19vZl90aGVfZHJvd25lZCIsInJpbmcxIjoiZW1iZXJicmFuZCJ9fQ --seeds 8 --base-seed 4052476694`</details> |
| L5 | offense | `class:cryomancer` `off:speed` `def:evasion` `gear:rare` `skill:undertow` | 534.6 | 12.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjcnlvbWFuY2VyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoidW5kZXJ0b3ciLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImZldmVyZWRfaGFuZHMiLCJlcnVwdGlvbl9jeWNsZSJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjE2MTY5OTU2MzMsInVuaXF1ZXMiOnsiYW11bGV0Ijoic3Rvcm1jYWxsIiwiYm9vdHMiOiJmbGVldGZlYXRoZXIifX0 --seeds 8 --base-seed 3284098936`</details> |
| L5 | clear | `class:cryomancer` `off:speed` `def:evasion` `gear:rare` `skill:undertow` | 4 | 8.9× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjcnlvbWFuY2VyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoidW5kZXJ0b3ciLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImZldmVyZWRfaGFuZHMiLCJlcnVwdGlvbl9jeWNsZSJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjE2MTY5OTU2MzMsInVuaXF1ZXMiOnsiYW11bGV0Ijoic3Rvcm1jYWxsIiwiYm9vdHMiOiJmbGVldGZlYXRoZXIifX0 --seeds 8 --base-seed 3284098936`</details> |
| L5 | clear | `class:cryomancer` `off:speed` `def:evasion` `gear:rare` `skill:undertow` | 3.5 | 7.7× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjcnlvbWFuY2VyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoidW5kZXJ0b3ciLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbIm92ZXJtYXRjaCIsInNpZWdlYnJlYWtlciJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjE4OTU2MDI0Nn0 --seeds 8 --base-seed 3284098936`</details> |
| L5 | clear | `class:cryomancer` `off:speed` `def:evasion` `gear:rare` `skill:undertow` | 3.4 | 7.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjcnlvbWFuY2VyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoidW5kZXJ0b3ciLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbIm92ZXJncm93dGgiLCJvdmVybWF0Y2giXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjoxODk1NjAyNDYsInVuaXF1ZXMiOnsiYW11bGV0Ijoic3Rvcm1jYWxsIn19 --seeds 8 --base-seed 3284098936`</details> |
| L10 | offense | `class:hivecaller` `off:crit` `def:evasion` `gear:rare` `skill:whirlaxe` | 1867.3 | 38.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJoaXZlY2FsbGVyIiwibHZsIjoxMCwic2tpbGxzIjpbeyJpZCI6IndoaXJsYXhlIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbImNhc3Rfb25faGlnaF9yb2xsIl19LHsiaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiY29uY3Vzc2l2ZV9ibG93cyIsInN1bmRlcmluZ19mbGlnaHQiLCJwbHVzX2NvbGQiLCJwb2x5cGhvbnkiXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjE2ODEyMzIzNTd9 --seeds 8 --base-seed 2958968242`</details> |
| L10 | offense | `class:warlord` `off:speed` `def:none` `gear:rare` `skill:mirespume` | 881 | 18.2× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJ3YXJsb3JkIiwibHZsIjoxMCwic2tpbGxzIjpbeyJpZCI6Im1pcmVzcHVtZSIsInJhcml0eSI6InJhcmUiLCJzdXBwb3J0cyI6WyJwYXJ0aW5nX2dpZnQiLCJkZXNwZXJhdGVfbWVhc3VyZXMiLCJleHBvc3VyZSJdfSx7ImlkIjoibnVsbF9sYW5jZSIsInJhcml0eSI6InJhcmUiLCJzdXBwb3J0cyI6WyJndWFyZGVkX2Nhc3RpbmciXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjoxNzkxNTk5Mjg3LCJ1bmlxdWVzIjp7ImNoZXN0IjoidGhlX3VubW92ZWQifX0 --seeds 8 --base-seed 3522349470`</details> |
| L10 | offense | `class:necromancer` `off:damage` `def:evasion` `gear:rare` `skill:ice_shards` | 818.9 | 16.9× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJuZWNyb21hbmNlciIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoicmFyZSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNlZWtlciIsImdyYWNlX29mX2Rhd24iLCJzdW1tb25fcGhhbnRhc20iXX0seyJpZCI6Indhcl9ob3JuIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsiZ3VhcmRlZF9jYXN0aW5nIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjkzNjUyNDk0M30 --seeds 8 --base-seed 979641264`</details> |
| L10 | clear | `class:spellblade` `off:speed` `def:evasion` `gear:rare` `skill:iron_ward` | 5.3 | 21.1× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzcGVsbGJsYWRlIiwibHZsIjoxMCwic2tpbGxzIjpbeyJpZCI6Imlyb25fd2FyZCIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJjcmVzY2VuZG8iXX0seyJpZCI6InRyYW5zZnVzaW9uIiwicmFyaXR5IjoicmFyZSJ9LHsiaWQiOiJkb29tX2JlbGwiLCJyYXJpdHkiOiJsZWdlbmRhcnkifV0sIm9mZiI6InNwZWVkIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjQ4NjUyMDEwMywidW5pcXVlcyI6eyJiZWx0IjoicGFsZV9iYXJnYWluIiwiYm9vdHMiOiJjaW5kZXJzdGVwIn19 --seeds 8 --base-seed 1868249999`</details> |
| L10 | clear | `class:warlord` `off:speed` `def:ward` `gear:rare` `skill:undertow` | 3.8 | 15× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJ3YXJsb3JkIiwibHZsIjoxMCwic2tpbGxzIjpbeyJpZCI6InVuZGVydG93IiwicmFyaXR5IjoicmFyZSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInRhdXRfd2lyZSIsIm1vdW50aW5nX2ZyZW56eSIsInByZXNzdXJlX3NlYWwiXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6IndhcmQiLCJnZWFyIjoicmFyZSIsImdzIjoxNTkzNTAwOTY0LCJ1bmlxdWVzIjp7InJpbmcxIjoic2hhcmVkX2N1cCJ9fQ --seeds 8 --base-seed 3522349470`</details> |
| L10 | clear | `class:hivecaller` `off:speed` `def:ward` `gear:rare` `skill:undertow` | 3.5 | 14× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJoaXZlY2FsbGVyIiwibHZsIjoxMCwic2tpbGxzIjpbeyJpZCI6InVuZGVydG93IiwicmFyaXR5IjoicmFyZSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInRhdXRfd2lyZSIsIm1vdW50aW5nX2ZyZW56eSIsInByZXNzdXJlX3NlYWwiXX0seyJpZCI6ImFzaGVuX3ZvdyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbIm1lYXN1cmVkX2JsYWRlIiwiZnJhZ21lbnRhdGlvbiIsImxpbmdlcmluZyJdLCJsaW1iIjowfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjE1OTM1MDA5NjQsInVuaXF1ZXMiOnsicmluZzEiOiJzaGFyZWRfY3VwIn19 --seeds 8 --base-seed 2958968242`</details> |

Main effects at L5 over 2022 rows: strongest `skill:grasping_chasm` 5.52×, `skill:arcane_missiles` 3.29×, `primary:undertow` 3.03×, `skill:shambler_horde` 2.83×, `skill:inferno` 2.82×; weakest `primary:judgement` 0.34×, `support:metronome` 0.43×, `support:patient_brood` 0.45×, `limb:tuning_strike#0` 0.46×, `skill:flame_blast` 0.48×.

Main effects at L10 over 2733 rows: strongest `skill:bonespray` 4.62×, `skill:imperious_barrage` 4.37×, `skill:avalanche` 3.9×, `skill:grasping_chasm` 3.55×, `skill:ice_shards` 3.06×; weakest `primary:expose_weakness` 0.34×, `skill:choir_of_light` 0.38×, `skill:root_grasp` 0.42×, `skill:shield_charge` 0.44×, `skill:verdict_release` 0.48×.

Main effects at L20 over 5630 rows: strongest `support:echoing_might` 8.32×, `skill:infernal_ray` 5.3×, `skill:mirespume` 5×, `skill:ice_shards` 4.98×, `skill:focusing_ray` 4.89×; weakest `skill:vampiric_embrace` 0.29×, `skill:gather_cinderkin` 0.32×, `primary:holy_relic` 0.37×, `support:multistrike` 0.38×, `primary:boil_over` 0.38×.

Main effects at L40 over 6305 rows: strongest `support:echoing_might` 9×, `primary:infernal_bombardment` 8.14×, `skill:infernal_bombardment` 8.12×, `skill:grasping_chasm` 5.65×, `skill:event_horizon` 5.54×; weakest `skill:expose_weakness` 0.19×, `skill:choir_of_light` 0.33×, `primary:epidemic` 0.33×, `limb:dash#1` 0.34×, `support:fresh_ranks` 0.35×.

**Combinations far off the sum of their parts**, confirmed on fresh dice (13 tried):

- `class:beguiler + primary:mantra_strike + support:loose_thread + support:echoing_might`: measured 1206774576477151.5, its parts predict 4160.9. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZWd1aWxlciIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJtYW50cmFfc3RyaWtlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsibG9vc2VfdGhyZWFkIiwiZWNob2luZ19taWdodCIsInN0ZWFkeV9uZXJ2ZSIsImRlc3BlcmF0aW9uIl0sImxpbWIiOjF9LHsiaWQiOiJpbmZlcm5hbF9yaWZ0IiwicmFyaXR5IjoibGVnZW5kYXJ5In1dLCJvZmYiOiJjcml0IiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjU3MTM5NjI4Mn0:spar --seeds 30 --base-seed 4017360034`</details>
- `class:berserker + primary:magma_ward + support:dominion_tithe + support:regicide`: measured 252547137695.5, its parts predict 7785.5. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjIwLCJza2lsbHMiOlt7ImlkIjoibWFnbWFfd2FyZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImRvbWluaW9uX3RpdGhlIiwicmVnaWNpZGUiLCJlbWJhcmdvIl19LHsiaWQiOiJmcmVuenkiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJlY2hvaW5nX21pZ2h0Il19XSwib2ZmIjoiY3JpdCIsImRlZiI6ImxpZmUiLCJnZWFyIjoicmFyZSIsImdzIjoxNjMzODYxNjU1LCJ1bmlxdWVzIjp7ImFtdWxldCI6ImJvcnJvd2VkX2JyZWF0aCJ9fQ:spar --seeds 30 --base-seed 4017360034`</details>
- `class:ascetic + primary:reap + support:reapers_encore + support:echoing_might`: measured 309282465.7, its parts predict 6508.8. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJhc2NldGljIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6InJlYXAiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJyZWFwZXJzX2VuY29yZSIsImVjaG9pbmdfbWlnaHQiLCJzY2F0dGVyZWRfY2FzY2FkZSIsImZsZWV0Zm9vdCJdLCJsaW1iIjoxfSx7ImlkIjoiY2hhbGxlbmdpbmdfc2hvdXQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJ1bmxlYXNoIiwiY2FzdF93aGlsZV9jaGFubmVsaW5nIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjk4MTM0OTgsInVuaXF1ZXMiOnsiZ2xvdmVzIjoiZ2FsZXdyaWdodHMifX0:spar --seeds 30 --base-seed 4017360034`</details>
- `class:wallwright + primary:scattergun + support:swift_hands + support:echoing_might`: measured 1350617.3, its parts predict 3732.7. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJ3YWxsd3JpZ2h0IiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6InNjYXR0ZXJndW4iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzd2lmdF9oYW5kcyIsImVjaG9pbmdfbWlnaHQiLCJzbG93X2JyZXciLCJicnV0YWxpdHkiXX0seyJpZCI6Imh1bmRyZWRfcGFydGluZ3MiLCJyYXJpdHkiOiJsZWdlbmRhcnkifV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6MTgxNjI0NjkwMSwidW5pcXVlcyI6eyJsZWdzIjoic3F1YWxsc3RlcCJ9fQ:spar --seeds 30 --base-seed 4017360034`</details>
- `class:ascetic + primary:reap + support:cast_on_crit + support:echoing_might`: measured 39.3, its parts predict 4594.4. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJhc2NldGljIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6InJlYXAiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJjYXN0X29uX2NyaXQiLCJlY2hvaW5nX21pZ2h0Iiwic2NhdHRlcmVkX2Nhc2NhZGUiLCJjYXNjYWRlIl0sImxpbWIiOjF9LHsiaWQiOiJjaGFsbGVuZ2luZ19zaG91dCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInRpbWVfZnVzZSJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImxpZmUiLCJnZWFyIjoicmFyZSIsImdzIjo5ODEzNDk4fQ:spar --seeds 30 --base-seed 4017360034`</details>
- `class:breaker + primary:scattergun + support:swift_hands + support:echoing_might`: measured 162798.2, its parts predict 2793.7. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJicmVha2VyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6InNjYXR0ZXJndW4iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzd2lmdF9oYW5kcyIsImVjaG9pbmdfbWlnaHQiLCJzbG93X2JyZXciXX0seyJpZCI6Imh1bmRyZWRfcGFydGluZ3MiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJibGVlZF9jaGFuY2UiXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjE2MjQ1NTQ1MH0:spar --seeds 30 --base-seed 4017360034`</details>
- `class:warlord + primary:summon_sporeling + support:overmatch + support:slipstream`: measured 0.7, its parts predict 25.1. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJ3YXJsb3JkIiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6InN1bW1vbl9zcG9yZWxpbmciLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJvdmVybWF0Y2giLCJzbGlwc3RyZWFtIiwiZGVsaWJlcmF0ZV9ydWluIiwiZ3VhcmRlZF9jYXN0aW5nIl19LHsiaWQiOiJlYXJ0aHJlbmRlciIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInB1bHNhdGluZ19taXNzaWxlcyJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjIwNTg4MjA3NTUsInVuaXF1ZXMiOnsiYm9vdHMiOiJmbGVldGZlYXRoZXIiLCJnbG92ZXMiOiJ1bnNwZW50X3JlcGx5In19:spar --seeds 30 --base-seed 4017360034`</details>
- `class:blademaster + primary:summon_skeleton_mage + support:taut_wire + support:umbral_focus`: measured 9.9, its parts predict 300.2. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJibGFkZW1hc3RlciIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJzdW1tb25fc2tlbGV0b25fbWFnZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInRhdXRfd2lyZSIsInVtYnJhbF9mb2N1cyIsInNsb3dfYnJldyIsImd1YXJkZWRfY2FzdGluZyJdLCJsaW1iIjoxfSx7ImlkIjoic3VtbW9uX3BsYWd1ZWZhdGhlciIsInJhcml0eSI6ImxlZ2VuZGFyeSJ9XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjIzODY2NzU3MH0:spar --seeds 30 --base-seed 4017360034`</details>

## Tuning reads

Standing tables to tune from. Advisory.

**What +10 of each attribute is worth**, median across the roster at L20 geared (output share on the sparring lane, life-floor points in the pack):

| attribute | output | life floor | classes where it did nothing |
|---|---:|---:|---:|
| strength | +4% | 0 | 12 of 39 |
| finesse | +3% | 0 | 1 of 39 |
| intelligence | +2% | 0 | 0 of 39 |
| wisdom | +1% | 0 | 0 of 39 |
| prowess | 0% | 0 | 1 of 39 |
| fortitude | 0% | 0 | 18 of 39 |
| dexterity | 0% | 0 | 2 of 39 |
| charisma | 0% | 0 | 2 of 39 |
| willpower | 0% | 0 | 0 of 39 |
| vitality | 0% | 0 | 32 of 39 |

**Support power**, median output change across the hosts each gem works on. Strongest: `sundering_flight` +193%, `scorched_wake` +139%, `mounting_frenzy` +134%, `volley` +93%, `elemental_conduction` +87%, `cascade_of_knives` +72%, `fulminate` +72%, `piercing` +72%. Weakest: `guarded_casting` -100%, `embargo` -100%, `vortex` -100%, `tethered_orbit` -90%, `gathered_casting` -82%, `unstable_flight` -48%, `septic_bargain` -41%, `pyre_legion` -36%.

**Affix families** (211 measured on one magic piece against the same wardrobe without it, 11 never worn on the doll). Most output: `apply_poison` 1.95× on magician, `apply_poison` 1.75× on warrior, `apply_bleed` 1.62× on magician, `apply_bleed` 1.61× on warrior, `hadal_cold` 1.5× on magician, `hadal_cold` 1.44× on warrior, `creeper_barrow` 1.27× on warrior, `satellite_rime_wake` 1.22× on warrior. Most survival: `proc_adrenaline` +3.8 on warrior, `recent_kill_speed` +3.8 on warrior, `endurance_flat` +2.1 on warrior, `armor_pen` +1.5 on warrior, `proc_cave_in` +1.5 on warrior, `proj_speed` +1.5 on warrior. Moved nothing on these rigs: 11 families.

**Standing config numbers that move the headline rigs** (elasticity: % change in the metric per % change in the number). `hero_mana_per_level` → mana_floor_pct 0.73, `hero_mana_per_level` → mana_floor_pct 0.23, `hero_mana_per_level` → mana_floor_pct 0.21, `DEFENSE_CFG.weight.refRadius` → dps_out 0.13, `DEFENSE_CFG.armor.k` → dps_out 0.05, `DEFENSE_CFG.poise.drainRatio` → dps_out 0.05, `DEFENSE_CFG.weight.refRadius` → mana_floor_pct 0.05, `DEFENSE_CFG.weight.perPoise` → mana_floor_pct 0.02. 59 numbers moved nothing here.

**Provisional bands against the roster.** 20 of 96 band and tier rows have most of the roster outside the band. The measured spread is evidence for your sign-off, and no band changes on its own.

| metric | lane | tier | band | roster outside | measured p10 | median | p90 |
|---|---|---|---|---:|---:|---:|---:|
| player_deaths | parity | starter | L40 | 38 of 39 | 0.2 | 1 | 1 |
| player_deaths | parity | starter | L30 | 37 of 39 | 0.2 | 1 | 1 |
| player_deaths | parity | starter | L20 | 36 of 39 | 0.2 | 1 | 1 |
| ttk_wave_mean | parity | starter | L40 | 12 of 13 | 15.2 | 22 | 35.9 |
| player_deaths | parity | starter | L10 | 32 of 39 | 0 | 0.6 | 1 |
| ttk_wave_mean | parity | starter | L10 | 16 of 21 | 12.1 | 19.3 | 40.3 |
| ttk_wave_mean | parity | starter | L20 | 11 of 15 | 10.7 | 17.7 | 35.2 |
| ttk_wave_mean | parity | kitted | L10 | 27 of 37 | 9.4 | 24.6 | 47.3 |
| ttk_wave_mean | parity | kitted | L5 | 23 of 32 | 10.4 | 24.9 | 40.7 |
| player_deaths | parity | starter | L5 | 28 of 39 | 0 | 0.2 | 1 |
| ttk_wave_mean | parity | kitted | L40 | 27 of 38 | 6.4 | 22.4 | 45.6 |
| ttk_wave_mean | parity | kitted | L20 | 26 of 38 | 8.1 | 25.5 | 48.5 |

## The instrument

Class expression at the top band: 38 read on the dummy, 1 need the sparring partner, 0 read only in the pack lanes, 0 mute.
Bestiary: 10729 rows measured, 100 bodies not fielded (passive or immortal fixtures). 202 bodies never swung at a hero standing idle within reach; those are sentries, spawners and scenery until shown otherwise, and their threat reads as unmeasured.
Suites: 91 scenarios, 14 of 104 graded metrics outside their provisional band, 12 warned.
Matrix: 127,530 of 127,534 eligible pairs probed (100%), deep lane on 28732 pairs. Verdicts: effective 78804, blind 30423, cost_only 1269, inert 14460, negligible 2574.
Against the committed ledger (8481 rows): 12978 not on file, 2206 measuring healthy. The ledger only changes through `matrix check --reconcile`.

## What ran, and what did not

| lane | units planned | ok | gate breach | crashed/killed | not run | episodes | core-hours |
|---|---:|---:|---:|---:|---:|---:|---:|
| baselines | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| audits | 4 | 4 | 0 | 0 | 0 | 0 | 0 |
| expression | 1 | 1 | 0 | 0 | 0 | 1,208 | 0.1 |
| census | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| suites | 2 | 2 | 0 | 0 | 0 | 910 | 0.3 |
| progression | 39 | 39 | 0 | 0 | 0 | 12,480 | 3.7 |
| skills | 10 | 10 | 0 | 0 | 0 | 8,790 | 1 |
| skills_vs | 30 | 30 | 0 | 0 | 0 | 22,784 | 4.4 |
| matchups | 35 | 35 | 0 | 0 | 0 | 13,734 | 5.8 |
| bestiary | 35 | 26 | 0 | 9 | 0 | 21,458 | 45.7 |
| attributes | 39 | 39 | 0 | 0 | 0 | 4,914 | 1 |
| affixes | 16 | 16 | 0 | 0 | 0 | 3,404 | 1.3 |
| globals | 4 | 4 | 0 | 0 | 0 | 1,704 | 0.3 |
| matrix | 128 | 128 | 0 | 0 | 0 | 235,838 | 53.2 |
| matrix_deep | 71 | 71 | 0 | 0 | 0 | 129,092 | 23 |
| search | 40 | 24 | 0 | 3 | 13 | 100,002 | 25.5 |

**Did not run:** `bestiary_7of35`, `bestiary_9of35`, `bestiary_10of35`, `bestiary_11of35`, `bestiary_13of35`, `bestiary_14of35`, `bestiary_5of35`, `bestiary_15of35`, `bestiary_6of35`, `search_1of40`, `search_4of40`, `search_12of40`, `search_15of40`, `search_20of40`, `search_24of40`, `search_31of40`, `search_32of40`, `search_33of40`, `search_34of40`, `search_35of40`, `search_36of40`, `search_37of40`, `search_38of40`, `search_39of40`, `search_40of40`. Their numbers below are absent, not zero.

Not simulated at all, by design: zone generation and XP pacing, event pressure, multiplayer, and real player skill. Pilots are simple policies, so kit ceilings are floors. Bands stay provisional until you sign them off.
