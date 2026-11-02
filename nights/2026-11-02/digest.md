# Balance farm, night of 2026-11-02

Commit [1c62b30eda](https://github.com/arianna-arpg/arpg-game-world/commit/1c62b30edaa1ebf3b69243fc9b88d4c8d4c8d3ac), profile `full`. 624,645 episodes, 146.3 core-hours, 263 minutes end to end. [Run](https://github.com/arianna-arpg/arpg-game-world/actions/runs/41446083432).

## 🔴 Regressions

**11 new skill × support defect(s) since last night**: `essence_drain@borrowed_time|widening|inert`, `coda@measured_coda|slow_brew|inert`, `summon_skeleton@ossuary_duelists|fowlers_eye|inert`, `summon_skeleton@ossuary_duelists|trueflight|inert`, `heavy_strike@buried_maul|hunters_momentum|inert`, `haymaker@measured_hook|slow_brew|inert`, `reckoning@measured_sentence|slow_brew|inert`, `summon_bats|ravenous_pact|cost_only`, `summon_bats|warding_flesh|inert`, `bloodlust|slow_brew|inert`. Forensics: `npm run sim -- matrix explain <skill> <support>`.

## Engine defects

These are bugs in the game reachable in play, not balance findings. Each stays listed until it stops happening, and only a new one turns the night red.

**The engine stopped returning.** A real client would freeze here. The farm restarted past each one, so only that episode was lost:

- `EpisodeStalled: an episode ran past its time cap`: 2 episodes, ran past its time cap (240s). First seen in `search_spar_g_1ve239c8xkzr4`, seed 1767183472. <details><summary>stack and repro</summary>`update < runEpisode < (anonymous) < evaluateGenome < runSearch < searchRun < cmdSearch < main < (anonymous) < run`<br>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJuZWNyb21hbmNlciIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJib25lX29mZmVyaW5nIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbImNhc3Rfb25fZmxhd2xlc3MiLCJzb3Vsd2FsayIsImVmZmljaWVuY3kiXX0seyJpZCI6ImZpcmVfbWluZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInNpZWdlYnJlYWtlciIsInJlc291bmRpbmdfZWNobyIsInRhdXRfd2lyZSJdfSx7ImlkIjoiaWN5X2NvbWV0IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsibG9hZGVkX2RpY2UiLCJzdW1tb25fcGhhbnRhc20iLCJtZXRyb25vbWUiLCJzcGlyaXRfdG90ZW0iXX0seyJpZCI6InNlcnBlbnRfcmF5IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsidW1icmFsX3Bvd2VyIl19XSwib2ZmIjoiY3JpdCIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6MjAxNzU5MTI3NH0 --seeds 3 --base-seed 524972007 --stall-sec 60`</details>

## What moved since last night

200 row(s) moved past their own noise and 10%. Largest first:

| row | before | after | change |
|---|---:|---:|---:|
| `monster:hushmaiden:magician:L12:threat` | 0.11 | 9.94 | +8936% |
| `monster:spinney_matron:warrior:L5:threat` | 0.27 | 20.57 | +7519% |
| `monster:the_bellwether:magician:L12:threat` | 0.18 | 13.2 | +7233% |
| `skill:summon_bats:L20` | 1.6 | 115.89 | +7143% |
| `skill:summon_bats:L10` | 0.9 | 53.66 | +5862% |
| `monster:the_bellwether:warrior:L25:threat` | 0.16 | 8.11 | +4969% |
| `monster:vermin_piper:warrior:L5:threat` | 0.26 | 13.04 | +4915% |
| `monster:spinney_matron:warrior:L12:threat` | 0.41 | 18.63 | +4444% |
| `skill:summon_bats:L40` | 6.73 | 297.25 | +4317% |
| `skill:summon_bats:L5` | 0.83 | 31.95 | +3749% |
| `skill:summon_bats:L1` | 0.5 | 19.24 | +3748% |
| `monster:marshal_bhorog:magician:L25:threat` | 0.61 | 21.43 | +3413% |
| `monster:vermin_piper:magician:L12:threat` | 0.64 | 20.82 | +3153% |
| `monster:ophan_wheel:magician:L25:threat` | 0.55 | 17.63 | +3106% |
| `monster:vermin_piper:warrior:L12:threat` | 0.37 | 11.78 | +3084% |
| `monster:the_custodian:magician:L25:threat` | 0.57 | 17.96 | +3051% |
| `monster:marrow_tyrant:magician:L25:threat` | 0.49 | 15.27 | +3016% |
| `monster:bile_retcher:magician:L25:threat` | 0.17 | 5.22 | +2971% |
| `monster:marshal_bhorog:magician:L12:threat` | 0.71 | 21.43 | +2918% |
| `monster:spinney_matron:magician:L12:threat` | 1.27 | 37.71 | +2869% |
| `monster:spinney_matron:warrior:L25:threat` | 0.55 | 15.7 | +2755% |
| `monster:the_custodian:magician:L12:threat` | 0.64 | 17.75 | +2673% |
| `monster:the_bellwether:warrior:L5:threat` | 0.16 | 4.03 | +2419% |
| `monster:marshal_bhorog:magician:L5:threat` | 0.86 | 21.63 | +2415% |
| `monster:marshal_bhorog:warrior:L12:threat` | 0.35 | 8.72 | +2391% |

## Top proposed numbers

Advisory. Nothing here has been applied, and each needs your sign-off. Each row re-measured the subject on dice the night had not seen, solved for a number through the real game, and verified it at common seeds. 37 outlier(s) did not hold up on fresh dice, or landed within 15% of their target, and were dropped.

| # | subject | change | metric: before → after | cohort target | verdict | guards |
|---:|---|---|---|---:|---|---|
| 1 | class `trapper` | `skills.caltrops.baseDamage.physical.0`: 3 → 7.5 (+1 lines, ×2.5) | kill_rate: 0 → 0.1 | 0.1 | moved | none moved |
| 2 | skill `shambler_horde` | `monsters.grave_shambler.explodeOnDeath`: 2.2 → 0.88 | dps_dummy: 19394.7 → 7757.9 | 680.5 | moved, closes 62% | none moved |
| 3 | skill `arclight_rain` | `skills.arclight_rain.baseDamage.physical.0`: 5 → 2 (+3 lines, ×0.4) | dps_dummy: 348.2 → 139.3 | 93.2 | moved, closes 82% | none moved |
| 4 | skill `marshlight` | `skills.marshlight.baseDamage.chaos.0`: 9 → 3.6 (+1 lines, ×0.4) | dps_dummy: 266.6 → 106.7 | 98.9 | moved | none moved |
| 5 | skill `mirespume` | `skills.mirespume.baseDamage.chaos.0`: 11 → 4.5 (+1 lines, ×0.41) | dps_dummy: 244.1 → 100.1 | 98.9 | moved | none moved |
| 6 | skill `infernal_bombardment` | `monsters.bombard_demon.explodeOnDeath`: 1.6 → 0.67 | dps_dummy: 15916.2 → 6702.5 | 6676.7 | moved | none moved |
| 7 | support `fire_walker` | `supports.fire_walker.mods.0.value`: 0.5 → 0.2 (+1 lines, ×0.4) | dps_dummy: 61.4 → 32 | 16.5 | moved, closes 65% | none moved |
| 8 | skill `glare_ice` | `skills.glare_ice.baseDamage.cold.0`: 4 → 10 (+1 lines, ×2.5) | dps_dummy: 1.3 → 3.3 | 4 | moved, closes 72% | none moved |
| 9 | skill `scattergun` | `skills.scattergun.baseDamage.physical.0`: 4 → 10 (+1 lines, ×2.5) | dps_dummy: 7.4 → 18.4 | 23.6 | moved, closes 68% | none moved |
| 10 | skill `trailblaze` | `skills.trailblaze.baseDamage.fire.0`: 6 → 2.8 (+1 lines, ×0.46) | dps_dummy: 65.6 → 31.2 | 31.1 | moved | none moved |
| 11 | skill `earthrender` | `skills.earthrender.baseDamage.physical.0`: 12 → 6 (+1 lines, ×0.5) | dps_dummy: 187.1 → 93.6 | 93.2 | moved | none moved |
| 12 | support `sundering_flight` | `supports.sundering_flight.fissureTrail.damageScale`: 0.4 → 0.16 | dps_dummy: 49.4 → 30.1 | 19.1 | moved, closes 63% | none moved |
| 13 | skill `keening_shriek` | `skills.keening_shriek.baseDamage.physical.0`: 4 → 7.2 (+1 lines, ×1.8) | dps_dummy: 1.9 → 3.5 | 3.6 | moved | none moved |
| 14 | support `volley` | `supports.volley.mods[stat=damage].value`: -0.25 → -0.63 | dps_dummy: 92.6 → 46.3 | 53.9 | moved | none moved |
| 15 | monster_threat `seatless_usher` | `skills.ushers_lull.baseDamage.chaos.0`: 4 → 10 (+1 lines, ×2.5) | dps_in: 0 → 7.6 | 7.6 | moved | none moved |

<details><summary>Repro commands</summary>

1. `npm run sim -- whatif --knob 'skills.caltrops.baseDamage*2.5' --scenarios pressure:trapper:30 --seeds 30 --base-seed 2484937256`. Same change at other bands: `pressure:trapper:5` 0.4→0.7, `pressure:trapper:10` 0.2→0.6, `pressure:trapper:20` 0→0.2, `pressure:trapper:40` 0→0
2. `npm run sim -- whatif --knob 'monsters.grave_shambler.explodeOnDeath*0.4' --scenarios skill:shambler_horde:40 --seeds 30 --base-seed 2484937256`. Other dials on this metric (elasticity): cooldown -0.71, useTime -0.36. Same change at other bands: `skill:shambler_horde:5` 257.8→103.1, `skill:shambler_horde:10` 768.4→307.4, `skill:shambler_horde:20` 3055.9→1222.4
3. `npm run sim -- whatif --knob 'skills.arclight_rain.baseDamage*0.4' --scenarios skill:arclight_rain:40 --seeds 30 --base-seed 2484937256`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.18, useTime 0.17. Same change at other bands: `skill:arclight_rain:5` 153.4→61.3, `skill:arclight_rain:10` 186.1→74.4, `skill:arclight_rain:20` 235.1→94
4. `npm run sim -- whatif --knob 'skills.marshlight.baseDamage*0.4' --scenarios skill:marshlight:10 --seeds 30 --base-seed 2484937256`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.65, manaCost -0.03. Same change at other bands: `skill:marshlight:5` 226.5→90.6, `skill:marshlight:20` 315.7→126.3, `skill:marshlight:40` 453.7→181.5
5. `npm run sim -- whatif --knob 'skills.mirespume.baseDamage*0.41' --scenarios skill:mirespume:10 --seeds 30 --base-seed 2484937256`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.58. Same change at other bands: `skill:mirespume:5` 211.3→87.2, `skill:mirespume:20` 289→118.5, `skill:mirespume:40` 397.9→163.1
6. `npm run sim -- whatif --knob 'monsters.bombard_demon.explodeOnDeath*0.42' --scenarios skill:infernal_bombardment:40 --seeds 30 --base-seed 2484937256`. Other dials on this metric (elasticity): cooldown -0.81. Same change at other bands: `skill:infernal_bombardment:5` 239→102.2, `skill:infernal_bombardment:10` 685.3→291.3, `skill:infernal_bombardment:20` 2621.5→1106.3
7. `npm run sim -- whatif --knob 'supports.fire_walker.mods*0.4' --scenarios socketed:phoenix_dive:fire_walker:20 --seeds 30 --base-seed 2484937256`
8. `npm run sim -- whatif --knob 'skills.glare_ice.baseDamage*2.5' --scenarios skill:glare_ice:40 --seeds 30 --base-seed 2484937256`. Other dials on this metric (elasticity): cooldown -1.22, baseDamage 1. Same change at other bands: `skill:glare_ice:5` 0.8→2, `skill:glare_ice:10` 0.9→2.2, `skill:glare_ice:20` 1→2.6
9. `npm run sim -- whatif --knob 'skills.scattergun.baseDamage*2.5' --scenarios skill:scattergun:10 --seeds 30 --base-seed 2484937256`. Other dials on this metric (elasticity): baseDamage 1. Same change at other bands: `skill:scattergun:5` 6.6→16.6, `skill:scattergun:20` 8.8→22, `skill:scattergun:40` 11.8→29.5
10. `npm run sim -- whatif --knob 'skills.trailblaze.baseDamage*0.46' --scenarios skill:trailblaze:20 --seeds 30 --base-seed 2484937256`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.78. Same change at other bands: `skill:trailblaze:5` 50.4→24.6, `skill:trailblaze:10` 56.5→27.2, `skill:trailblaze:40` 86.4→40.3
11. `npm run sim -- whatif --knob 'skills.earthrender.baseDamage*0.5' --scenarios skill:earthrender:40 --seeds 30 --base-seed 2484937256`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.77, useTime -0.28. Same change at other bands: `skill:earthrender:5` 108.7→54.3, `skill:earthrender:10` 121.6→60.8, `skill:earthrender:20` 141.1→70.6
12. `npm run sim -- whatif --knob 'supports.sundering_flight.fissureTrail.damageScale*0.4' --scenarios socketed:ball_lightning:sundering_flight:20 --seeds 30 --base-seed 2484937256`
13. `npm run sim -- whatif --knob 'skills.keening_shriek.baseDamage*1.8' --scenarios skill:keening_shriek:40 --seeds 30 --base-seed 2484937256`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.76. Same change at other bands: `skill:keening_shriek:5` 1.2→2.1, `skill:keening_shriek:10` 1.3→2.4, `skill:keening_shriek:20` 1.5→2.8
14. `npm run sim -- whatif --knob 'supports.volley.mods[stat=damage].value*2.5' --scenarios socketed:soulflay:volley:20 --seeds 30 --base-seed 2484937256`
15. `npm run sim -- whatif --knob 'skills.ushers_lull.baseDamage*2.5' --scenarios threat:starter_magician_l25:seatless_usher:25 --seeds 30 --base-seed 2484937256`. Other dials on this metric (elasticity): kit.ushers_lull 17.44. Same change at other bands: `threat:starter_magician_l5:seatless_usher:5` 2→5, `threat:starter_magician_l10:seatless_usher:10` 0.7→4.9, `threat:starter_magician_l20:seatless_usher:20` 0.6→7.1, `threat:starter_magician_l40:seatless_usher:40` 0.3→11.3

Run from commit `1c62b30edaa1ebf3b69243fc9b88d4c8d4c8d3ac`.
</details>

Too noisy to call: class `beguiler`, class `firebrand`, class `hivecaller`, class `assassin`. The solved number moved each by less than its own seed-to-seed spread, so these need a calmer rig or more seeds before they mean anything.

### Combinations that run away

Confirmed on fresh dice at 20 times or more what their parts predict. A number this far out usually means damage feeding itself, so no single number fixes it: each needs a call on whether the feedback should be bounded.

- `class:resonator + support:terminal_velocity + support:remnants + support:unblinking`: measured 1.7e+12 damage per second, its parts predict 1600.5. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJyZXNvbmF0b3IiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoibWFyayIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImVtYmFyZ28iLCJkZXNwZXJhdGVfbWVhc3VyZXMiLCJyYXZlbmluZyIsInRlcm1pbmFsX3ZlbG9jaXR5Il19LHsiaWQiOiJldmlzY2VyYXRlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiYm9uZGJyZWFrZXIiLCJhenVyZV9oYXJ2ZXN0IiwibGltYnJlYXZlciIsImJhdHRlcmluZ19yYW0iXSwibGltYiI6MH0seyJpZCI6Im9yYl9vZl9zdG9ybXMiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInJlbW5hbnRzIiwidGlua2Vyc19hcnNlbmFsIl19LHsiaWQiOiJuZXRoZXJmaXNzdXJlIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJxdWlldF9oYW5kIiwidW5ibGlua2luZyJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImxpZmUiLCJnZWFyIjoicmFyZSIsImdzIjo4MjEyODg5NzgsInVuaXF1ZXMiOnsiY2hlc3QiOiJkdWVsaXN0c19sZWRnZXIiLCJyaW5nMSI6ImNvYWxfcmVtZW1iZXJlZCJ9fQ:spar --seeds 30 --base-seed 2484937256`</details>
- `class:hivecaller + support:terminal_velocity + support:remnants + support:unblinking`: measured 1.5e+8 damage per second, its parts predict 1971. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJoaXZlY2FsbGVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6Im1hcmsiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJlbWJhcmdvIiwiZGVzcGVyYXRlX21lYXN1cmVzIiwicmF2ZW5pbmciLCJ0ZXJtaW5hbF92ZWxvY2l0eSJdfSx7ImlkIjoiZXZpc2NlcmF0ZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImJvbmRicmVha2VyIiwiYXp1cmVfaGFydmVzdCIsImxpbWJyZWF2ZXIiLCJiYXR0ZXJpbmdfcmFtIl0sImxpbWIiOjB9LHsiaWQiOiJvcmJfb2Zfc3Rvcm1zIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJyZW1uYW50cyIsInRpbmtlcnNfYXJzZW5hbCJdfSx7ImlkIjoibmV0aGVyZmlzc3VyZSIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicXVpZXRfaGFuZCIsInVuYmxpbmtpbmciXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJsaWZlIiwiZ2VhciI6InJhcmUiLCJncyI6MTMxNTYyMzc3OCwidW5pcXVlcyI6eyJjaGVzdCI6ImR1ZWxpc3RzX2xlZGdlciIsInJpbmcxIjoiY29hbF9yZW1lbWJlcmVkIn19:spar --seeds 30 --base-seed 2484937256`</details>
- `class:berserker + primary:glass_lance + support:spell_cascade + support:poison_chance`: measured 19050.6 damage per second, its parts predict 90.4. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZ2xhc3NfbGFuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJwb2ludF9ibGFuayIsInNoYXR0ZXJnbGFzcyJdfSx7ImlkIjoic2FuZ3VpbmVfYnVyc3QiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzcGVsbF9jYXNjYWRlIiwiYWRkbGluZyIsInBvaXNvbl9jaGFuY2UiXSwibGltYiI6MX0seyJpZCI6Imh1c2hfb2ZfdGhlX3dha2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJ1bmxlYXNoIiwid2lsZF9hYmFuZG9uIl19LHsiaWQiOiJpbmZlcm5hbF9ib21iYXJkbWVudCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbIndhcmRpbmdfZmxlc2giLCJyZWdpY2lkZSIsImNvbW11bmFsX3JpdGVzIiwiYnVyaWVkX2NoYXJnZSJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6ODY5Nzg4NTE3LCJ1bmlxdWVzIjp7Imdsb3ZlcyI6ImdhbGV3cmlnaHRzIn19:spar --seeds 30 --base-seed 2484937256`</details>
- `class:sorcerer + unique:titans_grasp + support:parting_gift + support:accelerando`: measured 206.5 damage per second, its parts predict 8.1. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJzb3JjZXJlciIsImx2bCI6NSwic2tpbGxzIjpbeyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJhY2NlbGVyYW5kbyIsImVmZmljaWVuY3kiXX0seyJpZCI6InJlcHVsc29yX2JlYWNvbiIsInJhcml0eSI6Im1hZ2ljIn0seyJpZCI6Im1pcmVzcHVtZSIsInJhcml0eSI6Im1hZ2ljIiwib3ZlciI6MSwic3VwcG9ydHMiOlsicGFydGluZ19naWZ0Il19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJtYWdpYyIsImdzIjoxNDAwMzMxNjMzLCJ1bmlxdWVzIjp7ImJvb3RzIjoid2FuZGVyZXJzX3dha2UiLCJnbG92ZXMiOiJ0aXRhbnNfZ3Jhc3AifX0:spar --seeds 30 --base-seed 2484937256`</details>
- `class:chronomancer + unique:titans_grasp + support:fortunes_favor + primary:orb_of_storms`: measured 196.7 damage per second, its parts predict 4.2. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJvcmJfb2Zfc3Rvcm1zIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJodW50ZXJzX21vbWVudHVtIl19LHsiaWQiOiJzb3VsX3ZvbGxleSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImZvcnR1bmVzX2Zhdm9yIiwidm9ydGV4IiwiY3JpbXNvbl9oYXJ2ZXN0IiwiY29uY3Vzc2l2ZV9ibG93cyJdfSx7ImlkIjoiZ3Jhc3BpbmdfY2hhc20iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzcGVsbF9jYXNjYWRlIiwidm9sY2FuaWNfaGVhcnQiLCJwZXJmZWN0X2RyYXciLCJjaGFtYmVyZWRfY2FzdGluZyJdfSx7ImlkIjoiZGVzcGFpciIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbInVudG91Y2hlZF9taWdodCIsInR1cmJ1bGVuY2UiLCJmcm9zdGJpdGVfZ3JpcCJdLCJsaW1iIjowfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJsaWZlIiwiZ2VhciI6Im1hZ2ljIiwiZ3MiOjE1NTE3MTA0MzIsInVuaXF1ZXMiOnsiY2hlc3QiOiJhZWdpc19vZl90aGVfZHJvd25lZCIsImdsb3ZlcyI6InRpdGFuc19ncmFzcCJ9fQ:spar --seeds 30 --base-seed 2484937256`</details>
- `class:cryomancer + support:smothering_spores + support:ostinato + support:alacrity`: measured 155.3 damage per second, its parts predict 4.2. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJjcnlvbWFuY2VyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoiZXhwb3NlX3dlYWtuZXNzIiwicmFyaXR5IjoibWFnaWMiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJhdF90aGVfYnJpbmsiLCJvc3RpbmF0byJdLCJsaW1iIjowfSx7ImlkIjoibWlyZXNwdW1lIiwicmFyaXR5IjoibWFnaWMifSx7ImlkIjoiY2FyaWxsb24iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzbW90aGVyaW5nX3Nwb3JlcyIsImF1c3Rlcml0eSIsInN0b3JlZF92ZXJkaWN0IiwiY3VsbWluYXRpb24iXX0seyJpZCI6Imxhc3Rfcml0ZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImFsYWNyaXR5IiwiY2FzdF9vbl9kYW1hZ2VfdGFrZW4iLCJjYXN0X29uX2JsZWVkIl19XSwib2ZmIjoiY3JpdCIsImRlZiI6ImxpZmUiLCJnZWFyIjoibWFnaWMiLCJncyI6OTE0NzExNTAyLCJ1bmlxdWVzIjp7ImJvb3RzIjoiZmxlZXRmZWF0aGVyIn19:spar --seeds 30 --base-seed 2484937256`</details>

### Flagged for your decision

The numbers an author would reach for did not move these enough. They are not proposals: each needs a call on whether the mechanic is right, and none has been touched.

- skill `hurricane`: The numbers an author would reach for barely move this: skills.hurricane.baseDamage ×2.5 closes 14%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `chronomancer`: The numbers an author would reach for barely move this: skills.stasis_lock.baseDamage ×2.5 closes 5%; classes.chronomancer.attributes ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `wallwright`: The numbers an author would reach for barely move this: skills.stone_rampart.baseDamage ×1 closes 0%; skills.toppling_stroke.baseDamage ×2.5 closes 14%; skills.shield_charge.baseDamage ×2.5 closes 3%; skills.stone_rampart.baseDamage & skills.toppling_stroke.baseDamage & skills.shield_charge.baseDamage ×2.5 closes 17%; classes.wallwright.attributes ×2.5 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `necromancer`: The numbers an author would reach for barely move this: skills.poison_nova.baseDamage ×0.4 closes 5%; skills.despair.baseDamage ×1 closes 0%; skills.poison_nova.baseDamage & skills.despair.baseDamage ×0.4 closes 5%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- support `resounding_echo`: The numbers an author would reach for barely move this: supports.resounding_echo.mods ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `sharper`: The numbers an author would reach for barely move this: skills.thrown_ace.baseDamage ×1 closes 0%; classes.sharper.attributes ×2.5 closes 17%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `stygian_doll`: The numbers an author would reach for barely move this: monsters.stygian_doll.base.life ×2.4 closes 1%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `grave_shambler`: The numbers an author would reach for barely move this: monsters.grave_shambler.base.life ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `amalgam_bonelord`: The numbers an author would reach for barely move this: monsters.amalgam_bonelord.base.life ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.

## Outliers

413 rows sit far from their cohort (log-scale median and MAD, z ≥ 3 and a ratio past 1.8× or 0.55×), 98 of them new tonight. Warned rows and zero rows never enter a cohort.

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
|  | support | `resounding_echo` | output_multiplier | 2.1 | 1 | 2.04× | 12.1 | supports · effective hosts |
|  | support | `crescendo` | output_multiplier | 2.1 | 1 | 2.02× | 12 | supports · effective hosts |
|  | support | `septic_bargain` | output_multiplier | 0.5 | 1 | 0.5× | -12 | supports · effective hosts |
|  | class | `chronomancer` | kill_rate | 0 | 0.5 | 0.04× | -11.9 | L10 · geared · pressure · kill_rate |
|  | monster_threat | `seatless_usher` | dps_in | 0 | 17.4 | 0× | -11.9 | L25 · magician · body |
|  | support | `volley` | output_multiplier | 2 | 1 | 1.92× | 11.1 | supports · effective hosts |
|  | support | `elemental_conduction` | output_multiplier | 1.9 | 1 | 1.82× | 10.2 | supports · effective hosts |
| 🆕 | interaction | `class:resonator + support:terminal_velocity + support:remnants + support:unblinking` | dps_out | 3045312.8 | 1600.5 | 1902.7× | 9.1 | L40 main effects |
|  | affix | `attr_willpower` | dps_out | 137.6 | 159.7 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `crowd_damage` | dps_out | 185.9 | 212.3 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `dmg_cold` | dps_out | 141.2 | 159.7 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `drowned_regalia` | dps_out | 134.4 | 150.5 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `duration` | dps_out | 131.7 | 150.5 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `es_pct` | dps_out | 131.6 | 150.5 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `evasion_pct` | dps_out | 131.8 | 150.5 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `hybrid_armor_evasion` | dps_out | 131.6 | 150.5 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `hybrid_life_mana` | dps_out | 137.6 | 159.7 | 0.06× | -9.1 | L20 · magician · affix output |

<details><summary>Re-measure any of these</summary>

- sundering_flight: `npm run sim -- run --refs socketed:ball_lightning:sundering_flight:20 --seeds 10`
- fire_walker: `npm run sim -- run --refs socketed:phoenix_dive:fire_walker:20 --seeds 10`
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:30:geared --seeds 10`
- scorched_wake: `npm run sim -- run --refs socketed:blinding_ichor:scorched_wake:20 --seeds 10`
- mounting_frenzy: `npm run sim -- run --refs socketed:serpent_ray:mounting_frenzy:20 --seeds 10`
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:20:geared --seeds 10`
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:40:geared --seeds 10`
- austerity: `npm run sim -- run --refs socketed:corpse_explosion:austerity:20 --seeds 10`
- resounding_echo: `npm run sim -- run --refs socketed:aftershock_snare:resounding_echo:20 --seeds 10`
- crescendo: `npm run sim -- run --refs socketed:immolation_blast:crescendo:20 --seeds 10`
- septic_bargain: `npm run sim -- run --refs socketed:pillar_of_flame:septic_bargain:20 --seeds 10`
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:10:geared --seeds 10`
- seatless_usher: `npm run sim -- run --refs threat:starter_magician_l25:seatless_usher:25 --seeds 10`
- volley: `npm run sim -- run --refs socketed:soulflay:volley:20 --seeds 10`
- elemental_conduction: `npm run sim -- run --refs socketed:ballista_sentry:elemental_conduction:20 --seeds 10`
- attr_willpower: `npm run sim -- run --refs affix:magician:20:helmet:attr_willpower:5352222:spar --seeds 10`
- crowd_damage: `npm run sim -- run --refs affix:magician:20:gloves:crowd_damage:5352222:spar --seeds 10`
- dmg_cold: `npm run sim -- run --refs affix:magician:20:helmet:dmg_cold:10397677:spar --seeds 10`
- drowned_regalia: `npm run sim -- run --refs affix:magician:20:helmet:drowned_regalia:5352222:spar --seeds 10`
- duration: `npm run sim -- run --refs affix:magician:20:helmet:duration:10397677:spar --seeds 10`
- es_pct: `npm run sim -- run --refs affix:magician:20:helmet:es_pct:10397677:spar --seeds 10`
- evasion_pct: `npm run sim -- run --refs affix:magician:20:helmet:evasion_pct:10397677:spar --seeds 10`
- hybrid_armor_evasion: `npm run sim -- run --refs affix:magician:20:helmet:hybrid_armor_evasion:10397677:spar --seeds 10`
- hybrid_life_mana: `npm run sim -- run --refs affix:magician:20:helmet:hybrid_life_mana:5352222:spar --seeds 10`

</details>

## Build search

80,558 candidates tonight (18,028 refused by the real gates), 251,745 over 4 night(s). The archive holds 1400 elite rows; 1363 were re-measured on this commit and 1 no longer pass the gates. Tried so far in a legal build: 39 of 39 classes, 576 of 576 primarys, 604 of 604 skills, 454 of 455 supports, 41 of 41 uniques.

| band | objective | build (top factors) | value | × band median | repro |
|---|---|---|---:|---:|---|
| L5 | offense | `class:chronomancer` `off:crit` `def:life` `gear:rare` `skill:orb_of_storms` | 3740.3 | 122.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJvcmJfb2Zfc3Rvcm1zIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJodW50ZXJzX21vbWVudHVtIl19LHsiaWQiOiJncmFzcGluZ19jaGFzbSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInByb3ZvY2F0aW9uIiwic2xvd19tYXRjaCIsImFjY2VsZXJhbmRvIiwiZGVzcGVyYXRpb24iXX0seyJpZCI6ImdsYWNpYWxfcmFtcGFydCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInNsb3dfbWF0Y2giXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjE2NzM4NDg3MTcsInVuaXF1ZXMiOnsiYm9vdHMiOiJ3YW5kZXJlcnNfd2FrZSIsInJpbmcxIjoiZW1iZXJicmFuZCJ9fQ --seeds 8 --base-seed 1633080589`</details> |
| L5 | offense | `class:chronomancer` `off:crit` `def:life` `gear:rare` `skill:venom_bolt` | 2874.6 | 94.4× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJ2ZW5vbV9ib2x0IiwicmFyaXR5IjoibWFnaWMifSx7ImlkIjoiZ3Jhc3BpbmdfY2hhc20iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJwcm92b2NhdGlvbiIsInNsb3dfbWF0Y2giLCJhY2NlbGVyYW5kbyIsImVudHJvcGljX2Jsb29tIl19LHsiaWQiOiJnbGFjaWFsX3JhbXBhcnQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzbG93X21hdGNoIl19XSwib2ZmIjoiY3JpdCIsImRlZiI6ImxpZmUiLCJnZWFyIjoicmFyZSIsImdzIjoxNjczODQ4NzE3fQ --seeds 8 --base-seed 3879011899`</details> |
| L5 | clear | `class:chronomancer` `off:damage` `def:none` `gear:rare` `skill:rolling_cannonade` | 6 | 15× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJyb2xsaW5nX2Nhbm5vbmFkZSIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiY29sb3NzYWwiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjoxNDMwNTA0OTA4LCJ1bmlxdWVzIjp7ImFtdWxldCI6InN0b3JtY2FsbCIsImhlbG1ldCI6ImdyYXZlYmxvb20ifX0 --seeds 8 --base-seed 1633080589`</details> |
| L5 | clear | `class:sorcerer` `off:speed` `def:armor` `gear:rare` `skill:mark` | 6 | 15× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzb3JjZXJlciIsImx2bCI6NSwic2tpbGxzIjpbeyJpZCI6Im1hcmsiLCJyYXJpdHkiOiJtYWdpYyIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImRlZXBfcmVzZXJ2ZXMiLCJjaGFtYmVyZWRfY2FzdGluZyJdfSx7ImlkIjoiZG9vbV9iZWxsIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJ3aWxkX2FiYW5kb24iLCJjcm93ZF9mYXZvciJdfSx7ImlkIjoidHJhbnNncmVzc2lvbiIsInJhcml0eSI6Im1hZ2ljIn1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6MTE0Mzg3NjQzOCwidW5pcXVlcyI6eyJnbG92ZXMiOiJ0aXRhbnNfZ3Jhc3AiLCJoZWxtZXQiOiJncmF2ZWJsb29tIn19 --seeds 8 --base-seed 1588628146`</details> |
| L10 | offense | `class:magician` `off:damage` `def:life` `gear:rare` `skill:mark` | 8905.8 | 225.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJtYXJrIiwicmFyaXR5IjoicmFyZSJ9LHsiaWQiOiJncmFzcGluZ19jaGFzbSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInByb3ZvY2F0aW9uIiwidHJpYW5nbGVfc2lnaWwiLCJhY2NlbGVyYW5kbyIsImRlc3BlcmF0aW9uIl19LHsiaWQiOiJjb3Jwc2VfZXhwbG9zaW9uIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJ1bnN0YWJsZV9jb21wcmVzc2lvbiIsInNwaXJpdF90b3RlbSJdLCJsaW1iIjowfSx7ImlkIjoiZ2xhY2llcl9jcm93biIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoxfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImxpZmUiLCJnZWFyIjoicmFyZSIsImdzIjo0MzIzNTYyMTN9 --seeds 8 --base-seed 4268677964`</details> |
| L10 | offense | `class:beguiler` `off:crit` `def:armor` `gear:rare` `skill:shadow_clone` | 7881.8 | 199.7× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJiZWd1aWxlciIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJzaGFkb3dfY2xvbmUiLCJyYXJpdHkiOiJyYXJlIiwib3ZlciI6Miwic3VwcG9ydHMiOlsicXVhaWxiYW5lIiwiZ2F0aGVyZWRfY2FzdGluZyIsImdpYW50c2JhbmUiXSwibGltYiI6MH0seyJpZCI6ImdyYXNwaW5nX2NoYXNtIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZmxlZXRmb290Iiwic2Vpc21pY19tYXJjaCIsImFjY2VsZXJhbmRvIiwiZGVzcGVyYXRpb24iXX0seyJpZCI6IndpbGR3aXNwIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiYnVsd2Fya19zaGFyZHMiLCJtYW5hX2ZlZWRlciIsInZvcnRleCIsImJsb29kX3ByaWNlIl19LHsiaWQiOiJneXJlX2h1cmwiLCJyYXJpdHkiOiJsZWdlbmRhcnkifV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjE3NzgwMDA3MDMsInVuaXF1ZXMiOnsiYmVsdCI6IndpbnRlcl9hZnRlcl95b3UifX0 --seeds 8 --base-seed 2164883235`</details> |
| L10 | clear | `class:skald` `off:crit` `def:ward` `gear:rare` `skill:mark` | 6 | 21.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJza2FsZCIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJtYXJrIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbImRlbGliZXJhdGVfcnVpbiIsIm9zdGluYXRvIiwiY3Jvd2RfZmF2b3IiXX0seyJpZCI6ImJhbG1jbG91ZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImFwb3RoZW9zaXMiLCJsaW1icmVhdmVyIiwic2llZ2VicmVha2VyIl19LHsiaWQiOiJsb25nX2NvbGQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzaWVnZWJyZWFrZXIiLCJ3aWRlbmluZyIsIm1hbmFfZmVlZGVyIl0sImxpbWIiOjB9LHsiaWQiOiJjaXJydXNfdmVpbCIsInJhcml0eSI6ImxlZ2VuZGFyeSJ9XSwib2ZmIjoiY3JpdCIsImRlZiI6IndhcmQiLCJnZWFyIjoicmFyZSIsImdzIjoxMDQyNjIwMDYzLCJ1bmlxdWVzIjp7ImJvb3RzIjoid2FuZGVyZXJzX3dha2UiLCJyaW5nMSI6ImNvYWxfcmVtZW1iZXJlZCJ9fQ --seeds 8 --base-seed 4271224808`</details> |
| L10 | clear | `class:warlord` `off:speed` `def:ward` `gear:rare` `skill:blood_mortgage` | 6 | 21.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJ3YXJsb3JkIiwibHZsIjoxMCwic2tpbGxzIjpbeyJpZCI6ImJsb29kX21vcnRnYWdlIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbImFjY2VsZXJhdGVkIl0sImxpbWIiOjB9LHsiaWQiOiJkb29tX2JlbGwiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJtZWFzdXJlZF9ibGFkZSJdfSx7ImlkIjoia2VlbmluZ19zaHJpZWsiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzcXVhcmVfc2lnaWwiLCJjYXN0X3doaWxlX2NoYW5uZWxpbmciLCJjb25jdXNzaXZlX2Jsb3dzIiwic2hhdHRlcmdsYXNzIl19LHsiaWQiOiJoZWFsaW5nX3N0cmVhbSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbIndyYWl0aF9wYXNzYWdlIiwiZGVzcGVyYXRlX21lYXN1cmVzIiwic2xvd19icmV3Il19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJ3YXJkIiwiZ2VhciI6InJhcmUiLCJncyI6MzY3NzczNjIwLCJ1bmlxdWVzIjp7ImJvb3RzIjoid2FuZGVyZXJzX3dha2UiLCJyaW5nMSI6InNoYXJlZF9jdXAifX0 --seeds 8 --base-seed 3347076748`</details> |
| L20 | offense | `class:sentinel` `off:damage` `def:evasion` `gear:rare` `skill:emberbind` | 79455 | 1054.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzZW50aW5lbCIsImx2bCI6MjAsInNraWxscyI6W3siaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJmbGVldGluZ19kZXZvdGlvbiIsInNsb3dfYnJldyIsInBvbHlwaG9ueSIsImJsb29kX3RvbGwiXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJhcmNpbmciLCJzbG93X2JyZXciLCJwYXJ0aW5nX2p1ZGdlbWVudCJdfSx7ImlkIjoiZWFydGhyZW5kZXIiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJjbGFtb3IiLCJ0aW1lX2Z1c2UiLCJsaW5nZXJpbmciLCJjaGFtYmVyZWRfY2FzdGluZyJdfSx7ImlkIjoicGVzdGlsZW50X25vdmEiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJtb25vbGl0aCIsInNocmVkZGluZ19yZXR1cm4iXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6MTY4MTc2MjQzNywidW5pcXVlcyI6eyJib290cyI6InJpbWV3YWtlIiwiaGVsbWV0IjoiY2luZGVydmlnaWwifX0 --seeds 8 --base-seed 3709614212`</details> |
| L20 | offense | `class:magician` `off:crit` `def:life` `gear:rare` `skill:stormbind` | 52688.3 | 699.4× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6MjAsInNraWxscyI6W3siaWQiOiJzdG9ybWJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJ0ZW1wZXN0X3JhbmdlIl19LHsiaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJmbGVldGluZ19kZXZvdGlvbiIsInNsb3dfYnJldyIsInBvbHlwaG9ueSIsImJsb29kX3RvbGwiXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJhcmNpbmciLCJzbG93X2JyZXciLCJwYXJ0aW5nX2p1ZGdlbWVudCJdfSx7ImlkIjoiZWFydGhyZW5kZXIiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJjbGFtb3IiLCJ0aW1lX2Z1c2UiLCJsaW5nZXJpbmciLCJjaGFtYmVyZWRfY2FzdGluZyJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJsaWZlIiwiZ2VhciI6InJhcmUiLCJncyI6MTY2MDA1MjY0N30 --seeds 8 --base-seed 4268677964`</details> |
| L20 | clear | `class:resonator` `off:damage` `def:armor` `gear:rare` `skill:frost_pulse` | 6 | 21.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJyZXNvbmF0b3IiLCJsdmwiOjIwLCJza2lsbHMiOlt7ImlkIjoiZnJvc3RfcHVsc2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxfSx7ImlkIjoiZG9vbV9iZWxsIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2hhdHRlcmdsYXNzIiwiZmxvd2JyZWFrZXIiLCJ1cHJvb3RlciJdfSx7ImlkIjoic291bGZsYXkiLCJyYXJpdHkiOiJsZWdlbmRhcnkifV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6MTY3MzQ5ODI5MX0 --seeds 8 --base-seed 2129200011`</details> |
| L20 | clear | `class:runeweaver` `off:speed` `def:evasion` `gear:rare` `skill:fire_mine` | 6 | 21.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImZpcmVfbWluZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInNpZWdlYnJlYWtlciIsInJlc291bmRpbmdfZWNobyIsInRhdXRfd2lyZSIsImNhc2NhZGUiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjU2OTM1OTM2MywidW5pcXVlcyI6eyJhbXVsZXQiOiJjaW5kZXJfY29uZHVjdG9yIn19 --seeds 8 --base-seed 3709614212`</details> |
| L40 | offense | `class:hivecaller` `off:damage` `def:ward` `gear:rare` `skill:infernal_bombardment` | 132608.6 | 1763.9× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJoaXZlY2FsbGVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImluZmVybmFsX2JvbWJhcmRtZW50IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiY2FzY2FkZSIsInZpb2xlbnRfYXJyaXZhbCIsIm1vbm9saXRoIiwiYnJpbXN0b25lX3RpdGhlIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjg4MDEyMzk4MiwidW5pcXVlcyI6eyJjaGVzdCI6InRoZV91bm1vdmVkIn19 --seeds 8 --base-seed 3542169003`</details> |
| L40 | offense | `class:brawler` `off:crit` `def:none` `gear:rare` `skill:eviscerate` | 102546.3 | 1364× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJicmF3bGVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImV2aXNjZXJhdGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJncmFzcGluZ190ZW5kcmlscyIsImdpYW50c2JhbmUiLCJhenVyZV9oYXJ2ZXN0Iiwic2VyZW5lX3Bvd2VyIl0sImxpbWIiOjF9LHsiaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYWxhY3JpdHkiLCJwb2x5cGhvbnkiLCJhdXN0ZXJpdHkiLCJhcG90aGVvc2lzIl19LHsiaWQiOiJzaGF0dGVyY2hvcmQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInJlc291bmRpbmdfZWNobyIsImNhc2NhZGUiXSwibGltYiI6MX0seyJpZCI6InN0ZWFsdGgiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJibG9vZF9wcmljZSIsImRlZXBfcmVzZXJ2ZXMiLCJhbGFjcml0eSJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6OTIyNjk4NzAzLCJ1bmlxdWVzIjp7ImFtdWxldCI6InN0b3JtY2FsbCIsImJvb3RzIjoiY2luZGVyc3RlcCJ9fQ --seeds 8 --base-seed 3045243181`</details> |
| L40 | clear | `class:vanguard` `off:speed` `def:evasion` `gear:rare` `skill:mark` | 6 | 25.4× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJ2YW5ndWFyZCIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiYmxvb2RfcHJpY2UiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjExMTg1MTEyNjcsInVuaXF1ZXMiOnsiY2hlc3QiOiJhZWdpc19vZl90aGVfZHJvd25lZCIsImdsb3ZlcyI6ImdhbGV3cmlnaHRzIn19 --seeds 8 --base-seed 1032093308`</details> |
| L40 | clear | `class:warlord` `off:crit` `def:evasion` `gear:rare` `skill:detonate_mines` | 6 | 25.4× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJ3YXJsb3JkIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImRldG9uYXRlX21pbmVzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiZG9taW5pb25fdGl0aGUiLCJzdG9yZWRfdmVyZGljdCIsImNoYW1iZXJlZF9jYXN0aW5nIiwibW9ub2xpdGgiXX0seyJpZCI6ImJlY2tvbl9wYWxld2lzcHMiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsiZXBoZW1lcmFsIiwic2FuZ3VpbmVfZmVlZCJdfSx7ImlkIjoibG9uZ19jb2xkIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsic2llZ2VicmVha2VyIiwiZG9taW5pb25fdGl0aGUiLCJ3aWRlbmluZyIsIm1hbmFfZmVlZGVyIl0sImxpbWIiOjB9LHsiaWQiOiJjaXJydXNfdmVpbCIsInJhcml0eSI6ImxlZ2VuZGFyeSJ9XSwib2ZmIjoiY3JpdCIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjoxNzc0MzEwNTIyLCJ1bmlxdWVzIjp7ImFtdWxldCI6ImJlbGx3ZXRoZXIiLCJjaGVzdCI6InRoZV91bm1vdmVkIn19 --seeds 8 --base-seed 3347076748`</details> |

Playstyles at L5, best build found per style against the band's median style (50 styles): strongest `construct · chaos` 3608.2 (3.31×), `projectile · chaos` 2896.6 (2.66×), `self · lightning` 2776.4 (2.55×), `self · physical` 2711 (2.49×); weakest `mark · cold` 380.5 (0.35×), `detonate · chaos` 417.8 (0.38×), `mark · fire` 507.2 (0.47×), `detonate · physical` 543.5 (0.5×).

Playstyles at L10, best build found per style against the band's median style (50 styles): strongest `mark · lightning` 8775.5 (2.8×), `construct · cold` 8017.3 (2.56×), `aura · cold` 7319.8 (2.33×), `area · lightning` 6596.7 (2.1×); weakest `target · cold` 651.3 (0.21×), `court · physical` 965.2 (0.31×), `court · lightning` 1104.7 (0.35×), `self · fire` 1316.3 (0.42×).

Playstyles at L20, best build found per style against the band's median style (50 styles): strongest `aura · physical` 484504.5 (49.09×), `melee · physical` 377356.5 (38.23×), `aura · fire` 76999.7 (7.8×), `aura · chaos` 53099 (5.38×); weakest `court · physical` 1899 (0.19×), `detonate · fire` 1932.1 (0.2×), `mark · lightning` 2610.9 (0.26×), `detonate · chaos` 2765 (0.28×).

Playstyles at L40, best build found per style against the band's median style (50 styles): strongest `melee · physical` 507614.2 (34.65×), `projectile · physical` 236707.5 (16.16×), `court · fire` 134822.9 (9.2×), `target · chaos` 133109.9 (9.09×); weakest `mark · cold` 3166 (0.22×), `target · fire` 5668.5 (0.39×), `target · lightning` 6029.7 (0.41×), `construct · physical` 6298.8 (0.43×).

Main effects at L5 over 8064 rows: strongest `skill:grasping_chasm` 12.98×, `skill:bonespray` 9.86×, `skill:infernal_bombardment` 9.47×, `primary:surgewind` 7.25×, `skill:shambler_horde` 6×; weakest `skill:raise_gnatveil` 0.2×, `skill:soul_volley` 0.21×, `primary:web_shot` 0.26×, `skill:repulsor_beacon` 0.26×, `limb:expose_weakness#0` 0.27×.

Main effects at L10 over 12509 rows: strongest `limb:shambler_horde#1` 14.96×, `skill:grasping_chasm` 13.97×, `skill:bonespray` 9.12×, `skill:undertow` 7.41×, `skill:infernal_bombardment` 6.88×; weakest `primary:deathwatch` 0.18×, `skill:epidemic` 0.18×, `primary:beguile` 0.2×, `limb:expose_weakness#1` 0.22×, `skill:surgewind` 0.24×.

Main effects at L20 over 15992 rows: strongest `skill:grasping_chasm` 18.62×, `skill:faultbreak` 14.28×, `skill:serpent_ray` 12.66×, `skill:bonespray` 12.41×, `limb:poison_nova#1` 10.19×; weakest `primary:transfusion` 0.22×, `skill:root_grasp` 0.24×, `skill:rain_of_knives` 0.24×, `primary:glare_ice` 0.26×, `skill:beckon_palewisps` 0.28×.

Main effects at L40 over 16509 rows: strongest `primary:infernal_bombardment` 89.95×, `skill:ice_shards` 13.05×, `skill:imperious_barrage` 11.81×, `skill:arcane_missiles` 10.68×, `limb:skewer#0` 9.1×; weakest `primary:stormbind` 0.13×, `primary:frost_storm` 0.17×, `support:command_gem` 0.18×, `support:seismic_waltz` 0.19×, `skill:skewer` 0.22×.

**Other combinations far off the sum of their parts**, confirmed on fresh dice (19 tried):

- `class:chronomancer + unique:stormcall + support:gutterglow + support:chill_chance`: measured 16.3, its parts predict 0.3. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJiZWd1aWxlIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJjaGlsbF9jaGFuY2UiLCJndXR0ZXJnbG93Il0sImxpbWIiOjB9LHsiaWQiOiJsb29zZV9tYXJyb3dncnVicyIsInJhcml0eSI6Im1hZ2ljIn0seyJpZCI6InNvdWxfdm9sbGV5IiwicmFyaXR5IjoibWFnaWMifV0sIm9mZiI6InNwZWVkIiwiZGVmIjoibGlmZSIsImdlYXIiOiJtYWdpYyIsImdzIjoxNjEyNjI5ODQxLCJ1bmlxdWVzIjp7ImFtdWxldCI6InN0b3JtY2FsbCJ9fQ:spar --seeds 30 --base-seed 2484937256`</details>
- `class:hivecaller + primary:expose_weakness + support:broodclutch + support:sainted_ash`: measured 20.3, its parts predict 2.2. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJoaXZlY2FsbGVyIiwibHZsIjoxMCwic2tpbGxzIjpbeyJpZCI6ImV4cG9zZV93ZWFrbmVzcyIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzYWludGVkX2FzaCIsImJyb29kY2x1dGNoIl0sImxpbWIiOjB9LHsiaWQiOiJsb29zZV9tYXJyb3dncnVicyIsInJhcml0eSI6Im1hZ2ljIn0seyJpZCI6ImV4cHVuZ2UiLCJyYXJpdHkiOiJtYWdpYyIsIm92ZXIiOjJ9LHsiaWQiOiJoZWF0X3NwbGl0IiwicmFyaXR5IjoicmFyZSJ9XSwib2ZmIjoiY3JpdCIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjo5NzYzMjc1OTIsInVuaXF1ZXMiOnsicmluZzEiOiJjb21tb25fcHVsc2UifX0:spar --seeds 30 --base-seed 2484937256`</details>
- `class:firebrand + primary:ice_shards + unique:emberbrand + support:maddering`: measured 15.7, its parts predict 546.4. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJmaXJlYnJhbmQiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJ3aWxkX2FiYW5kb24iLCJtYWRkZXJpbmciXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjE0NzU4MzAxNjUsInVuaXF1ZXMiOnsicmluZzEiOiJlbWJlcmJyYW5kIn19:spar --seeds 30 --base-seed 2484937256`</details>
- `class:magician + support:sundering_flight + support:plus_cold + primary:gather_cinderkin`: measured 5.6, its parts predict 721.9. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6NSwic2tpbGxzIjpbeyJpZCI6ImdhdGhlcl9jaW5kZXJraW4iLCJyYXJpdHkiOiJtYWdpYyJ9LHsiaWQiOiJnbGFjaWFsX3JhbXBhcnQiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsiYnVpbGRpbmdfcmh5dGhtIiwiYXVyZWF0ZV93cml0Il19LHsiaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiY29uY3Vzc2l2ZV9ibG93cyIsInN1bmRlcmluZ19mbGlnaHQiLCJwbHVzX2NvbGQiLCJwb2x5cGhvbnkiXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjIwNjE2NzQ0NTR9:spar --seeds 30 --base-seed 2484937256`</details>
- `class:falconer + support:accelerando + support:triangle_sigil + support:ephemeral`: measured 1.2, its parts predict 136.3. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJmYWxjb25lciIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJzdW1tb25fd3JhaXRoIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiYnJvb2RfdGVuZGVyIiwic3RvcmVkX3ZlcmRpY3QiLCJjb21tYW5kX2dlbSIsImNhc3Rfb25fYmxvY2siXSwibGltYiI6MX0seyJpZCI6InZhbXBpcmljX3ByZXNlbmNlIiwicmFyaXR5IjoicmFyZSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbImVwaGVtZXJhbCIsInRhdXRfd2lyZSIsImJsb29kX3RvbGwiXX0seyJpZCI6ImdyYXNwaW5nX2NoYXNtIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiY2FzdF9vbl9ibGVlZCIsInRyaWFuZ2xlX3NpZ2lsIiwiYWNjZWxlcmFuZG8iLCJkZXNwZXJhdGlvbiJdfSx7ImlkIjoiZ2xhY2lhbF9yYW1wYXJ0IiwicmFyaXR5IjoibGVnZW5kYXJ5In1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImxpZmUiLCJnZWFyIjoicmFyZSIsImdzIjo0NzU4ODcwMzAsInVuaXF1ZXMiOnsiY2hlc3QiOiJhZWdpc19vZl90aGVfZHJvd25lZCJ9fQ:spar --seeds 30 --base-seed 2484937256`</details>
- `class:vanguard + support:chitinous_brood + support:spooling + support:poison_chance`: measured 1, its parts predict 516. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJ2YW5ndWFyZCIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiYmxvb2RfcHJpY2UiXX0seyJpZCI6ImJhbGxpc3RhX3NlbnRyeSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInN3aWZ0bmVzcyIsImNsYW1vciIsInZvcnRleCIsImNhc3Rfb25fY3JpdCJdLCJsaW1iIjoxfSx7ImlkIjoibGF5X2Zvcm1pY19jbHV0Y2giLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsiY2hpdGlub3VzX2Jyb29kIiwic2xvd19tYXRjaCIsImVtYmFyZ28iXX0seyJpZCI6InNlcnBlbnRfcmF5IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsicG9pc29uX2NoYW5jZSIsInRob3VnaHRidXJuIiwiYW5jaG9yZWRfZm9jdXMiLCJzcG9vbGluZyJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjEyMDY2MzI5MzksInVuaXF1ZXMiOnsiYW11bGV0Ijoicm91bmRlbGF5In19:spar --seeds 30 --base-seed 2484937256`</details>
- `class:firebrand + primary:ice_shards + support:pallid_touch + unique:emberbrand`: measured 123.5, its parts predict 7391.8. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJmaXJlYnJhbmQiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJzY29yY2hlZF93YWtlIiwicGFsbGlkX3RvdWNoIl19LHsiaWQiOiJ1bmRlcnRvdyIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsibGFtYmVudF9oYXJ2ZXN0IiwiYXVyZWF0ZV93cml0Il19LHsiaWQiOiJwdXJpdHlfb2ZfZmlyZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbIm92ZXJtYXRjaCJdfSx7ImlkIjoiZGFya19wYWN0IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYmxlZWRfY2hhbmNlIl19XSwib2ZmIjoiY3JpdCIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjoxNDc1ODMwMTY1LCJ1bmlxdWVzIjp7InJpbmcxIjoiZW1iZXJicmFuZCJ9fQ:spar --seeds 30 --base-seed 2484937256`</details>
- `class:skald + support:polyphony + support:alacrity + support:shatterglass`: measured 6.1, its parts predict 15.4. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJza2FsZCIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJjb2xkX3Nwb3QiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsicG9seXBob255IiwiY2Fycmllcl9zdHJhaW4iLCJzaGF0dGVyZ2xhc3MiXX0seyJpZCI6InRlbGVwb3J0IiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbInF1YWlsYmFuZSIsImFsYWNyaXR5IiwiYWZ0ZXJzcHJheSJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6NzQ0ODAxOTI5fQ:spar --seeds 30 --base-seed 2484937256`</details>

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
Bestiary: 13104 rows measured, 100 bodies not fielded (passive or immortal fixtures). 159 bodies never swung at a hero standing idle within reach, so their threat reads as unmeasured: 102 have no skills, 31 carry kits with no damage, 6 are rooted, 7 lie in ambush, 7 only fight once fought, and 6 have a damage kit and legs and did not swing in a duel either (`cloud_grazer`, `kettle_minnow`, `sand_scorpion`, `star_grazer`, `white_hart`, `wool_aphid`).
How the bodies fought: on an idle hero the median first blow lands at 0.98s. In a duel, 19% of casts are melee, a body spends 17% of the fight within its own melee reach, and it uses 2 skills. No body pressed a skill that was refused.
Skills: 2930 rows across the bands; 902 read zero alone and are not ranked (buffs, auras and mines show nothing without a partner), 30 warned.
Suites: 91 scenarios, 17 of 104 graded metrics outside their provisional band, 12 warned.
Matrix: 127,534 of 127,534 eligible pairs probed (100%), deep lane on 22291 pairs. Verdicts: effective 78555, inert 14506, blind 30610, cost_only 1428, negligible 2435.
Against the committed ledger (8481 rows): 12162 not on file, 2004 measuring healthy. The ledger only changes through `matrix check --reconcile`.

## What ran, and what did not

| lane | units planned | ok | gate breach | crashed/killed | out of time or not run | episodes | core-hours |
|---|---:|---:|---:|---:|---:|---:|---:|
| baselines | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| audits | 4 | 4 | 0 | 0 | 0 | 0 | 0 |
| expression | 1 | 1 | 0 | 0 | 0 | 1,208 | 0.2 |
| census | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| suites | 2 | 2 | 0 | 0 | 0 | 910 | 0.3 |
| progression | 39 | 39 | 0 | 0 | 0 | 12,480 | 5.2 |
| skills | 10 | 10 | 0 | 0 | 0 | 8,790 | 1.4 |
| skills_vs | 21 | 21 | 0 | 0 | 0 | 24,192 | 5.2 |
| matchups | 26 | 26 | 0 | 0 | 0 | 13,734 | 6.2 |
| bestiary | 19 | 19 | 0 | 0 | 0 | 26,208 | 5.1 |
| attributes | 39 | 39 | 0 | 0 | 0 | 4,914 | 2.5 |
| affixes | 5 | 5 | 0 | 0 | 0 | 3,472 | 1.4 |
| assists | 9 | 9 | 0 | 0 | 0 | 4,752 | 2.6 |
| socket_play | 1 | 1 | 0 | 0 | 0 | 900 | 0.1 |
| globals | 4 | 4 | 0 | 0 | 0 | 1,704 | 0.3 |
| matrix | 205 | 205 | 0 | 0 | 0 | 235,858 | 57.5 |
| matrix_deep | 115 | 115 | 0 | 0 | 0 | 102,631 | 19.5 |
| search | 40 | 40 | 0 | 0 | 0 | 149,174 | 29.1 |
| archive_confirm | 37 | 37 | 0 | 0 | 0 | 21,808 | 6.6 |
| proposals | 48 | 48 | 0 | 0 | 0 | 11,910 | 3 |

Every planned unit ran.

Not simulated at all, by design: zone generation and XP pacing, event pressure, multiplayer, and real player skill. Pilots are simple policies, so kit ceilings are floors. Bands stay provisional until you sign them off.
