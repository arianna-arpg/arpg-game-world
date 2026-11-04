# Balance farm, night of 2026-11-04

Commit [d1df727ff4](https://github.com/arianna-arpg/arpg-game-world/commit/d1df727ff4f7a297db17f9530f074ef1594594c7), profile `full`. 587,813 episodes, 156.7 core-hours, 291 minutes end to end. [Run](https://github.com/arianna-arpg/arpg-game-world/actions/runs/41827880232).

## ✅ No regressions

Every committed baseline holds, nothing crashed, and the matrix has no new defects since last night.

## What moved since last night

191 row(s) moved past their own noise and 10%. Largest first:

| row | before | after | change |
|---|---:|---:|---:|
| `monster:the_unworn:warrior:L12:ttk` | 23.88 | 0 | −100% |
| `monster:balor_warlord:magician:L25:ttk` | 20.65 | 0 | −100% |
| `monster:abyssal_vanguard:warrior:L5:ttk` | 0 | 23.85 | +100% |
| `monster:throne_of_the_law:warrior:L25:ttk` | 0 | 24.72 | +100% |
| `monster:deadwake_hollow_choir:warrior:L12:ttk` | 0 | 24.05 | +100% |
| `monster:gutwall_titan:warrior:L25:ttk` | 20.77 | 0 | −100% |
| `monster:lord_surtash:magician:L25:ttk` | 0 | 18.18 | +100% |
| `monster:pit_lord:warrior:L25:ttk` | 0 | 20.53 | +100% |
| `monster:barrow_colossus:warrior:L25:ttk` | 24.55 | 0 | −100% |
| `monster:spinney_matron:magician:L25:ttk` | 0 | 19.8 | +100% |
| `monster:sirocco_hourglass_diviner:warrior:L25:ttk` | 0 | 24.48 | +100% |
| `monster:vessel_thulvane:warrior:L12:ttk` | 0 | 24.17 | +100% |
| `monster:khamsin_dervish:magician:L5:ttk` | 0 | 11.07 | +100% |
| `monster:breach_lord:warrior:L12:ttk` | 0 | 22.43 | +100% |
| `monster:canopic_vizier:warrior:L12:ttk` | 0 | 18.86 | +100% |
| `monster:oblivion_knight:magician:L12:ttk` | 16.17 | 0 | −100% |
| `monster:yeti_alpha:warrior:L12:ttk` | 22.9 | 0 | −100% |
| `monster:archfiend_legate:magician:L5:ttk` | 0 | 18.1 | +100% |
| `monster:ice_golem:warrior:L5:ttk` | 12.2 | 0 | −100% |
| `monster:pit_champion:warrior:L5:ttk` | 22.27 | 0 | −100% |
| `monster:vent_shaman:warrior:L12:ttk` | 0 | 22.62 | +100% |
| `monster:nimbus_shepherd:warrior:L25:ttk` | 24.05 | 0 | −100% |
| `monster:river_naiad:warrior:L25:ttk` | 21.43 | 0 | −100% |
| `monster:tidebound_regent:magician:L25:ttk` | 0 | 21.87 | +100% |
| `monster:odyssey_chitin:magician:L12:ttk` | 18.57 | 0 | −100% |

## Top proposed numbers

Advisory. Nothing here has been applied, and each needs your sign-off. Each row re-measured the subject on dice the night had not seen, solved for a number through the real game, and verified it at common seeds. 29 outlier(s) did not hold up on fresh dice, or landed within 15% of their target, and were dropped.

| # | subject | change | metric: before → after | cohort target | verdict | guards |
|---:|---|---|---|---:|---|---|
| 1 | class `trapper` | `skills.caltrops.baseDamage.physical.0`: 3 → 7.5 (+1 lines, ×2.5) | kill_rate: 0 → 0.1 | 0.1 | moved | none moved |
| 2 | skill `shambler_horde` | `monsters.grave_shambler.explodeOnDeath`: 2.2 → 0.88 | dps_dummy: 19394.7 → 7757.9 | 680.5 | moved, closes 62% | none moved |
| 3 | skill `arclight_rain` | `skills.arclight_rain.baseDamage.physical.0`: 5 → 2 (+3 lines, ×0.4) | dps_dummy: 347.8 → 139.1 | 93.2 | moved, closes 82% | none moved |
| 4 | skill `marshlight` | `skills.marshlight.baseDamage.chaos.0`: 9 → 3.6 (+1 lines, ×0.4) | dps_dummy: 266.8 → 106.7 | 98.9 | moved | none moved |
| 5 | skill `mirespume` | `skills.mirespume.baseDamage.chaos.0`: 11 → 4.5 (+1 lines, ×0.41) | dps_dummy: 243.2 → 99.7 | 98.9 | moved | none moved |
| 6 | support `fire_walker` | `supports.fire_walker.mods.0.value`: 0.5 → 0.2 (+1 lines, ×0.4) | dps_dummy: 61.1 → 30.8 | 16.7 | moved, closes 68% | none moved |
| 7 | skill `infernal_bombardment` | `monsters.bombard_demon.explodeOnDeath`: 1.6 → 0.67 | dps_dummy: 15914.2 → 6700.5 | 6676.7 | moved | none moved |
| 8 | skill `glare_ice` | `skills.glare_ice.baseDamage.cold.0`: 4 → 10 (+1 lines, ×2.5) | dps_dummy: 1.3 → 3.3 | 4 | moved, closes 72% | none moved |
| 9 | class `apothecary` | `skills.venom_bolt.baseDamage.chaos.0`: 6 → 10 (+1 lines, ×1.7) | kill_rate: 0 → 0.1 | 0.1 | moved | none moved |
| 10 | skill `trailblaze` | `skills.trailblaze.baseDamage.fire.0`: 6 → 2.8 (+1 lines, ×0.46) | dps_dummy: 65.3 → 31.1 | 31.1 | moved | none moved |
| 11 | class `firebrand` | `skills.trumpet_peal.baseDamage.lightning.0`: 7 → 18 (+1 lines, ×2.5) | kill_rate: 0 → 0 | 0 | moved, closes 82% | none moved |
| 12 | class `hivecaller` | `classes.hivecaller.attributes.strength`: 2 → 5 (+9 lines, ×2.5) | kill_rate: 0 → 0.1 | 0.2 | moved, closes 35% | mana_floor_pct 64.6→80.2 |
| 13 | skill `keening_shriek` | `skills.keening_shriek.baseDamage.physical.0`: 4 → 7.6 (+1 lines, ×1.9) | dps_dummy: 1.9 → 3.7 | 3.6 | moved | none moved |
| 14 | support `sundering_flight` | `supports.sundering_flight.fissureTrail.damageScale`: 0.4 → 0.16 | dps_dummy: 49.8 → 30.3 | 19.7 | moved, closes 65% | none moved |
| 15 | support `volley` | `supports.volley.mods[stat=damage].value`: -0.25 → -0.63 | dps_dummy: 93 → 46.5 | 54.5 | moved | none moved |

<details><summary>Repro commands</summary>

1. `npm run sim -- whatif --knob 'skills.caltrops.baseDamage*2.5' --scenarios pressure:trapper:30 --seeds 30 --base-seed 2546804719`. Same change at other bands: `pressure:trapper:5` 0.4→0.6, `pressure:trapper:10` 0.2→0.5, `pressure:trapper:20` 0→0.2, `pressure:trapper:40` 0→0
2. `npm run sim -- whatif --knob 'monsters.grave_shambler.explodeOnDeath*0.4' --scenarios skill:shambler_horde:40 --seeds 30 --base-seed 2546804719`. Other dials on this metric (elasticity): cooldown -0.71, useTime -0.36. Same change at other bands: `skill:shambler_horde:5` 257.8→103.1, `skill:shambler_horde:10` 768.4→307.4, `skill:shambler_horde:20` 3055.9→1222.4
3. `npm run sim -- whatif --knob 'skills.arclight_rain.baseDamage*0.4' --scenarios skill:arclight_rain:40 --seeds 30 --base-seed 2546804719`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.19, useTime 0.18. Same change at other bands: `skill:arclight_rain:5` 152.3→60.9, `skill:arclight_rain:10` 184.7→73.9, `skill:arclight_rain:20` 233.3→93.3
4. `npm run sim -- whatif --knob 'skills.marshlight.baseDamage*0.4' --scenarios skill:marshlight:10 --seeds 30 --base-seed 2546804719`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.69, manaCost -0.04. Same change at other bands: `skill:marshlight:5` 231.6→92.7, `skill:marshlight:20` 317.3→127, `skill:marshlight:40` 452.1→179.3
5. `npm run sim -- whatif --knob 'skills.mirespume.baseDamage*0.41' --scenarios skill:mirespume:10 --seeds 30 --base-seed 2546804719`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.63. Same change at other bands: `skill:mirespume:5` 211.7→86.8, `skill:mirespume:20` 289.7→118.8, `skill:mirespume:40` 398.8→163.5
6. `npm run sim -- whatif --knob 'supports.fire_walker.mods*0.4' --scenarios socketed:phoenix_dive:fire_walker:20 --seeds 30 --base-seed 2546804719`
7. `npm run sim -- whatif --knob 'monsters.bombard_demon.explodeOnDeath*0.42' --scenarios skill:infernal_bombardment:40 --seeds 30 --base-seed 2546804719`. Other dials on this metric (elasticity): cooldown -0.82, useTime 0. Same change at other bands: `skill:infernal_bombardment:5` 238.8→102, `skill:infernal_bombardment:10` 683.5→289.5, `skill:infernal_bombardment:20` 2619.9→1104.7
8. `npm run sim -- whatif --knob 'skills.glare_ice.baseDamage*2.5' --scenarios skill:glare_ice:40 --seeds 30 --base-seed 2546804719`. Other dials on this metric (elasticity): cooldown -1.42, baseDamage 0.99. Same change at other bands: `skill:glare_ice:5` 0.7→1.9, `skill:glare_ice:10` 0.8→2.1, `skill:glare_ice:20` 1→2.4
9. `npm run sim -- whatif --knob 'skills.venom_bolt.baseDamage*1.7' --scenarios pressure:apothecary:20 --seeds 30 --base-seed 2546804719`. Same change at other bands: `pressure:apothecary:5` 0.3→0.5, `pressure:apothecary:10` 0.2→0.3, `pressure:apothecary:40` 0.1→0.1
10. `npm run sim -- whatif --knob 'skills.trailblaze.baseDamage*0.46' --scenarios skill:trailblaze:20 --seeds 30 --base-seed 2546804719`. Other dials on this metric (elasticity): baseDamage 0.99, cooldown -0.79. Same change at other bands: `skill:trailblaze:5` 50.4→24.6, `skill:trailblaze:10` 56.1→27.2, `skill:trailblaze:40` 86.2→40.3
11. `npm run sim -- whatif --knob 'skills.trumpet_peal.baseDamage*2.5' --scenarios parity:firebrand:40 --seeds 30 --base-seed 2546804719`. Same change at other bands: `parity:firebrand:5` 0.1→0.1, `parity:firebrand:10` 0→0.1, `parity:firebrand:20` 0→0.1
12. `npm run sim -- whatif --knob 'classes.hivecaller.attributes*2.5' --scenarios pressure:hivecaller:5 --seeds 30 --base-seed 2546804719`. Same change at other bands: `pressure:hivecaller:10` 0→0.1, `pressure:hivecaller:20` 0→0.1, `pressure:hivecaller:40` 0.1→0.2
13. `npm run sim -- whatif --knob 'skills.keening_shriek.baseDamage*1.9' --scenarios skill:keening_shriek:40 --seeds 30 --base-seed 2546804719`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.9. Same change at other bands: `skill:keening_shriek:5` 1.2→2.2, `skill:keening_shriek:10` 1.3→2.5, `skill:keening_shriek:20` 1.5→2.9
14. `npm run sim -- whatif --knob 'supports.sundering_flight.fissureTrail.damageScale*0.4' --scenarios socketed:ball_lightning:sundering_flight:20 --seeds 30 --base-seed 2546804719`
15. `npm run sim -- whatif --knob 'supports.volley.mods[stat=damage].value*2.5' --scenarios socketed:soulflay:volley:20 --seeds 30 --base-seed 2546804719`

Run from commit `d1df727ff4f7a297db17f9530f074ef1594594c7`.
</details>

Too noisy to call: class `assassin`, monster_threat `strangler_maw`. The solved number moved each by less than its own seed-to-seed spread, so these need a calmer rig or more seeds before they mean anything.

### Combinations that run away

Confirmed on fresh dice at 20 times or more what their parts predict. A number this far out usually means damage feeding itself, so no single number fixes it: each needs a call on whether the feedback should be bounded.

- `class:brawler + unique:cinderstep + unique:stormcall + support:cascade`: measured 1.1e+12 damage per second, its parts predict 16671.2. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJicmF3bGVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImV2aXNjZXJhdGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJncmFzcGluZ190ZW5kcmlscyIsImdpYW50c2JhbmUiLCJhenVyZV9oYXJ2ZXN0Iiwic2VyZW5lX3Bvd2VyIl0sImxpbWIiOjB9LHsiaWQiOiJzaGF0dGVyY2hvcmQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInJlc291bmRpbmdfZWNobyIsImNhc2NhZGUiXSwibGltYiI6MH0seyJpZCI6ImRyb3duaW5nX2dyYXNwIiwicmFyaXR5IjoicmFyZSIsIm92ZXIiOjF9XSwib2ZmIjoiY3JpdCIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjo5MjI2OTg3MDMsInVuaXF1ZXMiOnsiYW11bGV0Ijoic3Rvcm1jYWxsIiwiYm9vdHMiOiJjaW5kZXJzdGVwIn19:spar --seeds 30 --base-seed 2546804719`</details>
- `class:pyromancer + support:scattered_cascade + support:searing_heat + support:arcing`: measured 1510623.8 damage per second, its parts predict 160.2. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJweXJvbWFuY2VyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImZyb3N0Ym9sdCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImNhc3Rfb25fYmxlZWQiLCJhcmNpbmciLCJpZ25pdGVfY2hhbmNlIl19LHsiaWQiOiJjb21idXN0aW9uX3N0cmlrZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNlaXNtaWNfbWFyY2giLCJyZXNvdW5kaW5nX2VjaG8iLCJzZWFyaW5nX2hlYXQiLCJzY2F0dGVyZWRfY2FzY2FkZSJdfSx7ImlkIjoic2N5dGhlX2FyYyIsInJhcml0eSI6ImxlZ2VuZGFyeSJ9XSwib2ZmIjoiY3JpdCIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjoxNzkzOTM5OTE3LCJ1bmlxdWVzIjp7ImFtdWxldCI6Im1vdXJuaW5nX2JlbGwifX0:spar --seeds 30 --base-seed 2546804719`</details>
- `class:tamer + unique:stormcall + support:accelerando + support:grasping_tendrils`: measured 591998.4 damage per second, its parts predict 16724. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJ0YW1lciIsImx2bCI6MjAsInNraWxscyI6W3siaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInVubGVhc2giXX0seyJpZCI6InZhbXBpcmljX3ByZXNlbmNlIiwicmFyaXR5IjoicmFyZSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbImxpbmdlcmluZyIsInRhdXRfd2lyZSIsIm1lYXN1cmVkX2JsYWRlIl19LHsiaWQiOiJncmFzcGluZ19jaGFzbSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImV4cG9zdXJlIiwiYXBvdGhlb3NpcyIsImFjY2VsZXJhbmRvIiwiZGVzcGVyYXRpb24iXX0seyJpZCI6ImV2aXNjZXJhdGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJncmFzcGluZ190ZW5kcmlscyIsImdpYW50c2JhbmUiLCJhenVyZV9oYXJ2ZXN0Iiwic2VyZW5lX3Bvd2VyIl0sImxpbWIiOjF9XSwib2ZmIjoiY3JpdCIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjoxNjAyMjE0OTQ4LCJ1bmlxdWVzIjp7ImFtdWxldCI6InN0b3JtY2FsbCJ9fQ:spar --seeds 30 --base-seed 2546804719`</details>
- `class:magician + support:cascade + support:deliberate_ruin + support:brimstone_tithe`: measured 52885.8 damage per second, its parts predict 266.1. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJkZXRvbmF0aW9uIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZ3VhcmRlZF9jYXN0aW5nIiwiYnVpbGRpbmdfcmh5dGhtIiwiY29tYnVzdGlvbiJdfSx7ImlkIjoiaW5mZXJuYWxfYm9tYmFyZG1lbnQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJjYXNjYWRlIiwiZGVsaWJlcmF0ZV9ydWluIiwibW9ub2xpdGgiLCJicmltc3RvbmVfdGl0aGUiXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6IndhcmQiLCJnZWFyIjoicmFyZSIsImdzIjoxMzg0MzU2MzU0LCJ1bmlxdWVzIjp7ImFtdWxldCI6ImJlbGx3ZXRoZXIiLCJnbG92ZXMiOiJmYXVsdGxpbmVfZ3JpcHMifX0:spar --seeds 30 --base-seed 2546804719`</details>
- `class:berserker + support:point_blank + primary:glass_lance + support:spell_cascade`: measured 21274.4 damage per second, its parts predict 100.1. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZ2xhc3NfbGFuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJwb2ludF9ibGFuayIsInNoYXR0ZXJnbGFzcyJdfSx7ImlkIjoic2FuZ3VpbmVfYnVyc3QiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzcGVsbF9jYXNjYWRlIiwiYWRkbGluZyIsInBvaXNvbl9jaGFuY2UiXSwibGltYiI6MX0seyJpZCI6Imh1c2hfb2ZfdGhlX3dha2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJ1bmxlYXNoIiwid2lsZF9hYmFuZG9uIl19LHsiaWQiOiJpbmZlcm5hbF9ib21iYXJkbWVudCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbIndhcmRpbmdfZmxlc2giLCJzZWxmX2Rlc3RydWN0IiwiY29tbXVuYWxfcml0ZXMiLCJidXJpZWRfY2hhcmdlIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjo4Njk3ODg1MTcsInVuaXF1ZXMiOnsiYW11bGV0IjoibGluZWFnZV9rbm90IiwiZ2xvdmVzIjoiZ2FsZXdyaWdodHMifX0:spar --seeds 30 --base-seed 2546804719`</details>
- `class:hivecaller + unique:cinderstep + support:nova_release + primary:living_barrage`: measured 198.3 damage per second, its parts predict 5.1. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJoaXZlY2FsbGVyIiwibHZsIjoxMCwic2tpbGxzIjpbeyJpZCI6ImxpdmluZ19iYXJyYWdlIiwicmFyaXR5IjoicmFyZSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImV4dGVybWluYXRvciIsIm5vdmFfcmVsZWFzZSIsImNhc2NhZGVfb2Zfa25pdmVzIl19LHsiaWQiOiJmdWxtaW5hdGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJhYnVuZGFudF9oYXJ2ZXN0IiwiZW1iYXJnbyIsInVwcm9vdGVyIiwidGF1dF93aXJlIl19LHsiaWQiOiJzdXJnZXdpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJjbGFtb3IiLCJjcm93ZF9mYXZvciJdfSx7ImlkIjoic29sYXJfYnJhbmQiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsiYnVsd2Fya19zaGFyZHMiXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImxpZmUiLCJnZWFyIjoicmFyZSIsImdzIjoxNjcwMjAyMDM4LCJ1bmlxdWVzIjp7ImJvb3RzIjoiY2luZGVyc3RlcCJ9fQ:spar --seeds 30 --base-seed 2546804719`</details>
- `class:cryomancer + unique:stormcall + primary:static_field + support:sainted_ash`: measured 111.7 damage per second, its parts predict 2.9. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJjcnlvbWFuY2VyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoic3RhdGljX2ZpZWxkIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJtb25vbGl0aCIsImRlYXRoc19kb29yIl19LHsiaWQiOiJleHBvc2Vfd2Vha25lc3MiLCJyYXJpdHkiOiJyYXJlIiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2FpbnRlZF9hc2giXSwibGltYiI6MH0seyJpZCI6Imxvb3NlX21hcnJvd2dydWJzIiwicmFyaXR5IjoibWFnaWMifSx7ImlkIjoiZXhwdW5nZSIsInJhcml0eSI6Im1hZ2ljIn1dLCJvZmYiOiJjcml0IiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjE0MzY5MTg2NjEsInVuaXF1ZXMiOnsiYW11bGV0Ijoic3Rvcm1jYWxsIiwiY2hlc3QiOiJhZWdpc19vZl90aGVfZHJvd25lZCJ9fQ:spar --seeds 30 --base-seed 2546804719`</details>

### Flagged for your decision

The numbers an author would reach for did not move these enough. They are not proposals: each needs a call on whether the mechanic is right, and none has been touched.

- class `chronomancer`: The numbers an author would reach for barely move this: skills.stasis_lock.baseDamage ×2.5 closes 10%; classes.chronomancer.attributes ×2.5 closes 5%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- skill `hurricane`: The numbers an author would reach for barely move this: skills.hurricane.baseDamage ×2.5 closes 14%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `wallwright`: The numbers an author would reach for barely move this: skills.stone_rampart.baseDamage ×1 closes 0%; skills.toppling_stroke.baseDamage ×2.5 closes 10%; skills.shield_charge.baseDamage ×2.5 closes 5%; skills.stone_rampart.baseDamage & skills.toppling_stroke.baseDamage & skills.shield_charge.baseDamage ×2.5 closes 15%; classes.wallwright.attributes ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `necromancer`: The numbers an author would reach for barely move this: skills.poison_nova.baseDamage ×0.4 closes 5%; skills.despair.baseDamage ×1 closes 0%; skills.poison_nova.baseDamage & skills.despair.baseDamage ×0.4 closes 5%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- support `septic_bargain`: The numbers an author would reach for barely move this: supports.septic_bargain.mods ×2.5 closes 20%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `beguiler`: The numbers an author would reach for barely move this: skills.beguile.baseDamage ×1.7 closes 11%; classes.beguiler.attributes ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- support `resounding_echo`: The numbers an author would reach for barely move this: supports.resounding_echo.mods ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_threat `breach_arcling`: The numbers an author would reach for barely move this: monsterDamage.breach_arcling.all ×2.5 closes 12%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `sharper`: The numbers an author would reach for barely move this: skills.thrown_ace.baseDamage ×1 closes 0%; classes.sharper.attributes ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `stygian_doll`: The numbers an author would reach for barely move this: monsters.stygian_doll.base.life ×2.4 closes 1%. The cause may not be numeric, so this needs your decision rather than a tuning pass.

## Outliers

449 rows sit far from their cohort (log-scale median and MAD, z ≥ 3 and a ratio past 1.8× or 0.55×), 80 of them new tonight. Warned rows and zero rows never enter a cohort.

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
|  | support | `crescendo` | output_multiplier | 2.1 | 1 | 2.02× | 12 | supports · effective hosts |
|  | support | `septic_bargain` | output_multiplier | 0.5 | 1 | 0.5× | -12 | supports · effective hosts |
|  | class | `chronomancer` | kill_rate | 0 | 0.5 | 0.04× | -11.9 | L10 · geared · pressure · kill_rate |
|  | support | `volley` | output_multiplier | 2 | 1 | 1.92× | 11.1 | supports · effective hosts |
| 🆕 | interaction | `class:brawler + unique:cinderstep + unique:stormcall + support:cascade` | dps_out | 6.6e+7 | 16671.2 | 3938.52× | 10.2 | L40 main effects |
|  | support | `elemental_conduction` | output_multiplier | 1.9 | 1 | 1.82× | 10.2 | supports · effective hosts |
|  | monster_threat | `hadal_lantern` | dps_in | 0.1 | 14.9 | 0× | -9.3 | L12 · magician · body |
|  | affix | `attr_willpower` | dps_out | 134.4 | 150.5 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `crowd_damage` | dps_out | 274.3 | 312 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `dmg_cold` | dps_out | 132 | 150.5 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `drowned_regalia` | dps_out | 137.6 | 159.7 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `hybrid_life_mana` | dps_out | 134.4 | 150.5 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `insight_pct` | dps_out | 131.6 | 150.5 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `mana` | dps_out | 134.4 | 150.5 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `mana_leech` | dps_out | 137.6 | 159.7 | 0.06× | -9.1 | L20 · magician · affix output |

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
- crowd_damage: `npm run sim -- run --refs affix:magician:20:gloves:crowd_damage:10397677:spar --seeds 10`
- dmg_cold: `npm run sim -- run --refs affix:magician:20:helmet:dmg_cold:10397677:spar --seeds 10`
- drowned_regalia: `npm run sim -- run --refs affix:magician:20:helmet:drowned_regalia:5352222:spar --seeds 10`
- hybrid_life_mana: `npm run sim -- run --refs affix:magician:20:helmet:hybrid_life_mana:10397677:spar --seeds 10`
- insight_pct: `npm run sim -- run --refs affix:magician:20:helmet:insight_pct:10397677:spar --seeds 10`
- mana: `npm run sim -- run --refs affix:magician:20:helmet:mana:5352222:spar --seeds 10`
- mana_leech: `npm run sim -- run --refs affix:magician:20:helmet:mana_leech:5352222:spar --seeds 10`

</details>

## Build search

49,757 candidates tonight (11,183 refused by the real gates), 414,092 over 6 night(s). The archive holds 1401 elite rows; 1368 were re-measured on this commit. Tried so far in a legal build: 39 of 39 classes, 576 of 576 primarys, 604 of 604 skills, 454 of 455 supports, 41 of 41 uniques.

| band | objective | build (top factors) | value | × band median | repro |
|---|---|---|---:|---:|---|
| L5 | offense | `class:runeweaver` `off:crit` `def:life` `gear:rare` `skill:orb_of_storms` | 22583.4 | 737.3× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoib3JiX29mX3N0b3JtcyIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiaHVudGVyc19tb21lbnR1bSIsInVubW9vcmVkIl19LHsiaWQiOiJzdG9ybWJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJ0ZW1wZXN0X3JhbmdlIl19LHsiaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJmbGVldGluZ19kZXZvdGlvbiIsInNsb3dfYnJldyIsImFjY2VsZXJhbmRvIiwiYmxvb2RfdG9sbCJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImFyY2luZyIsInNsb3dfYnJldyIsInBhcnRpbmdfanVkZ2VtZW50Il19XSwib2ZmIjoiY3JpdCIsImRlZiI6ImxpZmUiLCJnZWFyIjoicmFyZSIsImdzIjoxNjczODQ4NzE3LCJ1bmlxdWVzIjp7ImFtdWxldCI6InN0b3JtY2FsbCIsInJpbmcxIjoiZW1iZXJicmFuZCJ9fQ --seeds 8 --base-seed 1720777580`</details> |
| L5 | offense | `class:runeweaver` `off:crit` `def:armor` `gear:rare` `skill:reapers_toll` | 18009 | 588× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoicmVhcGVyc190b2xsIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJjb25jdXNzaXZlX2Jsb3dzIiwiY2FzdF9vbl9ibG9jayJdfSx7ImlkIjoibGlnaHRuaW5nX2JsYXN0IiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbInJlc291bmRpbmdfZWNobyIsImRvbWluaW9uX3RpdGhlIiwic3VtbW9uX3BoYW50YXNtIl19LHsiaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJmbGVldGluZ19kZXZvdGlvbiIsInNsb3dfYnJldyIsInBvbHlwaG9ueSIsImJsb29kX3ByaWNlIl19LHsiaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsicmVtbmFudHMiLCJzbG93X2JyZXciLCJwYXJ0aW5nX2p1ZGdlbWVudCIsInNlcmVuZV9wb3dlciJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjE4OTgxNDA0NTgsInVuaXF1ZXMiOnsiY2hlc3QiOiJhZWdpc19vZl90aGVfZHJvd25lZCIsInJpbmcxIjoiZW1iZXJicmFuZCJ9fQ --seeds 8 --base-seed 1720777580`</details> |
| L5 | clear | `class:runeweaver` `off:crit` `def:armor` `gear:rare` `skill:lifedrain` | 6 | 14.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoibGlmZWRyYWluIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJ2aWN0b3JzX3RlbXBvIiwiYWNjZWxlcmF0ZWQiXX0seyJpZCI6ImJlY2tvbl9wYWxld2lzcHMiLCJyYXJpdHkiOiJyYXJlIiwib3ZlciI6Miwic3VwcG9ydHMiOlsibW91bnRpbmdfZnJlbnp5Il19LHsiaWQiOiJzaGF0dGVyY2hvcmQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInJlc291bmRpbmdfZWNobyIsImNhc2NhZGUiXSwibGltYiI6MX1dLCJvZmYiOiJjcml0IiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjoxOTgwMDI0NDY5LCJ1bmlxdWVzIjp7ImFtdWxldCI6InN0b3JtY2FsbCIsInJpbmcxIjoiZW1iZXJicmFuZCJ9fQ --seeds 8 --base-seed 1720777580`</details> |
| L5 | clear | `class:chronomancer` `off:crit` `def:life` `gear:rare` `skill:indecision` | 6 | 14.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJpbmRlY2lzaW9uIiwicmFyaXR5IjoibWFnaWMiLCJvdmVyIjoxfSx7ImlkIjoic2hhdHRlcmNob3JkIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJyZXNvdW5kaW5nX2VjaG8iLCJjYXNjYWRlIl0sImxpbWIiOjF9XSwib2ZmIjoiY3JpdCIsImRlZiI6ImxpZmUiLCJnZWFyIjoicmFyZSIsImdzIjoxODA4OTMyODF9 --seeds 8 --base-seed 3453389076`</details> |
| L10 | offense | `class:hivecaller` `off:speed` `def:evasion` `gear:rare` `skill:venom_ammunition` | 23477.7 | 591.4× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJoaXZlY2FsbGVyIiwibHZsIjoxMCwic2tpbGxzIjpbeyJpZCI6InZlbm9tX2FtbXVuaXRpb24iLCJyYXJpdHkiOiJyYXJlIiwib3ZlciI6Miwic3VwcG9ydHMiOlsid3JhaXRoX3Bhc3NhZ2UiXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJyZWdpY2lkZSIsInN1bmRlcmluZ19mbGlnaHQiLCJwbHVzX2NvbGQiLCJ1bWJyYWxfcG93ZXIiXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjoxNjgxMjMyMzU3LCJ1bmlxdWVzIjp7ImJlbHQiOiJ3aW50ZXJfYWZ0ZXJfeW91IiwiYm9vdHMiOiJyaW1ld2FrZSJ9fQ --seeds 8 --base-seed 873665617`</details> |
| L10 | offense | `class:runeweaver` `off:crit` `def:evasion` `gear:rare` `skill:vampiric_embrace` | 18553.9 | 467.3× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjoxMCwic2tpbGxzIjpbeyJpZCI6InZhbXBpcmljX2VtYnJhY2UiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsiY2xhbW9yIiwiY2FzdF9vbl9mbGF3bGVzcyIsIm1vbm9saXRoIl19LHsiaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbInVwcm9vdGVyIl19LHsiaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJmbGVldGluZ19kZXZvdGlvbiIsInNsb3dfYnJldyIsInBvbHlwaG9ueSIsImJsb29kX3RvbGwiXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJhcmNpbmciLCJzbG93X2JyZXciLCJwYXJ0aW5nX2p1ZGdlbWVudCIsInVuYmxpbmtpbmciXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjE3MjcyODg0MjcsInVuaXF1ZXMiOnsiYW11bGV0Ijoic3Rvcm1jYWxsIiwicmluZzEiOiJzaGFyZWRfY3VwIn19 --seeds 8 --base-seed 1720777580`</details> |
| L10 | clear | `class:warlord` `off:speed` `def:ward` `gear:rare` `skill:blood_mortgage` | 6 | 19.7× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJ3YXJsb3JkIiwibHZsIjoxMCwic2tpbGxzIjpbeyJpZCI6ImJsb29kX21vcnRnYWdlIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbImFjY2VsZXJhdGVkIl0sImxpbWIiOjB9LHsiaWQiOiJkb29tX2JlbGwiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJtZWFzdXJlZF9ibGFkZSJdfSx7ImlkIjoia2VlbmluZ19zaHJpZWsiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzcXVhcmVfc2lnaWwiLCJjYXN0X3doaWxlX2NoYW5uZWxpbmciLCJjb25jdXNzaXZlX2Jsb3dzIiwic2hhdHRlcmdsYXNzIl19LHsiaWQiOiJoZWFsaW5nX3N0cmVhbSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbIndyYWl0aF9wYXNzYWdlIiwiZGVzcGVyYXRlX21lYXN1cmVzIiwic2xvd19icmV3Il19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJ3YXJkIiwiZ2VhciI6InJhcmUiLCJncyI6MzY3NzczNjIwLCJ1bmlxdWVzIjp7ImJvb3RzIjoid2FuZGVyZXJzX3dha2UiLCJyaW5nMSI6InNoYXJlZF9jdXAifX0 --seeds 8 --base-seed 3542452271`</details> |
| L10 | clear | `class:necromancer` `off:speed` `def:armor` `gear:rare` `skill:mark` | 6 | 19.7× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJuZWNyb21hbmNlciIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJtYXJrIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbImZsZWV0Zm9vdCJdfSx7ImlkIjoiZG9vbV9iZWxsIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2hhdHRlcmdsYXNzIl19LHsiaWQiOiJiZWNrb25fcGFsZXdpc3BzIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbIm1vdW50aW5nX2ZyZW56eSJdfSx7ImlkIjoic2hhdHRlcmNob3JkIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJyZXNvdW5kaW5nX2VjaG8iLCJzbG93X21hdGNoIl0sImxpbWIiOjF9XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjQ2MzA2NTE2fQ --seeds 8 --base-seed 52821920`</details> |
| L20 | offense | `class:sentinel` `off:damage` `def:evasion` `gear:rare` `skill:emberbind` | 85365.2 | 1161.9× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzZW50aW5lbCIsImx2bCI6MjAsInNraWxscyI6W3siaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJmbGVldGluZ19kZXZvdGlvbiIsInNsb3dfYnJldyIsInBvbHlwaG9ueSIsImJsb29kX3RvbGwiXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJhcmNpbmciLCJzbG93X2JyZXciLCJwYXJ0aW5nX2p1ZGdlbWVudCJdfSx7ImlkIjoiZ2FsZXdpc3AiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJjYXN0X29uX2tpbGwiLCJidWlsZGluZ19yaHl0aG0iLCJyZXR1cm5pbmciXX0seyJpZCI6InBlc3RpbGVudF9ub3ZhIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsibW9ub2xpdGgiLCJzaHJlZGRpbmdfcmV0dXJuIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjE2ODE3NjI0MzcsInVuaXF1ZXMiOnsiYm9vdHMiOiJyaW1ld2FrZSIsImhlbG1ldCI6ImNpbmRlcnZpZ2lsIn19 --seeds 8 --base-seed 2028230233`</details> |
| L20 | offense | `class:magician` `off:speed` `def:life` `gear:rare` `skill:stormbind` | 69955 | 952.1× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6MjAsInNraWxscyI6W3siaWQiOiJzdG9ybWJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJ0ZW1wZXN0X3JhbmdlIl19LHsiaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJmbGVldGluZ19kZXZvdGlvbiIsInNsb3dfYnJldyIsInBvbHlwaG9ueSIsImJsb29kX3RvbGwiXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJhcmNpbmciLCJzbG93X2JyZXciLCJwYXJ0aW5nX2p1ZGdlbWVudCJdfSx7ImlkIjoibGFzdF9yaXRlIiwicmFyaXR5IjoibGVnZW5kYXJ5In1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImxpZmUiLCJnZWFyIjoicmFyZSIsImdzIjoxNjYwMDUyNjQ3fQ --seeds 8 --base-seed 2821499527`</details> |
| L20 | clear | `class:brawler` `off:crit` `def:none` `gear:rare` `skill:hell_rift` | 6 | 21.4× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJicmF3bGVyIiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImhlbGxfcmlmdCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImNsYW1vciIsInB1bHNhdGluZ19taXNzaWxlcyJdfSx7ImlkIjoiZG9vbV9iZWxsIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsicGhhbnRhc21hbF9lY2hvIl19LHsiaWQiOiJzY3l0aGVfYXJjIiwicmFyaXR5IjoibGVnZW5kYXJ5In1dLCJvZmYiOiJjcml0IiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjEyMjk2ODkzMzF9 --seeds 8 --base-seed 877358896`</details> |
| L20 | clear | `class:resonator` `off:crit` `def:evasion` `gear:rare` `skill:archon_lance` | 6 | 21.4× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJyZXNvbmF0b3IiLCJsdmwiOjIwLCJza2lsbHMiOlt7ImlkIjoiYXJjaG9uX2xhbmNlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsic2llZ2VicmVha2VyIiwicHJlc3N1cmVfc2VhbCIsImhlYXZ5X2NhbGliZXIiXX0seyJpZCI6ImRvb21fYmVsbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNoYXR0ZXJnbGFzcyIsImZsb3dicmVha2VyIiwidXByb290ZXIiXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjE2NzM0OTgyOTF9 --seeds 8 --base-seed 3674544868`</details> |
| L40 | offense | `class:hivecaller` `off:damage` `def:ward` `gear:rare` `skill:infernal_bombardment` | 192025.1 | 2093.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJoaXZlY2FsbGVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImluZmVybmFsX2JvbWJhcmRtZW50IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiY2FzY2FkZSIsImRlbGliZXJhdGVfcnVpbiIsIm1vbm9saXRoIiwiYnJpbXN0b25lX3RpdGhlIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjg4MDEyMzk4MiwidW5pcXVlcyI6eyJjaGVzdCI6InRoZV91bm1vdmVkIn19 --seeds 8 --base-seed 1988907810`</details> |
| L40 | offense | `class:brawler` `off:crit` `def:none` `gear:rare` `skill:eviscerate` | 134784.9 | 1469.7× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJicmF3bGVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImV2aXNjZXJhdGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJncmFzcGluZ190ZW5kcmlscyIsImdpYW50c2JhbmUiLCJhenVyZV9oYXJ2ZXN0Iiwic2VyZW5lX3Bvd2VyIl0sImxpbWIiOjF9LHsiaWQiOiJzaGF0dGVyY2hvcmQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInJlc291bmRpbmdfZWNobyIsImNhc2NhZGUiXSwibGltYiI6MX0seyJpZCI6ImRyb3duaW5nX2dyYXNwIiwicmFyaXR5IjoicmFyZSIsIm92ZXIiOjF9XSwib2ZmIjoiY3JpdCIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjo5MjI2OTg3MDMsInVuaXF1ZXMiOnsiYW11bGV0Ijoic3Rvcm1jYWxsIiwiYm9vdHMiOiJjaW5kZXJzdGVwIn19 --seeds 8 --base-seed 1722299459`</details> |
| L40 | clear | `class:vanguard` `off:speed` `def:evasion` `gear:rare` `skill:mark` | 6 | 20.2× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJ2YW5ndWFyZCIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiYmxvb2RfcHJpY2UiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjExMTg1MTEyNjcsInVuaXF1ZXMiOnsiY2hlc3QiOiJhZWdpc19vZl90aGVfZHJvd25lZCIsImdsb3ZlcyI6ImdhbGV3cmlnaHRzIn19 --seeds 8 --base-seed 3031564813`</details> |
| L40 | clear | `class:breaker` `off:damage` `def:evasion` `gear:rare` `skill:dissonance` | 6 | 20.2× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJicmVha2VyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImRpc3NvbmFuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJmcm9zdGJpdGVfZ3JpcCIsImNvbmN1c3NpdmVfYmxvd3MiLCJhZGRsaW5nIl0sImxpbWIiOjB9LHsiaWQiOiJkb29tX2JlbGwiLCJyYXJpdHkiOiJsZWdlbmRhcnkifV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjoxNjU4MjA0MDc4fQ --seeds 8 --base-seed 877358896`</details> |

Playstyles at L5, best build found per style against the band's median style (50 styles): strongest `construct · lightning` 22510.9 (6.17×), `area · fire` 18561.5 (5.09×), `construct · physical` 8254.5 (2.26×), `melee · fire` 7656.8 (2.1×); weakest `mark · cold` 702 (0.19×), `court · cold` 723.5 (0.2×), `detonate · cold` 914.1 (0.25×), `construct · cold` 1007.7 (0.28×).

Playstyles at L10, best build found per style against the band's median style (50 styles): strongest `self · chaos` 24816.3 (3.55×), `self · lightning` 18718.2 (2.68×), `projectile · physical` 15896.1 (2.28×), `area · lightning` 13312.8 (1.91×); weakest `mark · physical` 2948.5 (0.42×), `construct · fire` 3559.9 (0.51×), `detonate · cold` 3611.2 (0.52×), `target · lightning` 3779.4 (0.54×).

Playstyles at L20, best build found per style against the band's median style (50 styles): strongest `aura · physical` 484504.5 (22.33×), `melee · physical` 377356.5 (17.39×), `aura · fire` 84706.4 (3.9×), `aura · chaos` 69844.5 (3.22×); weakest `area · lightning` 8217.3 (0.38×), `mark · cold` 9020 (0.42×), `court · lightning` 9732.3 (0.45×), `target · chaos` 11695.7 (0.54×).

Playstyles at L40, best build found per style against the band's median style (50 styles): strongest `melee · physical` 507614.2 (13.17×), `projectile · physical` 236707.5 (6.14×), `court · fire` 193252 (5.02×), `target · physical` 183014.4 (4.75×); weakest `mark · physical` 10933.7 (0.28×), `aura · physical` 11242.2 (0.29×), `self · chaos` 18226.6 (0.47×), `court · cold` 18602.3 (0.48×).

Main effects at L5 over 5119 rows: strongest `skill:grasping_chasm` 18.65×, `skill:bonespray` 14.53×, `skill:ice_shards` 7.59×, `skill:imperious_barrage` 6.45×, `skill:blowhole` 6.09×; weakest `skill:soul_volley` 0.15×, `primary:flame_blast` 0.23×, `limb:expose_weakness#0` 0.23×, `support:vaporize` 0.25×, `skill:epidemic` 0.27×.

Main effects at L10 over 7849 rows: strongest `skill:grasping_chasm` 19.65×, `skill:ice_shards` 8.38×, `skill:avalanche` 6.94×, `skill:bonespray` 6.67×, `skill:undertow` 6.29×; weakest `limb:shadow_step#0` 0.09×, `primary:shambler_horde` 0.1×, `primary:deathwatch` 0.16×, `skill:deathwatch` 0.18×, `skill:flash_freeze` 0.18×.

Main effects at L20 over 9860 rows: strongest `skill:grasping_chasm` 32.04×, `skill:bonespray` 26.41×, `skill:ice_shards` 11.61×, `skill:mirespume` 6.13×, `skill:undertow` 5.87×; weakest `primary:hurricane` 0.15×, `skill:deathwatch` 0.2×, `skill:loose_marrowgrubs` 0.23×, `primary:downburst` 0.25×, `skill:beckon_palewisps` 0.26×.

Main effects at L40 over 10074 rows: strongest `primary:infernal_bombardment` 38.48×, `skill:ice_shards` 14.79×, `skill:grasping_chasm` 10.47×, `limb:spirit_pyre#1` 9.52×, `skill:arcane_missiles` 9.07×; weakest `primary:stormbind` 0.1×, `skill:repulsor_beacon` 0.17×, `limb:beguile#1` 0.17×, `limb:expose_weakness#0` 0.22×, `support:command_gem` 0.22×.

**Other combinations far off the sum of their parts**, confirmed on fresh dice (16 tried):

- `class:cryomancer + support:summon_phantasm + support:no_mans_land + unique:emberbrand`: measured 0.8, its parts predict 9.3. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJjcnlvbWFuY2VyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoiYmVja29uX3BhbGV3aXNwcyIsInJhcml0eSI6Im1hZ2ljIiwib3ZlciI6MSwic3VwcG9ydHMiOlsic3BlbnRiYW5lIiwicml0dWFsX2dyb3VuZCJdfSx7ImlkIjoiYWxhcm1fcmVlayIsInJhcml0eSI6Im1hZ2ljIiwib3ZlciI6MSwic3VwcG9ydHMiOlsibm9fbWFuc19sYW5kIl19LHsiaWQiOiJpbXBlcmlvdXNfYmFycmFnZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImRlYXRoc19kb29yIiwiYmxvb2RfcHJpY2UiLCJxdWlldF9oYW5kIiwic3VtbW9uX3BoYW50YXNtIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoibWFnaWMiLCJncyI6NjI1MTE2NDQ1LCJ1bmlxdWVzIjp7ImJvb3RzIjoiZmxlZXRmZWF0aGVyIiwicmluZzEiOiJlbWJlcmJyYW5kIn19:spar --seeds 30 --base-seed 2546804719`</details>
- `class:sorcerer + support:parting_judgement + primary:immolation_rush + support:arcing`: measured 903, its parts predict 25572.1. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJzb3JjZXJlciIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJpbW1vbGF0aW9uX3J1c2giLCJyYXJpdHkiOiJyYXJlIn0seyJpZCI6InVuZGVydG93IiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbImJsZWVkX2NoYW5jZSIsInVudG91Y2hlZF9taWdodCJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImFyY2luZyIsInNsb3dfYnJldyIsInBhcnRpbmdfanVkZ2VtZW50Il19LHsiaWQiOiJlYXJ0aHJlbmRlciIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImNsYW1vciIsInRpbWVfZnVzZSIsImF6dXJlX2hhcnZlc3QiLCJjaGFtYmVyZWRfY2FzdGluZyJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJsaWZlIiwiZ2VhciI6InJhcmUiLCJncyI6NjAxODY0OTEsInVuaXF1ZXMiOnsiYW11bGV0Ijoic3Rvcm1jYWxsIiwicmluZzEiOiJlbWJlcmJyYW5kIn19:spar --seeds 30 --base-seed 2546804719`</details>
- `class:hivecaller + support:sundering_flight + unique:winter_after_you + primary:shamans_call`: measured 56.7, its parts predict 2345.4. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJoaXZlY2FsbGVyIiwibHZsIjoxMCwic2tpbGxzIjpbeyJpZCI6InNoYW1hbnNfY2FsbCIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJjYXN0X29uX2lnbml0aW9uIiwiZnJhZ21lbnRhdGlvbiIsIm1lYXN1cmVkX2Jsb3dzIl19LHsiaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsicmVnaWNpZGUiLCJzdW5kZXJpbmdfZmxpZ2h0IiwicGx1c19jb2xkIiwidW1icmFsX3Bvd2VyIl19XSwib2ZmIjoiY3JpdCIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjoxNjgxMjMyMzU3LCJ1bmlxdWVzIjp7ImJlbHQiOiJ3aW50ZXJfYWZ0ZXJfeW91IiwicmluZzEiOiJlbWJlcmJyYW5kIn19:spar --seeds 30 --base-seed 2546804719`</details>
- `class:flagellant + support:lingering + primary:blizzard_coil + support:flowbreaker`: measured 1.1, its parts predict 97.4. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJmbGFnZWxsYW50IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImJsaXp6YXJkX2NvaWwiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJsaW5nZXJpbmciLCJjYXN0X29uX2RhbWFnZV90YWtlbiIsImxvYWRlZF9kaWNlIiwiZmxvd2JyZWFrZXIiXX0seyJpZCI6ImRlY295IiwicmFyaXR5IjoibGVnZW5kYXJ5In1dLCJvZmYiOiJjcml0IiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjYxOTM0NzE2M30:spar --seeds 30 --base-seed 2546804719`</details>
- `class:sorcerer + unique:winter_after_you + support:lingering + support:slipstream`: measured 12, its parts predict 348.6. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJzb3JjZXJlciIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJzb3BvcmlmaWNfdmVpbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInNlcXVlbmNlZF9pbnZvY2F0aW9uIiwic2xpcHN0cmVhbSIsImxpbmdlcmluZyIsInBoYW50YXNtYWxfZWNobyJdfSx7ImlkIjoiYnJhbWJsZV9oZWRnZSIsInJhcml0eSI6ImxlZ2VuZGFyeSJ9XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjE1NzgyMzgwNzQsInVuaXF1ZXMiOnsiYmVsdCI6IndpbnRlcl9hZnRlcl95b3UifX0:spar --seeds 30 --base-seed 2546804719`</details>
- `class:juggernaut + unique:cindervigil + support:nova_release + primary:inferno`: measured 29, its parts predict 1957.2. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJqdWdnZXJuYXV0IiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImluZmVybm8iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJlbWJhcmdvIiwibW91bnRpbmdfZnJlbnp5IiwiY3JpbXNvbl9oYXJ2ZXN0IiwiY2hhaW5pbmciXX0seyJpZCI6ImFyY2FuZV9taXNzaWxlcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInZhcG9yaXplIiwia2luZGxlZF93YWtlIiwicHVwcGV0X3N0cmluZ3MiLCJub3ZhX3JlbGVhc2UiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6MTc3NDMxMDUyMiwidW5pcXVlcyI6eyJjaGVzdCI6ImFlZ2lzX29mX3RoZV9kcm93bmVkIiwiaGVsbWV0IjoiY2luZGVydmlnaWwifX0:spar --seeds 30 --base-seed 2546804719`</details>
- `class:cryomancer + support:sundering_flight + support:plus_cold + support:grace_of_dawn`: measured 7.4, its parts predict 368. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJjcnlvbWFuY2VyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoiaGVhbGluZ19zdHJlYW0iLCJyYXJpdHkiOiJtYWdpYyIsIm92ZXIiOjEsInN1cHBvcnRzIjpbImdyYWNlX29mX2Rhd24iLCJzaWVnZWJyZWFrZXIiXX0seyJpZCI6ImhlYXRfc3BsaXQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJhdF90aGVfYnJpbmsiLCJjcm93ZF9mYXZvciJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInN1bmRlcmluZ19mbGlnaHQiLCJwbHVzX2NvbGQiLCJwb2x5cGhvbnkiLCJ1bm5lcnZpbmciXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6ODk4MTc5MTY5LCJ1bmlxdWVzIjp7Imdsb3ZlcyI6InRpdGFuc19ncmFzcCJ9fQ:spar --seeds 30 --base-seed 2546804719`</details>
- `class:berserker + primary:infernal_ray + unique:stormcall + support:loaded_dice`: measured 159.3, its parts predict 200.8. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjEwLCJza2lsbHMiOlt7ImlkIjoiaW5mZXJuYWxfcmF5IiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbImVtYmFyZ28iLCJsb2FkZWRfZGljZSIsInNsb3dfbWF0Y2giXSwibGltYiI6MX0seyJpZCI6InNoYXJkcmlmdCIsInJhcml0eSI6InJhcmUifV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjMxODE4ODI0MCwidW5pcXVlcyI6eyJhbXVsZXQiOiJzdG9ybWNhbGwifX0:spar --seeds 30 --base-seed 2546804719`</details>

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

**What buffs, hexes, heals and wards add** (196 skills whose own numbers are not damage, at L20, against the same hero without them). Most output beside a plain strike: `infernal_bombardment` 14.1×, `summon_plaguefather` 6.4×, `summon_fire_golem` 4.83×, `summon_flame_sprite` 4.77×, `flame_totem` 4.77×, `shambler_horde` 4.25×, `bind_familiar` 4.22×, `reaper_swarm` 3.88×. Most time survived on the clock: `repulsor_beacon` 11.85×, `shambler_horde` 11.85×, `vampiric_presence` 11.85×, `summon_blade_wraith` 11.85×, `call_the_rift` 10.98×, `reaper_swarm` 10.25×, `summon_wraith` 9.04×, `infernal_bombardment` 6.63×. 35 moved neither at any band: their value lies outside these rigs, or they do nothing.

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
Matrix: 127,530 of 127,530 eligible pairs probed (100%), deep lane on 24382 pairs. Verdicts: blind 30610, effective 78555, inert 14500, cost_only 1428, negligible 2437.
Against the committed ledger (8481 rows): 12441 not on file, 2007 measuring healthy. The ledger only changes through `matrix check --reconcile`.

## What ran, and what did not

| lane | units planned | ok | gate breach | crashed/killed | out of time or not run | episodes | core-hours |
|---|---:|---:|---:|---:|---:|---:|---:|
| baselines | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| audits | 4 | 4 | 0 | 0 | 0 | 0 | 0 |
| expression | 1 | 1 | 0 | 0 | 0 | 1,208 | 0.2 |
| census | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| suites | 2 | 2 | 0 | 0 | 0 | 910 | 0.4 |
| progression | 39 | 39 | 0 | 0 | 0 | 12,480 | 5.7 |
| skills | 10 | 10 | 0 | 0 | 0 | 8,790 | 1.5 |
| skills_vs | 21 | 21 | 0 | 0 | 0 | 24,192 | 5.8 |
| matchups | 27 | 27 | 0 | 0 | 0 | 13,734 | 7 |
| bestiary | 31 | 31 | 0 | 0 | 0 | 39,312 | 9.6 |
| attributes | 39 | 39 | 0 | 0 | 0 | 4,914 | 2.8 |
| affixes | 5 | 5 | 0 | 0 | 0 | 3,472 | 1.5 |
| assists | 9 | 9 | 0 | 0 | 0 | 4,752 | 2.8 |
| socket_play | 1 | 1 | 0 | 0 | 0 | 900 | 0.2 |
| globals | 4 | 4 | 0 | 0 | 0 | 1,704 | 0.4 |
| matrix | 219 | 219 | 0 | 0 | 0 | 235,854 | 64.6 |
| matrix_deep | 132 | 132 | 0 | 0 | 0 | 114,907 | 24.5 |
| search | 40 | 40 | 0 | 0 | 0 | 85,536 | 21.2 |
| archive_confirm | 37 | 37 | 0 | 0 | 0 | 21,888 | 5.9 |
| proposals | 48 | 48 | 0 | 0 | 0 | 13,260 | 2.5 |

Every planned unit ran.

Not simulated at all, by design: zone generation and XP pacing, event pressure, multiplayer, and real player skill. Pilots are simple policies, so kit ceilings are floors. Bands stay provisional until you sign them off.
