# Balance farm, night of 2026-11-11

Commit [39884a8450](https://github.com/arianna-arpg/arpg-game-world/commit/39884a8450a7527511cfb4d5098bed1fd1a50671), profile `full`. 644,622 episodes, 149.1 core-hours, 301 minutes end to end. [Run](https://github.com/arianna-arpg/arpg-game-world/actions/runs/43016122370).

## ✅ No regressions

Every committed baseline holds, nothing crashed, and the matrix has no new defects since last night.

## What moved since last night

No row moved past its own noise and 10%.

## Top proposed numbers

Advisory. Nothing here has been applied, and each needs your sign-off. Each row re-measured the subject on dice the night had not seen, solved for a number through the real game, and verified it at common seeds. 31 outlier(s) did not hold up on fresh dice, or landed within 15% of their target, and were dropped.

| # | subject | change | metric: before → after | cohort target | verdict | guards |
|---:|---|---|---|---:|---|---|
| 1 | class `trapper` | `skills.caltrops.baseDamage.physical.0`: 3 → 6.9 (+1 lines, ×2.3) | kill_rate: 0 → 0.1 | 0.1 | moved | none moved |
| 2 | skill `shambler_horde` | `monsters.grave_shambler.explodeOnDeath`: 2.2 → 0.88 | dps_dummy: 19394.7 → 7757.9 | 680.5 | moved, closes 62% | none moved |
| 3 | skill `arclight_rain` | `skills.arclight_rain.baseDamage.physical.0`: 5 → 2 (+3 lines, ×0.4) | dps_dummy: 347.6 → 139 | 93.2 | moved, closes 82% | none moved |
| 4 | skill `marshlight` | `skills.marshlight.baseDamage.chaos.0`: 9 → 3.6 (+1 lines, ×0.4) | dps_dummy: 266.4 → 106.6 | 98.9 | moved | none moved |
| 5 | skill `mirespume` | `skills.mirespume.baseDamage.chaos.0`: 11 → 4.5 (+1 lines, ×0.41) | dps_dummy: 242.9 → 99.6 | 98.9 | moved | none moved |
| 6 | support `fire_walker` | `supports.fire_walker.mods.0.value`: 0.5 → 0.2 (+1 lines, ×0.4) | dps_dummy: 60.2 → 30.3 | 17.1 | moved, closes 69% | none moved |
| 7 | skill `infernal_bombardment` | `monsters.bombard_demon.explodeOnDeath`: 1.6 → 0.67 | dps_dummy: 15897.2 → 6696.3 | 6676.7 | moved | none moved |
| 8 | skill `glare_ice` | `skills.glare_ice.baseDamage.cold.0`: 4 → 10 (+1 lines, ×2.5) | dps_dummy: 1.3 → 3.3 | 4 | moved, closes 73% | none moved |
| 9 | skill `trailblaze` | `skills.trailblaze.baseDamage.fire.0`: 6 → 2.8 (+1 lines, ×0.46) | dps_dummy: 65.6 → 31.2 | 31.1 | moved | none moved |
| 10 | skill `keening_shriek` | `skills.keening_shriek.baseDamage.physical.0`: 4 → 7.6 (+1 lines, ×1.9) | dps_dummy: 2 → 3.7 | 3.6 | moved | none moved |
| 11 | support `sundering_flight` | `supports.sundering_flight.fissureTrail.damageScale`: 0.4 → 0.16 | dps_dummy: 49.9 → 30.6 | 19.3 | moved, closes 63% | none moved |
| 12 | support `volley` | `supports.volley.mods[stat=damage].value`: -0.25 → -0.63 | dps_dummy: 92.7 → 46.4 | 54.2 | moved | none moved |
| 13 | monster_threat `lidless_watcher` | `skills.gaze_beam.baseDamage.chaos.0`: 4 → 9.6 (+1 lines, ×2.4) | dps_in: 0.3 → 7.9 | 7.5 | moved | none moved |
| 14 | monster_threat `seatless_usher` | `skills.ushers_lull.baseDamage.chaos.0`: 4 → 10 (+1 lines, ×2.5) | dps_in: 0 → 7.6 | 7.5 | moved | none moved |
| 15 | monster_threat `discord_siren` | `skills.discord_wail.baseDamage.chaos.0`: 7 → 16 (+1 lines, ×2.3) | dps_in: 0.8 → 7.7 | 7.5 | moved | none moved |

<details><summary>Repro commands</summary>

1. `npm run sim -- whatif --knob 'skills.caltrops.baseDamage*2.3' --scenarios pressure:trapper:30 --seeds 30 --base-seed 148162834`. Same change at other bands: `pressure:trapper:5` 0.5→0.7, `pressure:trapper:10` 0.2→0.5, `pressure:trapper:20` 0.1→0.2, `pressure:trapper:40` 0→0
2. `npm run sim -- whatif --knob 'monsters.grave_shambler.explodeOnDeath*0.4' --scenarios skill:shambler_horde:40 --seeds 30 --base-seed 148162834`. Other dials on this metric (elasticity): cooldown -0.71, useTime -0.36. Same change at other bands: `skill:shambler_horde:5` 257.8→103.1, `skill:shambler_horde:10` 768.4→307.4, `skill:shambler_horde:20` 3055.9→1222.4
3. `npm run sim -- whatif --knob 'skills.arclight_rain.baseDamage*0.4' --scenarios skill:arclight_rain:40 --seeds 30 --base-seed 148162834`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.21, useTime 0.16. Same change at other bands: `skill:arclight_rain:5` 151.9→60.8, `skill:arclight_rain:10` 184.3→73.7, `skill:arclight_rain:20` 232.8→93.1
4. `npm run sim -- whatif --knob 'skills.marshlight.baseDamage*0.4' --scenarios skill:marshlight:10 --seeds 30 --base-seed 148162834`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.64, manaCost -0.03. Same change at other bands: `skill:marshlight:5` 232.8→93.2, `skill:marshlight:20` 320.1→128.1, `skill:marshlight:40` 450.2→180.1
5. `npm run sim -- whatif --knob 'skills.mirespume.baseDamage*0.41' --scenarios skill:mirespume:10 --seeds 30 --base-seed 148162834`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.55. Same change at other bands: `skill:mirespume:5` 208.9→85.5, `skill:mirespume:20` 285.8→117.2, `skill:mirespume:40` 393.5→161.3
6. `npm run sim -- whatif --knob 'supports.fire_walker.mods*0.4' --scenarios socketed:phoenix_dive:fire_walker:20 --seeds 30 --base-seed 148162834`
7. `npm run sim -- whatif --knob 'monsters.bombard_demon.explodeOnDeath*0.42' --scenarios skill:infernal_bombardment:40 --seeds 30 --base-seed 148162834`. Other dials on this metric (elasticity): cooldown -0.83. Same change at other bands: `skill:infernal_bombardment:5` 239.5→102.7, `skill:infernal_bombardment:10` 684.5→290.4, `skill:infernal_bombardment:20` 2623.7→1108.5
8. `npm run sim -- whatif --knob 'skills.glare_ice.baseDamage*2.5' --scenarios skill:glare_ice:40 --seeds 30 --base-seed 148162834`. Other dials on this metric (elasticity): cooldown -1.25, baseDamage 1.01. Same change at other bands: `skill:glare_ice:5` 0.7→1.8, `skill:glare_ice:10` 0.8→2.1, `skill:glare_ice:20` 1→2.4
9. `npm run sim -- whatif --knob 'skills.trailblaze.baseDamage*0.46' --scenarios skill:trailblaze:20 --seeds 30 --base-seed 148162834`. Other dials on this metric (elasticity): baseDamage 0.98, cooldown -0.77. Same change at other bands: `skill:trailblaze:5` 50.9→24.7, `skill:trailblaze:10` 56.7→27.3, `skill:trailblaze:40` 86.6→40.4
10. `npm run sim -- whatif --knob 'skills.keening_shriek.baseDamage*1.9' --scenarios skill:keening_shriek:40 --seeds 30 --base-seed 148162834`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.85. Same change at other bands: `skill:keening_shriek:5` 1.1→2.1, `skill:keening_shriek:10` 1.3→2.4, `skill:keening_shriek:20` 1.5→2.8
11. `npm run sim -- whatif --knob 'supports.sundering_flight.fissureTrail.damageScale*0.4' --scenarios socketed:ball_lightning:sundering_flight:20 --seeds 30 --base-seed 148162834`
12. `npm run sim -- whatif --knob 'supports.volley.mods[stat=damage].value*2.5' --scenarios socketed:soulflay:volley:20 --seeds 30 --base-seed 148162834`
13. `npm run sim -- whatif --knob 'skills.gaze_beam.baseDamage*2.4' --scenarios threat:starter_magician_l25:lidless_watcher:25 --seeds 30 --base-seed 148162834`. Other dials on this metric (elasticity): kit.gaze_beam 14.07. Same change at other bands: `threat:starter_magician_l5:lidless_watcher:5` 2→4.8, `threat:starter_magician_l10:lidless_watcher:10` 1→4.9, `threat:starter_magician_l20:lidless_watcher:20` 1.1→7.4, `threat:starter_magician_l40:lidless_watcher:40` 0.8→11.8
14. `npm run sim -- whatif --knob 'skills.ushers_lull.baseDamage*2.5' --scenarios threat:starter_magician_l25:seatless_usher:25 --seeds 30 --base-seed 148162834`. Other dials on this metric (elasticity): kit.ushers_lull 17.98. Same change at other bands: `threat:starter_magician_l5:seatless_usher:5` 2→5.1, `threat:starter_magician_l10:seatless_usher:10` 0.7→4.9, `threat:starter_magician_l20:seatless_usher:20` 0.7→7.2, `threat:starter_magician_l40:seatless_usher:40` 0.3→11.6
15. `npm run sim -- whatif --knob 'skills.discord_wail.baseDamage*2.3' --scenarios threat:starter_magician_l25:discord_siren:25 --seeds 30 --base-seed 148162834`. Other dials on this metric (elasticity): kit.discord_wail 5.77. Same change at other bands: `threat:starter_magician_l5:discord_siren:5` 2→4.5, `threat:starter_magician_l10:discord_siren:10` 1→4.6, `threat:starter_magician_l20:discord_siren:20` 1.2→6.8, `threat:starter_magician_l40:discord_siren:40` 1.1→10.7

Run from commit `39884a8450a7527511cfb4d5098bed1fd1a50671`.
</details>

Too noisy to call: class `hivecaller`, class `firebrand`, class `sharper`, monster_threat `strangler_maw`. The solved number moved each by less than its own seed-to-seed spread, so these need a calmer rig or more seeds before they mean anything.

### Combinations that run away

Confirmed on fresh dice at 20 times or more what their parts predict. A number this far out usually means damage feeding itself, so no single number fixes it: each needs a call on whether the feedback should be bounded.

- `class:pyromancer + support:crescendo + support:scattered_cascade + support:seismic_march`: measured 3.8e+9 damage per second, its parts predict 460.1. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJweXJvbWFuY2VyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImZyb3N0Ym9sdCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImNhc3Rfb25fYmxlZWQiLCJhcmNpbmciLCJpZ25pdGVfY2hhbmNlIl19LHsiaWQiOiJjb21idXN0aW9uX3N0cmlrZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNlaXNtaWNfbWFyY2giLCJjcmVzY2VuZG8iLCJzZWFyaW5nX2hlYXQiLCJzY2F0dGVyZWRfY2FzY2FkZSJdfSx7ImlkIjoic2N5dGhlX2FyYyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInVtYnJhbF9wb3dlciJdfSx7ImlkIjoiaW5mZXJuYWxfcmlmdCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImZpbmFsX2Jsb29tIiwiY3JlZXBpbmdfZnVtZXMiXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjE3OTM5Mzk5MTcsInVuaXF1ZXMiOnsiYW11bGV0IjoibW91cm5pbmdfYmVsbCJ9fQ:spar --seeds 30 --base-seed 148162834`</details>
- `class:berserker + unique:cinder_conductor + primary:grit_stance + support:scattered_cascade`: measured 1.4e+7 damage per second, its parts predict 9235.7. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZ3JpdF9zdGFuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiLCJvdmVybWF0Y2giLCJvc3RpbmF0byIsInRyYW5zaWVudF9pbmZlcm5vIl19LHsiaWQiOiJjb21idXN0aW9uX3N0cmlrZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNlaXNtaWNfbWFyY2giLCJhY2NlbGVyYXRlZCIsInVubGVhc2giLCJzY2F0dGVyZWRfY2FzY2FkZSJdfSx7ImlkIjoiZmxhbWVfYmxhc3QiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInByZWNpc2lvbiIsImVmZmljaWVuY3kiXX0seyJpZCI6InJlcHVsc29yX2JlYWNvbiIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZmxlZXRmb290Il19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjo4Njk3ODg1MTcsInVuaXF1ZXMiOnsiYW11bGV0IjoiY2luZGVyX2NvbmR1Y3RvciIsImdsb3ZlcyI6ImdhbGV3cmlnaHRzIn19:spar --seeds 30 --base-seed 148162834`</details>
- `class:berserker + primary:grit_stance + support:scattered_cascade + support:unleash`: measured 6075833 damage per second, its parts predict 2150.8. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZ3JpdF9zdGFuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiLCJvdmVybWF0Y2giLCJvc3RpbmF0byJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJlcGhlbWVyYWwiLCJlZmZpY2llbmN5Il19LHsiaWQiOiJyZXB1bHNvcl9iZWFjb24iLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImZsZWV0Zm9vdCJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjg2OTc4ODUxNywidW5pcXVlcyI6eyJnbG92ZXMiOiJnYWxld3JpZ2h0cyJ9fQ:spar --seeds 30 --base-seed 148162834`</details>
- `class:berserker + primary:grit_stance + unique:cinderstep + support:scattered_cascade`: measured 5738363.4 damage per second, its parts predict 7112.5. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZ3JpdF9zdGFuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiLCJvdmVybWF0Y2giLCJvc3RpbmF0byJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJhY2NlbGVyYW5kbyIsImVmZmljaWVuY3kiXX0seyJpZCI6InJlcHVsc29yX2JlYWNvbiIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZmxlZXRmb290Il19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjo4Njk3ODg1MTcsInVuaXF1ZXMiOnsiYm9vdHMiOiJjaW5kZXJzdGVwIn19:spar --seeds 30 --base-seed 148162834`</details>
- `class:berserker + primary:grit_stance + support:steady_current + support:scattered_cascade`: measured 2252163.7 damage per second, its parts predict 2753.7. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZ3JpdF9zdGFuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiLCJvdmVybWF0Y2giLCJvc3RpbmF0byJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJhY2NlbGVyYW5kbyIsImVmZmljaWVuY3kiXX0seyJpZCI6InJlcHVsc29yX2JlYWNvbiIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZmxlZXRmb290Iiwic3RlYWR5X2N1cnJlbnQiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjg2OTc4ODUxNywidW5pcXVlcyI6eyJjaGVzdCI6ImhvbGxvd19zb3ZlcmVpZ24iLCJnbG92ZXMiOiJnYWxld3JpZ2h0cyJ9fQ:spar --seeds 30 --base-seed 148162834`</details>
- `class:runeweaver + support:desperate_measures + support:maddening_miasma + support:ritardando`: measured 7938.9 damage per second, its parts predict 9.8. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6InNoYW1ibGVyX2hvcmRlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsibWVhc3VyZWRfYmxhZGUiLCJkZXNwZXJhdGVfbWVhc3VyZXMiXSwibGltYiI6MX0seyJpZCI6ImZyb3N0Z3VhcmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkifSx7ImlkIjoid2FyX2NoYW50IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiY3JlZXBpbmdfZnVtZXMiLCJtYWRkZW5pbmdfbWlhc21hIiwicml0YXJkYW5kbyJdLCJsaW1iIjoxfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjc1ODE5NDE1NSwidW5pcXVlcyI6eyJiZWx0IjoiYmVsbF9vZl90aGVfYnJlYWNoIiwiZ2xvdmVzIjoidW5zcGVudF9yZXBseSJ9fQ:spar --seeds 30 --base-seed 148162834`</details>
- `class:necromancer + unique:cinderstep + support:summon_phantasm + support:dive_bomb`: measured 181.7 damage per second, its parts predict 1.7. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJuZWNyb21hbmNlciIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJtYXJrIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbImZsZWV0Zm9vdCIsInVwcm9vdGVyIl19LHsiaWQiOiJoYXltYWtlciIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJtaW5lcmFsX3R1bmluZyIsInN1bW1vbl9waGFudGFzbSIsImNhc3Rfd2hpbGVfZ3VhcmRpbmciXSwibGltYiI6MH0seyJpZCI6IndhcnAiLCJyYXJpdHkiOiJyYXJlIiwib3ZlciI6MSwic3VwcG9ydHMiOlsicHJlc3N1cmVfc2VhbCIsImFjY2VsZXJhdGVkIiwiZGl2ZV9ib21iIl0sImxpbWIiOjF9LHsiaWQiOiJzdXJnZXdpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJyYXZlbmluZyIsInJlZ2ljaWRlIiwidGhvdWdodGJ1cm4iLCJzbG93X21hdGNoIl19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6NDYzMDY1MTYsInVuaXF1ZXMiOnsiYm9vdHMiOiJjaW5kZXJzdGVwIn19:spar --seeds 30 --base-seed 148162834`</details>
- `class:sorcerer + support:summon_phantasm + support:crescendo + support:afterspray`: measured 128.3 damage per second, its parts predict 0.7. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJzb3JjZXJlciIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJsaWdodG5pbmdfYmxhc3QiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsiY3Jlc2NlbmRvIiwic3VtbW9uX3BoYW50YXNtIl19LHsiaWQiOiJ1cGRyYWZ0X2J1cnN0IiwicmFyaXR5IjoicmFyZSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbImVtYmFyZ28iXX0seyJpZCI6ImtpbmRsZV93aWNrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsiZmxlZXRmb290IiwibGluZ2VyaW5nIl19LHsiaWQiOiJzaGFkb3dfc3RlcCIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJtb25vbGl0aCIsImFmdGVyc3ByYXkiXSwibGltYiI6MH1dLCJvZmYiOiJjcml0IiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjE1ODczNjc4MjEsInVuaXF1ZXMiOnsiZ2xvdmVzIjoiZmF1bHRsaW5lX2dyaXBzIiwiaGVsbWV0IjoiZ3JhdmVibG9vbSJ9fQ:spar --seeds 30 --base-seed 148162834`</details>
- `class:cryomancer + support:no_mans_land + support:uprooter + unique:emberbrand`: measured 48.3 damage per second, its parts predict 0.7. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJjcnlvbWFuY2VyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoiYmVja29uX3BhbGV3aXNwcyIsInJhcml0eSI6Im1hZ2ljIiwib3ZlciI6MSwic3VwcG9ydHMiOlsic3BlbnRiYW5lIiwicml0dWFsX2dyb3VuZCJdfSx7ImlkIjoiYWxhcm1fcmVlayIsInJhcml0eSI6Im1hZ2ljIiwib3ZlciI6MSwic3VwcG9ydHMiOlsibm9fbWFuc19sYW5kIiwic2NvdXJpbmdfZ3JpdCJdfSx7ImlkIjoiYmFsbF9saWdodG5pbmciLCJyYXJpdHkiOiJtYWdpYyJ9LHsiaWQiOiJob25leWRld19sdXJlIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJ1cHJvb3RlciJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImFybW9yIiwiZ2VhciI6Im1hZ2ljIiwiZ3MiOjQ2ODAxNzUxMywidW5pcXVlcyI6eyJib290cyI6ImZsZWV0ZmVhdGhlciIsInJpbmcxIjoiZW1iZXJicmFuZCJ9fQ:spar --seeds 30 --base-seed 148162834`</details>

### Flagged for your decision

The numbers an author would reach for did not move these enough. They are not proposals: each needs a call on whether the mechanic is right, and none has been touched.

- class `chronomancer`: The numbers an author would reach for barely move this: skills.stasis_lock.baseDamage ×2.5 closes 9%; classes.chronomancer.attributes ×0.4 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- skill `hurricane`: The numbers an author would reach for barely move this: skills.hurricane.baseDamage ×2.5 closes 14%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `wallwright`: The numbers an author would reach for barely move this: skills.stone_rampart.baseDamage ×1 closes 0%; skills.toppling_stroke.baseDamage ×2.5 closes 17%; skills.shield_charge.baseDamage ×2.5 closes 2%; skills.stone_rampart.baseDamage & skills.toppling_stroke.baseDamage & skills.shield_charge.baseDamage ×2.5 closes 19%; classes.wallwright.attributes ×2.5 closes 8%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `necromancer`: The numbers an author would reach for barely move this: skills.poison_nova.baseDamage ×0.4 closes 4%; skills.despair.baseDamage ×1 closes 0%; skills.poison_nova.baseDamage & skills.despair.baseDamage ×0.4 closes 4%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- support `septic_bargain`: The numbers an author would reach for barely move this: supports.septic_bargain.mods ×2.5 closes 14%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `beguiler`: The numbers an author would reach for barely move this: skills.beguile.baseDamage ×1 closes 0%; classes.beguiler.attributes ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- support `resounding_echo`: The numbers an author would reach for barely move this: supports.resounding_echo.mods ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_threat `gloam`: The numbers an author would reach for barely move this: monsterDamage.gloam.all ×2.5 closes 20%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_threat `breach_arcling`: The numbers an author would reach for barely move this: monsterDamage.breach_arcling.all ×2.5 closes 13%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `amalgam_fleshweaver`: The numbers an author would reach for barely move this: monsters.amalgam_fleshweaver.base.life ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.

## Outliers

449 rows sit far from their cohort (log-scale median and MAD, z ≥ 3 and a ratio past 1.8× or 0.55×), 33 of them new tonight. Warned rows and zero rows never enter a cohort.

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
| 🆕 | interaction | `class:magician + support:parting_judgement + primary:grenado + support:arcing` | dps_out | 10.8 | 24017 | 0× | -12 | L10 main effects |
|  | support | `crescendo` | output_multiplier | 2.1 | 1 | 2.02× | 12 | supports · effective hosts |
|  | support | `septic_bargain` | output_multiplier | 0.5 | 1 | 0.5× | -12 | supports · effective hosts |
|  | class | `chronomancer` | kill_rate | 0 | 0.5 | 0.04× | -11.9 | L10 · geared · pressure · kill_rate |
|  | support | `volley` | output_multiplier | 2 | 1 | 1.92× | 11.1 | supports · effective hosts |
| 🆕 | interaction | `class:berserker + primary:grit_stance + support:scattered_cascade + support:unleash` | dps_out | 3.2e+7 | 2150.8 | 14672.1× | 10.9 | L40 main effects |
| 🆕 | interaction | `class:pyromancer + support:crescendo + support:scattered_cascade + support:seismic_march` | dps_out | 5548818 | 460.1 | 12059.18× | 10.6 | L40 main effects |
|  | support | `elemental_conduction` | output_multiplier | 1.9 | 1 | 1.82× | 10.2 | supports · effective hosts |
| 🆕 | interaction | `class:berserker + primary:grit_stance + unique:cinderstep + support:scattered_cascade` | dps_out | 4.1e+7 | 7112.5 | 5735.18× | 9.8 | L40 main effects |
| 🆕 | interaction | `class:berserker + primary:grit_stance + unique:cinderstep + support:scattered_cascade` | dps_out | 3.1e+7 | 6408.9 | 4802.87× | 9.6 | L40 main effects |
| 🆕 | interaction | `class:berserker + primary:grit_stance + support:steady_current + support:scattered_cascade` | dps_out | 1.1e+7 | 2753.7 | 3892.9× | 9.4 | L40 main effects |
|  | monster_threat | `hadal_lantern` | dps_in | 0.1 | 14.9 | 0× | -9.3 | L12 · magician · body |
|  | affix | `attr_willpower` | dps_out | 134.4 | 150.5 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `dmg_cold` | dps_out | 141.2 | 159.7 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `duration` | dps_out | 140.6 | 159.7 | 0.06× | -9.1 | L20 · magician · affix output |

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

</details>

## Build search

91,304 candidates tonight (20,712 refused by the real gates), 865,632 over 13 night(s). The archive holds 1427 elite rows; 1401 were re-measured on this commit. Tried so far in a legal build: 39 of 39 classes, 576 of 576 primarys, 604 of 604 skills, 455 of 455 supports, 41 of 41 uniques.

| band | objective | build (top factors) | value | × band median | repro |
|---|---|---|---:|---:|---|
| L5 | offense | `class:runeweaver` `off:crit` `def:ward` `gear:rare` `skill:void_hook` | 33822 | 916.7× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoidm9pZF9ob29rIiwicmFyaXR5IjoibWFnaWMifSx7ImlkIjoic3Rvcm1iaW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsidGVtcGVzdF9yYW5nZSJdfSx7ImlkIjoiZW1iZXJiaW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZmxlZXRpbmdfZGV2b3Rpb24iLCJzbG93X2JyZXciLCJhY2NlbGVyYW5kbyIsImJsb29kX3RvbGwiXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJhcmNpbmciLCJzbG93X2JyZXciLCJwYXJ0aW5nX2p1ZGdlbWVudCIsInNwbGl0dGluZyJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJ3YXJkIiwiZ2VhciI6InJhcmUiLCJncyI6NDg1MjY5NTgsInVuaXF1ZXMiOnsiYW11bGV0Ijoic3Rvcm1jYWxsIiwicmluZzEiOiJlbWJlcmJyYW5kIn19 --seeds 8 --base-seed 1579686858`</details> |
| L5 | offense | `class:runeweaver` `off:crit` `def:life` `gear:rare` `skill:orb_of_storms` | 32003 | 867.4× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoib3JiX29mX3N0b3JtcyIsInJhcml0eSI6Im1hZ2ljIiwib3ZlciI6Miwic3VwcG9ydHMiOlsiaHVudGVyc19tb21lbnR1bSIsInJlZ2ljaWRlIl19LHsiaWQiOiJzdG9ybWJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJ0ZW1wZXN0X3JhbmdlIl19LHsiaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJmbGVldGluZ19kZXZvdGlvbiIsImFsYWNyaXR5IiwiYWNjZWxlcmFuZG8iLCJibG9vZF90b2xsIl19LHsiaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiY2FzY2FkZV9vZl9rbml2ZXMiLCJzbG93X2JyZXciLCJwYXJ0aW5nX2p1ZGdlbWVudCIsInN1bmRlcmluZ19mbGlnaHQiXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjE0MzcyMjkwODksInVuaXF1ZXMiOnsiYW11bGV0Ijoic3Rvcm1jYWxsIiwicmluZzEiOiJlbWJlcmJyYW5kIn19 --seeds 8 --base-seed 3489655264`</details> |
| L5 | clear | `class:chronomancer` `off:crit` `def:none` `gear:rare` `skill:oblation_of_mana` | 6 | 16.9× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJvYmxhdGlvbl9vZl9tYW5hIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJhdXN0ZXJpdHkiLCJleHRlcm1pbmF0b3IiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6MTgwODkzMjgxLCJ1bmlxdWVzIjp7ImFtdWxldCI6InN0b3JtY2FsbCIsImNoZXN0IjoiYWVnaXNfb2ZfdGhlX2Ryb3duZWQifX0 --seeds 8 --base-seed 1410976233`</details> |
| L5 | clear | `class:pyromancer` `off:crit` `def:life` `gear:rare` `skill:mark` | 6 | 16.9× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJweXJvbWFuY2VyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoibWFyayIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVnaWNpZGUiLCJjcm93ZF9mYXZvciJdfSx7ImlkIjoic2hhdHRlcmNob3JkIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJyZXNvdW5kaW5nX2VjaG8iLCJjYXNjYWRlIl0sImxpbWIiOjF9XSwib2ZmIjoiY3JpdCIsImRlZiI6ImxpZmUiLCJnZWFyIjoicmFyZSIsImdzIjozNzk1NzA4ODQsInVuaXF1ZXMiOnsiYm9vdHMiOiJmbGVldGZlYXRoZXIiLCJyaW5nMSI6ImVtYmVyYnJhbmQifX0 --seeds 8 --base-seed 4120913256`</details> |
| L10 | offense | `class:magician` `off:speed` `def:life` `gear:rare` `skill:vampiric_presence` | 55646.7 | 1486.7× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJ2YW1waXJpY19wcmVzZW5jZSIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJsaW5nZXJpbmciLCJ0YXV0X3dpcmUiLCJibG9vZF90b2xsIl19LHsiaWQiOiJvdmVyY2xvY2siLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsiYXRfdGhlX2JyaW5rIiwiYmxvb2RfcGFjdCJdfSx7ImlkIjoiZW1iZXJiaW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZmxlZXRpbmdfZGV2b3Rpb24iLCJ3cmFpdGhfcGFzc2FnZSIsInBvbHlwaG9ueSIsInJhdmVuaW5nIl19LHsiaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYXJjaW5nIiwic2xvd19icmV3IiwicGFydGluZ19qdWRnZW1lbnQiLCJtb3VudGluZ19mcmVuenkiXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImxpZmUiLCJnZWFyIjoicmFyZSIsImdzIjozNzE3MDg5NDQsInVuaXF1ZXMiOnsiYmVsdCI6ImJsb29kbGV0dGVyc19naXJkbGUiLCJib290cyI6InJpbWV3YWtlIn19 --seeds 8 --base-seed 743880560`</details> |
| L10 | offense | `class:flagellant` `off:damage` `def:ward` `gear:rare` `skill:sanguine_burst` | 51583.7 | 1378.2× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJmbGFnZWxsYW50IiwibHZsIjoxMCwic2tpbGxzIjpbeyJpZCI6InNhbmd1aW5lX2J1cnN0IiwicmFyaXR5IjoicmFyZSIsImxpbWIiOjB9LHsiaWQiOiJncmFzcGluZ19jaGFzbSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbIm92ZXJjaGFyZ2UiLCJzcGxpbnRlcmVkX2VhcnRoIiwiYWNjZWxlcmFuZG8iLCJkZXNwZXJhdGlvbiJdfSx7ImlkIjoiYmxvd2hvbGUiLCJyYXJpdHkiOiJyYXJlIiwib3ZlciI6MSwic3VwcG9ydHMiOlsic2lja2VuaW5nIiwiY2FzdF9vbl9jcml0Il19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjkzNjUyNDk0MywidW5pcXVlcyI6eyJoZWxtZXQiOiJnbGVhbmVyc19jcm93biIsInJpbmcxIjoiZW1iZXJicmFuZCJ9fQ --seeds 8 --base-seed 2375148012`</details> |
| L10 | clear | `class:cleric` `off:damage` `def:none` `gear:rare` `skill:word_of_doom` | 6 | 21.3× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjbGVyaWMiLCJsdmwiOjEwLCJza2lsbHMiOlt7ImlkIjoid29yZF9vZl9kb29tIiwicmFyaXR5IjoicmFyZSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbIm9zdGluYXRvIl19LHsiaWQiOiJzaGF0dGVyY2hvcmQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInJlc291bmRpbmdfZWNobyIsImNhc2NhZGUiXSwibGltYiI6MX0seyJpZCI6ImNvbG9ubmFkZSIsInJhcml0eSI6InJhcmUiLCJzdXBwb3J0cyI6WyJib2lsaW5nX3BvaW50Il19LHsiaWQiOiJmcm9zdF90cmFwIiwicmFyaXR5IjoicmFyZSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInN0ZWFkeV9uZXJ2ZSIsInNwZW50YmFuZSIsImFjY2VsZXJhdGVkIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjIxMzE4MDQwMjksInVuaXF1ZXMiOnsicmluZzEiOiJzaGFyZWRfY3VwIiwicmluZzIiOiJtaXNlcnNfbG9vcCJ9fQ --seeds 8 --base-seed 1415086449`</details> |
| L10 | clear | `class:sentinel` `off:speed` `def:none` `gear:rare` `skill:beckon_palewisps` | 6 | 21.3× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzZW50aW5lbCIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJiZWNrb25fcGFsZXdpc3BzIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbIm1vdW50aW5nX2ZyZW56eSJdfSx7ImlkIjoic2hhdHRlcmNob3JkIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJyZXNvdW5kaW5nX2VjaG8iLCJjYXNjYWRlIl0sImxpbWIiOjF9LHsiaWQiOiJkb3duYnVyc3QiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsia2luZGxlZF93YWtlIl19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6MTMyOTk4ODM5OSwidW5pcXVlcyI6eyJnbG92ZXMiOiJnYWxld3JpZ2h0cyJ9fQ --seeds 8 --base-seed 1579686858`</details> |
| L20 | offense | `class:runeweaver` `off:speed` `def:evasion` `gear:rare` `skill:battle_standard` | 178259.3 | 2808.2× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImJhdHRsZV9zdGFuZGFyZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsImxpbWIiOjF9LHsiaWQiOiJ1bWJyYWxfbGFuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYXVyZWF0ZV93cml0IiwibG9hZGVkX2RpY2UiXX0seyJpZCI6ImVtYmVyYmluZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInNsb3dfYnJldyIsInBvbHlwaG9ueSIsImJsb29kX3ByaWNlIl19LHsiaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYXJjaW5nIiwic2xvd19icmV3IiwicGFydGluZ19qdWRnZW1lbnQiLCJyZW1uYW50cyJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjc5MjM5MTI1NiwidW5pcXVlcyI6eyJhbXVsZXQiOiJzdG9ybWNhbGwiLCJib290cyI6InJpbWV3YWtlIn19 --seeds 8 --base-seed 1579686858`</details> |
| L20 | offense | `class:juggernaut` `off:damage` `def:none` `gear:rare` `skill:detonate_mines` | 164220.7 | 2587× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJqdWdnZXJuYXV0IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImRldG9uYXRlX21pbmVzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsidXByb290ZXIiXX0seyJpZCI6ImVtYmVyYmluZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImFjY2VsZXJhbmRvIiwic2xvd19icmV3IiwicG9seXBob255IiwiYmxvb2RfdG9sbCJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImNoaWxsX2NoYW5jZSIsInBhcnRpbmdfanVkZ2VtZW50IiwidW5ibGlua2luZyIsInNwb29saW5nIl19LHsiaWQiOiJjb21idXN0aW9uX3N0cmlrZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNlaXNtaWNfbWFyY2giLCJjYXN0X29uX2hpZ2hfcm9sbCIsInNlYXJpbmdfaGVhdCIsInNjYXR0ZXJlZF9jYXNjYWRlIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjEwMDk4NTYyMzUsInVuaXF1ZXMiOnsiYm9vdHMiOiJyaW1ld2FrZSIsImhlbG1ldCI6ImhhbG9fbmludGhfY2hvaXIifX0 --seeds 8 --base-seed 2123386221`</details> |
| L20 | clear | `class:tamer` `off:crit` `def:armor` `gear:rare` `skill:detonate_mines` | 6 | 26× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJ0YW1lciIsImx2bCI6MjAsInNraWxscyI6W3siaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImNhc3Rfb25fYmxlZWQiXX0seyJpZCI6ImZyb3N0X3B1bHNlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsicGllcmNpbmciXX0seyJpZCI6ImRvb21fYmVsbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNoYXR0ZXJnbGFzcyIsImZsb3dicmVha2VyIiwidXByb290ZXIiLCJtZWFzdXJlZF9ibG93cyJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjUzODk1NzY0NSwidW5pcXVlcyI6eyJhbXVsZXQiOiJ0dW5pbmdfZm9yayJ9fQ --seeds 8 --base-seed 1230951378`</details> |
| L20 | clear | `class:brawler` `off:crit` `def:none` `gear:rare` `skill:hell_rift` | 6 | 26× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJicmF3bGVyIiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImhlbGxfcmlmdCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImNsYW1vciIsInB1bHNhdGluZ19taXNzaWxlcyJdfSx7ImlkIjoiZG9vbV9iZWxsIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsicGhhbnRhc21hbF9lY2hvIl19LHsiaWQiOiJzY3l0aGVfYXJjIiwicmFyaXR5IjoibGVnZW5kYXJ5In1dLCJvZmYiOiJjcml0IiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjEyMjk2ODkzMzF9 --seeds 8 --base-seed 881302376`</details> |
| L40 | offense | `class:sentinel` `off:damage` `def:evasion` `gear:rare` `skill:soporific_veil` | 643502.4 | 6913.3× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzZW50aW5lbCIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJzb3BvcmlmaWNfdmVpbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImFjY2VsZXJhdGVkIiwic3F1YXJlX3NpZ2lsIiwic2Vpc21pY19tYXJjaCIsInRhdXRfd2lyZSJdfSx7ImlkIjoic2hhbWJsZXJfaG9yZGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJwbHVzX21pbmlvbiIsInJhdmVub3VzX3BhY3QiLCJjYXNjYWRpbmdfY2FsbCIsImVwaGVtZXJhbCJdLCJsaW1iIjoxfSx7ImlkIjoiaW52aXNpYmlsaXR5IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsicHJlc3N1cmVfc2VhbCJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjo0NzE0NzM0NzMsInVuaXF1ZXMiOnsiaGVsbWV0IjoiZ3JhdmVibG9vbSIsInJpbmcxIjoiY29tbW9uX3B1bHNlIn19 --seeds 8 --base-seed 279791974`</details> |
| L40 | offense | `class:brawler` `off:crit` `def:none` `gear:rare` `skill:eviscerate` | 439233.7 | 4718.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJicmF3bGVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImV2aXNjZXJhdGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJncmFzcGluZ190ZW5kcmlscyIsImdpYW50c2JhbmUiLCJhenVyZV9oYXJ2ZXN0Iiwic2VyZW5lX3Bvd2VyIl0sImxpbWIiOjF9LHsiaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYWxhY3JpdHkiLCJib25kYnJlYWtlciIsImF1c3Rlcml0eSIsImFwb3RoZW9zaXMiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfSx7ImlkIjoiYmFsbF9saWdodG5pbmciLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJtb21lbnR1bSIsInF1YWlsYmFuZSJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6OTIyNjk4NzAzLCJ1bmlxdWVzIjp7ImFtdWxldCI6InJvdW5kZWxheSIsImhlbG1ldCI6ImdyYXZlYmxvb20ifX0 --seeds 8 --base-seed 881302376`</details> |
| L40 | clear | `class:sentinel` `off:crit` `def:none` `gear:rare` `skill:consecration` | 6 | 23.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzZW50aW5lbCIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJjb25zZWNyYXRpb24iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJ0YXV0X3dpcmUiXSwibGltYiI6MH0seyJpZCI6ImRvb21fYmVsbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbInNsaXBzdHJlYW0iXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjEyMzIzNjg2NjYsInVuaXF1ZXMiOnsiY2hlc3QiOiJncm91bmRlZF9sYXR0aWNlIn19 --seeds 8 --base-seed 279791974`</details> |
| L40 | clear | `class:vanguard` `off:speed` `def:evasion` `gear:rare` `skill:mark` | 6 | 23.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJ2YW5ndWFyZCIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiYmxvb2RfcHJpY2UiLCJhZnRlcnNwcmF5Il19LHsiaWQiOiJzaGF0dGVyY2hvcmQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInJlc291bmRpbmdfZWNobyIsImNhc2NhZGUiXSwibGltYiI6MX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjoxMTE4NTExMjY3LCJ1bmlxdWVzIjp7ImNoZXN0IjoiYWVnaXNfb2ZfdGhlX2Ryb3duZWQiLCJnbG92ZXMiOiJnYWxld3JpZ2h0cyJ9fQ --seeds 8 --base-seed 3329439856`</details> |

Playstyles at L5, best build found per style against the band's median style (50 styles): strongest `projectile · fire` 33687.7 (3.61×), `construct · lightning` 33046.7 (3.54×), `construct · fire` 32466 (3.48×), `area · lightning` 29771.6 (3.19×); weakest `detonate · cold` 2026.9 (0.22×), `mark · cold` 2098.4 (0.23×), `court · cold` 2574.1 (0.28×), `target · cold` 4368 (0.47×).

Playstyles at L10, best build found per style against the band's median style (50 styles): strongest `aura · cold` 56917.6 (2.7×), `area · chaos` 51607.6 (2.45×), `self · cold` 49689.3 (2.36×), `projectile · cold` 45959.7 (2.18×); weakest `mark · lightning` 8775.5 (0.42×), `target · physical` 9601.8 (0.46×), `mark · cold` 9959.3 (0.47×), `court · physical` 10133.5 (0.48×).

Playstyles at L20, best build found per style against the band's median style (50 styles): strongest `aura · physical` 484504.5 (4.96×), `melee · physical` 377356.5 (3.86×), `construct · lightning` 179424.6 (1.84×), `detonate · lightning` 164968.1 (1.69×); weakest `mark · cold` 14512.5 (0.15×), `mark · chaos` 21398.7 (0.22×), `construct · physical` 30389.9 (0.31×), `mark · lightning` 46200.9 (0.47×).

Playstyles at L40, best build found per style against the band's median style (50 styles): strongest `aura · fire` 869815.5 (5.32×), `target · chaos` 857388.5 (5.25×), `court · fire` 643238.3 (3.94×), `melee · physical` 507614.2 (3.11×); weakest `detonate · chaos` 43294.9 (0.26×), `court · chaos` 55003.5 (0.34×), `court · cold` 87500.5 (0.54×), `area · physical` 94253.2 (0.58×).

Main effects at L5 over 9174 rows: strongest `skill:grasping_chasm` 27.62×, `primary:reapers_toll` 9.61×, `skill:ice_shards` 9.6×, `skill:emberbind` 7.7×, `primary:soporific_veil` 6.92×; weakest `primary:bone_prison` 0.16×, `skill:loose_marrowgrubs` 0.19×, `skill:soporific_veil` 0.21×, `primary:web_shot` 0.21×, `skill:reapers_toll` 0.21×.

Main effects at L10 over 14190 rows: strongest `skill:grasping_chasm` 18.11×, `limb:mana_flask#2` 15.59×, `skill:ice_shards` 9.94×, `limb:tame_beast#1` 8.8×, `primary:soulflay` 6.99×; weakest `limb:shadow_step#0` 0.03×, `limb:decoy#0` 0.04×, `limb:decoy#1` 0.07×, `skill:mana_flask` 0.1×, `limb:haymaker#0` 0.11×.

Main effects at L20 over 18081 rows: strongest `primary:voltaic_orb` 24.87×, `skill:grasping_chasm` 20.64×, `primary:last_rites` 12.35×, `skill:bonespray` 11.73×, `skill:ice_shards` 11.69×; weakest `primary:toxic_domain` 0.1×, `skill:deathwatch` 0.11×, `limb:war_chant#1` 0.12×, `skill:voltaic_orb` 0.15×, `skill:last_rites` 0.16×.

Main effects at L40 over 18993 rows: strongest `primary:infernal_bombardment` 78.07×, `limb:shambler_horde#1` 24.34×, `skill:ice_shards` 22.97×, `limb:spirit_pyre#1` 12.51×, `skill:serpent_ray` 8.99×; weakest `limb:war_chant#1` 0.09×, `limb:war_chant#0` 0.1×, `skill:summon_swarmlings` 0.11×, `limb:expose_weakness#0` 0.12×, `limb:invisibility#1` 0.13×.

**Other combinations far off the sum of their parts**, confirmed on fresh dice (16 tried):

- `class:hivecaller + support:parting_judgement + primary:storm_pylon + support:arcing`: measured 30.1, its parts predict 3842. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJoaXZlY2FsbGVyIiwibHZsIjoxMCwic2tpbGxzIjpbeyJpZCI6InN0b3JtX3B5bG9uIiwicmFyaXR5IjoicmFyZSJ9LHsiaWQiOiJzdXJnZXdpbmQiLCJyYXJpdHkiOiJyYXJlIn0seyJpZCI6ImVtYmVyYmluZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInNsb3dfYnJldyIsInBvbHlwaG9ueSIsImJsb29kX3RvbGwiXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJhcmNpbmciLCJzbG93X2JyZXciLCJwYXJ0aW5nX2p1ZGdlbWVudCIsInNwb29saW5nIl19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6MTY4MTIzMjM1NywidW5pcXVlcyI6eyJib290cyI6IndhbmRlcmVyc193YWtlIiwiY2hlc3QiOiJ0aGVfdW5tb3ZlZCJ9fQ:spar --seeds 30 --base-seed 148162834`</details>
- `class:chronomancer + support:parting_judgement + support:exposure + unique:stormcall`: measured 212.7, its parts predict 27262.2. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJwaGFudGFzbV9ib2x0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJjYXN0X29uX2RhbWFnZV90YWtlbiIsImZyZWV6ZV9jaGFuY2UiXX0seyJpZCI6ImltcGVyaW91c19iYXJyYWdlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiYm9pbGluZ19wb2ludCIsImJsb29kX3ByaWNlIiwidGV0aGVyZWRfb3JiaXQiLCJicm9vZGNsdXRjaCJdfSx7ImlkIjoiZW1iZXJiaW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZmxlZXRpbmdfZGV2b3Rpb24iLCJzbG93X2JyZXciLCJjcmVzY2VuZG8iLCJibG9vZF90b2xsIl19LHsiaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYXJjaW5nIiwic2xvd19icmV3IiwicGFydGluZ19qdWRnZW1lbnQiLCJleHBvc3VyZSJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjEyMTEyODA4ODUsInVuaXF1ZXMiOnsiYW11bGV0Ijoic3Rvcm1jYWxsIn19:spar --seeds 30 --base-seed 148162834`</details>
- `class:runeweaver + support:parting_judgement + support:sundering_flight + support:splitting`: measured 95.4, its parts predict 26253.3. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoiYXJjYW5lX21pc3NpbGVzIiwicmFyaXR5IjoibWFnaWMifSx7ImlkIjoiZW1iZXJiaW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsiZmxlZXRpbmdfZGV2b3Rpb24iLCJzbG93X2JyZXciLCJhY2NlbGVyYW5kbyIsImJsb29kX3RvbGwiXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzcGxpdHRpbmciLCJzbG93X2JyZXciLCJwYXJ0aW5nX2p1ZGdlbWVudCIsInN1bmRlcmluZ19mbGlnaHQiXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjE2NzM4NDg3MTcsInVuaXF1ZXMiOnsiaGVsbWV0IjoiZ3JhdmVibG9vbSIsInJpbmcxIjoiZW1iZXJicmFuZCJ9fQ:spar --seeds 30 --base-seed 148162834`</details>
- `class:cryomancer + primary:frostguard + unique:stormcall + support:deaths_door`: measured 10.8, its parts predict 84.4. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJjcnlvbWFuY2VyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoiZnJvc3RndWFyZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsid2FyZGluZ19mbGVzaCIsImRlYXRoc19kb29yIl19LHsiaWQiOiJmcm9zdF9zdG9ybSIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsidmFwb3JpemUiLCJzcGlyaXRfdG90ZW0iXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6OTcwMzQyODg3LCJ1bmlxdWVzIjp7ImFtdWxldCI6InN0b3JtY2FsbCIsImJvb3RzIjoiZmxlZXRmZWF0aGVyIn19:spar --seeds 30 --base-seed 148162834`</details>
- `class:runeweaver + support:parting_judgement + support:sundering_flight + primary:flame_core`: measured 1089.6, its parts predict 6665. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoiZmxhbWVfY29yZSIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiYXBvdGhlb3NpcyJdfSx7ImlkIjoiZW1iZXJiaW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsiYmxvb2RfcGFjdCIsImFsYWNyaXR5IiwiYWNjZWxlcmFuZG8iLCJjbGFtb3IiXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJhcmNpbmciLCJzbG93X2JyZXciLCJwYXJ0aW5nX2p1ZGdlbWVudCIsInN1bmRlcmluZ19mbGlnaHQiXX0seyJpZCI6IndpbGR3aXNwIiwicmFyaXR5IjoibWFnaWMiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJjb2xvc3N1c19zdGFuY2UiXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjE0MzcyMjkwODksInVuaXF1ZXMiOnsiYm9vdHMiOiJmbGVldGZlYXRoZXIiLCJyaW5nMSI6ImVtYmVyYnJhbmQifX0:spar --seeds 30 --base-seed 148162834`</details>
- `class:magician + support:parting_judgement + primary:grenado + support:arcing`: measured 15526, its parts predict 24017. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJncmVuYWRvIiwicmFyaXR5IjoicmFyZSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbInNhbmN0YWxfY2F1dGVyeSIsImNhc3Rfd2hpbGVfZ3VhcmRpbmciLCJ1bnRvdWNoZWRfbWlnaHQiXX0seyJpZCI6Im92ZXJjbG9jayIsInJhcml0eSI6InJhcmUiLCJzdXBwb3J0cyI6WyJibG9vZF9wYWN0Il19LHsiaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJmbGVldGluZ19kZXZvdGlvbiIsIndyYWl0aF9wYXNzYWdlIiwicG9seXBob255IiwicmF2ZW5pbmciXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJhcmNpbmciLCJwYXJ0aW5nX2p1ZGdlbWVudCIsIm1vdW50aW5nX2ZyZW56eSJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6MzcxNzA4OTQ0LCJ1bmlxdWVzIjp7ImJvb3RzIjoicmltZXdha2UiLCJnbG92ZXMiOiJnYWxld3JpZ2h0cyJ9fQ:spar --seeds 30 --base-seed 148162834`</details>

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
How the bodies fought: on an idle hero the median first blow lands at 0.98s. In a duel, 21% of casts are melee, a body spends 17% of the fight within its own melee reach, and it uses 2 skills. No body pressed a skill that was refused.
Skills: 2930 rows across the bands; 902 read zero alone and are not ranked (buffs, auras and mines show nothing without a partner), 30 warned.
Suites: 91 scenarios, 17 of 104 graded metrics outside their provisional band, 12 warned.
Matrix: 127,530 of 127,530 eligible pairs probed (100%), deep lane on 23169 pairs. Verdicts: effective 78555, inert 14500, blind 30610, negligible 2437, cost_only 1428.
Against the committed ledger (8481 rows): 12217 not on file, 2010 measuring healthy. The ledger only changes through `matrix check --reconcile`.

## What ran, and what did not

| lane | units planned | ok | gate breach | crashed/killed | out of time or not run | episodes | core-hours |
|---|---:|---:|---:|---:|---:|---:|---:|
| baselines | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| audits | 4 | 4 | 0 | 0 | 0 | 0 | 0 |
| expression | 1 | 1 | 0 | 0 | 0 | 1,208 | 0.1 |
| census | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| suites | 2 | 2 | 0 | 0 | 0 | 910 | 0.4 |
| progression | 39 | 39 | 0 | 0 | 0 | 12,480 | 4.8 |
| skills | 10 | 10 | 0 | 0 | 0 | 8,790 | 1.3 |
| skills_vs | 21 | 21 | 0 | 0 | 0 | 24,192 | 4.9 |
| matchups | 27 | 27 | 0 | 0 | 0 | 13,734 | 6 |
| bestiary | 33 | 33 | 0 | 0 | 0 | 39,312 | 8.2 |
| attributes | 39 | 39 | 0 | 0 | 0 | 4,914 | 2.3 |
| affixes | 6 | 6 | 0 | 0 | 0 | 3,472 | 1.2 |
| assists | 9 | 9 | 0 | 0 | 0 | 4,752 | 2.3 |
| socket_play | 1 | 1 | 0 | 0 | 0 | 900 | 0.1 |
| globals | 4 | 4 | 0 | 0 | 0 | 1,704 | 0.3 |
| matrix | 207 | 207 | 0 | 0 | 0 | 235,854 | 54.2 |
| matrix_deep | 81 | 81 | 0 | 0 | 0 | 105,118 | 24.2 |
| search | 40 | 40 | 0 | 0 | 0 | 151,882 | 30.7 |
| archive_confirm | 38 | 38 | 0 | 0 | 0 | 22,416 | 5.9 |
| proposals | 48 | 48 | 0 | 0 | 0 | 12,984 | 2.3 |

Every planned unit ran.

Not simulated at all, by design: zone generation and XP pacing, event pressure, multiplayer, and real player skill. Pilots are simple policies, so kit ceilings are floors. Bands stay provisional until you sign them off.
