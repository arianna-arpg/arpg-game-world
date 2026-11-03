# Balance farm results

Data branch: machine-written by `.github/workflows/balance-farm.yml`. Do not edit by hand.

- `latest/` the newest night: `summary.json`, `digest.md`
- `nights/<date>/` one small record per night
- `trend.jsonl` one line per night
- `state/` what the next night builds on: the search archive, measured lane costs, row snapshot

Page: https://arianna-arpg.github.io/arpg-game-world/balance/

---

# Balance farm, night of 2026-11-03

Commit [fe2dadfd6a](https://github.com/arianna-arpg/arpg-game-world/commit/fe2dadfd6a1e517055b442b32fd5dddc031c0dbc), profile `full`. 712,853 episodes, 159.6 core-hours, 313 minutes end to end. [Run](https://github.com/arianna-arpg/arpg-game-world/actions/runs/41632345920).

## ✅ No regressions

Every committed baseline holds, nothing crashed, and the matrix has no new defects since last night.

## What moved since last night

200 row(s) moved past their own noise and 10%. Largest first:

| row | before | after | change |
|---|---:|---:|---:|
| `monster:wraith_piper:warrior:L5:ttk` | 5.91 | 17.56 | +197% |
| `monster:karst_slinger:warrior:L5:ttk` | 6.99 | 20.31 | +191% |
| `monster:grove_singer:warrior:L25:ttk` | 9.48 | 23.37 | +147% |
| `monster:wraith_piper:warrior:L25:ttk` | 6.95 | 17.11 | +146% |
| `monster:grove_singer:warrior:L5:ttk` | 10.07 | 23.7 | +135% |
| `match:geared_sharper_l10:tide_whelk:L10` | 32.16 | 75.6 | +135% |
| `monster:hollow_butler:warrior:L25:ttk` | 10.46 | 24.32 | +133% |
| `monster:rootwild_thornfan:warrior:L5:ttk` | 6.62 | 15.25 | +130% |
| `monster:hollow_butler:warrior:L12:ttk` | 10.2 | 23.29 | +128% |
| `monster:cindermaw_toolthief:magician:L25:threat` | 22.37 | 50.12 | +124% |
| `monster:goetic_binder:magician:L5:ttk` | 10.63 | 23.47 | +121% |
| `match:kitted_breaker_l20:tide_whelk:L20` | 54.41 | 117.16 | +115% |
| `monster:grove_singer:warrior:L12:ttk` | 9.1 | 19.36 | +113% |
| `monster:rootwild_thornfan:warrior:L25:ttk` | 7.15 | 14.98 | +110% |
| `skillvs:gore_rend:tide_whelk:L20` | 34.66 | 0 | −100% |
| `skillvs:spore_bloom:tide_whelk:L20` | 31.95 | 0 | −100% |
| `skillvs:summon_bone_golem:tide_whelk:L20` | 33.92 | 0 | −100% |
| `skillvs:sunpiercer:tide_whelk:L20` | 32.17 | 0 | −100% |
| `skillvs:perfect_strike:tide_whelk:L20` | 0 | 31.55 | +100% |
| `skillvs:upheaval:tide_whelk:L20` | 0 | 34.85 | +100% |
| `skillvs:cast_falcon:tide_whelk:L20` | 31.5 | 0 | −100% |
| `skillvs:summon_cleric:tide_whelk:L20` | 34.56 | 0 | −100% |
| `skillvs:lay_chitin_clutch:tide_whelk:L20` | 31.89 | 0 | −100% |
| `skillvs:hell_rift:tide_whelk:L20` | 47.66 | 0 | −100% |
| `skillvs:sanguine_burst:tide_whelk:L20` | 0 | 52.61 | +100% |

## Top proposed numbers

Advisory. Nothing here has been applied, and each needs your sign-off. Each row re-measured the subject on dice the night had not seen, solved for a number through the real game, and verified it at common seeds. 37 outlier(s) did not hold up on fresh dice, or landed within 15% of their target, and were dropped.

| # | subject | change | metric: before → after | cohort target | verdict | guards |
|---:|---|---|---|---:|---|---|
| 1 | class `trapper` | `skills.caltrops.baseDamage.physical.0`: 3 → 7.5 (+1 lines, ×2.5) | kill_rate: 0 → 0.1 | 0.1 | moved | none moved |
| 2 | skill `shambler_horde` | `monsters.grave_shambler.explodeOnDeath`: 2.2 → 0.88 | dps_dummy: 19394.7 → 7757.9 | 680.5 | moved, closes 62% | none moved |
| 3 | skill `arclight_rain` | `skills.arclight_rain.baseDamage.physical.0`: 5 → 2 (+3 lines, ×0.4) | dps_dummy: 348 → 139.2 | 93.2 | moved, closes 82% | none moved |
| 4 | skill `marshlight` | `skills.marshlight.baseDamage.chaos.0`: 9 → 3.6 (+1 lines, ×0.4) | dps_dummy: 270.2 → 108.1 | 98.9 | moved | none moved |
| 5 | skill `mirespume` | `skills.mirespume.baseDamage.chaos.0`: 11 → 4.5 (+1 lines, ×0.41) | dps_dummy: 243.4 → 99.8 | 98.9 | moved | none moved |
| 6 | skill `infernal_bombardment` | `monsters.bombard_demon.explodeOnDeath`: 1.6 → 0.67 | dps_dummy: 15895.4 → 6694.5 | 6676.7 | moved | none moved |
| 7 | support `fire_walker` | `supports.fire_walker.mods.0.value`: 0.5 → 0.2 (+1 lines, ×0.4) | dps_dummy: 60.9 → 31.1 | 18.4 | moved, closes 70% | none moved |
| 8 | skill `glare_ice` | `skills.glare_ice.baseDamage.cold.0`: 4 → 10 (+1 lines, ×2.5) | dps_dummy: 1.3 → 3.3 | 4 | moved, closes 74% | none moved |
| 9 | skill `scattergun` | `skills.scattergun.baseDamage.physical.0`: 4 → 10 (+1 lines, ×2.5) | dps_dummy: 7.4 → 18.5 | 23.6 | moved, closes 69% | none moved |
| 10 | skill `trailblaze` | `skills.trailblaze.baseDamage.fire.0`: 6 → 2.8 (+1 lines, ×0.47) | dps_dummy: 65.3 → 31.8 | 31.1 | moved | none moved |
| 11 | skill `earthrender` | `skills.earthrender.baseDamage.physical.0`: 12 → 6 (+1 lines, ×0.5) | dps_dummy: 186.2 → 93.1 | 93.2 | moved | none moved |
| 12 | support `sundering_flight` | `supports.sundering_flight.fissureTrail.damageScale`: 0.4 → 0.16 | dps_dummy: 49.9 → 30.4 | 19.2 | moved, closes 64% | none moved |
| 13 | support `volley` | `supports.volley.mods[stat=damage].value`: -0.25 → -0.63 | dps_dummy: 92.4 → 46.2 | 54.1 | moved | none moved |
| 14 | monster_threat `seatless_usher` | `skills.ushers_lull.baseDamage.chaos.0`: 4 → 10 (+1 lines, ×2.5) | dps_in: 0 → 7.7 | 7.5 | moved | none moved |
| 15 | monster_threat `lidless_watcher` | `skills.gaze_beam.baseDamage.chaos.0`: 4 → 9.2 (+1 lines, ×2.3) | dps_in: 0.4 → 7.4 | 7.5 | moved | none moved |

<details><summary>Repro commands</summary>

1. `npm run sim -- whatif --knob 'skills.caltrops.baseDamage*2.5' --scenarios pressure:trapper:30 --seeds 30 --base-seed 3558072571`. Same change at other bands: `pressure:trapper:5` 0.5→0.7, `pressure:trapper:10` 0.2→0.6, `pressure:trapper:20` 0→0.3, `pressure:trapper:40` 0→0
2. `npm run sim -- whatif --knob 'monsters.grave_shambler.explodeOnDeath*0.4' --scenarios skill:shambler_horde:40 --seeds 30 --base-seed 3558072571`. Other dials on this metric (elasticity): cooldown -0.71, useTime -0.36. Same change at other bands: `skill:shambler_horde:5` 257.8→103.1, `skill:shambler_horde:10` 768.4→307.4, `skill:shambler_horde:20` 3055.9→1222.4
3. `npm run sim -- whatif --knob 'skills.arclight_rain.baseDamage*0.4' --scenarios skill:arclight_rain:40 --seeds 30 --base-seed 3558072571`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.19, useTime 0.17. Same change at other bands: `skill:arclight_rain:5` 152.8→61.1, `skill:arclight_rain:10` 185.4→74.2, `skill:arclight_rain:20` 234.2→93.7
4. `npm run sim -- whatif --knob 'skills.marshlight.baseDamage*0.4' --scenarios skill:marshlight:10 --seeds 30 --base-seed 3558072571`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.68, manaCost -0.03. Same change at other bands: `skill:marshlight:5` 233.9→93.6, `skill:marshlight:20` 320.4→128.2, `skill:marshlight:40` 455.7→182.3
5. `npm run sim -- whatif --knob 'skills.mirespume.baseDamage*0.41' --scenarios skill:mirespume:10 --seeds 30 --base-seed 3558072571`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.62. Same change at other bands: `skill:mirespume:5` 210.1→86, `skill:mirespume:20` 287.4→117.8, `skill:mirespume:40` 395.7→162.2
6. `npm run sim -- whatif --knob 'monsters.bombard_demon.explodeOnDeath*0.42' --scenarios skill:infernal_bombardment:40 --seeds 30 --base-seed 3558072571`. Other dials on this metric (elasticity): cooldown -0.84. Same change at other bands: `skill:infernal_bombardment:5` 238.4→102.2, `skill:infernal_bombardment:10` 683.4→291, `skill:infernal_bombardment:20` 2616→1107.1
7. `npm run sim -- whatif --knob 'supports.fire_walker.mods*0.4' --scenarios socketed:phoenix_dive:fire_walker:20 --seeds 30 --base-seed 3558072571`
8. `npm run sim -- whatif --knob 'skills.glare_ice.baseDamage*2.5' --scenarios skill:glare_ice:40 --seeds 30 --base-seed 3558072571`. Other dials on this metric (elasticity): cooldown -1.32, baseDamage 1. Same change at other bands: `skill:glare_ice:5` 0.8→2, `skill:glare_ice:10` 0.9→2.2, `skill:glare_ice:20` 1→2.6
9. `npm run sim -- whatif --knob 'skills.scattergun.baseDamage*2.5' --scenarios skill:scattergun:10 --seeds 30 --base-seed 3558072571`. Other dials on this metric (elasticity): baseDamage 1. Same change at other bands: `skill:scattergun:5` 6.7→16.8, `skill:scattergun:20` 8.9→22.2, `skill:scattergun:40` 11.9→29.7
10. `npm run sim -- whatif --knob 'skills.trailblaze.baseDamage*0.47' --scenarios skill:trailblaze:20 --seeds 30 --base-seed 3558072571`. Other dials on this metric (elasticity): baseDamage 1.01, cooldown -0.76. Same change at other bands: `skill:trailblaze:5` 50.3→25, `skill:trailblaze:10` 56.3→27.6, `skill:trailblaze:40` 86.3→41
11. `npm run sim -- whatif --knob 'skills.earthrender.baseDamage*0.5' --scenarios skill:earthrender:40 --seeds 30 --base-seed 3558072571`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.76, useTime -0.28. Same change at other bands: `skill:earthrender:5` 108.3→54.2, `skill:earthrender:10` 121.3→60.6, `skill:earthrender:20` 140.7→70.4
12. `npm run sim -- whatif --knob 'supports.sundering_flight.fissureTrail.damageScale*0.4' --scenarios socketed:ball_lightning:sundering_flight:20 --seeds 30 --base-seed 3558072571`
13. `npm run sim -- whatif --knob 'supports.volley.mods[stat=damage].value*2.5' --scenarios socketed:soulflay:volley:20 --seeds 30 --base-seed 3558072571`
14. `npm run sim -- whatif --knob 'skills.ushers_lull.baseDamage*2.5' --scenarios threat:starter_magician_l25:seatless_usher:25 --seeds 30 --base-seed 3558072571`. Other dials on this metric (elasticity): kit.ushers_lull 102.92. Same change at other bands: `threat:starter_magician_l5:seatless_usher:5` 2.1→5.2, `threat:starter_magician_l10:seatless_usher:10` 0.9→5.3, `threat:starter_magician_l20:seatless_usher:20` 0.9→7.8, `threat:starter_magician_l40:seatless_usher:40` 0.3→12.4
15. `npm run sim -- whatif --knob 'skills.gaze_beam.baseDamage*2.3' --scenarios threat:starter_magician_l25:lidless_watcher:25 --seeds 30 --base-seed 3558072571`. Other dials on this metric (elasticity): kit.gaze_beam 6.52. Same change at other bands: `threat:starter_magician_l5:lidless_watcher:5` 2→4.7, `threat:starter_magician_l10:lidless_watcher:10` 1.1→4.9, `threat:starter_magician_l20:lidless_watcher:20` 1.3→7.2, `threat:starter_magician_l40:lidless_watcher:40` 1.1→11.6

Run from commit `fe2dadfd6a1e517055b442b32fd5dddc031c0dbc`.
</details>

Too noisy to call: class `firebrand`, class `beguiler`, class `assassin`, class `hivecaller`, affix `apply_poison`, class `sharper`, monster_threat `strangler_maw`. The solved number moved each by less than its own seed-to-seed spread, so these need a calmer rig or more seeds before they mean anything.

### Combinations that run away

Confirmed on fresh dice at 20 times or more what their parts predict. A number this far out usually means damage feeding itself, so no single number fixes it: each needs a call on whether the feedback should be bounded.

- `class:brawler + unique:cinderstep + unique:stormcall + support:cascade`: measured 7.4e+10 damage per second, its parts predict 4737.8. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJicmF3bGVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImV2aXNjZXJhdGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJncmFzcGluZ190ZW5kcmlscyIsImdpYW50c2JhbmUiLCJhenVyZV9oYXJ2ZXN0Iiwic2VyZW5lX3Bvd2VyIl0sImxpbWIiOjB9LHsiaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYWxhY3JpdHkiLCJwb2x5cGhvbnkiLCJhdXN0ZXJpdHkiLCJhcG90aGVvc2lzIl19LHsiaWQiOiJzaGF0dGVyY2hvcmQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInJlc291bmRpbmdfZWNobyIsImNhc2NhZGUiXSwibGltYiI6MX0seyJpZCI6InN0ZWFsdGgiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJibG9vZF9wcmljZSIsImRlZXBfcmVzZXJ2ZXMiLCJhbGFjcml0eSJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjo5MjI2OTg3MDMsInVuaXF1ZXMiOnsiYW11bGV0Ijoic3Rvcm1jYWxsIiwiYm9vdHMiOiJjaW5kZXJzdGVwIn19:spar --seeds 30 --base-seed 3558072571`</details>
- `class:blademaster + support:summon_phantasm + support:crescendo + unique:winter_after_you`: measured 9096507.9 damage per second, its parts predict 712.6. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJibGFkZW1hc3RlciIsImx2bCI6MjAsInNraWxscyI6W3siaWQiOiJjaW5kZXJ3aGlybF90cmFwIiwicmFyaXR5IjoibGVnZW5kYXJ5In0seyJpZCI6ImNvbWJ1c3Rpb25fc3RyaWtlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2Vpc21pY19tYXJjaCIsInVubGVhc2giLCJlZmZpY2llbmN5Iiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImxpZ2h0bmluZ19ibGFzdCIsInJhcml0eSI6InJhcmUiLCJzdXBwb3J0cyI6WyJhenVyZV9oYXJ2ZXN0IiwiY3Jlc2NlbmRvIiwic3VtbW9uX3BoYW50YXNtIl19LHsiaWQiOiJvYmxhdGlvbl9vZl9mbGVzaCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsic3BlbGxfZWNobyIsImJsb29taW5nX2dyb3VuZCJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjYwMTAyNzE5MiwidW5pcXVlcyI6eyJiZWx0Ijoid2ludGVyX2FmdGVyX3lvdSIsImNoZXN0IjoiYWVnaXNfb2ZfdGhlX2Ryb3duZWQifX0:spar --seeds 30 --base-seed 3558072571`</details>
- `class:skald + support:plus_lightning + support:ravenous_pact + support:bodyguard_doctrine`: measured 18624.7 damage per second, its parts predict 55.6. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJza2FsZCIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJwdXJpdHlfb2ZfbGlnaHRuaW5nIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsicGx1c19saWdodG5pbmciXX0seyJpZCI6ImluZmVybmFsX2JvbWJhcmRtZW50IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsiY29tbXVuYWxfcml0ZXMiLCJyYXZlbm91c19wYWN0Il19LHsiaWQiOiJnYXRoZXJfY2luZGVya2luIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJib2R5Z3VhcmRfZG9jdHJpbmUiXX0seyJpZCI6InNwaXJpdF9tZW5kZXIiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJyYXZlbm91c19wYWN0Il19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJ3YXJkIiwiZ2VhciI6InJhcmUiLCJncyI6NzAyMzQ4OTY5LCJ1bmlxdWVzIjp7Imdsb3ZlcyI6ImdhbGV3cmlnaHRzIiwicmluZzEiOiJzaGFyZWRfY3VwIn19:spar --seeds 30 --base-seed 3558072571`</details>
- `class:resonator + unique:gravebloom + support:steady_nerve + support:pressure_seal`: measured 17559.8 damage per second, its parts predict 70.6. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJyZXNvbmF0b3IiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiYmF0dGxlX3N0YW5kYXJkIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiYm9uZGJyZWFrZXIiLCJwcmVzc3VyZV9zZWFsIl0sImxpbWIiOjB9LHsiaWQiOiJpbnZpc2liaWxpdHkiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiXSwibGltYiI6MX0seyJpZCI6InJhaW5fb2ZfYXNoIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJtZWFzdXJlZF9ibG93cyJdfSx7ImlkIjoiaW5mZXJuYWxfYm9tYmFyZG1lbnQiLCJyYXJpdHkiOiJtYWdpYyJ9XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjEyNjI4MjcwMDYsInVuaXF1ZXMiOnsiYmVsdCI6InN0YW5kaW5nX3RvYXN0IiwiaGVsbWV0IjoiZ3JhdmVibG9vbSJ9fQ:spar --seeds 30 --base-seed 3558072571`</details>
- `class:matador + support:ritardando + support:quiet_hand + support:at_the_brink`: measured 9015.5 damage per second, its parts predict 37.3. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJtYXRhZG9yIiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6InNoYW1ibGVyX2hvcmRlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsidGl0YW5pYyIsImNhc2NhZGluZ19jYWxsIl0sImxpbWIiOjF9LHsiaWQiOiJsYXlfYnJvb2RfZWdnIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiY2FzdF9vbl9mbGF3bGVzcyIsInRpbWVfZnVzZSIsInF1aWV0X2hhbmQiLCJidWlsZGluZ19yaHl0aG0iXX0seyJpZCI6InByZXNlcnZhdGlvbiIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInNwZW50YmFuZSIsImF0X3RoZV9icmluayIsInJpdGFyZGFuZG8iLCJ1cHJvb3RlciJdfSx7ImlkIjoibGF5X2dydWJfY2x1dGNoIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsic2xpcHN0cmVhbSJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6MjMwNDQ3MDIwLCJ1bmlxdWVzIjp7ImJvb3RzIjoicmltZXdha2UifX0:spar --seeds 30 --base-seed 3558072571`</details>
- `class:swashbuckler + unique:winter_after_you + support:sainted_ash + support:legion_call`: measured 164.3 damage per second, its parts predict 1. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJzd2FzaGJ1Y2tsZXIiLCJsdmwiOjIwLCJza2lsbHMiOlt7ImlkIjoiaG9seV9yZWxpYyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbIm1lbmRpbmdfZWNob2VzIiwiY29tbWFuZF9nZW0iLCJ0cmlwd2lyZSJdfSx7ImlkIjoibWFyayIsInJhcml0eSI6ImxlZ2VuZGFyeSJ9LHsiaWQiOiJleHBvc2Vfd2Vha25lc3MiLCJyYXJpdHkiOiJyYXJlIiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2FpbnRlZF9hc2giXSwibGltYiI6MH0seyJpZCI6Imxvb3NlX21hcnJvd2dydWJzIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJsZWdpb25fY2FsbCIsImRlYXRoc19kb29yIl19XSwib2ZmIjoiY3JpdCIsImRlZiI6ImxpZmUiLCJnZWFyIjoicmFyZSIsImdzIjo5MTIzNjY2ODMsInVuaXF1ZXMiOnsiYmVsdCI6IndpbnRlcl9hZnRlcl95b3UifX0:spar --seeds 30 --base-seed 3558072571`</details>

### Flagged for your decision

The numbers an author would reach for did not move these enough. They are not proposals: each needs a call on whether the mechanic is right, and none has been touched.

- skill `hurricane`: The numbers an author would reach for barely move this: skills.hurricane.baseDamage ×2.5 closes 16%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `chronomancer`: The numbers an author would reach for barely move this: skills.stasis_lock.baseDamage ×2.5 closes 9%; classes.chronomancer.attributes ×2.5 closes 3%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `wallwright`: The numbers an author would reach for barely move this: skills.stone_rampart.baseDamage ×1 closes 0%; skills.toppling_stroke.baseDamage ×2.5 closes 15%; skills.shield_charge.baseDamage ×1 closes 0%; skills.stone_rampart.baseDamage & skills.toppling_stroke.baseDamage & skills.shield_charge.baseDamage ×2.5 closes 15%; classes.wallwright.attributes ×2.5 closes 5%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `necromancer`: The numbers an author would reach for barely move this: skills.poison_nova.baseDamage ×0.4 closes 5%; skills.despair.baseDamage ×1 closes 0%; skills.poison_nova.baseDamage & skills.despair.baseDamage ×0.4 closes 5%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- support `resounding_echo`: The numbers an author would reach for barely move this: supports.resounding_echo.mods ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_threat `breach_arcling`: The numbers an author would reach for barely move this: monsterDamage.breach_arcling.all ×2.5 closes 1%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `stygian_doll`: The numbers an author would reach for barely move this: monsters.stygian_doll.base.life ×2.5 closes 2%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `grave_shambler`: The numbers an author would reach for barely move this: monsters.grave_shambler.base.life ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.

## Outliers

407 rows sit far from their cohort (log-scale median and MAD, z ≥ 3 and a ratio past 1.8× or 0.55×), 39 of them new tonight. Warned rows and zero rows never enter a cohort.

| | kind | subject | metric | value | cohort median | ratio | z | cohort |
|---|---|---|---|---:|---:|---:|---:|---|
|  | support | `sundering_flight` | output_multiplier | 3 | 1 | 2.9× | 18.2 | supports · effective hosts |
|  | support | `fire_walker` | output_multiplier | 2.8 | 1 | 2.74× | 17.2 | supports · effective hosts |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.05× | -15.1 | L30 · geared · pressure · kill_rate |
|  | support | `scorched_wake` | output_multiplier | 2.4 | 1 | 2.33× | 14.4 | supports · effective hosts |
|  | support | `mounting_frenzy` | output_multiplier | 2.3 | 1 | 2.27× | 14 | supports · effective hosts |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.07× | -13.7 | L20 · geared · pressure · kill_rate |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.05× | -12.9 | L40 · geared · pressure · kill_rate |
|  | support | `austerity` | output_multiplier | 0.5 | 1 | 0.48× | -12.6 | supports · effective hosts |
|  | monster_threat | `seatless_usher` | dps_in | 0 | 16.9 | 0× | -12.6 | L25 · magician · body |
|  | support | `resounding_echo` | output_multiplier | 2.1 | 1 | 2.04× | 12.1 | supports · effective hosts |
|  | support | `crescendo` | output_multiplier | 2.1 | 1 | 2.02× | 12 | supports · effective hosts |
|  | support | `septic_bargain` | output_multiplier | 0.5 | 1 | 0.5× | -12 | supports · effective hosts |
|  | class | `chronomancer` | kill_rate | 0 | 0.5 | 0.04× | -11.9 | L10 · geared · pressure · kill_rate |
|  | support | `volley` | output_multiplier | 2 | 1 | 1.92× | 11.1 | supports · effective hosts |
| 🆕 | interaction | `class:magician + support:stillwater_discipline + support:crescendo + unique:stormcall` | dps_out | 2.6 | 540.9 | 0× | -10.2 | L5 main effects |
|  | support | `elemental_conduction` | output_multiplier | 1.9 | 1 | 1.82× | 10.2 | supports · effective hosts |
| 🆕 | interaction | `class:tamer + support:teeming_vein + primary:bolt_repeater + support:volley` | dps_out | 2.4 | 996.8 | 0× | -9.9 | L10 main effects |
| 🆕 | interaction | `class:matador + support:parting_judgement + support:arcing + unique:emberbrand` | dps_out | 11.1 | 15890.3 | 0× | -9.4 | L20 main effects |
|  | monster_threat | `hadal_lantern` | dps_in | 0.1 | 14.8 | 0× | -9.3 | L12 · magician · body |
|  | affix | `attr_willpower` | dps_out | 134.4 | 150.5 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `dmg_cold` | dps_out | 141.2 | 159.7 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `duration` | dps_out | 140.6 | 159.7 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `es_pct` | dps_out | 131.6 | 150.5 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `evasion_pct` | dps_out | 139.6 | 159.7 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `hybrid_armor_evasion` | dps_out | 139.6 | 159.7 | 0.06× | -9.1 | L20 · magician · affix output |

<details><summary>Re-measure any of these</summary>

- sundering_flight: `npm run sim -- run --refs socketed:ball_lightning:sundering_flight:20 --seeds 10`
- fire_walker: `npm run sim -- run --refs socketed:phoenix_dive:fire_walker:20 --seeds 10`
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:30:geared --seeds 10`
- scorched_wake: `npm run sim -- run --refs socketed:blinding_ichor:scorched_wake:20 --seeds 10`
- mounting_frenzy: `npm run sim -- run --refs socketed:serpent_ray:mounting_frenzy:20 --seeds 10`
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:20:geared --seeds 10`
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:40:geared --seeds 10`
- austerity: `npm run sim -- run --refs socketed:corpse_explosion:austerity:20 --seeds 10`
- seatless_usher: `npm run sim -- run --refs threat:starter_magician_l25:seatless_usher:25 --seeds 10`
- resounding_echo: `npm run sim -- run --refs socketed:aftershock_snare:resounding_echo:20 --seeds 10`
- crescendo: `npm run sim -- run --refs socketed:immolation_blast:crescendo:20 --seeds 10`
- septic_bargain: `npm run sim -- run --refs socketed:pillar_of_flame:septic_bargain:20 --seeds 10`
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:10:geared --seeds 10`
- volley: `npm run sim -- run --refs socketed:soulflay:volley:20 --seeds 10`
- elemental_conduction: `npm run sim -- run --refs socketed:ballista_sentry:elemental_conduction:20 --seeds 10`
- hadal_lantern: `npm run sim -- run --refs threat:starter_magician_l12:hadal_lantern:12 --seeds 10`
- attr_willpower: `npm run sim -- run --refs affix:magician:20:helmet:attr_willpower:10397677:spar --seeds 10`
- dmg_cold: `npm run sim -- run --refs affix:magician:20:helmet:dmg_cold:5352222:spar --seeds 10`
- duration: `npm run sim -- run --refs affix:magician:20:helmet:duration:5352222:spar --seeds 10`
- es_pct: `npm run sim -- run --refs affix:magician:20:helmet:es_pct:10397677:spar --seeds 10`
- evasion_pct: `npm run sim -- run --refs affix:magician:20:helmet:evasion_pct:5352222:spar --seeds 10`
- hybrid_armor_evasion: `npm run sim -- run --refs affix:magician:20:helmet:hybrid_armor_evasion:5352222:spar --seeds 10`

</details>

## Build search

112,590 candidates tonight (25,233 refused by the real gates), 364,335 over 5 night(s). The archive holds 1400 elite rows; 1367 were re-measured on this commit. Tried so far in a legal build: 39 of 39 classes, 576 of 576 primarys, 604 of 604 skills, 454 of 455 supports, 41 of 41 uniques.

| band | objective | build (top factors) | value | × band median | repro |
|---|---|---|---:|---:|---|
| L5 | offense | `class:runeweaver` `off:crit` `def:life` `gear:rare` `skill:reapers_toll` | 10528.6 | 373.1× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoicmVhcGVyc190b2xsIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJjb25jdXNzaXZlX2Jsb3dzIiwiY2FzdF9vbl9ibG9jayJdfSx7ImlkIjoibGlnaHRuaW5nX2JsYXN0IiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbInJlc291bmRpbmdfZWNobyIsImRvbWluaW9uX3RpdGhlIiwic3VtbW9uX3BoYW50YXNtIl19LHsiaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJmbGVldGluZ19kZXZvdGlvbiIsInNsb3dfYnJldyIsInBvbHlwaG9ueSIsImJsb29kX3ByaWNlIl19LHsiaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYXJjaW5nIiwic2xvd19icmV3IiwicGFydGluZ19qdWRnZW1lbnQiXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjE4OTgxNDA0NTgsInVuaXF1ZXMiOnsiY2hlc3QiOiJhZWdpc19vZl90aGVfZHJvd25lZCIsInJpbmcxIjoiZW1iZXJicmFuZCJ9fQ --seeds 8 --base-seed 3939037093`</details> |
| L5 | offense | `class:runeweaver` `off:crit` `def:life` `gear:rare` `skill:orb_of_storms` | 8152.3 | 288.9× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoib3JiX29mX3N0b3JtcyIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiaHVudGVyc19tb21lbnR1bSIsInVubW9vcmVkIl19LHsiaWQiOiJncmFzcGluZ19jaGFzbSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInByb3ZvY2F0aW9uIiwic2xvd19tYXRjaCIsImFjY2VsZXJhbmRvIiwiZGVzcGVyYXRpb24iXX0seyJpZCI6ImdsYWNpYWxfcmFtcGFydCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInNsb3dfbWF0Y2giXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjE2NzM4NDg3MTcsInVuaXF1ZXMiOnsiZ2xvdmVzIjoidGl0YW5zX2dyYXNwIiwicmluZzEiOiJlbWJlcmJyYW5kIn19 --seeds 8 --base-seed 3939037093`</details> |
| L5 | clear | `class:cryomancer` `off:crit` `def:evasion` `gear:magic` `skill:static_field` | 6 | 14.9× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjcnlvbWFuY2VyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoic3RhdGljX2ZpZWxkIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJtb25vbGl0aCIsInJhdmVuaW5nIl19LHsiaWQiOiJiZWNrb25fcGFsZXdpc3BzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiY29tbXVuYWxfcml0ZXMiLCJoaWRkZW5fcmVzZXJ2ZXMiXX0seyJpZCI6ImxvbmdfY29sZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInNpZWdlYnJlYWtlciIsImRvbWluaW9uX3RpdGhlIiwid2lkZW5pbmciLCJtYW5hX2ZlZWRlciJdLCJsaW1iIjowfSx7ImlkIjoiY2lycnVzX3ZlaWwiLCJyYXJpdHkiOiJsZWdlbmRhcnkifV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6Im1hZ2ljIiwiZ3MiOjQ3Mjg1MDQxOX0 --seeds 8 --base-seed 234546581`</details> |
| L5 | clear | `class:chronomancer` `off:crit` `def:armor` `gear:rare` `skill:befuddlement` | 6 | 14.9× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJiZWZ1ZGRsZW1lbnQiLCJyYXJpdHkiOiJtYWdpYyIsIm92ZXIiOjEsInN1cHBvcnRzIjpbIndpdGhlcmluZ19hZ29ueSIsInNlcXVlbmNlZF9pbnZvY2F0aW9uIl19LHsiaWQiOiJzaGF0dGVyY2hvcmQiLCJyYXJpdHkiOiJtYWdpYyIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImNoYW1iZXJlZF9jYXN0aW5nIiwic3RhdGljX2NoYXJnZSJdLCJsaW1iIjowfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjE4MDg5MzI4MSwidW5pcXVlcyI6eyJoZWxtZXQiOiJncmF2ZWJsb29tIiwicmluZzEiOiJlbWJlcmJyYW5kIn19 --seeds 8 --base-seed 3422991690`</details> |
| L10 | offense | `class:runeweaver` `off:crit` `def:evasion` `gear:rare` `skill:vampiric_embrace` | 18846.7 | 485.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjoxMCwic2tpbGxzIjpbeyJpZCI6InZhbXBpcmljX2VtYnJhY2UiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsiY2xhbW9yIiwiY2FzdF9vbl9mbGF3bGVzcyIsIm1vbm9saXRoIl19LHsiaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbInVwcm9vdGVyIl19LHsiaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJmbGVldGluZ19kZXZvdGlvbiIsInNsb3dfYnJldyIsInBvbHlwaG9ueSIsImJsb29kX3RvbGwiXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJhcmNpbmciLCJzbG93X2JyZXciLCJwYXJ0aW5nX2p1ZGdlbWVudCIsInVuYmxpbmtpbmciXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjE3MjcyODg0MjcsInVuaXF1ZXMiOnsiYW11bGV0Ijoic3Rvcm1jYWxsIiwicmluZzEiOiJzaGFyZWRfY3VwIn19 --seeds 8 --base-seed 3939037093`</details> |
| L10 | offense | `class:beguiler` `off:crit` `def:armor` `gear:rare` `skill:lightning_blast` | 13820.4 | 356.1× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJiZWd1aWxlciIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJsaWdodG5pbmdfYmxhc3QiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsiYXp1cmVfaGFydmVzdCIsImRvbWluaW9uX3RpdGhlIiwic3VtbW9uX3BoYW50YXNtIl19LHsiaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJmbGVldGluZ19kZXZvdGlvbiIsInNsb3dfYnJldyIsInBvbHlwaG9ueSIsImJsb29kX3ByaWNlIl19LHsiaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYXJjaW5nIiwic2xvd19icmV3IiwicGFydGluZ19qdWRnZW1lbnQiXX0seyJpZCI6ImVhcnRocmVuZGVyIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiY2xhbW9yIiwidGltZV9mdXNlIiwiYXp1cmVfaGFydmVzdCIsImNoYW1iZXJlZF9jYXN0aW5nIl19XSwib2ZmIjoiY3JpdCIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6MTM1ODA2NDI1OCwidW5pcXVlcyI6eyJhbXVsZXQiOiJzdG9ybWNhbGwiLCJyaW5nMSI6ImVtYmVyYnJhbmQifX0 --seeds 8 --base-seed 349893184`</details> |
| L10 | clear | `class:cleric` `off:crit` `def:none` `gear:rare` `skill:word_of_doom` | 6 | 19.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjbGVyaWMiLCJsdmwiOjEwLCJza2lsbHMiOlt7ImlkIjoid29yZF9vZl9kb29tIiwicmFyaXR5IjoicmFyZSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbIm9zdGluYXRvIl19LHsiaWQiOiJzaGF0dGVyY2hvcmQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInJlc291bmRpbmdfZWNobyIsImNhc2NhZGUiXSwibGltYiI6MX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjIxMzE4MDQwMjksInVuaXF1ZXMiOnsiYW11bGV0Ijoicm91bmRlbGF5IiwiY2hlc3QiOiJncm91bmRlZF9sYXR0aWNlIn19 --seeds 8 --base-seed 2316017297`</details> |
| L10 | clear | `class:flagellant` `off:damage` `def:evasion` `gear:rare` `skill:ice_shards` | 6 | 19.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJmbGFnZWxsYW50IiwibHZsIjoxMCwic2tpbGxzIjpbeyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJyYXJlIiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2Vla2VyIiwicml0dWFsX2dyb3VuZCIsInN1bW1vbl9waGFudGFzbSJdfSx7ImlkIjoid2FyX2hvcm4iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJndWFyZGVkX2Nhc3RpbmciXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6InJhcmUiLCJzdXBwb3J0cyI6WyJjaGFtYmVyZWRfY2FzdGluZyJdLCJsaW1iIjoxfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjo5MzY1MjQ5NDN9 --seeds 8 --base-seed 594568969`</details> |
| L20 | offense | `class:sentinel` `off:damage` `def:evasion` `gear:rare` `skill:emberbind` | 85752.8 | 1224.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzZW50aW5lbCIsImx2bCI6MjAsInNraWxscyI6W3siaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJmbGVldGluZ19kZXZvdGlvbiIsInNsb3dfYnJldyIsInBvbHlwaG9ueSIsImJsb29kX3RvbGwiXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJhcmNpbmciLCJzbG93X2JyZXciLCJwYXJ0aW5nX2p1ZGdlbWVudCJdfSx7ImlkIjoiZ2FsZXdpc3AiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJjYXN0X29uX2tpbGwiLCJidWlsZGluZ19yaHl0aG0iLCJyZXR1cm5pbmciXX0seyJpZCI6InBlc3RpbGVudF9ub3ZhIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsibW9ub2xpdGgiLCJzaHJlZGRpbmdfcmV0dXJuIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjE2ODE3NjI0MzcsInVuaXF1ZXMiOnsiYm9vdHMiOiJyaW1ld2FrZSIsImhlbG1ldCI6ImNpbmRlcnZpZ2lsIn19 --seeds 8 --base-seed 4204422583`</details> |
| L20 | offense | `class:magician` `off:damage` `def:life` `gear:rare` `skill:stormbind` | 67067.5 | 957.9× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6MjAsInNraWxscyI6W3siaWQiOiJzdG9ybWJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJ0ZW1wZXN0X3JhbmdlIl19LHsiaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJmbGVldGluZ19kZXZvdGlvbiIsInNsb3dfYnJldyIsInBvbHlwaG9ueSIsImJsb29kX3RvbGwiXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJhcmNpbmciLCJzbG93X2JyZXciLCJwYXJ0aW5nX2p1ZGdlbWVudCJdfSx7ImlkIjoibGFzdF9yaXRlIiwicmFyaXR5IjoibGVnZW5kYXJ5In1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJsaWZlIiwiZ2VhciI6InJhcmUiLCJncyI6MTY2MDA1MjY0N30 --seeds 8 --base-seed 1771148754`</details> |
| L20 | clear | `class:brawler` `off:crit` `def:none` `gear:rare` `skill:hell_rift` | 6 | 17.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJicmF3bGVyIiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImhlbGxfcmlmdCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImNsYW1vciIsInB1bHNhdGluZ19taXNzaWxlcyIsInN1ZmZ1c2lvbiJdfSx7ImlkIjoiZG9vbV9iZWxsIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsicGhhbnRhc21hbF9lY2hvIl19LHsiaWQiOiJzY3l0aGVfYXJjIiwicmFyaXR5IjoibGVnZW5kYXJ5In1dLCJvZmYiOiJjcml0IiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjEyMjk2ODkzMzEsInVuaXF1ZXMiOnsiZ2xvdmVzIjoicm90ZV9oYW5kIn19 --seeds 8 --base-seed 2738814806`</details> |
| L20 | clear | `class:juggernaut` `off:speed` `def:none` `gear:rare` `skill:doom_bell` | 6 | 17.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJqdWdnZXJuYXV0IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImRvb21fYmVsbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNoYXR0ZXJnbGFzcyJdfSx7ImlkIjoiYmVja29uX3BhbGV3aXNwcyIsInJhcml0eSI6InJhcmUiLCJzdXBwb3J0cyI6WyJtb3VudGluZ19mcmVuenkiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfSx7ImlkIjoiY29uc2VjcmF0aW9uIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsibWFkZGVuaW5nX21pYXNtYSIsImF1c3Rlcml0eSIsImNhc3Rfb25fZGFtYWdlX3Rha2VuIl0sImxpbWIiOjB9XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6MTMwNzQyMDE3OSwidW5pcXVlcyI6eyJhbXVsZXQiOiJyb3VuZGVsYXkifX0 --seeds 8 --base-seed 3623021839`</details> |
| L40 | offense | `class:hivecaller` `off:damage` `def:ward` `gear:rare` `skill:infernal_bombardment` | 192648.6 | 2222.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJoaXZlY2FsbGVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImluZmVybmFsX2JvbWJhcmRtZW50IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiY2FzY2FkZSIsImRlbGliZXJhdGVfcnVpbiIsIm1vbm9saXRoIiwiYnJpbXN0b25lX3RpdGhlIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjg4MDEyMzk4MiwidW5pcXVlcyI6eyJjaGVzdCI6InRoZV91bm1vdmVkIn19 --seeds 8 --base-seed 1074067225`</details> |
| L40 | offense | `class:juggernaut` `off:damage` `def:evasion` `gear:rare` `skill:detonate_mines` | 66873.8 | 771.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJqdWdnZXJuYXV0IiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImRldG9uYXRlX21pbmVzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZG9taW5pb25fdGl0aGUiLCJkZWxpYmVyYXRlX3J1aW4iLCJjaGFtYmVyZWRfY2FzdGluZyIsInNlcmVuZV9wb3dlciJdfSx7ImlkIjoiZW1iZXJiaW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZmxlZXRpbmdfZGV2b3Rpb24iLCJzbG93X2JyZXciLCJwb2x5cGhvbnkiLCJibG9vZF90b2xsIl19LHsiaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYXJjaW5nIiwic2xvd19icmV3IiwicGFydGluZ19qdWRnZW1lbnQiXX0seyJpZCI6ImVhcnRocmVuZGVyIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiY2xhbW9yIiwidGltZV9mdXNlIiwibGluZ2VyaW5nIiwiY2hhbWJlcmVkX2Nhc3RpbmciXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6NjUzNTExNzMxLCJ1bmlxdWVzIjp7ImFtdWxldCI6InN0b3JtY2FsbCIsImhlbG1ldCI6ImNpbmRlcnZpZ2lsIn19 --seeds 8 --base-seed 3623021839`</details> |
| L40 | clear | `class:berserker` `off:speed` `def:life` `gear:rare` `skill:detonate_mines` | 6 | 20.4× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZGV0b25hdGVfbWluZXMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJkb21pbmlvbl90aXRoZSIsInN0b3JlZF92ZXJkaWN0IiwiY2hhbWJlcmVkX2Nhc3RpbmciLCJzZXJlbmVfcG93ZXIiXX0seyJpZCI6Imh1cmxfZGVicmlzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsibWFuYV9mZWVkZXIiXX0seyJpZCI6ImRvb21fYmVsbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbIm1lYXN1cmVkX2JsYWRlIl19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJsaWZlIiwiZ2VhciI6InJhcmUiLCJncyI6MTc3NDMxMDUyMiwidW5pcXVlcyI6eyJoZWxtZXQiOiJoYWxvX25pbnRoX2Nob2lyIn19 --seeds 8 --base-seed 895388517`</details> |
| L40 | clear | `class:cleric` `off:crit` `def:none` `gear:rare` `skill:pyroclast_bolt` | 6 | 20.4× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjbGVyaWMiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoicHlyb2NsYXN0X2JvbHQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJkZXNwZXJhdGVfbWVhc3VyZXMiLCJzdW1tb25fcGhhbnRhc20iLCJjYXN0X29uX2JsZWVkIiwic2FuY3RhbF9jYXV0ZXJ5Il19LHsiaWQiOiJkb29tX2JlbGwiLCJyYXJpdHkiOiJsZWdlbmRhcnkifV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6NjY4MTY1NjE4LCJ1bmlxdWVzIjp7ImFtdWxldCI6InR1bmluZ19mb3JrIiwiY2hlc3QiOiJ0aGVfdW5tb3ZlZCJ9fQ --seeds 8 --base-seed 2316017297`</details> |

Playstyles at L5, best build found per style against the band's median style (50 styles): strongest `area · fire` 10109 (3.92×), `construct · physical` 8254.5 (3.2×), `construct · chaos` 6557.4 (2.54×), `construct · lightning` 6521.8 (2.53×); weakest `mark · cold` 689.9 (0.27×), `court · cold` 723.5 (0.28×), `target · cold` 839.8 (0.33×), `mark · fire` 869.1 (0.34×).

Playstyles at L10, best build found per style against the band's median style (50 styles): strongest `self · lightning` 18718.2 (3.79×), `area · lightning` 13312.8 (2.7×), `melee · fire` 12460.1 (2.52×), `projectile · chaos` 9924.6 (2.01×); weakest `construct · fire` 2916.2 (0.59×), `mark · physical` 2948.5 (0.6×), `court · lightning` 3334.2 (0.68×), `court · fire` 3362.6 (0.68×).

Playstyles at L20, best build found per style against the band's median style (50 styles): strongest `aura · physical` 484504.5 (30.11×), `melee · physical` 377356.5 (23.45×), `aura · fire` 84706.4 (5.26×), `aura · chaos` 67051.3 (4.17×); weakest `area · lightning` 6816.7 (0.42×), `court · physical` 7543 (0.47×), `self · lightning` 8811.4 (0.55×), `projectile · fire` 9008.9 (0.56×).

Playstyles at L40, best build found per style against the band's median style (50 styles): strongest `melee · physical` 507614.2 (19.17×), `projectile · physical` 236707.5 (8.94×), `court · fire` 193252 (7.3×), `target · physical` 183014.4 (6.91×); weakest `projectile · cold` 9742.2 (0.37×), `mark · physical` 10933.7 (0.41×), `aura · physical` 11242.2 (0.42×), `mark · chaos` 11883.2 (0.45×).

Main effects at L5 over 11369 rows: strongest `skill:grasping_chasm` 19.93×, `skill:bonespray` 13.7×, `skill:infernal_bombardment` 7.99×, `skill:undertow` 7.36×, `skill:ice_shards` 6.84×; weakest `skill:soul_volley` 0.16×, `skill:repulsor_beacon` 0.17×, `primary:web_shot` 0.21×, `skill:glare_ice` 0.24×, `limb:ballista_sentry#1` 0.24×.

Main effects at L10 over 17727 rows: strongest `skill:grasping_chasm` 17.32×, `skill:infernal_bombardment` 11.56×, `skill:inferno` 8.61×, `limb:shambler_horde#1` 8.16×, `skill:undertow` 7.32×; weakest `primary:deathwatch` 0.1×, `primary:shambler_horde` 0.12×, `skill:head_of_steam` 0.14×, `skill:raise_dead` 0.16×, `limb:expose_weakness#1` 0.16×.

Main effects at L20 over 22479 rows: strongest `skill:grasping_chasm` 31.52×, `skill:infernal_bombardment` 29.94×, `skill:bonespray` 15.52×, `skill:serpent_ray` 11.4×, `skill:undertow` 9.48×; weakest `support:volcanic_heart` 0.15×, `skill:deathwatch` 0.22×, `primary:holy_relic` 0.25×, `skill:beckon_palewisps` 0.25×, `skill:healing_stream` 0.26×.

Main effects at L40 over 22635 rows: strongest `primary:infernal_bombardment` 47.34×, `skill:ice_shards` 14.64×, `skill:arcane_missiles` 12.59×, `skill:grasping_chasm` 12.44×, `limb:spirit_pyre#0` 8.42×; weakest `primary:marrowhooks` 0.16×, `primary:stormbind` 0.16×, `support:seismic_waltz` 0.17×, `primary:summon_bone_golem` 0.21×, `skill:repulsor_beacon` 0.21×.

**Other combinations far off the sum of their parts**, confirmed on fresh dice (20 tried):

- `class:firebrand + support:sundering_flight + primary:reckoning + support:mana_feeder`: measured 21.6, its parts predict 792.8. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJmaXJlYnJhbmQiLCJsdmwiOjIwLCJza2lsbHMiOlt7ImlkIjoicmVja29uaW5nIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsib3Bwb3J0dW5pc3QiXSwibGltYiI6MX0seyJpZCI6InNlYWxfb2ZfZGVhdGgiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJ3aWxkX2FiYW5kb24iLCJjcm93ZF9mYXZvciIsIm1lYXN1cmVkX2Jsb3dzIiwic2VyZW5lX3Bvd2VyIl19LHsiaWQiOiJyZWF2ZXJzX3N3ZWVwIiwicmFyaXR5IjoibGVnZW5kYXJ5In0seyJpZCI6ImZpcmVib2x0IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsidGF1dF93aXJlIiwiYXp1cmVfaGFydmVzdCIsInN1bmRlcmluZ19mbGlnaHQiLCJtYW5hX2ZlZWRlciJdLCJsaW1iIjowfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjEyMzA0MTk0MzEsInVuaXF1ZXMiOnsiYmVsdCI6ImJlbGxfb2ZfdGhlX2JyZWFjaCJ9fQ:spar --seeds 30 --base-seed 3558072571`</details>
- `class:magician + support:stillwater_discipline + support:crescendo + unique:stormcall`: measured 48.8, its parts predict 540.9. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6NSwic2tpbGxzIjpbeyJpZCI6Indpc3BfY2FsbCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsid3JhaXRoX3Bhc3NhZ2UiLCJxdWFpbGJhbmUiXX0seyJpZCI6ImltcGVyaW91c19iYXJyYWdlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiZGVhdGhzX2Rvb3IiLCJibG9vZF9wcmljZSIsInRldGhlcmVkX29yYml0Iiwic3RpbGx3YXRlcl9kaXNjaXBsaW5lIl19LHsiaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJjYXN0X29uX2RhbWFnZV90YWtlbiJdfSx7ImlkIjoidmVudF92ZWlsIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbImNyZXNjZW5kbyIsInRpbWVfZnVzZSIsImVwaWRlbWljIl19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJsaWZlIiwiZ2VhciI6InJhcmUiLCJncyI6NTczMjY4MjY5LCJ1bmlxdWVzIjp7ImFtdWxldCI6InN0b3JtY2FsbCIsImdsb3ZlcyI6InRpdGFuc19ncmFzcCJ9fQ:spar --seeds 30 --base-seed 3558072571`</details>
- `class:matador + support:parting_judgement + support:arcing + unique:emberbrand`: measured 13, its parts predict 15890.3. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJtYXRhZG9yIiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6InNoYW1ibGVyX2hvcmRlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiY2FzdF93aGlsZV9ndWFyZGluZyIsInRpdGFuaWMiLCJnYXRoZXJlZF9jYXN0aW5nIiwiZmxlZXRmb290Il0sImxpbWIiOjF9LHsiaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJmbGVldGluZ19kZXZvdGlvbiIsInNsb3dfYnJldyIsInBvbHlwaG9ueSIsImJsb29kX3RvbGwiXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJhcmNpbmciLCJzbG93X2JyZXciLCJwYXJ0aW5nX2p1ZGdlbWVudCIsImVydXB0aW9uX2N5Y2xlIl19LHsiaWQiOiJlYXJ0aHJlbmRlciIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImNsYW1vciIsInRpbWVfZnVzZSIsImxpbmdlcmluZyIsImNoYW1iZXJlZF9jYXN0aW5nIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjQ3MDI5MzU1OCwidW5pcXVlcyI6eyJnbG92ZXMiOiJnYWxld3JpZ2h0cyIsInJpbmcxIjoiZW1iZXJicmFuZCJ9fQ:spar --seeds 30 --base-seed 3558072571`</details>
- `class:wallwright + support:sundering_flight + support:channeled_tempest + support:umbral_power`: measured 3, its parts predict 643.3. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJ3YWxsd3JpZ2h0IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6Im92ZXJjbG9jayIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImNyb3dkX2Zhdm9yIiwiZG9taW5pb25fdGl0aGUiLCJwcmVzc3VyZV9zZWFsIiwicG9seXBob255Il19LHsiaWQiOiJiaW5kX2ZhbWlsaWFyIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiY2FzdF9vbl9pZ25pdGlvbiJdLCJsaW1iIjowfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInJlZ2ljaWRlIiwic3VuZGVyaW5nX2ZsaWdodCIsImNoYW5uZWxlZF90ZW1wZXN0IiwidW1icmFsX3Bvd2VyIl19XSwib2ZmIjoiY3JpdCIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjoxNjI2NDI2NDg3fQ:spar --seeds 30 --base-seed 3558072571`</details>
- `class:runeweaver + primary:vampiric_embrace + support:bondbreaker + support:clamor`: measured 1.5, its parts predict 104.5. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjoxMCwic2tpbGxzIjpbeyJpZCI6InZhbXBpcmljX2VtYnJhY2UiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsid3JhaXRoX3Bhc3NhZ2UiLCJjYXN0X29uX2ZsYXdsZXNzIiwibW9ub2xpdGgiXX0seyJpZCI6InN1bW1vbl93cmFpdGgiLCJyYXJpdHkiOiJyYXJlIiwib3ZlciI6MSwic3VwcG9ydHMiOlsiY2FzdF9vbl9pZ25pdGlvbiIsImNsYW1vciJdLCJsaW1iIjoxfSx7ImlkIjoiZnJvemVuX29yYiIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsic3Bpcml0X3RvdGVtIiwiYm9uZGJyZWFrZXIiXX0seyJpZCI6ImF1cmVvbGUiLCJyYXJpdHkiOiJtYWdpYyIsIm92ZXIiOjJ9XSwib2ZmIjoiY3JpdCIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6MTA1MDg3MDM2Mn0:spar --seeds 30 --base-seed 3558072571`</details>
- `class:resonator + support:parting_judgement + support:summon_phantasm + support:culminant_frenzy`: measured 375.9, its parts predict 59724. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJyZXNvbmF0b3IiLCJsdmwiOjIwLCJza2lsbHMiOlt7ImlkIjoiaW1wZXJpb3VzX2JhcnJhZ2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJjdWxtaW5hbnRfZnJlbnp5Iiwicml0dWFsX2dyb3VuZCIsInVtYnJhbF9wb3dlciJdfSx7ImlkIjoibGlnaHRuaW5nX2JsYXN0IiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbImF6dXJlX2hhcnZlc3QiLCJkb21pbmlvbl90aXRoZSIsInN1bW1vbl9waGFudGFzbSJdfSx7ImlkIjoiZW1iZXJiaW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZmxlZXRpbmdfZGV2b3Rpb24iLCJzbG93X2JyZXciLCJwb2x5cGhvbnkiLCJibG9vZF9wcmljZSJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImFyY2luZyIsInNsb3dfYnJldyIsInBhcnRpbmdfanVkZ2VtZW50IiwiZGVzcGVyYXRlX21lYXN1cmVzIl19XSwib2ZmIjoiY3JpdCIsImRlZiI6IndhcmQiLCJnZWFyIjoicmFyZSIsImdzIjoxNjczNDk4MjkxfQ:spar --seeds 30 --base-seed 3558072571`</details>
- `class:flagellant + support:virulence + primary:preservation + support:mana_feeder`: measured 23.6, its parts predict 9358.1. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJmbGFnZWxsYW50IiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6InByZXNlcnZhdGlvbiIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImJ1bHdhcmtfc2hhcmRzIiwic2NhdHRlcmVkX2Nhc2NhZGUiLCJkZXNwZXJhdGVfbWVhc3VyZXMiLCJodW50ZXJzX21vbWVudHVtIl19LHsiaWQiOiJzdW1tb25fYm9uZV9nb2xlbSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInBvbHlwaG9ueSIsImJyb29kX3RlbmRlciIsInZpb2xlbnRfYXJyaXZhbCIsImNhc3Rfd2hpbGVfZ3VhcmRpbmciXSwibGltYiI6MX0seyJpZCI6InBvaXNvbl9ub3ZhIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsidmlydWxlbmNlIiwibWFuYV9mZWVkZXIiLCJzbG93X2JyZXciLCJwb2ludF9ibGFuayJdLCJsaW1iIjoxfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjEzOTM4Njk2NzQsInVuaXF1ZXMiOnsiaGVsbWV0IjoiZ3JhdmVibG9vbSIsInJpbmcxIjoiY29tbW9uX3B1bHNlIn19:spar --seeds 30 --base-seed 3558072571`</details>
- `class:runeweaver + unique:stormcall + primary:wisp_call + support:wraith_passage`: measured 0.3, its parts predict 35.4. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoid2lzcF9jYWxsIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJjYXN0X29uX292ZXJjaGFyZ2UiLCJ3cmFpdGhfcGFzc2FnZSJdfSx7ImlkIjoic3VtbW9uX3JhZ2luZ19zcGlyaXQiLCJyYXJpdHkiOiJtYWdpYyJ9XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJ3YXJkIiwiZ2VhciI6InJhcmUiLCJncyI6MTI1MDMzMDM0OSwidW5pcXVlcyI6eyJhbXVsZXQiOiJzdG9ybWNhbGwifX0:spar --seeds 30 --base-seed 3558072571`</details>

## Tuning reads

Standing tables to tune from. Advisory.

**What +10 of each attribute is worth**, median across the roster at L20 geared (share of output on the sparring lane, share of time survived on the survival clock):

| attribute | output | time survived | classes where it did nothing |
|---|---:|---:|---:|
| strength | +4% | +2% | 0 of 39 |
| finesse | +3% | 0% | 1 of 39 |
| intelligence | +2% | 0% | 0 of 39 |
| wisdom | +1% | 0% | 0 of 39 |
| prowess | 0% | 0% | 2 of 39 |
| fortitude | 0% | +5% | 0 of 39 |
| dexterity | 0% | 0% | 0 of 39 |
| charisma | 0% | +2% | 0 of 39 |
| willpower | 0% | +2% | 0 of 39 |
| vitality | 0% | +10% | 0 of 39 |

**Support power**, median output change across the hosts each gem works on. Strongest: `sundering_flight` +199%, `fire_walker` +182%, `scorched_wake` +140%, `mounting_frenzy` +134%, `resounding_echo` +110%, `crescendo` +108%, `volley` +98%, `elemental_conduction` +87%. Weakest: `austerity` -51%, `septic_bargain` -49%, `pyre_legion` -36%, `rattling_salvo` -35%, `spirit_totem` -28%, `wraith_passage` -25%, `nova_release` -20%, `sweeping_blow` -20%.

**Against the target** of +10% to +15%: the median gem changes output by +7%. 22 in the band, 85 above it, 124 below it, 101 leave damage alone.

15 of these gems read off their own rig, because they need something a plain rig does not do: in the middle of a crowd (`alternating_strikes`, `unstable_flight`, `wild_abandon`, `tethered_orbit`, `gyre`, `vortex`, `sidewinder`, `trueflight`, `crosswind`); with a guard raised (`guarded_casting`); with a charge a second fed into its bank (`embargo`, `ravening`); against a plain dummy instead of a resistant one (`refraction`, `flameforged`, `rarefy`).

**Affix families** (211 measured on one magic piece against the same wardrobe without it, 11 never worn on the doll). Most output: `apply_poison` 1.95× on magician, `apply_poison` 1.75× on warrior, `apply_bleed` 1.62× on magician, `apply_bleed` 1.61× on warrior, `hadal_cold` 1.5× on magician, `hadal_cold` 1.44× on warrior, `creeper_barrow` 1.27× on warrior, `satellite_rime_wake` 1.22× on warrior. Most time survived: `life_on_evade` 1.93× on warrior, `barnacle_crust` 1.74× on warrior, `chitin_plate` 1.59× on warrior, `life_on_hit` 1.58× on warrior, `thorns` 1.54× on warrior, `life_on_evade` 1.53× on magician. Moved nothing on these rigs: 3 families.

**What buffs, hexes, heals and wards add** (196 skills whose own numbers are not damage, at L20, against the same hero without them). Most output beside a plain strike: `infernal_bombardment` 14.1×, `summon_plaguefather` 6.4×, `summon_fire_golem` 4.83×, `summon_flame_sprite` 4.77×, `flame_totem` 4.77×, `shambler_horde` 4.25×, `bind_familiar` 4.22×, `reaper_swarm` 3.88×. Most time survived on the clock: `vampiric_presence` 11.85×, `summon_blade_wraith` 11.85×, `shambler_horde` 11.85×, `repulsor_beacon` 11.85×, `call_the_rift` 10.98×, `reaper_swarm` 10.25×, `summon_wraith` 9.04×, `infernal_bombardment` 6.63×. 35 moved neither at any band: their value lies outside these rigs, or they do nothing.

**Standing config numbers that move the headline rigs** (elasticity: % change in the metric per % change in the number). `hero_mana_per_level` → mana_floor_pct 0.21, `DEFENSE_CFG.weight.refRadius` → dps_out 0.13, `DEFENSE_CFG.armor.k` → dps_out 0.05, `DEFENSE_CFG.poise.drainRatio` → dps_out 0.05, `DEFENSE_CFG.weight.refRadius` → mana_floor_pct 0.05, `DEFENSE_CFG.weight.perPoise` → mana_floor_pct 0.02. 59 numbers moved nothing here.

**Provisional bands against the roster.** 23 of 96 band and tier rows have most of the roster outside the band. The measured spread is evidence for your sign-off, and no band changes on its own.

| metric | lane | tier | band | roster outside | measured p10 | median | p90 |
|---|---|---|---|---:|---:|---:|---:|
| player_deaths | parity | starter | L40 | 38 of 39 | 0.2 | 1 | 1 |
| player_deaths | parity | starter | L30 | 37 of 39 | 0.2 | 1 | 1 |
| player_deaths | parity | starter | L20 | 36 of 39 | 0.2 | 1 | 1 |
| ttk_wave_mean | parity | starter | L40 | 12 of 13 | 15.2 | 22 | 35.9 |
| player_deaths | parity | starter | L10 | 32 of 39 | 0 | 0.6 | 1 |
| ttk_wave_mean | parity | starter | L10 | 16 of 21 | 12.1 | 19.3 | 40.3 |
| ttk_wave_mean | parity | starter | L20 | 11 of 15 | 10.7 | 17.7 | 35.2 |
| ttk_wave_mean | parity | kitted | L10 | 27 of 37 | 9.4 | 24.6 | 45.8 |
| ttk_wave_mean | parity | kitted | L5 | 23 of 32 | 10.4 | 24.9 | 40.7 |
| player_deaths | parity | starter | L5 | 28 of 39 | 0 | 0.2 | 1 |
| life_floor_pct | parity | starter | L30 | 28 of 39 | 0 | 0 | 48.4 |
| ttk_wave_mean | parity | kitted | L40 | 27 of 38 | 6.4 | 22.4 | 45.1 |

## The instrument

Class expression at the top band: 38 read on the dummy, 1 need the sparring partner, 0 read only in the pack lanes, 0 mute.
Bestiary: 13104 rows measured, 100 bodies not fielded (passive or immortal fixtures). 161 bodies never swung at a hero standing idle within reach, so their threat reads as unmeasured: 102 have no skills, 31 carry kits with no damage, 6 are rooted, 7 lie in ambush, 9 only fight once fought, and 6 have a damage kit and legs and did not swing in a duel either (`cloud_grazer`, `kettle_minnow`, `sand_scorpion`, `star_grazer`, `white_hart`, `wool_aphid`).
How the bodies fought: on an idle hero the median first blow lands at 0.98s. In a duel, 22% of casts are melee, a body spends 17% of the fight within its own melee reach, and it uses 2 skills. No body pressed a skill that was refused.
Skills: 2930 rows across the bands; 902 read zero alone and are not ranked (buffs, auras and mines show nothing without a partner), 30 warned.
Suites: 91 scenarios, 17 of 104 graded metrics outside their provisional band, 12 warned.
Matrix: 127,530 of 127,530 eligible pairs probed (100%), deep lane on 30521 pairs. Verdicts: effective 78555, blind 30610, inert 14500, cost_only 1428, negligible 2437.
Against the committed ledger (8481 rows): 13454 not on file, 1986 measuring healthy. The ledger only changes through `matrix check --reconcile`.

## What ran, and what did not

| lane | units planned | ok | gate breach | crashed/killed | out of time or not run | episodes | core-hours |
|---|---:|---:|---:|---:|---:|---:|---:|
| baselines | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| audits | 4 | 4 | 0 | 0 | 0 | 0 | 0 |
| expression | 1 | 1 | 0 | 0 | 0 | 1,208 | 0.1 |
| census | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| suites | 2 | 2 | 0 | 0 | 0 | 910 | 0.3 |
| progression | 39 | 39 | 0 | 0 | 0 | 12,480 | 4.8 |
| skills | 10 | 10 | 0 | 0 | 0 | 8,790 | 1.3 |
| skills_vs | 21 | 21 | 0 | 0 | 0 | 24,192 | 5 |
| matchups | 28 | 28 | 0 | 0 | 0 | 13,734 | 5.9 |
| bestiary | 21 | 21 | 0 | 0 | 0 | 26,208 | 5.1 |
| attributes | 39 | 39 | 0 | 0 | 0 | 4,914 | 2.3 |
| affixes | 6 | 6 | 0 | 0 | 0 | 3,472 | 1.2 |
| assists | 11 | 11 | 0 | 0 | 0 | 4,752 | 2.1 |
| socket_play | 1 | 1 | 0 | 0 | 0 | 900 | 0.2 |
| globals | 4 | 4 | 0 | 0 | 0 | 1,704 | 0.3 |
| matrix | 230 | 230 | 0 | 0 | 0 | 235,854 | 54.7 |
| matrix_deep | 79 | 79 | 0 | 0 | 0 | 139,361 | 32.8 |
| search | 40 | 40 | 0 | 0 | 0 | 197,412 | 33.4 |
| archive_confirm | 37 | 37 | 0 | 0 | 0 | 21,872 | 6.7 |
| proposals | 48 | 48 | 0 | 0 | 0 | 15,090 | 3.4 |

Every planned unit ran.

Not simulated at all, by design: zone generation and XP pacing, event pressure, multiplayer, and real player skill. Pilots are simple policies, so kit ceilings are floors. Bands stay provisional until you sign them off.
