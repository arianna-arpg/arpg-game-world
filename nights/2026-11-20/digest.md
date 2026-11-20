# Balance farm, night of 2026-11-20

Commit [bc7430d76f](https://github.com/arianna-arpg/arpg-game-world/commit/bc7430d76fb5fc4a3d1bfdd669b6ce814cc89838), profile `full`. 690,475 episodes, 145.6 core-hours, 280 minutes end to end. [Run](https://github.com/arianna-arpg/arpg-game-world/actions/runs/44741673050).

## ✅ No regressions

Every committed baseline holds, nothing crashed, and the matrix has no new defects since last night.

## What moved since last night

No row moved past its own noise and 10%.

## Top proposed numbers

Advisory. Nothing here has been applied, and each needs your sign-off. Each row re-measured the subject on dice the night had not seen, solved for a number through the real game, and verified it at common seeds. 28 outlier(s) did not hold up on fresh dice, or landed within 15% of their target, and were dropped.

| # | subject | change | metric: before → after | cohort target | verdict | guards |
|---:|---|---|---|---:|---|---|
| 1 | class `trapper` | `skills.caltrops.baseDamage.physical.0`: 3 → 7.5 (+1 lines, ×2.5) | kill_rate: 0 → 0.1 | 0.1 | moved | none moved |
| 2 | skill `shambler_horde` | `monsters.grave_shambler.explodeOnDeath`: 2.2 → 0.88 | dps_dummy: 19394.7 → 7757.9 | 680.5 | moved, closes 62% | none moved |
| 3 | skill `arclight_rain` | `skills.arclight_rain.baseDamage.physical.0`: 5 → 2 (+3 lines, ×0.4) | dps_dummy: 349 → 139.6 | 93.2 | moved, closes 82% | none moved |
| 4 | skill `marshlight` | `skills.marshlight.baseDamage.chaos.0`: 9 → 3.6 (+1 lines, ×0.4) | dps_dummy: 268.3 → 107.4 | 98.9 | moved | none moved |
| 5 | skill `mirespume` | `skills.mirespume.baseDamage.chaos.0`: 11 → 4.5 (+1 lines, ×0.41) | dps_dummy: 245.1 → 100.5 | 98.9 | moved | none moved |
| 6 | skill `infernal_bombardment` | `monsters.bombard_demon.explodeOnDeath`: 1.6 → 0.67 | dps_dummy: 15918.6 → 6704.9 | 6676.7 | moved | none moved |
| 7 | support `fire_walker` | `supports.fire_walker.mods.0.value`: 0.5 → 0.2 (+1 lines, ×0.4) | dps_dummy: 61.5 → 31.7 | 17.5 | moved, closes 68% | none moved |
| 8 | skill `glare_ice` | `skills.glare_ice.baseDamage.cold.0`: 4 → 10 (+1 lines, ×2.5) | dps_dummy: 1.3 → 3.2 | 4 | moved, closes 70% | none moved |
| 9 | skill `trailblaze` | `skills.trailblaze.baseDamage.fire.0`: 6 → 2.8 (+1 lines, ×0.47) | dps_dummy: 65.6 → 32 | 31.1 | moved | none moved |
| 10 | support `sundering_flight` | `supports.sundering_flight.fissureTrail.damageScale`: 0.4 → 0.16 | dps_dummy: 50 → 30.5 | 19.4 | moved, closes 64% | none moved |
| 11 | skill `keening_shriek` | `skills.keening_shriek.baseDamage.physical.0`: 4 → 7.6 (+1 lines, ×1.9) | dps_dummy: 2 → 3.8 | 3.6 | moved | none moved |
| 12 | support `volley` | `supports.volley.mods[stat=damage].value`: -0.25 → -0.63 | dps_dummy: 93.3 → 46.6 | 55.1 | moved | none moved |
| 13 | monster_threat `discord_siren` | `skills.discord_wail.baseDamage.chaos.0`: 7 → 16 (+1 lines, ×2.3) | dps_in: 0.8 → 7.9 | 7.4 | moved | none moved |
| 14 | monster_threat `lidless_watcher` | `skills.gaze_beam.baseDamage.chaos.0`: 4 → 9.2 (+1 lines, ×2.3) | dps_in: 0.4 → 7.5 | 7.4 | moved | none moved |
| 15 | monster_threat `seatless_usher` | `skills.ushers_lull.baseDamage.chaos.0`: 4 → 10 (+1 lines, ×2.5) | dps_in: 0 → 7.3 | 7.4 | moved | none moved |

<details><summary>Repro commands</summary>

1. `npm run sim -- whatif --knob 'skills.caltrops.baseDamage*2.5' --scenarios pressure:trapper:30 --seeds 30 --base-seed 3593633640`. Same change at other bands: `pressure:trapper:5` 0.5→0.7, `pressure:trapper:10` 0.2→0.6, `pressure:trapper:20` 0→0.2, `pressure:trapper:40` 0→0
2. `npm run sim -- whatif --knob 'monsters.grave_shambler.explodeOnDeath*0.4' --scenarios skill:shambler_horde:40 --seeds 30 --base-seed 3593633640`. Other dials on this metric (elasticity): cooldown -0.71, useTime -0.36. Same change at other bands: `skill:shambler_horde:5` 257.8→103.1, `skill:shambler_horde:10` 768.4→307.4, `skill:shambler_horde:20` 3055.9→1222.4
3. `npm run sim -- whatif --knob 'skills.arclight_rain.baseDamage*0.4' --scenarios skill:arclight_rain:40 --seeds 30 --base-seed 3593633640`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.19, useTime 0.16. Same change at other bands: `skill:arclight_rain:5` 153.1→61.3, `skill:arclight_rain:10` 185.8→74.3, `skill:arclight_rain:20` 234.7→93.9
4. `npm run sim -- whatif --knob 'skills.marshlight.baseDamage*0.4' --scenarios skill:marshlight:10 --seeds 30 --base-seed 3593633640`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.64, manaCost -0.03. Same change at other bands: `skill:marshlight:5` 233.9→93.6, `skill:marshlight:20` 323.7→129.5, `skill:marshlight:40` 456.5→182.6
5. `npm run sim -- whatif --knob 'skills.mirespume.baseDamage*0.41' --scenarios skill:mirespume:10 --seeds 30 --base-seed 3593633640`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.54. Same change at other bands: `skill:mirespume:5` 214.5→88.3, `skill:mirespume:20` 293.4→120.3, `skill:mirespume:40` 404→165.6
6. `npm run sim -- whatif --knob 'monsters.bombard_demon.explodeOnDeath*0.42' --scenarios skill:infernal_bombardment:40 --seeds 30 --base-seed 3593633640`. Other dials on this metric (elasticity): cooldown -0.8. Same change at other bands: `skill:infernal_bombardment:5` 240.7→103.9, `skill:infernal_bombardment:10` 684.9→290.9, `skill:infernal_bombardment:20` 2622.5→1107.3
7. `npm run sim -- whatif --knob 'supports.fire_walker.mods*0.4' --scenarios socketed:phoenix_dive:fire_walker:20 --seeds 30 --base-seed 3593633640`
8. `npm run sim -- whatif --knob 'skills.glare_ice.baseDamage*2.5' --scenarios skill:glare_ice:40 --seeds 30 --base-seed 3593633640`. Other dials on this metric (elasticity): cooldown -1.22, baseDamage 1. Same change at other bands: `skill:glare_ice:5` 0.8→1.9, `skill:glare_ice:10` 0.9→2.1, `skill:glare_ice:20` 1→2.5
9. `npm run sim -- whatif --knob 'skills.trailblaze.baseDamage*0.47' --scenarios skill:trailblaze:20 --seeds 30 --base-seed 3593633640`. Other dials on this metric (elasticity): baseDamage 0.99, cooldown -0.77. Same change at other bands: `skill:trailblaze:5` 50.7→25.2, `skill:trailblaze:10` 56.6→27.9, `skill:trailblaze:40` 86.6→41.4
10. `npm run sim -- whatif --knob 'supports.sundering_flight.fissureTrail.damageScale*0.4' --scenarios socketed:ball_lightning:sundering_flight:20 --seeds 30 --base-seed 3593633640`
11. `npm run sim -- whatif --knob 'skills.keening_shriek.baseDamage*1.9' --scenarios skill:keening_shriek:40 --seeds 30 --base-seed 3593633640`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.87. Same change at other bands: `skill:keening_shriek:5` 1.1→2.1, `skill:keening_shriek:10` 1.3→2.4, `skill:keening_shriek:20` 1.5→2.8
12. `npm run sim -- whatif --knob 'supports.volley.mods[stat=damage].value*2.5' --scenarios socketed:soulflay:volley:20 --seeds 30 --base-seed 3593633640`
13. `npm run sim -- whatif --knob 'skills.discord_wail.baseDamage*2.3' --scenarios threat:starter_magician_l25:discord_siren:25 --seeds 30 --base-seed 3593633640`. Other dials on this metric (elasticity): kit.discord_wail 5.6. Same change at other bands: `threat:starter_magician_l5:discord_siren:5` 2→4.6, `threat:starter_magician_l10:discord_siren:10` 1.1→4.7, `threat:starter_magician_l20:discord_siren:20` 1.3→7, `threat:starter_magician_l40:discord_siren:40` 1.3→11.5
14. `npm run sim -- whatif --knob 'skills.gaze_beam.baseDamage*2.3' --scenarios threat:starter_magician_l25:lidless_watcher:25 --seeds 30 --base-seed 3593633640`. Other dials on this metric (elasticity): kit.gaze_beam 7.71. Same change at other bands: `threat:starter_magician_l5:lidless_watcher:5` 2.1→4.8, `threat:starter_magician_l10:lidless_watcher:10` 1.1→4.8, `threat:starter_magician_l20:lidless_watcher:20` 1.2→7.1, `threat:starter_magician_l40:lidless_watcher:40` 1→11.4
15. `npm run sim -- whatif --knob 'skills.ushers_lull.baseDamage*2.5' --scenarios threat:starter_magician_l25:seatless_usher:25 --seeds 30 --base-seed 3593633640`. Other dials on this metric (elasticity): kit.ushers_lull 66.31. Same change at other bands: `threat:starter_magician_l5:seatless_usher:5` 1.9→4.8, `threat:starter_magician_l10:seatless_usher:10` 0.7→4.9, `threat:starter_magician_l20:seatless_usher:20` 0.7→7.1, `threat:starter_magician_l40:seatless_usher:40` 0.1→11.2

Run from commit `bc7430d76fb5fc4a3d1bfdd669b6ce814cc89838`.
</details>

Too noisy to call: class `firebrand`, class `assassin`, class `hivecaller`, monster_threat `cinder_chorister`. The solved number moved each by less than its own seed-to-seed spread, so these need a calmer rig or more seeds before they mean anything.

### Combinations that run away

Confirmed on fresh dice at 20 times or more what their parts predict. A number this far out usually means damage feeding itself, so no single number fixes it: each needs a call on whether the feedback should be bounded.

- `class:ranger + unique:winter_after_you + unique:hollow_sovereign + support:maddening_miasma`: measured 1.1e+11 damage per second, its parts predict 21.9. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJyYW5nZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZXZpc2NlcmF0ZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsImxpbWIiOjB9LHsiaWQiOiJzdGF0aWNfc2hvY2siLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJyZW1uYW50cyJdfSx7ImlkIjoid2FyX2NoYW50IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiY3JlZXBpbmdfZnVtZXMiLCJtYWRkZW5pbmdfbWlhc21hIiwicml0YXJkYW5kbyJdLCJsaW1iIjowfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjMzMzYwMzQwOSwidW5pcXVlcyI6eyJiZWx0Ijoid2ludGVyX2FmdGVyX3lvdSIsImNoZXN0IjoiaG9sbG93X3NvdmVyZWlnbiJ9fQ:spar --seeds 30 --base-seed 3593633640`</details>
- `class:juggernaut + unique:cinderstep + support:unleash + support:seismic_march`: measured 2.0e+10 damage per second, its parts predict 5576.7. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJqdWdnZXJuYXV0IiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImRldG9uYXRlX21pbmVzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZG9taW5pb25fdGl0aGUiLCJkZWxpYmVyYXRlX3J1aW4iLCJjcm93ZF9mYXZvciIsInNlcmVuZV9wb3dlciJdfSx7ImlkIjoib3JiaXRhbF9ibGFkZXMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJmbGVldGZvb3QiXX0seyJpZCI6ImNvbWJ1c3Rpb25fc3RyaWtlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2Vpc21pY19tYXJjaCIsImFjY2VsZXJhdGVkIiwidW5sZWFzaCIsInNjYXR0ZXJlZF9jYXNjYWRlIl19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJ3YXJkIiwiZ2VhciI6InJhcmUiLCJncyI6NjEwMjI5NzQyLCJ1bmlxdWVzIjp7ImJlbHQiOiJzdGFuZGluZ190b2FzdCIsImJvb3RzIjoiY2luZGVyc3RlcCJ9fQ:spar --seeds 30 --base-seed 3593633640`</details>
- `class:ranger + support:bleed_chance + support:wandering_mark + unique:hollow_sovereign`: measured 2.0e+10 damage per second, its parts predict 50.3. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJyYW5nZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZXZpc2NlcmF0ZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsImxpbWIiOjB9LHsiaWQiOiJzdGF0aWNfc2hvY2siLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJyZW1uYW50cyJdfSx7ImlkIjoid2FyX2NoYW50IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiY3JlZXBpbmdfZnVtZXMiLCJtYWRkZW5pbmdfbWlhc21hIiwicml0YXJkYW5kbyJdLCJsaW1iIjowfSx7ImlkIjoiZXhlY3V0aW9uIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYmxlZWRfY2hhbmNlIiwid2FuZGVyaW5nX21hcmsiXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6IndhcmQiLCJnZWFyIjoicmFyZSIsImdzIjoxNjU0NDQ4MDU5LCJ1bmlxdWVzIjp7ImNoZXN0IjoiaG9sbG93X3NvdmVyZWlnbiJ9fQ:spar --seeds 30 --base-seed 3593633640`</details>
- `class:berserker + primary:devouring_swarm + unique:cinderstep + unique:cindervigil`: measured 1.2e+10 damage per second, its parts predict 662310.1. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZGV2b3VyaW5nX3N3YXJtIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsic2xpcHN0cmVhbSJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJhY2NlbGVyYW5kbyIsImVmZmljaWVuY3kiXX0seyJpZCI6InJlcHVsc29yX2JlYWNvbiIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiY2FzdF9vbl9ibGVlZCJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6IndhcmQiLCJnZWFyIjoicmFyZSIsImdzIjo4Njk3ODg1MTcsInVuaXF1ZXMiOnsiYm9vdHMiOiJjaW5kZXJzdGVwIiwiaGVsbWV0IjoiY2luZGVydmlnaWwifX0:spar --seeds 30 --base-seed 3593633640`</details>
- `class:apothecary + primary:cast_falcon + unique:cindervigil + support:mana_feeder`: measured 5.0e+8 damage per second, its parts predict 73453.8. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJhcG90aGVjYXJ5IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImNhc3RfZmFsY29uIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYnVsd2Fya19zaGFyZHMiXSwibGltYiI6MX0seyJpZCI6ImRldm91cmluZ19zd2FybSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbIm1hbmFfZmVlZGVyIl19LHsiaWQiOiJjb21idXN0aW9uX3N0cmlrZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbInNlaXNtaWNfbWFyY2giLCJhY2NlbGVyYXRlZCIsInVubGVhc2giLCJzY2F0dGVyZWRfY2FzY2FkZSJdfSx7ImlkIjoiZmxhbWVfYmxhc3QiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInF1aWV0X2hhbmQiLCJlZmZpY2llbmN5Il19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjozMTQ1MTEwOSwidW5pcXVlcyI6eyJoZWxtZXQiOiJjaW5kZXJ2aWdpbCIsInJpbmcxIjoic2hhcmVkX2N1cCJ9fQ:spar --seeds 30 --base-seed 3593633640`</details>
- `class:berserker + support:unleash + support:seismic_march + support:scattered_cascade`: measured 1.3e+7 damage per second, its parts predict 1694.2. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZ3JpdF9zdGFuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiLCJvdmVybWF0Y2giLCJvc3RpbmF0byJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJhY2NlbGVyYW5kbyIsImVmZmljaWVuY3kiXX0seyJpZCI6InJlcHVsc29yX2JlYWNvbiIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZmxlZXRmb290Il19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjo4Njk3ODg1MTcsInVuaXF1ZXMiOnsiYW11bGV0IjoibW91cm5pbmdfYmVsbCIsImdsb3ZlcyI6ImdhbGV3cmlnaHRzIn19:spar --seeds 30 --base-seed 3593633640`</details>
- `class:berserker + support:unleash + support:seismic_march + support:accelerated`: measured 6541725.6 damage per second, its parts predict 1902.9. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZG9vbV9jaGFudCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImV4cG9zdXJlIl19LHsiaWQiOiJjb21idXN0aW9uX3N0cmlrZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNlaXNtaWNfbWFyY2giLCJhY2NlbGVyYXRlZCIsInVubGVhc2giLCJ1bm5lcnZpbmciXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJhY2NlbGVyYW5kbyIsImVmZmljaWVuY3kiXX0seyJpZCI6ImdyaXRfc3RhbmNlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsic3RlYWR5X25lcnZlIiwib3Zlcm1hdGNoIiwib3N0aW5hdG8iXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjg2OTc4ODUxN30:spar --seeds 30 --base-seed 3593633640`</details>
- `class:berserker + unique:cinderstep + support:unleash + support:seismic_march`: measured 6502057.2 damage per second, its parts predict 17434.5. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZ3JpdF9zdGFuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiLCJvdmVybWF0Y2giLCJvc3RpbmF0byJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJlbnRyb3BpY19ibG9vbSIsImVmZmljaWVuY3kiXX0seyJpZCI6InJlcHVsc29yX2JlYWNvbiIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZmxlZXRmb290Il19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjo4Njk3ODg1MTcsInVuaXF1ZXMiOnsiYm9vdHMiOiJjaW5kZXJzdGVwIiwiZ2xvdmVzIjoiZ2FsZXdyaWdodHMifX0:spar --seeds 30 --base-seed 3593633640`</details>
- `class:apothecary + unique:cindervigil + support:mana_feeder + support:unleash`: measured 5039963.3 damage per second, its parts predict 17532.4. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJhcG90aGVjYXJ5IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6Im1hcmsiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzcGVudGJhbmUiLCJzdG9yZWRfdmVyZGljdCIsImF1c3Rlcml0eSIsInNsb3dfYnJldyJdfSx7ImlkIjoiZGV2b3VyaW5nX3N3YXJtIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsibWFuYV9mZWVkZXIiXX0seyJpZCI6ImNvbWJ1c3Rpb25fc3RyaWtlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2Vpc21pY19tYXJjaCIsImFjY2VsZXJhdGVkIiwidW5sZWFzaCIsInNjYXR0ZXJlZF9jYXNjYWRlIl19LHsiaWQiOiJmbGFtZV9ibGFzdCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicXVpZXRfaGFuZCIsImVmZmljaWVuY3kiXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6MzE0NTExMDksInVuaXF1ZXMiOnsiaGVsbWV0IjoiY2luZGVydmlnaWwiLCJyaW5nMSI6InNoYXJlZF9jdXAifX0:spar --seeds 30 --base-seed 3593633640`</details>
- `class:summoner + unique:cinderstep + support:afterspray + unique:slowmatch_coil`: measured 231.1 damage per second, its parts predict 1.7. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJzdW1tb25lciIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6InJhcmUifSx7ImlkIjoia2luZGxlX3dpY2siLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJmbGVldGZvb3QiLCJsaW5nZXJpbmciXX0seyJpZCI6InNoYWRvd19zdGVwIiwicmFyaXR5IjoicmFyZSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbIm1vbm9saXRoIiwiYWZ0ZXJzcHJheSJdLCJsaW1iIjowfSx7ImlkIjoiZmxhc2hfZnJlZXplIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Mn1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6MTg1NDk1MjE5MCwidW5pcXVlcyI6eyJib290cyI6ImNpbmRlcnN0ZXAiLCJyaW5nMSI6InNsb3dtYXRjaF9jb2lsIn19:spar --seeds 30 --base-seed 3593633640`</details>

### Flagged for your decision

The numbers an author would reach for did not move these enough. They are not proposals: each needs a call on whether the mechanic is right, and none has been touched.

- class `chronomancer`: The numbers an author would reach for barely move this: skills.stasis_lock.baseDamage ×2.5 closes 6%; classes.chronomancer.attributes ×2.5 closes 1%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- skill `hurricane`: The numbers an author would reach for barely move this: skills.hurricane.baseDamage ×2.5 closes 14%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `necromancer`: The numbers an author would reach for barely move this: skills.poison_nova.baseDamage ×0.4 closes 5%; skills.despair.baseDamage ×1 closes 0%; skills.poison_nova.baseDamage & skills.despair.baseDamage ×0.4 closes 5%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- support `septic_bargain`: The numbers an author would reach for barely move this: supports.septic_bargain.mods ×2.5 closes 18%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `beguiler`: The numbers an author would reach for barely move this: skills.beguile.baseDamage ×1 closes 0%; classes.beguiler.attributes ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- support `resounding_echo`: The numbers an author would reach for barely move this: supports.resounding_echo.mods ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_threat `breach_arcling`: The numbers an author would reach for barely move this: monsterDamage.breach_arcling.all ×2.5 closes 18%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_threat `gloam`: The numbers an author would reach for barely move this: monsterDamage.gloam.all ×2.5 closes 19%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `sharper`: The numbers an author would reach for barely move this: skills.thrown_ace.baseDamage ×1 closes 0%; classes.sharper.attributes ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `stygian_doll`: The numbers an author would reach for barely move this: monsters.stygian_doll.base.life ×2.5 closes 1%. The cause may not be numeric, so this needs your decision rather than a tuning pass.

## Outliers

441 rows sit far from their cohort (log-scale median and MAD, z ≥ 3 and a ratio past 1.8× or 0.55×), 31 of them new tonight. Warned rows and zero rows never enter a cohort.

| | kind | subject | metric | value | cohort median | ratio | z | cohort |
|---|---|---|---|---:|---:|---:|---:|---|
|  | support | `sundering_flight` | output_multiplier | 3 | 1 | 2.9× | 18.2 | supports · effective hosts |
|  | support | `fire_walker` | output_multiplier | 2.8 | 1 | 2.74× | 17.2 | supports · effective hosts |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.05× | -15.1 | L30 · geared · pressure · kill_rate |
|  | support | `scorched_wake` | output_multiplier | 2.4 | 1 | 2.33× | 14.4 | supports · effective hosts |
|  | monster_threat | `seatless_usher` | dps_in | 0 | 17 | 0× | -14.1 | L25 · magician · body |
|  | support | `mounting_frenzy` | output_multiplier | 2.3 | 1 | 2.27× | 14 | supports · effective hosts |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.07× | -13.7 | L20 · geared · pressure · kill_rate |
| 🆕 | interaction | `class:ranger + unique:winter_after_you + unique:hollow_sovereign + support:maddening_miasma` | dps_out | 4215935.9 | 21.9 | 192764.22× | 13.3 | L40 main effects |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.05× | -12.9 | L40 · geared · pressure · kill_rate |
|  | monster_threat | `banshee` | dps_in | 0 | 17 | 0× | -12.8 | L25 · magician · body |
| 🆕 | interaction | `class:berserker + primary:devouring_swarm + unique:cinderstep + unique:cindervigil` | dps_out | 7.4e+10 | 662310.1 | 111603.5× | 12.7 | L40 main effects |
|  | support | `austerity` | output_multiplier | 0.5 | 1 | 0.48× | -12.6 | supports · effective hosts |
|  | support | `resounding_echo` | output_multiplier | 2.1 | 1 | 2.04× | 12.1 | supports · effective hosts |
|  | support | `crescendo` | output_multiplier | 2.1 | 1 | 2.02× | 12 | supports · effective hosts |
|  | support | `septic_bargain` | output_multiplier | 0.5 | 1 | 0.5× | -12 | supports · effective hosts |
|  | class | `chronomancer` | kill_rate | 0 | 0.5 | 0.04× | -11.9 | L10 · geared · pressure · kill_rate |
|  | monster_threat | `formic_gluewright` | dps_in | 0 | 17 | 0× | -11.2 | L25 · magician · body |
|  | support | `volley` | output_multiplier | 2 | 1 | 1.92× | 11.1 | supports · effective hosts |
| 🆕 | interaction | `class:ranger + support:bleed_chance + support:wandering_mark + unique:hollow_sovereign` | dps_out | 993719.9 | 50.3 | 19756.33× | 10.8 | L40 main effects |
|  | support | `elemental_conduction` | output_multiplier | 1.9 | 1 | 1.82× | 10.2 | supports · effective hosts |
|  | monster_threat | `hadal_lantern` | dps_in | 0.1 | 15.2 | 0× | -10 | L12 · magician · body |
| 🆕 | interaction | `class:berserker + support:unleash + support:seismic_march + support:scattered_cascade` | dps_out | 1.4e+7 | 1694.2 | 8239.03× | 9.9 | L40 main effects |
| 🆕 | interaction | `class:berserker + support:unleash + support:seismic_march + support:accelerated` | dps_out | 9473450.7 | 1902.9 | 4978.31× | 9.3 | L40 main effects |
| 🆕 | interaction | `class:berserker + unique:cinderstep + support:unleash + support:seismic_march` | dps_out | 7.0e+7 | 17434.5 | 3999.64× | 9.1 | L40 main effects |
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
- attr_willpower: `npm run sim -- run --refs affix:magician:20:helmet:attr_willpower:10397677:spar --seeds 10`

</details>

## Build search

88,164 candidates tonight (19,980 refused by the real gates), 1,442,903 over 22 night(s). The archive holds 1436 elite rows; 1419 were re-measured on this commit. Tried so far in a legal build: 39 of 39 classes, 576 of 576 primarys, 604 of 604 skills, 455 of 455 supports, 41 of 41 uniques.

| band | objective | build (top factors) | value | × band median | repro |
|---|---|---|---:|---:|---|
| L5 | offense | `class:runeweaver` `off:crit` `def:none` `gear:rare` `skill:lure_lantern` | 70643.4 | 1992.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoibHVyZV9sYW50ZXJuIiwicmFyaXR5IjoibWFnaWMiLCJvdmVyIjoyfSx7ImlkIjoic3Rvcm1iaW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsidGVtcGVzdF9yYW5nZSJdfSx7ImlkIjoiZW1iZXJiaW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiY3Jlc2NlbmRvIiwiYm9uZGJyZWFrZXIiLCJhY2NlbGVyYW5kbyIsImJsb29kX3RvbGwiXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJjYXNjYWRlX29mX2tuaXZlcyIsIm1vdW50aW5nX2ZyZW56eSIsInBhcnRpbmdfanVkZ2VtZW50Iiwic3VuZGVyaW5nX2ZsaWdodCJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6MTQzNzIyOTA4OSwidW5pcXVlcyI6eyJhbXVsZXQiOiJzdG9ybWNhbGwiLCJyaW5nMSI6ImVtYmVyYnJhbmQifX0 --seeds 8 --base-seed 1343294226`</details> |
| L5 | offense | `class:runeweaver` `off:speed` `def:life` `gear:rare` `skill:orb_of_storms` | 70105.3 | 1977.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoib3JiX29mX3N0b3JtcyIsInJhcml0eSI6Im1hZ2ljIiwib3ZlciI6Miwic3VwcG9ydHMiOlsiaHVudGVyc19tb21lbnR1bSIsInJlZ2ljaWRlIl19LHsiaWQiOiJzdG9ybWJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJ0ZW1wZXN0X3JhbmdlIiwib3ZlcmZsb3dfcmVzZXJ2b2lyIl19LHsiaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJvdmVybWF0Y2giLCJib25kYnJlYWtlciIsImFjY2VsZXJhbmRvIiwiYmxvb2RfdG9sbCJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImNhc2NhZGVfb2Zfa25pdmVzIiwibW91bnRpbmdfZnJlbnp5IiwicGFydGluZ19qdWRnZW1lbnQiLCJzdW5kZXJpbmdfZmxpZ2h0Il19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJsaWZlIiwiZ2VhciI6InJhcmUiLCJncyI6MTQzNzIyOTA4OSwidW5pcXVlcyI6eyJnbG92ZXMiOiJ0aXRhbnNfZ3Jhc3AiLCJyaW5nMSI6ImVtYmVyYnJhbmQifX0 --seeds 8 --base-seed 1343294226`</details> |
| L5 | clear | `class:magician` `off:speed` `def:evasion` `gear:rare` `skill:own_sky` | 6 | 17.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6NSwic2tpbGxzIjpbeyJpZCI6Im93bl9za3kiLCJyYXJpdHkiOiJtYWdpYyJ9LHsiaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiYmxvb2RfcHJpY2UiLCJkaXZlX2JvbWIiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwib3ZlciI6Miwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIl0sImxpbWIiOjF9XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6NzQ5MjExODExLCJ1bmlxdWVzIjp7Imdsb3ZlcyI6InRpdGFuc19ncmFzcCJ9fQ --seeds 8 --base-seed 3428737853`</details> |
| L5 | clear | `class:resonator` `off:speed` `def:none` `gear:rare` `skill:verdict` | 6 | 17.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJyZXNvbmF0b3IiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJ2ZXJkaWN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJ2b2lkcmVuZCIsImNhc3Rfb25fZmxhd2xlc3MiXSwibGltYiI6MX0seyJpZCI6ImNvbnNlY3JhdGlvbiIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInRhdXRfd2lyZSIsIndoaXJsaW5nX3NpZ2lsIl0sImxpbWIiOjB9LHsiaWQiOiJkb29tX2JlbGwiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxfSx7ImlkIjoidHJhbnNmaXhpbmdfZ2F6ZSIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZnJlZXplX2NoYW5jZSJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjM3NzkyODUyOSwidW5pcXVlcyI6eyJnbG92ZXMiOiJ0aXRhbnNfZ3Jhc3AiLCJoZWxtZXQiOiJncmF2ZWJsb29tIn19 --seeds 8 --base-seed 2304755587`</details> |
| L10 | offense | `class:magician` `off:speed` `def:armor` `gear:rare` `skill:bloodlet` | 119006.1 | 3275.1× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJibG9vZGxldCIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoxfSx7ImlkIjoiZnJvc3Rfd2FsbCIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJlcGhlbWVyYWwiXX0seyJpZCI6ImVtYmVyYmluZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImZsZWV0aW5nX2Rldm90aW9uIiwid3JhaXRoX3Bhc3NhZ2UiLCJleHRlcm1pbmF0b3IiXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzbG93X2JyZXciLCJwYXJ0aW5nX2p1ZGdlbWVudCIsIm1vdW50aW5nX2ZyZW56eSIsInJlbW5hbnRzIl19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjE4Mjk1NDc5MjYsInVuaXF1ZXMiOnsiY2hlc3QiOiJ0aGVfdW5tb3ZlZCIsInJpbmcxIjoiZW1iZXJicmFuZCJ9fQ --seeds 8 --base-seed 1885002251`</details> |
| L10 | offense | `class:magician` `off:speed` `def:armor` `gear:rare` `skill:oblation_of_mana` | 117869 | 3243.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJvYmxhdGlvbl9vZl9tYW5hIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbIm1lYXN1cmVkX2Jsb3dzIl19LHsiaWQiOiJvdmVyY2xvY2siLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsiYXRfdGhlX2JyaW5rIiwiYmxvb2RfcGFjdCJdfSx7ImlkIjoiZW1iZXJiaW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZmxlZXRpbmdfZGV2b3Rpb24iLCJ3cmFpdGhfcGFzc2FnZSIsInBvbHlwaG9ueSIsInJhdmVuaW5nIl19LHsiaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2xvd19icmV3IiwicGFydGluZ19qdWRnZW1lbnQiLCJtb3VudGluZ19mcmVuenkiLCJwYXRpZW50X2Z1cnkiXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6MzcxNzA4OTQ0LCJ1bmlxdWVzIjp7ImJlbHQiOiJibG9vZGxldHRlcnNfZ2lyZGxlIiwiYm9vdHMiOiJyaW1ld2FrZSJ9fQ --seeds 8 --base-seed 1885002251`</details> |
| L10 | clear | `class:skald` `off:damage` `def:armor` `gear:rare` `skill:geyser_step` | 6 | 22.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJza2FsZCIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJnZXlzZXJfc3RlcCIsInJhcml0eSI6InJhcmUifSx7ImlkIjoiZG9vbV9iZWxsIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsibWVhc3VyZWRfYmxhZGUiXX0seyJpZCI6ImtlZW5pbmdfc2hyaWVrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsic3F1YXJlX3NpZ2lsIiwidGltZV9mdXNlIl19LHsiaWQiOiJmdXJvciIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInBvdGVuY3kiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjEwMzU5ODMwNTd9 --seeds 8 --base-seed 1193219285`</details> |
| L10 | clear | `class:summoner` `off:speed` `def:life` `gear:rare` `skill:detonate_mines` | 6 | 22.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzdW1tb25lciIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJlbWJhcmdvIiwic2xvd19tYXRjaCIsImNhc3Rfb25faWduaXRpb24iXX0seyJpZCI6InRyYW5zZnVzaW9uIiwicmFyaXR5IjoicmFyZSJ9LHsiaWQiOiJkb29tX2JlbGwiLCJyYXJpdHkiOiJsZWdlbmRhcnkifSx7ImlkIjoiY2hhaW5fbGlnaHRuaW5nIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbInNob2NrX2NoYW5jZSIsInVubmVydmluZyIsInRldGhlcmVkX29yYml0Il0sImxpbWIiOjF9XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJsaWZlIiwiZ2VhciI6InJhcmUiLCJncyI6MTQ0ODk0NzkxNiwidW5pcXVlcyI6eyJiZWx0Ijoid2ludGVyX2FmdGVyX3lvdSJ9fQ --seeds 8 --base-seed 3107572281`</details> |
| L20 | offense | `class:apothecary` `off:damage` `def:none` `gear:rare` `skill:mark` | 906971.2 | 14529× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJhcG90aGVjYXJ5IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6Im1hcmsiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzcGVudGJhbmUiLCJzdG9yZWRfdmVyZGljdCIsIm1lYXN1cmVkX2JsYWRlIiwic2xvd19icmV3Il19LHsiaWQiOiJkZXZvdXJpbmdfc3dhcm0iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJtYW5hX2ZlZWRlciJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJxdWlldF9oYW5kIiwiZWZmaWNpZW5jeSJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjozMTQ1MTEwOSwidW5pcXVlcyI6eyJoZWxtZXQiOiJjaW5kZXJ2aWdpbCIsInJpbmcxIjoic2hhcmVkX2N1cCJ9fQ --seeds 8 --base-seed 2448934327`</details> |
| L20 | offense | `class:sentinel` `off:damage` `def:evasion` `gear:rare` `skill:emberbind` | 400694 | 6418.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzZW50aW5lbCIsImx2bCI6MjAsInNraWxscyI6W3siaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJmbGVldGluZ19kZXZvdGlvbiIsInNsb3dfYnJldyIsInBvbHlwaG9ueSIsImJsb29kX3RvbGwiXX0seyJpZCI6InJlYXJndWFyZF9hZWdpcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjF9LHsiaWQiOiJzdG9ybWJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJ0ZW1wZXN0X3JhbmdlIiwicGx1c19saWdodG5pbmciXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzcG9vbGluZyIsInNob2NrX2NoYW5jZSIsInBhcnRpbmdfanVkZ2VtZW50IiwiZmxvd2JyZWFrZXIiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6MTY4MTc2MjQzNywidW5pcXVlcyI6eyJib290cyI6InJpbWV3YWtlIiwiaGVsbWV0IjoiY2luZGVydmlnaWwifX0 --seeds 8 --base-seed 3433897015`</details> |
| L20 | clear | `class:juggernaut` `off:speed` `def:none` `gear:rare` `skill:doom_bell` | 6 | 25.9× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJqdWdnZXJuYXV0IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImRvb21fYmVsbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNoYXR0ZXJnbGFzcyJdfSx7ImlkIjoiYmVja29uX3BhbGV3aXNwcyIsInJhcml0eSI6InJhcmUiLCJzdXBwb3J0cyI6WyJtb3VudGluZ19mcmVuenkiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfSx7ImlkIjoiY29uc2VjcmF0aW9uIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsibWFkZGVuaW5nX21pYXNtYSIsImF1c3Rlcml0eSJdLCJsaW1iIjowfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjEzMDc0MjAxNzl9 --seeds 8 --base-seed 1413290756`</details> |
| L20 | clear | `class:flagellant` `off:speed` `def:evasion` `gear:rare` `skill:living_bomb` | 6 | 25.9× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJmbGFnZWxsYW50IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImxpdmluZ19ib21iIiwicmFyaXR5IjoibGVnZW5kYXJ5In0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwib3ZlciI6MSwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjEyNTk1MjQ4MH0 --seeds 8 --base-seed 966822705`</details> |
| L40 | offense | `class:apothecary` `off:damage` `def:evasion` `gear:rare` `skill:blood_mortgage` | 902374.9 | 12132.4× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJhcG90aGVjYXJ5IiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImJsb29kX21vcnRnYWdlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiaW5zdWxhdGlvbiIsIndhcmRpbmdfZmxlc2giLCJzdG9yZWRfdmVyZGljdCJdLCJsaW1iIjowfSx7ImlkIjoic2hhbWJsZXJfaG9yZGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJwbHVzX21pbmlvbiIsInJhdmVub3VzX3BhY3QiLCJjYXNjYWRpbmdfY2FsbCIsImVwaGVtZXJhbCJdLCJsaW1iIjoxfSx7ImlkIjoiYmVyc2VyayIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImdpYW50c2JhbmUiLCJpbnN1bGF0aW9uIiwiYmxvb2RfcHJpY2UiLCJzZXJlbmVfcG93ZXIiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6NDcxNDczNDczLCJ1bmlxdWVzIjp7ImhlbG1ldCI6ImdyYXZlYmxvb20iLCJyaW5nMSI6ImNvbW1vbl9wdWxzZSJ9fQ --seeds 8 --base-seed 2448934327`</details> |
| L40 | offense | `class:sorcerer` `off:speed` `def:evasion` `gear:rare` `skill:befuddlement` | 690504.5 | 9283.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzb3JjZXJlciIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJiZWZ1ZGRsZW1lbnQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJtZWFzdXJlZF9ibG93cyIsInVubmVydmluZyIsImNoaWxsX2NoYW5jZSIsImJ1bHdhcmtfc2hhcmRzIl19LHsiaWQiOiJzdG9ybWJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJ0ZW1wZXN0X3JhbmdlIiwicGx1c19saWdodG5pbmciXX0seyJpZCI6ImVtYmVyYmluZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbImZsZWV0aW5nX2Rldm90aW9uIiwic2xvd19icmV3IiwicG9seXBob255IiwiYmxvb2RfdG9sbCJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNwb29saW5nIiwic2hvY2tfY2hhbmNlIiwicGFydGluZ19qdWRnZW1lbnQiLCJmbG93YnJlYWtlciJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjIwOTQxMzU1NTIsInVuaXF1ZXMiOnsiYm9vdHMiOiJyaW1ld2FrZSIsImNoZXN0IjoidGhlX3VubW92ZWQifX0 --seeds 8 --base-seed 201053845`</details> |
| L40 | clear | `class:blademaster` `off:damage` `def:evasion` `gear:rare` `skill:mortis_seal` | 6 | 24.3× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJibGFkZW1hc3RlciIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJtb3J0aXNfc2VhbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbIndhcmRpbmdfZmxlc2giLCJzdG9yZWRfdmVyZGljdCIsIm92ZXJtYXRjaCIsInJ1dGhsZXNzIl19LHsiaWQiOiJmaXJlX21pbmUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzaWVnZWJyZWFrZXIiLCJ0aW1lX2Z1c2UiLCJ0YXV0X3dpcmUiLCJjYXNjYWRlIl19LHsiaWQiOiJzaGF0dGVyY2hvcmQiLCJyYXJpdHkiOiJtYWdpYyIsIm92ZXIiOjEsInN1cHBvcnRzIjpbInJlc291bmRpbmdfZWNobyIsImNhc2NhZGUiXSwibGltYiI6MX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6NTM0NDM4MTU0fQ --seeds 8 --base-seed 1424655400`</details> |
| L40 | clear | `class:brawler` `off:crit` `def:none` `gear:rare` `skill:eviscerate` | 6 | 24.3× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJicmF3bGVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImV2aXNjZXJhdGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJncmFzcGluZ190ZW5kcmlscyIsImdpYW50c2JhbmUiLCJhenVyZV9oYXJ2ZXN0Iiwic2VyZW5lX3Bvd2VyIl0sImxpbWIiOjF9LHsiaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYWxhY3JpdHkiLCJwb2x5cGhvbnkiLCJhdXN0ZXJpdHkiLCJhcG90aGVvc2lzIl19LHsiaWQiOiJzaGF0dGVyY2hvcmQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInJlc291bmRpbmdfZWNobyIsImNhc2NhZGUiXSwibGltYiI6MX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjE5NTU2NzAxNzAsInVuaXF1ZXMiOnsiYW11bGV0Ijoic3Rvcm1jYWxsIiwiYm9vdHMiOiJjaW5kZXJzdGVwIn19 --seeds 8 --base-seed 1424655400`</details> |

Playstyles at L5, best build found per style against the band's median style (50 styles): strongest `construct · lightning` 72000.8 (4.3×), `construct · fire` 69602.6 (4.16×), `area · lightning` 66473.7 (3.97×), `projectile · lightning` 66452.2 (3.97×); weakest `mark · cold` 4279.9 (0.26×), `mark · chaos` 4500.4 (0.27×), `detonate · chaos` 7291.7 (0.44×), `detonate · cold` 7331.5 (0.44×).

Playstyles at L10, best build found per style against the band's median style (50 styles): strongest `court · fire` 145226.4 (2.64×), `area · fire` 119231.4 (2.16×), `self · cold` 116056.6 (2.11×), `projectile · fire` 115304.9 (2.09×); weakest `mark · cold` 11375.7 (0.21×), `detonate · physical` 15193.2 (0.28×), `detonate · cold` 20182.2 (0.37×), `mark · chaos` 30660 (0.56×).

Playstyles at L20, best build found per style against the band's median style (50 styles): strongest `mark · chaos` 795100.6 (4.63×), `mark · fire` 680295.3 (3.96×), `aura · physical` 484504.5 (2.82×), `aura · fire` 396882.2 (2.31×); weakest `mark · cold` 93141.4 (0.54×), `court · cold` 97534.7 (0.57×), `detonate · chaos` 97741.9 (0.57×), `mark · lightning` 98000 (0.57×).

Playstyles at L40, best build found per style against the band's median style (50 styles): strongest `projectile · fire` 908978.3 (2×), `court · fire` 907716.7 (2×), `aura · fire` 869815.5 (1.92×), `target · chaos` 857388.5 (1.89×); weakest `construct · cold` 179199.1 (0.4×), `court · lightning` 202797.4 (0.45×), `detonate · physical` 214987.8 (0.47×), `court · cold` 237229.1 (0.52×).

Main effects at L5 over 8819 rows: strongest `skill:grasping_chasm` 30.81×, `skill:ice_shards` 15.54×, `skill:emberbind` 9.59×, `limb:invocation#0` 6.5×, `skill:shambler_horde` 5.93×; weakest `limb:warp#0` 0.12×, `limb:war_chant#1` 0.12×, `limb:shadow_step#1` 0.13×, `skill:invocation` 0.14×, `limb:warp#1` 0.15×.

Main effects at L10 over 13923 rows: strongest `skill:grasping_chasm` 44.38×, `skill:ice_shards` 20.27×, `limb:summon_bone_golem#0` 15.69×, `primary:own_sky` 6.92×, `skill:shambler_horde` 6.37×; weakest `limb:decoy#1` 0.03×, `limb:decoy#0` 0.04×, `limb:shadow_step#0` 0.07×, `skill:summon_bone_golem` 0.1×, `limb:aegis_ward#0` 0.1×.

Main effects at L20 over 17546 rows: strongest `limb:summon_bone_golem#0` 40.4×, `skill:grasping_chasm` 32.41×, `primary:aegis_ward` 26.89×, `primary:strangler_seed` 25.42×, `skill:ice_shards` 20.3×; weakest `skill:summon_bone_golem` 0.06×, `limb:aegis_ward#0` 0.07×, `limb:war_chant#1` 0.09×, `limb:warp#1` 0.09×, `limb:decoy#0` 0.09×.

Main effects at L40 over 18314 rows: strongest `primary:infernal_bombardment` 98.83×, `limb:shambler_horde#1` 41×, `skill:ice_shards` 28.39×, `support:splintered_earth` 15.42×, `skill:shambler_horde` 14.1×; weakest `limb:aegis_ward#0` 0.04×, `limb:war_chant#0` 0.11×, `limb:war_chant#1` 0.12×, `primary:summon_bone_golem` 0.12×, `limb:expose_weakness#0` 0.15×.

**Other combinations far off the sum of their parts**, confirmed on fresh dice (16 tried):

- `class:hivecaller + support:chaotic_discharge + support:reverberation + support:afterspray`: measured 17.4, its parts predict 0.3. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJoaXZlY2FsbGVyIiwibHZsIjoxMCwic2tpbGxzIjpbeyJpZCI6InplYWwiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsiY2FzdF93aGlsZV9jaGFubmVsaW5nIiwicmV2ZXJiZXJhdGlvbiIsInN0ZWFkeV9uZXJ2ZSJdfSx7ImlkIjoibG9vc2VfbWFycm93Z3J1YnMiLCJyYXJpdHkiOiJtYWdpYyIsIm92ZXIiOjEsInN1cHBvcnRzIjpbImNoYW90aWNfZGlzY2hhcmdlIl19LHsiaWQiOiJkZWNveSIsInJhcml0eSI6InJhcmUiLCJzdXBwb3J0cyI6WyJhbGFjcml0eSIsIm1vbm9saXRoIiwiYWZ0ZXJzcHJheSJdLCJsaW1iIjowfSx7ImlkIjoiZnJlbnp5IiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbImZyZWV6ZV9jaGFuY2UiLCJib2lsaW5nX3BvaW50Il19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjEyMjIyOTI0MjcsInVuaXF1ZXMiOnsiZ2xvdmVzIjoicm90ZV9oYW5kIiwicmluZzEiOiJjb21tb25fcHVsc2UifX0:spar --seeds 30 --base-seed 3593633640`</details>
- `class:firebrand + support:desperate_measures + support:ritardando + primary:mark`: measured 1.6, its parts predict 2.1. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJmaXJlYnJhbmQiLCJsdmwiOjEwLCJza2lsbHMiOlt7ImlkIjoibWFyayIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJkZXNwZXJhdGVfbWVhc3VyZXMiLCJzbG93X21hdGNoIiwicXVpZXRfaGFuZCJdfSx7ImlkIjoiYm9uZV9vZmZlcmluZyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImRlc3BlcmF0ZV9tZWFzdXJlcyIsImVmZmljaWVuY3kiXX0seyJpZCI6InNrZXdlciIsInJhcml0eSI6InJhcmUiLCJzdXBwb3J0cyI6WyJ1bm5lcnZpbmciLCJhc3Nhc3NpbnNfYW5nbGUiLCJjYXN0X29uX2JsZWVkIl0sImxpbWIiOjB9LHsiaWQiOiJ3YXJfY2hhbnQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJzcGVsbF9lY2hvIiwibWFkZGVuaW5nX21pYXNtYSIsInJpdGFyZGFuZG8iLCJ1bnN0YWJsZV9jb21wcmVzc2lvbiJdLCJsaW1iIjoxfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6MTg0ODk0NDgyMH0:spar --seeds 30 --base-seed 3593633640`</details>

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
Matrix: 127,530 of 127,530 eligible pairs probed (100%), deep lane on 25506 pairs. Verdicts: effective 78555, blind 30610, negligible 2437, inert 14500, cost_only 1428.
Against the committed ledger (8481 rows): 12627 not on file, 1995 measuring healthy. The ledger only changes through `matrix check --reconcile`.

## What ran, and what did not

| lane | units planned | ok | gate breach | crashed/killed | out of time or not run | episodes | core-hours |
|---|---:|---:|---:|---:|---:|---:|---:|
| baselines | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| audits | 4 | 4 | 0 | 0 | 0 | 0 | 0 |
| expression | 1 | 1 | 0 | 0 | 0 | 1,208 | 0.1 |
| census | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| suites | 1 | 1 | 0 | 0 | 0 | 910 | 0.2 |
| progression | 39 | 39 | 0 | 0 | 0 | 12,480 | 4.6 |
| skills | 10 | 10 | 0 | 0 | 0 | 8,790 | 1.2 |
| skills_vs | 21 | 21 | 0 | 0 | 0 | 24,192 | 4.8 |
| matchups | 27 | 27 | 0 | 0 | 0 | 13,734 | 5.5 |
| bestiary | 62 | 62 | 0 | 0 | 0 | 78,624 | 15.5 |
| attributes | 39 | 39 | 0 | 0 | 0 | 4,914 | 2.1 |
| affixes | 4 | 4 | 0 | 0 | 0 | 3,472 | 1.2 |
| assists | 10 | 10 | 0 | 0 | 0 | 4,752 | 1.9 |
| socket_play | 1 | 1 | 0 | 0 | 0 | 900 | 0.2 |
| globals | 4 | 4 | 0 | 0 | 0 | 1,704 | 0.2 |
| matrix | 215 | 215 | 0 | 0 | 0 | 235,854 | 49.8 |
| matrix_deep | 94 | 94 | 0 | 0 | 0 | 119,313 | 18.7 |
| search | 40 | 40 | 0 | 0 | 0 | 143,604 | 28.3 |
| archive_confirm | 38 | 38 | 0 | 0 | 0 | 22,704 | 8.1 |
| proposals | 48 | 48 | 0 | 0 | 0 | 13,320 | 3 |

Every planned unit ran.

Not simulated at all, by design: zone generation and XP pacing, event pressure, multiplayer, and real player skill. Pilots are simple policies, so kit ceilings are floors. Bands stay provisional until you sign them off.
