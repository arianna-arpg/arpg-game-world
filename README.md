# Balance farm results

Data branch: machine-written by `.github/workflows/balance-farm.yml`. Do not edit by hand.

- `latest/` the newest night: `summary.json`, `digest.md`
- `nights/<date>/` one small record per night
- `trend.jsonl` one line per night
- `state/` what the next night builds on: the search archive, measured lane costs, row snapshot

Page: https://arianna-arpg.github.io/arpg-game-world/balance/

---

# Balance farm, night of 2026-11-18

Commit [16ce6ef8fb](https://github.com/arianna-arpg/arpg-game-world/commit/16ce6ef8fba0a25da5cddb4ab0801f6108548bd6), profile `full`. 678,035 episodes, 150.1 core-hours, 314 minutes end to end. [Run](https://github.com/arianna-arpg/arpg-game-world/actions/runs/44311162917).

## ✅ No regressions

Every committed baseline holds, nothing crashed, and the matrix has no new defects since last night.

## What moved since last night

No row moved past its own noise and 10%.

## Top proposed numbers

Advisory. Nothing here has been applied, and each needs your sign-off. Each row re-measured the subject on dice the night had not seen, solved for a number through the real game, and verified it at common seeds. 31 outlier(s) did not hold up on fresh dice, or landed within 15% of their target, and were dropped.

| # | subject | change | metric: before → after | cohort target | verdict | guards |
|---:|---|---|---|---:|---|---|
| 1 | class `trapper` | `classes.trapper.attributes.strength`: 4 → 10 (+9 lines, ×2.5) | kill_rate: 0 → 0.2 | 0.1 | moved | mana_floor_pct 83.5→77.9 |
| 2 | skill `shambler_horde` | `monsters.grave_shambler.explodeOnDeath`: 2.2 → 0.88 | dps_dummy: 19394.7 → 7757.9 | 680.5 | moved, closes 62% | none moved |
| 3 | class `firebrand` | `skills.harrowing_wail.baseDamage.physical.0`: 5 → 13 (+1 lines, ×2.5) | kill_rate: 0 → 0 | 0 | moved | life_floor_pct 0→6.7; player_deaths 1→0.9 |
| 4 | skill `arclight_rain` | `skills.arclight_rain.baseDamage.physical.0`: 5 → 2 (+3 lines, ×0.4) | dps_dummy: 348.4 → 139.4 | 93.2 | moved, closes 82% | none moved |
| 5 | skill `marshlight` | `skills.marshlight.baseDamage.chaos.0`: 9 → 3.6 (+1 lines, ×0.4) | dps_dummy: 266.9 → 106.9 | 98.9 | moved | none moved |
| 6 | skill `mirespume` | `skills.mirespume.baseDamage.chaos.0`: 11 → 4.5 (+1 lines, ×0.41) | dps_dummy: 239.2 → 98.1 | 98.9 | moved | none moved |
| 7 | skill `infernal_bombardment` | `monsters.bombard_demon.explodeOnDeath`: 1.6 → 0.67 | dps_dummy: 15914.8 → 6701.1 | 6676.7 | moved | none moved |
| 8 | support `fire_walker` | `supports.fire_walker.mods.0.value`: 0.5 → 0.2 (+1 lines, ×0.4) | dps_dummy: 61.2 → 31.4 | 18.3 | moved, closes 70% | none moved |
| 9 | skill `glare_ice` | `skills.glare_ice.baseDamage.cold.0`: 4 → 10 (+1 lines, ×2.5) | dps_dummy: 1.3 → 3.3 | 4 | moved, closes 74% | none moved |
| 10 | skill `trailblaze` | `skills.trailblaze.baseDamage.fire.0`: 6 → 2.8 (+1 lines, ×0.47) | dps_dummy: 65.7 → 31.9 | 31.1 | moved | none moved |
| 11 | support `sundering_flight` | `supports.sundering_flight.fissureTrail.damageScale`: 0.4 → 0.16 | dps_dummy: 49.8 → 30.4 | 19.5 | moved, closes 64% | none moved |
| 12 | skill `keening_shriek` | `skills.keening_shriek.baseDamage.physical.0`: 4 → 7.2 (+1 lines, ×1.8) | dps_dummy: 1.9 → 3.5 | 3.6 | moved | none moved |
| 13 | support `volley` | `supports.volley.mods[stat=damage].value`: -0.25 → -0.63 | dps_dummy: 92.8 → 46.4 | 54.4 | moved | none moved |
| 14 | monster_threat `seatless_usher` | `skills.ushers_lull.baseDamage.chaos.0`: 4 → 10 (+1 lines, ×2.5) | dps_in: 0 → 7.5 | 7.4 | moved | none moved |
| 15 | monster_threat `discord_siren` | `skills.discord_wail.baseDamage.chaos.0`: 7 → 18 (+1 lines, ×2.5) | dps_in: 0.8 → 9.5 | 7.4 | moved | none moved |

<details><summary>Repro commands</summary>

1. `npm run sim -- whatif --knob 'classes.trapper.attributes*2.5' --scenarios pressure:trapper:30 --seeds 30 --base-seed 3276509151`. Same change at other bands: `pressure:trapper:5` 0.5→0.6, `pressure:trapper:10` 0.2→0.5, `pressure:trapper:20` 0.1→0.2, `pressure:trapper:40` 0→0
2. `npm run sim -- whatif --knob 'monsters.grave_shambler.explodeOnDeath*0.4' --scenarios skill:shambler_horde:40 --seeds 30 --base-seed 3276509151`. Other dials on this metric (elasticity): cooldown -0.71, useTime -0.36. Same change at other bands: `skill:shambler_horde:5` 257.8→103.1, `skill:shambler_horde:10` 768.4→307.4, `skill:shambler_horde:20` 3055.9→1222.4
3. `npm run sim -- whatif --knob 'skills.harrowing_wail.baseDamage*2.5' --scenarios parity:firebrand:40 --seeds 30 --base-seed 3276509151`. Same change at other bands: `parity:firebrand:5` 0→0.1, `parity:firebrand:10` 0→0, `parity:firebrand:20` 0→0
4. `npm run sim -- whatif --knob 'skills.arclight_rain.baseDamage*0.4' --scenarios skill:arclight_rain:40 --seeds 30 --base-seed 3276509151`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.18, useTime 0.17. Same change at other bands: `skill:arclight_rain:5` 152.8→61.1, `skill:arclight_rain:10` 185.4→74.1, `skill:arclight_rain:20` 234.2→93.7
5. `npm run sim -- whatif --knob 'skills.marshlight.baseDamage*0.4' --scenarios skill:marshlight:10 --seeds 30 --base-seed 3276509151`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.69, manaCost -0.03. Same change at other bands: `skill:marshlight:5` 232.9→93.2, `skill:marshlight:20` 321.9→128.7, `skill:marshlight:40` 449→180
6. `npm run sim -- whatif --knob 'skills.mirespume.baseDamage*0.41' --scenarios skill:mirespume:10 --seeds 30 --base-seed 3276509151`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.53. Same change at other bands: `skill:mirespume:5` 208.5→85.5, `skill:mirespume:20` 285.2→116.9, `skill:mirespume:40` 392.7→161
7. `npm run sim -- whatif --knob 'monsters.bombard_demon.explodeOnDeath*0.42' --scenarios skill:infernal_bombardment:40 --seeds 30 --base-seed 3276509151`. Other dials on this metric (elasticity): cooldown -0.76. Same change at other bands: `skill:infernal_bombardment:5` 240.3→103.6, `skill:infernal_bombardment:10` 689.6→295.5, `skill:infernal_bombardment:20` 2628.2→1113
8. `npm run sim -- whatif --knob 'supports.fire_walker.mods*0.4' --scenarios socketed:phoenix_dive:fire_walker:20 --seeds 30 --base-seed 3276509151`
9. `npm run sim -- whatif --knob 'skills.glare_ice.baseDamage*2.5' --scenarios skill:glare_ice:40 --seeds 30 --base-seed 3276509151`. Other dials on this metric (elasticity): cooldown -1.23, baseDamage 1. Same change at other bands: `skill:glare_ice:5` 0.8→1.9, `skill:glare_ice:10` 0.9→2.2, `skill:glare_ice:20` 1→2.5
10. `npm run sim -- whatif --knob 'skills.trailblaze.baseDamage*0.47' --scenarios skill:trailblaze:20 --seeds 30 --base-seed 3276509151`. Other dials on this metric (elasticity): baseDamage 0.99, cooldown -0.75. Same change at other bands: `skill:trailblaze:5` 50.6→25.2, `skill:trailblaze:10` 56.4→27.9, `skill:trailblaze:40` 86.5→41.4
11. `npm run sim -- whatif --knob 'supports.sundering_flight.fissureTrail.damageScale*0.4' --scenarios socketed:ball_lightning:sundering_flight:20 --seeds 30 --base-seed 3276509151`
12. `npm run sim -- whatif --knob 'skills.keening_shriek.baseDamage*1.8' --scenarios skill:keening_shriek:40 --seeds 30 --base-seed 3276509151`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.77. Same change at other bands: `skill:keening_shriek:5` 1.2→2.1, `skill:keening_shriek:10` 1.3→2.3, `skill:keening_shriek:20` 1.5→2.7
13. `npm run sim -- whatif --knob 'supports.volley.mods[stat=damage].value*2.5' --scenarios socketed:soulflay:volley:20 --seeds 30 --base-seed 3276509151`
14. `npm run sim -- whatif --knob 'skills.ushers_lull.baseDamage*2.5' --scenarios threat:starter_magician_l25:seatless_usher:25 --seeds 30 --base-seed 3276509151`. Other dials on this metric (elasticity): kit.ushers_lull 41.41. Same change at other bands: `threat:starter_magician_l5:seatless_usher:5` 2→5.1, `threat:starter_magician_l10:seatless_usher:10` 0.8→5.1, `threat:starter_magician_l20:seatless_usher:20` 0.8→7.4, `threat:starter_magician_l40:seatless_usher:40` 0.2→11.8
15. `npm run sim -- whatif --knob 'skills.discord_wail.baseDamage*2.5' --scenarios threat:starter_magician_l25:discord_siren:25 --seeds 30 --base-seed 3276509151`. Other dials on this metric (elasticity): kit.discord_wail 8.73. Same change at other bands: `threat:starter_magician_l5:discord_siren:5` 1.9→4.8, `threat:starter_magician_l10:discord_siren:10` 1→5, `threat:starter_magician_l20:discord_siren:20` 1.1→7.4, `threat:starter_magician_l40:discord_siren:40` 0.9→12.6

Run from commit `16ce6ef8fba0a25da5cddb4ab0801f6108548bd6`.
</details>

Too noisy to call: class `assassin`, monster_threat `cinder_chorister`. The solved number moved each by less than its own seed-to-seed spread, so these need a calmer rig or more seeds before they mean anything.

### Combinations that run away

Confirmed on fresh dice at 20 times or more what their parts predict. A number this far out usually means damage feeding itself, so no single number fixes it: each needs a call on whether the feedback should be bounded.

- `class:berserker + primary:devouring_swarm + support:unleash + support:seismic_march`: measured 5.3e+15 damage per second, its parts predict 26640.8. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZGV2b3VyaW5nX3N3YXJtIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsic2xvd19tYXRjaCJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiY2FzY2FkZSIsInVubGVhc2giLCJzY2F0dGVyZWRfY2FzY2FkZSJdfSx7ImlkIjoiZmxhbWVfYmxhc3QiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImFjY2VsZXJhbmRvIiwiZWZmaWNpZW5jeSJdfSx7ImlkIjoicmVwdWxzb3JfYmVhY29uIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJjYXN0X29uX2JsZWVkIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjo4Njk3ODg1MTcsInVuaXF1ZXMiOnsiYm9vdHMiOiJmbGVldGZlYXRoZXIiLCJnbG92ZXMiOiJnYWxld3JpZ2h0cyJ9fQ:spar --seeds 30 --base-seed 3276509151`</details>
- `class:berserker + unique:cindervigil + support:unleash + support:seismic_march`: measured 5.2e+8 damage per second, its parts predict 6074.1. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZ3JpdF9zdGFuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiLCJvdmVybWF0Y2giLCJvc3RpbmF0byJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJhY2NlbGVyYW5kbyIsImVmZmljaWVuY3kiXX0seyJpZCI6InJlcHVsc29yX2JlYWNvbiIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZmxlZXRmb290Il19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjo4Njk3ODg1MTcsInVuaXF1ZXMiOnsiZ2xvdmVzIjoiZ2FsZXdyaWdodHMiLCJoZWxtZXQiOiJjaW5kZXJ2aWdpbCJ9fQ:spar --seeds 30 --base-seed 3276509151`</details>
- `class:berserker + primary:orbital_blades + support:unleash + support:seismic_march`: measured 1.8e+8 damage per second, its parts predict 13640.7. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoib3JiaXRhbF9ibGFkZXMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJmbGVldGZvb3QiXX0seyJpZCI6ImNvbWJ1c3Rpb25fc3RyaWtlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2Vpc21pY19tYXJjaCIsImFjY2VsZXJhdGVkIiwidW5sZWFzaCIsInNjYXR0ZXJlZF9jYXNjYWRlIl19LHsiaWQiOiJmbGFtZV9ibGFzdCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiYWNjZWxlcmFuZG8iLCJ0aG91Z2h0YnVybiJdfSx7ImlkIjoiZmxhbWVfaW1idWVtZW50IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsibGluZ2VyaW5nIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjg2OTc4ODUxNywidW5pcXVlcyI6eyJhbXVsZXQiOiJzdG9ybWNhbGwiLCJnbG92ZXMiOiJnYWxld3JpZ2h0cyJ9fQ:spar --seeds 30 --base-seed 3276509151`</details>
- `class:brawler + unique:cinderstep + unique:cindervigil + support:grasping_tendrils`: measured 1.2e+8 damage per second, its parts predict 10495.6. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJicmF3bGVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImV2aXNjZXJhdGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJncmFzcGluZ190ZW5kcmlscyIsImdpYW50c2JhbmUiLCJhenVyZV9oYXJ2ZXN0Iiwic2VyZW5lX3Bvd2VyIl0sImxpbWIiOjF9LHsiaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYWxhY3JpdHkiLCJhdXN0ZXJpdHkiLCJhcG90aGVvc2lzIl19LHsiaWQiOiJzaGF0dGVyY2hvcmQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInJlc291bmRpbmdfZWNobyIsImNhc2NhZGUiXSwibGltYiI6MX1dLCJvZmYiOiJjcml0IiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjkyMjY5ODcwMywidW5pcXVlcyI6eyJib290cyI6ImNpbmRlcnN0ZXAiLCJoZWxtZXQiOiJjaW5kZXJ2aWdpbCJ9fQ:spar --seeds 30 --base-seed 3276509151`</details>
- `class:apothecary + unique:cindervigil + support:accelerated + support:unleash`: measured 7.7e+7 damage per second, its parts predict 1064.4. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJhcG90aGVjYXJ5IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6Im1hcmsiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzcGVudGJhbmUiLCJzdG9yZWRfdmVyZGljdCIsImF1c3Rlcml0eSIsInNsb3dfYnJldyJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6Im9yYl9vZl9zdG9ybXMiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInRyYW5zaWVudF9pbmZlcm5vIiwiY2FzdF9vbl9mbGF3bGVzcyJdfSx7ImlkIjoiY2luZGVyd2hpcmxfdHJhcCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZmxvd2JyZWFrZXIiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJsaWZlIiwiZ2VhciI6InJhcmUiLCJncyI6MTUzNzgwNDgyNywidW5pcXVlcyI6eyJjaGVzdCI6ImR1ZWxpc3RzX2xlZGdlciIsImhlbG1ldCI6ImNpbmRlcnZpZ2lsIn19:spar --seeds 30 --base-seed 3276509151`</details>
- `class:berserker + support:unleash + support:seismic_march + support:scattered_cascade`: measured 7199370.3 damage per second, its parts predict 1180. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZ3JpdF9zdGFuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiLCJvdmVybWF0Y2giLCJvc3RpbmF0byJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJhY2NlbGVyYW5kbyIsImVmZmljaWVuY3kiXX0seyJpZCI6InJlcHVsc29yX2JlYWNvbiIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZmxlZXRmb290Il19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjo4Njk3ODg1MTcsInVuaXF1ZXMiOnsiZ2xvdmVzIjoiZmF1bHRsaW5lX2dyaXBzIn19:spar --seeds 30 --base-seed 3276509151`</details>
- `class:berserker + unique:cinderstep + support:unleash + support:seismic_march`: measured 6419621.7 damage per second, its parts predict 9480. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZ3JpdF9zdGFuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiLCJvdmVybWF0Y2giLCJvc3RpbmF0byJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJzcGVudGJhbmUiLCJlZmZpY2llbmN5Il19LHsiaWQiOiJyZXB1bHNvcl9iZWFjb24iLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImZsZWV0Zm9vdCJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImxpZmUiLCJnZWFyIjoicmFyZSIsImdzIjo4Njk3ODg1MTcsInVuaXF1ZXMiOnsiYm9vdHMiOiJjaW5kZXJzdGVwIiwiZ2xvdmVzIjoiZ2FsZXdyaWdodHMifX0:spar --seeds 30 --base-seed 3276509151`</details>
- `class:runeweaver + unique:cindervigil + support:accelerated + support:unleash`: measured 4437660.6 damage per second, its parts predict 25788. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6Im1hcmsiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzcGVudGJhbmUiLCJleHRlcm1pbmF0b3IiLCJhdXN0ZXJpdHkiLCJzbG93X2JyZXciXX0seyJpZCI6ImRldm91cmluZ19zd2FybSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjF9LHsiaWQiOiJjb21idXN0aW9uX3N0cmlrZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNlaXNtaWNfbWFyY2giLCJhY2NlbGVyYXRlZCIsInVubGVhc2giLCJzY2F0dGVyZWRfY2FzY2FkZSJdfSx7ImlkIjoiZmxhbWVfYmxhc3QiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInF1aWV0X2hhbmQiLCJlZmZpY2llbmN5Il19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjoxNTM3ODA0ODI3LCJ1bmlxdWVzIjp7ImNoZXN0IjoidGhlX3VubW92ZWQiLCJoZWxtZXQiOiJjaW5kZXJ2aWdpbCJ9fQ:spar --seeds 30 --base-seed 3276509151`</details>
- `class:warlord + support:pallid_touch + support:meat_shield + support:maddening_miasma`: measured 10058 damage per second, its parts predict 7.8. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJ3YXJsb3JkIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImRldG9uYXRlX21pbmVzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsic3RvcmVkX3ZlcmRpY3QiLCJzbGlwc3RyZWFtIiwic2VyZW5lX3Bvd2VyIiwiaHVudGVyc19tb21lbnR1bSJdfSx7ImlkIjoiZG9vbWJyYW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYnJvb2RjbHV0Y2giLCJndWFyZGVkX2Nhc3RpbmciLCJzcGlyaXRfdG90ZW0iLCJwYWxsaWRfdG91Y2giXX0seyJpZCI6Indhcl9jaGFudCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImNyZWVwaW5nX2Z1bWVzIiwibWFkZGVuaW5nX21pYXNtYSIsInJpdGFyZGFuZG8iXSwibGltYiI6MX0seyJpZCI6ImluZmVybmFsX2JvbWJhcmRtZW50IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsidHJpYW5nbGVfc2lnaWwiLCJvdmVybWF0Y2giLCJjdXR0aHJvYXQiLCJtZWF0X3NoaWVsZCJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6MTc3NDMxMDUyMiwidW5pcXVlcyI6eyJsZWdzIjoic3F1YWxsc3RlcCJ9fQ:spar --seeds 30 --base-seed 3276509151`</details>
- `class:summoner + unique:cinderstep + support:afterspray + support:lingering`: measured 227.5 damage per second, its parts predict 1.3. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJzdW1tb25lciIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6InJhcmUifSx7ImlkIjoia2luZGxlX3dpY2siLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJmbGVldGZvb3QiLCJsaW5nZXJpbmciXX0seyJpZCI6InNoYWRvd19zdGVwIiwicmFyaXR5IjoicmFyZSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbIm1vbm9saXRoIiwiYWZ0ZXJzcHJheSIsImVmZmljaWVuY3kiXSwibGltYiI6MH0seyJpZCI6ImZsYXNoX2ZyZWV6ZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjJ9XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjc4MjMxNTI1MCwidW5pcXVlcyI6eyJib290cyI6ImNpbmRlcnN0ZXAiLCJyaW5nMSI6InNsb3dtYXRjaF9jb2lsIn19:spar --seeds 30 --base-seed 3276509151`</details>

### Flagged for your decision

The numbers an author would reach for did not move these enough. They are not proposals: each needs a call on whether the mechanic is right, and none has been touched.

- class `chronomancer`: The numbers an author would reach for barely move this: skills.stasis_lock.baseDamage ×2.5 closes 8%; classes.chronomancer.attributes ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- skill `hurricane`: The numbers an author would reach for barely move this: skills.hurricane.baseDamage ×2.5 closes 14%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `wallwright`: The numbers an author would reach for barely move this: skills.stone_rampart.baseDamage ×1 closes 0%; skills.toppling_stroke.baseDamage ×2.5 closes 17%; skills.shield_charge.baseDamage ×2.5 closes 3%; skills.stone_rampart.baseDamage & skills.toppling_stroke.baseDamage & skills.shield_charge.baseDamage ×2.5 closes 18%; classes.wallwright.attributes ×2.5 closes 6%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `necromancer`: The numbers an author would reach for barely move this: skills.poison_nova.baseDamage ×0.4 closes 4%; skills.despair.baseDamage ×1 closes 0%; skills.poison_nova.baseDamage & skills.despair.baseDamage ×0.4 closes 4%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `hivecaller`: The numbers an author would reach for barely move this: classes.hivecaller.attributes ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- support `septic_bargain`: The numbers an author would reach for barely move this: supports.septic_bargain.mods ×2.5 closes 19%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- support `resounding_echo`: The numbers an author would reach for barely move this: supports.resounding_echo.mods ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `sharper`: The numbers an author would reach for barely move this: skills.thrown_ace.baseDamage ×1.8 closes 17%; classes.sharper.attributes ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_threat `breach_arcling`: The numbers an author would reach for barely move this: monsterDamage.breach_arcling.all ×2.5 closes 10%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `beguiler`: The numbers an author would reach for barely move this: skills.beguile.baseDamage ×1 closes 0%; classes.beguiler.attributes ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.

## Outliers

441 rows sit far from their cohort (log-scale median and MAD, z ≥ 3 and a ratio past 1.8× or 0.55×), 32 of them new tonight. Warned rows and zero rows never enter a cohort.

| | kind | subject | metric | value | cohort median | ratio | z | cohort |
|---|---|---|---|---:|---:|---:|---:|---|
|  | support | `sundering_flight` | output_multiplier | 3 | 1 | 2.9× | 18.2 | supports · effective hosts |
|  | support | `fire_walker` | output_multiplier | 2.8 | 1 | 2.74× | 17.2 | supports · effective hosts |
| 🆕 | interaction | `class:berserker + primary:devouring_swarm + support:unleash + support:seismic_march` | dps_out | 4.3e+10 | 26640.8 | 1617251.15× | 15.9 | L40 main effects |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.05× | -15.1 | L30 · geared · pressure · kill_rate |
|  | support | `scorched_wake` | output_multiplier | 2.4 | 1 | 2.33× | 14.4 | supports · effective hosts |
|  | monster_threat | `seatless_usher` | dps_in | 0 | 17 | 0× | -14.1 | L25 · magician · body |
|  | support | `mounting_frenzy` | output_multiplier | 2.3 | 1 | 2.27× | 14 | supports · effective hosts |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.07× | -13.7 | L20 · geared · pressure · kill_rate |
| 🆕 | interaction | `class:brawler + unique:cinderstep + unique:cindervigil + support:grasping_tendrils` | dps_out | 1.7e+9 | 10495.6 | 160434.37× | 13.3 | L40 main effects |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.05× | -12.9 | L40 · geared · pressure · kill_rate |
|  | monster_threat | `banshee` | dps_in | 0 | 17 | 0× | -12.8 | L25 · magician · body |
|  | support | `austerity` | output_multiplier | 0.5 | 1 | 0.48× | -12.6 | supports · effective hosts |
|  | support | `resounding_echo` | output_multiplier | 2.1 | 1 | 2.04× | 12.1 | supports · effective hosts |
|  | support | `crescendo` | output_multiplier | 2.1 | 1 | 2.02× | 12 | supports · effective hosts |
|  | support | `septic_bargain` | output_multiplier | 0.5 | 1 | 0.5× | -12 | supports · effective hosts |
|  | class | `chronomancer` | kill_rate | 0 | 0.5 | 0.04× | -11.9 | L10 · geared · pressure · kill_rate |
| 🆕 | interaction | `class:berserker + support:unleash + support:seismic_march + support:scattered_cascade` | dps_out | 3.9e+7 | 1180 | 33382.36× | 11.6 | L40 main effects |
|  | monster_threat | `formic_gluewright` | dps_in | 0 | 17 | 0× | -11.2 | L25 · magician · body |
|  | support | `volley` | output_multiplier | 2 | 1 | 1.92× | 11.1 | supports · effective hosts |
| 🆕 | interaction | `class:berserker + primary:orbital_blades + support:unleash + support:seismic_march` | dps_out | 2.9e+8 | 13640.7 | 21428.33× | 11.1 | L40 main effects |
| 🆕 | interaction | `class:berserker + unique:cindervigil + support:unleash + support:seismic_march` | dps_out | 1.2e+8 | 6074.1 | 19534.58× | 11 | L40 main effects |
|  | support | `elemental_conduction` | output_multiplier | 1.9 | 1 | 1.82× | 10.2 | supports · effective hosts |
|  | monster_threat | `hadal_lantern` | dps_in | 0.1 | 15.2 | 0× | -10 | L12 · magician · body |
| 🆕 | interaction | `class:berserker + unique:cinderstep + support:unleash + support:seismic_march` | dps_out | 5.4e+7 | 9480 | 5673.07× | 9.6 | L40 main effects |
| 🆕 | interaction | `class:apothecary + unique:cindervigil + support:accelerated + support:unleash` | dps_out | 2385379.8 | 1064.4 | 2240.97× | 9.2 | L20 main effects |

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

</details>

## Build search

74,633 candidates tonight (16,992 refused by the real gates), 1,314,481 over 20 night(s). The archive holds 1433 elite rows; 1416 were re-measured on this commit. Tried so far in a legal build: 39 of 39 classes, 576 of 576 primarys, 604 of 604 skills, 455 of 455 supports, 41 of 41 uniques.

| band | objective | build (top factors) | value | × band median | repro |
|---|---|---|---:|---:|---|
| L5 | offense | `class:runeweaver` `off:crit` `def:life` `gear:rare` `skill:orb_of_storms` | 67126.6 | 1698.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoib3JiX29mX3N0b3JtcyIsInJhcml0eSI6Im1hZ2ljIiwib3ZlciI6Miwic3VwcG9ydHMiOlsiaHVudGVyc19tb21lbnR1bSIsInJlZ2ljaWRlIl19LHsiaWQiOiJzdG9ybWJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJ0ZW1wZXN0X3JhbmdlIl19LHsiaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJmbGVldGluZ19kZXZvdGlvbiIsImJvbmRicmVha2VyIiwiYWNjZWxlcmFuZG8iLCJibG9vZF90b2xsIl19LHsiaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiY2FzY2FkZV9vZl9rbml2ZXMiLCJtb3VudGluZ19mcmVuenkiLCJwYXJ0aW5nX2p1ZGdlbWVudCIsInN1bmRlcmluZ19mbGlnaHQiXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjE0MzcyMjkwODksInVuaXF1ZXMiOnsiYW11bGV0Ijoic3Rvcm1jYWxsIiwicmluZzEiOiJlbWJlcmJyYW5kIn19 --seeds 8 --base-seed 2779159928`</details> |
| L5 | offense | `class:runeweaver` `off:crit` `def:life` `gear:rare` `skill:orb_of_storms` | 63495.3 | 1606.9× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoib3JiX29mX3N0b3JtcyIsInJhcml0eSI6Im1hZ2ljIiwib3ZlciI6Miwic3VwcG9ydHMiOlsiaHVudGVyc19tb21lbnR1bSIsInJlZ2ljaWRlIl19LHsiaWQiOiJzdG9ybWJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJ0ZW1wZXN0X3JhbmdlIiwib3ZlcmZsb3dfcmVzZXJ2b2lyIl19LHsiaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJmbGVldGluZ19kZXZvdGlvbiIsImJvbmRicmVha2VyIiwiYWNjZWxlcmFuZG8iLCJibG9vZF90b2xsIl19LHsiaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiY2FzY2FkZV9vZl9rbml2ZXMiLCJtb3VudGluZ19mcmVuenkiLCJwYXJ0aW5nX2p1ZGdlbWVudCIsInN1bmRlcmluZ19mbGlnaHQiXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjE0MzcyMjkwODksInVuaXF1ZXMiOnsiZ2xvdmVzIjoidGl0YW5zX2dyYXNwIiwicmluZzEiOiJlbWJlcmJyYW5kIn19 --seeds 8 --base-seed 2779159928`</details> |
| L5 | clear | `class:chronomancer` `off:damage` `def:none` `gear:rare` `skill:broodpod` | 6 | 18.9× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJicm9vZHBvZCIsInJhcml0eSI6Im1hZ2ljIiwib3ZlciI6Miwic3VwcG9ydHMiOlsibWFycm93Ym91bmRfdmlnb3IiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjoxNDMwNTA0OTA4LCJ1bmlxdWVzIjp7ImJvb3RzIjoiZmxlZXRmZWF0aGVyIiwiaGVsbWV0IjoiZ3JhdmVibG9vbSJ9fQ --seeds 8 --base-seed 175813537`</details> |
| L5 | clear | `class:chronomancer` `off:damage` `def:none` `gear:rare` `skill:rolling_cannonade` | 6 | 18.9× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJyb2xsaW5nX2Nhbm5vbmFkZSIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiY29sb3NzYWwiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjoxNDMwNTA0OTA4LCJ1bmlxdWVzIjp7ImFtdWxldCI6InN0b3JtY2FsbCIsImhlbG1ldCI6ImdyYXZlYmxvb20ifX0 --seeds 8 --base-seed 2737474264`</details> |
| L10 | offense | `class:magician` `off:speed` `def:armor` `gear:rare` `skill:bind_familiar` | 86891.6 | 2456.9× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJiaW5kX2ZhbWlsaWFyIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbImNoaXRpbm91c19icm9vZCJdLCJsaW1iIjowfSx7ImlkIjoib3ZlcmNsb2NrIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbImF0X3RoZV9icmluayIsImJsb29kX3BhY3QiXX0seyJpZCI6ImVtYmVyYmluZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImZsZWV0aW5nX2Rldm90aW9uIiwid3JhaXRoX3Bhc3NhZ2UiLCJwb2x5cGhvbnkiLCJyYXZlbmluZyJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNsb3dfYnJldyIsInBhcnRpbmdfanVkZ2VtZW50IiwibW91bnRpbmdfZnJlbnp5IiwicGF0aWVudF9mdXJ5Il19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjM3MTcwODk0NCwidW5pcXVlcyI6eyJiZWx0IjoiYmxvb2RsZXR0ZXJzX2dpcmRsZSIsImJvb3RzIjoicmltZXdha2UifX0 --seeds 8 --base-seed 1870326712`</details> |
| L10 | offense | `class:magician` `off:speed` `def:ward` `gear:rare` `skill:summon_bone_golem` | 72144.6 | 2039.9× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJzdW1tb25fYm9uZV9nb2xlbSIsInJhcml0eSI6InJhcmUiLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiXSwibGltYiI6MH0seyJpZCI6ImdyYXNwaW5nX2NoYXNtIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiYmxvb2RfdG9sbCIsInNwbGludGVyZWRfZWFydGgiLCJhY2NlbGVyYW5kbyIsImRlc3BlcmF0aW9uIl19LHsiaWQiOiJmcm9zdGd1YXJkIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJyZWdpY2lkZSJdfSx7ImlkIjoiZnJvc3Rfc3Rvcm0iLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInBvbHlwaG9ueSIsInNwaXJpdF90b3RlbSJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjkzNjUyNDk0MywidW5pcXVlcyI6eyJoZWxtZXQiOiJnbGVhbmVyc19jcm93biIsImxlZ3MiOiJzcXVhbGxzdGVwIn19 --seeds 8 --base-seed 1870326712`</details> |
| L10 | clear | `class:summoner` `off:speed` `def:ward` `gear:rare` `skill:detonate_mines` | 6 | 24.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzdW1tb25lciIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6InJhcmUiLCJzdXBwb3J0cyI6WyJibG9vZF9wcmljZSJdfSx7ImlkIjoiYmVja29uX3BhbGV3aXNwcyIsInJhcml0eSI6ImxlZ2VuZGFyeSJ9LHsiaWQiOiJkb29tX2JlbGwiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJwaGFudGFzbWFsX2VjaG8iXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6IndhcmQiLCJnZWFyIjoicmFyZSIsImdzIjoxOTgzMzMxNTUzLCJ1bmlxdWVzIjp7ImJvb3RzIjoidGhvdXNhbmRfc3RlcHMiLCJyaW5nMSI6ImNvbW1vbl9wdWxzZSJ9fQ --seeds 8 --base-seed 4003601429`</details> |
| L10 | clear | `class:necromancer` `off:crit` `def:evasion` `gear:rare` `skill:bone_offering` | 6 | 24.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJuZWNyb21hbmNlciIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJib25lX29mZmVyaW5nIiwicmFyaXR5IjoicmFyZSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImNhc3Rfb25fZmxhd2xlc3MiLCJzb3Vsd2FsayIsImVmZmljaWVuY3kiXX0seyJpZCI6InB1cml0eV9vZl9lbGVtZW50cyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImRlc3BlcmF0ZV9tZWFzdXJlcyIsInVwcm9vdGVyIiwiZWZmaWNpZW5jeSIsIm92ZXJtYXRjaCJdLCJsaW1iIjoxfSx7ImlkIjoiZG9vbV9iZWxsIiwicmFyaXR5IjoibGVnZW5kYXJ5In1dLCJvZmYiOiJjcml0IiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjkzMDg4Njk4MH0 --seeds 8 --base-seed 4168095376`</details> |
| L20 | offense | `class:sentinel` `off:damage` `def:evasion` `gear:rare` `skill:emberbind` | 403943.6 | 6798× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzZW50aW5lbCIsImx2bCI6MjAsInNraWxscyI6W3siaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJmbGVldGluZ19kZXZvdGlvbiIsInNsb3dfYnJldyIsInBvbHlwaG9ueSIsImJsb29kX3RvbGwiXX0seyJpZCI6InJlYXJndWFyZF9hZWdpcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjF9LHsiaWQiOiJzdG9ybWJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJ0ZW1wZXN0X3JhbmdlIiwicGx1c19saWdodG5pbmciXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzcG9vbGluZyIsInNob2NrX2NoYW5jZSIsInBhcnRpbmdfanVkZ2VtZW50IiwiZmxvd2JyZWFrZXIiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6MTY4MTc2MjQzNywidW5pcXVlcyI6eyJib290cyI6InJpbWV3YWtlIiwiaGVsbWV0IjoiY2luZGVydmlnaWwifX0 --seeds 8 --base-seed 4258183152`</details> |
| L20 | offense | `class:sentinel` `off:damage` `def:evasion` `gear:rare` `skill:emberbind` | 290967.5 | 4896.7× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzZW50aW5lbCIsImx2bCI6MjAsInNraWxscyI6W3siaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJmbGVldGluZ19kZXZvdGlvbiIsInNsb3dfYnJldyIsInBvbHlwaG9ueSIsImJsb29kX3RvbGwiXX0seyJpZCI6InJlYXJndWFyZF9hZWdpcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjF9LHsiaWQiOiJzdG9ybWJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJ0ZW1wZXN0X3JhbmdlIiwicGx1c19saWdodG5pbmciXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzcG9vbGluZyIsInNob2NrX2NoYW5jZSIsInBhcnRpbmdfanVkZ2VtZW50IiwiZmxvd2JyZWFrZXIiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6MTY4MTc2MjQzNywidW5pcXVlcyI6eyJib290cyI6InJpbWV3YWtlIiwiaGVsbWV0IjoiZ2xlYW5lcnNfY3Jvd24ifX0 --seeds 8 --base-seed 4258183152`</details> |
| L20 | clear | `class:juggernaut` `off:speed` `def:none` `gear:rare` `skill:doom_bell` | 6 | 23.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJqdWdnZXJuYXV0IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImRvb21fYmVsbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNoYXR0ZXJnbGFzcyJdfSx7ImlkIjoiYmVja29uX3BhbGV3aXNwcyIsInJhcml0eSI6InJhcmUiLCJzdXBwb3J0cyI6WyJtb3VudGluZ19mcmVuenkiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfSx7ImlkIjoiY29uc2VjcmF0aW9uIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsibWFkZGVuaW5nX21pYXNtYSIsImF1c3Rlcml0eSJdLCJsaW1iIjowfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjEzMDc0MjAxNzl9 --seeds 8 --base-seed 3454987890`</details> |
| L20 | clear | `class:berserker` `off:crit` `def:evasion` `gear:rare` `skill:panther_pounce` | 6 | 23.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjIwLCJza2lsbHMiOlt7ImlkIjoicGFudGhlcl9wb3VuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJwb2ludF9ibGFuayIsIm1ldHJvbm9tZSIsInJhcmVmeSIsImRlZXBfcmVzZXJ2ZXMiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6MTEwMzQ5NzMzOSwidW5pcXVlcyI6eyJoZWxtZXQiOiJoYWxvX25pbnRoX2Nob2lyIn19 --seeds 8 --base-seed 4146033731`</details> |
| L40 | offense | `class:apothecary` `off:damage` `def:evasion` `gear:rare` `skill:blood_mortgage` | 905583.6 | 11727.9× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJhcG90aGVjYXJ5IiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImJsb29kX21vcnRnYWdlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiaW5zdWxhdGlvbiIsIndhcmRpbmdfZmxlc2giLCJzdG9yZWRfdmVyZGljdCJdLCJsaW1iIjowfSx7ImlkIjoic2hhbWJsZXJfaG9yZGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJwbHVzX21pbmlvbiIsInJhdmVub3VzX3BhY3QiLCJjYXNjYWRpbmdfY2FsbCIsImVwaGVtZXJhbCJdLCJsaW1iIjoxfSx7ImlkIjoiYmVyc2VyayIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImdpYW50c2JhbmUiLCJpbnN1bGF0aW9uIiwiYmxvb2RfcHJpY2UiLCJzZXJlbmVfcG93ZXIiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6NDcxNDczNDczLCJ1bmlxdWVzIjp7ImhlbG1ldCI6ImdyYXZlYmxvb20iLCJyaW5nMSI6ImNvbW1vbl9wdWxzZSJ9fQ --seeds 8 --base-seed 215698996`</details> |
| L40 | offense | `class:sorcerer` `off:speed` `def:evasion` `gear:rare` `skill:befuddlement` | 692725.4 | 8971.2× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzb3JjZXJlciIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJiZWZ1ZGRsZW1lbnQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJtZWFzdXJlZF9ibG93cyIsInVubmVydmluZyIsImNoaWxsX2NoYW5jZSIsImJ1bHdhcmtfc2hhcmRzIl19LHsiaWQiOiJzdG9ybWJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJ0ZW1wZXN0X3JhbmdlIiwicGx1c19saWdodG5pbmciXX0seyJpZCI6ImVtYmVyYmluZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbImZsZWV0aW5nX2Rldm90aW9uIiwic2xvd19icmV3IiwicG9seXBob255IiwiYmxvb2RfdG9sbCJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNwb29saW5nIiwic2hvY2tfY2hhbmNlIiwicGFydGluZ19qdWRnZW1lbnQiLCJmbG93YnJlYWtlciJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjIwOTQxMzU1NTIsInVuaXF1ZXMiOnsiYm9vdHMiOiJyaW1ld2FrZSIsImNoZXN0IjoidGhlX3VubW92ZWQifX0 --seeds 8 --base-seed 2060116185`</details> |
| L40 | clear | `class:cleric` `off:speed` `def:ward` `gear:rare` `skill:frostbolt` | 6 | 26.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjbGVyaWMiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZnJvc3Rib2x0IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZGVlcF9yZXNlcnZlcyIsImNsb3NlX29yZGVyIiwib3Bwb3J0dW5pc3RzX2JsYWRlIiwibWFkZGVyaW5nIl19LHsiaWQiOiJkb29tX2JlbGwiLCJyYXJpdHkiOiJsZWdlbmRhcnkifV0sIm9mZiI6InNwZWVkIiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjE2Mzc4NzExNjYsInVuaXF1ZXMiOnsiYW11bGV0Ijoic3Rvcm1jYWxsIn19 --seeds 8 --base-seed 2808361246`</details> |
| L40 | clear | `class:berserker` `off:speed` `def:life` `gear:rare` `skill:detonate_mines` | 6 | 26.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZGV0b25hdGVfbWluZXMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJkb21pbmlvbl90aXRoZSIsInN0b3JlZF92ZXJkaWN0IiwiY2hhbWJlcmVkX2Nhc3RpbmciLCJzZXJlbmVfcG93ZXIiXX0seyJpZCI6Imh1cmxfZGVicmlzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsibWFuYV9mZWVkZXIiXX0seyJpZCI6ImRvb21fYmVsbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbIm1lYXN1cmVkX2JsYWRlIl19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJsaWZlIiwiZ2VhciI6InJhcmUiLCJncyI6MTc3NDMxMDUyMiwidW5pcXVlcyI6eyJoZWxtZXQiOiJoYWxvX25pbnRoX2Nob2lyIn19 --seeds 8 --base-seed 4146033731`</details> |

Playstyles at L5, best build found per style against the band's median style (50 styles): strongest `construct · lightning` 69076.7 (4.72×), `construct · fire` 63894.3 (4.37×), `area · lightning` 54449.2 (3.72×), `self · fire` 45733.2 (3.13×); weakest `mark · cold` 4279.9 (0.29×), `mark · chaos` 4500.4 (0.31×), `aura · cold` 4653.8 (0.32×), `detonate · chaos` 7291.7 (0.5×).

Playstyles at L10, best build found per style against the band's median style (50 styles): strongest `court · cold` 87317.9 (1.76×), `court · chaos` 74615 (1.51×), `court · fire` 72268.5 (1.46×), `detonate · fire` 68546.4 (1.38×); weakest `mark · cold` 9959.3 (0.2×), `mark · chaos` 11197.9 (0.23×), `detonate · chaos` 12580.7 (0.25×), `detonate · physical` 15193.2 (0.31×).

Playstyles at L20, best build found per style against the band's median style (50 styles): strongest `mark · fire` 534032.8 (3.74×), `mark · chaos` 518687.9 (3.63×), `aura · physical` 484504.5 (3.39×), `aura · fire` 396882.2 (2.78×); weakest `court · cold` 79010.3 (0.55×), `court · physical` 87514.6 (0.61×), `mark · cold` 93141.4 (0.65×), `construct · physical` 94296.7 (0.66×).

Playstyles at L40, best build found per style against the band's median style (50 styles): strongest `projectile · fire` 908978.3 (2.31×), `court · fire` 907716.7 (2.31×), `aura · fire` 869815.5 (2.22×), `target · chaos` 857388.5 (2.18×); weakest `court · cold` 130713.4 (0.33×), `construct · cold` 179199.1 (0.46×), `court · lightning` 186010.7 (0.47×), `aura · cold` 196707 (0.5×).

Main effects at L5 over 7518 rows: strongest `skill:grasping_chasm` 30.86×, `skill:ice_shards` 13.29×, `skill:emberbind` 8.04×, `skill:infernal_bombardment` 6.83×, `skill:shambler_horde` 6.64×; weakest `limb:war_chant#1` 0.14×, `limb:warp#0` 0.15×, `skill:glare_ice` 0.15×, `limb:shadow_step#1` 0.16×, `skill:invocation` 0.16×.

Main effects at L10 over 11823 rows: strongest `skill:grasping_chasm` 29.22×, `primary:soulflay` 14.64×, `skill:ice_shards` 14.55×, `limb:summon_bone_golem#0` 12.83×, `skill:faultbreak` 8.31×; weakest `limb:decoy#0` 0.05×, `limb:shadow_step#0` 0.06×, `limb:decoy#1` 0.08×, `skill:summon_bone_golem` 0.09×, `primary:bone_prison` 0.1×.

Main effects at L20 over 14894 rows: strongest `skill:grasping_chasm` 39.12×, `primary:strangler_seed` 33.28×, `skill:combustion_strike` 20.3×, `primary:aegis_ward` 19.15×, `primary:voltaic_orb` 17.92×; weakest `limb:decoy#0` 0.08×, `limb:war_chant#1` 0.09×, `primary:volatile_cinders` 0.09×, `limb:aegis_ward#0` 0.1×, `primary:toxic_domain` 0.1×.

Main effects at L40 over 15478 rows: strongest `primary:infernal_bombardment` 87.55×, `limb:shambler_horde#1` 64.13×, `skill:ice_shards` 33.21×, `limb:cast_falcon#0` 10.87×, `support:splintered_earth` 10.87×; weakest `limb:war_chant#1` 0.06×, `limb:aegis_ward#0` 0.07×, `limb:war_chant#0` 0.07×, `limb:expose_weakness#0` 0.12×, `limb:expose_weakness#1` 0.17×.

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

**What buffs, hexes, heals and wards add** (196 skills whose own numbers are not damage, at L20, against the same hero without them). Most output beside a plain strike: `infernal_bombardment` 14.1×, `summon_plaguefather` 6.4×, `summon_fire_golem` 4.83×, `summon_flame_sprite` 4.77×, `flame_totem` 4.77×, `shambler_horde` 4.25×, `bind_familiar` 4.22×, `reaper_swarm` 3.88×. Most time survived on the clock: `vampiric_presence` 11.85×, `summon_blade_wraith` 11.85×, `repulsor_beacon` 11.85×, `shambler_horde` 11.85×, `call_the_rift` 10.98×, `reaper_swarm` 10.25×, `summon_wraith` 9.04×, `infernal_bombardment` 6.63×. 35 moved neither at any band: their value lies outside these rigs, or they do nothing.

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
Matrix: 127,530 of 127,530 eligible pairs probed (100%), deep lane on 28626 pairs. Verdicts: effective 78555, inert 14500, negligible 2437, cost_only 1428, blind 30610.
Against the committed ledger (8481 rows): 12947 not on file, 2003 measuring healthy. The ledger only changes through `matrix check --reconcile`.

## What ran, and what did not

| lane | units planned | ok | gate breach | crashed/killed | out of time or not run | episodes | core-hours |
|---|---:|---:|---:|---:|---:|---:|---:|
| baselines | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| audits | 4 | 4 | 0 | 0 | 0 | 0 | 0 |
| expression | 1 | 1 | 0 | 0 | 0 | 1,208 | 0.2 |
| census | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| suites | 1 | 1 | 0 | 0 | 0 | 910 | 0.2 |
| progression | 39 | 39 | 0 | 0 | 0 | 12,480 | 4.8 |
| skills | 5 | 5 | 0 | 0 | 0 | 8,790 | 1.5 |
| skills_vs | 21 | 21 | 0 | 0 | 0 | 24,192 | 4.9 |
| matchups | 25 | 25 | 0 | 0 | 0 | 13,734 | 5.9 |
| bestiary | 60 | 60 | 0 | 0 | 0 | 78,624 | 15.5 |
| attributes | 39 | 39 | 0 | 0 | 0 | 4,914 | 2.4 |
| affixes | 4 | 4 | 0 | 0 | 0 | 3,472 | 0.9 |
| assists | 9 | 9 | 0 | 0 | 0 | 4,752 | 2.4 |
| socket_play | 1 | 1 | 0 | 0 | 0 | 900 | 0.2 |
| globals | 4 | 4 | 0 | 0 | 0 | 1,704 | 0.3 |
| matrix | 200 | 200 | 0 | 0 | 0 | 235,854 | 53.5 |
| matrix_deep | 71 | 71 | 0 | 0 | 0 | 128,917 | 22 |
| search | 40 | 40 | 0 | 0 | 0 | 121,492 | 25.5 |
| archive_confirm | 38 | 38 | 0 | 0 | 0 | 22,656 | 7.3 |
| proposals | 48 | 48 | 0 | 0 | 0 | 13,436 | 2.5 |

Every planned unit ran.

Not simulated at all, by design: zone generation and XP pacing, event pressure, multiplayer, and real player skill. Pilots are simple policies, so kit ceilings are floors. Bands stay provisional until you sign them off.
