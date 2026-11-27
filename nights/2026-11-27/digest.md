# Balance farm, night of 2026-11-27

Commit [1ee47185fd](https://github.com/arianna-arpg/arpg-game-world/commit/1ee47185fd094f125cbb059e7c5d25d477a13f17), profile `full`. 760,391 episodes, 141.4 core-hours, 282 minutes end to end. [Run](https://github.com/arianna-arpg/arpg-game-world/actions/runs/46011712870).

## 🔴 Regressions

**4 new skill × support defect(s) since last night**: `backstab@venomed_knife|abundant_harvest|inert`, `backstab@venomed_knife|corpsefire|inert`, `backstab@venomed_knife|sainted_ash|inert`, `backstab@venomed_knife|victors_tempo|inert`. Forensics: `npm run sim -- matrix explain <skill> <support>`.

## Engine defects

These are bugs in the game reachable in play, not balance findings. Each stays listed until it stops happening, and only a new one turns the night red.

**The engine stopped returning.** A real client would freeze here. The farm restarted past each one, so only that episode was lost:

- `EpisodeStalled: an episode ran past its time cap`: 2 episodes, ran past its time cap (240s). First seen in `search_spar_g_t48kxo1j6cia8`, seed 2806278685. <details><summary>stack and repro</summary>`runEpisode < (anonymous) < evaluateGenome < runSearch < searchRun < cmdSearch < main < (anonymous) < run`<br>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoiZGV0b25hdGVfbWluZXMiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInVwcm9vdGVyIl19LHsiaWQiOiJkb29tc2F5ZXJzX3dvcmQiLCJyYXJpdHkiOiJtYWdpYyJ9LHsiaWQiOiJib2lsX292ZXIiLCJyYXJpdHkiOiJyYXJlIiwib3ZlciI6Miwic3VwcG9ydHMiOlsic3VtbW9uX3BoYW50YXNtIiwiaWduaXRlX2NoYW5jZSIsInBoYW50YXNtYWxfZWNobyJdfSx7ImlkIjoiZ3Jhc3BpbmdfY2hhc20iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJvdmVyY2hhcmdlIiwic3BsaW50ZXJlZF9lYXJ0aCIsImFjY2VsZXJhbmRvIiwiZXhwb3N1cmUiXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6Im5vbmUiLCJnZWFyIjoibWFnaWMiLCJncyI6MTk4NTU3NTczOX0 --seeds 3 --base-seed 39045873 --stall-sec 60`</details>

## What moved since last night

7 row(s) moved past their own noise and 10%. Largest first:

| row | before | after | change |
|---|---:|---:|---:|
| `match:kitted_magician_l20:molting_behemoth:L20` | 0 | 66.31 | +100% |
| `class:magician:kitted:L30:spar` | 255.24 | 378.19 | +48% |
| `class:guardian:kitted:L40:dummy` | 748.44 | 922.83 | +23% |
| `class:guardian:kitted:L30:spar` | 530.38 | 646.43 | +22% |
| `class:sorcerer:kitted:L30:spar` | 2154.41 | 2564.41 | +19% |
| `class:guardian:kitted:L40:spar` | 728.33 | 854.61 | +17% |
| `class:apothecary:geared:L30:spar` | 310.11 | 362.95 | +17% |

## Top proposed numbers

Advisory. Nothing here has been applied, and each needs your sign-off. Each row re-measured the subject on dice the night had not seen, solved for a number through the real game, and verified it at common seeds. 22 outlier(s) did not hold up on fresh dice, or landed within 15% of their target, and were dropped.

| # | subject | change | metric: before → after | cohort target | verdict | guards |
|---:|---|---|---|---:|---|---|
| 1 | class `trapper` | `skills.caltrops.baseDamage.physical.0`: 3 → 7.5 (+1 lines, ×2.5) | kill_rate: 0 → 0.2 | 0.1 | moved | none moved |
| 2 | skill `shambler_horde` | `monsters.grave_shambler.explodeOnDeath`: 2.2 → 0.88 | dps_dummy: 19394.7 → 7757.9 | 680.5 | moved, closes 62% | none moved |
| 3 | skill `arclight_rain` | `skills.arclight_rain.baseDamage.physical.0`: 5 → 2 (+3 lines, ×0.4) | dps_dummy: 348.1 → 139.2 | 93.2 | moved, closes 82% | none moved |
| 4 | skill `marshlight` | `skills.marshlight.baseDamage.chaos.0`: 9 → 3.6 (+1 lines, ×0.4) | dps_dummy: 266.1 → 106.5 | 98.9 | moved | none moved |
| 5 | skill `mirespume` | `skills.mirespume.baseDamage.chaos.0`: 11 → 4.5 (+1 lines, ×0.41) | dps_dummy: 244.1 → 100.1 | 98.9 | moved | none moved |
| 6 | support `fire_walker` | `supports.fire_walker.mods.0.value`: 0.5 → 0.2 (+1 lines, ×0.4) | dps_dummy: 61.2 → 31.1 | 16.1 | moved, closes 67% | none moved |
| 7 | skill `infernal_bombardment` | `monsters.bombard_demon.explodeOnDeath`: 1.6 → 0.67 | dps_dummy: 15846.4 → 6671.1 | 6676.7 | moved | none moved |
| 8 | skill `glare_ice` | `skills.glare_ice.baseDamage.cold.0`: 4 → 10 (+1 lines, ×2.5) | dps_dummy: 1.3 → 3.2 | 4 | moved, closes 71% | none moved |
| 9 | skill `trailblaze` | `skills.trailblaze.baseDamage.fire.0`: 6 → 2.8 (+1 lines, ×0.47) | dps_dummy: 65.5 → 31.8 | 31.1 | moved | none moved |
| 10 | class `hivecaller` | `classes.hivecaller.attributes.strength`: 2 → 5 (+9 lines, ×2.5) | kill_rate: 0 → 0.1 | 0.2 | moved, closes 35% | mana_floor_pct 64.5→80.2 |
| 11 | skill `keening_shriek` | `skills.keening_shriek.baseDamage.physical.0`: 4 → 7.6 (+1 lines, ×1.9) | dps_dummy: 2 → 3.7 | 3.6 | moved | none moved |
| 12 | support `sundering_flight` | `supports.sundering_flight.fissureTrail.damageScale`: 0.4 → 0.16 | dps_dummy: 49.6 → 30.1 | 19.2 | moved, closes 64% | none moved |
| 13 | support `volley` | `supports.volley.mods[stat=damage].value`: -0.25 → -0.63 | dps_dummy: 93.2 → 46.6 | 54.3 | moved | none moved |
| 14 | affix `apply_poison` | `affixes.apply_poison.tiers.0.ranges.0.0`: 0.22 → 0.088 (+9 lines, ×0.4) | dps_out: 382 → 261.8 | 129.6 | moved, closes 48% | none moved |
| 15 | skill `zealots_cadence` | `skills.zealots_cadence.baseDamage.physical.0`: 14 → 35 (+1 lines, ×2.5) | dps_dummy: 14.3 → 27.5 | 45.7 | moved, closes 42% | none moved |

<details><summary>Repro commands</summary>

1. `npm run sim -- whatif --knob 'skills.caltrops.baseDamage*2.5' --scenarios pressure:trapper:30 --seeds 30 --base-seed 1817554965`. Same change at other bands: `pressure:trapper:5` 0.5→0.6, `pressure:trapper:10` 0.2→0.6, `pressure:trapper:20` 0→0.2, `pressure:trapper:40` 0→0
2. `npm run sim -- whatif --knob 'monsters.grave_shambler.explodeOnDeath*0.4' --scenarios skill:shambler_horde:40 --seeds 30 --base-seed 1817554965`. Other dials on this metric (elasticity): cooldown -0.71, useTime -0.36. Same change at other bands: `skill:shambler_horde:5` 257.8→103.1, `skill:shambler_horde:10` 768.4→307.4, `skill:shambler_horde:20` 3055.9→1222.4
3. `npm run sim -- whatif --knob 'skills.arclight_rain.baseDamage*0.4' --scenarios skill:arclight_rain:40 --seeds 30 --base-seed 1817554965`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.2, useTime 0.14. Same change at other bands: `skill:arclight_rain:5` 152.2→60.9, `skill:arclight_rain:10` 184.6→73.8, `skill:arclight_rain:20` 233.2→93.3
4. `npm run sim -- whatif --knob 'skills.marshlight.baseDamage*0.4' --scenarios skill:marshlight:10 --seeds 30 --base-seed 1817554965`. Other dials on this metric (elasticity): baseDamage 0.99, useTime -0.7, manaCost -0.03. Same change at other bands: `skill:marshlight:5` 228.7→91.6, `skill:marshlight:20` 315.7→126.8, `skill:marshlight:40` 448.8→179.7
5. `npm run sim -- whatif --knob 'skills.mirespume.baseDamage*0.41' --scenarios skill:mirespume:10 --seeds 30 --base-seed 1817554965`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.57. Same change at other bands: `skill:mirespume:5` 210.9→86.4, `skill:mirespume:20` 288.5→118.3, `skill:mirespume:40` 397.3→162.9
6. `npm run sim -- whatif --knob 'supports.fire_walker.mods*0.4' --scenarios socketed:phoenix_dive:fire_walker:20 --seeds 30 --base-seed 1817554965`
7. `npm run sim -- whatif --knob 'monsters.bombard_demon.explodeOnDeath*0.42' --scenarios skill:infernal_bombardment:40 --seeds 30 --base-seed 1817554965`. Other dials on this metric (elasticity): cooldown -0.79. Same change at other bands: `skill:infernal_bombardment:5` 238.4→102.2, `skill:infernal_bombardment:10` 682.6→290.2, `skill:infernal_bombardment:20` 2602.6→1100
8. `npm run sim -- whatif --knob 'skills.glare_ice.baseDamage*2.5' --scenarios skill:glare_ice:40 --seeds 30 --base-seed 1817554965`. Other dials on this metric (elasticity): cooldown -1.25, baseDamage 1. Same change at other bands: `skill:glare_ice:5` 0.8→1.9, `skill:glare_ice:10` 0.9→2.2, `skill:glare_ice:20` 1→2.5
9. `npm run sim -- whatif --knob 'skills.trailblaze.baseDamage*0.47' --scenarios skill:trailblaze:20 --seeds 30 --base-seed 1817554965`. Other dials on this metric (elasticity): baseDamage 1.01, cooldown -0.75. Same change at other bands: `skill:trailblaze:5` 50.5→25.1, `skill:trailblaze:10` 56.5→27.8, `skill:trailblaze:40` 86.5→41.2
10. `npm run sim -- whatif --knob 'classes.hivecaller.attributes*2.5' --scenarios pressure:hivecaller:5 --seeds 30 --base-seed 1817554965`. Same change at other bands: `pressure:hivecaller:10` 0→0.1, `pressure:hivecaller:20` 0→0.1, `pressure:hivecaller:40` 0.1→0.1
11. `npm run sim -- whatif --knob 'skills.keening_shriek.baseDamage*1.9' --scenarios skill:keening_shriek:40 --seeds 30 --base-seed 1817554965`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.88. Same change at other bands: `skill:keening_shriek:5` 1.2→2.2, `skill:keening_shriek:10` 1.3→2.5, `skill:keening_shriek:20` 1.5→2.9
12. `npm run sim -- whatif --knob 'supports.sundering_flight.fissureTrail.damageScale*0.4' --scenarios socketed:ball_lightning:sundering_flight:20 --seeds 30 --base-seed 1817554965`
13. `npm run sim -- whatif --knob 'supports.volley.mods[stat=damage].value*2.5' --scenarios socketed:soulflay:volley:20 --seeds 30 --base-seed 1817554965`
14. `npm run sim -- whatif --knob 'affixes.apply_poison.tiers.*.ranges*0.4' --scenarios affix:warrior:20:helmet:apply_poison:10397677:spar --seeds 30 --base-seed 1817554965`
15. `npm run sim -- whatif --knob 'skills.zealots_cadence.baseDamage*2.5' --scenarios skill:zealots_cadence:20 --seeds 30 --base-seed 1817554965`. Other dials on this metric (elasticity): baseDamage 0.61. Same change at other bands: `skill:zealots_cadence:5` 11→21.1, `skill:zealots_cadence:10` 12.4→23.7, `skill:zealots_cadence:40` 22.7→43.6

Run from commit `1ee47185fd094f125cbb059e7c5d25d477a13f17`.
</details>

Too noisy to call: class `firebrand`, class `assassin`, class `beguiler`, monster_durability `amalgam_bonelord`. The solved number moved each by less than its own seed-to-seed spread, so these need a calmer rig or more seeds before they mean anything.

### Combinations that run away

Confirmed on fresh dice at 20 times or more what their parts predict. A number this far out usually means damage feeding itself, so no single number fixes it: each needs a call on whether the feedback should be bounded.

- `class:apothecary + primary:venom_bolt + unique:cindervigil + unique:bloodletters_girdle`: measured 1.6e+11 damage per second, its parts predict 14626.4. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJhcG90aGVjYXJ5IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6InZlbm9tX2JvbHQiLCJyYXJpdHkiOiJsZWdlbmRhcnkifSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwiY2FzY2FkZSJdfSx7ImlkIjoiZmxhbWVfYmxhc3QiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInNlcmVuZV9wb3dlciIsImVmZmljaWVuY3kiXX0seyJpZCI6Imh1c2hfb2ZfdGhlX3dha2UiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsiY3V0dGhyb2F0IiwiY2hhbWJlcmVkX2Nhc3RpbmciXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6MTUzNzgwNDgyNywidW5pcXVlcyI6eyJiZWx0IjoiYmxvb2RsZXR0ZXJzX2dpcmRsZSIsImhlbG1ldCI6ImNpbmRlcnZpZ2lsIn19:spar --seeds 30 --base-seed 1817554965`</details>
- `class:brawler + support:grasping_tendrils + support:resounding_echo + support:alacrity`: measured 4.5e+9 damage per second, its parts predict 843.3. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJicmF3bGVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImV2aXNjZXJhdGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJncmFzcGluZ190ZW5kcmlscyIsImdpYW50c2JhbmUiLCJhenVyZV9oYXJ2ZXN0Iiwic2VyZW5lX3Bvd2VyIl0sImxpbWIiOjF9LHsiaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYWxhY3JpdHkiLCJwb2x5cGhvbnkiLCJhdXN0ZXJpdHkiLCJhcG90aGVvc2lzIl19LHsiaWQiOiJzaGF0dGVyY2hvcmQiLCJyYXJpdHkiOiJtYWdpYyIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInJlc291bmRpbmdfZWNobyIsImNhc2NhZGUiXSwibGltYiI6MX0seyJpZCI6ImJhbGxfbGlnaHRuaW5nIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsibW9tZW50dW0iXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjkyMjY5ODcwMywidW5pcXVlcyI6eyJhbXVsZXQiOiJib3Jyb3dlZF9icmVhdGgiLCJoZWxtZXQiOiJncmF2ZWJsb29tIn19:spar --seeds 30 --base-seed 1817554965`</details>
- `class:brawler + unique:cinderstep + support:crescendo + unique:stormcall`: measured 4.1e+8 damage per second, its parts predict 174.6. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJicmF3bGVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImV2aXNjZXJhdGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJncmFzcGluZ190ZW5kcmlscyIsImdpYW50c2JhbmUiLCJhenVyZV9oYXJ2ZXN0Iiwic2VyZW5lX3Bvd2VyIl0sImxpbWIiOjF9LHsiaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYWxhY3JpdHkiLCJwb2x5cGhvbnkiLCJhdXN0ZXJpdHkiLCJhcG90aGVvc2lzIl19LHsiaWQiOiJzaW5nbGVfb3V0IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsidGltZV9mdXNlIiwiYnVsd2Fya19zaGFyZHMiLCJtZWFzdXJlZF9ibG93cyIsImRlZXBfcmVzZXJ2ZXMiXSwibGltYiI6MH0seyJpZCI6ImFlZ2lzX3dhcmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJjYXNjYWRlIiwiY3Jlc2NlbmRvIiwibm9fbWFuc19sYW5kIiwibGltYnJlYXZlciJdLCJsaW1iIjowfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjMxOTM0ODAwNSwidW5pcXVlcyI6eyJhbXVsZXQiOiJzdG9ybWNhbGwiLCJib290cyI6ImNpbmRlcnN0ZXAifX0:spar --seeds 30 --base-seed 1817554965`</details>
- `class:apothecary + unique:cindervigil + support:seismic_march + support:quailbane`: measured 1.2e+7 damage per second, its parts predict 2681.4. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJhcG90aGVjYXJ5IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6Im1hcmsiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzcGVudGJhbmUiLCJzdG9yZWRfdmVyZGljdCIsIm1lYXN1cmVkX2JsYWRlIiwic2xvd19icmV3Il19LHsiaWQiOiJkZXZvdXJpbmdfc3dhcm0iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJtYW5hX2ZlZWRlciIsInByZXNzdXJlX3NlYWwiXX0seyJpZCI6ImNvbWJ1c3Rpb25fc3RyaWtlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2Vpc21pY19tYXJjaCIsImFjY2VsZXJhdGVkIiwidW5sZWFzaCIsInNjYXR0ZXJlZF9jYXNjYWRlIl19LHsiaWQiOiJsYXlfZm9ybWljX2NsdXRjaCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbIm1lYXN1cmVkX2JsYWRlIiwicmVnaWNpZGUiLCJjYXN0X3doaWxlX2d1YXJkaW5nIiwicXVhaWxiYW5lIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjozMTQ1MTEwOSwidW5pcXVlcyI6eyJoZWxtZXQiOiJjaW5kZXJ2aWdpbCIsInJpbmcxIjoic2hhcmVkX2N1cCJ9fQ:spar --seeds 30 --base-seed 1817554965`</details>
- `class:berserker + support:thoughtburn + unique:cinderstep + support:unleash`: measured 8749446.3 damage per second, its parts predict 19630.9. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiY3JlZXBpbmdfZnJvc3QiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJidXJpZWRfY2hhcmdlIl19LHsiaWQiOiJjb21idXN0aW9uX3N0cmlrZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNlaXNtaWNfbWFyY2giLCJhY2NlbGVyYXRlZCIsInVubGVhc2giLCJzY2F0dGVyZWRfY2FzY2FkZSJdfSx7ImlkIjoiZmxhbWVfYmxhc3QiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImdpYW50c2JhbmUiLCJ0aG91Z2h0YnVybiJdfSx7ImlkIjoicmVwdWxzb3JfYmVhY29uIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJmbGVldGZvb3QiLCJwb2x5cGhvbnkiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJ3YXJkIiwiZ2VhciI6InJhcmUiLCJncyI6ODY5Nzg4NTE3LCJ1bmlxdWVzIjp7ImJvb3RzIjoiY2luZGVyc3RlcCIsImdsb3ZlcyI6ImdhbGV3cmlnaHRzIn19:spar --seeds 30 --base-seed 1817554965`</details>
- `class:brawler + unique:cinderstep + support:grasping_tendrils + support:resounding_echo`: measured 2961715.6 damage per second, its parts predict 2145.3. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJicmF3bGVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImV2aXNjZXJhdGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJncmFzcGluZ190ZW5kcmlscyIsImdpYW50c2JhbmUiLCJhenVyZV9oYXJ2ZXN0Iiwic2VyZW5lX3Bvd2VyIl0sImxpbWIiOjF9LHsiaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYWxhY3JpdHkiLCJwb2x5cGhvbnkiLCJhdXN0ZXJpdHkiLCJhcG90aGVvc2lzIl19LHsiaWQiOiJzaGF0dGVyY2hvcmQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInJlc291bmRpbmdfZWNobyIsImNhc2NhZGUiXSwibGltYiI6MX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjkyMjY5ODcwMywidW5pcXVlcyI6eyJib290cyI6ImNpbmRlcnN0ZXAiLCJoZWxtZXQiOiJncmF2ZWJsb29tIn19:spar --seeds 30 --base-seed 1817554965`</details>
- `class:resonator + support:accelerando + support:unleash + support:scattered_cascade`: measured 2384079 damage per second, its parts predict 872. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJyZXNvbmF0b3IiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZ3JpdF9zdGFuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiLCJvdmVybWF0Y2giLCJvc3RpbmF0byJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJhY2NlbGVyYW5kbyIsImVmZmljaWVuY3kiXX0seyJpZCI6InJlcHVsc29yX2JlYWNvbiIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZmxlZXRmb290Il19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjoyMDgzMjE3MTY2LCJ1bmlxdWVzIjp7ImJlbHQiOiJwYWxlX2JhcmdhaW4iLCJyaW5nMSI6ImNvYWxfcmVtZW1iZXJlZCJ9fQ:spar --seeds 30 --base-seed 1817554965`</details>
- `class:resonator + support:unleash + support:scattered_cascade + support:seismic_march`: measured 316412.2 damage per second, its parts predict 415.7. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJyZXNvbmF0b3IiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZ3JpdF9zdGFuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiLCJvdmVybWF0Y2giLCJvc3RpbmF0byJdfSx7ImlkIjoiY29tYnVzdGlvbl9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzZWlzbWljX21hcmNoIiwiYWNjZWxlcmF0ZWQiLCJ1bmxlYXNoIiwic2NhdHRlcmVkX2Nhc2NhZGUiXX0seyJpZCI6ImZsYW1lX2JsYXN0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJjcmltc29uX2hhcnZlc3QiLCJlZmZpY2llbmN5Il19LHsiaWQiOiJyZXB1bHNvcl9iZWFjb24iLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImZsZWV0Zm9vdCJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6ODY5Nzg4NTE3LCJ1bmlxdWVzIjp7ImJlbHQiOiJwYWxlX2JhcmdhaW4iLCJyaW5nMSI6ImNvYWxfcmVtZW1iZXJlZCJ9fQ:spar --seeds 30 --base-seed 1817554965`</details>
- `class:warrior + unique:cindervigil + support:crescendo + support:vital_bond`: measured 263.7 damage per second, its parts predict 0.4. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJ3YXJyaW9yIiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6InJldml2ZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbIndhcmRpbmdfZmxlc2giLCJtZWFzdXJlZF9ibG93cyIsInZpdGFsX2JvbmQiLCJjbGFtb3IiXX0seyJpZCI6ImNpbmRlcl9zd2FybSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInBhbGxpZF90b3VjaCIsInNlcHRpY19iYXJnYWluIiwiYmxvb2RfcHJpY2UiLCJjYXN0X29uX2hpZ2hfcm9sbCJdfSx7ImlkIjoiYWVnaXNfd2FyZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbImNhc2NhZGUiLCJjcmVzY2VuZG8iLCJub19tYW5zX2xhbmQiLCJsaW1icmVhdmVyIl0sImxpbWIiOjB9LHsiaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImRvbWluaW9uX3RpdGhlIiwiYmxvb2RfcHJpY2UiLCJzZXJlbmVfcG93ZXIiXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjEzMzEwNTQ3MzcsInVuaXF1ZXMiOnsiYW11bGV0IjoibGluZWFnZV9rbm90IiwiaGVsbWV0IjoiY2luZGVydmlnaWwifX0:spar --seeds 30 --base-seed 1817554965`</details>
- `class:firebrand + support:crescendo + support:summon_phantasm + support:pallid_touch`: measured 149.3 damage per second, its parts predict 0.5. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJmaXJlYnJhbmQiLCJsdmwiOjEwLCJza2lsbHMiOlt7ImlkIjoibGlnaHRuaW5nX2JsYXN0IiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbInVtYnJhbF9wb3dlciIsImNyZXNjZW5kbyIsInN1bW1vbl9waGFudGFzbSJdfSx7ImlkIjoiYmxpbmRpbmdfaWNob3IiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsiY2xvc2Vfb3JkZXIiLCJmbG93YnJlYWtlciIsImJsb29kX3ByaWNlIl19LHsiaWQiOiJjaW5kZXJfc3dhcm0iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJwYWxsaWRfdG91Y2giLCJzZXB0aWNfYmFyZ2FpbiIsImJsb29kX3ByaWNlIiwiZW1iYXJnbyJdfSx7ImlkIjoiYWVnaXNfd2FyZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbImNhc2NhZGUiLCJjcmVzY2VuZG8iLCJub19tYW5zX2xhbmQiLCJsaW1icmVhdmVyIl0sImxpbWIiOjB9XSwib2ZmIjoiY3JpdCIsImRlZiI6IndhcmQiLCJnZWFyIjoicmFyZSIsImdzIjoxNTg3MzY3ODIxLCJ1bmlxdWVzIjp7ImNoZXN0IjoiYWVnaXNfb2ZfdGhlX2Ryb3duZWQiLCJsZWdzIjoic3F1YWxsc3RlcCJ9fQ:spar --seeds 30 --base-seed 1817554965`</details>

### Flagged for your decision

The numbers an author would reach for did not move these enough. They are not proposals: each needs a call on whether the mechanic is right, and none has been touched.

- class `chronomancer`: The numbers an author would reach for barely move this: skills.stasis_lock.baseDamage ×2.5 closes 12%; classes.chronomancer.attributes ×2.5 closes 1%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- skill `hurricane`: The numbers an author would reach for barely move this: skills.hurricane.baseDamage ×2.5 closes 14%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- support `resounding_echo`: The numbers an author would reach for barely move this: supports.resounding_echo.mods ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `sharper`: The numbers an author would reach for barely move this: skills.thrown_ace.baseDamage ×1 closes 0%; classes.sharper.attributes ×2.5 closes 2%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `stygian_doll`: The numbers an author would reach for barely move this: monsters.stygian_doll.base.life ×2.4 closes 5%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `amalgam_fleshweaver`: The numbers an author would reach for barely move this: monsters.amalgam_fleshweaver.base.life ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- affix `apply_burn`: The numbers an author would reach for barely move this: affixes.apply_burn.tiers.*.ranges ×0.4 closes 15%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- affix `crowd_damage`: The numbers an author would reach for barely move this: affixes.crowd_damage.tiers.*.ranges ×2.5 closes 2%. The cause may not be numeric, so this needs your decision rather than a tuning pass.

## Outliers

433 rows sit far from their cohort (log-scale median and MAD, z ≥ 3 and a ratio past 1.8× or 0.55×), 32 of them new tonight. Warned rows and zero rows never enter a cohort.

| | kind | subject | metric | value | cohort median | ratio | z | cohort |
|---|---|---|---|---:|---:|---:|---:|---|
|  | support | `sundering_flight` | output_multiplier | 3 | 1 | 2.9× | 18.2 | supports · effective hosts |
|  | support | `fire_walker` | output_multiplier | 2.8 | 1 | 2.74× | 17.2 | supports · effective hosts |
| 🆕 | interaction | `class:brawler + unique:cinderstep + support:crescendo + unique:stormcall` | dps_out | 2.9e+8 | 174.6 | 1683787.53× | 14.8 | L40 main effects |
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
| 🆕 | interaction | `class:apothecary + unique:cindervigil + support:seismic_march + support:quailbane` | dps_out | 2.2e+7 | 2681.4 | 8335.18× | 10.7 | L20 main effects |
|  | support | `elemental_conduction` | output_multiplier | 1.9 | 1 | 1.82× | 10.2 | supports · effective hosts |
| 🆕 | interaction | `class:skald + support:eruption_cycle + support:crescendo + support:cutthroat` | dps_out | 33.9 | 0 | 1083.46× | 10.1 | L10 main effects |
|  | monster_threat | `hadal_lantern` | dps_in | 0.1 | 15.3 | 0× | -10 | L12 · magician · body |
| 🆕 | interaction | `class:resonator + support:accelerando + support:unleash + support:scattered_cascade` | dps_out | 1.3e+7 | 872 | 14905.83× | 9.9 | L40 main effects |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.07× | -9.9 | L40 · geared · pressure · kill_rate |
| 🆕 | interaction | `class:resonator + support:unleash + support:scattered_cascade + support:seismic_march` | dps_out | 3920904.1 | 415.7 | 9433.01× | 9.5 | L40 main effects |
| 🆕 | interaction | `class:brawler + support:grasping_tendrils + support:resounding_echo + support:alacrity` | dps_out | 5865454.5 | 843.3 | 6955.74× | 9.1 | L40 main effects |
|  | class | `chronomancer` | kill_rate | 0 | 0.4 | 0.02× | -8.9 | L5 · geared · pressure · kill_rate |
|  | monster_threat | `dream_tick` | dps_in | 0.1 | 15.3 | 0.01× | -8.9 | L12 · magician · body |
| 🆕 | interaction | `class:skald + support:crescendo + support:summon_phantasm + support:archons_wellspring` | dps_out | 78.3 | 0.2 | 439.16× | 8.8 | L10 main effects |
| 🆕 | interaction | `class:firebrand + support:crescendo + support:pallid_touch + support:limbreaver` | dps_out | 71.8 | 0.2 | 424.34× | 8.7 | L10 main effects |

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
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:5:geared --seeds 10`
- dream_tick: `npm run sim -- run --refs threat:starter_magician_l12:dream_tick:12 --seeds 10`

</details>

## Build search

118,229 candidates tonight (28,038 refused by the real gates), 2,072,176 over 29 night(s). The archive holds 1439 elite rows; 1428 were re-measured on this commit. Tried so far in a legal build: 39 of 39 classes, 576 of 576 primarys, 604 of 604 skills, 455 of 455 supports, 41 of 41 uniques.

| band | objective | build (top factors) | value | × band median | repro |
|---|---|---|---:|---:|---|
| L5 | offense | `class:runeweaver` `off:crit` `def:life` `gear:rare` `skill:living_bomb` | 93163.7 | 2793.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoibGl2aW5nX2JvbWIiLCJyYXJpdHkiOiJtYWdpYyIsIm92ZXIiOjEsInN1cHBvcnRzIjpbInJpdGFyZGFuZG8iXX0seyJpZCI6InN0b3JtYmluZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInRlbXBlc3RfcmFuZ2UiLCJyZWdpY2lkZSJdfSx7ImlkIjoiZW1iZXJiaW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsic2VhcmluZ19oZWF0IiwiYm9uZGJyZWFrZXIiLCJhY2NlbGVyYW5kbyIsImJsb29kX3RvbGwiXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJmb3JraW5nIiwibW91bnRpbmdfZnJlbnp5IiwicGFydGluZ19qdWRnZW1lbnQiLCJzdW5kZXJpbmdfZmxpZ2h0Il19XSwib2ZmIjoiY3JpdCIsImRlZiI6ImxpZmUiLCJnZWFyIjoicmFyZSIsImdzIjoxNDM3MjI5MDg5LCJ1bmlxdWVzIjp7ImFtdWxldCI6InN0b3JtY2FsbCIsInJpbmcxIjoiZW1iZXJicmFuZCJ9fQ --seeds 8 --base-seed 696103342`</details> |
| L5 | offense | `class:runeweaver` `off:crit` `def:evasion` `gear:rare` `skill:squall_rune` | 82554.3 | 2475.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJydW5ld2VhdmVyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoic3F1YWxsX3J1bmUiLCJyYXJpdHkiOiJtYWdpYyJ9LHsiaWQiOiJzdG9ybWJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJ0ZW1wZXN0X3JhbmdlIl19LHsiaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJmbGVldGluZ19kZXZvdGlvbiIsImJvbmRicmVha2VyIiwiYWNjZWxlcmFuZG8iLCJibG9vZF90b2xsIl19LHsiaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiZm9ya2luZyIsIm1vdW50aW5nX2ZyZW56eSIsInBhcnRpbmdfanVkZ2VtZW50Iiwic3VuZGVyaW5nX2ZsaWdodCJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6MTQzNzIyOTA4OSwidW5pcXVlcyI6eyJhbXVsZXQiOiJzdG9ybWNhbGwiLCJyaW5nMSI6ImVtYmVyYnJhbmQifX0 --seeds 8 --base-seed 696103342`</details> |
| L5 | clear | `class:cleric` `off:damage` `def:none` `gear:rare` `skill:detonate_mines` | 6 | 19.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjbGVyaWMiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVnaWNpZGUiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfSx7ImlkIjoiZGlnZXN0IiwicmFyaXR5IjoibWFnaWMiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJ0aW1lX2Z1c2UiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6MjM3Mzc5ODExLCJ1bmlxdWVzIjp7ImJvb3RzIjoid2FuZGVyZXJzX3dha2UiLCJnbG92ZXMiOiJ0aXRhbnNfZ3Jhc3AifX0 --seeds 8 --base-seed 2482468466`</details> |
| L5 | clear | `class:chronomancer` `off:crit` `def:life` `gear:rare` `skill:indecision` | 6 | 19.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJpbmRlY2lzaW9uIiwicmFyaXR5IjoibWFnaWMiLCJvdmVyIjoxfSx7ImlkIjoic2hhdHRlcmNob3JkIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJyZXNvdW5kaW5nX2VjaG8iLCJjYXNjYWRlIl0sImxpbWIiOjF9XSwib2ZmIjoiY3JpdCIsImRlZiI6ImxpZmUiLCJnZWFyIjoicmFyZSIsImdzIjoxODA4OTMyODF9 --seeds 8 --base-seed 2373130568`</details> |
| L10 | offense | `class:magician` `off:speed` `def:armor` `gear:rare` `skill:nerve_pulse` | 153201 | 3984.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJuZXJ2ZV9wdWxzZSIsInJhcml0eSI6InJhcmUiLCJzdXBwb3J0cyI6WyJtZWFzdXJlZF9ibGFkZSJdfSx7ImlkIjoiZnJvc3Rfd2FsbCIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJlcGhlbWVyYWwiLCJzdXBwdXJhdGlvbiJdfSx7ImlkIjoiZW1iZXJiaW5kIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZmxlZXRpbmdfZGV2b3Rpb24iLCJ3cmFpdGhfcGFzc2FnZSJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNsb3dfYnJldyIsInBhcnRpbmdfanVkZ2VtZW50IiwibW91bnRpbmdfZnJlbnp5IiwicmVtbmFudHMiXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6MTgyOTU0NzkyNiwidW5pcXVlcyI6eyJjaGVzdCI6InRoZV91bm1vdmVkIiwicmluZzEiOiJlbWJlcmJyYW5kIn19 --seeds 8 --base-seed 3932078413`</details> |
| L10 | offense | `class:magician` `off:speed` `def:armor` `gear:rare` `skill:unholy_aura` | 145939.7 | 3795.7× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJ1bmhvbHlfYXVyYSIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoxfSx7ImlkIjoiZnJvc3Rfd2FsbCIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJlcGhlbWVyYWwiXX0seyJpZCI6ImVtYmVyYmluZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImZsZWV0aW5nX2Rldm90aW9uIiwid3JhaXRoX3Bhc3NhZ2UiLCJyYXZlbmluZyIsImV4dGVybWluYXRvciJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNsb3dfYnJldyIsInBhcnRpbmdfanVkZ2VtZW50IiwibW91bnRpbmdfZnJlbnp5IiwicmVtbmFudHMiXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6MTgyOTU0NzkyNiwidW5pcXVlcyI6eyJjaGVzdCI6InRoZV91bm1vdmVkIiwicmluZzEiOiJlbWJlcmJyYW5kIn19 --seeds 8 --base-seed 3640222194`</details> |
| L10 | clear | `class:cleric` `off:crit` `def:none` `gear:rare` `skill:word_of_doom` | 6 | 25.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjbGVyaWMiLCJsdmwiOjEwLCJza2lsbHMiOlt7ImlkIjoid29yZF9vZl9kb29tIiwicmFyaXR5IjoicmFyZSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbIm9zdGluYXRvIiwidW50b3VjaGVkX21pZ2h0Il19LHsiaWQiOiJzaGF0dGVyY2hvcmQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInJlc291bmRpbmdfZWNobyIsImNhc2NhZGUiXSwibGltYiI6MX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjIxMzE4MDQwMjksInVuaXF1ZXMiOnsiYW11bGV0Ijoicm91bmRlbGF5IiwiY2hlc3QiOiJkdWVsaXN0c19sZWRnZXIifX0 --seeds 8 --base-seed 2106909088`</details> |
| L10 | clear | `class:cleric` `off:crit` `def:none` `gear:rare` `skill:word_of_doom` | 6 | 25.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjbGVyaWMiLCJsdmwiOjEwLCJza2lsbHMiOlt7ImlkIjoid29yZF9vZl9kb29tIiwicmFyaXR5IjoicmFyZSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbIm9zdGluYXRvIl19LHsiaWQiOiJzaGF0dGVyY2hvcmQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInJlc291bmRpbmdfZWNobyIsImNhc2NhZGUiXSwibGltYiI6MX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjIxMzE4MDQwMjksInVuaXF1ZXMiOnsiYW11bGV0Ijoicm91bmRlbGF5IiwiY2hlc3QiOiJncm91bmRlZF9sYXR0aWNlIn19 --seeds 8 --base-seed 2106909088`</details> |
| L20 | offense | `class:flagellant` `off:damage` `def:ward` `gear:rare` `skill:wildfire_sweep` | 888987.5 | 16109.2× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJmbGFnZWxsYW50IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6IndpbGRmaXJlX3N3ZWVwIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsicmVtbmFudF9jb25kdWl0Iiwic2llZ2VicmVha2VyIiwidW5sZWFzaCIsInN1bmJha2VkX2VkZ2UiXX0seyJpZCI6InN1bW1vbl9ib25lX2dvbGVtIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbInN0ZWFkeV9uZXJ2ZSJdLCJsaW1iIjoxfSx7ImlkIjoiZ3Jhc3BpbmdfY2hhc20iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJibG9vZF90b2xsIiwic3BsaW50ZXJlZF9lYXJ0aCIsImFjY2VsZXJhbmRvIiwiZGVzcGVyYXRpb24iXX0seyJpZCI6ImZyb3N0Z3VhcmQiLCJyYXJpdHkiOiJtYWdpYyIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInJlZ2ljaWRlIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjExNzkwNTYwMjMsInVuaXF1ZXMiOnsiYmVsdCI6IndpbnRlcl9hZnRlcl95b3UiLCJib290cyI6InJpbWV3YWtlIn19 --seeds 8 --base-seed 2555559919`</details> |
| L20 | offense | `class:flagellant` `off:crit` `def:none` `gear:rare` `skill:combustion_strike` | 733984.7 | 13300.4× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJmbGFnZWxsYW50IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImNvbWJ1c3Rpb25fc3RyaWtlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsiYWZ0ZXJzaG9ja3MiXX0seyJpZCI6InN1bW1vbl9ib25lX2dvbGVtIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbInN0ZWFkeV9uZXJ2ZSJdLCJsaW1iIjowfSx7ImlkIjoiZ3Jhc3BpbmdfY2hhc20iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJibG9vZF90b2xsIiwic3BsaW50ZXJlZF9lYXJ0aCIsImFjY2VsZXJhbmRvIiwiY3Jlc2NlbmRvIl19XSwib2ZmIjoiY3JpdCIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjoxMTc5MDU2MDIzLCJ1bmlxdWVzIjp7ImJvb3RzIjoicmltZXdha2UifX0 --seeds 8 --base-seed 2555559919`</details> |
| L20 | clear | `class:tamer` `off:crit` `def:armor` `gear:rare` `skill:detonate_mines` | 6 | 29× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJ0YW1lciIsImx2bCI6MjAsInNraWxscyI6W3siaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImNhc3Rfb25fYmxlZWQiXX0seyJpZCI6ImZyb3N0X3B1bHNlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsicGllcmNpbmciXX0seyJpZCI6ImRvb21fYmVsbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNoYXR0ZXJnbGFzcyIsImZsb3dicmVha2VyIiwidXByb290ZXIiLCJtZWFzdXJlZF9ibG93cyJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjUzODk1NzY0NSwidW5pcXVlcyI6eyJhbXVsZXQiOiJ0dW5pbmdfZm9yayJ9fQ --seeds 8 --base-seed 2865663263`</details> |
| L20 | clear | `class:juggernaut` `off:speed` `def:none` `gear:rare` `skill:doom_bell` | 6 | 29× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJqdWdnZXJuYXV0IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImRvb21fYmVsbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNoYXR0ZXJnbGFzcyJdfSx7ImlkIjoiYmVja29uX3BhbGV3aXNwcyIsInJhcml0eSI6InJhcmUiLCJzdXBwb3J0cyI6WyJtb3VudGluZ19mcmVuenkiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfSx7ImlkIjoiY29uc2VjcmF0aW9uIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsibWFkZGVuaW5nX21pYXNtYSIsImF1c3Rlcml0eSJdLCJsaW1iIjowfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjEzMDc0MjAxNzksInVuaXF1ZXMiOnsiYW11bGV0Ijoicm91bmRlbGF5In19 --seeds 8 --base-seed 3640222194`</details> |
| L40 | offense | `class:juggernaut` `off:speed` `def:none` `gear:rare` `skill:shatterchord` | 973900.1 | 10851.1× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJqdWdnZXJuYXV0IiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImdpYW50c2JhbmUiLCJqaW54aW5nX3RvdWNoIiwiY2FzdF9vbl9wb2lzb24iLCJodW50ZXJzX21vbWVudHVtIl0sImxpbWIiOjB9LHsiaWQiOiJsaWdodG5pbmdfYmxhc3QiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJkZWF0aHNfZG9vciIsInN0dW5fY2hhbmNlIiwibWVhc3VyZWRfYmxhZGUiXX0seyJpZCI6InN1bW1vbl9ib25lX2dvbGVtIiwicmFyaXR5IjoicmFyZSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbInN0ZWFkeV9uZXJ2ZSIsImhhcmR5X2Jyb29kIiwicHlyZV9sZWdpb24iXSwibGltYiI6MH0seyJpZCI6ImdyYXNwaW5nX2NoYXNtIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYmxvb2RfdG9sbCIsInNwbGludGVyZWRfZWFydGgiLCJhY2NlbGVyYW5kbyIsImRlc3BlcmF0aW9uIl19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6MTc3NDMxMDUyMiwidW5pcXVlcyI6eyJiZWx0Ijoic3RhbmRpbmdfdG9hc3QiLCJsZWdzIjoic3F1YWxsc3RlcCJ9fQ --seeds 8 --base-seed 3640222194`</details> |
| L40 | offense | `class:juggernaut` `off:damage` `def:life` `gear:rare` `skill:lay_chitin_clutch` | 966496 | 10768.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJqdWdnZXJuYXV0IiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImxheV9jaGl0aW5fY2x1dGNoIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsiY2hpdGlub3VzX2Jyb29kIiwiZGVhdGhzX2Rvb3IiLCJ2aXRhbF9ib25kIl19LHsiaWQiOiJzdW1tb25fYm9uZV9nb2xlbSIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiXSwibGltYiI6MH0seyJpZCI6ImdyYXNwaW5nX2NoYXNtIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYmxvb2RfdG9sbCIsInNwbGludGVyZWRfZWFydGgiLCJhY2NlbGVyYW5kbyIsImRlc3BlcmF0aW9uIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjEwNDk2MDU1NzgsInVuaXF1ZXMiOnsiYW11bGV0IjoibGluZWFnZV9rbm90IiwiaGVsbWV0IjoiY2luZGVydmlnaWwifX0 --seeds 8 --base-seed 3521781411`</details> |
| L40 | clear | `class:juggernaut` `off:damage` `def:none` `gear:rare` `skill:detonate_mines` | 6 | 28.4× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJqdWdnZXJuYXV0IiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImRldG9uYXRlX21pbmVzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsiZG9taW5pb25fdGl0aGUiLCJzdG9yZWRfdmVyZGljdCIsInNlcmVuZV9wb3dlciIsImd1YXJkZWRfY2FzdGluZyJdfSx7ImlkIjoic2hhdHRlcmNob3JkIiwicmFyaXR5IjoibGVnZW5kYXJ5In0seyJpZCI6InJpZ2h0ZW91c19maXJlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsicmVtbmFudF9jb25kdWl0Il19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjE3NzQzMTA1MjIsInVuaXF1ZXMiOnsiYm9vdHMiOiJyaW1ld2FrZSIsImhlbG1ldCI6ImNpbmRlcnZpZ2lsIn19 --seeds 8 --base-seed 3521781411`</details> |
| L40 | clear | `class:vanguard` `off:speed` `def:evasion` `gear:rare` `skill:mark` | 6 | 28.4× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJ2YW5ndWFyZCIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiYmxvb2RfcHJpY2UiLCJhZnRlcnNwcmF5Il19LHsiaWQiOiJzaGF0dGVyY2hvcmQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInJlc291bmRpbmdfZWNobyIsImNhc2NhZGUiXSwibGltYiI6MX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjoxMTE4NTExMjY3LCJ1bmlxdWVzIjp7ImNoZXN0IjoiYWVnaXNfb2ZfdGhlX2Ryb3duZWQiLCJnbG92ZXMiOiJnYWxld3JpZ2h0cyJ9fQ --seeds 8 --base-seed 3167218970`</details> |

Playstyles at L5, best build found per style against the band's median style (50 styles): strongest `target · lightning` 94480.9 (2.58×), `area · lightning` 82975.6 (2.26×), `construct · lightning` 77071.9 (2.1×), `aura · lightning` 75815.7 (2.07×); weakest `detonate · cold` 13606 (0.37×), `detonate · chaos` 13697.7 (0.37×), `target · cold` 16290.1 (0.44×), `construct · chaos` 16374.2 (0.45×).

Playstyles at L10, best build found per style against the band's median style (50 styles): strongest `projectile · fire` 159756.2 (1.87×), `aura · fire` 155724.4 (1.82×), `area · fire` 154612.1 (1.81×), `court · fire` 145226.4 (1.7×); weakest `detonate · chaos` 28233.3 (0.33×), `projectile · chaos` 32295.5 (0.38×), `target · chaos` 48480.4 (0.57×), `detonate · physical` 50509.8 (0.59×).

Playstyles at L20, best build found per style against the band's median style (50 styles): strongest `area · fire` 883281.8 (2.28×), `mark · fire` 832705.9 (2.15×), `mark · chaos` 795100.6 (2.05×), `target · cold` 736948.5 (1.9×); weakest `detonate · chaos` 97741.9 (0.25×), `detonate · fire` 154203.6 (0.4×), `mark · lightning` 165592 (0.43×), `detonate · physical` 171537.9 (0.44×).

Playstyles at L40, best build found per style against the band's median style (50 styles): strongest `area · lightning` 993094 (1.25×), `detonate · fire` 992454 (1.24×), `court · chaos` 991649.6 (1.24×), `construct · chaos` 991572.3 (1.24×); weakest `mark · cold` 281752.1 (0.35×), `mark · physical` 383475.1 (0.48×), `mark · fire` 438479.3 (0.55×), `mark · chaos` 471272.2 (0.59×).

Main effects at L5 over 11800 rows: strongest `limb:summon_bone_golem#0` 36.2×, `limb:raise_dead#0` 34.44×, `skill:grasping_chasm` 25.72×, `limb:summon_bone_golem#1` 23.84×, `skill:ice_shards` 21.54×; weakest `skill:raise_dead` 0.05×, `limb:shadow_step#1` 0.06×, `primary:reclamation` 0.09×, `limb:war_chant#0` 0.1×, `skill:glare_ice` 0.1×.

Main effects at L10 over 17859 rows: strongest `skill:grasping_chasm` 29.41×, `limb:summon_bone_golem#1` 27.04×, `limb:quiet_step#0` 25.88×, `primary:aegis_ward` 25.2×, `skill:ice_shards` 22.99×; weakest `limb:aegis_ward#0` 0.02×, `skill:quiet_step` 0.04×, `limb:shadow_step#0` 0.04×, `limb:decoy#1` 0.04×, `limb:decoy#0` 0.05×.

Main effects at L20 over 23483 rows: strongest `primary:aegis_ward` 77.18×, `limb:summon_bone_golem#0` 75.19×, `limb:summon_bone_golem#1` 69.57×, `limb:sanctified_strike#0` 40.29×, `skill:ice_shards` 32.96×; weakest `limb:aegis_ward#0` 0.01×, `limb:aegis_ward#1` 0.03×, `limb:raise_gnatveil#1` 0.07×, `skill:summon_bone_golem` 0.07×, `skill:sanctified_strike` 0.07×.

Main effects at L40 over 24398 rows: strongest `limb:shambler_horde#1` 198.2×, `primary:infernal_bombardment` 70.33×, `limb:summon_bone_golem#0` 37.35×, `limb:summon_bone_golem#1` 34.34×, `skill:ice_shards` 31.47×; weakest `limb:aegis_ward#0` 0.02×, `primary:summon_bone_golem` 0.02×, `limb:aegis_ward#1` 0.04×, `limb:war_chant#0` 0.06×, `limb:war_chant#1` 0.09×.

**Other combinations far off the sum of their parts**, confirmed on fresh dice (16 tried):

- `class:skald + support:eruption_cycle + support:crescendo + support:cutthroat`: measured 3.9, its parts predict 0. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJza2FsZCIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJzdXJnZXdpbmQiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsib3N0aW5hdG8iLCJjdXR0aHJvYXQiLCJlcnVwdGlvbl9jeWNsZSJdfSx7ImlkIjoiYWVnaXNfd2FyZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbImNhc2NhZGUiLCJjcmVzY2VuZG8iLCJub19tYW5zX2xhbmQiLCJhbGFjcml0eSJdLCJsaW1iIjowfSx7ImlkIjoiYmVja29uX3BhbGV3aXNwcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInBsdXNfY29sZCJdfSx7ImlkIjoiZG9vbV9iZWxsIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsicGhhbnRhc21hbF9lY2hvIl19XSwib2ZmIjoiY3JpdCIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjo5MDAxMDQzNDQsInVuaXF1ZXMiOnsibGVncyI6InNxdWFsbHN0ZXAifX0:spar --seeds 30 --base-seed 1817554965`</details>
- `class:pyromancer + support:vaporize + primary:mark + support:cascade`: measured 18.9, its parts predict 0.2. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJweXJvbWFuY2VyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoibWFyayIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsibWVhc3VyZWRfYmxvd3MiXX0seyJpZCI6ImZyb3N0X3dhbGwiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInZhcG9yaXplIiwiY2FzY2FkZSJdfSx7ImlkIjoiYmVja29uX3BhbGV3aXNwcyIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsid2VhdGhlcnZhbmUiLCJtZWFzdXJlZF9ibG93cyJdfSx7ImlkIjoiYWxhcm1fcmVlayIsInJhcml0eSI6Im1hZ2ljIiwib3ZlciI6MSwic3VwcG9ydHMiOlsibm9fbWFuc19sYW5kIiwiYm9uZGJyZWFrZXIiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6MTU4OTE2ODE4MSwidW5pcXVlcyI6eyJoZWxtZXQiOiJncmF2ZWJsb29tIiwicmluZzEiOiJtaXNlcnNfbG9vcCJ9fQ:spar --seeds 30 --base-seed 1817554965`</details>

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

**Against the target** of +10% to +15%: the median gem changes output by +8%. 22 in the band, 85 above it, 124 below it, 101 leave damage alone.

15 of these gems read off their own rig, because they need something a plain rig does not do: in the middle of a crowd (`alternating_strikes`, `unstable_flight`, `wild_abandon`, `tethered_orbit`, `gyre`, `vortex`, `sidewinder`, `trueflight`, `crosswind`); with a guard raised (`guarded_casting`); with a charge a second fed into its bank (`embargo`, `ravening`); against a plain dummy instead of a resistant one (`refraction`, `flameforged`, `rarefy`).

**Affix families** (211 measured on one magic piece against the same wardrobe without it, 11 never worn on the doll). Most output: `apply_poison` 2.11× on warrior, `apply_poison` 1.98× on magician, `apply_bleed` 1.71× on warrior, `apply_bleed` 1.64× on magician, `hadal_cold` 1.48× on magician, `hadal_cold` 1.46× on warrior, `proc_concussive` 1.4× on warrior, `creeper_barrow` 1.24× on warrior. Most time survived: `life_on_evade` 1.93× on warrior, `barnacle_crust` 1.74× on warrior, `chitin_plate` 1.59× on warrior, `life_on_hit` 1.58× on warrior, `life_on_evade` 1.54× on magician, `thorns` 1.54× on warrior. Moved nothing on these rigs: 3 families.

**What buffs, hexes, heals and wards add** (196 skills whose own numbers are not damage, at L20, against the same hero without them). Most output beside a plain strike: `infernal_bombardment` 14.1×, `summon_plaguefather` 6.4×, `summon_fire_golem` 4.83×, `summon_flame_sprite` 4.77×, `flame_totem` 4.77×, `shambler_horde` 4.25×, `bind_familiar` 4.22×, `reaper_swarm` 3.88×. Most time survived on the clock: `vampiric_presence` 11.85×, `shambler_horde` 11.85×, `repulsor_beacon` 11.85×, `summon_blade_wraith` 11.85×, `call_the_rift` 10.98×, `reaper_swarm` 10.25×, `summon_wraith` 9.04×, `infernal_bombardment` 6.63×. 35 moved neither at any band: their value lies outside these rigs, or they do nothing.

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
Matrix: 127,530 of 127,530 eligible pairs probed (100%), deep lane on 30791 pairs. Verdicts: effective 78653, blind 30564, negligible 2439, inert 14446, cost_only 1428.
Against the committed ledger (8481 rows): 13417 not on file, 2004 measuring healthy. The ledger only changes through `matrix check --reconcile`.

## What ran, and what did not

| lane | units planned | ok | gate breach | crashed/killed | out of time or not run | episodes | core-hours |
|---|---:|---:|---:|---:|---:|---:|---:|
| baselines | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| audits | 4 | 4 | 0 | 0 | 0 | 0 | 0 |
| expression | 1 | 1 | 0 | 0 | 0 | 1,208 | 0.2 |
| census | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| suites | 2 | 2 | 0 | 0 | 0 | 910 | 0.2 |
| progression | 39 | 39 | 0 | 0 | 0 | 12,480 | 3.9 |
| skills | 10 | 10 | 0 | 0 | 0 | 8,790 | 1.2 |
| skills_vs | 21 | 21 | 0 | 0 | 0 | 24,192 | 4.8 |
| matchups | 24 | 24 | 0 | 0 | 0 | 13,734 | 5.1 |
| bestiary | 58 | 58 | 0 | 0 | 0 | 78,696 | 14.8 |
| attributes | 39 | 39 | 0 | 0 | 0 | 4,914 | 2 |
| affixes | 4 | 4 | 0 | 0 | 0 | 3,472 | 1.2 |
| assists | 10 | 10 | 0 | 0 | 0 | 4,752 | 2 |
| socket_play | 1 | 1 | 0 | 0 | 0 | 900 | 0.1 |
| globals | 4 | 4 | 0 | 0 | 0 | 1,704 | 0.3 |
| matrix | 174 | 174 | 0 | 0 | 0 | 235,854 | 42.7 |
| matrix_deep | 89 | 89 | 0 | 0 | 0 | 145,129 | 20.9 |
| search | 40 | 40 | 0 | 0 | 0 | 185,944 | 33.1 |
| archive_confirm | 39 | 39 | 0 | 0 | 0 | 22,848 | 6.3 |
| proposals | 48 | 48 | 0 | 0 | 0 | 14,864 | 2.7 |

Every planned unit ran.

Not simulated at all, by design: zone generation and XP pacing, event pressure, multiplayer, and real player skill. Pilots are simple policies, so kit ceilings are floors. Bands stay provisional until you sign them off.
