# Balance farm, night of 2026-11-21

Commit [42bf39eeab](https://github.com/arianna-arpg/arpg-game-world/commit/42bf39eeabd2eaf670397d112f2835c15a6c803c), profile `full`. 661,058 episodes, 166.6 core-hours, 320 minutes end to end. [Run](https://github.com/arianna-arpg/arpg-game-world/actions/runs/44905594687).

## ✅ No regressions

Every committed baseline holds, nothing crashed, and the matrix has no new defects since last night.

## What moved since last night

No row moved past its own noise and 10%.

## Top proposed numbers

Advisory. Nothing here has been applied, and each needs your sign-off. Each row re-measured the subject on dice the night had not seen, solved for a number through the real game, and verified it at common seeds. 29 outlier(s) did not hold up on fresh dice, or landed within 15% of their target, and were dropped.

| # | subject | change | metric: before → after | cohort target | verdict | guards |
|---:|---|---|---|---:|---|---|
| 1 | skill `shambler_horde` | `monsters.grave_shambler.explodeOnDeath`: 2.2 → 0.88 | dps_dummy: 19394.7 → 7757.9 | 680.5 | moved, closes 62% | none moved |
| 2 | skill `arclight_rain` | `skills.arclight_rain.baseDamage.physical.0`: 5 → 2 (+3 lines, ×0.4) | dps_dummy: 347.2 → 138.9 | 93.2 | moved, closes 82% | none moved |
| 3 | skill `marshlight` | `skills.marshlight.baseDamage.chaos.0`: 9 → 3.6 (+1 lines, ×0.4) | dps_dummy: 264.9 → 105.9 | 98.9 | moved | none moved |
| 4 | skill `mirespume` | `skills.mirespume.baseDamage.chaos.0`: 11 → 4.4 (+1 lines, ×0.4) | dps_dummy: 248.6 → 99.8 | 98.9 | moved | none moved |
| 5 | skill `infernal_bombardment` | `monsters.bombard_demon.explodeOnDeath`: 1.6 → 0.67 | dps_dummy: 15914.3 → 6700.6 | 6676.7 | moved | none moved |
| 6 | support `fire_walker` | `supports.fire_walker.mods.0.value`: 0.5 → 0.2 (+1 lines, ×0.4) | dps_dummy: 61.2 → 31.8 | 17.6 | moved, closes 68% | none moved |
| 7 | skill `glare_ice` | `skills.glare_ice.baseDamage.cold.0`: 4 → 10 (+1 lines, ×2.5) | dps_dummy: 1.3 → 3.3 | 4 | moved, closes 73% | none moved |
| 8 | skill `trailblaze` | `skills.trailblaze.baseDamage.fire.0`: 6 → 2.8 (+1 lines, ×0.47) | dps_dummy: 65.4 → 31.9 | 31.1 | moved | none moved |
| 9 | support `sundering_flight` | `supports.sundering_flight.fissureTrail.damageScale`: 0.4 → 0.16 | dps_dummy: 50 → 30.5 | 19 | moved, closes 63% | none moved |
| 10 | skill `keening_shriek` | `skills.keening_shriek.baseDamage.physical.0`: 4 → 7.2 (+1 lines, ×1.8) | dps_dummy: 1.9 → 3.5 | 3.6 | moved | none moved |
| 11 | support `volley` | `supports.volley.mods[stat=damage].value`: -0.25 → -0.63 | dps_dummy: 93.1 → 46.5 | 54.1 | moved | none moved |
| 12 | monster_threat `seatless_usher` | `skills.ushers_lull.baseDamage.chaos.0`: 4 → 10 (+1 lines, ×2.5) | dps_in: 0 → 7.7 | 7.4 | moved | none moved |
| 13 | monster_threat `lidless_watcher` | `skills.gaze_beam.baseDamage.chaos.0`: 4 → 9.2 (+1 lines, ×2.3) | dps_in: 0.4 → 7.3 | 7.4 | moved | none moved |
| 14 | monster_threat `discord_siren` | `skills.discord_wail.baseDamage.chaos.0`: 7 → 15 (+1 lines, ×2.2) | dps_in: 0.9 → 7.5 | 7.4 | moved | none moved |
| 15 | skill `zealots_cadence` | `skills.zealots_cadence.baseDamage.physical.0`: 14 → 35 (+1 lines, ×2.5) | dps_dummy: 14.3 → 27.5 | 45.7 | moved, closes 42% | none moved |

<details><summary>Repro commands</summary>

1. `npm run sim -- whatif --knob 'monsters.grave_shambler.explodeOnDeath*0.4' --scenarios skill:shambler_horde:40 --seeds 30 --base-seed 2751677913`. Other dials on this metric (elasticity): cooldown -0.71, useTime -0.36. Same change at other bands: `skill:shambler_horde:5` 257.8→103.1, `skill:shambler_horde:10` 768.4→307.4, `skill:shambler_horde:20` 3055.9→1222.4
2. `npm run sim -- whatif --knob 'skills.arclight_rain.baseDamage*0.4' --scenarios skill:arclight_rain:40 --seeds 30 --base-seed 2751677913`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.18, useTime 0.17. Same change at other bands: `skill:arclight_rain:5` 153.1→61.2, `skill:arclight_rain:10` 185.8→74.3, `skill:arclight_rain:20` 234.8→93.9
3. `npm run sim -- whatif --knob 'skills.marshlight.baseDamage*0.4' --scenarios skill:marshlight:10 --seeds 30 --base-seed 2751677913`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.66, manaCost -0.04. Same change at other bands: `skill:marshlight:5` 228.3→91.8, `skill:marshlight:20` 318.2→127, `skill:marshlight:40` 454→181.9
4. `npm run sim -- whatif --knob 'skills.mirespume.baseDamage*0.4' --scenarios skill:mirespume:10 --seeds 30 --base-seed 2751677913`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.59. Same change at other bands: `skill:mirespume:5` 215.5→86.2, `skill:mirespume:20` 294.9→118, `skill:mirespume:40` 406→162.4
5. `npm run sim -- whatif --knob 'monsters.bombard_demon.explodeOnDeath*0.42' --scenarios skill:infernal_bombardment:40 --seeds 30 --base-seed 2751677913`. Other dials on this metric (elasticity): cooldown -0.78. Same change at other bands: `skill:infernal_bombardment:5` 240.5→103.7, `skill:infernal_bombardment:10` 684.1→290.1, `skill:infernal_bombardment:20` 2623.9→1108.7
6. `npm run sim -- whatif --knob 'supports.fire_walker.mods*0.4' --scenarios socketed:phoenix_dive:fire_walker:20 --seeds 30 --base-seed 2751677913`
7. `npm run sim -- whatif --knob 'skills.glare_ice.baseDamage*2.5' --scenarios skill:glare_ice:40 --seeds 30 --base-seed 2751677913`. Other dials on this metric (elasticity): cooldown -1.49, baseDamage 1. Same change at other bands: `skill:glare_ice:5` 0.8→1.9, `skill:glare_ice:10` 0.9→2.1, `skill:glare_ice:20` 1→2.5
8. `npm run sim -- whatif --knob 'skills.trailblaze.baseDamage*0.47' --scenarios skill:trailblaze:20 --seeds 30 --base-seed 2751677913`. Other dials on this metric (elasticity): baseDamage 0.99, cooldown -0.73. Same change at other bands: `skill:trailblaze:5` 50.8→25.2, `skill:trailblaze:10` 56.6→27.9, `skill:trailblaze:40` 86.8→41.4
9. `npm run sim -- whatif --knob 'supports.sundering_flight.fissureTrail.damageScale*0.4' --scenarios socketed:ball_lightning:sundering_flight:20 --seeds 30 --base-seed 2751677913`
10. `npm run sim -- whatif --knob 'skills.keening_shriek.baseDamage*1.8' --scenarios skill:keening_shriek:40 --seeds 30 --base-seed 2751677913`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.82. Same change at other bands: `skill:keening_shriek:5` 1.1→2, `skill:keening_shriek:10` 1.3→2.3, `skill:keening_shriek:20` 1.5→2.6
11. `npm run sim -- whatif --knob 'supports.volley.mods[stat=damage].value*2.5' --scenarios socketed:soulflay:volley:20 --seeds 30 --base-seed 2751677913`
12. `npm run sim -- whatif --knob 'skills.ushers_lull.baseDamage*2.5' --scenarios threat:starter_magician_l25:seatless_usher:25 --seeds 30 --base-seed 2751677913`. Other dials on this metric (elasticity): kit.ushers_lull 62.4. Same change at other bands: `threat:starter_magician_l5:seatless_usher:5` 1.9→4.8, `threat:starter_magician_l10:seatless_usher:10` 0.8→5.1, `threat:starter_magician_l20:seatless_usher:20` 0.8→7.5, `threat:starter_magician_l40:seatless_usher:40` 0.2→11.9
13. `npm run sim -- whatif --knob 'skills.gaze_beam.baseDamage*2.3' --scenarios threat:starter_magician_l25:lidless_watcher:25 --seeds 30 --base-seed 2751677913`. Other dials on this metric (elasticity): kit.gaze_beam 12.71, base.moveSpeed 2.83. Same change at other bands: `threat:starter_magician_l5:lidless_watcher:5` 2→4.7, `threat:starter_magician_l10:lidless_watcher:10` 1→4.8, `threat:starter_magician_l20:lidless_watcher:20` 1.2→7.1, `threat:starter_magician_l40:lidless_watcher:40` 0.9→11.3
14. `npm run sim -- whatif --knob 'skills.discord_wail.baseDamage*2.2' --scenarios threat:starter_magician_l25:discord_siren:25 --seeds 30 --base-seed 2751677913`. Other dials on this metric (elasticity): kit.discord_wail 4.55. Same change at other bands: `threat:starter_magician_l5:discord_siren:5` 2.1→4.8, `threat:starter_magician_l10:discord_siren:10` 1.3→4.8, `threat:starter_magician_l20:discord_siren:20` 1.6→7.3, `threat:starter_magician_l40:discord_siren:40` 1.7→11.7
15. `npm run sim -- whatif --knob 'skills.zealots_cadence.baseDamage*2.5' --scenarios skill:zealots_cadence:20 --seeds 30 --base-seed 2751677913`. Other dials on this metric (elasticity): baseDamage 0.61. Same change at other bands: `skill:zealots_cadence:5` 10.8→20.6, `skill:zealots_cadence:10` 12.1→23.1, `skill:zealots_cadence:40` 22.4→42.9

Run from commit `42bf39eeabd2eaf670397d112f2835c15a6c803c`.
</details>

Too noisy to call: class `trapper`, class `assassin`, class `beguiler`, class `hivecaller`, class `firebrand`, class `wallwright`. The solved number moved each by less than its own seed-to-seed spread, so these need a calmer rig or more seeds before they mean anything.

### Combinations that run away

Confirmed on fresh dice at 20 times or more what their parts predict. A number this far out usually means damage feeding itself, so no single number fixes it: each needs a call on whether the feedback should be bounded.

- `class:ranger + unique:winter_after_you + support:maddening_miasma + support:remnants`: measured 1.4e+13 damage per second, its parts predict 5.7. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJyYW5nZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZXZpc2NlcmF0ZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsImxpbWIiOjB9LHsiaWQiOiJzdGF0aWNfc2hvY2siLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJyZW1uYW50cyJdfSx7ImlkIjoid2FyX2NoYW50IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiY3JlZXBpbmdfZnVtZXMiLCJtYWRkZW5pbmdfbWlhc21hIiwicml0YXJkYW5kbyJdLCJsaW1iIjowfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjMzMzYwMzQwOSwidW5pcXVlcyI6eyJiZWx0Ijoid2ludGVyX2FmdGVyX3lvdSIsImJvb3RzIjoid2FuZGVyZXJzX3dha2UifX0:spar --seeds 30 --base-seed 2751677913`</details>
- `class:berserker + unique:cinderstep + primary:orbital_blades + support:unleash`: measured 3.1e+8 damage per second, its parts predict 43400.7. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoib3JiaXRhbF9ibGFkZXMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJmbGVldGZvb3QiXX0seyJpZCI6ImNvbWJ1c3Rpb25fc3RyaWtlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2Vpc21pY19tYXJjaCIsImFjY2VsZXJhdGVkIiwidW5sZWFzaCIsInN0ZWFkeV9uZXJ2ZSJdfSx7ImlkIjoiZmxhbWVfYmxhc3QiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImFjY2VsZXJhbmRvIiwidGhvdWdodGJ1cm4iXX0seyJpZCI6InJlcHVsc29yX2JlYWNvbiIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZmxlZXRmb290IiwicG9seXBob255Il19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjg2OTc4ODUxNywidW5pcXVlcyI6eyJib290cyI6ImNpbmRlcnN0ZXAiLCJnbG92ZXMiOiJnYWxld3JpZ2h0cyJ9fQ:spar --seeds 30 --base-seed 2751677913`</details>
- `class:berserker + primary:devouring_swarm + unique:cinderstep + support:unleash`: measured 8.3e+7 damage per second, its parts predict 111959.9. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZGV2b3VyaW5nX3N3YXJtIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsic2xpcHN0cmVhbSJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiZGVlcF9yZXNlcnZlcyIsInVubGVhc2giLCJzY2F0dGVyZWRfY2FzY2FkZSJdfSx7ImlkIjoiZmxhbWVfYmxhc3QiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImFjY2VsZXJhbmRvIiwiZWZmaWNpZW5jeSJdfSx7ImlkIjoicmVwdWxzb3JfYmVhY29uIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJjYXN0X29uX2JsZWVkIiwicmVtbmFudHMiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjg2OTc4ODUxNywidW5pcXVlcyI6eyJib290cyI6ImNpbmRlcnN0ZXAifX0:spar --seeds 30 --base-seed 2751677913`</details>
- `class:apothecary + unique:cindervigil + support:unleash + support:steady_nerve`: measured 7.7e+7 damage per second, its parts predict 87475. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJhcG90aGVjYXJ5IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6Im1hcmsiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzcGVudGJhbmUiLCJzdG9yZWRfdmVyZGljdCIsImFwb3RoZW9zaXMiLCJzdGVhZHlfbmVydmUiXX0seyJpZCI6ImNvbWJ1c3Rpb25fc3RyaWtlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2Vpc21pY19tYXJjaCIsImFjY2VsZXJhdGVkIiwidW5sZWFzaCJdfSx7ImlkIjoiZmxhbWVfYmxhc3QiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImFjY2VsZXJhbmRvIiwiZWZmaWNpZW5jeSJdfSx7ImlkIjoiYnJpc3RsZWJhY2siLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJsaW1iIjowfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6MTUzNzgwNDgyNywidW5pcXVlcyI6eyJjaGVzdCI6ImR1ZWxpc3RzX2xlZGdlciIsImhlbG1ldCI6ImNpbmRlcnZpZ2lsIn19:spar --seeds 30 --base-seed 2751677913`</details>
- `class:guardian + unique:cinderstep + primary:orbital_blades + support:unleash`: measured 3.5e+7 damage per second, its parts predict 52837.1. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJndWFyZGlhbiIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJvcmJpdGFsX2JsYWRlcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImZsZWV0Zm9vdCJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJhY2NlbGVyYW5kbyIsInRob3VnaHRidXJuIl19LHsiaWQiOiJyZXB1bHNvcl9iZWFjb24iLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImZsZWV0Zm9vdCIsInBvbHlwaG9ueSJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6IndhcmQiLCJnZWFyIjoicmFyZSIsImdzIjo4Njk3ODg1MTcsInVuaXF1ZXMiOnsiYm9vdHMiOiJjaW5kZXJzdGVwIiwiZ2xvdmVzIjoiZ2FsZXdyaWdodHMifX0:spar --seeds 30 --base-seed 2751677913`</details>
- `class:apothecary + unique:cindervigil + primary:frost_wall + support:mana_feeder`: measured 2.9e+7 damage per second, its parts predict 60025.5. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJhcG90aGVjYXJ5IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImZyb3N0X3dhbGwiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxfSx7ImlkIjoiZGV2b3VyaW5nX3N3YXJtIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsibWFuYV9mZWVkZXIiXX0seyJpZCI6ImNvbWJ1c3Rpb25fc3RyaWtlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2Vpc21pY19tYXJjaCIsImFjY2VsZXJhdGVkIiwidW5sZWFzaCIsInNjYXR0ZXJlZF9jYXNjYWRlIl19LHsiaWQiOiJiYXR0bGVfc3RhbmRhcmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJib25kYnJlYWtlciIsInByZXNzdXJlX3NlYWwiXSwibGltYiI6MH1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjMxNDUxMTA5LCJ1bmlxdWVzIjp7ImhlbG1ldCI6ImNpbmRlcnZpZ2lsIiwicmluZzEiOiJzaGFyZWRfY3VwIn19:spar --seeds 30 --base-seed 2751677913`</details>
- `class:magician + unique:cindervigil + support:mana_feeder + support:unleash`: measured 1.5e+7 damage per second, its parts predict 37726.8. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6MjAsInNraWxscyI6W3siaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsic3BlbnRiYW5lIiwic3RvcmVkX3ZlcmRpY3QiLCJyYXZlbmluZyIsInNsb3dfYnJldyJdfSx7ImlkIjoiZGV2b3VyaW5nX3N3YXJtIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsibWFuYV9mZWVkZXIiXX0seyJpZCI6ImNvbWJ1c3Rpb25fc3RyaWtlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2Vpc21pY19tYXJjaCIsImFjY2VsZXJhdGVkIiwidW5sZWFzaCIsInNjYXR0ZXJlZF9jYXNjYWRlIl19LHsiaWQiOiJmbGFtZV9ibGFzdCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicXVpZXRfaGFuZCIsImVmZmljaWVuY3kiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6MzE0NTExMDksInVuaXF1ZXMiOnsiaGVsbWV0IjoiY2luZGVydmlnaWwiLCJyaW5nMSI6InNoYXJlZF9jdXAifX0:spar --seeds 30 --base-seed 2751677913`</details>
- `class:berserker + primary:orbital_blades + support:unleash + support:seismic_march`: measured 8123260.9 damage per second, its parts predict 10950.4. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoib3JiaXRhbF9ibGFkZXMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJmbGVldGZvb3QiXX0seyJpZCI6ImNvbWJ1c3Rpb25fc3RyaWtlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2Vpc21pY19tYXJjaCIsImFjY2VsZXJhdGVkIiwidW5sZWFzaCIsInNjYXR0ZXJlZF9jYXNjYWRlIl19LHsiaWQiOiJmbGFtZV9ibGFzdCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiYWNjZWxlcmFuZG8iLCJ0aG91Z2h0YnVybiJdfSx7ImlkIjoicmVwdWxzb3JfYmVhY29uIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJmbGVldGZvb3QiLCJodW50ZXJzX21vbWVudHVtIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjg2OTc4ODUxNywidW5pcXVlcyI6eyJiZWx0IjoiYmVsbF9vZl90aGVfYnJlYWNoIiwiZ2xvdmVzIjoiZ2FsZXdyaWdodHMifX0:spar --seeds 30 --base-seed 2751677913`</details>
- `class:brawler + unique:cinderstep + support:momentum + unique:gravebloom`: measured 5349698.7 damage per second, its parts predict 13776.9. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJicmF3bGVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImV2aXNjZXJhdGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJncmFzcGluZ190ZW5kcmlscyIsImdpYW50c2JhbmUiLCJhenVyZV9oYXJ2ZXN0Iiwic2VyZW5lX3Bvd2VyIl0sImxpbWIiOjF9LHsiaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYWxhY3JpdHkiLCJwb2x5cGhvbnkiLCJhdXN0ZXJpdHkiLCJhcG90aGVvc2lzIl19LHsiaWQiOiJzaGF0dGVyY2hvcmQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInJlc291bmRpbmdfZWNobyIsImNhc2NhZGUiXSwibGltYiI6MX0seyJpZCI6ImJhbGxfbGlnaHRuaW5nIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsibW9tZW50dW0iXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjkyMjY5ODcwMywidW5pcXVlcyI6eyJib290cyI6ImNpbmRlcnN0ZXAiLCJoZWxtZXQiOiJncmF2ZWJsb29tIn19:spar --seeds 30 --base-seed 2751677913`</details>
- `class:apothecary + unique:cindervigil + support:mana_feeder + support:unleash`: measured 5041121.8 damage per second, its parts predict 12448.5. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJhcG90aGVjYXJ5IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6Im1hcmsiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzcGVudGJhbmUiLCJzdG9yZWRfdmVyZGljdCIsIm1lYXN1cmVkX2JsYWRlIiwic2xvd19icmV3Il19LHsiaWQiOiJkZXZvdXJpbmdfc3dhcm0iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJtYW5hX2ZlZWRlciJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjozMTQ1MTEwOSwidW5pcXVlcyI6eyJoZWxtZXQiOiJjaW5kZXJ2aWdpbCIsInJpbmcxIjoic2hhcmVkX2N1cCJ9fQ:spar --seeds 30 --base-seed 2751677913`</details>

### Flagged for your decision

The numbers an author would reach for did not move these enough. They are not proposals: each needs a call on whether the mechanic is right, and none has been touched.

- class `chronomancer`: The numbers an author would reach for barely move this: skills.stasis_lock.baseDamage ×2.5 closes 6%; classes.chronomancer.attributes ×0.4 closes 2%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- skill `hurricane`: The numbers an author would reach for barely move this: skills.hurricane.baseDamage ×2.5 closes 14%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `necromancer`: The numbers an author would reach for barely move this: skills.poison_nova.baseDamage ×0.4 closes 6%; skills.despair.baseDamage ×1 closes 0%; skills.poison_nova.baseDamage & skills.despair.baseDamage ×0.4 closes 6%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `sharper`: The numbers an author would reach for barely move this: skills.thrown_ace.baseDamage ×1 closes 0%; classes.sharper.attributes ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- support `resounding_echo`: The numbers an author would reach for barely move this: supports.resounding_echo.mods ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_threat `breach_arcling`: The numbers an author would reach for barely move this: monsterDamage.breach_arcling.all ×2.5 closes 9%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `stygian_doll`: The numbers an author would reach for barely move this: monsters.stygian_doll.base.life ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `amalgam_fleshweaver`: The numbers an author would reach for barely move this: monsters.amalgam_fleshweaver.base.life ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.

## Outliers

440 rows sit far from their cohort (log-scale median and MAD, z ≥ 3 and a ratio past 1.8× or 0.55×), 31 of them new tonight. Warned rows and zero rows never enter a cohort.

| | kind | subject | metric | value | cohort median | ratio | z | cohort |
|---|---|---|---|---:|---:|---:|---:|---|
|  | support | `sundering_flight` | output_multiplier | 3 | 1 | 2.9× | 18.2 | supports · effective hosts |
|  | support | `fire_walker` | output_multiplier | 2.8 | 1 | 2.74× | 17.2 | supports · effective hosts |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.05× | -15.1 | L30 · geared · pressure · kill_rate |
|  | support | `scorched_wake` | output_multiplier | 2.4 | 1 | 2.33× | 14.4 | supports · effective hosts |
|  | monster_threat | `seatless_usher` | dps_in | 0 | 17 | 0× | -14.1 | L25 · magician · body |
|  | support | `mounting_frenzy` | output_multiplier | 2.3 | 1 | 2.27× | 14 | supports · effective hosts |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.07× | -13.7 | L20 · geared · pressure · kill_rate |
| 🆕 | interaction | `class:ranger + unique:winter_after_you + support:maddening_miasma + support:remnants` | dps_out | 1438243.5 | 5.7 | 250838.33× | 13.6 | L40 main effects |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.05× | -12.9 | L40 · geared · pressure · kill_rate |
|  | monster_threat | `banshee` | dps_in | 0 | 17 | 0× | -12.8 | L25 · magician · body |
|  | support | `austerity` | output_multiplier | 0.5 | 1 | 0.48× | -12.6 | supports · effective hosts |
|  | support | `resounding_echo` | output_multiplier | 2.1 | 1 | 2.04× | 12.1 | supports · effective hosts |
|  | support | `crescendo` | output_multiplier | 2.1 | 1 | 2.02× | 12 | supports · effective hosts |
|  | support | `septic_bargain` | output_multiplier | 0.5 | 1 | 0.5× | -12 | supports · effective hosts |
|  | class | `chronomancer` | kill_rate | 0 | 0.5 | 0.04× | -11.9 | L10 · geared · pressure · kill_rate |
|  | monster_threat | `formic_gluewright` | dps_in | 0 | 17 | 0× | -11.2 | L25 · magician · body |
|  | support | `volley` | output_multiplier | 2 | 1 | 1.92× | 11.1 | supports · effective hosts |
|  | support | `elemental_conduction` | output_multiplier | 1.9 | 1 | 1.82× | 10.2 | supports · effective hosts |
| 🆕 | interaction | `class:brawler + unique:cinderstep + support:momentum + unique:gravebloom` | dps_out | 1.3e+8 | 13776.9 | 9526.67× | 10 | L40 main effects |
|  | monster_threat | `hadal_lantern` | dps_in | 0.1 | 15.2 | 0× | -10 | L12 · magician · body |
|  | affix | `attr_willpower` | dps_out | 134.4 | 150.5 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `crowd_damage` | dps_out | 274.3 | 312 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `dmg_cold` | dps_out | 141.2 | 159.7 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `duration` | dps_out | 140.6 | 159.7 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `es_pct` | dps_out | 139.5 | 159.7 | 0.06× | -9.1 | L20 · magician · affix output |

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
- crowd_damage: `npm run sim -- run --refs affix:magician:20:gloves:crowd_damage:5352222:spar --seeds 10`
- dmg_cold: `npm run sim -- run --refs affix:magician:20:helmet:dmg_cold:5352222:spar --seeds 10`
- duration: `npm run sim -- run --refs affix:magician:20:helmet:duration:10397677:spar --seeds 10`
- es_pct: `npm run sim -- run --refs affix:magician:20:helmet:es_pct:10397677:spar --seeds 10`

</details>

## Build search

60,459 candidates tonight (13,689 refused by the real gates), 1,503,362 over 23 night(s). The archive holds 1438 elite rows; 1420 were re-measured on this commit. Tried so far in a legal build: 39 of 39 classes, 576 of 576 primarys, 604 of 604 skills, 455 of 455 supports, 41 of 41 uniques.

| band | objective | build (top factors) | value | × band median | repro |
|---|---|---|---:|---:|---|
| L5 | offense | `class:runeweaver` `off:crit` `def:none` `gear:rare` `skill:lure_lantern` | 74766.2 | 2149.2× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoibHVyZV9sYW50ZXJuIiwicmFyaXR5IjoibWFnaWMiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJnaWFudHNiYW5lIl19LHsiaWQiOiJzdG9ybWJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJ0ZW1wZXN0X3JhbmdlIiwiY3V0dGhyb2F0Il19LHsiaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJjcmVzY2VuZG8iLCJib25kYnJlYWtlciIsImFjY2VsZXJhbmRvIiwiYmxvb2RfdG9sbCJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInN0dW5fY2hhbmNlIiwibW91bnRpbmdfZnJlbnp5IiwicGFydGluZ19qdWRnZW1lbnQiLCJzdW5kZXJpbmdfZmxpZ2h0Il19XSwib2ZmIjoiY3JpdCIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjoxNDM3MjI5MDg5LCJ1bmlxdWVzIjp7ImFtdWxldCI6InN0b3JtY2FsbCIsInJpbmcxIjoiZW1iZXJicmFuZCJ9fQ --seeds 8 --base-seed 793788890`</details> |
| L5 | offense | `class:runeweaver` `off:speed` `def:life` `gear:rare` `skill:orb_of_storms` | 69865.6 | 2008.3× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoib3JiX29mX3N0b3JtcyIsInJhcml0eSI6Im1hZ2ljIiwib3ZlciI6Miwic3VwcG9ydHMiOlsiaHVudGVyc19tb21lbnR1bSIsInJlZ2ljaWRlIl19LHsiaWQiOiJzdG9ybWJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJ0ZW1wZXN0X3JhbmdlIiwib3ZlcmZsb3dfcmVzZXJ2b2lyIl19LHsiaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJvdmVybWF0Y2giLCJib25kYnJlYWtlciIsImFjY2VsZXJhbmRvIiwiYmxvb2RfdG9sbCJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImNhc2NhZGVfb2Zfa25pdmVzIiwibW91bnRpbmdfZnJlbnp5IiwicGFydGluZ19qdWRnZW1lbnQiLCJzdW5kZXJpbmdfZmxpZ2h0Il19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJsaWZlIiwiZ2VhciI6InJhcmUiLCJncyI6MTQzNzIyOTA4OSwidW5pcXVlcyI6eyJnbG92ZXMiOiJ0aXRhbnNfZ3Jhc3AiLCJyaW5nMSI6ImVtYmVyYnJhbmQifX0 --seeds 8 --base-seed 793788890`</details> |
| L5 | clear | `class:chronomancer` `off:damage` `def:none` `gear:rare` `skill:broodpod` | 6 | 17.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJicm9vZHBvZCIsInJhcml0eSI6Im1hZ2ljIiwib3ZlciI6Miwic3VwcG9ydHMiOlsibWVhc3VyZWRfYmxhZGUiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjoxNDMwNTA0OTA4LCJ1bmlxdWVzIjp7ImJvb3RzIjoiZmxlZXRmZWF0aGVyIiwiaGVsbWV0IjoiZ3JhdmVibG9vbSJ9fQ --seeds 8 --base-seed 1302628816`</details> |
| L5 | clear | `class:runeweaver` `off:crit` `def:armor` `gear:rare` `skill:lifedrain` | 6 | 17.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoibGlmZWRyYWluIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJ2aWN0b3JzX3RlbXBvIiwiYWNjZWxlcmF0ZWQiXX0seyJpZCI6ImJlY2tvbl9wYWxld2lzcHMiLCJyYXJpdHkiOiJyYXJlIiwib3ZlciI6Miwic3VwcG9ydHMiOlsibW91bnRpbmdfZnJlbnp5Il19LHsiaWQiOiJzaGF0dGVyY2hvcmQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInJlc291bmRpbmdfZWNobyIsImNhc2NhZGUiXSwibGltYiI6MX1dLCJvZmYiOiJjcml0IiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjoxOTgwMDI0NDY5LCJ1bmlxdWVzIjp7ImFtdWxldCI6InN0b3JtY2FsbCIsInJpbmcxIjoiZW1iZXJicmFuZCJ9fQ --seeds 8 --base-seed 793788890`</details> |
| L10 | offense | `class:magician` `off:speed` `def:armor` `gear:rare` `skill:quiet_step` | 125911.6 | 3467.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJxdWlldF9zdGVwIiwicmFyaXR5IjoicmFyZSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImVuZHVyaW5nX3NuYXJlcyJdLCJsaW1iIjowfSx7ImlkIjoiZnJvc3Rfd2FsbCIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJlcGhlbWVyYWwiLCJzdXBwdXJhdGlvbiJdfSx7ImlkIjoiZW1iZXJiaW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZmxlZXRpbmdfZGV2b3Rpb24iLCJ3cmFpdGhfcGFzc2FnZSIsImV4dGVybWluYXRvciJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNsb3dfYnJldyIsInBhcnRpbmdfanVkZ2VtZW50IiwibW91bnRpbmdfZnJlbnp5IiwicmVtbmFudHMiXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6MTgyOTU0NzkyNiwidW5pcXVlcyI6eyJjaGVzdCI6InRoZV91bm1vdmVkIiwicmluZzEiOiJlbWJlcmJyYW5kIn19 --seeds 8 --base-seed 501572828`</details> |
| L10 | offense | `class:magician` `off:speed` `def:armor` `gear:rare` `skill:oblation_of_mana` | 119742.4 | 3297.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJvYmxhdGlvbl9vZl9tYW5hIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbIm1lYXN1cmVkX2Jsb3dzIl19LHsiaWQiOiJvdmVyY2xvY2siLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsiYXRfdGhlX2JyaW5rIiwiYmxvb2RfcGFjdCJdfSx7ImlkIjoiZW1iZXJiaW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZmxlZXRpbmdfZGV2b3Rpb24iLCJ3cmFpdGhfcGFzc2FnZSIsInBvbHlwaG9ueSIsInJhdmVuaW5nIl19LHsiaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2xvd19icmV3IiwicGFydGluZ19qdWRnZW1lbnQiLCJtb3VudGluZ19mcmVuenkiLCJwYXRpZW50X2Z1cnkiXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6MzcxNzA4OTQ0LCJ1bmlxdWVzIjp7ImJlbHQiOiJibG9vZGxldHRlcnNfZ2lyZGxlIiwiYm9vdHMiOiJyaW1ld2FrZSJ9fQ --seeds 8 --base-seed 501572828`</details> |
| L10 | clear | `class:summoner` `off:speed` `def:life` `gear:rare` `skill:detonate_mines` | 6 | 24.7× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzdW1tb25lciIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJlbWJhcmdvIiwic2xvd19tYXRjaCIsImNhc3Rfb25faWduaXRpb24iXX0seyJpZCI6InRyYW5zZnVzaW9uIiwicmFyaXR5IjoicmFyZSJ9LHsiaWQiOiJkb29tX2JlbGwiLCJyYXJpdHkiOiJsZWdlbmRhcnkifSx7ImlkIjoiY2hhaW5fbGlnaHRuaW5nIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbInNob2NrX2NoYW5jZSIsInVubmVydmluZyIsInRldGhlcmVkX29yYml0Il0sImxpbWIiOjF9XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJsaWZlIiwiZ2VhciI6InJhcmUiLCJncyI6MTQ0ODk0NzkxNiwidW5pcXVlcyI6eyJiZWx0Ijoid2ludGVyX2FmdGVyX3lvdSJ9fQ --seeds 8 --base-seed 2348851248`</details> |
| L10 | clear | `class:necromancer` `off:speed` `def:evasion` `gear:rare` `skill:mark` | 6 | 24.7× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJuZWNyb21hbmNlciIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJtYXJrIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbImZsZWV0Zm9vdCJdfSx7ImlkIjoiZG9vbV9iZWxsIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2hhdHRlcmdsYXNzIiwiZmxvd2JyZWFrZXIiLCJ1cHJvb3RlciJdfSx7ImlkIjoic3BvcmVmYWxsIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbImdpYW50c2JhbmUiLCJ1bnN0YWJsZV9jb21wcmVzc2lvbiJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjQ2MzA2NTE2fQ --seeds 8 --base-seed 1284082922`</details> |
| L20 | offense | `class:sentinel` `off:damage` `def:evasion` `gear:rare` `skill:emberbind` | 407261.8 | 6865.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzZW50aW5lbCIsImx2bCI6MjAsInNraWxscyI6W3siaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJmbGVldGluZ19kZXZvdGlvbiIsInNsb3dfYnJldyIsInBvbHlwaG9ueSIsImJsb29kX3RvbGwiXX0seyJpZCI6InJlYXJndWFyZF9hZWdpcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjF9LHsiaWQiOiJzdG9ybWJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJ0ZW1wZXN0X3JhbmdlIiwicGx1c19saWdodG5pbmciXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzcG9vbGluZyIsInNob2NrX2NoYW5jZSIsInBhcnRpbmdfanVkZ2VtZW50IiwiZmxvd2JyZWFrZXIiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6MTY4MTc2MjQzNywidW5pcXVlcyI6eyJib290cyI6InJpbWV3YWtlIiwiaGVsbWV0IjoiY2luZGVydmlnaWwifX0 --seeds 8 --base-seed 3807860157`</details> |
| L20 | offense | `class:runeweaver` `off:speed` `def:evasion` `gear:rare` `skill:flame_arrow` | 294158.7 | 4958.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImZsYW1lX2Fycm93IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiY2FzdF9vbl9wb2lzb24iLCJqaW54aW5nX3RvdWNoIiwibGFtYmVudF9oYXJ2ZXN0Il0sImxpbWIiOjB9LHsiaWQiOiJsaWdodG5pbmdfYmxhc3QiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsiYXp1cmVfaGFydmVzdCIsImRvbWluaW9uX3RpdGhlIiwic3VtbW9uX3BoYW50YXNtIl19LHsiaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzbG93X2JyZXciLCJwb2x5cGhvbnkiLCJibG9vZF9wcmljZSJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImV4cG9zdXJlIiwic2xvd19icmV3IiwicGFydGluZ19qdWRnZW1lbnQiLCJyZW1uYW50cyJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjc5MjM5MTI1NiwidW5pcXVlcyI6eyJhbXVsZXQiOiJzdG9ybWNhbGwiLCJib290cyI6InJpbWV3YWtlIn19 --seeds 8 --base-seed 1561162840`</details> |
| L20 | clear | `class:juggernaut` `off:speed` `def:none` `gear:rare` `skill:doom_bell` | 6 | 29× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJqdWdnZXJuYXV0IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImRvb21fYmVsbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNoYXR0ZXJnbGFzcyJdfSx7ImlkIjoiYmVja29uX3BhbGV3aXNwcyIsInJhcml0eSI6InJhcmUiLCJzdXBwb3J0cyI6WyJtb3VudGluZ19mcmVuenkiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfSx7ImlkIjoiY29uc2VjcmF0aW9uIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsibWFkZGVuaW5nX21pYXNtYSIsImF1c3Rlcml0eSIsImNhc3Rfb25fZGFtYWdlX3Rha2VuIl0sImxpbWIiOjB9XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6MTMwNzQyMDE3OSwidW5pcXVlcyI6eyJhbXVsZXQiOiJyb3VuZGVsYXkifX0 --seeds 8 --base-seed 1900383913`</details> |
| L20 | clear | `class:wallwright` `off:damage` `def:evasion` `gear:rare` `skill:corpse_shift` | 6 | 29× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJ3YWxsd3JpZ2h0IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImNvcnBzZV9zaGlmdCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbImZyYWdtZW50YXRpb24iLCJ3cmFpdGhfcGFzc2FnZSJdfSx7ImlkIjoiYmVja29uX3BhbGV3aXNwcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInByZXNzdXJlX3NlYWwiLCJjbGFtb3IiXX0seyJpZCI6ImRvb21fYmVsbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInN1bW1vbl9waGFudGFzbSJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjoxOTEyMDgzMzk1LCJ1bmlxdWVzIjp7ImJlbHQiOiJibG9vZGxldHRlcnNfZ2lyZGxlIn19 --seeds 8 --base-seed 3176019401`</details> |
| L40 | offense | `class:apothecary` `off:damage` `def:evasion` `gear:rare` `skill:blood_mortgage` | 908788.8 | 12054.1× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJhcG90aGVjYXJ5IiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImJsb29kX21vcnRnYWdlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiaW5zdWxhdGlvbiIsIndhcmRpbmdfZmxlc2giLCJzdG9yZWRfdmVyZGljdCJdLCJsaW1iIjowfSx7ImlkIjoic2hhbWJsZXJfaG9yZGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJwbHVzX21pbmlvbiIsInJhdmVub3VzX3BhY3QiLCJjYXNjYWRpbmdfY2FsbCIsImVwaGVtZXJhbCJdLCJsaW1iIjoxfSx7ImlkIjoiYmVyc2VyayIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImdpYW50c2JhbmUiLCJpbnN1bGF0aW9uIiwiYmxvb2RfcHJpY2UiLCJzZXJlbmVfcG93ZXIiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6NDcxNDczNDczLCJ1bmlxdWVzIjp7ImhlbG1ldCI6ImdyYXZlYmxvb20iLCJyaW5nMSI6ImNvbW1vbl9wdWxzZSJ9fQ --seeds 8 --base-seed 1632953476`</details> |
| L40 | offense | `class:juggernaut` `off:speed` `def:none` `gear:rare` `skill:cast_falcon` | 740635.6 | 9823.7× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJqdWdnZXJuYXV0IiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImNhc3RfZmFsY29uIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsiYm9keWd1YXJkX2RvY3RyaW5lIiwib3Zlcm1hdGNoIiwidGF1dF93aXJlIiwiY3V0dGhyb2F0Il0sImxpbWIiOjB9LHsiaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJjYXN0X29uX2RhbWFnZV90YWtlbiIsImRlZXBfcmVzZXJ2ZXMiXX0seyJpZCI6InN1bW1vbl9ibG9vZF9nb2xlbSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbIm1hcnJvd2JvdW5kX3ZpZ29yIl19LHsiaWQiOiJmYXVsdGJyZWFrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsicnV0aGxlc3MiLCJibG9vZF90b2xsIiwic2VyZW5lX3Bvd2VyIiwiY3Jlc2NlbmRvIl19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6MTY3NTQ0NDA0MywidW5pcXVlcyI6eyJjaGVzdCI6ImhvbGxvd19zb3ZlcmVpZ24iLCJnbG92ZXMiOiJ0aXRhbnNfZ3Jhc3AifX0 --seeds 8 --base-seed 2774995812`</details> |
| L40 | clear | `class:cleric` `off:speed` `def:ward` `gear:rare` `skill:frostbolt` | 6 | 25.1× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjbGVyaWMiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZnJvc3Rib2x0IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZGVlcF9yZXNlcnZlcyIsImNsb3NlX29yZGVyIiwib3Bwb3J0dW5pc3RzX2JsYWRlIiwibWFkZGVyaW5nIl19LHsiaWQiOiJkb29tX2JlbGwiLCJyYXJpdHkiOiJsZWdlbmRhcnkifV0sIm9mZiI6InNwZWVkIiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjE2Mzc4NzExNjYsInVuaXF1ZXMiOnsiYW11bGV0Ijoic3Rvcm1jYWxsIn19 --seeds 8 --base-seed 1263864586`</details> |
| L40 | clear | `class:vanguard` `off:damage` `def:ward` `gear:rare` `skill:mark` | 6 | 25.1× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJ2YW5ndWFyZCIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiYmxvb2RfcHJpY2UiLCJzcGVudGJhbmUiXX0seyJpZCI6Imlnbml0ZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInBsdXNfZmlyZSJdLCJsaW1iIjowfSx7ImlkIjoiZG9vbV9iZWxsIiwicmFyaXR5IjoibGVnZW5kYXJ5In1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJ3YXJkIiwiZ2VhciI6InJhcmUiLCJncyI6MTIwMTA4MjY2NiwidW5pcXVlcyI6eyJhbXVsZXQiOiJyb3VuZGVsYXkiLCJnbG92ZXMiOiJnYWxld3JpZ2h0cyJ9fQ --seeds 8 --base-seed 79031835`</details> |

Playstyles at L5, best build found per style against the band's median style (50 styles): strongest `projectile · lightning` 72189.1 (4.11×), `construct · lightning` 72000.8 (4.1×), `construct · fire` 69602.6 (3.97×), `area · lightning` 66473.7 (3.79×); weakest `mark · cold` 4279.9 (0.24×), `mark · chaos` 4500.4 (0.26×), `detonate · chaos` 7291.7 (0.42×), `detonate · cold` 7331.5 (0.42×).

Playstyles at L10, best build found per style against the band's median style (50 styles): strongest `court · fire` 145226.4 (2.56×), `area · fire` 129142.9 (2.28×), `self · fire` 120383.5 (2.12×), `self · cold` 116056.6 (2.05×); weakest `mark · cold` 11375.7 (0.2×), `detonate · physical` 15193.2 (0.27×), `detonate · cold` 20182.2 (0.36×), `detonate · chaos` 31738.6 (0.56×).

Playstyles at L20, best build found per style against the band's median style (50 styles): strongest `mark · chaos` 795100.6 (4.45×), `mark · fire` 680295.3 (3.81×), `aura · physical` 484504.5 (2.71×), `aura · fire` 396882.2 (2.22×); weakest `mark · cold` 93141.4 (0.52×), `court · cold` 97534.7 (0.55×), `detonate · chaos` 97741.9 (0.55×), `projectile · physical` 114804.8 (0.64×).

Playstyles at L40, best build found per style against the band's median style (50 styles): strongest `aura · fire` 931049.4 (1.83×), `projectile · fire` 919132.4 (1.81×), `court · fire` 907716.7 (1.79×), `target · chaos` 857388.5 (1.69×); weakest `court · cold` 237229.1 (0.47×), `self · cold` 249954 (0.49×), `court · chaos` 262237.3 (0.52×), `projectile · cold` 262618.4 (0.52×).

Main effects at L5 over 6060 rows: strongest `skill:grasping_chasm` 26.29×, `skill:ice_shards` 15.79×, `skill:emberbind` 8.87×, `skill:shambler_horde` 5.7×, `limb:invocation#0` 5.63×; weakest `limb:shadow_step#1` 0.09×, `limb:war_chant#1` 0.12×, `skill:alarm_reek` 0.13×, `skill:beguile` 0.14×, `primary:reclamation` 0.15×.

Main effects at L10 over 9539 rows: strongest `skill:grasping_chasm` 41.43×, `skill:ice_shards` 20.36×, `limb:summon_bone_golem#0` 15.58×, `primary:soulflay` 5.68×, `skill:emberbind` 5.31×; weakest `limb:aegis_ward#0` 0.04×, `limb:decoy#0` 0.05×, `limb:decoy#1` 0.06×, `limb:shadow_step#0` 0.09×, `skill:deathwatch` 0.12×.

Main effects at L20 over 12171 rows: strongest `skill:ice_shards` 25.47×, `primary:aegis_ward` 19.86×, `skill:devouring_swarm` 19.71×, `skill:grasping_chasm` 19.64×, `limb:summon_bone_golem#0` 14.73×; weakest `limb:aegis_ward#0` 0.03×, `limb:war_chant#1` 0.09×, `limb:warp#1` 0.11×, `skill:summon_bone_golem` 0.11×, `primary:volatile_cinders` 0.12×.

Main effects at L40 over 12469 rows: strongest `limb:shambler_horde#1` 130.1×, `skill:ice_shards` 30.34×, `support:splintered_earth` 10.94×, `primary:infernal_bombardment` 8.67×, `limb:rune_of_power#1` 7.74×; weakest `limb:aegis_ward#0` 0.03×, `limb:war_chant#1` 0.08×, `limb:war_chant#0` 0.1×, `limb:expose_weakness#0` 0.1×, `limb:expose_weakness#1` 0.12×.

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
Matrix: 127,530 of 127,530 eligible pairs probed (100%), deep lane on 30180 pairs. Verdicts: effective 78555, blind 30610, inert 14500, cost_only 1428, negligible 2437.
Against the committed ledger (8481 rows): 13409 not on file, 1992 measuring healthy. The ledger only changes through `matrix check --reconcile`.

## What ran, and what did not

| lane | units planned | ok | gate breach | crashed/killed | out of time or not run | episodes | core-hours |
|---|---:|---:|---:|---:|---:|---:|---:|
| baselines | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| audits | 4 | 4 | 0 | 0 | 0 | 0 | 0 |
| expression | 1 | 1 | 0 | 0 | 0 | 1,208 | 0.2 |
| census | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| suites | 1 | 1 | 0 | 0 | 0 | 910 | 0.3 |
| progression | 39 | 39 | 0 | 0 | 0 | 12,480 | 5.1 |
| skills | 5 | 5 | 0 | 0 | 0 | 8,790 | 1.6 |
| skills_vs | 21 | 21 | 0 | 0 | 0 | 24,192 | 5.4 |
| matchups | 25 | 25 | 0 | 0 | 0 | 13,734 | 6.5 |
| bestiary | 63 | 63 | 0 | 0 | 0 | 78,624 | 16.2 |
| attributes | 39 | 39 | 0 | 0 | 0 | 4,914 | 2.4 |
| affixes | 5 | 5 | 0 | 0 | 0 | 3,472 | 1.4 |
| assists | 8 | 8 | 0 | 0 | 0 | 4,752 | 2.2 |
| socket_play | 1 | 1 | 0 | 0 | 0 | 900 | 0.2 |
| globals | 4 | 4 | 0 | 0 | 0 | 1,704 | 0.4 |
| matrix | 200 | 200 | 0 | 0 | 0 | 235,854 | 57.2 |
| matrix_deep | 75 | 75 | 0 | 0 | 0 | 135,316 | 34.7 |
| search | 40 | 40 | 0 | 0 | 0 | 97,800 | 21.3 |
| archive_confirm | 38 | 38 | 0 | 0 | 0 | 22,720 | 8.3 |
| proposals | 48 | 48 | 0 | 0 | 0 | 13,688 | 3.1 |

Every planned unit ran.

Not simulated at all, by design: zone generation and XP pacing, event pressure, multiplayer, and real player skill. Pilots are simple policies, so kit ceilings are floors. Bands stay provisional until you sign them off.
