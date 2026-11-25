# Balance farm, night of 2026-11-25

Commit [80edcb80f2](https://github.com/arianna-arpg/arpg-game-world/commit/80edcb80f273846cbfea2ca0701971a8aa5f9c9b), profile `full`. 811,748 episodes, 135.4 core-hours, 245 minutes end to end. [Run](https://github.com/arianna-arpg/arpg-game-world/actions/runs/45635511329).

## 🔴 Regressions

**2 new skill × support defect(s) since last night**: `pinning_spear@lodging_spear|executioners_edge|inert`, `summon_bone_golem@osseous_might|skewering_blows|inert`. Forensics: `npm run sim -- matrix explain <skill> <support>`.

## What moved since last night

13 row(s) moved past their own noise and 10%. Largest first:

| row | before | after | change |
|---|---:|---:|---:|
| `match:geared_lancer_l5:shield_anima:L5` | 2.9 | 0 | −100% |
| `class:ranger:kitted:L20:parity:floor` | 52.66 | 84.93 | +61% |
| `match:kitted_swashbuckler_l20:shore_crab:L20` | 154.34 | 83.37 | −46% |
| `skillvs:skewer:hunting_falcon:L20` | 33.13 | 47.53 | +44% |
| `skillvs:skewer:zombie:L10` | 25.83 | 36 | +39% |
| `match:kitted_swashbuckler_l20:shield_anima:L20` | 220.53 | 152.6 | −31% |
| `match:kitted_ranger_l20:skeleton_warrior:L20` | 48.49 | 35.69 | −26% |
| `match:kitted_lancer_l20:zombie:L20` | 34.8 | 27.19 | −22% |
| `skillvs:skewer:hunting_falcon:L5` | 28.31 | 22.3 | −21% |
| `match:geared_lancer_l20:bulwark_scuttler:L20` | 39.32 | 47.48 | +21% |
| `match:geared_lancer_l10:shield_anima:L10` | 13.83 | 16.13 | +17% |
| `match:geared_lancer_l20:shield_anima:L20` | 36.01 | 31.8 | −12% |
| `match:starter_lancer_l10:tomb_scarab:L10` | 9.51 | 8.53 | −10% |

## Top proposed numbers

Advisory. Nothing here has been applied, and each needs your sign-off. Each row re-measured the subject on dice the night had not seen, solved for a number through the real game, and verified it at common seeds. 24 outlier(s) did not hold up on fresh dice, or landed within 15% of their target, and were dropped.

| # | subject | change | metric: before → after | cohort target | verdict | guards |
|---:|---|---|---|---:|---|---|
| 1 | class `trapper` | `skills.caltrops.baseDamage.physical.0`: 3 → 7.5 (+1 lines, ×2.5) | kill_rate: 0 → 0.2 | 0.1 | moved | none moved |
| 2 | skill `shambler_horde` | `monsters.grave_shambler.explodeOnDeath`: 2.2 → 0.88 | dps_dummy: 19394.7 → 7757.9 | 680.5 | moved, closes 62% | none moved |
| 3 | skill `arclight_rain` | `skills.arclight_rain.baseDamage.physical.0`: 5 → 2 (+3 lines, ×0.4) | dps_dummy: 348.8 → 139.5 | 93.2 | moved, closes 82% | none moved |
| 4 | class `firebrand` | `skills.trumpet_peal.baseDamage.lightning.0`: 7 → 18 (+3 lines, ×2.5) | kill_rate: 0 → 0.1 | 0 | moved | none moved |
| 5 | skill `marshlight` | `skills.marshlight.baseDamage.chaos.0`: 9 → 3.6 (+1 lines, ×0.4) | dps_dummy: 265.4 → 106.1 | 98.9 | moved | none moved |
| 6 | skill `mirespume` | `skills.mirespume.baseDamage.chaos.0`: 11 → 4.5 (+1 lines, ×0.41) | dps_dummy: 240.5 → 98.6 | 98.9 | moved | none moved |
| 7 | skill `infernal_bombardment` | `monsters.bombard_demon.explodeOnDeath`: 1.6 → 0.67 | dps_dummy: 15913.9 → 6700.2 | 6676.7 | moved | none moved |
| 8 | support `fire_walker` | `supports.fire_walker.mods.0.value`: 0.5 → 0.2 (+1 lines, ×0.4) | dps_dummy: 60.4 → 30.9 | 16.8 | moved, closes 68% | none moved |
| 9 | skill `glare_ice` | `skills.glare_ice.baseDamage.cold.0`: 4 → 10 (+1 lines, ×2.5) | dps_dummy: 1.3 → 3.2 | 4 | moved, closes 70% | none moved |
| 10 | skill `trailblaze` | `skills.trailblaze.baseDamage.fire.0`: 6 → 2.8 (+1 lines, ×0.47) | dps_dummy: 65.7 → 32 | 31.1 | moved | none moved |
| 11 | skill `keening_shriek` | `skills.keening_shriek.baseDamage.physical.0`: 4 → 8 (+1 lines, ×2) | dps_dummy: 1.9 → 3.9 | 3.6 | moved | none moved |
| 12 | support `sundering_flight` | `supports.sundering_flight.fissureTrail.damageScale`: 0.4 → 0.16 | dps_dummy: 49.4 → 30 | 19.5 | moved, closes 65% | none moved |
| 13 | support `volley` | `supports.volley.mods[stat=damage].value`: -0.25 → -0.63 | dps_dummy: 93.1 → 46.6 | 54 | moved | none moved |
| 14 | affix `apply_poison` | `affixes.apply_poison.tiers.0.ranges.0.0`: 0.22 → 0.088 (+9 lines, ×0.4) | dps_out: 385.2 → 269.3 | 129.6 | moved, closes 45% | none moved |
| 15 | skill `zealots_cadence` | `skills.zealots_cadence.baseDamage.physical.0`: 14 → 35 (+1 lines, ×2.5) | dps_dummy: 14.4 → 27.5 | 45.7 | moved, closes 42% | none moved |

<details><summary>Repro commands</summary>

1. `npm run sim -- whatif --knob 'skills.caltrops.baseDamage*2.5' --scenarios pressure:trapper:30 --seeds 30 --base-seed 1643477867`. Same change at other bands: `pressure:trapper:5` 0.5→0.6, `pressure:trapper:10` 0.2→0.5, `pressure:trapper:20` 0.1→0.3, `pressure:trapper:40` 0→0.1
2. `npm run sim -- whatif --knob 'monsters.grave_shambler.explodeOnDeath*0.4' --scenarios skill:shambler_horde:40 --seeds 30 --base-seed 1643477867`. Other dials on this metric (elasticity): cooldown -0.71, useTime -0.36. Same change at other bands: `skill:shambler_horde:5` 257.8→103.1, `skill:shambler_horde:10` 768.4→307.4, `skill:shambler_horde:20` 3055.9→1222.4
3. `npm run sim -- whatif --knob 'skills.arclight_rain.baseDamage*0.4' --scenarios skill:arclight_rain:40 --seeds 30 --base-seed 1643477867`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.19, useTime 0.16. Same change at other bands: `skill:arclight_rain:5` 153.3→61.3, `skill:arclight_rain:10` 186→74.4, `skill:arclight_rain:20` 235→94
4. `npm run sim -- whatif --knob 'skills.trumpet_peal.baseDamage*2.5' --knob 'skills.harrowing_wail.baseDamage*2.5' --scenarios parity:firebrand:40 --seeds 30 --base-seed 1643477867`. Same change at other bands: `parity:firebrand:5` 0→0.1, `parity:firebrand:10` 0→0.1, `parity:firebrand:20` 0→0
5. `npm run sim -- whatif --knob 'skills.marshlight.baseDamage*0.4' --scenarios skill:marshlight:10 --seeds 30 --base-seed 1643477867`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.72, manaCost -0.03. Same change at other bands: `skill:marshlight:5` 226.5→90.6, `skill:marshlight:20` 315.8→126.2, `skill:marshlight:40` 443.3→177.9
6. `npm run sim -- whatif --knob 'skills.mirespume.baseDamage*0.41' --scenarios skill:mirespume:10 --seeds 30 --base-seed 1643477867`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.57. Same change at other bands: `skill:mirespume:5` 208.2→85.4, `skill:mirespume:20` 284.8→116.8, `skill:mirespume:40` 392.1→160.8
7. `npm run sim -- whatif --knob 'monsters.bombard_demon.explodeOnDeath*0.42' --scenarios skill:infernal_bombardment:40 --seeds 30 --base-seed 1643477867`. Other dials on this metric (elasticity): cooldown -0.81. Same change at other bands: `skill:infernal_bombardment:5` 239.5→102.8, `skill:infernal_bombardment:10` 685.5→291.4, `skill:infernal_bombardment:20` 2624.9→1109.6
8. `npm run sim -- whatif --knob 'supports.fire_walker.mods*0.4' --scenarios socketed:phoenix_dive:fire_walker:20 --seeds 30 --base-seed 1643477867`
9. `npm run sim -- whatif --knob 'skills.glare_ice.baseDamage*2.5' --scenarios skill:glare_ice:40 --seeds 30 --base-seed 1643477867`. Other dials on this metric (elasticity): cooldown -1.38, baseDamage 1. Same change at other bands: `skill:glare_ice:5` 0.7→1.9, `skill:glare_ice:10` 0.8→2.1, `skill:glare_ice:20` 1→2.4
10. `npm run sim -- whatif --knob 'skills.trailblaze.baseDamage*0.47' --scenarios skill:trailblaze:20 --seeds 30 --base-seed 1643477867`. Other dials on this metric (elasticity): baseDamage 0.98, cooldown -0.76. Same change at other bands: `skill:trailblaze:5` 50.8→25.2, `skill:trailblaze:10` 56.7→27.9, `skill:trailblaze:40` 86.9→41.4
11. `npm run sim -- whatif --knob 'skills.keening_shriek.baseDamage*2' --scenarios skill:keening_shriek:40 --seeds 30 --base-seed 1643477867`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.89. Same change at other bands: `skill:keening_shriek:5` 1.1→2.2, `skill:keening_shriek:10` 1.2→2.4, `skill:keening_shriek:20` 1.4→2.8
12. `npm run sim -- whatif --knob 'supports.sundering_flight.fissureTrail.damageScale*0.4' --scenarios socketed:ball_lightning:sundering_flight:20 --seeds 30 --base-seed 1643477867`
13. `npm run sim -- whatif --knob 'supports.volley.mods[stat=damage].value*2.5' --scenarios socketed:soulflay:volley:20 --seeds 30 --base-seed 1643477867`
14. `npm run sim -- whatif --knob 'affixes.apply_poison.tiers.*.ranges*0.4' --scenarios affix:warrior:20:helmet:apply_poison:10397677:spar --seeds 30 --base-seed 1643477867`
15. `npm run sim -- whatif --knob 'skills.zealots_cadence.baseDamage*2.5' --scenarios skill:zealots_cadence:20 --seeds 30 --base-seed 1643477867`. Other dials on this metric (elasticity): baseDamage 0.61. Same change at other bands: `skill:zealots_cadence:5` 11.1→21.4, `skill:zealots_cadence:10` 12.5→24, `skill:zealots_cadence:40` 22.4→43

Run from commit `80edcb80f273846cbfea2ca0701971a8aa5f9c9b`.
</details>

Too noisy to call: class `beguiler`, class `hivecaller`, class `assassin`, affix `hadal_cold`. The solved number moved each by less than its own seed-to-seed spread, so these need a calmer rig or more seeds before they mean anything.

### Combinations that run away

Confirmed on fresh dice at 20 times or more what their parts predict. A number this far out usually means damage feeding itself, so no single number fixes it: each needs a call on whether the feedback should be bounded.

- `class:sorcerer + primary:righteous_fire + support:seismic_march + support:unleash`: measured 3.5e+16 damage per second, its parts predict 2729.1. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJzb3JjZXJlciIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJyaWdodGVvdXNfZmlyZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInNpZWdlYnJlYWtlciIsImNsYW1vciIsImRlbGliZXJhdGVfcnVpbiJdfSx7ImlkIjoic3Rvcm1iaW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsidGVtcGVzdF9yYW5nZSIsIndyYWl0aF9wYXNzYWdlIl19LHsiaWQiOiJ2ZW50X2hvcCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInZhbXBpcmljIl19LHsiaWQiOiJjb21idXN0aW9uX3N0cmlrZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNlaXNtaWNfbWFyY2giLCJhY2NlbGVyYXRlZCIsInVubGVhc2giLCJzY2F0dGVyZWRfY2FzY2FkZSJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6MjA5NDEzNTU1MiwidW5pcXVlcyI6eyJiZWx0Ijoic3RhbmRpbmdfdG9hc3QiLCJib290cyI6InJpbWV3YWtlIn19:spar --seeds 30 --base-seed 1643477867`</details>
- `class:apothecary + unique:cindervigil + support:unleash + support:accelerated`: measured 1.7e+11 damage per second, its parts predict 1181.6. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJhcG90aGVjYXJ5IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6Im1hcmsiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzcGVudGJhbmUiLCJzdG9yZWRfdmVyZGljdCIsIm1lYXN1cmVkX2JsYWRlIiwic2xvd19icmV3Il19LHsiaWQiOiJmbGFtZV93cmVhdGgiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJhcG90aGVvc2lzIl19LHsiaWQiOiJjb21idXN0aW9uX3N0cmlrZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNlaXNtaWNfbWFyY2giLCJhY2NlbGVyYXRlZCIsInVubGVhc2giLCJzY2F0dGVyZWRfY2FzY2FkZSJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjozMTQ1MTEwOSwidW5pcXVlcyI6eyJoZWxtZXQiOiJjaW5kZXJ2aWdpbCIsInJpbmcxIjoic2hhcmVkX2N1cCJ9fQ:spar --seeds 30 --base-seed 1643477867`</details>
- `class:summoner + support:seismic_march + support:untouched_might + support:no_mans_land`: measured 2.4e+10 damage per second, its parts predict 441.3. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJzdW1tb25lciIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJjb2xkX3ZvcnRleCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInVudG91Y2hlZF9taWdodCIsImJ1cmllZF9jaGFyZ2UiLCJub19tYW5zX2xhbmQiLCJzZWlzbWljX21hcmNoIl19LHsiaWQiOiJjb21idXN0aW9uX3N0cmlrZSIsInJhcml0eSI6ImxlZ2VuZGFyeSJ9XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6ODY0NzE5MjEwLCJ1bmlxdWVzIjp7Imdsb3ZlcyI6InJvdGVfaGFuZCJ9fQ:spar --seeds 30 --base-seed 1643477867`</details>
- `class:berserker + unique:cinderstep + unique:cindervigil + primary:devouring_swarm`: measured 2.3e+9 damage per second, its parts predict 71619. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZGV2b3VyaW5nX3N3YXJtIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsic2xpcHN0cmVhbSJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJzdW5iYWtlZF9lZGdlIiwiZWZmaWNpZW5jeSJdfSx7ImlkIjoicmVwdWxzb3JfYmVhY29uIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJjYXN0X29uX2JsZWVkIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjo4Njk3ODg1MTcsInVuaXF1ZXMiOnsiYm9vdHMiOiJjaW5kZXJzdGVwIiwiaGVsbWV0IjoiY2luZGVydmlnaWwifX0:spar --seeds 30 --base-seed 1643477867`</details>
- `class:berserker + unique:cinderstep + support:seismic_march + support:unleash`: measured 3.0e+7 damage per second, its parts predict 8349.7. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoic3F1YWxsX2JpdGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJib25kYnJlYWtlciIsIm9zdGluYXRvIiwic3RvcmVkX3ZlcmRpY3QiLCJtYWRkZXJpbmciXX0seyJpZCI6ImNvbWJ1c3Rpb25fc3RyaWtlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2Vpc21pY19tYXJjaCIsImFjY2VsZXJhdGVkIiwidW5sZWFzaCIsInNjYXR0ZXJlZF9jYXNjYWRlIl19LHsiaWQiOiJmbGFtZV9ibGFzdCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZ2lhbnRzYmFuZSIsImJ1cmllZF9jaGFyZ2UiXX0seyJpZCI6InJlcHVsc29yX2JlYWNvbiIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZmxlZXRmb290IiwicG9seXBob255Il19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjo4Njk3ODg1MTcsInVuaXF1ZXMiOnsiYm9vdHMiOiJjaW5kZXJzdGVwIiwiZ2xvdmVzIjoiZ2FsZXdyaWdodHMifX0:spar --seeds 30 --base-seed 1643477867`</details>
- `class:trapper + support:unleash + support:scattered_cascade + support:accelerated`: measured 2.7e+7 damage per second, its parts predict 287.2. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJ0cmFwcGVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6InN0YWNrX3RoZV9kZWNrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsicXVhaWxiYW5lIiwidGF1dF93aXJlIiwib3Zlcm1hdGNoIiwibW9ub2xpdGgiXSwibGltYiI6MH0seyJpZCI6InNoYWRvd19jbG9uZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbIm1lYXN1cmVkX2JsYWRlIl0sImxpbWIiOjF9LHsiaWQiOiJkZXZvdXJpbmdfc3dhcm0iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJzbG93X21hdGNoIl19LHsiaWQiOiJjb21idXN0aW9uX3N0cmlrZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbIm5vX21hbnNfbGFuZCIsImFjY2VsZXJhdGVkIiwidW5sZWFzaCIsInNjYXR0ZXJlZF9jYXNjYWRlIl19XSwib2ZmIjoiY3JpdCIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjoxNzkzOTM5OTE3LCJ1bmlxdWVzIjp7ImFtdWxldCI6ImJvcnJvd2VkX2JyZWF0aCIsImNoZXN0IjoiaG9sbG93X3NvdmVyZWlnbiJ9fQ:spar --seeds 30 --base-seed 1643477867`</details>
- `class:resonator + support:seismic_march + support:unleash + support:scattered_cascade`: measured 1.0e+7 damage per second, its parts predict 1948.9. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJyZXNvbmF0b3IiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoic3F1YWxsX3J1bmUiLCJyYXJpdHkiOiJsZWdlbmRhcnkifSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJhY2NlbGVyYW5kbyIsImVmZmljaWVuY3kiXX0seyJpZCI6InJlcHVsc29yX2JlYWNvbiIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZmxlZXRmb290Il19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjg2OTc4ODUxNywidW5pcXVlcyI6eyJyaW5nMSI6ImNvYWxfcmVtZW1iZXJlZCJ9fQ:spar --seeds 30 --base-seed 1643477867`</details>
- `class:resonator + support:unleash + support:scattered_cascade + support:accelerando`: measured 1165884.3 damage per second, its parts predict 433.1. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJyZXNvbmF0b3IiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZ3JpdF9zdGFuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiLCJvdmVybWF0Y2giLCJvc3RpbmF0byJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJhY2NlbGVyYXRlZCIsInVubGVhc2giLCJzY2F0dGVyZWRfY2FzY2FkZSJdfSx7ImlkIjoiZmxhbWVfYmxhc3QiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImFjY2VsZXJhbmRvIiwiZWZmaWNpZW5jeSJdfSx7ImlkIjoicmVwdWxzb3JfYmVhY29uIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJmbGVldGZvb3QiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjg2OTc4ODUxNywidW5pcXVlcyI6eyJhbXVsZXQiOiJ0dW5pbmdfZm9yayIsInJpbmcxIjoiY29hbF9yZW1lbWJlcmVkIn19:spar --seeds 30 --base-seed 1643477867`</details>
- `class:ranger + support:remnants + support:creeping_fumes + support:maddening_miasma`: measured 329664.8 damage per second, its parts predict 0.8. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJyYW5nZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZXZpc2NlcmF0ZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsImxpbWIiOjB9LHsiaWQiOiJzdGF0aWNfc2hvY2siLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJyZW1uYW50cyJdfSx7ImlkIjoid2FyX2NoYW50IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiY3JlZXBpbmdfZnVtZXMiLCJtYWRkZW5pbmdfbWlhc21hIiwicml0YXJkYW5kbyJdLCJsaW1iIjowfSx7ImlkIjoiYmVndWlsZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsImxpbWIiOjF9XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJ3YXJkIiwiZ2VhciI6InJhcmUiLCJncyI6MzMzNjAzNDA5fQ:spar --seeds 30 --base-seed 1643477867`</details>
- `class:summoner + support:cascade + support:blood_toll + support:no_mans_land`: measured 6137.3 damage per second, its parts predict 3.4. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJzdW1tb25lciIsImx2bCI6MjAsInNraWxscyI6W3siaWQiOiJvcmJpdGFsX2JsYWRlcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbIm1hZGRlcmluZyJdfSx7ImlkIjoidHJhbnNmaXhpbmdfZ2F6ZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbImlnbml0ZV9jaGFuY2UiLCJibG9vZF90b2xsIl19LHsiaWQiOiJzaGFtYmxlcl9ob3JkZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsImxpbWIiOjF9LHsiaWQiOiJhZWdpc193YXJkIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsiY2FzY2FkZSIsImNyZXNjZW5kbyIsIm5vX21hbnNfbGFuZCIsImFsYWNyaXR5Il0sImxpbWIiOjB9XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjE5MTc3MDA0MCwidW5pcXVlcyI6eyJhbXVsZXQiOiJ0dW5pbmdfZm9yayIsImNoZXN0IjoiZ3JvdW5kZWRfbGF0dGljZSJ9fQ:spar --seeds 30 --base-seed 1643477867`</details>

### Flagged for your decision

The numbers an author would reach for did not move these enough. They are not proposals: each needs a call on whether the mechanic is right, and none has been touched.

- class `chronomancer`: The numbers an author would reach for barely move this: skills.stasis_lock.baseDamage ×2.5 closes 14%; classes.chronomancer.attributes ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- skill `hurricane`: The numbers an author would reach for barely move this: skills.hurricane.baseDamage ×2.5 closes 15%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `amalgam_fleshweaver`: The numbers an author would reach for barely move this: monsters.amalgam_fleshweaver.base.life ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- support `resounding_echo`: The numbers an author would reach for barely move this: supports.resounding_echo.mods ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `sharper`: The numbers an author would reach for barely move this: skills.thrown_ace.baseDamage ×1 closes 0%; classes.sharper.attributes ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `stygian_doll`: The numbers an author would reach for barely move this: monsters.stygian_doll.base.life ×2.4 closes 4%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- affix `proc_concussive`: The numbers an author would reach for barely move this: affixes.proc_concussive.tiers.*.ranges ×0.76 closes 13%. The cause may not be numeric, so this needs your decision rather than a tuning pass.

## Outliers

432 rows sit far from their cohort (log-scale median and MAD, z ≥ 3 and a ratio past 1.8× or 0.55×), 33 of them new tonight. Warned rows and zero rows never enter a cohort.

| | kind | subject | metric | value | cohort median | ratio | z | cohort |
|---|---|---|---|---:|---:|---:|---:|---|
|  | support | `sundering_flight` | output_multiplier | 3 | 1 | 2.9× | 18.2 | supports · effective hosts |
|  | support | `fire_walker` | output_multiplier | 2.8 | 1 | 2.74× | 17.2 | supports · effective hosts |
| 🆕 | interaction | `class:sorcerer + primary:righteous_fire + support:seismic_march + support:unleash` | dps_out | 1.8e+10 | 2729.1 | 6592951.57× | 16.1 | L40 main effects |
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
| 🆕 | interaction | `class:apothecary + unique:cindervigil + support:unleash + support:accelerated` | dps_out | 1.3e+7 | 1181.6 | 11298.32× | 11 | L20 main effects |
| 🆕 | interaction | `class:apothecary + unique:cindervigil + support:unleash + support:accelerated` | dps_out | 3.2e+7 | 3034.3 | 10567.37× | 10.9 | L20 main effects |
|  | support | `elemental_conduction` | output_multiplier | 1.9 | 1 | 1.82× | 10.2 | supports · effective hosts |
|  | monster_threat | `hadal_lantern` | dps_in | 0.1 | 15.3 | 0× | -10 | L12 · magician · body |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.07× | -9.9 | L40 · geared · pressure · kill_rate |
| 🆕 | interaction | `class:berserker + unique:cinderstep + support:seismic_march + support:unleash` | dps_out | 9.5e+7 | 8349.7 | 11357.18× | 9.6 | L40 main effects |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.05× | -9.2 | L20 · kitted · pressure · kill_rate |
| 🆕 | interaction | `class:ranger + support:remnants + support:creeping_fumes + support:maddening_miasma` | dps_out | 5307.9 | 0.8 | 6554.17× | 9 | L40 main effects |
| 🆕 | interaction | `class:resonator + support:unleash + support:scattered_cascade + support:accelerando` | dps_out | 2751634 | 433.1 | 6353.02× | 9 | L40 main effects |
| 🆕 | interaction | `class:summoner + support:cascade + support:blood_toll + support:no_mans_land` | dps_out | 6577.1 | 3.4 | 1928.96× | 8.9 | L20 main effects |
|  | class | `chronomancer` | kill_rate | 0 | 0.4 | 0.02× | -8.9 | L5 · geared · pressure · kill_rate |
|  | monster_threat | `dream_tick` | dps_in | 0.1 | 15.3 | 0.01× | -8.9 | L12 · magician · body |

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

</details>

## Build search

143,210 candidates tonight (33,528 refused by the real gates), 1,824,605 over 27 night(s). The archive holds 1439 elite rows; 1427 were re-measured on this commit. Tried so far in a legal build: 39 of 39 classes, 576 of 576 primarys, 604 of 604 skills, 455 of 455 supports, 41 of 41 uniques.

| band | objective | build (top factors) | value | × band median | repro |
|---|---|---|---:|---:|---|
| L5 | offense | `class:runeweaver` `off:crit` `def:life` `gear:rare` `skill:living_bomb` | 86119.8 | 2687.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoibGl2aW5nX2JvbWIiLCJyYXJpdHkiOiJtYWdpYyIsIm92ZXIiOjEsInN1cHBvcnRzIjpbInJpdGFyZGFuZG8iXX0seyJpZCI6InN0b3JtYmluZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInRlbXBlc3RfcmFuZ2UiXX0seyJpZCI6ImVtYmVyYmluZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImZsZWV0aW5nX2Rldm90aW9uIiwiYm9uZGJyZWFrZXIiLCJhY2NlbGVyYW5kbyIsImJsb29kX3RvbGwiXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJmb3JraW5nIiwibW91bnRpbmdfZnJlbnp5IiwicGFydGluZ19qdWRnZW1lbnQiLCJzdW5kZXJpbmdfZmxpZ2h0Il19XSwib2ZmIjoiY3JpdCIsImRlZiI6ImxpZmUiLCJnZWFyIjoicmFyZSIsImdzIjoxNDM3MjI5MDg5LCJ1bmlxdWVzIjp7ImFtdWxldCI6InN0b3JtY2FsbCIsInJpbmcxIjoiZW1iZXJicmFuZCJ9fQ --seeds 8 --base-seed 732892014`</details> |
| L5 | offense | `class:magician` `off:crit` `def:life` `gear:rare` `skill:corpse_shift` | 75272.7 | 2349× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6NSwic2tpbGxzIjpbeyJpZCI6ImNvcnBzZV9zaGlmdCIsInJhcml0eSI6Im1hZ2ljIn0seyJpZCI6InN0b3JtYmluZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInRlbXBlc3RfcmFuZ2UiLCJzcXVhcmVfc2lnaWwiXX0seyJpZCI6ImVtYmVyYmluZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImZsZWV0aW5nX2Rldm90aW9uIiwiYm9uZGJyZWFrZXIiLCJhY2NlbGVyYW5kbyIsImJsb29kX3RvbGwiXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJmb3JraW5nIiwibW91bnRpbmdfZnJlbnp5IiwicGFydGluZ19qdWRnZW1lbnQiLCJzdW5kZXJpbmdfZmxpZ2h0Il19XSwib2ZmIjoiY3JpdCIsImRlZiI6ImxpZmUiLCJnZWFyIjoicmFyZSIsImdzIjoxNDM3MjI5MDg5LCJ1bmlxdWVzIjp7ImFtdWxldCI6InN0b3JtY2FsbCIsInJpbmcxIjoiZW1iZXJicmFuZCJ9fQ --seeds 8 --base-seed 1675247983`</details> |
| L5 | clear | `class:resonator` `off:speed` `def:none` `gear:rare` `skill:verdict` | 6 | 19.1× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJyZXNvbmF0b3IiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJ2ZXJkaWN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJ2b2lkcmVuZCIsImNhc3Rfb25fZmxhd2xlc3MiXSwibGltYiI6MX0seyJpZCI6ImNvbnNlY3JhdGlvbiIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInRhdXRfd2lyZSIsIndoaXJsaW5nX3NpZ2lsIl0sImxpbWIiOjB9LHsiaWQiOiJkb29tX2JlbGwiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxfSx7ImlkIjoidHJhbnNmaXhpbmdfZ2F6ZSIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZnJlZXplX2NoYW5jZSJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjM3NzkyODUyOSwidW5pcXVlcyI6eyJnbG92ZXMiOiJ0aXRhbnNfZ3Jhc3AiLCJoZWxtZXQiOiJncmF2ZWJsb29tIn19 --seeds 8 --base-seed 3171270005`</details> |
| L5 | clear | `class:cleric` `off:damage` `def:none` `gear:rare` `skill:detonate_mines` | 6 | 19.1× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjbGVyaWMiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVnaWNpZGUiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfSx7ImlkIjoiZGlnZXN0IiwicmFyaXR5IjoibWFnaWMiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJ0aW1lX2Z1c2UiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6MjM3Mzc5ODExLCJ1bmlxdWVzIjp7ImJvb3RzIjoid2FuZGVyZXJzX3dha2UiLCJnbG92ZXMiOiJ0aXRhbnNfZ3Jhc3AifX0 --seeds 8 --base-seed 1101200737`</details> |
| L10 | offense | `class:chronomancer` `off:speed` `def:life` `gear:rare` `skill:lightning_bolt` | 146770.6 | 3842.9× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjEwLCJza2lsbHMiOlt7ImlkIjoibGlnaHRuaW5nX2JvbHQiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsiY3JpbXNvbl9oYXJ2ZXN0Il19LHsiaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJmbGVldGluZ19kZXZvdGlvbiIsImxpbWJyZWF2ZXIiLCJyYXZlbmluZyIsImV4dGVybWluYXRvciJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNsb3dfYnJldyIsInBhcnRpbmdfanVkZ2VtZW50IiwibW91bnRpbmdfZnJlbnp5IiwicmVtbmFudHMiXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImxpZmUiLCJnZWFyIjoicmFyZSIsImdzIjoxODI5NTQ3OTI2LCJ1bmlxdWVzIjp7ImNoZXN0IjoidGhlX3VubW92ZWQiLCJyaW5nMSI6ImVtYmVyYnJhbmQifX0 --seeds 8 --base-seed 550611285`</details> |
| L10 | offense | `class:magician` `off:speed` `def:armor` `gear:rare` `skill:unholy_aura` | 140113 | 3668.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJ1bmhvbHlfYXVyYSIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoxfSx7ImlkIjoiZnJvc3Rfd2FsbCIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJlcGhlbWVyYWwiXX0seyJpZCI6ImVtYmVyYmluZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImZsZWV0aW5nX2Rldm90aW9uIiwid3JhaXRoX3Bhc3NhZ2UiLCJyYXZlbmluZyIsImV4dGVybWluYXRvciJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNsb3dfYnJldyIsInBhcnRpbmdfanVkZ2VtZW50IiwibW91bnRpbmdfZnJlbnp5IiwicmVtbmFudHMiXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6MTgyOTU0NzkyNiwidW5pcXVlcyI6eyJjaGVzdCI6InRoZV91bm1vdmVkIiwicmluZzEiOiJlbWJlcmJyYW5kIn19 --seeds 8 --base-seed 3210481898`</details> |
| L10 | clear | `class:warlord` `off:speed` `def:ward` `gear:rare` `skill:blood_mortgage` | 6 | 25× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJ3YXJsb3JkIiwibHZsIjoxMCwic2tpbGxzIjpbeyJpZCI6ImJsb29kX21vcnRnYWdlIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbImFjY2VsZXJhdGVkIl0sImxpbWIiOjB9LHsiaWQiOiJkb29tX2JlbGwiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJtZWFzdXJlZF9ibGFkZSJdfSx7ImlkIjoia2VlbmluZ19zaHJpZWsiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzcXVhcmVfc2lnaWwiLCJjYXN0X3doaWxlX2NoYW5uZWxpbmciLCJjb25jdXNzaXZlX2Jsb3dzIiwic2hhdHRlcmdsYXNzIl19LHsiaWQiOiJoZWFsaW5nX3N0cmVhbSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbIndyYWl0aF9wYXNzYWdlIiwiZGVzcGVyYXRlX21lYXN1cmVzIiwic2xvd19icmV3Il19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJ3YXJkIiwiZ2VhciI6InJhcmUiLCJncyI6MzY3NzczNjIwLCJ1bmlxdWVzIjp7ImJvb3RzIjoid2FuZGVyZXJzX3dha2UiLCJyaW5nMSI6InNoYXJlZF9jdXAifX0 --seeds 8 --base-seed 2340314344`</details> |
| L10 | clear | `class:cleric` `off:speed` `def:none` `gear:rare` `skill:arcane_missiles` | 6 | 25× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjbGVyaWMiLCJsdmwiOjEwLCJza2lsbHMiOlt7ImlkIjoiYXJjYW5lX21pc3NpbGVzIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbImNoYW90aWNfZGlzY2hhcmdlIiwiZm9ya2luZyIsImFkZGxpbmciXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjIxMzE4MDQwMjksInVuaXF1ZXMiOnsiZ2xvdmVzIjoiZ2FsZXdyaWdodHMiLCJyaW5nMSI6ImVtYmVyYnJhbmQifX0 --seeds 8 --base-seed 2274903347`</details> |
| L20 | offense | `class:flagellant` `off:damage` `def:ward` `gear:rare` `skill:wildfire_sweep` | 871726.9 | 16216.3× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJmbGFnZWxsYW50IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6IndpbGRmaXJlX3N3ZWVwIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsicmVtbmFudF9jb25kdWl0Iiwic2llZ2VicmVha2VyIiwidW5sZWFzaCIsInN1bmJha2VkX2VkZ2UiXX0seyJpZCI6InN1bW1vbl9ib25lX2dvbGVtIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbInN0ZWFkeV9uZXJ2ZSJdLCJsaW1iIjoxfSx7ImlkIjoiZ3Jhc3BpbmdfY2hhc20iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJibG9vZF90b2xsIiwic3BsaW50ZXJlZF9lYXJ0aCIsImFjY2VsZXJhbmRvIiwiZGVzcGVyYXRpb24iXX0seyJpZCI6ImZyb3N0Z3VhcmQiLCJyYXJpdHkiOiJtYWdpYyIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInJlZ2ljaWRlIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjExNzkwNTYwMjMsInVuaXF1ZXMiOnsiYmVsdCI6IndpbnRlcl9hZnRlcl95b3UiLCJib290cyI6InJpbWV3YWtlIn19 --seeds 8 --base-seed 2920360821`</details> |
| L20 | offense | `class:apothecary` `off:damage` `def:armor` `gear:rare` `skill:mark` | 655594.4 | 12195.7× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJhcG90aGVjYXJ5IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6Im1hcmsiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzcGVudGJhbmUiLCJzdG9yZWRfdmVyZGljdCIsIm1lYXN1cmVkX2JsYWRlIiwic2xvd19icmV3Il19LHsiaWQiOiJkZXZvdXJpbmdfc3dhcm0iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJtYW5hX2ZlZWRlciJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJxdWlldF9oYW5kIiwiZWZmaWNpZW5jeSJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6MzE0NTExMDksInVuaXF1ZXMiOnsiaGVsbWV0IjoiY2luZGVydmlnaWwiLCJyaW5nMSI6InNoYXJlZF9jdXAifX0 --seeds 8 --base-seed 2582888644`</details> |
| L20 | clear | `class:tamer` `off:crit` `def:armor` `gear:rare` `skill:detonate_mines` | 6 | 33.1× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJ0YW1lciIsImx2bCI6MjAsInNraWxscyI6W3siaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImNhc3Rfb25fYmxlZWQiXX0seyJpZCI6ImZyb3N0X3B1bHNlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsicGllcmNpbmciXX0seyJpZCI6ImRvb21fYmVsbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNoYXR0ZXJnbGFzcyIsImZsb3dicmVha2VyIiwidXByb290ZXIiLCJtZWFzdXJlZF9ibG93cyJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjUzODk1NzY0NSwidW5pcXVlcyI6eyJhbXVsZXQiOiJ0dW5pbmdfZm9yayJ9fQ --seeds 8 --base-seed 1469228816`</details> |
| L20 | clear | `class:wallwright` `off:damage` `def:evasion` `gear:rare` `skill:corpse_shift` | 6 | 33.1× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJ3YWxsd3JpZ2h0IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImNvcnBzZV9zaGlmdCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbImZyYWdtZW50YXRpb24iLCJ3cmFpdGhfcGFzc2FnZSJdfSx7ImlkIjoiYmVja29uX3BhbGV3aXNwcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInByZXNzdXJlX3NlYWwiLCJjbGFtb3IiXX0seyJpZCI6ImRvb21fYmVsbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInN1bW1vbl9waGFudGFzbSJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjoxOTEyMDgzMzk1LCJ1bmlxdWVzIjp7ImJlbHQiOiJibG9vZGxldHRlcnNfZ2lyZGxlIn19 --seeds 8 --base-seed 2340314344`</details> |
| L40 | offense | `class:berserker` `off:crit` `def:life` `gear:rare` `skill:devouring_swarm` | 942793.4 | 9554.7× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZGV2b3VyaW5nX3N3YXJtIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsic2xvd19tYXRjaCJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJhY2NlbGVyYW5kbyIsImVmZmljaWVuY3kiXX0seyJpZCI6InJlcHVsc29yX2JlYWNvbiIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiY2FzdF9vbl9ibGVlZCJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJsaWZlIiwiZ2VhciI6InJhcmUiLCJncyI6ODY5Nzg4NTE3LCJ1bmlxdWVzIjp7ImJvb3RzIjoiY2luZGVyc3RlcCIsImdsb3ZlcyI6ImdhbGV3cmlnaHRzIn19 --seeds 8 --base-seed 1055602299`</details> |
| L40 | offense | `class:apothecary` `off:damage` `def:evasion` `gear:rare` `skill:blood_mortgage` | 923231.3 | 9356.4× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJhcG90aGVjYXJ5IiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImJsb29kX21vcnRnYWdlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiaW5zdWxhdGlvbiIsIndhcmRpbmdfZmxlc2giLCJzdG9yZWRfdmVyZGljdCJdLCJsaW1iIjowfSx7ImlkIjoic2hhbWJsZXJfaG9yZGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJwbHVzX21pbmlvbiIsInJhdmVub3VzX3BhY3QiLCJjYXNjYWRpbmdfY2FsbCIsImVwaGVtZXJhbCJdLCJsaW1iIjoxfSx7ImlkIjoiYmVyc2VyayIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImdpYW50c2JhbmUiLCJpbnN1bGF0aW9uIiwiYmxvb2RfcHJpY2UiLCJzZXJlbmVfcG93ZXIiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6NDcxNDczNDczLCJ1bmlxdWVzIjp7ImhlbG1ldCI6ImdyYXZlYmxvb20iLCJyaW5nMSI6ImNvbW1vbl9wdWxzZSJ9fQ --seeds 8 --base-seed 2582888644`</details> |
| L40 | clear | `class:juggernaut` `off:damage` `def:none` `gear:rare` `skill:detonate_mines` | 6 | 26.1× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJqdWdnZXJuYXV0IiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImRldG9uYXRlX21pbmVzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsiZG9taW5pb25fdGl0aGUiLCJzdG9yZWRfdmVyZGljdCIsInNlcmVuZV9wb3dlciIsImd1YXJkZWRfY2FzdGluZyJdfSx7ImlkIjoic2hhdHRlcmNob3JkIiwicmFyaXR5IjoibGVnZW5kYXJ5In0seyJpZCI6InJpZ2h0ZW91c19maXJlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsicmVtbmFudF9jb25kdWl0Il19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjE3NzQzMTA1MjIsInVuaXF1ZXMiOnsiYm9vdHMiOiJyaW1ld2FrZSIsImhlbG1ldCI6ImNpbmRlcnZpZ2lsIn19 --seeds 8 --base-seed 1698258273`</details> |
| L40 | clear | `class:sentinel` `off:speed` `def:none` `gear:rare` `skill:consecration` | 6 | 26.1× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzZW50aW5lbCIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJjb25zZWNyYXRpb24iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJ0YXV0X3dpcmUiXSwibGltYiI6MH0seyJpZCI6ImRvb21fYmVsbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjF9XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6MTYzMDkyNDIwMiwidW5pcXVlcyI6eyJjaGVzdCI6Imdyb3VuZGVkX2xhdHRpY2UifX0 --seeds 8 --base-seed 942489515`</details> |

Playstyles at L5, best build found per style against the band's median style (50 styles): strongest `target · lightning` 82712.1 (2.95×), `self · lightning` 75019.4 (2.68×), `area · lightning` 74883.9 (2.67×), `projectile · lightning` 72189.1 (2.57×); weakest `mark · chaos` 4500.4 (0.16×), `detonate · cold` 8137.7 (0.29×), `court · cold` 12096.2 (0.43×), `detonate · chaos` 13697.7 (0.49×).

Playstyles at L10, best build found per style against the band's median style (50 styles): strongest `projectile · fire` 158541 (2.15×), `aura · fire` 155724.4 (2.11×), `court · fire` 145226.4 (1.97×), `self · fire` 139217.7 (1.89×); weakest `detonate · cold` 7582.9 (0.1×), `detonate · chaos` 10135.1 (0.14×), `projectile · chaos` 32295.5 (0.44×), `construct · physical` 43085.5 (0.58×).

Playstyles at L20, best build found per style against the band's median style (50 styles): strongest `area · fire` 883281.8 (3.13×), `mark · fire` 832705.9 (2.95×), `mark · chaos` 795100.6 (2.82×), `self · fire` 606783.8 (2.15×); weakest `detonate · chaos` 97741.9 (0.35×), `detonate · fire` 154203.6 (0.55×), `detonate · lightning` 164968.1 (0.58×), `mark · lightning` 165592 (0.59×).

Playstyles at L40, best build found per style against the band's median style (50 styles): strongest `court · chaos` 991649.6 (1.49×), `projectile · fire` 991148.9 (1.49×), `aura · fire` 931049.4 (1.4×), `detonate · physical` 930748.8 (1.4×); weakest `court · cold` 237229.1 (0.36×), `target · cold` 262905.4 (0.39×), `mark · cold` 281752.1 (0.42×), `mark · physical` 383475.1 (0.58×).

Main effects at L5 over 14869 rows: strongest `limb:raise_dead#0` 64.16×, `skill:grasping_chasm` 39.09×, `skill:ice_shards` 19.23×, `limb:summon_bone_golem#0` 13.47×, `skill:emberbind` 8.41×; weakest `skill:raise_dead` 0.04×, `limb:shadow_step#1` 0.05×, `skill:infinite_slashes` 0.08×, `primary:reclamation` 0.1×, `limb:war_chant#1` 0.11×.

Main effects at L10 over 21007 rows: strongest `primary:aegis_ward` 26.89×, `skill:grasping_chasm` 24.24×, `skill:infernal_bombardment` 22.48×, `skill:ice_shards` 20.63×, `limb:summon_bone_golem#1` 19.79×; weakest `limb:aegis_ward#0` 0.04×, `limb:decoy#0` 0.04×, `limb:decoy#1` 0.05×, `skill:quiet_step` 0.07×, `limb:shadow_step#0` 0.07×.

Main effects at L20 over 28837 rows: strongest `limb:summon_bone_golem#0` 75.17×, `limb:summon_bone_golem#1` 64.82×, `primary:aegis_ward` 63.06×, `skill:ice_shards` 40.77×, `skill:devouring_swarm` 18.44×; weakest `limb:aegis_ward#0` 0.02×, `limb:aegis_ward#1` 0.04×, `skill:summon_bone_golem` 0.06×, `skill:long_exhale` 0.08×, `primary:ice_shards` 0.09×.

Main effects at L40 over 29808 rows: strongest `limb:shambler_horde#1` 212.05×, `primary:infernal_bombardment` 86.31×, `skill:ice_shards` 29.07×, `limb:spirit_pyre#0` 15×, `skill:grasping_chasm` 13.59×; weakest `limb:aegis_ward#0` 0.03×, `limb:aegis_ward#1` 0.04×, `limb:war_chant#0` 0.08×, `primary:summon_bone_golem` 0.11×, `limb:war_chant#1` 0.13×.

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

**What buffs, hexes, heals and wards add** (196 skills whose own numbers are not damage, at L20, against the same hero without them). Most output beside a plain strike: `infernal_bombardment` 14.1×, `summon_plaguefather` 6.4×, `summon_fire_golem` 4.83×, `summon_flame_sprite` 4.77×, `flame_totem` 4.77×, `shambler_horde` 4.25×, `bind_familiar` 4.22×, `reaper_swarm` 3.88×. Most time survived on the clock: `repulsor_beacon` 11.85×, `summon_blade_wraith` 11.85×, `vampiric_presence` 11.85×, `shambler_horde` 11.85×, `call_the_rift` 10.98×, `reaper_swarm` 10.25×, `summon_wraith` 9.04×, `infernal_bombardment` 6.63×. 35 moved neither at any band: their value lies outside these rigs, or they do nothing.

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
Matrix: 127,530 of 127,530 eligible pairs probed (100%), deep lane on 25887 pairs. Verdicts: effective 78659, blind 30560, inert 14445, negligible 2438, cost_only 1428.
Against the committed ledger (8481 rows): 12616 not on file, 2015 measuring healthy. The ledger only changes through `matrix check --reconcile`.

## What ran, and what did not

| lane | units planned | ok | gate breach | crashed/killed | out of time or not run | episodes | core-hours |
|---|---:|---:|---:|---:|---:|---:|---:|
| baselines | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| audits | 4 | 4 | 0 | 0 | 0 | 0 | 0 |
| expression | 1 | 1 | 0 | 0 | 0 | 1,208 | 0.1 |
| census | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| suites | 2 | 2 | 0 | 0 | 0 | 910 | 0.2 |
| progression | 39 | 39 | 0 | 0 | 0 | 12,480 | 3.4 |
| skills | 10 | 10 | 0 | 0 | 0 | 8,790 | 1.1 |
| skills_vs | 24 | 24 | 0 | 0 | 0 | 24,192 | 4.2 |
| matchups | 26 | 26 | 0 | 0 | 0 | 13,734 | 4.5 |
| bestiary | 64 | 64 | 0 | 0 | 0 | 78,696 | 12.8 |
| attributes | 39 | 39 | 0 | 0 | 0 | 4,914 | 1.7 |
| affixes | 5 | 5 | 0 | 0 | 0 | 3,472 | 0.9 |
| assists | 10 | 10 | 0 | 0 | 0 | 4,752 | 1.6 |
| socket_play | 1 | 1 | 0 | 0 | 0 | 900 | 0.1 |
| globals | 4 | 4 | 0 | 0 | 0 | 1,704 | 0.2 |
| matrix | 198 | 198 | 0 | 0 | 0 | 235,854 | 37.3 |
| matrix_deep | 117 | 117 | 0 | 0 | 0 | 122,122 | 16.2 |
| search | 40 | 40 | 0 | 0 | 0 | 260,692 | 43.2 |
| archive_confirm | 39 | 39 | 0 | 0 | 0 | 22,832 | 5.4 |
| proposals | 48 | 48 | 0 | 0 | 0 | 14,496 | 2.3 |

Every planned unit ran.

Not simulated at all, by design: zone generation and XP pacing, event pressure, multiplayer, and real player skill. Pilots are simple policies, so kit ceilings are floors. Bands stay provisional until you sign them off.
