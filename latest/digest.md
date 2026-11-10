# Balance farm, night of 2026-11-10

Commit [ce25a70055](https://github.com/arianna-arpg/arpg-game-world/commit/ce25a70055352667e2efe324ca63af83de79e378), profile `full`. 711,356 episodes, 150.9 core-hours, 289 minutes end to end. [Run](https://github.com/arianna-arpg/arpg-game-world/actions/runs/42818483336).

## ✅ No regressions

Every committed baseline holds, nothing crashed, and the matrix has no new defects since last night.

## Engine defects

These are bugs in the game reachable in play, not balance findings. Each stays listed until it stops happening, and only a new one turns the night red.

**The engine stopped returning.** A real client would freeze here. The farm restarted past each one, so only that episode was lost:

- `EpisodeStalled: an episode ran past its time cap`: 1 episode, ran past its time cap (240s). First seen in `search_spar_g_1tpzu2k1xum6cq`, seed 2735092011. <details><summary>stack and repro</summary>`update < runEpisode < (anonymous) < evaluateGenome < runSearch < searchRun < cmdSearch < main < (anonymous) < run`<br>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJicmF3bGVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6Im1pcmFnZV9rbmlmZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImRlYXRoc19kb29yIiwicGhhbnRhc21hbF9lY2hvIiwib3Zlcm1hdGNoIiwic3VtbW9uX3BoYW50YXNtIl19LHsiaWQiOiJjaGFsbGVuZ2luZ19zaG91dCIsInJhcml0eSI6ImxlZ2VuZGFyeSJ9XSwib2ZmIjoiY3JpdCIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6MTAxMTAzNDM3NH0 --seeds 3 --base-seed 2468591301 --stall-sec 60`</details>

## What moved since last night

No row moved past its own noise and 10%.

## Top proposed numbers

Advisory. Nothing here has been applied, and each needs your sign-off. Each row re-measured the subject on dice the night had not seen, solved for a number through the real game, and verified it at common seeds. 29 outlier(s) did not hold up on fresh dice, or landed within 15% of their target, and were dropped.

| # | subject | change | metric: before → after | cohort target | verdict | guards |
|---:|---|---|---|---:|---|---|
| 1 | class `trapper` | `skills.caltrops.baseDamage.physical.0`: 3 → 7.5 (+1 lines, ×2.5) | kill_rate: 0 → 0.1 | 0.1 | moved | none moved |
| 2 | skill `shambler_horde` | `monsters.grave_shambler.explodeOnDeath`: 2.2 → 0.88 | dps_dummy: 19394.7 → 7757.9 | 680.5 | moved, closes 62% | none moved |
| 3 | skill `arclight_rain` | `skills.arclight_rain.baseDamage.physical.0`: 5 → 2 (+3 lines, ×0.4) | dps_dummy: 347.6 → 139 | 93.2 | moved, closes 82% | none moved |
| 4 | skill `marshlight` | `skills.marshlight.baseDamage.chaos.0`: 9 → 3.6 (+1 lines, ×0.4) | dps_dummy: 267.3 → 107 | 98.9 | moved | none moved |
| 5 | skill `mirespume` | `skills.mirespume.baseDamage.chaos.0`: 11 → 4.4 (+1 lines, ×0.4) | dps_dummy: 247.4 → 98.9 | 98.9 | moved | none moved |
| 6 | support `fire_walker` | `supports.fire_walker.mods.0.value`: 0.5 → 0.2 (+1 lines, ×0.4) | dps_dummy: 60.5 → 30.8 | 16.6 | moved, closes 68% | none moved |
| 7 | skill `infernal_bombardment` | `monsters.bombard_demon.explodeOnDeath`: 1.6 → 0.67 | dps_dummy: 15872.7 → 6684.6 | 6676.7 | moved | none moved |
| 8 | class `hivecaller` | `classes.hivecaller.attributes.strength`: 2 → 5 (+9 lines, ×2.5) | kill_rate: 0 → 0.1 | 0.2 | moved, closes 39% | mana_floor_pct 64.9→80.2 |
| 9 | skill `glare_ice` | `skills.glare_ice.baseDamage.cold.0`: 4 → 10 (+1 lines, ×2.5) | dps_dummy: 1.3 → 3.2 | 4 | moved, closes 71% | none moved |
| 10 | skill `trailblaze` | `skills.trailblaze.baseDamage.fire.0`: 6 → 2.8 (+1 lines, ×0.46) | dps_dummy: 65.4 → 31.2 | 31.1 | moved | none moved |
| 11 | skill `keening_shriek` | `skills.keening_shriek.baseDamage.physical.0`: 4 → 7.6 (+1 lines, ×1.9) | dps_dummy: 2 → 3.7 | 3.6 | moved | none moved |
| 12 | support `sundering_flight` | `supports.sundering_flight.fissureTrail.damageScale`: 0.4 → 0.16 | dps_dummy: 49.7 → 30.4 | 19.8 | moved, closes 64% | none moved |
| 13 | support `volley` | `supports.volley.mods[stat=damage].value`: -0.25 → -0.63 | dps_dummy: 93.2 → 46.6 | 54.4 | moved | none moved |
| 14 | monster_threat `lidless_watcher` | `skills.gaze_beam.baseDamage.chaos.0`: 4 → 9.2 (+1 lines, ×2.3) | dps_in: 0.4 → 7.6 | 7.5 | moved | none moved |
| 15 | monster_threat `seatless_usher` | `skills.ushers_lull.baseDamage.chaos.0`: 4 → 10 (+1 lines, ×2.5) | dps_in: 0 → 7.4 | 7.5 | moved | none moved |

<details><summary>Repro commands</summary>

1. `npm run sim -- whatif --knob 'skills.caltrops.baseDamage*2.5' --scenarios pressure:trapper:30 --seeds 30 --base-seed 1811021881`. Same change at other bands: `pressure:trapper:5` 0.4→0.6, `pressure:trapper:10` 0.2→0.6, `pressure:trapper:20` 0→0.3, `pressure:trapper:40` 0→0
2. `npm run sim -- whatif --knob 'monsters.grave_shambler.explodeOnDeath*0.4' --scenarios skill:shambler_horde:40 --seeds 30 --base-seed 1811021881`. Other dials on this metric (elasticity): cooldown -0.71, useTime -0.36. Same change at other bands: `skill:shambler_horde:5` 257.8→103.1, `skill:shambler_horde:10` 768.4→307.4, `skill:shambler_horde:20` 3055.9→1222.4
3. `npm run sim -- whatif --knob 'skills.arclight_rain.baseDamage*0.4' --scenarios skill:arclight_rain:40 --seeds 30 --base-seed 1811021881`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.19, useTime 0.17. Same change at other bands: `skill:arclight_rain:5` 152.7→61.1, `skill:arclight_rain:10` 185.2→74.1, `skill:arclight_rain:20` 234→93.6
4. `npm run sim -- whatif --knob 'skills.marshlight.baseDamage*0.4' --scenarios skill:marshlight:10 --seeds 30 --base-seed 1811021881`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.66, manaCost -0.04. Same change at other bands: `skill:marshlight:5` 230.4→92.2, `skill:marshlight:20` 320.9→128.4, `skill:marshlight:40` 449.6→179.9
5. `npm run sim -- whatif --knob 'skills.mirespume.baseDamage*0.4' --scenarios skill:mirespume:10 --seeds 30 --base-seed 1811021881`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.57. Same change at other bands: `skill:mirespume:5` 215.3→86, `skill:mirespume:20` 294.6→117.8, `skill:mirespume:40` 405.6→162.2
6. `npm run sim -- whatif --knob 'supports.fire_walker.mods*0.4' --scenarios socketed:phoenix_dive:fire_walker:20 --seeds 30 --base-seed 1811021881`
7. `npm run sim -- whatif --knob 'monsters.bombard_demon.explodeOnDeath*0.42' --scenarios skill:infernal_bombardment:40 --seeds 30 --base-seed 1811021881`. Other dials on this metric (elasticity): cooldown -0.79. Same change at other bands: `skill:infernal_bombardment:5` 239.8→103.1, `skill:infernal_bombardment:10` 687.1→293, `skill:infernal_bombardment:20` 2625.9→1110.7
8. `npm run sim -- whatif --knob 'classes.hivecaller.attributes*2.5' --scenarios pressure:hivecaller:5 --seeds 30 --base-seed 1811021881`. Same change at other bands: `pressure:hivecaller:10` 0→0.1, `pressure:hivecaller:20` 0→0.1, `pressure:hivecaller:40` 0.1→0.1
9. `npm run sim -- whatif --knob 'skills.glare_ice.baseDamage*2.5' --scenarios skill:glare_ice:40 --seeds 30 --base-seed 1811021881`. Other dials on this metric (elasticity): cooldown -1.22, baseDamage 1. Same change at other bands: `skill:glare_ice:5` 0.8→1.9, `skill:glare_ice:10` 0.9→2.1, `skill:glare_ice:20` 1→2.5
10. `npm run sim -- whatif --knob 'skills.trailblaze.baseDamage*0.46' --scenarios skill:trailblaze:20 --seeds 30 --base-seed 1811021881`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.78. Same change at other bands: `skill:trailblaze:5` 50.6→24.6, `skill:trailblaze:10` 56.6→27.2, `skill:trailblaze:40` 86.8→40.2
11. `npm run sim -- whatif --knob 'skills.keening_shriek.baseDamage*1.9' --scenarios skill:keening_shriek:40 --seeds 30 --base-seed 1811021881`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.78. Same change at other bands: `skill:keening_shriek:5` 1.1→2.2, `skill:keening_shriek:10` 1.3→2.4, `skill:keening_shriek:20` 1.5→2.8
12. `npm run sim -- whatif --knob 'supports.sundering_flight.fissureTrail.damageScale*0.4' --scenarios socketed:ball_lightning:sundering_flight:20 --seeds 30 --base-seed 1811021881`
13. `npm run sim -- whatif --knob 'supports.volley.mods[stat=damage].value*2.5' --scenarios socketed:soulflay:volley:20 --seeds 30 --base-seed 1811021881`
14. `npm run sim -- whatif --knob 'skills.gaze_beam.baseDamage*2.3' --scenarios threat:starter_magician_l25:lidless_watcher:25 --seeds 30 --base-seed 1811021881`. Other dials on this metric (elasticity): kit.gaze_beam 8.5. Same change at other bands: `threat:starter_magician_l5:lidless_watcher:5` 2→4.7, `threat:starter_magician_l10:lidless_watcher:10` 1.1→4.9, `threat:starter_magician_l20:lidless_watcher:20` 1.3→7.3, `threat:starter_magician_l40:lidless_watcher:40` 1.1→11.7
15. `npm run sim -- whatif --knob 'skills.ushers_lull.baseDamage*2.5' --scenarios threat:starter_magician_l25:seatless_usher:25 --seeds 30 --base-seed 1811021881`. Other dials on this metric (elasticity): kit.ushers_lull 38.4. Same change at other bands: `threat:starter_magician_l5:seatless_usher:5` 2→5, `threat:starter_magician_l10:seatless_usher:10` 0.7→4.8, `threat:starter_magician_l20:seatless_usher:20` 0.6→7.1, `threat:starter_magician_l40:seatless_usher:40` 0.2→11.2

Run from commit `ce25a70055352667e2efe324ca63af83de79e378`.
</details>

Too noisy to call: class `firebrand`, class `assassin`, support `septic_bargain`, class `beguiler`. The solved number moved each by less than its own seed-to-seed spread, so these need a calmer rig or more seeds before they mean anything.

### Combinations that run away

Confirmed on fresh dice at 20 times or more what their parts predict. A number this far out usually means damage feeding itself, so no single number fixes it: each needs a call on whether the feedback should be bounded.

- `class:berserker + primary:grit_stance + support:unleash + support:scattered_cascade`: measured 3.6e+7 damage per second, its parts predict 1428.3. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZ3JpdF9zdGFuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiLCJvdmVybWF0Y2giLCJvc3RpbmF0byJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJhY2NlbGVyYW5kbyIsImVmZmljaWVuY3kiXX0seyJpZCI6InJlcHVsc29yX2JlYWNvbiIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZmxlZXRmb290Il19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjo4Njk3ODg1MTcsInVuaXF1ZXMiOnsiY2hlc3QiOiJ0aGVfdW5tb3ZlZCIsImdsb3ZlcyI6ImdhbGV3cmlnaHRzIn19:spar --seeds 30 --base-seed 1811021881`</details>
- `class:berserker + unique:cinderstep + primary:grit_stance + support:unleash`: measured 3.2e+7 damage per second, its parts predict 3488. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZ3JpdF9zdGFuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiLCJvdmVybWF0Y2giLCJvc3RpbmF0byJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJhY2NlbGVyYW5kbyIsImVmZmljaWVuY3kiXX0seyJpZCI6InJlcHVsc29yX2JlYWNvbiIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicHVsc2luZ19yYW1wYXJ0cyJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6NjU4Mzk1MjcyLCJ1bmlxdWVzIjp7ImJvb3RzIjoiY2luZGVyc3RlcCIsImdsb3ZlcyI6ImdhbGV3cmlnaHRzIn19:spar --seeds 30 --base-seed 1811021881`</details>
- `class:berserker + unique:cindervigil + primary:grit_stance + support:unleash`: measured 1.9e+7 damage per second, its parts predict 1401.3. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZ3JpdF9zdGFuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiLCJvdmVybWF0Y2giLCJvc3RpbmF0byJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJlZmZpY2llbmN5Il19LHsiaWQiOiJleHBvc2Vfd2Vha25lc3MiLCJyYXJpdHkiOiJyYXJlIiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2FpbnRlZF9hc2giXSwibGltYiI6MH1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjg2OTc4ODUxNywidW5pcXVlcyI6eyJnbG92ZXMiOiJnYWxld3JpZ2h0cyIsImhlbG1ldCI6ImNpbmRlcnZpZ2lsIn19:spar --seeds 30 --base-seed 1811021881`</details>
- `class:brawler + unique:cinderstep + support:cascade + support:momentum`: measured 3084321.4 damage per second, its parts predict 6838.5. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJicmF3bGVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImV2aXNjZXJhdGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJncmFzcGluZ190ZW5kcmlscyIsImdpYW50c2JhbmUiLCJhenVyZV9oYXJ2ZXN0Iiwic2VyZW5lX3Bvd2VyIl0sImxpbWIiOjF9LHsiaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYWxhY3JpdHkiLCJwb2x5cGhvbnkiLCJhdXN0ZXJpdHkiLCJwcmVzc3VyZV9zZWFsIl19LHsiaWQiOiJzaGF0dGVyY2hvcmQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInJlc291bmRpbmdfZWNobyIsImNhc2NhZGUiXSwibGltYiI6MX0seyJpZCI6ImJhbGxfbGlnaHRuaW5nIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsibW9tZW50dW0iXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjkyMjY5ODcwMywidW5pcXVlcyI6eyJib290cyI6ImNpbmRlcnN0ZXAiLCJoZWxtZXQiOiJncmF2ZWJsb29tIn19:spar --seeds 30 --base-seed 1811021881`</details>
- `class:warlord + support:sainted_ash + primary:discipline + support:transient_inferno`: measured 13321.1 damage per second, its parts predict 38. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJ3YXJsb3JkIiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImRpc2NpcGxpbmUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJ0cmFuc2llbnRfaW5mZXJubyIsIm1lYXN1cmVkX2JsYWRlIl19LHsiaWQiOiJleHBvc2Vfd2Vha25lc3MiLCJyYXJpdHkiOiJyYXJlIiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2FpbnRlZF9hc2giXSwibGltYiI6MH0seyJpZCI6InNoYW1ibGVyX2hvcmRlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsiZWZmaWNpZW5jeSIsIndhcmRpbmdfZmxlc2giLCJhY2NlbGVyYXRlZCIsInZpb2xlbnRfYXJyaXZhbCJdLCJsaW1iIjoxfSx7ImlkIjoibG9vc2VfbWFycm93Z3J1YnMiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInVuZHlpbmdfbG95YWx0eSJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjE5Mzg3NjI5MTUsInVuaXF1ZXMiOnsiYmVsdCI6InN0YW5kaW5nX3RvYXN0IiwicmluZzEiOiJjb21tb25fcHVsc2UifX0:spar --seeds 30 --base-seed 1811021881`</details>
- `class:cryomancer + support:triangle_sigil + support:exposure + support:desperation`: measured 4569.9 damage per second, its parts predict 28.6. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJjcnlvbWFuY2VyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoiZXhwb3NlX3dlYWtuZXNzIiwicmFyaXR5IjoibWFnaWMiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJ0aW1lX2Z1c2UiLCJzcGlyaXRfdG90ZW0iXSwibGltYiI6MH0seyJpZCI6InZhbXBpcmljX2VtYnJhY2UiLCJyYXJpdHkiOiJtYWdpYyJ9LHsiaWQiOiJ2YW1waXJpY19wcmVzZW5jZSIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJlcGhlbWVyYWwiLCJibG9vZF90b2xsIl19LHsiaWQiOiJncmFzcGluZ19jaGFzbSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbImV4cG9zdXJlIiwidHJpYW5nbGVfc2lnaWwiLCJhY2NlbGVyYW5kbyIsImRlc3BlcmF0aW9uIl19XSwib2ZmIjoiY3JpdCIsImRlZiI6Im5vbmUiLCJnZWFyIjoibWFnaWMiLCJncyI6MTIzNjI3MTI0MCwidW5pcXVlcyI6eyJib290cyI6IndhbmRlcmVyc193YWtlIiwicmluZzEiOiJlbWJlcmJyYW5kIn19:spar --seeds 30 --base-seed 1811021881`</details>
- `class:warlord + unique:cinderstep + support:sainted_ash + support:crowd_favor`: measured 508.8 damage per second, its parts predict 2.7. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJ3YXJsb3JkIiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6IndvcmRfb2ZfdW5tYWtpbmciLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJpZ25pdGVfY2hhbmNlIiwiY2FzdF9vbl9kYW1hZ2VfdGFrZW4iLCJyaWNvY2hldCJdfSx7ImlkIjoiZXhwb3NlX3dlYWtuZXNzIiwicmFyaXR5IjoicmFyZSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNhaW50ZWRfYXNoIiwiYm9pbGluZ19wb2ludCJdLCJsaW1iIjowfSx7ImlkIjoibWFuYV9zaGllbGQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImRvbWluaW9uX3RpdGhlIl19LHsiaWQiOiJsb29zZV9tYXJyb3dncnVicyIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsidW5keWluZ19sb3lhbHR5IiwiY3Jvd2RfZmF2b3IiXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6IndhcmQiLCJnZWFyIjoicmFyZSIsImdzIjoxOTM4NzYyOTE1LCJ1bmlxdWVzIjp7ImFtdWxldCI6ImJlbGx3ZXRoZXIiLCJib290cyI6ImNpbmRlcnN0ZXAifX0:spar --seeds 30 --base-seed 1811021881`</details>
- `class:runeweaver + unique:cinderstep + support:orbital_sweep + support:lingering`: measured 470.7 damage per second, its parts predict 2.8. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImhlYWxpbmdfc3RyZWFtIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsib3JiaXRhbF9zd2VlcCJdfSx7ImlkIjoiZG9vbWJyYW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZnJhZ21lbnRhdGlvbiIsImNhc3Rfb25fcG9pc29uIiwic3Bpcml0X3RvdGVtIiwicGFsbGlkX3RvdWNoIl19LHsiaWQiOiJmcm9zdGd1YXJkIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiYWNjZWxlcmF0ZWQiXX0seyJpZCI6Indhcl9jaGFudCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImNyZWVwaW5nX2Z1bWVzIiwibWFkZGVuaW5nX21pYXNtYSIsInJpdGFyZGFuZG8iLCJsaW5nZXJpbmciXSwibGltYiI6MX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImxpZmUiLCJnZWFyIjoicmFyZSIsImdzIjo3ODI3OTU1MjMsInVuaXF1ZXMiOnsiYm9vdHMiOiJjaW5kZXJzdGVwIiwicmluZzEiOiJzaGFyZWRfY3VwIn19:spar --seeds 30 --base-seed 1811021881`</details>
- `class:summoner + unique:cinderstep + support:afterspray + support:lingering`: measured 228.2 damage per second, its parts predict 0.8. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJzdW1tb25lciIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6InJhcmUifSx7ImlkIjoia2luZGxlX3dpY2siLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJmbGVldGZvb3QiLCJsaW5nZXJpbmciXX0seyJpZCI6InNoYWRvd19zdGVwIiwicmFyaXR5IjoicmFyZSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbIm1vbm9saXRoIiwiYWZ0ZXJzcHJheSIsImZyYWdtZW50YXRpb24iXSwibGltYiI6MH0seyJpZCI6ImZsYXNoX2ZyZWV6ZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjJ9XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjc4MjMxNTI1MCwidW5pcXVlcyI6eyJib290cyI6ImNpbmRlcnN0ZXAiLCJyaW5nMSI6InNsb3dtYXRjaF9jb2lsIn19:spar --seeds 30 --base-seed 1811021881`</details>
- `class:ascetic + support:shock_chance + support:at_the_brink + support:deep_reserves`: measured 126.7 damage per second, its parts predict 1.1. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJhc2NldGljIiwibHZsIjoxMCwic2tpbGxzIjpbeyJpZCI6ImJhcnJhZ2UiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsiYXRfdGhlX2JyaW5rIiwic2lkZXdpbmRlciIsInZvaWRyZW5kIl19LHsiaWQiOiJvYmxhdGlvbl9vZl9saWZlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsicHJlc3N1cmVfc2VhbCIsImF0X3RoZV9icmluayIsImJsb29kX3RvbGwiLCJkZWVwX3Jlc2VydmVzIl19LHsiaWQiOiJnbGFyZV9pY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzcGlyaXRfdG90ZW0iLCJ3cmFpdGhfcGFzc2FnZSIsInNob2NrX2NoYW5jZSJdfSx7ImlkIjoidmFtcGlyaWNfcHJlc2VuY2UiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsiY2FwYWNpdG9yIiwicmVnaWNpZGUiXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjo0ODE4MzQzOTB9:spar --seeds 30 --base-seed 1811021881`</details>

### Flagged for your decision

The numbers an author would reach for did not move these enough. They are not proposals: each needs a call on whether the mechanic is right, and none has been touched.

- class `chronomancer`: The numbers an author would reach for barely move this: skills.stasis_lock.baseDamage ×2.5 closes 10%; classes.chronomancer.attributes ×2.5 closes 1%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- skill `hurricane`: The numbers an author would reach for barely move this: skills.hurricane.baseDamage ×2.5 closes 15%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `wallwright`: The numbers an author would reach for barely move this: skills.stone_rampart.baseDamage ×1 closes 0%; skills.toppling_stroke.baseDamage ×2.5 closes 13%; skills.shield_charge.baseDamage ×2.5 closes 6%; skills.stone_rampart.baseDamage & skills.toppling_stroke.baseDamage & skills.shield_charge.baseDamage ×2.5 closes 18%; classes.wallwright.attributes ×2.5 closes 2%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `necromancer`: The numbers an author would reach for barely move this: skills.poison_nova.baseDamage ×0.4 closes 5%; skills.despair.baseDamage ×1 closes 0%; skills.poison_nova.baseDamage & skills.despair.baseDamage ×0.4 closes 5%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- support `resounding_echo`: The numbers an author would reach for barely move this: supports.resounding_echo.mods ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `sharper`: The numbers an author would reach for barely move this: skills.thrown_ace.baseDamage ×1 closes 0%; classes.sharper.attributes ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_threat `breach_arcling`: The numbers an author would reach for barely move this: monsterDamage.breach_arcling.all ×2.5 closes 16%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `stygian_doll`: The numbers an author would reach for barely move this: monsters.stygian_doll.base.life ×2.4 closes 3%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `amalgam_fleshweaver`: The numbers an author would reach for barely move this: monsters.amalgam_fleshweaver.base.life ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.

## Outliers

448 rows sit far from their cohort (log-scale median and MAD, z ≥ 3 and a ratio past 1.8× or 0.55×), 32 of them new tonight. Warned rows and zero rows never enter a cohort.

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
| 🆕 | interaction | `class:berserker + unique:cindervigil + primary:grit_stance + support:unleash` | dps_out | 6.3e+7 | 1401.3 | 44974.6× | 12.1 | L40 main effects |
| 🆕 | interaction | `class:berserker + unique:cinderstep + primary:grit_stance + support:unleash` | dps_out | 1.6e+8 | 3488 | 44451.48× | 12.1 | L40 main effects |
|  | support | `crescendo` | output_multiplier | 2.1 | 1 | 2.02× | 12 | supports · effective hosts |
|  | support | `septic_bargain` | output_multiplier | 0.5 | 1 | 0.5× | -12 | supports · effective hosts |
|  | class | `chronomancer` | kill_rate | 0 | 0.5 | 0.04× | -11.9 | L10 · geared · pressure · kill_rate |
| 🆕 | interaction | `class:berserker + primary:grit_stance + support:unleash + support:scattered_cascade` | dps_out | 3.1e+7 | 1428.3 | 21930.77× | 11.3 | L40 main effects |
| 🆕 | interaction | `class:brawler + unique:cinderstep + support:cascade + support:momentum` | dps_out | 1.4e+8 | 6838.5 | 20680.85× | 11.2 | L40 main effects |
|  | support | `volley` | output_multiplier | 2 | 1 | 1.92× | 11.1 | supports · effective hosts |
| 🆕 | interaction | `class:berserker + primary:grit_stance + support:unleash + support:scattered_cascade` | dps_out | 2.2e+7 | 1378 | 16178.53× | 10.9 | L40 main effects |
| 🆕 | interaction | `class:berserker + unique:cinderstep + primary:grit_stance + support:unleash` | dps_out | 3.1e+7 | 3431.6 | 8926.91× | 10.3 | L40 main effects |
|  | support | `elemental_conduction` | output_multiplier | 1.9 | 1 | 1.82× | 10.2 | supports · effective hosts |
| 🆕 | interaction | `class:berserker + primary:grit_stance + support:unleash + support:scattered_cascade` | dps_out | 1.0e+7 | 1426.9 | 7146.41× | 10 | L40 main effects |
|  | monster_threat | `hadal_lantern` | dps_in | 0.1 | 14.9 | 0× | -9.3 | L12 · magician · body |
|  | affix | `attr_willpower` | dps_out | 134.4 | 150.5 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `dmg_cold` | dps_out | 141.2 | 159.7 | 0.06× | -9.1 | L20 · magician · affix output |

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

</details>

## Build search

126,956 candidates tonight (28,827 refused by the real gates), 774,328 over 12 night(s). The archive holds 1420 elite rows; 1396 were re-measured on this commit. Tried so far in a legal build: 39 of 39 classes, 576 of 576 primarys, 604 of 604 skills, 454 of 455 supports, 41 of 41 uniques.

| band | objective | build (top factors) | value | × band median | repro |
|---|---|---|---:|---:|---|
| L5 | offense | `class:runeweaver` `off:crit` `def:life` `gear:rare` `skill:orb_of_storms` | 31248.5 | 871.7× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoib3JiX29mX3N0b3JtcyIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiaHVudGVyc19tb21lbnR1bSIsInJlZ2ljaWRlIl19LHsiaWQiOiJzdG9ybWJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJ0ZW1wZXN0X3JhbmdlIl19LHsiaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJmbGVldGluZ19kZXZvdGlvbiIsImFsYWNyaXR5IiwiYWNjZWxlcmFuZG8iLCJibG9vZF90b2xsIl19LHsiaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiY2FzY2FkZV9vZl9rbml2ZXMiLCJzbG93X2JyZXciLCJwYXJ0aW5nX2p1ZGdlbWVudCIsInN1bmRlcmluZ19mbGlnaHQiXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjE0MzcyMjkwODksInVuaXF1ZXMiOnsiYW11bGV0Ijoic3Rvcm1jYWxsIiwicmluZzEiOiJlbWJlcmJyYW5kIn19 --seeds 8 --base-seed 1788265574`</details> |
| L5 | offense | `class:runeweaver` `off:crit` `def:life` `gear:rare` `skill:orb_of_storms` | 30461.6 | 849.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoib3JiX29mX3N0b3JtcyIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiaHVudGVyc19tb21lbnR1bSIsInB1bHNpbmdfcmFtcGFydHMiXX0seyJpZCI6InN0b3JtYmluZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInRlbXBlc3RfcmFuZ2UiXX0seyJpZCI6ImVtYmVyYmluZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImZsZWV0aW5nX2Rldm90aW9uIiwic2xvd19icmV3IiwiYWNjZWxlcmFuZG8iLCJibG9vZF90b2xsIl19LHsiaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic3BsaXR0aW5nIiwic2xvd19icmV3IiwicGFydGluZ19qdWRnZW1lbnQiLCJzdW5kZXJpbmdfZmxpZ2h0Il19XSwib2ZmIjoiY3JpdCIsImRlZiI6ImxpZmUiLCJnZWFyIjoicmFyZSIsImdzIjoxNjczODQ4NzE3LCJ1bmlxdWVzIjp7ImhlbG1ldCI6ImdyYXZlYmxvb20iLCJyaW5nMSI6ImVtYmVyYnJhbmQifX0 --seeds 8 --base-seed 1788265574`</details> |
| L5 | clear | `class:chronomancer` `off:damage` `def:none` `gear:rare` `skill:broodpod` | 6 | 15.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJicm9vZHBvZCIsInJhcml0eSI6Im1hZ2ljIiwib3ZlciI6Miwic3VwcG9ydHMiOlsibWFycm93Ym91bmRfdmlnb3IiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjoxNDMwNTA0OTA4LCJ1bmlxdWVzIjp7ImJvb3RzIjoiZmxlZXRmZWF0aGVyIiwiaGVsbWV0IjoiZ3JhdmVibG9vbSJ9fQ --seeds 8 --base-seed 3122868824`</details> |
| L5 | clear | `class:chronomancer` `off:damage` `def:none` `gear:rare` `skill:rolling_cannonade` | 6 | 15.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJyb2xsaW5nX2Nhbm5vbmFkZSIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiY29sb3NzYWwiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjoxNDMwNTA0OTA4LCJ1bmlxdWVzIjp7ImhlbG1ldCI6ImdyYXZlYmxvb20ifX0 --seeds 8 --base-seed 1423610123`</details> |
| L10 | offense | `class:magician` `off:speed` `def:life` `gear:rare` `skill:vampiric_presence` | 56850.2 | 1511.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJ2YW1waXJpY19wcmVzZW5jZSIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJsaW5nZXJpbmciLCJ0YXV0X3dpcmUiLCJibG9vZF90b2xsIl19LHsiaWQiOiJvdmVyY2xvY2siLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsiYXRfdGhlX2JyaW5rIiwiYmxvb2RfcGFjdCJdfSx7ImlkIjoiZW1iZXJiaW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZmxlZXRpbmdfZGV2b3Rpb24iLCJ3cmFpdGhfcGFzc2FnZSIsInBvbHlwaG9ueSIsInJhdmVuaW5nIl19LHsiaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYXJjaW5nIiwic2xvd19icmV3IiwicGFydGluZ19qdWRnZW1lbnQiLCJtb3VudGluZ19mcmVuenkiXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImxpZmUiLCJnZWFyIjoicmFyZSIsImdzIjozNzE3MDg5NDQsInVuaXF1ZXMiOnsiYmVsdCI6ImJsb29kbGV0dGVyc19naXJkbGUiLCJib290cyI6InJpbWV3YWtlIn19 --seeds 8 --base-seed 2299476431`</details> |
| L10 | offense | `class:magician` `off:crit` `def:life` `gear:rare` `skill:flame_imbuement` | 42824.2 | 1138.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJmbGFtZV9pbWJ1ZW1lbnQiLCJyYXJpdHkiOiJyYXJlIiwib3ZlciI6Miwic3VwcG9ydHMiOlsiY2FzdF9vbl9ibG9jayJdfSx7ImlkIjoib3ZlcmNsb2NrIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbImF0X3RoZV9icmluayIsImJsb29kX3BhY3QiXX0seyJpZCI6ImVtYmVyYmluZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImZsZWV0aW5nX2Rldm90aW9uIiwid3JhaXRoX3Bhc3NhZ2UiLCJwb2x5cGhvbnkiLCJyYXZlbmluZyJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImFyY2luZyIsInNsb3dfYnJldyIsInBhcnRpbmdfanVkZ2VtZW50IiwibW91bnRpbmdfZnJlbnp5Il19XSwib2ZmIjoiY3JpdCIsImRlZiI6ImxpZmUiLCJnZWFyIjoicmFyZSIsImdzIjozNzE3MDg5NDQsInVuaXF1ZXMiOnsiYmVsdCI6ImJsb29kbGV0dGVyc19naXJkbGUiLCJib290cyI6InJpbWV3YWtlIn19 --seeds 8 --base-seed 2299476431`</details> |
| L10 | clear | `class:skald` `off:damage` `def:armor` `gear:rare` `skill:marshals_rift` | 6 | 19.2× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJza2FsZCIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJtYXJzaGFsc19yaWZ0IiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbImJyb29kX3RlbmRlciJdfSx7ImlkIjoiZG9vbV9iZWxsIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsibWVhc3VyZWRfYmxhZGUiXX0seyJpZCI6ImtlZW5pbmdfc2hyaWVrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsic3F1YXJlX3NpZ2lsIl19LHsiaWQiOiJmdXJvciIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInBvdGVuY3kiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjE0ODI3NDM1MjV9 --seeds 8 --base-seed 1710572697`</details> |
| L10 | clear | `class:cleric` `off:speed` `def:none` `gear:rare` `skill:closing_fang` | 6 | 19.2× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjbGVyaWMiLCJsdmwiOjEwLCJza2lsbHMiOlt7ImlkIjoiY2xvc2luZ19mYW5nIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbInNhaW50ZWRfYXNoIiwic2xvd19icmV3IiwicG9seXBob255Il19LHsiaWQiOiJzaGF0dGVyY2hvcmQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInJlc291bmRpbmdfZWNobyIsImNhc2NhZGUiXSwibGltYiI6MX0seyJpZCI6InNhbmN0aWZpZWRfc3RyaWtlIiwicmFyaXR5IjoicmFyZSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImNhcnJpZXJfc3RyYWluIiwiY2hpbGxfY2hhbmNlIiwidmljdG9yc190ZW1wbyJdLCJsaW1iIjoxfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjQwNDc1NjA1MSwidW5pcXVlcyI6eyJyaW5nMSI6InNoYXJlZF9jdXAifX0 --seeds 8 --base-seed 1423610123`</details> |
| L20 | offense | `class:juggernaut` `off:damage` `def:none` `gear:rare` `skill:detonate_mines` | 164484.9 | 2240.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJqdWdnZXJuYXV0IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImRldG9uYXRlX21pbmVzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsidXByb290ZXIiXX0seyJpZCI6ImVtYmVyYmluZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImFjY2VsZXJhbmRvIiwic2xvd19icmV3IiwicG9seXBob255IiwiYmxvb2RfdG9sbCJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImNoaWxsX2NoYW5jZSIsInBhcnRpbmdfanVkZ2VtZW50IiwidW5ibGlua2luZyIsInNwb29saW5nIl19LHsiaWQiOiJjb21idXN0aW9uX3N0cmlrZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNlaXNtaWNfbWFyY2giLCJjYXN0X29uX2hpZ2hfcm9sbCIsInNlYXJpbmdfaGVhdCIsInNjYXR0ZXJlZF9jYXNjYWRlIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjEwMDk4NTYyMzUsInVuaXF1ZXMiOnsiYm9vdHMiOiJyaW1ld2FrZSIsImhlbG1ldCI6ImhhbG9fbmludGhfY2hvaXIifX0 --seeds 8 --base-seed 303703240`</details> |
| L20 | offense | `class:juggernaut` `off:damage` `def:evasion` `gear:rare` `skill:detonate_mines` | 154586.6 | 2105.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJqdWdnZXJuYXV0IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImRldG9uYXRlX21pbmVzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsidXByb290ZXIiLCJodW50ZXJzX21vbWVudHVtIl19LHsiaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJtZWFzdXJlZF9ibG93cyIsInNsb3dfYnJldyIsInBvbHlwaG9ueSIsImJsb29kX3RvbGwiXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJzcGxpdHRpbmciLCJzdW1tb25fcGhhbnRhc20iLCJwYXJ0aW5nX2p1ZGdlbWVudCIsInZvbGxleSJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjoxNzQ4MjU5MTMzLCJ1bmlxdWVzIjp7ImFtdWxldCI6ImNpbmRlcl9jb25kdWN0b3IiLCJib290cyI6InJpbWV3YWtlIn19 --seeds 8 --base-seed 303703240`</details> |
| L20 | clear | `class:tamer` `off:crit` `def:armor` `gear:rare` `skill:detonate_mines` | 6 | 24.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJ0YW1lciIsImx2bCI6MjAsInNraWxscyI6W3siaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImNhc3Rfb25fYmxlZWQiXX0seyJpZCI6ImZyb3N0X3B1bHNlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsicGllcmNpbmciXX0seyJpZCI6ImRvb21fYmVsbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNoYXR0ZXJnbGFzcyIsImZsb3dicmVha2VyIiwidXByb290ZXIiLCJtZWFzdXJlZF9ibG93cyJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjUzODk1NzY0NSwidW5pcXVlcyI6eyJhbXVsZXQiOiJ0dW5pbmdfZm9yayJ9fQ --seeds 8 --base-seed 2475516639`</details> |
| L20 | clear | `class:runeweaver` `off:speed` `def:evasion` `gear:rare` `skill:fire_mine` | 6 | 24.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImZpcmVfbWluZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNpZWdlYnJlYWtlciIsInJlc291bmRpbmdfZWNobyIsInRhdXRfd2lyZSIsImNhc2NhZGUiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjU2OTM1OTM2M30 --seeds 8 --base-seed 3791430725`</details> |
| L40 | offense | `class:sentinel` `off:speed` `def:evasion` `gear:rare` `skill:soporific_veil` | 573944.9 | 5882.1× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzZW50aW5lbCIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJzb3BvcmlmaWNfdmVpbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImFjY2VsZXJhdGVkIiwic3F1YXJlX3NpZ2lsIiwic2Vpc21pY19tYXJjaCIsInRhdXRfd2lyZSJdfSx7ImlkIjoic2hhbWJsZXJfaG9yZGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJwbHVzX21pbmlvbiIsInJhdmVub3VzX3BhY3QiLCJjYXNjYWRpbmdfY2FsbCIsImVwaGVtZXJhbCJdLCJsaW1iIjoxfSx7ImlkIjoiZG9vbWJyYW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZGVzcGVyYXRpb24iLCJjYXN0X29uX2ZsYXdsZXNzIiwiZW1iYXJnbyIsImh1bnRlcnNfbW9tZW50dW0iXX0seyJpZCI6ImludmlzaWJpbGl0eSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInByZXNzdXJlX3NlYWwiXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjo0NzE0NzM0NzMsInVuaXF1ZXMiOnsiaGVsbWV0IjoiZ3JhdmVibG9vbSIsInJpbmcxIjoiY29tbW9uX3B1bHNlIn19 --seeds 8 --base-seed 934508999`</details> |
| L40 | offense | `class:vanguard` `off:crit` `def:none` `gear:rare` `skill:pain_hounds` | 375381.6 | 3847.1× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJ2YW5ndWFyZCIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJwYWluX2hvdW5kcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImZyZXNoX3JhbmtzIiwiY2FzdF9vbl9jcml0IiwicG9seXBob255IiwiY2FzdF9vbl9oaWdoX3JvbGwiXX0seyJpZCI6ImxpZ2h0bmluZ19ibGFzdCIsInJhcml0eSI6InJhcmUiLCJzdXBwb3J0cyI6WyJjYXN0X29uX2ZsYXdsZXNzIiwiZG9taW5pb25fdGl0aGUiLCJhY2NlbGVyYW5kbyJdfSx7ImlkIjoiZW1iZXJiaW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZmxlZXRpbmdfZGV2b3Rpb24iLCJzbG93X2JyZXciLCJidXJpZWRfY2hhcmdlIiwiYmxvb2RfcHJpY2UiXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJhcmNpbmciLCJzbG93X2JyZXciLCJwYXJ0aW5nX2p1ZGdlbWVudCIsIm1vdW50aW5nX2ZyZW56eSJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6MTYyNTU0Nzk3OCwidW5pcXVlcyI6eyJnbG92ZXMiOiJ0aXRhbnNfZ3Jhc3AiLCJoZWxtZXQiOiJjaW5kZXJ2aWdpbCJ9fQ --seeds 8 --base-seed 2962543453`</details> |
| L40 | clear | `class:berserker` `off:speed` `def:life` `gear:rare` `skill:detonate_mines` | 6 | 23.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZGV0b25hdGVfbWluZXMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJkb21pbmlvbl90aXRoZSIsInN0b3JlZF92ZXJkaWN0IiwiY2hhbWJlcmVkX2Nhc3RpbmciLCJzZXJlbmVfcG93ZXIiXX0seyJpZCI6Imh1cmxfZGVicmlzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsibWFuYV9mZWVkZXIiXX0seyJpZCI6ImRvb21fYmVsbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbIm1lYXN1cmVkX2JsYWRlIl19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJsaWZlIiwiZ2VhciI6InJhcmUiLCJncyI6MTc3NDMxMDUyMiwidW5pcXVlcyI6eyJoZWxtZXQiOiJoYWxvX25pbnRoX2Nob2lyIn19 --seeds 8 --base-seed 1658306995`</details> |
| L40 | clear | `class:vanguard` `off:damage` `def:ward` `gear:rare` `skill:mark` | 6 | 23.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJ2YW5ndWFyZCIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiYmxvb2RfcHJpY2UiLCJzcGVudGJhbmUiXX0seyJpZCI6Imlnbml0ZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInBsdXNfZmlyZSJdLCJsaW1iIjowfSx7ImlkIjoiZG9vbV9iZWxsIiwicmFyaXR5IjoibGVnZW5kYXJ5In1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJ3YXJkIiwiZ2VhciI6InJhcmUiLCJncyI6MTIwMTA4MjY2NiwidW5pcXVlcyI6eyJhbXVsZXQiOiJyb3VuZGVsYXkiLCJnbG92ZXMiOiJnYWxld3JpZ2h0cyJ9fQ --seeds 8 --base-seed 2962543453`</details> |

Playstyles at L5, best build found per style against the band's median style (50 styles): strongest `construct · lightning` 32001.4 (3.88×), `construct · fire` 31121.1 (3.77×), `court · lightning` 28905.4 (3.5×), `projectile · lightning` 27578 (3.34×); weakest `mark · cold` 1749.8 (0.21×), `detonate · cold` 2026.9 (0.25×), `construct · cold` 2537.3 (0.31×), `court · cold` 2574.1 (0.31×).

Playstyles at L10, best build found per style against the band's median style (50 styles): strongest `aura · cold` 56917.6 (3.58×), `self · cold` 42857 (2.7×), `aura · fire` 39097.2 (2.46×), `projectile · cold` 36258.6 (2.28×); weakest `target · physical` 5822.4 (0.37×), `detonate · cold` 6199.6 (0.39×), `mark · lightning` 8775.5 (0.55×), `target · cold` 9675.3 (0.61×).

Playstyles at L20, best build found per style against the band's median style (50 styles): strongest `aura · physical` 484504.5 (5.8×), `melee · physical` 377356.5 (4.52×), `detonate · lightning` 164968.1 (1.98×), `detonate · fire` 154203.6 (1.85×); weakest `mark · cold` 14512.5 (0.17×), `mark · chaos` 21398.7 (0.26×), `construct · physical` 30389.9 (0.36×), `construct · cold` 30844.7 (0.37×).

Playstyles at L40, best build found per style against the band's median style (50 styles): strongest `aura · fire` 869815.5 (6.14×), `target · chaos` 857388.5 (6.05×), `court · fire` 606035.2 (4.28×), `melee · physical` 507614.2 (3.58×); weakest `court · cold` 33728 (0.24×), `detonate · chaos` 43294.9 (0.31×), `target · cold` 46413.7 (0.33×), `construct · physical` 48136.7 (0.34×).

Main effects at L5 over 12681 rows: strongest `skill:grasping_chasm` 22.89×, `skill:emberbind` 7.19×, `skill:ice_shards` 7.14×, `skill:shambler_horde` 7.01×, `support:parting_judgement` 6.87×; weakest `primary:beckon_palewisps` 0.17×, `limb:buckler_strike#1` 0.17×, `primary:web_shot` 0.22×, `skill:repulsor_beacon` 0.22×, `skill:loose_marrowgrubs` 0.23×.

Main effects at L10 over 19642 rows: strongest `skill:grasping_chasm` 22.97×, `skill:ice_shards` 11.21×, `limb:mana_flask#2` 9.63×, `primary:soulflay` 8.42×, `primary:mirage_knife` 6.82×; weakest `limb:shadow_step#0` 0.03×, `limb:decoy#0` 0.05×, `primary:deathwatch` 0.07×, `limb:decoy#1` 0.08×, `limb:expose_weakness#0` 0.14×.

Main effects at L20 over 25298 rows: strongest `skill:grasping_chasm` 30.03×, `skill:bonespray` 28.94×, `skill:infernal_bombardment` 19.94×, `skill:ice_shards` 17.12×, `primary:voltaic_orb` 16.82×; weakest `limb:war_chant#1` 0.17×, `primary:toxic_domain` 0.17×, `primary:ice_shards` 0.18×, `limb:firebolt#0` 0.18×, `limb:ashen_vow#1` 0.2×.

Main effects at L40 over 26354 rows: strongest `primary:infernal_bombardment` 57.43×, `limb:shambler_horde#1` 56.98×, `skill:ice_shards` 17.66×, `limb:spirit_pyre#1` 16.36×, `primary:riftstep` 12.86×; weakest `limb:war_chant#1` 0.1×, `skill:summon_swarmlings` 0.11×, `skill:ruin` 0.15×, `limb:expose_weakness#0` 0.15×, `primary:serpent_ray` 0.15×.

**Other combinations far off the sum of their parts**, confirmed on fresh dice (16 tried):

- `class:runeweaver + support:parting_judgement + primary:lifedrain + unique:stormcall`: measured 87.3, its parts predict 10805.5. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoibGlmZWRyYWluIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJ2aWN0b3JzX3RlbXBvIiwiYWNjZWxlcmF0ZWQiXX0seyJpZCI6ImVtYmVyYmluZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImZsZWV0aW5nX2Rldm90aW9uIiwic2xvd19icmV3IiwicG9seXBob255IiwiYmxvb2RfdG9sbCJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImFyY2luZyIsInNsb3dfYnJldyIsInBhcnRpbmdfanVkZ2VtZW50Il19LHsiaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6InJhcmUiLCJzdXBwb3J0cyI6WyJyZWdpY2lkZSJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6MTk4MDAyNDQ2OSwidW5pcXVlcyI6eyJhbXVsZXQiOiJzdG9ybWNhbGwiLCJyaW5nMSI6ImVtYmVyYnJhbmQifX0:spar --seeds 30 --base-seed 1811021881`</details>
- `class:pyromancer + support:sundering_flight + unique:stormcall + support:channeled_tempest`: measured 23, its parts predict 893.1. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJweXJvbWFuY2VyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoicGVzdGlsZW50X25vdmEiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImJsb29kX3ByaWNlIiwidW50b3VjaGVkX21pZ2h0Il19LHsiaWQiOiJtYXJrIiwicmFyaXR5IjoicmFyZSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbImRlc3BlcmF0ZV9tZWFzdXJlcyIsImFjY2VsZXJhdGVkIiwicXVpZXRfaGFuZCJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImNoYW5uZWxlZF90ZW1wZXN0Iiwic3VuZGVyaW5nX2ZsaWdodCIsInNwb29saW5nIiwic2VyZW5lX3Bvd2VyIl19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6MTk4MjI1NTY3NywidW5pcXVlcyI6eyJhbXVsZXQiOiJzdG9ybWNhbGwiLCJib290cyI6ImZsZWV0ZmVhdGhlciJ9fQ:spar --seeds 30 --base-seed 1811021881`</details>
- `class:assassin + primary:raise_dead + support:chitinous_brood + support:dominion_tithe`: measured 0.5, its parts predict 88.2. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJhc3Nhc3NpbiIsImx2bCI6MjAsInNraWxscyI6W3siaWQiOiJyYWlzZV9kZWFkIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiY2hpdGlub3VzX2Jyb29kIiwiY2FzdF9vbl9ibGVlZCIsImdpZnRfb2ZfdGhlX2Nob2lyIiwiZG9taW5pb25fdGl0aGUiXSwibGltYiI6MH0seyJpZCI6Im9uZV90d28iLCJyYXJpdHkiOiJsZWdlbmRhcnkifV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjoxMjM5MzgyMTAzfQ:spar --seeds 30 --base-seed 1811021881`</details>

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
Bestiary: 19656 rows measured, 100 bodies not fielded (passive or immortal fixtures). 161 bodies never swung at a hero standing idle within reach, so their threat reads as unmeasured: 102 have no skills, 31 carry kits with no damage, 6 are rooted, 7 lie in ambush, 9 only fight once fought, and 6 have a damage kit and legs and did not swing in a duel either (`cloud_grazer`, `kettle_minnow`, `sand_scorpion`, `star_grazer`, `white_hart`, `wool_aphid`).
How the bodies fought: on an idle hero the median first blow lands at 0.98s. In a duel, 21% of casts are melee, a body spends 17% of the fight within its own melee reach, and it uses 2 skills. No body pressed a skill that was refused.
Skills: 2930 rows across the bands; 902 read zero alone and are not ranked (buffs, auras and mines show nothing without a partner), 30 warned.
Suites: 91 scenarios, 17 of 104 graded metrics outside their provisional band, 12 warned.
Matrix: 127,530 of 127,530 eligible pairs probed (100%), deep lane on 24011 pairs. Verdicts: effective 78555, blind 30610, inert 14500, cost_only 1428, negligible 2437.
Against the committed ledger (8481 rows): 12424 not on file, 1998 measuring healthy. The ledger only changes through `matrix check --reconcile`.

## What ran, and what did not

| lane | units planned | ok | gate breach | crashed/killed | out of time or not run | episodes | core-hours |
|---|---:|---:|---:|---:|---:|---:|---:|
| baselines | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| audits | 4 | 4 | 0 | 0 | 0 | 0 | 0 |
| expression | 1 | 1 | 0 | 0 | 0 | 1,208 | 0.2 |
| census | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| suites | 2 | 2 | 0 | 0 | 0 | 910 | 0.3 |
| progression | 39 | 39 | 0 | 0 | 0 | 12,480 | 4.6 |
| skills | 10 | 10 | 0 | 0 | 0 | 8,790 | 1.3 |
| skills_vs | 24 | 24 | 0 | 0 | 0 | 24,192 | 5 |
| matchups | 31 | 31 | 0 | 0 | 0 | 13,734 | 6 |
| bestiary | 39 | 39 | 0 | 0 | 0 | 39,312 | 8.2 |
| attributes | 39 | 39 | 0 | 0 | 0 | 4,914 | 2.2 |
| affixes | 6 | 6 | 0 | 0 | 0 | 3,472 | 1.3 |
| assists | 12 | 12 | 0 | 0 | 0 | 4,752 | 2.1 |
| socket_play | 1 | 1 | 0 | 0 | 0 | 900 | 0.2 |
| globals | 4 | 4 | 0 | 0 | 0 | 1,704 | 0.3 |
| matrix | 259 | 259 | 0 | 0 | 0 | 235,854 | 51.7 |
| matrix_deep | 121 | 121 | 0 | 0 | 0 | 113,604 | 20.2 |
| search | 40 | 40 | 0 | 0 | 0 | 209,722 | 36.5 |
| archive_confirm | 38 | 38 | 0 | 0 | 0 | 22,336 | 7.7 |
| proposals | 48 | 48 | 0 | 0 | 0 | 13,472 | 3.1 |

Every planned unit ran.

Not simulated at all, by design: zone generation and XP pacing, event pressure, multiplayer, and real player skill. Pilots are simple policies, so kit ceilings are floors. Bands stay provisional until you sign them off.
