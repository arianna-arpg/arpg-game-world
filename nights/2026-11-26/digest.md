# Balance farm, night of 2026-11-26

Commit [ad3dcb5f6a](https://github.com/arianna-arpg/arpg-game-world/commit/ad3dcb5f6a7ed94c475f9506c5152b235181b40a), profile `full`. 746,654 episodes, 146.3 core-hours, 285 minutes end to end. [Run](https://github.com/arianna-arpg/arpg-game-world/actions/runs/45834537558).

## ✅ No regressions

Every committed baseline holds, nothing crashed, and the matrix has no new defects since last night.

## What moved since last night

3 row(s) moved past their own noise and 10%. Largest first:

| row | before | after | change |
|---|---:|---:|---:|
| `monster:odyssey_demon:warrior:L25:ttk` | 19.58 | 23.48 | +20% |
| `monster:balor_warlord:warrior:L25:ttk` | 19.58 | 23.48 | +20% |
| `monster:bandit_grenadier:warrior:L5:ttk` | 16.17 | 14.22 | −12% |

## Top proposed numbers

Advisory. Nothing here has been applied, and each needs your sign-off. Each row re-measured the subject on dice the night had not seen, solved for a number through the real game, and verified it at common seeds. 22 outlier(s) did not hold up on fresh dice, or landed within 15% of their target, and were dropped.

| # | subject | change | metric: before → after | cohort target | verdict | guards |
|---:|---|---|---|---:|---|---|
| 1 | class `trapper` | `skills.caltrops.baseDamage.physical.0`: 3 → 7.5 (+1 lines, ×2.5) | kill_rate: 0 → 0.2 | 0.1 | moved | none moved |
| 2 | skill `shambler_horde` | `monsters.grave_shambler.explodeOnDeath`: 2.2 → 0.88 | dps_dummy: 19394.7 → 7757.9 | 680.5 | moved, closes 62% | none moved |
| 3 | skill `arclight_rain` | `skills.arclight_rain.baseDamage.physical.0`: 5 → 2 (+3 lines, ×0.4) | dps_dummy: 347.8 → 139.1 | 93.2 | moved, closes 82% | none moved |
| 4 | skill `marshlight` | `skills.marshlight.baseDamage.chaos.0`: 9 → 3.6 (+1 lines, ×0.4) | dps_dummy: 265.9 → 106.4 | 98.9 | moved | none moved |
| 5 | skill `mirespume` | `skills.mirespume.baseDamage.chaos.0`: 11 → 4.5 (+1 lines, ×0.41) | dps_dummy: 243.6 → 99.9 | 98.9 | moved | none moved |
| 6 | skill `infernal_bombardment` | `monsters.bombard_demon.explodeOnDeath`: 1.6 → 0.67 | dps_dummy: 15916.4 → 6702.7 | 6676.7 | moved | none moved |
| 7 | support `fire_walker` | `supports.fire_walker.mods.0.value`: 0.5 → 0.2 (+1 lines, ×0.4) | dps_dummy: 60.4 → 30.7 | 18.1 | moved, closes 70% | none moved |
| 8 | skill `glare_ice` | `skills.glare_ice.baseDamage.cold.0`: 4 → 10 (+1 lines, ×2.5) | dps_dummy: 1.3 → 3.3 | 4 | moved, closes 72% | none moved |
| 9 | skill `trailblaze` | `skills.trailblaze.baseDamage.fire.0`: 6 → 2.8 (+1 lines, ×0.47) | dps_dummy: 65.4 → 31.9 | 31.1 | moved | none moved |
| 10 | support `sundering_flight` | `supports.sundering_flight.fissureTrail.damageScale`: 0.4 → 0.16 | dps_dummy: 49.9 → 30.4 | 19.6 | moved, closes 64% | none moved |
| 11 | support `volley` | `supports.volley.mods[stat=damage].value`: -0.25 → -0.63 | dps_dummy: 92.8 → 46.4 | 54.2 | moved | none moved |
| 12 | affix `apply_poison` | `affixes.apply_poison.tiers.0.ranges.0.0`: 0.22 → 0.088 (+9 lines, ×0.4) | dps_out: 383.5 → 257.6 | 129.6 | moved, closes 50% | none moved |
| 13 | skill `keening_shriek` | `skills.keening_shriek.baseDamage.physical.0`: 4 → 6.8 (+1 lines, ×1.7) | dps_dummy: 2 → 3.4 | 3.6 | moved, closes 85% | none moved |
| 14 | skill `zealots_cadence` | `skills.zealots_cadence.baseDamage.physical.0`: 14 → 35 (+1 lines, ×2.5) | dps_dummy: 14.5 → 27.8 | 45.7 | moved, closes 43% | none moved |
| 15 | skill `epidemic` | `skills.epidemic.baseDamage.chaos.0`: 3 → 7.5 (+1 lines, ×2.5) | dps_dummy: 1 → 2.6 | 7.9 | moved, closes 23% | none moved |

<details><summary>Repro commands</summary>

1. `npm run sim -- whatif --knob 'skills.caltrops.baseDamage*2.5' --scenarios pressure:trapper:30 --seeds 30 --base-seed 3137174386`. Same change at other bands: `pressure:trapper:5` 0.4→0.6, `pressure:trapper:10` 0.2→0.6, `pressure:trapper:20` 0→0.3, `pressure:trapper:40` 0→0.1
2. `npm run sim -- whatif --knob 'monsters.grave_shambler.explodeOnDeath*0.4' --scenarios skill:shambler_horde:40 --seeds 30 --base-seed 3137174386`. Other dials on this metric (elasticity): cooldown -0.71, useTime -0.36. Same change at other bands: `skill:shambler_horde:5` 257.8→103.1, `skill:shambler_horde:10` 768.4→307.4, `skill:shambler_horde:20` 3055.9→1222.4
3. `npm run sim -- whatif --knob 'skills.arclight_rain.baseDamage*0.4' --scenarios skill:arclight_rain:40 --seeds 30 --base-seed 3137174386`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.21, useTime 0.15. Same change at other bands: `skill:arclight_rain:5` 152→60.8, `skill:arclight_rain:10` 184.5→73.8, `skill:arclight_rain:20` 233.2→93.3
4. `npm run sim -- whatif --knob 'skills.marshlight.baseDamage*0.4' --scenarios skill:marshlight:10 --seeds 30 --base-seed 3137174386`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.67, manaCost -0.03. Same change at other bands: `skill:marshlight:5` 230.1→92.1, `skill:marshlight:20` 318.6→127.5, `skill:marshlight:40` 456.2→182.6
5. `npm run sim -- whatif --knob 'skills.mirespume.baseDamage*0.41' --scenarios skill:mirespume:10 --seeds 30 --base-seed 3137174386`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.45. Same change at other bands: `skill:mirespume:5` 212.2→87, `skill:mirespume:20` 290.4→119.1, `skill:mirespume:40` 399.8→163.9
6. `npm run sim -- whatif --knob 'monsters.bombard_demon.explodeOnDeath*0.42' --scenarios skill:infernal_bombardment:40 --seeds 30 --base-seed 3137174386`. Other dials on this metric (elasticity): cooldown -0.82. Same change at other bands: `skill:infernal_bombardment:5` 240.3→103.5, `skill:infernal_bombardment:10` 686.2→292.2, `skill:infernal_bombardment:20` 2623.3→1108.1
7. `npm run sim -- whatif --knob 'supports.fire_walker.mods*0.4' --scenarios socketed:phoenix_dive:fire_walker:20 --seeds 30 --base-seed 3137174386`
8. `npm run sim -- whatif --knob 'skills.glare_ice.baseDamage*2.5' --scenarios skill:glare_ice:40 --seeds 30 --base-seed 3137174386`. Other dials on this metric (elasticity): cooldown -1.24, baseDamage 1. Same change at other bands: `skill:glare_ice:5` 0.7→1.8, `skill:glare_ice:10` 0.8→2.1, `skill:glare_ice:20` 1→2.4
9. `npm run sim -- whatif --knob 'skills.trailblaze.baseDamage*0.47' --scenarios skill:trailblaze:20 --seeds 30 --base-seed 3137174386`. Other dials on this metric (elasticity): baseDamage 1.02, cooldown -0.75. Same change at other bands: `skill:trailblaze:5` 50.5→25.1, `skill:trailblaze:10` 56.6→27.8, `skill:trailblaze:40` 87→41.2
10. `npm run sim -- whatif --knob 'supports.sundering_flight.fissureTrail.damageScale*0.4' --scenarios socketed:ball_lightning:sundering_flight:20 --seeds 30 --base-seed 3137174386`
11. `npm run sim -- whatif --knob 'supports.volley.mods[stat=damage].value*2.5' --scenarios socketed:soulflay:volley:20 --seeds 30 --base-seed 3137174386`
12. `npm run sim -- whatif --knob 'affixes.apply_poison.tiers.*.ranges*0.4' --scenarios affix:warrior:20:helmet:apply_poison:10397677:spar --seeds 30 --base-seed 3137174386`
13. `npm run sim -- whatif --knob 'skills.keening_shriek.baseDamage*1.7' --scenarios skill:keening_shriek:40 --seeds 30 --base-seed 3137174386`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.85. Same change at other bands: `skill:keening_shriek:5` 1.2→2, `skill:keening_shriek:10` 1.3→2.2, `skill:keening_shriek:20` 1.5→2.6
14. `npm run sim -- whatif --knob 'skills.zealots_cadence.baseDamage*2.5' --scenarios skill:zealots_cadence:20 --seeds 30 --base-seed 3137174386`. Other dials on this metric (elasticity): baseDamage 0.62. Same change at other bands: `skill:zealots_cadence:5` 11.1→21.4, `skill:zealots_cadence:10` 12.5→24.1, `skill:zealots_cadence:40` 22.6→43.4
15. `npm run sim -- whatif --knob 'skills.epidemic.baseDamage*2.5' --scenarios skill:epidemic:40 --seeds 30 --base-seed 3137174386`. Other dials on this metric (elasticity): cooldown -1.3, baseDamage 1. Same change at other bands: `skill:epidemic:5` 1→2.5, `skill:epidemic:10` 1→2.5, `skill:epidemic:20` 1→2.5

Run from commit `ad3dcb5f6a7ed94c475f9506c5152b235181b40a`.
</details>

Too noisy to call: class `firebrand`, class `assassin`, class `beguiler`, class `hivecaller`, class `wallwright`, class `sharper`, skill `requiem`, monster_durability `amalgam_bonelord`. The solved number moved each by less than its own seed-to-seed spread, so these need a calmer rig or more seeds before they mean anything.

### Combinations that run away

Confirmed on fresh dice at 20 times or more what their parts predict. A number this far out usually means damage feeding itself, so no single number fixes it: each needs a call on whether the feedback should be bounded.

- `class:juggernaut + primary:umbral_lance + unique:cindervigil + support:scattered_cascade`: measured 1.5e+15 damage per second, its parts predict 60879.9. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJqdWdnZXJuYXV0IiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6InVtYnJhbF9sYW5jZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjF9LHsiaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsic3BlbnRiYW5lIiwic3RvcmVkX3ZlcmRpY3QiLCJtZWFzdXJlZF9ibGFkZSIsInNsb3dfYnJldyJdfSx7ImlkIjoiZGV2b3VyaW5nX3N3YXJtIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsibWFuYV9mZWVkZXIiXX0seyJpZCI6ImNvbWJ1c3Rpb25fc3RyaWtlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2Vpc21pY19tYXJjaCIsImFjY2VsZXJhdGVkIiwidW5sZWFzaCIsInNjYXR0ZXJlZF9jYXNjYWRlIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjE3NzQzMTA1MjIsInVuaXF1ZXMiOnsiYm9vdHMiOiJyaW1ld2FrZSIsImhlbG1ldCI6ImNpbmRlcnZpZ2lsIn19:spar --seeds 30 --base-seed 3137174386`</details>
- `class:ranger + unique:cindervigil + unique:hollow_sovereign + support:maddening_miasma`: measured 1.8e+12 damage per second, its parts predict 15.9. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJyYW5nZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZXZpc2NlcmF0ZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsImxpbWIiOjB9LHsiaWQiOiJzdGF0aWNfc2hvY2siLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJyZW1uYW50cyJdfSx7ImlkIjoid2FyX2NoYW50IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiY3JlZXBpbmdfZnVtZXMiLCJtYWRkZW5pbmdfbWlhc21hIiwicml0YXJkYW5kbyJdLCJsaW1iIjowfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJ3YXJkIiwiZ2VhciI6InJhcmUiLCJncyI6MzMzNjAzNDA5LCJ1bmlxdWVzIjp7ImNoZXN0IjoiaG9sbG93X3NvdmVyZWlnbiIsImhlbG1ldCI6ImNpbmRlcnZpZ2lsIn19:spar --seeds 30 --base-seed 3137174386`</details>
- `class:trapper + support:scattered_cascade + support:seismic_march + support:unleash`: measured 5.6e+8 damage per second, its parts predict 1482.1. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJ0cmFwcGVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6InN0YWNrX3RoZV9kZWNrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsicXVhaWxiYW5lIiwidGF1dF93aXJlIiwib3Zlcm1hdGNoIiwibW9ub2xpdGgiXSwibGltYiI6MH0seyJpZCI6Im1hcmsiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzcGVudGJhbmUiLCJzdG9yZWRfdmVyZGljdCIsIm1lYXN1cmVkX2JsYWRlIiwic2xvd19icmV3Il19LHsiaWQiOiJkZXZvdXJpbmdfc3dhcm0iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJtYW5hX2ZlZWRlciJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjoxNzkzOTM5OTE3LCJ1bmlxdWVzIjp7ImJlbHQiOiJiZWxsX29mX3RoZV9icmVhY2giLCJjaGVzdCI6ImhvbGxvd19zb3ZlcmVpZ24ifX0:spar --seeds 30 --base-seed 3137174386`</details>
- `class:necromancer + primary:pain_hounds + support:scattered_cascade + support:seismic_march`: measured 2.3e+8 damage per second, its parts predict 448.6. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJuZWNyb21hbmNlciIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJwYWluX2hvdW5kcyIsInJhcml0eSI6ImxlZ2VuZGFyeSJ9LHsiaWQiOiJkYXNoIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsibXVzY2xlX21lbW9yeSIsImN1dHRocm9hdCIsImFsYWNyaXR5Il0sImxpbWIiOjF9LHsiaWQiOiJvcmJpdGFsX2JsYWRlcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImZsZWV0Zm9vdCIsInJpbmdpbmdfcmVwb3J0IiwiY2FzdF9vbl9vdmVyY2hhcmdlIiwibWluZXJhbF90dW5pbmciXX0seyJpZCI6ImNvbWJ1c3Rpb25fc3RyaWtlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2Vpc21pY19tYXJjaCIsImFjY2VsZXJhdGVkIiwidW5sZWFzaCIsInNjYXR0ZXJlZF9jYXNjYWRlIl19XSwib2ZmIjoiY3JpdCIsImRlZiI6IndhcmQiLCJnZWFyIjoicmFyZSIsImdzIjoxMzQxMjk0MTIwfQ:spar --seeds 30 --base-seed 3137174386`</details>
- `class:apothecary + unique:cindervigil + support:unleash + support:mana_feeder`: measured 1.2e+7 damage per second, its parts predict 15550. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJhcG90aGVjYXJ5IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6Im1hcmsiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzcGVudGJhbmUiLCJzdG9yZWRfdmVyZGljdCIsIm1lYXN1cmVkX2JsYWRlIiwic2xvd19icmV3Il19LHsiaWQiOiJkZXZvdXJpbmdfc3dhcm0iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJtYW5hX2ZlZWRlciJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImtpbmRsZWRfcnVpbiIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInVwcm9vdGVyIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjozMTQ1MTEwOSwidW5pcXVlcyI6eyJoZWxtZXQiOiJjaW5kZXJ2aWdpbCIsInJpbmcxIjoic2hhcmVkX2N1cCJ9fQ:spar --seeds 30 --base-seed 3137174386`</details>
- `class:berserker + support:thoughtburn + primary:orbital_blades + support:scattered_cascade`: measured 3829528.8 damage per second, its parts predict 4806.6. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoib3JiaXRhbF9ibGFkZXMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJmbGVldGZvb3QiLCJyaW5naW5nX3JlcG9ydCIsImNhc3Rfb25fb3ZlcmNoYXJnZSIsInVubGVhc2giXX0seyJpZCI6ImNvbWJ1c3Rpb25fc3RyaWtlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2Vpc21pY19tYXJjaCIsImFjY2VsZXJhdGVkIiwidW5sZWFzaCIsInNjYXR0ZXJlZF9jYXNjYWRlIl19LHsiaWQiOiJmbGFtZV9ibGFzdCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZ2lhbnRzYmFuZSIsInRob3VnaHRidXJuIl19LHsiaWQiOiJyZXB1bHNvcl9iZWFjb24iLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImZsZWV0Zm9vdCIsInBvbHlwaG9ueSJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6IndhcmQiLCJnZWFyIjoicmFyZSIsImdzIjo4Njk3ODg1MTcsInVuaXF1ZXMiOnsiYW11bGV0IjoibGluZWFnZV9rbm90IiwiZ2xvdmVzIjoiZ2FsZXdyaWdodHMifX0:spar --seeds 30 --base-seed 3137174386`</details>
- `class:resonator + support:accelerando + support:scattered_cascade + support:seismic_march`: measured 546462.8 damage per second, its parts predict 570.5. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJyZXNvbmF0b3IiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZ3JpdF9zdGFuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiLCJvdmVybWF0Y2giLCJvc3RpbmF0byJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJhY2NlbGVyYW5kbyIsImVmZmljaWVuY3kiXX0seyJpZCI6InJlcHVsc29yX2JlYWNvbiIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZmxlZXRmb290IiwiYmxvb2RfdG9sbCJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6ODY5Nzg4NTE3LCJ1bmlxdWVzIjp7ImJlbHQiOiJwYWxlX2JhcmdhaW4iLCJyaW5nMSI6ImNvYWxfcmVtZW1iZXJlZCJ9fQ:spar --seeds 30 --base-seed 3137174386`</details>
- `class:trapper + support:crescendo + support:pallid_touch + support:cascade`: measured 16715.1 damage per second, its parts predict 4.9. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJ0cmFwcGVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6InN0YWNrX3RoZV9kZWNrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsicXVhaWxiYW5lIiwidGF1dF93aXJlIiwib3Zlcm1hdGNoIl0sImxpbWIiOjB9LHsiaWQiOiJpbmZlcm5hbF9ib21iYXJkbWVudCIsInJhcml0eSI6ImxlZ2VuZGFyeSJ9LHsiaWQiOiJjaW5kZXJfc3dhcm0iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJwYWxsaWRfdG91Y2giLCJyZXR1cm5pbmciLCJibG9vZF9wcmljZSIsInB1cHBldF9zdHJpbmdzIl19LHsiaWQiOiJhZWdpc193YXJkIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsiY2FzY2FkZSIsImNyZXNjZW5kbyIsIm5vX21hbnNfbGFuZCIsImxpbWJyZWF2ZXIiXSwibGltYiI6MH1dLCJvZmYiOiJjcml0IiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjEyMjgxMjEzNDEsInVuaXF1ZXMiOnsiYW11bGV0IjoibW91cm5pbmdfYmVsbCIsImNoZXN0IjoiaG9sbG93X3NvdmVyZWlnbiJ9fQ:spar --seeds 30 --base-seed 3137174386`</details>
- `class:wallwright + support:parting_judgement + support:crescendo + unique:emberbrand`: measured 5087.8 damage per second, its parts predict 3.1. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJ3YWxsd3JpZ2h0IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6Im92ZXJjbG9jayIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImNhcGFjaXRvciIsImRvbWluaW9uX3RpdGhlIiwicHJlc3N1cmVfc2VhbCJdfSx7ImlkIjoiaGVhZF9vZl9zdGVhbSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbImNvbWJ1c3Rpb24iLCJxdWFpbGJhbmUiLCJicmltc3RvbmVfdGl0aGUiXX0seyJpZCI6ImNpbmRlcl9zd2FybSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInBhbGxpZF90b3VjaCIsInNlcHRpY19iYXJnYWluIiwiYmxvb2RfcHJpY2UiLCJwYXJ0aW5nX2p1ZGdlbWVudCJdfSx7ImlkIjoiYWVnaXNfd2FyZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbImNhc2NhZGUiLCJjcmVzY2VuZG8iLCJub19tYW5zX2xhbmQiLCJsaW1icmVhdmVyIl0sImxpbWIiOjB9XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjE1NTUwNDI2LCJ1bmlxdWVzIjp7InJpbmcxIjoiY29tbW9uX3B1bHNlIiwicmluZzIiOiJlbWJlcmJyYW5kIn19:spar --seeds 30 --base-seed 3137174386`</details>
- `class:vanguard + primary:teleport + support:pallid_touch + support:hunters_momentum`: measured 4517.7 damage per second, its parts predict 1.5. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJ2YW5ndWFyZCIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJ0ZWxlcG9ydCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImNsb3VkYm9ybmUiLCJodW50ZXJzX21vbWVudHVtIiwib3Zlcm1hdGNoIiwiZmlyZV93YWxrZXIiXX0seyJpZCI6InJhaW5fb2ZfYXNoIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZWZmaWNpZW5jeSJdfSx7ImlkIjoiZG9vbWJyYW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZnJhZ21lbnRhdGlvbiIsImd1YXJkZWRfY2FzdGluZyIsInNwaXJpdF90b3RlbSIsInBhbGxpZF90b3VjaCJdfSx7ImlkIjoid2FyX2NoYW50IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiY3JlZXBpbmdfZnVtZXMiLCJtYWRkZW5pbmdfbWlhc21hIiwicml0YXJkYW5kbyJdLCJsaW1iIjowfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjE2NDg3NjAzMDQsInVuaXF1ZXMiOnsiY2hlc3QiOiJ0aGVfdW5tb3ZlZCJ9fQ:spar --seeds 30 --base-seed 3137174386`</details>

### Flagged for your decision

The numbers an author would reach for did not move these enough. They are not proposals: each needs a call on whether the mechanic is right, and none has been touched.

- class `chronomancer`: The numbers an author would reach for barely move this: skills.stasis_lock.baseDamage ×2.5 closes 6%; classes.chronomancer.attributes ×2.5 closes 2%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- skill `hurricane`: The numbers an author would reach for barely move this: skills.hurricane.baseDamage ×2.5 closes 14%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_threat `breach_arcling`: The numbers an author would reach for barely move this: monsterDamage.breach_arcling.all ×2.5 closes 18%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- support `resounding_echo`: The numbers an author would reach for barely move this: supports.resounding_echo.mods ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `stygian_doll`: The numbers an author would reach for barely move this: monsters.stygian_doll.base.life ×2.3 closes 1%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- affix `apply_burn`: The numbers an author would reach for barely move this: affixes.apply_burn.tiers.*.ranges ×0.4 closes 15%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- affix `crowd_damage`: The numbers an author would reach for barely move this: affixes.crowd_damage.tiers.*.ranges ×2.5 closes 2%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `amalgam_fleshweaver`: The numbers an author would reach for barely move this: monsters.amalgam_fleshweaver.base.life ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.

## Outliers

433 rows sit far from their cohort (log-scale median and MAD, z ≥ 3 and a ratio past 1.8× or 0.55×), 33 of them new tonight. Warned rows and zero rows never enter a cohort.

| | kind | subject | metric | value | cohort median | ratio | z | cohort |
|---|---|---|---|---:|---:|---:|---:|---|
| 🆕 | interaction | `class:juggernaut + primary:umbral_lance + unique:cindervigil + support:scattered_cascade` | dps_out | 5.6e+13 | 60879.9 | 9.1e+8× | 21.2 | L40 main effects |
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
| 🆕 | interaction | `class:ranger + unique:cindervigil + unique:hollow_sovereign + support:maddening_miasma` | dps_out | 284357.1 | 15.9 | 17860.87× | 10.1 | L40 main effects |
|  | monster_threat | `hadal_lantern` | dps_in | 0.1 | 15.3 | 0× | -10 | L12 · magician · body |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.07× | -9.9 | L40 · geared · pressure · kill_rate |
| 🆕 | interaction | `class:trapper + support:scattered_cascade + support:seismic_march + support:unleash` | dps_out | 2.2e+7 | 1482.1 | 14843.34× | 9.9 | L40 main effects |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.05× | -9.2 | L20 · kitted · pressure · kill_rate |
| 🆕 | interaction | `class:skald + support:afterspray + support:sainted_ash + support:pyre_legion` | dps_out | 54.1 | 0.1 | 536.08× | 9.1 | L10 main effects |
|  | class | `chronomancer` | kill_rate | 0 | 0.4 | 0.02× | -8.9 | L5 · geared · pressure · kill_rate |
|  | monster_threat | `dream_tick` | dps_in | 0.1 | 15.3 | 0.01× | -8.9 | L12 · magician · body |
|  | monster_threat | `banshee` | dps_in | 0.2 | 18.1 | 0.01× | -8.6 | L25 · magician · body |
| 🆕 | interaction | `class:resonator + support:accelerando + support:scattered_cascade + support:seismic_march` | dps_out | 2270634.8 | 570.5 | 3980.05× | 8.5 | L40 main effects |
| 🆕 | interaction | `class:trapper + support:crescendo + support:pallid_touch + support:cascade` | dps_out | 17499.3 | 4.9 | 3563.84× | 8.4 | L40 main effects |

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

</details>

## Build search

129,342 candidates tonight (31,148 refused by the real gates), 1,953,947 over 28 night(s). The archive holds 1439 elite rows; 1428 were re-measured on this commit. Tried so far in a legal build: 39 of 39 classes, 576 of 576 primarys, 604 of 604 skills, 455 of 455 supports, 41 of 41 uniques.

| band | objective | build (top factors) | value | × band median | repro |
|---|---|---|---:|---:|---|
| L5 | offense | `class:runeweaver` `off:crit` `def:life` `gear:rare` `skill:living_bomb` | 90912.9 | 2750.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoibGl2aW5nX2JvbWIiLCJyYXJpdHkiOiJtYWdpYyIsIm92ZXIiOjEsInN1cHBvcnRzIjpbInJpdGFyZGFuZG8iXX0seyJpZCI6InN0b3JtYmluZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInRlbXBlc3RfcmFuZ2UiLCJyZWdpY2lkZSJdfSx7ImlkIjoiZW1iZXJiaW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsic2VhcmluZ19oZWF0IiwiYm9uZGJyZWFrZXIiLCJhY2NlbGVyYW5kbyIsImJsb29kX3RvbGwiXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJmb3JraW5nIiwibW91bnRpbmdfZnJlbnp5IiwicGFydGluZ19qdWRnZW1lbnQiLCJzdW5kZXJpbmdfZmxpZ2h0Il19XSwib2ZmIjoiY3JpdCIsImRlZiI6ImxpZmUiLCJnZWFyIjoicmFyZSIsImdzIjoxNDM3MjI5MDg5LCJ1bmlxdWVzIjp7ImFtdWxldCI6InN0b3JtY2FsbCIsInJpbmcxIjoiZW1iZXJicmFuZCJ9fQ --seeds 8 --base-seed 2478436920`</details> |
| L5 | offense | `class:runeweaver` `off:crit` `def:evasion` `gear:rare` `skill:squall_rune` | 81931.1 | 2478.7× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoic3F1YWxsX3J1bmUiLCJyYXJpdHkiOiJtYWdpYyJ9LHsiaWQiOiJzdG9ybWJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJ0ZW1wZXN0X3JhbmdlIl19LHsiaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJmbGVldGluZ19kZXZvdGlvbiIsImJvbmRicmVha2VyIiwiYWNjZWxlcmFuZG8iLCJibG9vZF90b2xsIl19LHsiaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiZm9ya2luZyIsIm1vdW50aW5nX2ZyZW56eSIsInBhcnRpbmdfanVkZ2VtZW50Iiwic3VuZGVyaW5nX2ZsaWdodCJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6MTQzNzIyOTA4OSwidW5pcXVlcyI6eyJhbXVsZXQiOiJzdG9ybWNhbGwiLCJyaW5nMSI6ImVtYmVyYnJhbmQifX0 --seeds 8 --base-seed 2478436920`</details> |
| L5 | clear | `class:chronomancer` `off:crit` `def:armor` `gear:rare` `skill:judgement` | 6 | 19.2× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJqdWRnZW1lbnQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImxpbWJyZWF2ZXIiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwib3ZlciI6Miwic3VwcG9ydHMiOlsiY2hhbWJlcmVkX2Nhc3RpbmciLCJjYXNjYWRlIl0sImxpbWIiOjB9XSwib2ZmIjoiY3JpdCIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6MTgwODkzMjgxLCJ1bmlxdWVzIjp7ImhlbG1ldCI6ImdyYXZlYmxvb20iLCJyaW5nMSI6ImVtYmVyYnJhbmQifX0 --seeds 8 --base-seed 2430386487`</details> |
| L5 | clear | `class:chronomancer` `off:crit` `def:none` `gear:rare` `skill:oblation_of_mana` | 6 | 19.2× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJvYmxhdGlvbl9vZl9tYW5hIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJhdXN0ZXJpdHkiLCJleHRlcm1pbmF0b3IiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6MTgwODkzMjgxLCJ1bmlxdWVzIjp7ImFtdWxldCI6InN0b3JtY2FsbCIsImNoZXN0IjoiYWVnaXNfb2ZfdGhlX2Ryb3duZWQifX0 --seeds 8 --base-seed 2430386487`</details> |
| L10 | offense | `class:chronomancer` `off:speed` `def:life` `gear:rare` `skill:lightning_bolt` | 149351.4 | 3887× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjEwLCJza2lsbHMiOlt7ImlkIjoibGlnaHRuaW5nX2JvbHQiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsiY3JpbXNvbl9oYXJ2ZXN0Il19LHsiaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJmbGVldGluZ19kZXZvdGlvbiIsImxpbWJyZWF2ZXIiLCJyYXZlbmluZyIsImV4dGVybWluYXRvciJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNsb3dfYnJldyIsInBhcnRpbmdfanVkZ2VtZW50IiwibW91bnRpbmdfZnJlbnp5IiwicmVtbmFudHMiXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImxpZmUiLCJnZWFyIjoicmFyZSIsImdzIjoxODI5NTQ3OTI2LCJ1bmlxdWVzIjp7ImNoZXN0IjoidGhlX3VubW92ZWQiLCJyaW5nMSI6ImVtYmVyYnJhbmQifX0 --seeds 8 --base-seed 2960077871`</details> |
| L10 | offense | `class:magician` `off:speed` `def:armor` `gear:rare` `skill:unholy_aura` | 126119.1 | 3282.3× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJ1bmhvbHlfYXVyYSIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoxfSx7ImlkIjoiZnJvc3Rfd2FsbCIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJlcGhlbWVyYWwiXX0seyJpZCI6ImVtYmVyYmluZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImZsZWV0aW5nX2Rldm90aW9uIiwid3JhaXRoX3Bhc3NhZ2UiLCJyYXZlbmluZyIsImV4dGVybWluYXRvciJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNsb3dfYnJldyIsInBhcnRpbmdfanVkZ2VtZW50IiwibW91bnRpbmdfZnJlbnp5IiwicmVtbmFudHMiXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6MTgyOTU0NzkyNiwidW5pcXVlcyI6eyJjaGVzdCI6InRoZV91bm1vdmVkIiwicmluZzEiOiJlbWJlcmJyYW5kIn19 --seeds 8 --base-seed 2336648182`</details> |
| L10 | clear | `class:skald` `off:damage` `def:evasion` `gear:rare` `skill:impale_lance` | 6 | 24.2× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJza2FsZCIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJpbXBhbGVfbGFuY2UiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsiZG9taW5hdGluZ19ibG93Il19LHsiaWQiOiJkb29tX2JlbGwiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJtZWFzdXJlZF9ibGFkZSJdfSx7ImlkIjoiaG9uZXlkZXdfbHVyZSIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsidXByb290ZXIiLCJ3cmFpdGhfcGFzc2FnZSJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjoyMDAxMTg3OTUyfQ --seeds 8 --base-seed 4053719837`</details> |
| L10 | clear | `class:hivecaller` `off:speed` `def:evasion` `gear:rare` `skill:overclock` | 6 | 24.2× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJoaXZlY2FsbGVyIiwibHZsIjoxMCwic2tpbGxzIjpbeyJpZCI6Im92ZXJjbG9jayIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJkZWxpYmVyYXRlX3J1aW4iLCJzZXJlbmVfcG93ZXIiXX0seyJpZCI6ImRldG9uYXRlX21pbmVzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiZG9taW5pb25fdGl0aGUiLCJzdG9yZWRfdmVyZGljdCIsImNoYW1iZXJlZF9jYXN0aW5nIiwibW9ub2xpdGgiXX0seyJpZCI6ImJlY2tvbl9wYWxld2lzcHMiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsiZXBoZW1lcmFsIiwic2FuZ3VpbmVfZmVlZCJdfSx7ImlkIjoibG9uZ19jb2xkIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsic2llZ2VicmVha2VyIiwiZG9taW5pb25fdGl0aGUiLCJ3aWRlbmluZyIsIm1hbmFfZmVlZGVyIl0sImxpbWIiOjB9XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6MTk0OTYxMTEzMn0 --seeds 8 --base-seed 4258350503`</details> |
| L20 | offense | `class:flagellant` `off:damage` `def:ward` `gear:rare` `skill:wildfire_sweep` | 894507.5 | 16057.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJmbGFnZWxsYW50IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6IndpbGRmaXJlX3N3ZWVwIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsicmVtbmFudF9jb25kdWl0Iiwic2llZ2VicmVha2VyIiwidW5sZWFzaCIsInN1bmJha2VkX2VkZ2UiXX0seyJpZCI6InN1bW1vbl9ib25lX2dvbGVtIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbInN0ZWFkeV9uZXJ2ZSJdLCJsaW1iIjoxfSx7ImlkIjoiZ3Jhc3BpbmdfY2hhc20iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJibG9vZF90b2xsIiwic3BsaW50ZXJlZF9lYXJ0aCIsImFjY2VsZXJhbmRvIiwiZGVzcGVyYXRpb24iXX0seyJpZCI6ImZyb3N0Z3VhcmQiLCJyYXJpdHkiOiJtYWdpYyIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInJlZ2ljaWRlIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjExNzkwNTYwMjMsInVuaXF1ZXMiOnsiYmVsdCI6IndpbnRlcl9hZnRlcl95b3UiLCJib290cyI6InJpbWV3YWtlIn19 --seeds 8 --base-seed 465557900`</details> |
| L20 | offense | `class:flagellant` `off:crit` `def:none` `gear:rare` `skill:combustion_strike` | 713116.9 | 12801.4× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJmbGFnZWxsYW50IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImNvbWJ1c3Rpb25fc3RyaWtlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsiYWZ0ZXJzaG9ja3MiXX0seyJpZCI6InN1bW1vbl9ib25lX2dvbGVtIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbInN0ZWFkeV9uZXJ2ZSJdLCJsaW1iIjowfSx7ImlkIjoiZ3Jhc3BpbmdfY2hhc20iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJibG9vZF90b2xsIiwic3BsaW50ZXJlZF9lYXJ0aCIsImFjY2VsZXJhbmRvIiwiY3Jlc2NlbmRvIl19XSwib2ZmIjoiY3JpdCIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjoxMTc5MDU2MDIzLCJ1bmlxdWVzIjp7ImJvb3RzIjoicmltZXdha2UifX0 --seeds 8 --base-seed 465557900`</details> |
| L20 | clear | `class:tamer` `off:crit` `def:armor` `gear:rare` `skill:detonate_mines` | 6 | 31.7× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJ0YW1lciIsImx2bCI6MjAsInNraWxscyI6W3siaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImNhc3Rfb25fYmxlZWQiXX0seyJpZCI6ImZyb3N0X3B1bHNlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsicGllcmNpbmciXX0seyJpZCI6ImRvb21fYmVsbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNoYXR0ZXJnbGFzcyIsImZsb3dicmVha2VyIiwidXByb290ZXIiLCJtZWFzdXJlZF9ibG93cyJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjUzODk1NzY0NSwidW5pcXVlcyI6eyJhbXVsZXQiOiJ0dW5pbmdfZm9yayJ9fQ --seeds 8 --base-seed 877335345`</details> |
| L20 | clear | `class:brawler` `off:damage` `def:none` `gear:rare` `skill:expose_weakness` | 6 | 31.7× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJicmF3bGVyIiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImV4cG9zZV93ZWFrbmVzcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImJsb29kX3RvbGwiLCJzbG93X2JyZXciLCJhYnVuZGFudF9oYXJ2ZXN0Il0sImxpbWIiOjB9LHsiaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZW1iYXJnbyIsImRlc3BlcmF0ZV9tZWFzdXJlcyIsInJhdmVuaW5nIiwidGVybWluYWxfdmVsb2NpdHkiXX0seyJpZCI6Im1hZ21hX3dhcmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJhZnRlcnNob2NrcyIsImNoaWxsX2NoYW5jZSIsImNvbG9zc3VzX3N0YW5jZSJdfSx7ImlkIjoiZG9vbV9iZWxsIiwicmFyaXR5IjoibGVnZW5kYXJ5In1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6MTkwMzg4MjkzOX0 --seeds 8 --base-seed 2075364975`</details> |
| L40 | offense | `class:pyromancer` `off:speed` `def:ward` `gear:rare` `skill:cast_falcon` | 965131.3 | 9410.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJweXJvbWFuY2VyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImNhc3RfZmFsY29uIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsicmVnaWNpZGUiLCJwbHVzX21pbmlvbiIsInRpdGFuaWMiXSwibGltYiI6MH0seyJpZCI6InN1bW1vbl9ib25lX2dvbGVtIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbInN0ZWFkeV9uZXJ2ZSIsImNoaXRpbm91c19icm9vZCJdLCJsaW1iIjowfSx7ImlkIjoiZ3Jhc3BpbmdfY2hhc20iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJibG9vZF90b2xsIiwic3BsaW50ZXJlZF9lYXJ0aCIsImFjY2VsZXJhbmRvIiwiZGVzcGVyYXRpb24iXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6IndhcmQiLCJnZWFyIjoicmFyZSIsImdzIjoxMjM0NDIwNTM5LCJ1bmlxdWVzIjp7ImJvb3RzIjoicmltZXdha2UifX0 --seeds 8 --base-seed 2155746377`</details> |
| L40 | offense | `class:juggernaut` `off:damage` `def:evasion` `gear:rare` `skill:detonate_mines` | 951421.1 | 9276.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJqdWdnZXJuYXV0IiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImRldG9uYXRlX21pbmVzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsiZG9taW5pb25fdGl0aGUiLCJzdG9yZWRfdmVyZGljdCIsInNlcmVuZV9wb3dlciIsImd1YXJkZWRfY2FzdGluZyJdfSx7ImlkIjoic3VtbW9uX2JvbmVfZ29sZW0iLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsic3RlYWR5X25lcnZlIl0sImxpbWIiOjB9LHsiaWQiOiJncmFzcGluZ19jaGFzbSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbImJsb29kX3RvbGwiLCJzcGxpbnRlcmVkX2VhcnRoIiwiYWNjZWxlcmFuZG8iLCJlbnRyb3BpY19ibG9vbSJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjo3MDYyODI2ODEsInVuaXF1ZXMiOnsiYW11bGV0IjoibGluZWFnZV9rbm90IiwiaGVsbWV0IjoiY2luZGVydmlnaWwifX0 --seeds 8 --base-seed 2469798380`</details> |
| L40 | clear | `class:sentinel` `off:crit` `def:none` `gear:rare` `skill:consecration` | 6 | 26.2× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzZW50aW5lbCIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJjb25zZWNyYXRpb24iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJ0YXV0X3dpcmUiXSwibGltYiI6MH0seyJpZCI6ImRvb21fYmVsbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbInNsaXBzdHJlYW0iXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjEyMzIzNjg2NjYsInVuaXF1ZXMiOnsiY2hlc3QiOiJncm91bmRlZF9sYXR0aWNlIn19 --seeds 8 --base-seed 2546135871`</details> |
| L40 | clear | `class:sentinel` `off:damage` `def:ward` `gear:rare` `skill:nitrocask` | 6 | 26.2× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzZW50aW5lbCIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJuaXRyb2Nhc2siLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJ0cmlhbmdsZV9zaWdpbCIsImJ1aWxkaW5nX3JoeXRobSIsInJlZ2ljaWRlIiwiZXBoZW1lcmFsIl19LHsiaWQiOiJsb25nX2NvbGQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJyZWZyYWN0aW9uIiwic3RlYWR5X25lcnZlIiwiZGVlcF9yZXNlcnZlcyIsImxvYWRlZF9kaWNlIl0sImxpbWIiOjB9LHsiaWQiOiJoZWFsaW5nX3N0cmVhbSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImFjY2VsZXJhdGVkIiwiZWZmaWNpZW5jeSIsImV4dGVybWluYXRvciIsInNpZWdlYnJlYWtlciJdfSx7ImlkIjoiYnJhbWJsZV9oZWRnZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjF9XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjE0NTIyMDMwODYsInVuaXF1ZXMiOnsiYmVsdCI6ImJsb29kbGV0dGVyc19naXJkbGUiLCJyaW5nMSI6ImVtYmVyYnJhbmQifX0 --seeds 8 --base-seed 2546135871`</details> |

Playstyles at L5, best build found per style against the band's median style (50 styles): strongest `target · lightning` 94480.9 (2.95×), `area · lightning` 82975.6 (2.59×), `aura · lightning` 75815.7 (2.37×), `target · fire` 75340.8 (2.36×); weakest `mark · chaos` 11180.5 (0.35×), `court · cold` 12096.2 (0.38×), `detonate · cold` 13292.3 (0.42×), `detonate · chaos` 13697.7 (0.43×).

Playstyles at L10, best build found per style against the band's median style (50 styles): strongest `projectile · fire` 158541 (1.87×), `aura · fire` 155724.4 (1.84×), `court · fire` 145226.4 (1.72×), `self · fire` 139217.7 (1.65×); weakest `detonate · chaos` 28233.3 (0.33×), `projectile · chaos` 32295.5 (0.38×), `construct · physical` 43085.5 (0.51×), `target · chaos` 48480.4 (0.57×).

Playstyles at L20, best build found per style against the band's median style (50 styles): strongest `area · fire` 883281.8 (2.34×), `mark · fire` 832705.9 (2.21×), `mark · chaos` 795100.6 (2.11×), `target · cold` 736948.5 (1.95×); weakest `detonate · chaos` 97741.9 (0.26×), `detonate · fire` 154203.6 (0.41×), `mark · lightning` 165592 (0.44×), `detonate · physical` 171537.9 (0.45×).

Playstyles at L40, best build found per style against the band's median style (50 styles): strongest `detonate · fire` 992454 (1.32×), `court · chaos` 991649.6 (1.32×), `construct · chaos` 991572.3 (1.32×), `projectile · fire` 991148.9 (1.32×); weakest `mark · cold` 281752.1 (0.38×), `mark · physical` 383475.1 (0.51×), `mark · fire` 438479.3 (0.59×), `mark · chaos` 471272.2 (0.63×).

Main effects at L5 over 12973 rows: strongest `limb:raise_dead#0` 75.2×, `skill:grasping_chasm` 35.75×, `skill:ice_shards` 21.18×, `limb:summon_bone_golem#0` 20.26×, `limb:summon_bone_golem#1` 17.94×; weakest `skill:raise_dead` 0.02×, `limb:shadow_step#1` 0.04×, `limb:war_chant#1` 0.06×, `skill:infinite_slashes` 0.08×, `limb:war_chant#0` 0.1×.

Main effects at L10 over 19337 rows: strongest `skill:grasping_chasm` 30.26×, `primary:aegis_ward` 24.05×, `skill:ice_shards` 22.46×, `limb:summon_bone_golem#1` 16.79×, `limb:summon_bone_golem#0` 15.32×; weakest `limb:aegis_ward#0` 0.02×, `limb:shadow_step#0` 0.02×, `limb:decoy#1` 0.04×, `limb:decoy#0` 0.05×, `limb:aegis_ward#1` 0.06×.

Main effects at L20 over 25654 rows: strongest `primary:aegis_ward` 95.3×, `limb:summon_bone_golem#0` 74.69×, `limb:summon_bone_golem#1` 56.09×, `skill:ice_shards` 33.66×, `skill:grasping_chasm` 15.92×; weakest `limb:aegis_ward#0` 0.01×, `limb:aegis_ward#1` 0.02×, `skill:summon_bone_golem` 0.06×, `limb:war_chant#1` 0.1×, `limb:raise_gnatveil#1` 0.11×.

Main effects at L40 over 26614 rows: strongest `limb:shambler_horde#1` 118.92×, `primary:infernal_bombardment` 83.53×, `skill:ice_shards` 31.56×, `limb:summon_bone_golem#0` 27.46×, `limb:summon_bone_golem#1` 22.02×; weakest `limb:aegis_ward#0` 0.02×, `primary:summon_bone_golem` 0.03×, `limb:aegis_ward#1` 0.04×, `limb:war_chant#0` 0.08×, `limb:war_chant#1` 0.1×.

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

**Support power**, median output change across the hosts each gem works on. Strongest: `sundering_flight` +199%, `fire_walker` +182%, `scorched_wake` +140%, `mounting_frenzy` +134%, `resounding_echo` +110%, `crescendo` +108%, `volley` +98%, `elemental_conduction` +87%. Weakest: `austerity` -51%, `septic_bargain` -49%, `pyre_legion` -36%, `rattling_salvo` -35%, `spirit_totem` -28%, `wraith_passage` -25%, `sweeping_blow` -20%, `nova_release` -20%.

**Against the target** of +10% to +15%: the median gem changes output by +7%. 21 in the band, 85 above it, 125 below it, 101 leave damage alone.

15 of these gems read off their own rig, because they need something a plain rig does not do: in the middle of a crowd (`alternating_strikes`, `unstable_flight`, `wild_abandon`, `tethered_orbit`, `gyre`, `vortex`, `sidewinder`, `trueflight`, `crosswind`); with a guard raised (`guarded_casting`); with a charge a second fed into its bank (`embargo`, `ravening`); against a plain dummy instead of a resistant one (`refraction`, `flameforged`, `rarefy`).

**Affix families** (211 measured on one magic piece against the same wardrobe without it, 11 never worn on the doll). Most output: `apply_poison` 2.11× on warrior, `apply_poison` 1.98× on magician, `apply_bleed` 1.71× on warrior, `apply_bleed` 1.64× on magician, `hadal_cold` 1.48× on magician, `hadal_cold` 1.46× on warrior, `proc_concussive` 1.4× on warrior, `creeper_barrow` 1.24× on warrior. Most time survived: `life_on_evade` 1.93× on warrior, `barnacle_crust` 1.74× on warrior, `chitin_plate` 1.59× on warrior, `life_on_hit` 1.58× on warrior, `life_on_evade` 1.54× on magician, `thorns` 1.54× on warrior. Moved nothing on these rigs: 3 families.

**What buffs, hexes, heals and wards add** (196 skills whose own numbers are not damage, at L20, against the same hero without them). Most output beside a plain strike: `infernal_bombardment` 14.1×, `summon_plaguefather` 6.4×, `summon_fire_golem` 4.83×, `summon_flame_sprite` 4.77×, `flame_totem` 4.77×, `shambler_horde` 4.25×, `bind_familiar` 4.22×, `reaper_swarm` 3.88×. Most time survived on the clock: `vampiric_presence` 11.85×, `repulsor_beacon` 11.85×, `summon_blade_wraith` 11.85×, `shambler_horde` 11.85×, `call_the_rift` 10.98×, `reaper_swarm` 10.25×, `summon_wraith` 9.04×, `infernal_bombardment` 6.63×. 35 moved neither at any band: their value lies outside these rigs, or they do nothing.

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
Matrix: 127,530 of 127,530 eligible pairs probed (100%), deep lane on 24412 pairs. Verdicts: effective 78659, inert 14445, blind 30560, cost_only 1428, negligible 2438.
Against the committed ledger (8481 rows): 12440 not on file, 1996 measuring healthy. The ledger only changes through `matrix check --reconcile`.

## What ran, and what did not

| lane | units planned | ok | gate breach | crashed/killed | out of time or not run | episodes | core-hours |
|---|---:|---:|---:|---:|---:|---:|---:|
| baselines | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| audits | 4 | 4 | 0 | 0 | 0 | 0 | 0 |
| expression | 1 | 1 | 0 | 0 | 0 | 1,208 | 0.2 |
| census | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| suites | 1 | 1 | 0 | 0 | 0 | 910 | 0.3 |
| progression | 39 | 39 | 0 | 0 | 0 | 12,480 | 4 |
| skills | 5 | 5 | 0 | 0 | 0 | 8,790 | 1.4 |
| skills_vs | 18 | 18 | 0 | 0 | 0 | 24,192 | 4.8 |
| matchups | 21 | 21 | 0 | 0 | 0 | 13,734 | 5.1 |
| bestiary | 52 | 52 | 0 | 0 | 0 | 78,696 | 14.3 |
| attributes | 39 | 39 | 0 | 0 | 0 | 4,914 | 2 |
| affixes | 4 | 4 | 0 | 0 | 0 | 3,472 | 0.8 |
| assists | 7 | 7 | 0 | 0 | 0 | 4,752 | 2.3 |
| socket_play | 1 | 1 | 0 | 0 | 0 | 900 | 0.1 |
| globals | 4 | 4 | 0 | 0 | 0 | 1,704 | 0.3 |
| matrix | 150 | 150 | 0 | 0 | 0 | 235,854 | 43.3 |
| matrix_deep | 65 | 65 | 0 | 0 | 0 | 114,752 | 22.2 |
| search | 40 | 40 | 0 | 0 | 0 | 202,772 | 35 |
| archive_confirm | 39 | 39 | 0 | 0 | 0 | 22,848 | 7.1 |
| proposals | 48 | 48 | 0 | 0 | 0 | 14,676 | 3.1 |

Every planned unit ran.

Not simulated at all, by design: zone generation and XP pacing, event pressure, multiplayer, and real player skill. Pilots are simple policies, so kit ceilings are floors. Bands stay provisional until you sign them off.
