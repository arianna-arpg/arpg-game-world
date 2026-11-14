# Balance farm results

Data branch: machine-written by `.github/workflows/balance-farm.yml`. Do not edit by hand.

- `latest/` the newest night: `summary.json`, `digest.md`
- `nights/<date>/` one small record per night
- `trend.jsonl` one line per night
- `state/` what the next night builds on: the search archive, measured lane costs, row snapshot

Page: https://arianna-arpg.github.io/arpg-game-world/balance/

---

# Balance farm, night of 2026-11-14

Commit [83b6fbfb9a](https://github.com/arianna-arpg/arpg-game-world/commit/83b6fbfb9a32df69e84e0f2e53087d20e362f6bc), profile `full`. 664,911 episodes, 149.8 core-hours, 293 minutes end to end. [Run](https://github.com/arianna-arpg/arpg-game-world/actions/runs/43590812385).

## ✅ No regressions

Every committed baseline holds, nothing crashed, and the matrix has no new defects since last night.

## What moved since last night

200 row(s) moved past their own noise and 10%. Largest first:

| row | before | after | change |
|---|---:|---:|---:|
| `monster:manor_mouser:magician:L5:threat` | 0.58 | 4.24 | +631% |
| `monster:marrow_leech:magician:L5:ttk` | 3.36 | 9.26 | +176% |
| `monster:gutwall_titan:magician:L5:veteran` | 1.39 | 2.88 | +107% |
| `monster:aurora_weaver:magician:L12:ttk` | 0 | 21.5 | +100% |
| `monster:chain_warden:magician:L5:ttk` | 0 | 16.42 | +100% |
| `monster:cistern_crone:magician:L12:ttk` | 0 | 15.73 | +100% |
| `monster:gilded_scamp:magician:L12:ttk` | 0 | 21.45 | +100% |
| `monster:hadal_lantern:magician:L5:ttk` | 0 | 18.4 | +100% |
| `monster:harvester:magician:L25:ttk` | 0 | 17.32 | +100% |
| `monster:rookery_condor:magician:L25:ttk` | 0 | 15.42 | +100% |
| `monster:breach_arcling:warrior:L25:ttk` | 0 | 24.05 | +100% |
| `monster:canopy_screecher:warrior:L12:ttk` | 0 | 24.12 | +100% |
| `monster:gleam_dove:warrior:L12:ttk` | 0 | 24.87 | +100% |
| `monster:mesa_baboon:warrior:L25:ttk` | 0 | 22.77 | +100% |
| `monster:null_adept:warrior:L5:ttk` | 0 | 22.58 | +100% |
| `monster:river_naiad:warrior:L5:ttk` | 0 | 24.27 | +100% |
| `monster:scaffold_colossus:warrior:L5:ttk` | 0 | 23.55 | +100% |
| `monster:seedcase_bombardier:warrior:L25:ttk` | 0 | 24.88 | +100% |
| `monster:shard_gardener:warrior:L5:ttk` | 0 | 22.03 | +100% |
| `monster:silver_shoal:warrior:L5:ttk` | 0 | 24.95 | +100% |
| `monster:will_o_wisp:warrior:L25:ttk` | 0 | 15.07 | +100% |
| `monster:zenith_falcon:warrior:L25:ttk` | 0 | 18.98 | +100% |
| `monster:abyssal_horror:magician:L12:ttk` | 0 | 19.95 | +100% |
| `monster:briar_beast:magician:L5:ttk` | 0 | 21.78 | +100% |
| `monster:brood_sovereign:magician:L12:ttk` | 0 | 23.73 | +100% |

## Top proposed numbers

Advisory. Nothing here has been applied, and each needs your sign-off. Each row re-measured the subject on dice the night had not seen, solved for a number through the real game, and verified it at common seeds. 29 outlier(s) did not hold up on fresh dice, or landed within 15% of their target, and were dropped.

| # | subject | change | metric: before → after | cohort target | verdict | guards |
|---:|---|---|---|---:|---|---|
| 1 | class `trapper` | `skills.caltrops.baseDamage.physical.0`: 3 → 6.6 (+1 lines, ×2.2) | kill_rate: 0 → 0.1 | 0.1 | moved | none moved |
| 2 | skill `shambler_horde` | `monsters.grave_shambler.explodeOnDeath`: 2.2 → 0.88 | dps_dummy: 19394.7 → 7757.9 | 680.5 | moved, closes 62% | none moved |
| 3 | class `hivecaller` | `classes.hivecaller.attributes.strength`: 2 → 5 (+9 lines, ×2.5) | kill_rate: 0 → 0.1 | 0.2 | moved, closes 56% | mana_floor_pct 65.1→80.2 |
| 4 | skill `arclight_rain` | `skills.arclight_rain.baseDamage.physical.0`: 5 → 2 (+3 lines, ×0.4) | dps_dummy: 347.9 → 139.2 | 93.2 | moved, closes 82% | none moved |
| 5 | skill `marshlight` | `skills.marshlight.baseDamage.chaos.0`: 9 → 3.6 (+1 lines, ×0.4) | dps_dummy: 267.6 → 107.1 | 98.9 | moved | none moved |
| 6 | skill `mirespume` | `skills.mirespume.baseDamage.chaos.0`: 11 → 4.5 (+1 lines, ×0.41) | dps_dummy: 244.3 → 100.1 | 98.9 | moved | none moved |
| 7 | skill `infernal_bombardment` | `monsters.bombard_demon.explodeOnDeath`: 1.6 → 0.67 | dps_dummy: 15916.5 → 6702.8 | 6676.7 | moved | none moved |
| 8 | support `fire_walker` | `supports.fire_walker.mods.0.value`: 0.5 → 0.2 (+1 lines, ×0.4) | dps_dummy: 60.8 → 31.5 | 17.8 | moved, closes 68% | none moved |
| 9 | skill `glare_ice` | `skills.glare_ice.baseDamage.cold.0`: 4 → 10 (+1 lines, ×2.5) | dps_dummy: 1.3 → 3.2 | 4 | moved, closes 69% | none moved |
| 10 | skill `trailblaze` | `skills.trailblaze.baseDamage.fire.0`: 6 → 2.8 (+1 lines, ×0.46) | dps_dummy: 65.8 → 31.3 | 31.1 | moved | none moved |
| 11 | skill `keening_shriek` | `skills.keening_shriek.baseDamage.physical.0`: 4 → 7.6 (+1 lines, ×1.9) | dps_dummy: 1.9 → 3.6 | 3.6 | moved | none moved |
| 12 | support `sundering_flight` | `supports.sundering_flight.fissureTrail.damageScale`: 0.4 → 0.16 | dps_dummy: 49.7 → 30.3 | 19.7 | moved, closes 65% | none moved |
| 13 | support `volley` | `supports.volley.mods[stat=damage].value`: -0.25 → -0.63 | dps_dummy: 93.1 → 46.6 | 54.1 | moved | none moved |
| 14 | monster_threat `lidless_watcher` | `skills.gaze_beam.baseDamage.chaos.0`: 4 → 9.2 (+1 lines, ×2.3) | dps_in: 0.4 → 7.3 | 7.4 | moved | none moved |
| 15 | monster_threat `seatless_usher` | `skills.ushers_lull.baseDamage.chaos.0`: 4 → 10 (+1 lines, ×2.5) | dps_in: 0 → 7.3 | 7.4 | moved | none moved |

<details><summary>Repro commands</summary>

1. `npm run sim -- whatif --knob 'skills.caltrops.baseDamage*2.2' --scenarios pressure:trapper:30 --seeds 30 --base-seed 3845821935`. Same change at other bands: `pressure:trapper:5` 0.4→0.6, `pressure:trapper:10` 0.2→0.5, `pressure:trapper:20` 0.1→0.2, `pressure:trapper:40` 0→0
2. `npm run sim -- whatif --knob 'monsters.grave_shambler.explodeOnDeath*0.4' --scenarios skill:shambler_horde:40 --seeds 30 --base-seed 3845821935`. Other dials on this metric (elasticity): cooldown -0.71, useTime -0.36. Same change at other bands: `skill:shambler_horde:5` 257.8→103.1, `skill:shambler_horde:10` 768.4→307.4, `skill:shambler_horde:20` 3055.9→1222.4
3. `npm run sim -- whatif --knob 'classes.hivecaller.attributes*2.5' --scenarios pressure:hivecaller:5 --seeds 30 --base-seed 3845821935`. Same change at other bands: `pressure:hivecaller:10` 0→0.1, `pressure:hivecaller:20` 0→0.1, `pressure:hivecaller:40` 0.1→0.1
4. `npm run sim -- whatif --knob 'skills.arclight_rain.baseDamage*0.4' --scenarios skill:arclight_rain:40 --seeds 30 --base-seed 3845821935`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.2, useTime 0.17. Same change at other bands: `skill:arclight_rain:5` 152.7→61.1, `skill:arclight_rain:10` 185.3→74.1, `skill:arclight_rain:20` 234.1→93.6
5. `npm run sim -- whatif --knob 'skills.marshlight.baseDamage*0.4' --scenarios skill:marshlight:10 --seeds 30 --base-seed 3845821935`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.7, manaCost -0.03. Same change at other bands: `skill:marshlight:5` 229.4→91.8, `skill:marshlight:20` 317.1→126.8, `skill:marshlight:40` 451.9→180.8
6. `npm run sim -- whatif --knob 'skills.mirespume.baseDamage*0.41' --scenarios skill:mirespume:10 --seeds 30 --base-seed 3845821935`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.63. Same change at other bands: `skill:mirespume:5` 211.2→86.6, `skill:mirespume:20` 288.9→118.5, `skill:mirespume:40` 397.8→163.1
7. `npm run sim -- whatif --knob 'monsters.bombard_demon.explodeOnDeath*0.42' --scenarios skill:infernal_bombardment:40 --seeds 30 --base-seed 3845821935`. Other dials on this metric (elasticity): cooldown -0.79. Same change at other bands: `skill:infernal_bombardment:5` 240→103.2, `skill:infernal_bombardment:10` 686.2→292.2, `skill:infernal_bombardment:20` 2624.2→1109
8. `npm run sim -- whatif --knob 'supports.fire_walker.mods*0.4' --scenarios socketed:phoenix_dive:fire_walker:20 --seeds 30 --base-seed 3845821935`
9. `npm run sim -- whatif --knob 'skills.glare_ice.baseDamage*2.5' --scenarios skill:glare_ice:40 --seeds 30 --base-seed 3845821935`. Other dials on this metric (elasticity): cooldown -1.32, baseDamage 1.01. Same change at other bands: `skill:glare_ice:5` 0.7→1.9, `skill:glare_ice:10` 0.8→2.1, `skill:glare_ice:20` 1→2.4
10. `npm run sim -- whatif --knob 'skills.trailblaze.baseDamage*0.46' --scenarios skill:trailblaze:20 --seeds 30 --base-seed 3845821935`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.77. Same change at other bands: `skill:trailblaze:5` 50.5→24.6, `skill:trailblaze:10` 56.2→27.2, `skill:trailblaze:40` 86.7→40.3
11. `npm run sim -- whatif --knob 'skills.keening_shriek.baseDamage*1.9' --scenarios skill:keening_shriek:40 --seeds 30 --base-seed 3845821935`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.89. Same change at other bands: `skill:keening_shriek:5` 1.1→2.1, `skill:keening_shriek:10` 1.2→2.3, `skill:keening_shriek:20` 1.4→2.7
12. `npm run sim -- whatif --knob 'supports.sundering_flight.fissureTrail.damageScale*0.4' --scenarios socketed:ball_lightning:sundering_flight:20 --seeds 30 --base-seed 3845821935`
13. `npm run sim -- whatif --knob 'supports.volley.mods[stat=damage].value*2.5' --scenarios socketed:soulflay:volley:20 --seeds 30 --base-seed 3845821935`
14. `npm run sim -- whatif --knob 'skills.gaze_beam.baseDamage*2.3' --scenarios threat:starter_magician_l25:lidless_watcher:25 --seeds 30 --base-seed 3845821935`. Other dials on this metric (elasticity): kit.gaze_beam 7.02. Same change at other bands: `threat:starter_magician_l5:lidless_watcher:5` 2.1→4.8, `threat:starter_magician_l10:lidless_watcher:10` 1→4.7, `threat:starter_magician_l20:lidless_watcher:20` 1.2→7, `threat:starter_magician_l40:lidless_watcher:40` 1→11.2
15. `npm run sim -- whatif --knob 'skills.ushers_lull.baseDamage*2.5' --scenarios threat:starter_magician_l25:seatless_usher:25 --seeds 30 --base-seed 3845821935`. Other dials on this metric (elasticity): kit.ushers_lull 24.86. Same change at other bands: `threat:starter_magician_l5:seatless_usher:5` 1.9→4.8, `threat:starter_magician_l10:seatless_usher:10` 0.6→4.7, `threat:starter_magician_l20:seatless_usher:20` 0.5→6.9, `threat:starter_magician_l40:seatless_usher:40` 0.2→10.7

Run from commit `83b6fbfb9a32df69e84e0f2e53087d20e362f6bc`.
</details>

Too noisy to call: class `firebrand`, class `assassin`, class `beguiler`, class `wallwright`, class `sharper`. The solved number moved each by less than its own seed-to-seed spread, so these need a calmer rig or more seeds before they mean anything.

### Combinations that run away

Confirmed on fresh dice at 20 times or more what their parts predict. A number this far out usually means damage feeding itself, so no single number fixes it: each needs a call on whether the feedback should be bounded.

- `class:brawler + unique:cinderstep + support:grasping_tendrils + support:momentum`: measured 2.0e+14 damage per second, its parts predict 114747.2. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJicmF3bGVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImV2aXNjZXJhdGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJncmFzcGluZ190ZW5kcmlscyIsImdpYW50c2JhbmUiLCJhenVyZV9oYXJ2ZXN0Iiwic2VyZW5lX3Bvd2VyIl0sImxpbWIiOjB9LHsiaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYWxhY3JpdHkiLCJwb2x5cGhvbnkiLCJhdXN0ZXJpdHkiLCJhcG90aGVvc2lzIl19LHsiaWQiOiJzaGF0dGVyY2hvcmQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInJlc291bmRpbmdfZWNobyIsImNhc2NhZGUiXSwibGltYiI6MX0seyJpZCI6ImJhbGxfbGlnaHRuaW5nIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsibW9tZW50dW0iXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjkyMjY5ODcwMywidW5pcXVlcyI6eyJib290cyI6ImNpbmRlcnN0ZXAiLCJoZWxtZXQiOiJncmF2ZWJsb29tIn19:spar --seeds 30 --base-seed 3845821935`</details>
- `class:brawler + support:grasping_tendrils + support:momentum + support:resounding_echo`: measured 5.4e+8 damage per second, its parts predict 3969.2. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJicmF3bGVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImV2aXNjZXJhdGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJncmFzcGluZ190ZW5kcmlscyIsImdpYW50c2JhbmUiLCJhenVyZV9oYXJ2ZXN0Iiwic2VyZW5lX3Bvd2VyIl0sImxpbWIiOjF9LHsiaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsiYWxhY3JpdHkiLCJib25kYnJlYWtlciIsImF1c3Rlcml0eSIsImFwb3RoZW9zaXMiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfSx7ImlkIjoiYmFsbF9saWdodG5pbmciLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJtb21lbnR1bSIsInF1YWlsYmFuZSJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6OTIyNjk4NzAzLCJ1bmlxdWVzIjp7ImFtdWxldCI6InJvdW5kZWxheSIsImhlbG1ldCI6ImdyYXZlYmxvb20ifX0:spar --seeds 30 --base-seed 3845821935`</details>
- `class:berserker + unique:cinderstep + primary:oblation_of_mana + support:accelerated`: measured 4.0e+7 damage per second, its parts predict 27809.1. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoib2JsYXRpb25fb2ZfbWFuYSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImRlc3BlcmF0ZV9tZWFzdXJlcyJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJhY2NlbGVyYW5kbyIsImVmZmljaWVuY3kiXX0seyJpZCI6InJlcHVsc29yX2JlYWNvbiIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZmxlZXRmb290Il19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjo4Njk3ODg1MTcsInVuaXF1ZXMiOnsiYm9vdHMiOiJjaW5kZXJzdGVwIiwiZ2xvdmVzIjoiZ2FsZXdyaWdodHMifX0:spar --seeds 30 --base-seed 3845821935`</details>
- `class:berserker + support:accelerated + support:scattered_cascade + support:unleash`: measured 1.4e+7 damage per second, its parts predict 4507.8. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZ3JpdF9zdGFuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiLCJvdmVybWF0Y2giLCJvc3RpbmF0byJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJhY2NlbGVyYW5kbyIsImVmZmljaWVuY3kiXX0seyJpZCI6InJlcHVsc29yX2JlYWNvbiIsInJhcml0eSI6Im1hZ2ljIn1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjg2OTc4ODUxNywidW5pcXVlcyI6eyJhbXVsZXQiOiJsaW5lYWdlX2tub3QiLCJnbG92ZXMiOiJnYWxld3JpZ2h0cyJ9fQ:spar --seeds 30 --base-seed 3845821935`</details>
- `class:berserker + unique:cinderstep + support:accelerated + support:scattered_cascade`: measured 4697000.3 damage per second, its parts predict 19351. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZ3JpdF9zdGFuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiLCJvdmVybWF0Y2giLCJvc3RpbmF0byIsImh1bnRlcnNfbW9tZW50dW0iXX0seyJpZCI6ImNvbWJ1c3Rpb25fc3RyaWtlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2Vpc21pY19tYXJjaCIsImFjY2VsZXJhdGVkIiwidW5sZWFzaCIsInNjYXR0ZXJlZF9jYXNjYWRlIl19LHsiaWQiOiJmbGFtZV9ibGFzdCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiYWNjZWxlcmFuZG8iLCJlZmZpY2llbmN5Il19LHsiaWQiOiJyZXB1bHNvcl9iZWFjb24iLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImZsZWV0Zm9vdCJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6ODY5Nzg4NTE3LCJ1bmlxdWVzIjp7ImJvb3RzIjoiY2luZGVyc3RlcCIsImdsb3ZlcyI6ImdhbGV3cmlnaHRzIn19:spar --seeds 30 --base-seed 3845821935`</details>
- `class:berserker + primary:orbital_blades + support:accelerated + support:scattered_cascade`: measured 1377609.6 damage per second, its parts predict 5613.3. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoib3JiaXRhbF9ibGFkZXMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJhY2NlbGVyYW5kbyIsImVmZmljaWVuY3kiXX0seyJpZCI6InJlcHVsc29yX2JlYWNvbiIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZmxlZXRmb290IiwiY2FzdF9vbl9pZ25pdGlvbiJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6ODY5Nzg4NTE3LCJ1bmlxdWVzIjp7Imdsb3ZlcyI6ImdhbGV3cmlnaHRzIiwibGVncyI6InNxdWFsbHN0ZXAifX0:spar --seeds 30 --base-seed 3845821935`</details>
- `class:runeweaver + unique:bloodletters_girdle + support:square_sigil + unique:misers_loop`: measured 236.5 damage per second, its parts predict 1. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoicmVjbGFtYXRpb24iLCJyYXJpdHkiOiJtYWdpYyIsIm92ZXIiOjEsInN1cHBvcnRzIjpbImVuZHVyaW5nX3NuYXJlcyJdfSx7ImlkIjoiYmVja29uX3BhbGV3aXNwcyIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsid2VhdGhlcnZhbmUiXX0seyJpZCI6ImFsYXJtX3JlZWsiLCJyYXJpdHkiOiJtYWdpYyIsIm92ZXIiOjEsInN1cHBvcnRzIjpbIm5vX21hbnNfbGFuZCIsInNxdWFyZV9zaWdpbCJdfSx7ImlkIjoibWFyc2hsaWdodCIsInJhcml0eSI6Im1hZ2ljIiwib3ZlciI6Miwic3VwcG9ydHMiOlsiY29uY3Vzc2l2ZV9ibG93cyJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjc0NzIyNjAxOCwidW5pcXVlcyI6eyJiZWx0IjoiYmxvb2RsZXR0ZXJzX2dpcmRsZSIsInJpbmcxIjoibWlzZXJzX2xvb3AifX0:spar --seeds 30 --base-seed 3845821935`</details>
- `class:cryomancer + support:time_fuse + support:crowd_favor + unique:emberbrand`: measured 209.9 damage per second, its parts predict 3.5. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJjcnlvbWFuY2VyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoiZXhwb3NlX3dlYWtuZXNzIiwicmFyaXR5IjoibWFnaWMiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJ0aW1lX2Z1c2UiLCJzcGlyaXRfdG90ZW0iXSwibGltYiI6MH0seyJpZCI6Im1hcmsiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsiZGVsaWJlcmF0ZV9ydWluIiwid3JhaXRoX3Bhc3NhZ2UiLCJjcm93ZF9mYXZvciJdfSx7ImlkIjoiaW1wZXJpb3VzX2JhcnJhZ2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJibG9vZF9wcmljZSIsInRldGhlcmVkX29yYml0IiwiYWRkbGluZyIsInNsb3dfbWF0Y2giXX0seyJpZCI6InZlbm9tX2JvbHQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImFyY2hvbnNfd2VsbHNwcmluZyJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJsaWZlIiwiZ2VhciI6InJhcmUiLCJncyI6NDY3Mzc5MzcsInVuaXF1ZXMiOnsiY2hlc3QiOiJhZWdpc19vZl90aGVfZHJvd25lZCIsInJpbmcxIjoiZW1iZXJicmFuZCJ9fQ:spar --seeds 30 --base-seed 3845821935`</details>
- `class:sorcerer + support:summon_phantasm + support:afterspray + support:teeming_vein`: measured 149.4 damage per second, its parts predict 0.7. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJzb3JjZXJlciIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJsaWdodG5pbmdfYmxhc3QiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsiY3VsbWluYXRpb24iLCJjcmVzY2VuZG8iLCJzdW1tb25fcGhhbnRhc20iXX0seyJpZCI6InVwZHJhZnRfYnVyc3QiLCJyYXJpdHkiOiJyYXJlIiwib3ZlciI6MSwic3VwcG9ydHMiOlsiZW1iYXJnbyJdfSx7ImlkIjoiaHVycmljYW5lIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbInRlZW1pbmdfdmVpbiIsIndyYWl0aF9wYXNzYWdlIiwib3JiaXRhbF9zd2VlcCJdfSx7ImlkIjoic2hhZG93X3N0ZXAiLCJyYXJpdHkiOiJyYXJlIiwib3ZlciI6MSwic3VwcG9ydHMiOlsibW9ub2xpdGgiLCJhZnRlcnNwcmF5Il0sImxpbWIiOjB9XSwib2ZmIjoiY3JpdCIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjoxNTg3MzY3ODIxLCJ1bmlxdWVzIjp7ImNoZXN0IjoidGhlX3VubW92ZWQifX0:spar --seeds 30 --base-seed 3845821935`</details>
- `class:sorcerer + support:summon_phantasm + support:afterspray + support:building_rhythm`: measured 139 damage per second, its parts predict 1.2. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJzb3JjZXJlciIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJsaWdodG5pbmdfYmxhc3QiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsidW5zdGFibGVfY29tcHJlc3Npb24iLCJjcmVzY2VuZG8iLCJzdW1tb25fcGhhbnRhc20iXX0seyJpZCI6InVwZHJhZnRfYnVyc3QiLCJyYXJpdHkiOiJyYXJlIiwib3ZlciI6MSwic3VwcG9ydHMiOlsiZW1iYXJnbyIsInR1cmJ1bGVuY2UiXX0seyJpZCI6ImtpbmRsZV93aWNrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsiZmxlZXRmb290IiwibGluZ2VyaW5nIl19LHsiaWQiOiJzaGFkb3dfc3RlcCIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJtb25vbGl0aCIsImFmdGVyc3ByYXkiLCJidWlsZGluZ19yaHl0aG0iXSwibGltYiI6MH1dLCJvZmYiOiJjcml0IiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjE1ODczNjc4MjEsInVuaXF1ZXMiOnsiY2hlc3QiOiJhZWdpc19vZl90aGVfZHJvd25lZCIsImxlZ3MiOiJzcXVhbGxzdGVwIn19:spar --seeds 30 --base-seed 3845821935`</details>

### Flagged for your decision

The numbers an author would reach for did not move these enough. They are not proposals: each needs a call on whether the mechanic is right, and none has been touched.

- class `chronomancer`: The numbers an author would reach for barely move this: skills.stasis_lock.baseDamage ×2.5 closes 8%; classes.chronomancer.attributes ×2.5 closes 7%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- skill `hurricane`: The numbers an author would reach for barely move this: skills.hurricane.baseDamage ×2.5 closes 14%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `necromancer`: The numbers an author would reach for barely move this: skills.poison_nova.baseDamage ×0.4 closes 5%; skills.despair.baseDamage ×1 closes 0%; skills.poison_nova.baseDamage & skills.despair.baseDamage ×0.4 closes 5%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- support `septic_bargain`: The numbers an author would reach for barely move this: supports.septic_bargain.mods ×2.5 closes 14%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- support `resounding_echo`: The numbers an author would reach for barely move this: supports.resounding_echo.mods ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_threat `breach_arcling`: The numbers an author would reach for barely move this: monsterDamage.breach_arcling.all ×2.5 closes 11%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_threat `gloam`: The numbers an author would reach for barely move this: monsterDamage.gloam.all ×2.5 closes 2%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `stygian_doll`: The numbers an author would reach for barely move this: monsters.stygian_doll.base.life ×2.5 closes 1%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `amalgam_fleshweaver`: The numbers an author would reach for barely move this: monsters.amalgam_fleshweaver.base.life ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- affix `crowd_damage`: The numbers an author would reach for barely move this: affixes.crowd_damage.tiers.*.ranges ×2.5 closes 3%. The cause may not be numeric, so this needs your decision rather than a tuning pass.

## Outliers

446 rows sit far from their cohort (log-scale median and MAD, z ≥ 3 and a ratio past 1.8× or 0.55×), 73 of them new tonight. Warned rows and zero rows never enter a cohort.

| | kind | subject | metric | value | cohort median | ratio | z | cohort |
|---|---|---|---|---:|---:|---:|---:|---|
|  | support | `sundering_flight` | output_multiplier | 3 | 1 | 2.9× | 18.2 | supports · effective hosts |
|  | support | `fire_walker` | output_multiplier | 2.8 | 1 | 2.74× | 17.2 | supports · effective hosts |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.05× | -15.1 | L30 · geared · pressure · kill_rate |
|  | support | `scorched_wake` | output_multiplier | 2.4 | 1 | 2.33× | 14.4 | supports · effective hosts |
|  | monster_threat | `seatless_usher` | dps_in | 0 | 17 | 0× | -14 | L25 · magician · body |
|  | support | `mounting_frenzy` | output_multiplier | 2.3 | 1 | 2.27× | 14 | supports · effective hosts |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.07× | -13.7 | L20 · geared · pressure · kill_rate |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.05× | -12.9 | L40 · geared · pressure · kill_rate |
| 🆕 | monster_threat | `banshee` | dps_in | 0 | 17 | 0× | -12.7 | L25 · magician · body |
|  | support | `austerity` | output_multiplier | 0.5 | 1 | 0.48× | -12.6 | supports · effective hosts |
|  | support | `resounding_echo` | output_multiplier | 2.1 | 1 | 2.04× | 12.1 | supports · effective hosts |
|  | support | `crescendo` | output_multiplier | 2.1 | 1 | 2.02× | 12 | supports · effective hosts |
|  | support | `septic_bargain` | output_multiplier | 0.5 | 1 | 0.5× | -12 | supports · effective hosts |
|  | class | `chronomancer` | kill_rate | 0 | 0.5 | 0.04× | -11.9 | L10 · geared · pressure · kill_rate |
| 🆕 | monster_threat | `formic_gluewright` | dps_in | 0 | 17 | 0× | -11.1 | L25 · magician · body |
|  | support | `volley` | output_multiplier | 2 | 1 | 1.92× | 11.1 | supports · effective hosts |
| 🆕 | interaction | `class:brawler + support:grasping_tendrils + support:momentum + support:resounding_echo` | dps_out | 7.1e+7 | 3969.2 | 17896.92× | 11 | L40 main effects |
|  | support | `elemental_conduction` | output_multiplier | 1.9 | 1 | 1.82× | 10.2 | supports · effective hosts |
|  | monster_threat | `hadal_lantern` | dps_in | 0.1 | 15.2 | 0× | -10 | L12 · magician · body |
| 🆕 | interaction | `class:berserker + support:accelerated + support:scattered_cascade + support:unleash` | dps_out | 2.8e+7 | 4507.8 | 6201.77× | 9.8 | L40 main effects |
| 🆕 | interaction | `class:brawler + support:grasping_tendrils + support:momentum + support:resounding_echo` | dps_out | 1.5e+8 | 27218.3 | 5573.03× | 9.7 | L40 main effects |
| 🆕 | interaction | `class:hivecaller + support:afterspray + support:pressure_seal + support:cloudborne` | dps_out | 24.3 | 0.1 | 427.64× | 9.3 | L10 main effects |
|  | affix | `attr_willpower` | dps_out | 134.4 | 150.5 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `crowd_damage` | dps_out | 274.3 | 312 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `drowned_regalia` | dps_out | 134.4 | 150.5 | 0.06× | -9.1 | L20 · magician · affix output |

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
- attr_willpower: `npm run sim -- run --refs affix:magician:20:helmet:attr_willpower:10397677:spar --seeds 10`
- crowd_damage: `npm run sim -- run --refs affix:magician:20:gloves:crowd_damage:10397677:spar --seeds 10`
- drowned_regalia: `npm run sim -- run --refs affix:magician:20:helmet:drowned_regalia:10397677:spar --seeds 10`

</details>

## Build search

81,940 candidates tonight (18,681 refused by the real gates), 1,042,249 over 16 night(s). The archive holds 1430 elite rows; 1412 were re-measured on this commit. Tried so far in a legal build: 39 of 39 classes, 576 of 576 primarys, 604 of 604 skills, 455 of 455 supports, 41 of 41 uniques.

| band | objective | build (top factors) | value | × band median | repro |
|---|---|---|---:|---:|---|
| L5 | offense | `class:runeweaver` `off:crit` `def:ward` `gear:rare` `skill:voltaic_orb` | 36081.3 | 919.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoidm9sdGFpY19vcmIiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInBlcmZlY3RfZHJhdyJdfSx7ImlkIjoic3Rvcm1iaW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsidGVtcGVzdF9yYW5nZSJdfSx7ImlkIjoiY29sZF92b3J0ZXgiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInJlc291bmRpbmdfZWNobyJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImFyY2luZyIsImRlZXBfcmVzZXJ2ZXMiLCJwYXJ0aW5nX2p1ZGdlbWVudCIsInNwbGl0dGluZyJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJ3YXJkIiwiZ2VhciI6InJhcmUiLCJncyI6NDg1MjY5NTgsInVuaXF1ZXMiOnsiYW11bGV0Ijoic3Rvcm1jYWxsIiwicmluZzEiOiJlbWJlcmJyYW5kIn19 --seeds 8 --base-seed 212193165`</details> |
| L5 | offense | `class:runeweaver` `off:damage` `def:ward` `gear:rare` `skill:voltaic_orb` | 35710.1 | 910.2× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoidm9sdGFpY19vcmIiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInBlcmZlY3RfZHJhdyJdfSx7ImlkIjoic3Rvcm1iaW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsidGVtcGVzdF9yYW5nZSIsImRlZXBfcmVzZXJ2ZXMiXX0seyJpZCI6ImVtYmVyYmluZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImZsZWV0aW5nX2Rldm90aW9uIiwic2xvd19icmV3IiwiYWNjZWxlcmFuZG8iLCJibG9vZF90b2xsIl19LHsiaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsiYXJjaW5nIiwic2xvd19icmV3IiwicGFydGluZ19qdWRnZW1lbnQiLCJzcGxpdHRpbmciXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJ3YXJkIiwiZ2VhciI6InJhcmUiLCJncyI6NDg1MjY5NTgsInVuaXF1ZXMiOnsiYW11bGV0Ijoic3Rvcm1jYWxsIiwicmluZzEiOiJlbWJlcmJyYW5kIn19 --seeds 8 --base-seed 212193165`</details> |
| L5 | clear | `class:magician` `off:speed` `def:none` `gear:rare` `skill:icy_comet` | 6 | 18.4× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6NSwic2tpbGxzIjpbeyJpZCI6ImljeV9jb21ldCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsid2lsZF9hYmFuZG9uIl19LHsiaWQiOiJsb25nX2NvbGQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzaWVnZWJyZWFrZXIiLCJkb21pbmlvbl90aXRoZSIsIndpZGVuaW5nIiwibWFuYV9mZWVkZXIiXSwibGltYiI6MH0seyJpZCI6ImluZmVybmFsX2Nhbm5vbmFkZSIsInJhcml0eSI6Im1hZ2ljIn1dLCJvZmYiOiJzcGVlZCIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjo1NTMwNDA5MTcsInVuaXF1ZXMiOnsiYW11bGV0Ijoic3Rvcm1jYWxsIn19 --seeds 8 --base-seed 2036412140`</details> |
| L5 | clear | `class:pyromancer` `off:crit` `def:armor` `gear:rare` `skill:mark` | 6 | 18.4× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJweXJvbWFuY2VyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoibWFyayIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVnaWNpZGUiLCJjcm93ZF9mYXZvciJdfSx7ImlkIjoic2hhdHRlcmNob3JkIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJyZXNvdW5kaW5nX2VjaG8iLCJjYXNjYWRlIl0sImxpbWIiOjB9XSwib2ZmIjoiY3JpdCIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6MTQ1OTMzODAwMSwidW5pcXVlcyI6eyJib290cyI6ImZsZWV0ZmVhdGhlciJ9fQ --seeds 8 --base-seed 3077928437`</details> |
| L10 | offense | `class:magician` `off:speed` `def:ward` `gear:rare` `skill:summon_bone_golem` | 73922.9 | 1900× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJzdW1tb25fYm9uZV9nb2xlbSIsInJhcml0eSI6InJhcmUiLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiXSwibGltYiI6MH0seyJpZCI6ImdyYXNwaW5nX2NoYXNtIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiYmxvb2RfdG9sbCIsInNwbGludGVyZWRfZWFydGgiLCJhY2NlbGVyYW5kbyIsImRlc3BlcmF0aW9uIl19LHsiaWQiOiJmcm9zdGd1YXJkIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJyZWdpY2lkZSJdfSx7ImlkIjoiZnJvc3Rfc3Rvcm0iLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInBvbHlwaG9ueSIsInNwaXJpdF90b3RlbSJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjkzNjUyNDk0MywidW5pcXVlcyI6eyJoZWxtZXQiOiJnbGVhbmVyc19jcm93biIsImxlZ3MiOiJzcXVhbGxzdGVwIn19 --seeds 8 --base-seed 685246491`</details> |
| L10 | offense | `class:summoner` `off:speed` `def:life` `gear:rare` `skill:detonate_mines` | 62224 | 1599.3× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzdW1tb25lciIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJlbWJhcmdvIiwic2xvd19tYXRjaCIsImNhc3Rfd2hpbGVfZ3VhcmRpbmciXX0seyJpZCI6Im1hcmsiLCJyYXJpdHkiOiJsZWdlbmRhcnkifSx7ImlkIjoiZW1iZXJiaW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZmxlZXRpbmdfZGV2b3Rpb24iLCJzbG93X2JyZXciLCJtZWFzdXJlZF9ibGFkZSIsImJsb29kX3RvbGwiXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJtb3VudGluZ19mcmVuenkiLCJ2b2xsZXkiLCJwYXJ0aW5nX2p1ZGdlbWVudCIsInByZXNzdXJlX3NlYWwiXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImxpZmUiLCJnZWFyIjoicmFyZSIsImdzIjoxNDQ4OTQ3OTE2LCJ1bmlxdWVzIjp7ImJvb3RzIjoicmltZXdha2UiLCJjaGVzdCI6Imdyb3VuZGVkX2xhdHRpY2UifX0 --seeds 8 --base-seed 2492267446`</details> |
| L10 | clear | `class:flagellant` `off:damage` `def:evasion` `gear:rare` `skill:ice_shards` | 6 | 22.7× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJmbGFnZWxsYW50IiwibHZsIjoxMCwic2tpbGxzIjpbeyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJyYXJlIiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2Vla2VyIiwicml0dWFsX2dyb3VuZCIsInN1bW1vbl9waGFudGFzbSJdfSx7ImlkIjoid2FyX2hvcm4iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJndWFyZGVkX2Nhc3RpbmciXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6InJhcmUiLCJzdXBwb3J0cyI6WyJjaGFtYmVyZWRfY2FzdGluZyJdLCJsaW1iIjoxfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjo5MzY1MjQ5NDN9 --seeds 8 --base-seed 4065090653`</details> |
| L10 | clear | `class:necromancer` `off:speed` `def:evasion` `gear:rare` `skill:mark` | 6 | 22.7× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJuZWNyb21hbmNlciIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJtYXJrIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbImZsZWV0Zm9vdCJdfSx7ImlkIjoiZG9vbV9iZWxsIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2hhdHRlcmdsYXNzIiwiZmxvd2JyZWFrZXIiLCJ1cHJvb3RlciJdfSx7ImlkIjoic3BvcmVmYWxsIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbImdpYW50c2JhbmUiLCJ1bnN0YWJsZV9jb21wcmVzc2lvbiJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjQ2MzA2NTE2fQ --seeds 8 --base-seed 165486625`</details> |
| L20 | offense | `class:sentinel` `off:damage` `def:evasion` `gear:rare` `skill:requiem` | 210403.3 | 3364.3× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzZW50aW5lbCIsImx2bCI6MjAsInNraWxscyI6W3siaWQiOiJyZXF1aWVtIiwicmFyaXR5IjoibGVnZW5kYXJ5In0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzdW5kZXJpbmdfZmxpZ2h0Iiwic2xvd19icmV3IiwicGFydGluZ19qdWRnZW1lbnQiLCJtb3VudGluZ19mcmVuenkiXX0seyJpZCI6InBhaW5faG91bmRzIiwicmFyaXR5IjoibGVnZW5kYXJ5In1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6MTY4MTc2MjQzNywidW5pcXVlcyI6eyJib290cyI6InJpbWV3YWtlIiwiaGVsbWV0IjoiY2luZGVydmlnaWwifX0 --seeds 8 --base-seed 387471182`</details> |
| L20 | offense | `class:juggernaut` `off:damage` `def:none` `gear:rare` `skill:rune_of_power` | 197360.6 | 3155.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJqdWdnZXJuYXV0IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6InJ1bmVfb2ZfcG93ZXIiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJ1bmxlYXNoIiwicml0YXJkYW5kbyIsImRlbGliZXJhdGVfcnVpbiIsInNpZWdlYnJlYWtlciJdLCJsaW1iIjoxfSx7ImlkIjoiZW1iZXJiaW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiYWNjZWxlcmFuZG8iLCJzbG93X2JyZXciLCJwb2x5cGhvbnkiLCJibG9vZF90b2xsIl19LHsiaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiY2hpbGxfY2hhbmNlIiwicGFydGluZ19qdWRnZW1lbnQiLCJ1bmJsaW5raW5nIiwic3Bvb2xpbmciXX0seyJpZCI6ImNvbWJ1c3Rpb25fc3RyaWtlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2Vpc21pY19tYXJjaCIsImNhc3Rfb25faGlnaF9yb2xsIiwic2VhcmluZ19oZWF0Iiwic2NhdHRlcmVkX2Nhc2NhZGUiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6MTAwOTg1NjIzNSwidW5pcXVlcyI6eyJib290cyI6InJpbWV3YWtlIiwiaGVsbWV0IjoiaGFsb19uaW50aF9jaG9pciJ9fQ --seeds 8 --base-seed 3615477420`</details> |
| L20 | clear | `class:juggernaut` `off:speed` `def:none` `gear:rare` `skill:warp` | 6 | 23.9× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJqdWdnZXJuYXV0IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6IndhcnAiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJsaW1iIjowfSx7ImlkIjoiYmVja29uX3BhbGV3aXNwcyIsInJhcml0eSI6InJhcmUiLCJzdXBwb3J0cyI6WyJtb3VudGluZ19mcmVuenkiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfSx7ImlkIjoiY29uc2VjcmF0aW9uIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsibWFkZGVuaW5nX21pYXNtYSIsImF1c3Rlcml0eSJdLCJsaW1iIjowfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjEyMDA4NTIxNzcsInVuaXF1ZXMiOnsiYW11bGV0Ijoicm91bmRlbGF5IiwiYm9vdHMiOiJ0aG91c2FuZF9zdGVwcyJ9fQ --seeds 8 --base-seed 2623919459`</details> |
| L20 | clear | `class:brawler` `off:damage` `def:none` `gear:rare` `skill:expose_weakness` | 6 | 23.9× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJicmF3bGVyIiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImV4cG9zZV93ZWFrbmVzcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImJsb29kX3RvbGwiLCJzbG93X2JyZXciLCJhYnVuZGFudF9oYXJ2ZXN0Il0sImxpbWIiOjB9LHsiaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZW1iYXJnbyIsImRlc3BlcmF0ZV9tZWFzdXJlcyIsInJhdmVuaW5nIiwidGVybWluYWxfdmVsb2NpdHkiXX0seyJpZCI6Im1hZ21hX3dhcmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJhZnRlcnNob2NrcyIsImNoaWxsX2NoYW5jZSIsImNvbG9zc3VzX3N0YW5jZSJdfSx7ImlkIjoiZG9vbV9iZWxsIiwicmFyaXR5IjoibGVnZW5kYXJ5In1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6MTkwMzg4MjkzOX0 --seeds 8 --base-seed 2973341187`</details> |
| L40 | offense | `class:apothecary` `off:damage` `def:evasion` `gear:rare` `skill:blood_mortgage` | 809208.1 | 10535.2× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJhcG90aGVjYXJ5IiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImJsb29kX21vcnRnYWdlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiaW5zdWxhdGlvbiIsIndhcmRpbmdfZmxlc2giLCJzdG9yZWRfdmVyZGljdCJdLCJsaW1iIjowfSx7ImlkIjoic2hhbWJsZXJfaG9yZGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJwbHVzX21pbmlvbiIsInJhdmVub3VzX3BhY3QiLCJjYXNjYWRpbmdfY2FsbCIsImVwaGVtZXJhbCJdLCJsaW1iIjoxfSx7ImlkIjoiaW52aXNpYmlsaXR5IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsicHJlc3N1cmVfc2VhbCJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjo0NzE0NzM0NzMsInVuaXF1ZXMiOnsiaGVsbWV0IjoiZ3JhdmVibG9vbSIsInJpbmcxIjoiY29tbW9uX3B1bHNlIn19 --seeds 8 --base-seed 2247071625`</details> |
| L40 | offense | `class:sorcerer` `off:speed` `def:evasion` `gear:rare` `skill:mender_relic` | 665731.5 | 8667.3× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzb3JjZXJlciIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJtZW5kZXJfcmVsaWMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzZXF1ZW5jZWRfaW52b2NhdGlvbiIsInJhdmVub3VzX3BhY3QiLCJ0YXV0X3dpcmUiLCJnYXRoZXJlZF9jYXN0aW5nIl19LHsiaWQiOiJzdG9ybWJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJ0ZW1wZXN0X3JhbmdlIl19LHsiaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJmbGVldGluZ19kZXZvdGlvbiIsInNsb3dfYnJldyIsInBvbHlwaG9ueSIsImJsb29kX3RvbGwiXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzcG9vbGluZyIsInNob2NrX2NoYW5jZSIsInBhcnRpbmdfanVkZ2VtZW50IiwiZmxvd2JyZWFrZXIiXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjoyMDk0MTM1NTUyLCJ1bmlxdWVzIjp7ImJvb3RzIjoicmltZXdha2UiLCJjaGVzdCI6InRoZV91bm1vdmVkIn19 --seeds 8 --base-seed 2359179582`</details> |
| L40 | clear | `class:berserker` `off:speed` `def:none` `gear:rare` `skill:caul_lash` | 6 | 25.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiY2F1bF9sYXNoIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsicmFyZWZ5IiwiYnVyaWVkX2NoYXJnZSIsImJyaXN0bGluZ19yaXBvc3RlIiwiZmxlZXRmb290Il19LHsiaWQiOiJzaGF0dGVyY2hvcmQiLCJyYXJpdHkiOiJtYWdpYyIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImxvYWRlZF9kaWNlIiwiY2FzY2FkZSJdLCJsaW1iIjoxfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjE5MTQwNzEzODl9 --seeds 8 --base-seed 2838927007`</details> |
| L40 | clear | `class:sentinel` `off:speed` `def:none` `gear:rare` `skill:consecration` | 6 | 25.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzZW50aW5lbCIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJjb25zZWNyYXRpb24iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJ0YXV0X3dpcmUiXSwibGltYiI6MH0seyJpZCI6ImRvb21fYmVsbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjF9XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6MTYzMDkyNDIwMiwidW5pcXVlcyI6eyJjaGVzdCI6Imdyb3VuZGVkX2xhdHRpY2UifX0 --seeds 8 --base-seed 387471182`</details> |

Playstyles at L5, best build found per style against the band's median style (50 styles): strongest `projectile · fire` 36475.1 (3.3×), `projectile · lightning` 35873.8 (3.24×), `self · lightning` 35705.1 (3.23×), `area · lightning` 33173.4 (3×); weakest `detonate · cold` 2026.9 (0.18×), `mark · cold` 4279.9 (0.39×), `mark · chaos` 4500.4 (0.41×), `aura · cold` 4653.8 (0.42×).

Playstyles at L10, best build found per style against the band's median style (50 styles): strongest `court · chaos` 74615 (1.89×), `detonate · fire` 61905 (1.56×), `aura · cold` 56917.6 (1.44×), `projectile · lightning` 56679.9 (1.43×); weakest `mark · cold` 9959.3 (0.25×), `mark · chaos` 11197.9 (0.28×), `detonate · chaos` 11434.9 (0.29×), `aura · chaos` 13701.1 (0.35×).

Playstyles at L20, best build found per style against the band's median style (50 styles): strongest `aura · physical` 484504.5 (3.93×), `melee · physical` 377356.5 (3.06×), `area · fire` 213847 (1.73×), `area · lightning` 196800.7 (1.6×); weakest `mark · chaos` 29296 (0.24×), `mark · lightning` 55919.9 (0.45×), `mark · cold` 61708.7 (0.5×), `construct · physical` 66013.4 (0.54×).

Playstyles at L40, best build found per style against the band's median style (50 styles): strongest `aura · fire` 869815.5 (3.65×), `target · chaos` 857388.5 (3.6×), `court · fire` 809208.2 (3.39×), `projectile · fire` 671815.4 (2.82×); weakest `court · chaos` 81795.8 (0.34×), `court · lightning` 95867.6 (0.4×), `court · cold` 115741.5 (0.49×), `melee · cold` 118067.5 (0.5×).

Main effects at L5 over 8169 rows: strongest `skill:grasping_chasm` 27.32×, `primary:reapers_toll` 12.35×, `primary:venomous_aura` 12.24×, `skill:ice_shards` 11.04×, `skill:emberbind` 8.1×; weakest `skill:reapers_toll` 0.1×, `skill:venomous_aura` 0.15×, `skill:glare_ice` 0.17×, `skill:beckon_palewisps` 0.18×, `skill:storm_call` 0.18×.

Main effects at L10 over 12904 rows: strongest `limb:verdict#1` 26.05×, `skill:grasping_chasm` 19.24×, `limb:mana_flask#2` 13.15×, `skill:ice_shards` 12.53×, `limb:sanguine_burst#0` 9.62×; weakest `limb:decoy#1` 0.03×, `limb:shadow_step#0` 0.04×, `limb:decoy#0` 0.05×, `skill:verdict` 0.06×, `limb:war_chant#1` 0.08×.

Main effects at L20 over 16361 rows: strongest `skill:grasping_chasm` 25.42×, `primary:judgement_pillar` 18.15×, `skill:combustion_strike` 13.88×, `skill:ice_shards` 13.33×, `primary:temporal_pad` 9.43×; weakest `limb:war_chant#1` 0.1×, `limb:raise_gnatveil#1` 0.13×, `limb:warp#1` 0.14×, `primary:toxic_domain` 0.15×, `support:reckless_transfusion` 0.2×.

Main effects at L40 over 17020 rows: strongest `limb:shambler_horde#1` 114.09×, `primary:infernal_bombardment` 39.74×, `skill:ice_shards` 25.91×, `limb:summon_swarmlings#0` 11.78×, `skill:emberbind` 9.64×; weakest `skill:summon_swarmlings` 0.05×, `limb:war_chant#0` 0.08×, `limb:war_chant#1` 0.09×, `primary:aegis_ward` 0.1×, `limb:aegis_ward#0` 0.11×.

**Other combinations far off the sum of their parts**, confirmed on fresh dice (16 tried):

- `class:summoner + primary:guardian_bond + support:voidrend + support:limbreaver`: measured 28.3, its parts predict 313.3. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJzdW1tb25lciIsImx2bCI6NSwic2tpbGxzIjpbeyJpZCI6Imd1YXJkaWFuX2JvbmQiLCJyYXJpdHkiOiJtYWdpYyJ9LHsiaWQiOiJyZXZpdmUiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImxpbWJyZWF2ZXIiXX0seyJpZCI6ImhleF9wdWxzZSIsInJhcml0eSI6Im1hZ2ljIiwib3ZlciI6Miwic3VwcG9ydHMiOlsidm9pZHJlbmQiLCJ0dXJidWxlbmNlIl19XSwib2ZmIjoiY3JpdCIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjoxODA2Mzg1NDAzfQ:spar --seeds 30 --base-seed 3845821935`</details>
- `class:sorcerer + unique:cinderstep + support:grasping_tendrils + support:resounding_echo`: measured 19315, its parts predict 2026.5. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJzb3JjZXJlciIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJldmlzY2VyYXRlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZ3Jhc3BpbmdfdGVuZHJpbHMiLCJnaWFudHNiYW5lIiwiYXp1cmVfaGFydmVzdCIsInNlcmVuZV9wb3dlciJdLCJsaW1iIjoxfSx7ImlkIjoibWFyayIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImFsYWNyaXR5IiwicG9seXBob255IiwiYXVzdGVyaXR5IiwiYXBvdGhlb3NpcyJdfSx7ImlkIjoic2hhdHRlcmNob3JkIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJyZXNvdW5kaW5nX2VjaG8iLCJjYXNjYWRlIl0sImxpbWIiOjF9LHsiaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiY2hhbWJlcmVkX2Nhc3RpbmciLCJmbGVldGZvb3QiXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjkyMjY5ODcwMywidW5pcXVlcyI6eyJib290cyI6ImNpbmRlcnN0ZXAiLCJoZWxtZXQiOiJncmF2ZWJsb29tIn19:spar --seeds 30 --base-seed 3845821935`</details>

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

**What buffs, hexes, heals and wards add** (196 skills whose own numbers are not damage, at L20, against the same hero without them). Most output beside a plain strike: `infernal_bombardment` 14.1×, `summon_plaguefather` 6.4×, `summon_fire_golem` 4.83×, `summon_flame_sprite` 4.77×, `flame_totem` 4.77×, `shambler_horde` 4.25×, `bind_familiar` 4.22×, `reaper_swarm` 3.88×. Most time survived on the clock: `vampiric_presence` 11.85×, `shambler_horde` 11.85×, `repulsor_beacon` 11.85×, `summon_blade_wraith` 11.85×, `call_the_rift` 10.98×, `reaper_swarm` 10.25×, `summon_wraith` 9.04×, `infernal_bombardment` 6.63×. 35 moved neither at any band: their value lies outside these rigs, or they do nothing.

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
Matrix: 127,530 of 127,530 eligible pairs probed (100%), deep lane on 22432 pairs. Verdicts: effective 78555, inert 14500, cost_only 1428, blind 30610, negligible 2437.
Against the committed ledger (8481 rows): 12183 not on file, 2010 measuring healthy. The ledger only changes through `matrix check --reconcile`.

## What ran, and what did not

| lane | units planned | ok | gate breach | crashed/killed | out of time or not run | episodes | core-hours |
|---|---:|---:|---:|---:|---:|---:|---:|
| baselines | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| audits | 4 | 4 | 0 | 0 | 0 | 0 | 0 |
| expression | 1 | 1 | 0 | 0 | 0 | 1,208 | 0.2 |
| census | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| suites | 2 | 2 | 0 | 0 | 0 | 910 | 0.3 |
| progression | 39 | 39 | 0 | 0 | 0 | 12,480 | 4.9 |
| skills | 10 | 10 | 0 | 0 | 0 | 8,790 | 1.4 |
| skills_vs | 21 | 21 | 0 | 0 | 0 | 24,192 | 4.9 |
| matchups | 27 | 27 | 0 | 0 | 0 | 13,734 | 6.1 |
| bestiary | 66 | 66 | 0 | 0 | 0 | 78,624 | 15.8 |
| attributes | 39 | 39 | 0 | 0 | 0 | 4,914 | 2.4 |
| affixes | 5 | 5 | 0 | 0 | 0 | 3,472 | 1.2 |
| assists | 10 | 10 | 0 | 0 | 0 | 4,752 | 2.6 |
| socket_play | 1 | 1 | 0 | 0 | 0 | 900 | 0.1 |
| globals | 4 | 4 | 0 | 0 | 0 | 1,704 | 0.3 |
| matrix | 217 | 217 | 0 | 0 | 0 | 235,854 | 54.7 |
| matrix_deep | 112 | 112 | 0 | 0 | 0 | 101,989 | 18.1 |
| search | 40 | 40 | 0 | 0 | 0 | 135,260 | 28.1 |
| archive_confirm | 38 | 38 | 0 | 0 | 0 | 22,592 | 6.2 |
| proposals | 48 | 48 | 0 | 0 | 0 | 13,536 | 2.4 |

Every planned unit ran.

Not simulated at all, by design: zone generation and XP pacing, event pressure, multiplayer, and real player skill. Pilots are simple policies, so kit ceilings are floors. Bands stay provisional until you sign them off.
