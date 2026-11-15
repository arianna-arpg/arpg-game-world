# Balance farm results

Data branch: machine-written by `.github/workflows/balance-farm.yml`. Do not edit by hand.

- `latest/` the newest night: `summary.json`, `digest.md`
- `nights/<date>/` one small record per night
- `trend.jsonl` one line per night
- `state/` what the next night builds on: the search archive, measured lane costs, row snapshot

Page: https://arianna-arpg.github.io/arpg-game-world/balance/

---

# Balance farm, night of 2026-11-15

Commit [79b9075fd5](https://github.com/arianna-arpg/arpg-game-world/commit/79b9075fd55c3336669076e09df7064ba56e6522), profile `full`. 710,955 episodes, 151.1 core-hours, 309 minutes end to end. [Run](https://github.com/arianna-arpg/arpg-game-world/actions/runs/43711749636).

## ✅ No regressions

Every committed baseline holds, nothing crashed, and the matrix has no new defects since last night.

## What moved since last night

34 row(s) moved past their own noise and 10%. Largest first:

| row | before | after | change |
|---|---:|---:|---:|
| `monster:frost_witch:warrior:L5:veteran` | 0.41 | 1.53 | +273% |
| `monster:fungal_heartbloom:magician:L25:ttk` | 0 | 22.58 | +100% |
| `monster:vessel_thulvane:warrior:L12:ttk` | 24.17 | 0 | −100% |
| `monster:deadwake_bonelord:magician:L25:ttk` | 0 | 23.63 | +100% |
| `monster:pit_lord:warrior:L12:ttk` | 0 | 23 | +100% |
| `monster:grave_hag:warrior:L25:ttk` | 20.08 | 0 | −100% |
| `monster:vampire_countess:warrior:L5:ttk` | 24.32 | 0 | −100% |
| `monster:vault_sphinx:warrior:L25:ttk` | 0 | 23.17 | +100% |
| `monster:hill_giant:warrior:L25:ttk` | 0 | 21.82 | +100% |
| `monster:mire_hag:warrior:L12:ttk` | 0 | 24.6 | +100% |
| `monster:winter_king:magician:L25:ttk` | 19.08 | 0 | −100% |
| `monster:ult_woken_hollow:magician:L12:ttk` | 23.98 | 0 | −100% |
| `monster:mere_sovereign:warrior:L5:ttk` | 0 | 24.95 | +100% |
| `monster:vessel_vexira:warrior:L25:ttk` | 0 | 24.9 | +100% |
| `monster:vampire_countess:warrior:L25:ttk` | 0 | 23.35 | +100% |
| `monster:patient_zero:magician:L25:ttk` | 21.23 | 0 | −100% |
| `monster:lord_morgrath:warrior:L25:ttk` | 23.73 | 0 | −100% |
| `monster:crypt_lich:warrior:L5:ttk` | 20.13 | 0 | −100% |
| `monster:vessel_thulvane:warrior:L25:ttk` | 0 | 22.82 | +100% |
| `monster:ult_woken_hollow:warrior:L25:ttk` | 0 | 24.03 | +100% |
| `monster:cistern_crone:warrior:L5:ttk` | 0 | 24.95 | +100% |
| `monster:wick_keeper:warrior:L25:ttk` | 22.94 | 0 | −100% |
| `monster:gravecaller:magician:L5:ttk` | 16.5 | 24 | +46% |
| `monster:tide_vicar:warrior:L12:ttk` | 18.53 | 10.93 | −41% |
| `monster:deadwake_grave_wight:warrior:L5:ttk` | 11.36 | 15.36 | +35% |

## Top proposed numbers

Advisory. Nothing here has been applied, and each needs your sign-off. Each row re-measured the subject on dice the night had not seen, solved for a number through the real game, and verified it at common seeds. 30 outlier(s) did not hold up on fresh dice, or landed within 15% of their target, and were dropped.

| # | subject | change | metric: before → after | cohort target | verdict | guards |
|---:|---|---|---|---:|---|---|
| 1 | class `trapper` | `skills.caltrops.baseDamage.physical.0`: 3 → 7.5 (+1 lines, ×2.5) | kill_rate: 0 → 0.1 | 0.1 | moved | none moved |
| 2 | skill `shambler_horde` | `monsters.grave_shambler.explodeOnDeath`: 2.2 → 0.88 | dps_dummy: 19394.7 → 7757.9 | 680.5 | moved, closes 62% | none moved |
| 3 | skill `arclight_rain` | `skills.arclight_rain.baseDamage.physical.0`: 5 → 2 (+3 lines, ×0.4) | dps_dummy: 347.5 → 139 | 93.2 | moved, closes 82% | none moved |
| 4 | skill `marshlight` | `skills.marshlight.baseDamage.chaos.0`: 9 → 3.6 (+1 lines, ×0.4) | dps_dummy: 266.1 → 106.5 | 98.9 | moved | none moved |
| 5 | skill `mirespume` | `skills.mirespume.baseDamage.chaos.0`: 11 → 4.5 (+1 lines, ×0.41) | dps_dummy: 246 → 100.8 | 98.9 | moved | none moved |
| 6 | skill `infernal_bombardment` | `monsters.bombard_demon.explodeOnDeath`: 1.6 → 0.67 | dps_dummy: 15920.9 → 6707.2 | 6676.7 | moved | none moved |
| 7 | support `fire_walker` | `supports.fire_walker.mods.0.value`: 0.5 → 0.2 (+1 lines, ×0.4) | dps_dummy: 60.9 → 31.2 | 17.6 | moved, closes 69% | none moved |
| 8 | skill `glare_ice` | `skills.glare_ice.baseDamage.cold.0`: 4 → 10 (+1 lines, ×2.5) | dps_dummy: 1.3 → 3.3 | 4 | moved, closes 73% | none moved |
| 9 | skill `trailblaze` | `skills.trailblaze.baseDamage.fire.0`: 6 → 2.8 (+1 lines, ×0.46) | dps_dummy: 65.4 → 31.3 | 31.1 | moved | none moved |
| 10 | class `hivecaller` | `classes.hivecaller.attributes.strength`: 2 → 5 (+9 lines, ×2.5) | kill_rate: 0 → 0.1 | 0.2 | moved, closes 31% | mana_floor_pct 64.6→80.2 |
| 11 | support `sundering_flight` | `supports.sundering_flight.fissureTrail.damageScale`: 0.4 → 0.16 | dps_dummy: 49.5 → 30.1 | 19.3 | moved, closes 64% | none moved |
| 12 | skill `keening_shriek` | `skills.keening_shriek.baseDamage.physical.0`: 4 → 7.2 (+1 lines, ×1.8) | dps_dummy: 1.9 → 3.4 | 3.6 | moved | none moved |
| 13 | support `volley` | `supports.volley.mods[stat=damage].value`: -0.25 → -0.63 | dps_dummy: 93.4 → 46.7 | 55.3 | moved | none moved |
| 14 | monster_threat `seatless_usher` | `skills.ushers_lull.baseDamage.chaos.0`: 4 → 10 (+1 lines, ×2.5) | dps_in: 0 → 7.4 | 7.4 | moved | none moved |
| 15 | monster_threat `lidless_watcher` | `skills.gaze_beam.baseDamage.chaos.0`: 4 → 9.2 (+1 lines, ×2.3) | dps_in: 0.4 → 7.4 | 7.4 | moved | none moved |

<details><summary>Repro commands</summary>

1. `npm run sim -- whatif --knob 'skills.caltrops.baseDamage*2.5' --scenarios pressure:trapper:30 --seeds 30 --base-seed 945006097`. Same change at other bands: `pressure:trapper:5` 0.5→0.6, `pressure:trapper:10` 0.2→0.6, `pressure:trapper:20` 0.1→0.3, `pressure:trapper:40` 0→0
2. `npm run sim -- whatif --knob 'monsters.grave_shambler.explodeOnDeath*0.4' --scenarios skill:shambler_horde:40 --seeds 30 --base-seed 945006097`. Other dials on this metric (elasticity): cooldown -0.71, useTime -0.36. Same change at other bands: `skill:shambler_horde:5` 257.8→103.1, `skill:shambler_horde:10` 768.4→307.4, `skill:shambler_horde:20` 3055.9→1222.4
3. `npm run sim -- whatif --knob 'skills.arclight_rain.baseDamage*0.4' --scenarios skill:arclight_rain:40 --seeds 30 --base-seed 945006097`. Other dials on this metric (elasticity): baseDamage 1, useTime 0.19, cooldown -0.18. Same change at other bands: `skill:arclight_rain:5` 152.9→61.1, `skill:arclight_rain:10` 185.4→74.2, `skill:arclight_rain:20` 234.3→93.7
4. `npm run sim -- whatif --knob 'skills.marshlight.baseDamage*0.4' --scenarios skill:marshlight:10 --seeds 30 --base-seed 945006097`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.61, manaCost -0.03. Same change at other bands: `skill:marshlight:5` 228→91.2, `skill:marshlight:20` 318.8→127.6, `skill:marshlight:40` 449.2→179.7
5. `npm run sim -- whatif --knob 'skills.mirespume.baseDamage*0.41' --scenarios skill:mirespume:10 --seeds 30 --base-seed 945006097`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.6. Same change at other bands: `skill:mirespume:5` 208.1→85.3, `skill:mirespume:20` 284.8→116.8, `skill:mirespume:40` 392→160.7
6. `npm run sim -- whatif --knob 'monsters.bombard_demon.explodeOnDeath*0.42' --scenarios skill:infernal_bombardment:40 --seeds 30 --base-seed 945006097`. Other dials on this metric (elasticity): cooldown -0.83. Same change at other bands: `skill:infernal_bombardment:5` 241→104.3, `skill:infernal_bombardment:10` 688.6→294.5, `skill:infernal_bombardment:20` 2625.7→1110.5
7. `npm run sim -- whatif --knob 'supports.fire_walker.mods*0.4' --scenarios socketed:phoenix_dive:fire_walker:20 --seeds 30 --base-seed 945006097`
8. `npm run sim -- whatif --knob 'skills.glare_ice.baseDamage*2.5' --scenarios skill:glare_ice:40 --seeds 30 --base-seed 945006097`. Other dials on this metric (elasticity): cooldown -1.2, baseDamage 1. Same change at other bands: `skill:glare_ice:5` 0.8→2, `skill:glare_ice:10` 0.9→2.2, `skill:glare_ice:20` 1→2.6
9. `npm run sim -- whatif --knob 'skills.trailblaze.baseDamage*0.46' --scenarios skill:trailblaze:20 --seeds 30 --base-seed 945006097`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.79. Same change at other bands: `skill:trailblaze:5` 50.4→24.6, `skill:trailblaze:10` 56.1→27.2, `skill:trailblaze:40` 86.1→40.3
10. `npm run sim -- whatif --knob 'classes.hivecaller.attributes*2.5' --scenarios pressure:hivecaller:5 --seeds 30 --base-seed 945006097`. Same change at other bands: `pressure:hivecaller:10` 0.1→0.1, `pressure:hivecaller:20` 0.1→0.1, `pressure:hivecaller:40` 0.1→0.1
11. `npm run sim -- whatif --knob 'supports.sundering_flight.fissureTrail.damageScale*0.4' --scenarios socketed:ball_lightning:sundering_flight:20 --seeds 30 --base-seed 945006097`
12. `npm run sim -- whatif --knob 'skills.keening_shriek.baseDamage*1.8' --scenarios skill:keening_shriek:40 --seeds 30 --base-seed 945006097`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.75. Same change at other bands: `skill:keening_shriek:5` 1.2→2.1, `skill:keening_shriek:10` 1.3→2.4, `skill:keening_shriek:20` 1.5→2.8
13. `npm run sim -- whatif --knob 'supports.volley.mods[stat=damage].value*2.5' --scenarios socketed:soulflay:volley:20 --seeds 30 --base-seed 945006097`
14. `npm run sim -- whatif --knob 'skills.ushers_lull.baseDamage*2.5' --scenarios threat:starter_magician_l25:seatless_usher:25 --seeds 30 --base-seed 945006097`. Other dials on this metric (elasticity): kit.ushers_lull 22.92. Same change at other bands: `threat:starter_magician_l5:seatless_usher:5` 2.1→5.2, `threat:starter_magician_l10:seatless_usher:10` 0.8→5, `threat:starter_magician_l20:seatless_usher:20` 0.7→7.4, `threat:starter_magician_l40:seatless_usher:40` 0.4→11.5
15. `npm run sim -- whatif --knob 'skills.gaze_beam.baseDamage*2.3' --scenarios threat:starter_magician_l25:lidless_watcher:25 --seeds 30 --base-seed 945006097`. Other dials on this metric (elasticity): kit.gaze_beam 9.08. Same change at other bands: `threat:starter_magician_l5:lidless_watcher:5` 2.1→4.8, `threat:starter_magician_l10:lidless_watcher:10` 1→4.8, `threat:starter_magician_l20:lidless_watcher:20` 1.2→7.1, `threat:starter_magician_l40:lidless_watcher:40` 1→11.3

Run from commit `79b9075fd55c3336669076e09df7064ba56e6522`.
</details>

Too noisy to call: class `firebrand`, class `apothecary`, class `assassin`, skill `requiem`, class `sharper`. The solved number moved each by less than its own seed-to-seed spread, so these need a calmer rig or more seeds before they mean anything.

### Combinations that run away

Confirmed on fresh dice at 20 times or more what their parts predict. A number this far out usually means damage feeding itself, so no single number fixes it: each needs a call on whether the feedback should be bounded.

- `class:berserker + primary:devouring_swarm + unique:cinderstep + support:unleash`: measured 5.7e+12 damage per second, its parts predict 270777.3. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZGV2b3VyaW5nX3N3YXJtIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MX0seyJpZCI6ImNvbWJ1c3Rpb25fc3RyaWtlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2Vpc21pY19tYXJjaCIsImFjY2VsZXJhdGVkIiwidW5sZWFzaCIsInNjYXR0ZXJlZF9jYXNjYWRlIl19LHsiaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5In0seyJpZCI6ImVtYmVyYmluZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImZsZWV0aW5nX2Rldm90aW9uIiwic2xvd19icmV3IiwibWVhc3VyZWRfYmxhZGUiLCJibG9vZF90b2xsIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjo1NDQxNDg5MDksInVuaXF1ZXMiOnsiYm9vdHMiOiJjaW5kZXJzdGVwIiwiZ2xvdmVzIjoiZ2FsZXdyaWdodHMifX0:spar --seeds 30 --base-seed 945006097`</details>
- `class:brawler + support:momentum + support:grasping_tendrils + unique:gravebloom`: measured 3.1e+8 damage per second, its parts predict 1347.6. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJicmF3bGVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImV2aXNjZXJhdGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJncmFzcGluZ190ZW5kcmlscyIsImdpYW50c2JhbmUiLCJhenVyZV9oYXJ2ZXN0Iiwic2VyZW5lX3Bvd2VyIl0sImxpbWIiOjF9LHsiaWQiOiJzaGF0dGVyY2hvcmQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInJlc291bmRpbmdfZWNobyIsImNhc2NhZGUiXSwibGltYiI6MX0seyJpZCI6ImJhbGxfbGlnaHRuaW5nIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsibW9tZW50dW0iLCJxdWFpbGJhbmUiXX0seyJpZCI6Im1lbmRlcl9yZWxpYyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImNhc3Rfb25fZGFtYWdlX3Rha2VuIl19XSwib2ZmIjoiY3JpdCIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjo5MjI2OTg3MDMsInVuaXF1ZXMiOnsiYW11bGV0Ijoicm91bmRlbGF5IiwiaGVsbWV0IjoiZ3JhdmVibG9vbSJ9fQ:spar --seeds 30 --base-seed 945006097`</details>
- `class:berserker + primary:devouring_swarm + support:unleash + support:scattered_cascade`: measured 2.2e+8 damage per second, its parts predict 31283.5. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZGV2b3VyaW5nX3N3YXJtIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MX0seyJpZCI6ImNvbWJ1c3Rpb25fc3RyaWtlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2Vpc21pY19tYXJjaCIsImFjY2VsZXJhdGVkIiwidW5sZWFzaCIsInNjYXR0ZXJlZF9jYXNjYWRlIl19LHsiaWQiOiJmbGFtZV9ibGFzdCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiYWNjZWxlcmFuZG8iLCJlZmZpY2llbmN5Il19LHsiaWQiOiJyZXB1bHNvcl9iZWFjb24iLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImNhc3Rfb25fYmxlZWQiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjg2OTc4ODUxNywidW5pcXVlcyI6eyJnbG92ZXMiOiJnYWxld3JpZ2h0cyIsImhlbG1ldCI6ImhhbG9fbmludGhfY2hvaXIifX0:spar --seeds 30 --base-seed 945006097`</details>
- `class:berserker + support:unleash + support:scattered_cascade + support:seismic_march`: measured 1.6e+8 damage per second, its parts predict 2444.2. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZ3JpdF9zdGFuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiLCJvdmVybWF0Y2giLCJvc3RpbmF0byJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJhY2NlbGVyYW5kbyIsImVmZmljaWVuY3kiXX0seyJpZCI6InJlcHVsc29yX2JlYWNvbiIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZmxlZXRmb290Il19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjg2OTc4ODUxNywidW5pcXVlcyI6eyJhbXVsZXQiOiJib3Jyb3dlZF9icmVhdGgiLCJnbG92ZXMiOiJnYWxld3JpZ2h0cyJ9fQ:spar --seeds 30 --base-seed 945006097`</details>
- `class:berserker + unique:cinderstep + support:unleash + support:scattered_cascade`: measured 8482471.3 damage per second, its parts predict 12346.1. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZ3JpdF9zdGFuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiLCJvdmVybWF0Y2giLCJvc3RpbmF0byJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJodW50ZXJzX21vbWVudHVtIiwib3Bwb3J0dW5pc3QiXX0seyJpZCI6ImNydW1ibGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJjYXN0X29uX2lnbml0aW9uIiwiY2hhbWJlcmVkX2Nhc3RpbmciLCJjb25jZW50cmF0ZWQiLCJ1bnN0YWJsZV9jb21wcmVzc2lvbiJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjo4Njk3ODg1MTcsInVuaXF1ZXMiOnsiYm9vdHMiOiJjaW5kZXJzdGVwIiwiZ2xvdmVzIjoiZ2FsZXdyaWdodHMifX0:spar --seeds 30 --base-seed 945006097`</details>
- `class:sentinel + support:fresh_ranks + support:triangle_sigil + unique:storm_tithe`: measured 7666.3 damage per second, its parts predict 22.6. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJzZW50aW5lbCIsImx2bCI6MjAsInNraWxscyI6W3siaWQiOiJ0b3hpY19kb21haW4iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJjYXN0X29uX2NyaXQiLCJ0cmlhbmdsZV9zaWdpbCJdfSx7ImlkIjoic2hhbWJsZXJfaG9yZGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJmcmVzaF9yYW5rcyJdLCJsaW1iIjoxfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJsaWZlIiwiZ2VhciI6InJhcmUiLCJncyI6MTQ5NjY5ODQ4MiwidW5pcXVlcyI6eyJiZWx0Ijoic3Rvcm1fdGl0aGUifX0:spar --seeds 30 --base-seed 945006097`</details>
- `class:hivecaller + support:culminant_frenzy + support:pressure_seal + support:desperate_measures`: measured 908.5 damage per second, its parts predict 4.6. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJoaXZlY2FsbGVyIiwibHZsIjoxMCwic2tpbGxzIjpbeyJpZCI6ImNvcnBzZV9mZWFzdCIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJjbGFtb3IiLCJkZXNwZXJhdGVfbWVhc3VyZXMiLCJwcmVzc3VyZV9zZWFsIl19LHsiaWQiOiJsb29zZV9tYXJyb3dncnVicyIsInJhcml0eSI6Im1hZ2ljIiwib3ZlciI6MSwic3VwcG9ydHMiOlsiY3VsbWluYW50X2ZyZW56eSIsIm92ZXJicmltIl19LHsiaWQiOiJkZWNveSIsInJhcml0eSI6InJhcmUiLCJzdXBwb3J0cyI6WyJmcmFnbWVudGF0aW9uIiwiZW5kdXJpbmdfc25hcmVzIiwiYWZ0ZXJzcHJheSJdLCJsaW1iIjowfSx7ImlkIjoiaW5mZXJuYWxfYm9tYmFyZG1lbnQiLCJyYXJpdHkiOiJyYXJlIiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2NhdHRlcmVkX2Nhc2NhZGUiLCJlbmR1cmluZ19ib25kIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjEwNDA4ODMwNzEsInVuaXF1ZXMiOnsiZ2xvdmVzIjoicm90ZV9oYW5kIiwicmluZzEiOiJjb21tb25fcHVsc2UifX0:spar --seeds 30 --base-seed 945006097`</details>
- `class:cryomancer + support:legion_call + unique:emberbrand + support:no_mans_land`: measured 108.5 damage per second, its parts predict 1.7. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJjcnlvbWFuY2VyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoiYmVja29uX3BhbGV3aXNwcyIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsid2VhdGhlcnZhbmUiXX0seyJpZCI6ImFsYXJtX3JlZWsiLCJyYXJpdHkiOiJtYWdpYyIsIm92ZXIiOjEsInN1cHBvcnRzIjpbIm5vX21hbnNfbGFuZCJdfSx7ImlkIjoic3VtbW9uX3JhZ2luZ19zcGlyaXQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImxlZ2lvbl9jYWxsIl0sImxpbWIiOjB9XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjo2NjM5MTkwOSwidW5pcXVlcyI6eyJib290cyI6ImZsZWV0ZmVhdGhlciIsInJpbmcxIjoiZW1iZXJicmFuZCJ9fQ:spar --seeds 30 --base-seed 945006097`</details>
- `class:skald + support:dive_bomb + unique:cinderstep + support:summon_phantasm`: measured 69.2 damage per second, its parts predict 0.3. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJza2FsZCIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJsYXlfb25faGFuZHMiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsiY2FzdF9vbl9vdmVyY2hhcmdlIiwic2VyZW5lX3Bvd2VyIiwibWVuZGluZ19lY2hvZXMiXX0seyJpZCI6ImhheW1ha2VyIiwicmFyaXR5IjoicmFyZSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbIm1pbmVyYWxfdHVuaW5nIiwic3VtbW9uX3BoYW50YXNtIiwiY2FzdF93aGlsZV9ndWFyZGluZyJdLCJsaW1iIjowfSx7ImlkIjoid2FycCIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJwcmVzc3VyZV9zZWFsIiwiYWNjZWxlcmF0ZWQiLCJkaXZlX2JvbWIiXSwibGltYiI6MX0seyJpZCI6InN1cmdld2luZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInJhdmVuaW5nIiwicmVnaWNpZGUiLCJ0aG91Z2h0YnVybiIsInNsb3dfbWF0Y2giXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjQxMzEwMTcyNywidW5pcXVlcyI6eyJiZWx0IjoicGFsZV9iYXJnYWluIiwiYm9vdHMiOiJjaW5kZXJzdGVwIn19:spar --seeds 30 --base-seed 945006097`</details>
- `class:resonator + support:accelerando + support:efficiency + unique:emberbrand`: measured 47 damage per second, its parts predict 0.7. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJyZXNvbmF0b3IiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJiZWNrb25fcGFsZXdpc3BzIiwicmFyaXR5IjoibWFnaWMiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJzcGVudGJhbmUiLCJyaXR1YWxfZ3JvdW5kIl19LHsiaWQiOiJmbGFtZV9ibGFzdCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiYWNjZWxlcmFuZG8iLCJlZmZpY2llbmN5Il19LHsiaWQiOiJyZXB1bHNvcl9iZWFjb24iLCJyYXJpdHkiOiJtYWdpYyJ9XSwib2ZmIjoiY3JpdCIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoibWFnaWMiLCJncyI6NjI1MTE2NDQ1LCJ1bmlxdWVzIjp7ImJlbHQiOiJibG9vZGxldHRlcnNfZ2lyZGxlIiwicmluZzEiOiJlbWJlcmJyYW5kIn19:spar --seeds 30 --base-seed 945006097`</details>

### Flagged for your decision

The numbers an author would reach for did not move these enough. They are not proposals: each needs a call on whether the mechanic is right, and none has been touched.

- class `chronomancer`: The numbers an author would reach for barely move this: skills.stasis_lock.baseDamage ×2.5 closes 10%; classes.chronomancer.attributes ×2.5 closes 2%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- skill `hurricane`: The numbers an author would reach for barely move this: skills.hurricane.baseDamage ×2.5 closes 14%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `wallwright`: The numbers an author would reach for barely move this: skills.stone_rampart.baseDamage ×1 closes 0%; skills.toppling_stroke.baseDamage ×2.5 closes 16%; skills.shield_charge.baseDamage ×1 closes 0%; skills.stone_rampart.baseDamage & skills.toppling_stroke.baseDamage & skills.shield_charge.baseDamage ×2.5 closes 16%; classes.wallwright.attributes ×2.5 closes 5%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- support `septic_bargain`: The numbers an author would reach for barely move this: supports.septic_bargain.mods ×2.5 closes 9%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `necromancer`: The numbers an author would reach for barely move this: skills.poison_nova.baseDamage ×0.4 closes 5%; skills.despair.baseDamage ×1 closes 0%; skills.poison_nova.baseDamage & skills.despair.baseDamage ×0.4 closes 5%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `beguiler`: The numbers an author would reach for barely move this: skills.beguile.baseDamage ×1 closes 0%; classes.beguiler.attributes ×2.5 closes 10%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- support `resounding_echo`: The numbers an author would reach for barely move this: supports.resounding_echo.mods ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `stygian_doll`: The numbers an author would reach for barely move this: monsters.stygian_doll.base.life ×2.5 closes 3%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `amalgam_fleshweaver`: The numbers an author would reach for barely move this: monsters.amalgam_fleshweaver.base.life ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.

## Outliers

441 rows sit far from their cohort (log-scale median and MAD, z ≥ 3 and a ratio past 1.8× or 0.55×), 37 of them new tonight. Warned rows and zero rows never enter a cohort.

| | kind | subject | metric | value | cohort median | ratio | z | cohort |
|---|---|---|---|---:|---:|---:|---:|---|
|  | support | `sundering_flight` | output_multiplier | 3 | 1 | 2.9× | 18.2 | supports · effective hosts |
|  | support | `fire_walker` | output_multiplier | 2.8 | 1 | 2.74× | 17.2 | supports · effective hosts |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.05× | -15.1 | L30 · geared · pressure · kill_rate |
|  | support | `scorched_wake` | output_multiplier | 2.4 | 1 | 2.33× | 14.4 | supports · effective hosts |
|  | monster_threat | `seatless_usher` | dps_in | 0 | 17 | 0× | -14.1 | L25 · magician · body |
|  | support | `mounting_frenzy` | output_multiplier | 2.3 | 1 | 2.27× | 14 | supports · effective hosts |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.07× | -13.7 | L20 · geared · pressure · kill_rate |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.05× | -12.9 | L40 · geared · pressure · kill_rate |
|  | monster_threat | `banshee` | dps_in | 0 | 17 | 0× | -12.8 | L25 · magician · body |
| 🆕 | interaction | `class:brawler + support:momentum + support:grasping_tendrils + unique:gravebloom` | dps_out | 1.2e+8 | 1347.6 | 91484.96× | 12.7 | L40 main effects |
|  | support | `austerity` | output_multiplier | 0.5 | 1 | 0.48× | -12.6 | supports · effective hosts |
| 🆕 | interaction | `class:berserker + primary:devouring_swarm + unique:cinderstep + support:unleash` | dps_out | 1.5e+10 | 270777.3 | 54696.12× | 12.1 | L40 main effects |
|  | support | `resounding_echo` | output_multiplier | 2.1 | 1 | 2.04× | 12.1 | supports · effective hosts |
|  | support | `crescendo` | output_multiplier | 2.1 | 1 | 2.02× | 12 | supports · effective hosts |
|  | support | `septic_bargain` | output_multiplier | 0.5 | 1 | 0.5× | -12 | supports · effective hosts |
|  | class | `chronomancer` | kill_rate | 0 | 0.5 | 0.04× | -11.9 | L10 · geared · pressure · kill_rate |
|  | monster_threat | `formic_gluewright` | dps_in | 0 | 17 | 0× | -11.2 | L25 · magician · body |
| 🆕 | interaction | `class:berserker + support:unleash + support:scattered_cascade + support:seismic_march` | dps_out | 5.8e+7 | 2444.2 | 23872.77× | 11.2 | L40 main effects |
|  | support | `volley` | output_multiplier | 2 | 1 | 1.92× | 11.1 | supports · effective hosts |
| 🆕 | interaction | `class:berserker + primary:devouring_swarm + support:unleash + support:scattered_cascade` | dps_out | 5.7e+8 | 31283.5 | 18323.61× | 10.9 | L40 main effects |
| 🆕 | interaction | `class:brawler + support:momentum + support:grasping_tendrils + unique:gravebloom` | dps_out | 4.7e+7 | 3354.6 | 13973.63× | 10.6 | L40 main effects |
|  | support | `elemental_conduction` | output_multiplier | 1.9 | 1 | 1.82× | 10.2 | supports · effective hosts |
|  | monster_threat | `hadal_lantern` | dps_in | 0.1 | 15.2 | 0× | -10 | L12 · magician · body |
| 🆕 | interaction | `class:brawler + support:momentum + support:grasping_tendrils + unique:gravebloom` | dps_out | 4893753.6 | 1364.8 | 3585.64× | 9.1 | L40 main effects |
|  | affix | `attr_willpower` | dps_out | 134.4 | 150.5 | 0.06× | -9.1 | L20 · magician · affix output |

<details><summary>Re-measure any of these</summary>

- sundering_flight: `npm run sim -- run --refs socketed:ball_lightning:sundering_flight:20 --seeds 10`
- fire_walker: `npm run sim -- run --refs socketed:phoenix_dive:fire_walker:20 --seeds 10`
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:30:geared --seeds 10`
- scorched_wake: `npm run sim -- run --refs socketed:blinding_ichor:scorched_wake:20 --seeds 10`
- seatless_usher: `npm run sim -- run --refs threat:starter_magician_l25:seatless_usher:25 --seeds 10`
- mounting_frenzy: `npm run sim -- run --refs socketed:serpent_ray:mounting_frenzy:20 --seeds 10`
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:20:geared --seeds 10`
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:40:geared --seeds 10`
- banshee: `npm run sim -- run --refs threat:starter_magician_l25:banshee:25 --seeds 10`
- austerity: `npm run sim -- run --refs socketed:corpse_explosion:austerity:20 --seeds 10`
- resounding_echo: `npm run sim -- run --refs socketed:aftershock_snare:resounding_echo:20 --seeds 10`
- crescendo: `npm run sim -- run --refs socketed:immolation_blast:crescendo:20 --seeds 10`
- septic_bargain: `npm run sim -- run --refs socketed:pillar_of_flame:septic_bargain:20 --seeds 10`
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:10:geared --seeds 10`
- formic_gluewright: `npm run sim -- run --refs threat:starter_magician_l25:formic_gluewright:25 --seeds 10`
- volley: `npm run sim -- run --refs socketed:soulflay:volley:20 --seeds 10`
- elemental_conduction: `npm run sim -- run --refs socketed:ballista_sentry:elemental_conduction:20 --seeds 10`
- hadal_lantern: `npm run sim -- run --refs threat:starter_magician_l12:hadal_lantern:12 --seeds 10`
- attr_willpower: `npm run sim -- run --refs affix:magician:20:helmet:attr_willpower:5352222:spar --seeds 10`

</details>

## Build search

93,861 candidates tonight (21,175 refused by the real gates), 1,136,110 over 17 night(s). The archive holds 1433 elite rows; 1413 were re-measured on this commit. Tried so far in a legal build: 39 of 39 classes, 576 of 576 primarys, 604 of 604 skills, 455 of 455 supports, 41 of 41 uniques.

| band | objective | build (top factors) | value | × band median | repro |
|---|---|---|---:|---:|---|
| L5 | offense | `class:runeweaver` `off:crit` `def:life` `gear:rare` `skill:orb_of_storms` | 67366.8 | 1780.4× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoib3JiX29mX3N0b3JtcyIsInJhcml0eSI6Im1hZ2ljIiwib3ZlciI6Miwic3VwcG9ydHMiOlsiaHVudGVyc19tb21lbnR1bSIsInJlZ2ljaWRlIl19LHsiaWQiOiJzdG9ybWJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJ0ZW1wZXN0X3JhbmdlIl19LHsiaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJmbGVldGluZ19kZXZvdGlvbiIsImJvbmRicmVha2VyIiwiYWNjZWxlcmFuZG8iLCJibG9vZF90b2xsIl19LHsiaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiY2FzY2FkZV9vZl9rbml2ZXMiLCJtb3VudGluZ19mcmVuenkiLCJwYXJ0aW5nX2p1ZGdlbWVudCIsInN1bmRlcmluZ19mbGlnaHQiXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjE0MzcyMjkwODksInVuaXF1ZXMiOnsiYW11bGV0Ijoic3Rvcm1jYWxsIiwicmluZzEiOiJlbWJlcmJyYW5kIn19 --seeds 8 --base-seed 1806369559`</details> |
| L5 | offense | `class:runeweaver` `off:speed` `def:ward` `gear:rare` `skill:voltaic_orb` | 43028.2 | 1137.2× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoidm9sdGFpY19vcmIiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInBlcmZlY3RfZHJhdyJdfSx7ImlkIjoic3Rvcm1iaW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsidGVtcGVzdF9yYW5nZSJdfSx7ImlkIjoiY29sZF92b3J0ZXgiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInJlc291bmRpbmdfZWNobyJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImFjY2VsZXJhdGVkIiwiZGVlcF9yZXNlcnZlcyIsInBhcnRpbmdfanVkZ2VtZW50Iiwic3BsaXR0aW5nIl19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJ3YXJkIiwiZ2VhciI6InJhcmUiLCJncyI6NDg1MjY5NTgsInVuaXF1ZXMiOnsiYW11bGV0Ijoic3Rvcm1jYWxsIiwicmluZzEiOiJlbWJlcmJyYW5kIn19 --seeds 8 --base-seed 2798126700`</details> |
| L5 | clear | `class:pyromancer` `off:crit` `def:armor` `gear:rare` `skill:mark` | 6 | 18.3× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJweXJvbWFuY2VyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoibWFyayIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVnaWNpZGUiLCJjcm93ZF9mYXZvciJdfSx7ImlkIjoic2hhdHRlcmNob3JkIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJyZXNvdW5kaW5nX2VjaG8iLCJjYXNjYWRlIl0sImxpbWIiOjB9XSwib2ZmIjoiY3JpdCIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6MTQ1OTMzODAwMSwidW5pcXVlcyI6eyJib290cyI6ImZsZWV0ZmVhdGhlciJ9fQ --seeds 8 --base-seed 461277625`</details> |
| L5 | clear | `class:chronomancer` `off:damage` `def:none` `gear:rare` `skill:rolling_cannonade` | 6 | 18.3× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJyb2xsaW5nX2Nhbm5vbmFkZSIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiY29sb3NzYWwiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjoxNDMwNTA0OTA4LCJ1bmlxdWVzIjp7ImhlbG1ldCI6ImdyYXZlYmxvb20ifX0 --seeds 8 --base-seed 2783904260`</details> |
| L10 | offense | `class:magician` `off:speed` `def:ward` `gear:rare` `skill:summon_bone_golem` | 74091.5 | 2121.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJzdW1tb25fYm9uZV9nb2xlbSIsInJhcml0eSI6InJhcmUiLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiXSwibGltYiI6MH0seyJpZCI6ImdyYXNwaW5nX2NoYXNtIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiYmxvb2RfdG9sbCIsInNwbGludGVyZWRfZWFydGgiLCJhY2NlbGVyYW5kbyIsImRlc3BlcmF0aW9uIl19LHsiaWQiOiJmcm9zdGd1YXJkIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJyZWdpY2lkZSJdfSx7ImlkIjoiZnJvc3Rfc3Rvcm0iLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInBvbHlwaG9ueSIsInNwaXJpdF90b3RlbSJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjkzNjUyNDk0MywidW5pcXVlcyI6eyJoZWxtZXQiOiJnbGVhbmVyc19jcm93biIsImxlZ3MiOiJzcXVhbGxzdGVwIn19 --seeds 8 --base-seed 2657384943`</details> |
| L10 | offense | `class:summoner` `off:speed` `def:life` `gear:rare` `skill:detonate_mines` | 62141.7 | 1779.3× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzdW1tb25lciIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJlbWJhcmdvIiwic2xvd19tYXRjaCIsImNhc3Rfd2hpbGVfZ3VhcmRpbmciXX0seyJpZCI6Im1hcmsiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiXX0seyJpZCI6ImVtYmVyYmluZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImZsZWV0aW5nX2Rldm90aW9uIiwic2xvd19icmV3IiwibWVhc3VyZWRfYmxhZGUiLCJibG9vZF90b2xsIl19LHsiaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsibW91bnRpbmdfZnJlbnp5Iiwidm9sbGV5IiwicGFydGluZ19qdWRnZW1lbnQiLCJwcmVzc3VyZV9zZWFsIl19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJsaWZlIiwiZ2VhciI6InJhcmUiLCJncyI6MTQ0ODk0NzkxNiwidW5pcXVlcyI6eyJib290cyI6InJpbWV3YWtlIiwiY2hlc3QiOiJncm91bmRlZF9sYXR0aWNlIn19 --seeds 8 --base-seed 9993150`</details> |
| L10 | clear | `class:skald` `off:damage` `def:armor` `gear:rare` `skill:marshals_rift` | 6 | 21.4× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJza2FsZCIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJtYXJzaGFsc19yaWZ0IiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbImJyb29kX3RlbmRlciJdfSx7ImlkIjoiZG9vbV9iZWxsIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsibWVhc3VyZWRfYmxhZGUiXX0seyJpZCI6ImtlZW5pbmdfc2hyaWVrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsic3F1YXJlX3NpZ2lsIl19LHsiaWQiOiJmdXJvciIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInBvdGVuY3kiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjE0ODI3NDM1MjV9 --seeds 8 --base-seed 1237388740`</details> |
| L10 | clear | `class:summoner` `off:damage` `def:ward` `gear:rare` `skill:detonate_mines` | 6 | 21.4× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzdW1tb25lciIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6InJhcmUifSx7ImlkIjoiZG9vbV9iZWxsIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2hhdHRlcmdsYXNzIl19LHsiaWQiOiJiZWNrb25fcGFsZXdpc3BzIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbIm1vdW50aW5nX2ZyZW56eSJdfSx7ImlkIjoic2hhdHRlcmNob3JkIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJyZXNvdW5kaW5nX2VjaG8iLCJjYXNjYWRlIl0sImxpbWIiOjF9XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjE5ODMzMzE1NTMsInVuaXF1ZXMiOnsiaGVsbWV0IjoiZ3JhdmVibG9vbSIsInJpbmcxIjoiY29tbW9uX3B1bHNlIn19 --seeds 8 --base-seed 9993150`</details> |
| L20 | offense | `class:apothecary` `off:damage` `def:armor` `gear:rare` `skill:mark` | 355093.4 | 5546.3× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJhcG90aGVjYXJ5IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6Im1hcmsiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzcGVudGJhbmUiLCJzdG9yZWRfdmVyZGljdCIsImF1c3Rlcml0eSIsInNsb3dfYnJldyJdfSx7ImlkIjoiZGV2b3VyaW5nX3N3YXJtIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MX0seyJpZCI6ImNvbWJ1c3Rpb25fc3RyaWtlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2Vpc21pY19tYXJjaCIsImFjY2VsZXJhdGVkIiwidW5sZWFzaCIsInNjYXR0ZXJlZF9jYXNjYWRlIl19LHsiaWQiOiJmbGFtZV9ibGFzdCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiYWNjZWxlcmFuZG8iLCJlZmZpY2llbmN5Il19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjoxNTM3ODA0ODI3LCJ1bmlxdWVzIjp7ImhlbG1ldCI6ImNpbmRlcnZpZ2lsIn19 --seeds 8 --base-seed 1392141767`</details> |
| L20 | offense | `class:sentinel` `off:damage` `def:evasion` `gear:rare` `skill:requiem` | 207177.8 | 3236× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzZW50aW5lbCIsImx2bCI6MjAsInNraWxscyI6W3siaWQiOiJyZXF1aWVtIiwicmFyaXR5IjoibGVnZW5kYXJ5In0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzdW5kZXJpbmdfZmxpZ2h0Iiwic2xvd19icmV3IiwicGFydGluZ19qdWRnZW1lbnQiLCJtb3VudGluZ19mcmVuenkiXX0seyJpZCI6InBhaW5faG91bmRzIiwicmFyaXR5IjoibGVnZW5kYXJ5In1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6MTY4MTc2MjQzNywidW5pcXVlcyI6eyJib290cyI6InJpbWV3YWtlIiwiaGVsbWV0IjoiY2luZGVydmlnaWwifX0 --seeds 8 --base-seed 1658287581`</details> |
| L20 | clear | `class:resonator` `off:damage` `def:armor` `gear:rare` `skill:frost_pulse` | 6 | 24.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJyZXNvbmF0b3IiLCJsdmwiOjIwLCJza2lsbHMiOlt7ImlkIjoiZnJvc3RfcHVsc2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyfSx7ImlkIjoiZG9vbV9iZWxsIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2hhdHRlcmdsYXNzIiwiZmxvd2JyZWFrZXIiLCJ1cHJvb3RlciJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6MTY3MzQ5ODI5MX0 --seeds 8 --base-seed 2447046056`</details> |
| L20 | clear | `class:berserker` `off:crit` `def:evasion` `gear:rare` `skill:panther_pounce` | 6 | 24.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjIwLCJza2lsbHMiOlt7ImlkIjoicGFudGhlcl9wb3VuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJwb2ludF9ibGFuayIsIm1ldHJvbm9tZSIsInJhcmVmeSIsImRlZXBfcmVzZXJ2ZXMiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6MTEwMzQ5NzMzOSwidW5pcXVlcyI6eyJoZWxtZXQiOiJoYWxvX25pbnRoX2Nob2lyIn19 --seeds 8 --base-seed 1756097415`</details> |
| L40 | offense | `class:berserker` `off:damage` `def:armor` `gear:rare` `skill:devouring_swarm` | 955879.1 | 12660.7× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZGV2b3VyaW5nX3N3YXJtIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MX0seyJpZCI6ImNvbWJ1c3Rpb25fc3RyaWtlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2Vpc21pY19tYXJjaCIsImFjY2VsZXJhdGVkIiwidW5sZWFzaCIsInNjYXR0ZXJlZF9jYXNjYWRlIl19LHsiaWQiOiJmbGFtZV9ibGFzdCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiYWNjZWxlcmFuZG8iLCJlZmZpY2llbmN5Il19LHsiaWQiOiJyZXB1bHNvcl9iZWFjb24iLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImNhc3Rfb25fYmxlZWQiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjg2OTc4ODUxNywidW5pcXVlcyI6eyJib290cyI6ImNpbmRlcnN0ZXAiLCJnbG92ZXMiOiJnYWxld3JpZ2h0cyJ9fQ --seeds 8 --base-seed 1756097415`</details> |
| L40 | offense | `class:apothecary` `off:damage` `def:evasion` `gear:rare` `skill:blood_mortgage` | 907187.3 | 12015.7× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJhcG90aGVjYXJ5IiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImJsb29kX21vcnRnYWdlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiaW5zdWxhdGlvbiIsIndhcmRpbmdfZmxlc2giLCJzdG9yZWRfdmVyZGljdCJdLCJsaW1iIjowfSx7ImlkIjoic2hhbWJsZXJfaG9yZGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJwbHVzX21pbmlvbiIsInJhdmVub3VzX3BhY3QiLCJjYXNjYWRpbmdfY2FsbCIsImVwaGVtZXJhbCJdLCJsaW1iIjoxfSx7ImlkIjoiYmVyc2VyayIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImdpYW50c2JhbmUiLCJpbnN1bGF0aW9uIiwiYmxvb2RfcHJpY2UiLCJzZXJlbmVfcG93ZXIiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6NDcxNDczNDczLCJ1bmlxdWVzIjp7ImhlbG1ldCI6ImdyYXZlYmxvb20iLCJyaW5nMSI6ImNvbW1vbl9wdWxzZSJ9fQ --seeds 8 --base-seed 278057329`</details> |
| L40 | clear | `class:cleric` `off:speed` `def:ward` `gear:rare` `skill:frostbolt` | 6 | 21.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjbGVyaWMiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZnJvc3Rib2x0IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZGVlcF9yZXNlcnZlcyIsImNsb3NlX29yZGVyIiwib3Bwb3J0dW5pc3RzX2JsYWRlIiwibWFkZGVyaW5nIl19LHsiaWQiOiJkb29tX2JlbGwiLCJyYXJpdHkiOiJsZWdlbmRhcnkifV0sIm9mZiI6InNwZWVkIiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjE2Mzc4NzExNjYsInVuaXF1ZXMiOnsiYW11bGV0Ijoic3Rvcm1jYWxsIn19 --seeds 8 --base-seed 125525616`</details> |
| L40 | clear | `class:berserker` `off:speed` `def:life` `gear:rare` `skill:detonate_mines` | 6 | 21.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZGV0b25hdGVfbWluZXMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJkb21pbmlvbl90aXRoZSIsInN0b3JlZF92ZXJkaWN0IiwiY2hhbWJlcmVkX2Nhc3RpbmciLCJzZXJlbmVfcG93ZXIiXX0seyJpZCI6Imh1cmxfZGVicmlzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsibWFuYV9mZWVkZXIiXX0seyJpZCI6ImRvb21fYmVsbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbIm1lYXN1cmVkX2JsYWRlIl19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJsaWZlIiwiZ2VhciI6InJhcmUiLCJncyI6MTc3NDMxMDUyMiwidW5pcXVlcyI6eyJoZWxtZXQiOiJoYWxvX25pbnRoX2Nob2lyIn19 --seeds 8 --base-seed 1756097415`</details> |

Playstyles at L5, best build found per style against the band's median style (50 styles): strongest `construct · lightning` 66378.1 (5.46×), `self · fire` 43559.1 (3.58×), `projectile · lightning` 42719.7 (3.51×), `self · lightning` 36689 (3.02×); weakest `detonate · cold` 2026.9 (0.17×), `mark · cold` 4279.9 (0.35×), `mark · chaos` 4500.4 (0.37×), `aura · cold` 4653.8 (0.38×).

Playstyles at L10, best build found per style against the band's median style (50 styles): strongest `court · chaos` 74615 (1.69×), `detonate · fire` 62780.3 (1.42×), `aura · cold` 56917.6 (1.29×), `projectile · lightning` 56679.9 (1.29×); weakest `mark · cold` 9959.3 (0.23×), `mark · chaos` 11197.9 (0.25×), `detonate · chaos` 11943.3 (0.27×), `aura · chaos` 13701.1 (0.31×).

Playstyles at L20, best build found per style against the band's median style (50 styles): strongest `aura · physical` 484504.5 (3.82×), `melee · physical` 377356.5 (2.98×), `area · fire` 213847 (1.69×), `mark · fire` 204281.1 (1.61×); weakest `mark · chaos` 29296 (0.23×), `mark · lightning` 76962.1 (0.61×), `court · cold` 79010.3 (0.62×), `projectile · physical` 84276.7 (0.66×).

Playstyles at L40, best build found per style against the band's median style (50 styles): strongest `court · fire` 907716.7 (3.03×), `projectile · fire` 881347.5 (2.94×), `aura · fire` 869815.5 (2.9×), `target · chaos` 857388.5 (2.86×); weakest `court · chaos` 86395.3 (0.29×), `court · cold` 115741.5 (0.39×), `melee · cold` 118067.5 (0.39×), `self · lightning` 140469.6 (0.47×).

Main effects at L5 over 9434 rows: strongest `skill:grasping_chasm` 21.09×, `primary:venomous_aura` 16.29×, `skill:ice_shards` 9.92×, `primary:lay_brood_egg` 9.63×, `skill:emberbind` 8.91×; weakest `limb:shadow_step#1` 0.07×, `limb:war_chant#1` 0.11×, `skill:venomous_aura` 0.15×, `support:multistrike` 0.16×, `skill:glare_ice` 0.17×.

Main effects at L10 over 14879 rows: strongest `limb:verdict#1` 29.67×, `limb:summon_bone_golem#0` 22.34×, `skill:grasping_chasm` 21.6×, `skill:ice_shards` 15.61×, `primary:soulflay` 14.96×; weakest `limb:shadow_step#0` 0.04×, `skill:verdict` 0.04×, `limb:decoy#1` 0.05×, `limb:decoy#0` 0.06×, `limb:haymaker#0` 0.07×.

Main effects at L20 over 18742 rows: strongest `skill:grasping_chasm` 35.64×, `primary:voltaic_orb` 14.62×, `skill:ice_shards` 12.5×, `primary:strangler_seed` 12.49×, `skill:combustion_strike` 11.19×; weakest `primary:toxic_domain` 0.09×, `limb:war_chant#1` 0.11×, `support:reckless_transfusion` 0.12×, `limb:raise_gnatveil#1` 0.14×, `limb:warp#1` 0.15×.

Main effects at L40 over 19495 rows: strongest `primary:infernal_bombardment` 127.76×, `limb:shambler_horde#1` 38.34×, `skill:shambler_horde` 36.6×, `skill:ice_shards` 22.68×, `limb:summon_swarmlings#0` 20.94×; weakest `skill:summon_swarmlings` 0.08×, `limb:war_chant#0` 0.09×, `limb:war_chant#1` 0.09×, `limb:expose_weakness#0` 0.12×, `limb:beguile#1` 0.15×.

**Other combinations far off the sum of their parts**, confirmed on fresh dice (16 tried):

- `class:chronomancer + support:parting_judgement + support:volley + unique:stormcall`: measured 156.1, its parts predict 27794.2. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJsaWZlZHJhaW4iLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInByb3ZvY2F0aW9uIl19LHsiaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInVwcm9vdGVyIiwiY2FzdF93aGlsZV9ndWFyZGluZyJdfSx7ImlkIjoiZW1iZXJiaW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZmxlZXRmb290Iiwic2xvd19icmV3IiwicG9seXBob255IiwiYmxvb2RfdG9sbCJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInZvbGxleSIsImNoaWxsX2NoYW5jZSIsInBhcnRpbmdfanVkZ2VtZW50IiwidW5ibGlua2luZyJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjo0MTQ4MDI4ODMsInVuaXF1ZXMiOnsiYW11bGV0Ijoic3Rvcm1jYWxsIiwiZ2xvdmVzIjoidGl0YW5zX2dyYXNwIn19:spar --seeds 30 --base-seed 945006097`</details>
- `class:cryomancer + support:parting_judgement + support:splitting + support:summon_phantasm`: measured 88.5, its parts predict 25681.5. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJjcnlvbWFuY2VyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoibWFyayIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZG9taW5pb25fdGl0aGUiXX0seyJpZCI6ImZyb3N0X3N0b3JtIiwicmFyaXR5IjoibWFnaWMifSx7ImlkIjoiZW1iZXJiaW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiYXRfdGhlX2JyaW5rIiwic2xvd19icmV3IiwicG9seXBob255IiwiYmxvb2RfdG9sbCJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNwbGl0dGluZyIsInN1bW1vbl9waGFudGFzbSIsInBhcnRpbmdfanVkZ2VtZW50IiwidW5ibGlua2luZyJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjE0MTk2MTY3NjIsInVuaXF1ZXMiOnsiYm9vdHMiOiJmbGVldGZlYXRoZXIiLCJnbG92ZXMiOiJ0aXRhbnNfZ3Jhc3AifX0:spar --seeds 30 --base-seed 945006097`</details>
- `class:summoner + support:culminant_frenzy + support:umbral_power + support:mineral_tuning`: measured 0.4, its parts predict 144.7. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJzdW1tb25lciIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJqdWRnZW1lbnQiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsiY2FzdF9vbl9ibGVlZCIsInVubmVydmluZyIsIm1pbmVyYWxfdHVuaW5nIl19LHsiaWQiOiJpbXBlcmlvdXNfYmFycmFnZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImN1bG1pbmFudF9mcmVuenkiLCJyaXR1YWxfZ3JvdW5kIiwidW1icmFsX3Bvd2VyIl19LHsiaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJtZWFzdXJlZF9ibGFkZSIsImxpbWJyZWF2ZXIiLCJ3YXJkaW5nX2ZsZXNoIiwiZGVlcF9yZXNlcnZlcyJdfSx7ImlkIjoidGVsZXBvcnQiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsic3BlbnRiYW5lIiwiZGVlcF9yZXNlcnZlcyIsImFmdGVyc3ByYXkiXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6MjAyMDc1NTkyOH0:spar --seeds 30 --base-seed 945006097`</details>

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

**Support power**, median output change across the hosts each gem works on. Strongest: `sundering_flight` +199%, `fire_walker` +182%, `scorched_wake` +140%, `mounting_frenzy` +134%, `resounding_echo` +110%, `crescendo` +108%, `volley` +98%, `elemental_conduction` +87%. Weakest: `austerity` -51%, `septic_bargain` -49%, `pyre_legion` -36%, `rattling_salvo` -35%, `spirit_totem` -28%, `wraith_passage` -25%, `sweeping_blow` -20%, `nova_release` -20%.

**Against the target** of +10% to +15%: the median gem changes output by +7%. 22 in the band, 85 above it, 124 below it, 101 leave damage alone.

15 of these gems read off their own rig, because they need something a plain rig does not do: in the middle of a crowd (`alternating_strikes`, `unstable_flight`, `wild_abandon`, `tethered_orbit`, `gyre`, `vortex`, `sidewinder`, `trueflight`, `crosswind`); with a guard raised (`guarded_casting`); with a charge a second fed into its bank (`embargo`, `ravening`); against a plain dummy instead of a resistant one (`refraction`, `flameforged`, `rarefy`).

**Affix families** (211 measured on one magic piece against the same wardrobe without it, 11 never worn on the doll). Most output: `apply_poison` 1.95× on magician, `apply_poison` 1.75× on warrior, `apply_bleed` 1.62× on magician, `apply_bleed` 1.61× on warrior, `hadal_cold` 1.5× on magician, `hadal_cold` 1.44× on warrior, `creeper_barrow` 1.27× on warrior, `satellite_rime_wake` 1.22× on warrior. Most time survived: `life_on_evade` 1.93× on warrior, `barnacle_crust` 1.74× on warrior, `chitin_plate` 1.59× on warrior, `life_on_hit` 1.58× on warrior, `thorns` 1.54× on warrior, `life_on_evade` 1.53× on magician. Moved nothing on these rigs: 3 families.

**What buffs, hexes, heals and wards add** (196 skills whose own numbers are not damage, at L20, against the same hero without them). Most output beside a plain strike: `infernal_bombardment` 14.1×, `summon_plaguefather` 6.4×, `summon_fire_golem` 4.83×, `summon_flame_sprite` 4.77×, `flame_totem` 4.77×, `shambler_horde` 4.25×, `bind_familiar` 4.22×, `reaper_swarm` 3.88×. Most time survived on the clock: `repulsor_beacon` 11.85×, `summon_blade_wraith` 11.85×, `shambler_horde` 11.85×, `vampiric_presence` 11.85×, `call_the_rift` 10.98×, `reaper_swarm` 10.25×, `summon_wraith` 9.04×, `infernal_bombardment` 6.63×. 35 moved neither at any band: their value lies outside these rigs, or they do nothing.

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
Bestiary: 19656 rows measured, 100 bodies not fielded (passive or immortal fixtures). 161 bodies never swung at a hero standing idle within reach, so their threat reads as unmeasured: 102 have no skills, 31 carry kits with no damage, 6 are rooted, 7 lie in ambush, 9 only fight once fought, and 6 have a damage kit and legs and did not swing in a duel either (`cloud_grazer`, `kettle_minnow`, `sand_scorpion`, `star_grazer`, `white_hart`, `wool_aphid`).
How the bodies fought: on an idle hero the median first blow lands at 0.98s. In a duel, 23% of casts are melee, a body spends 17% of the fight within its own melee reach, and it uses 2 skills. No body pressed a skill that was refused.
Skills: 2930 rows across the bands; 902 read zero alone and are not ranked (buffs, auras and mines show nothing without a partner), 30 warned.
Suites: 91 scenarios, 17 of 104 graded metrics outside their provisional band, 12 warned.
Matrix: 127,530 of 127,530 eligible pairs probed (100%), deep lane on 28696 pairs. Verdicts: effective 78555, inert 14500, blind 30610, cost_only 1428, negligible 2437.
Against the committed ledger (8481 rows): 13159 not on file, 1997 measuring healthy. The ledger only changes through `matrix check --reconcile`.

## What ran, and what did not

| lane | units planned | ok | gate breach | crashed/killed | out of time or not run | episodes | core-hours |
|---|---:|---:|---:|---:|---:|---:|---:|
| baselines | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| audits | 4 | 4 | 0 | 0 | 0 | 0 | 0 |
| expression | 1 | 1 | 0 | 0 | 0 | 1,208 | 0.1 |
| census | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| suites | 2 | 2 | 0 | 0 | 0 | 910 | 0.2 |
| progression | 39 | 39 | 0 | 0 | 0 | 12,480 | 4.5 |
| skills | 10 | 10 | 0 | 0 | 0 | 8,790 | 1.2 |
| skills_vs | 21 | 21 | 0 | 0 | 0 | 24,192 | 4.8 |
| matchups | 28 | 28 | 0 | 0 | 0 | 13,734 | 5.3 |
| bestiary | 64 | 64 | 0 | 0 | 0 | 78,624 | 14.8 |
| attributes | 39 | 39 | 0 | 0 | 0 | 4,914 | 2.1 |
| affixes | 5 | 5 | 0 | 0 | 0 | 3,472 | 1 |
| assists | 11 | 11 | 0 | 0 | 0 | 4,752 | 2.2 |
| socket_play | 1 | 1 | 0 | 0 | 0 | 900 | 0.1 |
| globals | 4 | 4 | 0 | 0 | 0 | 1,704 | 0.3 |
| matrix | 219 | 219 | 0 | 0 | 0 | 235,854 | 49.8 |
| matrix_deep | 73 | 73 | 0 | 0 | 0 | 127,571 | 25.3 |
| search | 40 | 40 | 0 | 0 | 0 | 155,074 | 28.7 |
| archive_confirm | 38 | 38 | 0 | 0 | 0 | 22,608 | 7.6 |
| proposals | 48 | 48 | 0 | 0 | 0 | 14,168 | 3 |

Every planned unit ran.

Not simulated at all, by design: zone generation and XP pacing, event pressure, multiplayer, and real player skill. Pilots are simple policies, so kit ceilings are floors. Bands stay provisional until you sign them off.
