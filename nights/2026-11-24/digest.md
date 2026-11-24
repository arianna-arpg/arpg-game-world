# Balance farm, night of 2026-11-24

Commit [ae19c05b83](https://github.com/arianna-arpg/arpg-game-world/commit/ae19c05b832f4b95a2103fe5b46e09b922aa74e8), profile `full`. 691,994 episodes, 151.6 core-hours, 276 minutes end to end. [Run](https://github.com/arianna-arpg/arpg-game-world/actions/runs/45420015006).

## 🔴 Regressions

**4 new skill × support defect(s) since last night**: `consecration@sanctuary_floor|overmend|inert`, `consecration@sanctuary_floor|untouched_might|inert`, `consecration|overmend|inert`, `consecration|untouched_might|inert`. Forensics: `npm run sim -- matrix explain <skill> <support>`.

## What moved since last night

200 row(s) moved past their own noise and 10%. Largest first:

| row | before | after | change |
|---|---:|---:|---:|
| `match:geared_breaker_l20:tomb_scarab:L20` | 47.11 | 636.06 | +1250% |
| `class:warrior:kitted:L40:pressure:floor` | 8.74 | 97.67 | +1018% |
| `match:starter_breaker_l10:skeleton_warrior:L10` | 40.88 | 419.68 | +927% |
| `class:vanguard:starter:L40:parity:floor` | 4.35 | 34.69 | +698% |
| `match:kitted_pyromancer_l20:skeleton_warrior:L20` | 196.51 | 1446.7 | +636% |
| `class:warrior:kitted:L30:pressure:floor` | 14.3 | 100 | +599% |
| `match:kitted_pyromancer_l20:hunting_falcon:L20` | 241.94 | 1646.18 | +580% |
| `monster:grave_shambler:warrior:L25:veteran` | 3.79 | 21.77 | +474% |
| `class:matador:starter:L40:parity:floor` | 17.24 | 72.15 | +319% |
| `match:starter_vanguard_l10:blood_mite:L10` | 108.5 | 404.84 | +273% |
| `match:starter_vanguard_l20:blood_mite:L20` | 55.84 | 189.83 | +240% |
| `match:kitted_vanguard_l10:shore_crab:L10` | 157.62 | 484.35 | +207% |
| `class:assassin:geared:L40:pressure:floor` | 17.35 | 47.14 | +172% |
| `class:trapper:starter:L40:spar:floor` | 19.03 | 48.91 | +157% |
| `match:starter_wallwright_l20:hunting_falcon:L20` | 6.53 | 15.42 | +136% |
| `match:kitted_pyromancer_l20:shield_anima:L20` | 128.21 | 291.37 | +127% |
| `class:breaker:starter:L40:parity:floor` | 26.61 | 56.19 | +111% |
| `class:berserker:starter:L40:parity:floor` | 0 | 57.55 | +100% |
| `match:starter_brawler_l20:primeval_ironbell_leg:L20` | 21.53 | 0 | −100% |
| `match:starter_wallwright_l20:shore_crab:L20` | 0 | 25.71 | +100% |
| `match:starter_wallwright_l20:zombie:L20` | 0 | 4.2 | +100% |
| `match:starter_blademaster_l20:tide_whelk:L20` | 0 | 53.88 | +100% |
| `match:geared_cryomancer_l20:molting_behemoth:L20` | 119.07 | 0 | −100% |
| `match:starter_warrior_l20:bulwark_scuttler:L20` | 0 | 25.78 | +100% |
| `match:starter_warrior_l20:tide_whelk:L20` | 0 | 38.24 | +100% |

## Top proposed numbers

Advisory. Nothing here has been applied, and each needs your sign-off. Each row re-measured the subject on dice the night had not seen, solved for a number through the real game, and verified it at common seeds. 24 outlier(s) did not hold up on fresh dice, or landed within 15% of their target, and were dropped.

| # | subject | change | metric: before → after | cohort target | verdict | guards |
|---:|---|---|---|---:|---|---|
| 1 | skill `shambler_horde` | `monsters.grave_shambler.explodeOnDeath`: 2.2 → 0.88 | dps_dummy: 19394.7 → 7757.9 | 680.5 | moved, closes 62% | none moved |
| 2 | skill `arclight_rain` | `skills.arclight_rain.baseDamage.physical.0`: 5 → 2 (+3 lines, ×0.4) | dps_dummy: 347.2 → 138.9 | 93.2 | moved, closes 82% | none moved |
| 3 | skill `marshlight` | `skills.marshlight.baseDamage.chaos.0`: 9 → 3.6 (+1 lines, ×0.4) | dps_dummy: 267.6 → 107 | 98.9 | moved | none moved |
| 4 | skill `mirespume` | `skills.mirespume.baseDamage.chaos.0`: 11 → 4.4 (+1 lines, ×0.4) | dps_dummy: 244.8 → 97.9 | 98.9 | moved | none moved |
| 5 | support `fire_walker` | `supports.fire_walker.mods.0.value`: 0.5 → 0.2 (+1 lines, ×0.4) | dps_dummy: 61 → 31.4 | 16.4 | moved, closes 66% | none moved |
| 6 | skill `infernal_bombardment` | `monsters.bombard_demon.explodeOnDeath`: 1.6 → 0.67 | dps_dummy: 15897 → 6696.1 | 6676.7 | moved | none moved |
| 7 | skill `glare_ice` | `skills.glare_ice.baseDamage.cold.0`: 4 → 10 (+1 lines, ×2.5) | dps_dummy: 1.3 → 3.3 | 4 | moved, closes 72% | none moved |
| 8 | skill `trailblaze` | `skills.trailblaze.baseDamage.fire.0`: 6 → 2.8 (+1 lines, ×0.47) | dps_dummy: 65.5 → 31.8 | 31.1 | moved | none moved |
| 9 | skill `keening_shriek` | `skills.keening_shriek.baseDamage.physical.0`: 4 → 7.6 (+1 lines, ×1.9) | dps_dummy: 2 → 3.7 | 3.6 | moved | none moved |
| 10 | support `sundering_flight` | `supports.sundering_flight.fissureTrail.damageScale`: 0.4 → 0.16 | dps_dummy: 49.6 → 30.3 | 19 | moved, closes 63% | none moved |
| 11 | support `volley` | `supports.volley.mods[stat=damage].value`: -0.25 → -0.63 | dps_dummy: 92 → 46 | 54.6 | moved | none moved |
| 12 | skill `zealots_cadence` | `skills.zealots_cadence.baseDamage.physical.0`: 14 → 35 (+1 lines, ×2.5) | dps_dummy: 14.3 → 27.5 | 45.7 | moved, closes 42% | none moved |
| 13 | monster_threat `seatless_usher` | `skills.ushers_lull.baseDamage.chaos.0`: 4 → 9.2 (+1 lines, ×2.3) | dps_in: 1.2 → 8 | 8 | moved | none moved |
| 14 | skill `transfusion` | `skills.transfusion.baseDamage.chaos.0`: 6 → 9.6 (+1 lines, ×1.6) | dps_dummy: 5.8 → 9.3 | 9.3 | moved | none moved |
| 15 | skill `epidemic` | `skills.epidemic.baseDamage.chaos.0`: 3 → 7.5 (+1 lines, ×2.5) | dps_dummy: 1 → 2.6 | 7.9 | moved, closes 23% | none moved |

<details><summary>Repro commands</summary>

1. `npm run sim -- whatif --knob 'monsters.grave_shambler.explodeOnDeath*0.4' --scenarios skill:shambler_horde:40 --seeds 30 --base-seed 2031450879`. Other dials on this metric (elasticity): cooldown -0.71, useTime -0.36. Same change at other bands: `skill:shambler_horde:5` 257.8→103.1, `skill:shambler_horde:10` 768.4→307.4, `skill:shambler_horde:20` 3055.9→1222.4
2. `npm run sim -- whatif --knob 'skills.arclight_rain.baseDamage*0.4' --scenarios skill:arclight_rain:40 --seeds 30 --base-seed 2031450879`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.19, useTime 0.16. Same change at other bands: `skill:arclight_rain:5` 152.2→60.9, `skill:arclight_rain:10` 184.6→73.8, `skill:arclight_rain:20` 233.3→93.3
3. `npm run sim -- whatif --knob 'skills.marshlight.baseDamage*0.4' --scenarios skill:marshlight:10 --seeds 30 --base-seed 2031450879`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.64, manaCost -0.03. Same change at other bands: `skill:marshlight:5` 231.2→92.5, `skill:marshlight:20` 321.1→128.5, `skill:marshlight:40` 460→184.2
4. `npm run sim -- whatif --knob 'skills.mirespume.baseDamage*0.4' --scenarios skill:mirespume:10 --seeds 30 --base-seed 2031450879`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.6. Same change at other bands: `skill:mirespume:5` 214.9→86.1, `skill:mirespume:20` 294→117.6, `skill:mirespume:40` 404.8→161.9
5. `npm run sim -- whatif --knob 'supports.fire_walker.mods*0.4' --scenarios socketed:phoenix_dive:fire_walker:20 --seeds 30 --base-seed 2031450879`
6. `npm run sim -- whatif --knob 'monsters.bombard_demon.explodeOnDeath*0.42' --scenarios skill:infernal_bombardment:40 --seeds 30 --base-seed 2031450879`. Other dials on this metric (elasticity): cooldown -0.8. Same change at other bands: `skill:infernal_bombardment:5` 239.6→102.9, `skill:infernal_bombardment:10` 684.5→290.4, `skill:infernal_bombardment:20` 2613.3→1104.4
7. `npm run sim -- whatif --knob 'skills.glare_ice.baseDamage*2.5' --scenarios skill:glare_ice:40 --seeds 30 --base-seed 2031450879`. Other dials on this metric (elasticity): cooldown -1.07, baseDamage 1. Same change at other bands: `skill:glare_ice:5` 0.8→2, `skill:glare_ice:10` 0.9→2.3, `skill:glare_ice:20` 1.1→2.6
8. `npm run sim -- whatif --knob 'skills.trailblaze.baseDamage*0.47' --scenarios skill:trailblaze:20 --seeds 30 --base-seed 2031450879`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.74. Same change at other bands: `skill:trailblaze:5` 50.6→25, `skill:trailblaze:10` 56.5→27.6, `skill:trailblaze:40` 86.5→41
9. `npm run sim -- whatif --knob 'skills.keening_shriek.baseDamage*1.9' --scenarios skill:keening_shriek:40 --seeds 30 --base-seed 2031450879`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.73. Same change at other bands: `skill:keening_shriek:5` 1.1→2.1, `skill:keening_shriek:10` 1.3→2.4, `skill:keening_shriek:20` 1.5→2.8
10. `npm run sim -- whatif --knob 'supports.sundering_flight.fissureTrail.damageScale*0.4' --scenarios socketed:ball_lightning:sundering_flight:20 --seeds 30 --base-seed 2031450879`
11. `npm run sim -- whatif --knob 'supports.volley.mods[stat=damage].value*2.5' --scenarios socketed:soulflay:volley:20 --seeds 30 --base-seed 2031450879`
12. `npm run sim -- whatif --knob 'skills.zealots_cadence.baseDamage*2.5' --scenarios skill:zealots_cadence:20 --seeds 30 --base-seed 2031450879`. Other dials on this metric (elasticity): baseDamage 0.61. Same change at other bands: `skill:zealots_cadence:5` 11→21.1, `skill:zealots_cadence:10` 12.4→23.7, `skill:zealots_cadence:40` 22.5→43.2
13. `npm run sim -- whatif --knob 'skills.ushers_lull.baseDamage*2.3' --scenarios threat:starter_magician_l25:seatless_usher:25 --seeds 30 --base-seed 2031450879`. Other dials on this metric (elasticity): kit.ushers_lull 4.5. Same change at other bands: `threat:starter_magician_l5:seatless_usher:5` 2→4.6, `threat:starter_magician_l10:seatless_usher:10` 0.8→4.4, `threat:starter_magician_l20:seatless_usher:20` 2.3→8.2, `threat:starter_magician_l40:seatless_usher:40` 0→5.7
14. `npm run sim -- whatif --knob 'skills.transfusion.baseDamage*1.6' --scenarios skill:transfusion:40 --seeds 30 --base-seed 2031450879`. Other dials on this metric (elasticity): cooldown -1.22, baseDamage 1. Same change at other bands: `skill:transfusion:5` 3.4→5.4, `skill:transfusion:10` 3.8→6.1, `skill:transfusion:20` 4.4→7
15. `npm run sim -- whatif --knob 'skills.epidemic.baseDamage*2.5' --scenarios skill:epidemic:40 --seeds 30 --base-seed 2031450879`. Other dials on this metric (elasticity): cooldown -1.22, baseDamage 1. Same change at other bands: `skill:epidemic:5` 1→2.6, `skill:epidemic:10` 1→2.6, `skill:epidemic:20` 1→2.6

Run from commit `ae19c05b832f4b95a2103fe5b46e09b922aa74e8`.
</details>

Too noisy to call: class `firebrand`, class `beguiler`, class `hivecaller`, class `assassin`, class `trapper`, class `sharper`. The solved number moved each by less than its own seed-to-seed spread, so these need a calmer rig or more seeds before they mean anything.

### Combinations that run away

Confirmed on fresh dice at 20 times or more what their parts predict. A number this far out usually means damage feeding itself, so no single number fixes it: each needs a call on whether the feedback should be bounded.

- `class:apothecary + unique:cindervigil + support:unleash + support:accelerated`: measured 2.5e+11 damage per second, its parts predict 1133.8. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJhcG90aGVjYXJ5IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6Im1hcmsiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzcGVudGJhbmUiLCJzdG9yZWRfdmVyZGljdCIsIm1lYXN1cmVkX2JsYWRlIiwic2xvd19icmV3Il19LHsiaWQiOiJjb21idXN0aW9uX3N0cmlrZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNlaXNtaWNfbWFyY2giLCJhY2NlbGVyYXRlZCIsInVubGVhc2giLCJzY2F0dGVyZWRfY2FzY2FkZSJdfSx7ImlkIjoicmVjbGFtYXRpb24iLCJyYXJpdHkiOiJtYWdpYyIsIm92ZXIiOjEsInN1cHBvcnRzIjpbImVuZHVyaW5nX3NuYXJlcyJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjozMTQ1MTEwOSwidW5pcXVlcyI6eyJoZWxtZXQiOiJjaW5kZXJ2aWdpbCIsInJpbmcxIjoic2hhcmVkX2N1cCJ9fQ:spar --seeds 30 --base-seed 2031450879`</details>
- `class:berserker + primary:orbital_blades + support:thoughtburn + support:seismic_march`: measured 1.1e+9 damage per second, its parts predict 10425.2. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoib3JiaXRhbF9ibGFkZXMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJmbGVldGZvb3QiXX0seyJpZCI6ImNvbWJ1c3Rpb25fc3RyaWtlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2Vpc21pY19tYXJjaCIsImFjY2VsZXJhdGVkIiwidW5sZWFzaCIsInNjYXR0ZXJlZF9jYXNjYWRlIl19LHsiaWQiOiJmbGFtZV9ibGFzdCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZ2lhbnRzYmFuZSIsInRob3VnaHRidXJuIl19LHsiaWQiOiJyZXB1bHNvcl9iZWFjb24iLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImZsZWV0Zm9vdCIsInBvbHlwaG9ueSJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6IndhcmQiLCJnZWFyIjoicmFyZSIsImdzIjo4Njk3ODg1MTcsInVuaXF1ZXMiOnsiZ2xvdmVzIjoiZ2FsZXdyaWdodHMiLCJoZWxtZXQiOiJoYWxvX25pbnRoX2Nob2lyIn19:spar --seeds 30 --base-seed 2031450879`</details>
- `class:berserker + unique:cinderstep + primary:orbital_blades + support:thoughtburn`: measured 3.1e+7 damage per second, its parts predict 48792.8. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoib3JiaXRhbF9ibGFkZXMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJmbGVldGZvb3QiLCJhdF90aGVfYnJpbmsiXX0seyJpZCI6ImNvbWJ1c3Rpb25fc3RyaWtlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2Vpc21pY19tYXJjaCIsImFjY2VsZXJhdGVkIiwidW5sZWFzaCIsInNjYXR0ZXJlZF9jYXNjYWRlIl19LHsiaWQiOiJmbGFtZV9ibGFzdCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZ2lhbnRzYmFuZSIsInRob3VnaHRidXJuIl19LHsiaWQiOiJyZXB1bHNvcl9iZWFjb24iLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImZsZWV0Zm9vdCIsInBvbHlwaG9ueSJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6IndhcmQiLCJnZWFyIjoicmFyZSIsImdzIjo1Njk3NzI1NzIsInVuaXF1ZXMiOnsiYm9vdHMiOiJjaW5kZXJzdGVwIiwiZ2xvdmVzIjoiZ2FsZXdyaWdodHMifX0:spar --seeds 30 --base-seed 2031450879`</details>
- `class:runeweaver + unique:cinderstep + primary:devouring_swarm + support:seismic_march`: measured 1.1e+7 damage per second, its parts predict 23493.7. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImRldm91cmluZ19zd2FybSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbInNsb3dfbWF0Y2giXX0seyJpZCI6ImNvbWJ1c3Rpb25fc3RyaWtlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2Vpc21pY19tYXJjaCIsImFjY2VsZXJhdGVkIiwidW5sZWFzaCIsInNjYXR0ZXJlZF9jYXNjYWRlIl19LHsiaWQiOiJmbGFtZV9ibGFzdCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiYWNjZWxlcmFuZG8iLCJlZmZpY2llbmN5Il19LHsiaWQiOiJyZXB1bHNvcl9iZWFjb24iLCJyYXJpdHkiOiJtYWdpYyIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImNhc3Rfb25fYmxlZWQiXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjg2OTc4ODUxNywidW5pcXVlcyI6eyJib290cyI6ImNpbmRlcnN0ZXAiLCJnbG92ZXMiOiJnYWxld3JpZ2h0cyJ9fQ:spar --seeds 30 --base-seed 2031450879`</details>
- `class:necromancer + support:seismic_march + support:scattered_cascade + support:unleash`: measured 1.1e+7 damage per second, its parts predict 3468.4. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJuZWNyb21hbmNlciIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJ0ZW5kcmlsX2xhc2giLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJjYXN0X29uX2JsZWVkIiwid2lsZF9hYmFuZG9uIiwibXVsdGlzdHJpa2UiLCJ3aXRoZXJpbmdfYWdvbnkiXX0seyJpZCI6ImRldm91cmluZ19zd2FybSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbInNsb3dfbWF0Y2giXX0seyJpZCI6ImNvbWJ1c3Rpb25fc3RyaWtlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2Vpc21pY19tYXJjaCIsImFjY2VsZXJhdGVkIiwidW5sZWFzaCIsInNjYXR0ZXJlZF9jYXNjYWRlIl19LHsiaWQiOiJmbGFtZV9ibGFzdCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiYWNjZWxlcmFuZG8iLCJlZmZpY2llbmN5Il19XSwib2ZmIjoiY3JpdCIsImRlZiI6ImxpZmUiLCJnZWFyIjoicmFyZSIsImdzIjo0MjU4MDY4NTQsInVuaXF1ZXMiOnsiYW11bGV0IjoiYm9ycm93ZWRfYnJlYXRoIn19:spar --seeds 30 --base-seed 2031450879`</details>
- `class:berserker + unique:cinderstep + primary:thundermark + support:seismic_march`: measured 9998855.9 damage per second, its parts predict 29897.4. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoidGh1bmRlcm1hcmsiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJicm9vZGJlYXJlciIsIndyYWl0aF9wYXNzYWdlIiwicGFsbGlkX3RvdWNoIiwiZmxlZXRmb290Il19LHsiaWQiOiJjb21idXN0aW9uX3N0cmlrZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNlaXNtaWNfbWFyY2giLCJhY2NlbGVyYXRlZCIsInVubGVhc2giLCJzY2F0dGVyZWRfY2FzY2FkZSJdfSx7ImlkIjoiZmxhbWVfYmxhc3QiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImFjY2VsZXJhbmRvIiwiZWZmaWNpZW5jeSJdfSx7ImlkIjoiYmF0dGxlX3N0YW5kYXJkIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbImZsZWV0Zm9vdCIsInNpZWdlYnJlYWtlciIsInRhdXRfd2lyZSJdLCJsaW1iIjoxfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJsaWZlIiwiZ2VhciI6InJhcmUiLCJncyI6ODY5Nzg4NTE3LCJ1bmlxdWVzIjp7ImJvb3RzIjoiY2luZGVyc3RlcCIsImdsb3ZlcyI6ImdhbGV3cmlnaHRzIn19:spar --seeds 30 --base-seed 2031450879`</details>
- `class:brawler + unique:cinderstep + support:grasping_tendrils + support:cascade`: measured 2657622.5 damage per second, its parts predict 5423.7. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJicmF3bGVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImV2aXNjZXJhdGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJncmFzcGluZ190ZW5kcmlscyIsImdpYW50c2JhbmUiLCJhenVyZV9oYXJ2ZXN0Iiwic2VyZW5lX3Bvd2VyIl0sImxpbWIiOjF9LHsiaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYWxhY3JpdHkiLCJwb2x5cGhvbnkiLCJhdXN0ZXJpdHkiLCJhcG90aGVvc2lzIl19LHsiaWQiOiJzaGF0dGVyY2hvcmQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInJlc291bmRpbmdfZWNobyIsImNhc2NhZGUiXSwibGltYiI6MX0seyJpZCI6ImJhbGxfbGlnaHRuaW5nIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsibW9tZW50dW0iXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjkyMjY5ODcwMywidW5pcXVlcyI6eyJib290cyI6ImNpbmRlcnN0ZXAiLCJoZWxtZXQiOiJncmF2ZWJsb29tIn19:spar --seeds 30 --base-seed 2031450879`</details>
- `class:resonator + support:seismic_march + support:scattered_cascade + support:unleash`: measured 513425.5 damage per second, its parts predict 1218.5. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJyZXNvbmF0b3IiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZ3JpdF9zdGFuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiLCJvdmVybWF0Y2giLCJvc3RpbmF0byJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJhY2NlbGVyYW5kbyIsImVmZmljaWVuY3kiXX0seyJpZCI6InJlcHVsc29yX2JlYWNvbiIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZmxlZXRmb290Il19XSwib2ZmIjoiY3JpdCIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6ODY5Nzg4NTE3LCJ1bmlxdWVzIjp7ImNoZXN0IjoidGhlX3VubW92ZWQiLCJyaW5nMSI6ImNvYWxfcmVtZW1iZXJlZCJ9fQ:spar --seeds 30 --base-seed 2031450879`</details>
- `class:warrior + unique:cinderstep + support:crescendo + support:quiet_hand`: measured 393.5 damage per second, its parts predict 1.1. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJ3YXJyaW9yIiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6InNvbGFyX29yYiIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInF1aWV0X2hhbmQiXX0seyJpZCI6ImNpbmRlcl9zd2FybSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInBhbGxpZF90b3VjaCIsInNlcHRpY19iYXJnYWluIiwiYmxvb2RfcHJpY2UiLCJjYXN0X29uX2hpZ2hfcm9sbCJdfSx7ImlkIjoiYWVnaXNfd2FyZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbImNhc2NhZGUiLCJjcmVzY2VuZG8iLCJub19tYW5zX2xhbmQiLCJsaW1icmVhdmVyIl0sImxpbWIiOjB9LHsiaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImRvbWluaW9uX3RpdGhlIiwiYmxvb2RfcHJpY2UiLCJzZXJlbmVfcG93ZXIiXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjEzMzEwNTQ3MzcsInVuaXF1ZXMiOnsiYm9vdHMiOiJjaW5kZXJzdGVwIiwiaGVsbWV0IjoiaGFsb19uaW50aF9jaG9pciJ9fQ:spar --seeds 30 --base-seed 2031450879`</details>
- `class:warrior + support:crescendo + support:cascade + support:vital_bond`: measured 364.9 damage per second, its parts predict 1.1. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJ3YXJyaW9yIiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6InJldml2ZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbIndhcmRpbmdfZmxlc2giLCJtZWFzdXJlZF9ibG93cyIsInZpdGFsX2JvbmQiLCJjbGFtb3IiXX0seyJpZCI6ImNpbmRlcl9zd2FybSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInBhbGxpZF90b3VjaCIsInNlcHRpY19iYXJnYWluIiwiYmxvb2RfcHJpY2UiLCJjYXN0X29uX2hpZ2hfcm9sbCJdfSx7ImlkIjoiYWVnaXNfd2FyZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbImNhc2NhZGUiLCJjcmVzY2VuZG8iLCJub19tYW5zX2xhbmQiLCJsaW1icmVhdmVyIl0sImxpbWIiOjB9LHsiaWQiOiJibGlnaHRzcGVhciIsInJhcml0eSI6ImxlZ2VuZGFyeSJ9XSwib2ZmIjoiY3JpdCIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjoxMzMxMDU0NzM3LCJ1bmlxdWVzIjp7ImFtdWxldCI6ImxpbmVhZ2Vfa25vdCJ9fQ:spar --seeds 30 --base-seed 2031450879`</details>

### Flagged for your decision

The numbers an author would reach for did not move these enough. They are not proposals: each needs a call on whether the mechanic is right, and none has been touched.

- class `chronomancer`: The numbers an author would reach for barely move this: skills.stasis_lock.baseDamage ×2.5 closes 9%; classes.chronomancer.attributes ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- skill `hurricane`: The numbers an author would reach for barely move this: skills.hurricane.baseDamage ×2.5 closes 13%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- support `septic_bargain`: The numbers an author would reach for barely move this: supports.septic_bargain.mods ×2.5 closes 19%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- support `resounding_echo`: The numbers an author would reach for barely move this: supports.resounding_echo.mods ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `stygian_doll`: The numbers an author would reach for barely move this: monsters.stygian_doll.base.life ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- affix `crowd_damage`: The numbers an author would reach for barely move this: affixes.crowd_damage.tiers.*.ranges ×2.5 closes 2%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `amalgam_fleshweaver`: The numbers an author would reach for barely move this: monsters.amalgam_fleshweaver.base.life ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.

## Outliers

432 rows sit far from their cohort (log-scale median and MAD, z ≥ 3 and a ratio past 1.8× or 0.55×), 76 of them new tonight. Warned rows and zero rows never enter a cohort.

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
|  | support | `elemental_conduction` | output_multiplier | 1.9 | 1 | 1.82× | 10.2 | supports · effective hosts |
|  | monster_threat | `hadal_lantern` | dps_in | 0.1 | 15.3 | 0× | -10 | L12 · magician · body |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.07× | -9.9 | L40 · geared · pressure · kill_rate |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.05× | -9.9 | L20 · kitted · pressure · kill_rate |
| 🆕 | interaction | `class:berserker + primary:orbital_blades + support:thoughtburn + support:seismic_march` | dps_out | 1.2e+8 | 10425.2 | 11971.11× | 9.7 | L40 main effects |
| 🆕 | interaction | `class:ranger + support:afterspray + support:measured_blade + support:ancestral_call` | dps_out | 86.5 | 0.2 | 446.78× | 9.4 | L10 main effects |
|  | class | `chronomancer` | kill_rate | 0 | 0.4 | 0.02× | -8.9 | L5 · geared · pressure · kill_rate |
|  | monster_threat | `dream_tick` | dps_in | 0.1 | 15.3 | 0.01× | -8.9 | L12 · magician · body |
| 🆕 | interaction | `class:necromancer + support:seismic_march + support:scattered_cascade + support:unleash` | dps_out | 1.8e+7 | 3468.4 | 5128.85× | 8.8 | L40 main effects |
| 🆕 | interaction | `class:resonator + support:seismic_march + support:scattered_cascade + support:unleash` | dps_out | 5660605.4 | 1218.5 | 4645.55× | 8.7 | L40 main effects |
|  | monster_threat | `banshee` | dps_in | 0.2 | 18.1 | 0.01× | -8.6 | L25 · magician · body |
| 🆕 | interaction | `class:berserker + unique:cinderstep + primary:orbital_blades + support:thoughtburn` | dps_out | 1.6e+8 | 48792.8 | 3183.25× | 8.4 | L40 main effects |
|  | skill | `infernal_bombardment` | dps_dummy | 15908.5 | 201.4 | 78.98× | 8.2 | L40 · court · cd8 |

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
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:20:kitted --seeds 10`
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:5:geared --seeds 10`
- dream_tick: `npm run sim -- run --refs threat:starter_magician_l12:dream_tick:12 --seeds 10`
- banshee: `npm run sim -- run --refs threat:starter_magician_l25:banshee:25 --seeds 10`
- infernal_bombardment: `npm run sim -- run --refs skill:infernal_bombardment:40 --seeds 10`

</details>

## Build search

78,246 candidates tonight (19,974 refused by the real gates), 1,681,395 over 26 night(s). The archive holds 1438 elite rows; 1424 were re-measured on this commit and 67 no longer pass the gates. Tried so far in a legal build: 39 of 39 classes, 576 of 576 primarys, 604 of 604 skills, 455 of 455 supports, 41 of 41 uniques.

| band | objective | build (top factors) | value | × band median | repro |
|---|---|---|---:|---:|---|
| L5 | offense | `class:runeweaver` `off:crit` `def:none` `gear:rare` `skill:lure_lantern` | 73970.8 | 2170.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoibHVyZV9sYW50ZXJuIiwicmFyaXR5IjoibWFnaWMiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJnaWFudHNiYW5lIl19LHsiaWQiOiJzdG9ybWJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJ0ZW1wZXN0X3JhbmdlIiwiY3V0dGhyb2F0Il19LHsiaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJjcmVzY2VuZG8iLCJib25kYnJlYWtlciIsImFjY2VsZXJhbmRvIiwiYmxvb2RfdG9sbCJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInN0dW5fY2hhbmNlIiwibW91bnRpbmdfZnJlbnp5IiwicGFydGluZ19qdWRnZW1lbnQiLCJzdW5kZXJpbmdfZmxpZ2h0Il19XSwib2ZmIjoiY3JpdCIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjoxNDM3MjI5MDg5LCJ1bmlxdWVzIjp7ImFtdWxldCI6InN0b3JtY2FsbCIsInJpbmcxIjoiZW1iZXJicmFuZCJ9fQ --seeds 8 --base-seed 2858612292`</details> |
| L5 | offense | `class:runeweaver` `off:crit` `def:none` `gear:rare` `skill:cold_vortex` | 72301.5 | 2121.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoiY29sZF92b3J0ZXgiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImVuZHVyaW5nX3NuYXJlcyJdfSx7ImlkIjoic3Rvcm1iaW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsidGVtcGVzdF9yYW5nZSIsImN1dHRocm9hdCJdfSx7ImlkIjoiZW1iZXJiaW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiY3Jlc2NlbmRvIiwiYm9uZGJyZWFrZXIiLCJhY2NlbGVyYW5kbyIsImJsb29kX3RvbGwiXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzdHVuX2NoYW5jZSIsIm1vdW50aW5nX2ZyZW56eSIsInBhcnRpbmdfanVkZ2VtZW50Iiwic3VuZGVyaW5nX2ZsaWdodCJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6MTQzNzIyOTA4OSwidW5pcXVlcyI6eyJhbXVsZXQiOiJzdG9ybWNhbGwiLCJyaW5nMSI6ImVtYmVyYnJhbmQifX0 --seeds 8 --base-seed 383304493`</details> |
| L5 | clear | `class:chronomancer` `off:damage` `def:none` `gear:rare` `skill:broodpod` | 6 | 20.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJicm9vZHBvZCIsInJhcml0eSI6Im1hZ2ljIiwib3ZlciI6Miwic3VwcG9ydHMiOlsibWFycm93Ym91bmRfdmlnb3IiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjoxNDMwNTA0OTA4LCJ1bmlxdWVzIjp7ImJvb3RzIjoiZmxlZXRmZWF0aGVyIiwiaGVsbWV0IjoiZ3JhdmVibG9vbSJ9fQ --seeds 8 --base-seed 2087088486`</details> |
| L5 | clear | `class:chronomancer` `off:speed` `def:ward` `gear:rare` `skill:detonate_mines` | 6 | 20.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZGVsaWJlcmF0ZV9ydWluIl19LHsiaWQiOiJzaGF0dGVyY2hvcmQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInJlc291bmRpbmdfZWNobyIsImNhc2NhZGUiXSwibGltYiI6MX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6IndhcmQiLCJnZWFyIjoicmFyZSIsImdzIjoxODA4OTMyODF9 --seeds 8 --base-seed 2087088486`</details> |
| L10 | offense | `class:magician` `off:speed` `def:armor` `gear:rare` `skill:bind_familiar` | 126603.9 | 2849.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJiaW5kX2ZhbWlsaWFyIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbInNlcmVuZV9wb3dlciJdLCJsaW1iIjowfSx7ImlkIjoiZnJvc3Rfd2FsbCIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJlcGhlbWVyYWwiXX0seyJpZCI6ImVtYmVyYmluZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImZsZWV0aW5nX2Rldm90aW9uIiwid3JhaXRoX3Bhc3NhZ2UiLCJyYXZlbmluZyIsImV4dGVybWluYXRvciJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNsb3dfYnJldyIsInBhcnRpbmdfanVkZ2VtZW50IiwibW91bnRpbmdfZnJlbnp5IiwicmVtbmFudHMiXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6MTgyOTU0NzkyNiwidW5pcXVlcyI6eyJjaGVzdCI6InRoZV91bm1vdmVkIiwicmluZzEiOiJlbWJlcmJyYW5kIn19 --seeds 8 --base-seed 3200936125`</details> |
| L10 | offense | `class:chronomancer` `off:speed` `def:life` `gear:rare` `skill:creeping_frost` | 120915 | 2721.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjEwLCJza2lsbHMiOlt7ImlkIjoiY3JlZXBpbmdfZnJvc3QiLCJyYXJpdHkiOiJyYXJlIiwib3ZlciI6Miwic3VwcG9ydHMiOlsidm9pZHJlbmQiLCJmZXZlcmVkX2hhbmRzIiwibG9hZGVkX2RpY2UiXX0seyJpZCI6ImVtYmVyYmluZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImZsZWV0aW5nX2Rldm90aW9uIiwibGltYnJlYXZlciIsInJhdmVuaW5nIiwiZXh0ZXJtaW5hdG9yIl19LHsiaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2xvd19icmV3IiwicGFydGluZ19qdWRnZW1lbnQiLCJtb3VudGluZ19mcmVuenkiLCJyZW1uYW50cyJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjE4Mjk1NDc5MjYsInVuaXF1ZXMiOnsiY2hlc3QiOiJ0aGVfdW5tb3ZlZCIsInJpbmcxIjoiZW1iZXJicmFuZCJ9fQ --seeds 8 --base-seed 2655671872`</details> |
| L10 | clear | `class:skald` `off:damage` `def:evasion` `gear:rare` `skill:thundermark` | 6 | 25.1× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJza2FsZCIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJ0aHVuZGVybWFyayIsInJhcml0eSI6InJhcmUiLCJzdXBwb3J0cyI6WyJhdXN0ZXJpdHkiLCJzbG93X21hdGNoIiwiZXBoZW1lcmFsIl19LHsiaWQiOiJkb29tX2JlbGwiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJtZWFzdXJlZF9ibGFkZSJdfSx7ImlkIjoiaG9uZXlkZXdfbHVyZSIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsidXByb290ZXIiLCJ3cmFpdGhfcGFzc2FnZSJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjoxNDgyNzQzNTI1fQ --seeds 8 --base-seed 1744174477`</details> |
| L10 | clear | `class:skald` `off:damage` `def:ward` `gear:rare` `skill:bone_cage` | 6 | 25.1× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJza2FsZCIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJib25lX2NhZ2UiLCJyYXJpdHkiOiJyYXJlIn0seyJpZCI6ImRvb21fYmVsbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbIm1lYXN1cmVkX2JsYWRlIl19LHsiaWQiOiJrZWVuaW5nX3NocmllayIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInNxdWFyZV9zaWdpbCJdfSx7ImlkIjoiZnVyb3IiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJwb3RlbmN5Il19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjE0ODI3NDM1MjV9 --seeds 8 --base-seed 1744174477`</details> |
| L20 | offense | `class:flagellant` `off:crit` `def:ward` `gear:rare` `skill:wildfire_sweep` | 597880.7 | 11085× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJmbGFnZWxsYW50IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6IndpbGRmaXJlX3N3ZWVwIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsicmVtbmFudF9jb25kdWl0Iiwic2llZ2VicmVha2VyIiwidW5sZWFzaCIsInN1bmJha2VkX2VkZ2UiXX0seyJpZCI6InN1bW1vbl9ib25lX2dvbGVtIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbInN0ZWFkeV9uZXJ2ZSJdLCJsaW1iIjowfSx7ImlkIjoiZ3Jhc3BpbmdfY2hhc20iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJibG9vZF90b2xsIiwic3BsaW50ZXJlZF9lYXJ0aCIsImFjY2VsZXJhbmRvIiwiZGVzcGVyYXRpb24iXX0seyJpZCI6ImZyb3N0Z3VhcmQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInJlZ2ljaWRlIl19XSwib2ZmIjoiY3JpdCIsImRlZiI6IndhcmQiLCJnZWFyIjoicmFyZSIsImdzIjoxMTc5MDU2MDIzLCJ1bmlxdWVzIjp7ImJlbHQiOiJ3aW50ZXJfYWZ0ZXJfeW91IiwiYm9vdHMiOiJyaW1ld2FrZSJ9fQ --seeds 8 --base-seed 1679631344`</details> |
| L20 | offense | `class:flagellant` `off:crit` `def:ward` `gear:rare` `skill:eye_of_the_storm` | 587027.4 | 10883.7× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJmbGFnZWxsYW50IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImV5ZV9vZl90aGVfc3Rvcm0iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJhY2NlbGVyYXRlZCIsImZsZWV0aW5nX2Rldm90aW9uIiwidXByb290ZXIiLCJtb25vbGl0aCJdfSx7ImlkIjoic3VtbW9uX2JvbmVfZ29sZW0iLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsic3RlYWR5X25lcnZlIiwiZGVhdGhzX2Rvb3IiXSwibGltYiI6MH0seyJpZCI6ImdyYXNwaW5nX2NoYXNtIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYmxvb2RfdG9sbCIsInNwbGludGVyZWRfZWFydGgiLCJhY2NlbGVyYW5kbyIsImRlc3BlcmF0aW9uIl19LHsiaWQiOiJmcm9zdGd1YXJkIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJyZWdpY2lkZSIsIm1lYXN1cmVkX2JsYWRlIl19XSwib2ZmIjoiY3JpdCIsImRlZiI6IndhcmQiLCJnZWFyIjoicmFyZSIsImdzIjoxMTc5MDU2MDIzLCJ1bmlxdWVzIjp7ImJlbHQiOiJ3aW50ZXJfYWZ0ZXJfeW91IiwiYm9vdHMiOiJyaW1ld2FrZSJ9fQ --seeds 8 --base-seed 1679631344`</details> |
| L20 | clear | `class:resonator` `off:damage` `def:armor` `gear:rare` `skill:frost_pulse` | 6 | 27.1× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJyZXNvbmF0b3IiLCJsdmwiOjIwLCJza2lsbHMiOlt7ImlkIjoiZnJvc3RfcHVsc2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxfSx7ImlkIjoiZG9vbV9iZWxsIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2hhdHRlcmdsYXNzIiwiZmxvd2JyZWFrZXIiLCJ1cHJvb3RlciJdfSx7ImlkIjoic291bGZsYXkiLCJyYXJpdHkiOiJsZWdlbmRhcnkifV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6MTY3MzQ5ODI5MX0 --seeds 8 --base-seed 863769688`</details> |
| L20 | clear | `class:brawler` `off:crit` `def:none` `gear:rare` `skill:hell_rift` | 6 | 27.1× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJicmF3bGVyIiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImhlbGxfcmlmdCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImNsYW1vciIsInB1bHNhdGluZ19taXNzaWxlcyJdfSx7ImlkIjoiZG9vbV9iZWxsIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsicGhhbnRhc21hbF9lY2hvIl19LHsiaWQiOiJzY3l0aGVfYXJjIiwicmFyaXR5IjoibGVnZW5kYXJ5In1dLCJvZmYiOiJjcml0IiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjEyMjk2ODkzMzF9 --seeds 8 --base-seed 1671950205`</details> |
| L40 | offense | `class:apothecary` `off:damage` `def:evasion` `gear:rare` `skill:blood_mortgage` | 924838 | 9950.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJhcG90aGVjYXJ5IiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImJsb29kX21vcnRnYWdlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiaW5zdWxhdGlvbiIsIndhcmRpbmdfZmxlc2giLCJzdG9yZWRfdmVyZGljdCJdLCJsaW1iIjowfSx7ImlkIjoic2hhbWJsZXJfaG9yZGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJwbHVzX21pbmlvbiIsInJhdmVub3VzX3BhY3QiLCJjYXNjYWRpbmdfY2FsbCIsImVwaGVtZXJhbCJdLCJsaW1iIjoxfSx7ImlkIjoiYmVyc2VyayIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImdpYW50c2JhbmUiLCJpbnN1bGF0aW9uIiwiYmxvb2RfcHJpY2UiLCJzZXJlbmVfcG93ZXIiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6NDcxNDczNDczLCJ1bmlxdWVzIjp7ImhlbG1ldCI6ImdyYXZlYmxvb20iLCJyaW5nMSI6ImNvbW1vbl9wdWxzZSJ9fQ --seeds 8 --base-seed 3624708309`</details> |
| L40 | offense | `class:sorcerer` `off:damage` `def:evasion` `gear:rare` `skill:expunge` | 890792.8 | 9584.2× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzb3JjZXJlciIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJleHB1bmdlIiwicmFyaXR5IjoibGVnZW5kYXJ5In0seyJpZCI6InN0b3JtYmluZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInRlbXBlc3RfcmFuZ2UiXX0seyJpZCI6ImVtYmVyYmluZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbImZsZWV0aW5nX2Rldm90aW9uIiwic2xvd19icmV3IiwicG9seXBob255IiwiYmxvb2RfdG9sbCJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNwb29saW5nIiwic2hvY2tfY2hhbmNlIiwicGFydGluZ19qdWRnZW1lbnQiLCJmbG93YnJlYWtlciJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjoyMDk0MTM1NTUyLCJ1bmlxdWVzIjp7ImJvb3RzIjoicmltZXdha2UiLCJjaGVzdCI6InRoZV91bm1vdmVkIn19 --seeds 8 --base-seed 1227984022`</details> |
| L40 | clear | `class:breaker` `off:damage` `def:evasion` `gear:rare` `skill:purity_of_elements` | 6 | 24.2× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJicmVha2VyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6InB1cml0eV9vZl9lbGVtZW50cyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImRlc3BlcmF0ZV9tZWFzdXJlcyIsInVwcm9vdGVyIiwiZWZmaWNpZW5jeSIsIm92ZXJtYXRjaCJdLCJsaW1iIjoxfSx7ImlkIjoiZG9vbV9iZWxsIiwicmFyaXR5IjoibGVnZW5kYXJ5In1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6OTUxODY3MzQ5LCJ1bmlxdWVzIjp7ImJlbHQiOiJzdG9ybV90aXRoZSJ9fQ --seeds 8 --base-seed 2655671872`</details> |
| L40 | clear | `class:brawler` `off:crit` `def:none` `gear:rare` `skill:eviscerate` | 6 | 24.2× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJicmF3bGVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImV2aXNjZXJhdGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJncmFzcGluZ190ZW5kcmlscyIsImdpYW50c2JhbmUiLCJhenVyZV9oYXJ2ZXN0Iiwic2VyZW5lX3Bvd2VyIl0sImxpbWIiOjF9LHsiaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYWxhY3JpdHkiLCJwb2x5cGhvbnkiLCJhdXN0ZXJpdHkiLCJhcG90aGVvc2lzIl19LHsiaWQiOiJzaGF0dGVyY2hvcmQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInJlc291bmRpbmdfZWNobyIsImNhc2NhZGUiXSwibGltYiI6MX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjE5NTU2NzAxNzAsInVuaXF1ZXMiOnsiYW11bGV0Ijoic3Rvcm1jYWxsIiwiYm9vdHMiOiJjaW5kZXJzdGVwIn19 --seeds 8 --base-seed 1671950205`</details> |

Playstyles at L5, best build found per style against the band's median style (50 styles): strongest `area · lightning` 74883.9 (2.67×), `projectile · lightning` 72189.1 (2.57×), `construct · lightning` 72000.8 (2.57×), `construct · fire` 69602.6 (2.48×); weakest `mark · cold` 4279.9 (0.15×), `mark · chaos` 4500.4 (0.16×), `detonate · cold` 7331.5 (0.26×), `detonate · chaos` 10306.9 (0.37×).

Playstyles at L10, best build found per style against the band's median style (50 styles): strongest `court · fire` 145226.4 (2.25×), `self · fire` 139217.7 (2.16×), `area · fire` 135821.9 (2.11×), `projectile · fire` 122381.3 (1.9×); weakest `detonate · cold` 21371.6 (0.33×), `projectile · chaos` 32295.5 (0.5×), `detonate · chaos` 40121.6 (0.62×), `construct · physical` 43085.5 (0.67×).

Playstyles at L20, best build found per style against the band's median style (50 styles): strongest `mark · chaos` 795100.6 (3.38×), `mark · fire` 687542.8 (2.92×), `area · fire` 632623.6 (2.69×), `aura · fire` 599059.7 (2.55×); weakest `mark · cold` 93141.4 (0.4×), `detonate · chaos` 97741.9 (0.42×), `melee · cold` 123561.9 (0.53×), `self · physical` 148912.6 (0.63×).

Playstyles at L40, best build found per style against the band's median style (50 styles): strongest `projectile · fire` 991148.9 (1.61×), `aura · fire` 931049.4 (1.51×), `melee · chaos` 909722.2 (1.47×), `court · fire` 907716.7 (1.47×); weakest `court · cold` 237229.1 (0.38×), `court · chaos` 262237.3 (0.42×), `target · cold` 262905.4 (0.43×), `mark · cold` 281752.1 (0.46×).

Main effects at L5 over 7855 rows: strongest `skill:grasping_chasm` 31.72×, `limb:raise_dead#0` 18.05×, `skill:ice_shards` 16.62×, `limb:summon_bone_golem#0` 15.16×, `skill:emberbind` 9.22×; weakest `limb:shadow_step#1` 0.06×, `skill:raise_dead` 0.09×, `limb:war_chant#1` 0.1×, `primary:reclamation` 0.12×, `limb:warp#0` 0.13×.

Main effects at L10 over 10624 rows: strongest `skill:grasping_chasm` 35.2×, `skill:ice_shards` 22.1×, `limb:summon_bone_golem#0` 16.12×, `limb:summon_bone_golem#1` 14.48×, `primary:aegis_ward` 11.25×; weakest `limb:decoy#1` 0.04×, `limb:aegis_ward#0` 0.06×, `limb:decoy#0` 0.06×, `limb:shadow_step#0` 0.07×, `limb:war_chant#1` 0.12×.

Main effects at L20 over 15505 rows: strongest `limb:summon_bone_golem#0` 72.55×, `primary:aegis_ward` 59.6×, `skill:ice_shards` 32.64×, `limb:summon_bone_golem#1` 20.26×, `limb:long_exhale#0` 17.48×; weakest `limb:aegis_ward#0` 0.02×, `limb:aegis_ward#1` 0.05×, `skill:summon_bone_golem` 0.07×, `skill:long_exhale` 0.08×, `limb:war_chant#1` 0.1×.

Main effects at L40 over 16152 rows: strongest `primary:infernal_bombardment` 137.37×, `limb:shambler_horde#1` 92.56×, `skill:ice_shards` 29.28×, `support:splintered_earth` 12.92×, `limb:rune_of_power#0` 11.74×; weakest `limb:aegis_ward#0` 0.03×, `limb:war_chant#1` 0.1×, `limb:war_chant#0` 0.11×, `primary:summon_bone_golem` 0.13×, `primary:marrowhooks` 0.15×.

**Other combinations far off the sum of their parts**, confirmed on fresh dice (16 tried):

- `class:summoner + support:stillwater_discipline + primary:arcane_missiles + unique:standing_toast`: measured 67.3, its parts predict 872.8. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJzdW1tb25lciIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJhcmNhbmVfbWlzc2lsZXMiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsic2FuZ3VpbmVfZmVlZCIsImZvcmtpbmciLCJ2b3J0ZXgiXX0seyJpZCI6ImJvbmVzcHJheSIsInJhcml0eSI6Im1hZ2ljIiwib3ZlciI6Miwic3VwcG9ydHMiOlsiY2FzdF93aGlsZV9ndWFyZGluZyJdfSx7ImlkIjoiaW1wZXJpb3VzX2JhcnJhZ2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJib2lsaW5nX3BvaW50IiwiYmxvb2RfcHJpY2UiLCJ0ZXRoZXJlZF9vcmJpdCIsInN0aWxsd2F0ZXJfZGlzY2lwbGluZSJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjoxOTgzMzMxNTUzLCJ1bmlxdWVzIjp7ImJlbHQiOiJzdGFuZGluZ190b2FzdCJ9fQ:spar --seeds 30 --base-seed 2031450879`</details>
- `class:cryomancer + support:cascade + primary:rain_of_ash + support:cutthroat`: measured 4, its parts predict 0.1. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJjcnlvbWFuY2VyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoicmFpbl9vZl9hc2giLCJyYXJpdHkiOiJtYWdpYyIsIm92ZXIiOjIsInN1cHBvcnRzIjpbIm1ldHJvbm9tZSIsIndyYWl0aF9wYXNzYWdlIl19LHsiaWQiOiJ2ZW5vbW91c19hdXJhIiwicmFyaXR5IjoibWFnaWMiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJjdXR0aHJvYXQiLCJjYXNjYWRlIl19LHsiaWQiOiJiZWNrb25fcGFsZXdpc3BzIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJ3ZWF0aGVydmFuZSJdfSx7ImlkIjoiYWxhcm1fcmVlayIsInJhcml0eSI6Im1hZ2ljIiwib3ZlciI6MSwic3VwcG9ydHMiOlsibm9fbWFuc19sYW5kIiwiYm9uZGJyZWFrZXIiXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6Im5vbmUiLCJnZWFyIjoibWFnaWMiLCJncyI6NzAyOTI5MH0:spar --seeds 30 --base-seed 2031450879`</details>

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

**Support power**, median output change across the hosts each gem works on. Strongest: `sundering_flight` +199%, `fire_walker` +182%, `scorched_wake` +140%, `mounting_frenzy` +134%, `resounding_echo` +110%, `crescendo` +108%, `volley` +98%, `elemental_conduction` +87%. Weakest: `austerity` -51%, `septic_bargain` -49%, `pyre_legion` -36%, `rattling_salvo` -35%, `spirit_totem` -28%, `wraith_passage` -25%, `nova_release` -20%, `sweeping_blow` -20%.

**Against the target** of +10% to +15%: the median gem changes output by +7%. 21 in the band, 85 above it, 125 below it, 101 leave damage alone.

15 of these gems read off their own rig, because they need something a plain rig does not do: in the middle of a crowd (`alternating_strikes`, `unstable_flight`, `wild_abandon`, `tethered_orbit`, `gyre`, `vortex`, `sidewinder`, `trueflight`, `crosswind`); with a guard raised (`guarded_casting`); with a charge a second fed into its bank (`embargo`, `ravening`); against a plain dummy instead of a resistant one (`refraction`, `flameforged`, `rarefy`).

**Affix families** (211 measured on one magic piece against the same wardrobe without it, 11 never worn on the doll). Most output: `apply_poison` 2.11× on warrior, `apply_poison` 1.98× on magician, `apply_bleed` 1.71× on warrior, `apply_bleed` 1.64× on magician, `hadal_cold` 1.48× on magician, `hadal_cold` 1.46× on warrior, `proc_concussive` 1.4× on warrior, `creeper_barrow` 1.24× on warrior. Most time survived: `life_on_evade` 1.93× on warrior, `barnacle_crust` 1.74× on warrior, `chitin_plate` 1.59× on warrior, `life_on_hit` 1.58× on warrior, `life_on_evade` 1.54× on magician, `thorns` 1.54× on warrior. Moved nothing on these rigs: 3 families.

**What buffs, hexes, heals and wards add** (196 skills whose own numbers are not damage, at L20, against the same hero without them). Most output beside a plain strike: `infernal_bombardment` 14.1×, `summon_plaguefather` 6.4×, `summon_fire_golem` 4.83×, `summon_flame_sprite` 4.77×, `flame_totem` 4.77×, `shambler_horde` 4.25×, `bind_familiar` 4.22×, `reaper_swarm` 3.88×. Most time survived on the clock: `vampiric_presence` 11.85×, `shambler_horde` 11.85×, `summon_blade_wraith` 11.85×, `repulsor_beacon` 11.85×, `call_the_rift` 10.98×, `reaper_swarm` 10.25×, `summon_wraith` 9.04×, `infernal_bombardment` 6.63×. 35 moved neither at any band: their value lies outside these rigs, or they do nothing.

**Standing config numbers that move the headline rigs** (elasticity: % change in the metric per % change in the number). `hero_mana_per_level` → mana_floor_pct 0.18, `DEFENSE_CFG.evasion.weight` → dps_out 0.86, `DEFENSE_CFG.weight.refRadius` → dps_out -0.5, `DEFENSE_CFG.weight.refRadius` → mana_floor_pct 0.03, `DEFENSE_CFG.weight.radiusPow` → dps_out 0.04, `DEFENSE_CFG.weight.perPoise` → mana_floor_pct 0.02. 59 numbers moved nothing here.

**Provisional bands against the roster.** 23 of 96 band and tier rows have most of the roster outside the band. The measured spread is evidence for your sign-off, and no band changes on its own.

| metric | lane | tier | band | roster outside | measured p10 | median | p90 |
|---|---|---|---|---:|---:|---:|---:|
| player_deaths | parity | starter | L20 | 37 of 39 | 0.2 | 0.8 | 1 |
| player_deaths | parity | starter | L30 | 35 of 39 | 0 | 1 | 1 |
| player_deaths | parity | starter | L40 | 34 of 39 | 0 | 1 | 1 |
| player_deaths | parity | starter | L10 | 32 of 39 | 0 | 0.6 | 1 |
| ttk_wave_mean | parity | kitted | L40 | 28 of 38 | 6.7 | 23.6 | 47.9 |
| ttk_wave_mean | parity | kitted | L10 | 27 of 37 | 9.5 | 23.3 | 45.8 |
| ttk_wave_mean | parity | kitted | L5 | 23 of 32 | 10.4 | 24.9 | 40.7 |
| player_deaths | parity | starter | L5 | 28 of 39 | 0 | 0.2 | 1 |
| ttk_wave_mean | parity | starter | L10 | 15 of 21 | 12.4 | 18.6 | 40.3 |
| ttk_wave_mean | parity | kitted | L30 | 27 of 38 | 8.1 | 23 | 49.5 |
| ttk_wave_mean | parity | kitted | L20 | 26 of 38 | 9.3 | 21.8 | 49.1 |
| ttk_wave_mean | parity | starter | L40 | 10 of 15 | 9.6 | 17.5 | 33 |

## The instrument

Class expression at the top band: 38 read on the dummy, 1 need the sparring partner, 0 read only in the pack lanes, 0 mute.
Bestiary: 19674 rows measured, 100 bodies not fielded (passive or immortal fixtures). 161 bodies never swung at a hero standing idle within reach, so their threat reads as unmeasured: 102 have no skills, 31 carry kits with no damage, 6 are rooted, 7 lie in ambush, 9 only fight once fought, and 6 have a damage kit and legs and did not swing in a duel either (`cloud_grazer`, `kettle_minnow`, `sand_scorpion`, `star_grazer`, `white_hart`, `wool_aphid`).
How the bodies fought: on an idle hero the median first blow lands at 0.98s. In a duel, 21% of casts are melee, a body spends 17% of the fight within its own melee reach, and it uses 2 skills. No body pressed a skill that was refused.
Skills: 2930 rows across the bands; 902 read zero alone and are not ranked (buffs, auras and mines show nothing without a partner), 30 warned.
Suites: 91 scenarios, 15 of 105 graded metrics outside their provisional band, 12 warned.
Matrix: 127,530 of 127,530 eligible pairs probed (100%), deep lane on 31134 pairs. Verdicts: effective 78562, blind 30601, negligible 2436, inert 14503, cost_only 1428.
Against the committed ledger (8481 rows): 13528 not on file, 1973 measuring healthy. The ledger only changes through `matrix check --reconcile`.

## What ran, and what did not

| lane | units planned | ok | gate breach | crashed/killed | out of time or not run | episodes | core-hours |
|---|---:|---:|---:|---:|---:|---:|---:|
| baselines | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| audits | 4 | 4 | 0 | 0 | 0 | 0 | 0 |
| expression | 1 | 1 | 0 | 0 | 0 | 1,208 | 0.2 |
| census | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| suites | 2 | 2 | 0 | 0 | 0 | 910 | 0.3 |
| progression | 39 | 39 | 0 | 0 | 0 | 12,480 | 4.4 |
| skills | 10 | 10 | 0 | 0 | 0 | 8,790 | 1.4 |
| skills_vs | 21 | 21 | 0 | 0 | 0 | 24,192 | 5.4 |
| matchups | 27 | 27 | 0 | 0 | 0 | 13,734 | 5.8 |
| bestiary | 66 | 66 | 0 | 0 | 0 | 78,696 | 15.8 |
| attributes | 39 | 39 | 0 | 0 | 0 | 4,914 | 2.2 |
| affixes | 5 | 5 | 0 | 0 | 0 | 3,472 | 1.1 |
| assists | 10 | 10 | 0 | 0 | 0 | 4,752 | 2.4 |
| socket_play | 1 | 1 | 0 | 0 | 0 | 900 | 0.1 |
| globals | 4 | 4 | 0 | 0 | 0 | 1,704 | 0.3 |
| matrix | 216 | 216 | 0 | 0 | 0 | 235,854 | 49.4 |
| matrix_deep | 114 | 114 | 0 | 0 | 0 | 141,802 | 29.2 |
| search | 40 | 40 | 0 | 0 | 0 | 121,170 | 24.1 |
| archive_confirm | 38 | 38 | 0 | 0 | 0 | 22,784 | 6.6 |
| proposals | 48 | 48 | 0 | 0 | 0 | 14,632 | 2.9 |

Every planned unit ran.

Not simulated at all, by design: zone generation and XP pacing, event pressure, multiplayer, and real player skill. Pilots are simple policies, so kit ceilings are floors. Bands stay provisional until you sign them off.
