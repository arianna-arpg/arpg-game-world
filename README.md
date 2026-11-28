# Balance farm results

Data branch: machine-written by `.github/workflows/balance-farm.yml`. Do not edit by hand.

- `latest/` the newest night: `summary.json`, `digest.md`
- `nights/<date>/` one small record per night
- `trend.jsonl` one line per night
- `state/` what the next night builds on: the search archive, measured lane costs, row snapshot

Page: https://arianna-arpg.github.io/arpg-game-world/balance/

---

# Balance farm, night of 2026-11-28

Commit [2c34c3c3bc](https://github.com/arianna-arpg/arpg-game-world/commit/2c34c3c3bcc20e0c5c89c35303faddb53e62c6dd), profile `full`. 840,980 episodes, 134.7 core-hours, 237 minutes end to end. [Run](https://github.com/arianna-arpg/arpg-game-world/actions/runs/46148519141).

## ✅ No regressions

Every committed baseline holds, nothing crashed, and the matrix has no new defects since last night.

## What moved since last night

No row moved past its own noise and 10%.

## Top proposed numbers

Advisory. Nothing here has been applied, and each needs your sign-off. Each row re-measured the subject on dice the night had not seen, solved for a number through the real game, and verified it at common seeds. 22 outlier(s) did not hold up on fresh dice, or landed within 15% of their target, and were dropped.

| # | subject | change | metric: before → after | cohort target | verdict | guards |
|---:|---|---|---|---:|---|---|
| 1 | class `trapper` | `skills.caltrops.baseDamage.physical.0`: 3 → 6.6 (+1 lines, ×2.2) | kill_rate: 0 → 0.1 | 0.1 | moved | none moved |
| 2 | class `firebrand` | `skills.trumpet_peal.baseDamage.lightning.0`: 7 → 18 (+1 lines, ×2.5) | kill_rate: 0 → 0 | 0 | moved, closes 70% | none moved |
| 3 | skill `shambler_horde` | `monsters.grave_shambler.explodeOnDeath`: 2.2 → 0.88 | dps_dummy: 19394.7 → 7757.9 | 680.5 | moved, closes 62% | none moved |
| 4 | skill `arclight_rain` | `skills.arclight_rain.baseDamage.physical.0`: 5 → 2 (+3 lines, ×0.4) | dps_dummy: 348.4 → 139.3 | 93.2 | moved, closes 82% | none moved |
| 5 | skill `marshlight` | `skills.marshlight.baseDamage.chaos.0`: 9 → 3.6 (+1 lines, ×0.4) | dps_dummy: 265.3 → 106.1 | 98.9 | moved | none moved |
| 6 | skill `mirespume` | `skills.mirespume.baseDamage.chaos.0`: 11 → 4.6 (+1 lines, ×0.42) | dps_dummy: 242.2 → 101.7 | 98.9 | moved | none moved |
| 7 | skill `infernal_bombardment` | `monsters.bombard_demon.explodeOnDeath`: 1.6 → 0.67 | dps_dummy: 15893.4 → 6692.5 | 6676.7 | moved | none moved |
| 8 | support `fire_walker` | `supports.fire_walker.mods.0.value`: 0.5 → 0.2 (+1 lines, ×0.4) | dps_dummy: 60.8 → 31.3 | 18.1 | moved, closes 69% | none moved |
| 9 | skill `glare_ice` | `skills.glare_ice.baseDamage.cold.0`: 4 → 10 (+1 lines, ×2.5) | dps_dummy: 1.4 → 3.4 | 4 | moved, closes 77% | none moved |
| 10 | skill `trailblaze` | `skills.trailblaze.baseDamage.fire.0`: 6 → 2.8 (+1 lines, ×0.47) | dps_dummy: 65.6 → 31.9 | 31.1 | moved | none moved |
| 11 | class `hivecaller` | `classes.hivecaller.attributes.strength`: 2 → 5 (+9 lines, ×2.5) | kill_rate: 0 → 0.1 | 0.2 | moved, closes 34% | mana_floor_pct 64.2→80.2 |
| 12 | support `sundering_flight` | `supports.sundering_flight.fissureTrail.damageScale`: 0.4 → 0.16 | dps_dummy: 49.8 → 30.3 | 19.4 | moved, closes 64% | none moved |
| 13 | class `beguiler` | `skills.beguile.baseDamage.chaos.0`: 4 → 10 (+1 lines, ×2.5) | kill_rate: 0 → 0 | 0.1 | moved, closes 28% | none moved |
| 14 | skill `keening_shriek` | `skills.keening_shriek.baseDamage.physical.0`: 4 → 7.2 (+1 lines, ×1.8) | dps_dummy: 2 → 3.5 | 3.6 | moved | none moved |
| 15 | support `volley` | `supports.volley.mods[stat=damage].value`: -0.25 → -0.63 | dps_dummy: 92.4 → 46.2 | 54.4 | moved | none moved |

<details><summary>Repro commands</summary>

1. `npm run sim -- whatif --knob 'skills.caltrops.baseDamage*2.2' --scenarios pressure:trapper:30 --seeds 30 --base-seed 3074903412`. Same change at other bands: `pressure:trapper:5` 0.4→0.6, `pressure:trapper:10` 0.2→0.5, `pressure:trapper:20` 0→0.2, `pressure:trapper:40` 0→0.1
2. `npm run sim -- whatif --knob 'skills.trumpet_peal.baseDamage*2.5' --scenarios parity:firebrand:40 --seeds 30 --base-seed 3074903412`. Same change at other bands: `parity:firebrand:5` 0→0.1, `parity:firebrand:10` 0→0.1, `parity:firebrand:20` 0→0
3. `npm run sim -- whatif --knob 'monsters.grave_shambler.explodeOnDeath*0.4' --scenarios skill:shambler_horde:40 --seeds 30 --base-seed 3074903412`. Other dials on this metric (elasticity): cooldown -0.71, useTime -0.36. Same change at other bands: `skill:shambler_horde:5` 257.8→103.1, `skill:shambler_horde:10` 768.4→307.4, `skill:shambler_horde:20` 3055.9→1222.4
4. `npm run sim -- whatif --knob 'skills.arclight_rain.baseDamage*0.4' --scenarios skill:arclight_rain:40 --seeds 30 --base-seed 3074903412`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.19, useTime 0.17. Same change at other bands: `skill:arclight_rain:5` 152.6→61, `skill:arclight_rain:10` 185.1→74, `skill:arclight_rain:20` 233.8→93.5
5. `npm run sim -- whatif --knob 'skills.marshlight.baseDamage*0.4' --scenarios skill:marshlight:10 --seeds 30 --base-seed 3074903412`. Other dials on this metric (elasticity): baseDamage 1.01, useTime -0.64, manaCost -0.03. Same change at other bands: `skill:marshlight:5` 229→91.7, `skill:marshlight:20` 315→126.1, `skill:marshlight:40` 443.7→177.5
6. `npm run sim -- whatif --knob 'skills.mirespume.baseDamage*0.42' --scenarios skill:mirespume:10 --seeds 30 --base-seed 3074903412`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.58. Same change at other bands: `skill:mirespume:5` 207.5→87.1, `skill:mirespume:20` 283.9→119.2, `skill:mirespume:40` 390.8→164.2
7. `npm run sim -- whatif --knob 'monsters.bombard_demon.explodeOnDeath*0.42' --scenarios skill:infernal_bombardment:40 --seeds 30 --base-seed 3074903412`. Other dials on this metric (elasticity): cooldown -0.73, useTime 0. Same change at other bands: `skill:infernal_bombardment:5` 239.7→103, `skill:infernal_bombardment:10` 686.5→292.4, `skill:infernal_bombardment:20` 2626.5→1111.3
8. `npm run sim -- whatif --knob 'supports.fire_walker.mods*0.4' --scenarios socketed:phoenix_dive:fire_walker:20 --seeds 30 --base-seed 3074903412`
9. `npm run sim -- whatif --knob 'skills.glare_ice.baseDamage*2.5' --scenarios skill:glare_ice:40 --seeds 30 --base-seed 3074903412`. Other dials on this metric (elasticity): cooldown -1.13, baseDamage 0.99. Same change at other bands: `skill:glare_ice:5` 0.8→2, `skill:glare_ice:10` 0.9→2.2, `skill:glare_ice:20` 1→2.6
10. `npm run sim -- whatif --knob 'skills.trailblaze.baseDamage*0.47' --scenarios skill:trailblaze:20 --seeds 30 --base-seed 3074903412`. Other dials on this metric (elasticity): baseDamage 0.99, cooldown -0.74. Same change at other bands: `skill:trailblaze:5` 50.8→25.2, `skill:trailblaze:10` 56.7→27.9, `skill:trailblaze:40` 86.9→41.3
11. `npm run sim -- whatif --knob 'classes.hivecaller.attributes*2.5' --scenarios pressure:hivecaller:5 --seeds 30 --base-seed 3074903412`. Same change at other bands: `pressure:hivecaller:10` 0→0.1, `pressure:hivecaller:20` 0→0.1, `pressure:hivecaller:40` 0→0.1
12. `npm run sim -- whatif --knob 'supports.sundering_flight.fissureTrail.damageScale*0.4' --scenarios socketed:ball_lightning:sundering_flight:20 --seeds 30 --base-seed 3074903412`
13. `npm run sim -- whatif --knob 'skills.beguile.baseDamage*2.5' --scenarios pressure:beguiler:20 --seeds 30 --base-seed 3074903412`. Same change at other bands: `pressure:beguiler:5` 0→0.1, `pressure:beguiler:10` 0→0, `pressure:beguiler:40` 0→0
14. `npm run sim -- whatif --knob 'skills.keening_shriek.baseDamage*1.8' --scenarios skill:keening_shriek:40 --seeds 30 --base-seed 3074903412`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.76. Same change at other bands: `skill:keening_shriek:5` 1.2→2.1, `skill:keening_shriek:10` 1.3→2.3, `skill:keening_shriek:20` 1.5→2.7
15. `npm run sim -- whatif --knob 'supports.volley.mods[stat=damage].value*2.5' --scenarios socketed:soulflay:volley:20 --seeds 30 --base-seed 3074903412`

Run from commit `2c34c3c3bcc20e0c5c89c35303faddb53e62c6dd`.
</details>

Too noisy to call: class `assassin`, class `wallwright`, affix `apply_poison`, affix `hadal_cold`, monster_durability `amalgam_bonelord`. The solved number moved each by less than its own seed-to-seed spread, so these need a calmer rig or more seeds before they mean anything.

### Combinations that run away

Confirmed on fresh dice at 20 times or more what their parts predict. A number this far out usually means damage feeding itself, so no single number fixes it: each needs a call on whether the feedback should be bounded.

- `class:brawler + support:momentum + support:grasping_tendrils + support:cascade`: measured 1.0e+12 damage per second, its parts predict 2461.9. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJicmF3bGVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImV2aXNjZXJhdGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJncmFzcGluZ190ZW5kcmlscyIsImdpYW50c2JhbmUiLCJhenVyZV9oYXJ2ZXN0Iiwic2VyZW5lX3Bvd2VyIl0sImxpbWIiOjB9LHsiaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYWxhY3JpdHkiLCJwb2x5cGhvbnkiLCJhdXN0ZXJpdHkiLCJhcG90aGVvc2lzIl19LHsiaWQiOiJzaGF0dGVyY2hvcmQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInJlc291bmRpbmdfZWNobyIsImNhc2NhZGUiXSwibGltYiI6MX0seyJpZCI6ImJhbGxfbGlnaHRuaW5nIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsibW9tZW50dW0iXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjo5MjI2OTg3MDMsInVuaXF1ZXMiOnsiZ2xvdmVzIjoiZ2FsZXdyaWdodHMiLCJoZWxtZXQiOiJncmF2ZWJsb29tIn19:spar --seeds 30 --base-seed 3074903412`</details>
- `class:berserker + primary:devouring_swarm + unique:cinderstep + support:accelerando`: measured 2.6e+11 damage per second, its parts predict 27885.6. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZGV2b3VyaW5nX3N3YXJtIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsic2xvd19tYXRjaCJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwidmlydWxlbmNlIl19LHsiaWQiOiJmbGFtZV9ibGFzdCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiYWNjZWxlcmFuZG8iLCJlZmZpY2llbmN5Il19LHsiaWQiOiJyZXB1bHNvcl9iZWFjb24iLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImNhc3Rfb25fYmxlZWQiXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjg2OTc4ODUxNywidW5pcXVlcyI6eyJib290cyI6ImNpbmRlcnN0ZXAiLCJnbG92ZXMiOiJnYWxld3JpZ2h0cyJ9fQ:spar --seeds 30 --base-seed 3074903412`</details>
- `class:resonator + support:cascade + support:scattered_cascade + support:seismic_march`: measured 3.6e+9 damage per second, its parts predict 639.6. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJyZXNvbmF0b3IiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZ3JpdF9zdGFuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiLCJvdmVybWF0Y2giLCJvc3RpbmF0byJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiY2FzY2FkZSIsInVubGVhc2giLCJzY2F0dGVyZWRfY2FzY2FkZSJdfSx7ImlkIjoiZmxhbWVfYmxhc3QiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbIm5vX21hbnNfbGFuZCIsImVmZmljaWVuY3kiXX0seyJpZCI6InJlcHVsc29yX2JlYWNvbiIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZmxlZXRmb290Il19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjg2OTc4ODUxNywidW5pcXVlcyI6eyJiZWx0IjoicGFsZV9iYXJnYWluIiwicmluZzEiOiJjb2FsX3JlbWVtYmVyZWQifX0:spar --seeds 30 --base-seed 3074903412`</details>
- `class:apothecary + unique:cindervigil + support:seismic_march + support:mana_feeder`: measured 1.2e+8 damage per second, its parts predict 10110.3. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJhcG90aGVjYXJ5IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6Im1hcmsiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzcGVudGJhbmUiLCJzdG9yZWRfdmVyZGljdCIsIm1lYXN1cmVkX2JsYWRlIiwic2xvd19icmV3Il19LHsiaWQiOiJkZXZvdXJpbmdfc3dhcm0iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJtYW5hX2ZlZWRlciJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwic2VwdGljX2JhcmdhaW4iLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJxdWlldF9oYW5kIiwiYWxhY3JpdHkiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjMxNDUxMTA5LCJ1bmlxdWVzIjp7ImhlbG1ldCI6ImNpbmRlcnZpZ2lsIiwicmluZzEiOiJzaGFyZWRfY3VwIn19:spar --seeds 30 --base-seed 3074903412`</details>
- `class:runeweaver + support:accelerando + primary:purity_of_elements + support:scattered_cascade`: measured 2.4e+7 damage per second, its parts predict 1168.1. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6InB1cml0eV9vZl9lbGVtZW50cyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImRlc3BlcmF0ZV9tZWFzdXJlcyIsInVwcm9vdGVyIiwiZWZmaWNpZW5jeSIsIm92ZXJtYXRjaCJdLCJsaW1iIjoxfSx7ImlkIjoiZ3JpdF9zdGFuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiLCJvdmVybWF0Y2giLCJvc3RpbmF0byJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJhY2NlbGVyYW5kbyIsImVmZmljaWVuY3kiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJ3YXJkIiwiZ2VhciI6InJhcmUiLCJncyI6OTUxODY3MzQ5LCJ1bmlxdWVzIjp7ImJlbHQiOiJzdG9ybV90aXRoZSJ9fQ:spar --seeds 30 --base-seed 3074903412`</details>
- `class:berserker + support:thoughtburn + support:scattered_cascade + support:seismic_march`: measured 7632479.9 damage per second, its parts predict 14551.7. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoidGVtcGVzdCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjJ9LHsiaWQiOiJjb21idXN0aW9uX3N0cmlrZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNlaXNtaWNfbWFyY2giLCJhY2NlbGVyYXRlZCIsInVubGVhc2giLCJzY2F0dGVyZWRfY2FzY2FkZSJdfSx7ImlkIjoiZmxhbWVfYmxhc3QiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImdpYW50c2JhbmUiLCJ0aG91Z2h0YnVybiJdfSx7ImlkIjoicmVwdWxzb3JfYmVhY29uIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJmbGVldGZvb3QiLCJwb2x5cGhvbnkiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJ3YXJkIiwiZ2VhciI6InJhcmUiLCJncyI6ODY5Nzg4NTE3LCJ1bmlxdWVzIjp7ImJvb3RzIjoid2FuZGVyZXJzX3dha2UiLCJnbG92ZXMiOiJnYWxld3JpZ2h0cyJ9fQ:spar --seeds 30 --base-seed 3074903412`</details>
- `class:resonator + support:accelerando + support:scattered_cascade + support:seismic_march`: measured 547189.2 damage per second, its parts predict 1000.7. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJyZXNvbmF0b3IiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZ3JpdF9zdGFuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiLCJvdmVybWF0Y2giLCJvc3RpbmF0byJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJhY2NlbGVyYW5kbyIsImVmZmljaWVuY3kiXX0seyJpZCI6InJlcHVsc29yX2JlYWNvbiIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZmxlZXRmb290Il19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjo4Njk3ODg1MTcsInVuaXF1ZXMiOnsiZ2xvdmVzIjoidW5zcGVudF9yZXBseSIsImhlbG1ldCI6ImdyYXZlYmxvb20ifX0:spar --seeds 30 --base-seed 3074903412`</details>
- `class:warrior + support:enduring_bond + support:deep_reserves + support:slow_burn`: measured 56861.6 damage per second, its parts predict 26. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJ3YXJyaW9yIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6Imludm9rZV9sYW1wYWQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJkZWVwX3Jlc2VydmVzIiwid3JhaXRoX3Bhc3NhZ2UiLCJlbmR1cmluZ19ib25kIiwiZXh0ZXJtaW5hdG9yIl19LHsiaWQiOiJlc3NlbmNlX2RyYWluIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJjYXN0X29uX3BvaXNvbiIsImJsb29kX3ByaWNlIl0sImxpbWIiOjF9LHsiaWQiOiJ3YXJfY2hhbnQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJjcmVlcGluZ19mdW1lcyIsIm1hZGRlbmluZ19taWFzbWEiLCJyaXRhcmRhbmRvIl0sImxpbWIiOjF9LHsiaWQiOiJpbmZlcm5hbF9ib21iYXJkbWVudCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbIndpZGVuaW5nIiwiY2FzY2FkaW5nX2NhbGwiLCJzbG93X2J1cm4iLCJtb25vbGl0aCJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjkxNDg0NDQwNywidW5pcXVlcyI6eyJiZWx0IjoicGFsZV9iYXJnYWluIiwiZ2xvdmVzIjoicm90ZV9oYW5kIn19:spar --seeds 30 --base-seed 3074903412`</details>
- `class:hivecaller + support:crescendo + support:steady_current + support:commanding`: measured 22565.3 damage per second, its parts predict 3.2. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJoaXZlY2FsbGVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImV5ZV9vZl90aGVfc3Rvcm0iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJwb2x5cGhvbnkiLCJzdGVhZHlfY3VycmVudCIsIndyYWl0aF9wYXNzYWdlIl19LHsiaWQiOiJzdG9ybWNyb3duIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiY2FzdF9vbl9raWxsIl19LHsiaWQiOiJhZWdpc193YXJkIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsiY2FzY2FkZSIsImNyZXNjZW5kbyIsIm5vX21hbnNfbGFuZCIsImxpbWJyZWF2ZXIiXSwibGltYiI6MH0seyJpZCI6ImluZmVybmFsX2JvbWJhcmRtZW50IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiY29tbWFuZGluZyIsInJhdmVuaW5nIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjE5MzUzOTE5MDQsInVuaXF1ZXMiOnsiYm9vdHMiOiJmbGVldGZlYXRoZXIiLCJyaW5nMiI6Im1pc2Vyc19sb29wIn19:spar --seeds 30 --base-seed 3074903412`</details>
- `class:guardian + primary:summon_scarecrow + support:crescendo + unique:titans_grasp`: measured 810 damage per second, its parts predict 0.9. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJndWFyZGlhbiIsImx2bCI6MjAsInNraWxscyI6W3siaWQiOiJzdW1tb25fc2NhcmVjcm93IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsidGl0YW5pYyIsImFsYWNyaXR5Iiwic2xpcHN0cmVhbSJdfSx7ImlkIjoiYmVja29uX3BhbGV3aXNwcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImRlZXBfcmVzZXJ2ZXMiLCJ2aW9sZW50X2Fycml2YWwiLCJzb3VsX3RldGhlciJdfSx7ImlkIjoiY2luZGVyX3N3YXJtIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsicGFsbGlkX3RvdWNoIiwic2VwdGljX2JhcmdhaW4iLCJibG9vZF9wcmljZSIsImNhc3Rfb25faGlnaF9yb2xsIl19LHsiaWQiOiJhZWdpc193YXJkIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsiY2FzY2FkZSIsImNyZXNjZW5kbyIsIm5vX21hbnNfbGFuZCJdLCJsaW1iIjowfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjoxMjcwNTQwNzQ3LCJ1bmlxdWVzIjp7Imdsb3ZlcyI6InRpdGFuc19ncmFzcCIsImhlbG1ldCI6ImdyYXZlYmxvb20ifX0:spar --seeds 30 --base-seed 3074903412`</details>

### Flagged for your decision

The numbers an author would reach for did not move these enough. They are not proposals: each needs a call on whether the mechanic is right, and none has been touched.

- class `chronomancer`: The numbers an author would reach for barely move this: skills.stasis_lock.baseDamage ×2.5 closes 11%; classes.chronomancer.attributes ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- skill `hurricane`: The numbers an author would reach for barely move this: skills.hurricane.baseDamage ×2.5 closes 14%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_threat `breach_arcling`: The numbers an author would reach for barely move this: monsterDamage.breach_arcling.all ×2.5 closes 15%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- support `resounding_echo`: The numbers an author would reach for barely move this: supports.resounding_echo.mods ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `stygian_doll`: The numbers an author would reach for barely move this: monsters.stygian_doll.base.life ×2.3 closes 3%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `sharper`: The numbers an author would reach for barely move this: skills.thrown_ace.baseDamage ×1 closes 0%; classes.sharper.attributes ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- affix `crowd_damage`: The numbers an author would reach for barely move this: affixes.crowd_damage.tiers.*.ranges ×2.5 closes 3%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `amalgam_fleshweaver`: The numbers an author would reach for barely move this: monsters.amalgam_fleshweaver.base.life ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- affix `proc_concussive`: The numbers an author would reach for barely move this: affixes.proc_concussive.tiers.*.ranges ×0.77 closes 9%. The cause may not be numeric, so this needs your decision rather than a tuning pass.

## Outliers

434 rows sit far from their cohort (log-scale median and MAD, z ≥ 3 and a ratio past 1.8× or 0.55×), 33 of them new tonight. Warned rows and zero rows never enter a cohort.

| | kind | subject | metric | value | cohort median | ratio | z | cohort |
|---|---|---|---|---:|---:|---:|---:|---|
|  | support | `sundering_flight` | output_multiplier | 3 | 1 | 2.9× | 18.2 | supports · effective hosts |
|  | support | `fire_walker` | output_multiplier | 2.8 | 1 | 2.74× | 17.2 | supports · effective hosts |
|  | support | `scorched_wake` | output_multiplier | 2.4 | 1 | 2.33× | 14.4 | supports · effective hosts |
|  | support | `mounting_frenzy` | output_multiplier | 2.3 | 1 | 2.27× | 14 | supports · effective hosts |
|  | monster_threat | `dream_tick` | dps_in | 0 | 18.1 | 0× | -13 | L25 · magician · body |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.05× | -12.8 | L30 · geared · pressure · kill_rate |
|  | support | `austerity` | output_multiplier | 0.5 | 1 | 0.48× | -12.6 | supports · effective hosts |
|  | support | `resounding_echo` | output_multiplier | 2.1 | 1 | 2.04× | 12.1 | supports · effective hosts |
|  | support | `crescendo` | output_multiplier | 2.1 | 1 | 2.02× | 12 | supports · effective hosts |
|  | support | `septic_bargain` | output_multiplier | 0.5 | 1 | 0.5× | -12 | supports · effective hosts |
|  | class | `chronomancer` | kill_rate | 0.1 | 0.6 | 0.08× | -11.4 | L20 · geared · pressure · kill_rate |
|  | support | `volley` | output_multiplier | 2 | 1 | 1.92× | 11.1 | supports · effective hosts |
| 🆕 | interaction | `class:runeweaver + support:accelerando + primary:purity_of_elements + support:scattered_cascade` | dps_out | 2.2e+7 | 1168.1 | 18875.6× | 10.3 | L40 main effects |
|  | support | `elemental_conduction` | output_multiplier | 1.9 | 1 | 1.82× | 10.2 | supports · effective hosts |
|  | monster_threat | `hadal_lantern` | dps_in | 0.1 | 15.3 | 0× | -10 | L12 · magician · body |
| 🆕 | interaction | `class:brawler + support:momentum + support:grasping_tendrils + support:cascade` | dps_out | 3.4e+7 | 2461.9 | 13752.2× | 9.9 | L40 main effects |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.07× | -9.9 | L40 · geared · pressure · kill_rate |
| 🆕 | interaction | `class:hivecaller + support:crescendo + support:steady_current + support:commanding` | dps_out | 28012.7 | 3.2 | 8739.34× | 9.5 | L40 main effects |
| 🆕 | interaction | `class:apothecary + unique:cindervigil + support:seismic_march + support:mana_feeder` | dps_out | 3.0e+7 | 10110.3 | 3011.06× | 9.3 | L20 main effects |
|  | class | `chronomancer` | kill_rate | 0 | 0.4 | 0.02× | -8.9 | L5 · geared · pressure · kill_rate |
|  | monster_threat | `dream_tick` | dps_in | 0.1 | 15.3 | 0.01× | -8.9 | L12 · magician · body |
| 🆕 | interaction | `class:skald + support:summon_phantasm + support:crescendo + unique:squallstep` | dps_out | 78.3 | 0.1 | 542.9× | 8.8 | L10 main effects |
| 🆕 | interaction | `class:resonator + support:cascade + support:scattered_cascade + support:seismic_march` | dps_out | 2953992.1 | 639.6 | 4618.3× | 8.8 | L40 main effects |
| 🆕 | interaction | `class:berserker + support:thoughtburn + support:scattered_cascade + support:seismic_march` | dps_out | 6.3e+7 | 14551.7 | 4316.13× | 8.7 | L40 main effects |
| 🆕 | interaction | `class:resonator + support:accelerando + support:scattered_cascade + support:seismic_march` | dps_out | 4112426.2 | 1000.7 | 4109.55× | 8.7 | L40 main effects |

<details><summary>Re-measure any of these</summary>

- sundering_flight: `npm run sim -- run --refs socketed:ball_lightning:sundering_flight:20 --seeds 10`
- fire_walker: `npm run sim -- run --refs socketed:phoenix_dive:fire_walker:20 --seeds 10`
- scorched_wake: `npm run sim -- run --refs socketed:blinding_ichor:scorched_wake:20 --seeds 10`
- mounting_frenzy: `npm run sim -- run --refs socketed:serpent_ray:mounting_frenzy:20 --seeds 10`
- dream_tick: `npm run sim -- run --refs threat:starter_magician_l25:dream_tick:25 --seeds 10`
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:30:geared --seeds 10`
- austerity: `npm run sim -- run --refs socketed:corpse_explosion:austerity:20 --seeds 10`
- resounding_echo: `npm run sim -- run --refs socketed:aftershock_snare:resounding_echo:20 --seeds 10`
- crescendo: `npm run sim -- run --refs socketed:immolation_blast:crescendo:20 --seeds 10`
- septic_bargain: `npm run sim -- run --refs socketed:pillar_of_flame:septic_bargain:20 --seeds 10`
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:20:geared --seeds 10`
- volley: `npm run sim -- run --refs socketed:soulflay:volley:20 --seeds 10`
- elemental_conduction: `npm run sim -- run --refs socketed:ballista_sentry:elemental_conduction:20 --seeds 10`
- hadal_lantern: `npm run sim -- run --refs threat:starter_magician_l12:hadal_lantern:12 --seeds 10`
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:40:geared --seeds 10`
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:5:geared --seeds 10`
- dream_tick: `npm run sim -- run --refs threat:starter_magician_l12:dream_tick:12 --seeds 10`

</details>

## Build search

187,316 candidates tonight (44,532 refused by the real gates), 2,259,492 over 30 night(s). The archive holds 1440 elite rows; 1428 were re-measured on this commit. Tried so far in a legal build: 39 of 39 classes, 576 of 576 primarys, 604 of 604 skills, 455 of 455 supports, 41 of 41 uniques.

| band | objective | build (top factors) | value | × band median | repro |
|---|---|---|---:|---:|---|
| L5 | offense | `class:runeweaver` `off:crit` `def:life` `gear:rare` `skill:living_bomb` | 92967.7 | 2806.9× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoibGl2aW5nX2JvbWIiLCJyYXJpdHkiOiJtYWdpYyIsIm92ZXIiOjEsInN1cHBvcnRzIjpbInJpdGFyZGFuZG8iXX0seyJpZCI6InN0b3JtYmluZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInRlbXBlc3RfcmFuZ2UiLCJyZWdpY2lkZSJdfSx7ImlkIjoiZW1iZXJiaW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsic2VhcmluZ19oZWF0IiwiYm9uZGJyZWFrZXIiLCJhY2NlbGVyYW5kbyIsImJsb29kX3RvbGwiXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJmb3JraW5nIiwibW91bnRpbmdfZnJlbnp5IiwicGFydGluZ19qdWRnZW1lbnQiLCJzdW5kZXJpbmdfZmxpZ2h0Il19XSwib2ZmIjoiY3JpdCIsImRlZiI6ImxpZmUiLCJnZWFyIjoicmFyZSIsImdzIjoxNDM3MjI5MDg5LCJ1bmlxdWVzIjp7ImFtdWxldCI6InN0b3JtY2FsbCIsInJpbmcxIjoiZW1iZXJicmFuZCJ9fQ --seeds 8 --base-seed 4017082993`</details> |
| L5 | offense | `class:runeweaver` `off:speed` `def:evasion` `gear:rare` `skill:squall_rune` | 84843.2 | 2561.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoic3F1YWxsX3J1bmUiLCJyYXJpdHkiOiJtYWdpYyJ9LHsiaWQiOiJzdG9ybWJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJ0ZW1wZXN0X3JhbmdlIl19LHsiaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJmbGVldGluZ19kZXZvdGlvbiIsImJvbmRicmVha2VyIiwiYWNjZWxlcmFuZG8iLCJibG9vZF90b2xsIl19LHsiaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiZm9ya2luZyIsIm1vdW50aW5nX2ZyZW56eSIsInBhcnRpbmdfanVkZ2VtZW50Iiwic3VuZGVyaW5nX2ZsaWdodCJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjE0MzcyMjkwODksInVuaXF1ZXMiOnsiYW11bGV0Ijoic3Rvcm1jYWxsIiwicmluZzEiOiJlbWJlcmJyYW5kIn19 --seeds 8 --base-seed 4017082993`</details> |
| L5 | clear | `class:chronomancer` `off:speed` `def:evasion` `gear:rare` `skill:indecision` | 6 | 20.4× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJpbmRlY2lzaW9uIiwicmFyaXR5IjoibWFnaWMiLCJvdmVyIjoxfSx7ImlkIjoic2hhdHRlcmNob3JkIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJyZXNvdW5kaW5nX2VjaG8iLCJjYXNjYWRlIl0sImxpbWIiOjF9XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6MTgwODkzMjgxfQ --seeds 8 --base-seed 1351559959`</details> |
| L5 | clear | `class:resonator` `off:damage` `def:none` `gear:rare` `skill:vampiric_presence` | 6 | 20.4× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJyZXNvbmF0b3IiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJ2YW1waXJpY19wcmVzZW5jZSIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsib3Zlcm1hdGNoIiwicmVnaWNpZGUiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwib3ZlciI6Miwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiZmV2ZXJlZF9oYW5kcyJdLCJsaW1iIjoxfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjoxMzU4NjUwODQ4fQ --seeds 8 --base-seed 3058515213`</details> |
| L10 | offense | `class:resonator` `off:speed` `def:armor` `gear:rare` `skill:mark` | 172478.6 | 4417× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJyZXNvbmF0b3IiLCJsdmwiOjEwLCJza2lsbHMiOlt7ImlkIjoibWFyayIsInJhcml0eSI6InJhcmUiLCJzdXBwb3J0cyI6WyJzaWVnZWJyZWFrZXIiLCJzcGVudGJhbmUiXX0seyJpZCI6InN0b3JtYmluZCIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoyfSx7ImlkIjoiZW1iZXJiaW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZmxlZXRpbmdfZGV2b3Rpb24iLCJ3cmFpdGhfcGFzc2FnZSIsInBvbHlwaG9ueSIsInN0b3JlZF92ZXJkaWN0Il19LHsiaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsibWVhc3VyZWRfYmxhZGUiLCJwYXJ0aW5nX2p1ZGdlbWVudCIsIm1vdW50aW5nX2ZyZW56eSIsInBhdGllbnRfZnVyeSJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjozNzE3MDg5NDQsInVuaXF1ZXMiOnsiYm9vdHMiOiJyaW1ld2FrZSIsImdsb3ZlcyI6InJvdGVfaGFuZCJ9fQ --seeds 8 --base-seed 4230749055`</details> |
| L10 | offense | `class:magician` `off:speed` `def:none` `gear:rare` `skill:nerve_pulse` | 169356 | 4337× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJuZXJ2ZV9wdWxzZSIsInJhcml0eSI6InJhcmUiLCJzdXBwb3J0cyI6WyJtZWFzdXJlZF9ibGFkZSJdfSx7ImlkIjoiZnJvc3Rfd2FsbCIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJlcGhlbWVyYWwiLCJzdXBwdXJhdGlvbiIsImdpYW50c2JhbmUiXX0seyJpZCI6ImVtYmVyYmluZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImZsZWV0aW5nX2Rldm90aW9uIiwid3JhaXRoX3Bhc3NhZ2UiXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzbG93X2JyZXciLCJwYXJ0aW5nX2p1ZGdlbWVudCIsIm1vdW50aW5nX2ZyZW56eSIsInJlbW5hbnRzIl19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6MTgyOTU0NzkyNiwidW5pcXVlcyI6eyJjaGVzdCI6InRoZV91bm1vdmVkIiwicmluZzEiOiJlbWJlcmJyYW5kIn19 --seeds 8 --base-seed 648093135`</details> |
| L10 | clear | `class:skald` `off:damage` `def:armor` `gear:rare` `skill:geyser_step` | 6 | 26.1× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJza2FsZCIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJnZXlzZXJfc3RlcCIsInJhcml0eSI6InJhcmUifSx7ImlkIjoiZG9vbV9iZWxsIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsibWVhc3VyZWRfYmxhZGUiXX0seyJpZCI6ImtlZW5pbmdfc2hyaWVrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsic3F1YXJlX3NpZ2lsIiwidGltZV9mdXNlIl19LHsiaWQiOiJmdXJvciIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInBvdGVuY3kiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjEwMzU5ODMwNTd9 --seeds 8 --base-seed 815439405`</details> |
| L10 | clear | `class:cleric` `off:speed` `def:none` `gear:rare` `skill:ruin` | 6 | 26.1× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjbGVyaWMiLCJsdmwiOjEwLCJza2lsbHMiOlt7ImlkIjoicnVpbiIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJyaWNvY2hldCJdLCJsaW1iIjoxfSx7ImlkIjoic2hhdHRlcmNob3JkIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJyZXNvdW5kaW5nX2VjaG8iLCJjYXNjYWRlIl0sImxpbWIiOjF9LHsiaWQiOiJsb25nX2NvbGQiLCJyYXJpdHkiOiJyYXJlIiwib3ZlciI6MSwibGltYiI6MX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjo5MTc2MDA2OTcsInVuaXF1ZXMiOnsicmluZzEiOiJzaGFyZWRfY3VwIn19 --seeds 8 --base-seed 4128348559`</details> |
| L20 | offense | `class:flagellant` `off:crit` `def:none` `gear:rare` `skill:glass_lance` | 931132 | 16741× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJmbGFnZWxsYW50IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImdsYXNzX2xhbmNlIiwicmFyaXR5IjoibGVnZW5kYXJ5In0seyJpZCI6InN1bW1vbl9ib25lX2dvbGVtIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbInN0ZWFkeV9uZXJ2ZSJdLCJsaW1iIjowfSx7ImlkIjoiZ3Jhc3BpbmdfY2hhc20iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJibG9vZF90b2xsIiwic3BsaW50ZXJlZF9lYXJ0aCIsImFjY2VsZXJhbmRvIiwiY3Jlc2NlbmRvIl19XSwib2ZmIjoiY3JpdCIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjoxMTc5MDU2MDIzLCJ1bmlxdWVzIjp7ImJlbHQiOiJzdG9ybV90aXRoZSIsImJvb3RzIjoicmltZXdha2UifX0 --seeds 8 --base-seed 3911086400`</details> |
| L20 | offense | `class:flagellant` `off:damage` `def:ward` `gear:rare` `skill:wildfire_sweep` | 881227.2 | 15843.7× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJmbGFnZWxsYW50IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6IndpbGRmaXJlX3N3ZWVwIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsicmVtbmFudF9jb25kdWl0Iiwic2llZ2VicmVha2VyIiwidW5sZWFzaCIsInN1bmJha2VkX2VkZ2UiXX0seyJpZCI6InN1bW1vbl9ib25lX2dvbGVtIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbInN0ZWFkeV9uZXJ2ZSJdLCJsaW1iIjoxfSx7ImlkIjoiZ3Jhc3BpbmdfY2hhc20iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJibG9vZF90b2xsIiwic3BsaW50ZXJlZF9lYXJ0aCIsImFjY2VsZXJhbmRvIiwiZGVzcGVyYXRpb24iXX0seyJpZCI6ImZyb3N0Z3VhcmQiLCJyYXJpdHkiOiJtYWdpYyIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInJlZ2ljaWRlIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjExNzkwNTYwMjMsInVuaXF1ZXMiOnsiYmVsdCI6IndpbnRlcl9hZnRlcl95b3UiLCJib290cyI6InJpbWV3YWtlIn19 --seeds 8 --base-seed 3911086400`</details> |
| L20 | clear | `class:tamer` `off:crit` `def:armor` `gear:rare` `skill:detonate_mines` | 6 | 26.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJ0YW1lciIsImx2bCI6MjAsInNraWxscyI6W3siaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImNhc3Rfb25fYmxlZWQiXX0seyJpZCI6ImZyb3N0X3B1bHNlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsicGllcmNpbmciXX0seyJpZCI6ImRvb21fYmVsbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNoYXR0ZXJnbGFzcyIsImZsb3dicmVha2VyIiwidXByb290ZXIiLCJtZWFzdXJlZF9ibG93cyJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjUzODk1NzY0NSwidW5pcXVlcyI6eyJhbXVsZXQiOiJ0dW5pbmdfZm9yayIsImhlbG1ldCI6ImdsZWFuZXJzX2Nyb3duIn19 --seeds 8 --base-seed 3669597176`</details> |
| L20 | clear | `class:resonator` `off:damage` `def:armor` `gear:rare` `skill:frost_pulse` | 6 | 26.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJyZXNvbmF0b3IiLCJsdmwiOjIwLCJza2lsbHMiOlt7ImlkIjoiZnJvc3RfcHVsc2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxfSx7ImlkIjoiZG9vbV9iZWxsIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2hhdHRlcmdsYXNzIiwiZmxvd2JyZWFrZXIiLCJ1cHJvb3RlciIsInVtYnJhbF9wb3dlciJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6MTQzOTY0ODQ3N30 --seeds 8 --base-seed 4230749055`</details> |
| L40 | offense | `class:juggernaut` `off:speed` `def:none` `gear:rare` `skill:shatterchord` | 995967.3 | 10996.4× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJqdWdnZXJuYXV0IiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImdpYW50c2JhbmUiLCJqaW54aW5nX3RvdWNoIiwiY2FzdF9vbl9wb2lzb24iLCJodW50ZXJzX21vbWVudHVtIl0sImxpbWIiOjB9LHsiaWQiOiJsaWdodG5pbmdfYmxhc3QiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJkZWF0aHNfZG9vciIsInN0dW5fY2hhbmNlIiwibWVhc3VyZWRfYmxhZGUiXX0seyJpZCI6InN1bW1vbl9ib25lX2dvbGVtIiwicmFyaXR5IjoicmFyZSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbInN0ZWFkeV9uZXJ2ZSIsImhhcmR5X2Jyb29kIiwicHlyZV9sZWdpb24iXSwibGltYiI6MH0seyJpZCI6ImdyYXNwaW5nX2NoYXNtIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYmxvb2RfdG9sbCIsInNwbGludGVyZWRfZWFydGgiLCJhY2NlbGVyYW5kbyIsImRlc3BlcmF0aW9uIl19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6MTc3NDMxMDUyMiwidW5pcXVlcyI6eyJiZWx0Ijoic3RhbmRpbmdfdG9hc3QiLCJsZWdzIjoic3F1YWxsc3RlcCJ9fQ --seeds 8 --base-seed 2018081847`</details> |
| L40 | offense | `class:juggernaut` `off:damage` `def:life` `gear:rare` `skill:lay_chitin_clutch` | 994520.2 | 10980.4× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJqdWdnZXJuYXV0IiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImxheV9jaGl0aW5fY2x1dGNoIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsiY2hpdGlub3VzX2Jyb29kIiwiZGVhdGhzX2Rvb3IiLCJ2aXRhbF9ib25kIl19LHsiaWQiOiJzdW1tb25fYm9uZV9nb2xlbSIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiXSwibGltYiI6MH0seyJpZCI6ImdyYXNwaW5nX2NoYXNtIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYmxvb2RfdG9sbCIsInNwbGludGVyZWRfZWFydGgiLCJhY2NlbGVyYW5kbyIsImRlc3BlcmF0aW9uIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjEwNDk2MDU1NzgsInVuaXF1ZXMiOnsiYW11bGV0IjoibGluZWFnZV9rbm90IiwiaGVsbWV0IjoiY2luZGVydmlnaWwifX0 --seeds 8 --base-seed 2018081847`</details> |
| L40 | clear | `class:breaker` `off:damage` `def:evasion` `gear:rare` `skill:ignite` | 6 | 26.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJicmVha2VyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6Imlnbml0ZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInBsdXNfZmlyZSIsImRlc3BlcmF0ZV9tZWFzdXJlcyJdLCJsaW1iIjowfSx7ImlkIjoiZG9vbV9iZWxsIiwicmFyaXR5IjoibGVnZW5kYXJ5In1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6MTY1ODIwNDA3OCwidW5pcXVlcyI6eyJhbXVsZXQiOiJsaW5lYWdlX2tub3QifX0 --seeds 8 --base-seed 1630346576`</details> |
| L40 | clear | `class:sentinel` `off:speed` `def:none` `gear:rare` `skill:oblation_of_life` | 6 | 26.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzZW50aW5lbCIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJvYmxhdGlvbl9vZl9saWZlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsibGluZ2VyaW5nIl19LHsiaWQiOiJkb29tX2JlbGwiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjE2MzA5MjQyMDIsInVuaXF1ZXMiOnsiY2hlc3QiOiJncm91bmRlZF9sYXR0aWNlIn19 --seeds 8 --base-seed 2054013263`</details> |

Playstyles at L5, best build found per style against the band's median style (50 styles): strongest `target · lightning` 94480.9 (2.25×), `construct · lightning` 87900.9 (2.09×), `area · lightning` 84676.1 (2.01×), `aura · cold` 83224 (1.98×); weakest `target · chaos` 16737.6 (0.4×), `detonate · cold` 17994.4 (0.43×), `projectile · cold` 20737.4 (0.49×), `target · cold` 21094.1 (0.5×).

Playstyles at L10, best build found per style against the band's median style (50 styles): strongest `area · fire` 184203 (2.04×), `mark · lightning` 171206 (1.89×), `projectile · fire` 160628.3 (1.78×), `aura · fire` 155724.4 (1.72×); weakest `target · chaos` 48480.4 (0.54×), `aura · chaos` 50975.9 (0.56×), `melee · chaos` 52176.8 (0.58×), `mark · chaos` 52660.8 (0.58×).

Playstyles at L20, best build found per style against the band's median style (50 styles): strongest `projectile · lightning` 935798.9 (1.93×), `area · fire` 883281.8 (1.82×), `mark · fire` 832705.9 (1.72×), `mark · chaos` 795100.6 (1.64×); weakest `detonate · physical` 171537.9 (0.35×), `detonate · fire` 184793.3 (0.38×), `detonate · cold` 216744 (0.45×), `detonate · lightning` 255369.1 (0.53×).

Playstyles at L40, best build found per style against the band's median style (50 styles): strongest `area · lightning` 993094 (1.15×), `detonate · fire` 992454 (1.15×), `court · chaos` 991649.6 (1.15×), `construct · chaos` 991572.3 (1.15×); weakest `mark · fire` 438479.3 (0.51×), `mark · chaos` 471272.2 (0.55×), `melee · fire` 561652.9 (0.65×), `target · cold` 577141.8 (0.67×).

Main effects at L5 over 19029 rows: strongest `limb:summon_bone_golem#0` 46.23×, `limb:raise_dead#0` 40.92×, `skill:grasping_chasm` 26.73×, `skill:ice_shards` 23.61×, `limb:summon_bone_golem#1` 20.67×; weakest `skill:raise_dead` 0.02×, `limb:shadow_step#1` 0.03×, `skill:harrowing_wail` 0.07×, `primary:summon_cherub` 0.07×, `skill:infinite_slashes` 0.09×.

Main effects at L10 over 27978 rows: strongest `primary:aegis_ward` 37.71×, `limb:summon_bone_golem#0` 29.05×, `limb:summon_bone_golem#1` 27.59×, `skill:grasping_chasm` 26.64×, `skill:ice_shards` 24.24×; weakest `limb:aegis_ward#0` 0.01×, `limb:aegis_ward#1` 0.03×, `limb:shadow_step#0` 0.03×, `skill:quiet_step` 0.04×, `limb:decoy#1` 0.04×.

Main effects at L20 over 37038 rows: strongest `limb:summon_bone_golem#0` 98.49×, `limb:summon_bone_golem#1` 86.09×, `primary:aegis_ward` 72.69×, `skill:ice_shards` 30.07×, `skill:grasping_chasm` 15.07×; weakest `limb:aegis_ward#0` 0.01×, `limb:aegis_ward#1` 0.02×, `skill:summon_bone_golem` 0.06×, `limb:raise_gnatveil#1` 0.09×, `limb:war_chant#1` 0.1×.

Main effects at L40 over 38720 rows: strongest `limb:shambler_horde#1` 116.19×, `primary:infernal_bombardment` 84.44×, `limb:summon_bone_golem#1` 43.38×, `limb:summon_bone_golem#0` 42.97×, `skill:ice_shards` 37.8×; weakest `primary:summon_bone_golem` 0.01×, `limb:aegis_ward#0` 0.01×, `limb:aegis_ward#1` 0.03×, `limb:war_chant#0` 0.06×, `limb:war_chant#1` 0.08×.

**Other combinations far off the sum of their parts**, confirmed on fresh dice (16 tried):

- `class:magician + primary:gather_cinderkin + support:taut_wire + support:nettles`: measured 1, its parts predict 60.6. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6NSwic2tpbGxzIjpbeyJpZCI6ImdhdGhlcl9jaW5kZXJraW4iLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbIm5ldHRsZXMiXX0seyJpZCI6InJlY2xhbWF0aW9uIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJlbmR1cmluZ19zbmFyZXMiXX0seyJpZCI6ImV4aHVtZSIsInJhcml0eSI6Im1hZ2ljIiwib3ZlciI6MSwic3VwcG9ydHMiOlsidGF1dF93aXJlIiwiYnVpbGRpbmdfcmh5dGhtIl19LHsiaWQiOiJhbGFybV9yZWVrIiwicmFyaXR5IjoibWFnaWMiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJub19tYW5zX2xhbmQiLCJib25kYnJlYWtlciJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6MjA2MTY3NDQ1NCwidW5pcXVlcyI6eyJoZWxtZXQiOiJncmF2ZWJsb29tIn19:spar --seeds 30 --base-seed 3074903412`</details>

## Tuning reads

Standing tables to tune from. Advisory.

**What +10 of each attribute is worth**, median across the roster at L20 geared (share of output on the sparring lane, share of time survived on the survival clock):

| attribute | output | time survived | classes where it did nothing |
|---|---:|---:|---:|
| strength | +4% | +2% | 0 of 39 |
| finesse | +4% | 0% | 1 of 39 |
| intelligence | +4% | 0% | 0 of 39 |
| wisdom | +2% | 0% | 0 of 39 |
| prowess | 0% | 0% | 2 of 39 |
| fortitude | 0% | +5% | 0 of 39 |
| dexterity | 0% | 0% | 0 of 39 |
| charisma | 0% | +2% | 0 of 39 |
| willpower | 0% | +2% | 0 of 39 |
| vitality | 0% | +9% | 0 of 39 |

**Support power**, median output change across the hosts each gem works on. Strongest: `sundering_flight` +199%, `fire_walker` +182%, `scorched_wake` +140%, `mounting_frenzy` +134%, `resounding_echo` +110%, `crescendo` +108%, `volley` +98%, `elemental_conduction` +87%. Weakest: `austerity` -51%, `septic_bargain` -49%, `pyre_legion` -36%, `rattling_salvo` -35%, `spirit_totem` -28%, `wraith_passage` -25%, `sweeping_blow` -20%, `nova_release` -20%.

**Against the target** of +10% to +15%: the median gem changes output by +8%. 22 in the band, 85 above it, 124 below it, 101 leave damage alone.

15 of these gems read off their own rig, because they need something a plain rig does not do: in the middle of a crowd (`alternating_strikes`, `unstable_flight`, `wild_abandon`, `tethered_orbit`, `gyre`, `vortex`, `sidewinder`, `trueflight`, `crosswind`); with a guard raised (`guarded_casting`); with a charge a second fed into its bank (`embargo`, `ravening`); against a plain dummy instead of a resistant one (`refraction`, `flameforged`, `rarefy`).

**Affix families** (211 measured on one magic piece against the same wardrobe without it, 11 never worn on the doll). Most output: `apply_poison` 2.11× on warrior, `apply_poison` 1.98× on magician, `apply_bleed` 1.71× on warrior, `apply_bleed` 1.64× on magician, `hadal_cold` 1.48× on magician, `hadal_cold` 1.46× on warrior, `proc_concussive` 1.4× on warrior, `creeper_barrow` 1.24× on warrior. Most time survived: `life_on_evade` 1.93× on warrior, `barnacle_crust` 1.74× on warrior, `chitin_plate` 1.59× on warrior, `life_on_hit` 1.58× on warrior, `life_on_evade` 1.54× on magician, `thorns` 1.54× on warrior. Moved nothing on these rigs: 3 families.

**What buffs, hexes, heals and wards add** (196 skills whose own numbers are not damage, at L20, against the same hero without them). Most output beside a plain strike: `infernal_bombardment` 14.1×, `summon_plaguefather` 6.4×, `summon_fire_golem` 4.83×, `summon_flame_sprite` 4.77×, `flame_totem` 4.77×, `shambler_horde` 4.25×, `bind_familiar` 4.22×, `reaper_swarm` 3.88×. Most time survived on the clock: `vampiric_presence` 11.85×, `repulsor_beacon` 11.85×, `summon_blade_wraith` 11.85×, `shambler_horde` 11.85×, `call_the_rift` 10.98×, `reaper_swarm` 10.25×, `summon_wraith` 9.04×, `infernal_bombardment` 6.63×. 35 moved neither at any band: their value lies outside these rigs, or they do nothing.

**Standing config numbers that move the headline rigs** (elasticity: % change in the metric per % change in the number). `hero_mana_per_level` → mana_floor_pct 0.18, `DEFENSE_CFG.evasion.weight` → dps_out 0.86, `DEFENSE_CFG.weight.refRadius` → dps_out -0.5, `DEFENSE_CFG.weight.refRadius` → mana_floor_pct 0.03, `DEFENSE_CFG.weight.radiusPow` → dps_out 0.04, `DEFENSE_CFG.weight.perPoise` → mana_floor_pct 0.02. 59 numbers moved nothing here.

**Provisional bands against the roster.** 23 of 96 band and tier rows have most of the roster outside the band. The measured spread is evidence for your sign-off, and no band changes on its own.

| metric | lane | tier | band | roster outside | measured p10 | median | p90 |
|---|---|---|---|---:|---:|---:|---:|
| player_deaths | parity | starter | L20 | 37 of 39 | 0.2 | 0.8 | 1 |
| player_deaths | parity | starter | L30 | 35 of 39 | 0 | 1 | 1 |
| player_deaths | parity | starter | L40 | 34 of 39 | 0 | 1 | 1 |
| player_deaths | parity | starter | L10 | 32 of 39 | 0 | 0.6 | 1 |
| ttk_wave_mean | parity | kitted | L40 | 28 of 38 | 6.7 | 23.6 | 48 |
| ttk_wave_mean | parity | kitted | L10 | 27 of 37 | 9.5 | 23.3 | 47.3 |
| ttk_wave_mean | parity | kitted | L5 | 23 of 32 | 10.4 | 24.9 | 40.7 |
| player_deaths | parity | starter | L5 | 28 of 39 | 0 | 0.2 | 1 |
| ttk_wave_mean | parity | starter | L10 | 15 of 21 | 12.4 | 18.6 | 40.3 |
| ttk_wave_mean | parity | kitted | L30 | 27 of 38 | 8.1 | 23 | 49.6 |
| ttk_wave_mean | parity | kitted | L20 | 26 of 38 | 9.3 | 21.8 | 49.1 |
| ttk_wave_mean | parity | starter | L40 | 10 of 15 | 9.6 | 17.5 | 33 |

## The instrument

Class expression at the top band: 38 read on the dummy, 1 need the sparring partner, 0 read only in the pack lanes, 0 mute.
Bestiary: 19674 rows measured, 100 bodies not fielded (passive or immortal fixtures). 161 bodies never swung at a hero standing idle within reach, so their threat reads as unmeasured: 102 have no skills, 31 carry kits with no damage, 6 are rooted, 7 lie in ambush, 9 only fight once fought, and 6 have a damage kit and legs and did not swing in a duel either (`cloud_grazer`, `kettle_minnow`, `sand_scorpion`, `star_grazer`, `white_hart`, `wool_aphid`).
How the bodies fought: on an idle hero the median first blow lands at 0.98s. In a duel, 21% of casts are melee, a body spends 17% of the fight within its own melee reach, and it uses 2 skills. No body pressed a skill that was refused.
Skills: 2930 rows across the bands; 902 read zero alone and are not ranked (buffs, auras and mines show nothing without a partner), 30 warned.
Suites: 91 scenarios, 15 of 105 graded metrics outside their provisional band, 12 warned.
Matrix: 127,530 of 127,530 eligible pairs probed (100%), deep lane on 25352 pairs. Verdicts: effective 78653, blind 30564, inert 14446, cost_only 1428, negligible 2439.
Against the committed ledger (8481 rows): 12422 not on file, 2008 measuring healthy. The ledger only changes through `matrix check --reconcile`.

## What ran, and what did not

| lane | units planned | ok | gate breach | crashed/killed | out of time or not run | episodes | core-hours |
|---|---:|---:|---:|---:|---:|---:|---:|
| baselines | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| audits | 4 | 4 | 0 | 0 | 0 | 0 | 0 |
| expression | 1 | 1 | 0 | 0 | 0 | 1,208 | 0.1 |
| census | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| suites | 1 | 1 | 0 | 0 | 0 | 910 | 0.1 |
| progression | 39 | 39 | 0 | 0 | 0 | 12,480 | 3.4 |
| skills | 5 | 5 | 0 | 0 | 0 | 8,790 | 1.1 |
| skills_vs | 21 | 21 | 0 | 0 | 0 | 24,192 | 3.9 |
| matchups | 24 | 24 | 0 | 0 | 0 | 13,734 | 4.6 |
| bestiary | 60 | 60 | 0 | 0 | 0 | 78,696 | 12.5 |
| attributes | 39 | 39 | 0 | 0 | 0 | 4,914 | 1.7 |
| affixes | 5 | 5 | 0 | 0 | 0 | 3,472 | 0.9 |
| assists | 8 | 8 | 0 | 0 | 0 | 4,752 | 1.5 |
| socket_play | 1 | 1 | 0 | 0 | 0 | 900 | 0.2 |
| globals | 4 | 4 | 0 | 0 | 0 | 1,704 | 0.2 |
| matrix | 171 | 171 | 0 | 0 | 0 | 235,854 | 37 |
| matrix_deep | 84 | 84 | 0 | 0 | 0 | 117,690 | 15.5 |
| search | 40 | 40 | 0 | 0 | 0 | 294,292 | 44.4 |
| archive_confirm | 39 | 39 | 0 | 0 | 0 | 22,848 | 5.2 |
| proposals | 48 | 48 | 0 | 0 | 0 | 14,544 | 2.4 |

Every planned unit ran.

Not simulated at all, by design: zone generation and XP pacing, event pressure, multiplayer, and real player skill. Pilots are simple policies, so kit ceilings are floors. Bands stay provisional until you sign them off.
