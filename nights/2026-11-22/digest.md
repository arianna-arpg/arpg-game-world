# Balance farm, night of 2026-11-22

Commit [54670657b5](https://github.com/arianna-arpg/arpg-game-world/commit/54670657b5700ac90623d38f810331acff08e416), profile `full`. 647,631 episodes, 149.3 core-hours, 298 minutes end to end. [Run](https://github.com/arianna-arpg/arpg-game-world/actions/runs/45023596963).

## ✅ No regressions

Every committed baseline holds, nothing crashed, and the matrix has no new defects since last night.

## What moved since last night

200 row(s) moved past their own noise and 10%. Largest first:

| row | before | after | change |
|---|---:|---:|---:|
| `monster:grave_shambler:magician:L25:veteran` | 0.09 | 6.69 | +7333% |
| `monster:seatless_usher:magician:L25:threat` | 0.01 | 0.7 | +6900% |
| `monster:depthkin_crawler:magician:L25:veteran` | 0.05 | 1.54 | +2980% |
| `monster:formic_gluewright:magician:L25:threat` | 0.03 | 0.59 | +1867% |
| `class:chronomancer:kitted:L40:pressure:floor` | 10.5 | 75.84 | +622% |
| `class:matador:geared:L30:pressure:floor` | 8.99 | 40.26 | +348% |
| `monster:lidless_watcher:magician:L25:threat` | 0.22 | 0.94 | +327% |
| `monster:discord_siren:magician:L25:threat` | 0.42 | 1.18 | +181% |
| `monster:dream_tick:magician:L25:ttk` | 8.17 | 22.33 | +173% |
| `class:vanguard:kitted:L30:dummy` | 339.48 | 890.35 | +162% |
| `monster:plague_tendril:magician:L25:threat` | 0.73 | 1.81 | +148% |
| `affix:proc_concussive:warrior:L20:5352222` | 146.66 | 326.66 | +123% |
| `class:hivecaller:geared:L20:pressure:floor` | 42.18 | 90.38 | +114% |
| `monster:primeval_ironbell:magician:L25:threat` | 0.73 | 1.55 | +112% |
| `class:vanguard:kitted:L20:dummy` | 300.39 | 634.71 | +111% |
| `class:vanguard:kitted:L40:spar` | 917.92 | 1923.86 | +110% |
| `class:rogue:geared:L30:pressure:floor` | 46.63 | 96.49 | +107% |
| `class:berserker:starter:L30:parity:floor` | 0 | 4.81 | +100% |
| `match:starter_brawler_l20:primeval_ironbell_leg:L20` | 0 | 21.53 | +100% |
| `match:kitted_ascetic_l20:primeval_ironbell_leg:L20` | 22.42 | 0 | −100% |
| `match:starter_berserker_l20:tide_whelk:L20` | 44.99 | 0 | −100% |
| `match:starter_breaker_l20:tide_whelk:L20` | 0 | 31.42 | +100% |
| `match:starter_beguiler_l20:hunting_falcon:L20` | 5.41 | 0 | −100% |
| `match:kitted_magician_l20:molting_behemoth:L20` | 59.27 | 0 | −100% |
| `match:kitted_ascetic_l20:caul_heart:L20` | 58.06 | 0 | −100% |

## Top proposed numbers

Advisory. Nothing here has been applied, and each needs your sign-off. Each row re-measured the subject on dice the night had not seen, solved for a number through the real game, and verified it at common seeds. 21 outlier(s) did not hold up on fresh dice, or landed within 15% of their target, and were dropped.

| # | subject | change | metric: before → after | cohort target | verdict | guards |
|---:|---|---|---|---:|---|---|
| 1 | skill `shambler_horde` | `monsters.grave_shambler.explodeOnDeath`: 2.2 → 0.88 | dps_dummy: 19394.7 → 7757.9 | 680.5 | moved, closes 62% | none moved |
| 2 | skill `arclight_rain` | `skills.arclight_rain.baseDamage.physical.0`: 5 → 2 (+3 lines, ×0.4) | dps_dummy: 347.1 → 138.8 | 93.2 | moved, closes 82% | none moved |
| 3 | skill `marshlight` | `skills.marshlight.baseDamage.chaos.0`: 9 → 3.6 (+1 lines, ×0.4) | dps_dummy: 268.3 → 107.3 | 98.9 | moved | none moved |
| 4 | skill `mirespume` | `skills.mirespume.baseDamage.chaos.0`: 11 → 4.6 (+1 lines, ×0.42) | dps_dummy: 241.7 → 101.5 | 98.9 | moved | none moved |
| 5 | skill `infernal_bombardment` | `monsters.bombard_demon.explodeOnDeath`: 1.6 → 0.67 | dps_dummy: 15918.9 → 6705.2 | 6676.7 | moved | none moved |
| 6 | support `fire_walker` | `supports.fire_walker.mods.0.value`: 0.5 → 0.2 (+1 lines, ×0.4) | dps_dummy: 60.8 → 30.9 | 18.2 | moved, closes 70% | none moved |
| 7 | skill `glare_ice` | `skills.glare_ice.baseDamage.cold.0`: 4 → 10 (+1 lines, ×2.5) | dps_dummy: 1.3 → 3.2 | 4 | moved, closes 71% | none moved |
| 8 | skill `trailblaze` | `skills.trailblaze.baseDamage.fire.0`: 6 → 2.8 (+1 lines, ×0.47) | dps_dummy: 65.4 → 31.9 | 31.1 | moved | none moved |
| 9 | skill `earthrender` | `skills.earthrender.baseDamage.physical.0`: 12 → 6 (+1 lines, ×0.5) | dps_dummy: 187.5 → 93.7 | 93.2 | moved | none moved |
| 10 | support `sundering_flight` | `supports.sundering_flight.fissureTrail.damageScale`: 0.4 → 0.16 | dps_dummy: 49.7 → 30.3 | 19.1 | moved, closes 63% | none moved |
| 11 | skill `keening_shriek` | `skills.keening_shriek.baseDamage.physical.0`: 4 → 7.2 (+1 lines, ×1.8) | dps_dummy: 1.9 → 3.5 | 3.6 | moved | none moved |
| 12 | affix `apply_poison` | `affixes.apply_poison.tiers.0.ranges.0.0`: 0.22 → 0.088 (+9 lines, ×0.4) | dps_out: 347.3 → 229.9 | 117.4 | moved, closes 51% | none moved |
| 13 | support `volley` | `supports.volley.mods[stat=damage].value`: -0.25 → -0.63 | dps_dummy: 92.7 → 46.4 | 54.1 | moved | none moved |
| 14 | skill `zealots_cadence` | `skills.zealots_cadence.baseDamage.physical.0`: 14 → 35 (+1 lines, ×2.5) | dps_dummy: 14.3 → 27.4 | 45.7 | moved, closes 42% | none moved |
| 15 | skill `transfusion` | `skills.transfusion.baseDamage.chaos.0`: 6 → 9.6 (+1 lines, ×1.6) | dps_dummy: 5.7 → 9.2 | 9.3 | moved | none moved |

<details><summary>Repro commands</summary>

1. `npm run sim -- whatif --knob 'monsters.grave_shambler.explodeOnDeath*0.4' --scenarios skill:shambler_horde:40 --seeds 30 --base-seed 1469220274`. Other dials on this metric (elasticity): cooldown -0.71, useTime -0.36. Same change at other bands: `skill:shambler_horde:5` 257.8→103.1, `skill:shambler_horde:10` 768.4→307.4, `skill:shambler_horde:20` 3055.9→1222.4
2. `npm run sim -- whatif --knob 'skills.arclight_rain.baseDamage*0.4' --scenarios skill:arclight_rain:40 --seeds 30 --base-seed 1469220274`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.19, useTime 0.17. Same change at other bands: `skill:arclight_rain:5` 152.1→60.8, `skill:arclight_rain:10` 184.5→73.8, `skill:arclight_rain:20` 233.2→93.3
3. `npm run sim -- whatif --knob 'skills.marshlight.baseDamage*0.4' --scenarios skill:marshlight:10 --seeds 30 --base-seed 1469220274`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.64, manaCost -0.03. Same change at other bands: `skill:marshlight:5` 230.8→92.4, `skill:marshlight:20` 321.5→128.6, `skill:marshlight:40` 459.8→183.9
4. `npm run sim -- whatif --knob 'skills.mirespume.baseDamage*0.42' --scenarios skill:mirespume:10 --seeds 30 --base-seed 1469220274`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.63. Same change at other bands: `skill:mirespume:5` 205.5→86.3, `skill:mirespume:20` 281.1→118.1, `skill:mirespume:40` 387.1→162.6
5. `npm run sim -- whatif --knob 'monsters.bombard_demon.explodeOnDeath*0.42' --scenarios skill:infernal_bombardment:40 --seeds 30 --base-seed 1469220274`. Other dials on this metric (elasticity): cooldown -0.8. Same change at other bands: `skill:infernal_bombardment:5` 240.1→103.4, `skill:infernal_bombardment:10` 687.5→293.5, `skill:infernal_bombardment:20` 2625.6→1110.4
6. `npm run sim -- whatif --knob 'supports.fire_walker.mods*0.4' --scenarios socketed:phoenix_dive:fire_walker:20 --seeds 30 --base-seed 1469220274`
7. `npm run sim -- whatif --knob 'skills.glare_ice.baseDamage*2.5' --scenarios skill:glare_ice:40 --seeds 30 --base-seed 1469220274`. Other dials on this metric (elasticity): cooldown -1.27, baseDamage 1. Same change at other bands: `skill:glare_ice:5` 0.8→1.9, `skill:glare_ice:10` 0.9→2.1, `skill:glare_ice:20` 1→2.5
8. `npm run sim -- whatif --knob 'skills.trailblaze.baseDamage*0.47' --scenarios skill:trailblaze:20 --seeds 30 --base-seed 1469220274`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.73. Same change at other bands: `skill:trailblaze:5` 50.6→25.2, `skill:trailblaze:10` 56.6→27.8, `skill:trailblaze:40` 86.7→41.2
9. `npm run sim -- whatif --knob 'skills.earthrender.baseDamage*0.5' --scenarios skill:earthrender:40 --seeds 30 --base-seed 1469220274`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.76, useTime -0.28. Same change at other bands: `skill:earthrender:5` 108.4→54.2, `skill:earthrender:10` 121.3→60.7, `skill:earthrender:20` 140.8→70.4
10. `npm run sim -- whatif --knob 'supports.sundering_flight.fissureTrail.damageScale*0.4' --scenarios socketed:ball_lightning:sundering_flight:20 --seeds 30 --base-seed 1469220274`
11. `npm run sim -- whatif --knob 'skills.keening_shriek.baseDamage*1.8' --scenarios skill:keening_shriek:40 --seeds 30 --base-seed 1469220274`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.75. Same change at other bands: `skill:keening_shriek:5` 1.1→2, `skill:keening_shriek:10` 1.3→2.3, `skill:keening_shriek:20` 1.5→2.6
12. `npm run sim -- whatif --knob 'affixes.apply_poison.tiers.*.ranges*0.4' --scenarios affix:warrior:20:helmet:apply_poison:10397677:spar --seeds 30 --base-seed 1469220274`
13. `npm run sim -- whatif --knob 'supports.volley.mods[stat=damage].value*2.5' --scenarios socketed:soulflay:volley:20 --seeds 30 --base-seed 1469220274`
14. `npm run sim -- whatif --knob 'skills.zealots_cadence.baseDamage*2.5' --scenarios skill:zealots_cadence:20 --seeds 30 --base-seed 1469220274`. Other dials on this metric (elasticity): baseDamage 0.61. Same change at other bands: `skill:zealots_cadence:5` 10.7→20.5, `skill:zealots_cadence:10` 12.1→23.1, `skill:zealots_cadence:40` 22.1→42.4
15. `npm run sim -- whatif --knob 'skills.transfusion.baseDamage*1.6' --scenarios skill:transfusion:40 --seeds 30 --base-seed 1469220274`. Other dials on this metric (elasticity): cooldown -1.25, baseDamage 1. Same change at other bands: `skill:transfusion:5` 3.4→5.5, `skill:transfusion:10` 3.8→6.1, `skill:transfusion:20` 4.4→7.1

Run from commit `54670657b5700ac90623d38f810331acff08e416`.
</details>

Too noisy to call: class `assassin`, class `hivecaller`, class `firebrand`, class `trapper`, class `sharper`. The solved number moved each by less than its own seed-to-seed spread, so these need a calmer rig or more seeds before they mean anything.

### Combinations that run away

Confirmed on fresh dice at 20 times or more what their parts predict. A number this far out usually means damage feeding itself, so no single number fixes it: each needs a call on whether the feedback should be bounded.

- `class:apothecary + unique:cindervigil + support:unleash + support:stored_verdict`: measured 1.3e+12 damage per second, its parts predict 2231.9. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJhcG90aGVjYXJ5IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6Im1hcmsiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzcGVudGJhbmUiLCJzdG9yZWRfdmVyZGljdCIsIm1lYXN1cmVkX2JsYWRlIiwic2xvd19icmV3Il19LHsiaWQiOiJjb21idXN0aW9uX3N0cmlrZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNlaXNtaWNfbWFyY2giLCJhY2NlbGVyYXRlZCIsInVubGVhc2giLCJzY2F0dGVyZWRfY2FzY2FkZSJdfSx7ImlkIjoic3BvcmVfYmxvb20iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzbG93X2JyZXciLCJjYXN0X29uX2lnbml0aW9uIiwicGVyZmVjdF9kcmF3IiwiZW1iYXJnbyJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjozMTQ1MTEwOSwidW5pcXVlcyI6eyJoZWxtZXQiOiJjaW5kZXJ2aWdpbCIsInJpbmcxIjoic2hhcmVkX2N1cCJ9fQ:spar --seeds 30 --base-seed 1469220274`</details>
- `class:berserker + primary:devouring_swarm + unique:cinderstep + support:resounding_echo`: measured 9.8e+11 damage per second, its parts predict 91092.7. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZGV2b3VyaW5nX3N3YXJtIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsic2xpcHN0cmVhbSJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwicmVzb3VuZGluZ19lY2hvIiwidW5sZWFzaCIsInNjYXR0ZXJlZF9jYXNjYWRlIl19LHsiaWQiOiJmbGFtZV9ibGFzdCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiYWNjZWxlcmFuZG8iLCJlZmZpY2llbmN5Il19LHsiaWQiOiJyZXB1bHNvcl9iZWFjb24iLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImNhc3Rfb25fYmxlZWQiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjg2OTc4ODUxNywidW5pcXVlcyI6eyJib290cyI6ImNpbmRlcnN0ZXAifX0:spar --seeds 30 --base-seed 1469220274`</details>
- `class:resonator + support:seismic_march + support:unleash + support:accelerated`: measured 1.3e+8 damage per second, its parts predict 1428.6. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJyZXNvbmF0b3IiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZ3JpdF9zdGFuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiLCJvdmVybWF0Y2giLCJvc3RpbmF0byJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwiY3Jvd2RfZmF2b3IiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJhY2NlbGVyYW5kbyIsImVmZmljaWVuY3kiXX0seyJpZCI6InJlcHVsc29yX2JlYWNvbiIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZmxlZXRmb290Il19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjo4Njk3ODg1MTcsInVuaXF1ZXMiOnsiYmVsdCI6InBhbGVfYmFyZ2FpbiJ9fQ:spar --seeds 30 --base-seed 1469220274`</details>
- `class:berserker + unique:cinderstep + primary:orbital_blades + support:seismic_march`: measured 3996126 damage per second, its parts predict 47577.7. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoib3JiaXRhbF9ibGFkZXMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJnaWFudHNiYW5lIiwidGhvdWdodGJ1cm4iXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjg2OTc4ODUxNywidW5pcXVlcyI6eyJib290cyI6ImNpbmRlcnN0ZXAiLCJnbG92ZXMiOiJnYWxld3JpZ2h0cyJ9fQ:spar --seeds 30 --base-seed 1469220274`</details>
- `class:resonator + support:seismic_march + support:unleash + support:sainted_ash`: measured 1461473.9 damage per second, its parts predict 1525.1. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJyZXNvbmF0b3IiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZ3JpdF9zdGFuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiLCJvdmVybWF0Y2giLCJvc3RpbmF0byJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJhY2NlbGVyYW5kbyIsInNhaW50ZWRfYXNoIl19LHsiaWQiOiJyZXB1bHNvcl9iZWFjb24iLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImZsZWV0Zm9vdCJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6ODY5Nzg4NTE3LCJ1bmlxdWVzIjp7ImJlbHQiOiJwYWxlX2JhcmdhaW4iLCJyaW5nMSI6ImNvYWxfcmVtZW1iZXJlZCJ9fQ:spar --seeds 30 --base-seed 1469220274`</details>
- `class:trapper + support:seismic_march + support:unleash + support:accelerated`: measured 666562.7 damage per second, its parts predict 697.3. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJ0cmFwcGVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6InN0YWNrX3RoZV9kZWNrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsicXVhaWxiYW5lIiwidGF1dF93aXJlIiwib3Zlcm1hdGNoIl0sImxpbWIiOjB9LHsiaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsic3BlbnRiYW5lIiwic3RvcmVkX3ZlcmRpY3QiLCJhcG90aGVvc2lzIiwic2xvd19icmV3Il19LHsiaWQiOiJjb21idXN0aW9uX3N0cmlrZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNlaXNtaWNfbWFyY2giLCJhY2NlbGVyYXRlZCIsInVubGVhc2giLCJhdXN0ZXJpdHkiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJhY2NlbGVyYW5kbyIsImVmZmljaWVuY3kiXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjoxNzkzOTM5OTE3LCJ1bmlxdWVzIjp7ImFtdWxldCI6Im1vdXJuaW5nX2JlbGwifX0:spar --seeds 30 --base-seed 1469220274`</details>
- `class:assassin + support:legion_call + support:sainted_ash + support:turbulence`: measured 23114.7 damage per second, its parts predict 20. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJhc3Nhc3NpbiIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJjYXBlX2ZlaW50IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYnVsd2Fya19zaGFyZHMiLCJ0dXJidWxlbmNlIiwiaHVudGVyc19tb21lbnR1bSJdLCJsaW1iIjoxfSx7ImlkIjoiZXhwb3NlX3dlYWtuZXNzIiwicmFyaXR5IjoicmFyZSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNhaW50ZWRfYXNoIiwiZXhwb3N1cmUiXSwibGltYiI6MH0seyJpZCI6Imxvb3NlX21hcnJvd2dydWJzIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJsZWdpb25fY2FsbCIsImRlYXRoc19kb29yIl19LHsiaWQiOiJpbmZlcm5hbF9ib21iYXJkbWVudCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInN0b3JlZF92ZXJkaWN0Il19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJ3YXJkIiwiZ2VhciI6InJhcmUiLCJncyI6ODA2NDk1NzgyLCJ1bmlxdWVzIjp7ImhlbG1ldCI6ImhhbG9fbmludGhfY2hvaXIiLCJyaW5nMiI6Im1pc2Vyc19sb29wIn19:spar --seeds 30 --base-seed 1469220274`</details>
- `class:warrior + support:pallid_touch + support:bodyguard_doctrine + support:cascade`: measured 9185.9 damage per second, its parts predict 0.6. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJ3YXJyaW9yIiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6InNoYW1ibGVyX2hvcmRlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsiYm9keWd1YXJkX2RvY3RyaW5lIiwiY3V0dGhyb2F0IiwiY3JlZXBpbmdfZnVtZXMiLCJsaW1icmVhdmVyIl0sImxpbWIiOjF9LHsiaWQiOiJjaW5kZXJfc3dhcm0iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJwYWxsaWRfdG91Y2giLCJzZXB0aWNfYmFyZ2FpbiIsImJsb29kX3ByaWNlIiwiY2FzdF9vbl9oaWdoX3JvbGwiXX0seyJpZCI6ImFlZ2lzX3dhcmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJjYXNjYWRlIiwiY3Jlc2NlbmRvIiwibm9fbWFuc19sYW5kIiwibGltYnJlYXZlciJdLCJsaW1iIjowfSx7ImlkIjoiZGV0b25hdGVfbWluZXMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJkb21pbmlvbl90aXRoZSIsImdhdGhlcmVkX2Nhc3RpbmciLCJzZXJlbmVfcG93ZXIiLCJ1cHJvb3RlciJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJ3YXJkIiwiZ2VhciI6InJhcmUiLCJncyI6MTMzMTA1NDczNywidW5pcXVlcyI6eyJjaGVzdCI6InRoZV91bm1vdmVkIiwicmluZzEiOiJtaXNlcnNfbG9vcCJ9fQ:spar --seeds 30 --base-seed 1469220274`</details>
- `class:spellblade + support:ritardando + support:lambent_harvest + support:creeping_fumes`: measured 385.8 damage per second, its parts predict 1.1. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJzcGVsbGJsYWRlIiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImJlY2tvbl9wYWxld2lzcHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJtZWFzdXJlZF9ibG93cyIsIndhbGtpbmdfbWVkaXRhdGlvbiIsImRlZXBfcmVzZXJ2ZXMiLCJkb21pbmlvbl90aXRoZSJdfSx7ImlkIjoicnVuZV9vZl9wb3dlciIsInJhcml0eSI6InJhcmUiLCJzdXBwb3J0cyI6WyJidWlsZGluZ19yaHl0aG0iLCJ0cmlhbmdsZV9zaWdpbCJdLCJsaW1iIjowfSx7ImlkIjoid2FyX2NoYW50IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiY3JlZXBpbmdfZnVtZXMiLCJtYWRkZW5pbmdfbWlhc21hIiwicml0YXJkYW5kbyIsImF1c3Rlcml0eSJdLCJsaW1iIjoxfSx7ImlkIjoidGVtcGVzdF9nYXRoZXJpbmciLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJhc3Nhc3NpbnNfYW5nbGUiLCJ0ZW1wZXN0X3JhbmdlIiwibGFtYmVudF9oYXJ2ZXN0Iiwic2xvd19icmV3Il19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjg0MzcxMzQzLCJ1bmlxdWVzIjp7ImFtdWxldCI6ImJlbGx3ZXRoZXIifX0:spar --seeds 30 --base-seed 1469220274`</details>
- `class:summoner + unique:cinderstep + support:afterspray + support:fleetfoot`: measured 173.4 damage per second, its parts predict 1.2. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJzdW1tb25lciIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6InJhcmUifSx7ImlkIjoia2luZGxlX3dpY2siLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJmbGVldGZvb3QiLCJsaW5nZXJpbmciXX0seyJpZCI6InNoYWRvd19zdGVwIiwicmFyaXR5IjoicmFyZSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbIm1vbm9saXRoIiwiYWZ0ZXJzcHJheSJdLCJsaW1iIjowfSx7ImlkIjoiZmxhc2hfZnJlZXplIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Mn1dLCJvZmYiOiJjcml0IiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjE2MjI4MzYxNzgsInVuaXF1ZXMiOnsiYm9vdHMiOiJjaW5kZXJzdGVwIiwicmluZzEiOiJzbG93bWF0Y2hfY29pbCJ9fQ:spar --seeds 30 --base-seed 1469220274`</details>

### Flagged for your decision

The numbers an author would reach for did not move these enough. They are not proposals: each needs a call on whether the mechanic is right, and none has been touched.

- class `chronomancer`: The numbers an author would reach for barely move this: skills.stasis_lock.baseDamage ×2.5 closes 13%; classes.chronomancer.attributes ×2.5 closes 6%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `beguiler`: The numbers an author would reach for barely move this: skills.beguile.baseDamage ×1 closes 0%; classes.beguiler.attributes ×2.5 closes 17%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- skill `hurricane`: The numbers an author would reach for barely move this: skills.hurricane.baseDamage ×2.5 closes 14%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_threat `grave_shambler`: The numbers an author would reach for barely move this: monsterDamage.grave_shambler.all ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `necromancer`: The numbers an author would reach for barely move this: skills.poison_nova.baseDamage ×0.4 closes 6%; skills.despair.baseDamage ×1 closes 0%; skills.poison_nova.baseDamage & skills.despair.baseDamage ×0.4 closes 6%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- support `resounding_echo`: The numbers an author would reach for barely move this: supports.resounding_echo.mods ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_threat `breach_arcling`: The numbers an author would reach for barely move this: monsterDamage.breach_arcling.all ×2.5 closes 16%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_threat `gloam`: The numbers an author would reach for barely move this: monsterDamage.gloam.all ×2.5 closes 19%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `stygian_doll`: The numbers an author would reach for barely move this: monsters.stygian_doll.base.life ×2.5 closes 6%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `amalgam_fleshweaver`: The numbers an author would reach for barely move this: monsters.amalgam_fleshweaver.base.life ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.

## Outliers

426 rows sit far from their cohort (log-scale median and MAD, z ≥ 3 and a ratio past 1.8× or 0.55×), 72 of them new tonight. Warned rows and zero rows never enter a cohort.

| | kind | subject | metric | value | cohort median | ratio | z | cohort |
|---|---|---|---|---:|---:|---:|---:|---|
|  | support | `sundering_flight` | output_multiplier | 3 | 1 | 2.9× | 18.2 | supports · effective hosts |
|  | support | `fire_walker` | output_multiplier | 2.8 | 1 | 2.74× | 17.2 | supports · effective hosts |
|  | support | `scorched_wake` | output_multiplier | 2.4 | 1 | 2.33× | 14.4 | supports · effective hosts |
|  | support | `mounting_frenzy` | output_multiplier | 2.3 | 1 | 2.27× | 14 | supports · effective hosts |
| 🆕 | interaction | `class:berserker + primary:devouring_swarm + unique:cinderstep + support:resounding_echo` | dps_out | 3.5e+10 | 91092.7 | 389027.77× | 13.9 | L40 main effects |
|  | class | `chronomancer` | kill_rate | 0.1 | 0.6 | 0.08× | -13.1 | L20 · geared · pressure · kill_rate |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.05× | -12.9 | L30 · geared · pressure · kill_rate |
| 🆕 | monster_threat | `dream_tick` | dps_in | 0 | 18 | 0× | -12.9 | L25 · magician · body |
|  | support | `austerity` | output_multiplier | 0.5 | 1 | 0.48× | -12.6 | supports · effective hosts |
|  | support | `resounding_echo` | output_multiplier | 2.1 | 1 | 2.04× | 12.1 | supports · effective hosts |
|  | support | `crescendo` | output_multiplier | 2.1 | 1 | 2.02× | 12 | supports · effective hosts |
|  | support | `septic_bargain` | output_multiplier | 0.5 | 1 | 0.5× | -12 | supports · effective hosts |
| 🆕 | interaction | `class:warrior + support:pallid_touch + support:bodyguard_doctrine + support:cascade` | dps_out | 9510.6 | 0.6 | 16381.3× | 11.9 | L20 main effects |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.07× | -11.5 | L40 · geared · pressure · kill_rate |
|  | support | `volley` | output_multiplier | 2 | 1 | 1.92× | 11.1 | supports · effective hosts |
| 🆕 | interaction | `class:apothecary + unique:cindervigil + support:unleash + support:stored_verdict` | dps_out | 1.9e+7 | 2231.9 | 8390.34× | 11 | L20 main effects |
| 🆕 | interaction | `class:resonator + support:seismic_march + support:unleash + support:accelerated` | dps_out | 3.1e+7 | 1428.6 | 22042.25× | 10.8 | L40 main effects |
|  | support | `elemental_conduction` | output_multiplier | 1.9 | 1 | 1.82× | 10.2 | supports · effective hosts |
|  | monster_threat | `hadal_lantern` | dps_in | 0.1 | 15.2 | 0× | -10 | L12 · magician · body |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.05× | -9.5 | L20 · kitted · pressure · kill_rate |
|  | class | `chronomancer` | kill_rate | 0 | 0.4 | 0.02× | -8.9 | L5 · geared · pressure · kill_rate |
|  | monster_threat | `dream_tick` | dps_in | 0.1 | 15.2 | 0.01× | -8.9 | L12 · magician · body |
| 🆕 | interaction | `class:resonator + support:seismic_march + support:unleash + support:sainted_ash` | dps_out | 4957628.4 | 1525.1 | 3250.65× | 8.7 | L40 main effects |
|  | monster_threat | `banshee` | dps_in | 0.2 | 18 | 0.01× | -8.5 | L25 · magician · body |
| 🆕 | interaction | `class:cleric + support:pallid_touch + support:cascade + support:crescendo` | dps_out | 105 | 0.1 | 1039.83× | 8.5 | L20 main effects |

<details><summary>Re-measure any of these</summary>

- sundering_flight: `npm run sim -- run --refs socketed:ball_lightning:sundering_flight:20 --seeds 10`
- fire_walker: `npm run sim -- run --refs socketed:phoenix_dive:fire_walker:20 --seeds 10`
- scorched_wake: `npm run sim -- run --refs socketed:blinding_ichor:scorched_wake:20 --seeds 10`
- mounting_frenzy: `npm run sim -- run --refs socketed:serpent_ray:mounting_frenzy:20 --seeds 10`
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:20:geared --seeds 10`
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:30:geared --seeds 10`
- dream_tick: `npm run sim -- run --refs threat:starter_magician_l25:dream_tick:25 --seeds 10`
- austerity: `npm run sim -- run --refs socketed:corpse_explosion:austerity:20 --seeds 10`
- resounding_echo: `npm run sim -- run --refs socketed:aftershock_snare:resounding_echo:20 --seeds 10`
- crescendo: `npm run sim -- run --refs socketed:immolation_blast:crescendo:20 --seeds 10`
- septic_bargain: `npm run sim -- run --refs socketed:pillar_of_flame:septic_bargain:20 --seeds 10`
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:40:geared --seeds 10`
- volley: `npm run sim -- run --refs socketed:soulflay:volley:20 --seeds 10`
- elemental_conduction: `npm run sim -- run --refs socketed:ballista_sentry:elemental_conduction:20 --seeds 10`
- hadal_lantern: `npm run sim -- run --refs threat:starter_magician_l12:hadal_lantern:12 --seeds 10`
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:20:kitted --seeds 10`
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:5:geared --seeds 10`
- dream_tick: `npm run sim -- run --refs threat:starter_magician_l12:dream_tick:12 --seeds 10`
- banshee: `npm run sim -- run --refs threat:starter_magician_l25:banshee:25 --seeds 10`

</details>

## Build search

63,224 candidates tonight (14,499 refused by the real gates), 1,566,586 over 24 night(s). The archive holds 1438 elite rows; 1422 were re-measured on this commit. Tried so far in a legal build: 39 of 39 classes, 576 of 576 primarys, 604 of 604 skills, 455 of 455 supports, 41 of 41 uniques.

| band | objective | build (top factors) | value | × band median | repro |
|---|---|---|---:|---:|---|
| L5 | offense | `class:runeweaver` `off:crit` `def:none` `gear:rare` `skill:lure_lantern` | 73857.5 | 2104.4× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoibHVyZV9sYW50ZXJuIiwicmFyaXR5IjoibWFnaWMiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJnaWFudHNiYW5lIl19LHsiaWQiOiJzdG9ybWJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJ0ZW1wZXN0X3JhbmdlIiwiY3V0dGhyb2F0Il19LHsiaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJjcmVzY2VuZG8iLCJib25kYnJlYWtlciIsImFjY2VsZXJhbmRvIiwiYmxvb2RfdG9sbCJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInN0dW5fY2hhbmNlIiwibW91bnRpbmdfZnJlbnp5IiwicGFydGluZ19qdWRnZW1lbnQiLCJzdW5kZXJpbmdfZmxpZ2h0Il19XSwib2ZmIjoiY3JpdCIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjoxNDM3MjI5MDg5LCJ1bmlxdWVzIjp7ImFtdWxldCI6InN0b3JtY2FsbCIsInJpbmcxIjoiZW1iZXJicmFuZCJ9fQ --seeds 8 --base-seed 972613993`</details> |
| L5 | offense | `class:runeweaver` `off:speed` `def:life` `gear:rare` `skill:orb_of_storms` | 69898.7 | 1991.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoib3JiX29mX3N0b3JtcyIsInJhcml0eSI6Im1hZ2ljIiwib3ZlciI6Miwic3VwcG9ydHMiOlsiaHVudGVyc19tb21lbnR1bSIsInJlZ2ljaWRlIl19LHsiaWQiOiJzdG9ybWJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJ0ZW1wZXN0X3JhbmdlIiwib3ZlcmZsb3dfcmVzZXJ2b2lyIl19LHsiaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJvdmVybWF0Y2giLCJib25kYnJlYWtlciIsImFjY2VsZXJhbmRvIiwiYmxvb2RfdG9sbCJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImNhc2NhZGVfb2Zfa25pdmVzIiwibW91bnRpbmdfZnJlbnp5IiwicGFydGluZ19qdWRnZW1lbnQiLCJzdW5kZXJpbmdfZmxpZ2h0Il19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJsaWZlIiwiZ2VhciI6InJhcmUiLCJncyI6MTQzNzIyOTA4OSwidW5pcXVlcyI6eyJnbG92ZXMiOiJ0aXRhbnNfZ3Jhc3AiLCJyaW5nMSI6ImVtYmVyYnJhbmQifX0 --seeds 8 --base-seed 972613993`</details> |
| L5 | clear | `class:chronomancer` `off:crit` `def:life` `gear:rare` `skill:sanctuary` | 6 | 19× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJzYW5jdHVhcnkiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInNsb3dfbWF0Y2giLCJzdGFsd2FydF9yaHl0aG0iXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJsaWZlIiwiZ2VhciI6InJhcmUiLCJncyI6MTgwODkzMjgxfQ --seeds 8 --base-seed 1927471500`</details> |
| L5 | clear | `class:magician` `off:speed` `def:armor` `gear:rare` `skill:glacial_bulwark` | 6 | 19× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6NSwic2tpbGxzIjpbeyJpZCI6ImdsYWNpYWxfYnVsd2FyayIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsic2xpcHN0cmVhbSJdfSx7ImlkIjoibG9uZ19jb2xkIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsic2llZ2VicmVha2VyIiwiZG9taW5pb25fdGl0aGUiLCJ3aWRlbmluZyIsIm1hbmFfZmVlZGVyIl0sImxpbWIiOjB9LHsiaWQiOiJpbmZlcm5hbF9jYW5ub25hZGUiLCJyYXJpdHkiOiJtYWdpYyJ9XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjU1MzA0MDkxNywidW5pcXVlcyI6eyJhbXVsZXQiOiJzdG9ybWNhbGwiLCJiZWx0IjoiYmxvb2RsZXR0ZXJzX2dpcmRsZSJ9fQ --seeds 8 --base-seed 3420152098`</details> |
| L10 | offense | `class:magician` `off:damage` `def:ward` `gear:rare` `skill:bloodlet` | 134276.9 | 3504.1× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJibG9vZGxldCIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoxfSx7ImlkIjoiZnJvc3Rfd2FsbCIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJlcGhlbWVyYWwiXX0seyJpZCI6ImVtYmVyYmluZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImZsZWV0aW5nX2Rldm90aW9uIiwid3JhaXRoX3Bhc3NhZ2UiLCJleHRlcm1pbmF0b3IiXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzbG93X2JyZXciLCJwYXJ0aW5nX2p1ZGdlbWVudCIsIm1vdW50aW5nX2ZyZW56eSIsInJlbW5hbnRzIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjE4Mjk1NDc5MjYsInVuaXF1ZXMiOnsiY2hlc3QiOiJ0aGVfdW5tb3ZlZCIsInJpbmcxIjoiZW1iZXJicmFuZCJ9fQ --seeds 8 --base-seed 1709888013`</details> |
| L10 | offense | `class:magician` `off:speed` `def:armor` `gear:rare` `skill:quiet_step` | 124473.1 | 3248.3× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJxdWlldF9zdGVwIiwicmFyaXR5IjoicmFyZSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImVuZHVyaW5nX3NuYXJlcyJdLCJsaW1iIjowfSx7ImlkIjoiZnJvc3Rfd2FsbCIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJlcGhlbWVyYWwiLCJzdXBwdXJhdGlvbiJdfSx7ImlkIjoiZW1iZXJiaW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZmxlZXRpbmdfZGV2b3Rpb24iLCJ3cmFpdGhfcGFzc2FnZSIsImV4dGVybWluYXRvciJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNsb3dfYnJldyIsInBhcnRpbmdfanVkZ2VtZW50IiwibW91bnRpbmdfZnJlbnp5IiwicmVtbmFudHMiXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6MTgyOTU0NzkyNiwidW5pcXVlcyI6eyJjaGVzdCI6InRoZV91bm1vdmVkIiwicmluZzEiOiJlbWJlcmJyYW5kIn19 --seeds 8 --base-seed 1709888013`</details> |
| L10 | clear | `class:necromancer` `off:crit` `def:evasion` `gear:rare` `skill:trumpet_peal` | 6 | 25.1× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJuZWNyb21hbmNlciIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJ0cnVtcGV0X3BlYWwiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsiYnVyaWVkX2NoYXJnZSIsImJsb29kX3RvbGwiLCJ1bnN0YWJsZV9jb21wcmVzc2lvbiJdLCJsaW1iIjowfSx7ImlkIjoic2hhdHRlcmNob3JkIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJyZXNvdW5kaW5nX2VjaG8iLCJjYXNjYWRlIl0sImxpbWIiOjF9XSwib2ZmIjoiY3JpdCIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjo5MzA4ODY5ODB9 --seeds 8 --base-seed 616540426`</details> |
| L10 | clear | `class:summoner` `off:speed` `def:life` `gear:rare` `skill:detonate_mines` | 6 | 25.1× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzdW1tb25lciIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJlbWJhcmdvIiwic2xvd19tYXRjaCIsImNhc3Rfb25faWduaXRpb24iXX0seyJpZCI6InRyYW5zZnVzaW9uIiwicmFyaXR5IjoicmFyZSJ9LHsiaWQiOiJkb29tX2JlbGwiLCJyYXJpdHkiOiJsZWdlbmRhcnkifSx7ImlkIjoiY2hhaW5fbGlnaHRuaW5nIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbInNob2NrX2NoYW5jZSIsInVubmVydmluZyIsInRldGhlcmVkX29yYml0Il0sImxpbWIiOjF9XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJsaWZlIiwiZ2VhciI6InJhcmUiLCJncyI6MTQ0ODk0NzkxNiwidW5pcXVlcyI6eyJiZWx0Ijoid2ludGVyX2FmdGVyX3lvdSJ9fQ --seeds 8 --base-seed 2527454154`</details> |
| L20 | offense | `class:apothecary` `off:damage` `def:none` `gear:rare` `skill:mark` | 570744.7 | 10391.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJhcG90aGVjYXJ5IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6Im1hcmsiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzcGVudGJhbmUiLCJzdG9yZWRfdmVyZGljdCIsIm1lYXN1cmVkX2JsYWRlIiwic2xvd19icmV3Il19LHsiaWQiOiJkZXZvdXJpbmdfc3dhcm0iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJtYW5hX2ZlZWRlciJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJxdWlldF9oYW5kIiwiZWZmaWNpZW5jeSJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjozMTQ1MTEwOSwidW5pcXVlcyI6eyJoZWxtZXQiOiJjaW5kZXJ2aWdpbCIsInJpbmcxIjoic2hhcmVkX2N1cCJ9fQ --seeds 8 --base-seed 3471352793`</details> |
| L20 | offense | `class:guardian` `off:crit` `def:ward` `gear:rare` `skill:lightning_blast` | 407041.1 | 7411× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJndWFyZGlhbiIsImx2bCI6MjAsInNraWxscyI6W3siaWQiOiJsaWdodG5pbmdfYmxhc3QiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJkZWF0aHNfZG9vciIsIm92ZXJsb2FkIl19LHsiaWQiOiJzdW1tb25fYm9uZV9nb2xlbSIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiXSwibGltYiI6MH0seyJpZCI6ImdyYXNwaW5nX2NoYXNtIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYmxvb2RfdG9sbCIsInNwbGludGVyZWRfZWFydGgiLCJhY2NlbGVyYW5kbyIsImRlc3BlcmF0aW9uIl19LHsiaWQiOiJmcm9zdGd1YXJkIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJyZWdpY2lkZSJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJ3YXJkIiwiZ2VhciI6InJhcmUiLCJncyI6MTQ4ODA3NTkyNiwidW5pcXVlcyI6eyJnbG92ZXMiOiJ0aXRhbnNfZ3Jhc3AiLCJoZWxtZXQiOiJncmF2ZWJsb29tIn19 --seeds 8 --base-seed 595101358`</details> |
| L20 | clear | `class:blademaster` `off:speed` `def:evasion` `gear:rare` `skill:spear_recall` | 6 | 28.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJibGFkZW1hc3RlciIsImx2bCI6MjAsInNraWxscyI6W3siaWQiOiJzcGVhcl9yZWNhbGwiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJhbGFjcml0eSIsImVwaWRlbWljIiwic3BlbnRiYW5lIiwic3Bpcml0X3RvdGVtIl0sImxpbWIiOjB9LHsiaWQiOiJzaGF0dGVyY2hvcmQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInJlc291bmRpbmdfZWNobyIsImNhc2NhZGUiXSwibGltYiI6MX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjo1NjkzNTkzNjMsInVuaXF1ZXMiOnsiY2hlc3QiOiJob2xsb3dfc292ZXJlaWduIiwiZ2xvdmVzIjoicm90ZV9oYW5kIn19 --seeds 8 --base-seed 2113334126`</details> |
| L20 | clear | `class:juggernaut` `off:speed` `def:none` `gear:rare` `skill:doom_bell` | 6 | 28.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJqdWdnZXJuYXV0IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImRvb21fYmVsbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNoYXR0ZXJnbGFzcyJdfSx7ImlkIjoiYmVja29uX3BhbGV3aXNwcyIsInJhcml0eSI6InJhcmUiLCJzdXBwb3J0cyI6WyJtb3VudGluZ19mcmVuenkiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfSx7ImlkIjoiY29uc2VjcmF0aW9uIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsibWFkZGVuaW5nX21pYXNtYSIsImF1c3Rlcml0eSIsImNhc3Rfb25fZGFtYWdlX3Rha2VuIl0sImxpbWIiOjB9XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6MTMwNzQyMDE3OSwidW5pcXVlcyI6eyJhbXVsZXQiOiJyb3VuZGVsYXkifX0 --seeds 8 --base-seed 3849966334`</details> |
| L40 | offense | `class:apothecary` `off:damage` `def:evasion` `gear:rare` `skill:blood_mortgage` | 923226.7 | 12965.1× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJhcG90aGVjYXJ5IiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImJsb29kX21vcnRnYWdlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiaW5zdWxhdGlvbiIsIndhcmRpbmdfZmxlc2giLCJzdG9yZWRfdmVyZGljdCJdLCJsaW1iIjowfSx7ImlkIjoic2hhbWJsZXJfaG9yZGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJwbHVzX21pbmlvbiIsInJhdmVub3VzX3BhY3QiLCJjYXNjYWRpbmdfY2FsbCIsImVwaGVtZXJhbCJdLCJsaW1iIjoxfSx7ImlkIjoiYmVyc2VyayIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImdpYW50c2JhbmUiLCJpbnN1bGF0aW9uIiwiYmxvb2RfcHJpY2UiLCJzZXJlbmVfcG93ZXIiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6NDcxNDczNDczLCJ1bmlxdWVzIjp7ImhlbG1ldCI6ImdyYXZlYmxvb20iLCJyaW5nMSI6ImNvbW1vbl9wdWxzZSJ9fQ --seeds 8 --base-seed 3716677001`</details> |
| L40 | offense | `class:pyromancer` `off:speed` `def:ward` `gear:rare` `skill:tuning_strike` | 836687.7 | 11749.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJweXJvbWFuY2VyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6InR1bmluZ19zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJyYXZlbmluZyIsImd1YXJkZWRfY2FzdGluZyJdLCJsaW1iIjoxfSx7ImlkIjoic3VtbW9uX2JvbmVfZ29sZW0iLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsic3RlYWR5X25lcnZlIiwiY2hpdGlub3VzX2Jyb29kIl0sImxpbWIiOjB9LHsiaWQiOiJncmFzcGluZ19jaGFzbSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImJsb29kX3RvbGwiLCJzcGxpbnRlcmVkX2VhcnRoIiwiYWNjZWxlcmFuZG8iLCJkZXNwZXJhdGlvbiJdfSx7ImlkIjoibHVyZV9sYW50ZXJuIiwicmFyaXR5IjoibGVnZW5kYXJ5In1dLCJvZmYiOiJzcGVlZCIsImRlZiI6IndhcmQiLCJnZWFyIjoicmFyZSIsImdzIjoxNDY4Nzk0MjAwLCJ1bmlxdWVzIjp7ImJvb3RzIjoicmltZXdha2UifX0 --seeds 8 --base-seed 2042923508`</details> |
| L40 | clear | `class:vanguard` `off:speed` `def:evasion` `gear:rare` `skill:mark` | 6 | 28.4× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJ2YW5ndWFyZCIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiYmxvb2RfcHJpY2UiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjExMTg1MTEyNjcsInVuaXF1ZXMiOnsiY2hlc3QiOiJhZWdpc19vZl90aGVfZHJvd25lZCIsImdsb3ZlcyI6ImdhbGV3cmlnaHRzIn19 --seeds 8 --base-seed 3673774549`</details> |
| L40 | clear | `class:sentinel` `off:crit` `def:none` `gear:rare` `skill:consecration` | 6 | 28.4× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzZW50aW5lbCIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJjb25zZWNyYXRpb24iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJ0YXV0X3dpcmUiXSwibGltYiI6MH0seyJpZCI6ImRvb21fYmVsbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbInNsaXBzdHJlYW0iXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjEyMzIzNjg2NjYsInVuaXF1ZXMiOnsiY2hlc3QiOiJncm91bmRlZF9sYXR0aWNlIn19 --seeds 8 --base-seed 3369729498`</details> |

Playstyles at L5, best build found per style against the band's median style (50 styles): strongest `projectile · lightning` 72189.1 (3.3×), `construct · lightning` 72000.8 (3.29×), `construct · fire` 69602.6 (3.18×), `area · lightning` 66473.7 (3.04×); weakest `mark · cold` 4279.9 (0.2×), `mark · chaos` 4500.4 (0.21×), `detonate · chaos` 7291.7 (0.33×), `detonate · cold` 7331.5 (0.33×).

Playstyles at L10, best build found per style against the band's median style (50 styles): strongest `court · fire` 145226.4 (2.53×), `area · fire` 135821.9 (2.37×), `projectile · fire` 121704.1 (2.12×), `self · fire` 120383.5 (2.1×); weakest `mark · cold` 11375.7 (0.2×), `detonate · physical` 15193.2 (0.27×), `detonate · cold` 21371.6 (0.37×), `detonate · chaos` 31738.6 (0.55×).

Playstyles at L20, best build found per style against the band's median style (50 styles): strongest `mark · chaos` 795100.6 (4.12×), `mark · fire` 680295.3 (3.53×), `aura · physical` 484504.5 (2.51×), `area · physical` 397987 (2.06×); weakest `mark · cold` 93141.4 (0.48×), `court · cold` 97534.7 (0.51×), `detonate · chaos` 97741.9 (0.51×), `mark · physical` 118968.6 (0.62×).

Playstyles at L40, best build found per style against the band's median style (50 styles): strongest `aura · fire` 931049.4 (1.7×), `projectile · fire` 919132.4 (1.68×), `melee · chaos` 909722.2 (1.67×), `court · fire` 907716.7 (1.66×); weakest `court · cold` 237229.1 (0.43×), `self · cold` 249954 (0.46×), `court · chaos` 262237.3 (0.48×), `projectile · cold` 262618.4 (0.48×).

Main effects at L5 over 6475 rows: strongest `skill:grasping_chasm` 30.87×, `skill:ice_shards` 17.5×, `limb:summon_bone_golem#0` 10.75×, `skill:emberbind` 9.53×, `limb:raise_dead#0` 9.3×; weakest `limb:shadow_step#1` 0.06×, `limb:war_chant#1` 0.09×, `skill:head_of_steam` 0.1×, `primary:reclamation` 0.11×, `limb:warp#0` 0.13×.

Main effects at L10 over 9918 rows: strongest `skill:grasping_chasm` 38.55×, `skill:ice_shards` 20.97×, `limb:summon_bone_golem#0` 18.33×, `primary:oblation_of_mana` 9.94×, `primary:own_sky` 7.84×; weakest `limb:decoy#1` 0.04×, `limb:aegis_ward#0` 0.04×, `limb:shadow_step#0` 0.04×, `limb:decoy#0` 0.07×, `skill:summon_bone_golem` 0.08×.

Main effects at L20 over 12524 rows: strongest `limb:summon_bone_golem#0` 43.66×, `primary:aegis_ward` 24.97×, `skill:ice_shards` 23.53×, `skill:grasping_chasm` 15.52×, `limb:long_exhale#0` 13.18×; weakest `limb:aegis_ward#0` 0.04×, `limb:decoy#0` 0.07×, `limb:war_chant#1` 0.07×, `skill:summon_bone_golem` 0.09×, `skill:long_exhale` 0.13×.

Main effects at L40 over 13094 rows: strongest `primary:infernal_bombardment` 38.6×, `limb:shambler_horde#1` 32.19×, `skill:ice_shards` 22.35×, `support:splintered_earth` 17.6×, `skill:shambler_horde` 9.77×; weakest `limb:aegis_ward#0` 0.04×, `limb:war_chant#0` 0.06×, `limb:war_chant#1` 0.1×, `primary:summon_bone_golem` 0.16×, `skill:surgewind` 0.16×.

**Other combinations far off the sum of their parts**, confirmed on fresh dice (17 tried):

- `class:cleric + support:quiet_hand + support:enduring_snares + support:walking_meditation`: measured 14.8, its parts predict 0.2. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJjbGVyaWMiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJib25lX3ByaXNvbiIsInJhcml0eSI6Im1hZ2ljIiwib3ZlciI6MSwic3VwcG9ydHMiOlsiYXVzdGVyaXR5Il19LHsiaWQiOiJ3YXJwIiwicmFyaXR5IjoibWFnaWMiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJlbmR1cmluZ19zbmFyZXMiLCJkaXZlX2JvbWIiXSwibGltYiI6MH0seyJpZCI6Imxvb3NlX21hcnJvd2dydWJzIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJ3YWxraW5nX21lZGl0YXRpb24iLCJtZWFzdXJlZF9ibG93cyJdfSx7ImlkIjoiZnJvc3Rfd2FsbCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsib3Zlcm1hdGNoIiwicXVpZXRfaGFuZCJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJub25lIiwiZ2VhciI6Im1hZ2ljIiwiZ3MiOjE4ODg5MjgzMzUsInVuaXF1ZXMiOnsiaGVsbWV0IjoiZ3JhdmVibG9vbSIsInJpbmcxIjoibWlzZXJzX2xvb3AifX0:spar --seeds 30 --base-seed 1469220274`</details>
- `class:breaker + primary:cast_falcon + support:crescendo + support:marrowbound_vigor`: measured 212.8, its parts predict 125872.2. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJicmVha2VyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImNhc3RfZmFsY29uIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsiYm9keWd1YXJkX2RvY3RyaW5lIiwib3Zlcm1hdGNoIiwiY3V0dGhyb2F0Il0sImxpbWIiOjB9LHsiaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJjYXN0X29uX2RhbWFnZV90YWtlbiIsImRlZXBfcmVzZXJ2ZXMiXX0seyJpZCI6InN1bW1vbl9ibG9vZF9nb2xlbSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbIm1hcnJvd2JvdW5kX3ZpZ29yIiwiY3VsbWluYXRpb24iXX0seyJpZCI6ImZhdWx0YnJlYWsiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJydXRobGVzcyIsImJsb29kX3RvbGwiLCJzZXJlbmVfcG93ZXIiLCJjcmVzY2VuZG8iXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjoxNjc1NDQ0MDQzLCJ1bmlxdWVzIjp7ImNoZXN0IjoiaG9sbG93X3NvdmVyZWlnbiIsImdsb3ZlcyI6InRpdGFuc19ncmFzcCJ9fQ:spar --seeds 30 --base-seed 1469220274`</details>
- `class:hivecaller + support:sainted_ash + support:monolith + unique:slowmatch_coil`: measured 11.6, its parts predict 0.7. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJoaXZlY2FsbGVyIiwibHZsIjoxMCwic2tpbGxzIjpbeyJpZCI6ImV4cG9zZV93ZWFrbmVzcyIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzYWludGVkX2FzaCJdLCJsaW1iIjowfSx7ImlkIjoibG9vc2VfbWFycm93Z3J1YnMiLCJyYXJpdHkiOiJtYWdpYyJ9LHsiaWQiOiJleHB1bmdlIiwicmFyaXR5IjoibWFnaWMifSx7ImlkIjoidGhlX2FtYWxnYW0iLCJyYXJpdHkiOiJyYXJlIiwib3ZlciI6MSwic3VwcG9ydHMiOlsibW9ub2xpdGgiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6OTc2MzI3NTkyLCJ1bmlxdWVzIjp7InJpbmcxIjoiY29tbW9uX3B1bHNlIiwicmluZzIiOiJzbG93bWF0Y2hfY29pbCJ9fQ:spar --seeds 30 --base-seed 1469220274`</details>

## Tuning reads

Standing tables to tune from. Advisory.

**What +10 of each attribute is worth**, median across the roster at L20 geared (share of output on the sparring lane, share of time survived on the survival clock):

| attribute | output | time survived | classes where it did nothing |
|---|---:|---:|---:|
| finesse | +5% | 0% | 1 of 39 |
| strength | +4% | +2% | 0 of 39 |
| intelligence | +3% | 0% | 0 of 39 |
| wisdom | +2% | 0% | 0 of 39 |
| prowess | 0% | 0% | 2 of 39 |
| fortitude | 0% | +5% | 0 of 39 |
| dexterity | 0% | 0% | 0 of 39 |
| charisma | 0% | +2% | 0 of 39 |
| willpower | 0% | +2% | 0 of 39 |
| vitality | 0% | +9% | 0 of 39 |

**Support power**, median output change across the hosts each gem works on. Strongest: `sundering_flight` +199%, `fire_walker` +182%, `scorched_wake` +140%, `mounting_frenzy` +134%, `resounding_echo` +110%, `crescendo` +108%, `volley` +98%, `elemental_conduction` +87%. Weakest: `austerity` -51%, `septic_bargain` -49%, `pyre_legion` -36%, `rattling_salvo` -35%, `spirit_totem` -28%, `wraith_passage` -25%, `nova_release` -20%, `sweeping_blow` -20%.

**Against the target** of +10% to +15%: the median gem changes output by +7%. 22 in the band, 85 above it, 124 below it, 101 leave damage alone.

15 of these gems read off their own rig, because they need something a plain rig does not do: in the middle of a crowd (`alternating_strikes`, `unstable_flight`, `wild_abandon`, `tethered_orbit`, `gyre`, `vortex`, `sidewinder`, `trueflight`, `crosswind`); with a guard raised (`guarded_casting`); with a charge a second fed into its bank (`embargo`, `ravening`); against a plain dummy instead of a resistant one (`refraction`, `flameforged`, `rarefy`).

**Affix families** (211 measured on one magic piece against the same wardrobe without it, 11 never worn on the doll). Most output: `apply_poison` 2.11× on warrior, `apply_poison` 1.97× on magician, `apply_bleed` 1.71× on warrior, `apply_bleed` 1.63× on magician, `hadal_cold` 1.48× on magician, `hadal_cold` 1.45× on warrior, `proc_concussive` 1.4× on warrior, `creeper_barrow` 1.27× on warrior. Most time survived: `life_on_evade` 1.93× on warrior, `barnacle_crust` 1.74× on warrior, `chitin_plate` 1.59× on warrior, `life_on_hit` 1.58× on warrior, `life_on_evade` 1.54× on magician, `thorns` 1.54× on warrior. Moved nothing on these rigs: 3 families.

**What buffs, hexes, heals and wards add** (196 skills whose own numbers are not damage, at L20, against the same hero without them). Most output beside a plain strike: `infernal_bombardment` 14.1×, `summon_plaguefather` 6.4×, `summon_fire_golem` 4.83×, `summon_flame_sprite` 4.77×, `flame_totem` 4.77×, `shambler_horde` 4.25×, `bind_familiar` 4.22×, `reaper_swarm` 3.88×. Most time survived on the clock: `repulsor_beacon` 11.85×, `shambler_horde` 11.85×, `vampiric_presence` 11.85×, `summon_blade_wraith` 11.85×, `call_the_rift` 10.98×, `reaper_swarm` 10.25×, `summon_wraith` 9.04×, `infernal_bombardment` 6.63×. 35 moved neither at any band: their value lies outside these rigs, or they do nothing.

**Standing config numbers that move the headline rigs** (elasticity: % change in the metric per % change in the number). `DEFENSE_CFG.evasion.weight` → dps_out 0.86, `hero_mana_per_level` → mana_floor_pct 0.19, `DEFENSE_CFG.evasion.weight` → mana_floor_pct 0.28, `DEFENSE_CFG.weight.radiusPow` → dps_out 0.04, `DEFENSE_CFG.weight.refRadius` → mana_floor_pct 0.03, `DEFENSE_CFG.weight.perPoise` → mana_floor_pct 0.02. 59 numbers moved nothing here.

**Provisional bands against the roster.** 23 of 96 band and tier rows have most of the roster outside the band. The measured spread is evidence for your sign-off, and no band changes on its own.

| metric | lane | tier | band | roster outside | measured p10 | median | p90 |
|---|---|---|---|---:|---:|---:|---:|
| player_deaths | parity | starter | L20 | 37 of 39 | 0.2 | 1 | 1 |
| player_deaths | parity | starter | L30 | 37 of 39 | 0.2 | 1 | 1 |
| player_deaths | parity | starter | L40 | 37 of 39 | 0.2 | 1 | 1 |
| player_deaths | parity | starter | L10 | 32 of 39 | 0 | 0.6 | 1 |
| ttk_wave_mean | parity | starter | L20 | 12 of 15 | 12.6 | 19.8 | 38.6 |
| ttk_wave_mean | parity | starter | L40 | 9 of 12 | 10.9 | 20.2 | 33 |
| ttk_wave_mean | parity | starter | L30 | 11 of 15 | 12.9 | 19.2 | 31.3 |
| ttk_wave_mean | parity | kitted | L10 | 27 of 37 | 9.5 | 24.6 | 45.8 |
| ttk_wave_mean | parity | kitted | L5 | 23 of 32 | 10.4 | 24.9 | 40.7 |
| player_deaths | parity | starter | L5 | 28 of 39 | 0 | 0.2 | 1 |
| life_floor_pct | parity | starter | L40 | 28 of 39 | 0 | 0 | 39.8 |
| ttk_wave_mean | parity | starter | L10 | 15 of 21 | 12.4 | 19.3 | 40.3 |

## The instrument

Class expression at the top band: 38 read on the dummy, 1 need the sparring partner, 0 read only in the pack lanes, 0 mute.
Bestiary: 19656 rows measured, 100 bodies not fielded (passive or immortal fixtures). 161 bodies never swung at a hero standing idle within reach, so their threat reads as unmeasured: 102 have no skills, 31 carry kits with no damage, 6 are rooted, 7 lie in ambush, 9 only fight once fought, and 6 have a damage kit and legs and did not swing in a duel either (`cloud_grazer`, `kettle_minnow`, `sand_scorpion`, `star_grazer`, `white_hart`, `wool_aphid`).
How the bodies fought: on an idle hero the median first blow lands at 0.98s. In a duel, 22% of casts are melee, a body spends 17% of the fight within its own melee reach, and it uses 2 skills. No body pressed a skill that was refused.
Skills: 2930 rows across the bands; 902 read zero alone and are not ranked (buffs, auras and mines show nothing without a partner), 30 warned.
Suites: 91 scenarios, 18 of 105 graded metrics outside their provisional band, 12 warned.
Matrix: 127,530 of 127,530 eligible pairs probed (100%), deep lane on 25689 pairs. Verdicts: effective 78555, blind 30610, inert 14500, negligible 2437, cost_only 1428.
Against the committed ledger (8481 rows): 12630 not on file, 2010 measuring healthy. The ledger only changes through `matrix check --reconcile`.

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
| skills_vs | 24 | 24 | 0 | 0 | 0 | 24,192 | 5.2 |
| matchups | 29 | 29 | 0 | 0 | 0 | 13,734 | 5.9 |
| bestiary | 65 | 65 | 0 | 0 | 0 | 78,624 | 16.3 |
| attributes | 39 | 39 | 0 | 0 | 0 | 4,914 | 2.3 |
| affixes | 6 | 6 | 0 | 0 | 0 | 3,472 | 1.1 |
| assists | 9 | 9 | 0 | 0 | 0 | 4,752 | 2.4 |
| socket_play | 1 | 1 | 0 | 0 | 0 | 900 | 0.2 |
| globals | 4 | 4 | 0 | 0 | 0 | 1,704 | 0.3 |
| matrix | 229 | 229 | 0 | 0 | 0 | 235,854 | 53.8 |
| matrix_deep | 139 | 139 | 0 | 0 | 0 | 118,219 | 21.1 |
| search | 40 | 40 | 0 | 0 | 0 | 101,272 | 22.4 |
| archive_confirm | 38 | 38 | 0 | 0 | 0 | 22,752 | 8.4 |
| proposals | 48 | 48 | 0 | 0 | 0 | 13,854 | 3.2 |

Every planned unit ran.

Not simulated at all, by design: zone generation and XP pacing, event pressure, multiplayer, and real player skill. Pilots are simple policies, so kit ceilings are floors. Bands stay provisional until you sign them off.
